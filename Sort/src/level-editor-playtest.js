import { applyPop, boardFromLevel, isBoardUnified } from "./level-editor-solver.js";
import { isRetainWinMetFromBoard, normalizeWinMode } from "./game/win-conditions.js";
import { applyDomI18n, colorName as localizedColorName, t } from "./i18n/dev-locale.js";

export function createLevelEditorPlaytest({
  colors,
  getLevel,
  solveLevel,
  getSolvingStatusText,
  onSolveStart,
  onSolveEnd,
}) {
  const overlay = document.getElementById("playtest-overlay");
  const titleEl = document.getElementById("playtest-title");
  const statusEl = document.getElementById("playtest-status");
  const stepsEl = document.getElementById("playtest-steps");
  const optimalEl = document.getElementById("playtest-optimal");
  const gridEl = document.getElementById("playtest-grid");
  const btnClose = document.getElementById("playtest-close");
  const btnCloseFooter = document.getElementById("playtest-close-footer");
  const btnRestart = document.getElementById("playtest-restart");
  const btnPreview = document.getElementById("playtest-preview");
  const btnPreviewPlay = document.getElementById("playtest-preview-play");
  const btnPreviewStep = document.getElementById("playtest-preview-step");
  const btnPreviewStop = document.getElementById("playtest-preview-stop");
  const btnBackdrop = document.getElementById("playtest-backdrop");

  const playState = {
    size: 3,
    initialBoard: [],
    board: [],
    stepsUsed: 0,
    stepLimit: 1,
    ended: false,
    result: null,
    solution: { steps: -1, moves: [] },
    solveRequestId: 0,
    preview: {
      active: false,
      moveIndex: 0,
      timer: null,
    },
    winMode: "unify",
    retainTargets: [],
  };

  function isWinBoard(board) {
    if (normalizeWinMode(playState.winMode) === "retain") {
      return isRetainWinMetFromBoard(board, playState.retainTargets);
    }
    return isBoardUnified(board);
  }

  function colorHex(colorId) {
    return colors[colorId]?.hex ?? "#888";
  }

  function colorLabel(colorId) {
    return localizedColorName(colorId, colors[colorId]?.name ?? String(colorId));
  }

  function stopPreviewTimer() {
    if (playState.preview.timer) {
      window.clearInterval(playState.preview.timer);
      playState.preview.timer = null;
    }
  }

  function stopPreview({ resetBoard = true } = {}) {
    stopPreviewTimer();
    playState.preview.active = false;
    playState.preview.moveIndex = 0;
    if (resetBoard) {
      playState.board = playState.initialBoard.slice();
      playState.stepsUsed = 0;
      playState.ended = false;
      playState.result = null;
    }
    updatePreviewButtons();
    renderBoard();
    updateHud();
  }

  function updatePreviewButtons() {
    const hasSolution = !playState.solution.timedOut && (
      (playState.solution.steps >= 0 && playState.solution.moves.length > 0)
      || playState.solution.steps === 0
    );
    const previewing = playState.preview.active;
    const previewDone = previewing && playState.preview.moveIndex >= playState.solution.moves.length;

    btnPreview.disabled = !hasSolution || previewing;
    btnPreviewPlay.disabled = !hasSolution || previewing || previewDone;
    btnPreviewStep.disabled = !hasSolution || previewDone;
    btnPreviewStop.disabled = !previewing && playState.preview.moveIndex === 0;
  }

  function formatOptimalText() {
    const { steps, timedOut, moves } = playState.solution;
    if (timedOut) return t("playtest.optimal.timeout");
    if (steps < 0) return t("playtest.optimal.notFound");
    if (steps === 0) return t("playtest.optimal.zero");
    if (!moves?.length) return t("playtest.optimal.noPath", { steps });
    return t("playtest.optimal.steps", { steps });
  }

  function updateHud() {
    const remaining = Math.max(0, playState.stepLimit - playState.stepsUsed);
    stepsEl.textContent = t("playtest.steps", { remaining, limit: playState.stepLimit });
    optimalEl.textContent = formatOptimalText();

    if (playState.preview.active) {
      const total = playState.solution.moves.length;
      const current = playState.preview.moveIndex;
      if (current >= total && playState.result === "win") {
        statusEl.textContent = t("playtest.status.previewDone", { total });
        statusEl.dataset.state = "win";
      } else {
        statusEl.textContent = t("playtest.status.preview", { current, total });
        statusEl.dataset.state = "playing";
      }
      return;
    }

    if (playState.result === "win") {
      statusEl.textContent = playState.winMode === "retain"
        ? t("playtest.status.winRetain")
        : t("playtest.status.win");
      statusEl.dataset.state = "win";
      return;
    }
    if (playState.result === "lose") {
      statusEl.textContent = playState.winMode === "retain"
        ? t("playtest.status.loseRetain")
        : t("playtest.status.lose");
      statusEl.dataset.state = "lose";
      return;
    }

    statusEl.textContent = t("playtest.status.playing");
    statusEl.dataset.state = "playing";
  }

  function moveBadgeForCell(row, col) {
    if (!playState.preview.active) return null;
    const index = playState.solution.moves.findIndex(
      (move) => move.row === row && move.col === col,
    );
    if (index < 0) return null;
    return index + 1;
  }

  function isCurrentPreviewTarget(row, col) {
    if (!playState.preview.active) return false;
    const move = playState.solution.moves[playState.preview.moveIndex];
    return Boolean(move && move.row === row && move.col === col);
  }

  function renderBoard() {
    const { size, board } = playState;
    gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridEl.innerHTML = "";

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const idx = row * size + col;
        const colorId = board[idx];
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "playtest-cell";

        if (colorId < 0) {
          cell.classList.add("empty");
          cell.disabled = true;
          cell.title = t("playtest.cell.removed", { col, row });
        } else {
          const hex = colorHex(colorId);
          cell.style.background = `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 42%), ${hex}`;
          cell.title = t("playtest.cell.color", { col, row, name: colorLabel(colorId) });
          if (!playState.preview.active && !playState.ended) {
            cell.addEventListener("click", () => onCellClick(row, col));
          } else {
            cell.disabled = true;
          }
        }

        const badge = moveBadgeForCell(row, col);
        if (badge !== null) {
          const tag = document.createElement("span");
          tag.className = "playtest-step-badge";
          tag.textContent = String(badge);
          cell.appendChild(tag);
        }

        if (isCurrentPreviewTarget(row, col)) {
          cell.classList.add("preview-target");
        }

        gridEl.appendChild(cell);
      }
    }
  }

  function onCellClick(row, col) {
    if (playState.ended || playState.preview.active) return;

    const next = applyPop(playState.board, playState.size, row, col);
    if (!next) return;

    playState.board = next;
    playState.stepsUsed += 1;

    if (isWinBoard(playState.board)) {
      playState.ended = true;
      playState.result = "win";
      renderBoard();
      updateHud();
      updatePreviewButtons();
      return;
    }

    if (playState.stepsUsed >= playState.stepLimit) {
      playState.ended = true;
      playState.result = "lose";
      renderBoard();
      updateHud();
      updatePreviewButtons();
      return;
    }

    renderBoard();
    updateHud();
  }

  function applyPreviewStep() {
    const move = playState.solution.moves[playState.preview.moveIndex];
    if (!move) return false;

    const next = applyPop(playState.board, playState.size, move.row, move.col);
    if (!next) return false;

    playState.board = next;
    playState.preview.moveIndex += 1;
    playState.stepsUsed = playState.preview.moveIndex;

    if (isWinBoard(playState.board)) {
      playState.ended = true;
      playState.result = "win";
    }

    renderBoard();
    updateHud();
    updatePreviewButtons();
    return true;
  }

  function startPreview() {
    if (playState.solution.steps < 0) return;

    stopPreview({ resetBoard: true });
    playState.preview.active = true;
    playState.preview.moveIndex = 0;
    renderBoard();
    updateHud();
    updatePreviewButtons();
  }

  function playPreviewAuto() {
    if (playState.solution.steps < 0) return;
    if (!playState.preview.active) startPreview();

    stopPreviewTimer();
    playState.preview.timer = window.setInterval(() => {
      if (playState.preview.moveIndex >= playState.solution.moves.length) {
        stopPreviewTimer();
        updatePreviewButtons();
        return;
      }
      applyPreviewStep();
      if (playState.preview.moveIndex >= playState.solution.moves.length) {
        stopPreviewTimer();
        updatePreviewButtons();
      }
    }, 650);
  }

  function startFromLevel(level, solution = null) {
    stopPreviewTimer();
    const { size, board } = boardFromLevel(level);

    playState.size = size;
    playState.initialBoard = board.slice();
    playState.board = board.slice();
    playState.stepsUsed = 0;
    playState.stepLimit = Math.max(1, Math.floor(level.stepLimit ?? 1));
    playState.winMode = level.winMode === "retain" ? "retain" : "unify";
    playState.retainTargets = Array.isArray(level.retainTargets)
      ? level.retainTargets.map((item) => ({
        colorId: Math.floor(item.colorId),
        count: Math.floor(item.count),
      }))
      : [];
    playState.ended = isWinBoard(board);
    playState.result = playState.ended ? "win" : null;
    playState.solution = solution ?? { steps: -1, moves: [] };
    playState.preview.active = false;
    playState.preview.moveIndex = 0;

    titleEl.textContent = level.name ?? t("playtest.levelTitle", { id: level.id ?? "" });
    renderBoard();
    updateHud();
    updatePreviewButtons();
  }

  async function loadSolution(level) {
    const requestId = ++playState.solveRequestId;
    optimalEl.textContent = getSolvingStatusText?.(level) ?? t("playtest.optimal.computing");
    onSolveStart?.();

    try {
      const solution = await solveLevel(level);
      if (requestId !== playState.solveRequestId) return;
      playState.solution = solution;
      updateHud();
      updatePreviewButtons();
    } finally {
      if (requestId === playState.solveRequestId) {
        onSolveEnd?.();
      }
    }
  }

  async function open() {
    const level = getLevel();
    playState.solveRequestId += 1;
    startFromLevel(level, { steps: -1, moves: [], timedOut: false });
    optimalEl.textContent = getSolvingStatusText?.(level) ?? t("playtest.optimal.computing");
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("playtest-open");

    await loadSolution(level);
  }

  function close() {
    playState.solveRequestId += 1;
    onSolveEnd?.();
    stopPreview();
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("playtest-open");
  }

  async function restart() {
    const level = getLevel();
    stopPreview({ resetBoard: true });
    startFromLevel(level, { steps: -1, moves: [], timedOut: false });
    await loadSolution(level);
    renderBoard();
    updateHud();
  }

  btnClose.addEventListener("click", close);
  btnCloseFooter?.addEventListener("click", close);
  btnBackdrop.addEventListener("click", close);
  btnRestart.addEventListener("click", restart);
  btnPreview.addEventListener("click", startPreview);
  btnPreviewPlay.addEventListener("click", playPreviewAuto);
  btnPreviewStep.addEventListener("click", () => {
    if (!playState.preview.active) startPreview();
    applyPreviewStep();
  });
  btnPreviewStop.addEventListener("click", () => stopPreview({ resetBoard: true }));

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !overlay.classList.contains("hidden")) close();
  });

  function refreshLocale() {
    applyDomI18n(overlay);
    if (!overlay.classList.contains("hidden")) {
      updateHud();
      renderBoard();
    }
  }

  return { open, close, restart, refreshLocale };
}