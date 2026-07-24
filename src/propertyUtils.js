import { STAMP_DUTY_BRACKETS, LAND_TAX } from "./ausConfig.js";

/** Estimate stamp duty for a residential property purchase in the given state. */
export function calcStampDuty(state, value) {
  const brackets = STAMP_DUTY_BRACKETS[state];
  if (!brackets || !value || value <= 0) return null;
  const bracket = brackets.find(b => value <= b.to);
  if (!bracket) return null;
  return Math.round(bracket.base + (value - bracket.over) * bracket.rate);
}

/** Return land tax info for display. Returns null if no state selected. */
export function getLandTaxInfo(state) {
  if (!state) return null;
  const info = LAND_TAX[state];
  if (info === null) return { hasLandTax: false, note: "NT has no land tax." };
  if (!info || info.threshold === null) return { hasLandTax: false, note: info?.note || null };
  return {
    hasLandTax:       true,
    threshold:        info.threshold,
    rate:             info.rate,
    premiumThreshold: info.premiumThreshold,
    premiumRate:      info.premiumRate,
    note:             info.note,
  };
}
