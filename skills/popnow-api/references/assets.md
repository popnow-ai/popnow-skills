# Asset library and LoRA files

Uploads and task outputs are temporary. To reuse a file across many tasks (a product photo, a character's face, a voice sample), save it to the asset library. A saved asset gets a stable URI, `popnow://a/ast_...`, usable in any matching media field of any model with keys of the same workspace:

```json
{ "model": "google/nano-banana-2.1/edit",
  "input": { "prompt": "Put this mug on a wooden cafe table, morning light",
             "image_urls": ["popnow://a/ast_01k3m8x9q2z4v7n5p6r8s0t1w3"] } }
```

The URI is a reference, not a public link; the API never returns permanent public links, only private previews.

## Save

`POST /api/v1/assets` (header `Idempotency-Key` **required**; saving the same source again returns the existing asset):

| `source` | Also send | Saves |
| --- | --- | --- |
| `task_output` | `taskId` and the output's `key` or zero-based `index` | An output of one of your succeeded tasks |
| `upload` | `fileId` (`fil_...` or `popnow://f/fil_...`) | A committed upload |
| `url` | `url` (public http/https, port 80/443, no credentials) | JPEG, PNG, WebP, GIF, MP4, WebM, MP3, WAV, FLAC or Ogg |

Optional `name` (up to 80 characters). The response is the asset: `id`, `uri`, `name`, `kind` (`image`, `video`, `audio`), size and dimensions, and a private `previewUrl` valid for at most 20 minutes. Persist `uri`, never the preview.

## Manage

| Call | Does |
| --- | --- |
| `GET /api/v1/assets` | One page. Filters `kind`, `source` (comma-separated), `favorite`, `q`, `collectionId`, `entityId`; `sort=recent\|oldest\|name\|size`; `cursor`, `limit` (1-100) |
| `GET /api/v1/assets/{assetId}` | One asset with a fresh preview |
| `PATCH /api/v1/assets/{assetId}` | Change `name` and/or `favorite` |
| `DELETE /api/v1/assets/{assetId}` | Delete; its URI stops working in new requests |
| `GET /api/v1/assets/entities` | Characters (named image sets arranged on the website), each image with its URI |
| `GET /api/v1/assets/usage` | Storage plan, usage, limits, next plan |

A personal key reaches the personal library; a team workspace key reaches that team's shared library (what it may change follows the creating member's role).

Storage opens with the account owner's first credit purchase and grows with lifetime purchases; it never shrinks. Errors carry `data.reason`: `asset_library_locked` (400), `asset_library_full` (400), `asset_file_too_large` (400), `asset_daily_limit` (429, until 00:00 UTC), `asset_storage_full` (503), `asset_permission_denied` (403), `asset_workspace_forbidden` (403). Reads are limited to 60 and saves to 30 requests per minute.

## Bring your own LoRA

Models whose ID ends in `-lora` accept `loras`: up to three entries of `{"path", "scale"}` (scale 0-4):

```json
{ "model": "alibaba/qwen-image-2.1-lora/text-to-image",
  "input": { "prompt": "A cozy reading nook in watercolor style",
             "loras": [{ "path": "popnow://f/fil_01k3m8x9q2z4v7n5p6r8s0t1w3", "scale": 1 }] } }
```

`path` is a public direct link to a `.safetensors` file, an upload (`contentType: application/octet-stream`, up to 2 GiB, ticket valid two hours), or an import: `POST /api/v1/files/import` with `{"url": "owner/repo", "token": "hf_..."}` (a Hugging Face repo ID, repo or file page, or any direct HTTPS link; the optional token, a Hugging Face access token or Civitai API key, is used once and never stored). A LoRA must match its base model; you must have the right to use the weights.
