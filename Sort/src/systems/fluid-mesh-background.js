import * as THREE from "three/webgpu";
import { PLANE_SIZE_MAX, PLANE_SIZE_MIN } from "./tessellated-circle-background.js";

export const FLUID_CANVAS_SIZE = 768;
export const FLUID_BLUR_MAX = 120;

export const REFERENCE_PASTEL_BLOBS = [
  { x: 0.1, y: 0.52, r: 0.58, color: 0xe8a0c8 },
  { x: 0.42, y: 0.32, r: 0.52, color: 0xfde8dc },
  { x: 0.7, y: 0.4, r: 0.5, color: 0x9ed8f5 },
  { x: 0.55, y: 0.74, r: 0.48, color: 0xb0ecd8 },
  { x: 0.85, y: 0.62, r: 0.38, color: 0xfff2a8 },
];

export const FLUID_PLANE_SIZE_MIN = 24;
export const FLUID_PLANE_SIZE_DEFAULT = 44;

export const FLUID_SCENE_BASE_MIN = 0xfffbf2;

export const FLUID_BLEND_MODES = ["normal", "screen"];

export const FLUID_MESH_DEFAULTS = {
  fluidMeshEnabled: true,
  fluidBaseColor: FLUID_SCENE_BASE_MIN,
  fluidPlaneSize: FLUID_PLANE_SIZE_DEFAULT,
  fluidBlurPx: 24,
  fluidDriftSpeed: 0,
  fluidBlobs: REFERENCE_PASTEL_BLOBS.map((b) => ({ ...b })),
  fluidBlobOpacity: 0.58,
  fluidBrightness: 1,
  fluidSaturation: 1,
  fluidWhiteMix: 0,
  fluidGradientMid: 0.55,
  fluidGradientMidAlpha: 0.45,
  fluidBlurCapPx: 56,
  fluidDriftAmplitude: 0.018,
  fluidSheen: 0,
  fluidBlendMode: "normal",
  fluidMeshOpacity: 1,
};

const _white = new THREE.Color(0xffffff);
const _hslScratch = { h: 0, s: 0, l: 0 };

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeFluidBlendMode(mode) {
  return mode === "screen" ? "screen" : "normal";
}

function canvasCompositeForBlendMode(mode) {
  return normalizeFluidBlendMode(mode) === "screen" ? "screen" : "source-over";
}

function applySaturationToColor(color, saturationMult) {
  if (Math.abs(saturationMult - 1) < 0.001) return color;
  color.getHSL(_hslScratch);
  color.setHSL(
    _hslScratch.h,
    Math.min(1, Math.max(0, _hslScratch.s * saturationMult)),
    _hslScratch.l,
  );
  return color;
}

function applyBrightnessFilter(sourceCanvas, brightness) {
  if (Math.abs(brightness - 1) < 0.001) return sourceCanvas;
  const out = document.createElement("canvas");
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return sourceCanvas;
  ctx.filter = `brightness(${brightness})`;
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.filter = "none";
  return out;
}

export function estimateFluidPlaneCover({ camera, planeZ = -10, margin = 1.18 } = {}) {
  if (!camera?.isPerspectiveCamera) return FLUID_PLANE_SIZE_DEFAULT;
  const dist = Math.abs(camera.position.z - planeZ);
  const vFov = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
  const visibleWidth = visibleHeight * (camera.aspect || 1);
  const cover = Math.max(visibleWidth, visibleHeight) * margin;
  return Math.min(PLANE_SIZE_MAX, Math.max(FLUID_PLANE_SIZE_MIN, cover));
}

export function resolveFluidPlaneSize(patternPlaneSize, explicitFluidPlaneSize) {
  const explicit = Number(explicitFluidPlaneSize);
  const base =
    Number.isFinite(explicit) && explicit > 0
      ? explicit
      : FLUID_PLANE_SIZE_DEFAULT;
  const floor = Math.max(FLUID_PLANE_SIZE_MIN, base);
  const pattern = Number(patternPlaneSize);
  if (Number.isFinite(pattern) && pattern >= 12) {
    return Math.min(PLANE_SIZE_MAX, Math.max(floor, pattern));
  }
  return Math.min(PLANE_SIZE_MAX, floor);
}

function hexToCss(hex) {
  const c = new THREE.Color(hex);
  return `#${c.getHexString()}`;
}

function parseHexColor(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value >>> 0;
  const parsed = Number.parseInt(String(value ?? "").replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed >>> 0 : fallback;
}

function cloneBlobs(blobs) {
  return blobs.map((b) => ({
    x: b.x,
    y: b.y,
    r: b.r,
    color: b.color,
  }));
}

function colorToRgba(hex, alpha) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
}

function computeVictoryFlatten(targetColor, restBaseHex = FLUID_MESH_DEFAULTS.fluidBaseColor) {
  const rest = new THREE.Color(restBaseHex);
  const target = targetColor instanceof THREE.Color ? targetColor : new THREE.Color(targetColor);
  const dr = target.r - rest.r;
  const dg = target.g - rest.g;
  const db = target.b - rest.b;
  return Math.min(1, Math.max(0, Math.hypot(dr, dg, db) * 2.4));
}

export function buildFluidMeshCanvas({
  width = FLUID_CANVAS_SIZE,
  height = FLUID_CANVAS_SIZE,
  baseColor,
  blobs,
  blurPx = 0,
  victoryTint = null,
  restBaseColor = FLUID_MESH_DEFAULTS.fluidBaseColor,
  fluidBlobOpacity = FLUID_MESH_DEFAULTS.fluidBlobOpacity,
  fluidBrightness = FLUID_MESH_DEFAULTS.fluidBrightness,
  fluidSaturation = FLUID_MESH_DEFAULTS.fluidSaturation,
  fluidWhiteMix = FLUID_MESH_DEFAULTS.fluidWhiteMix,
  fluidGradientMid = FLUID_MESH_DEFAULTS.fluidGradientMid,
  fluidGradientMidAlpha = FLUID_MESH_DEFAULTS.fluidGradientMidAlpha,
  fluidBlurCapPx = FLUID_MESH_DEFAULTS.fluidBlurCapPx,
  fluidSheen = FLUID_MESH_DEFAULTS.fluidSheen,
  fluidBlendMode = FLUID_MESH_DEFAULTS.fluidBlendMode,
}) {
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext("2d");
  if (!ctx) return scratch;

  const whiteMix = clampNumber(fluidWhiteMix, 0, 0.6, 0);
  const gradientMid = clampNumber(fluidGradientMid, 0.25, 0.75, 0.55);
  const gradientMidAlpha = clampNumber(fluidGradientMidAlpha, 0, 1, 0.45);
  const blobOpacity = clampNumber(fluidBlobOpacity, 0, 1, 0.58);
  const saturation = clampNumber(fluidSaturation, 0, 1.5, 1);
  const brightness = clampNumber(fluidBrightness, 0.6, 1.4, 1);
  const sheen = clampNumber(fluidSheen, 0, 1, 0);
  const blurCap = clampNumber(fluidBlurCapPx, 0, FLUID_BLUR_MAX, 56);
  const blobComposite = canvasCompositeForBlendMode(fluidBlendMode);

  const restBase = new THREE.Color(baseColor ?? restBaseColor);
  if (whiteMix > 0) restBase.lerp(_white, whiteMix);
  let drawBase = restBase.clone();
  let flatten = 0;
  if (victoryTint) {
    const tint =
      victoryTint instanceof THREE.Color ? victoryTint : new THREE.Color(victoryTint);
    flatten = computeVictoryFlatten(tint, restBaseColor);
    drawBase.copy(restBase).lerp(tint, flatten);
  }

  ctx.fillStyle = hexToCss(drawBase.getHex());
  ctx.fillRect(0, 0, width, height);

  const blobAlpha = blobOpacity * (1 - flatten * 0.5);
  ctx.globalCompositeOperation = blobComposite;

  for (const blob of blobs) {
    const bx = blob.x * width;
    const by = blob.y * height;
    const br = blob.r * Math.max(width, height);
    const blobColor = new THREE.Color(blob.color);
    applySaturationToColor(blobColor, saturation);
    if (victoryTint && flatten > 0) {
      const tint =
        victoryTint instanceof THREE.Color ? victoryTint : new THREE.Color(victoryTint);
      blobColor.lerp(tint, flatten * 0.88);
    }
    const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    gradient.addColorStop(0, colorToRgba(blobColor.getHex(), blobAlpha));
    gradient.addColorStop(
      gradientMid,
      colorToRgba(blobColor.getHex(), blobAlpha * gradientMidAlpha),
    );
    gradient.addColorStop(1, colorToRgba(blobColor.getHex(), 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  if (sheen > 0.001) {
    ctx.globalCompositeOperation = "screen";
    for (const blob of blobs) {
      const bx = blob.x * width;
      const by = blob.y * height;
      const br = blob.r * Math.max(width, height);
      const sheenR = br * 0.22;
      const highlight = ctx.createRadialGradient(bx, by, 0, bx, by, sheenR);
      const peak = sheen * 0.42 * (1 - flatten * 0.35);
      highlight.addColorStop(0, `rgba(255,255,255,${peak})`);
      highlight.addColorStop(0.55, `rgba(255,255,255,${peak * 0.35})`);
      highlight.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(bx, by, sheenR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = "source-over";

  let result = scratch;
  const effectiveBlur = Math.min(blurPx, blurCap);
  if (effectiveBlur > 0.5) {
    const blurred = document.createElement("canvas");
    blurred.width = width;
    blurred.height = height;
    const bctx = blurred.getContext("2d");
    if (bctx) {
      bctx.filter = `blur(${effectiveBlur}px)`;
      bctx.drawImage(scratch, 0, 0);
      bctx.filter = "none";
      result = blurred;
    }
  }

  return applyBrightnessFilter(result, brightness);
}

function fluidCanvasLookFromParams(params) {
  return {
    fluidBlobOpacity: params.fluidBlobOpacity,
    fluidBrightness: params.fluidBrightness,
    fluidSaturation: params.fluidSaturation,
    fluidWhiteMix: params.fluidWhiteMix,
    fluidGradientMid: params.fluidGradientMid,
    fluidGradientMidAlpha: params.fluidGradientMidAlpha,
    fluidBlurCapPx: params.fluidBlurCapPx,
    fluidSheen: params.fluidSheen,
    fluidBlendMode: params.fluidBlendMode,
  };
}

function createFluidLookParams(options = {}) {
  return {
    fluidBlobOpacity: clampNumber(
      options.fluidBlobOpacity,
      0,
      1,
      FLUID_MESH_DEFAULTS.fluidBlobOpacity,
    ),
    fluidBrightness: clampNumber(
      options.fluidBrightness,
      0.6,
      1.4,
      FLUID_MESH_DEFAULTS.fluidBrightness,
    ),
    fluidSaturation: clampNumber(
      options.fluidSaturation,
      0,
      1.5,
      FLUID_MESH_DEFAULTS.fluidSaturation,
    ),
    fluidWhiteMix: clampNumber(options.fluidWhiteMix, 0, 0.6, FLUID_MESH_DEFAULTS.fluidWhiteMix),
    fluidGradientMid: clampNumber(
      options.fluidGradientMid,
      0.25,
      0.75,
      FLUID_MESH_DEFAULTS.fluidGradientMid,
    ),
    fluidGradientMidAlpha: clampNumber(
      options.fluidGradientMidAlpha,
      0,
      1,
      FLUID_MESH_DEFAULTS.fluidGradientMidAlpha,
    ),
    fluidBlurCapPx: clampNumber(
      options.fluidBlurCapPx,
      0,
      FLUID_BLUR_MAX,
      FLUID_MESH_DEFAULTS.fluidBlurCapPx,
    ),
    fluidDriftAmplitude: clampNumber(
      options.fluidDriftAmplitude,
      0,
      0.06,
      FLUID_MESH_DEFAULTS.fluidDriftAmplitude,
    ),
    fluidSheen: clampNumber(options.fluidSheen, 0, 1, FLUID_MESH_DEFAULTS.fluidSheen),
    fluidBlendMode: normalizeFluidBlendMode(
      options.fluidBlendMode ?? FLUID_MESH_DEFAULTS.fluidBlendMode,
    ),
    fluidMeshOpacity: clampNumber(
      options.fluidMeshOpacity,
      0,
      1,
      FLUID_MESH_DEFAULTS.fluidMeshOpacity,
    ),
  };
}

export function createFluidMeshBackground({
  scene,
  planeSize = FLUID_PLANE_SIZE_DEFAULT,
  planeZ = -10,
  baseColor = FLUID_MESH_DEFAULTS.fluidBaseColor,
  blobs = FLUID_MESH_DEFAULTS.fluidBlobs,
  blurPx = FLUID_MESH_DEFAULTS.fluidBlurPx,
  driftSpeed = FLUID_MESH_DEFAULTS.fluidDriftSpeed,
  enabled = true,
  ...lookOptions
} = {}) {
  let restBaseColor = baseColor;
  const restingBlobs = cloneBlobs(blobs);
  let victoryTint = null;
  let driftPhase = 0;
  const look = createFluidLookParams(lookOptions);

  const params = {
    fluidMeshEnabled: enabled !== false,
    fluidBaseColor: restBaseColor,
    fluidBlurPx: blurPx,
    fluidDriftSpeed: driftSpeed,
    fluidBlobs: cloneBlobs(blobs),
    planeSize: Math.min(
      PLANE_SIZE_MAX,
      Math.max(FLUID_PLANE_SIZE_MIN, Number(planeSize) || FLUID_PLANE_SIZE_DEFAULT),
    ),
    planeZ,
    ...look,
  };

  const texture = new THREE.CanvasTexture(
    buildFluidMeshCanvas({
      baseColor: params.fluidBaseColor,
      blobs: params.fluidBlobs,
      blurPx: params.fluidBlurPx,
      ...fluidCanvasLookFromParams(params),
    }),
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthWrite: false,
    depthTest: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(params.planeSize, params.planeSize), material);
  mesh.position.set(0, 0, params.planeZ);
  mesh.renderOrder = -22;
  mesh.userData.skipBubbleEnvironment = true;
  mesh.visible = params.fluidMeshEnabled;
  scene.add(mesh);

  function syncMaterialOpacity() {
    const opacity = params.fluidMeshOpacity;
    material.transparent = opacity < 0.999;
    material.opacity = opacity;
  }
  syncMaterialOpacity();

  function rebuildTexture() {
    const drifted = params.fluidBlobs.map((b, i) => {
      const angle = driftPhase + i * 1.7;
      const amp = params.fluidDriftAmplitude;
      return {
        ...b,
        x: Math.min(1, Math.max(0, b.x + Math.cos(angle) * amp)),
        y: Math.min(1, Math.max(0, b.y + Math.sin(angle) * amp)),
      };
    });
    const nextCanvas = buildFluidMeshCanvas({
      baseColor: params.fluidBaseColor,
      blobs: drifted,
      blurPx: params.fluidBlurPx,
      victoryTint,
      restBaseColor: params.fluidBaseColor,
      ...fluidCanvasLookFromParams(params),
    });
    texture.image = nextCanvas;
    texture.needsUpdate = true;
  }

  function resizePlaneIfNeeded(prevPlaneSize) {
    if (params.planeSize === prevPlaneSize) return;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(params.planeSize, params.planeSize);
  }

  function applyFluidPreset({ fluidBlobs, fluidBaseColor, fluidBlurPx } = {}) {
    if (Array.isArray(fluidBlobs)) params.fluidBlobs = cloneBlobs(fluidBlobs);
    if (fluidBaseColor != null) {
      params.fluidBaseColor = parseHexColor(fluidBaseColor, params.fluidBaseColor);
      restBaseColor = params.fluidBaseColor;
    }
    if (fluidBlurPx != null) params.fluidBlurPx = fluidBlurPx;
    victoryTint = null;
    rebuildTexture();
    if (scene?.background?.isColor && !victoryTint) {
      scene.background.setHex(params.fluidBaseColor);
    }
  }

  function applyReferencePreset() {
    applyFluidPreset({
      fluidBlobs: REFERENCE_PASTEL_BLOBS,
      fluidBaseColor: FLUID_MESH_DEFAULTS.fluidBaseColor,
      fluidBlurPx: FLUID_MESH_DEFAULTS.fluidBlurPx,
    });
  }

  function applyTuning(next = {}) {
    const prevPlane = params.planeSize;
    if (next.fluidMeshEnabled != null) params.fluidMeshEnabled = next.fluidMeshEnabled !== false;
    if (next.fluidBaseColor != null) {
      params.fluidBaseColor = parseHexColor(next.fluidBaseColor, params.fluidBaseColor);
      restBaseColor = params.fluidBaseColor;
    }
    if (next.fluidBlurPx != null) {
      params.fluidBlurPx = Math.min(FLUID_BLUR_MAX, Math.max(0, Number(next.fluidBlurPx)));
    }
    if (next.fluidDriftSpeed != null) params.fluidDriftSpeed = Math.max(0, Number(next.fluidDriftSpeed));
    if (next.planeSize != null) {
      params.planeSize = Math.min(
        PLANE_SIZE_MAX,
        Math.max(FLUID_PLANE_SIZE_MIN, Number(next.planeSize) || FLUID_PLANE_SIZE_DEFAULT),
      );
    }
    if (next.planeZ != null) params.planeZ = Number(next.planeZ);
    if (Array.isArray(next.fluidBlobs)) {
      params.fluidBlobs = cloneBlobs(next.fluidBlobs);
    }
    if (next.blobColors && Array.isArray(next.blobColors)) {
      next.blobColors.forEach((hex, i) => {
        if (params.fluidBlobs[i]) params.fluidBlobs[i].color = parseHexColor(hex, params.fluidBlobs[i].color);
      });
    }
    if (next.fluidBlobOpacity != null) {
      params.fluidBlobOpacity = clampNumber(next.fluidBlobOpacity, 0, 1, params.fluidBlobOpacity);
    }
    if (next.fluidBrightness != null) {
      params.fluidBrightness = clampNumber(next.fluidBrightness, 0.6, 1.4, params.fluidBrightness);
    }
    if (next.fluidSaturation != null) {
      params.fluidSaturation = clampNumber(next.fluidSaturation, 0, 1.5, params.fluidSaturation);
    }
    if (next.fluidWhiteMix != null) {
      params.fluidWhiteMix = clampNumber(next.fluidWhiteMix, 0, 0.6, params.fluidWhiteMix);
    }
    if (next.fluidGradientMid != null) {
      params.fluidGradientMid = clampNumber(next.fluidGradientMid, 0.25, 0.75, params.fluidGradientMid);
    }
    if (next.fluidGradientMidAlpha != null) {
      params.fluidGradientMidAlpha = clampNumber(
        next.fluidGradientMidAlpha,
        0,
        1,
        params.fluidGradientMidAlpha,
      );
    }
    if (next.fluidBlurCapPx != null) {
      params.fluidBlurCapPx = clampNumber(next.fluidBlurCapPx, 0, FLUID_BLUR_MAX, params.fluidBlurCapPx);
    }
    if (next.fluidDriftAmplitude != null) {
      params.fluidDriftAmplitude = clampNumber(
        next.fluidDriftAmplitude,
        0,
        0.06,
        params.fluidDriftAmplitude,
      );
    }
    if (next.fluidSheen != null) {
      params.fluidSheen = clampNumber(next.fluidSheen, 0, 1, params.fluidSheen);
    }
    if (next.fluidBlendMode != null) {
      params.fluidBlendMode = normalizeFluidBlendMode(next.fluidBlendMode);
    }
    if (next.fluidMeshOpacity != null) {
      params.fluidMeshOpacity = clampNumber(next.fluidMeshOpacity, 0, 1, params.fluidMeshOpacity);
    }
    mesh.visible = params.fluidMeshEnabled;
    resizePlaneIfNeeded(prevPlane);
    if (params.planeZ !== mesh.position.z) mesh.position.z = params.planeZ;
    syncMaterialOpacity();
    rebuildTexture();
    if (scene?.background?.isColor && !victoryTint && next.fluidBaseColor != null) {
      scene.background.setHex(params.fluidBaseColor);
    }
  }

  function setBaseColor(color) {
    if (!color) return;
    params.fluidBaseColor =
      color instanceof THREE.Color ? color.getHex() : parseHexColor(color, params.fluidBaseColor);
    restBaseColor = params.fluidBaseColor;
    rebuildTexture();
    if (scene?.background?.isColor && !victoryTint) {
      scene.background.setHex(params.fluidBaseColor);
    }
  }

  function setVictoryTint(color) {
    if (!color) return;
    victoryTint = color instanceof THREE.Color ? color.clone() : new THREE.Color(color);
    rebuildTexture();
    if (scene?.background?.isColor) {
      scene.background.copy(victoryTint);
    }
  }

  function clearVictoryTint() {
    victoryTint = null;
    rebuildTexture();
    if (scene?.background?.isColor) {
      scene.background.setHex(params.fluidBaseColor);
    }
  }

  function getTuning() {
    return {
      ...params,
      fluidBlobs: cloneBlobs(params.fluidBlobs),
    };
  }

  function getSceneBackgroundColor() {
    if (victoryTint) return victoryTint.getHex();
    return params.fluidBaseColor;
  }

  let driftRebuildAccum = 0;

  function update(dt) {
    if (params.fluidDriftSpeed <= 0 || !params.fluidMeshEnabled) return;
    driftPhase += params.fluidDriftSpeed * Math.max(0, dt);
    driftRebuildAccum += dt;
    if (driftRebuildAccum < 0.12) return;
    driftRebuildAccum = 0;
    rebuildTexture();
  }

  function dispose() {
    scene.remove(mesh);
    mesh.geometry?.dispose();
    material.dispose();
    texture.dispose();
  }

  return {
    mesh,
    update,
    applyTuning,
    getTuning,
    setBaseColor,
    setVictoryTint,
    clearVictoryTint,
    applyReferencePreset,
    applyFluidPreset,
    getSceneBackgroundColor,
    dispose,
    getRestingBlobs: () => cloneBlobs(restingBlobs),
  };
}