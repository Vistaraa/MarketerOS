import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import {
  getDecryptedGoogleIntegration,
  getRealtimeActiveUsers,
  getTrafficReport,
  sendMeasurementEvent
} from "@/lib/google";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.GOOGLE_ANALYTICS);
  const rawIntegration = integration || await prisma.integration.findFirst({
    where: { workspaceId: session.workspaceId, platform: Platform.GOOGLE_ANALYTICS }
  });

  if (!rawIntegration) {
    return NextResponse.json(
      {
        connected: false,
        error: "Google Analytics 4 is not connected. Please connect your Property ID and credentials in Integrations."
      },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate") || "28daysAgo";
  const endDate = url.searchParams.get("endDate") || "today";

  const accountId = integration?.accountId || rawIntegration.accountId || "GA4 Property";
  const accountName = integration?.accountName || rawIntegration.accountName || "Google Analytics";
  const integrationId = integration?.integrationId || ("id" in rawIntegration ? rawIntegration.id : rawIntegration.integrationId);

  try {
    let realtime = { activeUsersNow: 0, devices: [] as any[], countries: [] as any[], topPages: [] as any[] };
    let traffic: any = { totalUsers: 0, sessions: 0, bounceRate: 0, channels: [] as any[], dailyTimeline: [] as any[] };

    if (integration?.oauth || integration?.serviceAccount) {
      const creds = {
        propertyId: accountId,
        oauth: integration.oauth,
        serviceAccount: integration.serviceAccount,
        measurementSecret: integration.measurementSecret
      };

      const [rtRes, trRes] = await Promise.allSettled([
        getRealtimeActiveUsers(creds),
        getTrafficReport(creds, { startDate, endDate })
      ]);

      if (rtRes.status === "fulfilled" && rtRes.value) {
        realtime = rtRes.value;
      }
      if (trRes.status === "fulfilled" && trRes.value) {
        traffic = trRes.value;
      }
    }

    if (!realtime.devices || realtime.devices.length === 0) {
      realtime = {
        activeUsersNow: 0,
        devices: [],
        countries: [],
        topPages: []
      };
    }

    if (!traffic.channels || traffic.channels.length === 0) {
      traffic = {
        totalUsers: 0,
        sessions: 0,
        bounceRate: 0,
        channels: [],
        dailyTimeline: []
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
      propertyId: accountId,
      accountName,
      realtime,
      traffic
    });
  } catch (err: unknown) {
    console.error("[GA4_API_ERROR]", err);
    return NextResponse.json(
      {
        connected: true,
        error: err instanceof Error ? err.message : "Failed to fetch GA4 analytics"
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getDecryptedGoogleIntegration(session.workspaceId, Platform.GOOGLE_ANALYTICS);
  if (!integration) {
    return NextResponse.json({ error: "Google Analytics not connected" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { eventName, clientId = `web-${session.userId.slice(-6)}`, params = {} } = body;

    if (!eventName) {
      return NextResponse.json({ error: "eventName is required." }, { status: 400 });
    }

    const measurementSecret = integration.measurementSecret || (integration.metadata?.measurementSecret as string);
    if (!measurementSecret) {
      return NextResponse.json(
        { error: "Measurement API secret not configured for this GA4 integration." },
        { status: 400 }
      );
    }

    const result = await sendMeasurementEvent(
      integration.accountId,
      measurementSecret,
      {
        clientId,
        userId: session.userId,
        name: eventName,
        params
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Event send failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Event '${eventName}' sent to GA4` });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dispatch GA4 event" },
      { status: 500 }
    );
  }
}
