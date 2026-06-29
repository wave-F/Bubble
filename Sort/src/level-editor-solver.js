import {
  applyPopToBoard,
  formatMechanismsKey,
  mechanismsFromLevel,
} from "./systems/mechanism-dye-logic.js";

export const DEFAULT_MAX_DEPTH = 40;
export const LARGE_GRID_TIME_BUDGET_MS = 2500;
const TIMEOUT_CHECK_INTERVAL = 2048;

let solverWorker = null;
let solverJobSeq = 0;

export function boardFromLevel(level) {
  const size = Math.max(3, Math.floor(level.gridSize ?? 3));
  const cells = Array.isArray(level.cells) ? level.cells.map((v) => Math.floor(Number(v))) : [];
  const board = cells.slice(0, size * size);
  while (board.length < size * size) board.push(0);
  board.length = size * size;
  return { size, board };
}

export function isBoardUnified(board) {
  let targetColor = null;
  let activeCount = 0;

  for (const colorId of board) {
    if (colorId < 0) continue;
    activeCount += 1;
    if (targetColor === null) targetColor = colorId;
    else if (colorId !== targetColor) return false;
  }

  return activeCount >= 1;
}

export function applyPop(board, size, row, col, mechanisms = new Map()) {
  return applyPopToBoard(board, size, mechanisms, row, col);
}

function createDeadlineTracker(deadline) {
  let checks = 0;
  return {
    isExpired() {
      if (!Number.isFinite(deadline)) return false;
      checks += 1;
      if (checks % TIMEOUT_CHECK_INTERVAL !== 0) return false;
      return Date.now() > deadline;
    },
    isExpiredNow() {
      return Number.isFinite(deadline) && Date.now() > deadline;
    },
  };
}

function solveMinStepsBfs(board, size, maxDepth, deadline = Infinity, mechanisms = new Map()) {
  const timeout = createDeadlineTracker(deadline);
  const visited = new Set([board.join(",")]);
  const queue = [{ board, steps: 0 }];
  let head = 0;

  while (head < queue.length) {
    if (timeout.isExpired()) return -2;

    const { board: current, steps } = queue[head];
    head += 1;
    if (steps >= maxDepth) continue;

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (current[row * size + col] < 0) continue;
        const next = applyPop(current, size, row, col, mechanisms);
        if (!next) continue;
        if (isBoardUnified(next)) return steps + 1;

        const key = next.join(",");
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({ board: next, steps: steps + 1 });
      }
    }
  }

  return -1;
}

function dfsMinSteps(board, size, depth, limit, pathKeys, timeout, mechanisms = new Map()) {
  if (timeout.isExpired()) return -2;
  if (isBoardUnified(board)) return depth;
  if (depth >= limit) return -1;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row * size + col] < 0) continue;
      const next = applyPop(board, size, row, col, mechanisms);
      if (!next) continue;

      const key = next.join(",");
      if (pathKeys.has(key)) continue;
      pathKeys.add(key);

      const solved = dfsMinSteps(next, size, depth + 1, limit, pathKeys, timeout, mechanisms);
      pathKeys.delete(key);
      if (solved === -2) return -2;
      if (solved >= 0) return solved;
    }
  }

  return -1;
}

function solveMinStepsIddfs(board, size, maxDepth, deadline, mechanisms = new Map()) {
  const timeout = createDeadlineTracker(deadline);
  for (let limit = 1; limit <= maxDepth; limit += 1) {
    if (timeout.isExpiredNow()) return -2;
    const pathKeys = new Set([board.join(",")]);
    const solved = dfsMinSteps(board, size, 0, limit, pathKeys, timeout, mechanisms);
    if (solved === -2) return -2;
    if (solved >= 0) return solved;
  }
  return -1;
}

function dfsSolvePath(board, size, depth, limit, pathKeys, moves, timeout, mechanisms = new Map()) {
  if (timeout.isExpired()) return null;
  if (isBoardUnified(board)) {
    return { steps: depth, moves: [...moves] };
  }
  if (depth >= limit) return null;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row * size + col] < 0) continue;
      const next = applyPop(board, size, row, col, mechanisms);
      if (!next) continue;

      const key = next.join(",");
      if (pathKeys.has(key)) continue;
      pathKeys.add(key);

      const result = dfsSolvePath(
        next,
        size,
        depth + 1,
        limit,
        pathKeys,
        [...moves, { row, col }],
        timeout,
        mechanisms,
      );
      pathKeys.delete(key);
      if (result) return result;
    }
  }

  return null;
}

export function solveOptimal(board, size, maxDepth = DEFAULT_MAX_DEPTH, options = {}) {
  if (isBoardUnified(board)) {
    return { steps: 0, moves: [], timedOut: false };
  }

  const mechanisms = options.mechanisms ?? new Map();
  const deadline = options.deadline ?? (
    size > 4 ? Date.now() + LARGE_GRID_TIME_BUDGET_MS : Infinity
  );
  const timeout = createDeadlineTracker(deadline);

  const minSteps = size <= 4
    ? solveMinStepsBfs(board, size, maxDepth, deadline, mechanisms)
    : solveMinStepsIddfs(board, size, maxDepth, deadline, mechanisms);

  if (minSteps === -2) {
    return { steps: -1, moves: [], timedOut: true };
  }
  if (minSteps < 0) {
    return { steps: -1, moves: [], timedOut: false };
  }

  const pathKeys = new Set([board.join(",")]);
  const pathResult = dfsSolvePath(board, size, 0, minSteps, pathKeys, [], timeout, mechanisms);
  if (pathResult) {
    return { ...pathResult, timedOut: false };
  }
  if (timeout.isExpiredNow()) {
    return { steps: minSteps, moves: [], timedOut: true };
  }

  return { steps: minSteps, moves: [], timedOut: false };
}

export function solveLevel(level, maxDepth = DEFAULT_MAX_DEPTH, options = {}) {
  const { size, board } = boardFromLevel(level);
  const mechanisms = mechanismsFromLevel(level, size);
  return solveOptimal(board, size, maxDepth, { ...options, mechanisms });
}

function getSolverWorker() {
  if (!solverWorker) {
    solverWorker = new Worker(new URL("./level-editor-solver.worker.js", import.meta.url), {
      type: "module",
    });
  }
  return solverWorker;
}

export function cancelSolverJobs() {
  solverJobSeq += 1;
}

export function solveLevelAsync(
  level,
  {
    maxDepth = DEFAULT_MAX_DEPTH,
    timeBudgetMs = Math.max(3, Math.floor(level?.gridSize ?? 3)) > 4
      ? LARGE_GRID_TIME_BUDGET_MS
      : 0,
  } = {},
) {
  const jobId = ++solverJobSeq;
  const worker = getSolverWorker();

  return new Promise((resolve) => {
    const onMessage = (event) => {
      if (event.data?.jobId !== jobId) return;
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve(event.data?.result ?? { steps: -1, moves: [], timedOut: true });
    };

    const onError = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve({ steps: -1, moves: [], timedOut: true });
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ jobId, level, maxDepth, timeBudgetMs });
  });
}

export function levelBoardKey(level) {
  const { size, board } = boardFromLevel(level);
  const mechKey = formatMechanismsKey(level);
  return `${size}|${board.join(",")}|${mechKey}`;
}