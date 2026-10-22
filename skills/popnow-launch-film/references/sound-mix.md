# Sound: music bed, voiceover and the mix

Most feeds autoplay muted, so the film must work without sound; but anyone who turns it on decides
in a second whether it sounds generated. Restraint wins: one bed with a shape, a voice on the lines
that matter, two or three sounds at most.

## Music bed

Options, cheapest first: a track the user already licenses; HyperFrames' media catalogue through
`npx hyperframes media-use` (needs its own sign-in); an original bed from PopNow `suno/v6/text-to-audio` (about 72
credits, usually two takes, instrumental).

Write the brief like a note to a composer, with the film's length and turning points:

```
Warm minimal electronic instrumental, 104 BPM, 4/4, soft kick and round bass, a bright plucked synth
motif, sparse for the first 4 seconds, steady build, a lift at about 17 seconds, settles under the end
card and ends on a clean final chord at about 30 seconds, no vocals, no risers
```

- Name a tempo and snap cuts to it: `npx hyperframes beats assets/bgm/bed.mp3`.
- Ask for an ending; you will trim, and a written ending is easier to find than a fade mid-phrase.
- Never name a living artist or ask for a sound-alike.
- Listen to both takes. Pick the start point (`--music-from` in `mix.mjs`) so the lift lands on the
  beat that deserves it.

## Voiceover

PopNow `google/gemini-3.8-flash-tts/text-to-speech` (about 0.3 credits per second of speech). One
file per beat line keeps placement exact (`vo-hook`, `vo-agent`, ...); one file for the whole script
works too if you time it with `npx hyperframes transcribe`.

- Write the line in the language to be spoken; the model reads the language from the text. Twelve
  languages are covered: English, Simplified and Traditional Chinese, Japanese, Korean, German, French,
  Spanish, Brazilian Portuguese, Russian, Italian, Polish. Each language is its own set of files and its
  own timing pass; on-screen text changes with it.
- Voices: Kore (warm), Puck (upbeat), Charon (deep), Aoede (bright). Style in `set`:
  `{ "style": "vocal_smile" }` suits launches; `newscaster` for a sober product.
- Spell names the way they are said ("popnow dot A I") and keep each line inside its beat
  (`plan-film.mjs` checks about 2.7 words a second).
- Stock voices only. A real person's voice, or an imitation of one, needs that person's consent.

## Sound effects

At most one per meaningful action (a confirm click, a card landing), never one per cut. HyperFrames'
media tooling includes a small offline library (free). PopNow `popnow/foley-v1/video-to-audio`
makes sound that follows a generated clip (about 1.2 credits per second). Place them with
`--sfx file@seconds[@gain]` in `mix.mjs`, on the frame of the action.

## Levels

| Layer | Level |
| --- | --- |
| Voice | about -17 LUFS (each file is measured and levelled first) |
| Bed where nobody speaks | about -21 LUFS |
| Bed under the voice | about 8 dB lower (sidechain, threshold 0.05, ratio 8, attack 20 ms, release 350 ms) |
| Sound effects | gain 0.4-0.7, short |
| Whole film | -16 LUFS integrated, true peak at or below -1.5 dBTP (two-pass loudnorm) |

## The mix

```bash
node scripts/mix.mjs --video renders/film-wide.mp4 \
  --music assets/bgm/bed.mp3 --music-from 2 \
  --voice assets/voice/vo-hook.wav@0.3 --voice assets/voice/vo-agent.wav@8.0 \
  --sfx assets/sfx/click.wav@11.47@0.5 \
  --out renders/film-wide-mixed.mp4
```

It prints the loudness before and after and exits non-zero if the result misses the target. Add
`--stems film/stems` to hear the ducked bed and the voice bus on their own.

### The same mix by hand

`node scripts/mix.mjs ... --print` prints these three commands with your files filled in:

```bash
# 1. buses: the bed levelled, faded and ducked under the voice; sound effects; one WAV the film's length
ffmpeg -y -i renders/film-wide.mp4 -i assets/bgm/bed.mp3 -i assets/voice/vo-hook.wav -filter_complex "\
[1:a]atrim=start=2,asetpts=PTS-STARTPTS,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=<bed gain>dB,afade=t=in:st=0:d=0.3,afade=t=out:st=28.5:d=1.5,apad,atrim=0:30,asetpts=PTS-STARTPTS[music];\
[2:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=<voice gain>dB,adelay=300|300,apad,atrim=0:30,asetpts=PTS-STARTPTS[vox];\
[vox]asplit=2[voxmix][voxsc];\
[music][voxsc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=350:makeup=1[bed];\
[bed][voxmix]amix=inputs=2:normalize=0:duration=first[mix]" -map "[mix]" -t 30 -c:a pcm_s24le mix.wav

# 2. measure
ffmpeg -hide_banner -nostats -i mix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -

# 3. normalise with the measured values, keep the picture, cut at the film's length
ffmpeg -y -i renders/film-wide.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true,apad" \
  -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart renders/film-wide-mixed.mp4
```

The gains in step 1 come from measuring each source (`ffmpeg -i file -af ebur128 -f null -`) and
subtracting from the target level. Step 3 pads and cuts with `-t` rather than `-shortest`, because
loudnorm can return slightly less audio than it was given and `-shortest` would shorten the picture.

Check the result:

```bash
ffmpeg -hide_banner -i renders/film-wide-mixed.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary
```

## Mixing inside the composition instead

HyperFrames can mix placed `<audio>` clips itself (`data-volume`, `data-fade-in`, `data-fade-out`,
and a `data-automation` volume lane for ducking; see the HyperFrames documentation on audio). Use one approach
per film: if the composition already carries music, do not add it again in `mix.mjs`
(`--keep-video-audio` keeps the rendered track and mixes the rest on top).
