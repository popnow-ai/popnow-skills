// Reads a project's DESIGN.md (the token-front-matter + prose format, or a loose
// markdown style guide) and returns the parts this skill needs:
//   { found, path, name, colors, roles: { bg, surface, ink, muted, accent, accentInk, line },
//     fonts: { display, text, mono }, radius, dos, donts, voice }
// No dependencies. The YAML reader covers the subset DESIGN.md files use
// (nested maps by indentation, scalars, quoted strings, inline [a, b] lists).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findDesignMd(start = process.cwd()) {
  let dir = resolve(start);
  for (let i = 0; i < 6; i++) {
    for (const name of ["DESIGN.md", "design.md", "docs/DESIGN.md"]) {
      const p = join(dir, name);
      if (existsSync(p)) return p;
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

export function readDesignMd(path) {
  if (!path || !existsSync(path)) return { found: false, path: null, colors: {}, roles: {}, fonts: {}, dos: [], donts: [], voice: [] };
  return parseDesignMd(readFileSync(path, "utf8"), path);
}

export function parseDesignMd(text, path = null) {
  const out = { found: true, path, name: null, colors: {}, roles: {}, fonts: {}, radius: null, dos: [], donts: [], voice: [] };
  let body = text;
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  let tokens = {};
  if (fm) {
    tokens = parseYamlSubset(fm[1]);
    body = text.slice(fm[0].length);
  }
  out.name = typeof tokens.name === "string" ? tokens.name : (/^#\s+(.+)$/m.exec(body) || [])[1] || null;

  // Colors: front matter first, then "name: #hex" / table rows / bullets in the prose.
  const colors = {};
  if (tokens.colors && typeof tokens.colors === "object") {
    for (const [k, v] of Object.entries(tokens.colors)) if (typeof v === "string") colors[k] = v;
  }
  const colorLine = /(?:^|\n)\s*(?:[-*]\s*)?(?:\|\s*)?\**`?([A-Za-z][\w /&().-]{0,40}?)`?\**\s*(?:[:=|]|\s-\s|\s—\s)\s*`?(#[0-9a-fA-F]{3,8}|oklch\([^)]*\)|rgba?\([^)]*\))`?/g;
  for (const m of body.matchAll(colorLine)) {
    const key = m[1].trim().toLowerCase().replace(/\s+/g, "-");
    if (!colors[key]) colors[key] = m[2];
  }
  const resolveRef = (v, depth = 0) => {
    if (typeof v !== "string" || depth > 5) return v;
    const ref = /^\{([\w.-]+)\}$/.exec(v.trim());
    if (!ref) return v;
    const val = ref[1].split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), tokens);
    return resolveRef(val, depth + 1);
  };
  for (const k of Object.keys(colors)) colors[k] = resolveRef(colors[k]);
  out.colors = colors;
  out.roles = inferRoles(colors);

  // Fonts: typography tokens, then prose like "Display: Fraunces" or "font-family: X".
  const fonts = {};
  if (tokens.typography && typeof tokens.typography === "object") {
    for (const [k, v] of Object.entries(tokens.typography)) {
      const fam = typeof v === "object" && v ? resolveRef(v.fontFamily) : null;
      if (!fam) continue;
      const key = k.toLowerCase();
      if (!fonts.display && /display|headline|heading|h1|title|hero/.test(key)) {
        fonts.display = fam;
        if (v.fontWeight != null) fonts.displayWeight = Number(resolveRef(v.fontWeight)) || null;
      }
      else if (!fonts.mono && /mono|code/.test(key)) fonts.mono = fam;
      else if (!fonts.text && /body|text|paragraph|copy/.test(key)) fonts.text = fam;
    }
  }
  const fontLine = /(?:^|\n)\s*(?:[-*]\s*)?\**(display|headings?|headline|body|text|mono|code)(?:\s+font)?\**\s*[:=—-]\s*`?["']?([A-Z][\w ]{1,40}?)["']?`?(?=[,;(\n]|\s+-|\s+for|\s*$)/gi;
  for (const m of body.matchAll(fontLine)) {
    const role = m[1].toLowerCase();
    const fam = m[2].trim();
    if (/^(display|headings?|headline)$/.test(role) && !fonts.display) fonts.display = fam;
    else if (/^(body|text)$/.test(role) && !fonts.text) fonts.text = fam;
    else if (/^(mono|code)$/.test(role) && !fonts.mono) fonts.mono = fam;
  }
  out.fonts = fonts;

  if (tokens.rounded && typeof tokens.rounded === "object") {
    const vals = Object.values(tokens.rounded).filter((v) => typeof v === "string");
    out.radius = vals[Math.floor(vals.length / 2)] || null;
  }

  // Do's and don'ts, voice: bullet lists under matching headings.
  const sections = splitSections(body);
  for (const [title, content] of sections) {
    const t = title.toLowerCase();
    const bullets = content.split("\n").map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1]?.trim()).filter(Boolean);
    if (/do'?s and don'?ts|dos and donts/.test(t)) {
      for (const b of bullets) (/^(don'?t|avoid|never|no )/i.test(b) ? out.donts : out.dos).push(b);
    } else if (/^don'?ts?|avoid/.test(t)) out.donts.push(...bullets);
    else if (/^do'?s?$/.test(t)) out.dos.push(...bullets);
    else if (/voice|tone|copy/.test(t)) out.voice.push(...bullets);
  }
  return out;
}

function splitSections(md) {
  const parts = [];
  const re = /^#{2,3}\s+(.+)$/gm;
  let m;
  let last = null;
  while ((m = re.exec(md))) {
    if (last) parts.push([last.title, md.slice(last.end, m.index)]);
    last = { title: m[1].trim(), end: re.lastIndex };
  }
  if (last) parts.push([last.title, md.slice(last.end)]);
  return parts;
}

// ---------- color helpers ----------

export function parseColor(c) {
  if (typeof c !== "string") return null;
  const s = c.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return null;
}

export function luminance({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const ca = typeof a === "string" ? parseColor(a) : a;
  const cb = typeof b === "string" ? parseColor(b) : b;
  if (!ca || !cb) return null;
  const [l1, l2] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function saturation({ r, g, b }) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return max === 0 ? 0 : (max - min) / max;
}

function inferRoles(colors) {
  const entries = Object.entries(colors).map(([k, v]) => ({ k: k.toLowerCase(), v, c: parseColor(v) })).filter((e) => e.c);
  if (!entries.length) return {};
  const byName = (re) => entries.find((e) => re.test(e.k));
  const lum = (e) => luminance(e.c);
  const roles = {};
  const bg = byName(/^(background|bg|canvas|paper|page|base)$|background|paper|canvas/);
  roles.bg = (bg || entries.reduce((a, b) => (lum(b) > lum(a) ? b : a))).v;
  const ink = byName(/^(text|ink|foreground|fg)$|on-background|on-surface|^text|ink|foreground/);
  roles.ink = (ink || entries.reduce((a, b) => (Math.abs(lum(b) - luminance(parseColor(roles.bg))) > Math.abs(lum(a) - luminance(parseColor(roles.bg))) ? b : a))).v;
  const surface = byName(/surface|card|panel|raised/);
  if (surface && surface.v !== roles.ink) roles.surface = surface.v;
  const muted = byName(/muted|secondary-text|subtle|tertiary-text|neutral-6|gray|grey/);
  if (muted) roles.muted = muted.v;
  const line = byName(/line|border|divider|outline|stroke/);
  if (line) roles.line = line.v;
  const accentNamed = ["accent", "brand", "tertiary", "secondary", "primary", "highlight", "cta"]
    .map((n) => entries.find((e) => e.k === n || e.k.startsWith(n + "-") || e.k.endsWith("-" + n)))
    .filter(Boolean)
    .find((e) => saturation(e.c) > 0.3 && e.v !== roles.bg && e.v !== roles.ink);
  const accent = accentNamed || entries.filter((e) => e.v !== roles.bg && e.v !== roles.ink).sort((a, b) => saturation(b.c) - saturation(a.c))[0];
  if (accent) {
    roles.accent = accent.v;
    roles.accentInk = contrast(accent.c, { r: 255, g: 255, b: 255 }) >= contrast(accent.c, { r: 0, g: 0, b: 0 }) ? "#FFFFFF" : "#111111";
  }
  return roles;
}

// ---------- tiny YAML subset ----------

export function parseYamlSubset(src) {
  const root = {};
  const stack = [{ indent: -1, obj: root }];
  for (const raw of src.split(/\r?\n/)) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    const m = /^("?)([^":]+?)\1\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    const key = m[2].trim();
    const rest = m[3].replace(/\s+#.*$/, "").trim();
    if (rest === "" || rest === "|" || rest === ">") {
      parent[key] = {};
      stack.push({ indent, obj: parent[key] });
    } else {
      parent[key] = scalar(rest);
    }
  }
  return root;
}

function scalar(v) {
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(",").map((x) => scalar(x.trim())).filter((x) => x !== "");
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === "true" || v === "false") return v === "true";
  return v;
}
