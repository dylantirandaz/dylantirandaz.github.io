// Loaded in <head>: the theme is set before the first paint, so a dark page never flashes light.
(() => {
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle dark mode');

  const stored = localStorage.getItem('theme');
  let mode = stored || 'dark';
  apply(mode);

  btn.addEventListener('click', () => {
    mode = mode === 'light' ? 'dark' : 'light';
    apply(mode);
    localStorage.setItem('theme', mode);
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(btn);

    const reveal = () => document.body.classList.add('reveal');
    ['mousemove', 'scroll', 'touchstart'].forEach(evt =>
      addEventListener(evt, reveal, { once: true })
    );
  });

  function apply(m) {
    document.documentElement.setAttribute('data-theme', m);
    btn.textContent = m === 'light' ? '☀️' : '🌙';
  }
})();
