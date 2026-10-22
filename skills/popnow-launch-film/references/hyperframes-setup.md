# Rendering with HyperFrames

The film is a web page: HTML and CSS for layout, a paused GSAP timeline for motion. HyperFrames is
the open-source tool that turns that page into video. It loads the page in a headless Chrome, advances
the timeline one frame at a time, captures each frame and hands the sequence to FFmpeg.

- Project: https://github.com/heygen-com/hyperframes (Apache-2.0)
- Runs through `npx`; nothing is installed globally
- Requires Node.js 22 or later, FFmpeg with ffprobe on `PATH`, and a Chrome it can control

## First run on a machine

```bash
node --version                          # expect v22 or later
ffmpeg -version | head -1               # FFmpeg present?
npx --yes hyperframes doctor            # lists anything missing
npx --yes hyperframes browser ensure    # fetches or repairs the browser used for rendering
npx hyperframes init launch-film        # creates the project folder
```

This skill does not ship GSAP. If the page does not load it yet, install it with `npm i gsap@3` and
copy `node_modules/gsap/dist/gsap.min.js` into `assets/` (keep its header comment), or load a pinned
CDN build such as `https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js`. GSAP is used under its
own licence: https://gsap.com/standard-license.

## The commands this workflow calls

| When | Command |
| --- | --- |
| New project | `npx hyperframes init <dir>` |
| While writing the page | `npx hyperframes lint` |
| Before rendering | `npx hyperframes check` (lint plus layout and contrast audits; clear every error) |
| Contact sheet frames | `npx hyperframes snapshot --at 2.4,6.4,11.9` (PNGs land in `.hyperframes/artifacts/snapshots/`) |
| Watching it play | `npx hyperframes preview --background` |
| Final file | `npx hyperframes render --quality high --fps 30 --output renders/film-wide.mp4` |
| Cutting to music | `npx hyperframes beats assets/bgm/bed.mp3` (beat times of the bed) |
| Timing a voiceover | `npx hyperframes transcribe assets/voice/vo-en.wav` (word times) |
| Brand from a site the user owns | `npx hyperframes capture <url> -o <dir>` (logos, colours, fonts) |

HyperFrames releases often, and options do get renamed. If a flag is refused, check
`npx hyperframes <command> --help` for the installed version, or pin a version that works for the
project with `npx --yes hyperframes@<version> <command>`.

This skill's `composition.md` and `sound-mix.md` hold every rule a launch film needs, so nothing else
has to be installed to follow it. If the HyperFrames documentation for your version describes a
mechanic differently, follow the documentation.

## Working before HyperFrames is installed

`scripts/frame-audit.mjs` and `scripts/contact-sheet.mjs` drive a local Chrome directly. The beat
sheet check, the contact sheet and the text-size audit therefore all run without HyperFrames; only the
final MP4 needs it.
