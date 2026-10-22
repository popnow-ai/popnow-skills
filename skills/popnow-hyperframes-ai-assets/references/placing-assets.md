# Placing generated media in a HyperFrames composition

Generated files are ordinary clips. These snippets follow the HyperFrames composition rules; if the
HyperFrames documentation for your version describes a mechanic differently, follow the documentation.

## Stills

```html
<img id="hook-plate" class="plate" src="assets/images/hero-desk.png" alt=""
     data-start="0" data-duration="4.2" data-track-index="0">
```

- Keep stills full-bleed behind type with `object-fit: cover` and grade them in CSS rather than in a
  second generation: `filter: brightness(.82) saturate(.9)` or a gradient overlay in the film's
  background colour, until the type passes `npx hyperframes check`'s contrast audit.
- Move them with intent: a 3 to 5 % scale over the beat is a camera push; do not loop a wobble.
- A transparent cut-out from `popnow/background-remover-v1/edit` can sit in front of a code-drawn
  background as its own layer.

## B-roll

```html
<video id="broll-workbench" src="assets/video/broll-workbench.mp4" muted playsinline
       data-start="8.4" data-duration="4.6" data-track-index="0"></video>
```

- Always `muted` and `playsinline`, never `crossorigin`, no CSS 3D transform on any ancestor, and put
  `data-start` on the clip or on its wrapper, not both.
- Use less than the clip: a 5 s clip under a 3.5 s beat lets you start on the cleanest frame. Never
  loop a short clip to fill a long beat; generate the right length.
- Grade footage to the film the same way as stills. If the film is rendered in several aspects, frame
  the subject in the centre third so 9:16 and 1:1 crops still hold it.

## Music bed

```html
<audio id="bed" src="assets/bgm/bed.mp3" data-start="0" data-duration="30"
       data-track-index="2" data-volume="0.55" data-fade-in="0.4" data-fade-out="1.5"></audio>
```

- Every `<audio>` needs an `id`; one without it renders silent with no warning.
- Find the tempo and grid first: `npx hyperframes beats assets/bgm/bed.mp3` writes
  `beats/bed.mp3.json`; snap cuts to it instead of nudging by eye.
- Trim the take before placing it if its best section starts late:

```bash
ffmpeg -y -ss 6.0 -t 31 -i assets/bgm/bed.mp3 \
  -af "afade=t=in:st=0:d=0.3,afade=t=out:st=29.5:d=1.5" -ar 48000 -ac 2 assets/bgm/bed-cut.wav
```

  Then record the cut file too, or simply point the composition at it; the original stays in the
  ledger with its provenance.

## Voiceover and ducking

```html
<audio id="vo-en" src="assets/voice/vo-en.wav" data-start="0.6" data-duration="27"
       data-track-index="3" data-volume="1"></audio>
<audio id="bed" src="assets/bgm/bed.mp3" data-start="0" data-duration="30" data-track-index="2"
       data-automation='{"version":1,"lanes":[{"target":"volume","points":[{"t":0,"v":0.55},{"t":0.5,"v":0.3},{"t":27.5,"v":0.3},{"t":28.2,"v":0.55}]}]}'></audio>
```

- Get word times with `npx hyperframes transcribe assets/voice/vo-en.wav` and set scene boundaries
  on them. A new take re-opens every boundary it touches.
- Duck the bed to about 0.3 while anyone speaks, back up after the last word. A lane holds its first
  value back to the clip start, so give it an explicit point at `t: 0`.
- Do not also set `data-volume` or tween volume with GSAP on a track that has a volume lane.
- Prefer one mix after rendering? The FFmpeg recipe below does the same with a sidechain.

## Mixing with FFmpeg after rendering

When the composition renders silent, mix bed and voice onto the MP4 instead: the bed ducked under the
voice and the whole film at -16 LUFS integrated, peaks at or below -1.5 dBTP. The `popnow-launch-film`
skill's `scripts/mix.mjs` does all of this (and measures each source first); by hand it is three steps:

```bash
# 1. mix: bed faded and ducked under the voice (voice starts 0.6 s in), one WAV the film's length
ffmpeg -y -i assets/bgm/bed.mp3 -i assets/voice/vo-en.wav -filter_complex "\
[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.55,afade=t=out:st=28.5:d=1.5,apad,atrim=0:30[bed];\
[1:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=600|600,apad,atrim=0:30[vo];\
[vo]asplit=2[vo1][vo2];\
[bed][vo1]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=350[ducked];\
[ducked][vo2]amix=inputs=2:normalize=0:duration=first[mix]" -map "[mix]" -t 30 mix.wav

# 2. measure
ffmpeg -hide_banner -nostats -i mix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -

# 3. apply the measured values and put the sound on the picture
ffmpeg -y -i renders/film.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=<input_i>:measured_TP=<input_tp>:measured_LRA=<input_lra>:measured_thresh=<input_thresh>:offset=<target_offset>:linear=true,apad" \
  -c:a aac -b:a 192k -ar 48000 -t 30 -movflags +faststart renders/film-mixed.mp4
ffmpeg -hide_banner -i renders/film-mixed.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary
```

Replace 30 with the film's length. A single loudnorm pass lands a couple of LU short on a short film;
the measured second pass is what hits -16. Cut with `-t`, not `-shortest`: loudnorm can return a little
less audio than it was given, and `-shortest` would then shorten the picture.

## Before you hand off

- `npx hyperframes check` at zero errors.
- `ffprobe -v error -show_streams renders/film.mp4 | grep codec_type` lists an audio stream when
  audio was added.
- Every placed file is in `.media/index.md` and in `assets/popnow-provenance.json`.
