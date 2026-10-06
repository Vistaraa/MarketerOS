/**
 * Regression tests for the step-1 security fixes: forged credentials, OAuth state, sessions, password reset, billing.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

const ck = (sc) => { const m = /marketeros_session=([^;]+)/.exec(sc || ""); return m ? `marketeros_session=${m[1]}` : null; };

async function req(method, path, { cookie, body, form, headers = {} } = {}) {
  const h = { ...(cookie ? { cookie } : {}), ...headers };
  let payload;
  if (form) { payload = new URLSearchParams(form).toString(); h["content-type"] = "application/x-www-form-urlencoded"; }
  else if (body !== undefined) { payload = JSON.stringify(body); h["content-type"] = "application/json"; }
  const res = await fetch(BASE + path, { method, redirect: "manual", headers: h, body: payload });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, setCookie: res.headers.get("set-cookie"), location: res.headers.get("location") };
}

async function signup(tag) {
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await req("POST", "/api/auth/signup", { body: { email, password: "Passw0rd!e2e", firstName: "E2E", lastName: tag, workspaceName: `E2E Fix ${tag} ${ts}` } });
  return { email, cookie: ck(r.setCookie), ws: r.json?.data?.user?.workspaceId, userId: r.json?.data?.user?.userId };
}

test("Security fixes (step 1)", async (t) => {
  const rec = (area, name, pass, detail = "") => t.test(`[${area}] ${name}`, () => assert.ok(pass, detail || name));
  await clearIpLimits();
  const ts = Date.now();





  const A = await signup("a");
  const B = await signup("b");

  let r = await req("GET", "/api/v1/settings", { headers: { authorization: "Bearer totally-forged-token" } });
  await rec("Auth fallback", "Forged Bearer token → 401 on read", r.status === 401, `${r.status}`);
  const leadsBefore = await sql(`select count(*) from "Lead" where "workspaceId"='${B.ws}'`);
  r = await req("POST", "/api/v1/leads", { headers: { authorization: "Bearer forged" }, body: { firstName: "Forged", lastName: "Write", email: `forged-${ts}@example.test` } });
  const leadsAfter = await sql(`select count(*) from "Lead" where "workspaceId"='${B.ws}'`);
  await rec("Auth fallback", "Forged Bearer token → 401 on write, nothing created", r.status === 401 && leadsBefore === leadsAfter, `${r.status}, leads ${leadsBefore}→${leadsAfter}`);
  r = await req("GET", "/api/v1/team", { cookie: "marketeros_session=garbage.garbage" });
  await rec("Auth fallback", "Forged session cookie → 401", r.status === 401, `${r.status}`);
  for (const p of ["/api/google-ads/performance", "/api/google-ads/accounts", "/api/admob/accounts"]) {
    r = await req("GET", p, { headers: { authorization: "Bearer forged" } });
    await rec("Auth fallback", `${p} with forged token → 401`, r.status === 401, `${r.status}`);
  }
  r = await req("POST", "/api/admob/save-connection", { headers: { authorization: "Bearer forged" }, body: { publisherId: "pub-123" } });
  await rec("Auth fallback", "/api/admob/save-connection with forged token → 401", r.status === 401, `${r.status}`);
  r = await req("POST", "/api/google-ads/publish-campaign", { headers: { authorization: "Bearer forged" }, body: {} });
  await rec("Auth fallback", "/api/google-ads/publish-campaign with forged token → 401", r.status === 401, `${r.status}`);
  const forgedState = Buffer.from(JSON.stringify({ workspaceId: B.ws, returnTo: "https://evil.example" })).toString("base64url");
  r = await req("GET", `/api/google-ads/callback?code=x&state=${forgedState}`, { headers: { authorization: "Bearer forged" } });
  await rec("OAuth", "Google Ads callback without real session → login redirect", [302, 303, 307].includes(r.status) && /\/auth\/login/.test(r.location || ""), `${r.status} → ${r.location}`);
  r = await req("GET", `/api/admob/callback?code=x&state=${forgedState}`, { headers: { authorization: "Bearer forged" } });
  await rec("OAuth", "AdMob callback without real session → login redirect", [302, 303, 307].includes(r.status) && /\/auth\/login/.test(r.location || ""), `${r.status} → ${r.location}`);
  r = await req("GET", `/api/google-ads/callback?state=${forgedState}`, { cookie: A.cookie });
  await rec("OAuth", "Callback ignores off-site returnTo from state", !/evil\.example/.test(r.location || ""), `→ ${r.location}`);

  r = await req("GET", "/api/v1/settings", { cookie: A.cookie });
  await rec("Regression", "Valid session still reads its own workspace", r.status === 200, `${r.status}`);
  r = await req("GET", "/api/google-ads/performance", { cookie: A.cookie });
  await rec("Regression", "Valid session can call Google Ads performance", r.status === 200, `${r.status}`);

  const L = ck((await req("POST", "/api/auth/login", { body: { email: B.email, password: "Passw0rd!e2e" } })).setCookie);
  await req("POST", "/api/auth/logout", { cookie: L });
  r = await req("GET", "/api/v1/settings", { cookie: L });
  await rec("Auth fallback", "Logged-out cookie → 401 on /api/v1", r.status === 401, `${r.status}`);

  const A2 = ck((await req("POST", "/api/auth/login", { body: { email: A.email, password: "Passw0rd!e2e" } })).setCookie);
  const a2Hash = createHash("sha256").update(decodeURIComponent(A2.split("=")[1])).digest("hex");
  const a2Id = await sql(`select id from "Session" where "tokenHash"='${a2Hash}'`);
  r = await req("DELETE", `/api/v1/settings/sessions/${a2Id}`, { cookie: B.cookie });
  const stillA = await req("GET", "/api/auth/session", { cookie: A2 });
  await rec("Sessions", "User B cannot revoke user A's session", r.status === 404 && stillA.json?.data?.authenticated === true, `${r.status}, A still signed in=${stillA.json?.data?.authenticated}`);
  r = await req("DELETE", `/api/v1/settings/sessions/${a2Id}`, { cookie: A.cookie });
  const goneA = await req("GET", "/api/auth/session", { cookie: A2 });
  await rec("Sessions", "User A can revoke own session, effective immediately", r.status === 200 && goneA.json?.data?.authenticated === false, `${r.status}, signed in after=${goneA.json?.data?.authenticated}`);

  r = await req("POST", "/api/auth/reset-password", { body: { email: A.email, password: "AttackerChosen123" } });
  const takeover = await req("POST", "/api/auth/login", { body: { email: A.email, password: "AttackerChosen123" } });
  await rec("Reset", "Email-only reset rejected (no takeover)", r.status === 400 && takeover.status === 401, `reset=${r.status}, attacker login=${takeover.status}`);
  r = await req("POST", "/api/auth/reset-password", { body: { token: "bogus-token", password: "AttackerChosen123" } });
  await rec("Reset", "Bogus token rejected", r.status === 400, `${r.status}`);
  const unknown = await req("POST", "/api/auth/forgot-password", { body: { email: `nobody-${ts}@example.test` } });
  await rec("Reset", "Forgot-password no longer returns userFound", unknown.status === 200 && unknown.json?.data?.userFound === undefined, `${unknown.status} ${JSON.stringify(unknown.json?.data)}`);

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await sql(`insert into "OAuthState" (id, "stateHash", "workspaceId", "userId", "providerKey", "expiresAt", "createdAt") values ('e2e_${ts}', '${tokenHash}', '${A.ws}', '${A.userId}', 'PASSWORD_RESET', now() + interval '1 hour', now())`);
  const A3 = ck((await req("POST", "/api/auth/login", { body: { email: A.email, password: "Passw0rd!e2e" } })).setCookie);
  r = await req("POST", "/api/auth/reset-password", { body: { token, password: "NewPassw0rd!e2e" } });
  await rec("Reset", "Valid token resets password", r.status === 200, `${r.status} ${r.json?.error?.message || ""}`);
  r = await req("POST", "/api/auth/login", { body: { email: A.email, password: "NewPassw0rd!e2e" } });
  await rec("Reset", "Login works with the new password", r.status === 200, `${r.status}`);
  r = await req("GET", "/api/auth/session", { cookie: A3 });
  await rec("Reset", "Existing sessions are signed out after reset", r.json?.data?.authenticated === false, `authenticated=${r.json?.data?.authenticated}`);
  r = await req("POST", "/api/auth/reset-password", { body: { token, password: "Another123!" } });
  await rec("Reset", "Token cannot be reused", r.status === 400, `${r.status}`);
  const A4 = ck((await req("POST", "/api/auth/login", { body: { email: A.email, password: "NewPassw0rd!e2e" } })).setCookie);

  const subBefore = await sql(`select coalesce(max("planSlug"),'none') || ':' || count(*) from "Subscription" where "workspaceId" in ('${A.ws}','${B.ws}')`);
  const invBefore = await sql(`select count(*) from "Invoice" where "workspaceId" in ('${A.ws}','${B.ws}')`);
  r = await req("POST", "/api/v1/billing/payu/verify-payment", { cookie: A4, body: {} });
  await rec("Billing", "verify-payment with empty body rejected", r.status === 400, `${r.status} ${r.json?.error?.code}`);
  r = await req("POST", "/api/v1/billing/payu/verify-payment", { cookie: A4, body: { txnid: `t${ts}`, status: "success", hash: "sim_hash_1", udf3: "subscription", udf4: "agency", udf5: "yearly" } });
  await rec("Billing", "verify-payment with sim_ hash rejected", r.status === 400 && r.json?.error?.code === "INVALID_SIGNATURE", `${r.status} ${r.json?.error?.code}`);
  r = await req("POST", "/api/v1/billing/payu/verify-payment", { cookie: A4, body: { txnid: `t${ts}b`, status: "success", hash: "x", udf1: B.ws, udf3: "subscription", udf4: "agency" } });
  await rec("Billing", "verify-payment for another workspace rejected", r.status === 403, `${r.status} ${r.json?.error?.code}`);
  r = await req("POST", "/api/billing/payu/callback", { headers: { authorization: "Bearer forged" }, form: { txnid: `cb${ts}`, status: "success", hash: "sim_forged", udf1: B.ws, udf2: B.userId, udf3: "subscription", udf4: "agency", udf5: "yearly", amount: "1", productinfo: "x", firstname: "x", email: "x@x.x" } });
  await rec("Billing", "Forged PayU callback redirects to failure", /payment=failed/.test(r.location || ""), `${r.status} → ${(r.location || "").slice(0, 80)}`);
  const subAfter = await sql(`select coalesce(max("planSlug"),'none') || ':' || count(*) from "Subscription" where "workspaceId" in ('${A.ws}','${B.ws}')`);
  const invAfter = await sql(`select count(*) from "Invoice" where "workspaceId" in ('${A.ws}','${B.ws}')`);
  await rec("Billing", "No subscription or invoice created by forged payments", subBefore === subAfter && invBefore === invAfter, `subscriptions ${subBefore}→${subAfter}, invoices ${invBefore}→${invAfter}`);
  r = await req("POST", "/api/v1/billing/payu/create-payment", { cookie: A4, body: { type: "subscription", planSlug: "pro", interval: "monthly" } });
  const leaked = r.json?.data && ("salt" in r.json.data || "merchantSalt" in r.json.data);
  await rec("Billing", "create-payment still works and no longer returns the salt", r.status === 200 && !leaked && !!r.json?.data?.params?.hash, `${r.status}, salt exposed=${leaked}`);
});
