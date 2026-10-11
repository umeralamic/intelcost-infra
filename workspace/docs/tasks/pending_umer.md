# Waiting on Umer

_Compiled 2026-10-11 from every doc in the workspace and in `intelcost-app-react`,
`intelcost-app-fastapi` and `intelcost-infra` (all on `umer-dev`). Step 1: a list only, nothing
changed in any source file._

**How to answer:** by number. `D1 ok` · `C3 no: <note>` · `S1 later` · `D8.4 ok`. Decisions are D,
click checks C, specs S; a split decision's calls are D4.1, D8.1, D11.1 and so on.
- **ok:** marked closed in its source file with today's date and "confirmed by Umer", and removed
  from here.
- **no:** your note written next to it, kept open, and the work it would need described (not
  started).
- **later:** moved to Parked at the bottom.

**Where to check, safely.** Use the bench app at http://localhost:5173 and sign in with a
throwaway account (`fx.<name>.<stamp>@bench.intelcost.io`), never the seeded account. Never
open Hidden Valley Spec, its Rebid, Waxing City or Minmar. Use these instead:
- **Riverside Medical Center** (the bench seed: priced items, cost components, wage sets);
- **Marketing Demo – Site** (has an earthwork result, assumptions and a strip area);
- **Test 3** (copies of the Vol1/Vol2 sets);
- **E200 day copy** (an E200 copy in a throwaway account);
- the Auto Count benchmark page, http://localhost:5175/bench/autocount (E101 office, "C", E200 A
  and A1 as fixtures).

**Duplicate before you change anything.** Wherever a step changes data, first make a copy with
All projects ⋯ › Duplicate project and work in the copy. Delete the copy afterwards from Settings
› Trash.

"Looks closed" means a later decision or report already settled it. One word, `ok`, closes it.

**Answered:**
- **Batch 1 (2026-10-11):** D10, D12, D15, D25 to D36, C25 and C29 confirmed and closed in their
  source files; S3 parked.
- **Batch 2 (2026-10-11):**
  - **Confirmed and closed in their source files:** D5, D6, D13, D14, D19 (the share link is never
    touched by a session), D20 (CSI kept).
  - **D24 done:** `.claude/` is in the mirror, and CLAUDE.md and the infra README say so.
    `SAM.gov.pdf` was moved to `C:\Users\DELL\Documents`.
  - **D23 confirmed:** recorded under D-328; the rewording is not started (see "Work described").
  - **D9 and D18 answered "no":** kept open below, with the work described.
  - **D4, D8 and D11:** split into one line per call.
  - **Parked:** D7, D16, D17, D21, D22, C18, C26 and S2.

  The numbers of the open items are unchanged.

---

## Decisions

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| D1 | DECISIONS.md:1606, 1609, 1611 (D-35) | Three zoom choices made without you. Zoom out stops at a sheet's Fit when Fit is below 10%. Every zoom step is ×1.25. The 0 key goes to Fit. | Accept or reject each of the three. | Riverside page 1. Zoom all the way out, press zoom in and out a few times, then press 0. | Partly. Split view reuses them and was accepted (D-107). D-35's own choices were never accepted. |
| D2 | DECISIONS.md:4064, 4073 (D-103) | Where the zoom menu opens: the top button of the bottom-right cluster, and the clickable percentage at the top right. | Accept the placement. | Riverside page 1: click each percentage. | Partly overtaken by D-122, which moved the cluster's percentage between Zoom in and Zoom out. |
| D3 | DECISIONS.md:4762 (D-119) | Text at reading zooms above Fit is drawn darker, through a contrast curve. | Pass or fail on your own monitor (2560×1440 at 125%). | In a throwaway, upload a dense notes sheet. Compare 29% with 50%, then with `docs/tasks/ours-notes-29.webp`. | No. |
| D9 | DECISIONS.md:10245; F16_SPEC.md:113 (D-277 Q14) | Which Stripe API version the real account uses. | **Your answer, no:** "hand to Abdullah with the Stripe setup". Work below. | — | No. |
| D18 | archive/OVERNIGHT_REPORT_2026-10-07.md:271 | On Essentials, a plan limit still says "Your role cannot …". | **Your answer, no:** "change to plan wording, e.g. 'Editing estimates isn't included in Essentials. Upgrade to Professional to edit.'" Work below. | An Essentials throwaway workspace: try to edit an estimate. | No. |

### D4, D8, D11: one call per line

Answer each call on its own: `D4.1 ok`, `D8.12 no: <note>`.

**D4, earthwork editing (D-181).** These are the behaviours that differ from legacy on purpose.
To check: duplicate Marketing Demo – Site, then edit a contour, a spot and the boundary on the
copy's grading sheet.

| # | File:line | The call |
|---|---|---|
| D4.1 | DECISIONS.md:6621 | An edit that would make a contour cross itself, or another line of its surface, more than before is refused. A line already crossing stays editable so it can be fixed. |
| D4.2 | DECISIONS.md:6626 | The work boundary cannot go below three points. Legacy allows two, which no longer encloses an area. |
| D4.3 | DECISIONS.md:6627 | Changing a contour's or spot's elevation can be undone. Legacy's cannot. |
| D4.4 | DECISIONS.md:6628 | Any edit marks the cut and fill result out of date at once. Undoing back to the calculated shape makes it current again. |
| D4.5 | DECISIONS.md:6631 | Earthwork shapes show straight after a page reload. Legacy's are missing until the next edit. |
| D4.6 | DECISIONS.md:6634 | Breaking a line at a vertex does not repeat that vertex in the second half. Legacy repeats it, which is a defect. |

**D8, billing (D-277 to D-285).** These are the build's own calls. To check: C30. D8.1, D8.3 and
D8.7 were already amended in your 2026-10-06 brief, so `ok` closes them.

| # | File:line | The call |
|---|---|---|
| D8.1 | DECISIONS.md:10251 | A paying, comped or briefly overdue workspace gets its plan. With no subscription it is Professional during the trial and view-only after. A lapsed one is view-only. A cancelled one keeps its plan until the paid period ends. *(You amended this.)* |
| D8.2 | DECISIONS.md:10260 | An owner on Essentials can still invite, manage members, transfer ownership and reach Billing to upgrade. Essentials still gets no measuring, no estimating and no AI. |
| D8.3 | DECISIONS.md:10266 | Essentials has no Wage Calculator, so uploading a wage-rate file there is refused. *(You amended this.)* |
| D8.4 | DECISIONS.md:10268 | On Essentials, every AI feature says "AI tools are on the Professional plan." This applies to our own platform admins too. |
| D8.5 | DECISIONS.md:10272 | The Stripe price settings use the new plan names. The admin pricing screen shows "Set" or "Not set" for each. |
| D8.6 | DECISIONS.md:10275 | Starting prices: Essentials $9.99 a month or $99.99 a year; Professional $29.99 a month or $299.99 a year. Each extra seat costs the same as the plan. |
| D8.7 | DECISIONS.md:10278 | A platform admin can give a workspace a free plan (plan, seats, optional end date); removing it takes it away. Signup accepts both the new and the old plan names. *(You amended this.)* |
| D8.8 | DECISIONS.md:10306 | We talk to Stripe directly, without its software library, and check Stripe's message signatures ourselves. |
| D8.9 | DECISIONS.md:10310 | The bench uses a fake Stripe, with a Pay page and controls for payments that succeed or fail, cancellations and renewals. Switching to real Stripe changes settings, not code. |
| D8.10 | DECISIONS.md:10321 | Each workspace has one Stripe customer, made at its first checkout and reused after, so an abandoned checkout leaves no duplicate. |
| D8.11 | DECISIONS.md:10324 | The seat count is whatever Stripe actually bills, so a seat change made in Stripe's billing portal is picked up. |
| D8.12 | DECISIONS.md:10327 | An incomplete or paused subscription counts as unpaid, and an expired incomplete one as cancelled. Neither gives the workspace a plan. |
| D8.13 | DECISIONS.md:10329 | Each Stripe notice is handled once and repeats are ignored. If handling fails, nothing is half-saved and Stripe resends it. A forged notice is rejected. |
| D8.14 | DECISIONS.md:10334 | The 7-day grace period starts at the first failed payment; later failures do not extend it. It clears once the subscription is no longer overdue. |
| D8.15 | DECISIONS.md:10336 | While a subscription is running, a new checkout is refused with "manage billing". A cancelled or comped workspace can check out again. |
| D8.16 | DECISIONS.md:10339 | After checkout the user lands on a simple Billing page saying whether payment succeeded or was cancelled, with the current plan. |
| D8.17 | DECISIONS.md:10342 | The plan, billing cycle and seats picked on the price page are remembered on the account and pre-fill checkout later. |
| D8.18 | DECISIONS.md:10385 | When a view-only workspace blocks a change, one dialog says why: the trial ended, the grace period passed, the subscription ended, or our team locked it. |
| D8.19 | DECISIONS.md:10390 | The app always knows whether the workspace is subscribed, when the trial ends (extra days included) and why it is view-only, and updates live. |
| D8.20 | DECISIONS.md:10393 | A trial countdown button appears in the header from three days left. The owner goes to Billing; anyone else is told to ask the owner. |
| D8.21 | DECISIONS.md:10396 | A check runs every minute, so open screens update by themselves when a trial, grace period or paid period runs out. |
| D8.22 | DECISIONS.md:10401 | On annual plans, seat removals wait until renewal, through a Stripe portal setting rather than our own rule. |
| D8.23 | DECISIONS.md:10405 | Owners and admins see the Billing tab, but only the owner can change anything on it. |
| D8.24 | DECISIONS.md:10407 | Plan cards price the first seat at the plan price and each extra seat at the seat price, with no wording about tax or refunds. |
| D8.25 | DECISIONS.md:10434 | Transferring ownership is never blocked because seats are full. |
| D8.26 | DECISIONS.md:10446 | A comped workspace's AI credits refill monthly on its start-date anniversary, as for annual subscribers. A comp has no invoices. |
| D8.27 | DECISIONS.md:10464 | The bench can simulate a renewal and a chosen date, so monthly credit refills can be tested. |
| D8.28 | DECISIONS.md:10504 | Every way of adding measurements (create, duplicate, assemblies, undo, earthwork, restoring from trash) checks the trial cap. An over-cap action adds nothing. |
| D8.29 | DECISIONS.md:10517 | Hitting a trial limit shows one dialog: the owner gets "Go to Billing", anyone else is told to ask the owner. |
| D8.30 | DECISIONS.md:10525 | On a restricted trial, the Billing page shows usage against each limit: projects, storage, measurements and AI credits. |
| D8.31 | DECISIONS.md:10527 | Platform admins can set or clear any of a workspace's four trial limits, one at a time. |
| D8.32 | DECISIONS.md:10559 | Buying a credit pack goes through Stripe checkout, with a Stripe price per pack. The user returns to the AI Credits page, which shows the result. |
| D8.33 | DECISIONS.md:10571 | The AI Credits page shows included and purchased credits apart, a Buy button (or why it is off), and past purchases with who bought. |
| D8.34 | DECISIONS.md:10574 | The bench's fake Stripe can complete a one-off credit-pack purchase. |
| D8.35 | DECISIONS.md:10587 | A platform-admin-only page has three tabs: Subscriptions, Webhook events and Plans. Anyone else sees "Page not found". |
| D8.36 | DECISIONS.md:10591 | Subscriptions lists every paid or comped workspace: plan, seats used, status, dates and Stripe links, with filters, search and 50 a page. |
| D8.37 | DECISIONS.md:10597 | Admins can retry a failed Stripe notice from the app with no risk of charging or crediting twice. Older notices can only be resent from Stripe. |
| D8.38 | DECISIONS.md:10603 | Admins can edit plan names, prices, credits and on-sale status. New prices reach only new checkouts, and only through a matching Stripe price. |
| D8.39 | DECISIONS.md:10610 | Essentials can never be given AI credits; trying is refused. |
| D8.40 | DECISIONS.md:10613 | Admins create, edit and end free plans from Subscriptions. Editing keeps the current period. Ending one returns the workspace to its trial, or to view-only. |
| D8.41 | DECISIONS.md:10619 | The bench's fake Stripe can hide a subscription and change its seat count, to test failures and seat changes. |
| D8.42 | DECISIONS.md:10642 | If our server is down, the public price page keeps the last prices it had, or built-in defaults. A plan taken off sale disappears from it. |
| D8.43 | DECISIONS.md:10647 | The price page's total charges the plan price for the first seat and the seat price for each extra seat, matching checkout. |

**D11, the load screen and app shell (D-313 to D-326).** These are the calls made on your behalf.
To check: C22 and C23. Calls that later decisions overtook are left out. They are D-316's (by
D-327), D-320's (by D-321 and D-322), parts of D-321 (by D-322), D-323's set and label space (by
D-324 and D-333), and D-324's separate read pool (by D-326).

| # | File:line | The call |
|---|---|---|
| D11.1 | DECISIONS.md:11470 | Unfinished uploads left in storage show as "n/a" rather than a count, because the bench cannot list them. The bucket owner can add an automatic clean-up rule. |
| D11.2 | DECISIONS.md:11504 | The 500-tile speed check used 500 copies of one uploaded file, not 500 real uploads (each real upload took about 6 s). |
| D11.3 | DECISIONS.md:11598 | Editing another project's details from All projects does not open it, so it does not appear in your Recent list. |
| D11.4 | DECISIONS.md:11624 | Upload in the load screen's file tree takes any file, not just drawings, so specs and reports have somewhere to go. |
| D11.5 | DECISIONS.md:11661 | Every load-screen tile uses a 3:2 landscape frame, the shape of a large drawing sheet. You asked for landscape without a ratio. |
| D11.6 | DECISIONS.md:11674 | The load screen's folder pane can be dragged between 200 and 480 px wide; the dialog is at most 1024 px. |
| D11.7 | DECISIONS.md:11676 | A file that has finished uploading but is not listed yet shows "Preparing…", not "Upload unfinished". |
| D11.8 | DECISIONS.md:11696 | Sheets and folders that already exist keep their order, so a hand reorder survives later loads; only new sheets slot into natural order. |
| D11.9 | DECISIONS.md:11698 | The open sheet stays in its folder, but a new sheet slotted above it pushes it down one row. |
| D11.10 | DECISIONS.md:11753 | The server's sheet reader takes two speed shortcuts: it groups lines by direction and position, and finds ticks and lines through a grid. |
| D11.11 | DECISIONS.md:11757 | A sheet's name is read from the title next to its number, giving cleaner names like "Exterior Elevations". |
| D11.12 | DECISIONS.md:11776 | When a suggested scale's box is near the sheet's right edge, its Apply card sits to the left of the box. |
| D11.13 | DECISIONS.md:11873 | The "Change scale on this sheet?" warning stays, so measurements already drawn are protected when a scale changes. |
| D11.14 | DECISIONS.md:11950 | Loose one-page files of one page size are named together as one set, so they can share a naming template. |
| D11.15 | DECISIONS.md:11994 | Settings data counts as fresh for one minute, only while Settings is open; everything else behaves as before. |
| D11.16 | DECISIONS.md:12009 | The large classification list is compressed for that one request only, not app-wide, so AI results still stream without delay. |
| D11.17 | DECISIONS.md:12037 | One shared worker pool both prepares and reads pages, so together they never use more than the set limit of cores and memory. |
| D11.18 | DECISIONS.md:12050 | A scale's label shows what is printed on the sheet, tidied up, never a preset's wording. |

## Work described (not started)

- **D9: hand the Stripe API version to Abdullah.** This is docs only, about 10 minutes.
  - Reword D-277 Q14 (DECISIONS.md:10245) and F16_SPEC.md:113–114 to say Abdullah confirms the
    account's API version during the Stripe setup.
  - Make it a named step in F16_GO_LIVE.md. Its blanks at :130–131 already ask him for it.
  - Move this item into the Abdullah list here.
- **D18: plan wording instead of "Your role cannot …" on Essentials.**
  - **Where the wording comes from:** one shared check in the api answers every refusal with the
    role wording, even when the role would allow the action and only the plan stops it. The
    estimate's pricing refusal has a fixed role sentence of its own. AI refusals already say the
    plan ("AI tools are on the Professional plan.").
  - **The fix:** when the plan, not the role, is the reason, the refusal says so.
    - Estimates get your sentence: "Editing estimates isn't included in Essentials. Upgrade to
      Professional to edit."
    - Measuring gets a matching one, e.g. "Measuring isn't included in Essentials. Upgrade to
      Professional to measure."
    - The app's own Essentials banner on estimating, today "View only. Editing estimates is on
      the Professional plan.", changes to the same wording.
    - Real role refusals keep "Your role cannot …".
  - **Process:** a D-NN first, then the gates, the quantity table, and one smoke on an Essentials
    throwaway workspace. About 2 to 3 hours.
  - **Needs from you:** the measuring sentence, or "use your wording".
- **D23: reword the cost-book name.** Change one line in the api's wage calculator docs (README.md:55)
  to "Never show any source or book name to users." The scope is recorded under D-328
  (DECISIONS.md:12137). One docs commit in the api, about 2 minutes.

## Click checks

| # | File:line | What it is | What you need from me | How I check it (project and sheet) | Already done elsewhere? |
|---|---|---|---|---|---|
| C1 | OVERNIGHT_REPORT.md:282 | Deleting a sheet clears its stored files. | Pass or fail. | In a throwaway project, upload any PDF and load it. Delete one sheet from its row menu. Within seconds the worker log shows nothing failed. | Smoke-tested by me only. |
| C2 | OVERNIGHT_REPORT.md:285 | Auto Count no longer suggests filled symbols for empty ones. | Pass or fail. | On E200 day copy, box one empty A1 symbol and use Image mode. Expect 6 checked and no 75% hatched suggestions. On E200 A at 38%, expect no empty-outline suggestions. | Smoke-tested by me only. |
| C3 | OVERNIGHT_REPORT.md:288 | Duplicate project. | Pass or fail. | All projects ⋯ › Duplicate project on Test 3. Expect the toast to count up and the copy to open. Change something in the copy and the original stays the same. Delete the copy afterwards. | Smoke-tested by me only. |
| C4 | OVERNIGHT_REPORT.md:291 | On a big set, the first page you tick is ready first. | Pass or fail. | In a throwaway, upload the 117 MB Vol2 set (a copy is in Test 3) and tick one sheet. Expect it Ready in about 45 s, not 4 minutes. | Smoke-tested by me only. |
| C5 | OVERNIGHT_REPORT.md:480 | Calculated earthwork lines belong to Calculate. | Pass or fail. | On a duplicate of Marketing Demo – Site (not C-200, as the report says). Expect: the outputs show an excavator; clicking the icon does nothing; a double-click opens the details; ⋮ has no Delete. | Smoke-tested by me only. |
| C6 | OVERNIGHT_REPORT.md:482 | A copied project's earthwork reads as current. | Pass or fail. | Duplicate Marketing Demo – Site and open the copy's grading sheet. No line says "Needs recalculating". | Smoke-tested by me only. |
| C7 | archive/OVERNIGHT_REPORT_2026-10-11.md:318–327 | Three checks from last night. The Wage Calculator fills at once after an api restart. The Auto Count benchmark gives office 68/0, "C" 24/0, E200 A 12/0, A1 6/0. A dense sheet loads about 2× faster. | Pass or fail. | The benchmark page, and Riverside › Wage Calculator. | No record of your check. |
| C8 | archive/OVERNIGHT_REPORT_2026-10-10.md:234–241 | Four checks from 10-10. Settings tabs mark at once. The benchmark samples look like the ones you meant. A `1:100` metric sheet offers Approve. The Sheets panel stays smooth during a load. | Pass or fail. | Settings; the benchmark page; Test 3 during a load. | No record. |
| C9 | archive/OVERNIGHT_REPORT_2026-10-08.md:606 | The Auto Count rules for which matches start checked. | Try Auto Count on a few of your own symbols and tell me what it misses. | On sheet copies in a throwaway, never the originals. | No. |
| C10 | MANAGER.md:23; wbs_split_tasks.md (P-26) | Two trees: your own folders, and classification. Not smoke-tested, at your word. | Pass or fail. | Duplicate Riverside. Switch Folders / Classification in the Takeoff panel. Use Change classification… then undo. A new item lands in the selected folder or code. Both fields appear in New Measurement. Estimating groups by each tree. | No. |
| C11 | MANAGER.md:24 (P-20a) | Rotate pages. | Pass or fail. | Test 3 copy: Sheets ⋮ › Rotate Pages… › Landscape. Set to 90°. Markups stay on their features with the same quantities. Thumbnails turn. A second window turns live. | No. |
| C12 | MANAGER.md:25 (F6) | The item model. Steps: archive/OVERNIGHT_REPORT_2026-09-28.md:435–553, plus the 10-03 additions. | Pass or fail; then I archive the spec. | Riverside copy. A 7'-6" height × 40 ft gives about 300 SF; pitch 6/12. Sub-items `PARENT × 1.05`. Variables. A folder ×2. Layers. Duplicate gives "(2)". Classification. The sub-items editor at phone width. | No. |
| C13 | MANAGER.md:26 (F7, with P-21) | Canvas tools. Steps: archive 09-28:555–684 and archive 09-29:205–235. | Pass or fail. | Riverside copy. Still never driven by anyone: a vertex conflict, a six-section paste, a three-item box delete, and Crop as New Page seen in a second window (needs a second throwaway account). | No. |
| C14 | MANAGER.md:27 (F9) | The Estimating tab and export. Steps: archive 09-29:156–197. | Pass or fail. | Riverside copy. The grid, groupings, pricing, wastage, cost components, Format, then the Excel export. | No. |
| C15 | MANAGER.md:28 (F9c) | The Estimating sidebar and reports. | Pass or fail. | Riverside copy. Report totals equal TOTAL. Sidebar collapse holds after reload. The Needs attention count matches. Set values on 10 rows changes only those, and one undo restores them. | No. |
| C16 | MANAGER.md:29; bid_summary_tasks.md:77–85 (F9b) | The bid summary. | Pass or fail. | Riverside copy. Direct $100,000, material $40,000, tax 8%, overhead 10%, profit 10%, bond 1% → Bid total **$126,120.72**. The export's Bid Summary sheet recalculates in Excel. | No. |
| C17 | MANAGER.md:30 (F12, plus D-292 to D-297) | Earthwork. | Pass or fail. | Marketing Demo – Site copy. Contours and spots, the boundary, Calculate, Site Features, Strip Areas, the estimate lines, Auto Trace. Also the elevation check, the breakdown, Net in words, "Compare without topsoil strip", uncovered shading. | No. |
| C19 | MANAGER.md:31 (F13) | Auto Count. | Pass or fail. | E200 day copy, from the region menu. Vector mode: quarter turns and mirror. Image mode: A1 6/0, A 12/0. The slider opens at 70. Create (N), then one Ctrl+Z removes it. | Spec fully ticked; only your check holds it. |
| C20 | MANAGER.md:33 (F15 Community) | The forum. | Pass or fail. | Throwaway account. Post with an image and a video, reply, vote, accept an answer, check the bell, Report, then restore from the staff board. | Spec fully ticked. |
| C21 | MANAGER.md:33 (F15 first slice) | Reports, Shifts, Time Tracking, Clock in. | Pass or fail. | Riverside copy › Reports; Settings › Shifts. | No. |
| C22 | MANAGER.md:39 (TF) | Takeoff-first. | Pass or fail. | Throwaway. A new project has no seed folders. Drop a folder plus loose PDFs: the tree is kept. Only drawing-size pages are pre-ticked. Home opens the last sheet. Search "zzq" gives "No projects match." Upload tray: Cancel, Retry. Drop files on the empty state, then rename the dated name. | Smoke-tested by me. Real folder drag-and-drop is untested. |
| C23 | MANAGER.md:38 (F5-LF) | Folders on load. | Pass or fail. | Throwaway. Load 3 one-page and 3 multi-page PDFs. One-page files land loose. A blank folder name becomes "<file> Set". "Wet Trades" and " wet trades " merge. | Smoke-tested by me only. |
| C24 | MANAGER.md:34 (F14) | AI tools and credits. | Pass or fail. **Costs real money.** | Throwaway sheet. Page Name, Sheet # and Scale, single and ALL. Auto-Name Sheets, Ask AI, Extract Schedule. Settings › AI Credits shows the history. | Spec fully ticked. |
| C27 | ZOOM_GLITCH_STATUS.md:73 | Zoom handover on your own GPU at 125%. | Pass or fail. | Riverside page 1. Wheel-zoom Fit → 2.4× → 5.2× → back to 3.3×. Expect one swap, nothing moving. | No. |
| C28 | PARITY_GAPS.md:54, 149 | Does a double-click finish a Linear or Area run? The hint says it does. | Yes or no. | Riverside copy: draw a Linear run and double-click. | No. |
| C30 | MANAGER.md:37 (F16) | Billing end-to-end, on the bench's Stripe fake. | Pass or fail. | A throwaway workspace. Checkout turns an expired trial into Professional. Billing page and portal. Seats refused when full. Trial caps. Buy an AI pack. A comp Essentials workspace loses editing. | No. Next on the board. |
| C31 | MANAGER.md:36; BUILD_BRIEF.md:120 (F20) | The Wage Calculator: 11 steps. | Pass or fail. | Riverside copy › Wage Calculator. (1) National Average, Calculate, Save. (2) ZIP 6604 gives Bridgeport, CT. (4) Upload `tx115.txt` gives 26 classifications. (6) Direct gives a "Labor burden" line to 2 decimals. (7) Type Laborer $60: offered again on the same basis only. Full list: BUILD_BRIEF.md and the api's `docs/wage-calculator/` report. | No. Automated pass 11/11 only. |

## Specs to review

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| S1 | revision_sets_spec.md:516–560 (F21) | Revision sets: a new set's sheets paired with the old ones, takeoff carried over, and changes flagged. 18 open questions, each with a default. Plan: about 15 days in 8 blocks; first cut A–D, 8.5 days. | Answer the 18, or say "defaults", and approve the plan. | Read the spec. | No. |
| S4 | PARITY_GAPS.md:146–193 | Two lists: "build next, top 15", and "recommend not porting". | Confirm or reorder the top 15; sign off the not-porting list. | Read it. | No. |
| S5 | LEGACY_UMERALAMDEV_DIFF.md (items 1–23) | Legacy changes since 2026-09-24 still to schedule. Mostly cost components and estimating. Earthwork is done. | Say which are still owed. | Read it. | Partly: the earthwork items were built in F12. |

## For Abdullah (listed only, not for you to check)

- **Today's report** (OVERNIGHT_REPORT.md:296–302, 486–491, 536–540):
  - the duplicate-project worker task needs S3 read/write on the bucket;
  - ranged reads need `Range` allowed;
  - two migrations (`d352a4c1b7e9`, `d354b2e8c4a1`);
  - a Redis key `prepare:download_rate`;
  - the crop-box backfill on production, a dry run first.
- **Archived reports** (OVERNIGHT_REPORT_2026-10-11.md:351–361, 2026-10-10.md:113–116 and 247–255):
  - the production image serves gzip'd wasm, so the CDN must pass encoding and keep the type;
  - the api warms its reference data at boot;
  - a page-pool worker sized `min(cores÷2, RAM÷700 MB)`, with Redis priority queues;
  - a shared `worker_dir` volume;
  - add `http://localhost:5175` to the bench bucket's CORS (DECISIONS.md:11808).
- **Storage** (DECISIONS.md:1251, 11471, 12394; flows.md:352):
  - the abort-unfinished-uploads lifecycle rule;
  - the IAM user lacks multipart listing and version and lifecycle reads.
- **Workers and beat** (F5_BLOCK_B_REPORT.md:479; F5_BLOCK_A_REPORT.md:121; api STATUS.md:361–400):
  - a `previews` worker, niced;
  - exactly one Celery beat;
  - rebuild the production image (`nh3`) from the `production` target only.
- **Realtime** (`intelcost-infra/notes/2026-09-26_realtime_caddy_for_abdullah.md`):
  - how many uvicorn processes;
  - Caddy `stream_close_delay`;
  - no idle timeout under 60 s;
  - the CORS origin;
  - Redis `maxmemory`.
- **Migrations on start** (`intelcost-infra/notes/2026-10-02_api_migrations_on_start_for_abdullah.md:33–40`): option A or B, and the worker must wait for it.
- **Stripe** (F16_GO_LIVE.md; F16_SPEC.md:122–128; DECISIONS.md:10711):
  - products, prices, the webhook secret and the portal configuration;
  - the API version blanks.
  - The API version itself goes to him too (D9), once the work above is done.
- **Optional:** a read-only database role for the wage reference data (DECISIONS.md:10864).
- **Legacy data migration and cutover, P-16/F17** (FEATURES.md:86): not yet specced.
- **The 🔧 review table** (flows.md:345–359): SES, production CORS, lifecycle, worker sizing, and the Stripe setup.

## Parked

| # | File:line | What it is | Your answer |
|---|---|---|---|
| S3 | drafts/c200_acceptance_tasks.DRAFT.md:276–313 | C-200 gap: 11 questions, parked on purpose by D-232. | Later (2026-10-11) |
| D7 | DECISIONS.md:9848 (D-271) | About 25 site-stitching calls made while building. | Later: parked with C26 (2026-10-11) |
| D16 | DECISIONS.md:12424 (D-340) | The 47.9 GB storage backup at `E:\bench-backups\minio-intelcost-local-2026-10-10.tar`. | Later: keep until MinIO is retired (around 2026-10-18), then delete (2026-10-11) |
| D17 | archive/OVERNIGHT_REPORT_2026-10-10.md:52 | Moving the repos onto the Linux disk. | Later: parked, revisit later (2026-10-11) |
| D21 | FEATURES.md:87 (P-17) | A provider for the project map and address lookup. | Later: keep deferred (2026-10-11) |
| D22 | PARITY_GAPS.md:154, 182 (D-287 6) | The Library page. | Later: keep parked (2026-10-11) |
| C18 | MANAGER.md:32; DECISIONS.md:8148 (F18, D-232) | The C-200 acceptance, your own test by hand. | Later: parked with C-200, D-232 (2026-10-11) |
| C26 | MANAGER.md:35 (F19) | The site-stitching click check. It needs a C-200 copy. | Later: parked with C-200 (2026-10-11) |
| S2 | drafts/zoom_hybrid_images.DRAFT.md:121–129 | Sharper deep zoom from pre-made images: 4 questions. | Later (2026-10-11) |
