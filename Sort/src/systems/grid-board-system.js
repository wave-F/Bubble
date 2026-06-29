import * as THREE from "three/webgpu";

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
        elapsed: 0,
        duration: 0.18,
        target: targetOpacity,
      };
    }
  }

  function update(dt) {
    if (!fadeState || !root?.material) return;

    fadeState.elapsed += dt;
    const t = Math.min(fadeState.elapsed / fadeState.duration, 1);
    const smooth = t * t * (3 - 2 * t);
    root.material.opacity = fadeState.target * smooth;
    if (t >= 1) fadeState = null;
  }

  return {
    show,
    clear,
    update,
  };
}