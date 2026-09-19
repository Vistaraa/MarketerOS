import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import {
  getDecryptedGoogleIntegration,
  getAdMobNetworkReport,
  listAdMobApps
} from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.FIREBASE_ADMOB);
  if (!integration || (!integration.oauth && !integration.serviceAccount)) {
    return NextResponse.json(
      {
        connected: false,
        error: "AdMob & Firebase is not connected. Please connect your Publisher ID and credentials in Integrations."
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  const appsOnly = url.searchParams.get("appsOnly") === "true";

  const creds = {
    publisherId: integration.accountId,
    oauth: integration.oauth,
    serviceAccount: integration.serviceAccount
  };

  try {
    if (appsOnly) {
      const apps = await listAdMobApps(creds);
      return NextResponse.json({ apps });
    }

    const report = await getAdMobNetworkReport(creds, {
      startDate,
      endDate
    });

    await prisma.integration.update({
      where: { id: integration.integrationId },
      data: { lastSyncedAt: new Date() }
    });

    return NextResponse.json({
      connected: true,
      publisherId: integration.accountId,
      accountName: integration.accountName,
      report
    });
  } catch (err: unknown) {
    console.error("[ADMOB_API_ERROR]", err);
    return NextResponse.json(
      {
        connected: true,
        error: err instanceof Error ? err.message : "Failed to fetch AdMob network report"
      },
      { status: 500 }
    );
  }
}
