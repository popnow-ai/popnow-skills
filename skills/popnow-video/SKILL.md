---
name: popnow-video
description: Generate AI videos with the PopNow API - text-to-video from a prompt, image-to-video from a photo (bring a picture to life), plus video extend and upscale - using models such as MiniMax H3, Kling, Seedance, Wan and Vidu. Use when the user asks to make, animate or render a video clip, or to turn an image into a video. Quotes the credit price and waits for the user's OK before spending anything. Needs POPNOW_API_KEY.
license: MIT
---

# PopNow video generation

Make short AI videos through the PopNow REST API (`https://api.popnow.ai/api/v1`). Every generation is an asynchronous task: **quote -> confirm -> create -> wait -> download**. The bundled script `scripts/popnow.py` (Python 3 standard library only) does all of it. Paths below are relative to this skill's folder.

## Rule: always confirm the price first

Generations spend the user's PopNow credits (1 credit = $0.01). Before any `create`:

1. Run `quote` with the exact request.
2. Tell the user the price in credits (and their balance) and ask whether to go ahead.
3. Only after a clear yes, run `create --confirm-credits <maxCredits>`. The script re-quotes and refuses to start if the price is now higher (exit code 3; nothing is charged). Then quote again and ask again.

Never pick a more expensive model, longer duration or higher resolution than the user asked for without saying so. Failed or expired tasks are refunded automatically.

## Setup

```bash
export POPNOW_API_KEY="sk-popnow-..."   # https://popnow.ai/api/console/keys
python3 scripts/popnow.py balance        # free; confirms the key works
```

If the key is missing, ask the user to create one; never invent or echo a key.

## Steps

1. **Pick a model** (defaults below; full list with prices in `references/models.md`, live list with `python3 scripts/popnow.py models --modality video`).
2. **Check its fields** when you need more than prompt/image/duration: `python3 scripts/popnow.py model <model-id>` (free). Unknown fields are rejected.
3. **Quote**:
   ```bash
   python3 scripts/popnow.py quote --model minimax/h3/text-to-video \
     --prompt "A vintage car cruising along a coastal road at golden hour, drone shot" \
     --duration 5 --aspect-ratio 16:9
   ```
4. **Confirm** the `maxCredits` number with the user.
5. **Create and download** (waits for the result; video usually takes 1-3 minutes):
   ```bash
   python3 scripts/popnow.py create --model minimax/h3/text-to-video \
     --prompt "A vintage car cruising along a coastal road at golden hour, drone shot" \
     --duration 5 --aspect-ratio 16:9 --confirm-credits 28 --download ./popnow-output
   ```
   Use exactly the same flags as the quote. Without `--download`/`--wait` it returns a `taskId` at once; collect later with `python3 scripts/popnow.py wait <taskId> --out ./popnow-output`.
6. **Report** the saved file path(s) and the credits charged. Output links expire after about 20 minutes; the files are saved locally by `--download`.

### Image to video

`--image` accepts a public HTTPS URL, a `popnow://` URI, or a local file (uploaded automatically, free):

```bash
python3 scripts/popnow.py quote --model minimax/h3/image-to-video \
  --image ./photo.jpg --prompt "She turns to the camera and smiles, hair moving in the wind" --duration 5
```

The script puts the image in the field the model declares (`image_url` or `image_urls`). For a closing frame use `--last-image` on models that have `last_image_url`. Use the `.../image-to-video` model ID when a photo is given and `.../text-to-video` when not.

## Good defaults

| Need | Model ID | Typical price |
| --- | --- | --- |
| Default, text or photo to video | `minimax/h3/text-to-video`, `minimax/h3/image-to-video` (768p, 5 s) | about 28 credits |
| Cheapest | `bytedance/seedance-2.0-mini/image-to-video` or `/text-to-video` with `--resolution 480p` | about 19 credits for 5 s |
| Higher quality, optional sound | `kling/3.0/image-to-video` (720p, `--set generate_audio=true` costs more) | about 51 credits for 5 s |
| Longer clip | add `--duration 10` (price scales per second) | quote it |
| Extend a clip | `<family>/video-extend` with `--video` | quote it |
| Sharpen / upscale a video | `popnow/video-upscaler-v1/upscale` with `--video` and `--resolution 1080p` | about 1 credit per second |

Prices change; the quote is the only exact number.

## Writing prompts

Describe one shot: subject, action, camera movement, setting, light and mood, e.g. "Close-up of a ceramic mug on a wooden table, steam rising, slow push-in, soft morning window light". For image-to-video describe the motion, not the picture. Keep the content suitable for a general audience; requests the model declines fail with `content_rejected` and cost nothing.

## Errors

| You see | Do |
| --- | --- |
| Exit 3 "costs up to N, more than the M the user confirmed" | Tell the user the new price; re-run with `--confirm-credits N` only after they agree |
| `40201` not enough credits | Ask the user to top up at https://popnow.ai/pricing, or pick a cheaper option |
| `400` with a message | Fix the named field (check `model <id>`); nothing was charged |
| Task `failed` (exit 5) | Read `errorCode`; the hold was refunded. `content_rejected`: change the prompt or image |
| Exit 4 still running | Run `python3 scripts/popnow.py wait <taskId> --out DIR` again |

More: `../popnow-api/` (if installed) or https://popnow.ai/docs.

## Alternative: MCP

If the PopNow MCP server is connected (`https://api.popnow.ai/mcp`, tool `create_video`), you can use it instead of this script; it quotes the same way.
