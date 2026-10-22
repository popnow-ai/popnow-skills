#!/usr/bin/env python3
"""Narrated explainer toolkit.

Plans a narration script, joins voiceover takes, times every word (from a transcript or by
estimation against the audio), builds captions, resolves storyboard beats into a timing file for
the composition, writes a music ducking envelope, renders a storyboard contact sheet and runs QA.

Python 3.8+ standard library only. Nothing here touches the network or spends credits; paid
generation goes through scripts/popnow.py, which prices every request first.

    python3 scripts/explainer.py <command> --help
"""

import argparse
import array
import difflib
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import wave

VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# Languages: speaking rate for planning, caption line length and reading speed.
# Rates are starting points for calm narration; calibrate with --measured after the first take.
# ---------------------------------------------------------------------------

LANGS = {
    "en": {"unit": "words", "rate": 150, "line": 42, "cps": 17, "weak": "a an the of to in on at for and or but with from by as that this is are your my our its"},
    "de": {"unit": "words", "rate": 130, "line": 42, "cps": 17, "weak": "der die das den dem des ein eine einen und oder zu von mit im am an auf ist"},
    "fr": {"unit": "words", "rate": 155, "line": 42, "cps": 17, "weak": "le la les un une des de du et ou a au aux en sur pour par est"},
    "es": {"unit": "words", "rate": 160, "line": 42, "cps": 17, "weak": "el la los las un una unos unas y o de del al a en con por para es"},
    "it": {"unit": "words", "rate": 150, "line": 42, "cps": 17, "weak": "il lo la i gli le un una e o di del della a da in con per su"},
    "pt-BR": {"unit": "words", "rate": 155, "line": 42, "cps": 17, "weak": "o a os as um uma e ou de do da dos das em no na com por para"},
    "pl": {"unit": "words", "rate": 130, "line": 42, "cps": 17, "weak": "i w z na do o a od po za ze we"},
    "ru": {"unit": "words", "rate": 130, "line": 42, "cps": 17, "weak": "и в на с к о а но по за из от у"},
    "ko": {"unit": "words", "rate": 270, "line": 18, "cps": 12, "weak": "", "syllables": True},
    "ja": {"unit": "chars", "rate": 300, "line": 16, "cps": 8, "weak": ""},
    "zh-CN": {"unit": "chars", "rate": 230, "line": 16, "cps": 9, "weak": ""},
    "zh-TW": {"unit": "chars", "rate": 230, "line": 16, "cps": 9, "weak": ""},
}
LANG_ALIASES = {"pt": "pt-BR", "pt-br": "pt-BR", "zh": "zh-CN", "zh-cn": "zh-CN", "zh-hans": "zh-CN",
                "zh-tw": "zh-TW", "zh-hant": "zh-TW", "jp": "ja", "kr": "ko"}

# Language codes PopNow speech-to-text (xai/grok-stt/speech-to-text) accepts. Chinese is not one
# of them: time Chinese voiceovers with `estimate --audio`, or a local multilingual transcriber.
STT_LANGS = {"en", "de", "fr", "es", "it", "pt-BR", "pl", "ru", "ja", "ko"}

DEFAULT_GAP = 0.6         # silence between chapter takes when joining
DEFAULT_OFFSET = 0.6      # where the voiceover starts in the film
DEFAULT_TAIL = 3.5        # end card hold after the last word
SENTENCE_PAUSE = 0.32     # nominal pause after a sentence, seconds
CLAUSE_PAUSE = 0.14       # nominal pause after a comma or colon

CJK_CHAR = re.compile(r"[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
HANGUL = re.compile(r"[\uac00-\ud7a3]")
SENT_END = re.compile(r"[.!?\u3002\uff01\uff1f\u2026]+[\"'\u201d\u2019)\]\u300d\u300f\uff09]*$")
CLAUSE_END = re.compile(r"[,;:\u2014\u2013\u3001\uff0c\uff1b\uff1a]+[\"'\u201d\u2019)\]\u300d\u300f\uff09]*$")
CJK_PUNCT = set("\u3002\uff01\uff1f\u3001\uff0c\uff1b\uff1a\u300c\u300d\u300e\u300f\uff08\uff09\u2026\u00b7\u30fb")
VOWELS = re.compile(r"[aeiouy\u00e0-\u00e6\u00e8-\u00ef\u00f2-\u00f6\u00f8-\u00fc\u0105\u0119\u00f3\u0430\u0435\u0451\u0438\u043e\u0443\u044b\u044d\u044e\u044f]+")


class ToolError(Exception):
    pass


def lang_info(code):
    key = LANG_ALIASES.get((code or "en").lower(), code or "en")
    if key not in LANGS:
        raise ToolError("Unknown language %r. Use one of: %s" % (code, ", ".join(LANGS)))
    return key, LANGS[key]


def read_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path, obj):
    folder = os.path.dirname(os.path.abspath(path))
    os.makedirs(folder, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def write_text(path, text):
    folder = os.path.dirname(os.path.abspath(path))
    os.makedirs(folder, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def r3(x):
    return round(float(x) + 0.0, 3)


def fmt_clock(t, comma=False):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return "%02d:%02d:%02d%s%03d" % (h, m, s, "," if comma else ".", ms)


def slug(text, fallback):
    s = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:32] or fallback


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------


def norm(token):
    """Matching form of a token: NFKC, lower case, letters and digits only."""
    t = unicodedata.normalize("NFKC", token).lower().replace("\u2019", "'")
    return "".join(ch for ch in t if ch.isalnum())


def split_say(text):
    """Spoken pieces of one written token, for matching against a transcript."""
    out = []
    for piece in re.split(r"[\s/\-\u2010-\u2015]+|(?<=[A-Za-z])\.(?=[A-Za-z])", text):
        n = norm(piece)
        if n:
            out.append(n)
    return out


def is_cjk_char(ch):
    return bool(CJK_CHAR.match(ch))


def char_tokens(text):
    """Split text for character languages: one token per CJK character, Latin runs kept whole.
    Returns (token, space_before) pairs; punctuation sticks to the token before it."""
    out = []
    buf = ""
    space = False
    pending_space = False
    for ch in text:
        if ch.isspace():
            if buf:
                out.append([buf, space])
                buf = ""
            pending_space = True
            continue
        if is_cjk_char(ch):
            if buf:
                out.append([buf, space])
                buf = ""
            out.append([ch, pending_space])
            pending_space = False
            continue
        if ch in CJK_PUNCT or (not ch.isalnum() and not buf and out and not pending_space):
            if buf:
                buf += ch
            elif out:
                out[-1][0] += ch
            else:
                buf = ch
                space = pending_space
            pending_space = False
            continue
        if not buf:
            space = pending_space
            pending_space = False
        buf += ch
    if buf:
        out.append([buf, space])
    return [(t, s) for t, s in out]


def syllables(token):
    """Rough spoken length of a token, used to spread time across words."""
    t = norm(token)
    if not t:
        return 0.0
    if all(is_cjk_char(c) for c in t):
        return float(len(t))
    hangul = len(HANGUL.findall(t))
    if hangul:
        return float(hangul)
    if t.isdigit():
        n = len(t)
        base = {1: 1.0, 2: 2.0, 3: 3.5, 4: 4.0}.get(n, 1.3 * n)
        return base + (2.0 if "%" in token else 0.0)
    groups = len(VOWELS.findall(t))
    if t.endswith("e") and groups > 1 and not t.endswith("le"):
        groups -= 1
    extra = 2.0 if "%" in token else 0.0
    return float(max(1, groups)) + extra


def boundary(show):
    s = show.rstrip()
    if SENT_END.search(s):
        return "sentence"
    if CLAUSE_END.search(s):
        return "clause"
    return ""


def tokenize_narration(text, lang):
    """Turn narration (with markup) into word entries and TTS text.

    Markup: [[shown|spoken]] pronunciation, [pause 0.8] extra pause, [cue] delivery cue that is
    passed to the voice model but never shown. Returns (words, tts_text).
    """
    key, info = lang_info(lang)
    char_lang = info["unit"] == "chars"
    words = []
    tts = []
    pos = 0
    pattern = re.compile(r"\[\[([^\]|]+)\|([^\]]+)\]\]|\[pause(?:\s+([0-9.]+))?\]|\[([^\[\]]+)\]")
    for m in list(pattern.finditer(text)) + [None]:
        chunk = text[pos:m.start()] if m else text[pos:]
        if chunk:
            tts.append(chunk)
            pieces = char_tokens(chunk) if char_lang else [(w, True) for w in chunk.split()]
            lead_space = bool(chunk[:1].isspace())
            for idx, (tok, sp) in enumerate(pieces):
                say = split_say(tok)
                if not say:
                    if words:
                        words[-1]["show"] += tok
                        words[-1]["brk"] = boundary(words[-1]["show"])
                    continue
                space = sp if char_lang else (idx > 0 or lead_space or not words)
                words.append({"show": tok, "say": say, "brk": boundary(tok), "pause": 0.0, "sp": bool(space)})
        if m is None:
            break
        pos = m.end()
        if m.group(1):
            shown, spoken = m.group(1).strip(), m.group(2).strip()
            tts.append(spoken)
            space = bool(text[m.start() - 1:m.start()].isspace()) if m.start() else False
            words.append({"show": shown, "say": split_say(spoken) or [norm(shown)], "brk": boundary(shown),
                          "pause": 0.0, "sp": space or not char_lang})
        elif m.group(0).startswith("[pause"):
            extra = float(m.group(3)) if m.group(3) else 0.5
            if words:
                words[-1]["pause"] += extra
            tts.append(" \u2026 ")
        else:
            tts.append("[%s]" % m.group(4).strip())
    tts_text = re.sub(r"\s+", " ", "".join(tts)).strip()
    if words:
        words[0]["sp"] = False
    for w in words:
        w["w"] = round(sum(syllables(s) for s in w["say"]) + (2.0 if "%" in w["show"] else 0.0), 2) or 1.0
    return words, tts_text


def join_show(words, lang):
    out = ""
    for w in words:
        out += (" " if (out and w.get("sp", True)) else "") + w.get("show", w.get("text", ""))
    return out


def spoken_units(words, lang):
    key, info = lang_info(lang)
    if info["unit"] == "chars":
        return sum(len([c for c in w["show"] if is_cjk_char(c)]) or w["w"] for w in words)
    if info.get("syllables"):
        return sum(w["w"] for w in words)
    return sum(len(w["say"]) for w in words)


# ---------------------------------------------------------------------------
# Script parsing and planning
# ---------------------------------------------------------------------------


def parse_script(path):
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    meta = {}
    chapters = []
    current = None
    for line in raw.splitlines():
        stripped = line.strip()
        h1 = re.match(r"^#\s+(.+)$", stripped)
        h2 = re.match(r"^##\s+(.+?)\s*(?:\{#([A-Za-z0-9_-]+)\})?\s*$", stripped)
        if h2:
            title = re.sub(r"^\d+[.)]\s*", "", h2.group(1)).strip()
            current = {"id": h2.group(2) or "", "title": title, "lines": [], "notes": []}
            chapters.append(current)
            continue
        if h1 and current is None:
            meta.setdefault("title", h1.group(1).strip())
            continue
        if current is None:
            kv = re.match(r"^([A-Za-z_-]+)\s*:\s*(.+)$", stripped)
            if kv:
                meta[kv.group(1).lower()] = kv.group(2).strip()
            continue
        if stripped.startswith(">"):
            current["notes"].append(stripped.lstrip("> ").strip())
        elif stripped:
            current["lines"].append(stripped)
    if not chapters:
        raise ToolError("No chapters found. Start each chapter with a '## Title {#id}' heading.")
    for i, ch in enumerate(chapters):
        if not ch["id"]:
            ch["id"] = slug(ch["title"], "ch%d" % (i + 1))
    ids = [c["id"] for c in chapters]
    if len(set(ids)) != len(ids):
        raise ToolError("Chapter ids must be unique: %s" % ", ".join(ids))
    return meta, chapters


def plan_script(path, lang=None, rate=None, target=None):
    meta, chapters = parse_script(path)
    key, info = lang_info(lang or meta.get("lang", "en"))
    per_min = float(rate or meta.get("rate") or info["rate"])
    out = {"version": 1, "title": meta.get("title", ""), "lang": key, "voice": meta.get("voice", ""),
           "delivery": meta.get("delivery", ""), "style": meta.get("style", ""),
           "target": float(target or meta.get("target") or 0) or None,
           "rate": {"unit": info["unit"] if not info.get("syllables") else "syllables", "perMinute": per_min},
           "chapters": []}
    for ch in chapters:
        text = " ".join(ch["lines"])
        words, tts_text = tokenize_narration(text, key)
        if not words:
            raise ToolError("Chapter %r has no narration." % ch["id"])
        units = spoken_units(words, key)
        pauses = sum(w["pause"] for w in words)
        out["chapters"].append({
            "id": ch["id"], "title": ch["title"], "notes": ch["notes"],
            "show": join_show(words, key), "say": tts_text, "units": units,
            "seconds": round(units / per_min * 60.0 + pauses, 2), "words": words,
        })
    out["units"] = sum(c["units"] for c in out["chapters"])
    speech = sum(c["seconds"] for c in out["chapters"])
    gaps = DEFAULT_GAP * (len(out["chapters"]) - 1)
    out["estimate"] = {"speech": round(speech, 2), "gaps": round(gaps, 2), "head": DEFAULT_OFFSET,
                       "tail": DEFAULT_TAIL, "total": round(speech + gaps + DEFAULT_OFFSET + DEFAULT_TAIL, 1)}
    return out


def plan_checks(plan, lite=False):
    """Return (level, message) findings for a planned script."""
    findings = []
    lo, hi = (50.0, 70.0) if lite else (45.0, 120.0)
    total = plan["estimate"]["total"]
    if not lo <= total <= hi:
        findings.append(("FAIL", "Estimated length %.1f s is outside %d-%d s; cut or add narration." % (total, lo, hi)))
    if plan.get("target"):
        dev = (total - plan["target"]) / plan["target"]
        if abs(dev) > 0.10:
            findings.append(("WARN", "Estimated %.1f s vs target %.0f s (%+.0f%%)." % (total, plan["target"], dev * 100)))
    char_lang = LANGS[plan["lang"]]["unit"] == "chars"
    for i, ch in enumerate(plan["chapters"]):
        if ch["seconds"] > 30:
            findings.append(("WARN", "Chapter %s runs %.1f s; split it so each chapter makes one point." % (ch["id"], ch["seconds"])))
        if i == 0 and ch["seconds"] > 12:
            findings.append(("WARN", "The opening chapter runs %.1f s; land the hook within 12 s." % ch["seconds"]))
        sentence = []
        for w in ch["words"]:
            sentence.append(w)
            if w["brk"] == "sentence" or w is ch["words"][-1]:
                n = sum(len(x["show"]) for x in sentence) if char_lang else len(sentence)
                limit = 50 if char_lang else 25
                if n > limit:
                    findings.append(("WARN", "Long sentence in %s (%d %s): \"%s...\" Split it for the ear." % (
                        ch["id"], n, "chars" if char_lang else "words", join_show(sentence[:8], plan["lang"]))))
                sentence = []
        for w in ch["words"]:
            if re.search(r"\d", w["show"]):
                findings.append(("INFO", "Number in %s: %s - needs a claim in sources.json." % (ch["id"], w["show"])))
    return findings


def cmd_plan(args):
    plan = plan_script(args.script, args.lang, args.rate, args.target)
    if args.measured:
        takes = read_json(args.measured)
        by_id = {t["chapter"]: t for t in takes.get("takes", [])}
        for ch in plan["chapters"]:
            t = by_id.get(ch["id"])
            if t and t.get("speech"):
                ch["measured"] = t["speech"]
                ch["measuredRate"] = round(ch["units"] / t["speech"] * 60.0, 1)
    write_json(args.out, plan)
    unit = plan["rate"]["unit"]
    print("Script: %s  (%s, %.0f %s/min)" % (plan["title"] or args.script, plan["lang"], plan["rate"]["perMinute"], unit))
    print("%-18s %7s %8s %9s" % ("chapter", unit, "seconds", "measured"))
    for ch in plan["chapters"]:
        meas = "%.1f s" % ch["measured"] if ch.get("measured") else "-"
        print("%-18s %7.0f %8.1f %9s" % (ch["id"][:18], ch["units"], ch["seconds"], meas))
    e = plan["estimate"]
    print("speech %.1f s + gaps %.1f s + head %.1f s + end card %.1f s = %.1f s" % (e["speech"], e["gaps"], e["head"], e["tail"], e["total"]))
    rates = [c["measuredRate"] for c in plan["chapters"] if c.get("measuredRate")]
    if rates:
        print("Measured rate: %.0f %s/min (re-plan with --rate %.0f)" % (sum(rates) / len(rates), unit, sum(rates) / len(rates)))
    if args.tts_dir:
        for ch in plan["chapters"]:
            write_text(os.path.join(args.tts_dir, "%s.txt" % ch["id"]), ch["say"] + "\n")
        voice = plan.get("voice") or "Charon"
        print("\nTTS text written to %s/. Quote each chapter (free), then create only after the user agrees:" % args.tts_dir)
        for ch in plan["chapters"]:
            extra = ' --set "instructions=%s"' % plan["delivery"].replace('"', "'") if plan.get("delivery") else ""
            print('  python3 scripts/popnow.py quote --model google/gemini-3.8-flash-tts/text-to-speech --voice %s --text "$(cat %s/%s.txt)"%s'
                  % (voice, args.tts_dir, ch["id"], extra))
    findings = plan_checks(plan, args.lite)
    for level, msg in findings:
        print("%-5s %s" % (level, msg))
    print("Wrote %s" % args.out)
    return 1 if any(l == "FAIL" for l, _ in findings) else 0


# ---------------------------------------------------------------------------
# WAV handling (16-bit PCM): duration, silence detection, joining takes
# ---------------------------------------------------------------------------


def read_wav(path):
    with wave.open(path, "rb") as w:
        ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        data = w.readframes(n)
    if width != 2:
        raise ToolError("%s is %d-bit; convert it: ffmpeg -i %s -ac 1 -c:a pcm_s16le out.wav" % (path, width * 8, path))
    samples = array.array("h")
    samples.frombytes(data)
    if sys.byteorder == "big":
        samples.byteswap()
    if ch > 1:
        mono = array.array("h", [int(sum(samples[i:i + ch]) / ch) for i in range(0, len(samples), ch)])
        samples = mono
    return {"rate": rate, "samples": samples, "duration": len(samples) / float(rate)}


def frame_db(audio, hop=0.01):
    rate, s = audio["rate"], audio["samples"]
    size = max(1, int(rate * hop))
    out = []
    for i in range(0, len(s), size):
        win = s[i:i + size]
        if not win:
            break
        energy = sum(x * x for x in win) / float(len(win))
        out.append(-120.0 if energy <= 0 else 10.0 * math.log10(energy / (32768.0 * 32768.0)))
    return out, hop


def detect_silences(audio, threshold_db=-40.0, min_len=0.15):
    """Silent stretches as (start, end) seconds. The threshold adapts to a noisy floor."""
    dbs, hop = frame_db(audio)
    if not dbs:
        return []
    ordered = sorted(dbs)
    floor = ordered[int(len(ordered) * 0.05)]
    thr = max(threshold_db, min(floor + 10.0, -28.0))
    out = []
    start = None
    for i, d in enumerate(dbs + [0.0]):
        if d < thr and i < len(dbs):
            if start is None:
                start = i
        elif start is not None:
            if (i - start) * hop >= min_len:
                out.append((round(start * hop, 3), round(i * hop, 3)))
            start = None
    return out


def speech_bounds(silences, t0, t1):
    """First and last moment of sound inside [t0, t1] given silences."""
    a, b = t0, t1
    for s, e in silences:
        if s <= a + 0.02 and e > a:
            a = min(e, t1)
        if e >= b - 0.02 and s < b:
            b = max(s, a)
    return a, b


def write_wav(path, rate, samples):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    out = array.array("h", samples)
    if sys.byteorder == "big":
        out.byteswap()
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(out.tobytes())


def find_take(folder, chapter_id):
    for name in sorted(os.listdir(folder)):
        base, ext = os.path.splitext(name)
        if ext.lower() == ".wav" and (base == chapter_id or base.startswith(chapter_id + "-") or base.startswith(chapter_id + "_")):
            return os.path.join(folder, name)
    return None


def cmd_vo_join(args):
    plan = read_json(args.script)
    rate = None
    joined = array.array("h")
    takes = []
    for ch in plan["chapters"]:
        path = find_take(args.dir, ch["id"])
        if not path:
            raise ToolError("No take for chapter %r in %s (expected %s.wav). Convert or rename the downloaded file:\n"
                            "  ffmpeg -i <download> -ac 1 -c:a pcm_s16le %s/%s.wav" % (ch["id"], args.dir, ch["id"], args.dir, ch["id"]))
        audio = read_wav(path)
        if rate is None:
            rate = audio["rate"]
        elif audio["rate"] != rate:
            raise ToolError("%s is %d Hz but earlier takes are %d Hz; resample with ffmpeg -ar %d." % (path, audio["rate"], rate, rate))
        s = audio["samples"]
        sil = detect_silences(audio)
        a, b = speech_bounds(sil, 0.0, audio["duration"])
        if args.trim:
            keep = 0.05
            i0 = max(0, int((a - keep) * rate))
            i1 = min(len(s), int((b + keep) * rate))
            s = s[i0:i1]
            a, b = (a - i0 / float(rate)), (b - i0 / float(rate))
        if takes:
            joined.extend(array.array("h", [0]) * int(args.gap * rate))
        offset = len(joined) / float(rate)
        joined.extend(s)
        takes.append({"chapter": ch["id"], "file": os.path.relpath(path, os.path.dirname(os.path.abspath(args.out))),
                      "offset": r3(offset), "duration": r3(len(s) / float(rate)),
                      "speechStart": r3(offset + max(0.0, a)), "speechEnd": r3(offset + max(a, b)),
                      "speech": r3(max(0.0, b - a))})
    write_wav(args.out, rate, joined)
    meta = {"version": 1, "audio": os.path.basename(args.out), "sampleRate": rate, "gap": args.gap,
            "duration": r3(len(joined) / float(rate)), "takes": takes}
    takes_path = args.takes or os.path.join(os.path.dirname(os.path.abspath(args.out)), "takes.json")
    write_json(takes_path, meta)
    for t in takes:
        print("%-18s at %7.2f s  speech %6.2f s" % (t["chapter"][:18], t["offset"], t["speech"]))
    print("Joined %d takes into %s (%.2f s); offsets in %s" % (len(takes), args.out, meta["duration"], takes_path))
    return 0


# ---------------------------------------------------------------------------
# Timing: estimate against audio (or rate), or align a transcript
# ---------------------------------------------------------------------------


def nominal_pause(w):
    return {"sentence": SENTENCE_PAUSE, "clause": CLAUSE_PAUSE}.get(w["brk"], 0.0) + w.get("pause", 0.0)


def spread(words, t0, t1, out, pause_after_last=False):
    """Place words between t0 and t1 by spoken weight, leaving nominal pauses at punctuation."""
    if not words:
        return
    span = max(0.0, t1 - t0)
    pauses = [nominal_pause(w) for w in words]
    if not pause_after_last:
        pauses[-1] = 0.0
    total_pause = sum(pauses)
    if total_pause > 0.4 * span:
        scale = (0.4 * span) / total_pause
        pauses = [p * scale for p in pauses]
        total_pause = 0.4 * span
    speak = max(0.0, span - total_pause)
    weight = sum(w["w"] for w in words) or 1.0
    t = t0
    for w, p in zip(words, pauses):
        d = speak * w["w"] / weight
        out.append((t, t + d))
        t += d + p


def match_pauses(pred, sils, tol):
    """Monotonic best matching of predicted pauses [(time, strength)] to silences [(s, e)]."""
    n, m = len(pred), len(sils)
    if not n or not m:
        return {}
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    move = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            best, mv = score[i - 1][j], 1
            if score[i][j - 1] > best:
                best, mv = score[i][j - 1], 2
            t, strength = pred[i - 1]
            s, e = sils[j - 1]
            dev = abs(t - (s + e) / 2.0)
            if dev < 2.5 * tol:
                gain = strength + min(0.6, e - s) - dev / tol
                if gain > 0 and score[i - 1][j - 1] + gain > best:
                    best, mv = score[i - 1][j - 1] + gain, 3
            score[i][j], move[i][j] = best, mv
    pairs = {}
    i, j = n, m
    while i > 0 and j > 0:
        mv = move[i][j]
        if mv == 3:
            pairs[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif mv == 1:
            i -= 1
        else:
            j -= 1
    return pairs


def time_chapter(words, a, b, silences):
    """Word times for one chapter whose speech runs from a to b, snapping pauses to silences."""
    nominal = []
    spread(words, a, b, nominal)
    inner = [(s, e) for s, e in silences if s > a + 0.05 and e < b - 0.05]
    pred = []
    for idx, w in enumerate(words[:-1]):
        strength = {"sentence": 1.0, "clause": 0.5}.get(w["brk"], 0.0) + (1.0 if w.get("pause") else 0.0)
        pred.append((nominal[idx][1], strength, idx))
    strong = [(t, s) for t, s, _ in pred if s > 0]
    strong_idx = [i for _, s, i in pred if s > 0]
    tol = max(0.6, 0.08 * (b - a))
    pairs = match_pauses(strong, inner, tol)
    anchors = {strong_idx[k]: inner[v] for k, v in pairs.items()}
    used = set(pairs.values())
    # A long silence the script did not mark is still a pause: hang it on the nearest word boundary.
    for j, (s, e) in enumerate(inner):
        if j in used or e - s < 0.3:
            continue
        mid = (s + e) / 2.0
        best = None
        for idx in range(len(words) - 1):
            if idx in anchors:
                continue
            lower = max([k for k in anchors if k < idx] or [-1])
            upper = min([k for k in anchors if k > idx] or [len(words)])
            lo_t = anchors[lower][1] if lower >= 0 else a
            hi_t = anchors[upper][0] if upper < len(words) else b
            if not lo_t <= mid <= hi_t:
                continue
            d = abs(nominal[idx][1] - mid)
            if best is None or d < best[0]:
                best = (d, idx)
        if best is not None and best[0] < 2.5 * tol:
            anchors[best[1]] = (s, e)
    times = []
    start_idx, t0 = 0, a
    for idx in sorted(anchors):
        s, e = anchors[idx]
        seg = []
        spread(words[start_idx:idx + 1], t0, s, seg)
        times.extend(seg)
        start_idx, t0 = idx + 1, e
    seg = []
    spread(words[start_idx:], t0, b, seg)
    times.extend(seg)
    return times, len(anchors)


def timing_doc(plan, source, offset, word_times, extra=None):
    words = []
    chapters = []
    i = 0
    for ch in plan["chapters"]:
        first = i
        for w in ch["words"]:
            s, e = word_times[i]
            words.append({"i": i, "c": ch["id"], "text": w["show"], "start": r3(s + offset), "end": r3(e + offset),
                          "brk": w["brk"], "sp": w.get("sp", True), "w": w["w"]})
            i += 1
        chapters.append({"id": ch["id"], "title": ch["title"], "start": words[first]["start"], "end": words[i - 1]["end"]})
    doc = {"version": 1, "source": source, "lang": plan["lang"], "voOffset": r3(offset), "chapters": chapters,
           "words": words, "end": words[-1]["end"] if words else r3(offset)}
    if extra:
        doc.update(extra)
    return doc


def cmd_estimate(args):
    plan = read_json(args.script)
    gap = args.gap
    word_times = []
    extra = {}
    if args.audio:
        audio = read_wav(args.audio)
        sil = detect_silences(audio)
        extra["audio"] = os.path.basename(args.audio)
        extra["audioDuration"] = r3(audio["duration"])
        windows = []
        if args.takes:
            takes = {t["chapter"]: t for t in read_json(args.takes)["takes"]}
            for ch in plan["chapters"]:
                t = takes.get(ch["id"])
                if not t:
                    raise ToolError("takes.json has no entry for chapter %r" % ch["id"])
                windows.append(speech_bounds(sil, t["offset"], t["offset"] + t["duration"]))
        else:
            a, b = speech_bounds(sil, 0.0, audio["duration"])
            weights = [c["seconds"] for c in plan["chapters"]]
            # Chapter boundaries go to the longest silences in roughly the right places.
            bounds = [a]
            acc = a
            total = sum(weights) or 1.0
            free = [x for x in sil if a < x[0] and x[1] < b]
            for w in weights[:-1]:
                acc += (b - a) * w / total
                cands = sorted(free, key=lambda x: (abs((x[0] + x[1]) / 2 - acc) - 2.0 * (x[1] - x[0])))
                pick = cands[0] if cands else (acc, acc)
                free = [x for x in free if x[0] > pick[1]]
                bounds.extend([pick[0], pick[1]])
                acc = pick[1]
            bounds.append(b)
            windows = [(bounds[k], bounds[k + 1]) for k in range(0, len(bounds), 2)]
        anchored = 0
        for ch, (a, b) in zip(plan["chapters"], windows):
            times, n = time_chapter(ch["words"], a, b, sil)
            word_times.extend(times)
            anchored += n
        extra["anchoredPauses"] = anchored
        source = "estimate-audio"
    else:
        t = 0.0
        per_min = plan["rate"]["perMinute"]
        for k, ch in enumerate(plan["chapters"]):
            dur = ch.get("measured") or ch["units"] / per_min * 60.0 + sum(w["pause"] for w in ch["words"])
            seg = []
            spread(ch["words"], t, t + dur, seg)
            word_times.extend(seg)
            t += dur + (gap if k < len(plan["chapters"]) - 1 else 0.0)
        extra["audioDuration"] = r3(t)
        source = "estimate-rate"
    doc = timing_doc(plan, source, args.offset, word_times, extra)
    write_json(args.out, doc)
    print("Timed %d words (%s); speech ends at %.2f s in film time. Wrote %s" % (len(doc["words"]), source, doc["end"], args.out))
    if source == "estimate-rate":
        print("Note: rate-based timing is for planning and silent drafts. Re-run with --audio once the voiceover exists.")
    return 0


def find_word_list(obj):
    """Find word timestamps in PopNow task JSON, transcribe output, Whisper JSON or a plain list."""
    def is_words(v):
        return isinstance(v, list) and v and isinstance(v[0], dict) and ("start" in v[0] or "start_ms" in v[0] or "startMs" in v[0]) \
            and ("text" in v[0] or "word" in v[0])
    preferred = [("output", "transcript", "words"), ("transcript", "words"), ("words",), ("result", "words")]
    for path in preferred:
        cur = obj
        for k in path:
            cur = cur.get(k) if isinstance(cur, dict) else None
        if is_words(cur):
            return cur, False
    if is_words(obj):
        return obj, False
    for path in [("output", "transcript", "channels"), ("transcript", "channels"), ("channels",)]:
        cur = obj
        for k in path:
            cur = cur.get(k) if isinstance(cur, dict) else None
        if isinstance(cur, list) and cur and is_words(cur[0].get("words")):
            return cur[0]["words"], False
    segs = obj.get("segments") if isinstance(obj, dict) else None
    if isinstance(segs, list) and segs:
        words = []
        for s in segs:
            if is_words(s.get("words")):
                words.extend(s["words"])
        if words:
            return words, False
        rough = []
        for s in segs:
            parts = str(s.get("text", "")).split()
            if not parts:
                continue
            d = (float(s["end"]) - float(s["start"])) / len(parts)
            for k, p in enumerate(parts):
                rough.append({"text": p, "start": float(s["start"]) + k * d, "end": float(s["start"]) + (k + 1) * d})
        if rough:
            return rough, True
    raise ToolError("No word timestamps found. Pass the JSON from `python3 scripts/popnow.py status <taskId> --json`, "
                    "from `npx hyperframes transcribe --json`, or Whisper-style JSON with segments.")


def stt_tokens(raw_words, lang):
    key, info = lang_info(lang)
    char_lang = info["unit"] == "chars"
    toks = []
    ms = any("start_ms" in w or "startMs" in w for w in raw_words)
    mx = max(float(w.get("end", w.get("end_ms", w.get("endMs", 0))) or 0) for w in raw_words)
    scale = 0.001 if ms or mx > 1000 else 1.0
    for w in raw_words:
        if w.get("type") not in (None, "word"):
            continue
        text = str(w.get("text", w.get("word", "")))
        s = float(w.get("start", w.get("start_ms", w.get("startMs", 0)))) * scale
        e = float(w.get("end", w.get("end_ms", w.get("endMs", s)))) * scale
        pieces = []
        if char_lang:
            for tok, _ in char_tokens(text):
                pieces.extend(split_say(tok))
        else:
            pieces = split_say(text)
        if not pieces:
            continue
        d = max(0.0, e - s) / len(pieces)
        for k, p in enumerate(pieces):
            toks.append((p, s + k * d, s + (k + 1) * d))
    return toks


def cmd_align(args):
    plan = read_json(args.script)
    lang = plan["lang"]
    raw, rough = find_word_list(read_json(args.stt))
    stt = stt_tokens(raw, lang)
    if not stt:
        raise ToolError("The transcript has no words.")
    script_toks = []
    owner = []
    weights = []
    flat_words = [w for ch in plan["chapters"] for w in ch["words"]]
    for wi, w in enumerate(flat_words):
        for s in w["say"]:
            script_toks.append(s)
            owner.append(wi)
            weights.append(max(0.5, syllables(s)))
    a = script_toks
    b = [t[0] for t in stt]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    tok_times = [None] * len(a)
    matched = 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                tok_times[i1 + k] = (stt[j1 + k][1], stt[j1 + k][2])
            matched += i2 - i1
        elif op == "replace":
            t0, t1 = stt[j1][1], stt[j2 - 1][2]
            wsum = sum(weights[i1:i2]) or 1.0
            t = t0
            for k in range(i1, i2):
                d = (t1 - t0) * weights[k] / wsum
                tok_times[k] = (t, t + d)
                t += d
    # Script words the transcript skipped: fit them into the gap between their neighbours.
    k = 0
    while k < len(a):
        if tok_times[k] is not None:
            k += 1
            continue
        end = k
        while end < len(a) and tok_times[end] is None:
            end += 1
        lo = tok_times[k - 1][1] if k > 0 else max(0.0, stt[0][1] - 0.3)
        hi = tok_times[end][0] if end < len(a) else stt[-1][2] + 0.3
        hi = max(hi, lo)
        wsum = sum(weights[k:end]) or 1.0
        t = lo
        for q in range(k, end):
            d = (hi - lo) * weights[q] / wsum
            tok_times[q] = (t, t + d)
            t += d
        k = end
    word_times = []
    for wi in range(len(flat_words)):
        spans = [tok_times[q] for q in range(len(a)) if owner[q] == wi]
        word_times.append((min(s for s, _ in spans), max(e for _, e in spans)))
    for wi in range(1, len(word_times)):
        s, e = word_times[wi]
        ps, pe = word_times[wi - 1]
        if s < ps:
            word_times[wi] = (ps, max(e, ps))
    rate = matched / float(len(a)) if a else 0.0
    extra = {"matchRate": round(rate, 3), "transcriptWords": len(raw)}
    if rough:
        extra["roughSegments"] = True
    if args.audio_duration:
        extra["audioDuration"] = r3(args.audio_duration)
    elif args.takes:
        extra["audioDuration"] = read_json(args.takes).get("duration")
    doc = timing_doc(plan, args.source, args.offset, word_times, extra)
    write_json(args.out, doc)
    print("Aligned %d script words to %d transcript words; match rate %.0f%%. Wrote %s" % (len(flat_words), len(raw), rate * 100, args.out))
    if rough:
        print("WARN  The transcript only had segment times; word times inside segments are spread evenly.")
    if rate < 0.6:
        print("FAIL  Under 60% of the script matched: wrong file, wrong language, or the voice skipped lines. Listen before going on.")
        return 1
    if rate < 0.85:
        print("WARN  Under 85% matched. Check names and numbers the voice read differently; times around them are interpolated.")
    return 0


# ---------------------------------------------------------------------------
# Captions
# ---------------------------------------------------------------------------


def text_len(words):
    return len(join_show(words, "en"))


def split_lines(words, max_chars, weak, char_lang):
    """Two-line split: both lines fit, prefer breaking after punctuation, never after a weak word."""
    full = join_show(words, "")
    if len(full) <= max_chars or len(words) < 2:
        return [full]
    best = None
    for k in range(1, len(words)):
        l1, l2 = join_show(words[:k], ""), join_show(words[k:], "")
        over = max(0, len(l1) - max_chars) + max(0, len(l2) - max_chars)
        cost = over * 100 + abs(len(l1) - len(l2)) * 0.6
        last = words[k - 1]
        if last["brk"]:
            cost -= 14
        if not char_lang and norm(last["text"]) in weak:
            cost += 14
        if len(l1) > len(l2):
            cost += 2
        if best is None or cost < best[0]:
            best = (cost, k)
    k = best[1]
    return [join_show(words[:k], ""), join_show(words[k:], "")]


def fits(words, max_chars, max_lines):
    if len(join_show(words, "")) <= max_chars:
        return True
    if max_lines < 2:
        return False
    for k in range(1, len(words)):
        if len(join_show(words[:k], "")) <= max_chars and len(join_show(words[k:], "")) <= max_chars:
            return True
    return False


def sentence_runs(words, pause_break):
    """Split timed words into runs that a cue must not cross: sentences, chapters, long pauses."""
    runs, cur = [], []
    for w in words:
        if cur and (w["c"] != cur[-1]["c"] or w["start"] - cur[-1]["end"] > pause_break):
            runs.append(cur)
            cur = []
        cur.append(w)
        if w["brk"] == "sentence":
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    return runs


def chunk_run(run, max_chars, max_lines, max_dur, weak, char_lang):
    """Cut one sentence into the fewest, most even cues that fit, preferring clause breaks."""
    n = len(run)
    total = len(join_show(run, ""))
    est = max(1, int(math.ceil(total / (max_chars * max_lines * 0.85))))
    ideal = total / float(est)
    inf = float("inf")
    best = [0.0] + [inf] * n
    back = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(j - 1, -1, -1):
            chunk = run[i:j]
            if j - i > 1 and (not fits(chunk, max_chars, max_lines) or chunk[-1]["end"] - chunk[0]["start"] > max_dur):
                break
            cost = 10.0 + abs(len(join_show(chunk, "")) - ideal) * 0.15
            if j < n:
                last = chunk[-1]
                if last["brk"] == "clause":
                    cost -= 8
                if not char_lang and norm(last["text"]) in weak:
                    cost += 12
                if j - i < 3:
                    cost += 6
            if best[i] + cost < best[j]:
                best[j], back[j] = best[i] + cost, i
    cuts = []
    j = n
    while j > 0:
        cuts.append((back[j], j))
        j = back[j]
    return [run[a:b] for a, b in reversed(cuts)]


def build_cues(timing, max_chars=None, max_lines=2, min_dur=1.0, max_dur=6.0, tail=0.25, gap=0.067, pause_break=0.6):
    key, info = lang_info(timing["lang"])
    max_chars = max_chars or info["line"]
    char_lang = info["unit"] == "chars"
    weak = set(info["weak"].split())
    groups = []
    for run in sentence_runs(timing["words"], pause_break):
        groups.extend(chunk_run(run, max_chars, max_lines, max_dur, weak, char_lang))
    cues = []
    for gi, g in enumerate(groups):
        start = g[0]["start"]
        end = g[-1]["end"] + tail
        nxt = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else None
        if nxt is not None:
            end = min(end, nxt - gap)
        if end - start < min_dur:
            want = start + min_dur
            end = min(want, nxt - gap) if nxt is not None else want
        end = max(end, g[-1]["end"] if nxt is None else min(g[-1]["end"], nxt - gap))
        cues.append({"start": r3(start), "end": r3(end), "lines": split_lines(g, max_chars, weak, char_lang),
                     "words": [w["i"] for w in g]})
    return cues


def vtt_text(cues):
    out = ["WEBVTT", ""]
    for n, c in enumerate(cues, 1):
        out += [str(n), "%s --> %s" % (fmt_clock(c["start"]), fmt_clock(c["end"]))] + c["lines"] + [""]
    return "\n".join(out)


def srt_text(cues):
    out = []
    for n, c in enumerate(cues, 1):
        out += [str(n), "%s --> %s" % (fmt_clock(c["start"], True), fmt_clock(c["end"], True))] + c["lines"] + [""]
    return "\n".join(out)


def parse_clock(s):
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    sec = float(parts[-1])
    mins = int(parts[-2]) if len(parts) > 1 else 0
    hrs = int(parts[-3]) if len(parts) > 2 else 0
    return hrs * 3600 + mins * 60 + sec


def parse_vtt(text):
    cues = []
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n").replace("\r", "\n").strip())
    for block in blocks:
        lines = [l for l in block.split("\n")]
        if not lines or lines[0].startswith("WEBVTT") or lines[0].startswith("NOTE") or lines[0].startswith("STYLE"):
            if lines and lines[0].startswith("WEBVTT"):
                lines = lines[1:]
                while lines and "-->" not in lines[0]:
                    lines = lines[1:]
                if not lines:
                    continue
            else:
                continue
        ti = next((k for k, l in enumerate(lines) if "-->" in l), None)
        if ti is None:
            continue
        a, b = lines[ti].split("-->")
        body = [re.sub(r"<[^>]+>", "", l).strip() for l in lines[ti + 1:] if l.strip()]
        cues.append({"start": parse_clock(a), "end": parse_clock(b.strip().split()[0]), "lines": body})
    return cues


def cmd_captions(args):
    timing = read_json(args.timing)
    cues = build_cues(timing, args.max_chars, args.max_lines, args.min_dur, args.max_dur, args.tail)
    base = os.path.join(args.out_dir, args.name)
    write_text(base + ".vtt", vtt_text(cues))
    write_text(base + ".srt", srt_text(cues))
    write_json(base + ".json", {"version": 1, "lang": timing["lang"], "cues": cues})
    longest = max(len(l) for c in cues for l in c["lines"])
    print("Wrote %d cues to %s.vtt, .srt and .json (longest line %d chars)." % (len(cues), base, longest))
    return 0


# ---------------------------------------------------------------------------
# Storyboard beats -> timing.js for the composition
# ---------------------------------------------------------------------------


def find_phrase(words, phrase, start_at, lang):
    key, info = lang_info(lang)
    if info["unit"] == "chars":
        target = [p for tok, _ in char_tokens(phrase) for p in split_say(tok)]
        seq = [p for w in words for tok, _ in char_tokens(w["text"]) for p in split_say(tok)]
        owners = [k for k, w in enumerate(words) for tok, _ in char_tokens(w["text"]) for _ in split_say(tok)]
    else:
        target = split_say(phrase)
        seq = [p for w in words for p in split_say(w["text"])]
        owners = [k for k, w in enumerate(words) for _ in split_say(w["text"])]
    if not target:
        return None
    first = next((q for q, o in enumerate(owners) if o >= start_at), len(seq))
    for q in range(first, len(seq) - len(target) + 1):
        if seq[q:q + len(target)] == target:
            return owners[q]
    return None


def resolve_beats(board, timing, tail=DEFAULT_TAIL, lead=0.25, mark_lead=0.12):
    words = timing["words"]
    by_ch = {}
    for w in words:
        by_ch.setdefault(w["c"], []).append(w)
    chapters = {c["id"]: c for c in timing["chapters"]}
    end = timing["end"] + tail
    out = []
    problems = []
    cursor = {}
    for b in board.get("beats", []):
        cid = b.get("chapter")
        anchor = b.get("anchor", "@start")
        if "at" in b:
            t = float(b["at"])
        elif anchor == "@end":
            t = timing["end"] + 0.4
        elif cid not in chapters:
            problems.append("beat %s: unknown chapter %r" % (b.get("id"), cid))
            continue
        elif anchor in (None, "", "@start"):
            t = chapters[cid]["start"] - lead
            cursor[cid] = 0
        else:
            k = find_phrase(by_ch[cid], anchor, cursor.get(cid, 0), timing["lang"])
            if k is None:
                problems.append("beat %s: phrase %r not found in chapter %s" % (b.get("id"), anchor, cid))
                continue
            cursor[cid] = k
            t = by_ch[cid][k]["start"] - lead
        t = max(0.0, t + float(b.get("offset", 0.0)))
        marks = []
        mc = cursor.get(cid, 0)
        for phrase in b.get("marks", []):
            k = find_phrase(by_ch.get(cid, []), phrase, mc, timing["lang"]) if cid in by_ch else None
            if k is None:
                problems.append("beat %s: mark %r not found in chapter %s" % (b.get("id"), phrase, cid))
                continue
            mc = k
            marks.append(r3(max(t, by_ch[cid][k]["start"] - mark_lead)))
        out.append({"id": b["id"], "scene": b.get("scene", b["id"]), "chapter": cid, "component": b.get("component", ""),
                    "start": r3(t), "marks": marks, "hold": bool(b.get("hold"))})
    for k, b in enumerate(out):
        b["end"] = out[k + 1]["start"] if k + 1 < len(out) else r3(end)
        if b["end"] < b["start"]:
            problems.append("beat %s starts after the next beat; reorder or fix its anchor" % b["id"])
    return out, r3(end), problems


def patch_html(path, duration, timing):
    with open(path, "r", encoding="utf-8") as fh:
        src = fh.read()

    def set_attr(tag, name, value):
        if re.search(r'\s%s="[^"]*"' % name, tag):
            return re.sub(r'(\s%s=")[^"]*(")' % name, lambda m: m.group(1) + value + m.group(2), tag)
        return tag[:-1] + ' %s="%s">' % (name, value)

    def patch(tag_id, attrs):
        nonlocal src
        comments = [(c.start(), c.end()) for c in re.finditer(r"<!--.*?-->", src, re.S)]
        m = None
        for cand in re.finditer(r'<[a-z]+[^>]*\sid="%s"[^>]*>' % re.escape(tag_id), src):
            if not any(a <= cand.start() < b for a, b in comments):
                m = cand
                break
        if not m:
            return False
        tag = m.group(0)
        for k, v in attrs.items():
            tag = set_attr(tag, k, v)
        src = src[:m.start()] + tag + src[m.end():]
        return True

    patched = []
    if patch("root", {"data-duration": "%.3f" % duration}):
        patched.append("#root")
    vo_len = timing.get("audioDuration")
    if vo_len and patch("vo", {"data-start": "%.3f" % timing["voOffset"], "data-duration": "%.3f" % vo_len}):
        patched.append("#vo")
    if patch("music", {"data-duration": "%.3f" % duration}):
        patched.append("#music")
    write_text(path, src)
    return patched


def cmd_beats(args):
    board = read_json(args.storyboard)
    timing = read_json(args.timing)
    beats, end, problems = resolve_beats(board, timing, args.tail)
    for p in problems:
        print("FAIL  %s" % p)
    if problems:
        return 1
    payload = {"version": 1, "duration": end, "voOffset": timing["voOffset"], "lang": timing["lang"],
               "chapters": timing["chapters"], "beats": beats,
               "words": [[w["text"], w["start"], w["end"]] for w in timing["words"]]}
    js = ("/* Generated by scripts/explainer.py beats. Do not edit by hand; change storyboard.json or the script. */\n"
          "window.EXPLAINER_TIMING = %s;\n" % json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    write_text(args.out, js)
    if args.json:
        write_json(args.json, payload)
    for b in beats:
        print("%-10s %-12s %6.2f -> %6.2f  marks %s" % (b["id"][:10], b["component"][:12], b["start"], b["end"],
                                                    ", ".join("%.2f" % m for m in b["marks"]) or "-"))
    if args.html:
        print("Patched %s in %s" % (", ".join(patch_html(args.html, end, timing)) or "nothing", args.html))
    print("Film length %.2f s. Wrote %s" % (end, args.out))
    return 0


def cmd_inline_vtt(args):
    with open(args.vtt, "r", encoding="utf-8") as fh:
        vtt = fh.read().replace("\r\n", "\n")
    if re.search(r"</script", vtt, re.I):
        raise ToolError("The caption file contains '</script'; remove it before inlining.")
    with open(args.html, "r", encoding="utf-8") as fh:
        src = fh.read()
    pat = re.compile(r'(<script[^>]*type="text/vtt"[^>]*id="%s"[^>]*>|<script[^>]*id="%s"[^>]*type="text/vtt"[^>]*>)(.*?)(</script>)'
                     % (re.escape(args.id), re.escape(args.id)), re.S)
    m = pat.search(src)
    if not m:
        raise ToolError('No <script type="text/vtt" id="%s"> block in %s.' % (args.id, args.html))
    src = src[:m.start(2)] + "\n" + vtt.strip("\n") + "\n" + src[m.end(2):]
    write_text(args.html, src)
    print("Inlined %s into %s (#%s)." % (args.vtt, args.html, args.id))
    return 0


# ---------------------------------------------------------------------------
# Ducking envelope for the music bed (HyperFrames data-automation volume lane)
# ---------------------------------------------------------------------------


def duck_points(timing, music_start=0.0, bed=0.5, under=0.18, attack=0.25, release=0.6, merge=0.8, length=None):
    phrases = []
    for w in timing["words"]:
        if phrases and w["start"] - phrases[-1][1] < merge:
            phrases[-1][1] = w["end"]
        else:
            phrases.append([w["start"], w["end"]])
    while len(phrases) * 4 + 2 > 512:
        merge *= 1.5
        joined = []
        for p in phrases:
            if joined and p[0] - joined[-1][1] < merge:
                joined[-1][1] = p[1]
            else:
                joined.append(list(p))
        phrases = joined
    pts = [(0.0, bed)]
    for s, e in phrases:
        s, e = s - music_start, e - music_start
        a0 = max(0.0, s - attack)
        if a0 > pts[-1][0] and pts[-1][1] != under:
            pts.append((a0, bed))
        pts.append((max(a0, s), under))
        pts.append((e, under))
        pts.append((e + release, bed))
    clean = []
    for t, v in pts:
        t = r3(max(0.0, t))
        if clean and t <= clean[-1]["t"]:
            if v == under:
                clean[-1]["v"] = under
            continue
        clean.append({"t": t, "v": round(v, 3)})
    if length:
        clean = [p for p in clean if p["t"] <= length]
    return clean


def cmd_duck(args):
    timing = read_json(args.timing)
    pts = duck_points(timing, args.music_start, args.bed, args.under, args.attack, args.release, args.merge, args.length)
    lane = {"version": 1, "lanes": [{"target": "volume", "points": pts}]}
    text = json.dumps(lane, separators=(",", ":"))
    if args.out:
        write_text(args.out, text + "\n")
    print("data-automation='%s'" % text)
    print("%d points. Put this attribute on <audio id=\"music\">; do not also set data-volume or tween volume." % len(pts), file=sys.stderr)
    return 0


# ---------------------------------------------------------------------------
# Contact sheet
# ---------------------------------------------------------------------------


def pick_frames(beats, limit):
    if len(beats) <= limit:
        return list(range(len(beats)))
    keep = set()
    seen = set()
    for k, b in enumerate(beats):
        if b.get("chapter") not in seen:
            keep.add(k)
            seen.add(b.get("chapter"))
    keep.add(len(beats) - 1)
    rest = sorted((k for k in range(len(beats)) if k not in keep), key=lambda k: -(beats[k].get("end", 0) - beats[k].get("start", 0)))
    for k in rest:
        if len(keep) >= limit:
            break
        keep.add(k)
    return sorted(keep)[:max(limit, len(seen) + 1)]


def snapshot_for(folder, beat_id, t):
    if not folder or not os.path.isdir(folder):
        return None
    files = [f for f in os.listdir(folder) if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
    for f in files:
        if os.path.splitext(f)[0] == beat_id:
            return os.path.join(folder, f)
    if t is None:
        return None
    best = None
    for f in files:
        nums = re.findall(r"\d+(?:\.\d+)?", f)
        for n in nums:
            d = abs(float(n) - t)
            if d < 0.06 and (best is None or d < best[0]):
                best = (d, f)
    return os.path.join(folder, best[1]) if best else None


def cmd_contact_sheet(args):
    board = read_json(args.storyboard)
    beats = [dict(b) for b in board.get("beats", [])]
    timing = read_json(args.timing) if args.timing else None
    plan = read_json(args.script) if args.script else None
    resolved = {}
    if timing:
        rb, _, _ = resolve_beats(board, timing)
        resolved = {b["id"]: b for b in rb}
    for b in beats:
        r = resolved.get(b["id"])
        if r:
            b["start"], b["end"] = r["start"], r["end"]
    frames = pick_frames(beats, args.max)
    times = []
    for k in frames:
        b = beats[k]
        if "start" in b:
            times.append(round(min(b["end"] - 0.05, b["start"] + max(0.6, (b["end"] - b["start"]) * 0.6)), 2))
        else:
            times.append(None)
    if args.print_times:
        print(",".join("%.2f" % t for t in times if t is not None))
        return 0
    chapters = {c["id"]: c for c in (plan or {}).get("chapters", [])}
    titles = {c["id"]: c["title"] for c in (timing or {}).get("chapters", [])}
    out_dir = os.path.dirname(os.path.abspath(args.out))
    cards = []
    for n, (k, t) in enumerate(zip(frames, times), 1):
        b = beats[k]
        snap = snapshot_for(args.snapshots, b["id"], t)
        vo = ""
        if timing and "start" in b:
            vo = join_show([w for w in timing["words"] if b["start"] - 0.01 <= w["start"] < b["end"]], timing["lang"])
        elif b.get("chapter") in chapters:
            vo = chapters[b["chapter"]]["show"][:160]
        if snap:
            frame = '<img src="%s" alt="">' % html.escape(os.path.relpath(snap, out_dir))
        else:
            frame = '<div class="sketch"><b>%s</b><span>%s</span></div>' % (
                html.escape(b.get("component", "scene")), html.escape(b.get("visual", "")))
        on_screen = "".join("<li>%s</li>" % html.escape(s) for s in b.get("onScreen", []))
        stamp = "%s - %s" % (fmt_clock(b["start"])[3:-1], fmt_clock(b["end"])[3:-1]) if "start" in b else "untimed"
        cards.append(
            '<article><div class="frame">%s<em>%d</em></div><div class="meta"><p class="when">%s &middot; %s</p>'
            '<h3>%s</h3><ul>%s</ul><p class="vo">%s</p></div></article>' % (
                frame, n, html.escape(stamp), html.escape(titles.get(b.get("chapter"), b.get("chapter", ""))),
                html.escape(b.get("visual", "")[:140]), on_screen, html.escape(vo)))
    canvas = board.get("canvas", {})
    ratio = "%s / %s" % (canvas.get("width", 16), canvas.get("height", 9))
    doc = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storyboard - %(title)s</title>
<style>
:root{--ink:#1d1b19;--muted:#6b665f;--line:#e2ddd5;--bg:#f7f5f1;--card:#fff;--accent:#c2462e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,"Segoe UI",Roboto,sans-serif}
header{padding:28px 32px 8px}h1{margin:0 0 4px;font-size:24px}header p{margin:0;color:var(--muted)}
.ask{margin:16px 32px;padding:14px 18px;border:1px solid var(--line);background:var(--card);border-radius:10px}
.ask b{color:var(--accent)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:16px 32px 40px}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.frame{position:relative;aspect-ratio:%(ratio)s;background:#ece8e1;display:grid;place-items:center}
.frame img{width:100%%;height:100%%;object-fit:cover;display:block}
.frame em{position:absolute;left:8px;top:8px;font-style:normal;font-weight:700;background:var(--ink);color:#fff;border-radius:6px;padding:1px 8px;font-size:13px}
.sketch{padding:18px;text-align:center;color:var(--muted)}.sketch b{display:block;color:var(--ink);font-size:17px;margin-bottom:6px;text-transform:capitalize}
.meta{padding:12px 14px 14px}.when{margin:0;color:var(--muted);font-size:13px}h3{margin:4px 0 6px;font-size:15px}
ul{margin:0 0 8px;padding-left:18px;font-size:14px}.vo{margin:0;font-size:14px;color:#3b3732;border-left:3px solid var(--line);padding-left:10px}
</style></head><body>
<header><h1>%(title)s</h1><p>%(sub)s</p></header>
<div class="ask">Review these frames before any voiceover or render is paid for. Reply <b>approve</b>, or name a frame number and what to change (wording, order, picture, pace).</div>
<main>%(cards)s</main>
</body></html>
""" % {"title": html.escape(board.get("title", "Explainer storyboard")),
       "sub": html.escape("%s style &middot; %s &middot; %d beats, %d shown" % (board.get("style", "?"), (timing or plan or {}).get("lang", "?"), len(beats), len(frames))).replace("&amp;middot;", "&middot;"),
       "ratio": ratio, "cards": "\n".join(cards)}
    write_text(args.out, doc)
    print("Wrote %s with %d frames." % (args.out, len(frames)))
    if timing and not args.snapshots:
        print("For real frames: npx hyperframes snapshot --at %s  then re-run with --snapshots <folder>"
              % ",".join("%.2f" % t for t in times if t is not None))
    return 0


# ---------------------------------------------------------------------------
# QA
# ---------------------------------------------------------------------------


class Report(object):
    def __init__(self):
        self.rows = []

    def add(self, level, check, msg):
        self.rows.append({"level": level, "check": check, "message": msg})

    def failed(self):
        return any(r["level"] == "FAIL" for r in self.rows)


def match_cues_to_words(cues, words, lang):
    key, info = lang_info(lang)
    char_lang = info["unit"] == "chars"

    def toks(text):
        if char_lang:
            return [p for tok, _ in char_tokens(text) for p in split_say(tok)]
        return [p for tok in text.split() for p in split_say(tok)]

    a, a_owner = [], []
    for ci, c in enumerate(cues):
        for t in toks(" ".join(c["lines"])):
            a.append(t)
            a_owner.append(ci)
    b, b_owner = [], []
    for wi, w in enumerate(words):
        for t in toks(w["text"]):
            b.append(t)
            b_owner.append(wi)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    spans = [None] * len(cues)
    covered = set()
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            ci, wi = a_owner[blk.a + k], b_owner[blk.b + k]
            covered.add(wi)
            if spans[ci] is None:
                spans[ci] = [wi, wi]
            else:
                spans[ci][0] = min(spans[ci][0], wi)
                spans[ci][1] = max(spans[ci][1], wi)
    return spans, len(covered) / float(len(words) or 1)


def parse_loudness(text):
    seg = text[text.rfind("Summary:"):] if "Summary:" in text else text
    i = re.findall(r"I:\s*(-?[\d.]+|-inf)\s*LUFS", seg)
    peak = re.findall(r"Peak:\s*(-?[\d.]+|-inf)\s*dBFS", seg)
    lra = re.findall(r"LRA:\s*(-?[\d.]+)\s*LU", seg)
    val = lambda s: -120.0 if s == "-inf" else float(s)
    return {"integrated": val(i[-1]) if i else None, "truePeak": val(peak[-1]) if peak else None,
            "lra": float(lra[-1]) if lra else None}


def parse_silences(text):
    out = []
    start = None
    for line in text.splitlines():
        m = re.search(r"silence_start:\s*(-?[\d.]+)", line)
        if m:
            start = float(m.group(1))
        m = re.search(r"silence_end:\s*([\d.]+)", line)
        if m and start is not None:
            out.append((max(0.0, start), float(m.group(1))))
            start = None
    if start is not None:
        out.append((start, None))
    return out


def contrast(c1, c2):
    def lum(hexv):
        h = hexv.lstrip("#")
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        rgb = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
        lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
        return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
    l1, l2 = sorted([lum(c1), lum(c2)], reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def qa_html(path, rep, duration, vtt_path, canvas_h):
    with open(path, "r", encoding="utf-8") as fh:
        src = fh.read()
    folder = os.path.dirname(os.path.abspath(path))
    src = re.sub(r"<!--.*?-->", "", src, flags=re.S)
    css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", src, re.S))
    scripts = "\n".join(re.findall(r"<script(?![^>]*text/vtt)[^>]*>(.*?)</script>", src, re.S))
    for href in re.findall(r'<link[^>]+href="([^"]+\.css)"', src):
        p = os.path.join(folder, href)
        if os.path.exists(p):
            css += "\n" + open(p, encoding="utf-8").read()
    local_js = []
    for s in re.findall(r'<script[^>]+src="([^"]+)"', src):
        if re.match(r"^(https?:)?//", s):
            continue
        p = os.path.join(folder, s)
        if os.path.exists(p) and not os.path.basename(p).startswith("gsap"):
            local_js.append(open(p, encoding="utf-8").read())
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    remote = re.findall(r'(?:src|href)="((?:https?:)?//[^"]+)"', src) + re.findall(r"url\(\s*['\"]?((?:https?:)?//[^)'\"]+)", css)
    remote = [r for r in remote if not re.search(r'<a\s[^>]*href="%s"' % re.escape(r), src)]
    if remote:
        rep.add("FAIL", "offline", "Remote files referenced (the render must not need the network): %s" % ", ".join(sorted(set(remote))[:4]))
    else:
        rep.add("PASS", "offline", "Every script, stylesheet, font and media file is local.")
    code = scripts + "\n".join(local_js)
    bad = [p for p in ("Math.random", "Date.now", "repeat: -1", "repeat:-1", "setInterval") if p in code]
    if bad:
        rep.add("FAIL", "determinism", "Non-deterministic code in the composition: %s" % ", ".join(bad))
    else:
        rep.add("PASS", "determinism", "No clocks, randomness or infinite repeats in the composition scripts.")
    if "__duration" not in src:
        rep.add("WARN", "duration-hook", "window.__duration is not set; previews and recorders cannot read the length.")
    root = re.search(r'<[a-z]+[^>]*\sid="root"[^>]*>', src)
    if root and duration:
        m = re.search(r'data-duration="([\d.]+)"', root.group(0))
        if m and abs(float(m.group(1)) - duration) > 0.25:
            rep.add("FAIL", "duration-attr", "#root data-duration is %s s but the timing says %.2f s; run `beats --html`." % (m.group(1), duration))
    m = re.search(r'<script[^>]*type="text/vtt"[^>]*>(.*?)</script>', src, re.S)
    if m and vtt_path:
        inline = m.group(1).strip().replace("\r\n", "\n")
        with open(vtt_path, "r", encoding="utf-8") as fh:
            disk = fh.read().strip().replace("\r\n", "\n")
        if inline != disk:
            rep.add("FAIL", "captions-inline", "The captions inlined in the HTML differ from %s; run `inline-vtt`." % os.path.basename(vtt_path))
        else:
            rep.add("PASS", "captions-inline", "Inlined captions match %s byte for byte." % os.path.basename(vtt_path))
    # Sizes are judged against the canvas's shorter side, so tall and square canvases get fair limits.
    cw = re.search(r'data-width="(\d+)"', root.group(0)) if root else None
    ch = re.search(r'data-height="(\d+)"', root.group(0)) if root else None
    w_px = float(cw.group(1)) if cw else None
    h_px = float(ch.group(1)) if ch else canvas_h
    if w_px and h_px:
        canvas_h = h_px
        aspect = "wide" if w_px > h_px * 1.2 else ("tall" if h_px > w_px * 1.2 else "square")
        short = min(w_px, h_px) / h_px
    else:
        aspect, short = "wide", 1.0
    sizes = []
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        other = re.search(r'data-aspect="([a-z]+)"', sel)
        if other and other.group(1) != aspect:
            continue
        for v in re.findall(r"font-size\s*:\s*([^;]+)", body):
            u = re.search(r"var\(--u\)\s*\*\s*([\d.]+)|([\d.]+)\s*\*\s*var\(--u\)", v)
            px = re.search(r"^\s*([\d.]+)px", v)
            if u:
                sizes.append((sel.strip(), float(u.group(1) or u.group(2)) / short))
            elif px and canvas_h:
                sizes.append((sel.strip(), float(px.group(1)) / canvas_h * 100.0 / short))
    small = [(s, v) for s, v in sizes if v < 2.4]
    cap = [(s, v) for s, v in sizes if "cap" in s and "x-captions" not in s]
    if small:
        rep.add("FAIL" if min(v for _, v in small) < 2.2 else "WARN", "legibility",
                "Text under 2.4%% of the frame's shorter side: %s" % ", ".join("%s (%.1f)" % (s[:40], v) for s, v in small[:4]))
    elif sizes:
        rep.add("PASS", "legibility", "Smallest text is %.1f%% of the frame's shorter side." % min(v for _, v in sizes))
    if cap and min(v for _, v in cap) < 3.8:
        rep.add("FAIL", "caption-size", "Caption text is %.1f%% of the frame's shorter side; use at least 3.8%%." % min(v for _, v in cap))
    style = re.search(r'data-style="([a-z-]+)"', src)
    blocks = re.findall(r"([^{}]+)\{([^{}]*)\}", css)
    for sel, body in blocks:
        if style and "data-style" in sel and style.group(1) not in sel:
            continue
        ink = re.search(r"--cap-ink\s*:\s*(#[0-9a-fA-F]{3,6})\b", body)
        bg = re.search(r"--cap-bg\s*:\s*(#[0-9a-fA-F]{3,6})\b", body)
        if ink and bg:
            ratio = contrast(ink.group(1), bg.group(1))
            rep.add("PASS" if ratio >= 4.5 else "FAIL", "caption-contrast",
                    "Caption contrast %.1f:1 in %s (need 4.5:1)." % (ratio, sel.strip()[:40]))


def qa_media(media, log_text, rep, expected, lufs, tp_max, end_hold):
    loud = parse_loudness(log_text) if log_text else None
    sil = parse_silences(log_text) if log_text else []
    media_dur = None
    if media and not log_text:
        if not shutil.which("ffmpeg"):
            rep.add("WARN", "loudness", "ffmpeg is not installed; loudness and silence were not measured.")
            return
        cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", media, "-af", "silencedetect=noise=-45dB:d=1.2,ebur128=peak=true", "-f", "null", "-"]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        text = res.stderr
        loud, sil = parse_loudness(text), parse_silences(text)
        m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", text)
        if m:
            media_dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
        streams = re.findall(r"Stream #\S+.*?: (Video|Audio):", text)
        if "Audio" not in streams:
            rep.add("FAIL", "audio-stream", "The render has no audio stream. Check that every <audio> has an id.")
            return
    if loud and loud["integrated"] is not None:
        ok = abs(loud["integrated"] - lufs) <= 1.0
        rep.add("PASS" if ok else "FAIL", "loudness", "Integrated %.1f LUFS (target %.0f +/- 1)." % (loud["integrated"], lufs))
    if loud and loud["truePeak"] is not None:
        rep.add("PASS" if loud["truePeak"] <= tp_max else "FAIL", "true-peak", "Peak %.1f dBTP (max %.1f)." % (loud["truePeak"], tp_max))
    if media_dur is not None and expected:
        rep.add("PASS" if abs(media_dur - expected) <= 0.25 else "FAIL", "render-length",
                "Render is %.2f s; timing says %.2f s." % (media_dur, expected))
    total = media_dur or expected or 0
    dead = [(s, e) for s, e in sil if (e if e is not None else total) - s > 2.0 and s < total - end_hold]
    if dead:
        rep.add("FAIL", "dead-air", "Silent stretches over 2 s: %s" % ", ".join("%.1f-%s" % (s, "%.1f" % e if e else "end") for s, e in dead[:4]))
    elif log_text or media:
        rep.add("PASS", "dead-air", "No silence over 2 s before the end card.")


def cmd_qa(args):
    rep = Report()
    timing = read_json(args.timing)
    lang = timing["lang"]
    key, info = lang_info(lang)
    words = timing["words"]
    duration = None
    beats = None
    if args.beats:
        with open(args.beats, "r", encoding="utf-8") as fh:
            raw = fh.read()
        m = re.search(r"=\s*(\{.*\})\s*;?\s*$", raw, re.S)
        payload = json.loads(m.group(1) if m else raw)
        beats, duration = payload["beats"], payload["duration"]
    elif args.storyboard:
        beats, duration, problems = resolve_beats(read_json(args.storyboard), timing, args.tail)
        for p in problems:
            rep.add("FAIL", "beats", p)
    if duration is None:
        duration = timing["end"] + args.tail
    lo, hi = (50.0, 70.0) if args.lite else (45.0, 120.0)
    rep.add("PASS" if lo <= duration <= hi else "FAIL", "length", "Film runs %.1f s (allowed %d-%d s)." % (duration, lo, hi))

    # Pace per chapter.
    for ch in timing["chapters"]:
        cw = [w for w in words if w["c"] == ch["id"]]
        span = max(0.1, ch["end"] - ch["start"])
        if info["unit"] == "chars":
            units = sum(len([c for c in w["text"] if is_cjk_char(c)]) or 1 for w in cw)
        elif info.get("syllables"):
            units = sum(w.get("w", 1) for w in cw)
        else:
            units = sum(len(split_say(w["text"])) for w in cw)
        rate = units / span * 60.0
        dev = (rate - info["rate"]) / info["rate"]
        level = "PASS" if abs(dev) <= 0.20 else ("WARN" if abs(dev) <= 0.35 else "FAIL")
        rep.add(level, "pace", "%s: %.0f per minute (target %d, %+.0f%%)." % (ch["id"], rate, info["rate"], dev * 100))

    # Dead air from word timing.
    holds = [(b["start"], b["end"]) for b in (beats or []) if b.get("hold")]
    if words and words[0]["start"] > 1.5:
        rep.add("WARN" if words[0]["start"] <= 2.5 else "FAIL", "air-start", "First word at %.2f s; start speaking within 1.5 s." % words[0]["start"])
    gaps = []
    for p, w in zip(words, words[1:]):
        g = w["start"] - p["end"]
        if g > 1.5 and not any(s <= p["end"] and w["start"] <= e for s, e in holds):
            gaps.append((p["end"], g))
    if gaps:
        worst = max(g for _, g in gaps)
        rep.add("FAIL" if worst > 2.5 else "WARN", "air-gap", "Pauses over 1.5 s with no planned hold: %s" % ", ".join("%.1f s at %.1f" % (g, t) for t, g in gaps[:5]))
    else:
        rep.add("PASS", "air-gap", "No narration gap over 1.5 s.")
    tail_gap = duration - timing["end"]
    if tail_gap > 6.0:
        rep.add("WARN", "air-end", "%.1f s after the last word; trim the end card to 3-5 s." % tail_gap)

    # Visual pacing.
    if beats:
        events = sorted(set([b["start"] for b in beats] + [m for b in beats for m in b.get("marks", [])]))
        events.append(duration)
        longest = 0.0
        where = 0.0
        for k in range(len(events) - 1):
            d = events[k + 1] - events[k]
            in_hold = any(b.get("hold") and b["start"] <= events[k] < b["end"] for b in beats)
            is_end = events[k] >= timing["end"] - 0.5
            limit = 9.0 if (in_hold or is_end) else 6.0
            if d > longest and not (is_end and d <= 6.0):
                longest, where = d, events[k]
            if d > limit + 3.0 or (d > limit and not in_hold and not is_end and d > 9.0):
                pass
        level = "PASS" if longest <= 6.0 else ("WARN" if longest <= 9.0 else "FAIL")
        rep.add(level, "visual-pace", "Longest stretch without a visual change: %.1f s at %.1f s." % (longest, where))
        short = [b["id"] for b in beats if b["end"] - b["start"] < 1.0]
        if short:
            rep.add("WARN", "beat-length", "Beats under 1 s (hard to read): %s" % ", ".join(short))

    # Captions.
    if args.captions:
        with open(args.captions, "r", encoding="utf-8") as fh:
            cues = parse_vtt(fh.read()) if not args.captions.endswith(".srt") else parse_vtt(fh.read().replace(",", "."))
        max_line = args.max_chars or info["line"]
        spans, cover = match_cues_to_words(cues, words, lang)
        rep.add("PASS" if cover >= 0.98 else "FAIL", "caption-coverage", "%.0f%% of spoken words appear in captions." % (cover * 100))
        off_start, off_end, long_lines, fast, short, overlap = [], [], [], [], [], []
        for k, (c, sp) in enumerate(zip(cues, spans)):
            if sp is None:
                off_start.append((k + 1, None))
                continue
            ws, we = words[sp[0]]["start"], words[sp[1]]["end"]
            d0 = c["start"] - ws
            if abs(d0) > args.sync_tol:
                off_start.append((k + 1, d0))
            d1 = c["end"] - we
            if d1 < -args.sync_tol or d1 > 1.2:
                off_end.append((k + 1, d1))
            for line in c["lines"]:
                if len(line) > max_line:
                    long_lines.append((k + 1, len(line)))
            chars = len("".join(c["lines"]).replace(" ", "")) if info["unit"] == "chars" else len(" ".join(c["lines"]))
            dur = max(0.01, c["end"] - c["start"])
            if chars / dur > info["cps"]:
                fast.append((k + 1, chars / dur))
            if dur < 0.8:
                short.append(k + 1)
            if k and c["start"] < cues[k - 1]["end"] - 0.001:
                overlap.append(k + 1)
            if len(c["lines"]) > args.max_lines:
                long_lines.append((k + 1, "%d lines" % len(c["lines"])))
        tol_ms = int(args.sync_tol * 1000)
        if off_start:
            rep.add("FAIL", "caption-sync", "Cue starts off the first spoken word by more than %d ms: %s" % (
                tol_ms, ", ".join("#%d (%s)" % (n, "unmatched" if d is None else "%+d ms" % (d * 1000)) for n, d in off_start[:6])))
        else:
            rep.add("PASS", "caption-sync", "Every cue starts within %d ms of its first word." % tol_ms)
        if off_end:
            rep.add("FAIL", "caption-end", "Cues that end before their last word or linger over 1.2 s: %s" % ", ".join("#%d (%+d ms)" % (n, d * 1000) for n, d in off_end[:6]))
        if long_lines:
            rep.add("FAIL", "caption-lines", "Lines over %d chars or more than %d lines: %s" % (max_line, args.max_lines, ", ".join("#%d (%s)" % x for x in long_lines[:6])))
        else:
            rep.add("PASS", "caption-lines", "All cues fit %d lines of %d chars." % (args.max_lines, max_line))
        if fast:
            rep.add("WARN", "caption-speed", "Cues faster than %d chars/s (the narration is too dense here; cut words, not captions): %s"
                    % (info["cps"], ", ".join("#%d (%.0f)" % x for x in fast[:6])))
        if short:
            rep.add("WARN", "caption-short", "Cues under 0.8 s: %s" % ", ".join("#%d" % n for n in short[:6]))
        if overlap:
            rep.add("FAIL", "caption-overlap", "Overlapping cues: %s" % ", ".join("#%d" % n for n in overlap[:6]))

    # Facts and sources.
    if args.sources:
        src = read_json(args.sources)
        claims = src.get("claims", [])
        weak = [c.get("id") for c in claims if c.get("status") not in ("verified", "user-provided", "first-party")]
        nosrc = [c.get("id") for c in claims if not (c.get("source") or {}).get("title") or not ((c.get("source") or {}).get("url") or (c.get("source") or {}).get("provider"))]
        if weak:
            rep.add("FAIL", "facts", "Claims not verified: %s. Verify, have the user confirm, or cut them." % ", ".join(map(str, weak)))
        if nosrc:
            rep.add("FAIL", "facts", "Claims without a source title and URL (or provider): %s" % ", ".join(map(str, nosrc)))
        known = set()
        for c in claims:
            for v in c.get("values", []) + [c.get("text", "")]:
                for n in re.findall(r"\d[\d.,]*", str(v)):
                    known.add(n.strip(".,").replace(",", ""))
        texts = [w["text"] for w in words]
        if args.storyboard:
            for b in read_json(args.storyboard).get("beats", []):
                texts.extend(b.get("onScreen", []))
        missing = sorted(set(n.strip(".,").replace(",", "") for t in texts for n in re.findall(r"\d[\d.,]*", t)) - known)
        missing = [n for n in missing if n]
        if missing:
            rep.add("FAIL", "numbers", "Numbers with no claim in sources.json: %s" % ", ".join(missing[:10]))
        elif claims:
            rep.add("PASS", "numbers", "Every number on screen or in the narration is backed by a claim.")
        if claims and beats is not None:
            if not any(b.get("component") in ("end-card", "sources") for b in beats):
                rep.add("FAIL", "sources-card", "Claims exist but no end-card beat lists the sources.")
            else:
                rep.add("PASS", "sources-card", "An end card carries the sources.")
        if not weak and not nosrc and claims:
            rep.add("PASS", "facts", "%d claims, all sourced and verified." % len(claims))

    if args.html:
        qa_html(args.html, rep, duration, args.captions if args.captions and args.captions.endswith(".vtt") else None, args.canvas_height)

    if args.media or args.loudness_log:
        log_text = open(args.loudness_log, encoding="utf-8").read() if args.loudness_log else None
        qa_media(args.media, log_text, rep, duration, args.lufs, args.true_peak, args.tail + 1.0)

    if args.out:
        write_json(args.out, {"version": 1, "duration": r3(duration), "lang": lang, "checks": rep.rows,
                              "failed": rep.failed()})
    for r in rep.rows:
        print("%-5s %-17s %s" % (r["level"], r["check"], r["message"]))
    print("QA %s: %d checks, %d failed, %d warnings." % ("FAILED" if rep.failed() else "passed", len(rep.rows),
                                                     sum(r["level"] == "FAIL" for r in rep.rows), sum(r["level"] == "WARN" for r in rep.rows)))
    return 1 if rep.failed() else 0


# ---------------------------------------------------------------------------
# Scaffold
# ---------------------------------------------------------------------------


def kit_dir():
    return os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references", "kit"))


def cmd_scaffold(args):
    kit = kit_dir()
    if not os.path.isdir(kit):
        raise ToolError("Kit folder not found at %s" % kit)
    dest = args.dir
    if os.path.exists(os.path.join(dest, "index.html")) and not args.force:
        raise ToolError("%s/index.html exists; pass --force to overwrite the kit files." % dest)
    w, h = [int(x) for x in args.canvas.lower().split("x")]
    os.makedirs(os.path.join(dest, "assets", "fonts"), exist_ok=True)
    plan = {
        "index.html": "index.html", "script.md": "script.md", "storyboard.json": "storyboard.json", "sources.json": "sources.json",
        "explainer.css": "assets/explainer.css", "explainer-runtime.js": "assets/explainer-runtime.js",
        "explainer-components.js": "assets/explainer-components.js",
    }
    for src_name, dst_name in plan.items():
        with open(os.path.join(kit, src_name), "r", encoding="utf-8") as fh:
            text = fh.read()
        if src_name == "index.html":
            text = text.replace('data-style="paper-collage"', 'data-style="%s"' % args.style)
            text = re.sub(r'data-width="\d+"', 'data-width="%d"' % w, text)
            text = re.sub(r'data-height="\d+"', 'data-height="%d"' % h, text)
            text = text.replace('lang="en"', 'lang="%s"' % lang_info(args.lang)[0])
        if src_name == "script.md":
            text = text.replace("lang: en", "lang: %s" % lang_info(args.lang)[0]).replace("style: paper-collage", "style: %s" % args.style)
        if src_name == "storyboard.json":
            text = text.replace('"paper-collage"', '"%s"' % args.style).replace('"width": 1920', '"width": %d' % w).replace('"height": 1080', '"height": %d' % h)
        write_text(os.path.join(dest, dst_name), text)
    print("Scaffolded %s (%s, %dx%d). Next: copy gsap.min.js into %s/assets/ and three font files into assets/fonts/ "
          "(see references/composition.md), then write script.md." % (dest, args.style, w, h, dest))
    return 0


# ---------------------------------------------------------------------------
# Self-test: exercises every command on synthetic data. No network, no credits.
# ---------------------------------------------------------------------------


SELFTEST_SCRIPT = """# Selftest explainer
lang: en
target: 50
voice: Charon

## The problem {#problem}
Spreadsheets break when two people edit them at once. Somebody's change always gets lost.

## How it works {#how}
A shared ledger keeps every edit, in order, with its author. Conflicts show up as two versions [pause 0.4] side by side.

## The numbers {#numbers}
In our test, 64% of lost edits came from copy-paste. [[SQL|sequel]] exports were the next 20%.
"""

SELFTEST_ZH = """# Selftest zh
lang: zh-CN

## \u5f00\u573a {#intro}
\u6280\u80fd\u5c31\u662f\u4e00\u4e2a\u6587\u4ef6\u5939\u3002\u91cc\u9762\u6709\u4e00\u4e2a\u8bf4\u660e\u6587\u4ef6\uff0c\u544a\u8bc9\u4ee3\u7406\u8be5\u600e\u4e48\u505a\u3002

## \u52a0\u8f7d {#load}
\u542f\u52a8\u65f6\u53ea\u8bfb\u540d\u5b57\u548c\u7b80\u4ecb\uff0c\u9700\u8981\u65f6\u624d\u8bfb\u5168\u6587\u3002
"""


def lcg(seed):
    state = [seed & 0xFFFFFFFF]

    def nxt():
        state[0] = (1103515245 * state[0] + 12345) & 0x7FFFFFFF
        return state[0] / float(0x7FFFFFFF)
    return nxt


def synth_take(path, words, rate=16000, wps=2.6, pauses=None):
    """Write a fake 'speech' take: noise bursts per word, real silences at punctuation.
    Returns the true (start, end) of every word inside the file."""
    rnd = lcg(len(words) * 7919 + 17)
    samples = array.array("h")
    truth = []
    t = 0.18
    samples.extend(array.array("h", [0]) * int(t * rate))
    unit = 1.0 / wps / 1.6
    for w in words:
        d = max(0.12, unit * w["w"])
        n = int(d * rate)
        for k in range(n):
            env = math.sin(math.pi * k / n) ** 0.5
            samples.append(int((rnd() * 2 - 1) * 9000 * env))
        truth.append((t, t + d))
        t += d
        p = {"sentence": 0.42, "clause": 0.24}.get(w["brk"], 0.035) + w.get("pause", 0.0)
        samples.extend(array.array("h", [0]) * int(p * rate))
        t += p
    samples.extend(array.array("h", [0]) * int(0.2 * rate))
    write_wav(path, rate, samples)
    return truth


def run_cli(argv):
    try:
        return main(argv)
    except SystemExit as exc:
        return exc.code or 0


def cmd_selftest(args):
    work = tempfile.mkdtemp(prefix="explainer-selftest-")
    failures = []

    def check(cond, label):
        print("%s  %s" % ("ok  " if cond else "FAIL", label))
        if not cond:
            failures.append(label)

    def quiet(argv):
        saved = sys.stdout
        sys.stdout = open(os.devnull, "w")
        try:
            return run_cli(argv)
        finally:
            sys.stdout.close()
            sys.stdout = saved

    try:
        p = lambda *xs: os.path.join(work, *xs)
        write_text(p("script.md"), SELFTEST_SCRIPT)
        rc = quiet(["plan", p("script.md"), "--out", p("script.json"), "--tts-dir", p("vo")])
        check(os.path.exists(p("script.json")) and os.path.exists(p("vo", "how.txt")), "plan writes script.json and TTS text")
        check(rc == 1, "plan fails a script shorter than 45 s")
        plan = read_json(p("script.json"))
        check([c["id"] for c in plan["chapters"]] == ["problem", "how", "numbers"], "chapter ids come from {#id}")
        sql = [w for w in plan["chapters"][2]["words"] if w["show"] == "SQL"]
        check(bool(sql) and sql[0]["say"] == ["sequel"], "[[shown|spoken]] keeps the caption text and the spoken form")
        check("sequel" in open(p("vo", "numbers.txt")).read() and "[[" not in open(p("vo", "numbers.txt")).read(), "TTS text uses the spoken form")
        check(any(w["pause"] == 0.4 for w in plan["chapters"][1]["words"]), "[pause 0.4] adds a pause")

        # Takes with known word times -> join -> estimate against audio.
        truth = []
        os.makedirs(p("vo"), exist_ok=True)
        for ch in plan["chapters"]:
            truth.append(synth_take(p("vo", "%s.wav" % ch["id"]), ch["words"]))
        check(quiet(["vo-join", p("script.json"), "--dir", p("vo"), "--out", p("vo", "voiceover.wav")]) == 0, "vo-join concatenates takes")
        takes = read_json(p("vo", "takes.json"))
        check(len(takes["takes"]) == 3 and takes["takes"][1]["offset"] > takes["takes"][0]["duration"], "takes.json records chapter offsets")
        check(quiet(["estimate", p("script.json"), "--audio", p("vo", "voiceover.wav"), "--takes", p("vo", "takes.json"),
                     "--offset", "0.6", "--out", p("timing-est.json")]) == 0, "estimate --audio runs")
        est = read_json(p("timing-est.json"))
        errs = []
        k = 0
        for ci, ch in enumerate(plan["chapters"]):
            t = takes["takes"][ci]
            trim0 = t["speechStart"] - t["offset"]
            for wi, w in enumerate(ch["words"]):
                if w["brk"] == "sentence":
                    true_end = truth[ci][wi][1] - (truth[ci][0][0] - trim0) + t["offset"] + 0.6
                    errs.append(abs(est["words"][k]["end"] - true_end))
                k += 1
        check(errs and max(errs) < 0.12, "sentence ends land within 120 ms of the real pauses (worst %d ms)" % (max(errs) * 1000 if errs else -1))

        # Transcript alignment: PopNow task JSON with a misheard word, a number read out and a dropped word.
        stt_words = []
        flat = [w for ch in plan["chapters"] for w in ch["words"]]
        for w, (s, e) in zip(flat, [(x["start"] - 0.6, x["end"] - 0.6) for x in est["words"]]):
            text = w["show"].strip(".,;:!?")
            if text == "64%":
                stt_words.append({"text": "sixty", "start": s, "end": (s + e) / 2, "type": "word"})
                stt_words.append({"text": "four", "start": (s + e) / 2, "end": e - 0.05, "type": "word"})
                stt_words.append({"text": "percent", "start": e - 0.05, "end": e, "type": "word"})
                continue
            if text == "Somebody's":
                text = "Somebodies"
            if text == "always":
                continue
            if text == "SQL":
                text = "sequel"
            stt_words.append({"text": text, "start": s, "end": e, "type": "word"})
            stt_words.append({"text": " ", "start": e, "end": e, "type": "spacing"})
        write_json(p("stt.json"), {"taskId": "t1", "state": "succeeded", "output": {"text": "...", "transcript": {"language": "en", "words": stt_words}}})
        check(quiet(["align", p("script.json"), p("stt.json"), "--offset", "0.6", "--out", p("timing.json")]) == 0, "align reads PopNow task JSON")
        tim = read_json(p("timing.json"))
        check(tim["matchRate"] >= 0.85, "alignment match rate %.0f%%" % (tim["matchRate"] * 100))
        worst = max(abs(a["start"] - b["start"]) for a, b in zip(tim["words"], est["words"]) if a["text"].strip(".,") not in ("always", "64%", "Somebody's"))
        check(worst < 0.02, "matched words keep transcript times (worst %d ms)" % (worst * 1000))
        alw = [w for w in tim["words"] if w["text"] == "always"][0]
        prev = tim["words"][alw["i"] - 1]
        nxt = tim["words"][alw["i"] + 1]
        check(prev["end"] <= alw["start"] + 0.001 and alw["end"] <= nxt["start"] + 0.001, "a word the transcript dropped is fitted between its neighbours")
        write_json(p("flat.json"), [{"id": "w%d" % i, "text": w["text"], "start": w["start"], "end": w["end"]} for i, w in enumerate(stt_words) if w["type"] == "word"])
        check(quiet(["align", p("script.json"), p("flat.json"), "--out", p("timing-flat.json")]) == 0, "align reads a flat word list")

        # Captions.
        check(quiet(["captions", p("timing.json"), "--out-dir", work]) == 0, "captions writes vtt, srt and json")
        cues = parse_vtt(open(p("captions.vtt")).read())
        check(len(cues) >= 4, "captions produce %d cues" % len(cues))
        check(all(len(l) <= 42 for c in cues for l in c["lines"]) and all(len(c["lines"]) <= 2 for c in cues), "caption lines fit 2 x 42")
        check(all(cues[i]["end"] <= cues[i + 1]["start"] for i in range(len(cues) - 1)), "cues never overlap")
        srt = open(p("captions.srt")).read()
        check("-->" in srt and "," in srt.split("\n")[1], "SRT uses comma decimals")
        check(abs(parse_clock("00:01:02.345") - 62.345) < 1e-9, "clock parser")
        check(not any(norm(c["lines"][-1].split()[-1]) in ("the", "a", "of") for c in cues if c["lines"]), "no cue ends on a weak word")

        # Storyboard beats and timing.js.
        board = {"title": "Selftest", "style": "data-story", "canvas": {"width": 1920, "height": 1080},
                 "beats": [
                     {"id": "b1", "chapter": "problem", "component": "title-card", "anchor": "@start"},
                     {"id": "b2", "chapter": "problem", "component": "callout", "anchor": "Somebody's change"},
                     {"id": "b3", "chapter": "how", "component": "bullet-build", "anchor": "@start", "marks": ["every edit", "its author", "two versions"]},
                     {"id": "b4", "chapter": "numbers", "component": "bar-chart", "anchor": "@start", "marks": ["64%", "exports"], "onScreen": ["64%", "20%"]},
                     {"id": "b5", "chapter": "numbers", "component": "end-card", "anchor": "@end", "onScreen": ["Source: internal test, 2026"]}]}
        write_json(p("storyboard.json"), board)
        check(quiet(["beats", p("storyboard.json"), p("timing.json"), "--out", p("timing.js")]) == 0, "beats resolves anchors and marks")
        js = open(p("timing.js")).read()
        payload = json.loads(re.search(r"=\s*(\{.*\});", js, re.S).group(1))
        check([b["id"] for b in payload["beats"]] == ["b1", "b2", "b3", "b4", "b5"] and len(payload["beats"][2]["marks"]) == 3, "timing.js lists beats with marks")
        check(all(payload["beats"][i]["start"] <= payload["beats"][i + 1]["start"] for i in range(4)), "beats are in order")
        board_bad = json.loads(json.dumps(board))
        board_bad["beats"][1]["anchor"] = "words that are not there"
        write_json(p("storyboard-bad.json"), board_bad)
        check(quiet(["beats", p("storyboard-bad.json"), p("timing.json"), "--out", p("bad.js")]) == 1, "a missing anchor phrase fails loudly")

        # Ducking envelope.
        pts = duck_points(tim)
        check(pts[0]["t"] == 0 and all(pts[i]["t"] < pts[i + 1]["t"] for i in range(len(pts) - 1)), "ducking points rise monotonically")
        speech_mid = (tim["words"][0]["start"] + tim["words"][0]["end"]) / 2
        level = [q["v"] for q in pts if q["t"] <= speech_mid][-1]
        check(level == 0.18, "music is ducked while the voice speaks")

        # Contact sheet.
        check(quiet(["contact-sheet", p("storyboard.json"), "--timing", p("timing.json"), "--out", p("storyboard.html")]) == 0, "contact sheet renders")
        sheet = open(p("storyboard.html")).read()
        check(sheet.count("<article>") == 5 and "approve" in sheet, "contact sheet has one card per beat and an approval prompt")

        # QA: good set passes; bad sets fail on the right check.
        write_json(p("sources.json"), {"claims": [
            {"id": "c1", "text": "64% of lost edits came from copy-paste", "values": ["64%"], "status": "user-provided",
             "source": {"title": "Internal test log", "provider": "the user", "date": "2026-10"}},
            {"id": "c2", "text": "exports were the next 20%", "values": ["20%", "2026"], "status": "user-provided",
             "source": {"title": "Internal test log", "provider": "the user"}}]})
        write_text(p("loud-ok.log"), "[Parsed_ebur128_0] Summary:\n\n  Integrated loudness:\n    I:         -16.3 LUFS\n  True peak:\n    Peak:       -1.8 dBFS\n")
        write_text(p("loud-bad.log"), "[Parsed_ebur128_0] Summary:\n\n  Integrated loudness:\n    I:         -22.4 LUFS\n  True peak:\n    Peak:       -0.2 dBFS\n"
                   "[silencedetect] silence_start: 10.0\n[silencedetect] silence_end: 13.5 | silence_duration: 3.5\n")
        base = ["qa", "--timing", p("timing.json"), "--captions", p("captions.vtt"), "--beats", p("timing.js"),
                "--storyboard", p("storyboard.json"), "--sources", p("sources.json")]
        # The fixture narration is short, so allow the length check to be the only expected failure.
        rc = quiet(base + ["--loudness-log", p("loud-ok.log"), "--out", p("qa.json")])
        rows = read_json(p("qa.json"))["checks"]
        fails = [r["check"] for r in rows if r["level"] == "FAIL"]
        check(fails == ["length"], "QA passes the good fixture apart from its short length (failed: %s)" % (", ".join(fails) or "none"))
        shifted = [dict(c, start=c["start"] + 0.3, end=c["end"] + 0.3) for c in read_json(p("captions.json"))["cues"]]
        write_text(p("late.vtt"), vtt_text(shifted))
        quiet(["qa", "--timing", p("timing.json"), "--captions", p("late.vtt"), "--out", p("qa-late.json")])
        check(any(r["check"] == "caption-sync" and r["level"] == "FAIL" for r in read_json(p("qa-late.json"))["checks"]), "captions 300 ms late fail caption-sync")
        quiet(["qa", "--timing", p("timing.json"), "--loudness-log", p("loud-bad.log"), "--out", p("qa-loud.json")])
        loud_rows = {r["check"]: r["level"] for r in read_json(p("qa-loud.json"))["checks"]}
        check(loud_rows.get("loudness") == "FAIL" and loud_rows.get("true-peak") == "FAIL" and loud_rows.get("dead-air") == "FAIL", "quiet, clipping or silent mixes fail")
        src_bad = read_json(p("sources.json"))
        src_bad["claims"][0]["status"] = "unverified"
        src_bad["claims"][1]["values"] = []
        write_json(p("sources-bad.json"), src_bad)
        quiet(base[:-2] + ["--sources", p("sources-bad.json"), "--out", p("qa-facts.json")])
        fact_rows = [r for r in read_json(p("qa-facts.json"))["checks"] if r["level"] == "FAIL"]
        check(any(r["check"] == "facts" for r in fact_rows) and any(r["check"] == "numbers" and "20" in r["message"] for r in fact_rows),
              "unverified claims and unbacked numbers fail")
        long_board = json.loads(json.dumps(board))
        long_board["beats"] = [long_board["beats"][0], long_board["beats"][4]]
        write_json(p("storyboard-long.json"), long_board)
        quiet(["qa", "--timing", p("timing.json"), "--storyboard", p("storyboard-long.json"), "--out", p("qa-vis.json")])
        check(any(r["check"] == "visual-pace" and r["level"] == "FAIL" for r in read_json(p("qa-vis.json"))["checks"]), "a long static stretch fails visual-pace")

        # HTML checks on a tiny composition.
        page = ('<!doctype html><html><head><style>:root[data-style="data-story"],[data-style="data-story"]{--cap-ink:#ffffff;--cap-bg:#111111}'
                '.x-cap-line{font-size:calc(var(--u) * 4.2)}.x-small{font-size:calc(var(--u) * 2.8)}</style></head>'
                '<body><div id="root" data-style="data-story" data-duration="%.3f"></div>'
                '<script type="text/vtt" id="captions-vtt">\n%s\n</script><script>window.__duration=1;</script></body></html>'
                % (payload["duration"], open(p("captions.vtt")).read().strip()))
        write_text(p("index.html"), page)
        quiet(["qa", "--timing", p("timing.json"), "--captions", p("captions.vtt"), "--beats", p("timing.js"), "--html", p("index.html"), "--out", p("qa-html.json")])
        hrows = {r["check"]: r["level"] for r in read_json(p("qa-html.json"))["checks"]}
        check(hrows.get("captions-inline") == "PASS" and hrows.get("offline") == "PASS" and hrows.get("caption-contrast") == "PASS"
              and hrows.get("determinism") == "PASS", "HTML checks pass on a clean page")
        write_text(p("index-bad.html"), page.replace("window.__duration=1;", "Math.random();").replace("--cap-bg:#111111", "--cap-bg:#dddddd")
                   .replace("<head>", '<head><script src="https://cdn.example.com/x.js"></script>'))
        quiet(["qa", "--timing", p("timing.json"), "--html", p("index-bad.html"), "--out", p("qa-html-bad.json")])
        brows = {r["check"]: r["level"] for r in read_json(p("qa-html-bad.json"))["checks"]}
        check(brows.get("offline") == "FAIL" and brows.get("determinism") == "FAIL" and brows.get("caption-contrast") == "FAIL",
              "remote scripts, randomness and weak caption contrast fail")
        write_text(p("index-vtt.html"), page.replace("<!doctype html>", "<!doctype html>"))
        check(quiet(["inline-vtt", p("index-vtt.html"), p("late.vtt")]) == 0 and "00:00:0" in open(p("index-vtt.html")).read(), "inline-vtt replaces the inline block")

        # Character language path.
        write_text(p("zh.md"), SELFTEST_ZH)
        quiet(["plan", p("zh.md"), "--out", p("zh.json")])
        check(os.path.exists(p("zh.json")), "plan handles Chinese")
        zh = read_json(p("zh.json"))
        check(zh["chapters"][0]["units"] >= 20 and zh["rate"]["unit"] == "chars", "Chinese is counted in characters")
        check(zh["chapters"][0]["show"].startswith("\u6280\u80fd\u5c31\u662f\u4e00\u4e2a\u6587\u4ef6\u5939\u3002"), "Chinese text is rejoined without spaces")
        check(quiet(["estimate", p("zh.json"), "--out", p("zh-timing.json")]) == 0, "rate-based estimate works")
        check(quiet(["captions", p("zh-timing.json"), "--out-dir", work, "--name", "zh"]) == 0, "Chinese captions build")
        zc = parse_vtt(open(p("zh.vtt"), encoding="utf-8").read())
        check(all(len(l) <= 16 for c in zc for l in c["lines"]), "Chinese caption lines fit 16 characters")
        check(all(" " not in l for c in zc for l in c["lines"]), "Chinese captions carry no stray spaces")

        # Scaffold.
        if os.path.isdir(kit_dir()):
            check(quiet(["scaffold", p("project"), "--style", "whiteboard", "--canvas", "1080x1920"]) == 0, "scaffold copies the kit")
            idx = open(p("project", "index.html")).read()
            check('data-style="whiteboard"' in idx and 'data-width="1080"' in idx, "scaffold sets style and canvas")
    finally:
        if args.keep:
            print("Kept fixtures in %s" % work)
        else:
            shutil.rmtree(work, ignore_errors=True)
    print("\n%s: %d failure(s)." % ("SELFTEST FAILED" if failures else "Selftest passed", len(failures)))
    return 1 if failures else 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser():
    p = argparse.ArgumentParser(prog="explainer.py", description=__doc__.split("\n\n")[0],
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version", version="%(prog)s " + VERSION)
    sub = p.add_subparsers(dest="command", metavar="command")

    s = sub.add_parser("scaffold", help="Copy the starter composition and templates into a project folder")
    s.add_argument("dir")
    s.add_argument("--style", default="paper-collage", choices=("paper-collage", "whiteboard", "data-story"))
    s.add_argument("--canvas", default="1920x1080", help="WIDTHxHEIGHT, e.g. 1920x1080, 1080x1920, 1080x1080")
    s.add_argument("--lang", default="en")
    s.add_argument("--force", action="store_true")
    s.set_defaults(func=cmd_scaffold)

    s = sub.add_parser("plan", help="Parse script.md, estimate length per chapter, write script.json and TTS text")
    s.add_argument("script")
    s.add_argument("--out", default="script.json")
    s.add_argument("--lang")
    s.add_argument("--rate", type=float, help="Speaking rate per minute (words, or characters for ja/zh)")
    s.add_argument("--target", type=float, help="Target length in seconds")
    s.add_argument("--tts-dir", help="Write one <chapter>.txt per chapter for the voice model")
    s.add_argument("--measured", help="takes.json from vo-join, to report the real speaking rate")
    s.add_argument("--lite", action="store_true", help="Check against the 60 s lite length")
    s.set_defaults(func=cmd_plan)

    s = sub.add_parser("vo-join", help="Join per-chapter WAV takes with even gaps; writes voiceover.wav and takes.json")
    s.add_argument("script")
    s.add_argument("--dir", default="vo")
    s.add_argument("--out", default="vo/voiceover.wav")
    s.add_argument("--takes", help="Where to write takes.json (default: next to --out)")
    s.add_argument("--gap", type=float, default=DEFAULT_GAP)
    s.add_argument("--no-trim", dest="trim", action="store_false", help="Keep each take's own leading and trailing silence")
    s.set_defaults(func=cmd_vo_join)

    s = sub.add_parser("estimate", help="Time words without a transcript: against the voiceover audio, or by speaking rate")
    s.add_argument("script")
    s.add_argument("--audio", help="16-bit WAV voiceover (from vo-join)")
    s.add_argument("--takes", help="takes.json from vo-join (exact chapter windows)")
    s.add_argument("--offset", type=float, default=DEFAULT_OFFSET, help="Film time where the voiceover starts")
    s.add_argument("--gap", type=float, default=DEFAULT_GAP, help="Gap between chapters when timing by rate")
    s.add_argument("--out", default="timing.json")
    s.set_defaults(func=cmd_estimate)

    s = sub.add_parser("align", help="Align the script to a transcript with word timestamps")
    s.add_argument("script")
    s.add_argument("stt", help="popnow.py status <id> --json output, transcribe JSON, or Whisper JSON")
    s.add_argument("--offset", type=float, default=DEFAULT_OFFSET)
    s.add_argument("--takes", help="takes.json, to record the voiceover length")
    s.add_argument("--audio-duration", type=float)
    s.add_argument("--source", default="stt", help="Label stored in timing.json (stt or transcribe)")
    s.add_argument("--out", default="timing.json")
    s.set_defaults(func=cmd_align)

    s = sub.add_parser("captions", help="Build captions.vtt, captions.srt and captions.json from timing.json")
    s.add_argument("timing")
    s.add_argument("--out-dir", default=".")
    s.add_argument("--name", default="captions")
    s.add_argument("--max-chars", type=int, help="Characters per line (default per language)")
    s.add_argument("--max-lines", type=int, default=2)
    s.add_argument("--min-dur", type=float, default=1.0)
    s.add_argument("--max-dur", type=float, default=6.0)
    s.add_argument("--tail", type=float, default=0.25, help="Seconds a cue stays after its last word")
    s.set_defaults(func=cmd_captions)

    s = sub.add_parser("beats", help="Resolve storyboard anchors to times; write timing.js for the composition")
    s.add_argument("storyboard")
    s.add_argument("timing")
    s.add_argument("--out", default="assets/timing.js")
    s.add_argument("--json", help="Also write the payload as JSON")
    s.add_argument("--tail", type=float, default=DEFAULT_TAIL, help="End card hold after the last word")
    s.add_argument("--html", help="Patch data-duration on #root, #vo and #music in this file")
    s.set_defaults(func=cmd_beats)

    s = sub.add_parser("inline-vtt", help="Copy a .vtt file into the composition's inline caption block")
    s.add_argument("html")
    s.add_argument("vtt")
    s.add_argument("--id", default="captions-vtt")
    s.set_defaults(func=cmd_inline_vtt)

    s = sub.add_parser("duck", help="Volume envelope that dips the music under the narration")
    s.add_argument("timing")
    s.add_argument("--music-start", type=float, default=0.0, help="data-start of the music element")
    s.add_argument("--bed", type=float, default=0.5, help="Gain between phrases (0.5 is about -6 dB)")
    s.add_argument("--under", type=float, default=0.18, help="Gain under speech (0.18 is about -15 dB)")
    s.add_argument("--attack", type=float, default=0.25)
    s.add_argument("--release", type=float, default=0.6)
    s.add_argument("--merge", type=float, default=0.8, help="Join phrases closer than this many seconds")
    s.add_argument("--length", type=float, help="Clip length; drop points after it")
    s.add_argument("--out", help="Write the JSON to a file too")
    s.set_defaults(func=cmd_duck)

    s = sub.add_parser("contact-sheet", help="HTML storyboard of 6-9 frames for approval")
    s.add_argument("storyboard")
    s.add_argument("--timing")
    s.add_argument("--script", help="script.json, for narration excerpts before timing exists")
    s.add_argument("--snapshots", help="Folder of PNG frames (named by beat id or containing the time)")
    s.add_argument("--max", type=int, default=9)
    s.add_argument("--print-times", action="store_true", help="Print the frame times for `hyperframes snapshot --at`")
    s.add_argument("--out", default="storyboard.html")
    s.set_defaults(func=cmd_contact_sheet)

    s = sub.add_parser("qa", help="Check sync, captions, pace, dead air, visual pace, facts, HTML and loudness")
    s.add_argument("--timing", required=True)
    s.add_argument("--captions", help="captions.vtt or .srt")
    s.add_argument("--beats", help="timing.js from the beats command")
    s.add_argument("--storyboard", help="storyboard.json (beats are resolved if --beats is not given)")
    s.add_argument("--sources", help="sources.json")
    s.add_argument("--html", help="The composition's index.html")
    s.add_argument("--canvas-height", type=float, default=1080.0)
    s.add_argument("--media", help="Rendered MP4 for loudness, silence and length")
    s.add_argument("--loudness-log", help="Saved ffmpeg ebur128/silencedetect output instead of --media")
    s.add_argument("--lufs", type=float, default=-16.0)
    s.add_argument("--true-peak", type=float, default=-1.0)
    s.add_argument("--sync-tol", type=float, default=0.15)
    s.add_argument("--max-chars", type=int)
    s.add_argument("--max-lines", type=int, default=2)
    s.add_argument("--tail", type=float, default=DEFAULT_TAIL)
    s.add_argument("--lite", action="store_true")
    s.add_argument("--out", help="Write qa.json")
    s.set_defaults(func=cmd_qa)

    s = sub.add_parser("selftest", help="Run every command on synthetic data (no network, no credits)")
    s.add_argument("--keep", action="store_true", help="Keep the fixture folder")
    s.set_defaults(func=cmd_selftest)
    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return 2
    try:
        return args.func(args)
    except ToolError as exc:
        print("Error: %s" % exc, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
