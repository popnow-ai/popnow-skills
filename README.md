<p align="center">
  <a href="https://popnow.ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/popnow-wordmark-light.png">
      <source media="(prefers-color-scheme: light)" srcset="assets/popnow-wordmark.png">
      <img alt="PopNow" src="assets/popnow-wordmark.png" width="280">
    </picture>
  </a>
</p>

<h1 align="center">PopNow Agent Skills: AI Video, Image and Music Generation for Claude Code, Codex, Cursor and Any AI Agent</h1>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <img alt="Python 3.8+, no dependencies" src="https://img.shields.io/badge/python-3.8%2B%20%C2%B7%20stdlib%20only-3776AB.svg">
  <img alt="Agent Skills" src="https://img.shields.io/badge/Agent%20Skills-SKILL.md-8A2BE2.svg">
  <a href="https://popnow.ai"><img alt="popnow.ai" src="https://img.shields.io/badge/site-popnow.ai-ff5a36.svg"></a>
</p>

**PopNow Skills is a set of open-source Agent Skills that let Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, Claude.ai and other skill-compatible AI agents generate videos, images, music and speech, apply trending video effects, make finished work (product launch films, narrated explainer videos, landing pages, social covers and thumbnails, brand kits with a DESIGN.md), and find free ready-made style presets, through the [PopNow](https://popnow.ai) API, always quoting the credit price before anything runs.**

Each skill is a folder with a `SKILL.md` (instructions the agent loads when the task matches), a dependency-free Python 3 script (standard library `urllib` only) and reference docs; the make-things skills add dependency-free Node.js and Python tools that run on your machine. Ask your agent *"turn this photo into a 5-second video"*, *"make a 30-second launch film from our README"* or *"find a style for our pitch deck"* and it picks the model or preset, tells you the price in credits, waits for your yes, then creates, waits and downloads the file.

Make it pop.

## Quickstart

1. **Get an API key** at [popnow.ai/api/console/keys](https://popnow.ai/api/console/keys) and export it in the shell your agent runs in:
   ```bash
   export POPNOW_API_KEY="sk-popnow-..."
   ```
2. **Install the skills.** In Claude Code:
   ```text
   /plugin marketplace add popnow-ai/popnow-skills
   /plugin install popnow@popnow-skills
   ```
   Any agent, with the open [skills CLI](https://github.com/vercel-labs/skills): `npx skills add popnow-ai/popnow-skills`. From a clone: `./setup --host <claude|codex|cursor|gemini|copilot|opencode>`. All options: [Installation](#installation), or paste [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md) into your agent.
3. **Ask for something:** *"Make a 5-second video of a paper boat sailing across a puddle, cinematic."* The agent quotes, asks you to confirm the credits, then saves the video to `./popnow-output/`.

Or run the script yourself:

```bash
python3 skills/popnow-video/scripts/popnow.py quote --model minimax/h3/text-to-video \
  --prompt "A paper boat sailing across a rain puddle, low angle, cinematic"
python3 skills/popnow-video/scripts/popnow.py create --model minimax/h3/text-to-video \
  --prompt "A paper boat sailing across a rain puddle, low angle, cinematic" \
  --confirm-credits 185 --download ./popnow-output
```

## Skills

### Generate

| Skill | What it does | Typical models | Typical price |
| --- | --- | --- | --- |
| [`popnow-video`](skills/popnow-video/SKILL.md) | Text-to-video, image-to-video, extend and upscale clips | MiniMax H3, Kling 3.0, Seedance 2.0, Wan 3.0, Vidu Q3 | about 125-340 credits for 5 s |
| [`popnow-image`](skills/popnow-image/SKILL.md) | Text-to-image, photo editing, background removal, upscaling, layers | Nano Banana 2.1, GPT Image 2, Seedream 5.0, FLUX.2, Qwen Image | about 10-50 credits per image |
| [`popnow-audio`](skills/popnow-audio/SKILL.md) | Songs and instrumentals, voiceovers, transcription, video sound effects | Suno v6, MiniMax Music 3.0, Gemini TTS, MiniMax Speech | about 72 credits per song |
| [`popnow-effects`](skills/popnow-effects/SKILL.md) | 143 trending effects on a photo: Tiny Planet, Zombie Turn, Hyperdrive, Clay Figure, Pixel Art ... | the effect's own model | about 125-340 credits per video, 30-50 per image |

### Make things

Complete workflows: the agent plans, shows you a contact sheet or mockups to approve, builds the result in code on your machine (free) and uses PopNow only for what code cannot draw. Each has a lite mode and an offline self-test.

| Skill | What you get | Runs locally | Typical price |
| --- | --- | --- | --- |
| [`popnow-launch-film`](skills/popnow-launch-film/SKILL.md) | A 20-40 s product launch film (16:9, 9:16, 1:1) from a URL, README or repo, plus post copy, thumbnail and alt text | Node.js, FFmpeg, Chrome, [HyperFrames](https://github.com/heygen-com/hyperframes) | free without generated media; about 72-500 credits with music, voice, stills and B-roll |
| [`popnow-narrated-explainer`](skills/popnow-narrated-explainer/SKILL.md) | A 45-120 s narrated explainer video (paper collage, whiteboard or data story) with voiceover in 12 languages and word-timed captions | Python, Node.js, FFmpeg, Chrome, HyperFrames | about 21 credits for 60 s lite; 110-440 with music and images |
| [`popnow-landing-page-from-mockup`](skills/popnow-landing-page-from-mockup/SKILL.md) | A landing page designed as two or three AI mockups first, then built in HTML/CSS or your framework and checked against the chosen mockup | Node.js, Chrome | about 275 credits; lite about 35 |
| [`popnow-social-cover-generator`](skills/popnow-social-cover-generator/SKILL.md) | Social covers and thumbnails at exact sizes for Open Graph, X, LinkedIn, RedNote, YouTube, Instagram and App Store, with real HTML text (no misspelled headlines) | Node.js, Chrome | about 100-200 credits per set; free with picture-free layouts |
| [`popnow-brand-kit-design-md`](skills/popnow-brand-kit-design-md/SKILL.md) | A brand kit: palette, type, tokens, voice, SVG wordmark, mockups and a brand board, delivered as a `DESIGN.md` other agents follow | Python, Chrome | about 190-220 credits; lite is free |
| [`popnow-hyperframes-ai-assets`](skills/popnow-hyperframes-ai-assets/SKILL.md) | AI assets for HyperFrames videos: photoreal stills, B-roll, music beds, voiceover and sound effects from one quoted JSON plan, filed into `assets/` with provenance | Node.js, Python | about 82-500 credits for a 30 s film |

### Find and look up

| Skill | What it does | Uses | Typical price |
| --- | --- | --- | --- |
| [`popnow-skill-finder`](skills/popnow-skill-finder/SKILL.md) | Finds a free ready-made style preset in the [PopNow skills catalog](https://popnow.ai/skills/agent-skills) (product launch videos, slide decks, landing pages, websites, editorial images), shows the previews, installs the one you pick and follows it | PopNow MCP `find_skills` / `use_skill`, the `popnow` CLI, or the open API | free; the generations a preset runs are quoted first |
| [`popnow-api`](skills/popnow-api/SKILL.md) | API reference: auth, models, task lifecycle, errors, webhooks, idempotency, uploads | all | reading is free |

The live model list (Kling, Seedance, Wan, Vidu, MiniMax, Nano Banana, GPT Image, Flux, Suno and more) comes from `GET /api/v1/models`.

## Pricing: skills are free, generations use credits

- **The skills cost nothing.** Installing these skills, searching the [catalog](https://popnow.ai/skills/agent-skills), and installing and using a style preset are free.
- **You pay only for what PopNow generates**: each image, video, song or voiceover a skill makes spends PopNow credits at the same price as on [popnow.ai](https://popnow.ai). 1 credit = $0.001, so 1,000 credits = $1.
- **Always quoted first.** The agent shows the exact price and runs a generation only after your yes; `create` refuses to start above the amount you confirmed. Failed or expired tasks are refunded automatically.
- **Credit packs, no subscription**: from Starter ($9, 9,000 credits) to Pro ($99, 120,000 credits including bonus), or any amount from $10 to $2,000 at 1,000 credits per $1. See [popnow.ai/pricing](https://popnow.ai/pricing).

## How it works

Every generation is an asynchronous PopNow task, and the scripts follow the API exactly:

1. `POST /api/v1/jobs/quote`: the exact price of this request. Creates nothing, charges nothing.
2. The agent tells you the price and your balance and waits for a yes.
3. `POST /api/v1/jobs/createTask` with `quoteId`, `expectedCredits` and an `Idempotency-Key`. If the price changed, nothing is held and the agent asks again.
4. `GET /api/v1/jobs/recordInfo` until `succeeded`, `failed` or `expired` (with `?wait=60` on the first call for fast jobs).
5. Download `output.assets[].url` (signed links, about 20 minutes) into a local folder.

The cost rule is enforced in code, not just in the instructions: `create` requires `--confirm-credits N` and refuses to start when the fresh quote is above `N` (exit code 3).

## Installation

The skills follow the open [Agent Skills](https://agentskills.io) format (`SKILL.md` with `name` and `description` frontmatter), so any compatible agent can use them. Every skill folder is self-contained: install one or all. Pick whichever route suits you; they all end with the same folders in your agent's skills directory.

| Agent | Plugin | skills CLI (`npx skills add popnow-ai/popnow-skills ...`) | From a clone | Personal folder | Project folder |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `/plugin marketplace add popnow-ai/popnow-skills` | `-a claude-code -g` | `./setup --host claude` | `~/.claude/skills` | `.claude/skills` |
| Codex | `.codex-plugin/plugin.json` | `-a codex -g` | `./setup --host codex` | `~/.agents/skills` | `.agents/skills` |
| Cursor | `.cursor-plugin/plugin.json` | `-a cursor -g` | `./setup --host cursor` | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI | | `-a gemini-cli -g` | `./setup --host gemini` | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot | | `-a github-copilot -g` | `./setup --host copilot` | `~/.copilot/skills` | `.github/skills` |
| OpenCode | | `-a opencode -g` | `./setup --host opencode` | `~/.config/opencode/skills` | `.opencode/skills` |

Then export `POPNOW_API_KEY` in the environment your agent runs in and restart the agent if it only discovers skills at startup. Want your agent to do it? Paste [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md) into the chat.

### Claude Code: plugin marketplace

```text
/plugin marketplace add popnow-ai/popnow-skills
/plugin install popnow@popnow-skills
```

Skills appear as `popnow:popnow-video`, `popnow:popnow-image` and so on, and update with `/plugin marketplace update popnow-skills`.

### Any agent: the skills CLI

The open [skills CLI](https://github.com/vercel-labs/skills) (Node.js) installs into the folders of the agents it finds:

```bash
npx skills add popnow-ai/popnow-skills                  # this project; pick agents and skills interactively
npx skills add popnow-ai/popnow-skills -g -a codex      # your personal Codex folder
npx skills add popnow-ai/popnow-skills -s popnow-video popnow-skill-finder     # only some skills
```

### From a clone: `./setup`

`setup` is a POSIX shell script that never touches the network. It links each `skills/*` folder into the agent's skills folder, so `git pull` updates them in place:

```bash
git clone https://github.com/popnow-ai/popnow-skills.git ~/popnow-skills
~/popnow-skills/setup --host codex                       # personal folder (~/.agents/skills)
cd ~/my-app && ~/popnow-skills/setup --host claude --project --copy   # this project's .claude/skills, as copies
~/popnow-skills/setup --host cursor --skill popnow-video --dry-run    # show what would happen
```

Options: `--project` (current directory instead of your personal folder), `--copy` (copies instead of links; use it when the project folder is committed), `--skill NAME` (repeatable), `--force` (replace an existing folder of the same name), `--dry-run`. Hosts: `claude`, `codex`, `cursor`, `gemini`, `copilot`, `opencode`. Plain `cp -R skills/popnow-* <folder>/` works too.

### Codex and Cursor plugins

The repository root is also a plugin for both: `.codex-plugin/plugin.json` (Codex plugin manifest with the skills and display metadata) and `.cursor-plugin/plugin.json` (Cursor plugin manifest). Both point at the same `skills/` folder. Until PopNow is listed in their plugin directories, install the skills with the skills CLI or `./setup` as above. Make sure the Codex sandbox allows network access to `api.popnow.ai`.

### Claude.ai and the Claude desktop app

Zip one skill folder (for example `cd skills && zip -r popnow-video.zip popnow-video`) and upload it in the Skills section of **Settings > Capabilities**. Code execution must be enabled, and its network settings must allow `api.popnow.ai` and `media.popnow.ai`; otherwise use the [MCP server](#mcp-alternative) instead.

### Other agents

Any agent that supports the Agent Skills format can load these folders: copy `skills/popnow-*` into the skills directory its docs name. Agents without skill support can still run the scripts directly; they only need Python 3.8+ and `POPNOW_API_KEY`.

## Usage

Every skill except the finder ships the same `popnow.py` (effects adds `effects.py`, and each make-things skill adds its own tools, documented in its `SKILL.md`); the skill finder has its own `find_skills.py`:

```bash
S=skills/popnow-api/scripts/popnow.py
python3 $S balance                                        # credits available and held
python3 $S models --modality video --search kling         # catalog with starting prices
python3 $S model kling/3.0/image-to-video                 # price tiers and every input field
python3 $S quote  --model google/nano-banana-2.1/edit --image ./me.jpg --prompt "Make it a watercolor"
python3 $S create --model google/nano-banana-2.1/edit --image ./me.jpg --prompt "Make it a watercolor" \
        --confirm-credits 48 --download ./out
python3 $S wait job_... --out ./out                       # resume a long task
python3 $S upload ./clip.mp4                              # -> popnow://f/fil_...
python3 $S jobs --state failed                            # this key's history

E=skills/popnow-effects/scripts/effects.py
python3 $E list --popular
python3 $E quote zombie-turn --image ./me.jpg
python3 $E create zombie-turn --image popnow://f/fil_... --confirm-credits 336 --download ./out

F=skills/popnow-skill-finder/scripts/find_skills.py      # free: search, details and install
python3 $F search "product launch video" --type video --limit 4
python3 $F info <slug>
python3 $F install <slug> --agent claude-code              # or codex, cursor, gemini-cli, github-copilot, opencode
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

PopNow also runs a remote MCP server at `https://api.popnow.ai/mcp` (Streamable HTTP, OAuth 2.1 or a `sk-popnow-` Bearer key) with generation tools such as `create_image`, `edit_image`, `create_video`, `create_music`, `create_speech`, `apply_effect`, `remove_background` and `upscale`, account tools such as `get_job`, `check_balance` and `list_models`, and two free tools for style presets: `find_skills` (3 to 6 presets with previews for what you want to make) and `use_skill` (the chosen preset's full playbook, a short-lived download link and install commands). The MCP server is the main way to use the [skills catalog](https://popnow.ai/skills/agent-skills); `popnow-skill-finder` uses it when it is connected.

```bash
claude mcp add --transport http popnow https://api.popnow.ai/mcp
```

Use MCP in chat apps without a shell (add it as a custom connector in Claude or ChatGPT); use these skills when you want local files in and out, every model parameter, or scripts you can read. Setup for every client: [popnow.ai/mcp](https://popnow.ai/mcp) and [github.com/popnow-ai/popnow-mcp](https://github.com/popnow-ai/popnow-mcp).

## FAQ

### How do I generate a video from an image with an API?

Upload or link the image and create a task on an image-to-video model, for example `python3 popnow.py create --model minimax/h3/image-to-video --image ./photo.jpg --prompt "She turns and smiles" --confirm-credits 185 --download ./out`. Under the hood that is `POST /api/v1/jobs/createTask` followed by polling `GET /api/v1/jobs/recordInfo`.

### How do I add AI video generation to Claude Code?

Run `/plugin marketplace add popnow-ai/popnow-skills`, then `/plugin install popnow@popnow-skills`, and export `POPNOW_API_KEY`. Claude Code then uses the `popnow-video` skill whenever you ask for a video.

### Do the skills spend credits without asking?

No. The instructions tell the agent to quote and get your OK first, and the script enforces it: `create` needs `--confirm-credits` and will not start a task that costs more than that number.

### How much does a PopNow AI video cost?

About 125-340 credits ($0.125-$0.34) for a 5-second clip on the default models, for example 185 credits for MiniMax H3 at 768p; longer or higher-resolution clips cost more. 1 credit = $0.001. `quote` gives the exact amount before anything runs, and failed or expired tasks are refunded automatically.

### Which AI models are supported?

Every image, video and audio model in the PopNow catalog, including Kling, Seedance, Wan, Vidu, MiniMax, Nano Banana, GPT Image, Flux, Qwen Image, Suno and Gemini TTS. `popnow.py models` lists the live catalog with prices.

### Can I use PopNow's trending video effects from code?

Yes, with the `popnow-effects` skill. The REST API has no separate effects endpoint, so the skill ships each effect's recipe (model, prompt and settings) and runs it as a normal task on the underlying model, at the same price as the website.

### Are PopNow skills free?

Yes. These skills and every style preset in the [PopNow skills catalog](https://popnow.ai/skills/agent-skills) are free to install and use. You only pay credits for the images, video, music or voice a skill generates through PopNow, and each generation is quoted and confirmed first.

### How do I find a skill for a product launch video or a pitch deck?

Ask your agent, for example *"find a skill for a product launch video"*. The `popnow-skill-finder` skill searches the catalog (through PopNow MCP `find_skills`, the `popnow` CLI or the open API), shows a few presets with preview links, installs the one you pick into your agent's skills folder and follows it. You can also browse [popnow.ai/skills/agent-skills](https://popnow.ai/skills/agent-skills).

### How do I install these skills in Codex, Cursor, Gemini CLI, GitHub Copilot or OpenCode?

Run `npx skills add popnow-ai/popnow-skills` and pick your agent, or clone the repository and run `./setup --host codex` (or `cursor`, `gemini`, `copilot`, `opencode`). The [install matrix](#installation) lists every agent's skills folder.

### Do I need to install any Python packages?

No. The scripts use only the Python 3.8+ standard library, so they run in Claude Code, Codex, Claude.ai code execution or any shell. The make-things skills also use Node.js 22+ scripts without npm dependencies, plus local tools named in each skill (Chrome, FFmpeg, and HyperFrames through `npx` for video).

### Can an agent make a whole launch video, explainer or landing page?

Yes, with the make-things skills. Ask *"make a 30-second launch film from our README"* (`popnow-launch-film`), *"turn this article into a 90-second narrated explainer"* (`popnow-narrated-explainer`), *"design our landing page"* (`popnow-landing-page-from-mockup`), *"make share images for this post"* (`popnow-social-cover-generator`) or *"create a brand kit and DESIGN.md"* (`popnow-brand-kit-design-md`). The agent writes the result as code on your machine, asks you to approve a contact sheet or mockups first, and quotes every PopNow generation before it runs. Previews: [popnow.ai/skills](https://popnow.ai/skills/agent-skills).

### Is there an OpenAI-compatible endpoint?

Yes, for video: `POST /v1/videos`, `GET /v1/videos/{id}` and `GET /v1/videos/{id}/content` follow the OpenAI Videos API shape. See [openai-compatible.md](skills/popnow-api/references/openai-compatible.md).

## Links

- Website: [popnow.ai](https://popnow.ai) · Pricing: [popnow.ai/pricing](https://popnow.ai/pricing)
- Docs: [popnow.ai/docs](https://popnow.ai/docs) · OpenAPI spec: [popnow.ai/docs/openapi.yaml](https://popnow.ai/docs/openapi.yaml) · [llms.txt](https://popnow.ai/llms.txt)
- MCP: [popnow.ai/mcp](https://popnow.ai/mcp) · Skills catalog: [popnow.ai/skills/agent-skills](https://popnow.ai/skills/agent-skills)
- Install guide for agents: [INSTALL_FOR_AGENTS.md](INSTALL_FOR_AGENTS.md)
- Other PopNow repos: [popnow-mcp](https://github.com/popnow-ai/popnow-mcp) · [popnow-python](https://github.com/popnow-ai/popnow-python) · [popnow-js](https://github.com/popnow-ai/popnow-js) · [popnow-api](https://github.com/popnow-ai/popnow-api) · [popnow-blender](https://github.com/popnow-ai/popnow-blender)

## Contributing

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Run the offline tests with `python3 -m unittest discover -s tests`; they never call the live API.

## License

[MIT](LICENSE). Bundled fonts keep their SIL Open Font License files, and tools the skills call (HyperFrames, GSAP, FFmpeg, Chrome) are used under their own licenses and are not bundled; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Generated media is subject to the [PopNow terms](https://popnow.ai/terms) and each model's own license.
