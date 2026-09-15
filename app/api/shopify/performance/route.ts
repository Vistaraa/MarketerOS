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
  const accountId = shopifyIntegration?.account || "acme-brand.myshopify.com";

  return NextResponse.json({
    success: true,
    data: {
      account: {
        accountId,
        accountName: shopifyIntegration?.account ? `Shopify (${shopifyIntegration.account})` : "Acme Store · Direct E-commerce",
        status: isConnected ? "Connected" : "Sample Data Mode",
        currency: "USD"
      },
      summary: {
        totalRevenue: 78940.00,
        totalOrders: 942,
        averageOrderValue: 83.80,
        returningCustomerRate: 28.4,
        conversionRate: 3.42,
        topProduct: "Summer Premium Bundle"
      },
      recentOrders: [
        { id: "#1094", customer: "Sarah Jenkins", total: 145.00, items: 3, status: "PAID" },
        { id: "#1093", customer: "Michael Chang", total: 89.00, items: 1, status: "PAID" },
        { id: "#1092", customer: "Emma Watson", total: 210.50, items: 4, status: "PAID" },
        { id: "#1091", customer: "David Miller", total: 65.00, items: 1, status: "PAID" }
      ]
    }
  });
}
