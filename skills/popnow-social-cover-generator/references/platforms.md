# Platform presets

The presets live in `scripts/lib/platforms.mjs`. Values were checked in October 2026;
platforms change their crops and limits, so re-check the help page of any platform you
publish to often and adjust the preset (or override per output in the spec).

| id | Size (px) | Safe margins t/r/b/l | Reserved or guides | Budget / hard limit | Min text | Title words |
| --- | --- | --- | --- | --- | --- | --- |
| `og` | 1200 x 630 | 56 / 64 / 56 / 64 | guide: centered 630 x 630 square (some chat apps crop small previews to a square) | 600 KB / 5 MB | 24 | 12 |
| `x` | 1600 x 900 | 64 / 72 / 64 / 72 | none | 1 MB / 5 MB | 30 | 12 |
| `linkedin` | 1200 x 627 | 56 / 64 / 56 / 64 | none | 1 MB / 5 MB | 24 | 12 |
| `rednote` | 1080 x 1440 (3:4) | 80 / 72 / 150 / 72 | guide: bottom 110 px holds page dots and the like bar in note view | 2 MB / none set | 32 | 14 |
| `youtube` | 1280 x 720 | 48 / 56 / 48 / 56 | **reserved**: duration badge, bottom-right 230 x 110; guide: progress bar on hover | 1.5 MB / 2 MB | 40 | 6 |
| `instagram` | 1080 x 1350 (4:5) | 72 / 84 / 72 / 84 | guide: 3:4 profile-grid crop, 1012 px wide centered | 1.5 MB / 8 MB | 32 | 12 |
| `appstore` (optional) | 1290 x 2796 | 140 / 96 / 96 / 96 | none | 4 MB / none set | 48 | 8 |
| `square` (optional) | 1080 x 1080 | 72 on all sides | none | 1.5 MB / 8 MB | 30 | 12 |

What the columns mean:

- **Safe margins**: all text must sit inside them. Pictures may bleed to the edge.
- **Reserved**: the platform draws over this area; the renderer fails any text that
  touches it. YouTube also drops `cta` and `caption` from shared copy, because a URL on a
  thumbnail only collides with the duration badge (set them on the output to override).
- **Guides**: drawn in the review overlay only, to show crops.
- **Budget**: a warning above it (faster unfurls and uploads). **Hard limit**: an error
  above it; when a PNG goes over, the renderer also writes a JPEG to upload instead.
- **Min text**: the smallest body text in pixels that still reads at the size the image is
  usually shown (feeds show a 1200 px OG image at roughly 500 px). Titles must be at
  least twice this, small labels at least three quarters of it.
- **Title words**: a soft cap; thumbnails read best at six words or fewer.

## Notes per platform

- **Open Graph** (`og:image`): also used by most chat apps and many link previewers.
  Give `og:image:width` and `og:image:height` in the page head. Use the PNG or JPEG for
  the tag; not every crawler accepts WebP.
- **X**: a single image in a post shows close to 16:9 in the timeline. For link cards,
  X reads the page's Open Graph image, so the `og` output covers that case.
- **LinkedIn**: 1200 x 627 is the shared-link and single-image size.
- **RedNote (Xiaohongshu)**: covers are 3:4 in the feed; keep the title in the upper two
  thirds so it reads in the two-column grid.
- **YouTube**: upload JPEG or PNG under 2 MB. Test legibility at 168 x 94 (mobile list):
  the review overlay plus the 6-word cap keeps titles readable there.
- **Instagram**: 4:5 posts are cropped to 3:4 in the profile grid, which trims about
  34 px from each side; the side margins already allow for it.
- **App Store**: 1290 x 2796 is an accepted size for the 6.9-inch iPhone slot
  (1320 x 2868 is the other). Screenshots must not have transparency; the default format
  is JPEG and the renderer's PNGs are written without an alpha channel. Show real app
  screens; marketing text above the device is allowed, made-up features are not.

## Custom sizes

Any output can set `width` and `height` with `platform` left out or unknown, plus `safe`,
to get a one-off size (for example a 1500 x 500 header). Or copy an entry in
`platforms.mjs` and give it a new id.
