import * as THREE from "three/webgpu";
import { DIRECTION_DELTA } from "./mechanism-dye-logic.js";
import {
  ARROW_MS_PER_CELL,
  ARROW_TRAVEL_Z,
  GRID_BUBBLE_RENDER_ORDER,
  createMechanismArrow,
  prepareProjectileArrowDraw,
} from "../entities/mechanism-arrow-visual.js";

const MS_PER_CELL = ARROW_MS_PER_CELL;
const ARROW_POOL_SIZE = 4;

function liftBubbleDrawOrder(fruit) {
  if (!fruit?.bubble) return;
  fruit.bubble.renderOrder = GRID_BUBBLE_RENDER_ORDER;
}

const workAxis = new THREE.Vector3();
const workPos = new THREE.Vector3();
const workStart = new THREE.Vector3();
const workEnd = new THREE.Vector3();

function gridDirectionToWorld(direction, target = workAxis) {
  switch (direction) {
    case "right":
      return target.set(1, 0, 0);
    case "left":
      return target.set(-1, 0, 0);
    case "up":
      return target.set(0, 1, 0);
    case "down":
      return target.set(0, -1, 0);
    default:
      return target.set(0, 1, 0);
  }
}

function isGridTarget(fruit) {
  return fruit?.motionMode === "grid" && fruit.active && !fruit.sliced;
}

function findFruitAt(fruits, col, row) {
  for (const fruit of fruits) {
    if (!isGridTarget(fruit)) continue;
    if (fruit.gridCol === col && fruit.gridRow === row) return fruit;
  }
  return null;
}

function getGridSize(fruits) {
  let maxCol = -1;
  let maxRow = -1;
  for (const fruit of fruits) {
    if (!isGridTarget(fruit)) continue;
    if (Number.isInteger(fruit.gridCol)) maxCol = Math.max(maxCol, fruit.gridCol);
    if (Number.isInteger(fruit.gridRow)) maxRow = Math.max(maxRow, fruit.gridRow);
  }
  return Math.max(maxCol, maxRow) + 1;
}

function cellWorldPosition(anchor, direction, stepIndex, col, row, fruits, out) {
  const atCell = findFruitAt(fruits, col, row);
  if (atCell) {
    return out.copy(atCell.group.position);
  }

  const axis = gridDirectionToWorld(direction);
  const cellStride = anchor.radius * 2.35 * anchor.baseScale;
  return out.copy(anchor.group.position).addScaledVector(axis, stepIndex * cellStride);
}

function buildRaySteps(anchor, fruits) {
  const direction = anchor.mechanismDirection;
  const delta = DIRECTION_DELTA[direction];
  if (!delta) return [];

  const gridSize = getGridSize(fruits);
  const [dr, dc] = delta;
  const steps = [];
  let col = anchor.gridCol + dc;
  let row = anchor.gridRow + dr;
  let stepIndex = 1;

  while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
    const fruit = findFruitAt(fruits, col, row);
    const world = new THREE.Vector3();
    cellWorldPosition(anchor, direction, stepIndex, col, row, fruits, world);
    steps.push({ col, row, fruit, world });
    stepIndex += 1;
    col += dc;
    row += dr;
  }

  return steps;
}

function disposeArrowGroup(group) {
  if (!group) return;
  group.parent?.remove(group);
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export function createMechanismArrowProjectileSystem({
  scene,
  bubbleBaseRadius,
} = {}) {
  const arrowPool = [];
  const activeFlights = [];
  const pendingLaunches = [];

  function claimArrowGroup(direction) {
    for (let i = 0; i < arrowPool.length; i += 1) {
      const entry = arrowPool[i];
      if (!entry.inUse && entry.direction === direction) {
        entry.inUse = true;
        entry.group.visible = true;
        prepareProjectileArrowDraw(entry.group);
        return entry.group;
      }
    }

    const group = createMechanismArrow(direction, bubbleBaseRadius);
    prepareProjectileArrowDraw(group);
    scene.add(group);
    if (arrowPool.length < ARROW_POOL_SIZE) {
      arrowPool.push({ group, direction, inUse: true });
    }
    return group;
  }

  function releaseArrowGroup(group) {
    if (!group) return;
    group.visible = false;
    for (let i = 0; i < arrowPool.length; i += 1) {
      if (arrowPool[i].group === group) {
        arrowPool[i].inUse = false;
        return;
      }
    }
    disposeArrowGroup(group);
  }

  function restoreHiddenArrow(anchor) {
    if (anchor?.mechanismArrow) anchor.mechanismArrow.visible = true;
  }

  function finishFlight(flight) {
    restoreHiddenArrow(flight.anchor);
    releaseArrowGroup(flight.arrowGroup);
    const idx = activeFlights.indexOf(flight);
    if (idx >= 0) activeFlights.splice(idx, 1);
  }

  function startFlight({
    anchor,
    fruits,
    onPierce,
    canEmitFrom,
    onEmitFrom,
  }) {
    if (!anchor?.mechanismDirection) return;
    if (typeof canEmitFrom === "function" && !canEmitFrom(anchor)) return;
    if (typeof onEmitFrom === "function") onEmitFrom(anchor);

    const steps = buildRaySteps(anchor, fruits);
    if (!steps.length) return;

    for (const step of steps) {
      liftBubbleDrawOrder(step.fruit);
    }

    const direction = anchor.mechanismDirection;
    const arrowGroup = claimArrowGroup(direction);
    if (anchor.mechanismArrow) anchor.mechanismArrow.visible = false;

    cellWorldPosition(anchor, direction, 0, anchor.gridCol, anchor.gridRow, fruits, workStart);
    arrowGroup.position.copy(workStart);
    arrowGroup.position.z = ARROW_TRAVEL_Z;

    activeFlights.push({
      anchor,
      arrowGroup,
      fruits,
      steps,
      stepIndex: 0,
      segmentT: 0,
      segmentDuration: MS_PER_CELL / 1000,
      onPierce,
      canEmitFrom,
      piercedCells: new Set(),
    });
  }

  function flushPendingLaunches() {
    while (pendingLaunches.length > 0) {
      const job = pendingLaunches.shift();
      startFlight(job);
    }
  }

  function launch({
    source,
    fruits,
    onPierce,
    canEmitFrom,
    onEmitFrom,
  }) {
    pendingLaunches.push({
      anchor: source,
      fruits,
      onPierce,
      canEmitFrom,
      onEmitFrom,
    });
    flushPendingLaunches();
  }

  function enqueueChain(anchor, fruits, onPierce, canEmitFrom, onEmitFrom) {
    pendingLaunches.push({
      anchor,
      fruits,
      onPierce,
      canEmitFrom,
      onEmitFrom,
    });
  }

  function update(dt) {
    for (let i = activeFlights.length - 1; i >= 0; i -= 1) {
      const flight = activeFlights[i];
      const { steps, arrowGroup, anchor, fruits } = flight;
      const direction = anchor.mechanismDirection;

      if (flight.stepIndex >= steps.length) {
        finishFlight(flight);
        continue;
      }

      const step = steps[flight.stepIndex];
      if (flight.stepIndex === 0) {
        cellWorldPosition(anchor, direction, 0, anchor.gridCol, anchor.gridRow, fruits, workStart);
      } else {
        workStart.copy(steps[flight.stepIndex - 1].world);
      }
      workEnd.copy(step.world);

      flight.segmentT += dt;
      const u = Math.min(1, flight.segmentT / flight.segmentDuration);
      arrowGroup.position.lerpVectors(workStart, workEnd, u);
      arrowGroup.position.z = ARROW_TRAVEL_Z;

      if (u < 1) continue;

      flight.segmentT = 0;
      const cellKey = `${step.col},${step.row}`;
      if (step.fruit && !flight.piercedCells.has(cellKey)) {
        flight.piercedCells.add(cellKey);
        const chainAnchor = flight.onPierce?.(step.fruit) ?? null;
        if (chainAnchor) {
          enqueueChain(
            chainAnchor,
            fruits,
            flight.onPierce,
            flight.canEmitFrom,
            flight.onEmitFrom,
          );
        }
      }

      flight.stepIndex += 1;
      if (flight.stepIndex >= steps.length) {
        finishFlight(flight);
      }
    }

    if (activeFlights.length === 0) {
      flushPendingLaunches();
    }
  }

  function clear() {
    pendingLaunches.length = 0;
    for (let i = activeFlights.length - 1; i >= 0; i -= 1) {
      finishFlight(activeFlights[i]);
    }
    activeFlights.length = 0;
    for (const entry of arrowPool) {
      entry.inUse = false;
      entry.group.visible = false;
    }
  }

  function isActive() {
    return activeFlights.length > 0 || pendingLaunches.length > 0;
  }

  return {
    launch,
    update,
    clear,
    isActive,
  };
}