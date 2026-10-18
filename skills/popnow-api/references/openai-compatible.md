# OpenAI Videos compatibility

Code written for the OpenAI Videos API can point its `base_url` at `https://api.popnow.ai/v1`. Same keys, limits, validation and credits as the native API; OpenAI request, response and error shapes instead of the envelope.

| Call | Does |
| --- | --- |
| `POST /v1/videos` | Create a video task (accepts `Idempotency-Key`) |
| `GET /v1/videos/{id}` | Read its state |
| `GET /v1/videos/{id}/content` | `302` to a short-lived signed file link; `409` while running, `404` if failed |
| `GET /v1/models` | Callable models in OpenAI list shape, plus `modality` and `task` (optional `?modality=video`) |

```bash
curl -X POST "https://api.popnow.ai/v1/videos" \
  -H "Authorization: Bearer $POPNOW_API_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{ "model": "alibaba/wan-3.0/image-to-video",
        "prompt": "Waves roll in slowly, the camera drifts toward the lighthouse",
        "input_reference": "https://media.popnow.ai/movie/lighthouse.webp",
        "seconds": "5", "size": "1280x720" }'
```

| OpenAI field | Becomes |
| --- | --- |
| `model` | A video model ID from `/v1/models` |
| `prompt` | `prompt` |
| `input_reference` | `image_url` / `image_urls` (HTTPS URL or committed `popnow://` upload) |
| `seconds` | `duration_seconds` |
| `size` (`WIDTHxHEIGHT`) | `resolution` and/or `aspect_ratio`, or `width`/`height` |

A field the model does not support is rejected with `400`. States map `queued` -> `queued`, `running` -> `in_progress`, `succeeded` -> `completed`, `failed`/`expired` -> `failed` with an `error` object. The `video` object never contains prices; read cost with the native `recordInfo` using the same ID (the compatible layer cannot quote, so quote with `/api/v1/jobs/quote` first when acting for a user).

Errors: `{"error": {"message", "type", "param", "code"}}` with the HTTP status the native API would use. A content refusal is `400` with `code: content_rejected`; parameter errors are `invalid_request` / `unsupported_parameter` with `param` set. Also reads the key from `x-api-key`.
