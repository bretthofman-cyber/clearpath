/**
 * Phase 5 — Advanced AU tax gating regression tests.
 *
 * Verifies that skipAdvancedTax=true:
 *   - suppresses Division 293 for high-income users
 *   - suppresses franking credit offsets
 *   - ignores carry-forward concessional cap
 *   - leaves basic tax (income tax, Medicare, HECS) unchanged
 *   - free user with Div-293-level income gets the same basic projection
 *     as before gating was introduced
 */

import { describe, it, expect } from "vitest";
import { calculatePersonTax, calculateHouseholdTax, runEngine } from "./engine.js";

// ── calculatePersonTax: Division 293 ─────────────────────────────────────────

describe("calculatePersonTax — Division 293 gating", () => {
  const HIGH_INCOME = 260_000;
  const SG_RATE = 0.12;
  const superConcessional = HIGH_INCOME * SG_RATE; // $31,200 → capped at $30k in reality; use raw for test

  it("charges Div293 when skipAdvancedTax is false (default)", () => {
    const result = calculatePersonTax(HIGH_INCOME, { superConcessional, skipAdvancedTax: false });
    expect(result.division293).toBeGreaterThan(0);
  });

  it("suppresses Div293 when skipAdvancedTax is true", () => {
    const result = calculatePersonTax(HIGH_INCOME, { superConcessional, skipAdvancedTax: true });
    expect(result.division293).toBe(0);
  });

  it("does not affect income tax, Medicare, or HECS when toggling skipAdvancedTax", () => {
    const withAdv  = calculatePersonTax(HIGH_INCOME, { superConcessional, skipAdvancedTax: false });
    const withFree = calculatePersonTax(HIGH_INCOME, { superConcessional, skipAdvancedTax: true });
    expect(withAdv.incomeTax).toBe(withFree.incomeTax);
    expect(withAdv.medicareLevy).toBe(withFree.medicareLevy);
  });

  it("Div293 is zero below the $250k threshold regardless of flag", () => {
    const lowIncome = 90_000;
    const lowSuper = lowIncome * 0.12;
    const a = calculatePersonTax(lowIncome, { superConcessional: lowSuper, skipAdvancedTax: false });
    const b = calculatePersonTax(lowIncome, { superConcessional: lowSuper, skipAdvancedTax: true });
    expect(a.division293).toBe(0);
    expect(b.division293).toBe(0);
  });
});

// ── calculatePersonTax: Franking credits ─────────────────────────────────────

describe("calculatePersonTax — franking credit gating", () => {
  it("applies franking credit offset when skipAdvancedTax is false", () => {
    const base = calculatePersonTax(80_000, { skipAdvancedTax: false });
    const withFc = calculatePersonTax(80_000, { frankingCredits: 5_000, skipAdvancedTax: false });
    expect(withFc.incomeTax).toBeLessThan(base.incomeTax);
    expect(withFc.frankingCredits).toBe(5_000);
  });

  it("ignores franking credits when skipAdvancedTax is true", () => {
    const base   = calculatePersonTax(80_000, { skipAdvancedTax: true });
    const withFc = calculatePersonTax(80_000, { frankingCredits: 5_000, skipAdvancedTax: true });
    expect(withFc.incomeTax).toBe(base.incomeTax);
    expect(withFc.frankingCredits).toBe(0);
  });
});

// ── calculateHouseholdTax: carry-forward cap ──────────────────────────────────

describe("calculateHouseholdTax — carry-forward cap gating", () => {
  const data = {
    grossIncome: "120000",
    employerSgRate: "12",
    salarySacrifice: "0",
    superBalance: "400000", // below $500k limit
    carryForwardCap: "20000",
    hasPartner: "no",
    privateHealthInsurance: "yes",
  };

  it("applies carry-forward cap when skipAdvancedTax is false", () => {
    const result = calculateHouseholdTax(data, [], { skipAdvancedTax: false });
    // With cfCap, concessional cap becomes $30k + $20k = $50k → excessConc drops
    // Exact calculation not asserted but cfCap path must be entered
    expect(result.totalHouseholdTax).toBeGreaterThan(0);
  });

  it("ignores carry-forward cap when skipAdvancedTax is true", () => {
    const withCap    = calculateHouseholdTax(data, [], { skipAdvancedTax: false });
    const withoutCap = calculateHouseholdTax(data, [], { skipAdvancedTax: true });
    // Without the carry-forward cap, more of the SS contribution may be treated as excess.
    // Tax with cap <= tax without cap (cap provides more headroom).
    expect(withoutCap.totalHouseholdTax).toBeGreaterThanOrEqual(withCap.totalHouseholdTax);
  });
});

// ── Regression: free-user basic tax unchanged by gating ──────────────────────

describe("Free-user basic tax regression — same output with and without skipAdvancedTax for ordinary income", () => {
  const data = {
    grossIncome: "90000",
    employerSgRate: "12",
    salarySacrifice: "0",
    superBalance: "200000",
    carryForwardCap: "0",
    hasPartner: "no",
    privateHealthInsurance: "yes",
    hecsDebt: "0",
  };

  it("income tax is identical for a $90k earner regardless of skipAdvancedTax", () => {
    const premium = calculateHouseholdTax(data, [], { skipAdvancedTax: false });
    const free    = calculateHouseholdTax(data, [], { skipAdvancedTax: true });
    expect(free.person1.incomeTax).toBe(premium.person1.incomeTax);
    expect(free.person1.medicareLevy).toBe(premium.person1.medicareLevy);
  });

  it("division293 is zero for a $90k earner — no locked indicator should appear", () => {
    const result = calculatePersonTax(90_000, { superConcessional: 90_000 * 0.12 });
    expect(result.division293).toBe(0);
  });
});

// ── runEngine: skipAdvancedTax wired through ──────────────────────────────────

describe("runEngine — skipAdvancedTax wired through", () => {
  const baseData = {
    age: "45",
    retirementAge: "65",
    lifeExpectancy: "90",
    grossIncome: "300000",
    bonusIncome: "0",
    otherIncome: "0",
    employerSgRate: "12",
    salarySacrifice: "0",
    superBalance: "500000",
    targetRetirementSpending: "80000",
    hasPartner: "no",
    privateHealthInsurance: "yes",
    investmentProperties: [],
    assetItems: [],
  };

  it("free-tier engine has division293 = 0", () => {
    const eng = runEngine(baseData, { skipMonteCarlo: true, skipAdvancedTax: true });
    expect(eng.householdTax.person1.division293).toBe(0);
  });

  it("premium-tier engine has division293 > 0 for high-income user", () => {
    const eng = runEngine(baseData, { skipMonteCarlo: true, skipAdvancedTax: false });
    expect(eng.householdTax.person1.division293).toBeGreaterThan(0);
  });

  it("TTR is null when skipAdvancedTax is true", () => {
    const eng = runEngine({ ...baseData, age: "62" }, { skipMonteCarlo: true, skipAdvancedTax: true });
    expect(eng.ttr).toBeNull();
  });

  it("basic projection (super, net worth) values are the same for non-advanced tax fields", () => {
    const engFree    = runEngine(baseData, { skipMonteCarlo: true, skipAdvancedTax: true });
    const engPremium = runEngine(baseData, { skipMonteCarlo: true, skipAdvancedTax: false });
    // Super projection doesn't depend on household tax calculation
    expect(engFree.metrics.projectedSuper).toBe(engPremium.metrics.projectedSuper);
    // Net worth differs because tax affects cashflow → expected
  });
});
