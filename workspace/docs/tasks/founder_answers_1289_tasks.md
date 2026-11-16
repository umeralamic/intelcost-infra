# D-1289: the founder's answers to REPORT_2026-11-18 §1, built (night run from 2026-11-16, step 1)

Decision: [DECISIONS.md D-1289](../../DECISIONS.md). Brief and readings R1–R10, R33, R36:
`intelcost-infra/morning-report-2026-11-19/BRIEF.md`. The questions: `morning-report-2026-11-18/REPORT_2026-11-18.md` §1.

## The answers

| Q | Answer | Where |
|---|---|---|
| Q12 | Bid exports fold the rental tax into the unit prices; the Bid summary keeps its internal row | app |
| Q14 | Delivery by the machine's transport class: lowboy / flatbed (and the other hauler-priced classes) a third-party hauler, untaxed; delivered-by-supplier the dealer, taxed. The company / estimate switch becomes an override | migration + api, app |
| Q17 | Texas fee taxability grade C → B | migration |
| Q18 | No project state → the company's state, flagged in Needs attention | api, app |
| Q26 | An owned rate from FEMA's current schedule reads fresh until a newer edition is loaded | api, app |
| Q27 | Company / estimate rate overrides aged by their entry date, in their own Needs attention block | app |
| Q30 | Sumps get the CGP daily-report hours and patrols; no attendant, no standby | app (pure water module) |
| Q2 | Project jurisdiction (City of Houston / Harris County / other, default other); the Houston preset's size rule follows it (County 54 in, City 42 in; water split per City) | api, app |
| Q4 | Water under pavement = bank sand (Houston preset) | app |
| Q5 | HDPE / PP storm Houston preset: flowable fill under pavement, CSS outside; force main keeps the pressure default | app |
| D-1290 | CSS $42.14/TON grade B, "1.5 sack per ton of dry sand"; 18 pipe rows (MATERIAL-PICKS-FINAL §5, uniform 5 % rule) | migration |

## Api part (done, awaiting the founder's check)

- [x] Migration `d1289e5b3c40` (revises `d1287c6e2a91`): Q17's Texas note and rule cited, CSS row and name, the 18 pipe
      rows (D-1279 guard), `eqlib.eq_transport_class.delivered_by`. Rows listed in D-1289 before the bench run; proved on
      foldproof1289 (empty → head = the bench's schema; down/up row for row); bench run 10:48:29–10:48:51 UTC.
- [x] `national.py:fema_edition`, each class's `owned_fema_edition` (Q26).
- [x] `service.py`: `rental_delivery_by_dealer` 2 = by transport class (Q14); `rental_tax(..., origin)` → `from` (Q18).
- [x] `utility_schemas.py:UtilitySettings.jurisdiction` (Q2).
- [x] Quantity table: `drives/quantity-table.py d1289` (32 rows), the D-1287 delivery figure row → 2, Q4 2026 grade counts.

## App part (built 2026-11-16 15:29–15:48 UTC, awaiting the founder's check)

- [x] Q14: `lib/estimate/equipment/rentalExtras.ts` (`extraSettings`, `taxParts` by the machine's `delivered_by` when the
      setting is 2), `cost.ts:machineCost`, `types.ts` (transport `delivered_by`), `equipment-library/RentalExtras.tsx:DeliveryRow`
      (By transport class / The rental dealer / A third-party hauler), `sharedEquipment.ts` if the parts move.
- [x] Q18: `rentalExtras.ts:notLoadedText` and a note when `rule.from === "workspace"`; `EstimatingView.tsx` Needs attention.
- [x] Q26: `rateAge.ts` (a FEMA edition equal to the library's newest reads fresh), `cost.ts:ownedRateSource` wording.
- [x] Q27: `rateAge.ts` (an override's age from its `set_at` / `updated_at`), `EstimatingView.tsx` its own Needs attention block.
- [x] Q12: `lib/estimate/workbook.ts` (the bid workbook: rental tax spread into the unit prices, no line of its own);
      `bidSummary.ts` keeps the row.
- [x] Q30: `lib/takeoff/earthwork/water/quantities.ts:sumpQuantities` (+ `defaults.ts`): CGP report hours and patrols.
- [x] Q2, Q4, Q5: `lib/takeoff/earthwork/utilities/sectionPresets.ts` (`presetFor` by jurisdiction and pipe size; water bank
      sand under pavement; HDPE / PP storm flowable fill under pavement, CSS outside), `features/takeoff/earthwork/utilities/
      UtilitySettingsSection.tsx` (the Jurisdiction control), `api.ts` (the field), `calculate.ts` (pass it).
- [x] Quantity-table rows: `equipment-cases.mjs`, `water-cases.mjs`, `utility-cases.mjs`, the workbook rows.
- [x] Gates, quantity table, smoke on a throwaway (Harris County, open shop, Burdened, ZIP 77002, TX20260031 mod 1 Heavy).

Smoke (throwaway copy of the QT project in its own workspace, purged): Q18 no-state and company-state flags, Q17's rule cited (b), Q14 the setting's three choices and a lowboy machine a third-party hauler (a drive-in none, the dealer when chosen: +$1,100 taxed), Q27 the own-rates block (browser clock at 2028-01-15), Q12 the export (Direct cost +$6,062.90, no line, Bid total equal), Q2/Q4/Q5 the run form's Auto section by jurisdiction and size. Screenshots: `intelcost-infra/morning-report-2026-11-19/step1/`.

## Follow-ups (the founder, 2026-11-16 16:35)

- [x] Q14 corrected: delivery by ownership (api default 3; the switch adds "by ownership"); rented the dealer, owned "own".
- [x] Export rounding: the folded tax spread by largest remainder (`bidSummary.ts:spreadCents`); the lines add exactly to
      the Bid Summary sheet's Direct cost.
- [x] Quantity-table rows: `q14-ownership-rented`, `q14-ownership-owned`, `q12-spread-ties`, `q12-spread-lines`; the
      api default rows read 3.
