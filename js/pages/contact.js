import { mountLayout, ICONS } from '../layout.js';
import { siteConfig } from '../data.js';
import { initMotion } from '../motion.js';
import { esc } from '../lib/html.js';
import { formMode, isLikelySpam, splitEmail, validate } from '../lib/contact.js';

mountLayout();
initMotion(); // avant tout rendu : une erreur plus bas ne doit pas laisser la page masquée

const $ = (id) => document.getElementById(id);
const form = $('contact-form');
const status = $('contact-status');
const BOX = 'rounded-xl border-2 p-4 text-ink dark:text-white';
const BTN = 'group inline-flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-white text-sm font-semibold hover:bg-sky-800 dark:text-night dark:hover:bg-sky-300 transition';
const LINK_BTN = 'inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4 hover:text-accent';
const FIELDS = ['name', 'email', 'message', 'consent'];
const icon = (name) => ICONS[name].replace('<svg ', '<svg class="w-4 h-4" aria-hidden="true" ');
const EMAIL = splitEmail(siteConfig.contactEmail);

// Bouton mailto : l'adresse est recomposée au clic, jamais écrite entière dans le HTML.
function mailButton(label, cls) {
  return `<button type="button" data-mail data-user="${esc(EMAIL.user)}" data-domain="${esc(EMAIL.domain)}" class="${cls}">${icon('mail')}${esc(label)}</button>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mail]');
  if (b) location.href = `mailto:${b.dataset.user}@${b.dataset.domain}`;
});

function say(kind, text) {
  status.className = `mt-6 max-w-2xl ${BOX} ${kind === 'ok' ? 'border-ok' : 'border-error'}`;
  status.textContent = text;
  // Échec réseau ou serveur : le repli « écrire directement » figure aussi dans le message.
  if (kind === 'fail' && EMAIL) status.insertAdjacentHTML('beforeend', `<span class="mt-3 block">${mailButton("Écrire directement à l'équipe", LINK_BTN)}</span>`);
}

function setError(id, message) {
  const input = $(id);
  const err = $(`${id}-error`);
  err.textContent = message || '';
  err.hidden = !message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (message) input.setAttribute('aria-describedby', err.id);
  else input.removeAttribute('aria-describedby');
}

function showErrors(errors) {
  FIELDS.forEach((id) => setError(id, errors[id]));
  const first = FIELDS.find((id) => errors[id]);
  if (first) $(first).focus();
}

function mountForm() {
  form.hidden = false;
  form.action = `https://formspree.io/f/${encodeURIComponent(siteConfig.formspreeId.trim())}`;
  let startedAt = Date.now(); // délai minimal compté depuis l'affichage du formulaire
  if (EMAIL) $('contact-direct').innerHTML = `<p class="text-sm text-ink-2 dark:text-silver">Vous préférez votre messagerie ?</p><p class="mt-2">${mailButton("Écrire directement à l'équipe", LINK_BTN)}</p>`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const errors = validate({
      name: data.get('name'), email: data.get('email'), message: data.get('message'), consent: form.consent.checked,
    });
    showErrors(errors);
    if (Object.keys(errors).length) { say('err', 'Le formulaire contient des erreurs : corrigez les champs signalés.'); return; }
    const ok = () => { form.reset(); startedAt = Date.now(); say('ok', 'Merci, votre message a bien été envoyé. Nous vous répondrons dès que possible.'); };
    if (isLikelySpam({ honeypot: String(data.get('_gotcha') || ''), elapsedMs: Date.now() - startedAt })) { ok(); return; } // faux succès, aucun envoi
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
      if (res.ok) ok();
      else say('fail', "L'envoi a échoué. Veuillez réessayer dans quelques instants.");
    } catch (err) {
      say('fail', "L'envoi a échoué : vérifiez votre connexion puis réessayez.");
    } finally {
      submit.disabled = false;
    }
  });
}

function mountMailto() {
  $('contact-alt').innerHTML = `
    <p class="text-base text-ink-2 dark:text-silver">Le formulaire en ligne n'est pas activé : écrivez-nous directement avec votre messagerie.</p>
    <p class="mt-6">${mailButton("Écrire à l'équipe", BTN)}</p>`;
}

const mode = formMode(siteConfig);
if (mode === 'formspree') mountForm();
else if (mode === 'mailto' && EMAIL) mountMailto();
else $('contact-alt').innerHTML = `<p class="${BOX} border-line dark:border-line-dark">Le formulaire de contact sera bientôt disponible.</p>`;

if (siteConfig.linkedinUrl.trim()) {
  $('contact-extra').innerHTML = `<a href="${esc(siteConfig.linkedinUrl.trim())}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-ink dark:border-silver text-sm font-semibold hover:border-accent hover:text-accent transition">${icon('linkedin')}Suivre MinOtech sur LinkedIn${icon('external')}</a>`;
}
