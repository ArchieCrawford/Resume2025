import * as THREE from 'three';

/**
 * Original low-poly kart. Local +X is the nose, matching the physics chassis.
 * Geometry is built here — it is not a downloaded car model.
 */

const BODY = 0xff5a36;
const ROOF = 0xffe08a;
const INK = 0x241c18;
const CREAM = 0xfff6ea;
const GLASS = 0xc5ecff;
const TIRE = 0x2a2a2a;
const HUB = 0xffd84a;

export function createKartVisual(mobile) {
  const root = new THREE.Group();
  root.name = 'kart';
  const cast = !mobile;

  const bodyMat = lambert(BODY);
  const roofMat = lambert(ROOF);
  const inkMat = lambert(INK);
  const creamMat = lambert(CREAM);
  const glassMat = new THREE.MeshBasicMaterial({ color: GLASS });
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xfff1c4,
    emissive: 0xffcc66,
    emissiveIntensity: 0.7,
    flatShading: true,
  });
  const tailMat = new THREE.MeshLambertMaterial({
    color: 0xff4d4d,
    emissive: 0xff2a2a,
    emissiveIntensity: 0.45,
    flatShading: true,
  });

  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.5, 1.24),
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }),
  );
  shell.scale.setScalar(1.035);
  shell.position.y = 0.02;
  root.add(shell);

  addBox(root, 2.05, 0.42, 1.16, bodyMat, 0, 0.02, 0, cast);
  addBox(root, 0.72, 0.16, 1.02, bodyMat, 0.62, 0.28, 0, cast);
  addBox(root, 0.16, 0.12, 1.18, creamMat, 0.15, 0.16, 0, cast);
  addBox(root, 0.92, 0.46, 1.02, roofMat, -0.16, 0.46, 0, cast);
  addBox(root, 0.98, 0.08, 1.1, roofMat, -0.16, 0.72, 0, cast);
  addBox(root, 0.18, 0.16, 1.2, inkMat, 1.08, 0.02, 0, cast);
  addBox(root, 0.16, 0.14, 1.18, inkMat, -1.08, 0.0, 0, cast);

  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.36), glassMat);
  windshield.rotation.y = Math.PI / 2;
  windshield.position.set(0.3, 0.5, 0);
  root.add(windshield);
  for (const z of [0.52, -0.52]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), glassMat);
    pane.position.set(-0.16, 0.5, z);
    if (z < 0) pane.rotation.y = Math.PI;
    root.add(pane);
  }

  addBox(root, 0.08, 0.1, 0.16, lampMat, 1.08, 0.12, 0.38, false);
  addBox(root, 0.08, 0.1, 0.16, lampMat, 1.08, 0.12, -0.38, false);
  addBox(root, 0.08, 0.1, 0.18, tailMat, -1.1, 0.16, 0.36, false);
  addBox(root, 0.08, 0.1, 0.18, tailMat, -1.1, 0.16, -0.36, false);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.22),
    new THREE.MeshBasicMaterial({ map: plateTexture(), transparent: true }),
  );
  plate.position.set(-1.12, 0.16, 0);
  plate.rotation.y = -Math.PI / 2;
  root.add(plate);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.42, 6), inkMat);
  mast.position.set(-0.45, 0.96, 0);
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), roofMat);
  bob.position.set(-0.45, 1.18, 0);
  root.add(mast, bob);

  const seat = new THREE.Group();
  seat.name = 'seat';
  seat.position.set(0.02, 0.12, -0.22);
  root.add(seat);

  const tireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
  tireGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8);
  hubGeo.rotateX(Math.PI / 2);
  const tireMat = lambert(TIRE);
  const hubMat = lambert(HUB);
  const wheels = [];
  for (let i = 0; i < 4; i += 1) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    tire.castShadow = cast;
    wheel.add(tire, hub);
    wheels.push(wheel);
  }

  return { root, seat, wheels };
}

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function addBox(parent, w, h, d, material, x, y, z, cast) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  parent.add(mesh);
  return mesh;
}

function plateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff8ea';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#241c18';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = '#241c18';
  ctx.font = '800 72px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ACJ', 128, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
