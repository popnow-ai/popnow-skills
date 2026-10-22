# Voice and word timing

The voiceover is the film's clock. Scenes and captions are placed on the times of the spoken words,
so the order is fixed: approved script -> voice takes -> word times -> captions and beats -> render.

## 1. Choose the voice

Default model: `google/gemini-3.8-flash-tts/text-to-speech`. It has 30 preset voices, reads the
language of the text it is given (no language field; the 12 languages here all work), and takes an
`instructions` field for delivery that is not spoken. Output is WAV, 24 kHz mono.

Offer three voices that fit the tone; the user picks. A shortlist that suits explainers:

| Voice | Character | Good for |
| --- | --- | --- |
| Charon | Informative | Default for how-it-works and reports |
| Sadaltager | Knowledgeable | Courses, technical topics |
| Iapetus | Clear | Dense content, non-native audiences |
| Sulafat | Warm | Health, community, people stories |
| Achird | Friendly | Product features, onboarding |
| Schedar | Even | Data stories, calm pacing |
| Puck | Upbeat | Launches, short social cuts |
| Vindemiatrix | Gentle | Children's topics, wellbeing |

Voices keep their character across languages, but a voice can sound more natural in some than in
others; audition in the target language. Run `python3 $SKILL/scripts/popnow.py model <id>` (free) to
see the current voice list and fields before quoting.

**Audition (optional, recommended for 90 s and up).** One line of about 6 s from the hook, read by
each of the three voices. Quote the three together, tell the user the total, create after a yes, and
let them listen. About 2 credits each.

**Delivery.** Put the script's `delivery:` line in `instructions` ("Warm, clear and unhurried, like
explaining something to a curious friend"). Keep it about the reading, not the content. Do not change
voice, instructions or other settings between chapters of one film.

## 2. Generate the takes

One take per chapter is the default: a re-read costs one chapter, and the gaps between chapters are
even. A single take of the whole script (up to 5,000 characters) is fine for lite mode.

```bash
python3 $SKILL/scripts/explainer.py plan script.md --tts-dir vo        # vo/<chapter>.txt
python3 $SKILL/scripts/popnow.py quote --model google/gemini-3.8-flash-tts/text-to-speech \
  --voice Charon --text "$(cat vo/hook.txt)" --set "instructions=Warm, clear and unhurried."
# Tell the user: "up to <max> held, usually <expected> credits" and the balance. On a clear yes:
python3 $SKILL/scripts/popnow.py create --model google/gemini-3.8-flash-tts/text-to-speech \
  --voice Charon --text "$(cat vo/hook.txt)" --set "instructions=Warm, clear and unhurried." \
  --confirm-credits <max from the quote> --download vo/raw
mv vo/raw/<taskId>-0.wav vo/hook.wav
```

The quote's maximum is a hold for the longest audio the model can return; only the seconds returned
are charged, and the hold is released. Quote all chapters first and give the user one total of the
usual charges, then create them one by one. If a task fails, report it; do not retry on your own.

Listen to every take before going on. Re-read a chapter when a word is mispronounced (fix it with
`[[shown|spoken]]`), a cue in brackets was read aloud, the level or pace jumps between chapters, or
a sentence is cut off. A re-read replaces `vo/<chapter>.wav`; everything downstream is regenerated.

Other sources of narration, all handled the same way from here:

- The user's own recording: one WAV per chapter named `vo/<chapter>.wav` (or one file for the whole
  script). Only their own voice, or a speaker who agreed in writing.
- `minimax/speech-2.8-turbo/text-to-speech` for its own voice catalogue (priced per 1,000 characters;
  check field names with `model`).
- Free local draft: `npx hyperframes tts --text "$(cat vo/hook.txt)" --output vo/hook.wav` (best in
  English; for drafts and silent-budget projects).

## 3. Join

```bash
python3 $SKILL/scripts/explainer.py vo-join script.json --dir vo --out vo/voiceover.wav --gap 0.6
```

Needs 16-bit WAV takes with the same sample rate (convert others with
`ffmpeg -i in.mp3 -ac 1 -ar 24000 -c:a pcm_s16le vo/<chapter>.wav`). Each take is trimmed to its
speech plus 50 ms, joined with even gaps, and `vo/takes.json` records where every chapter starts.
`plan script.md --measured vo/takes.json` then reports the real speaking rate.

## 4. Word times from a transcript (preferred)

Transcribe the joined file with PopNow speech-to-text. It returns every word with start and end
times. Supported here: en, de, fr, es, it, pt, pl, ru, ja, ko.

```bash
python3 $SKILL/scripts/popnow.py quote --model xai/grok-stt/speech-to-text --audio vo/voiceover.wav \
  --set language=en --set 'keyterms=[{"term":"SKILL.md"},{"term":"PopNow"}]'
# on a yes, same flags plus --confirm-credits <max> --wait, then save the full task:
python3 $SKILL/scripts/popnow.py status <taskId> --json > vo/stt.json
python3 $SKILL/scripts/explainer.py align script.json vo/stt.json --takes vo/takes.json --offset 0.6 --out timing.json
```

- `keyterms` (names, product words) makes rare words come back spelled right; it does not change
  the price. Leave `filler_words` off.
- `align` matches the script's spoken forms to the transcript. Words that matched keep the
  transcript's times; words the transcript heard differently (numbers read out, names) are spread
  across the gap between matched neighbours. It reports a match rate: at 85% or more go on; between
  60% and 85% listen around the reported words; under 60% means the wrong file or language, so stop.
- `--offset` is where the voiceover starts in the film (0.6 s leaves room for the title to land).
  The same value goes into `<audio id="vo" data-start>`; `beats --html` writes it.

Local alternative, free: `npx hyperframes transcribe vo/voiceover.wav --json` produces a flat list of
words with `text`, `start` and `end`; save it and pass it to `align --source transcribe`. Its default
model may translate non-English speech into English: check `npx hyperframes transcribe --help` for a
multilingual model and confirm the transcript is in the script's language.

## 5. Word times without a transcript

For Chinese (not covered by the PopNow transcription model), without a key, or when the user does not
want a transcription call:

```bash
python3 $SKILL/scripts/explainer.py estimate script.json --audio vo/voiceover.wav --takes vo/takes.json --offset 0.6 --out timing.json
```

It finds the speech inside each chapter's take, detects the silences, matches sentence and clause
ends in the script to those silences in order, and spreads the words between them by spoken length.
Sentence boundaries land within about 0.1 s; words inside a sentence are approximate, which is fine
for phrase captions and beat anchors but not for word-by-word highlighting. Leave the highlight off
when timing comes from `estimate`.

Without any audio, `estimate script.json` times the script by the planning rate. Use that for the
storyboard and silent drafts only; QA on a render with real audio will show the drift.

## timing.json

```json
{ "source": "stt", "lang": "en", "voOffset": 0.6, "audioDuration": 58.8, "matchRate": 0.96,
  "chapters": [{ "id": "gap", "title": "The gap", "start": 0.6, "end": 10.05 }],
  "words": [{ "i": 0, "c": "gap", "text": "Your", "start": 0.6, "end": 0.82, "brk": "", "sp": true }],
  "end": 59.4 }
```

Times are film time (the offset is already added). `text` is the shown form, so captions read
"SKILL.md" even though the voice said "skill dot M D".
