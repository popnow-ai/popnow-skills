# Captions

Most explainers are watched with the sound off at first, so captions are part of the picture, not an
afterthought. They mirror the narration word for word (the shown forms from the script) and appear
when the first word of the cue is spoken.

## Build them

```bash
python3 $SKILL/scripts/explainer.py captions timing.json            # captions.vtt, .srt, .json
python3 $SKILL/scripts/explainer.py inline-vtt index.html captions.vtt
```

How cues are cut:

- A cue never crosses a sentence end, a chapter, or a pause longer than 0.6 s.
- A long sentence is cut into the fewest even cues that fit two lines, preferring a comma or colon,
  and never ending a cue on a weak word ("the", "of", "and"; per-language lists in the script).
- Each cue starts on its first word, stays up to 0.25 s after its last word, and leaves two frames
  (0.067 s) before the next cue. Short cues are held to at least 1 s when there is room.
- Lines are split for balance, preferring a break after punctuation.

Options: `--max-chars` (default per language), `--max-lines 2`, `--min-dur 1.0`, `--max-dur 6.0`,
`--tail 0.25`.

| Language | Max characters per line | Reading speed QA warns above |
| --- | --- | --- |
| en, de, fr, es, it, pt-BR, pl, ru | 42 | 17 characters per second |
| ko | 18 | 12 |
| ja | 16 | 8 |
| zh-CN, zh-TW | 16 | 9 |

When QA says a cue is too fast to read, the narration is too dense at that point. Cut words from the
script; do not shorten captions so they no longer match the voice.

## Burned in or sidecar

| Choose | When |
| --- | --- |
| Burned in (default) | Social feeds, autoplay without sound, embeds where you do not control the player |
| Sidecar `.srt` or `.vtt` | YouTube, course platforms and players that show their own captions; offering several languages; when the viewer must be able to turn them off |
| Both | Burned-in for the social cut, sidecar for the long-form upload |

For a sidecar-only render, add class `no-captions` to `#root` (the scene area then uses the full
height) and remove the caption layer, or simply skip `mountCaptions`.

## How the composition shows them

`explainer-runtime.js` parses the WebVTT text and creates one element per cue on a child timeline, so
captions are seekable like every other tween:

```js
var src = XR.captionText();                       // inline copy now, the real file when served over http
var layer = document.getElementById("captions");
var capTl = XR.mountCaptions(tl, layer, XR.parseVTT(src.inline), { words: T.words, highlight: false });
src.file.then(function (text) {
  if (text && text.trim() !== src.inline.trim()) XR.remountCaptions(capTl, layer, XR.parseVTT(text), { words: T.words });
});
```

The inline `<script type="text/vtt" id="captions-vtt">` block is a byte-for-byte copy of
`captions.vtt` (written by `inline-vtt`, checked by QA). It is what renders on `file://` and inside
the renderer, where fetching a local file is not allowed; when the page is served over http(s) the
real `captions.vtt` is fetched too, so an edited file shows up on reload.

Style per look (`explainer.css`): ink label tape for paper collage, a dark rounded chip for
whiteboard, a near-black chip for data story. Captions sit 5% above the bottom edge and scenes keep
17% of the height free for them (`--cap-safe`). Caption text is 4.2% of the frame height (45 px at
1080p) at weight 600, with at least 4.5:1 contrast.

**Word highlight** (`highlight: true`) underlines each word as it is spoken. Use it only when timing
came from a transcript (`align`); estimated timing is too loose for it. It is off by default because
most explainers read better with calm phrase captions.

## Translated captions

To add a second language as a sidecar, translate the cues, not the script: keep the cue times from
the original `captions.json`, translate each cue's text, check line length for the target language,
and write `captions.<lang>.vtt`. A dubbed version in another language is a new script, a new voice
and a new timing pass.
