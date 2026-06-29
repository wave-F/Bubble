function formatValue(value, step) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  return value.toFixed(decimals);
}

function readSliderValue(slider) {
  return Number(slider?.value ?? 0);
}

export function createLightDebugUiController({
  elements,
  lights,
  tuning,
  defaults,
  storageKey,
  onPlayClick,
} = {}) {
  const {
    toggleBtn,
    panelEl,
    resetBtn,
    ambientToggle,
    ambientSlider,
    ambientValue,
    keyToggle,
    keySlider,
    keyValue,
    rimToggle,
    rimSlider,
    rimValue,
    fillToggle,
    fillSlider,
    fillValue,
    environmentToggle,
    environmentSlider,
    environmentValue,
  } = elements ?? {};

  const groups = [
    {
      name: "ambient",
      toggleEl: ambientToggle,
      sliderEl: ambientSlider,
      valueEl: ambientValue,
      intensityKey: "lightAmbient",
      toggleKey: "toggleLightAmbient",
      applyIntensity: (value) => {
        lights.ambient.intensity = value;
      },
      applyToggle: (enabled) => {
        lights.ambient.visible = enabled;
      },
    },
    {
      name: "key",
      toggleEl: keyToggle,
      sliderEl: keySlider,
      valueEl: keyValue,
      intensityKey: "lightKey",
      toggleKey: "toggleLightKey",
      applyIntensity: (value) => {
        lights.key.intensity = value;
      },
      applyToggle: (enabled) => {
        lights.key.visible = enabled;
      },
    },
    {
      name: "rim",
      toggleEl: rimToggle,
      sliderEl: rimSlider,
      valueEl: rimValue,
      intensityKey: "lightRim",
      toggleKey: "toggleLightRim",
      applyIntensity: (value) => {
        lights.rim.intensity = value;
      },
      applyToggle: (enabled) => {
        lights.rim.visible = enabled;
      },
    },
    {
      name: "fill",
      toggleEl: fillToggle,
      sliderEl: fillSlider,
      valueEl: fillValue,
      intensityKey: "lightFill",
      toggleKey: "toggleLightFill",
      applyIntensity: (value) => {
        lights.fill.intensity = value;
      },
      applyToggle: (enabled) => {
        lights.fill.visible = enabled;
      },
    },
    {
      name: "environment",
      toggleEl: environmentToggle,
      sliderEl: environmentSlider,
      valueEl: environmentValue,
      intensityKey: "lightEnvironment",
      toggleKey: "toggleLightEnvironment",
      applyIntensity: (value) => {
        lights.scene.environmentIntensity = value;
      },
      applyToggle: (enabled) => {
        if (!enabled) {
          lights.scene.environmentIntensity = 0;
          return;
        }
        lights.scene.environmentIntensity = readSliderValue(environmentSlider);
      },
    },
  ];

  function setValueLabel(group, value) {
    if (!group.valueEl || !group.sliderEl) return;
    const step = Number(group.sliderEl.step || 0.01);
    group.valueEl.textContent = formatValue(value, step);
  }

  function setSliderEnabled(group, enabled) {
    if (!group.sliderEl) return;
    group.sliderEl.disabled = !enabled;
    group.sliderEl.classList.toggle("is-disabled", !enabled);
  }

  function applyGroup(group) {
    const enabled = group.toggleEl?.checked !== false;
    const intensity = readSliderValue(group.sliderEl);
    tuning[group.intensityKey] = intensity;
    tuning[group.toggleKey] = enabled;
    group.applyIntensity(intensity);
    group.applyToggle(enabled);
    if (group.name === "environment" && enabled) {
      lights.scene.environmentIntensity = intensity;
    }
    setValueLabel(group, intensity);
    setSliderEnabled(group, enabled);
  }

  function applyAll() {
    for (const group of groups) {
      applyGroup(group);
    }
  }

  function syncUiFromTuning() {
    for (const group of groups) {
      if (group.sliderEl) {
        group.sliderEl.value = String(tuning[group.intensityKey] ?? defaults[group.intensityKey]);
      }
      if (group.toggleEl) {
        group.toggleEl.checked = tuning[group.toggleKey] !== false;
      }
      setValueLabel(group, tuning[group.intensityKey] ?? defaults[group.intensityKey]);
      setSliderEnabled(group, group.toggleEl?.checked !== false);
    }
    applyAll();
  }

  function persistTuning() {
    if (typeof window === "undefined" || !window.localStorage || !storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const existing = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...tuning }));
    } catch (_err) {
      // ignore write failures in debug UI
    }
  }

  function onGroupChange(group) {
    applyGroup(group);
    persistTuning();
  }

  function resetToDefaults() {
    for (const group of groups) {
      tuning[group.intensityKey] = defaults[group.intensityKey];
      tuning[group.toggleKey] = defaults[group.toggleKey] !== false;
    }
    syncUiFromTuning();
    persistTuning();
  }

  function bind() {
    if (!toggleBtn || !panelEl) return;

    toggleBtn.addEventListener("click", () => {
      onPlayClick?.();
      panelEl.classList.toggle("hidden");
    });

    for (const group of groups) {
      group.sliderEl?.addEventListener("input", () => onGroupChange(group));
      group.toggleEl?.addEventListener("change", () => onGroupChange(group));
    }

    resetBtn?.addEventListener("click", () => {
      onPlayClick?.();
      resetToDefaults();
    });

    syncUiFromTuning();
  }

  return {
    bind,
    applyAll,
    syncUiFromTuning,
    resetToDefaults,
  };
}