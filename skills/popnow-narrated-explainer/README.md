# PopNow Narrated Explainer

`popnow-narrated-explainer` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Turns a topic, article, document or dataset into a 45 to 120 second narrated explainer video in one of three looks (paper collage, whiteboard, data story), with voiceover in 12 languages, captions timed to the spoken words, sourced facts and a QA pass for sync, pace and loudness.

Previews and a full description: https://popnow.ai/skills/narrated-explainer

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-narrated-explainer
./setup --host claude --skill popnow-narrated-explainer        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Python 3, Node.js 22+, FFmpeg, Chrome, HyperFrames through `npx` (Apache-2.0), GSAP installed with `npm i gsap@3` (not bundled). `POPNOW_API_KEY` for the PopNow voice; without one, record your own voice or deliver a captioned silent cut.

## Cost

The skill is free. Only what PopNow generates spends credits (1 credit = $0.001), and the agent quotes
the price and waits for your yes before every paid run; `scripts/popnow.py create` refuses to start
above the amount you confirmed. About 21 credits for a 60 s lite video (voice and transcription) up to about 440 credits for 120 s with music and six generated cut-outs. Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, no credits:

```bash
python3 scripts/explainer.py selftest && node scripts/kit-selftest.mjs
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
