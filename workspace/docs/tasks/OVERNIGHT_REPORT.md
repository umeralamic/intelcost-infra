# Overnight report, 2026-10-06

Started 02:05 UTC; stop at 11:30 UTC. Updated after each part.

**Summary.**
- All six parts are done:
  - Part 1: Step 5, crews and classification;
  - Part 2: Step 6, workspace crew settings;
  - Part 3: the end-to-end Wage Calculator check, 11/11, nothing to fix;
  - Part 4: the F16 spec draft, with 16 questions;
  - Part 5: P-02, recalculate after a settings change;
  - Part 6: F19 site stitching, built in 20 blocks.
- **F19 left:** only arcs in the site view, which need your decision (question 6 at the end).
- **Real bugs found and fixed in F19:**
  - drawing clicks were taken by the sheets' labels;
  - boundary pieces did not unite at the line;
  - the site Calculate read stale items;
  - a whole shape kept the point its pieces met at;
  - the site region rings were open, so a match line that was a ring's last edge was never cut.
- **One finding for you:** a sheet's TIN depends on its page's proportions (question 5).
- No named stash: nothing was left half-built.
- Questions, mismatches and every commit are at the end.

## Part 1. Wage Calculator Step 5, crews and classification: done

**Built.** The approved crew mapping is loaded (14 crafts, 75 crews appended to the seed;
`ref_crew_scope_map.csv`, `ref_classification_crosswalk.csv` copied in; the Dockerfile's
`ref_*.csv` glob takes them; `003_crew_scope_mapping.sql` beside 001 and 002 as docs, no
migration). `RefData` gains `scope_map` and `crosswalk`; `app/wagecalc/scope.py` has
`crews_for_node`, `lead_craft`, `other_crews`. `GET …/wage-calculator/crews?node_uuid=`
answers the default, suggested and "Other [trade] crews" (names, sizes, codes, no rates).
A new labor component on a classified item starts with the default crew tagged Auto; a
classification change (item or sub-item) replaces Auto groups and flags picked ones "Crew
may not match the new scope" (Use suggested crew / Keep). The Add crew picker has the three
sections; an unclassified item shows the search only. D-268.

**Commits.** api `893888a` (plus `8a64edf`, the BUILD_BRIEF line 78 fix, pushed before the
step); app `c4e882a`; infra `d289002` (workspace mirror).

**A.5 values.** National crew cost per manhour: Electrical · Electrician + Helper (C-099,
commercial) $61.14/manhour ($122.28/crew-hour, 2 workers); Structural Steel · 4 Ironworkers
+ Crane Op + Driver (R-097, residential) $33.68/manhour ($202.06/crew-hour, 6 workers).
`crews_for_node`: csi 26.04 commercial → C-030 Electrician + Laborer, suggested C-030,
C-099, C-031; csi 03.01.08 commercial → C-008 Cement Mason + Carpenter + Laborer, suggested
C-008, C-007, C-013, C-011; uniformat D5020 commercial → via 26.04, the same as 26.04;
nrm2 39.03 residential → R-055 Electrician + Laborer, suggested R-055, R-104, R-056.

**Smoke 6/6.** (1) 26.04 commercial: Electrician + Laborer pre-filled with Auto; Suggested
lists Electrician + Helper; Other electrical crews lists 6. (2) Reclassified to 31.04.03:
replaced by Earthwork · Operator + 2 Laborers, Auto. (3) A picked Operator + Laborer stayed
after reclassifying, with the message in the dialog and on the estimate row; Use suggested
crew put Electrician + Laborer back, Auto. (4) Residential 05.01: 4 Ironworkers + Crane Op
+ Driver at the set's residential rates ($33.25, $35.18, $28.09). (5) UniFormat D5020:
Electrician + Laborer via the crosswalk. (6) 01.13: created empty, picker search only.
Reclassification in the smoke went through the item PATCH the Properties dialog uses.

**Decisions made on my own.**
- Parents are found by code (dotted segment, UniFormat `D5020` → `D50`), as the templates build them.
- An Auto group whose new node has no default is removed (not kept).
- The suggested list includes the default (first).
- Lead craft taken literally: R-097's lead is the Crane Operator, so its "other" crews are crane crews.
- "Other [trade]" uses the default crew's division.
- The api fills the default crew on create only when the body has no `crew`; the app sends the rows itself so the dialog shows them before saving.
- Classification changes by duplicate, assembly apply or node delete do not move crews.

**No longer matching.** Nothing found; spec "Crews and classification" and brief Step 5 were written with the code.

## Part 2. Wage Calculator Step 6, workspace crew settings: done

**Built.** Migration `f1c6a8e3d527` with the four tables. The engine resolves a node's crews
on the Step 5 chain, workspace lists first and then IntelCost's (`resolve_node`, with the
node it came from). One workspace view (`CrewBook`: IntelCost and workspace crews, hidden
codes, node lists) feeds Step 5's suggestions, auto-fill and classification change, and
the project's crews read (workspace crews priced live from the saved set's crafts).
Settings routes under `{ws}/wage-calculator/crew-settings/`: catalog, tree level or search
(200 max), orphans, set and reset a node list, custom crew CRUD, hide and unhide. Reads for
any member; writes need `MANAGE_WORKSPACE`. The page is Settings › Project Setup › Crews:
system selector, Residential / Commercial & Public, orphans banner, tree with sources
("IntelCost default", "From 26.04", "From CSI 26.04 (Workspace)", "Workspace" with Reset),
node editor (default radio, reorder, three-section picker with workspace crews and Hide),
Custom crews (with the IntelCost list and Hide from suggestions), Hidden crews (Unhide).
Read-only for non-admins. No rates. D-269.

**Commits.** api `ed9099c`; app `ed80c1e`; infra: the workspace commit after it (D-269, SINCE_ARCHIVE, this report, the 2026-10-03 overnight files archived).

**Smoke 8/8.** E1 26.04 "IntelCost default" Electrician + Laborer, 26.04.01 grey "From
26.04". E2 26.04 set to Electrician + Helper ("Workspace"); 26.04.01 "From 26.04
(Workspace)"; a new labor component on 26.04.01 filled C-099 ($71.93, $50.35), Auto. E3 a
component made before the change kept C-030. E4 custom "Electrical · 3 Electricians + 1
Helper" made, default on 26.06; a new component on 26.06 filled it at the saved rates
(W-8F18763E23: 3 × $71.93, 1 × $50.35). E5 Electrical · Electrician hidden: absent from
Suggested (3) and Other electrical crews (6), found by Search all crews. E6 UniFormat D5020
shows "From CSI 26.04 (Workspace)" and fills Electrician + Helper. E7 Reset 26.04: back to
Electrician + Laborer, 26.04.01 default C-030. E8 a member sees no Edit, New crew or Hide;
PUT override as the member answers 403. Also by API: an override on a node that does not
exist is listed as an orphan and deleted; a residential crew on a commercial list is
refused (422).

**Bench note.** Bench mail now goes through the real SES relay (compose comment), not
MailHog, so invitation tokens cannot be read back; the non-admin was registered and
seated with psql on the throwaway workspace.

**Decisions made on my own (D-269).**
- Resolution is two passes, as the brief reads: a workspace list anywhere on the chain beats IntelCost rows nearer the node.
- A hidden default gives way to the first visible suggested crew; only IntelCost crews can be hidden.
- Workspace crews are not saved into rate sets; they are priced live from the set's crafts.
- Crew codes "W-" plus 10 hex digits of the uuid.
- A node list keeps the IntelCost crews it dropped as `hidden` rows (a record only).
- Crew rows carry `crew_name` so a deleted workspace crew still names them.
- The tree loads one level per request (children by parent code); search returns up to 200.
- The node editor's "Suggested for this scope" is the node's current list; "Other [trade] crews" is worked out in the browser from the catalog.

**Not smoke-tested by UI.** The orphans banner (API checked), editing and deleting a custom crew, Unhide.

**No longer matching.** Nothing known; spec "Workspace crew settings" and brief Step 6 were written with the code.

## Part 3. End-to-end Wage Calculator check: done, no bugs found

One Playwright pass (throwaway account and workspace, script deleted), 11/11:
1. Project with no drawing → Wage Calculator → Commercial, National Average, no ZIP: L-08, S-01, strip "National Average · Open Shop / Market Wage · Burdened (fully loaded) · No location".
2. Padded ZIP "6320": L-02 "We read this as ZIP 06320, New London, CT. Is that right?", Yes, L-04, saved.
3. Save after the location change: P-01 "Project info changed since rates were saved. Recalculate?", Recalculate; strip "Southeastern Connecticut Planning Region, CT".
4. Multi-county ZIP 78932: L-05 "covers Fayette County (55%) and Washington County (45%)", second county picked and saved.
5. ZIP cleared: back to L-08.
6. Public, Prevailing Federal, ZIP 79714, My wage data with tx115.txt: 19 crafts carry R-01 (Laborer $60.53, "Raised to local market rate (WD minimum $9.22)"), saved through B-02.
7. Open shop manual entry: Carpenter $6.00 shows M-01; at $38.00 the review gives $48.85.
8. Advanced settings: General liability 2.5% saved (stored 0.025), "New settings apply the next time rates are calculated."
9. One-page drawing, Commercial, Direct, National Average saved; a labor component on a CSI 26.04 item opened with Electrician + Laborer, Auto.
10. Direct: Labor burden line 48.7158% of direct labor, $23.81 on $48.86 of labor, the crafts' weighted burden (the set's average is 51.8680%).
11. R-04 Laborer $60.00 on review, S-02 confirm, the labor row following the saved rates now $60.

**Commits.** None: nothing to fix. Every failure during the pass was the script's (waiting on a refetch, a locator, the strip naming the county not the ZIP, B-02 rather than P-01 when the basis also changed); each was checked against the app before being put down to the script, once with a probe of the context refetch (it lands about 100 ms after S-01).

**Questions for you.**
- The Labor burden line shows four decimals ("48.7158%"). D-266 says "the effective percentage"; is two decimals (48.72%) what you want on the bid summary?
- Connecticut ZIPs show the 2022 planning region as the county ("Southeastern Connecticut Planning Region"). Fine for the strip, or should it read the old county name (New London County) that WDs before 2022 use (U-02 note in the spec)?

## Part 4. F16 billing spec draft: done (documents only)

**Written.** `docs/tasks/F16_SPEC_DRAFT.md`:
- scope;
- data model (`billing_plan`, `workspace_subscription`, `stripe_event`, optional `billing_invoice`, with the existing tier and AI tables kept);
- Stripe: Checkout with legacy's seat line items, a signed idempotent webhook, the customer portal legacy lacked, a bench fake;
- trials: per-tier length, mid-trial caps with their enforcement points, view-only on expiry, a subscription ending the trial;
- the plan checks replacing every F16 marker, by file and line (there is only one literal `TODO(F16)`, `wage_calculator/service.py:912`; the rest are F16 mentions in docstrings);
- AI credits: allowance, top-up Checkout, ledger;
- platform admin additions;
- existing workspaces (none paid; comp testers);
- a build order in seven blocks (A to G).

It ends with 16 "Questions for Umer". Research came from three read-only agents (legacy on `UmeralamDEV`, the current api and app, the decisions and notes).

**Commits.** infra: the workspace commit with this report (the draft lives in `docs/tasks/`, mirrored).

**Notable findings.**
- **Paid customers.** Nothing knows about paid subscriptions, so an expired trial makes every workspace view-only. The Wage Calculator's `on_trial` has the inverse gap: after expiry it lets PDF and AI through.
- **Legacy defects F16 should not copy:**
  - annual plans refill AI credits yearly;
  - owners can edit their own billing row;
  - the admin lock is checked on the client only;
  - cancelled or past-due subscriptions keep full access.
- **Contradictions for you:**
  - pack prices: D-236 against legacy;
  - Collaborator AI credits;
  - refund wording: the pricing page against the Terms.

## Part 5. P-02, recalculate after a settings change: done

**Built.**
- An admin who saves Advanced settings, when open projects have saved rates, is asked "Recalculate labor rates on [N] open projects?" (Recalculate / Not now). "Not now", or no such project, shows A-08 as before.
- Recalculate rebuilds each open project's current set from its saved inputs, the entered wage data and its R-04 rates, and saves it through the normal save. Following rows, the Labor burden markup and cached totals move.
- It runs in one request with a savepoint per project, and shows "[X] projects updated, [Y] skipped" with the reasons.
- D-270 reverses D-264 2, which now carries a superseded note.

**Commits.** api `8057eed`; app `e4a96dc`; infra: the workspace commit for D-270 and this report.

**Smoke 2/2.**
1. Two wage-data projects (Laborer $30 base, Carpenter $36, ZIP 06320, R-04 Plumber $88). General liability 6%, then Recalculate:
   - "2 projects updated, 0 skipped";
   - both Laborer rates $41.57 → $42.47;
   - the following labor row $42.47; the "Your rate" row stayed $99;
   - Plumber R-04 $88 kept; ZIP and basis kept.
2. 7% then Not now: A-08, rates unchanged.

**Decisions made on my own (in D-270).**
- "Open" = an Active status, not archived, not in Trash.
- Entries are rebuilt from craft rows that kept a base wage; there is no separate inputs table.
- One request, not Celery.
- National Average sets are still re-saved even though General liability does not move them (published figures); the count includes them.

**Question.** Should P-02 count only projects whose rates the change actually moves (wage-data sets, or any set when company benefits change), so that a General liability change on a workspace of National Average projects asks nothing?

## Part 6. F19 site stitching: done, except arcs in the site view

Blocks in the order built (the plan's list in `OVERNIGHT_PLAN.md`): A1, A2, B, C1, A3, E1, E2, E3, C2, D1, D2a, E4, E5, D2b1, D2b2, F1, D2b3, F2, C3, F3. Every block was gated, smoke-tested and committed before the next. Left: arcs in the site view (see the questions at the end).

**A1. Site engine and its Python twin: done.**
- `lib/takeoff/earthwork/site.ts`: `matchLinePairs` (arc length, either direction), `fitJoin`, `lineCheck`, `placeMember`, `toSite` / `toMember` / `fromSite`, `visibleRegion` (page halves per match line, the side holding the centre or the other side), `splitAtJoins`, `clipAreaToMembers` (members' territories never overlap: a later member loses what an earlier one holds), `rejoinRuns`, `slideOnMatchLine`.
- `app/features/earthwork/site.py`: `match_line_pairs`, `line_check`, `fit_join`, `place_member`, `to_site`.
- The quantity table has 10 site rows, the spec's hand-worked ones for these functions, 5 of them compared on both engines:
  - halves at 1" = 20' and 1" = 30';
  - the line drawn backwards;
  - a bent line on a sheet turned 90°;
  - a 1 % long line that warns;
  - a composed placement;
  - visible regions;
  - a split run (50 + 100 ft);
  - a clipped rectangle (3,000 + 6,000 sf) with a deduct (400 + 400);
  - rejoined pieces;
  - a slid join point.
- Smoke: the quantity table runs them in the bench's Chromium. They passed with every other row.
- Commits: app `0562f7e`, api `d4374c7`, infra `d63a933`.
- Decision (D-271, logged with the F19 work): a straight match line fits exactly both ways round, so the way that puts the two sheets' drawing centres on opposite sides of the line is kept; the spec's "smaller miss" decides only when the misses differ.

**A2. Tables and routes: done.**
- Migration `a7d2f9c4e816` adds `site` and `site_member` (one site per sheet), and gives `sheet_registration` a `kind` and two match lines (the pair index now includes the kind), plus `earthwork_result.superseded_by_site_id`.
- Routes under `/api/workspace/{ws}/project/{p}/site`: list, create (anchor), rename, delete, join a member (`PUT …/member/{sheet}`, the api fits the lines again with the twin; 409 on a 2 % length miss without Fit the scale; 409 with the merge question for a sheet in another site; `merge: true` carries that site in), `PUT …/regions`, and remove a member (joins dropped, a lone member dissolves the site, a leaving anchor re-bases the frame). Event `site.changed`.
- F18's registration routes now read survey links only.
- Smoke 7/7 (throwaway script against the routes, three calibrated sheets at 1" = 20', 30' and 20'):
  1. create;
  2. B joined at ground x = 100, placed (50, −20), the F18 list empty;
  3. a second site for a member refused, a 5 % long line refused;
  4. the merge asked, then merged with C at (280, 0);
  5. anchor removed: B at the origin, C at (230, 20);
  6. the last join removed: dissolved;
  7. rename and delete.
- Decisions: D-271 (join direction, merge on the join, regions from the browser, the anchor leaving).
- Commits: api `999a493`; infra: the workspace commit with D-271.

**B. Joining in the app: done.**
- **Match line.** On the Earthwork row next to Boundary, and "Join to another sheet at match line…" in a sheet's ⋮ menu, which opens that sheet's Earthwork tab with the panel. Both are the founder's Q2.
- **Join panel** (`features/takeoff/earthwork/site/useSiteJoin.tsx`):
  - pick the other sheet, which opens in Split view;
  - click the match line on both, with undo per side;
  - live checks on the engine: lengths and their % apart, turn, miss;
  - Fit the scale too, Keep the other side;
  - Join: creates the site when needed, sends both visible regions, asks the merge question on the api's 409;
  - lists the site's sheets with Remove from the site.
- **Sheets panel.** Site rows at the top ("Site: Page 1 site, 2 sheets" with the members) and "in site" chips. A site row's stitched canvas is Block C, not built.
- **Smoke 5/5** (throwaway, three calibrated sheets):
  - B1: Match line opens the panel; Page 2 opens on the right.
  - B2: two clicks on each sheet read "0.3 % apart, turn 0.0°, miss 0.20 ft"; Join made "Page 1 site" with Page 2 at (50.34, −19.90). The hand-worked answer is (50, −20); the gap is pixel clicking.
  - B3: the site row with 2 sheets and 2 chips.
  - B4: Page 3's ⋮ entry opened its Earthwork tab with the panel.
  - B5: removing Page 2 dissolved the site and the rows went.
- Decisions: D-271 5 to 7.
- Commits: app `0bde9f6`; infra: the workspace commit for D-271 5 to 7.

**C1. The stitched view, read-only: done** (Block C was split: C2 and C3 below).
- `features/takeoff/earthwork/site/SiteView.tsx`, opened from a site row in the Sheets panel, over the canvas.
- Each member's fit image is placed in feet by its placement and clipped to its visible region with a `clip-path` in its own page space, so the clip turns with it.
- Pan (drag), zoom (wheel and buttons, px per ft shown), Fit, Rotate (starting from the anchor's `view_rotation`). A member's label opens its sheet.
- Smoke 4/4:
  1. Two sheets at 1" = 20' and 30' joined at ground x = 100: both drawn, both clipped, Page 2 east of Page 1, the pieces meeting at the line. Checked on a screenshot, deleted after.
  2. Rotate: Page 2 below Page 1.
  3. Zoom in 2.42 → 3.02 px/ft, Fit back to 2.42.
  4. Page 2's label opened Page 2 and closed the view.
- Commits: app `ee37929`; infra: the workspace commit for this report.

**A3. The rest of Block A's engine: done.**
- `siteRuns` gives one Calculate's inputs for a site: the members' runs in the site frame, each kept to its own territory. Contour pieces meeting at the line are rejoined, spots on the line are kept once, and the members' boundaries are united into one. Output is on a page of 1 ft per point, so the existing TIN and volume engine read it unchanged.
- `stitchTrace`: joins traced ends facing across a match line. Flags "No partner across the match line", and "Elevation differs across the match line (710 / 711)" once per pair.
- 5 new quantity rows, now 15 site rows:
  - the plane z = 100 + 2x + 2y over two halves at 0.1 and 0.2 ft/pt against FG 103: cut 10,000/24/27 and fill 250,000/24/27 CY, the one-sheet answer, boundary 10,000 sf;
  - west all cut and east all fill, 500 CY each: alone they export 500 and import 500; as a site, neither line;
  - three traced contours joined; one at 711 flagged as a mismatch; one missing flagged as unpartnered.
- Decision (D-271 8): a site's boundary is the union of the members' own boundaries, each clipped to its territory, until Block D draws one boundary across the join.
- Commits: app `4520a23`; infra: the commit with the rows and this report.

**E1. Calculate a site, as a preview: done.**
- "Calculate" in the site view runs one Calculate over every member's EG, FG and boundary in the site frame (`siteRuns`), with one TIN per surface across the joins.
- It shows one cut, one fill and one balance with the project's assumptions ("Native soil taken as suitable until the assumptions are confirmed" when they are not). It is marked "Preview: not saved to the estimate."
- Smoke 2/2 (throwaway): a 120 × 100 ft pad over two sheets at 1" = 20' and 30', joined at x = 100, EG 100 and FG 102:
  1. Calculate read "Cut 0 BCY, Fill 889 CCY, Import 1,111 LCY";
  2. with the east half of the boundary deleted, "Fill 444 CCY, Import 556 LCY". The line's title in the script said it removed a scale; what it did was remove that boundary half.
- Commits: app `df8bd3c`; infra: the workspace commit for this report.

**E2. A site's result saved, its members superseded: done.**
- API: migration `b3e8c1d5f972` adds `earthwork_site_result`, `takeoff_item.earthwork_site_id` and `earthwork_superseded`. The sheet-line unique index now covers sheet lines only, and a second one covers site lines.
- Routes `GET …/site/result/all`, `PUT …/site/{uuid}/result` (with lines), `DELETE …/site/{uuid}/result`. Member results carry `superseded_by_site`; items carry `earthwork_superseded`.
- Clean-ups: a member leaving, dissolving and deleting the site give the members' own results and lines back, and a member leaving marks the site's lines stale. A member's own Calculate under a saved site result keeps its new lines out of Estimating.
- App: "Save to estimate" and "Remove result" in the site view. The site's lines are named "[site]: …". Estimating leaves superseded lines out. The volume panel shows "Superseded by Site X".
- Smoke 4/4 (throwaway, the E1 pad with each sheet's own Calculate saved first, 444.44 CCY each):
  1. Estimating showed both sheets' own "Remaining Site Fill";
  2. Calculate then Save: site lines "Pad: Remaining Site Cut" 0, "Pad: Remaining Site Fill" 888.89, "Pad: Soil Import — Engineered Fill (889 BCY)" 1,111.11; the 4 own lines superseded; both results "Superseded by Site Pad";
  3. Estimating showed "Pad: Remaining Site Fill" 888.89 CCY and no own fill line;
  4. Remove result: both own lines back, no result superseded.
- Plus an API check: a member's own Calculate under the saved site result wrote its new line superseded.
- The volume panel's "Superseded by" banner was not driven in the browser; the API field it reads was checked.
- Decisions: D-271 9 to 12.
- Commits: api `96dab3a`; app `e8bb51c`; infra: the workspace commit for D-271 9 to 12 and this report.

**E3. The site goes stale: done.**
- `features/takeoff/earthwork/site/siteKey.ts` is the site's surface and version key, shared by the view and the check.
- `useSiteStale`: while a member sheet is open, it compares the site's live key with the saved one and marks the site's lines stale once (`POST …/site/{uuid}/result/stale`). The site view shows "Stale: a sheet of the site changed since. Calculate again and save."
- Smoke 2/2 (throwaway):
  1. saved, then opened again: 3 site lines, none stale;
  2. an FG spot on the east sheet moved to 103: opening that sheet marked all 3 lines stale, and the view said so.
- The first run of line 2 failed because the script changed a spot on the match line itself. The site keeps the anchor-nearest copy of such a spot, so its key rightly did not move (D-271 13).
- Commits: api `482220c`; app `a089081`; infra: the workspace commit for D-271 13 and this report.

**C2. Live pdf.js renders in the site view: done.**
- `MemberRaster` draws each on-screen member with pdf.js over its fit image, through the canvas's caches (refcounted documents, bitmap budget), at the screen's resolution for the member's own scale.
- Up to 4,096 px it draws the whole page; above that, the window the screen shows, mapped back through the view's turn and the placement. A member off screen holds no raster.
- Snap, Snap PDF and Find Text across members are left with drawing (D).
- Smoke 3/3:
  1. at fit, Page 1 had a 381 px bitmap for 380 px on screen, Page 2 571 for 570;
  2. at 32.5 px/ft, Page 1 drew a 36.5 of 170 ft window and Page 2 a 37.9 of 255 ft window;
  3. panned so Page 1 left the screen, only Page 2 was drawn.
- **Bench finding:** the bench's S3 bucket sends no CORS headers to the bench browser's origin, so no sheet PDF opens in the bench browser at all; the main canvas falls back to fit images too. The C2 smoke routed the bucket's responses through Playwright and added the header. Worth fixing in the bucket's CORS for `http://localhost:5173`.
- Commits: app `b96b68c`; infra: the workspace commit for this report.

**D1. Drawing across the join: done** (Block D was split: D2a and D2b1 to D2b3 below).
- Linear, Area and Count in the site view, into a chosen item. Straight segments: Enter or double click finishes, Backspace takes back a point, Esc stops.
- A run is split at the match lines, an area clipped to each member, a mark kept on the member it falls in. The pieces are saved on the members' own sheets with one `site_shape` id, so each sheet's quantities add up to the whole.
- The members' shapes show in the view, each clipped to its member's side.
- Smoke 3/3 (throwaway, two sheets at 1" = 20' and 30' joined at ground x = 100; each item started with a shape of its own on the west sheet):
  1. a curb from x = 60 to 160 saved as 2 pieces (one per sheet, one `site_shape`); Curb 110.00 LF (10 + 100);
  2. an 80 × 40 area saved as 2 pieces; Paving 3,300.0 SF (100 + 3,200);
  3. a mark east of the line saved on the east sheet only; Light 2 EA; 8 shapes drawn in the view.
- Commits: app `a83cf91`; infra: the workspace commit for this report.

**D2a. Contours and the boundary across the join: done.**
- EG and FG contours (elevation typed) and the work boundary are drawn in the site view and split per member. Contour pieces go into their surface's container; the boundary replaces each member's own.
- The site Calculate reads them as one contour per elevation and one boundary.
- Smoke 3/3 (throwaway, two sheets joined at x = 100):
  1. a 120 × 100 boundary saved as 2 pieces, and the west sheet's own boundary was replaced;
  2. EG 100 and 104, FG 102 twice, each drawn across: 8 contour pieces;
  3. Calculate read "Cut 148 BCY, Fill 148 CCY, Balanced on site", the hand-worked answer: the EG plane between y = 30 and 110 against FG 102 over a 100 ft width gives 4,000 ft³ each way.
- **Three bugs found and fixed while getting there:**
  - the sheets' labels took a drawing click (and opened the sheet), now inert while drawing;
  - the boundary pieces did not unite across the join (a 1e-10 ft float sliver from each territory's edge), now snapped to 0.001 ft after the clip;
  - the site Calculate read the page's item list before it refetched, so a contour drawn a moment before was missed ("All points are collinear"); it now fetches the items fresh, as a sheet's Calculate does.
- Also, on the way: a TIN leaves out contour points outside the boundary, as a sheet's does. My first test drew every contour outside the boundary, and that, not the app, gave nothing to triangulate.
- Decisions: D-271 14, 15.
- Commits: app `d162771`; infra: the workspace commit for D-271 14, 15 and this report.

**E4. Site Features and Strip Areas in a site Calculate: done.**
- Each member's Site Features and Strip Areas, as its own sheet reads them, are carried into the site frame and kept to its territory. A feature drawn across the join is one feature; a strip stays its member's (D-271 16).
- The site preview now shows Strip, Undercut and Prep beside the cut and fill. Its balance is the one the lines price, so topsoil kept for reuse counts.
- Quantity table: 2 new rows, both right first time (17 site rows):
  - a 0.5 ft strip on each half strips the whole 10,000 ft² site, and the stripped grade's cut and fill match the hand-worked plane;
  - a feature across the join is one feature (undercut 2,000 ft² at a 5 ft offset, prep 1,200 ft²), and a strip made from it on one member strips only that member's 400 ft².
- Smoke 3/3 (throwaway). Setup: a 120 × 100 ft boundary, an EG plane against FG 102, a 40 × 20 ft Pad across the join (undercut 2 ft at 5 ft, prep 1 ft), and a 0.5 ft strip on each member.
  1. Calculate read "Cut 91 BCY, Fill 313 CCY, Strip 222 BCY, Undercut 111 BCY, Prep 800 SF", the hand-worked answer.
  2. Save to estimate wrote the site's lines under "Grade: …": two strips at 111.1, undercut 111.1, prep 800, cut 90.7, fill 313.0. Checked in the database: the script's own read of the item list misread the response shape, a script fault.
  3. A strip's depth changed on member B: the view showed "Stale: a sheet of the site changed since".
- Decisions: D-271 16.
- Commits: app `6b7530a`; infra: the quantity rows, D-271 16 and this report.

**E5. Q14, the site's lines grouped under its name: done (api only).**
- The site's lines are filed in a folder named after the site, under the earthwork folder. Estimating groups them under it, by division and by custom folder alike.
- The folder follows a rename and is dropped once its lines are gone.
- Each line's Takeoff Ref. is the sheets it comes from:
  - a strip's lines: its strip's sheet;
  - a feature's lines: the members it is drawn on;
  - the rest: every member.
- This needed no app change: Estimating already groups by folder and reads chips from `sheet_uuids`.
- Smoke 4/4 (throwaway):
  1. Takeoff Ref.: Topsoil West on A, Topsoil East on B, the Pad's undercut on A and B, the Remaining Site on A and B;
  2. Estimating shows a "Grade" group with the site's 10 rows;
  3. after a rename, the group reads "Grade North" and the old one is gone;
  4. Remove result took the lines and the folder (checked in the database: no "Grade" folder left).
- Decision made alone: Reports are time reports in this app, so Q14's "and Reports" has nothing to group yet; the Excel export follows Estimating's groups (D-271 17).
- Commits: api `100b209`; infra: D-271 17 and this report.

**D2b1. Select, move and delete across the join; undo: done.**
- A click picks the shape under it; a shape drawn across the join selects whole (a bar names it: "2 pieces on 2 sheets").
- A drag moves it: the pieces are made whole, moved and split anew at the match lines. Delete removes every piece.
- Undo (Ctrl+Z or the button) takes back the site view's last drawing, move or delete as one step.
- The keys are taken before the sheet canvas underneath, so it never deletes or undoes as well (D-271 18).
- New file: `siteEdit.ts` (pieces in the site frame, hit test, whole, place).
- Smoke 5/5 (throwaway):
  1. a Linear run drawn from ground x 60 to 140 saved as A 60..100 | B 100..140, and a click selected both pieces;
  2. dragged 50 ft east, it is one piece, B 110..190;
  3. dragged 80 ft back west, it is split anew, A 30..100 | B 100..110;
  4. Ctrl+Z gave back B 110..190;
  5. Delete left 0 pieces, and Ctrl+Z brought B 110..190 back.
- Decisions made alone:
  - a member's own shape moves on its sheet without a re-split, so its hidden part is kept;
  - no redo in the site view;
  - copy, the join-point slide (Q9), arcs, Ortho and Snap are left for D2b's rest.
- Commits: app b3d4595; infra: D-271 18 and this report.

**D2b2. The join-point slide (Q9): done.**
- A selected shape shows handles; a join point is round. Dragged, it slides along its match line with both pieces' copies.
- Any other vertex stays inside its member's visible region. One write, one undo step (D-271 19).
- Smoke 4/4 (throwaway):
  1. a run from x 60 to 140 showed 2 end handles and 1 round join handle;
  2. the join handle dragged to (130, 80) slid to (100, 80): A (60,50)-(100,80) | B (100,80)-(140,50);
  3. an end dragged off A's page to (-20, 50) was held at (0, 50);
  4. Ctrl+Z put it back at (60, 50).
- Decision made alone: a drag off the line is projected onto the line, rather than refused (Q9 says "moves along the match line only").
- Commits: app 8663804; infra: D-271 19 and this report.

**F1. The C-200 acceptance row (Q16): done, with a finding.**
- A quantity row on C-200's frozen linework (`c200-acceptance.json`; Hidden Valley itself not touched):
  - west and east crops (0 to 60 % and 40 to 100 %), the match line at 50 %;
  - each crop's runs clipped to its page, as its trace gives them;
  - joined, stitched and calculated against C-200 as one sheet.
- It passes to the cent: cut 9,184.1604 against 9,184.1569, fill 8,050.2574 against 8,050.2573, the export equal.
- **Two fixes in `siteRuns` came out of it** (D-271 20):
  - a cut point is dropped after the rejoin where it lies straight between its neighbours, so a contour is its linework again;
  - the site frame is square. The old frame stretched with the drawing's proportions, which moved the TIN's triangles whenever something was drawn further out.
- **Finding: the sheet engine's TIN depends on the page's proportions.** It triangulates in normalised page space, x and y scaled apart:
  - C-200 alone gives 9,021.24 cut and 7,692.42 fill;
  - in true geometry it gives 9,184.16 and 8,050.26 (fill +4.6 %);
  - the same linework with x stretched by 1 / 0.6 gives 9,110.21 and 8,068.22.
  So against today's sheet engine, a site and its sheets differ by this effect, not by the stitching. I left the sheet engine as it is: it is legacy's, and every saved sheet result would move. **Question for Umer** (below).
- Spec mismatch: the row clips the adopted linework rather than running Auto Trace on raster crops (Auto Trace stitched in the app is not built yet).
- Smoke 1/1 (throwaway, the square frame in the browser): the E4 setup's site Calculate read the same numbers, Cut 91, Fill 313, Strip 222, Undercut 111, Prep 800.
- Commits: app aa81693; infra: the acceptance row, D-271 20 and this report.

**D2b3. Snap, Snap PDF, Ortho and Duplicate in the site view: done.**
- Three toggles on the site view's row:
  - Snap: the members' shapes;
  - Snap PDF: the printed lines of the member under the pen, through its placement;
  - Ortho: 45° steps from the last point.
- A Duplicate button on the selection bar copies the shape 10 ft over, split anew (D-271 21).
- Smoke 4/4 (throwaway):
  1. a point 1.5 ft from a run's end showed the vertex mark and landed on it, giving (60,50)-(60,90);
  2. Ortho with Snap off: a point 3 ft off level landed level, (20,150)-(60.11,150);
  3. Snap PDF: a point near the printed border's corner landed on it, (20,44.44);
  4. Duplicate copied the run across the join to A (70,60)-(100,60) | B (100,60)-(150,60).
- **One bug found and fixed:** a shape made whole (a move, a copy) kept the point its pieces met at as a redundant vertex, so a copy carried an extra vertex at (110, 60). It is now dropped where straight.
- Decisions made alone:
  - the toggles' defaults (Snap on, Snap PDF and Ortho off), not saved;
  - Copy as a Duplicate 10 ft over, not copy-and-place;
  - no arcs in the site view yet.
- Commits: app 1abec00; infra: D-271 21 and this report.

**F2. Auto Trace on the stitched drawing: done.**
- Trace in the site view:
  - traces each member's page (the sheet's read, cache and worker);
  - keeps each line to the member's side (`clipTrace`);
  - stitches the pieces at the match lines;
  - lists and rings the flags amber.
- "Adopt labelled" saves each labelled line as one contour across the join, undone as one step (D-271 22).
- Quantity table: 2 new rows (20 site rows):
  - three contours traced past the line on both sheets are clipped and joined, 3;
  - a closed loop across the line is one piece a side, joined as one.
- **One real bug found and fixed:** the site engine's region rings were open, so a region whose last edge is the match line was never cut there. The east sheet's traced lines came through whole, and `siteRuns` would have mis-clipped an anchor whose region ends on its match line (D-271 23).
- Smoke 3/3 (throwaway, on a two-page PDF made for it: wavy contours labelled in gaps, 705 on both sheets, 710 on A against 711 on B, 715 on A only):
  1. Trace read "4 lines traced, 1 joined across the match line, 4 labelled" and flagged "Elevation differs across the match line (710 / 711)" and "No partner across the match line";
  2. Adopt labelled saved A:705 B:705 (one site shape) and A:710 A:715 B:711;
  3. Ctrl+Z left 0 contours.
- Decisions made alone:
  - unlabelled traced lines are not adopted from the site view (no elevation suggestions there yet);
  - the trace reads the whole page, then clips.
- Commits: app 577357a; infra: the two rows, D-271 22 and 23, and this report.

**C3. Find text across the site: done.**
- A Find box on the site view's row searches every member's printed text. A hit counts only on its member's visible side; hits are ringed, and Next steps through them (D-271 24).
- Smoke 2/2 (throwaway, a PDF made for it: "MH-1" at ground x 40 and 120 on A, 150 and 70 on B):
  1. searching "mh-1" found 2, at x ≈ 43 and 155; the two copies past the match line were not found;
  2. Next moved to the other hit. The view's centring was not asserted.
- Commits: app b0da072; infra: D-271 24 and this report.

**F3. A traced line adopted alone: done.**
- With the trace shown, a click on a traced line opens a prompt: its elevation, pre-filled from its label or the wand's suggestion, and "Adopt this line".
- The person confirms: a suggestion is never adopted on its own (D-144, D-271 25).
- Smoke 2/2 (throwaway, a PDF with 705 and 715 labelled and an unlabelled line between, on both sheets):
  1. a click on the unlabelled line opened "FG line, 2 pieces". The pre-fill was empty: this drawing gave no suggestion, so the suggestion path was not exercised here;
  2. 710 typed and adopted: A:710 and B:710 under one site shape.
- Commits: app c2a0ea8; infra: D-271 25 and this report.

**Part 6 ended after F3** (08:20). Then the regression pass below and this report.

## Regression pass over the earlier F19 smokes

After F3 I re-ran the earlier F19 smokes against the finished code, since later blocks changed shared pieces: the square site frame, closed rings, the site view's key handling, and the site lines' folder and Takeoff Ref.
- They were rebuilt from this session's transcript (throwaway, deleted after). A2 7/7, B 5/5, C1 4/4, D1 3/3, E1 2/2, E2 4/4, E3 2/2: 27 of 27.
- No regression.
- The first attempt failed B, E2 and E3, for reasons in the scripts and in me, not the app:
  - the rebuilt scripts lacked fixes made to them during the night by shell commands (B's sheets are "Page N", E2 reads "Site Fill", E3 moves a spot off the match line);
  - I purged the fixture workspaces while E2 was still running.
- C2 and D2a were not re-run: too many of their night fixes were shell commands to rebuild faithfully. Their paths were driven again by the later blocks' smokes (live renders under every site-view smoke; contours, boundary and Calculate under E4).

## Questions for Umer

1. **Labor burden decimals** (Part 3). The bid summary shows "48.7158%". Two decimals (48.72%)?
2. **Connecticut counties** (Part 3). The strip names the 2022 planning region ("Southeastern Connecticut Planning Region"). Should it read the old county (New London County), which pre-2022 WDs use?
3. **P-02 scope** (Part 5). Should the prompt count only projects whose rates the change moves, so that a General liability change on a workspace of National Average projects asks nothing?
4. **F16** (Part 4). The 16 questions at the end of `docs/tasks/F16_SPEC_DRAFT.md`. The ones that block a build are 1 (the trial's plan), 4 (refill timing), 5 (failed payment and cancellation), 6 (seats against members) and 8 (refunds: the pricing page against the Terms).
5. **The sheet TIN's page proportions** (Part 6, F1, D-271 20). A sheet's TIN is triangulated in normalised page space, x and y scaled apart, so its volumes depend on the page's proportions:
   - C-200 alone gives 9,021.24 cut and 7,692.42 fill;
   - triangulated in true geometry it gives 9,184.16 and 8,050.26 (fill +4.6 %).

   The site engine now triangulates in true geometry. Should the sheet engine too? It is legacy's behaviour, and every saved sheet result (Hidden Valley's included) would move once recalculated. I changed nothing there.
6. **Arcs across a match line** (Part 6). An arc is stored as a circle in its own page's normalised space (`{cx, cy, r, a0, sweep}`). Carried through another member's turn and page proportions, it is a rotated ellipse, which that model cannot hold. Options:
   - (a) an arc drawn in the site view must stay on one member, refused when it crosses a line;
   - (b) a general elliptical arc in `shape_meta`, read analytically by both engines. This is a spec change under hard rule 3.

   I recommend (a) now. Nothing was built.
7. **The site view's undo** (Part 6, D-271 18). The site view keeps its own undo (no redo), separate from the sheet canvas's history. Is that enough, or should a site step also show in the canvas's history?
8. **The Wage Calculator on the board.** It has no row in FEATURES.md or MANAGER.md; its steps are tracked in the api's `docs/wage-calculator/`. Add an F-row for it?

## Spec and brief mismatches

- **Parts 1, 2, 3 and 5:** none found. The Step 5 and Step 6 spec sections and brief were written with the code.
- **Part 4:** three contradictions for you, inside the F16 material (pack prices: D-236 against legacy; Collaborator AI credits; refund wording).
- **Part 6 (F19), each recorded in D-271:**
  - **Q16, the acceptance row:** it clips C-200's adopted linework into the two crops rather than running Auto Trace on raster crops. It holds "to the cent" against C-200 triangulated in true geometry, not against the sheet engine as it is (question 5).
  - **Q9:** a join point dragged off the line is projected onto it, not refused.
  - **Undo:** the site view's own undo, not the session history the spec names (question 7).
  - **Copy:** a Duplicate 10 ft over, not a copy and place.
  - **Arcs** in the site view: not built (question 6).
  - **Find Text** in the site view uses the sheet's default match (every word, contains, any case), with no mode choice or results list.
  - **Unlabelled traced lines:** adopted one at a time, the person confirming the elevation (D-144). "Adopt labelled" takes labelled lines only.
  - **Q14's "and Reports":** Reports are time reports today and carry no lines.

## Named stash

None. Every part and block was finished, gated, smoke-tested and committed before the next; nothing was stashed.

## Commits by repo, overnight

Times are the commit clock (UTC−5).
- **api** (`intelcost-app-fastapi`):
  - Wage Calculator: `893888a` (Step 5), `ed9099c` (Step 6), `8057eed` (P-02), plus the earlier `8a64edf` (BUILD_BRIEF line 78);
  - F19: `d4374c7` (A1), `999a493` (A2), `96dab3a` (E2), `482220c` (E3), `100b209` (E5).
- **app** (`intelcost-app-react`):
  - Wage Calculator: `c4e882a` (Step 5), `ed80c1e` (Step 6), `e4a96dc` (P-02);
  - F19: `0562f7e` (A1), `0bde9f6` (B), `ee37929` (C1), `4520a23` (A3), `df8bd3c` (E1), `e8bb51c` (E2), `a089081` (E3), `b96b68c` (C2), `a83cf91` (D1), `d162771` (D2a), `6b7530a` (E4), `b3d4595` (D2b1), `8663804` (D2b2), `aa81693` (F1), `1abec00` (D2b3), `577357a` (F2), `b0da072` (C3), `c2a0ea8` (F3).
- **infra** (`intelcost-infra`): the quantity rows (`d63a933`, `016b06d`, `a5246f2`, `21b1a3b`, `bf29ba0`), and a workspace mirror commit after every block (DECISIONS D-268 to D-271, the specs, this report, SINCE_ARCHIVE, MANAGER and FEATURES), last `fe6a28d`.

All on `umer-dev`, pushed. Legacy untouched. Hidden Valley Spec's earthwork data untouched (the acceptance row reads the frozen `c200-acceptance.json` in infra).
