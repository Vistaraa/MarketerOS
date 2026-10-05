import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

// Next.js and the theme script in app/layout.tsx use inline scripts, so script-src needs 'unsafe-inline'
// until nonces are introduced. The rest of the policy still blocks framing, plugins, base-tag hijacking,
// cross-origin fetches and form posts to anywhere but this site and the PayU checkout.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Google Fonts is loaded via @import in app/globals.css.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://secure.payu.in https://test.payu.in",
  "base-uri 'self'",
  "object-src 'none'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }])
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
    instrumentationHook: true
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

// Error monitoring (no-op until SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN are set). Source maps are uploaded only
// when SENTRY_AUTH_TOKEN is available, e.g. in CI.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  // Browser events go through this app's own domain, so the CSP needs no Sentry hosts and ad blockers don't drop them.
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  disableLogger: true
});
