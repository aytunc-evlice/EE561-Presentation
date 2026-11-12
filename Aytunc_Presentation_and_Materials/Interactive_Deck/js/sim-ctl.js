/* sim-ctl.js — neutral-point balancing (switching-period average model) and dq current control. */
(function () {
  'use strict';
  const { h } = K;

  /* NP balancing, 3-phase NPC, carrier PWM average model.
     Duty of O for phase x: 1 − |r_x|  ->  midpoint current  i_O = Σ (1 − |r_x|) i_x  (drawn from O)
     Ideal source holds v1 + v2 = Vdc, so  C dΔV/dt = i_O − i_bleed   with ΔV = v1 − v2.
     A common offset r0 changes i_O by −Σ sign(r_x) i_x · r0, a gain that follows the active power. */
  SIMS.npbal = function (host, cfg) {
    const C = 4.7e-3, I = 50, F1 = 50, DT = 50e-6, WIN = 0.2, NW = Math.round(WIN / DT), NA = Math.round(0.02 / DT);
    const P = { m: 0.8, phi: 0, on: true, naive: false, bleed: 0, speed: 0.1, kp: 0.0015, ki: 0.03, play: true };
    for (const k of ['m', 'phi', 'on', 'naive', 'bleed', 'speed']) if (cfg[k] != null) P[k] = cfg[k];
    let st;
    const reset = (dv) => {
      st = { t: 0, th: 0, dv: dv == null ? 40 : dv, integ: 0, r0: 0, trip: false, k: 0,
        bDv: new Float32Array(NW), bR0: new Float32Array(NW), bIo: new Float32Array(NW), bIoA: new Float32Array(NW),
        ring: new Float32Array(NA), ringG: new Float32Array(NA), sumA: 0, sumG: 0, ra: 0, gAvg: 0 };
      st.bDv.fill(st.dv);
    };
    reset(cfg.dv0);
    const CW = cfg.w || 900, SIMPLE = !!cfg.simple;
    const cv = K.canvas(CW, 590);
    const roDv = K.readout('ΔV = v<sub>C1</sub> − v<sub>C2</sub>', 'big'), roV = K.readout('v<sub>C1</sub> / v<sub>C2</sub>'), roG = K.readout('Balancing authority ⟨Σ sign(r<sub>x</sub>) i<sub>x</sub>⟩'), roSt = K.readout('Status');
    const ctl = {
      on: K.seg({ label: 'Balancing loop', options: [[false, 'off'], [true, 'on']], value: P.on, onChange: (v) => { P.on = v; st.integ = 0; } }),
      law: K.seg({ label: 'Offset sign', options: [[false, 'r₀ = sign(P)·PI(ΔV)'], [true, 'naive r₀ = +PI(ΔV)']], value: P.naive, onChange: (v) => { P.naive = v; st.integ = 0; } }),
      m: K.slider({ label: 'm', min: 0.1, max: 1.0, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; } }),
      phi: K.slider({ label: 'φ', min: -180, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; } }),
      bleed: K.slider({ label: 'Leakage, upper half', min: 0, max: 3, step: 0.1, value: P.bleed, fmt: (v) => v.toFixed(1) + ' A', onInput: (v) => { P.bleed = v; } }),
      speed: K.slider({ label: 'Speed', min: 0.02, max: 0.5, step: 0.01, value: P.speed, fmt: (v) => '×' + v.toFixed(2), onInput: (v) => { P.speed = v; } }),
    };
    const playB = K.btn('❚❚ Pause', () => toggle());
    host.classList.add('sim');
    host.style.gridTemplateColumns = CW + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el),
      h('div', { class: 'sim-col', style: { gap: '10px' } }, ...(SIMPLE ? (cfg.loopCtl ? [ctl.on.el, ctl.bleed.el, ctl.speed.el] : [ctl.bleed.el, ctl.speed.el]) : [ctl.on.el, ctl.law.el, ctl.m.el, ctl.phi.el, ctl.bleed.el, ctl.speed.el]),
        h('div', { class: 'row' }, playB, K.btn(SIMPLE ? 'Kick: C1 +20 V, C2 −20 V' : 'Kick ΔV +40 V', () => { st.dv += 40; }), K.btn('Reset', () => { reset(cfg.dv0 != null ? cfg.dv0 : 40); })),
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, ...(SIMPLE ? [roV.el, roSt.el] : [roDv.el, roV.el, roG.el, roSt.el]))));

    function stepSim() {
      const w = K.TAU * F1;
      st.th += w * DT; if (st.th > K.TAU) st.th -= K.TAU;
      const phi = (P.phi * Math.PI) / 180, sgnP = Math.cos(phi) >= 0 ? 1 : -1;
      let r0 = 0;
      if (P.on) {
        const s = P.naive ? 1 : sgnP;
        const u = s * (P.kp * st.dv + st.integ);
        r0 = K.clamp(u, -0.2, 0.2);
        if (r0 === u) st.integ += P.ki * st.dv * DT * 1; // anti-windup: integrate only when unsaturated
      }
      st.r0 = r0;
      let io = 0, g = 0;
      for (let x = 0; x < 3; x++) {
        const a = st.th - (x * K.TAU) / 3;
        const r = K.clamp(P.m * Math.sin(a) + r0, -1, 1), ix = I * Math.sin(a - phi);
        io += (1 - Math.abs(r)) * ix;
        g += Math.sign(P.m * Math.sin(a)) * ix;
      }
      st.dv += ((io - P.bleed) / C) * DT;
      // 20 ms moving averages
      const j = st.k % NA;
      st.sumA += io - st.ring[j]; st.ring[j] = io;
      st.sumG += g - st.ringG[j]; st.ringG[j] = g;
      st.ra = st.sumA / NA; st.gAvg = st.sumG / NA;
      const b = st.k % NW;
      st.bDv[b] = st.dv; st.bR0[b] = r0; st.bIo[b] = io; st.bIoA[b] = st.ra;
      st.k++; st.t += DT;
      if (Math.abs(st.dv) > 100) st.trip = true;
    }
    function tick(dt) {
      if (!P.play || st.trip) { draw(); return; }
      const n = Math.round((dt * P.speed) / DT);
      for (let i = 0; i < n && !st.trip; i++) stepSim();
      draw();
    }
    function chrono(buf) { const out = new Float32Array(NW), s0 = st.k % NW; for (let i = 0; i < NW; i++) out[i] = buf[(s0 + i) % NW]; return out; }
    function draw() {
      const ctx = cv.ctx; cv.clear();
      if (SIMPLE) {
        const dv = chrono(st.bDv), v1 = dv.map((d) => 400 + d / 2), v2 = dv.map((d) => 400 - d / 2);
        const R0 = !!cfg.showR0;
        if (R0) K.plot(ctx, { x: 62, y: 410, w: cv.w - 78, h: 130 }, {
          xlim: [0, NW], ylim: [-0.25, 0.25], yticks: [[-0.2, '−0.2'], [0, '0'], [0.2, '+0.2']], xticks: [[0, '−200 ms'], [NW / 2, '−100 ms'], [NW, 'now']],
          series: [{ y: chrono(st.bR0), x0: 0, dx: 1, color: K.css('--accent'), width: 2.6 }], title: 'PI output: the offset r₀ added to all three references',
        });
        K.plot(ctx, { x: 62, y: 34, w: cv.w - 78, h: R0 ? 320 : cv.h - 80 }, {
          xlim: [0, NW], ylim: [330, 470], xticks: [[0, '−200 ms'], [NW / 2, '−100 ms'], [NW, 'now']],
          yticks: [[350, '350'], [400, '400'], [450, '450']],
          hlines: [{ v: 450, color: K.css('--bad'), dash: [5, 4], label: 'trip' }, { v: 350, color: K.css('--bad'), dash: [5, 4] }],
          series: [{ y: v1, x0: 0, dx: 1, color: K.css('--s2'), width: 3 }, { y: v2, x0: 0, dx: 1, color: K.css('--s1'), width: 3 }],
          title: 'Capacitor voltages [V]', legend: [['C1 (top)', K.css('--s2')], ['C2 (bottom)', K.css('--s1')]],
        });
        roV.set(Math.round(400 + st.dv / 2) + ' / ' + Math.round(400 - st.dv / 2) + ' V');
        roSt.set(st.trip ? '<span class="pill bad">trip</span>' : Math.abs(st.dv) < 5 ? '<span class="pill ok">balanced</span>' : '<span class="pill warn">' + (P.on ? 'coming back' : 'apart') + '</span>');
        return;
      }
      const xt = [[0, '−200 ms'], [NW / 2, '−100 ms'], [NW, 'now']];
      const box = SIMPLE ? (k) => (k === 0 ? { x: 62, y: 30, w: cv.w - 78, h: 230 } : { x: 62, y: 330, w: cv.w - 78, h: 220 }) : (k) => ({ x: 62, y: 30 + k * 188, w: cv.w - 78, h: 138 });
      K.plot(ctx, box(0), {
        xlim: [0, NW], ylim: [-120, 120], yticks: [[-100, '−100'], [-50, '−50'], [0, '0'], [50, '50'], [100, '100']], xticks: xt,
        hlines: [{ v: 100, color: K.css('--bad'), dash: [5, 4], label: 'trip' }, { v: -100, color: K.css('--bad'), dash: [5, 4] }],
        series: [{ y: chrono(st.bDv), x0: 0, dx: 1, color: K.css('--s1'), width: 2.4 }], title: 'Capacitor voltage difference ΔV [V]',
      });
      if (!SIMPLE) K.plot(ctx, box(1), {
        xlim: [0, NW], ylim: [-0.25, 0.25], yticks: [[-0.2, '−0.2'], [0, '0'], [0.2, '0.2']], xticks: xt,
        series: [{ y: chrono(st.bR0), x0: 0, dx: 1, color: K.css('--accent'), width: 2.4 }], title: 'Common offset r₀ added to all three references',
      });
      K.plot(ctx, box(SIMPLE ? 1 : 2), {
        xlim: [0, NW], ylim: [-60, 60], yticks: [[-50, '−50'], [0, '0'], [50, '50']], xticks: xt,
        series: [{ y: chrono(st.bIo), x0: 0, dx: 1, color: K.css('--muted'), width: 1.2, alpha: 0.7 }, { y: chrono(st.bIoA), x0: 0, dx: 1, color: K.css('--s2'), width: 2.6 }],
        title: SIMPLE ? 'Midpoint current i_O [A]: per period (grey), average (red)' : 'Midpoint current i_O [A]: per switching period (grey) and 20 ms average (red)',
      });
      roDv.set((st.dv >= 0 ? '+' : '−') + Math.abs(st.dv).toFixed(1) + ' V');
      roV.set(Math.round(400 + st.dv / 2) + ' / ' + Math.round(400 - st.dv / 2) + ' V');
      const gN = st.gAvg / ((6 / Math.PI) * I);
      roG.set(`${(gN * 100).toFixed(0)} % <small class="muted">of unity-PF value</small>`);
      roSt.set(st.trip ? '<span class="pill bad">trip: |ΔV| &gt; 100 V</span>' : Math.abs(st.dv) < 5 ? '<span class="pill ok">balanced</span>' : '<span class="pill warn">imbalanced</span>');
    }
    const loop = K.loop(tick);
    function toggle() { P.play = !P.play; playB.innerHTML = P.play ? '❚❚ Pause' : '▶ Play'; }
    K.onTheme(draw);
    draw();
    const ST = cfg.steps;
    return {
      start: loop.start, stop: loop.stop, toggle, reset() { reset(cfg.dv0 != null ? cfg.dv0 : 40); },
      step(k) {
        if (!ST) return;
        const o = {}; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) Object.assign(o, ST[key]);
        if (o.bleed != null && o.bleed !== P.bleed) { P.bleed = o.bleed; ctl.bleed.set(o.bleed); }
        if (o.on != null && o.on !== P.on) { P.on = o.on; ctl.on.set(o.on); }
      },
    };
  };

  /* dq current control of an L filter, averaged converter, PI with optional feed-forward and decoupling. */
  SIMS.dq = function (host, cfg) {
    const L = 2e-3, R = 0.1, W = K.TAU * 50, E0 = 326.6, TS = 100e-6, DT = 2e-6, TEND = 0.06;
    const P = { ff: true, dec: true, delay: true, bw: 400, vmax: 462 };
    for (const k of ['ff', 'dec', 'delay', 'bw', 'vmax']) if (cfg[k] != null) P[k] = cfg[k];
    const cv = K.canvas(cfg.w || 900, 560);
    const ctl = [
      K.seg({ label: 'Grid-voltage feed-forward', options: [[true, 'on'], [false, 'off']], value: P.ff, onChange: (v) => { P.ff = v; calc(); } }),
      K.seg({ label: 'ωL decoupling', options: [[true, 'on'], [false, 'off']], value: P.dec, onChange: (v) => { P.dec = v; calc(); } }),
      K.seg({ label: 'Computation delay', options: [[true, '1 sample'], [false, 'none (ideal)']], value: P.delay, onChange: (v) => { P.delay = v; calc(); } }),
      K.slider({ label: 'Bandwidth', min: 100, max: 1500, step: 50, value: P.bw, fmt: (v) => v + ' Hz', onInput: (v) => { P.bw = v; calc(); } }),
      K.seg({ label: 'Voltage limit', options: [[400, 'SPWM: V<sub>dc</sub>/2'], [462, 'min-max: V<sub>dc</sub>/√3']], value: P.vmax, onChange: (v) => { P.vmax = v; calc(); } }),
    ];
    const roE = K.readout('Peak i<sub>q</sub> disturbance'), roS = K.readout('Peak error after grid sag');
    const SIMPLE = !!cfg.simple;
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 900) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col' }, (SIMPLE ? [ctl[3]] : ctl).map((c) => c.el), SIMPLE ? null : h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roE.el, roS.el),
      h('div', { class: 'tiny', html: 'L = 2 mH, R = 0.1 Ω, 400 V<sub>LL</sub> grid (e<sub>d</sub> = 327 V), V<sub>dc</sub> = 800 V, sampling 10 kHz. PI: K<sub>p</sub> = ω<sub>c</sub>L, K<sub>i</sub> = ω<sub>c</sub>R. Events: i<sub>d</sub>* step at 5 ms, i<sub>q</sub>* step at 25 ms, 20 % grid sag at 40 ms.' })));
    let res = null, reveal = 1;
    function calc() {
      const wc = K.TAU * P.bw, kp = wc * L, ki = wc * R;
      // start in steady state at zero current: without feed-forward the integrator already holds e_d
      let id = 0, iq = 0, xd = P.ff ? 0 : E0, xq = 0, vd = E0, vq = 0, vdA = E0, vqA = 0, tNext = 0;
      const N = Math.round(TEND / DT), every = 10;
      const o = { t: [], id: [], iq: [], idr: [], iqr: [], vd: [], vq: [] };
      let maxIq = 0, maxSag = 0;
      for (let n = 0; n <= N; n++) {
        const t = n * DT;
        const idr = t >= 0.005 ? 30 : 0, iqr = t >= 0.025 ? -15 : 0, ed = t >= 0.04 ? 0.8 * E0 : E0;
        if (t >= tNext - 1e-12) {
          tNext += TS;
          const edm = ed, ed_ = idr - id, eq_ = iqr - iq;
          let ud = kp * ed_ + xd + (P.ff ? edm : 0) - (P.dec ? W * L * iq : 0);
          let uq = kp * eq_ + xq + (P.dec ? W * L * id : 0);
          const mag = Math.hypot(ud, uq), sat = mag > P.vmax;
          if (sat) { ud *= P.vmax / mag; uq *= P.vmax / mag; } else { xd += ki * ed_ * TS; xq += ki * eq_ * TS; }
          if (P.delay) { vdA = vd; vqA = vq; vd = ud; vq = uq; } else { vd = vdA = ud; vq = vqA = uq; }
        }
        const did = (vdA - ed - R * id + W * L * iq) / L, diq = (vqA - R * iq - W * L * id) / L;
        id += did * DT; iq += diq * DT;
        if (t > 0.005 && t < 0.025) maxIq = Math.max(maxIq, Math.abs(iq - iqr));
        if (t > 0.04) maxSag = Math.max(maxSag, Math.abs(id - idr), Math.abs(iq - iqr));
        if (n % every === 0) { o.t.push(t * 1000); o.id.push(id); o.iq.push(iq); o.idr.push(idr); o.iqr.push(iqr); o.vd.push(vdA); o.vq.push(vqA); }
      }
      res = o;
      roE.set(maxIq.toFixed(1) + ' A <small class="muted">during the i<sub>d</sub> step</small>');
      roS.set(maxSag.toFixed(1) + ' A');
      reveal = 0;
      draw();
    }
    function draw() {
      if (!res) return;
      const ctx = cv.ctx; cv.clear();
      const n = Math.max(2, Math.floor(res.t.length * reveal));
      const xt = [0, 10, 20, 30, 40, 50, 60].map((v) => [v, v + ' ms']);
      const c1 = K.css('--s1'), c2 = K.css('--s2'), mut = K.css('--muted');
      if (SIMPLE) {
        K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: 480 }, {
          xlim: [0, 60], ylim: [-30, 45], yticks: [[-30, '−30'], [-15, '−15'], [0, '0'], [15, '15'], [30, '30'], [45, '45']], xticks: xt,
          series: [{ x: res.t, y: res.idr, color: c1, width: 1.8, dash: [6, 4], alpha: 0.9 }, { x: res.t, y: res.iqr, color: c2, width: 1.8, dash: [6, 4], alpha: 0.9 },
            { x: res.t, y: res.id, color: c1, width: 3, n }, { x: res.t, y: res.iq, color: c2, width: 3, n }],
          title: 'Grid current in the rotating frame [A]', legend: [['i_d (active)', c1], ['i_q (reactive)', c2], ['reference', mut, [6, 4]]],
        });
        return;
      }
      K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: 220 }, {
        xlim: [0, 60], ylim: [-30, 45], yticks: [[-30, '−30'], [-15, '−15'], [0, '0'], [15, '15'], [30, '30'], [45, '45']], xticks: xt,
        series: [{ x: res.t, y: res.idr, color: c1, width: 1.5, dash: [6, 4], alpha: 0.8 }, { x: res.t, y: res.iqr, color: c2, width: 1.5, dash: [6, 4], alpha: 0.8 },
          { x: res.t, y: res.id, color: c1, width: 2.6, n }, { x: res.t, y: res.iq, color: c2, width: 2.6, n }],
        title: 'Grid currents in dq [A]', legend: [['i_d', c1], ['i_q', c2], ['references', mut, [6, 4]]],
      });
      K.plot(ctx, { x: 62, y: 312, w: cv.w - 78, h: 200 }, {
        xlim: [0, 60], ylim: [-150, 500], yticks: [[0, '0'], [200, '200'], [400, '400']], xticks: xt,
        hlines: [{ v: P.vmax, color: K.css('--bad'), dash: [5, 4], label: 'modulator limit' }],
        series: [{ x: res.t, y: res.vd, color: c1, width: 2.2, n }, { x: res.t, y: res.vq, color: c2, width: 2.2, n }],
        title: 'Converter voltage commands v_d, v_q [V]', legend: [['v_d', c1], ['v_q', c2]],
      });
    }
    const loop = K.loop((dt) => { if (reveal < 1) { reveal = Math.min(1, reveal + dt / 1.2); draw(); } });
    K.onTheme(draw);
    calc();
    return { start() { reveal = 0; loop.start(); }, stop: loop.stop, reset() { reveal = 0; } };
  };
})();
