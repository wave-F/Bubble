import {
  NEIGHBOR_DIRS,
  applyPopToBoard,
} from "../systems/mechanism-dye-logic.js";

const EMPTY = -1;
const EMPTY_MECHANISMS = new Map();

function neighborIndices(size, row, col) {
  const list = [];
  for (const [dr, dc] of NEIGHBOR_DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    list.push(nr * size + nc);
  }
  return list;
}

function holeIndices(board) {
  const holes = [];
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === EMPTY) holes.push(i);
  }
  return holes;
}

function activeColorIds(board) {
  const set = new Set();
  for (const value of board) {
    if (value >= 0) set.add(value);
  }
  return [...set];
}

function forwardMatches(before, after, size, row, col) {
  const next = applyPopToBoard(before, size, EMPTY_MECHANISMS, row, col);
  if (!next) return false;
  for (let i = 0; i < after.length; i += 1) {
    if (next[i] !== after[i]) return false;
  }
  return true;
}

function alternateColors(after, popColor, maxAlts = 3) {
  const alts = [];
  for (const c of activeColorIds(after)) {
    if (c !== popColor) alts.push(c);
  }
  for (let c = 0; c <= 7 && alts.length < maxAlts; c += 1) {
    if (c !== popColor && !alts.includes(c)) alts.push(c);
  }
  return alts;
}

function neighborBranchColors(after, neighbors, popColor, maxBranches = 48) {
  const branches = [[]];
  for (const ni of neighbors) {
    if (after[ni] === EMPTY) {
      for (const branch of branches) branch.push(EMPTY);
      continue;
    }
    if (after[ni] !== popColor) return [];

    const options = [popColor, ...alternateColors(after, popColor, 2)];

    const nextBranches = [];
    for (const branch of branches) {
      for (const choice of options) {
        nextBranches.push([...branch, choice]);
        if (nextBranches.length >= maxBranches) break;
      }
      if (nextBranches.length >= maxBranches) break;
    }
    branches.length = 0;
    branches.push(...nextBranches);
    if (!branches.length) return [];
  }
  return branches;
}

function pickRandomPreimage(after, size, rng) {
  const holes = holeIndices(after);
  if (!holes.length) return null;

  for (let trial = 0; trial < 32; trial += 1) {
    const holeIdx = holes[Math.floor(rng() * holes.length)];
    const row = Math.floor(holeIdx / size);
    const col = holeIdx % size;
    const neighbors = neighborIndices(size, row, col);
    const active = activeColorIds(after);
    const popColor = active.length
      ? active[Math.floor(rng() * active.length)]
      : Math.floor(rng() * 8);

    let valid = true;
    for (const ni of neighbors) {
      if (after[ni] >= 0 && after[ni] !== popColor) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    const before = after.slice();
    before[holeIdx] = popColor;
    const alts = alternateColors(after, popColor, 4);

    for (const ni of neighbors) {
      if (after[ni] === EMPTY) {
        before[ni] = EMPTY;
        continue;
      }
      if (after[ni] !== popColor) return null;
      if (rng() < 0.45 || !alts.length) {
        before[ni] = popColor;
      } else {
        before[ni] = alts[Math.floor(rng() * alts.length)];
      }
    }

    if (forwardMatches(before, after, size, row, col)) {
      return before;
    }
  }

  return null;
}

/**
 * All boards `before` such that popping (row,col) reproduces `after` (no mechanisms).
 */
export function enumeratePreimages(after, size, options = {}) {
  const maxBranches = Math.max(1, Math.floor(options.maxBranches ?? 64));
  const results = [];
  const cellCount = size * size;

  if (after.length !== cellCount) return results;

  for (const holeIdx of holeIndices(after)) {
    const row = Math.floor(holeIdx / size);
    const col = holeIdx % size;
    const neighbors = neighborIndices(size, row, col);

    const popColorCandidates = new Set(activeColorIds(after));
    for (let c = 0; c <= 7; c += 1) popColorCandidates.add(c);

    for (const popColor of popColorCandidates) {
      let valid = true;
      for (const ni of neighbors) {
        if (after[ni] >= 0 && after[ni] !== popColor) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      const neighborChoices = neighborBranchColors(after, neighbors, popColor);
      for (const choices of neighborChoices) {
        const before = after.slice();
        before[holeIdx] = popColor;
        for (let k = 0; k < neighbors.length; k += 1) {
          before[neighbors[k]] = choices[k];
        }

        if (!forwardMatches(before, after, size, row, col)) continue;
        results.push({ before, row, col, popColor });
        if (results.length >= maxBranches) return results;
      }
    }
  }

  return results;
}

export function applyRandomInverseStep(board, size, rng = Math.random) {
  const fast = pickRandomPreimage(board, size, rng);
  if (fast) return fast;

  const preimages = enumeratePreimages(board, size, { maxBranches: 32 });
  if (!preimages.length) return null;
  const pick = preimages[Math.floor(rng() * preimages.length)];
  return pick.before;
}

export function seedUnifiedGoal(size, depth, rng = Math.random, unifyColor = 1) {
  let board = Array(size * size).fill(unifyColor);
  const maxDepth = Math.max(0, Math.floor(depth));

  for (let step = 0; step < maxDepth; step += 1) {
    const active = [];
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] >= 0) active.push(i);
    }
    if (!active.length) break;

    const pickIdx = active[Math.floor(rng() * active.length)];
    const row = Math.floor(pickIdx / size);
    const col = pickIdx % size;
    const next = applyPopToBoard(board, size, EMPTY_MECHANISMS, row, col);
    if (!next) break;
    board = next;
  }

  return board;
}

export function buildBoardBackward(goalBoard, size, backwardSteps, rng = Math.random) {
  let board = goalBoard.slice();
  const steps = Math.max(0, Math.floor(backwardSteps));

  for (let i = 0; i < steps; i += 1) {
    const next = applyRandomInverseStep(board, size, rng);
    if (!next) return null;
    board = next;
  }

  return board;
}

export function boardColorCounts(board) {
  const merged = new Map();
  for (const value of board) {
    if (value < 0) continue;
    merged.set(value, (merged.get(value) ?? 0) + 1);
  }
  return [...merged.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([colorId, count]) => ({ colorId, count }));
}

export function boardHasEmpty(board) {
  return board.some((value) => value === EMPTY);
}