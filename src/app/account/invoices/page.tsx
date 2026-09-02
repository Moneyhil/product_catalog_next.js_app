import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Invoice } from "@/lib/types";

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

function shortInvoiceId(value: string): string {
  if (value.length <= 10) return value.toUpperCase();
  return `${value.slice(0, 6).toUpperCase()}…${value.slice(-4).toUpperCase()}`;
}

export default async function AccountInvoicesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account/invoices");
  }

  const snapshot = await adminDb
    .collection("invoices")
    .where("clerkId", "==", userId)
    .where("status", "==", "paid")
    .orderBy("issuedAt", "desc")
    .get();

  const invoices = snapshot.docs.map((document) => {
    const data = document.data() as Partial<Invoice>;
    return {
      id: document.id,
      invoiceNumber:
        typeof data.invoiceNumber === "string" && data.invoiceNumber.length > 0
          ? data.invoiceNumber
          : shortInvoiceId(document.id),
      orderId: data.orderId ?? null,
      issuedAt: data.issuedAt ?? data.createdAt ?? null,
      totalUsd: data.amountPaidUsd ?? data.totalUsd ?? 0,
      customerEmail: data.customerEmail ?? null,
    } satisfies {
      id: string;
      invoiceNumber: string;
      orderId: string | null;
      issuedAt: unknown;
      totalUsd: number;
      customerEmail: string | null;
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
          <p className="mt-1 text-sm text-slate-600">
            {invoices.length === 0
              ? "No invoices yet."
              : invoices.length === 1
              ? "1 invoice issued"
              : `${invoices.length} invoices issued`}
          </p>
        </div>
      </header>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm font-medium text-slate-700">No invoices</p>
          <p className="mt-1 text-sm text-slate-600">
            After you complete a purchase, paid invoices will appear here.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Start Shopping
            </Link>
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              View orders
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
                    Invoice
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-slate-700 sm:px-6"
                  >
                    Issued
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-slate-700 sm:px-6"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.map((invoice) => {
                  return (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <Link
                          href={`/account/invoices/${encodeURIComponent(invoice.id)}`}
                          className="font-mono text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline"
                        >
                          #{invoice.invoiceNumber}
                        </Link>
                        {invoice.orderId ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Order{" "}
                            <Link
                              href={`/account/orders/${encodeURIComponent(invoice.orderId)}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {shortInvoiceId(invoice.orderId)}
                            </Link>
                          </div>
                        ) : null}
                        {invoice.customerEmail ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {invoice.customerEmail}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700 sm:px-6">
                        {formatDate(invoice.issuedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right sm:px-6">
                        <div className="font-semibold text-slate-900">
                          {formatUSD(invoice.totalUsd)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(invoice.totalUsd)}
                        </div>
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
