// Keep each heading (.qh) on the same printed page as the solution block (.sol) that follows it.
document.querySelectorAll('.qh').forEach((head) => {
  const next = head.nextElementSibling;
  if (!next || !next.classList.contains('sol')) return;
  const wrap = document.createElement('div');
  wrap.className = 'avoid';
  head.before(wrap);
  wrap.append(head, next);
});
