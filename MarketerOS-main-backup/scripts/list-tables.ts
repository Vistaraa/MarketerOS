import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

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

async function listDbTables() {
  // Let's count how many models Prisma schema defines
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");
  const schemaModels = (schemaContent.match(/^model\s+([A-Za-z0-9_]+)/gm) || []).map((m) =>
    m.replace(/^model\s+/, "").trim()
  );

  console.log(`\n📋 Models in prisma/schema.prisma: ${schemaModels.length}`);
  console.log(schemaModels.join(", "));
}

listDbTables();
