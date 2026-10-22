# From mockup to code

The mockup is the target for look and structure. The brief is the source for words and
facts. Where they disagree, the brief wins on content and the mockup wins on form.

## 1. Read the mockup before writing markup

Write these down (a short list in your working notes is enough):

- **Sections**: top to bottom, with what each one is for and roughly how tall it is as a
  share of the page. The 1:3 mockup at 4k is near real scale, so pixel heights translate.
- **Grid**: number of columns, outer margin, gutter, where text columns start. Most
  mockups sit on a 12-column grid with 64-120 px outer margins at 1440 px.
- **Type scale**: measure the cap height of the headline, a section title, body and
  small labels on the image. Headline cap height / 0.7 is roughly the font size. Turn the
  four sizes into a scale (for example 72 / 40 / 18 / 13) and use `clamp()` for the top
  two so they shrink on phones.
- **Tokens**: run `node scripts/image-tools.mjs palette mockups/<chosen>/<file>.png` and
  take its suggestions as a starting point: background, surface, ink, muted, accent.
  Check the printed contrast pairs; if muted or accent text fails 4.5:1, darken it until
  it passes and keep the hue.
- **Fonts**: name what you see (high-contrast serif, condensed grotesk, mono). Use the
  direction's `fontSuggestions` (all freely licensed families) or the `DESIGN.md` fonts.
  Never ship the generic system stack as the only face.
- **Details that make it this direction**: hairline rules, square corners, a single
  rust button, captions in mono. These are what the "AI-looking" version loses first.

## 2. Structure

- Semantic HTML: `header`, `nav`, `main`, one `h1`, `section` with an `h2` each,
  `footer`. Pricing as a `table` or a list of `article`s, FAQ as `details`/`summary`.
- Real copy from the brief: headline, subhead, features, proof, plans, FAQ. Mark any
  sentence you had to draft yourself and list it in the delivery note.
- Links and buttons: verb + object labels; every `href` goes somewhere real.
- No JavaScript is needed for a landing page except small enhancements (menu toggle,
  pricing switch). Content must be readable with scripts off.

## 3. Responsive rules

- Breakpoints by content, usually around 1100 px (wide), 900 px (two columns become
  one where needed) and 600 px (phone). Test at 1440, 1024, 768, 390 and 360 px.
- Multi-column sections stack in reading order. Asymmetric layouts (8/4 splits) become
  full width; keep the image first only if it carries the message.
- Type: headline with `clamp(2.4rem, 6vw, 4.5rem)` style rules; body never below 16 px on
  phones; line length 45-75 characters on desktop.
- Width: use `width: min(1200px, 100% - 2 * margin)` or similar; never `100vw` for
  layout (Windows scrollbars make it overflow). Nothing may scroll sideways except a
  deliberate carousel with its own `overflow-x`.
- Tap targets at least 44 px tall on phones; the nav collapses to a menu button.

## 4. Images

Every picture slot in the mockup gets one of three treatments, decided per slot and
listed in the delivery note:

1. **Reuse from the mockup** when the region is a picture without text (a still life, a
   texture, an illustration). Crop it and save it at display size:
   `node scripts/image-tools.mjs crop mockups/A/mockup.png --rect 52,6,40,18 --out site/img/hero-src.png`.
   Only do this when the crop is sharp enough at its display width; a 1:3 4k mockup gives
   roughly 1:1 pixels for a 1440 px layout, which is soft on high-density screens.
2. **Regenerate clean at the right size** (recommended for the hero): use the crop as the
   reference for `google/nano-banana-2.1/edit` with a prompt that asks for the same
   picture without text or interface, at the slot's aspect ratio and `--resolution 2k`.
   `prompts.json` already has this command under `heroArt.fromMockup`. Quote first.
3. **Build it in code** when the slot shows the product: draw the interface in HTML/CSS
   with real labels and numbers. Never use a generated picture of a UI as the product
   shot on the live page; it will contain fake text.

Then optimize every raster image:

```bash
node scripts/image-tools.mjs resize site/img/hero.png --widths 640,1024,1600,2400 --format webp --out site/img
```

It writes the sizes and prints an `<img srcset>` snippet with `width` and `height` set
(no layout shift). The first-screen image loads eagerly with `fetchpriority="high"`; all
others get `loading="lazy"`. Aim for under 250 KB for the hero at 1600 px.

Optional finishing with PopNow, quoted first: `popnow/image-upscaler-v1/upscale` for a
hero that must stay sharp on 4k screens, `popnow/background-remover-v1/edit` for a
product or object cut-out that sits on the page color.

## 5. Accessibility basics

- Contrast 4.5:1 for body text, 3:1 for text 24 px and up (the review step measures it).
- Visible focus styles; skip link to `main`; `alt` text that says what an image shows.
- `prefers-reduced-motion`: turn off parallax and large movements; keep simple fades.
- `lang` on `html`, a real `title` and meta description, Open Graph tags.

## 6. Framework ports

If the user has a project (React or Next, Vue or Nuxt, Svelte, Astro, plain HTML), read
`package.json` and the styling setup first and build inside it: components per section,
tokens in the project's system (CSS variables, Tailwind theme, CSS modules), fonts via
the framework's font loader or self-hosted files, images via the framework's image
component when one exists. With Tailwind, put the mockup tokens in the theme instead of
using the default palette; the linter flags default indigo and violet classes.

Without a project, deliver one `index.html` with a `<style>` block and an `img/` folder.
