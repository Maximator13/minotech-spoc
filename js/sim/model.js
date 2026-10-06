// Modèle pédagogique simplifié du SPOC : ne représente PAS les performances mesurées du prototype.
// Unités : mm, mm/s, s, degrés. Fonctions pures, sans DOM, sans Math.random (RNG mulberry32 à graine).
//
// Passe : à x >= passLength, x reboucle et le chariot est recalé (t, history, cumuls et rng continuent).
// Géométrie : le porteur avance de carrierSpeed·dt le long de la paroi (abscisse x) ; `carriage` est la
// position de la face de la sonde depuis la référence du porteur ; la paroi est en wallProfile(x).pos ;
// distance vraie = wall.pos - carriage. Le PI pilote la vitesse du chariot : erreur > 0 (trop loin) -> avance.

export const SIM_DEFAULTS = {
  target: 50, targetMin: 5, targetMax: 300,
  wallTiltDeg: 0, wallTiltMax: 5,
  carrierSpeed: 40, noiseMm: 0.3, roughness: 0.1, obstacle: false,
  kp: 6, ki: 2, vMax: 120, strokeMax: 460, wallNominal: 380, passLength: 800, angleTau: 0.25,
  dtFixed: 1 / 120, dtMax: 0.05, historyLen: 600, seed: 1,
};

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const withDefaults = (params) => ({ ...SIM_DEFAULTS, ...params });
const clampTarget = (p) => clamp(p.target, p.targetMin, p.targetMax);

// mulberry32 : renvoie [valeur dans [0,1), nouvel état]
function rand(a) {
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

// Box-Muller (une valeur par appel) : [gaussienne N(0,1), nouvel état]
function gauss(a) {
  let u1, u2;
  [u1, a] = rand(a);
  [u2, a] = rand(a);
  return [Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2), a]; // 1-u1 dans ]0,1]
}

export function wallProfile(x, params) {
  const p = withDefaults(params);
  const tilt = Math.tan(p.wallTiltDeg * RAD);
  const r = p.roughness;
  // ondulations lentes (R17) + grain court (R18, période 2π·16 ≈ 100 mm, ± 1,5 mm) visible dans la vue zoomée
  let pos = p.wallNominal + x * tilt + r * (4 * Math.sin(x / 300) + 1.5 * Math.sin(x / 90) + 1.5 * Math.sin(x / 16));
  // ponytail: la marche de l'obstacle (+15 mm sur 60 mm tous les 600 mm) est ignorée dans slopeDeg.
  if (p.obstacle && ((x % 600) + 600) % 600 < 60) pos += 15;
  const dpos = tilt + r * ((4 / 300) * Math.cos(x / 300) + (1.5 / 90) * Math.cos(x / 90) + (1.5 / 16) * Math.cos(x / 16));
  return { pos, slopeDeg: Math.atan(dpos) / RAD };
}

export function createState(params) {
  const p = withDefaults(params);
  const w = wallProfile(0, p), target = clampTarget(p);
  const carriage = clamp(w.pos - target, 0, p.strokeMax); // équilibre sur la paroi réelle en x = 0 (obstacle compris)
  const measured = w.pos - carriage; // sans bruit à l'instant initial
  return {
    t: 0, x: 0, pass: 0, carriage, velocity: 0, integ: 0,
    angle: w.slopeDeg, measured, error: measured - target, inTol: Math.abs(measured - target) <= 1,
    history: [], timeInTol: 0, timeTotal: 0, rng: p.seed >>> 0,
  };
}

export function step(state, dtIn, params) {
  const p = withDefaults(params);
  const target = clampTarget(p);
  const dt = clamp(Number.isFinite(dtIn) ? dtIn : 0, 0, p.dtMax);
  if (dt === 0) return { ...state, history: state.history.slice() };

  const n = Math.ceil(dt / Math.max(p.dtFixed, 1e-4) - 1e-9); // garde-fou : dtFixed <= 0 bouclerait indéfiniment
  const h = dt / n;
  const s = { ...state };
  let wall, trueErr = 0;
  for (let i = 0; i < n; i++) {
    s.x += p.carrierSpeed * h;
    if (s.x >= p.passLength) { // nouvelle passe : la paroi est reparcourue, le chariot se recale sur la consigne
      s.pass += Math.floor(s.x / p.passLength);
      s.x %= p.passLength;
      s.carriage = clamp(wallProfile(s.x, p).pos - target, 0, p.strokeMax);
      s.velocity = 0;
      s.integ = 0;
    }
    wall = wallProfile(s.x, p);

    let g;
    [g, s.rng] = gauss(s.rng);
    s.measured = wall.pos - s.carriage + p.noiseMm * g;
    s.error = s.measured - target;

    // PI saturé à ±vMax ; anti-windup : intégrale gelée si la commande sature
    // ou si le chariot est en butée de course et que la commande pousse encore dedans.
    const integNext = s.integ + s.error * h;
    const raw = p.kp * s.error + p.ki * integNext;
    const v = clamp(raw, -p.vMax, p.vMax);
    const atStop = (s.carriage <= 0 && raw < 0) || (s.carriage >= p.strokeMax && raw > 0);
    if (raw === v && !atStop) s.integ = integNext;

    const before = s.carriage;
    s.carriage = clamp(before + v * h, 0, p.strokeMax);
    s.velocity = (s.carriage - before) / h;

    s.angle += (wall.slopeDeg - s.angle) * (1 - Math.exp(-h / p.angleTau));

    trueErr = wall.pos - s.carriage - target;
    s.inTol = Math.abs(trueErr) <= 1;
    s.timeTotal += h;
    if (s.inTol) s.timeInTol += h;
  }
  s.t += dt;
  s.history = [...state.history.slice(Math.max(0, state.history.length - p.historyLen + 1)), trueErr]; // copie : l'entrée n'est jamais mutée
  return s;
}

export function toleranceRatio(state) {
  return state.timeTotal === 0 ? 0 : clamp(state.timeInTol / state.timeTotal, 0, 1);
}
