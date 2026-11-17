// Fond de particules 3D (Canvas 2D, sans dépendance : la CSP interdit les CDN).
// Le nuage change de forme selon la section à l'écran : nébuleuse, puis des pièces tirées de la CAO de SPOC
// (module de planéité, moteur NEMA 24, détection de surface, Raspberry Pi 5) : les points se posent sur les arêtes
// de la pièce, puis son dessin au trait se trace par-dessus.
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

// Pièces tirées de la CAO de SPOC (assets/spoc-edges.bin, voir communication/visuels/src/cao/edges_web.py) :
// pour chaque pièce, un uint16 (nombre de segments) puis les segments en octets signés (x1 y1 z1 x2 y2 z2), y vers le haut.
// Ordre : planéité, moteur NEMA 24, détection de surface, calculateur.
function parseEdges(buf) {
  const parts = [], v = new DataView(buf);
  let o = 0;
  while (o + 2 <= buf.byteLength && parts.length < 4) {
    const n = v.getUint16(o, true); o += 2;
    const raw = new Int8Array(buf, o, n * 6); o += n * 6;
    parts.push(Float32Array.from(raw, (q) => (q / 127) * 1.05));
  }
  return parts;
}

// Points répartis le long des arêtes (au prorata de la longueur) : le nuage se pose sur le dessin de la pièce.
function pointsOnEdges(seg, n) {
  const m = seg.length / 6, cum = new Float32Array(m);
  let tot = 0;
  for (let k = 0; k < m; k++) {
    const j = k * 6;
    tot += Math.hypot(seg[j + 3] - seg[j], seg[j + 4] - seg[j + 1], seg[j + 5] - seg[j + 2]);
    cum[k] = tot;
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = rnd() * tot;
    let lo = 0, hi = m - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    const j = lo * 6, t = rnd(), jit = () => (rnd() - 0.5) * 0.018;
    out[i * 3] = seg[j] + (seg[j + 3] - seg[j]) * t + jit();
    out[i * 3 + 1] = seg[j + 1] + (seg[j + 4] - seg[j + 1]) * t + jit();
    out[i * 3 + 2] = seg[j + 2] + (seg[j + 5] - seg[j + 2]) * t + jit();
  }
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
  const edges = [null, null, null, null, null]; // dessin au trait de chaque pièce (segments), tracé une fois le nuage posé
  fetch(new URL('../assets/spoc-edges.bin', import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((buf) => parseEdges(buf).forEach((seg, p) => { edges[p + 1] = seg; shapes[p + 1] = pointsOnEdges(seg, N); }))
    .catch(() => {}); // sans les pièces, le fond reste une nébuleuse
  // Chaque particule rejoint sa cible depuis sa position courante (interruptible), à sa propre vitesse.
  const rate = Float32Array.from({ length: N }, () => 0.035 + rnd() * 0.05);
  const cur = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) cur[i] = (rnd() - 0.5) * 8; // entrée : le nuage se condense au chargement
  const ox = new Float32Array(N), oy = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const sx = new Float32Array(N), sy = new Float32Array(N), bucket = new Uint8Array(N);

  let w = 0, h = 0, dpr = 1, color = '#0369a1', yaw = 0, tilt = 0.3, raf = 0;
  let lastShape = -1, since = 0, lineA = 0; // trait : apparaît quand le nuage est posé, s'efface au changement de pièce
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
    if (s.shape !== lastShape) { lastShape = s.shape; since = now; }
    const settle = now - since, wantLines = edges[s.shape] && settle > 900 ? 1 : 0;
    lineA += (wantLines - lineA) * (wantLines ? 0.05 : 0.3);
    const draw = Math.max(0, Math.min(1, (settle - 900) / 1600)); // le dessin se trace en 1,6 s
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
    // Dessin au trait de la pièce, tracé progressivement par-dessus le nuage
    const seg = edges[s.shape];
    if (seg && lineA > 0.01) {
      const m = seg.length / 6, P = (x, y, z) => {
        const x1 = x * cy + z * syw, z1 = -x * syw + z * cy, y2 = y * ct - z1 * st, z2 = y * st + z1 * ct, p = D / Math.max(D + z2, 0.5);
        return [(cx + x1 * scale * p) * dpr, (cyc - y2 * scale * p) * dpr];
      };
      ctx.strokeStyle = color; ctx.lineWidth = 1.05 * dpr; ctx.globalAlpha = 0.55 * lineA * cam.alpha;
      ctx.beginPath();
      for (let k = 0; k < m; k++) {
        const f = Math.min(1, draw * 1.35 - (k / m) * 0.35); // chaque segment démarre un peu après le précédent
        if (f <= 0) continue;
        const j = k * 6, [ax, ay] = P(seg[j], seg[j + 1], seg[j + 2]), [bx, by] = P(seg[j + 3], seg[j + 4], seg[j + 5]);
        ctx.moveTo(ax, ay); ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
      }
      ctx.stroke();
    }
    ctx.fillStyle = color;
    const dust = 1 - 0.45 * lineA; // une fois le trait là, les points restent en poussière autour
    for (let b = 0; b < 3; b++) {
      ctx.globalAlpha = ALPHA[b] * cam.alpha * dust;
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
