/* Narrated explainer runtime (no dependencies besides GSAP at call time).
   - fit():          sizes #root to its data-width/height, sets --u (1% of height), scales to the window
   - parseVTT():     WebVTT text to cues [{ start, end, lines }]
   - captionText():  the inline <script type="text/vtt"> copy, plus the real file when served over http(s)
   - mountCaptions(): one element per cue, shown and hidden by tweens on the master timeline
   - beats():        storyboard beats from window.EXPLAINER_TIMING keyed by id
   Deterministic by design: no clocks, no randomness, everything placed on the paused timeline. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.XR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function parseClock(s) {
    var parts = String(s).trim().replace(",", ".").split(":");
    var sec = parseFloat(parts.pop());
    var min = parts.length ? parseInt(parts.pop(), 10) : 0;
    var hrs = parts.length ? parseInt(parts.pop(), 10) : 0;
    return hrs * 3600 + min * 60 + sec;
  }

  function parseVTT(text) {
    var cues = [];
    var blocks = String(text || "").replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/);
    blocks.forEach(function (block) {
      var lines = block.split("\n");
      var ti = -1;
      for (var i = 0; i < lines.length; i++) if (lines[i].indexOf("-->") >= 0) { ti = i; break; }
      if (ti < 0) return;
      if (/^(NOTE|STYLE|REGION)\b/.test(lines[0])) return;
      var pair = lines[ti].split("-->");
      var start = parseClock(pair[0]);
      var end = parseClock(pair[1].trim().split(/\s+/)[0]);
      var body = lines.slice(ti + 1).map(function (l) { return l.replace(/<[^>]+>/g, "").trim(); }).filter(Boolean);
      if (body.length && end > start) cues.push({ start: start, end: end, lines: body });
    });
    return cues;
  }

  function inlineVTT(id) {
    var el = typeof document !== "undefined" ? document.getElementById(id || "captions-vtt") : null;
    return el ? el.textContent : "";
  }

  // The inline copy renders on file:// and inside the renderer; over http(s) the real .vtt file
  // is fetched too, so an edited caption file shows up on reload. QA checks the two are identical.
  function captionText(opts) {
    opts = opts || {};
    var inline = inlineVTT(opts.inlineId);
    var canFetch = typeof location !== "undefined" && /^https?:$/.test(location.protocol) && typeof fetch === "function";
    var file = canFetch
      ? fetch(opts.url || "captions.vtt", { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; })
      : Promise.resolve(null);
    return { inline: inline, file: file };
  }

  function unit(rootEl) {
    var v = parseFloat(getComputedStyle(rootEl || document.querySelector(".x-root")).getPropertyValue("--u"));
    return isFinite(v) && v > 0 ? v : 10.8;
  }

  function fit(rootEl, opts) {
    opts = opts || {};
    var w = Number(rootEl.getAttribute("data-width")) || 1920;
    var h = Number(rootEl.getAttribute("data-height")) || 1080;
    rootEl.style.width = w + "px";
    rootEl.style.height = h + "px";
    rootEl.style.setProperty("--u", (h / 100) + "px");
    rootEl.setAttribute("data-aspect", w > h * 1.2 ? "wide" : (h > w * 1.2 ? "tall" : "square"));
    if (opts.scaleToWindow === false) return;
    var apply = function () {
      var s = Math.min(window.innerWidth / w, window.innerHeight / h);
      if (Math.abs(s - 1) < 0.001) { rootEl.style.transform = ""; return; }
      rootEl.style.transform = "translate(" + ((window.innerWidth - w * s) / 2) + "px," + ((window.innerHeight - h * s) / 2) + "px) scale(" + s + ")";
    };
    apply();
    window.addEventListener("resize", apply);
  }

  function splitWords(line) {
    return line.split(/(\s+)/);
  }

  // Captions live on their own child timeline so they can be rebuilt without touching scenes.
  function mountCaptions(tl, layer, cues, opts) {
    opts = opts || {};
    var gsap = window.gsap;
    var capTl = opts.timeline || gsap.timeline({ defaults: { immediateRender: false } });
    var u = unit();
    var fadeIn = opts.fadeIn != null ? opts.fadeIn : 0.08;
    var fadeOut = opts.fadeOut != null ? opts.fadeOut : 0.06;
    var words = opts.words || null; // [[text, start, end], ...] from EXPLAINER_TIMING, for the optional highlight
    layer.textContent = "";
    cues.forEach(function (c, i) {
      var el = document.createElement("div");
      el.className = "x-cap";
      el.setAttribute("data-cue", String(i + 1));
      var spans = [];
      c.lines.forEach(function (line) {
        var s = document.createElement("span");
        s.className = "x-cap-line";
        if (words && opts.highlight) {
          splitWords(line).forEach(function (piece) {
            if (/^\s+$/.test(piece)) { s.appendChild(document.createTextNode(piece)); return; }
            var w = document.createElement("span");
            w.className = "x-cap-w";
            w.textContent = piece;
            s.appendChild(w);
            spans.push(w);
          });
        } else {
          s.textContent = line;
        }
        el.appendChild(s);
      });
      layer.appendChild(el);
      gsap.set(el, { autoAlpha: 0 });
      capTl.fromTo(el, { autoAlpha: 0, y: u * 0.6 }, { autoAlpha: 1, y: 0, duration: fadeIn, ease: "power2.out", immediateRender: false }, c.start);
      capTl.fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: fadeOut, ease: "none", immediateRender: false }, Math.max(c.start + fadeIn, c.end - fadeOut));
      if (spans.length) {
        // Highlight word by word only when the cue's words line up one to one with the timing.
        var inCue = words.filter(function (w) { return w[1] >= c.start - 0.2 && w[1] < c.end; });
        if (inCue.length === spans.length) {
          spans.forEach(function (sp, k) {
            gsap.set(sp, { "--on": 0 });
            capTl.fromTo(sp, { "--on": 0 }, { "--on": 1, duration: Math.max(0.06, Math.min(0.25, inCue[k][2] - inCue[k][1])), ease: "none", immediateRender: false }, inCue[k][1]);
          });
        }
      }
    });
    if (!opts.timeline) tl.add(capTl, 0);
    return capTl;
  }

  function remountCaptions(capTl, layer, cues, opts) {
    capTl.clear();
    var o = Object.assign({}, opts || {}, { timeline: capTl });
    return mountCaptions(null, layer, cues, o);
  }

  function beats(timing) {
    var map = {};
    (timing && timing.beats || []).forEach(function (b) { map[b.id] = b; });
    return map;
  }

  // Times for a beat's marks with a fallback spacing, so a missing mark never collapses a build.
  function marks(beat, count, spacing) {
    var out = (beat.marks || []).slice(0, count);
    var last = out.length ? out[out.length - 1] : beat.start + 0.2;
    while (out.length < count) { last += spacing || 0.6; out.push(last); }
    return out;
  }

  function ready() {
    var fonts = typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve();
    return Promise.race([fonts, new Promise(function (r) { setTimeout(r, 3000); })]);
  }

  return { parseClock: parseClock, parseVTT: parseVTT, inlineVTT: inlineVTT, captionText: captionText, unit: unit, fit: fit,
           mountCaptions: mountCaptions, remountCaptions: remountCaptions, beats: beats, marks: marks, ready: ready };
});
