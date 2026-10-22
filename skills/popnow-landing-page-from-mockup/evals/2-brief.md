# Eval 2: developer tool, framework project

## Brief (same prompt for both runs)

> We are launching Pipewright, an open-source CLI that turns messy server logs into
> structured events you can query with SQL. Hosted version is $0 for 1 GB a day and
> $29 a month for 50 GB. Build the landing page in our existing Astro + Tailwind
> project under `site/`. We have 2,300 GitHub stars and a quote from our first user,
> Mira Okafor, platform lead at a logistics company, who said: "We deleted three
> dashboards the week we switched."

## Without the skill: what usually happens

- Dark page with a purple glow, gradient headline text, a fake terminal screenshot
  image with unreadable text, and "Trusted by teams at" followed by invented logos.
- Tailwind defaults everywhere: `from-indigo-500 to-purple-600`, `rounded-2xl` and
  `shadow-xl` on every card, `text-center` on every section, `grid-cols-3` three times.
- Rocket and sparkles icons; "blazing fast", "next-level observability".
- Ignores the existing Astro project and writes a standalone HTML file, or adds new
  global CSS that fights the project's setup.

## With the skill: what fixes it

| Problem | Rule or script |
| --- | --- |
| Generic dark devtool look | Directions with `kind: software` and tone `technical`: `dark-instrument`, `mono-document`, `swiss-grid`; each with its own avoid list (neon glows, gradients, orbs) |
| Fake terminal image | `mockup-to-code.md` section 4: product UI is built in code with real commands and output, never a generated picture of a UI |
| Invented logos | Content rules; proof is the real star count and the one real quote with the person's name and role |
| Tailwind defaults | `default-palette`, `purple-gradient`, `uniform-radius`, `uniform-shadow`, `centered-everything`, `card-grid-repeat`, `ai-icons` rules; tokens go into the Tailwind theme |
| Ignores the project | Workflow step 7 and `mockup-to-code.md` section 6: read `package.json`, build Astro components in `site/` |

## Acceptance checklist

- [ ] The three mockups include at least one light and one dark direction.
- [ ] The build lives in `site/` as Astro components; tokens are in the Tailwind config, not hard-coded classes.
- [ ] The hero shows a real CLI command and real structured output in HTML, not an image.
- [ ] Proof is exactly the 2,300 stars and Mira Okafor's quote with her role; no logos.
- [ ] `node scripts/ai-tells.mjs site/src` passes; no `from-indigo`/`to-purple` classes remain.
- [ ] `shoot-diff.mjs review http://localhost:4321 --mockup <chosen>` runs against the dev server and shows no red sections.
- [ ] Code blocks scroll inside their own box on phones; the page itself never scrolls sideways.
- [ ] Pricing shows $0 for 1 GB/day and $29/month for 50 GB exactly as given.
