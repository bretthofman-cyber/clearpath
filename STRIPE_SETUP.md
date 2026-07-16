# Stripe Setup Checklist

Complete these steps in order. Use **test mode** first (toggle in the top-left of the Stripe dashboard), then repeat for live mode when ready to accept real payments.

---

## 1. Create the subscription products and prices

1. Go to **Products** in the Stripe dashboard.
2. Click **+ Add product**.
3. Fill in:
   - **Name:** `Independent Means Premium`
   - **Description:** `Full access to Independent Means financial planning tools`
   - Leave "One-time" deselected — you will add recurring prices next.
4. Under **Pricing**, click **+ Add price**:
   - **Billing period:** Monthly
   - **Price:** `15.00`
   - **Currency:** `AUD`
   - Click **Add price**.
5. Click **+ Add price** again:
   - **Billing period:** Yearly
   - **Price:** `149.00`
   - **Currency:** `AUD`
   - Click **Add price**.
6. Click **Save product**.
7. Copy both price IDs (they look like `price_1ABC...`). You will need them in step 5.

---

## 2. Set up the webhook endpoint

1. Go to **Developers → Webhooks**.
2. Click **+ Add endpoint**.
3. **Endpoint URL:**
   - Test: `https://www.independentmeans.com.au/api/stripe-webhook`
   - Live: same URL (the live endpoint can be the same)
4. Under **Events to listen to**, select:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**.
6. Click the endpoint you just created, then click **Reveal** next to **Signing secret**.
7. Copy the value starting with `whsec_` — you will need it in step 5.

---

## 3. Enable the Customer Portal

1. Go to **Settings → Billing → Customer portal**.
2. Under **Features**, enable:
   - Cancel subscriptions
   - Update payment methods
   - View billing history
3. Optionally configure **Cancel immediately** vs **At end of billing period** — recommended: **At end of billing period**.
4. Under **Business information**, confirm your business name and support email are correct.
5. Click **Save**.

No URL to copy here — the portal session URL is generated dynamically by the `/api/stripe-portal` function.

---

## 4. Copy your API keys

1. Go to **Developers → API keys**.
2. Copy the **Secret key** (starts with `sk_test_` in test mode).
   - Do NOT copy the publishable key — the app does not need it.

---

## 5. Add environment variables to Vercel

1. Go to your Vercel project → **Settings → Environment Variables**.
2. Add the following variables. Set them for **Production**, **Preview**, and **Development** as needed.

| Variable | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | From step 4. Never add a `VITE_` prefix. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From step 2. Never add a `VITE_` prefix. |
| `STRIPE_PRICE_MONTHLY` | `price_...` | Monthly price ID from step 1. |
| `STRIPE_PRICE_ANNUAL` | `price_...` | Annual price ID from step 1. |

3. Redeploy the app (push a new commit, or click **Redeploy** in Vercel) so the new variables take effect.

---

## 6. Test the end-to-end flow

Use Stripe's test card numbers — no real money is charged.

**Test card for a successful payment:**
- Number: `4242 4242 4242 4242`
- Expiry: any future date
- CVC: any 3 digits

**Test card for a payment that fails:**
- Number: `4000 0000 0000 0002`

Steps to verify:
1. Open the app, click **Upgrade** or **See pricing**.
2. Select a plan and proceed to checkout. Confirm the Stripe Checkout page loads and shows AUD pricing.
3. Complete checkout with the test card. You should be redirected back to the app.
4. Confirm the subscription is now active in the app header (trial banner gone, no gate overlays).
5. In the Stripe dashboard → **Customers**, confirm the customer record was created.
6. Check **Developers → Webhooks → your endpoint → Recent events** — you should see `checkout.session.completed` delivered with a green tick.
7. Go to **Account settings** (or billing button in the header) and confirm the Customer Portal link opens.

---

## 7. Going live (when ready)

1. In the Stripe dashboard, toggle from **Test mode** to **Live mode** (top-left).
2. Repeat steps 1–4 in live mode — products, prices, webhook endpoint, and secret key are separate between modes.
3. In Vercel, update the four environment variables to their live-mode values:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_...` (live endpoint's secret)
   - `STRIPE_PRICE_MONTHLY` → live monthly price ID
   - `STRIPE_PRICE_ANNUAL` → live annual price ID
4. Redeploy.
5. Do a single live test payment with a real card, then refund it immediately from **Stripe → Payments**.

---

## Environment variable summary

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...
```

See `.env.example` for the full list of all required environment variables.
