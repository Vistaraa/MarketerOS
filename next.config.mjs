import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV !== "production";

// Browsers upload media straight to S3-compatible storage via presigned URLs, so that origin must be allowed in
// connect-src. Derived from the storage settings at build time; S3_PUBLIC_UPLOAD_ORIGIN overrides it.
function storageUploadOrigins() {
  if (process.env.STORAGE_DRIVER !== "s3") return [];
  if (process.env.S3_PUBLIC_UPLOAD_ORIGIN) return [process.env.S3_PUBLIC_UPLOAD_ORIGIN];
  if (process.env.S3_ENDPOINT) return [new URL(process.env.S3_ENDPOINT).origin];
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  return bucket ? [`https://${bucket}.s3.${region}.amazonaws.com`, `https://${bucket}.s3.amazonaws.com`] : [];
}

// The page Content-Security-Policy is set per request by proxy.ts (each response gets a fresh script nonce,
// so no 'unsafe-inline' scripts). Origins it needs that are only known at build time are passed in here.
const cspConnectSrc = ["'self'", ...storageUploadOrigins(), ...(isDev ? ["ws:", "wss:"] : [])].join(" ");

// API responses are data, never documents: nothing may load or run from them.
const apiContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }])
];

// Uploaded media is served under /api/media. Even though only allowlisted, content-checked files are stored,
// they get a fully sandboxed policy so a file can never run as a page on this origin. (Listed after the global
// rule: when several rules set the same header, Next.js uses the last one.)
const mediaHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
  { key: "X-Content-Type-Options", value: "nosniff" }
];

const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // This app's own directory (a lockfile higher up would otherwise be taken as the workspace root).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  // Inlined at build time for the CSP built in proxy.ts.
  env: { MARKETEROS_CSP_CONNECT_SRC: cspConnectSrc },
  // The readiness probe compares shipped migrations with the database, so include them in its serverless bundle.
  outputFileTracingIncludes: {
    "/api/health/ready": ["./prisma/migrations/**/*"]
  },
  // instrumentation.ts is loaded automatically since Next.js 15 (no experimental flag needed).
  experimental: {
    // Next.js buffers request bodies for the proxy (formerly middleware) and truncates them past 10 MB by default,
    // which broke media uploads between 10 MB and the upload cap. Allow the cap plus room for multipart overhead.
    proxyClientMaxBodySize: maxUploadBytes + 1024 * 1024
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: apiContentSecurityPolicy }] },
      { source: "/api/media/:path*", headers: mediaHeaders }
    ];
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
  webpack: { treeshake: { removeDebugLogging: true } }
});
