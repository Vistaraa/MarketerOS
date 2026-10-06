/**
 * Broad end-to-end coverage: health, auth flows, every page, API reads, CRUD, workspace isolation.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, sql, clearIpLimits, cleanupRun, verifyEmail } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

async function req(method, path, { cookie, body, headers = {}, redirect = "manual" } = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, {
    method,
    redirect,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const setCookie = res.headers.get("set-cookie");
  return { status: res.status, json, text, ms, setCookie, location: res.headers.get("location") };
}

function cookieFrom(setCookie) {
  const m = /marketeros_session=([^;]+)/.exec(setCookie || "");
  return m ? `marketeros_session=${m[1]}` : null;
}

async function signup(tag) {
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await req("POST", "/api/auth/signup", {
    body: { email, password: "Passw0rd!e2e", firstName: "E2E", lastName: tag.toUpperCase(), acceptTerms: true, workspaceName: `E2E Workspace ${tag.toUpperCase()} ${ts}` }
  });
  if (r.status === 201) await verifyEmail(email);
  return { email, r, cookie: cookieFrom(r.setCookie), ws: r.json?.data?.user?.workspaceId };
}

test("Platform: pages, APIs, CRUD, isolation", async (t) => {
  const rec = (area, name, pass, detail = "") => t.test(`[${area}] ${name}`, () => assert.ok(pass, detail || name));
  await clearIpLimits();
  const ts = Date.now();








    // ---- Health & unauthenticated access ----
    let r = await req("GET", "/api/health");
    await rec("Platform", "GET /api/health returns ok", r.status === 200 && r.json?.ok === true, `${r.status} in ${r.ms}ms`);

    r = await req("GET", "/api/v1/leads");
    await rec("Auth", "v1 API without credentials → 401", r.status === 401, `${r.status}`);

    r = await req("GET", "/overview");
    await rec("Auth", "Protected page without session → redirect to login", [302, 307].includes(r.status) && /\/auth\/login/.test(r.location || ""), `${r.status} → ${r.location}`);

    // ---- Signup validation ----
    r = await req("POST", "/api/auth/signup", { body: { email: "not-an-email", password: "x" } });
    await rec("Auth", "Signup rejects invalid payload", r.status === 400, `${r.status}: ${r.json?.error?.message}`);

    // ---- Signup A and B (B last so it becomes the newest workspace) ----
    const A = await signup("a");
    await rec("Auth", "Signup user A", A.r.status === 201 && !!A.cookie, `${A.r.status} in ${A.r.ms}ms`);
    const B = await signup("b");
    await rec("Auth", "Signup user B", B.r.status === 201 && !!B.cookie, `${B.r.status} in ${B.r.ms}ms`);

    r = await req("POST", "/api/auth/signup", { body: { email: A.email, password: "Passw0rd!e2e", firstName: "x", lastName: "y", acceptTerms: true, workspaceName: "dup" } });
    await rec("Auth", "Duplicate email signup rejected", r.status === 400, `${r.status}`);

    r = await req("GET", "/api/auth/session", { cookie: A.cookie });
    await rec("Auth", "Session endpoint returns user A", r.json?.data?.authenticated === true && r.json?.data?.user?.email === A.email, `ws=${r.json?.data?.user?.workspaceId}`);

    // ---- Login ----
    r = await req("POST", "/api/auth/login", { body: { email: A.email, password: "wrong-password" } });
    await rec("Auth", "Login with wrong password → 401", r.status === 401, `${r.status}`);
    r = await req("POST", "/api/auth/login", { body: { email: A.email.toUpperCase(), password: "Passw0rd!e2e" } });
    await rec("Auth", "Login (case-insensitive email) succeeds", r.status === 200 && !!cookieFrom(r.setCookie), `${r.status} → next=${r.json?.data?.next}`);

    // Brute-force throttling probe
    let throttled = false;
    for (let i = 0; i < 15; i++) {
      const x = await req("POST", "/api/auth/login", { body: { email: A.email, password: "wrong-pass-" + i } });
      if (x.status === 429) { throttled = true; break; }
    }
    await rec("Security", "Login brute-force throttling (15 bad attempts)", throttled, throttled ? "429 returned" : "no 429 / lockout after 15 failed attempts");

    // ---- Page rendering (authenticated) ----
    const pages = ["/overview", "/dashboard", "/campaigns", "/campaigns/create", "/leads", "/clients", "/analytics", "/ai-insights",
      "/automation", "/reports", "/integrations", "/content-studio", "/content-studio/calendar", "/content-studio/library",
      "/content-studio/media", "/content-studio/templates", "/content-studio/hashtags", "/content-studio/settings",
      "/billing", "/settings", "/team", "/notifications", "/search", "/play-console", "/youtube", "/youtube-ads", "/youtube/guide",
      "/onboarding", "/onboarding/brand", "/onboarding/goals", "/onboarding/platforms", "/onboarding/complete",
      "/auth/login", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/auth/set-password"];
    for (const p of pages) {
      const x = await req("GET", p, { cookie: A.cookie });
      const errorPage = /Application error|Unhandled Runtime Error|Internal Server Error/.test(x.text);
      await rec("Pages", `GET ${p}`, x.status === 200 && !errorPage, `${x.status} in ${x.ms}ms${errorPage ? " (error markup)" : ""}`);
    }

    // ---- API reads ----
    const reads = ["overview", "campaigns", "leads", "clients", "integrations", "content", "ai/insights", "notifications", "reports",
      "automation", "billing", "team", "settings", "search?q=e2e", "social/posts", "social/accounts", "play-console/kpis", "play-console/inbox", "play-console/releases"];
    for (const p of reads) {
      const x = await req("GET", "/api/v1/" + p, { cookie: A.cookie });
      await rec("API read", `GET /api/v1/${p}`, x.status === 200 && x.json && !x.json.error, `${x.status} in ${x.ms}ms${x.json?.error ? " " + x.json.error.message : ""}`);
    }

    // ---- CRUD: Leads ----
    r = await req("POST", "/api/v1/leads", { cookie: A.cookie, body: { firstName: "Lead", lastName: "One", email: `lead-${ts}@example.test`, company: "Acme", estimatedValue: 5000 } });
    const leadId = r.json?.data?.id;
    await rec("CRUD", "Create lead", r.status === 201 && !!leadId, `${r.status}`);
    r = await req("POST", "/api/v1/leads", { cookie: A.cookie, body: { firstName: "", email: "bad" } });
    await rec("CRUD", "Create lead rejects invalid input", r.status === 400, `${r.status}: ${r.json?.error?.message}`);
    r = await req("GET", "/api/v1/leads", { cookie: A.cookie });
    const leadItems = r.json?.data?.items || r.json?.data || [];
    await rec("CRUD", "New lead appears in list", JSON.stringify(leadItems).includes(leadId || "__none__"), "");
    r = await req("PATCH", `/api/v1/leads/${leadId}`, { cookie: A.cookie, body: { status: "QUALIFIED", score: 80 } });
    await rec("CRUD", "Update lead", r.status === 200, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);
    r = await req("GET", `/api/v1/leads/${leadId}`, { cookie: A.cookie });
    await rec("CRUD", "Get lead detail", r.status === 200, `${r.status}`);

    // ---- Tenant isolation (B touching A's lead) ----
    r = await req("GET", `/api/v1/leads/${leadId}`, { cookie: B.cookie });
    await rec("Isolation", "User B cannot read A's lead", r.status === 404 || r.status === 403, `${r.status}`);
    r = await req("PATCH", `/api/v1/leads/${leadId}`, { cookie: B.cookie, body: { status: "LOST" } });
    await rec("Isolation", "User B cannot update A's lead", r.status === 404 || r.status === 403, `${r.status}`);
    r = await req("DELETE", `/api/v1/leads/${leadId}`, { cookie: B.cookie });
    await rec("Isolation", "User B cannot delete A's lead", r.status === 404 || r.status === 403, `${r.status}`);

    // ---- Lead → client conversion ----
    r = await req("POST", `/api/v1/leads/${leadId}/convert`, { cookie: A.cookie });
    await rec("CRUD", "Convert lead to client", r.status === 200 && !!r.json?.data?.client?.id, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);

    // ---- Clients ----
    r = await req("POST", "/api/v1/clients", { cookie: A.cookie, body: { name: "E2E Client", industry: "Retail", monthlyBudget: 1000 } });
    const clientId = r.json?.data?.id;
    await rec("CRUD", "Create client", r.status === 201 && !!clientId, `${r.status}`);
    r = await req("PATCH", `/api/v1/clients/${clientId}`, { cookie: A.cookie, body: { industry: "E-commerce" } });
    await rec("CRUD", "Update client", r.status === 200, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);
    r = await req("GET", `/api/v1/clients/${clientId}`, { cookie: B.cookie });
    await rec("Isolation", "User B cannot read A's client", r.status === 404 || r.status === 403, `${r.status}`);

    // ---- Automation ----
    r = await req("POST", "/api/v1/automation", { cookie: A.cookie, body: { name: "E2E rule", trigger: "ROAS_BELOW", action: "PAUSE_CAMPAIGN", triggerConfig: { threshold: 1.5 } } });
    const autoId = r.json?.data?.id;
    await rec("CRUD", "Create automation rule", r.status === 201 && !!autoId, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);
    r = await req("POST", `/api/v1/automation/${autoId}/run`, { cookie: A.cookie });
    await rec("CRUD", "Run automation rule", r.status === 200, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);

    // ---- Content ----
    r = await req("POST", "/api/v1/content", { cookie: A.cookie, body: { title: "E2E post", body: "Hello", platform: "INSTAGRAM" } });
    const contentId = r.json?.data?.id;
    await rec("CRUD", "Create content item", r.status === 201 && !!contentId, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);

    // ---- Reports ----
    r = await req("POST", "/api/v1/reports", { cookie: A.cookie, body: { name: "E2E report" } });
    const reportId = r.json?.data?.id;
    await rec("CRUD", "Queue report generation", r.status === 202 && !!reportId, `${r.status}${r.json?.error ? " " + r.json.error.message : ""}`);

    // ---- Campaigns ----
    r = await req("POST", "/api/v1/campaigns", { cookie: A.cookie, body: { name: "E2E Campaign", platforms: ["Google Ads"], budget: 500, dailyBudget: 50, objective: "SALES" } });
    await rec("Campaigns", "Create campaign without connected integration is blocked", r.status === 400 && r.json?.error?.code === "PLATFORM_NOT_CONNECTED", `${r.status} ${r.json?.error?.code}`);

    // ---- AI ----
    r = await req("POST", "/api/v1/ai/generate", { cookie: A.cookie, body: { prompt: "Write a 1-line ad headline for running shoes", kind: "content" } });
    // Succeeds when an AI provider is configured and available; otherwise it must fail with a clear, mapped error.
    const providerSide = ["AI_NOT_CONFIGURED", "AI_QUOTA_EXCEEDED", "AI_PROVIDER_BUSY", "AI_PROVIDER_UNAVAILABLE", "AI_TIMEOUT"];
    await rec("AI", "AI content generation (or a clearly mapped provider error)", (r.status === 201 && !!r.json?.data?.output) || providerSide.includes(r.json?.error?.code), `${r.status} in ${r.ms}ms${r.json?.error ? " " + r.json.error.code + ": " + r.json.error.message : ""}`);

    // ---- Deletes ----
    r = await req("DELETE", `/api/v1/content/${contentId}`, { cookie: A.cookie });
    await rec("CRUD", "Delete content", r.status === 200, `${r.status}`);
    r = await req("DELETE", `/api/v1/automation/${autoId}`, { cookie: A.cookie });
    await rec("CRUD", "Delete automation", r.status === 200, `${r.status}`);
    r = await req("DELETE", `/api/v1/clients/${clientId}`, { cookie: A.cookie });
    await rec("CRUD", "Delete client", r.status === 200, `${r.status}`);
    r = await req("DELETE", `/api/v1/reports/${reportId}`, { cookie: A.cookie });
    await rec("CRUD", "Delete report", r.status === 200, `${r.status}`);

    // ---- SECURITY: forged bearer token ----
    r = await req("GET", "/api/v1/settings", { headers: { authorization: "Bearer totally-forged-token" } });
    const leaked = JSON.stringify(r.json || {});
    const exposesB = leaked.includes(B.ws || "__none__") || leaked.includes(`E2E Workspace B ${ts}`);
    await rec("Security", "Forged Bearer token is rejected by /api/v1", r.status === 401, `${r.status}${exposesB ? " — returned newest workspace (test workspace B) data with OWNER role" : ""}`);
    r = await req("POST", "/api/v1/leads", { headers: { authorization: "Bearer forged" }, body: { firstName: "Forged", lastName: "Write", email: `forged-${ts}@example.test` } });
    await rec("Security", "Forged Bearer token cannot write data", r.status === 401, `${r.status}${r.status === 201 ? " — lead created in newest workspace (B) without auth" : ""}`);
    r = await req("GET", "/api/v1/team", { cookie: "marketeros_session=garbage.garbage" });
    await rec("Security", "Forged session cookie is rejected by /api/v1", r.status === 401, `${r.status}`);

    // ---- SECURITY: password reset without token ----
    r = await req("POST", "/api/auth/forgot-password", { body: { email: `nobody-${ts}@example.test` } });
    await rec("Security", "Forgot-password does not reveal account existence", r.json?.data?.userFound === undefined, `userFound=${r.json?.data?.userFound}`);
    r = await req("POST", "/api/auth/reset-password", { body: { email: A.email, password: "AttackerChosen123" } });
    const resetOk = r.status === 200;
    const takeover = await req("POST", "/api/auth/login", { body: { email: A.email, password: "AttackerChosen123" } });
    await rec("Security", "Password reset requires a token (no takeover by email alone)", !(resetOk && takeover.status === 200), `reset=${r.status}, login-with-new-pw=${takeover.status}`);

    r = await req("POST", "/api/auth/verify-email", { body: {} });
    await rec("Security", "Email verification actually verifies something", !(r.status === 200 && r.json?.data?.success), `${r.status} — returns success unconditionally`);

    // ---- Logout invalidates session ----
    const C = (await req("POST", "/api/auth/login", { body: { email: B.email, password: "Passw0rd!e2e" } }));
    const cCookie = cookieFrom(C.setCookie);
    await req("POST", "/api/auth/logout", { cookie: cCookie });
    await new Promise((s) => setTimeout(s, 500));
    r = await req("GET", "/api/auth/session", { cookie: cCookie });
    await rec("Auth", "Logged-out session no longer authenticates (session endpoint)", r.json?.data?.authenticated === false, `authenticated=${r.json?.data?.authenticated}`);
    r = await req("GET", "/api/v1/settings", { cookie: cCookie });
    await rec("Auth", "Logged-out session cookie rejected by /api/v1", r.status === 401, `${r.status}`);
});
