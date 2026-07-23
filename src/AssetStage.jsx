// ─── STAGE 3: ASSETS & SAVINGS (ITEM-LEVEL) ──────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { currency, Field, Input, SectionDivider } from "./ui.jsx";
import { deriveAssetTotals, contribMonthly } from "./assetUtils.js";

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const ASSET_CATS = [
  { key: "cash",   label: "Cash & bank accounts", icon: "/icons/cash-bank-accounts.svg" },
  { key: "shares", label: "Shares & ETFs",         icon: "/icons/shares-etfs.svg" },
  { key: "funds",  label: "Managed funds",         icon: "/icons/managed-funds.svg" },
  { key: "crypto", label: "Cryptocurrency",        icon: "/icons/cryptocurrency.svg" },
  { key: "other",  label: "Other investments",     icon: "/icons/other-investments.svg" },
];

const ASSET_SUGGESTIONS = {
  cash: [
    "Savings account", "Transaction account", "Offset account (PPOR)",
    "High-interest savings (ING, Macquarie etc.)", "Term deposit",
    "Cash management account", "Foreign currency account",
  ],
  shares: [
    "VAS – Vanguard Australia Shares ETF", "VGS – Vanguard International Shares ETF",
    "A200 – Betashares Australia 200 ETF", "IVV – iShares S&P 500 ETF",
    "NDQ – Betashares Nasdaq 100 ETF",    "BGBL – Betashares Global Shares ETF",
    "VHY – Vanguard High Yield ETF",      "QOZ – Betashares Australia Quality ETF",
    "AFI – Australian Foundation Investment", "MLT – Milton Corporation",
    "ASX individual shares", "US shares / ADRs",
  ],
  funds: [
    "Vanguard Diversified Growth Fund", "Vanguard LifeStrategy Growth",
    "Australian Ethical Balanced", "Pendal Active Fund",
    "Aware Super Choice Income Stream", "Managed discretionary account (MDA)",
  ],
  crypto: [
    "Bitcoin (BTC)", "Ethereum (ETH)", "Solana (SOL)", "Other crypto",
  ],
  other: [
    "Business interest / equity", "Private company shares",
    "Private loan (money owed to you)", "Unlisted property trust",
    "Agriculture / farmland", "Art & collectibles",
  ],
};

// ─── DERIVE FLAT FIELDS FOR ENGINE ───────────────────────────────────────────

export { deriveAssetTotals } from "./assetUtils.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function newAssetItem(categoryKey, label) {
  return {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    categoryKey, label, amount: "",
  };
}

// ─── CONTRIBUTION HELPERS ─────────────────────────────────────────────────────

const CONTRIB_MODES = [
  { key: "monthly",   label: "Mo"  },
  { key: "seasonal",  label: "≈"   },
  { key: "quarterly", label: "Qtr" },
  { key: "annual",    label: "Yr"  },
];

const MONTH_SHORT_C = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ContribMonthInput({ label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const num = parseFloat(String(value || "").replace(/,/g, "")) || 0;
  const displayed = focused ? (value || "") : (num > 0 ? num.toLocaleString() : "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#8A8270", width: 22, flexShrink: 0 }}>{label}</span>
      <div style={{ position: "relative", flex: 1 }}>
        <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#6b8f84", pointerEvents: "none" }}>$</span>
        <input
          type="text" inputMode="numeric" value={displayed}
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0"
          style={{
            width: "100%", padding: "5px 6px 5px 17px",
            border: `1px solid ${focused ? "#3d6b5e" : "#D8D2C4"}`, borderRadius: 6,
            fontSize: 12, color: "#21241E", background: "#FBFAF6",
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
    </div>
  );
}

function newContrib(categoryKey, label) {
  return {
    id: `contrib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    categoryKey, label, amount: "", frequency: "monthly",
    month: null, seasonal: false, monthlyAmounts: null, ceaseYear: null,
  };
}

// ─── CONTRIBUTION ITEM ROW ────────────────────────────────────────────────────

function ContribItem({ item, onUpdate, onRemove, ceaseYearOptions }) {
  const monthly      = contribMonthly(item);
  const freq         = item.frequency || "monthly";
  const isNonMonthly = !item.seasonal && freq !== "monthly";

  function handleModeChange(key) {
    if (key === "seasonal") {
      if (item.seasonal) return;
      const cur = String(Math.round(monthly) || "");
      onUpdate(item.id, { seasonal: true, monthlyAmounts: Array(12).fill(cur), frequency: "monthly" });
    } else {
      const updates = { seasonal: false, monthlyAmounts: null, frequency: key };
      if (item.seasonal) updates.amount = String(Math.round(monthly) || "");
      if (key === "monthly") updates.month = null;
      onUpdate(item.id, updates);
    }
  }

  function updateMonthAmt(idx, value) {
    const next = [...(item.monthlyAmounts || Array(12).fill(""))];
    next[idx] = value;
    onUpdate(item.id, { monthlyAmounts: next });
  }

  const removeBtn = (
    <button onClick={() => onRemove(item.id)} style={{
      flexShrink: 0, width: 22, height: 22, border: "none",
      background: "none", color: "#D8D2C4", cursor: "pointer",
      fontSize: 17, lineHeight: "22px", textAlign: "center", borderRadius: 4, padding: 0,
    }}
      onMouseEnter={e => e.currentTarget.style.color = "#9a3922"}
      onMouseLeave={e => e.currentTarget.style.color = "#D8D2C4"}
    >×</button>
  );

  const ceaseSelect = (
    <select
      value={item.ceaseYear || ""}
      onChange={e => onUpdate(item.id, { ceaseYear: e.target.value ? parseInt(e.target.value) : null })}
      title="Year contributions cease (blank = until retirement)"
      style={{
        flexShrink: 0, padding: "6px 4px", width: 72,
        border: `1.5px solid ${item.ceaseYear ? "#2E4A3D" : "#D8D2C4"}`,
        borderRadius: 7, fontSize: 11,
        color: item.ceaseYear ? "#2E4A3D" : "#8A8270",
        background: item.ceaseYear ? "#EAF0EC" : "#FBFAF6",
        outline: "none", fontFamily: "inherit", cursor: "pointer",
        appearance: "none", textAlign: "center",
      }}
    >
      <option value="">Ret.</option>
      {ceaseYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  );

  const modeGroup = (
    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
      {CONTRIB_MODES.map(({ key, label }) => {
        const active = key === "seasonal" ? !!item.seasonal : (!item.seasonal && freq === key);
        const isSeasonal = key === "seasonal";
        return (
          <button key={key} onClick={() => handleModeChange(key)}
            title={key === "seasonal" ? "Vary by month" : key === "quarterly" ? "Quarterly" : key === "annual" ? "Yearly" : "Monthly"}
            style={{
              padding: "6px 7px", border: "1.5px solid",
              borderColor: active ? (isSeasonal ? "#C2A06B" : "#2E4A3D") : "#D8D2C4",
              borderRadius: 7, fontSize: 11, fontWeight: 600,
              color: active ? (isSeasonal ? "#7A5C2A" : "#2E4A3D") : "#8A8270",
              background: active ? (isSeasonal ? "#FDF4E7" : "#EAF0EC") : "#FBFAF6",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >{label}</button>
        );
      })}
    </div>
  );

  if (item.seasonal) {
    const amounts = item.monthlyAmounts || Array(12).fill("");
    return (
      <div style={{ padding: "8px 14px 10px", borderBottom: "1px solid #F5F2EB", background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 13, color: "#21241E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
          {monthly > 0 && <div style={{ fontSize: 10, color: "#9DB0A1", flexShrink: 0 }}>avg {currency(monthly)}/mo</div>}
          {ceaseSelect}
          {removeBtn}
        </div>
        <div style={{ marginBottom: 6 }}>{modeGroup}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px 6px" }}>
          {MONTH_SHORT_C.map((m, idx) => (
            <ContribMonthInput key={m} label={m} value={amounts[idx] || ""} onChange={v => updateMonthAmt(idx, v)} />
          ))}
        </div>
      </div>
    );
  }

  if (isNonMonthly) {
    return (
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #F5F2EB", background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 13, color: "#21241E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
          {monthly > 0 && <div style={{ fontSize: 10, color: "#9DB0A1", flexShrink: 0 }}>{currency(monthly)}/mo</div>}
          {ceaseSelect}
          {removeBtn}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Input value={item.amount} onChange={v => onUpdate(item.id, { amount: v })} placeholder="0" prefix="$" />
          </div>
          {modeGroup}
          <select value={item.month || ""} onChange={e => onUpdate(item.id, { month: e.target.value ? parseInt(e.target.value) : null })}
            title={freq === "quarterly" ? "First payment month" : "Month this falls due"}
            style={{
              flexShrink: 0, padding: "6px 5px", width: 54,
              border: `1.5px solid ${item.month ? "#2E4A3D" : "#D8D2C4"}`, borderRadius: 7, fontSize: 12,
              color: item.month ? "#2E4A3D" : "#8A8270", background: item.month ? "#EAF0EC" : "#FBFAF6",
              outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", textAlign: "center",
            }}>
            <option value="">{freq === "quarterly" ? "Start" : "Mo?"}</option>
            {MONTH_SHORT_C.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: "1px solid #F5F2EB", background: "white" }}>
      <div style={{ flex: 1, fontSize: 13, color: "#21241E", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
      <div style={{ width: 75, flexShrink: 0 }}>
        <Input value={item.amount} onChange={v => onUpdate(item.id, { amount: v })} placeholder="0" prefix="$" />
      </div>
      {modeGroup}
      {ceaseSelect}
      {removeBtn}
    </div>
  );
}

// ─── ADD CONTRIBUTION FORM ────────────────────────────────────────────────────

function AddContribForm({ categoryKey, catLabel, existingItems, ceaseYearOptions, onAdd, onCancel }) {
  const [label, setLabel]   = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq]     = useState("monthly");
  const [month, setMonth]   = useState(null);
  const [seasonal, setSeasonal]           = useState(false);
  const [monthlyAmounts, setMonthlyAmounts] = useState(Array(12).fill(""));
  const [ceaseYear, setCeaseYear]         = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Suggestions from existing asset items in this category
  const suggestions = (existingItems || []).map(i => i.label);

  function handleModeChange(key) {
    if (key === "seasonal") {
      setSeasonal(true);
      setMonthlyAmounts(Array(12).fill(amount || ""));
    } else {
      setSeasonal(false);
      if (seasonal) setAmount(String(Math.round(monthlyAmounts.reduce((s, v) => s + (parseFloat(v) || 0), 0) / 12) || ""));
      setFreq(key);
      if (key === "monthly") setMonth(null);
    }
  }

  function updateMonthAmt(idx, value) {
    const next = [...monthlyAmounts];
    next[idx] = value;
    setMonthlyAmounts(next);
  }

  function commit() {
    if (!label.trim()) return;
    const avg = seasonal
      ? String(Math.round(monthlyAmounts.reduce((s, v) => s + (parseFloat(v) || 0), 0) / 12) || "")
      : amount;
    onAdd({
      label: label.trim(), amount: avg,
      frequency: seasonal ? "monthly" : freq,
      month: (!seasonal && freq !== "monthly") ? month : null,
      seasonal, monthlyAmounts: seasonal ? monthlyAmounts : null, ceaseYear,
    });
  }

  const modeGroup = (
    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
      {CONTRIB_MODES.map(({ key, lbl: ml, label: mLabel }) => {
        const k = key;
        const active = k === "seasonal" ? seasonal : (!seasonal && freq === k);
        const isSeasonal = k === "seasonal";
        return (
          <button key={k} onClick={() => handleModeChange(k)}
            style={{
              padding: "8px 7px", border: "1.5px solid",
              borderColor: active ? (isSeasonal ? "#C2A06B" : "#2E4A3D") : "#D8D2C4",
              borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? (isSeasonal ? "#7A5C2A" : "#2E4A3D") : "#8A8270",
              background: active ? (isSeasonal ? "#FDF4E7" : "#EAF0EC") : "#FBFAF6",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >{CONTRIB_MODES.find(m => m.key === k)?.label}</button>
        );
      })}
    </div>
  );

  const ceaseSelect = (
    <select value={ceaseYear || ""} onChange={e => setCeaseYear(e.target.value ? parseInt(e.target.value) : null)}
      title="Year contributions cease"
      style={{
        flexShrink: 0, padding: "8px 4px", width: 72,
        border: `1.5px solid ${ceaseYear ? "#2E4A3D" : "#D8D2C4"}`, borderRadius: 8, fontSize: 11,
        color: ceaseYear ? "#2E4A3D" : "#8A8270", background: ceaseYear ? "#EAF0EC" : "#FBFAF6",
        outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", textAlign: "center",
      }}>
      <option value="">Until ret.</option>
      {ceaseYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  );

  return (
    <div style={{ padding: "12px 14px", background: "#edf2f0", borderTop: "2px solid #D8D2C4" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#6B6655", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Add contribution to {catLabel}
      </div>

      {/* Label */}
      <div style={{ marginBottom: 8 }}>
        {suggestions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => setLabel(s)} style={{
                padding: "5px 10px", border: `1.5px solid ${label === s ? "#2E4A3D" : "#D8D2C4"}`,
                borderRadius: 16, fontSize: 12, background: label === s ? "#2E4A3D" : "white",
                color: label === s ? "white" : "#2E4A3D", cursor: "pointer", fontFamily: "inherit",
              }}>{s}</button>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && label.trim()) commit(); }}
          placeholder="Contribution label (e.g. Monthly VAS purchase)"
          style={{
            width: "100%", padding: "10px 12px", border: "1.5px solid #D8D2C4",
            borderRadius: 10, fontSize: 14, color: "#21241E", background: "white",
            outline: "none", fontFamily: "inherit", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = "#2E4A3D"}
          onBlur={e => e.target.style.borderColor = "#D8D2C4"}
        />
      </div>

      {/* Amount + mode + cease */}
      {seasonal ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            {modeGroup}
            {ceaseSelect}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px 6px" }}>
            {MONTH_SHORT_C.map((m, idx) => (
              <ContribMonthInput key={m} label={m} value={monthlyAmounts[idx] || ""} onChange={v => updateMonthAmt(idx, v)} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#6B6655", pointerEvents: "none" }}>$</span>
            <input type="number" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0"
              style={{
                width: "100%", padding: "9px 10px 9px 24px",
                border: "1.5px solid #D8D2C4", borderRadius: 8,
                fontSize: 16, color: "#21241E", background: "white",
                outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#2E4A3D"}
              onBlur={e => e.target.style.borderColor = "#D8D2C4"}
            />
          </div>
          {modeGroup}
          {freq !== "monthly" && (
            <select value={month || ""} onChange={e => setMonth(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                flexShrink: 0, padding: "9px 6px", width: 58,
                border: `1.5px solid ${month ? "#2E4A3D" : "#D8D2C4"}`, borderRadius: 8, fontSize: 12,
                color: month ? "#2E4A3D" : "#8A8270", background: month ? "#EAF0EC" : "white",
                outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none", textAlign: "center",
              }}>
              <option value="">Mo?</option>
              {MONTH_SHORT_C.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          )}
          {ceaseSelect}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={commit} disabled={!label.trim()} style={{
          flex: 1, padding: "11px", border: "none", borderRadius: 10,
          background: label.trim() ? "#2E4A3D" : "#D8D2C4",
          color: "white", fontSize: 14, fontWeight: 600,
          cursor: label.trim() ? "pointer" : "default", fontFamily: "inherit",
        }}>Add contribution</button>
        <button onClick={onCancel} style={{
          padding: "11px 16px", border: "1.5px solid #D8D2C4", borderRadius: 10,
          background: "white", color: "#8A8270", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ASSET ITEM ROW ───────────────────────────────────────────────────────────

function AssetItem({ item, onUpdate, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 14px", borderBottom: "1px solid #F5F2EB",
      background: "white",
    }}>
      <div style={{ flex: 1, fontSize: 13, color: "#21241E", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.label}
      </div>
      <div style={{ width: 120, flexShrink: 0 }}>
        <Input
          value={item.amount}
          onChange={v => onUpdate(item.id, { amount: v })}
          placeholder="0"
          prefix="$"
        />
      </div>
      <button
        onClick={() => onRemove(item.id)}
        style={{
          flexShrink: 0, width: 22, height: 22, border: "none",
          background: "none", color: "#D8D2C4", cursor: "pointer",
          fontSize: 17, lineHeight: "22px", textAlign: "center",
          borderRadius: 4, padding: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#9a3922"}
        onMouseLeave={e => e.currentTarget.style.color = "#D8D2C4"}
      >×</button>
    </div>
  );
}

// ─── ADD ASSET PICKER ─────────────────────────────────────────────────────────

function AddAssetPicker({ categoryKey, catLabel, onAdd, onCancel }) {
  const [custom, setCustom] = useState("");
  const inputRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const suggestions = ASSET_SUGGESTIONS[categoryKey] || [];

  useEffect(() => {
    if (!isMobile) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isMobile]);

  function handleAdd(label) {
    if (label.trim()) onAdd(label.trim());
  }

  const chipStyle = {
    padding: "9px 14px", border: "1.5px solid #D8D2C4", borderRadius: 20,
    background: "white", fontSize: 13, color: "#2E4A3D", minHeight: 40,
    cursor: "pointer", fontFamily: "inherit", lineHeight: 1.4, textAlign: "left",
  };

  const chips = suggestions.map(s => (
    <button key={s} onClick={() => handleAdd(s)} style={chipStyle}
      onMouseEnter={e => { e.currentTarget.style.background = "#EAF0EC"; e.currentTarget.style.borderColor = "#2E4A3D"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#D8D2C4"; }}
    >{s}</button>
  ));

  const customRow = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        ref={inputRef}
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && custom.trim()) handleAdd(custom); }}
        placeholder="Custom asset name…"
        style={{
          flex: 1, padding: "11px 14px", border: "1.5px solid #D8D2C4",
          borderRadius: 10, fontSize: 16, color: "#21241E", background: "white",
          outline: "none", fontFamily: "inherit",
        }}
        onFocus={e => e.target.style.borderColor = "#2E4A3D"}
        onBlur={e => e.target.style.borderColor = "#D8D2C4"}
      />
      {custom.trim() && (
        <button onClick={() => handleAdd(custom)} style={{
          padding: "11px 16px", border: "none", borderRadius: 10,
          background: "#2E4A3D", color: "white", fontSize: 14,
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>Add</button>
      )}
    </div>
  );

  // ── MOBILE: bottom sheet drawer ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 300 }}>
        <div onClick={onCancel} style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15,26,22,0.5)",
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: "white", borderRadius: "20px 20px 0 0",
          maxHeight: "80vh", display: "flex", flexDirection: "column",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
        }}>
          <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D8D2C4" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#21241E" }}>Add to {catLabel}</div>
            <button onClick={onCancel} style={{
              background: "#F5F2EB", border: "none", borderRadius: 20,
              width: 32, height: 32, fontSize: 18, color: "#6B6655",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px 0" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {chips}
            </div>
          </div>
          <div style={{ padding: "14px 20px 32px", borderTop: "1px solid #F5F2EB", background: "white", flexShrink: 0 }}>
            {customRow}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP: inline ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "12px 14px", background: "#edf2f0", borderTop: "2px solid #D8D2C4" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#6B6655", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
        Select or type an asset
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {chips}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1 }}>{customRow}</div>
        <button onClick={onCancel} style={{
          padding: "11px 14px", border: "1.5px solid #D8D2C4", borderRadius: 10,
          background: "white", color: "#8A8270", fontSize: 13,
          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── ASSET CATEGORY ───────────────────────────────────────────────────────────

function AssetCategory({ cat, items, onAddItem, onUpdateItem, onRemoveItem,
                          contribs, onAddContrib, onUpdateContrib, onRemoveContrib, ceaseYearOptions }) {
  const p         = v => parseFloat(String(v || "").replace(/,/g, "")) || 0;
  const catTotal  = items.reduce((s, item) => s + p(item.amount), 0);
  const [expanded,     setExpanded]     = useState(items.length > 0);
  const [showPicker,   setShowPicker]   = useState(false);
  const [showContribForm, setShowContribForm] = useState(false);

  function handleAdd(label) {
    onAddItem(cat.key, label);
    setShowPicker(false);
  }

  function handleAddContrib(fields) {
    onAddContrib(cat.key, fields);
    setShowContribForm(false);
  }

  return (
    <div style={{ borderBottom: "1px solid #ECE7DB" }}>
      <div
        onClick={() => { setExpanded(e => !e); setShowPicker(false); setShowContribForm(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
          background: catTotal > 0 ? "white" : "transparent",
        }}
      >
        <img src={cat.icon} width="22" height="22" alt="" style={{ flexShrink: 0, display: "block" }} />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#21241E" }}>{cat.label}</div>
        {catTotal > 0 ? (
          <div style={{ fontSize: 13, fontFamily: "Spectral, serif", color: "#21241E", flexShrink: 0 }}>
            {currency(catTotal)}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#D8D2C4" }}>—</div>
        )}
        <span style={{ color: "#9DB0A1", fontSize: 10, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div>
          {items.map(item => (
            <AssetItem key={item.id} item={item} onUpdate={onUpdateItem} onRemove={onRemoveItem} />
          ))}
          {showPicker ? (
            <AddAssetPicker categoryKey={cat.key} catLabel={cat.label} onAdd={handleAdd} onCancel={() => setShowPicker(false)} />
          ) : (
            <div style={{ padding: "8px 14px", background: "#FBFAF6" }}>
              <button
                onClick={e => { e.stopPropagation(); setShowPicker(true); }}
                style={{
                  padding: "5px 12px", border: "1.5px dashed #D8D2C4", borderRadius: 8,
                  background: "none", color: "#2E4A3D", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >+ Add asset</button>
            </div>
          )}

          {/* Contributions section */}
          {(contribs.length > 0 || showContribForm) && (
            <div style={{ borderTop: "1px solid #ECE7DB", background: "#F9F8F4" }}>
              <div style={{ padding: "6px 14px 2px", fontSize: 10, fontWeight: 600, color: "#9DB0A1", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Contributions
              </div>
              {contribs.map(item => (
                <ContribItem
                  key={item.id} item={item}
                  onUpdate={onUpdateContrib} onRemove={onRemoveContrib}
                  ceaseYearOptions={ceaseYearOptions}
                />
              ))}
            </div>
          )}

          {showContribForm ? (
            <AddContribForm
              categoryKey={cat.key} catLabel={cat.label}
              existingItems={items} ceaseYearOptions={ceaseYearOptions}
              onAdd={handleAddContrib} onCancel={() => setShowContribForm(false)}
            />
          ) : (
            <div style={{ padding: "4px 14px 8px", background: "#F9F8F4", borderTop: contribs.length > 0 ? "none" : "1px solid #ECE7DB" }}>
              <button
                onClick={e => { e.stopPropagation(); setShowContribForm(true); }}
                style={{
                  padding: "4px 12px", border: "1.5px dashed #C2A06B", borderRadius: 8,
                  background: "none", color: "#7A5C2A", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >+ Add contribution</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STAGE 3 ──────────────────────────────────────────────────────────────────

export default function AssetStage3({ data, setMany }) {
  const items   = data.assetItems || [];
  const contribs = data.assetContributions || [];
  const totals  = deriveAssetTotals(items);
  const totalLiquid = totals.cashSavings + totals.sharesEtfs + totals.managedFunds +
                      totals.crypto + totals.otherInvestments;

  const currentYear = new Date().getFullYear();
  const retirementYear = data.retirementAge && data.age
    ? currentYear + Math.max(0, parseInt(data.retirementAge) - parseInt(data.age))
    : currentYear + 40;
  const ceaseYearOptions = [];
  for (let y = currentYear + 1; y <= Math.min(retirementYear, currentYear + 50); y++) {
    ceaseYearOptions.push(y);
  }

  function addItem(categoryKey, label) {
    setMany({ assetItems: [...items, newAssetItem(categoryKey, label)] });
  }

  function updateItem(id, changes) {
    setMany({ assetItems: items.map(item => item.id === id ? { ...item, ...changes } : item) });
  }

  function removeItem(id) {
    setMany({ assetItems: items.filter(item => item.id !== id) });
  }

  function addContrib(categoryKey, fields) {
    const item = { ...newContrib(categoryKey, fields.label), ...fields, categoryKey };
    setMany({ assetContributions: [...contribs, item] });
  }

  function updateContrib(id, changes) {
    setMany({ assetContributions: contribs.map(c => c.id === id ? { ...c, ...changes } : c) });
  }

  function removeContrib(id) {
    setMany({ assetContributions: contribs.filter(c => c.id !== id) });
  }

  return (
    <div>
      <div style={{ background: "#FBFAF6", border: "1.5px solid #ECE7DB", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        {ASSET_CATS.map(cat => (
          <AssetCategory
            key={cat.key}
            cat={cat}
            items={items.filter(i => i.categoryKey === cat.key)}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            contribs={contribs.filter(c => c.categoryKey === cat.key)}
            onAddContrib={addContrib}
            onUpdateContrib={updateContrib}
            onRemoveContrib={removeContrib}
            ceaseYearOptions={ceaseYearOptions}
          />
        ))}
        {/* Total row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#EAF0EC", borderTop: "1.5px solid #D8D2C4" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#2E4A3D", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Total liquid · {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 22, color: "#21241E" }}>
              {totalLiquid > 0 ? currency(totalLiquid) : <span style={{ color: "#9DB0A1", fontSize: 15 }}>Add assets above</span>}
            </div>
            {totalLiquid > 0 && (
              <div style={{ fontSize: 10, color: "#8A8270" }}>excl. super & property</div>
            )}
          </div>
        </div>
      </div>

      {/* Category breakdown when there are items */}
      {totalLiquid > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {ASSET_CATS.map(cat => {
            const val = totals[cat.key === "cash" ? "cashSavings" : cat.key === "shares" ? "sharesEtfs" : cat.key === "funds" ? "managedFunds" : cat.key === "crypto" ? "crypto" : "otherInvestments"];
            if (!val) return null;
            const pct = Math.round((val / totalLiquid) * 100);
            return (
              <div key={cat.key} style={{
                flex: "1 1 auto", background: "#F5F2EB", border: "1px solid #ECE7DB",
                borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ fontSize: 10, color: "#8A8270", marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}><img src={cat.icon} width="12" height="12" alt="" />{cat.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#21241E" }}>{currency(val)}</div>
                <div style={{ fontSize: 10, color: "#9DB0A1" }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      )}

      <SectionDivider label="Emergency position" />
      <Field label="Dedicated emergency fund" hint="Separate from everyday savings; typically 3–6 months of expenses">
        <Input value={data.emergencyFund} onChange={v => setMany({ emergencyFund: v })} placeholder="10,000" prefix="$" />
      </Field>
    </div>
  );
}
