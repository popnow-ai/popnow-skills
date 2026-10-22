# Script and sources

An explainer is heard once, at the speaker's pace, while the eyes are busy. Write for that listener:
one point per chapter, one idea per sentence, and nothing the voice cannot say cleanly.

## 1. Facts before words

Collect the claims first, then write around them. For every number, comparison, date or attributed
quote the video will contain, add a claim to `sources.json`:

```json
{
  "id": "c3",
  "text": "Heat pumps move about three units of heat for each unit of electricity in mild weather.",
  "values": ["3", "three"],
  "status": "verified",
  "source": { "title": "...", "publisher": "...", "url": "https://...", "date": "2025", "accessed": "2026-10-22" }
}
```

| status | Means | Who can set it |
| --- | --- | --- |
| `verified` | You opened the source and it says this | The agent, after reading |
| `user-provided` | The user supplied the figure (their data, their report) | The user |
| `first-party` | A fact about the user's own product, stated by them | The user |
| `unverified` | Not checked yet | Default; QA fails until it changes |

Rules:

- Prefer primary sources (the study, the standard, the official dataset) over articles about them.
- `values` lists every number exactly as it appears on screen or in the narration (`64%`, `2019`,
  `1,200`). QA scans the script and the storyboard's `onScreen` text and fails on any number that no
  claim backs.
- A quote is verbatim, attributed (person, where, when) and short. Do not paraphrase inside quote marks.
- If a claim cannot be sourced, cut it or turn it into the user's opinion in their own voice
  ("we think..."), and say so in the handoff.
- The end card lists the sources (title and short URL). Two to four lines; merge duplicates.

## 2. Outline by source type

| Source | Shape that works | Watch for |
| --- | --- | --- |
| A topic | Hook (the question or problem) -> how it works in 2-4 steps -> why it matters -> takeaway | Saying everything; pick the three steps a newcomer needs |
| An article or document | Its thesis as the hook -> the 3 strongest supporting points -> one example -> takeaway | Copying sentences; rewrite for the ear and credit the source |
| Data | The single finding as the hook -> the chart that shows it -> one context number -> what it means -> caveat | Chart soup; one chart per point, and say the takeaway before the chart |
| A product feature | The user's problem -> what the feature does -> one concrete scene -> how to try it | Feature lists; show one job done |

Length budgets (speech only; the end card adds 3-4 s):

| Total | Hook | Chapters | Close |
| --- | --- | --- | --- |
| 45 s | 6-8 s | 2 x 14 s | 6 s |
| 60 s | 8-10 s | 3 x 13 s | 7 s |
| 90 s | 10-12 s | 4 x 16 s | 10 s |
| 120 s | 10-12 s | 5 x 18 s | 12 s |

## 3. Writing for the ear

- Lead with the payoff. The first sentence says what the viewer will understand by the end.
- One idea per sentence, mostly under 20 words. `plan` warns over 25 (50 characters for Chinese and
  Japanese).
- Signpost: "First...", "Here's the clever part.", "So...". Each chapter opens with its point.
- Concrete beats abstract: one example per chapter, with a noun the viewer can picture.
- Numbers: round them for the ear ("about two thirds") and show the exact figure on screen; keep both
  in `values`. Spell units the way they should be read.
- No parentheses, slashes or abbreviations the voice would trip on. Write names as they should be
  shown and give the voice a spoken form with `[[shown|spoken]]`.
- End on the one sentence you want remembered, then stop.

## 4. script.md format

```markdown
# How heat pumps work
lang: en
target: 60
voice: Charon
style: whiteboard
delivery: Warm, clear and unhurried, like explaining something to a curious friend.

## The puzzle {#hook}
> Title card; then a fridge and a house side by side.
How can a machine heat your home with less energy than the heat it delivers?

## Moving, not making {#move}
A heat pump doesn't burn anything. It moves heat that's already outside, [pause 0.4] even on a cold day.
```

- `## Title {#id}` starts a chapter; storyboard beats refer to the id. Lines starting with `>` are
  visual notes and are never read. `<!-- comments -->` are ignored.
- Front matter keys: `lang`, `target` (seconds), `voice`, `style`, `delivery` (passed to the voice as
  `instructions`), `rate` (to override the planning rate).
- Markup: `[[SQL|sequel]]` shows "SQL", speaks "sequel"; `[pause 0.6]` adds a pause (read as an
  ellipsis); `[warmly]` is a delivery cue the voice performs and captions never show. Listen for cues
  read aloud and remove any that are.

`python3 $SKILL/scripts/explainer.py plan script.md --tts-dir vo` writes `script.json` (word list
with spoken forms, pauses and boundaries), one `vo/<chapter>.txt` per chapter, and a table of the
estimated length per chapter. After the first takes exist, `plan script.md --measured vo/takes.json`
reports the real speaking rate; re-plan with `--rate` if it differs by more than 10%.

## 5. Speaking rates by language

Planning rates for calm narration. Character languages are counted in characters, Korean in
syllables. They are starting points: measure the first take and calibrate.

| Language | Unit | Rate per minute | Caption line | Reading speed limit |
| --- | --- | --- | --- | --- |
| en | words | 150 | 42 chars | 17 chars/s |
| de | words | 130 | 42 | 17 |
| fr | words | 155 | 42 | 17 |
| es | words | 160 | 42 | 17 |
| it | words | 150 | 42 | 17 |
| pt-BR | words | 155 | 42 | 17 |
| pl | words | 130 | 42 | 17 |
| ru | words | 130 | 42 | 17 |
| ko | syllables | 270 | 18 | 12 |
| ja | characters | 300 | 16 | 8 |
| zh-CN | characters | 230 | 16 | 9 |
| zh-TW | characters | 230 | 16 | 9 |

German, Polish and Russian words are longer, so the same message needs fewer words per minute.
Translating a script is not enough: re-time it with `plan`, because the same text often runs 10-25%
longer in German or French than in English.
