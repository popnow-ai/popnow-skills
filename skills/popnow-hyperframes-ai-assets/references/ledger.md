# The ledgers: HyperFrames media ledger and the provenance file

Every generated file is written down twice. The HyperFrames media ledger tells HyperFrames' media
tools that the file exists and what it is; the provenance file tells people where it came from and what
it cost.

## 1. The HyperFrames media ledger (`.media/manifest.jsonl`)

HyperFrames' media tooling (`npx hyperframes media-use resolve ...`) keeps one
ledger per project: `.media/manifest.jsonl`, one JSON record per line, plus a readable inventory in
`.media/index.md`. It uses the ledger to reuse assets (`--candidates`, `--reuse`), to auto-reuse an
exact repeat of a prompt, and to adopt files already sitting in `assets/`.

The script writes records in the same shape media-use writes for a file it recorded in place:

```json
{"id":"image_003","type":"image","path":"assets/images/hero-desk.png","source":"generated","description":"Beat 1 backdrop, behind the hook line","width":1376,"height":768,"provenance":{"provider":"popnow","prompt":"Early-morning studio desk by a tall window, ...","model":"google/nano-banana-2.1/text-to-image","taskId":"job_...","credits":48,"plan_item":"hero-desk","license":"see assets/popnow-provenance.json"}}
```

| Field | Value |
| --- | --- |
| `id` | `<type>_<NNN>`, the next number not used by any record of that type **and** not reserved by a file in `.media/<type folder>/` (a resolve that is still downloading reserves its id that way) |
| `type` | `image`, `video`, `bgm`, `voice` or `sfx` |
| `path` | Where the file is, relative to the project (`assets/...`). The file stays where the composition uses it; nothing is copied into `.media/` |
| `source` | `generated`, one of the values media-use treats as "made by an agent" (so its audio engine may later write a numbered sibling instead of refusing) |
| `description` | The item's `description`, else its `use`, else its prompt, shortened |
| `duration`, `width`, `height` | Filled from `ffprobe` when it is installed |
| `provenance.provider` | `popnow` |
| `provenance.prompt` | The exact prompt or spoken text. media-use matches future intents against this field, so an identical request later reuses the file instead of fetching |
| `provenance.model`, `taskId`, `credits`, `plan_item` | Extra keys; media-use keeps and ignores them |

### Rules the script keeps, so the ledger never breaks

- **Append only.** Existing lines, including lines media-use itself would skip as malformed, are never
  rewritten, reordered or removed. A missing final newline is completed before appending.
- **Same lock.** Writers take `.media/.lock` with an exclusive create; a lock older than 15 seconds is
  treated as stale, the same way media-use treats it. A run waits up to 20 seconds for the lock.
- **Ids are never reused**, as above.
- **The index is regenerated** from the current records (the last record for each path wins) in the
  same column layout media-use prints, so `.media/index.md` stays readable after both tools write.
- **Files are never overwritten.** If `assets/images/hero-desk.png` exists, the new file becomes
  `hero-desk-2.png` and the record points at it.

### Checking it

```bash
npx hyperframes media-use resolve --type image --intent "studio desk" --candidates --project .
cat .media/index.md
```

The generated files appear as project candidates with their prompts. Reference them by path in the
composition; no resolve is needed.

### Recording through the HyperFrames CLI instead (`--ledger cli`)

If you prefer that HyperFrames writes its own ledger, run the generation with `--ledger cli`. Each file
is then recorded by:

```bash
npx --yes hyperframes media-use resolve --type <type> --from <assets/... path> --source generated \
  --intent "<prompt>" --project . --json
```

For a file already inside the project, media-use records it in place with provenance
`{ provider: "local", from, prompt }`. The PopNow details (model, task, credits, licence) then live only
in the provenance file below. This mode needs the HyperFrames CLI reachable through `npx`.

`--ledger none` skips the HyperFrames ledger entirely; `media-use resolve --adopt` can pick the files
up later from their folders.

## 2. The provenance file (`assets/popnow-provenance.json`)

Owned by this skill, rewritten atomically after every item, kept with the project:

```json
{
  "version": 1,
  "tool": "popnow-hyperframes-ai-assets",
  "entries": [
    {
      "item": "hero-desk",
      "kind": "image",
      "state": "done",
      "files": ["assets/images/hero-desk.png"],
      "media": [{ "file": "assets/images/hero-desk.png", "mediaId": "image_003", "width": 1376, "height": 768 }],
      "model": "google/nano-banana-2.1/text-to-image",
      "prompt": "Early-morning studio desk by a tall window, ...",
      "use": "Beat 1 backdrop, behind the hook line",
      "params": { "resolution": "1k", "aspectRatio": "16:9" },
      "taskId": "job_...",
      "credits": 48,
      "quotedCredits": 48,
      "requestHash": "3f1c...",
      "generatedAt": "2026-10-22T09:14:03.000Z",
      "license": "PopNow output (google/nano-banana-2.1/text-to-image). Under https://popnow.ai/terms you own it to the extent the law allows and may use it commercially; you remain responsible for the prompt and any inputs."
    }
  ]
}
```

- `state` is `done`, `failed` (refunded, not retried) or `running` (collected on the next run).
- `requestHash` identifies the exact request. A re-run skips an item whose last `done` entry has the
  same hash and whose files still exist; `--regenerate <id>` makes a new take and keeps the old one.
- `consent` is copied from the plan when an item needed it, so the record of who allowed a likeness or
  voice travels with the file.
- Sum the `credits` of `done` entries for the handoff.

## What to tell the user at the end

The list of files with their `use`, the credits charged against the confirmed total, any failed or
running items, and where the two ledgers are. If a file will be published, mention the licence note.
