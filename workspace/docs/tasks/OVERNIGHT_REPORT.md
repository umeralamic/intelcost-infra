# Overnight report (2026-10-01 20:18 to 2026-10-02 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Test project classification | done: no earlier value recorded; left as CSI (below) | 20:18 | 20:40 | 22 min |
| 1 | Auto Count answers (docs) | done (D-189): spec adopted, PARITY §17 rewritten (42 lines, 1 retired), F13 In Progress | 20:40 | 21:00 | 20 min |
| 2 | EG from another sheet (F18 Blocks A, B, acceptance on C-200) | built (D-190 to D-192), smoke-tested; **acceptance not met** (cut −35.6 %, fill −11.7 %; the link is exact, C-200's FG inputs are short); a volume-engine defect found and fixed (D-191) | 21:00 | 21:38 | 38 min |
| 3 | SPEC: site stitching | to do | | | |
| 4 | Build Auto Count (F13) A, B, C, D, F, E | to do | | | |
| 5 | Overlay | to do | | | |
| 6 | Auto Trace cache in IndexedDB | to do | | | |
| 7 | Default dialog width 448 px | to do | | | |
| F | Fallback: side-by-side differences | to do | | | |

## Notes as they happen

### Task 0: the test project's classification (20:18 to 20:40)

**Not found as a recorded value; left as CSI.** Read-only search:
- `project.classification_system` for Hidden Valley Spec is `csi` (updated 2026-09-30
  23:52).
- `audit_log` has no project or classification actions (its 18 action kinds are
  workspace-level), and `takeoff_item_event` (80 rows for the project since 2026-09-30
  08:07) has no classification change.
- No item or folder in the project carries a classification today, and there is no
  database dump in `E:\Intelcost-backup` (those hold the workspace files only).

**What the code proves.** The column is never set by project creation or editing in the
app; only filing an item under a node stamps it (`classification/service.py`,
`file_under`), and only when it is empty. Earthwork's Calculate files under
`project.classification_system or "csi"` (`earthwork/lines.py`), and a project locked to
another system refuses a CSI node (409). So before that Calculate the value was either
**empty (no system chosen yet)** or already **CSI**: no other system can have been
overwritten. Which of the two is not recorded anywhere, so it is left as CSI, as the plan
says. If you want it empty again (so the first classified item picks the system), that is one
update; say so.

### Task 2: EG from another sheet (21:00 to 21:38)

- **2a:** the 13 answers were already logged (D-188) and the spec adopted.
- **2b:** the founder's link behaviour logged as D-190 and written into the spec.
- **2c, built (D-192):**
  - **Engine and table:** `register.ts` and its Python twin; `sheet_registration` with
    several sources per grading sheet; routes, event, version key.
  - **The panel:** Linked EG on the Earthwork row, and "Existing grade from other sheets…" on
    a sheet's ⋮ menu.
  - **Picking:** Split-view point picking, Snap PDF on both sides.
  - **Checks:** distance check, residuals, rotation, match score, datum offset with the
    tie-in proposal, ghosts.
  - **Calculate** through the links, stale across them.
- **Found on the way, fixed (D-191):** legacy's volume split loses a triangle's cut and fill
  when one corner sits exactly on Δz = 0. A tie-in is exactly that. Every stored result now
  shows stale (key `v4`) so the next Calculate is right.

**The C-200 acceptance numbers:**

| | Ours (through the link) | Engineer | Difference |
|---|---|---|---|
| Cut | 9,185 BCY | 14,263 | −35.6 % |
| Fill | 7,706 CCY | 8,727 | −11.7 % |
| Export at 1.10 / 1.15 | 709 BCY = 815 LCY | 4,663 BCY = 5,363 LCY (in our convention, D-177) | |

- **The link itself is exact:**
  - Page 3's scale is 1" = 60', read off its graphic scale (0, 30, 60, 90 at 36 pt). It had
    none; now set.
  - Four control points: point 1 to point 2 measures 469.0 ft on page 3 and 469.1 ft on
    C-200 (0.0 %).
  - Rotation 114.6°; the misses are 0.02 to 0.05 ft.
  - Page 3's whole linework lands on C-200's dashed EG lines (checked on an overlay). The
    match score is 34 %: only the 47 labelled contours are adopted, and much of page 3 lies
    beyond C-200's drawing.
- **Why the volumes are short, and what would close the gap:**
  1. **C-200's FG is incomplete.** C-200 prints 37 FG contour labels; Auto Trace adopted
     only 10 of the labelled lines, plus the 5 drawn by hand earlier. Missing: the pond
     (696, 698), parts of the outer ring (705, 710), and several 700 to 704 lines. D-143
     leaves crossing curb lines out on purpose. The 58 printed spot grades were placed as FG
     spots for the check.
  2. **No pavement or pad subgrade is modelled.** The engineer's surfaces are almost
     certainly to subgrade. The plan's quantity table lists about 2,000 CY of aggregate
     base, plus the building pad. Site Features with subgrade depths would add that cut.
  3. **The boundary is the hull of FG**, so volumes cover 94 % of it.
  4. Block C (label transfer) and adopting the remaining FG lines with suggested
     elevations are the next steps. Then the row can be re-run against ±5 %.
- **Quantity-table row** `regaccept-c200-from-page-3`: a snapshot of these inputs, run
  through the engine, pins 9,185 / 7,706 and the percentages.
- **Kept for your check:**
  - the link (page 3 → C-200);
  - page 3's scale;
  - page 3's 47 EG contours;
  - C-200's 10 adopted FG contours. Your 5 hand-drawn FG contours there are untouched.
- **Removed:** the 58 FG spots, the boundary, the result and its three lines and two folders,
  and the assumptions put back to "never asked".
- **Smoke (MCP, Hidden Valley):**
  - added page 3, clicked four pairs, read the checks, confirmed;
  - "Existing grade: linked from Page 3" shown;
  - Calculate through the link;
  - an offset change showed stale, and back showed current;
  - the sheet ⋮ entry opened page 3's panel.

  Passed.
