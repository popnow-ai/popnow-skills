---
name: popnow-effects
description: Apply PopNow's trending one-tap video effects and photo styles to a photo - Tiny Planet, Hyperdrive, Zombie Turn, Werewolf Turn, Molten Gold, Flying Car, dances, weather and film looks, plus image styles like Clay Figure, Pixel Art, Sticker Pack and Comic Cover. Use when the user wants a viral or trending effect, a TikTok/Reels-style transformation, "make my photo dance", or a named PopNow effect applied to their picture. Quotes the credit price and waits for the user's OK before spending anything. Needs POPNOW_API_KEY.
license: MIT
---

# PopNow effects and photo styles

PopNow's effects (https://popnow.ai/effects) are ready-made recipes: a model, a prompt written by PopNow and locked settings. The REST API has no separate effects endpoint, so this skill ships the recipes (`references/effects.json`, 143 effects) and `scripts/effects.py`, which applies one to the user's photo as an ordinary PopNow task on the underlying model: **quote -> confirm -> create -> wait -> download**. Python 3 standard library only. Paths below are relative to this skill's folder.

## Rule: always confirm the price first

Effects spend the user's PopNow credits (1 credit = $0.01): about 19-51 credits for a 5-second effect video and 5-8 for an image style. Run `quote`, tell the user the price and balance, and only after a clear yes run `create --confirm-credits <maxCredits>`. The script re-quotes and will not start if the price went up (exit code 3, nothing charged). Failed tasks are refunded automatically.

## Setup

```bash
export POPNOW_API_KEY="sk-popnow-..."   # https://popnow.ai/api/console/keys
python3 scripts/popnow.py balance
```

## Steps

1. **Find the effect.** Names match loosely ("zombie" finds Zombie Turn):
   ```bash
   python3 scripts/effects.py list --popular          # the trending ones
   python3 scripts/effects.py list --search dance     # by keyword
   python3 scripts/effects.py list --kind image       # photo styles only
   python3 scripts/effects.py show "Tiny Planet"      # details, sample video, model
   ```
   Or browse `references/effects.md`. If several match, show the user the options.
2. **Quote** with the user's photo (public HTTPS URL, `popnow://` URI, or local JPEG/PNG/WebP, uploaded automatically for free):
   ```bash
   python3 scripts/effects.py quote zombie-turn --image ./me.jpg
   ```
   The output ends with the photo's `popnow://` reference; pass that to `create` so the file is not uploaded twice.
3. **Confirm** the credits with the user.
4. **Create and download** (effect videos take about 1-3 minutes):
   ```bash
   python3 scripts/effects.py create zombie-turn --image popnow://f/fil_... \
     --confirm-credits 51 --download ./popnow-output
   ```
5. **Report** the saved file and the credits charged. Without `--download` you get a `taskId`; finish with `python3 scripts/popnow.py wait <taskId> --out ./popnow-output`.

## Tips

- A clear, well-lit photo of one person (or one pet for pet effects) facing the camera works best.
- The effect's prompt and settings are fixed. To change length, resolution or wording, use the `popnow-video` or `popnow-image` skill with the effect's model (`show` prints it) and your own prompt.
- Two-person effects from the website are not available here because they need two photos placed in slots; point the user to https://popnow.ai/effects for those.
- `references/effects.json` is a snapshot. New effects appear on the website first; update this skill to get them.

## Errors

| You see | Do |
| --- | --- |
| "matches several effects" | Pick one slug from the list, or ask the user |
| Exit 3 price above the confirmed amount | Tell the user the new price; re-run only after they agree |
| `40201` not enough credits | Top up at https://popnow.ai/pricing |
| Task `failed` with `content_rejected` or `invalid_asset` | Refunded automatically; try a different, clearer photo |

## Alternative: MCP

With the PopNow MCP server connected (`https://api.popnow.ai/mcp`), the `apply_effect` tool runs the same effects by name.
