import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { WalkControls } from './controls.js';
import { DriveControls } from './driveControls.js';
import { describeStops } from './circuit.js';
import { buildIsland } from './scenery.js';
import { createKartVisual } from './kartView.js';
import {
  addStaticAabb,
  addStaticCylinder,
  createKart,
  createPhysicsWorld,
  syncMesh,
} from './vehicle.js';

const BASE = './assets/world/';
const TILE = 2.2;
const MOVE_SPEED = 6.1;
const PLAYER_RADIUS = 0.34;
const MODEL_YAW = 0;

const OUTDOOR = new Set([
  'house.glb', 'tree-large.glb', 'tree-small.glb', 'fence.glb', 'fence-long.glb', 'planter.glb',
  'office-small.glb', 'shop.glb', 'soc.glb', 'hall.glb', 'office-white.glb', 'brick.glb',
  'hq.glb', 'glass.glb', 'campus.glb', 'bank.glb', 'tower.glb', 'barracks.glb',
  'sign-post.glb', 'billboard.glb', 'mailbox-box.glb',
]);

export class CareerWorld {
  constructor(renderer, resume, hooks) {
    this.renderer = renderer;
    this.resume = resume;
    this.hooks = hooks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.15, 700);
    this.controls = null;
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.templates = new Map();
    this.blockers = [];
    this.sites = [];
    this.activeSite = null;
    this.state = 'seated';
    this.riseT = 0;
    this.active = false;
    this.ready = false;
    this.reduced = !!hooks.reduced;
    this.mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
    this.player = new THREE.Group();
    this.mixer = null;
    this.actions = {};
    this.currentAction = '';
    this.streetEnd = 80;
    this.bounds = { minX: -18, maxX: 36, minZ: -12, maxZ: 80 };
    this.dynamics = [];
    this.sites = [];
    this.spawn = { x: 0, z: 9.2, yaw: -Math.PI / 2 };
    this.upsideT = 0;
    this.fps = 0;
    this._fpsFrames = 0;
    this._fpsAcc = 0;
    this._camLook = new THREE.Vector3();
    this._saved = null;
    this._vec = new THREE.Vector3();
    this._onKey = (event) => this.onKey(event);
    const params = new URLSearchParams(location.search);
    this.autodrive = params.has('autodrive');
    this.debug = params.has('debug') || this.autodrive;
  }

  async load(onProgress) {
    ensureStyle();
    const files = [
      'house.glb', 'tree-large.glb', 'tree-small.glb', 'fence.glb', 'fence-long.glb', 'planter.glb',
      'office-small.glb', 'shop.glb', 'soc.glb', 'hall.glb', 'office-white.glb', 'brick.glb',
      'hq.glb', 'glass.glb', 'campus.glb', 'bank.glb', 'tower.glb', 'barracks.glb',
      'sign-post.glb', 'billboard.glb',
      'desk.glb', 'chair.glb', 'laptop.glb', 'monitor.glb', 'keyboard.glb',
      'wall.glb', 'wall-window.glb', 'wall-door.glb', 'floor.glb',
      'bookcase.glb', 'plant.glb', 'lamp.glb', 'rug.glb', 'books.glb', 'mailbox-box.glb',
      'player.glb',
    ];
    let done = 0;
    await Promise.all(files.map(async (file) => {
      const gltf = await this.loader.loadAsync(BASE + file);
      this.templates.set(file, gltf.scene);
      if (file === 'player.glb') this.playerGltf = gltf;
      done += 1;
      onProgress?.(done / files.length);
    }));
    onProgress?.(1);

    for (const file of ['wall.glb', 'wall-window.glb', 'wall-door.glb', 'floor.glb']) {
      this.templates.get(file)?.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => { material.side = THREE.DoubleSide; });
      });
    }
    for (const file of OUTDOOR) this.toyify(this.templates.get(file));
    this.buildScene();
    this.controls = new WalkControls(this.renderer.domElement);
    this.controls.setVisible(false);
    this.drive = new DriveControls();
    this.drive.setVisible(false);
    document.addEventListener('keydown', this._onKey);
    this.ready = true;
    if (this.debug) window.__career = this;
  }

  toyify(root) {
    if (!root) return;
    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      const mapped = list.map((material) => {
        const color = material.color ? material.color.clone() : new THREE.Color('#ffffff');
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        color.setHSL(hsl.h, Math.min(1, hsl.s * 1.08 + 0.04), Math.min(0.74, Math.max(0.28, hsl.l)));
        const next = new THREE.MeshLambertMaterial({
          color,
          map: material.map || null,
          vertexColors: material.vertexColors || false,
          side: material.side,
          flatShading: !material.map,
        });
        if (material.transparent) {
          next.transparent = true;
          next.opacity = material.opacity;
        }
        return next;
      });
      obj.material = Array.isArray(obj.material) ? mapped : mapped[0];
    });
  }

  buildScene() {
    this.scene.fog = new THREE.Fog(0xd5e7fb, 80, 250);
    this.scene.add(new THREE.HemisphereLight(0xc5e4ff, 0xf0c99a, 0.95));
    this.scene.add(new THREE.AmbientLight(0xfff6ea, 0.3));
    this.sun = new THREE.DirectionalLight(0xfff4e2, 1.22);
    this.sun.position.set(28, 40, 14);
    if (!this.mobile) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 70;
      this.sun.shadow.camera.left = -18;
      this.sun.shadow.camera.right = 18;
      this.sun.shadow.camera.top = 18;
      this.sun.shadow.camera.bottom = -18;
      this.sun.shadow.bias = -0.0008;
    }
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.physics = createPhysicsWorld();
    this.buildHouse();
    this.addBollards();
    const island = buildIsland({
      scene: this.scene,
      place: (file, opts) => this.place(file, opts),
      physics: this.physics,
      stops: describeStops(this.resume),
      mobile: this.mobile,
      resume: this.resume,
      addBlocker: (box) => this.addSolidFromBox(box, 0.08),
    });
    this.sites = island.zones;
    this.dynamics = island.dynamics;
    this.bounds = island.bounds;
    this.spawn = island.spawn;
    this.streetEnd = this.bounds.maxZ;

    this.kart = createKart(this.physics.world, this.physics.materials, { subdued: this.reduced });
    this.kart.spawn(this.spawn.x, 0.58, this.spawn.z, this.spawn.yaw);
    this.kartView = createKartVisual(this.mobile);
    this.scene.add(this.kartView.root);
    this.kartView.wheels.forEach((wheel) => this.scene.add(wheel));
    this.addBlob();

    this.buildCharacter();
    this.createHud();
    this.seat();
  }

  addBlob() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(36,28,24,0.28)');
    grad.addColorStop(1, 'rgba(36,28,24,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    this.blob = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 18),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);
  }

  addBollards() {
    const body = new THREE.MeshLambertMaterial({ color: '#ff5a36', flatShading: true });
    const cap = new THREE.MeshLambertMaterial({ color: '#fff6ea', flatShading: true });
    for (const x of [-0.78, 0.78]) {
      const group = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.8, 8), body);
      pole.position.y = 0.4;
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), cap);
      top.position.y = 0.86;
      group.add(pole, top);
      group.position.set(x, 0, 4.25);
      this.scene.add(group);
      addStaticCylinder(this.physics.world, this.physics.materials.ground, x, 0.42, 4.25, 0.26, 0.84);
      this.blockers.push({ minX: x - 0.28, maxX: x + 0.28, minZ: 3.95, maxZ: 4.55 });
    }
    addStaticCylinder(this.physics.world, this.physics.materials.ground, -6.2, 1, 2, 0.4, 2);
    addStaticCylinder(this.physics.world, this.physics.materials.ground, 6.4, 1, 1.2, 0.32, 2);
  }

  buildHouse() {
    const half = 1.5 * TILE;
    for (let ix = -1; ix <= 1; ix += 1) {
      for (let iz = -1; iz <= 1; iz += 1) {
        this.scene.add(this.place('floor.glb', { scale: TILE, x: ix * TILE, y: 0.02, z: iz * TILE }));
      }
    }
    for (const x of [-TILE, 0, TILE]) {
      this.scene.add(this.place('wall.glb', { scale: TILE, x, z: -half }));
    }
    for (const z of [-TILE, 0, TILE]) {
      this.scene.add(this.place('wall-window.glb', { scale: TILE, x: -half, z, rotY: Math.PI / 2 }));
      this.scene.add(this.place('wall-window.glb', { scale: TILE, x: half, z, rotY: Math.PI / 2 }));
    }
    this.scene.add(this.place('wall.glb', { scale: TILE, x: -TILE, z: half }));
    this.scene.add(this.place('wall-door.glb', { scale: TILE, x: 0, z: half }));
    this.scene.add(this.place('wall.glb', { scale: TILE, x: TILE, z: half }));

    const t = 0.18;
    this.blockers.push(
      { minX: -half - 1, maxX: half + 1, minZ: -half - t, maxZ: -half + 0.05 },
      { minX: -half - t, maxX: -half + t, minZ: -half, maxZ: half },
      { minX: half - t, maxX: half + t, minZ: -half, maxZ: half },
      { minX: -half, maxX: -0.9, minZ: half - t, maxZ: half + t },
      { minX: 0.9, maxX: half, minZ: half - t, maxZ: half + t },
    );

    const desk = this.place('desk.glb', { height: 0.75, x: 0, z: -2.35 });
    const chair = this.place('chair.glb', { height: 0.82, x: 0.05, z: -1.35, rotY: Math.PI });
    this.scene.add(desk, chair);
    this.addSolid(desk);
    this.scene.add(this.place('rug.glb', { scale: 1.7, x: 0, y: 0.04, z: -1.9 }));
    this.scene.add(this.place('laptop.glb', { height: 0.32, x: -0.28, y: 0.75, z: -2.25, rotY: Math.PI }));
    this.scene.add(this.place('monitor.glb', { height: 0.42, x: 0.32, y: 0.75, z: -2.45, rotY: 0.15 }));
    this.scene.add(this.place('keyboard.glb', { height: 0.05, x: 0.32, y: 0.75, z: -2.1 }));
    this.scene.add(this.place('books.glb', { height: 0.12, x: -0.55, y: 0.75, z: -2.5 }));
    const caseMesh = this.place('bookcase.glb', { height: 1.7, x: -2.55, z: -1.1, rotY: Math.PI / 2 });
    this.scene.add(caseMesh);
    this.addSolid(caseMesh);
    this.scene.add(this.place('plant.glb', { height: 0.85, x: 2.45, z: -2.4 }));
    this.scene.add(this.place('lamp.glb', { height: 1.45, x: 2.15, z: -0.4 }));
    this.scene.add(this.place('planter.glb', { height: 0.45, x: 1.5, z: half + 0.7 }));

    const lamp = new THREE.PointLight(0xffe0b0, 8, 9, 2);
    lamp.position.set(2.15, 1.5, -0.4);
    this.scene.add(lamp);
    const screen = new THREE.PointLight(0x7dff9a, 4.5, 5, 2);
    screen.position.set(0, 1.25, -2.2);
    this.scene.add(screen);

    const house = this.place('house.glb', { height: 7.2, x: 0, z: 0 });
    this.scene.add(house);
    const box = new THREE.Box3().setFromObject(house);
    house.position.z += (-half - 0.45) - box.max.z;
    this.addSolid(house);

    this.scene.add(this.place('tree-large.glb', { height: 4.2, x: -6.2, z: 2 }));
    this.scene.add(this.place('tree-small.glb', { height: 3.1, x: 6.4, z: 1.2 }));
    this.scene.add(this.place('fence.glb', { height: 1.1, x: -5.2, z: 4.2, rotY: Math.PI / 2 }));
    this.scene.add(this.place('fence.glb', { height: 1.1, x: 5.4, z: 4.2, rotY: Math.PI / 2 }));
  }

  buildCharacter() {
    const gltf = this.playerGltf;
    if (!gltf) return;
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = !this.mobile;
        obj.frustumCulled = false;
      }
    });
    model.scale.setScalar(1);
    model.position.set(0, 0, 0);
    const measured = boneSpan(model);
    const span = Math.max(0.01, measured.max.y - measured.min.y);
    const scale = 1.72 / span;
    model.scale.setScalar(scale);
    model.position.y = -measured.min.y * scale;
    model.position.x = -((measured.min.x + measured.max.x) / 2) * scale;
    model.position.z = -((measured.min.z + measured.max.z) / 2) * scale;
    this.player.add(model);
    this.scene.add(this.player);
    this.styleCharacter(model);
    this.mixer = new THREE.AnimationMixer(model);
    const find = (suffix) => gltf.animations.find((clip) => clip.name.endsWith(suffix));
    for (const [key, suffix] of [['idle', 'Idle'], ['walk', 'Walk'], ['sit', 'SitDown'], ['stand', 'StandUp']]) {
      const clip = find(suffix);
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.clampWhenFinished = true;
      this.actions[key] = action;
    }
    this.mixer.addEventListener('finished', (event) => {
      if (event.action === this.actions.stand) this.completeRise();
    });
  }

  styleCharacter(model) {
    const skin = {
      Skin: '#3B261C',
      Face: '#4E3426',
    };
    let hairMesh = null;
    let faceMesh = null;
    model.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const hex = skin[obj.material.name];
      if (hex) obj.material.color.set(hex);
      if (obj.material.name === 'Hair') hairMesh = obj;
      if (obj.material.name === 'Face') faceMesh = obj;
    });

    model.updateWorldMatrix(true, true);
    const head = model.getObjectByName('Head');
    const shoulderL = model.getObjectByName('ShoulderL') || model.getObjectByName('Shoulder.L');
    const shoulderR = model.getObjectByName('ShoulderR') || model.getObjectByName('Shoulder.R');
    if (!head || !hairMesh || !faceMesh) return;

    const hairBox = worldBoxOf(hairMesh);
    const faceBox = worldBoxOf(faceMesh);
    const center = hairBox.getCenter(new THREE.Vector3());
    const faceCenter = faceBox.getCenter(new THREE.Vector3());
    const forward = faceCenter.clone().sub(center);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const forwardAngle = Math.atan2(forward.x, forward.z);
    const size = hairBox.getSize(new THREE.Vector3());
    const shoulder = new THREE.Vector3();
    const shoulderY = ((shoulderL ? shoulderPoint(shoulderL, shoulder) : center.y - 0.4)
      + (shoulderR ? shoulderPoint(shoulderR, shoulder) : center.y - 0.4)) / 2;

    const materials = [0x1b140f, 0x2a1c14, 0x120e0b].map((color) => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.84,
      metalness: 0,
    }));
    const locs = new THREE.Group();
    locs.name = 'locs';

    const placeLoc = (angle, yLift, radial, length, thick) => {
      const origin = center.clone();
      origin.x += Math.sin(angle) * size.x * radial;
      origin.z += Math.cos(angle) * size.z * radial;
      origin.y += yLift;
      const out = Math.sin(angle - forwardAngle);
      const back = -Math.cos(angle - forwardAngle);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.01, 0),
        new THREE.Vector3(out * 0.07, -length * 0.28, back * 0.04),
        new THREE.Vector3(out * 0.1, -length * 0.62, back * 0.03),
        new THREE.Vector3(out * 0.08, -length, back * 0.01),
      ]);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 7, thick, 6, false),
        materials[Math.abs(Math.round(angle * 4)) % materials.length],
      );
      mesh.castShadow = !this.mobile;
      mesh.frustumCulled = false;
      const loc = new THREE.Group();
      loc.position.copy(origin);
      loc.add(mesh);
      locs.add(loc);
    };

    const around = 20;
    for (let i = 0; i < around; i += 1) {
      const angle = forwardAngle + (i / around) * Math.PI * 2 + 0.08;
      const front = Math.cos(angle - forwardAngle);
      if (front > 0.62) continue;
      const rootY = center.y + size.y * (front > 0.15 ? 0.08 : 0.22);
      const length = Math.max(0.16, (rootY - shoulderY) * (front > 0.15 ? 0.42 : 0.62));
      placeLoc(angle, rootY - center.y, front > 0.15 ? 0.44 : 0.48, length, 0.02 + (i % 3) * 0.004);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), materials[0]);
    cap.scale.set(size.x * 0.44, size.y * 0.4, size.z * 0.38);
    cap.position.copy(center).addScaledVector(forward, -size.z * 0.08);
    cap.castShadow = !this.mobile;
    cap.frustumCulled = false;
    locs.add(cap);

    hairMesh.visible = false;
    this.scene.add(locs);
    locs.updateWorldMatrix(true, true);
    head.attach(locs);
  }

  seat() {
    this.state = 'seated';
    this.riseT = 0;
    if (this.player.parent && this.player.parent !== this.scene) this.scene.attach(this.player);
    this.player.scale.setScalar(1);
    this.player.position.set(0.02, -0.42, -1.58);
    this.player.rotation.y = Math.PI + MODEL_YAW;
    this.controls && (this.controls.yaw = 0);
    this.controls && (this.controls.pitch = 0);
    this.poseSitting();
    this.applySeatCamera();
  }

  poseSitting(time) {
    if (!this.actions.sit) return;
    this.mixer.stopAllAction();
    const sit = this.actions.sit;
    sit.reset();
    sit.setLoop(THREE.LoopOnce, 1);
    sit.clampWhenFinished = true;
    sit.play();
    sit.time = time == null ? Math.max(0, sit.getClip().duration - 0.04) : time;
    sit.paused = true;
    this.mixer.update(0);
    this.currentAction = 'sit';
  }

  standUp() {
    if (this.state !== 'seated') return;
    this.standButton?.classList.add('hidden');
    if (this.reduced || !this.actions.stand) {
      this.completeRise();
      return;
    }
    this.state = 'rising';
    this.riseT = 0;
    this.actions.sit?.fadeOut(0.15);
    const stand = this.actions.stand;
    stand.reset();
    stand.setLoop(THREE.LoopOnce, 1);
    stand.clampWhenFinished = true;
    stand.fadeIn(0.12).play();
    this.currentAction = 'stand';
  }

  completeRise() {
    if (this.state === 'walk' || this.state === 'drive') return;
    this.state = 'walk';
    this.riseT = 1;
    this.controls.enabled = true;
    this.drive.enabled = false;
    this.controls.yaw = 0;
    this.player.position.y = 0;
    this.player.position.z = 0.4;
    this.player.rotation.y = MODEL_YAW;
    this.fadeTo('idle');
    this.showHint('Walk to the kart and hop in. F starts driving. Esc returns to the terminal.');
    this.updateChrome();
  }

  startDriving() {
    if (!this.kart || this.state === 'drive') return;
    this.state = 'drive';
    this.controls.enabled = false;
    this.controls.exitLock();
    this.drive.enabled = true;
    this.poseSitting(0.42);
    this.controls.enabled = false;
    this.kartView.seat.attach(this.player);
    this.player.scale.setScalar(0.72);
    this.player.position.set(0.45, -0.35, 0);
    this.player.rotation.set(0, Math.PI / 2, 0);
    this.upsideT = 0;
    this._camLook.set(this.kart.chassis.position.x, 1.2, this.kart.chassis.position.z);
    const hint = this.mobile
      ? 'Joystick steers and accelerates. Pedals work too. Esc returns to the terminal.'
      : 'WASD or arrows drive. Space brakes. R uprights the kart. E hops out. Esc returns to the terminal.';
    this.showHint(hint);
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    this.updateChrome();
  }

  hopOut() {
    if (this.state !== 'drive') return;
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(this.kartView.root.quaternion);
    const right = new THREE.Vector3(0, 0, 1).applyQuaternion(this.kartView.root.quaternion);
    const pos = this.kart.chassis.position;
    this.scene.attach(this.player);
    this.player.scale.setScalar(1);
    this.player.position.set(pos.x + right.x * 1.8, 0, pos.z + right.z * 1.8);
    this.player.rotation.set(0, Math.atan2(forward.x, forward.z), 0);
    this.controls.yaw = this.player.rotation.y;
    this.controls.enabled = true;
    this.drive.enabled = false;
    this.state = 'walk';
    this.fadeTo('idle');
    this.showHint('Walk around, or hop back in. Esc returns to the terminal.');
    this.updateChrome();
  }

  recoverKart() {
    const x = this.kart.chassis.position.x;
    const z = this.kart.chassis.position.z;
    const yaw = this.kart.forwardYaw();
    const fx = Math.cos(yaw);
    const fz = -Math.sin(yaw);
    this.kart.spawn(x - fx * 2.2, 1.15, z - fz * 2.2, yaw);
    this.upsideT = 0;
    this.stuckT = 0;
  }

  showHint(text) {
    if (!this.hint) return;
    this.hint.textContent = text;
    this.hint.classList.remove('hidden');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint?.classList.add('hidden'), 6500);
  }

  distanceToKart() {
    if (!this.kart) return Infinity;
    const pos = this.player.position;
    const kart = this.kart.chassis.position;
    return Math.hypot(pos.x - kart.x, pos.z - kart.z);
  }

  updateChrome() {
    if (!this.hud) return;
    const driving = this.state === 'drive';
    const seated = this.state === 'seated';
    const walking = this.state === 'walk';
    const near = walking && this.distanceToKart() < 3.6;
    this.standButton.classList.toggle('hidden', !seated);
    this.hopButton.classList.toggle('hidden', !near);
    this.driveButton.classList.toggle('hidden', driving || near);
    this.outButton.classList.toggle('hidden', !driving);
    this.speedEl.classList.toggle('hidden', !driving);
    if (driving) this.speedEl.textContent = `${Math.round(Math.abs(this.kart.speedKmh()))} km/h`;
    this.controls.setVisible(walking);
    this.drive.setVisible(driving);
  }

  fadeTo(name) {
    if (!this.actions[name] || this.currentAction === name) return;
    const next = this.actions[name];
    const prev = this.actions[this.currentAction];
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play();
    prev?.fadeOut(0.18);
    this.currentAction = name;
  }

  place(file, { height, scale, x = 0, y = 0, z = 0, rotY = 0 } = {}) {
    const template = this.templates.get(file);
    const group = new THREE.Group();
    if (!template) return group;
    const root = template.clone(true);
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = !this.mobile;
      obj.receiveShadow = !this.mobile;
    });
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const factor = height ? height / (size.y || 1) : (scale || 1);
    root.scale.setScalar(factor);
    root.position.set(
      -((box.min.x + box.max.x) / 2) * factor,
      -box.min.y * factor,
      -((box.min.z + box.max.z) / 2) * factor,
    );
    group.add(root);
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    return group;
  }

  makeSign(title, subtitle, present = false, width = 4.2, height = 1.7) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#102018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#d6e38a';
    ctx.lineWidth = 18;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.fillStyle = '#f4ffe8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, title, 920, 92);
    ctx.font = `700 ${lines.size}px sans-serif`;
    lines.rows.forEach((row, index) => {
      ctx.fillText(row, 512, 200 + (index - (lines.rows.length - 1) / 2) * (lines.size + 8));
    });
    ctx.fillStyle = present ? '#d6ff6a' : '#d6e38a';
    ctx.font = '600 54px sans-serif';
    const sub = wrapText(ctx, subtitle || '', 920, 48);
    ctx.font = `600 ${Math.min(54, sub.size)}px sans-serif`;
    sub.rows.slice(0, 2).forEach((row, index) => {
      ctx.fillText(row, 512, 390 + index * 58);
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    return mesh;
  }

  addSolid(object, pad = 0.05) {
    const box = new THREE.Box3().setFromObject(object);
    this.addSolidFromBox(box, pad);
    if (this.physics) addStaticAabb(this.physics, box, pad);
    return box;
  }

  addSolidFromBox(box, pad = 0.05) {
    this.blockers.push({
      minX: box.min.x - pad,
      maxX: box.max.x + pad,
      minZ: box.min.z - pad,
      maxZ: box.max.z + pad,
    });
  }

  createHud() {
    this.hud = document.createElement('div');
    this.hud.id = 'walk-hud';
    if (this.mobile) this.hud.classList.add('coarse');
    this.hud.innerHTML = `
      <div class="walk-top">
        <button type="button" id="walk-exit">Back to terminal</button>
        <button type="button" id="walk-list">Text list</button>
        <button type="button" id="walk-credits">Credits</button>
        <button type="button" id="walk-out" class="hidden">Hop out</button>
      </div>
      <div id="drive-speed" class="hidden">0 km/h</div>
      <div id="walk-actions">
        <button type="button" id="walk-stand">Stand up</button>
        <button type="button" id="walk-drive">Start driving</button>
        <button type="button" id="walk-hop" class="hidden">Hop in</button>
      </div>
      <p id="walk-hint" class="hidden"></p>
      <aside id="walk-panel" aria-live="polite"></aside>
    `;
    document.body.appendChild(this.hud);
    this.standButton = this.hud.querySelector('#walk-stand');
    this.driveButton = this.hud.querySelector('#walk-drive');
    this.hopButton = this.hud.querySelector('#walk-hop');
    this.outButton = this.hud.querySelector('#walk-out');
    this.speedEl = this.hud.querySelector('#drive-speed');
    this.hint = this.hud.querySelector('#walk-hint');
    this.panel = this.hud.querySelector('#walk-panel');
    const bind = (button, fn) => button.addEventListener('click', (event) => {
      event.currentTarget.blur();
      fn();
    });
    bind(this.standButton, () => this.standUp());
    bind(this.driveButton, () => this.startDriving());
    bind(this.hopButton, () => this.startDriving());
    bind(this.outButton, () => this.hopOut());
    this.hud.querySelector('#walk-exit').addEventListener('click', () => this.hooks.onExit());
    this.hud.querySelector('#walk-list').addEventListener('click', () => this.hooks.onFallback());
    this.hud.querySelector('#walk-credits').addEventListener('click', () => this.hooks.onCredits());
  }

  onKey(event) {
    if (!this.active) return;
    if (this.creditsOpen()) return;
    if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return;
    if (event.key === 'Escape') {
      if (document.pointerLockElement) return;
      event.preventDefault();
      this.hooks.onExit();
      return;
    }
    if (this.state === 'seated' && (event.key === 'Enter' || event.key === 'e' || event.key === 'E' || event.code === 'Space')) {
      event.preventDefault();
      this.standUp();
      return;
    }
    if (event.code === 'KeyF' && this.state !== 'drive') {
      event.preventDefault();
      this.startDriving();
      return;
    }
    if (event.code === 'KeyE' && this.state === 'walk') {
      if (this.distanceToKart() < 3.6) {
        event.preventDefault();
        this.startDriving();
      }
      return;
    }
    if (event.code === 'KeyE' && this.state === 'drive') {
      event.preventDefault();
      this.hopOut();
      return;
    }
    if (event.code === 'KeyR' && this.state === 'drive') {
      event.preventDefault();
      this.recoverKart();
    }
  }

  creditsOpen() {
    return !!document.getElementById('credits-overlay')?.classList.contains('visible');
  }

  enter(options = {}) {
    this.active = true;
    this.hud.classList.add('visible');
    this.panel.classList.remove('visible');
    this.activeSite = null;
    this.controls.enabled = false;
    this.drive.enabled = false;
    this.controls.setVisible(false);
    this.drive.setVisible(false);
    this.resetProps();
    this.kart.spawn(this.spawn.x, 0.58, this.spawn.z, this.spawn.yaw);
    this.upsideT = 0;
    this.seat();
    if (options.drive || this.autodrive) this.startDriving();
    else this.showHint('Stand up and walk to the kart, or start driving. Esc returns to the terminal.');
    this.applyRenderer(true);
    this.updateChrome();
  }

  exit() {
    this.active = false;
    this.controls.enabled = false;
    this.drive.enabled = false;
    this.controls.exitLock();
    this.controls.setVisible(false);
    this.drive.setVisible(false);
    this.hud.classList.remove('visible');
    this.applyRenderer(false);
  }

  applyRenderer(world) {
    const renderer = this.renderer;
    if (world) {
      this._saved = {
        toneMapping: renderer.toneMapping,
        exposure: renderer.toneMappingExposure,
        pixelRatio: renderer.getPixelRatio(),
        shadowType: renderer.shadowMap.type,
      };
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1 : 1.5));
      return;
    }
    if (!this._saved) return;
    renderer.toneMapping = this._saved.toneMapping;
    renderer.toneMappingExposure = this._saved.exposure;
    renderer.shadowMap.type = this._saved.shadowType;
    renderer.setPixelRatio(this._saved.pixelRatio);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.ready || !this.active) return;
    const driving = this.state === 'drive';
    if (driving) {
      let input = this.drive.read();
      if (this.creditsOpen()) input = { throttle: 0, steer: 0, brake: 1 };
      else if (this.autodrive) input = this.autoInput();
      this.kart.applyControls(input, dt);
      if (this.kart.upright() < 0.28) this.upsideT += dt;
      else this.upsideT = 0;
      if (Math.abs(input.throttle) > 0.6 && Math.abs(this.kart.speedKmh()) < 3) this.stuckT = (this.stuckT || 0) + dt;
      else this.stuckT = 0;
      if (this.upsideT > 1.25 || this.stuckT > 1.5) this.recoverKart();
    } else if (this.kart) {
      this.kart.applyControls({ throttle: 0, steer: 0, brake: 1 }, dt);
    }

    if (this.state === 'rising') {
      this.riseT = Math.min(1, this.riseT + dt / 0.95);
      const ease = this.riseT < 0.5
        ? 2 * this.riseT * this.riseT
        : 1 - ((-2 * this.riseT + 2) ** 2) / 2;
      this.player.rotation.y = Math.PI * (1 - ease) + MODEL_YAW;
      this.player.position.y = -0.42 * (1 - ease);
      this.player.position.z = -1.58 + (0.4 - -1.58) * ease;
      if (this.riseT >= 1) this.completeRise();
    } else if (this.state === 'walk') {
      this.step(dt);
    }

    this.physics.world.step(1 / 60, Math.min(dt, 0.1), this.mobile ? 4 : 6);
    this.syncWorld();

    if (this.state === 'seated') this.applySeatCamera();
    else if (this.state === 'rising') {
      this.applyFollowCamera();
      const followPos = this.camera.position.clone();
      const followQuat = this.camera.quaternion.clone();
      this.applySeatCamera();
      const ease = this.riseT < 0.5
        ? 2 * this.riseT * this.riseT
        : 1 - ((-2 * this.riseT + 2) ** 2) / 2;
      this.camera.position.lerp(followPos, ease);
      this.camera.quaternion.slerp(followQuat, ease);
    } else if (driving) this.applyDriveCamera(dt);
    else this.applyFollowCamera();

    this.mixer?.update(dt);
    const sky = this.scene.getObjectByName('career-sky');
    if (sky) sky.position.copy(this.camera.position);
    const focus = driving ? this.kart.chassis.position : this.player.position;
    this.sun.position.set(focus.x + 16, 34, focus.z + 10);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.target.updateMatrixWorld();
    this.updateProximity();
    this.updateChrome();
    this._fpsFrames += 1;
    this._fpsAcc += dt;
    if (this._fpsAcc >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAcc;
      this._fpsFrames = 0;
      this._fpsAcc = 0;
    }
  }

  autoInput() {
    const t = performance.now() / 1000;
    return { throttle: 0.85, steer: Math.sin(t * 0.65) * 0.45, brake: 0 };
  }

  syncWorld() {
    syncMesh(this.kartView.root, this.kart.chassis);
    const vehicle = this.kart.vehicle;
    for (let i = 0; i < this.kartView.wheels.length; i += 1) {
      vehicle.updateWheelTransform(i);
      const transform = vehicle.wheelInfos[i].worldTransform;
      const wheel = this.kartView.wheels[i];
      wheel.position.set(transform.position.x, transform.position.y, transform.position.z);
      wheel.quaternion.set(
        transform.quaternion.x,
        transform.quaternion.y,
        transform.quaternion.z,
        transform.quaternion.w,
      );
    }
    if (this.blob) {
      this.blob.position.set(this.kart.chassis.position.x, 0.08, this.kart.chassis.position.z);
    }
    for (const item of this.dynamics) syncMesh(item.mesh, item.body);
  }

  resetProps() {
    for (const item of this.dynamics) {
      item.body.position.set(item.spawn.x, item.spawn.y, item.spawn.z);
      item.body.quaternion.set(0, 0, 0, 1);
      item.body.velocity.set(0, 0, 0);
      item.body.angularVelocity.set(0, 0, 0);
      item.body.wakeUp();
    }
  }

  sampleStats() {
    const info = this.renderer.info;
    return {
      fps: Math.round(this.fps),
      calls: info.render.calls,
      triangles: info.render.triangles,
      bodies: this.physics.world.bodies.length,
    };
  }

  step(dt) {
    const wish = this.controls.readMove(dt);
    const dx = wish.x * MOVE_SPEED * dt;
    const dz = wish.z * MOVE_SPEED * dt;
    this.moveCollide(dx, dz);
    const bounds = this.bounds;
    this.player.position.x = clamp(this.player.position.x, bounds.minX + 1, bounds.maxX - 1);
    this.player.position.z = clamp(this.player.position.z, bounds.minZ + 1, bounds.maxZ - 1);
    if (wish.moving) {
      this.player.rotation.y = this.controls.yaw + MODEL_YAW;
      this.fadeTo('walk');
    } else {
      this.fadeTo('idle');
    }
  }

  moveCollide(dx, dz) {
    const pos = this.player.position;
    pos.x += dx;
    for (const box of this.blockers) {
      if (circleHits(pos.x, pos.z, PLAYER_RADIUS, box)) {
        pos.x = dx > 0 ? box.minX - PLAYER_RADIUS : box.maxX + PLAYER_RADIUS;
      }
    }
    pos.z += dz;
    for (const box of this.blockers) {
      if (circleHits(pos.x, pos.z, PLAYER_RADIUS, box)) {
        pos.z = dz > 0 ? box.minZ - PLAYER_RADIUS : box.maxZ + PLAYER_RADIUS;
      }
    }
  }

  applySeatCamera() {
    const portrait = this.camera.aspect < 1;
    this.camera.position.set(portrait ? 2.15 : 1.55, portrait ? 1.8 : 1.55, portrait ? 1.45 : 0.85);
    this.camera.lookAt(0, 0.95, -1.45);
  }

  applyFollowCamera() {
    this.aimFov(62);
    const yaw = this.controls.yaw;
    const pitch = this.controls.pitch;
    const dist = 2.7;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    this.camera.position.set(px - fx * dist, 1.72 - pitch * 0.35, pz - fz * dist);
    this.camera.lookAt(px + fx * 1.4, 1.28 + Math.sin(pitch) * 1.6, pz + fz * 1.4);
  }

  applyDriveCamera(dt) {
    if (this.lockCamera) return;
    this.aimFov(this.reduced ? 50 : 42);
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(this.kartView.root.quaternion);
    const pos = this.kartView.root.position;
    const desired = pos.clone().addScaledVector(forward, -9.4);
    desired.y = pos.y + 8.8;
    const look = pos.clone().addScaledVector(forward, 5.2);
    look.y = pos.y + 0.9;
    const k = 1 - Math.exp(-(this.reduced ? 14 : 3.2) * dt);
    if (this._camLook.lengthSq() < 0.001) this._camLook.copy(look);
    this.camera.position.lerp(desired, k);
    this._camLook.lerp(look, k);
    this.camera.lookAt(this._camLook);
  }

  aimFov(target) {
    if (Math.abs(this.camera.fov - target) < 0.2) return;
    this.camera.fov += (target - this.camera.fov) * 0.15;
    this.camera.updateProjectionMatrix();
  }

  focusPoint() {
    if (this.state === 'drive') {
      return { x: this.kart.chassis.position.x, z: this.kart.chassis.position.z };
    }
    return { x: this.player.position.x, z: this.player.position.z };
  }

  updateProximity() {
    if (this.state === 'seated' || this.state === 'rising') return;
    const { x, z } = this.focusPoint();
    let best = null;
    let bestDist = Infinity;
    for (const site of this.sites) {
      const dist = Math.hypot(x - site.point.x, z - site.point.z);
      if (dist < site.radius && dist < bestDist) {
        best = site;
        bestDist = dist;
      }
    }
    if (best && best !== this.activeSite) {
      this.activeSite = best;
      this.renderPanel(best.panel);
      this.panel.classList.add('visible');
      this.controls.exitLock();
    } else if (!best && this.activeSite) {
      const leave = this.activeSite.radius + 2.4;
      if (Math.hypot(x - this.activeSite.point.x, z - this.activeSite.point.z) > leave) {
        this.activeSite = null;
        this.panel.classList.remove('visible');
      }
    }
  }

  renderPanel(panel) {
    const bullets = (panel.bullets || []).map((item) => `<li>${esc(item)}</li>`).join('');
    this.panel.innerHTML = `
      <p class="kicker">${esc(panel.kicker || '')}</p>
      <h2>${esc(panel.title || '')}</h2>
      ${panel.meta ? `<p class="meta">${esc(panel.meta)}</p>` : ''}
      ${bullets ? `<ul>${bullets}</ul>` : ''}
    `;
  }

  debugTeleport(x, z, yaw = 0) {
    this.completeRise();
    this.player.position.set(x, 0, z);
    this.controls.yaw = yaw;
    this.player.rotation.y = yaw + MODEL_YAW;
  }
}

function worldBoxOf(mesh) {
  mesh.geometry.computeBoundingBox();
  const source = mesh.geometry.boundingBox;
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  for (const x of [source.min.x, source.max.x]) {
    for (const y of [source.min.y, source.max.y]) {
      for (const z of [source.min.z, source.max.z]) {
        corner.set(x, y, z).applyMatrix4(mesh.matrixWorld);
        box.expandByPoint(corner);
      }
    }
  }
  return box;
}

function shoulderPoint(bone, target) {
  bone.getWorldPosition(target);
  return target.y;
}

function boneSpan(root) {
  root.updateWorldMatrix(true, true);
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  const point = new THREE.Vector3();
  root.traverse((obj) => {
    if (!obj.isBone) return;
    obj.getWorldPosition(point);
    min.min(point);
    max.max(point);
  });
  return { min, max };
}

function circleHits(x, z, radius, box) {
  const cx = Math.max(box.minX, Math.min(x, box.maxX));
  const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < radius * radius;
}

function distanceToBox(x, z, box) {
  const cx = Math.max(box.min.x, Math.min(x, box.max.x));
  const cz = Math.max(box.min.z, Math.min(z, box.max.z));
  return Math.hypot(x - cx, z - cz);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function wrapText(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `700 ${size}px sans-serif`;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const pack = () => {
    const rows = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && current) {
        rows.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) rows.push(current);
    return rows;
  };
  let rows = pack();
  while ((rows.length > 3 || rows.some((row) => ctx.measureText(row).width > maxWidth)) && size > 28) {
    size -= 4;
    ctx.font = `700 ${size}px sans-serif`;
    rows = pack();
  }
  return { rows, size };
}

function ensureStyle() {
  if (document.getElementById('career-world-style')) return;
  const style = document.createElement('style');
  style.id = 'career-world-style';
  style.textContent = `
    #walk-hud { position: fixed; inset: 0; pointer-events: none; z-index: 2500; font-family: Verdana, "Trebuchet MS", sans-serif; color: #241c18; display: none; }
    #walk-hud.visible { display: block; }
    #walk-hud button { pointer-events: auto; background: #fff8ee; color: #241c18; border: 3px solid #241c18; border-radius: 999px; padding: 8px 14px; font-family: inherit; font-weight: 700; cursor: pointer; box-shadow: 3px 3px 0 #241c18; }
    .walk-top { position: absolute; top: 14px; right: 14px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: min(70%, 520px); }
    #walk-actions { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 96%; }
    #walk-actions button { font-size: 18px; padding: 12px 18px; }
    #walk-hud .hidden { display: none !important; }
    #drive-speed { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: #fff8ee; border: 3px solid #241c18; border-radius: 999px; padding: 6px 14px; font-weight: 800; box-shadow: 3px 3px 0 #241c18; }
    #walk-hint { position: absolute; left: 50%; bottom: 92px; transform: translateX(-50%); margin: 0; background: rgba(255,248,238,.92); color: #241c18; border: 3px solid #241c18; padding: 8px 12px; border-radius: 12px; max-width: min(640px, 92%); text-align: center; font-size: 14px; font-weight: 700; }
    #walk-panel { pointer-events: auto; display: none; position: absolute; top: 72px; left: 16px; width: min(420px, calc(100% - 32px)); max-height: min(52vh, 480px); overflow: auto; background: #fff8ee; color: #241c18; border: 3px solid #241c18; border-radius: 16px; padding: 14px 16px 16px; box-shadow: 6px 6px 0 #241c18; }
    #walk-panel.visible { display: block; }
    #walk-panel h2 { margin: 0 0 6px; font-size: 22px; color: #241c18; }
    #walk-panel .kicker { margin: 0; color: #c4491d; letter-spacing: .04em; text-transform: uppercase; font-size: 12px; font-weight: 800; }
    #walk-panel .meta { color: #5c5148; margin: 0 0 8px; }
    #walk-panel ul { margin: 8px 0 0; padding-left: 18px; }
    #walk-panel li { margin: 6px 0; line-height: 1.35; }
    #walk-hud.coarse #drive-speed { top: 14px; left: 12px; transform: none; }
    #walk-hud.coarse #walk-actions { bottom: 150px; }
    #walk-hud.coarse #walk-hint { top: 64px; bottom: auto; left: 12px; right: 12px; transform: none; }
    #walk-hud.coarse #walk-panel { max-height: 34vh; }
    #walk-touch, #drive-touch { position: fixed; inset: 0; z-index: 2600; pointer-events: none; }
    #walk-joystick, #drive-joystick { pointer-events: auto; position: absolute; left: 16px; bottom: 16px; width: 124px; height: 124px; border-radius: 50%; border: 3px solid #241c18; background: rgba(255,248,238,.78); touch-action: none; box-shadow: 3px 3px 0 #241c18; }
    #walk-joystick-knob, #drive-joystick-knob { position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%; background: #ff5a36; border: 3px solid #241c18; }
    #walk-lookpad { pointer-events: auto; position: absolute; right: 0; top: 64px; width: 46%; height: calc(100% - 210px); touch-action: none; }
    #drive-pedals { position: absolute; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
    #drive-go, #drive-stop { pointer-events: auto; width: 96px; height: 64px; border-radius: 16px; font-size: 16px; }
    #drive-go { background: #8ef0b0; }
    #drive-stop { background: #ffb088; }
  `;
  document.head.appendChild(style);
}
