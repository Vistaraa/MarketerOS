import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { getSession } from "@/lib/auth-server";
import { consumeOAuthState } from "@/lib/oauth";

const ADS_SCOPES = ["https://www.googleapis.com/auth/adwords"];
const ADMOB_SCOPES = ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"];

/**
 * Google OAuth redirect for the Google Ads and AdMob connect flows. The state must be one this server issued
 * (single use, 10 minutes) to the same signed-in user and workspace, and the tokens are saved to that workspace's
 * integration only.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (returnTo: string, reason: string, provider = "google_ads") =>
    NextResponse.redirect(new URL(`${returnTo}?oauth=error&provider=${provider}&reason=${encodeURIComponent(reason)}`, url.origin));

  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/auth/login?returnTo=%2Fintegrations", url.origin));

  const stateParam = url.searchParams.get("state");
  const stored = stateParam ? await consumeOAuthState(stateParam) : null;
  if (!stored || stored.userId !== session.userId || stored.workspaceId !== session.workspaceId) {
    return fail("/integrations", "This sign-in link is invalid or has expired. Please try connecting again.");
  }
  const returnTo = stored.returnTo || "/integrations";
  const isAdMob = stored.providerKey === "google_admob";
  const provider = isAdMob ? "admob" : "google_ads";

  const oauthError = url.searchParams.get("error");
  if (oauthError) return fail(returnTo, oauthError === "access_denied" ? "Google access was not granted." : "Google sign-in failed.", provider);
  const code = url.searchParams.get("code");
  const clientId = (isAdMob && process.env.ADMOB_OAUTH_CLIENT_ID) || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = (isAdMob && process.env.ADMOB_OAUTH_CLIENT_SECRET) || process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = (isAdMob && process.env.ADMOB_OAUTH_REDIRECT_URI) || process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/google-ads/callback`;
  if (!code || !clientId || !clientSecret) return fail(returnTo, "Google sign-in isn't configured on this server.", provider);

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || (!tokens.access_token && !tokens.refresh_token)) {
      console.error(`[oauth] Google token exchange failed (${tokenRes.status}):`, tokens?.error || "no tokens");
      return fail(returnTo, "Google didn't return access. Please try again.", provider);
    }

    const platform = isAdMob ? "FIREBASE_ADMOB" : "GOOGLE_ADS";
    const data: Record<string, unknown> = {
      status: "CONNECTED",
      errorMessage: null,
      scopes: isAdMob ? ADMOB_SCOPES : ADS_SCOPES,
      ...(tokens.access_token ? { accessTokenEncrypted: encryptSecret(tokens.access_token) } : {}),
      ...(tokens.refresh_token ? { refreshTokenEncrypted: encryptSecret(tokens.refresh_token) } : {}),
      ...(tokens.expires_in ? { tokenExpiresAt: new Date(Date.now() + Number(tokens.expires_in) * 1000) } : {})
    };

    if (isAdMob && tokens.access_token) {
      // Name the integration after the first AdMob publisher account the user can access.
      const accounts = await fetch("https://admob.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${tokens.access_token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const first = accounts?.account?.[0];
      const publisherId = first?.publisherId || (first?.name ? String(first.name).replace("accounts/", "") : "");
      if (publisherId) Object.assign(data, { accountId: publisherId, accountName: `AdMob (${publisherId})` });
    }

    const existing = await prisma.integration.findFirst({ where: { workspaceId: session.workspaceId, platform }, select: { id: true } });
    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: data as never });
    } else {
      await prisma.integration.create({
        data: {
          workspaceId: session.workspaceId,
          platform,
          providerKey: isAdMob ? "google_admob" : "google_ads",
          accountName: isAdMob ? "AdMob" : "Google Ads",
          ...data
        } as never
      });
    }
    return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=${provider}`, url.origin));
  } catch (error) {
    console.error("[oauth] Google callback failed:", error);
    return fail(returnTo, "Connecting to Google failed. Please try again.", provider);
  }
}
