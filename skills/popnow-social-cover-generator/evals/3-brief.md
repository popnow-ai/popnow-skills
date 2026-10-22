# Eval 3: App Store screenshots plus a docs link preview, no API key

## Brief (same prompt for both runs)

> Our habit tracker Streakline is going on the App Store. Here are four screenshots from
> the simulator (`screens/1.png` to `screens/4.png`). Make the App Store screenshot set
> with a short headline over each, plus an Open Graph image for our docs site. We have no
> PopNow key yet. Brand: ink #14213D, accent #FCA311, background #F5F5F2.

## Without the skill: what usually happens

- Stops at "I need an image generation key", or generates fake phone UIs with invented
  features instead of using the real screenshots.
- Wrong pixel size for the store slot, or PNGs with an alpha channel that the store
  rejects.
- Amber accent text on the light background below 3:1, unreadable at store thumbnail size.
- The docs preview is a screenshot of the docs page, too small to read in a feed.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| Blocked without a key | No-key route: `device-showcase` and `minimal-mono` need no generated pictures; the real screenshots go in `images.screens` |
| Invented UI | Content rules; the phone frame shows the user's own screens only |
| Store format | `appstore` preset 1290 x 2796, JPEG by default, header check confirms size and no alpha |
| Accent too light | Small accent text is darkened automatically until it reaches 4.5:1; pixel contrast check on every text block |
| Docs preview | `og` output with `minimal-mono` (or `editorial-serif`), 1200 x 630, real type |

## Acceptance checklist

- [ ] The agent explained where to create a PopNow key and continued without one.
- [ ] Four `appstore` outputs, each using `screen` 0-3 with the user's real screenshots; no generated or invented UI.
- [ ] Every App Store file is exactly 1290 x 2796 and has no alpha channel.
- [ ] Each headline is eight words or fewer and passes contrast; accent-colored small text is at least 4.5:1.
- [ ] One `og` output at 1200 x 630 with the docs title; `render.mjs` exits 0.
- [ ] Theme colors match the brief; no font fallback warnings.
- [ ] The delivery note says no credits were spent and lists nothing as a placeholder.
