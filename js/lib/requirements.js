import { STATUS } from '../data.js';
import { esc } from './html.js';

// Rendu des exigences CDC et des jalons en HTML. Aucun accès DOM.

// Le texte reste lisible (contraste AA) : la couleur de ton n'est portée que par la pastille et la bordure.
const TONE = {
  ok: 'text-ok border-ok',
  warn: 'text-warn border-warn',
  muted: 'text-ink-2 border-line dark:text-silver dark:border-line-dark',
};

export const statusBadge = (status) => (Object.hasOwn(STATUS, status) ? STATUS[status] : STATUS['a-venir']);

// Un statut « valide » sans preuve est affiché « À venir » : on n'affiche jamais une validation non prouvée.
const effective = (r) => (r.status === 'valide' && !r.evidence ? 'a-venir' : r.status);

// Pastille : le libellé est toujours affiché, la couleur n'est qu'un renfort. text : libellé propre à l'entrée (ex. « Soutenu »).
const pill = (status, text) => {
  const { label, tone } = statusBadge(status);
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${TONE[tone]}"><span class="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true"></span><span class="text-ink-2 dark:text-silver">${esc(text || label)}</span></span>`;
};

// Méthode de vérification prévue (plan de validation) : un planning, jamais une preuve.
const method = (r) => (r.method ? `<span class="block mt-1 text-xs text-ink-2 dark:text-silver"><span class="font-mono text-[10px] uppercase tracking-wider">Méthode prévue</span> : ${esc(r.method)}</span>` : '');

export const renderRequirementRows = (reqs) => reqs.map((r) => `
<tr class="border-t border-line dark:border-line-dark align-middle">
  <th scope="row" class="py-4 pr-4 font-mono text-sm font-semibold whitespace-nowrap text-left">${esc(r.id)}</th>
  <td class="py-4 pr-4 text-sm">${esc(r.label)}${method(r)}</td>
  <td class="py-4 pr-4 font-mono text-sm font-semibold whitespace-nowrap">${esc(r.value)}</td>
  <td class="py-4 pr-4 text-sm text-ink-2 dark:text-silver">${esc(r.source)}</td>
  <td class="py-4 pr-4">${pill(effective(r))}</td>
  <td class="py-4 text-sm text-ink-2 dark:text-silver">${r.evidence ? esc(r.evidence) : '<span aria-hidden="true">—</span><span class="sr-only">Aucune preuve à ce jour</span>'}</td>
</tr>`).join('');

// Frise de 8 périodes : 2 colonnes dès md, 4 dès lg.
export const renderMilestones = (ms) => `<ol class="grid gap-px md:grid-cols-2 lg:grid-cols-4 bg-line dark:bg-line-dark border border-line dark:border-line-dark rounded-2xl overflow-hidden">${ms.map((m) => `
<li class="bg-paper dark:bg-card p-6 flex flex-col gap-3">
  <p class="font-mono text-xs uppercase tracking-wider text-accent">${esc(m.sem)}</p>
  <h3 class="text-lg font-bold">${esc(m.title)}</h3>
  <p class="text-sm leading-relaxed text-ink-2 dark:text-silver">${esc(m.desc)}</p>
  <p class="mt-auto pt-2">${pill(m.status, m.statusLabel)}</p>
</li>`).join('')}</ol>`;
