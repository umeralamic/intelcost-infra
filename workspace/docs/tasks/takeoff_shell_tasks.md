# F5: Takeoff shell: loading files into takeoff, the sheets panel, rendering, calibration

_Spec for the `MANAGER.md` F5 row (backlog P-04). Ports legacy's way into takeoff:
Perform Takeoff opens "Load project files into takeoff" once per project; after that,
Add sheets. Moves sheet rendering to pdf.js in the browser (**D-14**), with the server
doing preparation only: split-source and thumbnails. Ports the sheets panel, calibration
and the scale presets. Adds the collaboration duties F8 handed on (**D-32, D-33, D-34**)
and brings the takeoff route's own code splitting (**P-18**)._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) (D-13, D-14, D-20, D-27, D-32, D-33, D-34, D-35, D-36) ·
**Parity:** [../PARITY.md](../PARITY.md) §7, §9 (calibration and scale), §24
(performance baselines), §5 (the Project Home line), §10 (calibrations live) ·
**Inherited from:** [projects_tasks.md](../archive/projects_tasks.md) (F4-S13, S25),
[workspace_roles_tasks.md](../archive/workspace_roles_tasks.md) (F3-S4 AC6),
[realtime_tasks.md](../archive/realtime_tasks.md) (channels 1 and 13, drafts)

_Written 2026-09-26 (overnight) from legacy `intelcost/` at `12dd119b`. **Status: the
founder answered the questions on 2026-09-26 (D-36) and set the zoom range (D-35); in
progress from Block A.**_

---

## Progress

| Block | State | Proof |
|---|---|---|
| **A: S1 to S3** | Built and driven, 2026-09-26. **Awaiting the founder's check** | `f5-s1` 7/7 (load 1,3 then 2,3 adds only 2; the mirrored folders; a skipped page never made, after preparation; Plans refused with "5 takeoff sheets", in the api and as "Can't delete — folder in use" on screen; a .docx, page 4 of 3 and an unfinished upload refused by name; a mixed Load writes nothing; a viewer 403). `f5-s2` 4/4 (the Load answers in 146 ms with every page pending; split PDF, 512 px thumbnail and fit WebP checked in MinIO for two PDF pages and a wrapped PNG, its original kept; a tab showing "This sheet has no image" draws the page once the worker is back, no reload, one `drawing.source.changed`; a lost job re-dispatched by the sweep; beat carries the sweep). `f5-s3` 2/2 and `drives/f5-s3-bundle.sh` (canvas and drafts only in the takeoff chunk; the dashboard fetches none of it; a missing takeoff chunk reloads once). Migration `a91c4e7d2b30` up, down, up; `alembic check` clean. Gates: ruff, ruff format, mypy (83 files), lint, typecheck, build. Full regression: see the report |

**Found while building Block A:**
- **pdf.js is not in the bundle yet.** Nothing in Block A draws with it: its first use
  is Block B's Choose pages thumbnails, then the canvas in Block C. S3's guard is armed
  (`drives/f5-s3-bundle.sh` checks pdf.js is in no entry chunk the moment it is a
  dependency); today it notes the absence rather than passing on it.
- **"Prepared" is `render_status = ready`.** No new column: a loaded page is `pending`
  until the worker has split, thumbnailed and fit-rendered it. Sizes come from
  preparation, not from the Load.
- **The api reads a file once, on its first Load, to count its pages.** For a very large
  set that is a whole download into the api process; Block C's range reads could count
  from the trailer instead. Later Loads of the same file read nothing.
- **The fit tier is 144 DPI at most**, so a letter page's fit image is 1224 px wide, not
  2048; 2048 is reached by sheets wider than about 14 inches, as legacy's cap has it.
- **A lost job waits for the sweep, up to ten minutes and one beat tick.** With Redis
  as the broker a killed worker's job otherwise comes back only after the visibility
  timeout (an hour). `f5-s2` AC3 stands a dropped queue in for the kill.
- **A Project Files rename renames its sheets-panel mirror** (legacy's trigger, in the
  api's rename).
- **Pillow is a new dependency** (WebP; PyMuPDF writes none), so the api image was
  rebuilt. `poetry.lock` relocked in a container.
- **The old path stays until S9:** Project Home's Sheets block, its direct upload and
  the 150 DPI PNG render.

---

## The problem

Today a drawing reaches takeoff by a side door. Project Home's "Sheets" block uploads a
PDF straight into a `DrawingFile`, a Celery task renders every page to a 150 DPI PNG with
PyMuPDF, and the canvas draws that PNG. That was D-12's path. D-14 retired it:

- The PNG has no vector or text data, so Auto Count, Auto Trace, Find Text, Name from
  region and vector snap have nothing to read.
- Legacy measured pdf.js at 452 ms to first paint, and split-source cut a large set's
  cold open from about 190 s to about 4 s. A server raster reaches neither.
- F4 made every document a `ProjectFile` (D-27). Takeoff should be built from those
  files, as legacy's is, not from a second upload.

### What legacy does

**One decision, two buttons** (`src/lib/takeoff/startTakeoff.ts`, `resolveTakeoffEntry`).
Project Home's "Perform Takeoff" and the dashboard row's ruler both call it:

- The project already has any drawing: open takeoff.
- Otherwise, it has a takeoff-capable project file (PDF, PNG, JPG or TIFF): open takeoff
  and show "Load project files into takeoff".
- Otherwise: open empty takeoff, which says "No sheets yet" with "Add sheets".

**"Asked once" is not a flag.** It is the drawing count: once any drawing exists, the
dialog never opens by itself again. Legacy passes `loadProjectFiles: true` as router
state and clears it on arrival, so a refresh never re-opens it.

**The dialog** (`src/components/takeoff/AddSheetsDialog.tsx`) is one component with two
framings:

- Title: "Load project files into takeoff" on first run, "Add sheets" otherwise, and
  "Choose pages to load" on the page step.
- First-run text: "This project has no drawings in takeoff yet. Pick the folders and
  drawings to open — you'll only be asked once."
- **From Project Files** (the default tab):
  - The project's folder tree, root expanded.
  - Tri-state folder checkboxes that cascade to every eligible file beneath, labelled
    "({n} file{s})".
  - Unsupported files greyed out as "unsupported type"; files already in takeoff still
    pickable as "in takeoff — pick more pages".
  - Footer "{n} already in takeoff · {n} unsupported" and an "Open project files" link.
  - Empty state: "No files yet. Upload from the Files page or use the Upload tab."
  - Buttons "Skip" (first run only) and "Choose pages ({n})"; progress
    "Opening {i} of {n} — {name}".
- **Choose pages:**
  - One section per file, "{sel} of {pageCount} pages", with "Select all" and "Clear".
  - Every page as a thumbnail, "Page {n}", all ticked. "All pages are selected. Untick
    any you don't need — you can add more later."
  - Pages already loaded show "loaded", locked and ticked.
  - "Back", "Skip" (first run), "Load {N} page{s}"; progress "Loading {i} of {n} —
    {name}".
  - Thumbnails are rendered in the browser with pdf.js, 256 px wide, three at a time.
- **Upload drawing:**
  - "Drag PDF, PNG, JPG or TIFF here, or click to choose files" and "Uploaded files land
    in the project root — file them from the Files page."
  - It loads **every** page; there is no page step on this tab.
  - An image is wrapped into a one-page PDF first.
- **What Load writes:**
  - A `drawing_files` row per file (idempotent per `project_file_id`).
  - A drawing folder chain mirroring the file's Project Files folders, plus a leaf named
    after the PDF.
  - A `drawing_sheets` row per **ticked** page ("Page N", `sheet_number` empty, width,
    height and rotation from pdf.js, `sort_order` in steps of 1000).
- **Toasts:** "Added {N} page(s)", "Add failed", "Couldn't open some drawings", "Sheets
  added", "Skipped {name}".

**A legacy bug not to port:** unticked pages come back. `drawing_files.page_count`
holds the full count, and a backfill in `ProjectTakeoff.tsx` materialises every page
wherever `page_count` exceeds the sheet rows. **Here, a page the person skipped stays
skipped.**

**Add sheets** is the same dialog, not first run. It opens from the Sheets panel's "+"
menu ("Add Pages"), from the empty state, and from the canvas. Already-loaded pages
are locked in the page step, and the upsert on `(file, page)` never duplicates.

**Rendering** (`src/lib/takeoff/pdf/`):
- `PdfPageRenderer.ts`, on `pdfjs-dist/legacy`, rasterises at `devicePixelRatio ×
  resolutionScale`; pan is a CSS transform.
- `memoryBudget.ts` sets a byte-budgeted bitmap LRU: 256 MB, halved at 8 GB
  `deviceMemory` or less, quartered at 4 GB or less.
- `pdfDocCache.ts` holds refcounted parsed documents; idle kept is `max(2, 8 × scale)`.
- **Split-source** (`splitSource.ts`): each page is also its own PDF at
  `pages/{project_file_id}/{page}.pdf`, written by the server (`sheet-tiler/split.ts`,
  8 pages per call, 15 s budget) and requested lazily on the first open of a file not yet
  split. The canvas signs the one page's path, falls back to a prefix listing, and then
  to the whole PDF.
- **The fit tier:** a server-rendered `@fit` WebP 2048 px wide (`sheetImageSource.ts`,
  `FIT_WIDTH_PX = 2048`; server `RENDER_DPI_CAP = 144`, quality 90) paints a cold sheet
  first. `chooseSubstrate` picks image or raster; vectors load eagerly when viewport
  width × dpr exceeds 2048. Four decoded bitmaps are kept (`sheetBitmapCache.ts`).
- **Zoom** (`zoomLimits.ts`): 25% to 3000%. The button step is +0.25 below 2×, ×1.25
  above; the wheel zooms by `exp(-delta)`.
- **Two-stage re-raster** (`PdfCanvas.tsx`): a half-resolution pass, then full, after
  `rendering.highResDelayMs` (140 ms; 16 ms after a wheel). Above 2.5× only the visible
  window is rasterised, and a re-raster fires on a zoom change of 1.5% or more.
- **Prefetch and URLs:** `prerenderQueue.ts` keeps at most two sheets ahead, on a 150 ms
  hover. `signedUrlCache.ts` mints URLs in bulk at project open, for 24 hours.
- **Thumbnails are client-side** in legacy: panel thumbnails come from
  `sheetThumbnailCache.ts` (LRU of 16, 512/1024/2048 buckets, gated by an
  IntersectionObserver).

**The sheets panel** (`src/components/takeoff/SheetTree.tsx`):
- Header "Sheets", collapse and expand-one-level, a "+" menu (Add Pages, New Blank Page,
  New Page From Clipboard, New Folder) and an options menu (default expand level, hide
  search, hide takeoffs, List or Thumbnails, expand and collapse all, Sheet naming,
  Rotate Pages).
- Search "Search sheets…" matches the label, number, name and the item names on the
  sheet; "No sheets match "{q}"".
- Sheets nest under drawing folders, with an "At root" bucket. Empty: "No sheets yet.
  Use the + button to add PDFs."
- A row: chevron, label (number "  –  " name, else "Page N"), a scale chip (the
  calibration's label, tooltip "Scale: {label}", nothing when unscaled), an item-count
  chip, a bookmark star, and a "Page actions" menu.
- Rename by double-click or "Properties (rename)": placeholders "A-101" and "Sheet name",
  "Save" and "Cancel".
- Delete: "Delete {n} sheets?", ending "This cannot be undone.", taking emptied folders
  with it, "Deleted {n} sheets[ and {m} folders]".
- Reorder by drag within a folder, disabled in Thumbnails view ("Switch to List view to
  reorder pages"); move across folders by the menu.
- Multi-select with its own menu.

**Calibration and scale:**
- The calibrate tool: toast "Click two points on the sheet, then enter the real
  distance."; dialog "Set sheet scale", "Enter the real-world distance between the two
  points you picked.", units ft, in, m, cm, mm and km behind a flag, "Interpreted as …"
  or "Unrecognized format", "Save calibration".
- After saving: "Scale set — verify with a known dimension", with a Verify action.
- Presets (`scales.ts`): Architectural 1/128" to 3" = 1'-0", Engineering 1" = 5' to
  2000', Metric 1:5 to 1:5000, matched at 0.5%. "No scale". A preset writes a synthetic
  1-point reference line.
- The Scale menu: "Calibrate Scale", "Add Custom Scale" ("Custom Scale" dialog), then
  the grouped list.
- The canvas chip: green "Scale: {label}", or amber "Calibrate scale to compute LF / SF".
- An unscaled sheet blocks Linear, Area and Segment with "Set a scale for this sheet"
  ("Set scale directly" or "Calibrate now", then "Pick a standard scale").
- Changing an existing scale with geometry on the sheet asks "Change scale on this
  sheet?".
- One calibration per sheet; every item on the sheet recomputes after a save.

**The route.** `/projects/:id/takeoff`, sheet not in the URL (the first sheet in panel
order opens). Wave 1 loads files, sheets, folders, items and calibrations in parallel;
wave 2 loads geometries.

**Channel 13, `file-source`.** When a project file's stored object changes, open canvases
drop that file's cached source, images and bitmaps. A split finishing mid-session is
picked up only on the next open.

### What exists today

| Piece | State |
|---|---|
| Takeoff route | `/project/:uuid/takeoff/:sheetUuid`, **the sheet in the URL** (F2-S12's per-sheet tab title depends on it). Kept |
| Entry | `features/project/takeoff-entry.ts` (F4-S13): first ready sheet, else Project Home with `?takeoff=no-sheets` |
| Files | `ProjectFile` in `ProjectFolder`s, multipart (D-27). No link to drawings |
| Drawings | `DrawingFile` (own upload, `storage_key`), `DrawingSheet` (page, number, name, `width_pt`, `height_pt`, rotation, render status, PNG and thumbnail keys, bookmark), `DrawingFolder` (unused), `SheetCalibration` (legacy's fields) |
| Render | `worker/tasks/render.py`: whole-file PyMuPDF raster to PNG plus thumbnail. **Retired by this feature as the display path** |
| Canvas | `features/takeoff/components/SheetCanvas.tsx` over a PNG, SVG overlay in normalised space, zoom as CSS width. `DraftLayer` over it (D-34) |
| Calibration | Two-point dialog, feet only; tools disabled until a scale exists |
| Realtime | Channel 1's item and geometry events live (F8-S18); `useItemPresence`, `useDrafts`, `useCollaborationPrefs` in `core` |
| Bundle | One main chunk, 664 kB (2026-09-26); **P-18** splits the existing routes the same night |

---

## Design

### Data model

- `DrawingFile.project_file_id` (FK to `project_file`, `RESTRICT`), **unique per
  project**: one drawing per file, as legacy's idempotent register. `storage_key`
  becomes the file's own key, read through the `ProjectFile`; the direct upload path
  goes.
- `DrawingSheet` rows exist only for **chosen** pages. `DrawingFile.page_count` stays the
  file's true count, and nothing backfills (the legacy bug above).
- `DrawingSheet.source_key`: the per-page PDF once split, else null (the canvas reads the
  whole file). `thumbnail_storage_key` stays. `image_storage_key` becomes the **fit-tier
  WebP** (2048 px), not the display raster.
- `DrawingFolder` gets used: the mirrored chain of the file's `ProjectFolder`s plus a
  leaf per file, as legacy's `ensureMirroredDrawingFolderChain`.
- **Folder-in-use guard (inherited from D-27):** deleting a `ProjectFolder` whose files
  have drawings is refused, naming how many sheets depend on it; deleting such a
  `ProjectFile` likewise.
- `SheetCalibration` unchanged. It already carries legacy's fields.

### The server prepares, the browser renders (D-14)

- **One Celery task per drawing file, `prepare_drawing_file`**, dispatched after the
  Load commits (D-20). With PyMuPDF (already a dependency):
  1. Split each **chosen** page into its own PDF at `…/pages/{file}/{page}.pdf`.
  2. Render a thumbnail (512 px) and a fit-tier WebP (2048 px, DPI capped at 144) per
     chosen page.
  3. Set `source_key`, the thumbnail and fit keys, and a `prepared` status per sheet.
  4. Commit, then publish `drawing.source.changed` for each page (channel 13).
- **A sheet is usable before it is prepared.** The canvas opens the whole file with pdf.js
  at once; the split source and the fit image make later opens faster, never gate the
  first.
- **The sweep D-20 left to F5:** a drawing file with pages unprepared for 10 minutes and
  no live job is re-dispatched by beat.
- Adding pages later prepares only the new ones.

### Rendering (a port, not a design)

The legacy modules are lifted into `src/lib/takeoff/pdf/` **with no React imports and no
network calls** (hard rule 2). The network edge, presigned URLs, lives in
`features/takeoff/`. Kept as legacy measured them:

- The renderer, the refcounted doc cache and the memory budget.
- The fit tier and the full tier at idle.
- Zoom limits from one module, and the step rule. **The range is the founder's, not
  legacy's: 50% to 4000% (D-35).**
- The two-stage re-raster and windowing above 2.5×. At every settled zoom up to 4000%
  the page on screen is a fresh pdf.js raster of the visible window, so it is sharp;
  a CSS-scaled bitmap is only the interim frame while the next raster is drawn.
- The prerender queue, and the signed-URL cache (the api mints URLs in bulk for a
  project's sheets: one call, not one per sheet).

PARITY §24's baselines are the acceptance numbers, measured on the bench with the same
sheets legacy used where they exist.

### Code splitting (P-18)

P-18 (overnight, 2026-09-26) splits the existing routes. F5 adds:

- The takeoff page, the canvas and pdf.js in their own lazy chunks.
- The pdf.js worker as its own asset.

The dashboard must not load a byte of pdf.js; the bench greps `dist/` to prove it, as
F3-S13 and F4-S2 do.

### Realtime (D-13, D-33, D-34)

| Event | Topic | Payload | Published by | Heard by |
|---|---|---|---|---|
| `sheet.calibration.changed` | project | `{project_uuid, sheet_uuid}` | calibration `PUT`, `DELETE` | the sheet's canvas (scale chip, quantities), the sheets panel's scale chip |
| `drawing.source.changed` | project | `{project_uuid, file_uuid, page?}` | `prepare_drawing_file` (worker) | open canvases drop that page's cached source and re-sign (channel 13) |
| `drawing.sheet.changed` (**new, beyond legacy**) | project | `{project_uuid, sheet_uuid?, kind}`, kind `created\|updated\|deleted\|reordered` | Load and Add sheets, rename, move, reorder, delete, bookmark | every open sheets panel |
| `takeoff.item.changed`, `takeoff.geometry.changed` | project | as F8 | kept on every item and shape write | `useLiveItems`, kept on the new canvas |

Legacy's channel 1 did not watch `drawing_sheets`; a colleague's new sheets appeared on
the next load. `drawing.sheet.changed` is proposed so two estimators loading pages see
each other's (Q6).

**Drafts on the new canvas.** `DraftLayer` (D-34) is lifted onto the pdf.js canvas as it
is: it draws in normalised sheet space, so it needs no change. It keeps honouring the
Collaboration preferences (`useCollaborationPrefs`). Cursors stay F7's.

---

## Subtasks

Each criterion is checked by hand in two windows and driven by a fixture. Window A is
the owner on `:5173`; window B is Sara W. on `:5174` (the `realtime` profile).

# Block A: Foundations

### F5-S1: Drawings from project files (the model)

**Work.**
- `api`: the migration above (`project_file_id`, `source_key`, `prepared` status,
  drawing folders in use). Existing bench drawings have no file; the migration keeps
  them, `project_file_id` null, and the seed is moved to the new path (S9).
- `api`: `POST …/drawing/load`, body `{files: [{project_file_uuid, pages: [n…]}]}`,
  capability `canUploadDocuments`:
  - It creates or reuses the `DrawingFile`, mirrors the folder chain, and creates the
    chosen pages' sheets.
  - It is idempotent per `(file, page)`. It refuses a file that is not PDF, PNG, JPG or
    TIFF, naming it. It refuses a page number beyond the count.
  - It publishes `drawing.sheet.changed` and dispatches `prepare_drawing_file` after
    the commit.
- `api`: the folder-in-use guard on `ProjectFolder` and `ProjectFile` delete.

**Acceptance criteria.**
1. Loading pages 1 and 3 of a three-page PDF makes two sheets. Loading pages 2 and 3
   again adds only page 2. Page 3 is not duplicated.
2. A skipped page never appears later, after any reload or preparation.
3. Deleting the Plans folder while its PDF has sheets is refused with the count.
4. A `.docx` in the request is refused, naming the file.

### F5-S2: Preparation on the worker

**Work.** `prepare_drawing_file` as designed, the beat sweep, and `drawing.source.changed`
from the worker.

**Acceptance criteria.**
1. After a Load, each chosen page gains a split source, a thumbnail and a fit image in
   MinIO, and the sheet reads prepared.
2. A window with the sheet open hears `drawing.source.changed` and switches to the split
   source with no reload.
3. Kill the worker mid-file; the sweep re-dispatches it within ten minutes and it
   completes.
4. The api answers the Load before any preparation starts (D-20).

### F5-S3: The takeoff route in its own chunks (P-18's F5 half)

**Acceptance criteria.**
1. The dashboard's network panel shows no pdf.js and no canvas chunk.
2. `drives/f5-s3-bundle.sh` finds pdf.js only in the takeoff chunks of `dist/`.
3. A redeploy while on the dashboard, then opening takeoff, reloads once through the
   stale-chunk guard (F2-S13) and never white-screens.

# Block B: Into takeoff

### F5-S4: Perform Takeoff, one decision

**Work.** `takeoff-entry.ts` becomes legacy's three branches: any drawing, then open
takeoff; else a takeoff-capable project file, then open takeoff with the dialog; else
open takeoff empty. The dialog's trigger rides router state and is cleared on arrival.

**Acceptance criteria.**
1. A project with a PDF in Plans and no drawings: Perform Takeoff opens takeoff with
   "Load project files into takeoff".
2. After one Load (or Skip with nothing loaded, see Q2), Perform Takeoff never shows it
   again. A refresh of takeoff never re-opens it.
3. A project with no files opens the empty takeoff: "No sheets yet", "Add sheets".
4. The dashboard ruler and Project Home's button agree for every case (F4-S13 AC3,
   re-driven).

### F5-S5: From Project Files

**Acceptance criteria.**
1. The tree shows the project's folders, root open. Ticking a folder ticks every
   eligible file beneath it and shows the parent part-ticked.
2. A `.docx` is greyed, "unsupported type"; a PDF already in takeoff reads "in takeoff —
   pick more pages".
3. The footer counts what is in takeoff and what is unsupported, and "Open project
   files" goes to Project Home's files.
4. "Choose pages ({n})" counts the ticked files. With none, it is disabled.
5. An empty project reads "No files yet. Upload from the Files page or use the Upload
   tab."

### F5-S6: Choose pages, then Load N pages

**Acceptance criteria.**
1. Every page of each chosen file is a thumbnail, "Page {n}", all ticked; "{sel} of
   {pageCount} pages" follows each tick; "Select all" and "Clear" work per file.
2. Unticking two of five pages reads "Load 3 pages"; loading opens takeoff on the first
   loaded sheet, with "Added 3 pages".
3. Pages already loaded show "loaded", ticked and locked.
4. A 150-page set shows its first thumbnails within a second and never renders more
   than three at a time.
5. A file that pdf.js cannot open is named in "Couldn't open some drawings", and the
   others still load.

### F5-S7: Upload drawing

**Acceptance criteria.**
1. Dropping a PDF and a PNG uploads both to the project root (multipart, D-27), loads
   every page of each, and reads "Sheets added".
2. A `.dwg` is skipped: "Skipped {name}", "Sheets can be PDF, PNG, JPG or TIFF."
3. The PNG becomes a one-page sheet at its own proportions (Q3).

### F5-S8: Add sheets

**Acceptance criteria.**
1. From the Sheets panel's "+", "Add Pages" opens the same dialog titled "Add sheets",
   with no Skip.
2. A file already loaded offers only its unloaded pages as new; loading one adds one
   sheet.
3. The empty state's "Add sheets" opens it too.

### F5-S9: Project Home's Sheets block retired

**Work.** Remove the block, its direct upload, the whole-file PNG render and its polling.
The seed script loads Riverside's PDF through `/drawing/load`. `f4-s25` is retired with a
note; `f8-s*` fixtures move to the new seed without change to what they assert.

**Acceptance criteria.**
1. Project Home has no Sheets block; its files are the only place to put a drawing.
2. `seed.py --reset` produces a Riverside with two prepared sheets, page 1 calibrated.
3. The full F8 regression passes on the new seed.

# Block C: Rendering (D-14)

### F5-S10: pdf.js on the canvas

**Work.** Port the renderer, the doc cache and the memory budget into
`src/lib/takeoff/pdf/`, and replace the `<img>` under `SheetCanvas`'s overlay with the
rendered page. The overlay, the normalised coordinates, the vertex editing and the
`DraftLayer` are unchanged.

**Acceptance criteria.**
1. A sheet renders sharp at 100%, 400%, 2000% and **4000%** on a dpr-2 display (D-35):
   once the zoom settles, the pixels on screen come from a pdf.js raster at that zoom,
   never a CSS-scaled bitmap. The fixture compares the settled canvas's backing size
   with its CSS size times dpr, and checks a thin vector line stays one to two device
   pixels wide at 4000%.
2. Every existing measurement lands exactly where it did on the PNG (the seed's 1,600.00
   SF square reads 1,600.00 SF and sits on its drawn box).
3. Switching sheets opens a file once: the doc cache shows one document per file.
4. On a 4 GB `deviceMemory` profile the bitmap budget is 64 MB.

### F5-S11: The fit tier, zoom rule and two-stage re-raster

**What the overnight proof found (finding 3, 2026-09-26).** Today's canvas stops at
800% and steps ×1.25 throughout. The founder set the range to **50% to 4000%** (D-35),
beyond legacy's 25% to 3000%.

**Acceptance criteria.**
1. PARITY §24: fit tier 2048; a cold open paints the fit image first when the document is
   not open, and fetches no image when it is.
2. **Zoom 50% to 4000%** (D-35) from one module that every clamp reads: the wheel, Fit,
   the buttons, and later Find Text. The buttons step +0.25 below 2× and ×1.25 above;
   the wheel and the buttons both stop exactly at 50% and 4000%.
3. After a zoom, a half-resolution pass then a full pass; above 2.5× only the visible
   window is rasterised.
4. Cold open medians over three runs, recorded against the legacy numbers: light sheet
   about 200 ms to first paint and under 900 ms settled; heavy sheet about 165 ms to
   first paint.

### F5-S12: Split-source and the signed URLs

**Acceptance criteria.**
1. A 150-page set opens its page 90 by fetching that page's split PDF, not the set
   (network panel).
2. Before preparation, the same page opens from the whole file by range requests.
3. One call signs every sheet of a project on open; no per-sheet sign on switching.
4. **Abdullah:** MinIO on the bench, and S3 in production, answer `Range` and expose
   `Content-Range` (flows.md, flow 2).

# Block D: The sheets panel

### F5-S13: The tree, search and rows

The overnight proof found no sheets panel in takeoff today (finding 6, 2026-09-26): a
sheet is reached only from Project Home. This subtask is where it arrives.

**Acceptance criteria.**
1. Sheets nest under the mirrored folders, with "At root" for the rest, and the current
   sheet's row is highlighted.
2. "Search sheets…" matches number, name and item names; no match reads "No sheets
   match "{q}"".
3. Each row shows its label ("A-101  –  Foundation Plan", else "Page 3"), its scale chip
   or none, its item count, and its bookmark star.
4. Thumbnails view shows the server thumbnails, loaded only when scrolled into view.

### F5-S14: Rename, move, reorder, bookmark, delete

**Acceptance criteria.**
1. Double-click renames with "A-101" and "Sheet name" fields; Save persists; B's panel
   follows (`drawing.sheet.changed`).
2. Drag reorders within a folder; Thumbnails view says "Switch to List view to reorder
   pages".
3. "Delete 2 sheets?" names what goes, including item counts, ends "This cannot be
   undone.", and reads "Deleted 2 sheets" after.
4. Multi-select with ctrl and shift, and its menu, act on all selected.

# Block E: Calibration and scale

### F5-S15: Calibrate, to legacy's words

**Acceptance criteria.**
1. The toast, the "Set sheet scale" dialog, "Interpreted as …" and "Save calibration"
   read as legacy's.
2. After saving: "Scale set — verify with a known dimension".
3. Every item on the sheet recomputes; B, on the same sheet, sees the new scale chip and
   quantities within a second (`sheet.calibration.changed`).

### F5-S16: Scale presets, custom scale, and the guards

**Acceptance criteria.**
1. The Scale menu lists Architectural, Engineering and Metric; picking 1/8" = 1'-0" sets
   the scale and the chip reads it.
2. "Add Custom Scale" accepts a ratio and a label.
3. Linear on an unscaled sheet opens "Set a scale for this sheet".
4. Changing a scale on a sheet with items asks "Change scale on this sheet?" first.
5. The canvas chip is green "Scale: {label}" or amber "Calibrate scale to compute LF /
   SF".

# Block F: Collaboration and the inherited promises

### F5-S17: Live on the new canvas

**Acceptance criteria.**
1. `useLiveItems` still brings B's shapes into A within a second (F8-S18, re-driven).
2. A draws slowly; B watches it grow, tagged "Bench E.", and become a saved shape.
3. B's Collaboration preferences change what B sees, as `f8-s14` drives today.
4. The collaboration modes' `f8-s9`, `f8-s11` and `f8-s12` pass on the new canvas.

### F5-S18: A platform admin's controls (F3-S4 AC6)

The first control in takeoff that calls `can()` closes F3's promise: a platform admin in
a collaborator-plan workspace sees the measure tools enabled.

### F5-S19: The two-window live check

1. Window A calibrates A-101; window B, open on A-101, shows the new scale and the
   recomputed quantities with no reload.
2. A draws a run slowly; B watches it grow, tagged with A's short name, then become a
   saved shape the moment A finishes.
3. A loads two more pages; B's sheets panel shows them (Q6).

---

## Not in F5

Named so nothing is lost. The owners are proposals (Q7).

| Legacy behaviour | Proposed owner |
|---|---|
| Auto-Name (OCR title block), Name from page region | F12 (both read the text layer that F5 makes available) |
| New Blank Page, New Page From Clipboard, Duplicate page, Rotate Pages, Crop region to page | F7 |
| Preview window, open sheet in a new tab, the read-only sheet viewer, overlays | F11 |
| Print pages | F11 |
| Read the scale from a region, apply to every sheet; scale evidence | F12 |
| Sheet stepper, open another project from takeoff | F7 |
| Panel layout persisted per user, edge tabs, resize | F7 |

---

## Sequencing

| Block | Subtasks | What it is |
|---|---|---|
| **A: Foundations** | S1 to S3 | The model, the worker, the chunks. **Reporting boundary** |
| **B: Into takeoff** | S4 to S9 | Perform Takeoff, the dialog, Add sheets, the old block retired |
| **C: Rendering** | S10 to S12 | pdf.js, the baselines, split-source |
| **D: Sheets panel** | S13, S14 | The tree and its acts |
| **E: Calibration** | S15, S16 | Legacy's words, presets, guards |
| **F: Collaboration** | S17 to S19 | F8's duties, F3's promise, the two-window check |

Block C can start beside Block B once S1 lands. S9 waits for S4 to S8.

## Bench

- Fixtures `browser/f5-s{1..19}.mjs`; `drives/f5-s3-bundle.sh`.
- A 150-page PDF and a heavy vector sheet as bench fixtures (generated, not client data).
- Gates: `ruff`, `mypy`, `lint`, `typecheck`, `build`. The full regression at each block's
  end: F5 touches the seed that every takeoff fixture uses.

## Definition of done

- S1 to S19 driven, two windows, loading, empty, error and unauthorised states.
- PARITY §7's lines in scope ticked; §9's calibration and scale lines ticked; §24's
  baselines measured and recorded against legacy's; §5's Project Home line ticked; §10's
  "calibrations live" part closed.
- Project Home's Sheets block gone; the PNG display path gone.
- The spec archived, the MANAGER row dropped, F5 in FEATURES ✅ Live, the mirror
  refreshed.

---

## Questions for the founder, answered

Answered by the founder on 2026-09-26 and logged as **D-36**: every recommendation,
as written. The founder also set the zoom range (**D-35**), which S10 and S11 carry.

| # | Question | Answer |
|---|---|---|
| Q1 | **Thumbnails: server or browser?** | **Both, split by moment:** Choose pages renders in the browser with pdf.js (legacy's, and the only option before Load); the sheets panel uses server thumbnails made at preparation, so a 150-sheet panel costs no pdf.js work |
| Q2 | **Skip on first run with nothing loaded** | **Legacy's rule:** "asked once" is the drawing count, so the dialog opens again next time. The empty takeoff offers Add sheets anyway |
| Q3 | **Images (PNG, JPG, TIFF)** | **Wrapped into a one-page PDF on the worker.** The original stays the `ProjectFile`; the wrapper is the drawing's source. One code path, and the person's file is never replaced |
| Q4 | **The selected sheet in the URL** | **Kept**, beyond legacy; F2-S12's per-sheet tab titles rely on it |
| Q5 | **Metric units in calibration** | **Legacy's flag, ported, off.** Feet and inches only, as legacy ships |
| Q6 | **`drawing.sheet.changed`** | **Added**, beyond legacy: two estimators loading pages see each other's |
| Q7 | **The "Not in F5" owners** | As the table proposes |
| Q8 | **Existing bench drawings** with no project file | **The seed moves to `/drawing/load`; old bench rows stay unlinked.** F17 maps legacy's `drawing_files.project_file_id` directly |
| Q9 | **Legacy's bug**, skipped pages coming back | **Not ported.** A skipped page stays skipped |
