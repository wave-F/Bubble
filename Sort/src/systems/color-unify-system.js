export function createColorUnifySystem() {
  function isActiveFruit(fruit) {
    return Boolean(fruit?.active && !fruit.sliced);
  }

  function findGridNeighborFruits(source, fruits) {
    const col = source.gridCol;
    const row = source.gridRow;
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0) {
      return [];
    }

    const neighbors = [];
    for (const fruit of fruits) {
      if (!isActiveFruit(fruit) || fruit === source) continue;
      if (!Number.isInteger(fruit.gridCol) || !Number.isInteger(fruit.gridRow)) continue;

      const dc = Math.abs(fruit.gridCol - col);
      const dr = Math.abs(fruit.gridRow - row);
      if ((dc === 1 && dr === 0) || (dc === 0 && dr === 1)) {
        neighbors.push(fruit);
      }
    }

    return neighbors;
  }

  function applyPop({ source, fruits, colors }) {
    if (!isActiveFruit(source)) return;

    const colorId = source.colorId;
    const colorDef = colors?.[colorId];
    if (!colorDef) return;

    const neighbors = findGridNeighborFruits(source, fruits);
    for (const fruit of neighbors) {
      fruit.setColorId(colorId, colorDef.base);
      fruit.playDyePulse?.();
    }
  }

  function isBoardUnified(fruits) {
    let targetColorId = null;
    let activeCount = 0;

    for (const fruit of fruits) {
      if (!isActiveFruit(fruit)) continue;
      activeCount += 1;
      if (targetColorId === null) {
        targetColorId = fruit.colorId;
      } else if (fruit.colorId !== targetColorId) {
        return false;
      }
    }

    return activeCount >= 1;
  }

  return {
    applyPop,
    isBoardUnified,
    findGridNeighborFruits,
  };
}