# Mockups

Aim for 4-6 applications on the board. The HTML ones are exact and free; the photo ones sell the
brand in the physical world and come from PopNow.

## HTML mockups (built into `board.py build`)

Rendered from the real tokens and logo files, so they double as a test of the system:

- App screen, light mode, and a second screen in dark mode when `dark-*` tokens exist: title,
  search field, three list items from `brand.voice.samples`, one highlight, the primary button.
- Business card, front (lockup on the surface colour) and back (symbol on the primary colour,
  `.example` contact lines).
- Social post, 1:1, on the secondary colour with the social sample line in the display face.
- Signage: the reverse lockup on the dark surface with a wayfinding line.

If something looks wrong here (a button that is too loud, text that is too faint), fix the tokens,
not the board.

## Photo mockups (PopNow)

Good subjects: packaging (box, sleeve, bag, label), merchandise (tote, mug, notebook), storefront or
booth signage, a product on a desk. Two is usually enough.

**Default: edit with the logo as a reference.**

1. `python3 scripts/board.py png brand/assets/logo/lockup.svg --out brand/assets/logo/lockup.png --size 1024`
2. Add a generation to `brief.json`:
   ```json
   {
     "id": "mk-packaging", "stage": "mockups", "label": "Gift sleeve",
     "model": "google/nano-banana-2.1/edit", "image": "assets/logo/lockup.png",
     "prompt": "Product photo of <object> in <materials and brand colours>, the attached logo printed <where, how big> exactly as given, <setting>, <light>, shallow depth of field, no other text or logos",
     "aspectRatio": "4:3", "out": "assets/mockups/packaging.webp"
   }
   ```
3. Quote, ask, generate, move the file to `out`.
4. **Fidelity check.** Compare the printed logo with the SVG letter by letter and shape by shape.
   Generated images often change letters or proportions. If anything changed, do not ship that image.

**Fallback: blank scene + overlay.** Generate the same scene with "a blank label area facing the
camera, no text, no logos" (`google/nano-banana-2.1/text-to-image`), then place the SVG over the
blank area in HTML (absolute position, a small rotate/skew to match the surface, `mix-blend-mode:
multiply` on light materials). This is exact and also suits signage photos.

Optional finishing: `popnow/image-upscaler-v1/upscale` for print, `popnow/background-remover-v1/edit`
for a cut-out product on the brand colour.

## Rules

- People only as hands or from behind, prompt includes "no identifiable faces". No real people.
- No competitor products, logos or packaging shapes in the scene.
- Generated text is not allowed in mockups; any words come from the SVG logo or HTML.
- Captions say what the mockup is, not invented facts ("Notebook sleeve", not "Bestseller 2026").
