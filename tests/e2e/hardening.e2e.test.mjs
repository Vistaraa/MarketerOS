/**
 * Regression tests for step 7: AI error mapping and cost controls, lead ownership, input validation, and
 * direct-to-storage uploads (the latter only when the server uses S3 storage).
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, sql, clearIpLimits, cleanupRun, makePng } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

const cookieFrom = (res) => /marketeros_session=[^;]+/.exec(res.headers.get("set-cookie") || "")?.[0] || null;

async function call(cookie, method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" }, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null), headers: res.headers };
}

async function signup(tag) {
  const res = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `e2e-${ts}-${tag}@example.test`, password: "Passw0rd!e2e", firstName: "Hard", lastName: tag, acceptTerms: true, workspaceName: `Hardening ${tag}` }) });
  const json = await res.json();
  assert.equal(res.status, 201, JSON.stringify(json));
  return { cookie: cookieFrom(res), ws: json.data.user.workspaceId, id: json.data.user.userId };
}

/** Records AI usage past the plan's allowance, so generation is refused before any provider call. */
async function exhaustCredits(workspaceId) {
  const limit = Number(await sql(`select coalesce(p."monthlyAICredits", 10000) from "Subscription" s join "Plan" p on p."id" = s."planId" where s."workspaceId" = '${workspaceId}'`) || 10000);
  await sql(`insert into "AIRequest" (id, "workspaceId", prompt, status, "tokensTotal", "createdAt") values ('e2e_ai_${workspaceId}', '${workspaceId}', 'seed', 'complete', ${(limit + 1) * 100}, timezone('utc', now()))`);
  return limit;
}

let A, B;
test("setup", async () => {
  await clearIpLimits();
  A = await signup("a");
  B = await signup("b");
});

test("AI failures are reported with clear, mapped errors (never raw provider text)", async () => {
  const r = await call(A.cookie, "POST", "/api/v1/ai/generate", { prompt: "One short headline for running shoes", kind: "content" });
  if (r.status === 201) return assert.ok(r.json.data.output);
  assert.match(r.json?.error?.code || "", /^AI_/);
  assert.doesNotMatch(r.json.error.message, /status code|no body/i);
});

test("AI credits: generation stops at the plan allowance, and Billing shows the same usage", async () => {
  const limit = await exhaustCredits(A.ws);
  const r = await call(A.cookie, "POST", "/api/v1/ai/generate", { prompt: "Another headline", kind: "content" });
  assert.equal(r.status, 402);
  assert.equal(r.json.error.code, "AI_CREDITS_EXHAUSTED");
  const billing = await call(A.cookie, "GET", "/api/v1/billing");
  assert.ok(Number(JSON.stringify(billing.json).match(/"aiCreditsUsed":(\d+)/)?.[1]) > limit);
});

test("AI rate limit: a burst from one user gets 429 with Retry-After", async () => {
  await exhaustCredits(B.ws); // rate limits are checked first; exhausted credits mean no provider calls are made
  let last;
  for (let i = 0; i < 21; i++) last = await call(B.cookie, "POST", "/api/v1/ai/generate", { prompt: "burst", kind: "content" });
  assert.equal(last.status, 429);
  assert.equal(last.json.error.code, "AI_RATE_LIMITED");
  assert.ok(Number(last.headers.get("retry-after")) > 0);
});

test("Leads can only be owned by members of the workspace", async () => {
  let r = await call(A.cookie, "POST", "/api/v1/leads", { firstName: "L", lastName: "O", email: `lo-${ts}@example.test`, ownerId: B.id });
  assert.equal(r.status, 400);
  assert.equal(r.json.error.code, "INVALID_LEAD_OWNER");
  r = await call(A.cookie, "POST", "/api/v1/leads", { firstName: "L", lastName: "O", email: `lo2-${ts}@example.test`, ownerId: A.id });
  assert.equal(r.status, 201);
  const leadId = r.json.data.id;
  r = await call(A.cookie, "PATCH", `/api/v1/leads/${leadId}`, { ownerId: B.id });
  assert.equal(r.status, 400);
  r = await call(A.cookie, "PATCH", `/api/v1/leads/${leadId}`, { score: "not-a-number" });
  assert.equal(r.status, 400, "invalid updates are validated, not passed to the database");
  assert.doesNotMatch(r.json.error.message, /prisma|invocation/i);
});

test("Direct-to-storage uploads (S3 only)", async (t) => {
  const png = makePng(40, 20);
  const probe = await call(A.cookie, "POST", "/api/v1/content-studio/media/upload-url", { name: "direct.png", type: "image/png", size: png.length, width: 40, height: 20 });
  if (probe.status === 409 && probe.json?.error?.code === "DIRECT_UPLOAD_UNAVAILABLE") {
    t.skip("server uses local storage; direct uploads need STORAGE_DRIVER=s3");
    return;
  }
  assert.equal(probe.status, 200, JSON.stringify(probe.json));
  const { uploadUrl, headers, token } = probe.json.data;
  assert.equal((await fetch(uploadUrl, { method: "PUT", headers, body: png })).status, 200);

  await t.test("tickets are bound to their workspace and can't be tampered with", async () => {
    assert.equal((await call(B.cookie, "POST", "/api/v1/content-studio/media/complete", { token })).status, 400);
    assert.equal((await call(A.cookie, "POST", "/api/v1/content-studio/media/complete", { token: token.slice(0, -3) + "abc" })).status, 400);
  });

  const done = await call(A.cookie, "POST", "/api/v1/content-studio/media/complete", { token });
  await t.test("complete verifies and registers the file, once", async () => {
    assert.equal(done.status, 201);
    assert.equal(done.json.data.size, png.length);
    assert.equal((await call(A.cookie, "POST", "/api/v1/content-studio/media/complete", { token })).status, 409);
  });

  await t.test("the stored file is served back byte-for-byte, sandboxed", async () => {
    const res = await fetch(BASE + done.json.data.url, { headers: { cookie: A.cookie } });
    assert.equal(res.status, 200);
    assert.ok(Buffer.from(await res.arrayBuffer()).equals(png));
    assert.match(res.headers.get("content-security-policy") || "", /sandbox/);
  });

  await t.test("a file whose content doesn't match its declared type is discarded", async () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    const r = await call(A.cookie, "POST", "/api/v1/content-studio/media/upload-url", { name: "evil.png", type: "image/png", size: html.length });
    await fetch(r.json.data.uploadUrl, { method: "PUT", headers: r.json.data.headers, body: html });
    const c = await call(A.cookie, "POST", "/api/v1/content-studio/media/complete", { token: r.json.data.token });
    assert.equal(c.status, 415);
    assert.equal(c.json.error.code, "CONTENT_MISMATCH");
  });

  await t.test("disallowed types and sizes are refused before any URL is issued", async () => {
    assert.equal((await call(A.cookie, "POST", "/api/v1/content-studio/media/upload-url", { name: "x.svg", type: "image/svg+xml", size: 100 })).status, 415);
    assert.equal((await call(A.cookie, "POST", "/api/v1/content-studio/media/upload-url", { name: "big.mp4", type: "video/mp4", size: 26 * 1024 * 1024 })).status, 413);
  });

  await t.test("deleting the asset removes the stored object", async () => {
    await call(A.cookie, "DELETE", `/api/v1/content-studio/media/${done.json.data.id}`);
    const res = await fetch(uploadUrl.split("?")[0]);
    assert.ok([403, 404].includes(res.status), `object still reachable (${res.status})`);
  });
});
