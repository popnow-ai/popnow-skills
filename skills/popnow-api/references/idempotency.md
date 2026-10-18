# Idempotency

An `Idempotency-Key` header labels one piece of work ("render the video for order 8814"). If the same labelled request arrives twice, the work is done once. Without it, a timeout leaves you choosing between giving up and maybe paying twice.

```http
POST /api/v1/jobs/createTask
Idempotency-Key: order-8814-render-1
```

## Behaviour

- A repeat with the same key from the same API key returns the original task in its current state: no second task, hold or charge.
- The key is bound to `model`, the whole `input` and `callBackUrl` (field order and whitespace do not matter). A changed request with an old key returns `409`.
- Remembered for 24 hours from first use; after that the same key creates a new, billed task.
- Up to 128 characters, unique within the account. Another API key on the account gets `409` without the original task ID.

| Endpoint | A repeat with the same key |
| --- | --- |
| `POST /api/v1/jobs/createTask` | returns the original task |
| `POST /api/v1/jobs/retry` | returns the task that retry created (scoped to the source task) |
| `POST /v1/videos` | returns the original task |
| `POST /api/v1/assets` | returns the saved asset (header required) |

Read endpoints and upload/download link endpoints ignore the header; `jobs/purge` is idempotent by `taskId`.

## Choosing keys

- One key per piece of work, not per HTTP attempt. Never generate the key inside the retry loop.
- Derive it from something you store (`order-8814-render-1`), or generate a UUID before the first attempt and save it with the job.
- After a `50302` refund, retry with a **new** key: the original key replays the recorded failure.
