#!/usr/bin/env node
// popnow-assets.mjs - put PopNow-generated media into a HyperFrames project.
//
// Reads a JSON asset plan (stills, B-roll, music beds, voiceover, sound effects),
// quotes every item through scripts/popnow.py, asks for one confirmation of the
// total, generates, downloads into assets/, and records each file in:
//   - .media/manifest.jsonl + .media/index.md  (the HyperFrames media-use ledger,
//     same record shape, same append-only rule, same lock and id scheme)
//   - assets/popnow-provenance.json            (prompt, model, task, credits, licence note)
//
// Usage:
//   node scripts/popnow-assets.mjs <plan.json> --dry-run            offline: validate, estimate, preview records
//   node scripts/popnow-assets.mjs <plan.json> --quote              free: exact quotes, total, balance
//   node scripts/popnow-assets.mjs <plan.json> --confirm-credits N  generate (never spends more than N in total)
//   node scripts/popnow-assets.mjs --self-test                      offline test with a fake helper
//
// Options:
//   --project DIR        HyperFrames project (default: plan "project", relative to the plan file)
//   --only a,b           run only these item ids (their @dependencies must already exist)
//   --regenerate a,b     make a new take of items that are already done (new files, old ones kept)
//   --ledger MODE        media-use (default) | cli (record through `npx hyperframes media-use resolve --from`) | none
//   --preview-out FILE   with --dry-run: also write the preview as JSON
//   --popnow FILE        path to popnow.py (default: next to this script)
//   --python BIN         Python 3 interpreter (default: python3)
//   --timeout SECONDS    wait per task (default 1200)
//   --json               print the final summary as JSON
//
// Exit codes: 0 ok, 1 API or network error, 2 bad plan or usage, 3 needs confirmation
// (or the total would exceed the confirmed credits), 4 a task is still running, 5 a task failed.

import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync,
  renameSync, rmSync, statSync, unlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOL = "popnow-hyperframes-ai-assets";
const PROVENANCE_FILE = "assets/popnow-provenance.json";
const TERMS_URL = "https://popnow.ai/terms";
const KEYS_URL = "https://popnow.ai/api/console/keys";
const EXIT = { ok: 0, api: 1, usage: 2, confirm: 3, timeout: 4, failed: 5 };

// Kind of asset -> HyperFrames media-use type and the folder it lands in.
// The folder names match what `media-use resolve --adopt` infers types from.
const KINDS = {
  image: { type: "image", dir: "assets/images" },
  video: { type: "video", dir: "assets/video" },
  bgm: { type: "bgm", dir: "assets/bgm" },
  voice: { type: "voice", dir: "assets/voice" },
  sfx: { type: "sfx", dir: "assets/sfx" },
};
// media-use keeps its own frozen files per type here; ids already taken by a file there count as used.
const MEDIA_TYPE_DIRS = { bgm: "audio/bgm", sfx: "audio/sfx", voice: "audio/voice", image: "images", video: "video" };

// The 12 languages PopNow's site and voiceover workflow cover. The speech model reads the
// language from the text itself; `lang` only names files and fills the ledger.
const LANGS = ["en", "zh-CN", "zh-TW", "ja", "ko", "de", "fr", "es", "pt-BR", "ru", "it", "pl"];

// Typical prices for the offline --dry-run estimate only (credits, October 2026 list).
// The quote is the only exact number; models and prices change.
const PRICE_HINTS = {
  "google/nano-banana-2.1/text-to-image": { unit: "image", base: 48, by: { resolution: { "1k": 48, "2k": 72, "4k": 162 } } },
  "google/nano-banana-2.1/edit": { unit: "image", base: 48, by: { resolution: { "1k": 48, "2k": 72, "4k": 162 } } },
  "openai/gpt-image-2/text-to-image": { unit: "image", base: 24, by: { quality: { low: 3, medium: 24, high: 97 } } },
  "alibaba/z-image-turbo/text-to-image": { unit: "image", base: 10 },
  "popnow/image-upscaler-v1/upscale": { unit: "image", base: 12 },
  "popnow/background-remover-v1/edit": { unit: "image", base: 5 },
  "minimax/h3/text-to-video": { unit: "second", base: 37, seconds: 5, by: { resolution: { "768p": 37, "2k": 58 } } },
  "minimax/h3/image-to-video": { unit: "second", base: 37, seconds: 5, by: { resolution: { "768p": 37, "2k": 58 } } },
  "bytedance/seedance-2.0-mini/text-to-video": { unit: "second", base: 53, seconds: 5, by: { resolution: { "480p": 25, "720p": 53 } } },
  "bytedance/seedance-2.0-mini/image-to-video": { unit: "second", base: 53, seconds: 5, by: { resolution: { "480p": 25, "720p": 53 } } },
  "suno/v6/text-to-audio": { unit: "request", base: 72 },
  "minimax/music-3.0/text-to-audio": { unit: "request", base: 180 },
  "google/gemini-3.8-flash-tts/text-to-speech": { unit: "speech-second", base: 0.32 },
  "minimax/speech-2.8-turbo/text-to-speech": { unit: "1k-chars", base: 72 },
  "popnow/foley-v1/video-to-audio": { unit: "second", base: 1.2, seconds: 8 },
  "bytedance/seed-audio-1.0/text-to-audio": { unit: "request", base: 360 },
};

// Plan field -> popnow.py flag.
const FLAG_FIELDS = [
  ["prompt", "--prompt"], ["text", "--text"], ["negativePrompt", "--negative-prompt"], ["lyrics", "--lyrics"],
  ["title", "--title"], ["voice", "--voice"], ["aspectRatio", "--aspect-ratio"], ["resolution", "--resolution"],
  ["duration", "--duration"], ["seed", "--seed"], ["outputFormat", "--output-format"],
];
const MEDIA_FIELDS = [["image", "--image"], ["lastImage", "--last-image"], ["video", "--video"], ["audio", "--audio"]];
const ITEM_FIELDS = new Set(["id", "kind", "model", "use", "description", "out", "lang", "people", "consent", "license",
  "set", ...FLAG_FIELDS.map(([f]) => f), ...MEDIA_FIELDS.map(([f]) => f)]);

// Asking a model to imitate someone's voice or a named artist is refused unless consent is recorded.
const IMITATION = /\b(in the (voice|style) of|sounds? (just )?like|sung by|cover of|clone[ds]? (of |the )?voice|voice clone)\b/i;
const CLONE_FIELDS = ["reference_audio_urls", "persona_id", "voice_sample", "voice_clone", "speaker_audio"];

// Off in the self-test so it never waits on a keyboard.
let promptAllowed = true;

class PlanError extends Error {}
class StopRun extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

// ---------------------------------------------------------------------------
// Plan loading and validation
// ---------------------------------------------------------------------------

function loadPlan(planPath, projectOverride) {
  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (err) {
    throw new PlanError(`cannot read plan ${planPath}: ${err.message}`);
  }
  const planDir = dirname(resolve(planPath));
  const project = resolve(projectOverride || resolve(planDir, plan.project || "."));
  return { plan, project, planPath: resolve(planPath) };
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function needsConsent(item) {
  const reasons = [];
  if (item.people === "real") reasons.push('people: "real" (an identifiable real person)');
  const set = item.set || {};
  for (const key of CLONE_FIELDS) if (set[key] != null) reasons.push(`set.${key} (voice or likeness reference)`);
  if (set.persona_model === "voice_persona") reasons.push("set.persona_model=voice_persona");
  if (["bgm", "voice", "sfx"].includes(item.kind)) {
    if (asList(item.audio).length) reasons.push("an audio reference input");
    const words = `${item.prompt || ""} ${item.text || ""} ${item.title || ""}`;
    if (IMITATION.test(words)) reasons.push("the prompt asks to imitate a voice or artist");
  }
  return reasons;
}

function validatePlan(plan, project, { requireInputs }) {
  const errors = [];
  const warnings = [];
  if (!plan || typeof plan !== "object") throw new PlanError("plan must be a JSON object");
  if (!Array.isArray(plan.assets) || plan.assets.length === 0) throw new PlanError('plan needs a non-empty "assets" array');
  const defaults = plan.defaults || {};
  const ids = new Set();
  const items = [];
  for (const [index, raw] of plan.assets.entries()) {
    const item = { ...raw };
    // The film's aspect goes to text-to-image and text-to-video items only: a model that starts from
    // an input picture keeps that picture's shape and rejects the field.
    if (item.aspectRatio == null && defaults.aspectRatio != null && ["image", "video"].includes(item.kind) && !asList(item.image).length) {
      item.aspectRatio = defaults.aspectRatio;
    }
    const label = `assets[${index}]${item.id ? ` "${item.id}"` : ""}`;
    if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(item.id || "")) errors.push(`${label}: id must be lowercase letters, digits and dashes`);
    else if (ids.has(item.id)) errors.push(`${label}: duplicate id`);
    ids.add(item.id);
    if (!KINDS[item.kind]) errors.push(`${label}: kind must be one of ${Object.keys(KINDS).join(", ")}`);
    if (typeof item.model !== "string" || item.model.split("/").length < 3) {
      errors.push(`${label}: model must be a PopNow model id such as minimax/h3/text-to-video`);
    }
    for (const key of Object.keys(item)) if (!ITEM_FIELDS.has(key)) warnings.push(`${label}: unknown field "${key}" is ignored (use "set" for extra model fields)`);
    const hasMedia = MEDIA_FIELDS.some(([f]) => asList(item[f]).length);
    if (item.kind === "voice") {
      if (!item.text || !String(item.text).trim()) errors.push(`${label}: voice needs "text" (the words to speak)`);
      if (item.text && String(item.text).length > 5000) errors.push(`${label}: text is over 5000 characters; split it into lines`);
      if (item.lang && !LANGS.includes(item.lang)) warnings.push(`${label}: lang "${item.lang}" is outside the 12 tested languages (${LANGS.join(", ")})`);
    } else if (!item.prompt && !hasMedia) {
      errors.push(`${label}: needs a "prompt"`);
    }
    if (item.kind === "video") {
      const d = item.duration ?? 5;
      if (!Number.isInteger(d) || d < 3 || d > 15) errors.push(`${label}: duration must be a whole number of seconds, 3 to 15`);
      else if (d > 6) warnings.push(`${label}: ${d} s of B-roll; 3 to 5 s is usually enough and costs less`);
      if (/^minimax\/h3\/text-to-video$/.test(item.model || "") && d < 5) errors.push(`${label}: minimax/h3/text-to-video starts at 5 s`);
    }
    if (item.people != null && !["none", "generic", "real"].includes(item.people)) errors.push(`${label}: people must be "none", "generic" or "real"`);
    const reasons = needsConsent(item);
    if (reasons.length) {
      const c = item.consent || {};
      if (c.confirmed !== true || !String(c.by || "").trim()) {
        errors.push(`${label}: needs recorded consent because of ${reasons.join("; ")}. Add "consent": {"confirmed": true, "by": "<who holds the rights>", "note": "<how it was given>"} only after the user confirms it`);
      }
    }
    for (const [field] of MEDIA_FIELDS) {
      for (const value of asList(item[field])) {
        if (typeof value !== "string" || !value) { errors.push(`${label}: ${field} must be a string or a list of strings`); continue; }
        if (value.startsWith("@")) continue;
        if (/^(https:\/\/|popnow:\/\/)/.test(value)) continue;
        if (/^http:\/\//.test(value)) { errors.push(`${label}: ${field} must be https, popnow:// or a local file`); continue; }
        const full = resolve(project, value);
        if (!existsSync(full)) (requireInputs ? errors : warnings).push(`${label}: ${field} file not found: ${value}`);
      }
    }
    if (item.out != null && (typeof item.out !== "string" || isAbsolute(item.out) || item.out.split(/[\\/]/).includes(".."))) {
      errors.push(`${label}: out must be a path inside the project, such as assets/images/hero.png`);
    }
    items.push(item);
  }
  // Dependencies: "@id" in a media field means "the first file that item produced".
  const byId = new Map(items.map((it) => [it.id, it]));
  for (const item of items) {
    item.deps = [];
    for (const [field] of MEDIA_FIELDS) {
      for (const value of asList(item[field])) {
        if (typeof value === "string" && value.startsWith("@")) {
          const ref = value.slice(1);
          if (!byId.has(ref)) errors.push(`"${item.id}": ${field} refers to unknown item @${ref}`);
          else if (ref === item.id) errors.push(`"${item.id}": refers to itself`);
          else item.deps.push(ref);
        }
      }
    }
  }
  if (errors.length) throw new PlanError(errors.join("\n"));
  return { items: topoSort(items), warnings };
}

function topoSort(items) {
  const byId = new Map(items.map((it) => [it.id, it]));
  const out = [];
  const state = new Map();
  const visit = (item, trail) => {
    if (state.get(item.id) === "done") return;
    if (state.get(item.id) === "visiting") throw new PlanError(`dependency cycle: ${[...trail, item.id].join(" -> ")}`);
    state.set(item.id, "visiting");
    for (const dep of item.deps) visit(byId.get(dep), [...trail, item.id]);
    state.set(item.id, "done");
    out.push(item);
  };
  for (const item of items) visit(item, []);
  return out;
}

// ---------------------------------------------------------------------------
// Requests, estimates and the helper
// ---------------------------------------------------------------------------

function withKindDefaults(item) {
  const set = { ...(item.set || {}) };
  // Music beds are instrumental unless the plan gives lyrics or says otherwise.
  if (item.kind === "bgm" && item.model.startsWith("suno/") && set.instrumental == null && !item.lyrics) set.instrumental = true;
  // B-roll is placed muted; skip generated audio on models that would add it.
  if (item.kind === "video" && item.model.startsWith("bytedance/seedance") && set.generate_audio == null) set.generate_audio = false;
  return set;
}

function requestFlags(item, resolveMedia) {
  const flags = ["--model", item.model];
  for (const [field, flag] of FLAG_FIELDS) if (item[field] != null && item[field] !== "") flags.push(flag, String(item[field]));
  for (const [field, flag] of MEDIA_FIELDS) for (const value of asList(item[field])) flags.push(flag, resolveMedia(value));
  for (const [key, value] of Object.entries(withKindDefaults(item))) {
    flags.push("--set", `${key}=${typeof value === "string" ? value : JSON.stringify(value)}`);
  }
  return flags;
}

function speechSeconds(text) {
  const s = String(text || "");
  const cjk = (s.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g) || []).length;
  const words = s.replace(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, words / 2.6 + cjk / 4.2 + 0.5);
}

function estimateCredits(item) {
  const hint = PRICE_HINTS[item.model];
  if (!hint) return null;
  let per = hint.base;
  for (const [field, table] of Object.entries(hint.by || {})) {
    const value = item[field] ?? (item.set || {})[field];
    if (value != null && table[value] != null) per = table[value];
  }
  let units = 1;
  if (hint.unit === "second") units = item.duration ?? hint.seconds ?? 5;
  if (hint.unit === "speech-second") units = speechSeconds(item.text);
  if (hint.unit === "1k-chars") units = Math.max(1, String(item.text || "").length) / 1000;
  const outputs = Number((item.set || {}).num_outputs) || 1;
  return Math.ceil(per * units * outputs);
}

function requestHash(item) {
  const body = { model: item.model, flags: requestFlags(item, (v) => v) };
  return createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
}

function makeHelper(opts) {
  const script = resolve(opts.popnow || join(HERE, "popnow.py"));
  const python = opts.python || "python3";
  return function run(args, { allowCodes = [0] } = {}) {
    if (!existsSync(script)) {
      throw new StopRun(`popnow.py not found at ${script}. It ships in this skill's scripts/ folder; pass --popnow <path> if it lives elsewhere.`, EXIT.usage);
    }
    const res = spawnSync(python, [script, ...args], {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"], env: process.env,
    });
    if (res.error) throw new StopRun(`could not run ${python}: ${res.error.message}`, EXIT.api);
    const code = res.status ?? 1;
    if (!allowCodes.includes(code)) {
      const err = new StopRun((res.stderr || res.stdout || `popnow.py exited with ${code}`).trim(), code);
      err.stdout = res.stdout;
      throw err;
    }
    return { code, stdout: res.stdout, stderr: res.stderr };
  };
}

function parseJson(text, what) {
  const start = text.indexOf("{");
  if (start < 0) throw new StopRun(`${what}: no JSON in helper output`, EXIT.api);
  try {
    return JSON.parse(text.slice(start));
  } catch (err) {
    throw new StopRun(`${what}: could not parse helper output (${err.message})`, EXIT.api);
  }
}

// ---------------------------------------------------------------------------
// The HyperFrames media-use ledger (.media/manifest.jsonl), written the way media-use writes it:
// append-only JSON lines, the last record for a path wins, ids are <type>_NNN and never reused,
// writers take .media/.lock (O_EXCL, a lock older than 15 s is stale).
// ---------------------------------------------------------------------------

const mediaDir = (project) => join(project, ".media");
const manifestPath = (project) => join(mediaDir(project), "manifest.jsonl");

function readManifest(project) {
  const p = manifestPath(project);
  if (!existsSync(p)) return [];
  const out = [];
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* media-use skips malformed lines; so do we, and we never rewrite them */ }
  }
  return out;
}

function currentRecords(records) {
  const last = new Map(records.map((r, i) => [r.path, i]));
  return records.filter((r, i) => !r.path || last.get(r.path) === i);
}

function nextFreeId(project, type, records, reserved = new Set()) {
  const re = new RegExp(`^${type}_(\\d+)`);
  let max = 0;
  for (const r of records) {
    const m = r.type === type && String(r.id || "").match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const dir = join(mediaDir(project), MEDIA_TYPE_DIRS[type] || type);
  for (const f of existsSync(dir) ? readdirSync(dir) : []) {
    const m = f.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  for (const id of reserved) {
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${type}_${String(max + 1).padStart(3, "0")}`;
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withMediaLock(project, fn) {
  mkdirSync(mediaDir(project), { recursive: true });
  const lock = join(mediaDir(project), ".lock");
  const start = Date.now();
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 15000) { rmSync(lock, { force: true }); continue; }
      } catch { continue; }
      if (Date.now() - start > 20000) throw new Error("timed out waiting for .media/.lock");
      sleepMs(25);
    }
  }
  try { return fn(); } finally { rmSync(lock, { force: true }); }
}

function pad(value, width) {
  return String(value ?? "").padEnd(width);
}

function indexContent(records) {
  const count = records.length;
  const header = `# .media · ${count} asset${count === 1 ? "" : "s"}\n`;
  if (!count) return header;
  const dur = (r) => (r.duration == null ? "—" : `${r.duration}s`);
  const dims = (r) => (r.width && r.height ? `${r.width}×${r.height}` : r.type === "icon" && r.transparent ? "svg" : "—");
  const w = { id: 4, type: 5, dur: 4, dims: 5, path: 5 };
  for (const r of records) {
    w.id = Math.max(w.id, String(r.id ?? "").length);
    w.type = Math.max(w.type, String(r.type ?? "").length);
    w.dur = Math.max(w.dur, dur(r).length);
    w.dims = Math.max(w.dims, dims(r).length);
    w.path = Math.max(w.path, String(r.path ?? "").length);
  }
  const lines = [header, pad("id", w.id + 2) + pad("type", w.type + 2) + pad("dur", w.dur + 2) + pad("dims", w.dims + 2) + pad("path", w.path + 2) + "description"];
  for (const r of records) {
    lines.push(pad(r.id, w.id + 2) + pad(r.type, w.type + 2) + pad(dur(r), w.dur + 2) + pad(dims(r), w.dims + 2) + pad(r.path, w.path + 2) + (r.description ?? ""));
  }
  return lines.join("\n") + "\n";
}

function appendManifestRecord(project, fields) {
  return withMediaLock(project, () => {
    const records = readManifest(project);
    const record = { id: nextFreeId(project, fields.type, records), ...fields };
    const p = manifestPath(project);
    // Keep the file's last line intact even if a previous writer left it without a newline.
    const raw = existsSync(p) ? readFileSync(p, "utf8") : "";
    const prefix = raw && !raw.endsWith("\n") ? "\n" : "";
    writeFileSync(p, prefix + JSON.stringify(record) + "\n", { flag: "a" });
    writeFileSync(join(mediaDir(project), "index.md"), indexContent(currentRecords([...records, record])));
    return record;
  });
}

function recordWithCli(project, fields) {
  const args = ["--yes", "hyperframes", "media-use", "resolve", "--type", fields.type, "--from", fields.path,
    "--source", "generated", "--intent", fields.provenance.prompt || fields.description, "--project", project, "--json"];
  const res = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, { encoding: "utf8", cwd: project });
  if (res.status !== 0) throw new Error((res.stderr || res.stdout || "media-use resolve failed").trim().split("\n").pop());
  try {
    const out = JSON.parse(res.stdout.trim().split("\n").pop());
    return { id: out.id || out.record?.id || null, path: fields.path, via: "cli" };
  } catch {
    return { id: null, path: fields.path, via: "cli" };
  }
}

// ---------------------------------------------------------------------------
// Provenance sidecar (ours): assets/popnow-provenance.json
// ---------------------------------------------------------------------------

function readProvenance(project) {
  const p = join(project, PROVENANCE_FILE);
  if (!existsSync(p)) return { version: 1, tool: TOOL, entries: [] };
  try {
    const data = JSON.parse(readFileSync(p, "utf8"));
    if (!Array.isArray(data.entries)) data.entries = [];
    return data;
  } catch (err) {
    throw new StopRun(`${PROVENANCE_FILE} is not valid JSON (${err.message}); fix or move it before generating`, EXIT.usage);
  }
}

function writeProvenance(project, data) {
  const p = join(project, PROVENANCE_FILE);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${randomBytes(3).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, p);
}

function licenseNote(item, inputs) {
  let note = `PopNow output (${item.model}). Under ${TERMS_URL} you own it to the extent the law allows and may use it commercially; you remain responsible for the prompt and any inputs.`;
  if (inputs.length) note += ` Made from inputs supplied for this project: ${inputs.join(", ")}.`;
  if (item.license) note += ` ${item.license}`;
  return note;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function toPosix(p) {
  return p.split(sep).join("/");
}

function destinationFor(item, ext, index, taken) {
  const base = item.out ? item.out.replace(/\.[a-z0-9]{2,5}$/i, "") : `${KINDS[item.kind].dir}/${item.id}`;
  const stem = index === 0 ? base : `${base}-take${index + 1}`;
  let candidate = `${stem}${ext}`;
  let n = 2;
  // Never overwrite: an existing file may be the user's, or an earlier take someone is comparing against.
  while (taken.has(candidate) || existsSync(candidate.startsWith("/") ? candidate : join(taken.project, candidate))) {
    candidate = `${stem}-${n}${ext}`;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}

function moveFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch {
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

function probe(file) {
  const res = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  if (res.status !== 0 || !res.stdout) return {};
  try {
    const data = JSON.parse(res.stdout);
    const out = {};
    const video = (data.streams || []).find((s) => s.width && s.height);
    if (video) { out.width = video.width; out.height = video.height; }
    const d = Number(data.format?.duration);
    if (Number.isFinite(d) && d > 0.05 && !/\.(png|jpe?g|webp|gif)$/i.test(file)) out.duration = Math.round(d * 10) / 10;
    return out;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function table(rows, headers) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)));
  const line = (cells) => cells.map((c, i) => pad(c, widths[i])).join("  ").trimEnd();
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

function short(text, n = 60) {
  const s = String(text ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function describeFor(item) {
  return short(item.description || item.use || item.prompt || item.text, 120);
}

function manifestFields(item, filePath, meta, task) {
  return {
    type: KINDS[item.kind].type,
    path: filePath,
    source: "generated",
    description: describeFor(item),
    ...(meta.duration != null && { duration: meta.duration }),
    ...(meta.width != null && { width: meta.width }),
    ...(meta.height != null && { height: meta.height }),
    provenance: {
      provider: "popnow",
      prompt: item.prompt || item.text || "",
      model: item.model,
      ...(task?.taskId && { taskId: task.taskId }),
      ...(task?.credits != null && { credits: task.credits }),
      plan_item: item.id,
      license: "see assets/popnow-provenance.json",
    },
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function dryRun(ctx) {
  const { items, project, opts } = ctx;
  const records = readManifest(project);
  const reserved = new Set();
  const rows = [];
  const manifestPreview = [];
  const provenancePreview = [];
  let total = 0;
  let unknown = 0;
  for (const item of items) {
    const est = estimateCredits(item);
    if (est == null) unknown += 1; else total += est;
    const ext = guessExt(item);
    const file = item.out && extname(item.out) ? item.out : `${item.out ? item.out.replace(/\.[a-z0-9]{2,5}$/i, "") : `${KINDS[item.kind].dir}/${item.id}`}${ext}`;
    const fields = manifestFields(item, file, {}, null);
    const id = nextFreeId(project, fields.type, records, reserved);
    reserved.add(id);
    manifestPreview.push({ id, ...fields });
    provenancePreview.push({
      item: item.id, kind: item.kind, state: "planned", file, mediaId: id, model: item.model,
      ...(item.prompt && { prompt: item.prompt }), ...(item.text && { text: item.text }), ...(item.lang && { lang: item.lang }),
      ...(item.use && { use: item.use }), estimatedCredits: est, requestHash: requestHash(item),
      ...(item.deps.length && { dependsOn: item.deps }),
      ...(item.consent && { consent: item.consent }),
      license: licenseNote(item, MEDIA_FIELDS.flatMap(([f]) => asList(item[f])).filter((v) => !String(v).startsWith("@") && !/^(https|popnow):\/\//.test(v))),
    });
    rows.push([item.id, item.kind, item.model, est == null ? "quote" : `~${est}`, file]);
  }
  const preview = {
    dryRun: true,
    project: toPosix(relative(dirname(ctx.planPath), project) || "."),
    estimatedCredits: total,
    unpricedItems: unknown,
    manifestRecords: manifestPreview,
    provenanceEntries: provenancePreview,
  };
  if (opts.previewOut) writeFileSync(resolve(opts.previewOut), JSON.stringify(preview, null, 2) + "\n");
  if (opts.json) {
    console.log(JSON.stringify(preview, null, 2));
  } else {
    console.log(`Dry run: nothing is sent, generated or written to the project.\n`);
    console.log(table(rows, ["item", "kind", "model", "credits", "lands at"]));
    console.log(`\nEstimated total: ~${total} credits${unknown ? ` plus ${unknown} item(s) without a typical price` : ""} (typical prices; --quote gives exact numbers).`);
    console.log(`\nRecords that would be appended to .media/manifest.jsonl:`);
    for (const r of manifestPreview) console.log(JSON.stringify(r));
    console.log(`\nNext: node scripts/popnow-assets.mjs ${toPosix(relative(process.cwd(), ctx.planPath))} --quote`);
  }
  return EXIT.ok;
}

function guessExt(item) {
  if (item.out && extname(item.out)) return extname(item.out);
  if (item.kind === "image") return item.outputFormat === "jpeg" ? ".jpg" : ".png";
  if (item.kind === "video") return ".mp4";
  if (item.kind === "voice") return ".wav";
  return ".mp3";
}

function doneEntry(provenance, item, project) {
  const hash = requestHash(item);
  return provenance.entries.find((e) => e.item === item.id && e.state === "done" && e.requestHash === hash
    && (e.files || []).length && e.files.every((f) => existsSync(join(project, f))));
}

function selectItems(ctx) {
  const { items, opts, project } = ctx;
  const provenance = readProvenance(project);
  const only = opts.only ? new Set(opts.only) : null;
  const regenerate = new Set(opts.regenerate || []);
  for (const id of [...(only || []), ...regenerate]) {
    if (!items.some((it) => it.id === id)) throw new StopRun(`unknown item id: ${id}`, EXIT.usage);
  }
  const selected = [];
  const skipped = [];
  for (const item of items) {
    if (only && !only.has(item.id)) continue;
    const done = doneEntry(provenance, item, project);
    if (done && !regenerate.has(item.id)) { skipped.push({ item, entry: done }); continue; }
    // A task that was still running when we stopped waiting is collected, not paid for again.
    const last = [...provenance.entries].reverse().find((e) => e.item === item.id);
    if (last && last.state === "running" && last.taskId && last.requestHash === requestHash(item)) item.resumeTaskId = last.taskId;
    selected.push(item);
  }
  return { selected, skipped, provenance };
}

function firstFileOf(id, provenance, produced) {
  if (produced.has(id)) return produced.get(id);
  const entry = [...provenance.entries].reverse().find((e) => e.item === id && e.state === "done" && (e.files || []).length);
  return entry ? entry.files[0] : null;
}

function mediaResolver(project, provenance, produced) {
  return (value) => {
    if (!value.startsWith("@")) return /^(https|popnow):\/\//.test(value) ? value : resolve(project, value);
    const file = firstFileOf(value.slice(1), provenance, produced);
    if (!file) throw new StopRun(`@${value.slice(1)} has no file yet`, EXIT.usage);
    return resolve(project, file);
  };
}

function quoteAll(ctx, helper) {
  const { project } = ctx;
  const { selected, skipped, provenance } = selectItems(ctx);
  const produced = new Map();
  const resolveMedia = mediaResolver(project, provenance, produced);
  const quotes = [];
  let balance = null;
  for (const item of selected) {
    if (item.resumeTaskId) {
      quotes.push({ item, credits: 0, estimated: false, resume: true });
      continue;
    }
    const pending = item.deps.filter((d) => selected.some((s) => s.id === d));
    if (pending.length) {
      const est = estimateCredits(item);
      if (est == null) {
        throw new StopRun(`"${item.id}" depends on ${pending.map((d) => `@${d}`).join(", ")} and ${item.model} has no typical price; generate the dependency first (--only ${pending.join(",")}), then quote this item`, EXIT.usage);
      }
      quotes.push({ item, credits: est, estimated: true });
      continue;
    }
    const res = helper(["quote", "--json", ...requestFlags(item, resolveMedia)]);
    const data = parseJson(res.stdout, `quote ${item.id}`);
    const credits = data.quote?.maxCredits;
    if (!Number.isInteger(credits)) throw new StopRun(`quote ${item.id}: no maxCredits in the answer`, EXIT.api);
    quotes.push({ item, credits, estimated: false, expected: data.quote?.expectedCredits });
    if (data.balance?.availableCredits != null) balance = data.balance.availableCredits;
  }
  const total = quotes.reduce((sum, q) => sum + q.credits, 0);
  return { quotes, total, balance, skipped, provenance };
}

function printQuote(q) {
  const rows = q.quotes.map(({ item, credits, estimated, resume }) => [item.id, item.kind, item.model,
    resume ? `0 (collect ${item.resumeTaskId})` : estimated ? `~${credits} (est.)` : String(credits)]);
  console.log(table(rows, ["item", "kind", "model", "credits (max)"]));
  for (const { item } of q.skipped) console.log(`(skipped ${item.id}: already generated with the same request; --regenerate ${item.id} for a new take)`);
  console.log(`\nTotal: up to ${q.total} credits${q.balance != null ? ` · balance ${q.balance}` : ""}`);
  if (q.quotes.some((x) => x.estimated)) console.log("Items marked est. depend on another item's output; each is quoted for real just before it runs and the run stops rather than go over the confirmed total.");
  if (q.balance != null && q.balance < q.total) console.log("Not enough credits for the whole plan: top up at https://popnow.ai/pricing or trim the plan.");
}

async function confirmInteractively(total) {
  if (!promptAllowed || !(process.stdin.isTTY && process.stdout.isTTY)) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`Spend up to ${total} credits on these assets? Type ${total} to confirm: `)).trim();
    return answer === String(total);
  } finally {
    rl.close();
  }
}

async function generate(ctx, helper) {
  const { project, opts } = ctx;
  const q = quoteAll(ctx, helper);
  printQuote(q);
  if (!q.quotes.length) { console.log("\nNothing to generate."); return EXIT.ok; }
  let budget = opts.confirmCredits;
  if (budget == null) {
    if (await confirmInteractively(q.total)) budget = q.total;
    else {
      console.log(`\nNot started. Tell the user the plan costs up to ${q.total} credits; after a clear yes run again with --confirm-credits ${q.total}.`);
      return EXIT.confirm;
    }
  }
  if (q.total > budget) {
    console.log(`\nNot started: the plan costs up to ${q.total} credits, more than the ${budget} confirmed. Ask again with the new total.`);
    return EXIT.confirm;
  }

  const provenance = q.provenance;
  const produced = new Map();
  const resolveMedia = mediaResolver(project, provenance, produced);
  const failed = new Set();
  const taken = Object.assign(new Set(), { project });
  const results = [];
  let spent = 0;
  let exitCode = EXIT.ok;
  const tmpRoot = mkdtempSync(join(tmpdir(), "popnow-assets-"));
  try {
    for (const quote of q.quotes) {
      const { item } = quote;
      if (item.deps.some((d) => failed.has(d))) {
        results.push({ item: item.id, state: "skipped", reason: "a dependency failed" });
        failed.add(item.id);
        continue;
      }
      const flags = quote.resume ? [] : requestFlags(item, resolveMedia);
      let maxCredits = quote.credits;
      if (quote.estimated) {
        const fresh = parseJson(helper(["quote", "--json", ...flags]).stdout, `quote ${item.id}`);
        maxCredits = fresh.quote?.maxCredits;
        if (!Number.isInteger(maxCredits)) throw new StopRun(`quote ${item.id}: no maxCredits`, EXIT.api);
      }
      if (spent + maxCredits > budget) {
        console.log(`\nStopped before "${item.id}": it costs up to ${maxCredits} credits and ${spent} are already spent, which would pass the ${budget} confirmed. Nothing else was started.`);
        exitCode = EXIT.confirm;
        break;
      }
      const priorTakes = provenance.entries.filter((e) => e.item === item.id).length;
      const idemKey = `hfa-${createHash("sha256").update(`${project}|${item.id}|${requestHash(item)}|${priorTakes}`).digest("hex").slice(0, 32)}`;
      let res;
      try {
        if (quote.resume) {
          // Paid for in an earlier run that stopped waiting; this only collects it.
          console.log(`\n[${item.id}] collecting running task ${item.resumeTaskId}…`);
          res = helper(["wait", item.resumeTaskId, "--json", "--timeout", String(opts.timeout || 1200)], { allowCodes: [0, 4, 5] });
        } else {
          console.log(`\n[${item.id}] generating with ${item.model} (up to ${maxCredits} credits)…`);
          res = helper(["create", "--json", "--wait", "--timeout", String(opts.timeout || 1200), "--idempotency-key", idemKey,
            "--confirm-credits", String(maxCredits), ...flags], { allowCodes: [0, 4, 5] });
        }
      } catch (err) {
        if (err.code === EXIT.confirm) {
          console.log(`[${item.id}] price went up since the quote; not started, nothing charged.\n${err.message}`);
          exitCode = EXIT.confirm;
          break;
        }
        throw err;
      }
      if (res.code === 4) {
        const taskId = item.resumeTaskId || (res.stdout.match(/wait\s+`?([A-Za-z0-9_-]+)/) || [])[1] || null;
        // Its credits are held and will be charged, so they count against this run's total.
        spent += maxCredits;
        if (!item.resumeTaskId) {
          provenance.entries.push({ item: item.id, kind: item.kind, state: "running", model: item.model, taskId, quotedCredits: maxCredits, requestHash: requestHash(item), startedAt: new Date().toISOString() });
          writeProvenance(project, provenance);
        }
        console.log(`[${item.id}] still running (${taskId}). Run the same command again later to collect it; it will not be paid for twice.`);
        results.push({ item: item.id, state: "running", taskId });
        exitCode = Math.max(exitCode, EXIT.timeout);
        failed.add(item.id);
        continue;
      }
      const task = parseJson(res.stdout, `create ${item.id}`);
      if (res.code === 5 || task.state !== "succeeded") {
        console.log(`[${item.id}] ${task.state || "failed"}: ${task.errorCode || ""} ${task.errorMessage || ""}`.trim() + " (refunded; not retried automatically)");
        provenance.entries.push({ item: item.id, kind: item.kind, state: "failed", model: item.model, taskId: task.taskId, error: task.errorCode || task.state, requestHash: requestHash(item), at: new Date().toISOString() });
        writeProvenance(project, provenance);
        results.push({ item: item.id, state: "failed", taskId: task.taskId, error: task.errorCode || task.state });
        failed.add(item.id);
        exitCode = exitCode === EXIT.ok ? EXIT.failed : exitCode;
        continue;
      }
      const credits = Number.isFinite(task.credits) ? task.credits : maxCredits;
      // A collected task was confirmed and counted in the run that started it.
      if (!quote.resume) spent += credits;
      const tmp = join(tmpRoot, task.taskId || item.id);
      const saved = parseJson(helper(["download", task.taskId, "--out", tmp, "--json"]).stdout, `download ${item.id}`).saved || [];
      const mediaFiles = saved.filter((f) => !/\.txt$/i.test(f));
      if (!mediaFiles.length) throw new StopRun(`[${item.id}] the task succeeded but no file could be downloaded; run python3 scripts/popnow.py download ${task.taskId} --out ${KINDS[item.kind].dir}`, EXIT.api);
      const files = [];
      const media = [];
      for (const [index, file] of mediaFiles.entries()) {
        const rel = destinationFor(item, extname(file).toLowerCase() || guessExt(item), index, taken);
        moveFile(file, join(project, rel));
        files.push(rel);
        const meta = probe(join(project, rel));
        const fields = manifestFields(item, rel, meta, { taskId: task.taskId, credits: index === 0 ? credits : 0 });
        let recorded = null;
        try {
          if (opts.ledger === "media-use") recorded = appendManifestRecord(project, fields);
          else if (opts.ledger === "cli") recorded = recordWithCli(project, fields);
        } catch (err) {
          console.log(`[${item.id}] warning: ${rel} saved but not recorded in .media (${err.message})`);
        }
        media.push({ file: rel, mediaId: recorded?.id || null, ...meta });
      }
      produced.set(item.id, files[0]);
      const inputs = MEDIA_FIELDS.flatMap(([f]) => asList(item[f])).map((v) => (v.startsWith("@") ? produced.get(v.slice(1)) || v : v));
      provenance.entries.push({
        item: item.id, kind: item.kind, state: "done", files, media, model: item.model,
        ...(item.prompt && { prompt: item.prompt }), ...(item.text && { text: item.text }), ...(item.lang && { lang: item.lang }),
        ...(item.use && { use: item.use }),
        params: Object.fromEntries(Object.entries({ duration: item.duration, resolution: item.resolution, aspectRatio: item.aspectRatio, voice: item.voice, set: withKindDefaults(item) }).filter(([, v]) => v != null && !(typeof v === "object" && !Object.keys(v).length))),
        ...(inputs.length && { inputs }),
        taskId: task.taskId, credits, quotedCredits: maxCredits, requestHash: requestHash(item),
        generatedAt: new Date().toISOString(),
        ...(item.consent && { consent: item.consent }),
        license: licenseNote(item, inputs.filter((v) => !/^(https|popnow):\/\//.test(v))),
      });
      writeProvenance(project, provenance);
      results.push({ item: item.id, state: "done", files, credits });
      console.log(`[${item.id}] saved ${files.join(", ")} · ${credits} credits`);
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
  const summary = { spent, confirmed: budget, results };
  if (opts.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`\nDone: ${results.filter((r) => r.state === "done").length} generated, ${spent} credits charged (confirmed up to ${budget}).`);
    console.log(`Ledger: ${opts.ledger === "none" ? "not recorded in .media (--ledger none)" : ".media/manifest.jsonl and .media/index.md"}; provenance in ${PROVENANCE_FILE}.`);
  }
  return exitCode;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { ledger: "media-use" };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new StopRun(`${a} needs a value`, EXIT.usage);
      return argv[++i];
    };
    switch (a) {
      case "--dry-run": opts.dryRun = true; break;
      case "--quote": opts.quote = true; break;
      case "--confirm-credits": {
        const n = Number(next());
        if (!Number.isInteger(n) || n < 0) throw new StopRun("--confirm-credits takes a whole number of credits", EXIT.usage);
        opts.confirmCredits = n;
        break;
      }
      case "--project": opts.project = next(); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--regenerate": opts.regenerate = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--ledger": opts.ledger = next(); break;
      case "--preview-out": opts.previewOut = next(); break;
      case "--popnow": opts.popnow = next(); break;
      case "--python": opts.python = next(); break;
      case "--timeout": opts.timeout = Number(next()); break;
      case "--json": opts.json = true; break;
      case "--self-test": opts.selfTest = true; break;
      case "-h": case "--help": opts.help = true; break;
      default:
        if (a.startsWith("--")) throw new StopRun(`unknown option ${a}`, EXIT.usage);
        positional.push(a);
    }
  }
  if (!["media-use", "cli", "none"].includes(opts.ledger)) throw new StopRun("--ledger is media-use, cli or none", EXIT.usage);
  return { opts, positional };
}

function usage() {
  const head = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 30);
  return head.filter((l) => l.startsWith("//")).map((l) => l.replace(/^\/\/ ?/, "")).join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  try {
    const { opts, positional } = parseArgs(argv);
    if (opts.help) { console.log(usage()); return EXIT.ok; }
    if (opts.selfTest) return await selfTest();
    if (positional.length !== 1) { console.error(usage()); return EXIT.usage; }
    const { plan, project, planPath } = loadPlan(positional[0], opts.project);
    const { items, warnings } = validatePlan(plan, project, { requireInputs: !opts.dryRun });
    for (const w of warnings) console.error(`warning: ${w}`);
    if (!existsSync(join(project, "index.html")) && !existsSync(join(project, "hyperframes.json"))) {
      console.error(`warning: ${project} has no index.html; is this the HyperFrames project folder? (--project DIR)`);
    }
    const ctx = { plan, items, project, planPath, opts };
    if (opts.dryRun) return dryRun(ctx);
    if (!process.env.POPNOW_API_KEY && !opts.popnow) {
      console.error(`POPNOW_API_KEY is not set. Create a key at ${KEYS_URL} and export it, or keep the composition's labelled placeholders (no credits needed).`);
      return EXIT.usage;
    }
    const helper = makeHelper(opts);
    if (opts.quote) {
      const q = quoteAll(ctx, helper);
      if (opts.json) console.log(JSON.stringify({ total: q.total, balance: q.balance, items: q.quotes.map((x) => ({ id: x.item.id, model: x.item.model, credits: x.credits, estimated: x.estimated })) }, null, 2));
      else {
        printQuote(q);
        console.log(`\nTell the user the total. After a clear yes: node scripts/popnow-assets.mjs ${toPosix(relative(process.cwd(), planPath))} --confirm-credits ${q.total}`);
      }
      return EXIT.ok;
    }
    return await generate(ctx, helper);
  } catch (err) {
    if (err instanceof PlanError) { console.error(`Plan problems:\n${err.message}`); return EXIT.usage; }
    if (err instanceof StopRun) { console.error(`Error: ${err.message}`); return err.code ?? EXIT.api; }
    console.error(`Error: ${err.stack || err.message}`);
    return EXIT.api;
  }
}

// ---------------------------------------------------------------------------
// Self-test: a fake popnow.py stands in for the API, so nothing is sent or charged.
// ---------------------------------------------------------------------------

const FAKE_HELPER = String.raw`
import json, os, sys, struct, wave, zlib
args = sys.argv[1:]
cmd = args[0]
state_file = os.environ["FAKE_STATE"]
state = json.load(open(state_file)) if os.path.exists(state_file) else {"creates": [], "quotes": 0}
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default
prices = json.loads(os.environ.get("FAKE_PRICES", "{}"))
model = opt("--model", "")
price = prices.get(model, 10)
def save():
    json.dump(state, open(state_file, "w"))
if cmd == "quote":
    state["quotes"] += 1; save()
    print(json.dumps({"quote": {"model": model, "maxCredits": price, "expectedCredits": price, "quoteId": "q_test"}, "balance": {"availableCredits": 9000}}))
elif cmd == "create":
    if int(opt("--confirm-credits", "-1")) < price:
        sys.stderr.write("Not started, nothing was charged: this request costs up to %d" % price); sys.exit(3)
    state["creates"].append(model); save()
    task_id = "job_test_%d" % len(state["creates"])
    if model in os.environ.get("FAKE_FAIL", "").split(","):
        print(json.dumps({"taskId": task_id, "model": model, "state": "failed", "errorCode": "content_rejected"})); sys.exit(5)
    if model in os.environ.get("FAKE_SLOW", "").split(","):
        print("Still running after 1200s. Resume with: popnow.py wait %s" % task_id); sys.exit(4)
    print(json.dumps({"taskId": task_id, "model": model, "state": "succeeded", "credits": price, "settled": True}))
elif cmd == "wait":
    state["waits"] = state.get("waits", 0) + 1; save()
    m = state["creates"][int(args[1].rsplit("_", 1)[1]) - 1]
    print(json.dumps({"taskId": args[1], "model": m, "state": "succeeded", "credits": prices.get(m, 10), "settled": True}))
elif cmd == "download":
    out = opt("--out"); os.makedirs(out, exist_ok=True)
    m = [c for c in state["creates"]][int(args[1].rsplit("_", 1)[1]) - 1]
    saved = []
    if "image" in m or m.endswith("/edit"):
        p = os.path.join(out, args[1] + "-0.png")
        raw = b"\x00\xff\x80\x40"
        png = b"\x89PNG\r\n\x1a\n"
        def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        png += chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
        open(p, "wb").write(png); saved.append(p)
    elif "video" in m:
        p = os.path.join(out, args[1] + "-0.mp4"); open(p, "wb").write(b"not a real video"); saved.append(p)
    else:
        takes = 2 if m.startswith("suno/") else 1
        for i in range(takes):
            p = os.path.join(out, "%s-%d.wav" % (args[1], i))
            w = wave.open(p, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000); w.writeframes(b"\x00\x00" * 8000); w.close()
            saved.append(p)
    print(json.dumps({"saved": saved}))
`;

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  promptAllowed = false;
  const root = mkdtempSync(join(tmpdir(), "popnow-assets-test-"));
  const log = [];
  const capture = async (fn) => {
    const orig = { log: console.log, error: console.error };
    let out = "";
    console.log = (...a) => { out += a.join(" ") + "\n"; };
    console.error = (...a) => { out += a.join(" ") + "\n"; };
    try { return { code: await fn(), out }; } finally { Object.assign(console, orig); }
  };
  const check = async (name, fn) => {
    try { await fn(); log.push(`ok   ${name}`); } catch (err) { log.push(`FAIL ${name}\n     ${err.message}`); }
  };
  try {
    const project = join(root, "film");
    mkdirSync(join(project, "assets/images"), { recursive: true });
    writeFileSync(join(project, "index.html"), '<div data-composition-id="main"></div>\n');
    // A user's own file where the hero would land, and an existing media-use ledger with a malformed line.
    writeFileSync(join(project, "assets/images/hero.png"), "users own picture");
    mkdirSync(join(project, ".media/images"), { recursive: true });
    const existing = '{"id":"image_001","type":"image","path":".media/images/image_001.jpg","source":"search","description":"gradient","provenance":{"provider":"stock.search","prompt":"gradient"}}\nnot json at all\n';
    writeFileSync(join(project, ".media/manifest.jsonl"), existing);
    writeFileSync(join(project, ".media/images/image_002.jpg"), "reserved by a running resolve");
    const helperPath = join(root, "popnow.py");
    writeFileSync(helperPath, FAKE_HELPER);
    process.env.FAKE_STATE = join(root, "state.json");
    process.env.FAKE_PRICES = JSON.stringify({
      "google/nano-banana-2.1/text-to-image": 48, "minimax/h3/image-to-video": 185, "suno/v6/text-to-audio": 72,
      "google/gemini-3.8-flash-tts/text-to-speech": 9, "minimax/h3/text-to-video": 185,
    });
    const plan = {
      version: 1, project: "film", defaults: { aspectRatio: "16:9" },
      assets: [
        { id: "hero", kind: "image", model: "google/nano-banana-2.1/text-to-image", prompt: "a desk at dawn", use: "hook backdrop" },
        { id: "hero-move", kind: "video", model: "minimax/h3/image-to-video", image: "@hero", prompt: "slow push in", duration: 5 },
        { id: "bed", kind: "bgm", model: "suno/v6/text-to-audio", prompt: "warm minimal electronic bed, 100 BPM" },
        { id: "vo-de", kind: "voice", model: "google/gemini-3.8-flash-tts/text-to-speech", text: "Ausgeliefert. Jetzt starten.", voice: "Kore", lang: "de" },
      ],
    };
    const planPath = join(root, "assets.plan.json");
    writeFileSync(planPath, JSON.stringify(plan));
    const base = [planPath, "--popnow", helperPath];

    await check("plan validation catches missing fields, bad refs and missing consent", async () => {
      const bad = { assets: [
        { id: "a", kind: "image", model: "google/nano-banana-2.1/text-to-image" },
        { id: "b", kind: "video", model: "minimax/h3/image-to-video", prompt: "x", image: "@nope" },
        { id: "c", kind: "voice", model: "google/gemini-3.8-flash-tts/text-to-speech", text: "hi", set: { reference_audio_urls: ["https://example.com/v.mp3"] } },
        { id: "d", kind: "bgm", model: "suno/v6/text-to-audio", prompt: "a song in the voice of a famous singer" },
      ] };
      assert.throws(() => validatePlan(bad, project, { requireInputs: false }), (err) => {
        assert.match(err.message, /"a": needs a "prompt"/);
        assert.match(err.message, /unknown item @nope/);
        assert.match(err.message, /"c": needs recorded consent/);
        assert.match(err.message, /"d": needs recorded consent/);
        return true;
      });
      const ok = structuredClone(bad.assets[2]);
      ok.consent = { confirmed: true, by: "the narrator, recorded release on file" };
      validatePlan({ assets: [ok] }, project, { requireInputs: false });
    });

    await check("dependencies run first and kind defaults are applied", async () => {
      const { items } = validatePlan({ assets: [plan.assets[1], plan.assets[0], plan.assets[2]] }, project, { requireInputs: false });
      assert.deepEqual(items.map((i) => i.id), ["hero", "hero-move", "bed"]);
      const flags = requestFlags(items[2], (v) => v);
      assert.ok(flags.includes("instrumental=true"), "music beds default to instrumental");
      const withDefaults = validatePlan({ defaults: { aspectRatio: "16:9" }, assets: [plan.assets[0], plan.assets[1]] }, project, { requireInputs: false }).items;
      assert.equal(withDefaults[0].aspectRatio, "16:9");
      assert.equal(withDefaults[1].aspectRatio, undefined, "image-to-video keeps its input's shape");
    });

    await check("dry run estimates, previews ledger ids after existing ones, writes nothing", async () => {
      const before = readFileSync(join(project, ".media/manifest.jsonl"), "utf8");
      const previewPath = join(root, "preview.json");
      const { code } = await capture(() => main([...base, "--dry-run", "--preview-out", previewPath]));
      assert.equal(code, 0);
      const preview = JSON.parse(readFileSync(previewPath, "utf8"));
      assert.equal(preview.estimatedCredits, 48 + 185 + 72 + Math.ceil(0.32 * speechSeconds(plan.assets[3].text)));
      assert.equal(preview.manifestRecords[0].id, "image_003", "skips image_001 (manifest) and image_002 (reserved file)");
      assert.equal(readFileSync(join(project, ".media/manifest.jsonl"), "utf8"), before);
      assert.ok(!existsSync(join(project, PROVENANCE_FILE)));
    });

    await check("without a confirmation nothing is created (exit 3)", async () => {
      const { code, out } = await capture(() => main(base));
      assert.equal(code, 3);
      assert.match(out, /--confirm-credits 314/);
      assert.equal(JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates.length, 0);
    });

    await check("a confirmation below the total is refused", async () => {
      const { code } = await capture(() => main([...base, "--confirm-credits", "300"]));
      assert.equal(code, 3);
      assert.equal(JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates.length, 0);
    });

    await check("confirmed run generates, keeps the user's file and appends valid records", async () => {
      const { code, out } = await capture(() => main([...base, "--confirm-credits", "314"]));
      assert.equal(code, 0, out);
      assert.equal(readFileSync(join(project, "assets/images/hero.png"), "utf8"), "users own picture");
      const lines = readFileSync(join(project, ".media/manifest.jsonl"), "utf8");
      assert.ok(lines.startsWith(existing), "existing ledger lines are untouched");
      const added = lines.slice(existing.length).trim().split("\n").map((l) => JSON.parse(l));
      assert.deepEqual(added.map((r) => r.id), ["image_003", "video_001", "bgm_001", "bgm_002", "voice_001"]);
      assert.equal(added[0].path, "assets/images/hero-2.png");
      assert.equal(added[2].path, "assets/bgm/bed.wav");
      assert.equal(added[3].path, "assets/bgm/bed-take2.wav");
      for (const r of added) {
        assert.equal(r.source, "generated");
        assert.equal(r.provenance.provider, "popnow");
        assert.ok(existsSync(join(project, r.path)), r.path);
      }
      const index = readFileSync(join(project, ".media/index.md"), "utf8");
      assert.match(index, /^# \.media · 6 assets/);
      const prov = JSON.parse(readFileSync(join(project, PROVENANCE_FILE), "utf8"));
      const move = prov.entries.find((e) => e.item === "hero-move");
      assert.deepEqual(move.inputs, ["assets/images/hero-2.png"]);
      assert.equal(prov.entries.reduce((s, e) => s + (e.credits || 0), 0), 314);
      assert.match(prov.entries[0].license, /popnow\.ai\/terms/);
    });

    await check("a second run skips finished items and spends nothing", async () => {
      const before = JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates.length;
      const { code, out } = await capture(() => main([...base, "--confirm-credits", "0"]));
      assert.equal(code, 0, out);
      assert.match(out, /Nothing to generate/);
      assert.equal(JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates.length, before);
    });

    await check("a dependent item whose real price is higher stops the run before spending", async () => {
      rmSync(join(project, PROVENANCE_FILE));
      writeFileSync(process.env.FAKE_STATE, JSON.stringify({ creates: [], quotes: 0 }));
      process.env.FAKE_PRICES = JSON.stringify({ ...JSON.parse(process.env.FAKE_PRICES), "minimax/h3/image-to-video": 400 });
      const { code, out } = await capture(() => main([...base, "--only", "hero,hero-move", "--confirm-credits", "233"]));
      assert.equal(code, 3, out);
      assert.match(out, /Stopped before "hero-move"/);
      assert.deepEqual(JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates, ["google/nano-banana-2.1/text-to-image"]);
    });

    await check("a task still running is collected on the next run without paying again", async () => {
      rmSync(join(project, PROVENANCE_FILE));
      writeFileSync(process.env.FAKE_STATE, JSON.stringify({ creates: [], quotes: 0 }));
      process.env.FAKE_SLOW = "suno/v6/text-to-audio";
      const first = await capture(() => main([...base, "--only", "bed", "--confirm-credits", "72"]));
      delete process.env.FAKE_SLOW;
      assert.equal(first.code, 4, first.out);
      const second = await capture(() => main([...base, "--only", "bed", "--confirm-credits", "0"]));
      assert.equal(second.code, 0, second.out);
      const st = JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8"));
      assert.equal(st.creates.length, 1, "created once");
      assert.equal(st.waits, 1, "collected with wait");
      const prov = JSON.parse(readFileSync(join(project, PROVENANCE_FILE), "utf8"));
      assert.equal(prov.entries.at(-1).state, "done");
      assert.equal(prov.entries.at(-1).credits, 72);
    });

    await check("a failed task is reported, not retried, and its dependents are skipped", async () => {
      rmSync(join(project, PROVENANCE_FILE));
      writeFileSync(process.env.FAKE_STATE, JSON.stringify({ creates: [], quotes: 0 }));
      process.env.FAKE_FAIL = "google/nano-banana-2.1/text-to-image";
      const { code, out } = await capture(() => main([...base, "--only", "hero,hero-move", "--confirm-credits", "1000"]));
      delete process.env.FAKE_FAIL;
      assert.equal(code, 5, out);
      assert.match(out, /not retried automatically/);
      assert.deepEqual(JSON.parse(readFileSync(process.env.FAKE_STATE, "utf8")).creates, ["google/nano-banana-2.1/text-to-image"]);
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
    for (const k of ["FAKE_STATE", "FAKE_PRICES", "FAKE_FAIL", "FAKE_SLOW"]) delete process.env[k];
  }
  console.log(log.join("\n"));
  const failedCount = log.filter((l) => l.startsWith("FAIL")).length;
  console.log(failedCount ? `\n${failedCount} self-test(s) failed` : `\nAll ${log.length} self-tests passed (no network, no credits).`);
  return failedCount ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
