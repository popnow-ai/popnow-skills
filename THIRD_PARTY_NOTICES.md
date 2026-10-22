# Third-party notices

The code and documentation in this repository are PopNow's own work, released under the
[MIT License](LICENSE). This file lists the third-party material that ships inside the repository and
the third-party tools some skills call but do not ship.

## Bundled

### Fonts in `skills/popnow-social-cover-generator/templates/fonts/`

Latin subsets of these families are bundled so covers render the same on every machine. Each family's
license file sits next to its font file and must stay with it.

| File | Family | License | Copyright | License file |
| --- | --- | --- | --- | --- |
| `fraunces-latin-wght-normal.woff2`, `fraunces-latin-wght-italic.woff2` | Fraunces | SIL OFL 1.1 | 2018 The Fraunces Project Authors | `fraunces-OFL.txt` |
| `source-sans-3-latin-wght-normal.woff2` | Source Sans 3 | SIL OFL 1.1 (Reserved Font Name "Source") | 2010-2020 Adobe | `source-sans-3-OFL.txt` |
| `bricolage-grotesque-var.woff2` | Bricolage Grotesque | SIL OFL 1.1 | 2022 The Bricolage Grotesque Project Authors | `bricolage-grotesque-OFL.txt` |
| `anton-latin.woff2` | Anton | SIL OFL 1.1 | 2020 The Anton Project Authors | `anton-OFL.txt` |
| `ibm-plex-mono-latin-400-normal.woff2` | IBM Plex Mono | SIL OFL 1.1 (Reserved Font Name "Plex") | 2017 IBM Corp. | `ibm-plex-mono-OFL.txt` |
| `caveat-latin.woff2` | Caveat | SIL OFL 1.1 | 2014 The Caveat Project Authors | `caveat-OFL.txt` |

The files are web (WOFF2) subsets of the upstream families and keep their original family names. The
SIL Open Font License allows bundling them with software; it does not allow selling the fonts by
themselves.

No other third-party code, images, audio or fonts are bundled.

## Used but not bundled

These tools are installed by the user (or fetched by `npx` / `npm` on the user's machine) and are used
under their own licenses. Nothing from them is copied into this repository.

| Tool | Used by | License | How it is obtained |
| --- | --- | --- | --- |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | `popnow-launch-film`, `popnow-narrated-explainer`, `popnow-hyperframes-ai-assets` | Apache-2.0 | `npx hyperframes <command>` |
| [GSAP](https://gsap.com) | Compositions written by `popnow-launch-film` and `popnow-narrated-explainer` | [GSAP Standard License](https://gsap.com/standard-license) | `npm i gsap@3`, then copy `node_modules/gsap/dist/gsap.min.js` into the project's `assets/`; or a pinned CDN build such as `https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js` |
| [FFmpeg](https://ffmpeg.org) | Audio mixing, loudness checks and video QA in the video skills | LGPL-2.1+ / GPL (depending on the build) | System package |
| Google Chrome, Chromium or Microsoft Edge | Screenshots, frame audits, cover rendering and PDF export | Their vendors' terms | Installed browser |
| [Playwright](https://playwright.dev) (optional) | Fallback browser driver in `popnow-landing-page-from-mockup` and `popnow-social-cover-generator` | Apache-2.0 | `npm i playwright` when the user prefers it |
| [fontTools](https://github.com/fonttools/fonttools) (optional) | Outlined wordmarks in `popnow-brand-kit-design-md` | MIT | `pip install fonttools` |
| Node.js, Python | Script runtimes | Their own licenses | System install |

Fonts that the narrated explainer and brand kit skills recommend (Inter, Noto, Caveat and others) are
downloaded by the user from the font's official source, together with its license file.

## Media generated through PopNow

Images, video, music and speech that a skill generates through the PopNow API are subject to the
[PopNow Terms](https://popnow.ai/terms) and to each model's own terms. They are not part of this
repository.
