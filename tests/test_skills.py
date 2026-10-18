"""Offline tests for the PopNow skills. No network, no API key, no credits spent.

Run: python3 -m unittest discover -s tests -v
"""

import filecmp
import json
import os
import re
import subprocess
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS = ("popnow-api", "popnow-video", "popnow-image", "popnow-audio", "popnow-effects")
sys.path.insert(0, os.path.join(ROOT, "skills", "popnow-effects", "scripts"))

import effects  # noqa: E402
import popnow  # noqa: E402


class FakeAPI:
    """Stands in for Client._once: routes (method, path) to canned envelopes and records calls."""

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, method, url, payload, headers, timeout):
        path = url.split("https://api.test", 1)[1].split("?")[0]
        body = json.loads(payload.decode()) if payload else None
        self.calls.append({"method": method, "path": path, "url": url, "body": body, "headers": headers})
        handler = self.routes[(method, path)]
        status, envelope = handler(body) if callable(handler) else handler
        return popnow.parse_envelope(status, json.dumps(envelope).encode(), {})

    def paths(self):
        return [c["path"] for c in self.calls]


def ok(data, status=200):
    return status, {"code": 200, "msg": "success", "data": data, "request_id": "req_test"}


def client_with(routes):
    client = popnow.Client(api_key="sk-popnow-" + "0" * 48, base_url="https://api.test")
    fake = FakeAPI(routes)
    client._once = fake
    return client, fake


QUOTE = {"quoteId": "q_1", "model": "minimax/h3/image-to-video", "maxCredits": 28, "expectedCredits": 28,
         "estimatedCost": "0.28", "maxCharge": "0.28", "currency": "USD", "quantity": "5", "unit": "per_second",
         "expiresAt": "2026-10-19T10:00:00Z"}

SCHEMA_SINGLE = {"model": "minimax/h3/image-to-video", "inputSchema": {"properties": {
    "prompt": {"type": "string"}, "image_url": {"type": "string"}, "last_image_url": {"type": "string"},
    "duration_seconds": {"type": "integer"}}}}
SCHEMA_PLURAL = {"model": "google/nano-banana-2.1/edit", "inputSchema": {"properties": {
    "prompt": {"type": "string"}, "image_urls": {"type": "array"}}}}


class Args:
    def __init__(self, **kw):
        self.__dict__.update(kw)

    def __getattr__(self, name):
        return None


class EnvelopeTests(unittest.TestCase):
    def test_success_returns_data(self):
        status, data, _ = popnow.parse_envelope(202, b'{"code":200,"msg":"success","data":{"taskId":"job_1"}}', {})
        self.assertEqual((status, data["taskId"]), (202, "job_1"))

    def test_error_carries_code_reason_and_retry_after(self):
        raw = b'{"code":429,"msg":"Too many requests","request_id":"req_9","data":{"reason":"asset_daily_limit"}}'
        with self.assertRaises(popnow.PopNowError) as ctx:
            popnow.parse_envelope(429, raw, {"Retry-After": "7"})
        err = ctx.exception
        self.assertEqual((err.code, err.reason, err.retry_after, err.request_id), (429, "asset_daily_limit", 7, "req_9"))

    def test_insufficient_balance_has_hint(self):
        with self.assertRaises(popnow.PopNowError) as ctx:
            popnow.parse_envelope(402, b'{"code":40201,"msg":"Insufficient balance"}', {})
        self.assertIn("popnow.ai/pricing", str(ctx.exception))

    def test_gateway_page_is_transport_error(self):
        with self.assertRaises(popnow.PopNowError) as ctx:
            popnow.parse_envelope(524, b"<html>timeout</html>", {})
        self.assertTrue(ctx.exception.transport)


class InputTests(unittest.TestCase):
    def test_single_image_goes_to_image_url_and_set_parses_json(self):
        client, fake = client_with({("GET", "/api/v1/models/minimax/h3/image-to-video"): ok(SCHEMA_SINGLE)})
        args = Args(model="minimax/h3/image-to-video", prompt="wave", image=["https://x.test/a.jpg"],
                    last_image="popnow://f/fil_2", duration=5, set=["generate_audio=false", "note=hello"])
        inp = popnow.build_input(client, args)
        self.assertEqual(inp, {"prompt": "wave", "duration_seconds": 5, "image_url": "https://x.test/a.jpg",
                               "last_image_url": "popnow://f/fil_2", "generate_audio": False, "note": "hello"})
        self.assertEqual(fake.paths(), ["/api/v1/models/minimax/h3/image-to-video"])

    def test_images_go_to_image_urls_when_declared(self):
        client, _ = client_with({("GET", "/api/v1/models/google/nano-banana-2.1/edit"): ok(SCHEMA_PLURAL)})
        args = Args(model="google/nano-banana-2.1/edit", prompt="p", image=["https://x.test/a.jpg", "popnow://a/ast_1"])
        self.assertEqual(popnow.build_input(client, args)["image_urls"], ["https://x.test/a.jpg", "popnow://a/ast_1"])

    def test_no_image_field_is_a_usage_error(self):
        schema = {"inputSchema": {"properties": {"prompt": {}}}}
        client, _ = client_with({("GET", "/api/v1/models/a/b/text-to-video"): ok(schema)})
        with self.assertRaises(popnow.UsageError):
            popnow.build_input(client, Args(model="a/b/text-to-video", image=["https://x.test/a.jpg"]))

    def test_missing_local_file_is_rejected(self):
        client, _ = client_with({("GET", "/api/v1/models/minimax/h3/image-to-video"): ok(SCHEMA_SINGLE)})
        with self.assertRaises(popnow.UsageError):
            popnow.build_input(client, Args(model="minimax/h3/image-to-video", image=["./does-not-exist.jpg"]))

    def test_no_schema_lookup_without_media(self):
        client, fake = client_with({})
        inp = popnow.build_input(client, Args(model="suno/v6/text-to-audio", prompt="song", lyrics="la", voice="Kore"))
        self.assertEqual(inp, {"prompt": "song", "lyrics": "la", "voice_id": "Kore"})
        self.assertEqual(fake.calls, [])


class CreateTests(unittest.TestCase):
    def test_price_above_confirmation_starts_nothing(self):
        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(dict(QUOTE, maxCredits=56))})
        body = popnow.task_body("minimax/h3/image-to-video", {"prompt": "x", "image_url": "https://x.test/a.jpg"})
        with self.assertRaises(popnow.ConfirmationNeeded) as ctx:
            popnow.create(client, body, 28)
        self.assertIn("--confirm-credits 56", str(ctx.exception))
        self.assertEqual(fake.paths(), ["/api/v1/jobs/quote"])

    def test_confirmed_create_locks_quote_and_sends_idempotency_key(self):
        accepted = {"taskId": "job_1", "state": "queued", "estimatedCredits": 28, "estimatedCost": "0.28",
                    "deadlineAt": "2026-10-19T10:30:00Z"}
        client, fake = client_with({
            ("POST", "/api/v1/jobs/quote"): ok(QUOTE),
            ("POST", "/api/v1/jobs/createTask"): ok(accepted, status=202),
        })
        body = popnow.task_body("minimax/h3/image-to-video", {"prompt": "x"}, callback="https://hooks.test/p")
        q, status, data, key = popnow.create(client, body, 28, idempotency_key="order-1", retention=3600)
        self.assertEqual((status, data["taskId"], key), (202, "job_1", "order-1"))
        sent = fake.calls[1]
        self.assertEqual(sent["body"]["quoteId"], "q_1")
        self.assertEqual(sent["body"]["expectedCredits"], 28)
        self.assertEqual(sent["body"]["callBackUrl"], "https://hooks.test/p")
        self.assertEqual(fake.calls[0]["body"]["callBackUrl"], "https://hooks.test/p")
        self.assertEqual(sent["headers"]["Idempotency-Key"], "order-1")
        self.assertEqual(sent["headers"]["X-PopNow-Retention"], "3600")
        self.assertTrue(sent["headers"]["Authorization"].startswith("Bearer sk-popnow-"))

    def test_retry_keeps_the_same_idempotency_key(self):
        attempts = []

        def flaky(body):
            attempts.append(1)
            if len(attempts) == 1:
                return 503, {"code": 503, "msg": "busy"}
            return ok({"taskId": "job_2", "state": "queued", "estimatedCredits": 28}, status=202)

        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(QUOTE), ("POST", "/api/v1/jobs/createTask"): flaky})
        orig_sleep = popnow.time.sleep
        popnow.time.sleep = lambda s: None
        try:
            popnow.create(client, popnow.task_body("m/n/t", {"prompt": "x"}), 30)
        finally:
            popnow.time.sleep = orig_sleep
        keys = [c["headers"]["Idempotency-Key"] for c in fake.calls if c["path"].endswith("createTask")]
        self.assertEqual(len(keys), 2)
        self.assertEqual(keys[0], keys[1])

    def test_confirm_credits_is_required(self):
        client, _ = client_with({})
        with self.assertRaises(popnow.UsageError):
            popnow.create(client, popnow.task_body("m/n/t", {}), None)


class WaitAndDownloadTests(unittest.TestCase):
    def test_wait_polls_until_final(self):
        states = iter(["queued", "running", "succeeded"])
        client, _ = client_with({("GET", "/api/v1/jobs/recordInfo"): lambda b: ok({"taskId": "job_1", "state": next(states)})})
        orig_sleep = popnow.time.sleep
        popnow.time.sleep = lambda s: None
        try:
            task = popnow.wait_task(client, "job_1", timeout=60, quiet=True)
        finally:
            popnow.time.sleep = orig_sleep
        self.assertEqual(task["state"], "succeeded")

    def test_extension_from_mime_or_url(self):
        self.assertEqual(popnow.extension_for("video/mp4", "https://x.test/f"), ".mp4")
        self.assertEqual(popnow.extension_for(None, "https://x.test/a/b.webp?sig=1"), ".webp")

    def test_download_refuses_unfinished_task(self):
        client, _ = client_with({})
        with self.assertRaises(popnow.PopNowError):
            popnow.download_task(client, "job_1", ".", task={"taskId": "job_1", "state": "running"})


class EffectTests(unittest.TestCase):
    def setUp(self):
        self.effects = effects.load_effects()

    def test_catalog_is_complete(self):
        self.assertGreater(len(self.effects), 100)
        slugs = [fx["slug"] for fx in self.effects]
        self.assertEqual(len(slugs), len(set(slugs)))
        for fx in self.effects:
            self.assertRegex(fx["model"], r"^[a-z0-9.-]+/[a-z0-9.-]+/[a-z0-9-]+$")
            self.assertIn(fx["kind"], ("video", "image"))
            self.assertTrue(fx["prompt"].strip())
            self.assertIn(fx["imageField"], ("image_url", "image_urls"))
            self.assertNotIn("prompt", fx["input"])

    def test_find_effect_loose_matching(self):
        self.assertEqual(effects.find_effect("Tiny Planet", self.effects)[0]["slug"], "tiny-planet")
        self.assertEqual(effects.find_effect("tinyplanet", self.effects)[0]["slug"], "tiny-planet")
        self.assertEqual(effects.find_effect("zombie", self.effects)[0]["slug"], "zombie-turn")
        fx, hits = effects.find_effect("clay", self.effects)
        self.assertIsNone(fx)
        self.assertGreater(len(hits), 1)

    def test_effect_body_uses_locked_recipe(self):
        video = effects.require_effect("tiny-planet", self.effects)
        body = effects.effect_body(video, "https://x.test/me.jpg")
        self.assertEqual(body["model"], video["model"])
        self.assertEqual(body["input"]["image_url"], "https://x.test/me.jpg")
        self.assertEqual(body["input"]["prompt"], video["prompt"])
        image = next(fx for fx in self.effects if fx.get("imageArray"))
        self.assertEqual(effects.effect_body(image, "popnow://f/fil_1")["input"][image["imageField"]], ["popnow://f/fil_1"])


class RepoTests(unittest.TestCase):
    def test_script_copies_are_identical(self):
        canonical = os.path.join(ROOT, "skills", "popnow-api", "scripts", "popnow.py")
        for skill in SKILLS[1:]:
            copy = os.path.join(ROOT, "skills", skill, "scripts", "popnow.py")
            self.assertTrue(filecmp.cmp(canonical, copy, shallow=False), "%s drifted; run tools/sync_scripts.py" % copy)

    def test_skill_frontmatter(self):
        for skill in SKILLS:
            with open(os.path.join(ROOT, "skills", skill, "SKILL.md"), encoding="utf-8") as fh:
                text = fh.read()
            match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
            self.assertIsNotNone(match, skill)
            meta = dict(line.split(": ", 1) for line in match.group(1).splitlines() if ": " in line)
            self.assertEqual(meta.get("name"), skill)
            self.assertRegex(meta["name"], r"^[a-z0-9-]{1,64}$")
            self.assertTrue(0 < len(meta.get("description", "")) <= 1024, skill)
            self.assertNotIn("<", meta["description"])

    def test_plugin_manifests(self):
        with open(os.path.join(ROOT, ".claude-plugin", "marketplace.json"), encoding="utf-8") as fh:
            market = json.load(fh)
        with open(os.path.join(ROOT, ".claude-plugin", "plugin.json"), encoding="utf-8") as fh:
            plugin = json.load(fh)
        self.assertEqual(market["plugins"][0]["name"], plugin["name"])
        self.assertEqual(market["plugins"][0]["source"], "./")

    def test_cli_help(self):
        for script in ("skills/popnow-api/scripts/popnow.py", "skills/popnow-effects/scripts/effects.py"):
            out = subprocess.run([sys.executable, os.path.join(ROOT, script), "--help"], capture_output=True, text=True)
            self.assertEqual(out.returncode, 0, out.stderr)
            self.assertIn("usage:", out.stdout)

    def test_missing_key_is_a_usage_error(self):
        env = dict(os.environ)
        env.pop("POPNOW_API_KEY", None)
        out = subprocess.run([sys.executable, os.path.join(ROOT, "skills/popnow-api/scripts/popnow.py"), "balance"],
                             capture_output=True, text=True, env=env)
        self.assertEqual(out.returncode, 2)
        self.assertIn("POPNOW_API_KEY", out.stderr)


if __name__ == "__main__":
    unittest.main()
