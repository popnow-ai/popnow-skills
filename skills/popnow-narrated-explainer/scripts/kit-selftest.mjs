#!/usr/bin/env node
// Self-test for the browser kit (references/kit/*.js) under Node: caption parsing, timing helpers
// and the deterministic pieces of the component builders. No network, no browser needed.
//
//   node scripts/kit-selftest.mjs [path/to/captions.vtt ...]
//
// Extra .vtt paths are parsed too and checked for ordered, non-overlapping cues.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const XR = require(join(here, "..", "references", "kit", "explainer-runtime.js"));
const XC = require(join(here, "..", "references", "kit", "explainer-components.js"));

let failures = 0;
const check = (cond, label) => {
  console.log(`${cond ? "ok  " : "FAIL"}  ${label}`);
  if (!cond) failures++;
};

const sample = `WEBVTT
Kind: captions

NOTE written by explainer.py

1
00:00:00.600 --> 00:00:02.950 line:85%
Your coding agent can write code.

2
00:02.950 --> 00:00:05.100
<v Narrator>But it doesn't know</v>
how your team works.

STYLE
::cue { color: white }
`;
const cues = XR.parseVTT(sample);
check(cues.length === 2, "parseVTT reads two cues and skips NOTE and STYLE blocks");
check(Math.abs(cues[0].start - 0.6) < 1e-9 && Math.abs(cues[0].end - 2.95) < 1e-9, "parseVTT reads hh:mm:ss.mmm and drops cue settings");
check(Math.abs(cues[1].start - 2.95) < 1e-9, "parseVTT accepts mm:ss.mmm");
check(cues[1].lines.length === 2 && cues[1].lines[0] === "But it doesn't know", "parseVTT keeps lines and strips voice tags");
check(XR.parseVTT("WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHi\r\n").length === 1, "parseVTT handles CRLF");
check(XR.parseClock("01:02:03,500") === 3723.5, "parseClock accepts SRT commas");

const beat = { start: 10, marks: [11, 12.5] };
const m = XR.marks(beat, 4, 0.5);
check(m.length === 4 && m[2] === 13 && m[3] === 13.5, "marks pads missing marks with even spacing");
const map = XR.beats({ beats: [{ id: "b1", start: 0 }, { id: "b2", start: 3 }] });
check(map.b2.start === 3, "beats indexes storyboard beats by id");

const a = XC.stamp(5, 42, 3), b = XC.stamp(5, 42, 3);
check(JSON.stringify(a) === JSON.stringify(b) && a.every((v) => Math.abs(v) <= 3), "stamp is deterministic and bounded");
check(XC.hash("b1") === XC.hash("b1") && XC.hash("b1") !== XC.hash("b2"), "hash is stable per id");
const r1 = XC.rng(7), r2 = XC.rng(7);
check([1, 2, 3].every(() => r1() === r2()), "rng repeats for the same seed");
const circle = XC.handCircle(99);
check(/^M[\d. ]+( Q[\d. ]+)+$/.test(circle), "handCircle returns an SVG path");
check(XC.handCircle(99) === circle, "handCircle is deterministic");
const names = ["title-card", "bullet-build", "quote", "comparison", "timeline", "callout", "map-pin", "bar-chart", "line-chart", "stat", "end-card"];
check(names.every((n) => typeof XC.BUILDERS[n] === "function"), "every storyboard component has a builder");
check(["paper-collage", "whiteboard", "data-story"].every((s) => XC.MOTION[s] && XC.MOTION[s].inDur > 0), "motion presets exist for all three styles");

for (const file of process.argv.slice(2)) {
  const list = XR.parseVTT(readFileSync(file, "utf8"));
  const ordered = list.every((c, i) => c.end > c.start && (i === 0 || c.start >= list[i - 1].end - 1e-6));
  check(list.length > 0 && ordered, `${file}: ${list.length} cues, ordered and non-overlapping`);
}

console.log(`\n${failures ? "KIT SELFTEST FAILED" : "Kit selftest passed"}: ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
