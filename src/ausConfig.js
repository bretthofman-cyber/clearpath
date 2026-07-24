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
export const MLS_BRACKETS = [
  { above: 0,       rate: 0.000 },
  { above: 93000,   rate: 0.010 },
  { above: 108000,  rate: 0.0125 },
  { above: 144000,  rate: 0.015 },
];

// MLS family income threshold — if combined family income is below this, the lower-income
// partner is exempt from MLS even if individually above the $93k single threshold.
// Source: ATO — FY2026-27.
export const MLS_FAMILY = {
  baseThreshold: 186000,
  perDependant:  1500,
};

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

// ── Family Tax Benefit ────────────────────────────────────────────────────────
// Simplified estimates for planning purposes only.
// Actual entitlement assessed by Services Australia — depends on children's ages,
// shared-care arrangements, activity test, and many other factors.
// Rates are approximate maximums for FY2025-26, indexed twice yearly.
export const FTB = {
  partAMaxPerChild:    2156,    // per child aged 0–12 (annual)
  partAIncomeTest:     62634,   // full rate below this combined family income
  partAReduceRate:     0.20,    // 20c per $1 above income test
  partABaseRate:       878,     // base rate below second income threshold
  partABaseIncomeTest: 116000,
  partBMaxUnder5:      2304,    // youngest child 0–4 (annual per family)
  partBMax5to12:       1609,    // youngest child 5–12
  partBPrimaryMax:     100900,  // primary earner income ceiling for Part B
  partBSecondaryFree:  6958,    // secondary earner income below which full Part B paid
  partBReduceRate:     0.20,
};

// ── Stamp Duty ────────────────────────────────────────────────────────────────
// Residential property purchase duty — non-first-home-buyer, established dwelling.
// INDICATIVE ONLY. First home buyer concessions, off-the-plan discounts, and
// foreign purchaser surcharges are NOT modelled.
// Each bracket: { to, base, rate, over } → duty = base + (value − over) × rate
// Source: State Revenue Office websites — approximate FY2025-26 schedules.
export const STAMP_DUTY_BRACKETS = {
  NSW: [
    { to: 17000,    base: 0,       rate: 0.0125, over: 0 },
    { to: 36000,    base: 212,     rate: 0.015,  over: 17000 },
    { to: 97000,    base: 497,     rate: 0.0175, over: 36000 },
    { to: 364000,   base: 1565,    rate: 0.035,  over: 97000 },
    { to: 1094000,  base: 10905,   rate: 0.045,  over: 364000 },
    { to: 3281000,  base: 43755,   rate: 0.055,  over: 1094000 },
    { to: Infinity, base: 164130,  rate: 0.07,   over: 3281000 },
  ],
  VIC: [
    { to: 25000,    base: 0,       rate: 0.014,  over: 0 },
    { to: 130000,   base: 350,     rate: 0.024,  over: 25000 },
    { to: 440000,   base: 2870,    rate: 0.05,   over: 130000 },
    { to: 960000,   base: 18370,   rate: 0.06,   over: 440000 },
    { to: Infinity, base: 49570,   rate: 0.055,  over: 960000 },
  ],
  QLD: [
    { to: 5000,     base: 0,       rate: 0,      over: 0 },
    { to: 75000,    base: 0,       rate: 0.015,  over: 5000 },
    { to: 540000,   base: 1050,    rate: 0.035,  over: 75000 },
    { to: 1000000,  base: 17325,   rate: 0.045,  over: 540000 },
    { to: Infinity, base: 38025,   rate: 0.0575, over: 1000000 },
  ],
  SA: [
    { to: 12000,    base: 0,       rate: 0.01,   over: 0 },
    { to: 30000,    base: 120,     rate: 0.02,   over: 12000 },
    { to: 50000,    base: 480,     rate: 0.03,   over: 30000 },
    { to: 100000,   base: 1080,    rate: 0.035,  over: 50000 },
    { to: 200000,   base: 2830,    rate: 0.04,   over: 100000 },
    { to: 250000,   base: 6830,    rate: 0.0425, over: 200000 },
    { to: 300000,   base: 8955,    rate: 0.0475, over: 250000 },
    { to: 500000,   base: 11330,   rate: 0.05,   over: 300000 },
    { to: Infinity, base: 21330,   rate: 0.055,  over: 500000 },
  ],
  WA: [
    { to: 80000,    base: 0,       rate: 0.019,  over: 0 },
    { to: 100000,   base: 1520,    rate: 0.0285, over: 80000 },
    { to: 250000,   base: 2090,    rate: 0.03,   over: 100000 },
    { to: 500000,   base: 6590,    rate: 0.0415, over: 250000 },
    { to: Infinity, base: 16965,   rate: 0.05,   over: 500000 },
  ],
  TAS: [
    { to: 25000,    base: 50,      rate: 0.0175, over: 3000 },
    { to: 75000,    base: 435,     rate: 0.025,  over: 25000 },
    { to: 200000,   base: 1685,    rate: 0.03,   over: 75000 },
    { to: 375000,   base: 5435,    rate: 0.035,  over: 200000 },
    { to: 725000,   base: 11560,   rate: 0.04,   over: 375000 },
    { to: Infinity, base: 25560,   rate: 0.045,  over: 725000 },
  ],
  ACT: [
    { to: 200000,   base: 0,       rate: 0.020,  over: 0 },
    { to: 300000,   base: 4000,    rate: 0.028,  over: 200000 },
    { to: 500000,   base: 6800,    rate: 0.038,  over: 300000 },
    { to: 750000,   base: 14400,   rate: 0.047,  over: 500000 },
    { to: 1000000,  base: 26150,   rate: 0.055,  over: 750000 },
    { to: 1455000,  base: 39900,   rate: 0.059,  over: 1000000 },
    { to: Infinity, base: 66745,   rate: 0.067,  over: 1455000 },
  ],
  NT: [
    { to: 525000,   base: 0,       rate: 0.0499, over: 0 },
    { to: Infinity, base: 26198,   rate: 0.0499, over: 525000 },
  ],
};

// ── Land Tax ──────────────────────────────────────────────────────────────────
// Annual charge on unimproved land value. Principal place of residence is exempt
// in most states. NT has no land tax. Thresholds apply to combined portfolio value.
// INDICATIVE ONLY. Trust/company surcharges and foreign owner surcharges not modelled.
// Source: State Revenue Office websites — approximate FY2024-25 thresholds.
export const LAND_TAX = {
  NSW: { threshold: 1075000, rate: 0.016, premiumThreshold: 6571000, premiumRate: 0.02,   note: "Threshold applies to combined unimproved value of all taxable NSW properties." },
  VIC: { threshold: 300000,  rate: 0.010, premiumThreshold: 1800000, premiumRate: 0.015,  note: "Temporary state budget surcharge (0.1%) applies 2024-2026; not modelled." },
  QLD: { threshold: 600000,  rate: 0.010, premiumThreshold: 1000000, premiumRate: 0.0165, note: "Individual threshold. Company/trust thresholds are lower." },
  SA:  { threshold: 534000,  rate: 0.005, premiumThreshold: 1068000, premiumRate: 0.010,  note: null },
  WA:  { threshold: 300000,  rate: 0.009, premiumThreshold: 420000,  premiumRate: 0.011,  note: null },
  TAS: { threshold: 75000,   rate: 0.010, premiumThreshold: 350000,  premiumRate: 0.015,  note: null },
  ACT: { threshold: null,    rate: null,  premiumThreshold: null,    premiumRate: null,   note: "ACT is replacing stamp duty with annual rates — no separate land tax applies." },
  NT:  null,
};
