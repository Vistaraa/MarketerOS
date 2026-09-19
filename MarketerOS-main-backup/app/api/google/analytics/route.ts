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
  if (!integration || (!integration.oauth && !integration.serviceAccount)) {
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

  try {
    const creds = {
      propertyId: integration.accountId,
      oauth: integration.oauth,
      serviceAccount: integration.serviceAccount,
      measurementSecret: integration.measurementSecret
    };

    // Parallel fetch real-time users + historical traffic overview
    const [realtime, traffic] = await Promise.all([
      getRealtimeActiveUsers(creds).catch((err) => {
        console.warn("[GA4_REALTIME_WARN]", err.message);
        return { activeUsersNow: 0, devices: [], countries: [], topPages: [] };
      }),
      getTrafficReport(creds, { startDate, endDate })
    ]);

    // Update integration lastSyncedAt
    await prisma.integration.update({
      where: { id: integration.integrationId },
      data: { lastSyncedAt: new Date() }
    });

    return NextResponse.json({
      connected: true,
      propertyId: integration.accountId,
      accountName: integration.accountName,
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
