export const BLUE_REFERENCE = {
  bubble: 0x00a6ff,
  panelBg: 0xe8f4ff,
  title: 0x2c5f8f,
  buttonFrom: 0x3d89d6,
  buttonTo: 0x61a8e6,
};

const WHITE = 0xffffff;
const DARK_INK = 0x1a2a3d;

const CSS_VAR_KEYS = [
  "--win-scene-bg",
  "--win-panel-bg",
  "--win-title-color",
  "--win-text-muted",
  "--win-pill-bg",
  "--win-pill-text",
  "--win-pill-border",
  "--win-btn-from",
  "--win-btn-to",
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const n = Number(hex) >>> 0;
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r, g, b) {
  const ri = Math.round(clamp(r, 0, 255));
  const gi = Math.round(clamp(g, 0, 255));
  const bi = Math.round(clamp(b, 0, 255));
  return (ri << 16) | (gi << 8) | bi;
}

function mixHex(background, foreground, t) {
  const mixT = clamp(t, 0, 1);
  const bg = hexToRgb(background);
  const fg = hexToRgb(foreground);
  return rgbToHex(
    bg.r + (fg.r - bg.r) * mixT,
    bg.g + (fg.g - bg.g) * mixT,
    bg.b + (fg.b - bg.b) * mixT,
  );
}

function solveMixT(background, foreground, target) {
  const bg = hexToRgb(background);
  const fg = hexToRgb(foreground);
  const tg = hexToRgb(target);
  const samples = [];

  for (const key of ["r", "g", "b"]) {
    const denom = fg[key] - bg[key];
    if (Math.abs(denom) > 0.5) {
      samples.push((tg[key] - bg[key]) / denom);
    }
  }

  if (!samples.length) return 0.12;
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return clamp(avg, 0.04, 0.22);
}

const MIX_T = {
  bg: solveMixT(WHITE, BLUE_REFERENCE.bubble, BLUE_REFERENCE.panelBg),
  btnFrom: clamp(solveMixT(WHITE, BLUE_REFERENCE.bubble, BLUE_REFERENCE.buttonFrom), 0.35, 0.9),
  btnTo: clamp(solveMixT(WHITE, BLUE_REFERENCE.bubble, BLUE_REFERENCE.buttonTo), 0.45, 0.92),
};

const REF_TITLE_HSL = (() => {
  const { r, g, b } = hexToRgb(BLUE_REFERENCE.title);
  return rgbToHsl(r, g, b);
})();

const REF_BUBBLE_HSL = (() => {
  const { r, g, b } = hexToRgb(BLUE_REFERENCE.bubble);
  return rgbToHsl(r, g, b);
})();

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s, l };
}

function hslToRgb(h, s, l) {
  const hn = (((h % 360) + 360) % 360) / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hn * 6) % 2 - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  const segment = hn * 6;

  if (segment < 1) {
    rp = c; gp = x;
  } else if (segment < 2) {
    rp = x; gp = c;
  } else if (segment < 3) {
    gp = c; bp = x;
  } else if (segment < 4) {
    gp = x; bp = c;
  } else if (segment < 5) {
    rp = x; bp = c;
  } else {
    rp = c; bp = x;
  }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hexToCss(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function deriveTitleColor(bubbleHex) {
  const bubble = hexToHsl(bubbleHex);
  const satScale = bubble.s / Math.max(0.12, REF_BUBBLE_HSL.s);
  return hslToHex(
    bubble.h,
    clamp(REF_TITLE_HSL.s * satScale, 0.38, 0.82),
    clamp(REF_TITLE_HSL.l, 0.28, 0.4),
  );
}

export function getBubbleHex(colors, colorId) {
  if (!Array.isArray(colors)) return BLUE_REFERENCE.bubble;

  const index = Number(colorId);
  if (Number.isInteger(index) && index >= 0 && index < colors.length && colors[index]?.base != null) {
    return Number(colors[index].base) >>> 0;
  }

  const id = colorId ?? "blue";
  const found = colors.find((c) => c.id === id);
  if (found?.base != null) return Number(found.base) >>> 0;

  return BLUE_REFERENCE.bubble;
}

export function deriveVictoryPalette(bubbleHex = BLUE_REFERENCE.bubble) {
  const bubble = Number(bubbleHex) >>> 0;
  const sceneBg = mixHex(WHITE, bubble, MIX_T.bg);
  const title = deriveTitleColor(bubble);
  const textMuted = mixHex(title, bubble, 0.22);
  const buttonFrom = mixHex(WHITE, bubble, MIX_T.btnFrom);
  const buttonTo = mixHex(WHITE, bubble, MIX_T.btnTo);

  let pillText = title;
  if (contrastRatio(title, sceneBg) < 3.2) {
    pillText = contrastRatio(WHITE, sceneBg) >= contrastRatio(title, sceneBg)
      ? WHITE
      : DARK_INK;
  }

  const pillBg = mixHex(sceneBg, title, 0.4);
  const pillBorder = mixHex(sceneBg, bubble, 0.24);

  return {
    bubbleHex: bubble,
    sceneBg,
    panelBg: sceneBg,
    title,
    textMuted,
    pillBg,
    pillText,
    pillBorder,
    buttonFrom,
    buttonTo,
  };
}

export function applyVictoryPaletteToDom(palette, root = document.documentElement) {
  if (!palette || !root?.style) return;
  root.style.setProperty("--win-scene-bg", hexToCss(palette.sceneBg));
  root.style.setProperty("--win-panel-bg", hexToCss(palette.panelBg));
  root.style.setProperty("--win-title-color", hexToCss(palette.title));
  root.style.setProperty("--win-text-muted", hexToCss(palette.textMuted));
  root.style.setProperty("--win-pill-bg", hexToCss(palette.pillBg));
  root.style.setProperty("--win-pill-text", hexToCss(palette.pillText));
  root.style.setProperty("--win-pill-border", hexToCss(palette.pillBorder));
  root.style.setProperty("--win-btn-from", hexToCss(palette.buttonFrom));
  root.style.setProperty("--win-btn-to", hexToCss(palette.buttonTo));
}

export function clearVictoryPaletteFromDom(root = document.documentElement) {
  if (!root?.style) return;
  for (const key of CSS_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

export function resolveVictoryPalette({
  colors,
  colorId,
  useBubblePalette = true,
  manualBgHex,
}) {
  if (!useBubblePalette) {
    const parsed = Number.parseInt(String(manualBgHex ?? "").replace("#", ""), 16);
    const sceneBg = Number.isFinite(parsed) ? parsed : BLUE_REFERENCE.panelBg;
    return {
      ...deriveVictoryPalette(BLUE_REFERENCE.bubble),
      sceneBg,
      panelBg: sceneBg,
    };
  }
  const bubbleHex = getBubbleHex(colors, colorId);
  return deriveVictoryPalette(bubbleHex);
}