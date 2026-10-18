# Endpoint list

Base URL `https://api.popnow.ai`. All require `Authorization: Bearer sk-popnow-...`. Full contract: https://popnow.ai/docs/openapi.yaml.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/jobs/quote` | Price a request; creates nothing, holds nothing |
| POST | `/api/v1/jobs/createTask` | Create a task (`?wait=1..60`, `Idempotency-Key`, `X-PopNow-Retention`) |
| GET | `/api/v1/jobs/recordInfo?taskId=` | Read a task created by this key |
| GET | `/api/v1/jobs` | List this key's tasks (`from`, `to`, `state`, `model`, `limit`, `cursor`) |
| POST | `/api/v1/jobs/retry` | New task from a failed or expired one (`{"taskId"}`) |
| POST | `/api/v1/jobs/purge` | Delete a final task's content; billing kept (`{"taskId"}`) |
| GET | `/api/v1/models` | Callable models with prices (`modality`, `provider`, `task`, `search`, `includeSchema`, `includeExamples`) |
| GET | `/api/v1/models/{model}` | One model with its input JSON Schema |
| GET | `/api/v1/chat/credit` | Balance: available, held, total |
| GET | `/api/v1/usage` | Usage for this key (`from`, `to`) |
| POST | `/api/v1/common/upload-url` | Upload ticket (`{"contentType", "bytes"}`) |
| POST | `/api/v1/files/{fileId}/commit` | Commit an upload; returns `popnow://f/...` |
| POST | `/api/v1/files/import` | Import a LoRA `.safetensors` from a link |
| POST | `/api/v1/common/download-url` | Fresh signed link for one task output (`{"taskId", "key"}`) |
| GET, POST | `/api/v1/assets` | List or save assets (save needs `Idempotency-Key`) |
| GET | `/api/v1/assets/usage` | Asset storage plan and usage |
| GET, PATCH, DELETE | `/api/v1/assets/{assetId}` | Read, rename/favorite, delete an asset |
| GET | `/api/v1/assets/entities`, `/api/v1/assets/entities/{entityId}` | Characters and their images |
| GET | `/v1/models` | OpenAI-style model list |
| POST | `/v1/videos` | OpenAI-style video create |
| GET | `/v1/videos/{videoId}` | OpenAI-style video status |
| GET | `/v1/videos/{videoId}/content` | `302` to the video file |

There are no endpoints for chat or text models, for buying credits, or for named effects (effects are recipes over the image and video models; see the `popnow-effects` skill).
