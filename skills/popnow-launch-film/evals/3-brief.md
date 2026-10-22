# Eval 3: lite mode on a small budget

## Brief

> Quick one: 20-second vertical teaser for our habit-tracker app's new streaks feature, for Reels.
> Screenshots are in `./screens`. Keep the cost tiny. No voice.

## Without the skill: what agents usually do

- Generate several AI B-roll clips "for energy", spending hundreds of credits nobody approved.
- Ignore the screenshots and draw an imaginary app, or stretch the screenshots to fill 9:16.
- Put the headline in the bottom fifth, under the caption and buttons.
- Use a track whose loudest moment lands nowhere near a cut, mixed at -9 LUFS so it distorts on phones.
- Spend a long session polishing motion before anyone has seen a frame.

## With the skill

| Problem | What prevents it |
| --- | --- |
| Unapproved spend | Lite mode: no generated footage; one music bed (~72 credits) after a quote and a yes, or the user's own track |
| Imaginary app | composition.md: product moments use the product's real screens; screenshots placed at their own ratio inside the vertical layout |
| Covered headline | `vertical` preset safe area (260 px top, 440 px bottom, 120 px right); `frame-audit.mjs --preset vertical` |
| Music off the cuts, too loud | `npx hyperframes beats` for the grid; `mix.mjs` levels and normalises to -16 LUFS, true peak under -1.5 dBTP |
| Long sessions | Five beats, one preset, a six-frame contact sheet approved first |

## Acceptance checklist

- [ ] Five beats in 20 s (hook, problem line, two moments using the real screens, CTA); `plan-film.mjs`
      passes for `vertical`.
- [ ] Credits proposed before anything was generated: about 72 for a bed, nothing else; or zero with the
      user's track.
- [ ] The six-frame contact sheet was approved before rendering.
- [ ] Screenshots keep their aspect ratio; no invented interface.
- [ ] `frame-audit.mjs --preset vertical` passes at every key frame.
- [ ] `qa-check.mjs --preset vertical` passes: 1080x1920, 20 s, -16 LUFS within 1 LU, no unmarked hold.
- [ ] No voiceover; the film reads fully with the sound off.
