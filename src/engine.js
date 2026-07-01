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

function fvLump(pv, r, n) {
  return pv * Math.pow(1 + r, n);
}

function fvAnnuity(pmt, r, n) {
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

function monthlyPayment(balance, monthlyRate, remainingMonths) {
  if (monthlyRate === 0) return balance / remainingMonths;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) /
    (Math.pow(1 + monthlyRate, remainingMonths) - 1);
}

// ─── PROPERTY CASHFLOW ────────────────────────────────────────────────────────

export function propertyAnnualCashflow(ip) {
  const vacancyRate  = (p(ip.vacancyRate)  || 4) / 100;
  const mgmtFeeRate  = (p(ip.managementFee) || 8) / 100;

  const grossRent      = p(ip.weeklyRent) * 52 * (1 - vacancyRate);
  const mgmtFee        = grossRent * mgmtFeeRate;
  const councilRates   = p(ip.councilRates);
  const insurance      = p(ip.insurance);
  const bodyCorpAdmin  = p(ip.bodyCorpAdmin);
  const bodyCorpCap    = p(ip.bodyCorpCapital);
  const maintenance    = p(ip.maintenance);
  const depreciation   = p(ip.depreciation);
  const annualInterest = p(ip.mortgageBalance) * (p(ip.mortgageRate) / 100);

  const totalExpenses = mgmtFee + councilRates + insurance + bodyCorpAdmin +
                        bodyCorpCap + maintenance + annualInterest;
  const netCashflow   = grossRent - totalExpenses;
  // Taxable income adds depreciation as a further deduction (non-cash)
  const taxableIncome = netCashflow - depreciation;

  return {
    grossRent:        Math.round(grossRent),
    mgmtFee:          Math.round(mgmtFee),
    councilRates:     Math.round(councilRates),
    insurance:        Math.round(insurance),
    bodyCorpAdmin:    Math.round(bodyCorpAdmin),
    bodyCorpCap:      Math.round(bodyCorpCap),
    maintenance:      Math.round(maintenance),
    annualInterest:   Math.round(annualInterest),
    depreciation:     Math.round(depreciation),
    totalExpenses:    Math.round(totalExpenses),
    netCashflow:      Math.round(netCashflow),
    taxableIncome:    Math.round(taxableIncome),
    isNegativelyGeared: taxableIncome < 0,
  };
}

// ─── 1. SUPER PROJECTION ──────────────────────────────────────────────────────

export function projectSuper(data, assumptions) {
  const currentAge    = p(data.age);
  const retirementAge = p(data.retirementAge) || 65;
  const years         = Math.max(retirementAge - currentAge, 0);
  const r             = assumptions.returnRate / 100;

  const balance        = p(data.superBalance) + (data.hasPartner === "yes" ? p(data.partnerSuperBalance) : 0);
  const grossIncome    = p(data.grossIncome) + p(data.bonusIncome) + p(data.otherIncome)
                       + (data.hasPartner === "yes" ? p(data.partnerIncome) + p(data.partnerBonusIncome) + p(data.partnerOtherIncome) : 0);
  const sgRate         = (p(data.employerSgRate) || 12) / 100;
  const annualContribs = grossIncome * sgRate + p(data.salarySacrifice);

  const projectedBalance = fvLump(balance, r, years) + fvAnnuity(annualContribs, r, years);

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
  const currentAge        = p(data.age);
  const retirementAge     = p(data.retirementAge) || 65;
  const lifeExp           = p(data.lifeExpectancy) || 90;
  const yearsInRetirement = Math.max(lifeExp - retirementAge, 0);
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);

  const targetSpendingToday = p(data.targetRetirementSpending);
  const r   = assumptions.returnRate / 100;
  const inf = assumptions.inflation / 100;
  const swr = assumptions.safeWithdrawal / 100;

  const futureSpending  = targetSpendingToday * Math.pow(1 + inf, yearsToRetirement);
  const requiredBalance = swr > 0 ? Math.round(futureSpending / swr) : 0;

  let balance = projectedSuperBalance;
  let depletionAge = null;
  const trajectory = [];

  for (let y = 0; y < yearsInRetirement; y++) {
    const age        = retirementAge + y;
    const withdrawal = futureSpending * Math.pow(1 + inf, y);
    balance          = balance * (1 + r) - withdrawal;
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
    surplus:              Math.round(projectedSuperBalance - requiredBalance),
    onTrack:              projectedSuperBalance >= requiredBalance,
    depletionAge,
    lastsToLifeExpectancy: depletionAge === null,
    futureSpending:       Math.round(futureSpending),
    trajectory,
  };
}

// ─── 3. DEBT-FREE DATE ────────────────────────────────────────────────────────

export function debtFreeDate(data) {
  const balance     = p(data.mortgageBalance);
  const annualRate  = p(data.mortgageRate);
  const loanType    = data.loanType || "pi";
  const currentYear = new Date().getFullYear();

  // Derive remaining term from start year + tenure, falling back to 30-year default
  const startYear    = p(data.mortgageStartYear) || currentYear;
  const tenure       = p(data.mortgageTenure) || 30;
  const elapsed      = Math.max(0, currentYear - startYear);
  const remainingYrs = Math.max(1, tenure - elapsed);
  const LOAN_MONTHS  = remainingYrs * 12;

  const loanEndYear = startYear + tenure;
  const monthlyRate = annualRate / 100 / 12;

  // PPOR
  let pporResult = null;
  if (balance) {
    if (loanType === "io") {
      const ioExpiryYear = p(data.mortgageIoExpiryYear);
      const ioActive = ioExpiryYear > 0 && ioExpiryYear < loanEndYear;
      const ioMonthlyPayment = monthlyRate > 0 ? Math.round(balance * monthlyRate) : 0;
      if (ioActive) {
        // After IO period: P&I on remaining balance for remaining loan term
        const piYears = Math.max(1, loanEndYear - ioExpiryYear);
        const piMonths = piYears * 12;
        const piPmt = monthlyRate > 0
          ? monthlyPayment(balance, monthlyRate, piMonths)
          : balance / piMonths;
        pporResult = {
          type: "io", ioExpiryYear, loanEndYear,
          debtFreeYear: loanEndYear,
          monthlyPayment: ioMonthlyPayment,
          piMonthlyPayment: Math.round(piPmt),
        };
      } else {
        pporResult = { type: "io", ioExpiryYear: null, loanEndYear: null, debtFreeYear: null, monthlyPayment: ioMonthlyPayment };
      }
    } else {
      const pmt = monthlyRate > 0
        ? monthlyPayment(balance, monthlyRate, LOAN_MONTHS)
        : balance / LOAN_MONTHS;
      let bal = balance, months = 0;
      while (bal > 0.01 && months < LOAN_MONTHS + 1) {
        bal -= pmt - bal * monthlyRate;
        months++;
      }
      pporResult = {
        type: "pi",
        monthsToPayoff: months,
        yearsToPayoff:  Math.ceil(months / 12),
        debtFreeYear:   currentYear + Math.ceil(months / 12),
        monthlyPayment: Math.round(pmt),
      };
    }
  }

  // Investment properties
  const ipResults = (data.investmentProperties || [])
    .filter(ip => ip.status === "existing" && p(ip.mortgageBalance) > 0)
    .map(ip => {
      const ipBal         = p(ip.mortgageBalance);
      const ipMonthlyRate = p(ip.mortgageRate) / 100 / 12;
      if (ip.loanType === "io") {
        const ipIoExpiry = p(ip.ioExpiryYear);
        const ipStartYr  = p(ip.purchaseYear) || currentYear;
        const ipEndYear  = ipStartYr + 30;
        const ipIoMonthly = ipMonthlyRate > 0 ? Math.round(ipBal * ipMonthlyRate) : 0;
        const ipIoActive  = ipIoExpiry > 0 && ipIoExpiry < ipEndYear;
        if (ipIoActive) {
          const piYrs  = Math.max(1, ipEndYear - ipIoExpiry);
          const piMths = piYrs * 12;
          const piPmt  = ipMonthlyRate > 0
            ? monthlyPayment(ipBal, ipMonthlyRate, piMths)
            : ipBal / piMths;
          return {
            id: ip.id, label: ip.label || "IP", type: "io",
            ioExpiryYear: ipIoExpiry, loanEndYear: ipEndYear,
            debtFreeYear: ipEndYear,
            monthlyPayment: ipIoMonthly,
            piMonthlyPayment: Math.round(piPmt),
          };
        }
        return {
          id: ip.id, label: ip.label || "IP", type: "io",
          debtFreeYear: null, monthlyPayment: ipIoMonthly,
        };
      }
      const pmt = ipMonthlyRate > 0
        ? monthlyPayment(ipBal, ipMonthlyRate, LOAN_MONTHS)
        : ipBal / LOAN_MONTHS;
      let bal = ipBal, months = 0;
      while (bal > 0.01 && months < LOAN_MONTHS + 1) {
        bal -= pmt - bal * ipMonthlyRate;
        months++;
      }
      return {
        id: ip.id, label: ip.label || "IP", type: "pi",
        yearsToPayoff:  Math.ceil(months / 12),
        debtFreeYear:   currentYear + Math.ceil(months / 12),
        monthlyPayment: Math.round(pmt),
      };
    });

  if (!pporResult && ipResults.length === 0) return null;
  return { ...(pporResult || { type: null }), ips: ipResults };
}

// ─── 4. NET WORTH TRAJECTORY ──────────────────────────────────────────────────

export function netWorthTrajectory(data, assumptions) {
  const currentAge    = p(data.age);
  const retirementAge = p(data.retirementAge) || 65;
  const lifeExp       = p(data.lifeExpectancy) || 90;
  const yearsTotal    = Math.max(lifeExp - currentAge, 0);

  const r          = assumptions.returnRate / 100;
  const propGrowth = assumptions.propertyGrowth / 100;
  const inf        = assumptions.inflation / 100;

  let liquid   = p(data.cashSavings) + p(data.offsetBalance) + p(data.sharesEtfs) +
                 p(data.managedFunds) + p(data.crypto) + p(data.otherInvestments);
  let superBal = p(data.superBalance) + (data.hasPartner === "yes" ? p(data.partnerSuperBalance) : 0);
  let ppor     = p(data.ppOrValue);
  let mortgage = p(data.mortgageBalance);
  let otherDebt = p(data.creditCardDebt) + p(data.personalLoanDebt) + p(data.hecsDebt)
               + (data.hasPartner === "yes"
                  ? p(data.partnerCreditCardDebt) + p(data.partnerPersonalLoanDebt) + p(data.partnerHecsDebt)
                  : 0);

  // Aggregate existing investment properties
  const existingIPs = (data.investmentProperties || []).filter(ip => ip.status === "existing");
  let ipTotal     = existingIPs.reduce((sum, ip) => sum + p(ip.value), 0);
  let ipMortTotal = existingIPs.reduce((sum, ip) => sum + p(ip.mortgageBalance), 0);

  // Weighted average IP mortgage rate for aggregate amortisation
  const ipWeightedRate = ipMortTotal > 0
    ? existingIPs.filter(ip => p(ip.mortgageBalance) > 0)
        .reduce((sum, ip) => sum + p(ip.mortgageRate) * p(ip.mortgageBalance), 0) / ipMortTotal
    : 0;
  const ipMonthlyRate = ipWeightedRate / 100 / 12;
  const ipPmt = (ipMortTotal > 0 && ipMonthlyRate > 0)
    ? monthlyPayment(ipMortTotal, ipMonthlyRate, 360)
    : 0;

  // Net annual cashflow from all existing IPs (rental income minus all running costs)
  const ipNetAnnualCF = existingIPs.reduce(
    (sum, ip) => sum + propertyAnnualCashflow(ip).netCashflow, 0
  );

  const annualSavings = p(data.savingsPerMonth) * 12;
  const grossIncome   = p(data.grossIncome) + p(data.bonusIncome) + p(data.otherIncome)
                      + (data.hasPartner === "yes" ? p(data.partnerIncome) + p(data.partnerBonusIncome) + p(data.partnerOtherIncome) : 0);
  const sgRate        = (p(data.employerSgRate) || 12) / 100;
  const annualSuperIn = grossIncome * sgRate + p(data.salarySacrifice);
  const targetSpending = p(data.targetRetirementSpending);

  const mortgageMonthlyRate = p(data.mortgageRate) / 100 / 12;
  const mortgagePmt = (mortgage > 0 && mortgageMonthlyRate > 0 && data.loanType === "pi")
    ? monthlyPayment(mortgage, mortgageMonthlyRate, 360)
    : 0;
  const annualMortgagePmt = mortgagePmt * 12;

  const trajectory = [];

  for (let y = 0; y <= yearsTotal; y++) {
    const age       = currentAge + y;
    const isRetired = age >= retirementAge;
    const nw = liquid + superBal + ppor + ipTotal - mortgage - ipMortTotal - Math.max(otherDebt, 0);
    trajectory.push({ age, netWorth: Math.round(nw), isRetired });

    if (y === yearsTotal) break;

    if (!isRetired) {
      // IP net cashflow flows into liquid savings (negative = cash drain)
      liquid   = liquid * (1 + r) + annualSavings + ipNetAnnualCF;
      superBal = superBal * (1 + r) + annualSuperIn;
    } else {
      const withdrawal = targetSpending * Math.pow(1 + inf, y - (retirementAge - currentAge));
      if (superBal >= withdrawal) {
        superBal = superBal * (1 + r) - withdrawal;
      } else {
        const remainder = withdrawal - superBal;
        superBal = 0;
        liquid   = Math.max(0, liquid * (1 + r) - remainder);
      }
      liquid = liquid > 0 ? liquid * (1 + r) : 0;
    }

    ppor    = ppor    > 0 ? ppor    * (1 + propGrowth) : 0;
    ipTotal = ipTotal > 0 ? ipTotal * (1 + propGrowth) : 0;

    // Amortise PPOR mortgage (annual approximation)
    if (mortgage > 0 && data.loanType === "pi") {
      const interest  = mortgage * (p(data.mortgageRate) / 100);
      const principal = Math.min(annualMortgagePmt - interest, mortgage);
      mortgage = Math.max(0, mortgage - principal);
    }

    // Amortise IP mortgages (weighted aggregate)
    if (ipMortTotal > 0) {
      const ipInterest  = ipMortTotal * (ipWeightedRate / 100);
      const ipPrincipal = Math.min(ipPmt * 12 - ipInterest, ipMortTotal);
      ipMortTotal = Math.max(0, ipMortTotal - ipPrincipal);
    }

    if (otherDebt > 0) otherDebt = Math.max(0, otherDebt - otherDebt / 3);
  }

  return trajectory;
}

// ─── 5. MONTE CARLO SIMULATION ────────────────────────────────────────────────
// Volatility by scenario (annual std dev of returns)
const SCENARIO_VOLATILITY = { base: 0.10, conservative: 0.08, aggressive: 0.14 };

function normalRandom(mean, sd) {
  // Box-Muller transform
  let u, v;
  do { u = Math.random(); } while (u === 0);
  do { v = Math.random(); } while (v === 0);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function runMonteCarlo(data, assumptions, iterations = 1000) {
  const currentAge    = p(data.age);
  const retirementAge = p(data.retirementAge) || 65;
  const lifeExp       = p(data.lifeExpectancy) || 90;
  const yearsToRetire = Math.max(retirementAge - currentAge, 0);
  const yearsInRetire = Math.max(lifeExp - retirementAge, 0);

  const meanReturn     = assumptions.returnRate / 100;
  const inf            = assumptions.inflation / 100;
  const scenario       = data.activeScenario || "base";
  const stdDev         = SCENARIO_VOLATILITY[scenario] ?? 0.10;

  const superBal       = p(data.superBalance) + (data.hasPartner === "yes" ? p(data.partnerSuperBalance) : 0);
  const grossIncome    = p(data.grossIncome)  + (data.hasPartner === "yes" ? p(data.partnerIncome) : 0);
  const sgRate         = (p(data.employerSgRate) || 12) / 100;
  const annualContribs = grossIncome * sgRate + p(data.salarySacrifice);
  const targetSpending = p(data.targetRetirementSpending);

  if (!targetSpending || yearsToRetire <= 0) return null;

  const futureSpending = targetSpending * Math.pow(1 + inf, yearsToRetire);

  let successes = 0;
  const retirementBals = [];
  const finalBals      = [];

  for (let i = 0; i < iterations; i++) {
    // Accumulation phase
    let bal = superBal;
    for (let y = 0; y < yearsToRetire; y++) {
      const r = normalRandom(meanReturn, stdDev);
      bal = bal * (1 + Math.max(r, -0.5)) + annualContribs; // floor at -50% loss
    }
    retirementBals.push(bal);

    // Drawdown phase
    let drawBal  = bal;
    let depleted = false;
    for (let y = 0; y < yearsInRetire; y++) {
      const r          = normalRandom(meanReturn, stdDev);
      const withdrawal = futureSpending * Math.pow(1 + inf, y);
      drawBal = drawBal * (1 + Math.max(r, -0.5)) - withdrawal;
      if (drawBal <= 0) { depleted = true; break; }
    }
    if (!depleted) successes++;
    finalBals.push(depleted ? 0 : drawBal);
  }

  retirementBals.sort((a, b) => a - b);
  finalBals.sort((a, b) => a - b);

  const pct = (arr, pc) => Math.round(arr[Math.floor(arr.length * pc / 100)] ?? 0);

  return {
    successRate: Math.round((successes / iterations) * 100),
    iterations,
    stdDev,
    retirementBalance: {
      p10: pct(retirementBals, 10),
      p25: pct(retirementBals, 25),
      p50: pct(retirementBals, 50),
      p75: pct(retirementBals, 75),
      p90: pct(retirementBals, 90),
    },
    finalBalance: {
      p10: pct(finalBals, 10),
      p25: pct(finalBals, 25),
      p50: pct(finalBals, 50),
    },
  };
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

export function runEngine(data) {
  const assumptions = getActiveAssumptions(data);

  const superResult  = projectSuper(data, assumptions);
  const drawdown     = retirementDrawdown(data, assumptions, superResult.projectedBalance);
  const mortgage     = debtFreeDate(data);
  const trajectory   = netWorthTrajectory(data, assumptions);
  const monteCarlo   = runMonteCarlo(data, assumptions);

  const retirementAge = p(data.retirementAge) || 65;
  const atRetirement  = trajectory.find(t => t.age === retirementAge);
  const atEnd         = trajectory[trajectory.length - 1];

  const propertyCashflows = (data.investmentProperties || []).map(ip => ({
    id:     ip.id,
    label:  ip.label,
    status: ip.status,
    ...propertyAnnualCashflow(ip),
  }));

  return {
    assumptions,
    super: superResult,
    drawdown,
    mortgage,
    trajectory,
    monteCarlo,
    propertyCashflows,
    metrics: {
      retirementNetWorth:    atRetirement?.netWorth  ?? 0,
      finalNetWorth:         atEnd?.netWorth          ?? 0,
      superSurplus:          drawdown.surplus,
      onTrack:               drawdown.onTrack,
      depletionAge:          drawdown.depletionAge,
      lastsToLifeExpectancy: drawdown.lastsToLifeExpectancy,
      debtFreeYear:          mortgage?.debtFreeYear   ?? null,
      projectedSuper:        superResult.projectedBalance,
      requiredSuper:         drawdown.requiredBalance,
    },
  };
}
