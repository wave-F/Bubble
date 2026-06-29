const DEFAULT_STAGGER_SEC = 0.05;
const DEFAULT_WAVE_RINGS = 1;

function isGridWaveTarget(fruit) {
  return fruit?.motionMode === "grid" && fruit.active && !fruit.sliced;
}

function crossWaveSortKey(source, neighbor) {
  const dc = neighbor.gridCol - source.gridCol;
  const dr = neighbor.gridRow - source.gridRow;
  if (dr === -1) return 0;
  if (dc === 1) return 1;
  if (dr === 1) return 2;
  if (dc === -1) return 3;
  return 4;
}

function collectWaveRings(source, fruits, maxRings, findGridNeighborFruits) {
  const rings = [];
  const seen = new Set([source]);
  let frontier = [source];

  for (let ringIndex = 0; ringIndex < maxRings; ringIndex += 1) {
    const ring = [];
    const nextFrontier = [];

    for (const node of frontier) {
      for (const neighbor of findGridNeighborFruits(node, fruits)) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        if (isGridWaveTarget(neighbor)) {
          ring.push(neighbor);
        }
        nextFrontier.push(neighbor);
      }
    }

    rings.push(ring);
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return rings;
}

export function createPopWaveSystem({ findGridNeighborFruits } = {}) {
  if (typeof findGridNeighborFruits !== "function") {
    throw new Error("createPopWaveSystem requires findGridNeighborFruits");
  }

  function triggerCrossWave(source, fruits, options = {}) {
    const staggerSec = options.staggerSec ?? DEFAULT_STAGGER_SEC;
    const waveRings = options.waveRings ?? DEFAULT_WAVE_RINGS;
    const col = source?.gridCol;
    const row = source?.gridRow;
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0) {
      return;
    }

    const sourceColorId = source.colorId;
    const rings = collectWaveRings(source, fruits, waveRings, findGridNeighborFruits);
    let staggerIndex = 0;

    for (const ring of rings) {
      ring
        .sort((a, b) => crossWaveSortKey(source, a) - crossWaveSortKey(source, b))
        .forEach((fruit) => {
          if (fruit.colorId !== sourceColorId) return;
          fruit.playPopWave?.({
            delay: staggerIndex * staggerSec,
            scalePeak: 1.16,
            scaleDip: 0.84,
          });
          staggerIndex += 1;
        });
    }
  }

  return { triggerCrossWave };
}