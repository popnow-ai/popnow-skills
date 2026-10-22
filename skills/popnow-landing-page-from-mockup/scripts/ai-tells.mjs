#!/usr/bin/env node
// Lints a landing page for the habits that make it read as machine-made.
//
//   node scripts/ai-tells.mjs <file-or-dir> [more...] [--json] [--min-score 80] [--design DESIGN.md] [--rules]
//
// Scans .html .htm .css .scss .jsx .tsx .js .ts .vue .svelte .astro .mdx (skips node_modules, dist, build, .next).
// Static and dependency-free: it reads markup, CSS, Tailwind classes and visible copy.
// Exit code 1 when any error is found or the score falls below --min-score.
//
// A deliberate exception can be kept with a comment naming the rule anywhere in the file:
//   <!-- ai-tells-ignore default-font -->   /* ai-tells-ignore gradient-overuse */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDesignMd, readDesignMd } from "./lib/design-md.mjs";

const EXT = new Set([".html", ".htm", ".css", ".scss", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte", ".astro", ".mdx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", ".nuxt", ".svelte-kit", ".output", ".git", "coverage", "vendor"]);

export const RULES = {
  "emoji-icon": { severity: "error", title: "Emoji used as icons or decoration", fix: "Replace with SVG icons drawn in the page's stroke weight, or remove. Emoji render differently on every OS and read as filler." },
  "placeholder-text": { severity: "error", title: "Placeholder or template text left in", fix: "Write the real copy from the brief. If a fact is unknown, ask the user or leave the block out." },
  "placeholder-image": { severity: "error", title: "Placeholder image service", fix: "Use the generated or user-supplied image, or a labelled local placeholder that the delivery note lists." },
  "img-alt": { severity: "error", title: "Image without alt attribute", fix: "Add alt text that says what the image shows, or alt=\"\" for decoration." },
  "heading-structure": { severity: "error", title: "Heading outline is broken", fix: "One h1 per page; do not skip levels (h2 then h4)." },
  "purple-gradient": { severity: "error", title: "Violet/indigo gradient", fix: "Use the direction's palette. If a gradient is truly needed, keep it within one hue family and make it subtle." },
  "gradient-overuse": { severity: "warn", title: "Many gradients", fix: "Keep flat fields; allow at most one or two purposeful gradients (a photo scrim, a fade at a scroll edge)." },
  "gradient-text": { severity: "warn", title: "Gradient-filled text repeated", fix: "Set headlines in one solid color; use weight, size or an italic word for emphasis." },
  "blur-blobs": { severity: "warn", title: "Blurred blobs or glow orbs", fix: "Delete decorative blur shapes. Let the real image, product UI or typography carry the hero." },
  "glass-panels": { severity: "warn", title: "Frosted glass used repeatedly", fix: "Use solid surfaces with a hairline border; reserve backdrop blur for one sticky header at most." },
  "default-font": { severity: "warn", title: "Only default fonts", fix: "Pick a display face with character from the chosen direction and load it; keep a system stack only as fallback." },
  "default-palette": { severity: "warn", title: "Framework default indigo/violet colors", fix: "Replace default palette classes with tokens taken from the mockup (image-tools.mjs palette)." },
  "centered-everything": { severity: "warn", title: "Almost every block is centered", fix: "Left-align body sections and keep centering for one or two moments (hero or closing call to action)." },
  "card-grid-repeat": { severity: "warn", title: "Three-up card grid repeated", fix: "Vary section structure: one wide plus two narrow, a list, a split, a table." },
  "uniform-radius": { severity: "warn", title: "Same corner radius on everything", fix: "Use a radius scale with intent: sharp for data, softer for media, pills only for tags." },
  "uniform-shadow": { severity: "warn", title: "Same soft shadow on everything", fix: "Most surfaces need a hairline or nothing; keep elevation for things that float (menus, dialogs)." },
  "uniform-rhythm": { severity: "warn", title: "Every section has the same vertical padding", fix: "Vary spacing: tight bands for proof strips, generous space before key moments." },
  "eyebrow-everywhere": { severity: "warn", title: "Small uppercase label above every heading", fix: "Keep a kicker only where it adds information; let most headings stand alone." },
  "numbered-sections": { severity: "warn", title: "01 / 02 / 03 numbering", fix: "Number only real sequences (steps). Use plain section titles otherwise." },
  "generic-copy": { severity: "warn", title: "Generic marketing phrases", fix: "Say what the product does and for whom, with a concrete detail or number from the brief." },
  "vague-cta": { severity: "warn", title: "Vague call to action", fix: "Use verb + object: \"Download for Mac\", \"Start a household\", \"See pricing\"." },
  "unsourced-proof": { severity: "warn", title: "Proof that needs a source", fix: "Keep only numbers, ratings and customer names the user confirmed; otherwise remove them." },
  "stock-names": { severity: "warn", title: "Stock placeholder names", fix: "Use real people the user provided, or remove the testimonial." },
  "dash-density": { severity: "warn", title: "Heavy em-dash use in copy", fix: "Rewrite with periods and commas; em dashes in every line are a known tell." },
  "ai-icons": { severity: "warn", title: "Sparkle / rocket / magic-wand icons", fix: "Pick icons that depict the actual feature, or drop icons." },
  "dead-links": { severity: "warn", title: "Links that go nowhere", fix: "Point every link at a real section or page; remove the rest." },
  "page-meta": { severity: "warn", title: "Missing page basics", fix: "Add <html lang>, <title>, meta description and the viewport meta." },
};

const GENERIC_PHRASES = [
  /\bunleash(?:es|ing)?\b/i, /\brevolutioni[sz](?:e|es|ing)\b/i, /\bsupercharg(?:e|es|ing)\b/i, /\bseamless(?:ly)?\b/i, /\bcutting[- ]edge\b/i,
  /\bnext[- ]level\b/i, /\bgame[- ]chang(?:er|ing)\b/i, /\bempower(?:s|ing)?\b/i, /\belevate your\b/i, /\bin today'?s fast[- ]paced\b/i,
  /\ball[- ]in[- ]one platform\b/i, /\bharness the power\b/i, /\beffortless(?:ly)?\b/i, /\bworld[- ]class\b/i, /\bbest[- ]in[- ]class\b/i,
  /\bstate[- ]of[- ]the[- ]art\b/i, /\bunlock (?:your|the) (?:full )?potential\b/i, /\btransform the way\b/i, /\bstreamline your\b/i,
  /\bboost your productivity\b/i, /\blike never before\b/i, /\bat your fingertips\b/i, /\blook no further\b/i, /\bskyrocket\b/i,
  /\btake (?:your|it) .{1,20} to the next level\b/i, /\bbuilt for the future\b/i, /\bthe future of [a-z]+ is here\b/i, /\bsay goodbye to\b/i,
];
const VAGUE_CTA = /^(learn more|get started|get started today|click here|sign up now|start now|discover more|explore now|try it now)$/i;
const DEFAULT_FONTS = /^(inter|roboto|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|sans-serif|serif|open sans|poppins|montserrat|lato|segoe ui|ui-sans-serif)$/i;
const TAILWIND_DEFAULT_PURPLE = /\b(?:bg|text|from|via|to|border|ring|fill|stroke|shadow|decoration|outline)-(?:indigo|violet|purple|fuchsia)-(?:[1-9]00|950)\b/g;
const DEFAULT_PURPLE_HEX = /#(?:6366f1|4f46e5|4338ca|818cf8|8b5cf6|7c3aed|6d28d9|a78bfa|a855f7|9333ea|7e22ce|c084fc|d946ef)\b/gi;

// ---------- file collection and extraction ----------

function collect(target, out = []) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const name of readdirSync(target)) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      collect(join(target, name), out);
    }
  } else if (EXT.has(extname(target).toLowerCase()) && !/\.min\.(js|css)$/.test(target) && !/(?:\.test|\.spec)\.[jt]sx?$/.test(target)) {
    out.push(target);
  }
  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function extract(file, raw) {
  const ext = extname(file).toLowerCase();
  const isCss = ext === ".css" || ext === ".scss";
  const isScript = ext === ".js" || ext === ".ts";
  let css = "";
  let markup = "";
  if (isCss) css = raw;
  else {
    markup = raw;
    for (const m of raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) css += m[1] + "\n";
    for (const m of raw.matchAll(/\bstyle=(?:"([^"]*)"|'([^']*)')/gi)) css += `x{${m[1] || m[2]}}\n`;
    // CSS-in-JS template literals (styled-components, css``) are scanned as CSS too.
    for (const m of raw.matchAll(/(?:css|styled\.[a-z]+|createGlobalStyle)`([\s\S]*?)`/g)) css += m[1] + "\n";
  }
  // Visible copy: strip scripts, styles, comments and tags. JSX expressions stay as text, which is fine for phrase checks.
  let text = "";
  if (!isCss && !isScript) {
    text = markup
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&mdash;/g, "—")
      .replace(/&amp;/g, "&");
  }
  const classes = [];
  for (const m of raw.matchAll(/\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)) classes.push(...(m[1] || m[2] || m[3] || "").split(/\s+/).filter(Boolean));
  return { ext, css, markup, text, classes, isCss, isScript };
}

function ignored(raw) {
  const set = new Set();
  for (const m of raw.matchAll(/ai-tells-ignore\s+([a-z-]+(?:[ ,]+[a-z-]+)*)/g)) for (const id of m[1].split(/[ ,]+/)) set.add(id);
  return set;
}

// ---------- color helpers ----------

function hexToRgb(h) {
  let x = h.replace("#", "");
  if (x.length === 3) x = x.split("").map((c) => c + c).join("");
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
function hueSat([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
}
function isVioletish(color) {
  let rgb = null;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) rgb = hexToRgb(color);
  const m = /^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i.exec(color);
  if (m) rgb = [+m[1], +m[2], +m[3]];
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[ ,]+([\d.]+)%/i.exec(color);
  if (hsl) return +hsl[1] >= 245 && +hsl[1] <= 300 && +hsl[2] >= 35;
  if (!rgb) return /^(purple|violet|indigo|blueviolet|mediumpurple|rebeccapurple|darkviolet|fuchsia|magenta)$/i.test(color);
  const { h, s, v } = hueSat(rgb);
  return h >= 245 && h <= 300 && s >= 0.35 && v >= 0.3;
}

// ---------- the checks ----------

export function lintFile(file, raw, ctx = {}) {
  const f = [];
  const add = (rule, detail, index, src = raw) => f.push({ rule, file, line: index != null ? lineOf(src, index) : null, detail });
  const x = extract(file, raw);
  const skip = ignored(raw);
  const isPage = /<body[\s>]/i.test(raw);

  // emoji
  const emoji = /(?![©®™←-⇿✓✔✕✖✗])\p{Extended_Pictographic}/gu;
  if (!x.isCss && !x.isScript) {
    const src = raw.replace(/<script[\s\S]*?<\/script>/gi, (s) => " ".repeat(s.length)).replace(/<!--[\s\S]*?-->/g, (s) => " ".repeat(s.length));
    const hits = [...src.matchAll(emoji)];
    if (hits.length) add("emoji-icon", `${hits.length} emoji (${[...new Set(hits.map((h) => h[0]))].slice(0, 8).join(" ")})`, hits[0].index, src);
  }

  // placeholder copy and images
  const ph = [
    /lorem ipsum|dolor sit amet|consectetur adipiscing/i,
    /\byour (?:company|product|brand|tagline|headline)(?: name)? here\b/i,
    /\b(?:company|product) name\b/i,
    /\bfeature (?:one|two|three|1|2|3)\b/i,
    /\binsert [a-z ]{2,30} here\b/i,
    /\b(?:TODO|TBD|FIXME)\b/,
  ];
  const phSeen = [];
  for (const re of ph) {
    const m = re.exec(x.text);
    if (!m || phSeen.some((s) => s.toLowerCase().includes(m[0].toLowerCase()))) continue;
    phSeen.push(m[0]);
    add("placeholder-text", `"${m[0]}"`, raw.indexOf(m[0]) >= 0 ? raw.indexOf(m[0]) : null);
  }
  const imgSvc = /(?:placehold\.co|placeholder\.com|via\.placeholder|picsum\.photos|source\.unsplash\.com|dummyimage\.com|placekitten|loremflickr)/i.exec(raw);
  if (imgSvc) add("placeholder-image", imgSvc[0], imgSvc.index);

  // images and headings (markup only)
  if (!x.isCss && !x.isScript) {
    for (const m of raw.matchAll(/<img\b[^>]*>/gi)) if (!/\balt\s*=/.test(m[0])) add("img-alt", m[0].slice(0, 80), m.index);
    if (isPage) {
      const levels = [...raw.matchAll(/<h([1-6])\b/gi)].map((m) => ({ n: +m[1], i: m.index }));
      const h1 = levels.filter((l) => l.n === 1).length;
      if (h1 !== 1) add("heading-structure", `${h1} h1 elements`, levels.find((l) => l.n === 1)?.i ?? null);
      for (let i = 1; i < levels.length; i++) if (levels[i].n > levels[i - 1].n + 1) { add("heading-structure", `h${levels[i - 1].n} followed by h${levels[i].n}`, levels[i].i); break; }
      const meta = [];
      if (!/<html[^>]*\blang=/i.test(raw)) meta.push("lang");
      if (!/<title>[^<]+<\/title>/i.test(raw)) meta.push("title");
      if (!/<meta[^>]+name=["']description["']/i.test(raw)) meta.push("meta description");
      if (!/<meta[^>]+name=["']viewport["']/i.test(raw)) meta.push("viewport");
      if (meta.length) add("page-meta", `missing ${meta.join(", ")}`, 0);
    }
    const dead = [...raw.matchAll(/href=["']#["']|href=["']javascript:void\(0\)["']/gi)];
    if (dead.length) add("dead-links", `${dead.length} link(s) to "#"`, dead[0].index);
  }

  // gradients
  const grads = [...x.css.matchAll(/(?:repeating-)?(?:linear|radial|conic)-gradient\(((?:[^()]|\([^()]*\))*)\)/gi)];
  const twGrads = x.classes.filter((c) => /^(?:[a-z]+:)*bg-(?:gradient|linear|radial|conic)-/.test(c));
  const gradCount = grads.length + twGrads.length;
  if (gradCount > 3) add("gradient-overuse", `${gradCount} gradients`, grads[0] ? raw.indexOf(grads[0][0]) : null);
  const violetStops = grads.filter((g) => (g[1].match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]+\b/gi) || []).some(isVioletish));
  const twViolet = x.classes.filter((c) => /^(?:[a-z]+:)*(?:from|via|to)-(?:indigo|violet|purple|fuchsia)-\d/.test(c));
  if (violetStops.length || twViolet.length) add("purple-gradient", violetStops[0]?.[0].slice(0, 70) || twViolet.slice(0, 3).join(" "), violetStops[0] ? raw.indexOf(violetStops[0][0]) : raw.indexOf(twViolet[0]));
  const clipText = (x.css.match(/background-clip:\s*text/gi) || []).length + x.classes.filter((c) => /^(?:[a-z]+:)*bg-clip-text$/.test(c)).length;
  if (clipText > 1) add("gradient-text", `${clipText} gradient-filled text rules`, raw.search(/background-clip:\s*text|bg-clip-text/));

  // blur blobs and glass
  let blobs = 0;
  for (const m of x.css.matchAll(/filter:\s*blur\(\s*([\d.]+)(px|rem)/gi)) if (+m[1] * (m[2] === "rem" ? 16 : 1) >= 40) blobs++;
  blobs += x.classes.filter((c) => /^(?:[a-z]+:)*blur-(?:2xl|3xl|\[\d{2,}px\])$/.test(c)).length;
  blobs += (raw.match(/\b(?:class|className|id)=["'][^"']*\b(?:blob|orb|glow-?(?:ball|orb|blob))\b/gi) || []).length;
  if (blobs) add("blur-blobs", `${blobs} blurred decoration(s)`, raw.search(/blur\(|blur-(?:2xl|3xl)|blob|orb/i));
  const glass = (x.css.match(/backdrop-filter\s*:/gi) || []).length + x.classes.filter((c) => /^(?:[a-z]+:)*backdrop-blur/.test(c)).length;
  if (glass >= 3) add("glass-panels", `${glass} backdrop blurs`, raw.search(/backdrop-filter|backdrop-blur/));

  // default palette
  const twPurple = [...raw.matchAll(TAILWIND_DEFAULT_PURPLE)];
  const hexPurple = [...raw.matchAll(DEFAULT_PURPLE_HEX)];
  if (twPurple.length + hexPurple.length >= 2) add("default-palette", [...new Set([...twPurple, ...hexPurple].map((m) => m[0]))].slice(0, 5).join(" "), (twPurple[0] || hexPurple[0]).index);

  // centered
  const centerTokens = (x.css.match(/text-align:\s*center/gi) || []).length + x.classes.filter((c) => /^(?:[a-z]+:)*text-center$/.test(c)).length;
  const sections = (raw.match(/<section\b/gi) || []).length;
  const globalCenter = /(?:^|[},\s])(?:section|main|body|\.section|\.container)\s*\{[^}]*text-align:\s*center/i.exec(x.css);
  if (globalCenter) add("centered-everything", "every section inherits text-align: center", raw.indexOf(globalCenter[0].trim()));
  else if (sections >= 4 && centerTokens >= Math.ceil(sections * 0.75)) add("centered-everything", `${centerTokens} centering rules for ${sections} sections`, raw.search(/text-align:\s*center|text-center/));

  // repeated three-up grids
  let threeUp = x.classes.filter((c) => /^(?:[a-z]+:)*grid-cols-3$/.test(c)).length;
  for (const m of x.css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (/grid-template-columns:\s*repeat\(\s*3\s*,/i.test(m[2])) threeUp += m[1].split(",").length;
  if (threeUp >= 3) add("card-grid-repeat", `${threeUp} three-column grids`, raw.search(/repeat\(\s*3\s*,|grid-cols-3/));

  // uniform radius / shadow / rhythm
  const radii = [...x.css.matchAll(/border-radius:\s*([^;}\n]+)/gi)].map((m) => m[1].trim()).filter((v) => !/^(50%|9999px|999px|100%|0|inherit)$/.test(v));
  const twRadii = x.classes.map((c) => /^(?:[a-z]+:)*(rounded(?:-(?:sm|md|lg|xl|2xl|3xl))?)$/.exec(c)?.[1]).filter(Boolean);
  const allR = [...radii, ...twRadii];
  if (allR.length >= 6 && new Set(allR).size === 1) add("uniform-radius", `${allR.length} × ${allR[0]}`, raw.search(/border-radius|rounded/));
  const shadows = [...x.css.matchAll(/box-shadow:\s*([^;}\n]+)/gi)].map((m) => m[1].trim()).filter((v) => v !== "none");
  const twShadows = x.classes.filter((c) => /^(?:[a-z]+:)*shadow-(?:md|lg|xl|2xl)$/.test(c));
  if ((shadows.length >= 5 && new Set(shadows).size === 1) || twShadows.length >= 6) add("uniform-shadow", shadows.length >= 5 ? `${shadows.length} × ${shadows[0].slice(0, 40)}` : `${twShadows.length} shadow-lg/xl classes`, raw.search(/box-shadow|shadow-(?:md|lg|xl)/));
  const sectionPads = [...raw.matchAll(/<section\b[^>]*\b(?:class|className)=["']([^"']*)["']/gi)].map((m) => (m[1].match(/\b(?:md:|lg:)?py-\d+\b/g) || []).join(" ")).filter(Boolean);
  if (sectionPads.length >= 5 && new Set(sectionPads).size === 1) add("uniform-rhythm", `${sectionPads.length} sections with "${sectionPads[0]}"`, raw.search(/<section/i));
  const sectionRule = /(?:^|\})\s*section\s*\{[^}]*padding/i.test(x.css) && !/section[.#:[][^{]*\{[^}]*padding/i.test(x.css);
  if (sectionRule && sections >= 5 && !/<section[^>]*style=["'][^"']*padding/i.test(raw)) add("uniform-rhythm", "one padding rule for every <section>", raw.search(/section\s*\{/));

  // eyebrows and numbering
  const upperTracked = [...x.css.matchAll(/\{[^}]*text-transform:\s*uppercase[^}]*letter-spacing[^}]*\}|\{[^}]*letter-spacing[^}]*text-transform:\s*uppercase[^}]*\}/gi)].length;
  const twEyebrow = (raw.match(/\b(?:class|className)=["'][^"']*\buppercase\b[^"']*\btracking-(?:wide|wider|widest|\[)/g) || []).length;
  if (twEyebrow >= 5 || (upperTracked >= 1 && (raw.match(/class=["'][^"']*\b(?:eyebrow|kicker|overline|section-label|label-top)\b/g) || []).length >= 5)) add("eyebrow-everywhere", `${Math.max(twEyebrow, 5)}+ uppercase labels`, raw.search(/eyebrow|kicker|overline|tracking-wide/));
  const numbered = [...x.text.matchAll(/(?:^|\s)(0[1-9])(?:\s|\.|\/|$)/g)].map((m) => m[1]);
  if (new Set(numbered).size >= 3 && ["01", "02", "03"].every((n) => numbered.includes(n))) add("numbered-sections", "01, 02, 03 …", raw.search(/>\s*0[1-3]\b/));

  // copy
  if (!x.isCss) {
    const hits = [];
    for (const re of GENERIC_PHRASES) {
      const m = re.exec(x.text);
      if (m) hits.push(m[0]);
    }
    if (hits.length) {
      const item = { rule: "generic-copy", file, line: lineOf(raw, Math.max(0, raw.toLowerCase().indexOf(hits[0].toLowerCase()))), detail: hits.map((h) => `"${h}"`).join(", ") };
      if (hits.length >= 4) item.severity = "error";
      f.push(item);
    }
    const ctas = [...raw.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => ({ t: m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(), i: m.index })).filter((c) => VAGUE_CTA.test(c.t));
    if (ctas.length >= 2 || ctas.some((c) => /learn more|click here/i.test(c.t))) add("vague-cta", [...new Set(ctas.map((c) => `"${c.t}"`))].join(", "), ctas[0]?.i);
    const proof = [/\btrusted by (?:over )?[\d,.]+k?\+?/i, /\b\d{1,3}(?:,\d{3})+\+/, /\b\d+(?:\.\d+)?[kKmM]\+ (?:users|customers|teams|developers|companies)\b/, /\b99\.9+%/, /★★★★★|\b5[- ]star\b/i, /\b#1 (?:rated|choice|app)\b/i, /\bloved by (?:thousands|millions|teams)\b/i];
    const proofHits = proof.map((re) => re.exec(x.text)?.[0]).filter(Boolean);
    if (proofHits.length) add("unsourced-proof", proofHits.map((h) => `"${h}"`).join(", "), raw.indexOf(proofHits[0]));
    const names = /\b(?:John|Jane) Doe\b|\bAcme(?: Inc| Corp)?\b|\bGlobex\b|\bInitech\b|\bUmbrella Corp\b|\bLorem Corp\b/.exec(x.text);
    if (names) add("stock-names", `"${names[0]}"`, raw.indexOf(names[0]));
    const wordsCount = (x.text.match(/[A-Za-z]{2,}/g) || []).length;
    const dashes = (x.text.match(/—/g) || []).length;
    if (dashes >= 6 && dashes / Math.max(1, wordsCount) > 0.01) add("dash-density", `${dashes} em dashes in ${wordsCount} words`, raw.indexOf("—"));
  }
  const aiIcons = /\b(?:data-lucide|icon|name)=["'](?:sparkles?|rocket|wand(?:-magic)?(?:-sparkles)?|magic)["']|<(?:Sparkles|Rocket|Wand2?|WandSparkles|MagicWand)\b|\bfa-(?:rocket|wand-magic(?:-sparkles)?)\b|\bi-(?:lucide|ph|tabler)[-:](?:sparkles?|rocket)\b/i.exec(raw);
  if (aiIcons) add("ai-icons", aiIcons[0], aiIcons.index);

  // fonts (collected per project, judged in lintProject)
  const familyLists = [...x.css.matchAll(/font-family:\s*([^;}\n]+)/gi)].map((m) => m[1]);
  for (const m of x.css.matchAll(/\bfont:\s*[^;}\n]*?\d+(?:\.\d+)?(?:px|rem|em|%|pt)(?:\s*\/\s*[\d.]+[a-z%]*)?\s+([^;}\n]+)/gi)) familyLists.push(m[1]);
  const families = familyLists.map((l) => l.split(",")[0].trim().replace(/^["']|["']$/g, "")).filter((v) => !/^var\(|^inherit$|^initial$/.test(v));
  const twFonts = x.classes.filter((c) => /^(?:[a-z]+:)*font-(?:sans|serif|mono)$/.test(c));
  const declaredFaces = [...x.css.matchAll(/@font-face\s*\{[^}]*font-family:\s*["']?([^;"'}]+)/gi)].map((m) => m[1].trim());
  const linkedFonts = [...raw.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^&"'\s]+)/g)].map((m) => decodeURIComponent(m[1]).split(":")[0].replace(/\+/g, " "));
  const varFonts = [...x.css.matchAll(/--[\w-]*font[\w-]*:\s*([^;}\n]+)/gi)].map((m) => m[1].split(",")[0].trim().replace(/^["']|["']$/g, ""));
  const nextFonts = [...raw.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().replace(/_/g, " ")));
  const fontsourceImports = [...raw.matchAll(/@fontsource(?:-variable)?\/([a-z0-9-]+)/g)].map((m) => m[1].replace(/-/g, " "));
  ctx.fonts = (ctx.fonts || []).concat(families, varFonts, declaredFaces, linkedFonts, nextFonts, fontsourceImports);
  ctx.twFontClasses = (ctx.twFontClasses || 0) + twFonts.length;

  return f.filter((item) => !skip.has(item.rule));
}

export function lintProject(targets, { design = null } = {}) {
  const files = targets.flatMap((t) => collect(resolve(t)));
  const ctx = {};
  let findings = [];
  const ignoredAll = new Set();
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    for (const id of ignored(raw)) ignoredAll.add(id);
    findings.push(...lintFile(file, raw, ctx));
  }
  // Fonts are judged across the whole project: one interesting face anywhere is enough.
  const fonts = [...new Set((ctx.fonts || []).map((s) => s.trim()).filter(Boolean))];
  const allowed = new Set([design?.fonts?.display, design?.fonts?.text, design?.fonts?.mono].filter(Boolean).map((s) => s.toLowerCase()));
  const interesting = fonts.filter((ff) => !DEFAULT_FONTS.test(ff) || allowed.has(ff.toLowerCase()));
  if (files.length && !interesting.length && !ignoredAll.has("default-font")) {
    findings.push({ rule: "default-font", file: files[0], line: null, detail: fonts.length ? `only ${fonts.slice(0, 4).join(", ")}` : "no font-family set" });
  }
  findings = findings.map((x) => ({ ...x, severity: x.severity || RULES[x.rule].severity, title: RULES[x.rule].title, fix: RULES[x.rule].fix }));
  // Score: errors cost 12, warnings 4, at most 16 per rule so one habit cannot sink the page alone.
  const perRule = {};
  for (const x of findings) perRule[x.rule] = Math.min(16, (perRule[x.rule] || 0) + (x.severity === "error" ? 12 : 4));
  const score = Math.max(0, 100 - Object.values(perRule).reduce((a, b) => a + b, 0));
  return { files: files.length, score, errors: findings.filter((x) => x.severity === "error").length, warnings: findings.filter((x) => x.severity === "warn").length, findings };
}

// ---------- CLI ----------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--rules")) {
    for (const [id, r] of Object.entries(RULES)) console.log(`${r.severity.padEnd(5)} ${id.padEnd(20)} ${r.title}`);
    return;
  }
  const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const valueFlags = new Set(["--min-score", "--design"]);
  const targets = argv.filter((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
  if (!targets.length) {
    console.error("Usage: node scripts/ai-tells.mjs <file-or-dir> [...] [--json] [--min-score 80] [--design DESIGN.md] [--rules]");
    process.exit(2);
  }
  for (const t of targets) if (!existsSync(t)) { console.error(`Not found: ${t}`); process.exit(2); }
  const dPath = opt("--design") || findDesignMd(statSync(targets[0]).isDirectory() ? targets[0] : resolve(targets[0], ".."));
  const design = dPath ? readDesignMd(dPath) : null;
  const minScore = Number(opt("--min-score", 80));
  const r = lintProject(targets, { design });
  if (argv.includes("--json")) console.log(JSON.stringify({ ...r, minScore }, null, 2));
  else {
    const cwd = process.cwd();
    for (const x of r.findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1))) {
      console.log(`${x.severity === "error" ? "ERROR" : "warn "} ${x.rule.padEnd(20)} ${relative(cwd, x.file)}${x.line ? ":" + x.line : ""}  ${x.detail}`);
      console.log(`      fix: ${x.fix}`);
    }
    console.log(`\n${r.files} file(s), ${r.errors} error(s), ${r.warnings} warning(s). Score ${r.score}/100 (pass at ${minScore}+ with no errors).`);
  }
  process.exit(r.errors || r.score < minScore ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
