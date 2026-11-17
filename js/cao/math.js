// Vecteurs et matrices pour la visionneuse : tableaux simples, mat4 en Float32Array(16) colonne-major (comme WebGL).
// Aucun accès au DOM : testable sous Node.

export const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => v3.scale(a, 1 / (v3.len(a) || 1)),
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

export function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

export function lookAt(eye, target, up) {
  const z = v3.norm(v3.sub(eye, target)), x = v3.norm(v3.cross(up, z)), y = v3.cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1,
  ]);
}

export function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function invert(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return null;
  const d = 1 / det;
  return new Float32Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d,
    (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d,
    (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d,
    (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d,
    (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ]);
}

export function transform(m, [x, y, z]) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

export const PITCH_MAX = (89 * Math.PI) / 180;
export const clampPitch = (p) => Math.max(-PITCH_MAX, Math.min(PITCH_MAX, p));

// Y en haut ; yaw 0, pitch 0 : caméra côté +Z ; yaw 90° : côté +X.
export function orbitEye({ target, yaw, pitch, dist }) {
  const p = clampPitch(pitch), c = Math.cos(p);
  return [target[0] + dist * c * Math.sin(yaw), target[1] + dist * Math.sin(p), target[2] + dist * c * Math.cos(yaw)];
}

// Pixels CSS, origine en haut à gauche ; depth = z normalisé (-1 proche, 1 loin).
export function project(viewProj, p, w, h) {
  const [x, y, z] = transform(viewProj, p);
  return [((x + 1) / 2) * w, ((1 - y) / 2) * h, z];
}

export function screenRay(invViewProj, px, py, w, h) {
  const x = (px / w) * 2 - 1, y = 1 - (py / h) * 2;
  const near = transform(invViewProj, [x, y, -1]), far = transform(invViewProj, [x, y, 1]);
  return { origin: near, dir: v3.norm(v3.sub(far, near)) };
}

// Intersection avec un plan ; null si parallèle ou derrière l'origine du rayon.
export function rayPlane(ray, point, normal) {
  const den = v3.dot(ray.dir, normal);
  if (Math.abs(den) < 1e-9) return null;
  const t = v3.dot(v3.sub(point, ray.origin), normal) / den;
  return t < 0 ? null : v3.add(ray.origin, v3.scale(ray.dir, t));
}

// Ressort critique, solution exacte : stable quel que soit dt, interruptible (la vitesse est conservée).
export function spring(x, v, goal, dt, omega = 12) {
  if (!(dt > 0)) return [x, v];
  const c1 = x - goal, c2 = v + omega * c1, e = Math.exp(-omega * dt);
  return [goal + (c1 + c2 * dt) * e, (c2 - omega * (c1 + c2 * dt)) * e];
}

// Distance pour que la sphère de rayon donné tienne dans le cadre, marge 1,15.
export function fitDistance(radius, fovY, aspect) {
  const half = Math.min(fovY / 2, Math.atan(Math.tan(fovY / 2) * aspect));
  return (radius * 1.15) / Math.sin(half);
}

// to ramené à ±π de from : une vue animée ne fait jamais un tour complet.
export function shortestAngle(from, to) {
  return to + 2 * Math.PI * Math.round((from - to) / (2 * Math.PI));
}
