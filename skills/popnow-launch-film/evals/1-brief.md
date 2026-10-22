# Eval 1: a SaaS launch from its landing page

## Brief

> We launch our scheduling app on Tuesday. Here's the site: https://<the user's product site>.
> Make a 30-second launch video for LinkedIn and X, plus a vertical one for Reels. Make it look
> premium. Add music.

## Without the skill: what agents usually do

- Invent proof: "Trusted by 10,000 teams", "3x faster", a row of customer logos, a five-star quote.
- Default look: purple-to-blue gradient, glass cards floating and bobbing, a spinning 3D logo,
  "Introducing <Name>" as the opening title, three feature cards.
- Render straight to MP4 with no review step, then rework everything after the user objects.
- Make the vertical version by cropping the wide film, so headlines fall under the platform's caption
  bar and side buttons.
- A whoosh on every cut and a generic track at whatever level it came, peaking above 0 dBTP; or no
  sound at all.
- The end card fades out after 1 s; the URL is never readable. Or the film freezes for three seconds in
  the middle.
- No post copy, or a post that opens "We're thrilled to announce...".

## With the skill

| Problem | What prevents it |
| --- | --- |
| Invented proof | `read-product.mjs` lists facts with their source line; `plan-film.mjs` refuses any number or proof without a cited fact |
| Generic look | Brand from `DESIGN.md` or the site's own CSS (`product.json` brand hints); beat-sheet.md's list of generated-reel patterns to avoid |
| No review | Contact sheet of 6-9 key frames approved before motion, render or credits (workflow step 4) |
| Cropped vertical | Presets laid out separately; copy inside `.safe` from `presets.css`; `frame-audit.mjs --preset vertical` checks the 260/440 px margins |
| Audio | Original bed (quoted), levelled and ducked by `mix.mjs`, -16 LUFS, peaks under -1.5 dBTP; sound-mix.md limits effects |
| Unreadable CTA, freezes | CTA at least 2.5 s (`plan-film.mjs`), end card marked as a hold; `qa-check.mjs` flags any other still stretch over 1.2 s |
| Post copy | `share-kit.mjs` checks X length (links count 23), LinkedIn hook length, self-centred openers, hype words, alt text |

## Acceptance checklist

- [ ] `film/product.json` exists; every on-screen number and claim cites a fact id in `beats.json`.
- [ ] Beats in order hook, problem, 2-3 moments, proof, CTA; `plan-film.mjs` passes for `wide`,
      `vertical`, `square`.
- [ ] The user approved a contact sheet before rendering and before any paid generation.
- [ ] Any PopNow item was quoted and confirmed; credits charged are in the handoff.
- [ ] `renders/film-wide-mixed.mp4` and `film-vertical-mixed.mp4` pass `qa-check.mjs` (runtime, opening
      frame, holds, -16 LUFS within 1 LU, true peak at or below -1 dBTP).
- [ ] `frame-audit.mjs` passes at every key frame for both presets.
- [ ] No gradient-and-glass default look, no spinning logo, no "Introducing" opener, no effect on every cut.
- [ ] `share/share.md` with an X post under 280, a LinkedIn post, alt text and a thumbnail from the hook.
