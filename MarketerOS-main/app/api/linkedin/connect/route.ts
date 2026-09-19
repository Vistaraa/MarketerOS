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
        { error: "LinkedIn Ad Account ID (9-digit) and OAuth Access Token are required." },
        { status: 400 }
      );
    }

    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: "LinkedIn",
      providerKey: "linkedin_ads",
      accountName: accountName?.trim() || `LinkedIn Ads (${accountId})`,
      accountId: accountId.trim(),
      apiKey: accessToken,
      metadata: {
        currency: "USD",
        scope: "r_ads, r_ads_reporting"
      }
    });

    return NextResponse.json({
      success: true,
      data: integration
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect LinkedIn Ads account." },
      { status: 500 }
    );
  }
}
