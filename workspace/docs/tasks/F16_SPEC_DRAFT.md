# F16: Billing, plans, trials (DRAFT)

> **Superseded by [F16_SPEC.md](F16_SPEC.md)** (adopted 2026-10-06, D-277). Kept for history.

**Status:** draft for review (overnight 2026-10-06). Documents only: nothing here is built or
decided. It ends with the questions that need an answer before a block can start.

**Sources.** Live legacy (`intelcost/` on `UmeralamDEV`): `supabase/functions/create-checkout-session`,
`stripe-webhook`, `create-topup-checkout`, `trial-gate`; `src/lib/billing/*`;
`src/hooks/usePermissions.ts`; the billing migrations. Decisions D-02, D-18, D-19, D-21, D-23,
D-27, D-29, D-233, D-236, D-261 5, D-267 5. Notes: `docs/flows.md` §7, PARITY §21 and §22,
`docs/tasks/ai_tools_tasks.md`, `docs/archive/platform_admin_tasks.md`,
`docs/archive/workspace_roles_tasks.md`. The current api and app code (file:line below, as of
2026-10-06).

## 1. Scope

**In F16.**
- Two paid plans with a seat count and a cadence: Collaborator and Pro, monthly or annual.
- Stripe Checkout for a plan, and a signed webhook that records the subscription.
- The customer portal for card, invoices, seats and cancellation (legacy had none).
- The plan replaces the constant `Plan.PRO` in the capability chain (D-21: "F16 supplies a value rather than adding a stage").
- Trials, enforced on the server:
  - per-tier length;
  - the mid-trial caps of restricted tiers;
  - view-only on expiry;
  - a paid subscription ends the trial.
- Seats set the AI allowance (D-236 8) and, if decided, the member count.
- AI credit top-ups: "Buy now" through Checkout, and the webhook crediting packs.
- Upgrade surfaces:
  - a trial button in the app chrome;
  - the upgrade dialog;
  - the locked-workspace dialog;
  - a Billing page under Settings.
- Realtime channels 6 (`workspace.plan.changed`) and 7 (`workspace.trial.changed`).
- The platform admin additions billing needs (subscriptions list, manual comp).

**Not in F16.**
- Marketing's price page. It mirrors prices only; the app and Stripe are the authority (D-02).
- Per-workspace tiering for a second workspace (D-18 keeps inheritance; a change needs its own D-NN).
- Tax handling beyond what Stripe Tax does if switched on.
- Any data migration from legacy billing (testers only, nobody has paid).

## 2. Data model (house conventions: bigint id + uuid, `workspace_id`, created_by/updated_by)

| Table | Purpose | Key columns |
|---|---|---|
| `billing_plan` | The catalog, editable on the platform | `code` (collaborator, pro), name, `monthly_usd`, `annual_usd`, `seat_monthly_usd`, `seat_annual_usd`, `credits_per_seat`, `stripe_price_*` (4 ids), `active` |
| `workspace_subscription` | One row per workspace, written only by the webhook (and platform comp) | `plan_code`, `cadence`, `seats`, `status` (trialing, active, past_due, canceled, unpaid, comp), `stripe_customer_id`, `stripe_subscription_id`, `current_period_start/end`, `cancel_at_period_end`, `canceled_at` |
| `stripe_event` | Idempotency and audit of webhook events | `stripe_event_id` (unique), type, `received_at`, `processed_at`, `error` |
| `billing_invoice` (optional) | A mirror for the Billing page | `stripe_invoice_id`, amount, currency, status, `hosted_invoice_url`, period. The portal can show invoices instead (Q7) |

**Existing tables kept.**
- `workspace` billing columns: `billing_tier`, `billing_country`, `signup_vpn`, `trial_started_at`, `trial_ends_at`, `locked`, `flags` (`workspace/models.py:105-124`).
- The tier tables `billing_country_tier`, `billing_tier_rule`, `workspace_limit_override` (`billing/models.py`).
- The AI tables:
  - `ai_wallet`. Its `seats` is written by the webhook (`ai/models.py:61`).
  - `ai_pack`, with `stripe_price_id` (`ai/models.py:173-181`).
  - `ai_ledger`. It gains `purchase` rows, plus `stripe_session_id` for idempotency.

**Seats.**
- The source of truth is `workspace_subscription.seats`, written only by the webhook (D-236 8: "no client can write them").
- `ai_wallet.seats` follows it.

## 3. Stripe

1. **Checkout (plan).**
   - Route: `POST {ws}/billing/checkout` `{plan, cadence, seats}`.
   - Caller: the owner (`canManageBilling`, owner-only per the F3-S23 spec).
   - The api creates a subscription-mode session:
     - Line items follow legacy: the base price × 1, plus the seat add-on price × (seats − 1) when an add-on price exists; otherwise the base × seats.
     - `client_reference_id` = workspace uuid; metadata carries plan, cadence and seats.
     - It reuses the workspace's Stripe customer when one exists. Legacy made a new one each time.
     - It refuses when an active subscription exists, and sends the owner to the portal instead. Legacy had no guard.
   - Success and cancel return to `/settings/billing?checkout=success|cancelled`.
2. **Webhook.**
   - Route: `POST /api/stripe/webhook`, unauthenticated, verified with the signing secret and a 5-minute tolerance.
   - Each event id is stored once (`stripe_event`). A repeat is a 200 no-op.
   - Events:
     - `checkout.session.completed`: subscription (sync) or `kind=ai_topup` (credit the pack once per session).
     - `customer.subscription.created`, `.updated`, `.deleted`: sync.
     - `invoice.paid`: refill the allowance at the period start (Q4).
     - `invoice.payment_failed`: mark `past_due` (Q5).
   - The sync re-reads the subscription from Stripe rather than trusting the payload.
   - After the commit it publishes `workspace.plan.changed` (D-20).
3. **Customer portal.**
   - Route: `POST {ws}/billing/portal`, owner only.
   - Returns a portal session URL for card, invoices, seat quantity, plan switch and cancellation.
   - Seat changes made in the portal arrive as `subscription.updated`.
4. **Bench.** A Stripe fake on the bench (`flows.md` §7: Abdullah owns products, prices, the webhook secret and the fake). The secret names already listed on Billing tiers (`platform/billing.py:58-71`) become `app/config.py` settings.

## 4. Trials

1. **Length.** Trial length is per tier (`billing_tier_rule.trial_days`; seeded 14, 7 and 5), stamped on the workspace at creation (D-18). Extra days come from the override.
2. **Mid-trial caps (restricted tiers only, seeded Tier 3).**

   | Cap | Limit | Enforced | Error |
   |---|---|---|---|
   | Projects | 1 | `project/service.py:365 create_project` | "Your trial allows 1 project…" |
   | Storage | 500 MB | the upload reserve, `project/service.py:967` (D-27) | |
   | Measurements | 1,000 | item create in the takeoff service | Counts never go down, as legacy (Q9) |
   | AI credits | 30 | already enforced (`ai/service.py:392`) | |
   | PDF throttle | 1,200 ms | a render delay in the app, read from the context | |

   An override replaces a cap; "lift all restrictions" removes them all.
3. **Expiry.**
   - The trial mask (`capabilities.py:435`, keeps at :383) already makes an expired or locked workspace view-only, on the server.
   - F16 adds: a workspace with a subscription in `active` (or `comp`) is never on trial and never expired. `trial_expired` (`dependencies.py:157-171`) checks the subscription first.
   - A paid subscription clears the trial (legacy `clear_trial_restrictions`). The workspace's tier caps stop applying (Q2).
4. **Visible in the app.**
   - A trial button in the chrome: "N days left" when 3 or fewer days remain, and after expiry.
   - The locked dialog on any refused write, sending the user to Billing.
   - Channel 7 refreshes open tabs.

## 5. Plan checks replacing each F16 marker

| Where | Today | F16 |
|---|---|---|
| `app/core/dependencies.py:150` | `resolve(..., plan=Plan.PRO)` | the workspace's plan (`collaborator` or `pro`); during a trial, the trial plan (Q1) |
| `app/features/workspace/capabilities.py:369-376, 428` | `Plan` enum; `_COLLABORATOR_PLAN` mask exists, never reached | unchanged; reached for Collaborator subscribers (re-drive PARITY §3's collaborator line) |
| `app/features/wage_calculator/service.py:907-923` (`on_trial`, `TODO(F16)` at 912) | "on trial" = a trial window exists and is not lifted; an expired trial reads as paid | `on_trial` = no active subscription; `ai_allowed` = `RUN_AI` and plan Pro and not on trial (Q3 for Collaborator) |
| `app/features/ai/models.py:61` (`AiWallet.seats`) | fixed 1 | written from the subscription's seats |
| `app/features/ai/meter.py:27` (`CREDITS_PER_SEAT=100`), `ai/service.py:171 refill_due` | monthly Celery refill for every workspace | per plan's `credits_per_seat`; refill timing per Q4 |
| `app/features/ai/routes.py:236`, app `src/pages/SettingsAiCredits.tsx:266-273` | packs listed; "Buy now" disabled, "Checkout arrives with billing" | `POST {ws}/billing/topup {pack}` → Checkout (payment mode); button live for whoever Q11 names |
| `app/features/platform/ai_economics.py:14`, `src/pages/PlatformAiEconomics.tsx:97` | manual grant stands in for sales | stays as a platform comp tool |
| `app/features/billing/models.py:83-85, 101, 118`; migration `b17d4e90c3a2:13, 85` | tier rules and override limits stored | enforced as §4.2 |
| `app/features/workspace/models.py:103, 109`; `app/features/auth/models.py:53` | tier stamped | read by the caps |
| `app/features/project/schemas.py:165`, `project/service.py:967` | no storage total | the tier's storage total at initiate time (D-27) |
| `app/features/platform/billing.py:72` | Stripe secrets shown as slots, never set | settings defined; presence shows "Set" |
| `src/pages/Signup.tsx:74-78` | reads `plan`, `cadence`, `seats` from marketing and ignores them | after signup, offer Checkout with them (Q12) |
| `src/features/workspace/capabilities.ts:29, 106, 111` | `canManageBilling` unused | gates the Billing page and Buy now |
| `STATUS.md:316, 328` | "No billing" | updated when F16 lands |

## 6. AI credits

- **Included allowance.**
  - D-236 8: seats × 100 credits a month, with no rollover.
  - The refill is scheduled today for every workspace, trials included. Legacy refilled only on Stripe events, so annual plans got 100 a year (a legacy defect).
  - F16 keeps a monthly refill for annual plans too (Q4), and sets Collaborator's per-seat credits (Q3).
- **Top-up.**
  - Packs from `ai_pack`:
    - D-236 9: $10/1,000, $25/2,500, $50/5,000, $100/10,000.
    - Legacy sold $2.50/250, $10/1,000 and $50/5,000 (Q10).
  - "Buy now" opens a payment-mode Checkout carrying the pack's `stripe_price_id`.
  - The webhook writes a `purchase` ledger row and `purchased` balance, once per session.
  - Purchased credits never expire and are spent after the included ones (D-236).
- **Usage reports.** Already built (F14: `usage.py`, the AI Credits page). F16 adds purchases to the ledger view.

## 7. Platform admin

- **Billing tiers** (built, F16a):
  - the secret slots become real settings;
  - Overrides gains "Comp plan" (Pro or Collaborator, seats, until a date), written as a `comp` subscription.
- **New: Subscriptions.** Per workspace: plan, seats, status, period, Stripe ids (link to the Stripe dashboard), and the last webhook events with errors.
- **AI economics** (built): pack Stripe price ids exist; nothing more.

## 8. Existing workspaces

No workspace has paid; every workspace is a tester's. On deploy:
- Every existing workspace gets no subscription, and keeps its trial window as stamped.
- Testers who should keep working get a comp subscription from the platform page.
- Expired testers' workspaces become view-only, as today.

No data comes from legacy (D-236 15 for credits; nothing else exists).

## 9. Build order (one session each)

1. **A. Catalog and subscription tables.**
   - `billing_plan` (seeded Collaborator and Pro at legacy prices), `workspace_subscription`, `stripe_event`; the Stripe settings in `app/config.py`.
   - The plan read: `dependencies.py:150` takes the plan from the subscription (none: trial plan per Q1).
   - Smoke: a comp Collaborator workspace loses takeoff editing.
2. **B. Stripe fake on the bench, Checkout and webhook.**
   - Checkout session, signed webhook, idempotent events, sync.
   - `trial_expired` and `on_trial` read the subscription; `workspace.plan.changed`.
   - Smoke: a fake checkout turns an expired trial into an editable Pro workspace in an open tab.
3. **C. Billing page and portal.**
   - Settings › Billing: plan, seats, status, period, "Manage billing" (portal), "Upgrade".
   - The trial button in the chrome; the locked dialog; channel 7.
4. **D. Seats.**
   - Seats from the subscription to `ai_wallet.seats`.
   - Refill per Q4.
   - The member-count rule per Q6, at invite and accept.
5. **E. Trial caps.** Projects, storage, measurements, PDF throttle for restricted tiers, with overrides; errors and the dialog.
6. **F. AI top-up.**
   - "Buy now", payment Checkout, the webhook credit, ledger rows.
   - Smoke: buy a pack on the fake and see the balance.
7. **G. Platform.**
   - Subscriptions list, comp plan, webhook event errors.
   - Then a full run restored from the fixture tag before any deploy to testers (CLAUDE.md).

## Questions for Umer

1. **Trial plan.** During a trial, is the workspace Pro (legacy defaulted every new workspace to Pro) or something else?
2. **Tier caps after paying.** Do a Tier 3 workspace's restrictions end when it subscribes (legacy cleared them on an active subscription), whatever its country?
3. **Collaborator and AI.** Legacy's plan page gives Collaborator 0 AI credits, but `credits_per_seat()` gave every plan 100 a seat, and the server never checked the plan. Does Collaborator get AI tools and credits (and Wage Calculator PDF/AI extraction)?
4. **Refill timing.** D-236 refills monthly on a schedule for every workspace. For a subscriber, should the refill follow the Stripe period (monthly invoices; annual plans still monthly by schedule)? And should trial workspaces keep getting a monthly refill?
5. **Failed payment and cancellation.** Legacy kept full access when `past_due` or canceled. Should `past_due` get a grace period (how many days) and then view-only? Should a cancellation take effect at the period end?
6. **Seats and members.** Legacy never compared seats with members. Must the number of members (all roles? only editing roles?) fit within seats, with invites refused above it? Do Collaborator-role members use a seat? (The role "Collaborator" and the plan "Collaborator" share a name.)
7. **Invoices.** Is the Stripe portal enough for invoices, or do you want them listed in the app?
8. **Refunds.** The pricing page says "30-day money-back guarantee" but the Terms say fees are non-refundable. Which holds?
9. **Measurements cap.** Legacy counted measurements per workspace and never decremented on delete. Keep that, or count live items?
10. **Pack prices.** D-236 9 sets $10/1,000 to $100/10,000; legacy sold $2.50/250, $10/1,000 and $50/5,000. D-236 stands unless you say otherwise. Confirm?
11. **Who buys.** Checkout for a plan: owner only (F3-S23 makes `canManageBilling` owner-only)? Top-ups: the owner only, or admins too (legacy showed the button to admins, and its server took owner or admin)?
12. **Signup from the price page.** Marketing passes plan, cadence and seats into signup. Should signup go straight to Checkout after the account is made, or start the trial and offer Checkout later?
13. **Annual seats.** Can seats change mid-year on an annual plan (prorated by Stripe), or only at renewal?
14. **Stripe API version.** Legacy read `subscription.current_period_start`, which newer API versions moved to the subscription items. Which API version is the account on?
15. **Abuse signals.** Legacy recorded `account_signals` (VPN masking, impossible travel, shared fingerprint) and let admins lock. Are these signals in F16, or is the stored VPN flag at signup enough?
16. **Tax.** Switch on Stripe Tax, or prices tax-inclusive with no tax lines?
