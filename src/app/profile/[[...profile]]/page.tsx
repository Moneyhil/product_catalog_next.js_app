import Link from "next/link";
import { Show, UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Show when="signed-in">
        <UserProfile />
      </Show>

      <Show when="signed-out">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sign in to view your profile
          </h1>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Sign In
          </Link>
        </div>
      </Show>
    </main>
  );
}
