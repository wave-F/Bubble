import * as THREE from "three/webgpu";
import {
  POP_RING_DEFAULTS,
  normalizePopRingTuning,
} from "../game/pop-ring-tuning.js";
import { createPopRingGeometry } from "../game/pop-ring-geometry.js";
import { DIRECTION_DELTA } from "./mechanism-dye-logic.js";


const workAxis = new THREE.Vector3();
const workLateral = new THREE.Vector3();
const workOrigin = new THREE.Vector3();

const RING_POOL_SIZE = 28;
/** Lower = longer drift while opacity fades (per-second exponential drag). */
const BURST_VEL_DRAG = 1.85;
const BURST_SCALE_SHRINK_START_LIFE = 0.25;

const ringSolidColor = new THREE.Color();
const ringFadeWhite = new THREE.Color(0xffffff);

function easeOutCubic(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return 1 - (1 - x) ** 3;
}

const RING_OPACITY_HOLD_UNTIL = 0.5;

function ringOpacityForProgress(t, tuning) {
  const progress = THREE.MathUtils.clamp(t, 0, 1);
  const attack = Math.min(1, progress / Math.max(tuning.opacityAttack, 0.001));
  const peak = tuning.opacityPeak * attack;
  if (progress <= RING_OPACITY_HOLD_UNTIL) return peak;
  const fadeT = (progress - RING_OPACITY_HOLD_UNTIL) / (1 - RING_OPACITY_HOLD_UNTIL);
  return peak * (1 - fadeT) ** 1.15;
}

function ringFadeLerpT(progress) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  if (p <= RING_OPACITY_HOLD_UNTIL) return 0;
  const fadeT = (p - RING_OPACITY_HOLD_UNTIL) / (1 - RING_OPACITY_HOLD_UNTIL);
  return 1 - (1 - fadeT) ** 1.15;
}

function applyRingColorForProgress(material, baseColor, progress) {
  const lerpT = ringFadeLerpT(progress);
  if (lerpT <= 0) {
    material.color.copy(baseColor);
    return;
  }
  material.color.copy(baseColor).lerp(ringFadeWhite, lerpT);
}

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

function createBurstChipMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color: color instanceof THREE.Color ? color : new THREE.Color(color),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

export function createBurstSystem({
  scene,
  overlayScene = scene,
  camera = null,
  colors,
  bubbleBaseRadius,
  burstBubbleGeometry,
  poolSize = 180,
  popRingTuning: initialPopRingTuning,
} = {}) {
  let ringTuning = normalizePopRingTuning({
    ...POP_RING_DEFAULTS,
    ...initialPopRingTuning,
  });

  const pool = {
    initialized: false,
    entries: [],
  };

  const ringPool = {
    initialized: false,
    geometry: null,
    entries: [],
  };

  function createRingGeometry() {
    return createPopRingGeometry(
      ringTuning.shape,
      ringTuning.ringInner,
      ringTuning.ringOuter,
    );
  }

  function rebuildRingGeometry() {
    const geometry = createRingGeometry();
    if (!ringPool.initialized) {
      ringPool.geometry = geometry;
      return;
    }
    if (ringPool.geometry) ringPool.geometry.dispose();
    ringPool.geometry = geometry;
    for (let i = 0; i < ringPool.entries.length; i += 1) {
      ringPool.entries[i].mesh.geometry = geometry;
    }
  }

  function ensureRingPool() {
    if (ringPool.initialized) return;

    ringPool.geometry = createRingGeometry();
    for (let i = 0; i < RING_POOL_SIZE; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(ringPool.geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 0;
      overlayScene.add(mesh);
      ringPool.entries.push({
        mesh,
        life: 0,
        lifeMax: ringTuning.duration,
        radiusBase: 1,
        ringBaseColor: new THREE.Color(0xffffff),
        ringTintColorId: null,
        ringBurstWhite: false,
        active: false,
      });
    }

    ringPool.initialized = true;
  }

  function claimRingEntry() {
    for (let j = 0; j < ringPool.entries.length; j += 1) {
      if (!ringPool.entries[j].active) return ringPool.entries[j];
    }
    return null;
  }

  function applyRingTintFromEntity(entity) {
    if (entity.burstVisualWhite) {
      ringSolidColor.set(0xffffff);
      return;
    }
    const colorDef = colors[entity.colorId] ?? colors[0];
    ringSolidColor.set(colorDef?.base ?? 0xffffff);
    ringSolidColor.offsetHSL(0, 0, ringTuning.lightnessOffset);
  }

  function refreshRingBaseColor(entry) {
    if (entry.ringBurstWhite) {
      ringSolidColor.set(0xffffff);
    } else {
      const colorDef = colors[entry.ringTintColorId] ?? colors[0];
      ringSolidColor.set(colorDef?.base ?? 0xffffff);
      ringSolidColor.offsetHSL(0, 0, ringTuning.lightnessOffset);
    }
    entry.ringBaseColor.copy(ringSolidColor);
  }

  function resyncActivePopRingsAfterTuning() {
    if (!ringPool.initialized) return;

    for (let i = 0; i < ringPool.entries.length; i += 1) {
      const entry = ringPool.entries[i];
      if (!entry.active) continue;

      const progress = entry.lifeMax > 0
        ? THREE.MathUtils.clamp(1 - entry.life / entry.lifeMax, 0, 1)
        : 1;
      entry.lifeMax = ringTuning.duration;
      entry.life = Math.max(0, entry.lifeMax * (1 - progress));

      refreshRingBaseColor(entry);

      const age = Math.max(entry.lifeMax - entry.life, 0);
      const p = entry.lifeMax > 0 ? Math.min(1, age / entry.lifeMax) : 1;
      const scaleMul = THREE.MathUtils.lerp(
        ringTuning.scaleStart,
        ringTuning.scaleEnd,
        easeOutCubic(p),
      );
      entry.mesh.scale.setScalar(entry.radiusBase * scaleMul);
      entry.mesh.material.opacity = ringOpacityForProgress(p, ringTuning);
      applyRingColorForProgress(entry.mesh.material, entry.ringBaseColor, p);
    }
  }

  function burstBaseColorForEntity(entity, target = ringSolidColor) {
    if (entity.burstVisualWhite) return target.set(0xffffff);
    const colorDef = colors[entity.colorId] ?? colors[0];
    return target.set(colorDef?.base ?? 0xffffff);
  }

  function applyBurstTintToEntry(entry, entity) {
    burstBaseColorForEntity(entity, ringSolidColor);
    entry.burstMaterial.color.copy(ringSolidColor);
    if (!entity.burstVisualWhite) {
      entry.burstMaterial.color.offsetHSL(0, 0, ringTuning.lightnessOffset);
    }
  }

  function orientPopRingToCamera(mesh) {
    if (!camera || !mesh) return;
    mesh.lookAt(camera.position);
  }

  function spawnPopRing(entity) {
    if (!ringTuning.enabled) return;
    ensureRingPool();
    const entry = claimRingEntry();
    if (!entry) return;

    entry.ringBurstWhite = Boolean(entity.burstVisualWhite);
    entry.ringTintColorId = entry.ringBurstWhite ? null : entity.colorId;
    applyRingTintFromEntity(entity);
    entry.ringBaseColor.copy(ringSolidColor);
    entry.mesh.material.color.copy(ringSolidColor);
    entry.radiusBase = entity.radius * entity.baseScale;

    workOrigin.copy(entity.group.position).add(entity.bubble.position);
    workOrigin.z += entity.radius * 0.06;
    entry.mesh.position.copy(workOrigin);
    if (ringTuning.shape === "cross" || ringTuning.shape === "roundedStar") {
      orientPopRingToCamera(entry.mesh);
    }

    const startScale = entry.radiusBase * ringTuning.scaleStart;
    entry.mesh.scale.setScalar(startScale);
    entry.mesh.material.opacity = 0;
    entry.mesh.visible = true;
    entry.life = ringTuning.duration;
    entry.lifeMax = ringTuning.duration;
    entry.active = true;
  }

  function updatePopRings(delta) {
    if (!ringPool.initialized) return;

    for (let i = 0; i < ringPool.entries.length; i += 1) {
      const entry = ringPool.entries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      const age = Math.max(entry.lifeMax - entry.life, 0);
      const progress = entry.lifeMax > 0 ? Math.min(1, age / entry.lifeMax) : 1;
      const scaleMul = THREE.MathUtils.lerp(
        ringTuning.scaleStart,
        ringTuning.scaleEnd,
        easeOutCubic(progress),
      );
      entry.mesh.scale.setScalar(entry.radiusBase * scaleMul);
      entry.mesh.material.opacity = ringOpacityForProgress(progress, ringTuning);
      applyRingColorForProgress(entry.mesh.material, entry.ringBaseColor, progress);
      if (ringTuning.shape === "cross" || ringTuning.shape === "roundedStar") {
        orientPopRingToCamera(entry.mesh);
      }

      if (entry.life <= 0) {
        entry.mesh.visible = false;
        entry.mesh.material.opacity = 0;
        entry.active = false;
      }
    }
  }

  function clearPopRings() {
    if (!ringPool.initialized) return;

    for (let i = 0; i < ringPool.entries.length; i += 1) {
      const entry = ringPool.entries[i];
      entry.active = false;
      entry.life = 0;
      entry.mesh.visible = false;
      entry.mesh.material.opacity = 0;
    }
  }

  function ensurePool() {
    if (pool.initialized) return;

    const seedColor = colors[0]?.base ?? 0xffffff;

    for (let i = 0; i < poolSize; i += 1) {
      const burstMaterial = createBurstChipMaterial(seedColor);

      const mesh = new THREE.Mesh(burstBubbleGeometry, burstMaterial);
      mesh.visible = false;
      mesh.renderOrder = 2;
      scene.add(mesh);
      pool.entries.push({
        mesh,
        burstMaterial,
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
    applyBurstTintToEntry(entry, entity);
    entry.mesh.position.copy(position);
    entry.vel.copy(velocity);
    entry.baseScale = startScale;
    entry.mesh.scale.setScalar(startScale);
    entry.burstMaterial.opacity = 0;
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

    spawnPopRing(entity);

    if (entity.mechanismDirection) {
      spawnDirectionalBurst(entity);
    } else {
      spawnOmnidirectionalBurst(entity);
    }

    entity.burstPointsVisible = entity.activeBurstBubbleCount > 0;
  }

  function update(delta) {
    updatePopRings(delta);
    if (!pool.initialized) return;

    for (let i = 0; i < pool.entries.length; i += 1) {
      const entry = pool.entries[i];
      if (!entry.active) continue;

      entry.life -= delta;
      entry.vel.multiplyScalar(Math.exp(-BURST_VEL_DRAG * delta));
      entry.mesh.position.addScaledVector(entry.vel, delta);

      const lifeRatio = Math.max(entry.life, 0) / Math.max(entry.lifeMax, 0.0001);
      const age = Math.max(entry.lifeMax - entry.life, 0);
      const appear = Math.min(age / 0.16, 1);
      const fade = Math.pow(lifeRatio, 0.62);
      let scaleMul = 1;
      if (lifeRatio < BURST_SCALE_SHRINK_START_LIFE) {
        const t = lifeRatio / Math.max(BURST_SCALE_SHRINK_START_LIFE, 0.001);
        scaleMul = THREE.MathUtils.lerp(0.85, 1, t);
      }
      const scaleNow = entry.baseScale * scaleMul;

      entry.mesh.scale.setScalar(scaleNow);
      entry.burstMaterial.opacity = entry.baseOpacity * fade * appear;

      if (entry.life <= 0) {
        entry.mesh.visible = false;
        entry.burstMaterial.opacity = 0;
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
    clearPopRings();
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
      entry.burstMaterial.opacity = 0;
    }
  }

  function applyPopRingTuning(partial) {
    const prevInner = ringTuning.ringInner;
    const prevOuter = ringTuning.ringOuter;
    const prevShape = ringTuning.shape;
    ringTuning = normalizePopRingTuning({ ...ringTuning, ...partial });
    if (
      ringTuning.ringInner !== prevInner
      || ringTuning.ringOuter !== prevOuter
      || ringTuning.shape !== prevShape
    ) {
      rebuildRingGeometry();
    }
    resyncActivePopRingsAfterTuning();
  }

  function getPopRingTuning() {
    return { ...ringTuning };
  }

  return {
    spawnForEntity,
    update,
    clear,
    applyPopRingTuning,
    getPopRingTuning,
  };
}
