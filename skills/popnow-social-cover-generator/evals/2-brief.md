# Eval 2: a consistent YouTube thumbnail series

## Brief (same prompt for both runs)

> I run a cooking channel. Make thumbnails for the next three episodes so they look like
> a series: "Crispy rice, three ways", "The 10-minute dal" and "Bread without a mixer".
> Each should have the dish as a big cut-out on a bold color, and the episode number.
> Keep it cheap. No faces.

## Without the skill: what usually happens

- Three separate generations with the title inside the image: different typefaces each
  time, one title misspelled, the series does not read as a series.
- Titles of seven or eight words at a size that is unreadable in the mobile list view.
- The episode number placed bottom-right, exactly where YouTube puts the duration.
- Food photos with the original kitchen background, no cut-out, so the color field idea
  is lost.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| No series look | One spec, three outputs, same `bold-sans` layout and theme; only copy and subject change |
| Long titles | Platform `titleWords` cap (6) warns; titles are never shrunk below about twice the platform's minimum text size, and a title that cannot fit at that size fails the render |
| Number under the badge | Reserved zone check; the number goes in the kicker sticker at top-left |
| Dish on a busy background | Subject generated on a plain grey backdrop, then `popnow/background-remover-v1/edit`; `bold-sans` sets the cut-out on the color field |
| Cost | Lite: drafts with `alibaba/z-image-turbo/text-to-image` first, then one subject per episode at 1k plus a cut-out; flat color fields need no background generation |

## Acceptance checklist

- [ ] Three YouTube outputs share layout, colors and fonts; only the subject, title and number differ.
- [ ] No text inside the duration-badge zone; `render.mjs` exits 0.
- [ ] Every title is six words or fewer as rendered (shortened versions agreed with the user).
- [ ] Subjects are transparent cut-outs; no people appear.
- [ ] The plan was quoted as one total before any create; no backgrounds were generated (flat fields).
- [ ] Each file is under 2 MB.
- [ ] The overlay contact sheet was checked and shows the dish clear of the bottom-right corner.
