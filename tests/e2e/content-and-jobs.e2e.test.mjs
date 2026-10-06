/**
 * Regression tests for step 4: server-side Content Studio, media upload safety, and background jobs.
 * Runs against a live server: BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { BASE, sql, clearIpLimits, cleanupRun, makePng, STORAGE_DIR, prisma } from "./helpers.mjs";

const ts = Date.now();
after(() => cleanupRun(ts));

const ck = (sc) => { const m = /marketeros_session=([^;]+)/.exec(sc || ""); return m ? `marketeros_session=${m[1]}` : null; };

const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);

async function req(base, method, p, { cookie, body, form, headers = {} } = {}) {
  const h = { ...(cookie ? { cookie } : {}), ...headers };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { payload = JSON.stringify(body); h["content-type"] = "application/json"; }
  const res = await fetch(base + p, { method, redirect: "manual", headers: h, body: payload });
  const buf = Buffer.from(await res.arrayBuffer());
  let json = null; try { json = JSON.parse(buf.toString()); } catch {}
  return { status: res.status, json, buf, headers: res.headers, setCookie: res.headers.get("set-cookie") };
}

async function signup(base, tag) {
  const email = `e2e-${ts}-${tag}@example.test`;
  const r = await req(base, "POST", "/api/auth/signup", { body: { email, password: "Passw0rd!e2e", firstName: "E2E", lastName: tag, acceptTerms: true, workspaceName: `E2E S4 ${tag} ${ts}` } });
  return { email, cookie: ck(r.setCookie), ws: r.json?.data?.user?.workspaceId };
}

const fileForm = (buf, name, type, extra = {}) => { const f = new FormData(); f.append("file", new Blob([buf], { type }), name); for (const [k, v] of Object.entries(extra)) f.append(k, String(v)); return f; };

test("Content Studio storage and background jobs (step 4)", async (t) => {
  const rec = (area, name, pass, detail = "") => t.test(`[${area}] ${name}`, () => assert.ok(pass, detail || name));
  await clearIpLimits();
  const ts = Date.now();








    const A = await signup(BASE, "a");
    const B = await signup(BASE, "b");

    // ---- Templates ----
    let r = await req(BASE, "POST", "/api/v1/content-studio/templates", { cookie: A.cookie, body: { name: "Launch post", category: "Social Posts", platforms: ["instagram"], headline: "Hello" } });
    const tplId = r.json?.data?.id;
    await rec("Templates", "Create template", r.status === 201 && !!tplId && r.json.data.author.name === "E2E a", `${r.status} author=${r.json?.data?.author?.name}`);
    r = await req(BASE, "PATCH", `/api/v1/content-studio/templates/${tplId}`, { cookie: A.cookie, body: { isFavorite: true, incrementUsage: true } });
    await rec("Templates", "Favorite + usage count persist", r.status === 200 && r.json?.data?.isFavorite === true && r.json?.data?.usageCount === 1, `${r.status}`);
    r = await req(BASE, "GET", "/api/v1/content-studio/templates", { cookie: A.cookie });
    await rec("Templates", "Listed for the same workspace (survives reload / other browsers)", r.json?.data?.items?.some((t) => t.id === tplId), `${r.json?.data?.items?.length} items`);
    r = await req(BASE, "POST", "/api/v1/content-studio/templates", { cookie: A.cookie, body: { name: "x", thumbnail: "javascript:alert(1)" } });
    await rec("Templates", "Unsafe thumbnail URL rejected", r.status === 400, `${r.status}`);
    r = await req(BASE, "GET", "/api/v1/content-studio/templates", { cookie: B.cookie });
    await rec("Isolation", "Workspace B doesn't see A's templates", r.json?.data?.items?.length === 0, `${r.json?.data?.items?.length}`);
    r = await req(BASE, "PATCH", `/api/v1/content-studio/templates/${tplId}`, { cookie: B.cookie, body: { name: "hijack" } });
    const r2 = await req(BASE, "DELETE", `/api/v1/content-studio/templates/${tplId}`, { cookie: B.cookie });
    await rec("Isolation", "Workspace B can't edit or delete A's template", r.status === 404 && r2.status === 404, `${r.status}/${r2.status}`);

    // ---- Hashtag groups ----
    r = await req(BASE, "POST", "/api/v1/content-studio/hashtag-groups", { cookie: A.cookie, body: { name: "Launch", hashtags: ["growth", "#saas"] } });
    const hgId = r.json?.data?.id;
    await rec("Hashtags", "Create group (tags normalised with #)", r.status === 201 && JSON.stringify(r.json?.data?.hashtags) === '["#growth","#saas"]', JSON.stringify(r.json?.data?.hashtags));
    await rec("Hashtags", "No invented performance score", r.json?.data?.averagePerformance === null, `${r.json?.data?.averagePerformance}`);
    r = await req(BASE, "DELETE", `/api/v1/content-studio/hashtag-groups/${hgId}`, { cookie: B.cookie });
    await rec("Isolation", "Workspace B can't delete A's hashtag group", r.status === 404, `${r.status}`);

    // ---- Settings ----
    r = await req(BASE, "GET", "/api/v1/content-studio/settings", { cookie: A.cookie });
    await rec("Settings", "New workspace has no saved settings (null)", r.status === 200 && r.json?.data?.settings === null, `${r.status}`);
    await req(BASE, "PUT", "/api/v1/content-studio/settings", { cookie: A.cookie, body: { settings: { general: { workspaceName: "Acme" } } } });
    r = await req(BASE, "GET", "/api/v1/content-studio/settings", { cookie: A.cookie });
    await rec("Settings", "Saved settings persist server-side", r.json?.data?.settings?.general?.workspaceName === "Acme");

    // ---- Media upload, serving, safety ----
    const png = makePng(64, 32);
    r = await req(BASE, "POST", "/api/v1/content-studio/media", { cookie: A.cookie, form: fileForm(png, "banner.png", "image/png", { width: 64, height: 32, folder: "Campaigns" }) });
    const media = r.json?.data;
    await rec("Media", "Upload a real PNG", r.status === 201 && media?.size === png.length && media?.width === 64 && media?.folderName === "Campaigns", `${r.status} size=${media?.size} ${media?.width}x${media?.height}`);
    const row = await sql(`select "storageKey" from "MediaAsset" where id='${media?.id}'`);
    // File-on-disk checks apply to the local storage driver (S3 is covered by hardening.e2e.test.mjs).
    const onDisk = process.env.STORAGE_DRIVER === "s3" ? null : path.join(STORAGE_DIR, row);
    if (onDisk) await rec("Media", "File stored in object storage under a server-generated key", fs.existsSync(onDisk) && row.startsWith(`${A.ws}/`) && sha(fs.readFileSync(onDisk)) === sha(png), row);
    r = await req(BASE, "GET", media.url, { cookie: A.cookie });
    await rec("Media", "Served back byte-for-byte to its workspace", r.status === 200 && sha(r.buf) === sha(png) && r.headers.get("content-type") === "image/png", `${r.status} ${r.headers.get("content-type")}`);
    await rec("Media", "Served with sandbox CSP + nosniff", /sandbox/.test(r.headers.get("content-security-policy") || "") && r.headers.get("x-content-type-options") === "nosniff");
    r = await req(BASE, "GET", `${media.url}?download=1`, { cookie: A.cookie });
    await rec("Media", "Download sends an attachment", /^attachment; filename="banner.png"/.test(r.headers.get("content-disposition") || ""), r.headers.get("content-disposition"));
    r = await req(BASE, "GET", media.url, { cookie: B.cookie });
    await rec("Isolation", "Workspace B can't fetch A's file", r.status === 404, `${r.status}`);
    r = await req(BASE, "GET", media.url);
    await rec("Isolation", "Anonymous request can't fetch the file", r.status === 401, `${r.status}`);
    r = await req(BASE, "POST", "/api/v1/content-studio/media", { cookie: A.cookie, form: fileForm(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"), "x.svg", "image/svg+xml") });
    await rec("Upload safety", "SVG rejected", r.status === 415, `${r.status} ${r.json?.error?.code}`);
    r = await req(BASE, "POST", "/api/v1/content-studio/media", { cookie: A.cookie, form: fileForm(Buffer.from("<html><script>alert(1)</script></html>"), "evil.png", "image/png") });
    await rec("Upload safety", "HTML disguised as PNG rejected", r.status === 415 && r.json?.error?.code === "CONTENT_MISMATCH", `${r.status} ${r.json?.error?.code}`);
    r = await req(BASE, "POST", "/api/v1/content-studio/media", { cookie: A.cookie, form: fileForm(Buffer.concat([png.subarray(0, 8), Buffer.alloc(26 * 1024 * 1024)]), "huge.png", "image/png") });
    await rec("Upload safety", "Over-size upload rejected (25 MB cap)", r.status === 413, `${r.status}`);
    r = await req(BASE, "DELETE", `/api/v1/content-studio/media/${media.id}`, { cookie: B.cookie });
    await rec("Isolation", "Workspace B can't delete A's media", r.status === 404, `${r.status}`);
    r = await req(BASE, "DELETE", `/api/v1/content-studio/media/${media.id}`, { cookie: A.cookie });
    await rec("Media", "Delete removes the row and the stored file", r.status === 200 && (!onDisk || !fs.existsSync(onDisk)), `${r.status} fileExists=${onDisk && fs.existsSync(onDisk)}`);

    // ---- Background jobs through the cron endpoint (scratch DB server) ----
    const CRON_SECRET = process.env.CRON_SECRET;
    const othersDue = Number(await sql(`select count(*) from "BackgroundJob" where status = 'QUEUED' and "runAt" <= timezone('utc', now())`));
    if (!CRON_SECRET || othersDue > 0) {
      await t.test("[Jobs] cron processing", { skip: !CRON_SECRET ? "CRON_SECRET not set for the test run" : `${othersDue} real job(s) already queued in this database; not running them from a test` }, () => {});
      return;
    }
    const J = await signup(BASE, "jobs");
    r = await req(BASE, "POST", "/api/v1/reports", { cookie: J.cookie, body: { name: "Weekly report" } });
    const reportId = r.json?.data?.id;
    await rec("Jobs", "Creating a report queues a job", r.status === 202 && r.json?.data?.status === "GENERATING" && !!r.json?.data?.jobId, `${r.status}`);
    r = await req(BASE, "GET", "/api/cron/jobs");
    const r3 = await req(BASE, "GET", "/api/cron/jobs", { headers: { authorization: "Bearer wrong-secret" } });
    await rec("Jobs", "Cron endpoint rejects missing/wrong secret", r.status === 401 && r3.status === 401, `${r.status}/${r3.status}`);
    r = await req(BASE, "GET", "/api/cron/jobs", { headers: { authorization: `Bearer ${CRON_SECRET}` } });
    await rec("Jobs", "Cron run processes the queued job", r.status === 200 && r.json?.data?.processed?.some((j) => j.status === "COMPLETED"), JSON.stringify(r.json?.data));
    r = await req(BASE, "GET", `/api/v1/reports/${reportId}`, { cookie: J.cookie });
    await rec("Jobs", "Report is READY with a download link (no longer stuck on Generating)", r.json?.data?.status === "READY" && /^\/api\/v1\/reports\/[^/]+\/download\?format=pdf$/.test(r.json?.data?.generatedUrl || ""), `status=${r.json?.data?.status} url=${r.json?.data?.generatedUrl}`);
});
