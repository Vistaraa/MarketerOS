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
  "/api/stripe/webhook",
  // Vercel Cron; the route checks CRON_SECRET itself.
  "/api/cron/",
  // Sentry's browser event tunnel (see next.config.mjs); events arrive before/without a session.
  "/monitoring",
  // PayU posts here cross-site, so no session cookie arrives; the handler verifies PayU's signed hash instead.
  "/api/billing/payu/callback"
];

// API routes the browser reaches by top-level navigation (OAuth redirects back from Google).
// Without a session these get the login redirect like pages do, instead of a JSON 401.
const BROWSER_NAVIGATION_API_ROUTES = [
  "/api/google-ads/callback",
  "/api/admob/callback",
  "/api/v1/integrations/oauth/callback"
];

function isPublic(pathname: string): boolean {
  if (pathname === "/" || pathname === "") return false; // root redirect to /overview (which is protected)
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Checks the token's HMAC signature (same scheme as lib/auth-server.ts) so forged tokens are rejected
 * at the edge. Expiry and revocation still need the database and are enforced by getSession() in routes.
 */
async function hasValidSignature(token: string | undefined) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), encoder.encode(payload));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  // 1. Allow public routes (/auth, /api/auth, etc.)
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasToken = (await hasValidSignature(sessionCookie)) || (await hasValidSignature(bearer));

  // 3. Protected API Routes (/api/*): JSON 401, never an HTML login redirect
  if (pathname.startsWith("/api/") && !BROWSER_NAVIGATION_API_ROUTES.includes(pathname)) {
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
