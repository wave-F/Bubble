import * as THREE from "three/webgpu";
import {
  mechanismsFromLevel,
  mechanismsToLevelList,
} from "../systems/mechanism-dye-logic.js";

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
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

export function createLevelRuntime({
  levels,
  colors,
  bounds,
} = {}) {
  const cache = new Map();

  function normalizeColorCounts(colorCounts) {
    if (!Array.isArray(colorCounts) || colorCounts.length === 0) return [];

    const merged = new Map();
    for (const item of colorCounts) {
      if (!item) continue;
      const colorId = Math.floor(item.colorId);
      const count = Math.floor(item.count);
      if (colorId < 0 || colorId >= colors.length || count <= 0) continue;
      merged.set(colorId, (merged.get(colorId) ?? 0) + count);
    }

    const result = [];
    for (const [colorId, count] of merged.entries()) {
      result.push({ colorId, count });
    }
    result.sort((a, b) => a.colorId - b.colorId);
    return result;
  }

  function sumColorCounts(colorCounts) {
    let total = 0;
    for (const item of colorCounts) total += item.count;
    return total;
  }

  function buildEvenColorCounts(colorIds, cellCount) {
    const ids = Array.isArray(colorIds) && colorIds.length ? colorIds : colors.map((_c, idx) => idx);
    const counts = ids.map((colorId) => ({ colorId, count: 0 }));
    for (let i = 0; i < cellCount; i += 1) {
      counts[i % counts.length].count += 1;
    }
    return counts;
  }

  function buildColorBag(colorCounts, cellCount) {
    const normalized = normalizeColorCounts(colorCounts);
    const bag = [];

    for (const item of normalized) {
      for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
    }

    if (bag.length === 0) {
      for (let i = 0; i < cellCount; i += 1) bag.push(i % colors.length);
      return bag;
    }

    if (bag.length > cellCount) return bag.slice(0, cellCount);
    if (bag.length < cellCount) {
      const fallbackColor = bag[bag.length - 1] ?? 0;
      while (bag.length < cellCount) bag.push(fallbackColor);
    }
    return bag;
  }

  function computeGridLayout({
    gridSize,
    cellSize,
    verticalAlign = "center",
    verticalOffset = 0.2,
  }) {
    const gridWidth = cellSize * gridSize;
    const gridHeight = cellSize * gridSize;
    const centerX = (bounds.left + bounds.right) * 0.5;
    const playMidY = (bounds.top + bounds.bottom) * 0.5;

    let centerY = playMidY + verticalOffset;
    if (verticalAlign === "top") {
      centerY = bounds.top - gridHeight * 0.5 - 0.45;
    } else if (verticalAlign === "bottom") {
      centerY = bounds.bottom + gridHeight * 0.5 + 0.55;
    }

    const left = centerX - gridWidth * 0.5;
    const top = centerY + gridHeight * 0.5;

    return {
      left,
      right: left + gridWidth,
      top,
      bottom: top - gridHeight,
      cellSize,
      gridSize,
      centerX,
      centerY,
    };
  }

  function normalizeCells(cells, gridSize) {
    const cellCount = gridSize * gridSize;
    if (!Array.isArray(cells) || cells.length !== cellCount) return null;

    const normalized = [];
    for (const value of cells) {
      const colorId = Math.floor(value);
      if (colorId < 0 || colorId >= colors.length) return null;
      normalized.push(colorId);
    }
    return normalized;
  }

  function generateGridFruits({
    seed,
    gridSize,
    colorCounts,
    cells,
    mechanisms,
    cellSize,
    bubbleFill = 0.84,
    verticalAlign = "center",
    verticalOffset = 0.2,
  }) {
    const cellCount = gridSize * gridSize;
    const fixedCells = normalizeCells(cells, gridSize);
    const colorBag = fixedCells ?? (() => {
      const rng = createSeededRandom(seed);
      const bag = buildColorBag(colorCounts, cellCount);
      shuffleInPlace(bag, rng);
      return bag;
    })();

    const layout = computeGridLayout({
      gridSize,
      cellSize,
      verticalAlign,
      verticalOffset,
    });
    const radius = (cellSize * 0.5) * bubbleFill;
    const fruitsDef = [];

    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        const index = row * gridSize + col;
        fruitsDef.push({
          x: layout.left + (col + 0.5) * layout.cellSize,
          y: layout.top - (row + 0.5) * layout.cellSize,
          col,
          row,
          colorId: colorBag[index],
          mechanismDirection: mechanisms?.get(index) ?? null,
          radius,
          vx: 0,
          vy: 0,
          motionMode: "grid",
        });
      }
    }

    return { fruitsDef, layout, radius };
  }

  function normalizeLevelDefinition(level, index) {
    const parsedColorCounts = normalizeColorCounts(level.colorCounts);
    if (!parsedColorCounts.length) {
      throw new Error(`Level ${level.id ?? index + 1} has empty colorCounts`);
    }

    const gridSize = Math.max(3, Math.floor(level.gridSize ?? 3));
    const gridCellCount = gridSize * gridSize;
    const gridCellSize = THREE.MathUtils.clamp(level.gridCellSize ?? 1.05, 0.55, 1.35);
    const gridBubbleFill = THREE.MathUtils.clamp(level.gridBubbleFill ?? 0.84, 0.22, 0.88);
    const gridRadius = (gridCellSize * 0.5) * gridBubbleFill;
    const gridVerticalAlign = level.gridVerticalAlign === "top" || level.gridVerticalAlign === "bottom"
      ? level.gridVerticalAlign
      : "center";
    const gridVerticalOffset = THREE.MathUtils.clamp(level.gridVerticalOffset ?? 0.2, -2.5, 2.5);
    const colorIds = parsedColorCounts.map((item) => item.colorId);
    const colorCounts = parsedColorCounts;
    const seed = Math.floor(level.seed ?? 1000 + (level.id ?? index + 1) * 137);
    const stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 8));
    const cells = normalizeCells(level.cells, gridSize);
    const mechanismMap = mechanismsFromLevel(level, gridSize);
    const mechanisms = mechanismsToLevelList(mechanismMap);

    const gridPack = generateGridFruits({
      seed,
      gridSize,
      colorCounts,
      cells,
      mechanisms: mechanismMap,
      cellSize: gridCellSize,
      bubbleFill: gridBubbleFill,
      verticalAlign: gridVerticalAlign,
      verticalOffset: gridVerticalOffset,
    });

    return {
      id: level.id,
      name: level.name,
      gridSize,
      gridCellSize,
      gridBubbleFill,
      gridRadius,
      gridLayout: gridPack.layout,
      gridVerticalAlign,
      gridVerticalOffset,
      seed,
      fruitCount: gridCellCount,
      colorIds,
      colorCounts,
      cells,
      mechanisms,
      stepLimit,
      fruits: gridPack.fruitsDef,
    };
  }

  function cloneNormalizedLevel(level) {
    return {
      ...level,
      gridLayout: level.gridLayout
        ? {
          left: level.gridLayout.left,
          right: level.gridLayout.right,
          top: level.gridLayout.top,
          bottom: level.gridLayout.bottom,
          cellSize: level.gridLayout.cellSize,
          gridSize: level.gridLayout.gridSize,
          centerX: level.gridLayout.centerX,
          centerY: level.gridLayout.centerY,
        }
        : undefined,
      colorIds: level.colorIds.map((id) => id),
      colorCounts: level.colorCounts.map((item) => ({ colorId: item.colorId, count: item.count })),
      mechanisms: Array.isArray(level.mechanisms)
        ? level.mechanisms.map((item) => ({ index: item.index, direction: item.direction }))
        : [],
      fruits: level.fruits.map((fruit) => ({
        x: fruit.x,
        y: fruit.y,
        colorId: fruit.colorId,
        mechanismDirection: fruit.mechanismDirection ?? null,
        radius: fruit.radius,
        vx: fruit.vx,
        vy: fruit.vy,
        col: fruit.col,
        row: fruit.row,
        motionMode: fruit.motionMode,
      })),
    };
  }

  function getNormalizedLevel(index) {
    const baseLevel = levels[index];
    if (!baseLevel) return null;

    const cellsKey = Array.isArray(baseLevel.cells) ? baseLevel.cells.join(",") : `seed:${baseLevel.seed}`;
    const mechKey = Array.isArray(baseLevel.mechanisms)
      ? baseLevel.mechanisms.map((item) => `${item.index}:${item.direction}`).join(";")
      : "";
    const key = `${index}|${baseLevel.gridSize}|${cellsKey}|${mechKey}|${bounds.left.toFixed(3)}|${bounds.right.toFixed(3)}|${bounds.top.toFixed(3)}|${bounds.bottom.toFixed(3)}`;
    const cached = cache.get(key);
    if (cached) return cloneNormalizedLevel(cached);

    const normalized = normalizeLevelDefinition(baseLevel, index);
    cache.set(key, normalized);
    return cloneNormalizedLevel(normalized);
  }

  function clearCache() {
    cache.clear();
  }

  return {
    getNormalizedLevel,
    clearCache,
  };
}