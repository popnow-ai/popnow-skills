# Layout systems

Seven layouts, each written once in `templates/layouts.mjs` (structure) and
`templates/covers.css` (style), and each adapting to three canvas shapes: landscape
(wider than 1.2:1), portrait (0.6:1 to 1.2:1, includes square) and tall (App Store).
Pick per output; mixing layouts across a set is normal (the bold one for X and YouTube,
the calm one for LinkedIn and Open Graph).

All sizes are in canvas units, so the same layout reads correctly at 1200 x 630 and at
1290 x 2796. The title (or the number in `data-callout`) is fitted: it grows or shrinks
until it fills its box, within a minimum that keeps it legible on that platform. If it
does not fit at the minimum, the renderer fails the output and asks for fewer words.

| Layout | Look | Best for | Pictures | Copy it uses |
| --- | --- | --- | --- | --- |
| `editorial-serif` | Paper background, large serif headline, mono kicker with a rule, a framed picture plate with caption | Articles, essays, docs, thoughtful launches; Open Graph, LinkedIn | optional plate: the background, or the subject with `"plate": "subject"` | kicker, title, subtitle, cta, caption |
| `bold-sans` | Full-bleed color field (or photo with a shade), huge condensed uppercase headline, rotated sticker label, outlined pill | Announcements, video thumbnails, X | optional background photo (`"background": false` for the flat field), optional subject cut-out | kicker, title, subtitle, cta |
| `split-photo` | Photo fills one half, text panel on the other; `"flip": true` mirrors | Product shots, places, people (with consent), LinkedIn | background (required; a pattern is drawn if missing) | kicker, title, subtitle, cta (as a button) |
| `sticker-collage` | Dotted paper, die-cut subject with white outline, tilted label card with tape, round stamp, handwritten note with arrow | Playful launches, consumer apps, RedNote, Instagram | subject cut-out (transparent PNG) | kicker, title, subtitle, cta, badge, note |
| `minimal-mono` | Plain page on a faint 12-column grid, mono path line, large medium-weight headline, rule and mono call to action | Developer tools, changelogs, engineering posts | optional small thumbnail with `"thumb": true` | kicker, caption, title, subtitle, cta |
| `data-callout` | One giant number with its unit, a label, a source line, optional bar chart | Results, benchmarks, pricing facts | none | kicker, title (as context), stat.value, stat.unit, stat.label, stat.source, stat.series |
| `device-showcase` | Headline above a phone frame that bleeds off the bottom, flat accent disc behind | App Store screenshots, app launches | screens[] (your own screenshots); optional background with a top shade | kicker, title, subtitle |

## Copy rules

- `*word*` marks emphasis (italic in `editorial-serif`, the accent color elsewhere).
  `\n` asks for a line break. Everything else is plain text, escaped.
- Titles: one idea, usually 3-9 words. The renderer warns past the platform's cap.
- Subtitles: one sentence. Thumbnails usually do without one (set `"subtitle": ""`).
- `stat.value` must be a real number with a real source; `stat.source` is printed.
- Use `badge` and `note` only in `sticker-collage`; elsewhere they are ignored.

## Brand mode

When the project has a `DESIGN.md` with a display font (or the spec sets
`theme.fonts.title`), every layout sets its title in that font and weight, so a set of
covers stays on brand while keeping each layout's structure. Colors come from the same
file. To keep the layouts' own type (serif, condensed) and only take the colors, set
`theme.fonts.title` to an empty string in the spec.

## Picking quickly

- A link preview that should look considered: `editorial-serif`.
- Something that must stop a scroll: `bold-sans`.
- A good photo exists or will be generated: `split-photo`.
- A mascot, product or object you can cut out: `sticker-collage`.
- An audience that dislikes marketing: `minimal-mono`.
- One number tells the story: `data-callout`.
- An app: `device-showcase`.

## Extending

Add a function to `LAYOUTS` in `templates/layouts.mjs` that returns the markup for the
cover body, mark every text element with `data-text="title|body|small"`, and give the
element that should fill its box `data-fit="minT,maxT"`. Add its styles under a new
`.L-name` block in `covers.css`, using `--u` for geometry and `--t` for type, and the
three shape classes for layout changes. The self-test renders every layout.
