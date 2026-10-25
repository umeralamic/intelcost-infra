# Run report: reports and panel, earthwork names, held items, B1–B4 (2026-10-24)

The founder's answers to REPORTS_PANEL_PLAN.md and the held items (D-766 to D-770), built in order.

## 0. The HV copy's total: $1,025,875.10 after D-756 → $994,208.69 now

**The drop is $31,666.41, all in one part: a person's edit on the HV copy, not a code change.** Nothing is fixed.

| Part | Amount | Cause | Reading |
|---|---|---|---|
| Labor | **−$20,642.34** | "Place and compact" (A3) spread re-tiered by hand | A person's edit, not a logged change and not a bug |
| Equipment | **−$11,024.07** | the same edit: that tier's equipment and fewer hours | the same |
| Material | $0.00 | $183,285.35 at D-756 and now | unchanged |
| Subcontract | $0.00 | $45,352.67 at D-756 and now | unchanged |
| **Total** | **−$31,666.41** | | |

**Where the D-756 figure comes from:** the D-756 recalculation, `morning-report-2026-10-24/day-756-coverage-hv-copy.xlsx`
(2026-10-23 17:01): Labor $299,143.65, Equipment $498,093.43, Full $1,025,875.10.

**The comparison:** that workbook against today's export of the same estimate, line by line. Exactly 16 lines changed,
every one priced by the A3 "Place and compact" spread:
- the 14 "… Fill" lines
- "Undercut Replacement Fill: Structural Fill, 48" in 12" lifts …"
- "T5 Native undercut, recompacted — Undercut & Recompact Native"

On each, man-hours fell to 0.536× and equipment to 0.787×. Every other line is equal to the cent.

**The cause:**
- The project's A3 row (`eq_project_activity` 13) reads 2,100 CCY/day on the 2,000–3,000/day tier (tier 6), with
  `user_edited = true`.
- It was written at **2026-10-24 06:22:57 UTC by umeralam.q@gmail.com** (an ADMIN of "zz Equip HV copy").
- The write falls inside that account's work session on the copy, 05:55:41 to 06:23:55 UTC (715 s active).
- No migration, fixture or throwaway wrote it. D-765 1's clean-up changed 0 rows, and it touches site machines, not
  production.
- At D-756 the spread priced on tier 4: 900 CCY/day, 10 h days, a 4-head crew, so 4 ÷ 90 = 0.0444 MH/CCY.
- On tier 6 the crew is "0.5 Foreman, 0.5 Grade checker, 4 Operators" (5 heads) at the typed 2,100 CCY/day, so
  5 ÷ 210 = 0.0238 MH/CCY.

**Example, Building Pad Fill (2,398.90 CCY):**
- **Labor:** 106.62 → 57.12 MH, $11,392.25 → $6,282.21.
- **Equipment:** $12,823.74 → $10,094.71.
- **Wage:** the average wage rose $106.85 → $109.99, because the tier's crew includes a Grade checker priced as an
  Equipment Operator (D-753).

**Lines whose money changed (labour; equipment):**

| Line | Labor before → after | Equipment before → after |
|---|---|---|
| Standard Duty Asphalt Pavement Fill | $11,443.45 → $6,310.44 | $12,881.38 → $10,140.09 |
| Building Pad Fill | $11,392.25 → $6,282.21 | $12,823.74 → $10,094.71 |
| Remaining Site Fill | $8,721.84 → $4,809.62 | $9,817.78 → $7,728.47 |
| Heavy Duty Aggregate Pavement Fill | $5,918.47 → $3,263.72 | $6,662.16 → $5,244.38 |
| Heavy Duty Asphalt Pavement Fill | $2,367.43 → $1,305.51 | $2,664.91 → $2,097.79 |
| Concrete Sidewalk Fill | $1,878.06 → $1,035.65 | $2,114.04 → $1,664.15 |
| T2 Scarify, moisture condition and compact Fill | $1,002.24 → $552.68 | $1,128.19 → $888.09 |
| T5 Native undercut, recompacted Fill | $701.62 → $386.91 | $789.79 → $621.71 |
| Undercut Replacement Fill: Structural Fill, 48" in 12" lifts | $695.22 → $383.38 | $782.58 → $616.04 |
| T3 Lime stabilized (6 %) Fill | $563.90 → $310.96 | $634.76 → $499.68 |
| T4 Cement and fly ash blend (lb/SY) Fill | $403.76 → $222.65 | $454.49 → $357.76 |
| Heavy Duty Concrete Pavement Fill | $388.29 → $214.12 | $437.08 → $344.06 |
| T6 Imported undercut (Select Fill) Fill | $295.25 → $162.82 | $332.35 → $261.63 |
| T7 Overlap test (over T6) Fill | $105.87 → $58.38 | $119.17 → $93.81 |
| Undercut Replacement Fill: Select Fill, 18" in 6" lifts | $98.13 → $54.11 | $110.45 → $86.95 |
| T5 Native undercut, recompacted — Undercut & Recompact Native | $43.93 → $24.23 | $49.45 → $38.93 |

**For the founder:**
- If you set A3 to 2,100 CCY/day on the copy, the figure is right and nothing is owed.
- If you did not, someone used your account in that session.
- Either way, the audit's $994,208.69 is this edit's figure, and every sidebar total in this report is checked against it.
EOF
echo ok
## 1. Reports and side panel (D-766, D-767): F0, F1, F2, F3

### F0 (app 7e015ce, infra bff6afe)
- **Export values:** exports store money to cents, quantities and hours to 2 places, and per-unit rates to 4
  places, as values.
  - **Decision taken:** Unit Man Hours (0.0238 MH/CCY on the HV copy) and the unit prices are stored to 4
    places. At 2 places, 0.0238 would become 0.02 and break every Qty × rate formula.
  - Typed values are never changed.
- **Balancing (the F1 commit):** each totalled column's lines are balanced, largest remainder first, to the
  column's own rounded total. Every TOTAL then equals the report figure:
  - **Labor:** $278,501.32, 2,809.11 MH
  - **Equipment:** $487,069.36
  - **Material:** $183,285.35
  - **Subcontract:** $45,352.67
  - Before balancing, the per-line rounding gave $278,501.34 and 2,809.17 MH.
- **Duplicate money column:** a cost report no longer repeats its type's total as "Item Cost" ("Labor cost").
  - **Side effect:** the "Missing data" chip on Item Cost no longer shows in a filtered report. The component rows
    and Needs attention still say it.
- **Empty report:** reads "No material cost in this estimate." (10000 BCY).
- **Equipment basis sheet:** reads Equipment, Count, EH (each), Equipment cost.
- **Quantity table:** row `export-stored-values` (the HV Building Pad Fill line's figures).

### F1 (app 0ea5816, infra 588197b)
- **Cost components** is now a Group by entry: one list summed across the whole project.
- **Then by and the By line / Summary switch are gone.** A stored Summary opens as Cost components.
- **Group by Subcontractor** reads subcontractor › scope ("No scope" where a line has none, never
  "Unassigned › Unassigned").
- **HV copy (read only), each list equal to its report to the cent:**

  | Report | Rows (outer) | List = report |
  |---|---|---|
  | Full estimate | 4 sections | $994,208.69 |
  | Labor | 16 crews | $278,501.32 |
  | Material | 10 | $183,285.35 |
  | Equipment | 28 | $487,069.36 |
  | Subcontract | 1 (Sitework, scope under it) | $45,352.67 |
  | Quantities only | 89 items (93 lines; same name and unit summed) | — |

  - No crew, material or equipment appears twice in any list.
  - Library equipment is labelled by its class, e.g. "Crawler dozer D6 class (~215-240 hp, ~50k lb)".
  - A shared equipment is one row under its own name. On the HV copy those names carry their activity
    ("Excavate and load (on-site haul): Hydraulic excavator 20-25 t"), so the same class appears once as library
    equipment and once per shared equipment.
- **The list's export:** one sheet, with live SUMs on each parent. Its cents are balanced, so each parent equals
  its rows and TOTAL equals the report: $278,501.32 and $994,208.69.
- **Quantity table:** rows `components-once` and `components-cents`.

### F2 and F3 (app a764912)
- **Side panel:** Reports; Group by (Show levels only where the grouping has levels); "+ Add filter" with chips;
  one Needs attention line; the bid summary at the foot, with Incomplete first and a Review link.
  - **Filters:** Subcontractor, Division, Scope, Sheet, Layer, and User only when more than one person made lines.
  - **Fit:** 480 px of controls in 480 px at 1295 × 880, so the panel no longer scrolls.
  - **Moved:** Columns, Format, Expand components (only where it does something) and Setup (Shared equipment,
    Manage subcontractors, Equipment settings) are on the table's toolbar. "All layers" is on the tab strip.
- **Filtered marker:** Labor with Subcontractor: Sitework reads "Filtered: $231,591.54 of $278,501.32", with
  Clear. The sidebar keeps $278,501.32, and the export banner names the filter.
- **Needs attention:** lists categories with counts. On the HV copy:
  - every line, 21
  - No rate, 7
  - No quantity, 6
  - Mob/demob counted more than once, 14 (a row warning that was never counted before)
  - Not in the last Calculate, 0

  So the line reads 21 where it read 7.
- **Words:** EH replaces machine-hr, and Equipment replaces Machines.
  - **Wording choice:** the shared equipment's numeric "Machines" field reads "Count".
- **F3, the HV copy with a simulated two-sheet parent:** "Exterior Wall", 521.31 LF, $9,063.59, split 50/50
  over A101 and C-100. The simulation rewrote read responses in the browser; nothing was stored.
  - **Under Group by Sheet, on C-100:** the parent reads 260.65 LF, $4,531.80. Its sub-items read Metal Studs
    195.98 EA $1,175.88, Drywal 4x8 81.45 EA $1,140.36 and Insulation 2,606.54 SF $2,215.56, which add up to
    $4,531.80. TOTAL stays $994,208.69.
  - **Under Classification with Sheet: C-100:** the same rows.
  - **Material › Cost components under that filter:** $39,144.19, equal to the report.
- **Every sidebar total from the audit is unchanged:** $994,208.69 / $278,501.32 / $183,285.35 / $487,069.36 /
  $45,352.67 / 93 lines; 10000 BCY $117,527.08 / $30,720.00 / $86,807.08.
- **Question for the founder:** the Full estimate's By line export TOTAL reads $994,208.70, the sum of the four
  report figures as rounded ($278,501.32 + $487,069.36 + $183,285.35 + $45,352.67). The screen's Full figure is
  $994,208.69, the unrounded sum rounded once. Which should the export's Item Cost TOTAL read?

## 2. Earthwork line names by the work (D-768; app fd213c8, api f4ad944, infra 8f75fe3)
- **Names:** Calculate now names lines by the work: Cut, Fill, Strip topsoil, Undercut excavation, Undercut
  replacement fill, Soil stabilization, and the rest in their roles' own wording. The unit says bank, loose or
  compacted.
- **Feature:** the feature is its own field.
  - Under Classification it is the heading.
  - Under any other grouping it is a Feature column, shown by default, in the grid and the export.
- **Renamed lines:** a line a person renamed keeps its name. The api stores the name Calculate last wrote
  (`takeoff_item.earthwork_name`) and leaves a line alone when its own name differs.
- **The HV copy's next Calculate:** every total is unchanged.
  - Quantities only › Cost components shows one Cut (5,575.35 BCY) and one Fill (9,514.21 CCY).
  - That list has 55 rows, down from 89.
- **Utilities:** line names are unchanged; their roles have no work name of their own (question below).

## 3. Crews and shared rental (D-769; api dc0e3dc, app 86a78a6), and the held fixtures (D-770; infra 9aac4f6)
- **Tier crews:** a tier's crew reads "Crew: <activity> (<makeup>)", e.g. "Crew: Place and compact (2 Operators)".
  - Migration d769a1b2c3d4 renamed 110 bench crews by their line's spread activity.
  - 14 hand-made TEST crews have no activity and keep their names.
- **Shared equipment:** its row reads "1 week rental, shared by 3 lines" on its component rows and in Equipment's
  Cost components.
  - The Takeoff panel shows no shared rental row, so it has nothing to change.
- **Fixtures:**

  | Fixture | What changed | Result |
  |---|---|---|
  | f5-s2 | Points at worker-fx | 4/4 |
  | d27-uploads | Runs on the new beat-fx service | 2/2 |
  | f5-s9 | Updated to today's seed; AC1 is D-315's (two prepared sheets, the second opens) | 2/2 |

## 4. B1–B4: pricing rules (D-763, D-764)
**B4 first: the lines Update all would move.** The plan counted 11; 10 move. Lump smoke has quantity 0, so it
moves by $0. The figures were computed read-only from stored values. **Nothing was pressed on any project in
your workspaces.**

| Line | Labour | Equipment | Item cost |
|---|---|---|---|
| Box line | $404.80 → $368.00 | | $404.80 → $368.00 |
| Wall | $880.00 → $800.00 | | $1,200.00 → $1,120.00 |
| Footing smoke | | | $158.51 → $154.74 |
| Manual smoke | | | $26.01 → $25.40 |
| No-draw smoke | | | $1,300.69 → $1,269.75 |
| Rebar allowance | | | $78.04 → $76.19 |
| Sidewalk smoke | | | $589.65 → $575.62 |
| Slab smoke | | | $346.51 → $338.27 |
| Slope smoke | | | $1,186.64 → $1,158.41 |
| Trench allowance | | | $1,040.55 → $1,015.80 |
| Lump smoke | | | $0 (quantity 0) |

- **Total:** $6,331.40 → $6,102.17.
- **Material:** unchanged on every line. Wastage stays on material; labour and equipment stop riding it.
- **The smoke lines:** their labour and equipment fall by 1/1.05, their wastage taken off.

**What B built:**
- **Rules on the project and the line:** `project.pricing_rules`. Saved projects read 1; new ones are 2.
  `estimate_line_item.pricing_rules` is set per line.
  - **Notice:** a line whose figure would change carries a notice on Item Cost, "$a → $b", with Update.
  - **Needs attention:** has a "Pricing rules changed" category.
  - **Setup › "Update all (N lines)…":** lists every line with old → new by cost type before confirming.
  - **Library:** Update all also refreshes library components to the library's current figures (Q7). A
    component's own edits are kept.
- **B2 (rules 2):**
  - Wastage is material's, per component.
  - Labour, equipment and subcontract run on Qty × multiplier.
  - Material components gain Wastage % and Round up to. Wastage that differs by component reads "varies".
- **B3:** a parent may carry its own cost components, counted beside its sub-items under rules 2. Stabilization
  parents are the exception: their pricing is their sub-items'.
  - **The export:** shows them as an "On this item" row under the parent, inside its SUM and TOTAL.

**Smoke (throwaway copy of zz Equip 10000 BCY):**
- **B1:** the notices read "$25,499.56 → $24,699.56", and attention listed 2 lines.
  - Update on one line gave $118,327.08.
  - Update all listed Labor $8,800 → $8,000, then gave $117,527.08 with no notices left.
- **B2:** the drywall line, 1,600 SF at 10 %: 55 sheets $770, 32 MH $1,280, item $2,050.
- **B3:** a parent "Wall test" with studs $400 and its own Frame crew $160 reads $560.
  - **Totals:** sidebar Full $120,137.08 (= $117,527.08 + $2,050 + $560), and the grid TOTAL is the same.
  - **Cost components:** Labor $32,160 lists "Crew: Frame" once and ties. Material $1,170 ties.
  - **The export:** has the "On this item" row (4 MH, $160) under the parent.
  - **A first cut missed the parent's own $160 in the sidebar.** Fixed before commit.
- **Quantity table rows:** rules2-drywall, rules2-drywall-x2, rules2-round-lump-typed, rules2-varies,
  rules2-parent-own.

## 5. The estimate fixtures on the new build (D-771; infra 0cf0100)
- **Build:** the fx apps were rebuilt from this build (app ea49f38, api f59a0dd), with worker-fx restarted on it.
- **Fixtures run (15):**
  - the seven named: f9-estimating, f9-exports, c14, c15, c16, c35, c38
  - those touching the panel or the earthwork names: c10, c31, c05, c06, c17, c32, c37, n11
- **First run:** 8 of 15 passed. The 7 failures were the fixtures still on the old screens; none found a wrong figure.
  - **Moved controls (D-766 F2):** c14 Format; c32, c35 and c38 Shared equipment and Equipment settings, now in
    Setup; c15 Needs attention, now a list.
  - **c15:** expected the second money column F0 removed.
  - **c17:** expected the old line names (D-768).
  - **f9-estimating:** expected $66,000 for labour that now prices under rules 2, $60,000 (D-763).
- **Updated under D-771, then rerun:** all 7 pass.
  - **One rerun:** f9-estimating's slow-load step 12 missed its held read once while running beside two others,
    then passed 12/12 alone (it passed in the first run too).
- **Result: 15 of 15 pass.**

## Decisions taken along the way
- **Rounding in exports:** per-unit rates are stored to 4 places, not 2, so a unit price like $0.7094 keeps its
  meaning (F0).
- **Wording:** shared equipment's numeric "Machines" field reads "Count".
- **Missing data:** in a filtered cost report the Missing-data chip on Item Cost hides with the column. The line's
  marker still shows.
- **Utilities' line names:** unchanged. Their roles have no separate work name yet.
- **Hand-made crews:** the 14 hand-made TEST crews with no activity keep their names.
- **Rounding up in the workbook:** the export writes the rounded-up count as a value, with no ROUNDUP formula.

## Questions for you
1. **Full estimate export TOTAL:** By line reads $994,208.70 (the four rounded types added) against the screen's
   $994,208.69. Which should the export read?
2. **Renaming Calculate lines:** a person cannot rename a Calculate line through the api today (409). D-768's
   keep-the-name rule only matters once they can. Should renaming be allowed?
3. **Utilities' line names:** should they get work names too (e.g. "Trench excavation", "Bedding")?
4. **The HV copy's A3 edit (step 0):** your account set the "Place and compact" spread to 2,100 CCY/day at 06:22 UTC,
   which explains the whole −$31,666.41. Keep it, or put it back to the tier's figure?
5. **The 10 lines B4 lists** move only when you press Update or Update all yourself; I have not pressed either.

## Left
- **Testers:** a full fixture run restored from the tag is still required before any deploy to testers or a
  promotion to `main` (CLAUDE.md). Not run tonight.
- **Workbooks:** the review workbooks in `intelcost-infra/morning-report-2026-10-24/reports-review/` are untracked,
  as before.
