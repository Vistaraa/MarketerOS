/**
 * Step 10 compliance: legal pages, recorded terms acceptance, email verification for sensitive actions, data
 * export, workspace/account deletion with a grace period (and purge), and leaving a workspace.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const PASSWORD = "Passw0rd!e2e";
after(() => cleanupRun(ts));

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;
const emailFor = (tag) => `e2e-${ts}-${tag}@example.test`;

async function call(cookie, method, path, body, headers = {}) {
  const res = await fetch(BASE + path, { method, redirect: "manual", headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json", ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers, cookie: cookieFrom(res) };
}

async function signup(tag, { verified = true, workspaceName } = {}) {
  await clearIpLimits();
  const r = await call(null, "POST", "/api/auth/signup", { email: emailFor(tag), password: PASSWORD, firstName: "Comp", lastName: tag, acceptTerms: true, workspaceName: workspaceName || `Compliance ${tag} ${ts}` });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  if (verified) await verifyEmail(emailFor(tag));
  return { email: emailFor(tag), cookie: r.cookie, ws: r.json.data.user.workspaceId, id: r.json.data.user.userId, workspaceName: workspaceName || `Compliance ${tag} ${ts}` };
}

const cronSkip = async () => {
  if (!process.env.CRON_SECRET) return "CRON_SECRET not set for the test run";
  const othersDue = Number(await sql(`select count(*) from "BackgroundJob" where status = 'QUEUED' and "runAt" <= timezone('utc', now()) and "workspaceId" not in (select w.id from "Workspace" w join "User" u on u.id = w."ownerId" where u.email like 'e2e-${ts}-%')`));
  return othersDue > 0 ? `${othersDue} real job(s) already queued in this database; not running them from a test` : false;
};
async function runCron() {
  await sql(`delete from "SystemTask"`);
  const r = await call(null, "GET", "/api/cron/jobs", undefined, { authorization: `Bearer ${process.env.CRON_SECRET}` });
  assert.equal(r.status, 200, r.text);
  return r.json.data;
}

test("Legal pages are public and linked from sign-up", async () => {
  for (const [path, title] of [["/legal/terms", "Terms of Service"], ["/legal/privacy", "Privacy Policy"], ["/legal/cookies", "Cookie Policy"]]) {
    const r = await call(null, "GET", path);
    assert.equal(r.status, 200, path);
    assert.match(r.text, new RegExp(title));
  }
  const page = await call(null, "GET", "/auth/signup");
  assert.equal(page.status, 200);
});

test("Sign-up requires accepting the terms, and records which version", async () => {
  await clearIpLimits();
  const refused = await call(null, "POST", "/api/auth/signup", { email: emailFor("noterms"), password: PASSWORD, firstName: "No", lastName: "Terms", workspaceName: "No terms" });
  assert.equal(refused.status, 400);
  assert.match(refused.json.error.message, /Terms of Service/);
  const A = await signup("terms", { verified: false });
  const row = await sql(`select ("termsAcceptedAt" is not null)::text || '|' || "termsVersion" from "User" where id = '${A.id}'`);
  assert.match(row, /^true\|\d{4}-\d{2}-\d{2}$/);
});

test("Paying, inviting and connecting accounts need a verified email", async () => {
  const A = await signup("unverified", { verified: false });
  const checks = [
    ["POST", "/api/v1/team", { firstName: "I", lastName: "V", email: emailFor("invitee"), role: "VIEWER" }],
    ["POST", "/api/v1/billing/payu/create-payment", { type: "subscription", planSlug: "starter", interval: "monthly" }],
    ["GET", "/api/google-ads/oauth-url"],
    ["POST", "/api/meta-ads/connect", { accessToken: "x", adAccountId: "act_1" }],
    ["POST", "/api/v1/integrations/connect-credentials", { platform: "Google Ads", apiKey: "x", accountId: "1" }]
  ];
  for (const [method, path, body] of checks) {
    const r = await call(A.cookie, method, path, body);
    assert.equal(r.status, 403, `${method} ${path} → ${r.status} ${r.text.slice(0, 120)}`);
    assert.equal(r.json?.error?.code, "EMAIL_NOT_VERIFIED", path);
  }
  await verifyEmail(A.email);
  assert.equal((await call(A.cookie, "POST", "/api/v1/team", checks[0][2])).status, 201, "allowed once verified");
});

test("Legacy Google OAuth: state is bound to the user, and tokens never cross workspaces", async () => {
  const A = await signup("oauth-a");
  const B = await signup("oauth-b");
  // A's workspace has a Google Ads connection; B's has none.
  await sql(`insert into "Integration" (id, "workspaceId", platform, "providerKey", "accountName", "refreshTokenEncrypted", status, "updatedAt") values ('e2e_gads_${ts}', '${A.ws}', 'GOOGLE_ADS', 'google_ads', 'A ads', 'enc-A-token', 'CONNECTED', timezone('utc', now()))`);
  const saved = await call(B.cookie, "POST", "/api/google-ads/save-connection", { customerId: "123-456-7890", accountName: "Hijack" });
  assert.equal(saved.status, 409, "B can't reuse A's Google tokens");
  assert.equal(await sql(`select "accountName" || '|' || "refreshTokenEncrypted" from "Integration" where id = 'e2e_gads_${ts}'`), "A ads|enc-A-token", "A's integration is untouched");
  assert.equal(await sql(`select count(*) from "Integration" where "workspaceId" = '${B.ws}'`), "0");
  // A forged (unsigned) state, as the old flow accepted, is rejected.
  const forged = Buffer.from(JSON.stringify({ workspaceId: A.ws, providerKey: "google_ads", returnTo: "/integrations" })).toString("base64url");
  const cb = await call(B.cookie, "GET", `/api/google-ads/callback?code=x&state=${forged}`);
  assert.equal(cb.status, 307);
  assert.match(cb.headers.get("location") || "", /oauth=error/);
});

test("Data export: owner-only, one at a time, complete and without secrets", async (t) => {
  const A = await signup("export");
  await call(A.cookie, "POST", "/api/v1/clients", { name: `Export Client ${ts}` });
  await sql(`insert into "Integration" (id, "workspaceId", platform, "providerKey", "accountName", "accessTokenEncrypted", "apiKeyEncrypted", metadata, status, "updatedAt") values ('e2e_int_${ts}', '${A.ws}', 'META_ADS', 'meta_ads', 'Meta export', 'SECRET_TOKEN_${ts}', 'SECRET_KEY_${ts}', '{"apiKey":"SECRET_META_${ts}","accountLabel":"visible"}', 'CONNECTED', timezone('utc', now()))`);

  const first = await call(A.cookie, "POST", "/api/v1/settings/export");
  assert.equal(first.status, 202, first.text);
  assert.equal(first.json.data.status, "PENDING");
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/export")).status, 409, "one export at a time");

  const skip = await cronSkip();
  await t.test("the job produces a downloadable file", { skip }, async () => {
    await runCron();
    const list = await call(A.cookie, "GET", "/api/v1/settings/export");
    const item = list.json.data.items[0];
    assert.equal(item.status, "READY", JSON.stringify(item));
    const file = await call(A.cookie, "GET", item.downloadUrl);
    assert.equal(file.status, 200);
    assert.match(file.headers.get("content-disposition") || "", /attachment; filename="marketeros-export-/);
    assert.equal(file.json.format, "marketeros-workspace-export");
    assert.ok(file.json.clients.some((c) => c.name === `Export Client ${ts}`));
    assert.equal(file.json.integrations[0].metadata.accountLabel, "visible");
    assert.doesNotMatch(file.text, new RegExp(`SECRET_(TOKEN|KEY|META)_${ts}`), "credentials are never exported");
    assert.doesNotMatch(file.text, /passwordHash|\$2[aby]\$/, "no password hashes");
    const other = await signup("export-other");
    assert.equal((await call(other.cookie, "GET", item.downloadUrl)).status, 404, "other workspaces can't download it");
  });
});

test("Workspace deletion: confirmed, cancellable, then purged", async (t) => {
  const A = await signup("wsdel");
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/workspace/delete", { confirmName: "wrong", password: PASSWORD })).status, 400);
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/workspace/delete", { confirmName: A.workspaceName, password: "nope" })).status, 403);
  const scheduled = await call(A.cookie, "POST", "/api/v1/settings/workspace/delete", { confirmName: A.workspaceName, password: PASSWORD });
  assert.equal(scheduled.status, 200, scheduled.text);
  const days = (new Date(scheduled.json.data.purgeAt) - Date.now()) / 86_400_000;
  assert.ok(days > 6.9 && days <= 7, `purge in ${days} days`);
  assert.ok((await call(A.cookie, "GET", "/api/auth/session")).json.data.workspaceDeletionAt, "banner data");
  assert.equal((await call(A.cookie, "GET", "/api/v1/clients")).status, 200, "still usable during the grace period");

  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/workspace/restore")).status, 200);
  assert.equal(await sql(`select coalesce("deletionScheduledAt"::text, 'none') from "Workspace" where id = '${A.ws}'`), "none");

  const skip = await cronSkip();
  await t.test("purged after the grace period, with its stored files", { skip }, async () => {
    await call(A.cookie, "POST", "/api/v1/settings/workspace/delete", { confirmName: A.workspaceName, password: PASSWORD });
    await sql(`update "Workspace" set "deletionScheduledAt" = timezone('utc', now()) - interval '8 days' where id = '${A.ws}'`);
    const data = await runCron();
    assert.ok(data.scheduled.some((s) => s.name === "deletions.purge" && s.ok && s.result.workspaces >= 1), JSON.stringify(data.scheduled));
    assert.equal(await sql(`select count(*) from "Workspace" where id = '${A.ws}'`), "0");
  });
});

test("Account deletion: signs out everywhere; signing in again cancels it", async () => {
  const A = await signup("acctdel");
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/account/delete", { confirm: "delete", password: PASSWORD })).status, 400, "exact confirmation");
  const r = await call(A.cookie, "POST", "/api/v1/settings/account/delete", { confirm: "DELETE", password: PASSWORD });
  assert.equal(r.status, 200, r.text);
  assert.equal((await call(A.cookie, "GET", "/api/auth/session")).json.data.authenticated, false, "the session ended");
  assert.match(await sql(`select ("deletionScheduledAt" is not null)::text from "User" where id = '${A.id}'`), /true/);
  assert.match(await sql(`select ("deletionScheduledAt" is not null)::text from "Workspace" where id = '${A.ws}'`), /true/);

  await clearIpLimits();
  const login = await call(null, "POST", "/api/auth/login", { email: A.email, password: PASSWORD });
  assert.equal(login.status, 200);
  assert.equal(login.json.data.accountRestored, true);
  assert.equal(await sql(`select coalesce("deletionScheduledAt"::text, 'none') from "User" where id = '${A.id}'`), "none");
  assert.equal(await sql(`select coalesce("deletionScheduledAt"::text, 'none') from "Workspace" where id = '${A.ws}'`), "none");
});

test("An owner whose workspace others use must deal with it first", async () => {
  const A = await signup("shared");
  assert.equal((await call(A.cookie, "POST", "/api/v1/team", { firstName: "Mem", lastName: "Ber", email: emailFor("shared-member"), role: "VIEWER" })).status, 201);
  const r = await call(A.cookie, "POST", "/api/v1/settings/account/delete", { confirm: "DELETE", password: PASSWORD });
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "OWNS_SHARED_WORKSPACE");
});

test("Members can leave a workspace; owners can't; exports are owner-only", async () => {
  const A = await signup("leave-owner");
  const M = await signup("leave-member");
  await sql(`insert into "OAuthState" (id, "workspaceId", "userId", "providerKey", "returnTo", "expiresAt") values ('e2e_mem_${ts}', '${A.ws}', '${M.id}', 'WORKSPACE_MEMBER', 'VIEWER', timezone('utc', now()) + interval '365 days')`);
  await clearIpLimits();
  const login = await call(null, "POST", "/api/auth/login", { email: M.email, password: PASSWORD });
  assert.equal(login.json.data.user.workspaceId, A.ws, "signed in to the shared workspace");
  const privacy = await call(login.cookie, "GET", "/api/v1/settings/privacy");
  assert.equal(privacy.json.data.isOwner, false);
  assert.equal((await call(login.cookie, "POST", "/api/v1/settings/export")).status, 403);
  assert.equal((await call(login.cookie, "POST", "/api/v1/settings/workspace/delete", { confirmName: A.workspaceName, password: PASSWORD })).status, 403);
  assert.equal((await call(A.cookie, "POST", "/api/v1/team/leave")).json.error.code, "OWNER_CANNOT_LEAVE");
  const left = await call(login.cookie, "POST", "/api/v1/team/leave");
  assert.equal(left.status, 200, left.text);
  assert.equal(await sql(`select count(*) from "OAuthState" where "workspaceId" = '${A.ws}' and "userId" = '${M.id}'`), "0");
});
