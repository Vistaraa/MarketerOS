/**
 * Removes data that earlier versions of MarketerOS fabricated instead of importing:
 *   - Play Console KPI snapshots, releases and inbox messages (no importer for real ones has ever existed)
 *   - The placeholder Play Console apps the KPI generator created ("MarketerOS Mobile" / "Client Mobile App")
 *   - Session rows the Settings page inserted with fake token hashes ("sess_...")
 *
 * Dry run by default; pass --apply to delete. Usage: npx tsx scripts/purge-synthetic-data.ts [--apply]
 */
import { prisma } from "../lib/prisma";

const apply = process.argv.includes("--apply");

const placeholderApps = {
  OR: [
    { packageName: "com.marketeros.app", appTitle: "MarketerOS Mobile" },
    { packageName: { startsWith: "com.client." }, appTitle: "Client Mobile App" }
  ]
};
// Real session token hashes are 64-character hex SHA-256 digests; fabricated ones start with "sess_".
const fakeSessions = { tokenHash: { startsWith: "sess_" } };

async function main() {
  const counts = {
    playConsoleKpiDaily: await prisma.playConsoleKpiDaily.count(),
    playConsoleRelease: await prisma.playConsoleRelease.count(),
    playConsoleInboxMessage: await prisma.playConsoleInboxMessage.count(),
    placeholderPlayConsoleApps: await prisma.playConsoleApp.count({ where: placeholderApps }),
    fakeSessions: await prisma.session.count({ where: fakeSessions })
  };
  console.table(counts);

  if (!apply) {
    console.log("Dry run: nothing was deleted. Re-run with --apply to delete these rows.");
    return;
  }

  await prisma.$transaction([
    prisma.playConsoleKpiDaily.deleteMany({}),
    prisma.playConsoleRelease.deleteMany({}),
    prisma.playConsoleInboxMessage.deleteMany({}),
    prisma.playConsoleApp.deleteMany({ where: placeholderApps }),
    prisma.session.deleteMany({ where: fakeSessions })
  ]);
  console.log("Deleted all rows listed above.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
