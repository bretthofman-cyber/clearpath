export function logGateClick(featureId) {
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Gate Click", { props: { feature: featureId } });
  }
  if (import.meta.env.DEV) {
    console.info("[gate-click]", featureId, new Date().toISOString());
  }
}
