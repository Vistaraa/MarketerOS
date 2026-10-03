import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { getSession } = await import("@/lib/auth-server");
    const { getDecryptedGoogleIntegration, fetchGoogleAccessToken } = await import("@/lib/google");
    const { Platform } = await import("@prisma/client");

    const session = await getSession().catch(() => null);
    const workspace = session?.workspaceId
      ? { id: session.workspaceId }
      : await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });

    let liveAccounts: Array<{
      customerId: string;
      descriptiveName: string;
      currencyCode: string;
      timeZone: string;
      isManager: boolean;
      resourceName: string;
    }> = [];

    if (workspace) {
      const integration = await getDecryptedGoogleIntegration(workspace.id, Platform.GOOGLE_ADS);
      const devToken = integration?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

      if (integration?.oauth && devToken) {
        try {
          const tokenRes = await fetchGoogleAccessToken({
            clientId: integration.oauth.clientId,
            clientSecret: integration.oauth.clientSecret,
            refreshToken: integration.oauth.refreshToken
          });

          if (tokenRes.success && tokenRes.accessToken) {
            const googleRes = await fetch("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", {
              headers: {
                "Authorization": `Bearer ${tokenRes.accessToken}`,
                "developer-token": devToken
              }
            });

            if (googleRes.ok) {
              const data = await googleRes.json();
              if (data.resourceNames && Array.isArray(data.resourceNames)) {
                liveAccounts = data.resourceNames.map((resName: string) => {
                  const rawId = resName.replace("customers/", "");
                  const formattedId = rawId.length === 10
                    ? `${rawId.slice(0, 3)}-${rawId.slice(3, 6)}-${rawId.slice(6)}`
                    : rawId;
                  return {
                    customerId: formattedId,
                    descriptiveName: `Google Ads Account (${formattedId})`,
                    currencyCode: "USD",
                    timeZone: "UTC",
                    isManager: false,
                    resourceName: resName
                  };
                });
              }
            }
          }
        } catch (e) {
          console.warn("Live Google Ads account fetch attempt:", e);
        }
      }
    }

    const resultAccounts = liveAccounts;

    return NextResponse.json({
      success: true,
      data: resultAccounts,
      total: resultAccounts.length,
      isLive: liveAccounts.length > 0
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch accessible accounts" },
      { status: 500 }
    );
  }
}
