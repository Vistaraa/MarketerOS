import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import {
  testGoogleAdsConnection,
  testAnalyticsConnection,
  testSearchConsoleConnection,
  testAdMobConnection,
  encryptCredentialFields,
  formatCustomerId
} from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await prisma.integration.findMany({
    where: {
      workspaceId: session.workspaceId,
      platform: {
        in: [
          Platform.GOOGLE_ADS,
          Platform.GOOGLE_ANALYTICS,
          Platform.GOOGLE_SEARCH_CONSOLE,
          Platform.FIREBASE_ADMOB
        ]
      }
    },
    select: {
      id: true,
      platform: true,
      accountName: true,
      accountId: true,
      status: true,
      lastSyncedAt: true,
      errorMessage: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ integrations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { platform, accountName, accountId, credentials, testOnly } = body;

    if (!platform || !accountId) {
      return NextResponse.json(
        { error: "Platform and Account ID / Property ID / Site URL are required." },
        { status: 400 }
      );
    }

    let validationResult: { success: boolean; message: string; error?: string } = {
      success: false,
      message: "Unsupported platform"
    };

    // 1. Live Validation against Google Servers with User BYOK Credentials
    if (platform === "GOOGLE_ADS") {
      const { developerToken, clientId, clientSecret, refreshToken, loginCustomerId } = credentials || {};
      if (!developerToken || !clientId || !clientSecret || !refreshToken) {
        return NextResponse.json(
          { error: "Google Ads requires Developer Token, Client ID, Client Secret, and Refresh Token." },
          { status: 400 }
        );
      }

      validationResult = await testGoogleAdsConnection({
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
        customerId: formatCustomerId(accountId),
        loginCustomerId: loginCustomerId ? formatCustomerId(loginCustomerId) : undefined
      });
    } else if (platform === "GOOGLE_ANALYTICS") {
      const { clientId, clientSecret, refreshToken, serviceAccountJson, measurementSecret } = credentials || {};
      let serviceAccount;
      if (serviceAccountJson) {
        try {
          serviceAccount = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        } catch {
          return NextResponse.json({ error: "Invalid Service Account JSON format." }, { status: 400 });
        }
      }

      const oauth = clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;

      if (!serviceAccount && !oauth) {
        return NextResponse.json(
          { error: "GA4 requires either Service Account JSON or OAuth2 credentials (Client ID, Secret, Refresh Token)." },
          { status: 400 }
        );
      }

      validationResult = await testAnalyticsConnection({
        propertyId: accountId,
        oauth,
        serviceAccount,
        measurementSecret
      });
    } else if (platform === "GOOGLE_SEARCH_CONSOLE") {
      const { clientId, clientSecret, refreshToken, serviceAccountJson } = credentials || {};
      let serviceAccount;
      if (serviceAccountJson) {
        try {
          serviceAccount = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        } catch {
          return NextResponse.json({ error: "Invalid Service Account JSON format." }, { status: 400 });
        }
      }

      const oauth = clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;

      if (!serviceAccount && !oauth) {
        return NextResponse.json(
          { error: "Search Console requires either Service Account JSON or OAuth2 credentials." },
          { status: 400 }
        );
      }

      validationResult = await testSearchConsoleConnection({
        siteUrl: accountId,
        oauth,
        serviceAccount
      });
    } else if (platform === "FIREBASE_ADMOB") {
      const { clientId, clientSecret, refreshToken, serviceAccountJson } = credentials || {};
      let serviceAccount;
      if (serviceAccountJson) {
        try {
          serviceAccount = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        } catch {
          return NextResponse.json({ error: "Invalid Service Account JSON format." }, { status: 400 });
        }
      }

      const oauth = clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;

      if (!serviceAccount && !oauth) {
        return NextResponse.json(
          { error: "AdMob requires either Service Account JSON or OAuth2 credentials." },
          { status: 400 }
        );
      }

      validationResult = await testAdMobConnection({
        publisherId: accountId,
        oauth,
        serviceAccount
      });
    }

    // If connection test failed, return error to user immediately
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: validationResult.error || validationResult.message || "Connection test failed",
          details: validationResult
        },
        { status: 400 }
      );
    }

    // If user clicked "Test Connection" only, return success without saving
    if (testOnly) {
      return NextResponse.json({
        success: true,
        message: validationResult.message,
        validated: true
      });
    }

    // 2. Encrypt Sensitive Credentials (AES-256-GCM)
    const { apiKeyEncrypted, accessTokenEncrypted, refreshTokenEncrypted, metadataEncrypted } = encryptCredentialFields({
      developerToken: credentials.developerToken,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      refreshToken: credentials.refreshToken,
      serviceAccountJson: credentials.serviceAccountJson
        ? typeof credentials.serviceAccountJson === "string"
          ? credentials.serviceAccountJson
          : JSON.stringify(credentials.serviceAccountJson)
        : undefined,
      measurementSecret: credentials.measurementSecret
    });

    const platformEnum = platform as Platform;

    // Check if an existing integration exists for this workspace & platform
    const existing = await prisma.integration.findFirst({
      where: {
        workspaceId: session.workspaceId,
        platform: platformEnum
      }
    });

    const metaPayload: Record<string, unknown> = {
      ...metadataEncrypted,
      loginCustomerId: credentials.loginCustomerId || undefined,
      verifiedAt: new Date().toISOString()
    };

    let integration;
    if (existing) {
      integration = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          accountName: accountName || existing.accountName || `${platform} Account`,
          accountId,
          apiKeyEncrypted: apiKeyEncrypted || existing.apiKeyEncrypted,
          accessTokenEncrypted: accessTokenEncrypted || existing.accessTokenEncrypted,
          refreshTokenEncrypted: refreshTokenEncrypted || existing.refreshTokenEncrypted,
          status: "CONNECTED",
          errorMessage: null,
          errorCount: 0,
          lastSyncedAt: new Date(),
          metadata: metaPayload as never
        }
      });
    } else {
      integration = await prisma.integration.create({
        data: {
          workspaceId: session.workspaceId,
          platform: platformEnum,
          accountName: accountName || `${platform} Account`,
          accountId,
          apiKeyEncrypted: apiKeyEncrypted || "",
          accessTokenEncrypted: accessTokenEncrypted || null,
          refreshTokenEncrypted: refreshTokenEncrypted || null,
          status: "CONNECTED",
          lastSyncedAt: new Date(),
          metadata: metaPayload as never
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: validationResult.message,
      integration: {
        id: integration.id,
        platform: integration.platform,
        accountName: integration.accountName,
        accountId: integration.accountId,
        status: integration.status,
        lastSyncedAt: integration.lastSyncedAt
      }
    });
  } catch (err: unknown) {
    console.error("[GOOGLE_CONNECT_ERROR]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error connecting integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") as Platform;
  const id = url.searchParams.get("id");

  if (!platform && !id) {
    return NextResponse.json({ error: "Platform or ID parameter required." }, { status: 400 });
  }

  await prisma.integration.deleteMany({
    where: {
      workspaceId: session.workspaceId,
      ...(id ? { id } : {}),
      ...(platform ? { platform } : {})
    }
  });

  return NextResponse.json({ success: true, message: "Integration removed successfully." });
}
