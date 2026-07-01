import { TUNING_EXPORT_KEYS } from "../../config/tuning-export-keys.mjs";

export { TUNING_EXPORT_KEYS };

/** @type {(() => void | Promise<void>) | null} */
let exportPrepareHook = null;

/** @type {(() => Record<string, object>) | null} */
let exportLiveEntriesHook = null;

export function registerTuningExportContext({ prepare, getLiveEntries } = {}) {
  exportPrepareHook = prepare ?? null;
  exportLiveEntriesHook = getLiveEntries ?? null;
}

function cloneEntry(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildTuningSnapshot({ liveEntries } = {}) {
  const entries = {};
  const live = liveEntries ?? {};

  if (typeof window === "undefined" || !window.localStorage) {
    for (const key of TUNING_EXPORT_KEYS) {
      if (live[key] != null) entries[key] = cloneEntry(live[key]);
    }
    const populated = TUNING_EXPORT_KEYS.filter((key) => entries[key] != null).length;
    return { version: 1, exportedAt: new Date().toISOString(), entries, populated };
  }

  for (const key of TUNING_EXPORT_KEYS) {
    if (live[key] != null) {
      entries[key] = cloneEntry(live[key]);
      continue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      entries[key] = JSON.parse(raw);
    } catch {
      // skip invalid JSON for this key
    }
  }

  const populated = TUNING_EXPORT_KEYS.filter((key) => entries[key] != null).length;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    populated,
  };
}

export function formatTuningSnapshotText(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function downloadTuningSnapshotText(text, snapshot) {
  const stamp = snapshot.exportedAt.slice(0, 10);
  const name = `tuning-snapshot-${stamp}.json`;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Flush live tuning, build snapshot, copy JSON to clipboard (download fallback). */
export async function exportTuningSnapshotToClipboard() {
  await exportPrepareHook?.();
  const liveEntries = exportLiveEntriesHook?.() ?? {};
  const snapshot = buildTuningSnapshot({ liveEntries });
  const text = formatTuningSnapshotText(snapshot);

  if (snapshot.populated <= 0) {
    return { snapshot, copied: false, downloaded: false, empty: true };
  }

  let copied = false;
  try {
    copied = await copyTextToClipboard(text);
  } catch {
    copied = false;
  }

  let downloaded = false;
  if (!copied) {
    downloadTuningSnapshotText(text, snapshot);
    downloaded = true;
  }

  return { snapshot, copied, downloaded, empty: false };
}