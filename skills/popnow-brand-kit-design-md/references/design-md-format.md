# The DESIGN.md this kit writes

## Compatibility

The file follows the open DESIGN.md format (version `alpha`, published by Google Labs at
github.com/google-labs-code/design.md under Apache-2.0) that coding and design agents read:

- YAML front matter between `---` lines holds the tokens; the tokens are the normative values.
- Schema keys: `version`, `name`, `description`, `omitted`, `colors`, `typography`, `rounded`,
  `spacing`, `components`. Component properties: `backgroundColor`, `textColor`, `typography`,
  `rounded`, `padding`, `size`, `height`, `width`; values may be `"{colors.primary}"` references.
- `##` prose sections in this order: Overview, Colors, Typography, Layout, Elevation & Depth,
  Shapes, Components, Do's and Don'ts. Readers keep sections they do not know.

This kit adds, without breaking any of that:

- Sections **Logo, Iconography, Imagery, Voice & Tone** after Components, then Do's and Don'ts and an
  optional **Agent Notes** at the end. Lite profile requires Overview, Colors, Typography, Voice & Tone.
- One extra top-level key, `brand:`. Its values are token names, numbers, sentences and CSS
  shorthand, never bare hex or single dimensions, so standard DESIGN.md linters skip it silently.
- `dark-<role>` colours for dark mode, used by `*-dark` components so no token is orphaned.

Other tools can lint the same file: `npx @google/design.md lint DESIGN.md`.

## Writing rules

- Quote every hex value: `primary: "#B5541E"`. Unquoted, `#B5541E` is a YAML comment and the value
  is empty (the linter reports this).
- Quote references: `backgroundColor: "{colors.primary}"`.
- Block style only; `{ a: 1 }` flow mappings are not read by these scripts. Short word lists may be
  inline: `personality: [calm, warm]`.
- Dimensions are `px`, `rem` or `em`; line heights are unitless multipliers.
- Prose uses friendly names with the hex and token: `- **Ember (#B5541E):** \`primary\`. Use...`.
  The board reads these bullets for swatch labels, and the linter flags hex codes in prose that are
  not tokens.

## `brand:` schema

| Key | Type | Notes |
| --- | --- | --- |
| `profile` | `full` or `lite` | Sets which sections and assets are required |
| `tagline` | string | Board header and social mockup |
| `personality` | list of words | |
| `fonts[]` | `family`, `role` (display/body/mono/accent), `license` (SPDX id), `source` (URL), `package`, `fallback` (CSS stack), `files` (paths), `weights` ("200 800" or "400") | Every typography family must appear here with an open licence |
| `pairs[]` | `fg`, `bg` (colour token names), `use`, `kind` (text/large/ui), optional `min` | Contrast-checked |
| `shadows` | map of name -> CSS box-shadow | `sm`, `md`, `lg` |
| `motion` | `<name>Ms` numbers, easing strings `cubic-bezier(...)` | |
| `logo` | `wordmark`, `wordmarkReverse`, `symbol`, `symbolMono`, `lockup` (SVG paths relative to DESIGN.md), `minWidthPx`, `symbolMinPx`, `clearspaceRatio` | Full profile requires `wordmark` |
| `icons` | `grid`, `liveArea`, `stroke`, `cap`, `join`, `style`, `rules[]` | |
| `imagery` | `style`, `avoid` (one line each) | Appended to picture prompts by other skills |
| `voice` | `attributes[]`, `do[]`, `dont[]` (3+ each), `words.use[]`, `words.avoid[]`, `samples{}` | Samples feed the mockups |

## tokens.json (W3C design tokens, format 2025.10)

| DESIGN.md | tokens.json group | `$type` | Value |
| --- | --- | --- | --- |
| `colors.*` | `color` | color | `{ "colorSpace": "srgb", "components": [r, g, b], "hex": "#rrggbb" }` |
| `typography.*` | `typography` | typography | `fontFamily` (stack array), `fontSize`/`letterSpacing` as `{value, unit}`, `fontWeight` number, `lineHeight` number |
| `rounded.*`, `spacing.*` | `rounded`, `spacing` | dimension (unitless spacing -> number) | `{ "value": 8, "unit": "px" }` |
| `brand.shadows` | `shadow` | shadow | `{color, offsetX, offsetY, blur, spread}` or a list |
| `brand.motion` | `duration`, `easing` | duration, cubicBezier | `{value, unit: "ms"}`, `[x1, y1, x2, y2]` |
| `brand.fonts` | `fontFamily` | fontFamily | stack array, licence in `$description` |
| `components`, `brand`, `name` | root `$extensions["ai.popnow.brandkit"]` | - | kept for a lossless round trip |

Group names and the `$schema` URL match `npx @google/design.md export --format dtcg`, and colour
references inside the file use `{color.<name>}`. Unlike that exporter, this one keeps line heights,
font fallbacks, shadows, motion and components, and writes strictly valid DTCG units:
`em` letter spacing becomes `px` (DTCG allows only px and rem); the original is kept in the token's
`$extensions`, so `tokens.py import` restores it. DTCG typography needs all five properties, so a
missing weight, line height or letter spacing is written as 400, 1.2 or 0 px and marked
`defaulted`; import leaves those out again. Edits made in tokens.json win over the stored
originals. The output validates against the official DTCG 2025.10 JSON schema.

## tokens.css

`--color-<name>`, `--font-<role>`, `--text-<level>` with `--line-height`, `--letter-spacing` and
`--font-weight` modifiers, `--radius-*`, `--spacing-*`, `--shadow-*`, `--duration-*`, `--ease-*`,
plus `.type-<level>` classes. `dark-*` colours are swapped into `--color-*` under
`prefers-color-scheme: dark` (unless `data-theme="light"`) and under `[data-theme="dark"]`.
`--tailwind` wraps the variables in a Tailwind v4 `@theme` block.

## How other skills use it

A skill that finds `DESIGN.md` in the project root should: load `brand/tokens.css` (or read the
tokens) instead of choosing colours and fonts; use the logo files as they are, never redraw or
recolour them outside the listed variants; append `brand.imagery.style` to picture prompts and
leave out `brand.imagery.avoid`; write copy that follows `brand.voice`; and check any new text
colour pairing with `scripts/contrast.py`.

## Starting from existing code

- `python3 scripts/tokens.py from-css src/styles/theme.css --design DESIGN.md` reads `--color-*`,
  `--text-*`, `--radius-*`, `--spacing-*`, `--shadow-*`, `--font-*` and dark overrides.
- `python3 scripts/tokens.py import tokens.json --design DESIGN.md` reads a DTCG file.

Both rewrite only the front matter; then fill in the prose and run the linter.

## Lint rules (`scripts/lint_design.py`)

Errors: missing or unparseable front matter, duplicate keys or sections, missing name or primary,
invalid colours (including unquoted hex) and dimensions, incomplete type levels, broken references,
missing required sections, fonts without an open licence entry, raster or live-text logo files,
fewer than three do/don't voice examples, failing contrast pairs, placeholder text (TODO, TBD),
competitor colour look-alikes (with `--brief`). Warnings: section order, thin sections, missing
font source or fallback, logo colours outside the palette, gradients in logos, hex in prose that is
not a token, competitor names in the file. `--json` gives machine-readable findings.
