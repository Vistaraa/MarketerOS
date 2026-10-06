/**
 * Real-browser checks (headless Chrome via the DevTools protocol, no extra dependencies):
 *  - every main page loads signed in, with no JavaScript errors or Content-Security-Policy violations;
 *  - Content Studio imports legacy browser-only data once, and uploads a real file through the file input.
 * Skipped when no Chrome/Chromium is installed (set CHROME_PATH to point at one).
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BASE, clearIpLimits, cleanupRun, findChrome, makePng } from "./helpers.mjs";

const ts = Date.now();
const chromePath = findChrome();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = ["/auth/login", "/auth/signup", "/auth/verify-email", "/overview", "/campaigns", "/campaigns/create", "/leads", "/clients", "/analytics",
  "/ai-insights", "/automation", "/reports", "/integrations", "/content-studio", "/content-studio/calendar", "/content-studio/library",
  "/content-studio/media", "/content-studio/templates", "/billing", "/settings", "/team", "/notifications", "/play-console", "/youtube", "/youtube-ads", "/onboarding/brand", "/legal/terms", "/legal/privacy"];

/** Minimal CDP client for one headless Chrome tab. */
async function launchBrowser() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "marketeros-e2e-chrome-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
  }
  assert.ok(target, "Chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else events.push(msg);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  for (const m of ["Runtime.enable", "Log.enable", "Network.enable", "Page.enable", "DOM.enable"]) await send(m);
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const problems = () => events
    .filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Log.entryAdded" && /Content Security Policy|Refused to/i.test(e.params.entry.text)))
    .map((e) => e.params.exceptionDetails?.exception?.description?.split("\n")[0] || e.params.exceptionDetails?.text || e.params.entry?.text);
  const close = async () => {
    ws.close();
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    // Chrome may still be flushing its profile; cleanup of a temp dir must never fail the run.
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
  };
  return { send, evaluate, events, problems, close };
}

test("browser", { skip: chromePath ? false : "no Chrome/Chromium found (set CHROME_PATH)" }, async (t) => {
  await clearIpLimits();
  after(() => cleanupRun(ts));
  const email = `e2e-${ts}-browser@example.test`;
  const res = await fetch(BASE + "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "Passw0rd!e2e", firstName: "Browser", lastName: "Test", acceptTerms: true, workspaceName: "Browser test" }) });
  assert.equal(res.status, 201);
  const cookie = decodeURIComponent(/marketeros_session=([^;]+)/.exec(res.headers.get("set-cookie"))[1]);

  const browser = await launchBrowser();
  t.after(() => browser.close());
  await browser.send("Network.setCookie", { name: "marketeros_session", value: cookie, domain: new URL(BASE).hostname, path: "/", httpOnly: true });
  await browser.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });

  for (const page of PAGES) {
    await t.test(`page ${page} has no JS errors or CSP violations`, async () => {
      browser.events.length = 0;
      await browser.send("Page.navigate", { url: BASE + page });
      await sleep(3500);
      assert.deepEqual(browser.problems(), []);
      assert.equal(await browser.evaluate("location.pathname"), page);
    });
  }

  await t.test("App KPIs are part of the Overview on phones only", async () => {
    const probe = `(() => {
      const section = document.querySelector('[aria-labelledby="overview-app-kpis"]');
      const spend = [...document.querySelectorAll("p, span, h3")].find((e) => e.textContent.trim() === "Total Spend");
      return {
        sectionShown: !!section && getComputedStyle(section).display !== "none",
        heading: document.getElementById("overview-app-kpis")?.textContent.trim() || null,
        afterOverviewCards: !!spend && !!section && Boolean(spend.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING),
        overviewShown: !!spend && spend.offsetParent !== null,
        oldSwitch: [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "App KPIs")
      };
    })()`;
    try {
      await browser.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      browser.events.length = 0;
      await browser.send("Page.navigate", { url: BASE + "/overview" });
      await sleep(4000);
      assert.deepEqual(await browser.evaluate(probe), { sectionShown: true, heading: "App KPIs", afterOverviewCards: true, overviewShown: true, oldSwitch: false });
      assert.deepEqual(browser.problems(), []);

      await browser.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
      await browser.send("Page.navigate", { url: BASE + "/overview" });
      await sleep(3500);
      const desktop = await browser.evaluate(probe);
      assert.equal(desktop.sectionShown, false, "not shown on desktop");
      assert.equal(desktop.overviewShown, true);
      assert.equal(desktop.oldSwitch, false);
    } finally {
      await browser.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
    }
  });

  await t.test("Content Studio imports legacy browser-only data once", async () => {
    await browser.send("Page.navigate", { url: BASE + "/auth/login" });
    await sleep(2000);
    await browser.evaluate(`localStorage.setItem("cs_templates", JSON.stringify([{ id: "tpl-old", name: "Legacy template", category: "Social Posts", platforms: ["instagram"], thumbnail: "/summer-sale-banner.png", usageCount: 3, isFavorite: true }]));
      localStorage.setItem("cs_hashtag_groups", JSON.stringify([{ id: "hg-old", name: "Legacy tags", hashtags: ["#old"], usageCount: 2 }]));
      localStorage.setItem("cs_media", JSON.stringify([{ id: "med-old", name: "new-brand-asset.png" }])); true`);
    await browser.send("Page.navigate", { url: BASE + "/content-studio/templates" });
    await sleep(6000);
    const state = await browser.evaluate(`Promise.all(["templates", "hashtag-groups", "media"].map((p) => fetch("/api/v1/content-studio/" + p).then((r) => r.json()))).then(([t, h, m]) => ({
      tpl: t.data.items.map((x) => ({ name: x.name, fav: x.isFavorite, uses: x.usageCount, thumb: x.thumbnail })), groups: h.data.items.map((x) => x.name), media: m.data.items.map((x) => x.name),
      keysLeft: ["cs_templates", "cs_hashtag_groups", "cs_media"].filter((k) => localStorage.getItem(k) !== null) }))`);
    assert.deepEqual(state.tpl, [{ name: "Legacy template", fav: true, uses: 3, thumb: "" }], "imported, with the bundled demo thumbnail dropped");
    assert.deepEqual(state.groups, ["Legacy tags"]);
    assert.deepEqual(state.media, [], "legacy placeholder media is discarded");
    assert.deepEqual(state.keysLeft, []);
  });

  await t.test("a real file uploads through the media library's file input", async () => {
    const file = path.join(os.tmpdir(), `marketeros-e2e-${ts}.png`);
    fs.writeFileSync(file, makePng(120, 80));
    t.after(() => fs.rmSync(file, { force: true }));
    browser.events.length = 0;
    await browser.send("Page.navigate", { url: BASE + "/content-studio/media" });
    await sleep(5000);
    await browser.evaluate(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Upload Media"))?.click(); true`);
    await sleep(800);
    const doc = await browser.send("DOM.getDocument", { depth: -1 });
    const input = await browser.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[type="file"]' });
    assert.ok(input.result?.nodeId, "upload dialog has a real file input");
    await browser.send("DOM.setFileInputFiles", { nodeId: input.result.nodeId, files: [file] });
    await sleep(4000);
    const uploaded = await browser.evaluate(`fetch("/api/v1/content-studio/media").then((r) => r.json()).then((j) => j.data.items.find((x) => x.name === ${JSON.stringify(path.basename(file))}))`);
    assert.equal(uploaded?.width, 120, "dimensions measured in the browser");
    assert.equal(uploaded?.height, 80);
    const img = await browser.evaluate(`(() => { const i = [...document.images].find((x) => x.src.includes("/api/media/")); return i ? { w: i.naturalWidth, h: i.naturalHeight } : null; })()`);
    assert.deepEqual(img, { w: 120, h: 80 }, "the uploaded image renders in the library");
    assert.deepEqual(browser.problems(), []);
  });
});
