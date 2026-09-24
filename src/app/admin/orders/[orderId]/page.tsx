import Link from "next/link";
import { notFound } from "next/navigation";

import { adminDb } from "@/lib/firebase/admin";
import { formatPKR, formatUSD } from "@/lib/currency";
import type { Order } from "@/lib/types";
import { asText, formatDateTime, orderTotal, shortId } from "../../admin-utils";

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export default async function AdminOrderDetailPage({ params }: RouteParams) {
  const { orderId } = await params;
  const snapshot = await adminDb.collection("orders").doc(orderId).get();
  if (!snapshot.exists) notFound();

  const order = snapshot.data() as Partial<Order>;
  const items = Array.isArray(order.items) ? order.items : [];
  const totalUsd = orderTotal(order);
  const subtotalUsd = order.subtotalUsd ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="space-y-8">
      <header>
        <Link href="/admin/orders" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          &larr; Back to paid orders
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Order #{shortId(snapshot.id)}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatDateTime(order.createdAt)}{asText(order.customerEmail) ? ` · ${order.customerEmail}` : ""}
        </p>
        <p className="mt-1 text-sm capitalize text-slate-600">Status: {asText(order.status) || "pending"}</p>
        {asText(order.invoiceId) ? (
          <p className="mt-1 text-xs text-slate-500">
            Invoice: <Link href={`/account/invoices/${encodeURIComponent(order.invoiceId as string)}`} className="font-medium text-slate-700 underline-offset-2 hover:underline">
              {asText(order.invoiceNumber) || "View invoice"}
            </Link>
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">No line items on this order.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Quantity</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Unit price</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <tr key={String(item.id)}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          {item.image ? <img src={item.image} alt="" width={56} height={56} className="h-14 w-14 flex-none rounded-xl border border-slate-200 object-cover" /> : null}
                          <div>
                            <p className="font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{formatPKR(item.price)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-4 text-right"><div className="font-semibold text-slate-900">{formatUSD(item.price)}</div><div className="text-xs text-slate-500">{formatPKR(item.price)}</div></td>
                      <td className="px-4 py-4 text-right"><div className="font-semibold text-slate-900">{formatUSD(lineTotal)}</div><div className="text-xs text-slate-500">{formatPKR(lineTotal)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr><td colSpan={3} className="px-4 py-3 text-right text-slate-600">Items</td><td className="px-4 py-3 text-right">{itemCount}</td></tr>
                <tr><td colSpan={3} className="px-4 py-3 text-right text-slate-600">Subtotal</td><td className="px-4 py-3 text-right">{formatUSD(subtotalUsd)}</td></tr>
                <tr><td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">Total</td><td className="px-4 py-3 text-right font-semibold text-slate-900"><div>{formatUSD(totalUsd)}</div><div className="text-xs font-normal text-slate-500">≈ {formatPKR(totalUsd)}</div></td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {order.shipping ? (
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2">
          <div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Customer</h2><p className="mt-2 font-medium text-slate-900">{order.shipping.name || order.customerEmail || "Customer"}</p><p className="text-sm text-slate-600">{order.customerEmail || "-"}</p><p className="text-sm text-slate-600">{order.shipping.phone || "-"}</p></div>
          <div><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Shipping</h2><p className="mt-2 text-sm text-slate-600">{[order.shipping.address.line1, order.shipping.address.line2, order.shipping.address.city, order.shipping.address.state, order.shipping.address.postalCode, order.shipping.address.country].filter(Boolean).join(", ") || "-"}</p></div>
        </section>
      ) : null}
    </main>
  );
}
