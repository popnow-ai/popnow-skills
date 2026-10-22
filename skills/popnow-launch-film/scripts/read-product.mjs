#!/usr/bin/env node
// read-product.mjs - read a product page, a README or a repository into film/product.json.
//
// The launch film may only claim what this file lists under "facts" (or what the user says).
// It also collects brand hints: DESIGN.md tokens when present, otherwise colours and fonts
// found in the page's CSS, and the theme colour.
//
// Usage:
//   node scripts/read-product.mjs https://example.com            --out film/product.json
//   node scripts/read-product.mjs ./README.md                    --out film/product.json
//   node scripts/read-product.mjs .            (a repo: README, package.json, DESIGN.md)
//   node scripts/read-product.mjs --self-test
//
// Fetching: one page plus up to three same-site stylesheets, 2 MB each, 15 s timeout, no cookies,
// no scripts run. Only fetch pages the user owns or asked you to read.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_BYTES = 2 * 1024 * 1024;
const UA = "popnow-launch-film/1.0 (+https://popnow.ai)";

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', mdash: "-", ndash: "-", hellip: "..." };
function decode(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
function clean(text) {
  return decode(String(text).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function uniq(list, max = Infinity) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = String(item).toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

// Install and run commands worth ending a launch film on.
const COMMAND = /^\s*(?:\$\s*)?((?:npx|npm (?:i|install)|pnpm (?:add|dlx)|yarn (?:add|dlx)|bunx|bun add|pip3? install|pipx install|uv (?:add|tool install)|brew install|cargo install|go install|gem install|docker run|gh extension install)\b[^\n]{0,120})/i;
// A sentence with a number in it is a candidate for proof; the film may only use it if it is a fact.
const NUMBERED = /(\d[\d,.]*\s?(%|x|×|k|m|ms|s|seconds?|minutes?|hours?|days?|users?|teams?|languages?|models?|skills?|templates?|stars?|downloads?|countries|integrations?|credits?)\b)/i;

// ---------------------------------------------------------------------------
// Colours and fonts
// ---------------------------------------------------------------------------

function normHex(hex) {
  let h = hex.toLowerCase().replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
  return `#${h.slice(0, 6)}`;
}
function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(Number(v)))).toString(16).padStart(2, "0")).join("")}`;
}
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function saturation(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function cssHints(css) {
  const counts = new Map();
  const named = [];
  const add = (hex, name) => {
    const h = normHex(hex);
    counts.set(h, (counts.get(h) || 0) + 1);
    if (name) named.push({ name, hex: h });
  };
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{3,8})\b/gi)) add(m[2], m[1]);
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/gi)) add(rgbToHex(m[2], m[3], m[4]), m[1]);
  for (const m of css.matchAll(/(?<![\w-])#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) add(`#${m[1]}`);
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/gi)) add(rgbToHex(m[1], m[2], m[3]));
  const fonts = [];
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
    const first = m[1].split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (first && !/^var\(/.test(first) && !/^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|-apple-system)$/i.test(first)) fonts.push(first);
  }
  return { counts, named, fonts };
}

function rankColors(counts, named) {
  const byHex = new Map(named.map((n) => [n.hex, n.name]));
  return [...counts.entries()]
    .map(([hex, count]) => ({ hex, count, ...(byHex.has(hex) && { name: byHex.get(hex) }), role: luminance(hex) > 0.75 ? "light" : luminance(hex) < 0.08 ? "dark" : saturation(hex) > 0.45 ? "accent" : "neutral" }))
    .sort((a, b) => (b.name ? 1 : 0) - (a.name ? 1 : 0) || b.count - a.count)
    .slice(0, 12);
}

// DESIGN.md: colours written as hex next to a name, fonts in a "font"/"type" line, voice notes.
function designTokens(md) {
  const colors = [];
  for (const line of md.split("\n")) {
    for (const m of line.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
      const label = clean(line.replace(/`/g, "").replace(/#[0-9a-f]{3,6}\b/gi, " ").replace(/^[\s|*-]+/, "")).split(/[|:]/).map((s) => s.trim()).filter(Boolean)[0] || "";
      colors.push({ hex: normHex(`#${m[1]}`), name: label.slice(0, 40) });
    }
  }
  const fonts = [];
  for (const m of md.matchAll(/^.*\b(font|typeface|type|heading|display|body)\b.*$/gim)) {
    for (const f of m[0].matchAll(/["`*]([A-Z][\w ]{2,30}?)["`*]/g)) fonts.push(f[1].trim());
  }
  const voice = (md.match(/^#{1,3}\s*(voice|tone)[^\n]*\n([\s\S]*?)(?=\n#{1,3}\s|$)/im) || [])[2];
  return { colors: uniq(colors.map((c) => JSON.stringify(c))).map((s) => JSON.parse(s)).slice(0, 16), fonts: uniq(fonts, 6), voice: voice ? clean(voice).slice(0, 400) : null };
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

function readMarkdown(md, ref) {
  const lines = md.split(/\r?\n/);
  const out = { name: null, tagline: null, headings: [], features: [], install: [], numbers: [], facts: [], links: {} };
  let inFence = false;
  let fenceLang = "";
  let paragraph = [];
  const flushParagraph = (lineNo) => {
    const text = clean(paragraph.join(" ").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""));
    paragraph = [];
    if (!text || text.length < 12) return;
    if (!out.tagline && text.length >= 30) out.tagline = text.slice(0, 220);
    addFact(out, text, `${ref}:${lineNo}`);
  };
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      fenceLang = inFence ? line.replace(/^\s*```/, "").trim() : "";
      return;
    }
    if (inFence) {
      const cmd = line.match(COMMAND);
      if (cmd && /^(bash|sh|shell|zsh|console|)$/i.test(fenceLang)) out.install.push(cmd[1].trim());
      return;
    }
    // READMEs often centre their title with inline HTML: <h1 align="center">Name</h1>
    const htmlH = line.match(/<h([1-4])\b[^>]*>(.*?)<\/h\1>/i);
    const h = line.match(/^(#{1,4})\s+(.+)$/) || (htmlH && [null, "#".repeat(Number(htmlH[1])), htmlH[2]]);
    if (h) {
      flushParagraph(lineNo);
      const text = clean(h[2].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""));
      if (h[1].length === 1 && !out.name) out.name = text;
      else out.headings.push(text);
      return;
    }
    const li = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.+)$/);
    if (li) {
      flushParagraph(lineNo);
      const text = clean(li[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, ""));
      if (text.length >= 6 && text.length <= 200) {
        out.features.push(text);
        addFact(out, text, `${ref}:${lineNo}`);
      }
      return;
    }
    for (const m of line.matchAll(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g)) linkRole(out.links, m[1], m[2]);
    if (!line.trim()) flushParagraph(lineNo);
    else if (/^\s*</.test(line)) {
      // Inline HTML: keep real sentences, drop badges, pictures and wrappers.
      const text = clean(line);
      if (text.length >= 20) paragraph.push(text);
    } else if (!/^\s*(!\[|\[!\[)/.test(line)) paragraph.push(line);
  });
  flushParagraph(lines.length);
  return out;
}

function addFact(out, text, source) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter((s) => s.length >= 8 && s.length <= 240);
  for (const s of sentences) {
    if (out.facts.some((f) => f.text === s)) continue;
    out.facts.push({ id: `f${out.facts.length + 1}`, text: s, source });
    if (NUMBERED.test(s)) out.numbers.push({ text: s, source });
  }
}

function linkRole(links, label, href) {
  const l = `${label} ${href}`.toLowerCase();
  if (!links.repo && /github\.com|gitlab\.com|codeberg\.org/.test(href)) links.repo = href;
  else if (!links.docs && /\bdocs?\b|documentation|guide/.test(l)) links.docs = href;
  else if (!links.pricing && /pricing|plans/.test(l)) links.pricing = href;
  else if (!links.changelog && /changelog|release/.test(l)) links.changelog = href;
}

function readHtml(html, url) {
  const meta = (name) => {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] || "").trim() || null : null;
  };
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const out = { name: null, tagline: null, headings: [], features: [], install: [], numbers: [], facts: [], links: {} };
  out.name = meta("og:site_name") || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").split(/\s[|\-–—]\s/)[0] || null;
  out.tagline = meta("og:description") || meta("description");
  if (out.tagline) addFact(out, out.tagline, `${url} meta description`);
  let n = 0;
  for (const m of body.matchAll(/<(h[1-3]|li|p|pre|code)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    n += 1;
    const tag = m[1].toLowerCase();
    const text = clean(m[2]);
    if (!text) continue;
    if (tag === "pre" || tag === "code") {
      for (const line of decode(m[2].replace(/<[^>]+>/g, "")).split("\n")) {
        const cmd = line.match(COMMAND);
        if (cmd) out.install.push(cmd[1].trim());
      }
      continue;
    }
    if (tag === "h1" && !out.headingH1) out.headingH1 = text;
    if (tag.startsWith("h")) out.headings.push(text);
    if (tag === "li" && text.length >= 6 && text.length <= 200) out.features.push(text);
    if (tag !== "h1" && text.length >= 12) addFact(out, text, `${url} <${tag}> #${n}`);
  }
  for (const m of body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try { linkRole(out.links, clean(m[2]), new URL(m[1], url).href); } catch { /* ignore bad links */ }
  }
  const images = { og: meta("og:image"), icon: null };
  const icon = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1];
  if (icon) { try { images.icon = new URL(icon, url).href; } catch { /* ignore */ } }
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n")
    + "\n" + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(";\n");
  const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1]).filter(Boolean);
  return { out, images, themeColor: meta("theme-color"), styles, sheets };
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,text/css,text/markdown,*/*;q=0.5" }, redirect: "follow", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { ctrl.abort(); break; }
      chunks.push(value);
    }
    return { text: Buffer.concat(chunks).toString("utf8"), finalUrl: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

function finish(result) {
  result.headings = uniq(result.headings, 24);
  result.features = uniq(result.features, 16);
  result.install = uniq(result.install, 6);
  result.numbers = result.numbers.slice(0, 16);
  result.facts = result.facts.slice(0, 80);
  delete result.headingH1;
  return result;
}

export async function readProduct(input, { fetchImpl } = {}) {
  const now = new Date().toISOString();
  if (/^https?:\/\//i.test(input)) {
    const get = fetchImpl || fetchText;
    const { text, finalUrl } = await get(input);
    const isMarkdown = /\.(md|markdown|txt)(\?|$)/i.test(finalUrl);
    if (isMarkdown) {
      const out = readMarkdown(text, basename(new URL(finalUrl).pathname));
      return finish({ source: { kind: "readme", ref: finalUrl, readAt: now }, ...out, images: {}, brand: { from: "none", colors: [], fonts: [] } });
    }
    const { out, images, themeColor, styles, sheets } = readHtml(text, finalUrl);
    let css = styles;
    const origin = new URL(finalUrl).origin;
    for (const href of sheets.slice(0, 3)) {
      try {
        const abs = new URL(href, finalUrl);
        if (abs.origin !== origin) continue;
        css += "\n" + (await get(abs.href)).text;
      } catch { /* a stylesheet we cannot read only means fewer brand hints */ }
    }
    const hints = cssHints(css);
    return finish({
      source: { kind: "url", ref: finalUrl, readAt: now },
      ...out,
      images,
      brand: { from: hints.counts.size ? "css" : "none", themeColor: themeColor || null, colors: rankColors(hints.counts, hints.named), fonts: uniq(hints.fonts, 6) },
    });
  }
  const full = resolve(input);
  if (!existsSync(full)) throw new Error(`not found: ${input}`);
  const isDir = statSync(full).isDirectory();
  const dir = isDir ? full : dirname(full);
  const readmePath = isDir ? ["README.md", "readme.md", "README.markdown", "README.txt", "README"].map((f) => join(full, f)).find(existsSync) : full;
  if (!readmePath) throw new Error(`no README in ${input}`);
  const md = readFileSync(readmePath, "utf8");
  const out = readMarkdown(md, basename(readmePath));
  const result = { source: { kind: isDir ? "repo" : "readme", ref: input, readAt: now }, ...out, images: {}, brand: { from: "none", colors: [], fonts: [] } };
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      result.package = { name: pkg.name, version: pkg.version, description: pkg.description, homepage: pkg.homepage, license: pkg.license, bin: pkg.bin ? Object.keys(typeof pkg.bin === "string" ? { [pkg.name]: 1 } : pkg.bin) : [] };
      if (pkg.description) addFact(result, pkg.description, "package.json description");
      if (!result.install.length && pkg.name && !pkg.private) result.install.push(pkg.bin ? `npx ${pkg.name}` : `npm install ${pkg.name}`);
      if (pkg.homepage) result.links.homepage = pkg.homepage;
    } catch { /* not fatal */ }
  }
  const designPath = ["DESIGN.md", "design.md", "docs/DESIGN.md"].map((f) => join(dir, f)).find(existsSync);
  if (designPath) {
    const t = designTokens(readFileSync(designPath, "utf8"));
    result.brand = { from: "DESIGN.md", path: designPath, colors: t.colors, fonts: t.fonts, voice: t.voice };
  }
  return finish(result);
}

function summary(p) {
  const lines = [
    `Product:   ${p.name || "(no name found: ask the user)"}`,
    `Tagline:   ${p.tagline || "(none found)"}`,
    `Facts:     ${p.facts.length} (claims the film may make; cite them by id in beats.json)`,
    `Numbers:   ${p.numbers.length ? p.numbers.map((n) => `"${n.text.slice(0, 60)}"`).slice(0, 3).join("; ") : "none found: the proof beat uses no figures unless the user gives one"}`,
    `Install:   ${p.install[0] || "(none found)"}`,
    `Brand:     ${p.brand.from}${p.brand.colors?.length ? ` · ${p.brand.colors.slice(0, 5).map((c) => c.hex).join(" ")}` : ""}${p.brand.fonts?.length ? ` · ${p.brand.fonts.join(", ")}` : ""}`,
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Self-test (fixtures only, no network)
// ---------------------------------------------------------------------------

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  const root = mkdtempSync(join(tmpdir(), "read-product-test-"));
  try {
    writeFileSync(join(root, "README.md"), [
      "# Memoleaf", "", "[![build](https://img.example/badge.svg)](https://ci.example)", "",
      "Memoleaf turns voice memos into tidy meeting notes. It runs offline on your laptop.", "",
      "## Features", "", "- Transcribes 9 languages on device", "- Exports to Markdown and PDF", "- Shares a read-only link in one click", "",
      "## Install", "", "```bash", "npm install -g memoleaf", "memoleaf init", "```", "",
      "[Documentation](https://memoleaf.example/docs) · [Pricing](https://memoleaf.example/pricing) · [Source](https://github.com/example/memoleaf)",
    ].join("\n"));
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "memoleaf", version: "1.4.0", description: "Voice memos to meeting notes.", bin: { memoleaf: "cli.js" } }));
    writeFileSync(join(root, "DESIGN.md"), "# Design\n\n## Colour\n| Role | Value |\n| --- | --- |\n| Ink | `#1F2A24` |\n| Paper | #F4EFE6 |\n| Signal | #D9480F |\n\n## Type\nHeadings use \"Fraunces\", body uses \"Work Sans\".\n\n## Voice\nPlain, warm, never shouty.\n");

    await check("repo: name, tagline, features, install, links and facts with sources", async () => {
      const p = await readProduct(root);
      assert.equal(p.name, "Memoleaf");
      assert.match(p.tagline, /voice memos into tidy meeting notes/);
      assert.ok(p.features.includes("Transcribes 9 languages on device"));
      assert.deepEqual(p.install.slice(0, 2), ["npm install -g memoleaf", "memoleaf init"].filter((c) => COMMAND.test(c)));
      assert.equal(p.links.docs, "https://memoleaf.example/docs");
      assert.equal(p.links.repo, "https://github.com/example/memoleaf");
      const fact = p.facts.find((f) => /9 languages/.test(f.text));
      assert.ok(fact && /README\.md:\d+/.test(fact.source), "facts carry file:line");
      assert.ok(p.numbers.some((n) => /9 languages/.test(n.text)));
    });

    await check("repo: DESIGN.md tokens win over guessing", async () => {
      const p = await readProduct(root);
      assert.equal(p.brand.from, "DESIGN.md");
      assert.deepEqual(p.brand.colors.map((c) => c.hex), ["#1f2a24", "#f4efe6", "#d9480f"]);
      assert.equal(p.brand.colors[0].name, "Ink");
      assert.deepEqual(p.brand.fonts, ["Fraunces", "Work Sans"]);
      assert.match(p.brand.voice, /never shouty/);
    });

    await check("url: html facts, install command, theme colour and css colours", async () => {
      const pages = {
        "https://memoleaf.example/": `<!doctype html><html><head><title>Memoleaf - meeting notes</title>
          <meta name="description" content="Voice memos become meeting notes, offline.">
          <meta name="theme-color" content="#1F2A24"><link rel="stylesheet" href="/site.css">
          <link rel="stylesheet" href="https://cdn.other.example/x.css">
          <style>:root{--paper:#F4EFE6;--signal:rgb(217,72,15)} body{font-family:"Work Sans",sans-serif}</style></head>
          <body><h1>Notes that write themselves</h1><p>Memoleaf listens once and gives you notes your team can use.</p>
          <ul><li>Works offline on your laptop</li><li>Exports to Markdown &amp; PDF</li></ul>
          <pre><code>$ npx memoleaf init</code></pre><a href="/docs">Docs</a><script>var x = "#ff00ff";</script></body></html>`,
        "https://memoleaf.example/site.css": "h1{color:#1f2a24;font-family:Fraunces,serif} .btn{background:#D9480F} .btn:hover{background:#d9480f}",
      };
      const fetched = [];
      const fake = async (u) => { fetched.push(u); if (!(u in pages)) throw new Error("blocked"); return { text: pages[u], finalUrl: u }; };
      const p = await readProduct("https://memoleaf.example/", { fetchImpl: fake });
      assert.equal(p.name, "Memoleaf");
      assert.ok(p.install.includes("npx memoleaf init"));
      assert.ok(p.features.includes("Exports to Markdown & PDF"));
      assert.equal(p.brand.themeColor, "#1F2A24");
      const hexes = p.brand.colors.map((c) => c.hex);
      for (const h of ["#f4efe6", "#d9480f", "#1f2a24"]) assert.ok(hexes.includes(h), `colour ${h}`);
      assert.ok(!hexes.includes("#ff00ff"), "script contents are ignored");
      assert.ok(!fetched.some((u) => u.includes("cdn.other.example")), "only same-site stylesheets are fetched");
      assert.ok(p.brand.fonts.includes("Work Sans") && p.brand.fonts.includes("Fraunces"));
      assert.equal(p.links.docs, "https://memoleaf.example/docs");
    });

    await check("writes product.json", async () => {
      const outPath = join(root, "film", "product.json");
      const code = await main([root, "--out", outPath, "--quiet"]);
      assert.equal(code, 0);
      assert.equal(JSON.parse(readFileSync(outPath, "utf8")).name, "Memoleaf");
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : `\nAll ${results.length} self-tests passed (fixtures only, no network).`);
  return failed ? 1 : 0;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const input = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--out");
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : "film/product.json";
  if (!input || argv.includes("--help")) {
    console.log("Usage: node scripts/read-product.mjs <url | README.md | repo dir> [--out film/product.json]\n       node scripts/read-product.mjs --self-test");
    return input ? 0 : 2;
  }
  try {
    const product = await readProduct(input);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), JSON.stringify(product, null, 2) + "\n");
    if (!argv.includes("--quiet")) {
      console.log(summary(product));
      console.log(`\nWrote ${out}. Read it, correct anything the page got wrong, and ask the user for what is missing.`);
    }
    return 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
