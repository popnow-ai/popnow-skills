# Brief: questions and `brand/brief.json`

## Ask at most six questions

Skip anything the user already said. One message, numbered, with an example answer for each:

1. **What is it, in one sentence, and who is it for?** ("A notes app for researchers who work late.")
2. **Three or four personality words**, plus one word it must never feel like. ("calm, warm, clever; never corporate")
3. **Who must it not be confused with?** Names, and if known their main colours and what their logo
   looks like. ("The big blue one with a bird" is enough to start; ask for hex codes only if handy.)
4. **Anything to keep?** Existing name styling, logo, colours, fonts, photos. Raster logos are kept as
   reference and redrawn as SVG.
5. **Where will it show up first?** App, website, packaging, signage, social, slides.
6. **Full kit or lite?** Full: directions, logo, mockups, board. Lite: palette, type and voice only.

If the user says "just do it", assume full mode, pick sensible personality words from the product
description and state your assumptions in the first reply.

## Look-alike homework

For each competitor, record what makes it recognisable: the one or two signature colours, the shape
of the mark (silhouette, initial, mascot) and the type style. Describe it in words in `avoid[].mark`.
Do not download, trace or embed a competitor's logo anywhere in the kit.

## `brand/brief.json`

```json
{
  "request": "the user's words, verbatim",
  "product": { "name": "Fernway", "what": "One-sentence description.", "stage": "pre-launch", "surfaces": ["app", "web", "signage"] },
  "audience": "Who it is for, in one sentence.",
  "personality": ["calm", "warm", "clever"],
  "mode": "full",
  "existing": { "logo": null, "colors": [], "fonts": [], "notes": "" },
  "avoid": [
    { "name": "Competitor", "colors": ["#1B2A4A", "#C9A227"], "mark": "Gold quill over a navy shield." }
  ],
  "fontFiles": { "Family Name": "assets/fonts/family-latin-wght-normal.woff2" },
  "directions": [
    {
      "id": "A", "name": "Lamplight", "summary": "One or two sentences.",
      "keywords": ["warm", "editorial"],
      "palette": { "ink": "#2B2722", "paper": "#FBF8F2", "accent": "#B5541E", "glow": "#F4C9A8", "support": "#4C6A5C" },
      "fonts": { "display": "Newsreader", "body": "Atkinson Hyperlegible Next", "accent": "optional" },
      "voice": "A sample headline in this direction's voice.",
      "tiles": ["dir-a-1", "dir-a-2", "dir-a-3"]
    }
  ],
  "picked": "A",
  "revisions": [ { "step": "palette", "what": "What changed.", "why": "Which check or feedback caused it." } ],
  "generations": [
    {
      "id": "dir-a-1", "stage": "directions", "direction": "A", "label": "Lamp on paper",
      "model": "alibaba/z-image-turbo/text-to-image",
      "prompt": "Specific, visual, ends with 'no text'.",
      "aspectRatio": "1:1",
      "out": "assets/moodboard/a-1.webp",
      "status": "pending"
    }
  ]
}
```

Rules the checker (`scripts/plan.py check`) enforces:

- `product.name`, `product.what`, `audience` and 2+ `personality` words are required.
- `avoid[].colors` must be CSS colours; each direction palette is compared against them, and a
  palette that repeats a competitor's colour pairing is an error before anything is shown.
- `generations[].stage` is `directions`, `symbol`, `mockups` or `extras`; ids are unique; `out` is a
  relative path ending in `.png`, `.jpg` or `.webp`; reference `image` files must exist.
- Prompts may not name a competitor, ask for a trademark or "in the style of <Name>"; prompts with
  people must say "no identifiable faces" (hands or backs only); symbol prompts must say "no text".
- Paths in `brief.json` are relative to the `brief.json` folder (`brand/`). Paths in DESIGN.md are
  relative to DESIGN.md (the project root), so they start with `brand/assets/...`.

Keep `revisions` honest: every time a check changes a colour or a font, write one line. It is the
best evidence that the kit was checked, and the board does not need it.
