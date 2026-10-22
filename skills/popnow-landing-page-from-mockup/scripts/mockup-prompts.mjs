#!/usr/bin/env node
// Builds PopNow mockup prompts from a landing page brief.
//
//   node scripts/mockup-prompts.mjs brief.json [--out prompts.json] [--design DESIGN.md | --no-design]
//                                   [--directions warm-editorial,swiss-grid] [--count 3] [--lite] [--md]
//
// Output: prompts.json with one entry per art direction (model, size, prompt, the exact
// quote/create commands) plus a readable summary on stdout. Nothing is sent anywhere:
// generation happens later through scripts/popnow.py after the user approves the quote.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findDesignMd, readDesignMd } from "./lib/design-md.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = JSON.parse(readFileSync(join(HERE, "../references/directions.json"), "utf8")).directions;

export const MOCKUP_MODEL = "openai/gpt-image-2/text-to-image";
export const FULL = { aspectRatio: "1:3", resolution: "4k", quality: "medium" };
// Lite keeps the same canvas (it is the cheapest legible size); fewer sections just get more room.
export const LITE = { ...FULL };

// Visual habits that make a page read as machine-made. Sent as "Avoid" in every prompt.
export const GLOBAL_AVOID = [
  "purple-to-blue gradients",
  "glowing blobs and orbs",
  "light leaks",
  "frosted glass panels",
  "emoji",
  "generic line icons inside colored circles",
  "three identical feature cards in a row",
  "every section centered",
  "floating abstract 3D shapes",
  "stock photos of people pointing at laptops",
  "lorem ipsum or gibberish headlines",
  "invented company logos or star ratings",
];

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);
const q = (s) => `"${String(s).replace(/"/g, "'").trim()}"`;
const list = (arr) => arr.map(q).join(", ");

function words(brief) {
  return [brief.category, brief.audience, brief.oneLiner, ...(brief.tone || []), ...(brief.keywords || [])]
    .filter(Boolean).join(" ").toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

export function axisDistance(a, b) {
  return ["type", "value", "layout", "imagery"].filter((k) => a.axes[k] !== b.axes[k]).length;
}

// Pick directions: best fit first, then the best-fitting ones that differ from every
// earlier pick on at least two of the four axes (type, value, layout, imagery).
export function pickDirections(brief, count = 3, forced = []) {
  const byId = new Map(DIRECTIONS.map((d) => [d.id, d]));
  const picked = [];
  for (const id of forced) {
    if (!byId.has(id)) throw new Error(`Unknown direction "${id}". Known: ${[...byId.keys()].join(", ")}`);
    picked.push(byId.get(id));
  }
  const w = new Set(words(brief));
  const avoidIds = new Set(brief.avoidDirections || []);
  const kind = brief.kind || "software";
  const scored = DIRECTIONS.filter((d) => !picked.includes(d) && !avoidIds.has(d.id) && (d.kinds || []).includes(kind))
    .map((d) => {
      const fit = d.fits.filter((f) => w.has(f)).length;
      const misfit = (d.notFor || []).join(" ").toLowerCase().split(/[^a-z0-9-]+/).filter((x) => x.length > 3 && w.has(x)).length;
      return { d, score: fit * 2 - misfit * 3 };
    })
    .sort((a, b) => b.score - a.score || a.d.id.localeCompare(b.d.id));
  for (const minDist of [2, 1, 0]) {
    for (const { d } of scored) {
      if (picked.length >= count) break;
      if (picked.includes(d)) continue;
      if (picked.every((p) => axisDistance(p, d) >= minDist)) picked.push(d);
    }
  }
  return picked.slice(0, count);
}

function brandBlock(design) {
  if (!design?.found) return "";
  const r = design.roles || {};
  const parts = [];
  const cols = Object.entries(r).filter(([k, v]) => v && k !== "accentInk").map(([k, v]) => `${k} ${v}`);
  if (cols.length) parts.push(`Brand colors are fixed: ${cols.join(", ")}; use them instead of the palette above where they conflict`);
  const f = design.fonts || {};
  const fonts = [f.display && `headlines in ${f.display}`, f.text && `body in ${f.text}`, f.mono && `labels in ${f.mono}`].filter(Boolean);
  if (fonts.length) parts.push(`Brand typography: ${fonts.join(", ")}`);
  if (design.radius) parts.push(`Corner radius around ${design.radius}`);
  if (design.dos?.length) parts.push(`Brand rules: ${design.dos.slice(0, 4).join("; ")}`);
  return parts.length ? parts.join(". ") + "." : "";
}

function sectionsFor(brief, d, lite) {
  const name = brief.product;
  const nav = brief.nav?.length ? brief.nav : ["Features", "Pricing", "FAQ"];
  const subject = brief.heroSubject || `${name} in use`;
  const features = (brief.features || []).slice(0, lite ? 3 : 4);
  const plans = brief.pricing || [];
  const proof = brief.proof || null;
  const out = [];
  out.push(`Header bar: the wordmark ${q(name)} on the left, links ${list(nav)}, and a small button ${q(brief.primaryCta || "Get " + name)} on the right.`);
  const hero = [`Hero: the headline ${q(brief.headline)}`];
  if (brief.subhead) hero.push(`a one-sentence subhead ${q(brief.subhead)}`);
  hero.push(`a primary button ${q(brief.primaryCta || "Get " + name)}`);
  if (brief.secondaryCta) hero.push(`a quieter text link ${q(brief.secondaryCta)}`);
  out.push(`${hero.join(", ")}. Visual: ${d.heroVisual.replace("{subject}", subject)}.`);
  if (features.length) {
    out.push(`Features: ${features.length} features titled ${list(features.map((f) => f.title))}. ${cap(d.featureLayout)}. Where a feature is about the product, show its real interface, not an icon.`);
  }
  if (proof) {
    const style = d.proofLayout[proof.kind === "quotes" ? "quotes" : "facts"];
    out.push(`${lite ? "Proof strip" : "Proof"}: ${describeProof(proof)} ${cap(style)}.`);
  }
  if (plans.length && !lite) {
    out.push(`Pricing: plans ${plans.map((p) => q(`${p.name} ${p.price}`)).join(", ")}. ${cap(d.pricingLayout)}.`);
  }
  out.push(`Closing call to action: ${q(brief.closingCta || brief.headline)} with the button ${q(brief.primaryCta || "Get " + name)}.`);
  if (!lite) out.push(`Footer: small text links and the line ${q(`© ${new Date().getFullYear()} ${name}`)}.`);
  return out;
}

function describeProof(p) {
  const items = (p.items || []).slice(0, 3);
  if (p.kind === "quotes") return `${items.length} short quotes attributed to ${list(items.map((i) => i.by || "a customer"))}, quote text as short lines of small type.`;
  if (p.kind === "logos") return `a row of customer wordmarks set in plain type: ${list(items.map((i) => i.name || i))}.`;
  if (p.kind === "numbers") return `${items.length} large numbers with labels: ${items.map((i) => q(`${i.value} ${i.label}`)).join(", ")}.`;
  return `${items.length} plain product facts: ${list(items.map((i) => i.text || i))}.`;
}

export function buildPrompt(brief, d, { lite = false, design = null } = {}) {
  const size = lite ? LITE : FULL;
  const scope = lite ? "the top of a landing page: header, hero and three sections" : "a complete landing page from header to footer";
  const sections = sectionsFor(brief, d, lite);
  const avoid = [];
  for (const a of [...GLOBAL_AVOID, ...(d.avoid || []), ...(brief.mustAvoid || []), ...((design?.donts || []).slice(0, 4))]) {
    const t = a.toLowerCase().replace(/\.$/, "");
    if (!avoid.some((x) => x.toLowerCase().includes(t) || t.includes(x.toLowerCase()))) avoid.push(a.replace(/\.$/, ""));
  }
  const lines = [
    `Website design mockup: ${scope} for ${q(brief.product)}, ${brief.oneLiner}${brief.audience ? ` Made for ${brief.audience}.` : ""}`,
    `Show it as one flat, front-on capture of a desktop web page 1440 pixels wide, every section stacked top to bottom in a single tall image. No browser window, no device frame, no perspective, no hands, no watermark.`,
    `Art direction, ${d.name.toLowerCase()}: ${d.paletteWords}. Type: ${d.type}. Layout: ${d.layout}. Imagery: ${d.imagery}.`,
    brandBlock(design),
    `Sections from top to bottom; give each section a different layout and spacing from the one before it:`,
    ...sections.map((s, i) => `${i + 1}. ${s}`),
    `Text: spell every quoted string exactly as written and keep it crisp and horizontal. Show paragraph copy as short lines of small realistic text. Use a clear size hierarchy: one dominant headline, smaller section titles, small body.`,
    `Avoid: ${avoid.join(", ")}.`,
  ].filter(Boolean);
  return { prompt: lines.join("\n"), ...size, sections: sections.length };
}

export function buildPrompts(brief, { lite = false, count = 3, design = null, directions = [], popnow = "scripts/popnow.py" } = {}) {
  for (const k of ["product", "oneLiner", "headline"]) if (!brief[k]) throw new Error(`brief.${k} is required`);
  const n = lite ? 1 : Math.max(1, Math.min(3, count));
  const picks = pickDirections(brief, n, (directions.length ? directions : brief.directions || []).slice(0, n));
  const letters = "ABC";
  const mockups = picks.map((d, i) => {
    const id = letters[i];
    const p = buildPrompt(brief, d, { lite, design });
    const dir = `mockups/${id}-${d.id}`;
    const base = `python3 ${popnow} %s --model ${MOCKUP_MODEL} --input-file ${dir}.json`;
    return {
      id,
      direction: d.id,
      name: d.name,
      axes: d.axes,
      palette: d.palette,
      fontSuggestions: d.fontSuggestions,
      model: MOCKUP_MODEL,
      aspectRatio: p.aspectRatio,
      resolution: p.resolution,
      quality: p.quality,
      inputFile: `${dir}.json`,
      input: { prompt: p.prompt, aspect_ratio: p.aspectRatio, resolution: p.resolution, quality: p.quality },
      prompt: p.prompt,
      commands: {
        fields: `python3 ${popnow} model ${MOCKUP_MODEL}`,
        quote: base.replace("%s", "quote"),
        create: base.replace("%s", "create") + ` --confirm-credits <QUOTED> --download ${dir}`,
      },
      heroArt: heroArt(brief, d, dir, popnow),
    };
  });
  const distinct = [];
  for (let i = 0; i < mockups.length; i++) for (let j = i + 1; j < mockups.length; j++) distinct.push({ pair: `${mockups[i].id}-${mockups[j].id}`, axesDifferent: axisDistance(picks[i], picks[j]) });
  return {
    product: brief.product,
    lite,
    designMd: design?.found ? { path: design.path, roles: design.roles, fonts: design.fonts } : null,
    mockups,
    distinct,
    notes: [
      "Each mockups/<id>.json file is the request input (prompt, aspect_ratio, resolution, quality). Check the field names once with the fields command; edit the file if the model names them differently.",
      "Quote all mockups first, tell the user the total and their balance, and create only after a clear yes.",
      "The mockup is a picture of a page. Its body text may be garbled; real copy comes from the brief when you build.",
    ],
  };
}

function heroArt(brief, d, dir, popnow) {
  const subject = brief.heroSubject || `${brief.product} in use`;
  const prompt = `${d.heroVisual.replace("{subject}", subject)}. ${d.imagery}. Palette: ${d.paletteWords}. No text, no letters, no logos, no interface chrome, no watermark.`;
  return {
    note: "After the user picks this direction: crop the hero visual from the mockup (scripts/image-tools.mjs crop) and redraw it clean at full size.",
    fromMockup: `python3 ${popnow} quote --model google/nano-banana-2.1/edit --image ${dir}/hero-crop.png --prompt "Recreate only the picture in this crop as a clean, full-resolution image with no text, buttons or interface. Keep the palette, light and composition. ${d.imagery}." --aspect-ratio 16:9 --resolution 2k`,
    fresh: `python3 ${popnow} quote --model google/nano-banana-2.1/text-to-image --prompt "${prompt.replace(/"/g, "'")}" --aspect-ratio 16:9 --resolution 2k`,
  };
}

// ---------- CLI ----------

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i === -1 ? def : process.argv[i + 1];
}

function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("Usage: node scripts/mockup-prompts.mjs brief.json [--out prompts.json] [--design DESIGN.md | --no-design] [--directions a,b] [--count 3] [--lite] [--md]");
    console.error(`Directions: ${DIRECTIONS.map((d) => d.id).join(", ")}`);
    process.exit(2);
  }
  const briefPath = resolve(file);
  const brief = JSON.parse(readFileSync(briefPath, "utf8"));
  const lite = process.argv.includes("--lite");
  let design = null;
  if (!process.argv.includes("--no-design")) {
    const p = arg("--design") ? resolve(arg("--design")) : findDesignMd(dirname(briefPath));
    if (p) design = readDesignMd(p);
  }
  const directions = (arg("--directions", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const out = resolve(arg("--out", join(dirname(briefPath), "prompts.json")));
  // Commands run from the folder that holds prompts.json; point at this skill's popnow.py from there.
  const rel = relative(dirname(out), join(HERE, "popnow.py"));
  const popnow = rel.startsWith("../../..") ? join(HERE, "popnow.py") : rel;
  const result = buildPrompts(brief, { lite, count: Number(arg("--count", 3)), design, directions, popnow });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  for (const m of result.mockups) {
    const pf = join(dirname(out), m.inputFile);
    mkdirSync(dirname(pf), { recursive: true });
    writeFileSync(pf, JSON.stringify(m.input, null, 2) + "\n");
  }
  if (process.argv.includes("--md")) {
    for (const m of result.mockups) console.log(`## ${m.id}. ${m.name}\n\n${m.prompt}\n`);
  }
  console.log(`${result.mockups.length} mockup prompt${result.mockups.length > 1 ? "s" : ""} for ${brief.product}${lite ? " (lite)" : ""}${design?.found ? `, using ${design.path}` : ""}`);
  for (const m of result.mockups) console.log(`  ${m.id}  ${m.name.padEnd(24)} ${m.aspectRatio} ${m.resolution} ${m.quality}  -> ${m.inputFile}`);
  for (const d of result.distinct) console.log(`  ${d.pair} differ on ${d.axesDifferent}/4 axes`);
  console.log(`Wrote ${out}. Run the commands in it from ${dirname(out)}.`);
  console.log("Next: run each quote command, give the user the total, create only after they agree.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

export { DIRECTIONS, slug };
