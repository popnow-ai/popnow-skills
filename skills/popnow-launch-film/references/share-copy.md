# The posting kit

The film gets posted with words around it. Write them in `film/share.json`; `share-kit.mjs` checks them
and writes `share/share.md` with a thumbnail.

```json
{
  "url": "https://example.com/launch",
  "x": "post text",
  "linkedin": "post text",
  "alt": "One or two sentences on what the video shows"
}
```

## X

- 280 weighted characters; a link counts as 23 whatever its length, wide characters (Chinese,
  Japanese, Korean) and emoji count as 2. Leave about 20 spare for quote posts.
- First line: the change for the reader, in the film's hook words or close to them.
- Second paragraph: what it is and the one thing that makes it different, from the facts.
- The link last. Zero to two hashtags.

```
You shipped it. Now the launch needs a deck, a site, a video and images.

PopNow Agent Skills let your coding agent make them, with pictures, footage, music and voice from
PopNow, quoted before you spend.

https://popnow.ai/skills
```

## LinkedIn

- Up to 3,000 characters, but the feed shows roughly the first 140-210 before "see more": the
  opening line carries the post.
- Three short paragraphs: the pain or result, how it works (two or three concrete steps), what is
  different. Then the link. Up to three hashtags.
- Plain sentences. No "We're thrilled to announce", no hype words, no emoji bullets.

## Alt text

Describe what the film shows, in order, in one or two sentences, including the on-screen call to
action. It helps people using screen readers and it is checked for presence and length.

## Thumbnail

Pick the hook's key frame (the hook line is on screen and the picture is settled):
`node scripts/share-kit.mjs --video renders/film-wide-mixed.mp4 --at 2.4 --copy film/share.json --out share/`.
It writes `thumbnail.jpg` at full size and `thumbnail-small.jpg` at 1280 wide.

## Posting notes

- Upload the MP4 itself; native video autoplays muted in both feeds.
- The vertical cut goes to short-video apps; the wide or square cut to LinkedIn and X.
- Set the thumbnail where the platform allows it, and add the alt text.
- Every claim in the post is a fact the film already uses. If it is not in `product.json` or
  `userFacts`, it is not in the post.
