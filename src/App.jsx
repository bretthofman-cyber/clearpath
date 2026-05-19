import { useState, useRef } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "clearpath_v1";
const API_KEY_STORAGE = "clearpath_apikey";

const STAGES = [
  { id: 1, label: "Profile",  icon: "👤", title: "Household Profile",     subtitle: "Let's start with the basics" },
  { id: 2, label: "Income",   icon: "💰", title: "Income & Cashflow",      subtitle: "Your earnings and spending" },
  { id: 3, label: "Assets",   icon: "🏦", title: "Assets & Savings",       subtitle: "What you own and hold" },
  { id: 4, label: "Property", icon: "🏠", title: "Property & Debt",        subtitle: "Leverage and obligations" },
  { id: 5, label: "Super",    icon: "📈", title: "Superannuation",         subtitle: "Your retirement engine" },
  { id: 6, label: "Analysis", icon: "✦",  title: "Your Financial Picture", subtitle: "AI-powered insights" },
];

const EMPTY_DATA = {
  firstName: "", age: "", partnerAge: "", hasPartner: "no",
  dependants: "0", location: "", employmentStatus: "full-time",
  retirementAge: "65", lifeExpectancy: "90", homeOwnership: "owner",
  grossIncome: "", partnerIncome: "", bonusIncome: "", otherIncome: "",
  monthlyExpenses: "", annualIrregular: "", savingsPerMonth: "",
  cashSavings: "", offsetBalance: "", sharesEtfs: "", managedFunds: "",
  crypto: "", otherInvestments: "", emergencyFund: "",
  ppOrValue: "", mortgageBalance: "", mortgageRate: "", loanType: "pi",
  hasInvestmentProperty: "no", ipValue: "", ipMortgage: "", ipRate: "",
  ipWeeklyRent: "", creditCardDebt: "", personalLoanDebt: "", hecsDebt: "",
  superBalance: "", partnerSuperBalance: "", employerSgRate: "12",
  salarySacrifice: "", insuranceInSuper: "yes", targetRetirementSpending: "",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function currency(val) {
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return "$" + n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_DATA, ...JSON.parse(raw) } : { ...EMPTY_DATA };
  } catch { return { ...EMPTY_DATA }; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function loadApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch { return ""; }
}

function saveApiKey(key) {
  try { localStorage.setItem(API_KEY_STORAGE, key); } catch {}
}

function buildPrompt(data) {
  const couple = data.hasPartner === "yes";
  const hasIP = data.hasInvestmentProperty === "yes";

  return `Please analyse this Australian household's financial position and provide structured insights.

HOUSEHOLD PROFILE
Name: ${data.firstName || "User"} | Age: ${data.age} | ${couple ? `Partner age: ${data.partnerAge} | ` : ""}${couple ? "Couple" : "Single"} | Dependants: ${data.dependants}
Location: ${data.location} | Employment: ${data.employmentStatus}
Target retirement age: ${data.retirementAge} | Life expectancy: ${data.lifeExpectancy}
Home ownership: ${data.homeOwnership}

INCOME & CASHFLOW
Gross income: ${currency(data.grossIncome)}${couple ? ` | Partner income: ${currency(data.partnerIncome)}` : ""}
Bonus/other income: ${currency(data.bonusIncome)} | Other: ${currency(data.otherIncome)}
Monthly expenses: ${currency(data.monthlyExpenses)} | Annual irregular: ${currency(data.annualIrregular)}
Monthly savings: ${currency(data.savingsPerMonth)}

ASSETS & SAVINGS
Cash savings: ${currency(data.cashSavings)} | Offset: ${currency(data.offsetBalance)}
Shares/ETFs: ${currency(data.sharesEtfs)} | Managed funds: ${currency(data.managedFunds)}
Crypto: ${currency(data.crypto)} | Other investments: ${currency(data.otherInvestments)}
Emergency fund: ${currency(data.emergencyFund)}

PROPERTY & DEBT
PPOR value: ${currency(data.ppOrValue)} | Mortgage: ${currency(data.mortgageBalance)} @ ${data.mortgageRate}% (${data.loanType === "pi" ? "P&I" : "Interest Only"})
${hasIP ? `Investment property: ${currency(data.ipValue)} | IP mortgage: ${currency(data.ipMortgage)} @ ${data.ipRate}% | Weekly rent: ${currency(data.ipWeeklyRent)}` : "No investment property"}
Credit card debt: ${currency(data.creditCardDebt)} | Personal loan: ${currency(data.personalLoanDebt)} | HECS: ${currency(data.hecsDebt)}

SUPERANNUATION
Super balance: ${currency(data.superBalance)}${couple ? ` | Partner super: ${currency(data.partnerSuperBalance)}` : ""}
Employer SG rate: ${data.employerSgRate}% | Salary sacrifice: ${currency(data.salarySacrifice)}/year
Insurance in super: ${data.insuranceInSuper}
Target retirement spending: ${currency(data.targetRetirementSpending)}/year

Please structure your response with these exact section headings and write each section completely before moving to the next. Do not repeat or restart any section.

## Financial Health Summary
Write 3 sentences summarising their overall position.

## Strengths
List 4 specific strengths using numbered points (1. 2. 3. 4.).

## Pressure Points
List 4 specific concerns using numbered points (1. 2. 3. 4.).

## Priority Actions
List 5 prioritised actions using numbered points (1. 2. 3. 4. 5.). Be specific with dollar amounts where possible.

## Retirement Outlook
Write 3-4 sentences assessing retirement readiness based on super trajectory, savings rate and target spending.

## One Thing to Do This Month
Write one specific, concrete sentence describing the single most important action.

End with this exact disclaimer on its own line: This information is general in nature and is intended for educational and planning purposes only. It does not constitute personal financial advice.`;
}

// ─── FIELD COMPONENTS ────────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#2d3a35", marginBottom: hint ? 2 : 6 }}>
        {label}
      </label>
      {hint && <div style={{ fontSize: 11, color: "#8a9e98", marginBottom: 6 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", prefix }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span style={{ position: "absolute", left: 12, fontSize: 14, color: "#6b8f84", fontWeight: 500, pointerEvents: "none" }}>
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: prefix ? "11px 14px 11px 26px" : "11px 14px",
          border: "1.5px solid #d4ddd9", borderRadius: 10,
          fontSize: 14, color: "#0f1a16", background: "#f9faf9",
          outline: "none", fontFamily: "inherit", transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "#3d6b5e"}
        onBlur={e => e.target.style.borderColor = "#d4ddd9"}
      />
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", padding: "11px 14px", border: "1.5px solid #d4ddd9",
        borderRadius: 10, fontSize: 14, color: "#0f1a16", background: "#f9faf9",
        outline: "none", fontFamily: "inherit", cursor: "pointer", appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b8f84' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
      }}
      onFocus={e => e.target.style.borderColor = "#3d6b5e"}
      onBlur={e => e.target.style.borderColor = "#d4ddd9"}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1, padding: "10px 0", border: "1.5px solid",
            borderColor: value === o.value ? "#3d6b5e" : "#d4ddd9",
            borderRadius: 10, fontSize: 13, fontWeight: value === o.value ? 500 : 400,
            color: value === o.value ? "#3d6b5e" : "#6b7a74",
            background: value === o.value ? "#eaf2ef" : "#f9faf9",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TwoCol({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      {children}
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
      color: "#8a9e98", margin: "24px 0 16px", display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{ flex: 1, height: 1, background: "#e2eae6" }} />
      {label}
      <div style={{ flex: 1, height: 1, background: "#e2eae6" }} />
    </div>
  );
}

// ─── STAGE FORMS ─────────────────────────────────────────────────────────────

function Stage1({ data, set }) {
  return (
    <div>
      <TwoCol>
        <Field label="First name">
          <Input value={data.firstName} onChange={v => set("firstName", v)} placeholder="e.g. Alex" />
        </Field>
        <Field label="Your age">
          <Input value={data.age} onChange={v => set("age", v)} placeholder="e.g. 34" type="number" />
        </Field>
      </TwoCol>
      <Field label="Do you have a partner?">
        <Toggle value={data.hasPartner} onChange={v => set("hasPartner", v)}
          options={[{ value: "no", label: "Single" }, { value: "yes", label: "Couple" }]} />
      </Field>
      {data.hasPartner === "yes" && (
        <Field label="Partner's age">
          <Input value={data.partnerAge} onChange={v => set("partnerAge", v)} placeholder="e.g. 32" type="number" />
        </Field>
      )}
      <TwoCol>
        <Field label="Dependants">
          <Select value={data.dependants} onChange={v => set("dependants", v)}
            options={["0","1","2","3","4","5+"].map(v => ({ value: v, label: v === "0" ? "None" : v }))} />
        </Field>
        <Field label="Location">
          <Select value={data.location} onChange={v => set("location", v)}
            options={[
              { value: "", label: "Select state…" },
              ...["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"].map(s => ({ value: s, label: s }))
            ]} />
        </Field>
      </TwoCol>
      <TwoCol>
        <Field label="Employment status">
          <Select value={data.employmentStatus} onChange={v => set("employmentStatus", v)}
            options={[
              { value: "full-time", label: "Full-time" },
              { value: "part-time", label: "Part-time" },
              { value: "self-employed", label: "Self-employed" },
              { value: "contractor", label: "Contractor" },
              { value: "not-employed", label: "Not employed" },
            ]} />
        </Field>
        <Field label="Home ownership">
          <Select value={data.homeOwnership} onChange={v => set("homeOwnership", v)}
            options={[
              { value: "owner", label: "Own home" },
              { value: "mortgage", label: "Mortgage" },
              { value: "renting", label: "Renting" },
            ]} />
        </Field>
      </TwoCol>
      <SectionDivider label="Retirement horizon" />
      <TwoCol>
        <Field label="Target retirement age">
          <Input value={data.retirementAge} onChange={v => set("retirementAge", v)} placeholder="65" type="number" />
        </Field>
        <Field label="Life expectancy assumption">
          <Input value={data.lifeExpectancy} onChange={v => set("lifeExpectancy", v)} placeholder="90" type="number" />
        </Field>
      </TwoCol>
    </div>
  );
}

function Stage2({ data, set }) {
  return (
    <div>
      <TwoCol>
        <Field label="Your gross annual income" hint="Before tax">
          <Input value={data.grossIncome} onChange={v => set("grossIncome", v)} placeholder="95,000" prefix="$" />
        </Field>
        {data.hasPartner === "yes" ? (
          <Field label="Partner's gross income" hint="Before tax">
            <Input value={data.partnerIncome} onChange={v => set("partnerIncome", v)} placeholder="80,000" prefix="$" />
          </Field>
        ) : <div />}
      </TwoCol>
      <TwoCol>
        <Field label="Annual bonus / incentives" hint="Leave blank if none">
          <Input value={data.bonusIncome} onChange={v => set("bonusIncome", v)} placeholder="0" prefix="$" />
        </Field>
        <Field label="Other income" hint="Rental, side income, dividends">
          <Input value={data.otherIncome} onChange={v => set("otherIncome", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <SectionDivider label="Spending" />
      <TwoCol>
        <Field label="Monthly household expenses" hint="All regular living costs">
          <Input value={data.monthlyExpenses} onChange={v => set("monthlyExpenses", v)} placeholder="4,500" prefix="$" />
        </Field>
        <Field label="Annual irregular expenses" hint="Holidays, car rego, rates etc.">
          <Input value={data.annualIrregular} onChange={v => set("annualIrregular", v)} placeholder="5,000" prefix="$" />
        </Field>
      </TwoCol>
      <Field label="How much are you saving per month?" hint="Net savings after all expenses">
        <Input value={data.savingsPerMonth} onChange={v => set("savingsPerMonth", v)} placeholder="1,200" prefix="$" />
      </Field>
    </div>
  );
}

function Stage3({ data, set }) {
  return (
    <div>
      <TwoCol>
        <Field label="Cash savings">
          <Input value={data.cashSavings} onChange={v => set("cashSavings", v)} placeholder="15,000" prefix="$" />
        </Field>
        <Field label="Offset account balance">
          <Input value={data.offsetBalance} onChange={v => set("offsetBalance", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <TwoCol>
        <Field label="Shares / ETFs">
          <Input value={data.sharesEtfs} onChange={v => set("sharesEtfs", v)} placeholder="0" prefix="$" />
        </Field>
        <Field label="Managed funds">
          <Input value={data.managedFunds} onChange={v => set("managedFunds", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <TwoCol>
        <Field label="Cryptocurrency">
          <Input value={data.crypto} onChange={v => set("crypto", v)} placeholder="0" prefix="$" />
        </Field>
        <Field label="Other investments">
          <Input value={data.otherInvestments} onChange={v => set("otherInvestments", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <SectionDivider label="Emergency position" />
      <Field label="Dedicated emergency fund" hint="Separate from everyday savings">
        <Input value={data.emergencyFund} onChange={v => set("emergencyFund", v)} placeholder="10,000" prefix="$" />
      </Field>
    </div>
  );
}

function Stage4({ data, set }) {
  return (
    <div>
      {(data.homeOwnership === "mortgage" || data.homeOwnership === "owner") && (
        <>
          <TwoCol>
            <Field label="PPOR estimated value">
              <Input value={data.ppOrValue} onChange={v => set("ppOrValue", v)} placeholder="850,000" prefix="$" />
            </Field>
            <Field label="Mortgage balance">
              <Input value={data.mortgageBalance} onChange={v => set("mortgageBalance", v)} placeholder="450,000" prefix="$" />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="Interest rate">
              <Input value={data.mortgageRate} onChange={v => set("mortgageRate", v)} placeholder="6.2" prefix="%" />
            </Field>
            <Field label="Loan type">
              <Select value={data.loanType} onChange={v => set("loanType", v)}
                options={[
                  { value: "pi", label: "Principal & Interest" },
                  { value: "io", label: "Interest Only" },
                ]} />
            </Field>
          </TwoCol>
        </>
      )}
      <SectionDivider label="Investment property" />
      <Field label="Do you own an investment property?">
        <Toggle value={data.hasInvestmentProperty} onChange={v => set("hasInvestmentProperty", v)}
          options={[{ value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
      </Field>
      {data.hasInvestmentProperty === "yes" && (
        <>
          <TwoCol>
            <Field label="IP value">
              <Input value={data.ipValue} onChange={v => set("ipValue", v)} placeholder="650,000" prefix="$" />
            </Field>
            <Field label="IP mortgage">
              <Input value={data.ipMortgage} onChange={v => set("ipMortgage", v)} placeholder="400,000" prefix="$" />
            </Field>
          </TwoCol>
          <TwoCol>
            <Field label="IP interest rate">
              <Input value={data.ipRate} onChange={v => set("ipRate", v)} placeholder="6.5" prefix="%" />
            </Field>
            <Field label="Weekly rent">
              <Input value={data.ipWeeklyRent} onChange={v => set("ipWeeklyRent", v)} placeholder="550" prefix="$" />
            </Field>
          </TwoCol>
        </>
      )}
      <SectionDivider label="Other debts" />
      <TwoCol>
        <Field label="Credit card debt">
          <Input value={data.creditCardDebt} onChange={v => set("creditCardDebt", v)} placeholder="0" prefix="$" />
        </Field>
        <Field label="Personal loans">
          <Input value={data.personalLoanDebt} onChange={v => set("personalLoanDebt", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <Field label="HECS / HELP debt">
        <Input value={data.hecsDebt} onChange={v => set("hecsDebt", v)} placeholder="0" prefix="$" />
      </Field>
    </div>
  );
}

function Stage5({ data, set }) {
  return (
    <div>
      <TwoCol>
        <Field label="Your super balance">
          <Input value={data.superBalance} onChange={v => set("superBalance", v)} placeholder="68,000" prefix="$" />
        </Field>
        {data.hasPartner === "yes" && (
          <Field label="Partner's super balance">
            <Input value={data.partnerSuperBalance} onChange={v => set("partnerSuperBalance", v)} placeholder="55,000" prefix="$" />
          </Field>
        )}
      </TwoCol>
      <TwoCol>
        <Field label="Employer SG rate" hint="Currently 12% for most employees">
          <Input value={data.employerSgRate} onChange={v => set("employerSgRate", v)} placeholder="12" prefix="%" />
        </Field>
        <Field label="Salary sacrifice (annual)" hint="Extra contributions above SG">
          <Input value={data.salarySacrifice} onChange={v => set("salarySacrifice", v)} placeholder="0" prefix="$" />
        </Field>
      </TwoCol>
      <Field label="Insurance inside super?">
        <Toggle value={data.insuranceInSuper} onChange={v => set("insuranceInSuper", v)}
          options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }]} />
      </Field>
      <SectionDivider label="Retirement target" />
      <Field label="Target annual retirement spending" hint="In today's dollars — what lifestyle do you want in retirement?">
        <Input value={data.targetRetirementSpending} onChange={v => set("targetRetirementSpending", v)} placeholder="65,000" prefix="$" />
      </Field>
    </div>
  );
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────

function renderMarkdown(text) {
  const elements = [];
  const lines = text.split("\n");
  let i = 0;
  let listItems = [];
  let listKey = 0;

  function flushList() {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={"list-" + listKey++} style={{ paddingLeft: 20, margin: "6px 0 16px", listStyle: "none" }}>
        {listItems.map((item, j) => (
          <li key={j} style={{ fontSize: 14, color: "#2d3a35", lineHeight: 1.75, marginBottom: 8, paddingLeft: 16, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "#3d6b5e", fontWeight: 600 }}>›</span>
            <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ") || line.startsWith("### ")) {
      flushList();
      const headingText = line.replace(/^#{2,3}\s+/, "");
      elements.push(
        <div key={"h-" + i} style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: "#3d6b5e",
          margin: "28px 0 12px", paddingBottom: 8,
          borderBottom: "1px solid #d4e8e0",
        }}>
          {headingText}
        </div>
      );
    } else if (/^(\d+\.\s+|[-•]\s*)/.test(line)) {
      const content = line.replace(/^(\d+\.\s+|[-•]\s*)/, "").trim();
      if (content) listItems.push(content);
    } else if (line.trim() === "" || line.startsWith("---")) {
      flushList();
    } else if (line.trim()) {
      flushList();
      elements.push(
        <p key={"p-" + i} style={{ fontSize: 14, color: "#2d3a35", lineHeight: 1.75, marginBottom: 10 }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      );
    }
    i++;
  }

  flushList();
  return elements;
}

// ─── ANALYSIS SCREEN ─────────────────────────────────────────────────────────

function AnalysisScreen({ data, apiKey }) {
  const [status, setStatus] = useState("idle");
  const [response, setResponse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const responseRef = useRef("");
  const hasGenerated = useRef(false);

  async function generate() {
    if (!apiKey) {
      setErrorMsg("No API key found. Please restart and enter your key.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setResponse("");
    responseRef.current = "";

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: "You are Clearpath, a warm, intelligent Australian financial planning assistant. You provide clear, practical, Australia-specific financial guidance. Never present outputs as personal financial advice. Use plain English. Reference Australian concepts naturally: super, HECS, franking credits, offset accounts, negative gearing, Medicare levy, CGT discount, SG rate, concessional caps, preservation age. Write each section completely before moving to the next. Never repeat or restart a section.",
          messages: [{ role: "user", content: buildPrompt(data) }],
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || ("API error " + res.status));
      }

      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            if (
              parsed.type === "content_block_delta" &&
              parsed.delta?.type === "text_delta"
            ) {
              const text = parsed.delta.text || "";
              if (text) {
                responseRef.current += text;
                setResponse(r => r + text);
              }
            }
          } catch {}
        }
      }
      setStatus("done");
    } catch (e) {
      setErrorMsg(e.message);
      setStatus("error");
    }
  }

  if (!hasGenerated.current && status === "idle") {
    hasGenerated.current = true;
    setTimeout(generate, 0);
  }

  return (
    <div>
      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{
            width: 44, height: 44, border: "3px solid #e2eae6",
            borderTopColor: "#3d6b5e", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <div style={{ fontSize: 14, color: "#6b8f84" }}>Analysing your financial position…</div>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      )}

      {(status === "streaming" || status === "done") && (
        <div>
          <div style={{
            background: "#eaf2ef", border: "1px solid #c4ddd6",
            borderRadius: 12, padding: "14px 18px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 34, height: 34, background: "#3d6b5e", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Instrument Serif, serif", fontSize: 17, color: "white", flexShrink: 0,
            }}>C</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#3d6b5e", marginBottom: 1 }}>
                Clearpath Analysis
              </div>
              <div style={{ fontSize: 11, color: "#8a9e98" }}>
                {data.firstName ? ("Personalised for " + data.firstName) : "Your financial picture"} · General information only
              </div>
            </div>
            {status === "streaming" && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(function(i) {
                  return (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#3d6b5e",
                      animation: "bounce 1.2s " + (i * 0.2) + "s infinite ease-in-out",
                    }} />
                  );
                })}
              </div>
            )}
          </div>

          <div>{renderMarkdown(response)}</div>

          {status === "done" && (
            <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={generate} style={{
                padding: "10px 20px", border: "1.5px solid #d4ddd9", borderRadius: 10,
                background: "white", fontSize: 13, color: "#2d3a35",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Regenerate
              </button>
              <button onClick={() => window.print()} style={{
                padding: "10px 20px", border: "none", borderRadius: 10,
                background: "#3d6b5e", color: "white", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Print / Save PDF
              </button>
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div style={{
          background: "#fdf4f0", border: "1px solid #f0d0c4",
          borderRadius: 12, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#9a3922", marginBottom: 6 }}>
            Could not generate analysis
          </div>
          <div style={{ fontSize: 13, color: "#7a4030", marginBottom: 16 }}>{errorMsg}</div>
          <button onClick={generate} style={{
            padding: "9px 18px", border: "1.5px solid #e0a090", borderRadius: 8,
            background: "white", fontSize: 13, color: "#9a3922",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── API KEY GATE ─────────────────────────────────────────────────────────────

function ApiKeyGate({ onSave }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("That doesn't look like a valid Anthropic API key. It should start with sk-ant-");
      return;
    }
    saveApiKey(trimmed);
    onSave(trimmed);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#f4f7f5",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: 40, maxWidth: 440, width: "100%",
        boxShadow: "0 4px 32px rgba(0,0,0,0.07)", border: "1px solid #e2eae6",
      }}>
        <div style={{
          width: 48, height: 48, background: "#3d6b5e", borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Instrument Serif, serif", fontSize: 26, color: "white", marginBottom: 20,
        }}>C</div>
        <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 26, marginBottom: 8, color: "#0f1a16" }}>
          Welcome to Clearpath
        </div>
        <div style={{ fontSize: 13, color: "#6b7a74", lineHeight: 1.6, marginBottom: 28 }}>
          To power your AI financial analysis, enter your Anthropic API key below.
          It is stored only on this device and never sent anywhere except directly to Anthropic.
        </div>
        <Field label="Anthropic API key" hint="Starts with sk-ant- · Get yours at console.anthropic.com">
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError(""); }}
            placeholder="sk-ant-api03-…"
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{
              width: "100%", padding: "11px 14px", border: "1.5px solid #d4ddd9",
              borderRadius: 10, fontSize: 14, color: "#0f1a16", background: "#f9faf9",
              outline: "none", fontFamily: "inherit",
            }}
            onFocus={e => e.target.style.borderColor = "#3d6b5e"}
            onBlur={e => e.target.style.borderColor = "#d4ddd9"}
          />
        </Field>
        {error && <div style={{ fontSize: 12, color: "#9a3922", marginBottom: 12 }}>{error}</div>}
        <button onClick={submit} style={{
          width: "100%", padding: 13, background: "#3d6b5e", color: "white",
          border: "none", borderRadius: 12, fontSize: 14, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Continue →
        </button>
        <div style={{ fontSize: 11, color: "#a0aba6", marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
          Your key is stored locally on this device only.
          This app provides general information, not personal financial advice.
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function ClearpathMVP() {
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [data, setData] = useState(() => loadData());
  const [stage, setStage] = useState(1);
  const scrollRef = useRef(null);

  function set(field, value) {
    setData(prev => {
      const next = { ...prev, [field]: value };
      saveData(next);
      return next;
    });
  }

  function goTo(s) {
    setStage(s);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, 50);
  }

  function next() { goTo(Math.min(stage + 1, 6)); }
  function back() { goTo(Math.max(stage - 1, 1)); }

  const progress = ((stage - 1) / 5) * 100;

  if (!apiKey) return <ApiKeyGate onSave={setApiKey} />;

  const currentStage = STAGES[stage - 1];

  const totalAssets = [
    data.cashSavings, data.offsetBalance, data.sharesEtfs, data.managedFunds,
    data.crypto, data.otherInvestments, data.superBalance, data.ppOrValue, data.ipValue,
  ].reduce((sum, v) => sum + (parseFloat(String(v).replace(/,/g, "")) || 0), 0);

  const totalDebt = [
    data.mortgageBalance, data.ipMortgage, data.creditCardDebt,
    data.personalLoanDebt, data.hecsDebt,
  ].reduce((sum, v) => sum + (parseFloat(String(v).replace(/,/g, "")) || 0), 0);

  const netWorth = totalAssets - totalDebt;
  const monthlyLiquid = parseFloat(String(data.cashSavings).replace(/,/g, "")) || 0;
  const monthlyExp = parseFloat(String(data.monthlyExpenses).replace(/,/g, "")) || 1;
  const runway = monthlyLiquid > 0 && monthlyExp > 0 ? (monthlyLiquid / monthlyExp).toFixed(1) : "—";

  return (
    <div style={{
      minHeight: "100vh", background: "#f4f7f5",
      fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column",
    }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap'); @keyframes bounce { 0%,80%,100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-5px); opacity: 1; } } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } * { box-sizing: border-box; } input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }"}</style>

      <header style={{
        background: "white", borderBottom: "1px solid #e2eae6",
        padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 20, color: "#0f1a16" }}>
            Clear<span style={{ color: "#3d6b5e" }}>path</span>
          </div>
          <div style={{ fontSize: 10, color: "#8a9e98", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Australian Financial Planner
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {data.firstName && (
            <div style={{ fontSize: 12, color: "#6b8f84" }}>Hi, {data.firstName} 👋</div>
          )}
          <button
            onClick={() => {
              if (window.confirm("Clear all saved data?")) {
                localStorage.removeItem(STORAGE_KEY);
                setData({ ...EMPTY_DATA });
                setStage(1);
              }
            }}
            style={{
              fontSize: 11, color: "#a0aba6", background: "none", border: "1px solid #e2eae6",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Clear data
          </button>
        </div>
      </header>

      <div style={{ background: "white", borderBottom: "1px solid #e2eae6", padding: "0 28px 14px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {STAGES.map(s => (
            <button
              key={s.id}
              onClick={() => s.id < stage ? goTo(s.id) : null}
              style={{
                flex: 1, padding: "6px 0", border: "none",
                background: s.id === stage ? "#3d6b5e" : s.id < stage ? "#c4ddd6" : "#e8f0ee",
                borderRadius: 6, cursor: s.id < stage ? "pointer" : "default",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 13 }}>{s.icon}</div>
              <div style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.05em",
                color: s.id === stage ? "white" : s.id < stage ? "#2d6558" : "#8ab5aa",
                textTransform: "uppercase",
              }}>{s.label}</div>
            </button>
          ))}
        </div>
        <div style={{ height: 3, background: "#e8f0ee", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: progress + "%", background: "#3d6b5e",
            borderRadius: 2, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      {(data.grossIncome || data.superBalance || data.cashSavings) && (
        <div style={{ background: "#3d6b5e", padding: "10px 28px", display: "flex", gap: 24, overflowX: "auto" }}>
          {[
            { label: "Net Worth", value: currency(netWorth) },
            { label: "Super", value: currency(data.superBalance) },
            { label: "Monthly Savings", value: currency(data.savingsPerMonth) },
            { label: "Emergency Runway", value: runway === "—" ? "—" : (runway + " mo") },
          ].map((item, i) => (
            <div key={i} style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "white", marginTop: 1 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "32px 20px 100px" }}>
        <div style={{ width: "100%", maxWidth: 620 }}>
          <div style={{ marginBottom: 28, animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontSize: 11, color: "#8a9e98", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              Step {stage} of 6
            </div>
            <div style={{ fontFamily: "Instrument Serif, serif", fontSize: 28, color: "#0f1a16", marginBottom: 4 }}>
              {currentStage.title}
            </div>
            <div style={{ fontSize: 14, color: "#6b8f84" }}>{currentStage.subtitle}</div>
          </div>

          <div ref={scrollRef} style={{
            background: "white", borderRadius: 18, border: "1px solid #e2eae6",
            padding: "28px", animation: "fadeIn 0.25s ease",
            boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
          }}>
            {stage === 1 && <Stage1 data={data} set={set} />}
            {stage === 2 && <Stage2 data={data} set={set} />}
            {stage === 3 && <Stage3 data={data} set={set} />}
            {stage === 4 && <Stage4 data={data} set={set} />}
            {stage === 5 && <Stage5 data={data} set={set} />}
            {stage === 6 && <AnalysisScreen data={data} apiKey={apiKey} />}
          </div>

          {stage < 6 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              {stage > 1 ? (
                <button onClick={back} style={{
                  padding: "12px 24px", border: "1.5px solid #d4ddd9", borderRadius: 12,
                  background: "white", fontSize: 14, color: "#4a6660", cursor: "pointer", fontFamily: "inherit",
                }}>
                  ← Back
                </button>
              ) : <div />}
              <button onClick={next} style={{
                padding: "12px 28px", border: "none", borderRadius: 12,
                background: "#3d6b5e", color: "white", fontSize: 14, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 2px 12px rgba(61,107,94,0.3)",
              }}>
                {stage === 5 ? "Generate My Plan →" : "Continue →"}
              </button>
            </div>
          )}

          {stage === 6 && (
            <div style={{ marginTop: 20 }}>
              <button onClick={back} style={{
                padding: "12px 24px", border: "1.5px solid #d4ddd9", borderRadius: 12,
                background: "white", fontSize: 14, color: "#4a6660", cursor: "pointer", fontFamily: "inherit",
              }}>
                ← Edit my details
              </button>
            </div>
          )}
        </div>
      </div>

      <footer style={{
        background: "white", borderTop: "1px solid #e2eae6",
        padding: "16px 28px", textAlign: "center", marginTop: "auto",
      }}>
        <div style={{ fontSize: 11, color: "#a0aba6", lineHeight: 1.6, maxWidth: 620, margin: "0 auto" }}>
          <strong style={{ color: "#6b7a74" }}>General information only.</strong> Clearpath is an educational planning tool and does not provide personal financial advice. All projections and analysis are illustrative estimates based on the information you enter. Before making financial decisions, consider seeking advice from a licensed Australian financial adviser (AFSL holder). Past performance is not a reliable indicator of future performance.
        </div>
      </footer>
    </div>
  );
}
