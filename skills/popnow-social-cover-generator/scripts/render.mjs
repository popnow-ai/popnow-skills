#!/usr/bin/env node
// Renders a cover spec (JSON) to exact-size PNG / WebP / JPEG files with headless Chrome,
// checks every file, and makes a contact sheet.
//
//   node scripts/render.mjs spec.json [--out covers] [--only og,x] [--formats png,webp]
//                           [--quality 86] [--overlay] [--no-sheet] [--json]
//
// Text is always real HTML text in bundled (or your own) fonts; pictures are only backgrounds,
// subjects and screenshots. Checks per output: exact pixel size, file weight against the
// platform budget and limit, text that does not fit, text outside the safe area or inside a
// reserved zone (for example the video duration badge), text too small for the placement,
// contrast of every text block measured on the rendered pixels, fonts that fell back,
// missing pictures. Exit code 1 when any check fails.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { openBrowser } from "./lib/browser.mjs";
import { findDesignMd, readDesignMd, parseColor } from "./lib/design-md.mjs";
import { imageInfo } from "./lib/imagesize.mjs";
import { PLATFORMS, DEFAULT_SET, shapeOf } from "./lib/platforms.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(HERE, "../templates");
const { LAYOUTS, fitText } = await import(pathToFileURL(join(TEMPLATES, "layouts.mjs")).href);
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

const BUNDLED_FONTS = [
  ["Fraunces", "fraunces-latin-wght-normal.woff2", "100 900", "normal"],
  ["Fraunces", "fraunces-latin-wght-italic.woff2", "100 900", "italic"],
  ["Source Sans 3", "source-sans-3-latin-wght-normal.woff2", "200 900", "normal"],
  ["Bricolage Grotesque", "bricolage-grotesque-var.woff2", "200 800", "normal"],
  ["Anton", "anton-latin.woff2", "400", "normal"],
  ["IBM Plex Mono", "ibm-plex-mono-latin-400-normal.woff2", "400", "normal"],
  ["Caveat", "caveat-latin.woff2", "400 700", "normal"],
];

const DEFAULT_THEME = { bg: "#F4EFE6", surface: "#FFFFFF", ink: "#1B1A17", muted: "#5F5A52", accent: "#D9472B", accentInk: "#FFFFFF", onImage: "#FFFFFF" };

// ---------- spec loading ----------

export function loadSpec(specPath) {
  const file = resolve(specPath);
  const spec = JSON.parse(readFileSync(file, "utf8"));
  return { spec, dir: dirname(file), file };
}

function mix(a, b, t) {
  const ca = parseColor(a), cb = parseColor(b);
  if (!ca || !cb) return a;
  const h = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(ca.r * (1 - t) + cb.r * t)}${h(ca.g * (1 - t) + cb.g * t)}${h(ca.b * (1 - t) + cb.b * t)}`.toUpperCase();
}

export function resolveTheme(spec, dir) {
  let design = null;
  if (spec.design !== false) {
    const p = typeof spec.design === "string" ? resolve(dir, spec.design) : findDesignMd(dir);
    if (p && existsSync(p)) design = readDesignMd(p);
  }
  const roles = design?.roles || {};
  const t = { ...DEFAULT_THEME };
  for (const k of ["bg", "surface", "ink", "muted", "accent", "accentInk"]) if (roles[k]) t[k] = roles[k];
  if (design?.colors?.secondary) t.second = design.colors.secondary;
  Object.assign(t, Object.fromEntries(Object.entries(spec.theme || {}).filter(([k]) => k !== "fonts")));
  if (!t.second) t.second = mix(t.bg, t.accent, 0.2);
  if (!roles.muted && !(spec.theme || {}).muted) {
    // Secondary text: as light as possible while staying at 4.6:1 or better on both surfaces.
    for (let w = 0.4; w >= 0; w -= 0.02) {
      const c = mix(t.ink, t.bg, w);
      if ((contrastOf(c, t.bg) || 0) >= 4.6 && (contrastOf(c, t.surface) || 0) >= 4.6) { t.muted = c; break; }
    }
  }
  const fonts = { ...(spec.theme?.fonts || {}) };
  if (design?.fonts?.display && !("title" in fonts)) {
    fonts.title = design.fonts.display;
    if (design.fonts.displayWeight && !fonts.titleWeight) fonts.titleWeight = design.fonts.displayWeight;
  }
  if (design?.fonts?.text && !("text" in fonts)) fonts.text = design.fonts.text;
  if (design?.fonts?.mono && !("mono" in fonts)) fonts.mono = design.fonts.mono;
  return { theme: t, fonts, design };
}

function resolveFile(p, dir) {
  if (!p) return null;
  const abs = resolve(dir, p);
  if (!existsSync(abs)) return null;
  if (statSync(abs).isDirectory()) {
    const f = readdirSync(abs).filter((n) => IMAGE_EXT.test(n)).sort()[0];
    return f ? join(abs, f) : null;
  }
  return abs;
}

// An image entry is a path, or { src, landscape, portrait, tall, focus, contain, prompt }.
function pickImage(entry, shape, dir) {
  if (!entry) return { img: null, expected: false };
  const e = typeof entry === "string" ? { src: entry } : entry;
  const path = resolveFile(e[shape], dir) || resolveFile(e.src, dir);
  if (!path) return { img: null, expected: true, wanted: e[shape] || e.src || null, prompt: e.prompt || null };
  return { img: { path, url: pathToFileURL(path).href, focus: e.focus || null, contain: !!e.contain }, expected: true };
}

// ---------- HTML ----------

function fontFaces(spec, dir) {
  const faces = BUNDLED_FONTS.map(([fam, file, weight, style]) => `@font-face{font-family:"${fam}";src:url("${pathToFileURL(join(TEMPLATES, "fonts", file)).href}") format("woff2");font-weight:${weight};font-style:${style};font-display:block}`);
  for (const f of spec.fonts || []) {
    const p = resolve(dir, f.src);
    faces.push(`@font-face{font-family:"${f.family}";src:url("${pathToFileURL(p).href}");font-weight:${f.weight || "100 900"};font-style:${f.style || "normal"};font-display:block}`);
  }
  return faces.join("\n");
}

// Small text in the accent color must still reach 4.5:1; nudge the accent toward the ink until it does.
function readable(fg, bg, ink) {
  for (let i = 0; i <= 20; i++) {
    const c = mix(fg, ink, i * 0.05);
    if ((contrastOf(c, bg) || 0) >= 4.5) return c;
  }
  return ink;
}
function contrastOf(a, b) {
  const L = (h) => { const c = parseColor(h); if (!c) return null; return [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const x = L(a), y = L(b);
  if (x == null || y == null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const q = (fam) => (fam ? `"${String(fam).replace(/"/g, "")}"` : null);

export function buildHtml({ spec, dir, theme, fonts, out, platform, platformId, layout, copy, images, placeholder, brand }) {
  const shape = shapeOf(platform.width, platform.height);
  const u = Math.min(platform.width, platform.height) / 100;
  // Text unit: one hundredth of the short side, raised where the placement is viewed small
  // (body text is 3.6t, small text 2.7t, titles at least 7t, so this keeps every role legible).
  const t = Math.max(u, platform.minText / 3.5) * (out.textScale || 1);
  const s = platform.safe;
  const vars = [
    `width:${platform.width}px`, `height:${platform.height}px`,
    `--u:${u.toFixed(3)}px`, `--t:${t.toFixed(3)}px`,
    `--st:${s.top}px`, `--sr:${s.right}px`, `--sb:${s.bottom}px`, `--sl:${s.left}px`,
    `--bg:${theme.bg}`, `--surface:${theme.surface}`, `--ink:${theme.ink}`, `--muted:${theme.muted}`,
    `--accent:${theme.accent}`, `--accent-ink:${theme.accentInk}`, `--second:${theme.second}`, `--on-image:${theme.onImage}`,
    `--accent-text:${readable(theme.accent, theme.bg, theme.ink)}`, `--accent-text-surface:${readable(theme.accent, theme.surface, theme.ink)}`,
  ];
  if (theme.em) vars.push(`--em:${theme.em}`);
  if (out.shade != null || images.background?.shade != null) vars.push(`--shade:${out.shade ?? images.background.shade}`);
  const famVar = { display: "--f-display", serif: "--f-serif", condensed: "--f-cond", text: "--f-text", mono: "--f-mono", hand: "--f-hand", title: "--f-title" };
  const fallback = { display: "system-ui, sans-serif", serif: "Georgia, serif", condensed: "sans-serif", text: "system-ui, sans-serif", mono: "ui-monospace, monospace", hand: "cursive", title: "var(--f-display)" };
  for (const [role, v] of Object.entries(fonts)) if (famVar[role] && v) vars.push(`${famVar[role]}:${q(v)}, ${fallback[role]}`);
  if (fonts.title && fonts.titleWeight) vars.push(`--title-weight:${Number(fonts.titleWeight)}`);
  if (out.titleCase) vars.push(`--title-case:${out.titleCase}`);
  const short = { "editorial-serif": "editorial", "bold-sans": "bold", "split-photo": "split", "sticker-collage": "sticker", "minimal-mono": "mono", "data-callout": "data", "device-showcase": "device" };
  const classes = ["cover", `L-${short[layout]}`, `S-${shape}`, `P-${platformId}`];
  if ((layout === "bold-sans" || layout === "device-showcase") && images.background) classes.push("on-image");
  if (out.flip) classes.push("flip");
  const body = LAYOUTS[layout](copy, { images, placeholder, brand });
  return `<!doctype html>
<html lang="${esc(spec.lang || "en")}"><head><meta charset="utf-8">
<title>${esc(out.id)} ${platform.width}x${platform.height}</title>
<style>
${fontFaces(spec, dir)}
html,body{margin:0;padding:0;background:#fff}
</style>
<link rel="stylesheet" href="${pathToFileURL(join(TEMPLATES, "covers.css")).href}">
${spec.css ? `<style>${spec.css}</style>` : ""}
</head><body>
<div class="${classes.join(" ")}" style="${esc(vars.join(";"))}">
${body}
<div class="safe-guide"></div>
</div>
<script>document.fonts.ready.then(${fitText.toString()});</script>
</body></html>
`;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------- in-page checks ----------

function pageChecks(reserves) {
  const cover = document.querySelector(".cover");
  const c = cover.getBoundingClientRect();
  const safe = document.querySelector(".safe-guide").getBoundingClientRect();
  const texts = [];
  for (const el of document.querySelectorAll("[data-text]")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || !el.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tr = range.getBoundingClientRect();
    const box = el.dataset.fit ? tr : r;
    const cs = getComputedStyle(el);
    // An element with its own opaque fill (sticker, stamp, button) is judged against that fill.
    const own = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(cs.backgroundColor);
    const ownBg = own && (own[4] == null || +own[4] >= 0.85) && cs.backgroundImage === "none" ? cs.backgroundColor : null;
    texts.push({
      role: el.dataset.text,
      text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 60),
      x: box.left - c.left, y: box.top - c.top, w: box.width, h: box.height,
      size: parseFloat(cs.fontSize), color: cs.color, weight: Number(cs.fontWeight), ownBg,
    });
  }
  const tol = 1.5;
  const outside = texts.filter((t) => t.x < safe.left - c.left - tol || t.y < safe.top - c.top - tol || t.x + t.w > safe.right - c.left + tol || t.y + t.h > safe.bottom - c.top + tol);
  const inReserve = [];
  for (const z of reserves || []) for (const t of texts) if (t.x < z.x + z.w && t.x + t.w > z.x && t.y < z.y + z.h && t.y + t.h > z.y) inReserve.push({ zone: z.name, text: t.text });
  const families = new Set();
  for (const el of cover.querySelectorAll("*")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const f = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (f) families.add(f);
  }
  const ctx = document.createElement("canvas").getContext("2d");
  const wd = (font) => { ctx.font = font; return ctx.measureText("Hamburgefonstiv 0123456789").width; };
  const fallback = [...families].filter((f) => !/^(serif|sans-serif|monospace|cursive|system-ui|ui-monospace)$/i.test(f) && (document.fonts.check(`20px "${f}"`) === false || ["monospace", "serif"].every((g) => wd(`40px "${f}", ${g}`) === wd(`40px ${g}`))));
  const brokenImages = [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute("src"));
  return { texts, outside: outside.map((t) => t.text), inReserve, fallback, brokenImages };
}

// Measures each text block against the pixels actually behind it.
function pageContrast(png, texts) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const x = cv.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0);
      const lum = (r, g, b) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const rgb = (s) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s || ""); return m ? [+m[1], +m[2], +m[3]] : null; };
      const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const out = [];
      for (const t of texts) {
        const tc = rgb(t.color);
        if (!tc) { out.push(null); continue; }
        const lt = lum(...tc);
        const own = rgb(t.ownBg);
        if (own) { out.push({ ratio: +ratio(lt, lum(...own)).toFixed(2), against: "own fill" }); continue; }
        const x0 = Math.max(0, Math.floor(t.x)), y0 = Math.max(0, Math.floor(t.y));
        const w = Math.min(cv.width - x0, Math.ceil(t.w)), h = Math.min(cv.height - y0, Math.ceil(t.h));
        if (w < 4 || h < 4) { out.push(null); continue; }
        const d = x.getImageData(x0, y0, w, h).data;
        // Glyph pixels and their anti-aliased edges are not background: mask pixels close to
        // the text color, grow the mask by 2px, and judge only what is left.
        const core = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const j = i * 4;
          if (Math.abs(d[j] - tc[0]) + Math.abs(d[j + 1] - tc[1]) + Math.abs(d[j + 2] - tc[2]) <= 150) core[i] = 1;
        }
        const R = 2;
        const horiz = new Uint8Array(w * h);
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          let v = 0;
          for (let k = -R; k <= R && !v; k++) { const xk = xx + k; if (xk >= 0 && xk < w && core[yy * w + xk]) v = 1; }
          horiz[yy * w + xx] = v;
        }
        const ls = [];
        const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 8000)));
        for (let yy = 0; yy < h; yy += step) for (let xx = 0; xx < w; xx += step) {
          let near = 0;
          for (let k = -R; k <= R && !near; k++) { const yk = yy + k; if (yk >= 0 && yk < h && horiz[yk * w + xx]) near = 1; }
          if (near) continue;
          const j = (yy * w + xx) * 4;
          ls.push(lum(d[j], d[j + 1], d[j + 2]));
        }
        if (ls.length < 12) {
          // Text and background are so close that nothing is left after masking: compare with the most common color.
          const counts = new Map();
          for (let i = 0; i < d.length; i += 16) { const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3); counts.set(k, (counts.get(k) || 0) + 1); }
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          const mode = [((top >> 10) & 31) * 8 + 4, ((top >> 5) & 31) * 8 + 4, (top & 31) * 8 + 4];
          out.push({ ratio: +ratio(lt, lum(...mode)).toFixed(2), against: "dominant color", note: "text and background are nearly the same color" });
          continue;
        }
        ls.sort((a, b) => a - b);
        const median = ls[Math.floor(ls.length / 2)];
        const worst = lt > median ? ls[Math.floor(ls.length * 0.9)] : ls[Math.floor(ls.length * 0.1)];
        out.push({ ratio: +ratio(lt, worst).toFixed(2), against: "pixels" });
      }
      ok(out);
    };
    img.src = png;
  });
}

function pageOverlay(platform) {
  const cover = document.querySelector(".cover");
  const ov = document.createElement("div");
  ov.className = "ov";
  ov.innerHTML = `<div class="safe-line"></div>` +
    (platform.reserve || []).map((z) => `<div class="reserve" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px"></div><div class="tag" style="left:${z.x + 4}px;top:${z.y + 4}px">${z.name}</div>`).join("") +
    (platform.info || []).map((z) => `<div class="info" style="left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px"></div><div class="tag" style="left:${z.x + 4}px;top:${z.y + z.h - 22}px">${z.name}</div>`).join("");
  cover.appendChild(ov);
  return true;
}

// ---------- main render ----------

export async function render(specPath, opts = {}) {
  const { spec, dir } = loadSpec(specPath);
  const outDir = resolve(opts.out || join(dir, spec.out || "covers"));
  mkdirSync(join(outDir, "_html"), { recursive: true });
  const { theme, fonts, design } = resolveTheme(spec, dir);
  const brandFor = (o) => {
    const b = { ...(spec.brand || {}), ...(o.brand || {}) };
    if (b.logo) {
      const lp = resolveFile(b.logo, dir);
      if (lp) b.logoUrl = pathToFileURL(lp).href;
    }
    return b;
  };
  let outputs = spec.outputs?.length ? spec.outputs : DEFAULT_SET.map((p) => ({ id: p, platform: p, layout: spec.defaults?.layout || "editorial-serif" }));
  if (opts.only?.length) outputs = outputs.filter((o) => opts.only.includes(o.id) || opts.only.includes(o.platform));
  const quality = Number(opts.quality ?? spec.defaults?.quality ?? 86);
  const results = [];
  const browser = opts.browser || (await openBrowser());
  try {
    for (const o of outputs) {
      const id = o.id || o.platform;
      const base = PLATFORMS[o.platform];
      const r = { id, platform: o.platform, layout: o.layout, files: [], errors: [], warnings: [] };
      results.push(r);
      if (!base && !(o.width && o.height)) { r.errors.push(`unknown platform "${o.platform}" (known: ${Object.keys(PLATFORMS).join(", ")}, or give width and height)`); continue; }
      if (!LAYOUTS[o.layout]) { r.errors.push(`unknown layout "${o.layout}" (known: ${Object.keys(LAYOUTS).join(", ")})`); continue; }
      const platform = { ...(base || { safe: { top: 48, right: 48, bottom: 48, left: 48 }, reserve: [], info: [], budget: 1536 * 1024, limit: null, minText: 24, titleWords: 12, formats: ["png", "webp"] }), ...(o.width ? { width: o.width, height: o.height } : {}), ...(o.safe ? { safe: { ...(base?.safe || {}), ...o.safe } } : {}) };
      r.size = `${platform.width}x${platform.height}`;
      const shape = shapeOf(platform.width, platform.height);
      const shared = { ...(spec.copy || {}) };
      for (const k of platform.drop || []) delete shared[k];
      const copy = { ...shared, ...(o.copy || {}), stat: { ...(spec.copy?.stat || {}), ...(o.copy?.stat || {}) } };
      if (o.layout === "data-callout" && !copy.stat?.value) { r.errors.push("data-callout needs copy.stat.value"); continue; }
      if (o.layout !== "data-callout" && !copy.title) { r.errors.push("copy.title is empty"); continue; }
      const imgs = { ...(spec.images || {}), ...(o.images || {}) };
      const placeholder = {};
      const images = {};
      const use = (slot, entry) => {
        const p = pickImage(entry, shape, dir);
        if (p.img) images[slot] = p.img;
        else if (p.expected) { placeholder[slot] = true; r.warnings.push(`${slot}: no file${p.wanted ? ` at ${p.wanted}` : ""}; drew a placeholder${p.prompt ? " (generate it: scripts/bg-plan.mjs)" : ""}`); }
      };
      if (o.layout === "editorial-serif") use("plate", o.plate === "subject" ? { ...(typeof imgs.subject === "string" ? { src: imgs.subject } : imgs.subject), contain: true } : imgs.background);
      if (["bold-sans", "split-photo", "device-showcase"].includes(o.layout) && o.background !== false) use("background", imgs.background);
      if (o.layout === "split-photo" && !images.background) placeholder.background = true;
      if (["bold-sans", "sticker-collage"].includes(o.layout) && o.subject !== false) use("subject", imgs.subject);
      if (o.layout === "minimal-mono" && o.thumb) use("thumb", imgs.background);
      if (o.layout === "device-showcase") {
        const screens = imgs.screens || [];
        if (screens.length) use("screen", screens[o.screen || 0]);
      }
      if (images.background && imgs.background?.shade != null) images.background.shade = imgs.background.shade;
      const html = buildHtml({ spec, dir, theme: { ...theme, ...(o.theme || {}) }, fonts, out: o, platform, platformId: o.platform, layout: o.layout, copy, images, placeholder, brand: brandFor(o) });
      const htmlFile = join(outDir, "_html", `${id}.html`);
      writeFileSync(htmlFile, html);

      const page = await browser.newPage();
      await page.setViewport({ width: platform.width, height: platform.height, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(htmlFile).href);
      const fit = await page.evaluate(fitText);
      const chk = await page.evaluate(pageChecks, platform.reserve || []);
      const clip = { x: 0, y: 0, width: platform.width, height: platform.height };
      const png = await page.screenshot({ format: "png", clip });
      const contrast = await page.evaluate(pageContrast, `data:image/png;base64,${png.toString("base64")}`, chk.texts);

      // Fit, safe area, reserved zones, sizes, contrast, fonts.
      for (const f of fit) if (f.overflow) r.errors.push(`${f.role} does not fit even at ${f.min}px; shorten it`);
      for (const t of chk.outside) r.errors.push(`text outside the safe area: "${t}"`);
      for (const z of chk.inReserve) r.errors.push(`text under the ${z.zone}: "${z.text}"`);
      for (const f of chk.fallback) r.warnings.push(`font "${f}" is not available; the text fell back to another font (add it under "fonts" in the spec)`);
      for (const b of chk.brokenImages) r.errors.push(`image did not load: ${b}`);
      const min = platform.minText;
      chk.texts.forEach((t, i) => {
        const need = t.role === "title" ? 2 * min : t.role === "body" ? min : Math.round(0.75 * min);
        if (t.size + 0.5 < need) r.warnings.push(`${t.role} "${t.text}" is ${Math.round(t.size)}px; at the size ${platform.label || "this placement"} is usually shown it needs ${need}px or more`);
        const cr = contrast[i];
        if (cr) {
          const large = t.role === "title" || t.size >= 1.6 * min;
          const needC = large ? 3 : 4.5;
          if (cr.ratio < needC) r.errors.push(`low contrast ${cr.ratio}:1 (needs ${needC}:1) for ${t.role} "${t.text}"${cr.note ? ` (${cr.note})` : ""}`);
        }
      });
      const titleWords = String(copy.title || "").replace(/\*/g, "").split(/\s+/).filter(Boolean).length;
      if (o.layout !== "data-callout" && titleWords > platform.titleWords) r.warnings.push(`title has ${titleWords} words; ${platform.titleWords} or fewer reads better here`);
      r.fit = fit.map((f) => ({ role: f.role, size: f.size }));
      r.contrast = chk.texts.map((t, i) => ({ role: t.role, text: t.text, ratio: contrast[i]?.ratio ?? null }));

      // Files.
      const formats = (opts.formats || o.formats || platform.formats).map((f) => (f === "jpg" ? "jpeg" : f));
      const write = (fmt, buf) => {
        const ext = fmt === "jpeg" ? "jpg" : fmt;
        const file = join(outDir, `${id}.${ext}`);
        writeFileSync(file, buf);
        const info = imageInfo(buf);
        const entry = { file, format: fmt, bytes: buf.length, width: info?.width, height: info?.height, alpha: info?.alpha };
        r.files.push(entry);
        if (!info || info.width !== platform.width || info.height !== platform.height) r.errors.push(`${basename(file)} is ${info ? `${info.width}x${info.height}` : "unreadable"}, expected ${platform.width}x${platform.height}`);
        if (platform.limit && buf.length > platform.limit) r.errors.push(`${basename(file)} is ${(buf.length / 1048576).toFixed(2)} MB, over the ${(platform.limit / 1048576).toFixed(0)} MB upload limit`);
        else if (platform.budget && buf.length > platform.budget) r.warnings.push(`${basename(file)} is ${Math.round(buf.length / 1024)} KB, over the ${Math.round(platform.budget / 1024)} KB budget`);
        return entry;
      };
      for (const fmt of formats) {
        if (fmt === "png") write("png", png);
        else write(fmt, await page.screenshot({ format: fmt, quality: fmt === "jpeg" ? Math.max(quality, 90) : quality, clip }));
      }
      // A PNG over a hard limit gets a JPEG beside it so there is always something uploadable.
      const pngEntry = r.files.find((f) => f.format === "png");
      if (pngEntry && platform.limit && pngEntry.bytes > platform.limit && !formats.includes("jpeg")) {
        const jpg = write("jpeg", await page.screenshot({ format: "jpeg", quality: 88, clip }));
        r.warnings.push(`wrote ${basename(jpg.file)} (${Math.round(jpg.bytes / 1024)} KB) to upload instead of the PNG`);
      }
      if (opts.overlay) {
        mkdirSync(join(outDir, "review"), { recursive: true });
        await page.evaluate(pageOverlay, { reserve: platform.reserve || [], info: platform.info || [] });
        const ovFile = join(outDir, "review", `${id}.overlay.png`);
        writeFileSync(ovFile, await page.screenshot({ format: "png", clip }));
        r.overlay = ovFile;
      }
      await page.close();
    }
    if (!opts.noSheet) {
      const name = spec.name || basename(specPath, extname(specPath));
      await contactSheet(browser, results, outDir, name, false);
      if (opts.overlay) await contactSheet(browser, results, outDir, name, true);
    }
  } finally {
    if (!opts.browser) await browser.close();
  }
  const report = { spec: resolve(specPath), out: outDir, theme, fonts, designMd: design?.path || null, outputs: results };
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  return report;
}

async function contactSheet(browser, results, outDir, name, overlay) {
  const cards = results.filter((r) => r.files.length).map((r) => {
    const f = overlay ? r.overlay : (r.files.find((x) => x.format === "png") || r.files[0]).file;
    if (!f) return "";
    const [w, h] = r.size.split("x").map(Number);
    const shape = shapeOf(w, h);
    const height = shape === "landscape" ? 300 : shape === "portrait" ? 420 : 560;
    const weights = r.files.map((x) => `${x.format} ${Math.round(x.bytes / 1024)} KB`).join(" / ");
    const status = r.errors.length ? `<b class="bad">${r.errors.length} error(s)</b>` : r.warnings.length ? `<b class="warn">${r.warnings.length} warning(s)</b>` : `<b class="ok">OK</b>`;
    return `<figure><img src="${pathToFileURL(f).href}" style="height:${height}px;width:${Math.round((height * w) / h)}px"><figcaption><strong>${esc(r.id)}</strong> ${esc(r.platform)} / ${esc(r.layout)}<br>${r.size} &middot; ${weights} &middot; ${status}</figcaption></figure>`;
  }).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#18181A;color:#E8E8E8;font:14px/1.45 system-ui,sans-serif}
header{padding:24px 32px 0;font-size:16px}header span{color:#9A9AA0}
main{display:flex;flex-wrap:wrap;gap:28px 32px;padding:24px 32px 36px;align-items:flex-end}
figure{margin:0}img{display:block;border-radius:4px;box-shadow:0 0 0 1px #333}
figcaption{margin-top:8px;color:#B8B8BE}figcaption strong{color:#fff}.ok{color:#6FCF8A}.warn{color:#F2C14E}.bad{color:#FF7A6B}
</style></head><body><header>${esc(name)} <span>&middot; ${results.length} cover(s)${overlay ? " &middot; safe areas (blue), reserved zones (red), crop guides (orange)" : ""}</span></header><main>${cards}</main></body></html>`;
  const file = join(outDir, "_html", overlay ? "contact-sheet.overlay.html" : "contact-sheet.html");
  writeFileSync(file, html);
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href);
  const stem = overlay ? "contact-sheet.overlay" : "contact-sheet";
  const png = await page.screenshot({ format: "png", fullPage: true });
  writeFileSync(join(outDir, `${stem}.png`), png);
  const webp = await page.screenshot({ format: "webp", quality: 80, fullPage: true });
  writeFileSync(join(outDir, `${stem}.webp`), webp);
  await page.close();
  return join(outDir, `${stem}.png`);
}

export function summarize(report) {
  const lines = [];
  for (const r of report.outputs) {
    const files = r.files.map((f) => `${basename(f.file)} ${Math.round(f.bytes / 1024)}KB`).join(", ");
    lines.push(`${r.errors.length ? "FAIL" : r.warnings.length ? "warn" : "ok  "}  ${r.id.padEnd(12)} ${(r.size || "").padEnd(10)} ${String(r.layout).padEnd(16)} ${files}`);
    for (const e of r.errors) lines.push(`        error: ${e}`);
    for (const w of r.warnings) lines.push(`        warn:  ${w}`);
  }
  lines.push(`\nWrote ${report.out} (covers, report.json, contact-sheet.png)`);
  return lines.join("\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const specPath = argv.find((a, i) => !a.startsWith("--") && !["--out", "--only", "--formats", "--quality"].includes(argv[i - 1]));
  if (!specPath) {
    console.error("Usage: node scripts/render.mjs spec.json [--out covers] [--only og,x] [--formats png,webp] [--quality 86] [--overlay] [--no-sheet] [--json]");
    process.exit(2);
  }
  const report = await render(specPath, {
    out: opt("--out"),
    only: opt("--only")?.split(","),
    formats: opt("--formats")?.split(","),
    quality: opt("--quality"),
    overlay: argv.includes("--overlay"),
    noSheet: argv.includes("--no-sheet"),
  });
  console.log(argv.includes("--json") ? JSON.stringify(report, null, 2) : summarize(report));
  process.exit(report.outputs.some((r) => r.errors.length) ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  });
}
