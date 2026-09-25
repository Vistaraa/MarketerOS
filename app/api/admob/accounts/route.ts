import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export async function GET() {
  console.log("\n=======================================================");
  console.log("[ADMOB_API] 📡 Fetching accessible AdMob accounts from Google API...");

  try {
    const workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: "desc" } });
    let liveAccounts: Array<{
      publisherId: string;
      descriptiveName: string;
      currencyCode: string;
      reportingTimeZone: string;
      resourceName: string;
    }> = [];

    if (workspace) {
      const integration = await prisma.integration.findFirst({
        where: {
          platform: "FIREBASE_ADMOB",
          accessTokenEncrypted: { not: null }
        },
        orderBy: { updatedAt: "desc" }
      });

      if (integration?.accessTokenEncrypted) {
        try {
          const accessToken = decryptSecret(integration.accessTokenEncrypted);
          console.log("[ADMOB_API] 🔑 Querying https://admob.googleapis.com/v1/accounts...");
          const res = await fetch("https://admob.googleapis.com/v1/accounts", {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            console.log("[ADMOB_API] 📥 Live AdMob API Response:", JSON.stringify(data, null, 2));
            if (data.account && Array.isArray(data.account)) {
              liveAccounts = data.account.map((acc: { publisherId?: string; name?: string; currencyCode?: string; reportingTimeZone?: string }) => {
                const rawPubId = acc.publisherId || (acc.name ? acc.name.replace("accounts/", "") : "pub-unknown");
                return {
                  publisherId: rawPubId,
                  descriptiveName: `AdMob Publisher (${rawPubId})`,
                  currencyCode: acc.currencyCode || "USD",
                  reportingTimeZone: acc.reportingTimeZone || "America/New_York",
                  resourceName: acc.name || `accounts/${rawPubId}`
                };
              });
            }
          } else {
            console.warn(`[ADMOB_API] ⚠️ Live API returned status ${res.status}:`, await res.text());
          }
        } catch (err) {
          console.warn("[ADMOB_API] ❌ Could not query live AdMob accounts:", err);
        }
      }
    }

    const resultAccounts = liveAccounts;
    console.log(`[ADMOB_API] ✅ Accounts provided to client (${resultAccounts.length} total, isLive: ${liveAccounts.length > 0})`);
    console.log("=======================================================\n");

    return NextResponse.json({
      success: true,
      data: resultAccounts,
      total: resultAccounts.length,
      isLive: liveAccounts.length > 0
    });
  } catch (error) {
    console.error("[ADMOB_API] 💥 Error in accounts route:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch AdMob accounts" },
      { status: 500 }
    );
  }
}
