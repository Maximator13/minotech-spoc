// Cinématique de SPOC sur la maquette, comme sur le prototype :
// - base : plaque, rails, vis, moteur, détection de surface et électronique, fixes ;
// - chariot : cadre des vérins, patins, écrou, corps des vérins et rotules arrière, guidé le long de Z par la vis (course 300 mm vers la paroi) ;
// - plateau : support du préhenseur et sonde, articulés sur la rotule centrale, orientés de ± 5° par les deux vérins ;
// - tige-gauche, tige-droit : tiges des vérins, qui coulissent dans l'axe de leur vérin de l'allongement nécessaire.
// Chaque nœud du GLB est fusionné : on le découpe en composantes connexes et on range chaque composante dans un corps.
// Repère de la maquette : mètres, Y en haut, la paroi côté -Z. Aucun accès au DOM : testable sous Node.

export const LINKS = ['base', 'chariot', 'plateau', 'tige-gauche', 'tige-droit'];
export const LIMITS = { course: [0, 300], tangage: [-5, 5], lacet: [-5, 5] }; // mm, degrés

// Points relevés sur la maquette de novembre 2026 (centres des rotules, en mètres), symétriques par rapport à X = -0,1535.
export const PIVOT = [-0.1535, 0.303, 0.2935]; // rotule centrale, en haut du support
const VERINS = {
  gauche: { avant: [-0.2951, 0.1609, 0.293], arriere: [-0.3015, 0.161, 0.61] },
  droit: { avant: [-0.0119, 0.1609, 0.293], arriere: [-0.0055, 0.161, 0.61] },
};

// Règle par nœud : composante (boîte { min, max }) -> corps.
const RULES = {
  '02-structure': (c) => (c.min[1] >= 0.045 && c.min[2] > 0.27 && !(c.min[2] > 0.445 && c.max[2] < 0.49) ? 'chariot' : 'base'),
  // écrou et palier du chariot, pas la bande fixe posée sur la plaque (Y < -4 mm)
  '04-vis': (c) => (c.min[1] > -0.004 && c.min[2] > 0.32 && c.max[2] < 0.414 ? 'chariot' : 'base'),
  // patins, pas les lamages des rails
  '05-guidages': (c) => (c.min[1] >= 0.005 && (c.max[1] > 0.011 || c.min[1] > 0.0105) && c.min[2] > 0.34 && c.max[2] < 0.39 ? 'chariot' : 'base'),
  // tiges et chapes avant, en avant de la face du corps (Z 367,9 mm) ; le reste du vérin est sur le chariot
  '06-verins': (c) => (c.min[2] < 0.36 ? (c.max[0] < -0.15 ? 'tige-gauche' : 'tige-droit') : 'chariot'),
  // corps de la rotule centrale (tige vissée dans la poutre) sur le chariot ; rotules avant et sphère centrale sur le plateau
  '07-rotules': (c) => (c.min[1] > 0.25 && c.min[1] < 0.28 ? 'chariot' : c.max[2] < 0.345 || c.min[1] > 0.28 ? 'plateau' : 'chariot'),
  '08-support-prehenseur': (c) => (c.min[1] > 0.1 ? 'plateau' : 'base'),
  '12-sonde': () => 'plateau',
};

const clamp = (v, [a, b]) => Math.min(b, Math.max(a, Number(v) || 0));
export const clampPose = (p = {}) => ({ course: clamp(p.course, LIMITS.course), tangage: clamp(p.tangage, LIMITS.tangage), lacet: clamp(p.lacet, LIMITS.lacet) });

// Composantes connexes d'un maillage (sommets confondus à 0,5 mm près) : tableau d'index de composante par sommet.
export function components(positions, indices) {
  const nv = positions.length / 3, rep = new Int32Array(nv), ids = new Map();
  for (let i = 0; i < nv; i++) {
    const k = `${Math.round(positions[3 * i] * 2000)},${Math.round(positions[3 * i + 1] * 2000)},${Math.round(positions[3 * i + 2] * 2000)}`;
    if (!ids.has(k)) ids.set(k, ids.size);
    rep[i] = ids.get(k);
  }
  const par = Int32Array.from({ length: ids.size }, (_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < indices.length; t += 3) {
    const a = find(rep[indices[t]]);
    par[find(rep[indices[t + 1]])] = a;
    par[find(rep[indices[t + 2]])] = a;
  }
  const out = new Int32Array(nv);
  for (let i = 0; i < nv; i++) out[i] = find(rep[i]);
  return out;
}

// Découpe un nœud en sous-maillages par corps : [{ link, positions, normals, indices }], sans copie si tout est sur un seul corps.
export function splitByLink(node) {
  const rule = RULES[node.name];
  if (!rule) return [{ link: 'base', positions: node.positions, normals: node.normals, indices: node.indices }];
  const P = node.positions, comp = components(P, node.indices), boxes = new Map();
  for (let i = 0; i < comp.length; i++) {
    let b = boxes.get(comp[i]);
    if (!b) boxes.set(comp[i], (b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
    for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], P[3 * i + k]); b.max[k] = Math.max(b.max[k], P[3 * i + k]); }
  }
  const linkOf = new Map([...boxes].map(([c, b]) => [c, rule(b)]));
  const used = new Set(linkOf.values());
  if (used.size === 1) return [{ link: [...used][0], positions: P, normals: node.normals, indices: node.indices }];
  return LINKS.filter((l) => used.has(l)).map((link) => {
    const map = new Int32Array(comp.length).fill(-1), pos = [], nor = [], idx = [];
    for (let t = 0; t < node.indices.length; t += 3) {
      if (linkOf.get(comp[node.indices[t]]) !== link) continue;
      for (let j = 0; j < 3; j++) {
        const v = node.indices[t + j];
        if (map[v] < 0) {
          map[v] = pos.length / 3;
          pos.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]);
          nor.push(node.normals[3 * v], node.normals[3 * v + 1], node.normals[3 * v + 2]);
        }
        idx.push(map[v]);
      }
    }
    const n = pos.length / 3;
    return { link, positions: new Float32Array(pos), normals: new Float32Array(nor), indices: n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
  });
}

// --- Matrices 4 x 4, colonne-major comme WebGL ---
const ident = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
const trans = (x, y, z) => { const m = ident(); m[12] = x; m[13] = y; m[14] = z; return m; };
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
export const apply = (m, p) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);

// Orientation du plateau autour de la rotule centrale (tangage autour de X, lacet autour de Y), sans la course.
function orientation(tangage, lacet) {
  const d = Math.PI / 180;
  return mul(trans(...PIVOT), mul(mul(rotY(lacet * d), rotX(tangage * d)), trans(-PIVOT[0], -PIVOT[1], -PIVOT[2])));
}

// Allongement de chaque vérin (mm) pour tenir l'orientation demandée : la course ne change rien, chariot et plateau avancent ensemble.
export function verinElongations(pose) {
  const { tangage, lacet } = clampPose(pose), m = orientation(tangage, lacet), out = {};
  for (const [k, { avant, arriere }] of Object.entries(VERINS)) {
    const l0 = Math.hypot(...avant.map((v, i) => v - arriere[i])), a = apply(m, avant);
    out[k] = (Math.hypot(...a.map((v, i) => v - arriere[i])) - l0) * 1000;
  }
  return out;
}

// Pose -> matrice de chaque corps. course en mm (vers la paroi, -Z), tangage et lacet en degrés autour de la rotule centrale.
// Chaque tige avance dans l'axe de son vérin (de l'arrière vers l'avant) de l'allongement calculé.
export function poseMatrices(pose) {
  const { course, tangage, lacet } = clampPose(pose);
  const chariot = trans(0, 0, -course / 1000), e = verinElongations({ tangage, lacet });
  const out = { base: ident(), chariot, plateau: mul(chariot, orientation(tangage, lacet)) };
  for (const [k, { avant, arriere }] of Object.entries(VERINS)) {
    const u = avant.map((v, i) => v - arriere[i]), n = Math.hypot(...u);
    out['tige-' + k] = mul(chariot, trans(...u.map((v) => (v / n) * e[k] / 1000)));
  }
  return out;
}
