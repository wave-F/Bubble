import * as THREE from "three/webgpu";

const STORAGE_KEY = "fruit_level1_tutorial_seen_v1";
const SHOW_SPOTLIGHT_MASK = false;
const SHOW_HIGHLIGHT_RING = false;
const FINGER_OFFSET_X = 14;
const FINGER_OFFSET_Y = -26;
const TIP_BELOW_BUBBLE_SCALE = 2.15;
const TIP_OFFSET_Y = 15;
const TIP_SWAP_FADE_MS = 220;
const TIP_SWAP_GAP_MS = 140;

const STEPS = {
  HOLD: "hold",
  GOAL: "goal",
  DONE: "done",
};

export function createLevel1TutorialController({
  phoneFrameEl,
  getCamera,
  getRenderer,
} = {}) {
  let active = false;
  let step = STEPS.DONE;
  let targetFruit = null;
  let pendingRemainingMoves = 3;
  let rootEl = null;
  let overlayEl = null;
  let fingerEl = null;
  let ringEl = null;
  let tipEl = null;
  let stepTimer = 0;
  let wrongPressTimer = 0;
  let cachedTipAnchor = null;
  const workCenter = new THREE.Vector3();
  const workEdgeX = new THREE.Vector3();
  const workEdgeY = new THREE.Vector3();
  const workProjected = new THREE.Vector3();

  function readSeen() {
    if (typeof window === "undefined" || !window.localStorage) return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function persistSeen() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore storage failures
    }
  }

  function shouldRun(levelIndex) {
    return levelIndex === 0 && !readSeen();
  }

  function clearTimers() {
    if (stepTimer) {
      window.clearTimeout(stepTimer);
      stepTimer = 0;
    }
    if (wrongPressTimer) {
      window.clearTimeout(wrongPressTimer);
      wrongPressTimer = 0;
    }
  }

  function ensureRoot() {
    if (rootEl) return;

    rootEl = document.createElement("div");
    rootEl.id = "level1-tutorial";
    rootEl.className = "level1-tutorial";
    rootEl.setAttribute("aria-hidden", "true");

    if (SHOW_SPOTLIGHT_MASK) {
      overlayEl = document.createElement("div");
      overlayEl.className = "level1-tutorial-spotlight";
    }

    if (SHOW_HIGHLIGHT_RING) {
      ringEl = document.createElement("div");
      ringEl.className = "level1-tutorial-ring";
    }

    fingerEl = document.createElement("div");
    fingerEl.className = "level1-tutorial-finger";
    fingerEl.setAttribute("aria-hidden", "true");
    const fingerImg = document.createElement("img");
    fingerImg.className = "level1-tutorial-finger-img";
    fingerImg.src = "./assets/images/HandPointer.png";
    fingerImg.alt = "";
    fingerImg.decoding = "async";
    fingerEl.appendChild(fingerImg);

    tipEl = document.createElement("div");
    tipEl.className = "level1-tutorial-tip";

    rootEl.append(
      ...(overlayEl ? [overlayEl] : []),
      ...(ringEl ? [ringEl] : []),
      fingerEl,
      tipEl,
    );
    phoneFrameEl?.appendChild(rootEl);
  }

  function setTip(text) {
    if (!tipEl) return;
    tipEl.classList.add("is-below-finger");
    tipEl.classList.remove("is-centered");
    tipEl.textContent = text;
    tipEl.classList.toggle("show", Boolean(text));
    syncTipPosition();
  }

  function hideTip() {
    return new Promise((resolve) => {
      if (!tipEl) {
        resolve();
        return;
      }
      tipEl.classList.remove("show");
      window.setTimeout(resolve, TIP_SWAP_FADE_MS + TIP_SWAP_GAP_MS);
    });
  }

  function swapTip(text) {
    return hideTip().then(() => {
      setTip(text);
    });
  }

  function worldToFramePoint(worldPos, camera, appRect, frameRect) {
    workProjected.copy(worldPos).project(camera);
    if (workProjected.z > 1) return null;

    return {
      x: (workProjected.x * 0.5 + 0.5) * appRect.width + appRect.left - frameRect.left,
      y: (-workProjected.y * 0.5 + 0.5) * appRect.height + appRect.top - frameRect.top,
    };
  }

  function projectBubbleAnchor(fruit) {
    const camera = getCamera?.();
    const renderer = getRenderer?.();
    if (!camera || !renderer || !fruit?.bubble || !phoneFrameEl) return null;

    fruit.bubble.updateWorldMatrix?.(true, false);
    fruit.bubble.getWorldPosition(workCenter);

    const worldRadius = fruit.radius * fruit.bubble.scale.x;
    workEdgeX.copy(workCenter);
    workEdgeX.x += worldRadius;
    workEdgeY.copy(workCenter);
    workEdgeY.y += worldRadius;

    const appRect = renderer.domElement.getBoundingClientRect();
    const frameRect = phoneFrameEl.getBoundingClientRect();
    const center = worldToFramePoint(workCenter, camera, appRect, frameRect);
    const edgeX = worldToFramePoint(workEdgeX, camera, appRect, frameRect);
    const edgeY = worldToFramePoint(workEdgeY, camera, appRect, frameRect);
    if (!center || !edgeX || !edgeY) return null;

    const radius = Math.max(
      24,
      Math.hypot(edgeX.x - center.x, edgeX.y - center.y),
      Math.hypot(edgeY.x - center.x, edgeY.y - center.y),
    );

    return {
      x: center.x,
      y: center.y,
      radius,
    };
  }

  function placeCircleEl(el, anchor, diameter) {
    if (!el || !anchor) return;
    el.style.width = `${diameter}px`;
    el.style.height = `${diameter}px`;
    el.style.left = `${anchor.x}px`;
    el.style.top = `${anchor.y}px`;
  }

  function getFingerTop(anchor) {
    return anchor.y + anchor.radius * 0.92 + FINGER_OFFSET_Y;
  }

  function updateFingerPosition(anchor) {
    if (!fingerEl || !anchor) return;
    fingerEl.style.left = `${anchor.x + FINGER_OFFSET_X}px`;
    fingerEl.style.top = `${getFingerTop(anchor)}px`;
  }

  function syncTipPosition() {
    if (!tipEl?.classList.contains("show") || !cachedTipAnchor) return;
    tipEl.style.left = `${cachedTipAnchor.x}px`;
    tipEl.style.top = `${cachedTipAnchor.y + cachedTipAnchor.radius * TIP_BELOW_BUBBLE_SCALE + TIP_OFFSET_Y}px`;
  }

  function updatePositions() {
    if (!active) return;

    let anchor = cachedTipAnchor;
    if (step === STEPS.HOLD && targetFruit) {
      anchor = projectBubbleAnchor(targetFruit);
      if (anchor) {
        cachedTipAnchor = anchor;
      }
    }

    if (step === STEPS.HOLD && fingerEl && anchor) {
      if (SHOW_SPOTLIGHT_MASK) {
        placeCircleEl(overlayEl, anchor, anchor.radius * 2.08);
      }
      if (SHOW_HIGHLIGHT_RING) {
        placeCircleEl(ringEl, anchor, anchor.radius * 2.22);
      }
      updateFingerPosition(anchor);
    }

    syncTipPosition();
  }

  function teardownDom() {
    clearTimers();
    setTip("");
    rootEl?.remove();
    rootEl = null;
    overlayEl = null;
    fingerEl = null;
    ringEl = null;
    tipEl = null;
  }

  function cancel() {
    step = STEPS.DONE;
    active = false;
    targetFruit = null;
    cachedTipAnchor = null;
    teardownDom();
  }

  function finish() {
    step = STEPS.DONE;
    active = false;
    targetFruit = null;
    cachedTipAnchor = null;
    persistSeen();
    teardownDom();
  }

  function enterStep(nextStep, { remainingMoves = pendingRemainingMoves } = {}) {
    step = nextStep;
    pendingRemainingMoves = remainingMoves;
    clearTimers();

    rootEl?.classList.toggle("is-hold", nextStep === STEPS.HOLD);
    rootEl?.classList.toggle("is-goal", nextStep === STEPS.GOAL);

    if (nextStep === STEPS.HOLD) {
      if (SHOW_SPOTLIGHT_MASK) {
        overlayEl?.classList.remove("is-hidden");
      }
      fingerEl?.classList.remove("is-hidden");
      if (SHOW_HIGHLIGHT_RING) {
        ringEl?.classList.remove("is-hidden");
      }
      setTip("按住捏碎这个泡泡");
      updatePositions();
      return;
    }

    if (nextStep === STEPS.GOAL) {
      if (SHOW_SPOTLIGHT_MASK) {
        overlayEl?.classList.add("is-hidden");
      }
      fingerEl?.classList.add("is-hidden");
      if (SHOW_HIGHLIGHT_RING) {
        ringEl?.classList.add("is-hidden");
      }
      setTip("泡泡破裂后会将四周染色。");
      stepTimer = window.setTimeout(() => {
        void swapTip("棋盘泡泡同色后胜利。").then(() => {
          stepTimer = window.setTimeout(() => finish(), 2200);
        });
      }, 1600);
      return;
    }
  }

  function findCenterFruit(fruits, gridSize = 3) {
    const centerRow = Math.floor(gridSize / 2);
    const centerCol = Math.floor(gridSize / 2);
    return fruits.find((fruit) => (
      fruit.active
      && !fruit.sliced
      && fruit.gridRow === centerRow
      && fruit.gridCol === centerCol
    )) ?? null;
  }

  function start({ fruits, gridSize = 3, remainingMoves = 3 } = {}) {
    if (readSeen()) return false;

    targetFruit = findCenterFruit(fruits, gridSize);
    if (!targetFruit) return false;

    pendingRemainingMoves = remainingMoves;
    ensureRoot();
    active = true;
    enterStep(STEPS.HOLD, { remainingMoves });
    return true;
  }

  function stop() {
    cancel();
  }

  function isActive() {
    return active && step !== STEPS.DONE;
  }

  function isPressAllowed(fruit) {
    if (!isActive() || step !== STEPS.HOLD) return true;
    return fruit === targetFruit;
  }

  function onWrongPress() {
    if (step !== STEPS.HOLD) return;
    setTip("先捏中间的泡泡");
    if (SHOW_HIGHLIGHT_RING) {
      ringEl?.classList.add("is-nudge");
      window.setTimeout(() => ringEl?.classList.remove("is-nudge"), 420);
    } else {
      fingerEl?.classList.add("is-nudge");
      window.setTimeout(() => fingerEl?.classList.remove("is-nudge"), 420);
    }
    if (wrongPressTimer) window.clearTimeout(wrongPressTimer);
    wrongPressTimer = window.setTimeout(() => {
      if (step === STEPS.HOLD) setTip("按住捏碎这个泡泡");
      wrongPressTimer = 0;
    }, 1200);
  }

  function onPop(fruit, { remainingMoves } = {}) {
    if (!isActive() || step !== STEPS.HOLD || fruit !== targetFruit) return;
    enterStep(STEPS.GOAL, { remainingMoves });
  }

  function update() {
    updatePositions();
  }

  return {
    shouldRun,
    start,
    stop,
    cancel,
    isActive,
    isPressAllowed,
    onWrongPress,
    onPop,
    update,
    readSeen,
  };
}