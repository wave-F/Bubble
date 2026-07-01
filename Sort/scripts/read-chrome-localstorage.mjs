import { ClassicLevel } from "classic-level";
import path from "node:path";
import { TUNING_EXPORT_KEYS } from "../config/tuning-export-keys.mjs";

const ldbPath = process.argv[2] ?? "/tmp/chrome-ls-ldb";
const origin = process.argv[3] ?? "http://localhost:4173";

const db = new ClassicLevel(ldbPath, { createIfMissing: false, errorIfExists: false });

const entries = {};
const originPrefixes = [
  `_${origin}\x00\x01`,
  `_${origin.replace("localhost", "127.0.0.1")}\x00\x01`,
];

for await (const [key, value] of db.iterator()) {
  const keyStr = Buffer.isBuffer(key) ? key.toString("latin1") : String(key);
  let storageKey = null;
  for (const prefix of originPrefixes) {
    if (keyStr.startsWith(prefix)) {
      storageKey = keyStr.slice(prefix.length);
      break;
    }
  }
  if (storageKey == null) continue;
  if (!TUNING_EXPORT_KEYS.includes(storageKey)) continue;
  try {
    const buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "latin1");
    let start = 0;
    while (start < buf.length && buf[start] !== 0x7b) start += 1;
    if (start >= buf.length) continue;
    const text = buf.subarray(start).toString("utf8");
    entries[storageKey] = JSON.parse(text);
  } catch {
    // skip
  }
}

await db.close();

const populated = TUNING_EXPORT_KEYS.filter((k) => entries[k] != null).length;
const snapshot = {
  version: 1,
  exportedAt: new Date().toISOString(),
  entries,
  populated,
};

process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
if (populated <= 0) process.exit(2);