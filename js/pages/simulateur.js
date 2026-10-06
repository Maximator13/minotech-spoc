import { mountLayout } from '../layout.js';
import { initMotion } from '../motion.js';
import { SIM_DEFAULTS, createState, step, wallProfile, toleranceRatio } from '../sim/model.js';
import { createSimView, presetParams, matchesPreset, fmt } from '../sim/view.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const $ = (id) => document.getElementById(id);
const canvas = $('sim-canvas');
const view = createSimView(canvas);
const presetBtns = [...document.querySelectorAll('[data-preset]')];
const pauseBtn = $('sim-pause');

// Curseurs : clé du modèle, décimales, unité affichée, unité lue (aria-valuetext).
const SLIDERS = [
  { id: 'sim-target', key: 'target', d: 0, unit: 'mm', spoken: 'millimètres' },
  { id: 'sim-tilt', key: 'wallTiltDeg', d: 1, unit: '°', spoken: 'degrés', signed: true },
  { id: 'sim-speed', key: 'carrierSpeed', d: 0, unit: 'mm/s', spoken: 'millimètres par seconde' },
  { id: 'sim-noise', key: 'noiseMm', d: 1, unit: 'mm', spoken: 'millimètres' },
];

let params = presetParams('nominal');
let state = createState(params);
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let visible = true, raf = 0, last = 0, lastText = -Infinity, lastLabel = -Infinity;

function showSlider(sl) {
  const el = $(sl.id), v = params[sl.key];
  el.value = String(v);
  el.style.setProperty('--fill', `${((v - el.min) / (el.max - el.min)) * 100}%`); // CSSOM : autorisé par la CSP (pas d'attribut style)
  const txt = fmt(v, sl.d, sl.signed);
  $(sl.id + '-out').textContent = sl.unit === '°' ? txt + '°' : `${txt} ${sl.unit}`;
  el.setAttribute('aria-valuetext', `${txt} ${sl.spoken}`);
}

function syncControls() {
  SLIDERS.forEach(showSlider);
  presetBtns.forEach((b) => b.setAttribute('aria-pressed', String(matchesPreset(params, b.dataset.preset))));
}

// Lectures à 10 Hz (chiffres lisibles), libellé du Canvas à 2 Hz (cf. brief) ; force : rafraîchissement immédiat.
function readouts(now, force) {
  if (force || now - lastText >= 100) {
    lastText = now;
    $('out-dist').textContent = `${fmt(state.measured)} mm`;
    $('out-err').textContent = `${fmt(state.error, 1, true)} mm`;
    $('out-angle').textContent = `${fmt(state.angle - wallProfile(state.x, params).slopeDeg, 2, true)}°`;
    $('out-stroke').textContent = `${fmt(state.carriage, 0)} mm`;
    $('out-tol').textContent = `${fmt(toleranceRatio(state) * 100, 0)} %`;
  }
  if (force || now - lastLabel >= 500) {
    lastLabel = now;
    canvas.setAttribute('aria-label', `Simulation, passe ${state.pass + 1} : distance mesurée ${fmt(state.measured)} mm `
      + `pour une consigne de ${fmt(params.target, 0)} mm, ${state.inTol ? 'dans la tolérance de plus ou moins 1 mm' : 'correction en cours'}.`);
  }
}

function paint(force = true) {
  view.render(state, params);
  readouts(performance.now(), force);
}

function frame(now) {
  raf = 0;
  const dt = last ? Math.min((now - last) / 1000, SIM_DEFAULTS.dtMax) : 0; // dt plafonné (le modèle borne aussi)
  last = now;
  state = step(state, dt, params);
  paint(false);
  schedule();
}

function schedule() {
  if (!raf && !paused && visible && !document.hidden) raf = requestAnimationFrame(frame);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
}

function setPaused(p) {
  paused = p;
  pauseBtn.querySelector('[data-label]').textContent = p ? 'Reprendre' : 'Pause';
  pauseBtn.querySelector('.icon-pause').classList.toggle('hidden', p);
  pauseBtn.querySelector('.icon-play').classList.toggle('hidden', !p);
  if (p) stop(); else schedule();
}

SLIDERS.forEach((sl) => $(sl.id).addEventListener('input', (e) => {
  params = { ...params, [sl.key]: Number(e.target.value) };
  syncControls();
  if (paused) paint(); // en lecture, la prochaine image tient compte du réglage
}));

presetBtns.forEach((b) => b.addEventListener('click', () => {
  params = presetParams(b.dataset.preset);
  state = createState(params); // un préréglage relance la simulation depuis l'équilibre
  syncControls();
  paint();
}));

pauseBtn.addEventListener('click', () => setPaused(!paused));

document.addEventListener('visibilitychange', () => (document.hidden ? stop() : schedule()));
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) schedule(); else stop();
  }).observe(canvas);
}

syncControls();
paint();
setPaused(paused);
