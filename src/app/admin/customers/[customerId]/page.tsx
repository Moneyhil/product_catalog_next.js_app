import Link from "next/link";
import { notFound } from "next/navigation";

import { adminDb } from "@/lib/firebase/admin";
import { formatUSD } from "@/lib/currency";
import type { Customer, Order, OrderStatus } from "@/lib/types";
import { formatDateTime, orderTotal, shortId } from "../../admin-utils";

type RouteParams = {
  params: Promise<{ customerId: string }>;
};

export default async function AdminCustomerDetailPage({ params }: RouteParams) {
  const { customerId } = await params;
  const customerSnapshot = await adminDb.collection("customers").doc(customerId).get();
  if (!customerSnapshot.exists) notFound();

  const customer = customerSnapshot.data() as Partial<Customer>;
  const orderSnapshot = await adminDb
    .collection("orders")
    .orderBy("createdAt", "desc")
    .get();
  const orders = orderSnapshot.docs
    .filter((document) => document.data().clerkId === customerId)
    .map((document) => {
      const data = document.data() as Partial<Order>;
      return {
        id: document.id,
        createdAt: data.createdAt,
        total: orderTotal(data),
        status: (data.status ?? "pending") as OrderStatus,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
      };
    });

  return (
    <main>
      <Link href="/admin/customers" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        &larr; Back to customers
      </Link>
      <header className="mt-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {customer.name || customer.email || "Customer"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {customer.email || "-"} · {orders.length} order{orders.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-mono font-medium">
                  <Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="hover:underline">
                    #{shortId(order.id)}
                  </Link>
                  {order.invoiceId ? (
                    <Link
                      href={`/account/invoices/${encodeURIComponent(order.invoiceId)}`}
                      className="ml-3 text-xs font-sans text-slate-500 underline-offset-2 hover:underline"
                    >
                      {order.invoiceNumber || "Invoice"}
                    </Link>
                  ) : null}
                </td>
                <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
                <td className="px-4 py-3 text-right font-medium">{formatUSD(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No orders found for this customer.
        </p>
      ) : null}
    </main>
  );
}
