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
  - The Sheets panel ⋮ menu is 240 px in legacy, 208 in ours.
- **Small width differences:** Export to Excel and the Snapshot dialog are 420 px in legacy,
  against our 384 and 448.
- **Shared equipment:** ours has a Done button in the footer; legacy has only the ×.
- **Dark mode:** legacy's light classification band is not copied; our muted text would vanish
  on it (D-203).
- **Box menu:** legacy's AI sparkle marks, Ask AI and Extract Schedule wait for the AI answers.
  Auto-Name Sheet in the sheet menus waits for F14.
- **Create sub-items:** legacy's 829 px editor (Formulas and Costs tabs, a classification column,
  Seed from…, variables) against our formula table. Logged on its PARITY line (D-208).
- **Item history:** ours keeps readable labels where legacy prints raw JSON.
- **The reference pane** opens at 100 % in legacy; ours opens fitted.

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
- One more dialog size for legacy's 420 px dialogs (Export, Snapshot), and per-menu widths
  (legacy's 240 px Sheets panel menu).

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
