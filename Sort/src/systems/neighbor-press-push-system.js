const NEIGHBOR_PRESS_MAX_RADIUS_FRAC = 0.1;
/** Fade push in over this much surface overlap once shells touch. */
const TOUCH_OVERLAP_SOFT_FRAC = 0.12;

function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function isGridFruitReady(fruit) {
  return (
    fruit?.active
    && !fruit.sliced
    && fruit.motionMode === "grid"
    && fruit.spawnState === "READY"
  );
}

function touchStrengthForOverlap(overlap, softDistance) {
  if (overlap <= 0 || softDistance <= 0) return 0;
  return smoothstep01(overlap / softDistance);
}

export function createNeighborPressPushSystem({ findGridNeighborFruits } = {}) {
  if (typeof findGridNeighborFruits !== "function") {
    throw new Error("createNeighborPressPushSystem requires findGridNeighborFruits");
  }

  function update({ state, fruits, dt: _dt }) {
    for (const fruit of fruits) {
      if (!isGridFruitReady(fruit)) continue;
      fruit.pressNeighborPushTarget?.set(0, 0);
    }

    const source = state?.pressTarget;
    if (!source || !isGridFruitReady(source) || !source.isBeingPressed) return;

    const neighbors = findGridNeighborFruits(source, fruits);
    const sx = source.group.position.x;
    const sy = source.group.position.y;
    const touchSoft = Math.max(source.radius * TOUCH_OVERLAP_SOFT_FRAC, 1e-4);

    for (const neighbor of neighbors) {
      if (!isGridFruitReady(neighbor)) continue;

      const dx = neighbor.group.position.x - sx;
      const dy = neighbor.group.position.y - sy;
      const centerDist = Math.hypot(dx, dy);
      if (centerDist < 1e-4) continue;

      const reach = source.computePressExpandedRadiusToward?.(dx, dy) ?? source.radius;
      const overlap = reach + neighbor.radius - centerDist;
      const touch = touchStrengthForOverlap(overlap, touchSoft);
      if (touch <= 0) continue;

      const maxPush = neighbor.radius * NEIGHBOR_PRESS_MAX_RADIUS_FRAC * touch;
      neighbor.pressNeighborPushTarget.set(
        (dx / centerDist) * maxPush,
        (dy / centerDist) * maxPush,
      );
    }
  }

  return { update };
}