/* Narrated explainer scene components (GSAP builders).
   Each builder takes the master timeline, an element or selector and the times from
   window.EXPLAINER_TIMING (beat start and marks), and adds its tweens. Motion follows the
   style on #root[data-style]: paper-collage pieces are slapped down and settle at a stamped
   tilt, whiteboard strokes draw and text writes on, data-story elements rise and count.

   Rules kept by every builder:
   - Starting state is applied once with gsap.set and repeated in the tween's from object, so a
     renderer that seeks to any frame first still sees the right state.
   - Every animated property appears in both from and to. No randomness: tilts come from a
     seeded generator keyed by the element id. Finite repeats only.
   - Data marks (bars, lines, counters) never overshoot their true value. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.XC = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MOTION = {
    "paper-collage": { inEase: "back.out(1.5)", inDur: 0.5, outEase: "power2.in", outDur: 0.3, stagger: 0.08, travel: 7 },
    "whiteboard": { inEase: "power2.out", inDur: 0.55, outEase: "power2.inOut", outDur: 0.5, stagger: 0.18, travel: 0 },
    "data-story": { inEase: "power3.out", inDur: 0.45, outEase: "power2.in", outDur: 0.25, stagger: 0.07, travel: 2.4 }
  };

  function gs() { return window.gsap; }
  function $(sel, ctx) { return typeof sel === "string" ? (ctx || document).querySelector(sel) : sel; }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function rootEl() { return document.querySelector(".x-root"); }
  function style() { var r = rootEl(); return (r && r.getAttribute("data-style")) || "paper-collage"; }
  function motion() { return MOTION[style()] || MOTION["paper-collage"]; }
  function u() {
    var v = parseFloat(getComputedStyle(rootEl()).getPropertyValue("--u"));
    return isFinite(v) && v > 0 ? v : 10.8;
  }

  function hash(str) {
    var h = 2166136261;
    str = String(str || "x");
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function stamp(n, seed, amp) {
    var r = rng(seed), out = [];
    for (var i = 0; i < n; i++) out.push((r() * 2 - 1) * amp);
    return out;
  }
  function seedOf(el, extra) { return hash((el.id || el.className || "x") + (extra || "")); }

  // fromTo that never renders at build time, whatever the timeline's defaults are.
  function ft(tl, targets, from, to, at) {
    var t = {};
    for (var k in to) t[k] = to[k];
    t.immediateRender = false;
    return tl.fromTo(targets, from, t, at);
  }

  // Set the starting state now and tween from it on the timeline.
  function put(tl, targets, from, to, at) {
    gs().set(targets, from);
    ft(tl, targets, from, to, at);
  }

  /* ---------- Generic moves ---------- */

  function fadeUp(tl, el, at, opts) {
    opts = opts || {};
    var M = motion(), U = u();
    put(tl, el, { autoAlpha: 0, y: U * (opts.dist != null ? opts.dist : 2.4) },
      { autoAlpha: 1, y: 0, duration: opts.dur || M.inDur, ease: opts.ease || "power3.out", stagger: opts.stagger || 0 }, at);
  }

  function pop(tl, el, at, opts) {
    opts = opts || {};
    put(tl, el, { autoAlpha: 0, scale: opts.from != null ? opts.from : 0.4 },
      { autoAlpha: 1, scale: 1, duration: opts.dur || 0.4, ease: opts.ease || "back.out(1.8)" }, at);
  }

  // Paper piece slapped onto the board from a direction, settling at a stamped tilt.
  function drop(tl, el, at, opts) {
    opts = opts || {};
    var U = u(), M = motion();
    var tilt = opts.tilt != null ? opts.tilt : stamp(1, seedOf(el, "tilt"), opts.rot != null ? opts.rot : 3)[0];
    var dist = (opts.dist != null ? opts.dist : M.travel) * U;
    var dir = opts.from || "top";
    var from = { autoAlpha: 0, x: 0, y: 0, rotation: tilt + (opts.spin != null ? opts.spin : (tilt >= 0 ? 8 : -8)) };
    if (dir === "top") from.y = -dist;
    if (dir === "bottom") from.y = dist;
    if (dir === "left") from.x = -dist;
    if (dir === "right") from.x = dist;
    put(tl, el, from, { autoAlpha: 1, x: 0, y: 0, rotation: tilt, duration: opts.dur || M.inDur, ease: opts.ease || M.inEase }, at);
  }

  function peel(tl, el, at, opts) {
    opts = opts || {};
    var U = u();
    ft(tl, el, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -U * (opts.dist || 3), duration: opts.dur || 0.3, ease: "power2.in" }, at);
  }

  function writeOn(tl, el, at, dur) {
    put(tl, el, { autoAlpha: 1, clipPath: "inset(-30% 100% -30% -6%)" },
      { autoAlpha: 1, clipPath: "inset(-30% -6% -30% -6%)", duration: dur || 0.6, ease: "none" }, at);
  }

  function drawPath(tl, path, at, dur, ease) {
    var len = path.getTotalLength ? Math.ceil(path.getTotalLength()) + 2 : 1000;
    path.style.strokeDasharray = len + " " + len;
    put(tl, path, { strokeDashoffset: len, autoAlpha: 1 }, { strokeDashoffset: 0, autoAlpha: 1, duration: dur || 0.7, ease: ease || "power1.inOut" }, at);
  }

  function textDur(el) {
    return Math.max(0.25, Math.min(0.9, 0.035 * (el.textContent || "").length + 0.15));
  }

  /* ---------- Paper helpers (collage) ---------- */

  // Torn edges as a clip-path polygon. depth is in --u units; edges is any of "t", "r", "b", "l".
  function tear(el, opts) {
    opts = opts || {};
    var r = rng(opts.seed != null ? opts.seed : seedOf(el, "tear"));
    var h = Math.max(1, el.offsetHeight), w = Math.max(1, el.offsetWidth);
    var depth = (opts.depth != null ? opts.depth : 0.7) * u();
    var ay = depth / h * 100, ax = depth / w * 100;
    var edges = opts.edges || "tb";
    var teeth = opts.teeth || Math.max(8, Math.round(w / (u() * 2.2)));
    var side = Math.max(3, Math.round(h / (u() * 2.2)));
    var pts = [], i;
    for (i = 0; i <= teeth; i++) pts.push([i / teeth * 100, edges.indexOf("t") >= 0 ? r() * ay : 0]);
    for (i = 1; i < side; i++) pts.push([edges.indexOf("r") >= 0 ? 100 - r() * ax : 100, i / side * 100]);
    for (i = teeth; i >= 0; i--) pts.push([i / teeth * 100, edges.indexOf("b") >= 0 ? 100 - r() * ay : 100]);
    for (i = side - 1; i > 0; i--) pts.push([edges.indexOf("l") >= 0 ? r() * ax : 0, i / side * 100]);
    el.style.clipPath = "polygon(" + pts.map(function (p) { return p[0].toFixed(2) + "% " + p[1].toFixed(2) + "%"; }).join(",") + ")";
  }

  // Tear every [data-tear] face and tilt every [data-tilt] piece inside scope (collage only).
  function paper(scope) {
    if (style() !== "paper-collage") return;
    $$("[data-tear]", scope || document).forEach(function (el) {
      tear(el, { edges: el.getAttribute("data-tear") || "tb", depth: parseFloat(el.getAttribute("data-depth") || "0.7") });
    });
  }

  function handCircle(seed) {
    var r = rng(seed), pts = [], n = 16, a0 = -1.9;
    for (var i = 0; i <= n + 2; i++) {
      var a = a0 + (i / n) * Math.PI * 2;
      var rad = 44 + r() * 5 - (i > n ? 3 : 0);
      pts.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad * 0.94]);
    }
    var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var k = 1; k < pts.length - 1; k++) {
      var mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2;
      d += " Q" + pts[k][0].toFixed(1) + " " + pts[k][1].toFixed(1) + " " + mx.toFixed(1) + " " + my.toFixed(1);
    }
    return d;
  }

  /* ---------- Scene in / out ---------- */

  function scene(tl, el, tIn, tOut, opts) {
    el = $(el);
    opts = opts || {};
    var s = style(), M = motion(), U = u();
    if (tIn <= 0.02) {
      // The opening scene is on screen from the first frame: nothing to fade in.
      gs().set(el, { autoAlpha: 1 });
      if (tOut != null) ft(tl, el, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, { autoAlpha: 0, x: 0, y: -U * 5, rotation: -1.5, duration: M.outDur, ease: M.outEase }, tOut - M.outDur);
      return;
    }
    if (s === "whiteboard") {
      put(tl, el, { autoAlpha: 0, xPercent: 14 }, { autoAlpha: 1, xPercent: 0, duration: 0.55, ease: "power2.inOut" }, Math.max(0, tIn - 0.3));
      if (tOut != null) ft(tl, el, { autoAlpha: 1, xPercent: 0 }, { autoAlpha: 0, xPercent: -14, duration: 0.5, ease: "power2.in" }, tOut - 0.5);
    } else if (s === "data-story") {
      put(tl, el, { autoAlpha: 0, y: U * 1.6 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, tIn);
      if (tOut != null) ft(tl, el, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -U * 1.2, duration: M.outDur, ease: M.outEase }, tOut - M.outDur);
    } else {
      put(tl, el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: "none" }, tIn);
      if (tOut != null) {
        var dir = opts.exit || "up";
        var to = { autoAlpha: 0, x: 0, y: 0, rotation: 0, duration: M.outDur, ease: M.outEase };
        if (dir === "up") { to.y = -U * 5; to.rotation = -1.5; }
        if (dir === "left") { to.x = -U * 12; to.rotation = -2; }
        if (dir === "down") { to.y = U * 6; to.rotation = 1.5; }
        ft(tl, el, { autoAlpha: 1, x: 0, y: 0, rotation: 0 }, to, tOut - M.outDur);
      }
    }
  }

  /* ---------- Components ---------- */

  function title(tl, el, at) {
    el = $(el);
    var s = style(), M = motion(), U = u();
    var words = $$(".x-h1 .x-w", el), kicker = $(".x-kicker", el), sub = $(".x-sub", el);
    var rule = $(".x-rule", el), line = $(".x-underline path", el);
    var t = at + 0.1;
    if (kicker) {
      if (s === "whiteboard") writeOn(tl, kicker, at, textDur(kicker));
      else if (s === "paper-collage") drop(tl, kicker, at, { from: "left", rot: 2.5 });
      else fadeUp(tl, kicker, at);
      t = at + 0.3;
    }
    if (s === "paper-collage") {
      var tilt = stamp(words.length, seedOf(el, "title"), 3.4);
      words.forEach(function (w, i) { drop(tl, w, t + i * M.stagger, { tilt: tilt[i], from: "top", dist: 9 }); });
      if (line) drawPath(tl, line, t + 0.3 + words.length * M.stagger, 0.4);
    } else if (s === "whiteboard") {
      words.forEach(function (w, i) { writeOn(tl, w, t + i * 0.22, textDur(w)); });
      if (line) drawPath(tl, line, t + words.length * 0.22, 0.45);
    } else {
      words.forEach(function (w, i) { fadeUp(tl, w, t + i * M.stagger, { dist: 3 }); });
      if (rule) put(tl, rule, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.inOut" }, t + 0.2);
    }
    if (sub) fadeUp(tl, sub, t + 0.35 + words.length * M.stagger, { dist: 1.6 });
  }

  function bullets(tl, el, at, times) {
    el = $(el);
    var s = style(), M = motion(), U = u();
    var head = $(".x-h2", el), items = $$(".x-item", el);
    paper(el);
    if (head) {
      if (s === "whiteboard") writeOn(tl, head, at, textDur(head));
      else if (s === "paper-collage") drop(tl, head, at, { from: "top", rot: 1.5 });
      else fadeUp(tl, head, at);
    }
    var tilt = stamp(items.length, seedOf(el, "items"), 1.6);
    items.forEach(function (item, i) {
      var t = times && times[i] != null ? times[i] : at + 0.5 + i * 0.6;
      var mark = $(".x-mark", item), text = $(".x-text", item);
      if (s === "paper-collage") {
        drop(tl, item, t, { from: i % 2 ? "right" : "left", tilt: tilt[i], dist: 10 });
        if (mark) pop(tl, mark, t + 0.18, { from: 0.2 });
      } else if (s === "whiteboard") {
        if (mark) {
          if (!mark.querySelector("svg")) {
            mark.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + handCircle(seedOf(item, "c")) + '"/></svg>');
          }
          put(tl, mark, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t);
          drawPath(tl, mark.querySelector("path"), t, 0.35, "power1.inOut");
        }
        if (text) writeOn(tl, text, t + 0.2, textDur(text));
      } else {
        fadeUp(tl, item, t, { dist: 1.8 });
      }
    });
  }

  function quote(tl, el, at, opts) {
    el = $(el);
    opts = opts || {};
    var s = style();
    var card = $(".x-quote", el) || el, qmark = $(".x-qmark", el), cite = $(".x-cite", el);
    paper(el);
    if (s === "paper-collage") drop(tl, card, at, { from: "bottom", rot: 1.2, dist: 12 });
    else if (s === "whiteboard") writeOn(tl, $(".x-q", el), at, 1.2);
    else fadeUp(tl, card, at);
    if (qmark) pop(tl, qmark, at + 0.25, { from: 0.3 });
    if (cite) fadeUp(tl, cite, at + (opts.citeAt != null ? opts.citeAt - at : 0.9), { dist: 1 });
    // Read-along: words brighten as they are spoken (needs .x-qw spans and timing words).
    var qws = $$(".x-qw", el);
    if (qws.length && opts.words) {
      var spoken = opts.words.filter(function (w) { return w[1] >= at - 0.1 && (opts.until == null || w[1] < opts.until); });
      qws.forEach(function (q, k) {
        var t = spoken[k] ? spoken[k][1] : at + 0.3 + k * 0.3;
        put(tl, q, { opacity: 0.35 }, { opacity: 1, duration: 0.18, ease: "none" }, t);
      });
    }
  }

  function compare(tl, el, at, times) {
    el = $(el);
    var s = style();
    var a = $(".x-side.x-a", el), b = $(".x-side.x-b", el), vs = $(".x-vs", el);
    var strike = $(".x-strike", el), win = $(".x-win", el);
    var ta = times && times[0] != null ? times[0] : at + 0.1;
    var tb = times && times[1] != null ? times[1] : ta + 1.4;
    var tv = times && times[2] != null ? times[2] : tb + 1.4;
    paper(el);
    if (s === "paper-collage") {
      drop(tl, a, ta, { from: "left", rot: 2, dist: 14 });
      drop(tl, b, tb, { from: "right", rot: 2, dist: 14 });
    } else {
      fadeUp(tl, a, ta);
      fadeUp(tl, b, tb);
    }
    if (vs) pop(tl, vs, ta + 0.3);
    if (strike) put(tl, strike, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, autoAlpha: 1, duration: 0.35, ease: "power2.out" }, tv);
    if (win) pop(tl, win, tv + 0.15, { from: 0.2 });
  }

  function timeline(tl, el, at, times) {
    el = $(el);
    var s = style();
    var track = $(".x-track", el), prog = $(".x-progress", el), nodes = $$(".x-node", el);
    if (track) put(tl, track, { autoAlpha: 0, scaleX: 0.6 }, { autoAlpha: 1, scaleX: 1, duration: 0.45, ease: "power2.out" }, at);
    var prev = 0;
    nodes.forEach(function (n, i) {
      var t = times && times[i] != null ? times[i] : at + 0.6 + i * 1.2;
      var frac = parseFloat(getComputedStyle(n).getPropertyValue("--at")) || 0;
      if (prog) {
        if (i === 0) gs().set(prog, { scaleX: 0 });
        ft(tl, prog, { scaleX: prev }, { scaleX: frac, duration: 0.5, ease: "power2.inOut" }, Math.max(at, t - 0.35));
      }
      prev = frac;
      var dot = $(".x-dot", n), labels = $$(".x-when, .x-what", n);
      if (dot) pop(tl, dot, t, { from: 0.3 });
      if (labels.length) {
        if (s === "whiteboard") labels.forEach(function (l, k) { writeOn(tl, l, t + 0.12 + k * 0.25, textDur(l)); });
        else fadeUp(tl, labels, t + 0.12, { dist: 1.4, stagger: 0.1 });
      }
    });
  }

  function callout(tl, el, at) {
    el = $(el);
    var ring = $(".x-ring", el), arrow = $(".x-arrow path", el), label = $(".x-label", el);
    if (ring) put(tl, ring, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power3.out" }, at);
    if (arrow) drawPath(tl, arrow, at + 0.15, 0.4);
    if (label) {
      if (style() === "whiteboard") writeOn(tl, label, at + 0.45, textDur(label));
      else drop(tl, label, at + 0.4, { from: "right", rot: 2, dist: 3 });
    }
  }

  function pins(tl, el, at, times) {
    el = $(el);
    var U = u();
    $$(".x-pin", el).forEach(function (p, i) {
      var t = times && times[i] != null ? times[i] : at + 0.4 + i * 0.7;
      put(tl, p, { autoAlpha: 0, y: -U * 6 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "back.out(2)" }, t);
      var ring = $(".x-pin-ring", p), label = $(".x-pin-label", p);
      if (ring) put(tl, ring, { autoAlpha: 1, scale: 0.3 }, { autoAlpha: 0, scale: 1.8, duration: 0.8, ease: "power2.out" }, t + 0.35);
      if (label) fadeUp(tl, label, t + 0.3, { dist: 1 });
    });
  }

  function formatter(el) {
    var lang = document.documentElement.lang || "en";
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var nf = new Intl.NumberFormat(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    return function (v) { return pre + nf.format(v) + suf; };
  }

  // Counter: a plain object tween that writes the formatted value. Seek with suppressEvents=false.
  function countUp(tl, el, at, opts) {
    el = $(el);
    opts = opts || {};
    var to = parseFloat(el.getAttribute("data-to")), from = parseFloat(el.getAttribute("data-from") || "0");
    var fmt = formatter(el), obj = { v: from };
    el.textContent = fmt(from);
    ft(tl, obj, { v: from }, {
      v: to, duration: opts.dur || 1.1, ease: "power2.out",
      onUpdate: function () { el.textContent = fmt(obj.v); }
    }, at);
  }

  function bars(tl, el, at, opts) {
    el = $(el);
    if (!el.classList.contains("x-bars")) el = $(".x-bars", el) || el;
    opts = opts || {};
    var rows = $$(".x-bar-row", el), max = parseFloat(el.getAttribute("data-max"));
    if (!isFinite(max)) max = Math.max.apply(null, rows.map(function (r) { return parseFloat(r.querySelector(".x-bar-val").getAttribute("data-to")) || 0; }));
    var src = $(".x-source", el);
    var head = el.closest(".x-scene") && el.closest(".x-scene").querySelector(".x-h2");
    if (head) fadeUp(tl, head, at - 0.1);
    rows.forEach(function (r, i) {
      var t = opts.times && opts.times[i] != null ? opts.times[i] : at + 0.2 + i * 0.16;
      var bar = $(".x-bar", r), val = $(".x-bar-val", r), lab = $(".x-bar-label", r);
      var v = (parseFloat(val.getAttribute("data-to")) || 0) / (max || 1);
      if (lab) fadeUp(tl, lab, t - 0.1, { dist: 0.8, dur: 0.3 });
      put(tl, bar, { scaleX: 0 }, { scaleX: Math.max(0, Math.min(1, v)), duration: 0.8, ease: "power3.out" }, t);
      countUp(tl, val, t, { dur: 0.8 });
    });
    if (src) fadeUp(tl, src, at + 0.4, { dist: 0.6 });
  }

  // Line chart drawn from data-series='[[x,y],...]' into an SVG with a fixed viewBox.
  function line(tl, el, at, opts) {
    el = $(el);
    if (!el.hasAttribute("data-series")) el = $("[data-series]", el) || el;
    opts = opts || {};
    var head = el.closest(".x-scene") && el.closest(".x-scene").querySelector(".x-h2");
    if (head) fadeUp(tl, head, at - 0.1);
    var data = JSON.parse(el.getAttribute("data-series") || "[]");
    var context = JSON.parse(el.getAttribute("data-context") || "[]");
    var W = 1000, H = Math.round(W * (parseFloat(el.getAttribute("data-aspect")) || 0.5));
    var padL = 70, padR = 150, padT = 30, padB = 60;
    var xs = data.map(function (p) { return p[0]; }).concat(context.map(function (p) { return p[0]; }));
    var ys = data.map(function (p) { return p[1]; }).concat(context.map(function (p) { return p[1]; }));
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = el.hasAttribute("data-y-min") ? parseFloat(el.getAttribute("data-y-min")) : Math.min(0, Math.min.apply(null, ys));
    var y1 = el.hasAttribute("data-y-max") ? parseFloat(el.getAttribute("data-y-max")) : Math.max.apply(null, ys) * 1.1;
    var X = function (v) { return padL + (v - x0) / ((x1 - x0) || 1) * (W - padL - padR); };
    var Y = function (v) { return H - padB - (v - y0) / ((y1 - y0) || 1) * (H - padT - padB); };
    var fmt = formatter(el);
    var ticks = parseInt(el.getAttribute("data-ticks") || "4", 10), svg = [], i;
    for (i = 0; i <= ticks; i++) {
      var yv = y0 + (y1 - y0) * i / ticks;
      svg.push('<line class="x-grid" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '"/>');
      svg.push('<text class="x-axis-label" x="' + (padL - 12) + '" y="' + (Y(yv) + 9).toFixed(1) + '" text-anchor="end">' + fmt(yv) + "</text>");
    }
    svg.push('<text class="x-axis-label" x="' + X(x0) + '" y="' + (H - 18) + '" text-anchor="start">' + x0 + "</text>");
    svg.push('<text class="x-axis-label" x="' + X(x1) + '" y="' + (H - 18) + '" text-anchor="end">' + x1 + "</text>");
    var path = function (pts) { return pts.map(function (p, k) { return (k ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" "); };
    if (context.length) svg.push('<path class="x-series is-context" d="' + path(context) + '"/>');
    var last = data[data.length - 1];
    svg.push('<path class="x-area" d="' + path(data) + " L" + X(last[0]).toFixed(1) + " " + Y(y0).toFixed(1) + " L" + X(data[0][0]).toFixed(1) + " " + Y(y0).toFixed(1) + ' Z"/>');
    svg.push('<path class="x-series" d="' + path(data) + '"/>');
    var note = JSON.parse(el.getAttribute("data-note") || "null");
    if (note) {
      var np = data.filter(function (p) { return p[0] === note[0]; })[0];
      if (np) {
        svg.push('<g class="x-note-g"><line class="x-note-line" x1="' + X(np[0]).toFixed(1) + '" x2="' + X(np[0]).toFixed(1) + '" y1="' + (Y(np[1]) - 14).toFixed(1) + '" y2="' + padT + '"/>' +
          '<text class="x-note" x="' + (X(np[0]) + 10).toFixed(1) + '" y="' + (padT + 22) + '">' + String(note[1]).replace(/[<&]/g, "") + "</text></g>");
      }
    }
    svg.push('<circle class="x-end-dot" cx="' + X(last[0]).toFixed(1) + '" cy="' + Y(last[1]).toFixed(1) + '" r="13"/>');
    svg.push('<text class="x-end-label" x="' + (X(last[0]) + 22).toFixed(1) + '" y="' + (Y(last[1]) + 14).toFixed(1) + '">' + fmt(last[1]) + "</text>");
    var plot = $(".x-plot", el);
    plot.setAttribute("viewBox", "0 0 " + W + " " + H);
    plot.innerHTML = svg.join("");
    var grid = $$(".x-grid, .x-axis-label", plot);
    put(tl, grid, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "none", stagger: 0.02 }, at);
    var ctx = $(".x-series.is-context", plot);
    if (ctx) drawPath(tl, ctx, at + 0.2, 0.9, "power1.inOut");
    var main = plot.querySelector(".x-series:not(.is-context)");
    var dur = opts.dur || 1.6;
    drawPath(tl, main, at + 0.3, dur, "power1.inOut");
    put(tl, $(".x-area", plot), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "none" }, at + 0.3 + dur * 0.6);
    pop(tl, $(".x-end-dot", plot), at + 0.3 + dur, { from: 0.2, ease: "power3.out" });
    fadeUp(tl, $(".x-end-label", plot), at + 0.4 + dur, { dist: 0.6, dur: 0.3 });
    var ng = $(".x-note-g", plot);
    if (ng) fadeUp(tl, ng, opts.noteAt != null ? opts.noteAt : at + 0.5 + dur, { dist: 0.6 });
    var src = $(".x-source", el);
    if (src) fadeUp(tl, src, at + 0.5, { dist: 0.6 });
  }

  function endCard(tl, el, at) {
    el = $(el);
    var s = style();
    var take = $(".x-takeaway", el), list = $(".x-sources", el), items = $$(".x-sources li", el), cta = $(".x-cta", el);
    paper(el);
    if (take) {
      if (s === "whiteboard") writeOn(tl, take, at, 0.8);
      else if (s === "paper-collage") drop(tl, take, at, { from: "top", rot: 1.2 });
      else fadeUp(tl, take, at);
    }
    if (list) {
      if (s === "paper-collage") drop(tl, list, at + 0.35, { from: "bottom", rot: 1, dist: 8 });
      else fadeUp(tl, list, at + 0.35, { dist: 1.2 });
    }
    if (items.length) fadeUp(tl, items, at + 0.5, { dist: 0.8, stagger: 0.12, dur: 0.3 });
    if (cta) fadeUp(tl, cta, at + 0.9, { dist: 1 });
  }

  /* ---------- Storyboard dispatcher ---------- */

  function count(el, sel) { return el.querySelectorAll(sel).length; }
  function marksOr(b, n, spacing) {
    var out = (b.marks || []).slice(0, n), last = out.length ? out[out.length - 1] : b.start + 0.2;
    while (out.length < n) { last += spacing || 0.6; out.push(last); }
    return out;
  }

  var BUILDERS = {
    "title-card": function (tl, el, b) { title(tl, el, b.start); },
    "bullet-build": function (tl, el, b) { bullets(tl, el, b.start, marksOr(b, count(el, ".x-item"))); },
    "quote": function (tl, el, b, T) { quote(tl, el, b.start, { words: T.words, until: b.end }); },
    "comparison": function (tl, el, b) { compare(tl, el, b.start, marksOr(b, 3, 1.4)); },
    "timeline": function (tl, el, b) { timeline(tl, el, b.start, marksOr(b, count(el, ".x-node"), 1.2)); },
    "callout": function (tl, el, b) { callout(tl, el, (b.marks && b.marks[0]) || b.start); },
    "map-pin": function (tl, el, b) { pins(tl, el, b.start, marksOr(b, count(el, ".x-pin"), 0.7)); },
    "bar-chart": function (tl, el, b) { bars(tl, el, b.start, { times: b.marks && b.marks.length ? marksOr(b, count(el, ".x-bar-row"), 0.16) : null }); },
    "line-chart": function (tl, el, b) { line(tl, el, b.start, { noteAt: b.marks && b.marks[0] }); },
    "stat": function (tl, el, b) { var n = el.querySelector(".x-num"); fadeUp(tl, el.querySelector(".x-stat-label"), b.start + 0.2); if (n) countUp(tl, n, (b.marks && b.marks[0]) || b.start); },
    "end-card": function (tl, el, b) { endCard(tl, el, b.start); }
  };

  // Show each scene for the span of its beats, then run the builder named by each beat's
  // component on the element whose id is the beat id. custom[beatId] or custom[component]
  // overrides a builder: function (tl, el, beat, timing).
  function auto(tl, T, custom) {
    custom = custom || {};
    var beats = T.beats || [], spans = {}, order = [];
    beats.forEach(function (b) {
      var sid = b.scene || b.id;
      if (!spans[sid]) { spans[sid] = { start: b.start, end: b.end }; order.push(sid); }
      else spans[sid].end = Math.max(spans[sid].end, b.end);
    });
    order.forEach(function (sid, i) {
      var el = document.getElementById(sid);
      if (el) scene(tl, el, spans[sid].start, i === order.length - 1 ? null : spans[sid].end);
    });
    window.__explainerErrors = [];
    beats.forEach(function (b) {
      var el = document.getElementById(b.id);
      if (!el) { window.__explainerErrors.push(b.id + ": no element with this id"); return; }
      var fn = custom[b.id] || custom[b.component] || BUILDERS[b.component];
      // One broken beat must not stop the rest of the film from building; the error is kept for review.
      try { if (fn) fn(tl, el, b, T); } catch (e) {
        window.__explainerErrors.push(b.id + ": " + (e && e.message));
        if (window.console) console.error("explainer beat " + b.id + " failed:", e);
      }
    });
  }

  return {
    MOTION: MOTION, style: style, stamp: stamp, rng: rng, hash: hash, put: put,
    fadeUp: fadeUp, pop: pop, drop: drop, peel: peel, writeOn: writeOn, drawPath: drawPath, tear: tear, paper: paper,
    handCircle: handCircle, scene: scene, title: title, bullets: bullets, quote: quote, compare: compare,
    timeline: timeline, callout: callout, pins: pins, countUp: countUp, bars: bars, line: line, endCard: endCard,
    BUILDERS: BUILDERS, auto: auto
  };
});
