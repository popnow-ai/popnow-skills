# Eval 1: full kit for a local service with physical touchpoints

## Brief (paste as the user message)

> Brand kit for Fernway, a community bike repair co-op in a mid-size city. Members pay a small fee to
> use tools and get help from volunteer mechanics. It needs a logo for the door sign, stickers, small
> paper parts bags and a simple website. Friendly, practical, a bit scrappy, definitely not corporate.
> It must not look like the big sporting-goods chain in town (red and white, bold italic wordmark) or
> the city bike-share (bright blue, a wheel inside a circle).

Mode: full. Competitor colours the agent should record: chain `#E4002B` + `#FFFFFF`; bike-share
`#0072CE` + `#FFFFFF`.

## Without the skill, agents typically

1. Reach for the category clichés: a bicycle wheel or gear in a circle (the bike-share's mark), red or
   blue accents, a generic geometric sans.
2. Ask an image model for "a logo for Fernway" and ship the PNG, with misspelled or melted letters.
3. Write the wordmark as SVG `<text>` linked to a web font, so it renders differently everywhere.
4. Claim "accessible colours" without numbers; white text on a mid-yellow or light green fails.
5. Produce mockups whose signage and bags carry invented slogans or generated gibberish text.
6. Output a style guide as prose or a made-up JSON, not something other agents or design tools read.

## With the skill (rule or script that fixes each)

1. `references/directions.md` axes + `references/logo.md` "ideas from the brand's meaning, not the
   category's clichés"; the symbol is checked by eye against `avoid[].mark` (wheel in a circle).
2. `logo.md`: raster explorations are references only; the symbol is redrawn as SVG shapes;
   `lint_design.py` errors on rasters (`logo-raster`).
3. `scripts/wordmark.py text --font ...` outlines the word; `lint_design.py` errors on live text.
4. `brand.pairs` + `scripts/contrast.py --design` with floored ratios; `--fix` for failures.
5. `references/mockups.md`: HTML signage from tokens; photo mockups take the logo PNG as a reference
   and are rejected if letters drift; captions and samples may not invent claims.
6. `DESIGN.md` in the open format (+ `brand:`), `tokens.json` (DTCG), `tokens.css`; verified by
   `tokens.py check` and `lint_design.py`.
7. `plan.py check` blocks a direction whose palette repeats red-and-white or blue-and-white.

## Acceptance checklist

- [ ] Three directions differ on at least three axes; none uses a wheel-in-circle or gear symbol.
- [ ] `python3 scripts/plan.py check brand/brief.json` exits 0 (no look-alike palettes, no unsafe prompts).
- [ ] Credits were quoted and accepted before every generation; total within the SKILL.md estimate.
- [ ] `lint_design.py DESIGN.md --brief brand/brief.json` reports 0 errors (profile full).
- [ ] Wordmark, symbol, lockup, reverse and one-colour SVGs exist; all are outlined paths.
- [ ] Symbol reads at 16 px and in one colour (check the board's size row).
- [ ] Sticker or parts-bag mockup shows the real logo letter for letter, or uses blank + SVG overlay.
- [ ] Door-sign mockup uses the reverse lockup on the dark surface; wayfinding text is from `samples`.
- [ ] Voice has 3+ do/don't pairs that sound like a co-op ("Bring the bike, we'll find the tool"),
      not like a chain ("Unleash your ride").
- [ ] `brand-board.pdf` is one page and the HTML renders with the network off.
