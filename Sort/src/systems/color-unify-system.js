import {
  DIRECTION_DELTA,
  NEIGHBOR_DIRS,
} from "./mechanism-dye-logic.js";
import { playArrowRayCellWave } from "./pop-wave-system.js";

const MECHANISM_DYE_STEP_MS = 90;

export function createColorUnifySystem() {
  const pendingDyes = [];
  const spreadVisited = new Set();
  let isProjectileActive = () => false;


  function isActiveFruit(fruit) {
    return Boolean(fruit?.active && !fruit.sliced);
  }

  function findFruitAt(fruits, col, row) {
    for (const fruit of fruits) {
      if (!isActiveFruit(fruit)) continue;
      if (fruit.gridCol === col && fruit.gridRow === row) return fruit;
    }
    return null;
  }

  function findGridNeighborFruits(source, fruits) {
    const col = source.gridCol;
    const row = source.gridRow;
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0) {
      return [];
    }

    const neighbors = [];
    for (const fruit of fruits) {
      if (!isActiveFruit(fruit) || fruit === source) continue;
      if (!Number.isInteger(fruit.gridCol) || !Number.isInteger(fruit.gridRow)) continue;

      const dc = Math.abs(fruit.gridCol - col);
      const dr = Math.abs(fruit.gridRow - row);
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
        neighbors.push(fruit);
      }
    }

    return neighbors;
  }

  function getGridSize(fruits) {
    let maxCol = -1;
    let maxRow = -1;
    for (const fruit of fruits) {
      if (!isActiveFruit(fruit)) continue;
      if (Number.isInteger(fruit.gridCol)) maxCol = Math.max(maxCol, fruit.gridCol);
      if (Number.isInteger(fruit.gridRow)) maxRow = Math.max(maxRow, fruit.gridRow);
    }
    return Math.max(maxCol, maxRow) + 1;
  }

  function insertPendingDye(job) {
    let insertAt = pendingDyes.length;
    for (let i = 0; i < pendingDyes.length; i += 1) {
      if (job.deadline < pendingDyes[i].deadline) {
        insertAt = i;
        break;
      }
    }
    pendingDyes.splice(insertAt, 0, job);
  }

  function applyDyeNow(fruit, colorId, colorDef) {
    if (!isActiveFruit(fruit)) return false;
    if (fruit.colorId === colorId) return false;
    fruit.beginDyePresentation?.(colorId, colorDef.base);
    return true;
  }

  function scheduleDye(fruit, colorId, colorDef, delayMs, onApplied, { visualPulse = true } = {}) {
    if (!isActiveFruit(fruit)) return;
    insertPendingDye({
      deadline: performance.now() + Math.max(0, delayMs),
      fruit,
      colorId,
      colorDef,
      onApplied,
      visualPulse,
    });
  }

  function scheduleRayFromMechanism({
    mechanism,
    fruits,
    colors,
    colorId,
    colorDef,
    baseDelayMs,
  }) {
    if (!mechanism?.mechanismDirection || !isActiveFruit(mechanism)) return;

    const key = `${mechanism.gridCol},${mechanism.gridRow}`;
    if (spreadVisited.has(key)) return;
    spreadVisited.add(key);

    const delta = DIRECTION_DELTA[mechanism.mechanismDirection];
    if (!delta) return;

    const gridSize = getGridSize(fruits);
    const [dr, dc] = delta;
    let col = mechanism.gridCol + dc;
    let row = mechanism.gridRow + dr;
    let step = 1;

    while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      const fruit = findFruitAt(fruits, col, row);
      if (fruit) {
        const delayMs = baseDelayMs + step * MECHANISM_DYE_STEP_MS;
        const delaySec = delayMs / 1000;
        playArrowRayCellWave(fruit, { delaySec });
        scheduleDye(
          fruit,
          colorId,
          colorDef,
          delayMs,
          null,
          { visualPulse: false },
        );
      }
      step += 1;
      col += dc;
      row += dr;
    }
  }

  function mechanismCellKey(mechanism) {
    return `${mechanism.gridCol},${mechanism.gridRow}`;
  }

  function canEmitMechanismRay(mechanism) {
    if (!mechanism?.mechanismDirection || !isActiveFruit(mechanism)) return false;
    return !spreadVisited.has(mechanismCellKey(mechanism));
  }

  function markMechanismRayEmitted(mechanism) {
    if (!canEmitMechanismRay(mechanism)) return false;
    spreadVisited.add(mechanismCellKey(mechanism));
    return true;
  }

  function dyeNeighborNow({
    fruits,
    colors,
    colorId,
    colorDef,
    row,
    col,
  }) {
    const fruit = findFruitAt(fruits, col, row);
    if (!fruit) return;

    applyDyeNow(fruit, colorId, colorDef);
  }

  function pierceRayTarget(fruit, { colorId, colorDef }) {
    const changed = applyDyeNow(fruit, colorId, colorDef);
    return { chain: null, changed };
  }

  function fruitHasPendingColorPresentation(fruit) {
    if (!isActiveFruit(fruit)) return false;
    if (fruit.dyePresentHoldOld || fruit.popWaveColorActive) return true;
    return fruit.popWavePhase && fruit.popWavePhase !== "IDLE";
  }

  function hasPendingColorPresentation(fruits) {
    for (const fruit of fruits) {
      if (fruitHasPendingColorPresentation(fruit)) return true;
    }
    return false;
  }

  function applyPop({ source, fruits, colors, rayDelivery = "instant" }) {
    const emptyResult = { chainAnchors: [] };
    if (!isActiveFruit(source)) return emptyResult;

    const colorId = source.colorId;
    const colorDef = colors?.[colorId];
    if (!colorDef) return emptyResult;

    spreadVisited.clear();

    if (source.mechanismDirection && rayDelivery !== "projectile") {
      scheduleRayFromMechanism({
        mechanism: source,
        fruits,
        colors,
        colorId,
        colorDef,
        baseDelayMs: 0,
      });
    }

    for (const [dr, dc] of NEIGHBOR_DIRS) {
      dyeNeighborNow({
        fruits,
        colors,
        colorId,
        colorDef,
        row: source.gridRow + dr,
        col: source.gridCol + dc,
      });
    }

    return { chainAnchors: [] };
  }

  function update() {
    const now = performance.now();

    while (pendingDyes.length > 0 && pendingDyes[0].deadline <= now) {
      const job = pendingDyes.shift();
      const { fruit, colorId, colorDef, onApplied } = job;
      const changed = applyDyeNow(fruit, colorId, colorDef);
      if (changed && typeof onApplied === "function") {
        onApplied();
      }
    }
  }

  function clear() {
    pendingDyes.length = 0;
    spreadVisited.clear();
  }

  function hasPendingDyes() {
    return pendingDyes.length > 0;
  }

  function setProjectileActiveChecker(fn) {
    isProjectileActive = typeof fn === "function" ? fn : () => false;
  }

  function hasPendingWork(fruits = []) {
    return hasPendingDyes()
      || isProjectileActive()
      || hasPendingColorPresentation(fruits);
  }

  function isBoardUnified(fruits) {
    if (hasPendingWork(fruits)) return false;

    let targetColorId = null;
    let activeCount = 0;

    for (const fruit of fruits) {
      if (!isActiveFruit(fruit)) continue;
      activeCount += 1;
      if (targetColorId === null) {
        targetColorId = fruit.colorId;
      } else if (fruit.colorId !== targetColorId) {
        return false;
      }
    }

    return activeCount >= 1;
  }

  return {
    applyPop,
    pierceRayTarget,
    canEmitMechanismRay,
    markMechanismRayEmitted,
    update,
    clear,
    hasPendingDyes,
    hasPendingWork,
    setProjectileActiveChecker,
    isBoardUnified,
    findGridNeighborFruits,
  };
}