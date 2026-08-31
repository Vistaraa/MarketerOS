import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, url.origin));
  }

  let returnTo = "/integrations";
  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
      if (decoded.returnTo) returnTo = decoded.returnTo;
    }
  } catch {}

  // If live code is returned, exchange for tokens if client secret is configured
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/google-ads/callback`;

  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });

      const tokens = await tokenRes.json();
      console.log("\n[GOOGLE_ADS_OAUTH] 🔑 Token Exchange Response Received. Has Access Token:", Boolean(tokens.access_token), "Has Refresh Token:", Boolean(tokens.refresh_token));

      if (tokens.access_token || tokens.refresh_token) {
        const { encryptSecret } = await import("@/lib/crypto");
        const updateData: Record<string, unknown> = {
          status: "CONNECTED",
          lastSyncedAt: new Date(),
          scopes: ["https://www.googleapis.com/auth/adwords"]
        };
        if (tokens.refresh_token) updateData.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
        if (tokens.access_token) updateData.accessTokenEncrypted = encryptSecret(tokens.access_token);

        // Update all Google Ads integrations across workspaces
        await prisma.integration.updateMany({
          where: { platform: "GOOGLE_ADS" },
          data: updateData as never
        });

        console.log("[GOOGLE_ADS_OAUTH] ✅ Encrypted OAuth tokens saved to database successfully!\n");
      }
    } catch (e) {
      console.error("Token exchange failed:", e);
    }
  }

  return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=google_ads`, url.origin));
}
