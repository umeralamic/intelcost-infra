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
    Riverside and 38 to "zz switching"; **0 objects** sit under a project that no longer exists.
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
