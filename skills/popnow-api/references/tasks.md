# Tasks

Every generation is a task: create it, it runs on its own, collect the result by polling, by `?wait=`, or by webhook.

## Create

`POST /api/v1/jobs/createTask`

```bash
curl -X POST "https://api.popnow.ai/api/v1/jobs/createTask" \
  -H "Authorization: Bearer $POPNOW_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "model": "alibaba/wan-3.0/image-to-video",
    "input": {
      "image_url": "https://media.popnow.ai/movie/lighthouse.webp",
      "prompt": "Waves roll in slowly, the camera drifts toward the lighthouse",
      "resolution": "480p",
      "duration_seconds": 5
    },
    "callBackUrl": "https://your-app.example.com/hooks/popnow"
  }'
```

Body (`additionalProperties: false`):

| Field | Required | Meaning |
| --- | --- | --- |
| `model` | yes | Model ID, `<maker>/<model>/<task>` |
| `input` | yes | Validated against the model's `inputSchema`; unknown fields are rejected |
| `callBackUrl` | no | Public HTTPS URL that receives the finished task (see webhooks.md) |
| `quoteId` | no | From `jobs/quote` for the same account, key and request (valid 5 minutes) |
| `expectedCredits` | no | The `maxCredits` you confirmed; a changed price returns `40901` before anything is held |
| `expectedCost` | no | Same as `expectedCredits` in USD; `expectedCredits` wins if both are sent |

Headers: `Idempotency-Key` (strongly recommended, up to 128 chars), `X-PopNow-Retention` (seconds to keep outputs and prompt; can only shorten retention, `0` removes outputs as soon as the task is final), `Accept-Language` (language of error text).

Response `202`:

```json
{ "code": 200, "msg": "success",
  "data": { "taskId": "job_01JH8Z4Q5W2N7R3K9M6P1C0VXD", "state": "queued",
            "estimatedCredits": 34, "estimatedCost": "0.34", "deadlineAt": "2026-10-16T09:40:00Z" },
  "request_id": "req_..." }
```

`202` means accepted, not finished. `estimatedCredits` is the hold, the most the task can cost. If creation fails nothing is created or held.

## States

| State | Final | Meaning |
| --- | --- | --- |
| `queued` | no | Accepted, waiting |
| `running` | no | Generating |
| `succeeded` | yes | Files in `output.assets` |
| `failed` | yes | See `errorCode` / `errorMessage`; hold released |
| `expired` | yes | Passed `deadlineAt`; hold released |
| `canceled` | yes | Old records only; accepted tasks cannot be canceled |

Treat unknown states as not final.

## `?wait=<seconds>` (1-60)

Holds the `createTask` connection until the task is final or time runs out. Final in time: HTTP `200` with the full task record (same shape as `recordInfo`; check `data.state`). Otherwise the ordinary `202`. Disconnecting does not cancel the task. Good for images and short audio; video almost always outlasts 60 seconds.

## Read a task

`GET /api/v1/jobs/recordInfo?taskId=...`

| Field | Meaning |
| --- | --- |
| `taskId`, `model`, `state`, `sourceTaskId` | Identity and state (`sourceTaskId` on retries) |
| `input` | Normalized input, including the random `seed` picked when you omitted one |
| `output.assets[]` | `url`, `expiresAt`, `mime`, `width`, `height`, `durationSeconds`, `bytes`, `role`, `key`, `pending`, `unavailable`, `layer` |
| `output.text`, `output.transcript` | Speech-to-text results |
| `errorCode`, `errorMessage` | Why it failed; branch on `errorCode` |
| `credits`, `cost`, `settled` | While `settled` is false, `credits` is the hold; then the final charge |
| `createdAt`, `completedAt`, `deadlineAt` | Timestamps |
| `retention.outputsExpireAt`, `retention.promptsExpireAt`, `retention.source` | When content is removed and which layer decided |
| `contentState` | `present`, `expired` (retention) or `purged` (you deleted it) |

Three expiry times: `deadlineAt` (how long the task may run), `output.assets[].expiresAt` (one signed link, about 20 minutes; read the task again for a fresh one), `retention.outputsExpireAt` (when the stored file is removed).

Multiple outputs: variations return several images; video extension returns the joined clip (`role: "video"`) then the new part (`role: "segment"`); layer decomposition returns a base image plus transparent layers with a `layer` object (`zIndex`, `name`, `boundingBox`).

Output links are bearer links: do not send the API key when downloading them.

## Polling

Webhooks first, polling as a fallback. When polling: every 2-3 s for images, 10-15 s for video, stop at `deadlineAt`. Plus an occasional `recordInfo` sweep for tasks whose webhook never arrived.

## Task list

`GET /api/v1/jobs?state=failed&from=2026-10-01&limit=50` returns this key's tasks, newest first, metadata only (`taskId`, `requestId`, `model`, `state`, `cost`, `credits`, `settled`, `createdAt`, `deadlineAt`, `completedAt`). Filters: `from`/`to` (UTC dates, half-open, up to 92 days, default last 7 days), `state`, `model`, `limit` (1-100, default 20), `cursor` (from `nextCursor` while `hasMore` is true; keep all filters unchanged). Unknown, duplicate or empty query parameters are rejected.

## Retry

`POST /api/v1/jobs/retry` with `{"taskId": "..."}` creates a **new** task from a `failed` or `expired` one using its original input at today's price (current schema, pricing, balance and availability are evaluated again). The source task is never modified. `409` while the source is not final; a succeeded task cannot be retried. Accepts an `Idempotency-Key` scoped to the source task. The source must belong to the same key.

## Purge

`POST /api/v1/jobs/purge` with `{"taskId": "..."}` deletes the task's files, result payload and stored prompt. Billing evidence stays (`billingRetained: true`). Only final tasks; `400` while queued or running. Idempotent by `taskId` (returns the original `purgedAt`). Media objects are swept within about a minute (`mediaDeletionPending`).
