# Webhooks

Two kinds:

| | Task callback | Account endpoint |
| --- | --- | --- |
| Set up | `callBackUrl` on each `createTask` | Once, in the API console |
| Sent for | That one task | Every task on the account matching chosen events |
| Signature | `X-Webhook-Signature` | Standard Webhooks headers |

## Task callback

1. Generate the webhook signing secret on the console's Webhooks page (https://popnow.ai/api/console/webhooks); store it as `POPNOW_WEBHOOK_SECRET`. Shown once; rotating takes effect immediately.
2. Pass `callBackUrl`: public **HTTPS**, port 443 (or none), no credentials, resolving only to public addresses (checked at creation and when connecting). Invalid: `400` "Invalid callback URL". Use a tunnel while developing, or poll.
3. When the task is final PopNow sends one `POST` with `User-Agent: PopNow-Webhook/1`, `X-Webhook-Timestamp`, `X-Webhook-Signature`, `X-Webhook-Payload-Version: 2`. The body is exactly the `recordInfo` envelope. `code` is `200` even for a failed task (read `data.state`). `request_id` is the stable delivery ID across retries.

### Verify

```text
signature = base64( HMAC-SHA256( secret, "<data.taskId>.<X-Webhook-Timestamp>.<sha256_hex(raw_body)>" ) )
```

Hash the raw bytes received (not re-serialized JSON), compare in constant time, and reject timestamps older than five minutes.

```python
import base64, hashlib, hmac, json, os, time

def verify(raw: bytes, ts: str, sig: str) -> dict:
    if not ts.isdigit() or abs(time.time() - int(ts)) > 300:
        raise ValueError("stale timestamp")
    event = json.loads(raw)
    msg = f'{event["data"]["taskId"]}.{ts}.{hashlib.sha256(raw).hexdigest()}'.encode()
    expected = base64.b64encode(hmac.new(os.environ["POPNOW_WEBHOOK_SECRET"].encode(), msg, hashlib.sha256).digest()).decode()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("bad signature")
    return event
```

### Respond and dedupe

Any 2xx within 15 seconds counts as received; acknowledge first, do slow work in the background. Failed deliveries are retried 7 more times (10 s, 30 s, 2 min, 10 min, 30 min, 2 h, 6 h), each re-signed with a fresh timestamp, then marked failed in the console where they can be resent by hand. Store `request_id` with a unique index and ignore repeats. After a long outage, list tasks with `GET /api/v1/jobs` and read missed ones with `recordInfo`.

Only final states are delivered: `succeeded`, `failed`, `expired` (`canceled` on old records). Signed links in the body expire after about 20 minutes; store the `taskId`.

## Account endpoints

Registered in the console (up to 16), each with its own `whsec_` secret and events: `task.completed` (any final state), `task.succeeded`, `task.failed`, `task.expired`, `task.canceled`. Deliveries follow the Standard Webhooks format (`User-Agent: PopNow-Webhook/2`):

```text
webhook-id: msg_...
webhook-timestamp: 1787045531
webhook-signature: v1,base64( HMAC-SHA256( base64decode(secret without "whsec_"), "<webhook-id>.<webhook-timestamp>.<raw_body>" ) )
```

The body itself is signed (no SHA-256 step). During a rotation grace period (up to 7 days) the header may hold two space-separated signatures; accept either. Dedupe on `webhook-id`. The task record is in `data.object`. Off-the-shelf `standardwebhooks` libraries verify it in one call.

Webhooks cost nothing.
