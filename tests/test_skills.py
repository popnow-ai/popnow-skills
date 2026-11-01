"""Offline tests for the PopNow skills. No network, no API key, nothing charged.

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
SKILLS = ("popnow-api", "popnow-video", "popnow-image", "popnow-audio", "popnow-effects",
          "popnow-launch-film", "popnow-narrated-explainer", "popnow-hyperframes-ai-assets",
          "popnow-landing-page-from-mockup", "popnow-social-cover-generator", "popnow-brand-kit-design-md")
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


QUOTE = {"quoteId": "q_1", "model": "minimax/h3/image-to-video", "maxChargeUsd": "0.185", "expectedChargeUsd": "0.185",
         "maxCharge": "0.185", "estimatedCost": "0.185", "expectedCharge": "0.185", "maxCredits": 185,
         "expectedCredits": 185, "currency": "USD", "quantity": "5", "unit": "per_second",
         "expiresAt": "2026-10-19T10:00:00Z"}
# What a server from before the USD fields returned: credit projections only.
LEGACY_QUOTE = {"quoteId": "q_old", "model": "minimax/h3/image-to-video", "maxCredits": 185, "expectedCredits": 185,
                "currency": "USD", "quantity": "5", "unit": "per_second", "expiresAt": "2026-10-19T10:00:00Z"}
BALANCE = {"available": "12.5", "held": "0.185", "total": "12.685", "availableUsd": "12.5", "heldUsd": "0.185",
           "totalUsd": "12.685", "availableCredits": 12500, "heldCredits": 185, "totalCredits": 12685}

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
        self.assertIn("popnow.ai/api/console/billing", str(ctx.exception))

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
        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(dict(QUOTE, maxChargeUsd="0.37", maxCredits=370))})
        body = popnow.task_body("minimax/h3/image-to-video", {"prompt": "x", "image_url": "https://x.test/a.jpg"})
        with self.assertRaises(popnow.ConfirmationNeeded) as ctx:
            popnow.create(client, body, "0.185")
        self.assertIn("--confirm-usd 0.37", str(ctx.exception))
        self.assertIn("$0.37 USD", str(ctx.exception))
        self.assertEqual(fake.paths(), ["/api/v1/jobs/quote"])

    def test_confirmed_create_locks_quote_in_usd_and_sends_idempotency_key(self):
        accepted = {"taskId": "job_1", "state": "queued", "estimatedCostUsd": "0.185", "estimatedCost": "0.185",
                    "estimatedCredits": 185, "deadlineAt": "2026-10-19T10:30:00Z"}
        client, fake = client_with({
            ("POST", "/api/v1/jobs/quote"): ok(QUOTE),
            ("POST", "/api/v1/jobs/createTask"): ok(accepted, status=202),
        })
        body = popnow.task_body("minimax/h3/image-to-video", {"prompt": "x"}, callback="https://hooks.test/p")
        q, status, data, key = popnow.create(client, body, "0.185", idempotency_key="order-1", retention=3600)
        self.assertEqual((status, data["taskId"], key), (202, "job_1", "order-1"))
        sent = fake.calls[1]
        self.assertEqual(sent["body"]["quoteId"], "q_1")
        self.assertEqual(sent["body"]["expectedCostUsd"], "0.185")
        self.assertNotIn("expectedCredits", sent["body"])
        self.assertEqual(sent["body"]["callBackUrl"], "https://hooks.test/p")
        self.assertEqual(fake.calls[0]["body"]["callBackUrl"], "https://hooks.test/p")
        self.assertEqual(sent["headers"]["Idempotency-Key"], "order-1")
        self.assertEqual(sent["headers"]["X-PopNow-Retention"], "3600")
        self.assertTrue(sent["headers"]["Authorization"].startswith("Bearer sk-popnow-"))
        self.assertEqual(popnow.accepted_usd(data), "0.185")

    def test_usd_amounts_are_compared_exactly(self):
        quoted = dict(QUOTE, maxChargeUsd="0.123456790")
        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(quoted),
                                    ("POST", "/api/v1/jobs/createTask"): ok({"taskId": "job_9", "state": "queued"}, 202)})
        with self.assertRaises(popnow.ConfirmationNeeded):
            popnow.create(client, popnow.task_body("m/n/t", {}), "0.123456789")
        popnow.create(client, popnow.task_body("m/n/t", {}), "$0.12345679")
        self.assertEqual(fake.calls[-1]["body"]["expectedCostUsd"], "0.123456790")

    def test_legacy_quote_without_usd_fields_still_works(self):
        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(LEGACY_QUOTE),
                                    ("POST", "/api/v1/jobs/createTask"): ok({"taskId": "job_3", "state": "queued",
                                                                             "estimatedCredits": 185}, 202)})
        _, _, data, _ = popnow.create(client, popnow.task_body("m/n/t", {}), "0.185")
        sent = fake.calls[1]["body"]
        self.assertEqual((sent["quoteId"], sent["expectedCredits"]), ("q_old", 185))
        self.assertNotIn("expectedCostUsd", sent)
        self.assertEqual(popnow.accepted_usd(data), "0.185")
        with self.assertRaises(popnow.ConfirmationNeeded):
            popnow.create(client, popnow.task_body("m/n/t", {}), "0.184")

    def test_deprecated_credit_confirmation_still_works(self):
        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(QUOTE),
                                    ("POST", "/api/v1/jobs/createTask"): ok({"taskId": "job_4", "state": "queued"}, 202)})
        popnow.create(client, popnow.task_body("m/n/t", {}), 185)
        popnow.create(client, popnow.task_body("m/n/t", {}), confirm_credits=185)
        self.assertEqual([c["body"]["expectedCostUsd"] for c in fake.calls if c["path"].endswith("createTask")],
                         ["0.185", "0.185"])
        with self.assertRaises(popnow.ConfirmationNeeded):
            popnow.create(client, popnow.task_body("m/n/t", {}), confirm_credits=184)

    def test_retry_keeps_the_same_idempotency_key(self):
        attempts = []

        def flaky(body):
            attempts.append(1)
            if len(attempts) == 1:
                return 503, {"code": 503, "msg": "busy"}
            return ok({"taskId": "job_2", "state": "queued", "estimatedCostUsd": "0.185"}, status=202)

        client, fake = client_with({("POST", "/api/v1/jobs/quote"): ok(QUOTE), ("POST", "/api/v1/jobs/createTask"): flaky})
        orig_sleep = popnow.time.sleep
        popnow.time.sleep = lambda s: None
        try:
            popnow.create(client, popnow.task_body("m/n/t", {"prompt": "x"}), "0.3")
        finally:
            popnow.time.sleep = orig_sleep
        keys = [c["headers"]["Idempotency-Key"] for c in fake.calls if c["path"].endswith("createTask")]
        self.assertEqual(len(keys), 2)
        self.assertEqual(keys[0], keys[1])

    def test_confirmation_is_required_and_must_be_a_decimal_string(self):
        client, fake = client_with({})
        for bad in (None, 0.185, "1e-3", "-1", "0.1234567891", "abc", ""):
            with self.subTest(bad=bad), self.assertRaises(popnow.UsageError):
                popnow.create(client, popnow.task_body("m/n/t", {}), bad)
        self.assertEqual(fake.calls, [])


class MoneyTests(unittest.TestCase):
    def test_usd_fields_win_and_legacy_fields_still_parse(self):
        self.assertEqual(popnow.quote_max_usd(QUOTE), "0.185")
        self.assertEqual(popnow.quote_max_usd(LEGACY_QUOTE), "0.185")
        self.assertEqual(popnow.available_usd(BALANCE), "12.5")
        self.assertEqual(popnow.available_usd({"availableCredits": 12500}), "12.5")
        self.assertEqual(popnow.held_usd({"heldCredits": 185}), "0.185")
        self.assertEqual(popnow.task_cost_usd({"costUsd": "0.000000001", "credits": 1}), "0.000000001")
        self.assertEqual(popnow.task_cost_usd({"cost": "0.37"}), "0.37")
        self.assertEqual(popnow.task_cost_usd({"exactCredits": "184.5", "credits": 185}), "0.1845")
        self.assertEqual(popnow.task_cost_usd({"credits": 185}), "0.185")
        self.assertIsNone(popnow.task_cost_usd({"state": "queued"}))

    def test_model_prices_use_the_usd_snapshot(self):
        rec = {"usd": {"unit": "per_second", "perUnit": "0.0612", "currency": "USD",
                       "rules": [{"when": {"resolution": "720p"}, "perUnit": "0.126"}]},
               "credits": {"unit": "per_second", "perUnit": 61.2}}
        self.assertEqual(popnow.price_text(popnow.model_usd(rec)), "from $0.0612/second")
        legacy = popnow.model_usd({"credits": {"unit": "per_second", "perUnit": 61.2,
                                               "rules": [{"when": {"resolution": "720p"}, "perUnit": 126}]}})
        self.assertEqual((legacy["perUnit"], legacy["rules"][0]["perUnit"]), ("0.0612", "0.126"))
        chat = {"usd": {"unit": "per_1m_tokens", "input": "1.25", "output": "10", "currency": "USD"}}
        self.assertEqual(popnow.price_text(popnow.model_usd(chat)), "$1.25 in, $10 out per 1M tokens")

    def test_summaries_show_usd(self):
        text = popnow.describe_quote(QUOTE, dict(BALANCE, availableUsd="0.1"))
        self.assertIn("up to $0.185 USD", text)
        self.assertIn("--confirm-usd 0.185", text)
        self.assertIn("popnow.ai/api/console/billing", text)
        self.assertNotIn("credit", text)
        task = {"taskId": "job_1", "model": "m/n/t", "state": "succeeded", "costUsd": "0.17", "settled": True, "credits": 170}
        self.assertIn("Cost:       $0.17 USD (final charge)", popnow.summarize_task(task))


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
        versions = {market["plugins"][0]["version"], plugin["version"], popnow.__version__}
        for path in (".codex-plugin/plugin.json", ".cursor-plugin/plugin.json"):
            with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
                versions.add(json.load(fh)["version"])
        self.assertEqual(len(versions), 1, versions)

    def test_developer_links_only(self):
        """A developer product: no links to the consumer MCP or the website skills catalog."""
        consumer = re.compile(r"https://popnow\.ai/mcp\b|https://api\.popnow\.ai/mcp\b|popnow-ai/popnow-mcp\b|popnow\.ai/skills/agent-skills")
        out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True)
        files = [f for f in out.stdout.splitlines() if not f.startswith("assets/") and not f.endswith((".woff2", ".png"))]
        self.assertTrue(files)
        for name in files:
            path = os.path.join(ROOT, name)
            if not os.path.isfile(path) or name in ("CHANGELOG.md", "tests/test_skills.py"):
                continue
            with open(path, encoding="utf-8", errors="replace") as fh:
                self.assertIsNone(consumer.search(fh.read()), name)

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
