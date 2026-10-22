# Style: whiteboard

A clean board where every line is drawn while the viewer watches: headings write on, circles and
arrows draw themselves, and the camera pans to fresh board space for each idea. It is the clearest
look for processes and step-by-step teaching, because drawing order shows the order of ideas.

## Look

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--bg-2` | `#f6f5f0` / `#ecebe4` | Board, slight vignette |
| `--ink` | `#1d1d1d` | Marker black: text and outlines |
| `--accent` | `#d32f3b` red | Emphasis, the one thing to notice |
| `--accent-2` | `#1f55c4` blue | Numbers, secondary marks |
| `--accent-3` | `#1f8a4c` green | "Good", the right answer |
| `--accent-4` | `#f4c430` yellow | Highlighter behind a word (use sparingly) |
| `--stroke` | 0.45% of height | Marker width for drawn lines |
| `--grain` | 0.10 | Faint board texture |

Type: handwriting for headings and labels (`hand`, which the style also uses as `display`), a plain
sans for captions and small print (`body`). Handwriting must stay legible: one handwriting face, at
least 4% of the frame height for headings.

## Strokes

- Everything drawn is an SVG `<path>` with `fill: none`, round caps and `--stroke` width;
  `XC.drawPath` reveals it along its length. Draw in the order a person would: outline, then detail,
  then the arrow, then the label.
- Hand-drawn circles round numbers come from `XC.handCircle` (seeded, slightly open, never a perfect
  circle). Underlines and arrows are gentle Bezier curves, not straight `<line>`s.
- Text writes on left to right (`XC.writeOn`, about 0.035 s per character, capped at 0.9 s). Long
  sentences belong in captions, not on the board.
- For a rougher marker edge you may add an SVG `feTurbulence` + `feDisplacementMap` filter to stroke
  groups; keep its `seed` fixed so frames match.

## Motion

- Scene change is a **camera pan**: the old board slides out left and the new one arrives from the
  right (`XC.scene`, 0.5 s `power2.inOut`). Keep the direction constant for the whole film.
- Builds are drawing, not flying: nothing slides in except the camera. Stagger 0.18 s.
- A marker cursor is optional; if you add one, it is a small dark circle that travels the stroke path,
  never a hand image of a real person.
- Hold each finished drawing at least 1.5 s before the camera moves.

## Composition

- One idea per board. Arrange left to right or top to bottom in reading order; the drawing order
  matches the narration order.
- Use colour for meaning only: black for structure, red for the thing to notice, blue for numbers,
  green for the correct or chosen option.
- Boxes and arrows outnumber words. Labels are one to three words.

## PopNow icons (optional)

For objects that are hard to draw with paths (an engine, a cell, a building), generate line art and
place it as an image that wipes in left to right (generated pixels cannot be drawn stroke by stroke):

```bash
python3 $SKILL/scripts/popnow.py quote --model alibaba/z-image-turbo/text-to-image --aspect-ratio 1:1 \
  --prompt "Simple black marker line drawing of <object> on a pure white background, single even \
stroke weight, no shading, no fill, no text, centred, plenty of white space"
```

Then remove the background (`popnow/background-remover-v1/edit`) or blend the PNG with
`mix-blend-mode: multiply` so the white disappears into the board. Reveal it with `XC.writeOn` over
about 1 s. Drafts with Z-Image Turbo are usually enough for line art; use Nano Banana 2.1 when the
object needs more accuracy.

## Do and avoid

| Do | Avoid |
| --- | --- |
| Draw in reading order, in time with the words | Everything appearing at once |
| Colour that means something | Rainbow markers |
| Short handwritten labels, captions for sentences | Handwritten paragraphs |
| Pan to new board space for a new idea | Erasing and redrawing on the same spot repeatedly |
