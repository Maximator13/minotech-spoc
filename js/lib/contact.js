export const MIN_FILL_MS = 3000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// Délai non fini (horloge absente, valeur non numérique) : traité comme un envoi automatisé.
export function isLikelySpam({ honeypot, elapsedMs }) {
  return text(honeypot) !== '' || !Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_MS;
}

// 'equipe@exemple.fr' -> { user, domain } (l'adresse n'est jamais écrite entière dans le HTML) ; null si invalide.
export function splitEmail(email) {
  const parts = text(email).split('@');
  return parts.length === 2 && parts[0] && parts[1] ? { user: parts[0], domain: parts[1] } : null;
}

export function formMode(cfg) {
  if (text(cfg?.formspreeId)) return 'formspree';
  return text(cfg?.contactEmail) ? 'mailto' : 'none';
}

export function validate({ name, email, message, consent } = {}) {
  const errors = {};
  if (!text(name)) errors.name = 'Indiquez votre nom.';
  if (!EMAIL_RE.test(text(email))) errors.email = 'Indiquez une adresse e-mail valide, par exemple nom@exemple.fr.';
  if (text(message).length < 10) errors.message = 'Votre message doit contenir au moins 10 caractères.';
  if (!consent) errors.consent = 'Vous devez accepter le traitement de vos données pour envoyer le message.';
  return errors;
}
