import test from "node:test";
import assert from "node:assert/strict";
import { createColorUnifySystem } from "../src/systems/color-unify-system.js";

function makeFruit({
  id,
  col,
  row,
  colorId = 0,
  mechanismDirection = null,
  dyePresentHoldOld = false,
  popWaveColorActive = false,
  popWavePhase = "IDLE",
}) {
  return {
    id,
    active: true,
    sliced: false,
    motionMode: "grid",
    gridCol: col,
    gridRow: row,
    colorId,
    mechanismDirection,
    dyePresentHoldOld,
    popWaveColorActive,
    popWavePhase,
    beginDyePresentation(nextColorId) {
      this.colorId = nextColorId;
      this.dyePresentHoldOld = true;
    },
  };
}

const colors = [
  { base: "#ff0000" },
  { base: "#00ff00" },
  { base: "#0000ff" },
];

test("pierceRayTarget only dyes arrow bubbles along the ray", () => {
  const system = createColorUnifySystem();
  const anchor = makeFruit({ id: 0, col: 0, row: 0, colorId: 0, mechanismDirection: "right" });
  const alongRay = makeFruit({ id: 1, col: 2, row: 0, colorId: 1, mechanismDirection: "down" });

  system.markMechanismRayEmitted(anchor);

  const { chain, changed } = system.pierceRayTarget(alongRay, {
    colorId: 0,
    colorDef: colors[0],
  });

  assert.equal(chain, null);
  assert.equal(changed, true);
  assert.equal(alongRay.colorId, 0);
  assert.equal(system.canEmitMechanismRay(alongRay), true);
});

test("applyPop from normal bubble only dyes neighbor arrows", () => {
  const system = createColorUnifySystem();
  const source = makeFruit({ id: 0, col: 1, row: 1, colorId: 0 });
  const neighborArrow = makeFruit({
    id: 1,
    col: 2,
    row: 1,
    colorId: 1,
    mechanismDirection: "right",
  });
  const fruits = [source, neighborArrow];

  const { chainAnchors } = system.applyPop({
    source,
    fruits,
    colors,
    rayDelivery: "projectile",
  });

  assert.deepEqual(chainAnchors, []);
  assert.equal(neighborArrow.colorId, 0);
  assert.equal(system.canEmitMechanismRay(neighborArrow), true);
});

test("isBoardUnified waits for arrow flights and color presentation", () => {
  const system = createColorUnifySystem();
  let projectileActive = true;
  system.setProjectileActiveChecker(() => projectileActive);

  const fruits = [
    makeFruit({ id: 0, col: 0, row: 0, colorId: 0 }),
    makeFruit({ id: 1, col: 1, row: 0, colorId: 0, dyePresentHoldOld: true }),
  ];

  assert.equal(system.isBoardUnified(fruits), false);

  projectileActive = false;
  assert.equal(system.isBoardUnified(fruits), false);

  fruits[1].dyePresentHoldOld = false;
  assert.equal(system.isBoardUnified(fruits), true);
});