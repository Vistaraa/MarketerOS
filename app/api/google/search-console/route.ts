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
  if (!integration || (!integration.oauth && !integration.serviceAccount)) {
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

  const creds = {
    siteUrl: integration.accountId,
    oauth: integration.oauth,
    serviceAccount: integration.serviceAccount
  };

  try {
    if (listSites) {
      const sites = await listVerifiedSites(creds);
      return NextResponse.json({ sites });
    }

    const performance = await getSearchPerformance(creds, {
      startDate,
      endDate,
      rowLimit: 30
    });

    await prisma.integration.update({
      where: { id: integration.integrationId },
      data: { lastSyncedAt: new Date() }
    });

    return NextResponse.json({
      connected: true,
      siteUrl: integration.accountId,
      accountName: integration.accountName,
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
