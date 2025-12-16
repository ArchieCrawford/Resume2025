// Configuration constants for the hacker desk scene
export const CONFIG = {
  // Scene colors
  colors: {
    floor: 0x1a1a2e,
    wall: 0x16213e,
    desk: 0x4a3428,
    chair: 0x2d2d2d,
    laptop: 0x1c1c1c,
    screen: 0x00ff41,
    ambient: 0x404060,
  },

  // Camera animation
  camera: {
    cinematic: {
      position: { x: -8, y: 5, z: 10 },
      lookAt: { x: 0, y: 1, z: 0 },
    },
    closeup: {
      position: { x: 0, y: 2.5, z: 3.5 },
      lookAt: { x: 0, y: 1.5, z: 0 },
    },
    animationDuration: 3000, // ms
    delayBeforeAnimation: 500, // ms
  },

  // Particle system
  particles: {
    count: 150,
    size: 0.02,
    spread: { x: 15, y: 6, z: 15 },
    speed: 0.0002,
    color: 0x99ccff,
  },

  // Lighting
  lighting: {
    ambientIntensity: 0.3,
    directionalIntensity: 0.5,
    screenGlowIntensity: 2,
    screenGlowColor: 0x00ff41,
  },

  // Fog
  fog: {
    color: 0x0a0a15,
    near: 8,
    far: 25,
  },

  // Asset URLs
  assets: {
    deskTexture: 'https://rosebud.ai/assets/desk-wood-texture.webp?30PJ',
    rainWindow: 'https://rosebud.ai/assets/rain-window-overlay.webp?wd42',
    screenTexture: 'https://rosebud.ai/assets/code-screen-texture.webp?joF7',
  },
};
