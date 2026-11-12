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

/* Two-level, three-phase inverter: pick P or N for each leg, see the state name, the pole and line voltages,
   and where that state sits as a voltage vector on the hexagon. */
(function () {
  'use strict';
  const { h, s } = K;
  SIMS.states2l = function (host, cfg) {
    const VH = 400, SQ3 = Math.sqrt(3);
    const P = { L: (cfg.state || 'PNN').split('') };
    const ALL = ['PNN', 'PPN', 'NPN', 'NPP', 'NNP', 'PNP', 'PPP', 'NNN'];
    // ---- schematic
    const sch = s('svg', { viewBox: '0 0 560 330', style: 'width:560px;height:330px' });
    const legX = [220, 340, 460], yTop = 30, yBot = 300, yMid = 165;
    const add = (tag, a, txt) => { const e = s(tag, a); if (txt != null) e.textContent = txt; sch.append(e); return e; };
    const ln = (x1, y1, x2, y2, st) => add('line', { x1, y1, x2, y2, style: 'stroke:var(--ink2);stroke-width:2.2;' + (st || '') });
    ln(40, yTop, 520, yTop); ln(40, yBot, 520, yBot);
    add('text', { x: 46, y: yTop - 12, style: 'font:600 15px var(--font);fill:var(--ink)' }, 'P rail: +400 V');
    add('text', { x: 46, y: yBot + 22, style: 'font:600 15px var(--font);fill:var(--ink)' }, 'N rail: −400 V');
    ln(80, yTop, 80, 120); ln(62, 120, 98, 120); ln(62, 130, 98, 130); ln(80, 130, 80, 200); ln(62, 200, 98, 200); ln(62, 210, 98, 210); ln(80, 210, 80, yBot);
    add('circle', { cx: 80, cy: yMid, r: 5, style: 'fill:var(--ink2)' }); add('text', { x: 92, y: yMid + 5, style: 'font:700 16px var(--font);fill:var(--ink)' }, 'O');
    const parts = legX.map((x, i) => {
      ln(x, yTop, x, 62); ln(x, 112, x, 218); ln(x, 268, x, yBot);
      const up = add('rect', { x: x - 30, y: 62, width: 60, height: 50, rx: 4 });
      const upT = add('text', { x, y: 92, 'text-anchor': 'middle', style: 'font:700 15px var(--font)' });
      const lo = add('rect', { x: x - 30, y: 218, width: 60, height: 50, rx: 4 });
      const loT = add('text', { x, y: 248, 'text-anchor': 'middle', style: 'font:700 15px var(--font)' });
      add('circle', { cx: x, cy: yMid, r: 4.5, style: 'fill:var(--ink2)' }); ln(x, yMid, x + 34, yMid);
      add('circle', { cx: x + 40, cy: yMid, r: 6, style: 'fill:var(--paper);stroke:var(--ink2);stroke-width:2' });
      add('text', { x: x + 52, y: yMid - 8, style: 'font:700 17px var(--font);fill:var(--ink)' }, 'abc'[i]);
      const vT = add('text', { x: x + 52, y: yMid + 14, style: 'font:700 14px var(--font)' });
      return { up, upT, lo, loT, vT };
    });
    // ---- controls and readouts
    const segs = [0, 1, 2].map((i) => K.seg({ label: 'Leg ' + 'abc'[i], options: [['P', 'P'], ['N', 'N']], value: P.L[i], onChange: (v) => { P.L[i] = v; draw(); } }));
    const name = h('div', { class: 'ro big' }, h('span', { class: 'ro-lab', html: 'Switching state (legs a b c)' }), h('span', { class: 'ro-val' }));
    const tbl = h('table', { class: 'tb nocase', style: { fontSize: '17px' } });
    let k = 0;
    const nextB = K.btn('Next state ▶', () => { k = (ALL.indexOf(P.L.join('')) + 1) % 8; P.L = ALL[k].split(''); segs.forEach((g, i) => g.set(P.L[i])); draw(); });
    const cv = K.canvas(400, 400);
    host.classList.add('sim');
    host.style.gridTemplateColumns = '560px 1fr';
    host.style.gap = '18px';
    host.append(h('div', { class: 'sim-col', style: { gap: '8px' } }, sch, tbl),
      h('div', { class: 'sim-col', style: { gap: '8px' } }, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, ...segs.map((g) => g.el)), h('div', { class: 'row' }, name, nextB), cv.el));
    const pole = (L) => (L === 'P' ? VH : -VH);
    const vec = (L) => { const a = pole(L[0]), b = pole(L[1]), c = pole(L[2]); return [(2 / 3) * (a - b / 2 - c / 2), (b - c) / SQ3]; };
    const fv = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)) + ' V';
    function draw() {
      const L = P.L, on = K.css('--s2'), off = K.css('--panel');
      parts.forEach((q, i) => {
        const isP = L[i] === 'P';
        q.up.setAttribute('style', `fill:${isP ? on : off};stroke:var(--ink2);stroke-width:2`); q.upT.textContent = isP ? 'on' : 'off'; q.upT.setAttribute('style', `font:700 15px var(--font);fill:${isP ? '#fff' : 'var(--muted)'}`);
        q.lo.setAttribute('style', `fill:${!isP ? K.css('--s1') : off};stroke:var(--ink2);stroke-width:2`); q.loT.textContent = !isP ? 'on' : 'off'; q.loT.setAttribute('style', `font:700 15px var(--font);fill:${!isP ? '#fff' : 'var(--muted)'}`);
        q.vT.textContent = (isP ? '+400 V' : '−400 V'); q.vT.setAttribute('style', `font:700 14px var(--font);fill:${isP ? on : K.css('--s1')}`);
      });
      name.querySelector('.ro-val').innerHTML = L.join(' ') + (L[0] === L[1] && L[1] === L[2] ? ' <small class="muted">zero state</small>' : ' <small class="muted">active state</small>');
      const [va, vb, vc] = L.map(pole);
      tbl.innerHTML = `<tr><th>pole (from O)</th><td>v<sub>aO</sub> ${fv(va)}</td><td>v<sub>bO</sub> ${fv(vb)}</td><td>v<sub>cO</sub> ${fv(vc)}</td></tr>
        <tr class="hl"><th>line (what the load sees)</th><td>v<sub>ab</sub> ${fv(va - vb)}</td><td>v<sub>bc</sub> ${fv(vb - vc)}</td><td>v<sub>ca</sub> ${fv(vc - va)}</td></tr>`;
      // hexagon
      const ctx = cv.ctx; cv.clear();
      const cx = 200, cy = 200, sc = 150 / ((2 / 3) * 800), X = (x) => cx + x * sc, Y = (y) => cy - y * sc;
      ctx.strokeStyle = K.css('--line'); ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.beginPath();
      ALL.slice(0, 6).forEach((st, i) => { const [x, y] = vec(st); (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(x), Y(y)); }); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      const cur = L.join('');
      ctx.font = '700 15px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ALL.slice(0, 6).forEach((st) => {
        const [x, y] = vec(st), r = Math.hypot(x, y), sel = st === cur;
        ctx.fillStyle = sel ? K.css('--s2') : K.css('--ink2'); ctx.beginPath(); ctx.arc(X(x), Y(y), sel ? 8 : 5.5, 0, K.TAU); ctx.fill();
        ctx.fillText(st, X(x * 1.2), Y(y * 1.2));
      });
      const zsel = cur === 'PPP' || cur === 'NNN';
      ctx.fillStyle = zsel ? K.css('--s2') : K.css('--ink2'); ctx.beginPath(); ctx.arc(cx, cy, zsel ? 8 : 5.5, 0, K.TAU); ctx.fill();
      ctx.fillText('PPP', cx, cy - 26); ctx.fillText('NNN', cx, cy + 26);
      if (!zsel) {
        const [x, y] = vec(cur), tx = X(x), ty = Y(y), ang = Math.atan2(ty - cy, tx - cx);
        ctx.strokeStyle = K.css('--s2'); ctx.fillStyle = K.css('--s2'); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx - 9 * Math.cos(ang), ty - 9 * Math.sin(ang)); ctx.stroke();
      }
      ctx.fillStyle = K.css('--muted'); ctx.font = '600 13px ' + K.font; ctx.textAlign = 'left';
      ctx.fillText('each active state: length ⅔·V_dc = 533 V', 8, 390);
    }
    K.onTheme(draw);
    draw();
    return {};
  };
})();

/* One switching period of three-phase sine PWM with one shared carrier: the three legs switch one after another,
   so the period is a sequence of switching states. A common offset r0 only moves time between NNN and PPP;
   min-max makes them equal, which is the equal zero split of space-vector PWM. */
(function () {
  'use strict';
  const { h } = K;
  SIMS.svmeq = function (host, cfg) {
    const N = 1800;
    const P = { m: cfg.m != null ? cfg.m : 0.8, th: cfg.th != null ? cfg.th : 10, mode: cfg.mode || 'none' };
    const cv = K.canvas(cfg.w || 880, 620);
    const ctl = [
      K.seg({ label: 'Common offset r₀', options: [['none', 'none'], ['mm', 'min-max']], value: P.mode, onChange: (v) => { P.mode = v; draw(); } }),
      K.slider({ label: 'm', min: 0, max: 1.15, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; draw(); } }),
      K.slider({ label: 'θ', min: 0, max: 360, step: 1, value: P.th, fmt: (v) => v + '°', onInput: (v) => { P.th = v; draw(); } }),
    ];
    const tbl = h('table', { class: 'tb nocase', style: { fontSize: '17px' } });
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 880) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '10px' } }, ctl.map((c) => c.el), tbl,
      h('div', { class: 'tiny', html: 'Shared carrier, references held constant during the period (r ≈ constant, slide 4). Percentages are shares of the switching period T<sub>s</sub>.' })));
    const car = (x) => 1 - 2 * K.tri(x);
    function draw() {
      const th = (P.th * Math.PI) / 180;
      const r = [0, 1, 2].map((k) => P.m * Math.cos(th - (k * K.TAU) / 3));
      const r0 = P.mode === 'mm' ? -(Math.max(...r) + Math.min(...r)) / 2 : 0;
      const rp = r.map((v) => v + r0);
      // states along the period
      const segs = []; let last = null;
      for (let q = 0; q < N; q++) {
        const c = car((q + 0.5) / N), name = rp.map((v) => (v > c ? 'P' : 'N')).join('');
        if (!last || last.name !== name) { last = { name, a: q / N, b: (q + 1) / N }; segs.push(last); } else last.b = (q + 1) / N;
      }
      const share = {}; segs.forEach((g) => { share[g.name] = (share[g.name] || 0) + (g.b - g.a); });
      const ctx = cv.ctx; cv.clear();
      const x0 = 70, w = cv.w - 90, X = (t) => x0 + t * w;
      const ink = K.css('--ink'), mut = K.css('--muted'), cols = [K.css('--s2'), K.css('--s3'), K.css('--s4')];
      // state band
      const yb = 28, hb = 52;
      segs.forEach((g) => {
        const zero = g.name === 'PPP' || g.name === 'NNN';
        ctx.fillStyle = zero ? (g.name === 'PPP' ? 'rgba(31,78,156,.16)' : 'rgba(31,78,156,.30)') : 'rgba(120,120,120,.08)';
        ctx.fillRect(X(g.a), yb, X(g.b) - X(g.a), hb);
        ctx.strokeStyle = K.css('--line'); ctx.lineWidth = 1; ctx.strokeRect(X(g.a) + 0.5, yb + 0.5, X(g.b) - X(g.a) - 1, hb - 1);
        if (X(g.b) - X(g.a) > 34) {
          ctx.fillStyle = ink; ctx.font = '700 15px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(g.name, (X(g.a) + X(g.b)) / 2, yb + 17);
          ctx.fillStyle = mut; ctx.font = '600 13px ' + K.font;
          ctx.fillText(((g.b - g.a) * 100).toFixed(1) + '%', (X(g.a) + X(g.b)) / 2, yb + 37);
        }
      });
      ctx.fillStyle = mut; ctx.font = '600 13px ' + K.font; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('state', x0 - 8, yb + hb / 2);
      // carrier and references
      const cs = [], tx = [];
      for (let q = 0; q <= 400; q++) { tx.push(q / 400); cs.push(car(q / 400)); }
      const A = K.plot(ctx, { x: x0, y: 112, w, h: 230 }, {
        xlim: [0, 1], ylim: [-1.15, 1.15], yticks: [[-1, '−1'], [0, '0'], [1, '+1']],
        series: [{ x: tx, y: cs, color: mut, width: 2.2 }].concat(rp.map((v, k) => ({ x: [0, 1], y: [v, v], color: cols[k], width: 3 }))),
        title: P.mode === 'mm' ? 'Carrier and the three references with the min-max offset' : 'Carrier and the three references (sine PWM)',
        legend: [['r′_a', cols[0]], ['r′_b', cols[1]], ['r′_c', cols[2]]],
      });
      // gate rows
      ['a', 'b', 'c'].forEach((ph, k) => {
        const y = 372 + k * 56, hh = 34, ys = [], xs = [];
        for (let q = 0; q <= N; q++) { const c = car(Math.min(q, N - 1) / N + 0.5 / N); xs.push(q / N); ys.push(rp[k] > c ? 1 : 0); }
        K.plot(ctx, { x: x0, y, w, h: hh }, { xlim: [0, 1], ylim: [-0.2, 1.2], yticks: [[0, 'N'], [1, 'P']], series: [{ x: xs, y: ys, color: cols[k], width: 2.6, step: true }] });
        ctx.fillStyle = cols[k]; ctx.font = '700 15px ' + K.font; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('leg ' + ph, x0 - 30, y + hh / 2);
      });
      ctx.fillStyle = mut; ctx.font = '600 13px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('0', X(0), 372 + 2 * 56 + 38); ctx.fillText('T_s / 2', X(0.5), 372 + 2 * 56 + 38); ctx.fillText('T_s', X(1), 372 + 2 * 56 + 38);
      // dashed lines at the edges of NNN and PPP, and brackets comparing their total time
      const yEnd = 372 + 2 * 56 + 34, cN = K.css('--s1'), cP = K.css('--lvL');
      const zs = segs.filter((g) => g.name === 'NNN' || g.name === 'PPP');
      ctx.save(); ctx.lineWidth = 1.8; ctx.setLineDash([6, 5]);
      zs.forEach((g) => [g.a, g.b].forEach((t) => {
        if (t < 1e-6 || t > 1 - 1e-6) return;
        ctx.strokeStyle = g.name === 'NNN' ? cN : cP;
        ctx.beginPath(); ctx.moveTo(X(t), yb); ctx.lineTo(X(t), yEnd + 6); ctx.stroke();
      }));
      ctx.restore();
      const yB = yEnd + 34;
      ctx.save(); ctx.lineWidth = 2; ctx.font = '700 14px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      zs.forEach((g) => {
        const col = g.name === 'NNN' ? cN : cP;
        ctx.strokeStyle = col; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(X(g.a) + 2, yB - 6); ctx.lineTo(X(g.a) + 2, yB); ctx.lineTo(X(g.b) - 2, yB); ctx.lineTo(X(g.b) - 2, yB - 6); ctx.stroke();
        if (X(g.b) - X(g.a) > 30) ctx.fillText(g.name, (X(g.a) + X(g.b)) / 2, yB + 4);
      });
      const nT = share.NNN || 0, pT = share.PPP || 0, eq = Math.abs(nT - pT) < 0.002;
      ctx.font = '700 17px ' + K.font; ctx.textAlign = 'center';
      const msg = 'NNN ' + (nT * 100).toFixed(1) + ' %   ' + (eq ? '=' : '≠') + '   PPP ' + (pT * 100).toFixed(1) + ' %';
      ctx.fillStyle = eq ? K.css('--good') : K.css('--bad'); ctx.fillText(msg + (eq ? '   equal split: SVPWM' : '   unequal split'), X(0.5), yB + 26);
      ctx.restore();
      // table of shares
      const act = Object.keys(share).filter((k) => k !== 'PPP' && k !== 'NNN');
      const f = (v) => (v == null ? '0.0' : (v * 100).toFixed(1)) + ' %';
      const clip = rp.some((v) => Math.abs(v) > 1);
      tbl.innerHTML = '<tr><th>state</th><th>share of T<sub>s</sub></th></tr>' +
        act.map((k) => `<tr><td>${k} <small class="muted">active</small></td><td>${f(share[k])}</td></tr>`).join('') +
        `<tr class="hl"><td>NNN <small class="muted">zero, start/end</small></td><td>${f(share.NNN)}</td></tr><tr class="hl"><td>PPP <small class="muted">zero, middle</small></td><td>${f(share.PPP)}</td></tr>` +
        `<tr><td>offset r₀</td><td>${(r0 >= 0 ? '+' : '−') + Math.abs(r0).toFixed(3)}</td></tr>` +
        (clip ? '<tr><td colspan="2"><span class="pill bad">a reference is outside ±1: a zero state has run out</span></td></tr>' : '');
    }
    K.onTheme(draw);
    draw();
    const MS = cfg.mmStep;
    return { step(k) { if (MS == null) return; const v = k >= MS ? 'mm' : 'none'; if (v !== P.mode) { P.mode = v; ctl[0].set(v); draw(); } } };
  };
})();

/* PD vs POD for a 3-level leg, seen in a few carrier periods: two phases at one instant, one in the upper band
   and one in the lower band, their pole voltages and the line voltage between them. */
(function () {
  'use strict';
  const { h } = K;
  SIMS.pdpod = function (host, cfg) {
    const VH = 400, NW = 1500, NPER = 3;
    const P = { arr: cfg.arr || 'POD', th: cfg.th != null ? cfg.th : 60, m: 0.9 };
    const cv = K.canvas(cfg.w || 700, 580);
    const roJ = K.readout('Biggest jump in v<sub>ab</sub>', 'big'), roR = K.readout('Ripple of v<sub>ab</sub> (rms, this window)'), roT = K.readout('Line THD over a full cycle');
    const ctl = [
      K.seg({ label: 'Lower carrier', options: [['POD', 'mirrored (POD)'], ['PD', 'shifted down (PD)']], value: P.arr, onChange: (v) => { P.arr = v; draw(); } }),
      K.slider({ label: 'θ (instant)', min: 0, max: 360, step: 1, value: P.th, fmt: (v) => v + '°', onInput: (v) => { P.th = v; draw(); } }),
    ];
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 700) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '10px' } }, ctl.map((c) => c.el), roJ.el, roR.el, roT.el,
      h('div', { class: 'tiny', html: 'Three carrier periods; the references hardly move, so they are flat. All three phases share the same two carriers. m = 0.9, V<sub>dc</sub> = 800 V, f<sub>c</sub> = 15 f<sub>1</sub> for the THD.' })));
    const cu = (t) => K.tri(t);                          // upper carrier 0 … 1
    const cl = (t) => (P.arr === 'PD' ? K.tri(t) - 1 : -K.tri(t)); // lower carrier −1 … 0
    const lev = (r, t) => (r >= 0 ? (r > cu(t) ? 1 : 0) : (r < cl(t) ? -1 : 0));
    const thdCache = {};
    function lineTHD(arr) {
      if (thdCache[arr] != null) return thdCache[arr];
      const S = 4096, mf = 15, v = new Float64Array(S);
      const cL = (t) => (arr === 'PD' ? K.tri(t) - 1 : -K.tri(t));
      const L = (r, t) => (r >= 0 ? (r > K.tri(t) ? 1 : 0) : (r < cL(t) ? -1 : 0));
      for (let i = 0; i < S; i++) { const th = (K.TAU * i) / S, t = (mf * i) / S; v[i] = (L(P.m * Math.sin(th), t) - L(P.m * Math.sin(th - K.TAU / 3), t)) * VH; }
      return (thdCache[arr] = K.thd(K.harmonics(v)));
    }
    function draw() {
      const th = (P.th * Math.PI) / 180, ra = P.m * Math.sin(th), rb = P.m * Math.sin(th - K.TAU / 3);
      const xs = [], cU = [], cL = [], va = [], vb = [], vab = [];
      for (let q = 0; q <= NW; q++) {
        const t = (NPER * q) / NW; xs.push(t); cU.push(cu(t)); cL.push(cl(t));
        const a = lev(ra, t) * VH, b = lev(rb, t) * VH; va.push(a); vb.push(b); vab.push(a - b);
      }
      let jump = 0, mean = 0, s2 = 0;
      for (let q = 1; q <= NW; q++) jump = Math.max(jump, Math.abs(vab[q] - vab[q - 1]));
      for (let q = 0; q < NW; q++) mean += vab[q] / NW;
      for (let q = 0; q < NW; q++) s2 += (vab[q] - mean) ** 2 / NW;
      const ctx = cv.ctx; cv.clear();
      const mut = K.css('--muted'), ca = K.css('--s2'), cb = K.css('--s3'), ink = K.css('--ink');
      const xt = [[0, '0'], [1, 'T_s'], [2, '2 T_s'], [3, '3 T_s']];
      K.plot(ctx, { x: 64, y: 28, w: cv.w - 80, h: 190 }, {
        xlim: [0, NPER], ylim: [-1.1, 1.1], yticks: [[-1, '−1'], [0, '0'], [1, '+1']], xticks: xt,
        series: [{ x: xs, y: cU, color: mut, width: 2 }, { x: xs, y: cL, color: mut, width: 2, dash: P.arr === 'POD' ? [6, 4] : null },
          { x: [0, NPER], y: [ra, ra], color: ca, width: 3 }, { x: [0, NPER], y: [rb, rb], color: cb, width: 3 }],
        title: P.arr === 'POD' ? 'Upper carrier and its mirror image (POD)' : 'Upper carrier and the same carrier shifted down (PD)',
        legend: [['r_a', ca], ['r_b', cb]],
      });
      const row = (y, data, col, title, ylim, ticks) => K.plot(ctx, { x: 64, y, w: cv.w - 80, h: 62 }, { xlim: [0, NPER], ylim, yticks: ticks, xticks: [[0, ''], [1, ''], [2, ''], [3, '']], series: [{ x: xs, y: data, color: col, width: 2.6, step: true }], title });
      row(262, va, ca, 'v_aO [V], leg a', [-480, 480], [[-400, '−400'], [0, '0'], [400, '+400']]);
      row(360, vb, cb, 'v_bO [V], leg b', [-480, 480], [[-400, '−400'], [0, '0'], [400, '+400']]);
      K.plot(ctx, { x: 64, y: 458, w: cv.w - 80, h: 90 }, {
        xlim: [0, NPER], ylim: [-880, 880], yticks: [[-800, '−800'], [-400, '−400'], [0, '0'], [400, '400'], [800, '800']], xticks: xt,
        series: [{ x: xs, y: vab, color: ink, width: 2.8, step: true }, { x: [0, NPER], y: [mean, mean], color: K.css('--s1'), width: 2, dash: [6, 4] }],
        title: 'v_ab = v_aO − v_bO [V]: what the load sees (dashed: average)',
      });
      roJ.set(Math.round(jump) + ' V' + (jump > 600 ? ' <span class="pill bad">both legs switch together</span>' : jump > 0 ? ' <span class="pill ok">one leg at a time</span>' : ''));
      roR.set(Math.round(Math.sqrt(s2)) + ' V');
      roT.set('PD ' + (lineTHD('PD') * 100).toFixed(1) + ' % · POD ' + (lineTHD('POD') * 100).toFixed(1) + ' %');
    }
    K.onTheme(draw);
    draw();
    const ST = cfg.steps;
    return { step(k) { if (!ST) return; let o = null; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) o = ST[key]; if (o && o !== P.arr) { P.arr = o; ctl[0].set(o); draw(); } } };
  };
})();

/* Three-phase, three-level leg set on a split DC link: pick P, O or N per leg. Shows that POO and ONN give the same
   line voltages but opposite midpoint current, so the choice between them moves the capacitor voltages. */
(function () {
  'use strict';
  const { h, s } = K;
  SIMS.states3l = function (host, cfg) {
    const VH = 400, I = { a: 10, b: -5, c: -5 };
    const P = { L: (cfg.state || 'POO').split('') };
    const W = 600, H = 360;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, style: `width:${W}px;height:${H}px` });
    const add = (tag, a, txt) => { const e = s(tag, a); if (txt != null) e.textContent = txt; svg.append(e); return e; };
    const st = (w) => 'stroke:var(--ink2);stroke-width:' + (w || 2.2) + ';fill:none';
    const yP = 40, yO = 180, yN = 320, xC = 70, legX = [250, 360, 470];
    // DC link
    add('line', { x1: xC, y1: yP, x2: 520, y2: yP, style: st() }); add('line', { x1: xC, y1: yN, x2: 520, y2: yN, style: st() });
    add('line', { x1: xC, y1: yP, x2: xC, y2: 96, style: st() }); add('line', { x1: xC - 22, y1: 96, x2: xC + 22, y2: 96, style: st() }); add('line', { x1: xC - 22, y1: 106, x2: xC + 22, y2: 106, style: st() }); add('line', { x1: xC, y1: 106, x2: xC, y2: 254, style: st() });
    add('line', { x1: xC - 22, y1: 254, x2: xC + 22, y2: 254, style: st() }); add('line', { x1: xC - 22, y1: 264, x2: xC + 22, y2: 264, style: st() }); add('line', { x1: xC, y1: 264, x2: xC, y2: yN, style: st() });
    add('text', { x: xC - 30, y: 104, 'text-anchor': 'end', style: 'font:700 16px var(--font);fill:var(--ink)' }, 'C1');
    add('text', { x: xC - 30, y: 262, 'text-anchor': 'end', style: 'font:700 16px var(--font);fill:var(--ink)' }, 'C2');
    add('text', { x: 528, y: yP + 5, style: 'font:700 15px var(--font);fill:var(--ink)' }, 'P');
    add('text', { x: 528, y: yN + 5, style: 'font:700 15px var(--font);fill:var(--ink)' }, 'N');
    // midpoint rail
    const oRail = add('line', { x1: xC, y1: yO, x2: 500, y2: yO, style: 'stroke:var(--ink2);stroke-width:2.2' });
    add('circle', { cx: xC, cy: yO, r: 5.5, style: 'fill:var(--ink2)' });
    add('text', { x: xC - 14, y: yO + 5, 'text-anchor': 'end', style: 'font:700 18px var(--font);fill:var(--ink)' }, 'O');
    const iOarrow = add('path', { d: '', style: 'fill:var(--s1)' });
    const iOtext = add('text', { x: 150, y: yO - 14, 'text-anchor': 'middle', style: 'font:700 15px var(--font);fill:var(--s1)' });
    // legs: three contacts and a blade to the output
    const legs = legX.map((x, i) => {
      [yP, yO, yN].forEach((y) => { add('line', { x1: x, y1: y, x2: x, y2: y + (y === yP ? 0 : 0), style: st() }); });
      add('line', { x1: x, y1: yP, x2: x, y2: yP + 20, style: st() }); add('line', { x1: x, y1: yN - 20, x2: x, y2: yN, style: st() });
      const cP = add('circle', { cx: x, cy: yP + 24, r: 4.5 }), cO = add('circle', { cx: x - 2, cy: yO, r: 4.5 }), cN = add('circle', { cx: x, cy: yN - 24, r: 4.5 });
      const blade = add('line', { x1: x + 34, y1: yO + 40, x2: x, y2: yO, style: 'stroke:var(--s2);stroke-width:3.5' });
      add('circle', { cx: x + 34, cy: yO + 40, r: 4.5, style: 'fill:var(--ink2)' });
      add('line', { x1: x + 34, y1: yO + 40, x2: x + 34, y2: yO + 92, style: st() });
      add('circle', { cx: x + 34, cy: yO + 98, r: 6, style: 'fill:var(--paper);stroke:var(--ink2);stroke-width:2' });
      add('text', { x: x + 46, y: yO + 103, style: 'font:700 17px var(--font);fill:var(--ink)' }, 'abc'[i]);
      add('text', { x: x + 46, y: yO + 66, style: 'font:600 13px var(--font);fill:var(--muted)' }, 'i' + 'abc'[i] + ' = ' + (I['abc'[i]] > 0 ? '+' : '') + I['abc'[i]] + ' A');
      return { x, cP, cO, cN, blade };
    });
    // controls
    const segs = [0, 1, 2].map((i) => K.seg({ label: 'Leg ' + 'abc'[i], options: [['P', 'P'], ['O', 'O'], ['N', 'N']], value: P.L[i], onChange: (v) => { P.L[i] = v; draw(); } }));
    const quick = h('div', { class: 'row' }, K.btn('POO', () => setState('POO')), K.btn('ONN', () => setState('ONN')));
    const tbl = h('table', { class: 'tb nocase', style: { fontSize: '17px' } });
    const roI = K.readout('Current drawn from the midpoint O', 'big'), roE = K.readout('Effect on the two capacitors');
    host.classList.add('sim');
    host.style.gridTemplateColumns = W + 'px 1fr';
    host.style.gap = '18px';
    host.append(h('div', { class: 'sim-col', style: { gap: '8px' } }, svg, tbl),
      h('div', { class: 'sim-col', style: { gap: '10px' } }, quick, h('div', { class: 'row', style: { gap: '8px', flexWrap: 'nowrap' } }, ...segs.map((g) => g.el)), roI.el, roE.el,
        h('div', { class: 'tiny', html: 'One instant: i<sub>a</sub> = +10 A out of leg a, i<sub>b</sub> = i<sub>c</sub> = −5 A. V<sub>dc</sub> = 800 V, so P = +400 V, O = 0, N = −400 V (measured from O).' })));
    function setState(x) { P.L = x.split(''); segs.forEach((g, i) => g.set(P.L[i])); draw(); }
    const lv = (L) => (L === 'P' ? VH : L === 'O' ? 0 : -VH);
    const fv = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' V';
    function draw() {
      const yy = { P: yP + 24, O: yO, N: yN - 24 }, xo = { P: 0, O: -2, N: 0 };
      legs.forEach((g, i) => {
        const L = P.L[i];
        g.blade.setAttribute('x2', g.x + xo[L]); g.blade.setAttribute('y2', yy[L]);
        [['P', g.cP], ['O', g.cO], ['N', g.cN]].forEach(([k, c]) => c.setAttribute('style', k === L ? 'fill:var(--s2)' : 'fill:var(--paper);stroke:var(--ink2);stroke-width:2'));
      });
      const [va, vb, vc] = P.L.map(lv);
      tbl.innerHTML = `<tr><th>state ${P.L.join('')}</th><td>v<sub>aO</sub> ${fv(va)}</td><td>v<sub>bO</sub> ${fv(vb)}</td><td>v<sub>cO</sub> ${fv(vc)}</td></tr>
        <tr class="hl"><th>what the load sees</th><td>v<sub>ab</sub> ${fv(va - vb)}</td><td>v<sub>bc</sub> ${fv(vb - vc)}</td><td>v<sub>ca</sub> ${fv(vc - va)}</td></tr>`;
      let iO = 0; P.L.forEach((L, i) => { if (L === 'O') iO += I['abc'[i]]; });
      const onO = P.L.some((L) => L === 'O');
      oRail.setAttribute('style', 'stroke:' + (onO ? 'var(--s1)' : 'var(--ink2)') + ';stroke-width:' + (onO ? 3.5 : 2.2));
      if (iO !== 0) {
        const dir = iO > 0 ? 1 : -1, x0 = 150; // arrow along the rail: + means current leaves O towards the legs
        iOarrow.setAttribute('d', `M${x0 - 14 * dir},${yO - 7} L${x0 + 14 * dir},${yO} L${x0 - 14 * dir},${yO + 7} Z`);
        iOtext.textContent = (iO > 0 ? 'out of O: ' : 'into O: ') + Math.abs(iO) + ' A';
      } else { iOarrow.setAttribute('d', ''); iOtext.textContent = ''; }
      roI.set((iO > 0 ? '+' : iO < 0 ? '−' : '') + Math.abs(iO) + ' A' + (iO ? ' <small class="muted">' + (iO > 0 ? 'out of O' : 'into O') + '</small>' : ''));
      roE.set(iO > 0 ? 'v<sub>C1</sub> rises, v<sub>C2</sub> falls' : iO < 0 ? 'v<sub>C1</sub> falls, v<sub>C2</sub> rises' : 'no change');
    }
    K.onTheme(draw);
    draw();
    const ST = cfg.steps;
    return { step(k) { if (!ST) return; let o = null; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) o = ST[key]; if (o && o !== P.L.join('')) setState(o); } };
  };
})();

/* Neutral-point current over one output cycle (carrier PWM, average model): time at O per leg, each leg's share,
   their sum, and the resulting capacitor voltage ripple. Builds up with the slide's clicks. */
(function () {
  'use strict';
  const { h } = K;
  SIMS.npripple = function (host, cfg) {
    const N = 720, F1 = 50, I = 50;
    const P = { m: 0.8, phi: 0, C: 4.7, k: 99 };
    const cv = K.canvas(cfg.w || 680, 600);
    const ctl = [
      K.slider({ label: 'm', min: 0.1, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; draw(); } }),
      K.slider({ label: 'φ (current lag)', min: -180, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; draw(); } }),
      K.slider({ label: 'C (each)', min: 1, max: 10, step: 0.1, value: P.C, fmt: (v) => v.toFixed(1) + ' mF', onInput: (v) => { P.C = v; draw(); } }),
    ];
    const SIMPLE = !!cfg.simple;
    const roF = K.readout('Midpoint current repeats at', 'big'), roI = K.readout('Midpoint current, peak'), roV = K.readout('Wiggle of each capacitor (peak-to-peak)');
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 680) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '10px' } }, ...(SIMPLE ? [ctl[2].el, roF.el, roV.el] : [...ctl.map((c) => c.el), roF.el, roI.el, roV.el]),
      h('div', { class: 'tiny', html: 'Average over each switching period, 50 A peak phase current, f<sub>1</sub> = 50 Hz, V<sub>dc</sub> = 800 V.' })));
    function draw() {
      const phi = (P.phi * Math.PI) / 180, C = P.C * 1e-3, dt = 1 / F1 / N;
      const x = [], tO = [[], [], []], sh = [[], [], []], iO = [];
      for (let q = 0; q <= N; q++) {
        const th = (K.TAU * q) / N; x.push((q / N) * 20);
        let s = 0;
        for (let k = 0; k < 3; k++) {
          const r = P.m * Math.sin(th - (k * K.TAU) / 3), i = I * Math.sin(th - (k * K.TAU) / 3 - phi), t = 1 - Math.abs(r);
          tO[k].push(t); sh[k].push(t * i); s += t * i;
        }
        iO.push(s);
      }
      const dv = [0]; for (let q = 1; q <= N; q++) dv.push(dv[q - 1] + ((iO[q - 1] + iO[q]) / 2) * dt / C);
      const mean = dv.slice(0, N).reduce((a, b) => a + b, 0) / N;
      const v1 = dv.map((d) => 400 + (d - mean) / 2), v2 = dv.map((d) => 400 - (d - mean) / 2);
      const ctx = cv.ctx; cv.clear();
      const cols = [K.css('--s2'), K.css('--s3'), K.css('--s4')], ink = K.css('--ink');
      const xt = [0, 5, 10, 15, 20].map((v) => [v, v + ' ms']);
      const k = P.k;
      if (SIMPLE) {
        const A = K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: 220 }, {
          xlim: [0, 20], ylim: [-30, 30], yticks: [[-20, '−20'], [0, '0'], [20, '20']], xticks: xt,
          series: [{ x, y: iO, color: ink, width: 3.2 }], title: 'Midpoint current over one cycle [A]',
        });
        if (k >= 1) {
          ctx.save(); ctx.strokeStyle = K.css('--accent'); ctx.lineWidth = 1.8; ctx.setLineDash([6, 5]);
          [0, 20 / 3, 40 / 3, 20].forEach((t) => { ctx.beginPath(); ctx.moveTo(A.X(t), 30); ctx.lineTo(A.X(t), 250); ctx.stroke(); });
          ctx.setLineDash([]); ctx.fillStyle = K.css('--accent'); ctx.font = '700 14px ' + K.font; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          [10 / 3, 10, 50 / 3].forEach((t) => ctx.fillText('⅓ cycle', A.X(t), 36));
          ctx.restore();
        }
        if (k >= 2) {
          const lo = Math.min(...v2, ...v1), hi = Math.max(...v1, ...v2), pad = Math.max(2, (hi - lo) * 0.3);
          K.plot(ctx, { x: 62, y: 320, w: cv.w - 78, h: 220 }, {
            xlim: [0, 20], ylim: [Math.floor(lo - pad), Math.ceil(hi + pad)], yticks: [[Math.round(lo), Math.round(lo) + ''], [400, '400'], [Math.round(hi), Math.round(hi) + '']], xticks: xt,
            series: [{ x, y: v1, color: K.css('--s2'), width: 3 }, { x, y: v2, color: K.css('--s1'), width: 3 }],
            title: 'Capacitor voltages [V]', legend: [['C1', K.css('--s2')], ['C2', K.css('--s1')]],
          });
        }
      } else {
      K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: 130 }, {
        xlim: [0, 20], ylim: [0, 1.05], yticks: [[0, '0'], [0.5, '50 %'], [1, '100 %']], xticks: xt,
        series: tO.map((y, i) => ({ x, y, color: cols[i], width: 2.4 })), title: 'Time each leg spends at O: 1 − |r|', legend: [['leg a', cols[0]], ['leg b', cols[1]], ['leg c', cols[2]]],
      });
      if (k >= 1) {
        const ser = sh.map((y, i) => ({ x, y, color: cols[i], width: 1.6, alpha: 0.75 }));
        if (k >= 2) ser.push({ x, y: iO, color: ink, width: 3.2 });
        K.plot(ctx, { x: 62, y: 210, w: cv.w - 78, h: 160 }, {
          xlim: [0, 20], ylim: [-55, 55], yticks: [[-50, '−50'], [0, '0'], [50, '50']], xticks: xt,
          series: ser, title: k >= 2 ? 'Each leg’s share (thin) and their sum: the midpoint current i_O [A]' : 'Each leg’s share of the midpoint current [A]',
        });
      }
      if (k >= 3) {
        const lo = Math.min(...v2, ...v1), hi = Math.max(...v1, ...v2), pad = Math.max(2, (hi - lo) * 0.3);
        K.plot(ctx, { x: 62, y: 420, w: cv.w - 78, h: 140 }, {
          xlim: [0, 20], ylim: [Math.floor(lo - pad), Math.ceil(hi + pad)], yticks: [[400, '400']], xticks: xt,
          series: [{ x, y: v1, color: K.css('--s2'), width: 2.8 }, { x, y: v2, color: K.css('--s1'), width: 2.8 }],
          title: 'Capacitor voltages [V]', legend: [['C1', K.css('--s2')], ['C2', K.css('--s1')]],
        });
      }
      }
      // dominant frequency of i_O
      const sig = new Float64Array(512); for (let q = 0; q < 512; q++) { const th = (K.TAU * q) / 512; let s = 0; for (let kk = 0; kk < 3; kk++) { const r = P.m * Math.sin(th - (kk * K.TAU) / 3); s += (1 - Math.abs(r)) * I * Math.sin(th - (kk * K.TAU) / 3 - phi); } sig[q] = s; }
      const amp = K.harmonics(sig); let hk = 1; for (let q = 1; q < 40; q++) if (amp[q] > amp[hk]) hk = q;
      const kF = SIMPLE ? 1 : 2, kV = SIMPLE ? 2 : 3;
      roF.set(k >= kF ? hk * 50 + ' Hz <small class="muted">= ' + hk + ' × 50 Hz</small>' : '–');
      roI.set(k >= 2 ? Math.round(Math.max(...iO.map(Math.abs))) + ' A' : '–');
      roV.set(k >= kV ? (Math.max(...v1) - Math.min(...v1)).toFixed(1) + ' V' : '–');
    }
    K.onTheme(draw);
    draw();
    return { step(kk) { P.k = kk; draw(); } };
  };

  /* Strength of the offset knob over one cycle: Σ sign(r_x)·i_x, its average (6/π)·I·cos φ. */
  SIMS.authority = function (host, cfg) {
    const N = 720, I = 50;
    const P = { m: 0.8, phi: 0 };
    const cv = K.canvas(cfg.w || 680, 430);
    const phS = K.slider({ label: 'φ (current lag)', min: -180, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; draw(); } });
    const roA = K.readout('Average strength', 'big'), roR = K.readout('Compared with unity power factor');
    const quick = h('div', { class: 'row' }, ...[[0, 'φ = 0° (inverter)'], [90, '90° (reactive)'], [180, '180° (rectifier)']].map(([v, t]) => K.btn(t, () => { P.phi = v; phS.set(v); draw(); })));
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 680) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '10px' } }, phS.el, quick, roA.el, roR.el,
      h('div', { class: 'tiny', html: 'Strength = Σ sign(r<sub>x</sub>)·i<sub>x</sub>: current of the legs with a positive reference minus current of the legs with a negative one. A small offset r<sub>0</sub> changes the midpoint current by −r<sub>0</sub> × strength. 50 A peak.' })));
    const SIMPLE = !!cfg.simple;
    if (SIMPLE) { host.querySelector('.tiny').innerHTML = 'How much a small offset moves the midpoint current, relative to an inverter at unity power factor. φ: how far the current lags the voltage.'; roA.el.remove(); }
    function draw() {
      if (SIMPLE) {
        const ctx = cv.ctx; cv.clear();
        const xs = [], ys = []; for (let d = -180; d <= 180; d += 2) { xs.push(d); ys.push(100 * Math.cos((d * Math.PI) / 180)); }
        const A = K.plot(ctx, { x: 70, y: 40, w: cv.w - 90, h: cv.h - 90 }, {
          xlim: [-180, 180], ylim: [-115, 115], xticks: [-180, -90, 0, 90, 180].map((v) => [v, v + '°']), yticks: [[-100, '−100 %'], [0, '0'], [100, '100 %']],
          bands: [{ y0: 0, y1: 115, color: 'rgba(46,125,50,.07)' }, { y0: -115, y1: 0, color: 'rgba(192,57,43,.07)' }],
          series: [{ x: xs, y: ys, color: K.css('--ink2'), width: 2.6 }], title: 'Strength of the offset knob vs φ', xlabel: 'φ (current lag)',
        });
        const v = 100 * Math.cos((P.phi * Math.PI) / 180), col = v > 5 ? K.css('--good') : v < -5 ? K.css('--bad') : K.css('--warn');
        ctx.save(); ctx.font = '700 15px ' + K.font; ctx.textAlign = 'center'; ctx.fillStyle = K.css('--muted');
        ctx.textBaseline = 'middle';
        [[0, 78, 'inverter'], [118, 14, 'reactive'], [-118, 14, 'reactive'], [158, -40, 'rectifier'], [-158, -40, 'rectifier']].forEach(([d, y, t]) => ctx.fillText(t, A.X(d), A.Y(y)));
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(A.X(P.phi), A.Y(v), 10, 0, K.TAU); ctx.fill(); ctx.restore();
        roR.set(Math.round(v) + ' % ' + (v > 5 ? '<span class="pill ok">balances</span>' : v < -5 ? '<span class="pill bad">pushes the wrong way</span>' : '<span class="pill warn">no effect</span>'));
        return;
      }
      const phi = (P.phi * Math.PI) / 180, x = [], g = [];
      for (let q = 0; q <= N; q++) {
        const th = (K.TAU * q) / N; x.push((q / N) * 20);
        let s = 0; for (let k = 0; k < 3; k++) s += Math.sign(Math.sin(th - (k * K.TAU) / 3)) * I * Math.sin(th - (k * K.TAU) / 3 - phi);
        g.push(s);
      }
      const avg = g.slice(0, N).reduce((a, b) => a + b, 0) / N, ref = (6 / Math.PI) * I;
      const ctx = cv.ctx; cv.clear();
      const col = avg > 5 ? K.css('--good') : avg < -5 ? K.css('--bad') : K.css('--muted');
      K.plot(ctx, { x: 62, y: 30, w: cv.w - 78, h: cv.h - 70 }, {
        xlim: [0, 20], ylim: [-110, 110], yticks: [[-100, '−100'], [-50, '−50'], [0, '0'], [50, '50'], [100, '100']], xticks: [0, 5, 10, 15, 20].map((v) => [v, v + ' ms']),
        bands: [{ y0: 0, y1: 110, color: 'rgba(46,125,50,.06)' }, { y0: -110, y1: 0, color: 'rgba(192,57,43,.06)' }],
        hlines: [{ v: avg, color: col, width: 3, dash: [8, 5], label: 'average ' + Math.round(avg) + ' A' }],
        series: [{ x, y: g, color: K.css('--ink'), width: 2.6 }], title: 'Strength of the offset knob over one cycle [A]',
      });
      roA.set(Math.round(avg) + ' A <small class="muted">= (6/π)·I·cos φ</small>');
      roR.set((avg / ref * 100).toFixed(0) + ' % ' + (avg > 5 ? '<span class="pill ok">balances</span>' : avg < -5 ? '<span class="pill bad">sign flipped</span>' : '<span class="pill warn">no grip</span>'));
    }
    K.onTheme(draw);
    draw();
    const ST = cfg.steps;
    return { step(k) { if (!ST) return; let o = null; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) o = ST[key]; if (o != null && o !== P.phi) { P.phi = o; phS.set(o); draw(); } } };
  };
})();

/* How the offset r0 moves charge: one instant, three legs of a 3-level NPC with PD carriers. Each leg's switching
   period split into time at P, O and N; the legs' currents through O add up to the midpoint current. */
(function () {
  'use strict';
  const { h } = K;
  SIMS.r0explain = function (host, cfg) {
    const I = 50, m = 0.8, th = ((cfg.th != null ? cfg.th : 0) * Math.PI) / 180;
    const P = { r0: 0 };
    const cv = K.canvas(cfg.w || 680, 470);
    const rS = K.slider({ label: 'Offset r₀', min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2), onInput: (v) => { P.r0 = v; draw(); } });
    const btns = h('div', { class: 'row' }, ...[[0, 'r₀ = 0'], [0.1, 'r₀ = +0.1'], [-0.1, 'r₀ = −0.1']].map(([v, t]) => K.btn(t, () => { P.r0 = v; rS.set(v); draw(); })));
    const roI = K.readout('Midpoint current', 'big'), roE = K.readout('Effect on the capacitors');
    host.classList.add('sim');
    host.style.gridTemplateColumns = (cfg.w || 680) + 'px 1fr';
    host.append(h('div', { class: 'sim-col' }, cv.el), h('div', { class: 'sim-col', style: { gap: '10px' } }, rS.el, btns, roI.el, roE.el,
      h('div', { class: 'tiny', html: 'One instant (leg a at its zero crossing), m = 0.8, 50 A peak, unity power factor, PD carriers. Each bar is one switching period. Dashed outline: time at O without offset.' })));
    const legs = [0, 1, 2].map((k) => ({ name: 'abc'[k], r: m * Math.sin(th - (k * K.TAU) / 3), i: I * Math.sin(th - (k * K.TAU) / 3) }));
    const split = (r) => { r = K.clamp(r, -1, 1); return r >= 0 ? { P: r, O: 1 - r, N: 0 } : { P: 0, O: 1 + r, N: -r }; };
    const f = (v, d) => (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '') + Math.abs(v).toFixed(d == null ? 0 : d);
    function draw() {
      const ctx = cv.ctx; cv.clear();
      const x0 = 150, W = cv.w - x0 - 200, rowH = 92, y0 = 40;
      const cP = K.css('--lvP'), cO = '#9a9a9a', cN = K.css('--lvN'), ink = K.css('--ink'), mut = K.css('--muted');
      ctx.font = '700 14px ' + K.font; ctx.textBaseline = 'middle';
      ctx.fillStyle = mut; ctx.textAlign = 'center';
      ctx.fillText('one switching period', x0 + W / 2, 18);
      let iO = 0;
      const order = [2, 1, 0];
      order.forEach((k, row) => {
        const L = legs[k], y = y0 + row * rowH, s0 = split(L.r), s = split(L.r + P.r0);
        // label
        ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.font = '700 16px ' + K.font; ctx.fillText('leg ' + L.name, 10, y + 12);
        ctx.font = '600 13px ' + K.font; ctx.fillStyle = mut;
        ctx.fillText('r = ' + f(L.r + P.r0, 2), 10, y + 34); ctx.fillText('i = ' + f(L.i) + ' A', 10, y + 52);
        // bar: P | O | N
        let x = x0;
        [['P', s.P, cP], ['O', s.O, cO], ['N', s.N, cN]].forEach(([lab, frac, col]) => {
          if (frac <= 0) return;
          const w = frac * W;
          ctx.fillStyle = col; ctx.fillRect(x, y, w, 46);
          if (w > 36) { ctx.fillStyle = '#fff'; ctx.font = '700 14px ' + K.font; ctx.textAlign = 'center'; ctx.fillText(lab + ' ' + Math.round(frac * 100) + '%', x + w / 2, y + 23); }
          x += w;
        });
        // dashed outline of O without offset
        const ox = x0 + s0.P * W, ow = s0.O * W;
        ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(ox, y - 4, ow, 54); ctx.restore();
        // contribution
        const c = s.O * L.i; iO += c;
        ctx.textAlign = 'left'; ctx.font = '700 14px ' + K.font; ctx.fillStyle = Math.abs(c) < 0.05 ? mut : c < 0 ? K.css('--s1') : K.css('--s2');
        ctx.fillText('through O:', x0 + W + 14, y + 14);
        ctx.fillText(Math.round(s.O * 100) + '% × ' + f(L.i) + ' A = ' + f(c, 1) + ' A', x0 + W + 14, y + 36);
      });
      // total
      const yT = y0 + 3 * rowH + 10;
      ctx.strokeStyle = K.css('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, yT - 8); ctx.lineTo(cv.w - 10, yT - 8); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.font = '700 17px ' + K.font;
      const into = iO < -0.05, out = iO > 0.05;
      ctx.fillText('Midpoint current: ' + (into ? Math.abs(iO).toFixed(1) + ' A into O' : out ? iO.toFixed(1) + ' A out of O' : '0 A'), 10, yT + 18);
      ctx.font = '700 17px ' + K.font; ctx.fillStyle = into ? K.css('--s1') : out ? K.css('--s2') : mut;
      ctx.fillText(into ? 'C1 goes down, C2 goes up' : out ? 'C1 goes up, C2 goes down' : 'no change', 10, yT + 46);
      roI.set(into ? Math.abs(iO).toFixed(1) + ' A <small class="muted">into O</small>' : out ? iO.toFixed(1) + ' A <small class="muted">out of O</small>' : '0 A');
      roE.set(into ? 'C1 ↓, C2 ↑' : out ? 'C1 ↑, C2 ↓' : 'no change');
    }
    K.onTheme(draw);
    draw();
    const ST = cfg.steps;
    return { step(k) { if (!ST) return; let o = null; for (const key of Object.keys(ST).map(Number).sort((a, b) => a - b)) if (k >= key) o = ST[key]; if (o != null && o !== P.r0) { P.r0 = o; rS.set(o); draw(); } } };
  };
})();
