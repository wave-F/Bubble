export function createRoundStateController({
  state,
  fruits,
  scene,
  burstSystem,
  victoryRainSystem,
  onPlayPopAudio,
  onResetVictoryPop,
} = {}) {
  function clearQueuedSelections() {
    if (state.pressTarget) {
      state.pressTarget.releasePress?.();
      state.pressTarget = null;
    }
  }

  function processPendingPops(dt) {
    if (!state.pendingPops.length) return;
    for (let i = 0; i < state.pendingPops.length; ) {
      const item = state.pendingPops[i];
      item.delay -= dt;
      if (item.delay > 0) {
        i += 1;
        continue;
      }

      const fruit = item.fruit;
      if (fruit && fruit.active && !fruit.sliced) {
        fruit.pop(item.sliceDir, item.speed);
        onPlayPopAudio?.();
      }
      state.pendingPops.splice(i, 1);
    }
  }

  function clearBoardEntities() {
    burstSystem.clear();
    state.pendingPops.length = 0;
    clearQueuedSelections();
    onResetVictoryPop?.();
    for (const fruit of fruits) scene.remove(fruit.group);
    fruits.length = 0;
    victoryRainSystem.reset();
  }

  return {
    clearQueuedSelections,
    processPendingPops,
    clearBoardEntities,
  };
}