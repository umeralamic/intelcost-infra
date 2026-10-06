# F16 go-live: from the bench's Stripe fake to real Stripe

**For:** Abdullah. **Written:** 2026-10-07. **Spec:** [F16_SPEC.md](F16_SPEC.md); decisions D-277
to D-284.

Billing is built and runs on the bench against a Stripe fake. This is every step to run it
against real Stripe, in order. Do it all in **test mode** first (step 9), then repeat steps 1 to 7
in **live mode** with live keys.

Nothing here changes code. Everything is either a Stripe dashboard setting, an api environment
setting, or a value typed into the platform pages (`/platform/subscriptions`, Plans tab, and
`/platform/ai-economics`).

## 1. Products and prices

Create these in the Stripe dashboard (Products). All prices are USD, with Stripe Tax off (step 6)
and nothing about tax in product names or descriptions.

Checkout bills a subscription as two lines: the plan's **base price once** (the first seat) and
its **seat price** for every seat after the first. So each plan needs four recurring prices.

| Product | Price | Amount | Recurring |
|---|---|---|---|
| Essentials | base, monthly | $9.99 | monthly |
| Essentials | base, annual | $99.99 | yearly |
| Essentials | seat, monthly | $9.99 | monthly |
| Essentials | seat, annual | $99.99 | yearly |
| Professional | base, monthly | $29.99 | monthly |
| Professional | base, annual | $299.99 | yearly |
| Professional | seat, monthly | $29.99 | monthly |
| Professional | seat, annual | $299.99 | yearly |

The amounts are the plan catalog's today (`billing_plan`, shown on the Plans tab). If a price is
changed later, create a **new** Stripe price and put its id in the catalog; existing
subscriptions keep their old price (D-284 4).

**AI credit packs** (one-time prices, D-236 9):

| Product | Amount | Credits |
|---|---|---|
| AI credits 1,000 | $10.00 | 1,000 |
| AI credits 2,500 | $25.00 | 2,500 |
| AI credits 5,000 | $50.00 | 5,000 |
| AI credits 10,000 | $100.00 | 10,000 |

Keep one product per plan (Essentials, Professional) with its four prices, rather than a product
per price. The customer portal (step 5) offers plan switches between products.

## 2. Put the price ids in the app

Each price id (`price_…`) goes in one place. The catalog wins; the environment setting is only
the fallback when the catalog field is empty.

- **Plans:** `/platform/subscriptions` › **Plans**. For Essentials and for Professional, fill
  *Stripe price, monthly*, *annual*, *seat monthly* and *seat annual*, then **Save**. Leave the
  amounts as they are unless they changed in step 1.
- **Packs:** `/platform/ai-economics` › packs table › *Stripe price ID* for each of the four
  packs.
- **Fallback settings** (optional; only if you prefer environment over the catalog):
  `STRIPE_PRICE_ESSENTIALS_MONTHLY`, `STRIPE_PRICE_ESSENTIALS_ANNUAL`,
  `STRIPE_PRICE_SEAT_ESSENTIALS_MONTHLY`, `STRIPE_PRICE_SEAT_ESSENTIALS_ANNUAL`, the same four for
  `PROFESSIONAL`, and `STRIPE_PRICE_PACK_1000`, `_2500`, `_5000`, `_10000`.

Billing tiers › *Stripe & MaxMind* shows each setting as Set or Not set (never its value).

## 3. API key and webhook secret

On the **api, worker and beat** services (they share the api's environment):

| Setting | Value |
|---|---|
| `STRIPE_SECRET_KEY` | the secret key (`sk_test_…`, later `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | the endpoint's signing secret from step 4 (`whsec_…`) |
| `STRIPE_API_BASE` | **leave unset.** It points at `https://api.stripe.com` by default; the bench overrides it to its fake |
| `APP_URL` | `https://app.intelcost.io` in production (Checkout's success and cancel pages, and the portal's return, are built from it) |

The platform's dashboard links follow the key: live for `sk_live_` or `rk_live_`, test otherwise.

## 4. The webhook endpoint

Stripe dashboard › Developers › Webhooks › **Add endpoint**:

- **URL:** `https://api.intelcost.io/api/stripe/webhook`
- **Events** (exactly these seven):
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET` (step 3).

Every event is stored once and kept with its body. A failed one shows on
`/platform/subscriptions` › **Webhook events** (Errors only) with **Retry**. Stripe also retries
on its own, since the api answers 500 on a failure.

## 5. Customer portal

Stripe dashboard › Settings › Billing › **Customer portal**. Create one configuration:

- **Invoices:** on (the app has no invoice list; Q7).
- **Payment methods:** customers can update.
- **Cancellations:** on, **at the end of the billing period** (Q5: a cancellation keeps the paid
  period).
- **Subscription updates:**
  - Update quantities: on, for the **seat** prices only (the base price stays at 1).
  - Switch plans: between Essentials and Professional, same cadence.
  - Proration: on for increases (Q13: seats added mid-year are prorated by Stripe).
  - **Schedule downgrades at period end: on.** This is what makes a seat decrease on an annual plan
    wait for renewal (Q13). The api cannot enforce it per request (D-280 5).
- Business information: link the Terms page (`https://intelcost.io/terms`) and add no other
  policy text; the Terms page already says what applies (Q8).

Then copy the configuration id (`bpc_…`) into **`STRIPE_PORTAL_CONFIGURATION`** on the api. When
it is unset, the account's default configuration opens instead.

## 6. Tax

**Stripe Tax stays off** (Q16). Checkout collects the billing address (country and state, for the
record) and nothing names tax: not the products, not the prices, not the receipts' custom text.

## 7. API version

The code reads a subscription's period dates from its **subscription items**
(`items.data[].current_period_start/end`), falling back to the subscription's own fields, so it
works on both the older and the newer API versions (Q14). Check the account's API version
(Developers › API version) and **note it here** when you go live:

- Test mode API version: ______________
- Live mode API version: ______________

The webhook endpoint uses the account's version unless you pin one when creating it; keep both the
same.

## 8. Mail guard off outside the bench

`MAIL_GUARD` is the bench's (D-279): with it on, mail reaches only `MAIL_ALLOWLIST` and the rest is
caught by MailHog. In **staging and production**, `MAIL_GUARD` must be **unset or false** (it is
off by default). Check it on api, worker and beat before go-live, or customers receive no
invitations and confirmations.

## 9. Test-mode run before live keys

With test keys, test prices and the test webhook endpoint in place (steps 1 to 7 in test mode), on
staging, with a throwaway account and Stripe's test cards (`4242 4242 4242 4242`; failing payment
`4000 0000 0000 0341`):

1. Sign up from the price page with Professional, Yearly, 3 seats. Settings › Billing shows the
   trial and the cards pre-filled.
2. **Start subscription** and pay with `4242…`. Billing shows Active, annual, 3 seats. AI Credits
   shows 300 included.
3. **Manage billing**, add a seat. Billing shows 4 seats; AI Credits gains 100 at once.
4. AI Credits › **Buy now** on the $10 pack and pay. Purchased +1,000, one row under Purchases.
5. In the dashboard, change the card to `4000 0000 0000 0341` and run the next invoice (or use a
   test clock). Billing shows "Payment failed. Access continues until …"; the workspace stays
   editable.
6. Update the card back and pay the invoice. Billing shows Active.
7. Cancel in the portal. Billing shows "Cancels on …". With a test clock past the period end, the
   workspace becomes view-only ("Subscription ended" in the chrome); Start subscription brings it
   back.
8. `/platform/subscriptions`: the workspace is listed with its seats and Stripe links (test mode).
   **Webhook events** shows every event processed and none in Errors only.
9. Confirm no event failed the signature check (Stripe dashboard › the endpoint's attempts are all
   200).

Then switch to live: live products and prices (step 1), their ids in the catalog and the packs
(step 2; the live ids replace the test ones), the live key and the live endpoint's secret (steps 3
and 4), the live portal configuration (step 5), and repeat step 9's first two checks with a real
card on a company workspace.

## 10. After go-live

- Testers who should keep working get a **comp** from `/platform/subscriptions` (New comp) or
  Billing tiers › Overrides (F16_SPEC §8).
- Before any deploy to testers, the full run restored from the fixture tag (CLAUDE.md).
