import { createLevelEditorPlaytest } from "./level-editor-playtest.js";
import {
  LARGE_GRID_TIME_BUDGET_MS,
  cancelSolverJobs,
  levelBoardKey,
  solveLevelAsync,
} from "./level-editor-solver.js";

const COLORS = [
  { id: 0, name: "红", hex: "#ff0037" },
  { id: 1, name: "橙", hex: "#ff8a00" },
  { id: 2, name: "绿", hex: "#00d86a" },
  { id: 3, name: "蓝", hex: "#00a6ff" },
  { id: 4, name: "紫", hex: "#8a2bff" },
  { id: 5, name: "黄", hex: "#ffef00" },
  { id: 6, name: "粉", hex: "#ff3dc2" },
  { id: 7, name: "青", hex: "#00d4c1" },
];

const DEFAULT_LEVELS_URL = "./src/config/levels.json";
const SAVE_LEVELS_URL = "/api/levels/save";
const HEALTH_URL = "/api/health";

const els = {
  levelTabs: document.getElementById("level-tabs"),
  levelName: document.getElementById("level-name"),
  levelId: document.getElementById("level-id"),
  stepLimit: document.getElementById("step-limit"),
  gridSize: document.getElementById("grid-size"),
  difficulty: document.getElementById("difficulty"),
  palette: document.getElementById("palette"),
  grid: document.getElementById("grid"),
  stats: document.getElementById("stats"),
  exportJson: document.getElementById("export-json"),
  fileInput: document.getElementById("file-input"),
  btnFillSeed: document.getElementById("btn-fill-seed"),
  btnClear: document.getElementById("btn-clear"),
  btnLoadFile: document.getElementById("btn-load-file"),
  btnSave: document.getElementById("btn-save"),
  btnPlaytest: document.getElementById("btn-playtest"),
  btnSolve: document.getElementById("btn-solve"),
  btnExport: document.getElementById("btn-export"),
  btnCopy: document.getElementById("btn-copy"),
  btnDownload: document.getElementById("btn-download"),
};

const state = {
  activeColorId: 1,
  cells: Array(9).fill(1),
  seed: 41113,
  allLevels: [],
  loadedFromFile: false,
  saveApiAvailable: false,
  solutionCache: { key: "", result: null },
  solveRequestId: 0,
};

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

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function gridSize() {
  return Math.max(3, Math.min(5, Number(els.gridSize.value) || 3));
}

function resizeCells(size, previous = state.cells) {
  const next = Array(size * size).fill(state.activeColorId);
  const oldSize = Math.round(Math.sqrt(previous.length));
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (row < oldSize && col < oldSize) {
        next[row * size + col] = previous[row * oldSize + col] ?? state.activeColorId;
      }
    }
  }
  state.cells = next;
}

function buildColorCounts(cells) {
  const map = new Map();
  for (const colorId of cells) {
    map.set(colorId, (map.get(colorId) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([colorId, count]) => ({ colorId, count }));
}

function gridLayoutParams(size) {
  if (size <= 3) return { gridCellSize: 1.05, gridBubbleFill: 0.84 };
  if (size === 4) return { gridCellSize: 0.95, gridBubbleFill: 0.82 };
  return { gridCellSize: 0.9, gridBubbleFill: 0.8 };
}

function levelToEditor(level) {
  const size = Math.max(3, Math.floor(level.gridSize ?? 3));
  if (Array.isArray(level.cells) && level.cells.length === size * size) {
    state.cells = level.cells.map((v) => Math.floor(Number(v)));
  } else if (Array.isArray(level.colorCounts) && level.colorCounts.length) {
    const bag = [];
    for (const item of level.colorCounts) {
      for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
    }
    shuffleInPlace(bag, createSeededRandom(Math.floor(level.seed ?? 1)));
    state.cells = bag.slice(0, size * size);
  } else {
    resizeCells(size);
  }

  state.seed = Math.floor(level.seed ?? 41113);
  els.levelName.value = level.name ?? `染色-${String(level.id ?? 1).padStart(2, "0")}`;
  els.levelId.value = String(level.id ?? 1);
  els.stepLimit.value = String(level.stepLimit ?? 8);
  els.gridSize.value = String(size);
  els.difficulty.value = level.difficulty ?? "easy";
}

function buildLevelJson() {
  const size = gridSize();
  const cells = state.cells.slice(0, size * size);
  const colorCounts = buildColorCounts(cells);
  const colorIds = colorCounts.map((item) => item.colorId);
  const layout = gridLayoutParams(size);

  return {
    id: Math.max(1, Math.floor(Number(els.levelId.value) || 1)),
    name: els.levelName.value.trim() || "染色-01",
    difficulty: els.difficulty.value,
    homeBubbleColorId: colorIds[0] ?? 1,
    gridSize: size,
    ...layout,
    gridVerticalAlign: "center",
    gridVerticalOffset: 0.2,
    seed: state.seed,
    fruitCount: size * size,
    colorIds,
    colorCounts,
    cells,
    stepLimit: Math.max(1, Math.floor(Number(els.stepLimit.value) || 1)),
  };
}

function renderPalette() {
  els.palette.innerHTML = "";
  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `swatch${color.id === state.activeColorId ? " active" : ""}`;
    btn.style.background = color.hex;
    btn.title = `${color.id}: ${color.name}`;
    btn.addEventListener("click", () => {
      state.activeColorId = color.id;
      renderPalette();
    });
    els.palette.appendChild(btn);
  }
}

function renderGrid() {
  const size = gridSize();
  els.grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  els.grid.innerHTML = "";

  for (let i = 0; i < size * size; i += 1) {
    const colorId = state.cells[i] ?? state.activeColorId;
    const color = COLORS[colorId] ?? COLORS[0];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.style.background = `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 42%), ${color.hex}`;
    cell.title = `(${i % size}, ${Math.floor(i / size)}) = ${color.name}`;
    cell.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      invalidateSolutionCache();
      state.cells[i] = state.activeColorId;
      renderGrid();
      updateStats();
    });
    els.grid.appendChild(cell);
  }
}

function invalidateSolutionCache() {
  state.solveRequestId += 1;
  cancelSolverJobs();
  state.solutionCache.key = "";
  state.solutionCache.result = null;
}

async function getCachedSolutionAsync(level = buildLevelJson()) {
  const requestId = ++state.solveRequestId;
  const key = levelBoardKey(level);
  if (state.solutionCache.key === key && state.solutionCache.result) {
    return state.solutionCache.result;
  }

  const result = await solveLevelAsync(level);
  if (requestId !== state.solveRequestId) {
    return { steps: -1, moves: [], timedOut: true, cancelled: true };
  }

  state.solutionCache.key = key;
  state.solutionCache.result = result;
  return result;
}

function formatSolutionSummary(solution, stepLimit) {
  if (solution.timedOut) {
    const seconds = Math.round(LARGE_GRID_TIME_BUDGET_MS / 1000);
    return `最优解：${seconds} 秒内未算完（5×5 可手试，或稍后再算）`;
  }
  if (solution.steps < 0) return "最优解：未找到（40 步内无解）";
  if (solution.steps === 0) return "最优解：0 步（开局已同色）";
  if (!solution.moves?.length && solution.steps > 0) {
    return `最优解：至少 ${solution.steps} 步（未还原完整路径）`;
  }

  const limit = Math.max(1, Math.floor(stepLimit));
  const margin = limit - solution.steps;
  if (margin < 0) return `最优解：${solution.steps} 步（当前上限 ${limit}，偏紧）`;
  if (margin === 0) return `最优解：${solution.steps} 步（与上限相同）`;
  return `最优解：${solution.steps} 步（上限 ${limit}，余量 +${margin}）`;
}

function updateStats(extraLine = "") {
  const counts = buildColorCounts(state.cells);
  const text = counts.map((item) => {
    const color = COLORS[item.colorId];
    return `${color?.name ?? item.colorId}×${item.count}`;
  }).join(" · ");

  const lines = [`颜色分布：${text || "无"}`];
  if (extraLine) lines.push(extraLine);
  els.stats.textContent = lines.join("\n");
}

function solvingStatusText(level) {
  const size = Math.max(3, Math.floor(level.gridSize ?? 3));
  if (size > 4) {
    const seconds = Math.round(LARGE_GRID_TIME_BUDGET_MS / 1000);
    return `最优解：计算中（5×5，最多 ${seconds} 秒）…`;
  }
  return "最优解：计算中…";
}

async function calculateOptimalSteps() {
  const level = buildLevelJson();
  const originalText = els.btnSolve.textContent;
  els.btnSolve.disabled = true;
  els.btnPlaytest.disabled = true;
  els.btnSolve.textContent = "计算中…";
  updateStats(solvingStatusText(level));

  try {
    const solution = await getCachedSolutionAsync(level);
    if (solution.cancelled) return;
    updateStats(formatSolutionSummary(solution, level.stepLimit));
  } catch (err) {
    updateStats(`最优解：计算失败（${err?.message ?? "未知错误"}）`);
  } finally {
    els.btnSolve.disabled = false;
    els.btnPlaytest.disabled = false;
    els.btnSolve.textContent = originalText;
  }
}

function renderLevelTabs() {
  els.levelTabs.innerHTML = "";
  if (!state.allLevels.length) return;

  state.allLevels.forEach((level, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `L${level.id}`;
    btn.addEventListener("click", () => {
      levelToEditor(level);
      renderGrid();
      updateStats();
      for (const child of els.levelTabs.children) child.classList.remove("active");
      btn.classList.add("active");
    });
    els.levelTabs.appendChild(btn);
  });
}

function fillFromSeed() {
  const size = gridSize();
  const counts = buildColorCounts(state.cells);
  const bag = [];
  for (const item of counts) {
    for (let i = 0; i < item.count; i += 1) bag.push(item.colorId);
  }
  while (bag.length < size * size) bag.push(state.activeColorId);
  bag.length = size * size;
  shuffleInPlace(bag, createSeededRandom(state.seed));
  state.cells = bag;
  renderGrid();
  updateStats();
}

function syncCurrentLevelToAllLevels() {
  const level = buildLevelJson();
  if (!state.allLevels.length) {
    state.allLevels = [level];
    return level;
  }

  const nextLevels = state.allLevels.map((item) => (
    item.id === level.id ? level : item
  ));
  const hasCurrent = nextLevels.some((item) => item.id === level.id);
  state.allLevels = hasCurrent ? nextLevels : [...nextLevels, level];
  state.loadedFromFile = false;
  return level;
}

function buildExportPayload() {
  syncCurrentLevelToAllLevels();
  return {
    source: "level-editor",
    levels: state.allLevels.map((item) => ({ ...item })),
  };
}

function exportPreview() {
  const payload = buildExportPayload();
  els.exportJson.value = `${JSON.stringify(payload, null, 2)}\n`;
  return payload;
}

function setSaveButtonState(mode, text) {
  els.btnSave.classList.remove("save-ok", "save-fail", "primary");
  if (mode === "ok") els.btnSave.classList.add("save-ok");
  else if (mode === "fail") els.btnSave.classList.add("save-fail");
  else els.btnSave.classList.add("primary");
  els.btnSave.textContent = text;
}

async function probeSaveApi() {
  try {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.saveApi === true;
  } catch (_err) {
    return false;
  }
}

async function saveLevelsToFile() {
  if (!state.saveApiAvailable) {
    setSaveButtonState("fail", "需 dev 服务器");
    window.setTimeout(() => {
      setSaveButtonState("default", "保存到关卡文件");
    }, 2000);
    return;
  }

  const payload = buildExportPayload();
  exportPreview();
  els.btnSave.disabled = true;
  els.btnSave.textContent = "保存中…";

  try {
    const res = await fetch(SAVE_LEVELS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }

    setSaveButtonState("ok", "已保存");
    renderLevelTabs();
    window.setTimeout(() => {
      setSaveButtonState("default", "保存到关卡文件");
      els.btnSave.disabled = false;
    }, 1400);
  } catch (err) {
    setSaveButtonState("fail", "保存失败");
    els.stats.textContent = `保存失败：${err?.message ?? "未知错误"}（请用 npm run dev 启动服务器）`;
    window.setTimeout(() => {
      setSaveButtonState("default", "保存到关卡文件");
      els.btnSave.disabled = false;
      updateStats();
    }, 2200);
  }
}

async function loadLevelsFromUrl(url = DEFAULT_LEVELS_URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`无法加载 ${url}`);
  const data = await res.json();
  state.allLevels = Array.isArray(data.levels) ? data.levels : [];
  state.loadedFromFile = false;
  if (state.allLevels.length) levelToEditor(state.allLevels[0]);
  renderLevelTabs();
  renderGrid();
  updateStats();
}

function bindEvents() {
  els.gridSize.addEventListener("change", () => {
    invalidateSolutionCache();
    resizeCells(gridSize());
    renderGrid();
    updateStats();
  });

  els.btnFillSeed.addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 100000) + 10000;
    fillFromSeed();
  });

  els.btnClear.addEventListener("click", () => {
    const size = gridSize();
    state.cells = Array(size * size).fill(state.activeColorId);
    renderGrid();
    updateStats();
  });

  els.btnLoadFile.addEventListener("click", () => els.fileInput.click());

  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    state.allLevels = Array.isArray(data.levels) ? data.levels : [];
    state.loadedFromFile = true;
    if (state.allLevels.length) levelToEditor(state.allLevels[0]);
    renderLevelTabs();
    renderGrid();
    updateStats();
    els.fileInput.value = "";
  });

  els.btnSave.addEventListener("click", saveLevelsToFile);
  els.btnPlaytest.addEventListener("click", () => playtest.open());
  els.btnSolve.addEventListener("click", calculateOptimalSteps);
  els.btnExport.addEventListener("click", exportPreview);

  els.btnCopy.addEventListener("click", async () => {
    exportPreview();
    try {
      await navigator.clipboard.writeText(els.exportJson.value);
      els.btnCopy.textContent = "已复制";
      window.setTimeout(() => { els.btnCopy.textContent = "复制当前关卡"; }, 1200);
    } catch (_err) {
      els.exportJson.focus();
      els.exportJson.select();
    }
  });

  els.btnDownload.addEventListener("click", () => {
    const payload = exportPreview();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "levels.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

const playtest = createLevelEditorPlaytest({
  colors: COLORS,
  getLevel: buildLevelJson,
  solveLevel: getCachedSolutionAsync,
  getSolvingStatusText: solvingStatusText,
  onSolveStart: () => {
    els.btnSolve.disabled = true;
    els.btnPlaytest.disabled = true;
  },
  onSolveEnd: () => {
    els.btnSolve.disabled = false;
    els.btnPlaytest.disabled = false;
  },
});

async function init() {
  renderPalette();
  bindEvents();
  state.saveApiAvailable = await probeSaveApi();
  if (!state.saveApiAvailable) {
    els.btnSave.title = "请用 npm run dev 启动开发服务器后再保存";
  }
  try {
    await loadLevelsFromUrl();
  } catch (_err) {
    resizeCells(3);
    renderGrid();
    updateStats();
  }
  exportPreview();
}

init();