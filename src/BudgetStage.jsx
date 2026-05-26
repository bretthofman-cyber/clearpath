// ─── CLEARPATH — STAGE 2: INCOME & CASHFLOW (BUDGET MODULE) ─────────────────
// Extracted from App.jsx to keep it under ~2000 lines.
// Exports: default Stage2, named BUDGET_CATS, budgetTotal

import { useState } from "react";
import { currency, Field, Input, TwoCol, SectionDivider } from "./ui.jsx";

// ─── BUDGET CATEGORIES ────────────────────────────────────────────────────────

export const BUDGET_CATS = [
  { key: "housing",       label: "Housing",                icon: "🏠", hint: "Mortgage repayments, rent, body corp fees" },
  { key: "utilities",     label: "Utilities & bills",      icon: "⚡", hint: "Electricity, gas, water, internet, mobile" },
  { key: "groceries",     label: "Groceries & household",  icon: "🛒", hint: "Food and household supplies" },
  { key: "transport",     label: "Transport",              icon: "🚗", hint: "Fuel, car insurance, rego, public transport" },
  { key: "insurance",     label: "Insurance",              icon: "🛡️", hint: "Private health, life, income protection (outside super)" },
  { key: "health",        label: "Health & medical",       icon: "🏥", hint: "Doctors, dentist, pharmacy, specialists" },
  { key: "entertainment", label: "Entertainment & dining", icon: "🍽️", hint: "Dining out, streaming, subscriptions, events" },
  { key: "children",      label: "Children & education",   icon: "🎓", hint: "Childcare, school fees, tutoring, activities" },
  { key: "personal",      label: "Personal & clothing",    icon: "👕", hint: "Clothing, haircuts, gym, beauty" },
  { key: "other",         label: "Other",                  icon: "📦", hint: "Anything else not covered above" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// FY2025-26 marginal rates + Medicare levy + simplified LITO, individual basis
function annualTax(grossIncome) {
  const g = Math.max(0, parseFloat(String(grossIncome).replace(/,/g, "")) || 0);
  if (!g) return 0;
  let tax = 0;
  if (g > 18200)  tax += (Math.min(g, 45000)  - 18200)  * 0.19;
  if (g > 45000)  tax += (Math.min(g, 120000) - 45000)  * 0.325;
  if (g > 120000) tax += (Math.min(g, 180000) - 120000) * 0.37;
  if (g > 180000) tax += (g - 180000) * 0.45;
  if (g > 23365)  tax += g * 0.02; // Medicare levy
  // Low Income Tax Offset (simplified)
  if (g <= 37500)      tax -= 700;
  else if (g <= 45000) tax -= (700 - (g - 37500) * 0.05);
  else if (g <= 66667) tax -= Math.max(0, 325 - (g - 45000) * 0.015);
  return Math.max(0, Math.round(tax));
}

function estimateNetMonthly(data) {
  const n = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const g1 = Math.max(0, n(data.grossIncome) - n(data.salarySacrifice)); // SS reduces taxable income
  const g2 = data.hasPartner === "yes" ? n(data.partnerIncome) : 0;
  const net1 = g1 - annualTax(g1);
  const net2 = g2 - annualTax(g2);
  const bonus = (n(data.bonusIncome) + n(data.otherIncome)) * 0.75; // ~25% avg tax
  return Math.max(0, Math.round((net1 + net2 + bonus) / 12));
}

export function budgetTotal(budget) {
  return BUDGET_CATS.reduce((sum, cat) =>
    sum + (parseFloat(String(budget?.[cat.key] || "").replace(/,/g, "")) || 0), 0
  );
}

// ─── CASHFLOW SUMMARY ─────────────────────────────────────────────────────────

function CashflowSummary({ netMonthly, expenses, savings, surplus }) {
  const isPos = surplus >= 0;
  const color = isPos ? "#3d6b5e" : "#9a3922";
  const bg    = isPos ? "#eaf2ef" : "#fdf4f0";
  const bdr   = isPos ? "#c4ddd6" : "#f0d0c4";
  return (
    <div style={{ background: bg, border: `1.5px solid ${bdr}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a9e98", marginBottom: 10 }}>
        Monthly Cashflow
      </div>
      {[
        { label: "Est. take-home income", val: netMonthly, sign: "+" },
        { label: "Monthly budget",        val: expenses,   sign: "−" },
        { label: "Planned savings",       val: savings,    sign: "−" },
      ].map(({ label, val, sign }, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: "#6b8f84" }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: sign === "+" ? "#3d6b5e" : "#4a6660" }}>
            {sign} {currency(val)}
          </span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${bdr}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#2d3a35" }}>
          {isPos ? "Monthly surplus" : "Monthly shortfall"}
        </span>
        <span style={{ fontFamily: "Instrument Serif, serif", fontSize: 22, color }}>
          {isPos ? "" : "−"}{currency(Math.abs(surplus))}
        </span>
      </div>
      <div style={{ fontSize: 10, color: "#b0bab6", marginTop: 6 }}>
        ★ Income estimate based on FY2025-26 marginal rates. Salary sacrifice deducted where entered.
      </div>
    </div>
  );
}

// ─── STAGE 2 ──────────────────────────────────────────────────────────────────

export default function Stage2({ data, setMany }) {
  const budget    = data.budget || {};
  const n         = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const bTotal    = budgetTotal(budget);
  const hasBudget = bTotal > 0;

  function setBudgetCat(key, value) {
    const newBudget = { ...budget, [key]: value };
    const total = budgetTotal(newBudget);
    setMany({ budget: newBudget, monthlyExpenses: total > 0 ? String(Math.round(total)) : data.monthlyExpenses });
  }

  const netMonthly = estimateNetMonthly(data);
  const expenses   = hasBudget ? bTotal : n(data.monthlyExpenses);
  const savings    = n(data.savingsPerMonth);
  const surplus    = netMonthly - expenses - savings;

  return (
    <div>
      <TwoCol>
        <Field label="Your gross annual income" hint="Before tax">
          <Input value={data.grossIncome} onChange={v => setMany({ grossIncome: v })} placeholder="95,000" prefix="$" />
        </Field>
        {data.hasPartner === "yes" ? (
          <Field label="Partner's gross income" hint="Before tax">
            <Input value={data.partnerIncome} onChange={v => setMany({ partnerIncome: v })} placeholder="80,000" prefix="$" />
          </Field>
        ) : <div />}
      </TwoCol>
      <TwoCol>
        <Field label="Annual bonus / incentives" hint="Leave blank if none">
          <Input value={data.bonusIncome} onChange={v => setMany({ bonusIncome: v })} placeholder="0" prefix="$" />
        </Field>
        <Field label="Other income" hint="Rental, side income, dividends">
          <Input value={data.otherIncome} onChange={v => setMany({ otherIncome: v })} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>

      <SectionDivider label="Monthly Budget" />

      <div style={{ background: "#f9faf9", border: "1.5px solid #e2eae6", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        {BUDGET_CATS.map((cat, i) => {
          const val = n(budget[cat.key]);
          const pct = bTotal > 0 && val > 0 ? Math.min(100, (val / bTotal) * 100) : 0;
          return (
            <div key={cat.key} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px",
              borderBottom: i < BUDGET_CATS.length - 1 ? "1px solid #eaeeed" : "none",
              background: val > 0 ? "white" : "transparent",
            }}>
              <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{cat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#2d3a35" }}>{cat.label}</div>
                <div style={{ fontSize: 10, color: "#b0bab6" }}>{cat.hint}</div>
              </div>
              {pct > 0 && (
                <div style={{ width: 52, flexShrink: 0 }}>
                  <div style={{ height: 3, background: "#e2eae6", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#3d6b5e", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 9, color: "#b0bab6", textAlign: "right", marginTop: 2 }}>{Math.round(pct)}%</div>
                </div>
              )}
              <div style={{ width: 110, flexShrink: 0 }}>
                <Input value={budget[cat.key] || ""} onChange={v => setBudgetCat(cat.key, v)} placeholder="0" prefix="$" />
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: "#eaf2ef", borderTop: "1.5px solid #c4ddd6" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#3d6b5e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly total</span>
          <span style={{ fontFamily: "Instrument Serif, serif", fontSize: 22, color: "#0f1a16" }}>
            {bTotal > 0 ? currency(bTotal) : <span style={{ color: "#c0c8c4", fontSize: 16 }}>Fill in categories above</span>}
          </span>
        </div>
      </div>

      {netMonthly > 0 && (hasBudget || expenses > 0) && (
        <CashflowSummary netMonthly={netMonthly} expenses={expenses} savings={savings} surplus={surplus} />
      )}

      <SectionDivider label="Other spending" />
      <TwoCol>
        <Field label="Annual irregular expenses" hint="Holidays, car rego, rates, gifts">
          <Input value={data.annualIrregular} onChange={v => setMany({ annualIrregular: v })} placeholder="5,000" prefix="$" />
        </Field>
        <Field label="Monthly savings target" hint="Net amount you put aside each month">
          <Input value={data.savingsPerMonth} onChange={v => setMany({ savingsPerMonth: v })} placeholder="1,200" prefix="$" />
        </Field>
      </TwoCol>
    </div>
  );
}
