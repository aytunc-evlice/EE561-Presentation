/* sim-vis.js — pictures behind the equations: leg voltages, NPC midpoint current, how the phase
   current splits between NPC devices, flying-capacitor PWM, and the switching-energy triangle. */
(function () {
  'use strict';
  const { h, s } = K;
  const TAU = K.TAU, D2R = Math.PI / 180;

  // fill between lo(i) and hi(i) for i = 0..n-1 at x(i)
  function shade(ctx, X, Y, n, x, lo, hi, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.35 : alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(X(x(0)), Y(hi(0)));
    for (let i = 1; i < n; i++) ctx.lineTo(X(x(i)), Y(hi(i)));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(X(x(i)), Y(lo(i)));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function curve(ctx, X, Y, n, x, y, color, width, dash) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width || 2.4; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(X(x(0)), Y(y(0)));
    for (let i = 1; i < n; i++) ctx.lineTo(X(x(i)), Y(y(i)));
    ctx.stroke(); ctx.restore();
  }
  function label(ctx, str, x, y, color, o) {
    o = o || {};
    ctx.save();
    ctx.font = o.font || '700 16px ' + K.font;
    ctx.fillStyle = color;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function arrow(ctx, x0, y0, x1, y1, color, both) {
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const head = (xa, ya, xb, yb) => {
      const a = Math.atan2(yb - ya, xb - xa);
      ctx.beginPath(); ctx.moveTo(xb, yb);
      ctx.lineTo(xb - 11 * Math.cos(a - 0.4), yb - 11 * Math.sin(a - 0.4));
      ctx.lineTo(xb - 11 * Math.cos(a + 0.4), yb - 11 * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    };
    head(x0, y0, x1, y1); if (both) head(x1, y1, x0, y0);
    ctx.restore();
  }
  const fmtA = (v) => (v >= 0.05 ? '+' : v <= -0.05 ? '−' : '') + Math.abs(v).toFixed(1) + ' A';

  // ---------------- leg, line-to-line and phase voltages (3-level legs, nearest-level staircase) ----------------
  let uid = 0;
  SIMS.vlegs = function (host, cfg) {
    const m = cfg.m || 0.8, E = 400, NS = 720, W = cfg.w || 990, H = cfg.h || 560;
    const P = { th: 60, k: 0, play: true };
    const lev = (t) => Math.round(m * Math.sin(t)) * E;
    const va = [], vab = [], vn = [], van = [], ref = [];
    for (let i = 0; i <= NS; i++) {
      const t = (TAU * i) / NS, a = lev(t), b = lev(t - TAU / 3), c = lev(t + TAU / 3);
      va.push(a); vab.push(a - b); vn.push((a + b + c) / 3); van.push(a - (a + b + c) / 3); ref.push(m * E * Math.sin(t));
    }

    // circuit: split DC link, three 3-position legs, star-connected load
    const id = 'vl' + (++uid);
    const svg = s('svg', { class: 'sch', viewBox: '0 0 430 540' });
    const defs = s('defs');
    for (const [k, col] of [['r', 'var(--s2)'], ['b', 'var(--s1)'], ['g', 'var(--muted)']]) {
      const mk = s('marker', { id: id + k, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
      mk.append(s('path', { d: 'M0,0 L10,5 L0,10 Z', fill: col }));
      defs.append(mk);
    }
    svg.append(defs);
    const g = s('g'); svg.append(g);
    const RY = { P: 50, O: 190, N: 330 }, LX = [140, 250, 360];
    const wire = (pts) => g.append(s('polyline', { class: 'wire', points: K.pts(pts) }));
    for (const y of Object.values(RY)) wire([[40, y], [330, y]]);
    for (const [y0, y1] of [[50, 190], [190, 330]]) {
      const cy = (y0 + y1) / 2, c = s('g', { class: 'cap' });
      c.append(s('path', { d: `M40,${y0} V${cy - 7} M40,${cy + 7} V${y1}` }), s('path', { class: 'plate', d: `M22,${cy - 7} H58 M22,${cy + 7} H58` }));
      g.append(c);
    }
    for (const [k, y] of Object.entries(RY)) g.append(s('text', { class: 'rail', x: 14, y: y + 7, 'text-anchor': 'middle', fill: `var(--lv${k})`, text: k }));
    g.append(s('circle', { class: 'dot', cx: 40, cy: 190, r: 5 }));
    const levers = [];
    LX.forEach((x, j) => {
      g.append(s('rect', { x: x - 30, y: 26, width: 60, height: 326, rx: 6, fill: 'var(--panel)', stroke: 'var(--line)', 'stroke-width': 2 }));
      for (const y of Object.values(RY)) {
        g.append(s('line', { class: 'wire', x1: x - 30, y1: y, x2: x - 14, y2: y }));
        g.append(s('circle', { class: 'dot', cx: x - 14, cy: y, r: 5 }));
      }
      const lv = s('line', { x1: x + 10, y1: 338, x2: x - 14, y2: 50, stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round' });
      g.append(lv); levers.push(lv);
      g.append(s('circle', { cx: x + 10, cy: 338, r: 5, fill: 'var(--accent)' }));
      const xl = x + 10;
      wire([[xl, 338], [xl, 380]]);
      g.append(s('circle', { class: 'term', cx: xl, cy: 386, r: 7 }));
      g.append(s('text', { class: 'lbl', x: xl + 13, y: 380, text: 'abc'[j] }));
      wire([[xl, 393], [xl, 420]]);
      g.append(s('polyline', { class: 'wire', points: K.pts([[xl, 420], [xl - 8, 425], [xl + 8, 433], [xl - 8, 441], [xl + 8, 449], [xl - 8, 457], [xl, 462]]) }));
      wire([[xl, 462], [xl, 476], [260, 506]]);
    });
    g.append(s('circle', { class: 'dot', cx: 260, cy: 506, r: 5 }));
    g.append(s('text', { class: 'lbl', x: 276, y: 524, text: 'n' }));
    const arr = (d, col, mk, dash) => s('path', { d, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-dasharray': dash || null, 'marker-end': `url(#${id + mk})` });
    const aAO = arr('M48,198 Q66,392 140,388', 'var(--s2)', 'r');
    const tAO = s('text', { class: 'lbl', x: 74, y: 366, 'text-anchor': 'end', text: 'v_aO' });
    const aAB = arr('M252,404 L158,404', 'var(--s1)', 'b');
    const tAB = s('text', { class: 'lbl', x: 205, y: 430, 'text-anchor': 'middle', text: 'v_ab' });
    const aNO = arr('M44,200 Q24,520 248,510', 'var(--muted)', 'g', '7 6');
    const tNO = s('text', { class: 'lbl', x: 64, y: 488, text: 'v_nO' });
    tAO.style.fill = 'var(--s2)'; tAB.style.fill = 'var(--s1)'; tNO.style.fill = 'var(--muted)';
    g.append(aAO, tAO, aAB, tAB, aNO, tNO);

    const cv = K.canvas(W, H);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '400px 1fr';
    host.append(h('div', { class: 'sim-col', style: { justifyContent: 'center' } }, svg), h('div', { class: 'sim-col' }, cv.el));

    function draw() {
      const ctx = cv.ctx; cv.clear();
      const ink = K.css('--ink'), mut = K.css('--muted');
      const bx = 64, bw = W - 84, ph = 128, gap = 62;
      const xs = (i) => (360 * i) / NS, n = NS + 1;
      const cur = P.th;
      const xt = (lab) => [0, 90, 180, 270, 360].map((v) => [v, lab ? v + '°' : '']);
      // 1: pole voltage
      let y = 30;
      const p1 = K.plot(ctx, { x: bx, y, w: bw, h: ph }, { xlim: [0, 360], ylim: [-520, 520], yticks: [[-400, '−400'], [0, '0'], [400, '+400']], xticks: xt(false), cursor: cur,
        title: 'Pole voltage v_aO (from O): 3 levels', legend: [['v_aO', K.css('--s2')], ['reference, peak m·V_dc/2', mut, [6, 5]]] });
      curve(ctx, p1.X, p1.Y, n, xs, (i) => ref[i], mut, 2, [6, 5]);
      curve(ctx, p1.X, p1.Y, n, xs, (i) => va[i], K.css('--s2'), 3);
      const xa = p1.X(152);
      arrow(ctx, xa, p1.Y(0), xa, p1.Y(400), ink, true);
      label(ctx, 'ΔV = V_dc/(N − 1) = 400 V', xa + 10, p1.Y(290), ink, { align: 'left', font: '700 15px ' + K.font });
      // 2: line-to-line
      y += ph + gap;
      if (P.k >= 2) {
        const p2 = K.plot(ctx, { x: bx, y, w: bw, h: ph }, { xlim: [0, 360], ylim: [-950, 950], yticks: [[-800, '−800'], [0, '0'], [800, '+800']], xticks: xt(false), cursor: cur,
          title: 'Line-to-line v_ab = v_aO − v_bO: 5 levels' });
        curve(ctx, p2.X, p2.Y, n, xs, (i) => vab[i], K.css('--s1'), 3);
      }
      // 3: phase voltage and common mode
      y += ph + gap;
      if (P.k >= 3) {
        const p3 = K.plot(ctx, { x: bx, y, w: bw, h: ph }, { xlim: [0, 360], ylim: [-560, 560], yticks: [[-400, '−400'], [0, '0'], [400, '+400']], xticks: xt(true), cursor: cur,
          title: 'Phase v_an = v_aO − v_nO: the common mode v_nO is removed', legend: [['v_an', K.css('--s3')], ['v_nO', mut, [6, 5]]] });
        curve(ctx, p3.X, p3.Y, n, xs, (i) => vn[i], mut, 2.4, [6, 5]);
        curve(ctx, p3.X, p3.Y, n, xs, (i) => van[i], K.css('--s3'), 3);
      }
      // circuit: lever positions and live values at the cursor
      const t = cur * D2R;
      [lev(t), lev(t - TAU / 3), lev(t + TAU / 3)].forEach((v, j) => {
        levers[j].setAttribute('y2', v > 0 ? RY.P : v < 0 ? RY.N : RY.O);
      });
      const showAB = P.k >= 2, showNO = P.k >= 3;
      aAB.style.opacity = tAB.style.opacity = showAB ? 1 : 0;
      aNO.style.opacity = tNO.style.opacity = showNO ? 1 : 0;
    }
    const loop = K.loop((dt) => { if (P.play) { P.th = (P.th + 40 * dt) % 360; draw(); } });
    K.onTheme(draw);
    draw();
    return {
      start() { loop.start(); }, stop() { loop.stop(); },
      toggle() { P.play = !P.play; }, reset() { P.th = 60; draw(); },
      step(k) { P.k = k; draw(); },
    };
  };

  // ---------------- NPC midpoint current ----------------
  SIMS.midpt = function (host, cfg) {
    const P = { m: cfg.m || 0.8, phi: cfg.phi || 0, k: 0, forced: null };
    const I = 100, NS = 720, W = cfg.w || 900, H = cfg.h || 500;
    const cv = K.canvas(W, H);
    const sM = K.slider({ label: 'm', min: 0, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; draw(); } });
    const sPhi = K.slider({ label: 'φ (current lag)', min: 0, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; draw(); } });
    const seg = K.seg({ options: [[1, 'one leg'], [3, 'three legs']], value: 1, onChange: (v) => { P.forced = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr'; host.style.gridTemplateRows = 'auto auto'; host.style.alignContent = 'start'; host.style.gap = '8px';
    host.append(cv.el, h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px 26px', alignItems: 'center' } }, sM.el, sPhi.el, seg.el));

    const iO = (t, x) => (1 - Math.abs(P.m * Math.sin(t - x))) * I * Math.sin(t - x - P.phi * D2R);
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const legs = P.forced || (P.k >= 3 ? 3 : 1);
      seg.set(legs);
      const n = NS + 1, th = (i) => (360 * i) / NS, r = (i) => P.m * Math.sin(th(i) * D2R);
      const bx = 64, bw = W - 84;
      const xt = (lab) => [0, 90, 180, 270, 360].map((v) => [v, lab ? v + '°' : '']);
      const pa = K.plot(ctx, { x: bx, y: 30, w: bw, h: 170 }, { xlim: [0, 360], ylim: [0, 1], yticks: [[0, '0'], [1, 'T_s']], xticks: xt(false),
        title: 'Where the leg spends each switching period' });
      const dN = (i) => Math.max(0, -r(i)), dP = (i) => Math.max(0, r(i));
      shade(ctx, pa.X, pa.Y, n, th, () => 0, dN, K.css('--lvN'), 0.55);
      shade(ctx, pa.X, pa.Y, n, th, dN, (i) => 1 - dP(i), K.css('--lvO'), 0.16);
      shade(ctx, pa.X, pa.Y, n, th, (i) => 1 - dP(i), () => 1, K.css('--lvP'), 0.55);
      const ink = K.css('--ink');
      if (P.m > 0.25) {
        label(ctx, 'at P: r', pa.X(90), pa.Y(1 - P.m / 2), ink);
        label(ctx, 'at N: −r', pa.X(270), pa.Y(P.m / 2), ink);
      }
      label(ctx, 'at O: 1 − |r|', pa.X(180), pa.Y(0.5), ink);
      label(ctx, 'at O', pa.X(0) + 34, pa.Y(0.5), ink, { font: '700 14px ' + K.font });

      if (P.k < 1 && !P.forced) return;
      const pb = K.plot(ctx, { x: bx, y: 262, w: bw, h: H - 262 - 30 }, { xlim: [0, 360], ylim: [-I * 1.25, I * 1.25], yticks: [[-I, '−Î'], [0, '0'], [I, '+Î']], xticks: xt(true),
        title: legs === 3 ? 'Sum of three legs: the midpoint sees only a small ripple at 3f₁' : 'Phase current i_a and midpoint current ⟨i_O⟩ = (1 − |r|)·i_a',
        legend: [['i_a', K.css('--flow')], [legs === 3 ? 'Σ ⟨i_O⟩' : '⟨i_O⟩', K.css('--s1')]] });
      const ia = (i) => I * Math.sin((th(i) - P.phi) * D2R);
      const io = legs === 3 ? (i) => { const t = th(i) * D2R; return iO(t, 0) + iO(t, TAU / 3) + iO(t, -TAU / 3); } : (i) => iO(th(i) * D2R, 0);
      shade(ctx, pb.X, pb.Y, n, th, () => 0, io, K.css('--s1'), 0.3);
      curve(ctx, pb.X, pb.Y, n, th, ia, K.css('--flow'), 2.4, legs === 3 ? [6, 5] : null);
      curve(ctx, pb.X, pb.Y, n, th, io, K.css('--s1'), 3);
      let sum = 0, half = 0;
      for (let i = 0; i < NS; i++) { const v = io(i); sum += v; if (i < NS / 2) half += v; }
      label(ctx, `average: whole period ${fmtA(sum / NS)} · first half ${fmtA(half / (NS / 2))}`, bx + bw - 10, 262 + 16, ink, { align: 'right', font: '700 15px ' + K.font });
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); }, reset() { P.forced = null; draw(); } };
  };

  // ---------------- how the phase current splits between S1, D5 and S2 ----------------
  SIMS.devcur = function (host, cfg) {
    const P = { m: cfg.m || 0.9, k: 0 }, I = 100, NS = 720, W = cfg.w || 880, H = cfg.h || 390;
    const cv = K.canvas(W, H);
    const sM = K.slider({ label: 'modulation index m', min: 0.05, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; draw(); } });
    const tab = h('table', { class: 'tb nocase devtab' });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr'; host.style.gridTemplateRows = 'auto auto auto'; host.style.alignContent = 'start'; host.style.gap = '8px';
    host.append(cv.el, sM.el, tab);
    const M = (x) => `<span class="m">${x}</span>`;
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const m = P.m, n = NS + 1, th = (i) => (360 * i) / NS, sn = (i) => Math.sin(th(i) * D2R);
      const bx = 64, bw = W - 84;
      const xt = (lab) => [0, 90, 180, 270, 360].map((v) => [v, lab ? v + '°' : '']);
      const red = K.css('--lvP'), blue = K.css('--s1'), mut = K.css('--muted'), ink = K.css('--ink');
      const pos = (f) => (i) => (sn(i) > 0 ? f(i) : 0);
      const pa = K.plot(ctx, { x: bx, y: 30, w: bw, h: 100 }, { xlim: [0, 360], ylim: [0, 1.05], yticks: [[0, '0'], [1, '1']], xticks: xt(false),
        title: 'Duty (share of each switching period)', legend: [['S1: m sin θ', red], ['D5: 1 − m sin θ', blue]] });
      shade(ctx, pa.X, pa.Y, n, th, () => 0, pos((i) => m * sn(i)), red, 0.25);
      curve(ctx, pa.X, pa.Y, n, th, pos((i) => m * sn(i)), red, 2.6);
      curve(ctx, pa.X, pa.Y, NS / 2 + 1, th, (i) => 1 - m * sn(i), blue, 2.6);
      label(ctx, 'negative half: S4, D6 mirror this', pa.X(270), pa.Y(0.5), mut, { font: '600 14px ' + K.font });

      const pb = K.plot(ctx, { x: bx, y: 180, w: bw, h: H - 180 - 30 }, { xlim: [0, 360], ylim: [-I * 1.1, I * 1.15], yticks: [[-I, '−Î'], [0, '0'], [I, '+Î']], xticks: xt(true),
        title: 'Current = duty × i_a: S1 share (red) + D5 share (blue) = S2 current', legend: [['i_a', ink]] });
      const s1 = pos((i) => m * sn(i) * I * sn(i)), tot = pos((i) => I * sn(i));
      shade(ctx, pb.X, pb.Y, n, th, () => 0, s1, red, 0.55);
      shade(ctx, pb.X, pb.Y, n, th, s1, tot, blue, 0.45);
      shade(ctx, pb.X, pb.Y, n, th, (i) => (sn(i) < 0 ? I * sn(i) : 0), () => 0, mut, 0.15);
      curve(ctx, pb.X, pb.Y, n, th, (i) => I * sn(i), ink, 2.2);
      label(ctx, 'S1', pb.X(90), pb.Y(m * I * 0.45), '#fff');
      if (1 - m > 0.12) label(ctx, 'D5', pb.X(90), pb.Y(I * (m + (1 - m) / 2)), '#fff');
      label(ctx, 'D5', pb.X(22), pb.Y(I * 0.2), blue, { font: '700 14px ' + K.font });
      if (P.k >= 1) {
        const a1 = (m * I) / 4, a5 = I * (1 / Math.PI - m / 4);
        ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 2.4;
        for (const [v, col] of [[a1, red], [a5, blue]]) { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(pb.X(180), pb.Y(v)); ctx.lineTo(pb.X(360), pb.Y(v)); ctx.stroke(); }
        ctx.restore();
        label(ctx, `average over 360°: S1 ${a1.toFixed(1)} A`, pb.X(186), pb.Y(a1) - 12, red, { align: 'left', font: '700 14px ' + K.font });
        label(ctx, `D5 ${a5.toFixed(1)} A`, pb.X(186), pb.Y(a5) + 13, blue, { align: 'left', font: '700 14px ' + K.font });
      }
      const f1 = (v) => v.toFixed(1);
      tab.style.visibility = P.k >= 1 ? 'visible' : 'hidden';
      tab.innerHTML = `<tr><th></th><th class="c">average current</th><th class="c">RMS² (for r<sub>on</sub> loss)</th></tr>` +
        `<tr><td><b>S1</b></td><td class="c">${M('mÎ')}/4 = ${f1((m * I) / 4)} A</td><td class="c">2${M('mÎ')}²/3π</td></tr>` +
        `<tr><td><b>S2</b></td><td class="c">${M('Î')}/π = ${f1(I / Math.PI)} A</td><td class="c">${M('Î')}²/4</td></tr>` +
        `<tr><td><b>D5</b></td><td class="c">${M('Î')}(1/π − ${M('m')}/4) = ${f1(I * (1 / Math.PI - m / 4))} A</td><td class="c">${M('Î')}²(¼ − 2${M('m')}/3π)</td></tr>`;
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };

  // ---------------- flying capacitor with phase-shifted carriers ----------------
  SIMS.fcpwm = function (host, cfg) {
    const compact = !!cfg.compact;
    const P = { d: compact ? 0.5 : (cfg.d != null ? cfg.d : 0.6), dd: 0, sg: 1 };
    const W = cfg.w || (compact ? 560 : 860), H = cfg.h || (compact ? 230 : 500), NS = 1600, TT = 2;
    const cv = K.canvas(W, H);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr'; host.style.alignContent = 'start'; host.style.gap = '8px';
    host.append(cv.el);
    if (!compact) {
      const sD = K.slider({ label: 'duty d', min: 0.05, max: 0.95, step: 0.01, value: P.d, fmt: (v) => v.toFixed(2), onInput: (v) => { P.d = v; draw(); } });
      const sDD = K.slider({ label: 'd<sub>1</sub> − d<sub>2</sub>', min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2), onInput: (v) => { P.dd = v; draw(); } });
      const seg = K.seg({ options: [[1, 'i<sub>a</sub> &gt; 0'], [-1, 'i<sub>a</sub> &lt; 0']], value: 1, onChange: (v) => { P.sg = v; draw(); } });
      host.append(h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px 24px', alignItems: 'center' } }, sD.el, sDD.el, seg.el));
    }
    function run() {
      const d1 = K.clamp(P.d + P.dd / 2, 0, 1), d2 = K.clamp(P.d - P.dd / 2, 0, 1);
      const o = { d1, d2, t: [], c1: [], c2: [], s1: [], s2: [], i: [], v: [] };
      let v = 0;
      for (let k = 0; k <= NS; k++) {
        const t = (TT * k) / NS, a = K.tri(t), b = K.tri(t + 0.5), S1 = d1 > a ? 1 : 0, S2 = d2 > b ? 1 : 0, ic = (S1 - S2) * P.sg;
        if (k) v += ic * (TT / NS);
        o.t.push(t); o.c1.push(a); o.c2.push(b); o.s1.push(S1); o.s2.push(S2); o.i.push(ic); o.v.push(v);
      }
      const mean = o.v.reduce((x, y) => x + y, 0) / o.v.length;
      o.v = o.v.map((x) => x - mean);
      return o;
    }
    const stCol = { '11': '--lvP', '00': '--lvN', '10': '--s3', '01': '--s3' };
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const o = run(), n = NS + 1, x = (k) => o.t[k];
      const bx = 64, bw = W - 84, ink = K.css('--ink'), mut = K.css('--muted'), b1 = K.css('--s1'), g2 = K.css('--s2');
      const xt = (lab) => [0, 0.5, 1, 1.5, 2].map((v) => [v, lab ? (v === 0 ? '0' : v + ' T_s') : '']);
      if (!compact) {
        const pa = K.plot(ctx, { x: bx, y: 30, w: bw, h: 120 }, { xlim: [0, TT], ylim: [0, 1], yticks: [[0, '0'], [1, '1']], xticks: xt(false),
          title: 'Two carriers, half a period apart', legend: [['carrier 1 → S1', b1], ['carrier 2 → S2', g2]] });
        curve(ctx, pa.X, pa.Y, n, x, (k) => o.c1[k], b1, 2);
        curve(ctx, pa.X, pa.Y, n, x, (k) => o.c2[k], g2, 2);
        curve(ctx, pa.X, pa.Y, 2, (k) => k * TT, () => o.d1, b1, 2.4, [7, 5]);
        curve(ctx, pa.X, pa.Y, 2, (k) => k * TT, () => o.d2, g2, 2.4, [7, 5]);
        // gate signals with the state S1 S2 behind them
        const pb = K.plot(ctx, { x: bx, y: 196, w: bw, h: 96 }, { xlim: [0, TT], ylim: [-0.15, 2.3], yticks: [[0.4, 'S2'], [1.7, 'S1']], xticks: xt(false), title: 'State S1 S2: 10 charges C_fc, 01 discharges it (i_a > 0)' });
        let k0 = 0;
        for (let k = 1; k <= n; k++) {
          const st = (k < n ? '' + o.s1[k] + o.s2[k] : null), st0 = '' + o.s1[k0] + o.s2[k0];
          if (st !== st0) {
            const xa = pb.X(o.t[k0]), xb = pb.X(o.t[Math.min(k, NS)]);
            ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = K.css(stCol[st0]); ctx.fillRect(xa, pb.Y(2.3), xb - xa, pb.Y(-0.15) - pb.Y(2.3)); ctx.restore();
            if (xb - xa > 34) label(ctx, st0, (xa + xb) / 2, pb.Y(1.05), ink, { font: '700 15px ' + K.font });
            k0 = k;
          }
        }
        ctx.save(); ctx.lineWidth = 2.4;
        for (const [arr, off, col] of [[o.s1, 1.3, b1], [o.s2, 0, g2]]) {
          ctx.strokeStyle = col; ctx.beginPath();
          for (let k = 0; k < n; k++) { const xx = pb.X(o.t[k]), yy = pb.Y(off + 0.8 * arr[k]); if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
          ctx.stroke();
        }
        ctx.restore();
      }
      const y0 = compact ? 30 : 338, hc = H - y0 - 30;
      const pc = K.plot(ctx, { x: bx, y: y0, w: bw, h: hc }, { xlim: [0, TT], ylim: [compact ? -1.35 : -1.75, 1.35], yticks: [[-1, '−I'], [0, '0'], [1, '+I']], xticks: xt(true),
        title: compact ? 'd = 0.5: i_fc = ±I_pk for T_s/2 each' : 'i_fc = (S1 − S2)·i_a and the capacitor voltage V_fc',
        legend: [['i_fc', K.css('--flow')], ['V_fc', ink]] });
      ctx.save(); ctx.strokeStyle = K.css('--flow'); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let k = 0; k < n; k++) { const xx = pc.X(o.t[k]), yy = pc.Y(o.i[k]); if (k) { ctx.lineTo(xx, pc.Y(o.i[k - 1])); ctx.lineTo(xx, yy); } else ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.restore();
      const vs = 3.4;
      curve(ctx, pc.X, pc.Y, n, x, (k) => K.clamp(o.v[k] * vs, -1.3, 1.3), ink, 3);
      if (compact) {
        const yt = pc.Y(0.25 * vs), yb = pc.Y(-0.25 * vs), xm = pc.X(1.0);
        arrow(ctx, xm + 26, yt, xm + 26, yb, K.css('--accent'), true);
        label(ctx, 'ΔV_fc', xm + 36, (yt + yb) / 2, K.css('--accent'), { align: 'left' });
        label(ctx, 'slope I_pk/C_fc', pc.X(0.03), pc.Y(-0.6), ink, { align: 'left', font: '700 14px ' + K.font });
        arrow(ctx, pc.X(0.75), pc.Y(-1.15), pc.X(1.25), pc.Y(-1.15), mut, true);
        label(ctx, 'T_s/2', pc.X(1.0), pc.Y(-1.15) - 10, mut, { font: '700 14px ' + K.font });
      } else {
        const avg = (o.d1 - o.d2) * P.sg;
        label(ctx, `⟨i_fc⟩ = (d1 − d2)·i_a = ${avg >= 0 ? '+' : '−'}${Math.abs(avg).toFixed(2)}·I  →  ${Math.abs(avg) < 0.005 ? 'no drift' : avg > 0 ? 'V_fc rises' : 'V_fc falls'}`,
          bx + bw - 10, pc.Y(-1.45), ink, { align: 'right', font: '700 14px ' + K.font });
      }
    }
    K.onTheme(draw);
    draw();
    return {};
  };

  // ---------------- switching energy: the v·i triangle at turn-off ----------------
  SIMS.esw = function (host, cfg) {
    const W = cfg.w || 440, H = cfg.h || 200;
    const cv = K.canvas(W, H);
    host.append(cv.el);
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const box = { x: 12, y: 30, w: W - 24, h: H - 66 };
      const n = 401, t = (i) => i / (n - 1), a = 0.12, b = 0.45, c = 0.78;
      const v = (i) => { const x = t(i); return x < a ? 0 : x < b ? (x - a) / (b - a) : 1; };
      const cur = (i) => { const x = t(i); return x < b ? 1 : x < c ? 1 - (x - b) / (c - b) : 0; };
      const red = K.css('--accent'), blue = K.css('--s1'), flow = K.css('--flow'), ink = K.css('--ink');
      const pl = K.plot(ctx, box, { xlim: [0, 1], ylim: [0, 1.2], title: 'Turn-off of one switch',
        legend: [['v', blue], ['i', flow], ['p = v·i', red]] });
      shade(ctx, pl.X, pl.Y, n, t, () => 0, (i) => v(i) * cur(i), red, 0.35);
      curve(ctx, pl.X, pl.Y, n, t, v, blue, 2.6);
      curve(ctx, pl.X, pl.Y, n, t, cur, flow, 2.6);
      label(ctx, 'area = E_off', pl.X(0.45), pl.Y(0.42), ink, { font: '700 15px ' + K.font });
      label(ctx, 'V', pl.X(0.97), pl.Y(1) - 10, blue, { font: '700 14px ' + K.font });
      label(ctx, 'I', pl.X(0.04), pl.Y(1) - 10, flow, { font: '700 14px ' + K.font });
      const yb = box.y + box.h + 16;
      arrow(ctx, pl.X(a), yb, pl.X(c), yb, K.css('--muted'), true);
      label(ctx, 't_off', pl.X((a + c) / 2), yb + 13, K.css('--muted'), { font: '700 14px ' + K.font });
    }
    K.onTheme(draw);
    draw();
    return {};
  };
})();
