# API balance and billing (USD)

- API keys spend the **API balance, in US dollars**. It is separate from the website's credits: website credits cannot pay for API calls and API funds cannot be moved to the website. It starts at $0; add funds and see API payments in API billing: https://popnow.ai/api/console/billing. No subscription.
- API-key calls (REST, the compatible endpoints and the developer MCP) and API Playground runs spend the API balance. A model costs the same on the API as on popnow.ai for the same settings; API prices: https://popnow.ai/api/pricing.
- Prices are per model and option: per image, per second of video or audio, per request, or per 1,000 characters of speech.
- Amounts are exact USD decimal strings with up to nine decimal places (`maxChargeUsd`, `expectedChargeUsd`, `estimatedCostUsd`, `costUsd`, `availableUsd`, `heldUsd`, `totalUsd`, `totalSpend`). Keep them as strings or decimals; never convert through binary floating point and never round them.
- Older integer credit fields (`maxCredits`, `expectedCredits`, `estimatedCredits`, `credits`, `exactCredits`, `availableCredits`, `heldCredits`, `totalCredits`) still appear for compatibility. They are deprecated display projections (1 credit = $0.001, rounded), not billing units: do not confirm, compare or reconcile with them.

## How one task is charged

1. **Hold**: `createTask` sets aside the highest price the task can reach (`estimatedCostUsd`).
2. **Settle or release**: `succeeded` pays the actual usage, never more than the hold; the rest returns to the balance. `failed` or `expired` releases the whole hold.

While `settled` is false a task's `costUsd` is the hold; once `settled` is true it is the final charge.

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
            "maxChargeUsd": "0.45", "expectedChargeUsd": "0.45", "currency": "USD",
            "quantity": "5", "unit": "per_second", "expiresAt": "2026-10-16T09:25:00Z" },
  "request_id": "req_..." }
```

`maxChargeUsd` is the most it can cost (the amount that will be held); `expectedChargeUsd` is the usual cost (it differs only when the charge depends on the output, such as a clip's real length) and is informational. Lock the price by passing `quoteId` and `expectedCostUsd` (= `maxChargeUsd`, as the same decimal string) to `createTask` within five minutes, or `quoteId` alone. `expectedCost` is a legacy alias of `expectedCostUsd`; `expectedCredits` is deprecated. A changed price or expired quote returns `40901` with nothing held. A quote does not reserve capacity.

## Balance

`GET /api/v1/chat/credit` (the path name is historical; it has nothing to do with chat): `availableUsd` (what new tasks can use), `heldUsd` (set aside for running tasks) and `totalUsd` (both together), all USD decimal strings, plus a `funding` breakdown. Only API funds count. When the available balance cannot cover a hold, `createTask` returns `40201`: add funds at https://popnow.ai/api/console/billing.

## Usage

`GET /api/v1/usage?from=2026-10-01&to=2026-10-16` returns this key's task counts, successes, failures and settled USD spend: `totalSpend`, and `spend` per day and per model. UTC dates, `to` exclusive, at most 92 days. Only settled charges count. Limited to 30 requests per minute per account. For the whole account use API billing in the console.

## Spend caps

Daily (resets 00:00 UTC), monthly (1st of the month, 00:00 UTC) and lifetime caps per key, in USD, set in the API console (fields `dailySpendCap`, `monthlySpendCap`, `totalSpendCap`). Over a cap: `40202`, nothing held. Keys have no caps unless you add them.

## Holds and refunds

Failed and expired tasks release their holds automatically; that is not a payment refund. For API payment records and refund questions, see API billing or contact support (https://popnow.ai/docs/api-balance-and-refunds).
