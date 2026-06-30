import * as THREE from "three/webgpu";
import {
  GAP_PX_MAX,
  PLANE_SIZE_MAX,
  PLANE_SIZE_MIN,
  TILE_PX_MAX,
  TILE_PX_MIN,
} from "../systems/tessellated-circle-background.js";
import {
  FLUID_BLUR_MAX,
  FLUID_PLANE_SIZE_MIN,
  REFERENCE_PASTEL_BLOBS,
} from "../systems/fluid-mesh-background.js";
import { PLAYFIELD_BACKGROUND_DEFAULTS } from "../systems/playfield-background.js";

function formatValue(value, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return value.toFixed(decimals);
}

function readSliderValue(slider) {
  return Number(slider?.value ?? 0);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseHexField(value, fallback) {
  const parsed = Number.parseInt(String(value ?? "").replace("#", "").trim(), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hexFieldFromNumber(hex) {
  return new THREE.Color(hex).getHexString();
}

export function loadTessellatedBackgroundTuning(
  defaults = PLAYFIELD_BACKGROUND_DEFAULTS,
  storageKey,
) {
  const defaultBlobColors = (defaults.fluidBlobs ?? REFERENCE_PASTEL_BLOBS).map((b) => b.color);
  const tuningKeys = {
    circleRadiusPx: defaults.circleRadiusPx,
    gapPx: defaults.gapPx,
    textureRepeat: defaults.textureRepeat,
    scrollSpeed: defaults.scrollSpeed,
    planeSize: defaults.planeSize,
    fluidPlaneSize: defaults.fluidPlaneSize,
    linearFilter: defaults.linearFilter,
    circlesVisible: defaults.circlesVisible !== false,
    circlePatternOpacity: defaults.circlePatternOpacity ?? 0.42,
    fluidMeshEnabled: defaults.fluidMeshEnabled !== false,
    fluidBaseColor: defaults.fluidBaseColor,
    fluidBlurPx: defaults.fluidBlurPx,
    fluidDriftSpeed: defaults.fluidDriftSpeed,
    fluidBlobOpacity: defaults.fluidBlobOpacity,
    fluidBrightness: defaults.fluidBrightness,
    fluidSaturation: defaults.fluidSaturation,
    fluidWhiteMix: defaults.fluidWhiteMix,
    fluidGradientMid: defaults.fluidGradientMid,
    fluidGradientMidAlpha: defaults.fluidGradientMidAlpha,
    fluidBlurCapPx: defaults.fluidBlurCapPx,
    fluidDriftAmplitude: defaults.fluidDriftAmplitude,
    fluidSheen: defaults.fluidSheen,
    fluidBlendMode: defaults.fluidBlendMode ?? "normal",
    fluidMeshOpacity: defaults.fluidMeshOpacity,
    blobColors: [...defaultBlobColors],
  };

  if (typeof window === "undefined" || !window.localStorage || !storageKey) {
    return tuningKeys;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return tuningKeys;
    const parsed = JSON.parse(raw);

    const circleRadiusPx = clampNumber(
      parsed.circleRadiusPx,
      4,
      80,
      defaults.circleRadiusPx,
    );
    const legacyTile = Number(parsed.tilePx);
    let gapPx = parsed.gapPx;
    if (gapPx == null && Number.isFinite(legacyTile)) {
      gapPx = legacyTile - circleRadiusPx * 2;
    }
    gapPx = clampNumber(gapPx, 0, GAP_PX_MAX, defaults.gapPx);

    const blobColors = Array.isArray(parsed.blobColors)
      ? parsed.blobColors.map((hex, i) => parseHexField(hex, defaultBlobColors[i] ?? 0xffffff))
      : [...defaultBlobColors];

    let planeSize = clampNumber(parsed.planeSize, PLANE_SIZE_MIN, PLANE_SIZE_MAX, defaults.planeSize);
    if (planeSize < 12) planeSize = defaults.planeSize;

    const fluidPlaneSize = clampNumber(
      parsed.fluidPlaneSize,
      FLUID_PLANE_SIZE_MIN,
      PLANE_SIZE_MAX,
      defaults.fluidPlaneSize,
    );

    return {
      circleRadiusPx,
      gapPx,
      textureRepeat: clampNumber(parsed.textureRepeat, 2, 24, defaults.textureRepeat),
      scrollSpeed: clampNumber(parsed.scrollSpeed, 0, 0.35, defaults.scrollSpeed),
      planeSize,
      fluidPlaneSize,
      linearFilter: parsed.linearFilter !== false,
      circlesVisible: parsed.circlesVisible !== false && parsed.visible !== false,
      circlePatternOpacity: clampNumber(
        parsed.circlePatternOpacity,
        0,
        1,
        defaults.circlePatternOpacity ?? 0.42,
      ),
      fluidMeshEnabled: parsed.fluidMeshEnabled !== false,
      fluidBaseColor: parseHexField(parsed.fluidBaseColor, defaults.fluidBaseColor),
      fluidBlurPx: clampNumber(parsed.fluidBlurPx, 0, FLUID_BLUR_MAX, defaults.fluidBlurPx),
      fluidDriftSpeed: clampNumber(parsed.fluidDriftSpeed, 0, 0.05, defaults.fluidDriftSpeed),
      fluidBlobOpacity: clampNumber(parsed.fluidBlobOpacity, 0, 1, defaults.fluidBlobOpacity),
      fluidBrightness: clampNumber(parsed.fluidBrightness, 0.6, 1.4, defaults.fluidBrightness),
      fluidSaturation: clampNumber(parsed.fluidSaturation, 0, 1.5, defaults.fluidSaturation),
      fluidWhiteMix: clampNumber(parsed.fluidWhiteMix, 0, 0.6, defaults.fluidWhiteMix),
      fluidGradientMid: clampNumber(parsed.fluidGradientMid, 0.25, 0.75, defaults.fluidGradientMid),
      fluidGradientMidAlpha: clampNumber(
        parsed.fluidGradientMidAlpha,
        0,
        1,
        defaults.fluidGradientMidAlpha,
      ),
      fluidBlurCapPx: clampNumber(parsed.fluidBlurCapPx, 0, FLUID_BLUR_MAX, defaults.fluidBlurCapPx),
      fluidDriftAmplitude: clampNumber(
        parsed.fluidDriftAmplitude,
        0,
        0.06,
        defaults.fluidDriftAmplitude,
      ),
      fluidSheen: clampNumber(parsed.fluidSheen, 0, 1, defaults.fluidSheen),
      fluidBlendMode:
        parsed.fluidBlendMode === "screen" ? "screen" : (defaults.fluidBlendMode ?? "normal"),
      fluidMeshOpacity: clampNumber(parsed.fluidMeshOpacity, 0, 1, defaults.fluidMeshOpacity),
      blobColors,
    };
  } catch (_err) {
    return tuningKeys;
  }
}

export function createBackgroundDebugUiController({
  elements,
  background,
  tuning,
  defaults,
  storageKey,
  onPlayClick,
} = {}) {
  const {
    toggleBtn,
    panelEl,
    resetBtn,
    presetBtn,
    fitFluidBtn,
    getCamera,
    fluidMeshToggle,
    circlesVisibleToggle,
    linearFilterToggle,
    textureRepeatSlider,
    textureRepeatValue,
    gapPxSlider,
    gapPxValue,
    circleRadiusSlider,
    circleRadiusValue,
    circleOpacitySlider,
    circleOpacityValue,
    fluidBaseHexInput,
    fluidBlendSelect,
    fluidBlurSlider,
    fluidBlurValue,
    fluidDriftSlider,
    fluidDriftValue,
    fluidBlobOpacitySlider,
    fluidBlobOpacityValue,
    fluidBrightnessSlider,
    fluidBrightnessValue,
    fluidSaturationSlider,
    fluidSaturationValue,
    fluidWhiteMixSlider,
    fluidWhiteMixValue,
    fluidGradientMidSlider,
    fluidGradientMidValue,
    fluidGradientMidAlphaSlider,
    fluidGradientMidAlphaValue,
    fluidBlurCapSlider,
    fluidBlurCapValue,
    fluidDriftAmplitudeSlider,
    fluidDriftAmplitudeValue,
    fluidSheenSlider,
    fluidSheenValue,
    fluidMeshOpacitySlider,
    fluidMeshOpacityValue,
    scrollSpeedSlider,
    scrollSpeedValue,
    planeSizeSlider,
    planeSizeValue,
    tileHintEl,
    blobHexInputs = [],
  } = elements ?? {};

  const sliders = [
    {
      key: "circleRadiusPx",
      sliderEl: circleRadiusSlider,
      valueEl: circleRadiusValue,
      read: () => readSliderValue(circleRadiusSlider),
    },
    {
      key: "gapPx",
      sliderEl: gapPxSlider,
      valueEl: gapPxValue,
      read: () => readSliderValue(gapPxSlider),
    },
    {
      key: "circlePatternOpacity",
      sliderEl: circleOpacitySlider,
      valueEl: circleOpacityValue,
      read: () => readSliderValue(circleOpacitySlider),
    },
    {
      key: "fluidBlobOpacity",
      sliderEl: fluidBlobOpacitySlider,
      valueEl: fluidBlobOpacityValue,
      read: () => readSliderValue(fluidBlobOpacitySlider),
    },
    {
      key: "fluidBrightness",
      sliderEl: fluidBrightnessSlider,
      valueEl: fluidBrightnessValue,
      read: () => readSliderValue(fluidBrightnessSlider),
    },
    {
      key: "fluidSaturation",
      sliderEl: fluidSaturationSlider,
      valueEl: fluidSaturationValue,
      read: () => readSliderValue(fluidSaturationSlider),
    },
    {
      key: "fluidWhiteMix",
      sliderEl: fluidWhiteMixSlider,
      valueEl: fluidWhiteMixValue,
      read: () => readSliderValue(fluidWhiteMixSlider),
    },
    {
      key: "fluidGradientMid",
      sliderEl: fluidGradientMidSlider,
      valueEl: fluidGradientMidValue,
      read: () => readSliderValue(fluidGradientMidSlider),
    },
    {
      key: "fluidGradientMidAlpha",
      sliderEl: fluidGradientMidAlphaSlider,
      valueEl: fluidGradientMidAlphaValue,
      read: () => readSliderValue(fluidGradientMidAlphaSlider),
    },
    {
      key: "fluidBlurPx",
      sliderEl: fluidBlurSlider,
      valueEl: fluidBlurValue,
      read: () => readSliderValue(fluidBlurSlider),
    },
    {
      key: "fluidBlurCapPx",
      sliderEl: fluidBlurCapSlider,
      valueEl: fluidBlurCapValue,
      read: () => readSliderValue(fluidBlurCapSlider),
    },
    {
      key: "fluidDriftSpeed",
      sliderEl: fluidDriftSlider,
      valueEl: fluidDriftValue,
      read: () => readSliderValue(fluidDriftSlider),
    },
    {
      key: "fluidDriftAmplitude",
      sliderEl: fluidDriftAmplitudeSlider,
      valueEl: fluidDriftAmplitudeValue,
      read: () => readSliderValue(fluidDriftAmplitudeSlider),
    },
    {
      key: "fluidSheen",
      sliderEl: fluidSheenSlider,
      valueEl: fluidSheenValue,
      read: () => readSliderValue(fluidSheenSlider),
    },
    {
      key: "fluidMeshOpacity",
      sliderEl: fluidMeshOpacitySlider,
      valueEl: fluidMeshOpacityValue,
      read: () => readSliderValue(fluidMeshOpacitySlider),
    },
    {
      key: "textureRepeat",
      sliderEl: textureRepeatSlider,
      valueEl: textureRepeatValue,
      read: () => readSliderValue(textureRepeatSlider),
    },
    {
      key: "scrollSpeed",
      sliderEl: scrollSpeedSlider,
      valueEl: scrollSpeedValue,
      read: () => readSliderValue(scrollSpeedSlider),
    },
    {
      key: "planeSize",
      sliderEl: planeSizeSlider,
      valueEl: planeSizeValue,
      read: () => readSliderValue(planeSizeSlider),
    },
  ];

  function readBlobColorsFromUi() {
    const colors = tuning.blobColors ? [...tuning.blobColors] : [];
    blobHexInputs.forEach((input, i) => {
      if (!input) return;
      colors[i] = parseHexField(input.value, colors[i] ?? 0xffffff);
    });
    return colors;
  }

  function syncBlobHexInputsFromTuning() {
    blobHexInputs.forEach((input, i) => {
      if (!input || tuning.blobColors?.[i] == null) return;
      input.value = hexFieldFromNumber(tuning.blobColors[i]);
    });
  }

  function setValueLabel(entry, value) {
    if (!entry.valueEl || !entry.sliderEl) return;
    const step = Number(entry.sliderEl.step || 1);
    entry.valueEl.textContent = formatValue(value, step);
  }

  function updateTileHint() {
    if (!tileHintEl || !background?.getTuning) return;
    const applied = background.getTuning();
    const { tilePx, planeSize, fluidPlaneSize } = applied;
    const lines = [
      `Fluid cover: ${formatValue(fluidPlaneSize ?? 0, 0.1)} (min ${FLUID_PLANE_SIZE_MIN})`,
      `Circle plane: ${formatValue(planeSize ?? 0, 0.1)} · tile ${tilePx} px`,
    ];
    if ((planeSize ?? 0) < 12) {
      lines.push("Circle plane very small — fluid uses separate cover size.");
    }
    tileHintEl.textContent = lines.join(" · ");
  }

  function readFluidBaseColorFromUi() {
    if (!fluidBaseHexInput) return tuning.fluidBaseColor;
    return parseHexField(fluidBaseHexInput.value, tuning.fluidBaseColor ?? defaults.fluidBaseColor);
  }

  function syncFluidBaseHexFromTuning() {
    if (!fluidBaseHexInput || tuning.fluidBaseColor == null) return;
    fluidBaseHexInput.value = hexFieldFromNumber(tuning.fluidBaseColor);
  }

  function applyTuningToScene() {
    tuning.fluidMeshEnabled = fluidMeshToggle?.checked !== false;
    tuning.circlesVisible = circlesVisibleToggle?.checked !== false;
    tuning.linearFilter = linearFilterToggle?.checked !== false;
    tuning.fluidBlendMode =
      fluidBlendSelect?.value === "screen" ? "screen" : (defaults.fluidBlendMode ?? "normal");
    tuning.fluidBaseColor = readFluidBaseColorFromUi();
    tuning.blobColors = readBlobColorsFromUi();
    background?.applyTuning?.(tuning);
    const applied = background?.getTuning?.();
    if (applied) {
      tuning.gapPx = applied.gapPx;
      tuning.circleRadiusPx = applied.circleRadiusPx;
      if (applied.blobColors) tuning.blobColors = [...applied.blobColors];
      if (applied.fluidPlaneSize != null) tuning.fluidPlaneSize = applied.fluidPlaneSize;
    }
    updateTileHint();
  }

  function syncUiFromTuning() {
    if (fluidMeshToggle) fluidMeshToggle.checked = tuning.fluidMeshEnabled !== false;
    if (circlesVisibleToggle) circlesVisibleToggle.checked = tuning.circlesVisible !== false;
    if (linearFilterToggle) linearFilterToggle.checked = tuning.linearFilter !== false;
    syncBlobHexInputsFromTuning();
    syncFluidBaseHexFromTuning();
    if (fluidBlendSelect) {
      fluidBlendSelect.value =
        tuning.fluidBlendMode === "screen" ? "screen" : "normal";
    }
    for (const entry of sliders) {
      if (entry.sliderEl) {
        entry.sliderEl.value = String(tuning[entry.key] ?? defaults[entry.key]);
      }
      setValueLabel(entry, tuning[entry.key] ?? defaults[entry.key]);
    }
    applyTuningToScene();
  }

  function persistTuning() {
    if (typeof window === "undefined" || !window.localStorage || !storageKey) return;
    try {
      const payload = { ...tuning };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (_err) {
      // ignore write failures in debug UI
    }
  }

  function onTuningChange() {
    for (const entry of sliders) {
      tuning[entry.key] = entry.read();
      setValueLabel(entry, tuning[entry.key]);
    }
    tuning.fluidMeshEnabled = fluidMeshToggle?.checked !== false;
    tuning.circlesVisible = circlesVisibleToggle?.checked !== false;
    tuning.linearFilter = linearFilterToggle?.checked !== false;
    tuning.fluidBlendMode =
      fluidBlendSelect?.value === "screen" ? "screen" : (defaults.fluidBlendMode ?? "normal");
    tuning.fluidBaseColor = readFluidBaseColorFromUi();
    tuning.blobColors = readBlobColorsFromUi();
    applyTuningToScene();
    for (const entry of sliders) {
      if (entry.key !== "gapPx" && entry.key !== "circleRadiusPx") continue;
      if (!entry.sliderEl) continue;
      entry.sliderEl.value = String(tuning[entry.key]);
      setValueLabel(entry, tuning[entry.key]);
    }
    persistTuning();
  }

  function resetToDefaults() {
    const blobColors = (defaults.fluidBlobs ?? REFERENCE_PASTEL_BLOBS).map((b) => b.color);
    Object.assign(tuning, { ...defaults, blobColors });
    syncUiFromTuning();
    persistTuning();
  }

  function applyBoardComplement({ resetBlur = true, persist = true, syncUi = true } = {}) {
    const preset = background?.applyReferencePreset?.({ resetBlur });
    const applied = background?.getTuning?.();
    if (applied) {
      if (applied.blobColors) tuning.blobColors = [...applied.blobColors];
      if (applied.fluidBaseColor != null) tuning.fluidBaseColor = applied.fluidBaseColor;
    }
    if (preset?.blobColors) tuning.blobColors = [...preset.blobColors];
    if (preset?.fluidBaseColor != null) tuning.fluidBaseColor = preset.fluidBaseColor;
    if (syncUi) syncUiFromTuning();
    if (persist) persistTuning();
    return preset;
  }

  function applyPreset() {
    applyBoardComplement({ resetBlur: true, persist: true, syncUi: true });
  }

  function bind() {
    if (!toggleBtn || !panelEl) return;

    toggleBtn.addEventListener("click", () => {
      onPlayClick?.();
      panelEl.classList.toggle("hidden");
    });

    fluidMeshToggle?.addEventListener("change", onTuningChange);
    circlesVisibleToggle?.addEventListener("change", onTuningChange);
    linearFilterToggle?.addEventListener("change", onTuningChange);
    fluidBlendSelect?.addEventListener("change", onTuningChange);
    fluidBaseHexInput?.addEventListener("change", onTuningChange);
    fluidBaseHexInput?.addEventListener("input", onTuningChange);
    for (const entry of sliders) {
      entry.sliderEl?.addEventListener("input", onTuningChange);
    }
    for (const input of blobHexInputs) {
      input?.addEventListener("change", onTuningChange);
      input?.addEventListener("input", onTuningChange);
    }

    presetBtn?.addEventListener("click", () => {
      onPlayClick?.();
      applyPreset();
    });

    fitFluidBtn?.addEventListener("click", () => {
      onPlayClick?.();
      const cover = background?.fitFluidToView?.(getCamera?.());
      if (cover != null) {
        tuning.fluidPlaneSize = cover;
        applyTuningToScene();
        persistTuning();
      }
    });

    resetBtn?.addEventListener("click", () => {
      onPlayClick?.();
      resetToDefaults();
    });

    syncUiFromTuning();
  }

  return {
    bind,
    syncUiFromTuning,
    resetToDefaults,
    applyPreset,
    applyBoardComplement,
  };
}