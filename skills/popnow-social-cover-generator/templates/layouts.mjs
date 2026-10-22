// HTML for each layout system. Styling lives in covers.css; this file only decides structure.
// Every text element carries data-text="title|body|small" so the checker can find it, and the
// element that should grow or shrink to fill its box carries data-fit="minT,maxT" (in --t units).

export const LAYOUTS = {
  "editorial-serif": editorial,
  "bold-sans": bold,
  "split-photo": split,
  "sticker-collage": sticker,
  "minimal-mono": minimalMono,
  "data-callout": dataCallout,
  "device-showcase": device,
};

export const LAYOUT_NEEDS = {
  "editorial-serif": { image: "optional (plate)", copy: ["title"] },
  "bold-sans": { image: "optional (background or subject)", copy: ["title"] },
  "split-photo": { image: "background (half the canvas)", copy: ["title"] },
  "sticker-collage": { image: "subject cut-out (transparent PNG)", copy: ["title"] },
  "minimal-mono": { image: "optional (small thumbnail)", copy: ["title"] },
  "data-callout": { image: "none", copy: ["stat.value"] },
  "device-showcase": { image: "screens[] (your app screenshots)", copy: ["title"] },
};

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// *word* becomes emphasis, a newline becomes a preferred line break.
export function rich(s) {
  return esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\\n|\n/g, "<br>");
}

const bgStyle = (img) => (img ? ` style="background-image:url('${img.url}');${img.focus ? `--focus:${esc(img.focus)};` : ""}"` : "");
const brand = (ctx) => {
  const b = ctx.brand || {};
  if (b.logoUrl) return `<span class="brand"><img src="${b.logoUrl}" alt="${esc(b.name || "logo")}"></span>`;
  return b.name ? `<span class="brand" data-text="small">${esc(b.name)}</span>` : "";
};
const opt = (cond, html) => (cond ? html : "");

function editorial(c, ctx) {
  const img = ctx.images.plate;
  const plate = img
    ? `<figure class="ed-plate"><div class="mat"><div class="pic${img.contain ? " contain" : ""}"${bgStyle(img)}></div></div>${opt(c.caption, `<figcaption data-text="small">${esc(c.caption)}</figcaption>`)}</figure>`
    : ctx.placeholder.plate
      ? `<figure class="ed-plate"><div class="mat"><div class="pic ph"></div></div>${opt(c.caption, `<figcaption data-text="small">${esc(c.caption)}</figcaption>`)}</figure>`
      : "";
  return `<div class="safe ed${plate ? "" : " no-plate"}">
  <div class="ed-text">
    ${opt(c.kicker, `<div class="kicker" data-text="small">${esc(c.kicker)}</div>`)}
    <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="7,17">${rich(c.title)}</h1></div>
    ${opt(c.subtitle, `<p class="sub" data-text="body">${rich(c.subtitle)}</p>`)}
    <div class="foot">${brand(ctx) || "<span></span>"}${opt(c.cta, `<span class="cta" data-text="small">${esc(c.cta)}</span>`)}</div>
  </div>
  ${plate}
</div>`;
}

function bold(c, ctx) {
  const bg = ctx.images.background;
  const subj = ctx.images.subject;
  const layer = bg ? `<div class="bg-layer"${bgStyle(bg)}></div><div class="shade"></div>` : "";
  return `${layer}<div class="safe bold${subj ? " has-subject" : ""}">
  <div class="bold-text">
    ${opt(c.kicker, `<div class="sticker" data-text="small">${esc(c.kicker)}</div>`)}
    <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="8,30">${rich(c.title)}</h1></div>
    ${opt(c.subtitle, `<p class="sub" data-text="body">${rich(c.subtitle)}</p>`)}
    <div class="foot">${brand(ctx) || "<span></span>"}${opt(c.cta, `<span class="cta" data-text="small">${esc(c.cta)}</span>`)}</div>
  </div>
  ${opt(subj, `<div class="subject-cell"><img class="subject" src="${subj?.url}" alt=""></div>`)}
</div>`;
}

function split(c, ctx) {
  const bg = ctx.images.background;
  return `<div class="split-img${bg ? (bg.contain ? " contain" : "") : " ph"}"${bgStyle(bg)}></div>
<div class="split-panel">
  <div class="top">${brand(ctx) || "<span></span>"}</div>
  ${opt(c.kicker, `<div class="kicker" data-text="small">${esc(c.kicker)}</div>`)}
  <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="6,14">${rich(c.title)}</h1></div>
  ${opt(c.subtitle, `<p class="sub" data-text="body">${rich(c.subtitle)}</p>`)}
  ${opt(c.cta, `<span class="btn" data-text="small">${esc(c.cta)}</span>`)}
</div>`;
}

const ARROW = `<svg viewBox="0 0 80 60" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8 C 30 6, 52 18, 66 46"/><path d="M52 44 L 67 48 L 70 32"/></svg>`;

function sticker(c, ctx) {
  const subj = ctx.images.subject;
  const note = c.note ? `<div class="note" data-text="small"><span>${esc(c.note)}</span>${ARROW}</div>` : "";
  const subjectHtml = subj
    ? `<div class="stk-subject"><img src="${subj.url}" alt="">${note}</div>`
    : ctx.placeholder.subject
      ? `<div class="stk-subject"><div class="ph" style="width:70%;aspect-ratio:1;border-radius:50%;transform:rotate(4deg)"></div>${note}</div>`
      : "";
  return `<div class="dots"></div>
<div class="safe stk${subjectHtml ? "" : " no-subject"}">
  <div class="stk-label">
    ${opt(c.kicker, `<div class="tape" data-text="small">${esc(c.kicker)}</div>`)}
    ${opt(c.badge, `<div class="stamp" data-text="small">${esc(c.badge)}</div>`)}
    <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="6,13">${rich(c.title)}</h1></div>
    ${opt(c.subtitle, `<p class="sub" data-text="body">${rich(c.subtitle)}</p>`)}
    <div class="foot">${brand(ctx) || "<span></span>"}${opt(c.cta, `<span class="cta" data-text="small">${esc(c.cta)}</span>`)}</div>
  </div>
  ${subjectHtml}
</div>`;
}

function minimalMono(c, ctx) {
  const img = ctx.images.thumb;
  const path = [ctx.brand?.name, c.kicker, c.caption].filter(Boolean).map((s, i) => (i === 0 ? `<b>${esc(s)}</b>` : esc(s))).join(" / ");
  return `<div class="safe"><div class="mono-grid"></div></div>
<div class="safe mn">
  <div class="mn-top"><span class="path" data-text="small">${path || "&nbsp;"}</span>${opt(img, `<div class="thumb"${bgStyle(img)}></div>`)}</div>
  <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="7,18">${rich(c.title)}</h1></div>
  <div class="mn-bottom">${c.subtitle ? `<p class="sub" data-text="body">${rich(c.subtitle)}</p>` : "<span></span>"}${opt(c.cta, `<span class="cta" data-text="small">${esc(c.cta)} →</span>`)}</div>
</div>`;
}

function chartSvg(series, accentLast = true) {
  const max = Math.max(...series, 1);
  const n = series.length;
  const gap = 0.28;
  const w = 100 / n;
  const bars = series.map((v, i) => {
    const h = Math.max(1.5, (v / max) * 96);
    const fill = accentLast && i === n - 1 ? "var(--accent)" : "color-mix(in srgb, var(--ink) 22%, transparent)";
    return `<rect x="${(i * w + (w * gap) / 2).toFixed(2)}" y="${(100 - h).toFixed(2)}" width="${(w * (1 - gap)).toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}"/>`;
  });
  return `<svg class="chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${bars.join("")}<rect x="0" y="99.4" width="100" height="0.6" fill="var(--ink)"/></svg>`;
}

function dataCallout(c, ctx) {
  const s = c.stat || {};
  const series = Array.isArray(s.series) && s.series.length > 1 ? s.series.map(Number) : null;
  return `<div class="safe dt${series ? "" : " no-chart"}">
  <div class="dt-head">${opt(c.kicker, `<span class="kicker" data-text="small">${esc(c.kicker)}</span>`) || "<span></span>"}${brand(ctx)}</div>
  ${opt(c.title, `<p class="ctx" data-text="body">${rich(c.title)}</p>`)}
  <div class="fitbox stat-box"><div class="fit stat" data-text="title" data-fit="12,48"><span class="num">${esc(s.value)}</span>${opt(s.unit, `<span class="unit">${esc(s.unit)}</span>`)}</div></div>
  ${opt(s.label, `<p class="label" data-text="body">${rich(s.label)}</p>`)}
  ${series ? chartSvg(series) : ""}
  ${opt(s.source, `<p class="src" data-text="small">Source: ${esc(s.source)}</p>`)}
</div>`;
}

function device(c, ctx) {
  const bg = ctx.images.background;
  const scr = ctx.images.screen;
  return `${bg ? `<div class="bg-layer"${bgStyle(bg)}></div><div class="shade-top"></div>` : ""}
<div class="safe"><div class="dv-text">
  ${opt(c.kicker, `<div class="kicker" data-text="small">${esc(c.kicker)}</div>`)}
  <div class="fitbox title-box"><h1 class="fit title" data-text="title" data-fit="6,12">${rich(c.title)}</h1></div>
  ${opt(c.subtitle, `<p class="sub" data-text="body">${rich(c.subtitle)}</p>`)}
  ${brand(ctx)}
</div></div>
<div class="dv-disc"></div>
<div class="dv-phone"><div class="screen${scr ? "" : " ui-ph"}"${bgStyle(scr)}>${scr ? "" : "<i></i><i></i><i></i><i></i><i></i>"}</div><div class="notch"></div></div>`;
}

// Runs in the page (also embedded in each HTML so it renders the same when opened by hand):
// grows or shrinks every [data-fit] element to the largest size that fits its box.
export function fitText() {
  const t = parseFloat(getComputedStyle(document.querySelector(".cover")).getPropertyValue("--t")) || 10;
  const out = [];
  for (const el of document.querySelectorAll("[data-fit]")) {
    const [mn, mx] = el.dataset.fit.split(",").map(Number);
    const box = el.parentElement;
    const fits = () => el.scrollWidth <= el.clientWidth + 1 && el.offsetHeight <= box.clientHeight + 1;
    let lo = mn * t, hi = mx * t, best = lo;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + "px";
      if (fits()) { best = mid; lo = mid; } else hi = mid;
    }
    el.style.fontSize = Math.floor(best) + "px";
    out.push({ role: el.dataset.text, size: Math.floor(best), min: Math.round(mn * t), overflow: !fits() });
  }
  document.documentElement.dataset.fitted = "1";
  return out;
}
