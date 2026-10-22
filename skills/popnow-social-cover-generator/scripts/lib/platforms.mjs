// Platform presets: pixel size, safe margins, reserved zones, file budgets and copy limits.
// Sizes and limits were checked against each platform's help pages and common practice in
// October 2026; platforms change them, so references/platforms.md lists what to re-check.
//
// safe:     margins (px) that keep text clear of crops, rounded corners and UI overlays.
// reserve:  rectangles (px) where the platform draws over the image; no text may enter.
// info:     crop guides drawn in the overlay only (not enforced).
// budget:   soft file-size target in bytes (warning above it).
// limit:    hard upload limit in bytes where one is published (error above it).
// minText:  smallest text size (px) that still reads at the size the image is usually shown.
// titleWords: soft cap on headline words for this placement.
// drop:     copy fields left out here unless the output sets them itself (a URL on a video
//           thumbnail only collides with the duration badge).

export const PLATFORMS = {
  og: {
    label: "Open Graph link preview",
    width: 1200, height: 630,
    safe: { top: 56, right: 64, bottom: 56, left: 64 },
    info: [{ name: "square crop in small previews", x: 285, y: 0, w: 630, h: 630 }],
    budget: 600 * 1024, limit: 5 * 1024 * 1024,
    minText: 24, titleWords: 12,
    formats: ["png", "webp"],
  },
  x: {
    label: "X post image",
    width: 1600, height: 900,
    safe: { top: 64, right: 72, bottom: 64, left: 72 },
    info: [],
    budget: 1024 * 1024, limit: 5 * 1024 * 1024,
    minText: 30, titleWords: 12,
    formats: ["png", "webp"],
  },
  linkedin: {
    label: "LinkedIn shared image",
    width: 1200, height: 627,
    safe: { top: 56, right: 64, bottom: 56, left: 64 },
    info: [],
    budget: 1024 * 1024, limit: 5 * 1024 * 1024,
    minText: 24, titleWords: 12,
    formats: ["png", "webp"],
  },
  rednote: {
    label: "RedNote (Xiaohongshu) cover",
    width: 1080, height: 1440,
    safe: { top: 80, right: 72, bottom: 150, left: 72 },
    info: [{ name: "page dots and like bar in note view", x: 0, y: 1330, w: 1080, h: 110 }],
    budget: 2 * 1024 * 1024, limit: null,
    minText: 32, titleWords: 14,
    formats: ["png", "webp"],
  },
  youtube: {
    label: "YouTube thumbnail",
    width: 1280, height: 720,
    safe: { top: 48, right: 56, bottom: 48, left: 56 },
    reserve: [{ name: "duration badge", x: 1050, y: 610, w: 230, h: 110 }],
    info: [{ name: "progress bar on hover", x: 0, y: 700, w: 1280, h: 20 }],
    budget: 1536 * 1024, limit: 2 * 1024 * 1024,
    minText: 40, titleWords: 6,
    drop: ["cta", "caption"],
    formats: ["png", "webp"],
  },
  instagram: {
    label: "Instagram portrait post",
    width: 1080, height: 1350,
    safe: { top: 72, right: 84, bottom: 72, left: 84 },
    info: [{ name: "3:4 profile grid crop", x: 34, y: 0, w: 1012, h: 1350 }],
    budget: 1536 * 1024, limit: 8 * 1024 * 1024,
    minText: 32, titleWords: 12,
    formats: ["png", "webp"],
  },
  appstore: {
    label: "App Store screenshot, 6.9-inch iPhone",
    width: 1290, height: 2796,
    safe: { top: 140, right: 96, bottom: 96, left: 96 },
    info: [],
    budget: 4 * 1024 * 1024, limit: null,
    minText: 48, titleWords: 8,
    formats: ["jpeg", "png"],
    optional: true,
  },
  square: {
    label: "Square post",
    width: 1080, height: 1080,
    safe: { top: 72, right: 72, bottom: 72, left: 72 },
    info: [],
    budget: 1536 * 1024, limit: 8 * 1024 * 1024,
    minText: 30, titleWords: 12,
    formats: ["png", "webp"],
    optional: true,
  },
};

export const DEFAULT_SET = ["og", "x", "linkedin", "rednote", "youtube", "instagram"];

export function shapeOf(width, height) {
  const r = width / height;
  if (r >= 1.2) return "landscape";
  if (r >= 0.6) return "portrait";
  return "tall";
}

export const SHAPE_ASPECT = { landscape: "16:9", portrait: "3:4", tall: "9:16" };
