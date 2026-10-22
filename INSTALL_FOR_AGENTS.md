# Install PopNow Skills with your AI agent

Paste this into Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode or any agent that can run shell commands:

```text
Install the PopNow Agent Skills from https://github.com/popnow-ai/popnow-skills for me by following
https://github.com/popnow-ai/popnow-skills/blob/main/INSTALL_FOR_AGENTS.md
My PopNow API key is (or will be) in the POPNOW_API_KEY environment variable.
```

The skills are free. They spend PopNow credits only for the images, video, music or voice they generate, and they quote every generation and wait for a yes first.

---

## Instructions for the agent

Follow these steps in order. Explain briefly what you are doing, and ask before anything the user did not request.

### 1. Work out the host and scope

| You are | `--host` for `./setup` | `-a` for the skills CLI | Personal folder | Project folder |
| --- | --- | --- | --- | --- |
| Claude Code | `claude` | `claude-code` | `~/.claude/skills` | `.claude/skills` |
| Codex | `codex` | `codex` | `~/.agents/skills` | `.agents/skills` |
| Cursor | `cursor` | `cursor` | `~/.cursor/skills` | `.cursor/skills` |
| Gemini CLI | `gemini` | `gemini-cli` | `~/.gemini/skills` | `.gemini/skills` |
| GitHub Copilot | `copilot` | `github-copilot` | `~/.copilot/skills` | `.github/skills` |
| OpenCode | `opencode` | `opencode` | `~/.config/opencode/skills` | `.opencode/skills` |

Install into the personal folder unless the user asks for this project only. If you cannot tell which agent you are, ask.

### 2. Install the skills

Use the first option that works. Do not use `sudo`, and do not pipe anything from the network into a shell.

**Claude Code, plugin (recommended there).** You cannot run slash commands yourself, so ask the user to type:

```text
/plugin marketplace add popnow-ai/popnow-skills
/plugin install popnow@popnow-skills
```

**Any agent with Node.js: the skills CLI.** Replace `<agent>` with the `-a` value above; drop `-g` for a project install.

```bash
npx skills add popnow-ai/popnow-skills -g -a <agent> --skill '*' -y
```

**Any agent with git: clone and run `setup`.** `setup` works offline and links each skill folder into the agent's folder, so keep the clone where it is (`git -C ~/.popnow-skills pull` updates every skill later).

```bash
if [ -d ~/.popnow-skills/.git ]; then git -C ~/.popnow-skills pull --ff-only
else git clone --depth 1 https://github.com/popnow-ai/popnow-skills.git ~/.popnow-skills; fi
~/.popnow-skills/setup --host <host>                 # personal folder
# project only: cd to the project root, then
# ~/.popnow-skills/setup --host <host> --project --copy
```

If a folder of the same name already exists, `setup` skips it; ask the user before re-running with `--force`.

### 3. Check the API key without revealing it

```bash
[ -n "${POPNOW_API_KEY:-}" ] && echo "POPNOW_API_KEY is set" || echo "POPNOW_API_KEY is missing"
```

Never print, log or echo the key's value. If it is missing, tell the user:

1. Create a key at https://popnow.ai/api/console/keys (a per-key daily spend cap is a good idea for agents).
2. Add `export POPNOW_API_KEY="sk-popnow-..."` to their shell profile (`~/.zshrc`, `~/.bashrc` or similar) themselves. On Windows: `setx POPNOW_API_KEY "sk-popnow-..."`.
3. Restart the agent from a new terminal so it inherits the variable.

Do not ask the user to paste the key into the chat, and never write it into a file inside a repository.

### 4. Verify

With the key set, this free call confirms that everything works (use the folder you installed into):

```bash
python3 <skills-folder>/popnow-api/scripts/popnow.py balance
```

Python 3.8 or newer is needed; the scripts use only the standard library. The make-things skills (launch film, narrated explainer, HyperFrames assets, landing page, social covers, brand kit) also use Node.js 22+ and a local Chrome, and the video ones FFmpeg; tell the user which of these are missing, but do not install system software without asking.

### 5. Optional: connect the PopNow MCP server

The hosted MCP server adds free `find_skills` and `use_skill` tools for the style-preset catalog, plus generation tools that sign in with OAuth instead of an API key. Offer it, and add it only if the user agrees:

```bash
claude mcp add --transport http popnow https://api.popnow.ai/mcp      # Claude Code
codex mcp add popnow --url https://api.popnow.ai/mcp                  # Codex (then: codex mcp login popnow)
```

Other clients: https://github.com/popnow-ai/popnow-mcp#connect-your-client

### 6. Report back

Tell the user:

- Which skills were installed and where: `popnow-video`, `popnow-image`, `popnow-audio`, `popnow-effects`, `popnow-launch-film`, `popnow-narrated-explainer`, `popnow-hyperframes-ai-assets`, `popnow-landing-page-from-mockup`, `popnow-social-cover-generator`, `popnow-brand-kit-design-md`, `popnow-skill-finder`, `popnow-api`.
- How to use them: ask in plain words ("turn this photo into a 5-second video", "make a launch film from our README", "find a style for our pitch deck"). In Claude Code they can also type `/popnow-video`; in Codex, `$popnow-video`.
- Restart the agent if it only discovers skills at startup.
- Skills are free; each generation is quoted in credits (1 credit = $0.001) and runs only after their yes. Credit packs: https://popnow.ai/pricing. Free style presets: https://popnow.ai/skills/agent-skills.
