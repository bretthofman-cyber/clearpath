# CLAUDE.md — Independent Means Financial Planner

> Auto-loaded by Claude Code at session start. Full project context — no re-explaining needed.

---

## What Is Independent Means?

**Independent Means** is an Australian financial planning and retirement modelling web app — live on Vercel. It guides households through an 8-stage wizard (7 stages built, Stage 8 in backlog), runs a deterministic JS calculation engine, and generates AI-powered financial analysis via the Anthropic API.

**Key differentiator:** The financial calculations are deterministic (not AI-estimated). The AI interprets pre-calculated figures — it does not invent them.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Vite (single-page app) |
| Styling | Inline styles throughout — no CSS framework |
| AI | Anthropic API (`claude-sonnet-4-6`) via Vercel serverless function |
| Hosting | Vercel (auto-deploys on GitHub push) |
| Persistence | `localStorage` key `clearpath_v1` |
| Fonts | Spectral (serif headings/numbers) + Albert Sans (UI/body) |

**Colour palette — "Quiet Wealth":** Pine `#2E4A3D` (brand anchor) · Paper `#F5F2EB` (background) · Card `#FBFAF6` · Gold `#C2A06B` (CTAs/progress, used sparingly) · Stone `#D8D2C4` (borders) · Sage `#9DB0A1` (captions) · Ink `#21241E` (body text). Revert to pre-palette: `git checkout 611ead6`.

---

## File Structure

```
~/clearpath/
├── CLAUDE.md                    <- You are here
├── src/
│   ├── App.jsx                  <- Entire frontend (~1300 lines): all stage forms, components, AI screen
│   └── engine.js                <- Financial calculation engine (pure JS, no dependencies)
├── api/
│   └── chat.js                  <- Vercel serverless function — proxies Anthropic API using ANTHROPIC_API_KEY env var
├── docs/
│   ├── system-prompt.docx       <- AI assistant identity and guardrails
│   ├── planning-rules.docx      <- 12 rule sets from the Excel workbook (plain English)
│   ├── input-inventory.docx     <- Full input field inventory for all 8 stages
│   ├── user-sequence.docx       <- 8-stage onboarding flow and UX notes
│   ├── australian-context.docx  <- AU-specific concepts and compliance position
│   └── Australian_Financial_Planning_Workbook_v2.xlsx  <- Source workbook — authoritative for formulas
├── public/
├── vercel.json
├── vite.config.js
└── package.json
```

---

## 8-Stage Wizard (Stage 8 not yet built)

| Stage | Name | Status |
|-------|------|--------|
| 1 | Household Profile | Built |
| 2 | Income & Cashflow | Built |
| 3 | Assets & Savings | Built |
| 4 | Property & Debt | Built — single IP only, Session 3 upgrades to multi-property |
| 5 | Superannuation | Built |
| 6 | Goals & Scenarios | Built — 3 scenarios (Base/Conservative/Aggressive), custom assumptions with source rationale |
| 7 | Analysis | Built — metric cards + AI narrative using pre-calculated engine figures |

Stage 8 (Action Plan) is planned but not yet built.

---

## engine.js — Calculation Engine

Four exported functions plus `runEngine` main entry point:

| Function | What it calculates |
|----------|--------------------|
| `projectSuper(data, assumptions)` | FV of super balance + SG + salary sacrifice at retirement |
| `retirementDrawdown(data, assumptions, superBalance)` | Year-by-year drawdown; depletion age; required balance via SWR |
| `debtFreeDate(data)` | PPOR P&I amortisation — debt-free year and monthly payment |
| `netWorthTrajectory(data, assumptions)` | Year-by-year net worth from current age to life expectancy |
| `runEngine(data)` | Calls all four, returns unified metrics object passed to AI prompt |

`runEngine` output is injected into `buildPrompt` in App.jsx so the AI receives exact figures with instructions not to re-estimate them.

---

## Data Model (EMPTY_DATA in App.jsx)

All user data lives in one flat object persisted to localStorage. Key fields by stage:

- **Stage 1:** firstName, age, partnerAge, hasPartner, dependants, location, employmentStatus, retirementAge, lifeExpectancy, homeOwnership
- **Stage 2:** grossIncome, partnerIncome, bonusIncome, otherIncome, monthlyExpenses, annualIrregular, savingsPerMonth
- **Stage 3:** cashSavings, offsetBalance, sharesEtfs, managedFunds, crypto, otherInvestments, emergencyFund
- **Stage 4:** ppOrValue, mortgageBalance, mortgageRate, loanType, hasInvestmentProperty, ipValue, ipMortgage, ipRate, ipWeeklyRent, creditCardDebt, personalLoanDebt, hecsDebt
- **Stage 5:** superBalance, partnerSuperBalance, employerSgRate, salarySacrifice, insuranceInSuper, targetRetirementSpending
- **Stage 6:** retirementLifestyle, goals (array), riskTolerance, activeScenario, useCustomAssumptions, customAssumptions (object with base/conservative/aggressive)

Session 3 adds `investmentProperties[]` array to Stage 4 replacing the single IP fields.

---

## Planning Scenarios

| Scenario | Return | Inflation | Property | Rental | SWR |
|----------|--------|-----------|----------|--------|-----|
| Base | 6.5% | 2.5% | 4.5% | 3.0% | 4.0% |
| Conservative | 5.5% | 3.0% | 3.5% | 2.5% | 4.0% |
| Aggressive | 7.5% | 2.0% | 5.5% | 3.5% | 4.0% |

Each assumption has a "Why this number?" rationale sourced from RBA, CoreLogic, Vanguard, ASFA.

---

## Build Roadmap

| Session | Goal | Status |
|---------|------|--------|
| Session 1 | 7-stage wizard, AI analysis, localStorage, Vercel deploy | Done |
| Session 2 | JS calculation engine (engine.js), metric cards wired to AI prompt | Done |
| Session 3 | Property portfolio engine: multi-IP, cashflow per property, clone templates | In progress |
| Session 4 | Monte Carlo simulation layer | Planned |
| Session 5 | Dashboard — charts, net worth trajectory, retirement probability gauge | Planned |
| Future | Detailed budget module, adviser export, Google OAuth + Supabase | Backlog |

---

## Australian Financial Context (FY2025-26)

| Parameter | Value |
|-----------|-------|
| Super Guarantee Rate | 12% |
| Concessional Contribution Cap | $30,000/year |
| Non-Concessional Cap | $110,000/year |
| Preservation Age | 60 |
| Age Pension Eligibility | 67 |
| Medicare Levy | 2% |
| HECS Repayment Threshold | ~$54,435 |
| CGT Discount (held >12 months) | 50% |

Key AU-specific concepts: superannuation, HECS/HELP, franking credits, offset accounts, negative gearing, CGT discount, PPOR exemption, Age Pension means testing.

---

## Compliance Position

- App is general information only — not personal financial advice
- No AFSL required for educational planning tools
- Every screen has a disclaimer footer
- AI system prompt explicitly prohibits advice-giving language
- ASIC RG 255 (digital advice) is the relevant regulatory boundary

---

## AI Guardrails

- Never present outputs as personal financial advice
- Never recommend specific financial products
- Always frame projections as modelling assumptions with uncertainty
- Always suggest adviser review (AFSL holder) for tax, super strategy, debt restructuring, insurance, investment allocation
- Standard disclaimer: "This information is general in nature and intended for educational and planning purposes only. It does not constitute personal financial advice."

---

## Brand & Voice

**Brand:** Independent Means — Your Australian Financial Planner
**Tone:** Calm, intelligent, plain English — like a highly capable financial strategist who does not condescend
**Target user:** Australian households aged 30-55, HHI $100K+, property owners or aspiring

---

## Key Decisions

1. Deterministic JS engine — AI interprets results, never calculates them
2. Inline styles throughout — consistent with existing codebase, no refactor needed
3. Single App.jsx — acceptable at current size; split into components when it exceeds ~2000 lines
4. localStorage for persistence — Google OAuth + Supabase is the planned next step
5. Vercel serverless for API proxy — ANTHROPIC_API_KEY lives in Vercel env vars, never in client code
6. No Tailwind, no Cursor — Claude Code in terminal is the dev environment
