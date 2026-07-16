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

export function trackTrialStarted(featureId) {
  if (import.meta.env.DEV) {
    console.info("[trial-started]", { featureId, at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Trial Started", { props: { feature: featureId ?? "unknown" } });
  }
}

export function trackTrialExpired() {
  if (import.meta.env.DEV) {
    console.info("[trial-expired]", { at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Trial Expired");
  }
}

export function trackCheckoutStarted(planType) {
  if (import.meta.env.DEV) {
    console.info("[checkout-started]", { planType, at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Checkout Started", { props: { plan: planType } });
  }
}

export function trackSubscriptionActivated(planType) {
  if (import.meta.env.DEV) {
    console.info("[subscription-activated]", { planType, at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Subscription Activated", { props: { plan: planType ?? "unknown" } });
  }
}

export function trackSubscriptionCancelled() {
  if (import.meta.env.DEV) {
    console.info("[subscription-cancelled]", { at: new Date().toISOString() });
  }
  if (typeof window !== "undefined" && typeof window.plausible === "function") {
    window.plausible("Subscription Cancelled");
  }
}
