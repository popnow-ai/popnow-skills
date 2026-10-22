# PopNow in this skill

PopNow makes the pictures code cannot: moodboard photography, symbol sketches and photo mockups.
Colours, type, logos, HTML mockups and the board are made locally and cost nothing.

## Routine (every paid call)

```bash
python3 scripts/popnow.py model alibaba/z-image-turbo/text-to-image          # free: fields and price tiers
python3 scripts/plan.py commands brand/brief.json --stage directions          # prints one quote per picture
python3 scripts/popnow.py quote --model alibaba/z-image-turbo/text-to-image --prompt "..." --aspect-ratio 1:1
```

Add up the quotes for the stage, tell the user the total credits and their balance
(`python3 scripts/popnow.py balance`), and wait for a clear yes. Then:

```bash
python3 scripts/plan.py commands brand/brief.json --stage directions --create   # create commands
python3 scripts/popnow.py create --model ... --confirm-credits <QUOTED> --download brand/assets/moodboard/_raw/dir-a-1
```

Move each downloaded file to its `out` path (convert to WebP if you like) and set `"status": "done"`.
If the price went up, `create` stops without charging (exit 3): tell the user the new price. A
failed task refunds automatically; do not retry a paid task without asking.

## Models

| Need | Default | Alternatives |
| --- | --- | --- |
| Moodboard drafts | `alibaba/z-image-turbo/text-to-image` | - |
| Polished moodboard / blank mockup scenes | `google/nano-banana-2.1/text-to-image` | `--resolution 2k` for print |
| Mockups with the logo as reference | `google/nano-banana-2.1/edit` (`--image lockup.png`) | `bytedance/seedream-5.0-flash/edit` |
| Symbol exploration sheet | `openai/gpt-image-2/text-to-image` | good at flat graphic sheets |
| Print upscale | `popnow/image-upscaler-v1/upscale` | |
| Cut-out on a transparent background | `popnow/background-remover-v1/edit` | |

Models change; `python3 scripts/popnow.py models --modality image` lists what is live. Read a
model's fields with `model <id>` before passing extra options with `--set key=value`.

## Without a key

Say: "Picture slots need a PopNow API key (https://popnow.ai/api/console/keys). I'll keep them as
labelled placeholders with their prompts; everything else in the kit is finished." Then continue.
The user can also drop their own photos at the `out` paths and rebuild the board.

## Prompt hygiene

- Describe what to see: subject, material, setting, light, palette words, composition, mood.
- End picture prompts with "no text" (and "no letters" for symbols): words are set in HTML.
- People: hands or backs only, "no identifiable faces". Never a real person or a named style.
- Never name a competitor or ask for a trademark; `plan.py check` blocks it.
- Content must suit a general audience; declined prompts fail with `content_rejected` and cost nothing.
