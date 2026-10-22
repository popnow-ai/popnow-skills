# Evals

Each brief is run twice with the same agent and model: once without this skill installed, once with
it. Score both against the shared checklist below and the brief's own list. A brief passes when the
with-skill run meets every "must" and the difference from the without-skill run is visible in the
render, not only in the files.

| Brief | Source | Style | Language | Length | Tests |
| --- | --- | --- | --- | --- | --- |
| `1-brief.md` | Topic | paper-collage | en | 60 s | Pace, approval gate, caption sync, sourced numbers |
| `2-brief.md` | Article | whiteboard | de | 90 s | Language rate, long German words in captions, transcript alignment |
| `3-brief.md` | Dataset (CSV) | data-story | zh-CN | 120 s | Chart honesty, timing without a transcript, Chinese captions, music ducking |
| `4-brief.md` | Product note | any | en | 60 s lite | Lite mode, cost, no key fallback |

How to run without spending credits: stop each run at the voice step and score the plan, storyboard,
contact sheet, captions (from rate-based timing) and silent render. Score the audio items on a run
where the user approves the quotes, or against the sample video at
https://popnow.ai/skills/narrated-explainer.

## Shared acceptance checklist

Must:

- [ ] Asked for (or read) language, length, style and canvas; read `DESIGN.md` if present.
- [ ] Every number and claim is in `sources.json` with a source the agent opened or the user gave;
      the end card lists the sources.
- [ ] Script planned with `plan`: total length inside the target band, no chapter over 30 s.
- [ ] A 6-9 frame contact sheet and the script were shown and approved before any paid call.
- [ ] Every paid call was quoted first, the credits and balance were stated, and `create` ran only
      after an explicit yes. No automatic retry after a failure.
- [ ] Word timing came from the real voiceover (`align` or `estimate --audio`), not from a rate.
- [ ] Captions are generated from that timing; QA `caption-sync` passes (within 150 ms).
- [ ] Scene beats are anchored to phrases in `storyboard.json`; no times typed into the build script.
- [ ] `qa` passes with no FAIL on the render, including loudness (-16 LUFS +/- 1) and dead air.
- [ ] Only preset voices or the user's own voice; no generated likeness of a real person; no logos
      the user does not own.

Should:

- [ ] Three voices offered, with an audition on request.
- [ ] Every beat lands on the word it illustrates (check three beats by eye in the render).
- [ ] Visual change at least every 6 s; no idle wobble.
- [ ] Handoff note with models, credits, timing source, sources and the QA summary.

## Typical without-skill failures (seen across briefs)

- Script written for reading: 190-230 words a minute, long sentences, numbers with no source.
- Scenes on a fixed grid (every 5 s) that drift away from the voice by the second chapter.
- Captions dumped as one paragraph per scene, or made from the script with even spacing.
- Voice generated before anyone saw the plan; a script change means paying for all of it again.
- Music at the same level as the voice, or a hard cut at the end; no loudness target.
- Generated images with garbled words in them; charts drawn as pictures with invented numbers.
