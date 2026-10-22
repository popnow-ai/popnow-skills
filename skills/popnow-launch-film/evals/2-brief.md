# Eval 2: an open-source CLI from its README, in two languages

## Brief

> Make a ~25 s launch film for our CLI from `./README.md`. It should end on the install command.
> English voiceover, and a German version for our Berlin meetup.

## Without the skill: what agents usually do

- Pick an install command that is not the one in the README (or invent a flag), so the film's only
  instruction does not work.
- Write voiceover that runs 2.7 words a second over a 3-second beat; the German read is a third longer
  and spills into the next scene.
- Show terminal output at 14 px in a 1920 px frame, unreadable on a phone.
- Recreate a well-known editor's interface, wordmark included, to show "it works in your editor".
- Keep the English on-screen text in the German cut, or overflow German lines past the frame edge.

## With the skill

| Problem | What prevents it |
| --- | --- |
| Wrong command | `read-product.mjs` extracts install commands from the README's shell blocks and `package.json`; the CTA cites that fact; qa.md says run it |
| Voice over-runs | `plan-film.mjs` checks each beat's line at about 2.7 words a second; sound-mix.md: one file per line, one timing pass per language |
| Tiny terminal text | composition.md type tiers; `frame-audit.mjs` flags `data-qa="ui"` text under 60 % of the copy minimum |
| Third-party interface | composition.md and Content rules: neutral originals for tools the user does not own |
| German overflow | Line limits per preset and `\n` breaks in `beats.json`; `frame-audit.mjs` flags text crossing the safe area or canvas |

## Acceptance checklist

- [ ] The CTA is the README's install command, character for character, and it was run once.
- [ ] `plan-film.mjs` passes for the English and the German beat sheets (two `beats.json` files, same
      timing, translated `onScreen` and `voice`).
- [ ] Voiceover items `vo-*-en` and `vo-*-de` quoted together; the user agreed; each line sits inside its
      beat in the mixed film.
- [ ] Terminal text meets the UI minimum at every key frame (`frame-audit.mjs`).
- [ ] No third-party wordmark or recognisable proprietary interface in any frame.
- [ ] Both MP4s pass `qa-check.mjs`; the German cut's text is German and inside the safe area.
- [ ] Runtime 20-28 s; the end card holds at least 2.5 s and is marked in `holds`.
