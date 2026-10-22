# Cover spec (JSON)

One file describes the whole set. Paths are relative to the spec's folder. Anything set
on an output overrides the shared value for that output only.

```json
{
  "name": "Fieldkit 2.0 launch",
  "design": "DESIGN.md",
  "theme": { "accent": "#C8402A", "accentInk": "#FFFFFF", "fonts": { "title": "Fraunces" } },
  "fonts": [{ "family": "Brand Sans", "src": "fonts/brand-sans.woff2", "weight": "300 800" }],
  "brand": { "name": "Fieldkit", "logo": "assets/logo.svg" },
  "copy": {
    "kicker": "Release 2.0",
    "title": "Field notes that *sync* themselves",
    "subtitle": "Offline maps, photos and notes in one place.",
    "cta": "fieldkit.example/2",
    "caption": "Fig. 1, ridge trail at dusk",
    "badge": "Free update",
    "note": "works offline",
    "stat": { "value": "3.4", "unit": "h", "label": "saved per survey day", "source": "Fieldkit beta, 41 crews, 2026", "series": [1.1, 1.8, 2.6, 3.4] }
  },
  "images": {
    "background": {
      "landscape": "assets/gen/background-landscape",
      "portrait": "assets/gen/background-portrait",
      "focus": "65% 40%",
      "shade": 0.5,
      "prompt": "A ridge trail at dusk seen from behind a hiker, film photograph"
    },
    "subject": { "src": "assets/gen/subject", "prompt": "A rugged yellow field tablet" },
    "screens": ["assets/screens/map.png"]
  },
  "defaults": { "quality": 86 },
  "outputs": [
    { "id": "og", "platform": "og", "layout": "editorial-serif" },
    { "id": "x", "platform": "x", "layout": "bold-sans", "copy": { "title": "Fieldkit 2.0 is *out*" } },
    { "id": "yt", "platform": "youtube", "layout": "bold-sans", "background": false, "theme": { "em": "#FFFFFF" } },
    { "id": "header", "width": 1500, "height": 500, "layout": "minimal-mono", "safe": { "top": 60, "right": 60, "bottom": 60, "left": 60 } }
  ]
}
```

## Top level

| Key | Meaning |
| --- | --- |
| `name` | Title of the contact sheet |
| `design` | Path to `DESIGN.md`; omitted means "look for one next to the spec and above it"; `false` ignores it |
| `theme` | Colors (`bg`, `surface`, `ink`, `muted`, `accent`, `accentInk`, `second`, `onImage`, `em`) and `fonts` by role (`title`, `display`, `serif`, `condensed`, `text`, `mono`, `hand`, plus `titleWeight`). Wins over `DESIGN.md` |
| `fonts` | Extra local font files to load (`family`, `src`, `weight`, `style`) |
| `brand` | `name` (text wordmark) and/or `logo` (image file) |
| `copy` | Shared text; see `layouts.md` for which layout uses what |
| `images` | `background`, `subject`, `screens` (below) |
| `defaults` | `quality` for WebP and JPEG (0-100), `layout` when `outputs` is omitted |
| `outputs` | One entry per file set. Omit to get the six default platforms in `defaults.layout` |
| `css` | Optional extra CSS appended after the templates |
| `lang` | Page language for hyphenation and fonts (default `en`) |

## Images

- `background`: a path, or `{ src, landscape, portrait, tall, focus, shade, contain, prompt }`.
  The renderer picks the entry for the output's shape, else `src`. A path may be a folder:
  the first image file in it is used, so a `--download` folder from PopNow works directly.
  `focus` is a CSS position for cropping (`"65% 40%"`). `shade` (0-1) darkens photos under
  text in `bold-sans` and `device-showcase`. `prompt` is what `bg-plan.mjs` sends to PopNow.
- `subject`: a path or `{ src, prompt, removeBackground }`. A transparent PNG works best.
  `removeBackground: true` plans a cut-out of an existing photo.
- `screens`: your own app screenshots for `device-showcase`, picked by the output's
  `screen` index.

A missing picture never stops a render: the layout draws a pattern placeholder in theme
colors and the report lists it as a warning.

## Outputs

| Key | Meaning |
| --- | --- |
| `id` | File name stem (`og.png`, `og.webp`) |
| `platform` | A preset id from `platforms.md`, or leave it out and give `width` / `height` |
| `layout` | One of the seven layouts |
| `copy`, `images`, `theme`, `brand` | Per-output overrides |
| `formats` | e.g. `["png", "webp"]`, `["jpeg"]`; default comes from the preset |
| `safe` | Override some or all safe margins (px) |
| `flip` | Mirror `split-photo` |
| `plate` | `"subject"` puts the subject in the `editorial-serif` plate instead of the background |
| `thumb` | `true` shows the background as a thumbnail in `minimal-mono` |
| `background`, `subject` | `false` to leave that picture out of this output |
| `screen` | Index into `images.screens` |
| `shade`, `textScale`, `titleCase` | Fine control: photo shade, text size multiplier, `none` to stop uppercase in `bold-sans` |

## Output folder

`covers/<id>.png|webp|jpg`, `covers/contact-sheet.png|webp`, with `--overlay` also
`covers/review/<id>.overlay.png` and `covers/contact-sheet.overlay.png|webp`, plus
`covers/report.json` (every check, fitted title sizes, measured contrast) and
`covers/_html/<id>.html` (open one in a browser to tweak it by hand).
