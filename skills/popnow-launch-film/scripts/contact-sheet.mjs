#!/usr/bin/env node
// contact-sheet.mjs - lay 6 to 9 key frames out on one sheet for the user to approve before the
// full render (and before any paid generation).
//
// Frames come from HyperFrames: npx hyperframes snapshot --at <times from plan-film.mjs --times>
// (it writes PNGs to .hyperframes/artifacts/snapshots/). Pass them in time order, or pass the folder.
//
// Usage:
//   node scripts/contact-sheet.mjs .hyperframes/artifacts/snapshots --storyboard film/storyboard.json \
//        --out film/contact-sheet.html [--png film/contact-sheet.png]
//   node scripts/contact-sheet.mjs f1.png f2.png ... --out film/contact-sheet.html
//   node scripts/contact-sheet.mjs --self-test
//
// The HTML sheet labels every frame with its time, beat and on-screen line. --png also tiles the frames
// into one image with FFmpeg (3 columns), handy for pasting into a chat or a review doc.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function listFrames(inputs) {
  const files = [];
  for (const input of inputs) {
    const p = resolve(input);
    if (!existsSync(p)) throw new Error(`not found: ${input}`);
    if (statSync(p).isDirectory()) {
      for (const f of readdirSync(p).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
        if (/\.(png|jpe?g|webp)$/i.test(f)) files.push(join(p, f));
      }
    } else files.push(p);
  }
  return files;
}

// Time from a snapshot file name such as "frame-12.40s.png" or "snapshot_3.2.png", if it has one.
function timeFromName(file) {
  const m = basename(file).match(/(\d+(?:\.\d+)?)\s*s?\.(png|jpe?g|webp)$/i) || basename(file).match(/[_-](\d+(?:\.\d+)?)s?[_-]/);
  return m ? Number(m[1]) : null;
}

export function buildSheet(frames, storyboard, { title, outDir }) {
  const keyFrames = storyboard?.keyFrames ?? [];
  const beats = storyboard?.beats ?? [];
  const cards = frames.map((file, i) => {
    const kf = keyFrames[i];
    const t = kf?.t ?? timeFromName(file);
    const beat = beats.find((b) => (kf ? b.id === kf.beat : t != null && t >= b.start && t < b.end));
    return {
      src: relative(outDir, file).split("\\").join("/"),
      t,
      beat: beat ? `${beat.role} · ${beat.id}` : "",
      line: beat ? beat.onScreen.join(" · ") : "",
      voice: beat?.voice ?? "",
    };
  });
  if (frames.length < 6 || frames.length > 9) {
    console.error(`warning: ${frames.length} frames; a contact sheet works best with 6 to 9`);
  }
  if (keyFrames.length && keyFrames.length !== frames.length) {
    console.error(`warning: ${frames.length} frames but ${keyFrames.length} key frames in the storyboard; labels follow file order`);
  }
  const preset = storyboard ? Object.values(storyboard.presets)[0] : null;
  const ratio = preset ? `${preset.width} / ${preset.height}` : "16 / 9";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · contact sheet</title>
<style>
  :root { color-scheme: light dark; --bg: #f6f3ee; --ink: #1d1a22; --muted: #6b6573; --card: #fff; --line: #e3ded6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #141217; --ink: #f1ede7; --muted: #a39dab; --card: #1d1a22; --line: #2e2a34; } }
  body { margin: 0; padding: 24px; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; } p.meta { color: var(--muted); margin: 0 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; aspect-ratio: ${ratio}; object-fit: cover; background: #000; }
  figcaption { padding: 10px 12px 12px; }
  .t { font: 600 12px/1 ui-monospace, monospace; } .b { color: var(--muted); font-size: 12px; margin-left: 6px; }
  .l { margin-top: 6px; } .v { margin-top: 4px; color: var(--muted); font-style: italic; }
</style></head><body>
<h1>${esc(title)}</h1>
<p class="meta">${cards.length} key frames${storyboard ? ` · ${storyboard.duration} s · ${preset?.width}x${preset?.height}` : ""} · approve, or name the frame to change, before the full render.</p>
<div class="grid">
${cards.map((c, i) => `<figure><img src="${esc(c.src)}" alt="Frame ${i + 1}"><figcaption><span class="t">${c.t != null ? `${c.t.toFixed(2)}s` : `#${i + 1}`}</span><span class="b">${esc(c.beat)}</span>${c.line ? `<div class="l">${esc(c.line)}</div>` : ""}${c.voice ? `<div class="v">${esc(c.voice)}</div>` : ""}</figcaption></figure>`).join("\n")}
</div></body></html>
`;
}

export function tilePng(frames, out, { columns = 3, width = 640 } = {}) {
  const work = mkdtempSync(join(tmpdir(), "contact-sheet-"));
  try {
    // Normalise every frame to one size, then let the tile filter lay them out.
    frames.forEach((f, i) => copyFileSync(f, join(work, `f${String(i).padStart(3, "0")}${extname(f).toLowerCase()}`)));
    const list = frames.map((f, i) => `file '${join(work, `f${String(i).padStart(3, "0")}${extname(f).toLowerCase()}`)}'\nduration 1`).join("\n");
    writeFileSync(join(work, "list.txt"), list + "\n");
    const rows = Math.ceil(frames.length / columns);
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(work, "list.txt"),
      "-vf", `scale=${width}:-2:force_original_aspect_ratio=decrease,pad=${width}:ceil(ih/2)*2:(ow-iw)/2:(oh-ih)/2:color=black,tile=${columns}x${rows}:padding=12:margin=12:color=0x141217`,
      "-frames:v", "1", "-update", "1", resolve(out)];
    const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
    if (res.error) throw new Error("ffmpeg is not installed; the HTML sheet still works");
    if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr.trim().split("\n").pop()}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
  const valueFlags = new Set(["--storyboard", "--out", "--png", "--title", "--columns"]);
  const inputs = argv.filter((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
  if (!inputs.length || argv.includes("--help")) {
    console.log("Usage: node scripts/contact-sheet.mjs <frames dir | frame files...> [--storyboard film/storyboard.json] [--out film/contact-sheet.html] [--png film/contact-sheet.png]");
    return inputs.length ? 0 : 2;
  }
  try {
    const frames = listFrames(inputs);
    if (!frames.length) throw new Error("no PNG, JPG or WebP frames found");
    const storyboard = opt("--storyboard") ? JSON.parse(readFileSync(opt("--storyboard"), "utf8")) : null;
    const out = resolve(opt("--out") || "film/contact-sheet.html");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, buildSheet(frames, storyboard, { title: opt("--title") || storyboard?.title || "Launch film", outDir: dirname(out) }));
    const shown = relative(process.cwd(), out);
    console.log(`Wrote ${shown.startsWith("..") ? out : shown} (${frames.length} frames)`);
    if (opt("--png")) {
      tilePng(frames, opt("--png"), { columns: Number(opt("--columns")) || 3 });
      console.log(`Wrote ${opt("--png")}`);
    }
    return 0;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

// A tiny solid-colour PNG, so the self-test needs no other tool to make frames.
function solidPng(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function selfTest() {
  const assert = (await import("node:assert/strict")).default;
  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`ok   ${name}`); } catch (err) { results.push(`FAIL ${name}\n     ${err.message}`); }
  };
  const dir = mkdtempSync(join(tmpdir(), "contact-sheet-test-"));
  try {
    const frames = join(dir, "snapshots");
    mkdirSync(frames);
    const colors = [[53, 34, 66], [230, 90, 47], [255, 241, 216], [67, 109, 223], [196, 230, 222], [244, 219, 100], [233, 148, 196]];
    colors.forEach((c, i) => writeFileSync(join(frames, `frame-${i + 1}.png`), solidPng(64, 36, c)));
    const storyboard = {
      title: "Test film", duration: 30, presets: { wide: { width: 1920, height: 1080 } },
      beats: [{ id: "hook", role: "hook", start: 0, end: 4, onScreen: ["You shipped it."], voice: "You shipped it." }, { id: "cta", role: "cta", start: 4, end: 30, onScreen: ["popnow.ai"] }],
      keyFrames: colors.map((_, i) => ({ t: i * 4 + 1, beat: i === 0 ? "hook" : "cta" })),
    };
    writeFileSync(join(dir, "storyboard.json"), JSON.stringify(storyboard));

    await check("html sheet labels frames with time, beat and line", async () => {
      const out = join(dir, "film", "contact-sheet.html");
      const quiet = console.log; console.log = () => {};
      let code;
      try { code = await main([frames, "--storyboard", join(dir, "storyboard.json"), "--out", out]); } finally { console.log = quiet; }
      assert.equal(code, 0);
      const html = readFileSync(out, "utf8");
      assert.equal((html.match(/<figure>/g) || []).length, 7);
      assert.match(html, /1\.00s<\/span><span class="b">hook · hook/);
      assert.match(html, /src="\.\.\/snapshots\/frame-1\.png"/);
      assert.match(html, /aspect-ratio: 1920 \/ 1080/);
    });

    const ff = spawnSync("ffmpeg", ["-version"]);
    if (ff.error) results.push("skip png tiling (ffmpeg not installed)");
    else await check("png sheet tiles 3 columns", async () => {
      const png = join(dir, "sheet.png");
      tilePng(listFrames([frames]), png, { columns: 3, width: 160 });
      const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", png], { encoding: "utf8" });
      const [w, h] = probe.stdout.trim().split(",").map(Number);
      assert.equal(w, 3 * 160 + 2 * 12 + 2 * 12);
      assert.ok(h > 3 * 80, `height ${h}`);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : `\nAll self-tests passed.`);
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
