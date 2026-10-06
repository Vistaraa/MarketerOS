import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/oauth";
import { integrationConnectContext, safeReturnTo } from "@/lib/google-oauth-guard";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const auth = await integrationConnectContext();
    if (auth.response) return auth.response;

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { success: false, configured: false, error: "Google sign-in isn't configured on this server (GOOGLE_OAUTH_CLIENT_ID)." },
        { status: 409 }
      );
    }
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/google-ads/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" ");
    // Single-use, stored server-side and bound to this user and workspace (checked in the callback).
    const state = await createOAuthState({ workspaceId: auth.session.workspaceId, userId: auth.session.userId, providerKey: "google_ads", returnTo: safeReturnTo(url.searchParams.get("returnTo")) });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", state);
    return NextResponse.json({ success: true, url: authUrl.toString(), configured: true });
  } catch (error) {
    console.error("[google-ads] Failed to create the OAuth URL:", error);
    return NextResponse.json({ success: false, error: "Failed to start Google sign-in." }, { status: 500 });
  }
}
