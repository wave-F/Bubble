import assert from "node:assert/strict";
import { applyPopToBoard } from "../src/systems/mechanism-dye-logic.js";
import {
  applyRandomInverseStep,
  applyRandomInverseStepPalette,
  boardUsesOnlyColors,
  buildBoardBackward,
  buildBoardBackwardPalette,
  enumeratePreimages,
  seedUnifiedGoal,
} from "../src/game/unify-inverse-pop.js";

const MECH = new Map();

function testRoundTripPreimages() {
  const size = 3;
  const goal = seedUnifiedGoal(size, 2, () => 0.5, 1);
  const board = buildBoardBackward(goal, size, 2, () => 0.25);
  assert.ok(board, "backward walk should succeed");

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const after = applyPopToBoard(board, size, MECH, row, col);
      if (!after) continue;
      const pre = enumeratePreimages(after, size, { maxBranches: 32 });
      for (const { before, row: pr, col: pc } of pre) {
        const again = applyPopToBoard(before, size, MECH, pr, pc);
        assert.deepEqual(again, after, "preimage must forward-match");
      }
    }
  }
}

function testRandomInverseStep() {
  const size = 3;
  const goal = seedUnifiedGoal(size, 3, () => 0.3, 2);
  const before = applyRandomInverseStep(goal, size, () => 0.7);
  assert.ok(before, "expected at least one preimage for goal with holes");
  const pre = enumeratePreimages(goal, size, { maxBranches: 64 });
  assert.ok(pre.length > 0);
}

testRoundTripPreimages();
testRandomInverseStep();

function testMechanismPopShootsAlongArrow() {
  const size = 4;
  const board = [1, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 1, 3, 3, 3];
  const mechanisms = new Map([[5, "right"]]);
  const after = applyPopToBoard(board, size, mechanisms, 1, 1);
  assert.ok(after, "mechanism pop should succeed");
  assert.equal(after[5], -1, "popped cell empty");
  assert.equal(after[6], 3, "first cell along ray keeps pop color");
  assert.equal(after[7], 3, "ray reaches end of row");
  assert.equal(after[1], 3, "orthogonal neighbor above also dyed");
}

testMechanismPopShootsAlongArrow();

function testPaletteBackward5x5() {
  const size = 5;
  const palette = [1, 3];
  const rng = createSeededRandom(77);
  let board = Array(size * size).fill(1);
  board = applyPopToBoard(board, size, MECH, 2, 2);
  assert.ok(board, "forward pop on unified 5x5");

  assert.ok(
    applyRandomInverseStepPalette(board, size, palette, rng),
    "single palette inverse step should succeed",
  );

  const backward = buildBoardBackwardPalette(board, size, 1, palette, rng);
  assert.ok(backward, "one-step palette backward walk should succeed");
  assert.ok(boardUsesOnlyColors(backward, palette), "only palette colours");
}

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

testPaletteBackward5x5();
console.log("unify-inverse-pop.test.mjs: PASS");