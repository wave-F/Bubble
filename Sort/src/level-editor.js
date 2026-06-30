import {
  applyDomI18n,
  colorName as localizedColorName,
  mountLocaleToggle,
  setDocumentLang,
  t,
} from "./i18n/dev-locale.js";
import { createLevelEditorPlaytest } from "./level-editor-playtest.js";
import {
  LARGE_GRID_TIME_BUDGET_MS,
  cancelSolverJobs,
  levelBoardKey,
  solveLevelAsync,
} from "./level-editor-solver.js";
import {
  DIRECTION_ARROW,
  mechanismsFromLevel,
  mechanismsToLevelList,
  normalizeDirection,
} from "./systems/mechanism-dye-logic.js";

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

const DEFAULT_LEVELS_URL = "/src/config/levels.json";
const SAVE_LEVELS_URL = "/api/levels/save";
const HEALTH_URL = "/api/health";

const els = {
  levelTabs: document.getElementById("level-tabs"),
  btnAddLevel: document.getElementById("btn-add-level"),
  levelName: document.getElementById("level-name"),
  levelId: document.getElementById("level-id"),
  stepLimit: document.getElementById("step-limit"),
  gridSize: document.getElementById("grid-size"),
  difficulty: document.getElementById("difficulty"),
  palette: document.getElementById("palette"),
  toolTabs: document.getElementById("tool-tabs"),
  directionTabs: document.getElementById("direction-tabs"),
  editorHint: document.getElementById("editor-hint"),
  grid: document.getElementById("grid"),
  stats: document.getElementById("stats"),
  exportJson: document.getElementById("export-json"),
  fileInput: document.getElementById("file-input"),
  btnFillSeed: document.getElementById("btn-fill-seed"),
  btnClear: document.getElementById("btn-clear"),
  btnClearMechanisms: document.getElementById("btn-clear-mechanisms"),
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
  editorMode: "color",
  mechanismDirection: "right",
  cells: Array(9).fill(1),
  mechanisms: new Map(),
  seed: 41113,
  allLevels: [],
  activeLevelId: null,
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

function resizeMechanisms(size, previous = state.mechanisms, oldSize = Math.round(Math.sqrt(state.cells.length))) {
  const next = new Map();
  for (const [index, direction] of previous.entries()) {
    const oldRow = Math.floor(index / oldSize);
    const oldCol = index % oldSize;
    if (oldRow < size && oldCol < size) {
      next.set(oldRow * size + oldCol, direction);
    }
  }
  state.mechanisms = next;
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

function nextLevelId() {
  if (!state.allLevels.length) return 1;
  return state.allLevels.reduce((max, item) => Math.max(max, Math.floor(item.id ?? 0)), 0) + 1;
}

function persistCurrentLevel() {
  const level = buildLevelJson();
  const previousId = state.activeLevelId;

  if (!state.allLevels.length) {
    state.allLevels = [level];
    state.activeLevelId = level.id;
    return level;
  }

  if (previousId != null) {
    const prevIndex = state.allLevels.findIndex((item) => item.id === previousId);
    if (prevIndex >= 0) {
      state.allLevels[prevIndex] = level;
      state.activeLevelId = level.id;
      return level;
    }
  }

  const sameIdIndex = state.allLevels.findIndex((item) => item.id === level.id);
  if (sameIdIndex >= 0) {
    state.allLevels[sameIdIndex] = level;
  } else {
    state.allLevels.push(level);
  }
  state.activeLevelId = level.id;
  return level;
}

function switchToLevel(level) {
  if (!level) return;
  persistCurrentLevel();
  invalidateSolutionCache();
  state.activeLevelId = level.id;
  levelToEditor(level);
  renderGrid();
  updateStats();
  renderToolTabs();
  renderLevelTabs();
  exportPreview();
}

function createBlankLevel(id) {
  const size = 3;
  const colorId = state.activeColorId;
  const cells = Array(size * size).fill(colorId);
  const layout = gridLayoutParams(size);

  return {
    id,
    name: `染色-${String(id).padStart(2, "0")}`,
    difficulty: "easy",
    homeBubbleColorId: colorId,
    gridSize: size,
    ...layout,
    gridVerticalAlign: "center",
    gridVerticalOffset: 0.2,
    seed: 40000 + id * 137,
    fruitCount: size * size,
    colorIds: [colorId],
    colorCounts: [{ colorId, count: size * size }],
    cells,
    mechanisms: [],
    stepLimit: 8,
    winMode: "unify",
  };
}

function addNewLevel() {
  persistCurrentLevel();
  invalidateSolutionCache();

  const id = nextLevelId();
  const level = createBlankLevel(id);
  state.allLevels.push(level);
  state.allLevels.sort((a, b) => a.id - b.id);
  state.editorMode = "color";
  switchToLevel(level);
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
  state.mechanisms = mechanismsFromLevel(level, size);
  els.levelName.value = level.name ?? `染色-${String(level.id ?? 1).padStart(2, "0")}`;
  els.levelId.value = String(level.id ?? 1);
  els.stepLimit.value = String(level.stepLimit ?? 8);
  els.gridSize.value = String(size);
  els.difficulty.value = level.difficulty ?? "easy";
  state.activeLevelId = Math.floor(level.id ?? 1);
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
    mechanisms: mechanismsToLevelList(state.mechanisms),
    stepLimit: Math.max(1, Math.floor(Number(els.stepLimit.value) || 1)),
    winMode: "unify",
  };
}

function renderToolTabs() {
  const isMechanism = state.editorMode === "mechanism";
  els.palette.classList.toggle("hidden", isMechanism);
  els.directionTabs.classList.toggle("hidden", !isMechanism);
  els.btnClearMechanisms.disabled = state.mechanisms.size === 0;

  for (const btn of els.toolTabs.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.tool === state.editorMode);
  }
  for (const btn of els.directionTabs.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.direction === state.mechanismDirection);
  }

  if (els.editorHint) {
    els.editorHint.innerHTML = isMechanism
      ? `<strong>机制泡泡模式</strong>：先选方向，再单击格子加箭头。右键单击可删除该格箭头。`
      : `<strong>涂色模式</strong>：选择颜色后单击格子涂色。已有箭头的格子会保留机制设置。`;
  }
}

function formatMechanismSummary(size) {
  if (!state.mechanisms.size) return "机制泡泡：无";
  const parts = mechanismsToLevelList(state.mechanisms).map((item) => {
    const col = item.index % size;
    const row = Math.floor(item.index / size);
    return `(${col},${row})${DIRECTION_ARROW[item.direction]}`;
  });
  return `机制泡泡：${parts.join(" · ")}`;
}

function applyCellEdit(index, { removeMechanism = false } = {}) {
  invalidateSolutionCache();
  if (state.editorMode === "mechanism") {
    if (removeMechanism) {
      state.mechanisms.delete(index);
    } else {
      state.mechanisms.set(index, state.mechanismDirection);
    }
  } else {
    state.cells[index] = state.activeColorId;
  }
  renderGrid();
  updateStats();
}

function renderPalette() {
  els.palette.innerHTML = "";
  for (const color of COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `swatch${color.id === state.activeColorId ? " active" : ""}`;
    btn.style.background = color.hex;
    btn.title = t("editor.palette.title", { id: color.id, name: localizedColorName(color.id, color.name) });
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
    const mechanismDir = state.mechanisms.get(i) ?? null;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `cell${mechanismDir ? " mechanism" : ""}`;
    cell.style.background = `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 42%), ${color.hex}`;
    const baseTitle = t("editor.cell.title", {
      col: i % size,
      row: Math.floor(i / size),
      name: localizedColorName(colorId, color.name),
    });
    cell.title = mechanismDir
      ? `${baseTitle} · 机制${DIRECTION_ARROW[mechanismDir]}`
      : baseTitle;
    cell.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      applyCellEdit(i);
    });
    cell.addEventListener("contextmenu", (ev) => {
      if (!state.mechanisms.has(i)) return;
      ev.preventDefault();
      applyCellEdit(i, { removeMechanism: true });
    });
    if (mechanismDir) {
      const arrow = document.createElement("span");
      arrow.className = "cell-arrow";
      arrow.textContent = DIRECTION_ARROW[mechanismDir] ?? "•";
      cell.appendChild(arrow);
    }
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
  let mainLine = "";

  if (solution.timedOut) {
    const seconds = Math.round(LARGE_GRID_TIME_BUDGET_MS / 1000);
    mainLine = t("editor.solve.timeout", { seconds });
  } else if (solution.steps < 0) {
    mainLine = t("editor.solve.notFound");
  } else if (solution.steps === 0) {
    mainLine = t("editor.solve.zero");
  } else if (!solution.moves?.length && solution.steps > 0) {
    mainLine = t("editor.solve.partial", { steps: solution.steps });
  } else {
    const limit = Math.max(1, Math.floor(stepLimit));
    const margin = limit - solution.steps;
    if (margin < 0) mainLine = t("editor.solve.tight", { steps: solution.steps, limit });
    else if (margin === 0) mainLine = t("editor.solve.exact", { steps: solution.steps });
    else mainLine = t("editor.solve.margin", { steps: solution.steps, limit, margin });
  }

  return mainLine;
}

function updateStats(extraLine = "") {
  const counts = buildColorCounts(state.cells);
  const text = counts.map((item) => {
    const color = COLORS[item.colorId];
    const name = localizedColorName(item.colorId, color?.name ?? item.colorId);
    return `${name}×${item.count}`;
  }).join(" · ");

  const size = gridSize();
  const lines = [
    t("editor.stats.colors", { text: text || t("editor.stats.none") }),
    formatMechanismSummary(size),
  ];
  if (extraLine) lines.push(extraLine);
  els.stats.textContent = lines.join("\n");
  renderToolTabs();
}

function solvingStatusText(level) {
  const size = Math.max(3, Math.floor(level.gridSize ?? 3));
  if (size > 4) {
    const seconds = Math.round(LARGE_GRID_TIME_BUDGET_MS / 1000);
    return t("editor.solve.computingLarge", { seconds });
  }
  return t("editor.solve.computing");
}

async function calculateOptimalSteps() {
  const level = buildLevelJson();

  els.btnSolve.disabled = true;
  els.btnPlaytest.disabled = true;
  els.btnSolve.textContent = t("editor.btn.solving");
  updateStats(solvingStatusText(level));

  try {
    const solution = await getCachedSolutionAsync(level);
    if (solution.cancelled) return;
    updateStats(formatSolutionSummary(solution, level.stepLimit));
  } catch (err) {
    updateStats(t("editor.solve.failed", { message: err?.message ?? "?" }));
  } finally {
    els.btnSolve.disabled = false;
    els.btnPlaytest.disabled = false;
    els.btnSolve.textContent = t("editor.btn.solve");
  }
}

function renderLevelTabs() {
  els.levelTabs.innerHTML = "";
  if (!state.allLevels.length) return;

  for (const level of state.allLevels) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `L${level.id}`;
    btn.classList.toggle("active", level.id === state.activeLevelId);
    btn.addEventListener("click", () => {
      if (level.id === state.activeLevelId) return;
      switchToLevel(level);
    });
    els.levelTabs.appendChild(btn);
  }
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
  const level = persistCurrentLevel();
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

function saveButtonLabel(mode) {
  if (mode === "ok") return t("editor.btn.saved");
  if (mode === "fail") return t("editor.btn.saveFail");
  if (mode === "needServer") return t("editor.btn.needDevServer");
  if (mode === "saving") return t("editor.btn.saving");
  return t("editor.btn.save");
}

function setSaveButtonState(mode, text = saveButtonLabel(mode)) {
  els.btnSave.classList.remove("save-ok", "save-fail", "primary");
  if (mode === "ok") els.btnSave.classList.add("save-ok");
  else if (mode === "fail" || mode === "needServer") els.btnSave.classList.add("save-fail");
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
    setSaveButtonState("needServer");
    window.setTimeout(() => {
      setSaveButtonState("default");
    }, 2000);
    return;
  }

  const payload = buildExportPayload();
  exportPreview();
  els.btnSave.disabled = true;
  setSaveButtonState("saving");

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

    setSaveButtonState("ok");
    renderLevelTabs();
    window.setTimeout(() => {
      setSaveButtonState("default");
      els.btnSave.disabled = false;
    }, 1400);
  } catch (err) {
    setSaveButtonState("fail");
    els.stats.textContent = t("editor.save.failed", { message: err?.message ?? "?" });
    window.setTimeout(() => {
      setSaveButtonState("default");
      els.btnSave.disabled = false;
      updateStats();
    }, 2200);
  }
}

async function loadLevelsFromUrl(url = DEFAULT_LEVELS_URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(t("editor.load.failed", { url }));
  const data = await res.json();
  state.allLevels = Array.isArray(data.levels) ? data.levels : [];
  state.loadedFromFile = false;
  if (state.allLevels.length) {
    state.activeLevelId = state.allLevels[0].id;
    levelToEditor(state.allLevels[0]);
  }
  renderLevelTabs();
  renderGrid();
  updateStats();
}

function bindEvents() {
  els.btnAddLevel?.addEventListener("click", addNewLevel);

  els.gridSize.addEventListener("change", () => {
    invalidateSolutionCache();
    const size = gridSize();
    const oldSize = Math.round(Math.sqrt(state.cells.length));
    const previousMechanisms = new Map(state.mechanisms);
    resizeCells(size);
    resizeMechanisms(size, previousMechanisms, oldSize);
    renderGrid();
    updateStats();
  });

  els.toolTabs.addEventListener("click", (ev) => {
    const tool = ev.target.closest("button")?.dataset?.tool;
    if (!tool || tool === state.editorMode) return;
    state.editorMode = tool;
    renderToolTabs();
  });

  els.directionTabs.addEventListener("click", (ev) => {
    const direction = normalizeDirection(ev.target.closest("button")?.dataset?.direction);
    if (!direction || direction === state.mechanismDirection) return;
    state.mechanismDirection = direction;
    renderToolTabs();
    renderGrid();
  });

  els.btnFillSeed.addEventListener("click", () => {
    state.seed = Math.floor(Math.random() * 100000) + 10000;
    fillFromSeed();
  });

  els.btnClear.addEventListener("click", () => {
    const size = gridSize();
    invalidateSolutionCache();
    state.cells = Array(size * size).fill(state.activeColorId);
    state.mechanisms = new Map();
    renderGrid();
    updateStats();
    exportPreview();
  });

  els.btnClearMechanisms.addEventListener("click", () => {
    if (!state.mechanisms.size) return;
    invalidateSolutionCache();
    state.mechanisms = new Map();
    renderGrid();
    updateStats();
    exportPreview();
  });

  els.btnLoadFile.addEventListener("click", () => els.fileInput.click());

  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    state.allLevels = Array.isArray(data.levels) ? data.levels : [];
    state.loadedFromFile = true;
    if (state.allLevels.length) {
      state.activeLevelId = state.allLevels[0].id;
      levelToEditor(state.allLevels[0]);
    }
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
      els.btnCopy.textContent = t("editor.btn.copied");
      window.setTimeout(() => { els.btnCopy.textContent = t("editor.btn.copy"); }, 1200);
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

function refreshEditorLocale() {
  applyDomI18n(document);
  setDocumentLang();
  renderPalette();
  renderToolTabs();
  renderGrid();
  updateStats();
  els.btnSolve.textContent = t("editor.btn.solve");
  if (!els.btnSave.disabled) setSaveButtonState("default");
  playtest.refreshLocale?.();
}

async function init() {
  mountLocaleToggle(document.getElementById("editor-locale-mount"), {
    onChange: refreshEditorLocale,
  });
  refreshEditorLocale();
  bindEvents();
  state.saveApiAvailable = await probeSaveApi();
  if (!state.saveApiAvailable) {
    els.btnSave.title = t("editor.save.title");
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