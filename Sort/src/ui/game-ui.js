import { createResultPage } from "./result-page.js";
import { createCoinStatus } from "./coin-status.js";
import { createCoinFly } from "./coin-fly.js";
import { createSimpleLevelWin } from "./simple-level-win.js";

export function createGameUI({
  sliceStateEl,
  gameOverEl,
  gameOverTitleEl,
  resultPage,
  simpleLevelWin,
  coinStatus,
  coinFly,
  onResultRetry,
  onResultNext,
  onResultBack,
  onShowCommentary,
} = {}) {
  const result = createResultPage({
    ...(resultPage || {}),
    onRetry: onResultRetry,
    onNext: onResultNext,
    onBack: onResultBack,
  });
  const levelWin = createSimpleLevelWin(simpleLevelWin);
  const coins = createCoinStatus(coinStatus);
  const fly = createCoinFly({
    ...(coinFly || {}),
    getTargetRect: () => coins.getAnchorRect(),
  });

  function setSliceStatus(text) {
    if (!sliceStateEl) return;
    sliceStateEl.textContent = text;
  }

  function showCommentary(text, durationMs = 1200) {
    onShowCommentary?.(text, durationMs);
  }

  function showGameOver(reason = "本局结束") {
    if (gameOverTitleEl) gameOverTitleEl.textContent = reason;
    gameOverEl?.classList.remove("hidden");
  }

  function hideGameOver() {
    gameOverEl?.classList.add("hidden");
  }

  function setCoins(value) {
    coins.setCoins(value);
  }

  function openResult(outcome, options) {
    result.openResult(outcome, options);
  }

  function closeResult() {
    result.closeResult();
    levelWin.close();
  }

  function openSimpleLevelWin(options) {
    levelWin.open(options);
  }

  function closeSimpleLevelWin() {
    levelWin.close();
  }

  function getResultRewardRect() {
    return result.getRewardAnchorRect();
  }

  function playCoinFly(reward, options = {}) {
    fly.playCoinFly(reward, options);
  }

  function isCoinFlyPlaying() {
    return fly.isPlaying();
  }

  function getCoinAnchorRect() {
    return coins.getAnchorRect();
  }

  return {
    setSliceStatus,
    showCommentary,
    showGameOver,
    hideGameOver,
    setCoins,
    openResult,
    closeResult,
    openSimpleLevelWin,
    closeSimpleLevelWin,
    playCoinFly,
    isCoinFlyPlaying,
    getCoinAnchorRect,
    getResultRewardRect,
  };
}
