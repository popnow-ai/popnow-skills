# Credits and billing

- API and popnow.ai spend the same credits at the same prices. No separate API plan, no subscription, no minimum; buy credit packs at https://popnow.ai/pricing (credits are bought on the website, not through the API).
- 1 credit = $0.01 at the base rate; larger packs include bonus credits.
- Prices are per model and option: per image, per second of video or audio, per request, or per 1,000 characters of speech.
- Every amount appears twice: whole credits (`credits`, `maxCredits`, `availableCredits`...) and a USD string (`cost`, `maxCharge`, `available`...). Use the credit fields.

## How one task is charged

1. **Hold**: `createTask` sets aside the highest price the task can reach (`estimatedCredits`).
2. **Settle or release**: `succeeded` pays the actual usage, rounded up to whole credits and never more than the hold; the rest returns. `failed` or `expired` releases the whole hold.

A few models charge for a request their maker refused on content grounds; their model page says so. Everywhere else failure is free.

| Situation | Charged |
| --- | --- |
| `createTask` rejected (400, 402, 403, 429, 50301...) | No task, no hold |
| Task succeeded | Actual amount, capped at the hold |
| Task failed or expired | No (except the content-refusal case above) |
| Connection dropped after sending | Unknown; resend with the same `Idempotency-Key` to find the task |
| Reading tasks, models, balance, usage; webhooks | Never |

## Quote first

`POST /api/v1/jobs/quote` takes exactly the `createTask` body and returns the price without creating or holding anything:

```json
{ "code": 200, "msg": "success",
  "data": { "quoteId": "q_...", "model": "alibaba/wan-3.0/image-to-video",
            "maxCredits": 68, "expectedCredits": 68, "estimatedCost": "0.68", "maxCharge": "0.68",
            "currency": "USD", "quantity": "5", "unit": "per_second", "expiresAt": "2026-10-16T09:25:00Z" },
  "request_id": "req_..." }
```

`maxCredits` is the most it can cost (the amount that will be held); `expectedCredits` is the usual cost (differs only when the charge depends on the output, such as a clip's real length). Lock the price by passing `quoteId` and `expectedCredits` (= `maxCredits`) to `createTask` within five minutes. A changed price or expired quote returns `40901` with nothing held. A quote does not reserve capacity.

## Balance

`GET /api/v1/chat/credit` (the path name is historical): `availableCredits` (what new tasks can use), `heldCredits` (set aside for running tasks), `totalCredits`, plus USD strings `available`, `held`, `total` and a `funding` breakdown. When the available balance cannot cover a hold, `createTask` returns `40201`.

## Usage

`GET /api/v1/usage?from=2026-10-01&to=2026-10-16` returns this key's task counts, successes, failures and settled spend in total, per day and per model. UTC dates, `to` exclusive, at most 92 days. Limited to 30 requests per minute per account. For the whole account use the console's usage page.

## Spend caps

Daily (resets 00:00 UTC), monthly (1st of the month, 00:00 UTC) and lifetime caps per key, in credits, set in the API console. Over a cap: `40202`, nothing held.

## Refunds

Failed and expired tasks are refunded automatically. A credit pack none of whose credits were used can be refunded within 7 days of purchase; see https://popnow.ai/refunds.
