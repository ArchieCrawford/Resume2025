/**
 * Bouncy raycast kart on cannon-es.
 * The chassis local +X axis is forward. SPAWN_YAW from circuit.js
 * turns that axis onto world +Z so the kart leaves the driveway
 * heading down the career road.
 */

import {
  Body,
  Box,
  Cylinder,
  Material,
  ContactMaterial,
  Plane,
  RaycastVehicle,
  SAPBroadphase,
  Sphere,
  Vec3,
  World,
} from './vendor/cannon-es.js';

const MAX_FORWARD_KMH = 40;
const MAX_REVERSE_KMH = 16;

export function createPhysicsWorld() {
  const world = new World({ gravity: new Vec3(0, -9.82, 0) });
  world.broadphase = new SAPBroadphase(world);
  world.broadphase.axisIndex = 0;
  world.allowSleep = true;
  world.solver.iterations = 6;

  const ground = new Material('ground');
  const chassis = new Material('chassis');
  const prop = new Material('prop');
  const ball = new Material('ball');
  world.defaultContactMaterial.friction = 0.28;
  world.addContactMaterial(new ContactMaterial(ground, chassis, { friction: 0.42, restitution: 0.02 }));
  world.addContactMaterial(new ContactMaterial(ground, prop, { friction: 0.42, restitution: 0.12 }));
  world.addContactMaterial(new ContactMaterial(ground, ball, { friction: 0.18, restitution: 0.86 }));
  world.addContactMaterial(new ContactMaterial(chassis, prop, { friction: 0.18, restitution: 0.22 }));
  world.addContactMaterial(new ContactMaterial(chassis, ball, { friction: 0.12, restitution: 0.72 }));
  world.addContactMaterial(new ContactMaterial(prop, prop, { friction: 0.35, restitution: 0.08 }));

  const groundBody = new Body({ mass: 0, material: ground });
  groundBody.addShape(new Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  return {
    world,
    materials: { ground, chassis, prop, ball },
  };
}

export function createKart(world, materials, options = {}) {
  const subdued = !!options.subdued;
  const half = new Vec3(1.12, 0.32, 0.64);
  const chassis = new Body({ mass: subdued ? 180 : 128, material: materials.chassis });
  chassis.addShape(new Box(half));
  chassis.linearDamping = 0.16;
  chassis.angularDamping = subdued ? 0.7 : 0.42;
  chassis.allowSleep = false;

  const vehicle = new RaycastVehicle({ chassisBody: chassis });
  const wheel = {
    radius: 0.3,
    directionLocal: new Vec3(0, -1, 0),
    suspensionStiffness: subdued ? 55 : 24,
    suspensionRestLength: subdued ? 0.16 : 0.26,
    frictionSlip: subdued ? 4.5 : 2.7,
    dampingRelaxation: 2.6,
    dampingCompression: subdued ? 5 : 3.4,
    maxSuspensionForce: 100000,
    rollInfluence: subdued ? 0.02 : 0.14,
    axleLocal: new Vec3(0, 0, 1),
    maxSuspensionTravel: subdued ? 0.08 : 0.28,
    customSlidingRotationalSpeed: -28,
    useCustomSlidingRotationalSpeed: true,
  };
  const points = [
    [0.78, 0.02, 0.62],
    [0.78, 0.02, -0.62],
    [-0.78, 0.02, 0.62],
    [-0.78, 0.02, -0.62],
  ];
  for (const [x, y, z] of points) {
    vehicle.addWheel({
      ...wheel,
      chassisConnectionPointLocal: new Vec3(x, y, z),
    });
  }
  vehicle.addToWorld(world);

  const kart = {
    chassis,
    vehicle,
    steer: 0,
    spawn,
    applyControls,
    speedKmh,
    upright,
    forwardYaw,
  };

  function spawn(x, y, z, yaw) {
    chassis.position.set(x, y, z);
    chassis.velocity.set(0, 0, 0);
    chassis.angularVelocity.set(0, 0, 0);
    chassis.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), yaw);
    chassis.wakeUp();
    kart.steer = 0;
    for (let i = 0; i < 4; i += 1) {
      vehicle.setBrake(0, i);
      vehicle.applyEngineForce(0, i);
      vehicle.setSteeringValue(0, i);
    }
  }

  function speedKmh() {
    return vehicle.currentVehicleSpeedKmHour;
  }

  function upright() {
    const up = new Vec3(0, 1, 0);
    chassis.vectorToWorldFrame(up, up);
    return up.y;
  }

  function forwardYaw() {
    const forward = new Vec3(1, 0, 0);
    chassis.vectorToWorldFrame(forward, forward);
    return Math.atan2(-forward.z, forward.x);
  }

  function applyControls(input, dt) {
    const throttle = clamp(input.throttle || 0, -1, 1);
    const steerInput = clamp(input.steer || 0, -1, 1);
    const brakeInput = clamp(input.brake || 0, 0, 1);
    const speed = vehicle.currentVehicleSpeedKmHour;
    let force = 0;
    if (brakeInput < 0.5 && throttle > 0 && speed < MAX_FORWARD_KMH) {
      const ease = 1 - Math.max(0, speed) / MAX_FORWARD_KMH * 0.45;
      force = (subdued ? 640 : 860) * throttle * ease;
    } else if (brakeInput < 0.5 && throttle < 0 && speed > -MAX_REVERSE_KMH) {
      force = 480 * throttle;
    }
    vehicle.applyEngineForce(force, 2);
    vehicle.applyEngineForce(force, 3);
    vehicle.applyEngineForce(0, 0);
    vehicle.applyEngineForce(0, 1);

    const target = steerInput * (subdued ? 0.32 : 0.48);
    const follow = 1 - Math.exp(-(subdued ? 10 : 7) * Math.max(0.001, dt));
    kart.steer += (target - kart.steer) * follow;
    vehicle.setSteeringValue(kart.steer, 0);
    vehicle.setSteeringValue(kart.steer, 1);

    const brake = brakeInput > 0 ? 8 + brakeInput * 14 : 0;
    for (let i = 0; i < 4; i += 1) vehicle.setBrake(brake, i);
    if (vehicle.numWheelsOnGround < 2 && Math.abs(throttle) > 0.5) {
      chassis.velocity.y = Math.max(chassis.velocity.y, 3.2);
    }
  }

  return kart;
}

export function addStaticBox(world, material, cx, cy, cz, hx, hy, hz) {
  const body = new Body({ mass: 0, material });
  body.addShape(new Box(new Vec3(Math.max(0.04, hx), Math.max(0.04, hy), Math.max(0.04, hz))));
  body.position.set(cx, cy, cz);
  world.addBody(body);
  return body;
}

export function addStaticAabb(physics, box, pad = 0) {
  const hx = (box.max.x - box.min.x) / 2 + pad;
  const hy = (box.max.y - box.min.y) / 2 + pad;
  const hz = (box.max.z - box.min.z) / 2 + pad;
  return addStaticBox(
    physics.world,
    physics.materials.ground,
    (box.max.x + box.min.x) / 2,
    (box.max.y + box.min.y) / 2,
    (box.max.z + box.min.z) / 2,
    hx,
    hy,
    hz,
  );
}

export function addStaticCylinder(world, material, x, y, z, radius, height) {
  const body = new Body({ mass: 0, material });
  body.addShape(new Cylinder(radius, radius, height, 8));
  body.position.set(x, y, z);
  world.addBody(body);
  return body;
}

export function addDynamicBox(world, material, spec) {
  const body = new Body({ mass: spec.mass, material, allowSleep: true });
  body.addShape(new Box(new Vec3(spec.hx, spec.hy, spec.hz)));
  body.position.set(spec.x, spec.y, spec.z);
  body.linearDamping = spec.damping ?? 0.14;
  body.angularDamping = spec.damping ?? 0.16;
  body.sleepSpeedLimit = 0.22;
  body.sleepTimeLimit = 0.4;
  world.addBody(body);
  return body;
}

export function addDynamicSphere(world, material, spec) {
  const body = new Body({ mass: spec.mass, material, allowSleep: true });
  body.addShape(new Sphere(spec.radius));
  body.position.set(spec.x, spec.y, spec.z);
  body.linearDamping = spec.damping ?? 0.04;
  body.angularDamping = spec.damping ?? 0.04;
  body.sleepSpeedLimit = 0.15;
  body.sleepTimeLimit = 0.45;
  world.addBody(body);
  return body;
}

export function addDynamicCylinder(world, material, spec) {
  const body = new Body({ mass: spec.mass, material, allowSleep: true });
  body.addShape(new Cylinder(spec.radiusTop, spec.radiusBottom, spec.height, spec.segments || 8));
  body.position.set(spec.x, spec.y, spec.z);
  body.linearDamping = spec.damping ?? 0.12;
  body.angularDamping = spec.damping ?? 0.12;
  body.sleepSpeedLimit = 0.2;
  body.sleepTimeLimit = 0.4;
  world.addBody(body);
  return body;
}

export function syncMesh(mesh, body) {
  mesh.position.set(body.position.x, body.position.y, body.position.z);
  const q = body.quaternion;
  mesh.quaternion.set(q.x, q.y, q.z, q.w);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
