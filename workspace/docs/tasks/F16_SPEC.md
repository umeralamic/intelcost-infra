# F16: Billing, plans, trials

**Status:** adopted 2026-10-06 (D-277). Blocks A to D built (D-278, D-280 and D-281 record the calls Blocks B, C and D made; D-279 the bench's mail guard). The founder's answers to the draft's
sixteen questions are recorded in D-277 and applied below; the draft
([F16_SPEC_DRAFT.md](F16_SPEC_DRAFT.md)) is kept for its history.

**Sources.** Live legacy (`intelcost/` on `UmeralamDEV`): `supabase/functions/create-checkout-session`,
`stripe-webhook`, `create-topup-checkout`, `trial-gate`; `src/lib/billing/*`;
`src/hooks/usePermissions.ts`; the billing migrations. Decisions D-02, D-18, D-19, D-21, D-23,
D-27, D-29, D-233, D-236, D-261 5, D-267 5, D-277. Notes: `docs/flows.md` §7, PARITY §21 and §22,
`docs/tasks/ai_tools_tasks.md`, `docs/archive/platform_admin_tasks.md`,
`docs/archive/workspace_roles_tasks.md`. The current api and app code (file:line below, as of
2026-10-06, before Block A).

**Plan names (D-277 1, 25).** **Essentials** (`essentials`) is the annotations and comments plan:
annotations, comments and viewing, no measuring, no estimating, no AI. **Professional**
(`professional`; "Pro" is fine as a short form in UI copy) is everything. User-facing text calls
Essentials' drawing tools "Annotations". The Collaborator role is unrelated and keeps its name;
bid markups in the estimate keep theirs.

## 1. Scope

**In F16.**
- Two paid plans with a seat count and a cadence: Essentials and Professional, monthly or annual.
- Stripe Checkout for a plan, and a signed webhook that records the subscription.
- The customer portal for card, invoices, seats and cancellation (legacy had none). Invoices are
  the portal's only (Q7); the app lists none.
- The plan replaces the constant `Plan.PRO` in the capability chain (D-21: "F16 supplies a value rather than adding a stage").
- Trials, enforced on the server:
  - per-tier length;
  - the mid-trial caps of restricted tiers;
  - view-only on expiry;
  - a paid subscription ends the trial and the tier caps, whatever the country (Q2).
- Seats set the AI allowance (D-236 8) and the member count (Q6).
- AI credit top-ups: "Buy now" through Checkout, and the webhook crediting packs.
- Upgrade surfaces (all built, Block C):
  - a trial button in the app chrome;
  - the locked-workspace dialog;
  - a Billing page under Settings.
- Realtime channels 6 (`workspace.plan.changed`) and 7 (`workspace.trial.changed`). **Both built** (Blocks B and C).
- The platform admin additions billing needs (subscriptions list, manual comp).

**Not in F16.**
- Marketing's price page. It mirrors prices only; the app and Stripe are the authority (D-02).
  It names Essentials and Professional and sends `plan=essentials|professional` (the app also
  reads legacy's codes).
- Per-workspace tiering for a second workspace (D-18 keeps inheritance; a change needs its own D-NN).
- **Tax (Q16).** No tax collection at launch; Stripe Tax off. No price anywhere mentions tax (no
  "including" or "excluding" wording). Checkout still collects the billing country and state.
- Abuse signals beyond the VPN flag stored at signup (Q15); later.
- Any data migration from legacy billing (testers only, nobody has paid).

## 2. Data model (house conventions: bigint id + uuid, `workspace_id`, created_by/updated_by)

| Table | Purpose | Key columns |
|---|---|---|
| `billing_plan` | The catalog (editing it on the platform is Block G) | `code` (essentials, professional), name, `monthly_usd`, `annual_usd`, `seat_monthly_usd`, `seat_annual_usd`, `credits_per_seat`, `stripe_price_*` (4 ids), `active` |
| `workspace.stripe_customer_id` | The workspace's Stripe customer, made by the first Checkout and reused (D-278 3) | unique, nullable |
| `user.signup_plan`, `signup_cadence`, `signup_seats` | The price page's choice kept at signup (Q12), beside the D-18 signup columns | nullable |
| `workspace_subscription` | One row per workspace, written only by the webhook (and platform comp) | `plan_code`, `cadence`, `seats`, `status` (trialing, active, past_due, canceled, unpaid, comp), `stripe_customer_id`, `stripe_subscription_id`, `current_period_start/end`, `cancel_at_period_end`, `canceled_at`, `grace_until` |
| `stripe_event` | Idempotency and audit of webhook events | `stripe_event_id` (unique), type, `received_at`, `processed_at`, `error` |

No `billing_invoice` table: invoices are the portal's (Q7).

**Seeded catalog** (legacy `src/lib/billing/plans.ts`; a seat costs the plan's price at the same
cadence, as legacy billed plan price × seats):

| Code | Name | Monthly | Annual | Seat monthly | Seat annual | Credits per seat |
|---|---|---:|---:|---:|---:|---:|
| `essentials` | Essentials | $9.99 | $99.99 | $9.99 | $99.99 | 0 (Q3) |
| `professional` | Professional | $29.99 | $299.99 | $29.99 | $299.99 | 100 (D-236 8) |

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
- **Who takes a seat (Q6, amended):** any member whose role can edit takeoff or pricing. View-only
  members and members limited to annotations and comments are free.

## 3. Stripe

1. **Checkout (plan).**
   - Route: `POST {ws}/billing/checkout` `{plan, cadence, seats}`.
   - Caller: **the owner only** (`canManageBilling`, Q11).
   - The api creates a subscription-mode session:
     - Line items follow legacy: the base price × 1, plus the seat add-on price × (seats − 1) when an add-on price exists; otherwise the base × seats.
     - `client_reference_id` = workspace uuid; metadata carries plan, cadence and seats.
     - It reuses the workspace's Stripe customer (`workspace.stripe_customer_id`), made by the first Checkout. Legacy made a new one each time.
     - It refuses (409, `code: "manage_billing"`) while a subscription is running, so the app can send the owner to Manage billing. A canceled subscription or a comp does not block it. Legacy had no guard.
     - Stripe Tax off; billing address collection on (country and state, Q16).
   - Success and cancel return to `/settings/billing?checkout=success|cancelled` (a minimal landing in Block B; the page is Block C's).
   - **Built, Block B.**
2. **Webhook. Built, Block B** (D-278 6, 7).
   - Route: `POST /api/stripe/webhook`, unauthenticated, verified with the signing secret and a 5-minute tolerance.
   - Each event id is stored once (`stripe_event`). A repeat is a 200 no-op.
   - Events:
     - `checkout.session.completed`: subscription (sync). A payment-mode session (an AI top-up) is recorded and left alone until Block F credits the pack once per session.
     - `customer.subscription.created`, `.updated`, `.deleted`: sync.
     - `invoice.paid`: re-syncs the subscription. The allowance refill at the period start (Q4) is Block D's.
     - `invoice.payment_failed`: mark `past_due` and stamp `grace_until` = now + 7 days (Q5).
   - The sync re-reads the subscription from Stripe rather than trusting the payload.
   - **Period dates come from the subscription items** (`items.data[].current_period_start/end`),
     not the subscription's top level, so the code works on newer API versions (Q14). The
     founder confirms the account's API version.
   - After the commit it publishes `workspace.plan.changed` (D-20).
3. **Customer portal. Built, Block C.**
   - Route: `POST {ws}/billing/portal`, owner only; returns to `/settings/billing`.
   - Returns a portal session URL for card, invoices, seat quantity, plan switch and cancellation.
   - Seat changes made in the portal arrive as `subscription.updated`.
   - **Annual seats (Q13):** adding seats mid-year is allowed, prorated by Stripe; removing seats
     takes effect at renewal (the portal's seat decrease scheduled to the period end). That rule
     lives in the Stripe portal configuration, not in our code: the api opens the configuration
     named by `STRIPE_PORTAL_CONFIGURATION` (or the account's default), and whoever sets up the
     account turns on "schedule downgrades at period end" there (D-280 5). The bench fake applies
     every change at once.
   - **Cancellation (Q5)** takes effect at the end of the paid period (`cancel_at_period_end`).
4. **No refunds (Q8, replaced).** Fees are non-refundable, as the Terms say.
5. **Bench. Built, Block B (D-278 2).** The Stripe fake is `intelcost-infra/fakes/stripe/server.py` (service `stripe-fake`, port 12111), and the bench api points `STRIPE_API_BASE` at it with a test key, the bench signing secret and `price_bench_*` ids. Production keeps the default base and sets the real key, signing secret and price ids; the products, prices and the webhook endpoint in Stripe are Abdullah's (`flows.md` §7).

## 4. Trials and the plan read

1. **Length.** Trial length is per tier (`billing_tier_rule.trial_days`; seeded 14, 7 and 5), stamped on the workspace at creation (D-18). Extra days come from the override.
2. **Trial plan (Q1).** A workspace on trial is Professional.
3. **The plan read (built, Block A; D-277 18).**

   | Subscription | Plan | View-only |
   |---|---|---|
   | `active`; `comp` before its end date (or with none); `past_due` within `grace_until`; `canceled` before `current_period_end` (Block B) | its plan | never (unless locked) |
   | none, or `trialing` | Professional | when the trial window has closed |
   | `canceled` past its period end, `unpaid`, `past_due` past its grace, `comp` past its end | (Professional, masked) | always |

   The platform's Lock makes a workspace view-only whatever its subscription.
4. **Lapse (Q5).** `past_due` has 7 days' grace, then view-only. A cancellation ends at the period
   end, then view-only. Data is never deleted on lapse.
5. **Mid-trial caps (restricted tiers only, seeded Tier 3).** They end when the workspace subscribes (Q2).

   | Cap | Limit | Enforced | Error |
   |---|---|---|---|
   | Projects | 1 | `project/service.py:365 create_project` | "Your trial allows 1 project…" |
   | Storage | 500 MB | the upload reserve, `project/service.py:967` (D-27) | |
   | Measurements | 1,000 | item create in the takeoff service | Counts **live items** (Q9): a deleted item frees its place |
   | AI credits | 30 | already enforced (`ai/service.py:392`); off for a subscriber (Block A) | |
   | PDF throttle | 1,200 ms | a render delay in the app, read from the context | |

   An override replaces a cap; "lift all restrictions" removes them all.
6. **Expiry.**
   - The trial mask (`capabilities.py`) makes an expired, lapsed or locked workspace view-only, on the server.
   - A workspace with a subscription in `active` (or `comp`) is never on trial and never expired; `trial_expired` checks the subscription first (built, Block A).
7. **Visible in the app. Built, Block C.**
   - A trial button in the chrome (the app header and the takeoff header): "N days left" when 3 or
     fewer days remain, "Trial ended" after expiry; the owner goes to Billing, anyone else is told
     to ask the owner.
   - The locked dialog on any write refused because the workspace is view-only (code
     `workspace_locked`): what happened, Billing for the owner, "Ask the workspace owner" for others.
   - Channel 7, `workspace.trial.changed`: a trial starts (workspace created), is extended or
     changed on Billing tiers, ends (a one-minute sweep), or is cleared by a subscription; open tabs
     re-read permissions and Billing. The sweep also publishes `workspace.plan.changed` when a
     payment's grace or a canceled subscription's paid period runs out.

## 5. Plan checks replacing each F16 marker

Line numbers as of 2026-10-06, after Block C.

| Where | Before F16 | F16 |
|---|---|---|
| `app/core/dependencies.py:179` (`plan=self.plan`), `:191` `plan`, `:209` `view_only_reason`, `:235` `trial_expired`, `:256` `require_capability` | `resolve(..., plan=Plan.PRO)` | the workspace's plan from its subscription, Professional on trial (Q1); the view-only reason; a write refused only for it answers code `workspace_locked`. **Built, Blocks A to C** |
| `app/features/workspace/capabilities.py:369` `Plan`, `:378` `AI_PLAN_LOCKED`, `:393` `_ESSENTIALS_PLAN`, `:436` `apply_plan_mask` | `Plan` enum; legacy's lighter-plan mask, never reached | `Plan.ESSENTIALS` / `Plan.PROFESSIONAL`; the Essentials mask keeps administration and billing (D-277 19). **Built, Block A** |
| `app/features/wage_calculator/service.py:922` `on_trial`, `:938` `ai_allowed`, `:948` `ai_refusal` | "on trial" = a trial window exists and is not lifted | a subscription in force is never on trial; `ai_allowed` = `RUN_AI` and Professional and not on trial (Q3). **Built, Block A** |
| `app/features/ai/models.py:60` (`AiWallet.seats`) | fixed 1 | written from the subscription's seats by the webhook and comp (`billing/service.py` `_follow`, `platform/billing.py`). **Built, Block D** |
| `app/features/ai/allowance.py` (new; replaced `meter.CREDITS_PER_SEAT` and `ai/service.py` `refill_due`) | monthly Celery refill for every workspace | per plan's `credits_per_seat` (Essentials 0); monthly subscribers on `invoice.paid`, annual and comp on the anniversary day, a trial once at creation (Q4). **Built, Block D** |
| `app/features/ai/service.py:392` `trial_cap` | Tier 3's 30 credits while the trial runs | off for a subscriber (Q2). **Built, Block A** |
| `app/features/ai/routes.py:235` (`/packs`), app `src/pages/SettingsAiCredits.tsx:267` | packs listed; "Buy now" disabled, "Checkout arrives with billing" | `POST {ws}/billing/topup {pack}` → Checkout (payment mode); live for the owner and admins (Q11). Block F |
| `app/features/platform/ai_economics.py:471` `grant`, app `src/pages/PlatformAiEconomics.tsx:492` | manual grant stands in for sales | stays as a platform comp tool |
| `app/features/billing/models.py:82` `BillingTierRule`, `:119` `WorkspaceLimitOverride`; migration `b17d4e90c3a2` | tier rules and override limits stored | enforced as §4.5. Block E |
| `app/features/workspace/models.py:105, 113`; `app/features/auth/models.py:58` | tier and trial stamped | read by the caps (Block E) and the plan read |
| `app/features/project/schemas.py:165`, `project/service.py:967` | no storage total | the tier's storage total at initiate time (D-27). Block E |
| `app/features/platform/billing.py:66` (`SECRET_SLOTS`) | Stripe secrets shown as slots, never set | settings defined; presence shows "Set". **Built, Block A** |
| app `src/pages/Signup.tsx:78` | reads `plan`, `cadence`, `seats` from marketing and ignores them | kept on the user (`signup_*`) and pre-filled on the Billing page's cards (Q12). **Built, Blocks B and C** |
| app `src/features/workspace/capabilities.ts:29, 106, 111` | `canManageBilling` unused | gates Start subscription and Manage billing (owner only); the Billing tab is drawn for `canManageWorkspace` (owner and admins, read-only for admins). **Built, Block C**; top-up for owner and admins (Q11) in Block F |
| `STATUS.md` (api, app) | "No billing" | "F16 Blocks A to D built" |

## 6. AI credits

- **Professional only (Q3).** AI tools, AI credits and PDF or AI wage determination extraction are
  on Professional (and on trial, which is Professional). On Essentials they are locked with "AI
  tools are on the Professional plan." Text-file wage determination autofill has no plan check
  (on Essentials the Wage Calculator itself needs "Edit estimates", D-277 20).
- **Included allowance (Q4). Built, Block D (D-281, `ai/allowance.py`).**
  - Seats × the plan's `credits_per_seat` (Professional 100, Essentials 0), no rollover;
    `ai_wallet.seats` follows the subscription (webhook and comp only).
  - A monthly subscriber refills at each billing period start (`invoice.paid`, and when the
    subscription first comes into force); an annual subscriber or a comp monthly on the
    anniversary day, by the hourly task. Each refill once per period.
  - A trial gets a one-time allowance when the workspace is made (100, or the restricted tier's
    30) and no refill; no subscription and no running trial, none.
  - On Essentials the chip and the AI Credits page say "AI tools are on the Professional plan."
  - Existing balances were kept; the rules apply from the next refill point.
- **Top-up.**
  - Packs from `ai_pack`, as D-236 9 (Q10): $10/1,000, $25/2,500, $50/5,000, $100/10,000.
  - "Buy now" (owner and admins, Q11) opens a payment-mode Checkout carrying the pack's `stripe_price_id`.
  - The webhook writes a `purchase` ledger row and `purchased` balance, once per session.
  - Purchased credits never expire and are spent after the included ones (D-236).
- **Usage reports.** Already built (F14: `usage.py`, the AI Credits page). F16 adds purchases to the ledger view.

## 7. Platform admin

- **Billing tiers** (built, F16a):
  - the secret slots are real settings (Block A);
  - Overrides gains "Comp plan" (Essentials or Professional, seats, an optional end date), written as a `comp` subscription (Block A).
- **New: Subscriptions.** Per workspace: plan, seats, status, period, Stripe ids (link to the Stripe dashboard), and the last webhook events with errors.
- **AI economics** (built): pack Stripe price ids exist; nothing more.

## 8. Existing workspaces

No workspace has paid; every workspace is a tester's. On deploy:
- Every existing workspace gets no subscription, and keeps its trial window as stamped.
- Testers who should keep working get a comp subscription from the platform page.
- Expired testers' workspaces become view-only, as today.

No data comes from legacy (D-236 15 for credits; nothing else exists).

## 9. Seats and members (Q6). Built, Block D (D-281)

- A seat is a member whose role (override or custom role included) can edit takeoff or
  pricing: owner, admin, estimator, takeoff, pricing. View-only members and members limited to
  annotations and comments (viewer, collaborator, the QA roles) use none. One function,
  `billing/seats.py` `uses_seat`.
- The limit is the subscription's seats while it is in force; a trial has no limit.
- Refused (409, `seats_full`) when one more seat would pass the limit: an invite for a
  seat-using role, its acceptance, a role change onto one, a seat-using custom role. "All N
  seats are in use. Add a seat in Billing or change a member's role." The owner gets a Billing
  link, anyone else "Ask the workspace owner". An ownership transfer is never refused.
- Seats below use remove nobody: a banner for the owner and admins on Members and Billing, and
  adding seat-using members stays refused until use fits. Members shows "Seats: U of S in use"
  (or "no limit during trial") and marks each member using a seat.

## 10. Signup from the price page (Q12)

Signup always starts the trial. The plan, cadence and seats passed in are kept on the user
(`signup_plan`, `signup_cadence`, `signup_seats`; built, Block B), and the app offers Checkout
later (the Billing page and the trial button), pre-filled with them (Block C).

## 11. Build order (one session each)

1. **A. Catalog and subscription tables.** *Built 2026-10-06.*
   - `billing_plan` (seeded Essentials and Professional at legacy prices), `workspace_subscription`, `stripe_event`; the Stripe settings in `app/config.py`.
   - The plan read: `dependencies.py` takes the plan from the subscription (none: Professional on trial, Q1); `trial_expired` and `on_trial` read the subscription first.
   - AI gated to Professional (Q3); the comp plan on Billing tiers.
   - Smoke: a comp Essentials workspace loses takeoff editing and AI.
2. **B. Stripe fake on the bench, Checkout and webhook.** *Built 2026-10-06 (D-278).*
   - Checkout session, signed webhook, idempotent events, sync (period dates from the items, Q14).
   - `past_due` grace stamping; `workspace.plan.changed`.
   - Smoke: a fake checkout turns an expired trial into an editable Professional workspace in an open tab.
3. **C. Billing page and portal.** *Built 2026-10-06 (D-280).*
   - Settings › Billing: plan, cadence, seats, status, period; on trial or ended the two plan cards (prices from `billing_plan`, monthly or annual, seats) and "Start subscription"; subscribed, "Manage billing" (portal). The owner acts, admins read, nobody else sees it.
   - The trial button in the chrome; the locked dialog; channel 7; Checkout pre-filled with the signup choice (Q12).
4. **D. Seats.** *Built 2026-10-06 (D-281).*
   - Seats from the subscription to `ai_wallet.seats`.
   - Refill per Q4.
   - The seat rule per Q6 (§9), at invite, accept and role change.
5. **E. Trial caps.** Projects, storage, measurements (live items), PDF throttle for restricted tiers, with overrides; errors and the dialog.
6. **F. AI top-up.**
   - "Buy now", payment Checkout, the webhook credit, ledger rows.
   - Smoke: buy a pack on the fake and see the balance.
7. **G. Platform.**
   - Subscriptions list, webhook event errors.
   - `billing_plan` editable on the platform (prices, credits per seat, Stripe price ids).
   - Then a full run restored from the fixture tag before any deploy to testers (CLAUDE.md).
