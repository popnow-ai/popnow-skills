# Models, prices and input schemas

## Model IDs

```text
<maker>/<model>/<task>
alibaba/wan-3.0/image-to-video
google/nano-banana-2.1/edit
popnow/background-remover-v1/edit
```

- `maker` is who built the model; tools built by PopNow use `popnow`.
- `model` keeps version dots (`seedance-2.0`).
- `task`: `text-to-image`, `edit` (image editing is always `edit`), `text-to-video`, `image-to-video`, `reference-to-video`, `video-extend`, `video-edit`, `character-animation`, `upscale`, `layer-decomposition`, `text-to-audio`, `text-to-speech`, `speech-to-text`, `video-to-audio`.

A family usually has one ID per task: `.../text-to-video` takes only a prompt, `.../image-to-video` needs an opening image.

## Catalog

```bash
curl "https://api.popnow.ai/api/v1/models?modality=video&includeSchema=1" -H "Authorization: Bearer $POPNOW_API_KEY"
curl "https://api.popnow.ai/api/v1/models/alibaba/wan-3.0/image-to-video" -H "Authorization: Bearer $POPNOW_API_KEY"
```

List filters: `modality` (`image`, `video`, `audio`), `provider`, `task` (`edit` and `image-to-image` select the same endpoints), `search`, `includeSchema=1`, `includeExamples=1`. If a client treats path parameters as one segment, encode slashes as `%2F`. Responses are cacheable for 60 seconds (`private, max-age=60`).

| Field | Use |
| --- | --- |
| `model` | The ID to send (store this spelling) |
| `displayName`, `provider` | What to show users |
| `modality`, `tasks` | Grouping (`tasks[0]` is the classification, e.g. `image-to-image` for `.../edit`) |
| `available`, `availability` | `false` / `maintenance`: cannot take tasks now |
| `credits` | Price (below) |
| `inputSchema` | JSON Schema (draft 2020-12) that `input` is validated against |
| `taskTimeoutSeconds` | Platform execution deadline |
| `maxOutputDurationSeconds` | Longest clip, when the model has a length setting |
| `badges` | `commercial_use`, `no_watermark`, `commercial_restricted`, `reference_input`, `audio_output`, `fast_tier`, `high_resolution` |
| `relatedModels`, `examples` | Alternatives and validated example inputs |
| `version` | Changes with schema or metadata; re-read the model when it does |

## Prices

```json
"credits": { "unit": "per_second", "perUnit": 45,
  "rules": [ { "when": { "*": "480p" }, "perUnit": 45 },
             { "when": { "*": "720p" }, "perUnit": 90 },
             { "when": { "*": "1080p" }, "perUnit": 180 } ] }
```

`unit` is `per_image`, `per_second`, `per_request` or `per_1k_characters`; `perUnit` is the starting price; each rule applies when the request matches its `when` values (`*` stands for the setting that decides the tier, usually `resolution`). Final charges are rounded up to whole credits. For one request's exact amount use `jobs/quote`.

## Input schemas

- Unknown fields are rejected (`400`), so typos fail fast.
- Shared field names: `prompt`, `negative_prompt`, `image_url`, `image_urls`, `last_image_url`, `video_url`, `audio_url`, `duration_seconds`, `aspect_ratio`, `resolution`, `seed`, `generate_audio`.
- Defaults are filled in; send only what you change.
- Media fields take HTTPS URLs, `popnow://f/` uploads, `popnow://a/` assets or image data URIs.
- Display hints live in a per-property `x-ui` object; they never change validation.
- Omitting `seed` on a model that has one picks a random seed and returns it in the task's `input`.

Per-skill model tables with starting prices: `popnow-video/references/models.md`, `popnow-image/references/models.md`, `popnow-audio/references/models.md`.
