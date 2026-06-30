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
    tipEl.classList.remove("show", "is-victory-palette", "is-victory-perfect");
  }

  function show(text, durationMs = 1200, options = {}) {
    const el = ensureTipEl();
    if (!el || !text) return;

    clear();
    el.textContent = text;
    if (options.victoryPalette) {
      el.classList.add("is-victory-palette");
    }
    if (options.victoryPerfect) {
      el.classList.add("is-victory-perfect");
    }
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    hideTimer = window.setTimeout(() => {
      el.classList.remove("show", "is-victory-palette", "is-victory-perfect");
      hideTimer = 0;
    }, durationMs);
  }

  return {
    show,
    clear,
  };
}