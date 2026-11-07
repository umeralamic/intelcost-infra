# Run progress (2026-11-06/07, run mode)

Updated after each item. Benchmark A's figures are only in `test-data-local/benchmark-a/` (D-1025); shares below are
of the copy's bid after item 0 (the original's figure).

**Checks before the run:** `E:\Intelcost\docs` is inside a git repo: **no**. But `intelcost-infra/workspace/docs/` mirrors
it: the two new reference workbooks (`Mohave_AZ_all_crafts_labor_comparison.xlsx`, `DE MAIN SOURCE FILE r&d arizona.xlsx`)
are git-ignored there and never copied (infra 25f1c3f). Older reference files in the mirror were committed before.

## Done
- PRICING_FIX_PLAN redacted, pushed (D-1025). WAGE_PLAN written, pushed; approved 2026-11-06 (D-1032).
- BLS client and key setup (api 8b7dcfc, infra 25f1c3f; D-1030, D-1031).
- Item 9 internal workspaces (D-1026): api 07fb129, app be562ea; smoke passed. No Comp.
- Item 0 copy keeps site machines and spreads (D-1027): api 0d85a21, infra 4701da6; the copy bids the original's figure.
- Item 8 Benchmark A comparison (D-1028): infra 4701da6.
- Item 5 disposal cost kind (D-1029): api 50cebf1, app daeb65d; Benchmark A −4.7 % (tax on tipping gone).
- Mohave check (D-1032): `test-data-local/wage/mohave-check.md`; 31 of the founder's 70 lines match a current Mohave
  WD (21 Building AZ20260043, 10 Highway/Heavy AZ20260046/AZ20260058, 4 Heavy Dams), 24 none, 15 blank.
- C3 report date (D-1033), Q215 warm-up and Q217 purge (D-1034): infra 0ffd00a. Q212 drag scroll: app ad52b26.
- **Wage core** W9 (runtime tables), W12, W1, W7, W2 (D-1032, D-1036): api c858336, app 6ab04f7, infra e5e3477.
  Smoke: the copy's wage page shows the Source column (laborer 38.38, operator 52.43, truck 42.83), saved; Benchmark A
  labor **−35.3 %** (expected −30 % to −38 %).
- **Items 1 + 3** dump sites and haul cycle (D-1035): api 24d097f, app 3983e00, infra 67277e3. Smoke: three example
  sites (clean fill $2.50/LCY, topsoil $6.50/LCY, green waste $27.50/t, 15 mi) in the throwaway workspace; Benchmark A
  **−50.0 %** (range −42 % to −56 %), item 3 alone −1.5 % at 15 mi (expected ~0). Running bid **43.2 %** of the item-0
  bid. Found and fixed in the smoke: Calculate priced the hauls before the disposal lines had their sites.
- **Item 2** cut to export, paced (D-1037): api ca33b1e, app 287b114, infra a8a9b28. Smoke: the copy gains a "Cut to
  export" line on A2, the cut line keeps a few BCY; Benchmark A **-3.9 %** (plan -5.2 % to -5.9 %: see Needs Umer); running
  bid **39.3 %** of the item-0 bid.
- **W3 + W13 + W4 + W6** prevailing (D-1038): api 1fda4c7, app f4cec37, infra 4bdfccf. Smoke on a throwaway Kingman
  project passed (5 Mohave WDs listed, mod warning, Highway governing; dozer 60.59 and grader 61.87 WD, excavator
  55.08 raised; licensed trades not covered; terrazzo conformed). Found and fixed: a false county warning (parser).
- **Item 7** clearing (D-1039): api 0b31e0f, app fb722c8, infra 3e9f6e4. Benchmark A **+1.30 %** (plan +0.4 % to
  +1.1 %: see Needs Umer); running bid **40.6 %** of the item-0 bid.
- Quantity table: 344 rows passed, 295 earthwork rows, prevailing 12 rows, 81 cost rows, wages 11 rows, "Benchmark A: 9 lines, right".

## In progress
- Wage pages D-1047 (rule labels, breakdowns that add up, insurance, words, strip, layout, setup cards, open shop
  without the union-scale table, helper gate): a builder at work.
- D-1043 answers (fallback fees, dump queue and speeds, debris crew without spotter, catalog sources without maker
  names and the seed gate, release notes): a second builder at work.

## Next
1. Benchmark A rerun after D-1043 (haul and debris crew changes), the wage smokes and the screenshots.
2. W8 workers' comp by state: waits for the TX/AZ filings in `test-data-local` (Q-W6); not built.
3. Release run: full gates, quantity table, smoke of the wage page and the pricing items on copies.

**Reference files committed earlier** in intelcost-infra/workspace/docs/reference (21, names only): Crew_Assemley_DE_LLC
- V12 SOURCE FILE.xlsx; Materials research/ (IntelCost_fence_erosion_site_prices_2026-11.xlsx,
IntelCost_material_prices_2026-10.xlsx, IntelCost_paving_flatwork_prices_2026-11.xlsx, README.md,
clearing_defaults_2026-11.csv, fence_erosion_site_prices_national_2026-09.csv, fill_structures_2026-11.csv,
fill_structures_2026-11_points.csv, fusion_rental_README.md, fusion_rental_points.csv,
material_prices_national_2026-09.csv, paving_flatwork_prices_national_2026-09.csv,
production_research_points_2026-11b.csv, production_tiers_2026-11b.csv); Sales Tax.xlsx; equipment/ (Construction
equipment catalog and rates.md, IntelCost Earthwork Production Starter.xlsx, IntelCost Equipment Catalog.xlsx);
production_research_points.csv; production_tiers_2026-11.csv. Scanned for the founder's project and client names, job
numbers and bid totals: none is a client file. Two hits were public data: Sales Tax.xlsx names cities in a public rate
table (Riverside, Miramar…), and the material prices file cites public bid tabulations and their suppliers.

## Needs Umer
- f5-big: pointing the fx workers at minio:9000 directly would remove the bench-only gateway stall but changes the
  fx isolation check and the ranged first page f5-big exercises: your call. f5-big step 2 (150 thumbnails in 240 s) still
  fails in some runs (545 MB at 2.2-3.8 MB/s is about 200 s alone).
- During the f5-big runs the fx bring-up also recreated the bench's worker-pages, worker-previews and worker-ocr; they
  are up. postgres, redis, minio and the bench api, app and worker were not touched.
- Item 7 on Benchmark A: +1.30 %, above the plan's +0.4 % to +1.1 %: the heavy line now carries an excavator with a
  thumb, three chainsaws and three laborers, and the debris haul-off a loader crew (with its foreman share and spotter).
  The crew make-up is provisional (grade C, no public crew figure found): it needs your review. Trees-per-acre bands
  (light under 400, medium 400-600, heavy over 600) from a 2000 military earthmoving manual, grade B.
- Item 2 on Benchmark A: -3.9 %, outside the plan's -5.2 % to -5.9 %. The ADTs are gone and the cut line keeps a few BCY;
  the saving is smaller because the A1 crew it drops is now priced at the new open-shop wages (labor -35 %), not the old
  ones the plan used. Not a defect; left as it is.
- Item 5 on Benchmark A: −4.7 %, against the plan's −0.3 % to −4.6 % (which assumed item 1 first). All of it is the tax on
  tipping; nothing to fix.
- Mohave: the founder's lines mix the Building WD (laborer 16.00, excavator 24.97, roller 23.62) with heavy/highway
  operator lines; on-road and off-road trucks sit on the Bulldozer line (35.56 + 18.12); 24 lines match no current
  Mohave WD (for example dozer 31.96 + 13.52, grade checker, pipelayer 28.85 + 7.09). Rules unchanged, as asked.
- Equipment-maker names: the dump-site build's source notes named a maker's handbook; reworded in code (it was also in
  older code, now reworded). The equipment catalog seed (`eq_source.csv`, 18 rows) still names makers as its sources;
  changing seed data changes the catalog release, so it is left for you.
- Fallback dump fees (grade C, national, mid-range): clean soil $5.80/t, topsoil $40.75/t, unsuitable $58.08/t (a C&D
  proxy), rock $14.23/t, vegetation $72.83/t, rubble $17.50/t, mixed C&D $48.50/t, contaminated $74.25/t. Tons per LCY
  for rubble (1.20) and mixed C&D (0.50) are provisional, unsourced. Truck settings (payload 16 LCY, 35 mph both ways,
  5 min dump, 7 min load) come from one state DOT example, grade C.
- The haul cycle's hours are the larger of the trucks' cycle time and the loader's own time (the builder's call: with
  trucks rounded up, the plain formula came out under the loader's time).
- Existing saved bids: a tipping component (`tipping:*`) is replaced by its `disposal:*` key on the line's next
  Calculate, which changes the figure; nothing changes until a Calculate.
