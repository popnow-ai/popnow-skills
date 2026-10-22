# Composition: HyperFrames, the kit, fonts and render

Your agent writes the video as a web page: HTML, CSS and SVG for what is on screen, one paused GSAP
timeline for when it happens. HyperFrames, an open-source renderer, opens that page in a headless
Chrome, moves the timeline to each frame in turn, captures it and encodes the result with FFmpeg.
This file covers installing the tools, the starter kit in `references/kit/`, and the rules that make
the rendered file match what you saw in the preview.

## Tools

- **HyperFrames** (Apache-2.0, https://github.com/heygen-com/hyperframes), called through
  `npx hyperframes`, so there is nothing to install globally. It needs Node.js 22 or later, FFmpeg
  with ffprobe on `PATH`, and a browser it manages itself: `npx hyperframes browser ensure` fetches
  it, `npx --yes hyperframes doctor --json` reports anything missing.
- **GSAP** is not shipped with this skill. Run `npm i gsap@3` in any folder and copy
  `node_modules/gsap/dist/gsap.min.js` into the project's `assets/`, keeping its header comment.
  GSAP is used under its own licence: https://gsap.com/standard-license.

HyperFrames options change between releases. If a flag is refused, `npx hyperframes <command> --help`
for the installed version is the authority, not this page.

| Command | When |
| --- | --- |
| `npx hyperframes lint` | After every structural edit; quick |
| `npx hyperframes check --json` | Before rendering: lint plus runtime, layout and contrast audits. Clear every error |
| `npx hyperframes snapshot --at 1.2,5.4` | Still frames for the contact sheet and for review |
| `npx hyperframes preview` | Watch it while editing |
| `npx hyperframes render --quality high --fps 30 --output renders/explainer.mp4` | The final file (`--quality draft` while iterating) |

## The kit

`python3 $SKILL/scripts/explainer.py scaffold <dir> --style <style> --canvas 1920x1080 --lang en`
copies `references/kit/` into a project:

```
index.html                     root, scenes, caption layer, audio elements, inline captions, build script
script.md  storyboard.json  sources.json
assets/explainer.css           layout, three style skins, components, captions
assets/explainer-runtime.js    XR: fit, parseVTT, captionText, mountCaptions, beats, marks, ready
assets/explainer-components.js XC: scene, title, bullets, quote, compare, timeline, callout, pins, bars,
                               line, countUp, endCard, auto; helpers put, drop, pop, fadeUp, writeOn,
                               drawPath, tear, paper, stamp
assets/timing.js               written by `beats` (window.EXPLAINER_TIMING)
assets/fonts/                  display.woff2, body.woff2, hand.woff2 (you add these)
```

Sizes use `--u`, 1% of the canvas height, set by `XR.fit` from `data-width` and `data-height`, so one
stylesheet serves 1920x1080, 1080x1920 and 1080x1080. `XR.fit` also sets `data-aspect` (`wide`, `tall`,
`square`) for the layout tweaks at the end of `explainer.css`. For 9:16 build captions with
`--max-chars 28` (12 for Chinese and Japanese).

## The build script

```js
var T = window.EXPLAINER_TIMING;          // beats, chapters, words, duration
var root = document.getElementById("root");
XR.fit(root);
window.__duration = T.duration;
var tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
XC.paper(root);                            // torn edges on [data-tear] faces (collage only)
XC.auto(tl, T, {                           // one scene per beat or shared "scene"; builder per component
  b2: function (tl, el, beat) {            // custom beats: use beat.start and beat.marks
    XC.drop(tl, el.querySelector(".term"), beat.start, { from: "left", dist: 14 });
  }
});
XR.mountCaptions(tl, document.getElementById("captions"), XR.parseVTT(XR.inlineVTT()));
tl.set({}, {}, T.duration);
window.__timelines = { explainer: tl };    // key = data-composition-id
```

`XC.auto` keeps each scene on screen from its first beat to its last. For every beat it looks up the
builder that matches the beat's `component` and runs it on the element that has the beat's id. The last scene stays to the end. Override any
beat or component by key; custom builders get `(tl, el, beat, timing)`.

Visual timing comes only from `timing.js`. Never type a time into the build script: when the voice is
re-read, `align` and `beats` move every scene and caption, and hand-typed times would not move.

## Rules that keep the render identical to the preview

- One root element with `data-composition-id`, `data-start="0"`, `data-duration`, `data-width`,
  `data-height`, `data-fps`. `beats --html index.html` keeps `data-duration` in step.
- One paused timeline with `defaults: { immediateRender: false }`, registered in `window.__timelines`.
  The renderer seeks it; it must not depend on playing in real time.
- Starting states are set once with `gsap.set` and repeated in the tween's `from` object, and every
  animated property appears in both `from` and `to`. `XC.put` does both. A renderer that seeks to a
  random frame first then still sees the right state.
- No `Math.random`, `Date.now`, `setInterval` or `repeat: -1`. Tilts and torn edges come from
  `XC.stamp` and `XC.tear`, seeded by element ids.
- Counters (`XC.countUp`) write text in `onUpdate`; seek with `tl.seek(t, false)` so callbacks run.
- If GSAP animates an element, do not give that element a CSS `transform` of its own; use the separate `rotate` property
  or a wrapper. Root scaling (`XR.fit`) only applies when the window is not the canvas size.
- Give every `<audio>` an `id` (`vo`, `music`): the renderer only mixes audio elements it can name.
- Fonts are local files under the kit's private family names; system fonts are substituted silently.
- The page loads nothing from the network. QA fails on remote scripts, styles, fonts or media.

Preview and autoplay: the kit plays from 0 when a person opens `index.html`, seeks with `?t=12.5`,
and stays paused under automation (`navigator.webdriver`) so the renderer drives it. Add `?play` to
force playback in a headless recorder.

## Fonts

Three slots, all OFL-licensed suggestions; download from the font's official repository or Google
Fonts, keep each licence file next to the font, and subset large CJK fonts to the characters used.

| Style | display.woff2 | body.woff2 | hand.woff2 |
| --- | --- | --- | --- |
| paper-collage | Anton or Bebas Neue (condensed poster) | Inter or Work Sans | Caveat or Kalam |
| whiteboard | (uses hand) | Inter or Nunito | Caveat, Kalam or Patrick Hand |
| data-story | Inter or IBM Plex Sans (heavy weight) | same family, tabular figures | (not used) |
| zh-CN / zh-TW | Noto Sans SC / TC Black | Noto Sans SC / TC | LXGW WenKai |
| ja | Noto Sans JP Black | Noto Sans JP | Klee One |
| ko | Noto Sans KR Black | Noto Sans KR | Gaegu or Nanum Pen Script |

Set `<html lang>` to the script's language; number formatting (`Intl.NumberFormat`) follows it.

## DESIGN.md

If the project has a `DESIGN.md`, map it onto the style tokens instead of inventing colours:

```css
[data-style="paper-collage"] {
  --accent: #0e7c66;      /* brand primary */
  --accent-2: #f2a541;    /* brand secondary */
  --ink: #1b1f24;         /* text colour */
  --font-body: "XBody", system-ui, sans-serif;   /* load the brand font into the body slot */
}
```

Keep the style's structure (paper texture and tilt, marker strokes, chart greys); change palette and
type. Check caption contrast again after recolouring (`qa --html`). Use the brand's logo only if the
user owns it, and only on the end card.

## Audio elements

```html
<audio id="vo" src="assets/voiceover.wav" data-start="0.600" data-duration="58.800" data-track-index="10" data-volume="1"></audio>
<audio id="music" src="assets/bed.wav" data-start="0" data-duration="62.900" data-track-index="11"
       data-fade-in="0.8" data-fade-out="2.5" data-automation='{"version":1,"lanes":[...]}'></audio>
```

Copy `vo/voiceover.wav` to `assets/`. `beats --html` writes the voice's start and length and the
film length. The music envelope comes from `explainer.py duck` (`references/sound.md`); do not also
set `data-volume` on the music or tween its volume.

## Generated images in scenes

Collage cut-outs and icons are PNGs with transparency placed like any paper piece:

```html
<div class="abs x-cut" id="drawer" style="left: calc(var(--u) * 40); top: calc(var(--u) * 20); width: calc(var(--u) * 60)">
  <img src="assets/drawer.png" alt="" style="width: 100%; display: block">
</div>
```

`.x-cut` gives it the paper drop shadow, and `XC.drop` slaps it in. Never put words inside a generated
image: labels, numbers and titles stay HTML so they are sharp, translatable and checkable.
