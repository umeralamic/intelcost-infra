# F5-LF — Folders on load (D-308)

_Picked up 2026-10-08. The founder's answers and additions are D-308._

## Problem

Loading project files into takeoff put every file's sheets in a folder named after the file.
Ten one-page PDFs (S0.00 … S3.01) became ten folders holding one "Page 1" each, and Choose
pages offered Select all, Clear and "1 of 1 pages" for every one-page file. A real set
(Electrical, Plumbing) got its folder whether wanted or not, under a name the person could
not change.

## Solution

| # | What | Where |
|---|------|-------|
| 1 | One-page files share one grid on Choose pages, a tile each under the file's stem, with the grid's own Select all and Clear; their per-file controls are gone | app `features/takeoff/components/load/PageChooser.tsx` |
| 2 | Each multi-page file not yet in takeoff gets "Put in a folder" and a name box (opens on the stem). Ticked by default for ≥2 **selected** new pages, unticked for exactly 1; visible either way | same |
| 3 | A master "Put each set in its own folder" sets every multi-page row; a row can then differ (the master reads indeterminate) | same |
| 4 | A file already in takeoff hides the control: "New pages go where this file's loaded pages are" | same |
| 5 | The Load sends `folder: {name}` or `folder: null` per file; no `folder` (Upload drawing) takes the server's default, a folder for ≥2 pages | app `LoadSheetsDialog.tsx`, `load-selection.ts`, `features/drawing/{api,kinds}.ts` |
| 6 | Server: the name is trimmed, blank falls back to the stem; a name already at that level (trimmed, case-blind, not a mirror) merges, as do two files in one Load given one name | api `features/drawing/load.py` (`_target`, `_set_folder`, `folder_name`), `schemas.py` (`LoadFolder`), `routes.py` |
| 7 | Sheet names: loose one-page file → stem; loose page of a multi-page file → `<stem> – p.N`; in a set's folder "Page N", or `<stem> – p.N` when the folder holds or will hold another file's sheets. Existing sheets are never renamed | api `load.py` (`_sheet_namer`, `_shared`) |
| 8 | The mirrored Project Files chain is unchanged: loose means loose in the file's mirrored folder | api `load.py` (`_mirror`) |
| 9 | No migration: existing one-page folders stay | — |

Crop as New Page and New Page call the same load for one page; they now get a loose sheet they
move and rename as before, so no throwaway folder is made and dropped.

## Check (2026-10-08)

Gates green (ruff, format, mypy; lint, typecheck, build); quantity table passed. `alembic check`
reports three index differences on estimate and takeoff tables this work did not touch.

Smoke, Playwright MCP, throwaway account: 3 one-page and 3 multi-page PDFs loaded at once →
S0.00–S0.02 loose at the root; Electrical with a blank name → "Electrical Set" folder; Plumbing
"Wet Trades" and Mech " wet trades " → one merged folder, sheets `<File> – p.N`; master toggle off,
on, and mixed after a row override. Then 1 page of Fire Set (row defaulted off) → loose "Fire Set –
p.2". Direct api: folder `"   "` → "Roof Set"; `"  ELECTRICAL set "` merged into "Electrical Set";
Fire Set p.1 with a folder asked stayed loose beside p.2. Passed.
