/**
 * Step 11 security: nonce-based Content-Security-Policy, immediate session revocation across server instances,
 * and TOTP two-factor sign-in (replay protection, recovery codes, attempt limits).
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
const PASSWORD = "Passw0rd!e2e";
after(() => cleanupRun(ts));

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;
async function call(cookie, method, path, body) {
  const res = await fetch(BASE + path, { method, redirect: "manual", headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: res.headers, cookie: cookieFrom(res) };
}
async function signup(tag) {
  await clearIpLimits();
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await call(null, "POST", "/api/auth/signup", { email, password: PASSWORD, firstName: "Sec", lastName: tag, acceptTerms: true, workspaceName: `Security II ${tag}` });
  assert.equal(r.status, 201, r.text);
  await verifyEmail(email);
  return { email, cookie: r.cookie, id: r.json.data.user.userId };
}
const login = async (email) => { await clearIpLimits(); return call(null, "POST", "/api/auth/login", { email, password: PASSWORD }); };

/** RFC 6238 code for a 30-second step (what an authenticator app shows). */
function totp(secret, step) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
}
const step = () => Math.floor(Date.now() / 30000);

test("Pages get a per-request script nonce instead of 'unsafe-inline'", async () => {
  const a = await call(null, "GET", "/auth/login");
  const b = await call(null, "GET", "/auth/login");
  const csp = a.headers.get("content-security-policy") || "";
  const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] || "";
  assert.match(scriptSrc, /'nonce-[A-Za-z0-9+/=]+'/);
  assert.doesNotMatch(scriptSrc, /unsafe-inline/);
  assert.match(csp, /frame-ancestors 'none'/);
  const nonce = /'nonce-([^']+)'/.exec(scriptSrc)[1];
  assert.notEqual(nonce, /'nonce-([^']+)'/.exec(b.headers.get("content-security-policy"))[1], "fresh nonce per response");
  const scripts = [...a.text.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(scripts.length > 0);
  for (const tag of scripts) assert.ok(tag.includes(`nonce="${nonce}"`), `script without the nonce: ${tag.slice(0, 80)}`);
  const api = await call(null, "GET", "/api/health");
  assert.equal(api.headers.get("content-security-policy"), "default-src 'none'; frame-ancestors 'none'");
});

test("A revoked session stops working at once, even where it was cached", async () => {
  const A = await signup("revoke");
  const second = await login(A.email);
  assert.equal((await call(second.cookie, "GET", "/api/v1/clients")).status, 200, "cached on this server");
  // Another instance revokes it (e.g. "sign out everywhere", removal from the team): only the row disappears.
  const tokenHash = createHash("sha256").update(decodeURIComponent(second.cookie.split("=")[1])).digest("hex");
  await sql(`delete from "Session" where "tokenHash" = '${tokenHash}'`);
  assert.equal((await call(second.cookie, "GET", "/api/v1/clients")).status, 401);
  assert.equal((await call(A.cookie, "GET", "/api/v1/clients")).status, 200, "other sessions are unaffected");
});

test("Two-factor authentication", async (t) => {
  const A = await signup("2fa");
  const setup = await call(A.cookie, "POST", "/api/v1/settings/2fa/setup");
  assert.equal(setup.status, 200, setup.text);
  const { secret, otpauthUrl, qrCode } = setup.json.data;
  assert.match(otpauthUrl, /^otpauth:\/\/totp\/MarketerOS(:|%3A)/);
  assert.match(qrCode, /^data:image\/png;base64,/);
  assert.equal((await call(A.cookie, "POST", "/api/v1/settings/2fa/enable", { code: "000000" })).status, 400, "wrong code doesn't enable");
  const enabled = await call(A.cookie, "POST", "/api/v1/settings/2fa/enable", { code: totp(secret, step()) });
  assert.equal(enabled.status, 200, enabled.text);
  const recovery = enabled.json.data.recoveryCodes;
  assert.equal(recovery.length, 10);
  assert.doesNotMatch(await sql(`select array_to_string("recoveryCodeHashes", ',') || "secretEncrypted" from "UserTwoFactor" where "userId" = '${A.id}'`), new RegExp(recovery[0]), "stored hashed / encrypted only");

  await t.test("the password alone no longer signs in", async () => {
    const r = await login(A.email);
    assert.equal(r.status, 200);
    assert.equal(r.json.data.twoFactorRequired, true);
    assert.equal(r.cookie, null, "no session yet");
  });

  await t.test("a valid code completes sign-in, and can't be replayed", async () => {
    const code = totp(secret, step() + 1); // the enable step was just used, so take the next one (allowed drift)
    const ok = await call(null, "POST", "/api/auth/login/2fa", { challenge: (await login(A.email)).json.data.challenge, code });
    assert.equal(ok.status, 200, ok.text);
    assert.ok(ok.cookie);
    assert.equal((await call(ok.cookie, "GET", "/api/v1/clients")).status, 200);
    const replay = await call(null, "POST", "/api/auth/login/2fa", { challenge: (await login(A.email)).json.data.challenge, code });
    assert.equal(replay.status, 401);
  });

  await t.test("recovery codes work once each", async () => {
    const first = await call(null, "POST", "/api/auth/login/2fa", { challenge: (await login(A.email)).json.data.challenge, code: recovery[0].toLowerCase() });
    assert.equal(first.status, 200, first.text);
    assert.equal(first.json.data.usedRecoveryCode, true);
    const again = await call(null, "POST", "/api/auth/login/2fa", { challenge: (await login(A.email)).json.data.challenge, code: recovery[0] });
    assert.equal(again.status, 401);
  });

  await t.test("forged challenges and guessing are refused", async () => {
    const challenge = (await login(A.email)).json.data.challenge;
    const [payload, sig] = challenge.split(".");
    const forged = Buffer.from(JSON.stringify({ s: { userId: A.id, workspaceId: "x", role: "OWNER" }, exp: Date.now() + 60000 })).toString("base64url");
    assert.equal((await call(null, "POST", "/api/auth/login/2fa", { challenge: `${forged}.${sig}`, code: "123456" })).json.error.code, "CHALLENGE_EXPIRED");
    assert.ok(payload);
    let last;
    for (let i = 0; i < 6; i++) last = await call(null, "POST", "/api/auth/login/2fa", { challenge, code: "000000" });
    assert.equal(last.status, 429);
    await sql(`delete from "RateLimit" where key = 'login:2fa:${A.id}'`);
  });

  await t.test("turning it off needs the password and a code", async () => {
    assert.equal((await call(A.cookie, "POST", "/api/v1/settings/2fa/disable", { password: "wrong", code: recovery[1] })).status, 403);
    const off = await call(A.cookie, "POST", "/api/v1/settings/2fa/disable", { password: PASSWORD, code: recovery[1] });
    assert.equal(off.status, 200, off.text);
    const r = await login(A.email);
    assert.equal(r.json.data.twoFactorRequired, undefined);
    assert.ok(r.cookie);
  });
});
