#!/usr/bin/env node
// qa-check.mjs - check a rendered launch film before anyone posts it.
//
// Measured from the MP4 itself with FFmpeg:
//   - canvas, frame rate, codec and pixel format suit the preset and social platforms
//   - runtime is 20-40 s and matches the storyboard
//   - the film opens on a picture, not on black
//   - no static hold longer than 1.2 s unless the storyboard marks it as intentional
//   - loudness near -16 LUFS integrated, true peak at or below -1 dBTP, no long silence mid-film
// Text legibility and safe areas are checked in the composition (scripts/frame-audit.mjs, references/qa.md);
// this script covers what only the rendered file can show.
//
// Usage:
//   node scripts/qa-check.mjs renders/film-wide.mp4 --preset wide --storyboard film/storyboard.json
//   node scripts/qa-check.mjs renders/film.mp4 --json
//   node scripts/qa-check.mjs --self-test
//
// Options: --max-hold 1.2  --target -16  --runtime 20,40  --json

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PRESETS = { wide: [1920, 1080], vertical: [1080, 1920], square: [1080, 1080] };

function ff(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw new Error(`${cmd} is not installed or not on PATH`);
  return res;
}

function analyse(file) {
  const probe = ff("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels", "-of", "json", file]);
  if (probe.status !== 0) throw new Error(`cannot read ${file}: ${probe.stderr.trim()}`);
  const info = JSON.parse(probe.stdout);
  const video = info.streams.find((s) => s.codec_type === "video");
  const audio = info.streams.find((s) => s.codec_type === "audio");
  const [n, d] = String(video?.r_frame_rate || "0/1").split("/").map(Number);
  const out = { duration: Number(info.format.duration), video, audio, fps: d ? n / d : 0 };
  // Freezes and black: one decode pass.
  const v = ff("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:v:0", "-vf", "freezedetect=n=0.001:d=0.5,blackdetect=d=0.1:pix_th=0.10", "-f", "null", "-"]);
  out.freezes = [];
  let open = null;
  for (const line of v.stderr.split("\n")) {
    const s = line.match(/freeze_start:\s*([\d.]+)/);
    const e = line.match(/freeze_end:\s*([\d.]+)/);
    if (s) open = Number(s[1]);
    if (e && open != null) { out.freezes.push({ start: open, end: Number(e[1]) }); open = null; }
  }
  if (open != null) out.freezes.push({ start: open, end: out.duration });
  out.black = [...v.stderr.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => ({ start: Number(m[1]), end: Number(m[2]) }));
  if (audio) {
    const a = ff("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "silencedetect=n=-45dB:d=1.5,ebur128=peak=true", "-f", "null", "-"]);
    const tail = a.stderr.slice(a.stderr.lastIndexOf("Summary:"));
    out.loudness = { I: Number(tail.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]), TP: Number(tail.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]) };
    out.silences = [];
    let ss = null;
    for (const line of a.stderr.split("\n")) {
      const s = line.match(/silence_start:\s*(-?[\d.]+)/);
      const e = line.match(/silence_end:\s*([\d.]+)/);
      if (s) ss = Math.max(0, Number(s[1]));
      if (e && ss != null) { out.silences.push({ start: ss, end: Number(e[1]) }); ss = null; }
    }
    if (ss != null) out.silences.push({ start: ss, end: out.duration });
  }
  return out;
}

export function qa(file, { preset, storyboard, maxHold = 1.2, target = -16, runtime = [20, 40] } = {}) {
  const a = analyse(file);
  const errors = [];
  const warnings = [];
  const passed = [];
  const t = (x) => `${x.toFixed(2)}s`;

  const [w, h] = [a.video?.width, a.video?.height];
  if (!a.video) errors.push("no video stream");
  if (preset) {
    const [pw, ph] = PRESETS[preset] || [];
    if (!pw) errors.push(`unknown preset ${preset}`);
    else if (w === pw && h === ph) passed.push(`${w}x${h} matches ${preset}`);
    else if (Math.abs(w / h - pw / ph) < 0.01) warnings.push(`${w}x${h} has the ${preset} shape but not its ${pw}x${ph} size`);
    else errors.push(`${w}x${h} is not ${preset} (${pw}x${ph})`);
  }
  if (a.fps < 24) errors.push(`frame rate ${a.fps.toFixed(2)} is below 24`);
  else passed.push(`${Math.round(a.fps * 100) / 100} fps`);
  if (storyboard?.fps && Math.abs(a.fps - storyboard.fps) > 0.01) warnings.push(`rendered at ${a.fps} fps, storyboard says ${storyboard.fps}`);
  if (a.video?.codec_name !== "h264") warnings.push(`video codec ${a.video?.codec_name}; H.264 is the safest for upload`);
  if (a.video?.pix_fmt && a.video.pix_fmt !== "yuv420p") warnings.push(`pixel format ${a.video.pix_fmt}; some platforms want yuv420p`);

  if (a.duration < runtime[0] || a.duration > runtime[1]) errors.push(`runtime ${t(a.duration)} is outside ${runtime[0]}-${runtime[1]} s`);
  else passed.push(`runtime ${t(a.duration)}`);
  if (storyboard?.duration && Math.abs(a.duration - storyboard.duration) > 0.2) warnings.push(`runtime ${t(a.duration)} differs from the storyboard's ${storyboard.duration} s`);

  const openingBlack = a.black.find((b) => b.start <= 0.04);
  if (openingBlack) errors.push(`opens on black for ${t(openingBlack.end - openingBlack.start)}; frame 1 should already show the hook`);
  else passed.push("opens on a picture");
  for (const b of a.black.filter((x) => x.start > 0.04 && x.end - x.start > 0.3)) warnings.push(`black from ${t(b.start)} to ${t(b.end)}`);

  const holds = storyboard?.holds ?? [];
  const intended = (f) => holds.some((hd) => f.start >= hd.start - 0.15 && f.end <= hd.end + 0.15);
  const long = a.freezes.filter((f) => f.end - f.start > maxHold);
  for (const f of long) {
    if (intended(f)) passed.push(`intentional hold ${t(f.start)}-${t(f.end)}`);
    else errors.push(`static for ${t(f.end - f.start)} from ${t(f.start)} to ${t(f.end)}; add purposeful motion or mark it as a hold in the beat sheet`);
  }
  if (!long.length) passed.push(`no static hold over ${maxHold} s`);

  if (!a.audio) warnings.push("no audio track: post silent only on purpose (most feeds autoplay muted, but a launch film usually has sound)");
  else {
    if (a.audio.codec_name !== "aac") warnings.push(`audio codec ${a.audio.codec_name}; AAC is the safest`);
    const { I, TP } = a.loudness;
    if (!Number.isFinite(I)) warnings.push("could not measure loudness");
    else if (Math.abs(I - target) <= 1) passed.push(`loudness ${I} LUFS`);
    else if (Math.abs(I - target) <= 2.5) warnings.push(`loudness ${I} LUFS, target ${target}`);
    else errors.push(`loudness ${I} LUFS is far from ${target}; run mix.mjs`);
    if (Number.isFinite(TP)) {
      if (TP > -1.0) errors.push(`true peak ${TP} dBTP is above -1 dBTP; it will clip after upload encoding`);
      else passed.push(`true peak ${TP} dBTP`);
    }
    for (const s of a.silences) {
      const atEdge = s.start < 0.6 || s.end > a.duration - 0.6;
      if (!atEdge && !holds.some((hd) => s.start >= hd.start - 0.2 && s.end <= hd.end + 0.2)) warnings.push(`silence from ${t(s.start)} to ${t(s.end)}`);
    }
  }
  return { file, errors, warnings, passed, measured: { width: w, height: h, fps: a.fps, duration: a.duration, loudness: a.loudness ?? null, freezes: a.freezes, black: a.black } };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  const valueFlags = new Set(["--preset", "--storyboard", "--max-hold", "--target", "--runtime"]);
  const file = argv.find((x, i) => !x.startsWith("--") && !valueFlags.has(argv[i - 1]));
  if (!file || argv.includes("--help")) {
    console.log("Usage: node scripts/qa-check.mjs <film.mp4> [--preset wide|vertical|square] [--storyboard film/storyboard.json] [--json]");
    return file ? 0 : 2;
  }
  try {
    const storyboard = opt("--storyboard") ? JSON.parse(readFileSync(opt("--storyboard"), "utf8")) : null;
    const runtime = opt("--runtime") ? opt("--runtime").split(",").map(Number) : [20, 40];
    const r = qa(file, { preset: opt("--preset"), storyboard, maxHold: Number(opt("--max-hold") || 1.2), target: Number(opt("--target") || -16), runtime });
    if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      for (const p of r.passed) console.log(`pass   ${p}`);
      for (const w of r.warnings) console.log(`warn   ${w}`);
      for (const e of r.errors) console.log(`FAIL   ${e}`);
      console.log(r.errors.length ? `\n${r.errors.length} problem(s) to fix before posting.` : "\nThe file checks pass. Now do the visual checks in references/qa.md.");
    }
    return r.errors.length ? 1 : 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  if (spawnSync("ffmpeg", ["-version"]).error) { console.log("skip: ffmpeg is not installed"); return 0; }
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  const dir = mkdtempSync(join(tmpdir(), "launch-qa-test-"));
  const make = (name, filter, audio = true) => {
    const out = join(dir, name);
    const args = ["-hide_banner", "-loglevel", "error", "-y"];
    if (audio) args.push("-f", "lavfi", "-i", "sine=f=440:d=8,volume=0.25");
    args.push("-filter_complex", filter, "-map", "[v]");
    if (audio) args.push("-map", "0:a");
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-t", "8", out);
    const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
    if (res.status !== 0) throw new Error(res.stderr);
    return out;
  };
  try {
    // 3 s moving, 2 s frozen, 3 s moving
    const frozen = make("frozen.mp4", "testsrc2=s=320x180:r=30:d=3[a];color=c=0x352242:s=320x180:r=30:d=2[b];testsrc2=s=320x180:r=30:d=3[c];[a][b][c]concat=n=3:v=1:a=0[v]");
    const blackStart = make("black.mp4", "color=c=black:s=320x180:r=30:d=0.6[a];testsrc2=s=320x180:r=30:d=7.4[b];[a][b]concat=n=2:v=1:a=0[v]", false);
    const opts = { runtime: [5, 40] };

    await check("an unplanned 2 s freeze fails", async () => {
      const r = qa(frozen, opts);
      assert.ok(r.errors.some((e) => /static for 2\.\d\ds from 3\.\d\ds/.test(e)), r.errors.join("\n"));
    });
    await check("the same freeze passes when the storyboard marks it as a hold", async () => {
      const r = qa(frozen, { ...opts, storyboard: { holds: [{ start: 3, end: 5, why: "end card" }] } });
      assert.ok(!r.errors.some((e) => /static/.test(e)), r.errors.join("\n"));
      assert.ok(r.passed.some((p) => /intentional hold/.test(p)));
    });
    await check("opening on black fails and a silent film is flagged", async () => {
      const r = qa(blackStart, opts);
      assert.ok(r.errors.some((e) => /opens on black/.test(e)));
      assert.ok(r.warnings.some((w) => /no audio track/.test(w)));
    });
    await check("runtime, preset size and loudness are measured", async () => {
      const r = qa(frozen, { preset: "wide" });
      assert.ok(r.errors.some((e) => /runtime 8\.00s is outside 20-40/.test(e)));
      assert.ok(r.errors.some((e) => /320x180 is not wide/.test(e)) || r.warnings.some((w) => /320x180 has the wide shape/.test(w)));
      assert.ok(Number.isFinite(r.measured.loudness.I));
      assert.ok(r.errors.some((e) => /loudness/.test(e)) || r.warnings.some((w) => /loudness/.test(w)), "a -24 LUFS tone is off target");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : `\nAll ${results.length} self-tests passed (synthetic video, no network).`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
