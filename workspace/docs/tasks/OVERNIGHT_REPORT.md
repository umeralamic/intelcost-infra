# Night report, 2026-10-24: My equipment (F34) and the full fixture suite

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:42 UTC. Updated after every block.

## Part 1: My equipment

| Block | Status | Commit(s) | Gates | Quantity table | Smoke (throwaway) |
|---|---|---|---|---|---|
| A (D-760) | Done 02:10 UTC | api 8cdabab | ruff, ruff format, mypy (242 files), `alembic check` clean | passed: 344 rows, 71 equipment rows, unchanged | Through the api on "zz MyEq Night": bundle 628 classes, list empty, show all; 3 keys added; unknown key 404; type "Hydraulic excavator" in Earthwork +19 (21 of the type) then −21; a custom machine joined on create; in-use 28 starter tier classes + the custom one; mode on/off; starting list added 1, stamped offered, mode on; an activity's Show in suggestions off (not marked edited); 9 audit rows `library.*` |
| B | Done 02:35 UTC | app 539084e | eslint, tsc, build | passed: 344 rows, unchanged | Owner on "zz MyEq Night": ticked EX-CRAWL-17T and -30T in the grid and -20T in the class detail → "My equipment (3)", type bar 3 of 21; Show my equipment only → the starting list offered 29 classes in use (EX-CRAWL-20T "1 in estimates · 7 in earthwork tiers"), ADT-25T unticked → Save 28 → mode "mine"; Hydraulic excavator Take all off → "1 of these are used in estimates; they keep pricing" → 0 of 21; reload kept mode and 23. Second throwaway (estimator, "Manage workspace library" turned off for the role): radios disabled with "ask a workspace admin", 0 checkboxes, no bulk bar, "Yes" in the column, api write 403. Found and fixed: the checkbox waited for the bundle before it moved (now shown at once); "1 of these are" → "is" |
| C | Done 03:10 UTC | app a71d085, infra 0753b3c | eslint, tsc, build | passed: 344 rows, **76 equipment rows** (5 new: a default workspace is offered 628 classes, none under My equipment; mine-only with 3 on the list offers exactly those first, folded rest, full search 628 national + 1 custom = 629; EX-CRAWL-30T on the starter check $16,471.70 on the list, off it, and off it in mine-only mode) | Throwaway in mine-only mode with a list of 3 (EX-CRAWL-20T, ADT-30T, DZ-CRAWL-D5): Add Equipment on "TEST cut" listed exactly those 3 under My equipment with the company's rates, no library list until "Search the full library"; searched "loader wheel" (15), picked WL-MINI-07Y, "Add to my equipment" put it on the list (4). Shared equipment › New resource: focus listed the 4; "excavator" → My equipment EX-CRAWL-20T first, "Search the full library (34 more)"; a library pick showed "Add to my equipment". Tier editor (Excavate and load): 4 offered, 629 with "search the full library"; 9 tier machines off the list read "Not in your equipment list" with Add, the 9 on it nothing (Q4, built here for D). Found and fixed: the picker's hidden category/type narrowed My equipment after a pick; the rate summaries lost their "$" in the edit (fixed before commit) |
| D | Done 03:45 UTC | api bcf5e05, app 58f63f2, infra 17db4af | eslint, tsc, build; ruff, mypy | passed, plus the new row **hidden activities: 27 roles (18 mapped) at 3 quantities, priced the same** (a temporary workspace made and rolled back in one transaction; nothing left behind) | On "zz MyEq Night": A2 "Excavate and load (direct to haul-off trucks)" Show in suggestions off → the undercut role's own mapping reads "Starter: Excavate and load (direct to haul-off trucks) (not in suggestions)", the cut role is not offered A2, kept after a reload. Release banner: a bench-only release 3 adding one TEST class (TEST-REL3-EX), applied and rolled back within the check → "1 new machine in release 3, not in your list: review", the row's Add to my equipment cleared the line; bench back at release 2, 628 classes. Not driven in the browser: a hidden activity's lines priced on a real estimate (no earthwork lines on a throwaway tonight; the quantity-table row is the evidence) and the site-spread machine note (same component as the tier editor's, driven in C). Found and fixed: the Show in suggestions box waited for the server (now at once) |
| E | Done 03:55 UTC | infra (workspace mirror) | full: eslint, tsc, build; ruff, ruff format, mypy, `alembic check` | full table passed (344 rows, 76 equipment rows, hidden activities row) | End to end on "zz MyEq Night" back in "Show all": the component picker lists My equipment (4) first with nothing typed; "excavator" → EX-CRAWL-20T under My equipment, then "Library" with the other 34, the listed one not repeated, nothing folded (Q3). F34 is 🔨 Working in FEATURES and In Progress on MANAGER, awaiting the founder's check |

## Part 2: the fixture suite

**Restored** (04:00 UTC): `./fx-suite.sh setup` restored tag `fixtures-archive-2026-09-28` into `intelcost-infra/fx-suite`
(git-ignored), laid today's guarded helpers and `fx-suite-updates/` over it and retargeted it at the fx stack (D-611):
its own api (8020, 8030), worker, built apps (5176, 5177), database `intelcost_fx` (migrated to d759 on start), Redis
1, MinIO bucket `intelcost-fx`, MailHog only, its own Stripe fake. The isolation check passed. The api and app tags hold
no test files (they mark the archive commit only), so nothing was restored into those repos.

**First full run** (04:05–05:45 UTC, `fx-suite/run-all.sh`, built apps, three at a time):
- **Standing list** (`regress.sh full`): 102 fixtures, **41 passed, 61 failed**.
- **The 29 fixtures added since the tag** (D-636 on): **19 passed, 10 failed**.
- Every failing step was triaged against its log, its screenshot, today's code and DECISIONS.md (six read-only
  investigators, one more for the 29), notes in `intelcost-infra/fx-suite/.triage/`. Then each was fixed in the app
  (a), updated to its decision (b), retired (c) or its harness fixed (d), and run again on its own.
- **The final full run** (after every fix, two at a time): see "Final run" below.

**What made most failures (shared causes):**
1. **D-752, one owned workspace** (≈20 fixtures): a fixture's second `createWorkspace` was a 409. Fixed once in the
   harness (d): `browser/lib/bench.mjs` `createWorkspace` has a fresh throwaway owner make the workspace and seat the
   asking account as admin (`{ seatAsker: false }` leaves it out). Where the claim needs the account to *own* the
   second workspace (transfer, billing, seats: f3-s9, f3-s12, f3-s2, c30, f8-s15), the fixture gives it its own owner.
2. **Project Home and its file browser are gone (D-315), seed folders too (D-309)** (≈15 f4/f8 fixtures): rewritten
   against the Edit Project dialog and the load screen's tree, folders made by the fixture (b); the parts whose screen
   was deleted outright retired (c, below).
3. **The projects list is the All projects dialog (D-314), sign-ins land on Account settings (D-566), new signups skip
   the naming step (D-311)**: scoped to the dialog, its own state, its row menu (b).
4. **Sub-item rows drawn in both panels (D-709)**: locators scoped to the Takeoff panel (f6-b, f6-e, c12).
5. **Absolute zoom opening at Fit (D-35, D-76, D-101..D-103)**: f5-s10, f5-s11, p20a, proof-backlog updated.
6. **Dev-only modules**: seven fixtures import `/src/...` in the page, which the built fx apps cannot serve (D-619
   already listed them "dev server only"). Run on the fx dev servers instead: **f3-s1 5/5, f3-s13 5/5, f4-s2 6/6,
   f5-s3 2/2, f6-s4 3/3, f7-a 8/8, r1-raster-text 2/2**.
7. **Environment, found and avoided:** an api edit hot-reloads api-fx mid-run (c20, c21 failed on it), and
   `regress.sh`'s end-of-run purge deletes every fx account's workspaces under any fixture still running. Neither is a
   product fault; both reruns passed.

**(a) App bugs the fixtures found, fixed tonight** (gates, quantity table and a rerun of the fixture after each):
| # | Fault | Found by | Commit |
|---|---|---|---|
| 1 | Saving a site machine marked its unchanged count and work day as typed (Decimals compared as strings, "2" vs "2.0000"), so Apply tier kept the old count | c32 | api 9f1ec9e |
| 2 | "Take all off" could run before the in-use counts loaded, skipping the Q7 warning | c34 | app 4fefdfa |
| 3 | An offline sign-in hung on "Signing in" (D-706's offline hold caught the anonymous login), never saying there is no connection | f2-s3 | app c7db273 |
| 4 | The api still named a function `is_admin` (F3-S3/D-23 forbid it; D-621 renamed only the app's) | f3-s3 | api 7550a50 |
| 5 | A seat that cannot create projects got the reason only on hover | f4-s1, f4-s7 | app b72c057 |
| 6 | Edit Project offered an enabled Save (and live fields) to a seat the api refuses (403) | f4-s10, f4-s14 | app b72c057, d709c2d |
| 7 | The delete-sheets confirmation said "No measurements are affected." before the items were read | f5-s14 | app b72c057 |
| 8 | A project in Trash still resolved by its link (no "Project not found") | f4-s15, f4-s20 | api 8ef4da6 |
| 9 | A link to a missing project: Edit Project covered "Project not found" and its way back | f4-s20 | app d709c2d |
| 10 | A project trashed while open in another window kept showing | f8-s16 | app d709c2d |
| 11 | The link prompt's submit (Scope of Work) submitted and closed Edit Project | f4-s24 | app d709c2d |
| 12 | The load screen kept "Uploading 0 of 1 · 30%" offline, never "Paused…" (the tray steps aside under it) | f4-s7 | app d709c2d |
| 13 | Override quantity let Save through without the reason the api requires, then closed on the refusal | proof-backlog | app d709c2d (D-761) |
| 14 | The first-run load screen opened over All projects (`?projects=open`) | f4-dialogs, f4-s7 | app d709c2d |

**(b) Updated to a logged decision** (each file's header names its changes and D-numbers): f2-s1b (D-311), f3-s2 and
its drive (D-277 1 and 19), f3-s8 (D-87), f4-s1, f4-s5, f4-s6, f4-s7, f4-s8, f4-s10, f4-s11, f4-s14, f4-s15, f4-s16,
f4-s17, f4-s18, f4-s19, f4-s20, f4-s21, f4-s23, f4-s24, f4-s26, f4-dialogs (D-87, D-309, D-311, D-313, D-314, D-315,
D-325, D-622), f5-s4 (D-310, D-314, D-315), f5-s10, f5-s11, p20a (D-35, D-76, D-100..D-103), f5-big step 5 (D-288,
D-304), f6-b, f6-e, c12 (D-709), f7-e (D-712), f8-s7, f8-s15, f8-s16, f8-s18 (D-72, D-81, D-311, D-314, D-315, D-619),
n11 (D-694), proof-backlog (D-35, D-51, D-55, D-77, D-79, D-81, D-103, D-336, D-506).
**Expected values changed, each by its decision:** f3-s2 AC4 Essentials keeps billing (D-277 19); f4-s14 AC1 Edit
Project offers Assigned To (D-315 1); f4-s7, f4-s8, f4-s26 a new project's folders are none (D-309 1); proof-backlog
the zoom ceiling 4000% (D-35); f3-s12 AC2 counts the second workspace's rows against a baseline, since its throwaway
owner's seating writes some (D-752).

**(c) Retired**, the behaviour itself removed (named in each file's header): f4-s5 "?tab= and the sort survive a
reload" and f4-s11's URL filter half (D-314 2: the dialog's state is its own); f4-s20 step 3, Project Home's loading
skeleton, and its header's Edit details / Estimating reason / Perform Takeoff (D-315 C5); f4-dialogs' "Where should
this folder go?" (DestinationPicker, D-315 C5); f4-s17 steps 6 and 11 (Upload folder into a project, Unfinished uploads,
D-315 C5); f4-s19's folder count badges (FolderCountBadge, D-315 C5; the counts are still checked on the api); f5-s4
step 6 (Project Home's Perform Takeoff, D-315 C5, D-314 2); f3-s10's and f8-s15's header logo, f8-s15's standing badge
(D-625, D-311 5, D-619); f8-s18's inline properties pane (D-77). Nothing for access keys, request-access, trades or the
retired platform pages failed: those fixtures were already gone from the tag.

**(d) Harness, what it checks unchanged:** D-752 (above); waits for the reads a screen judges on (f5-sheet-items,
f5-s14, c15, f8-s15, f8-s16); f8-s4 switches workspace in the page (D-705) and finds the realtime client on the built
app; f8-s13 measures the flood on the sender's clock (D-614); proof-backlog builds its own world (it signed in as the
founder's seeded account, which the guard refuses).

**Not run in the first pass (D-611, D-761):** f8-s5 and f4-s27 stop Redis and MinIO, which the live bench shares;
f8-s2, f8-s3, f8-s8, f8-s12 and f5-s2 restart the bench's own api, api-b and worker by name; f5-s9 needs a seed flag that
no longer exists; d27-uploads needs beat. The restart fixtures were then pointed at the fx services (see "Final run").

### Final run (2026-10-24, after every fix; `fx-suite/run-final.sh`, two at a time, built apps)

**Totals: 142 fixtures run, all passing as they stand. 5 not run, each for a stated reason.**

Counting each fixture by its last run: in the full run, a solo rerun (timing), or the fx dev servers (dev-only).

| Set | Run | Passed in the full run | Then |
|---|---|---|---|
| Standing list (`regress.sh full`) | 102 | **92** | the other 10 pass: 6 on the dev servers, 3 solo, 1 after a fix (below) |
| Added since the tag (D-636 on) | 29 | **28** | r1-raster-text is dev-only: 2/2 on the dev servers |
| New tonight, c32–c38 | 7 | **7** | c32 5/5, c33 4/4, c34 7/7, c35 5/5, c36 6/6, c37 3/3, c38 5/5 |
| Restart fixtures, now on the fx services (D-765 5) | 4 + 2 helpers | after their updates, all | f8-s2 3/3 and its outage 1/1, f8-s3 3/3, f8-s8 1/1, f8-s12 5/5 and its restart 1/1 |

**The failures of the full run, each with its reason:**

| Fixture | In the full run | Reason | Result |
|---|---|---|---|
| f4-s2, f3-s13, f7-a, f5-s3, f6-s4, f3-s1, r1-raster-text | failed steps import `/src/...` modules | **Can't run on the built apps**: dev-server only (D-619) | dev servers: f4-s2 6/6, f3-s13 5/5, f7-a 8/8, f5-s3 2/2, f6-s4 3/3, r1 2/2; f3-s1 steps 1–4 pass on the dev servers and step 5 on the built apps |
| f6-a (step 8), f5-s15 (step 4) | 2.3 s and 1.9 s against a 1 s bound | **Timing**, with two fixtures at once | **passed on rerun** alone: 9/9, 4/4 |
| f5-s18 (step 4) | Playwright lost a response body it was reading | **Timing / harness** | **passed on rerun**: 4/4 |
| f5-big (steps 2, 5) | step 5: "2 reads of page 2's PDF" | **Real bug**: Auto Count's index downloaded the sheet's PDF a second time. Measured (D-765 7): 20–37 s for the bench's largest sheet (24 MB) | **fixed** (app 304c68b, the canvas's bytes are reused); 6/6 |
| f8-s12 (step 3), after its D-81/D-98 update | "B's Properties opened editable while A holds the item" | **Real bug**: the action group's Properties ignored another person's hold; the held item's tips read "Being edited by …is editing…" | **fixed** (app 304c68b); 5/5 |
| f8-s12-restart | once: A did not reconnect within 60 s | **Environment**: api-fx took about 57 s to restart | **passed on rerun** |

**Not run, with reasons:**
- **Stop shared services:** f8-s5 and f4-s27 stop Redis and MinIO, which the live bench shares. Listed for staging (D-765 5).
- **f5-s2** stops the worker and drops its queue. Pointing it at worker-fx was not done tonight; it stays skipped.
- **f5-s9** runs `seed.py --reset` with a flag the seed no longer takes.
- **d27-uploads** needs the beat scheduler, which the fx stack does not run.

**Updated to the founder's answers (D-765) and rerun, every one passing:**
- **The trashed-project message (point 3):** f4-s15 3/3, f4-s20 3/3, f8-s16 4/4.
- **Upload and New folder disabled with the reason (point 6):** f4-s17 10/10.
- **The explicit "nothing from workspace 1 in workspace 2" check (point 4):** f3-s12 8/8.
- **The held-item tips matched exactly (bug 2):** f8-s15 6/6.
- **Rerun with no change:** c32 5/5 (the `own_fields` clean-up, D-765 1, changed 0 rows on the bench and 0 on fx), proof-backlog 13/13, f3-s10 4/4, f5-big 6/6.

Overlays are committed in intelcost-infra (5204aca, 0c9bcbd).

**App bugs the suite found tonight: 17, all fixed.** These are the 14 above plus three:
- f5-big's second PDF read
- f8-s12's editable Properties
- the held-item tips

**Ready for testers, from the test side: yes, with three caveats.**
1. f8-s5 and f4-s27 (Redis and MinIO outages) are untested until a staging stack can stop its own.
2. f5-s2, f5-s9 and d27-uploads are not run.
3. The F35 cost-component changes built after this run (D-762, D-764 B0) change what Estimating shows, not its totals. Before a tester deploy, run the estimate fixtures on the new build again (f9-estimating, f9-exports, c14, c15, c16, c35, c38): their row text changed.

**New fixtures** (`fx-suite-updates/browser/`, own throwaway accounts each; the brief's item 3):
| Fixture | Covers | Result |
|---|---|---|
| c32-site-typed | D-758 follow-up: typed rates on site machines kept through a recalculation, Apply tier carrying same classes, naming the one that leaves (item 4) | 5/5 |
| c33-invitations | D-749 (unverified sees none, banner, Accept, Decline on the inviter's list), D-752 (second owned workspace 409) | 4/4 |
| c34-my-equipment | F34 end to end: On my list, starting list, bulk-off warning (Q7), mine-only picker and Add, reader without the capability, hidden activity, Estimating's Equipment total unchanged | 7/7 after fix 2 |
| c35-equipment-library | engine and period solver with overtime ($16,471.70, D-751's check), operated mob in the rate ($10,614.00), assembled crane's quote ($11,200.00 with it), shared missing data flagged on both lines, own values (D-758), import with blank and "national" cells (D-745) | 5/5 |
| c36-earthwork-link | the starter as a workspace takes it up (13 activities, 79 tiers, 63 defaults, 19 optional machines, Foreman / Grade checker / Pipelayer rows), the two-way link (typed production → tier machines; trucks back to 2 → exact tier 1,000/day; pacing excavator × 2 → 2,000/day; Apply tier) | 6/6 |
| c37-wage-roles | the Wage Calculator on AR20260046 and the role rates by D-753 option C: Laborer $37.26, Pipelayer $37.44, Grade checker $49.71 (= Equipment Operator), Foreman $54.68 | 3/3 |
| c38-components-assemblies | Save as assembly keeps the library component and the shared machine (D-742, D-743), applied elsewhere; the crew row with no rate is missing data (D-747); no component on a Site Feature (D-746); Shared equipment's library name search (D-750) | 5/5 |
Plus `lib/xlsx-write.mjs` (a workbook without a library, for the import) and `lib/wd/ar46.txt` (the public AR20260046).
Already covered before tonight and passing: one owned workspace's refusal in c33; the earthwork starter's line map in
c36; cost components in f9-estimating and c14/c16; the Wage Calculator's screens in c31.

**The D-758 follow-up browser check (item 4), what c32 saw** on a 150 × 90 ft pad, A1 "Excavate and load (on-site
haul)" as one site spread:
- FG 82 → 9,000 BCY, 1,000 BCY/day, tier 900–1,399: EX-CRAWL-30T × 1 + ADT-30T × 2.
- Typed in Shared equipment: the excavator's week $7,000, the truck's day $900 → the spread reads edited.
- Recalculated at FG 55 → 22,500 BCY: the screen read "22,500 BCY over 1 line · tier 900–1,399 · default for 22,500
  BCY: 1,500/day · edited", with **Apply tier**; both typed rates kept.
- Apply tier (same classes) → tier 1,400–2,199: EX-CRAWL-30T × 1 + ADT-30T × 3; both typed values carried; no notice.
- Recalculated at FG 10 → 45,000 BCY, Apply tier → tier 2,200–3,199: EX-CRAWL-50T × 1 + ADT-30T × 3; the truck's $900
  carried, the new excavator bare, and the screen's note: "Your typed values for Excavate and load (on-site haul):
  Hydraulic excavator 30-36 t (~68,000-81,000 lb) were not used: it is not in the new tier."
- Before the fix above, the same-classes Apply tier kept ADT-30T × 2.

## Decisions taken overnight

1. **The mode on the workspace row, not an `eq_override` setting** (D-760). Alternative: a "setting" override, which
   would show in the Company rates export and Revert all.
2. **"Imported machine lists" in the starting list = machines with company values or custom machines** (D-760), since
   earlier imports left no other trace. Alternative: only machines imported from tonight on.
3. **D-752 in the fixture harness: a second workspace is made by a fresh throwaway owner who seats the fixture's account
   as admin** (D-761). Alternative: the platform grant ("Allow one more owned workspace"), rejected because a granted
   workspace has no trial and reads locked, which changes what billing and seat fixtures measure.
4. **Override quantity requires its reason in the dialog** (D-761), as the api already did. Alternative: the api accepts
   an empty reason, as legacy's dialog (copied by D-208) did.
5. **A project trashed while open in another window reads "Project not found"** (D-761), D-622's link rule applied to an
   open page. Alternative: keep showing it until the next navigation.
6. **Two harness rules learned:** no api edit while an fx run is going (api-fx hot-reloads), and no `regress.sh` batch
   beside single runs (its end-of-run purge deletes every fx workspace).

## Questions for the founder

**Answered 2026-10-24 and built (D-765).** Notes:
- **1:** the clean-up drops entries equal to what the spread gives the machine (a typed value is written to the column too, so "equal to the stored value" would have dropped every typed one). It changed 0 rows on the bench.
- **5:** the restart fixtures now run on the fx services (see "Final run").
- **7:** the second read measured 20–37 s; the canvas's bytes are now reused.

1. **Site machines saved before tonight's fix may hold `own_fields` that equal their stored count and work day**
   (api 9f1ec9e). They price the same today; at the next Apply tier such a machine keeps its old count. Should a
   one-off clean-up drop the entries that equal the stored value (bench and, later, production), or leave them?
   Taken overnight: nothing changed in any data.
2. **Override quantity's reason** (D-761): keep it required (the api's rule, now the dialog's too), or let the api take
   an empty one as legacy did?
3. **A project trashed while open** now says "Project not found" (D-761). Right, or should it stay until the next
   navigation?
4. **f3-s12 AC2** now counts the second workspace's audit rows against a baseline (its throwaway owner's seating writes
   some), where it asserted none at all (D-752). Acceptable reading of "no other workspace sees it"?
5. **The restart fixtures** (f8-s2, f8-s3, f8-s8, f8-s12, f5-s2) can be pointed at the fx services (api-fx, api-fx-b,
   worker-fx) so they run too; f8-s5 and f4-s27 cannot (Redis and MinIO are shared with the live bench). Go ahead?
6. **The load screen's tree hides Upload and New folder** for a seat without upload rights instead of showing them
   disabled with the reason (found while updating f4-s17). Change to disabled-with-reason?
7. **The Auto Count index reads a just-uploaded sheet's PDF a second time** (D-288; f5-big): reuse the canvas's bytes?
   Not needed for correctness.
8. **`components/app-shell.tsx` still draws the workspace logo** in the full header, which today shows only on
   Home's naming and error screens (D-625 took it out of the members' header). Leftover code to remove?

## Throwaway data made tonight

- Account `fx.equip.202610240152@bench.intelcost.io` (password only in the MCP browser context), workspace
  **zz MyEq Night** (76988959), custom machine "TEST Loader TEST 3 yd" (U-7A6C413C3A), project **zz MyEq project** (3c357c13) with shared machine "TEST excavator 20T" (EX-CRAWL-20T); second account `fx.equip.202610240152.b@bench.intelcost.io` (estimator there); the workspace's estimator role has "Manage workspace library" turned off.
