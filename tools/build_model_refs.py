#!/usr/bin/env python3
"""Regenerate the model tables in skills/*/references/ from the live catalog.

Usage:
  python3 skills/popnow-api/scripts/popnow.py models --json > /tmp/models.json
  python3 tools/build_model_refs.py /tmp/models.json 2026-10-19

The input is the `data` object of GET /api/v1/models (fields `items[].model`,
`displayName`, `provider`, `modality`, `tasks`, `usd`,
`maxOutputDurationSeconds`, `available`). Prices come from the `usd` rate
snapshot (exact decimal strings); a catalog from an older server that only has
the deprecated `credits` block is converted at 1 credit = $0.001.
"""

import json
import os
import sys
from decimal import Decimal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UNIT = {"per_second": "/ second", "per_image": "/ image", "per_request": "/ run", "per_1k_tokens": "/ 1k tokens", "per_1k_characters": "/ 1k chars"}

GROUPS = {
    "popnow-api": [("3D", lambda m: task(m) in ("image-to-3d", "text-to-3d")), ("Chat", lambda m: task(m) == "chat"), ("Embeddings", lambda m: task(m) == "embedding")],
    "popnow-video": [
        ("Text to video", lambda m: m["modality"] == "video" and task(m) == "text-to-video"),
        ("Image to video", lambda m: m["modality"] == "video" and task(m) == "image-to-video"),
        ("Reference to video", lambda m: m["modality"] == "video" and task(m) == "reference-to-video"),
        ("Extend a video", lambda m: m["modality"] == "video" and task(m) == "video-extend"),
        ("Edit, animate and upscale video", lambda m: m["modality"] == "video"
         and task(m) in ("video-edit", "character-animation", "upscale", "frame-interpolation", "video-face-swap", "lip-sync", "talking-avatar", "video-translate")),
    ],
    "popnow-image": [
        ("Text to image", lambda m: m["modality"] == "image" and task(m) == "text-to-image"),
        ("Edit an image (prompt + source images)", lambda m: m["modality"] == "image" and task(m) == "image-to-image"),
        ("One-tap image tools", lambda m: m["modality"] == "image"
         and task(m) in ("image-edit", "upscale", "layer-decomposition", "face-swap", "image-to-prompt", "image-to-video")),
    ],
    "popnow-audio": [
        ("Music and sound (text to audio)", lambda m: m["modality"] == "audio" and task(m) == "text-to-audio"),
        ("Speech (text to speech)", lambda m: m["modality"] == "audio" and task(m) == "text-to-speech"),
        ("Transcription (speech to text)", lambda m: m["modality"] == "audio" and task(m) in ("speech-to-text", "realtime-transcription")),
        ("Realtime speech", lambda m: task(m) == "realtime-speech"),
        ("Audio tools", lambda m: m["modality"] == "audio" and task(m) not in ("text-to-audio","text-to-speech","speech-to-text","video-to-audio","realtime-speech","realtime-transcription")),
        ("Sound for a video (video to audio)", lambda m: m["modality"] == "audio" and task(m) == "video-to-audio"),
    ],
}

TITLES = {"popnow-api": "PopNow API models","popnow-video": "PopNow video models", "popnow-image": "PopNow image models", "popnow-audio": "PopNow audio models"}


def task(m):
    tasks = m.get("tasks") or []
    return tasks[0] if tasks else m["model"].rsplit("/", 1)[-1]


def usd_text(value):
    """An exact USD decimal string as shown in the tables: "$0.0612". Never goes through float."""
    text = format(Decimal(str(value)).normalize(), "f")
    return "$" + text


def rates(m):
    """The model's USD rate snapshot, or one converted from the deprecated credits block."""
    usd = m.get("usd")
    if isinstance(usd, dict) and (usd.get("perUnit") is not None or usd.get("input") is not None):
        return usd
    credits = m.get("credits") or {}
    to_usd = lambda v: format((Decimal(str(v)) / 1000).normalize(), "f")  # noqa: E731
    out = {"unit": credits.get("unit"), "perUnit": to_usd(credits.get("perUnit", 0))}
    out["rules"] = [dict(r, perUnit=to_usd(r.get("perUnit", 0))) for r in credits.get("rules") or []]
    return out


def price(m):
    r = rates(m)
    if task(m) == "chat":
        return "input %s / output %s per million tokens" % (usd_text(r["input"]), usd_text(r["output"])), "See live schema for cache and long-context rates"
    base = "%s %s" % (usd_text(r.get("perUnit", "0")), UNIT.get(r.get("unit"), r.get("unit", "")))
    tiers = []
    for rule in r.get("rules") or []:
        when = ", ".join(str(v) if k == "*" else "%s=%s" % (k, v) for k, v in sorted((rule.get("when") or {}).items()))
        tiers.append("%s: %s" % (when or "default", usd_text(rule.get("perUnit", "0"))))
    return base.strip(), "; ".join(tiers[:6]) + (" ..." if len(tiers) > 6 else "")


def render(skill, items, snapshot):
    out = ["# %s" % TITLES[skill], ""]
    out += ["Snapshot of `GET /api/v1/models` taken %s. Prices are in USD, paid from the separate API balance, and "
               "are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live "
               "list is always the source of truth: `popnow.py models --modality %s`." % (snapshot, ("text" if skill == "popnow-api" else ("text" if skill == "popnow-api" else skill.split("-")[1]))), ""]
    out.append("Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.")
    out.append("")
    for title, pred in GROUPS[skill]:
        rows = sorted((m for m in items if pred(m)), key=lambda m: (m.get("provider", ""), m["model"]))
        if not rows:
            continue
        out += ["## %s" % title, "", "| Model ID | Name | Maker | Price (USD) | Tiers |", "| --- | --- | --- | --- | --- |"]
        for m in rows:
            base, tiers = price(m)
            if m.get("maxOutputDurationSeconds"):
                base += ", up to %ss" % m["maxOutputDurationSeconds"]
            out.append("| `%s` | %s | %s | %s | %s |" % (m["model"], m.get("displayName", ""), m.get("provider", ""), base, tiers or "-"))
        out.append("")
    return "\n".join(out)


def main(argv):
    if len(argv) not in (2, 3):
        print(__doc__)
        return 2
    with open(argv[1], "r", encoding="utf-8") as fh:
        data = json.load(fh)
    data = data.get("data", data)
    snapshot = argv[2] if len(argv) == 3 else data.get("snapshot") or "recently"
    for skill in GROUPS:
        path = os.path.join(ROOT, "skills", skill, "references", "models.md")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(render(skill, data["items"], snapshot))
        print("wrote", os.path.relpath(path, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
