# Eval 1: consumer notes app, full flow

## Brief (same prompt for both runs)

> Make a landing page for Lumen Notes, a plain-text notes app for desktop and phone that
> suggests related notes while you type. It is for writers, researchers and students
> who keep years of notes. Notes are ordinary Markdown files in a folder you choose,
> it works offline, and it syncs through whatever folder sync you already use. Free on
> one device, Pro is $6 a month or $48 a year. Headline idea: "Notes that find each
> other". No testimonials yet.

## Without the skill: what usually happens

- Goes straight to code. Hero is a centered headline on a violet-to-blue gradient with
  two buttons ("Get Started", "Learn More") and a blurred glow behind a fake app screenshot.
- Three identical feature cards with emoji or sparkle icons; "seamless sync" and
  "supercharge your thinking" in the copy.
- Invents social proof to fill the gap: "Loved by 10,000+ writers", five stars,
  testimonials from people who do not exist.
- Inter or the system stack only; one radius and one shadow on every card; every
  section has the same padding.
- Nobody sees the design before it is built, so the only way to change direction is a
  full rewrite.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| No visual decision before code | Workflow steps 2-4: three mockups in directions that differ on two or more axes, user picks |
| Default look | `references/directions.json` gives the build a palette, type pairing, layout habit and avoid list |
| Invented proof | Content rules + `proof.kind = facts`: "Plain Markdown files", "Works offline", "Your own sync folder"; `unsourced-proof` and `stock-names` lint rules |
| Emoji, gradients, generic copy | `ai-tells.mjs` errors and warnings |
| Page drifts from the picture | `shoot-diff.mjs review`: first-screen, section and palette deltas plus the side-by-side |
| Broken phone layout | QA at 390 px: overflow, tap targets, tiny text |

## Acceptance checklist

- [ ] `prompts.json` has three directions; every pair differs on at least two axes; none is `studio-product`.
- [ ] Every prompt quotes the headline, the call to action, the feature titles and both plans exactly.
- [ ] The user was given one credit total and their balance before any `create`.
- [ ] No page code was written before the user picked a direction.
- [ ] The page has no testimonials, ratings or user counts; proof is product facts.
- [ ] `node scripts/ai-tells.mjs site/` passes with no errors and a score of 80 or more.
- [ ] `shoot-diff.mjs review` shows no sideways scroll at 390 px, no contrast failures, one `h1`.
- [ ] The compare image has no red sections; first-screen background and alignment match the mockup.
- [ ] Hero image has `width`, `height` and a WebP `srcset`; below-the-fold images are lazy.
- [ ] The delivery note lists credits spent, drafted sentences and any stand-in images.
