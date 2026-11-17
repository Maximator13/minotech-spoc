// Nomenclature de la maquette SPOC, groupes fonctionnels, vecteurs d'éclaté et vues standard.
// Les clés sont les noms des nœuds de assets/cao/spoc.glb. Aucun accès au DOM : testable sous Node.

export const GROUPS = [
  { id: 'structure', label: 'Porteur et structure', parts: ['01-interface-porteur', '02-structure'], fixed: true },
  { id: 'lineaire', label: 'Module linéaire', parts: ['03-moteur', '04-vis', '05-guidages'] },
  { id: 'planeite', label: 'Module de planéité', parts: ['06-verins', '07-rotules'] },
  { id: 'prehension', label: 'Préhenseur et sonde', parts: ['08-support-prehenseur', '12-sonde'] },
  { id: 'detection', label: 'Détection de surface', parts: ['09-detection-surface'] },
  // Sous la plaque de la structure : s'écarte vers le bas pour ne pas la traverser.
  { id: 'energie', label: 'Électronique et énergie', parts: ['10-electronique', '11-alimentation'], dir: -1 },
];

export const PARTS = {
  '01-interface-porteur': { label: 'Interface porteur', qty: 1 },
  '02-structure': { label: 'Structure en profilés', qty: 1 },
  '03-moteur': { label: 'Moteur pas à pas NEMA 24 à codeur intégré', qty: 1 },
  '04-vis': { label: 'Vis Igus Tr18x4, poulies et courroie', qty: 1 },
  '05-guidages': { label: 'Guidages GCL12', qty: 2 },
  '06-verins': { label: 'Vérins électriques LD75', qty: 2 },
  '07-rotules': { label: 'Rotules Igus', qty: 4 },
  '08-support-prehenseur': { label: 'Support du préhenseur (impression 3D)', qty: 1 },
  '09-detection-surface': { label: 'Détection de surface, scanner 3D CR-Scan Ferret', qty: 1 },
  '10-electronique': { label: 'Raspberry Pi 5, ESP32, drivers, centrale MPU6050', qty: 1 },
  '11-alimentation': { label: 'Alimentation 24 V et boîtier', qty: 1 },
  '12-sonde': { label: 'Volume de la sonde, 50 x 50 x 40 cm', qty: 1 },
};

export const groupOf = (key) => GROUPS.find((g) => g.parts.includes(key));

const deg = Math.PI / 180;
// Y en haut ; yaw 0 : caméra côté +Z, la sonde est côté -Z, d'où « face » à 180°.
export const VIEWS = {
  iso: { yaw: 45 * deg, pitch: 30 * deg },
  face: { yaw: 180 * deg, pitch: 0 },
  dessus: { yaw: 0, pitch: 89 * deg },
  cote: { yaw: 90 * deg, pitch: 0 },
};

function union(boxes) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], b.min[k]);
      max[k] = Math.max(max[k], b.max[k]);
    }
  }
  return { min, max };
}
const center = (b) => [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Éclaté par groupe, porteur fixe : étages le long de axis (dir -1 : du côté opposé), rangés par position
// sur chaque côté séparément, plus un écart radial.
// boxes : { clé: { min, max } } ; retourne { clé: [x, y, z] } pour chaque clé présente.
export function explodeVectors(boxes, axis = [0, 1, 0]) {
  const all = union(Object.values(boxes));
  const step = 0.18 * Math.hypot(...[0, 1, 2].map((k) => all.max[k] - all.min[k]));
  const present = GROUPS.map((g) => ({ ...g, keys: g.parts.filter((k) => boxes[k]) })).filter((g) => g.keys.length);
  const fixed = present.find((g) => g.fixed);
  const c0 = center(union((fixed || { keys: Object.keys(boxes) }).keys.map((k) => boxes[k])));
  const moving = present
    .filter((g) => !g.fixed)
    .map((g) => {
      const c = center(union(g.keys.map((k) => boxes[k])));
      const d = [c[0] - c0[0], c[1] - c0[1], c[2] - c0[2]];
      return { g, d, along: dot(d, axis) };
    })
    .sort((a, b) => a.along - b.along);
  const out = {}, count = { 1: 0, '-1': 0 };
  if (fixed) for (const k of fixed.keys) out[k] = [0, 0, 0];
  moving.forEach(({ g, d, along }) => {
    const s = g.dir ?? 1;
    const r = s * ++count[s] * step;
    const v = [0, 1, 2].map((k) => axis[k] * r + (d[k] - axis[k] * along) * 0.6);
    for (const k of g.keys) out[k] = v;
  });
  return out;
}
