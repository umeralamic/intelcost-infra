# Release notes for testers

What a tester sees change, newest first. Each entry names its decisions in `DECISIONS.md`.

## Tester candidate: panels, utilities and sheets (2026-11-13)

Tagged `tester-candidate-2026-11-13`. The fixture suite still has to pass on the test laptop before this goes to
testers (D-1057).

**Takeoff and Sheets panels**

- **New look.** Panel text is Times New Roman by default, items 12 px, sub-items and cost components 11 px (Settings ›
  Panel text still changes it). Lines run the panel's full width and sub-item rows fit their text (D-1236, D-1241).
- **Right-click instead of ⋮.** An item's whole menu, and a cost row's Edit and Delete, are on the right-click; the row
  says "Right-click for options" on hover, and a long press opens it on touch. A greyed menu entry says why under its
  label (D-1238, D-1240, D-1249).
- **Selection.** A selected item is a pale blue tint with bold dark text; the open sheet is a pale orange row with an
  accent bar on the panel's left edge. In the Sheets panel both run the full row, however deep the sheet is nested
  (D-1247, D-1240, D-1257).
- **Sheet icon.** A drawing sheet with its title block on the right, square corners (D-1256).
- **Others' work.** "Show all" (on by default) shows or hides other people's folders, items, sub-items and cost rows in
  both panels; their markings stay on the drawing (D-1233).
- **Layers.** Bid packages keep the order they were made in; move one up or down in the Bid package list, or drag it in
  Estimating's tabs, and the order is the same everywhere (D-1239).

**Utilities and earthwork**

- **Inputs apart from priced lines.** Drawn runs and structures sit in "Utility Inputs › Sanitary / Storm / Water…";
  Calculate's priced lines sit in "Utilities › …", by pipe size then depth. Utility Inputs and "Grading Inputs" (the
  earthwork inputs, was "Earthwork Markups") are at the bottom of both views, Grading Inputs last. A project made
  before this shows a "Move inputs to Utility Inputs" banner: one click, and Undo puts them back (D-1242, D-1247,
  D-1253).
- **Codes.** A utility run or structure takes its system's Division 33 code (Water, Sanitary Sewer, Storm Drainage…);
  a code you set by hand is kept. Classification shows a Utility Inputs group too (D-1245, D-1253).
- **Descriptions.** After each run's and structure's name, in grey: `6" PVC SDR-26 · C10`, `48" round MH · rim 9.00 ·
  C10`. It follows the settings and shows wherever a run is picked (D-1250).
- **Resume on another sheet.** Resume works on any sheet with a scale; a run continued on another sheet is "SS-1 · C11",
  marked "Continues SS-1", starting at SS-1's end invert. A sheet with no scale offers "Set scale first"; a detail
  sheet asks before continuing (D-1243, D-1246).
- **Names with their sheet.** Lines made once per sheet or site carry it ("Strip topsoil (6") – C16"); a pipe on more
  than one sheet carries each sheet. Existing projects take the new names at their next Calculate (D-1248).
- **Depth and pricing.** Every gravity run is priced at its own depth (D-1229); unit costs show 2 decimals (4 below
  $1), sales tax at the city's rate (D-1138 to D-1140); a Soil Import buys what its fill type names (D-1135, D-1136).
- **Jobs across sheets.** A job (several sheets or a stitched site) is calculated and re-struck as one (D-1133, D-1137).

**Drawing and sheets**

- **Dimensions** stay readable at any zoom: line, heads and text capped, the label along the line (D-1232).
- **Overlay**, first slice: compare two sheets As drawn or with changes highlighted (D-1231).
- **Sheet preparation** retries a passing network or storage error (after 30 s, 2 min and 5 min) before "Couldn't
  prepare this page" (D-1255).
- **New project** asks Currency, Measurement system, Scope of Work and Project Notes (D-1220 to D-1226).

**When testing**

- A page that shows "Couldn't prepare this page" after several minutes is a real failure: report it with the file.
- The Move inputs banner appears only on projects made before this build.

## Disposal, haul trucks and clearing (2026-11-07)

- **Saved estimates: tipping becomes Disposal.** A saved estimate's tipping (dump) fees become their own
  "Disposal" cost kind on the line's next Calculate, and the line's total may change then (D-1029, D-1035).
  Disposal is untaxed unless it is ticked in the Bid Summary's tax ticks; it has its own report and export column.
- **Dump sites.** A company keeps its dump sites (materials taken, fee by the load, LCY, ton, free or paying us,
  distance); each disposal line takes the lowest total of fee and trucking and shows the runner-up. With no site, the
  library's fallback fee is used and a large line is flagged "Check dump fee" until a site is chosen or the fee
  confirmed (D-1035, D-1043).
- **Haul trucks on a cycle.** Trucks off site are counted from a load, dump, dump-queue and travel cycle over the
  haul distance, a setting of its own apart from the mob distance; "Haul distance not set" flags a line without one.
  The Equipment settings show the truck's payload, speeds, dump time and the new dump queue / scale time (D-1035,
  D-1043).
- **Cut to export.** Cut that leaves the site is priced as excavate-and-load straight into the haul trucks, with the
  loader paced to its trucks (D-1037).
- **Clearing.** Medium and heavy clearing run heavier crews and machines than light; the clearing debris haul-off is
  loaded by a wheel loader, so the loader is costed (D-1039, D-1043).
- **Small quantities.** A small line whose work a machine already on the project can do is priced on that machine's
  own hours with no rental minimum or mob, marked "By machines on site" (D-1040).
