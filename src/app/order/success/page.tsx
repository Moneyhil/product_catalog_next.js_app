import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignIn } from "@clerk/nextjs";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Order } from "@/lib/types";

import { OrderSuccessClient } from "./order-success-client";

type SearchParams = {
  searchParams: Promise<{
    order_id?: string;
    session_id?: string;
  }>;
};

function shortOrderId(value: string): string {
  if (value.length <= 8) return value.toUpperCase();
  return `${value.slice(0, 4).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

export default async function OrderSuccessPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const orderId = typeof params.order_id === "string" ? params.order_id : null;
  const sessionId =
    typeof params.session_id === "string" && params.session_id.length > 0
      ? params.session_id
      : null;

  const isTemplateSessionId =
    sessionId && sessionId.includes("CHECKOUT_SESSION_ID");
  const cleanedSessionId = isTemplateSessionId ? null : sessionId;

  const { userId } = await auth();

  let order: Order | null = null;
  if (orderId) {
    const snapshot = await adminDb.collection("orders").doc(orderId).get();
    if (snapshot.exists) {
      const data = snapshot.data() as Order;
      order = { ...data, id: snapshot.id };
    }
  }

  const orderHasClerkId =
    !!order &&
    typeof (order as Partial<Order> & { clerkId?: string | null }).clerkId ===
      "string" &&
    (order as Partial<Order> & { clerkId?: string | null }).clerkId!.length > 0;
  const isGuestOrder = !userId && !orderHasClerkId;

  if (!orderId || !order) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Order not found</h1>
          <p className="mt-2 text-slate-600">
            We couldn&apos;t locate that order. If you just completed a
            purchase, please sign in and view your account for the latest
            status.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              View My Account
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Browse products
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const totalUsd = order.amountPaidUsd ?? order.totalUsd;
  const isPaid = order.status === "paid";
  const isPending = order.status === "pending";

  const invoiceHref =
    isPaid &&
    typeof order.invoiceId === "string" &&
    order.invoiceId.length > 0
      ? `/account/invoices/${encodeURIComponent(order.invoiceId)}`
      : isPaid
      ? "/account/invoices"
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <OrderSuccessClient
        orderId={order.id}
        sessionId={cleanedSessionId}
        initialStatus={order.status}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isPaid
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
              aria-hidden="true"
            >
              {isPaid ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isPaid
                  ? "Order Confirmed"
                  : "We're finalizing your order"}
              </h1>
              <p className="text-sm text-slate-500">
                Order{" "}
                <span className="font-mono text-slate-700">
                  #{shortOrderId(order.id)}
                </span>
                {cleanedSessionId ? (
                  <>
                    {" "}
                    · Session{" "}
                    <span className="font-mono text-slate-700">
                      {shortOrderId(cleanedSessionId)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Order total
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatUSD(totalUsd)}
            </p>
            <p className="text-xs text-slate-500">
              ≈ {formatPKR(totalUsd)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Items
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
            <p className="text-xs text-slate-500">
              across {order.items.length} product
              {order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                isPaid
                  ? "text-emerald-700"
                  : isPending
                  ? "text-amber-700"
                  : "text-slate-700"
              }`}
            >
              {isPaid
                ? "Paid"
                : isPending
                ? "Pending"
                : (order.status as string).charAt(0).toUpperCase() +
                  (order.status as string).slice(1)}
            </p>
            <p className="text-xs text-slate-500">
              {order.customerEmail
                ? `Receipt sent to ${order.customerEmail}`
                : "Receipt will be emailed when confirmed"}
            </p>
          </div>
        </div>

        {isPending ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Finalizing your order — this can take a few seconds while we
            confirm payment. If it still shows Pending after you refresh,
            Stripe&apos;s webhook may not have delivered yet (see note on local
            development: run `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`).
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-xs text-slate-500">
            Have questions? Check your order history in your account.
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Keep browsing
            </Link>
            {invoiceHref ? (
              <Link
                href={invoiceHref}
                className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                View Invoice
              </Link>
            ) : null}
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              View My Account
            </Link>
          </div>
        </div>
      </div>

      {isGuestOrder ? (
        <div className="mt-10 rounded-3xl border border-indigo-200 bg-indigo-50/60 p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-indigo-900">
              Access Your Order History & Invoices
            </h2>
            <p className="mt-2 text-sm text-indigo-800">
              A passwordless account has been created for you using the email
              you entered at checkout. Sign in below with a magic link to
              access this order, view invoices, and manage your account.
              You&apos;ll be taken straight to your account dashboard after you
              sign in.
            </p>
          </div>
          <div className="flex items-start justify-center">
            <SignIn
              forceRedirectUrl="/account"
              fallbackRedirectUrl="/account"
              signUpUrl="/sign-up"
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
