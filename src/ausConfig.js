/**
 * Australian Tax & Superannuation Configuration — FY2026-27
 *
 * Sources:
 *   Income tax:  budget.gov.au — Stage 3 tax cuts, 15c bracket from 1 Jul 2026
 *   Super:       ATO — SGC rates; SISR — ABP min drawdowns
 *   HELP:        ATO — study and training loan repayment thresholds
 *   Age Pension: Services Australia — rates approximate, indexed Sep/Mar each year
 *
 * UPDATE THIS FILE each July when thresholds change.
 * All monetary values are AUD. Rates are decimals (not percentages).
 */

export const TAX_YEAR = "2026-27";

// ── Income Tax Brackets ───────────────────────────────────────────────────────
// Bracket `to` is exclusive of the upper boundary dollar.
// FY2026-27: 15c bracket (was 16c). Next change: 14c from 1 Jul 2027.
export const INCOME_TAX_BRACKETS = [
  { from: 0,       to: 18200,    rate: 0.00 },
  { from: 18200,   to: 45000,    rate: 0.15 },
  { from: 45000,   to: 135000,   rate: 0.30 },
  { from: 135000,  to: 190000,   rate: 0.37 },
  { from: 190000,  to: Infinity, rate: 0.45 },
];

// ── Low Income Tax Offset (LITO) ──────────────────────────────────────────────
// Max $700; phases to $0 at $66,667.
export const LITO = {
  maxOffset:   700,
  phase1UpTo:  37500,  phase1Rate: 0.05,
  phase2From:  45000,  phase2UpTo: 66667,  phase2Rate: 0.015,
};

// ── Medicare Levy ─────────────────────────────────────────────────────────────
// Simplified: 2% on all income above shade-in threshold (sufficient for planning).
export const MEDICARE = {
  levyRate:         0.02,
  shadeInThreshold: 26000,   // below this: levy shades in at 10c per $1 excess
  shadeInRate:      0.10,
};

// ── Medicare Levy Surcharge ───────────────────────────────────────────────────
// Applies when individual has no hospital-level private health cover.
// Thresholds are for singles; couple/family thresholds are higher — model individually.
export const MLS_BRACKETS = [
  { above: 0,       rate: 0.000 },
  { above: 93000,   rate: 0.010 },
  { above: 108000,  rate: 0.0125 },
  { above: 144000,  rate: 0.015 },
];

// ── HELP / HECS Compulsory Repayment Thresholds (FY2025-26) ──────────────────
// Rates apply to repayment income (approx equals taxable income for most employees).
// Note: HELP indexation was capped at CPI from 2023; thresholds index annually.
export const HELP_THRESHOLDS = [
  { from: 0,       rate: 0.000 },
  { from: 54435,   rate: 0.010 },
  { from: 62850,   rate: 0.020 },
  { from: 66620,   rate: 0.025 },
  { from: 70618,   rate: 0.030 },
  { from: 74855,   rate: 0.035 },
  { from: 79346,   rate: 0.040 },
  { from: 84107,   rate: 0.045 },
  { from: 89154,   rate: 0.050 },
  { from: 94503,   rate: 0.055 },
  { from: 100174,  rate: 0.060 },
  { from: 106185,  rate: 0.065 },
  { from: 112556,  rate: 0.070 },
  { from: 119309,  rate: 0.075 },
  { from: 126468,  rate: 0.080 },
  { from: 134056,  rate: 0.085 },
  { from: 142100,  rate: 0.090 },
  { from: 150626,  rate: 0.095 },
  { from: 159663,  rate: 0.100 },
];

// ── Division 293 ──────────────────────────────────────────────────────────────
// Additional 15% contributions tax for high-income earners.
// Assessed on concessional contributions up to the excess above the threshold.
// Bill usually paid from personal cash (ATO invoice), not from super fund.
export const DIV_293 = {
  threshold: 250000,  // income + concessional contributions
  rate:      0.15,    // additional tax (on top of standard 15%)
};

// ── Superannuation ────────────────────────────────────────────────────────────
export const SUPER = {
  sgRate:             0.12,      // FY2025-26 onwards (employer must contribute ≥12%)
  concessionalCap:    30000,     // FY2025-26+ per person
  nonConcessionalCap: 110000,    // per person
  contribTaxRate:     0.15,      // standard contributions tax deducted inside fund
  transferBalanceCap: 1900000,   // FY2025-26; indexed in $100k increments at CPI
  preservationAge:    60,
};

// ── Account-Based Pension Minimum Drawdown Rates ──────────────────────────────
// Source: SISR Schedule 7 — standard (non-COVID) rates.
// Minimum % of account balance that must be drawn each year in pension phase.
export const ABP_DRAWDOWN = [
  { minAge: 55, maxAge: 64, rate: 0.04 },
  { minAge: 65, maxAge: 74, rate: 0.05 },
  { minAge: 75, maxAge: 79, rate: 0.06 },
  { minAge: 80, maxAge: 84, rate: 0.07 },
  { minAge: 85, maxAge: 89, rate: 0.09 },
  { minAge: 90, maxAge: Infinity, rate: 0.14 },
];

// ── Age Pension ───────────────────────────────────────────────────────────────
// IMPORTANT: These are approximate values for illustrative planning only.
// Actual entitlement requires assessment by Services Australia.
// Rates are indexed every 6 months (Sep/Mar); thresholds change annually.
export const AGE_PENSION = {
  eligibilityAge: 67,
  // Annual payment rates (including Energy Supplement and Pension Supplement)
  singleRate:  28514,    // per year (approximate)
  coupleRate:  43022,    // per year combined (approximate)
  // Assets test — free areas (homeowner)
  assetsFree: {
    singleHome:    314000,
    coupleHome:    470000,
    singleNonHome: 566000,
    coupleNonHome: 722000,
  },
  // Assets taper: $3 per fortnight per $1,000 of excess = $78/year per $1,000
  assetsTaperPerThousand: 78,
  // Income test — annual free areas
  incomeFree: { single: 5512, couple: 9672 },
  // 50c per $1 of income over the free area (both single and couple combined rate)
  incomeTaperRate: 0.50,
};
