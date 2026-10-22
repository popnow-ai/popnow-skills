# Style: data story

A dark editorial canvas where one colour carries the point and everything else is grey context.
Charts grow, numbers count up and annotations arrive on the sentence that explains them. Use it for
reports, metrics, research findings and any explainer whose argument is a number.

## Look

| Token | Value | Use |
| --- | --- | --- |
| `--bg` / `--bg-2` | `#0f141a` / `#141b23` | Canvas, a faint cool glow top right |
| `--paper` | `#18212b` | Cards and panels |
| `--ink` | `#eef2f6` | Text |
| `--muted` | `#93a1b1` | Labels, axes, source lines |
| `--accent` | `#ffb547` amber | The series or number that makes the point |
| `--accent-2` | `#5cc4b8` teal | A second highlighted series, "good" |
| `--accent-3` | `#ef6f5e` coral | "Bad", decline |
| `--accent-4` | `#82a7f7` blue | Rarely: a third category |
| `--context` | `#4a5867` | Every series that is not the point |

Type: one sans family with a heavy weight for headlines and tabular figures for numbers (Inter or
IBM Plex Sans). For a light version, swap `--bg` to near-white and `--ink` to near-black and check
contrast again.

## The data story arc

1. **The question** (title card): what are we measuring and why.
2. **The headline number** (`stat`): the one figure to remember, counting up as it is spoken.
3. **The evidence** (`bar-chart` or `line-chart`): the chart that shows it, with the key series in
   amber and the rest grey, annotated on the sentence that explains it.
4. **The context** (`comparison` or a second chart): what it is compared with.
5. **What it means** (`bullet-build`): two or three implications.
6. **Caveat and sources** (`end-card`): the limit of the data in one line, then the sources.

## Motion

- Elements rise 2.4% of the height and fade in (`power3.out`, 0.45 s). Scenes fade and drift.
- Charts: gridlines first, context series second, the key series last, then the value label. Bars
  grow from zero in order; lines draw left to right over 1.2-1.8 s.
- Numbers count up with `XC.countUp` and stop exactly on the value. No overshoot on data marks.
- Annotations (a dashed note line and short text) arrive on their mark, not with the chart.
- Hold every finished chart at least 2 s; a chart that disappears as soon as it is drawn was not read.

## Composition

- One chart per frame, with a headline that states the takeaway ("Rides doubled after the new
  lanes"), not the variable name ("Rides per month").
- Label lines and bars directly; no legends. Put the unit in the headline or the value suffix.
- Source line under every chart (`.x-source`), small but legible (at least 2.4% of the shorter side).
- Leave the bottom 17% for captions; on 9:16 stack the headline above the chart.

## Images

This style usually needs none. If the user wants a cover still or a background plate, generate an
abstract texture with no data in it (dark gradient, soft light) and keep it under 15% contrast so
charts stay readable. Never generate a chart as an image.

## Do and avoid

| Do | Avoid |
| --- | --- |
| One highlight colour per chart | Every series in a different colour |
| Exact numbers on screen, rounded in the voice | Rounded numbers on screen that differ from the source |
| Start bars at zero | Truncated axes that exaggerate change |
| Say the takeaway, then show the chart | Showing a chart and hoping the viewer finds the point |
