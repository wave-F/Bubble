import devTuningDefaults from "./dev-tuning.defaults.json" with { type: "json" };

export const DEV_TUNING_ENTRIES = devTuningDefaults.entries;

export function getDevTuningEntry(storageKey) {
  const entry = DEV_TUNING_ENTRIES[storageKey];
  if (!entry) return null;
  return { ...entry };
}

/** Fields used by the bubble-debug standalone page (subset of bubble_tuning_v1). */
export function getBubbleDebugMaterialDefaults() {
  const src = getDevTuningEntry("bubble_tuning_v1") ?? {};
  return {
    transmission: src.transmission,
    roughness: src.roughness,
    clearcoat: src.clearcoat,
    wobble: src.wobble,
    flow: src.flow,
    dye: src.dye,
    edge: src.edge,
    iri: src.iri,
    springTension: src.springTension,
    springDamping: src.springDamping,
    lightKey: src.lightKey,
    lightAmbient: src.lightAmbient,
    toggleDye: src.toggleDye,
    toggleEdge: src.toggleEdge,
    toggleIri: src.toggleIri,
    toggleBomb: false,
    toggleMechanismArrow: true,
    mechanismDirection: "right",
    pressFillRate: src.pressFillRate,
    pressSpringMax: src.pressSpringMax,
    pressContactStrength: src.pressContactStrength,
    pressCompress: src.pressCompress,
    pressExpand: src.pressExpand,
    centerDentDepth: src.centerDentDepth,
    centerDentRadius: src.centerDentRadius,
    centerDentPower: src.centerDentPower,
    centerDentNormal: src.centerDentNormal,
    centerDentRoughness: src.centerDentRoughness,
  };
}