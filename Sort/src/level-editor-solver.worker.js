import { solveLevel } from "./level-editor-solver.js";

self.onmessage = (event) => {
  const { jobId, level, maxDepth, timeBudgetMs } = event.data ?? {};
  try {
    const size = Math.max(3, Math.floor(level?.gridSize ?? 3));
    const deadline = size > 4 && timeBudgetMs > 0
      ? Date.now() + timeBudgetMs
      : Infinity;
    const result = solveLevel(level, maxDepth, { deadline });
    self.postMessage({ jobId, result });
  } catch (err) {
    self.postMessage({
      jobId,
      result: { steps: -1, moves: [], timedOut: false, error: err?.message ?? "solve failed" },
    });
  }
};