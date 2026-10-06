/**
 * Step 9 billing: 14-day trials, plan limits, the lifecycle (reminders → past due → read-only), signed payments
 * reactivating a workspace, and the fixes to free plan changes and the legacy campaign route.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun } from "./helpers.mjs";

const ts = Date.now();
const TEST_PLAN = `e2e_plan_${ts}`;
after(async () => {
  await cleanupRun(ts);
  await sql(`delete from "Plan" where id = '${TEST_PLAN}'`);
});

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;

async function call(cookie, method, path, body, headers = {}) {
  const res = await fetch(BASE + path, { method, headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json", ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function signup(tag) {
  const res = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `e2e-${ts}-${tag}@example.test`, password: "Passw0rd!e2e", firstName: "Bill", lastName: tag, workspaceName: `Billing ${tag}` }) });
  const json = await res.json();
  assert.equal(res.status, 201, JSON.stringify(json));
  return { cookie: cookieFrom(res), ws: json.data.user.workspaceId, id: json.data.user.userId };
}

const subscription = async (cookie) => (await call(cookie, "GET", "/api/auth/session")).json?.data?.subscription;
/** Moves the period end relative to now (in days); SQL uses UTC like Prisma does. */
const setPeriodEnd = (ws, days, status) => sql(`update "Subscription" set "currentPeriodEnd" = timezone('utc', now()) + interval '${days * 24} hours'${status ? `, status = '${status}'` : ""} where "workspaceId" = '${ws}'`);
const newClient = (cookie, name) => call(cookie, "POST", "/api/v1/clients", { name });

test("setup", async () => {
  await clearIpLimits();
});

test("New workspaces start a 14-day Pro trial (not free Pro forever)", async () => {
  const A = await signup("trial");
  const row = await sql(`select status || '|' || "planSlug" || '|' || complimentary from "Subscription" where "workspaceId" = '${A.ws}'`);
  assert.equal(row, "TRIALING|pro|f");
  const s = await subscription(A.cookie);
  assert.equal(s.state, "trialing");
  assert.equal(s.daysLeft, 14);
  const billing = await call(A.cookie, "GET", "/api/v1/billing");
  assert.equal(billing.json.data.subscription.status, "TRIALING");
  assert.equal(billing.json.data.subscription.access.state, "trialing");
  assert.equal(billing.json.data.subscription.trialEnd, billing.json.data.subscription.currentPeriodEnd);
});

test("Plans can't be changed without paying", async () => {
  const A = await signup("checkout");
  const r = await call(A.cookie, "POST", "/api/v1/billing/checkout", { planId: "enterprise", interval: "yearly" });
  assert.equal(r.status, 402);
  assert.equal(r.json.error.code, "PAYMENT_REQUIRED");
  assert.equal(await sql(`select "planSlug" || '|' || status from "Subscription" where "workspaceId" = '${A.ws}'`), "pro|TRIALING");
});

test("Legacy campaign route: the workspace comes from the session, never the body", async () => {
  const A = await signup("legacy-a");
  const B = await signup("legacy-b");
  const r = await call(A.cookie, "POST", "/api/campaigns", { name: "Cross-tenant attempt", platform: "Google Ads", objective: "SALES", budget: 100, workspaceId: B.ws, createdById: B.id });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.workspaceId, A.ws);
  assert.equal(r.json.createdById, A.id);
  assert.equal(await sql(`select count(*) from "Campaign" where "workspaceId" = '${B.ws}'`), "0");
  assert.equal((await call(A.cookie, "POST", "/api/campaigns", { platform: "Google Ads" })).status, 400, "fields are validated");
});

test("Plan limits: seats, clients and campaigns", async (t) => {
  const A = await signup("limits");
  await sql(`insert into "Plan" (id, name, slug, "maxMembers", "maxClients", "maxCampaigns", "monthlyAICredits", "updatedAt") values ('${TEST_PLAN}', 'E2E Tiny', '${TEST_PLAN}', 2, 1, 1, 100, timezone('utc', now()))`);
  await sql(`update "Subscription" set "planId" = '${TEST_PLAN}', "planSlug" = '${TEST_PLAN}' where "workspaceId" = '${A.ws}'`);

  await t.test("clients", async () => {
    assert.equal((await newClient(A.cookie, "First client")).status, 201);
    const r = await newClient(A.cookie, "Second client");
    assert.equal(r.status, 402);
    assert.equal(r.json.error.code, "PLAN_LIMIT_REACHED");
    assert.equal(r.json.error.resource, "clients");
  });

  await t.test("seats: the owner plus pending invitations count; re-inviting doesn't take another seat", async () => {
    const invite = (tag) => call(A.cookie, "POST", "/api/v1/team", { firstName: "Inv", lastName: tag, email: `e2e-${ts}-${tag}@example.test`, role: "VIEWER" });
    assert.equal((await invite("inv1")).status, 201);
    const second = await invite("inv2");
    assert.equal(second.status, 402);
    assert.equal(second.json.error.code, "PLAN_LIMIT_REACHED");
    assert.notEqual((await invite("inv1")).status, 402);
  });

  await t.test("campaigns, including reopening an archived one", async () => {
    await sql(`insert into "Campaign" (id, "workspaceId", name, platform, objective, type, status, budget, "updatedAt") values ('e2e_c1_${ts}', '${A.ws}', 'Live', 'GOOGLE_ADS', 'SALES', 'SEARCH', 'ACTIVE', 100, timezone('utc', now())), ('e2e_c2_${ts}', '${A.ws}', 'Old', 'GOOGLE_ADS', 'SALES', 'SEARCH', 'ARCHIVED', 100, timezone('utc', now()))`);
    let r = await call(A.cookie, "POST", "/api/v1/campaigns", { name: "One too many", platforms: ["Google Ads"], budget: 100, dailyBudget: 10, objective: "SALES" });
    assert.equal(r.status, 402);
    assert.equal(r.json.error.code, "PLAN_LIMIT_REACHED");
    assert.equal((await call(A.cookie, "POST", "/api/campaigns", { name: "Legacy too", platform: "Google Ads", objective: "SALES", budget: 100 })).status, 402);
    assert.equal((await call(A.cookie, "PATCH", `/api/campaigns/e2e_c2_${ts}`, { status: "ACTIVE" })).status, 402);
    assert.equal((await call(A.cookie, "PATCH", `/api/v1/campaigns/e2e_c2_${ts}`, { status: "ACTIVE" })).status, 402);
    assert.equal((await call(A.cookie, "PATCH", `/api/campaigns/e2e_c1_${ts}`, { status: "PAUSED" })).status, 200, "other status changes still work");
  });

  await t.test("Billing shows the same usage that is enforced", async () => {
    const usage = Object.fromEntries((await call(A.cookie, "GET", "/api/v1/billing")).json.data.usage.map((u) => [u.key, u.used]));
    assert.deepEqual([usage.seats, usage.clients, usage.campaigns], [2, 1, 1]);
  });
});

test("Lifecycle: grace period after the trial, then read-only (reads and billing stay available)", async (t) => {
  const A = await signup("lapse");

  await t.test("trial ended yesterday: past due, still writable", async () => {
    await setPeriodEnd(A.ws, -1);
    const s = await subscription(A.cookie);
    assert.equal(s.state, "past_due");
    assert.equal(s.reason, "trial_ended");
    assert.ok(s.lockAt);
    assert.equal((await newClient(A.cookie, "During grace")).status, 201);
  });

  await t.test("grace period over: writes are refused with 402", async () => {
    await setPeriodEnd(A.ws, -4);
    const s = await subscription(A.cookie);
    assert.equal(s.state, "locked");
    assert.equal(s.locked, true);
    for (const [method, path, body] of [
      ["POST", "/api/v1/clients", { name: "Locked out" }],
      ["POST", "/api/v1/content-studio/templates", { name: "Locked", category: "Social Posts", platforms: ["instagram"] }],
      ["POST", "/api/campaigns", { name: "Locked", platform: "Google Ads", objective: "SALES", budget: 1 }],
      ["POST", "/api/v1/ai/generate", { prompt: "Locked", kind: "content" }]
    ]) {
      const r = await call(A.cookie, method, path, body);
      assert.equal(r.status, 402, `${method} ${path} → ${r.status}`);
      assert.equal(r.json.error.code, "SUBSCRIPTION_INACTIVE");
      assert.doesNotMatch(r.json.error.message, /prisma|stack/i);
    }
  });

  await t.test("reads, notifications and billing still work", async () => {
    assert.equal((await call(A.cookie, "GET", "/api/v1/clients")).status, 200);
    assert.equal((await call(A.cookie, "POST", "/api/v1/notifications/read-all")).status, 200);
    assert.equal((await call(A.cookie, "GET", "/api/v1/billing")).status, 200);
  });

  const key = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT;
  await t.test("a signed PayU payment reactivates the workspace", { skip: key && salt ? false : "PayU merchant key/salt not set for the test run" }, async () => {
    const created = await call(A.cookie, "POST", "/api/v1/billing/payu/create-payment", { type: "subscription", planSlug: "starter", interval: "monthly" });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const p = created.json.data.params;
    // The response hash PayU would send for a successful payment (reverse field order, salt first).
    const hash = crypto.createHash("sha512").update(`${salt}|success||||||${p.udf5}|${p.udf4}|${p.udf3}|${p.udf2}|${p.udf1}|${p.email}|${p.firstname}|${p.productinfo}|${p.amount}|${p.txnid}|${key}`).digest("hex");
    const paid = await call(A.cookie, "POST", "/api/v1/billing/payu/verify-payment", { ...p, status: "success", hash, mihpayid: `e2e${ts}` });
    assert.equal(paid.status, 200, JSON.stringify(paid.json));
    const s = await subscription(A.cookie);
    assert.equal(s.state, "active");
    assert.equal(s.locked, false);
    assert.equal(s.daysLeft >= 28 && s.daysLeft <= 31, true, `daysLeft ${s.daysLeft}`);
    assert.equal(await sql(`select status || '|' || "planSlug" || '|' || complimentary from "Subscription" where "workspaceId" = '${A.ws}'`), "ACTIVE|starter|f");
    assert.equal((await newClient(A.cookie, "Back in business")).status, 201);
  });
});

test("Lifecycle job: reminders, past due and read-only notices are each sent once", async (t) => {
  const CRON_SECRET = process.env.CRON_SECRET;
  const othersDue = Number(await sql(`select count(*) from "BackgroundJob" where status = 'QUEUED' and "runAt" <= timezone('utc', now())`));
  if (!CRON_SECRET || othersDue > 0) {
    t.skip(!CRON_SECRET ? "CRON_SECRET not set for the test run" : `${othersDue} real job(s) already queued in this database; not running them from a test`);
    return;
  }
  const A = await signup("lifecycle");
  const cron = async () => {
    await sql(`delete from "SystemTask" where name = 'billing.lifecycle'`);
    const r = await call(null, "GET", "/api/cron/jobs", undefined, { authorization: `Bearer ${CRON_SECRET}` });
    assert.equal(r.status, 200);
    assert.ok(r.json.data.scheduled.some((s) => s.name === "billing.lifecycle" && s.ok), JSON.stringify(r.json.data.scheduled));
    return r.json.data;
  };
  const state = () => sql(`select status || '|' || coalesce("lastLifecycleNotice", '') from "Subscription" where "workspaceId" = '${A.ws}'`);
  const notices = () => sql(`select count(*) from "Notification" where "workspaceId" = '${A.ws}' and type = 'BILLING'`);

  await setPeriodEnd(A.ws, 5);
  await cron();
  assert.match(await state(), /^TRIALING\|.*:7d$/);
  assert.equal(await notices(), "1");
  await cron();
  assert.equal(await notices(), "1", "the reminder isn't repeated");

  await setPeriodEnd(A.ws, 0.5);
  await cron();
  assert.match(await state(), /^TRIALING\|.*:1d$/);

  await setPeriodEnd(A.ws, -0.1);
  await cron();
  assert.match(await state(), /^PAST_DUE\|.*:expired$/);

  await sql(`update "Subscription" set "currentPeriodEnd" = "currentPeriodEnd" - interval '4 days' where "workspaceId" = '${A.ws}'`);
  await cron();
  assert.match(await state(), /^PAST_DUE\|.*:locked$/);
  assert.equal(await notices(), "4");
  await cron();
  assert.equal(await notices(), "4", "the read-only notice isn't repeated");

  await t.test("the hourly task is claimed once per interval", async () => {
    await cron();
    const again = await call(null, "GET", "/api/cron/jobs", undefined, { authorization: `Bearer ${CRON_SECRET}` });
    assert.equal(again.json.data.scheduled.length, 0);
  });
});
