# QA: what is measured and how to fix it

Run QA twice: on the silent draft before the approval sheet, and on the final render.

```bash
python3 $SKILL/scripts/explainer.py qa --timing timing.json --captions captions.vtt \
  --beats assets/timing.js --storyboard storyboard.json --sources sources.json \
  --html index.html --media renders/explainer.mp4 --out qa.json
```

Add `--lite` for lite mode (55-65 s target band, checked as 50-70 s) and `--lufs -14` if the user
asks for a louder master. Exit code 1 means at least one FAIL; `qa.json` lists every check.

| Check | Passes when | Usual fix |
| --- | --- | --- |
| `length` | 45-120 s (lite 50-70 s) | Cut or add narration; re-plan |
| `pace` | Each chapter within 20% of the language rate (FAIL beyond 35%) | Re-read slower or faster, or rewrite the chapter |
| `air-start` | First word within 1.5 s | Lower `--offset` |
| `air-gap` | No gap over 1.5 s between words unless a beat has `"hold": true` (FAIL over 2.5 s) | Tighten `vo-join --gap`, re-read a take with a long pause, or mark a deliberate hold |
| `air-end` | At most 6 s after the last word | Shorten `--tail` |
| `visual-pace` | Something new at least every 6 s (FAIL over 9 s) | Add a mark or split the beat |
| `beat-length` | No beat under 1 s | Fold it into a mark of the previous beat |
| `caption-coverage` | 98% of spoken words appear in captions | Rebuild captions from the current timing |
| `caption-sync` | Every cue starts within 150 ms of its first word | Rebuild captions; never shift cues by hand |
| `caption-end` | No cue ends before its last word or lingers over 1.2 s | Rebuild captions |
| `caption-lines` | Lines within the language limit, at most two lines | `captions --max-chars`; for 9:16 use 28 |
| `caption-speed` | WARN when faster than the language's reading speed | Cut words from the script |
| `caption-overlap` | No overlapping cues | Rebuild captions |
| `facts` | Every claim `verified`, `user-provided` or `first-party`, with a source title and URL (or provider) | Verify, ask the user, or cut the claim |
| `numbers` | Every number in the narration and `onScreen` is in a claim's `values` | Add the claim or remove the number |
| `sources-card` | An `end-card` beat exists when there are claims | Add the end card |
| `offline` | No remote scripts, styles, fonts or media | Copy files into `assets/` |
| `determinism` | No `Math.random`, `Date.now`, `setInterval`, `repeat: -1` | Use `XC.stamp` and finite repeats |
| `duration-attr` | `#root data-duration` matches the timing | `beats --html index.html` |
| `captions-inline` | The inline caption block equals `captions.vtt` | `inline-vtt` |
| `legibility` | Text at least 2.4% of the canvas's shorter side (FAIL under 2.2%) | Raise the size in `--u` units |
| `caption-size` | Captions at least 3.8% of the shorter side | Keep `.x-cap-line` at 4.2 |
| `caption-contrast` | `--cap-ink` on `--cap-bg` at least 4.5:1 | Darken the strip or lighten the text |
| `loudness` | -16 LUFS integrated +/- 1 (or `--lufs`) | `references/sound.md` section 4 |
| `true-peak` | At or below -1 dBTP | Same pass, `TP=-1.5` |
| `dead-air` | No silence over 2 s before the end card in the render | Check the voice element's `data-start` and the mix |
| `render-length` | Render within 0.25 s of the timing | `beats --html`, then re-render |
| `audio-stream` | The render has audio | Every `<audio>` needs an `id` |

## What QA cannot see

Look at these yourself before delivering:

1. **A snapshot of every beat** at its middle (`contact-sheet --print-times` gives the times): nothing
   clipped at the canvas edge, nothing under the caption strip, no text overlapping, labels next to
   what they label, nothing left over from the previous scene.
2. **Cuts**: snapshot each scene change at -0.1 s and +0.1 s; no empty frame, no flash.
3. **One full watch with sound**: the voice and the picture say the same thing at the same time; no
   mispronounced names; the music never competes with the voice; the end card is readable.
4. **Facts on screen** match `sources.json` character for character (a chart that shows 46% when the
   source says 64% passes every automated check).
5. **`npx hyperframes check`** reports no errors (layout overflow and contrast inside scenes).

## Handoff note

Write it next to the render:

- What was made: length, canvas, style, language, voice.
- Generations: each model id, prompt or text, credits charged, which take was kept.
- Timing source (`stt`, `transcribe`, `estimate-audio`) and the alignment match rate.
- Sources (from `sources.json`) and anything cut for lack of a source.
- QA summary (`qa.json`) and the measured loudness.
- How to change it: edit `script.md` and re-run plan, voice for the changed chapter, vo-join, align,
  captions, beats, render, qa.
