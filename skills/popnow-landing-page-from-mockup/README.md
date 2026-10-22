# PopNow Landing Page from Mockups

`popnow-landing-page-from-mockup` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Designs a landing page as pictures first: two or three full-page mockups in different art directions, the user picks one, then the agent builds it as semantic, responsive HTML/CSS (or in the user's framework), screenshots it on desktop and phone, compares it with the mockup and runs a lint for machine-made design habits.

Previews and a full description: https://popnow.ai/skills/landing-page-from-mockup

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-landing-page-from-mockup
./setup --host claude --skill popnow-landing-page-from-mockup        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Node.js 22+, Chrome, Python 3 and `POPNOW_API_KEY` for the mockups. Without a key the directions are built as quick HTML boards instead.

## Cost

The skill is free. Only what PopNow generates spends credits (1 credit = $0.001), and the agent quotes
the price and waits for your yes before every paid run; `scripts/popnow.py create` refuses to start
above the amount you confirmed. About 275 credits for three mockups and the page imagery; lite (one mockup) about 35. Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, no credits:

```bash
node scripts/selftest.mjs
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
