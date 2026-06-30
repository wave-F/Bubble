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

test("pierceRayTarget chains arrow bubbles without pre-marking emit slot", () => {
  const system = createColorUnifySystem();
  const anchor = makeFruit({ id: 0, col: 0, row: 0, colorId: 0, mechanismDirection: "right" });
  const chained = makeFruit({ id: 1, col: 2, row: 0, colorId: 1, mechanismDirection: "down" });

  system.markMechanismRayEmitted(anchor);

  const { chain } = system.pierceRayTarget(chained, {
    colorId: 0,
    colorDef: colors[0],
  });

  assert.equal(chain, chained);
  assert.equal(system.canEmitMechanismRay(chained), true);
  assert.equal(system.markMechanismRayEmitted(chained), true);
  assert.equal(system.canEmitMechanismRay(chained), false);
});

test("applyPop returns neighbor arrow anchors for projectile delivery", () => {
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

  assert.deepEqual(chainAnchors, [neighborArrow]);
  assert.equal(neighborArrow.colorId, 0);
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