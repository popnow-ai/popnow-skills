# Eval 1: launch set from one message

## Brief (same prompt for both runs)

> We ship Fieldkit 2.0 tomorrow: offline maps, photos and notes for survey crews, now
> syncing automatically when you are back in range. Make the share images for the
> launch: Open Graph for the blog post, X, LinkedIn, RedNote, YouTube (for the demo video)
> and Instagram. Our beta crews saved 3.4 hours per survey day on average (41 crews).
> Use our DESIGN.md. A photo of a ridge trail at dusk would suit.

## Without the skill: what usually happens

- Asks an image model for "a launch banner with the text Fieldkit 2.0" six times: the
  headline comes back misspelled or with invented letters in some of them, and every
  re-roll costs credits.
- Or writes one HTML banner and screenshots it at a single size, then crops or squashes
  it for the other platforms: titles cut off on 4:5 and 3:4, text under the YouTube
  duration badge.
- White text over the brightest part of the photo; tiny subtitles that vanish at feed
  size; a 2.6 MB PNG for YouTube that the upload rejects.
- The 3.4 hours figure appears without its source, or the number is rounded up.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| Misspelled headlines | Text is HTML in bundled fonts; generation prompts always end with "no text, no letters, no logos" |
| One size squashed into six | Seven layouts that adapt to landscape, portrait and tall; platform presets with safe areas (`scripts/lib/platforms.mjs`) |
| Text under the duration badge | YouTube reserved zone; `render.mjs` fails any text that touches it; `cta` is dropped from thumbnails |
| Unreadable text on the photo | Contrast measured on the rendered pixels; `shade` and `focus` to fix; background prompt asks for a calm area where the headline sits |
| Oversized files | Budget and hard limit per platform; JPEG fallback when a PNG is over the limit |
| Unsourced number | `data-callout` prints `stat.source`; content rules |
| Credits spent blindly | `bg-plan.mjs` plans one background per canvas shape and prints quote commands; total given before any create |

## Acceptance checklist

- [ ] One spec file, six outputs, at least three different layouts across them.
- [ ] First render happened before any generation and was shown to the user.
- [ ] `bg-plan.mjs` planned at most two backgrounds (landscape and portrait) and the user got one credit total.
- [ ] `render.mjs` exits 0: exact sizes, no text outside safe areas, nothing under the duration badge, all contrast checks pass.
- [ ] The YouTube title has six words or fewer; the YouTube file is under 2 MB.
- [ ] The data cover shows "3.4 h" with "Fieldkit beta, 41 crews" as its source.
- [ ] Colors and title font come from DESIGN.md (no font fallback warnings).
- [ ] The delivery note names the file to use for `og:image` and includes width and height meta tags.
