import * as THREE from "three/webgpu";

const STORAGE_KEY = "fruit_arrow_tutorial_seen_v1";
const FINGER_OFFSET_X = 14;
const FINGER_OFFSET_Y = -26;
const HOLD_TIP = "戳破箭头泡泡时，\n会将对应方向全部染色！";
const WRONG_TIP = "先捏箭头泡泡";

export function isFirstMechanismLevel(levels, levelIndex) {
  const level = levels?.[levelIndex];
  if (!Array.isArray(level?.mechanisms) || level.mechanisms.length === 0) return false;
  for (let i = 0; i < levelIndex; i += 1) {
    if (levels[i]?.mechanisms?.length) return true;
  }
  return true;
}

export function createArrowMechanismTutorialController({
  phoneFrameEl,
  getCamera,
  getRenderer,
  getLevels = () => [],
} = {}) {
  let active = false;
  let targetFruit = null;
  let rootEl = null;
  let fingerEl = null;
  let tipEl = null;
  let wrongPressTimer = 0;
  let cachedFingerAnchor = null;
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
    return !readSeen() && isFirstMechanismLevel(getLevels(), levelIndex);
  }

  function clearWrongPressTimer() {
    if (!wrongPressTimer) return;
    window.clearTimeout(wrongPressTimer);
    wrongPressTimer = 0;
  }

  function ensureRoot() {
    if (rootEl) return;

    rootEl = document.createElement("div");
    rootEl.id = "arrow-mechanism-tutorial";
    rootEl.className = "level1-tutorial";
    rootEl.setAttribute("aria-hidden", "true");

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
    tipEl.className = "level1-tutorial-tip is-centered";

    rootEl.append(fingerEl, tipEl);
    phoneFrameEl?.appendChild(rootEl);
  }

  function setTip(text) {
    if (!tipEl) return;
    tipEl.classList.add("is-centered");
    tipEl.classList.remove("is-below-finger");
    tipEl.style.left = "";
    tipEl.style.top = "";
    tipEl.textContent = text;
    tipEl.classList.toggle("show", Boolean(text));
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

    return { x: center.x, y: center.y, radius };
  }

  function getFingerTop(anchor) {
    return anchor.y + anchor.radius * 0.92 + FINGER_OFFSET_Y;
  }

  function updateFingerPosition() {
    if (!fingerEl || !cachedFingerAnchor) return;
    fingerEl.style.left = `${cachedFingerAnchor.x + FINGER_OFFSET_X}px`;
    fingerEl.style.top = `${getFingerTop(cachedFingerAnchor)}px`;
  }

  function updatePositions() {
    if (!active || !targetFruit) return;

    const anchor = projectBubbleAnchor(targetFruit);
    if (anchor) {
      cachedFingerAnchor = anchor;
    }
    updateFingerPosition();
  }

  function teardownDom() {
    clearWrongPressTimer();
    setTip("");
    rootEl?.remove();
    rootEl = null;
    fingerEl = null;
    tipEl = null;
  }

  function cancel() {
    active = false;
    targetFruit = null;
    cachedFingerAnchor = null;
    teardownDom();
  }

  function finish() {
    active = false;
    targetFruit = null;
    cachedFingerAnchor = null;
    persistSeen();
    teardownDom();
  }

  function findArrowFruit(fruits, gridSize = 4) {
    let best = null;
    let bestIndex = Infinity;

    for (const fruit of fruits) {
      if (!fruit.active || fruit.sliced || !fruit.mechanismDirection) continue;
      const index = fruit.gridRow * gridSize + fruit.gridCol;
      if (index < bestIndex) {
        bestIndex = index;
        best = fruit;
      }
    }

    return best;
  }

  function start({ fruits, gridSize = 4 } = {}) {
    if (readSeen()) return false;

    targetFruit = findArrowFruit(fruits, gridSize);
    if (!targetFruit) return false;

    ensureRoot();
    active = true;
    fingerEl?.classList.remove("is-hidden");
    setTip(HOLD_TIP);
    updatePositions();
    return true;
  }

  function isActive() {
    return active;
  }

  function isPressAllowed(fruit) {
    if (!active) return true;
    return fruit === targetFruit;
  }

  function onWrongPress() {
    if (!active) return;
    setTip(WRONG_TIP);
    fingerEl?.classList.add("is-nudge");
    window.setTimeout(() => fingerEl?.classList.remove("is-nudge"), 420);
    clearWrongPressTimer();
    wrongPressTimer = window.setTimeout(() => {
      if (active) setTip(HOLD_TIP);
      wrongPressTimer = 0;
    }, 1200);
  }

  function onPop(fruit) {
    if (!active || fruit !== targetFruit) return;
    finish();
  }

  return {
    shouldRun,
    start,
    cancel,
    isActive,
    isPressAllowed,
    onWrongPress,
    onPop,
    update: updatePositions,
    readSeen,
  };
}