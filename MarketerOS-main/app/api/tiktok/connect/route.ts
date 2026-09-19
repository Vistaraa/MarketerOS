import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { connectPersistedIntegrationCredentials } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { accountId, accessToken, accountName } = body;

    if (!accountId || !accessToken) {
      return NextResponse.json(
        { error: "TikTok Advertiser ID (19-digit) and Access Token are required." },
        { status: 400 }
      );
    }

    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: "TikTok",
      providerKey: "tiktok_ads",
      accountName: accountName?.trim() || `TikTok Ads (${accountId})`,
      accountId: accountId.trim(),
      apiKey: accessToken,
      metadata: {
        currency: "USD",
        appScope: "ads.read, ads.manage"
      }
    });

    return NextResponse.json({
      success: true,
      data: integration
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect TikTok Ads account." },
      { status: 500 }
    );
  }
}
