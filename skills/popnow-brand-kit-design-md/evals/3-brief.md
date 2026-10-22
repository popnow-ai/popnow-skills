# Eval 3: existing raster logo, packaging, and a famous look to avoid

## Brief (paste as the user message, with `kettle-logo.jpg` attached)

> I run Kettle & Kin, a small neighbourhood tea shop. Here's our logo (a JPG of a kettle with a little
> heart in the steam). I want a proper brand kit: tins and paper bags for loose tea, a shop sign and
> Instagram posts. Cosy and a bit old-fashioned. We get told we look like the huge green coffee chain
> (green circle badge with a crowned figure), please fix that. And not like the big supermarket tea
> brand with the yellow and red label.

Mode: full. Competitor colours: coffee chain `#00704A` + `#FFFFFF`; tea brand `#FFD700` + `#E2231A`.

## Without the skill, agents typically

1. Auto-trace the JPG into an SVG with thousands of nodes, or wrap the JPG inside an `<svg>`
   (`<image href="data:...">`) and call it vector.
2. Keep the green circular badge layout that caused the confusion, just changing the icon.
3. Generate tin and bag mockups with melted lettering, or with a different kettle than the real logo.
4. Put a smiling barista in the shop-front photo (a person who does not exist presented as staff).
5. Add invented claims on packaging ("Award-winning since 1998", "Loved by 10,000 customers").

## With the skill

1. `references/logo.md` "If the user has a logo": redraw faithfully as clean SVG shapes, show it
   next to the original, ask before replacing; `lint_design.py` flags `logo-raster` and
   `logo-complexity` (auto-trace).
2. `contrast.py --avoid` / `plan.py check` reject a deep-green-plus-white palette; the logo check
   compares the lockup's silhouette with `avoid[].mark` (circle badge), so the lockup moves to a
   horizontal wordmark plus the kettle symbol.
3. Photo mockups use `google/nano-banana-2.1/edit` with the redrawn logo PNG as a reference and are
   checked letter by letter, or fall back to blank tins with the SVG overlaid in HTML.
4. `plan.py check` warns on people without "no identifiable faces"; `references/mockups.md` allows
   hands only.
5. `references/voice.md` and the Content rules: samples and captions may not invent awards, dates
   or customer counts.

## Acceptance checklist

- [ ] The kettle-and-heart idea survives; the redraw is under ~60 path commands and has no raster.
- [ ] The user was shown original vs redraw and approved before anything was replaced.
- [ ] No circular badge lockup; palette passes `contrast.py --avoid` against both competitors.
- [ ] Tin and bag mockups show the real logo exactly (or blank + overlay); no generated text.
- [ ] Shop-sign and Instagram mockups exist (HTML from tokens is fine); any people are hands only.
- [ ] No invented claims anywhere (packaging, captions, voice samples).
- [ ] `lint_design.py DESIGN.md --brief brand/brief.json` reports 0 errors; board PDF is one page.
- [ ] Credits were quoted before each stage and the user agreed; no automatic retries.
