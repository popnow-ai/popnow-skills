#!/usr/bin/env python3
"""Build clean SVG logo files: outlined wordmarks, lockups and colour variants.

  # outline a word from an open-licensed font file (TTF/OTF; WOFF2 needs `brotli`)
  python3 scripts/wordmark.py text --font fonts/Family.ttf --text "Brand" \
      --axis wght=600 --tracking -12 --kern "Br=-20" --color "#1F1B16" --out brand/assets/logo/wordmark.svg

  # quick preview without fontTools (live <text>; the linter rejects it for delivery)
  python3 scripts/wordmark.py text --draft --family "Family" --text "Brand" --out /tmp/draft.svg

  # symbol + wordmark side by side (or --layout stacked)
  python3 scripts/wordmark.py lockup --symbol symbol.svg --wordmark wordmark.svg --out lockup.svg

  # one-colour and reverse versions
  python3 scripts/wordmark.py recolor wordmark.svg --color "#FFFFFF" --out wordmark-reverse.svg

`text` needs fontTools (BSD/MIT): python3 -m pip install fonttools  (plus brotli for WOFF2).
`lockup` and `recolor` use the standard library only.
"""

import argparse
import os
import re
import sys
from xml.sax.saxutils import escape


def _fmt(x):
    s = "%.1f" % x
    return s[:-2] if s.endswith(".0") else s


def _round_path(d):
    return re.sub(r"-?\d+\.\d+", lambda m: _fmt(float(m.group(0))), d)


def parse_pairs(spec):
    """'Lu=-20,mN=15' -> {('L','u'): -20.0, ...} in 1/1000 em."""
    out = {}
    for item in filter(None, (s.strip() for s in (spec or "").split(","))):
        pair, _, val = item.partition("=")
        if len(pair) != 2 or not val:
            raise SystemExit("--kern items look like 'Lu=-20' (two characters = value in 1/1000 em): %r" % item)
        out[(pair[0], pair[1])] = float(val)
    return out


def gpos_kerning(font):
    """Return kern(left_glyph, right_glyph) -> font units from GPOS 'kern' (pair positioning)."""
    subtables = []
    if "GPOS" in font:
        table = font["GPOS"].table
        idx = set()
        if table.FeatureList:
            for rec in table.FeatureList.FeatureRecord:
                if rec.FeatureTag == "kern":
                    idx.update(rec.Feature.LookupListIndex)
        for li in sorted(idx):
            lookup = table.LookupList.Lookup[li]
            subs = []
            for st in lookup.SubTable:
                kind = lookup.LookupType
                if kind == 9:
                    kind, st = st.ExtensionLookupType, st.ExtSubTable
                if kind == 2:
                    subs.append((st, {g: i for i, g in enumerate(st.Coverage.glyphs)}))
            subtables.append(subs)
    legacy = {}
    if not subtables and "kern" in font:
        for t in font["kern"].kernTables:
            legacy.update(getattr(t, "kernTable", {}))

    def kern(a, b):
        if legacy:
            return legacy.get((a, b), 0)
        total = 0
        for subs in subtables:
            for st, cov in subs:
                if a not in cov:
                    continue
                if st.Format == 1:
                    hit = None
                    for rec in st.PairSet[cov[a]].PairValueRecord:
                        if rec.SecondGlyph == b:
                            hit = rec
                            break
                    if hit is None:
                        continue
                    total += getattr(hit.Value1, "XAdvance", 0) or 0 if hit.Value1 else 0
                    break
                if st.Format == 2:
                    c1 = st.ClassDef1.classDefs.get(a, 0) if st.ClassDef1 else 0
                    c2 = st.ClassDef2.classDefs.get(b, 0) if st.ClassDef2 else 0
                    v = st.Class1Record[c1].Class2Record[c2].Value1
                    total += (getattr(v, "XAdvance", 0) or 0) if v else 0
                    break
        return total

    return kern


def outline_text(a):
    try:
        from fontTools.pens.boundsPen import BoundsPen
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.pens.transformPen import TransformPen
        from fontTools.ttLib import TTFont
    except ImportError:
        print("fontTools is not installed. Run: python3 -m pip install fonttools  (or use --draft for a preview).", file=sys.stderr)
        return 3
    font = TTFont(a.font)
    axes = {}
    for spec in a.axis or []:
        tag, _, val = spec.partition("=")
        axes[tag.strip()] = float(val)
    if "fvar" in font:
        from fontTools.varLib import instancer
        full = {ax.axisTag: axes.get(ax.axisTag, ax.defaultValue) for ax in font["fvar"].axes}
        font = instancer.instantiateVariableFont(font, full, inplace=False)
    elif axes:
        print("Note: %s is not a variable font; --axis ignored." % os.path.basename(a.font), file=sys.stderr)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hmtx = font["hmtx"]
    kern = gpos_kerning(font)
    manual = parse_pairs(a.kern)
    alts = {}
    for spec in a.alt or []:
        ch, _, gname = spec.partition("=")
        if gname not in glyphs:
            print("Glyph %r is not in the font; --alt %s ignored." % (gname, spec), file=sys.stderr)
            continue
        alts[ch] = gname
    scale = 100.0 / upm  # 100 units = 1 em in the output
    ascent = font["hhea"].ascent
    x = 0.0
    pieces = []
    bounds = None
    chars = list(a.text)
    names = []
    for ch in chars:
        g = alts.get(ch) or cmap.get(ord(ch))
        if g is None:
            print("The font has no glyph for %r." % ch, file=sys.stderr)
            return 2
        names.append(g)
    for i, (ch, g) in enumerate(zip(chars, names)):
        pen = SVGPathPen(glyphs)
        bp = BoundsPen(glyphs)
        t = (scale, 0, 0, -scale, x * scale, ascent * scale)
        glyphs[g].draw(TransformPen(pen, t))
        glyphs[g].draw(TransformPen(bp, t))
        d = pen.getCommands()
        if d:
            pieces.append(d)
        if bp.bounds:
            bx = bp.bounds
            bounds = bx if bounds is None else (min(bounds[0], bx[0]), min(bounds[1], bx[1]), max(bounds[2], bx[2]), max(bounds[3], bx[3]))
        adv = hmtx[g][0]
        if i + 1 < len(chars):
            adv += kern(g, names[i + 1])
            adv += manual.get((ch, chars[i + 1]), 0) * upm / 1000.0
            adv += a.tracking * upm / 1000.0
        x += adv
    if bounds is None:
        print("Nothing to draw.", file=sys.stderr)
        return 2
    pad = a.pad
    vx, vy = bounds[0] - pad, bounds[1] - pad
    vw, vh = bounds[2] - bounds[0] + 2 * pad, bounds[3] - bounds[1] + 2 * pad
    d = _round_path(" ".join(pieces))
    label = escape(a.text)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="%s" height="%s" role="img" aria-label="%s">\n'
        "  <title>%s</title>\n"
        '  <path fill="%s" d="%s"/>\n'
        "</svg>\n"
    ) % (_fmt(vx), _fmt(vy), _fmt(vw), _fmt(vh), _fmt(vw), _fmt(vh), label, label, escape(a.color), d)
    write(a.out, svg)
    print("wrote %s (%s x %s units, %d glyphs, font %s)" % (a.out, _fmt(vw), _fmt(vh), len(chars), os.path.basename(a.font)))
    return 0


def draft_text(a):
    fam = a.family or "serif"
    size = 100
    width = int(len(a.text) * size * 0.56) + 10
    label = escape(a.text)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d 130" width="%d" height="130" role="img" aria-label="%s" data-draft="true">\n'
        "  <title>%s (draft, not outlined)</title>\n"
        '  <text x="5" y="100" font-family="%s" font-size="%d" letter-spacing="%s" fill="%s">%s</text>\n'
        "</svg>\n"
    ) % (width, width, label, label, escape(fam), size, _fmt(a.tracking / 10.0), escape(a.color), label)
    write(a.out, svg)
    print("wrote %s (draft: live text, outline it with --font before delivery)" % a.out)
    return 0


_VIEWBOX = re.compile(r'viewBox\s*=\s*"([^"]+)"')


def read_svg(path):
    with open(path, "r", encoding="utf-8") as fh:
        text = fh.read()
    m = re.search(r"<svg\b[^>]*>", text, re.S)
    if not m:
        raise SystemExit("%s is not an SVG file" % path)
    vb = _VIEWBOX.search(m.group(0))
    if not vb:
        raise SystemExit("%s needs a viewBox" % path)
    nums = [float(n) for n in re.split(r"[\s,]+", vb.group(1).strip())]
    inner = text[m.end():text.rfind("</svg>")]
    inner = re.sub(r"<title>.*?</title>\s*", "", inner, flags=re.S)
    return nums, inner.strip()


def lockup(a):
    (sx, sy, sw, sh), s_inner = read_svg(a.symbol)
    (wx, wy, ww, wh), w_inner = read_svg(a.wordmark)
    if a.layout == "horizontal":
        sym_h = wh * a.symbol_scale
        sym_w = sw * sym_h / sh
        gap = sym_h * a.gap
        total_w = sym_w + gap + ww
        total_h = max(sym_h, wh)
        s_box = (0, (total_h - sym_h) / 2, sym_w, sym_h)
        w_box = (sym_w + gap, (total_h - wh) / 2, ww, wh)
    else:
        sym_w = ww * a.symbol_scale * 0.35
        sym_h = sh * sym_w / sw
        gap = sym_h * a.gap
        total_w = max(sym_w, ww)
        total_h = sym_h + gap + wh
        s_box = ((total_w - sym_w) / 2, 0, sym_w, sym_h)
        w_box = ((total_w - ww) / 2, sym_h + gap, ww, wh)
    title = escape(a.title or "Logo lockup")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%s" height="%s" role="img" aria-label="%s">\n'
        "  <title>%s</title>\n"
        '  <svg x="%s" y="%s" width="%s" height="%s" viewBox="%s %s %s %s">%s</svg>\n'
        '  <svg x="%s" y="%s" width="%s" height="%s" viewBox="%s %s %s %s">%s</svg>\n'
        "</svg>\n"
    ) % (
        _fmt(total_w), _fmt(total_h), _fmt(total_w), _fmt(total_h), title, title,
        _fmt(s_box[0]), _fmt(s_box[1]), _fmt(s_box[2]), _fmt(s_box[3]), _fmt(sx), _fmt(sy), _fmt(sw), _fmt(sh), s_inner,
        _fmt(w_box[0]), _fmt(w_box[1]), _fmt(w_box[2]), _fmt(w_box[3]), _fmt(wx), _fmt(wy), _fmt(ww), _fmt(wh), w_inner,
    )
    write(a.out, svg)
    print("wrote %s (%s, %s x %s)" % (a.out, a.layout, _fmt(total_w), _fmt(total_h)))
    return 0


def recolor(a):
    with open(a.svg, "r", encoding="utf-8") as fh:
        text = fh.read()
    col = a.color

    def swap(m):
        val = m.group(2)
        if val.lower() in ("none", "transparent") or val.startswith("url("):
            return m.group(0)
        return m.group(1) + col + m.group(3)

    text = re.sub(r'((?:fill|stroke)=")([^"]+)(")', swap, text)
    text = re.sub(r"((?:fill|stroke)\s*:\s*)([^;\"']+)(;?)", swap, text)
    if a.title:
        text = re.sub(r"<title>.*?</title>", "<title>%s</title>" % escape(a.title), text, flags=re.S)
    write(a.out, text)
    print("wrote %s (all fills and strokes -> %s)" % (a.out, col))
    return 0


def write(path, text):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Outlined SVG wordmarks, lockups and colour variants.")
    sub = ap.add_subparsers(dest="cmd")
    t = sub.add_parser("text", help="outline a word from a font file")
    t.add_argument("--text", required=True)
    t.add_argument("--font", help="TTF/OTF (or WOFF2 with brotli) of an open-licensed family")
    t.add_argument("--axis", action="append", help="variable axis, e.g. wght=600 (repeatable)")
    t.add_argument("--tracking", type=float, default=0.0, help="extra space between letters, 1/1000 em")
    t.add_argument("--kern", help="manual pair adjustments, e.g. 'Lu=-20,mN=10' (1/1000 em)")
    t.add_argument("--alt", action="append", help="use an alternate glyph, e.g. a=a.ss01 (repeatable)")
    t.add_argument("--color", default="currentColor")
    t.add_argument("--pad", type=float, default=0.0, help="padding around the outline, output units (1 em = 100)")
    t.add_argument("--draft", action="store_true", help="live <text> preview, no fontTools needed")
    t.add_argument("--family", help="font-family name for --draft")
    t.add_argument("--out", required=True)
    lk = sub.add_parser("lockup", help="combine a symbol and a wordmark")
    lk.add_argument("--symbol", required=True)
    lk.add_argument("--wordmark", required=True)
    lk.add_argument("--layout", choices=("horizontal", "stacked"), default="horizontal")
    lk.add_argument("--gap", type=float, default=0.35, help="gap as a fraction of the symbol height")
    lk.add_argument("--symbol-scale", type=float, default=1.0, help="symbol height relative to the wordmark height")
    lk.add_argument("--title")
    lk.add_argument("--out", required=True)
    rc = sub.add_parser("recolor", help="set every fill/stroke to one colour")
    rc.add_argument("svg")
    rc.add_argument("--color", required=True)
    rc.add_argument("--title")
    rc.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    if a.cmd == "text":
        if a.draft:
            return draft_text(a)
        if not a.font:
            ap.error("--font is required unless --draft")
        return outline_text(a)
    if a.cmd == "lockup":
        return lockup(a)
    if a.cmd == "recolor":
        return recolor(a)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
