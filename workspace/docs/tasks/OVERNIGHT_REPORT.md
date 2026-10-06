# Overnight report, 2026-10-06 to 2026-10-07

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after each part. Times are UTC.

| Part | State |
|---|---|
| 1. Block F: AI credit top-ups | done 22:57 |
| 2. Block G: platform billing pages | in progress |
| 3. F16 end-to-end check | not started |
| 4. Go-live checklist | not started |
| 5. Auto Count accuracy and speed | not started |
| 6. Marketing prices from the catalog | not started |
| 7. Old arcs refit | not started |
| 8. Old-migration lint | not started |
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
