import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { encryptCredentialFields } from "@/lib/google/client";
import { testGooglePlayConnection } from "@/lib/google/play-console";
import { Platform, IntegrationStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountLabel,
      packageName,
      authMethod,
      serviceAccountJson,
      clientId,
      clientSecret,
      refreshToken,
      targetClientId
    } = body;

    if (!packageName) {
      return NextResponse.json({ error: "Package Name is required." }, { status: 400 });
    }

    let serviceAccount;
    if (authMethod === "service_account" && serviceAccountJson) {
      try {
        serviceAccount = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
      } catch {
        return NextResponse.json({ error: "Invalid Service Account JSON format." }, { status: 400 });
      }
    }

    const oauth = clientId && clientSecret && refreshToken
      ? { clientId, clientSecret, refreshToken }
      : undefined;

    // Test live connection before saving credentials
    const testResult = await testGooglePlayConnection({
      packageName,
      appTitle: accountLabel || packageName,
      serviceAccount,
      oauth
    });

    if (!testResult.success) {
      return NextResponse.json({ error: testResult.message }, { status: 400 });
    }

    // Encrypt secrets at rest (AES-256-GCM)
    const { refreshTokenEncrypted, metadataEncrypted } = encryptCredentialFields({
      clientId,
      clientSecret,
      refreshToken,
      serviceAccountJson: serviceAccount ? JSON.stringify(serviceAccount) : undefined
    });

    const accountName = accountLabel || packageName;

    // Upsert integration record
    const integration = await prisma.integration.upsert({
      where: {
        workspaceId_platform_accountId: {
          workspaceId: session.workspaceId,
          platform: Platform.GOOGLE_PLAY,
          accountId: packageName
        }
      },
      create: {
        workspaceId: session.workspaceId,
        clientId: targetClientId || null,
        platform: Platform.GOOGLE_PLAY,
        accountName,
        accountId: packageName,
        status: IntegrationStatus.CONNECTED,
        refreshTokenEncrypted,
        lastSyncedAt: new Date(),
        metadata: {
          packageName,
          appTitle: accountName,
          authMethod,
          ...metadataEncrypted
        }
      },
      update: {
        accountName,
        clientId: targetClientId || null,
        status: IntegrationStatus.CONNECTED,
        refreshTokenEncrypted,
        errorMessage: null,
        errorCount: 0,
        lastSyncedAt: new Date(),
        metadata: {
          packageName,
          appTitle: accountName,
          authMethod,
          ...metadataEncrypted
        }
      }
    });

    // Create or update PlayConsoleApp
    await prisma.playConsoleApp.upsert({
      where: {
        workspaceId_packageName: {
          workspaceId: session.workspaceId,
          packageName
        }
      },
      create: {
        workspaceId: session.workspaceId,
        clientId: targetClientId || null,
        integrationId: integration.id,
        packageName,
        appTitle: accountName,
        isPrimary: true
      },
      update: {
        integrationId: integration.id,
        clientId: targetClientId || null,
        appTitle: accountName
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully connected Google Play Console for ${packageName}`,
      data: integration
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save Google Play integration." }, { status: 500 });
  }
}
