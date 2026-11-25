/**
 * Layout for the driveable career circuit. Pure data: no Three.js,
 * so the order, spacing, and spawn heading can be tested in Node.
 *
 * The road leaves the driveway heading +Z (oldest jobs first) and
 * weaves so each stop has a plaza beside the pavement.
 */

import { sortExperienceChronologically, formatSignYears, formatPanelDates } from './places.js';

export const SPAWN_YAW = -Math.PI / 2;
export const ROAD_WIDTH = 7.4;
export const PLAZA_SIDE = 16;
export const STOP_RADIUS = 11;

const START_Z = 34;
const SPACING = 36;
const AMPLITUDE = 12;

const LOOKS = {
  'United States Army': {
    parts: [
      { file: 'hq.glb', height: 8.2, dx: 0, dz: 0 },
      { file: 'barracks.glb', height: 5.2, dx: 7.5, dz: -5.4 },
      { file: 'barracks.glb', height: 5.2, dx: 7.5, dz: 0 },
      { file: 'barracks.glb', height: 5.2, dx: 7.5, dz: 5.4 },
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
  'Latitude Services': { parts: [{ file: 'tower.glb', height: 20 }] },
};

const FALLBACK_FILES = ['office-small.glb', 'shop.glb', 'brick.glb', 'glass.glb', 'office-white.glb'];

export function layoutCircuit(count) {
  const road = [
    { x: 0, z: 6.2 },
    { x: 0, z: 16 },
    { x: 0, z: 26 },
  ];
  const stops = [];
  for (let i = 0; i < count; i += 1) {
    const z = START_Z + i * SPACING;
    const x = Math.sin(i * 0.78) * AMPLITUDE;
    const prev = road[road.length - 1];
    const nextX = Math.sin((i + 1) * 0.78) * AMPLITUDE;
    const nextZ = i === count - 1 ? z + SPACING * 0.7 : START_Z + (i + 1) * SPACING;
    let tx = (i === count - 1 ? x : nextX) - prev.x;
    let tz = (i === count - 1 ? z : nextZ) - prev.z;
    if (i === count - 1) {
      tx = x - prev.x;
      tz = z - prev.z;
    }
    const len = Math.hypot(tx, tz) || 1;
    const tangent = { x: tx / len, z: tz / len };
    const right = { x: tangent.z, z: -tangent.x };
    const roadPoint = { x, z };
    const plaza = {
      x: x + right.x * PLAZA_SIDE,
      z: z + right.z * PLAZA_SIDE,
    };
    stops.push({
      index: i,
      road: roadPoint,
      plaza,
      tangent,
      right,
      zone: {
        x: (roadPoint.x + plaza.x) / 2,
        z: (roadPoint.z + plaza.z) / 2,
      },
      radius: STOP_RADIUS,
    });
    road.push(roadPoint);
  }
  const last = stops[stops.length - 1];
  if (last) {
    road.push({
      x: last.road.x + last.tangent.x * 22,
      z: last.road.z + last.tangent.z * 22,
    });
  } else {
    road.push({ x: 0, z: 48 });
  }
  return {
    road,
    stops,
    spawn: { x: 0, z: 9.2, yaw: SPAWN_YAW },
    bounds: circuitBounds(road, stops),
    spacing: SPACING,
  };
}

export function circuitBounds(road, stops) {
  let minX = -18;
  let maxX = 18;
  let minZ = -18;
  let maxZ = 48;
  const grow = (point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  };
  road.forEach(grow);
  stops.forEach((stop) => {
    grow(stop.road);
    grow(stop.plaza);
  });
  return {
    minX: minX - 22,
    maxX: maxX + 26,
    minZ: minZ - 16,
    maxZ: maxZ + 22,
  };
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1)
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

/** Smooth polyline through the control points, for the painted road. */
export function sampleCurve(points, divisions = 7) {
  if (!points.length) return [];
  if (points.length === 1) return [{ x: points[0].x, z: points[0].z }];
  const out = [];
  const steps = Math.max(1, divisions);
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        z: catmull(p0.z, p1.z, p2.z, p3.z, t),
      });
    }
  }
  const end = points[points.length - 1];
  out.push({ x: end.x, z: end.z });
  return out;
}

function jobPanel(job) {
  return {
    kicker: job.company || 'Role',
    title: job.title || job.position || '',
    meta: [formatPanelDates(job.dates), job.location, job.employmentType].filter(Boolean).join(' · '),
    bullets: job.highlights || job.description || [],
  };
}

function partsFor(company, index) {
  if (LOOKS[company]) return LOOKS[company].parts;
  return [{ file: FALLBACK_FILES[index % FALLBACK_FILES.length], height: 8 }];
}

/**
 * Oldest job first, then school and certifications as the last landmarks.
 * Every entry carries the panel copy the arrival card renders.
 */
export function describeStops(resume = {}) {
  const jobs = sortExperienceChronologically(resume.experience || []);
  const stops = jobs.map((job, index) => ({
    kind: 'job',
    parts: partsFor(job.company, index),
    title: job.company || 'Role',
    subtitle: formatSignYears(job.dates),
    panel: jobPanel(job),
  }));

  const schools = resume.education || [];
  if (schools.length) {
    stops.push({
      kind: 'education',
      parts: [{ file: 'hall.glb', height: 8 }],
      title: 'Education',
      subtitle: schools.map((edu) => edu.school || edu.institution).filter(Boolean).join(' · '),
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

  const certs = resume.certifications || [];
  if (certs.length) {
    stops.push({
      kind: 'certs',
      parts: [{ file: 'billboard.glb', height: 3.4 }],
      title: 'Certifications',
      subtitle: certs.map((cert) => cert.name).join(' · '),
      panel: {
        kicker: 'Certifications',
        title: 'Board',
        meta: '',
        bullets: certs.map((cert) => (cert.issuer ? `${cert.name} (${cert.issuer})` : cert.name)),
      },
    });
  }
  return stops;
}

export function mailboxPanel(resume = {}) {
  const contact = resume.contact || {};
  const identity = resume.identity || {};
  return {
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
  };
}
