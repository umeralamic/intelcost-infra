# Overnight report (2026-10-01 20:18 to 2026-10-02 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Test project classification | done: no earlier value recorded; left as CSI (below) | 20:18 | 20:40 | 22 min |
| 1 | Auto Count answers (docs) | done (D-189): spec adopted, PARITY §17 rewritten (42 lines, 1 retired), F13 In Progress | 20:40 | 21:00 | 20 min |
| 2 | EG from another sheet (F18 Blocks A, B, acceptance on C-200) | built (D-190 to D-192), smoke-tested; **acceptance not met** (cut −35.6 %, fill −11.7 %; the link is exact, C-200's FG inputs are short); a volume-engine defect found and fixed (D-191) | 21:00 | 21:38 | 38 min |
| 3 | SPEC: site stitching | done: the draft, since adopted as [site_stitching_tasks.md](site_stitching_tasks.md) (D-231), the founder's design decided, 16 questions; F19 Planned | 21:38 | 21:39 | (written alongside task 2) |
| 4 | Build Auto Count (F13) A, B, C, D, F, E | all six blocks built (D-193, D-194), smoke-tested; Image mode slow (126 s to first results, 454 s a page) | 21:40 | 23:52 | 2 h 12 min |
| 5 | Overlay | done (D-195), smoke-tested | 23:52 | 00:20 | 28 min |
| 6 | Auto Trace cache in IndexedDB | done (D-196): C-200 5.9 s cold → 0.32 s from the cache | 00:20 | 00:30 | 10 min |
| 7 | Default dialog width 448 px | done (D-197): md is 448, `wide` 512 for Calculate and Overlay; fits at 1280 × 650 and 375 | 00:30 | 00:48 | 18 min |
| F | Fallback: side-by-side differences | done: 55 differences fixed (D-198 to D-230), the rest listed with reasons (below) | 00:48 | 10:58 | 10 h 10 min |

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

The draft (since adopted as [site_stitching_tasks.md](site_stitching_tasks.md), D-231) holds the founder's
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
| 11 | Sheet and folder rows ignored Settings' text styles (12 px; legacy 11) | Applied, as item rows | D-200 |
| 12 | Sheet rows 26 px apart; legacy 18 | Legacy's 16 px row, 2 px gap | D-200 |
| 13 | Estimating tab, header and band colours off legacy's stock format | Legacy's `DEFAULT_FORMAT` values as the light tokens; TOTAL in mono | D-200 |
| 14 | "Name this LF measurement": the name typed in and numbered by this sheet ("LF 2"); legacy's is a placeholder numbered by the project | Legacy's placeholder and number | D-201 |
| 15 | The measurement dialog's sections roomier than legacy's, Rough and Earthwork on two rows | Legacy's spacing, one row | D-201 |
| 16 | Dialog titles 700; legacy's 600 | Semibold | D-202 |
| 17 | Share 768 px; legacy 1024 | Legacy's width | D-202 |
| 18 | Toasts smaller and lighter than legacy's; errors outlined, legacy's solid red | Legacy's toast | D-202 |
| 19 | Dark mode: Estimating's tab and header darkened; legacy keeps its stock values | Same values in both themes (the light group band not copied) | D-203 |

| 20 | Strip Area radios 4 px apart; legacy 12 | Legacy's spacing | D-204 |
| 21 | Calculate assumptions: 36 px fields, 14 px Yes/No, tight spacing | Legacy's 40 px fields, 16 px Yes/No, spacing | D-204 |
| 22 | Shared equipment 768 px; legacy 1024 | Legacy's width | D-205 |
| 23 | Canvas menu: spaced separators, one extra; "▸" on flyouts | Legacy's row-border rules; ChevronRight | D-206 |
| 24 | Sheet ⋮ menu: no heading, opened rightward; item ⋮ menus rightward | Legacy's bold heading; end-aligned (leftward) | D-207 |
| 25 | Override quantity: labels, one-line reason, "Save", 448 px | Legacy's sentence, placeholders, textarea, Save override, 512 px | D-208 |
| 26 | Costs 384 px; legacy 448 | Legacy's width | D-208 |
| 27 | Item history a centred table; legacy's a right-hand drawer | A 384 px side panel of cards | D-208 |
| 28 | Link Screenshot a ticked list, 448 px | Legacy's two sections of cards, 768 px | D-208 |
| 29 | Estimating's rules light slate; legacy's #0f172a (the dark line under the header the last run left) | Legacy's rule colour on lines, dividers, frame | D-209 |
| 30 | Estimating header cells 8 px padding, medium; legacy 4.5 px, bold | Legacy's padding, weight, line height | D-209 |
| 31 | Snapshot dialog: "Save snapshot", Title, Notes, a separate custom-tag field | Legacy's words and fields, + Add custom type… in the tag list | D-210 |
| 32 | **Bug:** Split view's × and eye cut off by a long sheet name | Truncation as legacy's; controls never shrink | D-211 |
| 33 | The open sheet's whole row filled dark, chips included; legacy marks the name only | Legacy's pill on the name | D-212 |
| 34 | "Sheets" title 14 px Archivo grey; legacy 12 px Inter, text colour | Legacy's title | D-213 |
| 35 | Toggles and scale chip 20 px; chip darker green, medium | Legacy's 22 px; emerald, semibold, 10 px padding | D-213 |
| 36 | Export to Excel 384 px, New snapshot 448; legacy 420 | A 420 px size for both | D-214 |
| 37 | Sheets panel ⋮ menu 208 px; legacy 240 | Legacy's width | D-215 |
| 38 | Shared equipment had a Done button; legacy has only the × | Footer removed | D-216 |
| 39 | Auto Count's settings expanded inline, ending in "Done"; legacy's are a popover | Legacy's popover, Save as Default, outside click closes | D-217 |
| 40 | Mode menus: 11 px heading, no rule, tight hints (53 px rows); legacy 9 px caps over a rule, 60 px rows | Legacy's heading and hint lines | D-218 |
| 41 | Estimating's Columns list: checkboxes, 24 px rows; legacy ticks, 28 px | Legacy's tick items | D-219 |
| 42 | Count: True size choosable with no dimensions; legacy greys it, "Needs a diameter" | Legacy's rule and reason | D-220 |
| 43 | Count's size sliders unfilled native ranges; colour swatch 36 px | Filled sliders; legacy's 32 px | D-220 |
| 44 | Six sliders still on the browser's own range | Legacy's filled slider on all | D-221 |
| 45 | Set sheet scale: 384 px, no unit picker (Q5's flag off); live legacy ships the picker on, 512 px | Legacy's flag-on dialog; metric calibrations saved as m | D-222 |
| 46 | **Bug:** a metric preset saved the sheet in feet; legacy makes it metric | Scale choices carry their unit | D-223 |
| 47 | Custom Scale imperial only, 384 px; live legacy has Imperial / Metric, 448 px | Legacy's metric UI | D-223 |
| 48 | "Pick a standard scale": 384 px, every preset at 24 px running the window's height | Legacy's 448 px, 300 px list, 32 px rows | D-224 |
| 49 | Scale-change guard 384 px, no earthwork clause; confirmation titles bold | Legacy's 448 px and words; semibold | D-225 |
| 50 | Duplicate page: "(0 markups)"; legacy "(0 highlights, notes and docks)" | Legacy's words | D-226 |
| 51 | Name from page region with no region read every page ("Reading…"); legacy prompts to draw one | Nothing read; legacy's prompt | D-227 |
| 52 | The toolbar folded only the draw tools; legacy folds everything after Scale from the right | Every tool after Scale folds from the right; More runs them all | D-228 |
| 53 | Pick a standard scale's Back was in the footer; legacy's chevron is beside the title | The chevron beside the title; Cancel alone in the footer | D-229 |
| 54 | The draw-mode menus 210 px; legacy's `w-48` is 192 | 192 px, fixed | D-230 |
| 55 | The Print menu 276 px, one line a label; legacy's `w-64` is 256, its long entry on two lines | 256 px; a fixed-width menu wraps a long label | D-230 |
<!-- next fallback row -->

**Finding (03:15 to 03:48):** the Playwright MCP browser hung for an hour in two calls: Print in
the headed MCP browser opened the native print dialog, which blocks the page, and
`browser_close` then hung too. From then on every smoke check was driven from the bench's own
headless browser container (throwaway scripts in `intelcost-infra/browser/`, deleted after
use), where print is a no-op. **Never click Print in the MCP browser.**

**Left, with reasons:**
- **Kept by earlier decisions:**
  - the header and tab strip on one row (D-121);
  - the toggles on the status line (D-124);
  - Dimension beside Scale (D-99);
  - Estimating's sidebar (D-126);
  - "Engineered Fill" (D-136 Q13);
  - Calculate's swell and shrink wording (D-177);
  - the Scale menu's "1'-0"" labels.
- **Search inputs:** legacy renders 14 px, through shadcn's `md:text-sm` overriding its own 11 px; ours
  honour the 11 px. As the last run left it.
- **Menu sizes:**
  - Legacy's item ⋮ and layer menus' "Add layer…" use 14 px rows (a shadcn default); ours are
    12 px throughout.
- **Dark mode:** legacy's light classification band is not copied; our muted text would vanish
  on it (D-203).
- **Box menu:** legacy's AI sparkle marks, Ask AI and Extract Schedule wait for the AI answers.
  Auto-Name Sheet in the sheet menus waits for F14.
- **Create sub-items:** legacy's 829 px editor (Formulas and Costs tabs, a classification column,
  Seed from…, variables) against our formula table. Logged on its PARITY line (D-208).
- **Item history:** ours keeps readable labels where legacy prints raw JSON.
- **Name from page region:** legacy's in-dialog Draw and Redraw buttons; ours takes a region from
  the box menu's All (PARITY line).
- **The reference pane's opening zoom:** legacy reads 100 %, ours a fitted percentage (6 % on
  C-200). Both show the page fitted. Legacy's zoom is relative to the canvas, so its 100 % is
  the fit, and its pane never fits on open (legacy's `ReferenceCanvasPane` starts at zoom 1, and
  only the page's `ProjectTakeoff` fits on sheet open). Ours is absolute (D-102), so 100 %
  would be far zoomed in. A change to open at 100 % was tried at 10:45 and reverted for that
  reason. The difference is only the number in the header, and D-102 already covers it.

### Task 5: Overlay (23:52 to 00:20)

Built as legacy's (D-195) on F18's `sheet_registration` rows:
- the toolbar button and the three-step dialog;
- Standard tint and Comparative additions and deletions;
- two-point alignment and the nudge, turn and scale keys.

Smoke on E102 with E101 laid over it: drawn, aligned by four clicks, nudged, saved with its two
pairs, shown in Comparative, then removed, leaving C-200's survey link in place.

### Task 6: Auto Trace cache (00:20 to 00:30)

In IndexedDB, keyed by the sheet's document, the trace settings and an engine version (D-196).
On C-200: 5.9 s with the cache cleared, 0.32 s and 0.56 s after reloads.

### Task 7: default dialog width (00:30 to 00:48)

`md` is now legacy's 448 px. A new `wide` size (512) keeps Calculate and Overlay at legacy's
width (D-197).
- **At 1280 × 650 and 375 × 740:** every dialog opened stayed inside the window with nothing past
  its edge. These were Bid summary, Wastage, Strip Area, Site Features, Calculate, Overlay, Export,
  New project and Shared equipment.
- **Re-checked after the fallback's dialog changes:** Share, Item history, Override, Link
  screenshots.

## Commits (all on `umer-dev`, pushed)

- **intelcost-app-react:**
  - `c92426f` F18 Blocks A and B; D-191 zero-corner split
  - `ff103dd` F13 Auto Count Blocks A, B, C, D, F (D-189, D-193)
  - `c1b2917` F13 Auto Count Block E, Image mode (D-194)
  - `9ad7b38` Overlay (D-195)
  - `58b92c8` Auto Trace cache (D-196)
  - `474e5d8` default dialog 448 px (D-197)
  - `328f542` dialogs spaced as legacy, sliders filled (D-198)
  - `672e919` box menu, Auto Count panel, selects (D-199)
  - `d806646` Sheets panel text and pitch, Estimating colours (D-200)
  - `eb10745` measurement dialog (D-201)
  - `ff2236b` titles, Share, toasts (D-202)
  - `e9e328b` dark Estimating bands (D-203)
  - `8480f74` Strip Area and Calculate spacing (D-204)
  - `724bcdc` Shared equipment width (D-205)
  - `1f2927e` canvas menu rules, chevrons (D-206)
  - `a7b9779` sheet and item menus (D-207)
  - `e11fa3c` item dialogs (D-208)
  - `3992ddb` Estimating grid (D-209)
  - `4ee40b2` Snapshot dialog (D-210)
  - `2fea85f` Split view header bug (D-211)
  - `6792b18` open sheet pill (D-212)
  - `b9daf32` Sheets title, toggles, scale chip (D-213)
  - `ad634e0` 420 px form dialogs (D-214)
  - `2f45cf2` Sheets panel menu width (D-215)
  - `34406b6` Shared equipment footer (D-216)
  - `4cbef2a` Auto Count settings popover (D-217)
  - `582f0d0` mode menus (D-218)
  - `493a6ad` Columns list ticks (D-219)
  - `0631cd0` Count's True size and sliders (D-220)
  - `c224488` every remaining slider (D-221)
  - `f22de7d` Calibrate's unit picker (D-222)
  - `6f1ce4d` metric scales saved metric; Custom Scale metric (D-223)
  - `4104435` Pick a standard scale (D-224)
  - `5b04255` scale-change guard (D-225)
  - `50c9dd8` Duplicate page words (D-226)
  - `fae71d5` Name from page region with no region (D-227)
  - `81fa7e0` the toolbar's fold order (D-228)
  - `2fb132e` Pick a standard scale's back chevron (D-229)
  - `dea5a6c` the mode menus at 192 px (D-230)
  - `dc06a20` the Print menu at 256 px (D-230)
- **intelcost-app-fastapi:**
  - `8832ea6` F18 `sheet_registration`, the register twin, routes, event
  - `4809b8d` Auto Count settings in `takeoff_prefs`
  - `35edc02` Overlay column and routes
- **intelcost-infra:**
  - `d89af97` quantity table: F18 registration, volume and C-200 acceptance rows, the
    zero-corner row
  - `a382bc8` quantity table: F13 Auto Count rows
  - the workspace mirror after every change (the `Workspace…` commits)

## Decisions to review (all pending founder review)

- **D-189:** Auto Count answers adopted. Q6 changed to vector quarter turns plus mirror.
- **D-190:** the EG link's behaviour: the whole source EG, stale across sheets, manual
  recalculation.
- **D-191:** a defect in legacy's volume split at a zero corner, fixed (results show stale once).
- **D-192:** F18 Blocks A and B built; the C-200 acceptance is not met (below).
- **D-193:** Auto Count A to D and F. Three defects in legacy's matcher are fixed.
- **D-194:** Auto Count Block E, Image mode. The speed target is not met.
- **D-195:** Overlay on the sheet links' rows. Managed from a strip, not Sheets-panel sub-rows.
- **D-196:** the Auto Trace cache.
- **D-197:** default dialog 448 px; `wide` 512 for Calculate and Overlay.
- **D-198 to D-210:** the fallback's legacy matches (table above):
  - D-198, dialog spacing and sliders;
  - D-199, box menu, Auto Count panel, selects;
  - D-200, Sheets panel and Estimating colours;
  - D-201, measurement dialog;
  - D-202, titles, Share, toasts;
  - D-203, dark bands;
  - D-204, Earthwork dialog spacing;
  - D-205, Shared equipment;
  - D-206, canvas menu;
  - D-207, sheet and item menus;
  - D-208, item dialogs;
  - D-209, Estimating grid;
  - D-210, Snapshot dialog.
- **D-211:** a bug fix (Split view's close).
- **D-212 to D-221:** more of the fallback's legacy matches:
  - D-212, the open sheet's pill;
  - D-213, the Sheets title, toggles and scale chip;
  - D-214, 420 px form dialogs;
  - D-215, the panel menu's width;
  - D-216, Shared equipment's footer;
  - D-217, Auto Count's settings popover;
  - D-218, the mode menus;
  - D-219, the Columns list;
  - D-220, Count's True size rule;
  - D-221, the last native sliders.
- **D-222 and D-223 supersede F5 Q5's "metric behind a flag, off":** live legacy now ships its
  metric UI on.
  - D-222: Calibrate's unit picker.
  - D-223: Custom Scale's metric mode, and a **bug fix**: our metric presets saved the sheet in
    feet.
- **D-224:** Pick a standard scale. **D-225:** the scale-change guard; confirmation titles.
- **D-226:** Duplicate page's words. **D-227:** Name from page region reads nothing until a
  region is drawn.
- **D-228:** the toolbar folds every tool after Scale from the right, as legacy's. Dimension stays
  beside Scale.
- **D-229:** Pick a standard scale's back chevron beside the title; Dialog gains `onBack`.
- **D-230:** the draw-mode menus at legacy's fixed 192 px and the Print menu at 256, where a long
  label wraps; Menu gains `width`.

## Stitching questions (from the draft spec; none decided)

1. Where the site lives in the Sheets panel. *Recommend:* a site row at the top with its
   members under it, each member keeping its own row with an "in site" chip.
2. Where the Match line tool sits. *Recommend:* the Earthwork row, next to Boundary.
3. Can a sheet belong to two sites? *Recommend:* no; a second join offers to merge the sites.
4. Straight or bent match lines. *Recommend:* any polyline, matched by arc length.
5. "Fit the scale too" for a join. *Recommend:* allow it with F18's 0.5 % / 2 % rules and the
   warning.
6. Which side of the line a sheet keeps. *Recommend:* the side holding its drawing area's centre,
   with a "Keep the other side" switch.
7. What is up in the site view. *Recommend:* the anchor sheet's up; Rotate turns the whole site.
8. How many full-resolution members are held. *Recommend:* those on screen plus one; measure on
   a four-sheet set.
9. Dragging a shared join point. *Recommend:* it moves along the match line only.
10. What a site Calculate leaves on members' own Calculates. *Recommend:* kept, marked
    "Superseded by Site X", their lines hidden from Estimating.
11. A survey linked to several members. *Recommend:* link once, to the site; a duplicate link is
    refused.
12. One table for joins and survey links. *Recommend:* yes, `sheet_registration` with a `kind`.
13. Removing a member. *Recommend:* allowed. Pieces stay on their sheets; a one-member site
    dissolves.
14. The site in Estimating and Reports. *Recommend:* lines grouped under the site's name.
15. Measuring in the site view beyond earthwork. *Recommend:* yes, the same split-at-the-join
    storage.
16. The acceptance crop's overlap. *Recommend:* about 10 % of C-200's width each way, the match
    line on a printed feature both halves carry.

## Failures and findings

- **The C-200 acceptance is not met:** cut −35.6 %, fill −11.7 % against the engineer's. The link
  is exact (0.02 to 0.05 ft misses). C-200's FG inputs are incomplete: 10 of 37 labelled
  contours adopted, and no pavement or pad subgrade is modelled. Details under Task 2.
- **Image mode misses its speed target:** 126 s to first results, 454 s for E102. The bench has
  no scanned set to measure on.
- **Legacy defects found and fixed here:**
  - the volume split losing cut and fill at a zero corner (D-191);
  - three matcher defects in Auto Count (D-193).
- **The MCP browser hung for an hour** (above). Never click Print in it.
- **Hidden Valley Spec has a live "Anyone with Link" share link.** Its row was created on
  2026-10-01 at 02:37 UTC, during the previous overnight run, not tonight. It was left untouched;
  revoke it if it is not wanted.
- **The bench estimator's WBS and Sub-items sections are saved open.** That's why the
  measurement dialog is taller there than legacy's default.
- **The core flow, after every interface change of the night:** Linear through the new name
  dialog created "LF 9" (259.88 LF) from two clicks and Enter; the item was deleted again and the
  project's items counted 8 of 8 (bench browser, 07:27).
- **A wider regression smoke at 08:16,** in the bench browser, with no console errors:
  - a sheet switch both ways;
  - Count through its dialog with two marks ("COUNT 9", 2 EA), then deleted, items 8 of 8;
  - Estimating's 8 rows;
  - Calculate opened and cancelled;
  - Settings opened.
- **The last regression smoke, at 10:39,** in the bench browser at 1440 × 900 with writes
  blocked and no console errors. It came after the toolbar (D-228) and the dialog header
  (D-229) changes, and it drove:
  - the Scale menu's Calibrate, opened and cancelled;
  - Settings, opened and closed by its ×;
  - Estimating's TOTAL, and back to Takeoff;
  - the toolbar at 1024 × 768, with "3 more tools" in More.
- **My slips:** twice I reached for `sed -i` (once on a scratch file, once on this report), and
  the hard rule 7 hook blocked both before they ran. Both were redone with the editor. Nothing was
  harmed; the hook works as meant.
- **Metric scales (D-223):** before tonight, picking 1 : 100 or any metric preset saved the sheet
  in feet, so its quantities read in LF and SF under a metric scale. No sheet on the bench is
  metric. Any made elsewhere before this fix keeps unit "ft" until its scale is picked again.
- **The Takeoff screen at phone width (375 px)** keeps both 280 px side panels, leaving the
  canvas about 60 px wide, so drawing (Calibrate's two clicks, for one) is not usable there.
  Every dialog checked fits at 375 px (task 7). **Live legacy does the same** (checked at
  375 × 740: both panels stay, the canvas squeezed), so this is parity, not a regression. A
  collapse-the-panels rule for narrow windows is under Ideas.
- **The toolbar's fold order at narrow windows: found 09:58, fixed 10:25 (D-228).** Legacy folds
  every tool after Scale into More from the right. Ours folded only the draw tools. Ours now
  folds the way legacy's does. Making it fit also exposed a render loop on a narrow first load.
  That loop came from two fits folding on one reading, and it is fixed in the same change.
  - Left because it reworks `components/Toolbar.tsx`'s overflow, too large to start in the last
    hour. It is a PARITY item for F7.
- **A right-click on an Estimating row** opened no menu in legacy at the spot the probe clicked;
  not chased.

## Ideas

- A scanned drawing set on the bench, so Image mode's speed can be measured and tuned. Then a
  faster Image fine pass.
- Render the overlay with pdf.js at the canvas's resolution (it blurs at high zoom today).
- Overlay sub-rows under the base sheet in the Sheets panel, as legacy's.
- Close the C-200 gap:
  - adopt the remaining FG contours with suggested elevations;
  - build F18 Block C (label transfer);
  - add pavement and pad subgrades through Site Features.
- Auto Count: a reference editor and several references per search (Q27, out of F13).
- Snapshot custom types as workspace rows (legacy's), not only the project's labels.
- Legacy's sub-items editor (tabs, classification column, Seed from…, variables).
- Collapse the Takeoff screen's side panels below a tablet width, so the canvas is usable on a
  phone.
- Legacy's in-dialog Draw and Redraw in Name from page region.
- A metric-aware look at sheets calibrated in metric before D-223, if any exist in production.

## Click-only checks for the morning, most important first

1. **F18:** open C-200 on the Earthwork tab.
   - Expect "Existing grade: linked from Page 3" and Links… opens the link.
   - Calculate: the result uses page 3's contours.
2. **Auto Count:** on E102 (page 26), Select-drag a box round one receptacle symbol, then Auto
   Count in the menu.
   - Expect five found above the bar, four of them turned 90°.
   - Create, then Ctrl+Z.
3. **Overlay:** on E102, Overlay → Standard → E101 → Align. Click two pairs, nudge with the arrows,
   Enter, then Delete in the strip.
4. **Auto Trace cache:** on C-200, Trace, reload, Trace again. The second is near-instant.
5. **Dialogs:**
   - Any dialog opens at 448 px, its buttons 16 px under the content with no rule.
   - Make the window short (or open Strip Area at 1280 × 650): the rule appears while the body
     scrolls.
6. **The box menu:** Select-drag over printed text, then Linear in the strip. The name is read
   off the box. The "All" pills open the page-range dialogs.
7. **Estimating:**
   - legacy's navy tab, slate header with dark dividers, the dark line under it;
   - the TOTAL row in mono;
   - in dark mode, the same tab and header.
8. **The Sheets panel:** sheet rows packed at legacy's 18 px pitch, names at 11 px.
9. **Toasts** (Print, for one): legacy's larger toast; an error is solid red.
10. **An item's ⋮:**
    - Override quantity in legacy's words;
    - History as a right-hand drawer;
    - Link Screenshot in two sections.
11. **Snapshot:** drag a box, then Tag → "+ Add custom type…", type a name, Add, Save. The Snippets
    panel shows the custom tag.
12. **Split view** with C-200 as the reference: the × and the eye are in the pane, "View-only"
    truncated.
13. **Auto Count's gear:** a popover under it, with Reset to Defaults and Save as Default; a click
    outside closes it.
14. **Estimating → Columns:** ticks, not checkboxes.
15. **Linear ▾ and Area ▾:** "LINEAR MODE" in small caps over a rule.
16. **Scale → Calibrate on an unscaled sheet:** the unit picker beside the distance. Pick m and
    type 10: "Interpreted as 10.00 m (32.81 ft)". Scale → 1 : 100 makes the sheet metric (LM, SM).
17. **The Sheets panel:**
    - the open sheet is a dark pill on its name only;
    - the status line's toggles and the green scale chip are a touch taller.
18. **Narrow the window to about 1000 px:** the tools fold into "More" from the right, Split
    first, and More runs them (Split view, a markup, Overlay). Widen it again and every tool
    returns. Linear ▾ is 192 px wide; Print ▾ is 256 px, with its last entry on two lines.
19. **Linear on an unscaled sheet → "Set scale directly":** the chevron beside "Pick a standard
    scale" goes back a step.
