import { prisma } from "./lib/prisma";

async function main() {
  await prisma.integration.updateMany({
    where: { platform: "GOOGLE_ADS" },
    data: {
      status: "CONNECTED",
      accountName: "MarketerOS Manager",
      accountId: "1561291433",
      lastSyncedAt: new Date(),
      errorMessage: null
    }
  });
  console.log("Updated all GOOGLE_ADS integrations to CONNECTED status.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
