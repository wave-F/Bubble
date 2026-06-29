import {
  DIRECTION_DELTA,
  NEIGHBOR_DIRS,
} from "./mechanism-dye-logic.js";

const MECHANISM_DYE_STEP_MS = 90;

export function createColorUnifySystem() {
  const pendingDyes = [];
  const spreadVisited = new Set();

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
    fruit.setColorId(colorId, colorDef.base);
    fruit.playDyePulse?.();
    return true;
  }

  function scheduleDye(fruit, colorId, colorDef, delayMs, onApplied) {
    if (!isActiveFruit(fruit)) return;
    insertPendingDye({
      deadline: performance.now() + Math.max(0, delayMs),
      fruit,
      colorId,
      colorDef,
      onApplied,
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
        const triggerChain = Boolean(fruit.mechanismDirection);
        scheduleDye(
          fruit,
          colorId,
          colorDef,
          delayMs,
          triggerChain
            ? () => scheduleRayFromMechanism({
              mechanism: fruit,
              fruits,
              colors,
              colorId,
              colorDef,
              baseDelayMs: 0,
            })
            : null,
        );
      }
      step += 1;
      col += dc;
      row += dr;
    }
  }

  function dyeNeighborNow({
    fruits,
    colorId,
    colorDef,
    row,
    col,
    mechanismQueue,
  }) {
    const fruit = findFruitAt(fruits, col, row);
    if (!fruit) return;

    const changed = applyDyeNow(fruit, colorId, colorDef);
    if (changed && fruit.mechanismDirection) {
      mechanismQueue.push(fruit);
    }
  }

  function applyPop({ source, fruits, colors }) {
    if (!isActiveFruit(source)) return;

    const colorId = source.colorId;
    const colorDef = colors?.[colorId];
    if (!colorDef) return;

    spreadVisited.clear();
    const mechanismQueue = [];

    for (const [dr, dc] of NEIGHBOR_DIRS) {
      dyeNeighborNow({
        fruits,
        colorId,
        colorDef,
        row: source.gridRow + dr,
        col: source.gridCol + dc,
        mechanismQueue,
      });
    }

    for (const mechanism of mechanismQueue) {
      scheduleRayFromMechanism({
        mechanism,
        fruits,
        colors,
        colorId,
        colorDef,
        baseDelayMs: 0,
      });
    }
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

  function isBoardUnified(fruits) {
    if (hasPendingDyes()) return false;

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
    update,
    clear,
    hasPendingDyes,
    isBoardUnified,
  };
}