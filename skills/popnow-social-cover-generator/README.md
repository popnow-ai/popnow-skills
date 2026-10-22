# PopNow Social Covers and Thumbnails

`popnow-social-cover-generator` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Turns one message into a full set of share images at exact sizes: Open Graph, X, LinkedIn, RedNote, YouTube thumbnail, Instagram and optional App Store screenshots. Every word is real HTML text in bundled open-licence fonts, so nothing is misspelled; only backgrounds and subjects come from image generation. Seven layouts, per-platform safe areas, and checks for fit, contrast, reserved zones and file weight.

Previews and a full description: https://popnow.ai/skills/social-cover-generator

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-social-cover-generator
./setup --host claude --skill popnow-social-cover-generator        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Node.js 22+, Chrome, Python 3. `POPNOW_API_KEY` only for generated backgrounds; picture-free layouts need no key.

## Cost

The skill is free. Only what PopNow generates spends credits (1 credit = $0.001), and the agent quotes
the price and waits for your yes before every paid run; `scripts/popnow.py create` refuses to start
above the amount you confirmed. About 100-200 credits for a six-platform set with generated pictures; lite about 22-48; picture-free sets cost nothing. Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, no credits:

```bash
node scripts/selftest.mjs
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
