import { mountLayout } from '../layout.js';
import { siteConfig } from '../data.js';
import { initMotion } from '../motion.js';

mountLayout();
initMotion();

document.querySelectorAll('[data-legal]').forEach((el) => {
  el.textContent = siteConfig.legal[el.dataset.legal] || "À compléter par l'équipe";
});

// 404.html porte un <base href> : « #main » pointerait vers l'accueil, on garde le lien d'évitement local.
if (document.querySelector('base')) {
  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('main');
    main.tabIndex = -1;
    main.focus();
  });
}
