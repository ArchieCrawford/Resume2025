import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { layoutCircuit, sampleCurve, describeStops, SPAWN_YAW } from './circuit.js';

test('spawn faces down the driveway and stops run oldest toward +Z', () => {
  const layout = layoutCircuit(4);
  assert.equal(layout.spawn.yaw, SPAWN_YAW);
  assert.ok(layout.spawn.z > 6 && layout.spawn.z < 14);
  const zs = layout.stops.map((stop) => stop.road.z);
  for (let i = 1; i < zs.length; i += 1) assert.ok(zs[i] > zs[i - 1]);
  for (const stop of layout.stops) {
    const offset = Math.hypot(stop.plaza.x - stop.road.x, stop.plaza.z - stop.road.z);
    assert.ok(offset > 12 && offset < 20);
    const cover = Math.hypot(stop.zone.x - stop.road.x, stop.zone.z - stop.road.z);
    assert.ok(cover < stop.radius, 'driving the road should enter the landmark');
  }
});

test('sampled road starts on the driveway and reaches the last control point', () => {
  const layout = layoutCircuit(3);
  const curve = sampleCurve(layout.road, 4);
  assert.ok(curve.length > layout.road.length);
  assert.ok(Math.hypot(curve[0].x - layout.road[0].x, curve[0].z - layout.road[0].z) < 0.01);
  const end = layout.road[layout.road.length - 1];
  const last = curve[curve.length - 1];
  assert.ok(Math.hypot(last.x - end.x, last.z - end.z) < 0.01);
});

test('resume landmarks stay in career order and keep panel copy', () => {
  const resume = JSON.parse(fs.readFileSync(new URL('../resume.json', import.meta.url), 'utf8'));
  const stops = describeStops(resume);
  assert.equal(stops[0].title, 'United States Army');
  assert.equal(stops[0].panel.title, 'Company Commander / Project Manager');
  assert.equal(stops[0].parts[0].file, 'hq.glb');
  const latitude = stops.find((stop) => stop.title === 'Latitude Services');
  assert.ok(latitude);
  assert.equal(latitude.parts[0].file, 'tower.glb');
  assert.equal(latitude.panel.kicker, 'Latitude Services');
  assert.ok(latitude.panel.bullets.length >= 3);
  assert.equal(stops.at(-2).kind, 'education');
  assert.equal(stops.at(-1).kind, 'certs');
  assert.ok(stops.at(-1).panel.bullets.some((line) => line.includes('Security+')));
  const titles = stops.filter((stop) => stop.kind === 'job').map((stop) => stop.title);
  assert.deepEqual(titles, [
    'United States Army',
    'AT&T',
    'Dell SecureWorks',
    'Data Path',
    'American Express',
    'Unisys',
    'Community Loans of America',
    'Ace Group LLC',
    'Moderna',
    'Latitude Services',
  ]);
});
