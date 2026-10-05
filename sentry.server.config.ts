import * as Sentry from "@sentry/nextjs";

// Error monitoring is off until SENTRY_DSN is set.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  sendDefaultPii: false,
  // Most route handlers catch their errors and log them with console.error; report those too.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })]
});
