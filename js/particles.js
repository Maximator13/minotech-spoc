// Fond de particules 3D (Canvas 2D, sans dépendance : la CSP interdit les CDN).
// Le nuage change de forme selon la section à l'écran : nébuleuse, puis des pièces tirées de la CAO de SPOC
// (module de planéité, moteur NEMA 24, détection de surface, Raspberry Pi 5).
// La souris repousse localement les particules. Arrêt si l'onglet est masqué ; rien si « réduire les animations ».

const rnd = Math.random;

// --- Formes ---
function nebula(n) {
  const out = new Float32Array(n * 3), g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n, s = Math.sqrt(1 - y * y), r = rnd() < 0.85 ? 1 + (rnd() - 0.5) * 0.12 : 1.2 + rnd() * 0.7;
    out.set([Math.cos(g * i) * s * r, y * r, Math.sin(g * i) * s * r], i * 3);
  }
  return out;
}

// Pièces tirées de la CAO de SPOC (assets/spoc-parts.bin, voir communication/visuels/src/cao) : 4 pièces de
// 2 400 points, x, y (haut), z en octets signés. Ordre : planéité, moteur NEMA 24, détection de surface, calculateur.
const PART_BYTES = 2400 * 3;
function cadPart(raw, n) {
  const out = new Float32Array(n * 3), k = raw.length;
  for (let i = 0; i < n * 3; i++) out[i] = (raw[i % k] / 127) * 1.05 + (rnd() - 0.5) * 0.01; // léger flou sur les points repris
  return out;
}

export function initParticles() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '-1', pointerEvents: 'none' });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  // Scènes : les sections [data-shape] choisissent la forme, [data-pos="right"] décale le nuage, [data-dim] l'efface en fond.
  const scenes = [...document.querySelectorAll('[data-shape]')];
  const N = innerWidth < 768 ? 1800 : 3600;
  // En attendant les pièces (chargées à part), chaque chapitre garde la nébuleuse.
  const shapes = [nebula(N), nebula(N), nebula(N), nebula(N), nebula(N)];
  fetch(new URL('../assets/spoc-parts.bin', import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((buf) => { for (let p = 0; p < 4; p++) shapes[p + 1] = cadPart(new Int8Array(buf, p * PART_BYTES, PART_BYTES), N); })
    .catch(() => {}); // sans les pièces, le fond reste une nébuleuse
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
      scale: right ? 0.29 : 0.42,
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
