import {
  createTessellatedCircleBackground,
  TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS,
} from "./tessellated-circle-background.js";
import {
  createFluidMeshBackground,
  estimateFluidPlaneCover,
  FLUID_MESH_DEFAULTS,
  resolveFluidPlaneSize,
} from "./fluid-mesh-background.js";
import { buildFluidPresetFromBoard } from "../game/fluid-palette-from-board.js";

export const PLAYFIELD_BACKGROUND_DEFAULTS = {
  ...TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS,
  ...FLUID_MESH_DEFAULTS,
  circlePatternOpacity: 0.42,
  circlesVisible: false,
};

export function createPlayfieldBackground({ scene, blobColors, getBoardContext, ...options } = {}) {
  const initial = { ...PLAYFIELD_BACKGROUND_DEFAULTS, ...options };
  let readBoardContext = typeof getBoardContext === "function" ? getBoardContext : () => ({});

  function setGetBoardContext(fn) {
    if (typeof fn === "function") readBoardContext = fn;
  }
  if (Array.isArray(blobColors) && initial.fluidBlobs) {
    initial.fluidBlobs = initial.fluidBlobs.map((blob, i) => ({
      ...blob,
      color: blobColors[i] ?? blob.color,
    }));
  }

  const fluidPlaneSize = resolveFluidPlaneSize(initial.planeSize, initial.fluidPlaneSize);

  const fluid = createFluidMeshBackground({
    scene,
    planeSize: fluidPlaneSize,
    planeZ: initial.planeZ,
    baseColor: initial.fluidBaseColor,
    blobs: initial.fluidBlobs,
    blurPx: initial.fluidBlurPx,
    driftSpeed: initial.fluidDriftSpeed,
    enabled: initial.fluidMeshEnabled,
    fluidBlobOpacity: initial.fluidBlobOpacity,
    fluidBrightness: initial.fluidBrightness,
    fluidSaturation: initial.fluidSaturation,
    fluidWhiteMix: initial.fluidWhiteMix,
    fluidGradientMid: initial.fluidGradientMid,
    fluidGradientMidAlpha: initial.fluidGradientMidAlpha,
    fluidBlurCapPx: initial.fluidBlurCapPx,
    fluidDriftAmplitude: initial.fluidDriftAmplitude,
    fluidSheen: initial.fluidSheen,
    fluidBlendMode: initial.fluidBlendMode,
    fluidMeshOpacity: initial.fluidMeshOpacity,
  });

  const circles = createTessellatedCircleBackground({
    scene,
    circleColor: initial.circleColor,
    circleRadiusPx: initial.circleRadiusPx,
    gapPx: initial.gapPx,
    scrollSpeed: initial.scrollSpeed,
    planeSize: initial.planeSize,
    planeZ: initial.planeZ,
    textureRepeat: initial.textureRepeat,
    linearFilter: initial.linearFilter,
    visible: initial.circlesVisible,
    transparentPattern: true,
    circlePatternOpacity: initial.circlePatternOpacity,
  });

  function applyTuning(next = {}) {
    const patternPlaneSize = next.planeSize != null ? next.planeSize : circles.getTuning().planeSize;
    const fluidCover = resolveFluidPlaneSize(patternPlaneSize, next.fluidPlaneSize);

    if (next.planeZ != null) {
      fluid.applyTuning({ planeZ: next.planeZ });
      circles.applyTuning({ planeZ: next.planeZ });
    }

    fluid.applyTuning({
      planeSize: fluidCover,
      fluidMeshEnabled: next.fluidMeshEnabled,
      fluidBaseColor: next.fluidBaseColor,
      fluidBlurPx: next.fluidBlurPx,
      fluidDriftSpeed: next.fluidDriftSpeed,
      fluidBlobs: next.fluidBlobs,
      blobColors: next.blobColors,
      fluidBlobOpacity: next.fluidBlobOpacity,
      fluidBrightness: next.fluidBrightness,
      fluidSaturation: next.fluidSaturation,
      fluidWhiteMix: next.fluidWhiteMix,
      fluidGradientMid: next.fluidGradientMid,
      fluidGradientMidAlpha: next.fluidGradientMidAlpha,
      fluidBlurCapPx: next.fluidBlurCapPx,
      fluidDriftAmplitude: next.fluidDriftAmplitude,
      fluidSheen: next.fluidSheen,
      fluidBlendMode: next.fluidBlendMode,
      fluidMeshOpacity: next.fluidMeshOpacity,
    });
    circles.applyTuning({
      planeSize: next.planeSize,
      circleRadiusPx: next.circleRadiusPx,
      gapPx: next.gapPx,
      textureRepeat: next.textureRepeat,
      scrollSpeed: next.scrollSpeed,
      linearFilter: next.linearFilter,
      visible: next.circlesVisible ?? next.visible,
      circlePatternOpacity: next.circlePatternOpacity,
    });
  }

  function getTuning() {
    const f = fluid.getTuning();
    const c = circles.getTuning();
    return {
      fluidMeshEnabled: f.fluidMeshEnabled,
      fluidBaseColor: f.fluidBaseColor,
      fluidBlurPx: f.fluidBlurPx,
      fluidDriftSpeed: f.fluidDriftSpeed,
      fluidBlobOpacity: f.fluidBlobOpacity,
      fluidBrightness: f.fluidBrightness,
      fluidSaturation: f.fluidSaturation,
      fluidWhiteMix: f.fluidWhiteMix,
      fluidGradientMid: f.fluidGradientMid,
      fluidGradientMidAlpha: f.fluidGradientMidAlpha,
      fluidBlurCapPx: f.fluidBlurCapPx,
      fluidDriftAmplitude: f.fluidDriftAmplitude,
      fluidSheen: f.fluidSheen,
      fluidBlendMode: f.fluidBlendMode,
      fluidMeshOpacity: f.fluidMeshOpacity,
      fluidBlobs: f.fluidBlobs,
      blobColors: f.fluidBlobs.map((b) => b.color),
      circlePatternOpacity: c.circlePatternOpacity,
      circlesVisible: c.visible,
      circleRadiusPx: c.circleRadiusPx,
      gapPx: c.gapPx,
      tilePx: c.tilePx,
      textureRepeat: c.textureRepeat,
      scrollSpeed: c.scrollSpeed,
      planeSize: c.planeSize,
      fluidPlaneSize: f.planeSize,
      planeZ: c.planeZ,
      linearFilter: c.linearFilter,
      visible: f.fluidMeshEnabled || (c.visible && c.circlePatternOpacity > 0),
    };
  }

  function setBaseColor(color) {
    fluid.setBaseColor(color);
  }

  function setVictoryTint(color) {
    fluid.setVictoryTint(color);
  }

  function clearVictoryTint() {
    fluid.clearVictoryTint();
  }

  function fitFluidToView(camera) {
    const cover = estimateFluidPlaneCover({
      camera,
      planeZ: fluid.getTuning().planeZ,
    });
    fluid.applyTuning({ planeSize: cover });
    return cover;
  }

  function applyReferencePreset({ resetBlur = true } = {}) {
    const preset = buildFluidPresetFromBoard(readBoardContext());
    fluid.applyFluidPreset({
      fluidBlobs: preset.fluidBlobs,
      fluidBaseColor: preset.fluidBaseColor,
      ...(resetBlur ? { fluidBlurPx: FLUID_MESH_DEFAULTS.fluidBlurPx } : {}),
    });
    if (scene?.background?.isColor) {
      scene.background.setHex(preset.fluidBaseColor);
    }
    return preset;
  }

  function update(dt) {
    fluid.update(dt);
    circles.update(dt);
  }

  function dispose() {
    fluid.dispose();
    circles.dispose();
  }

  function syncSceneBackgroundFromFluid() {
    if (!scene?.background?.isColor) return;
    scene.background.setHex(fluid.getSceneBackgroundColor());
  }

  syncSceneBackgroundFromFluid();

  return {
    fluid,
    circles,
    update,
    applyTuning,
    getTuning,
    setBaseColor,
    setVictoryTint,
    clearVictoryTint,
    applyReferencePreset,
    fitFluidToView,
    setGetBoardContext,
    dispose,
    get mesh() {
      return circles.mesh;
    },
  };
}