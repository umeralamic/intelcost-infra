# D-1296: the founder's REPORT_2026-11-19 §1 answers, built (night run from 2026-11-16 22:47, step 1)

Decision: [DECISIONS.md D-1296](../../DECISIONS.md). Brief and readings R4–R10:
`intelcost-infra/morning-report-2026-11-20/BRIEF.md`. The questions: `morning-report-2026-11-19/REPORT_2026-11-19.md` §1;
the code paths: `morning-report-2026-11-19/step2/FITTINGS-CHECK.md`.

## The answers

| Q | Answer | Where |
|---|---|---|
| Q2 | The backfill under pavement is an explicit choice (CSS to the subgrade / select fill / compacted native, or the section's own rule) on the run (`section.paved_backfill`), with a project default (`utility_settings.paved_backfill`); absent, by the jurisdiction preset: City and Harris County the Houston preset's built rules, "other" compacted native. "Limited width / in street" only boxes the walls. A run drawn before keeps its result unless the run or the project picks | app (`sectionPresets.ts:pavedBackfillOf`, `calculate.ts:runMaterials`, `layers.ts` `pavedFinal`), api field |
| Q5 | Fittings allowance: water and force main 12 % (C), sanitary 2 % (D), storm RCP 0 %, every other kind 5 % | app (`materials.ts:allowancePct`) |
| Q5 | Counted fittings (drawn bends and tees, the fire riser spool) get the run's pipe crew's time: ≤ 8 in 0.5 crew-hour, 10–16 in 1.0, > 16 in 2.0 (D); LF production unchanged | api (`production.py:_fitting_hours`, `fitting_crew_hours`), app (`materials.ts:fittingCrewHours`, `host.ts:FITTINGS_NOTE`) |
| Q6 a | Fire water's own allowance 30 %, 0 % where its fittings are counted | app |
| Q6 b | The fire line's default pipe C900 DR 14 8 in (DI an option); a run keeps the pipe it stores | app (`types.ts`) |
| Q6 c | Test and flush one a system (one a fire run with a test add-on), `test:fire_nfpa24` $1,350 EA grade D, in place of the $2.25/LF on fire lines | migration `d1296a7c4e21`, app (`lines.ts`, `materials.ts:serviceMaterials`) |
| Q6 d | Backflow 8, 10, 12 in; the backflow enclosure or vault; the PIV (gate valve + indicator post); the FDC; the riser / lead-in spool at a fire run's free end: "Quote needed" where the library has no price. PIV and FDC set at the valve rate (A64, 4 EA a day; on a fire run by its crew), no longer the storm structure crew (A27) | app (`structureTypes.ts`, `fittings.ts:freeEnds`, `StructurePanel.tsx`), api (`production.py` `RUN_ASSEMBLIES`, `line_role`) |

## Tasks

- [x] Migration `d1296a7c4e21` (revises `d1289e5b3c40`): `test:fire_nfpa24`; rows listed in D-1296 before the bench run;
      proved on foldproof3 (empty → head = the bench's schema but the 31 CHECK prints; restored copy down/up row for row).
- [x] Api: `utility_schemas.py` `paved_backfill`; `production.py` fittings' crew-hours, PIV / FDC on A64; `lines.py`
      reprices a pipe line whose counted fittings came or went.
- [x] App: the allowance by kind, fire test per system, riser spool, PIV / FDC parts, backflow sizes and housing, the
      paved-backfill choice (run panel "Under pavement", Utility settings "Under pavement"), the fire default pipe.
- [x] Quantity table: `utility-cases.mjs` D-1296 rows (paved choice per jurisdiction, allowance per kind, crew-hours,
      free ends, fire line per system, Quote needed parts), `drives/quantity-table.py d1296`, grade counts D189.
- [x] Smoke on a throwaway (MCP).
- [ ] The founder's confirmation (morning).

## Not built

- Count items classed as fittings: there is no fitting Count type (the count roles are valve, hydrant, valve box, site
  items and custom); a Count named "bend" has no clean link to a pipe line's crew, so it stays priced by what the person
  enters (FITTINGS-CHECK §2).
