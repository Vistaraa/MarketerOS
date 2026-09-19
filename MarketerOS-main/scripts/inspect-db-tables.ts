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
} catch (err) {}

async function listAllDatabaseTables() {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename ASC;"
    )) as Array<{ tablename: string }>;

    const tableNames = rows.map((r) => r.tablename);
    console.log(`\n🔍 Total tables in PostgreSQL 'public' schema: ${tableNames.length}`);
    console.log(tableNames.join(", "));

    // Models in schema.prisma
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    const schemaModels = (schemaContent.match(/^model\s+([A-Za-z0-9_]+)/gm) || []).map((m) =>
      m.replace(/^model\s+/, "").trim()
    );

    console.log(`\n📋 Models defined in schema.prisma: ${schemaModels.length}`);

    // Find obsolete tables in DB that are not in schema.prisma
    const schemaSet = new Set(schemaModels.map((m) => m.toLowerCase()));
    const obsoleteTables = tableNames.filter(
      (t) => t !== "_prisma_migrations" && !schemaSet.has(t.toLowerCase())
    );

    console.log(`\n⚠️ Obsolete tables in DB (not in schema.prisma): ${obsoleteTables.length}`);
    console.log(obsoleteTables.join(", "));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

listAllDatabaseTables();
