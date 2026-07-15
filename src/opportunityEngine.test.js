/**
 * Opportunity engine unit tests.
 * Each detector is tested with: matched fixture, not-matched fixture, edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  detectSalarySacrifice,
  detectMortgageAcceleration,
  detectCarryForwardCap,
  detectRetirementAgeOptimisation,
  detectMonteCarloAnalysis,
  detectDebtRecycling,
  runOpportunityDetectors,
} from "./opportunityEngine.js";
import { FEATURES } from "./features.js";

// ── Salary sacrifice ──────────────────────────────────────────────────────────

describe("detectSalarySacrifice", () => {
  it("matches when there is meaningful cap headroom", () => {
    const result = detectSalarySacrifice({
      grossIncome: "120000", bonusIncome: "0", otherIncome: "0",
      employerSgRate: "12", salarySacrifice: "0",
    });
    // SG = 120k * 12% = 14,400. Headroom = 30,000 - 14,400 = 15,600
    expect(result.matched).toBe(true);
    expect(result.description).toContain("15,600");
  });

  it("does not match when income is below the threshold", () => {
    const result = detectSalarySacrifice({
      grossIncome: "50000", bonusIncome: "0", otherIncome: "0",
      employerSgRate: "12", salarySacrifice: "0",
    });
    expect(result.matched).toBe(false);
  });

  it("does not match when concessional cap is already fully utilised", () => {
    // SG = 200k * 12% = 24,000; SS = 7,000 → total = 31,000 > 30,000
    const result = detectSalarySacrifice({
      grossIncome: "200000", bonusIncome: "0", otherIncome: "0",
      employerSgRate: "12", salarySacrifice: "7000",
    });
    expect(result.matched).toBe(false);
  });

  it("includes cap headroom in description for matched result", () => {
    const result = detectSalarySacrifice({
      grossIncome: "100000", bonusIncome: "0", otherIncome: "0",
      employerSgRate: "12", salarySacrifice: "0",
    });
    expect(result.description).toMatch(/\$\d/);
    expect(result.description).toContain("30,000");
  });

  it("featureId is CUSTOM_ASSUMPTIONS", () => {
    const r = detectSalarySacrifice({ grossIncome: "100000", employerSgRate: "12", salarySacrifice: "0" });
    expect(r.featureId).toBe(FEATURES.CUSTOM_ASSUMPTIONS);
  });
});

// ── Mortgage acceleration ─────────────────────────────────────────────────────

describe("detectMortgageAcceleration", () => {
  it("matches when mortgage rate is at or above threshold", () => {
    const result = detectMortgageAcceleration({
      mortgageBalance: "500000", mortgageRate: "6.2",
    });
    expect(result.matched).toBe(true);
    expect(result.description).toContain("6.2%");
    expect(result.description).toContain("500,000");
  });

  it("does not match when mortgage rate is below threshold", () => {
    const result = detectMortgageAcceleration({
      mortgageBalance: "400000", mortgageRate: "4.5",
    });
    expect(result.matched).toBe(false);
  });

  it("does not match when mortgage balance is negligible", () => {
    const result = detectMortgageAcceleration({
      mortgageBalance: "1000", mortgageRate: "6.5",
    });
    expect(result.matched).toBe(false);
  });

  it("does not match when there is no mortgage", () => {
    const result = detectMortgageAcceleration({
      mortgageBalance: "0", mortgageRate: "6.5",
    });
    expect(result.matched).toBe(false);
  });

  it("featureId is DEBT_RECYCLING", () => {
    const r = detectMortgageAcceleration({ mortgageBalance: "400000", mortgageRate: "6" });
    expect(r.featureId).toBe(FEATURES.DEBT_RECYCLING);
  });
});

// ── Carry-forward cap ─────────────────────────────────────────────────────────

describe("detectCarryForwardCap", () => {
  it("matches when super balance is under $500k", () => {
    const result = detectCarryForwardCap({ superBalance: "180000" });
    expect(result.matched).toBe(true);
    expect(result.description).toContain("180,000");
    expect(result.description).toContain("$500k");
  });

  it("does not match when super balance is at or above $500k", () => {
    const result = detectCarryForwardCap({ superBalance: "500000" });
    expect(result.matched).toBe(false);
  });

  it("does not match when super balance is zero (no entry yet)", () => {
    const result = detectCarryForwardCap({ superBalance: "0" });
    expect(result.matched).toBe(false);
  });

  it("does not match when super balance is just above the threshold", () => {
    const result = detectCarryForwardCap({ superBalance: "500001" });
    expect(result.matched).toBe(false);
  });

  it("featureId is CARRY_FORWARD_CAP", () => {
    const r = detectCarryForwardCap({ superBalance: "200000" });
    expect(r.featureId).toBe(FEATURES.CARRY_FORWARD_CAP);
  });
});

// ── Retirement age optimisation ───────────────────────────────────────────────

describe("detectRetirementAgeOptimisation", () => {
  it("matches when engine has a non-zero projectedSuper", () => {
    const engine = { metrics: { projectedSuper: 1_200_000 } };
    const result = detectRetirementAgeOptimisation({ retirementAge: "65" }, engine);
    expect(result.matched).toBe(true);
    expect(result.description).toContain("$1.2m");
    expect(result.description).toContain("65");
  });

  it("matches when super balance and income exist even without engine", () => {
    const result = detectRetirementAgeOptimisation({
      retirementAge: "60", superBalance: "300000", grossIncome: "90000",
    }, null);
    expect(result.matched).toBe(true);
  });

  it("does not match when no projection data exists", () => {
    const result = detectRetirementAgeOptimisation({
      retirementAge: "65", superBalance: "0", grossIncome: "0",
    }, null);
    expect(result.matched).toBe(false);
  });

  it("featureId is CUSTOM_ASSUMPTIONS", () => {
    const r = detectRetirementAgeOptimisation({
      retirementAge: "65", superBalance: "200000", grossIncome: "100000",
    }, null);
    expect(r.featureId).toBe(FEATURES.CUSTOM_ASSUMPTIONS);
  });
});

// ── Monte Carlo analysis ──────────────────────────────────────────────────────

describe("detectMonteCarloAnalysis", () => {
  it("matches when retirement spending target is set", () => {
    const result = detectMonteCarloAnalysis({
      targetRetirementSpending: "65000", lifeExpectancy: "90",
    });
    expect(result.matched).toBe(true);
    expect(result.description).toContain("65,000");
    expect(result.description).toContain("age 90");
  });

  it("does not match when spending target is zero or unset", () => {
    expect(detectMonteCarloAnalysis({ targetRetirementSpending: "0" }).matched).toBe(false);
    expect(detectMonteCarloAnalysis({ targetRetirementSpending: "" }).matched).toBe(false);
    expect(detectMonteCarloAnalysis({}).matched).toBe(false);
  });

  it("featureId is PROBABILITY_VIEW", () => {
    const r = detectMonteCarloAnalysis({ targetRetirementSpending: "60000" });
    expect(r.featureId).toBe(FEATURES.PROBABILITY_VIEW);
  });
});

// ── Debt recycling ────────────────────────────────────────────────────────────

describe("detectDebtRecycling", () => {
  it("matches when mortgage plus shares are present", () => {
    const result = detectDebtRecycling({
      mortgageBalance: "400000", sharesEtfs: "50000",
      managedFunds: "0", hasInvestmentProperty: "no",
    });
    expect(result.matched).toBe(true);
    expect(result.description).toContain("400,000");
  });

  it("matches when mortgage plus an investment property are present", () => {
    const result = detectDebtRecycling({
      mortgageBalance: "400000", sharesEtfs: "0",
      managedFunds: "0", hasInvestmentProperty: "yes",
    });
    expect(result.matched).toBe(true);
  });

  it("does not match when mortgage balance is below minimum threshold", () => {
    const result = detectDebtRecycling({
      mortgageBalance: "30000", sharesEtfs: "100000",
      managedFunds: "0", hasInvestmentProperty: "no",
    });
    expect(result.matched).toBe(false);
  });

  it("does not match when there are no investment assets", () => {
    const result = detectDebtRecycling({
      mortgageBalance: "400000", sharesEtfs: "0",
      managedFunds: "0", hasInvestmentProperty: "no",
    });
    expect(result.matched).toBe(false);
  });

  it("does not match when there is no mortgage", () => {
    const result = detectDebtRecycling({
      mortgageBalance: "0", sharesEtfs: "200000",
      managedFunds: "0", hasInvestmentProperty: "yes",
    });
    expect(result.matched).toBe(false);
  });

  it("featureId is DEBT_RECYCLING", () => {
    const r = detectDebtRecycling({
      mortgageBalance: "400000", sharesEtfs: "50000",
      managedFunds: "0", hasInvestmentProperty: "no",
    });
    expect(r.featureId).toBe(FEATURES.DEBT_RECYCLING);
  });
});

// ── runOpportunityDetectors ───────────────────────────────────────────────────

describe("runOpportunityDetectors", () => {
  const richPlan = {
    grossIncome: "120000", bonusIncome: "0", otherIncome: "0",
    employerSgRate: "12", salarySacrifice: "0",
    mortgageBalance: "500000", mortgageRate: "6.2",
    superBalance: "180000", retirementAge: "65", grossIncome: "120000",
    targetRetirementSpending: "65000", lifeExpectancy: "90",
    sharesEtfs: "50000", managedFunds: "0", hasInvestmentProperty: "no",
  };

  it("returns exactly 6 opportunity objects", () => {
    const results = runOpportunityDetectors(richPlan);
    expect(results).toHaveLength(6);
  });

  it("each result has required fields", () => {
    const results = runOpportunityDetectors(richPlan);
    results.forEach(r => {
      expect(typeof r.id).toBe("string");
      expect(typeof r.title).toBe("string");
      expect(typeof r.description).toBe("string");
      expect(typeof r.matched).toBe("boolean");
      expect(typeof r.featureId).toBe("string");
      expect(typeof r.priority).toBe("number");
    });
  });

  it("results are sorted by priority (ascending)", () => {
    const results = runOpportunityDetectors(richPlan);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].priority).toBeGreaterThanOrEqual(results[i - 1].priority);
    }
  });

  it("matches multiple opportunities on a feature-rich plan", () => {
    const results = runOpportunityDetectors(richPlan);
    const matched = results.filter(r => r.matched);
    expect(matched.length).toBeGreaterThanOrEqual(3);
  });

  it("matches zero opportunities on an empty plan", () => {
    const results = runOpportunityDetectors({});
    expect(results.filter(r => r.matched)).toHaveLength(0);
  });
});
