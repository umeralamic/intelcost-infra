# P-20a: Rotate pages

_Spec for the `MANAGER.md` P-20a row. Ports legacy's "Rotate Pages…" from the sheets
panel's menu: turn the selected pages, or all of them, by a relative turn or to an
absolute rotation, stored on the sheet and followed by everything that draws it._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) (D-13, D-32, D-36 F5 Q6, D-51) · **Parity:**
[../PARITY.md](../PARITY.md) §7 (the panel's page actions) · **Sits on:**
[takeoff_shell_tasks.md](../archive/takeoff_shell_tasks.md) (F5)

_Written 2026-09-27 (overnight) from legacy `intelcost/` at `12dd119b`. The founder put it
right after F5 and before F6 (2026-09-27). **Status: built 2026-09-27 (overnight),
awaiting the founder's click check.** `p20a` 8/8._

## Progress

| Subtask | State | Proof |
|---|---|---|
| S1 the api | Built | `p20a` step 2: `PUT …/sheet/rotation`, 45 refused 422 by it and by the PATCH, `rotation` ignored, a viewer 403, 90 and 270 stored in one write |
| S2 the dialog | Built | `p20a` step 3: under Page layout; opens on All; Landscape ticks 2 of 3; "Rotate 2 pages to 90°.", "Turn 2 pages by 180°."; "Rotated 2 pages", only the changed pages written |
| S3 the canvas and thumbnail follow | Built | `p20a` steps 4 to 8: the turned box fits the canvas (801 × 1238 in 864 px); Run R's vertices and 60 LF unchanged; a run drawn turned stored unturned, 59.99 LF; at 488% the pdf.js window covers the view; the thumbnail turned; a second window on api-b turned in 356 ms, no reload |

**Found while building:**
- A turned sheet's prerender and its cached frame are keyed on the unturned page's width,
  which differs from the canvas column's. A neighbour that is turned is drawn ahead at the
  column's width and so misses the cache: it opens on its fit image first, as a cold sheet
  does. Small, and noted rather than fixed.
- A colleague's draft name tag on a turned sheet turns with the page (it sits inside the
  page box, as legacy's did). The live quantity readout was moved out, so it reads upright.

---

## What legacy does

- **Where:** the sheets panel's ⋮ menu, under "Page layout": "Rotate Pages…"
  (`SheetTree.tsx:1590`). It opens with the panel's selection.
- **The dialog** (`RotatePagesDialog.tsx`), "Rotate Pages", with "Turning a page is view
  only — quantities, deducts and calibration are unchanged.":
  - **Which pages:** Current page, Selected pages (N), All pages (N). It opens on
    Selected when there is a selection, else All.
  - **Layout:** All layouts, Landscape, Portrait, as the page reads **now** (its size
    swapped at 90° and 270°).
  - **Current rotation:** Any, 0°, 90°, 180°, 270°.
  - "{n} of {N} pages match · {t} ticked", Select all, Select none; a list of the
    matching pages, each ticked, with its layout and rotation; "No pages match these
    filters."
  - **Turn by:** 90° clockwise, 90° counter-clockwise, 180°. **Set to:** 0° (upright),
    90°, 180°, 270°. Picking one makes it the mode.
  - The footer reads "Rotate N pages to 90°." or "Turn N pages by 90° clockwise." or "No
    pages selected.", with Cancel and Apply. Apply writes only the pages whose rotation
    changes, then "Rotated N pages".
  - "All pages + Landscape" is one click: the filters tick every match.
- **Stored:** `drawing_sheets.view_rotation`, 0/90/180/270. The `rotation` column is the
  PDF's own `/Rotate`, already drawn in by pdf.js, and is never written by it ("reading it
  here double-rotated every landscape sheet").
- **Drawn:** the page container is turned by a CSS transform, so every stored coordinate
  stays in unrotated page space and no quantity, deduct or calibration changes. The one
  consequence is that a pointer position maps back through the inverse turn
  (`engine.ts` `clientToElementFraction`).
- **Not live** in legacy: the other tab sees it on its next reload.

## What exists today

`drawing_sheet.view_rotation` exists, defaults 0, and the sheet PATCH accepts it
unvalidated. Nothing reads it. The same PATCH also accepts `rotation`, the PDF's own,
which nothing should write.

## Design

- **The api:** `PUT …/drawing/sheet/rotation` with `[{sheet_uuid, view_rotation}]`, every
  value one of 0, 90, 180 or 270, in one transaction and one `drawing.sheet.changed`
  (D-36 F5 Q6), so a colleague's panel and canvas follow live, beyond legacy. It needs
  Edit takeoff, as the panel's other sheet writes. The PATCH refuses a view rotation that
  is not a right angle, and no longer takes `rotation`.
- **The rule, in `lib/takeoff/rotation.ts`** (hard rule 2: no React, no network): normalise
  a turn, a page's layout as it reads now, the dialog's result for a sheet, the footprint
  of a turned page, and the pointer's inverse map.
- **The canvas:** the page box is turned inside a footprint box sized to the turned page;
  zoom 1 fits the footprint's width to the canvas. The fit image, the pdf.js raster, the
  measurement overlay and colleagues' drafts all sit inside the turned box, so they turn
  together. The raster's window above 2.5× is found in the unturned page.
- **The panel:** a turned sheet's thumbnail turns with it.

## Subtasks

### P-20a-S1: The api

**Acceptance criteria.**
1. `PUT …/drawing/sheet/rotation` sets each sheet's `view_rotation`, answers the sheets,
   and publishes one `drawing.sheet.changed`.
2. 45, or any value not a right angle, is refused 422, by the bulk call and the PATCH.
3. `rotation` is not writable.
4. A viewer is refused 403.

### P-20a-S2: The dialog

**Acceptance criteria.**
1. The panel's ⋮ menu offers "Rotate Pages…" under "Page layout".
2. With nothing selected it opens on All pages; with a selection, on Selected pages.
3. All pages + Landscape ticks exactly the landscape pages; the footer and the counts
   read in legacy's words.
4. Set to 90° and Apply: "Rotated N pages", and only pages whose rotation changed are
   written.
5. A viewer sees it disabled, "View only".

### P-20a-S3: The canvas, the thumbnail and the quantities follow

**Acceptance criteria.**
1. A sheet turned 90° draws turned: the fit image, the pdf.js raster and the shapes, and
   the page fits the canvas's width.
2. A run drawn on the turned sheet is stored in unturned page space and reads the same
   length as the same paper run drawn unturned (D-51 holds).
3. A shape drawn before the turn sits on the same drawing feature after it.
4. The panel's thumbnail turns with the sheet.
5. A second window's canvas and panel turn live, with no reload.

## Not in P-20a

| Legacy behaviour | Owner |
|---|---|
| Rotate and Mirror on the canvas's right-click sheet menu | F7 (the canvas menus) |
| Print honouring the turn | F11 |

## Definition of done

S1 to S3 driven (`p20a`, two windows); PARITY §7's rotate line ticked; gates and the quick
tier green.
