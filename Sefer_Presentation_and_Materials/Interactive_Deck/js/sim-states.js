/* sim-states.js — counting states: the gate combinations of one NPC leg, and N³ states vs distinct space vectors. */
(function () {
  'use strict';

  // text with one colour per character, e.g. the state name "POO"
  function colText(ctx, str, x, y, colOf) {
    const w = ctx.measureText(str).width;
    let xx = x - w / 2;
    ctx.save(); ctx.textAlign = 'left';
    for (const ch of str) { ctx.fillStyle = colOf(ch); ctx.fillText(ch, xx, y); xx += ctx.measureText(ch).width; }
    ctx.restore();
  }
  const lvCol = (ch) => K.css(ch === 'P' ? '--lvP' : ch === 'N' ? '--lvN' : '--lvO');

  // ---------------- one NPC leg: 16 gate combinations → 4 → 3 states ----------------
  SIMS.gates = function (host, cfg) {
    const W = cfg.w || 740, H = cfg.h || 630;
    const P = { k: 0 };
    const cv = K.canvas(W, H);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.append(cv.el);
    const pairs = ['11', '10', '01', '00']; // rows: (S1, S3); columns: (S2, S4)
    const STATE = { '10|10': 'P', '01|10': 'O', '01|01': 'N' };
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const ink = K.css('--ink'), ink2 = K.css('--ink2'), mut = K.css('--muted'), line = K.css('--line');
      const bad = K.css('--bad'), x0 = 150, y0 = 128, cw = 142, ch = 96;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      // headline: the count shrinks with each rule
      ctx.font = '700 30px ' + K.font; ctx.fillStyle = ink; ctx.textAlign = 'left';
      ctx.fillText(['2⁴ = 16 gate combinations', '16 → 4: pairs complementary', '16 → 4 → 3 states'][Math.min(P.k, 2)], 0, 24);
      ctx.textAlign = 'center';
      // axis titles and pair values
      ctx.font = '700 21px ' + K.font; ctx.fillStyle = ink2;
      ctx.fillText('S2 S4', x0 + 2 * cw, 70);
      ctx.save(); ctx.translate(22, y0 + 2 * ch); ctx.rotate(-Math.PI / 2); ctx.fillText('S1 S3', 0, 0); ctx.restore();
      pairs.forEach((p, i) => {
        const tag = p === '11' ? 'both on' : p === '00' ? 'both off' : '';
        ctx.font = '700 22px ' + K.mono; ctx.fillStyle = ink2;
        ctx.fillText(p[0] + ' ' + p[1], x0 + (i + 0.5) * cw, 104);
        ctx.fillText(p[0] + ' ' + p[1], 104, y0 + (i + 0.5) * ch - (tag ? 9 : 0));
        if (tag) {
          ctx.font = '600 15px ' + K.font; ctx.fillStyle = mut;
          ctx.fillText(tag, 104, y0 + (i + 0.5) * ch + 15);
        }
      });
      // cells
      pairs.forEach((r, i) => pairs.forEach((c, j) => {
        const x = x0 + j * cw, y = y0 + i * ch, cx = x + cw / 2, cy = y + ch / 2;
        const ring = r === '11' || r === '00' || c === '11' || c === '00';
        const on = r === '11' || c === '11';
        const st = STATE[r + '|' + c], forb = r === '10' && c === '01';
        ctx.save();
        if (P.k >= 1 && ring) { ctx.globalAlpha = 0.16; ctx.fillStyle = on ? bad : mut; ctx.fillRect(x, y, cw, ch); }
        ctx.restore();
        ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, cw, ch);
        if (P.k >= 2 && st) {
          ctx.font = '700 46px ' + K.font; ctx.fillStyle = lvCol(st); ctx.fillText(st, cx, cy + 2);
          return;
        }
        ctx.font = '600 21px ' + K.mono; ctx.fillStyle = (P.k >= 1 && ring) || (P.k >= 2 && forb) ? mut : ink2;
        ctx.fillText([r[0], c[0], r[1], c[1]].join(' '), cx, cy); // S1 S2 S3 S4
        if (P.k >= 2 && forb) {
          ctx.save(); ctx.strokeStyle = bad; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x + 22, y + 18); ctx.lineTo(x + cw - 22, y + ch - 18); ctx.moveTo(x + cw - 22, y + 18); ctx.lineTo(x + 22, y + ch - 18); ctx.stroke();
          ctx.restore();
        }
      }));
      // the 2 × 2 block that survives rule 1
      if (P.k >= 1) { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(x0 + cw, y0 + ch, 2 * cw, 2 * ch); }
      ctx.font = '600 16px ' + K.mono; ctx.fillStyle = mut; ctx.textAlign = 'right';
      ctx.fillText('cell: S1 S2 S3 S4', x0 + 4 * cw, y0 + 4 * ch + 18);
      // legend
      ctx.textAlign = 'left'; ctx.font = '600 20px ' + K.font;
      const leg = [];
      if (P.k >= 1) leg.push([bad, 'a pair both on: short circuit or overvoltage'], [mut, 'a pair both off: the current sign sets the voltage']);
      if (P.k >= 2) leg.push([null, 'S1 + S4: one switch would block the whole link']);
      leg.forEach(([col, txt], i) => {
        const y = y0 + 4 * ch + 52 + i * 30;
        if (col) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.fillRect(0, y - 10, 22, 20); ctx.restore(); }
        else {
          ctx.save(); ctx.strokeStyle = bad; ctx.lineWidth = 3; ctx.beginPath();
          ctx.moveTo(3, y - 8); ctx.lineTo(19, y + 8); ctx.moveTo(19, y - 8); ctx.lineTo(3, y + 8); ctx.stroke(); ctx.restore();
        }
        ctx.fillStyle = ink2; ctx.fillText(txt, 34, y);
      });
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };

  // ---------------- three legs: N³ states on 3N(N − 1) + 1 space vectors ----------------
  SIMS.svd = function (host, cfg) {
    const W = cfg.w || 1460, H = cfg.h || 640, NS = cfg.levels || [2, 3, 5];
    const P = { k: 0 };
    const cv = K.canvas(W, H);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '1fr';
    host.append(cv.el);
    const R3 = Math.sqrt(3) / 2;
    // every state (la, lb, lc), grouped by its space vector; a common offset gives the same point
    function points(N) {
      const map = new Map();
      for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) for (let c = 0; c < N; c++) {
        const x = a - (b + c) / 2, y = R3 * (b - c), key = Math.round(2 * x) + ',' + Math.round(1000 * y);
        if (!map.has(key)) map.set(key, { x, y, st: [] });
        map.get(key).st.push([a, b, c]);
      }
      const pts = [...map.values()];
      pts.forEach((p) => p.st.sort((u, v) => v[0] + v[1] + v[2] - (u[0] + u[1] + u[2])));
      return pts;
    }
    const LET = { 2: 'NP', 3: 'NOP' };
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const N = NS[Math.min(P.k, NS.length - 1)], pts = points(N);
      const ink = K.css('--ink'), ink2 = K.css('--ink2'), mut = K.css('--muted'), grid = K.css('--line'), acc = K.css('--accent');
      const cx = 400, cy = H / 2 + 4, R = 262, u = R / (N - 1);
      const X = (p) => cx + p.x * u, Y = (p) => cy - p.y * u;
      // triangle grid between neighbouring vectors, and the hexagon
      ctx.strokeStyle = grid; ctx.lineWidth = 1.5;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (Math.abs(d - 1) < 1e-6) { ctx.beginPath(); ctx.moveTo(X(pts[i]), Y(pts[i])); ctx.lineTo(X(pts[j]), Y(pts[j])); ctx.stroke(); }
      }
      ctx.strokeStyle = ink2; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = (i * Math.PI) / 3; ctx.lineTo(cx + R * Math.cos(a), cy - R * Math.sin(a)); }
      ctx.stroke();
      // vectors: dot size = number of states; labels = the states (up to 3 levels)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lab = LET[N];
      for (const p of pts) {
        const m = p.st.length, r = (N > 3 ? 6 : 8) + (N > 3 ? 3 : 5) * (m - 1);
        ctx.fillStyle = m > 1 ? acc : ink2;
        ctx.beginPath(); ctx.arc(X(p), Y(p), r, 0, K.TAU); ctx.fill();
        if (!lab) {
          if (m > 1) { ctx.font = '700 15px ' + K.font; ctx.fillStyle = '#fff'; ctx.fillText(m, X(p), Y(p) + 1); }
          continue;
        }
        ctx.font = '700 20px ' + K.mono;
        const names = p.st.map((s) => s.map((l) => lab[l]).join(''));
        if (m === 1) { // outer ring: one state, label pushed outward
          const L = Math.hypot(p.x, p.y), ux = p.x / L, uy = -p.y / L, d = r + 10 + (Math.abs(ux) * ctx.measureText(names[0]).width) / 2 + Math.abs(uy) * 12;
          colText(ctx, names[0], X(p) + ux * d, Y(p) + uy * d, lvCol);
          continue;
        }
        ctx.textBaseline = 'top';
        names.forEach((t, i) => colText(ctx, t, X(p), Y(p) + r + 4 + 21 * i, lvCol));
        ctx.textBaseline = 'middle';
      }
      // counts for every N shown so far
      const tx = 800, cols = [tx + 70, tx + 230, tx + 420, tx + 590];
      ctx.textAlign = 'center';
      ctx.font = '700 21px ' + K.font; ctx.fillStyle = ink2;
      ['Levels', 'States', 'Line voltages', 'Redundant'].forEach((t, i) => ctx.fillText(t, cols[i], 150));
      ctx.font = '600 19px ' + K.font; ctx.fillStyle = mut;
      ['N', 'N³', '3N(N − 1) + 1', 'difference'].forEach((t, i) => ctx.fillText(t, cols[i], 180));
      ctx.strokeStyle = ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, 202); ctx.lineTo(W - 10, 202); ctx.stroke();
      NS.slice(0, Math.min(P.k, NS.length - 1) + 1).forEach((n, i) => {
        const y = 250 + i * 76, v = 3 * n * (n - 1) + 1, cur = n === N;
        if (cur) { ctx.fillStyle = K.css('--accent-soft'); ctx.fillRect(tx, y - 36, W - 10 - tx, 72); }
        ctx.font = '700 44px ' + K.font;
        [n, n * n * n, v].forEach((t, j) => { ctx.fillStyle = cur ? ink : mut; ctx.fillText(t, cols[j], y); });
        ctx.fillStyle = cur ? acc : mut; ctx.fillText(n * n * n - v, cols[3], y);
      });
      ctx.font = '600 19px ' + K.font; ctx.fillStyle = mut; ctx.textAlign = 'left';
      ctx.fillText('red dot: one voltage, several states', tx, H - 40);
    }
    K.onTheme(draw);
    draw();
    return { step(k) { P.k = k; draw(); } };
  };
})();
