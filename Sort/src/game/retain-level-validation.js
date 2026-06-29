import {
  isRetainWinMetFromBoard,
  normalizeRetainTargets,
} from "./win-conditions.js";

export function validateRetainLevel(level, boardFromLevel) {
  const size = Math.max(3, Math.floor(level?.gridSize ?? 3));
  const cellCount = size * size;
  const targets = normalizeRetainTargets(level?.retainTargets);

  if (!targets.length) {
    return { ok: false, code: "emptyTargets" };
  }

  let targetSum = 0;
  for (const item of targets) targetSum += item.count;

  if (targetSum <= 0) {
    return { ok: false, code: "emptyTargets" };
  }
  if (targetSum > cellCount) {
    return { ok: false, code: "targetsTooMany", targetSum, cellCount };
  }

  const { board } = boardFromLevel(level);
  const initialCounts = new Map();
  for (const colorId of board) {
    if (colorId < 0) continue;
    initialCounts.set(colorId, (initialCounts.get(colorId) ?? 0) + 1);
  }

  for (const target of targets) {
    if ((initialCounts.get(target.colorId) ?? 0) < 1) {
      return { ok: false, code: "missingColor", colorId: target.colorId };
    }
  }

  const warnings = [];
  if (targetSum === cellCount) {
    warnings.push("allCellsTarget");
  }
  if (isRetainWinMetFromBoard(board, targets)) {
    warnings.push("alreadyWon");
  }

  return { ok: true, targets, warnings };
}