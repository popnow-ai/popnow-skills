# Brief 3: a city bike-share dataset as a Chinese data story

**Prompt to the agent**

> /popnow-narrated-explainer Here is our city's bike-share data for 2023-2025 (CSV). Make a two-minute
> data story in Simplified Chinese for the city council: what changed after the new bike lanes
> opened. Dark data style, music under the voice, 16:9.

**Inputs:** `rides.csv` (month, district, rides, new_lanes_km), supplied by the user from the city's
open-data portal, with the portal URL.

## Without the skill: what usually goes wrong

| Problem | Why it happens |
| --- | --- |
| A bar chart with the y axis starting at 80,000, making a 12% rise look like a doubling | No chart rules |
| "Rides doubled" said in the voice while the data shows +12% | Numbers paraphrased without a check |
| Charts rendered as generated images with made-up tick labels | Image generation used for data |
| Captions in Chinese with spaces between characters and 30-character lines | Word-based caption logic |
| The agent tries a transcription model that does not support Chinese, or skips timing altogether | No fallback path |
| Music masks the voice; the end is a hard cut | No ducking, no fades |

## With the skill: what fixes it

| Fix | Rule or tool |
| --- | --- |
| Numbers computed once from the CSV, every shown value listed in a `user-provided` claim with the portal URL | `charts.md` "Data from a file", QA `numbers` |
| Bars from zero, key series in amber and the rest grey, source line under each chart, takeaway headline | `charts.md` honesty rules, `style-data-story.md` |
| Story arc: question, headline number counting up, evidence chart, context comparison, implications, caveat and sources | `style-data-story.md` arc |
| Chinese planned at 230 characters a minute; captions at 16 characters per line with no stray spaces | Rate table, `captions` character mode |
| Word timing from `estimate --audio` with per-chapter takes (silence-snapped), word highlight off | `voice-and-timing.md` section 5 |
| Suno instrumental bed ducked with the `duck` envelope; final -16 LUFS | `sound.md` |

## Acceptance (in addition to the shared list)

- [ ] Length 108-120 s; Chinese caption lines at most 16 characters; QA `caption-lines` passes.
- [ ] Every bar chart starts at zero; every chart has a source line; no chart is an image.
- [ ] Every number on screen matches the CSV exactly (spot-check three).
- [ ] The headline number is said and shown on the same beat; the counter stops exactly on it.
- [ ] Music audible between chapters and clearly under the voice; QA `loudness` and `true-peak` pass.
- [ ] Timing source in the handoff is `estimate-audio`, and the agent says why (no Chinese transcription).
