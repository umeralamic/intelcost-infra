# Overnight plan, 2026-10-06 22:40 UTC to 2026-10-07 11:30 UTC

Brief: the founder's overnight brief (F16 Blocks F and G, the F16 end-to-end check, the go-live
checklist, Auto Count accuracy and speed, marketing prices from the catalog, old arcs refit,
old-migration lint, the parity gap report). Report: [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md),
updated after each part.

## Rules held for every part

- Each part is finished, gated (ruff + mypy; lint + typecheck + build; the quantity table),
  smoke-checked with throwaway accounts on the bench, committed and pushed on `umer-dev` before
  the next starts. Nothing half-built is committed; at 11:30 UTC a part in progress is stashed as
  `overnight-<part>-unfinished`.
- The mail guard (D-279) is on for every smoke; smoke scripts and throwaway data are deleted.
- Wording: Essentials and Professional; Essentials is "annotations and comments"; no tax, refund
  or money-back wording.
- The founder's data is read only: Hidden Valley Spec, and in Bench Construction Test the projects
  Waxing City and Hidden Valley Spec Building Rebid. Tests run on throwaway copies.
- Unclear points: the option that matches F16_SPEC.md and DECISIONS.md, recorded in the report.

## Order and rough budget

| # | Part | Budget | Start not later than |
|---|---|---|---|
| 1 | Block F: AI credit top-ups (rules entry, topup route, webhook credit, AI Credits page, spend order, fake, docs, 6-line smoke) | 2 h | 22:45 |
| 2 | Block G: platform Subscriptions, webhook events with Retry, plan catalog editor, comp tools (6-line smoke) | 2 h | 00:45 |
| 3 | F16 end-to-end pass; clear bugs fixed as their own commits | 1 h | 02:45 |
| 4 | F16_GO_LIVE.md for Abdullah (documents only) | 0.5 h | 03:45 |
| 6 | Marketing prices from the catalog (public route, market-next ISR) | 1 h | 04:15 |
| 7 | Old arcs refit migration (D-275 follow-up) | 0.75 h | 05:15 |
| 8 | Old-migration lint and the whole-repo ruff gate | 0.5 h | 06:00 |
| 5 | Auto Count accuracy and speed (time-boxed 3.5 h of new steps) | 3.5 h | 06:30 |
| 9 | PARITY_GAPS.md (documents only) | 1 h | 10:15 |
| — | Final report | 0.25 h | 11:15 |

Part 5 is moved after the short parts 6 to 8 so they are not starved by its time-box; it is
the open-ended one. Part 9 is documents only and goes last because it can be cut down cleanly
(the ranked list first, detail after) if time runs short.

## Part notes

- **1.** Rules per D-236 9 and Q11, Q3: owner and admins buy, only with a Professional
  subscription in force; purchased credits never expire, are spent after included, and are
  unusable off Professional (lapsed or Essentials). Checkout in payment mode with the pack's
  `stripe_price_id` (or a `STRIPE_PRICE_PACK_*` setting); the webhook credits once per session.
  One place decides the spend order (`meter`).
- **2.** Platform routes under `/api/platform/billing`; platform admin only. Retry re-runs the
  stored event's processing, idempotent by the same keys as the webhook. Catalog prices used by
  Checkout when set; settings remain the fallback.
- **3.** One Playwright pass through the billing life; fixes as separate commits; questions in
  the report.
- **5.** Legacy's Auto Count read first and compared; ported techniques before new ones; each
  change kept only if all 8 runs hold or improve; numbers committed with each kept change.
- **6.** `GET /api/public/plans` (display fields only), cached and rate-limited; market-next reads
  it at build with revalidation and falls back to the last built values.
- **7.** An idempotent data migration refitting `{cx, cy, rx, ry, a0, sweep}` from the three
  stored points in true feet; quantities printed before and after and compared.
- **8.** Formatting-only fixes in old migrations; ruff over the whole repo; a schema dump of a
  fresh `upgrade head` compared before and after.
- **9.** Legacy (UmeralamDEV) and PARITY.md against the new app; top 15 to build next; a
  do-not-port list.
