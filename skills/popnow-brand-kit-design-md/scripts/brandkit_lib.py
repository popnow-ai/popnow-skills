"""Shared helpers for the brand kit scripts.

Python 3.8+ standard library only. Contents:
  - a small YAML subset (load/dump) for DESIGN.md front matter,
  - colour parsing, WCAG 2.x contrast and OKLab/OKLCH maths,
  - DESIGN.md parsing (front matter, interleaved yaml blocks, sections),
  - token conversion: DESIGN.md <-> W3C design tokens (DTCG 2025.10) <-> CSS.

The YAML subset covers what DESIGN.md files use: block mappings and sequences,
"- key: value" items, flow lists of scalars ([a, b]), quoted and plain scalars,
numbers, booleans, null, comments and | / > block scalars. Anchors, tags and
flow mappings are rejected with a clear message.
"""

import json
import math
import os
import re

# ---------------------------------------------------------------------------
# YAML subset
# ---------------------------------------------------------------------------


class YamlError(ValueError):
    pass


_INT = re.compile(r"^[-+]?\d+$")
_FLOAT = re.compile(r"^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$")
_PLAIN_KEY = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")
_PLAIN_VALUE = re.compile(r"^[A-Za-z0-9_(][A-Za-z0-9 _.,()/%+'&-]*$")
_RESERVED = {"true", "false", "True", "False", "TRUE", "FALSE", "null", "Null", "NULL", "~", "yes", "no", "on", "off"}


def _strip_comment(s):
    """Drop a trailing ' # comment' that is outside quotes."""
    out = []
    quote = None
    i = 0
    while i < len(s):
        c = s[i]
        if quote:
            out.append(c)
            if quote == '"' and c == "\\" and i + 1 < len(s):
                out.append(s[i + 1])
                i += 2
                continue
            if c == quote:
                if quote == "'" and i + 1 < len(s) and s[i + 1] == "'":
                    out.append("'")
                    i += 2
                    continue
                quote = None
        else:
            prev = "".join(out).rstrip()
            if c in "\"'" and (prev == "" or prev[-1] in ":-[,"):
                quote = c
                out.append(c)
            elif c == "#" and (i == 0 or s[i - 1] in " \t"):
                break
            else:
                out.append(c)
        i += 1
    return "".join(out).rstrip()


def _split_flow(s):
    items, cur, quote = [], [], None
    for c in s:
        if quote:
            cur.append(c)
            if c == quote:
                quote = None
        elif c in "\"'":
            quote = c
            cur.append(c)
        elif c == ",":
            items.append("".join(cur).strip())
            cur = []
        else:
            cur.append(c)
    tail = "".join(cur).strip()
    if tail or items:
        items.append(tail)
    return [x for x in items if x != ""]


def _scalar(s, where=""):
    s = s.strip()
    if s == "":
        return None
    if s[0] == '"':
        if len(s) < 2 or s[-1] != '"':
            raise YamlError("%sunterminated double-quoted string" % where)
        try:
            return json.loads(s)
        except ValueError as exc:
            raise YamlError("%sbad double-quoted string (%s)" % (where, exc))
    if s[0] == "'":
        if len(s) < 2 or s[-1] != "'":
            raise YamlError("%sunterminated single-quoted string" % where)
        return s[1:-1].replace("''", "'")
    if s[0] == "[":
        if s[-1] != "]":
            raise YamlError("%sunterminated flow list" % where)
        return [_scalar(x, where) for x in _split_flow(s[1:-1])]
    if s[0] == "{":
        if s == "{}":
            return {}
        raise YamlError(
            "%sflow mappings are not supported; if this is a token reference, quote it: \"%s\"" % (where, s)
        )
    if s[0] in "&*!|>@`":
        raise YamlError("%sunsupported YAML syntax: %s" % (where, s[:20]))
    if s in ("~", "null", "Null", "NULL"):
        return None
    if s in ("true", "True", "TRUE"):
        return True
    if s in ("false", "False", "FALSE"):
        return False
    if _INT.match(s):
        return int(s)
    if _FLOAT.match(s):
        return float(s)
    return s


class _Parser:
    def __init__(self, text, line_offset=0):
        self.raw = text.replace("\r\n", "\n").split("\n")
        self.i = 0
        self.off = line_offset

    def where(self):
        return "line %d: " % (self.i + 1 + self.off)

    def peek(self):
        while self.i < len(self.raw):
            r = self.raw[self.i]
            body = r.lstrip(" ")
            if body.startswith("\t"):
                raise YamlError(self.where() + "tabs are not allowed for indentation")
            s = body.strip()
            if s == "" or s.startswith("#"):
                self.i += 1
                continue
            return len(r) - len(body), _strip_comment(body)
        return None

    def node(self, ind):
        p = self.peek()
        if p is None:
            return None
        if p[1] == "-" or p[1].startswith("- "):
            return self.seq(p[0])
        return self.mapping(p[0])

    def split_key(self, content):
        if content[:1] in "\"'":
            q = content[0]
            j = 1
            while j < len(content):
                if content[j] == "\\" and q == '"':
                    j += 2
                    continue
                if content[j] == q:
                    if q == "'" and content[j + 1:j + 2] == "'":
                        j += 2
                        continue
                    break
                j += 1
            rest = content[j + 1:]
            if not rest.startswith(":") or (len(rest) > 1 and rest[1] != " "):
                return None
            return _scalar(content[:j + 1]), rest[1:].strip()
        m = re.match(r"^([^:#\[\]{},][^:]*?):(\s+|$)", content)
        if not m:
            return None
        return m.group(1).strip(), content[m.end():].strip()

    def block_scalar(self, header, ind):
        style = header[0]
        chomp = header[1:2]
        lines = []
        self.i += 1
        block_ind = None
        while self.i < len(self.raw):
            r = self.raw[self.i]
            if r.strip() == "":
                lines.append("")
                self.i += 1
                continue
            cur = len(r) - len(r.lstrip(" "))
            if cur <= ind:
                break
            if block_ind is None:
                block_ind = cur
            lines.append(r[block_ind:] if cur >= block_ind else r.lstrip(" "))
            self.i += 1
        while lines and lines[-1] == "":
            lines.pop()
        if style == "|":
            text = "\n".join(lines)
        else:
            paras, buf = [], []
            for ln in lines:
                if ln == "":
                    paras.append(" ".join(buf))
                    buf = []
                else:
                    buf.append(ln.strip())
            paras.append(" ".join(buf))
            text = "\n".join(paras)
        if chomp != "-":
            text += "\n"
        return text

    def value(self, rest, ind):
        if rest == "":
            p = self.peek()
            if p is None:
                return None
            if p[0] > ind:
                return self.node(p[0])
            if p[0] == ind and (p[1] == "-" or p[1].startswith("- ")):
                return self.seq(ind)
            return None
        if rest[0] in "|>":
            self.i -= 1
            return self.block_scalar(rest, ind)
        return _scalar(rest, self.where())

    def mapping(self, ind):
        obj = {}
        while True:
            p = self.peek()
            if p is None or p[0] < ind:
                break
            if p[0] > ind:
                raise YamlError(self.where() + "unexpected indentation")
            content = p[1]
            if content == "-" or content.startswith("- "):
                break
            kv = self.split_key(content)
            if kv is None:
                raise YamlError(self.where() + "expected 'key: value', got: %s" % content[:60])
            key, rest = kv
            if key in obj:
                raise YamlError(self.where() + "duplicate key '%s'" % key)
            self.i += 1
            obj[key] = self.value(rest, ind)
        return obj

    def seq(self, ind):
        arr = []
        while True:
            p = self.peek()
            if p is None or p[0] != ind:
                if p is not None and p[0] > ind:
                    raise YamlError(self.where() + "unexpected indentation in list")
                break
            content = p[1]
            if not (content == "-" or content.startswith("- ")):
                break
            rest = content[1:].lstrip(" ")
            offset = len(content) - len(rest)
            if rest == "":
                self.i += 1
                arr.append(self.value("", ind))
            elif rest[0] not in "\"'[" and self.split_key(rest) is not None:
                self.raw[self.i] = " " * (ind + offset) + rest
                arr.append(self.mapping(ind + offset))
            elif rest[0] in "\"'" and self.split_key(rest) is not None:
                self.raw[self.i] = " " * (ind + offset) + rest
                arr.append(self.mapping(ind + offset))
            else:
                self.i += 1
                arr.append(_scalar(rest, self.where()))
        return arr


def yaml_load(text, line_offset=0):
    """Parse the YAML subset. Returns dict/list/scalar; raises YamlError."""
    p = _Parser(text, line_offset)
    first = p.peek()
    if first is None:
        return {}
    result = p.node(first[0])
    if p.peek() is not None:
        raise YamlError(p.where() + "could not parse this line (check indentation)")
    return result


def _is_scalar(v):
    return v is None or isinstance(v, (str, int, float, bool))


def _short_list(v):
    """Lists of single words or numbers stay inline ([calm, warm]); sentences go one per line."""
    return (
        all(_is_scalar(x) for x in v)
        and not any(isinstance(x, str) and " " in x.strip() for x in v)
        and len(_inline(v)) <= 72
    )


def _quote(s, in_flow=False):
    if (
        s
        and s == s.strip()
        and s not in _RESERVED
        and _PLAIN_VALUE.match(s)
        and not _INT.match(s)
        and not _FLOAT.match(s)
        and ": " not in s
        and " #" not in s
        and not (in_flow and ("," in s or "[" in s or "]" in s))
    ):
        return s
    return json.dumps(s, ensure_ascii=False)


def _inline(v, in_flow=False):
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(round(v, 6)).rstrip("0").rstrip(".") if "e" not in repr(v) else repr(v)
    if isinstance(v, str):
        return _quote(v, in_flow)
    if isinstance(v, dict) and not v:
        return "{}"
    if isinstance(v, list):
        return "[" + ", ".join(_inline(x, True) for x in v) + "]"
    raise YamlError("cannot inline %r" % (v,))


def _key(k):
    k = str(k)
    return k if _PLAIN_KEY.match(k) and k not in _RESERVED else json.dumps(k, ensure_ascii=False)


def _dump(o, ind, out):
    pad = " " * ind
    if isinstance(o, dict):
        for k, v in o.items():
            ks = _key(k)
            if isinstance(v, dict) and v:
                out.append("%s%s:" % (pad, ks))
                _dump(v, ind + 2, out)
            elif isinstance(v, list) and v and not _short_list(v):
                out.append("%s%s:" % (pad, ks))
                _dump(v, ind + 2, out)
            else:
                out.append("%s%s: %s" % (pad, ks, _inline(v)))
    elif isinstance(o, list):
        for item in o:
            if isinstance(item, dict) and item:
                sub = []
                _dump(item, ind + 2, sub)
                sub[0] = pad + "- " + sub[0][ind + 2:]
                out.extend(sub)
            elif isinstance(item, list) and item:
                out.append(pad + "-")
                _dump(item, ind + 2, out)
            else:
                out.append("%s- %s" % (pad, _inline(item)))
    else:
        out.append(pad + _inline(o))


def yaml_dump(obj):
    out = []
    _dump(obj, 0, out)
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
# Colour
# ---------------------------------------------------------------------------

NAMED_COLORS = {
    "black": "#000000", "white": "#ffffff", "transparent": "#00000000", "red": "#ff0000",
    "green": "#008000", "blue": "#0000ff", "gray": "#808080", "grey": "#808080",
    "silver": "#c0c0c0", "navy": "#000080", "orange": "#ffa500", "yellow": "#ffff00",
}

_HEX = re.compile(r"^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_FUNC = re.compile(r"^(rgba?|hsla?|oklch|oklab)\(\s*([^)]*)\)$", re.I)


def _num(tok, scale=1.0, pct_scale=None):
    tok = tok.strip()
    if tok.endswith("%"):
        return float(tok[:-1]) / 100.0 * (pct_scale if pct_scale is not None else scale)
    if tok == "none":
        return 0.0
    return float(tok)


def parse_color(value):
    """Return (r, g, b, a) floats in 0..1, or None when unsupported/invalid."""
    if not isinstance(value, str):
        return None
    s = value.strip()
    if s.lower() in NAMED_COLORS:
        s = NAMED_COLORS[s.lower()]
    if _HEX.match(s):
        h = s[1:]
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        vals = [int(h[i:i + 2], 16) / 255.0 for i in range(0, len(h), 2)]
        if len(vals) == 3:
            vals.append(1.0)
        return tuple(vals)
    m = _FUNC.match(s)
    if not m:
        return None
    fn = m.group(1).lower()
    body = m.group(2).replace("/", " / ")
    parts = [p for p in re.split(r"[\s,]+", body) if p]
    alpha = 1.0
    if "/" in parts:
        idx = parts.index("/")
        alpha = _num(parts[idx + 1], 1.0, 1.0)
        parts = parts[:idx]
    elif len(parts) == 4:
        alpha = _num(parts[3], 1.0, 1.0)
        parts = parts[:3]
    if len(parts) != 3:
        return None
    try:
        if fn in ("rgb", "rgba"):
            r, g, b = (_num(p, 1.0, 255.0) / 255.0 for p in parts)
        elif fn in ("hsl", "hsla"):
            h = float(parts[0].replace("deg", "")) % 360
            sat = _num(parts[1], 1.0, 1.0)
            light = _num(parts[2], 1.0, 1.0)
            r, g, b = _hsl_to_rgb(h, sat, light)
        elif fn == "oklch":
            L = _num(parts[0], 1.0, 1.0)
            C = _num(parts[1], 1.0, 0.4)
            H = float(parts[2].replace("deg", ""))
            r, g, b = oklab_to_srgb(L, C * math.cos(math.radians(H)), C * math.sin(math.radians(H)))
            r, g, b = (min(1.0, max(0.0, x)) for x in (r, g, b))
        else:
            L = _num(parts[0], 1.0, 1.0)
            a = _num(parts[1], 1.0, 0.4)
            bb = _num(parts[2], 1.0, 0.4)
            r, g, b = (min(1.0, max(0.0, x)) for x in oklab_to_srgb(L, a, bb))
    except ValueError:
        return None
    return (min(1.0, max(0.0, r)), min(1.0, max(0.0, g)), min(1.0, max(0.0, b)), min(1.0, max(0.0, alpha)))


def _hsl_to_rgb(h, s, l):
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60.0) % 2 - 1))
    m = l - c / 2
    seg = int(h // 60) % 6
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][seg]
    return r + m, g + m, b + m


def to_hex(rgba):
    r, g, b = (int(round(min(1.0, max(0.0, c)) * 255)) for c in rgba[:3])
    a = rgba[3] if len(rgba) > 3 else 1.0
    if a < 0.999:
        return "#%02x%02x%02x%02x" % (r, g, b, int(round(a * 255)))
    return "#%02x%02x%02x" % (r, g, b)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _delin(c):
    if c <= 0.0031308:
        return 12.92 * c
    return 1.055 * (c ** (1 / 2.4)) - 0.055


def luminance(rgba):
    r, g, b = (_lin(c) for c in rgba[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def composite(fg, bg):
    a = fg[3] if len(fg) > 3 else 1.0
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)


def contrast_ratio(fg, bg, page=(1.0, 1.0, 1.0, 1.0)):
    """WCAG 2.x contrast ratio. Translucent colours are flattened first."""
    if len(bg) > 3 and bg[3] < 1:
        bg = composite(bg, page)
    if len(fg) > 3 and fg[3] < 1:
        fg = composite(fg, bg)
    l1, l2 = luminance(fg), luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def floor2(x):
    """Floor to 2 decimals so a displayed 4.50 never hides a failing 4.497."""
    return math.floor(x * 100 + 1e-9) / 100.0


def srgb_to_oklab(rgba):
    r, g, b = (_lin(c) for c in rgba[:3])
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(x) ** (1 / 3.0), x) for x in (l, m, s))
    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def oklab_to_srgb(L, a, b):
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return tuple(_delin(x) if x >= 0 else -_delin(-x) for x in (r, g, bb))


def to_oklch(rgba):
    L, a, b = srgb_to_oklab(rgba)
    C = math.hypot(a, b)
    H = math.degrees(math.atan2(b, a)) % 360
    return L, C, H


def _in_gamut(rgb):
    return all(-1e-4 <= x <= 1 + 1e-4 for x in rgb)


def from_oklch(L, C, H):
    """OKLCH -> in-gamut sRGB. Keeps L and H, reduces chroma until the colour fits."""
    L = min(1.0, max(0.0, L))
    ca, sa = math.cos(math.radians(H)), math.sin(math.radians(H))

    def at(c):
        return oklab_to_srgb(L, c * ca, c * sa)

    rgb = at(C)
    if not _in_gamut(rgb):
        lo, hi = 0.0, C  # chroma 0 (a grey) is always inside the gamut
        for _ in range(32):
            mid = (lo + hi) / 2
            if _in_gamut(at(mid)):
                lo = mid
            else:
                hi = mid
        rgb = at(lo)
    return tuple(min(1.0, max(0.0, x)) for x in rgb) + (1.0,)


def delta_e_ok(c1, c2):
    """Euclidean distance in OKLab, scaled x100 (about 2 = just noticeable)."""
    a = srgb_to_oklab(c1)
    b = srgb_to_oklab(c2)
    return 100.0 * math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))


def suggest_fix(fg, bg, target):
    """Nearest colour to fg (same hue, chroma clipped to gamut) that reaches target on bg.

    Returns (rgba, ratio) or None. Only lightness moves, so the hue stays recognisable.
    """
    if contrast_ratio(fg, bg) >= target:
        return fg, contrast_ratio(fg, bg)
    L0, C, H = to_oklch(fg)
    best = None
    for end in (0.0, 1.0):
        if contrast_ratio(from_oklch(end, C, H), bg) < target:
            continue
        lo, hi = 0.0, 1.0  # fraction of the way from L0 to end
        for _ in range(40):
            mid = (lo + hi) / 2
            cand = from_oklch(L0 + (end - L0) * mid, C, H)
            if contrast_ratio(cand, bg) >= target:
                hi = mid
            else:
                lo = mid
        cand = from_oklch(L0 + (end - L0) * hi, C, H)
        # hex rounding can drop the ratio a hair below target; nudge until it passes
        hexed = parse_color(to_hex(cand))
        steps = 0
        while contrast_ratio(hexed, bg) < target and steps < 50:
            hi = min(1.0, hi + 0.002)
            cand = from_oklch(L0 + (end - L0) * hi, C, H)
            hexed = parse_color(to_hex(cand))
            steps += 1
        dist = abs(end - L0) * hi
        if contrast_ratio(hexed, bg) >= target and (best is None or dist < best[0]):
            best = (dist, hexed)
    if best is None:
        return None
    return best[1], contrast_ratio(best[1], bg)


def grade(ratio):
    if ratio >= 7:
        return "AAA"
    if ratio >= 4.5:
        return "AA"
    if ratio >= 3:
        return "AA large"
    return "fail"


# ---------------------------------------------------------------------------
# DESIGN.md
# ---------------------------------------------------------------------------

SCHEMA_KEYS = ("version", "name", "description", "omitted", "colors", "typography", "rounded", "spacing", "components")
CANONICAL_SECTIONS = (
    "Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts",
)
SECTION_ALIASES = {
    "brand & style": "Overview",
    "layout & spacing": "Layout",
    "elevation": "Elevation & Depth",
    "do's and don'ts": "Do's and Don'ts",
    "dos and donts": "Do's and Don'ts",
    "do and don't": "Do's and Don'ts",
}
# Our profile adds these after Components; consumers that do not know them keep them as-is.
KIT_SECTIONS = (
    "Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components",
    "Logo", "Iconography", "Imagery", "Voice & Tone", "Do's and Don'ts", "Agent Notes",
)
REQUIRED_SECTIONS = {
    "full": ("Overview", "Colors", "Typography", "Layout", "Elevation & Depth", "Shapes", "Components",
             "Logo", "Iconography", "Voice & Tone", "Do's and Don'ts"),
    "lite": ("Overview", "Colors", "Typography", "Voice & Tone"),
}
COMPONENT_PROPS = ("backgroundColor", "textColor", "typography", "rounded", "padding", "size", "height", "width")
OPEN_FONT_LICENSES = ("OFL-1.1", "Apache-2.0", "MIT", "UFL-1.0", "CC0-1.0")
DIMENSION = re.compile(r"^(-?(?:\d+\.?\d*|\.\d+))(px|em|rem)$")
REF = re.compile(r"^\{([A-Za-z0-9_.-]+)\}$")


def canonical_section(title):
    t = title.strip()
    low = t.lower().replace("’", "'")
    if low in SECTION_ALIASES:
        return SECTION_ALIASES[low]
    for name in KIT_SECTIONS:
        if name.lower() == low:
            return name
    if low in ("voice and tone", "voice", "tone of voice"):
        return "Voice & Tone"
    if low in ("logo usage", "logo & mark", "logos"):
        return "Logo"
    if low in ("icons", "icon style"):
        return "Iconography"
    if low in ("photography", "imagery & illustration", "illustration"):
        return "Imagery"
    return t


class Design:
    def __init__(self, text, path=None):
        self.path = path
        self.text = text
        self.errors = []  # (rule, message)
        self.frontmatter = {}
        self.fm_text = None
        self.body = text
        self.body_line = 1
        self.blocks = []  # interleaved yaml blocks: (start_line, end_line, data)
        self.tokens = {}
        self.sections = []  # (title, canonical, line, content)
        self._parse()

    @property
    def base_dir(self):
        return os.path.dirname(os.path.abspath(self.path)) if self.path else os.getcwd()

    def _parse(self):
        text = self.text.lstrip("﻿")
        lines = text.replace("\r\n", "\n").split("\n")
        if lines and lines[0].strip() == "---":
            end = None
            for i in range(1, len(lines)):
                if lines[i].strip() in ("---", "..."):
                    end = i
                    break
            if end is None:
                self.errors.append(("frontmatter", "front matter starts with '---' but never closes"))
                return
            self.fm_text = "\n".join(lines[1:end])
            self.body = "\n".join(lines[end + 1:])
            self.body_line = end + 2
            try:
                fm = yaml_load(self.fm_text, line_offset=1)
                if not isinstance(fm, dict):
                    raise YamlError("front matter must be a mapping")
                self.frontmatter = fm
            except YamlError as exc:
                self.errors.append(("yaml", "front matter: %s" % exc))
        merged = dict(self.frontmatter)
        # interleaved ```yaml blocks and ## sections (both skip other fenced code)
        body_lines = self.body.split("\n")
        in_fence = None
        fence_start = 0
        buf = []
        current = None
        for idx, ln in enumerate(body_lines):
            lineno = idx + self.body_line
            stripped = ln.strip()
            if in_fence is None and stripped.startswith("```"):
                lang = stripped[3:].strip().lower()
                in_fence = "yaml" if lang in ("yaml", "yml") else "other"
                fence_start = lineno
                buf = []
                if current is not None:
                    current[3].append(ln)
                continue
            if in_fence is not None:
                if stripped.startswith("```"):
                    if in_fence == "yaml":
                        try:
                            data = yaml_load("\n".join(buf), line_offset=fence_start)
                        except YamlError as exc:
                            self.errors.append(("yaml", "yaml block at line %d: %s" % (fence_start, exc)))
                            data = None
                        if isinstance(data, dict):
                            self.blocks.append((fence_start, lineno, data))
                            for k, v in data.items():
                                if k in merged:
                                    self.errors.append(("duplicate-key", "top-level key '%s' is defined more than once" % k))
                                else:
                                    merged[k] = v
                    in_fence = None
                else:
                    buf.append(ln)
                if current is not None:
                    current[3].append(ln)
                continue
            if ln.startswith("## "):
                title = ln[3:].strip()
                current = [title, canonical_section(title), lineno, []]
                self.sections.append(current)
                continue
            if current is not None:
                current[3].append(ln)
        self.sections = [(t, c, l, "\n".join(body)) for t, c, l, body in self.sections]
        self.tokens = merged

    # -- helpers -----------------------------------------------------------
    def brand(self):
        b = self.tokens.get("brand")
        return b if isinstance(b, dict) else {}

    def profile(self):
        p = str(self.brand().get("profile", "full")).lower()
        return p if p in REQUIRED_SECTIONS else "full"

    def section(self, name):
        for title, canon, line, content in self.sections:
            if canon == name:
                return content
        return None

    def resolve(self, value, depth=0):
        """Resolve a {path.to.token} reference; returns the raw value (or raises KeyError)."""
        if not isinstance(value, str):
            return value
        m = REF.match(value.strip())
        if not m:
            return value
        if depth > 10:
            raise KeyError("reference loop at %s" % value)
        node = self.tokens
        for part in m.group(1).split("."):
            if not isinstance(node, dict) or part not in node:
                raise KeyError(value)
            node = node[part]
        return self.resolve(node, depth + 1)

    def colors(self):
        out = {}
        for k, v in (self.tokens.get("colors") or {}).items():
            try:
                c = parse_color(self.resolve(v))
            except KeyError:
                c = None
            if c is not None:
                out[k] = c
        return out

    def color(self, name_or_ref):
        if name_or_ref is None:
            return None
        s = str(name_or_ref)
        try:
            v = self.resolve(s) if REF.match(s) else None
        except KeyError:
            return None
        if v is not None:
            return parse_color(v)
        cols = self.colors()
        if s in cols:
            return cols[s]
        return parse_color(s)


def load_design(path):
    with open(path, "r", encoding="utf-8") as fh:
        return Design(fh.read(), path)


def split_frontmatter(text):
    """Return (frontmatter_text or None, body)."""
    lines = text.lstrip("﻿").replace("\r\n", "\n").split("\n")
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() in ("---", "..."):
                return "\n".join(lines[1:i]), "\n".join(lines[i + 1:])
    return None, text


def remove_yaml_blocks(body, keys):
    """Drop interleaved ```yaml blocks that only define the given top-level keys."""
    out, buf, in_yaml, other = [], [], False, False
    for ln in body.split("\n"):
        s = ln.strip()
        if not in_yaml and not other and s.startswith("```"):
            if s[3:].strip().lower() in ("yaml", "yml"):
                in_yaml, buf = True, [ln]
                continue
            other = True
            out.append(ln)
            continue
        if other:
            out.append(ln)
            if s.startswith("```"):
                other = False
            continue
        if in_yaml:
            buf.append(ln)
            if s.startswith("```"):
                in_yaml = False
                try:
                    data = yaml_load("\n".join(buf[1:-1]))
                except YamlError:
                    data = None
                if not (isinstance(data, dict) and data and all(k in keys for k in data)):
                    out.extend(buf)
            continue
        out.append(ln)
    return "\n".join(out)


def write_design(path, frontmatter, body):
    text = "---\n" + yaml_dump(frontmatter) + "---\n" + body.lstrip("\n")
    if not text.endswith("\n"):
        text += "\n"
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
    return text


# ---------------------------------------------------------------------------
# Token conversion
# ---------------------------------------------------------------------------

EXT = "ai.popnow.brandkit"
DTCG_SCHEMA = "https://www.designtokens.org/schemas/2025.10/format.json"
TYPO_DEFAULTS = {"fontWeight": 400, "lineHeight": 1.2, "letterSpacing": {"value": 0, "unit": "px"}}


def parse_dimension(v):
    """'16px' -> (16.0, 'px'); numbers -> (n, None); else None."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v), None
    if isinstance(v, str):
        m = DIMENSION.match(v.strip())
        if m:
            return float(m.group(1)), m.group(2)
    return None


def _num_out(x):
    x = round(float(x), 4)
    return int(x) if x == int(x) else x


def _font_px(size):
    """Font size in px (rem/em assume a 16px root), or None."""
    d = parse_dimension(size) if size is not None else None
    if not d:
        return None
    return d[0] * (16.0 if d[1] in ("rem", "em") else 1.0)


def _lh_ratio(lh, px):
    """Line height as a multiplier of the font size, or None when it cannot be worked out."""
    d = parse_dimension(lh)
    if not d:
        return None
    value, unit = d
    if unit is None or unit == "em":
        return value
    if not px:
        return None
    return value * (16.0 if unit == "rem" else 1.0) / px


def fmt_dim(value, unit):
    return "%s%s" % (_num_out(value), unit)


def dtcg_color(rgba):
    comps = [round(c, 4) for c in rgba[:3]]
    out = {"colorSpace": "srgb", "components": comps, "hex": to_hex(rgba[:3] + (1.0,))}
    if len(rgba) > 3 and rgba[3] < 0.999:
        out["alpha"] = round(rgba[3], 4)
    return out


def color_from_dtcg(value):
    if isinstance(value, str):
        return parse_color(value)
    if isinstance(value, dict):
        alpha = value.get("alpha", 1.0)
        if value.get("hex"):
            c = parse_color(value["hex"])
            if c:
                return c[:3] + (alpha,)
        comps = value.get("components")
        if value.get("colorSpace", "srgb") == "srgb" and isinstance(comps, list) and len(comps) == 3:
            return tuple(float(x) for x in comps) + (alpha,)
    return None


def color_to_string(rgba):
    if len(rgba) > 3 and rgba[3] < 0.999:
        r, g, b = (int(round(c * 255)) for c in rgba[:3])
        return "rgba(%d, %d, %d, %s)" % (r, g, b, _num_out(rgba[3]))
    return to_hex(rgba).upper()


_SHADOW_SPLIT = re.compile(r",(?![^(]*\))")


def parse_shadow(css):
    """CSS box-shadow -> list of DTCG shadow objects (None if unparseable)."""
    out = []
    for part in _SHADOW_SPLIT.split(css):
        part = part.strip()
        if not part:
            continue
        inset = False
        if part.startswith("inset "):
            inset, part = True, part[6:].strip()
        m = re.search(r"(rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|#[0-9a-fA-F]{3,8})", part)
        if not m:
            return None
        color = parse_color(m.group(1))
        nums = (part[:m.start()] + " " + part[m.end():]).split()
        dims = []
        for n in nums:
            d = (0.0, "px") if n in ("0", "0.0") else parse_dimension(n)
            if d is None:
                return None
            dims.append({"value": _num_out(d[0]), "unit": d[1] or "px"})
        if len(dims) < 2 or color is None:
            return None
        while len(dims) < 4:
            dims.append({"value": 0, "unit": "px"})
        item = {"color": dtcg_color(color), "offsetX": dims[0], "offsetY": dims[1], "blur": dims[2], "spread": dims[3]}
        if inset:
            item["inset"] = True
        out.append(item)
    return out or None


def shadow_to_css(value):
    items = value if isinstance(value, list) else [value]
    parts = []
    for it in items:
        c = color_from_dtcg(it.get("color"))
        dims = []
        for k in ("offsetX", "offsetY", "blur", "spread"):
            d = it.get(k, {"value": 0, "unit": "px"})
            dims.append(fmt_dim(d.get("value", 0), d.get("unit", "px")) if isinstance(d, dict) else str(d))
        s = " ".join(dims) + " " + (color_to_string(c) if c else "transparent")
        if it.get("inset"):
            s = "inset " + s
        parts.append(s)
    return ", ".join(parts)


def font_fallback(design_tokens, family):
    for f in (design_tokens.get("brand") or {}).get("fonts") or []:
        if isinstance(f, dict) and f.get("family") == family:
            return f.get("fallback") or ""
    return ""


def font_stack_list(family, fallback):
    stack = [family]
    for part in re.split(r",", fallback or ""):
        p = part.strip().strip("'\"")
        if p and p != family:
            stack.append(p)
    return stack


GENERIC_FAMILIES = ("serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-monospace", "ui-serif", "ui-sans-serif", "ui-rounded")


def css_font_stack(family, fallback):
    """The brand family is always quoted; fallbacks only when they need it (vendor keywords must stay bare)."""
    out = []
    for i, name in enumerate(font_stack_list(family, fallback)):
        if name in GENERIC_FAMILIES or (i > 0 and re.fullmatch(r"-?[A-Za-z][A-Za-z0-9-]*", name)):
            out.append(name)
        else:
            out.append('"%s"' % name.replace('"', ""))
    return ", ".join(out)


def design_to_dtcg(tokens):
    """DESIGN.md token tree -> DTCG 2025.10 document (dict).

    Group names follow the reference DESIGN.md exporter: color, typography, rounded, spacing.
    """
    doc = {"$schema": DTCG_SCHEMA}
    if tokens.get("description"):
        doc["$description"] = tokens["description"]
    root_ext = {}
    for k in ("name", "version", "description", "omitted", "components", "brand"):
        if k in tokens:
            root_ext[k] = tokens[k]
    extra = {k: v for k, v in tokens.items() if k not in SCHEMA_KEYS and k != "brand"}
    if extra:
        root_ext["extra"] = extra

    colors = tokens.get("colors") or {}
    if colors:
        grp = {"$type": "color"}
        for name, raw in colors.items():
            c = parse_color(raw) if isinstance(raw, str) and not REF.match(raw) else None
            if isinstance(raw, str) and REF.match(raw):
                grp[name] = {"$value": raw.replace("{colors.", "{color.")}
                continue
            if c is None:
                continue
            tok = {"$value": dtcg_color(c)}
            if str(raw).strip() != color_to_string(c):
                tok["$extensions"] = {EXT: {"source": raw}}
            grp[name] = tok
        doc["color"] = grp

    typo = tokens.get("typography") or {}
    if typo:
        grp = {"$type": "typography"}
        for name, t in typo.items():
            if not isinstance(t, dict):
                continue
            fam = t.get("fontFamily")
            size = parse_dimension(t.get("fontSize"))
            val = {}
            src = {}
            if fam is not None:
                val["fontFamily"] = font_stack_list(fam, font_fallback(tokens, fam)) if not REF.match(str(fam)) else fam
            if size:
                if size[1] in ("px", "rem"):
                    val["fontSize"] = {"value": _num_out(size[0]), "unit": size[1]}
                else:
                    val["fontSize"] = {"value": _num_out(size[0]), "unit": "rem"}
                    src["fontSize"] = t.get("fontSize")
            px = _font_px(t.get("fontSize"))
            if "fontWeight" in t:
                try:
                    val["fontWeight"] = int(t["fontWeight"])
                except (TypeError, ValueError):
                    val["fontWeight"] = t["fontWeight"]
            if "lineHeight" in t:
                ratio = _lh_ratio(t["lineHeight"], px)
                if ratio is not None:
                    val["lineHeight"] = _num_out(ratio)
                    if parse_dimension(t["lineHeight"])[1] is not None:
                        src["lineHeight"] = t["lineHeight"]
            if "letterSpacing" in t:
                ls = parse_dimension(t["letterSpacing"])
                if ls and ls[1] == "em" and px:
                    val["letterSpacing"] = {"value": _num_out(ls[0] * px), "unit": "px"}
                    src["letterSpacing"] = t["letterSpacing"]
                elif ls and ls[1] in ("px", "rem"):
                    val["letterSpacing"] = {"value": _num_out(ls[0]), "unit": ls[1]}
                elif ls and ls[1] is None:
                    val["letterSpacing"] = {"value": _num_out(ls[0]), "unit": "px"}
            for k in ("fontFeature", "fontVariation"):
                if k in t:
                    src[k] = t[k]
            # DTCG typography needs all five properties; fill gaps and remember which were filled
            defaulted = [k for k in TYPO_DEFAULTS if k not in val]
            for k in defaulted:
                val[k] = json.loads(json.dumps(TYPO_DEFAULTS[k]))
            if defaulted:
                src["defaulted"] = defaulted
            tok = {"$value": val}
            if src:
                tok["$extensions"] = {EXT: src}
            grp[name] = tok
        doc["typography"] = grp

    for group in ("rounded", "spacing"):
        vals = tokens.get(group) or {}
        if not vals:
            continue
        grp = {"$type": "dimension"}
        for name, raw in vals.items():
            d = parse_dimension(raw)
            if d is None:
                grp[name] = {"$type": "string", "$value": str(raw)} if raw is not None else None
                if grp[name] is None:
                    del grp[name]
                continue
            if d[1] is None:
                grp[name] = {"$type": "number", "$value": _num_out(d[0])}
            elif d[1] == "em":
                grp[name] = {"$value": {"value": _num_out(d[0]), "unit": "rem"}, "$extensions": {EXT: {"source": raw}}}
            else:
                grp[name] = {"$value": {"value": _num_out(d[0]), "unit": d[1]}}
        doc[group] = grp

    brand = tokens.get("brand") or {}
    shadows = brand.get("shadows") or {}
    if shadows:
        grp = {"$type": "shadow"}
        for name, css in shadows.items():
            parsed = parse_shadow(str(css)) if css not in (None, "none") else None
            if parsed:
                grp[name] = {"$value": parsed[0] if len(parsed) == 1 else parsed}
        if len(grp) > 1:
            doc["shadow"] = grp
    motion = brand.get("motion") or {}
    if motion:
        dur = {"$type": "duration"}
        ease = {"$type": "cubicBezier"}
        for k, v in motion.items():
            if k.lower().endswith("ms") and isinstance(v, (int, float)) and not isinstance(v, bool):
                dur[re.sub(r"(?i)ms$", "", k)] = {"$value": {"value": _num_out(v), "unit": "ms"}}
            elif isinstance(v, str) and v.strip().startswith("cubic-bezier("):
                nums = [float(x) for x in re.findall(r"-?\d*\.?\d+", v)]
                if len(nums) == 4:
                    ease[k] = {"$value": [_num_out(x) for x in nums]}
        if len(dur) > 1:
            doc["duration"] = dur
        if len(ease) > 1:
            doc["easing"] = ease
    fonts = brand.get("fonts") or []
    fgrp = {"$type": "fontFamily"}
    for f in fonts:
        if isinstance(f, dict) and f.get("family"):
            role = str(f.get("role") or slug(f["family"]))
            fgrp[role] = {"$value": font_stack_list(f["family"], f.get("fallback")), "$description": "License: %s" % f.get("license", "unknown")}
    if len(fgrp) > 1:
        doc["fontFamily"] = fgrp
    if root_ext:
        doc["$extensions"] = {EXT: root_ext}
    return doc


def _dim_from_dtcg(v):
    if isinstance(v, dict) and "value" in v:
        return fmt_dim(v["value"], v.get("unit", "px"))
    if isinstance(v, (int, float)):
        return fmt_dim(v, "px")
    return v


def dtcg_to_design(doc):
    """DTCG document -> DESIGN.md token tree. Values in groups win over the stored originals."""
    ext = ((doc.get("$extensions") or {}).get(EXT)) or {}
    tokens = {}
    tokens["version"] = ext.get("version", "alpha")
    if ext.get("name"):
        tokens["name"] = ext["name"]
    desc = doc.get("$description") or ext.get("description")
    if desc:
        tokens["description"] = desc
    if ext.get("omitted"):
        tokens["omitted"] = ext["omitted"]

    colors = {}
    for name, tok in (doc.get("color") or doc.get("colors") or {}).items():
        if name.startswith("$") or not isinstance(tok, dict):
            continue
        val = tok.get("$value")
        if isinstance(val, str) and REF.match(val):
            colors[name] = val.replace("{color.", "{colors.")
            continue
        c = color_from_dtcg(val)
        if c is None:
            continue
        src = ((tok.get("$extensions") or {}).get(EXT) or {}).get("source")
        if src and parse_color(src) and to_hex(parse_color(src)) == to_hex(c):
            colors[name] = src
        else:
            colors[name] = color_to_string(c)
    if colors:
        tokens["colors"] = colors

    typo = {}
    for name, tok in (doc.get("typography") or {}).items():
        if name.startswith("$") or not isinstance(tok, dict):
            continue
        v = dict(tok.get("$value") or {})
        src = ((tok.get("$extensions") or {}).get(EXT)) or {}
        for k in src.get("defaulted") or []:
            if v.get(k) == TYPO_DEFAULTS.get(k):
                v.pop(k, None)
        t = {}
        fam = v.get("fontFamily")
        if isinstance(fam, list) and fam:
            t["fontFamily"] = fam[0]
        elif fam is not None:
            t["fontFamily"] = fam
        if "fontSize" in v:
            size = _dim_from_dtcg(v["fontSize"])
            t["fontSize"] = src.get("fontSize") if src.get("fontSize") and parse_dimension(src["fontSize"]) and parse_dimension(src["fontSize"])[0] == parse_dimension(size)[0] else size
        if "fontWeight" in v:
            t["fontWeight"] = v["fontWeight"]
        px = _font_px(t.get("fontSize"))
        if "lineHeight" in v:
            lh = v["lineHeight"]
            orig = src.get("lineHeight")
            if isinstance(lh, (int, float)):
                back = _lh_ratio(orig, px) if orig is not None else None
                t["lineHeight"] = orig if back is not None and abs(back - lh) < 0.005 else _num_out(lh)
            else:
                t["lineHeight"] = _dim_from_dtcg(lh)
        if "letterSpacing" in v:
            ls = v["letterSpacing"]
            orig = src.get("letterSpacing")
            o = parse_dimension(orig) if orig else None
            if o and o[1] == "em" and px and isinstance(ls, dict) and abs(o[0] * px - float(ls.get("value", 0))) < 0.02:
                t["letterSpacing"] = orig
            else:
                t["letterSpacing"] = _dim_from_dtcg(ls)
        for k in ("fontFeature", "fontVariation"):
            if k in src:
                t[k] = src[k]
        typo[name] = t
    if typo:
        tokens["typography"] = typo

    for group in ("rounded", "spacing"):
        vals = {}
        for name, tok in (doc.get(group) or {}).items():
            if name.startswith("$") or not isinstance(tok, dict):
                continue
            v = tok.get("$value")
            src = ((tok.get("$extensions") or {}).get(EXT) or {}).get("source")
            if tok.get("$type") == "number" and isinstance(v, (int, float)):
                vals[name] = _num_out(v)
            elif isinstance(v, dict):
                s = _dim_from_dtcg(v)
                vals[name] = src if src and parse_dimension(src) and parse_dimension(src)[0] == float(v.get("value", 0)) else s
            elif v is not None:
                vals[name] = v
        if vals:
            tokens[group] = vals

    if ext.get("components"):
        tokens["components"] = ext["components"]
    brand = json.loads(json.dumps(ext.get("brand") or {}))
    if doc.get("shadow"):
        shadows = dict(brand.get("shadows") or {})
        for name, tok in doc["shadow"].items():
            if name.startswith("$") or not isinstance(tok, dict):
                continue
            css = shadow_to_css(tok.get("$value"))
            old = shadows.get(name)
            if old is not None:
                old_parsed = parse_shadow(str(old))
                if old_parsed and shadow_to_css(old_parsed if len(old_parsed) > 1 else old_parsed[0]) == css:
                    continue
            shadows[name] = css
        if shadows:
            brand["shadows"] = shadows
    if doc.get("duration") or doc.get("easing"):
        motion = dict(brand.get("motion") or {})
        for name, tok in (doc.get("duration") or {}).items():
            if name.startswith("$") or not isinstance(tok, dict):
                continue
            v = tok.get("$value") or {}
            ms = float(v.get("value", 0)) * (1000.0 if v.get("unit") == "s" else 1.0)
            motion[name + "Ms"] = _num_out(ms)
        for name, tok in (doc.get("easing") or {}).items():
            if name.startswith("$") or not isinstance(tok, dict):
                continue
            v = tok.get("$value")
            if isinstance(v, list) and len(v) == 4:
                motion[name] = "cubic-bezier(%s)" % ", ".join(str(_num_out(x)) for x in v)
        brand["motion"] = motion
    if doc.get("fontFamily"):
        fonts = list(brand.get("fonts") or [])
        by_role = {str(f.get("role") or slug(f.get("family", ""))): f for f in fonts if isinstance(f, dict)}
        for role, tok in doc["fontFamily"].items():
            if role.startswith("$") or not isinstance(tok, dict):
                continue
            v = tok.get("$value")
            stack = v if isinstance(v, list) else [v]
            if not stack or not stack[0]:
                continue
            fb = ", ".join(x if x in ("serif", "sans-serif", "monospace", "cursive", "system-ui") or " " not in x else "'%s'" % x for x in stack[1:])
            if role in by_role:
                by_role[role]["family"] = stack[0]
                if fb:
                    by_role[role]["fallback"] = fb
            else:
                fonts.append({"family": stack[0], "role": role, "fallback": fb, "license": "unknown"})
        brand["fonts"] = fonts
    if brand:
        tokens["brand"] = brand
    for k, v in (ext.get("extra") or {}).items():
        tokens.setdefault(k, v)
    return tokens


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def _css_val(design_tokens, v):
    """Turn a token value (maybe a {reference}) into a CSS value."""
    if isinstance(v, str):
        m = REF.match(v.strip())
        if m:
            path = m.group(1).split(".")
            prefix = {"colors": "color", "rounded": "radius", "spacing": "spacing"}.get(path[0])
            if prefix and len(path) == 2:
                return "var(--%s-%s)" % (prefix, path[1])
            return v
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(_num_out(v))
    return str(v)


def font_var_name(tokens, family):
    for f in (tokens.get("brand") or {}).get("fonts") or []:
        if isinstance(f, dict) and f.get("family") == family and f.get("role"):
            return "--font-" + slug(f["role"])
    return "--font-" + slug(family)


def design_to_css(tokens, tailwind=False):
    """DESIGN.md tokens -> CSS custom properties (Tailwind v4 compatible names)."""
    lines = []
    colors = tokens.get("colors") or {}
    light = {k: v for k, v in colors.items()}
    dark = {k[5:]: v for k, v in colors.items() if k.startswith("dark-")}

    lines.append("  /* colours */")
    for k, v in light.items():
        lines.append("  --color-%s: %s;" % (k, _css_val(tokens, v)))
    fonts_done = set()
    brand = tokens.get("brand") or {}
    font_lines = []
    for f in brand.get("fonts") or []:
        if isinstance(f, dict) and f.get("family"):
            name = font_var_name(tokens, f["family"])
            if name not in fonts_done:
                fonts_done.add(name)
                font_lines.append("  %s: %s;" % (name, css_font_stack(f["family"], f.get("fallback"))))
    typo = tokens.get("typography") or {}
    for t in typo.values():
        fam = t.get("fontFamily") if isinstance(t, dict) else None
        if fam:
            name = font_var_name(tokens, fam)
            if name not in fonts_done:
                fonts_done.add(name)
                font_lines.append("  %s: %s;" % (name, css_font_stack(fam, "")))
    if font_lines:
        lines.append("  /* font families */")
        lines.extend(font_lines)
    if typo:
        lines.append("  /* type scale */")
        for name, t in typo.items():
            if not isinstance(t, dict):
                continue
            if t.get("fontSize") is not None:
                lines.append("  --text-%s: %s;" % (name, _css_val(tokens, t["fontSize"])))
            if t.get("lineHeight") is not None:
                lines.append("  --text-%s--line-height: %s;" % (name, _css_val(tokens, t["lineHeight"])))
            if t.get("letterSpacing") is not None:
                lines.append("  --text-%s--letter-spacing: %s;" % (name, _css_val(tokens, t["letterSpacing"])))
            if t.get("fontWeight") is not None:
                lines.append("  --text-%s--font-weight: %s;" % (name, _css_val(tokens, t["fontWeight"])))
    for group, prefix in (("rounded", "radius"), ("spacing", "spacing")):
        vals = tokens.get(group) or {}
        if vals:
            lines.append("  /* %s */" % group)
            for k, v in vals.items():
                lines.append("  --%s-%s: %s;" % (prefix, k, _css_val(tokens, v)))
    shadows = brand.get("shadows") or {}
    if shadows:
        lines.append("  /* elevation */")
        for k, v in shadows.items():
            lines.append("  --shadow-%s: %s;" % (k, v))
    motion = brand.get("motion") or {}
    if motion:
        lines.append("  /* motion */")
        for k, v in motion.items():
            if k.lower().endswith("ms") and isinstance(v, (int, float)):
                lines.append("  --duration-%s: %sms;" % (slug(re.sub(r"(?i)ms$", "", k)), _num_out(v)))
            elif isinstance(v, str):
                lines.append("  --ease-%s: %s;" % (slug(k), v))

    head = "/* Generated from DESIGN.md by scripts/tokens.py. Edit DESIGN.md, then re-export. */\n"
    sel = "@theme" if tailwind else ":root"
    css = head + sel + " {\n" + "\n".join(lines) + "\n}\n"
    if dark:
        over = "\n".join("  --color-%s: var(--color-dark-%s);" % (k, k) for k in dark)
        css += "\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {\n" + "\n".join("  " + x for x in over.split("\n")) + "\n  }\n}\n"
        css += ":root[data-theme=\"dark\"] {\n" + over + "\n}\n"
    if typo:
        css += "\n"
        for name, t in typo.items():
            if not isinstance(t, dict):
                continue
            decl = []
            if t.get("fontFamily"):
                decl.append("font-family: var(%s)" % font_var_name(tokens, t["fontFamily"]))
            if t.get("fontSize") is not None:
                decl.append("font-size: var(--text-%s)" % name)
            if t.get("fontWeight") is not None:
                decl.append("font-weight: var(--text-%s--font-weight)" % name)
            if t.get("lineHeight") is not None:
                decl.append("line-height: var(--text-%s--line-height)" % name)
            if t.get("letterSpacing") is not None:
                decl.append("letter-spacing: var(--text-%s--letter-spacing)" % name)
            if t.get("fontFeature"):
                decl.append("font-feature-settings: %s" % t["fontFeature"])
            if t.get("fontVariation"):
                decl.append("font-variation-settings: %s" % t["fontVariation"])
            css += ".type-%s { %s; }\n" % (name, "; ".join(decl))
    return css


_CSS_VAR = re.compile(r"--([A-Za-z0-9_-]+)\s*:\s*([^;]+);")


def css_to_design(css_text):
    """Read custom properties from a stylesheet into a partial DESIGN.md token tree."""
    tokens = {"colors": {}, "typography": {}, "rounded": {}, "spacing": {}}
    brand = {"shadows": {}, "fonts": [], "motion": {}}
    css_text = re.sub(r"/\*.*?\*/", "", css_text, flags=re.S)
    # walk blocks; a block whose selector mentions "dark" feeds dark-* colours
    depth_selectors = []
    blocks = []
    for m in re.finditer(r"([^{}]*)\{|\}", css_text):
        if m.group(0) == "}":
            if depth_selectors:
                sel, start = depth_selectors.pop()
                blocks.append((" ".join(s for s, _ in depth_selectors) + " " + sel, css_text[start:m.start()]))
        else:
            depth_selectors.append((m.group(1).strip(), m.end()))
    seen_vars = {}
    for sel, content in blocks:
        is_dark = "dark" in sel.lower()
        inner = re.sub(r"\{[^{}]*\}", "", content)
        for name, value in _CSS_VAR.findall(inner):
            value = value.strip()
            key = (is_dark, name)
            if key in seen_vars:
                continue
            seen_vars[key] = value
    for (is_dark, name), value in seen_vars.items():
        if name.startswith("color-"):
            n = name[6:]
            if n.startswith("dark-"):
                tokens["colors"][n] = value
            elif value.startswith("var(--color-dark-"):
                continue
            elif is_dark:
                tokens["colors"]["dark-" + n] = value
            elif parse_color(value):
                tokens["colors"][n] = value
        elif is_dark:
            continue
        elif name.startswith("radius-"):
            tokens["rounded"][name[7:]] = value
        elif name.startswith("spacing-"):
            d = parse_dimension(value)
            tokens["spacing"][name[8:]] = _num_out(d[0]) if d and d[1] is None else value
        elif name.startswith("shadow-"):
            brand["shadows"][name[7:]] = value
        elif name.startswith("duration-"):
            m2 = re.match(r"^(\d*\.?\d+)(ms|s)$", value)
            if m2:
                ms = float(m2.group(1)) * (1000 if m2.group(2) == "s" else 1)
                brand["motion"][re.sub(r"-([a-z])", lambda x: x.group(1).upper(), name[9:]) + "Ms"] = _num_out(ms)
        elif name.startswith("ease-"):
            brand["motion"][name[5:]] = value
        elif name.startswith("font-") and not name.startswith("font-weight"):
            stack = [p.strip().strip("'\"") for p in value.split(",")]
            if stack and stack[0] and not stack[0].startswith("var("):
                brand["fonts"].append({"family": stack[0], "role": name[5:], "fallback": ", ".join(stack[1:]), "license": "unknown"})
        elif name.startswith("text-"):
            rest = name[5:]
            if "--" in rest:
                tname, prop = rest.split("--", 1)
            else:
                tname, prop = rest, "size"
            t = tokens["typography"].setdefault(tname, {})
            if prop == "size":
                t["fontSize"] = value
            elif prop == "line-height":
                d = parse_dimension(value)
                t["lineHeight"] = _num_out(d[0]) if d and d[1] is None else value
            elif prop == "letter-spacing":
                t["letterSpacing"] = value
            elif prop == "font-weight":
                try:
                    t["fontWeight"] = int(value)
                except ValueError:
                    t["fontWeight"] = value
    # attach families to type styles when a class says so: .type-x { font-family: var(--font-role) }
    for cls, body in re.findall(r"\.type-([A-Za-z0-9_-]+)\s*\{([^}]*)\}", css_text):
        m3 = re.search(r"font-family:\s*var\(--font-([A-Za-z0-9_-]+)\)", body)
        if m3 and cls in tokens["typography"]:
            for f in brand["fonts"]:
                if f["role"] == m3.group(1):
                    tokens["typography"][cls]["fontFamily"] = f["family"]
    out = {k: v for k, v in tokens.items() if v}
    brand = {k: v for k, v in brand.items() if v}
    if brand:
        out["brand"] = brand
    return out


def deep_merge(base, extra):
    out = dict(base)
    for k, v in extra.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def order_tokens(tokens):
    """Stable key order: schema keys first (spec order), then brand, then anything else."""
    order = list(SCHEMA_KEYS) + ["brand"]
    out = {}
    for k in order:
        if k in tokens:
            out[k] = tokens[k]
    for k, v in tokens.items():
        if k not in out:
            out[k] = v
    return out
