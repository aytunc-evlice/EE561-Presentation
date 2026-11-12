/* sim-mod.js — carrier PWM lab, zero-sequence (min-max) explorer, space-vector hexagon. */
(function () {
  'use strict';
  const { h } = K;
  const SQ3 = Math.sqrt(3);

  // ---------- carrier lab ----------
  SIMS.carrier = function (host, cfg) {
    const S = 4096, VH = 400;
    const P = { n: cfg.n || 3, arr: cfg.arr || 'PD', m: 0.9, mf: 15, mm: false, sig: cfg.sig || 'ab', onlyA: !!cfg.onlyA };
    const CW = cfg.w || 920;
    const cvA = K.canvas(CW, 230), cvB = K.canvas(CW, cfg.w ? 165 : 190), cvC = K.canvas(CW, cfg.w ? 175 : 190);
    const roThd = K.readout('THD of selected signal', 'big'), roClu = K.readout('Strongest harmonic'), roF = K.readout('Fundamental (peak)');
    const ctl = [
      K.seg({ label: 'Levels', options: [[3, '3-level'], [5, '5-level']], value: P.n, onChange: (v) => { P.n = v; calc(); } }),
      K.seg({ label: 'Carrier arrangement', options: [['PD', 'PD'], ['POD', 'POD'], ['APOD', 'APOD'], ['PS', 'Phase-shifted']], value: P.arr, onChange: (v) => { P.arr = v; calc(); } }),
      K.slider({ label: 'm', min: 0.1, max: 1.2, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; calc(); } }),
      K.slider({ label: 'f<sub>c</sub>/f<sub>1</sub>', min: 3, max: 41, step: 1, value: P.mf, fmt: (v) => String(v), onInput: (v) => { P.mf = v; calc(); } }),
      K.seg({ label: 'Zero-sequence', options: [[false, 'none (SPWM)'], [true, 'min-max injection']], value: P.mm, onChange: (v) => { P.mm = v; calc(); } }),
      K.seg({ label: 'Show spectrum of', options: [['a', 'pole v<sub>aO</sub>'], ['ab', 'line v<sub>ab</sub>']], value: P.sig, onChange: (v) => { P.sig = v; calc(); } }),
    ];
    host.classList.add('sim');
    host.style.gridTemplateColumns = CW + 'px 1fr';
    const shown = cfg.simple ? [ctl[0], ctl[1], ctl[2], ctl[5]] : ctl;
    host.append(h('div', { class: 'sim-col', style: { gap: '8px' } }, cvA.el, cvB.el, cvC.el),
      h('div', { class: 'sim-col' }, shown.map((c) => c.el), h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr' } }, roThd.el, roF.el, roClu.el)));
    const va = new Float32Array(S), vb = new Float32Array(S), vc = new Float32Array(S);
    let amp = null;
    function carriers(t) { // values of the N-1 carriers at carrier phase t (in carrier periods)
      const n = P.n, c = [], w = 2 / (n - 1);
      for (let j = 0; j < n - 1; j++) {
        let off = 0;
        if (P.arr === 'POD' && j < (n - 1) / 2) off = 0.5;
        if (P.arr === 'APOD' && j % 2 === 1) off = 0.5;
        if (P.arr === 'PS') c.push(-1 + 2 * K.tri(t + j / (n - 1)));
        else c.push(-1 + w * (j + K.tri(t + off)));
      }
      return c;
    }
    function refs(th) {
      let a = P.m * Math.sin(th), b = P.m * Math.sin(th - K.TAU / 3), c = P.m * Math.sin(th + K.TAU / 3);
      if (P.mm) { const z = -(Math.max(a, b, c) + Math.min(a, b, c)) / 2; a += z; b += z; c += z; }
      return [a, b, c];
    }
    function lvl(r, cs) { let k = 0; for (const c of cs) if (r > c) k++; return (-1 + (2 * k) / (P.n - 1)) * VH; }
    function calc() {
      for (let i = 0; i < S; i++) {
        const th = (K.TAU * i) / S, cs = carriers((P.mf * i) / S), [a, b, c] = refs(th);
        va[i] = lvl(a, cs); vb[i] = lvl(b, cs); vc[i] = lvl(c, cs);
      }
      const sig = P.sig === 'a' ? va : va.map((v, i) => v - vb[i]);
      amp = K.harmonics(sig);
      const thd = K.thd(amp);
      let hk = 2;
      for (let k = 2; k < 600; k++) if (amp[k] > amp[hk]) hk = k;
      roThd.set((thd * 100).toFixed(1) + ' %');
      roF.set(Math.round(amp[1]) + ' V' + (P.sig === 'ab' ? ` <small class="muted">(${(amp[1] / (SQ3 * VH)).toFixed(3)} × √3·V<sub>dc</sub>/2)</small>` : ''));
      roClu.set('h = ' + hk + ` <small class="muted">${Math.round((amp[hk] / amp[1]) * 100)} % of fund.</small>`);
      draw(sig);
    }
    function draw(sig) {
      sig = sig || (P.sig === 'a' ? va : va.map((v, i) => v - vb[i]));
      const ink = K.css('--ink'), mut = K.css('--muted');
      let ctx = cvA.ctx; cvA.clear();
      const series = [];
      const nC = P.n - 1, NP = P.mf * 2;
      for (let j = 0; j < nC; j++) {
        const xs = [], ys = [];
        for (let q = 0; q <= NP; q++) { const t = q / 2; xs.push((t / P.mf) * K.TAU); ys.push(carriers(t)[j]); }
        // PS / shifted carriers have corners off the half-period grid: sample densely instead
        if (P.arr === 'PS' || P.arr === 'POD' || P.arr === 'APOD') { xs.length = 0; ys.length = 0; for (let q = 0; q <= P.mf * 16; q++) { const t = q / 16; xs.push((t / P.mf) * K.TAU); ys.push(carriers(t)[j]); } }
        series.push({ x: xs, y: ys, color: mut, width: 1, alpha: 0.6 });
      }
      const R = 400, ra = new Float32Array(R + 1), rb = new Float32Array(R + 1), rc = new Float32Array(R + 1);
      for (let q = 0; q <= R; q++) { const r = refs((K.TAU * q) / R); ra[q] = r[0]; rb[q] = r[1]; rc[q] = r[2]; }
      if (!P.onlyA) series.push({ y: rb, x0: 0, dx: K.TAU / R, color: K.css('--s3'), width: 1.6, alpha: 0.7 }, { y: rc, x0: 0, dx: K.TAU / R, color: K.css('--s4'), width: 1.6, alpha: 0.7 });
      series.push({ y: ra, x0: 0, dx: K.TAU / R, color: K.css('--s2'), width: 2.6 });
      K.plot(ctx, { x: 50, y: 26, w: cvA.w - 64, h: cvA.h - 48 }, {
        xlim: [0, K.TAU], ylim: [-1.25, 1.25], yticks: [[-1, '−1'], [0, '0'], [1, '1']],
        bands: [{ y0: 1, y1: 1.25, color: 'rgba(192,57,43,.08)' }, { y0: -1.25, y1: -1, color: 'rgba(192,57,43,.08)' }],
        series, title: P.onlyA ? 'Carriers and the reference of leg a' : 'Carriers and references r_a, r_b, r_c',
        legend: P.onlyA ? [['r_a', K.css('--s2')]] : [['r_a', K.css('--s2')], ['r_b', K.css('--s3')], ['r_c', K.css('--s4')]],
      });
      if (P.n === 3 && P.arr !== 'PS') {
        ctx.save(); ctx.font = '700 14px ' + K.font; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const yU = 26 + (cvA.h - 48) * (1.25 - 1.125) / 2.5, yL = 26 + (cvA.h - 48) * (1.25 + 1.125) / 2.5;
        ctx.fillStyle = K.css('--ink');
        ctx.fillText('upper carrier (0 … +1): P ↔ O', cvA.w - 20, yU); ctx.fillText('lower carrier (−1 … 0): O ↔ N', cvA.w - 20, yL);
        ctx.restore();
      }
      ctx = cvB.ctx; cvB.clear();
      const isAb = P.sig === 'ab';
      K.plot(ctx, { x: 50, y: 26, w: cvB.w - 64, h: cvB.h - 52 }, {
        xlim: [0, S], ylim: isAb ? [-880, 880] : [-460, 460], yticks: isAb ? [[-800, '−800'], [0, '0'], [800, '800']] : [[-400, '−400'], [0, '0'], [400, '400']],
        xticks: [[0, '0'], [S / 2, '10 ms'], [S, '20 ms']],
        series: [{ y: sig, x0: 0, dx: 1, color: ink, width: 1.8, step: true }],
        title: isAb ? 'Line-to-line voltage v_ab [V]' : 'Leg a output v_aO [V]: P = +400, O = 0, N = −400',
      });
      ctx = cvC.ctx; cvC.clear();
      const H = Math.min(300, Math.max(60, Math.round(P.mf * (P.arr === 'PS' ? P.n - 1 : 1) * 3.2)));
      const base = isAb ? SQ3 * VH : VH;
      const vals = [];
      for (let k = 1; k <= H; k++) vals.push((amp[k] / base) * 100);
      const step = H > 150 ? 50 : H > 80 ? 20 : 10;
      K.bars(ctx, { x: 50, y: 26, w: cvC.w - 64, h: cvC.h - 66 }, {
        n: H, ylim: [0, 40], yticks: [[0, '0'], [20, '20 %'], [40, '40 %']], fill: 0.8,
        labels: vals.map((_, j) => ((j + 1) % step === 0 || j === 0 ? String(j + 1) : '')),
        stack: [{ values: vals.map((v) => Math.min(v, 40)), color: (j) => (j === 0 ? K.css('--ink2') : K.css('--s2')) }],
        title: `Spectrum, % of ${isAb ? '√3·V_dc/2' : 'V_dc/2'} (fundamental clipped)`, xlabel: 'harmonic order h',
      });
    }
    K.onTheme(() => draw());
    calc();
    const ST = cfg.steps;
    return {
      step(k) {
        if (!ST) return;
        let o = null; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) o = ST[key];
        if (!o) return;
        let ch = false;
        for (const key of ['arr', 'sig', 'onlyA', 'n']) if (o[key] != null && P[key] !== o[key]) { P[key] = o[key]; ch = true; }
        if (ch) { ctl[0].set(P.n); ctl[1].set(P.arr); ctl[5].set(P.sig); calc(); }
      },
    };
  };

  // ---------- zero-sequence (min-max) explorer ----------
  SIMS.minmax = function (host, cfg) {
    const P = { m: cfg.m || 1.1, on: !!cfg.on, th: cfg.th != null ? cfg.th : 10, vdc: 650, play: false };
    const CW = cfg.w || 880, CH = cfg.h || 420;
    const cv = K.canvas(CW, CH);
    const tbl = h('table', { class: 'tb nocase', style: { fontSize: CW < 800 ? '16px' : '19px' } });
    const roLin = K.readout('Peak |reference|', 'big'), roV = K.readout('Max V<sub>LL,rms</sub> without clipping');
    const ctl = [
      K.slider({ label: 'm', min: 0, max: 1.3, step: 0.005, value: P.m, fmt: (v) => v.toFixed(3), onInput: (v) => { P.m = v; draw(); } }),
      K.seg({ label: 'Injection', options: [[false, 'off (sine PWM)'], [true, 'min-max on']], value: P.on, onChange: (v) => { P.on = v; draw(); } }),
      K.slider({ label: 'θ cursor', min: 0, max: 360, step: 1, value: P.th, fmt: (v) => v + '°', onInput: (v) => { P.th = v; draw(); } }),
      K.slider({ label: 'V<sub>dc</sub>', min: 500, max: 1000, step: 10, value: P.vdc, fmt: (v) => v + ' V', onInput: (v) => { P.vdc = v; draw(); } }),
    ];
    const thS = ctl[2];
    const playB = K.btn('▶ Sweep θ', () => toggle());
    host.classList.add('sim');
    host.style.gridTemplateColumns = CW + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el, tbl),
      h('div', { class: 'sim-col' }, ctl.map((c) => c.el), h('div', { class: 'row' }, playB), roLin.el, roV.el,
        h('div', { class: 'tiny', html: 'm = V<sub>1,phase,peak</sub> / (V<sub>dc</sub>/2). Linear limit: 1 for sine PWM, 2/√3 ≈ 1.155 with min-max injection (balanced three-wire load).' })));
    const refs = (th) => {
      const a = P.m * Math.cos(th), b = P.m * Math.cos(th - K.TAU / 3), c = P.m * Math.cos(th + K.TAU / 3);
      const z = P.on ? -(Math.max(a, b, c) + Math.min(a, b, c)) / 2 : 0;
      return { a, b, c, z, A: a + z, B: b + z, C: c + z };
    };
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const R = 600, s = { a: [], b: [], c: [], A: [], B: [], C: [], z: [] };
      let pk = 0;
      for (let q = 0; q <= R; q++) {
        const r = refs((K.TAU * q) / R);
        for (const k in s) s[k].push(r[k]);
        pk = Math.max(pk, Math.abs(r.A), Math.abs(r.B), Math.abs(r.C));
      }
      const c1 = K.css('--s2'), c2 = K.css('--s3'), c3 = K.css('--s4'), acc = K.css('--ink2');
      const series = P.on
        ? [{ y: s.a, color: c1, width: 1.2, alpha: 0.45 }, { y: s.b, color: c2, width: 1.2, alpha: 0.45 }, { y: s.c, color: c3, width: 1.2, alpha: 0.45 },
          { y: s.z, color: acc, width: 2, dash: [6, 5] }, { y: s.A, color: c1, width: 2.8 }, { y: s.B, color: c2, width: 2.8 }, { y: s.C, color: c3, width: 2.8 }]
        : [{ y: s.a, color: c1, width: 2.8 }, { y: s.b, color: c2, width: 2.8 }, { y: s.c, color: c3, width: 2.8 }];
      series.forEach((x) => { x.x0 = 0; x.dx = 360 / R; });
      K.plot(ctx, { x: 54, y: 30, w: cv.w - 70, h: cv.h - 62 }, {
        xlim: [0, 360], ylim: [-1.35, 1.35], yticks: [[-1, '−1'], [-0.5, '−0.5'], [0, '0'], [0.5, '0.5'], [1, '1']],
        xticks: [0, 60, 120, 180, 240, 300, 360].map((v) => [v, v + '°']),
        bands: [{ y0: 1, y1: 1.35, color: 'rgba(192,57,43,.10)' }, { y0: -1.35, y1: -1, color: 'rgba(192,57,43,.10)' }],
        hlines: [{ v: 1, color: K.css('--bad'), dash: [4, 4], label: 'carrier limit' }, { v: -1, color: K.css('--bad'), dash: [4, 4] }],
        series, cursor: P.th, title: P.on ? 'r′ = r + r₀ (bold) · r (faint)' : 'Sine references r_a, r_b, r_c',
        legend: [['a', c1], ['b', c2], ['c', c3]].concat(P.on ? [['r₀', acc, [6, 5]]] : []),
      });
      const r = refs((P.th * Math.PI) / 180), f = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);
      const mx = Math.max(r.a, r.b, r.c), mn = Math.min(r.a, r.b, r.c);
      tbl.innerHTML = `<tr><th></th><th>a</th><th>b</th><th>c</th><th>max</th><th>min</th><th>r₀</th><th>r′<sub>a</sub>−r′<sub>b</sub></th></tr>
        <tr><td>r</td><td>${f(r.a)}</td><td>${f(r.b)}</td><td>${f(r.c)}</td><td>${f(mx)}</td><td>${f(mn)}</td><td>${P.on ? f(-(mx + mn) / 2) : '—'}</td><td rowspan="2" style="vertical-align:middle">${f(r.A - r.B)}</td></tr>
        <tr class="hl"><td>r′</td><td>${f(r.A)}</td><td>${f(r.B)}</td><td>${f(r.C)}</td><td colspan="3" class="tiny">line-to-line difference is unchanged</td></tr>`;
      roLin.set(pk.toFixed(3) + ' ' + (pk <= 1.0001 ? '<span class="pill ok">linear</span>' : '<span class="pill bad">clips</span>'));
      const mmax = P.on ? 2 / SQ3 : 1;
      roV.set(Math.round((mmax * P.vdc) / 2 * SQ3 / Math.SQRT2) + ' V <small class="muted">at V<sub>dc</sub> = ' + P.vdc + ' V</small>');
    }
    const loop = K.loop((dt) => { P.th = (P.th + dt * 40) % 360; thS.set(Math.round(P.th)); draw(); });
    function toggle() { P.play = !P.play; if (P.play) loop.start(); else loop.stop(); playB.innerHTML = P.play ? '❚❚ Pause' : '▶ Sweep θ'; }
    K.onTheme(draw);
    draw();
    const OS = cfg.onStep;
    return {
      stop() { loop.stop(); P.play = false; playB.innerHTML = '▶ Sweep θ'; }, toggle,
      step(k) { if (OS == null) return; const on = k >= OS; if (on !== P.on) { P.on = on; ctl[1].set(on); draw(); } },
    };
  };

  // ---------- space-vector hexagon ----------
  SIMS.svm = function (host, cfg) {
    const P = { n: cfg.n || 3, m: cfg.m != null ? cfg.m : 0.8, ang: cfg.ang != null ? cfg.ang : 20, play: false, speed: 20 };
    const W = 640, cv = K.canvas(W, W);
    const info = h('div', { class: 'stack', style: { gap: '10px' } });
    const ctl = [
      K.seg({ label: 'Levels', options: [[2, '2-level'], [3, '3-level'], [5, '5-level']], value: P.n, onChange: (v) => { P.n = v; lat(); draw(); } }),
      K.slider({ label: 'm = |v*|', min: 0, max: 1.15, step: 0.005, value: P.m, fmt: (v) => v.toFixed(3), onInput: (v) => { P.m = v; draw(); } }),
    ];
    const playB = K.btn('▶ Rotate v*', () => toggle());
    host.classList.add('sim');
    host.style.gridTemplateColumns = W + 'px 1fr';
    host.append(h('div', { class: 'sim-col', style: { alignItems: 'center' } }, cv.el),
      h('div', { class: 'sim-col' }, ctl.map((c) => c.el), h('div', { class: 'row' }, playB, h('span', { class: 'tiny' }, 'or drag the tip of v* on the hexagon')), info));
    const NAME = { 2: ['N', 'P'], 3: ['N', 'O', 'P'], 5: ['0', '1', '2', '3', '4'] };
    let pts = {}, d = 1, nStates = 0;
    function lat() {
      const n = P.n;
      d = 4 / (3 * (n - 1));
      pts = {};
      nStates = n * n * n;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++) {
        const xa = (2 * a) / (n - 1) - 1, xb = (2 * b) / (n - 1) - 1, xc = (2 * c) / (n - 1) - 1;
        const al = (2 / 3) * (xa - xb / 2 - xc / 2), be = (xb - xc) / SQ3;
        const q = Math.round(be / ((d * SQ3) / 2)), p = Math.round(al / d - q / 2);
        const key = p + ',' + q;
        (pts[key] = pts[key] || { p, q, al: d * (p + q / 2), be: (d * q * SQ3) / 2, st: [] }).st.push([a, b, c]);
      }
    }
    const sc = 210, cx = W / 2, cy = W / 2;
    const X = (al) => cx + al * sc, Y = (be) => cy - be * sc;
    function locate(al, be) {
      const q = be / ((d * SQ3) / 2), p = al / d - q / 2;
      const p0 = Math.floor(p), q0 = Math.floor(q), fp = p - p0, fq = q - q0;
      if (fp + fq < 1) return [[p0, q0, 1 - fp - fq], [p0 + 1, q0, fp], [p0, q0 + 1, fq]];
      return [[p0 + 1, q0 + 1, fp + fq - 1], [p0 + 1, q0, 1 - fq], [p0, q0 + 1, 1 - fp]];
    }
    const stName = (st) => st.map((L) => NAME[P.n][L]).join(P.n === 5 ? ' ' : '');
    function npExpr(st) { // midpoint current for 3-level states, using ia+ib+ic = 0
      const at = [0, 1, 2].filter((x) => st[x] === 1), ph = ['a', 'b', 'c'];
      if (at.length === 1) return '+i<sub>' + ph[at[0]] + '</sub>';
      if (at.length === 2) return '−i<sub>' + ph[[0, 1, 2].find((x) => !at.includes(x))] + '</sub>';
      return '0';
    }
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const grid = K.css('--grid'), line = K.css('--line'), ink = K.css('--ink'), mut = K.css('--muted'), acc = K.css('--accent');
      const R = 4 / 3;
      // lattice triangles
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      const keys = Object.keys(pts);
      for (const k of keys) {
        const a = pts[k];
        for (const [dp, dq] of [[1, 0], [0, 1], [-1, 1]]) {
          const b = pts[(a.p + dp) + ',' + (a.q + dq)];
          if (b) { ctx.beginPath(); ctx.moveTo(X(a.al), Y(a.be)); ctx.lineTo(X(b.al), Y(b.be)); ctx.stroke(); }
        }
      }
      // linear-range circle
      ctx.setLineDash([6, 6]); ctx.strokeStyle = mut; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, (2 / SQ3) * sc, 0, K.TAU); ctx.stroke(); ctx.setLineDash([]);
      // reference & triangle
      const th = (P.ang * Math.PI) / 180, al = P.m * Math.cos(th), be = P.m * Math.sin(th);
      const tri = locate(al, be).map(([p, q, w]) => ({ v: pts[p + ',' + q], w }));
      const valid = tri.every((t) => t.v);
      if (valid) {
        ctx.fillStyle = K.css('--accent-soft'); ctx.strokeStyle = K.css('--ink2'); ctx.lineWidth = 2;
        ctx.beginPath(); tri.forEach((t, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(t.v.al), Y(t.v.be))); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = mut; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, P.m * sc, 0, K.TAU); ctx.stroke(); ctx.globalAlpha = 1;
      // points
      const cols = [K.css('--s1'), K.css('--s3'), K.css('--s4')];
      for (const k of keys) {
        const a = pts[k], nr = a.st.length;
        const ti = valid ? tri.findIndex((t) => t.v === a) : -1;
        ctx.fillStyle = ti >= 0 ? cols[ti] : nr > 1 ? ink : mut;
        ctx.beginPath(); ctx.arc(X(a.al), Y(a.be), (P.n === 5 ? 3 : 4.5) + Math.min(nr, 5) * (P.n === 5 ? 0.8 : 1.4), 0, K.TAU); ctx.fill();
        if (P.n <= 3) {
          ctx.font = (ti >= 0 ? '700 ' : '600 ') + (P.n === 2 ? 16 : 13) + 'px ' + K.font;
          ctx.fillStyle = ti >= 0 ? cols[ti] : mut; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const rr = Math.hypot(a.al, a.be), ux = rr > 1e-6 ? a.al / rr : 0, uy = rr > 1e-6 ? a.be / rr : 1;
          const lines = a.st.map(stName);
          const off = 22 + (lines.length - 1) * 7;
          lines.forEach((t, i) => ctx.fillText(t, X(a.al) + ux * off, Y(a.be) - uy * off + (i - (lines.length - 1) / 2) * 14 - (rr < 1e-6 ? 28 : 0)));
        }
      }
      // v* arrow
      const tx = X(al), ty = Y(be);
      ctx.strokeStyle = K.css('--s2'); ctx.fillStyle = K.css('--s2'); ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      const ang = Math.atan2(ty - cy, tx - cx);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 14 * Math.cos(ang - 0.35), ty - 14 * Math.sin(ang - 0.35)); ctx.lineTo(tx - 14 * Math.cos(ang + 0.35), ty - 14 * Math.sin(ang + 0.35)); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, ty, 7, 0, K.TAU); ctx.fill();
      ctx.font = 'italic 700 18px ' + K.font; ctx.fillText('v*', tx + 16, ty - 10);
      // info panel
      const nv = keys.length;
      let html = `<div class="ro"><span class="ro-lab">Switching states → distinct vectors</span><span class="ro-val">${nStates} → ${nv}</span></div>`;
      if (valid) {
        html += '<div class="ro"><span class="ro-lab">Dwell-time shares in one switching period</span><div style="display:flex;height:22px;border-radius:6px;overflow:hidden;margin:6px 0">' +
          tri.map((t, i) => `<i style="width:${(t.w * 100).toFixed(1)}%;background:${cols[i]}"></i>`).join('') + '</div>';
        html += '<table class="tb" style="font-size:17px">' + tri.map((t, i) =>
          `<tr><td style="color:${cols[i]};font-weight:700">${(t.w * 100).toFixed(1)} %</td><td>${t.v.st.length > 1 ? '<b>' + t.v.st.length + ' states</b> ' : '1 state '}${P.n <= 3 ? t.v.st.map((st) => stName(st) + (P.n === 3 ? ` <small class="muted">(i<sub>O</sub>=${npExpr(st)})</small>` : '')).join(' · ') : '<span class="muted">(levels ' + t.v.st.map(stName).join(' / ') + ')</span>'}</td></tr>`).join('') + '</table></div>';
      } else html += '<div class="callout">Reference outside the hexagon: over-modulation.</div>';
      if (P.n === 3) html += '<div class="tiny">Small vectors come in pairs (e.g. POO / ONN) with opposite midpoint current — the knob for neutral-point balancing.</div>';
      info.innerHTML = html;
    }
    // drag
    let drag = false;
    const setFrom = (e) => {
      const [x, y] = K.evPos(cv, e);
      const al = (x - cx) / sc, be = (cy - y) / sc;
      P.m = Math.min(1.15, Math.hypot(al, be)); P.ang = ((Math.atan2(be, al) * 180) / Math.PI + 360) % 360;
      ctl[1].set(P.m); draw();
    };
    cv.el.style.cursor = 'crosshair';
    cv.el.addEventListener('pointerdown', (e) => { drag = true; cv.el.setPointerCapture(e.pointerId); setFrom(e); });
    cv.el.addEventListener('pointermove', (e) => { if (drag) setFrom(e); });
    cv.el.addEventListener('pointerup', () => { drag = false; });
    const loop = K.loop((dt) => { P.ang = (P.ang + dt * P.speed) % 360; draw(); });
    function toggle() { P.play = !P.play; if (P.play) loop.start(); else loop.stop(); playB.innerHTML = P.play ? '❚❚ Pause' : '▶ Rotate v*'; }
    K.onTheme(draw);
    lat(); draw();
    const n0 = P.n, LS = cfg.levelStep;
    return {
      stop() { loop.stop(); P.play = false; playB.innerHTML = '▶ Rotate v*'; }, toggle,
      step(k) { if (LS == null) return; const n = k >= LS ? 3 : n0; if (n !== P.n) { P.n = n; ctl[0].set(n); lat(); draw(); } },
    };
  };
})();
