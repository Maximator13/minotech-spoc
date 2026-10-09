import { siteConfig } from './data.js';
import { readConsent, writeConsent, shouldLoadAnalytics } from './lib/consent.js';

export const NAV = [
  { href: 'index.html', label: 'Accueil' },
  { href: 'projet.html', label: 'Projet' },
  { href: 'simulateur.html', label: 'Simulateur' },
  { href: 'equipe.html', label: 'Équipe' },
  { href: 'apropos.html', label: 'À propos' },
  { href: 'contact.html', label: 'Contact' },
];

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICONS = {
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  pulse: svg('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  linkedin: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 11v5M8 8v.01M12 16v-5M12 13a2.5 2.5 0 0 1 5 0v3"/>'),
  external: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
};
const icon = (name, cls) => ICONS[name].replace('<svg ', `<svg class="${cls}" aria-hidden="true" `);

const IMT = {
  light: 'assets/logos/logo_imt_mines_ales-320.webp',
  dark: 'assets/logos/logo_imt_mines_ales_white-320.webp',
};
const LEGAL = [
  { href: 'mentions-legales.html', label: 'Mentions légales' },
  { href: 'confidentialite.html', label: 'Confidentialité' },
  { href: 'cgu.html', label: 'CGU' },
];

const BTN = 'w-9 h-9 grid place-items-center rounded-lg border border-line dark:border-line-dark bg-paper dark:bg-card hover:border-accent';
const LINK = 'hover:text-accent';

export const THEME_COLOR = { light: '#FFFFFF', dark: '#070C18' };

export function applyTheme(theme, doc = document) {
  const dark = theme === 'dark';
  doc.documentElement.classList.toggle('dark', dark);
  doc.querySelectorAll('img.imt-logo').forEach((img) => { img.src = dark ? IMT.dark : IMT.light; });
  doc.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(dark)));
  // Le choix explicite prime sur prefers-color-scheme : les deux balises prennent la couleur du thème actif.
  doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLOR[dark ? 'dark' : 'light']));
}

const stem = (h) => h.replace(/\.html$/, '');

function navLinks(page) {
  return NAV.map((n) => {
    const here = stem(n.href) === stem(page);
    return `<a href="${n.href}"${here ? ' aria-current="page"' : ''} class="${here ? 'text-accent' : LINK}">${n.label}</a>`;
  }).join('');
}

function headerHTML(page) {
  return `
  <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
    <a href="index.html" class="flex items-center gap-2.5 shrink-0" aria-label="MinOtech SPOC, accueil">
      <svg class="w-7 h-7 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 49V19l19 21 19-21v30"/><circle cx="32" cy="52.5" r="3.6" fill="currentColor" stroke="none"/></svg>
      <span class="font-bold tracking-tight">MinOtech</span>
      <span class="font-mono text-[11px] text-ink-2/70 dark:text-silver/60 border-l border-line dark:border-line-dark pl-2.5">SPOC</span>
    </a>
    <nav aria-label="Navigation principale" class="hidden lg:flex items-center gap-7 text-sm font-medium">${navLinks(page)}</nav>
    <div class="flex items-center gap-2">
      <button type="button" data-theme-toggle aria-label="Thème sombre" aria-pressed="false" class="${BTN}">
        ${icon('moon', 'w-4 h-4 dark:hidden')}${icon('sun', 'w-4 h-4 hidden dark:block text-warn')}
      </button>
      <button type="button" data-menu-toggle aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu" class="lg:hidden ${BTN}">
        ${icon('menu', 'w-4 h-4 menu-open')}${icon('close', 'w-4 h-4 menu-close hidden')}
      </button>
    </div>
  </div>
  <nav id="mobile-menu" aria-label="Navigation mobile" hidden class="lg:hidden absolute top-full inset-x-0 bg-paper dark:bg-night border-b border-line dark:border-line-dark">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-col text-base font-medium [&>a]:py-3 [&>a]:border-b [&>a]:border-line dark:[&>a]:border-line-dark [&>a:last-child]:border-b-0">${navLinks(page)}</div>
  </nav>`;
}

function footerHTML(page, dark) {
  return `
  <div class="border-t border-line dark:border-line-dark">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[1fr_auto] items-start">
      <div>
        <div class="flex items-center gap-2.5">
          <svg class="w-6 h-6 text-accent" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 49V19l19 21 19-21v30"/><circle cx="32" cy="52.5" r="3.6" fill="currentColor" stroke="none"/></svg>
          <span class="font-bold tracking-tight">MinOtech</span>
          <span class="font-mono text-[11px] text-ink-2/70 dark:text-silver/60">SPOC</span>
        </div>
        <nav aria-label="Pied de page" class="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">${navLinks(page)}</nav>
        <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2 dark:text-silver">
          ${LEGAL.map((l) => `<a href="${l.href}" class="${LINK}">${l.label}</a>`).join('')}
          ${siteConfig.analytics.enabled ? `<button type="button" data-consent-manage class="${LINK}">Gérer les cookies</button>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-6">
        <img src="assets/logos/logo_cea-320.webp" alt="CEA" width="320" height="320" class="h-12 w-auto" loading="lazy">
        <img src="${dark ? IMT.dark : IMT.light}" alt="IMT Mines Alès" width="320" height="178" class="imt-logo h-12 w-auto" loading="lazy">
      </div>
    </div>
    <div class="border-t border-line dark:border-line-dark">
      <p class="max-w-6xl mx-auto px-4 sm:px-6 py-5 font-mono text-[11px] text-ink-2/70 dark:text-silver/60">MinOtech · SPOC — 2024–2027</p>
    </div>
  </div>`;
}

function loadAnalytics(doc) {
  if (doc.getElementById('analytics-script')) return;
  const { src, domain } = siteConfig.analytics;
  const s = doc.createElement('script');
  s.id = 'analytics-script';
  s.defer = true;
  s.src = src;
  if (domain) s.setAttribute('data-domain', domain);
  doc.head.appendChild(s);
}

function showBanner(doc, storage, { focus = false } = {}) {
  if (doc.getElementById('consent-banner')) return;
  const btn = 'px-4 py-2 rounded-lg border border-line dark:border-line-dark bg-paper dark:bg-night text-sm font-semibold hover:border-accent';
  const el = doc.createElement('div');
  el.id = 'consent-banner';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Préférences de confidentialité');
  el.setAttribute('aria-describedby', 'consent-text');
  el.className = 'fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-md z-50 p-5 rounded-xl border border-line dark:border-line-dark bg-paper dark:bg-card shadow-lg text-sm';
  el.innerHTML = `
    <p id="consent-text" class="leading-relaxed">Ce site peut mesurer sa fréquentation avec un outil sans cookies, uniquement si vous l'acceptez. <a href="confidentialite.html" class="underline hover:text-accent">Politique de confidentialité</a></p>
    <div class="mt-4 flex gap-3">
      <button type="button" data-choice="granted" class="${btn}">Accepter</button>
      <button type="button" data-choice="denied" class="${btn}">Refuser</button>
    </div>`;
  el.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-choice]');
    if (!choice) return;
    const value = choice.dataset.choice;
    writeConsent(storage, value);
    // Le bouton cliqué disparaît avec le bandeau : s'il a été ouvert par « Gérer les cookies »,
    // le focus y revient, sans faire défiler la page jusqu'au pied de page.
    el.remove();
    if (focus) doc.querySelector('[data-consent-manage]')?.focus({ preventScroll: true });
    // Un script déjà chargé ne s'arrête qu'avec la page : on la recharge après un refus.
    if (value === 'denied' && doc.getElementById('analytics-script')) doc.defaultView.location.reload();
    else if (shouldLoadAnalytics(siteConfig.analytics, value)) loadAnalytics(doc);
  });
  doc.body.appendChild(el);
  if (focus) el.querySelector('button').focus();
}

function mountMenu(header) {
  const btn = header.querySelector('[data-menu-toggle]');
  const panel = header.querySelector('#mobile-menu');
  const set = (open, refocus) => {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.menu-open').classList.toggle('hidden', open);
    btn.querySelector('.menu-close').classList.toggle('hidden', !open);
    if (refocus) btn.focus();
  };
  btn.addEventListener('click', () => set(panel.hidden));
  panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  header.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) set(false, true); });
}

export function mountLayout(doc = document) {
  const win = doc.defaultView;
  const storage = (() => { try { return win.localStorage; } catch (e) { return null; } })();
  const page = win.location.pathname.split('/').pop() || 'index';
  const dark = doc.documentElement.classList.contains('dark');

  const header = doc.querySelector('header[data-layout]');
  if (header) {
    header.className = 'sticky top-0 z-40 bg-paper/90 dark:bg-night/90 backdrop-blur border-b border-line dark:border-line-dark';
    header.innerHTML = headerHTML(page);
    mountMenu(header);
    header.querySelector('[data-theme-toggle]').addEventListener('click', () => {
      const theme = doc.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(theme, doc);
      try { storage.setItem('minotech_theme', theme); } catch (e) { /* thème valable pour la page seulement */ }
    });
  }

  const footer = doc.querySelector('footer[data-layout]');
  if (footer) {
    footer.innerHTML = footerHTML(page, dark);
    footer.querySelector('[data-consent-manage]')?.addEventListener('click', () => {
      try { storage.removeItem('minotech_consent'); } catch (e) { /* ignoré */ }
      showBanner(doc, storage, { focus: true });
    });
  }

  applyTheme(dark ? 'dark' : 'light', doc);

  const consent = readConsent(storage);
  if (consent === null && siteConfig.analytics.enabled) showBanner(doc, storage);
  if (shouldLoadAnalytics(siteConfig.analytics, consent)) loadAnalytics(doc);
}
