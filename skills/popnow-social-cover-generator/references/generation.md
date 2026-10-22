# Pictures from PopNow

The rule that makes this skill reliable: **generated images never contain the words.**
Image models still misspell, kern badly and invent extra letters. Every word on a cover
is HTML text in a real font; PopNow supplies only what code cannot draw: photographic
backgrounds, scenes, objects and characters.

## What gets generated

| Picture | Model | Settings | About (credits) |
| --- | --- | --- | --- |
| Background, one per canvas shape in use | `google/nano-banana-2.1/text-to-image` | 16:9 (landscape), 3:4 (portrait), 9:16 (tall), `resolution 2k` | 35-72 each |
| Lite background, reused for every shape | same | 16:9, `resolution 1k` | 22-48 |
| Look-finding drafts | `alibaba/z-image-turbo/text-to-image` | same ratios | about 10 each |
| Subject for a cut-out | `google/nano-banana-2.1/text-to-image` | 1:1, `resolution 1k`, plain grey backdrop | 22-48 |
| Cut-out (transparent PNG) | `popnow/background-remover-v1/edit` | `--image <subject>` | about 5 |
| Optional sharper background | `popnow/image-upscaler-v1/upscale` | `--image <file>`, `resolution 4k` | about 12 |
| A background with readable lettering in the scene (a shop sign, a poster) | `openai/gpt-image-2/text-to-image` | only when the lettering is part of the picture, never for the headline | quote it |

Typical full set (six platforms): two backgrounds and one subject cut-out, about
100-200 credits. Lite: one background at 1k, about 22-48. Rendering, checks and the
contact sheet run locally and cost nothing. These ranges set expectations only; the
quote is the price, and models change (`python3 scripts/popnow.py models --modality image`).

## Planning

```bash
node scripts/bg-plan.mjs covers.json                # list jobs, write request files
node scripts/bg-plan.mjs covers.json --lite         # one 1k landscape background, reused
node scripts/bg-plan.mjs covers.json --draft        # cheapest drafts first
node scripts/bg-plan.mjs covers.json --upscale youtube
node scripts/bg-plan.mjs covers.json --update-spec  # point the spec at the download folders
```

The plan looks at which layouts use which picture on which canvas shape and adds a
composition instruction to your prompt: for text-on-photo layouts it asks for a calm,
dark, low-detail area where the headline goes (left half on landscape, top third on
portrait); for panel layouts it asks for a centered subject with margins so any crop
works. It always appends "no text, no letters, no logos". It skips any picture that is
already on disk.

## Spending

For each job: `model` (free, check field names once) -> `quote` -> add up -> tell the
user the total and their balance -> after a clear yes, `create --confirm-credits <quoted>
--download <folder>`. Run dependent jobs (cut-out after subject, upscale after
background) only after the first finishes, replacing `<downloaded file>` with the real
path. A failed task is refunded; do not retry it automatically.

## Writing the background prompt

Describe a scene, not a design: subject, place, light, lens or medium, palette.

- Good: "Top-down photograph of a tidy desk in warm afternoon light: an open laptop with a
  code editor, a sketchbook with storyboard frames, a film clapperboard, cream surface,
  small tangerine accents, soft natural shadows."
- Weak: "A modern, eye-catching background for a tech launch."

Name the brand colors as objects or light ("tangerine mug", "mint wall") rather than as
hex codes; models follow named things better. Keep people out unless the user supplies
them with consent; avoid recognisable brands, logos and screens with real UI.

## Subjects and cut-outs

The cleanest cut-outs come from a subject on a plain, evenly lit grey backdrop with
space around it. Mascots, products, objects and food cut out well; hair and glass are
harder. If the user has a product photo, use `removeBackground: true` in the spec instead
of generating a new one. A brand mascot is used as supplied, never regenerated.

## Without a PopNow key

Tell the user they can create a key at https://popnow.ai/api/console/keys, then deliver
anyway: `bold-sans` (flat field), `minimal-mono`, `data-callout` and `editorial-serif`
without a plate need no pictures; `split-photo` and `sticker-collage` draw pattern
placeholders until real pictures exist, and the user's own photos or screenshots can go
into `images` at any time.
