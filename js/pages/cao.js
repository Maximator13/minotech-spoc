import { mountLayout } from '../layout.js';
import { initMotion } from '../motion.js';
import { esc } from '../lib/html.js';
import { parseGLB } from '../cao/glb.js';
import { createViewer } from '../cao/viewer.js';
import { GROUPS, PARTS, groupOf } from '../cao/parts.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const $ = (id) => document.getElementById(id);
const all = (sel) => [...document.querySelectorAll(sel)];
const MODEL = 'assets/cao/spoc.glb';
const SIZE_GUESS = 2200000; // si Content-Length manque ou donne la taille compressée
const VIEW_NAMES = { iso: 'isométrique', face: 'de face', dessus: 'de dessus', cote: 'de côté', libre: 'libre' };

const canvas = $('cao-canvas');
const stage = $('cao-stage');
const calmQuery = matchMedia('(prefers-reduced-motion: reduce)');
const lgQuery = matchMedia('(min-width: 64rem)');
const isDark = () => document.documentElement.classList.contains('dark');

let viewer = null, loading = false;
let selected = null, isolated = null, view = 'iso';
const hidden = new Set();
const section = { axis: null, pos: 0.5, flip: false };

// --- Nomenclature ---
const EYE = '<svg class="w-[18px] h-[18px] group-aria-pressed:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg class="w-[18px] h-[18px] hidden group-aria-pressed:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1Q11.3 5 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const num = (key) => key.slice(0, 2);

const row = (key) => {
  const { label, qty } = PARTS[key];
  return `
<li class="flex items-start gap-1 px-2">
  <button type="button" data-part="${key}" aria-pressed="false" class="cao-row flex-1 min-w-0 flex items-start gap-2.5 px-2 py-2 text-left text-sm">
    <span data-swatch class="mt-[5px] w-2.5 h-2.5 shrink-0 rounded-full border border-ink/30 dark:border-silver/40" aria-hidden="true"></span>
    <span class="mt-px font-mono text-xs text-ink-2/80 dark:text-silver/80">${num(key)}</span>
    <span class="flex-1 min-w-0 leading-snug">${esc(label)}</span>
    <span class="mt-px font-mono text-xs text-ink-2 dark:text-silver"><span class="sr-only">quantité </span><span aria-hidden="true">×</span>${qty}</span>
  </button>
  <button type="button" data-eye="${key}" aria-pressed="false" aria-label="Masquer ${esc(label)}" title="Masquer" hidden class="cao-btn cao-eye group shrink-0 w-9 h-9 grid place-items-center">${EYE}${EYE_OFF}</button>
</li>`;
};

$('cao-list').innerHTML = GROUPS.map((g) => `
<li>
  <div class="flex items-center justify-between gap-3 pl-4 pr-3 pt-4 pb-1">
    <p class="font-mono text-xs uppercase tracking-wider text-ink-2/80 dark:text-silver/80">${esc(g.label)}</p>
    <button type="button" data-isolate="${g.id}" aria-pressed="false" aria-label="Isoler : ${esc(g.label)}" hidden class="cao-btn px-2.5 h-7 border border-line dark:border-line-dark text-xs font-semibold">Isoler</button>
  </div>
  <ul>${g.parts.map(row).join('')}</ul>
</li>`).join('');

const partBtns = all('[data-part]'), eyeBtns = all('[data-eye]'), isoBtns = all('[data-isolate]');
const scroller = $('cao-scroll');

function swatches(model) {
  for (const n of model.nodes) {
    const el = partBtns.find((b) => b.dataset.part === n.name)?.querySelector('[data-swatch]');
    if (!el) continue;
    // Couleur linéaire du matériau vers sRGB, même plancher d'albédo que le rendu pour les pièces noires.
    const [r, g, b] = n.material.color.slice(0, 3).map((c) => Math.round(255 * Math.max(c, 0.06) ** (1 / 2.2)));
    el.style.backgroundColor = `rgb(${r} ${g} ${b} / ${n.material.blend ? 0.4 : 1})`; // CSSOM : autorisé par la CSP
  }
}

function describe() {
  const pick = selected ? `, pièce sélectionnée : ${PARTS[selected].label}` : '';
  canvas.setAttribute('aria-label', `Maquette 3D de SPOC, vue ${VIEW_NAMES[view]}${pick}.`);
}

// Réécrit la fiche seulement si elle change : la zone est annoncée (aria-live).
let sheetHtml = '';
function paintSheet() {
  const s = $('cao-sheet');
  let html = '<p class="text-sm text-ink-2 dark:text-silver">Sélectionnez une pièce dans la vue ou la liste.</p>';
  if (selected) {
    const { label, qty } = PARTS[selected];
    html = `
<p class="font-mono text-xs uppercase tracking-wider text-accent">Repère ${num(selected)} · ${esc(groupOf(selected).label)}</p>
<p class="mt-1 text-base font-bold leading-snug">${esc(label)}</p>
<p class="mt-1 text-sm text-ink-2 dark:text-silver">Quantité : ${qty}${hidden.has(selected) ? ' · masquée' : ''}</p>`;
  }
  if (html !== sheetHtml) s.innerHTML = sheetHtml = html;
}

// Fait défiler la liste seule (jamais la page) jusqu'à la ligne choisie.
function reveal(key) {
  const el = document.querySelector(`[data-part="${key}"]`);
  if (!el || !scroller.clientHeight) return;
  const r = el.getBoundingClientRect(), b = scroller.getBoundingClientRect();
  if (r.top < b.top || r.bottom > b.bottom) scroller.scrollTop += r.top - b.top - b.height / 3;
}

function select(key, frame = false) {
  selected = key;
  viewer?.select(key);
  if (key && frame) viewer?.frame(key);
  partBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === key)));
  paintSheet();
  describe();
  if (key) reveal(key);
}

function markHover(key) {
  partBtns.forEach((b) => b.classList.toggle('is-hover', b.dataset.part === key));
}

function syncHidden() {
  eyeBtns.forEach((b) => {
    const off = hidden.has(b.dataset.eye);
    b.setAttribute('aria-pressed', String(off));
  });
  partBtns.forEach((b) => b.querySelector('[data-swatch]').classList.toggle('opacity-30', hidden.has(b.dataset.part)));
  viewer?.setHidden([...hidden]);
  paintSheet();
}

function syncIsolate() {
  isoBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.isolate === isolated)));
  viewer?.isolate(isolated ? GROUPS.find((g) => g.id === isolated).parts : null);
  viewer?.fit();
}

$('cao-list').addEventListener('click', (e) => {
  const part = e.target.closest('[data-part]'), eye = e.target.closest('[data-eye]'), iso = e.target.closest('[data-isolate]');
  if (part) select(part.dataset.part === selected ? null : part.dataset.part, true);
  else if (eye) {
    const k = eye.dataset.eye;
    hidden.has(k) ? hidden.delete(k) : hidden.add(k);
    syncHidden();
  } else if (iso) {
    isolated = iso.dataset.isolate === isolated ? null : iso.dataset.isolate;
    syncIsolate();
  }
});
// Survol ou focus d'une ligne : surbrillance de la pièce dans la vue.
for (const [on, off] of [['pointerover', 'pointerout'], ['focusin', 'focusout']]) {
  $('cao-list').addEventListener(on, (e) => viewer?.hover(e.target.closest('[data-part]')?.dataset.part ?? null));
  $('cao-list').addEventListener(off, () => viewer?.hover(null));
}

// Tiroir mobile : replié, seule la fiche de la pièce reste visible.
const drawer = $('cao-drawer'), listWrap = $('cao-list-wrap');
function setDrawer(open) {
  drawer.setAttribute('aria-expanded', String(open));
  listWrap.dataset.open = String(open);
  listWrap.inert = !open && !lgQuery.matches;
}
// Sur mobile, le tiroir ouvert recouvre les fenêtres d'outils : l'un ferme l'autre.
drawer.addEventListener('click', () => {
  const open = drawer.getAttribute('aria-expanded') !== 'true';
  if (open) openPop(null);
  setDrawer(open);
});
lgQuery.addEventListener('change', () => setDrawer(false));
setDrawer(false);

// --- Barre d'outils ---
function fill(input, outId, text) {
  input.style.setProperty('--fill', `${input.value}%`); // CSSOM : autorisé par la CSP (pas d'attribut style)
  input.setAttribute('aria-valuetext', text);
  $(outId).textContent = text;
}

const explodeIn = $('cao-explode'), sectionIn = $('cao-section'), flipBtn = $('cao-flip');
explodeIn.addEventListener('input', () => {
  fill(explodeIn, 'cao-explode-out', `${explodeIn.value} %`);
  viewer?.setExplode(Number(explodeIn.value));
  viewer?.fit(); // la caméra recule avec l'éclaté : tout l'assemblage reste dans le cadre
});

function syncSection() {
  all('[data-axis]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.axis || null) === section.axis)));
  sectionIn.disabled = flipBtn.disabled = !section.axis;
  flipBtn.setAttribute('aria-pressed', String(section.flip));
  sectionIn.value = String(Math.round(section.pos * 100));
  fill(sectionIn, 'cao-section-out', `${sectionIn.value} %`);
  viewer?.setSection(section);
}
all('[data-axis]').forEach((b) => b.addEventListener('click', () => {
  section.axis = b.dataset.axis || null;
  syncSection();
}));
sectionIn.addEventListener('input', () => {
  section.pos = Number(sectionIn.value) / 100;
  syncSection();
});
flipBtn.addEventListener('click', () => {
  section.flip = !section.flip;
  syncSection();
});

const pops = all('[data-pop]');
function openPop(name) {
  if (name && !lgQuery.matches) setDrawer(false);
  pops.forEach((b) => {
    const on = b.dataset.pop === name;
    b.setAttribute('aria-expanded', String(on));
    $('pop-' + b.dataset.pop).hidden = !on;
  });
}
pops.forEach((b) => b.addEventListener('click', () => openPop(b.getAttribute('aria-expanded') === 'true' ? null : b.dataset.pop)));
$('cao-tools').addEventListener('keydown', (e) => {
  const open = pops.find((b) => b.getAttribute('aria-expanded') === 'true');
  if (e.key === 'Escape' && open) {
    openPop(null);
    open.focus();
  }
});

all('[data-view]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view === 'fit') viewer?.fit();
  else {
    view = b.dataset.view;
    viewer?.setView(view);
    describe();
  }
}));
// Toute manipulation directe quitte la vue nommée : glisser, ou tourner aux flèches (Maj + flèches déplace seulement).
function leaveView() {
  if (view === 'libre') return;
  view = 'libre';
  describe();
}
canvas.addEventListener('pointermove', (e) => e.buttons && leaveView());
canvas.addEventListener('keydown', (e) => {
  if (e.key.startsWith('Arrow') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) leaveView();
});

const fullBtn = $('cao-full');
if (!document.fullscreenEnabled) fullBtn.hidden = true;
fullBtn.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen()).catch(() => {}));
document.addEventListener('fullscreenchange', () => fullBtn.setAttribute('aria-pressed', String(document.fullscreenElement === stage)));

$('cao-reset').addEventListener('click', () => {
  viewer?.reset();
  hidden.clear();
  isolated = null;
  view = 'iso';
  Object.assign(section, { axis: null, pos: 0.5, flip: false });
  explodeIn.value = '0';
  fill(explodeIn, 'cao-explode-out', '0 %');
  isoBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  syncHidden();
  syncSection();
  openPop(null);
  select(null);
});

// --- États : chargement, erreur, repli ---
function show(state) {
  $('cao-loading').hidden = state !== 'loading';
  $('cao-error').hidden = state !== 'error';
  $('cao-fallback').hidden = state !== 'fallback';
  $('cao-tools').hidden = state !== 'ready';
  [...eyeBtns, ...isoBtns].forEach((b) => (b.hidden = state !== 'ready'));
  canvas.hidden = state === 'fallback';
}

function progress(p) {
  $('cao-progress').value = p;
  $('cao-progress-out').textContent = `${Math.round(p * 100)} %`;
}

async function download() {
  const res = await fetch(MODEL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) return res.arrayBuffer();
  const total = (!res.headers.get('Content-Encoding') && Number(res.headers.get('Content-Length'))) || SIZE_GUESS;
  const reader = res.body.getReader(), chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    progress(Math.min(got / total, 0.99));
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) (out.set(c, at), (at += c.length));
  return out.buffer;
}

async function start() {
  if (loading || viewer) return;
  loading = true;
  progress(0);
  show('loading');
  let buf;
  try {
    buf = await download();
  } catch {
    loading = false;
    return show('error');
  }
  try {
    const model = parseGLB(buf);
    viewer = createViewer(canvas, model, { reducedMotion: calmQuery.matches, dark: isDark() });
    swatches(model);
  } catch {
    viewer?.destroy();
    viewer = null;
    loading = false;
    return show('fallback');
  }
  loading = false;
  progress(1);
  viewer.onPick((key) => select(key));
  viewer.onHover(markHover);
  show('ready');
  fill(explodeIn, 'cao-explode-out', '0 %');
  syncSection();
  describe();
}

$('cao-retry').addEventListener('click', start);
canvas.addEventListener('webglcontextlost', () => ($('cao-lost').hidden = false));
canvas.addEventListener('webglcontextrestored', () => ($('cao-lost').hidden = true));
new MutationObserver(() => viewer?.setTheme(isDark())).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
calmQuery.addEventListener('change', () => viewer?.setReducedMotion(calmQuery.matches));

if ('WebGL2RenderingContext' in window) start();
else show('fallback');
