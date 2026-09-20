import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: error?.message || "Failed to save KPI preferences." }, { status: 500 });
  }
}
