#!/usr/bin/env python3
"""Copy the canonical popnow.py (skills/popnow-api/scripts) into every other skill.

Each skill folder must work on its own after being copied to ~/.claude/skills or
~/.agents/skills, so every skill ships its own identical copy of the helper.
Run this after editing skills/popnow-api/scripts/popnow.py; tests fail when a
copy drifts.
"""

import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANONICAL = os.path.join(ROOT, "skills", "popnow-api", "scripts", "popnow.py")
TARGETS = ("popnow-video", "popnow-image", "popnow-audio", "popnow-effects")


def main():
    for skill in TARGETS:
        dest = os.path.join(ROOT, "skills", skill, "scripts", "popnow.py")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(CANONICAL, dest)
        os.chmod(dest, 0o755)
        print("synced", os.path.relpath(dest, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
