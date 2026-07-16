# Independent Means — Export Format Reference

This document specifies the column schemas for the two CSV exports available to premium users.

---

## 1. Plan Data Export (`independent-means-plan.csv`)

A single-row CSV containing the user's full entered profile. Designed for future CSV import round-trip: every column maps 1:1 to a camelCase field in the application data model.

**Import mapping rule:** column `snake_case_name` → field `snakeCaseName` (convert underscores to camelCase). Array columns (suffixed `_json`) are JSON-encoded strings that parse back to arrays.

### Column Schema

| Column | Type | Description |
|--------|------|-------------|
| `first_name` | string | Primary person's first name |
| `age` | number | Primary person's current age |
| `has_partner` | `"yes"` \| `"no"` | Whether there is a second household person |
| `partner_name` | string | Partner's first name (if applicable) |
| `partner_age` | number | Partner's current age |
| `partner_retirement_age` | number | Partner's target retirement age |
| `dependants` | number | Number of financial dependants |
| `location` | string | State or territory (e.g. `"NSW"`) |
| `employment_status` | string | e.g. `"full-time"`, `"self-employed"`, `"part-time"` |
| `retirement_age` | number | Primary person's target retirement age |
| `life_expectancy` | number | Planning horizon (age at end of projection) |
| `home_ownership` | string | `"owner"`, `"renting"`, `"mortgage"` |
| `private_health_insurance` | `"yes"` \| `"no"` | Primary person has PHI |
| `partner_private_health_insurance` | `"yes"` \| `"no"` | Partner has PHI |
| `gross_income` | number | Primary person's annual gross income (AUD) |
| `partner_income` | number | Partner's annual gross income |
| `bonus_income` | number | Primary person's annual bonus/commission |
| `other_income` | number | Primary person's other annual income |
| `partner_bonus_income` | number | Partner's annual bonus |
| `partner_other_income` | number | Partner's other annual income |
| `monthly_expenses` | number | Combined household monthly living expenses (AUD) |
| `annual_irregular` | number | Annual one-off / irregular expenses |
| `savings_per_month` | number | Monthly surplus saved |
| `emergency_fund` | number | Emergency fund balance |
| `ppor_value` | number | Principal place of residence estimated value |
| `ppor_ownership_pct` | number | Ownership share of PPOR (0–100) |
| `mortgage_balance` | number | Remaining PPOR mortgage balance |
| `mortgage_rate` | number | PPOR mortgage interest rate (%, e.g. `6.2`) |
| `loan_type` | `"pi"` \| `"io"` | Principal-and-interest or interest-only |
| `mortgage_start_year` | number | Year the mortgage was originated |
| `mortgage_tenure` | number | Original loan term in years |
| `mortgage_io_expiry_year` | number | Year the IO period expires (if applicable) |
| `ppor_offset_balance` | number | Balance in PPOR offset account |
| `credit_card_debt` | number | Primary person's credit card balance |
| `personal_loan_debt` | number | Primary person's personal loan balance |
| `hecs_debt` | number | Primary person's HECS/HELP balance |
| `partner_credit_card_debt` | number | Partner's credit card balance |
| `partner_personal_loan_debt` | number | Partner's personal loan balance |
| `partner_hecs_debt` | number | Partner's HECS/HELP balance |
| `super_balance` | number | Primary person's superannuation balance |
| `partner_super_balance` | number | Partner's superannuation balance |
| `employer_sg_rate` | number | Employer SGC rate for primary person (%, default 12) |
| `partner_employer_sg_rate` | number | Employer SGC rate for partner |
| `salary_sacrifice` | number | Primary person's annual salary sacrifice to super |
| `partner_salary_sacrifice` | number | Partner's annual salary sacrifice |
| `carry_forward_cap` | number | Unused concessional cap carried forward (primary) |
| `partner_carry_forward_cap` | number | Unused concessional cap carried forward (partner) |
| `franking_credits` | number | Annual franking credits (primary) |
| `partner_franking_credits` | number | Annual franking credits (partner) |
| `insurance_premium` | number | Life/income protection premium — primary person (annual AUD) |
| `insurance_in_super` | `"yes"` \| `"no"` | Whether primary insurance is paid from super |
| `partner_insurance_premium` | number | Partner's annual insurance premium |
| `partner_insurance_in_super` | `"yes"` \| `"no"` | Whether partner insurance is paid from super |
| `debt_recycling` | `"true"` \| `"false"` | Debt recycling strategy enabled |
| `target_retirement_spending` | number | Annual retirement spending target (AUD) |
| `retirement_lifestyle` | string | `"modest"`, `"comfortable"`, `"affluent"` |
| `risk_tolerance` | string | `"conservative"`, `"balanced"`, `"growth"` |
| `active_scenario` | string | Active planning scenario: `"base"`, `"conservative"`, `"aggressive"` |
| `budget_items_json` | JSON string | Array of budget line items (re-parseable) |
| `asset_items_json` | JSON string | Array of non-property asset items (re-parseable) |
| `investment_properties_json` | JSON string | Array of investment property objects (re-parseable) |
| `life_events_json` | JSON string | Array of planned life event objects (re-parseable) |

### Numeric cells

- No currency symbols, no thousands separators
- Blank string (`""`) for fields not entered by the user
- Booleans serialised as `"true"` or `"false"` strings

---

## 2. Projection Export (`independent-means-projection.csv`)

Year-by-year modelling output from current age to life expectancy. Each row is one calendar year.

### Column Schema

| Column | Type | Description |
|--------|------|-------------|
| `age` | integer | Person's age in that year |
| `year` | integer | Calendar year |
| `net_worth` | integer | Total household net worth (AUD, nominal) |
| `super_balance` | integer | Combined superannuation balance |
| `liquid_assets` | integer | Cash + shares + other liquid investments |
| `property_value` | integer | PPOR + investment property total value |
| `total_debt` | integer | All debt (mortgage + IP mortgages + other) |
| `is_retired` | `"true"` \| `"false"` | Whether the person has reached retirement age |
| `base_net_worth` | integer | Net worth under base scenario (premium only) |
| `conservative_net_worth` | integer | Net worth under conservative scenario (premium only) |
| `aggressive_net_worth` | integer | Net worth under aggressive scenario (premium only) |

The per-scenario columns (`base_net_worth`, `conservative_net_worth`, `aggressive_net_worth`) are only present when the user has scenario comparison access (premium entitlement). The `net_worth` column always reflects the active scenario.

### Notes

- All figures are nominal (not inflation-adjusted)
- Figures are rounded to the nearest dollar (no decimal places)
- Pre-retirement net worth growth reflects investment returns, savings, property growth, and debt repayment
- Post-retirement figures reflect super drawdown at the target retirement spending rate
- Negative net worth is possible for highly-leveraged profiles and is reported as-is

---

## Import Round-Trip (Future Feature)

To import a plan data CSV, a future import function should:

1. Parse the header row to derive the field mapping
2. Convert each `snake_case` header to `camelCase` (replace `_X` with `X.toUpperCase()`)
3. Parse `*_json` columns with `JSON.parse()`
4. Merge the resulting object into `EMPTY_DATA` (application default values)
5. Validate numeric fields with `parseFloat()` and string fields with `String()`

The resulting object is ready to pass to `setData()` in App.jsx.
