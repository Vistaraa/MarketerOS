/**
 * Step 13: Google Play import (releases, reviews → inbox + ratings, Android vitals) and YouTube ad metrics from
 * Google Ads video campaigns. Google's APIs are replaced by a local stub; the app under test must be started with
 * the stub base URLs (see .github/workflows/ci.yml), otherwise these tests skip.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const STUB_PORT = 5077;
const stubbed = ["GOOGLE_PLAY_API_BASE_URL", "PLAY_REPORTING_API_BASE_URL", "GOOGLE_ADS_API_BASE_URL", "GOOGLE_OAUTH_TOKEN_URL"].every((name) => (process.env[name] || "").includes(`:${STUB_PORT}`));
const skip = stubbed ? false : "the app isn't configured with the Google API stub (GOOGLE_PLAY_API_BASE_URL etc.)";
const PKG = `com.e2e.app${ts}`;
const PKG_NO_VITALS = `com.e2e.novitals${ts}`;
const seen = [];
let stub;

const gDate = (offset) => { const d = new Date(Date.now() + offset * 86_400_000); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }; };
const isoDay = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

function startStub() {
  stub = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://127.0.0.1");
      seen.push({ method: req.method, path: url.pathname, auth: req.headers.authorization, body });
      const send = (status, json) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(json)); };
      if (url.pathname === "/google/token") {
        const refresh = new URLSearchParams(body).get("refresh_token");
        return ["play-refresh-good", "ads-refresh-good"].includes(refresh) ? send(200, { access_token: `ya29.${refresh}`, expires_in: 3599 }) : send(400, { error: "invalid_grant" });
      }
      let m;
      if ((m = /^\/play\/androidpublisher\/v3\/applications\/([^/]+)\/edits$/.exec(url.pathname)) && req.method === "POST") return send(200, { id: "edit-1" });
      if (/\/edits\/edit-1\/tracks$/.test(url.pathname)) {
        return send(200, { tracks: [
          { track: "production", releases: [{ name: "4.2.0", versionCodes: ["42"], status: "completed", releaseNotes: [{ language: "en-US", text: "Faster checkout." }] }] },
          { track: "beta", releases: [{ name: "4.3.0-beta", versionCodes: ["43"], status: "inProgress", userFraction: 0.2 }] }
        ] });
      }
      if (/\/edits\/edit-1$/.test(url.pathname) && req.method === "DELETE") { res.writeHead(204); return res.end(); }
      if (/\/reviews$/.test(url.pathname)) {
        const now = Math.floor(Date.now() / 1000);
        return send(200, { reviews: [
          { reviewId: "r-bad", authorName: "Asha", comments: [{ userComment: { text: "Crashes on login since the update.", starRating: 1, lastModified: { seconds: String(now - 3600) } } }] },
          { reviewId: "r-good", authorName: "Ravi", comments: [{ userComment: { text: "Love it", starRating: 5, lastModified: { seconds: String(now - 7200) } } }] }
        ] });
      }
      if ((m = /^\/reporting\/v1beta1\/apps\/([^/]+)\/(crashRate|anrRate)MetricSet:query$/.exec(url.pathname))) {
        if (decodeURIComponent(m[1]) === PKG_NO_VITALS) return send(403, { error: { message: "Google Play Developer Reporting API has not been used in project 123 before or it is disabled." } });
        const metric = m[2];
        return send(200, { rows: [
          { startTime: gDate(-4), metrics: [{ metric, decimalValue: { value: metric === "crashRate" ? "0.0125" : "0.0030" } }, { metric: "distinctUsers", decimalValue: { value: "8000" } }] },
          { startTime: gDate(-3), metrics: [{ metric, decimalValue: { value: metric === "crashRate" ? "0.0075" : "0.0020" } }, { metric: "distinctUsers", decimalValue: { value: "9000" } }] }
        ] });
      }
      if ((m = /^\/gads\/v\d+\/customers\/(\d+)\/googleAds:searchStream$/.exec(url.pathname))) {
        const query = JSON.parse(body || "{}").query || "";
        const withViews = query.includes("video_trueview_views");
        if (m[1] === "2222222222" && withViews) return send(400, { error: { message: "Unrecognized field in the query: 'metrics.video_trueview_views'." } });
        const metrics = (imp, clicks, cost, views) => ({ impressions: String(imp), clicks: String(clicks), costMicros: String(cost), conversions: 1, ...(withViews ? { videoTrueviewViews: String(views) } : {}) });
        if (query.includes("segments.date,") || query.startsWith("SELECT segments.date")) {
          return send(200, [{ results: [{ segments: { date: isoDay(-2) }, metrics: metrics(1000, 10, 5_000_000, 400) }, { segments: { date: isoDay(-1) }, metrics: metrics(3000, 30, 15_000_000, 1100) }] }]);
        }
        return send(200, [{ results: [{ campaign: { id: "77", name: "Launch video", status: "ENABLED" }, metrics: metrics(4000, 40, 20_000_000, 1500) }] }]);
      }
      send(404, { error: { message: `stub: no route for ${req.method} ${url.pathname}` } });
    });
  });
  return new Promise((resolve) => stub.listen(STUB_PORT, "127.0.0.1", resolve));
}

function encrypt(value) {
  const configured = process.env.ENCRYPTION_KEY;
  const key = configured && /^[a-f0-9]{64}$/i.test(configured) ? Buffer.from(configured, "hex") : createHash("sha256").update(configured || "marketeros-secret-encryption-key-seed-2026").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;
async function call(cookie, method, path, headers = {}) {
  const res = await fetch(BASE + path, { method, headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json", ...headers }, ...(method === "POST" ? { body: "{}" } : {}) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
async function signup(tag) {
  await clearIpLimits();
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "Passw0rd!e2e", firstName: "Play", lastName: tag, acceptTerms: true, workspaceName: `Play ${tag}` }) });
  const json = await r.json();
  assert.equal(r.status, 201, JSON.stringify(json));
  await verifyEmail(email);
  return { cookie: cookieFrom(r), ws: json.data.user.workspaceId };
}
async function connectPlay(ws, pkg) {
  const meta = JSON.stringify({ packageName: pkg, appTitle: "E2E App", clientIdEncrypted: encrypt("byok-client"), clientSecretEncrypted: encrypt("byok-secret") }).replaceAll("'", "''");
  await sql(`insert into "Integration" (id, "workspaceId", platform, "providerKey", "accountName", "refreshTokenEncrypted", metadata, status, "updatedAt") values ('e2e_play_${ws}', '${ws}', 'GOOGLE_PLAY', 'google_play', 'E2E App', '${encrypt("play-refresh-good")}', '${meta}', 'CONNECTED', timezone('utc', now()))`);
}
async function cronBlocked(own) {
  if (!process.env.CRON_SECRET) return "CRON_SECRET not set for the test run";
  // Jobs queued by this run's own workspaces are fine to run; anything else belongs to real users.
  const foreign = Number(await sql(`select count(*) from "BackgroundJob" j where status = 'QUEUED' and "runAt" <= timezone('utc', now()) and not exists (select 1 from "Workspace" w join "User" u on u.id = w."ownerId" where w.id = j."workspaceId" and u.email like 'e2e-${ts}-%')`));
  return foreign > 0 ? `${foreign} real job(s) already queued in this database; not running them from a test` : false;
}
async function runCron() {
  await sql(`delete from "SystemTask"`);
  const r = await call(null, "GET", "/api/cron/jobs", { authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(r.status, 200, r.text);
  return r.json.data;
}

before(async () => { if (stubbed) await startStub(); });
after(async () => { await cleanupRun(ts); if (stub) await new Promise((r) => stub.close(r)); });

test("Google Play import", { skip }, async (t) => {
  const A = await signup("play");
  const B = await signup("play-novitals");
  const blocked = await cronBlocked([A.ws, B.ws]);
  await connectPlay(A.ws, PKG);
  await connectPlay(B.ws, PKG_NO_VITALS);

  const queued = await call(A.cookie, "POST", "/api/v1/play-console/sync");
  assert.equal(queued.status, 202, queued.text);
  assert.equal(queued.json.queued, true);
  assert.equal((await call(A.cookie, "POST", "/api/v1/play-console/sync")).json.jobId, queued.json.jobId, "a second click doesn't queue a duplicate");
  if (blocked) return t.skip(blocked);
  await call(B.cookie, "POST", "/api/v1/play-console/sync");
  await runCron();

  await t.test("releases from every track", async () => {
    const rows = await sql(`select track || ':' || "versionCode" || ':' || "versionName" || ':' || status || ':' || "rolloutPercentage" from "PlayConsoleRelease" where "workspaceId" = '${A.ws}' order by "versionCode"`);
    assert.equal(rows, "PRODUCTION:42:4.2.0:COMPLETED:100.00\nOPEN_TESTING:43:4.3.0-beta:IN_PROGRESS:20.00");
    assert.ok(seen.some((r) => r.method === "DELETE" && r.path.endsWith("/edits/edit-1")), "the temporary edit is discarded");
    assert.ok(seen.filter((r) => r.path.startsWith("/play")).every((r) => r.auth === "Bearer ya29.play-refresh-good"));
  });

  await t.test("reviews become inbox messages once, and daily ratings", async () => {
    const inbox = await sql(`select category || ':' || title from "PlayConsoleInboxMessage" where "workspaceId" = '${A.ws}' order by category`);
    // Enum order (IMPORTANT first), not alphabetical.
    assert.equal(inbox, "IMPORTANT:1★ review from Asha\nEVERYTHING_ELSE:5★ review from Ravi");
    await call(A.cookie, "POST", "/api/v1/play-console/sync");
    await runCron();
    assert.equal(await sql(`select count(*) from "PlayConsoleInboxMessage" where "workspaceId" = '${A.ws}'`), "2", "re-import doesn't duplicate");
  });

  await t.test("vitals and ratings reach the KPI API; unimported figures stay empty", async () => {
    const kpis = await call(A.cookie, "GET", "/api/v1/play-console/kpis");
    assert.equal(kpis.json.hasData, true);
    const day = kpis.json.timeSeries.find((r) => r.date === isoDay(-4));
    assert.deepEqual({ crash: day.crashRate, anr: day.anrRate, users: day.activeDevices, visitors: day.storeListingVisitors }, { crash: 1.25, anr: 0.3, users: 8000, visitors: null });
    assert.equal(kpis.json.rolling28.crashRate, 1);
    assert.equal(kpis.json.rolling28.ratingAverage, 3);
    assert.equal(kpis.json.rolling28.storeListingVisitors, null);
  });

  await t.test("without the Reporting API the import still succeeds, with a warning", async () => {
    assert.equal(await sql(`select count(*) from "PlayConsoleRelease" where "workspaceId" = '${B.ws}'`), "2");
    const log = await sql(`select l.status || '|' || l."errorMessage" from "IntegrationSyncLog" l where l."integrationId" = 'e2e_play_${B.ws}' order by l."startedAt" desc limit 1`);
    assert.match(log, /^PARTIAL\|Android vitals weren't imported: .*Reporting API/);
    assert.equal(await sql(`select status from "Integration" where id = 'e2e_play_${B.ws}'`), "CONNECTED");
  });
});

test("YouTube ad metrics come from Google Ads video campaigns", { skip }, async (t) => {
  const A = await signup("yt");
  await sql(`insert into "Integration" (id, "workspaceId", platform, "accountName", "accountId", "apiKeyEncrypted", status, "updatedAt") values ('e2e_yt_${ts}', '${A.ws}', 'YOUTUBE', 'E2E channel', 'UC123', '${encrypt("yt-api-key")}', 'CONNECTED', timezone('utc', now()))`);

  // These YouTube endpoints are POST requests in the API.
  const none = await call(A.cookie, "POST", "/api/v1/youtube-ads/campaigns");
  assert.equal(none.status, 200);
  assert.deepEqual(none.json.data.campaigns, []);
  assert.match(none.json.data.unavailableReason, /Connect Google Ads/);

  await sql(`insert into "Integration" (id, "workspaceId", platform, "providerKey", "accountName", "accountId", "refreshTokenEncrypted", status, "updatedAt") values ('e2e_ytads_${ts}', '${A.ws}', 'GOOGLE_ADS', 'google_ads', 'Ads', '123-456-7890', '${encrypt("ads-refresh-good")}', 'CONNECTED', timezone('utc', now()))`);
  const campaigns = await call(A.cookie, "POST", "/api/v1/youtube-ads/campaigns");
  const c = campaigns.json.data.campaigns[0];
  assert.deepEqual({ name: c.name, impressions: c.impressions, views: c.views, spend: c.spend, viewRate: c.viewRate, cpv: c.CPV }, { name: "Launch video", impressions: 4000, views: 1500, spend: 20, viewRate: 37.5, cpv: 0.0133 });
  const video = seen.find((r) => r.path.endsWith("1234567890/googleAds:searchStream") && r.body.includes("VIDEO"));
  assert.match(JSON.parse(video.body).query, /advertising_channel_type = 'VIDEO'/);
  const metrics = await call(A.cookie, "POST", "/api/v1/youtube-ads/metrics");
  assert.deepEqual(metrics.json.data.metrics.map((d) => [d.date, d.views, d.spend]), [[isoDay(-2), 400, 5], [isoDay(-1), 1100, 15]]);

  await t.test("an API version without the views field still returns the rest", async () => {
    await sql(`update "Integration" set "accountId" = '2222222222' where id = 'e2e_ytads_${ts}'`);
    const r = await call(A.cookie, "POST", "/api/v1/youtube-ads/metrics");
    assert.equal(r.json.data.summary.views, null);
    assert.equal(r.json.data.summary.impressions, 4000);
  });
});
