// The landing page's 3D litter bin, built from primitives (no model file to download).
// It is a soft clay render in the Daylight palette: porcelain body, sun-yellow lid propped open
// by an overflowing bag, charcoal handles, and the Bin-It hex mark as a raised decal. Loaded
// lazily by BinBackdrop so three.js stays out of the initial bundle.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const COLOR = {
  body: "#ECE6D3",
  lid: "#F6C944",
  charcoal: "#3B3A36",
  bagLight: "#F8F4E8",
  coral: "#FF6363",
};

// Body profile: radius at height y (a gentle taper with three shallow ribs).
const BODY_H = 1.7;
const bodyRadius = (y: number) => {
  const taper = 0.6 + 0.13 * (y / BODY_H);
  const rib = [0.45, 0.85, 1.25].reduce((s, c) => s + 0.016 * Math.exp(-(((y - c) / 0.035) ** 2)), 0);
  return taper + rib;
};

function rng(seed: number) {
  // mulberry32: a tiny seeded generator so the crumpled shapes are the same on every load
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bodyGeometry() {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  // rounded foot
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(0.52 + 0.075 * Math.sin(a), 0.07 - 0.07 * Math.cos(a)));
  }
  for (let y = 0.08; y <= BODY_H; y += 0.02) pts.push(new THREE.Vector2(bodyRadius(y), y));
  // rolled rim, then the inner wall
  const r = bodyRadius(BODY_H);
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    pts.push(new THREE.Vector2(r + 0.03 * Math.sin(a), BODY_H + 0.04 - 0.04 * Math.cos(a)));
  }
  pts.push(new THREE.Vector2(r - 0.04, BODY_H + 0.0), new THREE.Vector2(r - 0.045, 1.35));
  return new THREE.LatheGeometry(pts, 128);
}

function lidGeometry(radius: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0.34)];
  for (let i = 1; i <= 28; i++) {
    const r = (i / 28) * radius;
    pts.push(new THREE.Vector2(r, 0.07 + 0.27 * Math.sqrt(Math.max(0, 1 - (r / radius) ** 2))));
  }
  // lip: a small downward fold
  pts.push(new THREE.Vector2(radius + 0.025, 0.05), new THREE.Vector2(radius + 0.03, 0.0), new THREE.Vector2(radius - 0.03, 0.0));
  return new THREE.LatheGeometry(pts, 96);
}

function lumpy(radius: number, seed: number, wobble: number) {
  const rand = rng(seed);
  const p = [rand() * 6, rand() * 6, rand() * 6];
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(radius, 56, 40);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.clone().normalize();
    const n =
      0.5 * Math.sin(4.1 * d.x + p[0]) * Math.sin(3.7 * d.y + p[1]) +
      0.3 * Math.sin(8.3 * d.z + 3.1 * d.x + p[2]) +
      0.2 * Math.sin(13 * d.y + 7 * d.z + p[0]);
    v.copy(d).multiplyScalar(radius * (1 + wobble * n));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function crumpled(radius: number, seed: number) {
  const rand = rng(seed);
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  // non-indexed: jitter by position so shared corners move together
  const moved = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!moved.has(key)) moved.set(key, 0.82 + rand() * 0.36);
    const k = moved.get(key)!;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export type BinScene = {
  /** Draw one frame with the bin turned to `angle` radians. */
  render: (angle: number) => void;
  /** Re-measure the canvas (call on resize). */
  resize: () => void;
  dispose: () => void;
};

export function createBinScene(canvas: HTMLCanvasElement): BinScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 2.9, 7.4);
  camera.lookAt(0, 0.95, 0);

  const key = new THREE.DirectionalLight("#FFF1D0", 1.7);
  key.position.set(-3.2, 5.6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
  scene.add(key);

  const rim = new THREE.DirectionalLight("#FFE59A", 0.9);
  rim.position.set(4, 2.4, -4);
  scene.add(rim);

  const mat = {
    body: new THREE.MeshStandardMaterial({ color: COLOR.body, roughness: 0.62, side: THREE.DoubleSide }),
    lid: new THREE.MeshStandardMaterial({ color: COLOR.lid, roughness: 0.48, side: THREE.DoubleSide }),
    charcoal: new THREE.MeshStandardMaterial({ color: COLOR.charcoal, roughness: 0.5 }),
    bagLight: new THREE.MeshStandardMaterial({ color: COLOR.bagLight, roughness: 0.5 }),
    bagDark: new THREE.MeshStandardMaterial({ color: COLOR.charcoal, roughness: 0.32 }),
    coral: new THREE.MeshStandardMaterial({ color: COLOR.coral, roughness: 0.45 }),
    paper: new THREE.MeshStandardMaterial({ color: COLOR.bagLight, roughness: 0.9, flatShading: true }),
    inside: new THREE.MeshStandardMaterial({ color: "#2A2926", roughness: 0.9 }),
  };
  const geos: THREE.BufferGeometry[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadows = true) => {
    const o = new THREE.Mesh(track(g), m);
    o.castShadow = shadows;
    o.receiveShadow = shadows;
    return o;
  };

  // The spinning part: everything that turns with the scroll.
  const spin = new THREE.Group();
  const root = new THREE.Group();
  root.add(spin);
  scene.add(root);

  spin.add(mesh(bodyGeometry(), mat.body));
  const floor = mesh(new THREE.CircleGeometry(0.7, 48), mat.inside, false);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 1.4;
  spin.add(floor);

  // foot ring and two side handles
  const foot = mesh(new THREE.TorusGeometry(0.585, 0.028, 14, 96), mat.charcoal);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.07;
  spin.add(foot);
  for (const side of [1, -1]) {
    const handle = mesh(new THREE.TorusGeometry(0.17, 0.03, 14, 32, Math.PI), mat.charcoal);
    handle.rotation.z = (-side * Math.PI) / 2;
    handle.position.set(side * (bodyRadius(1.3) + 0.012), 1.3, 0);
    spin.add(handle);
  }

  // The Bin-It mark as a raised decal on the front: six charcoal dots round a coral one.
  const decalY = 0.98;
  const unit = 0.0105;
  const dotGeo = track(new THREE.SphereGeometry(1, 24, 16));
  const decal = (cx: number, cy: number, r: number, m: THREE.Material) => {
    const dx = (cx - 15) * unit;
    const dy = (15 - cy) * unit;
    const y = decalY + dy;
    const R = bodyRadius(y);
    const theta = Math.asin(dx / R);
    const d = new THREE.Mesh(dotGeo, m);
    d.scale.set(r * unit, r * unit, r * unit * 0.45);
    d.position.set(R * Math.sin(theta), y, R * Math.cos(theta));
    d.rotation.y = theta;
    d.castShadow = true;
    spin.add(d);
  };
  [
    [24.5, 15],
    [19.75, 6.8],
    [10.25, 6.8],
    [5.5, 15],
    [10.25, 23.2],
    [19.75, 23.2],
  ].forEach(([cx, cy]) => decal(cx, cy, 3, mat.charcoal));
  decal(15, 15, 3.8, mat.coral);

  // Overflow: one dark bag heaped above the rim, one pale bag beside it, a tie on the dark one.
  const bag = mesh(lumpy(0.52, 11, 0.07), mat.bagDark);
  bag.scale.set(1, 0.86, 0.96);
  bag.position.set(0.06, 1.86, 0.02);
  spin.add(bag);
  const tie = mesh(new THREE.ConeGeometry(0.08, 0.28, 18), mat.bagDark);
  tie.position.set(0.1, 2.34, 0.0);
  tie.rotation.z = -0.28;
  spin.add(tie);
  const pale = mesh(lumpy(0.34, 5, 0.09), mat.bagLight);
  pale.scale.set(1.05, 0.8, 1);
  pale.position.set(-0.33, 1.74, 0.24);
  spin.add(pale);

  // The lid hinges on the left edge and rests tilted on the bag.
  const hinge = new THREE.Group();
  const lidR = bodyRadius(BODY_H) + 0.07;
  hinge.position.set(-lidR, BODY_H + 0.08, 0);
  hinge.rotation.z = 0.46;
  const lid = mesh(lidGeometry(lidR), mat.lid);
  lid.position.x = lidR;
  hinge.add(lid);
  const knob = mesh(new THREE.SphereGeometry(0.1, 24, 16), mat.charcoal);
  knob.scale.set(1, 0.7, 1);
  knob.position.set(lidR, 0.36, 0);
  hinge.add(knob);
  spin.add(hinge);

  // Crumpled paper on the ground, turning with the bin.
  [
    [0.98, 0.1, 0.42, 0.11, 21, "paper"],
    [1.12, 0.085, -0.16, 0.09, 22, "paper"],
    [-0.95, 0.09, 0.66, 0.1, 23, "paper"],
    [-1.12, 0.075, -0.3, 0.08, 24, "bagDark"],
    [0.55, 0.07, 1.0, 0.075, 25, "paper"],
  ].forEach(([x, y, z, r, seed, m]) => {
    const ball = mesh(crumpled(r as number, seed as number), m === "paper" ? mat.paper : mat.bagDark);
    ball.position.set(x as number, y as number, z as number);
    spin.add(ball);
  });

  // Soft ground shadow that stays put while the bin turns.
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(14, 14)), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  const blobCanvas = document.createElement("canvas");
  blobCanvas.width = blobCanvas.height = 128;
  const bctx = blobCanvas.getContext("2d")!;
  const grad = bctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, "rgba(70,55,10,0.38)");
  grad.addColorStop(1, "rgba(70,55,10,0)");
  bctx.fillStyle = grad;
  bctx.fillRect(0, 0, 128, 128);
  const blobTex = new THREE.CanvasTexture(blobCanvas);
  blobTex.colorSpace = THREE.SRGBColorSpace;
  const blob = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.6, 3.6)),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.004;
  root.add(blob);

  let width = 0;
  let height = 0;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Landscape: a big bin to the right of the centered copy. Portrait: small, in the bottom
    // corner, so it never sits behind the paragraphs.
    const landscape = camera.aspect >= 1.2;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
    root.scale.setScalar(landscape ? 0.8 : 0.42);
    root.position.set(half * camera.aspect * (landscape ? 0.66 : 0.5), landscape ? -0.35 : -1.5, 0);
    camera.updateProjectionMatrix();
  };

  const render = (angle: number) => {
    resize();
    spin.rotation.y = angle;
    renderer.render(scene, camera);
  };

  const dispose = () => {
    geos.forEach((g) => g.dispose());
    Object.values(mat).forEach((m) => m.dispose());
    (ground.material as THREE.Material).dispose();
    (blob.material as THREE.Material).dispose();
    blobTex.dispose();
    envMap.dispose();
    envScene.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return { render, resize, dispose };
}
