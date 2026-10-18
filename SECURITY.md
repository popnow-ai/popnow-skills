# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately, either by opening a [private security advisory](https://github.com/popnow-ai/popnow-skills/security/advisories/new) on this repository or by email to support@popnow.ai with "Security" in the subject (see also https://popnow.ai/contact). Include the steps to reproduce and the affected version.

## API keys

- The scripts read the key only from the `POPNOW_API_KEY` environment variable and send it only to the PopNow API base URL. Signed download and upload links are fetched without it.
- Never commit a key or paste one into an issue. If a key leaks, revoke it at https://popnow.ai/api/console/keys and create a new one.
- Give agents their own key with a spend cap and, where possible, an allowed-models list and an IP allowlist.

## Supported versions

Only the latest release receives fixes.
