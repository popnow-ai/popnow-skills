# Generating the mockups

The mockup is a picture of the finished page. It exists so the user can judge the look
before any code is written, and so the build has a concrete target instead of a vague
adjective. It is not a spec for body copy: image models garble long paragraphs, and the
real copy comes from the brief.

## Model and size

| What | Model | Settings | About |
| --- | --- | --- | --- |
| Full-page mockup (default) | `openai/gpt-image-2/text-to-image` | `aspect_ratio 1:3`, `resolution 4k`, `quality medium` | 30-35 credits each |
| Sharper type for a final review | same | `quality high` | about 4x the medium price |
| Cheap layout sketch before spending on the real one | `alibaba/z-image-turbo/text-to-image` | `--aspect-ratio 9:16` | about 10 credits; text will be wrong |
| Change one section of a chosen mockup | `google/nano-banana-2.1/edit` | `--image <mockup>`, describe the change | 35-75 credits |

Prices move: always run `python3 scripts/popnow.py model <id>` (free) to see the current
fields and options, and `quote` for the real number. `python3 scripts/popnow.py models
--modality image` lists what is available today.

The 1:3 canvas at 4k is close to real scale for a 1440 px wide page, so headline sizes
and section heights can be read off the image almost directly.

## Building the prompts

```bash
node scripts/mockup-prompts.mjs brief.json --out work/prompts.json          # 3 directions
node scripts/mockup-prompts.mjs brief.json --out work/prompts.json --lite   # 1 direction, hero + 3 sections
node scripts/mockup-prompts.mjs brief.json --directions swiss-grid,type-led  # force picks
```

It writes `prompts.json` and one request file per mockup in `mockups/` (prompt, aspect
ratio, resolution, quality), finds `DESIGN.md` on its own (`--design` to point at one,
`--no-design` to ignore it), and prints the axis distance between the picks.

Each prompt follows the same order, which matters for image models:

1. What it is (a landing page mockup for X, made for Y).
2. How it is framed (flat, front-on, 1440 px wide, whole page, no device or browser).
3. The art direction in visible terms: palette words with roles, type, layout, imagery.
4. Brand constraints from `DESIGN.md` when present.
5. Numbered sections, top to bottom, each with its exact short strings in quotes and a
   layout instruction that differs from the section before it.
6. Text rules: spell quoted strings exactly; paragraphs as short lines of small text.
7. An explicit avoid list: the machine-made habits plus the direction's and brief's own.

Keep quoted strings short (headline, buttons, nav, feature titles, plan names and
prices). Long sentences in quotes come back misspelled.

## Spending

```bash
python3 scripts/popnow.py model openai/gpt-image-2/text-to-image                     # free
python3 scripts/popnow.py quote --model openai/gpt-image-2/text-to-image --input-file mockups/A-warm-editorial.json
python3 scripts/popnow.py balance
```

Quote every mockup, then tell the user one total and their balance ("Three mockups,
about 100 credits; you have 4,200. Go ahead?"). Create only after a clear yes, with the
quoted number:

```bash
python3 scripts/popnow.py create --model openai/gpt-image-2/text-to-image \
  --input-file mockups/A-warm-editorial.json --confirm-credits <quoted> --download mockups/A-warm-editorial
```

A failed task is refunded and is not retried automatically. A redo is a new paid run:
ask first.

## Reading the results

- Check each image against the brief: are all sections there, in order, with the quoted
  strings spelled right? Misspelled body text is fine; a misspelled headline means the
  mockup cannot be shown to stakeholders as is.
- If two mockups came out too similar, say so and offer one re-roll of the weaker one
  with a stronger push on its distinct axis (for example a darker value or a different
  imagery type). Quote it first.
- If a section is wrong in an otherwise good mockup, prefer an edit of that section with
  `google/nano-banana-2.1/edit` over a full re-roll.
- Optional: a mobile mockup of the chosen direction (`aspect_ratio 9:21`, one column,
  same sections) helps when the user cares about phones first. Quote it separately.

## Without a PopNow key

Tell the user they can create a key at https://popnow.ai/api/console/keys. Meanwhile:

- Write the three directions as short boards instead: palette swatches, type pairing,
  a wireframe of the hero and one section, built in HTML and screenshotted with
  `scripts/shoot-diff.mjs shoot`. That is a free, cruder version of the same choice.
- Or ask for two or three reference screenshots of pages the user likes and treat the
  chosen one as the mockup (describe what to take from it in visible terms; never copy
  someone else's brand).
