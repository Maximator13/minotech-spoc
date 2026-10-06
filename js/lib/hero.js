// Constantes et modèle du schéma animé du hero (aucun accès DOM : testé sous node).
export const HERO = { periodSec: 5, ampMin: 6, ampMax: 12, pxPerMm: 3, toleranceMm: 1, targetMm: 50 };

// Erreur de distance (mm) t secondes après une perturbation d'amplitude amp : oscillation amortie.
export const dampedError = (tSec, amp) => amp * Math.exp(-tSec / 0.8) * Math.cos((2 * Math.PI * tSec) / 1.1);
