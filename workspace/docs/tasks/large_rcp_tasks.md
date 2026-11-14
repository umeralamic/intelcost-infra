# Large RCP 48 in and up, trench depth, the cover warning, and the 72 in pipe in a 6.5 ft trench (D-1275)

Night run 2026-11-15 → 16, Part 3. The founder's brief: `intelcost-infra/morning-report-2026-11-16/BRIEF.md`
(Part 3, "CLARIFICATION ON PART 3", "PART 3, THE FLAT 6.5 FT INPUTS FIRST"). Decision: D-1275. The section layers
of Part 6 (D-1278, [pipe_section_layers_tasks.md](pipe_section_layers_tasks.md)) read this part's minimum covers.

**Problem.** Storm pipe of 48 in and over is priced on the storm crew A32 (one 20-25 t excavator, a 1-2 yd loader),
paced at 0.68 of its rate whatever the size, and the bid-tab harness laid every storm item at a flat 6.5 ft, so a
72 in pipe (86 in OD) sat in a 6.5 ft trench with its crown above the ground. Nothing in the engine said so.

**Solution.** (1) The harness inputs take each storm item's depth from the pipe itself; (2) the engine warns when the
cover over the crown is under the type's minimum, and always when the crown is above the ground; (3) a large-RCP crew
(A96) on a 45-55 t excavator lays RCP of 48 in and over at TxDOT 0-4416-1's 48-72 in production, stepped down with size.

---

## 1. The 72 in pipe in a 6.5 ft trench: the cause

| Where | What it does | Verdict |
|---|---|---|
| `docs/reference/Bid tabs Houston 2026-11/contracts-16-d1271-2026-11-15.json` | Every storm item, 48 in to 72 in included, carries `depth: 6.5`. The tabs say "ALL DEPTHS" / "ALL CUTS" for storm and give no band, so the inputs took one depth for all (`depthNote`: "all depths: 6.5 ft, as every storm item") | **The cause** |
| `intelcost-infra/bidtabs/contract-runner.js` (`priceOne`) | Reads `depth` as the **trench** depth: `invert = G − depth + (OD − ID)/2/12 + 0.5`, so the trench bottom is `depth` below grade whatever the pipe | Faithful to its input |
| `quantities.ts:runQuantities` → `section.ts:zones` | A trench shallower than its bedding + OD is clipped silently: "when the trench is shallower than its crown, only its part below h" | **Allowed it without a word** |
| `breakpoints.ts:runProfile`, `calculate.ts:calculateUtilities` | No default depth for a gravity run (inverts must be typed); a cover run lays the invert at `G − cover − (OD + ID)/2` | Not a cause: no default or minimum depth ignores the OD |

72 in RCP Wall B: OD 86 in = 7.1667 ft, bedding 0.5 ft. In a 6.5 ft trench its crown is 0.5 + 7.1667 − 6.5 = **1.1667 ft
above the ground**. 48 in (OD 4.8333 ft): 1.1667 ft of cover. 60 in (6.0 ft): 0.0 ft.

**The fixes, where they come from:**
1. **Inputs** (`contracts-16-d1275-2026-11-15.json`, outside git): an "all depths" storm item has no depth of its own
   and no band, so its trench is the deeper of the tabs' 6.5 ft and its own least trench at the type's minimum cover:
   `trench = max(6.5, cover_min + OD + bedding)` with storm's 2 ft (§3). 42 in 6.75, 48 in 7.33, 54 in 7.92, 60 in 8.50,
   72 in 9.67 ft; 36 in and under stay 6.5 ft. This is the shallowest legal trench, so it credits the least to depth.
2. **Engine** (`cover.ts:coverFlags`, called by `calculate.ts:calculateUtilities`): the cover over the crown along the
   run, its least, against the type's minimum; the crown above the ground is always flagged. The flag reaches the run
   panel (the run's flags) and Needs attention (`EstimatingView.tsx` run flags, `crossings.ts:attentionRunFlag`).
3. **Harness** (`contract-runner.js`): the parity check reads Calculate's flags too and returns any cover flag per item.

## 2. Depth rules (verified in the engine, not changed)

| Kind | Rule | Where it holds |
|---|---|---|
| Gravity | trench depth = (G − invert) + bottom wall (OD − ID)/2 + bedding | `quantities.ts:runQuantities`: `drop = (OD − ID)/2/12 + tb`; `interp`: `TB = invert − drop`, `h = G − TB` |
| Pressure | trench depth = cover + OD + bedding | `breakpoints.ts:runProfile`: `invert = G − cover − (OD + ID)/2/12`; then the gravity rule: `G − TB = cover + (OD + ID)/2 + (OD − ID)/2 + tb = cover + OD + tb` |

- The bottom wall is the catalog's own per family and size (`catalog.ts`, RCP C76 Wall B / Wall C from ACPA DD 22,
  e.g. 48 in Wall B 5 in, Wall C 5.75 in).
- Bedding is the run's (`settings.beddingIn`, a segment's over it); **0 when none is set**, and the rule holds at 0.
- The pipe zone sits inside the cover: `zones` puts it from `tb` to `tb + OD + tz`, clipped to the trench; it changes
  material, not depth.
- **Pressure bedding stays as it is** (the project's bedding, 6 in unless set). Part 3 adds no bedding for DI/PVC
  pressure and assumes none; Part 6 sets it by preset. (Open question 1: whether DI/PVC pressure should drop to 0 now.)

## 3. Minimum cover over the crown, by type

From the run's start surface (finished grade or subgrade, as the run is set) to the top of the pipe barrel. Grades as
D-1278's: A read in the rule, B two secondary sources, C one source or common practice, D our assumption.

| Types | Minimum | Source | Grade |
|---|---|---|---|
| water, fire_water, hydrant_lead, reclaimed, force_main, storm_force_main | the company's pressure cover (library setting `pressure_cover_ft`, 4 ft unless set) | D-1106 (the company's cover); the state floor is 24 in (30 TAC §290.44(a)(4), water) | company |
| water_service | 2.0 ft | 30 TAC §290.44(a)(4): not less than 24 in below ground | B (TCEQ checklist and LII copy) |
| gas | 2.0 ft | 49 CFR 192.327(b): mains 24 in (18 in in consolidated rock) | A |
| gas_service | 1.0 ft | 49 CFR 192.361(a): 12 in on private property, 18 in in streets | A |
| electric | 1.5 ft | NEC Table 305.15(A), over 1000 V, nonmetallic raceway: 18 in | C |
| elec_secondary, site_lighting, low_voltage, traffic_signal | 1.5 ft | NEC Table 300.5, column 3 (nonmetallic raceway): 18 in; 24 in under streets | B |
| sanitary | 3.0 ft | Common practice (no Texas figure found in 30 TAC 217; 3 ft in other states' rules) | C |
| sanitary_service | 2.0 ft | IntelCost's assumption | D |
| storm | 2.0 ft | A Houston-area drainage manual citing the Houston criteria: 24 in below top of curb or finished grade | C |
| storm_lead, culvert | 1.0 ft | 1 ft to subgrade under pavement in several drainage manuals | C |
| roof_drain, subdrain, foundation_drain, grease_waste, irrigation, chilled_water, fuel_oil, telecom, casing, encasement, other | none | No code minimum found; only the crown-above-ground flag | — |

**The flags** (prefix "Cover over the crown"), the least cover at a knot (G and the invert are linear between knots,
so the least is at one):
- `Cover over the crown −1.17 ft at its shallowest: the pipe's crown is above the ground. Check the inverts or the grade.`
- `Cover over the crown 1.17 ft at its shallowest, under the 2 ft minimum for Storm sewer main (Houston-area drainage criteria, C).`

Both go to the run panel and to Needs attention on the run's pipe line.

## 4. The large-RCP crew: A96

**Who lays what.** A storm line (`util:storm`) of RCP (`rcp_*`) of 48 in and over takes the line-map role
`utility_pipe_storm_large` → **A96 "Pipe crew, large storm RCP 48 in and up (excavate, lay, backfill)"**
(`production.py:line_role`). A workspace with no mapping for it falls back to the storm crew
(`_read_activity_for_role`). Other families (HDPE, CMP) at 48 in stay on A32.

**The crew** (one tier, every run length), from TxDOT 0-4416-1's work item 464-2 (RC pipe 48-72 in), "Standard
resource: Labor: one crew (4-5); Equipment: one back-hoe, one crane (or another back-hoe)" (Appendix F, grade A):

| Row | A96 | A32 tier 1 (today) |
|---|---|---|
| Labour | Foreman, Pipelayer, Laborer (+ 2 operators = 5) | Foreman, Pipelayer, Laborer (+ 2 operators) |
| Pacing machine | **EX-CRAWL-50T** (45-55 t): digs and sets the 8 ft joints (a 72 in Wall B joint ≈ 14,500 lb, 6.6 t, at 150 pcf) | EX-CRAWL-20T, sized to 30-36 t or 40 t (D-1071, D-1085) |
| Second machine | WL-COMPACT-2Y (bedding, backfill: TxDOT's "another back-hoe") | WL-COMPACT-1Y |
| Compaction, truck | CP-PLATE-REV (sized to a trench roller from 24 in, D-1091), TRK-PU-8808 | the same |

- The 50 t is never re-sized down by D-1071's rows (`_ensure_site` skips A96) and never borrows a pool host (the pipe
  cap is 40 t, `pool.PIPE_EXCAVATOR_CAP`), so it is the crew's own.
- A crane instead of the excavator is the company's edit (CR-RT-50T-BARE in the catalog); not the default.

**Production.** TxDOT 0-4416-1, Table "Production rates" (items 464-1/464-2): RCP 18-42 in **138.67**, 48-72 in
**94.92** LF a crew day (means; 21 data points for 48-72 in). The report gives no figure by size inside 48-72.

- **The run-length model:** A32's bands (TxDOT 0-4416-1 run-length model, D-1091; 170 LF at 250-499 LF = 138.67 a
  standard 8 h crew day on a 10 h day, as D-1085 read it) × 94.92 / 138.67 = 0.68450: **47.9, 89.0, 116.4, 143.7, 174.5,
  195.1** LF a 10 h day at 0-99, 100-249, 250-499, 500-999, 1,000-2,499, 2,500+ LF.
- **The step with size:** (48 / D)^k, k = ln(138.67 / 94.92) / ln(60 / 30) = **0.54687**, the gradient between
  TxDOT's two group means at their mid-sizes (30 in and 60 in). 48 in 1.0000, 54 in 0.9376, 60 in 0.8851, 66 in 0.8402,
  72 in 0.8011. **Grade C** (a two-point fit on one source's group means; the mid-sizes are ours). Anchored at 48 in,
  so 48 in lays at TxDOT's 48-72 mean and larger pipe steps down from it (the founder's "stepped down with size").
- Applied in `production.py:pipe_pace` for A96 in place of D-1085's flat 0.68; the depth pace (D-1141) and the urban
  pace (D-1097) still multiply.
- **Not tuned to the tabs.** No figure here was fitted to a bid tab.

**Hand-worked, 250-499 LF band, open site, invert depth under 8 ft:**

| Pipe | Trench at 2 ft cover (ft) | Width (ft) | Crew | LF / 10 h day | MH / LF (5 people × 10 h) |
|---|---|---|---|---|---|
| 48 in RCP Wall B (OD 58) | 2 + 4.8333 + 0.5 = **7.3333** | (58 + 24)/12 = **6.8333** | A96, EX-CRAWL-50T | 116.4 × 1.0000 = **116.400** | **0.4296** |
| 60 in (OD 72) | 2 + 6.0 + 0.5 = **8.5000** | 96/12 = **8.0000** | A96 | 116.4 × 0.885121 = **103.028** | **0.4853** |
| 72 in (OD 86) | 2 + 7.1667 + 0.5 = **9.6667** | 110/12 = **9.1667** | A96 | 116.4 × 0.801126 = **93.251** | **0.5362** |

(Today at 250-499 LF: A32 170 × 0.68 = 115.6 for every size from 30 in.)

## 5. Library rows (one migration, revising d1269b4f2e80)

Release "Release 45: the large storm RCP crew (48 in and up), 2026-11-15" (source `TxDOT 0-4416-1; D-1275`):
`ew_activity` A96 (LF, `utility_pipe_storm_large`, tier by run, 10 h basis, site); `ew_tier` 1 (from 1, open);
`ew_tier_crew` 3; `ew_tier_machine` 4; `ew_default` 6; `ew_line_map` `utility_pipe_storm_large` → A96; `eq_change`
rows (kit, production). Every workspace takes A96 at its next library read (`adopt_starter`). Downgrade removes the
national rows and the release; a workspace's adopted copy stays (as D-1091's).

Starter counts after: activities 106, tiers 215, machines 475, crew 341, defaults 246, line map 114, optional 22,
open tiers 104, open defaults 106.

## 6. Quantity-table rows

Browser (`browser/lib/utility-cases.mjs`, kind `depth-rule`): 48/60/72 in RCP at 2 ft cover: trench depth, width,
cover, no flag; gravity with wall and bedding (48 in, invert 8 ft below G: 8 + 5/12 + 0.5 = 8.9167; Wall C 8 + 5.75/12 +
0.5 = 8.9792; bedding 0: 8.4167); pressure 8 in C900 DR 18 at 4 ft cover, bedding 0: 4 + 9.05/12 = 4.7542 (6 in:
5.2542); the cover warning: 48 in at a 6.5 ft trench (1.17 ft < 2 ft, flagged), 72 in at 6.5 ft (−1.17 ft, crown above
ground), 8 in C900 at 3 ft cover against the company's 4 ft (flagged), gas at 2 ft (not flagged).
Api (`drives/quantity-table.py orders`): line role at 42/48/72 in RCP and 48 in HDPE; the A96 pace 48/60/72; release
45's bands, kit and crew; MH/LF at 48/60/72.

## 7. Tasks

1. Spec (this file). Done first.
2. Inputs: `contracts-16-d1275-2026-11-15.json`; the harness's cover flag read; harness commit.
3. Engine: `cover.ts` (minimums and flags), `calculate.ts`, run panel and Needs attention reach.
4. Migration `d1275c4a9e31` (A96, release 45), proved on a separate Postgres, then the bench.
5. Api: `line_role`, fallback, `pipe_pace` step, `_ensure_site` keeps the 50 t, `_line_rates`.
6. Quantity-table rows, counts. Gates, quantity table.
7. Smoke (throwaway, wage set): a 72 in storm run at 6.5 ft (flag), at 9.67 ft (A96, 50 t).
8. Bid-tab rerun once: before (D-1273) → input depth fix alone (A96 mapped back to A32 in the run's project) → crew.

## 8. Built and measured (2026-11-14 UTC, night run)

All of §7 built. Commits: app b212fe4, api 23dae46, infra 0de7b1c. Gates green; quantity table exit 0, 0 FAIL (189
utility rows, order sizes 39 rows). Smoke passed (§DECISIONS D-1275). Bid tabs: storm RCP ≥ 48 in direct against the
item medians −18.6 % → −17.3 % (input fix alone) → −12.3 % (with A96); details in
`docs/reference/Bid tabs Houston 2026-11/why-we-bid-low-2026-11-16-large-rcp.md` (outside git).

**Left:**
- `utility_pipe_storm_large` (like `utility_pipe_storm` and `utility_pipe_sewer`) is not in the api's `LineRole`, so a
  company or project cannot re-map it in Equipment library; it follows the starter's map (A96) or, with A96 hidden, the
  storm crew. Adding the three gravity roles to `LineRole` and the line-map screen is a small follow-up.
- Estimating's "Included in" note for a 48 in + run's trench lines still names the storm crew (`noneReason.ts`
  `GRAVITY_CREW` reads the region only).
- A crane in place of the excavator: the company's edit, not offered as a choice.

## Open questions

1. DI/PVC pressure bedding: keep the project's 6 in until Part 6, or 0 now (every water run 0.5 ft shallower)?
2. The step anchors 94.92 at 48 in; anchored at the mid-size (60 in) the 48-72 mean would equal TxDOT's, and 48 in
   would lay 13 % faster than today. Which?
3. Storm minimum 2 ft (C) and sanitary 3 ft (C): the founder's own specs' figures?
