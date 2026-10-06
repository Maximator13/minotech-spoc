import { dampedError, HERO } from './lib/hero.js';

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Les unités doivent rester HORS de l'élément [data-to] : son texte est remplacé pendant l'animation.
function countUp(el) {
  const final = el.textContent, to = parseFloat(el.dataset.to);
  if (!Number.isFinite(to)) return;
  const dec = (el.dataset.to.split('.')[1] || '').length, t0 = performance.now(), dur = 900;
  (function tick(now) {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = k === 1 ? final : (to * (1 - Math.pow(1 - k, 3))).toFixed(dec);
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

// Apparition au scroll (.reveal -> .in) et compteurs [data-to] dans [data-count-root].
export function initMotion(root = document) {
  const els = root.querySelectorAll('.reveal:not(.in):not([data-motion]), [data-count-root]:not(.in):not([data-motion])');
  if (calm() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in')); // compteurs : texte final laissé tel quel
    return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.hasAttribute('data-count-root')) e.target.querySelectorAll('[data-to]').forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0, rootMargin: '0px 0px -10% 0px' });
  els.forEach((el) => { el.dataset.motion = '1'; io.observe(el); }); // marqueur : un 2e appel ne ré-observe pas
}

// Schéma du hero : la paroi perturbe la sonde, l'asservissement la recale (oscillation amortie).
export function initHeroSchema(svg) {
  if (!svg || calm() || svg.dataset.heroInit) return;
  svg.dataset.heroInit = '1';
  const $ = (id) => svg.querySelector('#' + id);
  const probe = $('probe'), rail = $('rail'), cote = $('cote'), readout = $('readout'), dot = $('lockDot'), txt = $('lockTxt');
  if (![probe, rail, cote, readout, dot, txt].every(Boolean)) return;
  let kick = performance.now(), amp = 9, raf = 0;
  const frame = (now) => {
    const t = (now - kick) / 1000;
    if (t > HERO.periodSec) {
      kick = now;
      amp = (Math.random() < 0.5 ? -1 : 1) * (HERO.ampMin + Math.random() * (HERO.ampMax - HERO.ampMin));
    }
    const err = dampedError((now - kick) / 1000, amp), dx = -err * HERO.pxPerMm;
    probe.setAttribute('transform', `translate(${dx.toFixed(2)} 0)`);
    rail.setAttribute('x2', (230 + dx).toFixed(2));
    cote.setAttribute('x1', (278 + dx).toFixed(2));
    readout.textContent = `d = ${(HERO.targetMm + err).toFixed(1).replace('.', ',')} mm`;
    const ok = Math.abs(err) <= HERO.toleranceMm;
    dot.setAttribute('class', ok ? 'fill-ok' : 'fill-warn'); // teintes par thème (--color-ok / --color-warn)
    txt.textContent = ok ? 'DANS LA TOLÉRANCE' : 'CORRECTION EN COURS';
    raf = requestAnimationFrame(frame);
  };
  // Boucle suspendue quand le SVG est hors écran (sans IntersectionObserver : boucle continue).
  if (!('IntersectionObserver' in window)) { raf = requestAnimationFrame(frame); return; }
  new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];
    if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
    else if (!e.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
  }).observe(svg);
}
