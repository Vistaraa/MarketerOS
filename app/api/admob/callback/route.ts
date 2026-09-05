import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("[ADMOB_OAUTH] OAuth callback error:", error);
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, url.origin));
  }

  let returnTo = "/integrations";
  let targetWorkspaceId: string | undefined;

  try {
    if (stateParam) {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf-8"));
      if (decoded.returnTo) returnTo = decoded.returnTo;
      if (decoded.workspaceId && decoded.workspaceId !== "default-ws") {
        targetWorkspaceId = decoded.workspaceId;
      }
    }
  } catch (e) {
    console.warn("[ADMOB_OAUTH] Failed to decode state parameter:", e);
  }

  const clientId = process.env.ADMOB_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.ADMOB_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.ADMOB_OAUTH_REDIRECT_URI || `${url.origin}/api/admob/callback`;

  if (code && clientId && clientSecret) {
    try {
      console.log("[ADMOB_OAUTH] 🔄 Exchanging authorization code for tokens...");
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
        "[ADMOB_OAUTH] 🔑 Token Exchange Response:",
        "Has Access Token:",
        Boolean(tokens.access_token),
        "Has Refresh Token:",
        Boolean(tokens.refresh_token)
      );

      if (tokens.access_token || tokens.refresh_token) {
        // Query AdMob accounts to automatically discover the Publisher ID
        let autoPublisherId = "";
        let autoAccountName = "AdMob Publisher";

        try {
          const accountsRes = await fetch("https://admob.googleapis.com/v1/accounts", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`
            }
          });

          if (accountsRes.ok) {
            const accountsData = await accountsRes.json();
            console.log("[ADMOB_OAUTH] 🔍 Accessible AdMob Accounts:", accountsData);
            if (accountsData.account && Array.isArray(accountsData.account) && accountsData.account.length > 0) {
              const firstAcc = accountsData.account[0];
              autoPublisherId = firstAcc.publisherId || (firstAcc.name ? firstAcc.name.replace("accounts/", "") : "");
              autoAccountName = `AdMob (${autoPublisherId})`;
            }
          }
        } catch (accErr) {
          console.warn("[ADMOB_OAUTH] Could not fetch AdMob account details during callback:", accErr);
        }

        // Find target workspace
        if (!targetWorkspaceId) {
          const ws = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
          targetWorkspaceId = ws?.id;
        }

        if (targetWorkspaceId) {
          const updateData: Record<string, unknown> = {
            status: "CONNECTED",
            accountName: autoAccountName,
            accountId: autoPublisherId || undefined,
            lastSyncedAt: new Date(),
            scopes: ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"]
          };
          if (tokens.refresh_token) updateData.refreshTokenEncrypted = encryptSecret(tokens.refresh_token);
          if (tokens.access_token) updateData.accessTokenEncrypted = encryptSecret(tokens.access_token);

          // Update existing or create new
          const existing = await prisma.integration.findFirst({
            where: {
              workspaceId: targetWorkspaceId,
              platform: "FIREBASE_ADMOB"
            }
          });

          if (existing) {
            await prisma.integration.update({
              where: { id: existing.id },
              data: updateData as never
            });
          } else {
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

          console.log("[ADMOB_OAUTH] ✅ AdMob integration and encrypted tokens saved successfully!");
        }
      }
    } catch (e) {
      console.error("[ADMOB_OAUTH] ❌ Token exchange failed:", e);
    }
  }

  return NextResponse.redirect(new URL(`${returnTo}?oauth=success&provider=admob`, url.origin));
}
