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
