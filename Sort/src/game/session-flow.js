import * as THREE from "three/webgpu";

export function createSessionFlowController({
  state,
  fruits,
  colors,
  bounds,
  scene,
  levelRuntime,
  levelFlow,
  gameAudio,
  gameUI,
  burstSystem,
  victoryRainSystem,
  clampLevelIndex,
  hasBubbleTuningOverride,
  onHideOutOfMovesBanner,
  onTryConsumeStaminaForLevelEntry,
  onSettlePendingWinReward,
  onRestoreStaminaAfterFailedEntry,
  onShowHomeScreen,
  onHideHomeScreen,
  onShowHomeCenterTip,
  onSetLevelTestSelection,
  onUpdateStepsHud,
  onClearQueuedSelections,
  onPlayOutOfMovesBanner,
  onClearBoardEntities,
  onPersistLevelProgress,
  onBackHomeFromResult,
  onAfterLevelLoaded,
  onAfterBoardRespawn,
  onLevelLoadStarted,
  onResetVictoryPop,
  createBubbleEntity,
} = {}) {
  function grantLevelWinProgress(nextLevelIndex) {
    const justCleared = state.currentLevelIndex;
    state.highestPassedLevelIndex = Math.max(state.highestPassedLevelIndex, justCleared);
    state.currentPlayableLevelIndex = clampLevelIndex(nextLevelIndex);
    state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;
    onPersistLevelProgress?.();
  }

  function resetFruits(level, { clearBurstVfx = true } = {}) {
    if (clearBurstVfx) burstSystem.clear();
    state.pendingPops.length = 0;
    for (const fruit of fruits) scene.remove(fruit.group);
    fruits.length = 0;

    const defs = level?.fruits ?? [];
    for (let i = 0; i < defs.length; i += 1) {
      const def = defs[i];
      const colorIndex = THREE.MathUtils.clamp(def.colorId, 0, colors.length - 1);
      const radius = THREE.MathUtils.clamp(def.radius ?? level.gridRadius ?? 0.36, 0.12, 0.5);
      const fruit = createBubbleEntity({
        id: i,
        colorId: colorIndex,
        radius,
        vx: 0,
        vy: 0,
        baseColor: new THREE.Color(colors[colorIndex].base),
        motionMode: "grid",
        gridCol: def.col ?? -1,
        gridRow: def.row ?? -1,
        gridSize: level.gridSize ?? 0,
        mechanismDirection: def.mechanismDirection ?? null,
      });
      const spawnMargin = fruit.radius + 0.06;
      fruit.setPosition(
        THREE.MathUtils.clamp(def.x, bounds.left + spawnMargin, bounds.right - spawnMargin),
        THREE.MathUtils.clamp(def.y, bounds.bottom + spawnMargin, bounds.top - spawnMargin),
        0
      );
      fruits.push(fruit);
      scene.add(fruit.group);
    }
  }

  function loadLevel(index) {
    const level = levelRuntime.getNormalizedLevel(index);
    if (!level) return false;

    state.currentLevelIndex = index;
    state.selectedHomeLevelIndex = index;
    state.activeLevel = level;
    state.levelTransitioning = true;
    onLevelLoadStarted?.();
    state.pointerDown = false;
    state.pressTarget = null;
    state.pressAwaitRelease = false;
    gameAudio.resetSelectToneProgression();
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    state.lastPoint = null;
    state.nowPoint = null;
    state.stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 1));
    state.stepsUsed = 0;
    state.outOfMovesHandling = false;
    state.outOfMovesContinuePending = false;
    state.outOfMovesContinueUsedInLevel = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    levelFlow.reset();
    victoryRainSystem.reset();
    onResetVictoryPop?.();
    onSetLevelTestSelection?.(index);
    onUpdateStepsHud?.();
    resetFruits(level);
    onAfterLevelLoaded?.(index, level);
    return true;
  }

  function startGame() {
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) return;
    gameAudio.ensureAudioUnlocked();
    void gameAudio.preloadPopAudio();
    gameAudio.resetSelectToneProgression();

    const startIndex = clampLevelIndex(state.currentPlayableLevelIndex);

    state.started = true;
    state.gameOver = false;
    state.inHome = false;
    state.levelTransitioning = false;
    state.currentLevelIndex = startIndex;
    state.activeLevel = null;
    state.pointerDown = false;
    state.pressTarget = null;
    state.pressAwaitRelease = false;
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    state.lastPoint = null;
    state.nowPoint = null;
    state.stepLimit = 0;
    state.stepsUsed = 0;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    levelFlow.reset();
    burstSystem.clear();
    victoryRainSystem.reset();
    onResetVictoryPop?.();

    onHideHomeScreen?.();
    gameUI.hideGameOver();
    gameUI.closeResult();

    if (hasBubbleTuningOverride) {
      gameUI.showCommentary("Debug tuning synced from the tuning page.", 1300);
    }

    const loaded = loadLevel(startIndex);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      state.started = false;
      state.inHome = true;
      onShowHomeScreen?.();
      gameUI.showCommentary("Level failed to load. Please try again.", 1200);
    }
  }

  function retryCurrentLevelFromResult() {
    if (!state.started) return;
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) {
      gameUI.closeResult();
      state.started = false;
      state.gameOver = false;
      state.levelTransitioning = false;
      state.pointerDown = false;
      state.pendingWinReward = 0;
      state.rewardAppliedThisRound = true;
      onClearBoardEntities?.();
      onShowHomeScreen?.();
      onShowHomeCenterTip?.("Not enough stamina", 1200);
      return;
    }

    gameUI.closeResult();
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    const loaded = loadLevel(state.currentLevelIndex);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      state.started = false;
      onShowHomeScreen?.();
    }
  }

  function respawnBoardFromActiveLevel() {
    if (!state.started) return false;
    const level = state.activeLevel;
    if (!level) return loadLevel(state.currentLevelIndex);

    onHideOutOfMovesBanner?.();
    gameUI.closeSimpleLevelWin();
    gameUI.closeResult();
    state.gameOver = false;
    state.defeatPopActive = false;
    state.outOfMovesHandling = false;
    state.pointerDown = false;
    state.pressTarget = null;
    state.pressAwaitRelease = false;
    state.outOfMovesContinuePending = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    state.levelTransitioning = true;
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    state.stepsUsed = 0;
    levelFlow.reset();
    onUpdateStepsHud?.();
    resetFruits(level, { clearBurstVfx: true });
    onAfterBoardRespawn?.(level);
    return true;
  }

  function retryCurrentLevelSimple() {
    if (!state.started) return;
    onHideOutOfMovesBanner?.();
    gameUI.closeSimpleLevelWin();
    gameUI.closeResult();
    state.gameOver = false;
    state.defeatPopActive = false;
    state.outOfMovesHandling = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pressTarget = null;
    state.pressAwaitRelease = false;
    state.outOfMovesContinuePending = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    const loaded = loadLevel(state.currentLevelIndex);
    if (!loaded) {
      state.started = false;
      onShowHomeScreen?.();
    }
  }

  function backHomeFromResult() {
    onHideOutOfMovesBanner?.();
    onSettlePendingWinReward?.(false);
    gameUI.closeResult();
    state.started = false;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    onResetVictoryPop?.();
    onClearBoardEntities?.();
    onShowHomeScreen?.();
  }

  function startNextLevel(nextLevelIndex) {
    onHideOutOfMovesBanner?.();
    if (!onTryConsumeStaminaForLevelEntry?.()) return;
    onSettlePendingWinReward?.(false);
    gameUI.closeResult();
    const next = clampLevelIndex(nextLevelIndex);
    state.started = true;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    const loaded = loadLevel(next);
    if (!loaded) {
      onRestoreStaminaAfterFailedEntry?.();
      onBackHomeFromResult?.();
    }
  }

  function openLevelLoseModal() {
    gameAudio?.playGameLoseAudio?.();
    gameUI.openSimpleLevelWin({
      title: `第${state.currentLevelIndex + 1}关失败`,
      desc: "步数用完了",
      actionText: "重新开始",
      variant: "lose",
      onAction: () => {
        gameAudio?.playUiClickAudio?.();
        retryCurrentLevelSimple();
      },
    });
  }

  function endGame(reason, options = {}) {
    void reason;
    if (state.gameOver) return;
    state.gameOver = true;
    state.levelTransitioning = false;
    state.pointerDown = false;
    levelFlow.reset();
    burstSystem.clear();
    onClearQueuedSelections?.();
    state.pendingPops.length = 0;
    victoryRainSystem.reset();
    if (options.deferLoseModal !== true) {
      onResetVictoryPop?.();
    }

    if (options.showOutOfMovesBanner === true) {
      onPlayOutOfMovesBanner?.(openLevelLoseModal);
      return;
    }

    if (options.deferLoseModal === true) {
      return;
    }

    openLevelLoseModal();
  }

  return {
    grantLevelWinProgress,
    retryCurrentLevelFromResult,
    retryCurrentLevelSimple,
    respawnBoardFromActiveLevel,
    backHomeFromResult,
    startNextLevel,
    startGame,
    loadLevel,
    resetFruits,
    endGame,
    openLevelLoseModal,
  };
}