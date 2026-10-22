# Eval 1: fill a silent film's placeholders

## Brief

> My HyperFrames film in `./launch` is 28 seconds, silent, and beat 1 still shows a grey box labelled
> "hero image". Give it a real hero shot that moves a little, a music bed and an English voiceover for
> the first and last lines. Tell me what it costs first. My budget is about 400 credits.

The project already has `assets/images/hero.png` (the user's old screenshot, which they want to keep)
and a `.media/manifest.jsonl` with two records from an earlier media-use session.

## Without the skill: what agents usually do

- Pull a stock photo URL or leave the grey box, because the host agent cannot make pictures.
- Generate straight away with no total shown, or quote item by item and lose track of the sum.
- Save `hero.png` over the user's screenshot.
- Drop files in a new `media/` folder the HyperFrames media tools do not know about, or append
  hand-written lines to `.media/manifest.jsonl` that reuse an existing id or break its format.
- Animate the still by generating a second unrelated clip, so frame 1 and the moving shot do not match.
- Retry a failed video job on its own, paying twice.

## With the skill

| Problem | What prevents it |
| --- | --- |
| No picture or a stock picture | Plan item `kind: image` with `google/nano-banana-2.1/text-to-image`, prompt in the film's palette (prompts.md) |
| Moving shot that does not match the still | `kind: video`, `minimax/h3/image-to-video`, `"image": "@hero"`: the approved still is animated |
| Cost unknown | `--dry-run` estimate, then `--quote` total and balance; nothing runs without `--confirm-credits <total>` |
| Over budget mid-run | The dependent clip is re-quoted before it runs; the run stops rather than pass the confirmed total |
| Overwritten user file | Never overwrites: the new still becomes `assets/images/hero-2.png` |
| Ledger damage | Records appended in media-use's format under its lock, next free ids, index regenerated (ledger.md) |
| Paid retry | Failed tasks are reported, not retried; dependents are skipped |

## Acceptance checklist

- [ ] `assets.plan.json` has four items (still, image-to-video from `@`the still, bed, voiceover) and
      `--dry-run` passes; the estimate is shown before any quote (about 48 + 185 + 72 + 3 = 308 credits).
- [ ] The user saw the quoted total and balance and said yes before `--confirm-credits`.
- [ ] `assets/images/hero.png` is unchanged; the new still has its own name.
- [ ] `.media/manifest.jsonl` keeps its original lines byte for byte and gains one record per file,
      source `generated`, provider `popnow`, with unique ids.
- [ ] `npx hyperframes media-use resolve --type image --intent "<the prompt>" --candidates --project .`
      lists the new still.
- [ ] `assets/popnow-provenance.json` has prompt, model, task id, credits and licence note for each file.
- [ ] The composition places the clip muted, the bed ducked under the voice, and `npx hyperframes check`
      passes.
