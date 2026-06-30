export const WIN_CINEMATIC_STORAGE_KEY = "fruit_win_cinematic_tuning_v1";

export const WIN_CINEMATIC_DEFAULTS = {
  prePopDelaySec: 0.85,
  settleAfterComplete: 0.4,
  clearDelayMs: 600,
  motionDuration: 0.65,
  overlayDelaySec: 1.4,
  commentaryDurationMs: 1200,
  popInitialInterval: 0.11,
  popAccelFactor: 0.78,
  popMinInterval: 0.035,
  titleAnimSec: 0.58,
  btnDelaySec: 0.3,
  btnAnimSec: 0.38,
  loseOverlayDelaySec: 0.4,
  loseTitleAnimSec: 0.42,
  loseBtnDelaySec: 0.15,
  loseBtnAnimSec: 0.28,
  bgToHex: "e8f4ff",
  useBubblePalette: true,
  previewBubbleColorId: "blue",
};

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function parseHexColor(hex) {
  const raw = String(hex ?? "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return Number.parseInt(raw, 16);
}

export function createWinCinematicTuning(initial = {}) {
  const state = { ...WIN_CINEMATIC_DEFAULTS, ...initial };

  function normalize() {
    state.prePopDelaySec = clampNumber(state.prePopDelaySec, 0, 3);
    state.settleAfterComplete = clampNumber(state.settleAfterComplete, 0, 2);
    state.clearDelayMs = Math.round(clampNumber(state.clearDelayMs, 0, 3000));
    state.motionDuration = clampNumber(state.motionDuration, 0.1, 5);
    state.overlayDelaySec = clampNumber(state.overlayDelaySec, 0.1, 8);
    state.commentaryDurationMs = Math.round(clampNumber(state.commentaryDurationMs, 200, 8000));
    state.popInitialInterval = clampNumber(state.popInitialInterval, 0.02, 1);
    state.popAccelFactor = clampNumber(state.popAccelFactor, 0.5, 0.99);
    state.popMinInterval = clampNumber(state.popMinInterval, 0.01, 0.5);
    state.titleAnimSec = clampNumber(state.titleAnimSec, 0.1, 3);
    state.btnDelaySec = clampNumber(state.btnDelaySec, 0, 3);
    state.btnAnimSec = clampNumber(state.btnAnimSec, 0.1, 3);
    state.loseOverlayDelaySec = clampNumber(state.loseOverlayDelaySec, 0.1, 8);
    state.loseTitleAnimSec = clampNumber(state.loseTitleAnimSec, 0.1, 3);
    state.loseBtnDelaySec = clampNumber(state.loseBtnDelaySec, 0, 3);
    state.loseBtnAnimSec = clampNumber(state.loseBtnAnimSec, 0.1, 3);
    state.bgToHex = String(state.bgToHex ?? WIN_CINEMATIC_DEFAULTS.bgToHex).replace("#", "").toLowerCase();
    if (!/^[0-9a-f]{6}$/.test(state.bgToHex)) {
      state.bgToHex = WIN_CINEMATIC_DEFAULTS.bgToHex;
    }
    state.useBubblePalette = state.useBubblePalette !== false;
    state.previewBubbleColorId = String(
      state.previewBubbleColorId ?? WIN_CINEMATIC_DEFAULTS.previewBubbleColorId,
    );
  }

  function get() {
    return { ...state };
  }

  function set(partial = {}) {
    Object.assign(state, partial);
    normalize();
    applyCssVars();
    return get();
  }

  function reset() {
    Object.assign(state, WIN_CINEMATIC_DEFAULTS);
    normalize();
    applyCssVars();
    return get();
  }

  function getBgToColor() {
    return parseHexColor(state.bgToHex) ?? 0xe8f4ff;
  }

  function applyCssVars() {
    const root = document.documentElement;
    root.style.setProperty("--win-title-anim", `${state.titleAnimSec}s`);
    root.style.setProperty("--win-btn-delay", `${state.btnDelaySec}s`);
    root.style.setProperty("--win-btn-anim", `${state.btnAnimSec}s`);
  }

  function applyLoseCssVars() {
    const root = document.documentElement;
    root.style.setProperty("--win-title-anim", `${state.loseTitleAnimSec}s`);
    root.style.setProperty("--win-btn-delay", `${state.loseBtnDelaySec}s`);
    root.style.setProperty("--win-btn-anim", `${state.loseBtnAnimSec}s`);
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(WIN_CINEMATIC_STORAGE_KEY);
      if (!raw) return get();
      const parsed = JSON.parse(raw);
      return set(parsed);
    } catch {
      return get();
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(WIN_CINEMATIC_STORAGE_KEY, JSON.stringify(get()));
    } catch {
      /* ignore */
    }
  }

  normalize();
  applyCssVars();

  return {
    get,
    set,
    reset,
    getBgToColor,
    applyCssVars,
    applyLoseCssVars,
    loadFromStorage,
    saveToStorage,
  };
}