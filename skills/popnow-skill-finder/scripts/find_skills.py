#!/usr/bin/env python3
"""Find, inspect and install free PopNow Agent Skills (style presets) from the open API.

Dependency-free: Python 3.8+ standard library only (urllib, zipfile).

Authentication: export POPNOW_API_KEY="sk-popnow-..." (create one at
https://popnow.ai/api/console/keys). Optional: POPNOW_BASE_URL (default
https://api.popnow.ai). The key is sent only to the API base URL; the package
download is a short-lived signed link that is fetched without it.

Using a skill is free. Only the images, video, music or voice a skill makes
through PopNow cost credits, and those are quoted before anything is spent.

  find_skills.py search "product launch video" --type video --limit 4
  find_skills.py info <slug>
  find_skills.py install <slug> --agent claude-code [--project] [--dry-run] [--force]
  find_skills.py install <slug> --dir ./my-skills

Exit codes: 0 ok, 1 API or network error, 2 bad usage or a refused install.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import stat
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile

VERSION = "1.0.0"
DEFAULT_BASE_URL = "https://api.popnow.ai"
USER_AGENT = "popnow-skill-finder/%s (+https://github.com/popnow-ai/popnow-skills)" % VERSION
CATALOG_URL = "https://popnow.ai/skills/agent-skills"
KEYS_URL = "https://popnow.ai/api/console/keys"
TYPES = ("video", "image", "slides", "web")
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_FILES = 5000

# Where each agent looks for skills: (personal folder, project folder). Same table as the PopNow catalog.
AGENTS = {
    "claude-code": ("~/.claude/skills", ".claude/skills"),
    "codex": ("~/.agents/skills", ".agents/skills"),
    "cursor": ("~/.cursor/skills", ".cursor/skills"),
    "gemini-cli": ("~/.gemini/skills", ".gemini/skills"),
    "github-copilot": ("~/.copilot/skills", ".github/skills"),
    "opencode": ("~/.config/opencode/skills", ".opencode/skills"),
}
ALIASES = {"claude": "claude-code", "gemini": "gemini-cli", "copilot": "github-copilot"}


class UsageError(Exception):
    """Bad input or a refused action (exit code 2)."""


class APIError(Exception):
    """The API or the network failed (exit code 1)."""

    def __init__(self, message, status=None, code=None, request_id=None):
        super().__init__(message)
        self.status, self.code, self.request_id = status, code, request_id

    def __str__(self):
        msg = super().__str__()
        extra = []
        if self.code is not None:
            extra.append("code %s" % self.code)
        if self.request_id:
            extra.append("request_id %s" % self.request_id)
        hint = {401: " Check POPNOW_API_KEY (keys: %s)." % KEYS_URL,
                404: " Unknown skill; run `search` to see the slugs.",
                429: " Too many requests; wait a minute and try again."}.get(self.status, "")
        return msg + (" (%s)" % ", ".join(extra) if extra else "") + hint


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never follow redirects automatically: the API key must not travel to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)


def http_get(url, headers, timeout=60):
    """GET without following redirects. Returns (status, headers, body bytes). Tests replace this."""
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with _OPENER.open(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers.items()), resp.read(MAX_ARCHIVE_BYTES + 1)
    except urllib.error.HTTPError as err:
        return err.code, dict(err.headers.items()) if err.headers else {}, err.read() or b""
    except (urllib.error.URLError, OSError) as err:
        raise APIError("Network error talking to %s: %s" % (urllib.parse.urlsplit(url).netloc, err))


def _header(headers, name):
    for key, value in headers.items():
        if key.lower() == name.lower():
            return value
    return None


class Client:
    def __init__(self, api_key=None, base_url=None):
        self.api_key = api_key if api_key is not None else os.environ.get("POPNOW_API_KEY", "").strip()
        self.base_url = (base_url or os.environ.get("POPNOW_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        if not self.api_key:
            raise UsageError("POPNOW_API_KEY is not set. Ask the user to create a key at %s and run "
                             "`export POPNOW_API_KEY=\"sk-popnow-...\"` in their shell. Never paste the key into the chat." % KEYS_URL)

    def _api_headers(self):
        return {"Authorization": "Bearer " + self.api_key, "Accept": "application/json", "User-Agent": USER_AGENT}

    def get_json(self, path, params=None):
        query = urllib.parse.urlencode({k: v for k, v in (params or {}).items() if v not in (None, "")})
        url = self.base_url + path + ("?" + query if query else "")
        status, headers, body = http_get(url, self._api_headers())
        return parse_envelope(status, body)

    def search(self, query="", type_=None, task=None):
        return self.get_json("/api/v1/agent-skills", {"q": query, "type": type_, "task": task})

    def detail(self, slug):
        return self.get_json("/api/v1/agent-skills/" + urllib.parse.quote(slug, safe=""))

    def signed_download_url(self, slug):
        """Ask the API for the package. It answers 302 with a short-lived signed link, which is returned, not followed."""
        url = "%s/api/v1/agent-skills/%s/download" % (self.base_url, urllib.parse.quote(slug, safe=""))
        status, headers, body = http_get(url, self._api_headers())
        if status in (301, 302, 303, 307, 308):
            location = _header(headers, "Location") or ""
            location = urllib.parse.urljoin(url, location)
            if urllib.parse.urlsplit(location).scheme != "https":
                raise APIError("The download link is not https; refusing to fetch it.")
            return location
        parse_envelope(status, body)  # raises with the API's message
        raise APIError("Expected a redirect to the package, got HTTP %s." % status, status=status)


def parse_envelope(status, body):
    try:
        env = json.loads(body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        raise APIError("Unexpected response (HTTP %s) from the PopNow API." % status, status=status)
    if not isinstance(env, dict):
        raise APIError("Unexpected response (HTTP %s) from the PopNow API." % status, status=status)
    if status >= 400 or env.get("code") not in (None, 200):
        raise APIError(env.get("msg") or "HTTP %s" % status, status=status, code=env.get("code"), request_id=env.get("request_id"))
    return env.get("data")


def fetch_package(signed_url, dest):
    """Download the signed link into `dest` with no Authorization header."""
    status, headers, body = http_get(signed_url, {"User-Agent": USER_AGENT})
    if status != 200:
        raise APIError("The package download failed (HTTP %s). Signed links expire after a few minutes; run install again." % status, status=status)
    if len(body) > MAX_ARCHIVE_BYTES:
        raise APIError("The package is larger than %d MB; refusing to unpack it." % (MAX_ARCHIVE_BYTES // (1024 * 1024)))
    with open(dest, "wb") as fh:
        fh.write(body)


def check_archive(path, folder):
    """Validate the zip before anything is written: one top folder `folder/` with SKILL.md, no unsafe paths or links."""
    try:
        zf = zipfile.ZipFile(path)
    except zipfile.BadZipFile:
        raise UsageError("The download is not a valid zip archive.")
    with zf:
        infos = zf.infolist()
        if not infos or len(infos) > MAX_FILES:
            raise UsageError("The archive is empty or has too many files.")
        total = 0
        for info in infos:
            name = info.filename.replace("\\", "/")
            parts = [p for p in name.split("/") if p]
            if name.startswith("/") or (parts and ":" in parts[0]) or ".." in parts or not parts:
                raise UsageError("Unsafe path in the archive: %r" % info.filename)
            if parts[0] != folder:
                raise UsageError("The archive must contain only the folder %s/ (found %r)." % (folder, info.filename))
            if stat.S_ISLNK(info.external_attr >> 16):
                raise UsageError("The archive contains a symbolic link (%r); refusing to unpack it." % info.filename)
            total += info.file_size
        if total > MAX_ARCHIVE_BYTES:
            raise UsageError("The archive unpacks to more than %d MB; refusing it." % (MAX_ARCHIVE_BYTES // (1024 * 1024)))
        if folder + "/SKILL.md" not in {i.filename.replace("\\", "/") for i in infos}:
            raise UsageError("The archive has no %s/SKILL.md." % folder)


def skills_dir(agent=None, project=False, directory=None, cwd=None):
    if directory:
        return os.path.abspath(os.path.expanduser(directory))
    if not agent:
        raise UsageError("Pass --agent (%s) or --dir <skills folder>." % ", ".join(AGENTS))
    agent = ALIASES.get(agent, agent)
    if agent not in AGENTS:
        raise UsageError("Unknown agent %r. Use one of: %s." % (agent, ", ".join(AGENTS)))
    personal, proj = AGENTS[agent]
    if project:
        return os.path.abspath(os.path.join(cwd or os.getcwd(), proj))
    return os.path.abspath(os.path.expanduser(personal))


def install(client, slug, target_dir, force=False, dry_run=False, out=print):
    d = client.detail(slug)
    inst = (d or {}).get("install") or {}
    folder = inst.get("folder") or "popnow-" + slug
    if "/" in folder or folder in (".", "..") or not folder:
        raise UsageError("The catalog returned an invalid folder name: %r" % folder)
    final = os.path.join(target_dir, folder)
    if not inst.get("downloadPath"):
        cmd = next((a.get("command") for a in inst.get("agents") or [] if a.get("command")), "")
        raise UsageError("%s is not served by the download endpoint. Install it this way instead:\n%s" % (slug, cmd))
    if os.path.lexists(final) and not force:
        raise UsageError("%s is already installed at %s. Pass --force to replace it." % (folder, final))
    if dry_run:
        out("Would install %s (%s) into %s" % (d.get("name") or slug, d.get("version") or "?", final))
        return final
    os.makedirs(target_dir, exist_ok=True)
    stage = tempfile.mkdtemp(prefix=".%s-" % folder, dir=target_dir)
    try:
        archive = os.path.join(stage, "package.zip")
        fetch_package(client.signed_download_url(slug), archive)
        check_archive(archive, folder)
        unpack = os.path.join(stage, "unpack")
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(unpack)
            for info in zf.infolist():
                mode = (info.external_attr >> 16) & 0o777
                if mode and not info.is_dir():
                    # Keep executable bits from the archive, never setuid or world-writable ones
                    os.chmod(os.path.join(unpack, *info.filename.split("/")), mode & 0o755)
        if os.path.lexists(final):
            if os.path.islink(final) or os.path.isfile(final):
                os.remove(final)
            else:
                shutil.rmtree(final)
        os.replace(os.path.join(unpack, folder), final)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    out("Installed %s %s into %s" % (folder, d.get("version") or "", final))
    out("Read %s/SKILL.md and follow it. If your agent lists skills only at startup, restart it to see %s." % (final, folder))
    return final


def print_options(data, limit, out=print):
    items = (data or {}).get("items") or []
    if not items:
        out("No skills match. Try other words, a --type (%s), or browse %s" % (", ".join(TYPES), CATALOG_URL))
        return
    for n, s in enumerate(items[:limit], 1):
        preview = (s.get("preview") or {})
        out("%d. %s  [%s]" % (n, s.get("name"), s.get("slug")))
        out("   %s" % (s.get("summary") or ""))
        if preview.get("video") or preview.get("image"):
            out("   Preview: %s" % (preview.get("video") or preview.get("image")))
        media = ", ".join(s.get("popnow") or [])
        if media:
            out("   PopNow generation: %s (%s; quoted before anything is spent)" % (media, "required" if s.get("popnowRequired") else "optional"))
        if s.get("requires"):
            out("   Needs locally: %s" % ", ".join(s["requires"]))
        if s.get("url"):
            out("   Page: %s" % s["url"])
    out("\nSkills are free; only PopNow generations cost credits. Ask the user which one, then run: install <slug> --agent <id>")


def print_detail(d, out=print):
    out("%s  [%s]  v%s" % (d.get("name"), d.get("slug"), d.get("version")))
    out(d.get("summary") or "")
    for line in d.get("bestFor") or []:
        out("  - " + line)
    preview = d.get("preview") or {}
    if preview.get("video") or preview.get("image"):
        out("Preview: %s" % (preview.get("video") or preview.get("image")))
    out("Type: %s; tasks: %s" % (d.get("type"), ", ".join(d.get("tasks") or [])))
    if d.get("popnow"):
        out("PopNow generation: %s (%s)" % (", ".join(d["popnow"]), "required" if d.get("popnowRequired") else "optional"))
    if d.get("requires"):
        out("Needs locally: %s" % ", ".join(d["requires"]))
    inst = d.get("install") or {}
    out("Installs as: %s/" % (inst.get("folder") or "popnow-" + str(d.get("slug"))))
    for a in inst.get("agents") or []:
        out("  %-15s %-28s project: %-18s call: %s" % (a.get("id"), a.get("personalDir"), a.get("projectDir"), a.get("invoke")))


def build_parser():
    p = argparse.ArgumentParser(prog="find_skills.py", description="Find and install free PopNow Agent Skills. Needs POPNOW_API_KEY.")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search", help="Search the catalog (free)")
    s.add_argument("query", nargs="*", help="What the user wants to make, in their words")
    s.add_argument("--type", choices=TYPES)
    s.add_argument("--task")
    s.add_argument("--limit", type=int, default=6)
    s.add_argument("--json", action="store_true")
    i = sub.add_parser("info", help="Show one skill and how to install it (free)")
    i.add_argument("slug")
    i.add_argument("--json", action="store_true")
    n = sub.add_parser("install", help="Download a skill with the API key and unpack it into an agent's skills folder")
    n.add_argument("slug")
    n.add_argument("--agent", help="One of: %s" % ", ".join(AGENTS))
    n.add_argument("--project", action="store_true", help="Install into the current project's folder instead of the personal one")
    n.add_argument("--dir", help="Install into this skills folder instead")
    n.add_argument("--force", action="store_true", help="Replace an installed copy")
    n.add_argument("--dry-run", action="store_true", help="Show the target folder without downloading or writing")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        client = Client()
        if args.cmd == "search":
            data = client.search(" ".join(args.query), args.type, args.task)
            if args.json:
                print(json.dumps(data, indent=2))
            else:
                print_options(data, max(1, min(args.limit, 20)))
        elif args.cmd == "info":
            d = client.detail(args.slug)
            if args.json:
                print(json.dumps(d, indent=2))
            else:
                print_detail(d)
        else:
            target = skills_dir(args.agent, args.project, args.dir)
            install(client, args.slug, target, force=args.force, dry_run=args.dry_run)
        return 0
    except UsageError as err:
        print("Error: %s" % err, file=sys.stderr)
        return 2
    except APIError as err:
        print("Error: %s" % err, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
