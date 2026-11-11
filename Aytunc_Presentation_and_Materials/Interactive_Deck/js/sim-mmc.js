/* sim-mmc.js — MMC arm with nearest-level modulation and capacitor-voltage sorting,
   and an L / LCL grid-filter explorer driven by the PWM spectrum of a 2- or 3-level leg. */
(function () {
  'use strict';
  const { h } = K;

  /* One upper arm of an MMC phase leg. The arm current is imposed:
       i_u = I_dc/3 + i_a/2,  i_a = I sin(ωt − φ)   (circulating current assumed suppressed)
     A slow arm-energy loop sets I_dc/3 so that the sum of the SM voltages stays at V_dc.
     Nearest-level modulation: n_u = round(v_u* / v̄_C).  Each inserted SM: C dv/dt = i_u. */
  SIMS.mmc = function (host, cfg) {
    const VDC = 6000, F1 = 50, W = K.TAU * F1, TS = 100e-6, WIN = 0.06, NW = Math.round(WIN / TS), NA = Math.round(0.02 / TS);
    const C0 = 3e-3, IAC = 200, BAND = 0.05;
    const P = { n: 6, mode: 'sort', m: 0.9, phi: 0, speed: 0.1, play: true, aged: false };
    for (const k of ['n', 'mode', 'm', 'phi', 'speed']) if (cfg[k] != null) P[k] = cfg[k];
    let st;
    function reset() {
      const N = P.n, vn = VDC / N;
      st = {
        t: 0, th: 0, k: 0, v: new Float64Array(N), C: new Float64Array(N).fill(C0), S: new Uint8Array(N),
        swRing: new Float32Array(NA), swSum: 0, sumRing: new Float64Array(NA).fill(VDC), sumAcc: VDC * NA, trip: false, idc3: 0,
        bV: Array.from({ length: N }, () => new Float32Array(NW)), bI: new Float32Array(NW), bVu: new Float32Array(NW), bRef: new Float32Array(NW),
      };
      for (let i = 0; i < N; i++) { st.v[i] = vn * (1 + 0.004 * (i - (N - 1) / 2)); st.bV[i].fill(st.v[i]); }
      if (P.aged) st.C[1] = 0.8 * C0;
    }
    reset();

    const cv = K.canvas(900, 590);
    const roSp = K.readout('Spread max − min', 'big'), roSw = K.readout('Mean SM switching frequency'), roN = K.readout('Inserted SMs n<sub>u</sub>'), roSt = K.readout('Status');
    const ctl = {
      mode: K.seg({ label: 'SM selection', options: [['fixed', 'fixed order'], ['sort', 'sort every period'], ['reduced', 'on level change, ±5 % band']], value: P.mode, onChange: (v) => { P.mode = v; } }),
      n: K.seg({ label: 'SMs per arm', options: [[4, '4'], [6, '6'], [10, '10']], value: P.n, onChange: (v) => { P.n = v; reset(); } }),
      m: K.slider({ label: 'm', min: 0.5, max: 1.0, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; } }),
      phi: K.slider({ label: 'φ', min: -180, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; } }),
      speed: K.slider({ label: 'Speed', min: 0.02, max: 0.5, step: 0.01, value: P.speed, fmt: (v) => '×' + v.toFixed(2), onInput: (v) => { P.speed = v; } }),
    };
    const playB = K.btn('❚❚ Pause', () => toggle());
    const agedB = K.btn('SM 2: C −20 %', () => { P.aged = !P.aged; st.C[1] = P.aged ? 0.8 * C0 : C0; agedB.classList.toggle('on', P.aged); });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '900px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el),
      h('div', { class: 'sim-col', style: { gap: '10px' } }, ctl.mode.el, ctl.n.el, ctl.m.el, ctl.phi.el, ctl.speed.el,
        h('div', { class: 'row' }, playB, K.btn('Disturb: SM 1 −10 %', () => { st.v[0] *= 0.9; }), agedB, K.btn('Reset', () => reset())),
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roSp.el, roSw.el, roN.el, roSt.el),
        h('div', { class: 'tiny', html: 'V<sub>dc</sub> = 6 kV, 3 mF per SM, 200 A peak AC, f<sub>1</sub> = 50 Hz, control period 100 µs. Rule: arm current charging (i<sub>u</sub> &gt; 0) → insert the lowest; discharging → insert the highest. Reduced mode: only the SM entering or leaving is chosen, plus a full sort when the spread exceeds 5 %. Circulating current assumed suppressed.' })));

    const order = [];
    function stepSim() {
      const N = P.n, phi = (P.phi * Math.PI) / 180;
      st.th += W * TS; if (st.th > K.TAU) st.th -= K.TAU;
      let sum = 0; for (let i = 0; i < N; i++) sum += st.v[i];
      // one-cycle average of the arm energy (sum of SM voltages) → slow loop on the DC share of the arm current
      const j = st.k % NA;
      st.sumAcc += sum - st.sumRing[j]; st.sumRing[j] = sum;
      const sumAvg = st.sumAcc / NA;
      st.idc3 = (P.m * IAC * Math.cos(phi)) / 4 + 0.02 * (VDC - sumAvg);
      const vref = ((P.m * VDC) / 2) * Math.sin(st.th), vuRef = VDC / 2 - vref;
      const iu = st.idc3 + (IAC / 2) * Math.sin(st.th - phi);
      const n = K.clamp(Math.round(vuRef / (sum / N)), 0, N);
      const prev = Uint8Array.from(st.S);
      order.length = 0; for (let i = 0; i < N; i++) order.push(i);
      const up = (a, b) => st.v[a] - st.v[b], down = (a, b) => st.v[b] - st.v[a];
      if (P.mode === 'fixed') {
        for (let i = 0; i < N; i++) st.S[i] = i < n ? 1 : 0;
      } else if (P.mode === 'sort' || (st.spread || 0) > BAND * (VDC / N)) {
        // full sort every period, or (reduced-switching mode) whenever the spread leaves the tolerance band
        order.sort(iu >= 0 ? up : down);
        st.S.fill(0); for (let q = 0; q < n; q++) st.S[order[q]] = 1;
      } else {
        const on = order.filter((i) => st.S[i]), off = order.filter((i) => !st.S[i]);
        const d = n - on.length;
        if (d > 0) { off.sort(iu >= 0 ? up : down); for (let q = 0; q < d; q++) st.S[off[q]] = 1; }
        else if (d < 0) { on.sort(iu >= 0 ? down : up); for (let q = 0; q < -d; q++) st.S[on[q]] = 0; }
      }
      let ch = 0, vu = 0;
      for (let i = 0; i < N; i++) {
        if (st.S[i] !== prev[i]) ch++;
        if (st.S[i]) { vu += st.v[i]; st.v[i] += (iu * TS) / st.C[i]; }
      }
      st.swSum += ch - st.swRing[j]; st.swRing[j] = ch;
      const b = st.k % NW;
      for (let i = 0; i < N; i++) st.bV[i][b] = st.v[i];
      st.bI[b] = iu; st.bVu[b] = vu; st.bRef[b] = vuRef; st.n = n;
      st.k++; st.t += TS;
      let mx = -1e9, mn = 1e9; for (let i = 0; i < N; i++) { mx = Math.max(mx, st.v[i]); mn = Math.min(mn, st.v[i]); }
      st.spread = mx - mn;
      if (st.spread > 0.3 * (VDC / N)) st.trip = true;
    }
    function tick(dt) {
      if (P.play && !st.trip) {
        const n = Math.round((dt * P.speed) / TS);
        for (let i = 0; i < n && !st.trip; i++) stepSim();
      }
      draw();
    }
    function chrono(buf) { const out = new Float32Array(NW), s0 = st.k % NW; for (let i = 0; i < NW; i++) out[i] = buf[(s0 + i) % NW]; return out; }
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const N = P.n, vn = VDC / N;
      const xt = [[0, '−60 ms'], [NW / 3, '−40 ms'], [(2 * NW) / 3, '−20 ms'], [NW, 'now']];
      const pal = [K.css('--s1'), K.css('--s2'), K.css('--s3'), K.css('--s4'), K.css('--ink2'), K.css('--lvL'), K.css('--lvH'), K.css('--muted'), K.css('--flow'), K.css('--block')];
      const lo = vn * 0.82, hi = vn * 1.18;
      K.plot(ctx, { x: 70, y: 30, w: cv.w - 86, h: 250 }, {
        xlim: [0, NW], ylim: [lo, hi], xticks: xt,
        yticks: [[vn * 0.85, Math.round(vn * 0.85) + ''], [vn * 0.9, Math.round(vn * 0.9) + ''], [vn, Math.round(vn) + ''], [vn * 1.1, Math.round(vn * 1.1) + ''], [vn * 1.15, Math.round(vn * 1.15) + '']],
        hlines: [{ v: vn * 1.15, color: K.css('--bad'), dash: [5, 4], label: 'trip ±15 %' }, { v: vn * 0.85, color: K.css('--bad'), dash: [5, 4] }],
        series: st.bV.slice(0, N).map((buf, i) => ({ y: chrono(buf), x0: 0, dx: 1, color: pal[i % pal.length], width: 2 })),
        title: 'Submodule capacitor voltages [V], one line per SM',
      });
      K.plot(ctx, { x: 70, y: 330, w: cv.w - 86, h: 100 }, {
        xlim: [0, NW], ylim: [-160, 160], yticks: [[-100, '−100'], [0, '0'], [100, '100']], xticks: xt,
        bands: [{ y0: 0, y1: 160, color: 'rgba(46,125,50,.07)' }],
        series: [{ y: chrono(st.bI), x0: 0, dx: 1, color: K.css('--s2'), width: 2.2 }], title: 'Arm current i_u [A] (shaded: charging the inserted SMs)',
      });
      K.plot(ctx, { x: 70, y: 478, w: cv.w - 86, h: 90 }, {
        xlim: [0, NW], ylim: [-300, VDC + 300], yticks: [[0, '0'], [VDC / 2, VDC / 2 + ''], [VDC, VDC + '']], xticks: xt,
        series: [{ y: chrono(st.bRef), x0: 0, dx: 1, color: K.css('--muted'), width: 1.5, dash: [6, 4] }, { y: chrono(st.bVu), x0: 0, dx: 1, color: K.css('--s1'), width: 2.2, step: true }],
        title: 'Arm voltage v_u [V]: staircase of inserted SMs, reference dashed',
      });
      roSp.set(Math.round(st.spread || 0) + ' V <small class="muted">' + (((st.spread || 0) / vn) * 100).toFixed(1) + ' %</small>');
      roSw.set(Math.round(st.swSum / (2 * N * 0.02)) + ' Hz');
      roN.set((st.n == null ? '—' : st.n) + ' of ' + N);
      roSt.set(st.trip ? '<span class="pill bad">trip: spread &gt; 30 %</span>' : (st.spread || 0) < 0.06 * vn ? '<span class="pill ok">balanced</span>' : '<span class="pill warn">drifting</span>');
    }
    const loop = K.loop(tick);
    function toggle() { P.play = !P.play; playB.innerHTML = P.play ? '❚❚ Pause' : '▶ Play'; }
    K.onTheme(draw);
    draw();
    return { start: loop.start, stop: loop.stop, toggle, reset };
  };

  /* L vs LCL grid filter. Converter phase voltage spectrum from naturally sampled sine PWM (2-level, or 3-level PD),
     grid current harmonics I_h = V_h · |i_g / v_c|(h f1), stiff sinusoidal grid. */
  SIMS.lcl = function (host, cfg) {
    const F1 = 50, VDC = 800, VPH = (400 / Math.sqrt(3)) * Math.SQRT2, SR = 50e3, IR = (SR / (3 * 400 / Math.sqrt(3))) * Math.SQRT2;
    const P = { topo: 3, filt: 'lcld', fsw: 10000, L1: 1.0, L2: 0.3, Cf: 10, Rd: 1.5 };
    for (const k of Object.keys(P)) if (cfg[k] != null) P[k] = cfg[k];
    const M = 1 << 16;
    let spec = null, specKey = '';
    function spectrum() {
      const key = P.topo + '/' + P.fsw;
      if (key === specKey) return spec;
      // Natural sampling with sub-sample edge interpolation: each comparator output is the fraction of the
      // sample interval where (reference − carrier) > 0, so edge quantization does not create low-order harmonics.
      const m = VPH / (VDC / 2), mf = P.fsw / F1, van = new Float64Array(M);
      const H = (e0, e1) => (e0 >= 0 && e1 >= 0 ? 1 : e0 < 0 && e1 < 0 ? 0 : e0 >= 0 ? e0 / (e0 - e1) : e1 / (e1 - e0));
      const lev = (q, x, car) => {
        const t0 = q / M, t1 = (q + 1) / M;
        const r0 = m * Math.sin(K.TAU * t0 - (x * K.TAU) / 3), r1 = m * Math.sin(K.TAU * t1 - (x * K.TAU) / 3);
        const c0 = K.tri(mf * t0), c1 = K.tri(mf * t1);
        if (car === 2) return 2 * H(r0 - (2 * c0 - 1), r1 - (2 * c1 - 1)) - 1;
        return H(r0 - c0, r1 - c1) + H(r0 - (c0 - 1), r1 - (c1 - 1)) - 1;
      };
      for (let q = 0; q < M; q++) {
        const a = lev(q, 0, P.topo), b = lev(q, 1, P.topo), c = lev(q, 2, P.topo);
        van[q] = (a - (a + b + c) / 3) * (VDC / 2);
      }
      spec = K.harmonics(van); specKey = key;
      return spec;
    }
    const Ymag = (f, filt) => {
      const w = K.TAU * f, L1 = P.L1 * 1e-3, L2 = P.L2 * 1e-3, C = P.Cf * 1e-6;
      if (filt === 'l') return 1 / (w * (L1 + L2));
      const Rd = filt === 'lcld' ? P.Rd : 0;
      const dr = (L1 + L2) / C - w * w * L1 * L2, di = w * (L1 + L2) * Rd;
      return Math.hypot(Rd, 1 / (w * C)) / Math.hypot(dr, di);
    };
    const cv = K.canvas(900, 590);
    const roF = K.readout('LCL resonance f<sub>res</sub>'), roQ = K.readout('C<sub>f</sub> reactive power'), roW = K.readout('Largest i<sub>g</sub> harmonic', 'big'), roT = K.readout('Ripple i<sub>g</sub>, h ≥ 2 (rms)'), roP = K.readout('R<sub>d</sub> loss');
    const ctl = [
      K.seg({ label: 'Converter leg', options: [[2, '2-level'], [3, '3-level NPC (PD)']], value: P.topo, onChange: (v) => { P.topo = v; draw(); } }),
      K.seg({ label: 'Filter', options: [['l', 'L = L₁ + L₂'], ['lcl', 'LCL'], ['lcld', 'LCL + R<sub>d</sub>']], value: P.filt, onChange: (v) => { P.filt = v; draw(); } }),
      K.slider({ label: 'f<sub>sw</sub>', min: 2000, max: 20000, step: 500, value: P.fsw, fmt: (v) => (v / 1000).toFixed(1) + ' kHz', onInput: (v) => { P.fsw = v; draw(); } }),
      K.slider({ label: 'L₁ (converter)', min: 0.2, max: 4, step: 0.05, value: P.L1, fmt: (v) => v.toFixed(2) + ' mH', onInput: (v) => { P.L1 = v; draw(); } }),
      K.slider({ label: 'L₂ (grid)', min: 0.05, max: 1.5, step: 0.05, value: P.L2, fmt: (v) => v.toFixed(2) + ' mH', onInput: (v) => { P.L2 = v; draw(); } }),
      K.slider({ label: 'C<sub>f</sub>', min: 2, max: 40, step: 1, value: P.Cf, fmt: (v) => v + ' µF', onInput: (v) => { P.Cf = v; draw(); } }),
      K.slider({ label: 'R<sub>d</sub> (series with C<sub>f</sub>)', min: 0, max: 6, step: 0.1, value: P.Rd, fmt: (v) => v.toFixed(1) + ' Ω', onInput: (v) => { P.Rd = v; draw(); } }),
    ];
    host.classList.add('sim');
    host.style.gridTemplateColumns = '900px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el),
      h('div', { class: 'sim-col', style: { gap: '9px' } }, ctl.map((c) => c.el),
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roW.el, roT.el, roF.el, roQ.el, roP.el),
        h('div', { class: 'tiny', html: '400 V, 50 kVA (I<sub>rated</sub> = 72 A rms), V<sub>dc</sub> = 800 V, sine PWM m = 0.82, natural sampling. Grid assumed stiff and clean: i<sub>g</sub> harmonics come from the converter only.' })));
    const LX = (f) => Math.log10(f);
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const amp = spectrum();
      const fres = Math.sqrt((P.L1 + P.L2) * 1e-3 / (P.L1 * 1e-3 * P.L2 * 1e-3 * P.Cf * 1e-6)) / K.TAU;
      const xl = [LX(50), LX(50000)], xt = [[LX(100), '100 Hz'], [LX(1000), '1 kHz'], [LX(10000), '10 kHz']];
      const NB = 360, fx = [], yL = [], yU = [], yD = [];
      for (let i = 0; i <= NB; i++) {
        const lf = xl[0] + ((xl[1] - xl[0]) * i) / NB, f = Math.pow(10, lf);
        fx.push(lf);
        const db = (y) => K.clamp(20 * Math.log10(y), -110, 30);
        yL.push(db(Ymag(f, 'l'))); yU.push(db(Ymag(f, 'lcl'))); yD.push(db(Ymag(f, 'lcld')));
      }
      const sel = { l: yL, lcl: yU, lcld: yD };
      const nm = { l: 'L', lcl: 'LCL', lcld: 'LCL + R_d' };
      const series = ['l', 'lcl', 'lcld'].map((k, i) => ({ x: fx, y: sel[k], color: [K.css('--muted'), K.css('--s1'), K.css('--s2')][i], width: k === P.filt ? 3 : 1.4, alpha: k === P.filt ? 1 : 0.55, dash: k === 'l' ? [6, 4] : null }));
      const top = K.plot(ctx, { x: 70, y: 30, w: cv.w - 86, h: 230 }, {
        xlim: xl, ylim: [-110, 30], xticks: xt, yticks: [[-100, '−100'], [-80, '−80'], [-60, '−60'], [-40, '−40'], [-20, '−20'], [0, '0'], [20, '20']],
        series, title: '|i_g / v_c| [dB re 1 A/V]', legend: [['L', K.css('--muted'), [6, 4]], ['LCL', K.css('--s1')], ['LCL + R_d', K.css('--s2')]],
      });
      const vmark = (pl, f, lab, col, y0, hh) => {
        const x = pl.X(LX(f)); if (x < 70 || x > cv.w - 16) return;
        ctx.save(); ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + hh); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.font = '700 13px ' + K.font; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(lab, x + 4, y0 + 4); ctx.restore();
      };
      if (P.filt !== 'l') vmark(top, fres, 'f_res', K.css('--s1'), 30, 230);
      vmark(top, P.fsw, 'f_sw', K.css('--ink2'), 30, 230);
      // grid-current harmonics
      const box = { x: 70, y: 318, w: cv.w - 86, h: 230 };
      const bot = K.plot(ctx, box, {
        xlim: xl, ylim: [-3, 1.3], xticks: xt, yticks: [[-3, '0.001 %'], [-2, '0.01 %'], [-1, '0.1 %'], [0, '1 %'], [1, '10 %']],
        hlines: [{ v: Math.log10(0.3), color: K.css('--warn'), dash: [5, 4], label: '0.3 % of I_rated' }],
        title: 'Grid-current harmonics, % of rated peak current (' + nm[P.filt] + ', ' + P.topo + '-level)',
      });
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.strokeStyle = K.css('--s2'); ctx.lineWidth = 2;
      let worst = 0, worstF = 0, s2 = 0, pd = 0;
      const hmax = Math.min(amp.length - 1, 1000);
      for (let hh = 2; hh <= hmax; hh++) {
        const f = hh * F1, Ih = amp[hh] * Ymag(f, P.filt), pc = (Ih / IR) * 100;
        s2 += Ih * Ih / 2;
        if (P.filt === 'lcld') { const w = K.TAU * f, Ic = Ih * (w * P.L2 * 1e-3) / Math.hypot(P.Rd, 1 / (w * P.Cf * 1e-6)); pd += 3 * P.Rd * Ic * Ic / 2; }
        if (pc > worst) { worst = pc; worstF = f; }
        if (pc < 1e-3) continue;
        const x = bot.X(LX(f)), y = bot.Y(Math.log10(pc));
        ctx.beginPath(); ctx.moveTo(x, bot.Y(-3)); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.restore();
      if (P.filt === 'lcld') { const w = K.TAU * F1, Ic1 = VPH / Math.hypot(P.Rd, 1 / (w * P.Cf * 1e-6)); pd += 3 * P.Rd * Ic1 * Ic1 / 2; }
      roW.set(worst.toFixed(2) + ' % <small class="muted">at ' + (worstF / 1000).toFixed(2) + ' kHz</small> ' + (worst <= 0.3 ? '<span class="pill ok">ok</span>' : '<span class="pill bad">high</span>'));
      roT.set(((Math.sqrt(s2) / (IR / Math.SQRT2)) * 100).toFixed(2) + ' %');
      roF.set(P.filt === 'l' ? '—' : (fres / 1000).toFixed(2) + ' kHz <small class="muted">' + (fres > 10 * F1 && fres < P.fsw / 2 ? 'in 10 f₁ … f<sub>sw</sub>/2' : 'outside 10 f₁ … f<sub>sw</sub>/2') + '</small>');
      const q = 3 * Math.pow(VPH / Math.SQRT2, 2) * K.TAU * F1 * P.Cf * 1e-6;
      roQ.set(P.filt === 'l' ? '—' : ((q / SR) * 100).toFixed(1) + ' % <small class="muted">of rating</small>');
      roP.set(P.filt === 'lcld' ? pd.toFixed(1) + ' W' : '—');
    }
    K.onTheme(draw);
    draw();
    return {};
  };
})();
