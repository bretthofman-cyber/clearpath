// ─── CLEARPATH — STAGE 2: INCOME & CASHFLOW (ITEM-LEVEL BUDGET) ──────────────

import { useState } from "react";
import { currency, Field, Input, TwoCol, SectionDivider } from "./ui.jsx";

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const BUDGET_CATS = [
  { key: "housing",       label: "Housing",                      icon: "🏠" },
  { key: "utilities",     label: "Utilities & bills",            icon: "⚡" },
  { key: "groceries",     label: "Groceries & food",             icon: "🛒" },
  { key: "transport",     label: "Transport",                    icon: "🚗" },
  { key: "insurance",     label: "Insurance",                    icon: "🛡️" },
  { key: "health",        label: "Health & medical",             icon: "🏥" },
  { key: "sport",         label: "Sport & recreation",           icon: "🏆" },
  { key: "children",      label: "Children & education",         icon: "🎓" },
  { key: "entertainment", label: "Entertainment & subscriptions", icon: "🎬" },
  { key: "personal",      label: "Personal & memberships",       icon: "👕" },
  { key: "other",         label: "Other",                        icon: "📦" },
];

const BUDGET_SUGGESTIONS = {
  housing: [
    "Mortgage repayment", "Rent", "Council rates", "Body corp / strata fees",
    "Water & sewerage", "Home maintenance", "Cleaning service", "Pest control", "Lawn & garden",
  ],
  utilities: [
    "Electricity", "Gas", "Internet / broadband", "Mobile phone",
    "Home phone", "Device plan / wearable (Apple Watch etc.)", "Other utilities",
  ],
  groceries: [
    "Supermarket & groceries", "Takeout & food delivery", "Coffee & cafes",
    "Specialty food / butcher / deli", "Alcohol & beverages",
  ],
  transport: [
    "Fuel", "Public transport", "Car registration & CTP greenslip",
    "Comprehensive car insurance", "Car servicing & repairs",
    "Car loan repayment", "Roadside assistance (NRMA etc.)",
    "Parking & tolls", "Rideshare / taxi",
  ],
  insurance: [
    "Private health insurance", "Home & contents insurance",
    "Life insurance", "Income protection insurance",
    "Device insurance (AppleCare etc.)", "Travel insurance",
  ],
  health: [
    "GP & doctors", "Dentist", "Pharmacy & prescriptions",
    "Physiotherapy / allied health", "Optometrist", "Specialist",
    "Yoga / Pilates classes", "Mental health / psychology",
    "Naturopath / alternative health",
  ],
  sport: [
    "Sport club registration / fees", "Association registration (Rugby, SANFL, cricket etc.)",
    "Gym / fitness membership", "Sport membership (Wallabies, SACA etc.)",
    "After-school sport programs", "Coaching & training fees",
    "Sport equipment & apparel", "Race / event entry fees", "Swimming lessons",
  ],
  children: [
    "School fees", "Childcare / daycare", "After-school care / OSHC",
    "Tutoring", "Music lessons", "Dance lessons", "Art / drama classes",
    "School excursions & camps", "Uniforms & school supplies", "Pocket money",
  ],
  entertainment: [
    "Netflix", "Stan", "Disney+", "Amazon Prime / Prime Video",
    "Apple TV+ / Apple One", "Kayo Sports / Foxtel", "Binge",
    "Spotify / Apple Music", "PlayStation Plus / Xbox Game Pass",
    "AMC+", "BritBox", "Paramount+", "Crunchyroll", "HBO Go",
    "Duolingo", "NY Times / news subscriptions",
    "Dining out", "Bars & drinks", "Events & concerts",
    "Hobbies & crafts", "Books & magazines",
  ],
  personal: [
    "Clothing & shoes", "Haircuts & grooming", "Beauty & cosmetics",
    "Personal care products", "Dry cleaning & alterations",
    "Gifts (birthdays, Christmas etc.)", "Pet expenses",
  ],
  other: [
    "Charitable donations", "Travel & holidays",
    "Accountant / financial advice", "Bank & account fees",
    "Home office costs", "Miscellaneous",
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function annualTax(grossIncome) {
  const g = Math.max(0, parseFloat(String(grossIncome).replace(/,/g, "")) || 0);
  if (!g) return 0;
  let tax = 0;
  if (g > 18200)  tax += (Math.min(g, 45000)  - 18200)  * 0.19;
  if (g > 45000)  tax += (Math.min(g, 120000) - 45000)  * 0.325;
  if (g > 120000) tax += (Math.min(g, 180000) - 120000) * 0.37;
  if (g > 180000) tax += (g - 180000) * 0.45;
  if (g > 23365)  tax += g * 0.02;
  if (g <= 37500)      tax -= 700;
  else if (g <= 45000) tax -= (700 - (g - 37500) * 0.05);
  else if (g <= 66667) tax -= Math.max(0, 325 - (g - 45000) * 0.015);
  return Math.max(0, Math.round(tax));
}

function estimateNetMonthly(data) {
  const n = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const g1 = Math.max(0, n(data.grossIncome) - n(data.salarySacrifice));
  const g2 = data.hasPartner === "yes" ? n(data.partnerIncome) : 0;
  const net1 = g1 - annualTax(g1);
  const net2 = g2 - annualTax(g2);
  const bonus = (n(data.bonusIncome) + n(data.otherIncome)) * 0.75;
  return Math.max(0, Math.round((net1 + net2 + bonus) / 12));
}

export function itemMonthly(item) {
  const amount = parseFloat(String(item?.amount || "").replace(/,/g, "")) || 0;
  return item?.frequency === "annual" ? amount / 12 : amount;
}

export function budgetTotal(items) {
  return (items || []).reduce((sum, item) => sum + itemMonthly(item), 0);
}

function newItem(categoryKey, label) {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    categoryKey, label, amount: "", frequency: "monthly",
  };
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

// ─── BUDGET ITEM ROW ─────────────────────────────────────────────────────────

function BudgetItem({ item, onUpdate, onRemove }) {
  const monthly  = itemMonthly(item);
  const isAnnual = item.frequency === "annual";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 14px", borderBottom: "1px solid #f0f4f2",
      background: "white",
    }}>
      <div style={{ flex: 1, fontSize: 13, color: "#2d3a35", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.label}
      </div>
      {isAnnual && monthly > 0 && (
        <div style={{ fontSize: 10, color: "#b0bab6", whiteSpace: "nowrap", flexShrink: 0 }}>
          {currency(monthly)}/mo
        </div>
      )}
      <div style={{ width: 100, flexShrink: 0 }}>
        <Input value={item.amount} onChange={v => onUpdate(item.id, { amount: v })} placeholder="0" prefix="$" />
      </div>
      <button
        onClick={() => onUpdate(item.id, { frequency: isAnnual ? "monthly" : "annual" })}
        title={isAnnual ? "Switch to monthly" : "Switch to annual"}
        style={{
          flexShrink: 0, padding: "4px 9px", border: "1.5px solid",
          borderColor: isAnnual ? "#3d6b5e" : "#d4ddd9", borderRadius: 6,
          fontSize: 11, fontWeight: 600,
          color: isAnnual ? "#3d6b5e" : "#a0aba6",
          background: isAnnual ? "#eaf2ef" : "#f9faf9",
          cursor: "pointer", fontFamily: "inherit",
        }}
      >{isAnnual ? "Yr" : "Mo"}</button>
      <button
        onClick={() => onRemove(item.id)}
        style={{
          flexShrink: 0, width: 22, height: 22, border: "none",
          background: "none", color: "#c8d0cc", cursor: "pointer",
          fontSize: 17, lineHeight: "22px", textAlign: "center",
          borderRadius: 4, padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#9a3922"}
        onMouseLeave={e => e.currentTarget.style.color = "#c8d0cc"}
      >×</button>
    </div>
  );
}

// ─── ADD ITEM PICKER ─────────────────────────────────────────────────────────

function AddItemPicker({ categoryKey, onAdd, onCancel }) {
  const [custom, setCustom] = useState("");
  const suggestions = BUDGET_SUGGESTIONS[categoryKey] || [];

  function handleAdd(label) {
    if (label.trim()) onAdd(label.trim());
  }

  return (
    <div style={{ padding: "12px 14px", background: "#f4f7f5", borderTop: "1px solid #e2eae6" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#8a9e98", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Select or type an item
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => handleAdd(s)}
            style={{
              padding: "5px 11px", border: "1.5px solid #c4ddd6", borderRadius: 20,
              background: "white", fontSize: 12, color: "#3d6b5e",
              cursor: "pointer", fontFamily: "inherit", lineHeight: 1.4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#eaf2ef"; e.currentTarget.style.borderColor = "#3d6b5e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#c4ddd6"; }}
          >{s}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && custom.trim()) handleAdd(custom); }}
          placeholder="Custom item name…"
          autoFocus
          style={{
            flex: 1, padding: "8px 12px", border: "1.5px solid #d4ddd9",
            borderRadius: 8, fontSize: 13, color: "#0f1a16", background: "white",
            outline: "none", fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.borderColor = "#3d6b5e"}
          onBlur={e => e.target.style.borderColor = "#d4ddd9"}
        />
        {custom.trim() && (
          <button
            onClick={() => handleAdd(custom)}
            style={{
              padding: "8px 14px", border: "none", borderRadius: 8,
              background: "#3d6b5e", color: "white", fontSize: 12,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >Add</button>
        )}
        <button
          onClick={onCancel}
          style={{
            padding: "8px 12px", border: "1.5px solid #d4ddd9", borderRadius: 8,
            background: "white", color: "#8a9e98", fontSize: 12,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >Cancel</button>
      </div>
    </div>
  );
}

// ─── BUDGET CATEGORY ─────────────────────────────────────────────────────────

function BudgetCategory({ cat, items, onAddItem, onUpdateItem, onRemoveItem }) {
  const catTotal   = items.reduce((s, item) => s + itemMonthly(item), 0);
  const hasAnnual  = items.some(i => i.frequency === "annual");
  const [expanded, setExpanded]   = useState(items.length > 0);
  const [showPicker, setShowPicker] = useState(false);

  function handleAdd(label) {
    onAddItem(cat.key, label);
    setShowPicker(false);
  }

  return (
    <div style={{ borderBottom: "1px solid #eaeeed" }}>
      {/* Header */}
      <div
        onClick={() => { setExpanded(e => !e); setShowPicker(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
          background: catTotal > 0 ? "white" : "transparent",
        }}
      >
        <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{cat.icon}</span>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#2d3a35" }}>{cat.label}</div>
        {catTotal > 0 ? (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontFamily: "Instrument Serif, serif", color: "#0f1a16" }}>
              {currency(catTotal)}<span style={{ fontSize: 10, color: "#b0bab6", fontFamily: "DM Sans, sans-serif" }}>/mo</span>
            </div>
            {hasAnnual && (
              <div style={{ fontSize: 9, color: "#c0c8c4" }}>{currency(catTotal * 12)}/yr</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#d0d8d4" }}>—</div>
        )}
        <span style={{ color: "#b0bab6", fontSize: 10, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Items + picker */}
      {expanded && (
        <div>
          {items.map(item => (
            <BudgetItem key={item.id} item={item} onUpdate={onUpdateItem} onRemove={onRemoveItem} />
          ))}
          {showPicker ? (
            <AddItemPicker categoryKey={cat.key} onAdd={handleAdd} onCancel={() => setShowPicker(false)} />
          ) : (
            <div style={{ padding: "8px 14px", background: "#fafcfa" }}>
              <button
                onClick={e => { e.stopPropagation(); setShowPicker(true); }}
                style={{
                  padding: "5px 12px", border: "1.5px dashed #c4ddd6", borderRadius: 8,
                  background: "none", color: "#3d6b5e", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >+ Add item</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STAGE 2 ──────────────────────────────────────────────────────────────────

export default function Stage2({ data, setMany }) {
  const items  = data.budgetItems || [];
  const n      = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const bTotal = budgetTotal(items);

  function addItem(categoryKey, label) {
    setMany({ budgetItems: [...items, newItem(categoryKey, label)] });
  }

  function updateItem(id, changes) {
    const updated = items.map(item => item.id === id ? { ...item, ...changes } : item);
    const total   = budgetTotal(updated);
    setMany({ budgetItems: updated, monthlyExpenses: String(Math.round(total)) });
  }

  function removeItem(id) {
    const updated = items.filter(item => item.id !== id);
    const total   = budgetTotal(updated);
    setMany({ budgetItems: updated, monthlyExpenses: String(Math.round(total)) });
  }

  const netMonthly = estimateNetMonthly(data);
  const expenses   = bTotal > 0 ? bTotal : n(data.monthlyExpenses);
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
        {BUDGET_CATS.map(cat => (
          <BudgetCategory
            key={cat.key}
            cat={cat}
            items={items.filter(i => i.categoryKey === cat.key)}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#eaf2ef", borderTop: "1.5px solid #c4ddd6" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#3d6b5e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Monthly total · {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 22, color: "#0f1a16" }}>
              {bTotal > 0 ? currency(bTotal) : <span style={{ color: "#c0c8c4", fontSize: 15 }}>Add items above</span>}
            </div>
            {bTotal > 0 && (
              <div style={{ fontSize: 10, color: "#8a9e98" }}>{currency(bTotal * 12)}/year</div>
            )}
          </div>
        </div>
      </div>

      {netMonthly > 0 && (bTotal > 0 || expenses > 0) && (
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
