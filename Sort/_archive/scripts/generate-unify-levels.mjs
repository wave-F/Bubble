import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const OUTPUT = path.join(process.cwd(), "src/config/levels.json");
const AVAILABLE_COLOR_IDS = [0, 1, 2, 3, 4, 5, 6, 7];
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const LEVEL_SPECS = [
  { id: 1, name: "染色-01", difficulty: "easy", gridSize: 3, colorCount: 2, minSteps: [1, 2], buffer: 8 },
  { id: 2, name: "染色-02", difficulty: "easy", gridSize: 3, colorCount: 2, minSteps: [2, 2], buffer: 7 },
  { id: 3, name: "染色-03", difficulty: "easy", gridSize: 3, colorCount: 2, minSteps: [2, 3], buffer: 6 },
  { id: 4, name: "染色-04", difficulty: "easy", gridSize: 3, colorCount: 3, minSteps: [2, 3], buffer: 6 },
  { id: 5, name: "染色-05", difficulty: "easy", gridSize: 3, colorCount: 3, minSteps: [3, 3], buffer: 5 },
  { id: 6, name: "染色-06", difficulty: "easy", gridSize: 4, colorCount: 3, minSteps: [4, 5], buffer: 7 },
  { id: 7, name: "染色-07", difficulty: "easy", gridSize: 4, colorCount: 3, minSteps: [5, 5], buffer: 6 },
  { id: 8, name: "染色-08", difficulty: "medium", gridSize: 4, colorCount: 3, minSteps: [5, 6], buffer: 5 },
  { id: 9, name: "染色-09", difficulty: "medium", gridSize: 4, colorCount: 3, minSteps: [6, 6], buffer: 5 },
  { id: 10, name: "染色-10", difficulty: "medium", gridSize: 4, colorCount: 4, minSteps: [5, 5], buffer: 4 },
  { id: 11, name: "染色-11", difficulty: "medium", gridSize: 4, colorCount: 4, minSteps: [5, 6], buffer: 4 },
  { id: 12, name: "染色-12", difficulty: "medium", gridSize: 4, colorCount: 4, minSteps: [6, 6], buffer: 4 },
  { id: 13, name: "染色-13", difficulty: "medium", gridSize: 5, colorCount: 3, minSteps: [6, 7], buffer: 6 },
  { id: 14, name: "染色-14", difficulty: "medium", gridSize: 5, colorCount: 4, minSteps: [7, 8], buffer: 5 },
  { id: 15, name: "染色-15", difficulty: "medium", gridSize: 5, colorCount: 4, minSteps: [8, 8], buffer: 4 },
  { id: 16, name: "染色-16", difficulty: "hard", gridSize: 5, colorCount: 4, minSteps: [8, 9], buffer: 4 },
  { id: 17, name: "染色-17", difficulty: "hard", gridSize: 5, colorCount: 4, minSteps: [9, 9], buffer: 3 },
  { id: 18, name: "染色-18", difficulty: "hard", gridSize: 5, colorCount: 5, minSteps: [9, 10], buffer: 3 },
  { id: 19, name: "染色-19", difficulty: "hard", gridSize: 5, colorCount: 5, minSteps: [10, 10], buffer: 3 },
  { id: 20, name: "染色-20", difficulty: "hard", gridSize: 5, colorCount: 5, minSteps: [10, 11], buffer: 2 },
];

function createSeededRandom(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pickColorIds(kindCount, seed) {
  const rng = createSeededRandom(seed + 17);
  const pool = [...AVAILABLE_COLOR_IDS];
  shuffleInPlace(pool, rng);
  return pool.slice(0, kindCount).sort((a, b) => a - b);
}

function buildEvenColorCounts(colorIds, cellCount) {
  const counts = colorIds.map((colorId) => ({ colorId, count: 0 }));
  for (let i = 0; i < cellCount; i += 1) counts[i % counts.length].count += 1;
  return counts;
}

function buildBoard(seed, colorCounts) {
  const bag = [];
  for (const item of colorCounts) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }
  shuffleInPlace(bag, createSeededRandom(seed));
  return bag;
}

function isUnified(board) {
  let color = null;
  let count = 0;
  for (const value of board) {
    if (value < 0) continue;
    count += 1;
    if (color === null) color = value;
    else if (value !== color) return false;
  }
  return count >= 1;
}

function applyPop(board, size, row, col) {
  const idx = row * size + col;
  if (board[idx] < 0) return null;
  const next = board.slice();
  const color = next[idx];
  next[idx] = -1;
  for (const [dr, dc] of DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    const ni = nr * size + nc;
    if (next[ni] >= 0) next[ni] = color;
  }
  return next;
}

function dfsSolve(board, size, depth, limit, pathKeys) {
  if (isUnified(board)) return depth;
  if (depth >= limit) return -1;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row * size + col] < 0) continue;
      const next = applyPop(board, size, row, col);
      if (!next) continue;
      const key = next.join(",");
      if (pathKeys.has(key)) continue;
      pathKeys.add(key);
      const solved = dfsSolve(next, size, depth + 1, limit, pathKeys);
      pathKeys.delete(key);
      if (solved >= 0) return solved;
    }
  }

  return -1;
}

function solveMinSteps(board, size, maxDepth = 32) {
  if (isUnified(board)) return 0;

  if (size <= 4) {
    const visited = new Set([board.join(",")]);
    const queue = [{ board, steps: 0 }];
    let head = 0;
    while (head < queue.length) {
      const { board: current, steps } = queue[head];
      head += 1;
      if (steps >= maxDepth) continue;
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          if (current[row * size + col] < 0) continue;
          const next = applyPop(current, size, row, col);
          if (!next) continue;
          if (isUnified(next)) return steps + 1;
          const key = next.join(",");
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({ board: next, steps: steps + 1 });
        }
      }
    }
    return -1;
  }

  for (let limit = 1; limit <= maxDepth; limit += 1) {
    const pathKeys = new Set([board.join(",")]);
    const solved = dfsSolve(board, size, 0, limit, pathKeys);
    if (solved >= 0) return limit;
  }
  return -1;
}

function gridLayoutParams(gridSize) {
  if (gridSize <= 3) return { gridCellSize: 1.05, gridBubbleFill: 0.84 };
  if (gridSize === 4) return { gridCellSize: 0.95, gridBubbleFill: 0.82 };
  return { gridCellSize: 0.9, gridBubbleFill: 0.8 };
}

function homeBubbleColorId(difficulty, id) {
  if (difficulty === "hard") return 0;
  if (difficulty === "medium") return 4;
  const easyPalette = [1, 2, 3, 5, 6];
  return easyPalette[(Math.max(1, id) - 1) % easyPalette.length];
}

function distanceToRange(value, range) {
  if (value < range[0]) return range[0] - value;
  if (value > range[1]) return value - range[1];
  return 0;
}

function generateLevel(spec, baseSeed) {
  const { gridSize, colorCount, minSteps, buffer, id } = spec;
  const cellCount = gridSize * gridSize;
  const maxDepth = gridSize <= 3 ? 12 : gridSize === 4 ? 20 : 28;
  const maxAttempts = gridSize >= 5 ? 80000 : 40000;

  let bestFallback = null;
  let bestDistance = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = baseSeed + attempt * 97;
    const colorIds = pickColorIds(colorCount, seed);
    const colorCounts = buildEvenColorCounts(colorIds, cellCount);
    const board = buildBoard(seed, colorCounts);
    const solved = solveMinSteps(board, gridSize, maxDepth);
    if (solved < 0) continue;

    const dist = distanceToRange(solved, minSteps);
    if (dist === 0) {
      const layout = gridLayoutParams(gridSize);
      return {
        id,
        name: spec.name,
        difficulty: spec.difficulty,
        homeBubbleColorId: homeBubbleColorId(spec.difficulty, id),
        gridSize,
        ...layout,
        gridVerticalAlign: "center",
        gridVerticalOffset: 0.2,
        seed,
        fruitCount: cellCount,
        colorIds,
        colorCounts,
        minSteps: solved,
        stepLimit: solved + buffer,
      };
    }

    if (dist < bestDistance || (dist === bestDistance && solved > (bestFallback?.minSteps ?? 0))) {
      bestDistance = dist;
      bestFallback = { seed, colorIds, colorCounts, solved };
    }
  }

  if (!bestFallback) {
    throw new Error(`Failed to generate level ${id} after ${maxAttempts} attempts`);
  }

  const layout = gridLayoutParams(gridSize);
  return {
    id,
    name: spec.name,
    difficulty: spec.difficulty,
    homeBubbleColorId: homeBubbleColorId(spec.difficulty, id),
    gridSize,
    ...layout,
    gridVerticalAlign: "center",
    gridVerticalOffset: 0.2,
    seed: bestFallback.seed,
    fruitCount: cellCount,
    colorIds: bestFallback.colorIds,
    colorCounts: bestFallback.colorCounts,
    minSteps: bestFallback.solved,
    stepLimit: bestFallback.solved + buffer,
  };
}

function main() {
  const levels = [];
  const report = [];

  for (const spec of LEVEL_SPECS) {
    const baseSeed = 60000 + spec.id * 811;
    const level = generateLevel(spec, baseSeed);
    levels.push(level);
    report.push({
      id: level.id,
      grid: `${level.gridSize}x${level.gridSize}`,
      colors: level.colorIds.length,
      minSteps: level.minSteps,
      stepLimit: level.stepLimit,
      seed: level.seed,
      target: `${spec.minSteps[0]}-${spec.minSteps[1]}`,
    });
  }

  fs.writeFileSync(OUTPUT, `${JSON.stringify({ source: "scripts/generate-unify-levels.mjs", levels }, null, 2)}\n`, "utf8");

  console.log("Generated 20 solver-backed unify-color levels:\n");
  console.log("ID | Grid | Col | Target | Min | Limit | Seed");
  console.log("---|------|-----|--------|-----|-------|------");
  for (const row of report) {
    console.log(
      `${String(row.id).padStart(2)} | ${row.grid.padEnd(4)} | ${String(row.colors).padEnd(3)} | ${row.target.padEnd(6)} | ${String(row.minSteps).padEnd(3)} | ${String(row.stepLimit).padEnd(5)} | ${row.seed}`
    );
  }
}

main();