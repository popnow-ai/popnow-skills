#!/usr/bin/env python3
"""Lint a DESIGN.md brand kit before you hand it to other agents.

  python3 scripts/lint_design.py DESIGN.md
  python3 scripts/lint_design.py DESIGN.md --brief brand/brief.json   # also look-alike + competitor checks
  python3 scripts/lint_design.py DESIGN.md --json
  python3 scripts/lint_design.py DESIGN.md --draft                    # allow unoutlined <text> logos while iterating

The file format follows the open DESIGN.md format (YAML front matter tokens +
"##" prose sections, version "alpha"); extra brand data lives under one
`brand:` key that other DESIGN.md readers ignore. See references/design-md-format.md.

Exit code 1 when there is at least one error. Standard library only.
"""

import argparse
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brandkit_lib as bk  # noqa: E402
import contrast  # noqa: E402

PLACEHOLDER = re.compile(r"\b(TODO|TBD|FIXME|lorem ipsum)\b|\{\{[^}]*\}\}", re.I)
HEX_IN_PROSE = re.compile(r"(?<![\w&])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")
GENERIC_FONTS = {"inter", "roboto", "arial", "helvetica", "system-ui", "open sans"}


class Findings:
    def __init__(self):
        self.items = []

    def add(self, severity, rule, path, message):
        self.items.append({"severity": severity, "rule": rule, "path": path, "message": message})

    def error(self, rule, path, message):
        self.add("error", rule, path, message)

    def warn(self, rule, path, message):
        self.add("warning", rule, path, message)

    def info(self, rule, path, message):
        self.add("info", rule, path, message)

    def count(self, severity):
        return sum(1 for f in self.items if f["severity"] == severity)


def omitted_set(tokens):
    out = set()
    for item in tokens.get("omitted") or []:
        if isinstance(item, str):
            out.add(item.lower())
        elif isinstance(item, dict) and item.get("section"):
            out.add(str(item["section"]).lower())
    return out


def iter_strings(node, path=""):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from iter_strings(v, "%s.%s" % (path, k) if path else str(k))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from iter_strings(v, "%s[%d]" % (path, i))
    elif isinstance(node, str):
        yield path, node


def check_tokens(d, f):
    t = d.tokens
    if not t.get("name"):
        f.error("missing-name", "name", "Give the design system a name.")
    if t.get("version") not in (None, "alpha"):
        f.info("version", "version", "Known DESIGN.md version is 'alpha'; other readers may not understand %r." % t.get("version"))
    for k in t:
        if k not in bk.SCHEMA_KEYS and k != "brand":
            near = [s for s in bk.SCHEMA_KEYS if _lev(k.lower(), s) <= 2]
            if near:
                f.warn("unknown-key", k, "Unknown key '%s'. Did you mean '%s'?" % (k, near[0]))
    cols = t.get("colors")
    if not isinstance(cols, dict) or not cols:
        f.error("missing-colors", "colors", "No colours defined.")
        cols = {}
    elif "primary" not in cols:
        f.error("missing-primary", "colors.primary", "Define a 'primary' colour; readers fall back to their own otherwise.")
    for name, v in cols.items():
        p = "colors.%s" % name
        if v is None:
            f.error("invalid-color", p, "Empty value. An unquoted #hex is read as a YAML comment; wrap it in quotes: \"#RRGGBB\".")
            continue
        if isinstance(v, str) and bk.REF.match(v):
            continue
        if not isinstance(v, str):
            f.error("invalid-color", p, "Colour must be a string such as \"#1A1C1E\".")
        elif bk.parse_color(v) is None:
            if v.strip().startswith(("color-mix(", "lab(", "lch(", "hwb(")):
                f.warn("unchecked-color", p, "Valid CSS, but this linter cannot check contrast for %s. Prefer hex." % v)
            else:
                f.error("invalid-color", p, "Not a CSS colour: %r" % v)
        if name.startswith("dark-") and name[5:] not in cols:
            f.warn("dark-orphan", p, "Dark override '%s' has no light colour '%s' to replace." % (name, name[5:]))

    typo = t.get("typography")
    if not isinstance(typo, dict) or not typo:
        if "typography" not in omitted_set(t):
            f.error("missing-typography", "typography", "No type levels defined.")
        typo = {}
    for name, ts in typo.items():
        p = "typography.%s" % name
        if not isinstance(ts, dict):
            f.error("typography-shape", p, "Each type level is a mapping with fontFamily, fontSize, fontWeight, lineHeight.")
            continue
        for req in ("fontFamily", "fontSize"):
            if ts.get(req) in (None, ""):
                f.error("typography-incomplete", "%s.%s" % (p, req), "Missing %s." % req)
        if ts.get("fontSize") is not None and not _dim_or_ref(ts["fontSize"], unitless=False):
            f.error("invalid-dimension", p + ".fontSize", "Use px, rem or em, e.g. 16px (got %r)." % ts["fontSize"])
        if "fontWeight" in ts:
            try:
                w = int(ts["fontWeight"])
                if not 1 <= w <= 1000:
                    raise ValueError
            except (TypeError, ValueError):
                f.error("invalid-weight", p + ".fontWeight", "Font weight must be a number from 1 to 1000.")
        if "lineHeight" in ts and not _dim_or_ref(ts["lineHeight"], unitless=True):
            f.error("invalid-dimension", p + ".lineHeight", "Use a unitless multiplier (1.5) or a dimension (24px).")
        if "letterSpacing" in ts and not _dim_or_ref(ts["letterSpacing"], unitless=False):
            f.error("invalid-dimension", p + ".letterSpacing", "Use em, px or rem, e.g. -0.01em.")

    for group in ("rounded", "spacing"):
        vals = t.get(group)
        if vals is None:
            continue
        if not isinstance(vals, dict):
            f.error("shape", group, "%s must be a mapping of name -> dimension." % group)
            continue
        for name, v in vals.items():
            if not _dim_or_ref(v, unitless=(group == "spacing")):
                f.error("invalid-dimension", "%s.%s" % (group, name), "Not a dimension: %r" % (v,))

    comps = t.get("components") or {}
    for name, props in comps.items():
        if not isinstance(props, dict):
            f.error("component-shape", "components.%s" % name, "Each component is a mapping of property -> value.")
            continue
        for prop in props:
            if prop not in bk.COMPONENT_PROPS:
                f.info("component-property", "components.%s.%s" % (name, prop), "Not a standard component property; readers keep it but may ignore it.")

    for path, s in iter_strings(t):
        if bk.REF.match(s.strip()):
            try:
                d.resolve(s)
            except KeyError:
                f.error("broken-ref", path, "Reference %s does not point to a token." % s)


def _lev(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _dim_or_ref(v, unitless):
    if isinstance(v, str) and bk.REF.match(v.strip()):
        return True
    d = bk.parse_dimension(v)
    if d is None:
        return False
    return unitless or d[1] is not None or d[0] == 0


def check_sections(d, f):
    profile = d.profile()
    omitted = omitted_set(d.tokens)
    seen = {}
    order = []
    for title, canon, line, content in d.sections:
        if canon in seen:
            f.error("duplicate-section", "line %d" % line, "Section '%s' appears twice (first at line %d)." % (title, seen[canon]))
            continue
        seen[canon] = line
        order.append(canon)
        if len(re.sub(r"```.*?```", "", content, flags=re.S).strip()) < 40:
            f.warn("thin-section", "line %d" % line, "Section '%s' is nearly empty." % title)
    known = [s for s in order if s in bk.KIT_SECTIONS]
    for a, b in zip(known, known[1:]):
        if bk.KIT_SECTIONS.index(a) > bk.KIT_SECTIONS.index(b):
            f.warn("section-order", "sections", "'%s' comes before '%s'. Expected order: %s." % (a, b, ", ".join(bk.KIT_SECTIONS)))
            break
    for req in bk.REQUIRED_SECTIONS[profile]:
        if req not in seen and req.lower() not in omitted:
            f.error("missing-section", "sections", "Missing '## %s' (required for the %s profile)." % (req, profile))


def check_fonts(d, f):
    brand = d.brand()
    fonts = {x.get("family"): x for x in brand.get("fonts") or [] if isinstance(x, dict) and x.get("family")}
    used = sorted({ts.get("fontFamily") for ts in (d.tokens.get("typography") or {}).values() if isinstance(ts, dict) and ts.get("fontFamily")})
    for fam in used:
        if fam not in fonts:
            f.error("font-license", "brand.fonts", "'%s' is used in typography but has no brand.fonts entry with a licence." % fam)
    for fam, info in fonts.items():
        lic = str(info.get("license", ""))
        if lic not in bk.OPEN_FONT_LICENSES:
            f.error("font-license", "brand.fonts.%s" % fam, "Licence %r is not an open font licence this kit accepts (%s). Pick an open-licensed family or record the licence the user owns and pass --allow-license." % (lic or "missing", ", ".join(bk.OPEN_FONT_LICENSES)))
        if not info.get("source"):
            f.warn("font-source", "brand.fonts.%s" % fam, "Add a source URL (Google Fonts or Fontsource page) so others can install it.")
        if not info.get("fallback"):
            f.warn("font-fallback", "brand.fonts.%s" % fam, "Add a fallback stack, e.g. \"Georgia, serif\".")
    if len(fonts) > 3:
        f.warn("font-count", "brand.fonts", "%d families. Two (plus an optional mono) keep a brand consistent." % len(fonts))
    if used and all(x.lower() in GENERIC_FONTS for x in used):
        primary = d.colors().get("primary")
        if primary and 255 <= bk.to_oklch(primary)[2] <= 310:
            f.info("generic-look", "typography", "Only a default UI family plus a violet primary: the most common generated look. Make sure the brief asked for it.")


def check_svg(path, label, palette, allow_draft, f):
    if not os.path.exists(path):
        f.error("logo-file", label, "File not found: %s" % path)
        return
    if not path.lower().endswith(".svg"):
        f.error("logo-raster", label, "The logo must be SVG, not %s. Redraw raster explorations as vector shapes." % os.path.splitext(path)[1])
        return
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        text = fh.read()
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        f.error("logo-svg", label, "Not well-formed SVG: %s" % exc)
        return
    tag = lambda el: el.tag.split("}")[-1]  # noqa: E731
    if tag(root) != "svg":
        f.error("logo-svg", label, "Root element is not <svg>.")
    if not root.get("viewBox"):
        f.warn("logo-viewbox", label, "Add a viewBox so the mark scales cleanly.")
    tags = [tag(el) for el in root.iter()]
    if "image" in tags or "data:image" in text:
        f.error("logo-raster", label, "Contains an embedded raster image. A logo must be pure vector.")
    if "script" in tags or "foreignObject" in tags:
        f.error("logo-svg", label, "Remove <script>/<foreignObject>; logos must be static vector art.")
    if re.search(r"(?:href|src)\s*=\s*[\"']https?:", text):
        f.error("logo-svg", label, "References an external file; inline everything.")
    if "text" in tags:
        if allow_draft:
            f.warn("logo-text", label, "Uses live <text> (draft). Outline it before delivery: scripts/wordmark.py.")
        else:
            f.error("logo-text", label, "Uses live <text>, which renders differently on every machine. Outline it with scripts/wordmark.py.")
    if "linearGradient" in tags or "radialGradient" in tags or "filter" in tags:
        f.warn("logo-effects", label, "Gradients or filters break one-colour printing; keep them out of the master mark.")
    nodes = len(re.findall(r"[MLHVCSQTAZmlhvcsqtaz]", " ".join(el.get("d", "") for el in root.iter() if tag(el) == "path")))
    if nodes > 1200:
        f.warn("logo-complexity", label, "%d path commands looks auto-traced. Redraw with simple geometry." % nodes)
    if len(text) > 60000:
        f.warn("logo-size", label, "%d KB is heavy for a logo." % (len(text) // 1024))
    if palette:
        for c in re.findall(r"(?:fill|stroke)\s*[:=]\s*[\"']?(#[0-9a-fA-F]{3,8})", text):
            col = bk.parse_color(c)
            if col and min(bk.delta_e_ok(col, p) for p in palette) > 2.0 and c.lower() not in ("#fff", "#ffffff", "#000", "#000000"):
                f.warn("logo-color", label, "Colour %s is not in the palette." % c)
                break


def check_brand(d, f, allow_draft):
    brand = d.brand()
    profile = d.profile()
    if not brand:
        f.error("missing-brand", "brand", "No brand block: fonts, pairs and voice are required (see references/design-md-format.md).")
        return
    if brand.get("profile") not in (None, "full", "lite"):
        f.warn("profile", "brand.profile", "Use 'full' or 'lite'.")
    voice = brand.get("voice") or {}
    if len(voice.get("attributes") or []) < 3:
        f.warn("voice", "brand.voice.attributes", "Give at least three voice attributes.")
    for key in ("do", "dont"):
        items = [x for x in voice.get(key) or [] if isinstance(x, str) and x.strip()]
        if len(items) < 3:
            f.error("voice", "brand.voice.%s" % key, "Give at least three '%s' copy examples." % ("do" if key == "do" else "don't"))
    if not brand.get("pairs"):
        f.warn("pairs-missing", "brand.pairs", "Declare the text/background pairs people will use so they can be contrast-checked.")
    if profile == "full":
        logo = brand.get("logo") or {}
        if not logo.get("wordmark"):
            f.error("logo-missing", "brand.logo.wordmark", "Full kit needs an SVG wordmark (scripts/wordmark.py).")
        palette = list(d.colors().values())
        for key in ("wordmark", "symbol", "lockup", "wordmarkReverse", "symbolMono"):
            p = logo.get(key)
            if isinstance(p, str) and p:
                check_svg(os.path.join(d.base_dir, p), "brand.logo.%s" % key, palette, allow_draft, f)
        if not logo.get("minWidthPx"):
            f.warn("logo-rules", "brand.logo.minWidthPx", "State the smallest width the wordmark may be used at.")
        icons = brand.get("icons") or {}
        for key in ("grid", "stroke", "style"):
            if key not in icons:
                f.warn("icons", "brand.icons.%s" % key, "Icon rules need '%s'." % key)
        if not (brand.get("imagery") or {}).get("style"):
            f.info("imagery", "brand.imagery.style", "A one-line imagery style lets other skills prompt on-brand pictures.")


def check_prose(d, f):
    cols = d.colors()
    body = d.body
    for m in HEX_IN_PROSE.finditer(body):
        c = bk.parse_color(m.group(0))
        if c and cols and min(bk.delta_e_ok(c, v) for v in cols.values()) > 1.0:
            line = body[:m.start()].count("\n") + d.body_line
            f.warn("prose-drift", "line %d" % line, "Prose mentions %s, which is not a colour token. Update the prose or the tokens." % m.group(0))
    for m in PLACEHOLDER.finditer(d.text):
        line = d.text[:m.start()].count("\n") + 1
        f.error("placeholder", "line %d" % line, "Placeholder text '%s' left in the file." % m.group(0))
        break


def check_contrast(d, f):
    for row in contrast.design_pairs(d):
        if row.get("ratio") is None:
            f.error("contrast", row["source"], row.get("error", "cannot resolve colours"))
        elif not row["pass"]:
            hint = " Try %s." % row["suggest"] if row.get("suggest") else ""
            f.error("contrast", row["source"], "%s on %s is %.2f:1, below %.1f:1.%s" % (row["fg"], row["bg"], row["ratio"], row["min"], hint))


def check_brief(d, f, brief):
    names = [str(c.get("name")) for c in brief.get("avoid") or [] if isinstance(c, dict) and c.get("name")]
    low = d.text.lower()
    for n in names:
        if len(n) > 2 and re.search(r"\b%s\b" % re.escape(n.lower()), low):
            f.warn("competitor-name", "text", "'%s' is named in DESIGN.md. Describe what to avoid by visual traits instead; this file travels with the project." % n)
    for res in contrast.avoid_check(d, brief):
        pairs = ", ".join("%s~%s" % (m["theirs"], m["ours"]) for m in res["matches"] if m["near"])
        if res["verdict"] == "lookalike":
            f.error("lookalike", "colors", "Palette repeats %s's colour combination (%s). Change the accent hue or the pairing." % (res["name"], pairs))
        elif res["verdict"] == "close":
            f.warn("lookalike", "colors", "One colour sits close to %s (%s). Keep the mark, type and layout clearly different." % (res["name"], pairs))


def lint(path, brief=None, allow_draft=False):
    f = Findings()
    d = bk.load_design(path)
    if d.fm_text is None and not d.blocks:
        f.error("frontmatter", "file", "No YAML front matter. Start the file with '---', the tokens, then '---'.")
    for rule, msg in d.errors:
        f.error(rule, "file", msg)
    if d.errors:
        return f, d
    check_tokens(d, f)
    check_sections(d, f)
    check_fonts(d, f)
    check_brand(d, f, allow_draft)
    check_contrast(d, f)
    check_prose(d, f)
    if brief:
        check_brief(d, f, brief)
    return f, d


def main(argv=None):
    ap = argparse.ArgumentParser(description="Lint a DESIGN.md brand kit.")
    ap.add_argument("design")
    ap.add_argument("--brief", help="brand/brief.json for competitor and look-alike checks")
    ap.add_argument("--draft", action="store_true", help="allow live <text> in logo files while iterating")
    ap.add_argument("--allow-license", action="append", default=[], help="extra font licence id the user owns, e.g. Commercial-Owned")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    if not os.path.exists(a.design):
        print("No such file: %s" % a.design, file=sys.stderr)
        return 2
    if a.allow_license:
        bk.OPEN_FONT_LICENSES = tuple(bk.OPEN_FONT_LICENSES) + tuple(a.allow_license)
    brief = None
    if a.brief:
        try:
            with open(a.brief, "r", encoding="utf-8") as fh:
                brief = json.load(fh)
        except (OSError, ValueError) as exc:
            print("Cannot read %s: %s" % (a.brief, exc), file=sys.stderr)
            return 2
    f, d = lint(a.design, brief, a.draft)
    summary = {"errors": f.count("error"), "warnings": f.count("warning"), "infos": f.count("info")}
    if a.json:
        print(json.dumps({"findings": f.items, "summary": summary, "profile": d.profile()}, indent=2))
    else:
        for item in f.items:
            print("%-7s %-22s %-34s %s" % (item["severity"].upper(), item["rule"], item["path"], item["message"]))
        print("%s: %d errors, %d warnings, %d infos (profile: %s)" % (a.design, summary["errors"], summary["warnings"], summary["infos"], d.profile()))
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
