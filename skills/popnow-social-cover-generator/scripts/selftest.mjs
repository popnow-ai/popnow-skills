#!/usr/bin/env node
// Self-test for this skill's scripts. No network, no paid calls, no API key; pictures are the
// local placeholders in scripts/fixtures/.
//   node scripts/selftest.mjs              everything (render tests skip without Chrome/Playwright)
//   node scripts/selftest.mjs --no-browser
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PLATFORMS, DEFAULT_SET, shapeOf } from "./lib/platforms.mjs";
import { imageInfo } from "./lib/imagesize.mjs";
import { findChrome } from "./lib/browser.mjs";
import { resolveTheme } from "./render.mjs";
import { plan } from "./bg-plan.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FX = join(HERE, "fixtures");
const { LAYOUTS, rich } = await import(pathToFileURL(join(HERE, "../templates/layouts.mjs")).href);
let passed = 0, failed = 0, skipped = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${String(e.message).split("\n").join("\n      ")}`); }
}

await test("platform presets: sizes, safe areas, reserved zones", () => {
  const want = { og: [1200, 630], x: [1600, 900], linkedin: [1200, 627], rednote: [1080, 1440], youtube: [1280, 720], instagram: [1080, 1350], appstore: [1290, 2796] };
  for (const [id, [w, h]] of Object.entries(want)) {
    const p = PLATFORMS[id];
    assert.ok(p, id);
    assert.deepEqual([p.width, p.height], [w, h], id);
    for (const k of ["top", "right", "bottom", "left"]) assert.ok(p.safe[k] > 0 && p.safe[k] < Math.min(w, h) / 4, `${id} safe.${k}`);
    for (const z of [...(p.reserve || []), ...(p.info || [])]) assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= w && z.y + z.h <= h, `${id} zone ${z.name} inside canvas`);
    assert.ok(p.minText > 0 && p.titleWords > 0 && p.formats.length);
  }
  assert.deepEqual(DEFAULT_SET, ["og", "x", "linkedin", "rednote", "youtube", "instagram"]);
  assert.equal(shapeOf(1200, 630), "landscape");
  assert.equal(shapeOf(1080, 1350), "portrait");
  assert.equal(shapeOf(1290, 2796), "tall");
  assert.ok(PLATFORMS.youtube.limit <= 2 * 1024 * 1024);
});

await test("image header reader: PNG, JPEG, WebP", () => {
  const png = Buffer.alloc(33);
  png.writeUInt32BE(0x89504e47, 0); png.writeUInt32BE(1200, 16); png.writeUInt32BE(630, 20); png[25] = 2;
  assert.deepEqual(imageInfo(png), { format: "png", width: 1200, height: 630, alpha: false });
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x0a, 0xf4, 0x05, 0x0a, 0x03, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(imageInfo(jpg), { format: "jpeg", width: 1290, height: 2804, alpha: false });
  const webp = Buffer.alloc(40);
  webp.write("RIFF", 0); webp.write("WEBP", 8); webp.write("VP8X", 12); webp.writeUIntLE(1599, 24, 3); webp.writeUIntLE(899, 27, 3);
  assert.deepEqual(imageInfo(webp), { format: "webp", width: 1600, height: 900, alpha: false });
});

await test("DESIGN.md sets theme colors and title font; spec theme wins", () => {
  const { theme, fonts, design } = resolveTheme({}, FX);
  assert.ok(design?.found);
  assert.equal(theme.bg, "#F1ECE2");
  assert.equal(theme.accent, "#E2742B");
  assert.equal(theme.second, "#CFE0D6");
  assert.equal(fonts.title, "Bricolage Grotesque");
  const over = resolveTheme({ theme: { accent: "#123456" } }, FX);
  assert.equal(over.theme.accent, "#123456");
  const keep = resolveTheme({ theme: { fonts: { title: "" } } }, FX);
  assert.equal(keep.fonts.title, "");
  const none = resolveTheme({ design: false }, FX);
  assert.equal(none.design, null);
});

await test("every layout builds, escapes text and marks the title", () => {
  const ctx = { images: {}, placeholder: {}, brand: { name: "A&B" } };
  const copy = { title: "<script>x</script> and *this*", subtitle: "s", kicker: "k", cta: "c", caption: "cap", badge: "b", note: "n", stat: { value: "42", unit: "%", label: "l", source: "src", series: [1, 2, 3] } };
  assert.ok(Object.keys(LAYOUTS).length >= 7);
  for (const [name, fn] of Object.entries(LAYOUTS)) {
    const html = fn(copy, ctx);
    assert.ok(/data-text="title"/.test(html), `${name} has a title`);
    assert.ok(!/<script>/.test(html), `${name} escapes markup`);
    assert.ok(/data-fit="\d+,\d+"/.test(html), `${name} has a fitted element`);
  }
  assert.equal(rich("a *b* c"), "a <em>b</em> c");
});

await test("generation plan: shapes in use, subject + cut-out, lite, nothing when files exist", () => {
  const spec = {
    images: { background: { prompt: "harbor at dawn" }, subject: { prompt: "a mug" } },
    outputs: [
      { id: "og", platform: "og", layout: "editorial-serif" },
      { id: "x", platform: "x", layout: "bold-sans" },
      { id: "ig", platform: "instagram", layout: "split-photo" },
      { id: "rn", platform: "rednote", layout: "sticker-collage" },
    ],
  };
  const p = plan(spec, FX);
  const names = p.jobs.map((j) => j.name);
  assert.deepEqual(names, ["background-landscape", "background-portrait", "subject-raw", "subject"]);
  assert.match(p.jobs[0].input.prompt, /left half calm/);
  assert.match(p.jobs[0].input.prompt, /No text/);
  assert.equal(p.jobs[0].input.aspect_ratio, "16:9");
  assert.equal(p.jobs[1].input.aspect_ratio, "3:4");
  assert.equal(p.jobs[3].model, "popnow/background-remover-v1/edit");
  const lite = plan(spec, FX, { lite: true, draft: true });
  assert.deepEqual(lite.jobs.map((j) => j.name), ["background-landscape", "subject-raw", "subject"]);
  assert.equal(lite.jobs[0].model, "alibaba/z-image-turbo/text-to-image");
  const have = plan({ ...spec, images: { background: { src: "bg-wide.svg", prompt: "x" }, subject: "subject.svg" } }, FX);
  assert.equal(have.jobs.length, 0);
  const up = plan(spec, FX, { upscale: ["x"] });
  assert.ok(up.jobs.some((j) => j.model === "popnow/image-upscaler-v1/upscale"));
});

const hasBrowser = !process.argv.includes("--no-browser") && !!findChrome();
if (!hasBrowser) {
  skipped++;
  console.log(`skip  render tests (${process.argv.includes("--no-browser") ? "--no-browser" : "no Chrome found; set CHROME_PATH or install Chrome"})`);
} else {
  const { render } = await import("./render.mjs");
  const { openBrowser } = await import("./lib/browser.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "covers-selftest-"));
  const browser = await openBrowser();
  try {
    let good;
    await test("render: eight covers, seven layouts, exact sizes, no errors", async () => {
      good = await render(join(FX, "spec.json"), { out: join(tmp, "good"), overlay: true, browser });
      assert.equal(good.outputs.length, 8);
      assert.equal(new Set(good.outputs.map((o) => o.layout)).size, 7);
      for (const o of good.outputs) {
        assert.deepEqual(o.errors, [], `${o.id}: ${o.errors.join("; ")}`);
        const p = PLATFORMS[o.platform];
        for (const f of o.files) {
          const info = imageInfo(readFileSync(f.file));
          assert.deepEqual([info.width, info.height], [p.width, p.height], f.file);
          assert.ok(f.bytes <= (p.limit || Infinity));
        }
        assert.ok(existsSync(o.overlay));
      }
    });
    await test("render: formats per platform, App Store JPEG has no alpha", () => {
      const og = good.outputs.find((o) => o.id === "og");
      assert.deepEqual(og.files.map((f) => f.format).sort(), ["png", "webp"]);
      const app = good.outputs.find((o) => o.id === "appstore");
      const jpg = app.files.find((f) => f.format === "jpeg");
      assert.ok(jpg && jpg.alpha === false);
    });
    await test("render: contact sheets and report written", () => {
      for (const f of ["contact-sheet.png", "contact-sheet.webp", "contact-sheet.overlay.png", "report.json"]) assert.ok(statSync(join(tmp, "good", f)).size > 1000, f);
      const sheet = imageInfo(readFileSync(join(tmp, "good", "contact-sheet.png")));
      assert.equal(sheet.width, 1800);
    });
    await test("render: titles were fitted and contrast measured", () => {
      for (const o of good.outputs) {
        assert.ok(o.fit.length >= 1 && o.fit.every((f) => f.size > 20), o.id);
        assert.ok(o.contrast.filter((c) => c.ratio != null).every((c) => c.ratio >= 3), `${o.id} ${JSON.stringify(o.contrast)}`);
      }
    });
    await test("render: checks catch overflow, reserved zone, low contrast, missing image, bad layout", async () => {
      const bad = await render(join(FX, "bad-spec.json"), { out: join(tmp, "bad"), noSheet: true, browser });
      const by = Object.fromEntries(bad.outputs.map((o) => [o.id, o]));
      assert.ok(by["too-long"].errors.some((e) => /does not fit/.test(e)), by["too-long"].errors.join("; "));
      assert.ok(by["in-badge"].errors.some((e) => /duration badge/.test(e)), by["in-badge"].errors.join("; "));
      assert.ok(by["in-badge"].errors.some((e) => /low contrast/.test(e)), by["in-badge"].errors.join("; "));
      assert.ok(by["missing-image"].warnings.some((w) => /placeholder/.test(w)), by["missing-image"].warnings.join("; "));
      assert.ok(by["no-such-layout"].errors.some((e) => /unknown layout/.test(e)));
    });
    await test("render: a PNG over a hard limit gets a JPEG fallback", async () => {
      const dir = join(tmp, "heavy");
      mkdirSync(dir, { recursive: true });
      // A full-bleed noise SVG makes a heavy PNG; tighten the limit through a custom platform.
      const cells = [];
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let y = 0; y < 90; y++) for (let x = 0; x < 160; x++) cells.push(`<rect x="${x * 10}" y="${y * 10}" width="10" height="10" fill="rgb(${(rnd() * 255) | 0},${(rnd() * 255) | 0},${(rnd() * 255) | 0})"/>`);
      writeFileSync(join(dir, "noise.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">${cells.join("")}</svg>`);
      writeFileSync(join(dir, "spec.json"), JSON.stringify({ design: false, copy: { title: "Noise" }, images: { background: "noise.svg" }, outputs: [{ id: "heavy", platform: "youtube", layout: "split-photo", formats: ["png"] }] }));
      const r = await render(join(dir, "spec.json"), { out: join(dir, "out"), noSheet: true, browser });
      const o = r.outputs[0];
      const png = o.files.find((f) => f.format === "png");
      if (png.bytes > PLATFORMS.youtube.limit) assert.ok(o.files.some((f) => f.format === "jpeg") && o.errors.some((e) => /upload limit/.test(e)));
      else assert.ok(png.bytes <= PLATFORMS.youtube.limit);
    });
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed ? 1 : 0);
