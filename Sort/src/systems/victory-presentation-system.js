import * as THREE from "three/webgpu";

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function createVictoryPresentation({
  phoneFrameEl,
  bgFrom = 0xfffbf2,
  getTuning,
  getPaletteTarget,
} = {}) {
  const fromColor = new THREE.Color(bgFrom);
  const toColor = new THREE.Color(0xe8f4ff);
  const workColor = new THREE.Color();

  let active = false;
  let elapsed = 0;

  function readMotionDuration() {
    return Math.max(0.1, getTuning?.().motionDuration ?? 0.65);
  }

  function syncTargetColor() {
    const paletteHex = getPaletteTarget?.();
    if (paletteHex != null) {
      toColor.setHex(paletteHex >>> 0);
      return;
    }
    const hex = getTuning?.().bgToHex ?? "e8f4ff";
    const parsed = Number.parseInt(String(hex).replace("#", ""), 16);
    if (Number.isFinite(parsed)) toColor.setHex(parsed);
  }

  function start({ gridBoardSystem } = {}) {
    active = true;
    elapsed = 0;
    syncTargetColor();
    phoneFrameEl?.classList.add("is-victory-presentation");
    gridBoardSystem?.fadeOut?.(readMotionDuration());
  }

  function update(dt, { scene } = {}) {
    if (!active || !scene) return;

    syncTargetColor();
    elapsed += dt;
    const motionDuration = readMotionDuration();
    const t = smoothstep(elapsed / motionDuration);
    workColor.copy(fromColor).lerp(toColor, t);
    scene.background = workColor;
  }

  function stop() {
    phoneFrameEl?.classList.remove("is-victory-presentation");
  }

  function reset({ scene } = {}) {
    active = false;
    elapsed = 0;
    phoneFrameEl?.classList.remove("is-victory-presentation");

    if (scene) {
      scene.background = fromColor.clone();
    }
  }

  return {
    start,
    update,
    stop,
    reset,
  };
}