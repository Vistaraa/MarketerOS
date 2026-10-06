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
  ["connect-src 'self'", ...storageUploadOrigins(), ...(isDev ? ["ws:", "wss:"] : [])].join(" "),
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
  // The readiness probe compares shipped migrations with the database, so include them in its serverless bundle.
  outputFileTracingIncludes: {
    "/api/health/ready": ["./prisma/migrations/**/*"]
  },
  // instrumentation.ts is loaded automatically since Next.js 15 (no experimental flag needed).
  experimental: {
    // Next.js 15 buffers request bodies for middleware and truncates them past 10 MB by default, which broke
    // media uploads between 10 MB and the upload cap. Allow the cap plus room for multipart overhead.
    middlewareClientMaxBodySize: maxUploadBytes + 1024 * 1024
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
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
