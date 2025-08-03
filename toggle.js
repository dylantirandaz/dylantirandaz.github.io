(() => {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle dark mode');
  document.body.appendChild(btn);

  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let mode = stored || (prefersDark ? 'dark' : 'light');
  apply(mode);

  btn.addEventListener('click', () => {
    mode = mode === 'light' ? 'dark' : 'light';
    apply(mode);
    localStorage.setItem('theme', mode);
  });

  const reveal = () => document.body.classList.add('reveal');
  ['mousemove', 'scroll', 'touchstart'].forEach(evt =>
    addEventListener(evt, reveal, { once: true })
  );

  function apply(m) {
    document.documentElement.setAttribute('data-theme', m);
    btn.textContent = m === 'light' ? '☀️' : '🌙';
  }
})();
