const DEFAULTS = {
  startDelaySec: 0,
  initialInterval: 0.11,
  accelFactor: 0.78,
  minInterval: 0.035,
  settleAfterComplete: 0.2,
};

function sortRowMajor(a, b) {
  const rowA = Number.isInteger(a.gridRow) ? a.gridRow : 0;
  const rowB = Number.isInteger(b.gridRow) ? b.gridRow : 0;
  if (rowA !== rowB) return rowA - rowB;
  const colA = Number.isInteger(a.gridCol) ? a.gridCol : 0;
  const colB = Number.isInteger(b.gridCol) ? b.gridCol : 0;
  return colA - colB;
}

export function createVictoryPopSequence(options = {}) {
  const { getTuning, ...rest } = options;
  const config = { ...DEFAULTS, ...rest };

  function readPopConfig() {
    const t = getTuning?.();
    return {
      startDelaySec: t?.victoryPopStartDelaySec ?? config.startDelaySec,
      initialInterval: t?.popInitialInterval ?? config.initialInterval,
      accelFactor: t?.popAccelFactor ?? config.accelFactor,
      minInterval: t?.popMinInterval ?? config.minInterval,
      settleAfterComplete: t?.settleAfterComplete ?? config.settleAfterComplete,
    };
  }
  let queue = [];
  let started = false;
  let startDelayRemaining = 0;
  let nextPopIn = 0;
  let currentInterval = config.initialInterval;
  let settleRemaining = 0;
  let settleAfterCompleteOverride = null;

  function reset() {
    queue = [];
    started = false;
    startDelayRemaining = 0;
    nextPopIn = 0;
    currentInterval = readPopConfig().initialInterval;
    settleRemaining = 0;
    settleAfterCompleteOverride = null;
  }

  function start(fruits, { applyStartDelay = false, settleAfterCompleteOverride: settleOverride } = {}) {
    reset();
    if (Number.isFinite(settleOverride)) {
      settleAfterCompleteOverride = Math.max(0, settleOverride);
    }
    started = true;
    queue = fruits
      .filter((fruit) => fruit?.active && !fruit.sliced)
      .sort(sortRowMajor);
    const pop = readPopConfig();
    currentInterval = pop.initialInterval;
    startDelayRemaining =
      applyStartDelay && queue.length > 0 ? Math.max(0, pop.startDelaySec) : 0;
    nextPopIn = startDelayRemaining > 0 ? 0 : queue.length > 0 ? currentInterval : 0;
  }

  function isActive() {
    return (
      started
      && (queue.length > 0 || nextPopIn > 0 || settleRemaining > 0 || startDelayRemaining > 0)
    );
  }

  function isComplete() {
    return (
      started
      && queue.length === 0
      && nextPopIn <= 0
      && settleRemaining <= 0
      && startDelayRemaining <= 0
    );
  }

  function update(dt, { onPop } = {}) {
    if (!started) return;

    if (startDelayRemaining > 0) {
      startDelayRemaining = Math.max(0, startDelayRemaining - dt);
      if (startDelayRemaining > 0) return;
      if (queue.length > 0) {
        nextPopIn = readPopConfig().initialInterval;
      }
      return;
    }

    if (queue.length === 0) {
      if (settleRemaining > 0) {
        settleRemaining = Math.max(0, settleRemaining - dt);
      }
      return;
    }

    nextPopIn -= dt;
    if (nextPopIn > 0) return;

    const fruit = queue.shift();
    if (fruit?.active && !fruit.sliced) {
      onPop?.(fruit);
    }

    if (queue.length > 0) {
      const pop = readPopConfig();
      currentInterval = Math.max(pop.minInterval, currentInterval * pop.accelFactor);
      nextPopIn = currentInterval;
    } else {
      nextPopIn = 0;
      const pop = readPopConfig();
      settleRemaining = settleAfterCompleteOverride ?? pop.settleAfterComplete;
    }
  }

  return {
    start,
    update,
    reset,
    isActive,
    isComplete,
    hasStarted: () => started,
  };
}