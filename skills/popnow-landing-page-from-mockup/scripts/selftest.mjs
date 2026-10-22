#!/usr/bin/env node
// Self-test for this skill's scripts. No network, no paid calls, no API key.
//   node scripts/selftest.mjs            all tests (browser tests skip if no Chrome/Playwright)
//   node scripts/selftest.mjs --no-browser
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findChrome } from "./lib/browser.mjs";
import { parseDesignMd, readDesignMd, contrast } from "./lib/design-md.mjs";
import { buildPrompts, axisDistance, DIRECTIONS, MOCKUP_MODEL } from "./mockup-prompts.mjs";
import { lintProject, lintFile } from "./ai-tells.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = join(HERE, "fixtures");
let passed = 0, failed = 0, skipped = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${e.message.split("\n").join("\n      ")}`);
  }
}
const skip = (name, why) => { skipped++; console.log(`skip  ${name} (${why})`); };

const brief = JSON.parse(readFileSync(join(FX, "brief.json"), "utf8"));
const design = readDesignMd(join(FX, "DESIGN.md"));

await test("DESIGN.md front matter: roles, fonts, references, don'ts", () => {
  assert.equal(design.found, true);
  assert.equal(design.roles.bg, "#F7F5F0");
  assert.equal(design.roles.ink, "#22261F");
  assert.equal(design.roles.accent, "#3F6B4F");
  assert.equal(design.fonts.display, "Figtree");
  assert.ok(design.donts.some((d) => /piggy/.test(d)));
  assert.ok(design.dos.some((d) => /receipts/.test(d)));
});

await test("DESIGN.md loose prose fallback", () => {
  const d = parseDesignMd("# Brand\n\n- Background: #101010\n- Text: #F5F5F5\n- Accent: #FF5A1F\n\nDisplay: Fraunces\nBody: Literata\n");
  assert.equal(d.roles.bg.toUpperCase(), "#101010");
  assert.equal(d.roles.accent.toUpperCase(), "#FF5A1F");
  assert.equal(d.fonts.display, "Fraunces");
  assert.equal(d.fonts.text, "Literata");
  assert.ok(contrast("#000", "#fff") > 20);
});

await test("directions library is complete and unique", () => {
  const ids = new Set();
  for (const d of DIRECTIONS) {
    assert.ok(!ids.has(d.id), `duplicate ${d.id}`);
    ids.add(d.id);
    for (const k of ["name", "axes", "kinds", "fits", "palette", "paletteWords", "type", "layout", "imagery", "heroVisual", "featureLayout", "proofLayout", "pricingLayout", "avoid"]) assert.ok(d[k], `${d.id} lacks ${k}`);
    assert.ok(d.proofLayout.quotes && d.proofLayout.facts, `${d.id} proofLayout needs quotes and facts`);
    assert.ok(contrast(d.palette.ink, d.palette.bg) >= 7, `${d.id} ink/bg contrast too low`);
  }
  assert.ok(DIRECTIONS.length >= 8);
});

await test("prompt builder: three distinct directions with every quoted string", () => {
  const r = buildPrompts(brief, { count: 3 });
  assert.equal(r.mockups.length, 3);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(axisDistance(DIRECTIONS.find((d) => d.id === r.mockups[i].direction), DIRECTIONS.find((d) => d.id === r.mockups[j].direction)) >= 2);
  for (const m of r.mockups) {
    assert.equal(m.model, MOCKUP_MODEL);
    assert.equal(m.aspectRatio, "1:3");
    for (const s of [brief.headline, brief.primaryCta, ...brief.features.map((f) => f.title), ...brief.pricing.map((p) => p.name)]) assert.ok(m.prompt.includes(`"${s}`), `prompt lacks "${s}"`);
    assert.match(m.prompt, /Avoid: .*purple-to-blue gradients/);
    assert.match(m.prompt, /piggy banks/);
    assert.match(m.commands.quote, /popnow\.py quote --model openai\/gpt-image-2\/text-to-image --input-file mockups\//);
    assert.match(m.commands.create, /--confirm-credits <QUOTED>/);
    assert.equal(m.input.prompt, m.prompt);
  }
  assert.ok(!r.mockups.some((m) => m.direction === "studio-product"), "a software brief should not get the physical-product direction");
});

await test("prompt builder: lite is one direction, hero + three sections", () => {
  const r = buildPrompts(brief, { lite: true });
  assert.equal(r.mockups.length, 1);
  assert.match(r.mockups[0].prompt, /header, hero and three sections/);
  const numbered = r.mockups[0].prompt.split("\n").filter((l) => /^\d+\. /.test(l));
  assert.equal(numbered.length, 5, "header, hero, features, proof, closing");
  assert.ok(!/Pricing:/.test(r.mockups[0].prompt));
});

await test("prompt builder: DESIGN.md brand colors and fonts reach the prompt", () => {
  const r = buildPrompts(brief, { count: 2, design });
  for (const m of r.mockups) {
    assert.match(m.prompt, /Brand colors are fixed: .*#3F6B4F/);
    assert.match(m.prompt, /headlines in Figtree/);
  }
  assert.equal(r.designMd.roles.accent, "#3F6B4F");
});

await test("prompt builder: forced directions are honored and validated", () => {
  const r = buildPrompts({ ...brief, directions: ["mono-document"] }, { count: 2 });
  assert.equal(r.mockups[0].direction, "mono-document");
  assert.throws(() => buildPrompts(brief, { directions: ["no-such-direction"] }), /Unknown direction/);
});

await test("ai-tells: sloppy page fails with the expected rules", () => {
  const r = lintProject([join(FX, "sloppy.html")]);
  const rules = new Set(r.findings.map((f) => f.rule));
  for (const id of ["emoji-icon", "placeholder-text", "placeholder-image", "img-alt", "heading-structure", "purple-gradient", "gradient-overuse", "blur-blobs", "default-font", "centered-everything", "card-grid-repeat", "generic-copy", "vague-cta", "unsourced-proof", "stock-names", "numbered-sections", "dash-density", "uniform-radius"]) assert.ok(rules.has(id), `missing ${id}`);
  assert.ok(r.errors > 5);
  assert.ok(r.score < 40);
});

await test("ai-tells: clean page passes", () => {
  const r = lintProject([join(FX, "clean.html")]);
  assert.equal(r.errors, 0, JSON.stringify(r.findings));
  assert.ok(r.score >= 90, `score ${r.score}`);
});

await test("ai-tells: JSX, Tailwind classes and ignore comments", () => {
  const jsx = `export default function Hero(){return (<section className="py-24 text-center bg-gradient-to-r from-indigo-500 to-purple-600"><h2 className="uppercase tracking-widest">Hi</h2><Sparkles /><p>Supercharge your team</p></section>)}`;
  const f = lintFile("Hero.tsx", jsx).map((x) => x.rule);
  for (const id of ["purple-gradient", "ai-icons", "generic-copy"]) assert.ok(f.includes(id), `missing ${id} in ${f}`);
  const ok = lintFile("Hero.tsx", `/* ai-tells-ignore purple-gradient ai-icons */\n` + jsx).map((x) => x.rule);
  assert.ok(!ok.includes("purple-gradient") && !ok.includes("ai-icons"));
});

const hasBrowser = !process.argv.includes("--no-browser") && (findChrome() || (() => { try { return !!import.meta.resolve("playwright"); } catch { return false; } })());
if (!hasBrowser) {
  skip("browser: shoot, review, palette, crop, resize", process.argv.includes("--no-browser") ? "--no-browser" : "no Chrome found; set CHROME_PATH or install Chrome");
} else {
  const { shoot, compare } = await import("./shoot-diff.mjs");
  const { openBrowser } = await import("./lib/browser.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "lpm-selftest-"));
  const browser = await openBrowser();
  try {
    let mockup;
    await test("browser: render a stand-in mockup", async () => {
      const r = await shoot(join(FX, "mockup-standin.html"), { out: join(tmp, "m"), widths: [1440], browser });
      mockup = r[0].file;
      assert.ok(statSync(mockup).size > 5000);
      const png = readFileSync(mockup);
      assert.equal(png.readUInt32BE(16), 1440);
    });
    await test("browser: shoot clean page at desktop and mobile without QA issues", async () => {
      const r = await shoot(join(FX, "clean.html"), { out: join(tmp, "r"), widths: [1440, 390], browser });
      assert.equal(r.length, 2);
      for (const q of r) {
        assert.equal(q.overflowX, false, `overflow at ${q.width}: ${q.overflowers}`);
        assert.equal(q.brokenImages.length, 0);
        assert.equal(q.lowContrastCount, 0, q.lowContrast.join("; "));
        assert.equal(q.h1Count, 1);
      }
      assert.ok(existsSync(join(tmp, "r", "qa.json")));
    });
    await test("browser: QA catches overflow, broken image, low contrast, small target", async () => {
      const [q] = await shoot(join(FX, "overflow.html"), { out: join(tmp, "o"), widths: [390], browser });
      assert.equal(q.overflowX, true);
      assert.equal(q.brokenImages.length, 1);
      assert.ok(q.lowContrastCount >= 1);
      assert.ok(q.smallTargetCount >= 1);
    });
    await test("browser: compare reports the hero difference and draws the side-by-side", async () => {
      const r = await compare(mockup, join(tmp, "r", "shot-1440.png"), { out: join(tmp, "r"), browser });
      assert.ok(r.mockupSections.length >= 3 && r.buildSections.length >= 3);
      assert.ok(r.deltas.some((d) => d.kind === "first-screen" && d.severity === 3), JSON.stringify(r.deltas.slice(0, 3)));
      assert.ok(statSync(r.image).size > 10000);
      const same = await compare(mockup, mockup, { out: join(tmp, "s"), label: "same", browser });
      assert.equal(same.deltas.filter((d) => d.severity >= 2).length, 0, JSON.stringify(same.deltas));
    });
    await test("browser: palette, crop and resize", async () => {
      const { pagePalette, pageCrop, pageResize, suggestRoles } = await import("./image-tools.mjs");
      const { dataUrl } = await import("./shoot-diff.mjs");
      const page = await browser.newPage();
      await page.goto("about:blank");
      const colors = await page.evaluate(pagePalette, dataUrl(mockup), 8);
      const roles = suggestRoles(colors);
      assert.equal(roles.bg, "#F7F5F0");
      assert.ok(roles.accent, "accent found");
      const crop = await page.evaluate(pageCrop, dataUrl(mockup), [0, 0, 50, 10], false, 400);
      assert.equal(crop.width, 400);
      const sizes = await page.evaluate(pageResize, dataUrl(mockup), [320, 720, 4000], "image/webp", 0.8);
      assert.deepEqual(sizes.out.map((o) => o.width), [320, 720]);
      assert.ok(sizes.out[0].data.startsWith("data:image/webp"));
      await page.close();
    });
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
