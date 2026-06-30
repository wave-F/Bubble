import levelsConfig from "../config/levels.json" with { type: "json" };
import { solveLevel } from "../level-editor-solver.js";

const REFERENCE_LEVEL_IDS = [1, 2, 3, 4, 5];

function normalizeDifficulty(value) {
  const d = String(value ?? "easy").toLowerCase();
  return d === "medium" || d === "hard" ? d : "easy";
}

/**
 * Move slack for generated levels, calibrated to shipped levels 1–5:
 * L1 (3×3 easy, opt 2) → +1; L2–L5 → stepLimit equals optimal (+0).
 */
export function marginForGeneratedLevel({
  gridSize,
  difficulty,
  optimalSteps,
}) {
  const optimal = Math.max(1, Math.floor(optimalSteps));
  const size = Math.max(3, Math.min(5, Math.floor(gridSize ?? 3)));
  const diff = normalizeDifficulty(difficulty);

  if (size === 3 && diff === "easy" && optimal <= 2) {
    return 1;
  }

  return 0;
}

export function stepLimitForGeneratedLevel({
  gridSize,
  difficulty,
  optimalSteps,
}) {
  const optimal = Math.max(1, Math.floor(optimalSteps));
  const margin = marginForGeneratedLevel({ gridSize, difficulty, optimalSteps: optimal });
  return optimal + margin;
}

/** @returns {Array<{ id, gridSize, difficulty, optimal, stepLimit, margin }>} */
export function referenceLevelStepProfiles() {
  const levels = Array.isArray(levelsConfig?.levels) ? levelsConfig.levels : [];
  const profiles = [];

  for (const level of levels) {
    const id = Math.floor(level?.id);
    if (!REFERENCE_LEVEL_IDS.includes(id)) continue;

    const result = solveLevel(level, 40);
    const optimal = result.timedOut || result.steps < 0 ? null : result.steps;
    const stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 1));
    profiles.push({
      id,
      gridSize: level.gridSize,
      difficulty: level.difficulty,
      optimal,
      stepLimit,
      margin: optimal == null ? null : stepLimit - optimal,
    });
  }

  return profiles.sort((a, b) => a.id - b.id);
}