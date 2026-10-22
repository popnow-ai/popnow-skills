# Review loop: screenshot, compare, fix

After each build pass, look at the page the way a visitor will, and against the mockup.

```bash
node scripts/shoot-diff.mjs review site/index.html --mockup mockups/A-warm-editorial/mockup.png --out review
# with a phone mockup as well:
node scripts/shoot-diff.mjs review site/index.html --mockup m.png --mobile-mockup m-mobile.png --out review
# a dev server works too:
node scripts/shoot-diff.mjs review http://localhost:5173 --mockup m.png --out review
```

It uses the local Chrome, Chromium or Edge in headless mode (set `CHROME_PATH` if it is
somewhere unusual). If Playwright is installed in the project it is used when no Chrome
is found, or always with `BROWSER_ENGINE=playwright`. Nothing else is needed. Reduced
motion is on by default so scroll-reveal content shows up; add `--motion` to keep
animations.

## What it writes

| File | What |
| --- | --- |
| `review/shot-1440.png`, `review/shot-390.png` | Full-page screenshots (`--widths` to change) |
| `review/qa.json` | Per width: sideways overflow and the elements causing it, broken images, images without alt, text below 4.5:1 (or 3:1 when large) against its background, text under 12 px on phones, tap targets under 40 px tall or 24 px wide, fonts that silently fell back, `h1` count, console errors |
| `review/compare-desktop.png` | Mockup and build side by side, sections outlined and linked; green matched, amber check, red missing or very different |
| `review/compare-desktop.json` | Sections of each, palette of each, the accent, and the deltas |

## Reading the deltas

The comparison is deliberately coarse: it measures structure and color, not pixels,
because a coded page will never be pixel-identical to a generated picture.

| Delta | Usually means | Usual fix |
| --- | --- | --- |
| First screen background or weight differs | Hero built on the wrong surface or centered when the mockup is asymmetric | Match the hero layout first; it is most of the impression |
| Section missing / extra | A mockup section was skipped or a habitual one was added | Add it, or remove the extra unless the brief needs it |
| Section takes a much larger share | Padding or type too large, or content stacked | Tighten padding, check the type scale against the mockup |
| Build is much longer overall | Same, across the page | Reduce vertical padding by a third and re-shoot |
| Background color differs | Token mismatch | Re-read the palette; use `image-tools.mjs palette` |
| Composition differs (left-weighted vs centered) | Alignment changed | Restore the mockup's alignment |
| Accent barely used / overused | The one accent was dropped or sprayed everywhere | Put it where the mockup has it (often one button and links) |
| Color in build not in mockup | A default color crept in | Replace with a token |

Always also open the side-by-side image and look. Write a short list of what still
differs (type feel, image crops, missing details) before the next pass.

## When to stop

- QA is clean at both widths (no overflow, no broken images, no contrast failures, one
  `h1`, no console errors).
- No red sections in the compare image, and the first-screen deltas are gone.
- `scripts/ai-tells.mjs` passes.
- Three passes at most. Remaining differences go in the delivery note with a reason
  (for example "mockup body text was illegible; used the brief's copy, so paragraphs
  are longer than drawn").
