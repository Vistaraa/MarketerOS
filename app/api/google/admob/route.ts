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
  const rawIntegration = integration || await prisma.integration.findFirst({
    where: { workspaceId: session.workspaceId, platform: Platform.FIREBASE_ADMOB }
  });

  if (!rawIntegration) {
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

  const accountId = integration?.accountId || rawIntegration.accountId || "AdMob Publisher";
  const accountName = integration?.accountName || rawIntegration.accountName || "Firebase & AdMob";
  const integrationId = integration?.integrationId || ("id" in rawIntegration ? rawIntegration.id : rawIntegration.integrationId);

  try {
    let report: any = null;
    if (integration?.oauth || integration?.serviceAccount) {
      const creds = {
        publisherId: accountId,
        oauth: integration.oauth,
        serviceAccount: integration.serviceAccount
      };

      if (appsOnly) {
        const apps = await listAdMobApps(creds).catch(() => []);
        return NextResponse.json({ apps });
      }

      report = await getAdMobNetworkReport(creds, {
        startDate,
        endDate
      }).catch((err) => {
        console.warn("[ADMOB_FETCH_WARN]", err.message);
        return null;
      });
    }

    if (!report || !report.apps) {
      report = {
        totalEarningsDollars: 0,
        totalImpressions: 0,
        averageRpm: 0,
        apps: []
      };
    }

    if (integrationId) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncedAt: new Date() }
      }).catch(() => {});
    }

    return NextResponse.json({
      connected: true,
      publisherId: accountId,
      accountName,
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
