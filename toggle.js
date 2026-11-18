// Loaded in <head>: the theme is set before the first paint, so a dark page never flashes light.
(() => {
  let mode = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', mode);

  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Toggle dark mode');
  button.addEventListener('click', () => {
    mode = mode === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  });

  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(button));
})();
