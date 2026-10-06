/**
 * Regression tests for step 3: nothing fabricated (Play Console, YouTube, settings, leads, Google Ads publishing).
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, sql, clearIpLimits, cleanupRun } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

const ck = (sc) => { const m = /marketeros_session=([^;]+)/.exec(sc || ""); return m ? `marketeros_session=${m[1]}` : null; };

async function req(method, path, { cookie, body } = {}) {
  const h = { ...(cookie ? { cookie } : {}) };
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(BASE + path, { method, redirect: "manual", headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, setCookie: res.headers.get("set-cookie") };
}

async function signup(tag) {
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await req("POST", "/api/auth/signup", { body: { email, password: "Passw0rd!e2e", firstName: "E2E", lastName: tag, acceptTerms: true, workspaceName: `E2E S3 ${tag} ${ts}` } });
  return { email, cookie: ck(r.setCookie), ws: r.json?.data?.user?.workspaceId, userId: r.json?.data?.user?.userId };
}

test("Only real data (step 3)", async (t) => {
  const rec = (area, name, pass, detail = "") => t.test(`[${area}] ${name}`, () => assert.ok(pass, detail || name));
  await clearIpLimits();
  const ts = Date.now();



  await sql(`delete from "RateLimit" where key like '%:ip:%'`);
  const A = await signup("a");
  const B = await signup("b");

  const playRows = async (ws) => sql(`select (select count(*) from "PlayConsoleApp" where "workspaceId"='${ws}') || '/' || (select count(*) from "PlayConsoleKpiDaily" where "workspaceId"='${ws}')`);
  await req("GET", "/overview", { cookie: A.cookie });
  let r = await req("GET", "/api/v1/play-console/kpis", { cookie: A.cookie });
  await rec("Play", "KPIs for a new workspace: hasData=false, app=null", r.status === 200 && r.json?.hasData === false && r.json?.app === null, `${r.status} hasData=${r.json?.hasData} app=${JSON.stringify(r.json?.app)}`);
  await rec("Play", "KPIs response has no metric values", JSON.stringify(r.json?.rolling28) === "{}" && JSON.stringify(r.json?.latest) === "{}" && r.json?.timeSeries?.length === 0);
  r = await req("GET", "/api/v1/play-console/releases", { cookie: A.cookie });
  await rec("Play", "Releases: empty, no app", r.status === 200 && r.json?.app === null && r.json?.allReleases?.length === 0, `${r.status}`);
  r = await req("GET", "/api/v1/play-console/inbox", { cookie: A.cookie });
  await rec("Play", "Inbox: empty", r.status === 200 && r.json?.important?.length === 0 && r.json?.everythingElse?.length === 0, `${r.status}`);
  await rec("Play", "Visiting Overview/KPIs/releases/inbox created no app or KPI rows", await playRows(A.ws) === "0/0", `apps/kpis=${await playRows(A.ws)}`);
  r = await req("POST", "/api/v1/play-console/sync", { cookie: A.cookie });
  await rec("Play", "Sync without Google Play → 409 with honest message", r.status === 409 && /isn't connected/.test(r.json?.error || ""), `${r.status}: ${r.json?.error}`);
  await rec("Play", "Sync created no data", await playRows(A.ws) === "0/0", `apps/kpis=${await playRows(A.ws)}`);

  await sql(`insert into "PlayConsoleApp" (id, "workspaceId", "packageName", "appTitle", category, "isPrimary", "createdAt", "updatedAt") values ('e2e_app_${ts}', '${B.ws}', 'com.example.real', 'Real App', 'Tools', true, now(), now())`);
  for (let d = 2; d >= 0; d--) {
    await sql(`insert into "PlayConsoleKpiDaily" (id, "workspaceId", "appId", date, "totalAudienceSize", "storeListingVisitors", "storeListingAcquisitions", "storeListingConversionRate", "activeDevices", "uninstallsCount", "crashesCount", "anrsCount", "ratingAverage", "ratingsCount", "createdAt", "updatedAt") values ('e2e_k_${ts}_${d}', '${B.ws}', 'e2e_app_${ts}', date_trunc('day', timezone('utc', now())) - interval '${d} day', ${1000 + (2 - d) * 100}, ${200 + d}, ${50 + d}, 25.0, 800, ${10 + d}, ${d}, 0, 4.2, 30, now(), now())`);
  }
  r = await req("GET", "/api/v1/play-console/kpis", { cookie: B.cookie });
  const L = r.json?.latest || {};
  await rec("Play real data", "hasData=true with the stored app", r.json?.hasData === true && r.json?.app?.packageName === "com.example.real", `hasData=${r.json?.hasData}`);
  await rec("Play real data", "Latest values are the stored values", L.totalAudienceSize === 1200 && L.storeListingVisitors === 200 && L.userAcquisitions === 50 && L.activeDevices === 800 && L.userLoss === 10, JSON.stringify({ aud: L.totalAudienceSize, vis: L.storeListingVisitors, acq: L.userAcquisitions, dev: L.activeDevices, loss: L.userLoss }));
  await rec("Play real data", "Growth computed from stored audience (1000→1200 = 20%)", L.audienceGrowthRate === 20, `${L.audienceGrowthRate}`);
  const nullKeys = ["totalInstalls", "dailyActiveUsers", "monthlyActiveUsers", "returningUsers", "userEngagementMins", "newUserRetention", "acquisitionSource", "adSpend", "cpi", "paidInstalls", "organicInstalls", "roas", "arpu"];
  const notNull = nullKeys.filter((k) => L[k] !== null);
  await rec("Play real data", "Unsupported metrics are null, not invented (incl. ARPU with no revenue)", notNull.length === 0, notNull.length ? `non-null: ${notNull.join(",")}` : `${nullKeys.length} metrics null`);
  await rec("Play real data", "3 stored days → 3 time-series points", r.json?.timeSeries?.length === 3, `${r.json?.timeSeries?.length}`);

  r = await req("POST", "/api/v1/youtube-ads/dashboard", { cookie: A.cookie, body: {} });
  await rec("YouTube", "Dashboard without YouTube → 404 NOT_CONNECTED (UI shows connect prompt)", r.status === 404 && r.json?.error?.code === "YOUTUBE_ADS_NOT_CONNECTED", `${r.status} ${r.json?.error?.code}`);

  const before = await sql(`select count(*) from "Session" where "userId"='${A.userId}'`);
  r = await req("GET", "/api/v1/settings", { cookie: A.cookie });
  const sess = r.json?.data?.securitySessions || [];
  const after = await sql(`select count(*) from "Session" where "userId"='${A.userId}'`);
  await rec("Settings", "Sessions list = the user's real sessions", sess.length === Number(before) && before === after, `listed=${sess.length}, db=${before}→${after}`);
  await rec("Settings", "Exactly one session marked current (the cookie's)", sess.filter((s) => s.isCurrent).length === 1, `${sess.filter((s) => s.isCurrent).length}`);
  await rec("Settings", "No invented device/browser/IP fields", sess.every((s) => !("device" in s) && !("ipAddress" in s) && !("browser" in s)));
  await rec("Settings", "No hardcoded API keys", Array.isArray(r.json?.data?.apiKeys) && r.json.data.apiKeys.length === 0, JSON.stringify(r.json?.data?.apiKeys));
  r = await req("POST", "/api/v1/settings/api-keys", { cookie: A.cookie, body: { name: "x" } });
  await rec("Settings", "Generate API key → a real, stored key (step 14)", r.status === 201 && /^mk_live_[A-Za-z0-9]{40}$/.test(r.json?.data?.secret || "") && (await sql(`select count(*) from "ApiKey" where id = '${r.json?.data?.key?.id}'`)) === "1", `${r.status}`);
  r = await req("DELETE", "/api/v1/settings/api-keys/key-prod-01", { cookie: A.cookie });
  await rec("Settings", "Revoke nonexistent key → 404 (no fake success)", r.status === 404, `${r.status}`);
  await rec("Settings", "No fake 'sess_' session rows exist", await sql(`select count(*) from "Session" where "tokenHash" like 'sess\\_%'`) === "0");

  r = await req("POST", "/api/v1/leads", { cookie: A.cookie, body: { firstName: "No", lastName: "Value", email: `nv-${ts}@example.test` } });
  const leadId = r.json?.data?.id;
  r = await req("POST", `/api/v1/leads/${leadId}/convert`, { cookie: A.cookie });
  const budget = await sql(`select "monthlyBudget" from "Client" where id='${r.json?.data?.client?.id}'`);
  await rec("Leads", "Converting a lead without a value doesn't invent a $5,000 budget", Number(budget) === 0, `monthlyBudget=${budget}`);

  await sql(`insert into "Campaign" (id, "workspaceId", "createdById", name, platform, budget, "updatedAt") values ('e2e_c_${ts}', '${B.ws}', '${B.userId}', 'B campaign', 'GOOGLE_ADS', 500, now())`);
  r = await req("POST", "/api/google-ads/publish-campaign", { cookie: A.cookie, body: { campaignId: `e2e_c_${ts}` } });
  await rec("Google Ads", "Workspace A can't publish workspace B's campaign", !r.json?.success && /not found/i.test(JSON.stringify(r.json)), `${r.status} ${JSON.stringify(r.json).slice(0, 90)}`);
  await sql(`insert into "Campaign" (id, "workspaceId", "createdById", name, platform, budget, "updatedAt") values ('e2e_ca_${ts}', '${A.ws}', '${A.userId}', 'A campaign', 'GOOGLE_ADS', 500, now())`);
  r = await req("POST", "/api/google-ads/publish-campaign", { cookie: A.cookie, body: { campaignId: `e2e_ca_${ts}` } });
  await rec("Google Ads", "Publishing without own Google Ads connection is refused (no borrowed token)", !r.json?.success && /not connected/i.test(JSON.stringify(r.json)), `${r.status} ${JSON.stringify(r.json).slice(0, 90)}`);
});
