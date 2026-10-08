import { mountLayout } from '../layout.js';
import { projectData } from '../data.js';
import { initMotion, initHeroSchema } from '../motion.js';
import { renderMedia } from '../lib/media.js';
import { esc } from '../lib/html.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const { media, poles, team } = projectData;
const $ = (id) => document.getElementById(id);

// Onglets du showcase : textes propres à la page, médias issus de data.js.
const VIEWS = {
  team: {
    tag: 'Projet 2024 – 2027 · 3e année',
    title: `${team.length} apprentis ingénieurs, 3 pôles, 2 demi-groupes`,
    desc: "Mécanique, électronique et informatique, encadrés par le CEA Marcoule et l'IMT Mines Alès.",
    fit: 'w-full h-full object-cover',
  },
  robot: {
    tag: 'Prototype',
    title: 'Module de positionnement SPOC',
    desc: 'Module linéaire de 300 mm, module de planéité à deux vérins et rotule, préhenseur et caméra de profondeur (conception détaillée, juin 2026, en révision).',
    fit: 'w-full h-full object-contain p-6',
  },
  system: {
    tag: 'Architecture',
    title: 'Architecture système',
    desc: 'Caméra de profondeur, ESP32 temps réel, Raspberry Pi 5, liaison Wi-Fi UDP et TCP et poste de pilotage.',
    fit: 'w-full h-full object-contain p-6',
  },
};

const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
const panel = $('show-panel');
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let current = 'team';
let timer = 0;

function paint(key) {
  const v = VIEWS[key];
  $('show-media').innerHTML = renderMedia(media.showcase[key]);
  const img = $('show-media').firstElementChild;
  if (img) img.className = v.fit;
  $('show-tag').textContent = v.tag;
  $('show-title-text').textContent = v.title;
  $('show-desc').textContent = v.desc;
  $('show-btn').hidden = key !== 'team';
}

function markTabs(key) {
  panel.setAttribute('aria-labelledby', 'tab-' + key);
  tabs.forEach((t) => {
    const on = t.dataset.tab === key;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    t.classList.toggle('bg-ink', on);
    t.classList.toggle('text-white', on);
    t.classList.toggle('dark:bg-accent', on);
    t.classList.toggle('dark:text-night', on);
  });
}

function select(key) {
  if (key === current) return;
  current = key;
  markTabs(key); // état des onglets immédiat ; seul le contenu du panneau se fond
  clearTimeout(timer);
  if (calm()) return paint(key);
  panel.classList.add('opacity-0'); // fondu 200 ms (transition-opacity duration-200)
  timer = setTimeout(() => { paint(key); panel.classList.remove('opacity-0'); }, 200);
}

tabs.forEach((t, i) => {
  t.addEventListener('click', () => select(t.dataset.tab));
  t.addEventListener('keydown', (e) => {
    const n = tabs.length;
    const to = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = tabs[to];
    next.focus();
    select(next.dataset.tab);
  });
});

paint('team');
markTabs('team');

// Pôles : classes de couleur littérales (Tailwind ne voit pas les classes construites).
const TONE = { heph: 'text-heph', zeus: 'text-zeus', hermes: 'text-hermes' };
$('poles-grid').innerHTML = Object.values(poles).map((p) => {
  const n = team.filter((m) => m.pole === p.key).length;
  return `<article class="bg-paper dark:bg-card p-6">
    <div class="flex items-center gap-3">
      <img src="${esc(p.logo)}" alt="" width="40" height="40" loading="lazy" class="w-10 h-10 rounded-lg object-contain border border-line dark:border-line-dark bg-paper">
      <div><p class="font-mono text-[11px] font-semibold ${TONE[p.key]}">${esc(p.name)}</p><h3 class="font-bold">${esc(p.domain.replace(/^Pôle /, ''))}</h3></div>
    </div>
    <p class="mt-4 text-sm leading-relaxed text-ink-2 dark:text-silver">${esc(p.summary)}</p>
    <p class="mt-4 font-mono text-[11px] text-ink-2/70 dark:text-silver/60">Lead : ${esc(p.lead)} · ${n} membres</p>
  </article>`;
}).join('');

initHeroSchema($('hero-schema'));
