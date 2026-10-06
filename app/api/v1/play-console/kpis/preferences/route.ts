import { NextResponse } from "next/server";
import { logServerError } from "@/lib/errors";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = session;
    const body = await request.json();
    const { pinnedKpis, kpiOrder } = body;

    const updated = await prisma.userKpiPreference.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        pinnedKpis: pinnedKpis || ["total_audience", "store_visitors", "conversion_rate", "crashes_anrs", "daily_active"],
        kpiOrder: kpiOrder || ["total_audience", "store_visitors", "conversion_rate", "crashes_anrs", "daily_active"]
      },
      update: {
        pinnedKpis: pinnedKpis || undefined,
        kpiOrder: kpiOrder || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: "KPI preferences saved successfully.",
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: logServerError("v1/play-console/kpis/preferences", "Failed to save KPI preferences.", error) }, { status: 500 });
  }
}
