# F48 — Encasement, casing and trenchless crossings (D-1269)

The founder's brief, 2026-11-14 night run, Part 3 (the founder's "D-1268", renumbered by D-1265's note). Rules of
engagement: D-1269. Builds on F44 (D-1260 types and add-ons), F45 (D-1261 restraint), D-1265 (decisions 3, 5, 7),
D-1267 and D-1268.

## Problem

A road or rail crossing was drawn as a "Casing / sleeve (bore)" run or a run set to "Bored (no trench)": one pipe line
priced by the gravity pipe crew, no casing size, no spacers, end seals, pits or bore subcontract. An encasement could
only be a whole duct bank, never a stretch of a carrier, and the spoils balance never saw what it displaced.

## Solution

### 3a. Encasement / casing on a run (`section.crossing`, no schema change)

`{ kind, lf, arema, casing_in, casing_by, grout, restrain, hdd_casing, enc_w_in, enc_h_in }`:
`kind` none | concrete | clsm | jack_bore | cased_open | hdd; `lf` null = the whole run, else a length (clamped to the
run). The stretch is its own pipe line; the rest of the run keeps its line. A length reads as the run's average
section (no station).

1. None.
2. Concrete encasement: OD + 12 in square (several pipes: their width + 12), editable; ready-mix 3000 by the CY; the zone
   less by it; a whole-run encasement widens the trench to it (as D-1260's duct bank).
3. CLSM: bedding and zone over the stretch in flowable fill (`flowable:flowable_fill_clsm`).
4. Steel casing, jack & bore: casing ID ≥ bell OD + 4 in, next standard size; wall ≤ 14 in 0.250, 16–24 in 0.375,
   26–36 in 0.500, 42 in+ 0.625; AREMA one step heavier; bore sub $/LF by casing (subcontract from the library); casing
   its own component (owner-furnished material / sub-furnished subcontract); pull-in labour (pipe crew at pull-in pace);
   joints restrained by default on pressure bell pipe; spacers 2 + ⌈LF ÷ 8⌉; 2 end seals; optional annulus grout; no
   trench, bedding, zone, backfill, protection, dewatering or restoration over the bored LF; the spoils reduction said;
   a Bore pit and a Receiving pit made with it, linked, deletable.
5. Steel casing, open cut: the trench over the stretch sized to the casing OD; casing, spacers, seals; no sub, no pits.
6. HDD: carrier HDPE DR 11 or fusible PVC (else flagged); optional HDPE casing; HDD sub $/LF by carrier; no trench; entry
   and exit pits a lump sum.

### 3b. Bore pit (12 × 32 ft) and Receiving pit (10 × 10 ft)

Depth = casing invert + 1.5 ft at the pit's station on its run; BCY by layer, vertical shored sides; shoring box ≤ 8 ft,
slide rail ≤ 20 ft, sheet pile past; 6 in stone pad; backstop on the bore pit; pump days; native or CSS backfill; haul-off
with CSS; "Pits by bore sub" → $0 by-sub lines; crew A24; own icon; Needs attention when a jack & bore has no pit.

### 3c. Casing / sleeve (bore) type = standalone option 4 (its pipe the casing; no spacers or seals).

### 3d. CLSM / concrete reduce the native share in the spoils balance; old electric runs' "verify primary or secondary".

### 3e. Prices (grade, source): `app/features/materials/seed/d1269_crossing_prices.json`, one migration revising
`d1268a7c3e51`, steel casing $0.90 → $1.00 / lb with every old value logged.

### 3f. Quantity table rows `util-1269-*` (600 LF 8 in C900 with an 80 LF jack & bore; the same cased open cut; a 300 LF
6 in HDPE HDD; a CLSM-encased 12 in run; pits by sub on and off; a standalone sleeve with its pits).

## Files

- app: `lib/takeoff/earthwork/utilities/crossings.ts` (new, pure), `types.ts`, `lines.ts`, `materials.ts`,
  `structureTypes.ts`, `catalog.ts`; `features/takeoff/earthwork/utilities/{calculate.ts, RunPanel.tsx,
  StructurePanel.tsx, useUtilities.tsx, api.ts, runDefaults.ts}`; `lib/estimate/components.ts` (a library-priced
  subcontract); `features/estimate/EstimatingView.tsx` (Needs attention).
- api: `features/earthwork/utility_schemas.py` (the two pit types), `features/equipment/production.py` (line roles,
  pull-in pace), `features/materials/line_sync.py` (subcontract by key), the seed and the migration.
- infra: `browser/lib/utility-cases.mjs`, `browser/quantity-table.mjs` (`crossing` kind).

## Status

Logged and built 2026-11-15 (night run Part 3), awaiting the founder's check; D-1269's "Built and measured" has the migration, the proof, the quantity-table rows and the smoke. Open: the pits' classification code (they file under the run's scope, "Not classified" in the MasterFormat map), fusible PVC in the catalog, a station for a crossing's length (it reads the run's average section).
