/**
 * Regression tests for step 2: security headers, email verification, middleware signature checks, rate limits.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

const ck = (sc) => { const m = /marketeros_session=([^;]+)/.exec(sc || ""); return m ? `marketeros_session=${m[1]}` : null; };

async function req(method, path, { cookie, body, headers = {} } = {}) {
  const h = { ...(cookie ? { cookie } : {}), ...headers };
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(BASE + path, { method, redirect: "manual", headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, headers: res.headers, setCookie: res.headers.get("set-cookie"), location: res.headers.get("location") };
}

async function signup(tag) {
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await req("POST", "/api/auth/signup", { body: { email, password: "Passw0rd!e2e", firstName: "E2E", lastName: tag, acceptTerms: true, workspaceName: `E2E S2 ${tag} ${ts}` } });
  return { r, email, cookie: ck(r.setCookie), ws: r.json?.data?.user?.workspaceId, userId: r.json?.data?.user?.userId };
}

test("Auth hardening (step 2)", async (t) => {
  const rec = (area, name, pass, detail = "") => t.test(`[${area}] ${name}`, () => assert.ok(pass, detail || name));
  await clearIpLimits();
  const ts = Date.now();





  await clearIpLimits();

  let r = await req("GET", "/auth/login");
  const h = r.headers;
  await rec("Headers", "Content-Security-Policy set", /frame-ancestors 'none'/.test(h.get("content-security-policy") || ""), (h.get("content-security-policy") || "").slice(0, 60) + "…");
  await rec("Headers", "X-Frame-Options DENY", h.get("x-frame-options") === "DENY");
  await rec("Headers", "X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
  await rec("Headers", "Referrer-Policy set", !!h.get("referrer-policy"), h.get("referrer-policy") || "");
  await rec("Headers", "HSTS set in production", /max-age=\d+/.test(h.get("strict-transport-security") || ""), h.get("strict-transport-security") || "missing");
  await rec("Headers", "X-Powered-By removed", !h.get("x-powered-by"));
  r = await req("GET", "/api/health");
  await rec("Headers", "Headers also on API responses", !!r.headers.get("content-security-policy") && r.headers.get("x-content-type-options") === "nosniff");

  const A = await signup("a");
  await rec("Verify", "Signup still works", A.r.status === 201 && !!A.cookie, `${A.r.status}`);
  const tokenRows = await sql(`select count(*) from "OAuthState" where "userId"='${A.userId}' and "providerKey"='EMAIL_VERIFY' and "consumedAt" is null`);
  await rec("Verify", "Signup issued a verification token", tokenRows === "1", `rows=${tokenRows}`);
  r = await req("GET", "/api/auth/session", { cookie: A.cookie });
  await rec("Verify", "Session reports emailVerified=false", r.json?.data?.user?.emailVerified === false, `${r.json?.data?.user?.emailVerified}`);

  r = await req("POST", "/api/auth/verify-email", { body: {} });
  await rec("Verify", "verify-email without token rejected (no more unconditional success)", r.status === 400, `${r.status}`);
  r = await req("POST", "/api/auth/verify-email", { body: { token: "bogus" } });
  await rec("Verify", "verify-email with bogus token rejected", r.status === 400, `${r.status}`);
  const vToken = randomBytes(32).toString("base64url");
  await sql(`insert into "OAuthState" (id, "stateHash", "workspaceId", "userId", "providerKey", "expiresAt", "createdAt") values ('e2e_v_${ts}', '${createHash("sha256").update(vToken).digest("hex")}', '${A.ws}', '${A.userId}', 'EMAIL_VERIFY', timezone('utc', now()) + interval '1 hour', now())`);
  r = await req("POST", "/api/auth/verify-email", { body: { token: vToken } });
  await rec("Verify", "Valid token verifies the email", r.status === 200 && !!await sql(`select "emailVerifiedAt" from "User" where id='${A.userId}'`), `${r.status}`);
  r = await req("POST", "/api/auth/verify-email", { body: { token: vToken } });
  await rec("Verify", "Verification token cannot be reused", r.status === 400, `${r.status}`);
  r = await req("GET", "/api/auth/session", { cookie: A.cookie });
  await rec("Verify", "Session reports emailVerified=true afterwards", r.json?.data?.user?.emailVerified === true, `${r.json?.data?.user?.emailVerified}`);
  const expToken = randomBytes(32).toString("base64url");
  await sql(`insert into "OAuthState" (id, "stateHash", "workspaceId", "userId", "providerKey", "expiresAt", "createdAt") values ('e2e_x_${ts}', '${createHash("sha256").update(expToken).digest("hex")}', '${A.ws}', '${A.userId}', 'EMAIL_VERIFY', timezone('utc', now()) - interval '1 minute', now())`);
  r = await req("POST", "/api/auth/verify-email", { body: { token: expToken } });
  await rec("Verify", "Expired token rejected", r.status === 400, `${r.status}`);
  const pwToken = randomBytes(32).toString("base64url");
  await sql(`insert into "OAuthState" (id, "stateHash", "workspaceId", "userId", "providerKey", "expiresAt", "createdAt") values ('e2e_p_${ts}', '${createHash("sha256").update(pwToken).digest("hex")}', '${A.ws}', '${A.userId}', 'PASSWORD_RESET', timezone('utc', now()) + interval '1 hour', now())`);
  r = await req("POST", "/api/auth/verify-email", { body: { token: pwToken } });
  await rec("Verify", "A password-reset token can't be used to verify email", r.status === 400, `${r.status}`);

  r = await req("POST", "/api/auth/resend-verification");
  await rec("Verify", "Resend without session → 401", r.status === 401, `${r.status}`);
  const B = await signup("b");
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await req("POST", "/api/auth/resend-verification", { cookie: B.cookie })).status);
  await rec("Verify", "Resend allowed 3×/hour per user, then 429", statuses.join(",") === "200,200,200,429", statuses.join(","));

  r = await req("GET", "/overview", { cookie: "marketeros_session=forged.forged" });
  await rec("Middleware", "Forged cookie on a page → login redirect", [302, 307].includes(r.status) && /\/auth\/login/.test(r.location || ""), `${r.status} → ${r.location}`);
  r = await req("GET", "/api/v1/leads", { headers: { authorization: "Bearer forged.forged" } });
  await rec("Middleware", "Forged Bearer on API → 401 at the edge", r.status === 401 && r.json?.error?.code === "UNAUTHENTICATED", `${r.status}`);
  const [payload] = decodeURIComponent(A.cookie.split("=")[1]).split(".");
  r = await req("GET", "/api/v1/leads", { cookie: `marketeros_session=${payload}.AAAA` });
  await rec("Middleware", "Real payload with wrong signature → 401", r.status === 401, `${r.status}`);
  r = await req("GET", "/overview", { cookie: A.cookie });
  await rec("Middleware", "Valid cookie still reaches pages", r.status === 200, `${r.status}`);
  r = await req("GET", "/api/v1/leads", { headers: { authorization: `Bearer ${decodeURIComponent(A.cookie.split("=")[1])}` } });
  await rec("Middleware", "Valid Bearer token still works", r.status === 200, `${r.status}`);

  await clearIpLimits();
  const lockStatuses = [];
  for (let i = 0; i < 5; i++) lockStatuses.push((await req("POST", "/api/auth/login", { body: { email: B.email, password: "wrong-pass-" + i } })).status);
  r = await req("POST", "/api/auth/login", { body: { email: B.email, password: "Passw0rd!e2e" } });
  await rec("Rate limit", "5 failed logins lock the account (even the right password gets 429)", lockStatuses.every((s) => s === 401) && r.status === 429, `${lockStatuses.join(",")} → ${r.status}`);
  await rec("Rate limit", "429 includes Retry-After and a clear message", Number(r.headers.get("retry-after")) > 0 && /reset your password/.test(r.json?.error?.message || ""), `Retry-After=${r.headers.get("retry-after")}: ${r.json?.error?.message}`);
  r = await req("POST", "/api/auth/login", { body: { email: A.email, password: "Passw0rd!e2e" } });
  await rec("Rate limit", "Other accounts are unaffected by B's lockout", r.status === 200, `${r.status}`);
  await sql(`delete from "RateLimit" where key='login:fail:${B.email}'`);
  for (let i = 0; i < 3; i++) await req("POST", "/api/auth/login", { body: { email: B.email, password: "wrong" } });
  r = await req("POST", "/api/auth/login", { body: { email: B.email, password: "Passw0rd!e2e" } });
  const failLeft = await sql(`select count(*) from "RateLimit" where key='login:fail:${B.email}'`);
  await rec("Rate limit", "Successful login clears the failure counter", r.status === 200 && failLeft === "0", `${r.status}, counter rows=${failLeft}`);

  await clearIpLimits();
  let ipStatuses = [];
  for (let i = 0; i < 31; i++) ipStatuses.push((await req("POST", "/api/auth/login", { body: { email: `spray-${i}-${ts}@example.test`, password: "whatever1" } })).status);
  await rec("Rate limit", "Login: 30 attempts per IP per 15 min, then 429", ipStatuses.slice(0, 30).every((s) => s === 401) && ipStatuses[30] === 429, `first30=${[...new Set(ipStatuses.slice(0, 30))]}, 31st=${ipStatuses[30]}`);

  await clearIpLimits();
  const fp = [];
  for (let i = 0; i < 4; i++) fp.push((await req("POST", "/api/auth/forgot-password", { body: { email: `nobody-${ts}@example.test` } })).status);
  await rec("Rate limit", "Forgot-password: 3 per email per hour, then 429", fp.join(",") === "200,200,200,429", fp.join(","));

  await clearIpLimits();
  const su = [];
  for (let i = 0; i < 6; i++) su.push((await signup("s" + i)).r.status);
  await rec("Rate limit", "Signup: 5 per IP per hour, then 429", su.slice(0, 5).every((s) => s === 201) && su[5] === 429, su.join(","));

  await clearIpLimits();
});
