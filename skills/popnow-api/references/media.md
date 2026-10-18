# Media: sending files and downloading results

## Four ways to send a file

| You have | Send it as |
| --- | --- |
| A public HTTPS link | the URL, e.g. `"image_url": "https://.../photo.jpg"` |
| A small image in memory | a data URI, `"image_url": "data:image/png;base64,..."` |
| A local file | an upload, then `"image_url": "popnow://f/fil_..."` |
| A saved asset | `"image_url": "popnow://a/ast_..."` (see assets.md) |

The file goes in the field the model's schema declares (`image_url`, `image_urls`, `video_url`, `audio_url`, ...).

- Public links must return the file itself without login while the task runs. A cloud-drive or social share page returns HTML and the task fails with `invalid_asset`.
- Inline images: JPEG, PNG, WebP or GIF data URIs, at most 1 MiB decoded and 8,192 px per side each, up to 16 images per request, whole JSON body under 2 MiB. No bare Base64, SVG or inline audio/video. They are stored as uploads, so the task's `input` shows a `popnow://` URI.

## Upload (three calls)

1. `POST /api/v1/common/upload-url` with `{"contentType": "image/png", "bytes": 402118}` returns `fileId`, `uploadUrl`, `method` (`PUT`), the exact `headers` to send, `expiresAt` (about 20 minutes) and `maxBytes`. The server picks the storage path.
2. `PUT` the bytes to `uploadUrl` with every returned header exactly as given and **no** `Authorization` header.
3. `POST /api/v1/files/{fileId}/commit` checks size, type and signature and returns `{"fileId", "status": "ready", "uri": "popnow://f/fil_...", "contentType", "bytes", "sha256", "width", "height", "durationSeconds", "expiresAt"}`. Committing twice is safe. `40003` means the bytes do not match the ticket: new ticket, upload again.

| Type | `contentType` | Max size | Max duration |
| --- | --- | --- | --- |
| Image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 10 MiB | - |
| Video | `video/mp4`, `video/webm` | 90 MiB | 600 s |
| Audio | `audio/mpeg`, `audio/wav` | 90 MiB | 600 s |
| LoRA weights | `application/octet-stream` (`.safetensors`) | 2 GiB | - |

A `popnow://f/` URI works only with keys on the same account. Uploads are temporary (see the commit's `expiresAt`); upload shortly before creating the task, or save to the asset library to keep a file.

`scripts/popnow.py upload FILE` does all three steps, and any `--image`/`--video`/`--audio` flag that points at a local file uploads it automatically.

## Download results

A succeeded task lists files in `output.assets[]`, each with a ready `url`:

```bash
curl -L -o result.mp4 "$(curl -s "https://api.popnow.ai/api/v1/jobs/recordInfo?taskId=$TASK_ID" \
  -H "Authorization: Bearer $POPNOW_API_KEY" | jq -r '.data.output.assets[0].url')"
```

- Signed, valid about 20 minutes (`expiresAt`). Store the `taskId`, not the link; read the task again for a fresh link.
- Never attach the API key when downloading; the link itself is the permission.
- `POST /api/v1/common/download-url` with `{"taskId": "...", "key": "..."}` mints a fresh link for one output without reading the whole task (empty `key` selects the first output).
- Files are kept until `retention.outputsExpireAt` or a purge. Copy anything you need to your own storage or the asset library.
