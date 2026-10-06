/**
 * Step 15: LinkedIn Ads. Tokens are verified before anything is saved and daily syncs land in the dashboards.
 * LinkedIn is replaced by a local stub; the app must be started with the stub base URL.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const STUB_PORT = 5077;
const stubbed = (process.env.LINKEDIN_API_BASE_URL || "").includes(`:${STUB_PORT}`);
const skip = stubbed ? false : "the app isn't configured with the channel stub (LINKEDIN_API_BASE_URL)";
const parts = (offset) => { const d = new Date(Date.now() + offset * 86_400_000); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }; };
const seen = [];
let stub;

function startStub() {
  stub = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://127.0.0.1");
      seen.push({ method: req.method, path: url.pathname, rawQuery: req.url.split("?")[1] || "", headers: req.headers, body });
      const send = (status, json) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(json)); };
      const bearer = (req.headers.authorization || "").replace("Bearer ", "");
      // LinkedIn
      if (url.pathname === "/linkedin/rest/adAccounts/50001") return bearer === "li-good-token" ? send(200, { id: 50001, name: "Stub LinkedIn Account", currency: "USD" }) : send(401, { message: "Invalid access token", status: 401 });
      if (url.pathname === "/linkedin/rest/adAnalytics") {
        return send(200, { elements: [
          { dateRange: { start: parts(-2), end: parts(-2) }, impressions: 1500, clicks: 30, costInLocalCurrency: "45.25", externalWebsiteConversions: 2, oneClickLeads: 3 },
          { dateRange: { start: parts(-1), end: parts(-1) }, impressions: 500, clicks: 10, costInLocalCurrency: "14.75", externalWebsiteConversions: 0, oneClickLeads: 1 }
        ] });
      }
      send(404, { message: `stub: no route for ${url.pathname}` });
    });
  });
  return new Promise((resolve) => stub.listen(STUB_PORT, "127.0.0.1", resolve));
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
  const r = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "Passw0rd!e2e", firstName: "Chan", lastName: tag, acceptTerms: true, workspaceName: `Channels ${tag}` }) });
  const json = await r.json();
  assert.equal(r.status, 201, JSON.stringify(json));
  await verifyEmail(email);
  return { cookie: cookieFrom(r), ws: json.data.user.workspaceId };
}
async function cronBlocked() {
  if (!process.env.CRON_SECRET) return "CRON_SECRET not set for the test run";
  const foreign = Number(await sql(`select count(*) from "BackgroundJob" j where status = 'QUEUED' and "runAt" <= timezone('utc', now()) and not exists (select 1 from "Workspace" w join "User" u on u.id = w."ownerId" where w.id = j."workspaceId" and u.email like 'e2e-${ts}-%')`));
  return foreign > 0 ? `${foreign} real job(s) already queued in this database; not running them from a test` : false;
}
async function runCron() {
  await sql(`delete from "SystemTask"`);
  const r = await call(null, "GET", "/api/cron/jobs", undefined, { authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(r.status, 200, r.text);
}

before(async () => { if (stubbed) await startStub(); });
after(async () => { await cleanupRun(ts); if (stub) await new Promise((r) => stub.close(r)); });

test("TikTok and Shopify are no longer part of the product", async () => {
  const A = await signup("removed");
  for (const path of ["/api/tiktok/connect", "/api/shopify/connect", "/api/tiktok/performance", "/api/shopify/performance"]) {
    const r = await call(A.cookie, path.endsWith("connect") ? "POST" : "GET", path, path.endsWith("connect") ? { accountId: "1", accessToken: "x".repeat(20) } : undefined);
    assert.equal(r.status, 404, `${path} → ${r.status}`);
  }
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${A.ws}'`), "0");
});

test("Tokens are verified before anything is saved", { skip }, async () => {
  const A = await signup("verify");
  const li = await call(A.cookie, "POST", "/api/linkedin/connect", { accountId: "50001", accessToken: "li-bad-token" });
  assert.equal(li.status, 422);
  assert.match(li.json.error, /Invalid access token/);
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${A.ws}'`), "0");
});

test("LinkedIn syncs into its dashboard", { skip }, async (t) => {
  const A = await signup("sync");
  const r = await call(A.cookie, "POST", "/api/linkedin/connect", { accountId: "50001", accessToken: "li-good-token" });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.data.accountName, "Stub LinkedIn Account");
  assert.doesNotMatch(r.text, /good-token|Encrypted/, "no credentials in responses");

  const blocked = await cronBlocked();
  if (blocked) return t.skip(blocked);
  await runCron();

  await t.test("LinkedIn: daily rows, leads counted as conversions, Rest.li query format", async () => {
    const perf = await call(A.cookie, "GET", "/api/linkedin/performance?range=last_7_days");
    assert.deepEqual({ spend: perf.json.data.summary.totalSpend, clicks: perf.json.data.summary.clicks, conv: perf.json.data.summary.conversions, days: perf.json.data.dailyTrend.length }, { spend: 60, clicks: 40, conv: 6, days: 2 });
    const q = seen.find((r) => r.path === "/linkedin/rest/adAnalytics");
    assert.match(q.rawQuery, /accounts=List\(urn%3Ali%3AsponsoredAccount%3A50001\)/);
    assert.match(q.rawQuery, /dateRange=\(start:\(year:\d+,month:\d+,day:\d+\),end:/);
    assert.match(q.headers["linkedin-version"], /^\d{6}$/);
  });

  await t.test("Overview counts LinkedIn spend", async () => {
    const overview = await call(A.cookie, "GET", "/api/v1/overview");
    const labels = overview.json.data.platformSpend.map((p) => p.label);
    assert.ok(labels.includes("LinkedIn"), JSON.stringify(labels));
  });
});
