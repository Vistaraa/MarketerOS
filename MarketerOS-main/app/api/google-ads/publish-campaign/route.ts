import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { publishCampaignToGoogleAds } from "@/lib/google-ads-mutate";

export async function POST(request: Request) {
  try {
    const session = await getSession().catch(() => null);
    let workspaceId = session?.workspaceId;

    if (!workspaceId) {
      const firstWs = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
      workspaceId = firstWs?.id;
    }

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 400 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "campaignId is required" }, { status: 400 });
    }

    const result = await publishCampaignToGoogleAds(campaignId, workspaceId);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to publish campaign" },
      { status: 500 }
    );
  }
}
