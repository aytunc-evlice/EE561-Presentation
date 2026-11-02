/* kit.js — small shared toolkit: DOM/SVG builders, controls, canvas plots, FFT. */
(function () {
  'use strict';
  const K = (window.K = {});
  K.TAU = Math.PI * 2;
  window.SIMS = window.SIMS || {};

  K.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  K.font = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
  K.mono = 'Consolas, "Cascadia Code", monospace';

  // ---------- DOM ----------
  K.h = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  K.s = function (tag, attrs, ...kids) {
    const e = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c) e.append(c);
    return e;
  };
  K.pts = (arr) => arr.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  // ---------- controls ----------
  K.slider = function (o) {
    const fmt = o.fmt || ((v) => String(v));
    const val = K.h('span', { class: 'ctl-val' });
    const inp = K.h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 'any', value: o.value });
    const upd = () => { val.innerHTML = fmt(+inp.value); };
    inp.addEventListener('input', () => { upd(); if (o.onInput) o.onInput(+inp.value); });
    inp.addEventListener('change', () => inp.blur()); // hand the arrow keys back to slide navigation
    upd();
    const el = K.h('label', { class: 'ctl ctl-slider' }, K.h('span', { class: 'ctl-lab', html: o.label }), inp, val);
    return {
      el, input: inp,
      get: () => +inp.value,
      set(v, fire) { inp.value = v; upd(); if (fire && o.onInput) o.onInput(+inp.value); },
    };
  };
  K.seg = function (o) {
    let cur = o.value;
    const btns = o.options.map(([v, t]) => {
      const b = K.h('button', { type: 'button', class: 'seg-btn', html: t });
      b._v = v;
      b.addEventListener('click', () => { set(v, true); b.blur(); });
      return b;
    });
    function set(v, fire) {
      cur = v;
      btns.forEach((b) => b.classList.toggle('on', b._v === v));
      if (fire && o.onChange) o.onChange(v);
    }
    set(cur);
    const el = K.h('div', { class: 'ctl ctl-seg' }, o.label ? K.h('span', { class: 'ctl-lab', html: o.label }) : null, K.h('div', { class: 'seg' }, btns));
    return { el, btns, get: () => cur, set };
  };
  K.btn = function (html, onClick, cls) {
    const b = K.h('button', { type: 'button', class: 'btn ' + (cls || ''), html });
    b.addEventListener('click', (e) => { onClick(e); b.blur(); });
    return b;
  };
  K.readout = function (label, cls) {
    const v = K.h('span', { class: 'ro-val' });
    const el = K.h('div', { class: 'ro ' + (cls || '') }, K.h('span', { class: 'ro-lab', html: label }), v);
    let last = null;
    return { el, set(x) { if (x !== last) { v.innerHTML = x; last = x; } } };
  };
  K.fmtV = (v) => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + Math.abs(Math.round(v)) + ' V';
  K.sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);

  // ---------- animation loop ----------
  K.loop = function (fn) {
    let raf = 0, last = 0, on = false;
    const tick = (t) => {
      if (!on) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      try { fn(dt); } catch (e) { on = false; throw e; }
      raf = requestAnimationFrame(tick);
    };
    return {
      start() { if (on) return; on = true; last = 0; raf = requestAnimationFrame(tick); },
      stop() { on = false; cancelAnimationFrame(raf); },
      get on() { return on; },
    };
  };
  // Redraw hooks for theme changes
  K.onTheme = function (fn) { document.addEventListener('themechange', fn); };

  // ---------- canvas ----------
  K.canvas = function (w, h, cls) {
    const c = K.h('canvas', { class: cls || 'plot', width: Math.round(w * 2), height: Math.round(h * 2) });
    c.style.width = w + 'px'; c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    return { el: c, ctx, w, h, clear() { ctx.clearRect(0, 0, w, h); } };
  };
  // Map a mouse event to canvas-local CSS pixels (works under CSS transforms)
  K.evPos = function (cv, e) {
    const r = cv.el.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.w / r.width, (e.clientY - r.top) * cv.h / r.height];
  };

  /* plot(ctx, box, opts)
     opts: xlim, ylim, yticks:[v|[v,label]], xticks, ylabel, xlabel, title, hlines:[{v,color,dash}],
           series:[{y, x?|x0,dx, color, width, step, dash, alpha, n}], cursor:x, bands:[{y0,y1,color}] */
  K.plot = function (ctx, box, o) {
    const { x, y, w, h } = box;
    const [x0, x1] = o.xlim, [y0, y1] = o.ylim;
    const X = (v) => x + ((v - x0) / (x1 - x0)) * w;
    const Y = (v) => y + h - ((v - y0) / (y1 - y0)) * h;
    const grid = K.css('--grid'), muted = K.css('--muted'), line = K.css('--line'), ink = K.css('--ink2');
    ctx.save();
    ctx.font = '600 13px ' + K.font;
    ctx.lineWidth = 1;
    if (o.bands) for (const b of o.bands) {
      ctx.fillStyle = b.color; ctx.fillRect(x, Y(b.y1), w, Y(b.y0) - Y(b.y1));
    }
    ctx.strokeStyle = grid; ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of o.yticks || []) {
      const [v, lab] = Array.isArray(t) ? t : [t, String(t)];
      const yy = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      if (lab) ctx.fillText(lab, x - 8, yy);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const t of o.xticks || []) {
      const [v, lab] = Array.isArray(t) ? t : [t, String(t)];
      const xx = Math.round(X(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke();
      ctx.textAlign = xx > x + w - 24 ? 'right' : 'center';
      if (lab) ctx.fillText(lab, xx, y + h + 6);
    }
    ctx.strokeStyle = line; ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    for (const hl of o.hlines || []) {
      ctx.strokeStyle = hl.color || line; ctx.lineWidth = hl.width || 1.2;
      ctx.setLineDash(hl.dash || []);
      ctx.beginPath(); ctx.moveTo(x, Y(hl.v)); ctx.lineTo(x + w, Y(hl.v)); ctx.stroke();
      ctx.setLineDash([]);
      if (hl.label) { ctx.fillStyle = hl.color || muted; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(hl.label, x + 6, Y(hl.v) - 3); }
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y - 2, w, h + 4); ctx.clip();
    for (const s of o.series || []) {
      const n = s.n != null ? s.n : s.y.length;
      if (n < 1) continue;
      const xs = s.x ? (i) => s.x[i] : (i) => s.x0 + i * s.dx;
      ctx.strokeStyle = s.color || ink; ctx.lineWidth = s.width || 2;
      ctx.globalAlpha = s.alpha == null ? 1 : s.alpha;
      ctx.setLineDash(s.dash || []);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let px = X(xs(0)), py = Y(s.y[0]);
      ctx.moveTo(px, py);
      for (let i = 1; i < n; i++) {
        const nx = X(xs(i)), ny = Y(s.y[i]);
        if (s.step) { if (ny !== py) { ctx.lineTo(nx, py); ctx.lineTo(nx, ny); } }
        else ctx.lineTo(nx, ny);
        px = nx; py = ny;
      }
      if (s.step) ctx.lineTo(X(xs(n - 1)) + (s.dx ? X(s.dx) - X(0) : 0), py);
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (o.cursor != null) {
      ctx.strokeStyle = K.css('--accent'); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(o.cursor), y); ctx.lineTo(X(o.cursor), y + h); ctx.stroke();
    }
    ctx.fillStyle = muted; ctx.font = '600 13px ' + K.font;
    if (o.ylabel) { ctx.save(); ctx.translate(x - (o.ylabelOff || 46), y + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.ylabel, 0, 0); ctx.restore(); }
    if (o.xlabel) { ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(o.xlabel, x + w, y + h + 24); }
    if (o.title) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = K.css('--ink'); ctx.font = '650 15px ' + K.font; ctx.fillText(o.title, x, y - 6); }
    if (o.legend) {
      let lx = x + w; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.font = '600 13px ' + K.font;
      for (let i = o.legend.length - 1; i >= 0; i--) {
        const [lab, col, dash] = o.legend[i];
        ctx.fillStyle = K.css('--muted'); ctx.fillText(lab, lx, y - 6);
        lx -= ctx.measureText(lab).width + 8;
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(lx - 18, y - 12); ctx.lineTo(lx, y - 12); ctx.stroke(); ctx.setLineDash([]);
        lx -= 34;
      }
    }
    ctx.restore();
    return { X, Y };
  };

  /* bars(ctx, box, {values, labels, ylim, colors, stack:[[...],[...]], ytick}) */
  K.bars = function (ctx, box, o) {
    const { x, y, w, h } = box;
    const n = o.n;
    const [y0, y1] = o.ylim;
    const Y = (v) => y + h - ((v - y0) / (y1 - y0)) * h;
    const muted = K.css('--muted'), grid = K.css('--grid');
    ctx.save();
    ctx.font = '600 13px ' + K.font;
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of o.yticks || []) {
      const [v, lab] = Array.isArray(t) ? t : [t, String(t)];
      const yy = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      ctx.fillText(lab, x - 8, yy);
    }
    const slot = w / n, bw = Math.max(1, Math.min(o.maxBar || 60, slot * (o.fill || 0.7)));
    for (let i = 0; i < n; i++) {
      let base = 0;
      const cx = x + slot * (i + 0.5);
      for (const layer of o.stack) {
        const v = layer.values[i] || 0;
        if (v <= 0) continue;
        const yA = Y(Math.min(base + v, y1)), yB = Y(base);
        ctx.fillStyle = typeof layer.color === 'function' ? layer.color(i) : layer.color;
        ctx.globalAlpha = layer.alpha == null ? 1 : layer.alpha;
        ctx.fillRect(cx - bw / 2, yA, bw, yB - yA);
        ctx.globalAlpha = 1;
        base += v;
      }
      if (o.labels && o.labels[i] != null && o.labels[i] !== '') {
        ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(o.labels[i], cx, y + h + 6);
      }
      if (o.top && o.top[i]) {
        ctx.fillStyle = K.css('--ink'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(o.top[i], cx, Y(base) - 4);
      }
    }
    ctx.strokeStyle = K.css('--line'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, Y(y0) + 0.5); ctx.lineTo(x + w, Y(y0) + 0.5); ctx.stroke();
    if (o.title) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillStyle = K.css('--ink'); ctx.font = '650 15px ' + K.font; ctx.fillText(o.title, x, y - 6); }
    if (o.xlabel) { ctx.fillStyle = muted; ctx.font = '600 13px ' + K.font; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(o.xlabel, x + w, y + h + 24); }
    ctx.restore();
  };

  K.niceMax = function (v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p;
    return 10 * p;
  };

  // ---------- signal processing ----------
  K.tri = (x) => { x -= Math.floor(x); return x < 0.5 ? 2 * x : 2 - 2 * x; };
  K.fft = function (re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < half; k++) {
          const a = i + k, b = a + half;
          const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  };
  // amplitude per harmonic; sig must span exactly one fundamental period, length 2^k
  K.harmonics = function (sig) {
    const n = sig.length, re = Float64Array.from(sig), im = new Float64Array(n);
    K.fft(re, im);
    const amp = new Float64Array(n / 2);
    amp[0] = Math.abs(re[0]) / n;
    for (let k = 1; k < n / 2; k++) amp[k] = (2 * Math.hypot(re[k], im[k])) / n;
    return amp;
  };
  K.thd = function (amp, hmax) {
    const H = Math.min(hmax || amp.length - 1, amp.length - 1);
    let s = 0;
    for (let k = 2; k <= H; k++) s += amp[k] * amp[k];
    return Math.sqrt(s) / Math.max(1e-9, amp[1]);
  };
  K.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
})();
