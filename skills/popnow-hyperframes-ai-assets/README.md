# PopNow AI Assets for HyperFrames

`popnow-hyperframes-ai-assets` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Fills the gaps a HyperFrames composition cannot draw in code: photoreal stills, 3 to 5 second B-roll, original instrumental music, voiceover in 12 languages and sound effects. One JSON plan is validated, quoted as a single total, generated, filed into `assets/` and recorded in the HyperFrames media ledger with its prompt, model, task and USD cost.

Previews and a full description: https://popnow.ai/skills/hyperframes-ai-assets

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-hyperframes-ai-assets
./setup --host claude --skill popnow-hyperframes-ai-assets        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Node.js 22+ and Python 3, a HyperFrames project (`npx hyperframes init`), `POPNOW_API_KEY` for generation. `--dry-run` works without a key.

## Cost

The skill is free. Only what PopNow generates is paid, in USD from the separate API USD balance behind
your API key (it starts at $0 and is separate from website credits; add funds in
https://popnow.ai/api/console/billing). The agent quotes the USD price and waits for your yes before every
paid run; `scripts/popnow.py create` refuses to start above the amount you confirmed. A 30 s film's media
is about $0.082 (music bed and voiceover) to about $0.50 (adds a hero still and two B-roll clips).
Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, nothing charged:

```bash
node scripts/popnow-assets.mjs --self-test
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
