#!/usr/bin/env python3
"""Offline self-tests for the brand kit scripts. No network, no PopNow calls.

  python3 scripts/selftest.py                 # everything that needs only Python
  python3 scripts/selftest.py --with-chrome   # also PDF and PNG export through headless Chrome
  BRANDKIT_TEST_FONT=/path/Font.ttf python3 scripts/selftest.py   # also outline a wordmark (needs fontTools)

Exit code 0 when every test passes.
"""

import contextlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import board  # noqa: E402
import brandkit_lib as bk  # noqa: E402
import contrast  # noqa: E402
import lint_design  # noqa: E402
import plan  # noqa: E402
import tokens  # noqa: E402
import wordmark  # noqa: E402

EXAMPLE = os.path.join(HERE, "..", "references", "example-DESIGN-lite.md")
RESULTS = []


def test(fn):
    RESULTS.append(fn)
    return fn


def quiet(fn, *args):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = fn(*args)
    return code, out.getvalue() + err.getvalue()


def rules(findings):
    return {(f["severity"], f["rule"]) for f in findings.items}


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


SYMBOL = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>t</title>'
          '<path fill="#2F6B3F" fill-rule="evenodd" d="M4 4H20V20H4ZM8 8V16H16V8Z"/></svg>\n')
WORD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><title>w</title>'
        '<path fill="#1F2A22" d="M0 0H10V20H0Z M20 0H30V20H20Z"/></svg>\n')


# ---------------------------------------------------------------------------


@test
def yaml_round_trip():
    src = {
        "name": "Test: brand", "colors": {"primary": "#B5541E", "x": "{colors.primary}"},
        "n": 1.05, "i": 3, "b": True, "none": None, "list": ["calm", "warm"],
        "sentences": ["It's fine.", "Say: what changed"], "nested": [{"a": 1, "b": "two words"}, {"c": [1, 2]}],
        "dims": {"a": "-0.02em", "b": "16px"}, "empty": {}, "text": "line one\nline two",
    }
    assert bk.yaml_load(bk.yaml_dump(src)) == src
    assert bk.yaml_load("a: #123456\n")["a"] is None, "unquoted hex must read as a comment"
    for bad in ("a: {colors.primary}\n", "a: 1\na: 2\n", "a:\n\t- x\n"):
        try:
            bk.yaml_load(bad)
        except bk.YamlError:
            continue
        raise AssertionError("should reject: %r" % bad)
    got = bk.yaml_load("t: |\n  one\n  two\nf: >-\n  a\n  b\n")
    assert got == {"t": "one\ntwo\n", "f": "a b"}, got


@test
def colour_maths():
    W, K = bk.parse_color("#fff"), bk.parse_color("black")
    assert abs(bk.contrast_ratio(W, K) - 21) < 1e-9
    r = bk.contrast_ratio(bk.parse_color("#777777"), W)
    assert bk.floor2(r) == 4.47 and r < 4.5
    for s in ("rgb(10 20 30 / 50%)", "rgba(10,20,30,.5)", "hsl(20, 70%, 41%)", "oklch(0.62 0.15 45)", "#abc", "#11223344"):
        assert bk.parse_color(s) is not None, s
    assert bk.parse_color("color-mix(in srgb, red, blue)") is None
    fixed, ratio = bk.suggest_fix(bk.parse_color("#E08A4F"), W, 4.5)
    assert ratio >= 4.5 and bk.contrast_ratio(bk.parse_color(bk.to_hex(fixed)), W) >= 4.5
    L, C, H = bk.to_oklch(bk.parse_color("#B5541E"))
    assert bk.to_hex(bk.from_oklch(L, C, H)) == "#b5541e", "OKLCH round trip"
    grey = bk.from_oklch(0.6, 0.4, 145)  # far outside sRGB: chroma is reduced, hue and lightness kept
    assert all(0 <= x <= 1 for x in grey[:3]) and abs(bk.to_oklch(grey)[0] - 0.6) < 0.01


@test
def lookalike_rules():
    P = bk.parse_color
    brief = {"avoid": [{"name": "Ledger", "colors": ["#1B2A4A", "#C9A227"]}]}
    bad = contrast.avoid_palette({"ink": P("#2B2722"), "accent": P("#E7B04A")}, brief)[0]
    assert bad["verdict"] == "lookalike", bad
    ok = contrast.avoid_palette({"ink": P("#2B2722"), "accent": P("#F4C9A8"), "primary": P("#B5541E")}, brief)[0]
    assert ok["verdict"] == "distinct", ok
    assert not contrast.similar(P("#F0985F"), P("#C9A227"))[0], "light orange is not gold"
    assert contrast.similar(P("#7B3FE4"), P("#8A4BEA"))[0], "two violets are the same family"


@test
def lint_example_clean():
    f, d = lint_design.lint(EXAMPLE)
    errs = [x for x in f.items if x["severity"] == "error"]
    assert not errs, errs
    assert d.profile() == "lite"


@test
def lint_catches_problems():
    with open(EXAMPLE, encoding="utf-8") as fh:
        text = fh.read()
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        p = os.path.join(tmp, "DESIGN.md")
        broken = (text.replace('primary: "#2F6B3F"', "primary: #2F6B3F", 1)
                  .replace('on-tertiary: "#2A2418"', 'on-tertiary: "#E9E0CC"', 1)
                  .replace("- fg: on-surface\n      bg: surface\n", "- fg: on-surface\n      bg: \"{colors.nope}\"\n", 1)
                  .replace("license: OFL-1.1", "license: Proprietary", 1)
                  .replace("## Overview\n", "## Overview\n\nTODO: finish this.\n", 1))
        broken = re.sub(r"    dont:\n(      - .*\n)+", "    dont:\n      - \"Only one\"\n", broken)
        write(p, broken)
        f, _ = lint_design.lint(p, {"avoid": [{"name": "Sprig", "colors": ["#000"]}]})
        got = rules(f)
        for want in ("invalid-color", "contrast", "broken-ref", "font-license", "placeholder", "voice"):
            assert ("error", want) in got, (want, sorted(got))
        assert ("warning", "competitor-name") in got
        # full profile needs more sections and a wordmark
        write(p, text.replace("profile: lite", "profile: full"))
        got = rules(lint_design.lint(p)[0])
        assert ("error", "missing-section") in got and ("error", "logo-missing") in got
    finally:
        shutil.rmtree(tmp)


@test
def logo_file_checks():
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        good = os.path.join(tmp, "good.svg")
        raster = os.path.join(tmp, "raster.svg")
        live = os.path.join(tmp, "live.svg")
        write(good, SYMBOL)
        write(raster, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="data:image/png;base64,AAAA"/></svg>')
        write(live, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9"><text>Hi</text></svg>')
        pal = [bk.parse_color("#2F6B3F")]
        for path, want, draft in ((good, set(), False), (raster, {"logo-raster"}, False), (live, {"logo-text"}, False)):
            f = lint_design.Findings()
            lint_design.check_svg(path, "x", pal, draft, f)
            got = {x["rule"] for x in f.items if x["severity"] == "error"}
            assert got == want, (path, got)
        f = lint_design.Findings()
        lint_design.check_svg(os.path.join(tmp, "logo.png"), "x", pal, False, f)
        assert {x["rule"] for x in f.items} == {"logo-file"}
    finally:
        shutil.rmtree(tmp)


def _validate_dtcg(node, path="", inherited=None):
    allowed = {"color", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "string", "shadow", "typography"}
    if not isinstance(node, dict):
        raise AssertionError("%s is not an object" % path)
    t = node.get("$type", inherited)
    if "$value" in node:
        assert t in allowed, (path, t)
        v = node["$value"]
        if isinstance(v, str) and bk.REF.match(v):
            return
        if t == "color":
            assert v["colorSpace"] == "srgb" and len(v["components"]) == 3 and re.match(r"^#[0-9a-f]{6}$", v["hex"]), path
        if t == "dimension":
            assert v["unit"] in ("px", "rem") and isinstance(v["value"], (int, float)), path
        if t == "typography":
            assert isinstance(v["fontFamily"], list) and v["fontSize"]["unit"] in ("px", "rem"), path
            assert {"fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"} <= set(v), "DTCG needs all five: %s" % path
            if "letterSpacing" in v:
                assert v["letterSpacing"]["unit"] in ("px", "rem"), path
            if "lineHeight" in v:
                assert isinstance(v["lineHeight"], (int, float)), path
        if t == "shadow":
            for s in v if isinstance(v, list) else [v]:
                assert {"color", "offsetX", "offsetY", "blur", "spread"} <= set(s), path
        if t == "cubicBezier":
            assert len(v) == 4 and 0 <= v[0] <= 1 and 0 <= v[2] <= 1, path
        return
    for k, child in node.items():
        if k.startswith("$"):
            continue
        assert not any(ch in k for ch in "{}.") and not k.startswith("$"), "bad token name %s" % k
        _validate_dtcg(child, path + "." + k, t)


@test
def tokens_round_trip_and_dtcg():
    d = bk.load_design(EXAMPLE)
    doc = json.loads(tokens.dtcg_text(d.tokens))
    _validate_dtcg(doc)
    assert doc["color"]["primary"]["$value"]["hex"] == "#2f6b3f" and doc["$schema"].endswith("2025.10/format.json")
    assert "shadow" not in doc or doc["shadow"]
    assert doc["typography"]["display"]["$value"]["letterSpacing"] == {"value": -0.72, "unit": "px"}
    back = bk.dtcg_to_design(doc)
    assert tokens._strip_floats(bk.order_tokens(back)) == tokens._strip_floats(bk.order_tokens(d.tokens))
    # an edit in tokens.json wins over the stored original
    doc["color"]["primary"]["$value"] = {"colorSpace": "srgb", "components": [0, 0, 0], "hex": "#000000"}
    assert bk.dtcg_to_design(doc)["colors"]["primary"] == "#000000"


@test
def css_export_and_import():
    toks = bk.load_design(EXAMPLE).tokens
    toks = json.loads(json.dumps(toks))
    toks["colors"]["dark-surface"] = "#111411"
    toks["brand"]["shadows"] = {"md": "0 2px 8px rgba(0, 0, 0, 0.1)", "lg": "0 1px 2px rgba(0, 0, 0, 0.08), inset 0 0 0 1px #FFFFFF"}
    shadow = bk.design_to_dtcg(toks)["shadow"]
    assert shadow["md"]["$value"]["offsetX"] == {"value": 0, "unit": "px"} and len(shadow["lg"]["$value"]) == 2
    assert shadow["lg"]["$value"][1]["inset"] is True
    assert bk.dtcg_to_design(bk.design_to_dtcg(toks))["brand"]["shadows"] == toks["brand"]["shadows"]
    toks["brand"]["motion"] = {"baseMs": 200, "standard": "cubic-bezier(0.2, 0, 0, 1)"}
    css = bk.design_to_css(toks)
    for want in ("--color-primary: #2F6B3F;", "--font-display: \"Fraunces\", Georgia, serif;", "--text-display: 48px;",
                 "--text-display--letter-spacing: -0.015em;", "--color-surface: var(--color-dark-surface);",
                 ":root[data-theme=\"dark\"]", ".type-body-md {", "--duration-base: 200ms;", "--shadow-md:"):
        assert want in css, want
    assert css.count("{") == css.count("}")
    assert "@theme {" in bk.design_to_css(toks, tailwind=True)
    back = bk.css_to_design(css)
    assert back["colors"]["primary"] == "#2F6B3F" and back["colors"]["dark-surface"] == "#111411"
    assert back["typography"]["display"]["fontFamily"] == "Fraunces"
    assert back["brand"]["motion"]["baseMs"] == 200


@test
def tokens_cli():
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        design = os.path.join(tmp, "DESIGN.md")
        shutil.copy(EXAMPLE, design)
        j, c = os.path.join(tmp, "brand", "tokens.json"), os.path.join(tmp, "brand", "tokens.css")
        assert quiet(tokens.main, ["export", design, "--json", j, "--css", c])[0] == 0
        assert quiet(tokens.main, ["check", design, "--json", j, "--css", c])[0] == 0
        with open(c, "a", encoding="utf-8") as fh:
            fh.write("/* edited */\n")
        assert quiet(tokens.main, ["check", design, "--css", c])[0] == 1, "stale CSS must fail"
        fresh = os.path.join(tmp, "NEW.md")
        assert quiet(tokens.main, ["import", j, "--design", fresh])[0] == 0
        assert bk.load_design(fresh).tokens["colors"] == bk.load_design(design).tokens["colors"]
        css_only = os.path.join(tmp, "FROMCSS.md")
        assert quiet(tokens.main, ["from-css", c, "--design", css_only, "--name", "From CSS"])[0] == 0
        assert bk.load_design(css_only).tokens["colors"]["primary"] == "#2F6B3F"
    finally:
        shutil.rmtree(tmp)


@test
def contrast_cli():
    assert quiet(contrast.main, ["#FFFFFF", "#2F6B3F"])[0] == 0
    code, out = quiet(contrast.main, ["--fix", "#7A7166", "--on", "#F3EDE3", "--json"])
    assert code == 0 and json.loads(out)["ratio"] >= 4.5
    assert quiet(contrast.main, ["--design", EXAMPLE])[0] == 0
    assert "| text \\ surface |" in quiet(contrast.main, ["--design", EXAMPLE, "--matrix"])[1]


def _fake_brief(tmp):
    brief = {
        "product": {"name": "Sprig", "what": "Plant care reminders."}, "audience": "New plant owners.",
        "personality": ["friendly", "plain"], "mode": "full",
        "avoid": [{"name": "Leafmint Example Co", "colors": ["#00FF00"], "mark": "A leaf in a circle."}],
        "fontFiles": {},
        "directions": [
            {"id": "A", "name": "Window light", "summary": "Bright.", "palette": {"ink": "#1F2A22", "paper": "#F7F6F0", "accent": "#2F6B3F"},
             "fonts": {"display": "Fraunces", "body": "Figtree"}, "voice": "Water less.", "tiles": ["t1"]},
        ],
        "picked": "A",
        "generations": [
            {"id": "t1", "stage": "directions", "direction": "A", "model": "alibaba/z-image-turbo/text-to-image",
             "prompt": "Houseplants on a sunny windowsill in terracotta pots, linen curtains, soft morning light, no text",
             "aspectRatio": "1:1", "out": "assets/moodboard/a-1.webp"},
            {"id": "m1", "stage": "mockups", "model": "google/nano-banana-2.1/text-to-image",
             "prompt": "A smiling woman holding a pot with a label like Leafmint Example Co, studio light, white background",
             "aspectRatio": "4:3", "out": "assets/mockups/pot.webp"},
        ],
    }
    path = os.path.join(tmp, "brand", "brief.json")
    write(path, json.dumps(brief))
    return path, brief


@test
def plan_checks():
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        path, brief = _fake_brief(tmp)
        rep = plan.Report()
        plan.check(brief, os.path.dirname(path), rep)
        msgs = " | ".join(m for _, _, m in rep.rows)
        assert any(s == "error" and "competitor" in m for s, _, m in rep.rows), msgs
        assert any(s == "warning" and "people" in m for s, _, m in rep.rows), msgs
        code, out = quiet(plan.main, ["commands", path, "--stage", "directions"])
        assert code == 0 and "scripts/popnow.py quote" in out and "--aspect-ratio 1:1" in out
        code, out = quiet(plan.main, ["commands", path, "--stage", "directions", "--create"])
        assert "--confirm-credits <QUOTED>" in out
        code, _ = quiet(plan.main, ["check", path])
        assert code == 1
    finally:
        shutil.rmtree(tmp)


@test
def board_offline():
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        path, _ = _fake_brief(tmp)
        design = os.path.join(tmp, "DESIGN.md")
        shutil.copy(EXAMPLE, design)
        out = os.path.join(tmp, "brand", "brand-board.html")
        assert quiet(board.main, ["build", design, "--brief", path, "--out", out])[0] == 0
        with open(out, encoding="utf-8") as fh:
            html = fh.read()
        assert not board.offline_check(html), board.offline_check(html)
        for want in ("Colour", "Typography", "Accessible pairs", "Voice &amp; tone", "Applications", "To generate", "Leaf", "@page"):
            assert want in html, want
        assert "font-family:\"" not in re.sub(r"<style>.*?</style>", "", html, flags=re.S), "unescaped quotes in a style attribute"
        d_out = os.path.join(tmp, "brand", "directions.html")
        assert quiet(board.main, ["directions", path, "--out", d_out])[0] == 0
        with open(d_out, encoding="utf-8") as fh:
            assert "Window light" in fh.read()
    finally:
        shutil.rmtree(tmp)


@test
def wordmark_tools():
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        sym, wm = os.path.join(tmp, "s.svg"), os.path.join(tmp, "w.svg")
        write(sym, SYMBOL)
        write(wm, WORD)
        lk = os.path.join(tmp, "lockup.svg")
        assert quiet(wordmark.main, ["lockup", "--symbol", sym, "--wordmark", wm, "--out", lk])[0] == 0
        root = ET.parse(lk).getroot()
        assert root.get("viewBox") and len([e for e in root if e.tag.endswith("svg")]) == 2
        rc = os.path.join(tmp, "rev.svg")
        assert quiet(wordmark.main, ["recolor", lk, "--color", "#FFFFFF", "--out", rc])[0] == 0
        with open(rc, encoding="utf-8") as fh:
            fills = set(re.findall(r'fill="([^"]+)"', fh.read()))
        assert fills == {"#FFFFFF"}, fills
        draft = os.path.join(tmp, "draft.svg")
        assert quiet(wordmark.main, ["text", "--draft", "--family", "Fraunces", "--text", "Sprig", "--out", draft])[0] == 0
        f = lint_design.Findings()
        lint_design.check_svg(draft, "x", [], False, f)
        assert "logo-text" in {x["rule"] for x in f.items}
        font = os.environ.get("BRANDKIT_TEST_FONT")
        if font:
            out = os.path.join(tmp, "outlined.svg")
            code, log = quiet(wordmark.main, ["text", "--font", font, "--text", "Sprig", "--tracking", "-10", "--out", out])
            if code == 3:
                print("  (fontTools not installed: outline test skipped)")
            else:
                assert code == 0, log
                f = lint_design.Findings()
                lint_design.check_svg(out, "x", [], False, f)
                assert not [x for x in f.items if x["severity"] == "error"], f.items
    finally:
        shutil.rmtree(tmp)


def chrome_tests():
    if not board.find_chrome():
        print("skip  chrome tests (no Chrome/Chromium/Edge found)")
        return True
    tmp = tempfile.mkdtemp(prefix="bk-test-")
    try:
        design = os.path.join(tmp, "DESIGN.md")
        shutil.copy(EXAMPLE, design)
        out = os.path.join(tmp, "board.html")
        pdf = os.path.join(tmp, "board.pdf")
        quiet(board.main, ["build", design, "--out", out, "--pdf", pdf])
        assert os.path.exists(pdf) and os.path.getsize(pdf) > 5000, "PDF not written"
        with open(pdf, "rb") as fh:
            assert len(re.findall(rb"/Type\s*/Page[^s]", fh.read())) == 1, "board PDF should be one page"
        sym, png = os.path.join(tmp, "s.svg"), os.path.join(tmp, "s.png")
        write(sym, SYMBOL)
        quiet(board.main, ["png", sym, "--out", png, "--size", "256"])
        with open(png, "rb") as fh:
            assert fh.read(8) == b"\x89PNG\r\n\x1a\n"
        print("ok    chrome_pdf_and_png")
        return True
    except AssertionError as exc:
        print("FAIL  chrome_pdf_and_png: %s" % exc)
        return False
    finally:
        shutil.rmtree(tmp)


def main():
    failed = 0
    for fn in RESULTS:
        try:
            fn()
            print("ok    %s" % fn.__name__)
        except Exception as exc:  # noqa: BLE001 - report every failure and keep going
            failed += 1
            print("FAIL  %s: %s: %s" % (fn.__name__, type(exc).__name__, exc))
    if "--with-chrome" in sys.argv and not chrome_tests():
        failed += 1
    print("\n%d tests, %d failed" % (len(RESULTS) + ("--with-chrome" in sys.argv), failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
