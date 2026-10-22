#!/usr/bin/env python3
"""Regenerate the model tables in skills/*/references/ from the live catalog.

Usage:
  python3 skills/popnow-api/scripts/popnow.py models --json > /tmp/models.json
  python3 tools/build_model_refs.py /tmp/models.json 2026-10-19

The input is the `data` object of GET /api/v1/models (fields `items[].model`,
`displayName`, `provider`, `modality`, `tasks`, `credits`,
`maxOutputDurationSeconds`, `available`).
"""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UNIT = {"per_second": "/ second", "per_image": "/ image", "per_request": "/ run", "per_1k_characters": "/ 1k chars"}

GROUPS = {
    "popnow-video": [
        ("Text to video", lambda m: m["modality"] == "video" and task(m) == "text-to-video"),
        ("Image to video", lambda m: m["modality"] == "video" and task(m) == "image-to-video"),
        ("Reference to video", lambda m: m["modality"] == "video" and task(m) == "reference-to-video"),
        ("Extend a video", lambda m: m["modality"] == "video" and task(m) == "video-extend"),
        ("Edit, animate and upscale video", lambda m: m["modality"] == "video"
         and task(m) in ("video-edit", "character-animation", "upscale")),
    ],
    "popnow-image": [
        ("Text to image", lambda m: m["modality"] == "image" and task(m) == "text-to-image"),
        ("Edit an image (prompt + source images)", lambda m: m["modality"] == "image" and task(m) == "image-to-image"),
        ("One-tap image tools", lambda m: m["modality"] == "image"
         and task(m) in ("image-edit", "upscale", "layer-decomposition")),
    ],
    "popnow-audio": [
        ("Music and sound (text to audio)", lambda m: m["modality"] == "audio" and task(m) == "text-to-audio"),
        ("Speech (text to speech)", lambda m: m["modality"] == "audio" and task(m) == "text-to-speech"),
        ("Transcription (speech to text)", lambda m: m["modality"] == "audio" and task(m) == "speech-to-text"),
        ("Sound for a video (video to audio)", lambda m: m["modality"] == "audio" and task(m) == "video-to-audio"),
    ],
}

TITLES = {"popnow-video": "PopNow video models", "popnow-image": "PopNow image models", "popnow-audio": "PopNow audio models"}


def task(m):
    tasks = m.get("tasks") or []
    return tasks[0] if tasks else m["model"].rsplit("/", 1)[-1]


def num(x):
    return ("%.2f" % x).rstrip("0").rstrip(".")


def price(m):
    c = m.get("credits") or {}
    base = "%s %s" % (num(c.get("perUnit", 0)), UNIT.get(c.get("unit"), c.get("unit", "")))
    tiers = []
    for rule in c.get("rules") or []:
        when = ", ".join(str(v) if k == "*" else "%s=%s" % (k, v) for k, v in sorted((rule.get("when") or {}).items()))
        tiers.append("%s: %s" % (when or "default", num(rule.get("perUnit", 0))))
    return base.strip(), "; ".join(tiers[:6]) + (" ..." if len(tiers) > 6 else "")


def render(skill, items, snapshot):
    out = ["# %s" % TITLES[skill], ""]
    out += ["Snapshot of `GET /api/v1/models` taken %s. Prices are in credits (1 credit = $0.001) and are the "
               "starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list "
               "is always the source of truth: `popnow.py models --modality %s`." % (snapshot, skill.split("-")[1]), ""]
    out.append("Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.")
    out.append("")
    for title, pred in GROUPS[skill]:
        rows = sorted((m for m in items if pred(m)), key=lambda m: (m.get("provider", ""), m["model"]))
        if not rows:
            continue
        out += ["## %s" % title, "", "| Model ID | Name | Maker | Price (credits) | Tiers |", "| --- | --- | --- | --- | --- |"]
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
