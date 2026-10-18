# Authentication

Every request carries one API key:

```http
Authorization: Bearer sk-popnow-3f9c0a...
```

- A key is `sk-popnow-` followed by 48 lowercase hex characters. It is shown once when created; a lost key cannot be recovered, create a new one.
- Create keys at https://popnow.ai/api/console/keys. Keys in the URL query string are never accepted, and a popnow.ai login session does not work on the API.
- The OpenAI-compatible `/v1/*` routes also read `x-api-key`. Native `/api/v1/*` routes only read `Authorization`.
- Keep keys in an environment variable or secret store (`POPNOW_API_KEY`), never in browser or mobile code, never in logs.
- All keys of an account spend the same credit balance. One key per environment or service makes revocation painless.

## Per-key restrictions (set in the API console)

| Restriction | Effect | Error when it blocks |
| --- | --- | --- |
| Allowed models | Key can call only listed models | `40301` |
| IP allowlist | Requests must come from listed addresses or ranges | `40302` |
| Spend caps | Daily, monthly, lifetime limits in credits | `40202` |

Keys have no restrictions by default. Give an agent its own key with a low daily cap.

## Tasks belong to the key that created them

`recordInfo`, `retry`, `purge`, the task list and usage only see tasks created with the same key. Another key's task answers `404`, exactly like a missing task. Website generations are not visible to any key.

## Rotation

Create the new key, deploy it, watch the old key's last-used time stop moving in the console, then revoke the old key.

## If a key leaks

Revoke it in the console (takes effect on the next request), deploy a replacement, review the key's logs and usage, and tighten the replacement with an IP allowlist and a spend cap. Contact https://popnow.ai/contact about spending you did not make.

## Auth errors

All return HTTP 401 with `code: 401`; `msg` tells them apart:

| `msg` | Meaning |
| --- | --- |
| Missing credentials | No `Authorization` header arrived |
| API key format is not recognized | The value is not a `sk-popnow-` key |
| Credentials are invalid or expired | Unknown, revoked or expired key; retrying never helps |

A valid key can still get `403`, e.g. `40310` when the account email is not verified yet.
