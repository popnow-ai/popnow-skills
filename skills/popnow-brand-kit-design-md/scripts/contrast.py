#!/usr/bin/env python3
"""WCAG 2.x contrast checker and look-alike colour check for brand palettes.

Examples:
  python3 scripts/contrast.py "#FFFDF8" "#B5541E"            one pair, every WCAG level
  python3 scripts/contrast.py --design DESIGN.md              declared pairs + component pairs
  python3 scripts/contrast.py --design DESIGN.md --matrix     every colour on every surface (markdown)
  python3 scripts/contrast.py --fix "#E08A4F" --on "#FFFFFF"  nearest passing colour, same hue
  python3 scripts/contrast.py --design DESIGN.md --avoid brand/brief.json
                                                              palette vs competitor colours

Exit codes: 0 all good, 1 a check failed, 2 bad input.
Standard library only.
"""

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brandkit_lib as bk  # noqa: E402

MINIMUMS = {"text": 4.5, "large": 3.0, "ui": 3.0}
NEAR = 10.0  # OKLab distance x100 under which two near-greys count as the same (heuristic)
CHROMATIC = 0.04  # OKLCH chroma below this is treated as a near-grey


def pair_report(fg, bg):
    r = bk.contrast_ratio(fg, bg)
    return {
        "ratio": bk.floor2(r),
        "grade": bk.grade(r),
        "AA_text": r >= 4.5,
        "AA_large_or_ui": r >= 3.0,
        "AAA_text": r >= 7.0,
        "AAA_large": r >= 4.5,
    }


def design_pairs(design):
    """Declared brand.pairs plus every component with a text and a background colour."""
    rows = []
    for i, p in enumerate(design.brand().get("pairs") or []):
        if not isinstance(p, dict):
            continue
        kind = str(p.get("kind", "text"))
        rows.append({
            "source": "brand.pairs[%d]" % i,
            "fg": p.get("fg"),
            "bg": p.get("bg"),
            "use": p.get("use", ""),
            "min": float(p.get("min", MINIMUMS.get(kind, 4.5))),
        })
    for name, comp in (design.tokens.get("components") or {}).items():
        if not isinstance(comp, dict) or "textColor" not in comp or "backgroundColor" not in comp:
            continue
        large = bool(re.search(r"(display|hero|large|xl)", name))
        rows.append({
            "source": "components.%s" % name,
            "fg": comp["textColor"],
            "bg": comp["backgroundColor"],
            "use": "component text",
            "min": 3.0 if large else 4.5,
        })
    out = []
    for row in rows:
        fg, bg = design.color(row["fg"]), design.color(row["bg"])
        if fg is None or bg is None:
            row.update({"ratio": None, "pass": False, "error": "cannot resolve %s" % (row["fg"] if fg is None else row["bg"])})
        else:
            r = bk.contrast_ratio(fg, bg)
            row.update({"ratio": bk.floor2(r), "grade": bk.grade(r), "pass": r >= row["min"]})
            if not row["pass"]:
                fix = bk.suggest_fix(fg, bg, row["min"])
                if fix:
                    row["suggest"] = bk.to_hex(fix[0]).upper()
        out.append(row)
    return out


def is_surface(name):
    return bool(re.search(r"(surface|background|container|paper|canvas)", name)) or name in (
        "primary", "secondary", "tertiary", "error", "success", "dark-primary")


def matrix(design):
    cols = design.colors()
    surfaces = [n for n in cols if is_surface(n)]
    lines = ["| text \\ surface | " + " | ".join(surfaces) + " |", "|---|" + "---|" * len(surfaces)]
    for fg_name, fg in cols.items():
        cells = []
        for bg_name in surfaces:
            if bg_name == fg_name:
                cells.append("-")
                continue
            r = bk.contrast_ratio(fg, cols[bg_name])
            g = bk.grade(r)
            cells.append("%.2f %s" % (bk.floor2(r), "" if g == "fail" else g))
        lines.append("| %s | %s |" % (fg_name, " | ".join(cells)))
    return "\n".join(lines)


def svg_fills(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
    except OSError:
        return []
    found = re.findall(r"(?:fill|stroke|stop-color)\s*[:=]\s*[\"']?(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))", text)
    return [c for c in (bk.parse_color(x) for x in found) if c]


def brand_colours(design):
    cols = design.colors()
    keys = [k for k in ("primary", "secondary", "tertiary", "on-surface", "surface", "dark-primary") if k in cols]
    picked = {k: cols[k] for k in keys}
    for k, v in cols.items():
        if k.startswith("on-") or k.startswith("dark-on-"):
            continue
        if k not in picked and bk.to_oklch(v)[1] >= 0.08:
            picked[k] = v  # other saturated colours also carry identity
    logo = design.brand().get("logo") or {}
    for key in ("wordmark", "symbol", "lockup"):
        p = logo.get(key)
        if isinstance(p, str):
            for i, c in enumerate(svg_fills(os.path.join(design.base_dir, p))):
                picked["logo:%s#%d" % (key, i)] = c
    return picked


def avoid_check(design, brief):
    return avoid_palette(brand_colours(design), brief)


def similar(a, b, near=None):
    """(near?, neutral?, deltaE) for two colours.

    Chromatic pairs count as the same family when hue is within 20 degrees and
    lightness within 0.12 (OKLCH), or when they are almost identical (dE < 5).
    If either colour is a near-grey, only a small OKLab distance counts, and the
    match is flagged neutral: black text on white paper is universal, not identity.
    """
    near = NEAR if near is None else near
    d = bk.delta_e_ok(a, b)
    la, ca, ha = bk.to_oklch(a)
    lb, cb, hb = bk.to_oklch(b)
    if min(ca, cb) < CHROMATIC:
        return d < near, True, d
    dh = abs((ha - hb + 180) % 360 - 180)
    return (dh <= 20 and abs(la - lb) <= 0.12) or d < 5, False, d


def avoid_palette(ours, brief, near=None):
    """Compare a palette {name: rgba} with each competitor's signature colours."""
    results = []
    for comp in brief.get("avoid") or []:
        if not isinstance(comp, dict):
            continue
        name = comp.get("name", "competitor")
        theirs = [(c, bk.parse_color(c)) for c in comp.get("colors") or []]
        theirs = [(s, c) for s, c in theirs if c]
        matches = []
        for s, c in theirs:
            cands = [(similar(c, oc, near), on) for on, oc in ours.items()]
            if not cands:
                continue
            hits = [x for x in cands if x[0][0]]
            (is_near, neutral, d), on = min(hits or cands, key=lambda x: x[0][2])
            matches.append({"theirs": s, "ours": on, "deltaE": round(d, 1), "near": is_near, "neutral": neutral})
        chroma_near = [m for m in matches if m["near"] and not m["neutral"]]
        all_near = [m for m in matches if m["near"]]
        if chroma_near and len(all_near) >= 2:
            verdict = "lookalike"
        elif chroma_near:
            verdict = "close"
        else:
            verdict = "distinct"
        results.append({"name": name, "verdict": verdict, "matches": matches, "mark": comp.get("mark", "")})
    return results


def main(argv=None):
    ap = argparse.ArgumentParser(description="WCAG contrast and look-alike colour checks.")
    ap.add_argument("colors", nargs="*", help="FG BG (any CSS colour: hex, rgb(), hsl(), oklch())")
    ap.add_argument("--design", help="DESIGN.md to check")
    ap.add_argument("--matrix", action="store_true", help="print every colour on every surface")
    ap.add_argument("--fix", help="colour to adjust")
    ap.add_argument("--on", help="background for --fix")
    ap.add_argument("--target", type=float, default=4.5, help="ratio for --fix (default 4.5)")
    ap.add_argument("--avoid", help="brief.json with an 'avoid' list of competitors and their colours")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    a = ap.parse_args(argv)

    if a.fix:
        fg, bg = bk.parse_color(a.fix), bk.parse_color(a.on or "#FFFFFF")
        if fg is None or bg is None:
            print("Cannot read colour %s" % (a.fix if fg is None else a.on), file=sys.stderr)
            return 2
        res = bk.suggest_fix(fg, bg, a.target)
        if res is None:
            print("No colour with this hue reaches %.1f:1 on %s." % (a.target, a.on), file=sys.stderr)
            return 1
        out = {"from": a.fix, "on": a.on or "#FFFFFF", "target": a.target, "suggest": bk.to_hex(res[0]).upper(),
               "ratio": bk.floor2(res[1]), "before": bk.floor2(bk.contrast_ratio(fg, bg))}
        if a.json:
            print(json.dumps(out, indent=2))
        else:
            print("%s on %s: %.2f:1 -> use %s (%.2f:1, target %.1f)" % (out["from"], out["on"], out["before"], out["suggest"], out["ratio"], a.target))
        return 0

    if len(a.colors) == 2 and not a.design:
        fg, bg = bk.parse_color(a.colors[0]), bk.parse_color(a.colors[1])
        if fg is None or bg is None:
            print("Cannot read colour %s" % (a.colors[0] if fg is None else a.colors[1]), file=sys.stderr)
            return 2
        rep = pair_report(fg, bg)
        if a.json:
            print(json.dumps(rep, indent=2))
        else:
            print("%s on %s: %.2f:1 (%s)" % (a.colors[0], a.colors[1], rep["ratio"], rep["grade"]))
            for label, ok in (("AA normal text (4.5)", rep["AA_text"]), ("AA large text / UI (3.0)", rep["AA_large_or_ui"]),
                              ("AAA normal text (7.0)", rep["AAA_text"]), ("AAA large text (4.5)", rep["AAA_large"])):
                print("  %-26s %s" % (label, "pass" if ok else "FAIL"))
        return 0 if rep["AA_large_or_ui"] else 1

    if not a.design:
        ap.print_help()
        return 2
    if not os.path.exists(a.design):
        print("No such file: %s" % a.design, file=sys.stderr)
        return 2
    design = bk.load_design(a.design)
    if design.errors:
        for rule, msg in design.errors:
            print("ERROR %s: %s" % (rule, msg), file=sys.stderr)
        return 2

    code = 0
    payload = {}
    if a.matrix:
        print(matrix(design))
        return 0
    rows = design_pairs(design)
    payload["pairs"] = rows
    if any(not r["pass"] for r in rows):
        code = 1
    if a.avoid:
        try:
            with open(a.avoid, "r", encoding="utf-8") as fh:
                brief = json.load(fh)
        except (OSError, ValueError) as exc:
            print("Cannot read %s: %s" % (a.avoid, exc), file=sys.stderr)
            return 2
        av = avoid_check(design, brief)
        payload["avoid"] = av
        if any(r["verdict"] == "lookalike" for r in av):
            code = 1
    if a.json:
        print(json.dumps(payload, indent=2))
        return code
    if not rows:
        print("No pairs found. Declare brand.pairs in DESIGN.md (fg, bg, use, kind).")
    for r in rows:
        if r.get("ratio") is None:
            print("FAIL  %-28s %s" % (r["source"], r.get("error")))
            continue
        line = "%s  %-28s %-26s %6.2f:1  min %.1f  %s" % (
            "ok  " if r["pass"] else "FAIL", r["source"], "%s on %s" % (r["fg"], r["bg"]), r["ratio"], r["min"], r.get("use", ""))
        if r.get("suggest"):
            line += "  -> try %s" % r["suggest"]
        print(line)
    for res in payload.get("avoid", []):
        print("\n%s: %s" % (res["name"], res["verdict"].upper()))
        for m in res["matches"]:
            print("  their %s ~ our %s  dE %.1f%s%s" % (m["theirs"], m["ours"], m["deltaE"], "  near" if m["near"] else "", " (neutral)" if m["neutral"] else ""))
        if res["verdict"] == "lookalike":
            print("  Two or more of their signature colours reappear in this palette. Change the accent hue or swap the pairing.")
        elif res["verdict"] == "close":
            print("  One signature colour is close. Acceptable only if the mark, type and layout are clearly different.")
    return code


if __name__ == "__main__":
    sys.exit(main())
