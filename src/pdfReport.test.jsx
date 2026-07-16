/**
 * PdfReport data-pipeline tests.
 * Tests the engine shape that PdfReport depends on, without rendering JSX
 * (no @testing-library/react in this project).
 */
import { describe, it, expect } from "vitest";
import { runEngine } from "./engine.js";
import { deriveAssetTotals } from "./AssetStage.jsx";
import { applyMaxedSS } from "./AnalysisStage.jsx";

const FULL_DATA = {
  firstName: "Sam", age: "38", hasPartner: "yes", partnerName: "Alex",
  partnerAge: "36", partnerRetirementAge: "65",
  dependants: "1", location: "VIC", employmentStatus: "full-time",
  retirementAge: "65", lifeExpectancy: "90",
  homeOwnership: "owner", privateHealthInsurance: "yes", partnerPrivateHealthInsurance: "yes",
  grossIncome: "120000", partnerIncome: "80000",
  bonusIncome: "0", otherIncome: "0", partnerBonusIncome: "0", partnerOtherIncome: "0",
  monthlyExpenses: "5500", annualIrregular: "5000", savingsPerMonth: "1500",
  emergencyFund: "25000",
  cashSavings: "20000", sharesEtfs: "50000", managedFunds: "0", crypto: "0",
  otherInvestments: "0",
  ppOrValue: "900000", ppOrOwnershipPct: "100",
  mortgageBalance: "550000", mortgageRate: "6.2", loanType: "pi",
  mortgageStartYear: "2020", mortgageTenure: "30", mortgageIoExpiryYear: "",
  ppOrOffsetBalance: "10000",
  creditCardDebt: "0", personalLoanDebt: "0", hecsDebt: "0",
  partnerCreditCardDebt: "0", partnerPersonalLoanDebt: "0", partnerHecsDebt: "0",
  superBalance: "85000", partnerSuperBalance: "65000",
  employerSgRate: "12", partnerEmployerSgRate: "12",
  salarySacrifice: "0", partnerSalarySacrifice: "0",
  carryForwardCap: "", partnerCarryForwardCap: "",
  frankingCredits: "", partnerFrankingCredits: "",
  insurancePremium: "3600", insuranceInSuper: "yes",
  partnerInsurancePremium: "2400", partnerInsuranceInSuper: "yes",
  debtRecycling: false,
  targetRetirementSpending: "65000",
  retirementLifestyle: "comfortable", riskTolerance: "balanced", activeScenario: "base",
  budgetItems: [], assetItems: [], investmentProperties: [], lifeEvents: [],
  customAssumptions: { base: {}, conservative: {}, aggressive: {} },
  useCustomAssumptions: false,
  salarySacrificeMaxed: false, partnerSalarySacrificeMaxed: false,
};

const SPARSE_DATA = {
  firstName: "Jo", age: "45", hasPartner: "no", partnerName: "",
  partnerAge: "", partnerRetirementAge: "",
  dependants: "0", location: "", employmentStatus: "full-time",
  retirementAge: "67", lifeExpectancy: "88",
  homeOwnership: "owner", privateHealthInsurance: "no", partnerPrivateHealthInsurance: "no",
  grossIncome: "90000", partnerIncome: "",
  bonusIncome: "", otherIncome: "", partnerBonusIncome: "", partnerOtherIncome: "",
  monthlyExpenses: "3500", annualIrregular: "", savingsPerMonth: "800",
  emergencyFund: "",
  cashSavings: "15000", sharesEtfs: "", managedFunds: "", crypto: "", otherInvestments: "",
  ppOrValue: "", ppOrOwnershipPct: "100",
  mortgageBalance: "", mortgageRate: "", loanType: "pi",
  mortgageStartYear: "", mortgageTenure: "30", mortgageIoExpiryYear: "",
  ppOrOffsetBalance: "",
  creditCardDebt: "", personalLoanDebt: "", hecsDebt: "",
  partnerCreditCardDebt: "", partnerPersonalLoanDebt: "", partnerHecsDebt: "",
  superBalance: "50000", partnerSuperBalance: "",
  employerSgRate: "12", partnerEmployerSgRate: "12",
  salarySacrifice: "", partnerSalarySacrifice: "0",
  carryForwardCap: "", partnerCarryForwardCap: "",
  frankingCredits: "", partnerFrankingCredits: "",
  insurancePremium: "", insuranceInSuper: "yes",
  partnerInsurancePremium: "", partnerInsuranceInSuper: "yes",
  debtRecycling: false,
  targetRetirementSpending: "45000",
  retirementLifestyle: "modest", riskTolerance: "balanced", activeScenario: "base",
  budgetItems: [], assetItems: [], investmentProperties: [], lifeEvents: [],
  customAssumptions: { base: {}, conservative: {}, aggressive: {} },
  useCustomAssumptions: false,
  salarySacrificeMaxed: false, partnerSalarySacrificeMaxed: false,
};

function derive(data) {
  const aT = deriveAssetTotals(data.assetItems);
  const ss = applyMaxedSS({ ...data, ...aT });
  return { ...ss, ...aT };
}

// ─── ENGINE SHAPE TESTS (used by PdfReport internally) ───────────────────────

describe("PdfReport — base engine (full data, no scenarios)", () => {
  const derived = derive(FULL_DATA);
  const engine = runEngine(
    { ...derived, activeScenario: "base" },
    { skipMonteCarlo: false, skipAdvancedTax: true }
  );

  it("engine does not throw for full data", () => {
    expect(engine).toBeTruthy();
  });

  it("trajectory has one row per year of life expectancy", () => {
    const expected = parseInt(FULL_DATA.lifeExpectancy) - parseInt(FULL_DATA.age) + 1;
    expect(engine.trajectory).toHaveLength(expected);
  });

  it("trajectory rows have all required fields for the chart", () => {
    for (const pt of engine.trajectory) {
      expect(typeof pt.age).toBe("number");
      expect(typeof pt.year).toBe("number");
      expect(typeof pt.netWorth).toBe("number");
      expect(typeof pt.superBalance).toBe("number");
      expect(typeof pt.liquidAssets).toBe("number");
      expect(typeof pt.propertyValue).toBe("number");
      expect(typeof pt.totalDebt).toBe("number");
      expect(typeof pt.isRetired).toBe("boolean");
    }
  });

  it("metrics block has key outcomes for the report", () => {
    expect(engine.metrics).toBeTruthy();
    expect(typeof engine.metrics.projectedSuper).toBe("number");
    expect(typeof engine.metrics.fireNumber).toBe("number");
  });

  it("assumptions block is present", () => {
    expect(engine.assumptions).toBeTruthy();
    expect(typeof engine.assumptions.returnRate).toBe("number");
    expect(typeof engine.assumptions.inflation).toBe("number");
  });

  it("Monte Carlo fanBands present and correctly structured", () => {
    expect(engine.monteCarlo).toBeTruthy();
    expect(engine.monteCarlo.successRate).toBeGreaterThanOrEqual(0);
    expect(engine.monteCarlo.successRate).toBeLessThanOrEqual(100);
    const band = engine.monteCarlo.fanBands[0];
    expect(band).toHaveProperty("age");
    expect(band).toHaveProperty("p10");
    expect(band).toHaveProperty("p50");
    expect(band).toHaveProperty("p90");
  });
});

describe("PdfReport — scenario engines (premium: conservative + aggressive)", () => {
  const derived = derive(FULL_DATA);

  it("conservative engine produces lower projected super than base", () => {
    const base = runEngine({ ...derived, activeScenario: "base" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    const cons = runEngine({ ...derived, activeScenario: "conservative" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    expect(cons.metrics.projectedSuper).toBeLessThan(base.metrics.projectedSuper);
  });

  it("aggressive engine produces higher projected super than base", () => {
    const base = runEngine({ ...derived, activeScenario: "base" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    const agg = runEngine({ ...derived, activeScenario: "aggressive" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    expect(agg.metrics.projectedSuper).toBeGreaterThan(base.metrics.projectedSuper);
  });

  it("all three scenario trajectories have the same length", () => {
    const base = runEngine({ ...derived, activeScenario: "base" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    const cons = runEngine({ ...derived, activeScenario: "conservative" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    const agg  = runEngine({ ...derived, activeScenario: "aggressive" },
      { skipMonteCarlo: true, skipAdvancedTax: true });
    expect(cons.trajectory).toHaveLength(base.trajectory.length);
    expect(agg.trajectory).toHaveLength(base.trajectory.length);
  });
});

describe("PdfReport — sparse data (single person, minimal inputs)", () => {
  const derived = derive(SPARSE_DATA);
  const engine = runEngine(
    { ...derived, activeScenario: "base" },
    { skipMonteCarlo: false, skipAdvancedTax: true }
  );

  it("engine does not throw for sparse data", () => {
    expect(engine).toBeTruthy();
  });

  it("trajectory exists and has rows", () => {
    expect(engine.trajectory.length).toBeGreaterThan(0);
  });

  it("trajectory rows have non-null age field", () => {
    for (const pt of engine.trajectory) {
      expect(pt.age).toBeGreaterThan(0);
    }
  });
});
