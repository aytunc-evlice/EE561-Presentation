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
