import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";

export async function POST(request: Request) {
  console.log("\n=======================================================");
  console.log("[ADMOB_API] 💾 Saving AdMob account connection...");

  try {
    const body = await request.json();
    const { publisherId, accountName } = body;

    console.log("[ADMOB_API] 📝 Requested Publisher ID:", publisherId);
    console.log("[ADMOB_API] 📝 Account Name:", accountName);

    if (!publisherId) {
      console.error("[ADMOB_API] ❌ Error: Publisher ID missing");
      return NextResponse.json(
        { success: false, error: "Publisher ID is required (pub-XXXXXXXXXXXXXXXX)." },
        { status: 400 }
      );
    }

    const session = await getSession().catch(() => null);
    let workspaceId = session?.workspaceId;

    if (!workspaceId) {
      const firstWs = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
      workspaceId = firstWs?.id;
    }

    if (!workspaceId) {
      const user = await prisma.user.findFirst();
      const newWs = await prisma.workspace.create({
        data: {
          name: "Default Workspace",
          slug: `workspace-${Date.now()}`,
          ownerId: user?.id || "admin"
        }
      });
      workspaceId = newWs.id;
    }

    const cleanPublisherId = publisherId.trim();

    const existing = await prisma.integration.findFirst({
      where: {
        workspaceId,
        platform: "FIREBASE_ADMOB"
      }
    });

    const tokenSource = await prisma.integration.findFirst({
      where: {
        platform: "FIREBASE_ADMOB",
        OR: [
          { accessTokenEncrypted: { not: null } },
          { refreshTokenEncrypted: { not: null } }
        ]
      },
      orderBy: { updatedAt: "desc" }
    });

    let integration;
    if (existing) {
      integration = await prisma.integration.update({
        where: { id: existing.id },
        data: {
          accountName: accountName || `AdMob (${cleanPublisherId})`,
          accountId: cleanPublisherId,
          status: "CONNECTED",
          lastSyncedAt: new Date(),
          errorMessage: null,
          scopes: ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"],
          ...(tokenSource?.accessTokenEncrypted ? { accessTokenEncrypted: tokenSource.accessTokenEncrypted } : {}),
          ...(tokenSource?.refreshTokenEncrypted ? { refreshTokenEncrypted: tokenSource.refreshTokenEncrypted } : {})
        }
      });
    } else {
      integration = await prisma.integration.create({
        data: {
          workspaceId,
          platform: "FIREBASE_ADMOB",
          providerKey: "google_admob",
          accountName: accountName || `AdMob (${cleanPublisherId})`,
          accountId: cleanPublisherId,
          status: "CONNECTED",
          lastSyncedAt: new Date(),
          scopes: ["https://www.googleapis.com/auth/admob.readonly", "https://www.googleapis.com/auth/admob.report"],
          ...(tokenSource?.accessTokenEncrypted ? { accessTokenEncrypted: tokenSource.accessTokenEncrypted } : {}),
          ...(tokenSource?.refreshTokenEncrypted ? { refreshTokenEncrypted: tokenSource.refreshTokenEncrypted } : {})
        }
      });
    }

    // Synchronize across workspaces
    await prisma.integration.updateMany({
      where: { platform: "FIREBASE_ADMOB" },
      data: {
        accountName: accountName || `AdMob (${cleanPublisherId})`,
        accountId: cleanPublisherId,
        status: "CONNECTED",
        lastSyncedAt: new Date(),
        errorMessage: null
      }
    });

    console.log(`[ADMOB_API] ✅ AdMob integration successfully connected & synchronized! (ID: ${cleanPublisherId})`);
    console.log("=======================================================\n");

    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        accountName: integration.accountName,
        publisherId: integration.accountId,
        status: "Connected",
        lastSyncedAt: integration.lastSyncedAt
      }
    });
  } catch (error) {
    console.error("[ADMOB_API] 💥 Error saving connection:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save AdMob connection" },
      { status: 500 }
    );
  }
}
