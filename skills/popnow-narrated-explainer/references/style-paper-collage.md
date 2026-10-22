# Style: paper collage

Everything on screen is a piece of paper that someone cut, tore and stuck to a kraft board. It feels
handmade and friendly, carries ideas well, and forgives simple shapes: a folder, a page, a sticky
note and a strip of tape explain a lot. The sample video at https://popnow.ai/skills/narrated-explainer
("How agent skills work") is built in this style.

## Look

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--bg-2` | `#d6bf9c` / `#cdb18a` | Kraft board, lit from the top left |
| `--paper` / `--paper-2` | `#f7f0e3` / `#ece0c8` | Cards, pages, tabs |
| `--ink` | `#231d18` | Text, dark paper |
| `--accent` | `#df5139` tomato | One highlight per frame |
| `--accent-2` | `#2e7a74` teal | Second colour |
| `--accent-3` | `#efb64a` mustard | Stickers, notes |
| `--accent-4` | `#9cc3d8` sky | Notes, quiet shapes |
| `--grain` | 0.42 | Paper fibre overlay (SVG noise, local) |

Type: a condensed poster face for headlines (`display`), a clean sans for captions and labels
(`body`), a handwriting face for notes and labels (`hand`).

## Materials

- **Torn paper:** `.x-cut > .x-face[data-tear="tb"]`. `XC.paper(root)` tears every face with a
  deterministic edge (edges `t`, `r`, `b`, `l`; depth in `--u`). Torn strips for list items and code
  lines, straight cuts for folders and windows: mixing both reads as real paper.
- **Shadow:** `.x-cut` gives a two-layer shadow (a crisp contact edge and a soft lift). Keep one
  light source; pieces higher in the stack do not get a stronger shadow.
- **Tape:** `<i class="x-tape">` across a corner or the top edge; slightly transparent, multiply blend.
- **Headline slips:** each `.x-w` of an `.x-h1` becomes a slip in rotating colours. Two to six words.
- **Stickers and badges:** circles in accent colours (`XC.pop`). One per frame at most.
- **Hand notes:** `.hand` text on a paper slip or straight on the board, for labels and asides.

## Motion

- Pieces are **slapped down**: they arrive from off the board with a few degrees of extra spin and
  settle at a stamped tilt (`XC.drop`, `back.out(1.5)`, 0.5 s). The settled tilt is between -3 and +3
  degrees; nothing is perfectly straight, nothing is crooked enough to read as a mistake.
- Builds land on the words (`marks`): a sticky note per named item, a tag per labelled part.
- Scene change: the board **peels up** and away (0.3 s) while the next board's first piece arrives.
- No idle wobble. A piece moves when it arrives, when it leaves, or when the narration acts on it.
  If the frame feels static, add a mark, not a loop.
- Stagger 0.08 s for groups (headline slips, tabs). Twenty or more small pieces can arrive in under a
  second as a flurry (the sample's drawer of 24 tabs), which reads as "lots".

## Composition

- Keep the bottom 17% free for the caption strip (dark ink tape).
- One focal object per beat, placed off-centre, with smaller pieces around it. Let the kraft show:
  40-50% of the board empty is right.
- Overlap pieces so they read as stacked paper (a page coming out of a folder, a tag over the page edge).
- Draw with simple shapes: folders, pages, windows, notes, tags, arrows cut from paper. Avoid detailed
  illustration in CSS; use a generated cut-out instead.

## PopNow cut-outs (optional)

When a beat needs an object the kit cannot draw well (a heat pump, a card-catalog drawer, a city
skyline), generate it as a paper cut-out and remove the background:

```bash
python3 $SKILL/scripts/popnow.py quote --model google/nano-banana-2.1/text-to-image --aspect-ratio 4:3 \
  --prompt "Flat paper cut-out illustration of <object>, layered construction paper in tomato red, \
teal, mustard and cream, visible paper fibres and slightly uneven scissor edges, soft drop shadow, \
isolated on a plain white background, no text, no letters, no logos"
# after a yes: create ... --confirm-credits <N> --download assets/raw
python3 $SKILL/scripts/popnow.py quote --model popnow/background-remover-v1/edit --image assets/raw/<file>.png
# after a yes: create ... --download assets/   -> transparent PNG
```

- Name the palette in the prompt so the cut-out matches the tokens. For a series, pass an approved
  cut-out as a reference to `google/nano-banana-2.1/edit` ("same paper style and palette, now a ...").
- Cheap drafts first with `alibaba/z-image-turbo/text-to-image`, then the final with Nano Banana.
- Never generate people who exist, logos, or text. Labels are HTML on top of the cut-out.
- Place it in an `.x-cut` wrapper and bring it in with `XC.drop` like any other piece.

## Do and avoid

| Do | Avoid |
| --- | --- |
| Two or three accent colours per frame | All seven colours on one board |
| Tilt everything a little, deterministically | Random jitter every frame (it flickers and breaks seeking) |
| Short words on slips, full sentences in captions | Paragraphs on paper |
| One sticker or badge per frame | Stickers on every piece |
