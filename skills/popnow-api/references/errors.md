# Errors

A failed call returns the envelope with a business `code` and a human `msg`:

```json
{ "code": 40201, "msg": "Insufficient balance", "request_id": "req_..." }
```

- Branch on `code` (more specific than the HTTP status, which is also set: `40201` comes with HTTP 402). Never parse `msg`; it is localized with `Accept-Language` (`en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `de`, `fr`, `es`, `pt-BR`, `ru`, `it`, `pl`) or the account setting.
- `data` is absent on failure except when a machine-readable `data.reason` exists (asset library errors, and content-check refusals at submission: `adult_content`, `minor_safety`, `image_rejected`, all `400` and free). Treat unknown reasons like an absent one.
- `request_id` is also in the `X-Request-Id` header; include it in support requests.
- A non-JSON response (an HTML page from the network in between) should be handled by HTTP status.

## General codes

| `code` | HTTP | Meaning | Retry |
| --- | --- | --- | --- |
| `200` | 200/202 | Success | - |
| `400` | 400 | Invalid request or `input`; `msg` names the problem | No, fix it |
| `40003` | 400 | Upload does not match its ticket (size, type, signature) | New ticket, upload again |
| `40004` | 400 | Valid request, but no deployment serves this settings combination | Change the setting named in `msg` |
| `401` | 401 | Missing, unknown or revoked key | No |
| `403` | 403 | Not allowed (see below) | No |
| `404` | 404 | Does not exist, or belongs to another key | No |
| `409` | 409 | Conflicts with current state | Sometimes (see below) |
| `40901` | 409 | Quote expired or price changed | Quote again, re-confirm |
| `413` | 413 | Body over 2 MiB | Upload media instead of inlining |
| `429` | 429 | Too many requests | Yes, after `Retry-After` |
| `500` | 500 | Server error | Yes, with backoff |
| `503` | 503 | Dependency briefly unavailable | Yes, after `Retry-After` |
| `50301` | 503 | Model cannot take tasks right now | Later, or another model |
| `50302` | 503 | A synchronous generation failed upstream and was refunded | Yes, with a **new** Idempotency-Key |

## Balance, caps, permissions

| `code` | Meaning | Do |
| --- | --- | --- |
| `40201` | Not enough credits for the hold | Buy credits at https://popnow.ai/pricing |
| `40202` | Key spend cap reached | Raise the cap or wait for the reset |
| `40301` | Key may not call this model | Add it to the key's allowed models |
| `40302` | Caller IP not in the key's allowlist | Add the address |
| `40303` | Service not offered in this region | Cannot be worked around |
| `40310` | Account email not verified | Open the sign-up email link |

## Task failure codes (`errorCode` on a `failed` task)

The set is closed; treat any other value as `upstream_failed`.

| `errorCode` | Meaning | Retry |
| --- | --- | --- |
| `invalid_request` | Model rejected the parameters | No, fix them |
| `unsupported_combination` | Settings combination not supported now | Change a setting |
| `content_rejected` | Model declined the content | Change prompt or reference |
| `invalid_asset` | Reference file unreadable or gone (e.g. a share page instead of the file) | Upload it and create a new task |
| `rate_limited` | Generation service busy | Yes, with backoff |
| `upstream_unavailable` | Generation temporarily unavailable | Yes, shortly |
| `generation_failed` | Ran but produced nothing | Maybe |
| `timeout` | Ran out of time | Maybe, shorter or lower resolution |
| `upstream_failed` | Anything else | Yes, with backoff |

A failed task releases its hold. Show `errorMessage`, branch on `errorCode`.

## When 409 is worth retrying

| Case | Retry |
| --- | --- |
| Two requests with the same Idempotency-Key at once | Yes, same key, after a short pause |
| Key reused for a different request, or by another API key | No |
| Upload or output still processing | Yes, after a few seconds |
| `retry` on a task not final yet | Yes, once final |
| `retry` on a succeeded task | No, create a new task |
| Upload ticket or file expired | No, upload again |

## Retry pattern

Retry only `429`, `500`, `503`, `50301` and network errors; honour `Retry-After`; otherwise exponential backoff with jitter (1 s, 2 s, 4 s ...). When retrying `createTask`, always resend the **same** Idempotency-Key.
