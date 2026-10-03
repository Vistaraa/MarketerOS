import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import {
  getDecryptedGoogleIntegration,
  getSearchPerformance,
  listVerifiedSites
} from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.GOOGLE_SEARCH_CONSOLE);
  const rawIntegration = integration || await prisma.integration.findFirst({
    where: { workspaceId: session.workspaceId, platform: Platform.GOOGLE_SEARCH_CONSOLE }
  });

  if (!rawIntegration) {
    return NextResponse.json(
      {
        connected: false,
        error: "Google Search Console is not connected. Please connect your site URL and credentials in Integrations."
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  const listSites = url.searchParams.get("listSites") === "true";

  const accountId = integration?.accountId || rawIntegration.accountId || "Search Console Property";
  const accountName = integration?.accountName || rawIntegration.accountName || "Google Search Console";
  const integrationId = integration?.integrationId || ("id" in rawIntegration ? rawIntegration.id : rawIntegration.integrationId);

  try {
    let performance: any = null;
    if (integration?.oauth || integration?.serviceAccount) {
      const creds = {
        siteUrl: accountId,
        oauth: integration.oauth,
        serviceAccount: integration.serviceAccount
      };

      if (listSites) {
        const sites = await listVerifiedSites(creds).catch(() => []);
        return NextResponse.json({ sites });
      }

      performance = await getSearchPerformance(creds, {
        startDate,
        endDate,
        rowLimit: 30
      }).catch((err) => {
        console.warn("[GSC_FETCH_WARN]", err.message);
        return null;
      });
    }

    if (!performance || !performance.topQueries) {
      performance = {
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        topQueries: []
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
      siteUrl: accountId,
      accountName,
      performance
    });
  } catch (err: unknown) {
    console.error("[GSC_API_ERROR]", err);
    return NextResponse.json(
      {
        connected: true,
        error: err instanceof Error ? err.message : "Failed to fetch Search Console metrics"
      },
      { status: 500 }
    );
  }
}
