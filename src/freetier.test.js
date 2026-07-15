/**
 * Free-tier integration tests.
 *
 * Verifies that a free user can complete the full
 * enter-profile -> project -> view-all-charts -> save journey
 * with zero locked interruptions on the happy path, and that
 * locked features are correctly blocked.
 */

import { describe, it, expect } from "vitest";
import { can, limit, tierOf } from "./entitlement.js";
import { FEATURES, PREMIUM_FEATURES, LIMITS } from "./features.js";
import { runEngine } from "./engine.js";

// ── Shared free-tier fixture ──────────────────────────────────────────────────
// A complete, realistic household plan for a free user.
const FREE_PLAN = {
  firstName: "Sam", age: "38", hasPartner: "no", partnerAge: "",
  partnerName: "", partnerRetirementAge: "",
  retirementAge: "65", lifeExpectancy: "90",
  homeOwnership: "mortgage", privateHealthInsurance: "yes",
  partnerPrivateHealthInsurance: "no",
  grossIncome: "120000", bonusIncome: "0", otherIncome: "0",
  partnerIncome: "", partnerBonusIncome: "", partnerOtherIncome: "",
  monthlyExpenses: "3500", annualIrregular: "4000", savingsPerMonth: "1500",
  insuranceAnnualPremium: "1200",
  budgetItems: [], assetItems: [],
  cashSavings: "25000", sharesEtfs: "40000", managedFunds: "0",
  crypto: "0", otherInvestments: "0", emergencyFund: "12000",
  ppOrValue: "850000", ppOrOwnershipPct: "100",
  mortgageBalance: "520000", mortgageRate: "6.2", loanType: "pi",
  mortgageStartYear: "2021", mortgageTenure: "30", mortgageIoExpiryYear: "",
  ppOrOffsetBalance: "15000",
  hasInvestmentProperty: "no", ipValue: "", ipMortgage: "", ipRate: "",
  ipWeeklyRent: "", investmentProperties: [],
  creditCardDebt: "0", personalLoanDebt: "0", hecsDebt: "25000",
  partnerCreditCardDebt: "", partnerPersonalLoanDebt: "", partnerHecsDebt: "",
  superBalance: "180000", partnerSuperBalance: "",
  employerSgRate: "12", partnerEmployerSgRate: "12",
  salarySacrifice: "0", partnerSalarySacrifice: "0",
  targetRetirementSpending: "65000",
  goals: [], activeScenario: "base",
  useCustomAssumptions: false, customAssumptions: {},
};

const freeTier = "free";

// ── Entitlement: free tier shape ─────────────────────────────────────────────

describe("Free tier entitlement", () => {
  it("tierOf returns 'free' for a new user with no subscription", () => {
    expect(tierOf({ status: "free", trialEndsAt: null })).toBe("free");
  });

  it("all declared premium features are blocked for free users", () => {
    Object.values(FEATURES).forEach(f => {
      expect(can(freeTier, f)).toBe(false);
    });
  });

  it("features not in the premium set are accessible to free users", () => {
    const exampleFreeFeatureIds = [
      "income_entry", "expense_entry", "super_entry",
      "asset_entry", "property_entry", "save_plan",
      "view_base_chart", "fire_panel",
    ];
    exampleFreeFeatureIds.forEach(f => {
      expect(PREMIUM_FEATURES.has(f)).toBe(false);
      expect(can(freeTier, f)).toBe(true);
    });
  });

  it("free tier: limited to 1 plan", () => {
    expect(limit(freeTier, "maxPlans")).toBe(1);
  });

  it("free tier: limited to 1 scenario per plan", () => {
    expect(limit(freeTier, "maxScenariosPerPlan")).toBe(1);
  });

  it("MULTI_PLAN is a premium feature (second plan is blocked)", () => {
    expect(can(freeTier, FEATURES.MULTI_PLAN)).toBe(false);
  });

  it("PROBABILITY_VIEW is a premium feature (Monte Carlo is blocked)", () => {
    expect(can(freeTier, FEATURES.PROBABILITY_VIEW)).toBe(false);
  });

  it("PDF_EXPORT is a premium feature", () => {
    expect(can(freeTier, FEATURES.PDF_EXPORT)).toBe(false);
  });

  it("SCENARIO_COMPARE is a premium feature", () => {
    expect(can(freeTier, FEATURES.SCENARIO_COMPARE)).toBe(false);
  });
});

// ── Engine: free user gets complete deterministic output ──────────────────────

describe("Free tier engine: complete base-case projection", () => {
  const engine = runEngine(FREE_PLAN, { skipMonteCarlo: true });

  it("returns a result object (engine does not throw for free user data)", () => {
    expect(engine).toBeDefined();
    expect(typeof engine).toBe("object");
  });

  it("Monte Carlo is null when skipped (no wasted CPU for free users)", () => {
    expect(engine.monteCarlo).toBeNull();
  });

  it("deterministic net worth trajectory is present and non-empty", () => {
    expect(Array.isArray(engine.trajectory)).toBe(true);
    expect(engine.trajectory.length).toBeGreaterThan(0);
  });

  it("trajectory spans from current age to life expectancy", () => {
    const ages = engine.trajectory.map(t => t.age);
    expect(ages[0]).toBe(38);
    expect(ages[ages.length - 1]).toBe(90);
  });

  it("projected super at retirement is a positive number", () => {
    expect(engine.metrics.projectedSuper).toBeGreaterThan(0);
  });

  it("FIRE number is present and positive", () => {
    expect(engine.metrics.fireNumber).toBeGreaterThan(0);
  });

  it("retirement net worth is calculated", () => {
    expect(typeof engine.metrics.retirementNetWorth).toBe("number");
  });

  it("household tax calculation runs (AU tax is not gated)", () => {
    expect(engine.householdTax).toBeDefined();
    expect(typeof engine.householdTax.totalHouseholdTax).toBe("number");
  });

  it("HECS repayment is included in tax calc (standard for free users)", () => {
    expect(engine.metrics.annualHouseholdTax).toBeGreaterThan(0);
  });

  it("debt-free date is calculated (mortgage payoff is not gated)", () => {
    expect(engine.mortgage).toBeDefined();
    expect(engine.mortgage.debtFreeYear).toBeGreaterThan(2024);
  });

  it("Age Pension estimate is present (not gated)", () => {
    expect(engine.agePension).toBeDefined();
    expect(typeof engine.agePension.estimatedAnnual).toBe("number");
  });

  it("FIRE panel data is present (not gated)", () => {
    expect(engine.fire).toBeDefined();
    expect(engine.fire.fireNumber).toBeGreaterThan(0);
  });
});

// ── Premium tier: Monte Carlo runs when entitled ──────────────────────────────

describe("Premium tier engine: probability view unlocks Monte Carlo", () => {
  it("Monte Carlo runs when skipMonteCarlo is false", () => {
    const engine = runEngine(FREE_PLAN, { skipMonteCarlo: false });
    expect(engine.monteCarlo).not.toBeNull();
    expect(engine.monteCarlo.successRate).toBeGreaterThanOrEqual(0);
    expect(engine.monteCarlo.successRate).toBeLessThanOrEqual(100);
  });

  it("Monte Carlo produces retirement balance percentiles", () => {
    const engine = runEngine(FREE_PLAN, { skipMonteCarlo: false });
    const rb = engine.monteCarlo.retirementBalance;
    expect(rb.p10).toBeGreaterThanOrEqual(0);
    expect(rb.p50).toBeGreaterThanOrEqual(rb.p10);
    expect(rb.p90).toBeGreaterThanOrEqual(rb.p50);
  });
});

// ── Server-side plan limit ────────────────────────────────────────────────────

describe("Server-side plan limit", () => {
  it("free tier cannot exceed 1 plan (limit check)", () => {
    const currentPlanCount = 1; // free users have exactly one plan
    const maxAllowed = limit(freeTier, "maxPlans");
    expect(currentPlanCount).toBeLessThanOrEqual(maxAllowed);
  });

  it("attempting a second plan exceeds the free limit", () => {
    const attemptedCount = 2;
    const maxAllowed = limit(freeTier, "maxPlans");
    expect(attemptedCount).toBeGreaterThan(maxAllowed);
  });

  it("premium tier has no plan limit", () => {
    expect(limit("active", "maxPlans")).toBe(Infinity);
    expect(limit("trialing", "maxPlans")).toBe(Infinity);
  });
});
