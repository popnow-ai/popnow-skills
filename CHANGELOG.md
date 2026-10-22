# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `popnow-skill-finder` skill: finds a free ready-made style preset in the PopNow skills catalog (product launch videos, slide decks, landing pages, websites, editorial images), shows the options with preview links, installs the one the user picks and follows it. It uses the PopNow MCP tools `find_skills` and `use_skill` when they are connected, then the `popnow` CLI, then the open API (`GET /api/v1/agent-skills`, `/{slug}`, `/{slug}/download`) through a dependency-free `find_skills.py` that never sends the API key to the storage host and checks the archive before unpacking it.
- `setup`: an offline POSIX shell installer that links or copies the skills into Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot or OpenCode skills folders (`--host`, `--project`, `--copy`, `--skill`, `--force`, `--dry-run`).
- `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json` plugin manifests next to the Claude Code plugin.
- `INSTALL_FOR_AGENTS.md`: install steps to paste into any agent, including the cross-agent `npx skills add popnow-ai/popnow-skills`.
- Offline tests for the finder, the setup script and the plugin manifests.
- Six "make things" skills, written by PopNow and released under MIT:
  - `popnow-launch-film`: a 20 to 40 second product launch film (16:9, 9:16, 1:1) from a URL, README or repository, built in HTML, CSS and GSAP and rendered with HyperFrames, with a fact-checked beat sheet, an approved contact sheet, a loudness-checked mix and post copy.
  - `popnow-narrated-explainer`: a 45 to 120 second narrated explainer in three looks, with voiceover in 12 languages, word-timed captions, sourced facts and a QA pass.
  - `popnow-hyperframes-ai-assets`: stills, B-roll, music beds, voiceover and sound effects for a HyperFrames project from one quoted JSON plan, filed with provenance into the project's media ledger.
  - `popnow-landing-page-from-mockup`: a landing page designed as two or three AI mockups first, then built, screenshot-compared with the mockup and linted for generic design habits.
  - `popnow-social-cover-generator`: exact-size social covers and thumbnails for seven platforms with real HTML text, safe areas and contrast checks.
  - `popnow-brand-kit-design-md`: a brand kit (palette, type, tokens, voice, SVG wordmark, mockups, brand board) delivered as a `DESIGN.md` that other skills read.
  Each ships the shared `popnow.py`, a short README linking to its preview on popnow.ai, a lite mode and offline self-tests. The skills are free; generation is quoted in PopNow credits before it runs.
- `THIRD_PARTY_NOTICES.md`: the bundled SIL OFL fonts (each with its license file next to it) and the tools the skills call without bundling them (HyperFrames, GSAP, FFmpeg, Chrome).
- `tests/test_make_skills.py`: frontmatter, license, font license and no-bundled-GSAP checks for the new skills, plus their offline self-tests (Node.js 22+ when installed; browser self-tests with `POPNOW_BROWSER_TESTS=1`).

### Changed

- Prices follow PopNow's new credit unit: 1 credit = $0.001 (it was $0.01), and every price in credits changed with it. Examples, typical prices, model tables (regenerated from the current catalog) and test fixtures are updated: a 5-second video on the default models is now about 125-340 credits, an image about 10-50, a song about 72, an effect video about 125-340 and an image style 30-50.
- The MCP reference now gives the current auto-start limit of 300 credits.
- `tools/sync_scripts.py` copies `popnow.py` into all eleven skills that ship it, and the identical-copy test covers them.
- README, `llms.txt` and the plugin manifests list the new skills in a "Make things" group.

## [1.0.0] - 2026-10-19

### Added

- `popnow-video`, `popnow-image`, `popnow-audio`, `popnow-effects` and `popnow-api` Agent Skills.
- `popnow.py`: dependency-free CLI for balance, models, quote, create (with enforced price confirmation), status, wait, download, upload, jobs, usage, retry and purge.
- `effects.py`: 143 PopNow effects and photo styles applied as ordinary tasks on their underlying models.
- API reference extracted from the public PopNow docs, and model tables with starting prices.
- Claude Code plugin marketplace (`/plugin marketplace add popnow-ai/popnow-skills`).
- Offline unit tests and CI.
