import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_PRESETS,
  CHASE_LIMITS,
  WORLD_VIEW,
  applyPreset,
  cameraNear,
  chasePose,
  createChaseRig,
  cyclePreset,
  effectivePitch,
  fogFactor,
  fogForDistance,
  nudgeZoom,
  orbitRig,
  pinchZoom,
  presetById,
  shadowExtent,
  wheelZoom,
} from './chaseCamera.js';

test('follow framing looks down the road and stays off the ground', () => {
  const rig = createChaseRig();
  const pose = chasePose({ x: 0, y: 0.5, z: 9 }, { x: 0, z: 1 }, rig);
  assert.ok(pose.camera.z < 9, 'camera sits behind a kart facing +Z');
  assert.ok(pose.look.z > 9 + 8, 'look target is well ahead of the kart');
  assert.ok(pose.camera.y >= CHASE_LIMITS.groundY);
  const drop = pose.camera.y - pose.look.y;
  const span = pose.look.z - pose.camera.z;
  assert.ok(span > drop * 3, 'more road ahead than a downward stare');
});

test('zoom out reaches an overview and zoom in stops short of the kart', () => {
  const rig = createChaseRig();
  const start = rig.distance;
  for (let i = 0; i < 10; i += 1) nudgeZoom(rig, 1);
  assert.equal(rig.distance, CHASE_LIMITS.maxDistance);
  assert.ok(CHASE_LIMITS.maxDistance > start * 8);
  for (let i = 0; i < 16; i += 1) nudgeZoom(rig, -1);
  assert.equal(rig.distance, CHASE_LIMITS.minDistance);
  assert.ok(CHASE_LIMITS.minDistance > 5);
});

test('wheel and pinch agree on direction and stay inside the range', () => {
  const rig = createChaseRig();
  const before = rig.distance;
  wheelZoom(rig, 100);
  assert.ok(rig.distance > before);
  wheelZoom(rig, -100);
  pinchZoom(rig, 100, 220);
  assert.ok(rig.distance > before);
  pinchZoom(rig, 220, 40);
  assert.ok(rig.distance < CHASE_LIMITS.maxDistance);
  const slammed = createChaseRig();
  for (let i = 0; i < 40; i += 1) wheelZoom(slammed, 400);
  assert.equal(slammed.distance, CHASE_LIMITS.maxDistance);
});

test('presets cover follow, wide, low, and top without clipping', () => {
  const origin = { x: 2, y: 0.45, z: 12 };
  const forward = { x: 0, z: 1 };
  const follow = chasePose(origin, forward, createChaseRig());
  for (const id of ['wide', 'low', 'top']) {
    const rig = createChaseRig();
    assert.equal(applyPreset(rig, id), true);
    const pose = chasePose(origin, forward, rig);
    assert.ok(pose.camera.y >= CHASE_LIMITS.groundY);
    assert.ok(pose.back > 5);
    if (id === 'low') {
      assert.ok(pose.pitch < follow.pitch);
      assert.ok(pose.camera.y < follow.camera.y);
      assert.ok(pose.lookAhead > 16);
    }
    if (id === 'wide' || id === 'top') {
      assert.ok(pose.camera.y > follow.camera.y + 20);
      assert.ok(rig.distance > follow.back);
    }
  }
  const top = createChaseRig();
  applyPreset(top, 'top');
  const topPose = chasePose(origin, forward, top);
  assert.ok(topPose.pitch > 1.1);
});

test('scrolling out on follow lifts the angle; other presets keep theirs', () => {
  const rig = createChaseRig();
  const close = effectivePitch(rig);
  rig.distance = CHASE_LIMITS.maxDistance;
  assert.ok(effectivePitch(rig) > close + 0.45);
  applyPreset(rig, 'low');
  const lowPitch = presetById('low').pitch;
  rig.distance = CHASE_LIMITS.maxDistance;
  assert.equal(effectivePitch(rig), lowPitch);
});

test('orbit drag leaves preset mode and cannot pitch through the ground', () => {
  const rig = createChaseRig();
  orbitRig(rig, 40, -30);
  assert.equal(rig.presetId, null);
  assert.equal(rig.pitchTouched, true);
  assert.ok(rig.yaw > 0);
  assert.ok(rig.pitch > CAMERA_PRESETS[0].pitch);
  for (let i = 0; i < 80; i += 1) orbitRig(rig, 0, 50);
  assert.equal(rig.pitch, CHASE_LIMITS.minPitch);
  const pose = chasePose({ x: 0, y: -3, z: 0 }, { x: 1, z: 0 }, rig);
  assert.ok(pose.camera.y >= CHASE_LIMITS.groundY);
  for (let i = 0; i < 80; i += 1) orbitRig(rig, 0, -50);
  assert.equal(rig.pitch, CHASE_LIMITS.maxPitch);
});

test('cycling presets walks the four angles and returns to follow', () => {
  const rig = createChaseRig();
  assert.equal(cyclePreset(rig), 'wide');
  assert.equal(cyclePreset(rig), 'low');
  assert.equal(cyclePreset(rig), 'top');
  assert.equal(cyclePreset(rig), 'follow');
  orbitRig(rig, 12, 0);
  assert.equal(cyclePreset(rig), 'follow');
});

test('fog, shadows, and clip planes stay useful from bumper cam to overview', () => {
  assert.ok(WORLD_VIEW.fogFarMax < WORLD_VIEW.skyRadius);
  assert.ok(WORLD_VIEW.skyRadius < WORLD_VIEW.cameraFar);
  let previousShadow = 0;
  for (const distance of [CHASE_LIMITS.minDistance, 16.5, 80, 188, CHASE_LIMITS.maxDistance]) {
    const fog = fogForDistance(distance);
    assert.ok(fog.near < fog.far);
    assert.ok(fog.far <= WORLD_VIEW.fogFarMax);
    assert.ok(fogFactor(distance, fog) < 0.2, `subject at ${distance} should not wash out`);
    const extent = shadowExtent(distance);
    assert.ok(extent >= previousShadow);
    assert.ok(extent <= 150);
    previousShadow = extent;
    const near = cameraNear(distance);
    assert.ok(near >= 0.1 && near <= 5);
    assert.ok(near * 40 < WORLD_VIEW.cameraFar);
  }
  assert.ok(shadowExtent(400, true) <= 64);
  assert.ok(shadowExtent(400) > shadowExtent(16.5));
});
