import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { adminDb } from "@/lib/firebase/admin";

type PostSignInSearchParams = {
  searchParams: Promise<{
    redirect_url?: string;
  }>;
};

const DASHBOARD_PATH_PREFIXES = ["/account", "/dashboard"];

function isDashboardRedirect(rawRedirect: unknown): string | null {
  if (typeof rawRedirect !== "string" || !rawRedirect.length) return null;

  let pathname: string | null = null;
  try {
    const parsed = new URL(rawRedirect);
    pathname = parsed.pathname;
  } catch {
    if (rawRedirect.startsWith("/")) {
      pathname = rawRedirect.split("?", 1)[0].split("#", 1)[0];
    }
  }

  if (!pathname) return null;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return null;
  }

  const matches = DASHBOARD_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return matches ? pathname : null;
}

export default async function PostSignInPage({
  searchParams,
}: PostSignInSearchParams) {
  const user = await currentUser();
  const params = await searchParams;
  const dashboardTarget = isDashboardRedirect(params.redirect_url);

  if (user) {
    try {
      const documentRef = adminDb.collection("users").doc(user.id);
      const existingDoc = await documentRef.get();

      const primaryEmail = user.emailAddresses.find(
        (email) => email.id === user.primaryEmailAddressId,
      );
      const role = user.publicMetadata.role;

      await documentRef.set(
        {
          clerkId: user.id,
          email: primaryEmail?.emailAddress ?? null,
          firstName: user.firstName,
          lastName: user.lastName,
          role: typeof role === "string" ? role : "customer",
          createdAt: existingDoc.data()?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Failed to sync user during post-sign-in", error);
    }
  }

  if (user?.publicMetadata.role === "admin") {
    redirect(dashboardTarget ?? "/admin");
  }

  const hasExplicitRedirect = typeof params.redirect_url === "string" && params.redirect_url.length > 0;
  if (!hasExplicitRedirect && !dashboardTarget && user) {
    try {
      const customerSnap = await adminDb.collection("customers").doc(user.id).get();
      if (customerSnap.exists) {
        redirect("/account");
      }
    } catch {}
  }

  redirect(dashboardTarget ?? "/");
}
