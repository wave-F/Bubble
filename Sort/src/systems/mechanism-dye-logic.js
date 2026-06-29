export const NEIGHBOR_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const MECHANISM_DIRECTIONS = ["up", "down", "left", "right"];

export const DIRECTION_DELTA = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export const DIRECTION_ARROW = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export function normalizeDirection(value) {
  const dir = String(value ?? "").toLowerCase();
  return MECHANISM_DIRECTIONS.includes(dir) ? dir : null;
}

export function mechanismsFromLevel(level, size) {
  const map = new Map();
  const list = Array.isArray(level?.mechanisms) ? level.mechanisms : [];
  const cellCount = size * size;

  for (const item of list) {
    if (!item) continue;
    const index = Math.floor(item.index ?? item.cell ?? -1);
    const direction = normalizeDirection(item.direction);
    if (index < 0 || index >= cellCount || !direction) continue;
    map.set(index, direction);
  }

  return map;
}

export function mechanismsToLevelList(map) {
  const list = [];
  for (const [index, direction] of map.entries()) {
    list.push({ index, direction });
  }
  list.sort((a, b) => a.index - b.index);
  return list;
}

export function formatMechanismsKey(level) {
  const size = Math.max(3, Math.floor(level?.gridSize ?? 3));
  const map = mechanismsFromLevel(level, size);
  if (!map.size) return "";
  return mechanismsToLevelList(map).map((item) => `${item.index}:${item.direction}`).join(";");
}

function spreadMechanismRay(board, size, mechanisms, visited, row, col, color, queue) {
  const idx = row * size + col;
  if (visited.has(idx)) return;
  visited.add(idx);

  const direction = mechanisms.get(idx);
  if (!direction) return;

  const [dr, dc] = DIRECTION_DELTA[direction];
  let nr = row + dr;
  let nc = col + dc;

  while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
    const ni = nr * size + nc;
    if (board[ni] >= 0) {
      const oldColor = board[ni];
      if (oldColor !== color) {
        board[ni] = color;
        if (mechanisms.has(ni)) {
          queue.push({ row: nr, col: nc, idx: ni });
        }
      }
    }
    nr += dr;
    nc += dc;
  }
}

export function applyPopToBoard(board, size, mechanisms, row, col) {
  const idx = row * size + col;
  if (board[idx] < 0) return null;

  const next = board.slice();
  const color = next[idx];
  next[idx] = -1;

  const queue = [];
  for (const [dr, dc] of NEIGHBOR_DIRS) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

    const ni = nr * size + nc;
    if (next[ni] < 0) continue;

    const oldColor = next[ni];
    if (oldColor === color) continue;
    next[ni] = color;
    if (mechanisms.has(ni)) {
      queue.push({ row: nr, col: nc, idx: ni });
    }
  }

  const visited = new Set();
  while (queue.length) {
    const cell = queue.shift();
    spreadMechanismRay(next, size, mechanisms, visited, cell.row, cell.col, color, queue);
  }

  return next;
}