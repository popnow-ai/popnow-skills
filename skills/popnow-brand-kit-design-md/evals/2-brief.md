# Eval 2: lite kit that must keep an existing colour and theme

## Brief (paste as the user message, with the CSS file in the repo)

> We're Tallyho, an invoicing API for freelancers. We only need palette, fonts and voice for the docs
> site and dashboard, in a DESIGN.md our coding agent can use. Keep our green #0B6E4F, it's on
> everything already. Our current theme is in src/styles/theme.css. We need a dark mode too.
> Don't make us look like every other fintech (violet gradients).

Fixture `src/styles/theme.css`:

```css
:root {
  --color-primary: #0B6E4F;
  --color-surface: #FFFFFF;
  --color-on-surface: #1A1A1A;
  --radius-md: 6px;
  --font-body: "Inter", system-ui, sans-serif;
}
```

Mode: lite. No logo, no photo mockups, no PopNow spend needed.

## Without the skill, agents typically

1. Rebuild the palette from scratch and drift from #0B6E4F, or keep it but pick a new accent that
   fails contrast on the dark background.
2. Make dark mode by inverting colours; the green turns muddy and fails 4.5:1 on the dark surface.
3. Keep Inter for everything because it was in the CSS, or swap fonts without recording licences.
4. Write marketing hype in the voice section ("Supercharge your cash flow!").
5. Leave the existing CSS untouched and write a DESIGN.md that disagrees with it.

## With the skill

1. `python3 scripts/tokens.py from-css src/styles/theme.css --design DESIGN.md --name Tallyho` seeds
   the front matter from the real theme, so `primary` stays `#0B6E4F`.
2. `references/color.md` dark-mode rules + `contrast.py --fix "#0B6E4F" --on <dark-surface>` gives a
   lighter `dark-primary` with the same hue that passes 4.5:1; `brand.pairs` declares the dark pairs.
3. `references/typography.md`: choose by personality, licence recorded in `brand.fonts`; a generic
   UI face alone triggers the linter's `generic-look` info if paired with a violet primary.
4. `references/voice.md` banned-phrase list and do/don't pairs aimed at developer docs.
5. `tokens.py export --css src/styles/tokens.css --tailwind` writes variables the app can import;
   `tokens.py check` keeps them in sync.
6. `brand.profile: lite` with `omitted:` for spacing, rounded and components, so DESIGN.md readers
   do not expect them.

## Acceptance checklist

- [ ] `colors.primary` is exactly `#0B6E4F`; no violet or blue-to-pink gradient anywhere.
- [ ] Every declared pair passes, including `dark-on-surface`/`dark-surface` and
      `dark-primary`/`dark-surface` (links) at 4.5:1.
- [ ] `lint_design.py DESIGN.md` reports 0 errors with `profile: lite`.
- [ ] `tokens.css` contains `--color-primary: #0B6E4F;` and dark overrides under
      `prefers-color-scheme: dark` and `[data-theme="dark"]`.
- [ ] Fonts are open-licensed with source and fallback; if Inter stays, the brief's reason is written down.
- [ ] Voice examples cover an API error, an empty dashboard and a docs headline; none uses the banned list.
- [ ] No PopNow credits were spent (or the user explicitly asked for draft tiles after a quote).
