import { TUNING_EXPORT_KEYS } from "../dev/export-tuning-snapshot.js";
import { getDevTuningEntry } from "../config/dev-tuning-defaults.js";
import { PLAYFIELD_BACKGROUND_DEFAULTS } from "../systems/playfield-background.js";
import { loadTessellatedBackgroundTuning } from "./background-debug-ui.js";

export function clearDevTuningLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;
  for (const key of TUNING_EXPORT_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  }
}

export function shippedBackgroundDefaults() {
  const entry = getDevTuningEntry("tessellated_bg_tuning_v1") ?? {};
  const blobColors = Array.isArray(entry.blobColors)
    ? entry.blobColors
    : (PLAYFIELD_BACKGROUND_DEFAULTS.fluidBlobs ?? []).map((b) => b.color);
  return {
    ...PLAYFIELD_BACKGROUND_DEFAULTS,
    ...entry,
    blobColors,
  };
}

/**
 * Drops browser tuning overrides and reapplies values bundled from dev-tuning.defaults.json.
 */
export function reapplyShippedTuningDefaults({
  bubbleTuning,
  tessellatedBackgroundTuning,
  tessellatedBackgroundTuningStorageKey,
  playfieldBackground,
  lightDebugUi,
  backgroundDebugUi,
  popRingDebugUi,
  bubblePopDebugUi,
  winCinematicTuning,
  hudDebugTuning,
  uiLayoutDebugTuning,
  applyHudDebugTuning,
  applyUiLayoutDebugTuning,
  applyHomeUiTuning,
} = {}) {
  clearDevTuningLocalStorage();

  const shippedBubble = getDevTuningEntry("bubble_tuning_v1");
  if (shippedBubble && bubbleTuning) {
    Object.assign(bubbleTuning, shippedBubble);
    lightDebugUi?.syncUiFromTuning?.();
  }

  if (tessellatedBackgroundTuning) {
    const freshBg = loadTessellatedBackgroundTuning(
      shippedBackgroundDefaults(),
      tessellatedBackgroundTuningStorageKey,
    );
    Object.assign(tessellatedBackgroundTuning, freshBg);
    playfieldBackground?.applyTuning?.(tessellatedBackgroundTuning);
    backgroundDebugUi?.syncUiFromTuning?.();
  }

  popRingDebugUi?.resetToDefaults?.();
  bubblePopDebugUi?.resetToDefaults?.();
  winCinematicTuning?.reset?.();

  const shippedHud = getDevTuningEntry("fruit_hud_debug_v1");
  if (shippedHud && hudDebugTuning) {
    Object.assign(hudDebugTuning, shippedHud);
    applyHudDebugTuning?.(hudDebugTuning);
  }

  const shippedLayout = getDevTuningEntry("fruit_ui_layout_debug_v1");
  if (shippedLayout && uiLayoutDebugTuning) {
    Object.assign(uiLayoutDebugTuning, shippedLayout);
    applyUiLayoutDebugTuning?.(uiLayoutDebugTuning);
  }

  const shippedHome = getDevTuningEntry("fruit_home_ui_tuning_v1");
  if (shippedHome) {
    applyHomeUiTuning?.(shippedHome);
  }
}