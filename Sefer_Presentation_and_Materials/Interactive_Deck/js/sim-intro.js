/* sim-intro.js — level ladder. */
(function () {
  'use strict';
  const { h } = K;

  // ---------- level ladder: N-level staircase and its spectrum ----------
  SIMS.ladder = function (host, cfg) {
    const S = 4096, VH = 400;
    const P = { n: cfg.n || 2, m: 0.95 };
    const cvA = K.canvas(900, 330), cvB = K.canvas(900, 250);
    const roStep = K.readout('Step = device voltage'), roThd = K.readout('THD of v<sub>aO</sub>', 'big'), roSw = K.readout('Switches per leg');
    const nS = K.slider({ label: 'Levels N', min: 2, max: 11, step: 1, value: P.n, fmt: (v) => String(v), onInput: (v) => { P.n = v; calc(); } });
    let sweepT = 0;
    const sweepB = K.btn('▶ Sweep N = 2 … 9', () => sweep());
    host.classList.add('sim');
    host.style.gridTemplateColumns = '900px 1fr';
    host.append(h('div', { class: 'sim-col' }, cvA.el, cvB.el),
      h('div', { class: 'sim-col' }, nS.el, h('div', { class: 'row' }, sweepB), roStep.el, roThd.el, roSw.el));
    let out = new Float32Array(S), amp = null;
    function calc() {
      const n = P.n;
      for (let i = 0; i < S; i++) {
        const r = P.m * Math.sin((K.TAU * i) / S);
        const k = Math.round(((r + 1) / 2) * (n - 1));
        out[i] = (-1 + (2 * k) / (n - 1)) * VH;
      }
      amp = K.harmonics(out);
      roStep.set(Math.round(800 / (n - 1)) + ' V');
      roThd.set((K.thd(amp) * 100).toFixed(1) + ' %');
      roSw.set(String(2 * (n - 1)));
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
      const H = 60;
      const vals = [];
      for (let k = 1; k <= H; k++) vals.push((amp[k] / VH) * 100);
      const labels = vals.map((_, j) => ((j + 1) % 10 === 0 || j === 0 ? String(j + 1) : ''));
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
