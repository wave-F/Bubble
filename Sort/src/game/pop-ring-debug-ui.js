import {
  POP_RING_DEFAULTS,
  POP_RING_SHAPES,
  loadPopRingTuning,
  normalizePopRingTuning,
} from "./pop-ring-tuning.js";

function formatValue(value, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return value.toFixed(decimals);
}

function readSliderValue(slider) {
  return Number(slider?.value ?? 0);
}

export function createPopRingDebugUiController({
  elements,
  burstSystem,
  defaults = POP_RING_DEFAULTS,
  storageKey,
  onPlayClick,
} = {}) {
  const {
    toggleBtn,
    panelEl,
    resetBtn,
    enabledToggle,
    scaleStartSlider,
    scaleStartValue,
    scaleEndSlider,
    scaleEndValue,
    ringInnerSlider,
    ringInnerValue,
    ringOuterSlider,
    ringOuterValue,
    durationSlider,
    durationValue,
    opacityPeakSlider,
    opacityPeakValue,
    lightnessSlider,
    lightnessValue,
    shapeSelect,
  } = elements ?? {};

  let tuning = loadPopRingTuning(storageKey, defaults);

  const sliderGroups = [
    { key: "scaleStart", slider: scaleStartSlider, valueEl: scaleStartValue },
    { key: "scaleEnd", slider: scaleEndSlider, valueEl: scaleEndValue },
    { key: "ringInner", slider: ringInnerSlider, valueEl: ringInnerValue },
    { key: "ringOuter", slider: ringOuterSlider, valueEl: ringOuterValue },
    { key: "duration", slider: durationSlider, valueEl: durationValue },
    { key: "opacityPeak", slider: opacityPeakSlider, valueEl: opacityPeakValue },
    { key: "lightnessOffset", slider: lightnessSlider, valueEl: lightnessValue },
  ];

  function setValueLabel(group, value) {
    if (!group.valueEl || !group.slider) return;
    const step = Number(group.slider.step || 0.01);
    group.valueEl.textContent = formatValue(value, step);
  }

  function applyToBurst() {
    burstSystem?.applyPopRingTuning?.(tuning);
  }

  function persistTuning() {
    if (typeof window === "undefined" || !window.localStorage || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(tuning));
    } catch (_err) {
      // ignore
    }
  }

  function readTuningFromUi() {
    const shapeRaw = shapeSelect?.value;
    const shape = POP_RING_SHAPES.includes(shapeRaw) ? shapeRaw : tuning.shape;
    const partial = {
      enabled: enabledToggle?.checked !== false,
      shape,
    };
    for (const group of sliderGroups) {
      if (!group.slider) continue;
      partial[group.key] = readSliderValue(group.slider);
    }
    tuning = normalizePopRingTuning({ ...tuning, ...partial });
  }

  function syncValueLabelsFromTuning() {
    for (const group of sliderGroups) {
      setValueLabel(group, tuning[group.key]);
    }
  }

  function syncUiFromTuning() {
    if (enabledToggle) enabledToggle.checked = tuning.enabled !== false;
    if (shapeSelect && POP_RING_SHAPES.includes(tuning.shape)) {
      shapeSelect.value = tuning.shape;
    }
    for (const group of sliderGroups) {
      if (group.slider) group.slider.value = String(tuning[group.key]);
      setValueLabel(group, tuning[group.key]);
    }
    applyToBurst();
  }

  function onChange() {
    readTuningFromUi();
    syncValueLabelsFromTuning();
    applyToBurst();
    persistTuning();
  }

  function resetToDefaults() {
    tuning = normalizePopRingTuning(defaults);
    syncUiFromTuning();
    persistTuning();
  }

  function bind() {
    if (!burstSystem?.applyPopRingTuning) return;

    tuning = loadPopRingTuning(storageKey, defaults);
    syncUiFromTuning();

    toggleBtn?.addEventListener("click", () => {
      onPlayClick?.();
      panelEl?.classList.toggle("hidden");
    });

    enabledToggle?.addEventListener("change", onChange);
    shapeSelect?.addEventListener("change", onChange);
    for (const group of sliderGroups) {
      group.slider?.addEventListener("input", onChange);
    }

    resetBtn?.addEventListener("click", () => {
      onPlayClick?.();
      resetToDefaults();
    });
  }

  return {
    bind,
    syncUiFromTuning,
    resetToDefaults,
  };
}