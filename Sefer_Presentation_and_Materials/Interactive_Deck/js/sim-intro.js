/* sim-intro.js — what a multilevel leg is: 2-, 3- and 5-level legs as selectors, their PWM outputs,
   and the advantage / disadvantage cards with one bar per level count. */
(function () {
  'use strict';
  const { h, s } = K;
  const VH = 400; // V_dc = 800 V
  const S = 4096, M = 0.9, MF = 15; // samples per period, modulation index, carrier periods per period

  // the leg as an ideal selector: n − 1 equal capacitors, n contacts, one lever on contact k (0 = bottom)
  function selector(n, k) {
    const svg = s('svg', { class: 'sch', viewBox: '0 0 300 262' });
    const XS = 70, XC = 190, XP = 250, Y0 = 26, Y1 = 236, yo = (Y0 + Y1) / 2;
    const yk = (j) => Y1 - ((Y1 - Y0) * j) / (n - 1);
    const wire = (pts) => svg.append(s('polyline', { class: 'wire', points: K.pts(pts) }));
    for (let j = 0; j < n - 1; j++) {
      const ya = yk(j + 1), yb = yk(j), cy = (ya + yb) / 2, c = s('g', { class: 'cap' });
      c.append(s('path', { d: `M${XS},${ya} V${cy - 6} M${XS},${cy + 6} V${yb}` }), s('path', { class: 'plate', d: `M${XS - 17},${cy - 6} H${XS + 17} M${XS - 17},${cy + 6} H${XS + 17}` }));
      svg.append(c);
    }
    const rail = { 0: 'N', [n - 1]: 'P' };
    if (n % 2) rail[(n - 1) / 2] = 'O';
    for (let j = 0; j < n; j++) {
      const y = yk(j), v = Math.round(-VH + (2 * VH * j) / (n - 1));
      wire([[XS, y], [XC, y]]);
      svg.append(s('circle', { class: 'dot', cx: XS, cy: y, r: 5 }));
      svg.append(s('circle', { cx: XC, cy: y, r: 6, fill: j === k ? 'var(--accent)' : 'var(--ink2)' }));
      if (rail[j]) svg.append(s('text', { class: 'rail', x: 26, y: y + 7, 'text-anchor': 'middle', fill: `var(--lv${rail[j]})`, text: rail[j] }));
      svg.append(s('text', { class: 'lbl', x: 132, y: y - 8, 'text-anchor': 'middle', text: (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) }));
    }
    svg.append(s('line', { x1: XP, y1: yo, x2: XC + 7, y2: yk(k), stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    svg.append(s('circle', { cx: XP, cy: yo, r: 6, fill: 'var(--accent)' }));
    wire([[XP, yo], [276, yo]]);
    svg.append(s('circle', { class: 'term', cx: 283, cy: yo, r: 7 }));
    svg.append(s('text', { class: 'lbl', x: 283, y: yo + 30, 'text-anchor': 'middle', text: 'out' }));
    return svg;
  }

  // phase-disposition PWM: n − 1 in-phase carriers stacked between the levels
  function pwm(n) {
    const out = new Float32Array(S), ref = new Float32Array(S);
    for (let i = 0; i < S; i++) {
      const r = M * Math.sin((K.TAU * i) / S), c = K.tri((MF * i) / S);
      let k = 0;
      for (let j = 0; j < n - 1; j++) if (r > -1 + (2 * (j + c)) / (n - 1)) k++;
      out[i] = (-1 + (2 * k) / (n - 1)) * VH; ref[i] = r * VH;
    }
    return { out, ref };
  }
  // RMS ripple of the current that this voltage drives through 5 mH + 10 Ω at 50 Hz (second period)
  function ripple(n) {
    const v = pwm(n).out, dt = 0.02 / S, L = 5e-3, R = 10, i = new Float64Array(S);
    let x = 0;
    for (let p = 0; p < 2; p++) for (let j = 0; j < S; j++) { x += (dt * (v[j] - R * x)) / L; if (p) i[j] = x; }
    let a = 0, b = 0;
    for (let j = 0; j < S; j++) { a += i[j] * Math.sin((K.TAU * j) / S); b += i[j] * Math.cos((K.TAU * j) / S); }
    a *= 2 / S; b *= 2 / S;
    let e = 0;
    for (let j = 0; j < S; j++) e += (i[j] - a * Math.sin((K.TAU * j) / S) - b * Math.cos((K.TAU * j) / S)) ** 2;
    return Math.sqrt(e / S);
  }

  // ---------- 2, 3 and 5 levels side by side: the selector (show: "leg") or its PWM output (show: "wave") ----------
  SIMS.levels = function (host, cfg) {
    const wave = cfg.show === 'wave', W = cfg.w || 440, H = cfg.h || 500;
    host.classList.add('figrow');
    host.style.gridTemplateColumns = `repeat(${cfg.cases.length}, 1fr)`;
    const plots = [];
    for (const c of cfg.cases) {
      const n = c.n, step = Math.round((2 * VH) / (n - 1));
      const cell = h('figure', { class: 'fig lvl' }, h('div', { class: 'lvh' }, n + ' levels'));
      if (wave) {
        const cv = K.canvas(W, H), w = pwm(n), thd = K.thd(K.harmonics(w.out));
        cell.append(cv.el, h('figcaption', { html: `steps of <b>${step} V</b> · THD <b>${Math.round(thd * 100)} %</b>` }));
        plots.push({ n, cv, w });
      } else {
        cell.append(selector(n, c.k), h('figcaption', { html: `${n - 1} capacitor${n > 2 ? 's' : ''} · steps of <b>${step} V</b>` }));
      }
      if (c.step) cell.setAttribute('data-step', c.step);
      host.append(cell);
    }
    function draw() {
      for (const { n, cv, w } of plots) {
        cv.clear();
        const lv = [];
        for (let j = n - 1; j >= 0; j--) lv.push(Math.round(-VH + (2 * VH * j) / (n - 1)));
        K.plot(cv.ctx, { x: 50, y: 10, w: cv.w - 58, h: cv.h - 38 }, {
          xlim: [0, S], ylim: [-460, 460], yticks: lv.map((v) => [v, (v < 0 ? '−' : '') + Math.abs(v)]),
          xticks: [[0, '0'], [S / 2, '10 ms'], [S, '20 ms']],
          series: [{ y: w.ref, x0: 0, dx: 1, color: K.css('--accent'), width: 2.4, dash: [7, 5] }, { y: w.out, x0: 0, dx: 1, color: K.css('--ink'), width: 2, step: true }],
        });
      }
    }
    K.onTheme(draw);
    draw();
    return {};
  };

  // ---------- advantage / disadvantage cards: a factor, a few words, and one bar each for N = 2, 3, 5 ----------
  const NS = [2, 3, 5];
  const QTY = {
    vdev: (n) => 800 / (n - 1), // voltage each switch blocks = voltage step [V]
    ripple: (n) => ripple(n) / ripple(2),
    esw: (n) => 1 / (n - 1), // switched voltage per commutation, relative
    nsw: (n) => 2 * (n - 1), // switches per leg
    nser: (n) => n - 1, // devices in the current path
    ncap: (n) => n - 2, // inner capacitor voltages to hold
    nst: (n) => n ** 3, // switching states of three legs
  };
  SIMS.factors = function (host, cfg) {
    host.classList.add('factors', cfg.kind);
    for (const it of cfg.items) {
      const vals = NS.map(QTY[it.q]), max = Math.max(...vals);
      const bars = h('div', { class: 'fbars' }, NS.map((n, j) => h('div', { class: 'fbar' },
        h('span', { class: 'fv' }, (it.pre || '') + (vals[j] < 10 && vals[j] % 1 ? vals[j].toFixed(2) : Math.round(vals[j])) + (it.unit || '')),
        h('i', { style: { height: Math.max(1.5, (80 * vals[j]) / max) + '%' } }),
        h('span', { class: 'fn' }, 'N = ' + n))));
      const card = h('div', { class: 'fcard' }, h('div', { class: 'fbig', html: it.big }), h('div', { class: 'ftxt', html: it.text }), bars);
      if (it.step) card.setAttribute('data-step', it.step);
      host.append(card);
    }
    return {};
  };
})();
