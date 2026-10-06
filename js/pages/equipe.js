import { mountLayout } from '../layout.js';
import { projectData } from '../data.js';
import { initMotion } from '../motion.js';
import { renderMedia } from '../lib/media.js';
import { FILTERS, POLE_DOT, POLE_LABEL, GROUP_LABEL, filterMembers, keyFromHash, memberCardHtml } from '../lib/team.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const { team, media } = projectData;
const $ = (id) => document.getElementById(id);
const grid = $('team-grid');
const count = $('team-count');
const dialog = $('member-dialog');
const buttons = [...document.querySelectorAll('[data-filter]')];
let opener = null;

$('team-photo').innerHTML = renderMedia({ ...media.showcase.team, sizes: '(min-width: 944px) 896px, 100vw' }); // conteneur max-w-4xl

function applyFilter(key) {
  if (!FILTERS.some((f) => f.key === key)) key = 'all';
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === key)));
  const list = filterMembers(team, key);
  grid.innerHTML = list.map((m) => memberCardHtml(m, team.indexOf(m))).join('');
  count.textContent = `${list.length} membres`;
  return key;
}

buttons.forEach((b) => b.addEventListener('click', () => {
  const key = applyFilter(b.dataset.filter);
  history.replaceState(null, '', key === 'all' ? location.pathname + location.search : '#' + key);
}));

// Le hash (#G1, #heph…) présélectionne le filtre : liens externes et redirections.
// Au chargement, hash inconnu -> « Tous » ; ensuite seules les clés de filtre comptent (ancres de section, Retour).
applyFilter(keyFromHash(location.hash) ?? 'all');
window.addEventListener('hashchange', () => {
  const key = keyFromHash(location.hash);
  if (key) applyFilter(key);
});

grid.addEventListener('click', (e) => {
  const card = e.target.closest('[data-member]');
  if (!card) return;
  const m = team[Number(card.dataset.member)];
  opener = card;
  const photo = $('member-photo');
  photo.removeAttribute('src'); // pas d'image précédente pendant le chargement
  photo.alt = `Portrait de ${m.name}`;
  photo.src = `${m.photo}-400.webp`;
  $('member-name').textContent = m.name;
  $('member-role').textContent = m.role;
  $('member-pole').textContent = POLE_LABEL[m.pole] ? `Pôle ${POLE_LABEL[m.pole]}` : '';
  $('member-dot').className = `w-2.5 h-2.5 rounded-full ${POLE_DOT[m.pole] || ''}`;
  $('member-group').textContent = GROUP_LABEL[m.demiGroupe] || '';
  $('member-bio').textContent = m.bio;
  dialog.showModal();
});

$('member-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // clic sur le fond
dialog.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus(); });
