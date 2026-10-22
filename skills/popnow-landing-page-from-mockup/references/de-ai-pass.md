# The de-AI pass

A page reads as machine-made when every choice is the default one: violet gradient,
centered headline with two buttons, three identical cards with icons in circles, the same
radius and shadow on everything, copy that could describe any product. None of these is
wrong alone; stacked together they say nobody decided anything.

Run this pass after the build matches the mockup, then fix and run it again.

## 1. Automated: `scripts/ai-tells.mjs`

```bash
node scripts/ai-tells.mjs site/            # or a single file, or src/ in a framework project
node scripts/ai-tells.mjs site/ --json     # machine-readable
node scripts/ai-tells.mjs --rules         # list every rule
```

Pass: no errors and a score of 80 or more. It reads HTML, CSS, JSX/TSX, Vue, Svelte and
Astro files, Tailwind classes included, and finds `DESIGN.md` on its own so brand fonts
are not flagged as defaults.

| Rule | Level | What it catches |
| --- | --- | --- |
| `emoji-icon` | error | Emoji as icons or decoration |
| `placeholder-text` | error | Lorem ipsum, "Feature one", "Your company name here", TODO |
| `placeholder-image` | error | Placeholder image services |
| `img-alt` | error | `<img>` without `alt` |
| `heading-structure` | error | Zero or several `h1`, skipped heading levels |
| `purple-gradient` | error | Gradients with violet or indigo stops |
| `gradient-overuse`, `gradient-text` | warn | More than three gradients; gradient-filled text used twice or more |
| `blur-blobs`, `glass-panels` | warn | Large blurred shapes, glow orbs; repeated frosted glass |
| `default-font` | warn | Only system or overused default faces in the whole project |
| `default-palette` | warn | Framework default indigo/violet classes or hex values |
| `centered-everything` | warn | All sections centered |
| `card-grid-repeat` | warn | Three-column card grids used three or more times |
| `uniform-radius`, `uniform-shadow`, `uniform-rhythm` | warn | One radius, one shadow or one section padding everywhere |
| `eyebrow-everywhere`, `numbered-sections` | warn | Uppercase kicker above every heading; 01 / 02 / 03 labels |
| `generic-copy` | warn (error at 4+) | "Seamless", "unleash", "supercharge", "at your fingertips" and similar |
| `vague-cta` | warn | "Learn more", "Get started" without an object |
| `unsourced-proof`, `stock-names` | warn | "Trusted by 10,000+", five stars, 99.9%, John Doe, Acme |
| `dash-density` | warn | Em dashes in nearly every line |
| `ai-icons` | warn | Sparkles, rocket and magic-wand icons |
| `dead-links`, `page-meta` | warn | `href="#"`; missing `lang`, title, description or viewport |

A deliberate exception stays with a comment that names the rule, for example
`<!-- ai-tells-ignore gradient-overuse -->` when the brand really is a gradient. Say why
in the delivery note.

## 2. By eye, on the screenshots

The linter cannot see. Open `review/shot-1440.png` and `review/shot-390.png` and check:

- **One clear hierarchy per screen.** At arm's length you can tell what the page is,
  what to do, and what comes next. If two things shout, make one quieter.
- **Section rhythm varies.** Tall and short sections alternate; at least two different
  section structures (split, list, table, full-bleed band, wide module plus narrow ones).
- **Alignment is decided.** Body sections left-aligned on a grid; centering kept for one
  or two moments.
- **Imagery is specific.** The hero shows this product or its world, not a generic
  abstract scene. Product shots are real UI built in code with real labels.
- **Details survived.** The two or three details that defined the chosen mockup (rules,
  captions, a type contrast, a texture) are present in the build.
- **Copy is specific.** Every headline could only be about this product. Numbers have a
  source. Buttons say what happens.
- **Nothing is there by habit.** Remove anything that is only there because landing
  pages usually have it: logo walls with no real logos, a stats band with invented
  numbers, a testimonial carousel with no testimonials.

## 3. Fix order

1. Errors from the linter and the QA (overflow, contrast, broken images, missing alt).
2. Anything that breaks the chosen direction (wrong fonts, palette drift, lost details).
3. Generic copy, vague calls to action, unsourced proof.
4. Rhythm and repetition warnings.

Re-run the linter and the review after fixing. Stop after three rounds; list what is left
in the delivery note instead of polishing forever.
