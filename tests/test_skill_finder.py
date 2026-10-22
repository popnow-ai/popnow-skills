"""Offline tests for popnow-skill-finder, the setup script and the plugin manifests. No network, no credits.

Run: python3 -m unittest discover -s tests -v
"""

import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FINDER = os.path.join(ROOT, "skills", "popnow-skill-finder")
sys.path.insert(0, os.path.join(FINDER, "scripts"))

import find_skills  # noqa: E402

KEY = "sk-popnow-" + "1" * 48
API = "https://api.test"
STORAGE = "https://storage.test/agent-skills/demo.zip?sig=abc"


def envelope(data, code=200):
    return json.dumps({"code": code, "msg": "success" if code == 200 else "Not found", "data": data,
                       "request_id": "req_test"}).encode()


def make_zip(entries):
    """entries: list of (name, bytes or None for a directory, unix mode or None)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data, mode in entries:
            info = zipfile.ZipInfo(name)
            if mode is not None:
                info.external_attr = mode << 16
            zf.writestr(info, data or b"")
    return buf.getvalue()


GOOD_ZIP = make_zip([
    ("popnow-demo/SKILL.md", b"---\nname: popnow-demo\ndescription: Demo.\n---\n", 0o100644),
    ("popnow-demo/scripts/run.sh", b"#!/bin/sh\necho hi\n", 0o100755),
])

DETAIL = {"slug": "demo", "name": "Demo Reel", "version": "1.0.0", "summary": "A demo.", "type": "video",
          "tasks": ["product-video"], "popnow": ["video"], "popnowRequired": True, "requires": ["node"],
          "preview": {"video": "https://media.test/demo.mp4"},
          "install": {"folder": "popnow-demo", "downloadPath": "/api/v1/agent-skills/demo/download", "agents": []}}


class FakeHTTP:
    """Replaces find_skills.http_get: routes by URL prefix and records every request."""

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, headers, timeout=60):
        self.calls.append((url, dict(headers)))
        for prefix, response in self.routes:
            if url.startswith(prefix):
                return response
        raise AssertionError("unexpected request: " + url)


class FinderTestCase(unittest.TestCase):
    def setUp(self):
        self.orig = find_skills.http_get
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        find_skills.http_get = self.orig
        shutil.rmtree(self.tmp, ignore_errors=True)

    def fake(self, routes):
        fake = FakeHTTP(routes)
        find_skills.http_get = fake
        return fake

    def client(self):
        return find_skills.Client(api_key=KEY, base_url=API)


class SearchTests(FinderTestCase):
    def test_search_sends_query_type_and_key_to_the_api(self):
        fake = self.fake([(API + "/api/v1/agent-skills?", (200, {}, envelope({"items": [DETAIL], "total": 1})))])
        data = self.client().search("product launch video", "video")
        self.assertEqual(data["total"], 1)
        url, headers = fake.calls[0]
        self.assertIn("q=product+launch+video", url)
        self.assertIn("type=video", url)
        self.assertEqual(headers["Authorization"], "Bearer " + KEY)
        self.assertTrue(headers["User-Agent"].startswith("popnow-skill-finder/"))

    def test_options_show_preview_generation_and_requirements(self):
        lines = []
        find_skills.print_options({"items": [DETAIL]}, 4, out=lines.append)
        text = "\n".join(lines)
        for expected in ("Demo Reel", "[demo]", "https://media.test/demo.mp4", "video", "node", "free"):
            self.assertIn(expected, text)

    def test_api_error_carries_code_and_hint(self):
        self.fake([(API, (404, {}, envelope(None, code=404)))])
        with self.assertRaises(find_skills.APIError) as ctx:
            self.client().detail("nope")
        self.assertIn("search", str(ctx.exception))
        self.assertIn("req_test", str(ctx.exception))


class InstallTests(FinderTestCase):
    def routes(self, archive=GOOD_ZIP):
        return [
            (API + "/api/v1/agent-skills/demo/download", (302, {"Location": STORAGE}, b"")),
            (API + "/api/v1/agent-skills/demo", (200, {}, envelope(DETAIL))),
            (STORAGE, (200, {}, archive)),
        ]

    def test_key_never_reaches_the_storage_host(self):
        fake = self.fake(self.routes())
        final = find_skills.install(self.client(), "demo", self.tmp, out=lambda *_: None)
        self.assertEqual(final, os.path.join(self.tmp, "popnow-demo"))
        storage_calls = [h for u, h in fake.calls if u.startswith("https://storage.test")]
        api_calls = [h for u, h in fake.calls if u.startswith(API)]
        self.assertEqual(len(storage_calls), 1)
        self.assertNotIn("Authorization", storage_calls[0])
        self.assertTrue(all(h.get("Authorization") == "Bearer " + KEY for h in api_calls))
        self.assertTrue(os.path.isfile(os.path.join(final, "SKILL.md")))
        mode = os.stat(os.path.join(final, "scripts", "run.sh")).st_mode
        self.assertTrue(mode & stat.S_IXUSR)
        self.assertEqual(sorted(os.listdir(self.tmp)), ["popnow-demo"], "staging folder left behind")

    def test_existing_copy_needs_force(self):
        self.fake(self.routes())
        os.makedirs(os.path.join(self.tmp, "popnow-demo"))
        with self.assertRaises(find_skills.UsageError):
            find_skills.install(self.client(), "demo", self.tmp, out=lambda *_: None)
        find_skills.install(self.client(), "demo", self.tmp, force=True, out=lambda *_: None)
        self.assertTrue(os.path.isfile(os.path.join(self.tmp, "popnow-demo", "SKILL.md")))

    def test_dry_run_downloads_and_writes_nothing(self):
        fake = self.fake(self.routes())
        target = os.path.join(self.tmp, "skills")
        find_skills.install(self.client(), "demo", target, dry_run=True, out=lambda *_: None)
        self.assertFalse(os.path.exists(target))
        self.assertFalse(any("download" in u or "storage" in u for u, _ in fake.calls))

    def test_non_https_redirect_is_refused(self):
        self.fake([(API + "/api/v1/agent-skills/demo/download", (302, {"Location": "http://storage.test/x.zip"}, b"")),
                   (API + "/api/v1/agent-skills/demo", (200, {}, envelope(DETAIL)))])
        with self.assertRaises(find_skills.APIError):
            find_skills.install(self.client(), "demo", self.tmp, out=lambda *_: None)
        self.assertEqual(os.listdir(self.tmp), [])

    def test_unsafe_archives_are_rejected_before_writing(self):
        bad = {
            "traversal": make_zip([("popnow-demo/SKILL.md", b"x", None), ("popnow-demo/../../evil", b"x", None)]),
            "absolute": make_zip([("/etc/evil", b"x", None)]),
            "other top folder": make_zip([("popnow-demo/SKILL.md", b"x", None), ("other/SKILL.md", b"x", None)]),
            "symlink": make_zip([("popnow-demo/SKILL.md", b"x", None), ("popnow-demo/link", b"/etc/passwd", 0o120777)]),
            "no SKILL.md": make_zip([("popnow-demo/README.md", b"x", None)]),
        }
        for label, archive in bad.items():
            with self.subTest(label):
                path = os.path.join(self.tmp, "a.zip")
                with open(path, "wb") as fh:
                    fh.write(archive)
                with self.assertRaises(find_skills.UsageError):
                    find_skills.check_archive(path, "popnow-demo")

    def test_agent_folders(self):
        home = os.path.expanduser("~")
        self.assertEqual(find_skills.skills_dir("claude"), os.path.join(home, ".claude", "skills"))
        self.assertEqual(find_skills.skills_dir("github-copilot", project=True, cwd="/p"), "/p/.github/skills")
        self.assertEqual(find_skills.skills_dir(None, directory="/x/skills"), "/x/skills")
        with self.assertRaises(find_skills.UsageError):
            find_skills.skills_dir("unknown-agent")


class FinderSkillTests(unittest.TestCase):
    def test_every_skill_has_valid_frontmatter(self):
        names = sorted(d for d in os.listdir(os.path.join(ROOT, "skills")) if not d.startswith("."))
        self.assertIn("popnow-skill-finder", names)
        for skill in names:
            with open(os.path.join(ROOT, "skills", skill, "SKILL.md"), encoding="utf-8") as fh:
                text = fh.read()
            match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
            self.assertIsNotNone(match, skill)
            meta = dict(line.split(": ", 1) for line in match.group(1).splitlines() if ": " in line)
            self.assertEqual(meta.get("name"), skill)
            self.assertRegex(meta["name"], r"^[a-z0-9-]{1,64}$")
            self.assertTrue(0 < len(meta.get("description", "")) <= 1024, skill)
            self.assertNotIn("<", meta["description"])

    def test_finder_playbook_covers_every_path(self):
        with open(os.path.join(FINDER, "SKILL.md"), encoding="utf-8") as fh:
            text = fh.read()
        self.assertLessEqual(len(text.splitlines()), 150)
        for needle in ("find_skills", "use_skill", "popnow skills search", "popnow skills add",
                       "scripts/find_skills.py", "/api/v1/agent-skills", "https://popnow.ai/skills/agent-skills",
                       "POPNOW_API_KEY", "free"):
            self.assertIn(needle, text)

    def test_cli_help_and_missing_key(self):
        script = os.path.join(FINDER, "scripts", "find_skills.py")
        out = subprocess.run([sys.executable, script, "--help"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)
        env = dict(os.environ)
        env.pop("POPNOW_API_KEY", None)
        out = subprocess.run([sys.executable, script, "search", "deck"], capture_output=True, text=True, env=env)
        self.assertEqual(out.returncode, 2)
        self.assertIn("POPNOW_API_KEY", out.stderr)


def setup_table():
    """host -> (personal, project) folders parsed from the setup script."""
    with open(os.path.join(ROOT, "setup"), encoding="utf-8") as fh:
        text = fh.read()
    rows = re.findall(r'^\s+([a-z|-]+)\) personal="([^"]+)"; proj="([^"]+)" ;;', text, re.M)
    return {alias: ("~/" + personal, proj) for names, personal, proj in rows for alias in names.split("|")}


@unittest.skipIf(os.name == "nt", "the setup script is POSIX sh")
class SetupScriptTests(unittest.TestCase):
    def run_setup(self, *args, home, cwd=ROOT):
        env = dict(os.environ, HOME=home)
        env.pop("POPNOW_API_KEY", None)
        return subprocess.run(["sh", os.path.join(ROOT, "setup")] + list(args), capture_output=True, text=True,
                              env=env, cwd=cwd)

    def test_folders_match_the_finder_and_the_catalog(self):
        table = setup_table()
        for agent, folders in find_skills.AGENTS.items():
            self.assertEqual(table[agent], folders, agent)
        for alias in ("claude", "codex", "cursor", "gemini", "copilot", "opencode"):
            self.assertIn(alias, table)

    def test_links_every_skill_and_is_idempotent(self):
        home = tempfile.mkdtemp()
        try:
            out = self.run_setup("--host", "claude", home=home)
            self.assertEqual(out.returncode, 0, out.stderr)
            dest = os.path.join(home, ".claude", "skills")
            skills = sorted(d for d in os.listdir(os.path.join(ROOT, "skills")) if not d.startswith("."))
            self.assertEqual(sorted(os.listdir(dest)), skills)
            self.assertTrue(all(os.path.islink(os.path.join(dest, s)) for s in skills))
            again = self.run_setup("--host", "claude", home=home)
            self.assertIn("already linked", again.stdout)
        finally:
            shutil.rmtree(home, ignore_errors=True)

    def test_project_copy_dry_run_and_errors(self):
        home, proj = tempfile.mkdtemp(), tempfile.mkdtemp()
        try:
            dry = self.run_setup("--host", "codex", "--project", "--dry-run", home=home, cwd=proj)
            self.assertEqual(dry.returncode, 0, dry.stderr)
            self.assertFalse(os.path.exists(os.path.join(proj, ".agents")))
            out = self.run_setup("--host", "copilot", "--project", "--copy", "--skill", "popnow-skill-finder",
                                 home=home, cwd=proj)
            self.assertEqual(out.returncode, 0, out.stderr)
            copied = os.path.join(proj, ".github", "skills", "popnow-skill-finder")
            self.assertTrue(os.path.isfile(os.path.join(copied, "SKILL.md")) and not os.path.islink(copied))
            skip = self.run_setup("--host", "copilot", "--project", "--copy", "--skill", "popnow-skill-finder",
                                  home=home, cwd=proj)
            self.assertIn("use --force", skip.stdout)
            self.assertEqual(self.run_setup("--host", "nope", home=home).returncode, 2)
            self.assertEqual(self.run_setup("--host", "codex", "--project", home=home, cwd=ROOT).returncode, 2)
        finally:
            shutil.rmtree(home, ignore_errors=True)
            shutil.rmtree(proj, ignore_errors=True)


class ManifestTests(unittest.TestCase):
    def load(self, path):
        with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
            return json.load(fh)

    def test_all_plugin_manifests_agree(self):
        claude = self.load(".claude-plugin/plugin.json")
        codex = self.load(".codex-plugin/plugin.json")
        cursor = self.load(".cursor-plugin/plugin.json")
        for manifest in (codex, cursor):
            self.assertEqual(manifest["name"], claude["name"])
            self.assertEqual(manifest["version"], claude["version"])
            self.assertRegex(manifest["name"], r"^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$")
            self.assertEqual(manifest["skills"], "./skills/")
        for path in (codex["interface"]["logo"], codex["interface"]["composerIcon"], cursor["logo"]):
            self.assertTrue(os.path.isfile(os.path.join(ROOT, path)), path)
        self.assertEqual(self.load(".claude-plugin/marketplace.json")["plugins"][0]["version"], claude["version"])


if __name__ == "__main__":
    unittest.main()
