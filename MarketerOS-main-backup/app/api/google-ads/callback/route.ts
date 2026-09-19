import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request: Request) {
  console.log("\n=======================================================");
  console.log("[OAUTH_CALLBACK] 🔄 Processing incoming Google OAuth callback...");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("[OAUTH_CALLBACK] ❌ Google OAuth Error returned:", error);
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, url.origin));
  }

  let returnTo = "/integrations";
  let providerKey = "google_ads";
  let targetWorkspaceId: string | undefined;

  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
      if (decoded.returnTo) returnTo = decoded.returnTo;
      if (decoded.providerKey) providerKey = decoded.providerKey;
      if (decoded.workspaceId && decoded.workspaceId !== "default-ws") {
        targetWorkspaceId = decoded.workspaceId;
      }
    }
  } catch (e) {
    console.warn("[OAUTH_CALLBACK] Warning: Could not decode state parameter:", e);
  }

  console.log(`[OAUTH_CALLBACK] 🎯 Provider Target: ${providerKey.toUpperCase()}`);
  console.log(`[OAUTH_CALLBACK] 🔑 Authorization Code: ${code ? code.slice(0, 15) + "..." : "NONE"}`);

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/google-ads/callback`;

  if (code && clientId && clientSecret) {
    try {
      console.log(`[OAUTH_CALLBACK] 📡 Exchanging code for access & refresh tokens at Google Token Endpoint...`);
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
      console.log(
        `[OAUTH_CALLBACK] 🔑 Tokens Received -> Access Token: ${Boolean(tokens.access_token)} | Refresh Token: ${Boolean(tokens.refresh_token)}`
      );

      if (tokens.access_token || tokens.refresh_token) {
        if (!targetWorkspaceId) {
          const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
          targetWorkspaceId = ws?.id;
        }

        if (providerKey === "admob") {
          console.log("[ADMOB_OAUTH] 🔍 Querying AdMob API (https://admob.googleapis.com/v1/accounts)...");
          let autoPublisherId = "";
          let autoAccountName = "AdMob Publisher";

          try {
            const accountsRes = await fetch("https://admob.googleapis.com/v1/accounts", {
              headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            if (accountsRes.ok) {
              const accountsData = await accountsRes.json();
              console.log("[ADMOB_OAUTH] 🏢 Accessible AdMob Accounts:", JSON.stringify(accountsData, null, 2));
              if (accountsData.account && Array.isArray(accountsData.account) && accountsData.account.length > 0) {
                const firstAcc = accountsData.account[0];
                autoPublisherId = firstAcc.publisherId || (firstAcc.name ? firstAcc.name.replace("accounts/", "") : "");
                autoAccountName = `AdMob (${autoPublisherId})`;
              }
            } else {
              const errBody = await accountsRes.text();
              console.warn(`[ADMOB_OAUTH] AdMob accounts lookup returned ${accountsRes.status}:`, errBody.slice(0, 150));
            }
          } catch (accErr) {
            console.warn("[ADMOB_OAUTH] Could not query AdMob accounts during callback:", accErr);
          }

          const updateData: Record<string, unknown> = {
            status: "CONNECTED",
            accountName: autoAccountName,
            accountId: autoPublisherId || "pub-pending",
            lastSyncedAt: new Date(),
            scopes: ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"]
          };
          if (tokens.refresh_token) updateData.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
          if (tokens.access_token) updateData.accessTokenEncrypted = encryptSecret(tokens.access_token);

          await prisma.integration.updateMany({
            where: { platform: "FIREBASE_ADMOB" },
            data: updateData as never
          });

          if (targetWorkspaceId) {
            const existing = await prisma.integration.findFirst({
              where: { workspaceId: targetWorkspaceId, platform: "FIREBASE_ADMOB" }
            });
            if (!existing) {
              await prisma.integration.create({
                data: {
                  workspaceId: targetWorkspaceId,
                  platform: "FIREBASE_ADMOB",
                  providerKey: "google_admob",
                  accountName: autoAccountName,
                  accountId: autoPublisherId || "pub-pending",
                  status: "CONNECTED",
                  lastSyncedAt: new Date(),
                  scopes: ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"],
                  ...updateData
                } as never
              });
            }
          }

          console.log("[ADMOB_OAUTH] ✅ Encrypted OAuth tokens saved for AdMob successfully!");
          console.log("=======================================================\n");
          return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=admob`, url.origin));
        } else {
          // Google Ads flow
          const updateData: Record<string, unknown> = {
            status: "CONNECTED",
            lastSyncedAt: new Date(),
            scopes: ["https://www.googleapis.com/auth/adwords"]
          };
          if (tokens.refresh_token) updateData.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
          if (tokens.access_token) updateData.accessTokenEncrypted = encryptSecret(tokens.access_token);

          await prisma.integration.updateMany({
            where: { platform: "GOOGLE_ADS" },
            data: updateData as never
          });

          console.log("[GOOGLE_ADS_OAUTH] ✅ Encrypted OAuth tokens saved for Google Ads successfully!");
          console.log("=======================================================\n");
          return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=google_ads`, url.origin));
        }
      }
    } catch (e) {
      console.error("[OAUTH_CALLBACK] ❌ Token exchange failed:", e);
    }
  }

  console.log("=======================================================\n");
  return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=${providerKey}`, url.origin));
}
