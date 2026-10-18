# PopNow MCP server

PopNow runs a remote MCP server, an alternative to calling the REST API from scripts.

| | |
| --- | --- |
| URL | `https://api.popnow.ai/mcp` |
| Transport | Streamable HTTP, stateless (`POST` only) |
| Sign-in | OAuth 2.1 with PKCE and dynamic client registration (scopes `generate`, `read`), or `Authorization: Bearer sk-popnow-...` |
| Tools | `create_image`, `edit_image`, `create_video`, `create_music`, `create_speech`, `apply_effect`, `remove_background`, `upscale`, `get_job`, `list_my_creations`, `check_balance`, `list_models` |
| Price | Same credits as the website. Jobs up to 30 credits start at once; anything above returns "Needs confirmation" and runs only when called again with `max_credits` |

Claude Code:

```bash
claude mcp add --transport http popnow https://api.popnow.ai/mcp
```

Other clients (Cursor, VS Code, Windsurf...):

```json
{ "mcpServers": { "popnow": { "type": "http", "url": "https://api.popnow.ai/mcp",
                              "headers": { "Authorization": "Bearer ${POPNOW_API_KEY}" } } } }
```

Omit `headers` to sign in with OAuth in the browser. In Claude or ChatGPT, add it as a custom connector with the same URL (plan and workspace permitting). Setup guide: https://popnow.ai/mcp.

When to prefer the skills' scripts: when you need every parameter of every model, local file uploads and downloads, webhooks, idempotency keys or per-task retention. When to prefer MCP: chat apps without a shell, and one-line creative requests.
