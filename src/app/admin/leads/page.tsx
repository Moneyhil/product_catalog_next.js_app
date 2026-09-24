import { adminDb } from "@/lib/firebase/admin";
import { formatUSD } from "@/lib/currency";
import type { Order } from "@/lib/types";
import { asText, formatDateTime, formatTimeAgo, orderTotal, shortId } from "../admin-utils";

export default async function AdminLeadsPage() {
  const snapshot = await adminDb
    .collection("orders")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const leads = snapshot.docs
    .map((document) => ({
      id: document.id,
      data: document.data() as Partial<Order>,
    }))
    .filter(({ data }) => data.status === "pending");

  return (
    <main>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
        <p className="mt-1 text-sm text-slate-600">Abandoned checkouts with pending payment.</p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Attempted order</th>
              <th className="px-4 py-3 font-medium">Customer email</th>
              <th className="px-4 py-3 font-medium">Cart value</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {leads.map(({ id, data }) => (
              <tr key={id}>
                <td className="px-4 py-3 font-mono font-medium">#{shortId(id)}</td>
                <td className="px-4 py-3">{asText(data.customerEmail) || asText(data.email) || "-"}</td>
                <td className="px-4 py-3 font-medium">{formatUSD(orderTotal(data))}</td>
                <td className="px-4 py-3">{formatDateTime(data.createdAt)}</td>
                <td className="px-4 py-3 text-slate-600">{formatTimeAgo(data.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leads.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No pending checkout leads found.
        </p>
      ) : null}
    </main>
  );
}
