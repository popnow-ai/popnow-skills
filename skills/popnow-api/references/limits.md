# Rate limits

| Limit | Default | When hit |
| --- | --- | --- |
| Writes per account (`createTask`, `retry`, uploads...) | 1,000 per 10 s | `429` + `Retry-After` |
| Reads per account (`recordInfo`, `models`, `jobs`, `quote`...) | 1,000 per 10 s | `429` + `Retry-After` |
| Upload tickets | 1,000 per 10 s, on top of writes | `429` + `Retry-After` |
| Usage report | 30 per minute per account | `429` + `Retry-After` |
| Asset library | 60 reads, 30 saves per minute, plus a daily number of new assets | `429` + `Retry-After` |
| Any request before the key is checked | 6,000 per minute per network | `429` |
| Request body | 2 MiB of JSON | `413` |

Limits count per account, not per key. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining` (also on success), `Retry-After` (on 429). Trust the headers over these defaults. A request over the limit is rejected immediately, not queued, and costs nothing.

Rate limits cap how fast you send requests, not how many tasks run at once. Spread large batches out and let webhooks bring results back. Poll gently: every few seconds for images, every 10-15 seconds for video.
