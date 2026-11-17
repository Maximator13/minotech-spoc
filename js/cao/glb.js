// Lecture d'un fichier GLB (glTF 2.0 binaire) limité au contrat de spoc.glb :
// un maillage par nœud, une primitive triangles, POSITION + NORMAL float, index uint16/uint32,
// nœuds sans transformation, aucune extension requise. Tout écart lève une erreur explicite.
// Aucun accès au DOM : testable sous Node.

const MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;
const COMPONENTS = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array };
const SIZES = { SCALAR: 1, VEC3: 3 };
const DEFAULT_MATERIAL = { name: '', color: [0.8, 0.82, 0.86, 1], metallic: 0, roughness: 0.6, blend: false };

function readAccessor(gltf, buffer, bin, index, expected) {
  const acc = gltf.accessors?.[index];
  if (!acc) throw new Error(`Accesseur ${index} absent.`);
  const Type = COMPONENTS[acc.componentType];
  if (!expected.includes(acc.componentType) || acc.type !== (expected[0] === 5126 ? 'VEC3' : 'SCALAR') || acc.sparse) {
    throw new Error(`Accesseur ${index} non géré : ${acc.type} de type ${acc.componentType}.`);
  }
  const view = gltf.bufferViews?.[acc.bufferView];
  if (!view || (view.buffer ?? 0) !== 0 || !bin) throw new Error(`Accesseur ${index} : données binaires absentes.`);
  const n = SIZES[acc.type], elem = n * Type.BYTES_PER_ELEMENT, stride = view.byteStride || elem;
  const start = bin.offset + (view.byteOffset || 0) + (acc.byteOffset || 0);
  if (acc.count > 0 && start + stride * (acc.count - 1) + elem > bin.offset + bin.length) {
    throw new Error(`Accesseur ${index} : dépasse le bloc binaire.`);
  }
  if (stride === elem) {
    // Float32Array exige un décalage multiple de 4 : sinon copie.
    return start % Type.BYTES_PER_ELEMENT === 0
      ? new Type(buffer, start, acc.count * n)
      : new Type(buffer.slice(start, start + acc.count * elem));
  }
  const out = new Type(acc.count * n), dst = new Uint8Array(out.buffer), src = new Uint8Array(buffer);
  for (let i = 0; i < acc.count; i++) dst.set(src.subarray(start + i * stride, start + i * stride + elem), i * elem);
  return out;
}

function readMaterial(gltf, index) {
  const m = gltf.materials?.[index];
  if (!m) return { ...DEFAULT_MATERIAL, color: [...DEFAULT_MATERIAL.color] };
  const pbr = m.pbrMetallicRoughness || {};
  return {
    name: m.name || '',
    color: [...(pbr.baseColorFactor || [1, 1, 1, 1])],
    metallic: pbr.metallicFactor ?? 1, // valeurs par défaut de la norme glTF
    roughness: pbr.roughnessFactor ?? 1,
    blend: m.alphaMode === 'BLEND',
  };
}

function bounds(p) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      if (p[i + k] < min[k]) min[k] = p[i + k];
      if (p[i + k] > max[k]) max[k] = p[i + k];
    }
  }
  return { min, max };
}

export function parseGLB(buffer) {
  const size = buffer.byteLength;
  const dv = new DataView(buffer);
  if (size < 20 || dv.getUint32(0, true) !== MAGIC) throw new Error('Fichier GLB invalide : signature absente.');
  if (dv.getUint32(4, true) !== 2) throw new Error('Fichier GLB : seule la version 2 est gérée.');
  if (dv.getUint32(8, true) !== size) throw new Error('Fichier GLB incomplet : longueur annoncée différente.');
  const jsonLength = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== JSON_CHUNK || 20 + jsonLength > size) throw new Error('Fichier GLB : bloc JSON absent ou tronqué.');
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));

  let bin = null;
  const o = 20 + jsonLength;
  if (o + 8 <= size) {
    const length = dv.getUint32(o, true);
    if (dv.getUint32(o + 4, true) !== BIN_CHUNK || o + 8 + length > size) throw new Error('Fichier GLB : bloc binaire tronqué.');
    bin = { offset: o + 8, length };
  }
  if (gltf.extensionsRequired?.length) throw new Error(`Fichier GLB : extensions requises non gérées (${gltf.extensionsRequired.join(', ')}).`);

  const scene = gltf.scenes?.[gltf.scene ?? 0];
  if (!scene) throw new Error('Fichier GLB : aucune scène.');
  const nodes = scene.nodes.map((ni) => {
    const node = gltf.nodes[ni];
    const name = node.name || `noeud-${ni}`;
    if (node.matrix || node.translation || node.rotation || node.scale) {
      throw new Error(`Nœud « ${name} » : transformation non gérée (géométrie attendue en coordonnées du monde).`);
    }
    const prims = gltf.meshes?.[node.mesh]?.primitives;
    if (!prims || prims.length !== 1) throw new Error(`Nœud « ${name} » : une seule primitive attendue.`);
    const prim = prims[0];
    if ((prim.mode ?? 4) !== 4) throw new Error(`Nœud « ${name} » : seuls les triangles sont gérés.`);
    const positions = readAccessor(gltf, buffer, bin, prim.attributes.POSITION, [5126]);
    const normals = readAccessor(gltf, buffer, bin, prim.attributes.NORMAL, [5126]);
    const indices = readAccessor(gltf, buffer, bin, prim.indices, [5123, 5125]);
    return { name, positions, normals, indices, ...bounds(positions), material: readMaterial(gltf, prim.material) };
  });
  return { nodes };
}
