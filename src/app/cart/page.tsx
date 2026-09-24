"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/components/Toast";
import { formatPKR, formatUSD } from "@/lib/currency";

export default function CartPage() {
  const {
    items,
    itemCount,
    total,
    isLoaded,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { showToast, dismissToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleClear = () => {
    clearCart();
    setCheckoutError(null);
    showToast({ message: "Your cart has been cleared." });
  };

  const handleRemove = (title: string) => {
    setCheckoutError(null);
    showToast({ message: `${title} removed from cart.` });
  };

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError(null);

    if (items.length === 0 || isSubmitting) return;

    let toastId: string | null = null;
    try {
      setIsSubmitting(true);
      toastId = showToast({
        message: "Preparing your checkout…",
        duration: 1000 * 60 * 5,
      });

      const body: Record<string, unknown> = { items };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;
      const message =
        payload && typeof payload.error === "string"
          ? payload.error
          : `Checkout request failed (HTTP ${response.status}).`;

      if (!response.ok) {
        setCheckoutError(message);
        showToast({ message });
        return;
      }

      if (!payload || typeof payload.sessionUrl !== "string") {
        const fallback = "Checkout response was invalid. Please try again.";
        setCheckoutError(fallback);
        showToast({ message: fallback });
        return;
      }

      window.location.href = payload.sessionUrl;
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : "Could not start checkout. Please try again.";
      setCheckoutError(fallback);
      showToast({ message: fallback });
    } finally {
      setIsSubmitting(false);
      if (typeof toastId === "string") {
        dismissToast(toastId);
      }
    }
  }

  if (!isLoaded) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Your cart</h1>
        <div className="mt-10 flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <span className="text-sm text-slate-600">Loading cart…</span>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Your cart</h1>
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-600">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Your cart</h1>
          <p className="mt-1 text-sm text-slate-500">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          Clear cart
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {items.map((item) => {
              const lineUsd = item.price * item.quantity;
              return (
                <li
                  key={item.id}
                  className="flex gap-4 p-4 sm:p-5"
                >
                  <Link
                    href={`/products/${item.id}`}
                    className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50 sm:h-28 sm:w-28"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-contain p-2"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.id}`}
                          className="line-clamp-2 font-medium text-slate-900 hover:underline"
                        >
                          {item.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                          <span>{formatUSD(item.price)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatPKR(item.price)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(item.id);
                          handleRemove(item.title);
                        }}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label="Decrease quantity"
                          className="px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] px-2 text-center text-sm font-medium text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          aria-label="Increase quantity"
                          className="px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          {formatUSD(lineUsd)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(lineUsd)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>

          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatUSD(total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Estimated taxes</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatUSD(total)}
              </span>
            </div>
            <div className="mt-1 text-right text-xs text-slate-500">
              ≈ {formatPKR(total)}
            </div>
          </div>

          {checkoutError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {checkoutError}
            </div>
          ) : null}

          <form onSubmit={handleCheckout}>
            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={items.length === 0 || isSubmitting || !isLoaded}
            >
              {isSubmitting ? "Redirecting to checkout…" : "Checkout"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500">
            You will be redirected to Stripe to complete your payment securely.
            Email, shipping address, and payment details are collected by Stripe.
          </p>
        </aside>
      </div>
    </main>
  );
}
