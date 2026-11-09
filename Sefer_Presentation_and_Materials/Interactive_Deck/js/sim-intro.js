/* sim-intro.js — device-rating chooser, level ladder. */
(function () {
  'use strict';
  const { h } = K;

  // ---------- device rating chooser ----------
  SIMS.ratings = function (host, cfg) {
    const CLASSES = [650, 1200, 1700, 3300, 4500, 6500];
    const NOTE = {
      650: 'Si / SiC / GaN — fastest, lowest loss per amp',
      1200: 'SiC MOSFET or IGBT — the workhorse class',
      1700: 'SiC or IGBT — fewer suppliers, slower',
      3300: 'HV IGBT — switching typically ~1 kHz',
      4500: 'HV IGBT / IGCT — a few hundred Hz to ~1 kHz',
      6500: 'HV IGBT / IGCT — a few hundred Hz',
    };
    let vdc = cfg.vdc || 1500, der = 2 / 3;
    const cards = [2, 3, 5].map((n) => {
      const el = h('div', { class: 'rcard' });
      return { n, el };
    });
    const appSeg = K.seg({
      label: 'DC link of the application',
      options: [[800, '800 V<br><small>EV traction</small>'], [1100, '1100 V<br><small>PV string</small>'], [1500, '1500 V<br><small>PV / storage</small>'], [5000, '≈5 kV<br><small>MV drive</small>']],
      value: vdc, onChange: (v) => { vdc = v; draw(); },
    });
    const derS = K.slider({ label: 'Allowed steady blocking / rating', min: 0.5, max: 0.85, step: 0.01, value: der, fmt: (v) => Math.round(v * 100) + ' %', onInput: (v) => { der = v; draw(); } });
    host.append(h('div', { class: 'stack' }, appSeg.el, derS.el, h('div', { class: 'rcards' }, cards.map((c) => c.el)),
      h('div', { class: 'tiny', html: 'Each device blocks <span class="m">V</span><sub>dc</sub>/(<span class="m">N</span>−1) in an ideal clamped leg. The margin keeps cosmic-ray failure rates acceptable; designers commonly use about 55–70 % of rating. Class notes are typical, not limits.' })));
    function draw() {
      for (const c of cards) {
        const vb = vdc / (c.n - 1), need = vb / der;
        const cls = CLASSES.find((x) => x >= need);
        c.el.className = 'rcard ' + (!cls ? 'bad' : cls <= 1200 ? 'good' : cls >= 3300 ? 'bad' : '');
        const util = cls ? vb / cls : 1;
        c.el.innerHTML = '';
        c.el.append(
          h('div', { class: 'lvls' }, c.n + '-level leg'),
          h('div', { class: 'cls', html: cls ? `${cls >= 1000 ? (cls / 1000).toFixed(cls % 1000 ? 1 : 0) + ' kV' : cls + ' V'} <small>class</small>` : `&gt;6.5 kV <small>series stack</small>` }),
          h('div', { html: `Each device blocks <b>${Math.round(vb)} V</b>` }),
          h('div', { class: 'gauge' }, h('i', { style: { width: Math.min(100, util * 100) + '%' } }), h('em', { style: { left: der * 100 + '%' } })),
          h('div', { class: 'note' }, cls ? NOTE[cls] : 'No single device — needs series connection or more levels'));
      }
    }
    draw();
    return {};
  };

  // ---------- staircase Fourier analysis: switching angles -> harmonics ----------
  // Quarter-wave symmetric staircase, steps of E at angles a_k:  V_h = (4E/(h*pi)) * sum_k cos(h*a_k), odd h.
  SIMS.stair = function (host, cfg) {
    const P = { n: cfg.n || 3, a1: cfg.a1 != null ? cfg.a1 : 30, a2: 66.65 };
    const W = cfg.w || 840;
    const cvA = K.canvas(W, 200), cvB = K.canvas(W, 180);
    const roV1 = K.readout('Fundamental V<sub>1</sub> / (V<sub>dc</sub>/2)'), roThd = K.readout('THD', 'big');
    const aS1 = K.slider({ label: 'α<sub>1</sub>', min: 0, max: 89, step: 0.05, value: P.a1, fmt: (v) => v.toFixed(2) + '°', onInput: (v) => { P.a1 = v; draw(); } });
    const aS2 = K.slider({ label: 'α<sub>2</sub>', min: 0, max: 89, step: 0.05, value: P.a2, fmt: (v) => v.toFixed(2) + '°', onInput: (v) => { P.a2 = v; draw(); } });
    const nSeg = K.seg({ label: 'Levels', options: [[3, '3-level (one angle)'], [5, '5-level (two angles)']], value: P.n, onChange: (v) => { P.n = v; draw(); } });
    const preset = (n, a1, a2) => () => { P.n = n; P.a1 = a1; if (a2 != null) P.a2 = a2; nSeg.set(n); aS1.set(a1); aS2.set(P.a2); draw(); };
    const presets = h('div', { class: 'row' },
      K.btn('3L: α = 30°', preset(3, 30)), K.btn('3L: α = 18°', preset(3, 18)), K.btn('5L, m = 0.8: 30.65° / 66.65°', preset(5, 30.65, 66.65)));
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gridTemplateRows = 'auto auto auto';
    host.style.gap = '10px';
    host.append(cvA.el, cvB.el,
      h('div', { style: { display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '10px 22px', alignItems: 'start' } },
        h('div', { class: 'stack', style: { gap: '8px' } }, nSeg.el, aS1.el, aS2.el, presets),
        h('div', { class: 'ro-grid' }, roV1.el, roThd.el)));
    function angles() { return P.n === 3 ? [P.a1] : [P.a1, P.a2]; }
    function Vh(hh) {
      const E = P.n === 3 ? 1 : 0.5; // step height in units of Vdc/2
      let s = 0;
      for (const a of angles()) s += Math.cos((hh * a * Math.PI) / 180);
      return ((4 * E) / (hh * Math.PI)) * s;
    }
    function draw() {
      aS2.el.style.display = P.n === 5 ? '' : 'none';
      const as = angles().map((a) => (a * Math.PI) / 180), E = P.n === 3 ? 1 : 0.5;
      const NS = 720, y = new Float32Array(NS + 1), f1 = new Float32Array(NS + 1), v1 = Vh(1);
      for (let i = 0; i <= NS; i++) {
        const th = (K.TAU * i) / NS, t = th % Math.PI;
        let lev = 0;
        for (const a of as) if (t > a && t < Math.PI - a) lev += E;
        y[i] = th < Math.PI ? lev : -lev;
        f1[i] = v1 * Math.sin(th);
      }
      cvA.clear();
      K.plot(cvA.ctx, { x: 56, y: 26, w: cvA.w - 70, h: cvA.h - 54 }, {
        xlim: [0, K.TAU], ylim: [-1.45, 1.45], yticks: [[-1, '−1'], [0, '0'], [1, '1']],
        xticks: [[0, '0'], [Math.PI / 2, '90°'], [Math.PI, '180°'], [1.5 * Math.PI, '270°'], [K.TAU, '360°']],
        series: [{ y: f1, x0: 0, dx: K.TAU / NS, color: K.css('--accent'), width: 2, dash: [7, 5] }, { y, x0: 0, dx: K.TAU / NS, color: K.css('--ink'), width: 2.4, step: true }],
        title: 'Pole voltage v_aO / (V_dc/2) and its fundamental', legend: [['staircase', K.css('--ink')], ['fundamental', K.css('--accent'), [7, 5]]],
      });
      const H = 25, vals = [], labels = [], top = [];
      let s2 = 0;
      for (let hh = 3; hh < 6000; hh += 2) s2 += Vh(hh) ** 2;
      for (let hh = 1; hh <= H; hh++) {
        const v = hh % 2 ? Math.abs(Vh(hh)) / Math.max(1e-9, Math.abs(v1)) * 100 : 0;
        vals.push(v); labels.push(hh % 2 ? String(hh) : '');
        top.push(hh % 2 && hh > 1 && v < 0.5 ? '0' : '');
      }
      cvB.clear();
      K.bars(cvB.ctx, { x: 56, y: 28, w: cvB.w - 70, h: cvB.h - 62 }, {
        n: H, ylim: [0, 40], yticks: [[0, '0'], [20, '20 %'], [40, '40 %']], labels, top, fill: 0.7,
        stack: [{ values: vals.map((v) => Math.min(v, 40)), color: (j) => (j === 0 ? K.css('--ink2') : K.css('--s2')) }],
        title: 'Harmonic amplitudes V_h / V_1 (odd h; fundamental clipped)', xlabel: 'harmonic order h',
      });
      roV1.set(v1.toFixed(3));
      roThd.set(((Math.sqrt(s2) / Math.abs(v1)) * 100).toFixed(1) + ' %');
    }
    K.onTheme(draw);
    draw();
    return {};
  };

  // ---------- level ladder: N levels, staircase or PWM, spectrum ----------
  SIMS.ladder = function (host, cfg) {
    const S = 4096, VH = 400;
    const P = { n: cfg.n || 2, mode: 'stair', m: 0.95, mf: 21 };
    const cvA = K.canvas(900, 330), cvB = K.canvas(900, 250);
    const roStep = K.readout('Voltage step ΔV'), roDev = K.readout('Device blocking (clamped leg)'), roThd = K.readout('THD of v<sub>aO</sub>', 'big'), roSw = K.readout('Switches per leg');
    const nS = K.slider({ label: 'Levels N', min: 2, max: 11, step: 1, value: P.n, fmt: (v) => String(v), onInput: (v) => { P.n = v; calc(); } });
    const modeS = K.seg({ label: 'Modulation', options: [['stair', 'Nearest level (staircase)'], ['pwm', 'PWM, stacked carriers']], value: P.mode, onChange: (v) => { P.mode = v; calc(); } });
    const mS = K.slider({ label: 'Modulation index m', min: 0.2, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; calc(); } });
    const fS = K.slider({ label: 'f<sub>carrier</sub>/f<sub>1</sub>', min: 6, max: 60, step: 1, value: P.mf, fmt: (v) => String(v), onInput: (v) => { P.mf = v; calc(); } });
    let sweepT = 0;
    const sweepB = K.btn('▶ Sweep N = 2 … 9', () => sweep());
    host.classList.add('sim');
    host.style.gridTemplateColumns = '900px 1fr';
    host.append(h('div', { class: 'sim-col' }, cvA.el, cvB.el),
      h('div', { class: 'sim-col' }, nS.el, modeS.el, mS.el, fS.el, h('div', { class: 'row' }, sweepB),
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roStep.el, roDev.el, roThd.el, roSw.el),
        h('div', { class: 'tiny', html: 'V<sub>dc</sub> = 800 V. THD computed from the full spectrum of the pole voltage (one period, 4096 samples). Switch count is for a clamped leg: 2(N−1).' })));
    let out = new Float32Array(S), amp = null;
    function calc() {
      const n = P.n, w = 2 / (n - 1);
      for (let i = 0; i < S; i++) {
        const r = P.m * Math.sin((K.TAU * i) / S);
        let k;
        if (P.mode === 'stair' || n < 2) k = Math.round(((r + 1) / 2) * (n - 1));
        else { const t = K.tri((P.mf * i) / S); k = 0; for (let j = 0; j < n - 1; j++) if (r > -1 + w * (j + t)) k++; }
        out[i] = (-1 + (2 * k) / (n - 1)) * VH;
      }
      amp = K.harmonics(out);
      const thd = K.thd(amp);
      roStep.set(Math.round(800 / (n - 1)) + ' V');
      roDev.set(Math.round(800 / (n - 1)) + ' V');
      roThd.set((thd * 100).toFixed(1) + ' %');
      roSw.set(String(2 * (n - 1)));
      fS.el.style.opacity = P.mode === 'pwm' ? 1 : 0.35;
      draw();
    }
    function draw() {
      const n = P.n, A = cvA, ctx = A.ctx;
      A.clear();
      const lv = [];
      for (let k = 0; k < n; k++) lv.push((-1 + (2 * k) / (n - 1)) * VH);
      const ref = new Float32Array(401);
      for (let i = 0; i <= 400; i++) ref[i] = P.m * VH * Math.sin((K.TAU * i) / 400);
      K.plot(ctx, { x: 58, y: 30, w: A.w - 74, h: A.h - 64 }, {
        xlim: [0, S], ylim: [-460, 460], yticks: n <= 5 ? lv.map((v) => [v, String(Math.round(v))]) : [[-400, '−400'], [0, '0'], [400, '400']],
        xticks: [[0, '0'], [S / 2, '10 ms'], [S, '20 ms']],
        hlines: n > 5 ? lv.map((v) => ({ v, color: K.css('--grid') })) : [],
        series: [{ y: ref, x0: 0, dx: S / 400, color: K.css('--accent'), width: 2, dash: [7, 5] }, { y: out, x0: 0, dx: 1, color: K.css('--ink'), width: 2.4, step: true }],
        title: `Pole voltage v_aO [V], ${n} levels`, legend: [['v_aO', K.css('--ink')], ['reference', K.css('--accent'), [7, 5]]],
      });
      const Bc = cvB, bx = Bc.ctx;
      Bc.clear();
      const H = P.mode === 'pwm' ? Math.min(200, Math.max(60, Math.round(P.mf * 3.3))) : 60;
      const vals = [];
      for (let k = 1; k <= H; k++) vals.push((amp[k] / VH) * 100);
      const labels = vals.map((_, j) => ((j + 1) % (H > 100 ? 25 : 10) === 0 || j === 0 ? String(j + 1) : ''));
      K.bars(bx, { x: 58, y: 30, w: Bc.w - 74, h: Bc.h - 66 }, {
        n: H, ylim: [0, 50], yticks: [[0, '0'], [25, '25 %'], [50, '50 %']], labels, fill: 0.75,
        stack: [{ values: vals.map((v) => Math.min(v, 50)), color: (j) => (j === 0 ? K.css('--ink2') : K.css('--s2')) }],
        title: `Harmonic amplitudes, % of V_dc/2 (fundamental ${Math.round(vals[0])} %, clipped)`, xlabel: 'harmonic order h',
      });
    }
    function sweep() {
      clearInterval(sweepT);
      P.n = 2; nS.set(2); calc();
      sweepT = setInterval(() => {
        if (P.n >= 9) { clearInterval(sweepT); return; }
        P.n++; nS.set(P.n); calc();
      }, 1100);
    }
    K.onTheme(draw);
    calc();
    return { stop() { clearInterval(sweepT); }, toggle: sweep, reset() { clearInterval(sweepT); P.n = cfg.n || 2; nS.set(P.n); calc(); } };
  };
})();
