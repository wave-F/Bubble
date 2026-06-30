import * as THREE from "three/webgpu";

const DEFAULT_TEXT = "#c9585f";
const DEFAULT_BG_TOP = "rgba(255, 246, 244, 0.95)";
const DEFAULT_BG_BOTTOM = "rgba(255, 232, 226, 0.92)";
const DEFAULT_BORDER = "rgba(255, 255, 255, 0.5)";
const DEFAULT_SHADOW = "rgba(78, 25, 25, 0.15)";

function countColorIds(entries, getColorId) {
  const counts = new Map();
  for (const entry of entries) {
    const colorId = Math.floor(getColorId(entry));
    if (!Number.isInteger(colorId) || colorId < 0) continue;
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }
  return counts;
}

function pickDominantFromCounts(counts) {
  let bestId = -1;
  let bestCount = -1;
  for (const [colorId, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && (bestId < 0 || colorId < bestId))) {
      bestId = colorId;
      bestCount = count;
    }
  }
  return bestId;
}

/** @param {Record<string, unknown> | null | undefined} level */
export function resolveDominantColorId(level) {
  if (!level) return 0;

  const gridSize = Math.max(3, Math.floor(Number(level.gridSize) || 3));
  const cellCount = gridSize * gridSize;

  if (Array.isArray(level.cells) && level.cells.length === cellCount) {
    const counts = countColorIds(level.cells, (id) => id);
    const dominant = pickDominantFromCounts(counts);
    if (dominant >= 0) return dominant;
  }

  if (Array.isArray(level.colorCounts) && level.colorCounts.length > 0) {
    const counts = countColorIds(level.colorCounts, (row) => row?.colorId);
    const dominant = pickDominantFromCounts(counts);
    if (dominant >= 0) return dominant;
  }

  return 0;
}

function colorToCssHex(color) {
  return `#${color.getHexString()}`;
}

function colorToRgbaString(color, alpha) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildHudThemeFromBase(baseHex) {
  const bubble = new THREE.Color(baseHex);
  const white = new THREE.Color(0xffffff);

  const text = bubble.clone().offsetHSL(0, 0.06, -0.12);
  const bgTop = bubble.clone().lerp(white, 0.9);
  bgTop.offsetHSL(0, -0.08, 0.22);
  const bgBottom = bubble.clone().lerp(white, 0.86);
  bgBottom.offsetHSL(0, -0.04, 0.14);
  const border = bubble.clone().lerp(white, 0.78);
  border.offsetHSL(0, -0.12, 0.28);
  const shadow = bubble.clone().offsetHSL(0, 0.08, -0.35);

  return {
    text: colorToCssHex(text),
    bgTop: colorToRgbaString(bgTop, 0.95),
    bgBottom: colorToRgbaString(bgBottom, 0.92),
    border: colorToRgbaString(border, 0.55),
    shadow: colorToRgbaString(shadow, 0.18),
  };
}

function clearHudTheme(hudRootEl) {
  if (!hudRootEl?.style) return;
  hudRootEl.style.removeProperty("--gameplay-hud-text");
  hudRootEl.style.removeProperty("--gameplay-hud-bg-top");
  hudRootEl.style.removeProperty("--gameplay-hud-bg-bottom");
  hudRootEl.style.removeProperty("--gameplay-hud-border");
  hudRootEl.style.removeProperty("--gameplay-hud-shadow");
}

/**
 * @param {Record<string, unknown> | null | undefined} level
 * @param {{ base: number }[]} palette
 * @param {{ hudRootEl?: HTMLElement | null }} [options]
 */
export function applyGameplayHudTheme(level, palette, { hudRootEl } = {}) {
  if (!hudRootEl) return;

  const paletteSize = Array.isArray(palette) ? palette.length : 0;
  if (!level || paletteSize <= 0) {
    clearHudTheme(hudRootEl);
    return;
  }

  let colorId = resolveDominantColorId(level);
  if (colorId < 0 || colorId >= paletteSize) colorId = 0;

  const baseHex = palette[colorId]?.base ?? 0xff0037;
  const theme = buildHudThemeFromBase(baseHex);

  hudRootEl.style.setProperty("--gameplay-hud-text", theme.text);
  hudRootEl.style.setProperty("--gameplay-hud-bg-top", theme.bgTop);
  hudRootEl.style.setProperty("--gameplay-hud-bg-bottom", theme.bgBottom);
  hudRootEl.style.setProperty("--gameplay-hud-border", theme.border);
  hudRootEl.style.setProperty("--gameplay-hud-shadow", theme.shadow);
}

export const GAMEPLAY_HUD_THEME_DEFAULTS = {
  text: DEFAULT_TEXT,
  bgTop: DEFAULT_BG_TOP,
  bgBottom: DEFAULT_BG_BOTTOM,
  border: DEFAULT_BORDER,
  shadow: DEFAULT_SHADOW,
};

/**
 * MOVE / LV chips and restart visibility (hidden during victory until next level load).
 * @param {{ hudMetaLeftEl?: HTMLElement | null, restartBtnEl?: HTMLElement | null }} targets
 */
export function setGameplayHudControlsVisible(visible, { hudMetaLeftEl, restartBtnEl } = {}) {
  const awaiting = !visible;
  const nodes = [hudMetaLeftEl, restartBtnEl];
  for (const el of nodes) {
    if (!el) continue;
    el.classList.toggle("is-awaiting-level-spawn", awaiting);
    if (awaiting) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  }
}