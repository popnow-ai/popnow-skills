#!/usr/bin/env node
// mix.mjs - put the sound under a rendered launch film with FFmpeg:
// a music bed ducked under the voiceover, optional sound effects, the whole mix brought to a
// social loudness target (default -16 LUFS integrated, -1.5 dBTP true peak) with two-pass loudnorm,
// then muxed onto the video without re-encoding the picture.
//
// Usage:
//   node scripts/mix.mjs --video renders/film.mp4 --music assets/bgm/bed.mp3 --music-from 6.0 \
//        --voice assets/voice/vo-en.wav@0.6 --sfx assets/sfx/click.wav@12.3 --out renders/film-mixed.mp4
//   node scripts/mix.mjs ... --print          show the exact FFmpeg commands, run nothing
//   node scripts/mix.mjs --self-test          synthetic sources, checks loudness and ducking
//
// Options:
//   --music FILE         music bed (one)                --music-from S   start this far into the track
//   --bed-level LUFS     bed loudness where nobody speaks (-21)   --fade-out S   bed fade at the end (1.5)
//   --voice-level LUFS   voiceover loudness (-17); each source is measured and levelled first
//   --voice FILE@AT      voiceover clip starting AT seconds into the film (repeatable)
//   --sfx FILE@AT[@GAIN] sound effect (repeatable, default gain 0.6)
//   --duck RATIO         sidechain ratio under the voice (8, about 7-9 dB of ducking; 1 turns it off)
//   --target LUFS        integrated loudness (-16)      --tp DBTP        true-peak ceiling (-1.5)
//   --duration S         film length (default: the video's duration)
//   --keep-video-audio   also keep the audio already in the video (e.g. effects placed in HyperFrames)
//   --stems DIR          also write the ducked bed and the voice bus as WAVs, for checking
//   --out FILE           .mp4 (with --video) or .wav / .m4a (audio only)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AF = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";

function run(cmd, args, { capture = false } = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) throw new Error(`${cmd} is not installed or not on PATH (${res.error.code})`);
  if (res.status !== 0) throw new Error(`${cmd} failed: ${(res.stderr || "").trim().split("\n").slice(-3).join(" | ")}`);
  return capture ? res : null;
}

export function probe(file) {
  const res = run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,sample_rate,channels,width,height,r_frame_rate,pix_fmt", "-of", "json", file], { capture: true });
  return JSON.parse(res.stdout);
}

function parseClip(spec, defaults = {}) {
  const parts = String(spec).split("@");
  const file = parts[0];
  const at = parts[1] != null && parts[1] !== "" ? Number(parts[1]) : defaults.at ?? 0;
  const gain = parts[2] != null && parts[2] !== "" ? Number(parts[2]) : defaults.gain ?? 1;
  if (!file || !Number.isFinite(at) || at < 0 || !Number.isFinite(gain)) throw new Error(`bad clip "${spec}" (use FILE@SECONDS[@GAIN])`);
  return { file, at, gain };
}

const ms = (s) => Math.round(s * 1000);
const num = (n) => Number(n.toFixed(3)).toString();

// Builds the filter graph for pass 1. Every bus is padded and trimmed to the film length so amix ends
// exactly with the picture.
export function buildGraph(o) {
  const inputs = [];
  const chains = [];
  const add = (file) => { inputs.push(file); return inputs.length - 1 + (o.video ? 1 : 0); };
  const D = num(o.duration);
  const fit = `apad,atrim=0:${D},asetpts=PTS-STARTPTS`;
  const buses = [];
  let music = null;
  if (o.music) {
    const i = add(o.music.file);
    const fadeAt = Math.max(0, o.duration - o.fadeOut);
    chains.push(`[${i}:a]atrim=start=${num(o.musicFrom)},asetpts=PTS-STARTPTS,${AF},volume=${num(o.musicGainDb)}dB,afade=t=in:st=0:d=0.3,adelay=${ms(o.musicAt)}|${ms(o.musicAt)},afade=t=out:st=${num(fadeAt)}:d=${num(o.fadeOut)},${fit}[music]`);
    music = "music";
  }
  let vox = null;
  if (o.voices.length) {
    const labels = o.voices.map((v, k) => {
      const i = add(v.file);
      chains.push(`[${i}:a]${AF},volume=${num(v.gainDb ?? 0)}dB,volume=${num(v.gain)},adelay=${ms(v.at)}|${ms(v.at)},${fit}[v${k}]`);
      return `[v${k}]`;
    });
    chains.push(labels.length > 1 ? `${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=first[vox]` : `${labels[0]}anull[vox]`);
    vox = "vox";
  }
  // Stems are extra outputs for checking; only split when they will be written (an unused output is an error).
  const split = (label, outs) => {
    const want = o.stemsDir ? outs : outs.filter((x) => !x.endsWith("stem"));
    chains.push(want.length > 1 ? `[${label}]asplit=${want.length}${want.map((x) => `[${x}]`).join("")}` : `[${label}]anull[${want[0]}]`);
  };
  if (music && vox && o.duck > 1) {
    split("vox", ["voxmix", "voxsc", "voxstem"]);
    chains.push(`[music][voxsc]sidechaincompress=threshold=0.05:ratio=${num(o.duck)}:attack=20:release=350:makeup=1[ducked]`);
    split("ducked", ["bedmix", "bedstem"]);
    buses.push("[bedmix]", "[voxmix]");
  } else {
    if (music) { split("music", ["bedmix", "bedstem"]); buses.push("[bedmix]"); }
    if (vox) { split("vox", ["voxmix", "voxstem"]); buses.push("[voxmix]"); }
  }
  o.sfx.forEach((s, k) => {
    const i = add(s.file);
    chains.push(`[${i}:a]${AF},volume=${num(s.gain)},adelay=${ms(s.at)}|${ms(s.at)},${fit}[s${k}]`);
    buses.push(`[s${k}]`);
  });
  if (o.video && o.keepVideoAudio) {
    chains.push(`[0:a]${AF},${fit}[orig]`);
    buses.push("[orig]");
  }
  if (!buses.length) throw new Error("nothing to mix: give --music, --voice or --sfx");
  chains.push(buses.length > 1 ? `${buses.join("")}amix=inputs=${buses.length}:normalize=0:duration=first[mix]` : `${buses[0]}anull[mix]`);
  const stems = ["bedstem", "voxstem"].filter((x) => chains.some((c) => c.includes(`[${x}]`)));
  return { inputs, graph: chains.join(";\n"), stems };
}

function loudnormArgs(o, measured) {
  const base = `loudnorm=I=${o.target}:TP=${o.tp}:LRA=11`;
  if (!measured) return `${base}:print_format=json`;
  return `${base}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=json`;
}

function lastJson(text) {
  const end = text.lastIndexOf("}");
  const start = text.lastIndexOf("{", end);
  return JSON.parse(text.slice(start, end + 1));
}

export function measure(file) {
  const res = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { capture: true });
  const tail = res.stderr.slice(res.stderr.lastIndexOf("Summary:"));
  const I = Number(tail.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const TP = Number(tail.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  const LRA = Number(tail.match(/LRA:\s+(-?[\d.]+) LU/)?.[1]);
  return { I, TP, LRA };
}

export function commands(o, mixWav) {
  const { inputs, graph, stems } = buildGraph(o);
  const pre = ["-hide_banner", "-loglevel", "error", "-y"];
  const inArgs = [...(o.video ? ["-i", o.video] : []), ...inputs.flatMap((f) => ["-i", f])];
  const pass1 = [...pre, ...inArgs, "-filter_complex", graph, "-map", "[mix]", "-t", num(o.duration), "-c:a", "pcm_s24le", mixWav];
  if (o.stemsDir) for (const s of stems) pass1.push("-map", `[${s}]`, "-t", num(o.duration), "-c:a", "pcm_s24le", join(o.stemsDir, `${s === "bedstem" ? "bed-ducked" : "voice-bus"}.wav`));
  const pass2 = ["-hide_banner", "-nostats", "-i", mixWav, "-af", loudnormArgs(o, null), "-f", "null", "-"];
  // loudnorm can return a few hundred milliseconds less than it was given; pad the audio and cut the
  // output at the film's length so the picture is never shortened.
  const pass3 = (measured) => {
    const af = `${loudnormArgs(o, measured)},apad`;
    const len = ["-t", num(o.duration)];
    if (o.video) return [...pre, "-i", o.video, "-i", mixWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", ...len, "-movflags", "+faststart", o.out];
    const codec = /\.m4a$/i.test(o.out) ? ["-c:a", "aac", "-b:a", "192k"] : ["-c:a", "pcm_s24le"];
    return [...pre, "-i", mixWav, "-af", af, ...codec, "-ar", "48000", ...len, o.out];
  };
  return { pass1, pass2, pass3 };
}

const shellQuote = (a) => (/^[\w@%+=:,./-]+$/.test(a) ? a : `'${String(a).replace(/'/g, "'\\''")}'`);
const show = (args) => `ffmpeg ${args.map(shellQuote).join(" ")}`;

export function parseArgs(argv) {
  const o = { voices: [], sfx: [], musicFrom: 0, musicAt: 0, bedLevel: -21, voiceLevel: -17, musicGainDb: 0, fadeOut: 1.5, duck: 8, target: -16, tp: -1.5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => argv[++i];
    switch (a) {
      case "--video": o.video = v(); break;
      case "--music": o.music = { file: v() }; break;
      case "--music-from": o.musicFrom = Number(v()); break;
      case "--music-at": o.musicAt = Number(v()); break;
      case "--bed-level": o.bedLevel = Number(v()); break;
      case "--voice-level": o.voiceLevel = Number(v()); break;
      case "--fade-out": o.fadeOut = Number(v()); break;
      case "--voice": o.voices.push(parseClip(v(), { gain: 1 })); break;
      case "--sfx": o.sfx.push(parseClip(v(), { gain: 0.6 })); break;
      case "--duck": o.duck = Number(v()); break;
      case "--target": o.target = Number(v()); break;
      case "--tp": o.tp = Number(v()); break;
      case "--duration": o.duration = Number(v()); break;
      case "--keep-video-audio": o.keepVideoAudio = true; break;
      case "--stems": o.stemsDir = v(); break;
      case "--out": o.out = v(); break;
      case "--print": o.print = true; break;
      case "--self-test": o.selfTest = true; break;
      case "--help": o.help = true; break;
      default: throw new Error(`unknown option ${a}`);
    }
  }
  return o;
}

export function mix(o) {
  for (const f of [o.video, o.music?.file, ...o.voices.map((v) => v.file), ...o.sfx.map((s) => s.file)].filter(Boolean)) {
    if (!existsSync(f)) throw new Error(`not found: ${f}`);
  }
  if (!o.out) throw new Error("--out is required");
  if (o.video) {
    const info = probe(o.video);
    if (o.duration == null) o.duration = Number(info.format.duration);
    const hasAudio = info.streams.some((s) => s.codec_type === "audio");
    if (hasAudio && !o.keepVideoAudio) console.error("note: the video already has an audio track; it is replaced (add --keep-video-audio to mix it in)");
    if (!hasAudio && o.keepVideoAudio) o.keepVideoAudio = false;
  }
  if (!(o.duration > 0)) throw new Error("--duration is required without --video");
  // Level by loudness, not by guessed gains: generated beds are often mastered loud, voices vary.
  const levelTo = (file, target, what) => {
    const m = measure(file);
    if (!Number.isFinite(m.I) || m.I < -60) { console.error(`note: could not measure ${what}; using it as is`); return 0; }
    return Math.round((target - m.I) * 10) / 10;
  };
  if (o.music) o.musicGainDb = levelTo(o.music.file, o.voices.length ? o.bedLevel : o.voiceLevel, "the music bed");
  for (const v of o.voices) v.gainDb = levelTo(v.file, o.voiceLevel, v.file);
  const work = mkdtempSync(join(tmpdir(), "launch-mix-"));
  try {
    const mixWav = join(work, "mix.wav");
    if (o.stemsDir) mkdirSync(o.stemsDir, { recursive: true });
    const cmd = commands(o, mixWav);
    if (o.print) {
      console.log("# 1. mix the buses (bed ducked under the voice) to a WAV of the film's length");
      console.log(show(cmd.pass1).replace(mixWav, "mix.wav"));
      console.log("\n# 2. measure loudness");
      console.log(show(cmd.pass2).replace(mixWav, "mix.wav"));
      console.log("\n# 3. normalise with the measured values (copy input_i, input_tp, input_lra, input_thresh, target_offset from step 2) and mux");
      console.log(show(cmd.pass3({ input_i: "<input_i>", input_tp: "<input_tp>", input_lra: "<input_lra>", input_thresh: "<input_thresh>", target_offset: "<target_offset>" })).replace(mixWav, "mix.wav"));
      return { printed: true };
    }
    mkdirSync(dirname(resolve(o.out)), { recursive: true });
    run("ffmpeg", cmd.pass1);
    const measured = lastJson(run("ffmpeg", cmd.pass2, { capture: true }).stderr);
    const res3 = run("ffmpeg", cmd.pass3(measured), { capture: true });
    let mode = "linear";
    try { mode = lastJson(res3.stderr).normalization_type || mode; } catch { /* summary not printed at loglevel error */ }
    const after = measure(o.out);
    return { before: { I: Number(measured.input_i), TP: Number(measured.input_tp) }, after, mode };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function main(argv = process.argv.slice(2)) {
  let o;
  try { o = parseArgs(argv); } catch (err) { console.error(`Error: ${err.message}`); return 2; }
  if (o.selfTest) return selfTest();
  if (o.help || !argv.length) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 27).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    return argv.length ? 0 : 2;
  }
  try {
    const r = mix(o);
    if (r.printed) return 0;
    console.log(`Mixed ${o.out}`);
    console.log(`Loudness: ${r.before.I} LUFS -> ${r.after.I} LUFS integrated, true peak ${r.after.TP} dBTP (target ${o.target} / ${o.tp})`);
    const ok = Math.abs(r.after.I - o.target) <= 1 && r.after.TP <= o.tp + 0.5;
    if (!ok) console.log("Outside the target: check for a very quiet bed or a clipped source, then re-run.");
    return ok ? 0 : 1;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  if (spawnSync("ffmpeg", ["-version"]).error) {
    console.log("skip: ffmpeg is not installed; mix.mjs needs it");
    return 0;
  }
  const dir = mkdtempSync(join(tmpdir(), "launch-mix-test-"));
  const ff = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
  try {
    const video = join(dir, "film.mp4");
    ff(["-f", "lavfi", "-i", "testsrc2=s=320x180:r=30:d=8", "-c:v", "libx264", "-pix_fmt", "yuv420p", video]);
    const bed = join(dir, "bed.wav");
    ff(["-f", "lavfi", "-i", "sine=f=220:d=12", "-f", "lavfi", "-i", "sine=f=277:d=12", "-f", "lavfi", "-i", "sine=f=330:d=12", "-filter_complex", "amix=inputs=3,volume=0.6", "-ac", "2", bed]);
    const vo = join(dir, "vo.wav");
    ff(["-f", "lavfi", "-i", "anoisesrc=d=2.5:c=pink:a=0.5,bandpass=f=1200:width_type=o:w=2", "-ac", "1", vo]);
    const click = join(dir, "click.wav");
    ff(["-f", "lavfi", "-i", "sine=f=1800:d=0.15,afade=t=out:st=0.05:d=0.1", click]);
    const out = join(dir, "mixed.mp4");
    const stems = join(dir, "stems");

    await check("print shows three exact commands and runs nothing", async () => {
      const o = parseArgs(["--video", video, "--music", bed, "--voice", `${vo}@1`, "--out", out, "--print"]);
      const lines = [];
      const orig = console.log; console.log = (s) => lines.push(s);
      try { mix(o); } finally { console.log = orig; }
      const text = lines.join("\n");
      assert.match(text, /sidechaincompress=threshold=0\.05:ratio=8/);
      assert.match(text, /loudnorm=I=-16:TP=-1\.5:LRA=11:print_format=json/);
      assert.match(text, /measured_I=<input_i>.*linear=true/);
      assert.ok(!existsSync(out));
    });

    await check("mix hits -16 LUFS, keeps peaks under -1 dBTP and the film length", async () => {
      const o = parseArgs(["--video", video, "--music", bed, "--music-from", "1.5", "--voice", `${vo}@1`, "--sfx", `${click}@6`, "--stems", stems, "--out", out]);
      const r = mix(o);
      assert.ok(Math.abs(r.after.I + 16) <= 1, `integrated ${r.after.I}`);
      assert.ok(r.after.TP <= -1.0, `true peak ${r.after.TP}`);
      const info = probe(out);
      assert.ok(Math.abs(Number(info.format.duration) - 8) < 0.05, `duration ${info.format.duration}`);
      const v = info.streams.find((s) => s.codec_type === "video");
      assert.ok(v, "video stream kept");
      const a = info.streams.find((s) => s.codec_type === "audio");
      assert.equal(a.codec_name, "aac");
      assert.equal(Number(a.sample_rate), 48000);
      assert.equal(info.streams.find((s) => s.codec_type === "video").codec_name, "h264");
    });

    await check("the bed is ducked while the voice speaks", async () => {
      const level = (from, len) => {
        const res = run("ffmpeg", ["-hide_banner", "-nostats", "-ss", String(from), "-t", String(len), "-i", join(stems, "bed-ducked.wav"), "-af", "volumedetect", "-f", "null", "-"], { capture: true });
        return Number(res.stderr.match(/mean_volume:\s+(-?[\d.]+) dB/)[1]);
      };
      const during = level(1.8, 1.2);
      const after = level(4.8, 1.0);
      assert.ok(after - during >= 5 && after - during <= 13, `bed ${(after - during).toFixed(1)} dB lower under the voice (want about 6 to 10)`);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : `\nAll ${results.length} self-tests passed (synthetic audio, no network).`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
