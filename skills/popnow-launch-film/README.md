# PopNow Launch Film

`popnow-launch-film` is a free [Agent Skill](https://agentskills.io) from [PopNow](https://popnow.ai). The agent
loads [SKILL.md](SKILL.md) when a request matches and follows its workflow.

Turns a product URL, README or repository into a 20 to 40 second launch film (MP4 in 16:9, 9:16 and 1:1) plus the posting kit: X and LinkedIn copy, a thumbnail frame and alt text. The film is planned from the product's real facts, a contact sheet is approved before anything renders, and the finished file is measured for holds, runtime and loudness.

Previews and a full description: https://popnow.ai/skills/launch-film

## Install

With the skills CLI, or with `./setup` from a clone of this repository:

```bash
npx skills add popnow-ai/popnow-skills -s popnow-launch-film
./setup --host claude --skill popnow-launch-film        # or codex, cursor, gemini, copilot, opencode
```

In Claude Code, `/plugin install popnow@popnow-skills` installs every PopNow skill, this one included.

## Requirements

Node.js 22+, FFmpeg, Chrome, HyperFrames through `npx` (Apache-2.0). Optional: Python 3 and `POPNOW_API_KEY` for generated stills, B-roll, music and voiceover.

## Cost

The skill is free. Only what PopNow generates spends credits (1 credit = $0.001), and the agent quotes
the price and waits for your yes before every paid run; `scripts/popnow.py create` refuses to start
above the amount you confirmed. Free without generated media. With PopNow: about 72 credits (music bed only) to about 500 credits (hero still, two B-roll clips, music and voiceover) for a 30 s film. Rendering and checks run on your machine and cost nothing.

## Self-test

Run from this folder; offline, no API key, no credits:

```bash
for f in scripts/*.mjs; do node "$f" --self-test; done
```

## License

MIT (see the repository's [LICENSE](../../LICENSE)). Third-party components keep their own licenses;
see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
