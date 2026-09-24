import Link from "next/link";

import { adminDb } from "@/lib/firebase/admin";
import { formatUSD } from "@/lib/currency";
import type { Order } from "@/lib/types";
import { asText, formatDateTime, orderTotal, shortId } from "../admin-utils";

export default async function AdminOrdersPage() {
  const snapshot = await adminDb
    .collection("orders")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const orders = snapshot.docs
    .map((document) => ({
      id: document.id,
      data: document.data() as Partial<Order>,
    }))
    .filter(({ data }) => data.status === "paid");

  return (
    <main>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Paid orders</h1>
        <p className="mt-1 text-sm text-slate-600">Latest 100 orders, filtered to paid payments.</p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Order ID</th>
              <th className="px-4 py-3 font-medium">Customer email</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {orders.map(({ id, data }) => (
              <tr key={id}>
                <td className="px-4 py-3 font-mono font-medium">
                  <Link href={`/admin/orders/${encodeURIComponent(id)}`} className="hover:underline">
                    #{shortId(id)}
                  </Link>
                </td>
                <td className="px-4 py-3">{asText(data.customerEmail) || asText(data.email) || "-"}</td>
                <td className="px-4 py-3 font-medium">{formatUSD(orderTotal(data))}</td>
                <td className="px-4 py-3">{formatDateTime(data.createdAt)}</td>
                <td className="px-4 py-3">
                  {asText(data.invoiceId) ? (
                    <Link
                      href={`/account/invoices/${encodeURIComponent(data.invoiceId as string)}`}
                      className="font-medium text-slate-700 underline-offset-2 hover:underline"
                    >
                      {asText(data.invoiceNumber) || "View invoice"}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No paid orders found.
        </p>
      ) : null}
    </main>
  );
}
