# Independent Means — Changelog

Append a new entry at the top after each Claude Code session.  
Format: `## YYYY-MM-DD — <short title>` followed by bullet points.

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
