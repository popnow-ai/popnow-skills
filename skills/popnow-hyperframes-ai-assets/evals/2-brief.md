# Eval 2: one film, voiceover in four languages

## Brief

> Same 30-second explainer, but we need English, German, Japanese and Brazilian Portuguese versions of
> the voiceover. Scripts are in `script/*.txt`. Same voice feel in all four. Keep the music.

## Without the skill: what agents usually do

- Feed all four scripts to one speech request, or translate the English script on the fly and never
  show the user the translations.
- Pick a different voice per language, so the four cuts sound like four products.
- Name files `output1.wav` ... with no language, in a random folder, so nobody can tell which is which.
- Place every language on the English timing; German runs long and collides with the next beat.
- Give no idea of cost until it is spent.

## With the skill

| Problem | What prevents it |
| --- | --- |
| Mixed or unreviewed languages | One `voice` item per language, `text` taken from the user's script files, `lang` set (prompts.md, plan-format.md) |
| Inconsistent voice | Same `voice` and `set.style` on every item; the table in prompts.md lists the voices |
| Unclear files | Files land as `assets/voice/vo-en.wav`, `vo-de.wav`, `vo-ja.wav`, `vo-pt-br.wav`; each is recorded with its language |
| Timing per language | placing-assets.md: `npx hyperframes transcribe` per file, boundaries set per cut |
| Cost unknown | The dry run estimates per second of speech; `--quote` gives the exact total before anything runs |
| Long scripts | Validation stops text over 5,000 characters and suggests splitting by beat |

## Acceptance checklist

- [ ] Four `voice` items with the user's own text, `lang` of `en`, `de`, `ja`, `pt-BR`, same voice and style.
- [ ] The Japanese script is sent as written (no romanisation); brand names spelled the way they are said.
- [ ] Dry run and quote shown; the user agreed to the total.
- [ ] Four files in `assets/voice/`, four records in `.media/manifest.jsonl`, four entries in the
      provenance file with `lang`.
- [ ] Each cut is timed from its own transcript; no line crosses into the next beat.
- [ ] The music bed is reused, not regenerated (no new `bgm` item).
- [ ] The handoff says which languages a native speaker has not listened to.
