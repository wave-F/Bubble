import * as THREE from "three/webgpu";
import { LEVELS } from "./levels.js";
import { createLevelFlowController } from "./flow/level-flow.js";
import { createGridBoardSystem } from "./systems/grid-board-system.js";
import { createBubbleSpawnSystem } from "./systems/bubble-spawn-system.js";
import { createPressSystem } from "./systems/press-system.js";
import { createColorUnifySystem } from "./systems/color-unify-system.js";
import {
  applyBubbleSceneEnvironment,
  warmupBubbleRenderer,
} from "./content/bubble-environment.js";
import { createVictoryRainSystem } from "./systems/victory-rain-system.js";
import { createBurstSystem } from "./systems/burst-system.js";
import { createGameUI } from "./ui/game-ui.js";
import { createGameAudio } from "./audio/game-audio.js";
import { createLevelRuntime } from "./content/level-runtime.js";
import { clampNumber, createLevelIndexClamper, createPersistenceController } from "./game/persistence.js";
import { readGameSettings, createSettingsUiController } from "./game/settings-ui.js";
import { createRewardFlow } from "./game/reward-flow.js";
import { createHomeScreenController } from "./game/home-screen.js";
import { createSessionFlowController } from "./game/session-flow.js";
import { createLayoutViewportController } from "./game/layout-viewport.js";
import { createRoundStateController } from "./game/round-state.js";
import { createLightDebugUiController } from "./game/light-debug-ui.js";
import { createBubbleMaterial, createBubbleEntityClass } from "./entities/bubble-entity.js";
import {
  GAME_AUDIO_URLS,
  GAME_IMAGE_URLS,
  GAME_POP_SOUND_FILES,
  GAME_POP_SOUND_URLS,
  GAME_UI_AUDIO_URLS,
} from "./game/game-assets.js";
import { preloadFile, preloadImage } from "./game/resource-loader.js";
import { createLoadingScreenController } from "./ui/loading-screen.js";
import { createGameplayTipController } from "./ui/gameplay-tip.js";
const appEl = document.getElementById("app");
const phoneFrameEl = document.getElementById("phone-frame");
const gameplayRulesPanelEl = document.getElementById("gameplay-rules-panel");
const hudEl = document.getElementById("hud");
const stepsEl = document.getElementById("score");
const hudLevelEl = document.getElementById("hud-level");
const sliceStateEl = document.getElementById("slice-state");
const commentaryEl = document.getElementById("commentary");
const gameplayIntroMaskEl = document.getElementById("gameplay-intro-mask");
const gameplayIntroModalEl = document.getElementById("gameplay-intro-modal");
const gameplayIntroConfirmEl = document.getElementById("gameplay-intro-confirm");
const homeScreenEl = document.getElementById("home-screen");
const homeLevelPrevBtn = document.getElementById("home-level-prev");
const homeLevelCurrentBtn = document.getElementById("home-level-current");
const homeLevelNextBtn = document.getElementById("home-level-next");
const homeSettingsBtn = document.getElementById("home-settings-btn");
const homeSettingsModalEl = document.getElementById("home-settings-modal");
const homeSettingsCloseBtn = document.getElementById("home-settings-close-btn");
const settingMusicToggleEl = document.getElementById("setting-music-toggle");
const settingSfxToggleEl = document.getElementById("setting-sfx-toggle");
const homeFillStaminaBtn = document.getElementById("home-fill-stamina-btn");
const homeClearDataBtn = document.getElementById("home-clear-data-btn");
const homeCoinEl = document.getElementById("home-coin");
const homeEnergyTextEl = document.getElementById("home-energy-text");
const homeEnergyStatusEl = document.querySelector("#home-topbar .home-status-energy");
const gameplayTopbarEl = document.getElementById("gameplay-topbar");
const gameplayCoinStatusEl = document.getElementById("gameplay-coin-status");
const gameplayCoinTextEl = document.getElementById("gameplay-coin-text");
const coinFlyLayerEl = document.getElementById("coin-fly-layer");
const gameplaySettingsMaskEl = document.getElementById("gameplay-settings-mask");
const gameplaySettingsRootEl = document.getElementById("gameplay-settings");
const gameplaySettingsToggleEl = document.getElementById("gameplay-settings-toggle");
const gameplaySettingsMusicEl = document.getElementById("gameplay-settings-music");
const gameplaySettingsSfxEl = document.getElementById("gameplay-settings-sfx");
const gameplaySettingsExitEl = document.getElementById("gameplay-settings-exit");
const gameplayExitMaskEl = document.getElementById("gameplay-exit-mask");
const gameplayExitModalEl = document.getElementById("gameplay-exit-modal");
const gameplayExitCloseEl = document.getElementById("gameplay-exit-close");
const gameplayExitCancelEl = document.getElementById("gameplay-exit-cancel");
const gameplayExitConfirmEl = document.getElementById("gameplay-exit-confirm");
const resultMaskEl = document.getElementById("result-mask");
const resultPageEl = document.getElementById("result-page");
const resultPageTitleEl = document.getElementById("result-page-title");
const resultPageTitleTextEl = document.getElementById("result-page-title-text");
const resultWinCloseBtn = document.getElementById("result-win-close");
const resultWinPerfectEl = document.getElementById("result-win-perfect");
const resultRewardLabelEl = document.getElementById("result-reward-label");
const resultPageTextEl = document.getElementById("result-page-text");
const resultCoinIconEl = document.getElementById("result-coin-icon");
const resultCoinGainEl = document.getElementById("result-coin-gain");
const resultRetryBtn = document.getElementById("result-retry-btn");
const resultExitBtn = document.getElementById("result-exit-btn");
const resultNextBtn = document.getElementById("result-next-btn");
const levelWinEl = document.getElementById("level-win");
const levelWinTitleEl = document.getElementById("level-win-title");
const levelWinDescEl = document.getElementById("level-win-desc");
const levelWinNextBtn = document.getElementById("level-win-next-btn");
const gameOverEl = document.getElementById("game-over");
const gameOverTitleEl = document.getElementById("game-over-title");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const levelTestToggleBtn = document.getElementById("level-test-toggle");
const levelTestPanelEl = document.getElementById("level-test-panel");
const levelTestSelectEl = document.getElementById("level-test-select");
const levelTestJumpBtn = document.getElementById("level-test-jump");
const levelTestAddCoinsBtn = document.getElementById("level-test-add-coins");
const clearDataTestBtn = document.getElementById("clear-data-test-btn");
const lightDebugToggleBtn = document.getElementById("light-debug-toggle");
const lightDebugPanelEl = document.getElementById("light-debug-panel");
const lightDebugResetBtn = document.getElementById("light-debug-reset");
const lightToggleAmbientEl = document.getElementById("light-toggle-ambient");
const lightSliderAmbientEl = document.getElementById("light-slider-ambient");
const lightValueAmbientEl = document.querySelector('[data-value-for="light-slider-ambient"]');
const lightToggleKeyEl = document.getElementById("light-toggle-key");
const lightSliderKeyEl = document.getElementById("light-slider-key");
const lightValueKeyEl = document.querySelector('[data-value-for="light-slider-key"]');
const lightToggleRimEl = document.getElementById("light-toggle-rim");
const lightSliderRimEl = document.getElementById("light-slider-rim");
const lightValueRimEl = document.querySelector('[data-value-for="light-slider-rim"]');
const lightToggleFillEl = document.getElementById("light-toggle-fill");
const lightSliderFillEl = document.getElementById("light-slider-fill");
const lightValueFillEl = document.querySelector('[data-value-for="light-slider-fill"]');
const lightToggleEnvironmentEl = document.getElementById("light-toggle-environment");
const lightSliderEnvironmentEl = document.getElementById("light-slider-environment");
const lightValueEnvironmentEl = document.querySelector('[data-value-for="light-slider-environment"]');

const outOfMovesBannerEl = document.getElementById("out-of-moves-banner");
let outOfMovesContinueMaskEl = document.getElementById("out-of-moves-continue-mask");
let outOfMovesContinueModalEl = document.getElementById("out-of-moves-continue-modal");
let outOfMovesContinueCloseEl = document.getElementById("out-of-moves-continue-close");
let outOfMovesContinueMovesEl = document.getElementById("out-of-moves-continue-moves");
let outOfMovesContinueCostEl = document.getElementById("out-of-moves-continue-cost");
let outOfMovesContinueBuyEl = document.getElementById("out-of-moves-continue-buy");
const gameplayTip = createGameplayTipController({ hostEl: phoneFrameEl });

const isIOSDevice = (() => {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  return /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && touchPoints > 1);
})();

if (isIOSDevice) {
  document.documentElement.classList.add("platform-ios");
  if (document.body) document.body.classList.add("platform-ios");
}

function setupHomeFloatBubbles() {
  homeScreenController.setupHomeFloatBubbles();
}

const rules = {
  worldHeight: 10,
  minSliceSegment: 0.02,
  playAreaInset: 0.18,
};

const bubbleRadiusScale = 3;
const bubbleTuningStorageKey = "bubble_tuning_v1";
const levelProgressStorageKey = "fruit_level_progress_v1";
const coinStorageKey = "fruit_coin_balance_v1";
const staminaStorageKey = "fruit_stamina_v1";
const homeUiTuningStorageKey = "fruit_home_ui_tuning_v1";
const gameSettingsStorageKey = "fruit_game_settings_v1";
const uiLayoutDebugStorageKey = "fruit_ui_layout_debug_v1";
const hudDebugStorageKey = "fruit_hud_debug_v1";
const gameplayIntroStorageKey = "fruit_gameplay_intro_seen_v1";
const staminaMax = 5;
const staminaInfinite = true;
const homeScreenEnabled = false;
const staminaRecoverIntervalMs = 25 * 60 * 1000;
const outOfMovesBannerDurationMs = 1800;
const outOfMovesContinueCost = 50;
const outOfMovesContinueMoves = 3;
const levelWinRewardBase = 20;
const levelWinCoinRewardEnabled = false;
const homeEasyColorIds = [1, 2, 3, 5, 6];
const homeMediumColorId = 4;
const homeHardColorId = 0;
const popSoundFiles = GAME_POP_SOUND_FILES;
const popSoundUrls = GAME_POP_SOUND_URLS;
const [clickSoundUrl, gainCoinSoundUrl] = GAME_UI_AUDIO_URLS;
const selectScaleFrequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
const iphoneAspectBase = 430 / 932;
const portraitAspectMin = 9 / 20;
const portraitAspectMax = 1 / 2;
const desktopAspectSwitchWidth = 820;

const colors = [
  { id: "red", name: "红泡", base: 0xff0037 },
  { id: "orange", name: "橙泡", base: 0xff8a00 },
  { id: "green", name: "绿泡", base: 0x00d86a },
  { id: "blue", name: "蓝泡", base: 0x00a6ff },
  { id: "purple", name: "紫泡", base: 0x8a2bff },
  { id: "yellow", name: "黄泡", base: 0xffef00 },
  { id: "pink", name: "粉泡", base: 0xff3dc2 },
  { id: "teal", name: "青泡", base: 0x00d4c1 },
];

const defaultBubbleTuning = {
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
  lightRim: 0.82,
  lightFill: 0.44,
  lightEnvironment: 1.15,
  toggleLightAmbient: true,
  toggleLightKey: true,
  toggleLightRim: true,
  toggleLightFill: true,
  toggleLightEnvironment: true,
  toggleDye: true,
  toggleEdge: true,
  toggleIri: true,
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

const defaultHomeUiTuning = {
  energyTextSize: 22,
  energyTextX: 0,
  energyTextY: 0,
  coinTextSize: 24,
  coinIconX: 0,
  coinIconY: 0,
  coinTextX: 0,
  coinTextY: 0,
};

const defaultGameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
};

const clampLevelIndex = createLevelIndexClamper(LEVELS.length);

const defaultUiLayoutDebugTuning = {
  winWidth: 0,
  winHeight: 0,
  winX: 0,
  winY: 0,
  winScale: 1,
  titleY: 0,
  titleScale: 1,
  perfectY: 0,
  perfectScale: 1,
  rewardY: 0,
  rewardScale: 1,
  coinNumX: 0,
  coinNumY: 0,
  actionsY: 0,
  continueScale: 1,
};

const defaultHudDebugTuning = {
  hudLevelOffsetX: 0,
};

const loadedBubbleTuning = loadBubbleTuning();
const bubbleTuning = loadedBubbleTuning.value;
const hasBubbleTuningOverride = loadedBubbleTuning.fromStorage;
const gameSettings = readGameSettings({ storageKey: gameSettingsStorageKey, defaultSettings: defaultGameSettings });
const uiLayoutDebugTuning = readUiLayoutDebugTuning();
const hudDebugTuning = readHudDebugTuning();

const loadingScreen = createLoadingScreenController({
  rootEl: document.getElementById("loading-screen"),
  barEl: document.getElementById("loading-screen-bar"),
  percentEl: document.getElementById("loading-screen-percent"),
  statusEl: document.getElementById("loading-screen-status"),
});

const state = {
  started: false,
  gameOver: false,
  inHome: false,
  resourcesReady: false,
  levelTransitioning: false,

  currentLevelIndex: 0,
  currentPlayableLevelIndex: 0,
  highestPassedLevelIndex: -1,
  selectedHomeLevelIndex: 0,
  activeLevel: null,
  pointerDown: false,
  pressTarget: null,
  pressAwaitRelease: false,
  pendingPops: [],
  lastPoint: null,
  nowPoint: null,
  lastMoveAt: 0,
  stepLimit: 0,
  stepsUsed: 0,
  coins: 0,
  stamina: staminaMax,
  staminaLastRecoverAt: 0,
  staminaUiSyncAt: 0,
  pendingWinReward: 0,
  rewardAppliedThisRound: false,
  staminaTipHideTimer: 0,
  staminaTipTickTimer: 0,
  homeCenterTipTimer: 0,
  outOfMovesBannerTimer: 0,
  outOfMovesBannerAnimation: null,
  outOfMovesBannerGeneration: 0,
  outOfMovesHandling: false,
  outOfMovesContinueOpen: false,
  outOfMovesContinuePending: false,
  outOfMovesContinueUsedInLevel: false,

  gameplayIntroOpen: false,
};

const persistence = createPersistenceController({
  state,
  storageKeys: {
    levelProgress: levelProgressStorageKey,
    coin: coinStorageKey,
    stamina: staminaStorageKey,
  },
  levelCount: LEVELS.length,
  staminaMax,
  staminaRecoverIntervalMs,
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfffbf2);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 12.1);
camera.lookAt(0, 0, 0);

let renderer;

const bounds = { left: -3, right: 3, top: 5, bottom: -5 };
const fruits = [];

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const playPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const workHit = new THREE.Vector3();

let gameplayIntroSeen = readGameplayIntroSeen();

const ambientLight = new THREE.AmbientLight(0xffffff, bubbleTuning.lightAmbient);
ambientLight.visible = bubbleTuning.toggleLightAmbient !== false;
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, bubbleTuning.lightKey);
keyLight.position.set(4, 7, 4);
keyLight.visible = bubbleTuning.toggleLightKey !== false;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8ce7ff, bubbleTuning.lightRim);
rimLight.position.set(-6, 4, -5);
rimLight.visible = bubbleTuning.toggleLightRim !== false;
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xff9ec8, bubbleTuning.lightFill);
fillLight.position.set(2, -4, 3);
fillLight.visible = bubbleTuning.toggleLightFill !== false;
scene.add(fillLight);

if (bubbleTuning.toggleLightEnvironment === false) {
  scene.environmentIntensity = 0;
}

const bubbleBaseRadius = 1.2;
const bubbleGeometry = new THREE.SphereGeometry(bubbleBaseRadius, 120, 120);
const burstBubbleGeometry = new THREE.SphereGeometry(1, 22, 22);
const createBubbleMaterialForTuning = (baseColor) => createBubbleMaterial(baseColor, bubbleTuning, bubbleBaseRadius);

const colorUnifySystem = createColorUnifySystem();

const gameRuntime = createGameRuntime();
const {
  gameUI,
  burstSystem,
  victoryRainSystem,
  gridBoardSystem,
  bubbleSpawnSystem,
  pressSystem,
  levelFlow,
  gameAudio,
  levelRuntime,
} = gameRuntime;

const lightDebugUi = createLightDebugUiController({
  elements: {
    toggleBtn: lightDebugToggleBtn,
    panelEl: lightDebugPanelEl,
    resetBtn: lightDebugResetBtn,
    ambientToggle: lightToggleAmbientEl,
    ambientSlider: lightSliderAmbientEl,
    ambientValue: lightValueAmbientEl,
    keyToggle: lightToggleKeyEl,
    keySlider: lightSliderKeyEl,
    keyValue: lightValueKeyEl,
    rimToggle: lightToggleRimEl,
    rimSlider: lightSliderRimEl,
    rimValue: lightValueRimEl,
    fillToggle: lightToggleFillEl,
    fillSlider: lightSliderFillEl,
    fillValue: lightValueFillEl,
    environmentToggle: lightToggleEnvironmentEl,
    environmentSlider: lightSliderEnvironmentEl,
    environmentValue: lightValueEnvironmentEl,
  },
  lights: {
    ambient: ambientLight,
    key: keyLight,
    rim: rimLight,
    fill: fillLight,
    scene,
  },
  tuning: bubbleTuning,
  defaults: defaultBubbleTuning,
  storageKey: bubbleTuningStorageKey,
  onPlayClick: () => gameAudio.playUiClickAudio(),
});

const BubbleEntity = createBubbleEntityClass({
  bubbleTuning,
  bubbleBaseRadius,
  bubbleGeometry,
  burstSystem,
  createBubbleMaterialFn: createBubbleMaterialForTuning,
});

function readGameplayIntroSeen() {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(gameplayIntroStorageKey) === "1"
      || window.localStorage.getItem("fruit_level1_tutorial_seen_v1") === "1";
  } catch {
    return false;
  }
}

function persistGameplayIntroSeen() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(gameplayIntroStorageKey, "1");
  } catch {
    // ignore storage failures
  }
}

function openGameplayIntroModal() {
  if (!gameplayIntroMaskEl || !gameplayIntroModalEl) return;
  state.gameplayIntroOpen = true;
  gameplayIntroMaskEl.classList.remove("hidden");
  gameplayIntroModalEl.classList.remove("hidden");
}

function hideGameplayIntroModal() {
  if (!gameplayIntroMaskEl || !gameplayIntroModalEl) return;
  state.gameplayIntroOpen = false;
  gameplayIntroMaskEl.classList.add("hidden");
  gameplayIntroModalEl.classList.add("hidden");
}

function closeGameplayIntroModal() {
  hideGameplayIntroModal();
  if (!gameplayIntroSeen) {
    gameplayIntroSeen = true;
    persistGameplayIntroSeen();
  }
}

function bindGameplayIntroModal() {
  gameplayIntroConfirmEl?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    closeGameplayIntroModal();
  });
}

const rewardFlow = createRewardFlow({
  state,
  coinStorageKey,
  levelWinRewardBase,
  levelWinCoinRewardEnabled,
  getGameUI: () => gameUI,
  homeCoinEl,
  gameplayCoinStatusEl,
  gameplayTopbarEl,
  onCoinArriveSfx: () => gameAudio.playGainCoinAudio(),
});

const layoutViewport = createLayoutViewportController({
  elements: {
    appEl,
    phoneFrameEl,
    resultPageEl,
    hudEl,
    gameplayTopbarEl,
    gameplayCoinStatusEl,
    gameplaySettingsRootEl,
    gameplaySettingsMaskEl,
    gameplayExitMaskEl,
    gameplayExitModalEl,
    commentaryEl,
    sliceStateEl,
    levelTestPanelEl,
  },
  constants: {
    desktopAspectSwitchWidth,
    iphoneAspectBase,
    portraitAspectMin,
    portraitAspectMax,
  },
  camera,
  bounds,
  rules,
  levelRuntime,
  getRenderer: () => renderer,
  onHideGameplaySettingsMenu: hideGameplaySettingsMenu,
  onHideGameplayExitModal: hideGameplayExitModal,
});

const settingsUi = createSettingsUiController({
  elements: {
    homeSettingsBtn,
    homeSettingsModalEl,
    homeSettingsCloseBtn,
    settingMusicToggleEl,
    settingSfxToggleEl,
    homeFillStaminaBtn,
    homeClearDataBtn,
    gameplaySettingsMaskEl,
    gameplaySettingsRootEl,
    gameplaySettingsToggleEl,
    gameplaySettingsMusicEl,
    gameplaySettingsSfxEl,
    gameplaySettingsExitEl,
    gameplayExitMaskEl,
    gameplayExitModalEl,
    gameplayExitCloseEl,
    gameplayExitCancelEl,
    gameplayExitConfirmEl,
  },
  gameSettings,
  defaultGameSettings,
  storageKey: gameSettingsStorageKey,
  gameAudio,
  gameUI,
  onFillStaminaToMax: fillStaminaToMax,
  onClearGameplayDataOnly: clearGameplayDataOnly,
  onExitGameplayToHome: exitGameplayToHome,
});

const roundState = createRoundStateController({
  state,
  fruits,
  scene,
  burstSystem,
  victoryRainSystem,
  onPlayPopAudio: () => gameAudio.playRandomPopAudio(),
});

const homeScreenController = createHomeScreenController({
  state,
  elements: {
    homeScreenEl,
    homeEnergyStatusEl,
    homeLevelPrevBtn,
    homeLevelCurrentBtn,
    homeLevelNextBtn,
  },
  levels: LEVELS,
  colors,
  homeEasyColorIds,
  homeMediumColorId,
  homeHardColorId,
  clampLevelIndex,
  staminaMax,
  formatCountdownMmSs,
  getStaminaRecoverCountdownMs,
  onSyncStaminaUi: syncStaminaUi,
  onSettleStaminaRecovery: settleStaminaRecovery,
  onSetGameHudVisible: setGameHudVisible,
  onHideHomeSettingsModal: hideHomeSettingsModal,
  getRenderer: () => renderer,
  screenToWorld,
  createHomeBubbleEntity: ({ id, colorId }) => {
    const entity = new BubbleEntity({
      id,
      colorId,
      radius: 1,
      vx: 0,
      vy: 0,
      baseColor: new THREE.Color(colors[colorId].base).offsetHSL(0, 0.1, 0),
    });
    entity.baseOpacity = 0.96;
    entity.bubbleMaterial.opacity = 0.96;
    return entity;
  },
  scene,
  bubbleBaseRadius,
  onPlayUiClick: () => gameAudio.playUiClickAudio(),
  onShowCommentary: (text, durationMs) => gameUI.showCommentary(text, durationMs),
});

const sessionFlow = createSessionFlowController({
  state,
  fruits,
  colors,
  bounds,
  scene,
  levelRuntime,
  levelFlow,
  gameAudio,
  gameUI,
  burstSystem,
  victoryRainSystem,
  clampLevelIndex,
  hasBubbleTuningOverride,
  onHideOutOfMovesBanner: hideOutOfMovesBanner,
  onTryConsumeStaminaForLevelEntry: tryConsumeStaminaForLevelEntry,
  onSettlePendingWinReward: settlePendingWinReward,
  onRestoreStaminaAfterFailedEntry: restoreStaminaAfterFailedEntry,
  onShowHomeScreen: showHomeScreen,
  onHideHomeScreen: hideHomeScreen,
  onShowHomeCenterTip: showHomeCenterTip,
  onSetLevelTestSelection: setLevelTestSelection,
  onUpdateStepsHud: updateStepsHud,
  onClearQueuedSelections: clearQueuedSelections,
  onPlayOutOfMovesBanner: playOutOfMovesBanner,
  onClearBoardEntities: clearBoardEntities,
  onPersistLevelProgress: persistLevelProgress,
  onBackHomeFromResult: backHomeFromResult,
  onAfterLevelLoaded: (index, level) => {
    state.levelTransitioning = true;
    gridBoardSystem.show(level.gridLayout, { fadeIn: true });
    bubbleSpawnSystem.start(fruits, level.gridLayout);
    gameAudio.playRandomPopAudio({ volumeScale: 0.3 });
    setGameplayRulesPanelVisible(true);
    const gridSize = level.gridSize ?? 3;
    const tip = index === 0
      ? `第1关：${gridSize}×${gridSize}，捏碎泡泡会给四周染色！`
      : `第${index + 1}关：${gridSize}×${gridSize}，让剩下泡泡颜色一致`;
    gameUI.showCommentary(tip, index === 0 ? 2800 : 2200);
    void warmupBubbleRenderer({ renderer, scene, camera, fruits });
  },
  createBubbleEntity: ({
    id,
    colorId,
    radius,
    vx,
    vy,
    baseColor,
    motionMode,
    gridCol,
    gridRow,
  }) => new BubbleEntity({
    id,
    colorId,
    radius,
    vx,
    vy,
    baseColor,
    motionMode,
    gridCol,
    gridRow,
  }),
});

init();

function createGameRuntime() {
  const gameUI = createGameUI({
    sliceStateEl,
    commentaryEl,
    gameOverEl,
    gameOverTitleEl,
    resultPage: {
      maskEl: resultMaskEl,
      cardEl: resultPageEl,
      titleEl: resultPageTitleEl,
      titleTextEl: resultPageTitleTextEl,
      winCloseBtn: resultWinCloseBtn,
      perfectEl: resultWinPerfectEl,
      rewardLabelEl: resultRewardLabelEl,
      descEl: resultPageTextEl,
      rewardEl: resultCoinGainEl,
      coinIconEl: resultCoinIconEl,
      retryBtn: resultRetryBtn,
      nextBtn: resultNextBtn,
      backBtn: resultExitBtn,
    },
    simpleLevelWin: {
      rootEl: levelWinEl,
      titleEl: levelWinTitleEl,
      descEl: levelWinDescEl,
      actionBtnEl: levelWinNextBtn,
    },
    coinStatus: {
      rootEl: gameplayCoinStatusEl,
      valueEl: gameplayCoinTextEl,
    },
    coinFly: {
      layerEl: coinFlyLayerEl,
      frameEl: phoneFrameEl,
    },
    onShowCommentary: (text, durationMs) => {
      gameplayTip.show(text, durationMs);
    },
    onResultRetry: () => {
      gameAudio.playUiClickAudio();
      retryCurrentLevelFromResult();
    },
    onResultNext: () => {
      gameAudio.playUiClickAudio();
      levelFlow.continueToNextLevel();
    },
    onResultBack: () => {
      gameAudio.playUiClickAudio();
      backHomeFromResult();
    },
  });

  const burstSystem = createBurstSystem({
    scene,
    colors,
    bubbleTuning,
    bubbleBaseRadius,
    burstBubbleGeometry,
    createBubbleMaterial: createBubbleMaterialForTuning,
    poolSize: 180,
  });

  const gameAudio = createGameAudio({
    popSoundUrls,
    clickSoundUrl,
    gainCoinSoundUrl,
    selectScaleFrequencies,
  });

  const victoryRainSystem = createVictoryRainSystem({
    scene,
    bounds,
    colors,
    bubbleRadiusScale,
    bubbleBaseRadius,
    emitDuration: 0.9,
    spawnRate: 108,
    maxBubbles: 88,
  });

  const gridBoardSystem = createGridBoardSystem({ scene });

  const bubbleSpawnSystem = createBubbleSpawnSystem({
    onComplete: () => {
      state.levelTransitioning = false;
    },
  });

  const pressSystem = createPressSystem({
    camera,
    raycaster,
  });

  const levelFlow = createLevelFlowController({
    levelCount: LEVELS.length,
    isStarted: () => state.started,
    isGameOver: () => state.gameOver,
    isLevelTransitioning: () => state.levelTransitioning,
    setLevelTransitioning: (value) => {
      state.levelTransitioning = Boolean(value);
    },
    getCurrentLevelIndex: () => state.currentLevelIndex,
    onAllLevelsCleared: (levelCount) => {
      refundStaminaOnWin();
      const reward = getLevelWinReward(levelCount - 1);
      state.highestPassedLevelIndex = LEVELS.length - 1;
      state.currentPlayableLevelIndex = LEVELS.length - 1;
      state.selectedHomeLevelIndex = LEVELS.length - 1;
      persistLevelProgress();
      state.pendingWinReward = reward;
      state.rewardAppliedThisRound = false;
      state.levelTransitioning = true;
      settlePendingWinReward(false);
      gameAudio.playGameWinAudio();
      gameUI.openSimpleLevelWin({
        title: "全部通关！",
        actionText: "返回首页",
        onAction: () => {
          gameAudio.playUiClickAudio();
          backHomeFromResult();
        },
      });
    },
    onPrepareLevelWin: () => {
      state.pointerDown = false;
      state.pressTarget = null;
      state.pressAwaitRelease = false;
    },
    onVictoryFxStart: () => {},
    onVictoryFxUpdate: () => {},
    onShowLevelWinOverlay: (current, next) => {
      refundStaminaOnWin();
      const nextLevelIndex = Math.max(0, next - 1);
      const reward = getLevelWinReward(current - 1);
      grantLevelWinProgress(nextLevelIndex);
      state.pendingWinReward = reward;
      state.rewardAppliedThisRound = false;
      settlePendingWinReward(false);
      gameAudio.playGameWinAudio();
      gameUI.openSimpleLevelWin({
        title: `第 ${current} 关通关！`,
        actionText: "下一关",
        onAction: () => {
          gameAudio.playUiClickAudio();
          levelFlow.continueToNextLevel();
        },
      });
      return true;
    },
    onHideLevelWinOverlay: () => {
      gameUI.closeSimpleLevelWin();
    },
    onContinueToLevel: (nextLevelIndex) => {
      victoryRainSystem.reset();
      startNextLevel(nextLevelIndex);
    },
    showCommentary: (text, durationMs) => {
      gameUI.showCommentary(text, durationMs);
    },
    clearDelayMs: 500,
    overlayDelaySec: 0,
  });

  const levelRuntime = createLevelRuntime({
    levels: LEVELS,
    colors,
    bounds,
  });

  return {
    gameUI,
    burstSystem,
    victoryRainSystem,
    gridBoardSystem,
    bubbleSpawnSystem,
    pressSystem,
    levelFlow,
    gameAudio,
    levelRuntime,
  };
}

function loadBubbleTuning() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { value: { ...defaultBubbleTuning }, fromStorage: false };
  }

  try {
    const raw = window.localStorage.getItem(bubbleTuningStorageKey);
    if (!raw) return { value: { ...defaultBubbleTuning }, fromStorage: false };
    const parsed = JSON.parse(raw);
    const safe = {
      transmission: clampNumber(parsed.transmission, 0.5, 1, defaultBubbleTuning.transmission),
      roughness: clampNumber(parsed.roughness, 0.01, 0.3, defaultBubbleTuning.roughness),
      clearcoat: clampNumber(parsed.clearcoat, 0, 1, defaultBubbleTuning.clearcoat),
      wobble: clampNumber(parsed.wobble, 0, 0.08, defaultBubbleTuning.wobble),
      flow: clampNumber(parsed.flow, 0.2, 2.5, defaultBubbleTuning.flow),
      dye: clampNumber(parsed.dye, 0.6, 2.4, defaultBubbleTuning.dye),
      edge: clampNumber(parsed.edge, 0, 0.8, defaultBubbleTuning.edge),
      iri: clampNumber(parsed.iri, 0, 1, defaultBubbleTuning.iri),
      springTension: clampNumber(parsed.springTension, 0.04, 0.25, defaultBubbleTuning.springTension),
      springDamping: clampNumber(parsed.springDamping, 0.7, 0.98, defaultBubbleTuning.springDamping),
      lightKey: clampNumber(parsed.lightKey, 0, 2, defaultBubbleTuning.lightKey),
      lightAmbient: clampNumber(parsed.lightAmbient, 0, 1, defaultBubbleTuning.lightAmbient),
      lightRim: clampNumber(parsed.lightRim, 0, 2, defaultBubbleTuning.lightRim),
      lightFill: clampNumber(parsed.lightFill, 0, 2, defaultBubbleTuning.lightFill),
      lightEnvironment: clampNumber(parsed.lightEnvironment, 0, 2, defaultBubbleTuning.lightEnvironment),
      toggleLightAmbient: parsed.toggleLightAmbient !== false,
      toggleLightKey: parsed.toggleLightKey !== false,
      toggleLightRim: parsed.toggleLightRim !== false,
      toggleLightFill: parsed.toggleLightFill !== false,
      toggleLightEnvironment: parsed.toggleLightEnvironment !== false,
      toggleDye: parsed.toggleDye !== false,
      toggleEdge: parsed.toggleEdge !== false,
      toggleIri: parsed.toggleIri !== false,
      pressFillRate: clampNumber(parsed.pressFillRate, 0.3, 4, defaultBubbleTuning.pressFillRate),
      pressSpringMax: clampNumber(parsed.pressSpringMax, 0.2, 1.5, defaultBubbleTuning.pressSpringMax),
      pressContactStrength: clampNumber(parsed.pressContactStrength, 0, 2, defaultBubbleTuning.pressContactStrength),
      pressCompress: clampNumber(parsed.pressCompress, 0.2, 2.5, defaultBubbleTuning.pressCompress),
      pressExpand: clampNumber(parsed.pressExpand, 0, 2, defaultBubbleTuning.pressExpand),
      centerDentDepth: clampNumber(parsed.centerDentDepth, 0, 2.5, defaultBubbleTuning.centerDentDepth),
      centerDentRadius: clampNumber(parsed.centerDentRadius, 0.3, 2.5, defaultBubbleTuning.centerDentRadius),
      centerDentPower: clampNumber(parsed.centerDentPower, 0.5, 8, defaultBubbleTuning.centerDentPower),
      centerDentNormal: clampNumber(parsed.centerDentNormal, 0, 2.5, defaultBubbleTuning.centerDentNormal),
      centerDentRoughness: clampNumber(parsed.centerDentRoughness, 0, 0.8, defaultBubbleTuning.centerDentRoughness),
    };
    return { value: safe, fromStorage: true };
  } catch (_err) {
    return { value: { ...defaultBubbleTuning }, fromStorage: false };
  }
}

function readHomeUiTuning() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...defaultHomeUiTuning };
  }

  try {
    const raw = window.localStorage.getItem(homeUiTuningStorageKey);
    if (!raw) return { ...defaultHomeUiTuning };
    const parsed = JSON.parse(raw);
    return {
      energyTextSize: clampNumber(parsed.energyTextSize, 14, 42, defaultHomeUiTuning.energyTextSize),
      energyTextX: clampNumber(parsed.energyTextX, -80, 80, defaultHomeUiTuning.energyTextX),
      energyTextY: clampNumber(parsed.energyTextY, -40, 40, defaultHomeUiTuning.energyTextY),
      coinTextSize: clampNumber(parsed.coinTextSize, 14, 42, defaultHomeUiTuning.coinTextSize),
      coinIconX: clampNumber(parsed.coinIconX, -30, 40, defaultHomeUiTuning.coinIconX),
      coinIconY: clampNumber(parsed.coinIconY, -30, 30, defaultHomeUiTuning.coinIconY),
      coinTextX: clampNumber(parsed.coinTextX, -80, 80, defaultHomeUiTuning.coinTextX),
      coinTextY: clampNumber(parsed.coinTextY, -40, 40, defaultHomeUiTuning.coinTextY),
    };
  } catch (_err) {
    return { ...defaultHomeUiTuning };
  }
}

function applyHomeUiTuning(values) {
  layoutViewport.applyHomeUiTuning(values);
}

function readUiLayoutDebugTuning() {
  const fallback = { ...defaultUiLayoutDebugTuning };
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(uiLayoutDebugStorageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      winWidth: clampNumber(parsed.winWidth, -80, 180, fallback.winWidth),
      winHeight: clampNumber(parsed.winHeight, -120, 220, fallback.winHeight),
      winX: clampNumber(parsed.winX, -140, 140, fallback.winX),
      winY: clampNumber(parsed.winY, -140, 140, fallback.winY),
      winScale: clampNumber(parsed.winScale, 0.7, 1.35, fallback.winScale),
      titleY: clampNumber(parsed.titleY, -80, 100, fallback.titleY),
      titleScale: clampNumber(parsed.titleScale, 0.7, 1.5, fallback.titleScale),
      perfectY: clampNumber(parsed.perfectY, -100, 100, fallback.perfectY),
      perfectScale: clampNumber(parsed.perfectScale, 0.6, 1.4, fallback.perfectScale),
      rewardY: clampNumber(parsed.rewardY, -100, 100, fallback.rewardY),
      rewardScale: clampNumber(parsed.rewardScale, 0.6, 1.5, fallback.rewardScale),
      coinNumX: clampNumber(parsed.coinNumX, -120, 120, fallback.coinNumX),
      coinNumY: clampNumber(parsed.coinNumY, -120, 120, fallback.coinNumY),
      actionsY: clampNumber(parsed.actionsY, -100, 120, fallback.actionsY),
      continueScale: clampNumber(parsed.continueScale, 0.75, 1.45, fallback.continueScale),
    };
  } catch (_err) {
    return fallback;
  }
}

function applyUiLayoutDebugTuning(values) {
  layoutViewport.applyUiLayoutDebugTuning(values);
}

function readHudDebugTuning() {
  const fallback = { ...defaultHudDebugTuning };
  if (typeof window === "undefined" || !window.localStorage) return fallback;

  try {
    const raw = window.localStorage.getItem(hudDebugStorageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      hudLevelOffsetX: clampNumber(parsed.hudLevelOffsetX, -40, 40, fallback.hudLevelOffsetX),
    };
  } catch (_err) {
    return fallback;
  }
}

function applyHudDebugTuning(values) {
  layoutViewport.applyHudDebugTuning(values);
}

function saveGameSettings() {
  settingsUi.saveGameSettings();
}

function applyGameSettings() {
  settingsUi.applyGameSettings();
}

function syncSettingsUi() {
  settingsUi.syncSettingsUi();
}

function showHomeSettingsModal() {
  settingsUi.showHomeSettingsModal();
}

function hideHomeSettingsModal() {
  settingsUi.hideHomeSettingsModal();
}

function setGameplaySettingsMenuOpen(open) {
  settingsUi.setGameplaySettingsMenuOpen(open);
}

function hideGameplaySettingsMenu() {
  settingsUi.hideGameplaySettingsMenu();
}

function showGameplayExitModal() {
  settingsUi.showGameplayExitModal();
}

function hideGameplayExitModal() {
  settingsUi.hideGameplayExitModal();
}

function syncGameplaySettingsButtons() {
  settingsUi.syncGameplaySettingsButtons();
}

function exitGameplayToHome() {
  hideGameplayIntroModal();
  hideOutOfMovesBanner();
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  state.started = false;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.pointerDown = false;
  state.pendingWinReward = 0;
  state.rewardAppliedThisRound = true;
  clearQueuedSelections();
  gameUI.closeResult();
  clearBoardEntities();
  showHomeScreen();
}

function bindGameplaySettingsMenu() {
  settingsUi.bindGameplaySettingsMenu();
}

function clearGameplayDataOnly() {
  const wasInGameplay = state.started || !state.inHome;
  hideGameplayIntroModal();

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(levelProgressStorageKey);
    window.localStorage.removeItem(coinStorageKey);
    window.localStorage.removeItem(staminaStorageKey);
    window.localStorage.removeItem(gameSettingsStorageKey);
    window.localStorage.removeItem(gameplayIntroStorageKey);
    window.localStorage.removeItem("fruit_level1_tutorial_seen_v1");
  }

  gameplayIntroSeen = false;

  levelRuntime.clearCache();

  hydrateLevelProgress();
  hydrateCoinBalance();
  hydrateStamina();
  gameSettings.musicEnabled = defaultGameSettings.musicEnabled;
  gameSettings.sfxEnabled = defaultGameSettings.sfxEnabled;
  applyGameSettings();
  syncSettingsUi();
  syncGameplaySettingsButtons();
  syncCoinUi();
  syncStaminaUi();

  state.selectedHomeLevelIndex = state.currentPlayableLevelIndex;

  if (wasInGameplay) {
    hideOutOfMovesBanner();
    hideOutOfMovesContinueModal();
    state.outOfMovesContinuePending = false;
    state.started = false;
    state.gameOver = false;
    state.levelTransitioning = false;
    state.pointerDown = false;
    state.pressTarget = null;
    state.pressAwaitRelease = false;
    state.pendingWinReward = 0;
    state.rewardAppliedThisRound = true;
    clearQueuedSelections();
    gameUI.closeResult();
    levelFlow.reset();
    clearBoardEntities();
    showHomeScreen();
  } else if (homeScreenEnabled) {
    renderHomeScreen();
  }

  gameUI.showCommentary("已清除数据，从第一关重新开始。", 1600);
}

function bindHomeSettingsModal() {
  settingsUi.bindHomeSettingsModal();
}

function hydrateLevelProgress() {
  persistence.hydrateLevelProgress();
}

function persistLevelProgress() {
  persistence.persistLevelProgress();
}

function hydrateCoinBalance() {
  persistence.hydrateCoinBalance();
}

function hydrateStamina() {
  persistence.hydrateStamina();
}

function persistStamina() {
  persistence.persistStamina();
}

function settleStaminaRecovery(now = Date.now()) {
  persistence.settleStaminaRecovery(now);
}

function syncStaminaUi() {
  if (staminaInfinite) {
    state.stamina = staminaMax;
    if (homeEnergyTextEl) {
      homeEnergyTextEl.textContent = "∞";
    }
    state.staminaUiSyncAt = Date.now();
    return;
  }

  settleStaminaRecovery();
  if (homeEnergyTextEl) {
    homeEnergyTextEl.textContent = `${state.stamina}/${staminaMax}`;
  }
  state.staminaUiSyncAt = Date.now();
}

function tryConsumeStaminaForLevelEntry() {
  if (staminaInfinite) return true;

  settleStaminaRecovery();
  if (state.stamina <= 0) {
    syncStaminaUi();
    showHomeCenterTip("Not enough stamina", 1200);
    return false;
  }

  state.stamina = Math.max(0, state.stamina - 1);
  state.staminaLastRecoverAt = Date.now();
  persistStamina();
  syncStaminaUi();
  return true;
}

function refundStaminaOnWin() {
  if (staminaInfinite) return;

  settleStaminaRecovery();
  if (state.stamina >= staminaMax) return;

  state.stamina = Math.min(staminaMax, state.stamina + 1);
  if (state.stamina >= staminaMax) {
    state.staminaLastRecoverAt = Date.now();
  }
  persistStamina();
  syncStaminaUi();
}

function restoreStaminaAfterFailedEntry() {
  if (staminaInfinite) return;

  if (state.stamina >= staminaMax) return;
  state.stamina = Math.min(staminaMax, state.stamina + 1);
  if (state.stamina >= staminaMax) {
    state.staminaLastRecoverAt = Date.now();
  }
  persistStamina();
  syncStaminaUi();
}

function fillStaminaToMax() {
  state.stamina = staminaMax;
  state.staminaLastRecoverAt = Date.now();
  persistStamina();
  syncStaminaUi();
}

function formatCountdownMmSs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
}

function getStaminaRecoverCountdownMs(now = Date.now()) {
  if (staminaInfinite || state.stamina >= staminaMax) return 0;
  const safeNow = Number.isFinite(now) ? Math.floor(now) : Date.now();
  const elapsed = Math.max(0, safeNow - state.staminaLastRecoverAt);
  const remainder = elapsed % staminaRecoverIntervalMs;
  return staminaRecoverIntervalMs - remainder;
}

function hideHomeCenterTip() {
  homeScreenController.hideHomeCenterTip();
}

function showHomeCenterTip(text, durationMs = 1200) {
  homeScreenController.showHomeCenterTip(text, durationMs);
}

function hideHomeEnergyRecoverTip() {
  homeScreenController.hideHomeEnergyRecoverTip();
}

function ensureOutOfMovesContinueElements() {
  if (!phoneFrameEl) return;

  if (!outOfMovesContinueMaskEl) {
    const mask = document.createElement("div");
    mask.id = "out-of-moves-continue-mask";
    mask.className = "hidden";
    mask.setAttribute("aria-hidden", "true");
    phoneFrameEl.appendChild(mask);
    outOfMovesContinueMaskEl = mask;
  }

  if (!outOfMovesContinueModalEl) {
    const modal = document.createElement("div");
    modal.id = "out-of-moves-continue-modal";
    modal.className = "hidden";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Continue modal");
    modal.innerHTML = `
      <button id="out-of-moves-continue-close" class="out-of-moves-continue-close" type="button" aria-label="Close">✕</button>
      <div class="out-of-moves-continue-body">
        <div class="out-of-moves-continue-title">Continue?</div>
        <div class="out-of-moves-continue-center">
          <div class="out-of-moves-continue-badge">+<span id="out-of-moves-continue-moves">3</span></div>
          <p class="out-of-moves-continue-desc">Spend coins to add moves and keep playing!</p>
        </div>
        <button id="out-of-moves-continue-buy" class="out-of-moves-continue-buy" type="button">
          <span class="out-of-moves-continue-buy-text">Play On</span>
          <img class="out-of-moves-continue-buy-coin" src="./assets/images/currency128_Coin.png" alt="Coin" />
          <span id="out-of-moves-continue-cost" class="out-of-moves-continue-buy-cost">50</span>
        </button>
      </div>
    `;
    phoneFrameEl.appendChild(modal);
    outOfMovesContinueModalEl = modal;
  }

  outOfMovesContinueCloseEl = document.getElementById("out-of-moves-continue-close");
  outOfMovesContinueMovesEl = document.getElementById("out-of-moves-continue-moves");
  outOfMovesContinueCostEl = document.getElementById("out-of-moves-continue-cost");
  outOfMovesContinueBuyEl = document.getElementById("out-of-moves-continue-buy");
}

function bindHomeEnergyTip() {
  homeScreenController.bindHomeEnergyTip();
}

function clearOutOfMovesBannerTimer() {
  if (!state.outOfMovesBannerTimer) return;
  window.clearTimeout(state.outOfMovesBannerTimer);
  state.outOfMovesBannerTimer = 0;
}

function clearOutOfMovesBannerAnimation() {
  if (!state.outOfMovesBannerAnimation) return;
  state.outOfMovesBannerAnimation.cancel();
  state.outOfMovesBannerAnimation = null;
}

function invalidateOutOfMovesBannerCallbacks() {
  state.outOfMovesBannerGeneration += 1;
}

function hideOutOfMovesBannerVisual() {
  clearOutOfMovesBannerAnimation();
  clearOutOfMovesBannerTimer();
  if (!outOfMovesBannerEl) return;
  outOfMovesBannerEl.classList.remove("show");
  outOfMovesBannerEl.classList.add("hidden");
  outOfMovesBannerEl.style.opacity = "";
  outOfMovesBannerEl.style.transform = "";
}

function hideOutOfMovesBanner() {
  invalidateOutOfMovesBannerCallbacks();
  hideOutOfMovesBannerVisual();
}

function playOutOfMovesBanner(onDone) {
  if (!outOfMovesBannerEl) {
    onDone?.();
    return;
  }

  hideOutOfMovesBanner();
  const activeGeneration = state.outOfMovesBannerGeneration;
  const finish = () => {
    if (activeGeneration !== state.outOfMovesBannerGeneration) return;
    onDone?.();
  };
  outOfMovesBannerEl.classList.remove("hidden");
  outOfMovesBannerEl.style.opacity = "1";
  outOfMovesBannerEl.style.transform = "translateY(-50%)";

  if (typeof outOfMovesBannerEl.animate === "function") {
    const animation = outOfMovesBannerEl.animate(
      [
        { transform: "translateY(-260%)", opacity: 0, offset: 0 },
        { transform: "translateY(-50%)", opacity: 1, offset: 0.24 },
        { transform: "translateY(-50%)", opacity: 1, offset: 0.62 },
        { transform: "translateY(220%)", opacity: 0, offset: 1 },
      ],
      {
        duration: outOfMovesBannerDurationMs,
        easing: "cubic-bezier(0.22, 0.82, 0.22, 1)",
        fill: "both",
      }
    );
    state.outOfMovesBannerAnimation = animation;
    animation.onfinish = () => {
      if (activeGeneration !== state.outOfMovesBannerGeneration) return;
      state.outOfMovesBannerAnimation = null;
      hideOutOfMovesBannerVisual();
      finish();
    };
    animation.oncancel = () => {
      state.outOfMovesBannerAnimation = null;
    };
    return;
  }

  outOfMovesBannerEl.classList.remove("show");
  void outOfMovesBannerEl.offsetWidth;
  outOfMovesBannerEl.classList.add("show");
  state.outOfMovesBannerTimer = window.setTimeout(() => {
    if (activeGeneration !== state.outOfMovesBannerGeneration) return;
    hideOutOfMovesBannerVisual();
    finish();
  }, outOfMovesBannerDurationMs);
}

function syncOutOfMovesContinueModalUi() {
  if (outOfMovesContinueMovesEl) outOfMovesContinueMovesEl.textContent = String(outOfMovesContinueMoves);
  if (outOfMovesContinueCostEl) outOfMovesContinueCostEl.textContent = String(outOfMovesContinueCost);
}

function setOutOfMovesContinueCoinTopbarVisible(show) {
  if (show) {
    setGameplayCoinTopbarVisible(true);
    gameplayTopbarEl?.classList.add("is-floating-over-continue");
    return;
  }

  gameplayTopbarEl?.classList.remove("is-floating-over-continue");
  setGameplayCoinTopbarVisible(false);
}

function clearGameplayCenterTip() {
  gameplayTip.clear();
}

function showGameplayCenterTip(text, durationMs = 1200) {
  gameplayTip.show(text, durationMs);
}

function setGameplayRulesPanelVisible(visible) {
  if (!gameplayRulesPanelEl) return;
  gameplayRulesPanelEl.classList.toggle("hidden", !visible);
}

function hideOutOfMovesContinueModal() {
  outOfMovesContinueMaskEl?.classList.add("hidden");
  outOfMovesContinueModalEl?.classList.add("hidden");
  setOutOfMovesContinueCoinTopbarVisible(false);
  clearGameplayCenterTip();
  state.outOfMovesContinueOpen = false;
}

function openOutOfMovesContinueModal() {
  ensureOutOfMovesContinueElements();
  if (!outOfMovesContinueMaskEl || !outOfMovesContinueModalEl || !outOfMovesContinueBuyEl || !outOfMovesContinueCloseEl) {
    state.outOfMovesContinuePending = false;
    state.levelTransitioning = false;
    endGame(`Level ${state.currentLevelIndex + 1} failed: out of moves`);
    return;
  }
  syncOutOfMovesContinueModalUi();
  outOfMovesContinueMaskEl.classList.remove("hidden");
  outOfMovesContinueModalEl.classList.remove("hidden");
  setOutOfMovesContinueCoinTopbarVisible(true);
  state.outOfMovesContinueOpen = true;
}

function resolveOutOfMovesAsLose() {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  state.levelTransitioning = false;
  endGame(`Level ${state.currentLevelIndex + 1} failed: out of moves`);
}

function continueAfterOutOfMoves() {
  if (state.outOfMovesContinueUsedInLevel) {
    resolveOutOfMovesAsLose();
    return;
  }

  if (!trySpendCoins(outOfMovesContinueCost)) {
    syncOutOfMovesContinueModalUi();
    showGameplayCenterTip("Not enough coins", 1200);
    return;
  }

  state.stepLimit = Math.max(1, state.stepLimit + outOfMovesContinueMoves);
  state.outOfMovesContinueUsedInLevel = true;
  state.gameOver = false;
  state.levelTransitioning = false;
  state.outOfMovesContinuePending = false;
  hideOutOfMovesContinueModal();
  syncOutOfMovesContinueModalUi();
  updateStepsHud();
    gameUI.showCommentary(`+${outOfMovesContinueMoves} moves`, 1000);
}

function triggerOutOfMovesContinueFlow() {
  if (state.gameOver || state.outOfMovesHandling || state.levelTransitioning) return;
  state.outOfMovesHandling = true;
  state.pointerDown = false;
  state.pressTarget = null;
  state.pressAwaitRelease = false;
  state.levelTransitioning = true;
  clearQueuedSelections();
  playOutOfMovesBanner(() => {
    if (state.gameOver) return;
    state.levelTransitioning = false;
    endGame(`第 ${state.currentLevelIndex + 1} 关失败：步数用尽`, { showOutOfMovesBanner: false });
  });
}

function bindOutOfMovesContinueModal() {
  ensureOutOfMovesContinueElements();
  outOfMovesContinueBuyEl?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    continueAfterOutOfMoves();
  });

  outOfMovesContinueCloseEl?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    resolveOutOfMovesAsLose();
  });
}

function persistCoinBalance() {
  rewardFlow.persistCoinBalance();
}

function syncCoinUi() {
  rewardFlow.syncCoinUi();
  syncOutOfMovesContinueModalUi();
}

function addCoins(value) {
  rewardFlow.addCoins(value);
}

function trySpendCoins(value) {
  return rewardFlow.trySpendCoins(value);
}

function getLevelWinReward(levelIndex) {
  return rewardFlow.getLevelWinReward(levelIndex);
}

function setGameplayCoinTopbarVisible(show) {
  rewardFlow.setGameplayCoinTopbarVisible(show);
}

function playWinCoinFly() {
  rewardFlow.playWinCoinFly();
}

function settlePendingWinReward(playFx = false) {
  rewardFlow.settlePendingWinReward(playFx);
}

function bindHomeLevelButtons() {
  homeScreenController.bindHomeLevelButtons();
}

function updateHomeBubbles(dt) {
  homeScreenController.updateHomeBubbles(dt);
}

function renderHomeScreen() {
  homeScreenController.renderHomeScreen();
}

function showHomeScreen() {
  if (!homeScreenEnabled) {
    state.currentPlayableLevelIndex = 0;
    state.selectedHomeLevelIndex = 0;
    startGame();
    return;
  }
  homeScreenController.showHomeScreen();
}

function hideHomeScreen() {
  homeScreenController.hideHomeScreen();
}

function setGameHudVisible(visible) {
  layoutViewport.setGameHudVisible(visible);
}

function clearBoardEntities() {
  bubbleSpawnSystem.reset();
  gridBoardSystem.clear();
  roundState.clearBoardEntities();
}

function grantLevelWinProgress(nextLevelIndex) {
  sessionFlow.grantLevelWinProgress(nextLevelIndex);
}

function retryCurrentLevelFromResult() {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.retryCurrentLevelFromResult();
}

function backHomeFromResult() {
  hideGameplayIntroModal();
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.backHomeFromResult();
}

function startNextLevel(nextLevelIndex) {
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  sessionFlow.startNextLevel(nextLevelIndex);
}

function shouldResetFromQuery() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("reset") === "1";
}

function init() {
  loadingScreen.show();
  loadingScreen.setProgress(0, "正在加载资源...");
  ensureOutOfMovesContinueElements();
  if (shouldResetFromQuery()) {
    clearGameplayDataOnly();
  } else {
    hydrateLevelProgress();
    hydrateCoinBalance();
    hydrateStamina();
  }
  applyHomeUiTuning(readHomeUiTuning());
  applyUiLayoutDebugTuning(uiLayoutDebugTuning);
  applyHudDebugTuning(hudDebugTuning);
  applyGameSettings();
  syncCoinUi();
  syncStaminaUi();
  state.inHome = false;
  state.currentPlayableLevelIndex = 0;
  state.selectedHomeLevelIndex = 0;
  updatePhoneAspect();
  setGameHudVisible(true);
  if (homeScreenEl) homeScreenEl.classList.add("hidden");
  setGameplayRulesPanelVisible(false);
  if (homeScreenEnabled) {
    setupHomeFloatBubbles();
    renderHomeScreen();
  }

  startBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    startGame();
  });
  restartBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    startGame();
  });
  bindHomeLevelButtons();
  bindHomeEnergyTip();
  bindHomeSettingsModal();
  bindGameplaySettingsMenu();
  bindOutOfMovesContinueModal();
  bindGameplayIntroModal();
  gameUI.closeResult();
  setupLevelTestControls();
  setupLightDebugControls();

  window.addEventListener("resize", resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resize);
    window.visualViewport.addEventListener("scroll", resize);
  }
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  setupRenderer();
}

function setupLightDebugControls() {
  lightDebugUi.bind();
}

function setupLevelTestControls() {
  if (!levelTestToggleBtn || !levelTestPanelEl || !levelTestSelectEl || !levelTestJumpBtn) {
    return;
  }

  let addCoinsBtn = levelTestAddCoinsBtn;
  if (!addCoinsBtn) {
    const host = document.getElementById("level-test");
    if (host) {
      addCoinsBtn = document.createElement("button");
      addCoinsBtn.id = "level-test-add-coins";
      addCoinsBtn.className = "tool-btn";
      addCoinsBtn.type = "button";
      addCoinsBtn.textContent = "Test +50 Coins";
      host.insertBefore(addCoinsBtn, levelTestToggleBtn);
    }
  }

  levelTestSelectEl.innerHTML = "";
  for (let i = 0; i < LEVELS.length; i += 1) {
    const level = LEVELS[i];
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Level ${i + 1} ${level.name}`;
    levelTestSelectEl.appendChild(option);
  }

  levelTestToggleBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    levelTestPanelEl.classList.toggle("hidden");
  });

  levelTestJumpBtn.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    const targetIndex = Number(levelTestSelectEl.value);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= LEVELS.length) {
      return;
    }
    jumpToLevelForTest(targetIndex);
  });

  addCoinsBtn?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    addCoins(50);
    gameUI.showCommentary("Test: +50 coins added", 1200);
  });

  clearDataTestBtn?.addEventListener("click", () => {
    gameAudio.playUiClickAudio();
    const ok = typeof window !== "undefined"
      ? window.confirm("清除关卡进度、金币和设置数据？")
      : true;
    if (!ok) return;
    clearGameplayDataOnly();
  });
}

function setLevelTestSelection(index) {
  if (!levelTestSelectEl) return;
  levelTestSelectEl.value = String(index);
}

function jumpToLevelForTest(index) {
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) return;

  if (!state.started || state.gameOver) {
    startGame();
  }

  loadLevel(index);
  if (levelTestPanelEl) levelTestPanelEl.classList.add("hidden");
  gameUI.showCommentary(`Test mode: switched to Level ${index + 1}`, 1400);
}

async function setupRenderer() {
  try {
    if (!navigator.gpu) {
      showWebGpuUnsupported();
      loadingScreen.showError("当前浏览器不支持 WebGPU");
      return;
    }

    loadingScreen.setProgress(0.05, "正在初始化渲染器...");
    renderer = await createRenderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    appEl.appendChild(renderer.domElement);
    updatePhoneAspect();
    resize();

    loadingScreen.setProgress(0.12, "正在加载场景环境...");
    await applyBubbleSceneEnvironment({
      scene,
      renderer,
      environmentIntensity: bubbleTuning.toggleLightEnvironment === false
        ? 0
        : bubbleTuning.lightEnvironment,
    });

    const assetTasks = [
      ...GAME_IMAGE_URLS.map((url) => ({
        label: "正在加载图片...",
        run: () => preloadImage(url),
      })),
      ...GAME_AUDIO_URLS.map((url) => ({
        label: "正在加载音频...",
        run: () => preloadFile(url),
      })),
    ];

    let assetDone = 0;
    await Promise.all(assetTasks.map(async (task) => {
      await task.run();
      assetDone += 1;
      loadingScreen.setProgress(0.12 + (assetDone / assetTasks.length) * 0.76, task.label);
    }));

    loadingScreen.setProgress(0.92, "正在准备音效...");
    await gameAudio.preloadAllGameAudio();
    loadingScreen.setProgress(1, "准备就绪");

    state.resourcesReady = true;
    lightDebugUi.syncUiFromTuning();
    resize();
    loadingScreen.hide();

    if (homeScreenEnabled && state.inHome) {
      renderHomeScreen();
    } else {
      startGame();
      loadingScreen.setProgress(0.98, "正在准备画面...");
      await warmupBubbleRenderer({ renderer, scene, camera, fruits });
    }

    renderer.setAnimationLoop(tick);
  } catch (error) {
    console.error("Game bootstrap failed:", error);
    loadingScreen.showError("资源加载失败，请刷新重试");
  }
}

async function createRenderer() {
  if (!navigator.gpu) {
    showWebGpuUnsupported();
    throw new Error("WebGPU is not supported in this browser.");
  }

  const webgpu = new THREE.WebGPURenderer({ antialias: true, forceWebGL: false });
  await webgpu.init();
  return webgpu;
}

function showWebGpuUnsupported() {
  const layer = document.createElement("div");
  layer.className = "layer";
  layer.style.zIndex = "20";
  layer.style.background = "rgba(15, 25, 38, 0.9)";
  layer.style.color = "#ffffff";
  layer.style.fontWeight = "800";
  layer.style.lineHeight = "1.7";
  layer.innerHTML = "<div style=\"font-size:28px;\">Cannot Start</div><div style=\"margin-top:10px;font-size:15px;opacity:0.92;\">This browser/device does not support WebGPU.<br/>Please use a newer Chrome or Edge with WebGPU support.</div>";
  appEl.appendChild(layer);
}

function startGame() {
  if (!state.resourcesReady) return;
  hideOutOfMovesContinueModal();
  state.outOfMovesContinuePending = false;
  const shouldShowIntro = !gameplayIntroSeen;
  sessionFlow.startGame();
  if (shouldShowIntro && state.started) {
    openGameplayIntroModal();
  }
}

function loadLevel(index) {
  return sessionFlow.loadLevel(index);
}

function resetFruits(level) {
  sessionFlow.resetFruits(level);
}

function onPointerDown(ev) {
  if (!state.resourcesReady || !state.started || state.gameOver || state.levelTransitioning || state.gameplayIntroOpen || !renderer) return;
  if (state.pressAwaitRelease) return;
  if (state.stepLimit > 0 && state.stepsUsed >= state.stepLimit) {
    gameUI.showCommentary("Out of moves for this level.", 1000);
    return;
  }

  gameAudio.ensureAudioUnlocked();
  void gameAudio.preloadPopAudio();
  gameAudio.resetSelectToneProgression();

  const rect = renderer.domElement.getBoundingClientRect();
  if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) return;

  const world = screenToWorld(ev.clientX, ev.clientY);
  const began = pressSystem.beginPress({
    state,
    fruits,
    world,
    playSelectTone: gameAudio.playSelectTone,
  });
  if (!began) return;

  state.pointerDown = true;
  state.lastMoveAt = performance.now();
}

function onPointerMove(ev) {
  if (!state.pointerDown || !renderer || !state.pressTarget) return;
  state.nowPoint = screenToWorld(ev.clientX, ev.clientY);
}

function onPointerUp() {
  if (!state.pointerDown && !state.pressAwaitRelease) return;
  state.pointerDown = false;
  state.pressAwaitRelease = false;
  state.nowPoint = null;
  gameAudio.resetSelectToneProgression();
  pressSystem.endPress({ state });

  if (state.gameOver) return;
}

function tick() {
  if (!renderer) return;
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const now = performance.now();
  const wallNow = Date.now();

  pressSystem.updatePress({
    state,
    dt,
    consumeStep,
    onPop: () => gameAudio.playRandomPopAudio(),
    onBurst: (fruit, burstDir) => {
      colorUnifySystem.applyPop({ source: fruit, fruits, colors });
      fruit.pop(burstDir, 2.4);
    },
  });
  processPendingPops(dt);
  updateHomeBubbles(dt);
  if (state.inHome && wallNow - state.staminaUiSyncAt >= 1000) {
    syncStaminaUi();
  }

  burstSystem.update(dt);
  levelFlow.updateVictory(dt);
  gridBoardSystem.update(dt);

  let remaining = 0;
  for (const fruit of fruits) {
    fruit.update(dt, bounds);
    if (fruit.active && !fruit.sliced) remaining += 1;
  }

  bubbleSpawnSystem.update(dt);

  renderer.render(scene, camera);

  const winConditionMet = colorUnifySystem.isBoardUnified(fruits) || remaining === 0;
  const levelClearSignal = winConditionMet ? 0 : remaining;
  if (levelFlow.updateLevelClear(now, levelClearSignal)) return;

  if (
    state.started
    && !state.gameOver
    && !state.outOfMovesHandling
    && !state.outOfMovesContinuePending
    && !state.levelTransitioning
    && state.stepLimit > 0
    && state.stepsUsed >= state.stepLimit
    && !winConditionMet
    && !levelFlow.isLevelClearPending()
    && remaining > 0
    && !state.pointerDown
    && state.pendingPops.length === 0
  ) {
    triggerOutOfMovesContinueFlow();
  }
}

function processPendingPops(dt) {
  roundState.processPendingPops(dt);
}

function clearQueuedSelections() {
  roundState.clearQueuedSelections();
}

function consumeStep() {
  if (state.stepLimit <= 0) return;
  state.stepsUsed = Math.min(state.stepLimit, state.stepsUsed + 1);
  updateStepsHud();
}

function updateStepsHud() {
  if (!stepsEl) return;
  const remaining = Math.max(0, state.stepLimit - state.stepsUsed);
  stepsEl.textContent = `MOVE:${remaining}`;
  if (hudLevelEl) hudLevelEl.textContent = `LV:${state.currentLevelIndex + 1}`;
}

function screenToWorld(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = THREE.MathUtils.clamp(clientX, rect.left, rect.right);
  const y = THREE.MathUtils.clamp(clientY, rect.top, rect.bottom);
  const ndcX = ((x - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((y - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  raycaster.ray.intersectPlane(playPlane, workHit);
  return workHit.clone();
}

function resize() {
  layoutViewport.resize();
}

function updatePhoneAspect() {
  layoutViewport.updatePhoneAspect();
}

function endGame(reason, options = {}) {
  sessionFlow.endGame(reason, options);
}
