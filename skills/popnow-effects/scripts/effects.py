#!/usr/bin/env python3
"""Apply PopNow trending video effects and photo styles to a photo.

An effect is a ready-made recipe from https://popnow.ai/effects: a model, a
platform-written prompt and locked settings. This script turns the effect plus
the user's photo into an ordinary PopNow task (quote -> createTask -> poll), so
the price and result are the same as on the website.

Dependency-free (Python 3.8+ standard library). Needs POPNOW_API_KEY.
Uses popnow.py from the same folder for the HTTP calls.

  effects.py list [--category weather] [--search zombie] [--popular]
  effects.py show "Zombie Turn"
  effects.py quote zombie-turn --image ./me.jpg
  effects.py create zombie-turn --image ./me.jpg --confirm-credits 28 --download ./out

Always quote first, tell the user the credit price and create only after they
agree. `create` refuses to start when the price is above --confirm-credits.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import popnow  # noqa: E402  (sibling module, shipped in this folder)

EFFECTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references", "effects.json")
PAGE_BASE = "https://popnow.ai/effects/"


def load_effects(path=None):
    with open(path or EFFECTS_FILE, "r", encoding="utf-8") as fh:
        return json.load(fh)["effects"]


def _norm(text):
    return "".join(ch for ch in text.lower().strip() if ch not in " -_")


def find_effect(query, effects):
    """Exact slug or name first (ignoring case, spaces and hyphens), then a unique substring match.

    Returns (effect, candidates): effect is None when nothing or several matched.
    """
    q = _norm(query)
    if not q:
        return None, []
    for fx in effects:
        if fx["slug"] == query or _norm(fx["slug"]) == q or _norm(fx["name"]) == q:
            return fx, []
    hits = [fx for fx in effects if q in _norm(fx["slug"]) or q in _norm(fx["name"])]
    if len(hits) == 1:
        return hits[0], []
    return None, hits


def require_effect(query, effects):
    fx, hits = find_effect(query, effects)
    if fx:
        return fx
    if hits:
        names = ", ".join("%s (%s)" % (h["name"], h["slug"]) for h in hits[:12])
        raise popnow.UsageError("%r matches several effects: %s" % (query, names))
    raise popnow.UsageError("No effect called %r. See them all with: effects.py list" % query)


def effect_body(fx, image_ref, callback=None):
    """The createTask body for one effect applied to one photo."""
    inp = dict(fx["input"])
    inp["prompt"] = fx["prompt"]
    inp[fx["imageField"]] = [image_ref] if fx.get("imageArray") else image_ref
    return popnow.task_body(fx["model"], inp, callback)


def cmd_list(args):
    effects = load_effects()
    rows = [
        fx for fx in effects
        if (not args.category or fx["category"] == args.category)
        and (not args.kind or fx["kind"] == args.kind)
        and (not args.popular or fx.get("popular"))
        and (not args.search or _norm(args.search) in _norm(fx["slug"] + fx["name"] + fx["description"]))
    ]
    if args.json:
        popnow.emit([{k: fx[k] for k in ("slug", "name", "description", "category", "kind", "model", "popular")} for fx in rows])
        return 0
    for fx in rows:
        star = "*" if fx.get("popular") else " "
        print("%s %-26s %-28s %-9s %-5s %s" % (star, fx["slug"], fx["name"][:28], fx["category"], fx["kind"], fx["description"]))
    cats = sorted({fx["category"] for fx in effects})
    print("%d effects (* = popular). Categories: %s" % (len(rows), ", ".join(cats)))
    return 0


def cmd_show(args):
    fx = require_effect(args.effect, load_effects())
    if args.json:
        popnow.emit(dict(fx, page=PAGE_BASE + fx["slug"]))
        return 0
    print("Effect:     %s (%s)" % (fx["name"], fx["slug"]))
    print("What:       %s" % fx["description"])
    seconds = fx["input"].get("duration_seconds")
    made = "a %s-second video" % seconds if fx["kind"] == "video" and seconds else ("a video" if fx["kind"] == "video" else "an image")
    print("Makes:      %s with %s (%s)" % (made, fx["modelName"], fx["model"]))
    print("Settings:   %s" % json.dumps(fx["input"]))
    print("Sample:     %s" % fx.get("preview"))
    print("Page:       %s%s" % (PAGE_BASE, fx["slug"]))
    print("Price:      run `effects.py quote %s --image <photo>` for the exact credits" % fx["slug"])
    return 0


def _client(args):
    return popnow.Client(language=args.language)


def cmd_quote(args):
    fx = require_effect(args.effect, load_effects())
    client = _client(args)
    body = effect_body(fx, popnow.resolve_media(client, args.image), args.callback)
    q = popnow.quote(client, body)
    try:
        bal = popnow.balance(client)
    except popnow.PopNowError:
        bal = None
    if args.json:
        popnow.emit({"effect": fx["slug"], "quote": q, "balance": bal, "request": body})
        return 0
    print("Effect:     %s (%s)" % (fx["name"], fx["slug"]))
    print(popnow.describe_quote(q, bal))
    print("Tip:        reuse the same photo reference in `create`: %s" % body["input"][fx["imageField"]])
    return 0


def cmd_create(args):
    fx = require_effect(args.effect, load_effects())
    client = _client(args)
    body = effect_body(fx, popnow.resolve_media(client, args.image), args.callback)
    if not args.json:
        print("Effect:     %s (%s) on %s" % (fx["name"], fx["slug"], fx["model"]))
    return popnow.run_create(client, body, args)


def build_parser():
    parser = argparse.ArgumentParser(
        prog="effects.py",
        description="Apply PopNow trending video effects and photo styles (Tiny Planet, Zombie Turn, Clay Figure ...) "
        "to a photo. Needs POPNOW_API_KEY. Quote first; create only after the user agrees to the credit price.",
        epilog="Browse with samples: https://popnow.ai/effects",
    )
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true", help="Print raw JSON instead of a summary")
    common.add_argument("--language", help="Accept-Language for error messages")
    sub = parser.add_subparsers(dest="command", metavar="command")

    p = sub.add_parser("list", parents=[common], help="List effects")
    p.add_argument("--category", help="camera, weather, transform, fun, moves, film, photo, fashion or product")
    p.add_argument("--kind", choices=("video", "image"), help="video effects or image styles")
    p.add_argument("--search", help="Text to look for in the name or description")
    p.add_argument("--popular", action="store_true", help="Only popular effects")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("show", parents=[common], help="Show one effect: what it does, its model and sample")
    p.add_argument("effect", help="Slug or name, e.g. tiny-planet or \"Tiny Planet\"")
    p.set_defaults(func=cmd_show)

    for name, func, text in (
        ("quote", cmd_quote, "Exact credit price of an effect on a photo (charges nothing)"),
        ("create", cmd_create, "Start the effect after the price check against --confirm-credits"),
    ):
        p = sub.add_parser(name, parents=[common], help=text, description=text)
        p.add_argument("effect", help="Slug or name")
        p.add_argument("--image", required=True, help="The photo: https URL, popnow:// URI or local file (uploaded first)")
        p.add_argument("--callback", help="Public HTTPS callBackUrl for the finished task")
        if name == "create":
            popnow.add_create_flags(p)
        p.set_defaults(func=func)
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return popnow.EXIT_USAGE
    try:
        result = args.func(args)
        return result if isinstance(result, int) else 0
    except popnow.UsageError as exc:
        popnow.log("Error: %s" % exc)
        return popnow.EXIT_USAGE
    except popnow.ConfirmationNeeded as exc:
        popnow.log(str(exc))
        return popnow.EXIT_CONFIRM
    except popnow.PopNowError as exc:
        popnow.log("PopNow error: %s" % exc)
        return popnow.EXIT_API


if __name__ == "__main__":
    sys.exit(main())
