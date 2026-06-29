export function createSimpleLevelWin({ rootEl, titleEl, descEl, actionBtnEl } = {}) {
  let onAction = null;

  function open({
    title = "关卡胜利！",
    desc = "",
    actionText = "下一关",
    variant = "win",
    onAction: action,
  } = {}) {
    if (titleEl) titleEl.textContent = title;
    if (descEl) {
      descEl.textContent = desc;
      descEl.classList.toggle("hidden", !desc);
    }
    if (actionBtnEl) actionBtnEl.textContent = actionText;
    rootEl?.classList.toggle("is-win", variant !== "lose");
    rootEl?.classList.toggle("is-lose", variant === "lose");
    onAction = typeof action === "function" ? action : null;
    rootEl?.classList.remove("hidden");
  }

  function close() {
    rootEl?.classList.add("hidden");
    rootEl?.classList.remove("is-win", "is-lose");
    onAction = null;
  }

  actionBtnEl?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const action = onAction;
    if (!action) return;
    onAction = null;
    action();
  });

  return {
    open,
    close,
  };
}