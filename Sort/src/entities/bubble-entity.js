import * as THREE from "three/webgpu";
import {
  normalLocal,
  positionLocal,
  time,
  uniform,
} from "three/tsl";
import { buildBubblePressNodes } from "../materials/bubble-press-nodes.js";
import { createMechanismArrow } from "./mechanism-arrow-visual.js";

const BubbleBurstState = {
  IDLE: "IDLE",
  PRE_BURST: "PRE_BURST",
  BURST: "BURST",
  DISSIPATE: "DISSIPATE",
  RESET: "RESET",
};

const BubbleSpawnState = {
  READY: "READY",
  SPAWNING: "SPAWNING",
};

const PopWavePhase = {
  IDLE: "IDLE",
  WAIT: "WAIT",
  RISE: "RISE",
  SINK: "SINK",
  RECOVER: "RECOVER",
};

function smoothstep01(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createBubbleMaterial(baseColor, bubbleTuning, bubbleBaseRadius = 1.2) {
  const accentColor = baseColor.clone().offsetHSL(0, 0.1, 0.2);
  const springUniform = uniform(0);
  const crackGlowUniform = uniform(0);
  const contactDirUniform = uniform(new THREE.Vector3(0, 0, 1));
  const pressDentStrengthUniform = uniform(0);
  const pressHitLocalUniform = uniform(new THREE.Vector3(0, 0, 0));
  const tintUniform = uniform(baseColor.clone());
  const accentUniform = uniform(accentColor.clone());

  const flowSpeedUniform = uniform(bubbleTuning.flow);
  const wobbleAmplitudeUniform = uniform(bubbleTuning.wobble);
  const dyeContrastUniform = uniform(bubbleTuning.dye);
  const edgeGlowUniform = uniform(bubbleTuning.edge);
  const iridescenceUniform = uniform(bubbleTuning.iri);
  const dyeEnabledUniform = uniform(bubbleTuning.toggleDye ? 1.0 : 0.0);
  const edgeEnabledUniform = uniform(bubbleTuning.toggleEdge ? 1.0 : 0.0);
  const iridescenceEnabledUniform = uniform(bubbleTuning.toggleIri ? 1.0 : 0.0);
  const iridescenceBaseUniform = uniform(90.0);
  const iridescenceSpanUniform = uniform(520.0);

  const material = new THREE.MeshPhysicalNodeMaterial({
    transmission: bubbleTuning.transmission,
    thickness: 1.35,
    roughness: bubbleTuning.roughness,
    metalness: 0.0,
    clearcoat: bubbleTuning.clearcoat,
    clearcoatRoughness: 0.16,
    ior: 1.2,
    envMapIntensity: 1.05,
    transparent: true,
    opacity: 0.9,
  });

  const flow = time.mul(flowSpeedUniform);
  const rippleA = positionLocal.x.mul(2.9).add(flow).sin();
  const rippleB = positionLocal.y.mul(3.2).add(flow.mul(1.18)).cos();
  const rippleC = positionLocal.z.mul(2.5).add(flow.mul(0.86)).sin();
  const wobble = rippleA.add(rippleB).add(rippleC).mul(wobbleAmplitudeUniform);

  const dyeA = positionLocal.x.mul(3.6).add(flow.mul(0.66)).sin();
  const dyeB = positionLocal.y.mul(4.1).add(flow.mul(0.93)).cos();
  const dyeC = positionLocal.z.mul(3.1).add(flow.mul(0.53)).sin();
  const dyeMix = dyeA.add(dyeB).add(dyeC).mul(0.34).add(0.5).clamp(0.0, 1.0);

  const pressCompressAmountUniform = uniform(bubbleTuning.pressCompress ?? 0.72);
  const pressExpandAmountUniform = uniform(bubbleTuning.pressExpand ?? 0.34);
  const centerDentDepthUniform = uniform(bubbleTuning.centerDentDepth ?? 0.42);
  const centerDentRadiusUniform = uniform(bubbleTuning.centerDentRadius ?? 0.72);
  const centerDentPowerUniform = uniform(bubbleTuning.centerDentPower ?? 2.35);
  const centerDentNormalUniform = uniform(bubbleTuning.centerDentNormal ?? 0.85);
  const centerDentRoughnessUniform = uniform(bubbleTuning.centerDentRoughness ?? 0.18);
  const roughnessBaseUniform = uniform(bubbleTuning.roughness);

  const pressNodes = buildBubblePressNodes({
    springUniform,
    contactDirUniform,
    pressDentStrengthUniform,
    pressHitLocalUniform,
    pressCompressAmountUniform,
    pressExpandAmountUniform,
    centerDentDepthUniform,
    centerDentRadiusUniform,
    centerDentPowerUniform,
    centerDentNormalUniform,
    centerDentRoughnessUniform,
    roughnessBaseUniform,
    wobble,
  });

  material.positionNode = pressNodes.positionNode;
  material.normalNode = pressNodes.normalNode;
  material.roughnessNode = pressNodes.roughnessNode;

  const dyeBlend = dyeMix.pow(dyeContrastUniform);
  const dyeColor = tintUniform.mix(accentUniform, dyeBlend);
  material.colorNode = tintUniform.mix(dyeColor, dyeEnabledUniform);
  material.emissiveNode = tintUniform.mul(
    pressNodes.fresnelEdge.mul(edgeGlowUniform.add(crackGlowUniform)).mul(edgeEnabledUniform)
  );

  material.iridescenceNode = iridescenceUniform.mul(iridescenceEnabledUniform);
  material.iridescenceIORNode = uniform(1.3);
  material.iridescenceThicknessNode = dyeMix.mul(iridescenceSpanUniform).add(iridescenceBaseUniform);

  return {
    material,
    springUniform,
    crackGlowUniform,
    contactDirUniform,
    pressDentStrengthUniform,
    pressHitLocalUniform,
    tintUniform,
    accentUniform,
  };
}

export function createBubbleEntityClass({
  bubbleTuning,
  bubbleBaseRadius,
  bubbleGeometry,
  wallSlideDamping,
  wallContactGain,
  wallBounceRestitution = 0.92,
  burstSystem,
  createBubbleMaterialFn,
} = {}) {
  const createMaterial = createBubbleMaterialFn || ((baseColor) => createBubbleMaterial(baseColor, bubbleTuning));

  return class BubbleEntity {
    constructor({
      id,
      colorId,
      radius,
      vx = 0,
      vy = 0,
      baseColor,
      motionMode = "float",
      gridCol = -1,
      gridRow = -1,
      gridSize = 0,
      mechanismDirection = null,
    }) {
      this.id = id;
      this.colorId = colorId;
      this.radius = radius;
      this.baseColor = baseColor.clone();
      this.active = true;
      this.sliced = false;
      this.life = 0;
      this.selected = false;
      this.wrongFlash = 0;
      this.wrongShake = 0;
      this.selectionScale = 1;
      this.selectionTarget = 1;
      this.selectionVel = 0;

      this.vel = new THREE.Vector3(vx, vy, 0);
      this.springVal = 0;
      this.springVel = 0;
      this.releaseBounceRatio = 0;
      this.springTension = bubbleTuning.springTension;
      this.springDamping = bubbleTuning.springDamping;
      this.pressDentStrength = 0;
      this.contactDir = new THREE.Vector3(0, 0, 1);
      this.pressHitLocal = new THREE.Vector3(0, 0, 0);
      this.pressAmount = 0;
      this.isBeingPressed = false;
      this.pressFillRate = bubbleTuning.pressFillRate ?? 2.86;
      this.pressSpringMax = bubbleTuning.pressSpringMax ?? 0.55;
      this.pressContactStrength = bubbleTuning.pressContactStrength ?? 0.72;
      this.wallBounceRestitution = wallBounceRestitution;
      this.motionMode = motionMode;
      this.gridCol = gridCol;
      this.gridRow = gridRow;
      this.gridSize = Math.max(0, Math.floor(gridSize));
      this.mechanismDirection = mechanismDirection;
      this.idlePhase = Math.random() * Math.PI * 2;
      this.idleFrequency = 1.5 + Math.random() * 1.6;
      this.idleAmplitude = 0.75 + Math.random() * 0.45;
      this.idleOffsetX = (Math.random() - 0.5) * 0.35;
      this.idleOffsetY = (Math.random() - 0.5) * 0.35;
      this.dyePulse = 0;

      this.spawnState = BubbleSpawnState.READY;
      this.spawnDelay = 0;
      this.spawnElapsed = 0;
      this.spawnTargetY = 0;
      this.spawnRiseDistance = 0;
      this.spawnInflateDuration = 0.28;
      this.spawnSettleDuration = 0.12;
      this.spawnMaxOvershoot = 1.08;
      this.spawnMinScale = 0.12;

      this.popWavePhase = PopWavePhase.IDLE;
      this.popWaveElapsed = 0;
      this.popWaveScaleMul = 1;
      this.popWaveDelay = 0;
      this.popWaveScalePeak = 1.14;
      this.popWaveScaleDip = 0.86;
      this.popWaveRiseDuration = 0.14;
      this.popWaveSinkDuration = 0.1;
      this.popWaveRecoverDuration = 0.16;

      this.group = new THREE.Group();

      const nodeMaterialData = createMaterial(baseColor);
      this.bubbleMaterial = nodeMaterialData.material;
      this.springUniform = nodeMaterialData.springUniform;
      this.crackGlowUniform = nodeMaterialData.crackGlowUniform;
      this.contactDirUniform = nodeMaterialData.contactDirUniform;
      this.pressDentStrengthUniform = nodeMaterialData.pressDentStrengthUniform;
      this.pressHitLocalUniform = nodeMaterialData.pressHitLocalUniform;
      this.tintUniform = nodeMaterialData.tintUniform;
      this.accentUniform = nodeMaterialData.accentUniform;
      this.baseScale = this.radius / bubbleBaseRadius;
      this.baseOpacity = 0.9;

      this.bubble = new THREE.Mesh(bubbleGeometry, this.bubbleMaterial);
      this.bubble.scale.setScalar(this.baseScale);
      this.bubble.userData.fruit = this;
      this.selectRing = this.createSelectRing();
      this.mechanismArrow = mechanismDirection
        ? createMechanismArrow(mechanismDirection, bubbleBaseRadius)
        : null;

      this.burstState = BubbleBurstState.IDLE;
      this.stateElapsed = 0;
      this.preBurstDuration = 0.09;
      this.burstDuration = 0.18;
      this.dissipateDuration = 1.6;
      this.resetDelay = 0.2;
      this.preBurstScaleMax = 1.04;
      this.preBurstStartScale = 1;
      this.burstSpringHold = 0;
      this.burstPointsVisible = false;

      this.minBurstBubbleCount = 2;
      this.maxBurstBubbleCount = 5;
      this.activeBurstBubbleCount = 0;

      this.group.add(this.bubble, this.selectRing);
      if (this.mechanismArrow) this.bubble.add(this.mechanismArrow);
      this.resetBurstArtifacts();
      this.setBaseColor(this.baseColor);
    }

    setBaseColor(color) {
      if (!color) return;
      this.baseColor.copy(color);
      const accent = color.clone().offsetHSL(0, 0.1, 0.2);
      if (this.tintUniform?.value) this.tintUniform.value.copy(color);
      if (this.accentUniform?.value) this.accentUniform.value.copy(accent);
    }

    setColorId(colorId, baseColor) {
      this.colorId = colorId;
      const nextColor = baseColor instanceof THREE.Color
        ? baseColor
        : new THREE.Color(baseColor);
      this.setBaseColor(nextColor);
    }

    playDyePulse() {
      if (!this.active || this.sliced) return;
      this.dyePulse = 0.24;
    }

    playPopWave({
      delay = 0,
      scalePeak = 1.14,
      scaleDip = 0.86,
      riseDuration = 0.14,
      sinkDuration = 0.1,
      recoverDuration = 0.16,
    } = {}) {
      if (!this.active || this.sliced || this.motionMode !== "grid") return;
      if (this.spawnState === BubbleSpawnState.SPAWNING) return;

      this.popWaveDelay = Math.max(0, delay);
      this.popWaveScalePeak = scalePeak;
      this.popWaveScaleDip = scaleDip;
      this.popWaveRiseDuration = riseDuration;
      this.popWaveSinkDuration = sinkDuration;
      this.popWaveRecoverDuration = recoverDuration;
      this.popWaveElapsed = 0;
      this.popWaveScaleMul = 1;
      this.popWavePhase = this.popWaveDelay > 0 ? PopWavePhase.WAIT : PopWavePhase.RISE;
    }

    updatePopWave(dt) {
      if (this.popWavePhase === PopWavePhase.IDLE) {
        this.popWaveScaleMul = 1;
        return false;
      }

      this.popWaveElapsed += dt;
      const rest = 1;
      const peak = this.popWaveScalePeak;
      const dip = this.popWaveScaleDip;
      const rebound = 1 + (peak - 1) * 0.35;

      if (this.popWavePhase === PopWavePhase.WAIT) {
        this.popWaveScaleMul = rest;
        if (this.popWaveElapsed >= this.popWaveDelay) {
          this.popWaveElapsed -= this.popWaveDelay;
          this.popWavePhase = PopWavePhase.RISE;
        }
        return true;
      }

      if (this.popWavePhase === PopWavePhase.RISE) {
        const t = this.popWaveRiseDuration > 0
          ? Math.min(1, this.popWaveElapsed / this.popWaveRiseDuration)
          : 1;
        this.popWaveScaleMul = lerp(rest, peak, smoothstep01(t));
        if (t >= 1) {
          this.popWaveElapsed = 0;
          this.popWavePhase = PopWavePhase.SINK;
        }
        return true;
      }

      if (this.popWavePhase === PopWavePhase.SINK) {
        const t = this.popWaveSinkDuration > 0
          ? Math.min(1, this.popWaveElapsed / this.popWaveSinkDuration)
          : 1;
        this.popWaveScaleMul = lerp(peak, dip, smoothstep01(t));
        if (t >= 1) {
          this.popWaveElapsed = 0;
          this.popWavePhase = PopWavePhase.RECOVER;
        }
        return true;
      }

      if (this.popWavePhase === PopWavePhase.RECOVER) {
        const duration = this.popWaveRecoverDuration;
        const t = duration > 0 ? Math.min(1, this.popWaveElapsed / duration) : 1;
        if (t < 0.62) {
          const t2 = t / 0.62;
          this.popWaveScaleMul = lerp(dip, rebound, smoothstep01(t2));
        } else {
          const t2 = (t - 0.62) / 0.38;
          this.popWaveScaleMul = lerp(rebound, rest, smoothstep01(t2));
        }
        if (t >= 1) {
          this.popWaveScaleMul = rest;
          this.popWavePhase = PopWavePhase.IDLE;
          this.popWaveElapsed = 0;
          return false;
        }
        return true;
      }

      return false;
    }

    createSelectRing() {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.06, 1.22, 42),
        new THREE.MeshBasicMaterial({
          color: 0xff5c5c,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        })
      );
      ring.visible = false;
      ring.scale.setScalar(this.radius);
      ring.position.z = this.radius * 0.04;
      return ring;
    }

    setPosition(x, y, z) {
      this.group.position.set(x, y, z);
    }

    beginSpawn({
      delay = 0,
      riseDistance = 0.5,
      inflateDuration = 0.28,
      settleDuration = 0.12,
      maxOvershoot = 1.08,
      minScale = 0.12,
    } = {}) {
      this.spawnState = BubbleSpawnState.SPAWNING;
      this.spawnDelay = Math.max(0, delay);
      this.spawnElapsed = -this.spawnDelay;
      this.spawnTargetY = this.group.position.y;
      this.spawnRiseDistance = riseDistance;
      this.spawnInflateDuration = inflateDuration;
      this.spawnSettleDuration = settleDuration;
      this.spawnMaxOvershoot = maxOvershoot;
      this.spawnMinScale = minScale;
      this.group.position.y = this.spawnTargetY - riseDistance;
      this.bubbleMaterial.opacity = 0;
      this.bubble.scale.setScalar(this.baseScale * minScale);
      this.springVal = 0;
      this.springVel = 0;
      this.springUniform.value = 0;
    }

    updateSpawn(dt) {
      if (this.spawnState !== BubbleSpawnState.SPAWNING) return false;

      this.spawnElapsed += dt;
      if (this.spawnElapsed < 0) {
        this.bubbleMaterial.opacity = 0;
        this.bubble.scale.setScalar(this.baseScale * this.spawnMinScale);
        return true;
      }

      const inflateDuration = this.spawnInflateDuration;
      const settleDuration = this.spawnSettleDuration;

      if (this.spawnElapsed <= inflateDuration) {
        const t = this.spawnElapsed / inflateDuration;
        const smooth = t * t * (3 - 2 * t);
        this.group.position.y = this.spawnTargetY - this.spawnRiseDistance * (1 - smooth);
        const scaleMul = this.spawnMinScale + (this.spawnMaxOvershoot - this.spawnMinScale) * smooth;
        this.bubble.scale.setScalar(this.baseScale * scaleMul);
        this.bubbleMaterial.opacity = this.baseOpacity * smooth;
        return true;
      }

      const settleElapsed = this.spawnElapsed - inflateDuration;
      if (settleElapsed <= settleDuration) {
        const t = settleElapsed / settleDuration;
        const smooth = t * t * (3 - 2 * t);
        this.group.position.y = this.spawnTargetY;
        const scaleMul = THREE.MathUtils.lerp(this.spawnMaxOvershoot, 1, smooth);
        this.bubble.scale.setScalar(this.baseScale * scaleMul);
        this.bubbleMaterial.opacity = this.baseOpacity;
        return true;
      }

      this.group.position.y = this.spawnTargetY;
      this.bubble.scale.setScalar(this.baseScale);
      this.bubbleMaterial.opacity = this.baseOpacity;
      this.spawnState = BubbleSpawnState.READY;
      this.springVal = 0.06;
      this.springVel = -0.04;
      return false;
    }

    setPressHitWorld(worldPoint) {
      if (!worldPoint) return;
      this.pressHitLocal.copy(worldPoint);
      this.bubble.worldToLocal(this.pressHitLocal);
      this.pressHitLocalUniform?.value?.copy(this.pressHitLocal);
    }

    releasePress({ forPop = false } = {}) {
      if (!this.isBeingPressed || this.sliced) return;
      this.isBeingPressed = false;
      this.pressAmount = 0;
      if (!forPop) {
        const releaseRatio = THREE.MathUtils.clamp(
          this.springVal / Math.max(this.pressSpringMax, 0.001),
          0,
          1
        );
        this.releaseBounceRatio = releaseRatio;
        if (releaseRatio > 0.02) {
          this.springVel = -this.springVal * (0.85 + releaseRatio * 1.35);
        }
      } else {
        this.releaseBounceRatio = 0;
      }
      this.setSelected(false);
      this.crackGlowUniform.value = 0;
      this.selectionTarget = 1;
    }

    applyPressPressure(dt, dirX, dirY, dirZ) {
      if (!this.active || this.sliced) return false;

      this.isBeingPressed = true;
      this.pressAmount = Math.min(1, this.pressAmount + dt * this.pressFillRate);
      this.contactDir.set(dirX, dirY, dirZ).normalize();
      this.pressDentStrength = this.pressAmount * this.pressContactStrength;
      this.springVal = this.pressAmount * this.pressSpringMax;
      this.springVel = 0;
      this.springUniform.value = this.springVal;
      this.pressDentStrengthUniform.value = this.pressDentStrength;
      this.contactDirUniform.value.copy(this.contactDir);
      this.crackGlowUniform.value = 0.05 + this.pressAmount * 0.14;
      this.setSelected(true);

      if (this.pressAmount >= 1) {
        this.releasePress({ forPop: true });
        return true;
      }
      return false;
    }

    updateGridIdle(dt) {
      if (this.isBeingPressed) {
        this.bubble.position.set(0, 0, 0);
        return;
      }

      this.updatePopWave(dt);

      if (this.dyePulse > 0) {
        this.dyePulse = Math.max(0, this.dyePulse - dt);
      }

      this.idlePhase += dt * this.idleFrequency;
      const wobbleX = Math.sin(this.idlePhase + this.idleOffsetX) * this.idleAmplitude;
      const wobbleY = Math.cos(this.idlePhase * 0.86 + this.idleOffsetY) * this.idleAmplitude * 0.72;
      const breathe = 1 + Math.sin(this.idlePhase * 1.15) * 0.014;
      const dyeT = this.dyePulse > 0 ? this.dyePulse / 0.24 : 0;
      const dyeScale = 1 + dyeT * 0.12;

      this.bubble.position.set(
        wobbleX * this.radius * 0.028,
        wobbleY * this.radius * 0.028,
        0
      );
      const waveScale = this.popWavePhase === PopWavePhase.IDLE ? 1 : this.popWaveScaleMul;
      this.bubble.scale.setScalar(this.baseScale * this.selectionScale * breathe * dyeScale * waveScale);
      this.selectRing.visible = false;
    }

    bounceWallVelocity(normalX, normalY) {
      const inbound = this.vel.x * normalX + this.vel.y * normalY;
      if (inbound >= 0) return;
      const impulse = (1 + this.wallBounceRestitution) * inbound;
      this.vel.x -= impulse * normalX;
      this.vel.y -= impulse * normalY;
    }

    pop(sliceDir, speed) {
      if (this.sliced) return;
      this.releasePress();
      this.setSelected(false);
      this.sliced = true;
      this.life = 0;
      this.wrongFlash = 0;
      this.wrongShake = 0;
      this.pressDentStrength = 0;
      this.pressDentStrengthUniform.value = 0;
      this.preBurstStartScale = this.selectionScale;
      this.burstSpringHold = Math.max(this.springVal, this.pressSpringMax);
      this.springVel = 0;
      this.crackGlowUniform.value = 0.12;
      this.bubble.visible = true;
      this.bubbleMaterial.opacity = this.baseOpacity;
      this.resetBurstArtifacts();
      this.setBurstState(BubbleBurstState.PRE_BURST);
    }

    update(dt, worldBounds) {
      if (!this.active) return;

      if (!this.isBeingPressed && !this.sliced) {
        this.springVel += (0 - this.springVal) * this.springTension;
        const bounceDamping = THREE.MathUtils.lerp(
          this.springDamping,
          Math.min(0.92, this.springDamping + 0.07),
          this.releaseBounceRatio
        );
        this.springVel *= bounceDamping;
        this.springVal += this.springVel;
        if (this.springVal < 0) {
          this.springVal = 0;
          this.springVel *= -0.2;
        }
        this.releaseBounceRatio = Math.max(0, this.releaseBounceRatio - dt * 2.2);
        this.pressDentStrength = Math.max(0, this.pressDentStrength - dt * 2.8);
        const springDentCap = (this.springVal / Math.max(this.pressSpringMax, 0.001)) * this.pressContactStrength;
        this.pressDentStrength = Math.min(this.pressDentStrength, springDentCap);
      }
      this.springUniform.value = this.springVal;
      this.pressDentStrengthUniform.value = this.pressDentStrength;
      this.contactDirUniform.value.copy(this.contactDir);

      if (!this.sliced) {
        if (this.motionMode === "grid") {
          if (this.spawnState === BubbleSpawnState.SPAWNING) {
            this.updateSpawn(dt);
            return;
          }
          this.updateGridIdle(dt);
          return;
        }

        this.group.position.addScaledVector(this.vel, dt);

        const leftLimit = worldBounds.left + this.radius;
        if (this.group.position.x < leftLimit) {
          const overlap = leftLimit - this.group.position.x;
          this.group.position.x = leftLimit;
          this.bounceWallVelocity(1, 0);
          this.applyWallContact(1, 0, overlap);
        }

        const rightLimit = worldBounds.right - this.radius;
        if (this.group.position.x > rightLimit) {
          const overlap = this.group.position.x - rightLimit;
          this.group.position.x = rightLimit;
          this.bounceWallVelocity(-1, 0);
          this.applyWallContact(-1, 0, overlap);
        }

        const bottomLimit = worldBounds.bottom + this.radius;
        if (this.group.position.y < bottomLimit) {
          const overlap = bottomLimit - this.group.position.y;
          this.group.position.y = bottomLimit;
          this.bounceWallVelocity(0, 1);
          this.applyWallContact(0, 1, overlap);
        }

        const topLimit = worldBounds.top - this.radius;
        if (this.group.position.y > topLimit) {
          const overlap = this.group.position.y - topLimit;
          this.group.position.y = topLimit;
          this.bounceWallVelocity(0, -1);
          this.applyWallContact(0, -1, overlap);
        }

        this.updateSelectionScale(dt);
        this.bubble.scale.setScalar(this.baseScale * this.selectionScale);

        if (this.wrongFlash > 0) {
          this.wrongFlash = Math.max(0, this.wrongFlash - dt);
          this.wrongShake = Math.max(0, this.wrongShake - dt);
          const t = this.wrongFlash / 0.22;
          const shakeT = this.wrongShake / 0.22;
          const shakeAmp = this.radius * 0.12 * shakeT;
          const shakePhase = (1 - shakeT) * Math.PI * 12;
          const shakeX = Math.sin(shakePhase) * shakeAmp;
          const shakeY = Math.cos(shakePhase * 0.6) * shakeAmp * 0.25;

          this.selectRing.visible = true;
          this.selectRing.material.color.setHex(0xff5c5c);
          this.selectRing.scale.setScalar(this.radius * (1.08 + (1 - t) * 0.1));
          this.selectRing.material.opacity = 0.28 + t * 0.68;
          this.bubble.position.set(shakeX, shakeY, 0);
        } else {
          this.selectRing.visible = false;
          this.bubble.position.set(0, 0, 0);
        }
        return;
      }

      this.stateElapsed += dt;

      if (this.burstState === BubbleBurstState.PRE_BURST) {
        const t = Math.min(this.stateElapsed / this.preBurstDuration, 1);
        const smooth = t * t * (3 - 2 * t);
        const scaleFrom = this.baseScale * this.preBurstStartScale;
        const scaleTo = scaleFrom * this.preBurstScaleMax;
        this.bubble.visible = true;
        this.bubble.scale.setScalar(scaleFrom + (scaleTo - scaleFrom) * smooth);
        this.springVal = this.burstSpringHold;
        this.crackGlowUniform.value = 0.12 * smooth;
        this.bubbleMaterial.opacity = this.baseOpacity;

        if (t >= 1) {
          this.setBurstState(BubbleBurstState.BURST);
          this.initBurstParticles();
        }
        return;
      }

      if (this.burstState === BubbleBurstState.BURST) {
        const t = Math.min(this.stateElapsed / this.burstDuration, 1);
        const burstScaleBase = this.baseScale * this.preBurstStartScale * this.preBurstScaleMax;
        const springFade = THREE.MathUtils.clamp((t - 0.35) / 0.35, 0, 1);
        this.springVal = this.burstSpringHold * (1 - springFade);
        this.crackGlowUniform.value = (1 - t) * 0.12;
        this.bubbleMaterial.opacity = Math.max(0, this.baseOpacity * (1 - t * 1.85));
        this.bubble.scale.setScalar(burstScaleBase * (1 + t * 0.015));

        if (t > 0.5) this.bubble.visible = false;

        if (t >= 1) {
          this.springVal = 0;
          this.setBurstState(BubbleBurstState.DISSIPATE);
          this.bubbleMaterial.opacity = 0;
        }
        return;
      }

      if (this.burstState === BubbleBurstState.DISSIPATE) {
        this.crackGlowUniform.value = 0;
        this.bubble.visible = false;

        if (this.stateElapsed >= this.dissipateDuration && !this.burstPointsVisible) {
          this.setBurstState(BubbleBurstState.RESET);
        }
        return;
      }

      if (this.burstState === BubbleBurstState.RESET) {
        if (this.stateElapsed >= this.resetDelay) {
          this.active = false;
          this.group.visible = false;
        }
      }
    }

    setSelected(flag) {
      const next = Boolean(flag) && this.active && !this.sliced;
      const changed = next !== this.selected;
      this.selected = next;
      this.selectionTarget = next ? 1.05 : 1;

      if (changed && next) {
        this.selectionScale = Math.max(this.selectionScale, 1.05);
        this.selectionVel = 0;
      }

      if (!next) {
        this.selectRing.visible = false;
        this.selectRing.material.opacity = 0;
        this.selectRing.scale.setScalar(this.radius);
        this.bubble.position.set(0, 0, 0);
      }
    }

    updateSelectionScale(dt) {
      const spring = 120;
      const damping = 9;
      this.selectionVel += (this.selectionTarget - this.selectionScale) * spring * dt;
      this.selectionVel *= Math.exp(-damping * dt);
      this.selectionScale += this.selectionVel * dt;
      if (!this.selected && this.selectionTarget <= 1 && this.selectionScale < 1) {
        this.selectionScale = 1;
        this.selectionVel *= -0.18;
      }

      if (Math.abs(this.selectionTarget - this.selectionScale) < 0.001 && Math.abs(this.selectionVel) < 0.001) {
        this.selectionScale = this.selectionTarget;
        this.selectionVel = 0;
      }
    }

    flashWrongHit() {
      if (!this.active || this.sliced) return;
      this.wrongFlash = 0.22;
      this.wrongShake = 0.22;
    }

    applyContact(nx, ny, overlap) {
      if (!this.active || this.sliced) return;
      const strength = THREE.MathUtils.clamp(overlap / Math.max(this.radius * 1.05, 0.001), 0, 0.65);
      this.contactDir.set(nx, ny, 0).normalize();
      this.springVel -= strength * 0.09;
    }

    applyWallContact(nx, ny, overlap) {
      this.applyContact(nx, ny, overlap * wallContactGain);
    }

    setBurstState(nextState) {
      this.burstState = nextState;
      this.stateElapsed = 0;
    }

    resetBurstArtifacts() {
      this.activeBurstBubbleCount = 0;
      this.burstPointsVisible = false;
    }

    initBurstParticles() {
      burstSystem.spawnForEntity(this);
    }
  };
}
