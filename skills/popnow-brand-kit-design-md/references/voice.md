# Voice and tone

Voice is how the brand always sounds; tone is how much of it shows in a given moment (calmer in an
error, warmer in a welcome). Write it so another agent can produce on-brand copy without asking.

## Attributes

Three or four adjectives from the brief, each turned into a behaviour:

| Attribute | Means | Does not mean |
| --- | --- | --- |
| Calm | short sentences, no exclamation marks, facts first | cold or terse |
| Warm | second person, acknowledges effort | cute, slangy, emoji |
| Lucid | one idea per sentence, concrete nouns, real numbers | simplistic |

Put the behaviours in the Voice & Tone prose and the adjectives in `brand.voice.attributes`.

## Do / don't pairs

At least three pairs (the linter requires `do` and `dont` lists of 3+). Each `do` is a real string
the product could ship (a confirmation, an empty state, an error, a headline); each `dont` is the
generic version it replaces. Cover different moments, not three headlines.

Phrases that make copy sound generated, and are almost always a `dont`: "supercharge", "unlock",
"revolutionize", "seamless", "effortless", "next-level", "elevate", "empower", "game-changer",
"in today's fast-paced world", "Oops!", rhetorical questions in headlines, and three-item lists of
abstract nouns.

## Words

`brand.voice.words.use` and `.avoid`: product nouns and verbs to use consistently ("note", not
"page", "doc" and "card" in turn), and the words above to keep out.

## Samples (used by the board mockups)

```yaml
brand:
  voice:
    samples:
      headline: Your notes, with the lights on.
      body: One sentence that explains the product plainly.
      cta: New note
      appTitle: Today
      search: Search notes
      listItems:
        - Three short item titles
        - for the app screen
        - mockup
      listExcerpts:
        - One line under each item.
        - Put the highlight phrase in one of them.
        - Keep them plausible, not real.
      highlight: phrase to highlight
      social: A social post line in the brand voice.
      socialKicker: Brand name or a short label
      sign: Short wayfinding text
```

Samples must not invent customers, quotes, metrics, prices or awards. Placeholder people are
"Your Name"; addresses use `.example` domains.
