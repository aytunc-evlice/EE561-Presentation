/* sim-leg.js — phase-leg explorer for 2L, NPC, T-type, ANPC, 3L flying-capacitor and 5L-ANPC.
   Every switching state carries its conduction paths for both current signs. The schematic
   animation, blocking voltages and the loss model are all derived from those same paths. */
(function () {
  'use strict';
  const { h, s } = K;

  // Illustrative device classes: on-state drop V0 + r·i, switching energy per (V·A).
  const CLS = {
    '650': { V0: 0.80, r: 0.008, Vd0: 0.85, rd: 0.006, Eon: 1.0e-7, Eoff: 1.0e-7, Err: 0.5e-7 },
    '1200': { V0: 1.00, r: 0.011, Vd0: 1.00, rd: 0.008, Eon: 1.6e-7, Eoff: 1.6e-7, Err: 0.9e-7 },
  };

  const sw = (id, cx, cy, top, bot, o) => Object.assign({ id, kind: 'sw', cx, cy, rot: 0, len: 120, top, bot, cls: '650', lab: id, side: 'right' }, o || {});
  const di = (id, cx, cy, top, bot, o) => Object.assign({ id, kind: 'd', cx, cy, rot: 0, len: 120, top, bot, cls: '650', lab: id, side: 'right' }, o || {});
  const cap = (id, x, y0, y1, o) => Object.assign({ id, x, top: [x, y0], bot: [x, y1], lab: id }, o || {});
  const B = (v, o) => Object.assign({ P: v.v1, O: 0, N: -v.v2 }, o);

  function xf(d, p) {
    const a = (d.rot * Math.PI) / 180, sc = d.len / 120, x = p[0] * sc, y = p[1] * sc;
    return [d.cx + x * Math.cos(a) - y * Math.sin(a), d.cy + x * Math.sin(a) + y * Math.cos(a)];
  }
  const R_SW = [[0, -60], [0, -26], [-12, -15], [-12, 15], [0, 26], [0, 60]]; // collector (top) -> emitter
  const R_D = [[0, 60], [0, 42], [24, 42], [24, -42], [0, -42], [0, -60]]; // antiparallel diode, bottom -> top
  const R_CD = [[0, 60], [0, -60]]; // discrete diode, anode (bottom) -> cathode (top)
  const route = (d, how) => (d.kind === 'd' ? R_CD : how === 'sw' ? R_SW : R_D).map((p) => xf(d, p));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function prep(T) {
    T.dev = {};
    T.devs.forEach((d) => { T.dev[d.id] = d; });
    T.cap = {};
    T.caps.concat(T.fcap ? [T.fcap] : []).forEach((c) => { T.cap[c.id] = c; });
    T.st = {};
    const nom = { v1: 400, v2: 400, vf: T.fcNom || 0 };
    // `extra` states (e.g. dead time) are drawn in figures but never offered to the modulator or the explorer
    T.states.concat(T.extra || []).forEach((st) => {
      T.st[st.id] = st;
      st.vnom = st.pot(nom).out;
      st._pts = {}; st._el = {};
      for (const sg of ['pos', 'neg']) {
        const pts = [], el = [];
        for (const it of st[sg]) {
          if (Array.isArray(it)) { pts.push(it); continue; }
          const [id, how] = Object.entries(it)[0];
          let r;
          if (id === 'C') r = [T.cap[how].top, T.cap[how].bot];
          else {
            const d = T.dev[id];
            if (!d) throw new Error(T.name + ': unknown device ' + id);
            r = route(d, how);
            el.push({ id, how: d.kind === 'd' ? 'd' : how, key: id + ':' + how, d });
          }
          const prev = pts[pts.length - 1];
          if (prev && dist(prev, r[r.length - 1]) < dist(prev, r[0])) r = r.slice().reverse();
          pts.push(...r);
        }
        st._pts[sg] = pts; st._el[sg] = el;
      }
    });
    return T;
  }

  // Redundant-state choice. a carries +i through the capacitor, b carries −i.
  function red(a, b, k, i, c, pol, V, nom) {
    if (pol === 'bal') return i * (nom - V.vf) >= 0 ? a : b;
    if (pol === 'alt') { if (c.prevK !== k) c.alt = !c.alt; return c.alt ? a : b; }
    if (pol === '01') return b;
    return a;
  }
  // Level index from phase-disposition carriers (n levels -> n-1 stacked carriers)
  function levelPD(r, thc, n) {
    const w = 2 / (n - 1), t = K.tri(thc);
    let k = 0;
    for (let j = 0; j < n - 1; j++) if (r > -1 + w * (j + t)) k++;
    return k;
  }

  // ---------------- topologies ----------------
  const O3 = [480, 280];
  const dcCaps = (x) => [cap('C1', x, 40, 280), cap('C2', x, 280, 520)];
  const rails = (x) => [['P', x, 40, 'P'], ['O', x, 280, 'O'], ['N', x, 520, 'N']];
  const TOPO = {};

  TOPO['2l'] = prep({
    key: '2l', name: '2-level leg', short: '2-level', levels: 2, vb: '0 0 600 560', out: O3,
    caps: dcCaps(70), rails: rails(70),
    wires: [[[70, 40], [330, 40], [330, 100]], [[330, 220], [330, 340]], [[330, 460], [330, 520], [70, 520]], [[330, 280], [480, 280]]],
    dots: [[330, 280], [70, 280]],
    devs: [sw('S1', 330, 160, 'P', 'out', { cls: '1200' }), sw('S2', 330, 400, 'out', 'N', { cls: '1200' })],
    states: [
      { id: 'P', lv: 'P', name: 'P', g: { S1: 1, S2: 0 }, pot: (v) => B(v, { out: v.v1 }),
        pos: [[70, 40], [330, 40], { S1: 'sw' }, [330, 280], O3], neg: [O3, [330, 280], { S1: 'd' }, [330, 40], [70, 40]] },
      { id: 'N', lv: 'N', name: 'N', g: { S1: 0, S2: 1 }, pot: (v) => B(v, { out: -v.v2 }),
        pos: [[70, 520], [330, 520], { S2: 'd' }, [330, 280], O3], neg: [O3, [330, 280], { S2: 'sw' }, [330, 520], [70, 520]] },
    ],
    pick: (k) => (k >= 1 ? 'P' : 'N'),
  });

  const npcWires = [[[70, 40], [330, 40]], [[70, 520], [330, 520]], [[70, 280], [200, 280]], [[200, 160], [330, 160]], [[200, 400], [330, 400]], [[330, 280], [480, 280]]];
  const npcDots = [[200, 280], [330, 160], [330, 400], [330, 280], [70, 280], [200, 160], [200, 400]];
  const S1to4 = () => [sw('S1', 330, 100, 'P', 'X'), sw('S2', 330, 220, 'X', 'out'), sw('S3', 330, 340, 'out', 'Y'), sw('S4', 330, 460, 'Y', 'N')];
  const pathP = { pos: [[70, 40], [330, 40], { S1: 'sw' }, { S2: 'sw' }, O3], neg: [O3, { S2: 'd' }, { S1: 'd' }, [330, 40], [70, 40]] };
  const pathN = { pos: [[70, 520], [330, 520], { S4: 'd' }, { S3: 'd' }, O3], neg: [O3, { S3: 'sw' }, { S4: 'sw' }, [330, 520], [70, 520]] };

  TOPO.npc = prep({
    key: 'npc', name: '3-level NPC leg', short: 'NPC', levels: 3, vb: '0 0 600 560', out: O3, oArrow: [135, 280],
    caps: dcCaps(70), rails: rails(70), wires: npcWires, dots: npcDots,
    devs: S1to4().concat([di('D5', 200, 220, 'X', 'O', { side: 'left' }), di('D6', 200, 340, 'O', 'Y', { side: 'left' })]),
    states: [
      Object.assign({ id: 'P', lv: 'P', name: 'P', g: { S1: 1, S2: 1, S3: 0, S4: 0 }, pot: (v) => B(v, { X: v.v1, Y: 0, out: v.v1 }) }, pathP),
      { id: 'O', lv: 'O', name: 'O', np: 1, g: { S1: 0, S2: 1, S3: 1, S4: 0 }, pot: (v) => B(v, { X: 0, Y: 0, out: 0 }),
        pos: [[70, 280], [200, 280], { D5: 'd' }, [330, 160], { S2: 'sw' }, O3], neg: [O3, { S3: 'sw' }, [330, 400], [200, 400], { D6: 'd' }, [200, 280], [70, 280]] },
      Object.assign({ id: 'N', lv: 'N', name: 'N', g: { S1: 0, S2: 0, S3: 1, S4: 1 }, pot: (v) => B(v, { X: 0, Y: -v.v2, out: -v.v2 }) }, pathN),
    ],
    extra: [
      // Dead time between P and O: only S2 gated. The current sign picks the path (D5+S2 or D2+D1).
      { id: 'PdO', lv: 'O', name: 'dead time', g: { S1: 0, S2: 1, S3: 0, S4: 0 },
        pot: (v, sg) => (sg >= 0 ? B(v, { X: 0, Y: 0, out: 0 }) : B(v, { X: v.v1, Y: 0, out: v.v1 })),
        pos: [[70, 280], [200, 280], { D5: 'd' }, [330, 160], { S2: 'sw' }, O3], neg: pathP.neg },
    ],
    pick: (k) => ['N', 'O', 'P'][k],
  });

  TOPO.ttype = prep({
    key: 'ttype', name: '3-level T-type leg', short: 'T-type', levels: 3, vb: '0 0 600 560', out: O3, oArrow: [108, 280],
    caps: dcCaps(70), rails: rails(70),
    wires: [[[70, 40], [330, 40], [330, 100]], [[330, 220], [330, 340]], [[330, 460], [330, 520], [70, 520]], [[70, 280], [150, 280]], [[310, 280], [480, 280]]],
    dots: [[330, 280], [70, 280], [230, 280]],
    devs: [sw('S1', 330, 160, 'P', 'out', { cls: '1200' }), sw('S2', 190, 280, 'O', 'M', { rot: -90, len: 80 }),
      sw('S3', 270, 280, 'out', 'M', { rot: 90, len: 80 }), sw('S4', 330, 400, 'out', 'N', { cls: '1200' })],
    states: [
      { id: 'P', lv: 'P', name: 'P', g: { S1: 1, S2: 1, S3: 0, S4: 0 }, pot: (v) => B(v, { M: 0, out: v.v1 }),
        pos: [[70, 40], [330, 40], { S1: 'sw' }, [330, 280], O3], neg: [O3, [330, 280], { S1: 'd' }, [330, 40], [70, 40]] },
      { id: 'O', lv: 'O', name: 'O', np: 1, g: { S1: 0, S2: 1, S3: 1, S4: 0 }, pot: (v) => B(v, { M: 0, out: 0 }),
        pos: [[70, 280], { S2: 'sw' }, { S3: 'd' }, [330, 280], O3], neg: [O3, [330, 280], { S3: 'sw' }, { S2: 'd' }, [70, 280]] },
      { id: 'N', lv: 'N', name: 'N', g: { S1: 0, S2: 0, S3: 1, S4: 1 }, pot: (v) => B(v, { M: -v.v2, out: -v.v2 }),
        pos: [[70, 520], [330, 520], { S4: 'd' }, [330, 280], O3], neg: [O3, [330, 280], { S4: 'sw' }, [330, 520], [70, 520]] },
    ],
    pick: (k) => ['N', 'O', 'P'][k],
  });

  TOPO.anpc = prep({
    key: 'anpc', name: '3-level ANPC leg', short: 'ANPC', levels: 3, vb: '0 0 600 560', out: O3, oArrow: [135, 280],
    caps: dcCaps(70), rails: rails(70), wires: npcWires, dots: npcDots,
    devs: S1to4().concat([sw('S5', 200, 220, 'X', 'O', { side: 'left' }), sw('S6', 200, 340, 'O', 'Y', { side: 'left' })]),
    states: [
      Object.assign({ id: 'P', lv: 'P', name: 'P', g: { S1: 1, S2: 1, S3: 0, S4: 0, S5: 0, S6: 1 }, pot: (v) => B(v, { X: v.v1, Y: 0, out: v.v1 }) }, pathP),
      { id: 'Ou', lv: 'O', name: 'O<sub>U</sub>', np: 1, g: { S1: 0, S2: 1, S3: 0, S4: 0, S5: 1, S6: 0 }, pot: (v) => B(v, { X: 0, Y: 0, out: 0 }),
        pos: [[70, 280], [200, 280], { S5: 'd' }, [330, 160], { S2: 'sw' }, O3], neg: [O3, { S2: 'd' }, [200, 160], { S5: 'sw' }, [200, 280], [70, 280]] },
      { id: 'Ol', lv: 'O', name: 'O<sub>L</sub>', np: 1, g: { S1: 0, S2: 0, S3: 1, S4: 0, S5: 0, S6: 1 }, pot: (v) => B(v, { X: 0, Y: 0, out: 0 }),
        pos: [[70, 280], [200, 280], { S6: 'sw' }, [330, 400], { S3: 'd' }, O3], neg: [O3, { S3: 'sw' }, [200, 400], { S6: 'd' }, [200, 280], [70, 280]] },
      // Zero via the lower path while S1 stays on: S2 (not S1) commutates against P
      { id: 'Ol1', lv: 'O', name: 'O<sub>L</sub>+S1', np: 1, g: { S1: 1, S2: 0, S3: 1, S4: 0, S5: 0, S6: 1 }, pot: (v) => B(v, { X: v.v1, Y: 0, out: 0 }),
        pos: [[70, 280], [200, 280], { S6: 'sw' }, [330, 400], { S3: 'd' }, O3], neg: [O3, { S3: 'sw' }, [200, 400], { S6: 'd' }, [200, 280], [70, 280]] },
      { id: 'Ou4', lv: 'O', name: 'O<sub>U</sub>+S4', np: 1, g: { S1: 0, S2: 1, S3: 0, S4: 1, S5: 1, S6: 0 }, pot: (v) => B(v, { X: 0, Y: -v.v2, out: 0 }),
        pos: [[70, 280], [200, 280], { S5: 'd' }, [330, 160], { S2: 'sw' }, O3], neg: [O3, { S2: 'd' }, [200, 160], { S5: 'sw' }, [200, 280], [70, 280]] },
      Object.assign({ id: 'N', lv: 'N', name: 'N', g: { S1: 0, S2: 0, S3: 1, S4: 1, S5: 1, S6: 0 }, pot: (v) => B(v, { X: 0, Y: -v.v2, out: -v.v2 }) }, pathN),
    ],
    polLabel: 'Zero state used (positive / negative half-cycle)',
    policies: [['half', 'O<sub>U</sub> / O<sub>L</sub>'], ['inner', 'O<sub>L</sub>+S1 / O<sub>U</sub>+S4'], ['alt', 'alternate both']],
    pick(k, r, i, c, pol) {
      if (k === 2) return 'P';
      if (k === 0) return 'N';
      let inner = pol === 'inner';
      if (pol === 'alt') { if (c.prevK !== 1) c.alt = !c.alt; inner = c.alt; }
      if (inner) return r >= 0 ? 'Ol1' : 'Ou4';
      return r >= 0 ? 'Ou' : 'Ol';
    },
  });

  TOPO.fc = prep({
    key: 'fc', name: '3-level flying-capacitor leg', short: 'FC', levels: 3, vb: '0 0 600 560', out: O3, fcNom: 400,
    caps: dcCaps(70), rails: [['P', 70, 40, 'P'], ['O', 70, 280, 'O'], ['N', 70, 520, 'N']], fcap: cap('FC', 220, 160, 400, { lab: 'C_fc' }),
    wires: [[[70, 40], [330, 40]], [[70, 520], [330, 520]], [[330, 160], [220, 160]], [[220, 400], [330, 400]], [[330, 280], [480, 280]]],
    dots: [[330, 160], [330, 400], [330, 280], [70, 280]],
    devs: [sw('S1', 330, 100, 'P', 'X'), sw('S2', 330, 220, 'X', 'out'), sw('S2p', 330, 340, 'out', 'Y', { lab: 'S2′' }), sw('S1p', 330, 460, 'Y', 'N', { lab: 'S1′' })],
    states: [
      { id: '11', lv: 'P', name: '11', g: { S1: 1, S2: 1, S2p: 0, S1p: 0 }, pot: (v) => B(v, { X: v.v1, out: v.v1, Y: v.v1 - v.vf }),
        pos: [[70, 40], [330, 40], { S1: 'sw' }, { S2: 'sw' }, O3], neg: [O3, { S2: 'd' }, { S1: 'd' }, [330, 40], [70, 40]] },
      { id: '10', lv: 'O', name: '10', fc: 1, g: { S1: 1, S2: 0, S2p: 1, S1p: 0 }, pot: (v) => B(v, { X: v.v1, Y: v.v1 - v.vf, out: v.v1 - v.vf }),
        pos: [[70, 40], [330, 40], { S1: 'sw' }, [220, 160], { C: 'FC' }, [220, 400], { S2p: 'd' }, O3],
        neg: [O3, { S2p: 'sw' }, [220, 400], { C: 'FC' }, [220, 160], { S1: 'd' }, [330, 40], [70, 40]] },
      { id: '01', lv: 'O', name: '01', fc: -1, g: { S1: 0, S2: 1, S2p: 0, S1p: 1 }, pot: (v) => B(v, { Y: -v.v2, X: -v.v2 + v.vf, out: -v.v2 + v.vf }),
        pos: [[70, 520], [330, 520], { S1p: 'd' }, [220, 400], { C: 'FC' }, [220, 160], { S2: 'sw' }, O3],
        neg: [O3, { S2: 'd' }, [220, 160], { C: 'FC' }, [220, 400], { S1p: 'sw' }, [330, 520], [70, 520]] },
      { id: '00', lv: 'N', name: '00', g: { S1: 0, S2: 0, S2p: 1, S1p: 1 }, pot: (v) => B(v, { Y: -v.v2, X: -v.v2 + v.vf, out: -v.v2 }),
        pos: [[70, 520], [330, 520], { S1p: 'd' }, { S2p: 'd' }, O3], neg: [O3, { S2p: 'sw' }, { S1p: 'sw' }, [330, 520], [70, 520]] },
    ],
    polLabel: 'Zero-level choice',
    policies: [['alt', 'alternate'], ['10', 'always 10'], ['01', 'always 01']],
    pick(k, r, i, c, pol, V) { return k === 2 ? '11' : k === 0 ? '00' : red('10', '01', k, i, c, pol, V, 400); },
  });

  // 5L-ANPC: selector S5..S8 picks the upper (P,O) or lower (O,N) half; a 3L FC cell (Vfc = Vdc/4) follows.
  const O5 = [560, 280];
  const U = [[290, 160], [290, 100], [430, 100]], Ur = U.slice().reverse();
  const L = [[290, 400], [290, 460], [430, 460]], Lr = L.slice().reverse();
  const cellPos = {
    '11': [{ S1: 'sw' }, { S2: 'sw' }, O5],
    '10': [{ S1: 'sw' }, [350, 190], { C: 'FC' }, [350, 370], { S2p: 'd' }, O5],
    '01': [{ S1p: 'd' }, [350, 370], { C: 'FC' }, [350, 190], { S2: 'sw' }, O5],
    '00': [{ S1p: 'd' }, { S2p: 'd' }, O5],
  };
  const cellNeg = {
    '11': [O5, { S2: 'd' }, { S1: 'd' }],
    '10': [O5, { S2p: 'sw' }, [350, 370], { C: 'FC' }, [350, 190], { S1: 'd' }],
    '01': [O5, { S2: 'd' }, [350, 190], { C: 'FC' }, [350, 370], { S1p: 'sw' }],
    '00': [O5, { S2p: 'sw' }, { S1p: 'sw' }],
  };
  const cellG = { '11': { S1: 1, S2: 1, S2p: 0, S1p: 0 }, '10': { S1: 1, S2: 0, S2p: 1, S1p: 0 }, '01': { S1: 0, S2: 1, S2p: 0, S1p: 1 }, '00': { S1: 0, S2: 0, S2p: 1, S1p: 1 } };
  const cellFc = { '11': 0, '10': 1, '01': -1, '00': 0 };
  function cellPot(c, Uv, Lv, vf) {
    if (c === '11') return { A: Uv, out: Uv, B: Uv - vf };
    if (c === '10') return { A: Uv, B: Uv - vf, out: Uv - vf };
    if (c === '01') return { B: Lv, A: Lv + vf, out: Lv + vf };
    return { B: Lv, A: Lv + vf, out: Lv };
  }
  // Which side of the cell the current enters from, per half and cell state
  const usesU = { '11': 1, '10': 1, '01': 0, '00': 0 };
  function st5(half, c, lv, name) {
    const up = half === 'u';
    const g = Object.assign({ S5: up ? 1 : 0, S6: up ? 0 : 1, S7: up ? 1 : 0, S8: up ? 0 : 1 }, cellG[c]);
    let src, back; // path from the DC side to the cell input and back
    if (usesU[c]) {
      src = up ? [[60, 40], [200, 40], { S5: 'sw' }].concat(U) : [[60, 280], [200, 280], { S6: 'd' }].concat(U);
      back = up ? Ur.concat([{ S5: 'd' }, [200, 40], [60, 40]]) : Ur.concat([{ S6: 'sw' }, [200, 280], [60, 280]]);
    } else {
      src = up ? [[60, 280], [200, 280], { S7: 'sw' }].concat(L) : [[60, 520], [200, 520], { S8: 'd' }].concat(L);
      back = up ? Lr.concat([{ S7: 'd' }, [200, 280], [60, 280]]) : Lr.concat([{ S8: 'sw' }, [200, 520], [60, 520]]);
    }
    const touchesO = up ? !usesU[c] : !!usesU[c];
    return {
      id: half + c, lv, name, g, fc: cellFc[c], np: touchesO ? 1 : 0,
      pot: (v) => { const Uv = up ? v.v1 : 0, Lv = up ? 0 : -v.v2; return B(v, Object.assign({ U: Uv, L: Lv }, cellPot(c, Uv, Lv, v.vf))); },
      pos: src.concat(cellPos[c]), neg: cellNeg[c].concat(back),
    };
  }
  TOPO.anpc5 = prep({
    key: 'anpc5', name: '5-level ANPC leg', short: '5L-ANPC', levels: 5, vb: '0 0 670 560', out: O5, fcNom: 200, oArrow: [130, 280],
    caps: dcCaps(60), rails: rails(60), fcap: cap('FC', 350, 190, 370, { lab: 'C_fc' }),
    wires: [[[60, 40], [200, 40]], [[60, 520], [200, 520]], [[60, 280], [200, 280]], [[200, 160]].concat(U), [[200, 400]].concat(L),
      [[430, 190], [350, 190]], [[350, 370], [430, 370]], [[430, 280], [560, 280]]],
    dots: [[200, 160], [200, 280], [200, 400], [430, 190], [430, 280], [430, 370], [60, 280]],
    devs: [sw('S5', 200, 100, 'P', 'U', { side: 'left' }), sw('S6', 200, 220, 'U', 'O', { side: 'left' }), sw('S7', 200, 340, 'O', 'L', { side: 'left' }), sw('S8', 200, 460, 'L', 'N', { side: 'left' }),
      sw('S1', 430, 145, 'U', 'A', { len: 90 }), sw('S2', 430, 235, 'A', 'out', { len: 90 }), sw('S2p', 430, 325, 'out', 'B', { len: 90, lab: 'S2′' }), sw('S1p', 430, 415, 'B', 'L', { len: 90, lab: 'S1′' })],
    states: [
      st5('u', '11', 'P', '+400'), st5('u', '10', 'H', '+200 a'), st5('u', '01', 'H', '+200 b'), st5('u', '00', 'O', '0 a'),
      st5('l', '11', 'O', '0 b'), st5('l', '10', 'L', '−200 a'), st5('l', '01', 'L', '−200 b'), st5('l', '00', 'N', '−400'),
    ],
    polLabel: 'Redundant-state choice',
    policies: [['alt', 'alternate'], ['10', 'always "a"']],
    pick(k, r, i, c, pol, V) {
      if (k === 4) return 'u11';
      if (k === 3) return red('u10', 'u01', k, i, c, pol, V, 200);
      if (k === 2) return r >= 0 ? 'u00' : 'l11';
      if (k === 1) return red('l10', 'l01', k, i, c, pol, V, 200);
      return 'l00';
    },
  });
  window.LEG_TOPO = TOPO;

  // ---------------- loss model ----------------
  function lossesPol(T, m, phi, pol) {
    const MF = 200, S = MF * 48, I = 100, F1 = 50, dt = 1 / (F1 * S);
    const v = { v1: 400, v2: 400, vf: T.fcNom || 0 };
    const res = {};
    T.devs.forEach((d) => { res[d.id] = { c: 0, s: 0 }; });
    const c = { prevK: -1, alt: false };
    let prev = null, prevPot = null;
    const vb = (d, pot) => Math.abs((pot[d.top] || 0) - (pot[d.bot] || 0));
    for (let n = 0; n < S; n++) {
      const th = (K.TAU * n) / S, r = m * Math.sin(th), i = I * Math.sin(th - phi), ai = Math.abs(i);
      const k = levelPD(r, (MF * n) / S, T.levels);
      const st = T.st[T.pick(k, r, i, c, pol, v)];
      c.prevK = k;
      const sg = i >= 0 ? 'pos' : 'neg', el = st._el[sg];
      for (const e of el) {
        const p = CLS[e.d.cls];
        res[e.id].c += (e.how === 'sw' ? p.V0 + p.r * ai : p.Vd0 + p.rd * ai) * ai * dt;
      }
      if (prev && prev !== st) {
        const pot = st.pot(v), pe = prev._el[sg];
        for (const e of pe) if (!el.some((x) => x.key === e.key)) { // stops conducting: blocks the new state's voltage
          const p = CLS[e.d.cls], V = vb(e.d, pot);
          if (V > 1) res[e.id].s += (e.how === 'sw' ? p.Eoff : p.Err) * V * ai;
        }
        for (const e of el) if (e.how === 'sw' && !pe.some((x) => x.key === e.key)) { // hard turn-on against the old voltage
          const p = CLS[e.d.cls], V = vb(e.d, prevPot);
          if (V > 1) res[e.id].s += p.Eon * V * ai;
        }
      }
      prev = st; prevPot = st.pot(v);
    }
    for (const id in res) { res[id].c *= F1; res[id].s *= F1; }
    return res;
  }
  window.LEG_LOSSES = lossesPol;

  // ---------------- schematic ----------------
  function Schematic(T) {
    const svg = s('svg', { class: 'sch', viewBox: T.vb });
    const gW = s('g'), gG = s('g'), gD = s('g'), gF = s('g'), gT = s('g');
    svg.append(gW, gG, gD, gF, gT);
    for (const w of T.wires) gW.append(s('polyline', { class: 'wire', points: K.pts(w) }));
    for (const d of T.dots) gW.append(s('circle', { class: 'dot', cx: d[0], cy: d[1], r: 4.5 }));
    const capTxt = {};
    for (const c of T.caps.concat(T.fcap ? [T.fcap] : [])) {
      const x = c.top[0], y0 = c.top[1], y1 = c.bot[1], cy = (y0 + y1) / 2, isF = c.id === 'FC';
      const g = s('g', { class: 'cap' });
      g.append(s('path', { d: `M${x},${y0} V${cy - 7} M${x},${cy + 7} V${y1}` }), s('path', { class: 'plate', d: `M${x - 20},${cy - 7} H${x + 20} M${x - 20},${cy + 7} H${x + 20}` }));
      gW.append(g);
      gT.append(s('text', { class: 'lbl sm', x: x - 30, y: cy - 12, 'text-anchor': 'middle', text: '+' }));
      const lx = isF ? x - 30 : x + 28, an = isF ? 'end' : 'start';
      const lab = s('text', { class: 'lbl', x: lx, y: cy - 2, 'text-anchor': an });
      if (c.lab === 'C_fc') lab.append('C', s('tspan', { 'baseline-shift': 'sub', 'font-size': '12', text: 'fc' }));
      else lab.textContent = c.lab;
      gT.append(lab);
      const tv = s('text', { class: 'capv', x: lx, y: cy + 20, 'text-anchor': an });
      gT.append(tv); capTxt[c.id] = tv;
    }
    for (const [t, x, y, lv] of T.rails) {
      gT.append(s('text', { class: 'rail', x: x - 32, y: y + 7, 'text-anchor': 'middle', fill: `var(--lv${lv})`, text: t }));
      if (T.key === 'fc' && t === 'O') gT.append(s('text', { class: 'lbl sm', x: x - 32, y: y + 26, 'text-anchor': 'middle', text: 'ref.' }));
    }
    const devEls = {};
    for (const d of T.devs) {
      const sc = d.len / 120;
      const g = s('g', { class: 'dev ' + (d.kind === 'd' ? 'diode' : 'sw'), transform: `translate(${d.cx},${d.cy}) rotate(${d.rot}) scale(${sc})` });
      if (d.kind === 'sw') {
        g.append(
          s('path', { class: 'body', d: 'M0,-60 V-26 L-12,-15' }),
          s('path', { class: 'body chan', d: 'M-12,-19 V19' }),
          s('path', { class: 'body', d: 'M-12,15 L0,26 V60' }),
          s('path', { class: 'arrow', d: 'M-1.4,24.7 L-9.3,22.9 L-3.9,17 Z' }),
          s('path', { class: 'body', d: 'M-21,-15 V15 M-21,0 H-31' }),
          s('circle', { class: 'gate', cx: -37, cy: 0, r: 6 }),
          s('path', { class: 'dio', d: 'M0,-42 H24 V42 H0' }),
          s('path', { class: 'dtri', d: 'M14,8 H34 L24,-8 Z' }),
          s('path', { class: 'dio', d: 'M13,-8 H35' }));
      } else {
        g.append(s('path', { class: 'dio', d: 'M0,-60 V60' }), s('path', { class: 'dtri', d: 'M-11,9 H11 L0,-9 Z' }), s('path', { class: 'dio', d: 'M-12,-9 H12' }));
      }
      gD.append(g);
      let lx, ly, an, bx, by;
      if (d.rot === -90) { lx = d.cx; ly = d.cy - 34 * sc - 12; an = 'middle'; bx = lx; by = ly - 18; }
      else if (d.rot === 90) { lx = d.cx; ly = d.cy + 36 * sc + 24; an = 'middle'; bx = lx; by = ly + 18; }
      else if (d.side === 'left') { lx = d.cx - (d.kind === 'd' ? 22 : 50 * sc); ly = d.cy + 4; an = 'end'; bx = lx; by = ly + 20; }
      else { lx = d.cx + (d.kind === 'd' ? 22 : 44 * sc); ly = d.cy + 4; an = 'start'; bx = lx; by = ly + 20; }
      gT.append(s('text', { class: 'lbl', x: lx, y: ly, 'text-anchor': an, text: d.lab }));
      const bt = s('text', { class: 'blk', x: bx, y: by, 'text-anchor': an });
      gT.append(bt);
      devEls[d.id] = { g, bt, txt: null };
    }
    const [ox, oy] = T.out;
    gT.append(s('circle', { class: 'term', cx: ox, cy: oy, r: 7 }));
    gT.append(s('text', { class: 'lbl', x: ox + 14, y: oy + 6, text: 'a' }));
    const vout = s('text', { class: 'vout', x: ox + 104, y: oy - 22, 'text-anchor': 'end' });
    gT.append(vout);
    const iArrow = s('path', { class: 'iarrow', d: 'M-9,-7 L9,0 L-9,7 Z' });
    const iLab = s('text', { class: 'lbl', x: ox - 60, y: oy + 34, 'text-anchor': 'middle' });
    iLab.append('i', s('tspan', { 'baseline-shift': 'sub', 'font-size': '12', text: 'a' }));
    gT.append(iArrow, iLab);
    let oArr = null, oLab = null;
    if (T.oArrow) {
      oArr = s('path', { class: 'iarrow', d: 'M-8,-6 L8,0 L-8,6 Z' });
      oLab = s('text', { class: 'lbl sm', x: T.oArrow[0], y: T.oArrow[1] - 14, 'text-anchor': 'middle' });
      oLab.append('i', s('tspan', { 'baseline-shift': 'sub', 'font-size': '10', text: 'O' }));
      gT.append(oArr, oLab);
    }
    const glow = s('polyline', { class: 'flow-glow' }), flow = s('polyline', { class: 'flow' });
    gG.append(glow); gF.append(flow);

    function update(st, sign, V) {
      const pot = st.pot(V, sign);
      const sg = sign >= 0 ? 'pos' : 'neg';
      const el = sign === 0 ? [] : st._el[sg];
      const cond = new Set(el.map((e) => e.id));
      const how = new Map(el.map((e) => [e.id, e.how]));
      for (const d of T.devs) {
        const r = devEls[d.id];
        // gate signal (green dot) is separate from conduction: a gated switch may carry no current,
        // or its antiparallel diode may carry it
        r.g.classList.toggle('on', !!st.g[d.id]);
        r.g.classList.toggle('csw', how.get(d.id) === 'sw');
        r.g.classList.toggle('cd', how.get(d.id) === 'd');
        let txt = '';
        if (!cond.has(d.id)) {
          const vb = (pot[d.top] || 0) - (pot[d.bot] || 0);
          if (Math.abs(vb) > 1 && (d.kind === 'sw' ? !st.g[d.id] : vb > 0)) txt = Math.round(Math.abs(vb)) + ' V';
        }
        if (r.txt !== txt) { r.bt.textContent = txt; r.txt = txt; }
      }
      const pts = sign === 0 ? '' : K.pts(st._pts[sg]);
      if (flow._p !== pts) { flow.setAttribute('points', pts); glow.setAttribute('points', pts); flow._p = pts; }
      vout.textContent = K.fmtV(pot.out);
      vout.setAttribute('fill', `var(--lv${st.lv})`);
      iArrow.setAttribute('transform', `translate(${ox - 60},${oy}) rotate(${sign >= 0 ? 0 : 180})`);
      if (oArr) {
        const on = st.np && sign !== 0;
        oArr.style.display = oLab.style.display = on ? '' : 'none';
        if (on) oArr.setAttribute('transform', `translate(${T.oArrow[0]},${T.oArrow[1]}) rotate(${sign > 0 ? 0 : 180})`);
      }
      if (capTxt.C1) capTxt.C1.textContent = Math.round(V.v1) + ' V';
      if (capTxt.C2) capTxt.C2.textContent = Math.round(V.v2) + ' V';
      if (capTxt.FC) capTxt.FC.textContent = Math.round(V.vf) + ' V';
    }
    return { svg, update };
  }

  const devName = (e) => (e.how === 'sw' || e.d.kind === 'd' ? e.d.lab : e.d.lab.replace('S', 'D'));
  const schLegend = () => h('div', { class: 'schleg', html:
    '<span><i class="lg-gate"></i>gate signal on</span><span><i class="lg-cond"></i>carries current</span>' +
    '<span><i class="lg-idle"></i>no current</span><span><i class="lg-flow"></i>current path</span>' });

  // Static figures: one or more frozen schematics with captions (mode-by-mode analysis slides).
  // cfg.cols wraps the figures into rows (default: all in one row).
  SIMS.legfig = function (host, cfg) {
    const T = TOPO[cfg.topo];
    const V = Object.assign({ v1: 400, v2: 400, vf: T.fcNom || 0 }, cfg.v || {});
    const cols = cfg.cols || cfg.figs.length;
    host.classList.add('figrow');
    host.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    host.style.gridTemplateRows = `repeat(${Math.ceil(cfg.figs.length / cols)}, minmax(0, 1fr))`;
    for (const f of cfg.figs) {
      const st = T.st[f.state];
      if (!st) throw new Error('legfig: unknown state ' + f.state);
      const sch = Schematic(T);
      sch.update(st, f.sign == null ? 1 : f.sign, V);
      const cell = h('figure', { class: 'fig' }, sch.svg, h('figcaption', { html: f.cap || '' }));
      if (f.step != null) cell.setAttribute('data-step', f.step);
      host.append(cell);
    }
    if (cfg.legend != null && cfg.legend !== false) {
      const lg = schLegend();
      lg.style.gridColumn = '1 / -1';
      if (typeof cfg.legend === 'number') lg.setAttribute('data-step', cfg.legend);
      host.append(lg);
    }
    return {};
  };

  function lossLegend(ctx, lx, ly) {
    ctx.font = '600 13px ' + K.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = K.css('--s1'); ctx.fillRect(lx, ly - 6, 12, 12); ctx.fillStyle = K.css('--muted'); ctx.fillText('conduction', lx + 17, ly);
    ctx.fillStyle = K.css('--lvH'); ctx.fillRect(lx + 100, ly - 6, 12, 12); ctx.fillStyle = K.css('--muted'); ctx.fillText('switching', lx + 117, ly);
  }

  // Static loss comparison: one bar chart per operating point (10 kHz, 100 A peak), revealed by steps.
  SIMS.lossbars = function (host, cfg) {
    const W = cfg.w || 460, H = cfg.h || 400;
    const cases = cfg.cases.map((c) => {
      const T = TOPO[c.topo], res = lossesPol(T, cfg.m || 0.9, (c.phi * Math.PI) / 180, c.pol);
      const cv = K.canvas(W, H), cell = h('figure', { class: 'fig' }, cv.el);
      if (c.step != null) cell.setAttribute('data-step', c.step);
      host.append(cell);
      return Object.assign({ T, res, cv }, c);
    });
    host.classList.add('figrow');
    host.style.gridTemplateColumns = `repeat(${cases.length}, 1fr)`;
    function draw() {
      for (const c of cases) {
        const ctx = c.cv.ctx; c.cv.clear();
        const ids = c.T.devs.map((d) => d.id);
        const cv = ids.map((id) => c.res[id].c), sv = ids.map((id) => c.res[id].s), tot = ids.map((_, j) => cv[j] + sv[j]);
        const max = Math.max(...tot), hot = c.T.devs.filter((_, j) => tot[j] > max - 0.5).map((d) => d.lab).join(', ');
        K.bars(ctx, { x: 54, y: 62, w: W - 66, h: H - 100 }, {
          n: ids.length, ylim: [0, cfg.ymax || 80], yticks: [0, 20, 40, 60, 80].map((v) => [v, v + ' W']),
          labels: c.T.devs.map((d) => d.lab), top: tot.map((v) => Math.round(v) + ''), maxBar: 44,
          stack: [{ values: cv, color: K.css('--s1') }, { values: sv, color: K.css('--lvH') }],
          title: c.title + ' · hottest ' + hot,
        });
        lossLegend(ctx, 54, 18);
      }
    }
    K.onTheme(draw);
    draw();
    return {};
  };

  // ---------------- the sim ----------------
  SIMS.leg = function (host, cfg) {
    const P = {
      topo: cfg.topo || 'npc', mode: cfg.mode || 'explore', state: cfg.state || null, sign: cfg.sign || 1,
      m: cfg.m || 0.85, phi: cfg.phi || 0, mf: cfg.mf || 12, speed: cfg.speed || 0.25, pol: cfg.pol || null, playing: true,
    };
    const topos = cfg.topos || [P.topo];
    // Capacitors are ideal throughout: the split link and the flying capacitor hold their nominal voltages.
    const I_EXP = 20, I_RUN = 50, F1 = 50, NB = 1000;
    let T, sch, ui = {}, V, lossRes = null, lastStep = -1;
    const run = { th: 0, c: { prevK: -1, alt: false }, vb: new Float32Array(NB), ib: new Float32Array(NB), fc: new Float32Array(NB), st: null, sign: 1 };
    const loop = K.loop(tick);

    function resetCaps() { V = { v1: 400, v2: 400, vf: T.fcNom || 0 }; }

    function build() {
      T = TOPO[P.topo];
      if (T.policies && !T.policies.some((p) => p[0] === P.pol)) P.pol = T.policies[0][0];
      if (!T.st[P.state]) P.state = T.states[0].id;
      resetCaps();
      host.innerHTML = '';
      host.classList.add('sim');
      host.style.gridTemplateColumns = (cfg.schW || 600) + 'px 1fr';
      sch = Schematic(T);
      const left = h('div', { class: 'sim-col', style: { justifyContent: 'center' } }, sch.svg, schLegend());
      const right = h('div', { class: 'sim-col' });
      const hdr = h('div', { class: 'row' });
      if (topos.length > 1) hdr.append(K.seg({ options: topos.map((k) => [k, TOPO[k].short]), value: P.topo, onChange: (v) => { P.topo = v; P.state = null; build(); } }).el);
      if (!cfg.lockMode) hdr.append(K.seg({ options: [['explore', 'Explore states'], ['run', 'Run PWM']], value: P.mode, onChange: (v) => { P.mode = v; build(); } }).el);
      if (hdr.childElementCount) right.append(hdr);
      if (P.mode === 'explore') buildExplore(right); else buildRun(right, left);
      host.append(left, right);
      if (P.mode === 'run') changed();
      refresh();
    }

    // ----- explore -----
    function buildExplore(right) {
      const hasNp = T.states.some((x) => x.np), hasFc = !!T.fcap;
      const stSeg = K.seg({
        label: 'Switching state',
        options: T.states.map((st) => [st.id, `<span class="lv${st.lv}">${st.name}</span>` + (T.key === 'anpc5' ? '' : ` <small>${K.fmtV(st.vnom)}</small>`)]),
        value: P.state, onChange: (v) => { P.state = v; refresh(); },
      });
      const iSeg = K.seg({ label: 'Phase current', options: [[1, 'i<sub>a</sub> &gt; 0 (out of leg)'], [-1, 'i<sub>a</sub> &lt; 0 (into leg)']], value: P.sign, onChange: (v) => { P.sign = v; refresh(); } });
      const row2 = h('div', { class: 'row', style: { alignItems: 'flex-end' } }, iSeg.el);
      ui.vo = K.readout('Pole voltage v<sub>aO</sub>', 'big');
      ui.cd = K.readout('Conducting devices');
      ui.cx = K.readout(hasFc ? 'Flying-capacitor current' : hasNp ? 'Midpoint current i<sub>O</sub>' : 'Blocking (off devices)');
      const sws = T.devs.filter((d) => d.kind === 'sw');
      const thead = h('tr', null, h('th', null, 'state'), sws.map((d) => h('th', null, d.lab)), h('th', null, 'v_aO'), (hasFc || hasNp) ? h('th', { html: hasFc ? 'i<sub>fc</sub>' : 'i<sub>O</sub>' }) : null);
      ui.rows = {};
      const tbody = h('tbody');
      for (const st of T.states) {
        const tr = h('tr', null, h('td', { class: 'st', html: `<span class="lv${st.lv}">${st.name}</span>` }),
          sws.map((d) => h('td', { class: st.g[d.id] ? 'g1' : 'g0' }, st.g[d.id] ? '1' : '0')),
          h('td', { class: `lv${st.lv}` }, K.fmtV(st.vnom)),
          (hasFc || hasNp) ? h('td', null, hasFc ? (st.fc > 0 ? '+i_a' : st.fc < 0 ? '−i_a' : '0') : (st.np ? 'i_a' : '0')) : null);
        tr.addEventListener('click', () => { P.state = st.id; stSeg.set(st.id); refresh(); });
        ui.rows[st.id] = tr; tbody.append(tr);
      }
      ui.stSeg = stSeg;
      right.append(stSeg.el, row2,
        h('div', { class: 'ro-grid', style: { gridTemplateColumns: '0.9fr 1.3fr 1.2fr' } }, ui.vo.el, ui.cd.el, ui.cx.el));
      if (cfg.table !== false) right.append(h('table', { class: 'statetab' }, h('thead', null, thead), tbody));
    }

    // ----- run -----
    function buildRun(right, left) {
      ui.cvA = K.canvas(cfg.plotW || 840, cfg.plotAH || 250);
      ui.cvB = K.canvas(cfg.plotW || 840, cfg.plotBH || 220);
      left.style.justifyContent = 'flex-start';
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 22px' } });
      grid.append(
        K.slider({ label: 'm', min: 0, max: 1, step: 0.01, value: P.m, fmt: (v) => v.toFixed(2), onInput: (v) => { P.m = v; changed(); } }).el,
        K.slider({ label: 'φ (i lags v)', min: -180, max: 180, step: 5, value: P.phi, fmt: (v) => v + '°', onInput: (v) => { P.phi = v; changed(); } }).el,
        K.slider({ label: 'f<sub>sw</sub>/f<sub>1</sub> (shown)', min: 6, max: 30, step: 1, value: P.mf, fmt: (v) => String(v), onInput: (v) => { P.mf = v; presim(); draw(); } }).el,
        K.slider({ label: 'speed', min: 0.05, max: 1, step: 0.05, value: P.speed, fmt: (v) => v.toFixed(2) + ' cyc/s', onInput: (v) => { P.speed = v; } }).el);
      const row = h('div', { class: 'row', style: { alignItems: 'flex-end' } });
      if (T.policies) row.append(K.seg({ label: T.polLabel, options: T.policies, value: P.pol, onChange: (v) => { P.pol = v; changed(); } }).el);
      ui.play = K.btn(P.playing ? '❚❚ Pause' : '▶ Play', toggle);
      row.append(ui.play);
      right.append(ui.cvA.el, ui.cvB.el);
      left.append(grid, row);
    }
    function changed() {
      presim();
      if (!T.fcap) lossRes = lossesPol(T, P.m, (P.phi * Math.PI) / 180, P.pol);
      draw();
    }
    function stepRun(th) {
      const r = P.m * Math.sin(th), i = I_RUN * Math.sin(th - (P.phi * Math.PI) / 180);
      const k = levelPD(r, (P.mf * th) / K.TAU, T.levels);
      const st = T.st[T.pick(k, r, i, run.c, P.pol, V)];
      run.c.prevK = k;
      const idx = Math.min(NB - 1, Math.floor((th / K.TAU) * NB));
      run.vb[idx] = st.pot(V).out; run.ib[idx] = i; run.fc[idx] = (st.fc || 0) * i;
      run.sign = i >= 0 ? 1 : -1;
      return st;
    }
    function presim() {
      run.c = { prevK: -1, alt: false };
      const n = NB * 2;
      for (let j = 0; j < n; j++) stepRun((K.TAU * j) / n);
      run.th = 0;
    }
    function advanceRun(dt) {
      if (!P.playing) return;
      const dth = K.TAU * P.speed * dt;
      const maxStep = Math.min(K.TAU / (P.mf * 60), K.TAU / NB);
      const n = Math.max(1, Math.ceil(dth / maxStep)), hh = dth / n;
      let st = run.st;
      for (let j = 0; j < n; j++) {
        run.th += hh;
        if (run.th >= K.TAU) run.th -= K.TAU;
        st = stepRun(run.th);
      }
      run.st = st;
      sch.update(st, run.sign, V);
      draw();
    }
    function draw() {
      if (P.mode !== 'run' || !ui.cvA) return;
      const A = ui.cvA, ctx = A.ctx;
      A.clear();
      const ink = K.css('--ink'), acc = K.css('--accent'), mut = K.css('--muted'), c2 = K.css('--s1');
      const series = [];
      const nC = T.levels - 1;
      for (let j = 0; j < nC; j++) {
        const xs = [], ys = [];
        for (let q = 0; q <= 2 * P.mf; q++) { xs.push((q / (2 * P.mf)) * K.TAU); ys.push((-1 + (2 / nC) * (j + (q % 2))) * 400); }
        series.push({ x: xs, y: ys, color: mut, width: 1, alpha: 0.45 });
      }
      const NR = 200, ry = new Float32Array(NR + 1);
      for (let q = 0; q <= NR; q++) ry[q] = P.m * Math.sin((K.TAU * q) / NR) * 400;
      series.push({ y: ry, x0: 0, dx: K.TAU / NR, color: acc, width: 2, dash: [7, 5] });
      const iy = new Float32Array(NB);
      for (let q = 0; q < NB; q++) iy[q] = (run.ib[q] * 360) / I_RUN;
      series.push({ y: iy, x0: 0, dx: K.TAU / NB, color: c2, width: 2, alpha: 0.85 });
      series.push({ y: run.vb, x0: 0, dx: K.TAU / NB, color: ink, width: 2.4, step: true });
      const yt = T.levels === 5 ? [-400, -200, 0, 200, 400] : [-400, 0, 400];
      K.plot(ctx, { x: 56, y: 28, w: A.w - 72, h: A.h - 62 }, {
        xlim: [0, K.TAU], ylim: [-470, 470], yticks: yt.map((v) => [v, String(v)]),
        xticks: [[0, '0'], [K.TAU / 4, '5 ms'], [K.TAU / 2, '10 ms'], [(3 * K.TAU) / 4, '15 ms'], [K.TAU, '20 ms']],
        series, cursor: run.th, title: 'Pole voltage v_aO [V] over one 50 Hz period',
        legend: [['v_aO', ink], ['reference', acc, [7, 5]], ['i_a (scaled)', c2], ['carriers', mut]],
      });
      const Bc = ui.cvB, bx = Bc.ctx;
      Bc.clear();
      if (T.fcap) {
        let avg = 0;
        for (let q = 0; q < NB; q++) avg += run.fc[q] / NB;
        K.plot(bx, { x: 56, y: 28, w: Bc.w - 72, h: Bc.h - 62 }, {
          xlim: [0, K.TAU], ylim: [-I_RUN * 1.15, I_RUN * 1.15], yticks: [[-I_RUN, '−' + I_RUN], [0, '0'], [I_RUN, '+' + I_RUN]],
          xticks: [[0, '0'], [K.TAU / 4, '5 ms'], [K.TAU / 2, '10 ms'], [(3 * K.TAU) / 4, '15 ms'], [K.TAU, '20 ms']],
          series: [{ y: run.fc, x0: 0, dx: K.TAU / NB, color: K.css('--s1'), width: 2, step: true }], cursor: run.th,
          title: `Flying-capacitor current i_fc [A] · period average ${avg.toFixed(1)} A · ideal C_fc held at ${T.fcNom} V`,
        });
      } else if (lossRes) {
        const ids = T.devs.map((d) => d.id);
        const cv = ids.map((id) => lossRes[id].c), sv = ids.map((id) => lossRes[id].s);
        const tot = ids.map((_, j) => cv[j] + sv[j]);
        const ymax = K.niceMax(Math.max(20, ...tot) * 1.12);
        const sum = tot.reduce((a, b) => a + b, 0);
        let hot = 0;
        tot.forEach((v, j) => { if (v > tot[hot]) hot = j; });
        const pf = Math.cos((P.phi * Math.PI) / 180);
        const modeTxt = Math.abs(pf) < 0.26 ? 'mostly reactive' : pf > 0 ? 'inverter' : 'rectifier';
        K.bars(bx, { x: 56, y: 30, w: Bc.w - 72, h: Bc.h - 62 }, {
          n: ids.length, ylim: [0, ymax], yticks: [0, ymax / 2, ymax].map((v) => [v, Math.round(v) + ' W']),
          labels: T.devs.map((d) => d.lab), top: tot.map((v) => Math.round(v) + ''), maxBar: 54,
          stack: [{ values: cv, color: K.css('--s1') }, { values: sv, color: K.css('--lvH') }],
          title: `Losses [W], 10 kHz, 100 A pk · ${modeTxt}, PF ${pf.toFixed(2)} · total ${Math.round(sum)} W · hottest ${T.devs[hot].lab}`,
        });
        lossLegend(bx, Bc.w - 186, 17);
      }
    }

    // ----- shared -----
    function refresh() {
      if (P.mode === 'run') { if (sch) sch.update(run.st || T.states[0], run.sign, V); draw(); return; }
      const st = T.st[P.state];
      sch.update(st, P.sign, V);
      const pot = st.pot(V);
      ui.vo.set(`<span class="lv${st.lv}">${K.fmtV(pot.out)}</span>`);
      ui.cd.set(st._el[P.sign >= 0 ? 'pos' : 'neg'].map(devName).join(' + '));
      if (T.fcap) {
        const f = st.fc * P.sign;
        ui.cx.set(f === 0 ? '0 <small class="muted">(bypassed)</small>' : (f > 0 ? `+${I_EXP} A <small class="lvO">charging</small>` : `−${I_EXP} A <small class="lvP">discharging</small>`));
      } else if (T.states.some((x) => x.np)) {
        ui.cx.set(st.np ? (P.sign > 0 ? `+${I_EXP} A <small class="muted">drawn from O</small>` : `−${I_EXP} A <small class="muted">pushed into O</small>`) : '0');
      } else {
        const off = T.devs.filter((d) => !st.g[d.id]).map((d) => d.lab).join(', ');
        ui.cx.set(off + ' <small class="muted">block 800 V</small>');
      }
      for (const id in ui.rows) ui.rows[id].classList.toggle('cur', id === P.state);
      if (ui.stSeg.get() !== P.state) ui.stSeg.set(P.state);
    }
    function tick(dt) {
      if (P.mode === 'run') advanceRun(dt);
    }
    function toggle() {
      P.playing = !P.playing;
      if (ui.play) ui.play.innerHTML = P.playing ? '❚❚ Pause' : '▶ Play';
    }
    K.onTheme(draw);
    build();
    return {
      start() { loop.start(); },
      stop() { loop.stop(); },
      toggle,
      reset() { resetCaps(); if (P.mode === 'run') presim(); refresh(); },
      step(k) {
        if (!cfg.steps) return;
        let j = k;
        while (j >= 0 && !cfg.steps[j]) j--;
        if (j < 0 || j === lastStep) return;
        lastStep = j;
        Object.assign(P, cfg.steps[j]);
        build();
      },
    };
  };
})();
