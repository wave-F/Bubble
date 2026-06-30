import { generateUnifyLevel } from "../src/game/generate-unify-level.js";
import {
  referenceLevelStepProfiles,
  stepLimitForGeneratedLevel,
} from "../src/game/reference-step-margins.js";

console.log("Reference levels 1–5 (solver vs JSON stepLimit):\n");
for (const row of referenceLevelStepProfiles()) {
  console.log(
    `L${row.id}  ${row.gridSize}×${row.gridSize}  ${row.difficulty}  optimal=${row.optimal}  limit=${row.stepLimit}  margin=${row.margin}`,
  );
}

console.log("\nSample generated limits (20× 3×3 easy):\n");
const deltas = new Set();
for (let i = 0; i < 20; i += 1) {
  const r = await generateUnifyLevel({
    id: 1,
    gridSize: 3,
    difficulty: "easy",
    baseSeed: 1000 + i * 31,
  });
  if (!r) continue;
  const delta = r.level.stepLimit - r.optimalSteps;
  deltas.add(delta);
  console.log(`  optimal=${r.optimalSteps}  limit=${r.level.stepLimit}  delta=${delta}`);
}
console.log(`\nUnique deltas: ${[...deltas].sort().join(", ")} (expect 0 and/or 1)`);

const sample = stepLimitForGeneratedLevel({ gridSize: 4, difficulty: "medium", optimalSteps: 4 });
console.log(`\n4×4 medium opt=4 → stepLimit=${sample} (expect 4, like L4)`);