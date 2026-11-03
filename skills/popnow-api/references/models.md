# PopNow API models

Snapshot of `GET /api/v1/models` taken 2026-11-03. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality text`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## 3D

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seed3d-2.0/image-to-3d` | Seed3D 2.0 · image-to-3d | ByteDance | $0.48 / run | - |
| `tripo/h3.1/image-to-3d` | Tripo H3.1 · image-to-3d | Tripo | $0.432 / run | - |
| `tripo/h3.1/text-to-3d` | Tripo H3.1 · text-to-3d | Tripo | $0.288 / run | - |
| `tripo/p1/image-to-3d` | Tripo P1 · image-to-3d | Tripo | $0.72 / run | - |

## Chat

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `anthropic/claude-fable-5/chat` | Claude Fable 5 · chat | Anthropic | input $9 / output $45 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-haiku-5.5/chat` | Claude Haiku 5.5 · chat | Anthropic | input $0.1 / output $0.5 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-opus-4.5/chat` | Claude Opus 4.5 · chat | Anthropic | input $5.04 / output $25.2 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-opus-4.6/chat` | Claude Opus 4.6 · chat | Anthropic | input $5 / output $25 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-opus-5.5/chat` | Claude Opus 5.5 · chat | Anthropic | input $3.6 / output $18 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-opus-5/chat` | Claude Opus 5 · chat | Anthropic | input $4.5 / output $22.5 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-sonnet-4.5/chat` | Claude Sonnet 4.5 · chat | Anthropic | input $2.7 / output $13.5 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-sonnet-4.6/chat` | Claude Sonnet 4.6 · chat | Anthropic | input $3 / output $15 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-sonnet-5.5/chat` | Claude Sonnet 5.5 · chat | Anthropic | input $2 / output $10 per million tokens | See live schema for cache and long-context rates |
| `anthropic/claude-sonnet-5/chat` | Claude Sonnet 5 · chat | Anthropic | input $1.9 / output $9.5 per million tokens | See live schema for cache and long-context rates |
| `callstack/apex/chat` | Apex · chat | Callstack | input $0.5 / output $3 per million tokens | See live schema for cache and long-context rates |
| `deepseek/v4-flash/chat` | DeepSeek V4 Flash · chat | DeepSeek | input $0.44 / output $1.32 per million tokens | See live schema for cache and long-context rates |
| `deepseek/v4-pro/chat` | DeepSeek V4 Pro · chat | DeepSeek | input $1.32 / output $3.96 per million tokens | See live schema for cache and long-context rates |
| `deepseek/v4.1-flash/chat` | DeepSeek V4.1 Flash · chat | DeepSeek | input $0.3 / output $1.2 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-2.5-flash/chat` | Gemini 2.5 Flash · chat | Google | input $0.285 / output $2.375 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-3-flash-preview/chat` | Gemini 3 Flash Preview · chat | Google | input $0.45 / output $2.7 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-3.1-pro-preview/chat` | Gemini 3.1 Pro Preview · chat | Google | input $1.9 / output $11.4 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-3.5-flash-lite/chat` | Gemini 3.5 Flash-Lite · chat | Google | input $0.3 / output $2.5 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-3.7-flash/chat` | Gemini 3.7 Flash · chat | Google | input $0.675 / output $3.375 per million tokens | See live schema for cache and long-context rates |
| `google/gemini-4-argon/chat` | Gemini 4 Argon · chat | Google | input $4 / output $20 per million tokens | See live schema for cache and long-context rates |
| `inception/mercury-3/chat` | Mercury 3 · chat | Inception | input $0.2 / output $0.7 per million tokens | See live schema for cache and long-context rates |
| `meta/muse-wonder-1.0/chat` | Muse Wonder 1.0 · chat | Meta | input $4 / output $20 per million tokens | See live schema for cache and long-context rates |
| `minimax/m3.1-flash/chat` | MiniMax M3.1 Flash · chat | MiniMax | input $0.15 / output $0.6 per million tokens | See live schema for cache and long-context rates |
| `moonshot/kimi-k3.1-pro/chat` | Kimi K3.1 Pro · chat | Moonshot AI | input $2 / output $10 per million tokens | See live schema for cache and long-context rates |
| `moonshot/kimi-k3/chat` | Kimi K3 · chat | Moonshot AI | input $2.7 / output $13.5 per million tokens | See live schema for cache and long-context rates |
| `nvidia/nemotron-3.5-super-vl/chat` | Nemotron 3.5 Super VL · chat | NVIDIA | input $0.2 / output $0.5 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.4-mini/chat` | GPT-5.4 Mini · chat | OpenAI | input $0.15 / output $0.9 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.4/chat` | GPT-5.4 · chat | OpenAI | input $0.5 / output $3 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.5/chat` | GPT-5.5 · chat | OpenAI | input $1 / output $6 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.6-luna/chat` | GPT 5.6 Luna · chat | OpenAI | input $0.04 / output $0.24 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.6-sol/chat` | GPT 5.6 Sol · chat | OpenAI | input $1 / output $6 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-5.6-terra/chat` | GPT 5.6 Terra · chat | OpenAI | input $0.4 / output $2.4 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-6-astra/chat` | GPT 6 Astra · chat | OpenAI | input $2 / output $10 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-6-luna/chat` | GPT 6 Luna · chat | OpenAI | input $0.02 / output $0.1 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-6-sol/chat` | GPT 6 Sol · chat | OpenAI | input $0.4 / output $2 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-6.1-sol/chat` | GPT 6.1 Sol · chat | OpenAI | input $2 / output $10 per million tokens | See live schema for cache and long-context rates |
| `openai/gpt-6.1-terra/chat` | GPT 6.1 Terra · chat | OpenAI | input $1 / output $5 per million tokens | See live schema for cache and long-context rates |
| `reflection/beam-1.0/chat` | Beam 1.0 · chat | Reflection | input $1 / output $3 per million tokens | See live schema for cache and long-context rates |
| `xiaomi/mimo-v2.6-flash/chat` | MiMo V2.6 Flash · chat | Xiaomi | input $0.14 / output $0.28 per million tokens | See live schema for cache and long-context rates |
| `xiaomi/mimo-v2.6-pro/chat` | MiMo V2.6 Pro · chat | Xiaomi | input $0.435 / output $0.87 per million tokens | See live schema for cache and long-context rates |
| `zai/glm-5.2/chat` | GLM 5.2 · chat | Z.ai | input $0.98 / output $3.08 per million tokens | See live schema for cache and long-context rates |
| `zai/glm-5.3-flash/chat` | GLM 5.3 Flash · chat | Z.ai | input $0.1275 / output $0.425 per million tokens | See live schema for cache and long-context rates |
| `zai/glm-5.3/chat` | GLM 5.3 · chat | Z.ai | input $1.05 / output $3.3 per million tokens | See live schema for cache and long-context rates |
| `inclusionai/ling-3.1-flash/chat` | Ling 3.1 Flash · chat | inclusionAI | input $0.075 / output $0.225 per million tokens | See live schema for cache and long-context rates |
| `xai/grok-4.3/chat` | Grok 4.3 · chat | xAI | input $1.4625 / output $2.925 per million tokens | See live schema for cache and long-context rates |
| `xai/grok-4.5/chat` | Grok 4.5 · chat | xAI | input $2.36 / output $7.08 per million tokens | See live schema for cache and long-context rates |
| `xai/grok-4.6/chat` | Grok 4.6 · chat | xAI | input $2.36 / output $7.08 per million tokens | See live schema for cache and long-context rates |
| `xai/grok-4.7/chat` | Grok 4.7 · chat | xAI | input $2.36 / output $7.08 per million tokens | See live schema for cache and long-context rates |

## Embeddings

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `openai/text-embedding-3-large/embedding` | text-embedding-3-large · embedding | OpenAI | $0.000026 / 1k tokens | - |
| `openai/text-embedding-3-small/embedding` | text-embedding-3-small · embedding | OpenAI | $0.000004 / 1k tokens | - |
| `openai/text-embedding-ada-002/embedding` | text-embedding-ada-002 · embedding | OpenAI | $0.00002 / 1k tokens | - |
