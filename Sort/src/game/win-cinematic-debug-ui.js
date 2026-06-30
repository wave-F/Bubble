const FIELD_SPECS = [
  { key: "prePopDelaySec", label: "Pre-pop delay (s)", step: 0.05, min: 0, max: 3 },
  { key: "settleAfterComplete", label: "Pop settle (s)", step: 0.05, min: 0, max: 2 },
  { key: "clearDelayMs", label: "Clear delay (ms)", step: 50, min: 0, max: 3000 },
  { key: "motionDuration", label: "Bg/grid fade (s)", step: 0.05, min: 0.1, max: 5 },
  { key: "overlayDelaySec", label: "Modal delay (s)", step: 0.05, min: 0.1, max: 8 },
  { key: "commentaryDurationMs", label: "Pill duration (ms)", step: 50, min: 200, max: 8000 },
  { key: "popInitialInterval", label: "Pop start (s)", step: 0.01, min: 0.02, max: 1 },
  { key: "popAccelFactor", label: "Pop accel", step: 0.01, min: 0.5, max: 0.99 },
  { key: "popMinInterval", label: "Pop min (s)", step: 0.005, min: 0.01, max: 0.5 },
  { key: "titleAnimSec", label: "Title anim (s)", step: 0.05, min: 0.1, max: 3 },
  { key: "btnDelaySec", label: "Btn delay (s)", step: 0.05, min: 0, max: 3 },
  { key: "btnAnimSec", label: "Btn anim (s)", step: 0.05, min: 0.1, max: 3 },
  { key: "loseOverlayDelaySec", label: "Lose modal delay (s)", step: 0.05, min: 0.1, max: 8 },
  { key: "loseTitleAnimSec", label: "Lose title anim (s)", step: 0.05, min: 0.1, max: 3 },
  { key: "loseBtnDelaySec", label: "Lose btn delay (s)", step: 0.05, min: 0, max: 3 },
  { key: "loseBtnAnimSec", label: "Lose btn anim (s)", step: 0.05, min: 0.1, max: 3 },
];

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

export function createWinCinematicDebugUi({
  elements,
  tuning,
  getRuntime,
} = {}) {
  const {
    toggleBtn,
    panelEl,
    resetBtn,
    hexInputEl,
    previewWinBtn,
    previewLoseBtn,
    usePaletteCheckbox,
    previewColorSelect,
  } = elements ?? {};
  const inputs = new Map();
  let previewActive = false;
  let previewRaf = 0;

  function runtime() {
    return typeof getRuntime === "function" ? getRuntime() : null;
  }

  function syncFieldsFromTuning() {
    const values = tuning.get();
    for (const spec of FIELD_SPECS) {
      const input = inputs.get(spec.key);
      if (input) input.value = String(values[spec.key]);
    }
    if (hexInputEl) {
      hexInputEl.value = values.bgToHex;
      hexInputEl.disabled = values.useBubblePalette !== false;
    }
    if (usePaletteCheckbox) {
      usePaletteCheckbox.checked = values.useBubblePalette !== false;
    }
    if (previewColorSelect) {
      previewColorSelect.value = values.previewBubbleColorId ?? "blue";
    }
  }

  function readFieldsIntoTuning() {
    const partial = {};
    for (const spec of FIELD_SPECS) {
      const input = inputs.get(spec.key);
      partial[spec.key] = Number(input?.value);
    }
    if (hexInputEl) partial.bgToHex = hexInputEl.value;
    if (usePaletteCheckbox) partial.useBubblePalette = usePaletteCheckbox.checked;
    if (previewColorSelect) partial.previewBubbleColorId = previewColorSelect.value;
    tuning.set(partial);
    tuning.saveToStorage();
    syncFieldsFromTuning();
  }

  function stopPreview() {
    previewActive = false;
    if (previewRaf) {
      cancelAnimationFrame(previewRaf);
      previewRaf = 0;
    }
  }

  function closeOverlays() {
    const rt = runtime();
    rt?.gameUI?.closeSimpleLevelWin?.();
    rt?.gameplayTip?.clear?.();
  }

  async function previewWin() {
    const rt = runtime();
    if (previewActive || !rt) return;
    stopPreview();
    closeOverlays();

    const cfg = tuning.get();
    const { victoryPresentation, gridBoardSystem, scene, gameplayTip, gameUI, phoneFrameEl } = rt;

    victoryPresentation.reset({ scene });
    if (phoneFrameEl && !gridBoardSystem) {
      phoneFrameEl.classList.remove("is-victory-presentation");
    }

    const layout = rt.getGridLayout?.();
    if (gridBoardSystem && layout) {
      gridBoardSystem.show(layout, { fadeIn: false });
    }

    const previewColorId = rt.getPreviewBubbleColorId?.();
    rt.applyVictoryPalette?.(previewColorId);

    victoryPresentation.start({ gridBoardSystem });

    previewActive = true;
    let elapsed = 0;
    let last = performance.now();

    const step = (now) => {
      if (!previewActive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      victoryPresentation.update(dt, { scene });

      if (elapsed < cfg.overlayDelaySec) {
        previewRaf = requestAnimationFrame(step);
        return;
      }

      previewActive = false;
      previewRaf = 0;
      victoryPresentation.stop?.();
      gameUI?.openSimpleLevelWin?.({
        title: `第${(rt.getLevelNumber?.() ?? 0) + 1}关通关`,
        actionText: "下一关",
        variant: "win",
        onAction: () => {
          gameUI?.closeSimpleLevelWin?.();
          victoryPresentation.reset({ scene });
          rt.clearVictoryPalette?.();
        },
      });
    };

    previewRaf = requestAnimationFrame(step);
  }

  function previewLose() {
    const rt = runtime();
    stopPreview();
    closeOverlays();
    rt?.clearVictoryPalette?.();
    rt?.victoryPresentation?.reset?.({ scene: rt?.scene });

    const level = (rt?.getLevelNumber?.() ?? 0) + 1;
    tuning.applyLoseCssVars();
    rt?.gameUI?.openSimpleLevelWin?.({
      title: `第${level}关失败`,
      desc: "步数用完了",
      actionText: "重新开始",
      variant: "lose",
      onAction: () => rt?.gameUI?.closeSimpleLevelWin?.(),
    });
  }

  function mountPreviewColorOptions() {
    if (!previewColorSelect) return;
    const rt = runtime();
    const list = rt?.colors ?? [];
    previewColorSelect.innerHTML = "";
    for (const color of list) {
      const option = document.createElement("option");
      option.value = color.id;
      option.textContent = color.name ?? color.id;
      previewColorSelect.appendChild(option);
    }
    const values = tuning.get();
    previewColorSelect.value = values.previewBubbleColorId ?? "blue";
  }

  function mountFieldInputs() {
    if (!panelEl) return;
    const form = panelEl.querySelector("[data-cinematic-fields]");
    if (!form) return;

    for (const spec of FIELD_SPECS) {
      let row = form.querySelector(`[data-field="${spec.key}"]`);
      if (!row) {
        row = document.createElement("div");
        row.className = "win-cinematic-field";
        row.dataset.field = spec.key;
        row.innerHTML = `
          <label></label>
          <input type="number" />
        `;
        form.appendChild(row);
      }
      const label = row.querySelector("label");
      const input = row.querySelector("input");
      label.textContent = spec.label;
      input.step = String(spec.step);
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.addEventListener("change", () => readFieldsIntoTuning());
      inputs.set(spec.key, input);
    }
  }

  function bindUi() {
    mountFieldInputs();
    mountPreviewColorOptions();
    syncFieldsFromTuning();

    toggleBtn?.addEventListener("click", () => {
      panelEl?.classList.toggle("hidden");
    });

    resetBtn?.addEventListener("click", () => {
      tuning.reset();
      tuning.saveToStorage();
      syncFieldsFromTuning();
    });

    hexInputEl?.addEventListener("change", () => readFieldsIntoTuning());
    usePaletteCheckbox?.addEventListener("change", () => readFieldsIntoTuning());
    previewColorSelect?.addEventListener("change", () => readFieldsIntoTuning());
    previewWinBtn?.addEventListener("click", () => previewWin());
    previewLoseBtn?.addEventListener("click", () => previewLose());

    window.addEventListener("keydown", (ev) => {
      if (ev.repeat || isTypingTarget(ev.target)) return;
      const key = ev.key.toLowerCase();
      if (key === "w") {
        ev.preventDefault();
        previewWin();
      } else if (key === "l") {
        ev.preventDefault();
        previewLose();
      }
    });
  }

  return {
    bindUi,
    syncFieldsFromTuning,
    previewWin,
    previewLose,
    stopPreview,
  };
}