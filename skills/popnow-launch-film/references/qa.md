# Before anyone posts it

Run the scripts first, then look and listen. A film that passes the scripts can still be wrong; a film
that fails them is wrong for sure.

## Automated

```bash
node scripts/plan-film.mjs film/beats.json                       # beat sheet: facts, timing, readability
node scripts/frame-audit.mjs index.html --storyboard film/storyboard.json --preset wide
npx hyperframes check                                            # lint, layout and contrast audits
node scripts/qa-check.mjs renders/film-wide-mixed.mp4 --preset wide --storyboard film/storyboard.json
node scripts/share-kit.mjs --copy film/share.json                # post copy only
```

| Check | Tool | Pass |
| --- | --- | --- |
| Claims and numbers | `plan-film.mjs` | Every number and every moment/proof cites a fact |
| Line length and reading time | `plan-film.mjs` | No errors; wrap warnings handled with `\n` |
| Voiceover fits its beat | `plan-film.mjs` | No over-runs |
| Copy size | `frame-audit.mjs` | At or above the preset minimum (40 / 46 / 40 px at full size); UI detail at 60 % |
| Safe areas | `frame-audit.mjs` | Readable text inside the preset's safe area at every key frame |
| Nothing cut off | `frame-audit.mjs` | No readable text crossing the canvas edge |
| Contrast | `npx hyperframes check` | 4.5:1 for copy under 24 px equivalent, 3:1 for large headlines |
| Canvas, fps, codec | `qa-check.mjs` | Preset size, 30 fps, H.264 yuv420p, AAC 48 kHz |
| Runtime | `qa-check.mjs` | 20-40 s and within 0.2 s of the storyboard |
| Opening frame | `qa-check.mjs` | Not black: frame 1 shows the hook |
| Static holds | `qa-check.mjs` | None over 1.2 s except holds marked in `beats.json` |
| Loudness and peaks | `qa-check.mjs` | -16 LUFS within 1 LU; true peak at or below -1 dBTP |
| Silence | `qa-check.mjs` | No silent stretch over 1.5 s mid-film unless it is a marked hold |
| Post copy | `share-kit.mjs` | X within 280 (links 23), LinkedIn opening under 150, alt text present |

## Look

Watch the whole film three times: once at full size, once at phone size (about 390 px wide for the
wide cut, full screen for vertical), once with the sound off.

- The first second makes sense with no sound: the hook is on screen in frame 1.
- Each beat has one place to look. If two things move for attention at once, stagger them.
- Every product screen is the product's own (or a neutral original for tools the user does not own).
- Placeholders are gone, or the user knows which remain.
- Generated pictures match the palette and light of the code-drawn frames; no generated text,
  logos or fake interface in them.
- The call to action is readable on a phone and is a URL or command that works. Open or run it.
- Vertical: nothing important in the bottom 440 px or behind the right-hand buttons.
- The film does not look like the generic generated reel: no floating cards on gradients, no spinning
  logo, no camera shake, no idle wobble.

## Listen

- The bed has a shape (sparse, build, lift, ending) and the lift lands on a beat that deserves it.
- Every spoken line is clear over the bed; the bed comes back up after the voice.
- Names are pronounced right. Each language version was listened to by someone who speaks it, or the
  user was told it was not.
- No sound on every cut. No clicks at edits; fades at the start and end of the bed.
- Peaks do not distort on a phone speaker at full volume.

## Facts and rights

- Every claim in the film and the posts is in `product.json` or `userFacts`.
- No invented reviews, customers, logos or awards.
- No real person's face or voice without the user's confirmed right to use it.
- Fonts are licensed for video use (OFL and similar are fine); the music is generated for this
  project or licensed.

## Hand off

The MP4 per preset, `share/`, `film/STORYBOARD.md`, the facts used, credits charged against the
confirmed total, and an honest list of what is still a placeholder.
