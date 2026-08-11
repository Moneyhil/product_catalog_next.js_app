import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import RoleSelect from "@/components/RoleSelect";
import { adminDb } from "@/lib/firebase/admin";

type UserRecord = {
  clerkId?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  role?: unknown;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function AdminPage() {
  const user = await currentUser();
  if (user?.publicMetadata.role !== "admin") {
    redirect("/");
  }

  const usersSnapshot = await adminDb.collection("users").get();
  const users = usersSnapshot.docs.map((document) => {
    const data = document.data() as UserRecord;
    const firstName = asText(data.firstName);
    const lastName = asText(data.lastName);

    return {
      clerkId: asText(data.clerkId) || document.id,
      email: asText(data.email) || "—",
      name: `${firstName} ${lastName}`.trim() || "—",
      role: data.role === "admin" ? ("admin" as const) : ("customer" as const),
    };
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-slate-900">User management</h1>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-800">
            {users.map((listedUser) => (
              <tr key={listedUser.clerkId}>
                <td className="px-4 py-3">{listedUser.name}</td>
                <td className="px-4 py-3">{listedUser.email}</td>
                <td className="px-4 py-3">
                  <RoleSelect clerkId={listedUser.clerkId} role={listedUser.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
