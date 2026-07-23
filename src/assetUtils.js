export function deriveAssetTotals(assetItems = []) {
  const p = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const sumCat = key => (assetItems || [])
    .filter(i => i.categoryKey === key)
    .reduce((s, i) => s + p(i.amount), 0);
  return {
    cashSavings:      sumCat("cash"),
    offsetBalance:    0,
    sharesEtfs:       sumCat("shares"),
    managedFunds:     sumCat("funds"),
    crypto:           sumCat("crypto"),
    otherInvestments: sumCat("other"),
  };
}

export function contribMonthly(item) {
  if (item?.seasonal && Array.isArray(item?.monthlyAmounts)) {
    const p = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
    return item.monthlyAmounts.reduce((s, v) => s + p(v), 0) / 12;
  }
  const amount = parseFloat(String(item?.amount || "").replace(/,/g, "")) || 0;
  if (item?.frequency === "annual")    return amount / 12;
  if (item?.frequency === "quarterly") return amount / 3;
  return amount;
}

export function contribAmountForMonth(item, monthNum) {
  if (item?.seasonal && Array.isArray(item?.monthlyAmounts)) {
    const p = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
    return p((item.monthlyAmounts || [])[monthNum - 1]);
  }
  const amount = parseFloat(String(item?.amount || "").replace(/,/g, "")) || 0;
  if (!amount) return 0;
  switch (item?.frequency) {
    case "monthly":   return amount;
    case "annual":    return item.month
      ? (parseInt(item.month) === monthNum ? amount : 0) : amount / 12;
    case "quarterly": return item.month
      ? (((monthNum - parseInt(item.month) + 12) % 3) === 0 ? amount : 0) : amount / 3;
    default:          return 0;
  }
}

// Sum of all active contributions annualised for a given calendar year.
// Items with ceaseYear stop after that year; null ceaseYear runs until retirement.
export function annualContribsForYear(contribs = [], calYear, retirementYear) {
  return (contribs || []).reduce((sum, item) => {
    const cease = item.ceaseYear ? parseInt(item.ceaseYear) : (retirementYear ?? calYear + 100);
    if (calYear > cease) return sum;
    return sum + contribMonthly(item) * 12;
  }, 0);
}
