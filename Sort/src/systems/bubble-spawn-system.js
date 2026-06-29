const BubbleSpawnState = {
  READY: "READY",
  SPAWNING: "SPAWNING",
};

export function createBubbleSpawnSystem({
  onComplete,
  rowStagger = 0.07,
  cellJitter = 0.04,
  riseDistance = 0.5,
  inflateDuration = 0.28,
  settleDuration = 0.12,
  maxOvershoot = 1.08,
  minScale = 0.12,
} = {}) {
  let active = false;
  let trackedFruits = [];

  function start(fruits, layout) {
    trackedFruits = Array.isArray(fruits) ? fruits : [];
    if (!trackedFruits.length || !layout) {
      active = false;
      onComplete?.();
      return;
    }

    active = true;
    const gridSize = Math.max(1, Math.floor(layout.gridSize ?? 3));
    const maxRow = gridSize - 1;
    const rise = layout.cellSize * riseDistance;

    for (const fruit of trackedFruits) {
      const row = Number.isInteger(fruit.gridRow) && fruit.gridRow >= 0 ? fruit.gridRow : 0;
      const rowFromBottom = maxRow - row;
      const jitter = (Math.random() - 0.5) * 2 * cellJitter;
      const delay = Math.max(0, rowFromBottom * rowStagger + jitter);

      fruit.beginSpawn?.({
        delay,
        riseDistance: rise,
        inflateDuration,
        settleDuration,
        maxOvershoot,
        minScale,
      });
    }
  }

  function update(dt) {
    if (!active) return;

    let anySpawning = false;
    for (const fruit of trackedFruits) {
      if (fruit.spawnState === BubbleSpawnState.SPAWNING) {
        anySpawning = true;
      }
    }

    if (!anySpawning) {
      active = false;
      trackedFruits = [];
      onComplete?.();
    }
  }

  function reset() {
    active = false;
    trackedFruits = [];
  }

  function isActive() {
    return active;
  }

  return {
    start,
    update,
    reset,
    isActive,
  };
}

export { BubbleSpawnState };