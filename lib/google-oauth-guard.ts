import { NextResponse } from "next/server";
import { can, getSession } from "@/lib/auth-server";
import { emailVerificationGuard } from "@/lib/email-verification";

/**
 * Who may start connecting a Google account (Ads/AdMob) to the workspace: a signed-in member allowed to manage
 * integrations, with a verified email. Returns the session or the error response.
 */
export async function integrationConnectContext() {
  const session = await getSession().catch(() => null);
  if (!session) return { response: NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 }) } as const;
  if (!can(session.role, "settings.manage")) {
    return { response: NextResponse.json({ success: false, error: "You do not have permission to connect integrations." }, { status: 403 }) } as const;
  }
  const unverified = await emailVerificationGuard(session.userId);
  if (unverified) return { response: unverified } as const;
  return { session } as const;
}

/** Only same-site paths are accepted as the post-OAuth destination (no open redirects). */
export function safeReturnTo(value: string | null | undefined) {
  return value && /^\/(?![\/\\])/.test(value) ? value : "/integrations";
}
