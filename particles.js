import * as THREE from 'three';
import { CONFIG } from './config.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.velocities = [];
    
    this.createParticles();
  }

  createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.particles.count * 3);
    
    // Initialize particles with random positions
    for (let i = 0; i < CONFIG.particles.count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * CONFIG.particles.spread.x;
      positions[i3 + 1] = Math.random() * CONFIG.particles.spread.y;
      positions[i3 + 2] = (Math.random() - 0.5) * CONFIG.particles.spread.z;
      
      // Store velocities for animation
      this.velocities.push({
        x: (Math.random() - 0.5) * CONFIG.particles.speed,
        y: -Math.random() * CONFIG.particles.speed * 0.5,
        z: (Math.random() - 0.5) * CONFIG.particles.speed,
      });
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: CONFIG.particles.color,
      size: CONFIG.particles.size,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update() {
    const positions = this.particles.geometry.attributes.position.array;
    
    for (let i = 0; i < CONFIG.particles.count; i++) {
      const i3 = i * 3;
      const velocity = this.velocities[i];
      
      // Update positions
      positions[i3] += velocity.x;
      positions[i3 + 1] += velocity.y;
      positions[i3 + 2] += velocity.z;
      
      // Wrap particles around the scene
      const halfX = CONFIG.particles.spread.x / 2;
      const halfZ = CONFIG.particles.spread.z / 2;
      
      if (positions[i3] < -halfX) positions[i3] = halfX;
      if (positions[i3] > halfX) positions[i3] = -halfX;
      if (positions[i3 + 1] < 0) positions[i3 + 1] = CONFIG.particles.spread.y;
      if (positions[i3 + 1] > CONFIG.particles.spread.y) positions[i3 + 1] = 0;
      if (positions[i3 + 2] < -halfZ) positions[i3 + 2] = halfZ;
      if (positions[i3 + 2] > halfZ) positions[i3 + 2] = -halfZ;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
  }
}
