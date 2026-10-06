/**
 * Liveness and readiness probes, as used by uptime monitors and deploy checks.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { BASE } from "./helpers.mjs";

test("liveness probe is cheap and public", async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test("readiness probe checks the database, migrations and storage", async () => {
  const res = await fetch(`${BASE}/api/health/ready`);
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.equal(body.status, "ready");
  assert.equal(body.checks.database.ok, true);
  assert.equal(typeof body.checks.database.latencyMs, "number");
  assert.equal(body.checks.migrations.ok, true);
  assert.ok(body.checks.migrations.applied >= 2, "baseline + later migrations applied");
  assert.equal(body.checks.migrations.failed, 0);
  assert.equal(body.checks.migrations.pending, 0, "every migration shipped with this build is applied");
  assert.equal(body.checks.storage.ok, true);
  assert.match(body.checks.storage.driver, /^(local|s3)$/);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("readiness probe is public but reveals no internals", async () => {
  const res = await fetch(`${BASE}/api/health/ready`, { headers: { authorization: "Bearer forged" } });
  const text = await res.text();
  assert.doesNotMatch(text, /postgres(ql)?:\/\/|password|localhost:5432|error|stack|prisma/i);
});
