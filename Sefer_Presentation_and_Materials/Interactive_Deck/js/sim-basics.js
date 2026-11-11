/* sim-basics.js — basics: device class vs leg losses. */
(function () {
  'use strict';
  const { h } = K;
  const fmtF = (khz) => (khz < 10 ? khz.toFixed(1) : Math.round(khz)) + ' kHz';

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
    const VDC = 1500, I = 100, M = 0.9;
    const OPT = [
      { lab: '2-level · 3.3 kV IGBT', col: '--ink', fn: (f) => loss2L(DEV.hv, f, M, I, VDC) },
      { lab: '3-level · 1.2 kV IGBT', col: '--s4', fn: (f) => lossNPC(DEV.lv, f, M, I, VDC / 2) },
      { lab: '3-level · 1.2 kV SiC', col: '--s3', fn: (f) => lossNPC(DEV.sic, f, M, I, VDC / 2) },
    ];
    const tot = (o) => o.c + o.s;
    const budget = tot(OPT[0].fn(1000));
    const fEq = OPT.map((o) => (budget - o.fn(0).c) / o.fn(1).s / 1000); // kHz
    const P = { k: 0 };
    const cv = K.canvas(cfg.w || 960, cfg.h || 520);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.append(cv.el);
    function draw() {
      const cols = OPT.map((o) => K.css(o.col));
      const ctx = cv.ctx; cv.clear();
      const NS = 200, lx = [], ys = OPT.map(() => []);
      for (let i = 0; i <= NS; i++) {
        const l = Math.log10(0.5) + ((2 - Math.log10(0.5)) * i) / NS; lx.push(l);
        OPT.forEach((o, j) => ys[j].push(tot(o.fn(Math.pow(10, l) * 1000))));
      }
      const { X, Y } = K.plot(ctx, { x: 70, y: 34, w: cv.w - 90, h: cv.h - 84 }, {
        xlim: [Math.log10(0.5), 2], ylim: [0, 1200],
        xticks: [0.5, 1, 2, 5, 10, 20, 50, 100].map((v) => [Math.log10(v), v + (v === 100 ? ' kHz' : '')]),
        yticks: [0, 300, 600, 900, 1200].map((v) => [v, v + ' W']), ylabelOff: 58,
        hlines: [{ v: budget, color: K.css('--muted'), dash: [6, 5] }],
        series: OPT.map((o, j) => ({ x: lx, y: ys[j], color: cols[j], width: 3.2 })),
        title: 'Semiconductor loss of one leg (1500 V, 100 A)', xlabel: 'switching frequency (log scale)',
        legend: OPT.map((o, j) => [o.lab, cols[j]]),
      });
      ctx.font = '600 15px ' + K.font; ctx.fillStyle = K.css('--muted'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('2-level at 1 kHz: ' + Math.round(budget) + ' W', X(Math.log10(8)), Y(budget) + 6);
      if (P.k < 1) return;
      ctx.font = '700 17px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      [1, 2].forEach((j) => {
        if (!(fEq[j] > 0.5 && fEq[j] < 100)) return;
        const x = X(Math.log10(fEq[j])), y = Y(budget);
        ctx.fillStyle = cols[j]; ctx.beginPath(); ctx.arc(x, y, 7, 0, K.TAU); ctx.fill();
        ctx.fillText('≈ ' + fmtF(fEq[j]), x, y - 12);
      });
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };
})();
