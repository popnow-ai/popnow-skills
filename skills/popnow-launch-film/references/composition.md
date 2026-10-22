# Building the composition

The film is a HyperFrames composition: HTML and CSS for the frames, a paused GSAP timeline for time.
Your agent writes the code; HyperFrames renders it frame by frame in headless Chrome, so every frame is
exact and repeatable. If the HyperFrames documentation for your version describes a mechanic
differently, follow the documentation; this file adds what a launch film needs on top.

## The contract HyperFrames renders

- One root element with `data-composition-id`, `data-start="0"`, `data-duration`, `data-width`,
  `data-height` and `data-fps`. Clips (video, audio, images that come and go) carry `data-start`,
  `data-duration` and a `data-track-index`; clips that overlap in time use different tracks.
- One paused timeline per composition, registered on `window.__timelines["<composition id>"]`:
  `gsap.timeline({ paused: true, defaults: { immediateRender: false } })`. Nothing plays by itself;
  the renderer seeks.
- Put every animated property in both ends of a `fromTo`. Hidden starting states live in CSS.
- Determinism: no `Math.random`, no `Date.now`, no intervals, no infinite repeats. Variation comes from
  the element index or a fixed table.
- Fonts are local files under your own family names (renderers silently swap system fonts).
- `<video>` clips are `muted playsinline`, no `crossorigin`; every `<audio>` has an `id`.
- Paint the root with an opaque background so transitions never flash white.
- The Web Animations API is also seeked by HyperFrames. A composition can use it instead of GSAP when
  you want zero dependencies (one `element.animate()` track per element across the whole film, paused,
  with `fill: "both"`); the sample film for this skill is built that way.

## Presets

Lay each preset out on its own canvas; share the beats, the timing and the assets. Two workable setups:

1. **Three compositions** (`wide.html`, `vertical.html`, `square.html`) that include the same timeline
   module and differ only in CSS. Simple and explicit; render each.
2. **One composition, three layouts**: the root carries `data-preset`, `film/presets.css` (written by
   `plan-film.mjs`) sets the canvas size, safe area and minimum type sizes, and layout rules switch on
   `[data-preset="vertical"]`. Render once per preset by changing the attribute and the canvas size.

Inside every preset, all copy lives in a `.safe` box (`inset` from `presets.css`), so a headline cannot
drift under a platform's caption bar or buttons. Backgrounds and pictures go full bleed.

| | wide 1920x1080 | vertical 1080x1920 | square 1080x1080 |
| --- | --- | --- | --- |
| Headline | 84-120 px, left-aligned, 1-2 lines | 96-130 px, 2-3 lines, upper half | 80-110 px, 2 lines |
| Body / labels the viewer must read | 40 px minimum | 46 px minimum | 40 px minimum |
| Interface detail (terminal lines, labels in a mock-up) | 24 px minimum, mark `data-qa="ui"` | 28 px | 24 px |
| Decoration nobody needs to read | mark `data-qa="texture"` | | |
| Product screen | right two thirds | middle band, full width | centre, 80 % width |

`frame-audit.mjs` uses these tiers: unmarked text is copy, `data-qa="ui"` gets 60 % of the copy minimum,
`data-qa="texture"` is skipped.

## Product moments

- Use the product's real interface. Best: rebuild the relevant screen in HTML from the product's own
  CSS or screenshots, so text stays sharp and can animate. Acceptable: real screenshots or a screen
  recording the user supplies, placed as images or muted video.
- A tool the product works inside (an editor, a chat app, a terminal) appears as a neutral original:
  generic chrome, no third-party wordmark, menus or signature layout.
- Make each moment cause and effect: a command types, results land; a file drops in, the output
  appears; a card fills and its status flips. One thing changes at a time, and the eye knows where to
  look.
- Carry one element across beats when you can (the four to-do cards that come back done, a cursor
  handed across a cut). It is what makes a film feel designed rather than assembled.

## Placing PopNow media

Stills, clips, the bed and the voice land in `assets/` (the `popnow-hyperframes-ai-assets` skill files them
there and records them in `.media/manifest.jsonl`).

```html
<img class="plate" src="assets/images/hero-desk.png" alt="" data-start="0" data-duration="3.4" data-track-index="0">
<video src="assets/video/hook-move.mp4" muted playsinline data-start="0" data-duration="3.4" data-track-index="1"></video>
```

- Grade pictures to the film in CSS (`filter: brightness(.85)`, a gradient in the background colour)
  until the copy over them passes `npx hyperframes check`'s contrast audit.
- Use less of a clip than you generated; start on its cleanest frame; never loop a short clip.
- Sound is mixed after rendering by `mix.mjs`, so the composition can stay silent. If you place audio
  in the composition instead, give every `<audio>` an `id` and see `sound-mix.md`.
- Until a generated file exists, keep a labelled placeholder (a CSS gradient or an SVG frame with the
  planned prompt's subject written on it, marked `data-qa="texture"`), so the contact sheet is honest.

## Motion grammar for launch films

- One direction of travel for the whole film (leftward is a good default); arrivals and exits follow
  it. Scale through a cut only to go deeper (push in) or to arrive at a payoff (pull back).
- Entrances 0.3-0.5 s with a strong ease-out; exits about 75 % of that with an ease-in. Words in a
  headline rise one after another, each starting before the previous settles.
- No bounce or elastic eases, no idle floating, no camera shake.
- Something purposeful moves at every moment except marked holds: a reveal, a typed line, a progress
  bar, a slow push with a reason. `qa-check.mjs` flags anything still for more than 1.2 s.
- Type a command at a readable pace (about 25-30 characters a second) and land each result line after
  it, 0.4-0.5 s apart.
- Respect a user's reduced-motion preference in any interactive preview; the render itself is fixed.

## Checks while you build

```bash
npx hyperframes lint
npx hyperframes check
node scripts/frame-audit.mjs index.html --storyboard film/storyboard.json --preset wide
npx hyperframes preview --background
```

Audit the key frames, where each beat is settled; text mid-way through an exit is allowed to leave the
safe area.
