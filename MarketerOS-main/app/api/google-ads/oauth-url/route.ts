import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const returnTo = url.searchParams.get("returnTo") || "/integrations";

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      `${url.origin}/api/google-ads/callback`;

    // Construct Google OAuth URL
    const scopes = [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" ");

    const stateObj = {
      workspaceId: "ws-current",
      userId: "usr-current",
      providerKey: "google_ads",
      returnTo,
      timestamp: Date.now()
    };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

    if (clientId) {
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(
        scopes
      )}&access_type=offline&prompt=consent&include_granted_scopes=true&state=${state}`;

      return NextResponse.json({
        success: true,
        url: googleOAuthUrl,
        configured: true
      });
    }

    // Demo/Sandbox fallback URL if credentials are not set yet in environment
    const demoOAuthUrl = `${url.origin}/integrations?oauth=simulated&provider=google_ads&state=${state}`;
    return NextResponse.json({
      success: true,
      url: demoOAuthUrl,
      configured: false,
      message: "Running in sandbox mode. Configure GOOGLE_OAUTH_CLIENT_ID in .env for live Google authentication."
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
