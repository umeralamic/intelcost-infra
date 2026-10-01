# F13: Auto Count (draft spec, questions open)

> **Draft, written overnight 2026-10-01 (task 5 of the plan).** Nothing is built. The
> founder's answers to the questions at the end come before any code. This is from
> legacy's source on `UmeralamDEV` (e99cddcb, read in full), its plan files, and live
> legacy driven at 1440 × 900. PARITY §17 is corrected where the code disagrees with it
> (see "PARITY §17 against the code").

## The problem

Counting fixtures by hand means a click per symbol on every sheet: hundreds of clicks per
set, easy to miss one. Legacy finds every instance of a symbol for you. You box one symbol,
it scans the page or the set, you review the matches, and they become one count item. None
of that exists in the new app.

**Problem → solution.** One click per symbol. → Legacy's Auto Count:
- the region menu's "Auto Count" opens a panel that scans at once (Vector by default,
  Image for scans);
- the matches are shown as cards, checked above a sensitivity bar;
- the person reviews them;
- **Create (N)** makes one count item with a mark at each match, undone as one step.
- It is local math only: no AI, no credits.

## How legacy was read and driven

- **Source** (`src/lib/takeoff/autoCount/`):
  - `scan`, `vectorMatch`, `imageMatch` and its worker, `resultPipeline`, `valleyCut`,
    `settings`;
  - `overlayPaint`, `panelDrag`, `rasterBudget`, `canvasProbe*`, `grayPage`, the OpenCV arm
    (`opencvCoarse*`, `opencvLoader`);
  - the UI files `AutoCountPanel`, `AutoCountCandidateCard`, `AutoCountSettingsPopover`,
    `AutoCountOverlay`, `RegionSelectMenu`;
  - the handlers in `ProjectTakeoff.tsx`.
  Read in full, file and line references in the working notes.
- **Plans:** `auto-count-symbol-search-batch-count-placement-2026-08-26`,
  `auto-count-a-production-evidence-folded-into-the-perf-work-2026-08-26`,
  `auto-count-image-mode-final-close-out-2026-08-26`,
  `auto-count-image-mode-memory-contract-repair-p1-p5-evidence-2026-08-27`,
  `auto-count-ux-build-1-hover-highlight-draggable-panel-click-2026-08-27`. Where a plan and
  the code disagree, the code is what legacy does (noted below).
- **Driven live** (the "Bench comparison" project, page 1, 1440 × 900):
  - A Select drag on empty sheet opened the region menu: the tool strip, Page Name / Sheet #
    / Scale each with ALL, Ask AI, Extract Schedule, **Auto Count**, Copy as Text, Copy as
    Image, Search as Text, New Snapshot, Crop as New Page.
  - Auto Count opened its panel and scanned at once (Mode Vector, Search pages Current page,
    Sensitivity 78 %). The box held only text, so it said "No vector linework found inside
    your selection — this sheet is likely a scan. Switch to **Image mode** to match the
    printed pixels instead."
  - The link switched to Image (Rotation search "4 — 90° steps"), which showed "Scanning
    page…" with Stop. **It was still scanning 74 s later**, on a simple one-page sheet.
  - The gear opened "Auto Count Settings — Changes apply to the next scan.": SHARED Min
    Match Spacing 60 %; VECTOR Include Mirror (off), Drop Unique Features (on), Include Text
    (on); Reset to Defaults; Save as Default.
  - The comparison sheet has no repeated symbols, so no match cards were seen live; the card
    and review behaviour below is from the source.

## What exists in the new app

- The region menu exists (F11): Page Name, Sheet # and Scale with their All-pages sweeps,
  Copy as Text, Copy as Image, Search as Text, New Snapshot, Crop as New Page. It has **no
  Ask AI, Extract Schedule or Auto Count rows yet**; legacy puts those three between Scale
  and Copy as Text, the first two belonging to F14.
- Count items and marks exist: one shape row per mark (D-32), count symbols and sizes
  (F6/F7). The session history takes a batch as one undo step (F7-S22).
- Sheets are one-page PDFs (D-42). The pdf.js stroke walk is `find/sheetStrokes.ts` and Auto
  Trace's `readSheet.ts` (D-143); the text walk is `find/sheetText.ts`.
- A Web Worker pattern exists (Auto Trace's `trace.worker.ts`, D-143).

## Legacy's behaviour, in brief

**Entry.**
- The only way in is the region menu's "Auto Count" row: a Select drag past 25 px on empty
  sheet. There is no shortcut, no toolbar button and no settings section.
- The panel is a 300 px floating, draggable panel on the right. It **scans on open**; there
  is no Scan button.
- Any change of mode, pages, box, angles or committed settings rescans and clears the
  results.

**Panel, top to bottom.**
1. The selection preview: "Your selection — click to navigate to source".
2. Mode: Vector or Image, each with its help line.
3. Search pages: Current page, All pages, or Choose… (a filter "Filter sheets…", a checkbox
   per sheet, "No sheets match.").
4. Layers (vector only, when the sheet has PDF layers): Auto, All layers or Specific
   ("Layer {ref} ({n} strokes)"). Changing it **does not rescan**; it re-filters the hits
   it kept.
5. Rotation search (image only): 8, 4, 2 or 1; default 4.
6. Sensitivity: 10–100, default 78, "Matches at or above {n}% are checked. Your manual
   checks are kept when this moves." No rescan.
7. The results grid (3 columns of cards), then "Show / Hide {n} low-confidence matches".
8. **Create ({n})**, disabled when nothing is checked or the scan is saturated.

The gear's settings:
- **Shared:** Min Match Spacing (5–95, default 60).
- **Vector:** Include Mirror (off; it carries an amber warning when on), Drop Unique
  Features (on), Include Text (on).
- **Image:** Scale variants (3 or 1, default 3); Threads (Auto, 1–6 or 8, with a RAM hint).
- **Footer:** Reset to Defaults, Save as Default (per browser, `intelcost.autoCount.settings.v1`).

**States** (legacy's words):
- "Scores look saturated — results unreliable. Create stays disabled."
- "Pass {k} of {N}" or "Scanning sheet {i} of {n}…" or "Scanning page…", with a bar and
  Stop. In image mode: "Extra orientations still running — they can only add matches."
- "{n} sheets were not searched", with one reason each: canvas limit, budget, scale drift,
  non-opaque render, unaffordable plan.
- "Scan failed" with Retry.
- The no-vector-ink message above.
- "Stopped before the first pass completed — no results yet" with Run again.
- "Found: 0" with advice, or Try Image mode.
- "Stopped early — {n} pass(es) completed…".

**Vector matcher.**
- **Template:** the box's strokes rasterised to 48 × 48, density-weighted.
- **Anchor:** the box's dominant closed element.
- **Sub-templates:** glyph, adjunct, interior (96 × 96) and the interior text.
- **Windows** are placed where the page has similar closed elements (0.5–2× size), plus
  generic stroke anchors. A unique-stroke filter (Drop Unique Features) skips singletons.
- **Score:** a tolerant density-weighted F1 with ±6 % nudges, multiplied by modifiers for
  the adjunct, matching or differing interior text, and an empty interior.
- **Mirror** is the only orientation search; there is **no rotation in Vector mode.**
- **Layer provenance** tags hits and does not drop them; Auto drops the tags.

**Image matcher.**
- **Raster:** the template is rendered at 300 DPI. A working raster is sized so the
  symbol's stroke is 3 px, frozen from the source sheet.
- **Coarse JS shortlist:** recall ≥ 0.35 at stride 6.
- **Fine pass:** stride 5, refined at stride 2, in Web Workers on row bands.
- **Score** = coverage × precision, zeroed by density, core, spread and hole gates.
- **Scale consensus:** 2 of 3 scales (0.95, 1.00, 1.05) must agree.
- **Angles** are sorted with 0° first, then sliced to 4.
- **Memory contract:** a modelled peak against a 6.5 GB budget (rejected, never clamped). A
  canvas-limit probe runs per tab.
- **OpenCV** coarse pass: a dev-only flag, **off in production**.

**Results.**
- **Shared pipeline:** NMS (centre distance 0.5 or 1/3 of the box side, or IoU above Min
  Match Spacing), with **no display cap**.
- **Auto-check** when score ≥ sensitivity or ≥ 0.999.
- **Saturation:** over 50 tied at the top, with no clear gap, latches and blocks Create.
- **Valley cut** (display only): unchecked cards below the largest gap under the bar go to
  the low-confidence drawer; 0.06 minimum gap, 0.08 near-bar band, at most 20 shown,
  fallback floor 0.40.
- **Cards:** a thumbnail and "{score}%", with tooltips for match, coverage, recall,
  precision, angle and scale.
- **Interaction:** a click checks or unchecks a card. Hover is linked both ways with the
  plan box, checked boxes amber.
- **Card click** goes to the sheet and zooms to the match.

**Create.**
- The standard New Measurement dialog opens (type count, name "Count").
- On confirm:
  - one count item, marks at each match's box centre, a sentinel between every mark;
  - geometry on every sheet;
  - one undo step deletes the whole item;
  - the panel closes;
  - toast "Counted {n} symbol(s) — {name} — Ctrl+Z to undo."

## Legacy defects found (facts; each has a question below)

1. **Source sheet:** clicking a card on another sheet makes that sheet the source. The scan
   restarts with the **same box on the wrong sheet** and the person's checks are lost.
2. **Rotation:** "8 — 45° steps" searches only 0°, 45°, 90° and 135° (`.slice(0, 4)`).
3. **Min Match Spacing:** the hint is the wrong way round; lowering it suppresses **more**.
4. **Layers:** a Layers change re-filters at a fixed spacing of 0.6, ignoring the setting.
5. **Create** ignores the dialog's count symbol, size, opacity, evidence links, cost row,
   dimensions and sub-items.
6. **Overlay colour:** review boxes are always amber, never the item's colour.
7. **Run shape:** auto marks carry a sentinel between each; manual counts have none.
8. **Mode messages:** Image mode can show the vector message when the source sheet fails to
   resolve.
9. **Browser limits:** exclusions depend on the browser (per-engine canvas limits). The
   memory budget is "PROVISIONAL AND NOT YET JUSTIFIED" by its own comment.
10. **Driven live:** Image mode was still "Scanning page…" after 74 s on a one-page
    synthetic sheet.
11. **Stale headers:** the doc headers and the 2026-08-26 plan contradict the code (union-find
    clustering, F1 or NCC scoring, scales 0.85/1.0/1.2, default angles, Layers default).

## PARITY §17 against the code (to rewrite on adoption)

- **Vector mode:** windows anchored on the dominant closed element plus generic stroke
  anchors, scored by tolerant density-weighted F1. Not "union-find clustered components".
- **Image mode:** coverage × precision with gates, after scale consensus. Not "dilated-ink
  F1".
- **OpenCV:** the OpenCV coarse pass and grayscale channel are dev-only and off. Production
  runs a JS recall shortlist on the binary page.
- **Layers:** every mode change re-derives. The control is hidden on sheets without layers,
  so "No layers found on this sheet." cannot show.
- **Rotation search:** it sits in the panel body, not settings, and "8" searches 4 angles.
- **Settings:** closing the gear with a change rescans at once; they do not wait for "the
  next scan".
- **Threads:** the UI offers Auto, 1–6 and 8, not "up to 16".
- **Overlay:** it never takes the item colour.
- **States:**
  - The zero state is "Found: 0" with advice; "Auto Count could not scan this page." is
    only the error fallback.
  - A failure shows Retry only; "Run again" belongs to the stopped state.
- **Saturation** shows a warning and disables Create; the grid still shows every
  candidate.

## Design proposal (pending the answers)

- **Hard rule 2.** The matchers, NMS, saturation and valley cut are pure TypeScript under
  `lib/takeoff/autoCount/`: data in (strokes, text, a raster as bytes), data out (scored
  boxes). The pdf.js walks and rasterisation sit under `features/takeoff/autoCount/`, and the
  scan runs in a Web Worker (as Auto Trace, D-143), so the canvas never freezes. The same
  core can later run in Celery if a whole set must be scanned off the browser (Q1).
- **The quantity table** gains each scoring and pipeline rule as rows, checked by hand: NMS,
  auto-check, saturation, the valley cut, settings normalisation, and the vector score on
  synthetic symbols.
- **Writing:**
  - One count item through the api's existing create and shapes endpoints: one shape row
    per mark, not sentinel runs (Q14).
  - One undo step through the session history.
  - Realtime as any count.

**Blocks** (each gated, quantity-tabled and smoke-tested):
- **A.** The region-menu entry, the panel shell (drag, close, preview, mode, pages, Choose),
  states and Stop; a no-op matcher.
- **B.** The vector matcher, with layers and the provenance tags.
- **C.** Review: cards and thumbnails, check and uncheck, sensitivity, the valley-cut
  drawer, hover links, the overlay, card navigation.
- **D.** Create through the dialog (honouring its fields, Q13), one undo, the toast.
- **E.** The image matcher in workers, with the memory contract and exclusions.
- **F.** The settings popover and persistence.

## Questions for the founder

Each gives legacy's behaviour and my recommendation. None is decided.

**Scope and architecture**
1. **Where matching runs.** Legacy: the browser only (main thread and workers).
   *Recommend:* pure `lib/takeoff/autoCount/` run in a browser Web Worker. A Celery twin
   only if whole sets must scan in the background.
2. **Modes in v1.** Legacy: both; Vector is the default, and Image takes ~10–75 s a page
   (still scanning at 74 s live). *Recommend:* Vector first (Blocks A–D, F); Image as Block
   E after measuring it on the bench's real scans.
3. **OpenCV coarse arm.** Legacy: dev-only, off (~13 MB). *Recommend:* drop it. Revisit
   server-side only if Image mode needs it.
4. **Memory contract and canvas probe** (Image). Legacy: per-browser limits, and a 6.5 GB
   budget it calls unjustified. *Recommend:* keep reject-never-clamp, measure the budget on
   the bench, and make exclusions independent of the browser.

**Behaviour**
5. **The source sheet when navigating.** Legacy: it follows the active sheet and rescans
   with the same box on the wrong sheet, losing checks (defect 1). *Recommend:* pin the
   source sheet for the panel's life. Card navigation never rescans; "click to navigate to
   source" goes to the source.
6. **Rotation search.** Legacy: "8" searches 4 angles (defect 2); there is no rotation in
   Vector. *Recommend:* make 8 search all 8. Keep Vector mirror-only for v1, with rotation
   in Vector as a later question.
7. **Image scale tolerance.** Legacy: ±5 % (0.95, 1.00, 1.05); Vector allows 0.5–2×.
   *Recommend:* keep legacy's.
8. **Sensitivity default and persistence.** Legacy: 78, reset on every open; ≥ 0.999 is
   always checked. *Recommend:* keep 78 and remember the last value per person.
9. **Fixed floors** (vector 0.15, image 0.45, drawer 0.40). Legacy: fixed. *Recommend:*
   keep fixed.
10. **Valley cut and drawer** (0.06 gap, 0.08 near-bar band, 20 shown). Legacy: display
    only. *Recommend:* keep.
11. **Saturation.** Legacy: it latches and blocks Create. *Recommend:* keep the block, and
    say what to do ("select the symbol more tightly").
12. **Min Match Spacing direction.** Legacy: the hint says the opposite of what the setting
    does (defect 3), and Layers ignores it (defect 4). *Recommend:* fix both. Make the
    control read "Overlap allowed", where higher keeps more, or reword the hint.
13. **Which dialog fields Create honours.** Legacy: name, folder and colour only (defect 5).
    *Recommend:* all of them: symbol, size, opacity, evidence links, cost row, dimensions,
    sub-items, rough measurement.
14. **Run shape.** Legacy: a sentinel between every mark (defect 7). *Recommend:* one shape
    row per mark, as every count in the new app (D-32).
15. **One item or one per sheet.** Legacy: one item for all sheets, geometry on each.
    *Recommend:* keep one item.
16. **Mark position.** Legacy: the centre of the matched window. *Recommend:* keep the
    centre.
17. **Undo.** Legacy: one Ctrl+Z deletes the whole item on every sheet. *Recommend:* one
    step that removes exactly the batch's marks. A new item goes with them; an item that
    has since gained manual marks keeps those.
18. **Append to an existing count item.** Legacy: never; it always creates a new one.
    *Recommend:* offer "Add to the selected count item" when one is selected, beyond legacy.
19. **Overlay colour while reviewing.** Legacy: fixed amber (defect 6). *Recommend:* the
    colour the item will get, as legacy's own comment intended.
20. **Auto-rescan or a Scan button.** Legacy: it scans on open and on any change.
    *Recommend:* keep auto-scan on open. For settings changes, rescan only on closing the
    gear (as legacy).
21. **Esc.** Legacy: Esc does nothing to the panel. *Recommend:* Esc stops a running scan,
    and a second Esc closes the panel.
22. **Entry points.** Legacy: the region menu only. *Recommend:* the region menu, plus
    "Auto Count this symbol" on a count item's menu (box the first mark) as a later idea.

**Settings and controls**
23. **Where settings persist.** Legacy: this browser, and only through "Save as Default".
    *Recommend:* per person on the api, with our other Takeoff Settings (D-82).
24. **Threads control.** Legacy: Image mode only, Auto plus 1–8 with a RAM hint.
    *Recommend:* hide it behind Auto; keep a setting only if measurements show a need.
25. **Layers control and provenance filter** (validated on one sheet, E101). Legacy: Auto
    by default, hidden without PDF layers. *Recommend:* keep Auto, hidden without layers.
26. **Debug strip.** Legacy: `localStorage AUTOCOUNT_DEBUG`. *Recommend:* a developer flag,
    never shown to users.
27. **The unbuilt backlog** (several reference symbols, an erase-pencil reference editor,
    +/− examples per card, Checked/Unchecked/All tabs, rescan with delta review). Legacy:
    in plans only. *Recommend:* out of F13. Put the reference editor and multiple references
    under Ideas.

## Progress

- [x] Draft written overnight 2026-10-01 from legacy's source, plans and a live drive.
- [ ] The founder's answers.
- [ ] PARITY §17 rewritten on adoption.
