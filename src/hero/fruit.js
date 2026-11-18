// Lightweight procedural fruit: shared geometries + materials, rendered with InstancedMesh.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const rand = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvasTexture(size, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

function paintVertices(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = fn(v, i);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// ───────────────────────── geometries ─────────────────────────
function mangoGeometry() {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.set(v.x * 0.74, v.y * 1.08, v.z * 0.66);
    v.x += 0.2 * (v.y * v.y) - 0.1;           // kidney curve
    if (v.y < -0.6) v.x += (v.y + 0.6) * -0.35; // little beak
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const r = rand(7);
  paintVertices(g, (v) => {
    const t = THREE.MathUtils.clamp((v.y + 1.1) / 2.2, 0, 1);
    const base = t > 0.62 ? lerpColor('#F0532A', '#8DB32B', (t - 0.62) / 0.38)
      : lerpColor('#FFB21E', '#F0532A', Math.pow(t / 0.62, 1.6));
    return base.offsetHSL(0, 0, (r() - 0.5) * 0.04 + (v.z > 0 ? 0.03 : -0.03));
  });
  return g;
}

function mangoCheekGeometry() {
  const g = new THREE.SphereGeometry(1, 40, 28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) * 0.82, y = p.getY(i) * 1.15, z = p.getZ(i) * 0.42;
    if (z > 0) z *= 0.18; // flat cut face
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  paintVertices(g, (v) => {
    if (v.z > -0.02) {
      const d = Math.min(1, Math.hypot(v.x / 0.82, v.y / 1.15));
      return d > 0.93 ? new THREE.Color('#E8661F') : lerpColor('#FFD24A', '#FFA412', d);
    }
    return lerpColor('#F2652A', '#9BBF2E', THREE.MathUtils.clamp((v.y + 1) / 2, 0, 1));
  });
  return g;
}

function leafGeometry(w = 0.42, l = 1.4) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(w, l * 0.25, w * 0.9, l * 0.75, 0, l);
  s.bezierCurveTo(-w * 0.9, l * 0.75, -w, l * 0.25, 0, 0);
  const g = new THREE.ShapeGeometry(s, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, 0.55 * x * x + 0.08 * Math.sin(y * 3));
  }
  g.translate(0, -l / 2, 0);
  g.computeVertexNormals();
  paintVertices(g, (v) => lerpColor('#2E8B3A', '#7CC24A', Math.abs(v.x) / w + (v.y + l / 2) / l * 0.3));
  return g;
}

function cranberryGeometry() {
  const g = new THREE.SphereGeometry(1, 32, 24);
  g.scale(1, 0.9, 1);
  const r = rand(11);
  paintVertices(g, (v) => {
    const top = THREE.MathUtils.clamp(v.y, 0, 1);
    return lerpColor('#8E0A1E', '#E0384F', top * 0.5 + r() * 0.08).offsetHSL(0, 0, (r() - 0.5) * 0.03);
  });
  return g;
}

function sliceGeometry() {
  // thin disc; groups: 0 = side (rind), 1 = top face, 2 = bottom face
  return new THREE.CylinderGeometry(1, 1, 0.16, 64, 1);
}

// ───────────────────────── textures ─────────────────────────
function orangeFaceTexture() {
  return canvasTexture(512, (ctx, s) => {
    const c = s / 2;
    ctx.fillStyle = '#F57C00'; ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE3B0'; ctx.beginPath(); ctx.arc(c, c, c * 0.92, 0, Math.PI * 2); ctx.fill();
    const n = 11, r = rand(5);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + 0.035, a1 = ((i + 1) / n) * Math.PI * 2 - 0.035;
      const g = ctx.createRadialGradient(c, c, c * 0.08, c, c, c * 0.85);
      g.addColorStop(0, '#FFB02E'); g.addColorStop(1, '#FF7A00');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(c + Math.cos((a0 + a1) / 2) * c * 0.1, c + Math.sin((a0 + a1) / 2) * c * 0.1);
      ctx.arc(c, c, c * 0.84, a0, a1); ctx.closePath(); ctx.fill();
      // juice vesicles
      for (let k = 0; k < 60; k++) {
        const a = a0 + r() * (a1 - a0), d = c * (0.15 + r() * 0.66);
        ctx.fillStyle = `rgba(255,${190 + r() * 40},${60 + r() * 60},${0.2 + r() * 0.3})`;
        ctx.beginPath(); ctx.ellipse(c + Math.cos(a) * d, c + Math.sin(a) * d, 3 + r() * 5, 1.5 + r() * 2, a, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#FFF4DA'; ctx.beginPath(); ctx.arc(c, c, c * 0.07, 0, Math.PI * 2); ctx.fill();
  });
}

function peelBump(seed = 3) {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, s, s);
    const r = rand(seed);
    for (let i = 0; i < 2600; i++) {
      const v = 90 + r() * 80 | 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath(); ctx.arc(r() * s, r() * s, 0.8 + r() * 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }, { srgb: false, repeat: 3 });
}

// ───────────────────────── catalogue ─────────────────────────
export function createFruitKinds() {
  const juicy = (opts) => new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, ...opts });
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  const sideRind = new THREE.MeshStandardMaterial({ color: '#F26A00', roughness: 0.55 });
  const faceMat = juicy({ map: orangeFaceTexture(), roughness: 0.3, clearcoat: 0.8 });

  return {
    mango: { geo: mangoGeometry(), mat: juicy({ vertexColors: true, roughness: 0.42, clearcoat: 0.35 }) },
    mangoCheek: { geo: mangoCheekGeometry(), mat: juicy({ vertexColors: true, roughness: 0.3, clearcoat: 0.9 }) },
    mangoCube: { geo: new RoundedBoxGeometry(1, 1, 1, 3, 0.16), mat: juicy({ color: '#FFB31A', roughness: 0.25, clearcoat: 1, sheen: 0.4, sheenColor: new THREE.Color('#FFE38A') }) },
    leaf: { geo: leafGeometry(), mat: leafMat },
    leafSmall: { geo: leafGeometry(0.5, 1), mat: leafMat },
    cranberry: { geo: cranberryGeometry(), mat: juicy({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }) },
    orange: { geo: new THREE.SphereGeometry(1, 48, 32), mat: new THREE.MeshPhysicalMaterial({ color: '#FF7300', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, bumpMap: peelBump(), bumpScale: 2 }) },
    orangeSlice: { geo: sliceGeometry(), mat: [sideRind, faceMat, faceMat] },
  };
}

// Anchor layouts (world units, camera at z=10). `kind`, size, and a per-item seed.
// Desktop keeps the left third mostly clear for typography.
const DESKTOP_ANCHORS = [
  // back layer (z≈-3.5) — corners and edges, clear of the logo and headline
  [-3.0, 2.75, -3.5, 0.62], [3.6, 2.85, -3.5, 0.8], [4.0, -2.55, -3.5, 0.75], [-0.9, -3.1, -3.5, 0.62], [2.4, 3.0, -4.0, 0.45], [-3.6, -2.95, -3.5, 0.55],
  // mid layer, hugging the can
  [1.95, 1.45, 0.2, 0.5], [-0.85, 1.55, 0.5, 0.38], [1.85, -1.3, 0.8, 0.44], [-0.95, -1.65, 0.4, 0.4], [1.0, 2.25, -0.6, 0.34],
  // front layer — a few close, out-of-reach pieces for depth
  [2.5, -1.45, 3.0, 0.42], [-1.0, -1.6, 2.6, 0.3], [2.05, 0.95, 3.4, 0.26],
];
// Mobile: copy sits on top, the can floats in the lower half — fruit stays around the can.
const MOBILE_ANCHORS = [
  [-1.8, -0.5, -3.0, 0.55], [1.9, -0.3, -3.0, 0.58], [1.85, -2.45, -3.0, 0.45], [-1.9, -2.3, -3.0, 0.42],
  [1.15, -0.45, 0.6, 0.34], [-1.15, -1.0, 0.4, 0.32], [1.2, -2.1, 0.8, 0.32],
  [-1.0, -1.85, 2.2, 0.2], [1.05, -1.1, 2.4, 0.2],
];

const RECIPES = {
  mango: ['mango', 'mangoCube', 'mangoCheek', 'mango', 'mangoCube', 'leaf', 'mangoCube', 'mangoCheek', 'mangoCube', 'mangoCube', 'leaf', 'mango', 'mangoCube', 'mangoCube'],
  cranberry: ['cranberry', 'cranberry', 'leafSmall', 'cranberry', 'cranberry', 'cranberry', 'cranberry', 'leafSmall', 'cranberry', 'cranberry', 'cranberry', 'cranberry', 'cranberry', 'leafSmall'],
  orange: ['orange', 'orangeSlice', 'orange', 'orangeSlice', 'leaf', 'orange', 'orangeSlice', 'orangeSlice', 'orangeSlice', 'orangeSlice', 'leaf', 'orange', 'orangeSlice', 'orangeSlice'],
};
// size multiplier per kind so the anchor "size" reads naturally
const KIND_SCALE = { mango: 0.9, mangoCube: 0.6, mangoCheek: 0.85, leaf: 0.95, leafSmall: 0.7, cranberry: 0.42, orange: 0.95, orangeSlice: 1.05 };

export function buildLayout(flavorKey, mobile) {
  const anchors = mobile ? MOBILE_ANCHORS : DESKTOP_ANCHORS;
  const recipe = RECIPES[flavorKey];
  const r = rand(flavorKey.length * 97 + (mobile ? 13 : 0));
  return anchors.flatMap(([x, y, z, s], i) => {
    const kind = recipe[i % recipe.length];
    // cranberries come in little clusters of 1–3 berries
    const n = kind === 'cranberry' ? 1 + Math.floor(r() * 2) : 1;
    return Array.from({ length: n }, (_, k) => item(kind, x, y, z, s, k));
  });

  function item(kind, x, y, z, s, k) {
    const off = k ? 0.42 * s * 2.2 : 0;
    const a = r() * 6.28;
    return {
      kind,
      home: new THREE.Vector3(x + Math.cos(a) * off + (r() - 0.5) * 0.2, y + Math.sin(a) * off + (r() - 0.5) * 0.2, z + (r() - 0.5) * 0.4),
      scale: s * KIND_SCALE[kind] * (0.85 + r() * 0.3),
      rot: new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28),
      spin: new THREE.Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.6, (r() - 0.5) * 0.4),
      phase: r() * 6.28,
      bob: 0.08 + r() * 0.12,
      swirl: (r() > 0.5 ? 1 : -1) * (0.8 + r() * 0.8),
      tint: kind === 'cranberry' && r() > 0.8 ? '#FFC2CC' : null, // a few pale berries like the can art
    };
  }
}
