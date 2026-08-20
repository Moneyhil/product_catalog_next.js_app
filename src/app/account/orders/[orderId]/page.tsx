import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Order, OrderStatus } from "@/lib/types";

type RouteParams = {
  params: Promise<{
    orderId: string;
  }>;
};

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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes[tone]}`}
    >
      {label}
    </span>
  );
}

function formatDate(value: unknown): string {
  if (typeof value !== "string") return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function shortOrderId(value: string): string {
  if (value.length <= 10) return value.toUpperCase();
  return `${value.slice(0, 6).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

function NotFound() {
  return (
    <div className="space-y-6 text-center">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Order not found</h2>
        <p className="mt-1 text-sm text-slate-600">
          That order doesn&apos;t exist or isn&apos;t available yet.
        </p>
      </header>
      <Link
        href="/account/orders"
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
      >
        Back to orders
      </Link>
    </div>
  );
}

export default async function AccountOrderDetailPage({ params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=/account/orders/${(await params).orderId}`);
  }

  const { orderId } = await params;

  const snapshot = await adminDb.collection("orders").doc(orderId).get();
  if (!snapshot.exists) {
    return <NotFound />;
  }

  const order = snapshot.data() as Partial<Order>;
  const ownsOrder = order.clerkId === userId;
  const status = (order.status ?? "pending") as OrderStatus;

  if (!ownsOrder || status === "draft") {
    return <NotFound />;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const totalUsd = order.amountPaidUsd ?? order.totalUsd ?? 0;
  const subtotalUsd =
    order.subtotalUsd ??
    items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
      0,
    );
  const itemCount = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to orders
          </Link>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Order #{shortOrderId(snapshot.id)}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(order.createdAt)}
            {order.customerEmail ? ` · ${order.customerEmail}` : null}
          </p>
        </div>
        <div className="flex items-start justify-end">
          <StatusBadge status={status} />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No line items on this order.
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
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Quantity
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Unit price
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item) => {
                  const lineTotal = (item.price ?? 0) * (item.quantity ?? 0);
                  return (
                    <tr key={String(item.id)}>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-4">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              width={56}
                              height={56}
                              className="h-14 w-14 flex-none rounded-xl border border-slate-200 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatPKR(item.price ?? 0)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-700 sm:px-6">
                        {item.quantity ?? 0}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700 sm:px-6">
                        <div className="font-semibold text-slate-900">
                          {formatUSD(item.price ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(item.price ?? 0)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900 sm:px-6">
                        <div>{formatUSD(lineTotal)}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {formatPKR(lineTotal)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-sm text-slate-600 sm:px-6"
                  >
                    Items
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 sm:px-6">
                    {itemCount}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-sm text-slate-600 sm:px-6"
                  >
                    Subtotal
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700 sm:px-6">
                    {formatUSD(subtotalUsd)}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-right text-base font-semibold text-slate-900 sm:px-6"
                  >
                    Total
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold text-slate-900 sm:px-6">
                    <div>{formatUSD(totalUsd)}</div>
                    <div className="text-xs font-normal text-slate-500">
                      ≈ {formatPKR(totalUsd)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {status === "pending" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Finalizing your payment. If you just paid, this can take a few
          seconds — refresh the page to see the latest status.
        </div>
      ) : null}
    </div>
  );
}
