# Typography: open-licensed pairings

## Method

1. Pick the **body** face first: it carries 90% of the text. It must read well at 14-16 px, have
   the weights the UI needs (400, 600) and the character sets the product needs.
2. Pick a **display** face that contrasts on one clear axis (serif vs sans, wide vs narrow, warm vs
   precise) and agrees on proportion (similar x-height feel). Two families is the default; add a mono
   only for code, data or timestamps.
3. Choose by personality, not popularity. A single generic UI sans for everything is the most common
   generated look; use it only when the brief asks for neutrality.
4. Record each family in `brand.fonts`: `family`, `role`, `license`, `source`, `package`,
   `fallback`, `files`, `weights`. The linter rejects families without an open licence.

## Families (all on Google Fonts and Fontsource)

| Family | Licence | Kind | Good for |
| --- | --- | --- | --- |
| Newsreader | OFL-1.1 | serif, optical sizes | editorial, calm, long reading |
| Source Serif 4 | OFL-1.1 | serif, optical sizes | dependable, institutional |
| Literata | OFL-1.1 | book serif | literary, reading apps |
| Fraunces | OFL-1.1 | soft display serif | warm, friendly, food and craft |
| Young Serif | OFL-1.1 | heavy heritage serif | bakeries, shops, nostalgic |
| Instrument Serif | OFL-1.1 | condensed display serif (one weight) | fashion, headlines only |
| Atkinson Hyperlegible Next | OFL-1.1 | humanist sans, high legibility | accessibility-first products |
| Public Sans | OFL-1.1 | neutral sans | civic, plain-spoken |
| Source Sans 3 | OFL-1.1 | humanist sans | documentation, long UI |
| IBM Plex Sans | OFL-1.1 | engineered sans | technical, B2B |
| Figtree | OFL-1.1 | friendly geometric sans | consumer apps |
| Instrument Sans | OFL-1.1 | crisp grotesque | modern, neutral with character |
| Hanken Grotesk | OFL-1.1 | grotesque | clean product UI |
| Schibsted Grotesk | OFL-1.1 | sturdy grotesque | news, media, tools |
| Space Grotesk | OFL-1.1 | quirky grotesque | dev tools, science |
| Bricolage Grotesque | OFL-1.1 | expressive grotesque, optical sizes | lively, creative |
| Archivo | OFL-1.1 | grotesque with width axis | sport, signage, bold headlines |
| Lexend | OFL-1.1 | wide sans for reading ease | education, children |
| IBM Plex Mono | OFL-1.1 | mono | code, citations, data |
| JetBrains Mono | OFL-1.1 | mono | code-heavy products |
| DM Mono | OFL-1.1 | soft mono | labels, small data |
| Caveat | OFL-1.1 | handwriting | annotations, one accent line only |

Starting pairings: Newsreader + Atkinson Hyperlegible Next (calm, editorial); Fraunces + Figtree
(warm, friendly); Space Grotesk + IBM Plex Mono (precise, technical); Bricolage Grotesque + Caveat
accents (playful); Literata + Public Sans (bookish, plain); Archivo (wide) + Hanken Grotesk (bold,
practical). Verify the licence on the family's page before shipping; families occasionally change.

## Getting the files

- Web: Fontsource packages (`@fontsource-variable/<family>` or `@fontsource/<family>`) or their CDN
  files, e.g. `https://cdn.jsdelivr.net/npm/@fontsource-variable/newsreader@5.3.0/files/newsreader-latin-wght-normal.woff2`.
  Copy the package `LICENSE` next to the files as `<Family>-OFL.txt`.
- Wordmark outlining needs TTF/OTF (or WOFF2 with `brotli` installed): the `google/fonts` repository
  on GitHub has `ofl/<family>/<Family>[axes].ttf` and `OFL.txt`.
- Put files in `brand/assets/fonts/`, list them under `brand.fonts[].files` (paths relative to
  DESIGN.md) and set `weights: 200 800` for variable files. The board and `tokens.css` users load them
  with `@font-face`; nothing is fetched from the network at runtime.

The SIL Open Font License allows self-hosting, embedding in apps and PDFs, and using the font in a
logo. Keep the licence text with the files and do not sell the font files on their own.

## Type scale

Base 16 px body, ratio about 1.25 for UI and 1.33 for editorial. Name levels the way DESIGN.md readers
expect: `display`, `headline-lg`, `headline-md`, `title-md`, `body-lg`, `body-md`, `body-sm`,
`label-md`, `label-sm` (+ `mono-sm`). Line height 1.05-1.2 for display, 1.5-1.6 for body. Tighten
large serif headlines slightly (-0.01 to -0.02 em); open small labels slightly (0.01-0.04 em).
Body text never below 14 px; keep the reading measure near 60-75 characters (`spacing.measure`).
