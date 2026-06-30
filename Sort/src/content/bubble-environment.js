import * as THREE from "three/webgpu";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export async function applyBubbleSceneEnvironment({ scene, renderer, environmentIntensity = 1.15 } = {}) {
  if (!scene || !renderer) return null;

  if (typeof renderer.init === "function" && !renderer.hasInitialized?.()) {
    await renderer.init();
  }

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();

  let envTarget = null;
  if (renderer.hasInitialized?.()) {
    envTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  } else if (typeof pmremGenerator.fromSceneAsync === "function") {
    envTarget = await pmremGenerator.fromSceneAsync(roomEnvironment, 0.04);
  } else {
    envTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);
  }

  const envMap = envTarget?.texture;
  if (!envMap) {
    pmremGenerator.dispose();
    throw new Error("Failed to generate bubble environment map");
  }

  scene.environment = envMap;
  scene.environmentIntensity = environmentIntensity;

  pmremGenerator.dispose();

  return envMap;
}

export function syncBubbleMaterialsEnvironment(scene, envMap, envMapIntensity = 1.05) {
  if (!scene || !envMap) return;

  scene.traverse((object) => {
    if (!object?.isMesh) return;
    if (object.userData?.skipBubbleEnvironment) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      material.envMap = envMap;
      material.envMapIntensity = envMapIntensity;
      material.needsUpdate = true;
    }
  });
}

export async function warmupBubbleRenderer({ renderer, scene, camera, fruits = [] } = {}) {
  if (!renderer || !scene || !camera) return;

  if (typeof renderer.compileAsync === "function") {
    await renderer.compileAsync(scene, camera);
  }

  syncBubbleMaterialsEnvironment(scene, scene.environment, 1.05);
  renderer.render(scene, camera);

  for (const fruit of fruits) {
    if (fruit.bubbleMaterial) {
      fruit.bubbleMaterial.needsUpdate = true;
    }
  }

  renderer.render(scene, camera);
}