#!/usr/bin/env python3
"""Token exporter: DESIGN.md <-> tokens.json (W3C design tokens, DTCG 2025.10) <-> CSS.

  python3 scripts/tokens.py export DESIGN.md --json brand/tokens.json --css brand/tokens.css [--tailwind]
  python3 scripts/tokens.py import brand/tokens.json --design DESIGN.md
  python3 scripts/tokens.py from-css src/theme.css --design DESIGN.md [--name "Brand"]
  python3 scripts/tokens.py check DESIGN.md [--json brand/tokens.json] [--css brand/tokens.css]

DESIGN.md is the source of truth. `import` and `from-css` rewrite only the YAML
front matter and keep the prose. `check` proves the round trip is lossless and
that exported files are not stale. Standard library only.
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brandkit_lib as bk  # noqa: E402

SKELETON = """# {name}

## Overview

TODO: who it is for, the personality in three words, what it must never look like.

## Colors

TODO: one line per colour role, with the token name and where it is used.

## Typography

TODO: families, licences, where each level is used.

## Layout

TODO: grid, spacing rhythm, density.

## Elevation & Depth

TODO: how depth is shown (shadows, tonal layers or borders).

## Shapes

TODO: corner radius language.

## Components

TODO: buttons, inputs, cards and their states.

## Logo

TODO: files, minimum size, clear space, misuse.

## Iconography

TODO: grid, stroke, corners, fill rules.

## Voice & Tone

TODO: attributes and do / don't examples.

## Do's and Don'ts

TODO: the guardrails an agent must not break.
"""


def dtcg_text(tokens):
    return json.dumps(bk.design_to_dtcg(tokens), indent=2, ensure_ascii=False) + "\n"


def write(path, text):
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def load_ok(path):
    if not os.path.exists(path):
        print("No such file: %s" % path, file=sys.stderr)
        return None
    design = bk.load_design(path)
    if design.errors:
        for rule, msg in design.errors:
            print("ERROR %s: %s" % (rule, msg), file=sys.stderr)
        return None
    return design


def update_design(path, new_tokens, name=None):
    """Replace the front matter of DESIGN.md (or create one) and keep the prose."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
        _, body = bk.split_frontmatter(text)
        old = bk.Design(text, path)
        if old.blocks:
            body = bk.remove_yaml_blocks(body, set(bk.SCHEMA_KEYS) | {"brand"})
            print("Note: interleaved yaml blocks were folded into the front matter.")
    else:
        body = SKELETON.format(name=new_tokens.get("name") or name or "Brand")
    if name:
        new_tokens["name"] = name
    new_tokens.setdefault("version", "alpha")
    bk.write_design(path, bk.order_tokens(new_tokens), "\n" + body.lstrip("\n"))


def cmd_export(a):
    design = load_ok(a.design)
    if design is None:
        return 2
    wrote = False
    if a.json:
        write(a.json, dtcg_text(design.tokens))
        print("wrote %s" % a.json)
        wrote = True
    if a.css:
        write(a.css, bk.design_to_css(design.tokens, tailwind=a.tailwind))
        print("wrote %s" % a.css)
        wrote = True
    if not wrote:
        sys.stdout.write(dtcg_text(design.tokens))
    return 0


def cmd_import(a):
    try:
        with open(a.tokens, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
    except (OSError, ValueError) as exc:
        print("Cannot read %s: %s" % (a.tokens, exc), file=sys.stderr)
        return 2
    tokens = bk.dtcg_to_design(doc)
    if os.path.exists(a.design):
        old = bk.load_design(a.design)
        # keep keys the token file does not carry (for example a hand-written brand block)
        for k, v in old.tokens.items():
            tokens.setdefault(k, v)
    update_design(a.design, tokens, a.name)
    print("updated %s" % a.design)
    return 0


def cmd_from_css(a):
    try:
        with open(a.css_file, "r", encoding="utf-8") as fh:
            css = fh.read()
    except OSError as exc:
        print("Cannot read %s: %s" % (a.css_file, exc), file=sys.stderr)
        return 2
    found = bk.css_to_design(css)
    if not found:
        print("No custom properties (--color-*, --text-*, --radius-*, --spacing-*, --shadow-*, --font-*) found.", file=sys.stderr)
        return 1
    tokens = {}
    if os.path.exists(a.design):
        tokens = bk.load_design(a.design).tokens
    merged = bk.deep_merge(tokens, found)
    update_design(a.design, merged, a.name)
    counts = ", ".join("%d %s" % (len(v), k) for k, v in found.items() if isinstance(v, dict))
    print("updated %s (%s)" % (a.design, counts))
    return 0


def _strip_floats(o):
    if isinstance(o, float) and o == int(o):
        return int(o)
    if isinstance(o, dict):
        return {k: _strip_floats(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_strip_floats(v) for v in o]
    return o


def cmd_check(a):
    design = load_ok(a.design)
    if design is None:
        return 2
    code = 0
    before = _strip_floats(bk.order_tokens(design.tokens))
    after = _strip_floats(bk.order_tokens(bk.dtcg_to_design(json.loads(dtcg_text(design.tokens)))))
    if before != after:
        code = 1
        print("FAIL round trip DESIGN.md -> tokens.json -> DESIGN.md changed values:")
        for key in sorted(set(before) | set(after)):
            if before.get(key) != after.get(key):
                print("  %s:\n    before %s\n    after  %s" % (key, json.dumps(before.get(key))[:300], json.dumps(after.get(key))[:300]))
    else:
        print("ok   round trip is lossless")
    for path, fresh in ((a.json, lambda: dtcg_text(design.tokens)), (a.css, lambda: bk.design_to_css(design.tokens, tailwind=a.tailwind))):
        if not path:
            continue
        if not os.path.exists(path):
            print("FAIL %s does not exist; run export" % path)
            code = 1
            continue
        with open(path, "r", encoding="utf-8") as fh:
            if fh.read() != fresh():
                print("FAIL %s is stale; re-run: python3 scripts/tokens.py export %s ..." % (path, a.design))
                code = 1
            else:
                print("ok   %s matches DESIGN.md" % path)
    return code


def main(argv=None):
    ap = argparse.ArgumentParser(description="DESIGN.md <-> tokens.json <-> CSS")
    sub = ap.add_subparsers(dest="cmd")
    e = sub.add_parser("export", help="DESIGN.md -> tokens.json and/or tokens.css")
    e.add_argument("design")
    e.add_argument("--json")
    e.add_argument("--css")
    e.add_argument("--tailwind", action="store_true", help="wrap variables in a Tailwind v4 @theme block")
    i = sub.add_parser("import", help="tokens.json -> DESIGN.md front matter")
    i.add_argument("tokens")
    i.add_argument("--design", required=True)
    i.add_argument("--name")
    c = sub.add_parser("from-css", help="CSS custom properties -> DESIGN.md front matter")
    c.add_argument("css_file")
    c.add_argument("--design", required=True)
    c.add_argument("--name")
    k = sub.add_parser("check", help="lossless round trip + stale export check")
    k.add_argument("design")
    k.add_argument("--json")
    k.add_argument("--css")
    k.add_argument("--tailwind", action="store_true")
    a = ap.parse_args(argv)
    if a.cmd == "export":
        return cmd_export(a)
    if a.cmd == "import":
        return cmd_import(a)
    if a.cmd == "from-css":
        return cmd_from_css(a)
    if a.cmd == "check":
        return cmd_check(a)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
