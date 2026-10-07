# Overnight report, 2026-10-06 to 2026-10-07

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after each part. Times are UTC.

| Part | State |
|---|---|
| 1. Block F: AI credit top-ups | done 22:57 |
| 2. Block G: platform billing pages | done 23:16 |
| 3. F16 end-to-end check | done 23:29 |
| 4. Go-live checklist | done 23:35 |
| 5. Auto Count accuracy and speed | not started (moved after 6 to 8, see the plan) |
| 6. Marketing prices from the catalog | done 23:40 |
| 7. Old arcs refit | done 23:47 |
| 8. Old-migration lint | done 23:55 |
| 9. Parity gap report | not started |

## Part 1. Block F: AI credit top-ups (D-283)

**Built.** `POST {ws}/billing/topup {pack}` opens a payment-mode Checkout for one pack (the
pack's `stripe_price_id`, else `STRIPE_PRICE_PACK_<credits>`), reusing the workspace's Stripe
customer, billing address collected, no tax wording. The webhook credits a paid top-up session
once (`ai_ledger.stripe_session_id` unique; buyer and pack kept). Settings › AI Credits: Buy now
live for the owner and admins on Professional with a subscription in force, off with its reason
otherwise; a result line on return; a Purchases list (date, pack, credits, who bought). The
bench fake completes payment-mode sessions.

**Commits:** api `8a62a03`, app `e817cdf`, infra `01d077d`.

**Smoke** (throwaways, mail guard on, 0 sent):

| # | Result |
|---|---|
| 1 | PASS: the owner clicked Buy now ($10), the fake's Pay, back on AI Credits with "Payment received…"; purchased +1,000; one purchase row by "Pack Owner"; a replayed webhook ("duplicate") and a second completion added nothing |
| 2 | PASS: the admin bought $25 (+2,500, row by the admin); the estimator's page says to ask the workspace owner with no Buy now; the api refuses them (`topup_role`) |
| 3 | PASS: 50 included and 3,500 purchased; a 60-credit charge left 0 and 3,490 (ledger −50 / −10) |
| 4 | PASS: trial: 4 of 4 Buy now disabled, "Subscribe to Professional to buy more credits. Go to Billing"; api 403 `topup_subscribe` |
| 5 | PASS: Essentials: the plan message, no Buy now; api 403 `topup_plan` |
| 6 | PASS: lapsed (period end moved into the past): AI refused (`workspace_locked`), purchased 3,490 kept, top-up refused; resubscribed through the fake: a charge with no included credits took 5 from purchased |

**How lines 3 and 6 were driven.** The bench's AI tools are wired to the real providers (keys in
`.env.ai`), so I did not make a real 60-credit model call. Lines 3 and 6 call the service's own
`_hold` and `_close` (the exact hold and settle every AI call goes through) inside the api
container, and `require_ai` for the refusal; only the provider call is skipped.

**Decisions I made:**
- A lapsed Professional workspace's AI refusal stays the view-only refusal (`workspace_locked`,
  the locked dialog), not "AI tools are on the Professional plan.": the plan message would be
  wrong for a workspace that is on Professional but unpaid. Top-up there says to subscribe.
- Four `STRIPE_PRICE_PACK_*` settings as the fallback for empty pack price ids, the same rule as
  the plan prices.
- `checkout.session.async_payment_succeeded` credits too, for delayed payment methods; the
  session id keeps it to once.
- Members who are not admins see "To buy more, ask the workspace owner." on AI Credits.

**F16_SPEC.md:** Block F marked built; §5 and §6 updated.

## Part 2. Block G: platform billing pages (D-284)

**Built.** Platform › Subscriptions (`/platform/subscriptions`, Developer menu), platform admins
only, three tabs:
- **Subscriptions:** every subscription and comp, with plan and cadence, seats and seats in use,
  status, period, grace or cancel date, and Stripe ids linked to the dashboard (test or live by
  the key). Filters by status and plan, search by workspace or owner email, 50 a page. Comps can
  be made, edited and ended here.
- **Webhook events:** the stored events, errors only on request, with Retry for an errored one.
  Retry runs from the event's kept body (new `stripe_event.payload`) through the webhook's own
  path.
- **Plans:** the catalog editor (validated), with the "new Checkouts only" note.

**Commits:** api `b48efbb`, app `ef2a13e`, infra `ca5b47b`.

**Smoke** (throwaways, mail guard on, 0 sent):

| # | Result |
|---|---|
| 1 | PASS: two subscribed (Professional monthly, Essentials annual) and one comp listed with the right plan, cadence, seats in use and status; the status and plan filters and the search by workspace and by owner email work on screen and api; Stripe links in test mode |
| 2 | PASS: the fake hid a subscription and changed its seats: the webhook failed (500, "No such subscription." kept on the event, seats unchanged); unhidden, **Retry on screen** processed it: seats 3, +100 credits once; a second Retry answered "already processed", nothing doubled |
| 3 | PASS: Professional's monthly price set to $41 with Stripe price id `…_v2` on screen ("Saved. New prices apply to new Checkouts only…"); a new Checkout carried the v2 price; the existing subscription kept its old price; restored afterwards |
| 4 | PASS: Essentials credits per seat 100 refused on screen and api (422, "…stays 0") |
| 5 | PASS: a comp made on screen (Professional, 2 seats: 200 credits), edited to 4 seats (+200 "Seats added", period kept), ended (trial still running: editable again); a second workspace whose trial was over went view-only (`trial_ended`) when its comp ended |
| 6 | PASS: a non-admin gets "Page not found" at `/platform/subscriptions` and 403 on all seven routes |

**Fixed along the way:**
- Editing a running comp restarted its period, so every edit refilled the month's allowance. It
  now keeps the period, and added seats bring only their own credits.
- The plan cards remounted after a save and lost the saved message; they are keyed by plan code
  now.

**Decisions I made:**
- **Prices reach Checkout only through Stripe price ids.** Checkout sends price ids, never
  amounts. So "a new Checkout sends the new amount" means a new Checkout carries the new price
  id. In real Stripe that id holds the new amount; the fake has no price objects. The editor
  warns when a price changed but its price id did not.
- The dashboard link is test mode unless the key is `sk_live_` or `rk_live_`.
- Events received before Block G have no stored body and say "resend it from the Stripe dashboard".
- One page with three tabs, rather than three pages.

**Question for you:** should saving a price in the catalog create the new Stripe price itself? I
did not: Stripe stays the authority for what is charged (D-02), and Abdullah creates the prices
(Part 4's checklist covers it).

## Part 3. F16 end-to-end check

One throwaway account through the whole billing life in a real browser (bench app, marketing
site, Stripe fake; mail guard on, 0 sent, 7 captured), in four browser phases with bench steps
between them (moving the tier, moving a period end into the past, the fake's payment controls).

| Step | Result |
|---|---|
| Price page: Yearly, Professional, 3 seats, the CTA | PASS: `signup?plan=professional&cadence=annual&seats=3`; signup reads "Starting on Professional, billed annual, 3 seats."; signed up and named the workspace |
| Trial | PASS: Professional, "Trial, 14 days left", 100 credits, "a one-time allowance; no monthly refill" |
| Restricted-tier caps on a second workspace | PASS: Billing lists the four caps as used of limit; a second project refused with the trial cap dialog and Go to Billing |
| Billing pre-filled | PASS: Annual pressed, 3 seats, Professional chosen |
| Checkout | PASS: Start subscription, the fake's Pay, back on Billing: active, annual, 3 seats |
| Seats up in the portal | PASS: Manage billing, the portal to 4 seats; credits 300 -> 400 at once |
| Invite past seats refused | PASS: with 4 of 4 in use, an invite says "All 4 seats are in use. Add a seat in Billing…" with a Billing link |
| Buy a credit pack | PASS: $10 pack through the fake: 1,400 credits |
| Payment failed (grace) | PASS: "Payment failed. Access continues until October 13, 2026." |
| Recovered | PASS: "Active" |
| Cancel at period end | PASS: "Cancels on October 6, 2027" |
| Lapsed: view-only, the locked dialog | PASS **after a fix** (below): the dashboard says the workspace is view-only, the chrome button reads "Subscription ended", a write opens the locked dialog, Go to Billing reads ended |
| Resubscribe | PASS: plan card, Pay, active; a project can be created again |
| Essentials workspace | PASS: capabilities are administration, comments, annotations and uploads only; no takeoff, pricing or AI; the chip reads "AI on Professional"; AI credits `can_run` false |

**Bug found and fixed** (its own commit, app `67f3172`):
- A workspace whose **subscription ended** (or whose payment grace passed) had no way to Billing
  outside Settings: the chrome button only knew "Trial ended". It now reads "Subscription ended"
  or "Payment overdue".
- The dashboard's disabled New project said **"Your role cannot create projects."** on a
  view-only workspace, which blames the role. It now says "This workspace is view-only. Billing
  has the details."

**Not a fix, noted:** the locked dialog appears on a *refused write*. On a view-only workspace
most write controls are already disabled, so it is mostly reached through the chrome button and
Billing rather than the dialog. I drove the write through the app's own api client to show the
dialog.

**Questions for you:**
1. **Wage Calculator on Essentials.** Project Home still shows the Wage Calculator button on
   Essentials, and the page opens with its inputs. Edits are refused by the api (D-277 point 20:
   no "Edit estimates"). Should the button and page be hidden on Essentials, or show the plan
   message, rather than open read-only?
2. **Estimating button on Essentials.** Project Home shows it too (I did not open it). Same
   question.

## Part 4. Go-live checklist

[F16_GO_LIVE.md](F16_GO_LIVE.md), for Abdullah, in order:
1. Products and prices: eight plan prices (base and seat, monthly and annual, per plan) and the
   four one-time packs.
2. Price ids into the catalog (Plans tab) and the pack table, with the settings as fallback.
3. The key and signing secret, with `STRIPE_API_BASE` left unset and `APP_URL`.
4. The webhook endpoint `https://api.intelcost.io/api/stripe/webhook` and its exact seven events.
5. The customer portal, including "schedule downgrades at period end" (Q13), then
   `STRIPE_PORTAL_CONFIGURATION`.
6. Stripe Tax off.
7. The API version, with blanks for him to record it (Q14).
8. The mail guard off in staging and production.
9. A test-mode run with test cards before live keys.
10. Comps for testers.

**Commit:** infra `11bc602` (the workspace mirror; the document lives at the workspace root like
every task file).

**Decision I made:** the checklist tells Abdullah to allow portal quantity changes on the **seat**
prices only. The base price stays at 1, because Checkout bills the base once plus seats − 1 at the
seat price (Block B's Checkout). If the portal let the base quantity change, the seat
count the api reads would still be right (it sums both items), but the price per seat would not
be.

## Part 6. Marketing prices from the plan catalog (D-285)

**Built:**
- **The route:** `GET /api/public/plans` (anonymous) returns the active plans' code, name and
  four prices only. It is cached 60 s, and saving a plan on the platform clears the cache. Each
  client address is limited to 120 requests a minute.
- **The site:** the marketing pricing page and the home page read the route on the server at
  build time and on revalidation (`PLANS_REVALIDATE_SECONDS`, default 300). That covers the
  cards, "Plans from $…", the page descriptions and the Product JSON-LD.
- **When the api is down:** the first build falls back to the prices written in
  `config/plans.ts`. During a revalidation the site keeps serving its last built page.

**Commits:** api `c085e56`, marketing `586221d`, infra `ad8b7e9` (the bench marketing service
gets `INTELCOST_API_URL`).

**Smoke** (a production build of the site in a throwaway container, revalidating every 15 s):

| # | Result |
|---|---|
| 1 | PASS: Professional monthly changed $29.99 → $31.49 through the catalog editor's route; after the window `/pricing` and `/` both show $31.49 |
| 2 | PASS: api stopped, past the window: both pages still answer 200 with $31.49 |
| 3 | PASS: price restored to $29.99; the page shows it again |

The price change in line 1 went through the editor's own api route (`PUT
/api/platform/billing/plans/professional`), not by clicking the editor. The editor itself was
clicked in Part 2's line 3.

**Decisions I made:**
- The card's total for several seats is now the first-seat price plus the seat price for each
  further seat, as Checkout bills it. It used to be price × seats; the two are equal while the
  prices are equal.
- A plan switched off sale in the catalog drops off the price page.
- The plan words (descriptions, highlights) stay in the marketing repo; only the name and the
  prices come from the catalog.

**Left behind:** the throwaway production container `ovn-mkt` (port 3100) and its volume
`ovn-mkt-next`. My commands to remove them were denied by the permission settings. To remove:
`docker stop ovn-mkt && docker rm ovn-mkt && docker volume rm ovn-mkt-next`. Neither touches the
bench's own marketing service or its volumes.

## Part 7. Old arcs refit (D-275 amended, point 6)

**Built.** Migration `d8e2c4a6f1b3` refits the drawing parameters of every legacy takeoff arc
(whole arcs and inline arcs on runs and areas) to `{cx, cy, rx, ry, a0, sweep}`. The new
parameters describe the true-feet circle through the three points the arc's quantity is already
measured from (start, middle of its stored sweep, end), using the same fit as new arcs
(`quantity.refit_legacy_arc`).
- The points (`vertices_json`) are not touched.
- No quantity can move, and the migration checks it per shape and stops if one would.
- Idempotent.
- Annotation arcs (sheet markups) are left as they are.

**Commits:** api `5f8eecc`, infra `18510ff`.

**Smoke:**

| Check | Result |
|---|---|
| Throwaway old-style arc on a 2448 × 1584 page (legacy one-`r` fit, 1/8" scale) | PASS: after the migration the drawn arc is a circle in feet, passes through its three points, starts and ends exactly on them; 83.864916 LF before, 83.864916 stored and re-measured after |
| Second run | PASS: refits nothing |
| Hidden Valley Spec "LF 7" | refitted (drawing only): 38.941519 LF before and after. Before `cx 0.52196, cy 0.17422, r 0.09945, a0 −1.79026, sweep 1.52589`; after `cx 0.52564, cy 0.23742, rx 0.10981, ry 0.16471, a0 −1.80358, sweep 1.23137` |

The bench had one legacy arc (LF 7) besides the throwaway; no inline legacy arcs.

**Decision I made:** "three stored points" is read as the three points D-275 already measures a
legacy arc from (start, the middle of its stored sweep, end), not the arc's original clicks.
Using these is what guarantees no quantity moves. The original clicks were never stored; the
vertices hold 49 samples of the old page-space path.

## Part 8. Old-migration lint

**Done.** Twenty-two older Alembic migrations cleaned with formatting-only changes: import order,
line wrapping and quote style. One docstring's first line was shortened by a word (the
migration's description, not an operation).

Ruff now gates the whole api repo again: `ruff check .` and `ruff format --check .`, plus
`mypy app`. The bench api container now mounts the repo's `pyproject.toml`; it used the copy
built into the image. That `pyproject.toml` excludes `drives` and `wagecalc-seed`, which are
mounted from the infra repo and are not api code. The api's STATUS and my memory note carry the
new gate command.

**Commits:** api `0bc0fd9`, infra `55b392a`.

**Checks:**
- **Code unchanged:** every changed migration has the same syntax tree as before, with imports
  compared as a set and the docstring aside: 22 of 22 identical.
- **Schema unchanged:** `alembic upgrade head` on a fresh throwaway database, before and after,
  gives identical schema dumps (0 diff lines). The dump also matched the bench's own schema
  exactly, and the seeded row counts are the same (tier rules, country tiers, AI prices, plans,
  packs).
- **Cleanup:** the throwaway databases were dropped.
