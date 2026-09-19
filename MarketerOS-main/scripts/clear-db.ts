import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

// Load .env
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const idx = trimmed.indexOf("=");
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (err) {
  console.warn("Could not read .env file:", err);
}

async function clearDatabase() {
  console.log("🧹 Clearing all application records via Prisma models...");

  try {
    // Delete in reverse dependency order
    console.log("  - Deleting Sessions...");
    await prisma.session.deleteMany({});

    console.log("  - Deleting Audit Logs...");
    await prisma.auditLog.deleteMany({});

    console.log("  - Deleting Notifications...");
    await prisma.notification.deleteMany({});

    console.log("  - Deleting AI Insights...");
    await prisma.aIInsight.deleteMany({});

    console.log("  - Deleting AI Requests...");
    await prisma.aIRequest.deleteMany({});

    console.log("  - Deleting Background Jobs...");
    await prisma.backgroundJob.deleteMany({});

    console.log("  - Deleting Billing Webhooks...");
    await prisma.billingWebhookEvent.deleteMany({});

    console.log("  - Deleting Invoices...");
    await prisma.invoice.deleteMany({});

    console.log("  - Deleting Subscriptions...");
    await prisma.subscription.deleteMany({});

    console.log("  - Deleting Reports...");
    await prisma.report.deleteMany({});

    console.log("  - Deleting Automations...");
    await prisma.automation.deleteMany({});

    console.log("  - Deleting Social Posts & Accounts...");
    await prisma.socialPost.deleteMany({});
    await prisma.socialAccount.deleteMany({});

    console.log("  - Deleting Content items...");
    await prisma.content.deleteMany({});

    console.log("  - Deleting Leads...");
    await prisma.lead.deleteMany({});

    console.log("  - Deleting Platform Daily Metrics...");
    await prisma.platformMetricDaily.deleteMany({});

    console.log("  - Deleting Campaign Metrics & Ads & AdGroups...");
    await prisma.campaignMetricDaily.deleteMany({});
    await prisma.ad.deleteMany({});
    await prisma.keyword.deleteMany({});
    await prisma.adGroup.deleteMany({});

    console.log("  - Deleting Campaigns...");
    await prisma.campaign.deleteMany({});

    console.log("  - Deleting Sync Logs & Integrations...");
    await prisma.integrationSyncLog.deleteMany({});
    await prisma.integration.deleteMany({});

    console.log("  - Deleting OAuth States...");
    await prisma.oAuthState.deleteMany({});

    console.log("  - Deleting Clients...");
    await prisma.client.deleteMany({});

    console.log("  - Deleting Workspaces...");
    await prisma.workspace.deleteMany({});

    console.log("  - Deleting Users...");
    await prisma.user.deleteMany({});

    console.log("✨ All tables successfully cleared! Database is 100% fresh and clean.");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
