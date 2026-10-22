#!/usr/bin/env node
// frame-audit.mjs - open a composition in a local headless Chrome, stop it at chosen times, save each
// frame and audit the text on screen:
//   - copy (headlines, lines the viewer must read) is at least the preset's minimum size
//   - interface detail marked data-qa="ui" is at least 60 % of it; data-qa="texture" is decoration and skipped
//   - readable text sits inside the safe area of the preset
//   - nothing readable is cut off by the canvas edge
// It seeks GSAP timelines registered on window.__timelines, a window.__seek(t) hook, or Web Animations.
//
// Usage:
//   node scripts/frame-audit.mjs index.html --at 2.6,6.4,11.8 --preset wide --out film/frames
//   node scripts/frame-audit.mjs index.html --storyboard film/storyboard.json --preset wide --out film/frames
//   node scripts/frame-audit.mjs --self-test
//
// Chrome: set CHROME_PATH, or it looks for Google Chrome / Chromium in the usual places (including the
// one `npx hyperframes browser ensure` installs). Nothing is fetched from the network by this script.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Reference sizes at the preset's own canvas; scaled when the composition is smaller (e.g. 1280x720).
const PRESETS = {
  wide: { width: 1920, height: 1080, safe: [72, 128, 72, 128], min: 40 },
  vertical: { width: 1080, height: 1920, safe: [260, 120, 440, 80], min: 46 },
  square: { width: 1080, height: 1080, safe: [80, 80, 120, 80], min: 40 },
};

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const fixed = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of fixed) if (existsSync(p)) return p;
  // Puppeteer's cache, where HyperFrames installs its browser.
  const cache = join(homedir(), ".cache", "puppeteer");
  for (const kind of ["chrome-headless-shell", "chrome"]) {
    const dir = join(cache, kind);
    if (!existsSync(dir)) continue;
    for (const v of readdirSync(dir).sort().reverse()) {
      for (const sub of readdirSync(join(dir, v))) {
        for (const bin of ["chrome-headless-shell", "chrome", "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"]) {
          const p = join(dir, v, sub, bin);
          if (existsSync(p)) return p;
        }
      }
    }
  }
  return null;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { ok, fail } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message}`)); else ok(msg.result);
      }
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
    return new Promise((ok, fail) => this.pending.set(id, { ok, fail }));
  }
}

export async function launch(width, height) {
  const chrome = findChrome();
  if (!chrome) throw new Error("no Chrome found: install Google Chrome, set CHROME_PATH, or run `npx hyperframes browser ensure`");
  if (typeof WebSocket === "undefined") throw new Error("this script needs Node.js 22 or newer (global WebSocket)");
  const profile = mkdtempSync(join(tmpdir(), "frame-audit-"));
  const proc = spawn(chrome, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run",
    "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "--allow-file-access-from-files",
    `--window-size=${width},${height}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((ok, fail) => {
    let buf = "";
    const timer = setTimeout(() => fail(new Error("Chrome did not start within 20 s")), 20000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); ok(m[1]); }
    });
    proc.on("exit", (code) => { clearTimeout(timer); fail(new Error(`Chrome exited (${code})`)); });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = () => fail(new Error("cannot connect to Chrome")); });
  const cdp = new Cdp(ws);
  const close = async () => {
    try { ws.close(); } catch { /* already closed */ }
    proc.kill("SIGKILL");
    await new Promise((r) => setTimeout(r, 150));
    rmSync(profile, { recursive: true, force: true });
  };
  return { cdp, close };
}

// Runs in the page. Returns problems with readable text at the current frame.
const AUDIT = `(opts) => {
  const root = document.querySelector('[data-composition-id]') || document.body;
  const R = root.getBoundingClientRect();
  const k = R.width / opts.width || 1;
  const [st, sr, sb, sl] = opts.safe;
  const issues = [];
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent.replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const tierEl = el.closest('[data-qa]');
    const tier = tierEl ? tierEl.dataset.qa : 'copy';
    if (tier === 'texture' || tier === 'ignore') continue;
    let alpha = 1, hidden = false;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; }
      alpha *= parseFloat(cs.opacity);
    }
    if (hidden || alpha < 0.6) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const x1 = (Math.min(...rects.map((r) => r.left)) - R.left) / k, y1 = (Math.min(...rects.map((r) => r.top)) - R.top) / k;
    const x2 = (Math.max(...rects.map((r) => r.right)) - R.left) / k, y2 = (Math.max(...rects.map((r) => r.bottom)) - R.top) / k;
    const box = el.getBoundingClientRect();
    const zoom = el.offsetHeight ? box.height / el.offsetHeight : 1;
    const size = parseFloat(getComputedStyle(el).fontSize) * zoom / k;
    const min = tier === 'ui' ? opts.min * 0.6 : opts.min;
    const label = text.length > 48 ? text.slice(0, 47) + '…' : text;
    if (size < min - 0.5) issues.push({ kind: 'small', tier, text: label, size: Math.round(size * 10) / 10, min: Math.round(min * 10) / 10 });
    if (x1 < -1 || y1 < -1 || x2 > opts.width + 1 || y2 > opts.height + 1) issues.push({ kind: 'cut off', tier, text: label, box: [x1, y1, x2, y2].map(Math.round) });
    else if (x1 < sl - 1 || y1 < st - 1 || x2 > opts.width - sr + 1 || y2 > opts.height - sb + 1) issues.push({ kind: 'outside safe area', tier, text: label, box: [x1, y1, x2, y2].map(Math.round) });
  }
  return issues;
}`;

export const SEEK = `(t) => {
  if (typeof window.__seek === 'function') { window.__seek(t); return 'seek hook'; }
  const tls = window.__timelines ? Object.values(window.__timelines) : [];
  if (tls.length) { for (const tl of tls) { tl.pause && tl.pause(); if (tl.totalTime) tl.totalTime(t, false); else if (tl.seek) tl.seek(t, false); } return 'gsap'; }
  const anims = document.getAnimations ? document.getAnimations() : [];
  for (const a of anims) { a.pause(); a.currentTime = t * 1000; }
  return anims.length ? 'web animations' : 'none';
}`;

export async function audit(file, { times, preset = "wide", out = null, width, height } = {}) {
  const url = pathToFileURL(resolve(file)).href + "?paused";
  const html = readFileSync(file, "utf8");
  const W = width || Number(html.match(/data-width="(\d+)"/)?.[1]) || PRESETS[preset].width;
  const H = height || Number(html.match(/data-height="(\d+)"/)?.[1]) || PRESETS[preset].height;
  const p = PRESETS[preset];
  const k = W / p.width;
  const opts = { width: W, height: H, safe: p.safe.map((v) => v * k), min: p.min * k };
  const { cdp, close } = await launch(W, H);
  const results = [];
  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const s = (m, prm) => cdp.send(m, prm, sessionId);
    await s("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await s("Page.enable");
    await s("Runtime.enable");
    await s("Page.navigate", { url });
    const evaluate = async (expression) => {
      const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    for (let i = 0; i < 100; i++) {
      if (await evaluate("document.readyState === 'complete'").catch(() => false)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");
    if (out) mkdirSync(out, { recursive: true });
    for (const t of times) {
      const how = await evaluate(`(${SEEK})(${t})`);
      await evaluate("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))");
      const issues = await evaluate(`(${AUDIT})(${JSON.stringify(opts)})`);
      let shot = null;
      if (out) {
        const { data } = await s("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
        shot = join(out, `frame-${t.toFixed(2)}s.png`);
        writeFileSync(shot, Buffer.from(data, "base64"));
      }
      results.push({ t, seekedWith: how, issues, shot });
    }
  } finally {
    await close();
  }
  return { width: W, height: H, preset, results };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  const valueFlags = new Set(["--at", "--preset", "--out", "--storyboard", "--size"]);
  const file = argv.find((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
  if (!file || argv.includes("--help")) {
    console.log("Usage: node scripts/frame-audit.mjs <composition.html> (--at 1.2,3.4 | --storyboard film/storyboard.json) [--preset wide|vertical|square] [--out DIR] [--json]");
    return file ? 0 : 2;
  }
  try {
    let times = opt("--at") ? opt("--at").split(",").map(Number) : null;
    if (!times && opt("--storyboard")) times = JSON.parse(readFileSync(opt("--storyboard"), "utf8")).keyFrames.map((x) => x.t);
    if (!times?.length || times.some((t) => !Number.isFinite(t))) throw new Error("give --at times or a --storyboard with key frames");
    const [w, h] = (opt("--size") || "").split("x").map(Number);
    const res = await audit(file, { times, preset: opt("--preset") || "wide", out: opt("--out"), width: w || undefined, height: h || undefined });
    const count = res.results.reduce((n, r) => n + r.issues.length, 0);
    if (argv.includes("--json")) console.log(JSON.stringify(res, null, 2));
    else {
      for (const r of res.results) {
        console.log(`${r.t.toFixed(2)}s ${r.issues.length ? "" : "ok"}${r.shot ? `  ${r.shot}` : ""}`);
        for (const i of r.issues) console.log(`   ${i.kind}: "${i.text}" (${i.tier}${i.size ? `, ${i.size}px < ${i.min}px` : ""}${i.box ? `, box ${i.box.join(",")}` : ""})`);
      }
      console.log(count ? `\n${count} text problem(s) across ${res.results.length} frames.` : `\nAll ${res.results.length} frames pass the text audit (${res.preset}, ${res.width}x${res.height}).`);
    }
    return count ? 1 : 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  if (!findChrome()) { console.log("skip: no Chrome found (set CHROME_PATH)"); return 0; }
  const dir = mkdtempSync(join(tmpdir(), "frame-audit-test-"));
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  try {
    const page = join(dir, "comp.html");
    writeFileSync(page, `<!doctype html><html><body style="margin:0;background:#111">
<div id="c" data-composition-id="t" data-width="1280" data-height="720" style="position:relative;width:1280px;height:720px;overflow:hidden;background:#222;color:#fff;font:700 40px sans-serif">
  <div id="a" style="position:absolute;left:100px;top:100px">Readable headline</div>
  <div id="b" style="position:absolute;left:100px;top:200px;font-size:14px">tiny copy line</div>
  <div style="position:absolute;left:100px;top:260px;font-size:14px" data-qa="texture">decorative label</div>
  <div id="d" style="position:absolute;left:10px;top:600px">near the edge</div>
</div>
<script>
  const a = document.getElementById('d').animate([{ transform: 'translateX(0px)' }, { transform: 'translateX(1200px)' }], { duration: 2000, fill: 'both' });
  a.pause();
</script></body></html>`);
    await check("finds small copy, safe-area and cut-off text, skips texture, seeks Web Animations", async () => {
      const res = await audit(page, { times: [0, 2], preset: "wide", out: join(dir, "frames") });
      const at0 = res.results[0].issues;
      assert.ok(at0.some((i) => i.kind === "small" && /tiny copy/.test(i.text)));
      assert.ok(!at0.some((i) => /decorative/.test(i.text)));
      assert.ok(at0.some((i) => i.kind === "outside safe area" && /near the edge/.test(i.text)));
      assert.ok(res.results[1].issues.some((i) => i.kind === "cut off" && /near the edge/.test(i.text)), JSON.stringify(res.results[1]));
      assert.equal(res.results[1].seekedWith, "web animations");
      assert.ok(existsSync(res.results[0].shot));
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : "\nAll self-tests passed (local Chrome, no network).");
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
