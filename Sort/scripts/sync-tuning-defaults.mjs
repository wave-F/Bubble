import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { applyTuningSnapshot, DEV_TUNING_DEFAULTS_PATH } from "./tuning-defaults-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function usage() {
  console.log("Usage: npm run tuning:sync -- [path/to/tuning-snapshot.json]");
  console.log(`Default snapshot: ${path.join(rootDir, "config", "tuning-snapshot.json")}`);
}

async function main() {
  const snapshotArg = process.argv[2];
  const snapshotPath = snapshotArg
    ? path.resolve(process.cwd(), snapshotArg)
    : path.join(rootDir, "config", "tuning-snapshot.json");

  let snapshotRaw;
  try {
    snapshotRaw = await readFile(snapshotPath, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      console.error(`Snapshot not found: ${snapshotPath}`);
      usage();
      process.exit(1);
    }
    throw err;
  }

  const snapshot = JSON.parse(snapshotRaw);
  const { updatedKeys, skippedKeys, unknownKeys } = await applyTuningSnapshot(snapshot);

  if (unknownKeys.length > 0) {
    console.warn(`Ignoring unknown snapshot keys: ${unknownKeys.join(", ")}`);
  }

  console.log(`Updated ${DEV_TUNING_DEFAULTS_PATH}`);
  console.log(`Keys written: ${updatedKeys.length ? updatedKeys.join(", ") : "(none)"}`);
  if (skippedKeys.length) {
    console.log(`Keys missing from snapshot (unchanged): ${skippedKeys.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});