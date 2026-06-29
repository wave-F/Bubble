export function createGameplayTipController({ hostEl } = {}) {
  let tipEl = null;
  let hideTimer = 0;

  function ensureTipEl() {
    if (tipEl) return tipEl;
    if (!hostEl) return null;

    tipEl = document.createElement("div");
    tipEl.id = "gameplay-center-tip";
    tipEl.className = "gameplay-center-tip";
    hostEl.appendChild(tipEl);
    return tipEl;
  }

  function clear() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    if (!tipEl) return;
    tipEl.classList.remove("show", "is-victory-palette");
  }

  function show(text, durationMs = 1200, options = {}) {
    const el = ensureTipEl();
    if (!el || !text) return;

    clear();
    el.textContent = text;
    if (options.victoryPalette) {
      el.classList.add("is-victory-palette");
    }
    el.classList.add("show");
    hideTimer = window.setTimeout(() => {
      el.classList.remove("show", "is-victory-palette");
      hideTimer = 0;
    }, durationMs);
  }

  return {
    show,
    clear,
  };
}