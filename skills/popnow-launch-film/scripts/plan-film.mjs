#!/usr/bin/env node
// plan-film.mjs - check a launch-film beat sheet and turn it into a storyboard.
//
// Input:  film/beats.json (format in references/beat-sheet.md)
// Output: film/STORYBOARD.md   the table the user approves
//         film/storyboard.json frames, key-frame times, intentional holds, presets (read by qa-check.mjs)
//         film/presets.css     canvas size, safe area and minimum type size per aspect preset
//
// It refuses a beat sheet that cannot work on screen: a runtime outside 20-40 s, beats out of order,
// lines nobody can read in the time given, voiceover that over-runs its beat, or a claim (any number,
// any product moment or proof) that is not backed by a fact from product.json or the user.
//
// Usage:
//   node scripts/plan-film.mjs film/beats.json            check and write the three files
//   node scripts/plan-film.mjs film/beats.json --times    print key-frame times for `npx hyperframes snapshot --at`
//   node scripts/plan-film.mjs --self-test

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PRESETS = {
  wide: { label: "16:9", width: 1920, height: 1080, safe: { top: 72, right: 128, bottom: 72, left: 128 }, typeMin: 40, typeHead: 84, maxChars: 44, runtime: [24, 40], for: "X, LinkedIn, YouTube, your site, a keynote" },
  vertical: { label: "9:16", width: 1080, height: 1920, safe: { top: 260, right: 120, bottom: 440, left: 80 }, typeMin: 46, typeHead: 96, maxChars: 24, runtime: [20, 30], for: "Reels, Shorts, TikTok, Stories" },
  square: { label: "1:1", width: 1080, height: 1080, safe: { top: 80, right: 80, bottom: 120, left: 80 }, typeMin: 40, typeHead: 80, maxChars: 30, runtime: [20, 30], for: "LinkedIn and X feeds" },
};
const ROLES = ["hook", "problem", "moment", "proof", "cta"];
const HYPE = /\b(revolution(ary|ize|ise)?|game[- ]chang(er|ing)|unleash(es|ed)?|supercharge[ds]?|next[- ]gen(eration)?|seamless(ly)?|effortless(ly)?|magic(al)?|stunning|insane(ly)?|cutting[- ]edge|world[- ]class|best[- ]in[- ]class|10x)\b/i;
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g;

function words(text) {
  const s = String(text || "");
  const cjk = (s.match(CJK) || []).length;
  return s.replace(CJK, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length + cjk / 2.5;
}
const readSeconds = (line) => 0.5 + words(line) / 3.0; // a viewer reads about three words a second in motion
const speakSeconds = (text) => words(text) / 2.7;      // a natural read is about 2.5 to 2.7 words a second
const numbersIn = (text) => (String(text || "").match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[,.]$/, ""));

export function planFilm(beatsDoc, product, { baseDir = "." } = {}) {
  const errors = [];
  const warnings = [];
  const fps = beatsDoc.fps ?? 30;
  if (!Number.isInteger(fps) || fps < 24 || fps > 60) errors.push("fps must be a whole number from 24 to 60");
  const presets = beatsDoc.presets ?? ["wide"];
  for (const p of presets) if (!PRESETS[p]) errors.push(`unknown preset "${p}" (wide, vertical, square)`);
  const beats = beatsDoc.beats;
  if (!Array.isArray(beats) || beats.length < 4) {
    errors.push("beats needs at least four beats: hook, a product moment, proof or problem, and the call to action");
    return { errors, warnings };
  }
  const facts = new Map();
  for (const f of product?.facts ?? []) facts.set(f.id, f.text);
  for (const f of beatsDoc.userFacts ?? []) facts.set(f.id, f.text);
  const frame = 1 / fps;

  // Order and timing
  let lastRole = -1;
  const ids = new Set();
  beats.forEach((b, i) => {
    const L = `beat ${i + 1}${b.id ? ` "${b.id}"` : ""}`;
    if (!b.id || ids.has(b.id)) errors.push(`${L}: needs a unique id`);
    ids.add(b.id);
    const r = ROLES.indexOf(b.role);
    if (r < 0) errors.push(`${L}: role must be one of ${ROLES.join(", ")}`);
    else if (r < lastRole) errors.push(`${L}: ${b.role} comes after ${ROLES[lastRole]}; the order is hook, problem, moments, proof, cta`);
    lastRole = Math.max(lastRole, r);
    if (!(typeof b.start === "number" && typeof b.end === "number" && b.end > b.start)) errors.push(`${L}: start and end are seconds with end after start`);
    if (i === 0 && b.start !== 0) errors.push(`${L}: the film starts at 0 (it must autoplay on a real frame)`);
    if (i > 0 && Math.abs(b.start - beats[i - 1].end) > frame + 1e-6) errors.push(`${L}: starts at ${b.start}s but the previous beat ends at ${beats[i - 1].end}s; beats must be back to back`);
  });
  const roles = beats.map((b) => b.role);
  if (roles[0] !== "hook") errors.push("the first beat is the hook");
  if (roles.at(-1) !== "cta") errors.push("the last beat is the call to action");
  if (roles.filter((r) => r === "hook").length > 1) errors.push("one hook only");
  if (!roles.includes("moment")) errors.push("at least one product moment: the film has to show the product doing something");
  if (!roles.includes("problem")) warnings.push("no problem beat: fine for a known product, but most launches land harder when the pain is named first");
  if (!roles.includes("proof")) warnings.push("no proof beat: add one real fact (a number, a capability, a quote you have permission to use) before the CTA");
  if (beats.length > 9) warnings.push(`${beats.length} beats in one film reads as a montage; merge to 9 or fewer`);

  const duration = Math.round((beats.at(-1)?.end ?? 0) * 1000) / 1000;
  if (duration < 20 || duration > 40) errors.push(`runtime is ${duration}s; a launch film here is 20 to 40 s`);
  for (const p of presets) {
    const [lo, hi] = PRESETS[p]?.runtime ?? [20, 40];
    if (duration < lo || duration > hi) warnings.push(`${p} (${PRESETS[p].label}) usually runs ${lo}-${hi} s; consider a ${p} cut of that length`);
  }

  // Readability, voice and claims
  const narrowest = Math.min(...presets.filter((p) => PRESETS[p]).map((p) => PRESETS[p].maxChars));
  for (const b of beats) {
    const L = `"${b.id}"`;
    const len = (b.end ?? 0) - (b.start ?? 0);
    if (len < 1.0) errors.push(`${L}: ${len.toFixed(2)} s is too short to register`);
    else if (len < 1.5 && b.role !== "hook") warnings.push(`${L}: ${len.toFixed(2)} s is very short for a ${b.role}`);
    if (b.role === "hook" && len > 4.2) warnings.push(`${L}: the hook runs ${len.toFixed(1)} s; it should land in under 4 s`);
    if (b.role === "cta" && len < 2.5) errors.push(`${L}: the call to action needs at least 2.5 s so the URL or command can be read`);
    const lines = b.onScreen ?? [];
    if (!Array.isArray(lines)) { errors.push(`${L}: onScreen is a list of lines`); continue; }
    let need = 0;
    for (const line of lines) {
      const w = words(line);
      need += readSeconds(line);
      if (w > 12) errors.push(`${L}: "${line}" has ${Math.round(w)} words; on-screen lines carry 9 at most`);
      else if (w > 9) warnings.push(`${L}: "${line}" has ${Math.round(w)} words; shorter reads faster`);
      const longest = Math.max(...String(line).split("\n").map((s) => s.length));
      if (Number.isFinite(narrowest) && longest > narrowest * 2) errors.push(`${L}: "${line}" will wrap past two lines at ${presets.join("/")} sizes; split it`);
      else if (Number.isFinite(narrowest) && longest > narrowest) warnings.push(`${L}: "${line}" wraps in the narrowest preset; add a manual line break (\\n) where it should break`);
      if (HYPE.test(line)) warnings.push(`${L}: "${line}" uses hype language; say what the product does instead`);
    }
    if (b.role === "hook" && /^\s*introducing\b/i.test(lines[0] || "")) warnings.push(`${L}: open on the viewer's problem or the result, not "Introducing"`);
    if (len > 0 && need > len * 1.1) errors.push(`${L}: its ${lines.length} line(s) need about ${need.toFixed(1)} s to read but the beat is ${len.toFixed(1)} s`);
    if (b.voice) {
      const say = speakSeconds(b.voice);
      if (say > len + 0.3) errors.push(`${L}: the voiceover needs about ${say.toFixed(1)} s but the beat is ${len.toFixed(1)} s`);
      if (HYPE.test(b.voice)) warnings.push(`${L}: the voiceover uses hype language`);
    }
    // Claims: moments and proof must cite facts; every number must appear in a cited fact.
    const cited = b.facts ?? [];
    for (const id of cited) if (!facts.has(id)) errors.push(`${L}: fact "${id}" is not in product.json or userFacts`);
    if (["moment", "proof"].includes(b.role) && !cited.length) errors.push(`${L}: a ${b.role} must cite the fact(s) it shows ("facts": ["f3"])`);
    const citedText = cited.map((id) => facts.get(id) || "").join(" ");
    for (const n of [...lines.flatMap(numbersIn), ...numbersIn(b.voice)]) {
      if (!citedText.includes(n)) errors.push(`${L}: the number ${n} is not in any fact this beat cites; use a real figure or drop it`);
    }
  }

  // Intentional holds (a still frame on purpose, e.g. the end card)
  const holds = (beatsDoc.holds ?? []).map((h) => ({ start: h.start, end: h.end, why: h.why || "" }));
  for (const h of holds) {
    if (!(h.end > h.start) || h.start < 0 || h.end > duration + frame) errors.push(`hold ${h.start}-${h.end}: must sit inside the film`);
    if (!h.why) warnings.push(`hold ${h.start}-${h.end}: say why it is intentional`);
  }

  if (errors.length) return { errors, warnings };

  // Key frames for the contact sheet: 6 to 9, at least one per beat when possible.
  const kf = [];
  for (const b of beats) for (const t of b.keyFrames ?? [b.start + (b.end - b.start) * 0.65]) kf.push({ t: Math.round(t * 1000) / 1000, beat: b.id });
  const byLength = [...beats].sort((a, b) => (b.end - b.start) - (a.end - a.start));
  let k = 0;
  while (kf.length < 6 && k < byLength.length * 3) {
    const b = byLength[k % byLength.length];
    const t = Math.round((b.start + (b.end - b.start) * [0.3, 0.85, 0.5][Math.floor(k / byLength.length)]) * 1000) / 1000;
    if (!kf.some((x) => Math.abs(x.t - t) < 0.2)) kf.push({ t, beat: b.id });
    k += 1;
  }
  kf.sort((a, b) => a.t - b.t);
  let keyFrames = kf;
  if (kf.length > 9) {
    const firstPerBeat = new Set(beats.map((b) => kf.find((x) => x.beat === b.id)).filter(Boolean));
    keyFrames = [...firstPerBeat, ...kf.filter((x) => !firstPerBeat.has(x))].slice(0, 9).sort((a, b) => a.t - b.t);
  }
  keyFrames = keyFrames.map((x) => ({ ...x, frame: Math.round(x.t * fps) + 1 }));

  const storyboard = {
    title: beatsDoc.title || "Launch film",
    fps,
    duration,
    frames: Math.round(duration * fps),
    presets: Object.fromEntries(presets.map((p) => [p, PRESETS[p]])),
    beats: beats.map((b) => ({
      id: b.id, role: b.role, start: b.start, end: b.end,
      startFrame: Math.round(b.start * fps), endFrame: Math.round(b.end * fps) - 1,
      onScreen: b.onScreen ?? [], voice: b.voice ?? "", visual: b.visual ?? "", motion: b.motion ?? "",
      media: b.media ?? [], facts: (b.facts ?? []).map((id) => ({ id, text: facts.get(id) })),
    })),
    keyFrames,
    holds,
  };
  return { errors, warnings, storyboard, css: presetsCss(presets), markdown: storyboardMd(storyboard) };
}

function presetsCss(presets) {
  const blocks = presets.map((p) => {
    const s = PRESETS[p];
    return `[data-preset="${p}"] {\n  --canvas-w: ${s.width}px;\n  --canvas-h: ${s.height}px;\n  --safe-top: ${s.safe.top}px;\n  --safe-right: ${s.safe.right}px;\n  --safe-bottom: ${s.safe.bottom}px;\n  --safe-left: ${s.safe.left}px;\n  --type-min: ${s.typeMin}px;\n  --type-head: ${s.typeHead}px;\n}`;
  });
  return `/* Generated by plan-film.mjs. Put every text layer inside .safe so it cannot leave the safe area. */\n${blocks.join("\n")}\n.safe {\n  position: absolute;\n  inset: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);\n}\n`;
}

function fmt(t) {
  return `${t.toFixed(2)}s`;
}

function storyboardMd(sb) {
  const out = [`# ${sb.title}`, "", `${sb.duration} s · ${sb.fps} fps · ${sb.frames} frames · presets: ${Object.entries(sb.presets).map(([k, v]) => `${k} ${v.width}x${v.height}`).join(", ")}`, ""];
  out.push("| # | Beat | Time | Frames | On screen | Voiceover | Visual and motion | Media | Facts |");
  out.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  sb.beats.forEach((b, i) => {
    const cell = (s) => String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " / ");
    out.push(`| ${i + 1} | ${b.role} \`${b.id}\` | ${fmt(b.start)}-${fmt(b.end)} | ${b.startFrame}-${b.endFrame} | ${cell(b.onScreen.join(" · "))} | ${cell(b.voice)} | ${cell([b.visual, b.motion].filter(Boolean).join(" — "))} | ${cell(b.media.join(", "))} | ${cell(b.facts.map((f) => f.id).join(", "))} |`);
  });
  out.push("", "## Key frames for the contact sheet", "", sb.keyFrames.map((k) => `${fmt(k.t)} (frame ${k.frame}, ${k.beat})`).join(" · "), "");
  out.push(`Snapshot them: \`npx hyperframes snapshot --at ${sb.keyFrames.map((k) => k.t).join(",")}\``, "");
  if (sb.holds.length) {
    out.push("## Intentional holds", "");
    for (const h of sb.holds) out.push(`- ${fmt(h.start)}-${fmt(h.end)}: ${h.why}`);
    out.push("");
  }
  const cited = sb.beats.flatMap((b) => b.facts);
  if (cited.length) {
    out.push("## Facts the film relies on", "");
    for (const f of new Map(cited.map((f) => [f.id, f])).values()) out.push(`- \`${f.id}\` ${f.text}`);
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file || argv.includes("--help")) {
    console.log("Usage: node scripts/plan-film.mjs film/beats.json [--out-dir DIR] [--times]\n       node scripts/plan-film.mjs --self-test");
    return file ? 0 : 2;
  }
  const doc = load(file);
  const baseDir = dirname(resolve(file));
  let product = null;
  if (doc.product) {
    const p = resolve(baseDir, doc.product);
    if (!existsSync(p)) { console.error(`product file not found: ${doc.product}`); return 2; }
    product = load(p);
  } else {
    console.error("warning: no \"product\" file given; only userFacts can back claims");
  }
  const res = planFilm(doc, product, { baseDir });
  for (const w of res.warnings) console.log(`warning: ${w}`);
  if (res.errors.length) {
    for (const e of res.errors) console.log(`error:   ${e}`);
    console.log(`\n${res.errors.length} problem(s). Fix the beat sheet; nothing was written.`);
    return 1;
  }
  if (argv.includes("--times")) {
    console.log(res.storyboard.keyFrames.map((k) => k.t).join(","));
    return 0;
  }
  const outIdx = argv.indexOf("--out-dir");
  const outDir = outIdx >= 0 ? resolve(argv[outIdx + 1]) : baseDir;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "STORYBOARD.md"), res.markdown);
  writeFileSync(join(outDir, "storyboard.json"), JSON.stringify(res.storyboard, null, 2) + "\n");
  writeFileSync(join(outDir, "presets.css"), res.css);
  console.log(`OK: ${res.storyboard.duration} s, ${res.storyboard.beats.length} beats, ${res.storyboard.keyFrames.length} key frames.`);
  console.log(`Wrote STORYBOARD.md, storyboard.json and presets.css in ${outDir}`);
  console.log(`Contact sheet frames: npx hyperframes snapshot --at ${res.storyboard.keyFrames.map((k) => k.t).join(",")}`);
  return 0;
}

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  const product = { facts: [
    { id: "f1", text: "Memoleaf turns voice memos into tidy meeting notes." },
    { id: "f2", text: "Transcribes 9 languages on device." },
    { id: "f3", text: "Exports to Markdown and PDF." },
  ] };
  const good = () => ({
    title: "Memoleaf launch", fps: 30, presets: ["wide", "vertical"],
    beats: [
      { id: "hook", role: "hook", start: 0, end: 3.5, onScreen: ["Your meeting ended.", "The notes didn't."], voice: "Your meeting ended. The notes didn't." },
      { id: "pain", role: "problem", start: 3.5, end: 8, onScreen: ["Forty minutes of audio", "nobody will replay"] },
      { id: "m1", role: "moment", start: 8, end: 14, onScreen: ["Drop in the memo.", "Get the notes."], facts: ["f1"] },
      { id: "m2", role: "moment", start: 14, end: 19.5, onScreen: ["In 9 languages,", "on your laptop."], facts: ["f2"] },
      { id: "proof", role: "proof", start: 19.5, end: 24, onScreen: ["Markdown or PDF,", "ready to share."], facts: ["f3"] },
      { id: "cta", role: "cta", start: 24, end: 28, onScreen: ["npx memoleaf init"] },
    ],
    holds: [{ start: 26, end: 28, why: "End card holds so the command can be copied" }],
  });

  await check("a sound beat sheet passes and yields 6-9 key frames", async () => {
    const res = planFilm(good(), product);
    assert.deepEqual(res.errors, []);
    assert.ok(res.storyboard.keyFrames.length >= 6 && res.storyboard.keyFrames.length <= 9);
    assert.equal(res.storyboard.frames, 28 * 30);
    assert.match(res.css, /\[data-preset="vertical"\][\s\S]*--safe-bottom: 440px/);
    assert.match(res.markdown, /\| 1 \| hook `hook` \| 0\.00s-3\.50s/);
  });

  await check("an unbacked number is refused", async () => {
    const doc = good();
    doc.beats[4].onScreen = ["Used by 10,000 teams"];
    const res = planFilm(doc, product);
    assert.ok(res.errors.some((e) => /number 10,000/.test(e)), res.errors.join("\n"));
  });

  await check("moments and proof must cite facts", async () => {
    const doc = good();
    delete doc.beats[2].facts;
    assert.ok(planFilm(doc, product).errors.some((e) => /"m1": a moment must cite/.test(e)));
  });

  await check("order, gaps, runtime and readability are enforced", async () => {
    const doc = good();
    doc.beats[1].start = 4;
    assert.ok(planFilm(doc, product).errors.some((e) => /back to back/.test(e)));
    const doc2 = good();
    [doc2.beats[1], doc2.beats[2]] = [doc2.beats[2], doc2.beats[1]];
    assert.ok(planFilm(doc2, product).errors.some((e) => /comes after/.test(e)));
    const doc3 = good();
    doc3.beats[0].onScreen = ["This is a very long opening line that nobody will finish reading", "and then another one"];
    assert.ok(planFilm(doc3, product).errors.some((e) => /need about|words/.test(e)));
    const doc4 = good();
    doc4.beats.at(-1).end = 45;
    doc4.holds = [];
    assert.ok(planFilm(doc4, product).errors.some((e) => /runtime is 45s/.test(e)));
    const doc5 = good();
    doc5.beats[0].voice = "Your meeting ended an hour ago and the notes still do not exist anywhere at all, again";
    assert.ok(planFilm(doc5, product).errors.some((e) => /voiceover needs/.test(e)));
  });

  await check("hype and 'Introducing' are flagged", async () => {
    const doc = good();
    doc.beats[0].onScreen = ["Introducing Memoleaf", "Seamless notes"];
    const res = planFilm(doc, product);
    assert.ok(res.warnings.some((w) => /Introducing/.test(w)));
    assert.ok(res.warnings.some((w) => /hype/.test(w)));
  });

  await check("writes STORYBOARD.md, storyboard.json and presets.css", async () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-film-test-"));
    try {
      writeFileSync(join(dir, "product.json"), JSON.stringify(product));
      writeFileSync(join(dir, "beats.json"), JSON.stringify({ ...good(), product: "product.json" }));
      const orig = console.log;
      console.log = () => {};
      let code;
      try { code = await main([join(dir, "beats.json")]); } finally { console.log = orig; }
      assert.equal(code, 0);
      for (const f of ["STORYBOARD.md", "storyboard.json", "presets.css"]) assert.ok(existsSync(join(dir, f)), f);
      assert.equal(load(join(dir, "storyboard.json")).holds[0].why, "End card holds so the command can be copied");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : `\nAll ${results.length} self-tests passed.`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
