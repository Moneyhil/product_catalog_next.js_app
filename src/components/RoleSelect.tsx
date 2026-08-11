"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "customer" | "admin";

export default function RoleSelect({
  clerkId,
  role,
}: {
  clerkId: string;
  role: Role;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateRole(newRole: Role) {
    const previousRole = value;
    setValue(newRole);
    setIsUpdating(true);

    try {
      const response = await fetch("/api/admin/set-role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetClerkId: clerkId, newRole }),
      });

      if (!response.ok) {
        throw new Error("Unable to update role");
      }

      router.refresh();
    } catch {
      setValue(previousRole);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <select
      aria-label={`Role for ${clerkId}`}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isUpdating}
      onChange={(event) => updateRole(event.target.value as Role)}
      value={value}
    >
      <option value="customer">Customer</option>
      <option value="admin">Admin</option>
    </select>
  );
}
