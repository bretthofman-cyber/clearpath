import { describe, it, expect } from "vitest";
import { planDataCsvRows, projectionCsvRows } from "./exportCsv.js";
import { runEngine } from "./engine.js";

const BASE_DATA = {
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

// ─── PLAN DATA CSV ────────────────────────────────────────────────────────────

describe("planDataCsvRows", () => {
  it("returns header row and one data row", () => {
    const rows = planDataCsvRows(BASE_DATA);
    expect(rows).toHaveLength(2);
  });

  it("header and data row have equal column count", () => {
    const [headers, row] = planDataCsvRows(BASE_DATA);
    expect(row).toHaveLength(headers.length);
  });

  it("includes all required personal and income fields", () => {
    const [headers] = planDataCsvRows(BASE_DATA);
    for (const col of [
      "first_name", "age", "has_partner", "gross_income", "partner_income",
      "retirement_age", "super_balance", "target_retirement_spending",
    ]) {
      expect(headers).toContain(col);
    }
  });

  it("includes JSON array columns", () => {
    const [headers] = planDataCsvRows(BASE_DATA);
    expect(headers).toContain("budget_items_json");
    expect(headers).toContain("asset_items_json");
    expect(headers).toContain("investment_properties_json");
    expect(headers).toContain("life_events_json");
  });

  it("maps first_name correctly", () => {
    const [headers, row] = planDataCsvRows(BASE_DATA);
    const idx = headers.indexOf("first_name");
    expect(row[idx]).toBe("Sam");
  });

  it("maps gross_income as string number, no currency symbol", () => {
    const [headers, row] = planDataCsvRows(BASE_DATA);
    const idx = headers.indexOf("gross_income");
    expect(row[idx]).not.toMatch(/\$/);
    expect(Number(row[idx])).toBe(120000);
  });

  it("serialises empty arrays as valid JSON", () => {
    const [headers, row] = planDataCsvRows(BASE_DATA);
    const idx = headers.indexOf("asset_items_json");
    expect(() => JSON.parse(row[idx])).not.toThrow();
    expect(JSON.parse(row[idx])).toEqual([]);
  });

  it("debt_recycling is a string boolean", () => {
    const [headers, row] = planDataCsvRows(BASE_DATA);
    const idx = headers.indexOf("debt_recycling");
    expect(["true", "false"]).toContain(row[idx]);
  });

  it("handles missing optional fields gracefully", () => {
    const sparse = { ...BASE_DATA, partnerName: "", carryForwardCap: "" };
    expect(() => planDataCsvRows(sparse)).not.toThrow();
    const [headers, row] = planDataCsvRows(sparse);
    const idx = headers.indexOf("carry_forward_cap");
    expect(row[idx]).toBe("");
  });
});

// ─── PROJECTION CSV ───────────────────────────────────────────────────────────

describe("projectionCsvRows", () => {
  const engine = runEngine(BASE_DATA, { skipMonteCarlo: true });

  it("returns header + at least one data row", () => {
    const rows = projectionCsvRows(BASE_DATA, engine, false);
    expect(rows.length).toBeGreaterThan(1);
  });

  it("base headers match documented schema (no scenario cols)", () => {
    const [headers] = projectionCsvRows(BASE_DATA, engine, false);
    for (const col of [
      "age", "year", "net_worth", "super_balance",
      "liquid_assets", "property_value", "total_debt", "is_retired",
    ]) {
      expect(headers).toContain(col);
    }
    expect(headers).not.toContain("base_net_worth");
  });

  it("withScenarios=true adds per-scenario columns", () => {
    const rows = projectionCsvRows(BASE_DATA, engine, true);
    const [headers] = rows;
    expect(headers).toContain("base_net_worth");
    expect(headers).toContain("conservative_net_worth");
    expect(headers).toContain("aggressive_net_worth");
  });

  it("header and data rows have equal column count", () => {
    const [headers, ...dataRows] = projectionCsvRows(BASE_DATA, engine, false);
    for (const row of dataRows) {
      expect(row).toHaveLength(headers.length);
    }
  });

  it("net_worth values are finite numbers with no currency symbols", () => {
    const [headers, ...dataRows] = projectionCsvRows(BASE_DATA, engine, false);
    const idx = headers.indexOf("net_worth");
    for (const row of dataRows) {
      expect(String(row[idx])).not.toMatch(/\$/);
      expect(Number.isFinite(Number(row[idx]))).toBe(true);
    }
  });

  it("is_retired is 'true' or 'false' string", () => {
    const [headers, ...dataRows] = projectionCsvRows(BASE_DATA, engine, false);
    const idx = headers.indexOf("is_retired");
    for (const row of dataRows) {
      expect(["true", "false"]).toContain(row[idx]);
    }
  });

  it("age column increases monotonically", () => {
    const [headers, ...dataRows] = projectionCsvRows(BASE_DATA, engine, false);
    const idx = headers.indexOf("age");
    const ages = dataRows.map(r => Number(r[idx]));
    for (let i = 1; i < ages.length; i++) {
      expect(ages[i]).toBe(ages[i - 1] + 1);
    }
  });

  it("row count equals life expectancy minus current age + 1", () => {
    const [, ...dataRows] = projectionCsvRows(BASE_DATA, engine, false);
    const expected = parseInt(BASE_DATA.lifeExpectancy) - parseInt(BASE_DATA.age) + 1;
    expect(dataRows).toHaveLength(expected);
  });

  it("returns only headers when engine has no trajectory", () => {
    const rows = projectionCsvRows(BASE_DATA, { trajectory: [] }, false);
    expect(rows).toHaveLength(1);
  });

  it("withScenarios rows have correct column count including scenario cols", () => {
    const [headers, ...dataRows] = projectionCsvRows(BASE_DATA, engine, true);
    for (const row of dataRows) {
      expect(row).toHaveLength(headers.length);
    }
  });
});
