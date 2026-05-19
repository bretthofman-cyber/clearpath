// Clearpath calculation engine — mirrors Excel workbook logic
// All monetary inputs are strings; parse with p() before arithmetic.

export const DEFAULT_SCENARIOS = {
  base:         { returnRate: 6.5, inflation: 2.5, propertyGrowth: 4.5, rentalGrowth: 3.0, safeWithdrawal: 4.0 },
  conservative: { returnRate: 5.5, inflation: 3.0, propertyGrowth: 3.5, rentalGrowth: 2.5, safeWithdrawal: 4.0 },
  aggressive:   { returnRate: 7.5, inflation: 2.0, propertyGrowth: 5.5, rentalGrowth: 3.5, safeWithdrawal: 4.0 },
};

export function getActiveAssumptions(data) {
  const scenario = data.activeScenario || "base";
  if (data.useCustomAssumptions && data.customAssumptions?.[scenario]) {
    return data.customAssumptions[scenario];
  }
  return DEFAULT_SCENARIOS[scenario];
}

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

function p(val) {
  return parseFloat(String(val ?? "").replace(/,/g, "")) || 0;
}

// Future value of a lump sum: PV * (1+r)^n
function fvLump(pv, r, n) {
  return pv * Math.pow(1 + r, n);
}

// Future value of an annual annuity (end-of-year payments)
function fvAnnuity(pmt, r, n) {
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

// Monthly P&I payment given current balance, monthly rate, and remaining months
function monthlyPayment(balance, monthlyRate, remainingMonths) {
  if (monthlyRate === 0) return balance / remainingMonths;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) /
    (Math.pow(1 + monthlyRate, remainingMonths) - 1);
}

// ─── 1. SUPER PROJECTION ──────────────────────────────────────────────────────

export function projectSuper(data, assumptions) {
  const currentAge     = p(data.age);
  const retirementAge  = p(data.retirementAge) || 65;
  const years          = Math.max(retirementAge - currentAge, 0);
  const r              = assumptions.returnRate / 100;

  const balance        = p(data.superBalance) + (data.hasPartner === "yes" ? p(data.partnerSuperBalance) : 0);
  const grossIncome    = p(data.grossIncome)  + (data.hasPartner === "yes" ? p(data.partnerIncome) : 0);
  const sgRate         = (p(data.employerSgRate) || 12) / 100;
  const annualContribs = grossIncome * sgRate + p(data.salarySacrifice);

  const projectedBalance = fvLump(balance, r, years) + fvAnnuity(annualContribs, r, years);

  // Year-by-year accumulation for charting
  const trajectory = [];
  let bal = balance;
  for (let y = 0; y <= years; y++) {
    trajectory.push({ age: currentAge + y, balance: Math.round(bal) });
    bal = bal * (1 + r) + annualContribs;
  }

  return {
    projectedBalance: Math.round(projectedBalance),
    yearsToRetirement: years,
    annualContribs: Math.round(annualContribs),
    trajectory,
  };
}

// ─── 2. RETIREMENT DRAWDOWN ───────────────────────────────────────────────────

export function retirementDrawdown(data, assumptions, projectedSuperBalance) {
  const currentAge    = p(data.age);
  const retirementAge = p(data.retirementAge) || 65;
  const lifeExp       = p(data.lifeExpectancy) || 90;
  const yearsInRetirement = Math.max(lifeExp - retirementAge, 0);
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);

  const targetSpendingToday = p(data.targetRetirementSpending);
  const r       = assumptions.returnRate / 100;
  const inf     = assumptions.inflation / 100;
  const swr     = assumptions.safeWithdrawal / 100;

  // Target spending in future dollars at retirement date
  const futureSpending = targetSpendingToday * Math.pow(1 + inf, yearsToRetirement);

  // Balance required to sustain that spending via safe withdrawal rate
  const requiredBalance = swr > 0 ? Math.round(futureSpending / swr) : 0;

  // Year-by-year drawdown simulation
  let balance = projectedSuperBalance;
  let depletionAge = null;
  const trajectory = [];

  for (let y = 0; y < yearsInRetirement; y++) {
    const age = retirementAge + y;
    // Spending grows with CPI each year of retirement
    const withdrawal = futureSpending * Math.pow(1 + inf, y);
    balance = balance * (1 + r) - withdrawal;
    if (balance <= 0 && depletionAge === null) {
      depletionAge = age;
      trajectory.push({ age, balance: 0 });
      break;
    }
    trajectory.push({ age, balance: Math.round(balance) });
  }

  return {
    projectedSuperBalance: Math.round(projectedSuperBalance),
    requiredBalance,
    surplus: Math.round(projectedSuperBalance - requiredBalance),
    onTrack: projectedSuperBalance >= requiredBalance,
    depletionAge,
    lastsToLifeExpectancy: depletionAge === null,
    futureSpending: Math.round(futureSpending),
    trajectory,
  };
}

// ─── 3. DEBT-FREE DATE ────────────────────────────────────────────────────────

export function debtFreeDate(data) {
  const balance  = p(data.mortgageBalance);
  const annualRate = p(data.mortgageRate);
  const loanType = data.loanType || "pi";

  if (!balance) return null;

  if (loanType === "io") {
    return { type: "io", monthsToPayoff: null, debtFreeYear: null, monthlyPayment: null };
  }

  const monthlyRate = annualRate / 100 / 12;
  // Assume 30-year amortisation on the current balance (standard AU home loan)
  const LOAN_MONTHS = 360;
  const pmt = monthlyRate > 0
    ? monthlyPayment(balance, monthlyRate, LOAN_MONTHS)
    : balance / LOAN_MONTHS;

  // Simulate month-by-month to find payoff
  let bal = balance;
  let months = 0;
  while (bal > 0.01 && months < LOAN_MONTHS + 1) {
    const interest = bal * monthlyRate;
    const principal = pmt - interest;
    bal -= principal;
    months++;
  }

  const currentYear = new Date().getFullYear();
  const debtFreeYear = currentYear + Math.ceil(months / 12);

  // Also calc IP if present
  let ip = null;
  if (data.hasInvestmentProperty === "yes" && p(data.ipMortgage)) {
    const ipBal  = p(data.ipMortgage);
    const ipRate = p(data.ipRate) / 100 / 12;
    const ipPmt  = ipRate > 0 ? monthlyPayment(ipBal, ipRate, LOAN_MONTHS) : ipBal / LOAN_MONTHS;
    let ipBal2 = ipBal;
    let ipMonths = 0;
    while (ipBal2 > 0.01 && ipMonths < LOAN_MONTHS + 1) {
      ipBal2 -= ipPmt - ipBal2 * ipRate;
      ipMonths++;
    }
    ip = {
      monthsToPayoff: ipMonths,
      debtFreeYear: currentYear + Math.ceil(ipMonths / 12),
      monthlyPayment: Math.round(ipPmt),
    };
  }

  return {
    type: "pi",
    monthsToPayoff: months,
    yearsToPayoff: Math.ceil(months / 12),
    debtFreeYear,
    monthlyPayment: Math.round(pmt),
    ip,
  };
}

// ─── 4. NET WORTH TRAJECTORY ──────────────────────────────────────────────────

export function netWorthTrajectory(data, assumptions) {
  const currentAge    = p(data.age);
  const retirementAge = p(data.retirementAge) || 65;
  const lifeExp       = p(data.lifeExpectancy) || 90;
  const yearsTotal    = Math.max(lifeExp - currentAge, 0);

  const r         = assumptions.returnRate / 100;
  const propGrowth = assumptions.propertyGrowth / 100;
  const inf        = assumptions.inflation / 100;

  // ── Starting balances ────
  let liquid    = p(data.cashSavings) + p(data.offsetBalance) + p(data.sharesEtfs) +
                  p(data.managedFunds) + p(data.crypto) + p(data.otherInvestments);
  let superBal  = p(data.superBalance) + (data.hasPartner === "yes" ? p(data.partnerSuperBalance) : 0);
  let ppor      = p(data.ppOrValue);
  let mortgage  = p(data.mortgageBalance);
  let ipVal     = p(data.ipValue);
  let ipMort    = p(data.ipMortgage);
  let otherDebt = p(data.creditCardDebt) + p(data.personalLoanDebt) + p(data.hecsDebt);

  // ── Annual cashflows pre-retirement ────
  const annualSavings    = p(data.savingsPerMonth) * 12;
  const grossIncome      = p(data.grossIncome) + (data.hasPartner === "yes" ? p(data.partnerIncome) : 0);
  const sgRate           = (p(data.employerSgRate) || 12) / 100;
  const annualSuperIn    = grossIncome * sgRate + p(data.salarySacrifice);
  const targetSpending   = p(data.targetRetirementSpending);

  // ── Mortgage monthly payment (PPOR P&I, 30yr) ────
  const mortgageMonthlyRate = p(data.mortgageRate) / 100 / 12;
  const mortgagePmt = (mortgage > 0 && mortgageMonthlyRate > 0 && data.loanType === "pi")
    ? monthlyPayment(mortgage, mortgageMonthlyRate, 360)
    : 0;
  const annualMortgagePmt = mortgagePmt * 12;

  // ── IP mortgage monthly payment ────
  const ipMonthlyRate = p(data.ipRate) / 100 / 12;
  const ipPmt = (ipMort > 0 && ipMonthlyRate > 0)
    ? monthlyPayment(ipMort, ipMonthlyRate, 360)
    : 0;

  const trajectory = [];

  for (let y = 0; y <= yearsTotal; y++) {
    const age      = currentAge + y;
    const isRetired = age >= retirementAge;
    const nw = liquid + superBal + ppor + ipVal - mortgage - ipMort - Math.max(otherDebt, 0);
    trajectory.push({ age, netWorth: Math.round(nw), isRetired });

    if (y === yearsTotal) break;

    if (!isRetired) {
      // Accumulation phase
      liquid  = liquid * (1 + r) + annualSavings;
      superBal = superBal * (1 + r) + annualSuperIn;
    } else {
      // Drawdown phase — withdraw from super first, then liquid
      const withdrawal = targetSpending * Math.pow(1 + inf, y - (retirementAge - currentAge));
      if (superBal >= withdrawal) {
        superBal = superBal * (1 + r) - withdrawal;
      } else {
        const remainder = withdrawal - superBal;
        superBal = 0;
        liquid = Math.max(0, liquid * (1 + r) - remainder);
      }
      liquid = liquid > 0 ? liquid * (1 + r) : 0;
    }

    // Property growth
    ppor  = ppor  > 0 ? ppor  * (1 + propGrowth) : 0;
    ipVal = ipVal > 0 ? ipVal * (1 + propGrowth) : 0;

    // Amortise PPOR mortgage
    if (mortgage > 0 && data.loanType === "pi") {
      const interest   = mortgage * (p(data.mortgageRate) / 100);
      const principal  = Math.min(annualMortgagePmt - interest, mortgage);
      mortgage = Math.max(0, mortgage - principal);
    }

    // Amortise IP mortgage
    if (ipMort > 0) {
      const ipInterest  = ipMort * (p(data.ipRate) / 100);
      const ipPrincipal = Math.min(ipPmt * 12 - ipInterest, ipMort);
      ipMort = Math.max(0, ipMort - ipPrincipal);
    }

    // Other debts: assume cleared within 3 years
    if (otherDebt > 0) otherDebt = Math.max(0, otherDebt - otherDebt / 3);
  }

  return trajectory;
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

export function runEngine(data) {
  const assumptions = getActiveAssumptions(data);

  const superResult    = projectSuper(data, assumptions);
  const drawdown       = retirementDrawdown(data, assumptions, superResult.projectedBalance);
  const mortgage       = debtFreeDate(data);
  const trajectory     = netWorthTrajectory(data, assumptions);

  const retirementAge  = p(data.retirementAge) || 65;
  const atRetirement   = trajectory.find(t => t.age === retirementAge);
  const atEnd          = trajectory[trajectory.length - 1];

  return {
    assumptions,
    super: superResult,
    drawdown,
    mortgage,
    trajectory,
    metrics: {
      retirementNetWorth:  atRetirement?.netWorth  ?? 0,
      finalNetWorth:       atEnd?.netWorth          ?? 0,
      superSurplus:        drawdown.surplus,
      onTrack:             drawdown.onTrack,
      depletionAge:        drawdown.depletionAge,
      lastsToLifeExpectancy: drawdown.lastsToLifeExpectancy,
      debtFreeYear:        mortgage?.debtFreeYear   ?? null,
      projectedSuper:      superResult.projectedBalance,
      requiredSuper:       drawdown.requiredBalance,
    },
  };
}
