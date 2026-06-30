import {
  MECHANISM_DIRECTIONS,
  mechanismsToLevelList,
} from "../systems/mechanism-dye-logic.js";

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** @returns {number} Integer in [1, 3]. */
export function pickArrowCount(rng) {
  return 1 + Math.floor(rng() * 3);
}

/**
 * Place arrow mechanisms on distinct active cells.
 * @returns {Array<{ index: number, direction: string }> | null}
 */
export function placeRandomMechanisms(board, size, arrowCount, rng) {
  const count = Math.max(1, Math.floor(arrowCount));
  const active = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] >= 0) active.push(i);
  }
  if (active.length < count) return null;

  shuffleInPlace(active, rng);
  const map = new Map();
  for (let n = 0; n < count; n += 1) {
    const index = active[n];
    const direction = MECHANISM_DIRECTIONS[Math.floor(rng() * MECHANISM_DIRECTIONS.length)];
    map.set(index, direction);
  }
  return mechanismsToLevelList(map);
}