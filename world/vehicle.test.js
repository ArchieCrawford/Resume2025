import test from 'node:test';
import assert from 'node:assert/strict';
import { Body, Box, Vec3 } from './vendor/cannon-es.js';
import { createKart, createPhysicsWorld } from './vehicle.js';
import { SPAWN_YAW } from './circuit.js';

function drive(kart, world, input, frames) {
  let peak = 0;
  for (let i = 0; i < frames; i += 1) {
    kart.applyControls(input, 1 / 60);
    world.step(1 / 60);
    peak = Math.max(peak, kart.chassis.position.y);
  }
  return peak;
}

test('throttle rolls the kart forward, stays upright, and shoves a crate', () => {
  const physics = createPhysicsWorld();
  const kart = createKart(physics.world, physics.materials);
  kart.spawn(0, 0.75, 0, 0);
  const crate = new Body({ mass: 1.4 });
  crate.addShape(new Box(new Vec3(0.4, 0.4, 0.4)));
  crate.position.set(6.5, 0.45, 0);
  physics.world.addBody(crate);

  drive(kart, physics.world, { throttle: 1, steer: 0, brake: 0 }, 150);

  assert.ok(kart.chassis.position.x > 10, `expected forward travel, x=${kart.chassis.position.x}`);
  assert.ok(Math.abs(kart.speedKmh()) <= 48, `speed ran away: ${kart.speedKmh()}`);
  assert.ok(kart.upright() > 0.8, `kart flipped: up=${kart.upright()}`);
  assert.ok(crate.position.x > 8, `crate was not knocked, x=${crate.position.x}`);
});

test('brakes bring the kart back down from speed', () => {
  const physics = createPhysicsWorld();
  const kart = createKart(physics.world, physics.materials);
  kart.spawn(0, 0.75, 0, 0);
  drive(kart, physics.world, { throttle: 1, steer: 0, brake: 0 }, 90);
  assert.ok(Math.abs(kart.speedKmh()) > 15);
  drive(kart, physics.world, { throttle: 0, steer: 0, brake: 1 }, 90);
  assert.ok(Math.abs(kart.speedKmh()) < 8, `still moving at ${kart.speedKmh()}`);
});

test('driveway yaw sends positive throttle down +Z', () => {
  const physics = createPhysicsWorld();
  const kart = createKart(physics.world, physics.materials);
  kart.spawn(0, 0.75, 9.2, SPAWN_YAW);
  const forward = { x: 1, y: 0, z: 0 };
  kart.chassis.vectorToWorldFrame(forward, forward);
  assert.ok(forward.z > 0.9 && Math.abs(forward.x) < 0.15);
  drive(kart, physics.world, { throttle: 1, steer: 0, brake: 0 }, 120);
  assert.ok(kart.chassis.position.z > 16, `z=${kart.chassis.position.z}`);
});

test('steering leaves the straight', () => {
  const physics = createPhysicsWorld();
  const kart = createKart(physics.world, physics.materials);
  kart.spawn(0, 0.75, 0, 0);
  drive(kart, physics.world, { throttle: 1, steer: 1, brake: 0 }, 150);
  assert.ok(Math.abs(kart.chassis.position.z) > 1.5, `z=${kart.chassis.position.z}`);
  assert.ok(kart.upright() > 0.45);
});
