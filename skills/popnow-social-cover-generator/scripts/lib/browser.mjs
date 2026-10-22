// Minimal headless browser driver.
//
// Default engine: the locally installed Chrome / Chromium / Edge, driven over the
// DevTools protocol through a pipe (--remote-debugging-pipe). No npm packages,
// no network, no open ports.
// Optional engine: Playwright, used when it is installed in the project and either
// requested (--engine playwright / BROWSER_ENGINE=playwright) or no Chrome is found.
//
// API:
//   const browser = await openBrowser({ engine })   // "auto" | "chrome" | "playwright"
//   const page = await browser.newPage()
//   await page.setViewport({ width, height, deviceScaleFactor, mobile })
//   await page.goto(url)                             // waits for load, fonts and images
//   const value = await page.evaluate(fnOrExpression, ...args)
//   const buf = await page.screenshot({ format: "png" | "jpeg" | "webp", quality, fullPage, clip })
//   page.consoleErrors                               // array of strings
//   await browser.close()

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";

export function findChrome() {
  const fromEnv = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].filter(Boolean);
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const mac = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  ];
  const win = [];
  for (const base of [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean)) {
    win.push(join(base, "Google/Chrome/Application/chrome.exe"), join(base, "Microsoft/Edge/Application/msedge.exe"), join(base, "Chromium/Application/chrome.exe"));
  }
  const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"];
  const onPath = [];
  for (const dir of (process.env.PATH || "").split(delimiter).filter(Boolean)) for (const n of names) onPath.push(join(dir, n));
  const candidates = [...fromEnv, ...(process.platform === "darwin" ? mac : []), ...(process.platform === "win32" ? win : []), ...onPath];
  return candidates.find((p) => p && existsSync(p)) || null;
}

function loadPlaywright() {
  for (const base of [process.cwd(), import.meta.url]) {
    const req = createRequire(base.startsWith("file:") ? base : pathToFileURL(join(base, "noop.js")).href);
    for (const name of ["playwright", "playwright-core"]) {
      try {
        return req(name);
      } catch {
        /* not installed here */
      }
    }
  }
  return null;
}

export async function openBrowser({ engine = process.env.BROWSER_ENGINE || "auto" } = {}) {
  const chrome = engine === "playwright" ? null : findChrome();
  if (chrome) return openChrome(chrome);
  const pw = engine === "chrome" ? null : loadPlaywright();
  if (pw) return openPlaywright(pw);
  throw new Error(
    "No browser found. Install Google Chrome (or Chromium / Edge), set CHROME_PATH to its executable, " +
      "or install Playwright in the project (npm i -D playwright && npx playwright install chromium).",
  );
}

// ---------- Chrome over the DevTools pipe ----------

async function openChrome(executable) {
  const profile = mkdtempSync(join(tmpdir(), "headless-profile-"));
  const args = [
    "--headless",
    "--remote-debugging-pipe",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--hide-scrollbars",
    "--mute-audio",
    "--allow-file-access-from-files",
    "--force-color-profile=srgb",
    "--font-render-hinting=none",
    "about:blank",
  ];
  const proc = spawn(executable, args, { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
  const out = proc.stdio[3];
  const inp = proc.stdio[4];
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  let buf = Buffer.alloc(0);
  inp.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let end;
    while ((end = buf.indexOf(0)) !== -1) {
      const msg = JSON.parse(buf.subarray(0, end).toString("utf8"));
      buf = buf.subarray(end + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject, method } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of listeners) fn(msg);
      }
    }
  });
  const exited = new Promise((resolve) => proc.on("exit", resolve));
  proc.on("exit", () => {
    for (const { reject, method } of pending.values()) reject(new Error(`${method}: browser exited. ${stderr.trim().split("\n").slice(-3).join(" ")}`));
    pending.clear();
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject, method });
      out.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + "\0");
    });

  await send("Browser.getVersion");

  async function newPage() {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const page = { consoleErrors: [] };
    const waiters = new Set();
    listeners.add((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") page.consoleErrors.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || "exception");
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") page.consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? "").join(" "));
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") page.consoleErrors.push(`${msg.params.entry.text}${msg.params.entry.url ? " " + msg.params.entry.url : ""}`);
      for (const w of waiters) w(msg);
    });
    await s("Page.enable");
    await s("Runtime.enable");
    await s("Log.enable");
    let viewport = { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false };

    page.setViewport = async (v) => {
      viewport = { ...viewport, ...v };
      await s("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.deviceScaleFactor,
        mobile: !!viewport.mobile,
      });
      await s("Emulation.setTouchEmulationEnabled", { enabled: !!viewport.mobile });
    };
    page.goto = async (url, { timeout = 30000 } = {}) => {
      page.consoleErrors.length = 0;
      const loaded = new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          waiters.delete(w);
          reject(new Error(`Timed out loading ${url}`));
        }, timeout);
        const w = (msg) => {
          if (msg.method === "Page.loadEventFired") {
            clearTimeout(t);
            waiters.delete(w);
            resolve();
          }
        };
        waiters.add(w);
      });
      const res = await s("Page.navigate", { url });
      if (res.errorText) throw new Error(`Could not open ${url}: ${res.errorText}`);
      await loaded;
      await page.evaluate(settle);
    };
    page.evaluate = async (fn, ...args) => {
      const expression = typeof fn === "function" ? `(${fn.toString()})(...${JSON.stringify(args)})` : String(fn);
      const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    };
    page.reducedMotion = async (on = true) => {
      await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: on ? "reduce" : "no-preference" }] });
    };
    page.screenshot = async ({ format = "png", quality, fullPage = false, clip } = {}) => {
      const params = { format, fromSurface: true, captureBeyondViewport: false };
      if (quality != null && format !== "png") params.quality = quality;
      if (fullPage) {
        // Scroll through once so lazy images and scroll-reveal content load, then
        // capture beyond the viewport without resizing it (keeps 100vh sections honest).
        await page.evaluate(scrollThrough);
        await page.evaluate(settle);
        const h = await page.evaluate(() => Math.ceil(Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)));
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width: viewport.width, height: Math.min(h, 16000), scale: 1 };
      } else if (clip) {
        params.clip = { scale: 1, ...clip };
      }
      const { data } = await s("Page.captureScreenshot", params);
      return Buffer.from(data, "base64");
    };
    page.close = () => send("Target.closeTarget", { targetId }).catch(() => {});
    await page.setViewport(viewport);
    return page;
  }

  return {
    engine: `chrome (${executable})`,
    newPage,
    async close() {
      try {
        await send("Browser.close");
      } catch {
        /* already gone */
      }
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
      if (proc.exitCode === null) proc.kill("SIGKILL");
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

// ---------- Playwright (optional) ----------

async function openPlaywright(pw) {
  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  return {
    engine: "playwright chromium",
    async newPage() {
      // One context per page so viewport, scale and mobile mode can change freely.
      let ctx = context;
      let p = await ctx.newPage();
      let cdp = await ctx.newCDPSession(p);
      const page = { consoleErrors: [] };
      const hook = (pg) => {
        pg.on("pageerror", (e) => page.consoleErrors.push(String(e)));
        pg.on("console", (m) => m.type() === "error" && page.consoleErrors.push(m.text()));
      };
      hook(p);
      page.setViewport = async (v) => {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: v.width,
          height: v.height,
          deviceScaleFactor: v.deviceScaleFactor || 1,
          mobile: !!v.mobile,
        });
        await p.setViewportSize({ width: v.width, height: v.height });
      };
      page.goto = async (url) => {
        page.consoleErrors.length = 0;
        await p.goto(url, { waitUntil: "load" });
        await p.evaluate(settle);
      };
      page.evaluate = (fn, ...args) => (typeof fn === "function" ? p.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`) : p.evaluate(String(fn)));
      page.screenshot = async ({ format = "png", quality, fullPage = false, clip } = {}) => {
        if (format === "webp" || clip) {
          if (fullPage) {
            const h = await p.evaluate(() => document.documentElement.scrollHeight);
            const vp = p.viewportSize();
            await page.setViewport({ width: vp.width, height: h });
          }
          const params = { format, fromSurface: true };
          if (quality != null && format !== "png") params.quality = quality;
          if (clip) params.clip = { scale: 1, ...clip };
          const { data } = await cdp.send("Page.captureScreenshot", params);
          return Buffer.from(data, "base64");
        }
        return p.screenshot({ type: format === "jpeg" ? "jpeg" : "png", quality: format === "jpeg" ? quality : undefined, fullPage });
      };
      page.close = () => p.close();
      return page;
    },
    async close() {
      await browser.close();
    },
  };
}

// Runs inside the page: step through the document so observers fire, then return to the top.
function scrollThrough() {
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = "eager"));
  const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
  const total = document.documentElement.scrollHeight;
  let y = 0;
  return new Promise((resolve) => {
    const tick = () => {
      window.scrollTo(0, y);
      y += step;
      if (y < total + step) setTimeout(tick, 40);
      else {
        window.scrollTo(0, 0);
        setTimeout(() => resolve(true), 120);
      }
    };
    tick();
  });
}

// Runs inside the page: wait for fonts, images and two animation frames.
function settle() {
  const imgs = Array.from(document.images || []);
  const pics = imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); })));
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  return Promise.race([
    Promise.all([fonts, ...pics]),
    new Promise((r) => setTimeout(r, 8000)),
  ]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));
}

export function fileUrl(p) {
  return pathToFileURL(p).href;
}
