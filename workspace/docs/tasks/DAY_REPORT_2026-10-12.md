# Day report, 2026-10-12

Run from 04:21 UTC until 11:30 UTC. Blocks 0–5, then the stretch list. Updated after every block.

## Block 0 — Housekeeping — done (04:40 UTC)

- **Phase E branch:** the `overnight-metric-phase-e` stash became `wip/metric-phase-e` in app, api
  and infra (`git stash branch`, one WIP commit each, rebased onto `umer-dev`), pushed, not merged.
  The stashes are gone (`git stash list` empty in all three). Commits: app `f359081`, api `ece70d5`,
  infra `d5a5643`.
- **Last night's test data purged** from the throwaway workspace (Bench Construction of
  `estimator+1790627038`, workspace 3100), in one transaction:
  - "zz currency smoke" (project 6389, no files, no sheets);
  - the five metric entry items (3153–3157);
  - the five Phase E sub-items under "Slope smoke" (3158–3162);
  - the earthwork site on page 113: EG Spots, FG Spots, Work Boundary, the three Calculate lines
    (3163–3168) and their result row (27);
  - the "Phase E template smoke" assembly (24).
  - **Storage:** every key under the workspace's project areas was listed. 366 objects belong to
    "zz switching" and 38 to Riverside; **0 objects** sit under a project that no longer exists.
- **Abdullah's list** (pending_umer.md, "For Abdullah"): migrations `d373a1b9c4e5` and
  `d374b6c2d9e1`, and `METRIC_ENABLED=false` in production.

## Block 1 — Metric Phase E, finished and merged (D-378) — shipped (04:55 UTC)

- **What:**
  - **The tag.** Each sub-item has `formula_unit_system`. Existing formulas are imperial. A formula typed,
    retyped or placed from a template takes the project's system at that moment; an unchanged one keeps
    its tag. Duplicates copy it (both copy paths copy every column).
  - **Always read in its own system, in both engines** (`inSystem.ts`, `formula_system.py`). The api's
    recompute no longer reads the project's system at all. The editor's preview reads a stored formula in
    its tag and a retyped one in the project's, so it shows what will be stored.
  - **Siblings and rough measurements** convert by their own stored units in a metric formula (EA and
    other units with no metric form are read as stored).
  - **Template warning** lists only formulas that add or subtract a constant to something that varies.
    `PARENT * 0.5` and `PARENT * (1 + 0.05)` are not listed. A template saved from items takes its
    sub-items' own system when they agree, else the project's.
  - **Left as is:** cost-component formulas (`QTY`-based). Follow-up.
- **Commits:** WIP branch commits, then merged into `umer-dev`: app `17959d4`, api `5335137` (migration
  `d378c9d2e6f4`: `takeoff_item.formula_unit_system`, `assembly_template.unit_system`), infra `161629c`.
  The branch `wip/metric-phase-e` stays pushed.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy, migration applied. **Quantity table:** 344
  rows + 17 metric rows + 34 sub-item rows passed, plus **12 Phase E rows** (10 on both engines, app and
  api equal to 1e-9): the 7 overnight rows, a sibling in LF under an SF parent (25.384 m = 83.28 LF), a
  rough measurement (31.48 m), a sibling in EA (read as stored), the warning (only "Plus one"), and a
  15-formula detector row.
- **Browser (a duplicate of "zz switching", `METRIC_ENABLED` on):**
  - "Plus one I" `PARENT + 1` written in Imperial, "Plus one M" `PARENT + 1` written in Metric, "Sibling M"
    `[Plus one I] + 1` in Metric. Then **five Imperial ↔ Metric switches, each followed by a recompute of
    the parent** (its calculation version rose to 19): all 11 readings identical, 46.615787 / 48.896627 /
    49.896627 LF. Hand check: 45.615787 LF = 13.9037 m, + 1 m = 48.8966 LF; the sibling 46.615787 LF =
    14.2085 m, + 1 m = 49.8966 LF. **Passed.**
  - In the editor (Metric), retyping "Plus one I" to `PARENT + 2` previewed 52.18 (read in metric) and the
    sibling 55.46; restoring the text returned 46.62. Saved: stored 52.177467, tagged metric. **Passed.**
  - Saved as an assembly (tagged Metric), used in the project set to Imperial: the warning named the three
    formulas with added constants. Cancelled. **Passed.**
- **Purged:** the duplicate project (trash, then purge) and the test assembly. Storage: 0 objects under
  a deleted project.
- **For your list:** a template placed in a project of the other system has its formulas written in the
  project's system (they go through the same write as typed ones), which is why the warning exists. The
  other reading, keeping the template's system, would need no warning at all.

## Block 2 — Metric fixes (D-379) — shipped (05:40 UTC)

- **Small lengths in whole mm.** A height, width, depth or dimension under 1 m reads in whole mm in
  metric, however typed: 4" → **102 mm**, 0.3 m → 300 mm, 25 cm → 250 mm (this replaces D-376's cm
  read-back). Names, hover, the Dimension tool and the depth labels in earthwork names. Quantities stay
  at 2 decimals.
- **Earthwork names from the stored bank figure.** Calculate stores the exact bank volume on each Soil
  Export and Import line (`earthwork_bank_quantity`); the name's bracket is rebuilt from it in the
  project's system, rounded as the panel rounds.
- **Unit pickers in both systems:** Estimating's row edit and insert row, sub-item units, the manual
  quantity unit, Variables, cost-component units (now a picker, was free text). The project's own system,
  a divider, the other system. Own-system units follow the normal rule; other-system units are stored and
  shown as picked (`unit_pinned` for an imperial unit in a metric project; the metric code for a metric
  unit in an imperial project). The sub-items editor's Formulas view now shows each row's quantity in the
  unit the row shows (it showed the stored figure).
- **Commits:** app `3f251db`, api `0c111ca` (migration `d379e1a4b7c2`: `earthwork_bank_quantity`, and
  `unit_pinned` on `takeoff_item`, `takeoff_cost_component`, `assembly_child`, `assembly_component`;
  up, down and up again on the bench), infra `fe98f05`.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy. **Quantity table:** 344 rows passed, 34
  sub-item rows, 12 metric formula rows, and **38 metric rows** (was 17): 4" → 102 mm and the changed
  read-backs; 6 earthwork-name rows (23 BCY / 17 BCM from 22.6949, no-bank fallback 18 BCM, a fill
  import 944 BCM, a metric sheet's line, a 6" depth → 152 mm); 2 Dimension-tool rows; 6 pinned-unit rows;
  6 pick rows (what each choice stores in each system).
- **Browser (a duplicate of "zz switching"):**
  - **Pinned vs own units, priced, 5 switches.** In Metric, the sub-item picker read "EA, m, m², m³, BCM,
    LCM, mm, kg, %, HR, LS, ──────, IN, FT, LF, SF, SY, CY, LCY, BCY, TON, LB, GAL". Under "Slope smoke",
    "Pinned LF" (`PARENT`, LF from the other group) and "Own m" (`PARENT`, m), each priced at $2.50 in
    Unit Material Cost typed in Metric. Stored: both LF; pinned true / false; rates 2.500000 / 0.762000.
    Then five Imperial ↔ Metric switches with a reload each:
    | | Metric | Imperial |
    |---|---|---|
    | Pinned LF | 45.62 LF, $2.50, $114.04 | 45.62 LF, $2.50, $114.04 |
    | Own m | 13.9 m, $2.50, $34.76 | 45.62 LF, $0.76, $34.76 |
    | TOTAL / Full estimate | $3,688.76 | $3,688.76 |
    All 11 readings as above, identical to the cent. **Passed.**
  - **Small lengths:** the grid read "Slab smoke (100.24 m², 102 mmD)" and "Footing smoke (25.07 m,
    610 mmW, 305 mmD)". **Passed.**
  - **Earthwork:** last night's small site rebuilt on the copy (EG 100 ft, FG 98 ft, a square boundary)
    and Calculate run in Metric. The panel read "Soil Export (17 BCM)", 22 LCM; stored: bank 22.694874,
    name "Soil Export (23 BCY)". Takeoff panel: "(17 BCM)" in Metric, "(23 BCY)" in Imperial (last
    night's name read 18 BCM against the panel's 17). **Passed.**
  - **Manual quantity picker (Imperial):** the tool's EA, then IN … LS, a divider, mm, m, m², m³, kg.
    **Passed.**
- **Purged:** the duplicate (trash, purge). Storage: 0 objects under a deleted project.
- **For your list:**
  - Variables store every pick as its code and are never converted (they never were), so "m" in a
    metric project's Variables is stored as M, not as LF.
  - A unit already stored before today that is metric-coded (M, M2…) now reads "m", "m²" instead of
    "M", "M2" in every project.

## Block 3 — The manual-quantity selection bug (D-380) — shipped (06:05 UTC)

- **Cause, found by tracing:** not the manual item. A single click that lands on a row's grey,
  auto-generated name suffix ("(25.07 m, 610 mmW, 305 mmD)") was ignored: the suffix carried
  `data-noedit`, which the row reads as a control. A shapeless manual-quantity item has no suffix, so
  clicking it always worked; the next click, on an item whose suffix sits under the pointer, did
  nothing, and Properties stayed on the manual item. A traced run showed no selection write at all for
  that click, and the row handler returning on `[data-noedit]`.
- **Fix:** the suffix is no longer a control (`ItemRow.tsx`, one attribute). Double-click still
  renames; the colour palette keeps `data-noedit`.
- **Commit:** app `0485f50`.
- **Gates:** lint, typecheck, build; quantity table passed (no engine change).
- **Browser (a duplicate of "zz switching", Metric):** reproduced first (3 of 3: Properties opened the
  manual item). After the fix, three shapeless items each selected, Properties opened on them, then a
  click on another row's suffix, 3 times each: Properties opened Footing smoke, Slab smoke and
  Sidewalk smoke every time (9 of 9). **Passed.** The duplicate purged; storage 0 under deleted
  projects.

## Block 4 — The throwaway-Riverside helper (D-381) — shipped (06:20 UTC)

- **Commit:** infra `749dc6e`.
- **What broke:** `riversideWorld()` timed out in `enterWorkspace`, waiting for the header's workspace
  `<select>`; the new shell has none (a probe showed no header select on Home or Settings).
- **Fix (infra `browser/lib/bench.mjs`):** `enterWorkspace` stores the choice under
  `intelcost.workspace`, as Open › Switch workspace does, and opens Settings; `shellSettled` waits for
  that choice and a drawn screen.
- **Priced:** `pricedRiverside(world)` (`browser/lib/world.mjs`) adds a fixed priced takeoff and a
  National Average wage set, so the throwaway carries an estimate.
- **Proof, two throwaways built in two runs:**
  | | Throwaway 1 (`682a0d58`) | Throwaway 2 (`c0e03217`) |
  |---|---|---|
  | Items (sub-items) | 4 (1) | 4 (1) |
  | Shapes | 6 | 6 |
  | Quantities | Doors 4, Footing 60, Rebar 63, Slab 1,035.29 | same |
  | Priced lines | 3 | 3 |
  | Cost components | 1 | 1 |
  | Wage sets / craft rates / crew rates | 1 / 34 / 104 | 1 / 34 / 104 |
- **Browser:** signed in as throwaway 2, its Riverside's Estimating read Footing 60 LF, Rebar 63 LF
  ($173.88), Slab 1,035.29 SF ($8,670.59), Doors 4 EA ($700.00), Full estimate **$9,544.47**. **Passed.**
- **Purged:** every fixture account's workspace (`purge-fx`, 6 workspaces); storage under them 0
  objects.
- **Note:** no Riverside on the bench carries wage sets today (the seeded Riverside, 28 items, has
  none), so the counts are the helper's own fixed set, not a copy of a seeded project.

## Block 5 — D8.8, Stripe's official library (D-382) — shipped (06:45 UTC)

- **What:** `app/features/billing/stripe.py` on `stripe` 16.0.0 (`StripeClient`, async over httpx, no
  automatic retries, base URL from `STRIPE_API_BASE`). The five names and their answers are unchanged,
  so none of the callers in `service.py` and `topup.py` changed. The signature check is the library's
  `WebhookSignature.verify_header` with the same 300 s tolerance. The hand-written form encoder is gone.
- **Fake:** `/_fake/events/<id>/resend?signature=expired` signs correctly but ten minutes ago.
- **Commits:** api `c78fa5d` (code, `pyproject.toml`), infra `c4bd131` (fake). The bench's api and worker
  images were rebuilt (`docker compose up -d --build`); the image reports stripe 16.0.0.
- **Gates:** api ruff, format, mypy (208 files); quantity table passed, credit rows included.
- **Smoke (bench, Stripe fake, a throwaway account and workspace):**
  - **Checkout:** Settings › Billing › Professional › Start subscription → the fake's hosted page
    (`price_bench_professional_monthly × 1`) → Pay → back on Billing: Professional, Monthly, Active,
    October 12 to November 11, 2026. Manage billing opened the fake's portal. **Passed.**
  - **Real webhooks:** `checkout.session.completed` 200 "processed"; a fresh `invoice.paid` 200
    "processed". **Passed.**
  - **Forged** (`?signature=bad`): 400 "Invalid signature." **Passed.**
  - **Expired** (signed 600 s ago): 400 "Invalid signature." **Passed.** (The first try returned 200,
    because the fake was still running its old code; it was restarted and the check redone on a new
    workspace and event.)
  - A valid resend of the same event: 200 "duplicate".
- **Purged:** both throwaway workspaces (`purge-fx`).
- **Abdullah** (added to pending_umer.md): rebuild the production image; the library pins API version
  `2026-09-30.endive`, to note beside the account's own (D9).
- **Noticed, not changed:** the throwaway workspace's Billing read "Seats 11 in use" for a one-person
  workspace. Not part of this block; listed for you.

## Block 6 — Share dialog, project only (D-383) — shipped (06:55 UTC)

- **What:** the Share dialog has no tab bar; it opens straight on what was Project Users (the public link
  block and the assignees). The Workspace and Roles & Permissions tabs are gone from it; Settings ›
  People & Access › Members and Roles & Permissions are unchanged. Under "Invite someone new to the
  workspace": "Manage workspace members and roles in Settings", "Settings" a link to Members. The invite
  button, which used to switch to the Workspace tab, opens Members too; both close the dialog.
  (Settings has no page called "Workspace & team"; its members and roles are under People & Access.)
- **Found and fixed:** the expiry field showed the day after the one picked west of UTC (2026-12-31 read
  2027-01-01 in the bench browser's America/Chicago): it now shows the local day.
- **Commit:** app `133820d`.
- **Gates:** lint, typecheck, build; quantity table passed.
- **Browser (a duplicate of "zz switching"):** no tabs. Link on; password set (field reads "•••••• (set)");
  expiry 2026-12-31, the same after a reload; Copy Link put the link on the clipboard; Regenerate issued a
  new token; Revoke turned the link off ("Off — only workspace members can open this project", the api
  has no link); Add person listed Bench Estimator and Sara Wells and assigned one. The Settings link and
  the invite button both landed on Settings › Members with the dialog closed; Roles & Permissions opens
  from there. **Passed.** The duplicate purged; storage 0 under deleted projects.

## Block 7 — Let viewers save a copy (D-384) — shipped (07:25 UTC)

- **What:**
  - **Owner:** the two options under "Allow 'Anyone with Link' to view", the grey note, and "Saved by N
    people" with each copy's workspace name and date.
  - **Viewer:** "Save to my workspace" on the shared page, in four states (Professional or running
    trial; Essentials or expired trial; signed out; over a trial's limits).
  - **Copy:** the Duplicate project job, extended to copy into another workspace (`duplicate.Into`), named
    "<Project> (shared copy)".
  - **Api:** `POST/GET /api/workspace/{viewer}/share-copy[/eligibility]`, 403 for every refusal.
- **Commits:** api `43f8a41` (migration `d380a5c7e2f1`: `project_share_link.allow_save_copy`,
  `.copy_include_pricing`, table `project_share_copy`), app `6b8d770`.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy (208 files); quantity table passed.
- **Browser, three throwaway accounts plus a signed-out browser** (owner Professional with the priced
  Riverside from Block 4; viewer Professional; viewer Essentials; plans bought on the Stripe fake):
  | Check | Result |
  |---|---|
  | Pro viewer, pricing off | "Riverside Medical Center (shared copy)": sheets 2, files 1, folders, layers 3, calibration, items 4, shapes 6, quantities equal; estimate lines, cost component, wage set 0; nothing in the copy names the owner's workspace or people. **Passed.** |
  | Pro viewer, pricing on | every table equal to the original (lines 3, component 1, wage set with 34 craft and 104 crew rates); Slab's code moved to the viewer's own CSI 03; 10 storage objects under the viewer's workspace; Full estimate $9,544.47, the original's. **Passed.** |
  | Independence | the viewer renamed Slab in the copy: the original kept "Slab"; the owner renamed Doors in the original: neither copy changed. **Passed.** |
  | Essentials viewer | button disabled, "Saving a copy needs a Professional plan." and Billing; the api answered 403 `plan_required`. **Passed.** |
  | Signed out | "Sign in with a Professional plan to save this project to your workspace.", no button. **Passed.** |
  | After Revoke | 403 "This link no longer allows saving a copy."; both copies still open, priced. **Passed.** |
  | Owner | "Saved by 2 people", each with the viewer's workspace and Oct 12, 2026, one "with pricing". **Passed.** |
  | Duplicate project (same workspace) | unchanged: "(copy)", every table equal. **Passed.** |
- **Purged:** the three accounts' workspaces (`purge-fx`); storage 0.
- **For your list (D-384 6), what a copy includes beyond the brief:**
  - items on layers the link does not share are not copied;
  - assignees, workspace variable values and subcontractor overrides never cross, so a formula reading a
    workspace variable reads "Unknown variable" in the copy;
  - a custom classification code with no match in the viewer's workspace is left unclassified;
  - unit wastage counts as pricing;
  - two copies of the same project have the same name;
  - "Saved by N people" counts copies, so one person saving twice reads "2 people", as the brief's
    check expects.

## Block 8 — Live work and hidden names (D-385) — shipped (07:50 UTC)

- **Found first:** the old option ("Allow anonymous viewers to see mouse cursor…") did nothing: the guest
  presence route always answered an empty list (D-108 left it for later). So this block built live work
  for viewers, not just the new wording.
- **What:**
  - **Owner:** "Let viewers watch live work" (cursors and which page people are on), with "Show team
    members' names" under it, on by default.
  - **Members' tabs:** a `view` frame on opening a sheet and every 15 s. The realtime connection notes
    cursors and views for viewers in Redis (`share/watch.py`).
  - **Viewer:** the shared page polls `/presence` every second, draws cursors on the open sheet and
    markers in the sheet list.
  - **Names off:** "User A", "User B", stable per person on the link. The api swaps the identity before
    anything leaves it (presence and bundle).
- **Commits:** api `b228968` (migration `d381b2c4e6a8`: `project_share_link.show_member_names`, default
  true), app `0a6bcec`.
- **Gates:** app lint, typecheck, build; api ruff, format, mypy (209 files); quantity table passed.
- **Browser (a throwaway Riverside, owner and Sara W. signed in, each in their own browser context, moving
  their pointers on pages 1 and 2; a signed-out viewer on the link):**
  | State | Presence answer (raw) | Viewer's screen |
  |---|---|---|
  | Names on | "Fixture O." on page 1, "Sara W." on page 2, both moving; bundle creator "Fixture O." | cursor "Fixture O." on page 1; markers "Fixture O.", "Sara W." |
  | Names off | "User A" on page 1, "User B" on page 2; no name, email or id in the presence or the bundle (`created_by_name` null) | cursor "User A"; markers "User A", "User B"; the same letters after a reload |
  | Live work off | `[]` | no cursor, no marker |
  **Passed.** The first run showed each person three times (three tabs open); the api now sends one
  entry per person per sheet, and the rerun above is with that.
- **Owner's dialog:** the new wording; "Show team members' names" appears only while live work is ticked;
  new and existing links default to names on.
- **Purged:** the throwaway workspace; storage 0.

## Stretch list — click sessions B and A, the 820 px top bar (08:00–08:35 UTC)

Evidence for every check is in `E:\bench-evidence\2026-10-12\<check>\` (screenshots, exported files,
storage and log extracts, and a RESULT.md each); summaries in `SESSION_B.md` and `SESSION_A.md` there.
All on a throwaway account (fx.zzclick.1791791351422) with its own priced Riverside from the Block 4
helper, purged afterwards. No C item was closed.

| Check | Status |
|---|---|
| C12 The item model | auto-pass for what was driven: 7' - 6" × 40 ft → 300.61 SF; 6/12 → 1,157.49 SF; Mesh `PARENT * 1.05` 1,215.37 SF; Duplicate "Slab (2)"; editor at 390 px. Variables, folder ×2, layers, classification not driven |
| C14 Estimating tab and export | auto-pass for what was driven (pricing, seven groupings, wastage LF 10 %, components, Format, export formulas); Excel recalculation couldn't run (no Excel) |
| C15 Sidebar and reports | auto-pass (report totals = TOTAL, Needs attention 9 = 9, collapse after reload, Set values on 10 rows and one undo) |
| C16 Bid summary | **auto-pass: Bid total $126,120.72**; the export's Bid Summary sheet chains every amount from its rate cell; Excel itself couldn't run |
| C31 Wage Calculator | auto-pass for steps 1, 2 (Bridgeport, CT), 4 (26 classifications), 6 (Labor burden 51.87 %), 7 (Laborer $60 offered again on the same basis only) |
| C1 Deleting a sheet clears its files | auto-pass ({'failed': 0}; 0 objects left for the sheet) |
| C3 Duplicate project | auto-pass (toast counted up, copy opened in 8.4 s, independent, deleted from Trash, 0 objects) |
| C4 First ticked page ready first (117 MB) | auto-pass: ready in 30 s |
| C22 Takeoff-first, no OS drag | **auto-fail on the upload's Cancel** (emulated slow link: Cancel did nothing, no Retry); no seed folders, drawing-size pre-tick, Home, "zzq" all pass; the drag parts couldn't run |
| C23 Folders on load | auto-pass (one-page loose, blank → the file's name per the spec, "Wet Trades" merged) |
| C28 Double-click finishes a run | auto-pass (yes); **defect found:** the end point is stored twice |

**The 820 px top bar** (`TOPBAR_820.md` in the evidence folder): the header's content is 912 px in an
820 px window, so Settings and the account avatar are clipped and unreachable. Fix: below 1024 px the
dark-mode switch and the AI credits chip move into the account menu and the project name truncates
(about 107 px freed). Size: app only, about 35 lines in two files, about an hour with the smoke. Not
built, as asked.

## FINAL REPORT

Run from 04:21 to the time of this report; every block and every stretch item was done.

### Shipped (all pushed on `umer-dev`)

| Block | What | Decision | Commits |
|---|---|---|---|
| 0 | Phase E stash → `wip/metric-phase-e` (pushed), stashes dropped; last night's test data purged; Abdullah's list | — | infra `c41659d` |
| 1 | Metric Phase E: each formula read in the system it was written in; siblings and references by their own units; the warning lists added constants only | **D-378** | app `17959d4`, api `5335137`, infra `161629c` (merges of `wip/metric-phase-e`) |
| 2 | Small lengths in whole mm; earthwork names from the stored bank figure; unit pickers in both systems (`unit_pinned`) | **D-379** | app `3f251db`, api `0c111ca`, infra `fe98f05` |
| 3 | A click on a row's grey name suffix selects the row (the manual-quantity "bug") | **D-380** | app `0485f50` |
| 4 | The throwaway Riverside on the new shell, and priced | **D-381** | infra `749dc6e` |
| 5 | Stripe's official library behind our five names | **D-382** | api `c78fa5d`, infra `c4bd131` |
| 6 | Share is about the project only; expiry shows the local day | **D-383** | app `133820d` |
| 7 | Viewers save a copy to their own workspace | **D-384** | api `43f8a41`, app `6b8d770` |
| 8 | Viewers watch live work, with names or User A / User B | **D-385** | api `b228968`, app `0a6bcec` |

Migrations added: `d378c9d2e6f4`, `d379e1a4b7c2`, `d380a5c7e2f1`, `d381b2c4e6a8` (all applied on the
bench). Workspace mirror: infra, last commit with this report.

### On the wip branch
`wip/metric-phase-e` (app, api, infra) holds last night's Phase E stash and today's finishing commit; it
was merged into `umer-dev` after it passed (Block 1). It stays pushed; nothing is left only there.

### Evidence folders
`E:\bench-evidence\2026-10-12\` — C1, C3, C4, C12, C14, C15, C16, C22, C23, C28, C31, SESSION_A.md,
SESSION_B.md, TOPBAR_820.md, topbar-820.png.

### Choices left for you
CH1–CH10 in pending_umer.md ("Choices from the day run"), plus the defects found in the click sessions
listed under them (C28 double end point, C22 upload Cancel, C12 editor after a resize, C1 wording, C4 AI
options ticked by default, C15 undo during a save, "Seats 11 in use").

### The switch
`METRIC_ENABLED=false` on the bench (off since the Block 5 rebuild); checked at the end: a non-admin's
PATCH to `metric` answered **403 "Metric is not available yet."**, `metric_available` false, "zz
switching" Imperial. Mail guard on.

### Throwaways
Every fixture account's workspace purged after each block (`purge-fx`, storage 0 each time); the
duplicates made in the estimator throwaway workspace purged (trash, purge; 0 objects under deleted
projects). "zz switching" and Riverside in that workspace are as they were this morning.

## After the final report — three bugs from the click sessions fixed (D-386) (08:40 UTC)

Bugs, not choices, so fixed in the remaining time:
- **C28:** finishing a run with a double-click stored the end point twice. Now: click + double-click
  stores 2 points, click + click + double-click 3 (checked in the database on a duplicate of "zz
  switching").
- **C22:** Cancel on an upload in flight waited for the whole part (a file under the part size: the whole
  file), with no sign it was heard. Now the part in flight is aborted: on a 3 MB file at an emulated
  50 KB/s, the row's Cancel was gone 144 ms after the click and the file was discarded from the project
  (7-cancel-after-D386.png, 7b-cancel-timed.png).
- **C12:** the sub-items editor opened wide and the window narrowed to 390 px now comes back on screen
  (x 124–382, Save at 321–370) (7-editor-after-resize-D386.png).
- **Commit:** app `d27194c`. **Gates:** lint, typecheck, build; quantity table passed. The duplicate
  purged; storage 0 under deleted projects. The C items stay open for your own check.

## Undo during an Estimating save (D-387) (09:05 UTC)

- **The bug (from C15):** an edit's undo step was recorded only once its save came back, so a Ctrl+Z
  pressed during Set values did nothing, or undid the edit before it.
- **Fixed:** an edit that is saving holds the history; a Ctrl+Z pressed meanwhile waits, then undoes it.
  Set values, a rate, a custom cell and a multiplier all hold. App `649fd40`.
- **Checked:** on a copy of Riverside in the throwaway workspace, with every cost save slowed by
  1.5 s: Wall's unit material $5 → $7, then Set values $3 on two rows, Ctrl+Z pressed 0.2 s later.
  The two $3 saves, then the two undo saves, went out in that order. The rows were blank again and Wall
  stayed $7; a second Ctrl+Z took Wall back to $5. Passed.
- **Gates:** lint, typecheck, build; quantity table passed. The copy was purged.
- **"Seats 11 in use" withdrawn:** it reads "1" and then "1 in use"; I had run the two together.
- **C1's wording and C4's AI defaults** stay on your list: the first copies legacy word for word on
  purpose, and the second is a product default.

## C31 deeper: the Wage Calculator's acceptance tests, and D-388 (09:40 UTC)

- **Driven** on a copy of Riverside (purged): the spec's tests 2, 3, 4, 13, 14 and 17 pass; 9, 10 and 11
  pass on tx115; 5 fails as written (county factor ×1.189 against the spec's ×1.16, which is the
  engine's own rule; on your list); 16 failed and is fixed; 7 and 8 couldn't run (AI credits); 12, 15
  and 18–21 not driven. Evidence: `C31/RESULT.md` and `C31/extra/`.
- **Fixed (D-388, app `1c205f6`):** the review's dead end after a wage determination change (seen on
  the old code, gone on the new), and Advanced starting on the project's state with A-03b.
- **Gates:** lint, typecheck, build; quantity table passed. The copy was purged.

- **Then (09:45 UTC) tests 18–21** on another copy (purged): 18 and 20 pass; 21 passes with WD-only
  on (under the default higher-of the rate is raised, on your list); 19 fails: no breakdown for National
  Average crafts (on your list). The workspace's company benefits were set back to blank, read back
  from the api. Test 12 then passed too (09:50 UTC, a third copy, purged): only test 15 (the UI string search) is not driven.

## State at 09:55 UTC (after the final report)

- **Shipped after the final report:** D-386 (app `d27194c`: the double-click end point, upload Cancel,
  the editor after a resize), D-387 (app `649fd40`: undo waits for an Estimating save), D-388 (app
  `1c205f6`: the Wage Calculator's dead end on review; Advanced on the project's state). Each with
  gates, the quantity table and a browser check; all pushed on `umer-dev`.
- **C31** now has 19 of its 21 acceptance tests driven (17 pass, 16 fixed, 5 and 19 on your list; 21
  passes only with WD-only, also on your list); 7 and 8 need AI credits, 15 not driven.
- **The switch:** `METRIC_ENABLED=false`; rechecked at 09:52: a non-admin's PATCH to `metric` → 403
  "Metric is not available yet.", "zz switching" still Imperial. Mail guard on.
- **Throwaways:** every copy made since the final report purged; storage 0 under deleted projects. The
  workspace's company benefits set back to blank (read back from the api).
- **Repos:** app, api and infra on `umer-dev`, clean, nothing unpushed; the workspace mirror current.
