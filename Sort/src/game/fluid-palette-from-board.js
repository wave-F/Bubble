import * as THREE from "three/webgpu";
import { FLUID_SCENE_BASE_MIN, REFERENCE_PASTEL_BLOBS } from "../systems/fluid-mesh-background.js";
import { getBubbleHex } from "./victory-palette.js";

const _hsl = { h: 0, s: 0, l: 0 };
const _color = new THREE.Color();
const _white = new THREE.Color(0xffffff);

export function complementPastelHex(hex, { hueShift = 0.5, satScale = 0.38, lightness = 0.91 } = {}) {
  _color.setHex(hex >>> 0);
  _color.getHSL(_hsl);
  _color.setHSL(
    (_hsl.h + hueShift + 1) % 1,
    Math.min(0.48, Math.max(0.1, _hsl.s * satScale)),
    lightness,
  );
  _color.lerp(_white, 0.35);
  return _color.getHex();
}

export function variantPastelHex(hex, hueDelta = 0) {
  _color.setHex(hex >>> 0);
  _color.getHSL(_hsl);
  _color.setHSL(
    (_hsl.h + hueDelta + 1) % 1,
    Math.min(0.45, Math.max(0.08, _hsl.s * 0.35)),
    0.9,
  );
  _color.lerp(_white, 0.32);
  return _color.getHex();
}

export function collectBoardColorHexes({ fruits, levelCells, colors } = {}) {
  const counts = new Map();

  const bump = (colorId) => {
    const hex = getBubbleHex(colors, colorId);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };

  if (Array.isArray(fruits)) {
    for (const fruit of fruits) {
      if (!fruit?.active || fruit.sliced) continue;
      bump(fruit.colorId);
    }
  }

  if (counts.size === 0 && Array.isArray(levelCells)) {
    for (const colorId of levelCells) {
      if (colorId == null) continue;
      bump(colorId);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

function buildBlobColorList(boardHexes) {
  const layoutCount = REFERENCE_PASTEL_BLOBS.length;
  if (!boardHexes.length) {
    return REFERENCE_PASTEL_BLOBS.map((b) => b.color);
  }

  const complements = boardHexes.map((hex) => complementPastelHex(hex));
  const primary = complements[0];
  const colors = [];

  for (let i = 0; i < layoutCount; i += 1) {
    if (i < complements.length) {
      colors.push(complements[i]);
      continue;
    }
    const variantHue = (i - complements.length + 1) * 0.07;
    colors.push(variantPastelHex(primary, variantHue));
  }

  return colors;
}

export function deriveFluidBaseFromBlobColors(blobColors) {
  if (!blobColors?.length) return FLUID_SCENE_BASE_MIN;
  const mix = new THREE.Color(FLUID_SCENE_BASE_MIN);
  const sample = new THREE.Color();
  for (const hex of blobColors) {
    sample.setHex(hex);
    mix.lerp(sample, 0.06 / blobColors.length);
  }
  mix.lerp(_white, 0.55);
  const floor = new THREE.Color(FLUID_SCENE_BASE_MIN);
  if (mix.r < floor.r) mix.r = floor.r;
  if (mix.g < floor.g) mix.g = floor.g;
  if (mix.b < floor.b) mix.b = floor.b;
  return mix.getHex();
}

export function buildFluidPresetFromBoard(context = {}) {
  const boardHexes = collectBoardColorHexes(context);
  if (!boardHexes.length) {
    return {
      fluidBlobs: REFERENCE_PASTEL_BLOBS.map((b) => ({ ...b })),
      fluidBaseColor: FLUID_SCENE_BASE_MIN,
      blobColors: REFERENCE_PASTEL_BLOBS.map((b) => b.color),
      fromBoard: false,
    };
  }

  const blobColors = buildBlobColorList(boardHexes);
  const fluidBlobs = REFERENCE_PASTEL_BLOBS.map((layout, i) => ({
    x: layout.x,
    y: layout.y,
    r: layout.r,
    color: blobColors[i] ?? layout.color,
  }));

  return {
    fluidBlobs,
    fluidBaseColor: deriveFluidBaseFromBlobColors(blobColors),
    blobColors,
    fromBoard: true,
  };
}