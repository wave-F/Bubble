import levelsConfig from "./config/levels.json" with { type: "json" };
import {
  mechanismsFromLevel,
  mechanismsToLevelList,
} from "./systems/mechanism-dye-logic.js";

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeColorCounts(rawCounts) {
  if (!Array.isArray(rawCounts)) return [];

  const counts = [];
  for (const row of rawCounts) {
    const colorId = Math.floor(asNumber(row?.colorId, -1));
    const count = Math.floor(asNumber(row?.count, 0));
    if (colorId < 0 || count <= 0) continue;
    counts.push({ colorId, count });
  }

  return counts;
}

function normalizeCells(rawCells, gridSize) {
  const cellCount = gridSize * gridSize;
  if (!Array.isArray(rawCells) || rawCells.length !== cellCount) return null;

  const cells = [];
  for (const value of rawCells) {
    const colorId = Math.floor(asNumber(value, -1));
    if (colorId < 0) return null;
    cells.push(colorId);
  }
  return cells;
}

function normalizeLevel(rawLevel, index) {
  const id = Math.floor(asNumber(rawLevel?.id, index + 1));
  const stepLimit = Math.max(1, Math.floor(asNumber(rawLevel?.stepLimit, 8)));
  const seed = Math.floor(asNumber(rawLevel?.seed, 10000 + id * 137));
  const name = String(rawLevel?.name ?? `关卡${id}`).trim() || `关卡${id}`;
  const rawDifficulty = String(rawLevel?.difficulty ?? "easy").toLowerCase();
  const difficulty = ["easy", "medium", "hard"].includes(rawDifficulty) ? rawDifficulty : "easy";
  const rawHomeBubbleColorId = Math.floor(asNumber(rawLevel?.homeBubbleColorId, -1));
  const homeBubbleColorId = rawHomeBubbleColorId >= 0 && rawHomeBubbleColorId <= 7 ? rawHomeBubbleColorId : null;
  const colorCounts = normalizeColorCounts(rawLevel?.colorCounts);

  if (!colorCounts.length) {
    throw new Error(`Invalid levels config: level id=${id} has empty colorCounts`);
  }

  const gridSize = Math.max(3, Math.floor(asNumber(rawLevel?.gridSize, 3)));
  const gridCellSize = asNumber(rawLevel?.gridCellSize, 1.05);
  const gridBubbleFill = asNumber(rawLevel?.gridBubbleFill, 0.84);
  const gridRadius = gridCellSize * 0.5 * gridBubbleFill;
  const gridVerticalAlignRaw = String(rawLevel?.gridVerticalAlign ?? "center").trim();
  const gridVerticalAlign = ["top", "center", "bottom"].includes(gridVerticalAlignRaw)
    ? gridVerticalAlignRaw
    : "center";
  const gridVerticalOffset = asNumber(rawLevel?.gridVerticalOffset, 0.2);
  const cellCount = gridSize * gridSize;
  const fruitCount = Math.max(cellCount, Math.floor(asNumber(rawLevel?.fruitCount, colorCounts.reduce((sum, item) => sum + item.count, 0))));
  const cells = normalizeCells(rawLevel?.cells, gridSize);
  const mechanismMap = mechanismsFromLevel(rawLevel, gridSize);
  const mechanisms = mechanismsToLevelList(mechanismMap);
  const winModeRaw = String(rawLevel?.winMode ?? "unify").toLowerCase();
  const winMode = winModeRaw === "retain" ? "retain" : "unify";
  const retainTargets = winMode === "retain"
    ? normalizeColorCounts(rawLevel?.retainTargets)
    : [];

  return {
    id,
    name,
    difficulty,
    homeBubbleColorId,
    stepLimit,
    seed,
    fruitCount,
    gridSize,
    gridCellSize,
    gridBubbleFill,
    gridRadius,
    gridVerticalAlign,
    gridVerticalOffset,
    colorIds: Array.isArray(rawLevel?.colorIds) ? rawLevel.colorIds.map((v) => Math.floor(asNumber(v, 0))) : undefined,
    colorCounts,
    cells,
    mechanisms,
    winMode,
    retainTargets,
  };
}

const rawLevels = Array.isArray(levelsConfig?.levels) ? levelsConfig.levels : [];

if (!rawLevels.length) {
  throw new Error("Invalid levels config: src/config/levels.json has no levels");
}

export const LEVELS = rawLevels.map(normalizeLevel);