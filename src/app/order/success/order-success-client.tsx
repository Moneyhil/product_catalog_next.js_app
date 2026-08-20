"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import type { OrderStatus } from "@/lib/types";

type Props = {
  orderId: string;
  sessionId: string | null;
  initialStatus: OrderStatus;
};

type VerifyResponse = {
  ok: boolean;
  status: string;
  paymentStatus?: string | null;
  error?: string | null;
};

const PENDING_POLL_INTERVAL_MS = 2000;
const PAID_COOLDOWN_MS = 1500;

export function OrderSuccessClient({
  orderId,
  sessionId,
  initialStatus,
}: Props) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  const verifyOnce = useCallback(async () => {
    if (!sessionId) return;
    if (!isSignedIn) return;

    setAttempt((prev) => prev + 1);

    try {
      const response = await fetch("/api/checkout/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload: VerifyResponse | null = contentType.includes(
        "application/json",
      )
        ? ((await response.json()) as VerifyResponse)
        : null;

      if (!response.ok || !payload || !payload.ok) {
        const message =
          payload && typeof payload.error === "string"
            ? payload.error
            : `Unable to verify session (HTTP ${response.status}).`;
        setError(message);
        return;
      }

      setError(null);

      const sessionStatus =
        typeof payload.status === "string" ? payload.status : null;
      const paymentStatus =
        typeof payload.paymentStatus === "string"
          ? payload.paymentStatus
          : null;

      if (sessionStatus === "paid" || paymentStatus === "paid") {
        setStatus("paid");
        settled.current = true;
        return;
      }

      if (
        sessionStatus === "expired" ||
        sessionStatus === "canceled" ||
        paymentStatus === "unpaid"
      ) {
        setStatus("failed");
        settled.current = true;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not verify your session. Please refresh to try again.";
      setError(message);
    }
  }, [sessionId, isSignedIn]);

  useEffect(() => {
    if (settled.current) return;
    if (!isLoaded) return;

    if (!sessionId) {
      if (status === "pending") {
        const timeoutId = window.setTimeout(() => {
          router.refresh();
        }, PAID_COOLDOWN_MS);
        return () => window.clearTimeout(timeoutId);
      }
      return;
    }

    if (!isSignedIn) return;

    void verifyOnce();

    if (status !== "pending") return;

    const intervalId = window.setInterval(() => {
      if (settled.current) {
        window.clearInterval(intervalId);
        return;
      }
      void verifyOnce();
    }, PENDING_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isLoaded, isSignedIn, sessionId, status, verifyOnce, router]);

  useEffect(() => {
    if (status !== initialStatus) {
      const timeoutId = window.setTimeout(() => {
        router.refresh();
      }, PAID_COOLDOWN_MS);
      return () => window.clearTimeout(timeoutId);
    }
    return;
  }, [status, initialStatus, router]);

  if (!sessionId && !isSignedIn) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Sign in to see the real-time payment status of your order.
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      {status === "pending" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Confirming your payment…</p>
            <p className="text-xs text-amber-700/80">
              {attempt <= 1
                ? "Checking Stripe status."
                : `Retrying (attempt ${attempt}). If this takes longer than a minute on localhost, run \`stripe listen --forward-to http://localhost:3000/api/webhooks/stripe\` in your terminal.`}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
