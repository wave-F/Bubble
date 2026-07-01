import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function shortSha256(data) {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

export async function getFileRevision(filePath) {
  const raw = await readFile(filePath);
  return shortSha256(raw);
}

export function tuningDefaultsPath(rootDir) {
  return path.join(rootDir, "src", "config", "dev-tuning.defaults.json");
}

export async function getTuningRevision(rootDir) {
  return getFileRevision(tuningDefaultsPath(rootDir));
}

export function buildAssetRevision({ tuningHash, mainJsHash }) {
  return `${tuningHash}-${mainJsHash}`;
}