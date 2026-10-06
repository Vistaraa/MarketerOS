import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "marketeros_session";

// Public paths that do not require authentication
const PUBLIC_PREFIXES = [
  "/auth",
  "/api/auth",
  // Terms, Privacy and Cookie policies must be readable before signing up.
  "/legal",
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

/**
 * Page Content-Security-Policy with a per-request nonce: only scripts carrying it (Next.js adds it to its own, and
 * app/layout.tsx to the theme script) or loaded by them ('strict-dynamic') can run, so injected inline scripts
 * can't. Styles still allow inline attributes, which React components use.
 */
function pageContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Google Fonts is loaded via @import in app/globals.css.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${process.env.MARKETEROS_CSP_CONNECT_SRC || "'self'"}`,
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://secure.payu.in https://test.payu.in",
    "base-uri 'self'",
    "object-src 'none'"
  ].join("; ");
}

/** Continues to the page with its nonce and CSP (API routes get their static policy from next.config.mjs). */
function nextWithCsp(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const nonce = btoa(crypto.randomUUID());
  const csp = pageContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce from the request's CSP header and applies it to the scripts it renders.
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/** Next.js 16 "proxy" (formerly middleware): runs before every matched request. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  // Developer API keys are read-only and only valid for the /api/v1 data endpoints (the key itself is checked there).
  if (bearer?.startsWith("mk_live_")) {
    if (!pathname.startsWith("/api/v1/")) {
      return NextResponse.json({ error: { code: "API_KEY_NOT_ALLOWED", message: "API keys can only be used with /api/v1 endpoints." } }, { status: 403 });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.json({ error: { code: "API_KEY_READ_ONLY", message: "API keys are read-only." } }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 1. Allow public routes (/auth, /api/auth, etc.)
  if (isPublic(pathname)) {
    return nextWithCsp(request);
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

  return nextWithCsp(request);
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
