export function logGateClick(featureId) {
  trackGateClick(featureId, {});
}

// trackGateClick — stub that becomes the full analytics pipeline in Phase 7.
// context: { source: "gate"|"improve_my_plan"|"toggle", ... }
export function trackGateClick(feature, context = {}) {
  if (import.meta.env.DEV) {
    console.info("[gate-click]", { feature, context, at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Gate Click", { props: { feature, source: context.source ?? "gate" } });
  }
}
