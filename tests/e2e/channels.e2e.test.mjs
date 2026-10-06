/**
 * Step 15: LinkedIn Ads, TikTok Ads and Shopify. Tokens are verified before anything is saved, the Shopify domain
 * can't point anywhere but *.myshopify.com, and daily syncs land in the dashboards (Shopify sales stay out of the
 * advertising totals). The platforms are replaced by a local stub; the app must be started with the stub base URLs.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const STUB_PORT = 5077;
const stubbed = ["LINKEDIN_API_BASE_URL", "TIKTOK_API_BASE_URL", "SHOPIFY_API_BASE_URL"].every((n) => (process.env[n] || "").includes(`:${STUB_PORT}`));
const skip = stubbed ? false : "the app isn't configured with the channel stub (LINKEDIN_API_BASE_URL etc.)";
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const parts = (offset) => { const d = new Date(Date.now() + offset * 86_400_000); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }; };
const SHOP = `e2e-${ts}.myshopify.com`;
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
      // TikTok (errors come back as HTTP 200 with a non-zero code)
      if (url.pathname === "/tiktok/open_api/v1.3/advertiser/info/") {
        return req.headers["access-token"] === "tt-good-token" ? send(200, { code: 0, data: { list: [{ advertiser_id: "7000000000000000001", name: "Stub TikTok", currency: "USD", timezone: "Etc/GMT" }] } }) : send(200, { code: 40105, message: "The access token is invalid or has been revoked." });
      }
      if (url.pathname === "/tiktok/open_api/v1.3/report/integrated/get/") {
        return send(200, { code: 0, data: { page_info: { total_page: 1 }, list: [
          { dimensions: { stat_time_day: `${day(-1)} 00:00:00` }, metrics: { spend: "80.40", impressions: "9000", clicks: "120", conversion: "6" } }
        ] } });
      }
      // Shopify
      if (url.pathname === `/shopify/${SHOP}/admin/api/2026-04/shop.json`) return req.headers["x-shopify-access-token"] === "shpat_good" ? send(200, { shop: { name: "Stub Store", currency: "INR", iana_timezone: "Asia/Kolkata" } }) : send(401, { errors: "[API] Invalid API key or access token (unrecognized login or wrong password)" });
      if (url.pathname === `/shopify/${SHOP}/admin/api/2026-04/graphql.json`) {
        const after = JSON.parse(body).variables.after;
        const order = (d, amount, extra = {}) => ({ node: { createdAt: `${day(d)}T10:00:00Z`, cancelledAt: null, test: false, totalPriceSet: { shopMoney: { amount } }, ...extra } });
        return after
          ? send(200, { data: { orders: { edges: [order(-1, "250.00")], pageInfo: { hasNextPage: false, endCursor: null } } } })
          : send(200, { data: { orders: { edges: [order(-2, "100.00"), order(-2, "50.50"), order(-2, "999.00", { cancelledAt: `${day(-2)}T11:00:00Z` }), order(-1, "5.00", { test: true })], pageInfo: { hasNextPage: true, endCursor: "c1" } } } });
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

test("The Shopify domain can only be a real *.myshopify.com store", async () => {
  const A = await signup("ssrf");
  for (const domain of ["169.254.169.254", "localhost:5432", "evil.example.com", "acme.myshopify.com.evil.com", "http://127.0.0.1/admin"]) {
    const r = await call(A.cookie, "POST", "/api/shopify/connect", { accountId: domain, apiKey: "shpat_good" });
    assert.equal(r.status, 400, `${domain} → ${r.status}`);
    assert.match(r.json.error, /myshopify\.com/);
  }
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${A.ws}'`), "0");
});

test("Tokens are verified before anything is saved", { skip }, async () => {
  const A = await signup("verify");
  const li = await call(A.cookie, "POST", "/api/linkedin/connect", { accountId: "50001", accessToken: "li-bad-token" });
  assert.equal(li.status, 422);
  assert.match(li.json.error, /Invalid access token/);
  const tt = await call(A.cookie, "POST", "/api/tiktok/connect", { accountId: "7000000000000000001", accessToken: "tt-bad-token" });
  assert.equal(tt.status, 422, "TikTok's HTTP 200 error responses are still errors");
  assert.match(tt.json.error, /revoked/);
  const sh = await call(A.cookie, "POST", "/api/shopify/connect", { accountId: SHOP, apiKey: "shpat_bad" });
  assert.equal(sh.status, 422);
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${A.ws}'`), "0");
});

test("LinkedIn, TikTok and Shopify sync into their dashboards", { skip }, async (t) => {
  const A = await signup("sync");
  for (const [path, body, name] of [
    ["/api/linkedin/connect", { accountId: "50001", accessToken: "li-good-token" }, "Stub LinkedIn Account"],
    ["/api/tiktok/connect", { accountId: "7000000000000000001", accessToken: "tt-good-token" }, "Stub TikTok"],
    ["/api/shopify/connect", { accountId: `https://${SHOP.toUpperCase()}/`, apiKey: "shpat_good" }, "Stub Store"]
  ]) {
    const r = await call(A.cookie, "POST", path, body);
    assert.equal(r.status, 200, `${path}: ${r.text}`);
    assert.equal(r.json.data.accountName, name);
    assert.doesNotMatch(r.text, /good-token|shpat_|Encrypted/, "no credentials in responses");
  }
  assert.equal(await sql(`select "accountId" from "Integration" where "workspaceId" = '${A.ws}' and platform = 'SHOPIFY'`), SHOP, "domain normalized");

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

  await t.test("TikTok: daily spend and conversions", async () => {
    const perf = await call(A.cookie, "GET", "/api/tiktok/performance?range=last_7_days");
    assert.equal(perf.json.data.summary.totalSpend, 80.4);
    assert.equal(perf.json.data.summary.conversions, 6);
  });

  await t.test("Shopify: orders and sales per day across pages, without cancelled or test orders", async () => {
    const perf = await call(A.cookie, "GET", "/api/shopify/performance?range=last_7_days");
    assert.deepEqual(perf.json.data.dailyTrend.map((d) => [d.date, d.conversions, d.revenue]), [[day(-2), 2, 150.5], [day(-1), 1, 250]]);
    assert.equal(perf.json.data.account.currency, "INR");
  });

  await t.test("Overview counts ad platforms, not store sales", async () => {
    const overview = await call(A.cookie, "GET", "/api/v1/overview");
    const labels = overview.json.data.platformSpend.map((p) => p.label);
    assert.ok(labels.includes("LinkedIn") && labels.includes("TikTok"), JSON.stringify(labels));
    assert.ok(!labels.some((l) => /shopify/i.test(l)));
    assert.equal(overview.json.data.summary.revenue, 0, "Shopify sales aren't added to ad revenue");
  });
});
