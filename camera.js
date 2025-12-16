import * as THREE from 'three';
import { CONFIG } from './config.js';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.isAnimating = false;
    this.animationStartTime = 0;
    
    // Set initial cinematic position
    this.camera.position.set(
      CONFIG.camera.cinematic.position.x,
      CONFIG.camera.cinematic.position.y,
      CONFIG.camera.cinematic.position.z
    );
    
    this.camera.lookAt(
      CONFIG.camera.cinematic.lookAt.x,
      CONFIG.camera.cinematic.lookAt.y,
      CONFIG.camera.cinematic.lookAt.z
    );
  }

  startAnimation(delayMs = CONFIG.camera.delayBeforeAnimation) {
    setTimeout(() => {
      this.isAnimating = true;
      this.animationStartTime = Date.now();
    }, delayMs);
  }

  update() {
    if (!this.isAnimating) return;

    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / CONFIG.camera.animationDuration, 1);
    
    // Ease-in-out function
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Interpolate position
    this.camera.position.x = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.position.x,
      CONFIG.camera.closeup.position.x,
      easeProgress
    );
    this.camera.position.y = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.position.y,
      CONFIG.camera.closeup.position.y,
      easeProgress
    );
    this.camera.position.z = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.position.z,
      CONFIG.camera.closeup.position.z,
      easeProgress
    );

    // Interpolate look-at target
    const lookAtX = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.lookAt.x,
      CONFIG.camera.closeup.lookAt.x,
      easeProgress
    );
    const lookAtY = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.lookAt.y,
      CONFIG.camera.closeup.lookAt.y,
      easeProgress
    );
    const lookAtZ = THREE.MathUtils.lerp(
      CONFIG.camera.cinematic.lookAt.z,
      CONFIG.camera.closeup.lookAt.z,
      easeProgress
    );

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);

    // Stop animation when complete
    if (progress >= 1) {
      this.isAnimating = false;
    }

    return progress;
  }

  getCameraProgress() {
    if (!this.isAnimating) {
      const elapsed = Date.now() - this.animationStartTime;
      if (elapsed > 0) return 1; // Animation finished
      return 0; // Not started
    }
    
    const elapsed = Date.now() - this.animationStartTime;
    return Math.min(elapsed / CONFIG.camera.animationDuration, 1);
  }
}
