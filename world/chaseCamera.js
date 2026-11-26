/**
 * Drive-camera rig for the career circuit.
 * Distance, pitch, and yaw are plain numbers so the framing, zoom
 * limits, and fog/shadow ranges can be tested without Three.js.
 *
 * Pitch is elevation above the horizon (0 = level behind the kart,
 * ~π/2 = overhead). Yaw orbits around the subject. The follow preset
 * eases pitch up as distance grows so a scroll-out becomes an overview
 * instead of a mile-long bumper cam.
 */

export const WORLD_VIEW = {
  cameraFar: 2800,
  skyRadius: 1700,
  fogFarMax: 1200,
};

export const CHASE_LIMITS = {
  minDistance: 6.8,
  maxDistance: 250,
  minPitch: 0.08,
  maxPitch: 1.48,
  minHeight: 0.92,
  groundY: 0.85,
  wheel: 0.0025,
  clickZoom: 1.38,
  orbitYaw: 0.0052,
  orbitPitch: 0.0038,
};

export const CAMERA_PRESETS = [
  {
    id: 'follow',
    label: 'Follow',
    title: 'Follow chase (1)',
    distance: 14.5,
    pitch: 0.5,
    yaw: 0,
    lookAhead: 15,
    lookHeight: 1.55,
    fov: 52,
  },
  {
    id: 'wide',
    label: 'Wide',
    title: 'Wide overview (2)',
    distance: 108,
    pitch: 0.92,
    yaw: 0.62,
    lookAhead: 26,
    lookHeight: 4.2,
    fov: 54,
  },
  {
    id: 'low',
    label: 'Low',
    title: 'Low cinematic (3)',
    distance: 9.6,
    pitch: 0.16,
    yaw: 0.05,
    lookAhead: 26,
    lookHeight: 1.15,
    fov: 42,
  },
  {
    id: 'top',
    label: 'Top',
    title: 'Top-down (4)',
    distance: 188,
    pitch: 1.36,
    yaw: 0.18,
    lookAhead: 1.6,
    lookHeight: 0.5,
    fov: 48,
  },
];

export function presetById(id) {
  return CAMERA_PRESETS.find((preset) => preset.id === id) || null;
}

export function createChaseRig() {
  const rig = {
    distance: 0,
    pitch: 0,
    yaw: 0,
    lookAhead: 0,
    lookHeight: 0,
    fov: 50,
    presetId: null,
    pitchTouched: false,
  };
  resetChase(rig);
  return rig;
}

export function resetChase(rig) {
  return applyPreset(rig, 'follow');
}

export function applyPreset(rig, id) {
  const preset = presetById(id);
  if (!preset) return false;
  rig.distance = preset.distance;
  rig.pitch = preset.pitch;
  rig.yaw = preset.yaw;
  rig.lookAhead = preset.lookAhead;
  rig.lookHeight = preset.lookHeight;
  rig.fov = preset.fov;
  rig.presetId = preset.id;
  rig.pitchTouched = false;
  return true;
}

export function cyclePreset(rig) {
  const ids = CAMERA_PRESETS.map((preset) => preset.id);
  const index = ids.indexOf(rig.presetId);
  const next = ids[(index + 1) % ids.length];
  applyPreset(rig, next);
  return next;
}

export function clampDistance(distance) {
  return clamp(distance, CHASE_LIMITS.minDistance, CHASE_LIMITS.maxDistance);
}

export function wheelZoom(rig, deltaY) {
  const dy = clamp(deltaY, -160, 160);
  rig.distance = clampDistance(rig.distance * Math.exp(dy * CHASE_LIMITS.wheel));
  return rig.distance;
}

export function nudgeZoom(rig, direction) {
  const factor = direction < 0 ? (1 / CHASE_LIMITS.clickZoom) : CHASE_LIMITS.clickZoom;
  rig.distance = clampDistance(rig.distance * factor);
  return rig.distance;
}

export function pinchZoom(rig, previousSpan, nextSpan) {
  if (!(previousSpan > 0) || !(nextSpan > 0)) return rig.distance;
  rig.distance = clampDistance(rig.distance * (nextSpan / previousSpan));
  return rig.distance;
}

export function orbitRig(rig, dx, dy) {
  rig.yaw = wrapAngle(rig.yaw + dx * CHASE_LIMITS.orbitYaw);
  rig.pitch = clamp(rig.pitch - dy * CHASE_LIMITS.orbitPitch, CHASE_LIMITS.minPitch, CHASE_LIMITS.maxPitch);
  rig.pitchTouched = true;
  rig.presetId = null;
  return rig;
}

/** Follow-only: scrolling out lifts the lens so the island opens up. */
export function effectivePitch(rig) {
  if (rig.presetId === 'follow' && !rig.pitchTouched) {
    const start = 22;
    const span = CHASE_LIMITS.maxDistance - start;
    const t = clamp((rig.distance - start) / span, 0, 1);
    return clamp(rig.pitch + t * 0.9, CHASE_LIMITS.minPitch, CHASE_LIMITS.maxPitch);
  }
  return rig.pitch;
}

export function flattenHeading(x, z) {
  const len = Math.hypot(x, z);
  if (len < 1e-4) return { x: 1, z: 0 };
  return { x: x / len, z: z / len };
}

/**
 * @param {{x:number,y:number,z:number}} origin
 * @param {{x:number,z:number}} forward horizontal heading, any length
 */
export function chasePose(origin, forward, rig, pitchAdd = 0) {
  const heading = flattenHeading(forward.x, forward.z);
  const pitch = clamp(effectivePitch(rig) + pitchAdd, CHASE_LIMITS.minPitch, CHASE_LIMITS.maxPitch);
  const back = rig.distance * Math.cos(pitch);
  const height = Math.max(CHASE_LIMITS.minHeight, rig.distance * Math.sin(pitch));
  const cos = Math.cos(rig.yaw);
  const sin = Math.sin(rig.yaw);
  const bx = -heading.x * cos - heading.z * sin;
  const bz = -heading.z * cos + heading.x * sin;
  const lookingForward = Math.abs(wrapAngle(rig.yaw)) < 1.15;
  const lookAhead = lookingForward ? rig.lookAhead : Math.min(rig.lookAhead, 2.4);
  return {
    camera: {
      x: origin.x + bx * back,
      y: Math.max(CHASE_LIMITS.groundY, origin.y + height),
      z: origin.z + bz * back,
    },
    look: {
      x: origin.x + heading.x * lookAhead,
      y: origin.y + rig.lookHeight,
      z: origin.z + heading.z * lookAhead,
    },
    fov: rig.fov,
    pitch,
    height,
    back,
    lookAhead,
  };
}

export function fogForDistance(distance) {
  const far = clamp(150 + distance * 4.6, 260, WORLD_VIEW.fogFarMax);
  const near = clamp(42 + distance * 0.42, 42, far * 0.58);
  return { near, far };
}

export function fogFactor(distance, fog) {
  if (distance <= fog.near) return 0;
  if (distance >= fog.far) return 1;
  return (distance - fog.near) / (fog.far - fog.near);
}

export function shadowExtent(distance, mobile = false) {
  const cap = mobile ? 64 : 150;
  return clamp(18 + distance * 0.48, 20, cap);
}

export function cameraNear(distance) {
  return clamp(distance * 0.015, 0.1, 5);
}

export function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
