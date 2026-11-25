import * as THREE from 'three';
import { layoutCircuit, sampleCurve, mailboxPanel, ROAD_WIDTH } from './circuit.js';
import {
  addDynamicBox,
  addDynamicCylinder,
  addDynamicSphere,
  addStaticAabb,
  addStaticBox,
  addStaticCylinder,
} from './vehicle.js';

const PALETTE = [
  '#e07a5f', '#2a9d8f', '#6c5ce7', '#e9c46a', '#457b9d',
  '#e76f51', '#7b6cff', '#2ec4b6', '#f4a261', '#ef5d7a',
  '#90be6d', '#4ea8de',
];

/**
 * Toy island, painted road, job plazas, and knockable props.
 * Building meshes come from the CC0 kits already in the repo.
 * The road, curbs, lettering, cones, crates, balls, and pins are original.
 */
export function buildIsland(ctx) {
  const { scene, place, physics, stops, mobile, resume, addBlocker } = ctx;
  const layout = layoutCircuit(stops.length);
  const dynamics = [];
  const anisotropy = mobile ? 1 : 4;

  addSky(scene);
  addGround(scene, layout.bounds, mobile);
  addCurbs(scene, physics, layout.bounds);
  addRoad(scene, layout);
  addDecal(scene, {
    x: 0,
    z: 16.5,
    w: 14,
    h: 6.2,
    yaw: 0,
    lines: [
      { text: 'CAREER CIRCUIT', size: 92 },
      { text: 'OLDEST  →  NEWEST', size: 48 },
    ],
    anisotropy,
  });

  const zones = [];
  stops.forEach((stop, index) => {
    const spot = layout.stops[index];
    const color = PALETTE[index % PALETTE.length];
    addPlaza(scene, spot, color);
    addSign(scene, physics, stop, spot, color, anisotropy);
    addDecal(scene, {
      x: spot.road.x - spot.tangent.x * 5,
      z: spot.road.z - spot.tangent.z * 5,
      w: 8.5,
      h: 3.6,
      yaw: Math.atan2(spot.tangent.x, spot.tangent.z),
      lines: [
        { text: stop.title, size: 78 },
        { text: stop.subtitle || '', size: 40 },
      ],
      anisotropy,
    });
    addBuilding(scene, place, physics, stop, spot, addBlocker);
    addTree(scene, place, physics, spot, index);
    addMouthCones(scene, physics, dynamics, spot, index);
    zones.push({
      kind: stop.kind,
      point: spot.zone,
      radius: spot.radius,
      panel: stop.panel,
    });
  });

  const tail = layout.road[layout.road.length - 1];
  const before = layout.road[layout.road.length - 2] || tail;
  const tailYaw = Math.atan2(tail.x - before.x, tail.z - before.z);
  addDecal(scene, {
    x: tail.x,
    z: tail.z,
    w: 8,
    h: 3.2,
    yaw: tailYaw,
    lines: [{ text: 'TURN AROUND', size: 78 }],
    anisotropy,
  });

  addIntroToys(scene, physics, dynamics);
  addEndToys(scene, physics, dynamics, layout);
  zones.push(addMailbox(scene, place, physics, dynamics, resume));

  return { zones, dynamics, bounds: layout.bounds, spawn: layout.spawn };
}

function addSky(scene) {
  const geo = new THREE.SphereGeometry(480, 16, 10);
  const colors = [];
  const pos = geo.attributes.position;
  const top = new THREE.Color('#79b7ff');
  const mid = new THREE.Color('#d7ecff');
  const bot = new THREE.Color('#ffe3bf');
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) / 480;
    const col = y > 0
      ? mid.clone().lerp(top, Math.min(1, y * 1.2))
      : mid.clone().lerp(bot, Math.min(1, -y * 1.35));
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  }));
  sky.name = 'career-sky';
  sky.frustumCulled = false;
  scene.add(sky);
}

function addGround(scene, bounds, mobile) {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const sx = bounds.maxX - bounds.minX;
  const sz = bounds.maxZ - bounds.minZ;
  const yardMinZ = 4.05;
  const islandZ = bounds.maxZ - yardMinZ;
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(sx + 180, sz + 180),
    new THREE.MeshLambertMaterial({ color: '#73c6ef' }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, -0.16, cz);
  scene.add(water);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(sx + 14, sz + 14),
    new THREE.MeshLambertMaterial({ color: '#efd3a1' }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(cx, -0.04, cz);
  scene.add(sand);
  const cream = new THREE.MeshLambertMaterial({ color: '#f4e7d0' });
  const island = new THREE.Mesh(new THREE.PlaneGeometry(sx, Math.max(8, islandZ)), cream);
  island.rotation.x = -Math.PI / 2;
  island.position.set(cx, 0, yardMinZ + islandZ / 2);
  island.receiveShadow = !mobile;
  scene.add(island);
  // Yard wraps the house without paving the interior floor.
  addPatch(scene, cream, -18, 18, -16, -4.5, mobile);
  addPatch(scene, cream, -18, -4.35, -4.5, yardMinZ, mobile);
  addPatch(scene, cream, 4.35, 18, -4.5, yardMinZ, mobile);
  addPatch(scene, cream, -8, 8, 3.15, 7.4, mobile);
}

function addPatch(scene, material, minX, maxX, minZ, maxZ, mobile) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  mesh.receiveShadow = !mobile;
  scene.add(mesh);
}

function addCurbs(scene, physics, bounds) {
  const mat = new THREE.MeshLambertMaterial({ color: '#fffaf3', flatShading: true });
  const t = 0.85;
  const h = 0.5;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midZ = (bounds.minZ + bounds.maxZ) / 2;
  const sx = bounds.maxX - bounds.minX;
  const sz = bounds.maxZ - bounds.minZ;
  const strips = [
    { x: midX, z: bounds.minZ, hx: sx / 2, hz: t },
    { x: midX, z: bounds.maxZ, hx: sx / 2, hz: t },
    { x: bounds.minX, z: midZ, hx: t, hz: sz / 2 },
    { x: bounds.maxX, z: midZ, hx: t, hz: sz / 2 },
  ];
  for (const strip of strips) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(strip.hx * 2, h, strip.hz * 2), mat);
    mesh.position.set(strip.x, h / 2, strip.z);
    scene.add(mesh);
    addStaticBox(physics.world, physics.materials.ground, strip.x, h / 2, strip.z, strip.hx, h / 2, strip.hz);
  }
}

function addRoad(scene, layout) {
  const sampled = sampleCurve(layout.road, 6);
  const edge = ribbonGeometry(sampled, ROAD_WIDTH + 0.7, 0.028);
  const bed = ribbonGeometry(sampled, ROAD_WIDTH, 0.04);
  scene.add(new THREE.Mesh(edge, new THREE.MeshLambertMaterial({ color: '#e3a62e' })));
  scene.add(new THREE.Mesh(bed, new THREE.MeshLambertMaterial({ color: '#f0c84b' })));
  scene.add(new THREE.Mesh(
    dashGeometry(sampled, 0.16, 0.055),
    new THREE.MeshBasicMaterial({ color: '#fffaf2' }),
  ));
  const arrows = arrowField(sampled);
  if (arrows) scene.add(arrows);
}

function ribbonGeometry(points, width, y) {
  const positions = [];
  const indices = [];
  const half = width / 2;
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const rx = tz * half;
    const rz = -tx * half;
    const p = points[i];
    positions.push(p.x + rx, y, p.z + rz, p.x - rx, y, p.z - rz);
    if (i > 0) {
      const b = i * 2;
      indices.push(b - 2, b - 1, b, b - 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function dashGeometry(points, width, y) {
  const positions = [];
  const indices = [];
  let dist = 0;
  const dash = 1.55;
  const gap = 1.35;
  const cycle = dash + gap;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 0.001) continue;
    const steps = Math.max(1, Math.ceil(seg / 0.4));
    for (let s = 0; s < steps; s += 1) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const z0 = dist + seg * t0;
      const z1 = dist + seg * t1;
      if (Math.floor(z0 / cycle) === Math.floor((z0 + z1) / 2 / cycle) && ((z0 % cycle) < dash)) {
        const p0 = { x: a.x + (b.x - a.x) * t0, z: a.z + (b.z - a.z) * t0 };
        const p1 = { x: a.x + (b.x - a.x) * t1, z: a.z + (b.z - a.z) * t1 };
        pushQuad(positions, indices, p0, p1, width, y);
      }
    }
    dist += seg;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (indices.length) geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function pushQuad(positions, indices, a, b, width, y) {
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  const rx = tz * width;
  const rz = -tx * width;
  const base = positions.length / 3;
  positions.push(
    a.x + rx, y, a.z + rz,
    a.x - rx, y, a.z - rz,
    b.x + rx, y, b.z + rz,
    b.x - rx, y, b.z - rz,
  );
  indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
}

function arrowField(points) {
  const spots = [];
  let dist = 0;
  let next = 12;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    while (dist + seg >= next) {
      const t = (next - dist) / seg;
      const tx = b.x - a.x;
      const tz = b.z - a.z;
      spots.push({
        x: a.x + tx * t,
        z: a.z + tz * t,
        yaw: Math.atan2(tx, tz),
      });
      next += 18;
    }
    dist += seg;
  }
  if (!spots.length) return null;
  const geo = new THREE.PlaneGeometry(1.15, 1.7);
  const mesh = new THREE.InstancedMesh(
    geo,
    new THREE.MeshBasicMaterial({
      map: chevronTexture(),
      transparent: true,
      alphaTest: 0.45,
      depthWrite: false,
    }),
    spots.length,
  );
  const dummy = new THREE.Object3D();
  spots.forEach((spot, index) => {
    dummy.position.set(spot.x, 0.06, spot.z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.y = spot.yaw;
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function chevronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 160);
  ctx.fillStyle = '#2a211c';
  ctx.beginPath();
  ctx.moveTo(64, 18);
  ctx.lineTo(112, 78);
  ctx.lineTo(86, 78);
  ctx.lineTo(86, 142);
  ctx.lineTo(42, 142);
  ctx.lineTo(42, 78);
  ctx.lineTo(16, 78);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPlaza(scene, spot, color) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 28),
    new THREE.MeshLambertMaterial({ color }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(spot.plaza.x, 0.02, spot.plaza.z);
  scene.add(disc);
}

function addSign(scene, physics, stop, spot, color, anisotropy) {
  const group = new THREE.Group();
  const ink = new THREE.MeshLambertMaterial({ color: '#241c18', flatShading: true });
  const boardMat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.18), ink);
  post.position.y = 0.68;
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.35, 0.12), boardMat);
  board.position.y = 1.85;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(3.28, 1.15),
    new THREE.MeshBasicMaterial({
      map: signTexture(stop.title, stop.subtitle, anisotropy),
    }),
  );
  face.position.set(0, 1.85, 0.07);
  group.add(post, board, face);
  group.position.set(
    spot.road.x + spot.right.x * 5.4,
    0,
    spot.road.z + spot.right.z * 5.4,
  );
  group.rotation.y = Math.atan2(-spot.right.x, -spot.right.z);
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group);
  addStaticAabb(physics, box, 0.05);
}

function signTexture(title, subtitle, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff8ee';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#241c18';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleLines = wrap(ctx, title, 470, 64);
  ctx.font = `800 ${titleLines.size}px Verdana, sans-serif`;
  titleLines.rows.forEach((row, index) => {
    ctx.fillText(row, 256, 100 + (index - (titleLines.rows.length - 1) / 2) * (titleLines.size + 6));
  });
  ctx.fillStyle = '#c4491d';
  ctx.font = '700 36px Verdana, sans-serif';
  ctx.fillText(String(subtitle || '').slice(0, 42), 256, 210);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function addDecal(scene, spec) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.w, spec.h),
    new THREE.MeshBasicMaterial({
      map: groundTexture(spec.lines, spec.anisotropy || 2),
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
    }),
  );
  mesh.position.set(spec.x, 0.06, spec.z);
  mesh.rotation.order = 'YXZ';
  mesh.rotation.y = (spec.yaw || 0) + Math.PI;
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);
}

function groundTexture(lines, anisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const used = lines.filter((line) => line.text);
  const fitted = used.map((line) => {
    let size = line.size || 64;
    ctx.font = `800 ${size}px Verdana, sans-serif`;
    while (size > 28 && ctx.measureText(line.text).width > 480) {
      size -= 4;
      ctx.font = `800 ${size}px Verdana, sans-serif`;
    }
    return { text: line.text, size };
  });
  fitted.forEach((line, index) => {
    ctx.font = `800 ${line.size}px Verdana, sans-serif`;
    const y = 128 + (index - (fitted.length - 1) / 2) * (line.size + 8);
    ctx.strokeStyle = '#fffaf3';
    ctx.lineWidth = Math.max(8, line.size * 0.16);
    ctx.strokeText(line.text, 256, y);
    ctx.fillStyle = '#2a211c';
    ctx.fillText(line.text, 256, y);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

function addBuilding(scene, place, physics, stop, spot, addBlocker) {
  const group = new THREE.Group();
  for (const part of stop.parts) {
    group.add(place(part.file, {
      height: part.height,
      x: part.dx || 0,
      z: part.dz || 0,
      rotY: part.rotY ?? -Math.PI / 2,
    }));
  }
  scene.add(group);
  const measured = new THREE.Box3().setFromObject(group);
  const center = measured.getCenter(new THREE.Vector3());
  group.children.forEach((child) => {
    child.position.x -= center.x;
    child.position.y -= measured.min.y;
    child.position.z -= center.z;
  });
  group.position.set(spot.plaza.x, 0, spot.plaza.z);
  const towardRoad = { x: -spot.right.x, z: -spot.right.z };
  group.rotation.y = Math.atan2(towardRoad.z, -towardRoad.x);
  const settled = pushOffRoad(group, spot.road, spot.right);
  addStaticAabb(physics, settled, 0.15);
  addBlocker?.(settled);
}

function pushOffRoad(group, roadPoint, right) {
  const dir = new THREE.Vector3(right.x, 0, right.z);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  let box = new THREE.Box3();
  for (let n = 0; n < 6; n += 1) {
    box = new THREE.Box3().setFromObject(group);
    const cx = Math.max(box.min.x, Math.min(roadPoint.x, box.max.x));
    const cz = Math.max(box.min.z, Math.min(roadPoint.z, box.max.z));
    const dist = Math.hypot(roadPoint.x - cx, roadPoint.z - cz);
    if (dist >= 4.6) return box;
    group.position.addScaledVector(dir, 5.2 - dist);
  }
  return box;
}

function addTree(scene, place, physics, spot, index) {
  const file = index % 2 === 0 ? 'tree-large.glb' : 'tree-small.glb';
  const height = index % 2 === 0 ? 4.4 : 3.3;
  const tree = place(file, {
    height,
    x: spot.plaza.x + spot.right.x * 7 + spot.tangent.x * 5,
    z: spot.plaza.z + spot.right.z * 7 + spot.tangent.z * 5,
  });
  scene.add(tree);
  addStaticCylinder(
    physics.world,
    physics.materials.ground,
    tree.position.x,
    1,
    tree.position.z,
    0.4,
    2,
  );
}

function addMouthCones(scene, physics, dynamics, spot, index) {
  const colors = ['#ff5a36', '#ffd23f', '#2f6fed'];
    for (let n = 0; n < 1; n += 1) {
    const side = n === 0 ? 2.4 : -2.4;
    const along = -2 - (index % 3);
    const x = spot.road.x + spot.right.x * side + spot.tangent.x * along;
    const z = spot.road.z + spot.right.z * side + spot.tangent.z * along;
    track(scene, physics, dynamics, coneMesh(colors[(index + n) % colors.length]), addDynamicCylinder(
      physics.world,
      physics.materials.prop,
      { x, y: 0.32, z, radiusTop: 0.05, radiusBottom: 0.2, height: 0.55, mass: 0.55 },
    ));
  }
}

function addIntroToys(scene, physics, dynamics) {
  const ballColors = ['#ff5a7a', '#7ed0ff', '#ffe08a', '#8ef0b0', '#d7b4ff', '#ffb088'];
  const balls = [
    [1.1, 12.6], [-1.3, 14.4], [0.4, 16.2], [-0.8, 18.1], [1.5, 19.6],
  ];
  balls.forEach(([x, z], index) => {
    track(scene, physics, dynamics, sphereMesh(0.36, ballColors[index % ballColors.length]), addDynamicSphere(
      physics.world,
      physics.materials.ball,
      { x, y: 0.4, z, radius: 0.36, mass: 0.28 },
    ));
  });
  for (const side of [-1, 1]) {
    track(scene, physics, dynamics, coneMesh(side < 0 ? '#ff5a36' : '#ffd23f'), addDynamicCylinder(
      physics.world,
      physics.materials.prop,
      { x: side * 2.5, y: 0.32, z: 13.5, radiusTop: 0.05, radiusBottom: 0.2, height: 0.55, mass: 0.55 },
    ));
  }
  stackCrates(scene, physics, dynamics, -3.3, 18.5);
}

function addEndToys(scene, physics, dynamics, layout) {
  const pinStop = layout.stops[0];
  if (pinStop) {
    const originX = pinStop.road.x - pinStop.tangent.x * 8;
    const originZ = pinStop.road.z - pinStop.tangent.z * 8;
    let n = 0;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        const lateral = 3.1 + (col - row / 2) * 0.48;
        const x = originX + pinStop.right.x * lateral - pinStop.tangent.x * row * 0.45;
        const z = originZ + pinStop.right.z * lateral - pinStop.tangent.z * row * 0.45;
        const xx = x;
        track(scene, physics, dynamics, pinMesh(), addDynamicCylinder(
          physics.world,
          physics.materials.prop,
          {
            x: xx,
            y: 0.38,
            z,
            radiusTop: 0.08,
            radiusBottom: 0.12,
            height: 0.7,
            mass: 0.4,
          },
        ));
        n += 1;
      }
    }
    void n;
  }
  const wallStop = layout.stops[6];
  if (wallStop) {
    for (let i = 0; i < 4; i += 1) {
      const along = (i - 1.5) * 0.7;
      const x = wallStop.road.x + wallStop.right.x * along;
      const z = wallStop.road.z + wallStop.right.z * along;
      track(scene, physics, dynamics, crateMesh('#f2c14e', 0.55), addDynamicBox(
        physics.world,
        physics.materials.prop,
        { x, y: 0.32, z, hx: 0.28, hy: 0.28, hz: 0.28, mass: 1.1 },
      ));
    }
  }
  const stackStop = layout.stops[3];
  if (stackStop) {
    stackCrates(
      scene,
      physics,
      dynamics,
      stackStop.road.x + stackStop.right.x * 3.2,
      stackStop.road.z + stackStop.right.z * 3.2,
    );
  }
}

function stackCrates(scene, physics, dynamics, x, z) {
  const colors = ['#e07a3d', '#f2c14e', '#c4844a'];
  for (let i = 0; i < 3; i += 1) {
    const size = 0.62;
    track(scene, physics, dynamics, crateMesh(colors[i], size), addDynamicBox(
      physics.world,
      physics.materials.prop,
      { x, y: size / 2 + i * (size + 0.02) + 0.02, z, hx: size / 2, hy: size / 2, hz: size / 2, mass: 2.4 - i * 0.3 },
    ));
  }
}

function addMailbox(scene, place, physics, dynamics, resume) {
  const x = -3.5;
  const z = 7.4;
  const post = place('sign-post.glb', { height: 1.15, x, z });
  scene.add(post);
  addStaticCylinder(physics.world, physics.materials.ground, x, 0.5, z, 0.12, 1);
  const box = place('mailbox-box.glb', { height: 0.42 });
  const pivot = new THREE.Group();
  box.position.y = -0.21;
  pivot.add(box);
  scene.add(pivot);
  const body = addDynamicBox(physics.world, physics.materials.prop, {
    x, y: 1.05, z, hx: 0.28, hy: 0.2, hz: 0.18, mass: 1.2,
  });
  track(scene, physics, dynamics, pivot, body);
  return {
    kind: 'mail',
    point: { x, z },
    radius: 3.1,
    panel: mailboxPanel(resume),
  };
}

function track(scene, physics, dynamics, mesh, body) {
  scene.add(mesh);
  dynamics.push({
    mesh,
    body,
    spawn: { x: body.position.x, y: body.position.y, z: body.position.z },
  });
  void physics;
}

const coneGeo = new THREE.ConeGeometry(0.2, 0.55, 8);
const pinGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.7, 8);
const shared = new Map();

function mat(color) {
  if (!shared.has(color)) {
    shared.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  }
  return shared.get(color);
}

function coneMesh(color) {
  const mesh = new THREE.Mesh(coneGeo, mat(color));
  return mesh;
}

function pinMesh() {
  const mesh = new THREE.Mesh(pinGeo, mat('#fffaf3'));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8), mat('#e23d3d'));
  neck.position.y = 0.12;
  const group = new THREE.Group();
  group.add(mesh, neck);
  return group;
}

function sphereMesh(radius, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), mat(color));
}

function crateMesh(color, size) {
  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat(color));
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(size * 1.02, size * 0.12, size * 1.02),
    mat('#fff6e8'),
  );
  group.add(box, band);
  return group;
}

function wrap(ctx, text, maxWidth, startSize) {
  let size = startSize;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const pack = () => {
    ctx.font = `800 ${size}px Verdana, sans-serif`;
    const rows = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        rows.push(current);
        current = word;
      } else current = next;
    }
    if (current) rows.push(current);
    return rows;
  };
  let rows = pack();
  while (rows.length > 2 && size > 32) {
    size -= 4;
    rows = pack();
  }
  return { rows, size };
}
