#!/usr/bin/env python3
"""Brand board builder: one offline HTML page (and a one-page PDF) from DESIGN.md.

  python3 scripts/board.py build DESIGN.md --brief brand/brief.json --out brand/brand-board.html --pdf brand/brand-board.pdf
  python3 scripts/board.py directions brand/brief.json --out brand/directions.html
  python3 scripts/board.py pdf brand/brand-board.html --out brand/brand-board.pdf
  python3 scripts/board.py png brand/assets/logo/lockup.svg --out brand/assets/logo/lockup.png --size 1024

The board reads only local files: tokens, prose and logo SVGs come from DESIGN.md,
pictures from the brief's `generations` (or assets/mockups, assets/moodboard).
A picture that has not been generated yet shows as a labelled placeholder with
its prompt, so the board is complete without spending credits.
PDF and PNG use headless Chrome/Chromium/Edge (set CHROME_PATH if it is not found).
Standard library only.
"""

import argparse
import datetime
import glob
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brandkit_lib as bk  # noqa: E402

E = html.escape
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg")
WHITE = (1.0, 1.0, 1.0, 1.0)
BLACK = (0.0, 0.0, 0.0, 1.0)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3)) + (1.0,)


def best_on(bg):
    return WHITE if bk.contrast_ratio(WHITE, bg) >= bk.contrast_ratio(BLACK, bg) else BLACK


def hexc(c):
    return bk.to_hex(c).upper()


def rgba(c, a):
    return "rgba(%d, %d, %d, %s)" % (round(c[0] * 255), round(c[1] * 255), round(c[2] * 255), a)


def rel(target, out_dir):
    return os.path.relpath(target, out_dir).replace(os.sep, "/")


def read(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def inline_svg(path, cls="", color=None, label=None, uid="s", height=None):
    """Inline an SVG file: fixed pixel size from its viewBox, namespaced ids, optional recolour."""
    try:
        text = read(path)
    except OSError:
        return '<div class="missing">missing %s</div>' % E(os.path.basename(path))
    text = re.sub(r"<\?xml.*?\?>|<!DOCTYPE.*?>|<!--.*?-->", "", text, flags=re.S).strip()
    m = re.search(r"<svg\b[^>]*>", text)
    if not m:
        return ""
    tag = m.group(0)
    new_tag = re.sub(r'\s(width|height|style)="[^"]*"', "", tag)
    style = ""
    vb = re.search(r'viewBox="([^"]+)"', tag)
    if height and vb:
        nums = [float(n) for n in re.split(r"[\s,]+", vb.group(1).strip())]
        if len(nums) == 4 and nums[3] > 0:
            style = ' style="display:block;flex:none;height:%spx;width:%spx;max-width:100%%"' % (round(height, 1), round(height * nums[2] / nums[3], 1))
    new_tag = new_tag[:-1] + ' class="%s"' % cls + style + ('' if 'aria-label' in new_tag or not label else ' aria-label="%s"' % E(label)) + ">"
    text = text[:m.start()] + new_tag + text[m.end():]
    for i in sorted(set(re.findall(r'\bid="([^"]+)"', text)), key=len, reverse=True):
        text = text.replace('id="%s"' % i, 'id="%s-%s"' % (uid, i)).replace("url(#%s)" % i, "url(#%s-%s)" % (uid, i)).replace('href="#%s"' % i, 'href="#%s-%s"' % (uid, i))
    if color:
        def swap(mm):
            v = mm.group(2)
            if v.lower() in ("none", "transparent") or v.startswith("url("):
                return mm.group(0)
            return mm.group(1) + color + mm.group(3)
        text = re.sub(r'((?:fill|stroke)=")([^"]+)(")', swap, text)
        text = re.sub(r"((?:fill|stroke)\s*:\s*)([^;\"']+)(;?)", swap, text)
    return text


def find_chrome():
    cands = [
        os.environ.get("CHROME_PATH"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        shutil.which("google-chrome"), shutil.which("google-chrome-stable"), shutil.which("chromium"),
        shutil.which("chromium-browser"), shutil.which("chrome"), shutil.which("msedge"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in cands:
        if c and os.path.exists(c):
            return c
    return None


def run_chrome(args, timeout=120):
    chrome = find_chrome()
    if not chrome:
        print("Chrome/Chromium/Edge not found. Install one or set CHROME_PATH. The HTML board is still complete.", file=sys.stderr)
        return False
    profile = tempfile.mkdtemp(prefix="brandkit-chrome-")
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
           "--user-data-dir=%s" % profile, "--hide-scrollbars"] + args
    if os.environ.get("CHROME_NO_SANDBOX"):
        cmd.insert(2, "--no-sandbox")
    try:
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        print("Chrome failed: %s" % exc, file=sys.stderr)
        return False
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return True


def to_pdf(html_path, pdf_path):
    pdf_path = os.path.abspath(pdf_path)
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    url = "file://" + os.path.abspath(html_path).replace(os.sep, "/")
    ok = run_chrome(["--no-pdf-header-footer", "--print-to-pdf-no-header", "--virtual-time-budget=6000",
                     "--print-to-pdf=%s" % pdf_path, url])
    if ok and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
        with open(pdf_path, "rb") as fh:
            data = fh.read()
        pages = len(re.findall(rb"/Type\s*/Page[^s]", data))
        print("wrote %s (%d page%s)" % (pdf_path, pages, "" if pages == 1 else "s"))
        return True
    print("PDF was not written.", file=sys.stderr)
    return False


# ---------------------------------------------------------------------------
# design -> roles
# ---------------------------------------------------------------------------


class Kit:
    def __init__(self, design, brief=None, brief_dir=None):
        self.d = design
        self.brief = brief or {}
        self.brief_dir = brief_dir or design.base_dir
        self.t = design.tokens
        self.brand = design.brand()
        cols = design.colors()
        self.cols = cols

        def pick(*names, default=None):
            for n in names:
                if n in cols:
                    return cols[n]
            return default

        bg = pick("surface", "background", "neutral", "paper", default=(0.98, 0.98, 0.97, 1.0))
        ink = pick("on-surface", "on-background", "ink", "text", default=(0.1, 0.1, 0.1, 1.0))
        accent = pick("primary", default=ink)
        r = {
            "bg": bg, "ink": ink,
            "muted": pick("on-surface-variant", "muted", default=mix(ink, bg, 0.35)),
            "line": pick("outline-variant", "outline", "border", default=mix(ink, bg, 0.85)),
            "panel": pick("surface-container", "surface-container-low", "surface-variant", default=mix(bg, ink, 0.035)),
            "accent": accent, "on_accent": pick("on-primary", default=best_on(accent)),
            "accent_soft": pick("primary-container", default=mix(accent, bg, 0.82)),
            "on_accent_soft": pick("on-primary-container", default=ink),
        }
        r["accent2"] = pick("secondary", default=accent)
        r["on_accent2"] = pick("on-secondary", default=best_on(r["accent2"]))
        r["glow"] = pick("tertiary", default=r["accent2"])
        r["on_glow"] = pick("on-tertiary", default=best_on(r["glow"]))
        r["dark_bg"] = pick("dark-surface", "inverse-surface", default=ink)
        r["dark_ink"] = pick("dark-on-surface", "inverse-on-surface", default=bg)
        r["dark_panel"] = pick("dark-surface-container", default=mix(r["dark_bg"], r["dark_ink"], 0.07))
        r["dark_muted"] = pick("dark-on-surface-variant", default=mix(r["dark_ink"], r["dark_bg"], 0.3))
        r["dark_line"] = pick("dark-outline", default=mix(r["dark_ink"], r["dark_bg"], 0.82))
        r["dark_accent"] = pick("dark-primary", default=accent)
        r["dark_on_accent"] = pick("dark-on-primary", default=best_on(r["dark_accent"]))
        self.r = r
        self.has_dark = any(k.startswith("dark-") for k in cols)

        typo = self.t.get("typography") or {}
        self.typo = {k: v for k, v in typo.items() if isinstance(v, dict)}

        def size_px(v):
            return bk._font_px(v.get("fontSize")) or 0

        by_size = sorted(self.typo.items(), key=lambda kv: -size_px(kv[1]))

        def tpick(*parts):
            for p in parts:
                for k in self.typo:
                    if p in k:
                        return k
            return None

        self.t_display = tpick("display", "h1", "headline-lg") or (by_size[0][0] if by_size else None)
        self.t_headline = tpick("headline-md", "headline", "h2", "title") or self.t_display
        self.t_body = tpick("body-md", "body", "paragraph") or (by_size[-1][0] if by_size else None)
        self.t_label = tpick("label-md", "label", "caption") or self.t_body
        self.by_size = by_size

        fonts = [f for f in self.brand.get("fonts") or [] if isinstance(f, dict) and f.get("family")]
        self.fonts = fonts

        def stack(family, generic):
            if not family:
                return generic
            for f in fonts:
                if f["family"] == family:
                    return bk.css_font_stack(family, f.get("fallback") or generic)
            return bk.css_font_stack(family, generic)

        self.f_display = stack(self.typo.get(self.t_display, {}).get("fontFamily"), "Georgia, serif")
        self.f_body = stack(self.typo.get(self.t_body, {}).get("fontFamily"), "system-ui, sans-serif")
        mono = next((f for f in fonts if str(f.get("role", "")).startswith("mono")), None)
        self.f_mono = stack(mono["family"], "ui-monospace, monospace") if mono else "ui-monospace, SFMono-Regular, Menlo, monospace"

        rounded = self.t.get("rounded") or {}

        def dim(*names, default="12px"):
            for n in names:
                if n in rounded:
                    try:
                        return str(design.resolve(rounded[n]))
                    except KeyError:
                        pass
            return default

        self.radius_card = dim("lg", "md", default="14px")
        self.radius_ctrl = dim("md", "sm", default="8px")
        btn = (self.t.get("components") or {}).get("button-primary") or {}
        try:
            self.radius_btn = str(design.resolve(btn.get("rounded"))) if btn.get("rounded") else self.radius_ctrl
        except KeyError:
            self.radius_btn = self.radius_ctrl
        self.shadow = (self.brand.get("shadows") or {}).get("md") or (self.brand.get("shadows") or {}).get("sm") or "0 2px 8px rgba(0,0,0,.08)"

        voice = self.brand.get("voice") or {}
        self.voice = voice
        self.samples = voice.get("samples") or {}
        self.name = str(self.t.get("name") or "Brand")
        self.tagline = str(self.brand.get("tagline") or self.samples.get("headline") or self.t.get("description") or "")

    # -- assets ------------------------------------------------------------
    def logo_path(self, key):
        p = (self.brand.get("logo") or {}).get(key)
        return os.path.join(self.d.base_dir, p) if isinstance(p, str) and p else None

    def logo(self, key, height, color=None, uid="l", cls=""):
        p = self.logo_path(key)
        if not p or not os.path.exists(p):
            return None
        return inline_svg(p, cls, color, self.name, uid, height)

    def generations(self, stage=None):
        out = []
        for g in self.brief.get("generations") or []:
            if not isinstance(g, dict):
                continue
            if stage and g.get("stage") != stage:
                continue
            out.append(g)
        return out


# ---------------------------------------------------------------------------
# html pieces
# ---------------------------------------------------------------------------


def font_faces(fonts, base_dir, out_dir):
    css = []
    for f in fonts:
        for path in f.get("files") or []:
            full = os.path.join(base_dir, path)
            if not os.path.exists(full):
                continue
            weights = f.get("weights") or ("100 900" if re.search(r"(wght|variable|\[)", path, re.I) else "400")
            style = "italic" if "italic" in path.lower() else "normal"
            fmt = {"woff2": "woff2", "woff": "woff", "ttf": "truetype", "otf": "opentype"}.get(path.rsplit(".", 1)[-1].lower(), "woff2")
            css.append("@font-face{font-family:\"%s\";src:url(\"%s\") format(\"%s\");font-weight:%s;font-style:%s;font-display:block}" % (
                f["family"], rel(full, out_dir), fmt, weights, style))
    return "\n".join(css)


def picture(src_abs, out_dir, alt, cls="pic"):
    return '<img class="%s" src="%s" alt="%s" loading="eager">' % (cls, E(rel(src_abs, out_dir)), E(alt))


def placeholder(g, kit, cls="ph"):
    r = kit.r
    hatch = rgba(r["line"], 0.9)
    prompt = str(g.get("prompt", ""))
    return (
        '<div class="%s" style="background:repeating-linear-gradient(135deg,%s 0 13px,%s 13px 14px)">'
        '<div class="ph-in"><span class="ph-tag">To generate</span>'
        '<b>%s</b><p>%s</p><code>%s%s</code></div></div>'
    ) % (cls, hexc(r["panel"]), hatch, E(g.get("label") or g.get("id", "")), E(prompt[:220] + ("..." if len(prompt) > 220 else "")),
         E(str(g.get("model", ""))), (" &middot; " + E(str(g.get("aspectRatio")))) if g.get("aspectRatio") else "")


def gen_tile(g, kit, out_dir, cls="pic"):
    out = g.get("out")
    if out:
        full = os.path.join(kit.brief_dir, out)
        if os.path.exists(full):
            return picture(full, out_dir, g.get("label") or g.get("id", ""), cls)
    return placeholder(g, kit, "ph " + cls)


ICONS = {
    "note": "M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h4",
    "search": "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M15.5 15.5L20 20",
    "link": "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
    "bookmark": "M7 3h10v18l-5-4l-5 4z",
    "calendar": "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
    "sliders": "M4 7h10 M18 7h2 M16 5v4 M4 17h4 M12 17h8 M10 15v4",
    "tag": "M3 12V4h8l10 10l-8 8z M7.5 7.5h.01",
    "share": "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
}


def icon(name, stroke, cap, join, size):
    return ('<svg viewBox="0 0 24 24" width="%d" height="%d" fill="none" stroke="currentColor" stroke-width="%s" '
            'stroke-linecap="%s" stroke-linejoin="%s" aria-hidden="true"><path d="%s"/></svg>') % (size, size, stroke, cap, join, ICONS[name])


def color_label_map(design):
    """Friendly names from prose bullets like '- **Ember (#B5541E):** ...'."""
    out = {}
    content = design.section("Colors") or ""
    for m in re.finditer(r"\*\*([^*(]+?)\s*\((#[0-9A-Fa-f]{6})\):?\*\*:?\s*([^\n]*)", content):
        out[m.group(2).upper()] = (m.group(1).strip(), m.group(3).strip())
    return out


def board_css(kit):
    r = kit.r
    v = {k: hexc(c) for k, c in r.items()}
    return """
*{box-sizing:border-box;margin:0;padding:0}
html{background:%(bg)s;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{width:1600px;margin:0 auto;background:%(bg)s;color:%(ink)s;font-family:%(fbody)s;font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%%}
.board{padding:56px 64px 40px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:24px}
.card{background:%(panel)s;border:1px solid %(line)s;border-radius:%(rc)s;padding:28px;min-width:0}
.s12{grid-column:span 12}.s7{grid-column:span 7}.s5{grid-column:span 5}.s6{grid-column:span 6}.s4{grid-column:span 4}.s8{grid-column:span 8}
.eyebrow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:20px;color:%(muted)s;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.eyebrow b{color:%(ink)s;font-family:%(fdisplay)s;font-size:22px;font-weight:500;letter-spacing:0;text-transform:none}
.muted{color:%(muted)s}.small{font-size:12.5px;line-height:1.45}
code,.mono{font-family:%(fmono)s;font-size:12px}
/* header */
.hero{grid-column:span 12;display:grid;grid-template-columns:1.35fr 1fr;gap:40px;align-items:end;padding:8px 0 24px;border-bottom:1px solid %(line)s}
.hero .wm{color:%(ink)s}
.hero h1{font-family:%(fdisplay)s;font-weight:500;font-size:44px;line-height:1.08;letter-spacing:-.015em;margin-top:28px;max-width:16ch}
.hero .lede{margin-top:14px;max-width:58ch;color:%(muted)s;font-size:16px}
.hero-meta{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:end;justify-items:start}
.sym-tile{width:132px;height:132px;border-radius:%(rc)s;background:%(accent_soft)s;display:grid;place-items:center}
.meta dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:13px}
.meta dt{color:%(muted)s}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.chip{border:1px solid %(line)s;border-radius:999px;padding:3px 11px;font-size:12.5px;background:%(bg)s}
/* logo */
.logo-main{background:%(bg)s;border-radius:%(rcs)s;border:1px solid %(line)s;height:230px;display:grid;place-items:center;position:relative}
.logo-main .clear{position:relative;padding:var(--cs);outline:1px dashed %(muted)s;outline-offset:0}
.logo-main .clear{color:%(ink)s}
.logo-main .cs-note{position:absolute;left:14px;bottom:10px;font-size:11.5px;color:%(muted)s}
.logo-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px}
.logo-tile{border-radius:%(rcs)s;height:118px;display:grid;place-items:center;border:1px solid %(line)s;overflow:hidden}
.sizes{display:flex;align-items:flex-end;gap:22px;margin-top:16px;color:%(ink)s}
.sizes figure{display:grid;justify-items:center;gap:6px;font-size:11px;color:%(muted)s}
.misuse{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}
.misuse figure{background:%(bg)s;border:1px solid %(line)s;border-radius:%(rcs)s;height:66px;display:grid;place-items:center;position:relative;overflow:hidden}
.misuse figure>div{margin-top:-10px}
.misuse figcaption{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:10.5px;color:%(muted)s}
.misuse figure::after{content:"";position:absolute;left:10%%;right:10%%;top:42%%;height:1.5px;background:#C2362B;transform:rotate(-14deg)}
/* palette */
.swatches{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.sw{border-radius:%(rcs)s;padding:12px 12px 10px;min-height:104px;min-width:0;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(0,0,0,.06)}
.sw .nm{font-weight:600;font-size:13.5px}.sw .hx{font-family:%(fmono)s;font-size:11px;opacity:.9;overflow-wrap:anywhere}
.sw .rl{font-size:11.5px;opacity:.85;line-height:1.35;margin-top:4px}
.sw .ct{font-size:11px;font-family:%(fmono)s;align-self:flex-start;border-radius:999px;padding:1px 7px;margin-top:8px;border:1px solid currentColor;opacity:.9}
.dark-strip{display:flex;gap:0;margin-top:14px;border-radius:%(rcs)s;overflow:hidden;border:1px solid %(line)s}
.dark-strip div{flex:1;height:44px;display:grid;place-items:center;font-size:10.5px;font-family:%(fmono)s}
/* type */
.trow{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:baseline;padding:12px 0;border-top:1px solid %(line)s}
.trow:first-of-type{border-top:0}
.trow .tm{font-size:11.5px;color:%(muted)s;line-height:1.4}
.trow .tm b{display:block;color:%(ink)s;font-size:12.5px}
.trow .ts{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fonts{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:16px}
.font{background:%(bg)s;border:1px solid %(line)s;border-radius:%(rcs)s;padding:12px 14px;min-width:0}
.font .small{overflow-wrap:anywhere}
.font .aa{font-size:38px;line-height:1}
/* pairs */
.pairs{width:100%%;border-collapse:collapse;font-size:13px}
.pairs td{padding:7px 6px;border-top:1px solid %(line)s;vertical-align:middle}
.pairs tr:first-child td{border-top:0}
.pairs .demo{border-radius:6px;padding:6px 0;font-weight:600;width:56px;text-align:center;font-size:17px;border:1px solid rgba(0,0,0,.06)}
.grade{font-family:%(fmono)s;font-size:11.5px;border-radius:999px;padding:2px 8px;border:1px solid %(line)s;white-space:nowrap}
.grade.fail{background:#C2362B;color:#fff;border-color:#C2362B}
/* tokens */
.tok-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:28px}
.space-row{display:grid;grid-template-columns:70px 1fr 54px;gap:10px;align-items:center;font-size:12px;margin:5px 0}
.space-row i{display:block;height:10px;background:%(accent)s;border-radius:2px}
.radii{display:flex;gap:12px;flex-wrap:wrap}
.radii figure{display:grid;justify-items:center;gap:6px;font-size:11px;color:%(muted)s}
.radii span{width:54px;height:54px;background:%(accent_soft)s;border:1.5px solid %(accent)s}
.shadows{display:flex;gap:16px;margin-top:18px;flex-wrap:wrap}
.shadows figure{width:96px;height:64px;background:%(bg)s;border-radius:%(rcs)s;display:grid;place-items:center;font-size:11px;color:%(muted)s}
.motion{margin-top:16px;font-size:12px;color:%(muted)s}
/* icons */
.icons{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;color:%(ink)s}
.icons figure{background:%(bg)s;border:1px solid %(line)s;border-radius:%(rcs)s;height:78px;display:grid;place-items:center}
.icons .big{display:flex;gap:18px;align-items:center;margin:14px 0 4px;color:%(accent)s}
.rules{margin-top:14px;font-size:12.5px;padding-left:18px}
.rules li{margin:3px 0}
/* voice */
.voice{display:grid;grid-template-columns:1fr 2fr;gap:32px}
.attrs{display:grid;gap:12px;align-content:start}
.attr{border-left:3px solid %(accent)s;padding:4px 0 4px 12px}
.attr b{font-family:%(fdisplay)s;font-size:20px;font-weight:500}
.dd{display:grid;grid-template-columns:1fr 1fr;gap:12px 20px}
.dd h4{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:%(muted)s;margin-bottom:2px}
.say{background:%(bg)s;border:1px solid %(line)s;border-radius:%(rcs)s;padding:12px 14px;font-size:14px}
.say.no{color:%(muted)s;text-decoration:line-through;text-decoration-color:rgba(194,54,43,.7)}
/* mockups */
.mk{display:grid;grid-template-columns:300px 300px 1fr 1fr;gap:24px;align-items:start}
.mk .ph-wrap{grid-row:span 2}
.mk .cap{font-size:11.5px;color:%(muted)s;margin-top:8px}
.phone{width:300px;height:610px;border-radius:40px;border:10px solid #141414;overflow:hidden;position:relative;box-shadow:0 18px 40px rgba(0,0,0,.18)}
.phone .scr{position:absolute;inset:0;padding:20px 18px;display:flex;flex-direction:column;gap:12px}
.phone .bar{display:flex;justify-content:space-between;font-size:11px;font-weight:600;opacity:.8}
.phone .top{display:flex;align-items:center;gap:8px;margin-top:6px}
.phone .ttl{font-family:%(fdisplay)s;font-size:26px;font-weight:500;line-height:1.1}
.phone .search{border-radius:%(rctl)s;padding:9px 12px;font-size:13px;display:flex;gap:8px;align-items:center}
.phone .item{border-radius:%(rctl)s;padding:12px 13px}
.phone .item b{display:block;font-size:14px}
.phone .item span{font-size:12px;line-height:1.4}
.phone .hl{padding:0 3px;border-radius:3px}
.phone .fab{margin-top:auto;align-self:stretch;text-align:center;border-radius:%(rbtn)s;padding:12px;font-weight:600;font-size:14px}
.bcard{width:100%%;aspect-ratio:1.75;border-radius:8px;padding:22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 26px rgba(0,0,0,.12)}
.bcard .who{font-size:12px;line-height:1.45}
.bcard .who b{font-size:14px}
.stack{display:grid;gap:18px}
.social{width:100%%;aspect-ratio:1;border-radius:10px;padding:30px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 26px rgba(0,0,0,.12)}
.social h3{font-family:%(fdisplay)s;font-size:34px;line-height:1.08;font-weight:500;letter-spacing:-.01em}
.sign-wall{grid-column:3 / span 2;border-radius:10px;padding:36px;background:%(panel)s;display:grid;place-items:center;border:1px solid %(line)s}
.sign{width:100%%;max-width:640px;aspect-ratio:2.4;border-radius:10px;padding:28px 34px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 22px 40px rgba(0,0,0,.22)}
.sign .way{font-size:18px;display:flex;align-items:center;gap:10px}
.gen-row{grid-column:1 / -1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}
.pic,.ph{width:100%%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid %(line)s}
.ph{display:flex;align-items:flex-end;overflow:hidden}
.ph-in{background:%(bg)s;margin:12px;border-radius:8px;padding:10px 12px;border:1px solid %(line)s;font-size:11.5px;line-height:1.4;width:calc(100%% - 24px)}
.ph-in b{display:block;font-size:13px;margin:2px 0}
.ph-in p{color:%(muted)s;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ph-in code{display:block;margin-top:4px;color:%(muted)s;font-size:10.5px}
.ph-tag{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:%(accent)s;font-weight:700}
.mood{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.mood .pic,.mood .ph{aspect-ratio:1}
footer{grid-column:span 12;display:flex;justify-content:space-between;gap:24px;font-size:12px;color:%(muted)s;border-top:1px solid %(line)s;padding-top:16px}
.missing{font-size:12px;color:#C2362B}
@media print{body{margin:0}}
""" % dict(v, fbody=kit.f_body, fdisplay=kit.f_display, fmono=kit.f_mono, rc=kit.radius_card, rcs=kit.radius_ctrl,
           rctl=kit.radius_ctrl, rbtn=kit.radius_btn)


PRINT_FIT = """<script>
(function(){
  function fit(){
    var h=Math.ceil(document.documentElement.scrollHeight)+2;
    var s=document.getElementById('page-size')||document.head.appendChild(Object.assign(document.createElement('style'),{id:'page-size'}));
    s.textContent='@page{size:1600px '+h+'px;margin:0}';
  }
  fit();
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit);}
  window.addEventListener('load',fit);
  window.addEventListener('beforeprint',fit);
})();
</script>"""


def section_header(title, note=""):
    return '<div class="eyebrow"><b>%s</b><span>%s</span></div>' % (E(title), E(note))


def build_board(kit, out_path):
    out_dir = os.path.dirname(os.path.abspath(out_path))
    r = kit.r
    hx = {k: hexc(c) for k, c in r.items()}
    logo_cfg = kit.brand.get("logo") or {}
    parts = []

    # ---- header
    wm = kit.logo("wordmark", 76, None, "h") or '<div class="wm" style="font-family:%s;font-size:64px">%s</div>' % (E(kit.f_display), E(kit.name))
    sym = kit.logo("symbol", 70, None, "hs")
    personality = kit.brand.get("personality") or (kit.voice.get("attributes") or [])
    chips = "".join('<span class="chip">%s</span>' % E(str(p)) for p in personality[:6])
    meta = '<dl><dt>Design system</dt><dd>%s</dd><dt>Profile</dt><dd>%s kit &middot; DESIGN.md %s</dd><dt>Built</dt><dd>%s</dd></dl>' % (
        E(kit.name), E(kit.d.profile()), E(str(kit.t.get("version", "alpha"))), datetime.date.today().isoformat())
    parts.append(
        '<header class="hero"><div>%s<h1>%s</h1><p class="lede">%s</p></div>'
        '<div class="hero-meta">%s<div class="meta">%s<div class="chips">%s</div></div></div></header>' % (
            wm, E(kit.tagline), E(str(kit.t.get("description") or "")),
            ('<div class="sym-tile">%s</div>' % sym) if sym else "", meta, chips))

    # ---- logo
    if kit.d.profile() == "full" or logo_cfg:
        main = kit.logo("lockup", 60, None, "lm") or kit.logo("wordmark", 60, None, "lm2") or E(kit.name)
        cs = float(logo_cfg.get("clearspaceRatio", 0.5) or 0.5)
        rev = kit.logo("lockup", 21, hx["dark_ink"], "lr") or kit.logo("wordmark", 21, hx["dark_ink"], "lr2") or ""
        mono = kit.logo("lockup", 21, hx["ink"], "lmo") or kit.logo("wordmark", 21, hx["ink"], "lmo2") or ""
        on_accent = kit.logo("lockup", 21, hx["on_accent"], "la") or kit.logo("wordmark", 21, hx["on_accent"], "la2") or ""
        sizes = ""
        if kit.logo_path("symbol"):
            for px in (64, 32, 16):
                s = kit.logo("symbol", px, None, "sz%d" % px)
                sizes += '<figure>%s%dpx</figure>' % (s, px)
        min_w = logo_cfg.get("minWidthPx")
        if min_w and kit.logo_path("wordmark"):
            s = kit.logo("wordmark", 1, None, "minw")
            vbm = re.search(r"width:([\d.]+)px", s)
            ratio = float(vbm.group(1)) if vbm else 8.0
            s = kit.logo("wordmark", float(min_w) / ratio, None, "minw")
            sizes += '<figure>%smin %spx</figure>' % (s, min_w)
        mis_src = kit.logo("wordmark", 15, None, "mi1") or ""
        misuse = ""
        if mis_src:
            misuse = '<div class="misuse">%s</div>' % "".join(
                '<figure><div style="%s">%s</div><figcaption>%s</figcaption></figure>' % (style, kit.logo("wordmark", 15, col, "mi%d" % i), cap)
                for i, (style, col, cap) in enumerate((
                    ("transform:scaleX(1.3)", None, "Don't stretch"),
                    ("transform:rotate(-12deg)", None, "Don't rotate"),
                    ("", "#7A3FD1", "Don't recolour"),
                    ("filter:drop-shadow(2px 3px 0 rgba(0,0,0,.35))", None, "Don't add effects"),
                )))
        parts.append(
            '<section class="card s7">%s<div class="logo-main" style="--cs:%spx"><div class="clear">%s</div>'
            '<span class="cs-note">Dashed box = minimum clear space (%s&times; mark height)</span></div>'
            '<div class="logo-row"><div class="logo-tile" style="background:%s">%s</div><div class="logo-tile" style="background:%s">%s</div>'
            '<div class="logo-tile" style="background:%s">%s</div></div><div class="sizes">%s</div>%s</section>' % (
                section_header("Logo", "SVG masters in assets/logo"), round(64 * cs), main, cs,
                hx["dark_bg"], rev, hx["bg"], mono, hx["accent"], on_accent, sizes, misuse))

    # ---- palette
    labels = color_label_map(kit.d)
    sw = []
    for name, c in kit.cols.items():
        if name.startswith("on-") or name.startswith("dark-") or name.startswith("inverse-"):
            continue
        on_name = "on-" + name
        on = kit.cols.get(on_name) or best_on(c)
        ratio = bk.contrast_ratio(on, c)
        friendly, role = labels.get(hexc(c), (name, ""))
        role = re.sub(r"^`[^`]*`\.\s*", "", role)
        sw.append('<div class="sw" style="background:%s;color:%s"><div><div class="nm">%s</div><div class="hx">%s &middot; %s</div>'
                  '<div class="rl">%s</div></div><span class="ct">Aa %.2f %s</span></div>' % (
                      hexc(c), hexc(on), E(friendly), E(name), hexc(c), E(role[:70]),
                      bk.floor2(ratio), bk.grade(ratio)))
    dark = ""
    if kit.has_dark:
        cells = []
        for name, c in kit.cols.items():
            if name.startswith("dark-"):
                cells.append('<div style="background:%s;color:%s">%s</div>' % (hexc(c), hexc(best_on(c)), E(name[5:])))
        dark = '<p class="small muted" style="margin-top:14px">Dark mode</p><div class="dark-strip">%s</div>' % "".join(cells)
    parts.append('<section class="card s5">%s<div class="swatches">%s</div>%s</section>' % (
        section_header("Colour", "%d tokens" % len(kit.cols)), "".join(sw), dark))

    # ---- typography
    sample = str(kit.samples.get("headline") or kit.tagline or kit.name)
    rows = []
    for name, t in kit.by_size[:8]:
        fam = t.get("fontFamily", "")
        cls = "type-%s" % name
        px = bk._font_px(t.get("fontSize")) or 16
        if name == kit.t_display or px >= 48:
            text = kit.name
        elif px >= 22:
            text = sample
        elif px >= 14:
            text = str(kit.samples.get("body") or "Clear words, set at a size people can read.")
        else:
            text = "Label, metadata and captions"
        rows.append('<div class="trow"><div class="tm"><b>%s</b>%s &middot; %s / %s &middot; %s</div><div class="ts %s" style="font-size:%s">%s</div></div>' % (
            E(name), E(fam), E(str(t.get("fontSize"))), E(str(t.get("lineHeight", ""))), E(str(t.get("fontWeight", ""))), cls,
            E(str(min(px, 52))) + "px", E(text)))
    fonts = "".join(
        '<div class="font"><div class="aa" style="font-family:%s">Aa</div><div style="margin-top:8px;font-weight:600">%s</div>'
        '<div class="small muted">%s &middot; %s<br>%s</div></div>' % (
            E(bk.css_font_stack(f["family"], f.get("fallback", ""))), E(f["family"]), E(str(f.get("role", ""))), E(str(f.get("license", "?"))),
            E(re.sub(r"^https?://(www\.)?", "", str(f.get("source", "")))[:42]))
        for f in kit.fonts)
    parts.append('<section class="card s7">%s%s<div class="fonts">%s</div></section>' % (
        section_header("Typography", "open-licensed families"), "".join(rows), fonts))

    # ---- accessible pairs
    import contrast as cmod
    prow = []
    rows_all = cmod.design_pairs(kit.d)
    declared = [x for x in rows_all if x["source"].startswith("brand.pairs")]
    for row in (declared or rows_all)[:12]:
        fg, bg = kit.d.color(row["fg"]), kit.d.color(row["bg"])
        if fg is None or bg is None:
            continue
        ratio = bk.contrast_ratio(fg, bg)
        ok = ratio >= row["min"]
        prow.append('<tr><td><div class="demo" style="background:%s;color:%s">Aa</div></td><td>%s<div class="small muted">%s on %s</div></td>'
                    '<td style="text-align:right"><span class="grade%s">%.2f &middot; %s</span></td></tr>' % (
                        hexc(bg), hexc(fg), E(row.get("use") or row["source"]), E(str(row["fg"]).strip("{}").replace("colors.", "")), E(str(row["bg"]).strip("{}").replace("colors.", "")),
                        "" if ok else " fail", bk.floor2(ratio), "pass %.1f" % row["min"] if ok else "below %.1f" % row["min"]))
    parts.append('<section class="card s5">%s<table class="pairs">%s</table><p class="small muted" style="margin-top:12px">'
                 'WCAG 2.2: 4.5:1 for body text, 3:1 for large text and UI shapes. Checked by scripts/contrast.py.</p></section>' % (
                     section_header("Accessible pairs", "contrast-checked"), "".join(prow) or "<tr><td>No pairs declared.</td></tr>"))

    # ---- tokens
    spacing = kit.t.get("spacing") or {}
    srows = []
    for k, v in spacing.items():
        d = bk.parse_dimension(v)
        if d and d[1] == "px":
            srows.append('<div class="space-row"><span>%s</span><i style="width:%spx"></i><span class="muted">%s</span></div>' % (E(k), min(d[0] * 3, 280), E(str(v))))
    radii = "".join('<figure><span style="border-radius:%s"></span>%s &middot; %s</figure>' % (E(str(v)), E(k), E(str(v)))
                    for k, v in (kit.t.get("rounded") or {}).items() if bk.parse_dimension(v))
    shadows = "".join('<figure style="box-shadow:%s">%s</figure>' % (E(str(v)), E(k)) for k, v in (kit.brand.get("shadows") or {}).items())
    motion = kit.brand.get("motion") or {}
    mtxt = " &middot; ".join("%s %s" % (E(k), E(str(v))) for k, v in motion.items())
    parts.append('<section class="card s7">%s<div class="tok-grid"><div><p class="small muted" style="margin-bottom:8px">Spacing</p>%s</div>'
                 '<div><p class="small muted" style="margin-bottom:8px">Radius</p><div class="radii">%s</div><p class="small muted" style="margin-top:18px">Elevation</p>'
                 '<div class="shadows">%s</div></div></div>%s</section>' % (
                     section_header("Tokens", "tokens.json + tokens.css"), "".join(srows), radii, shadows,
                     ('<p class="motion">Motion: %s</p>' % mtxt) if mtxt else ""))

    # ---- icons
    ic = kit.brand.get("icons") or {}
    stroke = ic.get("stroke", 1.75)
    cap = ic.get("cap", "round")
    join = ic.get("join", "round")
    icons = "".join("<figure>%s</figure>" % icon(n, stroke, cap, join, 28) for n in ICONS)
    big = "".join(icon(n, stroke, cap, join, 48) for n in ("note", "search", "bookmark"))
    rules = [
        "%s px grid, %s px live area" % (ic.get("grid", 24), ic.get("liveArea", 20)),
        "%s px stroke, %s caps, %s joins" % (stroke, cap, join),
        "Style: %s" % ic.get("style", "outline"),
    ]
    rules += [str(x) for x in ic.get("rules") or []]
    parts.append('<section class="card s5">%s<div class="icons">%s</div><div class="big">%s</div><ul class="rules">%s</ul></section>' % (
        section_header("Iconography", "sample set drawn to the rules"), icons, big, "".join("<li>%s</li>" % E(x) for x in rules)))

    # ---- voice
    attrs = "".join('<div class="attr"><b>%s</b></div>' % E(str(a)) for a in (kit.voice.get("attributes") or [])[:5])
    do = [str(x) for x in kit.voice.get("do") or []]
    dont = [str(x) for x in kit.voice.get("dont") or []]
    dd = '<div><h4>Say</h4></div><div><h4>Not</h4></div>'
    for i in range(max(len(do), len(dont))):
        dd += '<div class="say">%s</div><div class="say no">%s</div>' % (E(do[i]) if i < len(do) else "", E(dont[i]) if i < len(dont) else "")
    parts.append('<section class="card s12">%s<div class="voice"><div class="attrs">%s</div><div class="dd">%s</div></div></section>' % (
        section_header("Voice & tone", "copy examples"), attrs, dd))

    # ---- mockups
    parts.append(mockups(kit, out_dir))

    # ---- moodboard
    mood = [g for g in kit.generations("directions") if str(g.get("direction", "")) == str(kit.brief.get("picked", ""))]
    tiles = [gen_tile(g, kit, out_dir) for g in mood]
    if not tiles:
        for p in sorted(glob.glob(os.path.join(kit.d.base_dir, "**", "moodboard", "*"), recursive=True))[:6]:
            if p.lower().endswith(IMAGE_EXT):
                tiles.append(picture(p, out_dir, "moodboard"))
    if tiles:
        style = (kit.brand.get("imagery") or {}).get("style", "")
        parts.append('<section class="card s12">%s<div class="mood">%s</div>%s</section>' % (
            section_header("Imagery", "chosen direction"), "".join(tiles),
            ('<p class="small muted" style="margin-top:12px">Prompt style: %s</p>' % E(style)) if style else ""))

    fonts_note = "; ".join("%s (%s)" % (f["family"], f.get("license", "?")) for f in kit.fonts)
    parts.append('<footer><span>%s brand board &middot; generated from DESIGN.md</span><span>Fonts: %s</span></footer>' % (E(kit.name), E(fonts_note)))

    faces = font_faces(kit.fonts, kit.d.base_dir, out_dir)
    tokens_css = bk.design_to_css(kit.t)
    doc = (
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=1600\">"
        "<title>%s brand board</title>\n<style>\n%s\n%s\n%s\n</style></head>\n<body><main class=\"board\">\n%s\n</main>\n%s\n</body></html>\n"
    ) % (E(kit.name), faces, tokens_css, board_css(kit), "\n".join(parts), PRINT_FIT)
    os.makedirs(out_dir, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(doc)
    return doc


def phone(kit, dark=False):
    r = kit.r
    if dark:
        bg, ink, panel, muted, line, acc, on_acc = (r["dark_bg"], r["dark_ink"], r["dark_panel"], r["dark_muted"], r["dark_line"], r["dark_accent"], r["dark_on_accent"])
    else:
        bg, ink, panel, muted, line, acc, on_acc = (r["bg"], r["ink"], r["panel"], r["muted"], r["line"], r["accent"], r["on_accent"])
    s = kit.samples
    items = [str(x) for x in (s.get("listItems") or [])][:3] or ["First item", "Second item", "Third item"]
    excerpts = [str(x) for x in (s.get("listExcerpts") or [])][:3] or ["A short line of supporting text."] * 3
    hl = str(s.get("highlight") or "")
    sym = kit.logo("symbol", 22, hexc(ink) if dark else None, "ph%d" % dark) or ""
    cards = ""
    for i, title in enumerate(items):
        ex = E(excerpts[i % len(excerpts)])
        if hl and hl in excerpts[i % len(excerpts)]:
            ex = ex.replace(E(hl), '<mark class="hl" style="background:%s;color:%s">%s</mark>' % (
                hexc(r["glow"]) if not dark else rgba(r["glow"], 0.35), hexc(r["on_glow"]) if not dark else hexc(ink), E(hl)), 1)
        cards += '<div class="item" style="background:%s;border:1px solid %s"><b>%s</b><span style="color:%s">%s</span></div>' % (
            hexc(panel), hexc(line), E(title), hexc(muted), ex)
    return (
        '<div class="ph-wrap"><div class="phone" style="background:%s;color:%s"><div class="scr"><div class="bar"><span>9:41</span><span>&#9679;&#9679;&#9679;</span></div>'
        '<div class="top">%s<span class="small" style="color:%s">%s</span></div><div class="ttl">%s</div>'
        '<div class="search" style="background:%s;border:1px solid %s;color:%s">%s %s</div>%s'
        '<div class="fab" style="background:%s;color:%s">%s</div></div></div><p class="cap">App screen, %s</p></div>'
    ) % (hexc(bg), hexc(ink), sym, hexc(muted), E(kit.name), E(str(s.get("appTitle") or "Today")), hexc(panel), hexc(line), hexc(muted),
         icon("search", 1.75, "round", "round", 16), E(str(s.get("search") or "Search")), cards, hexc(acc), hexc(on_acc),
         E(str(s.get("cta") or "Get started")), "dark mode" if dark else "light mode")


def mockups(kit, out_dir):
    r = kit.r
    hx = {k: hexc(c) for k, c in r.items()}
    s = kit.samples
    slug = bk.slug(kit.name) or "brand"
    front = kit.logo("lockup", 26, None, "bc1") or kit.logo("wordmark", 26, None, "bc1w") or E(kit.name)
    back = kit.logo("symbol", 34, hx["on_accent"], "bc2") or kit.logo("wordmark", 22, hx["on_accent"], "bc2w") or E(kit.name)
    social_logo = kit.logo("wordmark", 20, hx["on_accent2"], "so") or ""
    sign_logo = kit.logo("lockup", 40, hx["dark_ink"], "sg") or kit.logo("wordmark", 40, hx["dark_ink"], "sgw") or E(kit.name)
    second = phone(kit, dark=True) if kit.has_dark else phone(kit, dark=False).replace("light mode", "second screen")
    html_mk = (
        '<div class="mk">%s%s'
        '<div class="stack"><div class="bcard" style="background:%s;color:%s">%s<div class="who"><b>Your Name</b><br>Role or title</div></div>'
        '<div class="bcard" style="background:%s;color:%s">%s<div class="who">hello@%s.example<br>%s.example</div></div><p class="cap">Business card, front and back</p></div>'
        '<div><div class="social" style="background:%s;color:%s"><span class="small" style="opacity:.85">%s</span><h3>%s</h3>%s</div><p class="cap">Social post, 1:1</p></div>'
        '<div class="sign-wall"><div class="sign" style="background:%s;color:%s">%s<div class="way">%s %s</div></div></div>'
    ) % (
        phone(kit, dark=False), second,
        hx["bg"], hx["ink"], front,
        hx["accent"], hx["on_accent"], back, E(slug), E(slug),
        hx["accent2"], hx["on_accent2"], E(str(s.get("socialKicker") or kit.name)), E(str(s.get("social") or kit.tagline)), social_logo,
        hx["dark_bg"], hx["dark_ink"], sign_logo, E(str(s.get("sign") or "Welcome")), icon("share", 1.75, "round", "round", 22),
    )
    gens = kit.generations("mockups")
    tiles = "".join('<div>%s<p class="cap">%s</p></div>' % (gen_tile(g, kit, out_dir), E(g.get("label") or g.get("id", ""))) for g in gens)
    if not gens:
        for p in sorted(glob.glob(os.path.join(kit.d.base_dir, "**", "mockups", "*"), recursive=True))[:4]:
            if p.lower().endswith(IMAGE_EXT):
                tiles += '<div>%s<p class="cap">%s</p></div>' % (picture(p, out_dir, "mockup"), E(os.path.splitext(os.path.basename(p))[0].replace("-", " ")))
    if tiles:
        html_mk += '<div class="gen-row">%s</div>' % tiles
    html_mk += "</div>"
    return '<section class="card s12">%s%s</section>' % (section_header("Applications", "HTML mockups use the real tokens; photo mockups come from PopNow"), html_mk)


# ---------------------------------------------------------------------------
# directions page
# ---------------------------------------------------------------------------


def build_directions(brief, brief_dir, out_path):
    out_dir = os.path.dirname(os.path.abspath(out_path))
    gens = {g.get("id"): g for g in brief.get("generations") or [] if isinstance(g, dict)}
    faces = []
    for fam, path in (brief.get("fontFiles") or {}).items():
        full = os.path.join(brief_dir, path)
        if os.path.exists(full):
            faces.append("@font-face{font-family:\"%s\";src:url(\"%s\") format(\"woff2\");font-weight:100 900;font-display:block}" % (fam, rel(full, out_dir)))
    picked = str(brief.get("picked") or "")
    cards = []
    for dirn in brief.get("directions") or []:
        pal = dirn.get("palette") or {}
        cols = {k: bk.parse_color(v) for k, v in pal.items() if bk.parse_color(v)}
        if not cols:
            continue
        names = list(cols)
        paper = cols.get("paper") or cols.get("surface") or cols[names[-1]]
        ink = cols.get("ink") or cols.get("text") or best_on(paper)
        accent = cols.get("accent") or cols[names[0]]
        fonts = dirn.get("fonts") or {}
        # stacks go into style="..." attributes, so their quotes must be escaped
        fd = E(bk.css_font_stack(fonts.get("display", "Georgia"), "Georgia, serif"))
        fb = E(bk.css_font_stack(fonts.get("body", "system-ui"), "system-ui, sans-serif"))
        fa = E(bk.css_font_stack(fonts["accent"], "cursive")) if fonts.get("accent") else fd
        fake_kit = type("K", (), {"r": {"panel": mix(paper, ink, 0.05), "line": mix(ink, paper, 0.8), "bg": paper, "muted": mix(ink, paper, 0.4), "accent": accent}})()
        tiles = []
        for tid in dirn.get("tiles") or []:
            g = gens.get(tid, {"id": tid, "prompt": ""})
            out = g.get("out")
            if out and os.path.exists(os.path.join(brief_dir, out)):
                tiles.append(picture(os.path.join(brief_dir, out), out_dir, g.get("label") or tid, "t"))
            else:
                tiles.append(placeholder(g, fake_kit, "ph t"))
        while len(tiles) < 3:
            tiles.append('<div class="t" style="background:%s"></div>' % hexc(mix(paper, accent, 0.2)))
        chips = "".join('<div style="background:%s;color:%s"><b>%s</b><span>%s</span></div>' % (
            hexc(c), hexc(best_on(c)), E(k), hexc(c)) for k, c in cols.items())
        ratios = "ink on paper %.2f &middot; %s on accent %.2f" % (
            bk.floor2(bk.contrast_ratio(ink, paper)), "white" if best_on(accent) == WHITE else "black", bk.floor2(bk.contrast_ratio(best_on(accent), accent)))
        is_picked = picked and str(dirn.get("id")) == picked
        cards.append(
            '<article class="dir%s" style="--paper:%s;--ink:%s;--accent:%s;background:%s;color:%s">'
            '<header><span class="id" style="background:%s;color:%s">%s</span><h2 style="font-family:%s">%s</h2>%s</header>'
            '<p class="sum" style="font-family:%s">%s</p>'
            '<div class="grid"><div class="a">%s</div><div class="b">%s</div><div class="c">%s</div>'
            '<div class="spec" style="background:%s;color:%s"><div style="font-family:%s;font-size:56px;line-height:1">Aa</div>'
            '<div style="font-family:%s;font-size:13px;margin-top:6px">%s / %s</div></div>'
            '<div class="voice" style="background:%s;color:%s;font-family:%s">&ldquo;%s&rdquo;</div></div>'
            '<div class="pal">%s</div><p class="kw" style="font-family:%s">%s</p><p class="ct" style="font-family:%s">%s</p></article>' % (
                " picked" if is_picked else "", hexc(paper), hexc(ink), hexc(accent), hexc(paper), hexc(ink),
                hexc(accent), hexc(best_on(accent)), E(str(dirn.get("id", ""))), fd, E(str(dirn.get("name", ""))),
                '<span class="pk">Chosen</span>' if is_picked else "",
                fb, E(str(dirn.get("summary", ""))),
                tiles[0], tiles[1], tiles[2],
                hexc(mix(paper, ink, 0.06)), hexc(ink), fd, fb, E(str(fonts.get("display", ""))), E(str(fonts.get("body", ""))),
                hexc(accent), hexc(best_on(accent)), fa, E(str(dirn.get("voice", ""))),
                chips, fb, E(" / ".join(str(k) for k in dirn.get("keywords") or [])), fb, ratios))
    css = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#ECEAE6;color:#1D1B18;font-family:system-ui,sans-serif;padding:40px}
h1{font-size:22px;font-weight:600}.top p{color:#5C5852;margin-top:6px;max-width:80ch}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px;margin-top:24px}
.dir{border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:14px;border:1px solid rgba(0,0,0,.08)}
.dir.picked{outline:3px solid var(--accent);outline-offset:3px}
.dir header{display:flex;align-items:center;gap:12px}
.dir .id{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700}
.dir h2{font-size:28px;font-weight:500;flex:1}
.pk{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--accent)}
.sum{font-size:14.5px;line-height:1.5;opacity:.9}
.grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:150px 150px;gap:10px}
.grid .a{grid-row:span 2}.grid>div{border-radius:10px;overflow:hidden;min-height:0}
.grid .t,.grid .ph{width:100%;height:100%;object-fit:cover;display:flex;align-items:flex-end;border-radius:10px}
.spec{padding:14px}.voice{padding:14px;font-size:19px;line-height:1.25;display:flex;align-items:flex-end}
.ph-in{background:var(--paper);color:var(--ink);margin:8px;border-radius:7px;padding:7px 9px;font-size:10.5px;line-height:1.35;width:calc(100% - 16px)}
.ph-in b{display:block;font-size:11.5px}.ph-in p{opacity:.7;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.ph-in code{display:none}.grid .b .ph-in p,.grid .c .ph-in p{display:none}.ph-tag{font-size:9px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;color:var(--accent)}
.pal{display:flex;border-radius:10px;overflow:hidden}.pal div{flex:1;padding:10px 8px;font-size:10.5px;display:flex;flex-direction:column;gap:2px}
.pal span{font-family:ui-monospace,monospace;opacity:.85}
.kw{font-size:13px;opacity:.8}.ct{font-size:11.5px;opacity:.65}
"""
    title = "%s: three directions" % brief.get("product", {}).get("name", "Brand") if isinstance(brief.get("product"), dict) else "Three directions"
    doc = (
        "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        "<title>%s</title><style>%s\n%s</style></head><body><div class=\"top\"><h1>%s</h1><p>Pick one direction (or name what to borrow from another). "
        "Colours and type are rendered live; pictures are PopNow drafts or placeholders until generated.</p></div><div class=\"row\">%s</div></body></html>\n"
    ) % (E(title), "\n".join(faces), css, E(title), "".join(cards))
    os.makedirs(out_dir, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(doc)
    return doc


# ---------------------------------------------------------------------------
# commands
# ---------------------------------------------------------------------------


def load_brief(path):
    if not path:
        return None, None
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh), os.path.dirname(os.path.abspath(path))


def offline_check(doc):
    """External http(s) references would break the offline promise."""
    return re.findall(r"(?:src|href)\s*=\s*[\"'](https?://[^\"']+)|url\([\"']?(https?://[^)\"']+)", doc)


def cmd_build(a):
    design = bk.load_design(a.design)
    if design.errors:
        for rule, msg in design.errors:
            print("ERROR %s: %s" % (rule, msg), file=sys.stderr)
        return 2
    brief, bdir = load_brief(a.brief)
    kit = Kit(design, brief, bdir)
    doc = build_board(kit, a.out)
    ext = offline_check(doc)
    print("wrote %s (%d KB%s)" % (a.out, len(doc) // 1024, ", WARNING external refs: %s" % ext if ext else ", offline"))
    if a.pdf:
        to_pdf(a.out, a.pdf)
    return 0


def cmd_directions(a):
    brief, bdir = load_brief(a.brief)
    if not brief.get("directions"):
        print("The brief has no 'directions' list.", file=sys.stderr)
        return 2
    build_directions(brief, bdir, a.out)
    print("wrote %s (%d directions)" % (a.out, len(brief["directions"])))
    return 0


def cmd_pdf(a):
    return 0 if to_pdf(a.html, a.out) else 1


def cmd_png(a):
    src = os.path.abspath(a.svg)
    size = a.size
    bg = a.background
    tmp = tempfile.mkdtemp(prefix="brandkit-png-")
    try:
        page = os.path.join(tmp, "p.html")
        with open(page, "w", encoding="utf-8") as fh:
            fh.write('<!doctype html><html><body style="margin:0;background:%s;width:%dpx;height:%dpx;display:grid;place-items:center">'
                     '<img src="%s" style="width:%d%%;height:%d%%;object-fit:contain"></body></html>' % (
                         bg, size, size, "file://" + src.replace(os.sep, "/"), a.fill, a.fill))
        out = os.path.abspath(a.out)
        args = ["--screenshot=%s" % out, "--window-size=%d,%d" % (size, size), "--allow-file-access-from-files",
                "file://" + page.replace(os.sep, "/")]
        if bg == "transparent":
            args.insert(0, "--default-background-color=00000000")
        ok = run_chrome(args)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    if ok and os.path.exists(a.out):
        print("wrote %s (%dx%d)" % (a.out, size, size))
        return 0
    return 1


def main(argv=None):
    ap = argparse.ArgumentParser(description="Brand board, directions page, PDF and PNG export.")
    sub = ap.add_subparsers(dest="cmd")
    b = sub.add_parser("build", help="DESIGN.md -> one-page brand board HTML (+ PDF)")
    b.add_argument("design")
    b.add_argument("--brief")
    b.add_argument("--out", required=True)
    b.add_argument("--pdf")
    d = sub.add_parser("directions", help="brief.json directions -> side-by-side moodboard page")
    d.add_argument("brief")
    d.add_argument("--out", required=True)
    p = sub.add_parser("pdf", help="print an HTML page to a one-page PDF")
    p.add_argument("html")
    p.add_argument("--out", required=True)
    g = sub.add_parser("png", help="render an SVG to PNG (for upload as a reference image)")
    g.add_argument("svg")
    g.add_argument("--out", required=True)
    g.add_argument("--size", type=int, default=1024)
    g.add_argument("--fill", type=int, default=70, help="logo size as %% of the canvas")
    g.add_argument("--background", default="#FFFFFF", help="CSS colour or 'transparent'")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        return cmd_build(a)
    if a.cmd == "directions":
        return cmd_directions(a)
    if a.cmd == "pdf":
        return cmd_pdf(a)
    if a.cmd == "png":
        return cmd_png(a)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
