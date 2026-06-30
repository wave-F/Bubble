import * as THREE from "three/webgpu";

const RING_SEGMENTS = 48;
const STAR_SEGMENTS = 80;
const CROSS_SEGMENTS = 64;
const STAR_TIP_ROUNDNESS = 0.58;
const STAR_VALLEY_RATIO = 0.48;
const CROSS_CORNER_ROUND = 0.42;

function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function buildBandGeometry(outerPoints, innerPoints) {
  const n = outerPoints.length;
  if (n < 3 || innerPoints.length !== n) {
    return new THREE.BufferGeometry();
  }

  const positions = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i += 1) {
    const o = outerPoints[i];
    const inn = innerPoints[i];
    positions[i * 6] = o.x;
    positions[i * 6 + 1] = o.y;
    positions[i * 6 + 2] = 0;
    positions[i * 6 + 3] = inn.x;
    positions[i * 6 + 4] = inn.y;
    positions[i * 6 + 5] = 0;
  }

  const indices = [];
  for (let i = 0; i < n; i += 1) {
    const next = (i + 1) % n;
    const o0 = i * 2;
    const i0 = i * 2 + 1;
    const o1 = next * 2;
    const i1 = next * 2 + 1;
    indices.push(o0, o1, i1);
    indices.push(o0, i1, i0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function starRadiusAt(theta, tipRadius, valleyRadius, roundness) {
  const wave = Math.cos(4 * theta);
  const mix = (wave + 1) * 0.5;
  const smooth = smoothstep01(mix);
  const blended = mix * (1 - roundness) + smooth * roundness;
  return valleyRadius + (tipRadius - valleyRadius) * blended;
}

function sampleRoundedStar(tipRadius, valleyRadius, segments, roundness) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const theta = -Math.PI / 2 + (i / segments) * Math.PI * 2;
    const r = starRadiusAt(theta, tipRadius, valleyRadius, roundness);
    points.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
    });
  }
  return points;
}

function sampleRoundedCross(armHalfLength, armHalfWidth, cornerRound, segments) {
  const points = [];
  const L = armHalfLength;
  const W = armHalfWidth;
  const cr = Math.min(cornerRound, W * 0.95, L * 0.25);

  const corners = [
    { cx: W - cr, cy: L - cr, a0: 0, a1: Math.PI / 2 },
    { cx: -(W - cr), cy: L - cr, a0: Math.PI / 2, a1: Math.PI },
    { cx: -(W - cr), cy: -(L - cr), a0: Math.PI, a1: Math.PI * 1.5 },
    { cx: W - cr, cy: -(L - cr), a0: Math.PI * 1.5, a1: Math.PI * 2 },
  ];

  const perCorner = Math.max(4, Math.floor(segments / 8));
  const perStraight = Math.max(2, Math.floor(segments / 16));

  function pushArc(cx, cy, a0, a1) {
    for (let k = 0; k <= perCorner; k += 1) {
      const t = k / perCorner;
      const a = a0 + (a1 - a0) * t;
      points.push({
        x: cx + Math.cos(a) * cr,
        y: cy + Math.sin(a) * cr,
      });
    }
  }

  function pushLine(x0, y0, x1, y1) {
    for (let k = 1; k <= perStraight; k += 1) {
      const t = k / perStraight;
      points.push({
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t,
      });
    }
  }

  pushArc(W - cr, L - cr, 0, Math.PI / 2);
  pushLine(W, L, -W, L);
  pushArc(-(W - cr), L - cr, Math.PI / 2, Math.PI);
  pushLine(-W, L, -W, -L);
  pushArc(-(W - cr), -(L - cr), Math.PI, Math.PI * 1.5);
  pushLine(-W, -L, W, -L);
  pushArc(W - cr, -(L - cr), Math.PI * 1.5, Math.PI * 2);
  pushLine(W, -L, W, L);

  return points;
}

function resampleClosedLoop(points, targetCount) {
  if (points.length < 3) return points;

  const lengths = [];
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    const dx = next.x - points[i].x;
    const dy = next.y - points[i].y;
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }

  const result = [];
  let dist = 0;
  let seg = 0;
  let segT = 0;

  for (let i = 0; i < targetCount; i += 1) {
    const target = (i / targetCount) * total;
    while (dist + lengths[seg] * (1 - segT) < target && seg < points.length) {
      dist += lengths[seg] * (1 - segT);
      segT = 0;
      seg = (seg + 1) % points.length;
    }
    const segLen = lengths[seg] || 1e-6;
    const localT = segT + (target - dist) / segLen;
    const p0 = points[seg];
    const p1 = points[(seg + 1) % points.length];
    const t = Math.max(0, Math.min(1, localT));
    result.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
    });
    segT = t;
  }

  return result;
}

function createStarBandGeometry(innerRadius, outerRadius) {
  const outerValley = outerRadius * STAR_VALLEY_RATIO;
  const innerValley = innerRadius * STAR_VALLEY_RATIO;
  const outer = sampleRoundedStar(
    outerRadius,
    outerValley,
    STAR_SEGMENTS,
    STAR_TIP_ROUNDNESS,
  );
  const inner = sampleRoundedStar(
    innerRadius,
    innerValley,
    STAR_SEGMENTS,
    STAR_TIP_ROUNDNESS,
  );
  return buildBandGeometry(outer, inner);
}

function createCrossBandGeometry(innerRadius, outerRadius) {
  const thickness = Math.max(outerRadius - innerRadius, 0.02);
  const outerHalfWidth = thickness * 0.5;
  const innerHalfWidth = Math.max(outerHalfWidth * (innerRadius / outerRadius), 0.01);
  const corner = thickness * CROSS_CORNER_ROUND;

  let outer = sampleRoundedCross(outerRadius, outerHalfWidth, corner, CROSS_SEGMENTS);
  let inner = sampleRoundedCross(innerRadius, innerHalfWidth, corner * (innerRadius / outerRadius), CROSS_SEGMENTS);
  const count = Math.max(outer.length, inner.length, 32);
  outer = resampleClosedLoop(outer, count);
  inner = resampleClosedLoop(inner, count);
  return buildBandGeometry(outer, inner);
}

/**
 * @param {"ring"|"cross"|"roundedStar"} shape
 */
export function createPopRingGeometry(shape, innerRadius, outerRadius) {
  const inner = Math.max(0.01, innerRadius);
  let outer = Math.max(inner + 0.01, outerRadius);

  if (shape === "cross") {
    return createCrossBandGeometry(inner, outer);
  }
  if (shape === "roundedStar") {
    return createStarBandGeometry(inner, outer);
  }
  return new THREE.RingGeometry(inner, outer, RING_SEGMENTS);
}