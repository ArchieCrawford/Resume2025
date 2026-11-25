import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { WalkControls } from './controls.js';
import {
  sortExperienceChronologically,
  formatSignYears,
  formatPanelDates,
} from './places.js';

const BASE = './assets/world/';
const TILE = 2.2;
const MOVE_SPEED = 6.1;
const PLAYER_RADIUS = 0.34;
const MODEL_YAW = 0;

const LOOKS = {
  'United States Army': {
    parts: [
      { file: 'hq.glb', height: 8.2, dx: 1.5, dz: 0 },
      { file: 'barracks.glb', height: 5.2, dx: 8, dz: -6.2 },
      { file: 'barracks.glb', height: 5.2, dx: 8, dz: 0 },
      { file: 'barracks.glb', height: 5.2, dx: 8, dz: 6.2 },
    ],
  },
  'AT&T': { parts: [{ file: 'shop.glb', height: 6.6 }] },
  'Dell SecureWorks': { parts: [{ file: 'soc.glb', height: 8 }] },
  'Data Path': { parts: [{ file: 'office-small.glb', height: 8 }] },
  'American Express': { parts: [{ file: 'bank.glb', height: 8.4 }] },
  'Unisys': { parts: [{ file: 'office-white.glb', height: 10 }] },
  'Community Loans of America': { parts: [{ file: 'brick.glb', height: 9 }] },
  'Ace Group LLC': { parts: [{ file: 'glass.glb', height: 11 }] },
  Moderna: { parts: [{ file: 'campus.glb', height: 12 }] },
  'Latitude Services': { parts: [{ file: 'tower.glb', height: 22 }] },
};

const FALLBACK_FILES = ['office-small.glb', 'shop.glb', 'brick.glb', 'glass.glb', 'office-white.glb'];

export class CareerWorld {
  constructor(renderer, resume, hooks) {
    this.renderer = renderer;
    this.resume = resume;
    this.hooks = hooks;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 250);
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
    this._saved = null;
    this._vec = new THREE.Vector3();
    this._onKey = (event) => this.onKey(event);
  }

  async load(onProgress) {
    ensureStyle();
    const files = [
      'house.glb', 'tree-large.glb', 'tree-small.glb', 'fence.glb', 'fence-long.glb', 'planter.glb',
      'office-small.glb', 'shop.glb', 'soc.glb', 'hall.glb', 'office-white.glb', 'brick.glb',
      'hq.glb', 'glass.glb', 'campus.glb', 'bank.glb', 'tower.glb', 'barracks.glb',
      'road.glb', 'driveway.glb', 'streetlight.glb', 'sign-post.glb', 'billboard.glb',
      'desk.glb', 'chair.glb', 'laptop.glb', 'monitor.glb', 'keyboard.glb',
      'wall.glb', 'wall-window.glb', 'wall-door.glb', 'floor.glb',
      'bookcase.glb', 'plant.glb', 'lamp.glb', 'rug.glb', 'books.glb', 'mailbox-box.glb',
      'sedan.glb', 'player.glb',
    ];
    let done = 0;
    await Promise.all(files.map(async (file) => {
      const gltf = await this.loader.loadAsync(BASE + file);
      this.templates.set(file, gltf.scene);
      if (file === 'player.glb') this.playerGltf = gltf;
      done += 1;
      onProgress?.(done / (files.length + 1));
    }));

    const hdr = await new RGBELoader().loadAsync(BASE + 'sky.hdr');
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromEquirectangular(hdr).texture;
    this.scene.background = hdr;
    pmrem.dispose();
    onProgress?.(1);

    for (const file of ['wall.glb', 'wall-window.glb', 'wall-door.glb', 'floor.glb']) {
      this.templates.get(file)?.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => { material.side = THREE.DoubleSide; });
      });
    }
    this.buildScene();
    this.controls = new WalkControls(this.renderer.domElement);
    this.controls.setVisible(false);
    document.addEventListener('keydown', this._onKey);
    this.ready = true;
    if (new URLSearchParams(location.search).has('debug')) {
      window.__career = this;
    }
  }

  buildScene() {
    this.scene.fog = new THREE.Fog(0xc5d9ee, 50, 150);
    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6d8a4a, 0.72);
    this.scene.add(hemi);
    this.scene.add(new THREE.AmbientLight(0xfff4e0, 0.18));
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.35);
    this.sun.position.set(24, 36, 12);
    if (!this.mobile) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 80;
      this.sun.shadow.camera.left = -22;
      this.sun.shadow.camera.right = 22;
      this.sun.shadow.camera.top = 22;
      this.sun.shadow.camera.bottom = -22;
      this.sun.shadow.bias = -0.0004;
    }
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.ground();
    this.buildHouse();
    this.buildStreet();
    this.buildCharacter();
    this.createHud();
    this.seat();
  }

  ground() {
    const tex = new THREE.TextureLoader().load(BASE + 'grass.jpg');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(48, 48);
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = !this.mobile;
    this.scene.add(mesh);
  }

  buildHouse() {
    const half = 1.5 * TILE;
    for (let ix = -1; ix <= 1; ix += 1) {
      for (let iz = -1; iz <= 1; iz += 1) {
        this.scene.add(this.place('floor.glb', { scale: TILE, x: ix * TILE, y: -0.1, z: iz * TILE }));
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
    this.scene.add(this.place('rug.glb', { scale: 1.7, x: 0, y: 0.02, z: -1.9 }));
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

    const lamp = new THREE.PointLight(0xffe0b0, 6, 9, 2);
    lamp.position.set(2.15, 1.5, -0.4);
    this.scene.add(lamp);
    const screen = new THREE.PointLight(0x7dff9a, 3.5, 5, 2);
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

  buildStreet() {
    this.scene.add(this.place('driveway.glb', { scale: 5, x: 0, y: 0.03, z: 8 }));
    this.scene.add(this.place('driveway.glb', { scale: 5, x: 0, y: 0.03, z: 13 }));
    const car = this.place('sedan.glb', { height: 1.55, x: 3.9, z: 8.4, rotY: 0.2 });
    this.scene.add(car);
    this.addSolid(car, 0.15);

    this.buildMailbox();

    const jobs = sortExperienceChronologically(this.resume.experience || []);
    let cursor = 20;
    let fallbackIndex = 0;
    for (const job of jobs) {
      const look = LOOKS[job.company] || {
        parts: [{ file: FALLBACK_FILES[fallbackIndex++ % FALLBACK_FILES.length], height: 8 }],
      };
      cursor = this.addSite({
        kind: 'job',
        cursor,
        parts: look.parts,
        signTitle: job.company,
        signSub: formatSignYears(job.dates),
        present: job.dates?.end === 'present',
        panel: {
          kicker: job.company,
          title: job.title || job.position || '',
          meta: [formatPanelDates(job.dates), job.location, job.employmentType].filter(Boolean).join(' · '),
          bullets: job.highlights || job.description || [],
        },
      });
    }

    const schools = this.resume.education || [];
    if (schools.length) {
      cursor = this.addSite({
        kind: 'education',
        cursor,
        parts: [{ file: 'hall.glb', height: 8 }],
        signTitle: 'Education',
        signSub: schools.map((edu) => edu.school || edu.institution).filter(Boolean).join(' · '),
        panel: {
          kicker: 'Education',
          title: 'Schools',
          meta: '',
          bullets: schools.map((edu) => {
            const school = edu.school || edu.institution || '';
            const year = edu.graduationYear ? ` (${edu.graduationYear})` : '';
            const where = edu.location ? `, ${edu.location}` : '';
            return `${school} — ${edu.degree || ''}${year}${where}`;
          }),
        },
      });
    }

    const certs = this.resume.certifications || [];
    if (certs.length) {
      cursor = this.addBoard(cursor, certs);
    }
    this.streetEnd = cursor;

    for (let z = 16; z < this.streetEnd + 6; z += 5) {
      this.scene.add(this.place('road.glb', { scale: 5, x: 0, y: 0.025, z }));
    }
    for (let z = 18; z < this.streetEnd; z += 18) {
      this.scene.add(this.place('streetlight.glb', { height: 6.4, x: -3.4, z }));
      this.scene.add(this.place('tree-large.glb', { height: 4.6 + (z % 5) * 0.15, x: -7.5, z: z + 4 }));
      this.scene.add(this.place('tree-small.glb', { height: 3.4, x: -8.8, z: z + 11 }));
    }

    const ave = this.makeSign('Career Ave', 'Walk forward');
    ave.position.set(-3.2, 2.4, 16);
    ave.rotation.y = Math.PI / 2;
    this.scene.add(ave);
  }

  addSite({ kind, cursor, parts, signTitle, signSub, present, panel }) {
    const group = new THREE.Group();
    for (const part of parts) {
      group.add(this.place(part.file, {
        height: part.height,
        x: part.dx || 0,
        z: part.dz || 0,
        rotY: part.rotY ?? -Math.PI / 2,
      }));
    }
    this.scene.add(group);
    let box = new THREE.Box3().setFromObject(group);
    group.position.x += 4.6 - box.min.x;
    box = new THREE.Box3().setFromObject(group);
    group.position.z += cursor - box.min.z;
    box = new THREE.Box3().setFromObject(group);
    this.addSolidFromBox(box, 0.2);
    const sign = this.makeSign(signTitle, signSub, present);
    sign.position.set(box.min.x - 1.2, Math.min(3.2, box.max.y * 0.42 + 0.6), (box.min.z + box.max.z) / 2);
    sign.rotation.y = -Math.PI / 2;
    this.scene.add(sign);
    this.sites.push({ kind, box, panel });
    return box.max.z + 7;
  }

  addBoard(cursor, certs) {
    const board = this.makeSign(
      'Certifications',
      certs.map((cert) => cert.name).join('  ·  '),
      false,
      5.4,
      2.4,
    );
    board.position.set(10.5, 1.8, cursor + 2);
    board.rotation.y = -Math.PI / 2;
    this.scene.add(board);
    this.scene.add(this.place('billboard.glb', {
      height: 3.2,
      x: 12.2,
      z: cursor + 2,
      rotY: -Math.PI / 2,
    }));
    const box = new THREE.Box3().setFromObject(board);
    this.sites.push({
      kind: 'certs',
      box,
      panel: {
        kicker: 'Certifications',
        title: 'Board',
        meta: '',
        bullets: certs.map((cert) => cert.issuer ? `${cert.name} (${cert.issuer})` : cert.name),
      },
    });
    return cursor + 8;
  }

  buildMailbox() {
    const post = this.place('sign-post.glb', { height: 1.35, x: -3.5, z: 7.2 });
    const box = this.place('mailbox-box.glb', { height: 0.38, x: -3.5, y: 1.05, z: 7.2 });
    this.scene.add(post, box);
    const sign = this.makeSign('Mailbox', 'Contact', false, 1.5, 0.7);
    sign.position.set(-3.5, 1.7, 7.7);
    sign.rotation.y = Math.PI / 2;
    this.scene.add(sign);
    const contact = this.resume.contact || {};
    const identity = this.resume.identity || {};
    this.sites.push({
      kind: 'mail',
      box: new THREE.Box3(new THREE.Vector3(-4.4, 0, 6.2), new THREE.Vector3(-2.6, 2, 8.4)),
      panel: {
        kicker: identity.name || 'Mailbox',
        title: 'Contact',
        meta: contact.location || '',
        bullets: [
          contact.email ? `Email: ${contact.email}` : '',
          contact.phone ? `Phone: ${contact.phone}` : '',
          contact.linkedin ? `LinkedIn: ${contact.linkedin}` : '',
          contact.github ? `GitHub: ${contact.github}` : '',
          contact.website ? `Website: ${contact.website}` : '',
        ].filter(Boolean),
      },
    });
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
    this.player.position.set(0.02, -0.42, -1.58);
    this.player.rotation.y = Math.PI + MODEL_YAW;
    this.controls && (this.controls.yaw = 0);
    this.controls && (this.controls.pitch = 0);
    if (this.actions.sit) {
      this.mixer.stopAllAction();
      const sit = this.actions.sit;
      sit.reset();
      sit.setLoop(THREE.LoopOnce, 1);
      sit.clampWhenFinished = true;
      sit.play();
      sit.time = Math.max(0, sit.getClip().duration - 0.04);
      sit.paused = true;
      this.mixer.update(0);
      this.currentAction = 'sit';
    }
    this.applySeatCamera();
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
    if (this.state === 'walk') return;
    this.state = 'walk';
    this.riseT = 1;
    this.controls.enabled = true;
    this.controls.yaw = 0;
    this.player.position.y = 0;
    this.player.position.z = 0.4;
    this.controls.setVisible(true);
    this.player.rotation.y = MODEL_YAW;
    this.fadeTo('idle');
    if (this.hint) {
      this.hint.classList.remove('hidden');
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => this.hint.classList.add('hidden'), 7000);
    }
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
    this.hud.innerHTML = `
      <div class="walk-top">
        <button type="button" id="walk-exit">Back to terminal</button>
        <button type="button" id="walk-list">Text list</button>
        <button type="button" id="walk-credits">Credits</button>
      </div>
      <button type="button" id="walk-stand">Stand up</button>
      <p id="walk-hint" class="hidden">WASD or arrows to walk · click to look · Q/E to turn · Esc returns to the terminal</p>
      <aside id="walk-panel" aria-live="polite"></aside>
    `;
    document.body.appendChild(this.hud);
    this.standButton = this.hud.querySelector('#walk-stand');
    this.hint = this.hud.querySelector('#walk-hint');
    this.panel = this.hud.querySelector('#walk-panel');
    this.standButton.addEventListener('click', () => this.standUp());
    this.hud.querySelector('#walk-exit').addEventListener('click', () => this.hooks.onExit());
    this.hud.querySelector('#walk-list').addEventListener('click', () => this.hooks.onFallback());
    this.hud.querySelector('#walk-credits').addEventListener('click', () => this.hooks.onCredits());
  }

  onKey(event) {
    if (!this.active) return;
    if (document.getElementById('credits-overlay')?.classList.contains('visible')) return;
    if (event.key === 'Escape') {
      if (document.pointerLockElement) return;
      event.preventDefault();
      this.hooks.onExit();
      return;
    }
    if (this.state === 'seated' && (event.key === 'Enter' || event.key === 'e' || event.key === 'E' || event.code === 'Space')) {
      event.preventDefault();
      this.standUp();
    }
  }

  enter() {
    this.active = true;
    this.hud.classList.add('visible');
    this.standButton.classList.remove('hidden');
    this.hint.classList.add('hidden');
    this.panel.classList.remove('visible');
    this.activeSite = null;
    this.controls.enabled = false;
    this.controls.setVisible(false);
    this.seat();
    this.applyRenderer(true);
  }

  exit() {
    this.active = false;
    this.controls.enabled = false;
    this.controls.exitLock();
    this.controls.setVisible(false);
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
      };
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.02;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.6));
      return;
    }
    if (!this._saved) return;
    renderer.toneMapping = this._saved.toneMapping;
    renderer.toneMappingExposure = this._saved.exposure;
    renderer.setPixelRatio(this._saved.pixelRatio);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(dt) {
    if (!this.ready || !this.active) return;
    if (this.state === 'seated') {
      this.applySeatCamera();
    } else if (this.state === 'rising') {
      this.riseT = Math.min(1, this.riseT + dt / 0.95);
      const ease = this.riseT < 0.5
        ? 2 * this.riseT * this.riseT
        : 1 - ((-2 * this.riseT + 2) ** 2) / 2;
      this.player.rotation.y = Math.PI * (1 - ease) + MODEL_YAW;
      this.player.position.y = -0.42 * (1 - ease);
      this.player.position.z = -1.58 + (0.4 - -1.58) * ease;
      this.applyFollowCamera();
      const followPos = this.camera.position.clone();
      const followQuat = this.camera.quaternion.clone();
      this.applySeatCamera();
      this.camera.position.lerp(followPos, ease);
      this.camera.quaternion.slerp(followQuat, ease);
      if (this.riseT >= 1) this.completeRise();
    } else {
      this.step(dt);
      this.applyFollowCamera();
    }
    this.mixer?.update(dt);
    this.sun.position.set(this.player.position.x + 18, 32, this.player.position.z + 10);
    this.sun.target.position.set(this.player.position.x, 0, this.player.position.z);
    this.sun.target.updateMatrixWorld();
    this.updateProximity();
  }

  step(dt) {
    const wish = this.controls.readMove(dt);
    const dx = wish.x * MOVE_SPEED * dt;
    const dz = wish.z * MOVE_SPEED * dt;
    this.moveCollide(dx, dz);
    this.player.position.x = clamp(this.player.position.x, -18, 36);
    this.player.position.z = clamp(this.player.position.z, -8, this.streetEnd + 8);
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
    this.camera.position.set(1.55, 1.55, 0.85);
    this.camera.lookAt(-0.05, 0.95, -1.55);
  }

  applyFollowCamera() {
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

  updateProximity() {
    if (this.state === 'seated') return;
    const x = this.player.position.x;
    const z = this.player.position.z;
    let best = null;
    let bestDist = Infinity;
    for (const site of this.sites) {
      const dist = distanceToBox(x, z, site.box);
      const radius = site.kind === 'mail' ? 2.6 : 5.2;
      if (dist < radius && dist < bestDist) {
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
      const radius = this.activeSite.kind === 'mail' ? 3.4 : 6.4;
      if (distanceToBox(x, z, this.activeSite.box) > radius) {
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
    #walk-hud { position: fixed; inset: 0; pointer-events: none; z-index: 2500; font-family: 'Courier New', monospace; color: #e9ffe9; display: none; }
    #walk-hud.visible { display: block; }
    #walk-hud button { pointer-events: auto; background: rgba(6, 20, 12, 0.88); color: #00ff41; border: 2px solid #00ff41; border-radius: 6px; padding: 8px 12px; font-family: inherit; cursor: pointer; }
    .walk-top { position: absolute; top: 14px; right: 14px; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 70%; }
    #walk-stand { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); font-size: 22px; padding: 14px 28px; box-shadow: 0 0 24px rgba(0,255,65,.35); }
    #walk-stand.hidden, #walk-hint.hidden, #walk-panel.visible.hidden { display: none; }
    #walk-hint { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); margin: 0; background: rgba(0,0,0,.55); padding: 8px 12px; border-radius: 6px; max-width: 92%; text-align: center; font-size: 13px; }
    #walk-panel { pointer-events: auto; display: none; position: absolute; top: 72px; left: 16px; width: min(420px, calc(100% - 32px)); max-height: min(58vh, 520px); overflow: auto; background: rgba(6, 16, 12, 0.9); border: 2px solid #00ff41; border-radius: 10px; padding: 14px 16px 16px; box-shadow: 0 0 24px rgba(0,255,65,.2); }
    #walk-panel.visible { display: block; }
    #walk-panel h2 { margin: 0 0 6px; font-size: 20px; color: #f3fff3; }
    #walk-panel .kicker { margin: 0; color: #00ff41; letter-spacing: .04em; text-transform: uppercase; font-size: 12px; }
    #walk-panel .meta { color: #c6e6c6; margin: 0 0 8px; }
    #walk-panel ul { margin: 8px 0 0; padding-left: 18px; }
    #walk-panel li { margin: 6px 0; line-height: 1.35; }
    #walk-touch { position: fixed; inset: 0; z-index: 2550; pointer-events: none; }
    #walk-joystick { pointer-events: auto; position: absolute; left: 16px; bottom: 16px; width: 118px; height: 118px; border-radius: 50%; border: 2px solid rgba(0,255,65,.75); background: rgba(0,0,0,.28); touch-action: none; }
    #walk-joystick-knob { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(0,255,65,.88); }
    #walk-lookpad { pointer-events: auto; position: absolute; right: 0; top: 64px; width: 52%; height: calc(100% - 190px); touch-action: none; }
  `;
  document.head.appendChild(style);
}
