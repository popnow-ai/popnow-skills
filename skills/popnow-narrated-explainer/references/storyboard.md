# Storyboard, beats and the approval sheet

The storyboard is the contract between the words and the pictures. Every beat names the phrase it
lands on, so when the real voiceover arrives the scenes move with it instead of being re-timed by hand.

## storyboard.json

```json
{
  "title": "How agent skills work",
  "style": "paper-collage",
  "canvas": { "width": 1920, "height": 1080, "fps": 30 },
  "beats": [
    { "id": "b1", "chapter": "gap", "component": "title-card", "at": 0,
      "visual": "Title lands as four paper slips", "onScreen": ["How agent skills work"] },
    { "id": "b2", "chapter": "gap", "component": "custom", "anchor": "But it doesn't know",
      "marks": ["release steps", "chart style", "house rules"],
      "visual": "Terminal cut-out, then three sticky notes", "onScreen": ["release steps?"] },
    { "id": "b4", "scene": "folder", "chapter": "folder", "component": "custom", "anchor": "At its heart",
      "marks": ["a name", "short description"], "claims": ["c2"] },
    { "id": "b11", "chapter": "make", "component": "end-card", "anchor": "@end",
      "onScreen": ["Sources", "agentskills.io/specification"] }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id` | The element id in `index.html` the component builds on |
| `scene` | Optional shared scene id: consecutive beats with the same scene stay on one board (the folder stays while the page and the tags arrive) |
| `chapter` | Chapter id from `script.md` |
| `component` | `title-card`, `bullet-build`, `quote`, `comparison`, `timeline`, `callout`, `map-pin`, `bar-chart`, `line-chart`, `stat`, `end-card` or `custom` |
| `anchor` | `@start` (the chapter's first word), `@end` (after the last word of the film), or a phrase from the chapter; the beat starts 0.25 s before it |
| `at` | Fixed time in seconds instead of an anchor (use 0 for the opening card) |
| `offset` | Seconds added to the anchor time |
| `marks` | Phrases inside the beat where its builds land (bullet items, timeline stops, chart bars); each lands 0.12 s before its word |
| `hold` | `true` for a deliberate still or pause (allowed up to 9 s) |
| `visual`, `onScreen` | What the frame shows and every piece of text on it (QA checks the numbers in `onScreen`) |
| `claims` | Claim ids from `sources.json` the beat depends on |

`python3 $SKILL/scripts/explainer.py beats storyboard.json timing.json --out assets/timing.js --html index.html`
resolves anchors and marks against the word timing, writes `window.EXPLAINER_TIMING` for the
composition and updates `data-duration` on the root (and the `#vo` and `#music` elements). A phrase
that is not in the chapter fails loudly; fix the phrase rather than adding a fixed time.

## Pacing rules

- **One visual idea per beat**; a new beat or mark at least every 6 s. QA warns at 6 s and fails at 9 s.
- **Land on the stressed word.** Anchor the noun or verb that carries the meaning ("release steps",
  not "your"). The build lands just before the word is heard, which reads as cause and effect.
- **Beats under 1 s are unreadable.** Fold them into a mark of the previous beat.
- **Show what is said, not a second message.** Narration and on-screen text say the same thing in
  different forms: the voice says the sentence, the screen shows the two or three key words.
- **Text budget per frame:** a headline of up to 7 words, or up to 4 short items, or one chart with a
  one-line takeaway. Anything more competes with the captions.
- **Charts get time:** the chart beat starts before the number is said, the number lands on its mark
  and the frame holds at least 2 s after.
- **End card:** takeaway sentence, sources, one call to action; 3-4 s after the last word.
- **Visual rhythm by length:** 45 s about 8-10 beats, 60 s 10-12, 90 s 14-18, 120 s 18-24.

## Which component for which sentence

| The narration... | Use |
| --- | --- |
| Opens or names the topic | `title-card` |
| Lists two to four things | `bullet-build`, one mark per item |
| Quotes someone | `quote` (verbatim, attributed, sourced) |
| Contrasts two options or a before and after | `comparison`, marks for side A, side B, verdict |
| Describes a sequence or history | `timeline`, one mark per stop |
| Points at a part of a picture | `callout` |
| Names places | `map-pin` over a map you are allowed to use |
| Compares quantities | `bar-chart`; change over time is a `line-chart`; one big number is a `stat` |
| Needs a picture that does not exist in the kit | `custom` with paper pieces, strokes or a generated image |

## The approval sheet

Before any voice is generated or any frame is rendered for real, the user approves the script and a
contact sheet of 6-9 frames.

1. Time the script by rate: `explainer.py estimate script.json --out timing.json`.
2. Resolve beats and build the scenes: `beats storyboard.json timing.json --out assets/timing.js --html index.html`.
3. Print the frame times: `explainer.py contact-sheet storyboard.json --timing timing.json --print-times`,
   then `npx hyperframes snapshot --at <times>` (or a headless browser with `index.html?t=<seconds>`).
4. `explainer.py contact-sheet storyboard.json --timing timing.json --script script.json --snapshots <folder> --out storyboard.html`
   lays out the frames with time, chapter, on-screen text and the narration under each.
5. Send the sheet and the script. Ask for "approve" or numbered changes. Change the script and the
   storyboard, not hand-tuned times.

In lite mode, skip the snapshots: without `--snapshots` the sheet shows a labelled sketch per beat.
Once the real voiceover is in, re-run `align` (or `estimate --audio`), `captions` and `beats`; the
scenes follow the new timing without edits.
