import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { publishCampaignToGoogleAds } from "@/lib/google-ads-mutate";

export async function POST(request: Request) {
  try {
    const session = await getSession().catch(() => null);
    if (!session) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    const workspaceId = session.workspaceId;

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
