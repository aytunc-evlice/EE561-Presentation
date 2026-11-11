/* sim-om.js — overmodulation in the average picture: the switching-period average of a 2-level leg is the
   reference clipped at ±V_dc/2. Shows the clipped wave against the wanted sine, a 400 V sine and the square wave,
   with its fundamental and low-order harmonics computed by FFT. */
(function () {
  'use strict';
  const { h } = K;
  SIMS.overmod = function (host, cfg) {
    const VH = 400, N = 2048;
    const P = { m: cfg.m != null ? cfg.m : 1.3, sq: false };
    const cv = K.canvas(700, 470);
    const roF = K.readout('Fundamental of the average', 'big'), roW = K.readout('Asked for: m<sub>a</sub> × 400 V'), roL = K.readout('Square-wave limit');
    const mS = K.slider({ label: 'm<sub>a</sub>', min: 0.5, max: 5, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; P.sq = false; sqB.classList.remove('on'); draw(); } });
    const sqB = K.btn('Square wave (m<sub>a</sub> → ∞)', () => { P.sq = !P.sq; sqB.classList.toggle('on', P.sq); draw(); });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gap = '10px';
    host.append(cv.el, h('div', { class: 'row', style: { gap: '18px' } }, h('div', { style: { flex: '1' } }, mS.el), sqB),
      h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1.3fr 1fr 1fr' } }, roF.el, roW.el, roL.el));
    const wave = (th) => (P.sq ? (Math.sin(th) >= 0 ? VH : -VH) : K.clamp(P.m * VH * Math.sin(th), -VH, VH));
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const R = 720, x = [], yW = [], yC = [], y4 = [], yF = [];
      const sig = new Float64Array(N);
      for (let q = 0; q < N; q++) sig[q] = wave((K.TAU * q) / N);
      const amp = K.harmonics(sig);
      // fundamental phase is that of sin (odd, half-wave symmetric wave): V1 sin θ
      const V1 = amp[1];
      for (let q = 0; q <= R; q++) {
        const th = (K.TAU * q) / R;
        x.push((360 * q) / R); yW.push(P.m * VH * Math.sin(th)); yC.push(wave(th)); y4.push(VH * Math.sin(th)); yF.push(V1 * Math.sin(th));
      }
      const mut = K.css('--muted'), red = K.css('--s2'), blue = K.css('--s1'), grn = K.css('--s3');
      const series = [{ x, y: y4, color: mut, width: 2, alpha: 0.7 }];
      if (!P.sq) series.push({ x, y: yW, color: red, width: 2, dash: [7, 5] });
      series.push({ x, y: yC, color: blue, width: 3.2 }, { x, y: yF, color: grn, width: 2.2, dash: [3, 4] });
      const lg = [['400 V sine', mut]];
      if (!P.sq) lg.push(['asked for', red, [7, 5]]);
      lg.push([P.sq ? 'square wave' : 'clipped average', blue], ['its fundamental', grn, [3, 4]]);
      K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: 250 }, {
        xlim: [0, 360], ylim: [-640, 640], xticks: [0, 90, 180, 270, 360].map((v) => [v, v + '°']),
        yticks: [[-509, '−509'], [-400, '−400'], [0, '0'], [400, '400'], [509, '509']],
        bands: [{ y0: 400, y1: 640, color: 'rgba(192,57,43,.07)' }, { y0: -640, y1: -400, color: 'rgba(192,57,43,.07)' }],
        series, title: 'Average [V]', legend: lg,
      });
      const H = 11, vals = [], labels = [];
      for (let k = 1; k <= H; k++) { vals.push(amp[k]); labels.push(String(k)); }
      K.bars(ctx, { x: 62, y: 330, w: cv.w - 78, h: 100 }, {
        n: H, ylim: [0, 560], yticks: [[0, '0'], [200, '200'], [400, '400']], labels, fill: 0.55, maxBar: 34,
        stack: [{ values: vals, color: (i) => (i === 0 ? blue : red) }],
        top: vals.map((v, i) => (v > 4 ? Math.round(v) + '' : '')),
        title: 'Harmonics of the average [V peak], V_dc = 800 V', xlabel: 'harmonic order h',
      });
      roF.set(Math.round(V1) + ' V <small class="muted">= ' + (V1 / VH).toFixed(3) + ' × V<sub>dc</sub>/2</small>');
      roW.set(P.sq ? '∞' : Math.round(P.m * VH) + ' V');
      roL.set('509 V <small class="muted">= 4/π × 400</small>');
    }
    K.onTheme(draw);
    draw();
    return {
      step(k) { const want = k >= 5; if (want !== P.sq) { P.sq = want; sqB.classList.toggle('on', want); draw(); } },
    };
  };
})();
