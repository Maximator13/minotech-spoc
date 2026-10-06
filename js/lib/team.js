import { esc } from './html.js';

// Filtres et cartes de l'équipe. Aucun accès DOM.

export const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'heph', label: 'Héphaïstos' },
  { key: 'zeus', label: 'Zeus' },
  { key: 'hermes', label: 'Hermes' },
  { key: 'G1', label: 'Demi-groupe 1' },
  { key: 'G2', label: 'Demi-groupe 2' },
];

// '#G2' -> 'G2' si c'est une clé de filtre, sinon null (ancres de section, '#main', hash vide).
export function keyFromHash(hash) {
  const key = String(hash ?? '').replace(/^#/, '');
  return FILTERS.some((f) => f.key === key) ? key : null;
}

// Classes complètes (et non construites) pour que Tailwind les détecte.
export const POLE_DOT = { heph: 'bg-heph', zeus: 'bg-zeus', hermes: 'bg-hermes' };
export const POLE_LABEL = { heph: 'Héphaïstos', zeus: 'Zeus', hermes: 'Hermes' };
export const GROUP_LABEL = { G1: 'Demi-groupe 1', G2: 'Demi-groupe 2' };

// Chefs de pôle d'abord, puis ordre de data.js. Clé inconnue : tous les membres.
export function filterMembers(team, key) {
  const known = FILTERS.some((f) => f.key === key && key !== 'all');
  const kept = known ? team.filter((m) => m.pole === key || m.demiGroupe === key) : team;
  return [...kept.filter((m) => m.isLead), ...kept.filter((m) => !m.isLead)];
}

// index : position du membre dans projectData.team (lue par le dialog).
export function memberCardHtml(member, index = 0) {
  const name = esc(member.name);
  return `<li><button type="button" data-member="${esc(index)}" class="group w-full text-left rounded-2xl border border-line dark:border-line-dark bg-paper dark:bg-card p-4 hover:border-accent transition">
  <img src="${esc(member.photo)}-200.webp" srcset="${esc(member.photo)}-200.webp 200w, ${esc(member.photo)}-400.webp 400w" sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw" width="400" height="400" alt="" loading="lazy" decoding="async" class="w-full aspect-square rounded-xl object-cover">
  <span class="mt-4 block text-base font-bold leading-snug">${name}</span>
  <span class="mt-1 block text-sm text-ink-2 dark:text-silver">${esc(member.role)}</span>
  <span class="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-2 dark:text-silver"><span class="w-2.5 h-2.5 rounded-full ${POLE_DOT[member.pole] || ''}" aria-hidden="true"></span>${esc(POLE_LABEL[member.pole] || '')}</span>
</button></li>`;
}
