# Brief 1: heat pumps in a minute (topic, paper collage, English)

**Prompt to the agent**

> /popnow-narrated-explainer Make a 60-second explainer for homeowners: "How a heat pump heats your
> house with less energy than it delivers." Paper collage look, 16:9, English, calm voice.

**Inputs:** none beyond the prompt. The agent researches the facts.

## Without the skill: what usually goes wrong

| Problem | Why it happens |
| --- | --- |
| The script runs 200+ words for "60 seconds" and the voice rushes, or the film runs 85 s | No speaking-rate budget |
| "Three to five times more efficient" appears with no source, sometimes as "400%" on screen | Numbers written from memory |
| Scenes are evenly spaced; the compressor appears while the voice talks about the outdoor coil | Visuals not tied to words |
| The voice is generated first, then the user asks for a different hook and it is paid for twice | No approval gate |
| Captions are one long block per scene | No caption builder |
| A generated "infographic" with misspelled labels | Text inside generated images |

## With the skill: what fixes it

| Fix | Rule or tool |
| --- | --- |
| About 140 spoken words across hook, three chapters and takeaway; `plan` shows 60 +/- 6 s | `script-and-sources.md` rates and budgets, `explainer.py plan` |
| The efficiency figure (coefficient of performance) is a claim with a primary source, shown exactly and rounded in the voice | `sources.json`, QA `numbers` and `facts` |
| Outdoor coil, compressor and indoor unit land as marks on their words | `storyboard.json` anchors and marks, `beats` |
| Contact sheet of 6-9 frames approved before the voice is quoted | `contact-sheet`, workflow step 4 |
| Phrase captions, two lines max, synced to the transcript | `align`, `captions`, QA `caption-sync` |
| Cut-out of a heat pump generated as a paper illustration with no text; labels in HTML | `style-paper-collage.md` cut-outs |

## Acceptance (in addition to the shared list)

- [ ] Length 54-66 s; first word by 1.5 s; end card 3-4 s.
- [ ] At least one claim about efficiency, with a source an engineer would accept (a government
      energy agency or standards body page), visible on the end card.
- [ ] The three parts of the system each appear on the word that names them (check in the render).
- [ ] No technical term on screen that the narration does not explain.
- [ ] Credits spent within the quoted total; expected about 21 for voice and transcription, plus
      about 53 per cut-out if approved.
