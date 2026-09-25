import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { listPersistedIntegrations } from "@/lib/repositories";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const integrations = await listPersistedIntegrations(session.workspaceId);
  const shopifyIntegration = integrations.find(
    (i) => i.providerKey === "shopify_store" || i.platform.toLowerCase().includes("shopify")
  );

  const isConnected = shopifyIntegration?.status === "Connected";
  const accountId = shopifyIntegration?.account || "";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: shopifyIntegration?.account ? `Shopify (${shopifyIntegration.account})` : "Shopify Store",
        status: isConnected ? "Connected" : "Not Connected",
        currency: "USD"
      },
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        returningCustomerRate: 0,
        conversionRate: 0,
        topProduct: "—"
      },
      recentOrders: []
    }
  });
}
