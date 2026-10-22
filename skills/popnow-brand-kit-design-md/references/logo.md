# Logo: wordmark, symbol, lockups

The master logo files are SVG drawn as shapes: no live text, no embedded images, no gradients or
filters. Raster images (from PopNow or the user) are references for drawing, never the logo itself.
`lint_design.py` enforces this.

## Wordmark

1. Start from an open-licensed font that fits the direction, usually the display face. Get the
   TTF/OTF (see `typography.md`).
2. Set the word and outline it:
   ```bash
   python3 scripts/wordmark.py text --font fonts/Newsreader.ttf --text "Lumen Notes" \
     --axis wght=560 --axis opsz=60 --tracking -6 --color "#2B2722" --out brand/assets/logo/wordmark.svg
   ```
   - `--axis` pins variable axes (weight, optical size, width).
   - `--tracking` adds or removes space between all letters, in 1/1000 em. Display sizes usually
     want -5 to -15; all-caps wordmarks want +40 to +100.
   - The font's own kerning is applied. Fix uneven pairs by eye with `--kern "Lu=-10,ot=-6"`.
   - `--alt a=a.ss01` swaps in a stylistic alternate when the font has one; one distinctive letter
     is often enough to make a set word feel owned.
3. Render it (`python3 scripts/board.py png brand/assets/logo/wordmark.svg --out /tmp/wm.png --size 1200`),
   look at it large and at 96 px wide, and adjust spacing until the gaps between letters look even.
   Reading the PNG back is part of the job; numbers alone do not make a good wordmark.
4. Without fontTools, `--draft --family "<Family>"` writes a live-text preview. It is fine for
   choosing, and the linter rejects it for delivery.

## Symbol (optional)

1. List three to five ideas that come from the brand's meaning, not from the category's clichés
   (lightbulbs for ideas, leaves for nature, speech bubbles for chat).
2. Optional PopNow exploration, one sheet with several ideas, quoted first:
   ```
   A sheet of six flat black symbol sketches on white, each centred in its own square cell:
   <idea 1>, <idea 2>, ... Simple geometric shapes, even thick strokes, no gradients, no text, no letters
   ```
   Model: `openai/gpt-image-2/text-to-image` (3:2). Save to `brand/assets/explorations/`.
3. **Redraw** the chosen idea by hand in SVG: a 24 or 48 unit grid, a handful of shapes (rects,
   circles, simple paths with arcs), `fill-rule="evenodd"` for cut-outs, corner radii from the shape
   tokens, one colour. Aim for under 30 path commands. Do not auto-trace the raster.
4. Check it: recognisable at 16 px, works in one colour and reversed, survives a squint (blurred,
   it is still a distinct silhouette), and does not resemble any `avoid[].mark` in silhouette,
   initial or concept. If it does, change the idea, not the colour.

## Lockup and variants

```bash
python3 scripts/wordmark.py lockup --symbol brand/assets/logo/symbol.svg --wordmark brand/assets/logo/wordmark.svg \
  --gap 0.42 --symbol-scale 1.08 --title "Lumen Notes" --out brand/assets/logo/lockup.svg
python3 scripts/wordmark.py recolor brand/assets/logo/wordmark.svg --color "#EEE7DC" --out brand/assets/logo/wordmark-reverse.svg
python3 scripts/wordmark.py recolor brand/assets/logo/symbol.svg --color "#2B2722" --out brand/assets/logo/symbol-mono.svg
python3 scripts/board.py png brand/assets/logo/lockup.svg --out brand/assets/logo/lockup.png --size 1024
```

`--symbol-scale` sets the symbol height relative to the wordmark height; optically the symbol
usually needs to be a little taller than the capitals. `--layout stacked` puts it above the word.
The PNG is only for uploading as a reference image to PopNow mockups.

Record the files in DESIGN.md:

```yaml
brand:
  logo:
    wordmark: brand/assets/logo/wordmark.svg
    wordmarkReverse: brand/assets/logo/wordmark-reverse.svg
    symbol: brand/assets/logo/symbol.svg
    symbolMono: brand/assets/logo/symbol-mono.svg
    lockup: brand/assets/logo/lockup.svg
    minWidthPx: 96
    symbolMinPx: 16
    clearspaceRatio: 0.5
```

`clearspaceRatio` is the clear space on every side as a fraction of the logo height. The Logo
section of DESIGN.md says which version to use where and lists the misuses the board shows
(stretching, rotating, recolouring outside the palette, effects).

## If the user has a logo

Keep it. If it is raster, redraw it faithfully as SVG (same proportions, cleaner curves), show the
redraw next to the original, and ask for approval before replacing anything. If they have an SVG,
run it through `lint_design.py` and fix embedded rasters or live text.
