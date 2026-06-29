import { applyPop, boardFromLevel, isBoardUnified } from "./level-editor-solver.js";

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
  };

  function colorHex(colorId) {
    return colors[colorId]?.hex ?? "#888";
  }

  function colorName(colorId) {
    return colors[colorId]?.name ?? String(colorId);
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
    if (timedOut) return "最优步数：超时未算完（可继续手玩）";
    if (steps < 0) return "最优步数：未找到解（40 步内）";
    if (steps === 0) return "最优步数：0（开局已同色）";
    if (!moves?.length) return `最优步数：${steps}（路径未就绪）`;
    return `最优步数：${steps}`;
  }

  function updateHud() {
    const remaining = Math.max(0, playState.stepLimit - playState.stepsUsed);
    stepsEl.textContent = `剩余步数：${remaining} / ${playState.stepLimit}`;
    optimalEl.textContent = formatOptimalText();

    if (playState.preview.active) {
      const total = playState.solution.moves.length;
      const current = playState.preview.moveIndex;
      if (current >= total && playState.result === "win") {
        statusEl.textContent = `解法预览完成：共 ${total} 步`;
        statusEl.dataset.state = "win";
      } else {
        statusEl.textContent = `解法预览：${current} / ${total}`;
        statusEl.dataset.state = "playing";
      }
      return;
    }

    if (playState.result === "win") {
      statusEl.textContent = "过关！剩余泡泡颜色已统一";
      statusEl.dataset.state = "win";
      return;
    }
    if (playState.result === "lose") {
      statusEl.textContent = "失败：步数用尽，颜色未统一";
      statusEl.dataset.state = "lose";
      return;
    }

    statusEl.textContent = "点击泡泡捏碎：自己消失，四邻染成源色";
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
          cell.title = `(${col}, ${row}) 已消除`;
        } else {
          const hex = colorHex(colorId);
          cell.style.background = `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 42%), ${hex}`;
          cell.title = `(${col}, ${row}) ${colorName(colorId)}`;
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

    if (isBoardUnified(playState.board)) {
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

    if (isBoardUnified(playState.board)) {
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
    playState.ended = isBoardUnified(board);
    playState.result = playState.ended ? "win" : null;
    playState.solution = solution ?? { steps: -1, moves: [] };
    playState.preview.active = false;
    playState.preview.moveIndex = 0;

    titleEl.textContent = level.name ?? `关卡 ${level.id ?? ""}`;
    renderBoard();
    updateHud();
    updatePreviewButtons();
  }

  async function loadSolution(level) {
    const requestId = ++playState.solveRequestId;
    optimalEl.textContent = getSolvingStatusText?.(level) ?? "最优步数：计算中…";
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
    optimalEl.textContent = getSolvingStatusText?.(level) ?? "最优步数：计算中…";
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

  return { open, close, restart };
}