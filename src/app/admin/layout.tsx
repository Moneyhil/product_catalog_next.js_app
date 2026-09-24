import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await currentUser();
  if (user?.publicMetadata.role !== "admin") {
    redirect("/");
  }

  const sections = [
    { href: "/admin", label: "Users" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/leads", label: "Leads" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {section.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
