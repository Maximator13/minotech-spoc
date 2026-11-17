// Visionneuse WebGL2 de la maquette : rendu à la demande, sélection par tampon d'identifiants, plan de coupe,
// vue éclatée, caméra orbitale à ressorts. Navigateur seul (la logique pure est dans math.js et parts.js).
import { v3, perspective, lookAt, mul, invert, orbitEye, clampPitch, screenRay, rayPlane, spring, fitDistance, shortestAngle } from './math.js';
import { VIEWS, explodeVectors } from './parts.js';

const FOV = (35 * Math.PI) / 180;
const ROTATE = 0.005; // rad par pixel CSS
const FRICTION = 4; // amortissement de l'inertie, par seconde
const DEG15 = Math.PI / 12;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
// Constantes d'éclairage en linéaire ; fond, accent et liseré en sRGB.
const THEMES = {
  light: {
    bg: hex('#FFFFFF'), accent: hex('#0369A1'), edge: [...hex('#0F172A'), 0.35],
    sky: [0.5, 0.55, 0.63], ground: [0.16, 0.16, 0.17], key: [1.7, 1.64, 1.55], rim: [0.45, 0.52, 0.66], exposure: 1.15,
  },
  dark: {
    bg: hex('#0D1527'), accent: hex('#38BDF8'), edge: [...hex('#BAE6FD'), 0.22],
    sky: [0.36, 0.41, 0.52], ground: [0.08, 0.09, 0.11], key: [2.0, 1.95, 1.85], rim: [0.8, 0.9, 1.1], exposure: 1.3,
  },
};
// Directions des lumières dans le repère de la caméra (x droite, y haut, z vers l'observateur) : l'éclairage suit la vue.
const KEY_DIR = v3.norm([-0.6, 0.6, 0.5]);
const RIM_DIR = v3.norm([0.7, 0.35, -0.6]);

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
uniform mat4 uViewProj;
uniform vec3 uOffset;
out vec3 vWorld;
out vec3 vLocal;
out vec3 vNor;
void main() {
  vLocal = aPos; // repère de l'assemblage : la coupe suit chaque pièce éclatée
  vWorld = aPos + uOffset;
  vNor = aNor;
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

const SHADE = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vLocal;
in vec3 vNor;
uniform vec3 uEye, uColor, uSky, uGround, uKeyDir, uKeyCol, uRimDir, uRimCol, uCap;
uniform float uMetal, uRough, uAlpha, uExposure, uCapOn;
uniform vec4 uTint, uClip, uEdge;
out vec4 o;
vec3 lamp(vec3 N, vec3 V, vec3 L, vec3 col, vec3 diff, vec3 F0, float sh) {
  float nl = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float s = pow(max(dot(N, H), 0.0), sh) * (sh + 8.0) / 25.13;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  return col * nl * (diff + F * s);
}
void main() {
  if (dot(vLocal, uClip.xyz) > uClip.w) discard;
  vec3 V = normalize(uEye - vWorld);
  vec3 N = normalize(vNor);
  float nv = dot(N, V);
  // Coupe : l'intérieur vu par la section est peint en aplat (bord coloré sans géométrie de bouchon).
  if (uCapOn > 0.5 && !gl_FrontFacing && nv < 0.0) { o = vec4(uCap, 1.0); return; }
  if (nv < 0.0) { N = -N; nv = -nv; }
  vec3 base = uColor + max(0.06 - max(max(uColor.r, uColor.g), uColor.b), 0.0);
  float r = clamp(uRough, 0.08, 1.0);
  float sh = clamp(2.0 / pow(r, 4.0) - 2.0, 1.0, 2048.0);
  vec3 diff = base * (1.0 - 0.65 * uMetal);
  vec3 F0 = mix(vec3(0.04), base, uMetal);
  vec3 c = diff * mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 R = reflect(-V, N);
  vec3 Fv = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  c += Fv * mix(uGround, uSky, smoothstep(-0.3, 0.5, R.y)) * mix(0.25, 1.0, uMetal) * (1.0 - 0.6 * r);
  c += lamp(N, V, uKeyDir, uKeyCol, diff, F0, sh) + lamp(N, V, uRimDir, uRimCol, diff, F0, sh);
  c = pow(1.0 - exp(-c * uExposure), vec3(1.0 / 2.2));
  c = mix(c, uEdge.rgb, pow(1.0 - nv, 3.0) * uEdge.a);
  c = mix(c, uTint.rgb, uTint.a);
  float a = uAlpha < 1.0 ? clamp(uAlpha + 0.4 * pow(1.0 - nv, 2.0), 0.0, 0.7) : 1.0;
  o = vec4(c, a);
}`;

const PICK = `#version 300 es
precision highp float;
in vec3 vLocal;
uniform vec4 uClip;
uniform vec3 uId;
out vec4 o;
void main() {
  if (dot(vLocal, uClip.xyz) > uClip.w) discard;
  o = vec4(uId, 1.0);
}`;

function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('Shader : ' + gl.getProgramInfoLog(p));
  const u = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
    const name = gl.getActiveUniform(p, i).name;
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

function unionBox(items) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const { min: a, max: b, off = [0, 0, 0] } of items) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], a[k] + off[k]);
      max[k] = Math.max(max[k], b[k] + off[k]);
    }
  }
  return { min, max, center: v3.lerp(min, max, 0.5), radius: v3.len(v3.sub(max, min)) / 2 };
}

export function createViewer(canvas, model, opts = {}) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 indisponible.');

  let reduced = !!opts.reducedMotion;
  let theme = opts.dark ? THEMES.dark : THEMES.light;
  const boxes = Object.fromEntries(model.nodes.map((n) => [n.name, { min: n.min, max: n.max }]));
  const explode = explodeVectors(boxes);
  const parts = model.nodes.map((n, i) => ({ ...n, key: n.name, id: i + 1, explode: explode[n.name] || [0, 0, 0] }));
  const byKey = new Map(parts.map((p) => [p.key, p]));
  const opaque = parts.filter((p) => !p.material.blend), clear = parts.filter((p) => p.material.blend);
  const whole = unionBox(parts);
  const DIST_MIN = 0.15 * whole.radius, DIST_MAX = 6 * whole.radius;

  // Caméra et éclaté : [cibleX, cibleY, cibleZ, yaw, pitch, dist, éclaté 0..1], état, but, vitesses.
  const S = [...whole.center, VIEWS.iso.yaw, VIEWS.iso.pitch, 1, 0];
  const G = S.slice(), V = S.map(() => 0);
  let fling = null;

  const hidden = new Set();
  let isolated = null, selected = null, hovered = null;
  let clip = [0, 0, 0, 1], clipOn = false;
  let pickCb = null, hoverCb = null;
  let gpu = null, pickFbo = null, lost = false, raf = 0, last = 0;
  const pixel = new Uint8Array(4);

  const visible = (p) => !hidden.has(p.key) && (!isolated || isolated.has(p.key));
  const aspect = () => canvas.width / Math.max(canvas.height, 1);
  const clampDist = (d) => Math.max(DIST_MIN, Math.min(DIST_MAX, d));

  function init() {
    const shade = compile(gl, VERT, SHADE), pick = compile(gl, VERT, PICK);
    const meshes = parts.map((p) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const bufs = [p.positions, p.normals].map((data, loc) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
        return b;
      });
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.indices, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, bufs: [...bufs, ib], count: p.indices.length, type: p.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
    });
    gpu = { shade, pick, meshes };
    pickFbo = null;
    gl.enable(gl.DEPTH_TEST);
  }

  function freeGpu() {
    if (!gpu || gl.isContextLost()) return;
    for (const m of gpu.meshes) {
      gl.deleteVertexArray(m.vao);
      m.bufs.forEach((b) => gl.deleteBuffer(b));
    }
    gl.deleteProgram(gpu.shade.p);
    gl.deleteProgram(gpu.pick.p);
    if (pickFbo) {
      gl.deleteFramebuffer(pickFbo.fb);
      pickFbo.rbs.forEach((r) => gl.deleteRenderbuffer(r));
    }
    gpu = pickFbo = null;
  }

  // --- Caméra ---
  const stateOf = (A) => ({ target: [A[0], A[1], A[2]], yaw: A[3], pitch: A[4], dist: A[5] });
  function camera(A = S) {
    const st = stateOf(A);
    const eye = orbitEye(st);
    const view = lookAt(eye, st.target, [0, 1, 0]);
    const near = Math.max(st.dist * 0.02, 1e-4), far = st.dist + whole.radius * 10;
    const vp = mul(perspective(FOV, aspect(), near, far), view);
    return { eye, vp, right: [view[0], view[4], view[8]], up: [view[1], view[5], view[9]], back: [view[2], view[6], view[10]] };
  }
  const toWorld = (c, d) => v3.add(v3.add(v3.scale(c.right, d[0]), v3.scale(c.up, d[1])), v3.scale(c.back, d[2]));

  function settle() {
    if (reduced) for (let i = 0; i < S.length; i++) (S[i] = G[i]), (V[i] = 0);
    requestRender();
  }
  function grab() {
    fling = null;
    for (let i = 0; i < 6; i++) (G[i] = S[i]), (V[i] = 0);
  }
  function snap(from, to) {
    for (let i = from; i < to; i++) (S[i] = G[i]), (V[i] = 0);
  }

  function pan(dx, dy) {
    const wpp = (2 * G[5] * Math.tan(FOV / 2)) / Math.max(canvas.clientHeight, 1);
    const c = camera(G);
    const t = v3.add(v3.add([G[0], G[1], G[2]], v3.scale(c.right, -dx * wpp)), v3.scale(c.up, dy * wpp));
    G[0] = t[0], G[1] = t[1], G[2] = t[2];
  }

  // Zoom vers le point sous le curseur (pixels CSS), ou vers la cible si x est absent.
  function zoom(factor, x, y) {
    const d = clampDist(G[5] * factor), k = d / G[5];
    if (x !== undefined) {
      const c = camera(G), inv = invert(c.vp);
      const P = inv && rayPlane(screenRay(inv, x, y, canvas.clientWidth, canvas.clientHeight), [G[0], G[1], G[2]], c.back);
      if (P) for (let i = 0; i < 3; i++) G[i] = P[i] + (G[i] - P[i]) * k;
    }
    G[5] = d;
  }

  // margin > 1 : on recule pour garder le contexte autour de la piece cadree
  function fit(keys, margin = 1) {
    fling = null;
    const list = (keys?.length ? keys.map((k) => byKey.get(k)).filter(Boolean) : parts.filter(visible));
    if (!list.length) return;
    const b = unionBox(list.map((p) => ({ min: p.min, max: p.max, off: v3.scale(p.explode, G[6]) })));
    [G[0], G[1], G[2]] = b.center;
    let d = fitDistance(Math.max(b.radius, 1e-3), FOV, aspect()) * margin;
    if (margin > 1) { // cadrage d'une piece : jamais plus pres que 60 % de la vue d'ensemble
      const all = unionBox(parts.filter(visible).map((p) => ({ min: p.min, max: p.max, off: v3.scale(p.explode, G[6]) })));
      d = Math.max(d, fitDistance(Math.max(all.radius, 1e-3), FOV, aspect()) * 0.6);
    }
    G[5] = clampDist(d);
    settle();
  }

  function setView(name) {
    const v = VIEWS[name];
    if (!v) return;
    G[3] = shortestAngle(S[3], v.yaw);
    G[4] = v.pitch;
    fit();
  }

  // --- Boucle à la demande ---
  function requestRender() {
    if (!raf && !lost) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    const moving = step(dt);
    draw();
    if (moving) requestRender();
    else last = 0;
  }
  function step(dt) {
    let moving = false;
    if (fling) {
      G[3] += fling[0] * dt;
      G[4] = clampPitch(G[4] + fling[1] * dt);
      snap(3, 5);
      const f = Math.exp(-FRICTION * dt);
      fling = [fling[0] * f, fling[1] * f];
      if (Math.hypot(fling[0], fling[1]) < 0.01) fling = null;
      else moving = true;
    }
    for (let i = 0; i < S.length; i++) {
      if (Math.abs(S[i] - G[i]) < 1e-4 && Math.abs(V[i]) < 1e-4) {
        S[i] = G[i];
        V[i] = 0;
        continue;
      }
      [S[i], V[i]] = spring(S[i], V[i], G[i], dt);
      moving = true;
    }
    return moving;
  }

  // --- Rendu ---
  function drawPart(prog, p, extra) {
    const m = gpu.meshes[p.id - 1];
    gl.uniform3fv(prog.u.uOffset, v3.scale(p.explode, S[6]));
    extra?.(p);
    gl.bindVertexArray(m.vao);
    gl.drawElements(gl.TRIANGLES, m.count, m.type, 0);
  }

  function partUniforms(p) {
    const u = gpu.shade.u, mat = p.material;
    gl.uniform3fv(u.uColor, mat.color.slice(0, 3));
    gl.uniform1f(u.uMetal, mat.metallic);
    gl.uniform1f(u.uRough, mat.roughness);
    gl.uniform1f(u.uAlpha, mat.blend ? mat.color[3] : 1);
    const tint = p.key === selected ? 0.45 : p.key === hovered ? 0.25 : 0;
    gl.uniform4f(u.uTint, ...theme.accent, tint);
  }

  function draw() {
    if (lost || !gpu) return;
    const c = camera(), u = gpu.shade.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...theme.bg, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(gpu.shade.p);
    gl.uniformMatrix4fv(u.uViewProj, false, c.vp);
    gl.uniform3fv(u.uEye, c.eye);
    gl.uniform4fv(u.uClip, clip);
    gl.uniform3fv(u.uCap, theme.accent);
    gl.uniform4fv(u.uEdge, theme.edge);
    gl.uniform3fv(u.uSky, theme.sky);
    gl.uniform3fv(u.uGround, theme.ground);
    gl.uniform3fv(u.uKeyCol, theme.key);
    gl.uniform3fv(u.uRimCol, theme.rim);
    gl.uniform3fv(u.uKeyDir, toWorld(c, KEY_DIR));
    gl.uniform3fv(u.uRimDir, toWorld(c, RIM_DIR));
    gl.uniform1f(u.uExposure, theme.exposure);

    // Opaques, sans élimination des faces : l'export contient quelques triangles d'orientation inversée.
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.uniform1f(u.uCapOn, clipOn ? 1 : 0);
    for (const p of opaque) if (visible(p)) drawPart(gpu.shade, p, partUniforms);

    // Translucides : faces arrière puis avant, sans écriture de profondeur.
    gl.uniform1f(u.uCapOn, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.enable(gl.CULL_FACE);
    for (const p of clear) {
      if (!visible(p)) continue;
      gl.cullFace(gl.FRONT);
      drawPart(gpu.shade, p, partUniforms);
      gl.cullFace(gl.BACK);
      drawPart(gpu.shade, p, partUniforms);
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(null);
  }

  // --- Sélection : un pixel du tampon d'identifiants, rendu à la demande ---
  // Un seul pixel : la projection est recadrée pour que le pixel visé remplisse ce tampon.
  function ensurePickFbo() {
    if (pickFbo) return;
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const rbs = [[gl.RGBA8, gl.COLOR_ATTACHMENT0], [gl.DEPTH_COMPONENT24, gl.DEPTH_ATTACHMENT]].map(([fmt, att]) => {
      const rb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, fmt, 1, 1);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, att, gl.RENDERBUFFER, rb);
      return rb;
    });
    pickFbo = { fb, rbs };
  }

  function pickAt(x, y) {
    if (lost || !gpu || !canvas.clientWidth) return null;
    ensurePickFbo();
    const px = Math.floor((x * canvas.width) / canvas.clientWidth);
    const py = canvas.height - 1 - Math.floor((y * canvas.height) / canvas.clientHeight);
    if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return null;
    const prog = gpu.pick, c = camera(), W = canvas.width, H = canvas.height;
    const P = new Float32Array([W, 0, 0, 0, 0, H, 0, 0, 0, 0, 1, 0, W - 2 * px - 1, H - 2 * py - 1, 0, 1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pickFbo.fb);
    gl.viewport(0, 0, 1, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog.p);
    gl.uniformMatrix4fv(prog.u.uViewProj, false, mul(P, c.vp));
    gl.uniform4fv(prog.u.uClip, clip);
    const id = (p) => gl.uniform3f(prog.u.uId, (p.id & 255) / 255, ((p.id >> 8) & 255) / 255, ((p.id >> 16) & 255) / 255);
    // Sonde d'abord, sans test de profondeur : une pièce opaque gagne partout où elle est visible.
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    for (const p of clear) if (visible(p)) drawPart(prog, p, id);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    for (const p of opaque) if (visible(p)) drawPart(prog, p, id);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    const n = pixel[0] + pixel[1] * 256 + pixel[2] * 65536;
    return n ? parts[n - 1].key : null;
  }

  function setHover(key) {
    if (key === hovered) return;
    hovered = key;
    hoverCb?.(key);
    requestRender();
  }

  // --- Taille ---
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      draw(); // tout de suite : redimensionner efface le canvas
    }
    requestRender();
  }

  // --- Gestes ---
  const ac = new AbortController(), on = (t, type, fn, o = {}) => t.addEventListener(type, fn, { ...o, signal: ac.signal });
  const pointers = new Map();
  let gesture = null, lastTap = { t: 0, x: 0, y: 0 }, hoverTimer = 0, hoverPos = null, hoverDone = null;
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pinch = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  };

  on(canvas, 'pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, local(e));
    grab();
    if (pointers.size === 1) {
      const p = local(e);
      gesture = { mode: e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'rotate', moved: 0, start: p, vel: [0, 0], t: e.timeStamp };
    } else if (pointers.size === 2) {
      gesture = { mode: 'pinch', moved: 99, last: pinch(), vel: [0, 0], t: e.timeStamp };
    }
    setHover(null);
  });

  on(canvas, 'pointermove', (e) => {
    const p = local(e);
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        hoverPos = p;
        hoverTimer ||= setTimeout(() => {
          hoverTimer = 0;
          if (!gesture && hoverPos && (hoverPos.x !== hoverDone?.x || hoverPos.y !== hoverDone?.y)) {
            hoverDone = hoverPos;
            setHover(pickAt(hoverPos.x, hoverPos.y));
          }
        }, 50);
      }
      return;
    }
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, p);
    if (!gesture) return;
    if (gesture.mode === 'pinch') {
      if (pointers.size < 2) return;
      const n = pinch();
      pan(n.x - gesture.last.x, n.y - gesture.last.y);
      if (n.d > 0 && gesture.last.d > 0) zoom(gesture.last.d / n.d, n.x, n.y);
      gesture.last = n;
      snap(0, 6);
    } else {
      const dx = p.x - prev.x, dy = p.y - prev.y;
      gesture.moved += Math.abs(dx) + Math.abs(dy);
      if (gesture.mode === 'pan') pan(dx, dy);
      else {
        G[3] -= dx * ROTATE;
        G[4] = clampPitch(G[4] + dy * ROTATE);
        const dt = Math.max((e.timeStamp - gesture.t) / 1000, 1e-3);
        gesture.vel = [0.7 * gesture.vel[0] + 0.3 * ((-dx * ROTATE) / dt), 0.7 * gesture.vel[1] + 0.3 * ((dy * ROTATE) / dt)];
      }
      gesture.t = e.timeStamp;
      snap(0, 6);
    }
    requestRender();
  });

  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    const g = gesture;
    if (pointers.size === 1 && g?.mode === 'pinch') {
      // Il reste un doigt : il reprend la rotation sans déclencher de clic.
      gesture = { mode: 'rotate', moved: 99, vel: [0, 0], t: e.timeStamp };
      return;
    }
    if (pointers.size) return;
    gesture = null;
    if (!g) return;
    if (e.type === 'pointerup' && g.mode === 'rotate' && g.moved < 5 && g.start) {
      const { x, y } = g.start, key = pickAt(x, y);
      const double = e.timeStamp - lastTap.t < 320 && Math.hypot(x - lastTap.x, y - lastTap.y) < 24;
      lastTap = double ? { t: 0, x: 0, y: 0 } : { t: e.timeStamp, x, y };
      selected = key;
      pickCb?.(key);
      if (double) key ? fit([key], 2.6) : fit();
      requestRender();
    } else if (g.mode === 'rotate' && !reduced && e.timeStamp - g.t < 80 && Math.hypot(...g.vel) > 0.2) {
      fling = g.vel;
      requestRender();
    }
  };
  on(canvas, 'pointerup', release);
  on(canvas, 'pointercancel', release);
  on(canvas, 'pointerleave', (e) => {
    if (e.pointerType === 'mouse' && !pointers.size) {
      hoverPos = null;
      setHover(null);
    }
  });
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(canvas, 'wheel', (e) => {
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    const p = local(e);
    fling = null;
    zoom(Math.exp(dy * 0.0015), p.x, p.y);
    settle();
  }, { passive: false });

  on(canvas, 'keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = Math.max(canvas.clientHeight, 1) * 0.1;
    const moves = {
      ArrowLeft: () => (e.shiftKey ? pan(-step, 0) : (G[3] += DEG15)),
      ArrowRight: () => (e.shiftKey ? pan(step, 0) : (G[3] -= DEG15)),
      ArrowUp: () => (e.shiftKey ? pan(0, -step) : (G[4] = clampPitch(G[4] - DEG15))),
      ArrowDown: () => (e.shiftKey ? pan(0, step) : (G[4] = clampPitch(G[4] + DEG15))),
      '+': () => zoom(0.8),
      '=': () => zoom(0.8),
      '-': () => zoom(1.25),
      f: () => fit(),
      F: () => fit(),
      Escape: () => {
        selected = null;
        pickCb?.(null);
      },
    };
    const fn = moves[e.key];
    if (!fn) return;
    e.preventDefault();
    fling = null;
    fn();
    settle();
  });

  on(canvas, 'webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    gpu = pickFbo = null;
  });
  on(canvas, 'webglcontextrestored', () => {
    lost = false;
    init();
    requestRender();
  });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  try {
    init();
    resize();
    setView('iso');
    snap(0, S.length);
  } catch (e) {
    ac.abort();
    ro.disconnect();
    freeGpu();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw e;
  }

  return {
    setTheme(dark) {
      theme = dark ? THEMES.dark : THEMES.light;
      requestRender();
    },
    setReducedMotion(r) {
      reduced = !!r;
      if (reduced) fling = null;
      settle();
    },
    setView,
    fit,
    frame: (key) => fit([key], 2.6), // la piece au centre, l'assemblage autour
    setExplode(pct) {
      G[6] = Math.max(0, Math.min(100, pct)) / 100;
      settle();
    },
    setSection({ axis = null, pos = 0.5, flip = false } = {}) {
      const k = 'xyz'.indexOf(axis);
      clipOn = k >= 0;
      if (!clipOn) clip = [0, 0, 0, 1];
      else {
        const n = [0, 0, 0];
        n[k] = flip ? -1 : 1;
        clip = [...n, n[k] * (whole.min[k] + pos * (whole.max[k] - whole.min[k]))];
      }
      requestRender();
    },
    setHidden(keys) {
      hidden.clear();
      keys.forEach((k) => hidden.add(k));
      requestRender();
    },
    isolate(keys) {
      isolated = keys ? new Set(keys) : null;
      requestRender();
    },
    select(key) {
      selected = key;
      requestRender();
    },
    hover: setHover,
    reset() {
      hidden.clear();
      isolated = null;
      selected = null;
      clip = [0, 0, 0, 1];
      clipOn = false;
      G[6] = 0;
      fling = null;
      setView('iso');
    },
    resize,
    destroy() {
      ac.abort();
      ro.disconnect();
      clearTimeout(hoverTimer);
      cancelAnimationFrame(raf);
      raf = 0;
      freeGpu();
    },
    onPick(cb) {
      pickCb = cb;
    },
    onHover(cb) {
      hoverCb = cb;
    },
  };
}
