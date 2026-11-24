import { mountLayout } from '../layout.js';
import { projectData } from '../data.js';
import { initMotion, initHeroSchema } from '../motion.js';
import { renderMedia } from '../lib/media.js';
import { esc } from '../lib/html.js';
import { initParticles } from '../particles.js';

mountLayout();
initParticles();
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
    title: 'SPOC, en 3D',
    desc: "Rendu de l'assemblage SolidWorks : module linéaire, module de planéité à deux vérins et rotule, support du préhenseur et, en transparence, la place de la sonde.",
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

function paint(key) {
  const v = VIEWS[key];
  $('show-media').innerHTML = renderMedia(media.showcase[key]);
  const img = $('show-media').firstElementChild;
  if (img) img.className = v.fit;
  $('show-tag').textContent = v.tag;
  $('show-title-text').textContent = v.title;
  $('show-desc').textContent = v.desc;
  $('show-btn').hidden = key !== 'team';
  $('show-cao').hidden = key !== 'robot';
}

const pill = $('tab-pill');
// Pastille sous l'onglet actif ; sans transition au premier affichage et au redimensionnement.
function placePill(key, still) {
  const t = tabs.find((x) => x.dataset.tab === key);
  pill.classList.toggle('still', still);
  pill.style.width = t.offsetWidth + 'px';
  pill.style.transform = `translateX(${t.offsetLeft}px)`;
}

// L'onglet actif reprend lui-meme le fond une fois la pastille arrivee (contraste lisible meme sans la pastille).
let pillTimer = 0;
function markTabs(key, still = false) {
  panel.setAttribute('aria-labelledby', 'tab-' + key);
  clearTimeout(pillTimer);
  tabs.forEach((t) => {
    const on = t.dataset.tab === key;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    t.classList.toggle('text-white', on);
    t.classList.toggle('dark:text-night', on);
    t.classList.remove('tab-on');
  });
  placePill(key, still);
  const act = tabs.find((t) => t.dataset.tab === key);
  if (still || calm()) act.classList.add('tab-on');
  else pillTimer = setTimeout(() => act.classList.add('tab-on'), 560);
}

// Le contenu du panneau glisse dans le sens de l'onglet choisi : sortie rapide, entrée amortie.
const EASE = 'cubic-bezier(.32,.72,0,1)';
const parts = () => [...panel.children];
let token = 0;
function select(key) {
  if (key === current) return;
  const dir = Math.sign(tabs.findIndex((t) => t.dataset.tab === key) - tabs.findIndex((t) => t.dataset.tab === current)) || 1;
  current = key;
  markTabs(key);
  if (calm()) return paint(key);
  const mine = ++token;
  parts().forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  const out = parts().map((el) => el.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 40}px)`, opacity: 0 }],
    { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }));
  Promise.all(out.map((a) => a.finished.catch(() => 0))).then(() => {
    if (mine !== token) return; // un autre onglet a ete choisi entre-temps
    paint(key);
    parts().forEach((el) => {
      el.getAnimations().forEach((a) => a.cancel());
      el.animate([{ transform: `translateX(${dir * 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: EASE });
    });
  });
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
markTabs('team', true);
addEventListener('resize', () => placePill(current, true));
document.fonts?.ready.then(() => placePill(current, true)); // largeurs exactes une fois Inter chargee

// Pôles : classes de couleur littérales (Tailwind ne voit pas les classes construites).
const TONE = { heph: 'text-heph', zeus: 'text-zeus', hermes: 'text-hermes' };
// Pictogrammes des pôles (brand/pictos), même trait que la marque.
const PICTO = { heph: 'M4 11h16l-3 4H7zM8 15l-1 4h10l-1-4M9 11V8h8v3', zeus: 'M13 3 5 14h6l-1 7 9-12h-6z', hermes: 'M3 19c7 0 13-5 17-14-7 1-13 6-17 14zM3 19c4-1 8-3 11-7' };
$('poles-grid').innerHTML = Object.values(poles).map((p) => {
  const n = team.filter((m) => m.pole === p.key).length;
  return `<article class="bg-paper dark:bg-card p-6">
    <div class="flex items-center gap-3">
      <span class="w-10 h-10 shrink-0 grid place-items-center rounded-lg border border-line dark:border-line-dark ${TONE[p.key]}" aria-hidden="true"><svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${PICTO[p.key]}"/></svg></span>
      <div><p class="font-mono text-xs font-semibold ${TONE[p.key]}">${esc(p.name)}</p><h3 class="font-bold">${esc(p.domain.replace(/^Pôle /, ''))}</h3></div>
    </div>
    <p class="mt-4 text-sm leading-relaxed text-ink-2 dark:text-silver">${esc(p.summary)}</p>
    <p class="mt-4 font-mono text-xs text-ink-2/70 dark:text-silver/60">Lead : ${esc(p.lead)} · ${n} membres</p>
  </article>`;
}).join('');

initHeroSchema($('hero-schema'));

// Portraits : deux rangées centrées (aria-hidden, la liste nominative est sur equipe.html),
// répétées jusqu'à couvrir la largeur de l'écran plus l'amplitude du glissement, même sur écran large.
const half = Math.ceil(team.length / 2);
const fillRows = () => document.querySelectorAll('[data-drift]').forEach((row, r) => {
  const people = r ? team.slice(half) : team.slice(0, half);
  const copies = Math.max(2, Math.ceil((innerWidth + 480) / (people.length * 128)));
  if (row.childElementCount === copies * people.length) return;
  row.innerHTML = Array.from({ length: copies }, () => people).flat().map((m) => `<img src="${esc(m.photo)}-120.webp" srcset="${esc(m.photo)}-120.webp 120w, ${esc(m.photo)}-200.webp 200w" sizes="112px" width="400" height="400" alt="" loading="lazy" decoding="async" class="w-28 h-36 shrink-0 rounded-2xl object-cover">`).join('');
});
fillRows();
addEventListener('resize', fillRows);

// Défilement lié au scroll, à la manière des pages produit : les rangées glissent en sens opposés,
// le panneau du showcase grandit jusqu'à sa taille réelle pendant que la photo se dézoome.
if (!calm()) {
  const rows = [...document.querySelectorAll('[data-drift]')], grow = document.querySelector('[data-grow]');
  const clamp = (x) => Math.max(0, Math.min(1, x));
  let ticking = false;
  const update = () => {
    ticking = false;
    const h = innerHeight;
    rows.forEach((row) => {
      const r = row.parentElement.getBoundingClientRect();
      const p = clamp((h - r.top) / (h + r.height)), dir = Number(row.dataset.drift);
      row.style.transform = `translate3d(${dir * (0.5 - p) * 320}px,0,0)`; // ± 160 px autour du centre
    });
    if (grow) {
      const p = clamp((h - grow.getBoundingClientRect().top) / (h * 0.75)), img = grow.querySelector('img');
      grow.style.transform = `scale(${(0.88 + 0.12 * p).toFixed(4)})`;
      if (img) img.style.transform = `scale(${(1.12 - 0.12 * p).toFixed(4)})`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
}
