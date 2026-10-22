# PopNow Brand Kit and DESIGN.md

`popnow-brand-kit-design-md` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Builds a brand kit from a short brief: three directions to choose from, a contrast-checked palette, an open-licence type pairing, design tokens, voice and tone, an outlined SVG wordmark and symbol, and mockups, delivered as a `DESIGN.md` other agents can read, W3C design tokens (`tokens.json`), `tokens.css` and a one-page brand board (HTML and PDF).

Previews and a full description: https://popnow.ai/skills/brand-kit-design-md

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-brand-kit-design-md
./setup --host claude --skill popnow-brand-kit-design-md        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Python 3 and Chrome (for the board and PDF). `POPNOW_API_KEY` for moodboard pictures and photo mockups; the lite kit (palette, type and voice) needs no key.

## Cost

The skill is free. Only what PopNow generates spends credits (1 credit = $0.001), and the agent quotes
the price and waits for your yes before every paid run; `scripts/popnow.py create` refuses to start
above the amount you confirmed. A full kit is about 190-220 credits; lite is free (or about 30 with three draft tiles). Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, no credits:

```bash
python3 scripts/selftest.py
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
