import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const levelsPath = path.join(__dirname, "../src/config/levels.json");
const config = JSON.parse(fs.readFileSync(levelsPath, "utf8"));
const level1 = config.levels[0];

const expectedCells = level1.gridSize * level1.gridSize;
const colorTotal = level1.colorCounts.reduce((sum, item) => sum + item.count, 0);
const ok = level1.gridSize === 3
  && level1.fruitCount === expectedCells
  && colorTotal === expectedCells
  && level1.stepLimit > 0;

console.log("Level 1 unify-color config:");
console.log(`  gridSize: ${level1.gridSize}`);
console.log(`  fruitCount: ${level1.fruitCount}`);
console.log(`  colorKinds: ${level1.colorIds.length}`);
console.log(`  stepLimit: ${level1.stepLimit}`);
console.log(`\nResult: ${ok ? "PASS" : "FAIL"}`);
process.exit(ok ? 0 : 1);