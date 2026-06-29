export function normalizeWinMode(value) {
  return value === "retain" ? "retain" : "unify";
}

export function normalizeRetainTargets(rawTargets, maxColorId = 7) {
  if (!Array.isArray(rawTargets)) return [];

  const merged = new Map();
  for (const item of rawTargets) {
    if (!item) continue;
    const colorId = Math.floor(item.colorId);
    const count = Math.floor(item.count);
    if (colorId < 0 || colorId > maxColorId || count <= 0) continue;
    merged.set(colorId, count);
  }

  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([colorId, count]) => ({ colorId, count }));
}

export function countActiveByColor(fruits) {
  const counts = new Map();
  for (const fruit of fruits) {
    if (!fruit?.active || fruit.sliced) continue;
    const colorId = fruit.colorId;
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }
  return counts;
}

export function isRetainWinMet(counts, retainTargets) {
  if (!retainTargets?.length) return false;

  const targetColors = new Set();
  for (const target of retainTargets) {
    if ((counts.get(target.colorId) ?? 0) !== target.count) return false;
    targetColors.add(target.colorId);
  }

  for (const [colorId, count] of counts) {
    if (count > 0 && !targetColors.has(colorId)) return false;
  }

  return true;
}

export function evaluateLevelWin({
  winMode = "unify",
  retainTargets = [],
  fruits,
  isBoardUnified,
}) {
  const mode = normalizeWinMode(winMode);

  if (mode === "retain") {
    const counts = countActiveByColor(fruits);
    const met = isRetainWinMet(counts, retainTargets);
    return { met, kind: met ? "retain" : null, mode };
  }

  const unify = typeof isBoardUnified === "function" ? isBoardUnified() : false;
  return { met: unify, kind: unify ? "unify" : null, mode };
}

export function boardColorCounts(board) {
  const counts = new Map();
  for (const colorId of board) {
    if (colorId < 0) continue;
    counts.set(colorId, (counts.get(colorId) ?? 0) + 1);
  }
  return counts;
}

export function isRetainWinMetFromBoard(board, retainTargets) {
  return isRetainWinMet(boardColorCounts(board), retainTargets);
}