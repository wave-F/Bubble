import {
  BUBBLE_POP_DEFAULTS,
  loadBubblePopTuning,
  normalizeBubblePopTuning,
} from "./bubble-pop-tuning.js";

function formatValue(value, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return value.toFixed(decimals);
}

function readSliderValue(slider) {
  return Number(slider?.value ?? 0);
}

export function createBubblePopDebugUiController({
  elements,
  defaults = BUBBLE_POP_DEFAULTS,
  storageKey,
  onPlayClick,
} = {}) {
  const {
    toggleBtn,
    panelEl,
    resetBtn,
    flashWhiteRadio,
    flashLightRadio,
    liftSlider,
    liftValue,
    liftGroup,
  } = elements ?? {};

  let tuning = loadBubblePopTuning(storageKey, defaults);

  function setValueLabel() {
    if (!liftValue || !liftSlider) return;
    const step = Number(liftSlider.step || 0.01);
    liftValue.textContent = formatValue(tuning.lightBubbleLift, step);
  }

  function syncLiftGroupVisibility() {
    if (!liftGroup) return;
    liftGroup.hidden = tuning.flashMode !== "lightBubble";
  }

  function persistTuning() {
    if (typeof window === "undefined" || !window.localStorage || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(tuning));
    } catch {
      /* ignore */
    }
  }

  function readTuningFromUi() {
    const flashMode = flashLightRadio?.checked ? "lightBubble" : "white";
    tuning = normalizeBubblePopTuning({
      ...tuning,
      flashMode,
      lightBubbleLift: liftSlider ? readSliderValue(liftSlider) : tuning.lightBubbleLift,
    });
  }

  function syncUiFromTuning() {
    if (flashWhiteRadio) flashWhiteRadio.checked = tuning.flashMode !== "lightBubble";
    if (flashLightRadio) flashLightRadio.checked = tuning.flashMode === "lightBubble";
    if (liftSlider) liftSlider.value = String(tuning.lightBubbleLift);
    setValueLabel();
    syncLiftGroupVisibility();
  }

  function onChange() {
    readTuningFromUi();
    syncLiftGroupVisibility();
    setValueLabel();
    persistTuning();
  }

  function resetToDefaults() {
    tuning = normalizeBubblePopTuning(defaults);
    syncUiFromTuning();
    persistTuning();
  }

  function getTuning() {
    readTuningFromUi();
    return { ...tuning };
  }

  function flushToStorage() {
    readTuningFromUi();
    persistTuning();
  }

  function bind() {
    tuning = loadBubblePopTuning(storageKey, defaults);
    syncUiFromTuning();

    toggleBtn?.addEventListener("click", () => {
      onPlayClick?.();
      panelEl?.classList.toggle("hidden");
    });

    flashWhiteRadio?.addEventListener("change", onChange);
    flashLightRadio?.addEventListener("change", onChange);
    liftSlider?.addEventListener("input", onChange);

    resetBtn?.addEventListener("click", () => {
      onPlayClick?.();
      resetToDefaults();
    });
  }

  return {
    bind,
    getTuning,
    resetToDefaults,
    syncUiFromTuning,
    flushToStorage,
  };
}