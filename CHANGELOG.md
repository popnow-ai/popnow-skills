# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-19

### Added

- `popnow-video`, `popnow-image`, `popnow-audio`, `popnow-effects` and `popnow-api` Agent Skills.
- `popnow.py`: dependency-free CLI for balance, models, quote, create (with enforced price confirmation), status, wait, download, upload, jobs, usage, retry and purge.
- `effects.py`: 143 PopNow effects and photo styles applied as ordinary tasks on their underlying models.
- API reference extracted from the public PopNow docs, and model tables with starting prices.
- Claude Code plugin marketplace (`/plugin marketplace add popnow-ai/popnow-skills`).
- Offline unit tests and CI.
