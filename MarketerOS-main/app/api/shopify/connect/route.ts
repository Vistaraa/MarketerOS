import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { connectPersistedIntegrationCredentials } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { accountId, apiKey, accountName } = body;

    if (!accountId || !apiKey) {
      return NextResponse.json(
        { error: "Shopify Store Domain (your-store.myshopify.com) and Admin API Token (shpat_...) are required." },
        { status: 400 }
      );
    }

    const cleanDomain = accountId.toLowerCase().trim().replace(/^https?:\/\//, "");

    const integration = await connectPersistedIntegrationCredentials({
      workspaceId: session.workspaceId,
      platform: "Shopify",
      providerKey: "shopify_store",
      accountName: accountName?.trim() || `Shopify (${cleanDomain})`,
      accountId: cleanDomain,
      apiKey: apiKey.trim(),
      metadata: {
        currency: "USD",
        scopes: "read_orders, read_products, read_analytics"
      }
    });

    return NextResponse.json({
      success: true,
      data: integration
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to connect Shopify store." },
      { status: 500 }
    );
  }
}
