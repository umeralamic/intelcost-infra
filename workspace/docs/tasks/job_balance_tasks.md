# F39: One earthwork balance per job, across sheets

Status: planned, decisions taken (D-1126). Not built.

## Problem

A sheet's Calculate strikes its own soil balance (`lib/takeoff/earthwork/balance.ts`, "the soil balance of one
sheet"). Its cut beyond its own fill becomes "Cut to export" and a Soil Export haul to a dump site; a sheet short of
soil buys Soil Import. Two sheets of one project that are not stitched (F19) therefore price as two jobs: one sheet's
surplus is trucked off while the next sheet's shortfall is bought in.

What already balances together, and stays as it is:

- several boundaries (regions) on one sheet: one Calculate, one balance (`cutExportShares`, `fillShares`);
- sheets joined by Stitch sheets (F19): one site, one Calculate, one balance.

## Decisions (D-1126)

1. **Default: every grading sheet of a project balances together**, the job. A sheet (or a stitched site) can be
   marked "Separate job" and keeps its own balance as today. Stitched sites take part as one member.
2. **No haul line between areas.** Soil moved from one sheet's cut to another sheet's fill is priced as ordinary
   on-site cut to fill: the giving sheet's Cut line (its method: excavator, dozer push, scraper) and the receiving
   sheet's Fill line. The job's equipment pool (D-1115) already shares the machines across sheets.
3. **The job's balance lines sit on the first sheet** (page order) of the job, as a stitched site writes on its
   anchor: Soil Export (soil, rock, unsuitable), Soil Import, the import's materials; their Takeoff Ref. names every
   member sheet.
4. The earthwork assumptions are the project's already (one shrink, swell and "native soil suitable" for the job);
   each layer keeps its own factors (D-588).

## Engine (data in, data out; no React, no network: hard rule 2)

- `jobLineInputs(members)`: the members' stored results combined into one `LineInputs`, each member's regions, layers,
  strip areas, features, utility spoils and undercut kept with a member key (`<sheet uuid>:<region id>`), so nothing
  of one sheet is mistaken for another's. The per-sheet site choices (methods per region, fill shares typed) stay
  per member.
- `earthworkLines(job)` runs once over the combined input: the job's surplus, shortfall, `cutExportShares` and
  `fillShares` as one site's. Each region's lines (Cut, Cut to export, Fill, rock, strip, undercut, compaction) go
  back to its own sheet by its member key; the balance lines (`__soil_export__`, `__soil_import__`, haul-road water
  only within one member) go to the first sheet.
- A job of one member gives exactly today's lines (checked by the quantity table: every existing earthwork row
  unchanged).

## Api

- `project_earthwork_job` setting per sheet or site: `separate` (bool), default false. One migration.
- The lines write (`earthwork/routes.py` `save_result`, `lines.py` `write_lines`): a Calculate of one member also
  rewrites the job's balance lines on the first sheet and the other members' Cut and Fill shares, from their stored
  results; no other member is recalculated. A member whose stored result is stale (its drawing moved on) is named
  ("C-2 needs Calculate: the job balance uses its last result").
- The first sheet's balance lines carry `builder="job"` (D-1114) so a rebuild of one sheet never retires them.

## Screens

- Earthwork results panel: the job line under the sheet's own, e.g. "Job balance (3 sheets): this sheet 1,200 BCY
  over its fill; 900 BCY to C-2 and C-4's fill; 300 BCY exported", and "Separate job" on the sheet's row.
- Grading report: a Job balance table (each member's cut, fill and share, the job's export and import).
- Sheets panel: the job's members, a member marked separate shown so.

## Proof

- Quantity table `job` rows, by hand: two sheets, A 1,000 BCY over its fill, B short 600 CCY at shrink 1.10:
  660 BCY of A's cut fills B, 340 BCY exported at A's swell, no import. Then: both short (import once, on the first
  sheet); A with an unsuitable layer (it always leaves, from A); a member marked separate (its own balance, as
  today); a stitched site as one member; one member only (today's lines exactly).
- On a throwaway copy of a two-sheet project: lines and bid before and after; one Calculate settles it (D-1110).
- First, read only: which projects have more than one grading sheet with a result and no stitch, so the change in
  their bids is listed before it lands (D-1022, founder data rules).

## Not in scope

- Hauling soil between separate parcels by road (decided: no haul line, D-1126 2). A "Separate job" sheet is the way
  to keep a distant parcel apart.
- Overlap detection between sheets that draw the same ground: a sheet that repeats another's area is marked
  "Separate job" (or not given a boundary); a warning when two members' boundaries overlap in registered coordinates
  is a follow-up.
