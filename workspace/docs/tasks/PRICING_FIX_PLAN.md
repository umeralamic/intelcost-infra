# Pricing fix plan: Benchmark A

**Status:** approved 2026-11-06 (Umer), item 4 excepted: it is replaced by [WAGE_PLAN.md](WAGE_PLAN.md) and not
built. Build order at the end. Answers to Q-P1..Q-P8 are folded into the items.

**The case.** Benchmark A (copy of a real bid) is an earthwork site job in a founder workspace. An independent
estimate on the same quantities and productions comes to about 41 % of what the app prices it at. The investigation
ran on a throwaway copy only, made by the copier (D-1024); the original is protected (D-1023) and was never opened,
and nobody signed in as the founder.

**Repo rule (2026-11-06):** no client name, job quantity or bid figure in any repo or workspace file. Benchmark A's
dollar figures, its export and its before/after reports live only in the untracked local folder
`test-data-local/benchmark-a/` at the workspace root. Effects below are given as a share of the copy's bid today.

**The copy today, share of direct cost by line:**

| Line | Share of direct cost |
|---|---|
| Construction layout | 0.1 % |
| Clearing and grubbing, heavy | 1.2 % |
| Clearing debris, haul off | 2.7 % |
| Strip topsoil (6") | 0.6 % |
| Strip topsoil, haul off | 2.3 % |
| Cut | 10.9 % |
| Fill | 0.2 % |
| Soil Export | 82.0 % |

Sales tax (8.2 % on material) adds 5 % to direct cost; overhead, profit and bond are 0.

**Where the money goes:** Soil Export is 82 % of direct cost: clean-soil tipping at the library's national
$15.69/ton filed as material (59 % of direct, plus the tax on it) and its haul-off trucks (22 %).

**The gap to the original (Q-P1, answered):** the original's bid is higher than the copy's by exactly its per-line
mobilization: the original has mob on its clearing, strip, topsoil haul, cut (with 3 more machines), fill and layout
lines; the copy has mob off on every line. **A copy into another workspace loses the spread machines' mob** (item 0). Fixed first, with a fixture, and
Benchmark A is re-made from a fresh copy.

---

## 0. A copy carries each line's mob (Q-P1)

**Today** (the investigation's copy, read on the throwaway only). The copier runs the product's own copy into
another workspace (`app/features/project/duplicate.py`, `_across`, D-384, D-744, D-995):
- A site spread's machine (`project_equipment_resource`, which holds the line's `mob_demob`) moves to the target
  workspace's activity of the same national key; **with no such activity it is dropped** (`duplicate.py:618-632`),
  its mob with it, and the component's `eq_resource_uuid` is cleared. The copy's Calculate then makes a fresh spread
  machine with no mob.
- **`estimate_item_spread.company_activity_id` is not moved at all:** the copy's 8 spreads still name the source
  workspace's activities (found on the copy). That is a cross-workspace leak in the product's copy, not only the
  bench's.
- A fresh throwaway workspace has its activities only once something has seeded them, so a one-step copy hits both.

**The fix.**
- `_across` moves each spread's `company_activity_id` to the target's activity (national key, else name), as it does
  the site machines; a spread with no match stays behind and Calculate makes it from the target's activity.
- Before mapping, the copy seeds the target workspace's activities if it has none (the same seeding a workspace's
  first earthwork Calculate does), so a site machine and its `mob_demob` always find their activity.
- The machines' `mob_demob`, the components' `eq_include_mob` and the lines' `mob_demob` cross as stored.
- Fixture: copy a project with mob on some lines into a fresh workspace; both Bid Summaries equal, line by line, and
  no copied row names a source-workspace activity.

**Migration:** none.

**Effect on Benchmark A:** the copy gains the original's mobilization and its bid equals the original's.

## 1. Disposal by dump site, not averages

**Today.**
- `siteMaterials()` makes the tipping lines (`intelcost-app-react/src/lib/takeoff/earthwork/utilities/materials.ts:353-398`;
  `tipping()` at :362). `soil_export` → `tipping:clean`, or `tipping:unsuitable` for an unsuitable variant; rock takes
  the clean fee at 1.35 t/LCY (D-916, D-940). `clearing_haul` → "Tipping fee, clearing debris (C&D)" on
  `tipping:unsuitable` at 0.25 t/CY (D-958, D-959).
- **Topsoil haul-off has no fee:** its role `strip_haul` (`lines.ts:630`) has no case in the switch, and neither has
  `undercut_haul` (`lines.ts:677`); both fall to `default: undefined`.
- Prices: one national figure per key, no region (`app/features/materials/seed/q4_2026.csv:109-110`, release "Q4
  2026": `tipping:clean` $15.69/TON grade A, `tipping:unsuitable` $82.52/TON grade A), × the wage set's material AMF
  (`materials/service.py:189-201`). Resolution order: project `mat_price`, then workspace, then the IntelCost default
  (`service.py:224-275`, D-916, D-927).
- LCY → tons at `TON_PER_LCY = 1.28` (`materials.ts:304`, D-926).
- No dump site, material type list or per-site distance exists.

**The fix.**
- **Material types** (a fixed list in code, each with its tons per LCY): clean soil, topsoil/organics, unsuitable
  soil, rock, vegetation (trees, stumps, brush), concrete/asphalt rubble, mixed C&D, contaminated soil (testing and a
  profile first). On-site options: stockpile, spoil area, respread, chip, burn where allowed (no fee, no trucks off
  site; their own crew lines).
- **Dump sites** (new table `dump_site`, per workspace, reused across projects): name, materials accepted, fee and
  unit (per load, per LCY, per ton, free, or pays us, a negative fee), address or one-way distance from the job, hours.
  Project-level choice and distance override per project (a site's distance differs per job), in a small
  `project_dump_site` table.
- **Each disposal line picks a site.** Default: the lowest total cost for that material, fee plus truck hours at that
  distance (item 3). The line shows the site and "each $1/LCY changes this bid by $X" (X = the line's LCY ×
  (1 + tax if taxable)).
- **Library fallback by material and region,** shown as a range and graded C, used only with no site. A disposal line
  over a set quantity (proposed 500 LCY) on a fallback fee is flagged **"Check dump fee"** in Needs attention
  (`features/estimate/EstimatingView.tsx:1685-1730`, beside the missing-price flag at :1707) until a site is chosen
  or the fee is confirmed.
- Every disposal role gets a fee: `strip_haul` → topsoil/organics, `undercut_haul` → unsuitable soil.
- Later, size only: nearby facilities from public state/EPA lists to prefill names and distances, never prices.

**Migration:** yes (`dump_site`, `project_dump_site`; the library's material-type fallback rows as a release).

**Effect on Benchmark A (estimate, share of today's bid):** clean fill at a clean-fill site at about $0–5/LCY instead
of $15.69/t (= $20.08/LCY): **−42 % to −56 %** on Soil Export. Topsoil at $5–8/LCY: **+1.0 % to +1.7 %**. Tree
debris at a green-waste site at $20–35/t instead of $82.52: **−1.1 % to −1.4 %**.

**Fixtures / quantity table:** pricing rows per material and fee unit (load, LCY, ton, free, pays us) through
`lib/cost-cases.mjs`; the cheapest-site choice with two sites at different distances; the flag over and under the
threshold; topsoil and undercut haul-off now with a fee.

**Risks:** the cheapest-site default couples disposal to trucking (item 3): both must land together. A site that pays
us makes a negative line, which totals, exports and the Bid Summary must carry.

## 2. Cut and export handle the same dirt twice

**Today.**
- `lines.ts:865-875` (D-806, D-920) always makes `cut` with the whole region cut; `pushSurplus` (`lines.ts:888-893`)
  adds `soil_export` for the net surplus. Nothing knows where the cut goes.
- `cut` → A1 "Excavate and load (on-site haul)" (excavator + ADTs); `soil_export` → A7 "Haul off (loaded by
  excavator)", trucks only (`equipment/seed/earthwork_1/ew_line_map.csv:2,11`; `ew_activity.csv:2,8`;
  `production.py:1212,1248`, D-751). A2 "direct to haul-off trucks" exists but is mapped only for undercut.
- Each line is sized alone (`_attach_line`, `production.py:1934`): the cut on its band's rate (1 excavator + 3
  ADTs), the export on its own band's rate (a truck fleet). On Benchmark A the trucks move about two thirds of what the
  excavator is priced to dig per day: nothing paces the loader to the trucks (D-724 pacing is inside one spread).

**The fix.**
- `lines.ts`: split each region's cut by where it goes: the export share becomes a new role `cut_export`; only cut to
  fill or stockpile stays `cut` (on-site haul). The api's role list (`app/features/earthwork/schemas.py:333`) and the
  classification map (`earthwork/lines.py:40`) take the new role.
- `cut_export` → A2 (excavator loading highway trucks, no ADTs) in the line map: a library release.
- **Pacing:** A2's machine hours equal the export trucks' days × hours (a rule in `_attach_line`: the loader on a
  `cut_export` line is paced to the `soil_export` spread of the same region). The basis says so.

**Migration:** yes (line-map release row; no schema change).

**Effect on Benchmark A (estimate):** the ADTs go; the A1 crew becomes A2's ~2.5 heads; one excavator for the trucks'
hours. **About −5.2 % to −5.9 %.**

**Fixtures / quantity table:** an all-export site (cut = export: no ADTs, excavator hours = truck hours), a balanced
site (no `cut_export`), a mixed site (both, shares by volume).

**Risks:** the cut quantity in the takeoff panel and its classification split in two lines; a founder's saved remap
of `cut` keeps working (the remap wins).

## 3. Haul distance drives the truck hours

**Today.**
- Truck hours come from production by quantity band, not distance: A7 and A6 at 10 h/day (D-751), each band a
  rate and a tier of trucks at "140 LCY per truck-day" (draft) (`ew_activity.csv`, `ew_default.csv`,
  `ew_tier.csv`); the trucks' `capacity_activity = "assumption"` is the basis text; math in
  `lib/estimate/equipment/host.ts:124-129`.
- **"Haul distance, one way" is read only by mob/demob** (`lib/estimate/equipment/cost.ts:235`, `mob.ts`;
  `EquipmentSettingsDialog.tsx:44`); D-926 Q49 left "trucks take no haul distance" open.
- A haul cycle exists in the catalog (`eq_production.csv`, DT-OP-3AXLE) but never runs: loaded and empty speeds and
  truck capacity are blank ("NOT SOURCED", `eq_setting.csv:18-19`).
- The current hours imply about one load per truck-hour: **about 12–17 mi one way.**

**The fix.**
- A haul-cycle pace for every off-site haul (A6, A7, A8 and the new disposal lines): cycle = load time (the loader's
  rate) + dump time + distance × 60 / loaded mph + distance × 60 / empty mph; trucks = loader rate ÷ loads a truck
  makes per hour, hours = loads × cycle. Payload, speeds, load and dump minutes as library settings (sourced, graded),
  per-workspace overridable.
- The distance is the chosen dump site's (item 1), else the project's haul distance setting, which is split from the
  mob distance (two settings, both shown).
- The basis shows it, for example: "8 trucks, 1.6 h cycle (10 mi at 35/45 mph, 8 min load, 6 min dump), 900 loads".
- Flag "Haul distance not set" in Needs attention until a site or a distance is set on a line over the threshold.

**Migration:** yes (settings rows in a release; the split setting).

**Effect on Benchmark A:** depends on the real site. At 12–17 mi the truck cost stays about where it is; at the copy's
50 mi setting it would rise by about **+26 % to +29 %** of today's bid. The plan prices it at the chosen site's
distance; the flag stops a silent long haul.

**Fixtures / quantity table:** cycle rows at 5, 15, 50 mi checked by hand; trucks and loader paced together; the flag.

**Risks:** the largest number in the bid becomes distance-sensitive: the flag and the site's distance must be
visible on the line.

## 4. Wages (replaced, not built)

Q-P4 was superseded: wages are planned in [WAGE_PLAN.md](WAGE_PLAN.md), which waits for its own approval.

## 5. Tax on tipping fees

**Today.** Tax = the ticked cost kinds × tax % (`lib/estimate/bidSummary.ts:123-128`), material ticked by default
(D-933). Tipping is written with `kind` "material" by default (`app/features/earthwork/schemas.py:376`;
`linesFor.ts:116`). The rate: TX 6.25 state + 1.95 average local = **8.20** (`app/features/estimate/sales_tax.py`,
`state_sales_tax.csv`, D-933, D-941); precision is fine (`Numeric(7,4)`); Houston's 8.25 needs a city/ZIP rate,
which D-941 kept out.

**The fix.**
- A cost kind **"disposal"** with its own tick in the tax settings, **off by default.** Touches: the api Literals
  (`estimate/schemas.py:237`, `earthwork/schemas.py:376`), `FIELDS_BY_KIND` (`estimate/components.py:185`),
  `line_sync._bought()` (`line_sync.py:36-44`), and in the app `components.ts`, `costing.ts`, `summaries.ts`,
  `workbook.ts`, `bidSummary.ts`, `componentDisplay.ts`, `ComponentDialog.tsx`, `EstimatingView.tsx`,
  `TemplateComponents.tsx`, `reports.ts`. The estimate line likely needs a `disposal_cost` column.
- The rate (Q-P7, answered): typed per project, stored to 3 decimals (Houston 8.250 %); the state rate is the
  default, and the ZIP's combined city rate is offered where known.

**Migration:** yes if the line column is needed (likely).

**Effect on Benchmark A:** tax on tipping today is **4.6 %** of the bid; with disposal untaxed it goes to 0 (the
remaining material base is ~0 here). After item 1 the tipping itself is far smaller, so the combined effect is counted
once in the total below.

**Fixtures / quantity table:** the Bid Summary with disposal untaxed and ticked; the export's columns.

**Risks:** a new kind touches every summary and export; a cheaper interim is to write tipping as "subcontract"
(already untaxed) — rejected below (Q-P5).

## 6. Small quantities use machines already on site

**Today.** A few CCY of fill → A3, lowest tier (a small dozer, a roller and a quarter water truck), half-day floor
(D-950, D-957, D-972; `production.py:2666-2675`; `host.ts:197-209`), billed a day each (`periods.ts`, D-724),
plus its own mobilization on the original (Q-P6, answered: the original carries it). D-1006/D-1019 only waive mob,
only for shared resources, and no other line uses these machines.

**The fix.** In `_attach_line` (`production.py:1934`): below the activity's small-quantity threshold, when any line
of the project (any trade) has a machine able to do the work (a dozer or excavator for spreading, a roller if any),
price the crew only plus that machine's hours at its own-hour rate with no rental minimum and no mob, and mark the
line **"by machines on site"**; else today's tier. Thresholds per activity (fill 50 CCY, strip 100 BCY, export 50 LCY
proposed) in the library.

**Migration:** yes (threshold column, release values).

**Effect on Benchmark A:** about **−0.3 %** with its mob (the line and its mobilization).

**Fixtures / quantity table:** under and over the threshold; with and without a qualifying machine on site.

## 7. Clearing

**Today.** The heavy line **is** priced on A57 "Clearing and grubbing, heavy" (0.8 ac/day, the 2–10 ac band × 0.8;
line map `clearing_heavy → A57`, D-947): a few days of a large dozer, billed one week. It reads as light because
A55, A56 and A57 have identical tiers (one large dozer, 1 laborer + 1 operator); only the rate differs. The trees
counted on the site are "in the acre rate" (D-958) and never pick the class (`siteSection.ts:796-801`, D-951). Debris haul-off maps to A7
(`alembic/versions/d950a1b2c3d4_production_by_job_size.py:118-123`, D-951), trucks only, "loaded by excavator", with
no loader costed.

**The fix.**
- Heavier tiers for A56 and A57: an excavator with a thumb or grapple, chainsaw labor, more laborers (release data).
- Debris haul-off → a load-and-haul activity (A6, a wheel loader + trucks, or a new excavator-with-grapple activity),
  so the loader is costed; or, on site, chip/burn (item 1's on-site options).
- Trees per acre suggests the class (heavy over a set density), the estimator confirms.

**Migration:** yes (release rows).

**Effect on Benchmark A:** loader **+0.1 % to +0.2 %**; heavier heavy tiers **+0.3 % to +1.0 %.**

**Fixtures / quantity table:** heavy vs light differ in machines and crew, not only in rate; debris with a loader.

## 8. Benchmark A in the quantity table

- A frozen copy in the kept "zz Quantity table" workspace (34be6ba5), made by the fixed copier (item 0) in two steps:
  one copy first to build the workspace's tree and activities, then the benchmark copy (a one-step copy still points
  at its source workspace's activities, so the investigation's copy is not used).
- New `browser/lib/pricing-cases.mjs`: compares the copy's export line by line (labor, equipment, material,
  disposal, line cost) and the Bid Summary to the cent, **against expectations read from
  `test-data-local/benchmark-a/expected.json`**, outside every repo. The repo holds the comparer and the line names'
  roles only. With no local file the row reads "Benchmark A: skipped (no local expectations)". Its line reads
  "Benchmark A: 8 lines, right" with no figure.
- **Before/after report:** `browser/pricing-diff.mjs` takes two exports and writes, line by line and per cost
  kind, before, after and the difference, with the item that moved it, into `test-data-local/benchmark-a/` only.
- Each item's build updates the local expectations, with the reason in the local log; the commit says which item
  moved which line, never by how much.

## 9. "Trial ended" on the founder workspace

**Today** (code only; the workspace's rows were not read). A workspace gets `trial_ends_at = owner.created_at +
signup_trial_days` only if it is the owner's **first** workspace; later ones get 0 days, expired at once
(`features/workspace/service.py:87-106`; tiers 14/7/5 days, `features/auth/tier.py:200-238`).
`WorkspaceContext.view_only_reason` (`app/core/dependencies.py:241-265`) returns "trial_ended" with no subscription in
force. `User.is_platform_admin` skips the masks for that user only (`capabilities.py:507-508`), so the chip still
shows and a non-admin member is view-only. A no-end **Comp** subscription already exists (`billing/models.py:150-158`,
granted by `PUT /api/platform/billing/comp/{workspace_uuid}`, D-233).

**The fix.**
- Now, no code: platform admin grants a no-end Comp (Professional) on the founder workspace and the other internal
  workspaces.
- Durable: a `workspace.is_internal` flag honoured in `view_only_reason` and the billing state (never a trial, never
  view-only), set by platform admin, with `remove_comp` refused on an internal workspace
  (`platform/billing.py:560`); a data migration sets it on the named internal workspaces, listed before it runs (the
  founder-workspace rule).

**Migration:** yes (column + data).

**Effect:** none on prices.

---

## Effect on Benchmark A, all items (estimates, share of today's bid)

| Item | Effect |
|---|---|
| 0 Copier mob | the copy rises to the original's bid (mob carried) |
| 1 Disposal (soil at a clean-fill site, topsoil fee added, debris at green waste) | −42 % to −56 % |
| 2 Cut to export loaded straight into trucks | −5.2 % to −5.9 % |
| 3 Haul distance (at the real site, ~12–17 mi) | ~0 (at 50 mi: +26 % to +29 %) |
| 5 Disposal untaxed (tax on the remaining tipping) | −0.3 % to −4.6 % (after item 1) |
| 6 Small quantities | −0.3 % |
| 7 Clearing loader and heavy tiers | +0.4 % to +1.1 % |
| **Bid** | **about 37 % to 46 % of today's** (wages excluded: [WAGE_PLAN.md](WAGE_PLAN.md)) |

The independent hand estimate sits inside that range; the clean-fill fee and the real haul distance decide where.
Stop rule: an item whose effect lands outside its range stops the build for a report.

## Answers (2026-11-06)

- **Q-P1:** the gap is mobilization; the copier drops per-line mob (item 0, built first, with a fixture and a fresh copy).
- **Q-P2:** "Check dump fee" over 500 LCY or $10k of fee, whichever is lower.
- **Q-P3:** default site = lowest total (fee + trucking), runner-up shown.
- **Q-P4:** superseded by WAGE_PLAN.md; item 4 not built.
- **Q-P5:** disposal is its own cost kind.
- **Q-P6:** the small fill's mob is on the original; item 6 as specified.
- **Q-P7:** tax typed per project, state rate default, the ZIP's combined city rate offered; 3 decimals.
- **Q-P8:** Comp today, the internal flag in the build.

## Build order and paper hours

| Order | Item | Hours |
|---|---|---|
| 1 | 9 Trial (Comp today; the internal flag) | 3 |
| 2 | 0 Copier mob, fixture, fresh Benchmark A copy | 3 |
| 3 | 8 Benchmark (comparer, local expectations, before/after script) | 5 |
| 4 | 5 Disposal cost kind and its tax tick | 10 |
| 5 | 1 + 3 Dump sites, material types, cheapest site, haul cycle, flags (together) | 30 |
| 6 | 2 Cut to export, pacing | 8 |
| 7 | 7 Clearing tiers and debris loader | 5 |
| 8 | 6 Small quantities on site | 6 |
| | Proofs on Benchmark A after each, release run at the end | 8 |
| | **Total** | **78** |

Each item: decision first, gates, the quantity table with the Benchmark A row, a smoke on a copy, the before/after
line report (local only), push umer-dev.
