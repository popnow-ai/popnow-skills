#!/usr/bin/env node
// Small image jobs done inside headless Chrome, so no image libraries are needed.
//
//   node scripts/image-tools.mjs palette <image> [--count 8] [--json]
//       Dominant colors with their share, suggested roles (bg, surface, ink, muted, accent)
//       and the contrast of each text pairing. Use it to turn a mockup into CSS tokens.
//   node scripts/image-tools.mjs crop <image> --rect x,y,w,h [--px] --out <file.png> [--width 1600]
//       Cut a region (percent of width/height by default, pixels with --px). Use it to lift the
//       hero picture out of a mockup as an edit reference or a stand-in.
//   node scripts/image-tools.mjs resize <image> --widths 640,1280,1920 [--format webp|jpeg|png] [--quality 82] [--out dir]
//       Responsive copies plus a ready <img srcset> snippet with width and height set.

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "./lib/browser.mjs";
import { dataUrl } from "./shoot-diff.mjs";
import { contrast } from "./lib/design-md.mjs";

async function inPage(fn, ...args) {
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.goto("about:blank");
    return await page.evaluate(fn, ...args);
  } finally {
    await browser.close();
  }
}

// ---------- palette ----------

function pagePalette(src, count) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onerror = () => fail(new Error("could not decode image"));
    img.onload = () => {
      const W = 240, H = Math.max(1, Math.round((img.naturalHeight * W) / img.naturalWidth));
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(img, 0, 0, W, H);
      const d = x.getImageData(0, 0, W, H).data;
      const buckets = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const e = buckets.get(k) || [0, 0, 0, 0];
        e[0] += d[i]; e[1] += d[i + 1]; e[2] += d[i + 2]; e[3]++;
        buckets.set(k, e);
      }
      const dist = (p, q) => Math.hypot(p[0] - q[0], (p[1] - q[1]) * 1.2, p[2] - q[2]);
      const cols = [...buckets.values()].map((e) => ({ c: [e[0] / e[3], e[1] / e[3], e[2] / e[3]], n: e[3] })).sort((a, b) => b.n - a.n);
      const merged = [];
      for (const col of cols) {
        const near = merged.find((m) => dist(m.c, col.c) < 22);
        if (near) { const t = near.n + col.n; near.c = near.c.map((v, i) => (v * near.n + col.c[i] * col.n) / t); near.n = t; }
        else merged.push({ ...col });
      }
      const total = W * H;
      const hex = (c2) => "#" + c2.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
      ok(merged.sort((a, b) => b.n - a.n).slice(0, count).map((m) => {
        const mx = Math.max(...m.c), mn = Math.min(...m.c);
        return { hex: hex(m.c), share: +(m.n / total).toFixed(4), sat: +(mx ? (mx - mn) / mx : 0).toFixed(2), light: +((0.299 * m.c[0] + 0.587 * m.c[1] + 0.114 * m.c[2]) / 255).toFixed(2) };
      }));
    };
    img.src = src;
  });
}

export function suggestRoles(colors) {
  if (!colors.length) return {};
  const bg = colors[0];
  const rest = colors.slice(1);
  const byContrast = [...rest].sort((a, b) => contrast(b.hex, bg.hex) - contrast(a.hex, bg.hex));
  const ink = byContrast[0] || bg;
  const accent = rest.filter((c) => c.sat > 0.35 && c.hex !== ink.hex).sort((a, b) => b.sat * Math.sqrt(b.share) - a.sat * Math.sqrt(a.share))[0] || null;
  const surface = rest.find((c) => c !== accent && c !== ink && Math.abs(c.light - bg.light) < 0.12 && c.hex !== bg.hex) || null;
  const muted = rest.find((c) => c !== accent && c !== ink && c !== surface && contrast(c.hex, bg.hex) >= 3) || null;
  const roles = { bg: bg.hex, ink: ink.hex };
  if (surface) roles.surface = surface.hex;
  if (muted) roles.muted = muted.hex;
  if (accent) roles.accent = accent.hex;
  return roles;
}

// ---------- crop ----------

function pageCrop(src, rect, px, width) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onerror = () => fail(new Error("could not decode image"));
    img.onload = () => {
      const [x, y, w, h] = px ? rect : [rect[0] / 100 * img.naturalWidth, rect[1] / 100 * img.naturalHeight, rect[2] / 100 * img.naturalWidth, rect[3] / 100 * img.naturalHeight];
      const sx = Math.max(0, Math.round(x)), sy = Math.max(0, Math.round(y));
      const sw = Math.min(img.naturalWidth - sx, Math.round(w)), sh = Math.min(img.naturalHeight - sy, Math.round(h));
      const scale = width ? width / sw : 1;
      const c = document.createElement("canvas");
      c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      ok({ data: c.toDataURL("image/png"), width: c.width, height: c.height, source: [img.naturalWidth, img.naturalHeight], rect: [sx, sy, sw, sh] });
    };
    img.src = src;
  });
}

// ---------- resize ----------

function pageResize(src, widths, mime, quality) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onerror = () => fail(new Error("could not decode image"));
    img.onload = () => {
      const out = [];
      for (const w of widths) {
        if (w > img.naturalWidth) continue;
        const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);
        out.push({ width: w, height: h, data: c.toDataURL(mime, quality) });
      }
      ok({ natural: [img.naturalWidth, img.naturalHeight], out });
    };
    img.src = src;
  });
}

// ---------- CLI ----------

async function main() {
  const [cmd, file, ...rest] = process.argv.slice(2);
  const opt = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
  if (cmd === "palette" && file) {
    const colors = await inPage(pagePalette, dataUrl(file), Number(opt("--count", 8)));
    const roles = suggestRoles(colors);
    const pairs = [["ink", "bg"], ["muted", "bg"], ["ink", "surface"], ["accent", "bg"]].filter(([a, b]) => roles[a] && roles[b]).map(([a, b]) => ({ pair: `${a} on ${b}`, ratio: +contrast(roles[a], roles[b]).toFixed(2) }));
    if (rest.includes("--json")) return console.log(JSON.stringify({ colors, roles, pairs }, null, 2));
    for (const c of colors) console.log(`${c.hex}  ${(c.share * 100).toFixed(1).padStart(5)}%  sat ${c.sat}  light ${c.light}`);
    console.log("\nSuggested tokens (check by eye; the mockup is the reference, not the law):");
    console.log(":root {\n" + Object.entries(roles).map(([k, v]) => `  --${k}: ${v};`).join("\n") + "\n}");
    for (const p of pairs) console.log(`${p.pair.padEnd(18)} ${p.ratio}:1 ${p.ratio >= 4.5 ? "ok for body text" : p.ratio >= 3 ? "large text only" : "too low for text"}`);
  } else if (cmd === "crop" && file && opt("--rect") && opt("--out")) {
    const rect = opt("--rect").split(",").map(Number);
    if (rect.length !== 4 || rect.some((v) => !Number.isFinite(v))) throw new Error("--rect needs x,y,w,h");
    const r = await inPage(pageCrop, dataUrl(file), rect, rest.includes("--px"), opt("--width") ? Number(opt("--width")) : 0);
    const outFile = resolve(opt("--out"));
    mkdirSync(resolve(outFile, ".."), { recursive: true });
    writeFileSync(outFile, Buffer.from(r.data.split(",")[1], "base64"));
    console.log(`Cropped ${r.rect.join(",")} px of ${r.source.join("x")} -> ${outFile} (${r.width}x${r.height})`);
  } else if (cmd === "resize" && file && opt("--widths")) {
    const format = opt("--format", "webp");
    const mime = { webp: "image/webp", jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png" }[format];
    if (!mime) throw new Error("--format must be webp, jpeg or png");
    const widths = opt("--widths").split(",").map(Number).sort((a, b) => a - b);
    const r = await inPage(pageResize, dataUrl(file), widths, mime, Number(opt("--quality", 82)) / 100);
    const dir = resolve(opt("--out", "."));
    mkdirSync(dir, { recursive: true });
    const stem = basename(file, extname(file));
    const ext = format === "jpg" ? "jpeg" : format;
    const written = [];
    for (const o of r.out) {
      const f = join(dir, `${stem}-${o.width}.${ext}`);
      const buf = Buffer.from(o.data.split(",")[1], "base64");
      writeFileSync(f, buf);
      written.push({ f, ...o, bytes: buf.length });
      console.log(`${f}  ${o.width}x${o.height}  ${(buf.length / 1024).toFixed(0)} KB`);
    }
    if (!written.length) throw new Error(`Every requested width is larger than the source (${r.natural[0]}px)`);
    const skipped = widths.filter((w) => w > r.natural[0]);
    if (skipped.length) console.log(`Skipped ${skipped.join(", ")}px: larger than the ${r.natural[0]}px source (regenerate or upscale if you need them).`);
    const largest = written[written.length - 1];
    const rel = (f) => `${basename(dir)}/${basename(f)}`;
    console.log(`\n<img src="${rel(largest.f)}" srcset="${written.map((w) => `${rel(w.f)} ${w.width}w`).join(", ")}" sizes="(min-width: 1100px) 50vw, 100vw" width="${largest.width}" height="${largest.height}" alt="" loading="lazy" decoding="async">`);
    console.log("Set alt, adjust sizes to the layout, and drop loading=\"lazy\" for the first-screen image.");
  } else {
    console.error("Usage:\n  node scripts/image-tools.mjs palette <image> [--count 8] [--json]\n  node scripts/image-tools.mjs crop <image> --rect x,y,w,h [--px] --out <file.png> [--width 1600]\n  node scripts/image-tools.mjs resize <image> --widths 640,1280,1920 [--format webp|jpeg|png] [--quality 82] [--out dir]");
    process.exit(2);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  });
}

export { pagePalette, pageCrop, pageResize };
