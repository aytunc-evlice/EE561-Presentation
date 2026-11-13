/* deck.js — slide engine: navigation, build steps, sims lifecycle, notes, TOC, theme. */
(function () {
  'use strict';
  const deck = document.getElementById('deck');
  const slides = Array.from(deck.querySelectorAll(':scope > section.slide'));
  const SIMS = window.SIMS;
  const errBox = document.getElementById('errors');
  let cur = -1, step = 0;

  function showError(msg) {
    errBox.hidden = false;
    errBox.append(K.h('div', null, String(msg)));
  }
  window.addEventListener('error', (e) => showError((e.message || e) + '  @ ' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
  window.deckError = showError;

  // ---------- theme ----------
  const root = document.documentElement;
  try { const t = localStorage.getItem('ee561-theme'); if (t) root.dataset.theme = t; } catch (e) { /* storage blocked */ }
  const themeQ = /[?&]theme=(dark|light)/.exec(location.search);
  if (themeQ) root.dataset.theme = themeQ[1];
  function toggleTheme() {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ee561-theme', root.dataset.theme); } catch (e) { /* ignore */ }
    document.dispatchEvent(new Event('themechange'));
  }

  // ---------- decorate slides ----------
  slides.forEach((s, i) => {
    const part = s.dataset.part || '1';
    if (!s.classList.contains('no-chrome')) {
      s.append(K.h('footer', { class: 'sf' },
        K.h('span', null, 'EE561 Advanced Static Power Conversion · Multilevel Converters · Sefer İdacı' + (s.dataset.section === 'backup' ? ' · backup' : '')),
        K.h('span', null, (s._dots = K.h('span', { class: 'dots' })), String(i + 1))));
      const head = s.querySelector('.sh');
      if (head) head.append(K.h('div', { class: 'logos' },
        K.h('img', { class: 'em', src: 'img/odtu_emblem.svg', alt: 'ODTÜ' }),
        K.h('img', { class: 'pl', src: 'img/powerlab_logo.png', alt: 'METU PowerLab' })));
    }
  });
  const titleOf = (s) => s.dataset.title || (s.querySelector('h2, h1') || {}).textContent || 'Slide';

  // ---------- scaling ----------
  const notes = document.getElementById('notes');
  const lecture = document.getElementById('lecture');
  function fit() {
    const avH = window.innerHeight - (notes.classList.contains('open') ? notes.offsetHeight : 0);
    // the lecture-notes panel takes the right side of a wide window; on a narrow one it lies over the slide
    const avW = window.innerWidth - (lecture.classList.contains('open') && window.innerWidth >= 900 ? lecture.offsetWidth : 0);
    const sc = Math.min(avW / 1600, avH / 900);
    const top = avH / 2;
    deck.style.left = avW / 2 + 'px';
    deck.style.top = top + 'px';
    deck.style.transform = 'translate(-50%, -50%) scale(' + sc + ')';
  }
  window.addEventListener('resize', fit);

  // ---------- steps & sims ----------
  function maxStep(s) {
    let m = +(s.dataset.steps || 0);
    s.querySelectorAll('[data-step]').forEach((e) => { m = Math.max(m, +e.dataset.step); });
    return m;
  }
  function eachSim(s, fn) {
    s.querySelectorAll('[data-sim]').forEach((h) => { if (h._sim) { try { fn(h._sim); } catch (e) { showError(e.stack || e); } } });
  }
  function mount(s) {
    s.querySelectorAll('[data-sim]').forEach((h) => {
      if (h._sim) return;
      const f = SIMS[h.dataset.sim];
      if (!f) { h._sim = {}; showError('Unknown sim: ' + h.dataset.sim); return; }
      try { h._sim = f(h, h.dataset.config ? JSON.parse(h.dataset.config) : {}) || {}; }
      catch (e) { h._sim = {}; showError(e.stack || e); }
    });
  }
  function applyStep(s, k) {
    s.querySelectorAll('[data-step]').forEach((e) => e.classList.toggle('shown', +e.dataset.step <= k));
    s.querySelectorAll('[data-until]').forEach((e) => e.classList.toggle('gone', k > +e.dataset.until));
    eachSim(s, (sim) => sim.step && sim.step(k));
  }
  const progress = document.getElementById('progress');
  function go(i, k) {
    i = Math.max(0, Math.min(slides.length - 1, i | 0));
    const s = slides[i];
    if (i !== cur) {
      if (cur >= 0) {
        const o = slides[cur];
        o.classList.remove('active');
        eachSim(o, (sim) => sim.stop && sim.stop());
      }
      cur = i;
      mount(s);
      s.classList.add('active');
      eachSim(s, (sim) => sim.start && sim.start());
      if (!timer.t0 && i > 0) timer.t0 = Date.now();
    }
    step = Math.max(0, Math.min(maxStep(s), k == null ? 0 : k));
    applyStep(s, step);
    if (s._dots) { // one dot per click of this slide
      const m = maxStep(s);
      s._dots.replaceChildren(...(m ? Array.from({ length: m + 1 }, (_, j) => K.h('i', { class: j <= step ? 'on' : '' })) : []));
    }
    progress.style.width = ((i + 1) / slides.length) * 100 + '%';
    try { history.replaceState(null, '', '#' + (i + 1) + (step ? '.' + step : '')); } catch (e) { /* file:// quirk */ }
    renderNotes();
    tocMark();
  }
  function next() { const m = maxStep(slides[cur]); if (step < m) go(cur, step + 1); else go(cur + 1, 0); }
  function prev() { if (step > 0) go(cur, step - 1); else if (cur > 0) go(cur - 1, maxStep(slides[cur - 1])); }
  window.deck = { go, next, prev, get cur() { return cur; } };

  // ---------- notes + timer ----------
  const timer = { t0: 0 };
  const cum = [];
  (function () {
    let a = { 1: 0, 2: 0 };
    slides.forEach((s, i) => { const p = s.dataset.part || '1'; a[p] += +(s.dataset.min || 0); cum[i] = a[p]; });
  })();
  const fmtT = (sec) => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
  const nTitle = K.h('b'), nTime = K.h('span', { class: 'timer' }), nPlan = K.h('span'), nBody = K.h('div');
  notes.append(K.h('div', { class: 'nh' }, K.h('span', null, nTitle, '  ', nPlan), nTime), nBody);
  function renderNotes() {
    const s = slides[cur];
    const n = s.querySelector('aside.notes');
    nTitle.textContent = (cur + 1) + '. ' + titleOf(s);
    const mins = +(s.dataset.min || 0);
    nPlan.textContent = mins ? '  ·  slot ' + fmtT(mins * 60) + '  ·  part clock should read ≈ ' + fmtT(cum[cur] * 60) + ' at the end' : '';
    nBody.innerHTML = n ? n.innerHTML : '<p>No notes.</p>';
    // the same text as lecture notes for a reader: without the time slot
    lTitle.textContent = titleOf(s);
    lNum.textContent = 'Slide ' + (cur + 1) + ' of ' + slides.length;
    lBody.innerHTML = n ? n.innerHTML.replace(/<b>[\d.]+ (?:min|s)\.<\/b>\s*/, '').replace(/<b>[\d.]+ (?:min|s) — (\w)/, (m, c) => '<b>' + c.toUpperCase()) : '<p>No notes for this slide.</p>';
    lBody.scrollTop = 0;
  }

  // ---------- lecture notes: a reading panel beside the slide, with its own button; both hidden in fullscreen ----------
  const lTitle = K.h('h3'), lNum = K.h('div', { class: 'ln' }), lBody = K.h('div', { class: 'lb' });
  function toggleLecture(on) {
    lecture.classList.toggle('open', typeof on === 'boolean' ? on : undefined);
    lectureBtn.classList.toggle('on', lecture.classList.contains('open'));
    fit();
  }
  const lectureBtn = K.btn('Lecture notes', toggleLecture);
  lectureBtn.id = 'lecturebtn';
  lectureBtn.title = 'Explanation of this slide (L). Hidden in fullscreen (F).';
  document.body.append(lectureBtn);
  lecture.append(K.h('div', { class: 'lh' }, K.h('div', null, lNum, lTitle), K.btn('✕', () => toggleLecture(false))), lBody);
  document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) toggleLecture(false); fit(); });
  setInterval(() => {
    if (!timer.t0) { nTime.textContent = '0:00'; return; }
    const el = (Date.now() - timer.t0) / 1000;
    nTime.textContent = fmtT(el);
    nTime.classList.toggle('late', cur >= 0 && el / 60 > cum[cur] + 0.5);
  }, 500);
  function toggleNotes() { notes.classList.toggle('open'); setTimeout(fit, 260); fit(); }

  // ---------- TOC ----------
  const toc = document.getElementById('toc');
  const colA = K.h('div'), colB = K.h('div');
  toc.append(colA, colB);
  let lastSec = '';
  slides.forEach((s, i) => {
    const part = s.dataset.part || '1';
    const col = part === '2' ? colB : colA;
    if (!col.childElementCount) col.append(K.h('h4', { style: { marginTop: 0, fontSize: '18px', color: '#fff' } }, part === '2' ? 'More' : 'Building the levels'));
    const sec = part + (s.dataset.section || '');
    if (sec !== lastSec && s.dataset.section) { col.append(K.h('h4', null, s.dataset.section)); lastSec = sec; }
    const a = K.h('a', { href: '#' + (i + 1) }, K.h('span', null, String(i + 1)), titleOf(s));
    a.addEventListener('click', (e) => { e.preventDefault(); toc.classList.remove('open'); go(i, 0); });
    a._i = i;
    col.append(a);
  });
  toc.append(K.h('div', { class: 'help', html:
    '<kbd>→</kbd>/<kbd>Space</kbd>/<kbd>PgDn</kbd> next step · <kbd>←</kbd>/<kbd>PgUp</kbd> back · <kbd>N</kbd> speaker notes + timer · <kbd>L</kbd> lecture notes (not in fullscreen) ·<kbd>O</kbd> this index · ' +
    '<kbd>P</kbd> play/pause simulation · <kbd>R</kbd> reset simulation · <kbd>F</kbd> fullscreen · <kbd>D</kbd> dark/light · <kbd>B</kbd> black screen · <kbd>T</kbd> restart timer · type a number + <kbd>Enter</kbd> to jump' }));
  function tocMark() { toc.querySelectorAll('a').forEach((a) => a.classList.toggle('cur', a._i === cur)); }
  function toggleToc() { toc.classList.toggle('open'); }

  // ---------- keyboard ----------
  let typed = '', typedT = 0;
  const black = document.getElementById('black');
  document.addEventListener('keydown', (e) => {
    const t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' && t.type === 'range' && /^Arrow/.test(e.key)) return;
    if ((tag === 'INPUT' && t.type !== 'range') || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (black.classList.contains('on') && !['b', 'B', '.'].includes(k)) { black.classList.remove('on'); e.preventDefault(); return; }
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': prev(); break;
      case 'Home': go(0, 0); break;
      case 'End': go(slides.length - 1, 0); break;
      case 'n': case 'N': toggleNotes(); break;
      case 'l': case 'L': if (!document.fullscreenElement) toggleLecture(); break;
      case 'o': case 'O': toggleToc(); break;
      case 'Escape': toc.classList.remove('open'); break;
      case 'f': case 'F': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); break;
      case 'd': case 'D': toggleTheme(); break;
      case 'b': case 'B': case '.': black.classList.toggle('on'); break;
      case 'p': case 'P': eachSim(slides[cur], (sim) => sim.toggle && sim.toggle()); break;
      case 'r': case 'R': eachSim(slides[cur], (sim) => sim.reset && sim.reset()); break;
      case 't': case 'T': timer.t0 = Date.now(); break;
      case 'Enter': if (typed) { go(+typed - 1, 0); typed = ''; } break;
      default:
        if (/^[0-9]$/.test(k)) { typed += k; clearTimeout(typedT); typedT = setTimeout(() => { typed = ''; }, 1600); }
        else return;
    }
    e.preventDefault();
  });

  // ---------- mouse nav buttons ----------
  const nb = document.getElementById('navbtns');
  nb.append(K.btn('◀', prev), K.btn('Index', toggleToc), K.btn('Notes', toggleNotes), K.btn('▶', next));
  let mouseT = 0;
  document.addEventListener('mousemove', () => { document.body.classList.add('mouse'); clearTimeout(mouseT); mouseT = setTimeout(() => document.body.classList.remove('mouse'), 1800); });

  // ---------- touch: horizontal swipe = next/prev (not on sliders, plots or the index) ----------
  let touch = null;
  document.addEventListener('touchstart', (e) => {
    const t = e.target;
    touch = (e.touches.length === 1 && !t.closest('input, select, button, canvas, #toc')) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) { if (dx < 0) next(); else prev(); }
  }, { passive: true });

  // ---------- start ----------
  if (/[?&]static/.test(location.search)) document.documentElement.classList.add('static');
  fit();
  const m = /^#(\d+)(?:\.(\d+))?/.exec(location.hash || '');
  go(m ? +m[1] - 1 : 0, m && m[2] ? +m[2] : 0);
  if (/[?&]notes/.test(location.search)) toggleNotes();
  if (/[?&]lecture/.test(location.search)) toggleLecture(true);
})();
