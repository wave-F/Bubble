import * as THREE from "three/webgpu";
import { DIRECTION_DELTA } from "./mechanism-dye-logic.js";

const workAxis = new THREE.Vector3();
const workLateral = new THREE.Vector3();
const workOrigin = new THREE.Vector3();

function gridDirectionToWorld(direction, target = workAxis) {
  switch (direction) {
    case "right":
      return target.set(1, 0, 0);
    case "left":
      return target.set(-1, 0, 0);
    case "up":
      return target.set(0, 1, 0);
    case "down":
      return target.set(0, -1, 0);
    default:
      return target.set(0, 1, 0);
  }
}

function countRaySteps(entity) {
  const direction = entity.mechanismDirection;
  const size = entity.gridSize > 0 ? entity.gridSize : 8;
  const delta = DIRECTION_DELTA[direction];
  if (!delta) return 0;

  const [dr, dc] = delta;
  let steps = 0;
  let row = entity.gridRow + dr;
  let col = entity.gridCol + dc;
  while (row >= 0 && row < size && col >= 0 && col < size) {
    steps += 1;
    row += dr;
    col += dc;
  }
  return steps;
}

export function createBurstSystem({
  scene,
  colors,
  bubbleTuning,
  bubbleBaseRadius,
  burstBubbleGeometry,
  createBubbleMaterial,
  poolSize = 180,
} = {}) {
  const pool = {
    initialized: false,
    entries: [],
    materialsByColor: {},
  };

  function ensurePool() {
    if (pool.initialized) return;

    for (let i = 0; i < colors.length; i += 1) {
      const color = colors[i];
      const nodeData = createBubbleMaterial(new THREE.Color(color.base));
      const material = nodeData.material;
      material.transparent = true;
      material.opacity = 0;
      material.depthWrite = false;
      material.side = THREE.DoubleSide;
      material.transmission = bubbleTuning.transmission;
      material.roughness = Math.min(0.26, bubbleTuning.roughness + 0.02);
      material.thickness = Math.min(0.7, 1.35 * 0.5);
      material.ior = 1.2;
      material.clearcoat = bubbleTuning.clearcoat;
      material.clearcoatRoughness = 0.16;
      material.envMapIntensity = 0.72;
      pool.materialsByColor[color.id] = material;
    }

    for (let i = 0; i < poolSize; i += 1) {
      const mesh = new THREE.Mesh(burstBubbleGeometry, pool.materialsByColor[colors[0].id]);
      mesh.visible = false;
      scene.add(mesh);
      pool.entries.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        lifeMax: 1,
        baseScale: 0.08,
        baseOpacity: 0.9,
        active: false,
        owner: null,
      });
    }

    pool.initialized = true;
  }

  function claimPoolEntry() {
    for (let j = 0; j < pool.entries.length; j += 1) {
      if (!pool.entries[j].active) return pool.entries[j];
    }
    return null;
  }

  function activateBurstEntry(entity, entry, {
    position,
    velocity,
    life = 1.05 + Math.random() * 0.75,
    startScale = (0.055 + Math.random() * 0.11) * entity.baseScale,
  }) {
    entry.mesh.material = pool.materialsByColor[colors[entity.colorId].id] ?? pool.materialsByColor[colors[0].id];
    entry.mesh.position.copy(position);
    entry.vel.copy(velocity);
    entry.baseScale = startScale;
    entry.mesh.scale.setScalar(startScale);
    entry.mesh.material.opacity = 0;
    entry.mesh.visible = true;
    entry.life = life;
    entry.lifeMax = life;
    entry.baseOpacity = entity.baseOpacity;
    entry.active = true;
    entry.owner = entity;
    entity.activeBurstBubbleCount += 1;
  }

  function spawnOmnidirectionalBurst(entity) {
    const targetCount = entity.minBurstBubbleCount
      + Math.floor(Math.random() * (entity.maxBurstBubbleCount - entity.minBurstBubbleCount + 1));

    for (let i = 0; i < targetCount; i += 1) {
      const entry = claimPoolEntry();
      if (!entry) break;

      const randomDir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      const spawnDir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();

      const velocityDir = spawnDir.clone().lerp(randomDir, 0.22).normalize();
      const speed = 0.34 + Math.random() * 0.5;

      const innerRadius = bubbleBaseRadius * entity.preBurstScaleMax * 0.9;
      const spawnRadius = innerRadius * Math.cbrt(Math.random());

      workOrigin.copy(entity.group.position)
        .add(entity.bubble.position)
        .addScaledVector(spawnDir, spawnRadius * entity.baseScale);

      activateBurstEntry(entity, entry, {
        position: workOrigin,
        velocity: velocityDir.multiplyScalar(speed),
      });
    }
  }

  function spawnDirectionalBurst(entity) {
    const raySteps = countRaySteps(entity);
    if (raySteps <= 0) {
      spawnOmnidirectionalBurst(entity);
      return;
    }

    const axis = gridDirectionToWorld(entity.mechanismDirection);
    workLateral.set(axis.y, -axis.x, 0);
    if (workLateral.lengthSq() < 1e-6) workLateral.set(0, 1, 0);
    workLateral.normalize();

    const cellStride = entity.radius * 2.35 * entity.baseScale;
    workOrigin.copy(entity.group.position).add(entity.bubble.position);

    const particlesPerCell = 2;
    const targetCount = Math.min(raySteps * particlesPerCell + 2, 24);

    for (let i = 0; i < targetCount; i += 1) {
      const entry = claimPoolEntry();
      if (!entry) break;

      const stepIndex = Math.floor(i / particlesPerCell) + 1;
      const along = Math.min(stepIndex, raySteps) * cellStride;
      const lateral = (Math.random() - 0.5) * entity.radius * 0.35 * entity.baseScale;
      const forwardJitter = (Math.random() - 0.5) * cellStride * 0.15;

      workOrigin.copy(entity.group.position)
        .add(entity.bubble.position)
        .addScaledVector(axis, along + forwardJitter)
        .addScaledVector(workLateral, lateral);

      const velocityDir = axis.clone()
        .addScaledVector(workLateral, (Math.random() - 0.5) * 0.28)
        .normalize();
      const speed = 0.42 + Math.random() * 0.55;

      activateBurstEntry(entity, entry, {
        position: workOrigin,
        velocity: velocityDir.multiplyScalar(speed),
        life: 0.85 + Math.random() * 0.65,
      });
    }
  }

  function spawnForEntity(entity) {
    ensurePool();
    entity.activeBurstBubbleCount = 0;

    if (entity.mechanismDirection) {
      spawnDirectionalBurst(entity);
    } else {
      spawnOmnidirectionalBurst(entity);
    }

    entity.burstPointsVisible = entity.activeBurstBubbleCount > 0;
  }

  function update(delta) {
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      entry.vel.multiplyScalar(Math.pow(0.94, delta * 60));
      entry.mesh.position.addScaledVector(entry.vel, delta);

      const lifeRatio = Math.max(entry.life, 0) / Math.max(entry.lifeMax, 0.0001);
      const age = Math.max(entry.lifeMax - entry.life, 0);
      const appear = Math.min(age / 0.16, 1);
      const fade = Math.pow(lifeRatio, 0.62);
      const scaleNow = entry.baseScale * (0.68 + 0.32 * fade);

      entry.mesh.scale.setScalar(scaleNow);
      entry.mesh.material.opacity = entry.baseOpacity * fade * appear;

      if (entry.life <= 0) {
        entry.mesh.visible = false;
        entry.mesh.material.opacity = 0;
        entry.active = false;

        if (entry.owner) {
          entry.owner.activeBurstBubbleCount = Math.max(0, entry.owner.activeBurstBubbleCount - 1);
          entry.owner.burstPointsVisible = entry.owner.activeBurstBubbleCount > 0;
        }
        entry.owner = null;
      }
    }
  }

  function clear() {
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (entry.owner) {
        entry.owner.activeBurstBubbleCount = 0;
        entry.owner.burstPointsVisible = false;
      }
      entry.owner = null;
      entry.active = false;
      entry.life = 0;
      entry.mesh.visible = false;
      entry.mesh.material.opacity = 0;
    }
  }

  return {
    spawnForEntity,
    update,
    clear,
  };
}
