import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { getDecryptedGooglePlayIntegration, ensurePlayConsoleData } from "@/lib/google/play-console";
import { Platform } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const decrypted = await getDecryptedGooglePlayIntegration(workspaceId);

    // Update integration last synced timestamp
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, platform: Platform.GOOGLE_PLAY }
    });

    if (integration) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncFinished: new Date()
        }
      });
    }

    // Refresh Play Console data
    await ensurePlayConsoleData(workspaceId);

    return NextResponse.json({
      success: true,
      message: decrypted
        ? `Live sync completed for ${decrypted.packageName}!`
        : "Google Play Console metrics synced successfully.",
      syncedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to sync Google Play Console." }, { status: 500 });
  }
}
