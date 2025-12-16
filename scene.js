import * as THREE from 'three';
import { CONFIG } from './config.js';

export class HackerDeskScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.fog.color);
    this.scene.fog = new THREE.Fog(
      CONFIG.fog.color,
      CONFIG.fog.near,
      CONFIG.fog.far
    );
    
    this.textureLoader = new THREE.TextureLoader();
    this.objects = {};
    
    this.setupLighting();
    this.createRoom();
    this.createDesk();
    this.createChair();
    this.createLaptop();
    this.createWindow();
  }

  setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(
      CONFIG.colors.ambient,
      CONFIG.lighting.ambientIntensity
    );
    this.scene.add(ambient);

    // Directional light (from window)
    const directional = new THREE.DirectionalLight(0x6677cc, CONFIG.lighting.directionalIntensity);
    directional.position.set(-5, 5, 5);
    this.scene.add(directional);

    // Screen glow point light
    const screenLight = new THREE.PointLight(
      CONFIG.lighting.screenGlowColor,
      CONFIG.lighting.screenGlowIntensity,
      5
    );
    screenLight.position.set(0, 1.5, 0.5);
    this.scene.add(screenLight);
    this.objects.screenLight = screenLight;
  }

  createRoom() {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.floor,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back wall
    const wallGeo = new THREE.PlaneGeometry(20, 10);
    const wallMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.wall,
      roughness: 0.9,
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 5, -8);
    this.scene.add(backWall);

    // Side walls
    const sideWall1 = new THREE.Mesh(wallGeo, wallMat);
    sideWall1.rotation.y = Math.PI / 2;
    sideWall1.position.set(-10, 5, 0);
    this.scene.add(sideWall1);

    const sideWall2 = new THREE.Mesh(wallGeo, wallMat);
    sideWall2.rotation.y = -Math.PI / 2;
    sideWall2.position.set(10, 5, 0);
    this.scene.add(sideWall2);
  }

  createDesk() {
    const deskGroup = new THREE.Group();

    // Load wood texture
    const woodTexture = this.textureLoader.load(CONFIG.assets.deskTexture);
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(2, 1);

    // Desktop surface
    const desktopGeo = new THREE.BoxGeometry(3, 0.1, 1.5);
    const desktopMat = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const desktop = new THREE.Mesh(desktopGeo, desktopMat);
    desktop.position.y = 1;
    deskGroup.add(desktop);

    // Desk legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.9, 0.1);
    const legMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.desk,
      roughness: 0.8,
    });

    const legPositions = [
      [-1.3, 0.45, -0.6],
      [1.3, 0.45, -0.6],
      [-1.3, 0.45, 0.6],
      [1.3, 0.45, 0.6],
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(...pos);
      deskGroup.add(leg);
    });

    this.scene.add(deskGroup);
    this.objects.desk = deskGroup;
  }

  createChair() {
    const chairGroup = new THREE.Group();

    const chairMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.chair,
      roughness: 0.6,
      metalness: 0.3,
    });

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
    const seat = new THREE.Mesh(seatGeo, chairMat);
    seat.position.y = 0.6;
    chairGroup.add(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.6, 0.6, 0.1);
    const back = new THREE.Mesh(backGeo, chairMat);
    back.position.set(0, 0.9, -0.25);
    chairGroup.add(back);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6);
    const legPositions = [
      [-0.2, 0.3, 0.2],
      [0.2, 0.3, 0.2],
      [-0.2, 0.3, -0.2],
      [0.2, 0.3, -0.2],
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, chairMat);
      leg.position.set(...pos);
      chairGroup.add(leg);
    });

    chairGroup.position.set(0, 0, 2);
    this.scene.add(chairGroup);
    this.objects.chair = chairGroup;
  }

  createLaptop() {
    const laptopGroup = new THREE.Group();

    const laptopMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.laptop,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Keyboard base
    const baseGeo = new THREE.BoxGeometry(0.9, 0.03, 0.7);
    const base = new THREE.Mesh(baseGeo, laptopMat);
    base.position.set(0, 1.06, 0.1);
    laptopGroup.add(base);

    // Screen
    const screenGeo = new THREE.BoxGeometry(0.9, 0.6, 0.03);
    
    // Load screen texture
    const screenTexture = this.textureLoader.load(CONFIG.assets.screenTexture);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: CONFIG.lighting.screenGlowColor,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
    });
    
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.4, -0.2);
    screen.rotation.x = -0.3;
    laptopGroup.add(screen);

    this.scene.add(laptopGroup);
    this.objects.laptop = laptopGroup;
    this.objects.screen = screen;
  }

  createWindow() {
    const windowGroup = new THREE.Group();

    // Window frame
    const frameGeo = new THREE.BoxGeometry(2.5, 3, 0.1);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.7,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    windowGroup.add(frame);

    // Rain/glass texture
    const rainTexture = this.textureLoader.load(CONFIG.assets.rainWindow);
    const glassMat = new THREE.MeshStandardMaterial({
      map: rainTexture,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.1,
    });
    
    const glassGeo = new THREE.PlaneGeometry(2.3, 2.8);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = 0.06;
    windowGroup.add(glass);

    windowGroup.position.set(-4, 3.5, -7.9);
    this.scene.add(windowGroup);
    this.objects.window = windowGroup;
  }

  getScene() {
    return this.scene;
  }

  getObjects() {
    return this.objects;
  }

  update(time) {
    // Pulse screen glow
    if (this.objects.screenLight) {
      this.objects.screenLight.intensity = 
        CONFIG.lighting.screenGlowIntensity + 
        Math.sin(time * 0.003) * 0.3;
    }

    // Subtle screen material pulse
    if (this.objects.screen) {
      this.objects.screen.material.emissiveIntensity = 
        0.5 + Math.sin(time * 0.002) * 0.1;
    }
  }
}
