# Charts: bars, lines and big numbers

Charts are drawn by the composition from the numbers in the markup, never generated as pictures, so
every value is exact, sourced and editable. One chart per point; the narration says the takeaway, the
chart proves it.

## Honesty rules (checked in review, partly by QA)

- Bars start at zero. A line chart may start above zero only when the axis says so and the change is
  still shown fairly; say it in the narration if it matters.
- One highlight colour for the series that carries the point, grey (`--context`) for the rest. Label
  values and series directly; no legends.
- Units on screen (%, $, kWh, people). Same unit and scale for anything compared side by side.
- Data marks ease out without overshoot: a bar that grows past its value and settles back shows a
  number that is not in the data. The builders use `power3.out` for this reason.
- The source line under the chart names the dataset and year, and the dataset is a claim in
  `sources.json` whose `values` include every number on screen.
- Round for the voice, exact on screen: "about two thirds" spoken, "64%" shown.
- Seven bars at most; twelve points or fewer on a line unless it is a long trend.

## Bar chart (`bar-chart`, marks = optional, one per bar)

```html
<section class="x-scene" id="b5">
  <h2 class="x-h2">Where lost edits came from</h2>
  <div class="x-bars" data-max="100">
    <div class="x-bar-row is-key"><span class="x-bar-label">Copy-paste</span><span class="x-bar-track"><span class="x-bar"></span></span><span class="x-bar-val" data-to="64" data-suffix="%">0%</span></div>
    <div class="x-bar-row"><span class="x-bar-label">Exports</span><span class="x-bar-track"><span class="x-bar"></span></span><span class="x-bar-val" data-to="20" data-suffix="%">0%</span></div>
    <div class="x-bar-row"><span class="x-bar-label">Other</span><span class="x-bar-track"><span class="x-bar"></span></span><span class="x-bar-val" data-to="16" data-suffix="%">0%</span></div>
    <p class="x-source">Source: team edit log, Jan-Jun 2026 (n = 1,240)</p>
  </div>
</section>
```

- `data-max` sets the full-width value (100 for percentages; omit to use the largest bar).
- `data-to`, `data-decimals`, `data-prefix`, `data-suffix` per value; formatting follows `<html lang>`.
- Without marks the bars grow in order from the beat start; with marks each bar lands on the phrase
  that names it. The key row (`is-key`) uses the accent colour.
- Whiteboard renders the bars as outlines with a tinted key bar; collage gives them paper shadows.

## Line chart (`line-chart`, first mark = annotation)

```html
<section class="x-scene" id="b6">
  <h2 class="x-h2">Rides per month, 2024-2026</h2>
  <figure class="x-linechart" data-series='[[2024,31],[2025,38],[2026,52]]'
          data-context='[[2024,40],[2025,41],[2026,42]]'
          data-y-min="0" data-y-max="60" data-ticks="3" data-aspect="0.45"
          data-note='[2026,"New lanes open"]' data-suffix="k">
    <svg class="x-plot" role="img" aria-label="Rides per month rose from 31k to 52k"></svg>
    <figcaption class="x-source">Source: city open data portal, 2026</figcaption>
  </figure>
</section>
```

`XC.line` builds the SVG from the data (fixed 1000-unit-wide viewBox, so it scales with the canvas):
gridlines and axis labels fade in, the grey context series draws, the main series draws, the area
fills, the end dot pops with its value, and the note appears on the first mark. Keep the y range
honest (`data-y-min="0"` unless there is a reason) and put the unit in the title or suffix.

## Big number (`stat`, first mark = the count starts)

```html
<section class="x-scene" id="b3">
  <div class="x-stat">
    <span class="x-num" data-to="3.1" data-decimals="1" data-suffix="x">0.0x</span>
    <span class="x-stat-label">more heat out than electricity in, on a mild day</span>
  </div>
</section>
```

The counter runs from `data-from` (default 0) to `data-to` in 1.1 s, landing as the number is spoken.
Use it for one number the viewer should remember; two at most per film.

## Data from a file

For a CSV, compute the numbers once with a short script, write them into the markup, and record each
shown value in `sources.json` (status `user-provided` for the user's data, with the file name and
date in the source). Do not compute values in the composition at render time.
