# Overnight report (2026-10-01 20:18 to 2026-10-02 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Test project classification | done: no earlier value recorded; left as CSI (below) | 20:18 | 20:40 | 22 min |
| 1 | Auto Count answers (docs) | done (D-189): spec adopted, PARITY §17 rewritten (42 lines, 1 retired), F13 In Progress | 20:40 | 21:00 | 20 min |
| 2 | EG from another sheet (F18 Blocks A, B, acceptance on C-200) | built (D-190 to D-192), smoke-tested; **acceptance not met** (cut −35.6 %, fill −11.7 %; the link is exact, C-200's FG inputs are short); a volume-engine defect found and fixed (D-191) | 21:00 | 21:38 | 38 min |
| 3 | SPEC: site stitching | done: [site_stitching_tasks.DRAFT.md](drafts/site_stitching_tasks.DRAFT.md), the founder's design decided, 16 questions; F19 Planned | 21:38 | 21:39 | (written alongside task 2) |
| 4 | Build Auto Count (F13) A, B, C, D, F, E | all six blocks built (D-193, D-194), smoke-tested; Image mode slow (126 s to first results, 454 s a page) | 21:40 | 23:52 | 2 h 12 min |
| 5 | Overlay | done (D-195), smoke-tested | 23:52 | 00:20 | 28 min |
| 6 | Auto Trace cache in IndexedDB | done (D-196): C-200 5.9 s cold → 0.32 s from the cache | 00:20 | 00:30 | 10 min |
| 7 | Default dialog width 448 px | done (D-197): md is 448, `wide` 512 for Calculate and Overlay; fits at 1280 × 650 and 375 | 00:30 | 00:48 | 18 min |
| F | Fallback: side-by-side differences | in progress (below) | 00:48 | | |

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

### Task 3: site stitching spec (21:38 to 21:39)

[site_stitching_tasks.DRAFT.md](drafts/site_stitching_tasks.DRAFT.md) holds the founder's
design, written in as decided. It covers:
- joining by match lines and the fit (F18's engine);
- one continuous drawing of the actual sheets, placed and clipped, rendered per member;
- editing across the join (shapes split at the line into pieces sharing one id);
- one Calculate and one site balance;
- Auto Trace stitched;
- the survey link;
- data and api, the pure engine, the quantity rows, blocks A to F;
- **16 questions**, each with a recommendation (listed in "Stitching questions" below).

On the board as F19, Planned.

### Task 4: Auto Count (from 21:40)

**Blocks A, B, C, D and F built (D-193).** Vector mode with quarter turns and the mirror.
- **Time per page:**
  - E102 (10,079 strokes): 5.9 s with turns and the mirror, 3.9 s as drawn only;
  - 8.8 s from opening the panel to results, the sheet's read included.
- **Turned symbols found:**
  - On E102, boxing one receptacle-like symbol found 5 above the bar: the boxed one and
    **four turned 90°**, plus a sixth turned 180° at 78 % (shown, unchecked).
  - Legacy's as-drawn search finds 1.
  - On the quantity table's synthetic sheet, all of the same symbol turned 90°, 180° and
    270°, mirrored and mirrored-and-turned are found, each with its orientation.
- **Three defects found in legacy's matcher and fixed (D-193):**
  - turned strokes read as one-offs;
  - a circle touching its leader chained with it, so the boxed symbol scored itself 46 %;
    now 100 %;
  - clamped scores tied between orientations.
- **Smoke:**
  - Create through the dialog made 5;
  - "Add to the selected count item" made 10;
  - Ctrl+Z gave 5, and Ctrl+Z again removed the item;
  - the settings were saved per person, then reset.

  Passed; nothing left behind.

**Block E, Image mode (D-194):** legacy's matcher, all 8 angles, a fixed browser-independent
budget, coarse to fine over a worker pool, progressive passes.
- **Time per page on E102** (as pixels, 4 angles × 3 scales): **126 s to the first results,
  454 s for the page.**
- The speed target is not met. The bench has no scanned set to measure on, which is the
  first need (Ideas).

### Fallback: side by side with live legacy (from 00:48)

Driven with throwaway scripts in the bench's browser, live legacy's "Bench comparison" beside
Hidden Valley Spec. Fixed, most visible first:

| # | Difference | Fix | Decision |
|---|---|---|---|
| 1 | Every dialog's footer: a rule and 36 px above the buttons; legacy has no rule, 16 px | Rule only while the body scrolls; legacy's spacing | D-198 |
| 2 | Dialog titles on a 28 px line; legacy's 18 px, description 6 px under | Legacy's title line and gaps | D-198 |
| 3 | Overlay's opacity and Auto Count's sliders drew no filled part | `rangeFill()` on every slider | D-198 |
| 4 | Sliders took 20 px of layout; legacy's 8 | 8 px of layout, 20 px hit area | D-198 |
| 5 | Overlay's page list: "name" for an unnumbered sheet; legacy "Page N – name" | Legacy's label | D-198 |
| 6 | The box menu had no tool strip; legacy's names the new item from the box | Legacy's strip, each measuring tool named from the box text | D-199 |
| 7 | Page Name, Sheet #, Scale: no glyphs, three extra "· All pages…" rows; legacy has glyphs and "All" pills | Legacy's rows and pills | D-199 |
| 8 | Auto Count panel floated at 144 px, content-tall; legacy docks at 56 px, full height | Legacy's place and height | D-199 |
| 9 | Auto Count's preview showed the sheet beside the selection | Clipped to the selection | D-199 |
| 10 | Native select arrows; legacy's trigger has a faint chevron | Legacy's chevron on every select, app-wide | D-199 |
