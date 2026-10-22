#!/usr/bin/env python3
"""Check the brief and its PopNow generation plan before anything is quoted or paid.

  python3 scripts/plan.py check brand/brief.json            validate brief + prompts, rough credit estimate
  python3 scripts/plan.py commands brand/brief.json --stage directions          free quote commands
  python3 scripts/plan.py commands brand/brief.json --stage directions --create create commands (after a yes)
  python3 scripts/plan.py status brand/brief.json           which planned pictures exist on disk

Nothing here calls the network. Exact prices only come from
`python3 scripts/popnow.py quote ...`; the estimate is for planning the conversation.
Standard library only.
"""

import argparse
import json
import os
import re
import shlex
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brandkit_lib as bk  # noqa: E402

STAGES = ("directions", "symbol", "mockups", "extras")
# Rough per-image list prices in credits (Oct 2026). Planning only; always quote.
ESTIMATE = {
    "alibaba/z-image-turbo/text-to-image": 10,
    "google/nano-banana-2.1/text-to-image": 48,
    "google/nano-banana-2.1/edit": 48,
    "bytedance/seedream-5.0-flash/edit": 26,
    "openai/gpt-image-2/text-to-image": None,
    "popnow/background-remover-v1/edit": 5,
    "popnow/image-upscaler-v1/upscale": 12,
}
PEOPLE = re.compile(r"\b(person|people|woman|women|man|men|girl|boy|child|face|faces|portrait|model|customer|barista|founder)\b", re.I)
SAFE_PEOPLE = re.compile(r"(no (identifiable )?faces?|faceless|hands only|only hands|from behind|back to camera|no people|out of frame|silhouette)", re.I)
TEXT_ASK = re.compile(r"(text (that )?(says|reads)|with the words|lettering|typography reading|caption reading|\"[^\"]{3,}\" written)", re.I)
NO_TEXT = re.compile(r"\bno (text|letters|words|lettering|typography)\b", re.I)
TRADEMARK = re.compile(r"(™|®|\btrademark(ed)?\b|\blogo of\b|\bin the style of [A-Z][\w&.-]+)")


class Report:
    def __init__(self):
        self.rows = []

    def add(self, sev, where, msg):
        self.rows.append((sev, where, msg))

    def errors(self):
        return sum(1 for r in self.rows if r[0] == "error")


def check(brief, base, rep):
    prod = brief.get("product") or {}
    if not isinstance(prod, dict) or not prod.get("name"):
        rep.add("error", "product.name", "Name the product.")
    if not (prod.get("what") if isinstance(prod, dict) else None):
        rep.add("error", "product.what", "Say in one sentence what it is.")
    if not brief.get("audience"):
        rep.add("error", "audience", "Who is it for?")
    pers = brief.get("personality") or []
    if len(pers) < 2:
        rep.add("error", "personality", "Give 2-4 personality words.")
    mode = brief.get("mode", "full")
    if mode not in ("full", "lite"):
        rep.add("error", "mode", "mode is 'full' or 'lite'.")
    names = []
    for i, c in enumerate(brief.get("avoid") or []):
        if not isinstance(c, dict) or not c.get("name"):
            rep.add("error", "avoid[%d]" % i, "Each avoid entry needs a name (and ideally colors and a mark description).")
            continue
        names.append(str(c["name"]))
        for col in c.get("colors") or []:
            if bk.parse_color(col) is None:
                rep.add("error", "avoid[%d].colors" % i, "Not a colour: %r" % col)
        if not c.get("colors"):
            rep.add("warning", "avoid[%d]" % i, "Add their signature colours so the look-alike check can run.")
    if not brief.get("avoid"):
        rep.add("warning", "avoid", "No competitors listed. Ask which brands it must not be confused with.")
    existing = brief.get("existing") or {}
    logo = existing.get("logo") if isinstance(existing, dict) else None
    if logo and not str(logo).lower().endswith(".svg"):
        rep.add("info", "existing.logo", "Raster logo supplied: it is a reference only. Redraw it as SVG before it goes in the kit.")
    dirs = brief.get("directions") or []
    need = 1 if mode == "lite" else 3
    if dirs and len(dirs) < need:
        rep.add("warning", "directions", "%s mode shows %d direction(s); found %d." % (mode, need, len(dirs)))
    ids = set()
    for i, dn in enumerate(dirs):
        where = "directions[%d]" % i
        if not dn.get("id") or dn.get("id") in ids:
            rep.add("error", where, "Each direction needs a unique id (A, B, C).")
        ids.add(dn.get("id"))
        pal = dn.get("palette") or {}
        if not pal or any(bk.parse_color(v) is None for v in pal.values()):
            rep.add("error", where + ".palette", "Palette values must be CSS colours.")
        if not (dn.get("fonts") or {}).get("display"):
            rep.add("warning", where + ".fonts", "Name the display and body families.")
        cols = {k: bk.parse_color(v) for k, v in pal.items() if bk.parse_color(v)}
        if cols and brief.get("avoid"):
            import contrast
            for res in contrast.avoid_palette(cols, brief):
                hits = ", ".join("%s~%s" % (m["theirs"], m["ours"]) for m in res["matches"] if m["near"])
                if res["verdict"] == "lookalike":
                    rep.add("error", where + ".palette", "Direction %s repeats %s's colour pairing (%s). Shift a hue before showing it." % (dn.get("id"), res["name"], hits))
                elif res["verdict"] == "close":
                    rep.add("warning", where + ".palette", "Direction %s has one colour close to %s (%s)." % (dn.get("id"), res["name"], hits))
    if brief.get("picked") and brief["picked"] not in ids:
        rep.add("error", "picked", "picked=%r is not one of the direction ids." % brief["picked"])

    seen = set()
    for i, g in enumerate(brief.get("generations") or []):
        where = "generations[%d]" % i
        gid = g.get("id")
        if not gid or gid in seen:
            rep.add("error", where, "Each generation needs a unique id.")
        seen.add(gid)
        if g.get("stage") not in STAGES:
            rep.add("error", where, "stage must be one of %s." % ", ".join(STAGES))
        model = str(g.get("model", ""))
        if not re.match(r"^[a-z0-9-]+/[a-z0-9.\-]+/[a-z0-9-]+$", model):
            rep.add("error", where + ".model", "Model ids look like maker/model/task, e.g. google/nano-banana-2.1/text-to-image.")
        prompt = str(g.get("prompt", ""))
        if len(prompt) < 30 and not model.startswith("popnow/"):
            rep.add("error", where + ".prompt", "Prompt is too short to be specific.")
        for n in names:
            if re.search(r"\b%s\b" % re.escape(n), prompt, re.I):
                rep.add("error", where + ".prompt", "Mentions competitor '%s'. Describe the look you want, never theirs." % n)
        if TRADEMARK.search(prompt):
            rep.add("error", where + ".prompt", "Asks for a trademark, a named brand's logo or a named style. Describe visual traits instead.")
        if PEOPLE.search(prompt) and not SAFE_PEOPLE.search(prompt):
            rep.add("warning", where + ".prompt", "Mentions people. Add 'no identifiable faces' (hands or backs only); never a real person.")
        if g.get("stage") in ("directions", "mockups") and TEXT_ASK.search(prompt) and "gpt-image" not in model:
            rep.add("warning", where + ".prompt", "Asks for words in the picture. Generated lettering is unreliable; leave blank areas and set type in HTML.")
        if g.get("stage") == "symbol" and not NO_TEXT.search(prompt):
            rep.add("warning", where + ".prompt", "Symbol explorations should say 'no text, no letters'.")
        out = str(g.get("out", ""))
        if not out or not out.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            rep.add("error", where + ".out", "Give an output path ending in .png, .jpg or .webp (e.g. assets/moodboard/a-1.webp).")
        elif os.path.isabs(out) or ".." in out.split("/"):
            rep.add("error", where + ".out", "Keep outputs inside the brand folder (relative path, no '..').")
        if g.get("image"):
            for src in g["image"] if isinstance(g["image"], list) else [g["image"]]:
                if not str(src).startswith(("http://", "https://", "popnow://")) and not os.path.exists(os.path.join(base, str(src))):
                    rep.add("error", where + ".image", "Reference image not found: %s" % src)


def estimate(g):
    model = g.get("model")
    n = int(g.get("count", 1) or 1)
    per = ESTIMATE.get(model)
    if per is not None and model.startswith("google/nano-banana") and str(g.get("resolution", "1k")).lower() == "2k":
        per = 72
    return None if per is None else per * n


def command(g, create=False):
    args = ["python3", "scripts/popnow.py", "create" if create else "quote", "--model", g["model"]]
    if g.get("prompt"):
        args += ["--prompt", g["prompt"]]
    if g.get("aspectRatio"):
        args += ["--aspect-ratio", str(g["aspectRatio"])]
    if g.get("resolution"):
        args += ["--resolution", str(g["resolution"])]
    for src in (g.get("image") if isinstance(g.get("image"), list) else ([g["image"]] if g.get("image") else [])):
        args += ["--image", str(src)]
    for k, v in (g.get("set") or {}).items():
        args += ["--set", "%s=%s" % (k, v)]
    line = " ".join(shlex.quote(x) for x in args)
    if create:
        out_dir = os.path.dirname(g.get("out", "assets/")) or "."
        line += " --confirm-credits <QUOTED> --download %s/_raw/%s" % (shlex.quote(out_dir), shlex.quote(str(g.get("id"))))
    return line


def main(argv=None):
    ap = argparse.ArgumentParser(description="Brief and generation plan checks (offline).")
    ap.add_argument("cmd", choices=("check", "commands", "status"))
    ap.add_argument("brief")
    ap.add_argument("--stage", choices=STAGES)
    ap.add_argument("--create", action="store_true", help="print create commands (only after the user agreed to the quoted total)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    try:
        with open(a.brief, "r", encoding="utf-8") as fh:
            brief = json.load(fh)
    except (OSError, ValueError) as exc:
        print("Cannot read %s: %s" % (a.brief, exc), file=sys.stderr)
        return 2
    base = os.path.dirname(os.path.abspath(a.brief))
    gens = [g for g in brief.get("generations") or [] if isinstance(g, dict)]
    if a.stage:
        gens = [g for g in gens if g.get("stage") == a.stage]

    if a.cmd == "commands":
        for g in gens:
            if os.path.exists(os.path.join(base, str(g.get("out", "")))):
                continue
            print("# %s (%s)" % (g.get("id"), g.get("stage")))
            print(command(g, a.create))
        if a.create:
            print("# After each download, move the file to its 'out' path. A failed paid task is not retried automatically.")
        return 0

    if a.cmd == "status":
        rows = []
        for g in gens:
            done = os.path.exists(os.path.join(base, str(g.get("out", ""))))
            rows.append({"id": g.get("id"), "stage": g.get("stage"), "out": g.get("out"), "done": done})
        if a.json:
            print(json.dumps(rows, indent=2))
        else:
            for r in rows:
                print("%-6s %-12s %-24s %s" % ("done" if r["done"] else "-", r["stage"], r["id"], r["out"]))
        return 0

    rep = Report()
    check(brief, base, rep)
    by_stage = {}
    unknown = []
    for g in gens:
        est = estimate(g)
        if est is None:
            unknown.append(g.get("id"))
        else:
            by_stage[g.get("stage")] = by_stage.get(g.get("stage"), 0) + est
    if a.json:
        print(json.dumps({"findings": [{"severity": s, "path": w, "message": m} for s, w, m in rep.rows],
                          "estimate": by_stage, "quoteOnly": unknown}, indent=2))
        return 1 if rep.errors() else 0
    for sev, where, msg in rep.rows:
        print("%-7s %-28s %s" % (sev.upper(), where, msg))
    print("\nRough estimate (planning only, always quote):")
    for stage in STAGES:
        if stage in by_stage:
            print("  %-11s ~%d credits" % (stage, by_stage[stage]))
    if unknown:
        print("  plus quote-only items: %s" % ", ".join(str(u) for u in unknown))
    print("  total      ~%d credits (+ quote-only items)" % sum(by_stage.values()))
    print("\nNext: python3 scripts/plan.py commands %s --stage <stage>  -> run each quote, add them up, ask the user." % a.brief)
    return 1 if rep.errors() else 0


if __name__ == "__main__":
    sys.exit(main())
