// Vue Canvas du simulateur : fenêtre zoomée sur l'écart sonde – paroi (vue de dessus) + courbe d'erreur.
// Aucun accès au DOM à l'import : PRESETS, fmt, matchesPreset et niceStep sont testables sous Node.
import { SIM_DEFAULTS, wallProfile } from './model.js';

// Chaque préréglage repart de SIM_DEFAULTS (cf. presetParams).
export const PRESETS = {
  nominal: {},
  inclinee: { wallTiltDeg: 4 },
  rugueuse: { roughness: 1, noiseMm: 0.8 },
  obstacle: { obstacle: true },
};
export const presetParams = (key) => ({ ...SIM_DEFAULTS, ...PRESETS[key] });

const TRACKED = ['target', 'wallTiltDeg', 'carrierSpeed', 'noiseMm', 'roughness', 'obstacle'];
export const matchesPreset = (params, key) => TRACKED.every((k) => params[k] === presetParams(key)[k]);

// Nombre à la française, sans « -0,0 », signe moins typographique.
export function fmt(v, d = 1, signed = false) {
  const r = Number(v.toFixed(d)) || 0;
  const s = r.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
  return signed && r > 0 ? '+' + s : s;
}

// Plus petit pas « rond » (1, 2, 5 × 10^n) >= v, pour v > 0.
export function niceStep(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= v * (1 - 1e-9));
}

// Chemin de rectangle arrondi ; rectangle simple si le navigateur n'a pas ctx.roundRect.
export function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue('--color-' + n).trim();
  const dark = document.documentElement.classList.contains('dark');
  return {
    bg: v(dark ? 'card' : 'paper'), ink: v(dark ? 'silver' : 'ink'), line: v(dark ? 'line-dark' : 'line'),
    accent: v('accent'), ok: v('ok'), warn: v('warn'), mono: cs.getPropertyValue('--font-mono').trim() || 'monospace',
  };
}

export function createSimView(canvas) {
  const ctx = canvas.getContext('2d');
  let c = readColors(), W = 0, H = 0, dpr = 1, last = null;

  const font = (px, w = 500) => { ctx.font = `${w} ${px}px ${c.mono}`; };
  // Étiquette mono sur fond de carte (lisible par-dessus les hachures).
  function tag(text, x, y, { align = 'left', color = c.ink, alpha = 0.75, dot = null } = {}) {
    font(10, 600);
    const tw = ctx.measureText(text).width + (dot ? 12 : 0), w = tw + 10;
    const x0 = align === 'right' ? x - w : x;
    ctx.fillStyle = c.bg;
    ctx.fillRect(x0, y - 9, w, 18);
    if (dot) { ctx.fillStyle = dot; ctx.beginPath(); ctx.arc(x0 + 9, y, 3.5, 0, 2 * Math.PI); ctx.fill(); }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x0 + 5 + (dot ? 12 : 0), y + 0.5);
    ctx.globalAlpha = 1;
  }
  function arrowHead(x, y, dir, size = 5) { // dir : angle en radians de la pointe
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * Math.cos(dir - 0.45), y - size * Math.sin(dir - 0.45));
    ctx.lineTo(x - size * Math.cos(dir + 0.45), y - size * Math.sin(dir + 0.45));
    ctx.closePath(); ctx.fill();
  }

  function drawScene(s, p, sh) {
    const target = clamp(p.target, p.targetMin, p.targetMax);
    const k = clamp((sh * 0.36) / target, 0.35, 3.2); // px/mm : l'écart de consigne occupe ~36 % de la scène
    const px = Math.round(W * 0.36); // abscisse écran de la sonde
    const tilt = Math.tan(p.wallTiltDeg * RAD);
    const y0 = sh * 0.26; // la tendance de la paroi (inclinaison seule) reste à cette hauteur : la caméra la suit
    const yOf = (pos) => y0 + (p.wallNominal + s.x * tilt - pos) * k;
    const wall = wallProfile(s.x, p), ok = s.inTol ? c.ok : c.warn;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, sh); ctx.clip();

    // Paroi : profil défilant, matière hachurée au-delà.
    const pts = [];
    for (let sx = 0; sx <= W + 2; sx += 2) pts.push([sx, yOf(wallProfile(s.x + (sx - px) / k, p).pos)]);
    const maxY = Math.max(...pts.map((q) => q[1]));
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 0);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(W + 2, 0); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = c.ink; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
    const off = ((s.x * k) % 9 + 9) % 9; // les hachures défilent avec la paroi
    ctx.beginPath();
    for (let i = -maxY - off; i < W + 9; i += 9) { ctx.moveTo(i, maxY); ctx.lineTo(i + maxY, 0); }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();

    // Porteur et module linéaire (rupture d'échelle : le porteur est hors de la fenêtre zoomée).
    const yFace = yOf(s.carriage);
    const pw = clamp(W * 0.1, 46, 84), ph = clamp(sh * 0.09, 20, 30);
    const chH = clamp(sh * 0.1, 24, 34), yCarr = sh - chH - 12, cw = pw * 1.7;
    const yPivot = yFace + ph;
    ctx.strokeStyle = c.ink; ctx.fillStyle = c.bg; ctx.lineWidth = 1.5;
    if (yCarr > yPivot) {
      ctx.fillRect(px - 4, yPivot, 8, yCarr - yPivot);
      ctx.strokeRect(px - 4, yPivot, 8, yCarr - yPivot);
      const ym = (yPivot + yCarr) / 2;
      if (yCarr - yPivot > 24) { // repère de rupture d'échelle
        ctx.fillRect(px - 8, ym - 4, 16, 8);
        ctx.beginPath(); ctx.moveTo(px - 9, ym - 1); ctx.lineTo(px + 9, ym - 6); ctx.moveTo(px - 9, ym + 6); ctx.lineTo(px + 9, ym + 1); ctx.stroke();
      }
    }
    ctx.beginPath(); roundRectPath(ctx, px - cw / 2, yCarr, cw, chH, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.ink;
    [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(px + d * cw * 0.32, yCarr + chH + 4, 3.5, 0, 2 * Math.PI); ctx.fill(); });
    font(9, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.75;
    ctx.fillText('PORTEUR', px, yCarr + chH / 2 + 0.5);
    ctx.globalAlpha = 1;
    // sens d'avance
    const ax = px + cw / 2 + 12, ay = yCarr + chH / 2;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + 30, ay); ctx.stroke();
    ctx.fillStyle = c.ink; arrowHead(ax + 32, ay, 0);
    font(10); ctx.textAlign = 'left';
    ctx.fillText(`${fmt(p.carrierSpeed, 0)} mm/s`, ax + 40, ay + 0.5);
    ctx.globalAlpha = 1;

    // Sonde, rotule de parallélisme, consigne et bande de tolérance (repère de la sonde).
    ctx.save();
    ctx.translate(px, yPivot); ctx.rotate(-s.angle * RAD);
    const yT = -ph - target * k; // position où la paroi devrait se trouver
    const bw = pw * 0.85;
    ctx.fillStyle = c.ok; ctx.globalAlpha = 0.22;
    ctx.fillRect(-bw, yT - k, 2 * bw, 2 * k); // ± 1 mm
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(-bw, yT); ctx.lineTo(bw, yT); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); roundRectPath(ctx, -pw / 2, -ph, pw, ph, 4);
    ctx.fillStyle = c.bg; ctx.fill();
    ctx.fillStyle = c.accent; ctx.globalAlpha = 0.14; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-pw / 2 + 5, -ph); ctx.lineTo(pw / 2 - 5, -ph); ctx.stroke();
    ctx.fillStyle = c.accent; font(9, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SONDE', 0, -ph / 2 + 1);
    ctx.restore();
    ctx.fillStyle = c.bg; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, yPivot, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

    // Faisceau du capteur de distance et cote.
    const yW = yOf(wall.pos);
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(px, yFace); ctx.lineTo(px, yW); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    const cx = px + pw / 2 + 14;
    ctx.strokeStyle = ok; ctx.fillStyle = ok; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx, yFace); ctx.lineTo(cx, yW); ctx.stroke();
    if (Math.abs(yFace - yW) > 12) { arrowHead(cx, yW, yW < yFace ? -Math.PI / 2 : Math.PI / 2); arrowHead(cx, yFace, yW < yFace ? Math.PI / 2 : -Math.PI / 2); }
    tag(`d = ${fmt(s.measured)} mm`, cx + 8, (yFace + yW) / 2, { alpha: 1, dot: ok }); // texte encre, statut porté par la pastille (contraste AA)

    // Indicateurs : statut, passe, échelle, course.
    tag(s.inTol ? 'DANS LA TOLÉRANCE' : 'CORRECTION EN COURS', 10, 16, { dot: ok, alpha: 0.9 });
    tag(`PASSE ${s.pass + 1}`, W - 10, 16, { align: 'right' });
    tag('PAROI', 10, 40);
    const len = niceStep(30 / k), lw = len * k, by = sh - 12;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(12, by - 4); ctx.lineTo(12, by); ctx.lineTo(12 + lw, by); ctx.lineTo(12 + lw, by - 4); ctx.stroke();
    ctx.fillStyle = c.ink; font(10); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(`${fmt(len, 0)} mm`, 12, by - 6);
    ctx.globalAlpha = 1;
    if (W >= 420) {
      const gw = 70, gx = W - 12 - gw, gy = sh - 14;
      ctx.fillStyle = c.ink; ctx.globalAlpha = 0.75; font(10); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('COURSE', W - 12, gy - 6);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(gx + 0.5, gy + 0.5, gw, 5);
      ctx.fillStyle = c.accent; ctx.fillRect(gx + 0.5, gy + 0.5, gw * clamp(s.carriage / p.strokeMax, 0, 1), 5);
    }
    ctx.restore();
  }

  function drawChart(s, p, sh) {
    const top = sh + 34, bottom = H - 22, left = 36, right = W - 12, mid = (top + bottom) / 2;
    ctx.strokeStyle = c.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, sh + 0.5); ctx.lineTo(W, sh + 0.5); ctx.stroke();
    font(10, 600); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = c.ink; ctx.globalAlpha = 0.75;
    ctx.fillText('ERREUR DE DISTANCE (mm)', 12, sh + 16);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right'; ctx.globalAlpha = 0.75;
    ctx.fillText('TOLÉRANCE ± 1 mm', W - 12, sh + 16);
    ctx.globalAlpha = 1; ctx.fillStyle = c.ok; // légende : pastille aux couleurs de la bande, texte encre
    ctx.fillRect(W - 12 - ctx.measureText('TOLÉRANCE ± 1 mm').width - 16, sh + 12, 10, 8);

    let m = 0;
    for (const e of s.history) m = Math.max(m, Math.abs(e));
    const R = Math.max(2, niceStep(m * 1.1 || 1));
    const yE = (e) => mid - (e / R) * (bottom - top) / 2;
    ctx.fillStyle = c.ok; ctx.globalAlpha = 0.16;
    ctx.fillRect(left, yE(1), right - left, yE(-1) - yE(1));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = c.ok; ctx.setLineDash([3, 3]);
    ctx.beginPath(); [1, -1].forEach((e) => { ctx.moveTo(left, Math.round(yE(e)) + 0.5); ctx.lineTo(right, Math.round(yE(e)) + 0.5); }); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = c.line;
    ctx.beginPath();
    [R, 0, -R].forEach((e) => { ctx.moveTo(left, Math.round(yE(e)) + 0.5); ctx.lineTo(right, Math.round(yE(e)) + 0.5); });
    ctx.stroke();
    font(10); ctx.textAlign = 'right'; ctx.fillStyle = c.ink; ctx.globalAlpha = 0.75;
    const labels = [R, 0, -R];
    if (yE(-1) - yE(1) > 22) labels.push(1, -1);
    labels.forEach((e) => ctx.fillText(fmt(e, 0, true), left - 6, yE(e)));
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(`t = ${fmt(s.t)} s`, right, bottom + 6);
    ctx.globalAlpha = 1;

    const h = s.history, n = p.historyLen, dx = (right - left) / (n - 1);
    if (!h.length) return;
    const xAt = (i) => right - (h.length - 1 - i) * dx;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    h.forEach((e, i) => (i ? ctx.lineTo(xAt(i), yE(e)) : ctx.moveTo(xAt(i), yE(e))));
    ctx.stroke();
    ctx.fillStyle = s.inTol ? c.ok : c.warn;
    ctx.beginPath(); ctx.arc(right, yE(h[h.length - 1]), 3.5, 0, 2 * Math.PI); ctx.fill();
  }

  function draw() {
    if (!last || !W || !H) return;
    const p = { ...SIM_DEFAULTS, ...last.params };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    const sh = Math.round(H * 0.6);
    drawScene(last.state, p, sh);
    drawChart(last.state, p, sh);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    draw();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const mo = new MutationObserver(() => { c = readColors(); draw(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.fonts?.ready.then(draw);
  resize();

  return {
    render(state, params) { last = { state, params }; draw(); },
    resize,
    destroy() { ro.disconnect(); mo.disconnect(); },
  };
}
