import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Order, OrderStatus } from "@/lib/types";

type StatusBadgeTone =
  | "neutral"
  | "amber"
  | "emerald"
  | "rose"
  | "slate";

function toneForStatus(status: OrderStatus): StatusBadgeTone {
  switch (status) {
    case "paid":
      return "emerald";
    case "pending":
      return "amber";
    case "failed":
      return "rose";
    case "canceled":
      return "slate";
    case "draft":
      return "neutral";
    default:
      return "neutral";
  }
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = toneForStatus(status);
  const classes: Record<StatusBadgeTone, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    slate: "bg-slate-50 text-slate-600 ring-slate-200",
  };

  const label =
    status === "paid"
      ? "Paid"
      : status === "pending"
      ? "Pending"
      : status === "failed"
      ? "Failed"
      : status === "canceled"
      ? "Canceled"
      : status === "draft"
      ? "Draft"
      : (status as string).charAt(0).toUpperCase() + (status as string).slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${classes[tone]}`}
    >
      {label}
    </span>
  );
}

function formatDate(value: unknown): string {
  if (typeof value !== "string") return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function shortOrderId(value: string): string {
  if (value.length <= 10) return value.toUpperCase();
  return `${value.slice(0, 6).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

export default async function AccountOrdersPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account/orders");
  }

  const snapshot = await adminDb
    .collection("orders")
    .where("clerkId", "==", userId)
    .where("status", "not-in", ["draft"])
    .orderBy("createdAt", "desc")
    .get();

  const orders = snapshot.docs.map((document) => {
    const data = document.data() as Partial<Order>;
    return {
      id: document.id,
      createdAt: data.createdAt ?? null,
      totalUsd: data.amountPaidUsd ?? data.totalUsd ?? 0,
      status: (data.status ?? "pending") as OrderStatus,
      invoiceId:
        typeof data.invoiceId === "string" && data.invoiceId.length > 0
          ? data.invoiceId
          : null,
      invoiceNumber:
        typeof data.invoiceNumber === "string" && data.invoiceNumber.length > 0
          ? data.invoiceNumber
          : null,
    } satisfies {
      id: string;
      createdAt: unknown;
      totalUsd: number;
      status: OrderStatus;
      invoiceId: string | null;
      invoiceNumber: string | null;
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orders</h2>
          <p className="mt-1 text-sm text-slate-600">
            {orders.length === 0
              ? "You don't have any orders yet."
              : orders.length === 1
              ? "1 order placed"
              : `${orders.length} orders placed`}
          </p>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            No orders yet
          </p>
          <p className="mt-1 text-sm text-slate-600">
            After you complete a purchase, your orders will appear here.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Start Shopping
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Go to cart
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-slate-700 sm:px-6"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-slate-700 sm:px-6"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orders.map((order) => {
                  return (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <Link
                          href={`/account/orders/${encodeURIComponent(order.id)}`}
                          className="font-mono text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline"
                        >
                          #{shortOrderId(order.id)}
                        </Link>
                        {order.invoiceNumber ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Inv:&nbsp;
                            {order.invoiceId ? (
                              <Link
                                href={`/account/invoices/${encodeURIComponent(order.invoiceId)}`}
                                className="font-medium text-slate-700 underline-offset-2 hover:underline"
                              >
                                {order.invoiceNumber}
                              </Link>
                            ) : (
                              <span className="font-mono">
                                {order.invoiceNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {formatPKR(order.totalUsd)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-6">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900 sm:px-6">
                        {formatUSD(order.totalUsd)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
