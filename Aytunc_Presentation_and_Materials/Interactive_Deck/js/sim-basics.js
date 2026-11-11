/* sim-basics.js — basics: drift-region physics, device class vs losses, sine-triangle PWM, modulation index. */
(function () {
  'use strict';
  const { h } = K;
  const SQ3 = Math.sqrt(3);
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sci = (v) => { // 1.57e14 -> "1.6·10¹⁴"
    const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    return m.toFixed(1) + '·10' + String(e).split('').map((c) => SUP[c]).join('');
  };
  const fmtW = (w) => (w < 1000 ? Math.round(w) + ' W' : (w / 1000).toFixed(1) + ' kW');
  const fmtF = (khz) => (khz < 10 ? khz.toFixed(1) : Math.round(khz)) + ' kHz';

  // ---------- drift region: why a lower blocking voltage is cheaper ----------
  // Ideal non-punch-through drift region in Si, Baliga's power-law fits (V_B in volts):
  //   W_D = 2.58e-2 V_B^(7/6) µm,  N_D = 2.0e18 V_B^(-4/3) cm^-3,  R_on,sp = 5.93e-6 V_B^2.5 mΩ·cm².
  // 4H-SiC: R_on,sp = 4 V_B² / (ε µ_n E_c³) with E_c ≈ 10× Si, ε_r 9.7 vs 11.7, µ_n 950 vs 1350.
  const SI = {
    w: (v) => 2.58e-2 * Math.pow(v, 7 / 6),
    n: (v) => 2.0e18 * Math.pow(v, -4 / 3),
    r: (v) => 5.93e-6 * Math.pow(v, 2.5),
    ec: (v) => (2 * v) / (2.58e-6 * Math.pow(v, 7 / 6)), // V/cm, from V_B = E_c W_D / 2
  };
  const SIC_R = (11.7 * 1350) / (9.7 * 950) / 1000;

  SIMS.drift = function (host, cfg) {
    const P = { vb: cfg.vb || 1200, vbD: cfg.vb || 1200, n: cfg.n || 2, u: cfg.u != null ? cfg.u : 1, ramp: false };
    const cvX = K.canvas(450, 470), cvR = K.canvas(400, 470);
    const ro1 = K.readout('One die rated V<sub>B</sub>'), ro2 = K.readout('One die rated V<sub>B</sub>/n'), ro3 = K.readout('n dies in series, same total area', 'big');
    const vbSeg = K.seg({ label: 'Rating V<sub>B</sub>', options: [[650, '650 V'], [1200, '1.2 kV'], [1700, '1.7 kV'], [3300, '3.3 kV']], value: P.vb, onChange: (v) => { P.vb = v; loop.start(); } });
    const nSeg = K.seg({ label: 'Split into n dies', options: [[2, '2'], [3, '3'], [4, '4']], value: P.n, onChange: (v) => { P.n = v; draw(); } });
    const rampB = K.btn('▶ Ramp the voltage', () => toggle());
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gridTemplateRows = 'auto auto auto';
    host.style.alignContent = 'start';
    host.style.gap = '12px';
    host.append(h('div', { style: { display: 'flex', gap: '16px' } }, cvX.el, cvR.el),
      h('div', { class: 'row', style: { alignItems: 'flex-end', gap: '18px' } }, vbSeg.el, nSeg.el, rampB),
      h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr 1fr' } }, ro1.el, ro2.el, ro3.el));

    // Cross-sections drawn sideways, to scale: current flows left to right, die height ∝ die area.
    function drawX() {
      const ctx = cvX.ctx; cvX.clear();
      const ink = K.css('--ink'), mut = K.css('--muted'), acc = K.css('--accent'), blue = K.css('--s1'), flow = K.css('--flow'), ink2 = K.css('--ink2');
      const SC = 400 / SI.w(3300), ESC = 56 / 3.5e5; // px per µm, px per V/cm
      const L = { m: 3, p: 6, s: 8, g: 10 };
      const box = (x, y, w, hh, col, a) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(x, y, w, hh); ctx.globalAlpha = 1; };
      function die(x, y, hh, vd, yb, ecLabel) { // returns the right edge
        const W = SI.w(vd) * SC, ec = SI.ec(vd), xd = W * Math.sqrt(P.u);
        box(x, y, L.m, hh, ink2, 0.8); x += L.m;
        box(x, y, L.p, hh, acc, 0.55); x += L.p;
        const xj = x;
        box(x, y, W, hh, blue, 0.16);
        box(x, y, xd, hh, flow, 0.38);
        ctx.strokeStyle = mut; ctx.lineWidth = 1; ctx.strokeRect(xj + 0.5, y + 0.5, W, hh - 1);
        x += W;
        box(x, y, L.s, hh, blue, 0.6); x += L.s;
        box(x, y, L.m, hh, ink2, 0.8); x += L.m;
        // field profile E(x) above the die: triangle with its peak at the junction
        ctx.strokeStyle = mut; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xj, yb - 60); ctx.lineTo(xj, yb); ctx.lineTo(xj + W, yb); ctx.stroke();
        ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xj, yb - ec * ESC); ctx.lineTo(xj + Math.max(W, 14), yb - ec * ESC); ctx.stroke(); ctx.setLineDash([]);
        if (ecLabel) { ctx.fillStyle = mut; ctx.font = '600 12px ' + K.font; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('E_c', xj - 4, yb - ec * ESC); }
        if (xd > 0.5) {
          ctx.beginPath(); ctx.moveTo(xj, yb); ctx.lineTo(xj, yb - ec * Math.sqrt(P.u) * ESC); ctx.lineTo(xj + xd, yb); ctx.closePath();
          ctx.globalAlpha = 0.18; ctx.fillStyle = acc; ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke();
        }
        return x;
      }
      const vb = P.vbD, n = P.n, X0 = 30;
      const head = (y, t1, t2) => {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = ink; ctx.font = '650 15px ' + K.font; ctx.fillText(t1, 14, y);
        ctx.fillStyle = mut; ctx.font = '600 13px ' + K.font; ctx.fillText(t2, 14, y + 19);
      };
      head(18, '1 die rated ' + Math.round(vb) + ' V, area A', 'W_D = ' + Math.round(SI.w(vb)) + ' µm · N_D = ' + sci(SI.n(vb)) + ' cm⁻³');
      die(X0, 118, 100, vb, 112, true);
      head(250, n + ' dies rated ' + Math.round(vb / n) + ' V in series, area A/' + n + ' each',
        'each W_D = ' + Math.round(SI.w(vb / n)) + ' µm · N_D = ' + sci(SI.n(vb / n)) + ' cm⁻³ · total ' + Math.round(n * SI.w(vb / n)) + ' µm');
      let x = X0;
      for (let j = 0; j < n; j++) {
        x = die(x, 348, 100 / n, vb / n, 342, j === 0);
        if (j < n - 1) { ctx.strokeStyle = ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 348 + 50 / n); ctx.lineTo(x + L.g, 348 + 50 / n); ctx.stroke(); x += L.g; }
      }
      // legend + applied voltage
      const lg = [['p⁺', acc, 0.55], ['n⁻ drift', blue, 0.16], ['depleted', flow, 0.38], ['n⁺ substrate', blue, 0.6]];
      let lx = 14; const ly = cvX.h - 32;
      ctx.font = '600 12px ' + K.font; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (const [t, c, a] of lg) { box(lx, ly - 6, 14, 12, c, a); ctx.fillStyle = mut; ctx.fillText(t, lx + 18, ly); lx += 28 + ctx.measureText(t).width; }
      ctx.fillStyle = acc; ctx.fillText('▲ field E(x)', lx, ly);
      ctx.fillStyle = ink; ctx.font = '650 14px ' + K.font;
      ctx.fillText('Applied: ' + Math.round(P.u * vb) + ' V (' + Math.round(P.u * 100) + ' % of V_B) · drawn to scale', 14, cvX.h - 10);
    }

    function drawR() {
      const ctx = cvR.ctx; cvR.clear();
      const ink = K.css('--ink'), grn = K.css('--s3'), blue = K.css('--s1'), red = K.css('--s2'), mut = K.css('--muted');
      const NS = 60, xs = [], ysi = [], ysc = [];
      for (let i = 0; i <= NS; i++) { const lv = 2 + (2 * i) / NS, v = Math.pow(10, lv); xs.push(lv); ysi.push(Math.log10(SI.r(v))); ysc.push(Math.log10(SI.r(v) * SIC_R)); }
      const { X, Y } = K.plot(ctx, { x: 66, y: 30, w: cvR.w - 80, h: cvR.h - 84 }, {
        xlim: [2, 4], ylim: [-3, 5],
        xticks: [[2, '100 V'], [Math.log10(300), ''], [3, '1 kV'], [Math.log10(3000), ''], [4, '10 kV']],
        yticks: [[-3, '10⁻³'], [-1, '10⁻¹'], [1, '10'], [3, '10³'], [5, '10⁵']],
        series: [{ x: xs, y: ysi, color: ink, width: 2.6 }, { x: xs, y: ysc, color: grn, width: 2.2, dash: [7, 5] }],
        title: 'Ideal R_on,sp [mΩ·cm²]', legend: [['Si', ink], ['4H-SiC', grn, [7, 5]]], xlabel: 'blocking voltage V_B', ylabelOff: 50,
      });
      const vb = P.vbD, n = P.n, r1 = SI.r(vb), rn = SI.r(vb / n), rs = Math.pow(n, -0.5) * r1;
      const dot = (lv, lr, col, lab, dx, dy, diamond) => {
        const px = X(lv), py = Y(lr);
        ctx.fillStyle = col; ctx.beginPath();
        if (diamond) { ctx.moveTo(px, py - 8); ctx.lineTo(px + 8, py); ctx.lineTo(px, py + 8); ctx.lineTo(px - 8, py); ctx.closePath(); }
        else ctx.arc(px, py, 6, 0, K.TAU);
        ctx.fill();
        ctx.font = '650 13px ' + K.font; ctx.textAlign = dx < 0 ? 'right' : 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(lab, px + dx, py + dy);
      };
      dot(Math.log10(vb), Math.log10(r1), ink, '1 die', -12, -12);
      dot(Math.log10(vb / n), Math.log10(rn), blue, '1 of ' + n + ' (÷' + Math.pow(n, 2.5).toFixed(1) + ')', 12, 16);
      dot(Math.log10(vb), Math.log10(rs), red, 'stack ×' + Math.pow(n, -0.5).toFixed(2), 12, 14, true);
      ctx.fillStyle = mut; ctx.font = '600 12px ' + K.font; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('slope 2.5: ×5.7 per doubling of V_B', X(2.05), Y(4.5));
    }

    function draw() {
      drawX(); drawR();
      const vb = P.vb, n = P.n;
      ro1.set(Math.round(SI.r(vb)) + ' mΩ·cm²');
      ro2.set(Math.round(SI.r(vb / n)) + ' mΩ·cm² <small class="muted">÷' + Math.pow(n, 2.5).toFixed(1) + '</small>');
      ro3.set(Math.pow(n, -0.5).toFixed(2) + ' × <small class="muted">one die</small>');
    }
    const loop = K.loop((dt) => {
      let busy = false;
      const d = P.vb - P.vbD;
      if (Math.abs(d) > 0.5) { P.vbD += d * Math.min(1, dt * 7); busy = true; } else P.vbD = P.vb;
      if (P.ramp) { P.u = Math.min(1, P.u + dt / 2.5); if (P.u >= 1) { P.ramp = false; rampB.innerHTML = '▶ Ramp the voltage'; } else busy = true; }
      draw();
      if (!busy) loop.stop();
    });
    function toggle() {
      if (P.ramp) { P.ramp = false; rampB.innerHTML = '▶ Ramp the voltage'; return; }
      if (P.u >= 1) P.u = 0;
      P.ramp = true; rampB.innerHTML = '❚❚ Pause'; loop.start();
    }
    K.onTheme(draw);
    draw();
    return { stop() { loop.stop(); P.ramp = false; P.vbD = P.vb; rampB.innerHTML = '▶ Ramp the voltage'; }, toggle, reset() { P.u = 1; P.ramp = false; draw(); } };
  };

  // ---------- device class vs leg losses, 1500 V link ----------
  // Illustrative data at Tj ≈ 125 °C for a 100 A-class die: on-state V0 + r·i, switching energy per (V·A).
  const DEV = {
    hv: { V0: 1.3, r: 0.015, Vd0: 1.2, rd: 0.012, ksw: 1.4e-6, krr: 0.65e-6 }, // 3.3 kV IGBT + diode
    lv: { V0: 1.0, r: 0.011, Vd0: 1.0, rd: 0.008, ksw: 3.2e-7, krr: 0.9e-7 }, // 1.2 kV IGBT (the deck's '1200' class)
    sic: { V0: 0, r: 0.020, Vd0: 0.9, rd: 0.010, ksw: 0.4e-7, krr: 0.05e-7 }, // 1.2 kV SiC MOSFET, SiC Schottky clamp
  };
  // Unity PF, sine PWM, i = Î sin θ. Two-level: switch duty (1 + m sin θ)/2 in its half-cycle.
  function loss2L(d, f, m, I, V) {
    const iT = I * (1 / (2 * Math.PI) + m / 8), qT = I * I * (1 / 8 + m / (3 * Math.PI));
    const iD = I * (1 / (2 * Math.PI) - m / 8), qD = I * I * (1 / 8 - m / (3 * Math.PI));
    return { c: 2 * (d.V0 * iT + d.r * qT + d.Vd0 * iD + d.rd * qD), s: 2 * f * (d.ksw + d.krr) * V * I / Math.PI };
  }
  // NPC: S1 conducts mÎ/4, S2 Î/π, D5 Î(1/π − m/4); S1 switches and D5 recovers against V = V_dc/2.
  function lossNPC(d, f, m, I, V) {
    const c = d.V0 * m * I / 4 + d.r * 2 * m * I * I / (3 * Math.PI) + d.V0 * I / Math.PI + d.r * I * I / 4
      + d.Vd0 * I * (1 / Math.PI - m / 4) + d.rd * I * I * (1 / 4 - 2 * m / (3 * Math.PI));
    return { c: 2 * c, s: 2 * f * (d.ksw + d.krr) * V * I / Math.PI };
  }

  SIMS.vloss = function (host, cfg) {
    const VDC = 1500, I = 100, M = 0.9, POUT = 0.5 * M * (VDC / 2) * I;
    const OPT = [
      { lab: '2L · 3.3 kV IGBT', bar: '2L · 3.3 kV', col: '--ink', fn: (f) => loss2L(DEV.hv, f, M, I, VDC), ev: (DEV.hv.ksw + DEV.hv.krr) * VDC * I },
      { lab: '3L NPC · 1.2 kV IGBT', bar: '3L · 1.2 kV IGBT', col: '--s4', fn: (f) => lossNPC(DEV.lv, f, M, I, VDC / 2), ev: (DEV.lv.ksw + DEV.lv.krr) * (VDC / 2) * I },
      { lab: '3L NPC · 1.2 kV SiC', bar: '3L · 1.2 kV SiC', col: '--s3', fn: (f) => lossNPC(DEV.sic, f, M, I, VDC / 2), ev: (DEV.sic.ksw + DEV.sic.krr) * (VDC / 2) * I },
    ];
    const tot = (o) => o.c + o.s;
    const budget = tot(OPT[0].fn(1000));
    const fEq = OPT.map((o) => (budget - o.fn(0).c) / o.fn(1).s / 1000); // kHz
    const P = { lf: Math.log10(cfg.f || 1), k: 99 };
    const cvL = K.canvas(886, 280), cvB = K.canvas(440, 290);
    const roB = K.readout('Budget: 2L at 1 kHz'), ro1 = K.readout('3L · 1.2 kV IGBT, same loss at'), ro2 = K.readout('3L · 1.2 kV SiC, same loss at');
    const fS = K.slider({ label: 'f<sub>sw</sub>', min: Math.log10(0.5), max: 2, step: 0.005, value: P.lf, fmt: (v) => fmtF(Math.pow(10, v)), onInput: (v) => { P.lf = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gridTemplateRows = 'auto 1fr';
    host.style.gap = '12px';
    host.append(cvL.el, h('div', { style: { display: 'grid', gridTemplateColumns: '440px 1fr', gap: '16px', alignItems: 'start' } }, cvB.el,
      h('div', { class: 'sim-col', style: { gap: '10px' } }, fS.el, roB.el, ro1.el, ro2.el,
        h('div', { class: 'tiny', html: `1500 V link, <i>Î</i> = 100 A, m = 0.9, unity PF: ${(POUT / 1000).toFixed(1)} kW per phase. Energy per switching event at 100 A: ${OPT.map((o) => (o.ev >= 0.01 ? Math.round(o.ev * 1e3) : (o.ev * 1e3).toFixed(1)) + ' mJ').join(' · ')}. Illustrative device data.` }))));
    function draw() {
      const f = Math.pow(10, P.lf);
      const cols = OPT.map((o) => K.css(o.col));
      let ctx = cvL.ctx; cvL.clear();
      const NS = 200, lx = [], ys = OPT.map(() => []);
      for (let i = 0; i <= NS; i++) {
        const l = Math.log10(0.5) + ((2 - Math.log10(0.5)) * i) / NS; lx.push(l);
        OPT.forEach((o, j) => ys[j].push(tot(o.fn(Math.pow(10, l) * 1000))));
      }
      const { X, Y } = K.plot(ctx, { x: 62, y: 30, w: cvL.w - 78, h: cvL.h - 76 }, {
        xlim: [Math.log10(0.5), 2], ylim: [0, 1200],
        xticks: [0.5, 1, 2, 5, 10, 20, 50, 100].map((v) => [Math.log10(v), v + (v === 100 ? ' kHz' : '')]),
        yticks: [0, 300, 600, 900, 1200].map((v) => [v, v + ' W']), ylabelOff: 54,
        hlines: [{ v: budget, color: K.css('--muted'), dash: [6, 5], label: 'budget ' + Math.round(budget) + ' W' }],
        series: OPT.map((o, j) => ({ x: lx, y: ys[j], color: cols[j], width: 2.8 })), cursor: P.lf,
        title: 'Semiconductor loss per leg vs switching frequency', xlabel: 'switching frequency (log scale)',
        legend: OPT.map((o, j) => [o.lab, cols[j]]),
      });
      if (P.k >= 4) [1, 2].forEach((j) => {
        if (!(fEq[j] > 0.5 && fEq[j] < 100)) return;
        ctx.fillStyle = cols[j]; ctx.beginPath(); ctx.arc(X(Math.log10(fEq[j])), Y(budget), 6, 0, K.TAU); ctx.fill();
      });
      ctx = cvB.ctx; cvB.clear();
      const L = OPT.map((o) => o.fn(f * 1000)), CAP = 1250;
      const cv = L.map((x) => Math.min(x.c, CAP)), sv = L.map((x, j) => Math.min(x.s, CAP - cv[j]));
      K.bars(ctx, { x: 62, y: 30, w: cvB.w - 74, h: cvB.h - 64 }, {
        n: 3, ylim: [0, 1400], yticks: [0, 400, 800, 1200].map((v) => [v, v + ' W']), maxBar: 84, fill: 0.55,
        labels: OPT.map((o) => o.bar), top: L.map((x) => fmtW(tot(x)) + ' · ' + (tot(x) / POUT * 100).toFixed(1) + ' %'),
        stack: [{ values: cv, color: K.css('--s1') }, { values: sv, color: K.css('--lvH') }],
        title: 'At ' + fmtF(f) + ': conduction (blue) + switching (red)',
      });
      roB.set(Math.round(budget) + ' W <small class="muted">(' + (budget / POUT * 100).toFixed(1) + ' %)</small>');
      ro1.set(P.k >= 4 ? '≈ ' + fmtF(fEq[1]) : '?');
      ro2.set(P.k >= 4 ? '≈ ' + fmtF(fEq[2]) : '?');
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };

  // ---------- sine-triangle PWM of one leg ----------
  const car = (x) => 1 - 2 * K.tri(x); // +1 at the start of each carrier period → pulses centred in the period

  SIMS.spwm = function (host, cfg) {
    const VH = 400, NP = 240; // V_dc/2, samples per carrier period
    const TH0 = 0.15 * K.TAU;
    const P = { m: cfg.m != null ? cfg.m : 0.8, mf: cfg.mf || 9, th: TH0, play: false, k: 99 };
    const cvA = K.canvas(880, 210), cvB = K.canvas(880, 170), cvZ = K.canvas(430, 250);
    const roR = K.readout('r at the cursor'), roD = K.readout('duty d'), roV = K.readout('⟨v<sub>aO</sub>⟩ this period');
    const mS = K.slider({ label: 'm<sub>a</sub>', min: 0, max: 1.3, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; calc(); } });
    const fS = K.slider({ label: 'm<sub>f</sub>', min: 3, max: 21, step: 1, value: P.mf, fmt: (v) => String(v), onInput: (v) => { P.mf = v; calc(); } });
    const playB = K.btn('▶ Run time', () => toggle());
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gridTemplateRows = 'auto auto 1fr';
    host.style.gap = '10px';
    host.append(cvA.el, cvB.el, h('div', { style: { display: 'grid', gridTemplateColumns: '430px 1fr', gap: '18px', alignItems: 'start' } }, cvZ.el,
      h('div', { class: 'sim-col', style: { gap: '12px' } }, mS.el, fS.el,
        h('div', { class: 'row' }, playB, h('span', { class: 'tiny' }, 'or drag on the top plot · V_dc = 800 V')),
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr 1fr' } }, roR.el, roD.el, roV.el))));
    let S = 0, c, r, rV, v, avg;
    function calc() {
      S = P.mf * NP;
      c = new Float32Array(S + 1); r = new Float32Array(S + 1); rV = new Float32Array(S + 1); v = new Float32Array(S + 1); avg = new Float32Array(S + 1);
      for (let i = 0; i <= S; i++) {
        const x = i / S;
        c[i] = car(P.mf * x); r[i] = P.m * Math.sin(K.TAU * x); rV[i] = r[i] * VH; v[i] = r[i] > c[i] ? VH : -VH;
      }
      // centred moving average over one carrier period (periodic signal)
      const half = NP / 2, at = (j) => v[((j % S) + S) % S];
      let acc = 0;
      for (let j = -half; j < half; j++) acc += at(j);
      for (let i = 0; i <= S; i++) { avg[i] = acc / NP; acc += at(i + half) - at(i - half); }
      draw();
    }
    function draw() {
      const ink = K.css('--ink'), mut = K.css('--muted'), red = K.css('--s2'), blue = K.css('--s1');
      const k = P.k, ic = Math.min(S, Math.round((P.th / K.TAU) * S)), dx = K.TAU / S;
      cvA.clear();
      const sa = [{ y: c, x0: 0, dx, color: mut, width: 1.4 }];
      if (k >= 1) sa.push({ y: r, x0: 0, dx, color: red, width: 2.6 });
      K.plot(cvA.ctx, { x: 50, y: 28, w: cvA.w - 64, h: cvA.h - 56 }, {
        xlim: [0, K.TAU], ylim: [-1.32, 1.32], yticks: [[-1, '−1'], [0, '0'], [1, '1']],
        xticks: [[0, '0'], [Math.PI / 2, '90°'], [Math.PI, '180°'], [1.5 * Math.PI, '270°'], [K.TAU, '360°']],
        bands: k >= 1 ? [{ y0: 1, y1: 1.32, color: 'rgba(192,57,43,.07)' }, { y0: -1.32, y1: -1, color: 'rgba(192,57,43,.07)' }] : null,
        series: sa, cursor: P.th, title: k >= 1 ? 'Carrier c(t) and reference r(t) = m_a sin ω₁t' : 'Carrier c(t): a triangle at the switching frequency f_c',
        legend: k >= 1 ? [['carrier', mut], ['reference', red]] : [['carrier', mut]],
      });
      cvB.clear();
      const sb = [];
      if (k >= 2) sb.push({ y: v, x0: 0, dx, color: ink, width: 1.2, step: true, alpha: 0.22 }, { y: v, x0: 0, dx, color: ink, width: 1.8, step: true, n: ic + 1 });
      if (k >= 3) sb.push({ y: rV, x0: 0, dx, color: red, width: 1.6, dash: [6, 5] }, { y: avg, x0: 0, dx, color: blue, width: 2.8 });
      K.plot(cvB.ctx, { x: 50, y: 28, w: cvB.w - 64, h: cvB.h - 40 }, {
        xlim: [0, K.TAU], ylim: [-470, 470], yticks: [[-400, '−400'], [0, '0'], [400, '400']],
        series: sb, cursor: k >= 2 ? P.th : null, title: k >= 2 ? 'Pole voltage v_aO [V]: S₁ = 1 while r > c' : 'Pole voltage v_aO [V]',
        legend: k >= 3 ? [['v_aO', ink], ['average over T_s', blue], ['r · V_dc/2', red, [6, 5]]] : k >= 2 ? [['v_aO', ink]] : null,
      });
      // zoom on the carrier period under the cursor
      cvZ.clear();
      const z = cvZ.ctx, ip = Math.min(P.mf - 1, Math.floor((P.th / K.TAU) * P.mf)), N = 300;
      const zc = new Float32Array(N + 1), zr = new Float32Array(N + 1), zs = new Float32Array(N + 1);
      let on = 0, xa = null, xb = null;
      for (let q = 0; q <= N; q++) {
        const x = (ip + q / N) / P.mf;
        zc[q] = car(P.mf * x); zr[q] = P.m * Math.sin(K.TAU * x); zs[q] = zr[q] > zc[q] ? 1 : 0;
        if (q < N && zs[q]) { on++; if (xa == null) xa = q / N; xb = (q + 1) / N; }
      }
      const d = on / N;
      const zs1 = [{ y: zc, x0: 0, dx: 1 / N, color: mut, width: 1.8 }];
      if (k >= 1) zs1.push({ y: zr, x0: 0, dx: 1 / N, color: red, width: 2.6 });
      const A = K.plot(z, { x: 46, y: 26, w: cvZ.w - 60, h: 128 }, {
        xlim: [0, 1], ylim: [-1.15, 1.15], yticks: [[-1, '−1'], [0, '0'], [1, '1']],
        series: zs1, title: 'Zoom: carrier period ' + (ip + 1) + ' of ' + P.mf,
      });
      if (k >= 2 && xa != null) {
        z.globalAlpha = 0.13; z.fillStyle = blue; z.fillRect(A.X(xa), 26, A.X(xb) - A.X(xa), 128); z.globalAlpha = 1;
      }
      if (k >= 2) {
        const B = K.plot(z, { x: 46, y: 182, w: cvZ.w - 60, h: 38 }, {
          xlim: [0, 1], ylim: [-0.25, 1.35], yticks: [[0, '0'], [1, '1']],
          series: [{ y: zs, x0: 0, dx: 1 / N, color: ink, width: 2.4, step: true }], title: 'S₁',
        });
        z.strokeStyle = mut; z.fillStyle = mut; z.lineWidth = 1.2; z.font = '600 13px ' + K.font; z.textBaseline = 'middle'; z.textAlign = 'center';
        const yT = 240;
        z.beginPath(); z.moveTo(B.X(0), yT - 5); z.lineTo(B.X(0), yT + 5); z.moveTo(B.X(1), yT - 5); z.lineTo(B.X(1), yT + 5); z.moveTo(B.X(0), yT); z.lineTo(B.X(0.44), yT); z.moveTo(B.X(0.56), yT); z.lineTo(B.X(1), yT); z.stroke();
        z.fillText('T_s', B.X(0.5), yT);
        if (k >= 3 && xa != null && d < 0.999) {
          z.fillStyle = blue; z.font = '700 14px ' + K.font;
          z.fillText('d·T_s', (B.X(xa) + B.X(xb)) / 2, B.Y(0.45));
        }
      }
      const rc = P.m * Math.sin(P.th);
      roR.set((rc >= 0 ? '+' : '−') + Math.abs(rc).toFixed(2));
      roD.set(k >= 2 ? d.toFixed(2) : '–');
      roV.set(k >= 2 ? K.fmtV((2 * d - 1) * VH) : '–');
    }
    // drag on the top plot to move the time cursor
    let drag = false;
    const setFrom = (e) => { const [x] = K.evPos(cvA, e); P.th = K.clamp(((x - 50) / (cvA.w - 64)) * K.TAU, 0, K.TAU - 1e-6); draw(); };
    cvA.el.style.cursor = 'ew-resize';
    cvA.el.addEventListener('pointerdown', (e) => { drag = true; cvA.el.setPointerCapture(e.pointerId); setFrom(e); });
    cvA.el.addEventListener('pointermove', (e) => { if (drag) setFrom(e); });
    cvA.el.addEventListener('pointerup', () => { drag = false; });
    const loop = K.loop((dt) => { P.th += (dt * K.TAU) / 10; if (P.th >= K.TAU) P.th -= K.TAU; draw(); });
    function toggle() { P.play = !P.play; if (P.play) loop.start(); else loop.stop(); playB.innerHTML = P.play ? '❚❚ Pause' : '▶ Run time'; }
    K.onTheme(draw);
    calc();
    return {
      stop() { loop.stop(); P.play = false; playB.innerHTML = '▶ Run time'; },
      toggle, step(k) { P.k = k; draw(); }, reset() { P.th = TH0; draw(); },
    };
  };

  // ---------- modulation index and frequency ratio ----------
  // Fundamental of the clipped local average (m_f → ∞), normalized to V_dc/2.
  function v1Avg(m) {
    if (m <= 1) return m;
    const tc = Math.asin(1 / m);
    return (4 / Math.PI) * (m * (tc / 2 - Math.sin(2 * tc) / 4) + Math.cos(tc));
  }

  SIMS.mindex = function (host, cfg) {
    const VH = 400, S = 8192, F1 = 50;
    const P = { m: cfg.m != null ? cfg.m : 0.8, mf: cfg.mf || 15, sig: 'a' };
    const cvW = K.canvas(880, 180), cvS = K.canvas(880, 180), cvM = K.canvas(430, 270);
    const roV1 = K.readout('Fundamental of v<sub>aO</sub>'), roThd = K.readout('THD (shown signal)'), roReg = K.readout('Region'), roClu = K.readout('Strongest harmonic');
    const mS = K.slider({ label: 'm<sub>a</sub>', min: 0, max: 3, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; calc(); } });
    const fS = K.slider({ label: 'm<sub>f</sub>', min: 3, max: 45, step: 1, value: P.mf, fmt: (v) => String(v), onInput: (v) => { P.mf = v; calc(); } });
    const sSeg = K.seg({ options: [['a', 'pole v<sub>aO</sub>'], ['ab', 'line-to-line v<sub>ab</sub>']], value: P.sig, onChange: (v) => { P.sig = v; calc(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.style.gridTemplateRows = 'auto auto 1fr';
    host.style.gap = '10px';
    host.append(cvW.el, cvS.el, h('div', { style: { display: 'grid', gridTemplateColumns: '430px 1fr', gap: '18px', alignItems: 'start' } }, cvM.el,
      h('div', { class: 'sim-col', style: { gap: '10px' } }, mS.el, fS.el, sSeg.el,
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roV1.el, roThd.el, roReg.el, roClu.el))));
    const va = new Float32Array(S), vb = new Float32Array(S), sig = new Float32Array(S), fund = new Float32Array(S), ref = new Float32Array(S);
    let amp = null, v1a = 0;
    const fundOf = (x) => { // [a1, b1] of a one-period signal
      let a = 0, b = 0;
      for (let i = 0; i < S; i++) { const th = (K.TAU * i) / S; a += x[i] * Math.cos(th); b += x[i] * Math.sin(th); }
      return [(2 * a) / S, (2 * b) / S];
    };
    function calc() {
      for (let i = 0; i < S; i++) {
        const th = (K.TAU * i) / S, cc = car((P.mf * i) / S);
        va[i] = P.m * Math.sin(th) > cc ? VH : -VH;
        vb[i] = P.m * Math.sin(th - K.TAU / 3) > cc ? VH : -VH;
        sig[i] = P.sig === 'a' ? va[i] : va[i] - vb[i];
        ref[i] = P.sig === 'a' ? P.m * VH * Math.sin(th) : SQ3 * P.m * VH * Math.sin(th + Math.PI / 6);
      }
      const [a1, b1] = fundOf(sig);
      for (let i = 0; i < S; i++) { const th = (K.TAU * i) / S; fund[i] = a1 * Math.cos(th) + b1 * Math.sin(th); }
      const fa = fundOf(va); v1a = Math.hypot(fa[0], fa[1]);
      amp = K.harmonics(sig);
      draw();
    }
    function draw() {
      const ink = K.css('--ink'), mut = K.css('--muted'), red = K.css('--s2'), blue = K.css('--s1');
      const ab = P.sig === 'ab', base = ab ? SQ3 * VH : VH;
      cvW.clear();
      K.plot(cvW.ctx, { x: 54, y: 28, w: cvW.w - 68, h: cvW.h - 40 }, {
        xlim: [0, S], ylim: ab ? [-900, 900] : [-470, 470], yticks: ab ? [[-800, '−800'], [0, '0'], [800, '800']] : [[-400, '−400'], [0, '0'], [400, '400']],
        series: [{ y: sig, x0: 0, dx: 1, color: ink, width: 1.2, step: true, alpha: 0.75 }, { y: ref, x0: 0, dx: 1, color: red, width: 1.8, dash: [6, 5] }, { y: fund, x0: 0, dx: 1, color: blue, width: 2.8 }],
        title: ab ? 'Line-to-line voltage v_ab [V]' : 'Pole voltage v_aO [V]', legend: [['switched', ink], ['fundamental', blue], ['reference × V_dc/2', red, [6, 5]]],
      });
      cvS.clear();
      const H = Math.min(150, 3 * P.mf + 6), vals = [], labels = [];
      for (let hh = 1; hh <= H; hh++) {
        vals.push((amp[hh] / base) * 100);
        labels.push(hh === 1 || hh % P.mf === 0 ? (hh === 1 ? '1' : String(hh)) : '');
      }
      K.bars(cvS.ctx, { x: 54, y: 28, w: cvS.w - 68, h: cvS.h - 62 }, {
        n: H, ylim: [0, 100], yticks: [[0, '0'], [50, '50 %'], [100, '100 %']], labels, fill: 0.8,
        stack: [{ values: vals.map((x) => Math.min(x, 100)), color: (j) => (j === 0 ? K.css('--ink2') : K.css('--s2')) }],
        title: `Spectrum, % of ${ab ? '√3·V_dc/2' : 'V_dc/2'} — labels at h = 1 and multiples of m_f`, xlabel: 'harmonic order h',
      });
      cvM.clear();
      const NS = 150, mx = [], my = [];
      for (let i = 0; i <= NS; i++) { const m = (3 * i) / NS; mx.push(m); my.push(v1Avg(m)); }
      const ctx = cvM.ctx;
      const { X, Y } = K.plot(ctx, { x: 52, y: 28, w: cvM.w - 66, h: cvM.h - 74 }, {
        xlim: [0, 3], ylim: [0, 1.45], xticks: [[0, '0'], [1, '1'], [2, '2'], [3, '3']],
        yticks: [[0, '0'], [0.5, '0.5'], [1, '1'], [4 / Math.PI, '4/π']],
        hlines: [{ v: 4 / Math.PI, color: mut, dash: [4, 4] }],
        series: [{ x: [0, 1.45], y: [0, 1.45], color: mut, width: 1.2, dash: [5, 5] }, { x: mx, y: my, color: ink, width: 2.6 }],
        title: 'Fundamental / (V_dc/2) vs m_a', xlabel: 'm_a',
      });
      ctx.strokeStyle = mut; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(1), Y(0)); ctx.lineTo(X(1), Y(1.45)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = mut; ctx.font = '600 13px ' + K.font; ctx.textBaseline = 'middle';
      ctx.textAlign = 'right'; ctx.fillText('linear', X(1) - 8, Y(0.2));
      ctx.textAlign = 'left'; ctx.fillText('overmodulation', X(1) + 8, Y(0.2));
      ctx.fillStyle = red; ctx.beginPath(); ctx.arc(X(P.m), Y(v1a / VH), 6.5, 0, K.TAU); ctx.fill();
      let hk = 2;
      for (let k = 2; k <= H; k++) if (amp[k] > amp[hk]) hk = k;
      roV1.set(Math.round(v1a) + ' V <small class="muted">= ' + (v1a / VH).toFixed(3) + ' · V<sub>dc</sub>/2</small>');
      roThd.set((K.thd(amp) * 100).toFixed(0) + ' %');
      roReg.set(P.m <= 1.0001 ? '<span class="pill ok">linear</span>' : '<span class="pill warn">overmodulation</span>');
      roClu.set('h = ' + hk + ' <small class="muted">' + (hk * F1 >= 1000 ? (hk * F1 / 1000).toFixed(2) + ' kHz' : hk * F1 + ' Hz') + '</small>');
    }
    K.onTheme(draw);
    calc();
    return {};
  };
})();
