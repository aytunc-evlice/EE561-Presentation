/* sim-vis.js — pictures behind the equations: leg voltages, NPC midpoint current, flying-capacitor PWM,
   and two redundant three-phase states. */
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

  // ---------------- circuit: split DC link, three 3-position legs, star-connected load ----------------
  let uid = 0;
  function legsCircuit(id, viewBox) {
    const svg = s('svg', { class: 'sch', viewBox: viewBox || '0 0 430 540' });
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
    const under = s('g'); g.append(under); // drawn behind the leg boxes, like the rails
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
    return { svg, g, under, levers, RY, LX };
  }

  // ---------------- leg, line-to-line and phase voltages (3-level legs, nearest-level staircase) ----------------
  SIMS.vlegs = function (host, cfg) {
    const m = cfg.m || 0.8, E = 400, NS = 720, W = cfg.w || 990, H = cfg.h || 560;
    const P = { th: 60, k: 0, play: true };
    const lev = (t) => Math.round(m * Math.sin(t)) * E;
    const va = [], vab = [], vn = [], van = [], ref = [];
    for (let i = 0; i <= NS; i++) {
      const t = (TAU * i) / NS, a = lev(t), b = lev(t - TAU / 3), c = lev(t + TAU / 3);
      va.push(a); vab.push(a - b); vn.push((a + b + c) / 3); van.push(a - (a + b + c) / 3); ref.push(m * E * Math.sin(t));
    }
    const id = 'vl' + (++uid);
    const { svg, g, levers, RY } = legsCircuit(id);
    const arr =(d, col, mk, dash) => s('path', { d, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-dasharray': dash || null, 'marker-end': `url(#${id + mk})` });
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
      if (P.k >= 1) {
        const p2 = K.plot(ctx, { x: bx, y, w: bw, h: ph }, { xlim: [0, 360], ylim: [-950, 950], yticks: [[-800, '−800'], [0, '0'], [800, '+800']], xticks: xt(false), cursor: cur,
          title: 'Line-to-line v_ab = v_aO − v_bO: 5 levels' });
        curve(ctx, p2.X, p2.Y, n, xs, (i) => vab[i], K.css('--s1'), 3);
      }
      // 3: phase voltage and common mode
      y += ph + gap;
      if (P.k >= 2) {
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
      const showAB = P.k >= 1, showNO = P.k >= 2;
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
    const P = { m: cfg.m || 0.8, phi: cfg.phi || 0, k: 0 };
    const I = 100, NS = 720, W = cfg.w || 900, H = cfg.h || 500;
    const cv = K.canvas(W, H);
    const sM = K.slider({ label: 'm', min: 0, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr'; host.style.gridTemplateRows = 'auto auto'; host.style.alignContent = 'start'; host.style.gap = '8px';
    host.append(cv.el, sM.el);

    const iO = (t) => (1 - Math.abs(P.m * Math.sin(t))) * I * Math.sin(t - P.phi * D2R);
    function draw() {
      const ctx = cv.ctx; cv.clear();
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

      if (P.k < 1) return;
      const pb = K.plot(ctx, { x: bx, y: 262, w: bw, h: H - 262 - 30 }, { xlim: [0, 360], ylim: [-I * 1.25, I * 1.25], yticks: [[-I, '−Î'], [0, '0'], [I, '+Î']], xticks: xt(true),
        title: 'Phase current i_a and midpoint current ⟨i_O⟩ = (1 − |r|)·i_a',
        legend: [['i_a', K.css('--flow')], ['⟨i_O⟩', K.css('--s1')]] });
      const ia = (i) => I * Math.sin((th(i) - P.phi) * D2R);
      const io = (i) => iO(th(i) * D2R);
      shade(ctx, pb.X, pb.Y, n, th, () => 0, io, K.css('--s1'), 0.3);
      curve(ctx, pb.X, pb.Y, n, th, ia, K.css('--flow'), 2.4);
      curve(ctx, pb.X, pb.Y, n, th, io, K.css('--s1'), 3);
      let sum = 0, half = 0;
      for (let i = 0; i < NS; i++) { const v = io(i); sum += v; if (i < NS / 2) half += v; }
      label(ctx, `average: whole period ${fmtA(sum / NS)} · first half ${fmtA(half / (NS / 2))}`, bx + bw - 10, 262 + 16, ink, { align: 'right', font: '700 15px ' + K.font });
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };

  // ---------------- redundant states: same line voltages, opposite midpoint current ----------------
  // Instant with i_a > 0 and i_b = i_c = −i_a/2: the current leaves the rail of leg a and returns to the rail of legs b, c.
  SIMS.redund = function (host, cfg) {
    host.classList.add('figrow');
    host.style.gridTemplateColumns = `repeat(${cfg.cases.length}, 1fr)`;
    const tri = (x, y, deg) => s('path', { class: 'iarrow', d: 'M10,0 L-8,-9 L-8,9 Z', transform: `translate(${x},${y}) rotate(${deg})` });
    for (const c of cfg.cases) {
      const C = legsCircuit('rd' + (++uid), '-160 0 590 540');
      const ys = [...c.st].map((l) => C.RY[l]);
      ys.forEach((y, j) => {
        C.levers[j].setAttribute('y2', y);
        const x = C.LX[j], rail = K.pts([[40, y], [x - 14, y]]), leg = K.pts([[x - 14, y], [x + 10, 338], [x + 10, 476], [260, 506]]);
        C.under.append(s('polyline', { class: 'flow-glow', points: rail }), s('polyline', { class: 'flow still', points: rail }));
        C.g.append(s('polyline', { class: 'flow-glow', points: leg }), s('polyline', { class: 'flow still', points: leg }));
        C.g.append(tri(x + 10, 404, j === 0 ? 90 : -90), tri(80, y, j === 0 ? 0 : 180));
      });
      const into = c.st[0] !== 'O';
      C.g.append(s('text', { class: 'lbl io', x: -14, y: 182, 'text-anchor': 'end', text: 'i_a flows' }),
        s('text', { class: 'lbl io', x: -14, y: 210, 'text-anchor': 'end', text: into ? 'into O' : 'out of O' }));
      const name = [...c.st].map((l) => `<span class="lv${l}">${l}</span>`).join('');
      const cell = h('figure', { class: 'fig redund' }, h('div', { class: 'stname', html: name }), C.svg, h('figcaption', { html: c.cap }));
      if (c.step) cell.setAttribute('data-step', c.step);
      host.append(cell);
    }
    return {};
  };

  // ---------------- flying capacitor with phase-shifted carriers ----------------
  // Ideal C_fc: only its current is drawn; equal duties give zero net charge per period.
  SIMS.fcpwm = function (host, cfg) {
    const P = { d: cfg.d != null ? cfg.d : 0.6 };
    const W = cfg.w || 860, H = cfg.h || 500, NS = 1600, TT = 2;
    const cv = K.canvas(W, H);
    const sD = K.slider({ label: 'duty d', min: 0.05, max: 0.95, step: 0.01, value: P.d, fmt: (v) => v.toFixed(2), onInput: (v) => { P.d = v; draw(); } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr'; host.style.alignContent = 'start'; host.style.gap = '8px';
    host.append(cv.el, sD.el);
    function run() {
      const o = { t: [], c1: [], c2: [], s1: [], s2: [], i: [] };
      for (let k = 0; k <= NS; k++) {
        const t = (TT * k) / NS, a = K.tri(t), b = K.tri(t + 0.5), S1 = P.d > a ? 1 : 0, S2 = P.d > b ? 1 : 0;
        o.t.push(t); o.c1.push(a); o.c2.push(b); o.s1.push(S1); o.s2.push(S2); o.i.push(S1 - S2);
      }
      return o;
    }
    const stCol = { '11': '--lvP', '00': '--lvN', '10': '--s3', '01': '--s3' };
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const o = run(), n = NS + 1, x = (k) => o.t[k];
      const bx = 64, bw = W - 84, ink = K.css('--ink'), b1 = K.css('--s1'), g2 = K.css('--s2');
      const xt = (lab) => [0, 0.5, 1, 1.5, 2].map((v) => [v, lab ? (v === 0 ? '0' : v + ' T_s') : '']);
      const pa = K.plot(ctx, { x: bx, y: 30, w: bw, h: 120 }, { xlim: [0, TT], ylim: [0, 1], yticks: [[0, '0'], [1, '1']], xticks: xt(false),
        title: 'Two carriers, half a period apart', legend: [['carrier 1 → S1', b1], ['carrier 2 → S2', g2], ['duty d', ink, [7, 5]]] });
      curve(ctx, pa.X, pa.Y, n, x, (k) => o.c1[k], b1, 2);
      curve(ctx, pa.X, pa.Y, n, x, (k) => o.c2[k], g2, 2);
      curve(ctx, pa.X, pa.Y, 2, (k) => k * TT, () => P.d, ink, 2.4, [7, 5]);
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
      const y0 = 338;
      const pc = K.plot(ctx, { x: bx, y: y0, w: bw, h: H - y0 - 30 }, { xlim: [0, TT], ylim: [-1.75, 1.35], yticks: [[-1, '−I'], [0, '0'], [1, '+I']], xticks: xt(true),
        title: 'Capacitor current i_fc = (S1 − S2)·i_a, i_a = I > 0' });
      ctx.save(); ctx.strokeStyle = K.css('--flow'); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let k = 0; k < n; k++) { const xx = pc.X(o.t[k]), yy = pc.Y(o.i[k]); if (k) { ctx.lineTo(xx, pc.Y(o.i[k - 1])); ctx.lineTo(xx, yy); } else ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.restore();
      label(ctx, '⟨i_fc⟩ = 0: as much charge in as out', bx + bw - 10, pc.Y(-1.45), ink, { align: 'right', font: '700 15px ' + K.font });
    }
    K.onTheme(draw);
    draw();
    return {};
  };
})();
