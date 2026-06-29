import {
  applyDomI18n,
  mountLocaleToggle,
  setDocumentLang,
  t,
} from "./i18n/dev-locale.js";
import * as THREE from "three";
import { WebGPURenderer, MeshPhysicalNodeMaterial } from "three/webgpu";
import {
  normalLocal,
  positionLocal,
  time,
  uniform,
} from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildBubblePressNodes } from "./materials/bubble-press-nodes.js";
import { applyBubbleSceneEnvironment } from "./content/bubble-environment.js";
import { createMechanismArrow } from "./entities/mechanism-arrow-visual.js";

const compatEl = document.getElementById("compat");
const swatches = Array.from(document.querySelectorAll(".swatch"));
const controlsPanel = document.getElementById("controls");
const backBtn = document.getElementById("back-btn");
const syncBtn = document.getElementById("sync-btn");
const popBtn = document.getElementById("pop-btn");
const popProgressInput = document.getElementById("p-pop-progress");
const popProgressValue = document.querySelector('[data-value-for="p-pop-progress"]');
const tuningStorageKey = "bubble_tuning_v1";
const debugBuildTag = "press-pbr-2026-06-26";
const bubbleBaseRadius = 1.2;

function refreshBubbleDebugLocale() {
  applyDomI18n(document);
  setDocumentLang();
  if (compatEl && compatEl.dataset.userMessage !== "1") {
    compatEl.textContent = t("bubble.compat.version", { tag: debugBuildTag });
  }
}

const localeMount = document.getElementById("bubble-debug-locale");
mountLocaleToggle(localeMount, {
  onChange: () => {
    refreshBubbleDebugLocale();
  },
});
refreshBubbleDebugLocale();

const defaults = {
  transmission: 0.93,
  roughness: 0.1,
  clearcoat: 0.42,
  wobble: 0.022,
  flow: 1.15,
  dye: 1.12,
  edge: 0.3,
  iri: 0.75,
  springTension: 0.12,
  springDamping: 0.84,
  lightKey: 1.25,
  lightAmbient: 0.62,
  toggleDye: true,
  toggleEdge: true,
  toggleIri: true,
  toggleBomb: false,
  toggleMechanismArrow: true,
  mechanismDirection: "right",
  pressFillRate: 2.86,
  pressSpringMax: 0.55,
  pressContactStrength: 0.72,
  pressCompress: 0.72,
  pressExpand: 0.34,
  centerDentDepth: 0.42,
  centerDentRadius: 0.72,
  centerDentPower: 2.35,
  centerDentNormal: 0.85,
  centerDentRoughness: 0.18,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef6ff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.3, 5.5);

const renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2.1;
controls.maxDistance = 12;
controls.target.set(0, 0.2, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, defaults.lightAmbient);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, defaults.lightKey);
keyLight.position.set(4, 7, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8ce7ff, 0.82);
rimLight.position.set(-6, 4, -5);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xff9ec8, 0.44);
fillLight.position.set(2, -4, 3);
scene.add(fillLight);

const bubbleGeometry = new THREE.SphereGeometry(bubbleBaseRadius, 120, 120);

let springVal = 0;
let springVel = 0;
let tension = defaults.springTension;
let damping = defaults.springDamping;
let bombModeEnabled = defaults.toggleBomb;
let mechanismArrowEnabled = defaults.toggleMechanismArrow;
let mechanismDirection = defaults.mechanismDirection;
let mechanismArrowGroup = null;
let isPressing = false;
let pressAmount = 0;
let pressFillRate = defaults.pressFillRate;
let pressSpringMax = defaults.pressSpringMax;
let pressContactStrength = defaults.pressContactStrength;
let pressPreviewAmount = 0;
let pressPreviewEnabled = false;
let pressAwaitRelease = false;
let pressDentStrength = 0;
let releaseBounceRatio = 0;
let activePointerId = null;
let lastPressDirX = 0;
let lastPressDirY = 0;
let lastPressDirZ = 1;
const contactDir = new THREE.Vector3(0, 0, 1);
const pressHitLocal = new THREE.Vector3(0, 0, 0);
let activeColorIndex = 0;
const clock = new THREE.Clock();

const springUniform = uniform(0);
const tintUniform = uniform(new THREE.Color(0xff1f4b));
const accentUniform = uniform(new THREE.Color(0xffb3ca));
const flowSpeedUniform = uniform(defaults.flow);
const wobbleAmplitudeUniform = uniform(defaults.wobble);
const dyeContrastUniform = uniform(defaults.dye);
const edgeGlowUniform = uniform(defaults.edge);
const crackGlowUniform = uniform(0.0);
const contactDirUniform = uniform(new THREE.Vector3(0, 0, 1));
const pressDentStrengthUniform = uniform(0);
const pressCompressAmountUniform = uniform(defaults.pressCompress);
const pressExpandAmountUniform = uniform(defaults.pressExpand);
const centerDentDepthUniform = uniform(defaults.centerDentDepth);
const centerDentRadiusUniform = uniform(defaults.centerDentRadius);
const centerDentPowerUniform = uniform(defaults.centerDentPower);
const centerDentNormalUniform = uniform(defaults.centerDentNormal);
const centerDentRoughnessUniform = uniform(defaults.centerDentRoughness);
const pressHitLocalUniform = uniform(new THREE.Vector3(0, 0, 0));
const roughnessBaseUniform = uniform(defaults.roughness);
const iridescenceUniform = uniform(defaults.iri);
const dyeEnabledUniform = uniform(1.0);
const edgeEnabledUniform = uniform(1.0);
const iridescenceEnabledUniform = uniform(1.0);
const iridescenceBaseUniform = uniform(90.0);
const iridescenceSpanUniform = uniform(520.0);

const material = new MeshPhysicalNodeMaterial({
  transmission: defaults.transmission,
  thickness: 1.35,
  roughness: defaults.roughness,
  metalness: 0.0,
  clearcoat: defaults.clearcoat,
  clearcoatRoughness: 0.16,
  ior: 1.2,
  envMapIntensity: 1.05,
  transparent: true,
  opacity: 0.95,
});

const flow = time.mul(flowSpeedUniform);
const rippleA = positionLocal.x.mul(2.9).add(flow).sin();
const rippleB = positionLocal.y.mul(3.2).add(flow.mul(1.18)).cos();
const rippleC = positionLocal.z.mul(2.5).add(flow.mul(0.86)).sin();
const wobble = rippleA.add(rippleB).add(rippleC).mul(wobbleAmplitudeUniform);

const dyeA = positionLocal.x.mul(3.6).add(flow.mul(0.66)).sin();
const dyeB = positionLocal.y.mul(4.1).add(flow.mul(0.93)).cos();
const dyeC = positionLocal.z.mul(3.1).add(flow.mul(0.53)).sin();
const dyeMix = dyeA.add(dyeB).add(dyeC).mul(0.34).add(0.5).clamp(0.0, 1.0);

const pressNodes = buildBubblePressNodes({
  springUniform,
  contactDirUniform,
  pressDentStrengthUniform,
  pressHitLocalUniform,
  pressCompressAmountUniform,
  pressExpandAmountUniform,
  centerDentDepthUniform,
  centerDentRadiusUniform,
  centerDentPowerUniform,
  centerDentNormalUniform,
  centerDentRoughnessUniform,
  roughnessBaseUniform,
  wobble,
});

material.positionNode = pressNodes.positionNode;
material.normalNode = pressNodes.normalNode;
material.roughnessNode = pressNodes.roughnessNode;

const dyeBlend = dyeMix.pow(dyeContrastUniform);
const dyeColor = tintUniform.mix(accentUniform, dyeBlend);
material.colorNode = tintUniform.mix(dyeColor, dyeEnabledUniform);
material.emissiveNode = tintUniform.mul(
  pressNodes.fresnelEdge.mul(edgeGlowUniform.add(crackGlowUniform)).mul(edgeEnabledUniform)
);

material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
material.iridescenceIORNode = uniform(1.3);
material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

const bubble = new THREE.Mesh(bubbleGeometry, material);
scene.add(bubble);

const bombGroup = new THREE.Group();
const bombCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.72, 44, 44),
  new THREE.MeshStandardMaterial({
    color: 0x252a33,
    roughness: 0.38,
    metalness: 0.14,
  })
);
const bombCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.18, 0.2, 22),
  new THREE.MeshStandardMaterial({
    color: 0x303844,
    roughness: 0.32,
    metalness: 0.2,
  })
);
bombCap.position.set(0, 0.67, 0);

const bombFuse = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.05, 0.38, 14),
  new THREE.MeshStandardMaterial({
    color: 0xe7b96e,
    roughness: 0.9,
    metalness: 0.02,
  })
);
bombFuse.position.set(0.04, 0.89, 0);
bombFuse.rotation.z = -0.35;

const bombSpark = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 16, 16),
  new THREE.MeshBasicMaterial({
    color: 0xff7b39,
    transparent: true,
    opacity: 0.9,
  })
);
bombSpark.position.set(-0.08, 1.07, 0);

const bombRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.05, 18, 72),
  new THREE.MeshBasicMaterial({
    color: 0xff6a3a,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
);
bombRing.rotation.x = Math.PI * 0.5;

bombGroup.add(bombCore);
bombGroup.add(bombCap);
bombGroup.add(bombFuse);
bombGroup.add(bombSpark);
bombGroup.add(bombRing);
bombGroup.visible = false;
bubble.add(bombGroup);

function mountMechanismArrow(direction) {
  if (mechanismArrowGroup) {
    bubble.remove(mechanismArrowGroup);
    mechanismArrowGroup = null;
  }
  mechanismArrowGroup = createMechanismArrow(direction, bubbleBaseRadius);
  mechanismArrowGroup.visible = mechanismArrowEnabled;
  bubble.add(mechanismArrowGroup);
}

mountMechanismArrow(mechanismDirection);

const BubbleState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

let bubbleState = BubbleState.IDLE;
let stateElapsed = 0;
let previewModeEnabled = false;
let preBurstStartScale = 1;
let burstSpringHold = 0;

const preBurstDuration = 0.09;
const burstDuration = 0.18;
const dissipateDuration = 1.6;
const resetDelay = 0.2;
const preBurstScaleMax = 1.04;
const burstBubbleFadeInDuration = 0.16;
const previewDuration = preBurstDuration + burstDuration + dissipateDuration;

const burstBubbleCount = 10;
const minBurstBubbleCount = 7;
const maxBurstBubbleCount = 10;
let activeBurstBubbleCount = 8;
const burstBubbleVelocities = [];
const burstBubbleStartPositions = [];
const burstBubbleStartVelocities = [];
const burstBubbleLife = new Array(burstBubbleCount).fill(0);
const burstBubbleLifeMax = new Array(burstBubbleCount).fill(1);
const burstBubbleBaseScale = new Array(burstBubbleCount).fill(0.08);
const burstBubbleMeshes = [];
const burstPoints = { visible: false };
const bubbleRadius = 1.2;
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);

for (let i = 0; i < burstBubbleCount; i += 1) {
  const burstBubbleMaterial = material.clone();
  burstBubbleMaterial.transparent = true;
  burstBubbleMaterial.opacity = 0;
  burstBubbleMaterial.depthWrite = false;
  burstBubbleMaterial.side = THREE.DoubleSide;

  const burstBubbleMesh = new THREE.Mesh(burstBubbleGeometry, burstBubbleMaterial);
  burstBubbleMesh.visible = false;
  scene.add(burstBubbleMesh);
  burstBubbleMeshes.push(burstBubbleMesh);
  burstBubbleVelocities.push(new THREE.Vector3());
  burstBubbleStartPositions.push(new THREE.Vector3());
  burstBubbleStartVelocities.push(new THREE.Vector3());
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const palette = [0xff1f4b, 0xff9800, 0x12cf5b, 0x1b8fff];

function setBubbleColor(hexValue) {
  const base = new THREE.Color(hexValue);
  const accent = base.clone().offsetHSL(0, -0.12, 0.26);
  tintUniform.value.copy(base);
  accentUniform.value.copy(accent);
}

function applyPaletteIndex(index) {
  activeColorIndex = ((index % palette.length) + palette.length) % palette.length;
  const color = palette[activeColorIndex];
  setBubbleColor(color);
  swatches.forEach((btn, idx) => btn.classList.toggle("is-active", idx === activeColorIndex));
}

swatches.forEach((button, index) => {
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    applyPaletteIndex(index);
  });
});

controlsPanel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

popBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  triggerBubblePop();
});

if (popProgressInput) {
  popProgressInput.addEventListener("input", () => {
    const t = THREE.MathUtils.clamp(Number(popProgressInput.value), 0, 1);
    pressPreviewEnabled = false;
    pressPreviewAmount = 0;
    setControlValue("p-press-preview", 0);
    previewModeEnabled = true;
    if (bubbleState === BubbleState.IDLE) {
      resetBurstArtifacts();
      initBurstParticles();
    }
    applyPreviewFrame(t);
    setPopProgressUI(t);
  });
}

syncBtn.addEventListener("click", () => {
  const payload = {
    transmission: material.transmission,
    roughness: material.roughness,
    clearcoat: material.clearcoat,
    wobble: wobbleAmplitudeUniform.value,
    flow: flowSpeedUniform.value,
    dye: dyeContrastUniform.value,
    edge: edgeGlowUniform.value,
    iri: iridescenceUniform.value,
    springTension: tension,
    springDamping: damping,
    lightKey: keyLight.intensity,
    lightAmbient: ambientLight.intensity,
    toggleDye: dyeEnabledUniform.value > 0.5,
    toggleEdge: edgeEnabledUniform.value > 0.5,
    toggleIri: iridescenceEnabledUniform.value > 0.5,
    pressFillRate,
    pressSpringMax,
    pressContactStrength,
    pressCompress: pressCompressAmountUniform.value,
    pressExpand: pressExpandAmountUniform.value,
    centerDentDepth: centerDentDepthUniform.value,
    centerDentRadius: centerDentRadiusUniform.value,
    centerDentPower: centerDentPowerUniform.value,
    centerDentNormal: centerDentNormalUniform.value,
    centerDentRoughness: centerDentRoughnessUniform.value,
  };

  try {
    window.localStorage.setItem(tuningStorageKey, JSON.stringify(payload));
    compatEl.dataset.userMessage = "1";
    compatEl.textContent = t("bubble.compat.syncOk");
  } catch (_err) {
    compatEl.dataset.userMessage = "1";
    compatEl.textContent = t("bubble.compat.syncFail");
  }
});

function setControlValue(id, value) {
  const input = document.getElementById(id);
  const valueView = document.querySelector(`[data-value-for="${id}"]`);
  if (!input || !valueView) return;
  input.value = String(value);
  valueView.textContent = Number(value).toFixed(input.step && Number(input.step) < 0.01 ? 3 : 2);
}

function bindControl(id, onUpdate) {
  const input = document.getElementById(id);
  const valueView = document.querySelector(`[data-value-for="${id}"]`);
  if (!input || !valueView) return;

  const handle = () => {
    const value = Number(input.value);
    valueView.textContent = value.toFixed(input.step && Number(input.step) < 0.01 ? 3 : 2);
    onUpdate(value);
  };

  input.addEventListener("input", handle);
  handle();
}

function setToggleValue(id, checked) {
  const input = document.getElementById(id);
  if (!input) return;
  input.checked = checked;
}

function bindToggle(id, onUpdate) {
  const input = document.getElementById(id);
  if (!input) return;

  const handle = () => onUpdate(input.checked);
  input.addEventListener("change", handle);
  handle();
}

bindControl("p-transmission", (value) => {
  material.transmission = value;
});
bindControl("p-roughness", (value) => {
  material.roughness = value;
  roughnessBaseUniform.value = value;
});
bindControl("p-clearcoat", (value) => {
  material.clearcoat = value;
});
bindControl("p-wobble", (value) => {
  wobbleAmplitudeUniform.value = value;
});
bindControl("p-flow", (value) => {
  flowSpeedUniform.value = value;
});
bindControl("p-dye", (value) => {
  dyeContrastUniform.value = value;
});
bindControl("p-edge", (value) => {
  edgeGlowUniform.value = value;
});
bindControl("p-iri", (value) => {
  iridescenceUniform.value = value;
});
bindControl("p-spring-tension", (value) => {
  tension = value;
});
bindControl("p-spring-damping", (value) => {
  damping = value;
});
bindControl("p-light-key", (value) => {
  keyLight.intensity = value;
});
bindControl("p-light-ambient", (value) => {
  ambientLight.intensity = value;
});
bindControl("p-press-preview", (value) => {
  pressPreviewAmount = THREE.MathUtils.clamp(value, 0, 1);
  pressPreviewEnabled = pressPreviewAmount > 0.001;
  if (pressPreviewEnabled) {
    previewModeEnabled = false;
    applyPressPreview(pressPreviewAmount);
  } else if (!isPressing) {
    releasePress();
    springVal = 0;
    springVel = 0;
    springUniform.value = 0;
  }
});
bindControl("p-press-fill-rate", (value) => {
  pressFillRate = value;
});
bindControl("p-press-spring-max", (value) => {
  pressSpringMax = value;
});
bindControl("p-press-contact-strength", (value) => {
  pressContactStrength = value;
});
bindControl("p-press-compress", (value) => {
  pressCompressAmountUniform.value = value;
});
bindControl("p-press-expand", (value) => {
  pressExpandAmountUniform.value = value;
});
bindControl("p-center-dent-depth", (value) => {
  centerDentDepthUniform.value = value;
});
bindControl("p-center-dent-radius", (value) => {
  centerDentRadiusUniform.value = value;
});
bindControl("p-center-dent-power", (value) => {
  centerDentPowerUniform.value = value;
});
bindControl("p-center-dent-normal", (value) => {
  centerDentNormalUniform.value = value;
});
bindControl("p-center-dent-roughness", (value) => {
  centerDentRoughnessUniform.value = value;
});

bindToggle("t-dye", (checked) => {
  dyeEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-edge", (checked) => {
  edgeEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-iri", (checked) => {
  iridescenceEnabledUniform.value = checked ? 1 : 0;
});
bindToggle("t-bomb", (checked) => {
  bombModeEnabled = checked;
  updateBombVisualState(clock.elapsedTime);
});
bindToggle("t-mechanism-arrow", (checked) => {
  mechanismArrowEnabled = checked;
  updateMechanismArrowVisual();
});
for (const btn of document.querySelectorAll("[data-mechanism-direction]")) {
  btn.addEventListener("click", () => {
    const direction = btn.dataset.mechanismDirection;
    if (!direction || direction === mechanismDirection) return;
    mechanismDirection = direction;
    mountMechanismArrow(mechanismDirection);
    syncMechanismDirectionButtons();
    updateMechanismArrowVisual();
  });
}

document.getElementById("reset-btn").addEventListener("click", () => {
  setControlValue("p-transmission", defaults.transmission);
  setControlValue("p-roughness", defaults.roughness);
  setControlValue("p-clearcoat", defaults.clearcoat);
  setControlValue("p-wobble", defaults.wobble);
  setControlValue("p-flow", defaults.flow);
  setControlValue("p-dye", defaults.dye);
  setControlValue("p-edge", defaults.edge);
  setControlValue("p-iri", defaults.iri);
  setControlValue("p-spring-tension", defaults.springTension);
  setControlValue("p-spring-damping", defaults.springDamping);
  setControlValue("p-light-key", defaults.lightKey);
  setControlValue("p-light-ambient", defaults.lightAmbient);
  setControlValue("p-press-preview", 0);
  setControlValue("p-press-fill-rate", defaults.pressFillRate);
  setControlValue("p-press-spring-max", defaults.pressSpringMax);
  setControlValue("p-press-contact-strength", defaults.pressContactStrength);
  setControlValue("p-press-compress", defaults.pressCompress);
  setControlValue("p-press-expand", defaults.pressExpand);
  setControlValue("p-center-dent-depth", defaults.centerDentDepth);
  setControlValue("p-center-dent-radius", defaults.centerDentRadius);
  setControlValue("p-center-dent-power", defaults.centerDentPower);
  setControlValue("p-center-dent-normal", defaults.centerDentNormal);
  setControlValue("p-center-dent-roughness", defaults.centerDentRoughness);
  setToggleValue("t-dye", defaults.toggleDye);
  setToggleValue("t-edge", defaults.toggleEdge);
  setToggleValue("t-iri", defaults.toggleIri);
  setToggleValue("t-bomb", defaults.toggleBomb);
  setToggleValue("t-mechanism-arrow", defaults.toggleMechanismArrow);
  mechanismDirection = defaults.mechanismDirection;
  mountMechanismArrow(mechanismDirection);
  syncMechanismDirectionButtons();

  material.transmission = defaults.transmission;
  material.roughness = defaults.roughness;
  material.clearcoat = defaults.clearcoat;
  material.opacity = 0.95;
  wobbleAmplitudeUniform.value = defaults.wobble;
  flowSpeedUniform.value = defaults.flow;
  dyeContrastUniform.value = defaults.dye;
  edgeGlowUniform.value = defaults.edge;
  iridescenceUniform.value = defaults.iri;
  tension = defaults.springTension;
  damping = defaults.springDamping;
  keyLight.intensity = defaults.lightKey;
  ambientLight.intensity = defaults.lightAmbient;
  dyeEnabledUniform.value = defaults.toggleDye ? 1 : 0;
  edgeEnabledUniform.value = defaults.toggleEdge ? 1 : 0;
  iridescenceEnabledUniform.value = defaults.toggleIri ? 1 : 0;
  bombModeEnabled = defaults.toggleBomb;
  mechanismArrowEnabled = defaults.toggleMechanismArrow;
  pressFillRate = defaults.pressFillRate;
  pressSpringMax = defaults.pressSpringMax;
  pressContactStrength = defaults.pressContactStrength;
  pressPreviewAmount = 0;
  pressPreviewEnabled = false;
  pressCompressAmountUniform.value = defaults.pressCompress;
  pressExpandAmountUniform.value = defaults.pressExpand;
  centerDentDepthUniform.value = defaults.centerDentDepth;
  centerDentRadiusUniform.value = defaults.centerDentRadius;
  centerDentPowerUniform.value = defaults.centerDentPower;
  centerDentNormalUniform.value = defaults.centerDentNormal;
  centerDentRoughnessUniform.value = defaults.centerDentRoughness;
  roughnessBaseUniform.value = defaults.roughness;
  releasePress();
  pressAwaitRelease = false;
  activePointerId = null;
  controls.enabled = true;
  previewModeEnabled = false;
  bubbleState = BubbleState.IDLE;
  stateElapsed = 0;
  crackGlowUniform.value = 0;
  resetBurstArtifacts();
  bubble.visible = true;
  bubble.scale.setScalar(1);
  material.opacity = 0.95;
  setPopProgressUI(0);
  updateBombVisualState(clock.elapsedTime);
  updateMechanismArrowVisual();
});

function syncMechanismDirectionButtons() {
  for (const btn of document.querySelectorAll("[data-mechanism-direction]")) {
    btn.classList.toggle("active", btn.dataset.mechanismDirection === mechanismDirection);
  }
}

function updateMechanismArrowVisual() {
  if (!mechanismArrowGroup) return;
  const bubbleAlive = bubble.visible && bubbleState !== BubbleState.DISSIPATE;
  const visible = mechanismArrowEnabled && bubbleAlive;
  mechanismArrowGroup.visible = visible;
}

function isBubblePressBlockedTarget(target) {
  if (!target) return true;
  return Boolean(
    target.closest("#controls")
    || target.closest("#palette")
    || target.closest("button")
  );
}

function pickBubbleHit(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(bubble);
}

function syncPressHitLocalFromPointer(clientX, clientY) {
  const hits = pickBubbleHit(clientX, clientY);
  if (!hits.length) return;
  pressHitLocal.copy(hits[0].point);
  bubble.worldToLocal(pressHitLocal);
  pressHitLocalUniform.value.copy(pressHitLocal);
}

function syncPressHitFromCameraCenter() {
  pointer.set(0, 0);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(bubble);
  if (hits.length) {
    pressHitLocal.copy(hits[0].point);
    bubble.worldToLocal(pressHitLocal);
  } else {
    const dir = resolvePressDirFromCamera();
    pressHitLocal.set(-dir.dirX * bubbleBaseRadius, -dir.dirY * bubbleBaseRadius, -dir.dirZ * bubbleBaseRadius);
  }
  pressHitLocalUniform.value.copy(pressHitLocal);
}

function resolvePressDirFromCamera() {
  const dx = camera.position.x - bubble.position.x;
  const dy = camera.position.y - bubble.position.y;
  const dz = camera.position.z - bubble.position.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return { dirX: 0, dirY: 0, dirZ: 1 };
  return { dirX: dx / len, dirY: dy / len, dirZ: dz / len };
}

function releasePress({ forPop = false } = {}) {
  isPressing = false;
  pressAmount = 0;
  if (!forPop) {
    const releaseRatio = THREE.MathUtils.clamp(
      springVal / Math.max(pressSpringMax, 0.001),
      0,
      1
    );
    releaseBounceRatio = releaseRatio;
    if (releaseRatio > 0.02) {
      springVel = -springVal * (0.85 + releaseRatio * 1.35);
    }
  } else {
    releaseBounceRatio = 0;
  }
  crackGlowUniform.value = 0;
}

function applyPressVisual(amount, dirX, dirY, dirZ) {
  const clamped = THREE.MathUtils.clamp(amount, 0, 1);
  contactDir.set(dirX, dirY, dirZ).normalize();
  pressDentStrength = clamped * pressContactStrength;
  springVal = clamped * pressSpringMax;
  springVel = 0;
  springUniform.value = springVal;
  pressDentStrengthUniform.value = pressDentStrength;
  contactDirUniform.value.copy(contactDir);
  crackGlowUniform.value = 0.05 + clamped * 0.14;
}

function applyPressPressure(dt, dirX, dirY, dirZ) {
  pressAmount = Math.min(1, pressAmount + dt * pressFillRate);
  applyPressVisual(pressAmount, dirX, dirY, dirZ);
  return pressAmount >= 1;
}

function applyPressPreview(amount) {
  syncPressHitFromCameraCenter();
  const dir = resolvePressDirFromCamera();
  applyPressVisual(amount, dir.dirX, dir.dirY, dir.dirZ);
}

function beginBubblePress(event) {
  if (bubbleState !== BubbleState.IDLE || previewModeEnabled || pressAwaitRelease) return;
  if (isBubblePressBlockedTarget(event.target)) return;

  const hits = pickBubbleHit(event.clientX, event.clientY);
  if (!hits.length) return;

  event.preventDefault();
  pressPreviewEnabled = false;
  pressPreviewAmount = 0;
  setControlValue("p-press-preview", 0);
  activePointerId = event.pointerId;
  isPressing = true;
  pressAmount = 0;
  controls.enabled = false;
  syncPressHitLocalFromPointer(event.clientX, event.clientY);
  const dir = resolvePressDirFromCamera();
  lastPressDirX = dir.dirX;
  lastPressDirY = dir.dirY;
  lastPressDirZ = dir.dirZ;
}

function updateBubblePressPointer(event) {
  if (!isPressing || event.pointerId !== activePointerId) return;
  syncPressHitLocalFromPointer(event.clientX, event.clientY);
  const dir = resolvePressDirFromCamera();
  lastPressDirX = dir.dirX;
  lastPressDirY = dir.dirY;
  lastPressDirZ = dir.dirZ;
}

function endBubblePress(event) {
  if (activePointerId !== null && event.pointerId !== activePointerId) return;
  if (isPressing) releasePress();
  pressAwaitRelease = false;
  activePointerId = null;
  controls.enabled = true;
}

window.addEventListener("pointerdown", beginBubblePress);
window.addEventListener("pointermove", updateBubblePressPointer);
window.addEventListener("pointerup", endBubblePress);
window.addEventListener("pointercancel", endBubblePress);

function triggerBubblePop() {
  if (bubbleState !== BubbleState.IDLE) return;
  previewModeEnabled = false;
  releasePress();
  stateElapsed = 0;
  bubbleState = BubbleState.PRE_BURST;
  crackGlowUniform.value = 0.12;
  pressDentStrength = 0;
  pressDentStrengthUniform.value = 0;
  preBurstStartScale = bubble.scale.x;
  burstSpringHold = Math.max(springVal, pressSpringMax);
  springVel = 0;
  bubble.visible = true;
  material.opacity = 0.95;
}

function updateBombVisualState(elapsedTime) {
  const bubbleAlive = bubble.visible && bubbleState !== BubbleState.DISSIPATE;
  bombGroup.visible = bombModeEnabled && bubbleAlive;
  if (!bombGroup.visible) return;

  const dangerBoost = bubbleState === BubbleState.PRE_BURST || bubbleState === BubbleState.BURST ? 1.0 : 0.0;
  const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * (4.8 + dangerBoost * 5.2));
  const ringPulse = 0.5 + 0.5 * Math.sin(elapsedTime * (3.2 + dangerBoost * 6.4));

  bombCore.scale.setScalar(0.98 + pulse * (0.04 + dangerBoost * 0.06));
  bombRing.material.opacity = 0.2 + ringPulse * (0.25 + dangerBoost * 0.35);
  bombRing.scale.setScalar(0.9 + ringPulse * (0.12 + dangerBoost * 0.2));

  const sparkMat = bombSpark.material;
  sparkMat.opacity = 0.35 + Math.random() * (0.35 + dangerBoost * 0.25);
  bombSpark.scale.setScalar(0.9 + Math.random() * (0.35 + dangerBoost * 0.35));

  const jitter = dangerBoost * 0.018;
  bombGroup.position.set((Math.random() * 2 - 1) * jitter, (Math.random() * 2 - 1) * jitter, 0);
}

function updatePopState(dt) {
  if (previewModeEnabled) {
    applyPreviewFrame(THREE.MathUtils.clamp(Number(popProgressInput?.value ?? 0), 0, 1));
    return;
  }

  if (bubbleState === BubbleState.IDLE) {
    bubble.visible = true;
    material.opacity = 0.95;
    if (!isPressing) bubble.scale.setScalar(1);
    return;
  }

  stateElapsed += dt;

  if (bubbleState === BubbleState.PRE_BURST) {
    const t = Math.min(stateElapsed / preBurstDuration, 1);
    const smooth = t * t * (3 - 2 * t);
    const scaleFrom = preBurstStartScale;
    const scaleTo = scaleFrom * preBurstScaleMax;
    bubble.visible = true;
    bubble.scale.setScalar(scaleFrom + (scaleTo - scaleFrom) * smooth);
    springVal = burstSpringHold;
    springUniform.value = springVal;
    crackGlowUniform.value = 0.12 * smooth;
    material.opacity = 0.95;

    if (t >= 1) {
      bubbleState = BubbleState.BURST;
      stateElapsed = 0;
      initBurstParticles();
    }
    return;
  }

  if (bubbleState === BubbleState.BURST) {
    const t = Math.min(stateElapsed / burstDuration, 1);
    const burstScaleBase = preBurstStartScale * preBurstScaleMax;
    const springFade = THREE.MathUtils.clamp((t - 0.35) / 0.35, 0, 1);
    springVal = burstSpringHold * (1 - springFade);
    springUniform.value = springVal;
    crackGlowUniform.value = (1 - t) * 0.12;
    material.opacity = Math.max(0, 0.95 * (1 - t * 1.85));
    bubble.scale.setScalar(burstScaleBase * (1 + t * 0.015));
    updateBurstParticles(dt);

    if (t > 0.5) bubble.visible = false;

    if (t >= 1) {
      springVal = 0;
      springUniform.value = 0;
      bubbleState = BubbleState.DISSIPATE;
      stateElapsed = 0;
      material.opacity = 0;
    }
    return;
  }

  if (bubbleState === BubbleState.DISSIPATE) {
    crackGlowUniform.value = 0;
    bubble.visible = false;
    updateBurstParticles(dt);

    if (stateElapsed >= dissipateDuration && !burstPoints.visible) {
      bubbleState = BubbleState.RESET;
      stateElapsed = 0;
    }
    return;
  }

  if (bubbleState === BubbleState.RESET) {
    if (stateElapsed >= resetDelay) {
      bubbleState = BubbleState.IDLE;
      stateElapsed = 0;
      crackGlowUniform.value = 0;
      bubble.visible = true;
      bubble.scale.setScalar(1);
      material.opacity = 0.95;
      resetBurstArtifacts();
    }
  }
}

function setPopProgressUI(t) {
  if (popProgressInput) popProgressInput.value = String(t);
  if (popProgressValue) popProgressValue.textContent = `${Math.round(t * 100)}%`;
}

function resetBurstArtifacts() {
  for (let i = 0; i < burstBubbleCount; i += 1) {
    burstBubbleLife[i] = 0;
    burstBubbleLifeMax[i] = 1;
    const burstBubbleMesh = burstBubbleMeshes[i];
    burstBubbleMesh.visible = false;
    burstBubbleMesh.position.set(9999, 9999, 9999);
    burstBubbleMesh.scale.setScalar(0.0001);
    burstBubbleMesh.material.opacity = 0;
  }
  burstPoints.visible = false;
}

function initBurstParticles() {
  activeBurstBubbleCount = minBurstBubbleCount + Math.floor(Math.random() * (maxBurstBubbleCount - minBurstBubbleCount + 1));

  for (let i = 0; i < burstBubbleCount; i += 1) {
    const burstBubbleMesh = burstBubbleMeshes[i];
    const burstBubbleMaterial = burstBubbleMesh.material;
    if (i >= activeBurstBubbleCount) {
      burstBubbleLife[i] = 0;
      burstBubbleLifeMax[i] = 1;
      burstBubbleMesh.visible = false;
      burstBubbleMaterial.opacity = 0;
      continue;
    }

    burstBubbleMaterial.positionNode = material.positionNode;
    burstBubbleMaterial.colorNode = material.colorNode;
    burstBubbleMaterial.emissiveNode = material.emissiveNode;
    burstBubbleMaterial.iridescenceNode = material.iridescenceNode;
    burstBubbleMaterial.iridescenceIORNode = material.iridescenceIORNode;
    burstBubbleMaterial.iridescenceThicknessNode = material.iridescenceThicknessNode;
    burstBubbleMaterial.transmission = material.transmission;
    burstBubbleMaterial.roughness = Math.min(0.26, material.roughness + 0.02);
    burstBubbleMaterial.thickness = Math.min(0.7, material.thickness * 0.5);
    burstBubbleMaterial.ior = material.ior;
    burstBubbleMaterial.clearcoat = material.clearcoat;
    burstBubbleMaterial.clearcoatRoughness = material.clearcoatRoughness;
    burstBubbleMaterial.envMapIntensity = material.envMapIntensity;

    const randomDir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const spawnDir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    const velocityDir = spawnDir.clone().lerp(randomDir, 0.22).normalize();

    const speed = 0.34 + Math.random() * 0.5;
    burstBubbleVelocities[i].copy(velocityDir).multiplyScalar(speed);
    burstBubbleStartVelocities[i].copy(burstBubbleVelocities[i]);

    const innerRadius = bubbleRadius * preBurstScaleMax * 0.9;
    const spawnRadius = innerRadius * Math.cbrt(Math.random());
    burstBubbleMesh.position.copy(bubble.position).addScaledVector(spawnDir, spawnRadius);
    burstBubbleStartPositions[i].copy(burstBubbleMesh.position);

    const startScale = 0.055 + Math.random() * 0.11;
    burstBubbleBaseScale[i] = startScale;
    burstBubbleMesh.scale.setScalar(startScale);
    burstBubbleMaterial.opacity = 0;
    burstBubbleMesh.visible = true;

    burstBubbleLife[i] = 1.05 + Math.random() * 0.75;
    burstBubbleLifeMax[i] = burstBubbleLife[i];
  }

  burstPoints.visible = true;
}

function updateBurstParticles(delta) {
  let aliveCount = 0;

  for (let i = 0; i < burstBubbleCount; i += 1) {
    if (burstBubbleLife[i] <= 0) continue;

    aliveCount += 1;
    const burstBubbleMesh = burstBubbleMeshes[i];
    burstBubbleLife[i] -= delta;

    burstBubbleVelocities[i].multiplyScalar(Math.pow(0.94, delta * 60));
    burstBubbleMesh.position.addScaledVector(burstBubbleVelocities[i], delta);

    const lifeRatio = Math.max(burstBubbleLife[i], 0) / Math.max(burstBubbleLifeMax[i], 0.0001);
    const age = Math.max(burstBubbleLifeMax[i] - burstBubbleLife[i], 0);
    const appear = Math.min(age / burstBubbleFadeInDuration, 1);
    const fade = Math.pow(lifeRatio, 0.62);
    const scaleNow = burstBubbleBaseScale[i] * (0.68 + 0.32 * fade);

    burstBubbleMesh.scale.setScalar(scaleNow);
    burstBubbleMesh.material.opacity = 0.9 * fade * appear;

    if (burstBubbleLife[i] <= 0) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
    }
  }

  if (aliveCount === 0) burstPoints.visible = false;
}

function applyPreviewFrame(progress01) {
  const tSec = THREE.MathUtils.clamp(progress01, 0, 1) * previewDuration;

  if (tSec <= preBurstDuration) {
    const p = preBurstDuration > 0 ? tSec / preBurstDuration : 1;
    const smooth = p * p * (3 - 2 * p);
    bubble.visible = true;
    bubble.scale.setScalar(1 + (preBurstScaleMax - 1) * smooth);
    material.opacity = 0.95;
    crackGlowUniform.value = 0.08 * smooth;
    burstPoints.visible = false;
    return;
  }

  const burstElapsed = tSec - preBurstDuration;
  const burstT = Math.min(burstElapsed / burstDuration, 1);
  bubble.scale.setScalar(preBurstScaleMax + 0.015 * burstT);
  material.opacity = Math.max(0, 0.95 * (1 - burstT * 1.85));
  crackGlowUniform.value = Math.max(0, 0.1 * (1 - burstT));
  bubble.visible = burstT < 0.5;

  let alive = 0;
  for (let i = 0; i < burstBubbleCount; i += 1) {
    const burstBubbleMesh = burstBubbleMeshes[i];
    if (i >= activeBurstBubbleCount) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
      continue;
    }

    const lifeMax = burstBubbleLifeMax[i];
    const lifeRemain = 1 - burstElapsed / Math.max(lifeMax, 0.0001);
    if (lifeRemain <= 0) {
      burstBubbleMesh.visible = false;
      burstBubbleMesh.material.opacity = 0;
      continue;
    }

    alive += 1;
    burstBubbleMesh.visible = true;
    const fade = Math.pow(lifeRemain, 0.62);
    const appear = Math.min(burstElapsed / burstBubbleFadeInDuration, 1);
    const previewMove = burstElapsed * 0.62;

    burstBubbleMesh.position.set(
      burstBubbleStartPositions[i].x + burstBubbleStartVelocities[i].x * previewMove,
      burstBubbleStartPositions[i].y + burstBubbleStartVelocities[i].y * previewMove,
      burstBubbleStartPositions[i].z + burstBubbleStartVelocities[i].z * previewMove
    );
    burstBubbleMesh.scale.setScalar(burstBubbleBaseScale[i] * (0.68 + 0.32 * fade));
    burstBubbleMesh.material.opacity = 0.9 * fade * appear;
  }

  burstPoints.visible = alive > 0;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function clampStored(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return THREE.MathUtils.clamp(num, min, max);
}

function triggerControlInput(id) {
  document.getElementById(id)?.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyStoredTuning() {
  try {
    const raw = window.localStorage.getItem(tuningStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const entries = [
      ["p-press-fill-rate", parsed.pressFillRate, 0.3, 4, defaults.pressFillRate],
      ["p-press-spring-max", parsed.pressSpringMax, 0.2, 1.5, defaults.pressSpringMax],
      ["p-press-contact-strength", parsed.pressContactStrength, 0, 2, defaults.pressContactStrength],
      ["p-press-compress", parsed.pressCompress, 0.2, 2.5, defaults.pressCompress],
      ["p-press-expand", parsed.pressExpand, 0, 2, defaults.pressExpand],
      ["p-center-dent-depth", parsed.centerDentDepth, 0, 2.5, defaults.centerDentDepth],
      ["p-center-dent-radius", parsed.centerDentRadius, 0.3, 2.5, defaults.centerDentRadius],
      ["p-center-dent-power", parsed.centerDentPower, 0.5, 8, defaults.centerDentPower],
      ["p-center-dent-normal", parsed.centerDentNormal, 0, 2.5, defaults.centerDentNormal],
      ["p-center-dent-roughness", parsed.centerDentRoughness, 0, 0.8, defaults.centerDentRoughness],
    ];

    for (const [id, value, min, max, fallback] of entries) {
      if (value == null) continue;
      setControlValue(id, clampStored(value, min, max, fallback));
      triggerControlInput(id);
    }
  } catch (_err) {}
}

async function bootstrap() {
  try {
    await renderer.init();
    await applyBubbleSceneEnvironment({ scene, renderer });
  } catch (error) {
    compatEl.dataset.userMessage = "1";
    compatEl.textContent = t("bubble.compat.initFail");
    throw error;
  }

  applyPaletteIndex(0);
  resetBurstArtifacts();
  setPopProgressUI(0);
  applyStoredTuning();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const elapsed = clock.elapsedTime;

    if (bubbleState === BubbleState.IDLE && !previewModeEnabled) {
      if (isPressing) {
        const burst = applyPressPressure(dt, lastPressDirX, lastPressDirY, lastPressDirZ);
        if (burst) {
          isPressing = false;
          pressAwaitRelease = true;
          activePointerId = null;
          controls.enabled = true;
          triggerBubblePop();
        }
      } else if (pressPreviewEnabled) {
        applyPressPreview(pressPreviewAmount);
      } else {
        springVel += (0 - springVal) * tension;
        const bounceDamping = THREE.MathUtils.lerp(
          damping,
          Math.min(0.92, damping + 0.07),
          releaseBounceRatio
        );
        springVel *= bounceDamping;
        springVal += springVel;
        if (springVal < 0) {
          springVal = 0;
          springVel *= -0.2;
        }
        releaseBounceRatio = Math.max(0, releaseBounceRatio - dt * 2.2);
        pressDentStrength = Math.max(0, pressDentStrength - dt * 2.8);
        const springDentCap = (springVal / Math.max(pressSpringMax, 0.001)) * pressContactStrength;
        pressDentStrength = Math.min(pressDentStrength, springDentCap);
        pressDentStrengthUniform.value = pressDentStrength;
        springUniform.value = springVal;
      }
    }

    updatePopState(dt);
    updateBombVisualState(elapsed);
    updateMechanismArrowVisual();

    controls.update();
    renderer.render(scene, camera);
  });
}

bootstrap();
