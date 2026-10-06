// Consentement RGPD : pur (stockage injecté), ne touche ni document ni window.
const KEY = 'minotech_consent';
const MAX_AGE = 183 * 86400000; // ~6 mois

export function readConsent(storage, now = Date.now()) {
  try {
    const { value, at } = JSON.parse(storage.getItem(KEY));
    if ((value !== 'granted' && value !== 'denied') || !(at <= now && now - at <= MAX_AGE)) return null;
    return value;
  } catch (e) {
    return null;
  }
}

export function writeConsent(storage, value, now = Date.now()) {
  try {
    storage.setItem(KEY, JSON.stringify({ value, at: now }));
  } catch (e) { /* stockage indisponible : le choix vaudra pour la page seulement */ }
}

export function shouldLoadAnalytics(analyticsCfg, consent) {
  return Boolean(analyticsCfg && analyticsCfg.enabled && analyticsCfg.src && consent === 'granted');
}
