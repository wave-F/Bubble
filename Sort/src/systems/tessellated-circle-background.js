import * as THREE from "three/webgpu";

export const TILE_PX_MIN = 16;
export const TILE_PX_MAX = 192;
export const GAP_PX_MAX = 64;
export const PLANE_SIZE_MIN = 0.1;
export const PLANE_SIZE_MAX = 80;

export const TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS = {
  baseColor: 0xfffbf2,
  circleColor: 0xb8d4eb,
  circleRadiusPx: 28,
  gapPx: 40,
  scrollSpeed: 0.08,
  planeSize: 36,
  planeZ: -10,
  textureRepeat: 10,
  linearFilter: true,
  visible: true,
  circlePatternOpacity: 1,
  transparentPattern: false,
};

export function deriveTilePx(circleRadiusPx, gapPx) {
  const radius = Math.max(1, Math.round(circleRadiusPx));
  const gap = Math.max(0, Math.round(gapPx));
  return Math.min(TILE_PX_MAX, Math.max(TILE_PX_MIN, radius * 2 + gap));
}

function syncRadiusGapAndTile(params) {
  params.circleRadiusPx = Math.max(1, Math.round(params.circleRadiusPx));
  params.gapPx = Math.max(0, Math.min(GAP_PX_MAX, Math.round(params.gapPx)));

  let tilePx = deriveTilePx(params.circleRadiusPx, params.gapPx);
  if (tilePx >= TILE_PX_MAX) {
    const maxGap = TILE_PX_MAX - params.circleRadiusPx * 2;
    params.gapPx = Math.max(0, Math.min(params.gapPx, maxGap));
    tilePx = deriveTilePx(params.circleRadiusPx, params.gapPx);
  }

  const maxRadius = Math.floor((tilePx - 1) / 2);
  if (params.circleRadiusPx > maxRadius) {
    params.circleRadiusPx = Math.max(1, maxRadius);
    tilePx = deriveTilePx(params.circleRadiusPx, params.gapPx);
  }

  params.tilePx = tilePx;
}

function hexToCss(hex) {
  const c = new THREE.Color(hex);
  return `#${c.getHexString()}`;
}

function applyTextureSampling(texture, linearFilter) {
  if (linearFilter) {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  } else {
    texture.generateMipmaps = false;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
  }
}

function buildTileCanvas({
  tilePx,
  circleRadiusPx,
  baseColor,
  circleColor,
  smoothEdges,
  transparentPattern,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = tilePx;
  canvas.height = tilePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, tilePx, tilePx);
  if (!transparentPattern) {
    ctx.fillStyle = hexToCss(baseColor);
    ctx.fillRect(0, 0, tilePx, tilePx);
  }

  ctx.fillStyle = hexToCss(circleColor);
  ctx.imageSmoothingEnabled = smoothEdges !== false;
  const cx = tilePx * 0.5;
  const cy = tilePx * 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, circleRadiusPx, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export function createTessellatedCircleBackground({
  scene,
  baseColor = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.baseColor,
  circleColor = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.circleColor,
  circleRadiusPx = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.circleRadiusPx,
  gapPx = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.gapPx,
  tilePx: legacyTilePx,
  scrollSpeed = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.scrollSpeed,
  planeSize = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.planeSize,
  planeZ = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.planeZ,
  textureRepeat = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.textureRepeat,
  linearFilter = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.linearFilter,
  visible = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.visible,
  circlePatternOpacity = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.circlePatternOpacity,
  transparentPattern = TESSELLATED_CIRCLE_BACKGROUND_DEFAULTS.transparentPattern,
} = {}) {
  let baseHex = baseColor;
  const circleHex = circleColor;

  const params = {
    circleRadiusPx,
    gapPx:
      legacyTilePx != null
        ? Math.max(0, Math.round(legacyTilePx) - circleRadiusPx * 2)
        : gapPx,
    tilePx: TILE_PX_MIN,
    textureRepeat,
    scrollSpeed,
    planeSize: Math.min(PLANE_SIZE_MAX, Math.max(PLANE_SIZE_MIN, Number(planeSize))),
    planeZ,
    linearFilter: linearFilter !== false,
    visible: visible !== false,
    circlePatternOpacity: Math.min(1, Math.max(0, Number(circlePatternOpacity))),
    transparentPattern: transparentPattern === true,
  };
  syncRadiusGapAndTile(params);

  const canvas = buildTileCanvas({
    tilePx: params.tilePx,
    circleRadiusPx: params.circleRadiusPx,
    baseColor: baseHex,
    circleColor: circleHex,
    smoothEdges: params.linearFilter,
    transparentPattern: params.transparentPattern,
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(params.textureRepeat, params.textureRepeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = false;
  applyTextureSampling(texture, params.linearFilter);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: params.transparentPattern,
    alphaTest: params.transparentPattern ? 0.02 : 0,
    opacity: params.transparentPattern ? params.circlePatternOpacity : 1,
    depthWrite: false,
    depthTest: true,
  });

  const geometry = new THREE.PlaneGeometry(params.planeSize, params.planeSize);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, params.planeZ);
  mesh.renderOrder = -20;
  mesh.userData.skipBubbleEnvironment = true;
  mesh.visible = params.visible && params.circlePatternOpacity > 0;
  scene.add(mesh);

  const offset = { x: 0, y: 0 };

  function rebuildTileImage() {
    const nextCanvas = buildTileCanvas({
      tilePx: params.tilePx,
      circleRadiusPx: params.circleRadiusPx,
      baseColor: baseHex,
      circleColor: circleHex,
      smoothEdges: params.linearFilter,
      transparentPattern: params.transparentPattern,
    });
    texture.image = nextCanvas;
    applyTextureSampling(texture, params.linearFilter);
    texture.needsUpdate = true;
  }

  function resizePlaneIfNeeded(prevPlaneSize) {
    if (params.planeSize === prevPlaneSize) return;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(params.planeSize, params.planeSize);
  }

  function applyTuning(next = {}) {
    const prev = { ...params };

    if (next.circleRadiusPx != null) {
      params.circleRadiusPx = Number(next.circleRadiusPx);
    }
    if (next.gapPx != null) {
      params.gapPx = Number(next.gapPx);
    }
    if (next.gapPx == null && next.tilePx != null && next.circleRadiusPx == null) {
      params.gapPx = Math.max(0, Math.round(next.tilePx) - params.circleRadiusPx * 2);
    }

    syncRadiusGapAndTile(params);

    if (next.textureRepeat != null) {
      params.textureRepeat = Math.max(1, Number(next.textureRepeat));
    }
    if (next.scrollSpeed != null) params.scrollSpeed = Math.max(0, Number(next.scrollSpeed));
    if (next.planeSize != null) {
      params.planeSize = Math.min(
        PLANE_SIZE_MAX,
        Math.max(PLANE_SIZE_MIN, Number(next.planeSize)),
      );
    }
    if (next.planeZ != null) params.planeZ = Number(next.planeZ);
    if (next.linearFilter != null) params.linearFilter = next.linearFilter !== false;
    if (next.visible != null) params.visible = next.visible !== false;
    if (next.circlePatternOpacity != null) {
      params.circlePatternOpacity = Math.min(1, Math.max(0, Number(next.circlePatternOpacity)));
    }

    material.transparent = params.transparentPattern;
    material.opacity = params.transparentPattern ? params.circlePatternOpacity : 1;
    material.needsUpdate = true;

    const tileChanged =
      params.tilePx !== prev.tilePx || params.circleRadiusPx !== prev.circleRadiusPx;
    const filterChanged = params.linearFilter !== prev.linearFilter;

    if (tileChanged || filterChanged) {
      rebuildTileImage();
    }

    if (params.textureRepeat !== prev.textureRepeat) {
      texture.repeat.set(params.textureRepeat, params.textureRepeat);
    }

    resizePlaneIfNeeded(prev.planeSize);

    if (params.planeZ !== prev.planeZ) {
      mesh.position.z = params.planeZ;
    }

    mesh.visible = params.visible && params.circlePatternOpacity > 0;
  }

  function getTuning() {
    return { ...params };
  }

  function setBaseColor(color) {
    if (!color) return;
    if (color.isColor) {
      baseHex = color.getHex();
    } else if (typeof color === "number") {
      baseHex = color;
    } else {
      baseHex = new THREE.Color(color).getHex();
    }
    rebuildTileImage();
    if (scene?.background?.isColor) {
      scene.background.setHex(baseHex);
    }
  }

  function update(dt) {
    const step = params.scrollSpeed * Math.max(0, dt);
    offset.x = (offset.x + step) % 1;
    offset.y = (offset.y + step) % 1;
    texture.offset.set(offset.x, offset.y);
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
    setBaseColor,
    applyTuning,
    getTuning,
    dispose,
    getBaseColor: () => baseHex,
  };
}