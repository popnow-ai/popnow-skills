# Brief 4: lite mode, a feature in 60 seconds, first without a key

**Prompt to the agent**

> /popnow-narrated-explainer Quick and cheap: a 60-second explainer of our app's new "shared folders"
> feature for the changelog page. Keep it simple, no music.

**Inputs:** a short product note (what shared folders do, who can see what, how to turn it on).
`POPNOW_API_KEY` is not set at the start.

## Without the skill: what usually goes wrong

| Problem | Why it happens |
| --- | --- |
| The agent stalls asking for an API key, or silently ships a video without a voice | No fallback path |
| A full production: custom illustrations, generated images, music, eight voice auditions | No lite budget |
| Invented usage numbers ("used by 10,000 teams") to make it sound impressive | No fact rule |
| Feature claims beyond the product note | No source discipline |

## With the skill: what fixes it

| Fix | Rule or tool |
| --- | --- |
| Lite mode: hook, two points, takeaway; 5-7 beats from kit components; default voice; no music or images | SKILL.md "Lite mode" |
| Without a key: says where to create one, then builds the silent captioned draft (rate timing) and the contact sheet; offers the user's own recording or the local draft voice | SKILL.md "No key" |
| Product facts are `first-party` claims from the note; nothing beyond it is said | `sources.json`, content rules |
| Once a key exists: one quote for the narration (about 20 credits) and the transcription (about 2), shown together before creating | Cost table, quote rule |

## Acceptance (in addition to the shared list)

- [ ] Length 55-65 s; QA run with `--lite` passes.
- [ ] Without a key the agent still delivers the script, contact sheet and a silent captioned
      render, and explains the next step.
- [ ] With a key the total spend is within about 25 credits and was quoted before any call.
- [ ] No number or claim that is not in the product note.
- [ ] No custom illustration code beyond the kit components unless the user asked.
