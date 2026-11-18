// One page-wide WebGL context: genuine-label can + instanced fruit + bubbles + juice pour.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FLAVORS } from '../flavors.js';
import { createFruitKinds, buildLayout } from './fruit.js';

// Shared state written by the GSAP scroll timeline, read every frame.
export const state = {
  spin: 0,          // scroll-driven Y rotation of the can (0 → π → 2π)
  dip: 0,           // 0..1 — can pulls back during a flavour change
  lift: 0,          // final hand-off: can rises a touch
  phase: { mango: 0, cranberry: -1, orange: -1 }, // -1 hidden (pre-entry) · 0 home · +1 absorbed
  drift: 0,         // final hand-off: fruit drifts outward and away
  trail: 0,         // 0 = hero composition · 1 = docked beside the page content
  pageSpin: 0,      // extra rotation while scrolling the rest of the page
  pour: 0,          // 0 → 1 at the footer: can moves centre, tips over and pours
};

// Label shown for each half-turn: 0 mango, 1 cranberry, 2 orange, 3 mango …
const SEQ = FLAVORS.map((f) => f.key);
const mod = (n, m) => ((n % m) + m) % m;
const JUICE = { mango: '#FFB21E', cranberry: '#C8102E', orange: '#FF8400' };
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

const BODY_R = 0.62;
const BODY_H = BODY_R * 2 * 2.4; // label aspect from the photos

export function createHeroScene(canvas, { mobile, reducedMotion, floorEl }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const key = new THREE.DirectionalLight('#fff6e8', 2.2);
  key.position.set(4, 5, 6);
  const rim = new THREE.DirectionalLight('#cfe3ff', 1.6);
  rim.position.set(-5, 2, -4);
  scene.add(key, rim, new THREE.HemisphereLight('#ffffff', '#33405a', 0.6));

  // ───────── the can ─────────
  const loader = new THREE.TextureLoader();
  const labels = {};
  const ready = Promise.all(FLAVORS.map((f) => new Promise((res) => {
    loader.load(f.label, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      labels[f.key] = t;
      res();
    });
  })));

  const can = new THREE.Group();
  const canSpin = new THREE.Group(); // scroll + pointer rotation lives here
  can.add(canSpin);
  scene.add(can);

  // Two half-cylinders. Each wraps one genuine front photo with u = ½ + ½·sin(θ),
  // which "unprojects" the photo's foreshortening back onto the curved surface.
  function halfBody(front) {
    const g = new THREE.CylinderGeometry(BODY_R, BODY_R, BODY_H, 72, 1, true, front ? -Math.PI / 2 : Math.PI / 2, Math.PI);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      // angle from this half's centre line (−π/2 … π/2), measured in world X/Z
      const theta = Math.atan2(p.getX(i), front ? p.getZ(i) : -p.getZ(i));
      // pure sin() exactly inverts the photo's foreshortening but smears the last
      // columns near the edges; blending in a linear term keeps the sides crisp.
      const s = 0.62 * Math.sin(theta) + 0.38 * (theta / (Math.PI / 2));
      uv.setX(i, front ? 0.5 + 0.5 * s : 0.5 - 0.5 * s);
    }
    // The photo already carries its own studio lighting, so keep the PBR contribution subtle
    // and skip tone mapping to preserve the genuine packaging colours.
    const m = new THREE.MeshPhysicalMaterial({ roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.18, toneMapped: false });
    return new THREE.Mesh(g, m);
  }
  const frontBody = halfBody(true);
  const backBody = halfBody(false);
  canSpin.add(frontBody, backBody);

  const alu = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.22 });
  const top = new THREE.LatheGeometry([
    [BODY_R, 0], [BODY_R * 0.99, 0.05], [BODY_R * 0.9, 0.15], [BODY_R * 0.88, 0.2], [BODY_R * 0.9, 0.22], [BODY_R * 0.88, 0.24], [BODY_R * 0.82, 0.235], [BODY_R * 0.8, 0.2], [0, 0.2],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 72);
  const topMesh = new THREE.Mesh(top, alu);
  topMesh.position.y = BODY_H / 2;
  const bottom = new THREE.LatheGeometry([
    [0, 0.03], [BODY_R * 0.66, 0.0], [BODY_R * 0.78, -0.05], [BODY_R * 0.92, -0.1], [BODY_R, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y)).reverse(), 72);
  const bottomMesh = new THREE.Mesh(bottom, alu);
  bottomMesh.position.y = -BODY_H / 2;
  // pull tab (simple, flat) — sits on the lid
  const tab = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 4, 12), alu);
  tab.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  tab.scale.set(1, 1, 0.25);
  tab.position.set(0, BODY_H / 2 + 0.215, 0.12);
  canSpin.add(topMesh, bottomMesh, tab);

  // soft glow behind can (camera-facing sprite)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.z = -2;
  can.add(glow);

  // ───────── fruit (instanced) ─────────
  const kinds = createFruitKinds();
  const groups = []; // { flavor, mesh, items }
  const fruitRoot = new THREE.Group();
  scene.add(fruitRoot);
  function buildFruit() {
    groups.forEach((g) => { fruitRoot.remove(g.mesh); g.mesh.dispose(); });
    groups.length = 0;
    for (const f of FLAVORS) {
      const layout = buildLayout(f.key, mobile);
      const byKind = {};
      layout.forEach((it) => (byKind[it.kind] ||= []).push(it));
      for (const [k, items] of Object.entries(byKind)) {
        const mesh = new THREE.InstancedMesh(kinds[k].geo, kinds[k].mat, items.length);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        items.forEach((it, i) => mesh.setColorAt(i, new THREE.Color(it.tint || '#ffffff')));
        fruitRoot.add(mesh);
        groups.push({ flavor: f.key, mesh, items });
      }
    }
  }
  buildFruit();

  // ───────── bubbles ─────────
  const BUBBLES = mobile ? 50 : 110;
  const bGeo = new THREE.BufferGeometry();
  const bPos = new Float32Array(BUBBLES * 3), bSeed = new Float32Array(BUBBLES);
  for (let i = 0; i < BUBBLES; i++) {
    bPos.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, -4 + Math.random() * 6], i * 3);
    bSeed[i] = Math.random();
  }
  bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  bGeo.setAttribute('seed', new THREE.BufferAttribute(bSeed, 1));
  const bMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uAlpha: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uTime; uniform float uPx; varying float vA;
      void main(){
        vec3 p = position;
        float sp = 0.25 + seed * 0.45;
        p.y = mod(p.y + 4.0 + uTime * sp, 8.0) - 4.0;
        p.x += sin(uTime * (0.6 + seed) + seed * 20.0) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (14.0 + seed * 34.0) * uPx / -mv.z;
        vA = smoothstep(-4.0, -2.5, p.y) * (1.0 - smoothstep(2.8, 4.0, p.y));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA; uniform float uAlpha;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        if (d > 0.5) discard;
        float ring = smoothstep(0.5, 0.42, d) - smoothstep(0.42, 0.28, d) * 0.75;
        float spec = smoothstep(0.14, 0.0, length(c - vec2(-0.15, -0.15)));
        gl_FragColor = vec4(vec3(1.0), (ring * 0.55 + spec * 0.8) * vA * 0.6 * uAlpha);
      }`,
  });
  const bubbles = new THREE.Points(bGeo, bMat);
  scene.add(bubbles);

  // ───────── juice pour (footer finale) ─────────
  const DROPS = mobile ? 900 : 1600;
  const dGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DROPS * 3), dVel = new Float32Array(DROPS * 3), dCol = new Float32Array(DROPS * 3);
  const dSize = new Float32Array(DROPS), dLife = new Float32Array(DROPS), dBounce = new Uint8Array(DROPS);
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage));
  dGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1).setUsage(THREE.DynamicDrawUsage));
  dGeo.setAttribute('aColor', new THREE.BufferAttribute(dCol, 3).setUsage(THREE.DynamicDrawUsage));
  const dMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 500 } },
    vertexShader: /* glsl */`
      attribute float aSize; attribute vec3 aColor; uniform float uScale; varying vec3 vColor;
      void main(){
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0; float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
        vec3 l = normalize(vec3(-0.4, 0.6, 0.7));
        float diff = 0.6 + 0.4 * max(dot(n, l), 0.0);
        float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
        float rim = smoothstep(0.55, 1.0, r2) * 0.25;
        gl_FragColor = vec4(vColor * diff + spec * 0.85 + rim, 0.94);
      }`,
  });
  const drops = new THREE.Points(dGeo, dMat);
  drops.frustumCulled = false;
  scene.add(drops);
  let emitAcc = 0, cursor = 0;
  const mouth = new THREE.Vector3(), axis = new THREE.Vector3();

  function updatePour(dt, flavorKey, halfH) {
    const emit = THREE.MathUtils.smoothstep(state.pour, 0.62, 0.86);
    // floor = top of the footer's "pour" line, converted to world Y at z = 0
    let floorY = -halfH - 2;
    if (floorEl) {
      const top = floorEl.getBoundingClientRect().top;
      floorY = (1 - (2 * top) / window.innerHeight) * halfH + 0.12; // land just above the words
    }
    if (emit > 0) {
      can.updateMatrixWorld(true);
      mouth.set(-BODY_R * 0.72, BODY_H / 2 + 0.2, 0).applyMatrix4(can.matrixWorld);
      axis.set(0, 1, 0).applyQuaternion(can.quaternion);
      const rgb = hexRGB(JUICE[flavorKey]);
      emitAcc += dt * (mobile ? 520 : 900) * emit;
      while (emitAcc >= 1) {
        emitAcc -= 1;
        const i = cursor; cursor = (cursor + 1) % DROPS;
        const j = 0.06 * can.scale.x;
        dPos.set([mouth.x + (Math.random() - 0.5) * j, mouth.y + (Math.random() - 0.5) * j, mouth.z + (Math.random() - 0.5) * j], i * 3);
        const sp = 0.75 + Math.random() * 0.12;
        dVel.set([axis.x * sp + (Math.random() - 0.5) * 0.05, axis.y * sp, (Math.random() - 0.5) * 0.05], i * 3);
        const v = 0.92 + Math.random() * 0.16;
        dCol.set([Math.min(1, rgb[0] * v), Math.min(1, rgb[1] * v), Math.min(1, rgb[2] * v)], i * 3);
        dSize[i] = (0.13 + Math.random() * 0.06) * Math.max(0.6, can.scale.x * 1.4);
        dLife[i] = 0; dBounce[i] = 0;
      }
    }
    for (let i = 0; i < DROPS; i++) {
      if (dSize[i] === 0) continue;
      const k = i * 3;
      dVel[k + 1] -= 9.0 * dt;
      dPos[k] += dVel[k] * dt; dPos[k + 1] += dVel[k + 1] * dt; dPos[k + 2] += dVel[k + 2] * dt;
      dLife[i] += dt;
      if (!dBounce[i] && dPos[k + 1] < floorY) {         // splash
        dBounce[i] = 1;
        dPos[k + 1] = floorY;
        dVel[k + 1] = Math.abs(dVel[k + 1]) * (0.12 + Math.random() * 0.22);
        dVel[k] = (Math.random() - 0.5) * 2.6;
        dVel[k + 2] = (Math.random() - 0.5) * 0.8;
        dSize[i] *= 0.55;
      } else if (dBounce[i] && dPos[k + 1] < floorY - 0.08) dSize[i] = 0;
      if (dLife[i] > 3.5 || dPos[k + 1] < -halfH - 3) dSize[i] = 0;
    }
    dGeo.attributes.position.needsUpdate = true;
    dGeo.attributes.aSize.needsUpdate = true;
    dGeo.attributes.aColor.needsUpdate = true;
  }

  // ───────── layout / resize ─────────
  const layout = { canX: 0.35, canY: 0, canScale: 1, tilt: -0.2 };
  // docked (rest of page) and pour (footer) positions, in world units at z = 0
  const dock = { railX: 0, railScale: 0.6, pourX: 0, pourY: 1.3, pourScale: 0.6, halfH: 2.68 };
  const CAN_H = BODY_H + 0.34;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the composition: narrow screens pull the camera back a little
    camera.position.z = camera.aspect < 0.8 ? 12.5 : camera.aspect < 1.2 ? 11 : 10;
    camera.updateProjectionMatrix();
    const narrow = camera.aspect < 1.2;
    const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    // mobile: copy sits on top, the can floats underneath it
    Object.assign(layout, narrow
      ? { canX: 0, canY: -0.29 * halfH, canScale: (0.33 * halfH) / CAN_H * 2, tilt: -0.14 }
      : { canX: 0.35, canY: -0.05, canScale: 1, tilt: -0.2 });
    // the CSS reserves a right-hand "can rail" on wider screens (see --rail in styles.css)
    const W = window.innerWidth;
    const gutter = Math.min(56, Math.max(16, W * 0.04));
    const rail = W >= 1100 ? Math.min(W * 0.18, 300) : W > 860 ? 170 : 0;
    dock.halfH = halfH;
    if (rail) {
      const railFrac = (gutter + rail) / W;          // share of the viewport width
      dock.railX = (1 - railFrac) * halfW;
      const byHeight = (0.84 * halfH) / CAN_H;        // ~42% of the viewport tall
      const byWidth = (railFrac * 2 * halfW * 0.55) / (BODY_R * 2 * 1.35);
      dock.railScale = Math.min(byHeight, byWidth);
    } else {                                          // phones: half-tucked behind the right edge
      dock.railX = 0.98 * halfW;
      dock.railScale = (0.46 * halfH) / CAN_H;
    }
    dock.pourX = 0.14 * halfW;   // the mouth tips left, so the stream lands near centre
    dock.pourY = (narrow ? 0.46 : 0.42) * halfH;
    dock.pourScale = ((narrow ? 0.5 : 0.62) * halfH) / CAN_H;
    dMat.uniforms.uScale.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }
  resize();

  // ───────── pointer ─────────
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !reducedMotion) window.addEventListener('pointermove', onMove, { passive: true });

  // ───────── frame ─────────
  const dummy = new THREE.Object3D();
  const center = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeIn = (t) => t * t * t;
  let time = 0;
  const clock = new THREE.Clock();

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const motion = reducedMotion ? 0 : 1;
    time += dt * motion;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);

    // labels: every half-turn brings a new genuine label round. Each face is
    // re-textured only while it points away from the camera, so swaps are never seen.
    const spinTotal = state.spin + state.pageSpin;
    const kFront = 2 * Math.round(spinTotal / (2 * Math.PI));
    const kBack = 2 * Math.round((spinTotal - Math.PI) / (2 * Math.PI)) + 1;
    const showing = SEQ[mod(Math.round(spinTotal / Math.PI), 3)];
    if (labels.mango) {
      const fm = labels[SEQ[mod(kFront, 3)]], bm = labels[SEQ[mod(kBack, 3)]];
      if (frontBody.material.map !== fm) { frontBody.material.map = fm; frontBody.material.needsUpdate = true; }
      if (backBody.material.map !== bm) { backBody.material.map = bm; backBody.material.needsUpdate = true; }
    }

    // can: hero composition → docked beside the content → centre stage for the pour
    const L = THREE.MathUtils.lerp;
    const tr = THREE.MathUtils.smootherstep(state.trail, 0, 1);
    const pe = THREE.MathUtils.smootherstep(state.pour, 0, 0.7);
    const idleSway = Math.sin(time * 0.55) * 0.12 * motion;
    const floatY = Math.sin(time * 0.9) * 0.09 * motion;
    const heroX = layout.canX + pointer.x * 0.12, heroY = layout.canY + state.lift * 0.6;
    const dockX = L(dock.railX, dock.pourX, pe), dockY = L(0, dock.pourY, pe);
    can.position.set(L(heroX, dockX, tr), L(heroY, dockY, tr) + floatY, 0);
    const heroScale = layout.canScale * (1 - state.dip * 0.14);
    can.scale.setScalar(L(heroScale, L(dock.railScale, dock.pourScale, pe), tr));
    const sway = Math.sin(state.pageSpin * 0.5) * 0.12 * tr * (1 - pe);   // gentle rocking while it travels
    can.rotation.set(
      (0.1 + pointer.y * 0.12) * (1 - pe),
      0,
      layout.tilt + Math.sin(time * 0.4) * 0.03 * motion + state.dip * 0.12 + sway + pe * 2.2, // 2.2 rad ≈ tipped to pour
    );
    canSpin.rotation.y = spinTotal + idleSway * (1 - state.dip) * (1 - pe) + pointer.x * 0.3 * (1 - tr);
    glow.material.opacity = (0.9 - state.dip * 0.4) * (1 - tr * 0.75);
    center.copy(can.position);

    // fruit
    for (const g of groups) {
      const ph = state.phase[g.flavor];
      g.mesh.visible = ph > -0.999 && ph < 0.999 && state.drift < 0.999;
      if (!g.mesh.visible) continue;
      g.items.forEach((it, i) => {
        let reach, sc, swirl;
        if (ph <= 0) { const t = 1 + ph; reach = easeOutBack(t); sc = Math.min(1, t * 1.6); swirl = (1 - t) * it.swirl; }
        else { const t = 1 - ph; reach = easeIn(t) * 0.85 + t * 0.15; sc = Math.pow(t, 0.6); swirl = (1 - t) * -it.swirl; }
        // vector from can to home, swirled around the can's axis
        tmp.copy(it.home).sub(center);
        const c = Math.cos(swirl), sn = Math.sin(swirl);
        const x = tmp.x * c - tmp.y * sn, y = tmp.x * sn + tmp.y * c;
        tmp.set(x, y, tmp.z).multiplyScalar(reach);
        // final hand-off: drift outward + up
        tmp.multiplyScalar(1 + state.drift * 0.9);
        tmp.y += state.drift * 1.2;
        const depth = (it.home.z + 5) / 9; // 0 back … 1 front
        dummy.position.set(
          center.x + tmp.x - pointer.x * depth * 0.55,
          center.y + tmp.y + Math.sin(time * 0.8 + it.phase) * it.bob + pointer.y * depth * 0.35,
          tmp.z,
        );
        dummy.rotation.set(it.rot.x + time * it.spin.x, it.rot.y + time * it.spin.y, it.rot.z + time * it.spin.z);
        dummy.scale.setScalar(Math.max(0.0001, it.scale * sc * (1 - state.drift)));
        dummy.updateMatrix();
        g.mesh.setMatrixAt(i, dummy.matrix);
      });
      g.mesh.instanceMatrix.needsUpdate = true;
    }

    bMat.uniforms.uTime.value = time;
    bMat.uniforms.uAlpha.value = 1 - state.drift;
    bubbles.visible = state.drift < 0.999;
    updatePour(reducedMotion ? Math.min(dt, 0.05) : dt, showing, dock.halfH);
    renderer.render(scene, camera);
  }

  // The stage is fixed behind the whole page; pause only when the tab is hidden.
  let running = false, visible = true, raf = 0;
  const loop = () => { frame(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!running && visible) { running = true; clock.getDelta(); loop(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', resize);

  return {
    ready, start, stop, resize,
    renderOnce: frame,
    rebuildFor(m) { if (m !== mobile) { mobile = m; buildFruit(); } },
  };
}

function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
