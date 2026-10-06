/**
 * CI dependency gate: fails on any high or critical advisory in production dependencies, except entries in
 * ALLOWLIST. Each allowed advisory names why it can't be fixed yet and an expiry date, after which it fails again.
 * Usage: node scripts/audit-gate.mjs
 */
import { execFileSync } from "node:child_process";

// Add an entry only when an advisory can't be fixed yet, e.g.
// { package: "name", reason: "why it is not exploitable here / what blocks the fix", expires: "YYYY-MM-DD" }
const ALLOWLIST = [];

let report;
try {
  report = JSON.parse(execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
} catch (error) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = JSON.parse(error.stdout || "{}");
}
if (!report.vulnerabilities) {
  console.error("npm audit returned no report:", report.error?.summary || report);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const failures = [];
for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
  if (vuln.severity !== "high" && vuln.severity !== "critical") continue;
  const allowed = ALLOWLIST.find((a) => a.package === name);
  if (allowed && allowed.expires >= today) {
    console.warn(`allowed until ${allowed.expires}: ${name} (${vuln.severity}) - ${allowed.reason}`);
    continue;
  }
  failures.push(`${name} (${vuln.severity})${allowed ? ` - allowlist entry expired ${allowed.expires}` : ""}`);
}
const counts = report.metadata?.vulnerabilities || {};
console.log(`production dependencies: ${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.moderate || 0} moderate, ${counts.low || 0} low`);
if (failures.length) {
  console.error(`High/critical advisories must be fixed (npm audit fix, or upgrade):\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
