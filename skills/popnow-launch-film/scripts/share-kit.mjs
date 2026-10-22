#!/usr/bin/env node
// share-kit.mjs - the posting kit that goes out with the film: a thumbnail frame and checked post copy.
//
// Usage:
//   node scripts/share-kit.mjs --video renders/film-mixed.mp4 --at 2.6 --copy film/share.json --out share/
//   node scripts/share-kit.mjs --copy film/share.json            (check the copy only)
//   node scripts/share-kit.mjs --self-test
//
// film/share.json:
//   { "url": "https://...", "x": "post text", "linkedin": "post text", "alt": "what the video shows" }
//
// Writes share/thumbnail.jpg (the frame at --at, full size), share/thumbnail-small.jpg (1280 wide) and
// share/share.md (both posts with their counts, the alt text and posting notes).
// Checks: X weighted length <= 280 (a link counts as 23), the LinkedIn hook fits before "see more",
// hashtags, hype words, an opening that is about the reader, alt text present.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HYPE = /\b(revolution(ary|ize|ise)?|game[- ]chang(er|ing)|unleash(es|ed)?|supercharge[ds]?|next[- ]gen(eration)?|seamless(ly)?|effortless(ly)?|magic(al)?|stunning|insane(ly)?|cutting[- ]edge|world[- ]class|best[- ]in[- ]class)\b/i;
const SELF_OPENERS = /^\s*(introducing|we('| a)re (so )?(excited|thrilled|proud|happy)|excited to (announce|share)|big news|today we('| a)re (excited|thrilled|proud))/i;
const URL_RE = /https?:\/\/[^\s)]+/g;
const EMOJI = /\p{Extended_Pictographic}/gu;

// X counts most Latin text as 1, CJK and emoji as 2, and every link as 23.
export function xLength(text) {
  const withoutUrls = String(text).replace(URL_RE, "");
  const urls = (String(text).match(URL_RE) || []).length;
  let n = 0;
  for (const ch of withoutUrls) {
    const cp = ch.codePointAt(0);
    n += cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2;
  }
  return n + urls * 23;
}

export function checkCopy(copy) {
  const errors = [];
  const warnings = [];
  const { x, linkedin, alt, url } = copy;
  if (!x && !linkedin) errors.push('share.json needs "x" and/or "linkedin" post text');
  if (x) {
    const len = xLength(x);
    if (len > 280) errors.push(`X post is ${len} of 280 characters (links count as 23)`);
    else if (len > 260) warnings.push(`X post is ${len} of 280; leave a little room for a quote post`);
    if ((x.match(/#\w+/g) || []).length > 2) warnings.push("X post has more than two hashtags");
  }
  if (linkedin) {
    if (linkedin.length > 3000) errors.push(`LinkedIn post is ${linkedin.length} of 3,000 characters`);
    const hook = linkedin.split("\n")[0];
    if (hook.length > 150) warnings.push(`LinkedIn opening line is ${hook.length} characters; the feed shows about the first 140-210 before "see more"`);
    if ((linkedin.match(/#\w+/g) || []).length > 3) warnings.push("LinkedIn post has more than three hashtags");
  }
  for (const [name, text] of [["X", x], ["LinkedIn", linkedin]]) {
    if (!text) continue;
    if (SELF_OPENERS.test(text)) warnings.push(`${name} post opens with the company ("Introducing", "We're excited"); open with what changes for the reader`);
    const hype = text.match(HYPE);
    if (hype) warnings.push(`${name} post uses "${hype[0]}"; say what the product does instead`);
    if ((text.match(EMOJI) || []).length > 2) warnings.push(`${name} post has more than two emoji`);
    if (url && !text.includes(url)) warnings.push(`${name} post does not include ${url}`);
  }
  if (!alt || alt.trim().length < 40) errors.push('add "alt": a sentence or two describing what the video shows, for people using screen readers');
  else if (alt.length > 1000) errors.push(`alt text is ${alt.length} of 1,000 characters`);
  return { errors, warnings };
}

function thumbnail(video, at, outDir) {
  const big = join(outDir, "thumbnail.jpg");
  const small = join(outDir, "thumbnail-small.jpg");
  for (const [out, vf] of [[big, null], [small, "scale=1280:-2"]]) {
    const args = ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(at), "-i", video, "-frames:v", "1", "-q:v", "2", ...(vf ? ["-vf", vf] : []), out];
    const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
    if (res.error) throw new Error("ffmpeg is not installed");
    if (res.status !== 0 || !existsSync(out)) throw new Error(`could not grab a frame at ${at}s: ${res.stderr.trim()}`);
  }
  return { big, small };
}

function shareMd(copy, thumbs, video, at) {
  const out = ["# Share kit", ""];
  if (video) out.push(`Video: \`${video}\` · thumbnail frame at ${at}s: \`thumbnail.jpg\` (full size), \`thumbnail-small.jpg\` (1280 wide)`, "");
  if (copy.x) out.push(`## X (${xLength(copy.x)}/280)`, "", copy.x, "");
  if (copy.linkedin) out.push(`## LinkedIn (${copy.linkedin.length}/3000)`, "", copy.linkedin, "");
  if (copy.alt) out.push("## Alt text", "", copy.alt, "");
  out.push("## Posting notes", "",
    "- Upload the MP4 itself rather than a link to it; native video autoplays (muted) in both feeds.",
    "- The first second has to work without sound: the hook line is on screen from frame 1.",
    "- Set the thumbnail frame where the platform allows it, and add the alt text.",
    "- Post the vertical cut to short-video apps, the square or wide cut to LinkedIn and X.", "");
  return out.join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);
  if (argv.includes("--help") || (!opt("--copy") && !opt("--video"))) {
    console.log("Usage: node scripts/share-kit.mjs [--video film.mp4 --at SECONDS] --copy film/share.json [--out share/]");
    return argv.includes("--help") ? 0 : 2;
  }
  try {
    const outDir = resolve(opt("--out") || "share");
    mkdirSync(outDir, { recursive: true });
    const copy = opt("--copy") ? JSON.parse(readFileSync(opt("--copy"), "utf8")) : {};
    const { errors, warnings } = opt("--copy") ? checkCopy(copy) : { errors: [], warnings: [] };
    let thumbs = null;
    const at = Number(opt("--at") ?? 2);
    if (opt("--video")) thumbs = thumbnail(opt("--video"), at, outDir);
    for (const w of warnings) console.log(`warn   ${w}`);
    for (const e of errors) console.log(`FAIL   ${e}`);
    writeFileSync(join(outDir, "share.md"), shareMd(copy, thumbs, opt("--video"), at));
    console.log(`Wrote ${join(outDir, "share.md")}${thumbs ? ", thumbnail.jpg and thumbnail-small.jpg" : ""}`);
    return errors.length ? 1 : 0;
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
  await check("X length counts links as 23 and wide characters as 2", async () => {
    assert.equal(xLength("Ship it https://example.com/a/very/long/path/that/is/long"), 8 + 23);
    assert.equal(xLength("ab\u3042"), 4);
  });
  await check("good copy passes; long, hype and self-centred copy is flagged", async () => {
    const good = { url: "https://example.com", x: "Your notes, written before the meeting ends. Memoleaf turns a voice memo into notes your team can use. https://example.com", linkedin: "Meeting notes nobody has to write.\n\nMemoleaf listens once and gives you notes in Markdown or PDF.\n\nhttps://example.com", alt: "A 28 second film: a voice memo is dropped onto a laptop and becomes tidy meeting notes, ending on the install command." };
    assert.deepEqual(checkCopy(good).errors, []);
    assert.deepEqual(checkCopy(good).warnings, []);
    const bad = { url: "https://example.com", x: "Introducing our revolutionary app! " + "x".repeat(300), linkedin: "We're excited to announce " + "y".repeat(200), alt: "" };
    const r = checkCopy(bad);
    assert.ok(r.errors.some((e) => /X post is \d+ of 280/.test(e)));
    assert.ok(r.errors.some((e) => /alt/.test(e)));
    assert.ok(r.warnings.some((w) => /revolutionary/.test(w)));
    assert.ok(r.warnings.some((w) => /opens with the company/.test(w)));
  });
  if (spawnSync("ffmpeg", ["-version"]).error) results.push("skip thumbnail (ffmpeg not installed)");
  else await check("grabs a full-size and a 1280-wide thumbnail", async () => {
    const dir = mkdtempSync(join(tmpdir(), "share-kit-test-"));
    try {
      const video = join(dir, "film.mp4");
      spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=1920x1080:r=30:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", video]);
      const t = thumbnail(video, 2.5, dir);
      const dims = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim();
      assert.equal(dims(t.big), "1920,1080");
      assert.equal(dims(t.small), "1280,720");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(failed ? `\n${failed} self-test(s) failed` : "\nAll self-tests passed.");
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code));
}
