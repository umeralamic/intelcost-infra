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
