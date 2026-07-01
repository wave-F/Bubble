import { getDevTuningEntry } from "../config/dev-tuning-defaults.js";

export const POP_RING_SHAPES = ["ring", "cross", "roundedStar"];

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function popRingRepoDefaults() {
  return getDevTuningEntry("pop_ring_debug_v1") ?? {};
}

/** @param {Partial<ReturnType<typeof popRingRepoDefaults>>} partial */
export function normalizePopRingTuning(partial = {}) {
  const d = popRingRepoDefaults();
  let ringInner = clampNumber(partial.ringInner, 0.85, 0.99, d.ringInner);
  let ringOuter = clampNumber(partial.ringOuter, 1.01, 1.2, d.ringOuter);
  if (ringOuter <= ringInner + 0.01) {
    ringOuter = Math.min(1.2, ringInner + 0.02);
  }

  let scaleStart = clampNumber(partial.scaleStart, 0.4, 1.4, d.scaleStart);
  let scaleEnd = clampNumber(partial.scaleEnd, 1.5, 6, d.scaleEnd);
  if (scaleEnd < scaleStart + 0.2) {
    scaleEnd = scaleStart + 0.2;
  }

  const shape = POP_RING_SHAPES.includes(partial.shape) ? partial.shape : d.shape;

  return {
    shape,
    enabled: partial.enabled !== false,
    scaleStart,
    scaleEnd,
    ringInner,
    ringOuter,
    duration: clampNumber(partial.duration, 0.12, 1.2, d.duration),
    opacityPeak: clampNumber(partial.opacityPeak, 0.2, 1, d.opacityPeak),
    opacityAttack: clampNumber(partial.opacityAttack, 0.04, 0.4, d.opacityAttack),
    lightnessOffset: clampNumber(partial.lightnessOffset, 0, 0.4, d.lightnessOffset),
  };
}

export const POP_RING_DEFAULTS = normalizePopRingTuning({});

export function loadPopRingTuning(storageKey, defaults = POP_RING_DEFAULTS) {
  if (typeof window === "undefined" || !window.localStorage || !storageKey) {
    return normalizePopRingTuning(defaults);
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return normalizePopRingTuning(defaults);
    return normalizePopRingTuning({ ...defaults, ...JSON.parse(raw) });
  } catch (_err) {
    return normalizePopRingTuning(defaults);
  }
}