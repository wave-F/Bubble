export function createLoadingScreenController({
  rootEl,
  barEl,
  percentEl,
  statusEl,
} = {}) {
  let hideTimer = 0;

  function show() {
    if (!rootEl) return;
    window.clearTimeout(hideTimer);
    rootEl.classList.remove("hidden", "is-done", "is-error");
    document.documentElement.classList.add("is-boot-loading");
  }

  function setProgress(ratio, statusText = "") {
    const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
    const percent = Math.round(clamped * 100);

    if (barEl) {
      barEl.style.width = `${percent}%`;
    }
    if (percentEl) {
      percentEl.textContent = `${percent}%`;
    }
    if (statusEl && statusText) {
      statusEl.textContent = statusText;
    }
  }

  function showError(message) {
    if (!rootEl) return;
    rootEl.classList.add("is-error");
    rootEl.classList.remove("is-done");
    if (statusEl) {
      statusEl.textContent = message;
    }
    if (percentEl) {
      percentEl.textContent = "";
    }
  }

  function hide() {
    if (!rootEl) return;
    setProgress(1, "准备就绪");
    rootEl.classList.add("is-done");
    hideTimer = window.setTimeout(() => {
      rootEl.classList.add("hidden");
      document.documentElement.classList.remove("is-boot-loading");
    }, 280);
  }

  return {
    show,
    setProgress,
    showError,
    hide,
  };
}