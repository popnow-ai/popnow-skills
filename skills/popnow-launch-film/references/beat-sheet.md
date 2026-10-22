# The beat sheet

A launch film is an argument in five moves. Write it as `film/beats.json`, check it with
`node scripts/plan-film.mjs film/beats.json`, and only then design frames.

## The five moves

| Role | Job | Length (30 s film) | Rules |
| --- | --- | --- | --- |
| `hook` | Stop the scroll on frame 1 | 2.5-4 s | Visible from the first frame. The result the viewer wants or the pain they know, never "Introducing" or the company name |
| `problem` | Name the pain in the viewer's words | 3-5 s | Specific and recognisable. Optional for a product people already understand |
| `moment` (2-3) | Show the product doing the thing | 4-6 s each | Real behaviour from `product.json`: an input becomes an output, a click causes a change. Cite the facts it shows |
| `proof` | Why believe it | 3-5 s | Real numbers, real capabilities, a quote you have permission to use. Cite every one |
| `cta` | One next step | 2.5-4 s | A URL or a command that works. Hold still long enough to read; mark the hold |

Timing per preset: `wide` 24-40 s (30 is a good default), `vertical` and `square` 20-30 s. A vertical cut
usually drops the problem beat or merges two moments rather than speeding everything up.

## `beats.json`

```json
{
  "title": "Memoleaf launch",
  "product": "product.json",
  "fps": 30,
  "presets": ["wide", "vertical"],
  "userFacts": [{ "id": "u1", "text": "Notes are ready about a minute after the meeting ends." }],
  "beats": [
    { "id": "hook", "role": "hook", "start": 0, "end": 3.4,
      "onScreen": ["Your meeting ended.", "The notes didn't."],
      "voice": "Your meeting ended. The notes didn't.",
      "visual": "Laptop closing on a messy notepad", "motion": "Second line drops in on the lid close",
      "media": ["hero-desk"], "keyFrames": [2.5] },
    { "id": "m1", "role": "moment", "start": 8, "end": 13.5,
      "onScreen": ["Drop in the memo.", "Get the notes."], "facts": ["f1", "u1"] }
  ],
  "holds": [{ "start": 27.5, "end": 30, "why": "End card: the command must be copyable" }]
}
```

| Field | Meaning |
| --- | --- |
| `product` | Path to `product.json` from `read-product.mjs`, relative to `beats.json` |
| `userFacts` | Facts the user stated that the page does not; give each an id |
| `start`, `end` | Seconds; beats are back to back from 0 |
| `onScreen` | The lines a viewer must read, in order. `\n` marks where a line breaks in narrow presets |
| `voice` | The spoken line for this beat, if any |
| `facts` | Ids of the facts this beat shows or says. Required for `moment` and `proof` |
| `media` | Plan ids of generated or supplied media used here (stills, clips, bed, voice) |
| `keyFrames` | Times for the contact sheet (default: 65 % into the beat). Aim for 6 to 9 in total |
| `holds` | Intentional still stretches longer than 1.2 s, with the reason |

## Writing the lines

- One idea per line, nine words at most (seven is better). Viewers read about three words a second
  while things move; the checker allows 0.5 s plus words / 3 per line.
- Voiceover runs at about 2.5 words a second. If a beat's line does not fit, cut words, do not speed
  up the read. Many launch films only speak on the hook, one moment and the call to action, and let the
  music carry the rest.
- The voice and the screen do not have to say the same words, but they must not compete: when both
  carry text, the screen shows the short form.
- Numbers only from facts. "Thousands of teams" is a number too: if the product page does not say it,
  the film does not.
- No hype words (revolutionary, seamless, effortless, game-changing, next-gen). Say what changes.

## What reads as a real launch (and what reads as a generated reel)

Real launches are specific: the product's own interface, its own words, a concrete before and after,
one call to action. The overused generated reel looks the same whatever it advertises. Avoid:

- floating glass cards drifting on a purple-blue gradient, spinning 3D logos, particle swirls;
- a centred "Introducing X" title followed by three feature cards;
- a whoosh or ding on every cut, camera shake, a beat drop with nothing on screen to justify it;
- invented dashboards with fake numbers, stock "happy team" footage, testimonials nobody gave;
- motion that loops in place (breathing, floating) instead of moving the story on.

Do instead: open on the result or the pain; show the product's real screens (or a faithful HTML
rebuild of them); make each moment a cause and an effect; repeat one visual element across beats
(a to-do card that comes back done, a cursor that carries through cuts) so the film feels designed;
end on one line that tells people what to do.

## Lite version

Five beats in 20 s: hook (3 s), one problem line (3 s), two moments (5 s each), call to action (4 s).
One preset. The checker treats it the same way.

## Key frames and holds

The contact sheet uses each beat's key frames. Put them where the beat is settled (everything in,
nothing mid-move) so the sheet shows the composition the user is approving. Mark the end card as a
hold; anything else that sits still longer than 1.2 s needs motion with a purpose: a staged reveal,
a progress bar, a typed command, a slow push with a reason.
