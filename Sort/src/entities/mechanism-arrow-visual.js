import * as THREE from "three/webgpu";

export const MECHANISM_ARROW_DIRECTIONS = ["up", "right", "down", "left"];

const EXTRUDE_OPTIONS = {
  depth: 0.16,
  bevelEnabled: true,
  bevelThickness: 0.022,
  bevelSize: 0.018,
  bevelSegments: 2,
};

function orientPoint(x, y, direction) {
  switch (direction) {
    case "right":
      return [y, -x];
    case "down":
      return [-x, -y];
    case "left":
      return [-y, x];
    case "up":
    default:
      return [x, y];
  }
}

function buildMechanismArrowShape(direction = "up") {
  const headHalf = 0.26;
  const headBase = 0.02;
  const stemHalf = 0.1;
  const headLen = 0.36;
  const stemLen = 0.3;

  const upVertices = [
    [0, headLen],
    [headHalf, headBase],
    [stemHalf, headBase],
    [stemHalf, -stemLen],
    [-stemHalf, -stemLen],
    [-stemHalf, headBase],
    [-headHalf, headBase],
  ];

  const shape = new THREE.Shape();
  const [startX, startY] = orientPoint(...upVertices[0], direction);
  shape.moveTo(startX, startY);
  for (let i = 1; i < upVertices.length; i += 1) {
    const [x, y] = orientPoint(...upVertices[i], direction);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createSolidMaterial(color, roughness = 0.36) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
  });
}

function createArrowGeometry(direction) {
  const geometry = new THREE.ExtrudeGeometry(
    buildMechanismArrowShape(direction),
    EXTRUDE_OPTIONS
  );
  geometry.center();
  return geometry;
}

export function createMechanismArrow(direction, bubbleBaseRadius = 1.2) {
  const group = new THREE.Group();
  const outlineGeometry = createArrowGeometry(direction);
  const arrowGeometry = createArrowGeometry(direction);

  const outline = new THREE.Mesh(
    outlineGeometry,
    createSolidMaterial(0x1a3048, 0.4)
  );
  outline.scale.set(1.08, 1.08, 1.04);
  outline.position.z = -0.012;

  const arrow = new THREE.Mesh(
    arrowGeometry,
    createSolidMaterial(0xf2f6fc, 0.34)
  );

  group.add(outline, arrow);
  group.scale.setScalar(bubbleBaseRadius * 1.08);
  return group;
}