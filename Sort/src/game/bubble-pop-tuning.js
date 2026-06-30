export const BUBBLE_POP_STORAGE_KEY = "bubble_pop_tuning_v1";

export const BUBBLE_POP_DEFAULTS = {
  flashMode: "white",
  lightBubbleLift: 0.22,
};

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** @param {Partial<typeof BUBBLE_POP_DEFAULTS>} partial */
export function normalizeBubblePopTuning(partial = {}) {
  const d = BUBBLE_POP_DEFAULTS;
  const mode = partial.flashMode === "lightBubble" ? "lightBubble" : "white";
  return {
    flashMode: mode,
    lightBubbleLift: clampNumber(partial.lightBubbleLift, 0.05, 0.45, d.lightBubbleLift),
  };
}

export function loadBubblePopTuning(storageKey, defaults = BUBBLE_POP_DEFAULTS) {
  if (typeof window === "undefined" || !window.localStorage || !storageKey) {
    return normalizeBubblePopTuning(defaults);
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return normalizeBubblePopTuning(defaults);
    return normalizeBubblePopTuning({ ...defaults, ...JSON.parse(raw) });
  } catch {
    return normalizeBubblePopTuning(defaults);
  }
}