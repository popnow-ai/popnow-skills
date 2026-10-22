# Art directions

A direction is a complete visual position: palette, type pairing, layout habit, kind of
imagery and the details that are off limits. The data lives in `directions.json`; the
prompt builder reads it. This file explains how to choose and present them.

## The library

| id | Feels like | Type | Value | Layout | Imagery | Good for |
| --- | --- | --- | --- | --- | --- | --- |
| `warm-editorial` | a well-made magazine | serif | light | editorial | photo | writing, notes, education, craft, consumer apps |
| `swiss-grid` | a precise annual report | grotesk | light | grid | product UI | B2B, analytics, finance, design tools |
| `dark-instrument` | a calm control room | mono | dark | canvas | product UI | developer tools, infrastructure, security, data |
| `color-block` | a gig poster | condensed | color | bands | flat illustration | community, events, food, young consumer |
| `soft-photographic` | a good travel guide | humanist | light | bands | documentary photo | services, health, home, hospitality |
| `paper-collage` | a scrapbook on a desk | serif | light | collage | paper and tape | education, journaling, nonprofits, kids |
| `mono-document` | a tidy README | mono | light | gallery | code and diagrams | CLIs, APIs, open source, privacy tools |
| `studio-product` | a product launch film still | grotesk | color | canvas | studio render | hardware, devices, physical goods |
| `type-led` | a manifesto | grotesk | dark | bands | none | launches, agencies, newsletters, media |
| `ink-lamplight` | reading at night | serif | dark | gallery | low-light photo | focus, reading, audio, journaling |

## Picking two or three

1. Filter by the brief's `kind` (`software`, `physical`, `service`, `content`, `event`).
   A note-taking app never gets the studio-product direction; a speaker can.
2. Rank by fit with the brief's tone, category and keywords.
3. Keep the set wide: every pair must differ on at least two of the four axes
   (type, value, layout, imagery). Three light, serif, photo-led options are one option
   in three colors. `scripts/mockup-prompts.mjs` enforces this and prints the axis
   distance for each pair.
4. One direction can be safe, one should stretch. Users often pick the stretch once they
   see it next to the safe one.
5. Honor `brief.directions` (forced picks) and `brief.avoidDirections`.

## With a DESIGN.md

When the project has a `DESIGN.md`, its colors and fonts are fixed. The directions still
differ in layout, imagery, density and rhythm, and the prompt says the brand colors win
where they conflict with the direction's palette. Tell the user that the three options
share their brand palette on purpose.

## Presenting the choice

Show the three mockups side by side (or one after another) with three lines each:

- **What it is**: the direction name and one sentence on the feeling.
- **What it costs later**: imagery that must be generated or shot for real (photo
  directions need real or generated photos; type-led needs none).
- **Risk**: the honest weak spot (for example, "dark pages read as technical; may feel
  cold to families").

Ask the user to pick one, or to combine parts ("hero from B, pricing from A"). A combined
pick is fine: note which sections come from which mockup and use both as references in
the build. Do not average three directions into a fourth; that is how pages lose their
point of view.

## Adding a direction

Add an entry to `directions.json` with every field filled (the self-test checks this and
requires ink-on-background contrast of at least 7:1). Name it by what it looks like, not
by a company or product whose look it copies.
