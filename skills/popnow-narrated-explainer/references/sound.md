# Audio for an explainer: narration first, music second

An explainer is carried by the narration. Music is optional and should feel like room tone: the
viewer notices it mostly when it ends. Aim the finished file at:

| Measure | Target | Checked by |
| --- | --- | --- |
| Integrated loudness | -16 LUFS, within 1 LU | `explainer.py qa --media` |
| True peak | -1.5 dBTP or lower (QA fails above -1) | `explainer.py qa --media` |
| Silence before the end card | nothing longer than 2 s | `explainer.py qa --media` |
| Narration over music | every word clearly on top | your ears |

## Step 1: prepare the narration track

Run the joined takes through one filter chain: a gentle low cut for rumble, then loudness
normalisation a little below the final target so the mix has headroom.

```bash
ffmpeg -y -i vo/voiceover.wav \
  -af "highpass=f=70,loudnorm=I=-16:TP=-2:LRA=7" \
  -ar 48000 -ac 1 assets/voiceover.wav
```

If one chapter sounds louder or brighter than the others, re-read that chapter. Heavier compression
hides the seam only until someone listens on headphones.

## Step 2: get a music bed (optional, paid)

Use a single instrumental for the whole video. Check the fields, quote, tell the user the credits
and wait for a yes:

```bash
python3 $SKILL/scripts/popnow.py model suno/v6/text-to-audio
python3 $SKILL/scripts/popnow.py quote --model suno/v6/text-to-audio --set instrumental=true \
  --title "Explainer bed" --prompt "<a prompt from the table below>"
# only after the user agrees:
python3 $SKILL/scripts/popnow.py create --model suno/v6/text-to-audio --set instrumental=true \
  --title "Explainer bed" --prompt "<same prompt>" --confirm-credits <N> --download assets/music-raw
```

Starting prompts, one per look:

| Look | Prompt |
| --- | --- |
| `paper-collage` | Warm handmade instrumental around 95 BPM: plucked acoustic guitar, marimba, brushed snare and soft upright bass. Curious and light, leaves room in the mid range for a voice, ends on a clear resolved chord. Instrumental only. |
| `whiteboard` | Quiet focused instrumental around 90 BPM: felt piano, pizzicato strings, a soft steady pulse. No drops or big swells, even energy throughout, a settled final chord. Instrumental only. |
| `data-story` | Clean modern instrumental around 100 BPM: analog pads, muted electric piano, a light electronic groove. Confident, builds a little in the last third, finishes with a definite ending. Instrumental only. |

When you write your own prompt, state a tempo, say it is instrumental, ask for space where the
voice sits and for a real ending, and describe instruments and mood. Do not name artists or songs.
A single run may return two takes: play both and keep the better one.

### Fit the bed to the video

Choose a start point on a downbeat (`npx hyperframes beats <file>` lists them), cut the bed to the
video's length, fade both ends and set it a couple of LU under the narration:

```bash
LEN=62.9                                    # video length in seconds, from timing.js
FADE_AT=$(python3 -c "print($LEN - 2.5)")
ffmpeg -y -ss <start> -t "$LEN" -i assets/music-raw/<take>.mp3 \
  -af "afade=t=in:st=0:d=0.8,afade=t=out:st=$FADE_AT:d=2.5,loudnorm=I=-18:TP=-2:LRA=11" \
  -ar 48000 -ac 2 assets/bed.wav
```

If the track's last chord lands before or after the end card, move `<start>` by whole bars and cut
again.

## Step 3: keep the music under the voice

**Preferred: an envelope in the composition**, so the preview and the render sound identical.
`duck` reads the word timings and writes a volume automation for the music element:

```bash
python3 $SKILL/scripts/explainer.py duck timing.json --length 62.9
```

Put the printed `data-automation` attribute on `<audio id="music">`. With the defaults the bed plays
at gain 0.5 (about -6 dB) between phrases and drops to 0.18 (about -15 dB) while someone speaks; it
starts dropping 0.25 s before a phrase and recovers over 0.6 s after it, and phrases less than 0.8 s
apart count as one so the music does not bob between words. Adjust with `--bed`, `--under`,
`--attack`, `--release` and `--merge`. The envelope is the only volume control on that element: no
`data-volume`, no GSAP tween on its volume. Whenever `timing.json` changes, run `duck` again.

**Fallback: sidechain after rendering**, when the music is added to a finished render that already
carries the narration. The narration is split into a mix copy and a key signal that drives a
compressor on the bed:

```bash
ffmpeg -y -i renders/explainer.mp4 -i assets/bed.wav -filter_complex "\
[0:a]asplit=2[voice][key];\
[1:a]volume=-6dB[music];\
[music][key]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400[musicdown];\
[voice][musicdown]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[out]" \
  -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 192k -ar 48000 renders/explainer-mix.mp4
```

## Step 4: final level and measurement

When the rendered file misses the target, correct the audio alone and copy the picture through:

```bash
ffmpeg -y -i renders/explainer.mp4 -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -ar 48000 renders/explainer-final.mp4
```

A single `loudnorm` pass is close; two passes are exact. Run the first with `print_format=json`, read
the measured input values it prints, and pass them to the second run as `measured_I`, `measured_TP`,
`measured_LRA` and `measured_thresh`.

Then let QA measure what you hear:

```bash
python3 $SKILL/scripts/explainer.py qa --timing timing.json --media renders/explainer-final.mp4
```

`qa --media` uses FFmpeg's `ebur128` and `silencedetect` filters to check loudness, true peak, the
presence of an audio stream, silent gaps before the end card and whether the file length matches the
timing. Video sites that normalise playback to around -14 LUFS will raise a -16 file slightly, which
is fine; a file mastered hotter than that only gets turned down and may clip on the way.

## Sound effects

Most explainers are better without them; a whoosh on every transition is the fastest way to sound
templated. If one moment truly benefits (a stamp, a page flip), use a single effect the user has the
rights to, as `<audio id="sfx-1">` starting on the frame of the action, mixed at least 12 dB below
the narration.
