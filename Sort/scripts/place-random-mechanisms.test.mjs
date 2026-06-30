import assert from "node:assert/strict";
import {
  pickArrowCount,
  placeRandomMechanisms,
} from "../src/game/place-random-mechanisms.js";
import { MECHANISM_DIRECTIONS } from "../src/systems/mechanism-dye-logic.js";

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

function testPickArrowCountRange() {
  const rng = createSeededRandom(42);
  for (let i = 0; i < 200; i += 1) {
    const n = pickArrowCount(rng);
    assert.ok(n >= 1 && n <= 3, `expected 1–3, got ${n}`);
  }
}

function testPlaceRandomMechanisms() {
  const size = 4;
  const board = Array(size * size).fill(0).map((_, i) => (i % 2));
  const rng = createSeededRandom(99);

  for (const count of [1, 2, 3]) {
    const list = placeRandomMechanisms(board, size, count, rng);
    assert.ok(list, `expected placement for count ${count}`);
    assert.equal(list.length, count);
    const indices = new Set();
    for (const item of list) {
      assert.ok(MECHANISM_DIRECTIONS.includes(item.direction));
      assert.ok(item.index >= 0 && item.index < board.length);
      assert.equal(board[item.index], item.index % 2);
      assert.ok(!indices.has(item.index));
      indices.add(item.index);
    }
  }
}

function testPlacementStableSeed() {
  const board = [1, 2, 1, 2, 2, 1, 2, 1, 1];
  const a = placeRandomMechanisms(board, 3, 2, createSeededRandom(7));
  const b = placeRandomMechanisms(board, 3, 2, createSeededRandom(7));
  assert.deepEqual(a, b);
}

testPickArrowCountRange();
testPlaceRandomMechanisms();
testPlacementStableSeed();
console.log("place-random-mechanisms.test.mjs: ok");