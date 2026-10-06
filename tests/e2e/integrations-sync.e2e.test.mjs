/**
 * Step 12 integrations: Meta Ads connect (verified tokens only, long-lived exchange), scheduled daily syncs for
 * Meta Ads and Google Ads (token refresh, paging), failure reporting, token-expiry warnings, and dashboards/overview
 * built from synced metrics. Meta and Google are replaced by a local stub server; the app under test must be started
 * with the stub base URLs (see .github/workflows/ci.yml), otherwise these tests skip.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const PASSWORD = "Passw0rd!e2e";
const STUB_PORT = 5077;
const stubbed = (process.env.META_GRAPH_BASE_URL || "").includes(`:${STUB_PORT}`) && (process.env.GOOGLE_ADS_API_BASE_URL || "").includes(`:${STUB_PORT}`);
const skip = stubbed ? false : "the app isn't configured with the provider stub (META_GRAPH_BASE_URL / GOOGLE_ADS_API_BASE_URL)";

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const seen = [];
let stub;

/** Minimal stand-ins for the Meta Graph API and Google's OAuth token + Ads endpoints. */
function startStub() {
  stub = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, `http://127.0.0.1:${STUB_PORT}`);
      seen.push({ method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), auth: req.headers.authorization, devToken: req.headers["developer-token"], loginCustomer: req.headers["login-customer-id"], body });
      const send = (status, json) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(json)); };
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      if (url.pathname.endsWith("/oauth/access_token") && url.searchParams.get("grant_type") === "fb_exchange_token") return send(200, { access_token: `EAALONG${url.searchParams.get("fb_exchange_token").slice(-6)}`, expires_in: 5_184_000 });
      const insights = /\/meta\/v[\d.]+\/(act_\d+)\/insights$/.exec(url.pathname);
      if (insights) {
        if (insights[1] === "act_999") return send(400, { error: { message: "(#100) The ad account is disabled." } });
        if (url.searchParams.get("after") === "p2") return send(200, { data: [{ date_start: day(-1), impressions: "300", clicks: "30", spend: "30.00", actions: [{ action_type: "purchase", value: "3" }], action_values: [{ action_type: "purchase", value: "90" }] }] });
        return send(200, {
          data: [
            { date_start: day(-3), impressions: "1000", clicks: "50", spend: "100.50", actions: [{ action_type: "lead", value: "4" }] },
            { date_start: day(-2), impressions: "2000", clicks: "70", spend: "120.00", actions: [{ action_type: "purchase", value: "5" }], action_values: [{ action_type: "purchase", value: "400" }] }
          ],
          // Like Meta, the next-page URL carries the token as a query parameter.
          paging: { next: `http://127.0.0.1:${STUB_PORT}${url.pathname}?after=p2&access_token=${token}` }
        });
      }
      const account = /\/meta\/v[\d.]+\/(act_\d+)$/.exec(url.pathname);
      if (account) return token.startsWith("EAAgood") ? send(200, { id: account[1], name: "Stub Shoes Ads", currency: "INR", timezone_name: "Asia/Kolkata", account_status: 1 }) : send(400, { error: { message: "Invalid OAuth access token." } });
      if (url.pathname === "/google/token") return new URLSearchParams(body).get("refresh_token") === "refresh-good" ? send(200, { access_token: "ya29.fresh", expires_in: 3599 }) : send(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." });
      if (/\/gads\/v\d+\/customers\/1234567890\/googleAds:searchStream$/.test(url.pathname)) {
        return send(200, [{ results: [
          { segments: { date: day(-2) }, metrics: { impressions: "5000", clicks: "250", conversions: 12.4, costMicros: "75500000", conversionsValue: 600 } },
          { segments: { date: day(-1) }, metrics: { impressions: "4000", clicks: "150", conversions: 7.6, costMicros: "24500000", conversionsValue: 200 } }
        ] }]);
      }
      send(404, { error: { message: `stub: no route for ${url.pathname}` } });
    });
  });
  return new Promise((resolve) => stub.listen(STUB_PORT, "127.0.0.1", resolve));
}

/** Same format as lib/crypto.ts encryptSecret, so the server can decrypt what the test stores. */
function encrypt(value) {
  const configured = process.env.ENCRYPTION_KEY;
  const key = configured && /^[a-f0-9]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : createHash("sha256").update(configured || "marketeros-secret-encryption-key-seed-2026").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;
async function call(cookie, method, path, body, headers = {}) {
  const res = await fetch(BASE + path, { method, headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json", ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
async function signup(tag) {
  await clearIpLimits();
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD, firstName: "Sync", lastName: tag, acceptTerms: true, workspaceName: `Sync ${tag}` }) });
  const json = await r.json();
  assert.equal(r.status, 201, JSON.stringify(json));
  await verifyEmail(email);
  return { email, cookie: cookieFrom(r), ws: json.data.user.workspaceId, id: json.data.user.userId };
}

async function cronBlocked(ownWorkspaces) {
  if (!process.env.CRON_SECRET) return "CRON_SECRET not set for the test run";
  // Jobs queued by this run's own workspaces are fine to run; anything else belongs to real users.
  const foreign = Number(await sql(`select count(*) from "BackgroundJob" j where status = 'QUEUED' and "runAt" <= timezone('utc', now()) and not exists (select 1 from "Workspace" w join "User" u on u.id = w."ownerId" where w.id = j."workspaceId" and u.email like 'e2e-${ts}-%')`));
  return foreign > 0 ? `${foreign} real job(s) already queued in this database; not running them from a test` : false;
}
async function runCron() {
  await sql(`delete from "SystemTask"`);
  const r = await call(null, "GET", "/api/cron/jobs", undefined, { authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(r.status, 200, r.text);
  return r.json.data;
}

before(async () => { if (stubbed) await startStub(); });
after(async () => { await cleanupRun(ts); if (stub) await new Promise((r) => stub.close(r)); });

test("Meta Ads: only verified tokens connect; they're exchanged for long-lived tokens and never exposed", { skip }, async () => {
  const A = await signup("meta");
  const bad = await call(A.cookie, "POST", "/api/meta-ads/connect", { accountId: "1111", accessToken: "EAAbadtoken-000000000000" });
  assert.equal(bad.status, 422);
  assert.match(bad.json.error, /Invalid OAuth access token/);
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${A.ws}'`), "0", "nothing saved for a rejected token");

  const good = await call(A.cookie, "POST", "/api/meta-ads/connect", { accountId: "1111", accessToken: "EAAgoodtoken-0000123456" });
  assert.equal(good.status, 200, good.text);
  assert.equal(good.json.data.accountName, "Stub Shoes Ads");
  assert.doesNotMatch(good.text, /Encrypted|EAALONG|EAAgood/, "no credentials in the response");
  const expiresInDays = (new Date(good.json.data.tokenExpiresAt) - Date.now()) / 86_400_000;
  assert.ok(expiresInDays > 59 && expiresInDays < 61, `long-lived token (${expiresInDays} days)`);
  assert.ok(seen.filter((r) => r.path.startsWith("/meta")).every((r) => !r.query.access_token || r.query.grant_type), "tokens go in headers, not URLs");
  assert.equal(await sql(`select count(*) from "BackgroundJob" where "workspaceId" = '${A.ws}' and name = 'integration.sync' and status = 'QUEUED'`), "1", "first sync queued");
});

test("Dashboards and overview use synced metrics, without double counting or estimates", async () => {
  const A = await signup("metrics");
  await sql(`insert into "PlatformMetricDaily" (id, "workspaceId", platform, date, impressions, clicks, conversions, spend, revenue, "updatedAt") values
    ('e2e_m1_${ts}', '${A.ws}', 'META_ADS', '${day(-2)}', 1000, 50, 5, 100, 300, timezone('utc', now())),
    ('e2e_m2_${ts}', '${A.ws}', 'META_ADS', '${day(-1)}', 3000, 150, 15, 300, 900, timezone('utc', now()))`);
  // A Meta campaign with its own lifetime totals: the synced metrics must win, not be added to it.
  await sql(`insert into "Campaign" (id, "workspaceId", "createdById", name, platform, objective, type, status, budget, spend, clicks, conversions, "updatedAt") values ('e2e_mc_${ts}', '${A.ws}', '${A.id}', 'Meta campaign', 'META_ADS', 'SALES', 'SOCIAL', 'ACTIVE', 1000, 999, 999, 99, timezone('utc', now()))`);
  const perf = await call(A.cookie, "GET", "/api/meta-ads/performance?range=last_7_days");
  assert.equal(perf.status, 200);
  assert.deepEqual(
    { spend: perf.json.data.summary.totalSpend, clicks: perf.json.data.summary.clicks, conv: perf.json.data.summary.conversions, roas: perf.json.data.summary.roas, ctr: perf.json.data.summary.ctr, days: perf.json.data.dailyTrend.length },
    { spend: 400, clicks: 200, conv: 20, roas: 3, ctr: 5, days: 2 }
  );
  const overview = await call(A.cookie, "GET", "/api/v1/overview");
  const spend = overview.json.data.platformSpend.find((p) => p.label === "Meta Ads");
  assert.equal(spend?.value, 400, JSON.stringify(overview.json.data.platformSpend));
});

test("Scheduled sync pipeline (cron)", { skip }, async (t) => {
  const M = await signup("sched-meta");
  const G = await signup("sched-google");
  const F = await signup("sched-fail");
  const blocked = await cronBlocked([M.ws, G.ws, F.ws]);
  if (blocked) return t.skip(blocked);

  await call(M.cookie, "POST", "/api/meta-ads/connect", { accountId: "2222", accessToken: "EAAgoodtoken-0000222222" });
  await sql(`insert into "Integration" (id, "workspaceId", platform, "providerKey", "accountName", "accountId", "refreshTokenEncrypted", "accessTokenEncrypted", "tokenExpiresAt", metadata, status, "updatedAt") values ('e2e_g_${ts}', '${G.ws}', 'GOOGLE_ADS', 'google_ads', 'Stub Google Ads', '123-456-7890', '${encrypt("refresh-good")}', '${encrypt("ya29.expired")}', timezone('utc', now()) - interval '1 hour', '{"loginCustomerId":"9876543210"}', 'CONNECTED', timezone('utc', now()))`);
  await call(F.cookie, "POST", "/api/meta-ads/connect", { accountId: "999", accessToken: "EAAgoodtoken-0000999999" });
  await sql(`update "BackgroundJob" set "maxAttempts" = 1 where "workspaceId" = '${F.ws}'`);

  const first = await runCron();
  assert.ok(first.scheduled.some((s) => s.name === "integrations.schedule" && s.ok && s.result.queued >= 1), JSON.stringify(first.scheduled));
  // Jobs queued by the scheduler run on the next batch.
  await runCron();

  await t.test("Meta: daily rows from every page, tokens kept out of URLs", async () => {
    const rows = await sql(`select to_char(date, 'YYYY-MM-DD') || ':' || spend || ':' || conversions from "PlatformMetricDaily" where "workspaceId" = '${M.ws}' order by date`);
    assert.equal(rows, [`${day(-3)}:100.50:4`, `${day(-2)}:120.00:5`, `${day(-1)}:30.00:3`].join("\n"));
    const insights = seen.filter((r) => r.path.endsWith("act_2222/insights"));
    assert.equal(insights[0].query.time_increment, "1");
    assert.ok(insights.every((r) => !r.query.access_token && r.auth === "Bearer EAALONG222222"), "long-lived token sent as a header on every page");
    assert.notEqual(await sql(`select coalesce("lastSyncedAt"::text, '') from "Integration" where "workspaceId" = '${M.ws}'`), "");
  });

  await t.test("Google Ads: refreshes the expired access token and uses the manager account", async () => {
    const rows = await sql(`select to_char(date, 'YYYY-MM-DD') || ':' || spend || ':' || clicks from "PlatformMetricDaily" where "workspaceId" = '${G.ws}' order by date`);
    assert.equal(rows, [`${day(-2)}:75.50:250`, `${day(-1)}:24.50:150`].join("\n"));
    const ads = seen.find((r) => r.path.endsWith("googleAds:searchStream"));
    assert.equal(ads.auth, "Bearer ya29.fresh");
    assert.equal(ads.devToken, process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
    assert.equal(ads.loginCustomer, "9876543210");
    assert.match(JSON.parse(ads.body).query, /FROM customer WHERE segments.date BETWEEN/);
    const perf = await call(G.cookie, "GET", "/api/google-ads/performance?range=last_7_days");
    assert.equal(perf.json.data.summary.totalSpend, 100);
    assert.equal(perf.json.data.summary.conversions, 20);
  });

  await t.test("a failing account is marked for attention with the provider's reason", async () => {
    assert.equal(await sql(`select status || '|' || "errorMessage" from "Integration" where "workspaceId" = '${F.ws}'`), "ERROR|(#100) The ad account is disabled.");
    assert.equal(await sql(`select l.status from "IntegrationSyncLog" l join "Integration" i on i.id = l."integrationId" where i."workspaceId" = '${F.ws}' order by l."startedAt" desc limit 1`), "FAILED");
  });

  await t.test("synced accounts aren't queued again until a day has passed", async () => {
    const again = await runCron();
    const sched = again.scheduled.find((s) => s.name === "integrations.schedule");
    const mine = Number(await sql(`select count(*) from "BackgroundJob" where name = 'integration.sync' and status = 'QUEUED' and "workspaceId" in ('${M.ws}', '${G.ws}')`));
    assert.equal(mine, 0, JSON.stringify(sched));
    await sql(`update "Integration" set "lastSyncFinished" = timezone('utc', now()) - interval '25 hours' where "workspaceId" = '${M.ws}'`);
    await runCron();
    // The connect queued the first sync; the scheduler adds one once a day has passed.
    assert.equal(await sql(`select count(*) from "BackgroundJob" where name = 'integration.sync' and "workspaceId" = '${M.ws}' and payload->>'scheduled' = 'true'`), "1");
  });

  await t.test("owners are warned once before a token expires", async () => {
    await sql(`update "Integration" set "tokenExpiresAt" = timezone('utc', now()) + interval '3 days' where "workspaceId" = '${M.ws}'`);
    await runCron();
    await runCron();
    assert.equal(await sql(`select count(*) from "Notification" where "workspaceId" = '${M.ws}' and type = 'INTEGRATION'`), "1");
  });
});
