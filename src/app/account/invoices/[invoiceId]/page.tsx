import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Invoice } from "@/lib/types";

type RouteParams = {
  params: Promise<{
    invoiceId: string;
  }>;
};

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

function shortId(value: string): string {
  if (value.length <= 10) return value.toUpperCase();
  return `${value.slice(0, 6).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

function NotFound() {
  return (
    <div className="space-y-6 text-center">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Invoice not found</h2>
        <p className="mt-1 text-sm text-slate-600">
          That invoice doesn&apos;t exist or isn&apos;t available yet.
        </p>
      </header>
      <Link
        href="/account/invoices"
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
      >
        Back to invoices
      </Link>
    </div>
  );
}

export default async function AccountInvoiceDetailPage({
  params,
}: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    redirect(
      `/sign-in?redirect_url=/account/invoices/${(await params).invoiceId}`,
    );
  }

  const { invoiceId } = await params;

  const snapshot = await adminDb.collection("invoices").doc(invoiceId).get();
  if (!snapshot.exists) {
    return <NotFound />;
  }

  const invoice = snapshot.data() as Partial<Invoice>;
  const ownsInvoice = invoice.clerkId === userId;

  if (!ownsInvoice) {
    return <NotFound />;
  }

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const totalUsd = invoice.amountPaidUsd ?? invoice.totalUsd ?? 0;
  const subtotalUsd =
    invoice.subtotalUsd ??
    items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
      0,
    );
  const itemCount = items.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  const invoiceNumber =
    typeof invoice.invoiceNumber === "string" && invoice.invoiceNumber.length > 0
      ? invoice.invoiceNumber
      : shortId(snapshot.id);

  const shippingAddress = invoice.shipping?.address ?? null;
  const shippingName = invoice.shipping?.name ?? null;
  const shippingPhone = invoice.shipping?.phone ?? null;
  const hasShipping =
    shippingName ||
    shippingPhone ||
    shippingAddress?.line1 ||
    shippingAddress?.city ||
    shippingAddress?.postalCode;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/account/invoices"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to invoices
          </Link>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Invoice #{invoiceNumber}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Issued {formatDate(invoice.issuedAt)}
            {invoice.customerEmail ? ` · ${invoice.customerEmail}` : null}
          </p>
          {typeof invoice.orderId === "string" && invoice.orderId.length > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              Order:&nbsp;
              <Link
                href={`/account/orders/${encodeURIComponent(invoice.orderId)}`}
                className="font-medium text-slate-700 underline-offset-2 hover:underline"
              >
                #{shortId(invoice.orderId)}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex items-start justify-end">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Paid
        </span>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
        No line items on this invoice.
      </div>
    ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <tbody className="divide-y divide-slate-100">
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
                    Total paid
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

      {hasShipping ? (
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Bill to
            </h3>
            <div className="mt-2 text-sm text-slate-800">
              <p className="font-medium text-slate-900">
                {invoice.customerName ?? "Customer"}
              </p>
              {invoice.customerEmail ? (
                <p className="text-slate-600">{invoice.customerEmail}</p>
              ) : null}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Ship to
            </h3>
            <div className="mt-2 text-sm text-slate-800">
              <p className="font-medium text-slate-900">
                {shippingName ?? invoice.customerName ?? "Customer"}
              </p>
              {shippingPhone ? (
                <p className="text-slate-600">{shippingPhone}</p>
              ) : null}
              {shippingAddress?.line1 ? (
                <p className="text-slate-600">{shippingAddress.line1}</p>
              ) : null}
              {shippingAddress?.line2 ? (
                <p className="text-slate-600">{shippingAddress.line2}</p>
              ) : null}
              {(shippingAddress?.city ||
                shippingAddress?.state ||
                shippingAddress?.postalCode) ? (
                <p className="text-slate-600">
                  {[
                    shippingAddress?.city,
                    shippingAddress?.state,
                    shippingAddress?.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {shippingAddress?.country ? (
                <p className="text-slate-600">{shippingAddress.country}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
