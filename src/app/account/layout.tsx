import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";

import { adminDb } from "@/lib/firebase/admin";
import type { Customer } from "@/lib/types";

type AccountLayoutProps = {
  children: React.ReactNode;
};

async function resolveCustomer(clerkUserId: string): Promise<Customer | null> {
  const snapshot = await adminDb
    .collection("customers")
    .doc(clerkUserId)
    .get();
  if (!snapshot.exists) return null;
  return snapshot.data() as Customer;
}

function UnlockAccountScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          Your account is locked
        </h1>
        <p className="mt-2 text-slate-600">
          Place your first order to unlock your customer dashboard with order
          history, favorites, and saved settings.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}

export default async function AccountLayout({
  children,
}: AccountLayoutProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account");
  }

  const user = await currentUser();
  const isAdmin = user?.publicMetadata.role === "admin";
  const customer = await resolveCustomer(userId);
  if (!customer) {
    if (isAdmin) {
      return (
        <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </main>
      );
    }
    return <UnlockAccountScreen />;
  }

  const displayName =
    customer.name ?? customer.email ?? "Customer dashboard";
  const subtitle = customer.email ?? "Account";

  const sections = [
    { href: "/account/orders", label: "Orders" },
    { href: "/account/invoices", label: "Invoices" },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            My Account
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <p className="mt-2 text-xs text-slate-500">
            {customer.totalOrders === 1
              ? `1 order placed · lifetime spend ${customer.totalSpent.toFixed(2)} USD`
              : `${customer.totalOrders} orders placed · lifetime spend ${customer.totalSpent.toFixed(
                  2,
                )} USD`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav aria-label="Account sections" className="flex flex-col gap-1">
            {sections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
