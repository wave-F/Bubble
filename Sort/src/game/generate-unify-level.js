import {
  LARGE_GRID_TIME_BUDGET_MS,
  isBoardUnified,
  solveLevel,
  solveLevelAsync,
} from "../level-editor-solver.js";
import { applyPopToBoard } from "../systems/mechanism-dye-logic.js";
import {
  applyRandomInverseStepPalette,
  boardColorCounts,
  boardUsesOnlyColors,
} from "./unify-inverse-pop.js";
import { stepLimitForGeneratedLevel } from "./reference-step-margins.js";

const COLOR_POOL = [0, 1, 2, 3, 4, 5, 6, 7];
const EMPTY_MECHANISMS = new Map();

const MAX_OPTIMAL_BY_SIZE = {
  3: { easy: 4, medium: 6, hard: 8 },
  4: { easy: 5, medium: 7, hard: 9 },
  5: { easy: 8, medium: 8, hard: 8 },
};

/** Generated 5×5 levels never exceed this move cap (stepLimit). */
const MAX_STEP_LIMIT_5 = 8;

/** Minimum certified optimal steps for 5×5 by editor difficulty. */
const MIN_OPTIMAL_5_BY_DIFFICULTY = {
  easy: 3,
  medium: 5,
  hard: 6,
};

const MAX_ATTEMPTS_BY_SIZE = { 3: 8000, 4: 20000 };

const GENERATION_BUDGET_MS = { 3: 3000, 4: 6000, 5: 15000 };

const MAX_OUTER_ATTEMPTS_5 = 120;

const YIELD_EVERY = 64;

const FORWARD_POPS_BY_DIFFICULTY = {
  easy: [2, 4],
  medium: [5, 7],
  hard: [6, 8],
};

const BACKWARD_STEPS_BY_DIFFICULTY = {
  easy: [4, 7],
  medium: [6, 10],
  hard: [7, 10],
};

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

function gridLayoutParams(size) {
  if (size <= 3) return { gridCellSize: 1.05, gridBubbleFill: 0.84 };
  if (size === 4) return { gridCellSize: 0.95, gridBubbleFill: 0.82 };
  return { gridCellSize: 0.9, gridBubbleFill: 0.8 };
}

function colorCountForGrid(gridSize, difficulty) {
  if (gridSize <= 3) return 2;
  if (gridSize === 4) return 3;
  return difficulty === "hard" ? 4 : 3;
}

function pickColorIds(kindCount, seed) {
  const rng = createSeededRandom(seed + 17);
  const pool = [...COLOR_POOL];
  shuffleInPlace(pool, rng);
  return pool.slice(0, kindCount).sort((a, b) => a - b);
}

function pickColorCount5x5(rng, difficulty) {
  if (difficulty === "hard") return rng() < 0.85 ? 3 : 2;
  if (difficulty === "medium") return rng() < 0.7 ? 3 : 2;
  return rng() < 0.5 ? 2 : 3;
}

function buildEvenColorCounts(colorIds, cellCount) {
  const counts = colorIds.map((colorId) => ({ colorId, count: 0 }));
  for (let i = 0; i < cellCount; i += 1) {
    counts[i % counts.length].count += 1;
  }
  return counts;
}

function buildCellsFromCounts(colorCounts, seed) {
  const bag = [];
  for (const item of colorCounts) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }
  shuffleInPlace(bag, createSeededRandom(seed));
  return bag;
}

function normalizeDifficulty(value) {
  const d = String(value ?? "easy").toLowerCase();
  return d === "medium" || d === "hard" ? d : "easy";
}

function randomIntInRange(rng, range) {
  const lo = Math.min(range[0], range[1]);
  const hi = Math.max(range[0], range[1]);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function applyForwardMess(board, size, popCount, rng) {
  let current = board.slice();

  for (let i = 0; i < popCount; i += 1) {
    const active = [];
    for (let idx = 0; idx < current.length; idx += 1) {
      if (current[idx] >= 0) active.push(idx);
    }
    if (!active.length) return null;

    const pick = active[Math.floor(rng() * active.length)];
    const row = Math.floor(pick / size);
    const col = pick % size;
    const next = applyPopToBoard(current, size, EMPTY_MECHANISMS, row, col);
    if (!next) return null;
    current = next;
  }

  return current;
}

function boardHasAtLeastTwoColors(board) {
  const set = new Set();
  for (const value of board) {
    if (value >= 0) set.add(value);
    if (set.size >= 2) return true;
  }
  return false;
}

function buildLevelFromCandidate({
  levelId,
  namePrefix,
  difficulty,
  gridSize,
  layout,
  cellCount,
  colorIds,
  cells,
  seed,
  steps,
}) {
  return {
    id: levelId,
    name: `${namePrefix}-${String(levelId).padStart(2, "0")}`,
    difficulty,
    homeBubbleColorId: colorIds[0] ?? 1,
    gridSize,
    ...layout,
    gridVerticalAlign: "center",
    gridVerticalOffset: 0.2,
    seed,
    fruitCount: cellCount,
    colorIds,
    colorCounts: boardColorCounts(cells).map(({ colorId, count }) => ({ colorId, count })),
    cells,
    mechanisms: [],
    stepLimit: gridSize === 5
      ? Math.min(
        MAX_STEP_LIMIT_5,
        stepLimitForGeneratedLevel({
          gridSize,
          difficulty,
          optimalSteps: steps,
        }),
      )
      : stepLimitForGeneratedLevel({
        gridSize,
        difficulty,
        optimalSteps: steps,
      }),
    winMode: "unify",
  };
}

async function certifyLevel(probe, solveMaxDepth, gridSize) {
  if (gridSize >= 5 && typeof Worker !== "undefined") {
    return solveLevelAsync(probe, {
      maxDepth: solveMaxDepth,
      timeBudgetMs: LARGE_GRID_TIME_BUDGET_MS,
    });
  }
  const deadline = gridSize >= 5
    ? Date.now() + LARGE_GRID_TIME_BUDGET_MS
    : Infinity;
  return solveLevel(probe, solveMaxDepth, { deadline });
}

async function generateUnifyLevel5x5({
  levelId,
  namePrefix,
  difficulty,
  layout,
  maxOptimal,
  minOptimal,
  generationDeadline,
  baseSeed,
  onProgress,
}) {
  const gridSize = 5;
  const cellCount = gridSize * gridSize;
  const solveMaxDepth = 32;
  let best = null;

  for (let attempt = 0; attempt < MAX_OUTER_ATTEMPTS_5; attempt += 1) {
    if (Date.now() > generationDeadline) break;
    await Promise.resolve();

    const seed = Math.floor(baseSeed) + attempt * 97;
    const rng = createSeededRandom(seed);
    const colorCount = pickColorCount5x5(rng, difficulty);
    const colorIds = pickColorIds(colorCount, seed);

    onProgress?.({ phase: "layout", colorCount });

    const colorCounts = buildEvenColorCounts(colorIds, cellCount);
    let board = buildCellsFromCounts(colorCounts, seed);

    const forwardPops = randomIntInRange(rng, FORWARD_POPS_BY_DIFFICULTY[difficulty]);
    board = applyForwardMess(board, gridSize, forwardPops, rng);
    if (!board) continue;
    if (isBoardUnified(board)) continue;
    if (!boardUsesOnlyColors(board, colorIds)) continue;

    const backwardSteps = randomIntInRange(rng, BACKWARD_STEPS_BY_DIFFICULTY[difficulty]);
    for (let step = 0; step < backwardSteps; step += 1) {
      onProgress?.({ phase: "backward", current: step + 1, total: backwardSteps });
      await Promise.resolve();

      const next = applyRandomInverseStepPalette(board, gridSize, colorIds, rng);
      if (!next) {
        board = null;
        break;
      }
      board = next;
    }
    if (!board) continue;

    if (!boardUsesOnlyColors(board, colorIds)) continue;
    if (!boardHasAtLeastTwoColors(board)) continue;
    if (isBoardUnified(board)) continue;

    onProgress?.({ phase: "certify" });

    const probe = {
      gridSize,
      cells: board,
      mechanisms: [],
      ...layout,
    };

    const result = await certifyLevel(probe, solveMaxDepth, gridSize);
    if (result.timedOut || result.steps < minOptimal) continue;
    if (result.steps > maxOptimal) continue;

    const candidate = {
      optimalSteps: result.steps,
      level: buildLevelFromCandidate({
        levelId,
        namePrefix,
        difficulty,
        gridSize,
        layout,
        cellCount,
        colorIds,
        cells: board,
        seed,
        steps: result.steps,
      }),
    };

    if (!best || candidate.optimalSteps > best.optimalSteps) {
      best = candidate;
      onProgress?.({ phase: "candidate", optimal: candidate.optimalSteps, min: minOptimal });
    }
  }

  return best;
}

/**
 * Propose a unify-win level with stepLimit = optimal + margin (no mechanisms).
 * @returns {Promise<{ level: object, optimalSteps: number } | null>}
 */
export async function generateUnifyLevel({
  id,
  gridSize: rawGridSize,
  difficulty: rawDifficulty,
  baseSeed = Date.now(),
  namePrefix = "染色",
  onProgress,
}) {
  const gridSize = Math.max(3, Math.min(5, Math.floor(rawGridSize ?? 3)));
  const difficulty = normalizeDifficulty(rawDifficulty);
  const cellCount = gridSize * gridSize;
  const maxOptimal = MAX_OPTIMAL_BY_SIZE[gridSize]?.[difficulty] ?? 8;
  let generationBudgetMs = GENERATION_BUDGET_MS[gridSize] ?? 6000;
  if (gridSize === 5 && difficulty === "hard") {
    generationBudgetMs *= 2;
  }
  const generationDeadline = Date.now() + generationBudgetMs;
  const layout = gridLayoutParams(gridSize);
  const solveMaxDepth = gridSize <= 3 ? 16 : gridSize === 4 ? 24 : 32;
  const levelId = Math.max(1, Math.floor(id ?? 1));

  if (gridSize === 5) {
    const minOptimal = MIN_OPTIMAL_5_BY_DIFFICULTY[difficulty] ?? 3;
    return generateUnifyLevel5x5({
      levelId,
      namePrefix,
      difficulty,
      layout,
      maxOptimal,
      minOptimal,
      generationDeadline,
      baseSeed,
      onProgress,
    });
  }

  const colorCount = colorCountForGrid(gridSize, difficulty);
  const maxAttempts = MAX_ATTEMPTS_BY_SIZE[gridSize] ?? 8000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (Date.now() > generationDeadline) break;

    if (attempt > 0 && attempt % YIELD_EVERY === 0) {
      await Promise.resolve();
    }

    const seed = Math.floor(baseSeed) + attempt * 97;
    const colorIds = pickColorIds(colorCount, seed);
    const colorCounts = buildEvenColorCounts(colorIds, cellCount);
    const cells = buildCellsFromCounts(colorCounts, seed);

    const probe = {
      gridSize,
      cells,
      mechanisms: [],
      ...layout,
    };

    const result = await certifyLevel(probe, solveMaxDepth, gridSize);
    if (result.timedOut || result.steps < 1) continue;

    const steps = result.steps;
    if (steps > maxOptimal) continue;

    return {
      optimalSteps: steps,
      level: buildLevelFromCandidate({
        levelId,
        namePrefix,
        difficulty,
        gridSize,
        layout,
        cellCount,
        colorIds,
        cells,
        seed,
        steps,
      }),
    };
  }

  return null;
}