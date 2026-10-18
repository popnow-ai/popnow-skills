<p align="center">
  <a href="https://popnow.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/popnow-wordmark-light.png">
      <source media="(prefers-color-scheme: light)" srcset="assets/popnow-wordmark.png">
      <img alt="PopNow" src="assets/popnow-wordmark.png" width="280">
    </picture>
  </a>
</p>

<h1 align="center">PopNow Agent Skills: AI Video, Image and Music Generation for Claude Code and Codex</h1>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Python 3.8+, no dependencies" src="https://img.shields.io/badge/python-3.8%2B%20%C2%B7%20stdlib%20only-3776AB.svg">
  <img alt="Agent Skills" src="https://img.shields.io/badge/Agent%20Skills-SKILL.md-8A2BE2.svg">
  <a href="https://popnow.ai"><img alt="popnow.ai" src="https://img.shields.io/badge/site-popnow.ai-ff5a36.svg"></a>
</p>

**PopNow Skills is a set of open-source Agent Skills that let Claude Code, Claude.ai, Codex and other skill-compatible AI agents generate videos, images, music and speech, and apply trending video effects, through the [PopNow](https://popnow.ai) API, always quoting the credit price before anything runs.**

Each skill is a folder with a `SKILL.md` (instructions the agent loads when the task matches), a dependency-free Python 3 script (standard library `urllib` only) and reference docs. Ask your agent *"turn this photo into a 5-second video"* or *"make a lo-fi track for my intro"* and it picks the model, tells you the price in credits, waits for your yes, then creates, waits and downloads the file.

Make it pop.

## Quickstart

1. **Get an API key** at [popnow.ai/api/console/keys](https://popnow.ai/api/console/keys) and export it:
   ```bash
   export POPNOW_API_KEY="sk-popnow-..."
   ```
2. **Install the skills.** In Claude Code:
   ```text
   /plugin marketplace add popnow-ai/popnow-skills
   /plugin install popnow@popnow-skills
   ```
   (Other agents: see [Installation](#installation).)
3. **Ask for something:** *"Make a 5-second video of a paper boat sailing across a puddle, cinematic."* The agent quotes, asks you to confirm the credits, then saves the video to `./popnow-output/`.

Or run the script yourself:

```bash
python3 skills/popnow-video/scripts/popnow.py quote --model minimax/h3/text-to-video \
  --prompt "A paper boat sailing across a rain puddle, low angle, cinematic"
python3 skills/popnow-video/scripts/popnow.py create --model minimax/h3/text-to-video \
  --prompt "A paper boat sailing across a rain puddle, low angle, cinematic" \
  --confirm-credits 28 --download ./popnow-output
```

## Skills

| Skill | What it does | Typical models | Typical price |
| --- | --- | --- | --- |
| [`popnow-video`](skills/popnow-video/SKILL.md) | Text-to-video, image-to-video, extend and upscale clips | MiniMax H3, Kling 3.0, Seedance 2.0, Wan 3.0, Vidu Q3 | about 19-51 credits for 5 s |
| [`popnow-image`](skills/popnow-image/SKILL.md) | Text-to-image, photo editing, background removal, upscaling, layers | Nano Banana 2.1, GPT Image 2, Seedream 5.0, FLUX.2, Qwen Image | 1-8 credits per image |
| [`popnow-audio`](skills/popnow-audio/SKILL.md) | Songs and instrumentals, voiceovers, transcription, video sound effects | Suno v6, MiniMax Music 3.0, Gemini TTS, MiniMax Speech | about 11 credits per song |
| [`popnow-effects`](skills/popnow-effects/SKILL.md) | 143 trending effects on a photo: Tiny Planet, Zombie Turn, Hyperdrive, Clay Figure, Pixel Art ... | the effect's own model | 19-51 credits per video, 5-8 per image |
| [`popnow-api`](skills/popnow-api/SKILL.md) | API reference: auth, models, task lifecycle, errors, webhooks, idempotency, uploads | all | reading is free |

1 credit = $0.01. Credit packs, no subscription, failed runs refunded automatically. Prices: [popnow.ai/pricing](https://popnow.ai/pricing). The live model list (Kling, Seedance, Wan, Vidu, MiniMax, Nano Banana, GPT Image, Flux, Suno and more) comes from `GET /api/v1/models`.

## How it works

Every generation is an asynchronous PopNow task, and the scripts follow the API exactly:

1. `POST /api/v1/jobs/quote`: the exact price of this request. Creates nothing, charges nothing.
2. The agent tells you the price and your balance and waits for a yes.
3. `POST /api/v1/jobs/createTask` with `quoteId`, `expectedCredits` and an `Idempotency-Key`. If the price changed, nothing is held and the agent asks again.
4. `GET /api/v1/jobs/recordInfo` until `succeeded`, `failed` or `expired` (with `?wait=60` on the first call for fast jobs).
5. Download `output.assets[].url` (signed links, about 20 minutes) into a local folder.

The cost rule is enforced in code, not just in the instructions: `create` requires `--confirm-credits N` and refuses to start when the fresh quote is above `N` (exit code 3).

## Installation

The skills follow the open [Agent Skills](https://agentskills.io) format (`SKILL.md` with `name` and `description` frontmatter), so any compatible agent can use them. Every skill folder is self-contained: copy one or all.

### Claude Code: plugin marketplace (recommended)

```text
/plugin marketplace add popnow-ai/popnow-skills
/plugin install popnow@popnow-skills
```

Skills appear as `popnow:popnow-video`, `popnow:popnow-image` and so on, and update with `/plugin marketplace update popnow-skills`.

### Claude Code: personal skills folder

```bash
git clone https://github.com/popnow-ai/popnow-skills.git
mkdir -p ~/.claude/skills
cp -R popnow-skills/skills/popnow-* ~/.claude/skills/
```

Use `.claude/skills/` inside a project instead to share the skills with your team through the repository.

### Codex

Codex reads skills from `~/.agents/skills` (user) or `.agents/skills` (repository):

```bash
git clone https://github.com/popnow-ai/popnow-skills.git
mkdir -p ~/.agents/skills
cp -R popnow-skills/skills/popnow-* ~/.agents/skills/
```

Restart Codex if the skills do not show up. Make sure the sandbox allows network access to `api.popnow.ai`.

### Claude.ai and the Claude desktop app

Zip one skill folder (for example `cd skills && zip -r popnow-video.zip popnow-video`) and upload it in the Skills section of **Settings > Capabilities**. Code execution must be enabled, and its network settings must allow `api.popnow.ai` and `media.popnow.ai`; otherwise use the [MCP server](#mcp-alternative) instead.

### Other agents

Any agent that supports the Agent Skills format can load these folders: copy `skills/popnow-*` into the skills directory its docs name. Agents without skill support can still run the scripts directly; they only need Python 3.8+ and `POPNOW_API_KEY`.

## Usage

All five skills ship the same `popnow.py` (effects adds `effects.py`):

```bash
S=skills/popnow-api/scripts/popnow.py
python3 $S balance                                        # credits available and held
python3 $S models --modality video --search kling         # catalog with starting prices
python3 $S model kling/3.0/image-to-video                 # price tiers and every input field
python3 $S quote  --model google/nano-banana-2.1/edit --image ./me.jpg --prompt "Make it a watercolor"
python3 $S create --model google/nano-banana-2.1/edit --image ./me.jpg --prompt "Make it a watercolor" \
        --confirm-credits 8 --download ./out
python3 $S wait job_... --out ./out                       # resume a long task
python3 $S upload ./clip.mp4                              # -> popnow://f/fil_...
python3 $S jobs --state failed                            # this key's history

E=skills/popnow-effects/scripts/effects.py
python3 $E list --popular
python3 $E quote zombie-turn --image ./me.jpg
python3 $E create zombie-turn --image popnow://f/fil_... --confirm-credits 51 --download ./out
```

Input flags: `--prompt`, `--text`, `--image` (repeatable), `--last-image`, `--video`, `--audio`, `--duration`, `--resolution`, `--aspect-ratio`, `--seed`, `--lyrics`, `--title`, `--voice`, plus `--set key=value` and `--input '{...}'` for any other field in the model's schema. Media flags take an HTTPS URL, a `popnow://` URI or a local file, which is uploaded first (uploads are free). Add `--json` for raw output.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `POPNOW_API_KEY` | (required) | `sk-popnow-...` key from the API console |
| `POPNOW_BASE_URL` | `https://api.popnow.ai` | API base URL |

Give an agent its own key with a daily spend cap and, if you like, an allowed-models list; both are set per key in the API console.

### Error handling

| Exit code | Meaning |
| --- | --- |
| 0 | Done |
| 1 | API or network error; the message carries the PopNow `code`, `request_id` and a hint (`40201` = top up, `40301` = model not allowed for this key ...) |
| 2 | Bad usage, missing `POPNOW_API_KEY`, unknown model or field |
| 3 | The price is above `--confirm-credits`; nothing was charged |
| 4 | Still running after `--timeout`; resume with `wait` |
| 5 | The task failed or expired; its hold was refunded |

Retries reuse the same `Idempotency-Key`, so a network hiccup never creates or bills a task twice. Full error reference: [skills/popnow-api/references/errors.md](skills/popnow-api/references/errors.md).

## MCP alternative

PopNow also runs a remote MCP server at `https://api.popnow.ai/mcp` (Streamable HTTP, OAuth 2.1 or a `sk-popnow-` Bearer key) with 12 tools: `create_image`, `edit_image`, `create_video`, `create_music`, `create_speech`, `apply_effect`, `remove_background`, `upscale`, `get_job`, `list_my_creations`, `check_balance` and `list_models`.

```bash
claude mcp add --transport http popnow https://api.popnow.ai/mcp
```

Use MCP in chat apps without a shell (add it as a custom connector in Claude or ChatGPT); use these skills when you want local files in and out, every model parameter, or scripts you can read. Setup for every client: [popnow.ai/mcp](https://popnow.ai/mcp) and [github.com/popnow-ai/popnow-mcp](https://github.com/popnow-ai/popnow-mcp).

## FAQ

### How do I generate a video from an image with an API?

Upload or link the image and create a task on an image-to-video model, for example `python3 popnow.py create --model minimax/h3/image-to-video --image ./photo.jpg --prompt "She turns and smiles" --confirm-credits 28 --download ./out`. Under the hood that is `POST /api/v1/jobs/createTask` followed by polling `GET /api/v1/jobs/recordInfo`.

### How do I add AI video generation to Claude Code?

Run `/plugin marketplace add popnow-ai/popnow-skills`, then `/plugin install popnow@popnow-skills`, and export `POPNOW_API_KEY`. Claude Code then uses the `popnow-video` skill whenever you ask for a video.

### Do the skills spend credits without asking?

No. The instructions tell the agent to quote and get your OK first, and the script enforces it: `create` needs `--confirm-credits` and will not start a task that costs more than that number.

### How much does a PopNow AI video cost?

About 19-51 credits ($0.19-$0.51) for a 5-second clip on the default models; longer or higher-resolution clips cost more. `quote` gives the exact amount before anything runs, and failed or expired tasks are refunded automatically.

### Which AI models are supported?

Every image, video and audio model in the PopNow catalog, including Kling, Seedance, Wan, Vidu, MiniMax, Nano Banana, GPT Image, Flux, Qwen Image, Suno and Gemini TTS. `popnow.py models` lists the live catalog with prices.

### Can I use PopNow's trending video effects from code?

Yes, with the `popnow-effects` skill. The REST API has no separate effects endpoint, so the skill ships each effect's recipe (model, prompt and settings) and runs it as a normal task on the underlying model, at the same price as the website.

### Do I need to install any Python packages?

No. The scripts use only the Python 3.8+ standard library, so they run in Claude Code, Codex, Claude.ai code execution or any shell.

### Is there an OpenAI-compatible endpoint?

Yes, for video: `POST /v1/videos`, `GET /v1/videos/{id}` and `GET /v1/videos/{id}/content` follow the OpenAI Videos API shape. See [openai-compatible.md](skills/popnow-api/references/openai-compatible.md).

## Links

- Website: [popnow.ai](https://popnow.ai) · Pricing: [popnow.ai/pricing](https://popnow.ai/pricing)
- Docs: [popnow.ai/docs](https://popnow.ai/docs) · OpenAPI spec: [popnow.ai/docs/openapi.yaml](https://popnow.ai/docs/openapi.yaml) · [llms.txt](https://popnow.ai/llms.txt)
- MCP: [popnow.ai/mcp](https://popnow.ai/mcp)
- Other PopNow repos: [popnow-mcp](https://github.com/popnow-ai/popnow-mcp) · [popnow-python](https://github.com/popnow-ai/popnow-python) · [popnow-js](https://github.com/popnow-ai/popnow-js) · [popnow-api](https://github.com/popnow-ai/popnow-api) · [popnow-blender](https://github.com/popnow-ai/popnow-blender)

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Run the offline tests with `python3 -m unittest discover -s tests`; they never call the live API.

## License

[MIT](LICENSE). Generated media is subject to the [PopNow terms](https://popnow.ai/terms) and each model's own license.
