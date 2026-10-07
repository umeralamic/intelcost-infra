# Overnight report, 2026-10-06 to 2026-10-07

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after each part. Times are UTC.

| Part | State |
|---|---|
| 1. Block F: AI credit top-ups | done 22:57 |
| 2. Block G: platform billing pages | done 23:16 |
| 3. F16 end-to-end check | done 23:29 |
| 4. Go-live checklist | done 23:35 |
| 5. Auto Count accuracy and speed | done 02:45 (time box to 03:26; no new step after the last Image round) |
| 6. Marketing prices from the catalog | done 23:40 |
| 7. Old arcs refit | done 23:47 |
| 8. Old-migration lint | done 23:55 |
| 9. Parity gap report | done 00:40 (written during Part 5's long Image runs) |

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

## Part 9. Parity gap report

[PARITY_GAPS.md](PARITY_GAPS.md): every live legacy route and feature folder checked against the
new app and api, one table per area (gap, what legacy does, where, PARITY.md section, tester
visibility, size, dependencies), a ranked top 15 to build next, and a "recommend NOT porting"
list with the decisions behind each.

**Commit:** infra `9bf189a` (workspace mirror).

**What stands out:**
- **The tracking docs are well behind the code.** PARITY.md still counts sections 12 to 22 as
  barely started, and FEATURES and MANAGER list P-09, P-10, P-14, F10 and F11 as Planned. Most
  of that is built. A re-tick pass would shrink PARITY's 240 open lines to roughly the report's
  rows.
- **Top five gaps:**
  1. Drawing folder management in the Sheets panel (rename, subfolder, delete, move).
  2. The markup Properties panel, which is most of what an Essentials workspace gets.
  3. Confirm double-click to finish a point-to-point run; the hint promises it.
  4. Run the AI tools against a real model.
  5. A decision on legacy's Library page, which feeds nothing else in legacy.
- **Not to port:** legacy dead code such as the assembly component modes (their dialog is never
  opened), `TakeoffDocViewerPanel` and `useProjectDraft`, plus Lovable artifacts and
  Supabase-only mechanisms.

**Method note:** an agent drafted it from the code, and I reviewed and kept it. Legacy was read at
the local `UmeralamDEV` (`e99cddcb`) without a fetch. Rows it could not confirm in code say
"(unverified)".

## Part 5. Auto Count: accuracy and speed

*(Written while the part runs; the results table is at the end of this section.)*

**Setup.**
- **Test copies:** a throwaway workspace with copies of E101 (Hidden Valley Spec Building Rebid)
  and E200 (Waxing City), the same one-page PDFs read from storage and loaded through the
  normal upload. The founder's projects were only read.
- **Samples:** the new app keeps no record of an Auto Count run (no table, no browser storage),
  and neither project holds any takeoff items. **The founder's runs could not be found, so I
  sampled each symbol myself** from a clean instance:
  - an office fixture square with its "A";
  - a "C" circle with its tag and leader;
  - one hatched type A 2×4;
  - one empty type A1 2×4.
- **Ground truth,** read from the sheets themselves:
  - E101's text layer: 68 "A" tags in the office plan; in E8, 24 "C" and 2 "C/NL".
  - E200's vector paths: 12 hatched and 6 empty rectangles inside the plan.
- **"C/NL" question:** E101 has 26 "C" words, but 2 of them are the border's grid-row labels.
  So the founder's 26 is **24 "C" plus the 2 "C/NL"**: the C/NL fixtures are included. I used
  26.
- **Harness:** a script in the bench browser runs the panel's own pipeline in the app page:
  scan, Layers (Auto), finalize at the scan floor, partition at the sensitivity, and the valley
  cut. It times each run from the scan's start to its last result. That is the user's click to
  the results, less React drawing the cards. It counts checked right and wrong against the
  ground truth, and the suggestions the panel shows (the valley cut's visible unchecked; the
  low-confidence drawer is not counted). It notes the main thread's peak heap; the workers'
  memory is not visible there.
- **One scan, both sensitivities:** sensitivity only moves the checked bar, so each run is
  judged at 70% and at the default 78% from the same scan.
- **Bench speed:** Image mode is far slower here than on the founder's machine. The office test
  took 596 s against his about 120 s, because headless Chromium in the container renders
  without a GPU. The before/after ratios are what to read.

**Legacy comparison** (legacy's `UmeralamDEV` working tree, read by an agent and checked by me):
- **The matching code is the same.** The new app's `imageMatch.ts`, `valleyCut.ts`,
  `resultPipeline.ts` and `settings.ts` were ported from legacy nearly byte for byte.
  `vectorMatch.ts` was extended in the new app: quarter turns, closed single strokes, a spatial
  grid, and a worker.
- **The differences are in how the scan is driven:**
  1. Image mode's scan floor is 0.45 in legacy and 0.15 in the new app. Legacy's own perf ledger
     measured the "C" circles at 330 s against 166 s for this alone.
  2. Legacy scores the boxed instance itself in Image mode (`templateScoreAt`), so it is never
     lost to the coarse shortlist.
  3. Legacy draws a page once and reads it back in bands; the new app redraws the whole page
     once per 16-megapixel band.
  4. Legacy caches extracted vectors in IndexedDB across reloads.
  5. Legacy yields while extracting, which keeps the UI responsive.
  6. Legacy captures line width and seeds the stroke plan with it.
  7. When the shortlist is empty, legacy scans the whole page; the new app skips the fine pass.
  8. Legacy honours a Threads setting.
  9. Legacy has a canvas-limit probe and a scale-drift check.
- **Legacy is behind the new app on:** the Vector worker and grid, quarter turns, all eight
  Image angles, one render per sheet across passes, and the small-template shortlist.
- **Gaps in both:** no drawing-area or legend exclusion, no tag outside the drag box, no
  OCR, fill-only symbols invisible to Vector, and one Vector worker per sheet.
- **Legacy could not be run.** There is no preview deployment and no local copy runs against
  the bench, so legacy has no second baseline.

**Causes found:**
- **Office, Vector, 4 wrong checked:** four "B" strip lights. The template's anchor is the
  fixture's small circle, and the strip light is drawn round the same circle. The strip light
  has no "A" tag, but a candidate with no text fell back to a stroke check that passed it (two
  at 1.00).
- **"C" circles, Vector, 20 suggestions:** circles with other tags (D, F and others). A tag
  mismatch multiplied the score by 0.62, which is "visible, unchecked" by design (D-189). The
  two C/NL fixtures are drawn half-shaded with a dashed leader, so they score lower.
- **E200 A1 (empty), 17 suggestions:** the 12 hatched type A panels at about 0.60. A hollow
  sample had no interior check, so a filled or hatched look-alike was never told apart.
- **E200 A (hatched), 11 suggestions:** symbols outside the plan: the fixture schedule's own
  symbols, the switch bank and the dimension ticks. Nothing limits suggestions to the drawing
  area.
- **Office, Image, 114 suggestions:** Image mode keeps everything from a 0.15 floor; most of
  the suggestions sit at exactly 0.45.
- **Vector speed:** one worker scores every window. The first read of a sheet (pdf.js's operator
  list walked on the main thread) is about 6 s on E101 and is not the fetch or parse.
  Reading through the canvas's document cache (V4) measured no gain and was reverted.

### Part 5 results

**At 70%.** Figures are right / wrong checked, missed, and suggestions shown. Times are on the
bench's headless browser.

| Test | Ground truth | Before | After | Target met? |
|---|---|---|---|---|
| E101 office, Vector | 68 | 13.7 s; 68 / **4 wrong**; 5 suggestions | **10.6 s**; 68 / 0; 0 | accuracy yes; speed no (7 s target; first read about 6 s) |
| E101 office, Image | 68 | 596 s; 68 / 0; **114** suggestions | **528 s**; 68 / 0; **0** | accuracy yes; speed no (45 s target; see below) |
| E101 "C", Vector | 26 | 5.3 s; 24 / 0, 2 missed; **20** suggestions | **2.3 s**; 24 / 0, 2 missed; 2 (the two C/NL at 67) | speed yes; 24 of 26 checked |
| E101 "C", Image | 26 | 1,521 s; 24 / 0, 2 missed; **208** suggestions | **593 s**; 24 / 0, 2 missed; **0** | 24 of 26; speed no |
| E200 A (hatched, 12), Vector | 12 | 7.9 s; 12 / 0; **11** suggestions | **5.7 s**; 12 / 0; **0** | yes |
| E200 A1 (empty, 6), Vector | 6 | 5.5 s; 6 / 0; **17** suggestions (all 12 hatched A) | **2.7 s**; 6 / 0; **0** | yes |
| E200 A, Image | 12 | not measured | not measured | — |
| E200 A1, Image | 6 | not measured | not measured | — |

**At the default (78%):**
- Every Vector test is the same as at 70%.
- E101 "C" in Image mode: 23 / 0, 3 missed, before and after; suggestions 1 after.
- E101 office in Image mode: the same as at 70%.

**Peak memory:** the main thread's heap stayed at 92 to 177 MB in every run. The workers are
not visible from the page.

**The founder's baseline, for comparison:**
- E101 office, Vector: 14 s, 72 checked (4 wrong), 6 suggestions. **Matched by my baseline.**
- E101 office, Image: about 120 s on his machine, 68 checked, 120 suggestions. On the bench it
  was 596 s, 68 checked and 114 suggestions.
- E101 "C" at 70%: 0 checked, 32 low-confidence suggestions. My sample of the "C" (the circle
  with its tag and leader) checked 24 before any change. His sample may have left the tag out:
  his run could not be found to compare.

**Kept (each committed with its numbers):**

| # | Change | Where from | Commit |
|---|---|---|---|
| V1 | Tags decide the type: whole words, "C/NL" is a C, a different tag goes to the drawer, a missing tag on a texted sheet is the empty tier | new | app `6c7a7de` |
| V2 | A hollow sample tells filled and hatched look-alikes apart | new | app `e489f44` |
| V3 | Suggestions outside the matches' drawing area go to the drawer (both modes) | new | app `16fb92b` |
| V5 | Vector matching over a pool of up to four workers | new | app `25623a4` |
| I1 | Image scan floor 0.45 | **legacy** | app `c6842f7` |

**Tried and reverted (no measurable gain):**
- V4 and V4b: reading through the canvas's document cache, and asking pdf.js for the canvas's
  operator list.
- I2: legacy's single render with banded readback.

**Not reached, and the next ideas:**
- **Exact 26 on "C" at 70%.** The two C/NL fixtures are drawn half-shaded with a dashed
  leader. They score 67 and show as the only two suggestions. Options:
  1. at 65% they check;
  2. a matching tag (C/NL against C) could carry more weight than the shape. I held back
     because that is a product call: how much a printed tag should outweigh a different symbol.
- **Vector at most 7 s on the office test (10.6 s).** Matching is 3.5 s. The rest is the first
  read of the sheet: pdf.js's operator list walked on the main thread, then the polylines cloned
  to each worker. Next steps:
  1. walk the operator list in a worker;
  2. send the polylines once as transferable typed arrays;
  3. keep a sheet's extraction in the workers between scans;
  4. legacy's IndexedDB cache for repeat runs.
- **Image at most 45 s.** On the bench's headless browser, Image matching itself is about 520 s
  for the office test, and rendering is negligible (I2 showed nothing). The founder measured
  about 120 s for the same test on his machine, so these times run four to five times slower
  than a desktop. Next steps:
  1. legacy's self-instance anchor (recall);
  2. a SIMD/WASM fine scorer (legacy's ledger judged it feasible);
  3. a coarser first pass on large plans;
  4. a timing pass on a real desktop browser, since the bench's numbers mislead here.
- **E200 in Image mode** was not measured: a run took over 25 minutes on the bench. Tonight's
  Image change (the floor) and V3 apply to it, but there are no numbers.

**Founder's projects:** only read (the PDFs copied out). No item, run or setting was written
to them. The throwaway workspace, its user and the harness are deleted.

**Screenshots:** the harness measured results numerically and saved no screenshots. The
throwaway copies are deleted, so none remain.

**Part 5 commits:** app `6c7a7de` (V1), `e489f44` (V2), `16fb92b` (V3), `25623a4` (V5),
`c6842f7` (I1); the docs (D-286, SINCE_ARCHIVE) in the final workspace commit.

---

## Final

All nine parts are done, each gated, smoke-checked, committed and pushed on `umer-dev`. **No
stash was left behind.** The run ended at about 02:45 UTC, well before 11:30: every part was
finished, and Part 5's time box had no step left worth starting.

**Commits per repo** (in order):
- **api:**
  - `8a62a03` Block F
  - `b48efbb` Block G
  - `c085e56` marketing prices
  - `5f8eecc` arcs refit
  - `0bc0fd9` migration lint
- **app:**
  - `e817cdf` Block F
  - `ef2a13e` Block G
  - `67f3172` end-to-end fix
  - `6c7a7de`, `e489f44`, `16fb92b`, `25623a4`, `c6842f7` Auto Count
- **marketing:** `586221d` prices from the catalog
- **infra:**
  - `01d077d` Block F
  - `ca5b47b` Block G
  - `11bc602` go-live and report
  - `ad8b7e9` marketing env
  - `18510ff` arcs
  - `55b392a` gate mount
  - `9bf189a` parity
  - the final workspace commit

**Decisions logged:** D-283 (Block F), D-284 (Block G), D-285 (marketing prices), D-275 point
6 (arcs refit), D-286 (Auto Count). The decisions I made on my own are listed under each part
above.

**Open questions for you:**
1. **Catalog prices and Stripe (Part 2).** Should saving a price in the plan catalog create the
   new Stripe price itself? Today it does not: the editor takes a new Stripe price id, and
   Abdullah creates prices.
2. **Wage Calculator and Estimating on Essentials (Part 3).** Project Home still shows both
   buttons on Essentials, and the Wage Calculator opens with its inputs (the api refuses edits).
   Hide them, or show the plan message?
3. **C/NL on "C" (Part 5).** Should a matching printed tag outweigh a differently drawn symbol,
   so the two half-shaded C/NL fixtures check at 70%? They score 67 today and show as the only
   suggestions.
4. **Tag-less candidates (Part 5).** Where a sheet prints a fixture's tag only once ("TYP."), an
   untagged instance now goes to the low-confidence drawer. It is still visible with "Show low".
   Is that right, or should untagged instances stay visible as suggestions?
5. **Library page (Part 9).** Build it, or drop it by decision? It feeds nothing else in legacy.

**F16_SPEC.md:** Blocks A to G are marked built, and the one stale line found (payment-mode
sessions "until Block F") is fixed. What remains before testers, as the spec says, is the full
run restored from the fixture tag, plus the go-live steps in F16_GO_LIVE.md. Nothing else I
found contradicts the code.

**Left behind, needing you:**
- The throwaway production marketing container `ovn-mkt` (port 3100) and its volume
  `ovn-mkt-next`. Removing them was denied by the permission settings. To remove:
  `docker stop ovn-mkt && docker rm ovn-mkt && docker volume rm ovn-mkt-next`.

**Everything else is cleaned up:**
- every throwaway workspace and user;
- the Stripe event rows they made, and their captured mail (the mail guard was on throughout;
  no real email was sent);
- the smoke scripts, harnesses and throwaway databases, and the frozen app server and its
  worktree.
