import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { connectPersistedIntegrationCredentials } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { accountId, accessToken, accountName, pixelId } = body;

    if (!accountId || !accessToken) {
      return NextResponse.json(
        { error: "Ad Account ID (act_...) and Access Token (EAA...) are required." },
        { status: 400 }
      );
    }

    const formattedAccountId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

    // Verify token against Meta Graph API
    let metaProfile: any = null;
    let isRealToken = false;

    try {
      const verifyRes = await fetch(
        `https://graph.facebook.com/v19.0/${formattedAccountId}?fields=name,account_id,currency,timezone_name&access_token=${accessToken}`,
        { cache: "no-store" }
      );
      if (verifyRes.ok) {
        metaProfile = await verifyRes.json();
        isRealToken = true;
      }
    } catch {
      // Offline fallback verification
    }

    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: "Meta Ads",
      providerKey: "meta_ads",
      accountName: accountName?.trim() || metaProfile?.name || `Meta Ads (${formattedAccountId})`,
      accountId: formattedAccountId,
      apiKey: accessToken,
      metadata: {
        currency: metaProfile?.currency || "USD",
        timezone: metaProfile?.timezone_name || "America/New_York",
        pixelId: pixelId || null,
        isLiveVerified: isRealToken
      }
    });

    return NextResponse.json({
      success: true,
      data: integration,
      isLiveVerified: isRealToken
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect Meta Ads account." },
      { status: 500 }
    );
  }
}
