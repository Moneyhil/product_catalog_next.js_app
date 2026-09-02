import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/products(.*)",
  "/cart",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/profile(.*)",
  "/order/success(.*)",
  "/post-sign-in(.*)",
  "/api/webhooks(.*)",
  "/api/test-firebase(.*)",
  "/api/checkout(.*)",
  "/api/checkout/verify-session(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

const DASHBOARD_PATH_PREFIXES = ["/account", "/dashboard"];
const SIGN_IN_OR_SIGN_UP_PREFIXES = ["/sign-in", "/sign-up"];

function isDashboardPathname(pathname: string): boolean {
  if (!pathname || pathname.length === 0) return false;
  return DASHBOARD_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function parsePathname(rawUrl: string | null): string | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    return parsed.pathname;
  } catch {
    if (rawUrl.startsWith("/")) return rawUrl.split("?", 1)[0].split("#", 1)[0];
    return null;
  }
}

function extractDashboardTargetFromUrl(urlLike: string | null): string | null {
  const pathname = parsePathname(urlLike);
  if (!pathname) return null;
  if (SIGN_IN_OR_SIGN_UP_PREFIXES.some((p) => pathname.startsWith(`${p}`))) {
    return null;
  }
  return isDashboardPathname(pathname) ? pathname : null;
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const pathname = new URL(req.url).pathname;

  if (userId) {
    let redirectUrl: URL | null = null;

    for (const prefix of SIGN_IN_OR_SIGN_UP_PREFIXES) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        const candidate =
          req.nextUrl.searchParams.get("redirect_url") ??
          req.nextUrl.searchParams.get("return_back_url") ??
          null;

        const dashboardTarget = extractDashboardTargetFromUrl(candidate);
        if (dashboardTarget) {
          redirectUrl = new URL(dashboardTarget, req.url);
        } else {
          redirectUrl = new URL("/", req.url);
        }
        break;
      }
    }

    if (!redirectUrl) {
      const forceUrl = req.nextUrl.searchParams.get("sign_in_force_redirect_url");
      const dashboardTarget = extractDashboardTargetFromUrl(forceUrl);
      if (dashboardTarget) {
        redirectUrl = new URL(dashboardTarget, req.url);
      }
    }

    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!isPublicRoute(req) && !userId) {
    if (req.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isDashboardPathname(pathname)) {
      const afterSignIn = new URL("/post-sign-in", req.url);
      afterSignIn.searchParams.set("redirect_url", req.url);
      return redirectToSignIn({ returnBackUrl: afterSignIn.toString() });
    }

    return redirectToSignIn({ returnBackUrl: req.url });
  }

  const metadata = sessionClaims?.metadata as { role?: unknown } | undefined;
  if (isAdminRoute(req) && metadata?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|__clerk|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/webhooks)|trpc)(.*)",
  ],
};
