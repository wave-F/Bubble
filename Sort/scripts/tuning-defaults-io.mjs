import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TUNING_EXPORT_KEYS } from "../config/tuning-export-keys.mjs";
import { normalizePopRingTuning } from "../src/game/pop-ring-tuning.js";
import { normalizeBubblePopTuning } from "../src/game/bubble-pop-tuning.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export const DEV_TUNING_DEFAULTS_PATH = path.join(rootDir, "src", "config", "dev-tuning.defaults.json");

function normalizeEntry(key, value, currentEntry) {
  if (value == null || typeof value !== "object") {
    throw new Error(`Entry "${key}" must be a JSON object`);
  }
  switch (key) {
    case "pop_ring_debug_v1":
      return normalizePopRingTuning({ ...currentEntry, ...value });
    case "bubble_pop_tuning_v1":
      return normalizeBubblePopTuning({ ...currentEntry, ...value });
    default:
      return { ...currentEntry, ...value };
  }
}

export async function readDefaultsDoc() {
  const defaultsRaw = await readFile(DEV_TUNING_DEFAULTS_PATH, "utf8");
  const defaultsDoc = JSON.parse(defaultsRaw);
  if (!defaultsDoc.entries || typeof defaultsDoc.entries !== "object") {
    throw new Error("dev-tuning.defaults.json is missing `entries`");
  }
  return defaultsDoc;
}

export async function writeDefaultsDoc(defaultsDoc) {
  defaultsDoc.version = defaultsDoc.version ?? 1;
  delete defaultsDoc.syncedAt;
  delete defaultsDoc.syncedFrom;
  await writeFile(DEV_TUNING_DEFAULTS_PATH, `${JSON.stringify(defaultsDoc, null, 2)}\n`, "utf8");
}

/**
 * Merge snapshot.entries into the repo defaults file. Keys missing from the snapshot are left unchanged.
 * @returns {{ updatedKeys: string[], skippedKeys: string[], unknownKeys: string[] }}
 */
export function mergeSnapshotIntoDefaultsDoc(snapshot, defaultsDoc) {
  if (!snapshot?.entries || typeof snapshot.entries !== "object") {
    throw new Error("Snapshot must include an `entries` object");
  }

  const updatedKeys = [];
  const skippedKeys = [];

  for (const key of TUNING_EXPORT_KEYS) {
    const incoming = snapshot.entries[key];
    if (incoming == null) {
      skippedKeys.push(key);
      continue;
    }
    const currentEntry = defaultsDoc.entries[key] ?? {};
    defaultsDoc.entries[key] = normalizeEntry(key, incoming, currentEntry);
    updatedKeys.push(key);
  }

  const unknownKeys = Object.keys(snapshot.entries).filter((k) => !TUNING_EXPORT_KEYS.includes(k));
  return { updatedKeys, skippedKeys, unknownKeys };
}

export async function applyTuningSnapshot(snapshot) {
  const defaultsDoc = await readDefaultsDoc();
  const result = mergeSnapshotIntoDefaultsDoc(snapshot, defaultsDoc);
  await writeDefaultsDoc(defaultsDoc);
  return result;
}