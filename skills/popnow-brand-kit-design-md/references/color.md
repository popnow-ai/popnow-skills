# Colour: roles, contrast, dark mode, look-alikes

## Roles

Name colours by role so any DESIGN.md reader understands them. These names are understood by the
open DESIGN.md format's tooling; the friendly name ("Ember") goes in the prose.

| Token | Use |
| --- | --- |
| `primary` / `on-primary` | The one accent: primary action, links, focus. Text on it uses `on-primary`. |
| `primary-strong` | Hover/pressed state of primary actions (optional). |
| `primary-container` / `on-primary-container` | Tinted backgrounds: selected rows, active tabs. |
| `secondary` (+ `on-`, `-container`) | A supporting hue: tags, success, secondary emphasis. |
| `tertiary` / `on-tertiary` | A highlight or third hue, used sparingly. |
| `surface` / `on-surface` | Page background and body text. |
| `surface-container` | Cards, sidebars, inputs on the page background. |
| `on-surface-variant` | Secondary text and metadata. |
| `outline` | Dividers and borders (decorative, not text). |
| `error` / `on-error` | Destructive actions and failures, always with a text label. |
| `dark-<role>` | Dark-mode value of `<role>`; `tokens.css` swaps them in automatically. |

Keep the palette small: one accent, one or two supporting hues, warm or cool neutrals. Every colour
that is declared must be used somewhere (a component, a pair, or the prose says where).

## Building the steps

Work in OKLCH so steps look even: keep hue, move lightness. Tints for containers sit around
L 0.90-0.95 with low chroma; ink sits around L 0.20-0.30. Warm neutrals carry a little of the
accent's hue (chroma 0.005-0.015) so the palette feels related.

## Contrast (WCAG 2.2)

| What | Minimum | `kind` in `brand.pairs` |
| --- | --- | --- |
| Body and UI text | 4.5:1 | `text` (default) |
| Large text (24 px+, or 18.66 px+ bold) | 3:1 | `large` |
| Icons, focus rings, input borders that convey state | 3:1 | `ui` |
| Comfortable target for long reading | 7:1 | - |

Declare every pair people will actually use:

```yaml
brand:
  pairs:
    - fg: on-surface
      bg: surface
      use: Body text
    - fg: primary
      bg: surface
      use: Focus ring
      kind: ui
```

Use block style as above; the scripts' YAML reader does not accept `{ ... }` flow mappings.

```bash
python3 scripts/contrast.py "#625A50" "#F3EDE3"             # one pair, every level
python3 scripts/contrast.py --design DESIGN.md              # all declared and component pairs
python3 scripts/contrast.py --design DESIGN.md --matrix     # every colour on every surface
python3 scripts/contrast.py --fix "#7A7166" --on "#F3EDE3"  # nearest passing colour, same hue
```

Ratios are floored to two decimals, so 4.50 always means it passes. `--fix` moves only lightness,
so the hue stays recognisable; choose a little more headroom than the minimum for small text.

Do not rely on hue alone: errors carry an icon and a word, links are underlined in body text, and
status chips have labels. Check that `secondary` and `error` differ in lightness, not just hue.

## Dark mode

Add `dark-surface`, `dark-on-surface`, `dark-surface-container`, `dark-on-surface-variant`,
`dark-outline`, `dark-primary`, `dark-on-primary` (and any others you need). Do not invert: dark
surfaces are warm or cool near-blacks (L 0.18-0.24), text is off-white, and the accent gets lighter
and slightly less saturated so it keeps 4.5:1 on the dark surface. Declare dark pairs too, and add
components such as `app-shell-dark` that reference them, so DESIGN.md readers see them used.

## Look-alike check

`contrast.py --avoid brand/brief.json` (also run by `lint_design.py --brief` and, for direction
palettes, by `plan.py check`) compares the brand's identity colours (primary, secondary, tertiary,
ink, paper, saturated extras and logo fills) with each competitor's colours:

- Two chromatic colours count as the same family when their OKLCH hue is within 20 degrees and
  lightness within 0.12, or when they are almost identical (OKLab distance under 5).
- A near-grey (chroma under 0.04) matches only within OKLab distance 10, and is marked neutral.
- **Look-alike** (error): at least one chromatic match and two matches in total, i.e. their colour
  pairing reappears. **Close** (warning): one chromatic match; acceptable only if the mark, type and
  layout are clearly different.

These are heuristics for trade dress, not a legal test. When the check fires, move the hue of one
colour out of the family rather than nudging it by a few degrees, and write the change in `revisions`.
