# Three directions that really differ

Three variations of the same idea waste the user's choice. Before writing palettes, place each
direction on these axes and make sure every pair of directions differs on at least three:

| Axis | One end | Other end |
| --- | --- | --- |
| Temperature | warm paper, amber, clay | cool white, steel, signal green |
| Type genre | editorial serif, humanist | grotesque, geometric, mono, hand |
| Shape | soft, rounded, organic | crisp, square, ruled |
| Density | airy, few elements | dense, informational, gridded |
| Picture world | photography of materials and light | flat graphics, diagrams, illustration |
| Energy | quiet, slow, low contrast | lively, saturated, high contrast |

Then give each a two-word name that describes what you would see ("Lamplight", "Graph paper",
"Margin notes"), never a company or product name.

## What each direction needs

- `palette`: 4-5 colours with plain names (`ink`, `paper`, `accent`, `glow`, `support`). Ink on
  paper must pass 4.5:1 and the accent must carry white or ink text at 4.5:1; `directions.html`
  prints both ratios.
- `fonts`: display and body from `typography.md` (an `accent` face is optional).
- `voice`: one headline written in that direction's voice.
- `keywords`: four adjectives.
- `tiles`: three moodboard prompts (ids of `generations` with `stage: directions`).

## Defaults to steer away from

Unless the brief asks for them, avoid the look that generated brands fall back to: violet or blue-to-
pink gradients, one generic UI sans for everything, glassmorphism, glowing "AI" orbs, a centred hero
with three cards, emoji as icons, and stock-photo smiles. At most one of the three directions may be
the "safe" option, and it should still have one distinctive choice (type, colour or shape).

## Moodboard prompt recipe

Pictures carry material, light and mood. Type, colour swatches and the logo are rendered in HTML,
because generated lettering is unreliable. One prompt per tile:

```
<subject or material>, <setting>, <light>, <palette words using the direction's colours>,
<composition: close-up / overhead / wide>, <mood word>, no text
```

Tile plan per direction: (1) the hero scene, (2) a material or texture macro, (3) an object or
hands-at-work detail. People only as hands or from behind, always with "no identifiable faces".

Examples:

- "Close-up of a brass desk lamp casting warm light across an open cream paper notebook at night,
  linen texture, pale wood desk, shallow depth of field, ember and cream tones, calm, no text"
- "Overhead flat lay of graph paper, a mechanical pencil, a steel ruler and small green index tabs
  on a cool off-white desk, crisp daylight, precise and orderly, no text"

Drafts use `alibaba/z-image-turbo/text-to-image` at 1:1. After the user picks, optionally re-run the
three tiles of the chosen direction with `google/nano-banana-2.1/text-to-image` for the board.

## Showing the choice

1. `python3 scripts/plan.py check brand/brief.json` (fix every error: a look-alike palette or an unsafe
   prompt is cheaper to fix now than after generation).
2. `python3 scripts/board.py directions brand/brief.json --out brand/directions.html` renders the page
   with placeholders. Quote the nine tiles, ask once, generate, move each file to its `out` path,
   rebuild the page.
3. Ask: "Which direction, and is there anything you want to borrow from another one?" Record the
   answer in `picked` and any borrowing in `revisions`.
