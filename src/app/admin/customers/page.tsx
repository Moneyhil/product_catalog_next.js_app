import Link from "next/link";

import { adminDb } from "@/lib/firebase/admin";
import type { Customer } from "@/lib/types";
import { asNumber, asText, formatDate } from "../admin-utils";

export default async function AdminCustomersPage() {
  const snapshot = await adminDb.collection("customers").get();
  const customers = snapshot.docs.map((document) => {
    const data = document.data() as Partial<Customer>;
    return {
      id: document.id,
      name: asText(data.name) || "-",
      email: asText(data.email) || "-",
      totalOrders: asNumber(data.totalOrders),
      totalSpent: asNumber(data.totalSpent),
      createdAt: data.createdAt,
    };
  });

  return (
    <main>
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="mt-1 text-sm text-slate-600">
          {customers.length} customer{customers.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Total orders</th>
              <th className="px-4 py-3 font-medium">Lifetime spend</th>
              <th className="px-4 py-3 font-medium">Date joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                    className="hover:underline"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{customer.email}</td>
                <td className="px-4 py-3">{customer.totalOrders}</td>
                <td className="px-4 py-3">${customer.totalSpent.toFixed(2)}</td>
                <td className="px-4 py-3">{formatDate(customer.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
