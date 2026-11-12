/* sim-grid.js — grid connection from zero, four small sims:
   gridbasic: converter voltage, inductor, grid voltage; move the converter voltage by hand and watch the current
   gridpi:    the same circuit with the voltage set by hand or by a PI controller, through a small grid-voltage drop
   dqframe:   the current as a turning arrow, seen from outside and from a frame that turns with the grid
   dcbucket:  the DC capacitor as a bucket; a PI controller on its voltage sets the wanted current */
(function () {
  'use strict';
  const { h } = K, TAU = K.TAU, W = TAU * 50, E = 326.6, L = 2e-3, R = 0.1;
  const ST = 'stroke:var(--ink2);stroke-width:2.4;fill:none', TX = 'font:700 15px var(--font);fill:var(--ink);text-anchor:middle', MU = 'font:600 13px var(--font);fill:var(--muted);text-anchor:middle';
  const coil = (x, y, n) => { let d = ''; for (let i = 0; i < n; i++) d += ' c0,-16 18,-16 18,0'; return `M${x},${y}${d}`; };
  const merge = (STEPS, k) => { const o = {}; for (const key of Object.keys(STEPS).map(Number).sort((a, b) => a - b)) if (k >= key) Object.assign(o, STEPS[key]); return o; };
  const svgEl = (w, hh) => K.s('svg', { viewBox: `0 0 ${w} ${hh}`, style: `width:${w}px;height:${hh}px` });

  SIMS.gridbasic = function (host, cfg) {
    const X = W * L, P = { amp: 100, ang: 0 };
    const cv = K.canvas(cfg.w || 640, 590);
    const sch = svgEl(380, 150);
    sch.innerHTML = `<circle cx="50" cy="75" r="34" style="fill:var(--panel);stroke:var(--s2);stroke-width:3"/><text x="50" y="72" style="${TX}">v</text><text x="50" y="90" style="${MU}">converter</text>
      <circle cx="330" cy="75" r="34" style="fill:var(--panel);stroke:var(--s1);stroke-width:3"/><text x="330" y="72" style="${TX}">e</text><text x="330" y="90" style="${MU}">grid</text>
      <path d="M50,41 V22 H150 ${coil(150, 22, 4).slice(coil(150, 22, 4).indexOf(' '))} H330 V41 M50,109 V130 H330 V109" style="${ST}"/>
      <text x="186" y="50" style="${TX}">inductor</text><path d="M262,22 l-13,-7 v14 z" style="fill:var(--s3)"/><text x="278" y="14" style="${TX};fill:var(--s3)">i</text>`;
    const sA = K.slider({ label: 'Converter voltage: size', min: 95, max: 105, step: 0.5, value: P.amp, fmt: (v) => v.toFixed(1) + ' % of grid', onInput: (v) => { P.amp = v; draw(); } });
    const sP = K.slider({ label: 'Converter voltage: timing', min: -5, max: 5, step: 0.5, value: P.ang, fmt: (v) => (v > 0 ? v + '° ahead' : v < 0 ? -v + '° behind' : 'same as grid'), onInput: (v) => { P.ang = v; draw(); } });
    const roI = K.readout('Current', 'big'), roP = K.readout('Active power into the grid'), roQ = K.readout('Reactive power into the grid');
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 640) + 'px 1fr'; host.style.gap = '18px';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '12px' } }, sch, sA.el, sP.el, roI.el, h('div', { class: 'ro-grid', style: { gridTemplateColumns: '1fr 1fr' } }, roP.el, roQ.el)));
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const V = (E * P.amp) / 100, d = (P.ang * Math.PI) / 180, ire = (V * Math.sin(d)) / X, iim = -(V * Math.cos(d) - E) / X;
      const N = 400, e = [], v = [], dv = [], i = [], es = [];
      for (let n = 0; n <= N; n++) { const th = (W * 0.04 * n) / N; e.push(E * Math.sin(th)); v.push(V * Math.sin(th + d)); dv.push(v[n] - e[n]); i.push(ire * Math.sin(th) + iim * Math.cos(th)); es.push(45 * Math.sin(th)); }
      const xt = [0, 10, 20, 30, 40].map((x) => [x, x + ' ms']), c1 = K.css('--s1'), c2 = K.css('--s2'), c3 = K.css('--s3'), mut = K.css('--muted'), bx = { x: 56, w: cv.w - 70 };
      K.plot(ctx, { ...bx, y: 30, h: 130 }, { xlim: [0, 40], ylim: [-400, 400], yticks: [[-300, '−300'], [0, '0'], [300, '300']], xticks: xt,
        series: [{ y: e, x0: 0, dx: 40 / N, color: c1, width: 4 }, { y: v, x0: 0, dx: 40 / N, color: c2, width: 2 }], title: 'Voltages [V]', legend: [['grid e', c1], ['converter v', c2]] });
      K.plot(ctx, { ...bx, y: 222, h: 100 }, { xlim: [0, 40], ylim: [-40, 40], yticks: [[-30, '−30'], [0, '0'], [30, '30']], xticks: xt,
        series: [{ y: dv, x0: 0, dx: 40 / N, color: K.css('--ink'), width: 2.6 }], title: 'The difference v − e: the voltage across the inductor [V]' });
      K.plot(ctx, { ...bx, y: 384, h: 160 }, { xlim: [0, 40], ylim: [-60, 60], yticks: [[-40, '−40'], [0, '0'], [40, '40']], xticks: xt,
        series: [{ y: es, x0: 0, dx: 40 / N, color: c1, width: 1.6, dash: [6, 4], alpha: 0.8 }, { y: i, x0: 0, dx: 40 / N, color: c3, width: 3.2 }], title: 'Current [A]', legend: [['current i', c3], ['grid voltage (shape only)', c1, [6, 4]]] });
      const I = Math.hypot(ire, iim), p = (1.5 * E * ire) / 1000, q = (-1.5 * E * iim) / 1000;
      roI.set(I.toFixed(0) + ' A <small class="muted">peak</small>');
      const f = (x) => (Math.abs(x) < 0.5 ? '0' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(1));
      roP.set(f(p) + ' kW'); roQ.set(f(q) + ' kvar');
    }
    K.onTheme(draw); draw();
    const S = cfg.steps;
    return { step(k) { if (!S) return; const o = merge(S, k); let ch = false;
      if (o.amp != null && o.amp !== P.amp) { P.amp = o.amp; sA.set(o.amp); ch = true; }
      if (o.ang != null && o.ang !== P.ang) { P.ang = o.ang; sP.set(o.ang); ch = true; }
      if (ch) draw(); } };
  };

  SIMS.gridpi = function (host, cfg) {
    const P = { mode: 'hand' }, TD = 0.05, T0 = 0.01, A = 30, TEND = 0.1, wc = TAU * 400, kp = wc * L, ki = wc * R, cache = {};
    function calc(mode) {
      if (cache[mode]) return cache[mode];
      const dt = 2e-6, o = { e: [], ir: [], i: [], er: [] };
      let i = 0, x = 0;
      for (let n = 0, N = Math.round(TEND / dt); n <= N; n++) {
        const t = n * dt, s = Math.sin(W * t), e = E * (t >= TD ? 0.95 : 1) * s, a = t >= T0 ? A : 0, ir = a * s;
        let v;
        if (mode === 'hand') v = E * s + L * a * W * Math.cos(W * t) + R * ir;
        else { const er = ir - i; x += ki * er * dt; v = e + kp * er + x; }
        i += ((v - e - R * i) / L) * dt;
        if (n % 50 === 0) { o.e.push(e); o.ir.push(ir); o.i.push(i); o.er.push(K.clamp(ir - i, -14, 14)); }
      }
      return (cache[mode] = o);
    }
    const cv = K.canvas(cfg.w || 640, 590), sch = svgEl(390, 215);
    const seg = K.seg({ label: 'Converter voltage', options: [['hand', 'set by hand'], ['pi', 'set by a PI controller']], value: P.mode, onChange: (v) => { P.mode = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 640) + 'px 1fr'; host.style.gap = '18px';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '14px' } }, sch, seg.el));
    function drawSch() {
      const on = P.mode === 'pi', lp = `stroke:var(--s3);stroke-width:2.4;fill:none;opacity:${on ? 1 : 0.22}`, lt = `font:600 13px var(--font);fill:var(--s3);opacity:${on ? 1 : 0.3}`;
      sch.innerHTML = `<rect x="8" y="26" width="104" height="48" rx="6" style="fill:var(--panel);stroke:var(--s2);stroke-width:3"/><text x="60" y="55" style="${TX}">converter</text>
        <circle cx="352" cy="50" r="28" style="fill:var(--panel);stroke:var(--s1);stroke-width:3"/><text x="352" y="55" style="${TX}">grid</text>
        <path d="M112,50 H150 ${coil(150, 50, 4).slice(coil(150, 50, 4).indexOf(' '))} H324" style="${ST}"/><text x="186" y="26" style="${MU}">inductor</text>
        <circle cx="272" cy="50" r="4" style="fill:var(--s3);opacity:${on ? 1 : 0.22}"/>
        <path d="M272,50 V140 H228" style="${lp}"/><path d="M228,140 l10,-6 v12 z" style="fill:var(--s3);opacity:${on ? 1 : 0.22}"/><text x="280" y="104" style="${lt}">measured</text><text x="280" y="120" style="${lt}">current</text>
        <rect x="148" y="118" width="80" height="44" rx="6" style="fill:var(--panel);stroke:var(--s3);stroke-width:3;opacity:${on ? 1 : 0.22}"/><text x="188" y="145" style="${TX};opacity:${on ? 1 : 0.3}">PI</text>
        <path d="M188,200 V166" style="${lp}"/><path d="M188,162 l-6,10 h12 z" style="fill:var(--s3);opacity:${on ? 1 : 0.22}"/><text x="188" y="213" style="${lt};text-anchor:middle">wanted current</text>
        <path d="M148,140 H60 V78" style="${lp}"/><path d="M60,74 l-6,10 h12 z" style="fill:var(--s3);opacity:${on ? 1 : 0.22}"/><text x="68" y="104" style="${lt}">grid voltage</text><text x="68" y="120" style="${lt}">+ correction</text>`;
    }
    function draw() {
      drawSch();
      const ctx = cv.ctx; cv.clear();
      const o = calc(P.mode), n = o.i.length, dx = 100 / (n - 1), xt = [0, 20, 40, 60, 80, 100].map((x) => [x, x + ' ms']), bx = { x: 56, w: cv.w - 70 };
      const c1 = K.css('--s1'), c3 = K.css('--s3'), mut = K.css('--muted'), bad = K.css('--bad');
      const mark = (pl, y0, hh, lab) => { const x = pl.X(TD * 1000); ctx.save(); ctx.strokeStyle = bad; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + hh); ctx.stroke(); ctx.setLineDash([]);
        if (lab) { ctx.fillStyle = bad; ctx.font = '700 13px ' + K.font; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(lab, x + 6, y0 + 4); } ctx.restore(); };
      let pl = K.plot(ctx, { ...bx, y: 30, h: 100 }, { xlim: [0, 100], ylim: [-420, 420], yticks: [[-300, '−300'], [0, '0'], [300, '300']], xticks: xt, series: [{ y: o.e, x0: 0, dx, color: c1, width: 2.4 }], title: 'Grid voltage [V]' });
      mark(pl, 30, 100);
      pl = K.plot(ctx, { ...bx, y: 192, h: 210 }, { xlim: [0, 100], ylim: [-90, 90], yticks: [[-60, '−60'], [-30, '−30'], [0, '0'], [30, '30'], [60, '60']], xticks: xt,
        series: [{ y: o.i, x0: 0, dx, color: c3, width: 3 }, { y: o.ir, x0: 0, dx, color: K.css('--ink'), width: 1.8, dash: [6, 4] }], title: 'Current [A]', legend: [['wanted', K.css('--ink'), [6, 4]], ['actual', c3]] });
      mark(pl, 192, 210, 'grid voltage drops 5 %');
      pl = K.plot(ctx, { ...bx, y: 464, h: 80 }, { xlim: [0, 100], ylim: [-14, 14], yticks: [[-10, '−10'], [0, '0'], [10, '10']], xticks: xt, series: [{ y: o.er, x0: 0, dx, color: bad, width: 2.2 }], title: 'Error: wanted − actual [A]' });
      mark(pl, 464, 80);
    }
    K.onTheme(draw); draw();
    const S = cfg.steps;
    return { step(k) { if (!S) return; const o = merge(S, k); if (o.mode && o.mode !== P.mode) { P.mode = o.mode; seg.set(o.mode); draw(); } } };
  };

  SIMS.dqframe = function (host, cfg) {
    const P = { id: 30, iq: 0, dq: false }; let th = 0.6;
    const cv = K.canvas(cfg.w || 700, 590);
    const sD = K.slider({ label: 'i<sub>d</sub> (active)', min: 0, max: 40, step: 1, value: P.id, fmt: (v) => v + ' A', onInput: (v) => { P.id = v; draw(); } });
    const sQ = K.slider({ label: 'i<sub>q</sub> (reactive)', min: -30, max: 30, step: 1, value: P.iq, fmt: (v) => (v < 0 ? '−' + -v : v) + ' A', onInput: (v) => { P.iq = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 700) + 'px 1fr'; host.style.gap = '18px';
    const roP = K.readout('Active power into the grid', 'big'), roQ = K.readout('Reactive power into the grid', 'big');
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '14px' } }, sD.el, roP.el, sQ.el, roQ.el, h('div', { class: 'tiny', html: 'The arrows really turn 50 times per second; here they are slowed down.' })));
    function arrow(ctx, x0, y0, x1, y1, col, w, dash) {
      const a = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0); if (len < 2) return;
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - 8 * Math.cos(a), y1 - 8 * Math.sin(a)); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 13 * Math.cos(a - 0.4), y1 - 13 * Math.sin(a - 0.4)); ctx.lineTo(x1 - 13 * Math.cos(a + 0.4), y1 - 13 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const c1 = K.css('--s1'), c2 = K.css('--s2'), c3 = K.css('--s3'), ink = K.css('--ink'), mut = K.css('--muted'), line = K.css('--line');
      const half = cv.w / 2, RC = 112, SC = 2.6, cyc = 46, cxL = half / 2 + 14, cxR = half + half / 2 + 14, cy = 46 + RC;
      const lab = (t, x, y, col, al, f) => { ctx.fillStyle = col; ctx.font = (f || '700 15px ') + K.font; ctx.textAlign = al || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); };
      const dial = (cx, title) => { ctx.strokeStyle = line; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, RC, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - RC, cy); ctx.lineTo(cx + RC, cy); ctx.moveTo(cx, cy - RC); ctx.lineTo(cx, cy + RC); ctx.stroke(); lab(title, cx, 18, ink, 'center', '650 15px '); };
      // left: seen from outside
      dial(cxL, 'Fixed frame: the arrows turn at 50 Hz');
      const ex = Math.cos(th), ey = Math.sin(th), ix = P.id * ex - P.iq * ey, iy = P.id * ey + P.iq * ex;
      arrow(ctx, cxL, cy, cxL + 106 * ex, cy - 106 * ey, c1, 2.6);
      const lgY = cy + RC + 22; ctx.lineWidth = 4; ctx.strokeStyle = c1; ctx.beginPath(); ctx.moveTo(cxL - 120, lgY); ctx.lineTo(cxL - 96, lgY); ctx.stroke(); lab('grid voltage', cxL - 90, lgY, mut, 'left', '600 13px ');
      ctx.strokeStyle = c2; ctx.beginPath(); ctx.moveTo(cxL + 22, lgY); ctx.lineTo(cxL + 46, lgY); ctx.stroke(); lab('current', cxL + 52, lgY, mut, 'left', '600 13px ');
      arrow(ctx, cxL, cy, cxL + SC * ix, cy - SC * iy, c2, 4.2);
      // right: seen from the turning frame
      const bxp = { x: half + 30, y: 30, w: half - 44, h: 2 * RC + 20 };
      if (P.dq) {
        dial(cxR, 'dq frame: turns with the grid voltage');
        lab('d', cxR + RC + 12, cy, mut); lab('q', cxR + 12, cy - RC + 10, mut);
        arrow(ctx, cxR, cy, cxR + 106, cy, c1, 2.6);
        const px = cxR + SC * P.id, py = cy - SC * P.iq, sd = P.iq < 0 ? -1 : 1, wr = K.css('--warn');
        if (P.id > 0.5) { arrow(ctx, cxR, cy + 7 * sd, px, cy + 7 * sd, c3, 3.4); lab('i_d', cxR + (SC * P.id) / 2, cy + 22 * sd, c3); }
        if (Math.abs(P.iq) > 0.5) { arrow(ctx, px, cy, px, py, wr, 3.4); lab('i_q', px + 18, (cy + py) / 2, wr); }
        arrow(ctx, cxR, cy, px, py, c2, 4.2);
      } else {
        ctx.save(); ctx.strokeStyle = line; ctx.setLineDash([6, 6]); ctx.strokeRect(bxp.x, bxp.y, bxp.w, bxp.h + 4); ctx.restore();
        lab('…and after the dq transformation?', bxp.x + bxp.w / 2, bxp.y + bxp.h / 2, mut, 'center', '600 16px ');
      }
      const f = (x) => (Math.abs(x) < 0.05 ? '0' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(1));
      roP.set(f((1.5 * E * P.id) / 1000) + ' kW'); roQ.set(f((-1.5 * E * P.iq) / 1000) + ' kvar');
      // bottom plots
      const N = 240, a = [], b = [], c = [], fd = [], fq = [];
      for (let n = 0; n <= N; n++) { const x = (2 * TAU * n) / N; for (const [arr, s] of [[a, 0], [b, 1], [c, 2]]) { const y = x - (s * TAU) / 3; arr.push(P.id * Math.cos(y) - P.iq * Math.sin(y)); } fd.push(P.id); fq.push(P.iq); }
      const cur = ((((th % (2 * TAU)) + 2 * TAU) % (2 * TAU)) / (2 * TAU)) * 40, xt = [0, 10, 20, 30, 40].map((x) => [x, x + ' ms']), py0 = 2 * RC + 122, ph = 160;
      K.plot(ctx, { x: 50, y: py0, w: half - 64, h: ph }, { xlim: [0, 40], ylim: [-52, 52], yticks: [[-40, '−40'], [0, '0'], [40, '40']], xticks: xt, cursor: cur,
        series: [{ y: a, x0: 0, dx: 40 / N, color: c2, width: 2.4 }, { y: b, x0: 0, dx: 40 / N, color: mut, width: 1.8 }, { y: c, x0: 0, dx: 40 / N, color: mut, width: 1.8, dash: [5, 4] }], title: 'Phase currents i_a, i_b, i_c [A]' });
      if (P.dq) K.plot(ctx, { x: half + 50, y: py0, w: half - 64, h: ph }, { xlim: [0, 40], ylim: [-52, 52], yticks: [[-40, '−40'], [0, '0'], [40, '40']], xticks: xt, cursor: cur,
        series: [{ y: fd, x0: 0, dx: 40 / N, color: c3, width: 3.4 }, { y: fq, x0: 0, dx: 40 / N, color: K.css('--warn'), width: 3.4 }], title: 'In the dq frame [A]', legend: [['i_d', c3], ['i_q', K.css('--warn')]] });
    }
    const loop = K.loop((dt) => { th += dt * TAU * 0.12; draw(); });
    K.onTheme(draw); draw();
    const S = cfg.steps;
    return { start: loop.start, stop: loop.stop, toggle() { loop.on ? loop.stop() : loop.start(); },
      step(k) { if (!S) return; const o = merge(S, k);
        if (o.dq != null) P.dq = o.dq; if (o.id != null && o.id !== P.id) { P.id = o.id; sD.set(o.id); } if (o.iq != null && o.iq !== P.iq) { P.iq = o.iq; sQ.set(o.iq); } draw(); } };
  };

  SIMS.dcbucket = function (host, cfg) {
    const C = 2e-3, P = { ev: false, mode: 'fixed' }, TEND = 0.1, TS = 0.02, KP = 0.5, KI = 40;
    function calc() {
      const dt = 20e-6, o = { v: [], pi: [], po: [], trip: null }, id0 = 10000 / (1.5 * E);
      let v = 800, x = 0;
      for (let n = 0, N = Math.round(TEND / dt); n <= N; n++) {
        const t = n * dt, pin = P.ev && t >= TS ? 20000 : 10000;
        let id = id0; if (P.mode === 'pi') { const e = v - 800; x += KI * e * dt; id = id0 + KP * e + x; }
        const pout = 1.5 * E * id;
        if (o.trip == null) { v += ((pin - pout) / (C * v)) * dt; if (v >= 900) o.trip = t * 1000; }
        if (n % 10 === 0 && o.trip == null) { o.v.push(v); o.po.push(pout / 1000); }
        if (n % 10 === 0) o.pi.push(pin / 1000);
      }
      return o;
    }
    const cv = K.canvas(cfg.w || 640, 590), sch = svgEl(400, 150);
    sch.innerHTML = `<rect x="4" y="38" width="78" height="54" rx="6" style="fill:var(--panel);${ST}"/><text x="43" y="70" style="${TX}">source</text><text x="43" y="110" style="${MU}">solar, battery…</text>
      <path d="M82,52 H240 M82,82 H240" style="${ST}"/><path d="M160,52 V60 M144,60 H176 M144,72 H176 M160,72 V82" style="stroke:var(--s1);stroke-width:3;fill:none"/><text x="160" y="110" style="${TX};fill:var(--s1)">DC capacitor</text><text x="160" y="128" style="${MU}">800 V</text>
      <rect x="240" y="38" width="84" height="54" rx="6" style="fill:var(--panel);${ST}"/><text x="282" y="70" style="${TX}">converter</text>
      <path d="M324,65 H350" style="${ST}"/><circle cx="374" cy="65" r="24" style="fill:var(--panel);${ST}"/><text x="374" y="70" style="${TX}">grid</text>
      <path d="M100,26 h34" style="stroke:var(--s3);stroke-width:3"/><path d="M140,26 l-10,-6 v12 z" style="fill:var(--s3)"/><text x="117" y="14" style="font:700 13px var(--font);fill:var(--s3);text-anchor:middle">power in</text>
      <path d="M326,26 h34" style="stroke:var(--s2);stroke-width:3"/><path d="M366,26 l-10,-6 v12 z" style="fill:var(--s2)"/><text x="343" y="14" style="font:700 13px var(--font);fill:var(--s2);text-anchor:middle">power out</text>`;
    const sE = K.seg({ label: 'Power coming in', options: [[false, 'constant'], [true, 'doubles at 20 ms']], value: P.ev, onChange: (v) => { P.ev = v; draw(); } });
    const sM = K.seg({ label: 'Wanted grid current', options: [['fixed', 'fixed'], ['pi', 'set by the DC-voltage PI']], value: P.mode, onChange: (v) => { P.mode = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 640) + 'px 1fr'; host.style.gap = '18px';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '14px' } }, sch, sE.el, sM.el));
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const o = calc(), xt = [0, 20, 40, 60, 80, 100].map((x) => [x, x + ' ms']), bx = { x: 56, w: cv.w - 70 }, dx = 0.2;
      K.plot(ctx, { ...bx, y: 30, h: 190 }, { xlim: [0, 100], ylim: [0, 26], yticks: [[0, '0'], [10, '10'], [20, '20']], xticks: xt,
        series: [{ y: o.pi, x0: 0, dx, color: K.css('--s3'), width: 4 }, { y: o.po, x0: 0, dx, color: K.css('--s2'), width: 2.4 }], title: 'Power [kW]', legend: [['in', K.css('--s3')], ['out to the grid', K.css('--s2')]] });
      const pl = K.plot(ctx, { ...bx, y: 290, h: 250 }, { xlim: [0, 100], ylim: [770, 920], yticks: [[800, '800'], [850, '850'], [900, '900']], xticks: xt,
        hlines: [{ v: 800, color: K.css('--good'), dash: [6, 4], label: 'wanted: 800 V' }, { v: 900, color: K.css('--bad'), dash: [6, 4], label: 'limit: 900 V' }],
        series: [{ y: o.v, x0: 0, dx, color: K.css('--s1'), width: 3.4 }], title: 'DC capacitor voltage [V]' });
      if (o.trip != null) { ctx.save(); ctx.fillStyle = K.css('--bad'); ctx.font = '700 15px ' + K.font; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('✕ over-voltage: converter trips', pl.X(o.trip) + 8, pl.Y(900) + 8); ctx.restore(); }
    }
    K.onTheme(draw); draw();
    const S = cfg.steps;
    return { step(k) { if (!S) return; const o = merge(S, k); let ch = false;
      if (o.ev != null && o.ev !== P.ev) { P.ev = o.ev; sE.set(o.ev); ch = true; }
      if (o.mode != null && o.mode !== P.mode) { P.mode = o.mode; sM.set(o.mode); ch = true; }
      if (ch) draw(); } };
  };
})();
