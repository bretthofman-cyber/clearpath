# Independent Means — Changelog

Append a new entry at the top after each Claude Code session.  
Format: `## YYYY-MM-DD — <short title>` followed by bullet points.

---

## 2026-07-21 — Second full codebase review: 15 bugs fixed

Second parallel-agent review. Four finder agents ran simultaneously across API security, engine correctness, UI/entitlement, and build/export angles. All candidates verified against source before fixing.

### Security
- **stripe-checkout** open redirect removed: client-supplied `successUrl`/`cancelUrl` were passed straight to Stripe — an attacker with a valid session could craft a redirect to any URL. URLs are now hardcoded server-side from `APP_URL`
- **admin-stats** undefined bypass closed: `userEmail !== process.env.ADMIN_EMAIL` evaluates to `false` when both are `undefined` (env var not set + user with no email). Added `typeof` guard

### Subscription reliability
- **stripeWebhookHandlers**: all four webhook branches (`checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`) discarded the `{error}` return from Supabase — DB failures returned HTTP 200, Stripe never retried, subscription state was silently not written. Now captures error and returns `{ok: false}` so Stripe retries
- **stripe-checkout**: Supabase error discarded in-band (`.catch` only catches thrown exceptions, not Supabase's return-value errors) — on DB failure the handler fell through and created a duplicate Stripe customer
- **stripe-portal**: same pattern — DB failure returned a misleading `404 "No Stripe customer found"` to a paying subscriber instead of `500`
- **useEntitlement** `fetchSubscription`: discarded `{error}` and returned `null` on failure, `applyRow(null)` set status to `"free"` — paying subscribers silently downgraded on any transient DB hiccup. Now throws on error; `refreshSubscription` wrapped in try/catch

### Feature-breaking bugs
- **exportBudgetXlsx**: `await import("xlsx-js-style")` without `.default` — the UMD bundle mutates `module.exports` at runtime, so the dynamic import returned `{ default: <XLSX> }` only; `XLSX.utils` was `undefined` and every export call crashed with `TypeError`. Fixed: `const { default: XLSX } = await import(...)`
- **PdfReport**: Debt-Free Year card always hidden — read `engine.metrics.debtFreeYear` but the value lives on `engine.mortgage.debtFreeYear`. Every PDF for every mortgage holder was missing this card
- **AnalysisStage** StrategyCentre had no entitlement guard — free users could open the salary-sacrifice, retirement-age, and mortgage-acceleration interactive modules without ever hitting a gate. Added `can(FEATURES.STRATEGY_CENTRE)` check at both the render site and the `onOpenStrategyCentre` callback (non-entitled users now see the upgrade modal instead)
- **AnalysisStage** cashflow calendar used pre-derived data — `estimateNetMonthly(data)` instead of `estimateNetMonthly(derivedData)`. When the "max salary sacrifice" toggle was on, the salary sacrifice field in `derivedData` was updated but the cashflow calendar ignored it, showing a higher take-home income than every other card on the same screen
- **LandingPage** `signInWith` errors unhandled — the `async` function was called from `onClick` without `.catch`. Any auth failure (Clerk not loaded, network error, OAuth rejection) left all buttons permanently disabled showing "Redirecting…" with no recovery path

### Engine calculation errors
- **Retirement withdrawal not inflation-adjusted**: `netWorthTrajectory` used `targetSpending * (1+inf)^(y − yearsToRetirement)` — withdrawing in today's dollars from a nominal portfolio. At year 0 of retirement, withdrawal was `targetSpending` instead of `targetSpending × (1+inf)^yearsToRetirement`. At 2.5% inflation over 30 years that's a 2.1× understatement, making the net worth chart show a portfolio sustaining far longer than `retirementDrawdown` predicted. Fixed to `targetSpending * (1+inf)^y` (matches `retirementDrawdown`'s formula)
- **Age pension when already past retirement age**: `trajectory.find(t => t.age === retirementAge)` returned `undefined` when current age ≥ retirement age (trajectory starts at current age). `atRetirementNW` fell back to `0`, producing `retirementAssets = 0`, and `estimateAgePension` returned full pension regardless of wealth. Fixed to fall back to `trajectory[0]` (current net worth)
- **Falsy-zero for SG rate and IP fees**: `(p(x) || default)` treated explicitly-entered `0` as blank. A self-employed person entering 0% employer SG got 12% applied instead; a self-managing landlord entering 0% management fee got 8% applied. Added `pOr(val, def)` helper that uses the default only when the field is genuinely blank, not when the user entered zero. Applied to employer SG rate (×5 locations), partner SG rate (×5 locations), IP vacancy rate, IP management fee

### Housekeeping
- **exportCsv**: `base_net_worth` column duplicated `net_worth` from `BASE_PROJ_HEADERS` — both were always `pt.netWorth` from the same trajectory. Removed `base_net_worth`; `net_worth` already serves as the base scenario column
- **AdminDashboard**: `getToken` omitted from `useEffect` dependency arrays in all three sub-panels (`GateClicksPanel`, `FunnelPanel`, `TrialConversionPanel`) — stale closure on token rotation. Fixed

### Commits
`4ed36c0` Fix 15 bugs from second full codebase review

---

## 2026-07-20 — Auth migration to Clerk, code splitting, first full codebase review

### Auth migration: Supabase Auth → Clerk
- Replaced `supabase.auth` entirely with `@clerk/clerk-react` on the frontend and `@clerk/backend` (`verifyToken`, `createClerkClient`) in Vercel API functions
- `LandingPage.jsx` now uses Clerk's `useSignIn` / `authenticateWithRedirect` for Google OAuth; Apple Sign In stub ready
- `App.jsx` uses `useUser` + `useAuth` from Clerk; `getToken()` replaces Supabase session tokens
- Supabase RLS policies updated to match Clerk JWT structure: `auth.jwt() ->> 'sub'` (Clerk's `sub` claim = user ID)
- `supabase.js` module keeps a `clerkTokenGetter` singleton set at app start so plain modules (analytics, etc.) can call Supabase with a valid JWT without importing React hooks
- All Vercel API functions now call `verifyToken(token, { secretKey: CLERK_SECRET_KEY })` before touching Stripe or Supabase
- `CLERK_SECRET_KEY` is server-side only; `VITE_CLERK_PUBLISHABLE_KEY` is the only Clerk key in the client bundle

### Performance: code splitting and bundle optimisation
- **Before**: single 1668 kB bundle (over the 500 kB warning threshold)
- Lazy-loaded heavy stages: `BudgetStage`, `AssetStage`, `AnalysisStage`, `ActionPlanStage`, `PdfReport`, `AdminDashboard`, `PricingPage`, `LoginScreen` — all wrapped in `React.lazy()` + `Suspense`
- Extracted `BUDGET_CATS` to `src/budgetCats.js` and `deriveAssetTotals` to `src/assetUtils.js` so `App.jsx` can import them statically without pulling in the heavy component files
- Inlined `DEFAULT_SCENARIOS` in `App.jsx` to avoid pulling all 1136 lines of `engine.js` into the main chunk
- `exportBudgetXlsx` made `async`; `import * as XLSX from "xlsx-js-style"` moved inside the function body as a dynamic `await import(...)` — defers the 863 kB xlsx library to click time only
- Added `manualChunks` (function form — required by Vite 8 / rolldown) to split vendor code into `vendor-react`, `vendor-auth`, `vendor-db`
- **After**: main bundle 84 kB · auth 102 kB · DB 204 kB · react 179 kB · xlsx 863 kB (deferred) — no chunk size warnings

### First full codebase review: 15 bugs fixed
Four parallel finder agents across engine correctness, API security, React patterns, and cross-file consistency.

**Engine bugs:**
- Retirement double-compound: `liquid * (1+r)` applied twice in same year when super depleted
- IP loans used PPOR's remaining term (`LOAN_MONTHS`) instead of each property's own remaining term
- PPOR trajectory hardcoded 360 months; now uses `mortgageStartYear + mortgageTenure`
- Age pension mixed present-value inputs against future net worth; now projects PPOR at property growth rate to retirement

**API bugs:**
- `admin-stats.js`: Clerk user lookup was outside try/catch — Clerk API error crashed the handler; `isNaN` guard added before `.toISOString()` calls
- `stripe-checkout.js`: Supabase query and Clerk email lookup moved inside try/catch
- `stripe-portal.js`: Supabase query moved inside try/catch
- `activateTrial` in `useEntitlement.js`: Supabase error field was not checked; wrapped in try/catch

**React bugs:**
- `goTo()` stale closure: `savePlan(data, s)` read stale closure — fixed with `setData(prev => { savePlan(prev, s); return prev; })`
- Fire-and-forget upsert in App.jsx had no `.catch()` — silently swallowed network errors and RLS rejections
- Debounce timer leaked on unmount — added `useEffect(() => () => clearTimeout(saveTimer.current), [])`

**Analysis bugs:**
- `ScenarioComparisonRow` called `runEngine` 3× without `skipMonteCarlo` — ran full Monte Carlo for free users (PremiumGate renders children for all users, just adds overlay)
- `i % 1 === 0` filter in `AnalysisStage` — `i % 1` is always 0, filter was a no-op
- `asmn.swr` in `PdfReport` → `asmn.safeWithdrawal` (engine stores the key as `safeWithdrawal`; PDF showed "undefined% p.a.")
- Dead `interestSaved` variable in `StrategyCentre`: `* 0` made it always 0 and it was never returned

**Infrastructure:**
- Open `api/anthropic` reverse proxy in `vercel.json` removed (unauthenticated pass-through to Anthropic API)

### Remove Anthropic/AI code
- `api/chat.js` deleted entirely
- `vercel.json` Anthropic proxy removed
- `.env.example` `ANTHROPIC_API_KEY` removed
- `CLAUDE.md` updated: "No AI features (AFSL compliance risk)"

### Minor fixes
- Fixed SPA fallback for `/sso-callback` route (Clerk OAuth callback was returning 404)
- Fixed Premium badge overflow in header: badge `🔒 Premium` was clipping on narrow screens

### Commits
`e243b83` Migrate auth to Clerk · `34442aa` Fix SPA fallback · `026d5ec` Fix badge overflow · `5526b75` Code split · `ec25b67` Defer xlsx · `c69ad99` Vendor chunks · `ab9156b` Fix 15 bugs (first review) · `0f9d007` Remove Anthropic code

---

## 2026-07-18 — Mobile layout, XLSX export, SVG icons, font sizes

### Annual budget XLSX export
- Created `src/exportBudgetXlsx.js` — month-by-month budget spreadsheet in "Quiet Wealth" brand styling (Georgia/Calibri fonts, Pine/Gold palette)
- FY period logic: Free tier locks to Australian FY (Jul–Jun); Premium can select any start month
- `src/budgetCats.js` extracted: `BUDGET_CATS` array lives here so other files can import it without pulling in all of `BudgetStage`
- Budget custom FY start locked behind `FEATURES.BUDGET_CUSTOM_FY` gate

### Mobile responsive layout
- App-level responsive breakpoints added for all 7 wizard stages
- Stage navigation adapts to narrow screens; header collapses gracefully
- Tested to 375px (iPhone SE)

### SVG icon system — stage navigation and category icons
- Stage nav icons replaced (7 stages × custom SVG, Pine/Gold palette, 24×24)
- Action Plan category icons replaced (Wealth Building, Cashflow, Risk Management, Tax, Property, Retirement)

### Accessibility and typography
- Body text raised to 16px minimum across all authenticated views (was 14px in many places)
- Form labels, captions, and secondary text adjusted proportionally

### Commits
`7863fa7` XLSX export · `cdb6846` FY period logic · `f51827e` Stage nav icons · `6c4e887` Font sizes · `5d61d07` Category icons · `38bdcf1` Mobile layout

---

## 2026-07-17 — Legal footer, SVG icons, folder rename

### Legal footer architecture
- Created `src/LegalModals.jsx` — canonical source for `TERMS_CONTENT`, `PRIVACY_CONTENT`, `LegalModal` component, and `SiteFooter` component
- `SiteFooter` is self-contained (manages modal state internally); replaces the plain white disclaimer footer in `App.jsx`
- `LandingPage.jsx` now imports from `LegalModals.jsx` instead of defining content locally
- Privacy policy updated: "financial data inputs" (was "financial planning inputs"), "save your data" (was "save your plan")

### Static links footer (Google OAuth compliance)
- `#static-links` in `index.html` kept for Google's policy requirement but styled invisible by default (Pine text `#2E4A3D` on Pine background)
- Links reveal in Sage `#9DB0A1` on hover with 0.2s transition
- `useEffect` in `App.jsx` hides `#static-links` when user is signed in; restores on sign-out

### Hover colours on legal popup buttons
- Terms of Service and Privacy Policy buttons in both `LandingPage.jsx` footer and `SiteFooter` now transition `#6B6655` → `#9DB0A1` on hover
- Implemented via `hoveredBtn` state + `onMouseEnter`/`onMouseLeave` (consistent with inline-styles codebase)

### Custom SVG feature icons (landing page)
- Replaced six emoji placeholders on feature cards with custom SVG icons (Pine/Gold palette, 48×48)
- Super projection: growing bar chart | Net worth trajectory: three ascending circles | Retirement probability: gauge ring | Property & debt: house with Gold base + door cutout | Tax position: document + Gold badge | Action plan: three-row checklist with Gold accent

### Infrastructure
- Folder renamed: `~/clearpath/` → `~/independentMeans/`
- `package.json` name updated: `"clearpath"` → `"independent-means"`
- `CLAUDE.md` fully rewritten to reflect current architecture (was stale, referenced old single-file structure)
- `CHANGELOG.md` created (this file)

### Commits
`b5019ac` Extract LegalModal · `0cf758a` Hide static-links hover · `a227d5f` Hide static-links authenticated · `59f4080` Hover colours · `8776f87` SVG icons · `a87cb4f` Icon corrections

---

## 2026-07-08 — Phase 9: PDF report & CSV export

- Created `src/PdfReport.jsx` — always-mounted, renders on `window.print()` via `@media print` CSS
- Created `src/exportCsv.js` — `planDataCsvRows()`, `projectionCsvRows()`, `exportPlanDataCsv()`, `exportProjectionCsv()`
- Created `docs/export-format.md` — full column schema for both CSV exports
- Added "Download Report" header button (stages 6–7, behind `pdf_export` gate)
- Added "Download Projection CSV" to `AnalysisStage.jsx` (behind `csv_export` gate)
- Added "Download Data CSV" to `ActionPlanStage.jsx` (behind `csv_export` gate)
- 19 CSV tests + 15 PDF pipeline tests added (254 total passing)
- Copy fixes: "planner" → "tool" in `actionPlan.js`; "Download Plan CSV" → "Download Data CSV"
- `LAUNCH_CHECKLIST.md` rewritten: Journey E (export QA), Journeys A–D updated, copy compliance items added

---

## Prior sessions (pre-changelog)

Phases 1–8 built the core app: 7-stage wizard, JS engine, Supabase auth, Stripe subscriptions, Monte Carlo, Strategy Centre, PremiumGate/entitlement system, TrialBanner, PricingPage, AdminDashboard, multi-property support, advanced tax modelling.
