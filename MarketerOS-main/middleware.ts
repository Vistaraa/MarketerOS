import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "marketeros_session";

// Public paths that do not require authentication
const PUBLIC_PREFIXES = [
  "/auth",
  "/api/auth",
  "/api/health",
  "/favicon.ico",
  "/_next",
  "/media",
  "/images",
  "/api/stripe/webhook"
];

function isPublic(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return false; // root redirect to /overview (which is protected)
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const hasToken = Boolean(sessionCookie || (authHeader && authHeader.startsWith("Bearer ")));

  // 1. If user is already logged in and tries to access /auth/login or /auth/signup
  if (pathname.startsWith("/auth") && hasToken) {
    // Basic signature check: contains '.' format
    if (sessionCookie && sessionCookie.includes(".")) {
      const returnTo = request.nextUrl.searchParams.get("returnTo") || "/overview";
      return NextResponse.redirect(new URL(returnTo, request.url));
    }
  }

  // 2. Allow public routes
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // 3. Protected API Routes (/api/v1/*)
  if (pathname.startsWith("/api/v1")) {
    if (!hasToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 4. Protected Web Pages (/overview, /campaigns, /leads, etc.)
  if (!hasToken) {
    const target = `${pathname}${search}`;
    const loginUrl = new URL("/auth/login", request.url);
    if (target && target !== "/" && target !== "/overview") {
      loginUrl.searchParams.set("returnTo", target);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If visiting root '/', redirect to '/overview'
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
