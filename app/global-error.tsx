"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last-resort error boundary for errors in the root layout; reports them to Sentry when configured. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 18 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#71717a" }}>The error has been logged. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid #d4d4d8", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
