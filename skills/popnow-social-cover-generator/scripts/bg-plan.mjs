#!/usr/bin/env node
// Plans the PopNow generations a cover spec needs: one background per canvas shape in use,
// a subject plus its cut-out, optional upscales. Writes one request file per job and prints
// the model / quote / create commands in order. It never calls the API itself.
//
//   node scripts/bg-plan.mjs spec.json [--lite] [--draft] [--upscale youtube,x] [--update-spec] [--json]
//
// --lite         one landscape background at 1k, reused (cropped) for every shape
// --draft        cheapest model for look-finding rounds (text-free drafts, lower fidelity)
// --upscale ids  add an upscale of the background used by those outputs
// --update-spec  point the spec's image entries at the download folders the plan uses

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLATFORMS, DEFAULT_SET, shapeOf, SHAPE_ASPECT } from "./lib/platforms.mjs";

const MODELS = {
  image: "google/nano-banana-2.1/text-to-image",
  draft: "alibaba/z-image-turbo/text-to-image",
  cutout: "popnow/background-remover-v1/edit",
  upscale: "popnow/image-upscaler-v1/upscale",
};
// Rough credit ranges (October 2026). The quote is the price; these only set expectations.
const ESTIMATE = {
  [`${MODELS.image}@1k`]: [22, 48],
  [`${MODELS.image}@2k`]: [35, 72],
  [MODELS.draft]: [10, 10],
  [MODELS.cutout]: [5, 5],
  [MODELS.upscale]: [12, 12],
};
const TEXT_ON_IMAGE = new Set(["bold-sans", "device-showcase"]);
const NO_TEXT = "No text, no letters, no numbers, no logos, no watermark, no border.";

function exists(p, dir) {
  return p && existsSync(resolve(dir, p));
}

export function plan(spec, dir, { lite = false, draft = false, upscale = [] } = {}) {
  const outputs = spec.outputs?.length ? spec.outputs : DEFAULT_SET.map((p) => ({ id: p, platform: p, layout: spec.defaults?.layout || "editorial-serif" }));
  const images = spec.images || {};
  const bg = typeof images.background === "string" ? { src: images.background } : images.background || null;
  const subj = typeof images.subject === "string" ? { src: images.subject } : images.subject || null;
  const jobs = [];
  const notes = [];

  // Which shapes use the background, and how.
  const bgUse = {};
  for (const o of outputs) {
    const p = PLATFORMS[o.platform] || (o.width ? { width: o.width, height: o.height } : null);
    if (!p) continue;
    const shape = shapeOf(p.width, p.height);
    const usesBg = (o.layout === "editorial-serif" && o.plate !== "subject") || (["bold-sans", "device-showcase"].includes(o.layout) && o.background !== false) || o.layout === "split-photo" || (o.layout === "minimal-mono" && o.thumb);
    if (usesBg) (bgUse[shape] ||= { text: false, ids: [] }).ids.push(o.id || o.platform);
    if (usesBg && TEXT_ON_IMAGE.has(o.layout)) bgUse[shape].text = true;
  }
  const model = draft ? MODELS.draft : MODELS.image;
  const res = lite ? "1k" : "2k";
  if (Object.keys(bgUse).length) {
    if (!bg) notes.push("Layouts in this spec use a background image but spec.images.background is not set; they will use placeholders.");
    else if (!bg.prompt) {
      for (const shape of Object.keys(bgUse)) if (!exists(bg[shape], dir) && !exists(bg.src, dir)) notes.push(`No ${shape} background file and no prompt: add images.background.prompt, or a file.`);
    } else {
      const shapes = lite ? ["landscape"] : Object.keys(bgUse);
      for (const shape of shapes) {
        if (exists(bg[shape], dir) || exists(bg.src, dir)) continue;
        const use = lite ? { text: Object.values(bgUse).some((u) => u.text), ids: Object.values(bgUse).flatMap((u) => u.ids) } : bgUse[shape];
        const hint = use.text
          ? shape === "landscape"
            ? "Keep the left half calm, dark and low in detail so large white headline text can sit on it; put the main subject in the right third."
            : "Keep the top third calm, dark and low in detail so large white headline text can sit on it; put the main subject in the lower half."
          : "Main subject centered with generous margins on every side, because the picture will be cropped to different shapes.";
        const input = { prompt: `${bg.prompt.trim().replace(/\.?$/, ".")} ${hint} ${NO_TEXT}`, aspect_ratio: SHAPE_ASPECT[shape] };
        if (!draft) input.resolution = res;
        jobs.push({ name: `background-${shape}`, model, input, dir: `assets/gen/background-${shape}`, for: use.ids, shape, estimate: ESTIMATE[draft ? model : `${model}@${res}`] });
      }
      if (lite) notes.push("Lite: the landscape background is reused for portrait and tall covers (cropped with images.background.focus).");
    }
  }

  // Subject and cut-out.
  const usesSubject = outputs.some((o) => (["bold-sans", "sticker-collage"].includes(o.layout) && o.subject !== false) || (o.layout === "editorial-serif" && o.plate === "subject"));
  if (usesSubject && subj) {
    const have = exists(subj.src, dir);
    if (!have && subj.prompt) {
      jobs.push({ name: "subject-raw", model, input: { prompt: `${subj.prompt.trim().replace(/\.?$/, ".")} Isolated on a plain light grey background, the whole subject in frame with generous margin, soft even studio light. ${NO_TEXT}`, aspect_ratio: "1:1", ...(draft ? {} : { resolution: "1k" }) }, dir: "assets/gen/subject-raw", estimate: ESTIMATE[draft ? model : `${model}@1k`] });
      jobs.push({ name: "subject", model: MODELS.cutout, image: "assets/gen/subject-raw/<downloaded file>", input: {}, dir: "assets/gen/subject", after: "subject-raw", estimate: ESTIMATE[MODELS.cutout] });
    } else if (have && subj.removeBackground) {
      jobs.push({ name: "subject", model: MODELS.cutout, image: subj.src, input: {}, dir: "assets/gen/subject", estimate: ESTIMATE[MODELS.cutout] });
    } else if (!have) {
      notes.push("A layout uses a subject cut-out but images.subject has no file and no prompt.");
    }
  }

  // Optional upscales.
  for (const id of upscale) {
    const o = outputs.find((x) => (x.id || x.platform) === id);
    if (!o) { notes.push(`--upscale ${id}: no such output`); continue; }
    const shape = shapeOf(PLATFORMS[o.platform]?.width || o.width, PLATFORMS[o.platform]?.height || o.height);
    const srcJob = jobs.find((j) => j.name === `background-${lite ? "landscape" : shape}`);
    const image = srcJob ? `${srcJob.dir}/<downloaded file>` : bg?.[shape] || bg?.src;
    if (!image) { notes.push(`--upscale ${id}: no background to upscale`); continue; }
    jobs.push({ name: `background-${shape}-upscaled`, model: MODELS.upscale, image, input: { resolution: "4k" }, dir: `assets/gen/background-${shape}-up`, after: srcJob?.name, estimate: ESTIMATE[MODELS.upscale] });
  }

  if (outputs.some((o) => o.layout === "device-showcase") && !(images.screens || []).length) notes.push("device-showcase needs your own app screenshots in images.screens; they are not generated.");
  const total = jobs.reduce((a, j) => [a[0] + j.estimate[0], a[1] + j.estimate[1]], [0, 0]);
  return { jobs, notes, estimate: total };
}

// Commands are written to run from the spec's folder; popnow.py is referenced relative to it.
function commands(job, py = "scripts/popnow.py") {
  const req = `assets/gen/requests/${job.name}.json`;
  const img = job.image ? ` --image ${job.image}` : "";
  const base = `python3 ${py} %s --model ${job.model}${img} --input-file ${req}`;
  return { request: req, fields: `python3 ${py} model ${job.model}`, quote: base.replace("%s", "quote"), create: base.replace("%s", "create") + ` --confirm-credits <QUOTED> --download ${job.dir}` };
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  const specPath = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--upscale");
  if (!specPath) {
    console.error("Usage: node scripts/bg-plan.mjs spec.json [--lite] [--draft] [--upscale youtube,x] [--update-spec] [--json]");
    process.exit(2);
  }
  const file = resolve(specPath);
  const dir = dirname(file);
  const spec = JSON.parse(readFileSync(file, "utf8"));
  const p = plan(spec, dir, { lite: argv.includes("--lite"), draft: argv.includes("--draft"), upscale: (opt("--upscale") || "").split(",").filter(Boolean) });
  const pyAbs = join(dirname(fileURLToPath(import.meta.url)), "popnow.py");
  const pyRel = relative(dir, pyAbs);
  const py = pyRel.startsWith("../../..") ? pyAbs : pyRel;
  for (const j of p.jobs) {
    j.commands = commands(j, py);
    const reqFile = join(dir, j.commands.request);
    mkdirSync(dirname(reqFile), { recursive: true });
    writeFileSync(reqFile, JSON.stringify(j.input, null, 2) + "\n");
  }
  if (argv.includes("--update-spec") && p.jobs.length) {
    const images = (spec.images ||= {});
    if (typeof images.background === "string") images.background = { src: images.background };
    if (typeof images.subject === "string") images.subject = { src: images.subject };
    for (const j of p.jobs) {
      if (j.name.startsWith("background-") && !j.name.endsWith("-upscaled")) {
        images.background[j.shape] = j.dir;
        if (argv.includes("--lite")) for (const s of ["portrait", "tall"]) images.background[s] ||= j.dir;
      }
      if (j.name === "subject") images.subject.src = j.dir;
    }
    writeFileSync(file, JSON.stringify(spec, null, 2) + "\n");
  }
  if (argv.includes("--json")) return console.log(JSON.stringify(p, null, 2));
  if (!p.jobs.length) console.log("Nothing to generate: every picture the spec uses is already on disk.");
  p.jobs.forEach((j, i) => {
    console.log(`${i + 1}. ${j.name}  ${j.model}  about ${j.estimate[0] === j.estimate[1] ? j.estimate[0] : j.estimate.join("-")} credits${j.for ? `  (for ${j.for.join(", ")})` : ""}${j.after ? `  [after ${j.after}]` : ""}`);
    console.log(`   request: ${j.commands.request}`);
    console.log(`   ${j.commands.quote}`);
    console.log(`   ${j.commands.create}`);
  });
  if (p.jobs.length) {
    console.log(`\nRun these from ${dir}.`);
    console.log(`Estimated total: about ${p.estimate[0] === p.estimate[1] ? p.estimate[0] : p.estimate.join("-")} credits. Run "${p.jobs[0].commands.fields}" (free) once, quote every job, tell the user the total and their balance, and create only after a clear yes.`);
    console.log(argv.includes("--update-spec") ? `Spec updated: image entries now point at the download folders (${relative(process.cwd(), file)}).` : "Add --update-spec to point the spec at the download folders, then re-render.");
  }
  for (const n of p.notes) console.log(`note: ${n}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
