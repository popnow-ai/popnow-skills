#!/usr/bin/env node
// Screenshots a built page and compares it with the chosen mockup.
//
//   node scripts/shoot-diff.mjs shoot   <page.html|url> [--out review] [--widths 1440,390] [--dpr 1] [--motion]
//   node scripts/shoot-diff.mjs compare <mockup.png> <screenshot.png> [--out review] [--label desktop]
//   node scripts/shoot-diff.mjs review  <page.html|url> --mockup <mockup.png> [--mobile-mockup <m.png>] [--out review]
//
// shoot   full-page PNG per width + qa.json: sideways overflow, broken images, missing alt,
//         low-contrast text, tiny text, small tap targets (phones: under 40px tall or 24px wide),
//         fonts that fell back, console errors.
// compare side-by-side PNG with matched sections + compare.json + a numbered list of deltas
//         (section count, section heights, backgrounds, composition, palette, accent use).
// review  both of the above in one go; this is the normal call after each build pass.
//
// Uses the local Chrome/Chromium/Edge (CHROME_PATH to override) or Playwright if installed.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openBrowser } from "./lib/browser.mjs";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" };

export function dataUrl(file) {
  const mime = MIME[extname(file).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image type: ${file}`);
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
}

function toUrl(target) {
  if (/^(https?|file|data):/i.test(target)) return target;
  const p = resolve(target);
  if (!existsSync(p)) throw new Error(`Not found: ${target}`);
  return pathToFileURL(p).href;
}

// ---------- shoot ----------

export async function shoot(target, { out = "review", widths = [1440, 390], dpr = 1, motion = false, browser = null } = {}) {
  mkdirSync(out, { recursive: true });
  const own = !browser;
  browser = browser || (await openBrowser());
  const results = [];
  try {
    for (const width of widths) {
      const mobile = width < 700;
      const page = await browser.newPage();
      await page.setViewport({ width, height: mobile ? 844 : 900, deviceScaleFactor: dpr, mobile });
      if (!motion && page.reducedMotion) await page.reducedMotion(true);
      await page.goto(toUrl(target));
      const qa = await page.evaluate(pageQa, { mobile });
      const png = await page.screenshot({ fullPage: true });
      const file = join(out, `shot-${width}.png`);
      writeFileSync(file, png);
      results.push({ width, mobile, file, consoleErrors: [...page.consoleErrors], ...qa });
      await page.close();
    }
  } finally {
    if (own) await browser.close();
  }
  writeFileSync(join(out, "qa.json"), JSON.stringify(results, null, 2) + "\n");
  return results;
}

// Runs in the page.
function pageQa({ mobile }) {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    else if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/).slice(0, 2).join(".");
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return t ? `${s} "${t}"` : s;
  };
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const all = Array.from(document.body.querySelectorAll("*"));
  const overflowers = [];
  for (const el of all) {
    if (!visible(el) || inScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) overflowers.push(`${describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)}px`);
  }
  const brokenImages = Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src"));
  const missingAlt = Array.from(document.images).filter((i) => !i.hasAttribute("alt")).map((i) => i.getAttribute("src"));

  // Contrast of text against the nearest solid background (text over images is listed separately).
  const parse = (c) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
    return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null;
  };
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const blend = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
  const bgOf = (el) => {
    const stack = [];
    for (let p = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { image: true };
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; }
    }
    let col = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) col = blend(stack[i], col);
    return { color: col };
  };
  const contrast = [];
  let overImage = 0;
  let tinyText = 0;
  const tinySamples = [];
  const textEls = all.filter((el) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && visible(el));
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (mobile && size < 12 && !el.closest("[aria-hidden=true]")) { tinyText++; if (tinySamples.length < 5) tinySamples.push(`${describe(el)} ${size}px`); }
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (bg.image) { overImage++; continue; }
    let opacity = 1;
    for (let p = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
    const text = blend([fg[0], fg[1], fg[2], fg[3] * opacity], bg.color);
    const l1 = lum(text), l2 = lum(bg.color);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need) contrast.push(`${describe(el)} ${ratio.toFixed(2)}:1 (needs ${need}:1)`);
  }
  const smallTargets = [];
  for (const el of document.querySelectorAll("a[href], button, [role=button], input:not([type=hidden]), select, textarea, summary")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const inline = el.tagName === "A" && el.closest("p, li, td, figcaption, blockquote") && getComputedStyle(el).display === "inline";
    if (!inline && (r.height < 40 || r.width < 24) && mobile) smallTargets.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  // Font fallback: compare text width with the family against generic fallbacks.
  const families = new Set();
  for (const el of document.querySelectorAll("h1, h2, h3, p, a, button, li, td, label")) {
    const fam = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (fam && !/^(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|cursive|fantasy|-apple-system|blinkmacsystemfont)$/i.test(fam)) families.add(fam);
  }
  const canvas = document.createElement("canvas").getContext("2d");
  const width = (font) => { canvas.font = font; return canvas.measureText("The quick brown fox 0123456789 mmmwwwiii").width; };
  const missingFonts = [...families].filter((fam) => ["monospace", "serif", "sans-serif"].every((g) => width(`32px "${fam}", ${g}`) === width(`32px ${g}`)));
  return {
    viewportWidth: vw,
    pageHeight: document.documentElement.scrollHeight,
    overflowX: document.documentElement.scrollWidth > vw + 1,
    overflowers: overflowers.slice(0, 12),
    brokenImages,
    missingAlt,
    lowContrast: contrast.slice(0, 20),
    lowContrastCount: contrast.length,
    textOverImages: overImage,
    tinyText,
    tinyTextSamples: tinySamples,
    smallTargets: smallTargets.slice(0, 12),
    smallTargetCount: smallTargets.length,
    missingFonts,
    h1Count: document.querySelectorAll("h1").length,
    title: document.title,
  };
}

export function summarizeQa(results) {
  const lines = [];
  for (const r of results) {
    const issues = [];
    if (r.overflowX) issues.push(`scrolls sideways (${r.overflowers.length} element(s) past the edge, first: ${r.overflowers[0] || "?"})`);
    if (r.brokenImages.length) issues.push(`${r.brokenImages.length} broken image(s): ${r.brokenImages.slice(0, 3).join(", ")}`);
    if (r.missingAlt.length) issues.push(`${r.missingAlt.length} image(s) without alt`);
    if (r.lowContrastCount) issues.push(`${r.lowContrastCount} low-contrast text element(s), first: ${r.lowContrast[0]}`);
    if (r.tinyText) issues.push(`${r.tinyText} text element(s) under 12px`);
    if (r.smallTargetCount) issues.push(`${r.smallTargetCount} small tap target(s) (under 40px tall or 24px wide), first: ${r.smallTargets[0]}`);
    if (r.missingFonts.length) issues.push(`font(s) not loaded, falling back: ${r.missingFonts.join(", ")}`);
    if (r.h1Count !== 1) issues.push(`${r.h1Count} h1 elements`);
    if (r.consoleErrors.length) issues.push(`${r.consoleErrors.length} console error(s): ${r.consoleErrors[0].slice(0, 120)}`);
    lines.push(`${r.width}px ${r.mobile ? "(mobile)" : "(desktop)"}: ${r.file}, page ${r.pageHeight}px tall` + (issues.length ? "\n  - " + issues.join("\n  - ") : "\n  - no QA issues"));
    if (r.textOverImages) lines.push(`  note: ${r.textOverImages} text element(s) sit on images or gradients; check those by eye in the screenshot`);
  }
  return lines.join("\n");
}

// ---------- compare ----------

export async function compare(mockup, shot, { out = "review", label = "desktop", browser = null } = {}) {
  mkdirSync(out, { recursive: true });
  const own = !browser;
  browser = browser || (await openBrowser());
  let result;
  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    result = await page.evaluate(pageCompare, dataUrl(mockup), dataUrl(shot));
    await page.close();
  } finally {
    if (own) await browser.close();
  }
  const png = Buffer.from(result.image.split(",")[1], "base64");
  delete result.image;
  const imageFile = join(out, `compare-${label}.png`);
  writeFileSync(imageFile, png);
  const report = { label, mockup, screenshot: shot, image: imageFile, ...result };
  writeFileSync(join(out, `compare-${label}.json`), JSON.stringify(report, null, 2) + "\n");
  return report;
}

// Runs in the page. Both images are reduced to the same width, split into horizontal
// sections (by background change and by empty gaps), aligned, and compared.
async function pageCompare(aSrc, bSrc) {
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error("could not decode image")); i.src = src; });
  const [A, B] = await Promise.all([load(aSrc), load(bSrc)]);
  const W = 320;
  const prep = (img) => {
    const h = Math.max(8, Math.round((img.naturalHeight * W) / img.naturalWidth));
    const c = document.createElement("canvas");
    c.width = W; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, W, h);
    return { h, d: x.getImageData(0, 0, W, h).data, natural: [img.naturalWidth, img.naturalHeight] };
  };
  const a = prep(A), b = prep(B);
  const lab = (r, g, b2) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const R = f(r), G = f(g), Bv = f(b2);
    let X = (R * 0.4124 + G * 0.3576 + Bv * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + Bv * 0.0722, Z = (R * 0.0193 + G * 0.1192 + Bv * 0.9505) / 1.08883;
    const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    X = t(X); Y = t(Y); Z = t(Z);
    return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
  };
  const dE = (p, q) => { const x = lab(...p), y = lab(...q); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

  const rows = (img) => {
    const out = [];
    for (let y = 0; y < img.h; y++) {
      const counts = new Map();
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const k = ((img.d[i] >> 4) << 8) | ((img.d[i + 1] >> 4) << 4) | (img.d[i + 2] >> 4);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      let best = 0, key = 0;
      for (const [k, n] of counts) if (n > best) { best = n; key = k; }
      let r = 0, g = 0, bl = 0, n = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const k = ((img.d[i] >> 4) << 8) | ((img.d[i + 1] >> 4) << 4) | (img.d[i + 2] >> 4);
        if (k === key) { r += img.d[i]; g += img.d[i + 1]; bl += img.d[i + 2]; n++; }
      }
      const bg = [r / n, g / n, bl / n];
      let ink = 0;
      const thirds = [0, 0, 0];
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const diff = Math.abs(img.d[i] - bg[0]) + Math.abs(img.d[i + 1] - bg[1]) + Math.abs(img.d[i + 2] - bg[2]);
        if (diff > 60) { ink++; thirds[Math.min(2, Math.floor((x * 3) / W))]++; }
      }
      out.push({ bg, ink: ink / W, thirds });
    }
    return out;
  };
  const ra = rows(a), rb = rows(b);

  const segment = (R, h) => {
    const minRun = Math.max(2, Math.round(h * 0.006));
    const bands = [];
    let start = 0, ref = R[0].bg;
    for (let y = 1; y < R.length; y++) {
      if (dE(R[y].bg, ref) > 8) {
        let k = 1;
        while (k < minRun && y + k < R.length && dE(R[y + k].bg, ref) > 8) k++;
        if (k >= minRun) { bands.push([start, y]); start = y; ref = R[y].bg; }
      }
    }
    bands.push([start, R.length]);
    // Split long single-color bands at wide empty gaps so same-background sections still count.
    const out = [];
    for (const [s, e] of bands) {
      const gap = Math.max(4, Math.round(h * 0.02));
      let blockStart = s, run = 0, seenInk = false;
      for (let y = s; y < e; y++) {
        if (R[y].ink < 0.004) { run++; } else { if (run >= gap && seenInk && y - run > blockStart) { out.push([blockStart, y - Math.floor(run / 2)]); blockStart = y - Math.floor(run / 2); } run = 0; seenInk = true; }
      }
      out.push([blockStart, e]);
    }
    // Merge slivers into the neighbour with the closer background.
    const min = Math.max(3, Math.round(h * 0.025));
    let merged = out.filter(([s, e]) => e > s);
    let changed = true;
    while (changed && merged.length > 1) {
      changed = false;
      for (let i = 0; i < merged.length; i++) {
        if (merged[i][1] - merged[i][0] >= min) continue;
        const j = i === 0 ? 1 : i === merged.length - 1 ? i - 1 : (merged[i + 1][1] - merged[i + 1][0] < merged[i - 1][1] - merged[i - 1][0] ? i + 1 : i - 1);
        const lo = Math.min(i, j);
        merged.splice(lo, 2, [merged[lo][0], merged[lo + 1][1]]);
        changed = true;
        break;
      }
    }
    return merged.map(([s, e]) => {
      const n = e - s;
      const bg = [0, 0, 0];
      let ink = 0;
      const thirds = [0, 0, 0];
      for (let y = s; y < e; y++) { for (let c = 0; c < 3; c++) bg[c] += R[y].bg[c] / n; ink += R[y].ink / n; for (let t = 0; t < 3; t++) thirds[t] += R[y].thirds[t]; }
      const tot = thirds[0] + thirds[1] + thirds[2] || 1;
      return { y0: s / h, y1: e / h, share: n / h, bg, bgHex: hex(bg), ink, weight: thirds.map((t) => t / tot) };
    });
  };
  const ba = segment(ra, a.h), bb = segment(rb, b.h);

  // Align sections in order (edit-distance style), cost = background distance + height-share gap.
  const cost = (p, q) => dE(p.bg, q.bg) / 12 + Math.abs(p.share - q.share) * 8 + Math.abs((p.y0 + p.y1) / 2 - (q.y0 + q.y1) / 2) * 4;
  const GAP = 1.6;
  const n = ba.length, m = bb.length;
  const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) D[i][0] = i * GAP;
  for (let j = 1; j <= m; j++) D[0][j] = j * GAP;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + cost(ba[i - 1], bb[j - 1]), D[i - 1][j] + GAP, D[i][j - 1] + GAP);
  const pairs = [];
  for (let i = n, j = m; i > 0 || j > 0;) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + cost(ba[i - 1], bb[j - 1])) { pairs.unshift([i - 1, j - 1]); i--; j--; }
    else if (i > 0 && D[i][j] === D[i - 1][j] + GAP) { pairs.unshift([i - 1, null]); i--; }
    else { pairs.unshift([null, j - 1]); j--; }
  }

  // Palettes: 4-bit buckets, merged by color distance, with share of pixels.
  const palette = (img) => {
    const counts = new Map();
    const total = W * img.h;
    for (let i = 0; i < img.d.length; i += 4) {
      const k = ((img.d[i] >> 4) << 8) | ((img.d[i + 1] >> 4) << 4) | (img.d[i + 2] >> 4);
      const e = counts.get(k) || [0, 0, 0, 0];
      e[0] += img.d[i]; e[1] += img.d[i + 1]; e[2] += img.d[i + 2]; e[3]++;
      counts.set(k, e);
    }
    const cols = [...counts.values()].map((e) => ({ c: [e[0] / e[3], e[1] / e[3], e[2] / e[3]], share: e[3] / total })).sort((x, y) => y.share - x.share);
    const merged = [];
    for (const col of cols) {
      const near = merged.find((mm) => dE(mm.c, col.c) < 10);
      if (near) near.share += col.share; else if (merged.length < 24) merged.push({ ...col });
    }
    return merged.sort((x, y) => y.share - x.share).map((p) => {
      const mx = Math.max(...p.c), mn = Math.min(...p.c);
      return { hex: hex(p.c), c: p.c, share: p.share, sat: mx ? (mx - mn) / mx : 0 };
    });
  };
  const pa = palette(a), pb = palette(b);
  const shareNear = (pal, c, tol = 14) => pal.filter((p) => dE(p.c, c) < tol).reduce((s, p) => s + p.share, 0);

  // Deltas, most important first.
  const deltas = [];
  const pct = (v) => `${Math.round(v * 100)}%`;
  const ratio = (b.h / W) / (a.h / W);
  if (ratio > 1.3) deltas.push({ severity: 2, kind: "length", text: `The build is ${ratio.toFixed(1)}x longer than the mockup relative to its width: sections are taller (padding, type size, or stacked content).` });
  if (ratio < 0.77) deltas.push({ severity: 2, kind: "length", text: `The build is ${(1 / ratio).toFixed(1)}x shorter than the mockup relative to its width: sections are compressed or missing.` });
  // First screen (what a 1440x900 window shows): dominant background and where the weight sits.
  const firstScreen = (R) => {
    const end = Math.min(R.length, Math.round((W * 900) / 1440));
    const counts = new Map();
    const thirds = [0, 0, 0];
    let ink = 0;
    for (let y = 0; y < end; y++) {
      const k = R[y].bg.map((v) => Math.round(v / 16)).join(",");
      const e = counts.get(k) || { n: 0, c: R[y].bg };
      e.n++; counts.set(k, e);
      for (let t = 0; t < 3; t++) thirds[t] += R[y].thirds[t];
      ink += R[y].ink / end;
    }
    const top = [...counts.values()].sort((u, v) => v.n - u.n)[0];
    const tot = thirds[0] + thirds[1] + thirds[2] || 1;
    return { bg: top.c, weight: thirds.map((t) => t / tot), ink };
  };
  const fa = firstScreen(ra), fb = firstScreen(rb);
  const fe = dE(fa.bg, fb.bg);
  if (fe > 12) deltas.push({ severity: 3, kind: "first-screen", text: `First screen: the mockup's dominant background is ${hex(fa.bg)}, the build's is ${hex(fb.bg)} (difference ${fe.toFixed(0)}).` });
  const sideOf = (w) => (w[1] > 0.45 ? "centered" : w[0] > w[2] + 0.15 ? "left-weighted" : w[2] > w[0] + 0.15 ? "right-weighted" : "spread");
  if (sideOf(fa.weight) !== sideOf(fb.weight)) deltas.push({ severity: 2, kind: "first-screen", text: `First screen: the mockup is ${sideOf(fa.weight)} (${fa.weight.map((w) => Math.round(w * 100)).join("/")}), the build is ${sideOf(fb.weight)} (${fb.weight.map((w) => Math.round(w * 100)).join("/")}).` });
  for (const [i, j] of pairs) {
    if (j === null) deltas.push({ severity: 3, kind: "missing-section", text: `Mockup section ${i + 1} (${pct(ba[i].y0)}-${pct(ba[i].y1)}, background ${ba[i].bgHex}) has no match in the build.` });
    else if (i === null) deltas.push({ severity: 1, kind: "extra-section", text: `Build section ${j + 1} (${pct(bb[j].y0)}-${pct(bb[j].y1)}, background ${bb[j].bgHex}) is not in the mockup.` });
    else {
      const p = ba[i], q = bb[j];
      const e = dE(p.bg, q.bg);
      if (e > 8) deltas.push({ severity: e > 25 ? 3 : 2, kind: "background", text: `Section ${i + 1}: background ${p.bgHex} in the mockup, ${q.bgHex} in the build (difference ${e.toFixed(0)}).` });
      const hr = q.share / p.share;
      if (hr > 1.5 || hr < 0.66) deltas.push({ severity: 2, kind: "height", text: `Section ${i + 1}: takes ${pct(p.share)} of the mockup but ${pct(q.share)} of the build.` });
      if (Math.abs(p.ink - q.ink) > 0.1) deltas.push({ severity: 1, kind: "density", text: `Section ${i + 1}: the build is ${q.ink > p.ink ? "busier" : "emptier"} (content covers ${pct(q.ink)} of rows vs ${pct(p.ink)}).` });
      const sa = sideOf(p.weight), sb = sideOf(q.weight);
      if (sa !== sb && p.ink > 0.02 && q.ink > 0.02) deltas.push({ severity: 2, kind: "composition", text: `Section ${i + 1}: mockup is ${sa} (${p.weight.map((w) => Math.round(w * 100)).join("/")}), build is ${sb} (${q.weight.map((w) => Math.round(w * 100)).join("/")}).` });
    }
  }
  for (const col of pa.filter((p) => p.share >= 0.01).slice(0, 8)) {
    const s = shareNear(pb, col.c);
    if (s < col.share * 0.25) deltas.push({ severity: col.share > 0.08 ? 3 : 2, kind: "palette", text: `Color ${col.hex} covers ${pct(col.share)} of the mockup but almost none of the build.` });
  }
  for (const col of pb.filter((p) => p.share >= 0.05).slice(0, 6)) {
    if (shareNear(pa, col.c) < 0.005) deltas.push({ severity: 2, kind: "palette", text: `Color ${col.hex} covers ${pct(col.share)} of the build but is not in the mockup.` });
  }
  const accent = pa.filter((p) => p.sat > 0.45 && p.share > 0.002 && p.share < 0.15).sort((x, y) => y.sat * Math.sqrt(y.share) - x.sat * Math.sqrt(x.share))[0];
  if (accent) {
    const s = shareNear(pb, accent.c, 16);
    if (s < accent.share * 0.3) deltas.push({ severity: 2, kind: "accent", text: `Accent ${accent.hex} (${(accent.share * 100).toFixed(1)}% of the mockup) is barely used in the build (${(s * 100).toFixed(2)}%).` });
    else if (s > accent.share * 3 && s > 0.02) deltas.push({ severity: 1, kind: "accent", text: `Accent ${accent.hex} is used ${(s / accent.share).toFixed(1)}x more in the build than in the mockup.` });
  }
  deltas.sort((x, y) => y.severity - x.severity);

  // Side-by-side picture with section outlines and links between matched sections.
  const DW = 420, GUT = 120, TOP = 34;
  const ha = Math.round((a.h * DW) / W), hb = Math.round((b.h * DW) / W);
  const c = document.createElement("canvas");
  c.width = DW * 2 + GUT; c.height = Math.max(ha, hb) + TOP + 10;
  const x = c.getContext("2d");
  x.fillStyle = "#1E1E1E"; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(A, 0, TOP, DW, ha);
  x.drawImage(B, DW + GUT, TOP, DW, hb);
  x.font = "600 15px sans-serif"; x.fillStyle = "#EDEDED";
  x.fillText("Mockup", 6, 22); x.fillText("Build", DW + GUT + 6, 22);
  const sevColor = { 0: "#58B368", 1: "#58B368", 2: "#E0A030", 3: "#E0533D" };
  const bandSeverity = (i, j) => {
    if (i === null || j === null) return 3;
    const e = dE(ba[i].bg, bb[j].bg), hr = bb[j].share / ba[i].share;
    return e > 25 ? 3 : e > 8 || hr > 1.5 || hr < 0.66 ? 2 : 1;
  };
  x.lineWidth = 2; x.font = "600 12px sans-serif";
  ba.forEach((s, i) => { x.strokeStyle = "rgba(255,255,255,.55)"; x.strokeRect(1, TOP + s.y0 * ha, DW - 2, s.share * ha); x.fillStyle = "#111"; x.fillRect(4, TOP + s.y0 * ha + 4, 22, 16); x.fillStyle = "#fff"; x.fillText(String(i + 1), 8, TOP + s.y0 * ha + 16); });
  bb.forEach((s, j) => { x.strokeStyle = "rgba(255,255,255,.55)"; x.strokeRect(DW + GUT + 1, TOP + s.y0 * hb, DW - 2, s.share * hb); });
  for (const [i, j] of pairs) {
    const col = sevColor[bandSeverity(i, j)];
    x.strokeStyle = col; x.fillStyle = col;
    if (i !== null && j !== null) {
      const y1 = TOP + ((ba[i].y0 + ba[i].y1) / 2) * ha, y2 = TOP + ((bb[j].y0 + bb[j].y1) / 2) * hb;
      x.beginPath(); x.moveTo(DW + 4, y1); x.bezierCurveTo(DW + GUT / 2, y1, DW + GUT / 2, y2, DW + GUT - 4, y2); x.stroke();
    } else if (i !== null) {
      const y1 = TOP + ((ba[i].y0 + ba[i].y1) / 2) * ha; x.fillText("missing", DW + 8, y1);
    } else {
      const y2 = TOP + ((bb[j].y0 + bb[j].y1) / 2) * hb; x.fillText("extra", DW + GUT - 44, y2);
    }
  }
  const strip = (s) => ({ y0: +s.y0.toFixed(3), y1: +s.y1.toFixed(3), bg: s.bgHex, ink: +s.ink.toFixed(3), weight: s.weight.map((w) => +w.toFixed(2)) });
  return {
    sizes: { mockup: a.natural, build: b.natural },
    lengthRatio: +ratio.toFixed(2),
    mockupSections: ba.map(strip),
    buildSections: bb.map(strip),
    pairs,
    palette: { mockup: pa.slice(0, 8).map((p) => ({ hex: p.hex, share: +p.share.toFixed(3) })), build: pb.slice(0, 8).map((p) => ({ hex: p.hex, share: +p.share.toFixed(3) })) },
    accent: accent ? accent.hex : null,
    deltas,
    image: c.toDataURL("image/png"),
  };
}

export function summarizeCompare(r) {
  const lines = [`${r.label}: ${r.mockupSections.length} mockup section(s), ${r.buildSections.length} build section(s); side-by-side in ${r.image}`];
  if (!r.deltas.length) lines.push("  no measurable deltas; still compare type, spacing and imagery by eye");
  r.deltas.slice(0, 15).forEach((d, i) => lines.push(`  ${i + 1}. [${["", "minor", "check", "fix"][d.severity]}] ${d.text}`));
  return lines.join("\n");
}

// ---------- CLI ----------

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opt = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
  const valueFlags = new Set(["--out", "--widths", "--dpr", "--mockup", "--mobile-mockup", "--label"]);
  const pos = rest.filter((a, i) => !a.startsWith("--") && !valueFlags.has(rest[i - 1]));
  const out = opt("--out", "review");
  if (cmd === "shoot" && pos[0]) {
    const r = await shoot(pos[0], { out, widths: opt("--widths", "1440,390").split(",").map(Number), dpr: Number(opt("--dpr", 1)), motion: rest.includes("--motion") });
    console.log(summarizeQa(r));
    process.exit(r.some((x) => x.overflowX || x.brokenImages.length || x.missingAlt.length || x.lowContrastCount || x.consoleErrors.length) ? 1 : 0);
  } else if (cmd === "compare" && pos[1]) {
    const r = await compare(pos[0], pos[1], { out, label: opt("--label", "desktop") });
    console.log(summarizeCompare(r));
  } else if (cmd === "review" && pos[0] && opt("--mockup")) {
    const browser = await openBrowser();
    try {
      const qa = await shoot(pos[0], { out, widths: opt("--widths", "1440,390").split(",").map(Number), dpr: Number(opt("--dpr", 1)), motion: rest.includes("--motion"), browser });
      console.log(summarizeQa(qa));
      const desk = qa.find((q) => !q.mobile) || qa[0];
      const reports = [await compare(opt("--mockup"), desk.file, { out, label: "desktop", browser })];
      const mob = qa.find((q) => q.mobile);
      if (opt("--mobile-mockup") && mob) reports.push(await compare(opt("--mobile-mockup"), mob.file, { out, label: "mobile", browser }));
      for (const r of reports) console.log("\n" + summarizeCompare(r));
      writeFileSync(join(out, "review.json"), JSON.stringify({ qa, compare: reports }, null, 2) + "\n");
      console.log(`\nWrote ${join(out, "review.json")}. Open the compare image(s) and list what still differs before the next pass.`);
    } finally {
      await browser.close();
    }
  } else {
    console.error("Usage:\n  node scripts/shoot-diff.mjs shoot <page.html|url> [--out review] [--widths 1440,390] [--dpr 1] [--motion]\n  node scripts/shoot-diff.mjs compare <mockup.png> <screenshot.png> [--out review] [--label desktop]\n  node scripts/shoot-diff.mjs review <page.html|url> --mockup <mockup.png> [--mobile-mockup <m.png>] [--out review]");
    process.exit(2);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  });
}
