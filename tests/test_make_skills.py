"""Offline checks for the "make things" skills: launch film, narrated explainer, AI assets for
HyperFrames, landing page from mockups, social covers and brand kit. No network, no credits.

Each skill's own self-tests run here when the tool they need is installed (Python always, Node.js 22+
when present). Self-tests that drive a local Chrome only run with POPNOW_BROWSER_TESTS=1.

Run: python3 -m unittest discover -s tests -v
"""

import os
import re
import shutil
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS_DIR = os.path.join(ROOT, "skills")
MAKE = ("popnow-launch-film", "popnow-narrated-explainer", "popnow-hyperframes-ai-assets",
        "popnow-landing-page-from-mockup", "popnow-social-cover-generator", "popnow-brand-kit-design-md")
FONT_EXT = (".woff2", ".woff", ".ttf", ".otf")
CJK = re.compile("[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]")

# (skill, command) pairs that need only Python or Node.js; missing FFmpeg makes them skip, not fail.
PY_SELFTESTS = (
    ("popnow-narrated-explainer", ["scripts/explainer.py", "selftest"]),
    ("popnow-brand-kit-design-md", ["scripts/selftest.py"]),
)
NODE_SELFTESTS = (
    ("popnow-hyperframes-ai-assets", ["scripts/popnow-assets.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/plan-film.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/read-product.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/share-kit.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/contact-sheet.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/mix.mjs", "--self-test"]),
    ("popnow-launch-film", ["scripts/qa-check.mjs", "--self-test"]),
    ("popnow-narrated-explainer", ["scripts/kit-selftest.mjs"]),
)
BROWSER_SELFTESTS = (
    ("popnow-launch-film", ["scripts/frame-audit.mjs", "--self-test"]),
    ("popnow-landing-page-from-mockup", ["scripts/selftest.mjs"]),
    ("popnow-social-cover-generator", ["scripts/selftest.mjs"]),
)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def frontmatter(skill):
    match = re.match(r"^---\n(.*?)\n---\n", read(os.path.join(SKILLS_DIR, skill, "SKILL.md")), re.S)
    return dict(line.split(": ", 1) for line in match.group(1).splitlines() if ": " in line)


def node_major():
    node = shutil.which("node")
    if not node:
        return 0
    out = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip()
    try:
        return int(out.lstrip("v").split(".")[0])
    except ValueError:
        return 0


def skill_files(skill):
    for dirpath, dirnames, filenames in os.walk(os.path.join(SKILLS_DIR, skill)):
        dirnames[:] = [d for d in dirnames if d != "__pycache__"]
        for name in filenames:
            yield os.path.join(dirpath, name)


class MakeSkillMetadataTests(unittest.TestCase):
    def test_frontmatter_license_and_cost_rule(self):
        for skill in MAKE:
            with self.subTest(skill):
                meta = frontmatter(skill)
                self.assertEqual(meta["name"], skill)
                self.assertEqual(meta["license"], "MIT")
                desc = meta["description"]
                self.assertLessEqual(len(desc), 1024)
                self.assertIn("quotes credits before any paid run", desc)
                self.assertIn("free", desc)
                self.assertIn("1 credit = $0.001", desc)

    def test_readme_links_to_the_preview_page(self):
        for skill in MAKE:
            with self.subTest(skill):
                text = read(os.path.join(SKILLS_DIR, skill, "README.md"))
                self.assertIn("https://popnow.ai/skills/" + skill[len("popnow-"):], text)
                self.assertIn("THIRD_PARTY_NOTICES.md", text)

    def test_skill_md_stays_short(self):
        for skill in MAKE:
            with self.subTest(skill):
                self.assertLessEqual(len(read(os.path.join(SKILLS_DIR, skill, "SKILL.md")).splitlines()), 250)

    def test_every_skill_is_listed_in_readme_and_llms_txt(self):
        readme, llms = read(os.path.join(ROOT, "README.md")), read(os.path.join(ROOT, "llms.txt"))
        for skill in sorted(d for d in os.listdir(SKILLS_DIR) if not d.startswith(".")):
            with self.subTest(skill):
                self.assertIn("skills/%s/SKILL.md" % skill, readme)
                self.assertIn("skills/%s/SKILL.md" % skill, llms)


class ProvenanceAndLicenseTests(unittest.TestCase):
    def test_gsap_is_not_bundled(self):
        for skill in os.listdir(SKILLS_DIR):
            for path in skill_files(skill):
                self.assertNotRegex(os.path.basename(path).lower(), r"^gsap.*\.js$", path)

    def test_every_font_has_its_license_next_to_it_and_a_notice(self):
        notices = read(os.path.join(ROOT, "THIRD_PARTY_NOTICES.md"))
        fonts = [p for s in os.listdir(SKILLS_DIR) for p in skill_files(s) if p.endswith(FONT_EXT)]
        self.assertTrue(fonts, "expected bundled fonts in the social cover skill")
        for font in fonts:
            with self.subTest(os.path.relpath(font, ROOT)):
                folder = os.path.dirname(font)
                licenses = [f for f in os.listdir(folder) if re.search(r"(OFL|LICEN[CS]E)", f, re.I)]
                self.assertTrue(licenses, "no license file next to " + font)
                self.assertIn(os.path.basename(font), notices)
        for lic in (p for s in os.listdir(SKILLS_DIR) for p in skill_files(s) if p.endswith("-OFL.txt")):
            text = read(lic)
            self.assertTrue(text.startswith("Copyright"), lic)
            self.assertIn("SIL OPEN FONT LICENSE Version 1.1", text)

    def test_no_proprietary_license_or_non_english_text(self):
        for skill in MAKE:
            for path in skill_files(skill):
                if path.endswith(FONT_EXT):
                    continue
                with self.subTest(os.path.relpath(path, ROOT)):
                    text = read(path)
                    self.assertNotIn("Proprietary. See LICENSE.txt", text)
                    self.assertIsNone(CJK.search(text))


class SelfTests(unittest.TestCase):
    def run_cmd(self, skill, argv):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        env.pop("POPNOW_API_KEY", None)
        out = subprocess.run(argv, cwd=os.path.join(SKILLS_DIR, skill), capture_output=True, text=True,
                             env=env, timeout=600)
        self.assertEqual(out.returncode, 0, "%s %s\n%s\n%s" % (skill, " ".join(argv), out.stdout[-2000:],
                                                                out.stderr[-2000:]))

    def test_python_selftests(self):
        for skill, argv in PY_SELFTESTS:
            with self.subTest(skill=skill, cmd=argv[0]):
                self.run_cmd(skill, [sys.executable] + argv)

    @unittest.skipIf(node_major() < 22, "Node.js 22+ not installed")
    def test_node_syntax(self):
        node = shutil.which("node")
        for skill in MAKE:
            for path in skill_files(skill):
                if path.endswith((".mjs", ".js")):
                    with self.subTest(os.path.relpath(path, ROOT)):
                        out = subprocess.run([node, "--check", path], capture_output=True, text=True)
                        self.assertEqual(out.returncode, 0, out.stderr)

    @unittest.skipIf(node_major() < 22, "Node.js 22+ not installed")
    def test_node_selftests(self):
        for skill, argv in NODE_SELFTESTS:
            with self.subTest(skill=skill, cmd=argv[0]):
                self.run_cmd(skill, [shutil.which("node")] + argv)

    @unittest.skipUnless(os.environ.get("POPNOW_BROWSER_TESTS") == "1" and node_major() >= 22,
                         "set POPNOW_BROWSER_TESTS=1 to run the self-tests that drive a local Chrome")
    def test_browser_selftests(self):
        for skill, argv in BROWSER_SELFTESTS:
            with self.subTest(skill=skill, cmd=argv[0]):
                self.run_cmd(skill, [shutil.which("node")] + argv)


if __name__ == "__main__":
    unittest.main()
