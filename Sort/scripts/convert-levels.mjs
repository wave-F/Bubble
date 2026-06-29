import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import xlsx from "xlsx";

const INPUT_RELATIVE = path.join("src", "excel", "Levels.xlsx");
const OUTPUT_RELATIVE = path.join("src", "config", "levels.json");
const REQUIRED_COLUMNS = ["id", "name", "difficulty", "colorkindcount", "seed"];
const OPTIONAL_COLUMNS = ["homebubblecolorid", "gridsize"];
const AVAILABLE_COLOR_IDS = [0, 1, 2, 3, 4, 5, 6, 7];
const STEP_MULT = { easy: 2.2, medium: 1.75, hard: 1.45 };

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value, field, rowNum) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${field} at row ${rowNum}`);
  }
  return num;
}

function parseDifficulty(raw, rowNum) {
  const text = normalize(raw);
  if (["easy", "简单", "e"].includes(text)) return "easy";
  if (["medium", "中等", "normal", "m"].includes(text)) return "medium";
  if (["hard", "困难", "h"].includes(text)) return "hard";
  throw new Error(`Invalid difficulty at row ${rowNum}, expected easy/medium/hard`);
}

function parseHomeBubbleColorId(raw, difficulty, rowNum, id) {
  if (raw != null && String(raw).trim() !== "") {
    const value = Math.floor(toNumber(raw, "homeBubbleColorId", rowNum));
    if (value < 0 || value >= AVAILABLE_COLOR_IDS.length) {
      throw new Error(`Invalid homeBubbleColorId at row ${rowNum}, expected 0-${AVAILABLE_COLOR_IDS.length - 1}`);
    }
    return value;
  }

  if (difficulty === "hard") return 0;
  if (difficulty === "medium") return 4;
  const easyPalette = [1, 2, 3, 5, 6];
  return easyPalette[(Math.max(1, id) - 1) % easyPalette.length];
}

function createSeededRandom(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pickColorIds(kindCount, seed) {
  const rng = createSeededRandom(seed + 17);
  const pool = [...AVAILABLE_COLOR_IDS];
  shuffleInPlace(pool, rng);
  return pool.slice(0, kindCount).sort((a, b) => a - b);
}

function buildEvenColorCounts(colorIds, cellCount) {
  const counts = colorIds.map((colorId) => ({ colorId, count: 0 }));
  for (let i = 0; i < cellCount; i += 1) counts[i % counts.length].count += 1;
  return counts;
}

function defaultGridSpec(id) {
  if (id <= 5) return { gridSize: 3, gridCellSize: 1.05, gridBubbleFill: 0.84 };
  if (id <= 12) return { gridSize: 4, gridCellSize: 0.95, gridBubbleFill: 0.82 };
  return { gridSize: 5, gridCellSize: 0.9, gridBubbleFill: 0.8 };
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const header = row.map(normalize);
    return REQUIRED_COLUMNS.every((key) => header.includes(key));
  });
}

function validateLevels(levels) {
  const idSet = new Set();
  for (const level of levels) {
    if (idSet.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`);
    idSet.add(level.id);
  }

  const ids = [...idSet].sort((a, b) => a - b);
  for (let i = 0; i < ids.length; i += 1) {
    if (ids[i] !== i + 1) {
      throw new Error(`Level ids must be continuous from 1, got: ${ids.join(", ")}`);
    }
  }
}

export function convertLevels(projectRoot = process.cwd()) {
  const inputPath = path.join(projectRoot, INPUT_RELATIVE);
  const outputPath = path.join(projectRoot, OUTPUT_RELATIVE);

  if (!fs.existsSync(inputPath)) {
    console.warn(`[excel:sync] ${INPUT_RELATIVE} not found, keep existing json`);
    return;
  }

  const workbook = xlsx.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("No sheet found in Levels.xlsx");

  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) {
    throw new Error(`Header row not found. Required: ${REQUIRED_COLUMNS.join(", ")}`);
  }

  const header = rows[headerRowIndex].map(normalize);
  const requiredCol = Object.fromEntries(REQUIRED_COLUMNS.map((key) => [key, header.indexOf(key)]));
  const optionalCol = Object.fromEntries(OPTIONAL_COLUMNS.map((key) => [key, header.indexOf(key)]));
  const col = { ...requiredCol, ...optionalCol };

  const levels = [];
  for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const excelRowNum = i + 1;
    const idValue = row[col.id];
    if (idValue == null || String(idValue).trim() === "") continue;

    const id = Math.floor(toNumber(idValue, "id", excelRowNum));
    const name = String(row[col.name] ?? "").trim() || `染色-${String(id).padStart(2, "0")}`;
    const difficulty = parseDifficulty(row[col.difficulty], excelRowNum);
    const kindCount = Math.floor(toNumber(row[col.colorkindcount], "colorKindCount", excelRowNum));
    const homeBubbleColorId = parseHomeBubbleColorId(
      col.homebubblecolorid >= 0 ? row[col.homebubblecolorid] : null,
      difficulty,
      excelRowNum,
      id
    );

    const seedRaw = row[col.seed];
    const seed = (seedRaw == null || String(seedRaw).trim() === "")
      ? 20000 + id * 137
      : Math.floor(toNumber(seedRaw, "seed", excelRowNum));

    if (id <= 0) throw new Error(`Invalid id at row ${excelRowNum}`);
    if (kindCount < 1 || kindCount > AVAILABLE_COLOR_IDS.length) {
      throw new Error(`Invalid colorKindCount at row ${excelRowNum}`);
    }

    const grid = defaultGridSpec(id);
    if (col.gridsize >= 0 && row[col.gridsize] != null && String(row[col.gridsize]).trim() !== "") {
      grid.gridSize = Math.max(3, Math.min(6, Math.floor(toNumber(row[col.gridsize], "gridSize", excelRowNum))));
    }

    const cellCount = grid.gridSize * grid.gridSize;
    const colorIds = pickColorIds(kindCount, seed);
    const colorCounts = buildEvenColorCounts(colorIds, cellCount);
    const stepLimit = Math.max(8, Math.floor(cellCount * STEP_MULT[difficulty]));

    levels.push({
      id,
      name,
      difficulty,
      homeBubbleColorId,
      gridSize: grid.gridSize,
      gridCellSize: grid.gridCellSize,
      gridBubbleFill: grid.gridBubbleFill,
      gridVerticalAlign: "center",
      gridVerticalOffset: 0.2,
      seed,
      fruitCount: cellCount,
      colorIds,
      colorCounts,
      stepLimit,
    });
  }

  if (!levels.length) throw new Error("No valid level rows found in Levels.xlsx");
  validateLevels(levels);

  const output = { source: INPUT_RELATIVE, levels };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${sheetName}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  convertLevels(process.cwd());
}