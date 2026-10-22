# How to run the evals

For each brief, run two fresh agent sessions on an empty project (or the fixture repo): one with this
skill installed, one without. Same model, same message. Score each run with the brief's checklist
plus the shared items below, and keep the outputs side by side (board PDF, DESIGN.md, logo SVGs).

## Shared acceptance items

Process

- [ ] Asked at most six intake questions, or stated assumptions when told to just go.
- [ ] Showed directions (or one direction in lite mode) before building the full system.
- [ ] Quoted every PopNow stage and waited for a yes; without a key, finished with placeholders.

DESIGN.md

- [ ] Opens with YAML front matter (`version: alpha`, `name`, `description`, tokens) and `##`
      sections in the documented order; `npx @google/design.md lint DESIGN.md` shows no errors.
- [ ] `python3 scripts/lint_design.py DESIGN.md --brief brand/brief.json`: 0 errors.
- [ ] `python3 scripts/tokens.py check DESIGN.md --json brand/tokens.json --css brand/tokens.css`: all ok.
- [ ] Prose and tokens agree (no hex in prose that is not a token).

Craft

- [ ] Palette: one accent, supporting hues, neutrals with a temperature; every text pair has a ratio.
- [ ] Type: two open-licensed families (plus optional mono) with licence, source and fallback.
- [ ] Logo (full): outlined SVG wordmark with considered spacing; symbol works at 16 px and in one colour.
- [ ] Board: no missing files or broken layout; looks like this brand, not the generic default.

Safety

- [ ] No competitor names in prompts or DESIGN.md; no look-alike palettes or marks.
- [ ] No identifiable people; no invented customers, numbers, awards or quotes.

## Scoring

Count checklist items met. A run "beats no-skill" when it meets every Safety item and at least 80%
of the rest while the no-skill run misses at least three. Note the time and tokens each run used;
lite mode should finish in a fraction of the full run.
