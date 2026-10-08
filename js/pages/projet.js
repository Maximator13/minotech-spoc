import { mountLayout } from '../layout.js';
import { projectData } from '../data.js';
import { initMotion } from '../motion.js';
import { renderMedia } from '../lib/media.js';
import { esc } from '../lib/html.js';
import { renderRequirementRows, renderMilestones } from '../lib/requirements.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const { requirements, milestones, sensors, media, poles } = projectData;
const $ = (id) => document.getElementById(id);

$('req-rows').innerHTML = renderRequirementRows(requirements);
$('solution-img').innerHTML = renderMedia(media.solution);
$('solution-list').innerHTML = Object.values(poles).flatMap((p) => p.highlights).map((h) => `
<li class="flex gap-3"><span class="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span><span>${esc(h)}</span></li>`).join('');
$('jalons-list').innerHTML = renderMilestones(milestones);
$('sondes-grid').innerHTML = sensors.map((s) => `
<article class="rounded-2xl border border-line dark:border-line-dark bg-paper dark:bg-card p-6 flex flex-col gap-2">
  <p class="font-mono text-[11px] uppercase tracking-wider text-accent">${esc(s.type)}</p>
  <h3 class="text-lg font-bold">${esc(s.name)}</h3>
  <p class="mt-1 text-sm leading-relaxed text-ink-2 dark:text-silver">${esc(s.desc)}</p>
</article>`).join('');

