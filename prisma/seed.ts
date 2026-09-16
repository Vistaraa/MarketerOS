import { ensureSystemBootstrapped } from "../lib/bootstrap";
import { prisma } from "../lib/prisma";

/**
 * Production Baseline Verifier.
 * Ensures essential system plans are verified without seeding any dummy/mock data.
 */
async function main() {
  await ensureSystemBootstrapped();
  console.log("MarketerOS: Production baseline verified. Zero dummy data seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
