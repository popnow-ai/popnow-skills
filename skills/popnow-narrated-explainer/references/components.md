# Scene components

One markup per component, three looks. The look comes from `data-style` on `#root` (tokens and skins
in `explainer.css`) and from the motion each builder picks for that style. Every builder signature is
`(tl, element, start, marks)` and the storyboard dispatcher `XC.auto` calls it for you; call it by hand
inside a custom builder when two components share a scene. Charts are in `charts.md`.

Shared pieces:

- `.x-scene` is a full-frame section (flex, centred, caption space kept free). Add `free` in your own
  CSS when you place pieces absolutely.
- `.x-cut` (wrapper, carries the paper shadow) around `.x-face` (carries the colour and, with
  `data-tear="tb"`, the torn edge). In whiteboard and data-story the same markup renders flat.
- `.x-tape` is a strip of tape; position it on the piece.

Motion vocabulary per style (`XC.MOTION`):

| | paper-collage | whiteboard | data-story |
| --- | --- | --- | --- |
| Entry | Slapped down from off-board, settles at a stamped tilt, `back.out(1.5)`, 0.5 s | Strokes draw (`drawPath`), text writes on left to right (`writeOn`) | Rises 2.4% of the height and fades in, `power3.out`, 0.45 s |
| Scene change | Previous board peels up and away, 0.3 s | Camera pans: old board slides left, new one arrives from the right, 0.5 s | Fade and drift, 0.25-0.4 s |
| Stagger | 0.08 s | 0.18 s | 0.07 s |

## Title card (`title-card`)

```html
<section class="x-scene" id="b1">
  <p class="x-kicker x-cut">A one-minute explainer</p>
  <h1 class="x-h1"><span class="x-w">How</span> <span class="x-w">heat</span> <span class="x-w">pumps</span> <span class="x-w">work</span></h1>
  <svg class="x-underline" viewBox="0 0 600 30" preserveAspectRatio="none"><path d="M8 18 C 150 6, 420 26, 592 12"/></svg>
  <span class="x-rule"></span>
  <p class="x-sub">Optional one-line promise</p>
</section>
```

- Collage: each `.x-w` becomes a paper slip in rotating colours (paper, accent, ink, accent-2) and
  drops in one after another. Keep titles to 2-6 words.
- Whiteboard: words write on, then the underline draws. Remove `.x-rule`.
- Data story: words rise, `.x-rule` grows under them. Remove `.x-underline`; kicker is small caps.
- Use `"at": 0` for the opening card so it is on screen from the first frame.

## Bullet build (`bullet-build`, marks = one per item)

```html
<section class="x-scene" id="b4">
  <h2 class="x-h2">Three things a heat pump needs</h2>
  <ol class="x-list">
    <li class="x-item x-cut"><div class="x-face" data-tear="tb"><span class="x-mark">1</span><span class="x-text">Outdoor coil</span></div></li>
    <li class="x-item x-cut"><div class="x-face" data-tear="tb"><span class="x-mark">2</span><span class="x-text">Compressor</span></div></li>
    <li class="x-item x-cut"><div class="x-face" data-tear="tb"><span class="x-mark">3</span><span class="x-text">Indoor unit</span></div></li>
  </ol>
</section>
```

`XC.bullets(tl, el, beat.start, marks)`. Two to four items, two to five words each. Each item lands
on its mark: collage strips alternate from left and right with a sticker number; whiteboard draws a
hand circle round the number (generated, deterministic) and writes the text; data story rises.

## Quote (`quote`)

```html
<section class="x-scene" id="b6">
  <figure class="x-quote x-cut"><div class="x-face" data-tear="tb">
    <span class="x-qmark">&ldquo;</span>
    <blockquote class="x-q"><span class="x-qw">The</span> <span class="x-qw">best</span> <span class="x-qw">time</span> ...</blockquote>
    <figcaption class="x-cite">Name, Publication, 2024</figcaption>
  </div></figure>
</section>
```

Verbatim, attributed and in `sources.json`. With `.x-qw` spans and transcript timing, words brighten
as the narrator reads them (`XC.quote(tl, el, start, { words: T.words, until: beat.end })`). Keep
quotes under 25 words; never invent one, never put a real person's face next to it.

## Comparison (`comparison`, marks = side A, side B, verdict)

```html
<section class="x-scene" id="b7">
  <div class="x-compare">
    <div class="x-side x-a x-cut"><div class="x-face" data-tear="tb">
      <h3>Gas boiler</h3><ul><li>Burns fuel</li><li>About 0.9 units of heat per unit in</li></ul>
      <span class="x-strike"></span>
    </div></div>
    <div class="x-vs">vs</div>
    <div class="x-side x-b x-cut"><div class="x-face" data-tear="tb">
      <h3>Heat pump</h3><ul><li>Moves heat</li><li>About 3 units of heat per unit in</li></ul>
    </div><span class="x-win">&#10003;</span></div>
  </div>
</section>
```

Side A, side B, then the verdict: `.x-strike` draws across the weaker side and `.x-win` pops on the
stronger. Keep `.x-win` outside `.x-face`, or the torn edge clips it. Leave both out when the comparison is neutral. Numbers on screen need claims.

## Timeline (`timeline`, marks = one per stop)

```html
<section class="x-scene" id="b8">
  <div class="x-timeline">
    <div class="x-track"><div class="x-progress"></div></div>
    <div class="x-node" style="--at:0.1"><span class="x-dot">1</span><b class="x-when">1856</b><span class="x-what">First heat pump</span></div>
    <div class="x-node" style="--at:0.5"><span class="x-dot">2</span><b class="x-when">1940s</b><span class="x-what">Home units</span></div>
    <div class="x-node" style="--at:0.9"><span class="x-dot">3</span><b class="x-when">Today</b><span class="x-what">Cold-climate models</span></div>
  </div>
</section>
```

`--at` is the position along the track (0 to 1; keep the first and last at 0.1 and 0.9 so labels
fit). The progress bar fills to each stop just before its mark; the dot pops and the labels follow.
Three to five stops. Dates are claims.

## Callout (`callout`, mark = when it points)

```html
<div class="x-callout" id="b9" style="--x:62%; --y:44%">
  <span class="x-ring"></span>
  <svg class="x-arrow" viewBox="0 0 200 120"><path d="M10 110 C 60 20, 140 10, 190 40"/></svg>
  <span class="x-label">the compressor</span>
</div>
```

Place it inside a scene over an illustration and give its beat `"scene": "<that scene's id>"` so the
illustration stays up; `--x` and `--y` are the target point. The ring tightens onto the target, the
arrow draws, the label arrives. One callout at a time.

## Map pins (`map-pin`, marks = one per pin)

```html
<section class="x-scene" id="b10">
  <div class="x-map">
    <img class="x-map-art" src="assets/map.svg" alt="">
    <div class="x-pin" style="--x:47%; --y:31%"><span class="x-pin-ring"></span><span class="x-pin-head"></span><span class="x-pin-label">Oslo</span></div>
  </div>
</section>
```

Use a map you are allowed to use: one the user supplies, or public-domain data such as Natural Earth
drawn as SVG. A generated "illustrated map" is decoration only; never use it for real positions or
borders. Pins drop, ring once and label.

## End card (`end-card`, anchor `@end`)

```html
<section class="x-scene x-end" id="b12">
  <p class="x-takeaway">One sentence the viewer should remember.</p>
  <ol class="x-sources x-cut">
    <li><b>Sources</b></li>
    <li>Title of source - publisher.org/page</li>
  </ol>
  <p class="x-cta">Where to learn more</p>
</section>
```

Three to four seconds after the last word. Sources come from `sources.json` (short URLs, two to four
lines). The call to action is one line; a logo only if the user owns it.

## Custom scenes

When no component fits, build with the helpers, timed from the beat:

| Helper | Does |
| --- | --- |
| `XC.drop(tl, el, t, { from, tilt, rot, dist })` | Paper piece slapped in from a side, settles at a stamped tilt |
| `XC.pop(tl, el, t, { from })` | Scale-in with a small overshoot (stickers, badges, not data) |
| `XC.fadeUp(tl, el, t, { dist, stagger })` | Rise and fade in |
| `XC.writeOn(tl, el, t, dur)` | Text revealed left to right (whiteboard) |
| `XC.drawPath(tl, path, t, dur)` | SVG stroke draws on |
| `XC.peel(tl, el, t)` | Piece lifts away |
| `XC.put(tl, el, from, to, t)` | Any fromTo with the starting state applied safely |
| `XC.tear(el, { edges, depth })`, `XC.stamp(n, seed, amp)` | Torn edges and deterministic tilts |

Position pieces in `--u` units inside the scene, keep them out of the caption band (the bottom 17%),
and give every piece an entry tied to a beat or a mark: nothing floats or wobbles while it waits.
