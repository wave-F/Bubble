import * as THREE from "three/webgpu";

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function createGridBoardSystem({ scene } = {}) {
  let root = null;
  let fadeState = null;

  function clear() {
    fadeState = null;
    if (!root) return;
    scene.remove(root);
    root.geometry?.dispose();
    root.material?.dispose();
    root = null;
  }

  function show(layout, options = {}) {
    clear();
    if (!layout) return;

    const { left, right, top, bottom, cellSize, gridSize } = layout;
    if (!Number.isFinite(cellSize) || !Number.isInteger(gridSize) || gridSize < 2) return;

    const points = [];
    const z = 0.04;

    for (let i = 0; i <= gridSize; i += 1) {
      const x = left + i * cellSize;
      points.push(x, top, z, x, bottom, z);
    }

    for (let i = 0; i <= gridSize; i += 1) {
      const y = top - i * cellSize;
      points.push(left, y, z, right, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));

    const targetOpacity = 0.62;
    const material = new THREE.LineBasicMaterial({
      color: 0xc8e8ff,
      transparent: true,
      opacity: options.fadeIn ? 0 : targetOpacity,
      depthWrite: false,
    });

    root = new THREE.LineSegments(geometry, material);
    root.renderOrder = 4;
    scene.add(root);

    if (options.fadeIn) {
      fadeState = {
        mode: "in",
        elapsed: 0,
        duration: 0.18,
        start: 0,
        target: targetOpacity,
      };
    }
  }

  function fadeOut(duration = 0.5) {
    if (!root?.material) return;

    fadeState = {
      mode: "out",
      elapsed: 0,
      duration: Math.max(0.05, duration),
      start: root.material.opacity,
      target: 0,
    };
  }

  function update(dt) {
    if (!fadeState || !root?.material) return;

    fadeState.elapsed += dt;
    const t = smoothstep(fadeState.elapsed / fadeState.duration);

    if (fadeState.mode === "out") {
      root.material.opacity = fadeState.start + (fadeState.target - fadeState.start) * t;
    } else {
      root.material.opacity = fadeState.target * t;
    }

    if (t >= 1) fadeState = null;
  }

  return {
    show,
    clear,
    fadeOut,
    update,
  };
}