# PopNow developer MCP server

PopNow runs a hosted MCP server for developers, an alternative to calling the REST API from scripts. Setup for every client: https://popnow.ai/api/mcp, docs: https://popnow.ai/docs/mcp, configs: https://github.com/popnow-ai/popnow-api-mcp.

| | |
| --- | --- |
| URL | `https://api.popnow.ai/api/v1/mcp` |
| Transport | Streamable HTTP, stateless (`POST` only) |
| Sign-in | `Authorization: Bearer sk-popnow-...` with an API key. No OAuth on this endpoint |
| Billing | USD from the API balance (add funds at https://popnow.ai/api/console/billing). The key's model allow-list, IP allow-list and spend caps apply |
| Tools | `create_image`, `edit_image`, `create_video`, `create_music`, `create_speech`, `apply_effect`, `remove_background`, `upscale` and more media tools; `create_task` (any model ID with its own `input`), `get_task`, `list_tasks`, `check_balance`, `list_models`; `find_skills` and `install_skill` for agent skills |
| Price | Every paid call is quoted first: called without `max_usd` it starts nothing and returns `needs_confirmation`, `cost_usd` and `available_usd`. It runs only when called again with `max_usd` (a decimal string, such as `"0.185"`) at or above the current price. There is no automatic approval threshold |

Claude Code:

```bash
claude mcp add --transport http popnow-api https://api.popnow.ai/api/v1/mcp \
  --header "Authorization: Bearer $POPNOW_API_KEY"
```

Other clients (Cursor, VS Code, Windsurf...):

```json
{ "mcpServers": { "popnow-api": { "type": "http", "url": "https://api.popnow.ai/api/v1/mcp",
                                  "headers": { "Authorization": "Bearer ${POPNOW_API_KEY}" } } } }
```

Clients that only start local stdio servers can run the bridge: `npx -y @popnow/mcp` with `POPNOW_API_KEY` in its environment (version 0.2.0 or newer).

When to prefer the skills' scripts: when you need every parameter of every model, local file uploads and downloads, webhooks, idempotency keys or per-task retention. When to prefer MCP: agents and MCP clients without a shell, and one-line creative requests.
