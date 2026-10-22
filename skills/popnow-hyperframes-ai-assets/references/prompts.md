# Prompts that match the film

Generated media sits next to frames drawn in code, so the rule for every prompt is the same: describe
the picture or sound the beat needs, in the film's palette and light, and leave out everything code will
add on top (headlines, interface, logos, captions).

Start each prompt from the project's `DESIGN.md` when there is one: two or three colour words, the light
("warm low sun", "cool overcast daylight", "dark room lit by one screen"), and the mood. Repeat those
words in every still and clip of the same film; that is what makes them look like one shoot.

## Hero stills and product scenes (`image`)

Pattern: subject, setting, composition, light, palette, lens, then the exclusions.

```
Early-morning studio desk by a tall window, a closed laptop and a paper notebook with a pen,
warm low sun from the left, long soft shadows, cream walls and deep plum accents,
composition leaves the right third empty for a headline, 35 mm, shallow depth of field,
no text, no logos, no people
```

- Say where the type will go ("left third empty", "dark sky above for a title"). Code places the
  headline; the picture just leaves room.
- End with `no text, no logos, no people` unless the beat needs one of them. Generated lettering on a
  product is never evidence.
- Need readable words inside the scene (a shop sign, a label)? Use `openai/gpt-image-2/text-to-image`
  with `"set": { "quality": "medium" }` and quote the exact words in the prompt.
- The user's real product in a new setting: `google/nano-banana-2.1/edit` with their photo in `image`,
  and say what must not change: "keep the bottle shape, label and colour exactly; replace the
  background with a sunlit stone countertop".
- Draft cheaply with `alibaba/z-image-turbo/text-to-image`, show the user, then make the final.
- Match the film's aspect (`aspectRatio`) so nothing has to be cropped hard. For a film rendered in
  several aspects, generate at the widest one and frame the subject in the centre third.

## B-roll (`video`)

One shot, one subject, one camera move, 3 to 5 seconds. B-roll supports a beat; it never carries the
claim.

```
Slow push in across a tidy workbench at night, a single desk lamp, small brass parts
and a notebook, warm pool of light in a dark room, gentle dust in the beam, camera steady,
no people, no text
```

- Name the camera move and its speed: "slow push in", "locked off", "slow lateral slide left",
  "gentle crane down". Fast moves under type are hard to read.
- Animate an approved still instead of starting fresh: `minimax/h3/image-to-video` with
  `"image": "@hero-desk"` keeps the frame you already agreed on. Describe the motion, not the picture.
- Abstract plates that will sit dark or blurred behind type can use
  `bytedance/seedance-2.0-mini/text-to-video` at `"resolution": "480p"`.
- Ask for `no people` by default. Generic, unidentifiable people are fine when the beat needs them;
  set `"people": "generic"`. An identifiable real person needs `"people": "real"` and consent.

## Music beds (`bgm`)

Write the brief like a note to a composer: genre, tempo, instruments, energy curve, ending. Beds are
instrumental by default.

```
Warm minimal electronic instrumental, 100 BPM, 4/4, soft kick and round bass,
a bright plucked synth motif, sparse for the first 8 seconds, builds gently,
lifts at about 20 seconds, ends on a clean final chord, no vocals, no risers
```

- Give the tempo; cuts in the film will snap to it (`npx hyperframes beats assets/bgm/bed.mp3`).
- Say how it should end. Generated tracks run long; you will trim, and a written ending is easier to
  find than a fade in the middle of a phrase.
- Avoid the sound every generated launch video has: no "epic cinematic", no constant risers, no
  whoosh at every bar. Restraint reads as confidence.
- Never name a living artist or band, and never ask for a song "in the voice of" anyone. The script
  refuses such items unless they carry a consent record.
- A run usually returns two takes (`bed.mp3`, `bed-take2.mp3`). Listen to both before choosing.

## Voiceover (`voice`)

Write the script in the language you want spoken; the model reads the language from the text. Keep
lines short and spoken, not written: one idea per sentence, numbers as they are said.

| Language | `lang` | Note |
| --- | --- | --- |
| English | `en` | Default voice Kore; Puck for an upbeat male read |
| Simplified Chinese | `zh-CN` | Write in Simplified characters; about 4 to 5 characters a second |
| Traditional Chinese | `zh-TW` | Write in Traditional characters |
| Japanese | `ja` | Spell brand names the way they should be read |
| Korean | `ko` | |
| German | `de` | Lines run longer; trim the script, not the timing |
| French | `fr` | |
| Spanish | `es` | |
| Brazilian Portuguese | `pt-BR` | |
| Russian | `ru` | |
| Italian | `it` | |
| Polish | `pl` | |

- Gemini voices include Kore (warm), Puck (upbeat), Charon (deep), Aoede (bright), Fenrir (energetic),
  Leda (young). Direction goes in `set`: `"style": "vocal_smile"` (also `newscaster`, `empathetic`,
  `promo_hype`, `deadpan`, `whisper`), `"pace": "natural"`, or free text in `"instructions"`.
  `python3 scripts/popnow.py model google/gemini-3.8-flash-tts/text-to-speech` lists the fields.
- One item per language (`vo-en`, `vo-de`, ...), same voice, same style. Each language gets its own
  timing pass: `npx hyperframes transcribe assets/voice/vo-de.wav`.
- Pace: about 2.5 words a second in English. A 30 s film holds roughly 60 to 70 spoken words with
  breathing room; the script estimates the credits from the same rate.
- Stock voices only. Cloning or imitating a real person's voice is out unless the person has given
  consent and the item records it.

## Sound effects (`sfx`)

Most launch films need two or three sounds at most. Over-scored effects are the fastest way to sound
generated.

- Sound for a clip: `popnow/foley-v1/video-to-audio` with `"video": "@broll-workbench"` and a short
  prompt ("soft paper and pen sounds, quiet room"). It follows the picture and costs little.
- A designed sound by description: `bytedance/seed-audio-1.0/text-to-audio`, e.g. "one soft wooden
  click, short tail, dry room". It is priced per request and costs more than a whole music bed: use it
  only for a sound the film is built around.
- Before generating, check what exists: HyperFrames' media tooling includes a small offline sound
  library, and `npx hyperframes media-use resolve --type sfx --intent "soft click" --candidates`
  lists what the project already has.

## Exclusions worth keeping in every prompt

`no text`, `no logos`, `no watermark`, `no people` (unless needed), `no interface` (code draws it),
and for footage `camera steady` or a named move. For music: `no vocals`, `no risers`.
