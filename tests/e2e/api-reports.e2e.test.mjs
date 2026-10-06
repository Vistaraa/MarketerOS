/**
 * Step 14: developer API keys (read-only, scoped, rate-limited, revocable), real report files (PDF + CSV in object
 * storage, authenticated downloads, schedules), password changes that actually change the password, and no
 * password hashes in API responses.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const PASSWORD = "Passw0rd!e2e";
after(() => cleanupRun(ts));

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;
async function call(auth, method, path, body) {
  const headers = { ...(auth?.startsWith?.("mk_live_") ? { authorization: `Bearer ${auth}` } : auth ? { cookie: auth } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) };
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const buf = Buffer.from(await res.arrayBuffer());
  let json = null;
  try { json = JSON.parse(buf.toString()); } catch {}
  return { status: res.status, json, text: buf.toString(), buf, headers: res.headers, cookie: cookieFrom(res) };
}
async function signup(tag) {
  await clearIpLimits();
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await call(null, "POST", "/api/auth/signup", { email, password: PASSWORD, firstName: "Api", lastName: tag, acceptTerms: true, workspaceName: `API ${tag}` });
  assert.equal(r.status, 201, r.text);
  await verifyEmail(email);
  return { email, cookie: r.cookie, ws: r.json.data.user.workspaceId, id: r.json.data.user.userId };
}
const login = async (email, password = PASSWORD) => { await clearIpLimits(); return call(null, "POST", "/api/auth/login", { email, password }); };
async function cronBlocked() {
  if (!process.env.CRON_SECRET) return "CRON_SECRET not set for the test run";
  const foreign = Number(await sql(`select count(*) from "BackgroundJob" j where status = 'QUEUED' and "runAt" <= timezone('utc', now()) and not exists (select 1 from "Workspace" w join "User" u on u.id = w."ownerId" where w.id = j."workspaceId" and u.email like 'e2e-${ts}-%')`));
  return foreign > 0 ? `${foreign} real job(s) already queued in this database; not running them from a test` : false;
}
async function runCron() {
  await sql(`delete from "SystemTask"`);
  const res = await fetch(`${BASE}/api/cron/jobs`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  assert.equal(res.status, 200);
  return (await res.json()).data;
}

test("Changing the password really changes it and signs out other devices", async () => {
  const A = await signup("pw");
  const other = await login(A.email);
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/change-password", { currentPassword: "wrong-password", newPassword: "N3wPassw0rd!" })).status, 403);
  const changed = await call(A.cookie, "POST", "/api/v1/settings/change-password", { currentPassword: PASSWORD, newPassword: "N3wPassw0rd!" });
  assert.equal(changed.status, 200, changed.text);
  assert.equal(changed.json.data.signedOutSessions, 1);
  assert.equal((await call(other.cookie, "GET", "/api/v1/clients")).status, 401, "other device signed out");
  assert.equal((await call(A.cookie, "GET", "/api/v1/clients")).status, 200, "this device stays signed in");
  assert.equal((await login(A.email)).status, 401, "old password no longer works");
  assert.equal((await login(A.email, "N3wPassw0rd!")).status, 200);
});

test("Developer API keys", async (t) => {
  const A = await signup("keys");
  const B = await signup("keys-other");
  await call(A.cookie, "POST", "/api/v1/clients", { name: `Key client ${ts}` });
  await call(B.cookie, "POST", "/api/v1/clients", { name: `Other client ${ts}` });

  const created = await call(A.cookie, "POST", "/api/v1/settings/api-keys", { name: "Looker" });
  assert.equal(created.status, 201, created.text);
  const { secret, key } = created.json.data;
  assert.match(secret, /^mk_live_[A-Za-z0-9]{40}$/);
  const listed = await call(A.cookie, "GET", "/api/v1/settings/api-keys");
  assert.equal(listed.json.data.items[0].prefix, secret.slice(0, 14));
  assert.doesNotMatch(listed.text, new RegExp(secret.slice(14)), "the secret is never shown again");
  assert.equal(await sql(`select count(*) from "ApiKey" where "keyHash" = '${secret}'`), "0", "only a hash is stored");

  await t.test("reads its own workspace's data", async () => {
    const r = await call(secret, "GET", "/api/v1/clients");
    assert.equal(r.status, 200, r.text);
    const names = r.json.data.items.map((c) => c.name);
    assert.ok(names.includes(`Key client ${ts}`));
    assert.ok(!names.includes(`Other client ${ts}`));
    assert.notEqual(await sql(`select coalesce("lastUsedAt"::text, '') from "ApiKey" where id = '${key.id}'`), "");
  });

  await t.test("is read-only and kept away from account, billing and auth endpoints", async () => {
    assert.equal((await call(secret, "POST", "/api/v1/clients", { name: "nope" })).json.error.code, "API_KEY_READ_ONLY");
    assert.equal((await call(secret, "DELETE", "/api/v1/clients/x")).status, 403);
    for (const path of ["/api/v1/settings/api-keys", "/api/v1/settings", "/api/v1/billing", "/api/v1/settings/export"]) {
      assert.equal((await call(secret, "GET", path)).status, 403, path);
    }
    assert.equal((await call(secret, "GET", "/api/auth/session")).status, 403);
    assert.equal((await call(secret, "GET", "/api/campaigns")).status, 403, "only /api/v1");
  });

  await t.test("is rate limited per key", async () => {
    // RateLimit timestamps are written with the database's now() by lib/rate-limit.ts, so seed them the same way.
    await sql(`insert into "RateLimit" (key, count, "windowStart") values ('apikey:${key.id}', 300, now()) on conflict (key) do update set count = 300, "windowStart" = now()`);
    const r = await call(secret, "GET", "/api/v1/clients");
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get("retry-after")) > 0);
    await sql(`delete from "RateLimit" where key = 'apikey:${key.id}'`);
  });

  await t.test("only owners and admins manage keys; revoking stops it at once", async () => {
    const M = await signup("keys-viewer");
    await sql(`insert into "OAuthState" (id, "workspaceId", "userId", "providerKey", "returnTo", "expiresAt") values ('e2e_kv_${ts}', '${A.ws}', '${M.id}', 'WORKSPACE_MEMBER', 'VIEWER', timezone('utc', now()) + interval '1 day')`);
    const viewer = await login(M.email);
    assert.equal((await call(viewer.cookie, "POST", "/api/v1/settings/api-keys", { name: "x" })).status, 403);
    assert.equal((await call(A.cookie, "DELETE", `/api/v1/settings/api-keys/${key.id}`)).status, 200);
    assert.equal((await call(secret, "GET", "/api/v1/clients")).status, 401);
  });
});

test("Reports: real PDF and CSV files, private downloads, schedules", async (t) => {
  const A = await signup("reports");
  const B = await signup("reports-other");
  await sql(`insert into "Campaign" (id, "workspaceId", "createdById", name, platform, objective, type, status, budget, spend, clicks, conversions, roas, "updatedAt") values ('e2e_rc_${ts}', '${A.ws}', '${A.id}', '=1+1 Report campaign', 'GOOGLE_ADS', 'SALES', 'SEARCH', 'ACTIVE', 500, 321, 40, 4, 2.5, timezone('utc', now()))`);
  const created = await call(A.cookie, "POST", "/api/v1/reports", { name: "Monthly summary", dateRange: "last_30_days", schedule: "weekly" });
  assert.equal(created.status, 202, created.text);
  const reportId = created.json.data.id;
  const days = (new Date(created.json.data.nextRunAt) - Date.now()) / 86_400_000;
  assert.ok(days > 6.9 && days <= 7, "weekly schedule starts in a week");
  assert.equal((await call(A.cookie, "POST", "/api/v1/reports", { name: "Bad", schedule: "hourly" })).status, 400);

  await t.test("report data never includes password hashes or other private account fields", async () => {
    for (const path of ["/api/v1/reports", `/api/v1/reports/${reportId}`]) {
      const r = await call(A.cookie, "GET", path);
      assert.doesNotMatch(r.text, /passwordHash|\$2[aby]\$|deletionScheduledAt|lastLoginAt/, path);
      assert.match(r.text, /"firstName":"Api"/, "the author's name is still shown");
    }
  });

  await t.test("schedules can be changed and turned off", async () => {
    assert.equal((await call(A.cookie, "PATCH", `/api/v1/reports/${reportId}`, { schedule: "monthly" })).json.data.schedule, "monthly");
    assert.equal((await call(A.cookie, "PATCH", `/api/v1/reports/${reportId}`, { schedule: "none" })).json.data.nextRunAt, null);
  });

  const blocked = await cronBlocked();
  await t.test("generated files download only for the workspace", { skip: blocked }, async () => {
    await runCron();
    const report = await call(A.cookie, "GET", `/api/v1/reports/${reportId}`);
    assert.equal(report.json.data.status, "READY");
    assert.doesNotMatch(report.text, /data:text/, "no data: URLs stored in the database");
    const pdf = await call(A.cookie, "GET", `/api/v1/reports/${reportId}/download?format=pdf`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    assert.equal(pdf.buf.subarray(0, 5).toString(), "%PDF-");
    const csv = await call(A.cookie, "GET", `/api/v1/reports/${reportId}/download?format=csv`);
    assert.match(csv.headers.get("content-disposition"), /attachment; filename="Monthly-summary.csv"/);
    assert.match(csv.text, /"'=1\+1 Report campaign"/, "formula-looking names are neutralized");
    assert.equal((await call(B.cookie, "GET", `/api/v1/reports/${reportId}/download?format=pdf`)).status, 404);
  });

  await t.test("a due scheduled report is regenerated and moved to its next run", { skip: blocked }, async () => {
    await call(A.cookie, "PATCH", `/api/v1/reports/${reportId}`, { schedule: "weekly" });
    await sql(`update "Report" set "nextRunAt" = timezone('utc', now()) - interval '1 hour', status = 'READY' where id = '${reportId}'`);
    await runCron(); // queues it
    await runCron(); // generates it
    const days = Number(await sql(`select extract(epoch from ("nextRunAt" - timezone('utc', now()))) / 86400 from "Report" where id = '${reportId}'`));
    assert.ok(days > 6 && days < 7, `next run in ${days} days`);
    assert.equal(await sql(`select count(*) from "BackgroundJob" where "workspaceId" = '${A.ws}' and name = 'report.generate' and payload->>'scheduled' = 'true' and status = 'COMPLETED'`), "1");
  });

  await t.test("deleting a report deletes its files", { skip: blocked }, async () => {
    assert.equal((await call(A.cookie, "DELETE", `/api/v1/reports/${reportId}`)).status, 200);
    assert.equal((await call(A.cookie, "GET", `/api/v1/reports/${reportId}/download?format=pdf`)).status, 404);
  });
});
