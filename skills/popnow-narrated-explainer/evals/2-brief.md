# Brief 2: an article as a German whiteboard explainer

**Prompt to the agent**

> /popnow-narrated-explainer Turn the attached blog post about how password managers keep secrets
> into a 90-second explainer in German, whiteboard style, for a non-technical audience. 16:9.

**Inputs:** `article.md`, about 1,400 words of English, by the user's company. It contains three
diagrams described in text and two statistics with links.

## Without the skill: what usually goes wrong

| Problem | Why it happens |
| --- | --- |
| The English article is translated sentence by sentence; the German script runs 2 min 10 s | English rate assumed; German needs about 130 words a minute |
| Caption lines overflow on compounds ("Hauptpasswort-Verschluesselung") or split mid-word | No language-aware line breaking |
| Captions drift by half a second by the end | Timing estimated from text, not from the audio |
| The diagrams become paragraphs of handwriting on the board | Whiteboard rules not followed: labels, not sentences |
| The voice reads "z.B." and URLs aloud | No spoken forms |

## With the skill: what fixes it

| Fix | Rule or tool |
| --- | --- |
| Outline from the article's thesis and three strongest points; German script planned at 130 words a minute and checked by `plan` | `script-and-sources.md` outline by source type, rate table |
| The two statistics carry the article's links as sources; the article itself is a `first-party` source | `sources.json` |
| Abbreviations written out; product names given spoken forms with `[[shown|spoken]]` | Script markup |
| Transcription with `language=de` and the product names as `keyterms`; `align` match rate reported | `voice-and-timing.md` section 4 |
| Caption cuts at clauses, weak German words never end a cue, lines within 42 characters | `captions` with the German weak-word list |
| Each diagram becomes a drawn sequence (box, arrow, lock) in narration order with one to three word labels | `style-whiteboard.md`, `drawPath`, `writeOn` |

## Acceptance (in addition to the shared list)

- [ ] Length 81-99 s; `pace` passes for every chapter at the German rate.
- [ ] `align` match rate at least 85%; QA `caption-sync` passes.
- [ ] No caption line over 42 characters; no hyphenation inside words.
- [ ] Every whiteboard drawing completes at least 1.5 s before the camera pans.
- [ ] A German-speaking reviewer finds no word read in English pronunciation by mistake.
