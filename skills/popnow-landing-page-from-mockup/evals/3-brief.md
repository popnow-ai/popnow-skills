# Eval 3: redesign with a DESIGN.md, lite mode

## Brief (same prompt for both runs)

> Our pottery studio's page looks like a template (attached: `old/index.html`). Redesign
> it, quick and cheap please (lite). Use our `DESIGN.md` (clay #B5562E on oat #EFE6D8,
> ink #2B2420, Fraunces for headings, Work Sans for text). We sell six-week wheel
> classes for $240 and open studio passes for $35 a session. Photos: we have none yet.

The attached `old/index.html` has a centered hero with an emoji vase, three identical
cards, "Unleash your creativity" and a "Join 500+ happy potters" band.

## Without the skill: what usually happens

- Restyles the old page in place: same centered hero, same three cards, new colors.
- Drops the brand fonts for Inter, or loads them but never applies them to headings.
- Keeps "Join 500+ happy potters" because it was already there.
- Generates (or links) stock photos of hands on a wheel without asking about cost, or
  leaves gray boxes with no note about what goes there.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| Restyle instead of redesign | Lint the old page first (`ai-tells.mjs old/`), then one new mockup in lite mode |
| Brand ignored | `DESIGN.md` is read by `mockup-prompts.mjs` (brand colors fixed, fonts named in the prompt) and by `ai-tells.mjs` (Fraunces and Work Sans are not flagged as defaults) |
| Unsourced number kept | `unsourced-proof` flags "500+"; content rules: keep only if the user confirms it |
| Photos | Lite: reuse the mockup's picture region as the hero stand-in, or a quoted clean regeneration; every stand-in listed in the delivery note |
| Cost surprise | One mockup, one quote, one total before any `create` |

## Acceptance checklist

- [ ] `ai-tells.mjs old/` was run and its findings were shown to the user before the redesign.
- [ ] Exactly one mockup (lite), hero plus three sections, brand colors and fonts named in its prompt.
- [ ] Headings render in Fraunces and body in Work Sans (QA reports no missing fonts).
- [ ] "500+" is gone unless the user confirmed it.
- [ ] No emoji; the vase is a picture slot or an SVG, not a character.
- [ ] Contrast of clay on oat is checked; if clay text fails 4.5:1, it is used for large text or buttons with light text only.
- [ ] One review round: QA clean at 1440 and 390 px; delivery note lists the stand-in photos.
- [ ] Total credits spent are reported and are in the lite range (one mockup plus at most one image).
