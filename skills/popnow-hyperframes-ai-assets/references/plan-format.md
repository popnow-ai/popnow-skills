# The asset plan

One JSON file describes every piece of media the film needs from PopNow. Keep it in the project
(`assets.plan.json`) so the next person can see what was asked for and re-run a single item.

## Shape

```json
{
  "version": 1,
  "title": "Spring launch film",
  "project": ".",
  "defaults": { "aspectRatio": "16:9" },
  "assets": [
    {
      "id": "hero-desk",
      "kind": "image",
      "model": "google/nano-banana-2.1/text-to-image",
      "prompt": "Early-morning desk by a tall window, a closed laptop and a paper notebook, warm low sun, soft long shadows, cream and deep plum tones, shallow depth of field, no text, no logos, no people",
      "resolution": "1k",
      "use": "Beat 1 backdrop, behind the hook line, graded 20% darker"
    },
    {
      "id": "hero-move",
      "kind": "video",
      "model": "minimax/h3/image-to-video",
      "image": "@hero-desk",
      "prompt": "Very slow push in towards the notebook, dust in the sunlight, camera steady",
      "duration": 5,
      "use": "Beat 1, under the hook line"
    },
    {
      "id": "bed",
      "kind": "bgm",
      "model": "suno/v6/text-to-audio",
      "prompt": "Warm minimal electronic instrumental, 100 BPM, soft kick, round bass, bright plucked synth motif, builds gently for 20 seconds then lands on a clean ending",
      "title": "Launch bed",
      "use": "Whole film, ducked under the voice"
    },
    {
      "id": "vo-en",
      "kind": "voice",
      "model": "google/gemini-3.8-flash-tts/text-to-speech",
      "text": "You shipped it. Now launch it.",
      "voice": "Kore",
      "lang": "en",
      "set": { "style": "vocal_smile" },
      "use": "Beat 1 and the closing line"
    }
  ]
}
```

`project` is resolved relative to the plan file; `--project DIR` overrides it. `defaults.aspectRatio`
applies to image and video items that do not set their own and have no `image` input (a model that
starts from a picture keeps its shape and rejects the field). Resolution names differ between models
(`1k` for images, `768p` for video), so set `resolution` per item.

## Item fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Lowercase letters, digits, dashes. Names the file (`assets/<folder>/<id>.<ext>`) |
| `kind` | yes | `image`, `video`, `bgm`, `voice` or `sfx` (see the folder table below) |
| `model` | yes | A PopNow model id; `python3 scripts/popnow.py models --modality image\|video\|audio` lists them |
| `prompt` | image, video, bgm, sfx | What to make. Not needed when a media input alone defines the job (upscale, background removal) |
| `text` | voice | The words to speak, in the language you want spoken (5,000 characters at most) |
| `voice` | no | Voice name for speech models (Gemini voices: Kore, Puck, Charon, Aoede, Fenrir, Leda, ...) |
| `lang` | no | One of `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `de`, `fr`, `es`, `pt-BR`, `ru`, `it`, `pl`. Recorded only; the model reads the language from the text |
| `duration` | no | Seconds for video (3 to 15; `minimax/h3/text-to-video` starts at 5) and for `popnow/foley-v1` |
| `aspectRatio`, `resolution`, `seed`, `negativePrompt`, `lyrics`, `title`, `outputFormat` | no | Passed to the model field of the same meaning |
| `image`, `lastImage`, `video`, `audio` | no | Inputs: a path inside the project, an `https://` URL, a `popnow://` URI, or `@<id>` for another item's first file. `image`, `video` and `audio` can be lists |
| `set` | no | Any other model field, e.g. `{ "style": "newscaster" }`, `{ "quality": "medium" }`, `{ "instrumental": false }` |
| `out` | no | A different destination inside the project, e.g. `assets/images/hook.png`. The extension follows the downloaded file |
| `use` | no | Where it goes in the film. Shown in the ledger description; write it, it helps the next person |
| `description` | no | Overrides the ledger description |
| `people` | no | `none` (default), `generic` (anonymous people, no one identifiable) or `real` (an identifiable real person) |
| `consent` | when required | `{ "confirmed": true, "by": "<rights holder>", "note": "<how and when>" }`. Required for `people: "real"`, voice or persona references and prompts that ask to imitate a voice or artist |
| `license` | no | Extra licence text appended to the provenance note (for example the terms of a supplied input) |

Defaults the script adds: music beds on `suno/...` are `instrumental=true` unless the item has
`lyrics` or sets `instrumental`; video on `bytedance/seedance...` gets `generate_audio=false`, because
B-roll is placed muted.

## Folders

| Kind | Folder | HyperFrames media type |
| --- | --- | --- |
| `image` | `assets/images/` | `image` |
| `video` | `assets/video/` | `video` |
| `bgm` | `assets/bgm/` | `bgm` |
| `voice` | `assets/voice/` | `voice` |
| `sfx` | `assets/sfx/` | `sfx` |

These are the folder names `npx hyperframes media-use resolve --adopt` uses to infer a type, so even
a project that never ran this script reads them correctly.

A model that returns several files (a music run usually gives two takes) produces `bed.mp3` and
`bed-take2.mp3`. When the destination already exists, the script never overwrites it: it writes
`hero-2.png` and records that path.

## Dependencies

`"image": "@hero-desk"` means "the first file `hero-desk` produced". The script orders the plan so
dependencies run first. A dependent item cannot be quoted before its input exists, so the first quote
uses a typical price (marked `est.`); the item is quoted for real just before it runs, and the run stops
without starting it if that would pass the confirmed total. If the dependency fails, the dependent is
skipped.

To feed an earlier run's result into a new item, keep the `@id`: finished items are remembered in
`assets/popnow-provenance.json`.

## Commands and options

```bash
node scripts/popnow-assets.mjs assets.plan.json --dry-run            # free, offline
node scripts/popnow-assets.mjs assets.plan.json --dry-run --preview-out plan.preview.json
node scripts/popnow-assets.mjs assets.plan.json --quote              # free, needs the key
node scripts/popnow-assets.mjs assets.plan.json --confirm-credits 500
node scripts/popnow-assets.mjs assets.plan.json --only bed,vo-en --confirm-credits 82
node scripts/popnow-assets.mjs assets.plan.json --regenerate bed --confirm-credits 72
node scripts/popnow-assets.mjs --self-test
```

| Option | Effect |
| --- | --- |
| `--project DIR` | The HyperFrames project, if not the plan's `project` |
| `--only a,b` | Run only these items (their `@` inputs must already exist) |
| `--regenerate a,b` | New take of finished items; the old files stay, the new ones get the next free name |
| `--ledger media-use` | Default. Append records to `.media/manifest.jsonl` directly, in media-use's format |
| `--ledger cli` | Record each file through `npx hyperframes media-use resolve --from <file> --source generated` instead |
| `--ledger none` | Only write `assets/popnow-provenance.json` |
| `--popnow FILE`, `--python BIN` | Where `popnow.py` and Python 3 are |
| `--timeout SECONDS` | How long to wait per task (default 1200) |
| `--json` | Machine-readable summary |

Without `--confirm-credits`, a run in a terminal asks the user to type the total; anywhere else it
prints the total and exits with code 3. An agent should always quote, ask in the conversation, then
pass `--confirm-credits`.

## Exit codes

| Code | Meaning | What to do |
| --- | --- | --- |
| 0 | Done | Place the files |
| 1 | API or network error | Read the message; nothing more was started |
| 2 | Plan or usage problem | Fix the plan; nothing was sent |
| 3 | Needs confirmation, or the next item would pass the confirmed total | Tell the user the new number and ask |
| 4 | A task is still running (its credits are held) | Run the same command again later: it collects the task with `wait` and does not pay again |
| 5 | A task failed (refunded) | Report it; change the prompt only with the user, then `--only <id>` |
