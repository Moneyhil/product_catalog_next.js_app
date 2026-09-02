"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

const SAFE_REDIRECT_PREFIXES = [
  "/",
  "/account",
  "/dashboard",
  "/admin",
  "/post-sign-in",
  "/products",
  "/cart",
  "/order",
  "/profile",
];

function resolveForceRedirect(searchRedirect: string | null): string {
  if (!searchRedirect || searchRedirect.length === 0) return "/post-sign-in";
  try {
    const parsed = new URL(searchRedirect, "http://localhost");
    const pathOnly = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const ok = SAFE_REDIRECT_PREFIXES.some(
      (prefix) =>
        pathOnly === prefix ||
        pathOnly.startsWith(`${prefix}/`) ||
        pathOnly.startsWith(`${prefix}?`) ||
        pathOnly.startsWith(`${prefix}#`),
    );
    return ok ? pathOnly : "/post-sign-in";
  } catch {
    if (searchRedirect.startsWith("/")) {
      const ok = SAFE_REDIRECT_PREFIXES.some(
        (prefix) =>
          searchRedirect === prefix ||
          searchRedirect.startsWith(`${prefix}/`) ||
          searchRedirect.startsWith(`${prefix}?`) ||
          searchRedirect.startsWith(`${prefix}#`),
      );
      return ok ? searchRedirect : "/post-sign-in";
    }
    return "/post-sign-in";
  }
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrlFromToken = searchParams.get("redirect_url");
  const forceRedirectUrl = resolveForceRedirect(redirectUrlFromToken);
  const fallbackRedirectUrl = forceRedirectUrl;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8" suppressHydrationWarning>
       <SignIn
         forceRedirectUrl={forceRedirectUrl}
         fallbackRedirectUrl={fallbackRedirectUrl}
       />
    </main>
  );
}
