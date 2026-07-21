# Independent Means — Technology Stack

> Last updated: 2026-07-21

This document describes every technology choice in the app, why it was made, and how the pieces connect.

---

## What the app is

Independent Means is an Australian personal financial modelling web app. Users work through a 7-stage wizard (household profile → income → assets → property & debt → super → analysis → action plan), the app runs a deterministic JavaScript engine against their inputs, and returns a year-by-year net worth trajectory, retirement drawdown model, tax position, Monte Carlo probability view, and a categorised set of observations and action points.

**AFSL compliance is the defining constraint.** The app holds no Australian Financial Services Licence. Every output is framed as general information, not personal financial advice. This has two direct consequences for the technology stack:
1. No AI features in the running app — AI output risks being construed as advice
2. The calculation engine must be entirely rules-based and deterministic, so users can understand exactly what produced a result

---

## Frontend

### React 19 + Vite 8
The app is a single-page application built on React 19 and bundled with Vite 8. Vite 8 uses the rolldown bundler (Rust-based, a successor to Rollup) rather than the legacy esbuild/Rollup combo — this required switching `manualChunks` from an object to a function, since rolldown only accepts the function form.

React was chosen over a meta-framework (Next.js, Remix) deliberately. All financial data stays client-side — the calculation engine runs in the browser, nothing is sent to a server for processing. A plain SPA makes this constraint obvious and hard to accidentally break. Server-side rendering would provide no benefit for a wizard-style app where every screen depends on prior inputs.

### No TypeScript
The app is plain JavaScript throughout. TypeScript adds a compile step, tooling overhead, and surface area for errors. The financial engine in particular has complex type relationships (arrays of properties, scenario objects, option flags) where the runtime checks in the code are more valuable than static types. This is a deliberate choice that could be revisited, but it has not been a source of bugs.

### No CSS framework — inline styles throughout
Every component uses React's `style` prop with JavaScript objects. There is no Tailwind, no CSS modules, no styled-components, no global stylesheet (beyond a minimal font import). This was chosen because:
- The "Quiet Wealth" design system has a fixed, small palette (7 colours) and a consistent typographic scale — there is no need for a utility class catalogue
- Inline styles are co-located with the component they style, making it impossible for styles to leak between components
- The app is not content-heavy, so the performance case for extracting a CSS bundle is weak
- It is simpler to reason about what a component looks like without tracing class names through a separate stylesheet

The tradeoff is verbosity. Complex hover states require explicit `onMouseEnter`/`onMouseLeave` handlers and a piece of state, rather than a `:hover` selector. This has been accepted as a fair cost.

### Fonts
- **Spectral** (Google Fonts, serif) — headings, brand wordmark, numbers in financial tables
- **Albert Sans** (Google Fonts, sans-serif) — body text, labels, buttons

### Code splitting
The initial bundle is 84 kB (gzipped: 24 kB). Heavy components are lazy-loaded on first access via `React.lazy()` and `Suspense`:
- `BudgetStage`, `AssetStage`, `AnalysisStage`, `ActionPlanStage`, `PdfReport`, `AdminDashboard`, `PricingPage`, `LoginScreen`

The 863 kB xlsx library (`xlsx-js-style`) is deferred further — it only loads when the user clicks the export button, via a dynamic `await import()` inside the export function.

Vendor chunks are split by category: `vendor-react` (React + ReactDOM), `vendor-auth` (Clerk), `vendor-db` (Supabase JS client).

---

## Authentication — Clerk

Authentication is handled entirely by **Clerk** (`@clerk/clerk-react` on the frontend, `@clerk/backend` in API functions).

**Why Clerk, not Supabase Auth?**  
The app originally used Supabase Auth (Google OAuth). It was migrated to Clerk because:
- Clerk has cleaner React hooks (`useUser`, `useAuth`, `getToken`) and a better developer experience for token management
- Clerk's session token is a standard JWT with a `sub` claim, which Supabase RLS policies can verify directly via `auth.jwt() ->> 'sub'`
- Clerk makes it easy to add more OAuth providers (Apple Sign In, GitHub, etc.) without touching the backend
- Clerk's dashboard gives better visibility into active sessions and user management

**How it works:**
1. User clicks "Sign in with Google" on the landing page
2. Clerk's `authenticateWithRedirect` handles the OAuth flow; Clerk issues a session JWT
3. `useAuth().getToken()` fetches a short-lived JWT for each API call
4. Every Vercel API function calls `verifyToken(token, { secretKey: CLERK_SECRET_KEY })` at the top before touching anything else
5. The Clerk user ID (`payload.sub`) is used as the `user_id` in the `subscriptions` table

**Key tokens:**
| Variable | Where | What |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Client bundle | Safe to expose; identifies the Clerk application |
| `CLERK_SECRET_KEY` | Vercel env only | Never in the client bundle; used to verify JWTs server-side |

The Supabase client on the frontend is initialised with the anon key (safe to expose) and uses Clerk's JWT for RLS enforcement — the `supabase.js` module keeps a `clerkTokenGetter` singleton that is set once at app startup.

---

## Database — Supabase Postgres

**Supabase** is used as the database only. Supabase Auth has been removed; all auth goes through Clerk.

The database has two main tables:
- **`subscriptions`** — one row per user: `user_id` (Clerk sub), `stripe_customer_id`, `stripe_subscription_id`, `status` (free/trialing/active/past_due/canceled), `trial_started_at`, `trial_ends_at`, `current_period_end`
- **`events`** — analytics: `user_id`, `event_name`, `feature`, `context` (JSONB), `created_at`

**Row Level Security (RLS)** is enabled on both tables. Policies use `auth.jwt() ->> 'sub'` to match Clerk's `sub` claim, so no user can read or write another user's data. The Vercel API functions use the **service role key** (bypasses RLS) to write subscription state from webhooks — this key is never exposed to the browser.

**Financial data is stored in Supabase** in the `plans` table — one row per user, with a `data` JSONB column holding the full wizard input object and a `stage` integer tracking where the user is up to. Saves are debounced at 800ms: every field edit triggers a debounce timer, and the upsert fires once the user pauses. On sign-in, `loadPlan` fetches the row and rehydrates the wizard state. RLS ensures users can only read and write their own row (`auth.jwt() ->> 'sub' = user_id`).

---

## Payments — Stripe

**Stripe** handles all subscription billing. There are two pricing tiers: A$15/month or A$149/year.

### Checkout flow
1. User clicks "Start Premium" in `PricingPage.jsx`
2. Frontend calls `POST /api/stripe-checkout` with `planType: 'monthly'|'annual'` and a Clerk JWT
3. API function verifies JWT, looks up the user's existing `stripe_customer_id` from Supabase (to avoid creating duplicate customers), creates a Stripe Checkout Session, returns the hosted checkout URL
4. User completes payment on Stripe's hosted page
5. Stripe fires `checkout.session.completed` → `POST /api/stripe-webhook`
6. Webhook verifies Stripe signature, writes `status: "active"` to Supabase `subscriptions`

### Webhook handling
`api/stripe-webhook.js` is the Vercel serverless function. It verifies the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET` before processing any event. The actual state-mutation logic lives in `src/stripeWebhookHandlers.js` (pure JS, no Stripe/Supabase imports) so it can be unit-tested with Vitest without mocking HTTP.

Four event types are handled:
- `checkout.session.completed` → set status `active`
- `customer.subscription.updated` → update status + `current_period_end`
- `customer.subscription.deleted` → set status `canceled`
- `invoice.payment_failed` → set status `past_due`

### Customer Portal
`POST /api/stripe-portal` creates a Stripe Billing Portal session. Users can change their plan, update payment details, or cancel from within the app. The portal session URL is returned to the client and the user is redirected.

**Security invariants:**
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are never in the client bundle and never have the `VITE_` prefix
- Price IDs are resolved server-side from env vars (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`) — the client only sends `planType: 'monthly'|'annual'`
- `stripe_customer_id` is always looked up from the database server-side; it is never trusted from the client

---

## Hosting — Vercel

The app is hosted on **Vercel** with automatic deploys on push to `main` on GitHub.

**SPA routing:** `vercel.json` contains a single rewrite rule — all requests that don't match `/api/*` are served `index.html`. This lets React Router (or manual `useState`-based routing as used here) handle all client-side navigation.

**Serverless functions:** files in the `api/` directory are automatically deployed as Vercel serverless functions (Node.js). Each function is a standalone module with no shared state between invocations.

Current API functions:
| File | Purpose |
|---|---|
| `api/stripe-checkout.js` | Create Stripe Checkout session |
| `api/stripe-portal.js` | Create Stripe Customer Portal session |
| `api/stripe-webhook.js` | Handle Stripe webhook events |
| `api/track.js` | Write analytics events to Supabase |
| `api/admin-stats.js` | Return analytics data for the admin dashboard |

Environment variables are set in the Vercel dashboard (not in `.env` files, which are gitignored). `.env.example` documents every required variable.

---

## Financial Calculation Engine — `src/engine.js`

The engine is ~1200 lines of pure JavaScript with no external dependencies. It takes a plain `data` object (the user's wizard inputs) and an `assumptions` object (return rate, inflation, property growth, etc.) and returns a structured result.

### Four core functions

| Function | What it calculates |
|---|---|
| `projectSuper(data, assumptions)` | Year-by-year super balance to retirement: SG contributions, salary sacrifice, concessional cap, carry-forward, insurance premiums, investment returns |
| `retirementDrawdown(data, assumptions, superBalance)` | Year-by-year drawdown from retirement to life expectancy: super first, then liquid, with inflation-adjusted spending, age pension overlay, depletion age |
| `debtFreeDate(data)` | PPOR amortisation: month-by-month P&I payments, extra repayments, debt-free year |
| `netWorthTrajectory(data, assumptions)` | Year-by-year net worth from current age to life expectancy: accumulation phase + retirement drawdown, property growth, IP cashflows, negative gearing, debt recycling |

### `runEngine(data, options)`
Orchestrates all four functions and returns:
```js
{
  trajectory,    // Array of {age, year, netWorth, superBalance, liquidAssets, propertyValue, totalDebt, isRetired}
  monteCarlo,    // Null if skipMonteCarlo; else {p10, p25, p50, p75, p90} fan-chart data
  metrics,       // FIRE number, projected super, depletion age, etc.
  mortgage,      // { debtFreeYear, monthlyPayment }
  drawdown,      // { futureSpending, depletionAge, agePension, etc. }
  assumptions,   // The scenario used
  householdTax,  // { incomeTax, medicare, div293, frankingCredits, etc. }
}
```

Options `{ skipMonteCarlo, skipAdvancedTax }` allow callers to skip expensive calculations — Monte Carlo is skipped for free users; advanced tax (Div 293, carry-forward, franking) is skipped unless the user has Premium.

### Monte Carlo
1000 simulation runs, each with normally-distributed annual return perturbations around the scenario's mean. Returns percentile fan-chart data (p10/p25/p50/p75/p90). Only runs for Premium/Trial users.

### Australian tax modelling
- Progressive income tax rates (FY2025-26)
- Medicare levy (2%)
- Division 293 tax (high-income super surcharge, >$250k combined income)
- Concessional contribution cap ($30k/year) with carry-forward for balances under $500k
- Non-concessional cap ($110k/year)
- Franking credit refunds
- HECS/HELP repayment (income-contingent)
- Negative gearing (IP interest deductible against other income)
- Capital gains tax with 50% discount (assets held >12 months)

### Age Pension
`estimateAgePension()` implements the Centrelink assets test and income test for the Australian Age Pension (eligibility at 67). Returns an annual pension estimate used in the retirement drawdown overlay.

---

## Entitlement System

### Feature flags — `src/features.js`
`FEATURES` is a plain object of string constants (`FEATURES.PDF_EXPORT = "pdf_export"`, etc.). All gates reference these constants. Adding a new feature means adding one line here.

### Subscription hook — `src/useEntitlement.js`
`useEntitlement(userId, getToken)` fetches the user's subscription row from Supabase on mount, and exposes:
- `can(featureId)` — returns true if the user's tier unlocks the feature
- `status` — `"free"` | `"trialing"` | `"active"` | `"past_due"` | `"canceled"`
- `isTrial`, `trialDaysLeft`, `trialEndsAt`
- `activateTrial(fromFeature)` — writes the trial start row to Supabase; called on first premium gate click
- `refreshSubscription()` — re-fetches after checkout completes
- `openPortal()` — calls `/api/stripe-portal` and redirects

`EntitlementContext` is provided at the App root and consumed anywhere via `useContext`.

### Gate component — `src/PremiumGate.jsx`
Wraps any UI element. If the user is not entitled, renders the children plus a semi-transparent overlay with an upgrade prompt. The overlay does not remove children from the DOM — it sits on top — so the underlying UI gives free users a preview of what they would unlock.

### Tiers
| Status | Access |
|---|---|
| `free` | 7-stage wizard, base scenario, net worth chart, FIRE number, basic tax |
| `trialing` | All Premium features for 14 days (auto-activates on first gate click, no card required) |
| `active` | All Premium features |
| `past_due` / `canceled` | Treated as free |

---

## Analytics — `src/analytics.js` + `api/track.js`

The app tracks a small set of funnel events (sign-up, gate clicks, trial start, checkout initiated) by writing rows to the Supabase `events` table via `POST /api/track`. The API function validates the event name, sanitises the context object (strips numeric values over 100 to avoid storing financial amounts), and writes with the service role key.

The admin dashboard (`src/AdminDashboard.jsx`) is accessible only to the email in `VITE_ADMIN_EMAIL` / `ADMIN_EMAIL`. It shows gate clicks by feature, funnel drop-off rates, and trial conversion by originating feature.

---

## Testing — Vitest

**254 tests across 12 files.** All tests use Vitest (Jest-compatible API, runs in Node without a browser). Tests cover:
- `engine.js` — projection maths, tax calculations, edge cases (zero inputs, retirement before current age, etc.)
- `stripeWebhookHandlers.js` — all four webhook event types with mock Supabase clients
- `exportCsv.js` — CSV row generation for plan data and projection exports
- `actionPlan.js` — observation generation rules
- `warnings.js` — financial warning triggers

No browser/DOM tests. The UI is not tested with React Testing Library or Playwright — the calculation engine and business logic are the high-value test targets.

Run tests: `npm test` (watch mode) or `npm run test:run` (single pass).

---

## Key architectural decisions

### Why Supabase for financial data (and not localStorage)
Financial wizard inputs are stored server-side in the Supabase `plans` table. This was chosen over localStorage so users can pick up their plan on any device or browser. The tradeoff is that the app requires a network connection to load a saved plan, but given that the app requires sign-in anyway, offline-first was not a meaningful use case.

### Why no routing library
Navigation between the 7 stages is managed by a single `stage` state variable in `App.jsx`. There are no URL routes for wizard stages — the URL stays at `/` throughout. This was a deliberate simplification: back/forward browser navigation within the wizard would be confusing, the wizard is a linear flow, and linking to a specific stage is not a use case. React Router would add complexity without benefit here.

### Why `vercel.json` is minimal
The file contains only the SPA fallback rewrite. No proxies, no headers overrides, no function configuration. Vercel's conventions handle everything else: files in `api/` become serverless functions automatically; static assets in `dist/` are served from the edge CDN.

### Why the engine is pure JS (not a service)
Running the engine in the browser means projections are instant (no network round-trip), work offline, and never send financial data to a server. The tradeoff is that the engine cannot be updated without a new deploy. Given the AFSL compliance requirement that outputs be explainable and deterministic, this tradeoff is clearly correct.

---

## Environment variables — quick reference

| Variable | Where used | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Client bundle | Safe to expose |
| `CLERK_SECRET_KEY` | Vercel API functions | Never in client bundle |
| `VITE_SUPABASE_URL` | Client + API functions | Safe to expose |
| `VITE_SUPABASE_ANON_KEY` | Client bundle | Safe to expose (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel API functions | Bypasses RLS; never in client bundle |
| `STRIPE_SECRET_KEY` | Vercel API functions | Never in client bundle |
| `STRIPE_WEBHOOK_SECRET` | `api/stripe-webhook.js` | Verifies Stripe signature |
| `STRIPE_PRICE_MONTHLY` | `api/stripe-checkout.js` | Resolved server-side only |
| `STRIPE_PRICE_ANNUAL` | `api/stripe-checkout.js` | Resolved server-side only |
| `APP_URL` | `api/stripe-checkout.js`, `api/stripe-portal.js` | Return URL after checkout/portal |
| `ADMIN_EMAIL` | `api/admin-stats.js` | Server-side admin gate |
| `VITE_ADMIN_EMAIL` | Client bundle | Shows/hides the Analytics button |
