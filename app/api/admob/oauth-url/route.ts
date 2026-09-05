import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";

export async function GET(request: Request) {
  console.log("\n=======================================================");
  console.log("[ADMOB_OAUTH] 🚀 Initiating Google AdMob OAuth URL generation...");

  try {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo") || "/integrations";

    // Priority: ADMOB_OAUTH_CLIENT_ID -> GOOGLE_CLIENT_ID
    const clientId = process.env.ADMOB_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error("[ADMOB_OAUTH] ❌ Error: Google / AdMob Client ID missing in .env");
      return NextResponse.json(
        {
          success: false,
          error: "Google / AdMob Client ID is not configured in .env (GOOGLE_CLIENT_ID or ADMOB_OAUTH_CLIENT_ID)."
        },
        { status: 400 }
      );
    }

    const session = await getSession().catch(() => null);
    const statePayload = {
      workspaceId: session?.workspaceId || "default-ws",
      userId: session?.userId || "default-usr",
      providerKey: "admob",
      returnTo,
      timestamp: Date.now()
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    // Use registered Google OAuth redirect URI
    const redirectUri =
      process.env.ADMOB_OAUTH_REDIRECT_URI ||
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${url.origin}/api/google-ads/callback`;

    // Scopes: admob.readonly, admob.report, userinfo.profile, userinfo.email
    const customScopes = process.env.ADMOB_SCOPES;
    const scopes = customScopes
      ? customScopes.split(/[\s,]+/).filter(Boolean)
      : [
          "https://www.googleapis.com/auth/admob.readonly",
          "https://www.googleapis.com/auth/admob.report",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email"
        ];

    console.log(`[ADMOB_OAUTH] 🆔 Client ID: ${clientId.slice(0, 20)}...`);
    console.log(`[ADMOB_OAUTH] 🔗 Redirect URI: ${redirectUri}`);
    console.log(`[ADMOB_OAUTH] 🛡️ Scopes (${scopes.length}):`, scopes.join(", "));

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    console.log(`[ADMOB_OAUTH] ✅ Consent URL generated successfully!`);
    console.log("=======================================================\n");

    return NextResponse.json({
      success: true,
      url: authUrl.toString()
    });
  } catch (error) {
    console.error("[ADMOB_OAUTH] 💥 Error generating OAuth URL:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate AdMob OAuth URL" },
      { status: 500 }
    );
  }
}
