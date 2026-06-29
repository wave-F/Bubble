import * as THREE from "three/webgpu";

export function createPressSystem({
  camera,
  raycaster,
} = {}) {
  const workProject = new THREE.Vector3();
  const workBurstDir = new THREE.Vector3();

  function pickFruitAtWorldPoint(worldX, worldY, fruits) {
    const meshes = [];
    for (let i = 0; i < fruits.length; i += 1) {
      const fruit = fruits[i];
      if (!fruit.active || fruit.sliced || !fruit.bubble.visible) continue;
      meshes.push(fruit.bubble);
    }
    if (!meshes.length) return null;

    workProject.set(worldX, worldY, 0).project(camera);
    raycaster.setFromCamera({ x: workProject.x, y: workProject.y }, camera);
    const intersections = raycaster.intersectObjects(meshes, false);
    if (!intersections.length) return null;

    const intersection = intersections[0];
    const fruit = intersection.object.userData.fruit ?? null;
    if (!fruit) return null;

    return {
      fruit,
      hitWorld: intersection.point.clone(),
    };
  }

  function pickPressHitOnFruit(worldX, worldY, fruit) {
    if (!fruit?.bubble) return null;
    workProject.set(worldX, worldY, 0).project(camera);
    raycaster.setFromCamera({ x: workProject.x, y: workProject.y }, camera);
    const intersections = raycaster.intersectObject(fruit.bubble, false);
    if (!intersections.length) return null;
    return intersections[0].point.clone();
  }

  function resolvePressContactDir(fruit) {
    const dx = camera.position.x - fruit.group.position.x;
    const dy = camera.position.y - fruit.group.position.y;
    const dz = camera.position.z - fruit.group.position.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.001) return { dirX: 0, dirY: 0, dirZ: 1 };
    return { dirX: dx / len, dirY: dy / len, dirZ: dz / len };
  }

  function syncPressHit(state, fruit) {
    if (!fruit || !state.nowPoint) return;
    const hitWorld = pickPressHitOnFruit(state.nowPoint.x, state.nowPoint.y, fruit);
    if (hitWorld) fruit.setPressHitWorld(hitWorld);
  }

  function beginPress({ state, fruits, world, playSelectTone }) {
    const pick = pickFruitAtWorldPoint(world.x, world.y, fruits);
    if (!pick) return false;

    state.pressTarget = pick.fruit;
    state.nowPoint = world.clone();
    pick.fruit.setPressHitWorld(pick.hitWorld);
    playSelectTone?.();
    return true;
  }

  function updatePress({
    state,
    dt,
    consumeStep,
    onPop,
    onBurst,
  }) {
    if (!state.pointerDown || !state.pressTarget) return;

    const fruit = state.pressTarget;
    if (!fruit.active || fruit.sliced) {
      fruit.releasePress?.();
      state.pressTarget = null;
      return;
    }

    syncPressHit(state, fruit);
    const { dirX, dirY, dirZ } = resolvePressContactDir(fruit);
    const burst = fruit.applyPressPressure(dt, dirX, dirY, dirZ);
    if (!burst) return;

    consumeStep();
    workBurstDir.set(dirX, dirY, dirZ);
    if (onBurst) {
      onBurst(fruit, workBurstDir);
    } else {
      fruit.pop(workBurstDir, 2.4);
    }
    onPop?.();

    state.pressAwaitRelease = true;
    state.pressTarget = null;
  }

  function endPress({ state }) {
    if (state.pressTarget) {
      state.pressTarget.releasePress?.();
      state.pressTarget = null;
    }
  }

  return {
    pickFruitAtWorldPoint,
    beginPress,
    updatePress,
    endPress,
  };
}