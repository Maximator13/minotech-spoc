// Fond de particules 3D (Canvas 2D, sans dépendance : la CSP interdit les CDN).
// Le nuage change de forme selon la section à l'écran : nébuleuse, bras robot, moteur pas à pas, caméra de profondeur, carte calculateur.
// La souris repousse localement les particules. Arrêt si l'onglet est masqué ; rien si « réduire les animations ».

const rnd = Math.random;
const v = (x, y, z) => [x, y, z];

// --- Échantillonneurs de surfaces : [aire, () => point] ---
function sphere(c, r) {
  return [4 * Math.PI * r * r, () => {
    const u = rnd() * 2 - 1, a = rnd() * 2 * Math.PI, s = Math.sqrt(1 - u * u);
    return v(c[0] + r * s * Math.cos(a), c[1] + r * u, c[2] + r * s * Math.sin(a));
  }];
}

// Cylindre autour du segment a → b (orientation quelconque), avec ou sans fonds.
function tube(a, b, r, caps = false) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d);
  const w = d.map((x) => x / len);
  const t = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let p = [w[1] * t[2] - w[2] * t[1], w[2] * t[0] - w[0] * t[2], w[0] * t[1] - w[1] * t[0]];
  const pl = Math.hypot(...p); p = p.map((x) => x / pl);
  const q = [w[1] * p[2] - w[2] * p[1], w[2] * p[0] - w[0] * p[2], w[0] * p[1] - w[1] * p[0]];
  const side = 2 * Math.PI * r * len, cap = caps ? 2 * Math.PI * r * r : 0;
  return [side + cap, () => {
    const ang = rnd() * 2 * Math.PI, rim = rnd() < 0.4, onCap = !rim && rnd() * (side + cap) > side;
    const rr = onCap ? r * Math.sqrt(rnd()) : r, k = rim || onCap ? (rnd() < 0.5 ? 0 : 1) : rnd();
    const c = Math.cos(ang) * rr, s = Math.sin(ang) * rr;
    return [0, 1, 2].map((i) => a[i] + d[i] * k + p[i] * c + q[i] * s);
  }];
}

function box(c, sx, sy, sz) {
  const faces = [[sy * sz, 0], [sx * sz, 1], [sx * sy, 2]];
  const area = 2 * (sy * sz + sx * sz + sx * sy);
  return [area, () => {
    let r = rnd() * area / 2, axis = 2;
    for (const [fa, i] of faces) { if (r < fa) { axis = i; break; } r -= fa; }
    const size = [sx, sy, sz], pt = size.map((d) => (rnd() - 0.5) * d);
    pt[axis] = (size[axis] / 2) * (rnd() < 0.5 ? -1 : 1);
    if (rnd() < 0.5) { const o = (axis + 1 + (rnd() < 0.5 ? 0 : 1)) % 3; pt[o] = (size[o] / 2) * (rnd() < 0.5 ? -1 : 1); } // arête
    return v(c[0] + pt[0], c[1] + pt[1], c[2] + pt[2]);
  }];
}

// Rotation autour de x (incliner une pièce vers le lecteur).
const tiltX = (pts, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  for (let j = 0; j < pts.length; j += 3) { const y = pts[j + 1], z = pts[j + 2]; pts[j + 1] = y * c + z * s; pts[j + 2] = -y * s + z * c; }
  return pts;
};

function sample(parts, n) {
  const total = parts.reduce((s, [a]) => s + a, 0), out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let r = rnd() * total, f = parts[parts.length - 1][1];
    for (const [a, g] of parts) { if (r < a) { f = g; break; } r -= a; }
    out.set(f(), i * 3);
  }
  return out;
}

// --- Formes ---
function nebula(n) {
  const out = new Float32Array(n * 3), g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, s = Math.sqrt(1 - y * y), r = rnd() < 0.85 ? 1 + (rnd() - 0.5) * 0.12 : 1.2 + rnd() * 0.7;
    out.set([Math.cos(g * i) * s * r, y * r, Math.sin(g * i) * s * r], i * 3);
  }
  return out;
}

const robotArm = (n) => sample([
  tube(v(0, -1, 0), v(0, -0.86, 0), 0.5, true),
  tube(v(0, -0.86, 0), v(0, -0.45, 0), 0.2),
  sphere(v(0, -0.4, 0), 0.19),
  tube(v(0, -0.4, 0), v(0.45, 0.35, 0), 0.11),
  sphere(v(0.45, 0.35, 0), 0.14),
  tube(v(0.45, 0.35, 0), v(-0.25, 0.62, 0), 0.08),
  sphere(v(-0.25, 0.62, 0), 0.09),
  tube(v(-0.25, 0.62, 0), v(-0.42, 0.44, 0), 0.06, true),
  tube(v(-0.42, 0.44, 0), v(-0.56, 0.28, 0.09), 0.025),
  tube(v(-0.42, 0.44, 0), v(-0.56, 0.28, -0.09), 0.025),
], n);

const depthCamera = (n) => sample([
  box(v(0, 0.15, 0), 1.7, 0.42, 0.36),
  tube(v(-0.55, 0.15, 0.18), v(-0.55, 0.15, 0.26), 0.13, true),
  tube(v(0, 0.15, 0.18), v(0, 0.15, 0.24), 0.07, true),
  tube(v(0.55, 0.15, 0.18), v(0.55, 0.15, 0.26), 0.13, true),
  tube(v(0, -0.06, 0), v(0, -0.7, 0), 0.05),
  tube(v(0, -0.7, 0), v(0, -0.76, 0), 0.4, true),
], n);

// Moteur pas à pas (type Nema 23), axe horizontal, arbre vers la droite de l'écran : flasques, stator, centrage, arbre, câble.
const stepperMotor = (n) => sample([
  box(v(0.75, 0, 0), 0.2, 1, 1),
  box(v(0.3, 0, 0), 0.7, 0.92, 0.92),
  box(v(-0.13, 0, 0), 0.16, 1, 1),
  tube(v(-0.21, 0, 0), v(-0.28, 0, 0), 0.3, true),
  tube(v(-0.28, 0, 0), v(-0.85, 0, 0), 0.06, true),
  tube(v(0.85, -0.3, 0.2), v(1.15, -0.6, 0.2), 0.04),
], n);

// Carte calculateur vue de dessus : circuit, processeur, second microcontrôleur, connecteur GPIO, prises.
const computeBoard = (n) => tiltX(sample([
  box(v(0, 0, 0), 1.6, 1.05, 0.05),
  box(v(-0.3, 0.02, 0.07), 0.42, 0.42, 0.09),
  box(v(0.35, 0.18, 0.05), 0.3, 0.34, 0.06),
  box(v(-0.1, 0.44, 0.09), 1.15, 0.09, 0.13),
  box(v(0.68, -0.24, 0.14), 0.3, 0.32, 0.25),
  box(v(0.68, 0.22, 0.1), 0.3, 0.2, 0.16),
], n), 0.9);

export function initParticles() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  // Scènes : les sections [data-shape] choisissent la forme, [data-pos="right"] décale le nuage, [data-dim] l'efface en fond.
  const scenes = [...document.querySelectorAll('[data-shape]')];
  const N = innerWidth < 768 ? 1400 : 2600;
  const shapes = [nebula(N), robotArm(N), stepperMotor(N), depthCamera(N), computeBoard(N)];
  // Chaque particule rejoint sa cible depuis sa position courante (interruptible), à sa propre vitesse.
  const rate = Float32Array.from({ length: N }, () => 0.035 + rnd() * 0.05);
  const cur = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) cur[i] = (rnd() - 0.5) * 8; // entrée : le nuage se condense au chargement
  const ox = new Float32Array(N), oy = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const sx = new Float32Array(N), sy = new Float32Array(N), bucket = new Uint8Array(N);

  let w = 0, h = 0, dpr = 1, color = '#0369a1', yaw = 0, tilt = 0.3, raf = 0;
  const cam = { x: 0.5, alpha: 0, scale: 0.36 };
  const mouse = { x: -1e4, y: -1e4, nx: 0, ny: 0 };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
  };
  const readColor = () => { color = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || color; };
  resize(); readColor();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / w - 0.5; mouse.ny = e.clientY / h - 0.5; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  new MutationObserver(readColor).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  const ALPHA = [0.22, 0.4, 0.65], SIZE = [1.2, 1.7, 2.2];

  function scene() {
    let act = scenes[0];
    for (const el of scenes) if (el.getBoundingClientRect().top <= h * 0.55) act = el;
    const wide = w >= 1024, right = act && act.dataset.pos === 'right';
    return {
      shape: act ? Number(act.dataset.shape) || 0 : 0,
      x: right && wide ? 0.72 : 0.5,
      alpha: act && act.hasAttribute('data-dim') ? 0.3 : wide ? (right ? 1 : 0.85) : 0.5, // sur mobile le nuage passe sous le texte
      scale: right ? 0.36 : 0.42,
    };
  }

  function frame(now) {
    const s = scene(), T = shapes[s.shape];
    cam.x += (s.x - cam.x) * 0.06; cam.alpha += (s.alpha - cam.alpha) * 0.05; cam.scale += (s.scale - cam.scale) * 0.06;
    // Balancement de trois quarts face (objectifs, arbre et composants vers le lecteur) plutôt qu'une rotation complète.
    yaw = Math.PI + 0.45 + Math.sin(now * 0.0003) * 0.6 + mouse.nx * 0.5;
    tilt += (0.3 + mouse.ny * 0.3 - tilt) * 0.05;

    const cy = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
    const scale = Math.min(w, h) * cam.scale, cx = w * cam.x, cyc = h * 0.5, D = 3.4;
    const R = 110, R2 = R * R;

    for (let i = 0; i < N; i++) {
      const j = i * 3, r = rate[i];
      const x = (cur[j] += (T[j] - cur[j]) * r), y = (cur[j + 1] += (T[j + 1] - cur[j + 1]) * r), z = (cur[j + 2] += (T[j + 2] - cur[j + 2]) * r);
      const x1 = x * cy + z * syw, z1 = -x * syw + z * cy;
      const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
      const p = D / Math.max(D + z2, 0.5);
      const px = cx + x1 * scale * p, py = cyc - y2 * scale * p;

      // Répulsion : force radiale autour du curseur, ressort de rappel, amortissement.
      const dx = px + ox[i] - mouse.x, dy = py + oy[i] - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) { const d = Math.sqrt(d2), force = (1 - d / R) * 2.2; vx[i] += (dx / d) * force; vy[i] += (dy / d) * force; }
      vx[i] = (vx[i] - ox[i] * 0.04) * 0.88; vy[i] = (vy[i] - oy[i] * 0.04) * 0.88;
      ox[i] += vx[i]; oy[i] += vy[i];

      sx[i] = (px + ox[i]) * dpr; sy[i] = (py + oy[i]) * dpr;
      bucket[i] = z2 > 0.35 ? 0 : z2 > -0.35 ? 1 : 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = ALPHA[b] * cam.alpha;
      const sz = SIZE[b] * dpr, half = sz / 2;
      for (let i = 0; i < N; i++) if (bucket[i] === b) ctx.fillRect(sx[i] - half, sy[i] - half, sz, sz);
    }
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);
}
