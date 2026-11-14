# F44 — Utility types by group, their defaults, and the pipe catalog widened

**Decision:** D-1260. **Repos:** app, api, infra. **Brief:** the founder, 2026-11-13 (night run, part 1).

## Problem → solution

A run's Type is one of ten systems, so a water service, a storm lead, a duct bank or a bored casing is drawn as a main
of its system, takes the main's pipe list and defaults, and buys none of what sets it apart (the tap at the main, the
pull string, the test, the encasement). The catalog has no DWV, no Schedule pipe, no clay, no polypropylene, no gas
steel or casing. → Thirty-one types in six groups, each with its own defaults (pipe families, cover, embedment,
production, connection, add-ons), editable per run; conduit runs with conduits per trench and an optional encasement;
the catalog widened with sourced ODs and priced keys.

## Tasks

1. **Types, grouped** (`src/lib/takeoff/earthwork/utilities/types.ts`, the one table): key, label, group, base, prefix,
   colour, default pipe, pipe families, vertical and cover, production, connection, add-ons, install, and the reason
   for each default. The Type dropdown (runs and structures) shows optgroups. Today's ten keys are kept as the group
   mains (mapping below); no stored value changes.
2. **Defaults per type, editable per run** (stored in `section`: `addons`, `connection`, `production`, `install`,
   `encasement`): written when the run is made; a run drawn before keeps today's behaviour until edited. Type filters the
   Pipe list by its families; "Other" shows all.
3. **Conduit runs:** Pipes = conduits per trench; Encasement (duct bank) width × height, with the concrete CY/LF shown.
4. **Catalog audit and additions** (coverage table below), with sourced ODs; **prices** for every new key and the
   add-on and connection keys, seeded by migration into Q4 2026 (never over a key already priced).
5. **Calculate:** base type for every existing rule; short-run pipe lines apart for services; connection, add-on and
   encasement materials; no trench for bored and encasement-only runs.
6. **api:** the new keys accepted on runs and structures; Utility Inputs folders and Division 33 codes for each.
7. **Shared quantity table rows:** one per type group, a duct bank (4 conduits, encased), a water service with a tap,
   6 in Sch 40 DWV against 6 in SDR-35.

## Old type → new type (a relabel: the keys stay)

| Stored key | Was shown as | Now shown as | Group |
|---|---|---|---|
| sanitary | Sanitary sewer | Sanitary sewer main | Gravity |
| storm | Storm | Storm sewer main | Gravity |
| subdrain | Subdrain | Subdrain / underdrain | Gravity |
| water | Water | Water main | Pressure |
| fire_water | Fire water | Fire line / fire service | Pressure |
| force_main | Force main | Force main (sanitary) | Pressure |
| gas | Gas | Gas main | Gas |
| electric | Electric conduit | Electric primary | Dry (conduit) |
| telecom | Telecom conduit | Telecom / fiber | Dry (conduit) |
| other | Other | Other | Other |

## Type → defaults

Cover is to the top of the pipe. "Company" = the company's pressure cover (D-1106, 4 ft unless set). Embedment follows
the base's rule: pressure kinds bank sand (D-1100), flexible gravity pipe #57 stone Class I (D-1101), else the project's.
Production "short" = a pipe line of its own, its crew's tier by its own short length (D-971).

| Type (key) | Group | Base | Pipe families (default) | Vertical / cover | Production | Connection | Add-ons | Source / reason |
|---|---|---|---|---|---|---|---|---|
| Sanitary sewer main (sanitary) | Gravity | sanitary | PVC D3034, F679, PP sanitary, VCP, DWV, DI, C900, HDPE IPS (8" SDR-35) | inverts | main | — | tape, TV inspection | D3034 the common sewer main; CCTV acceptance is standard on new sanitary mains |
| Sanitary service (sanitary_service) | Gravity | sanitary | PVC D3034, DWV, VCP, DI, C900 (6" SDR-35) | inverts | short | wye at main | tape | 4–6 in laterals, wye at the main |
| Storm sewer main (storm) | Gravity | storm | RCP, HDPE dual wall, PP, PVC D3034, F679, CMP, DI (12" SDR-35) | inverts | main | — | tape (plastic) | today's default kept |
| Storm lead (storm_lead) | Gravity | storm | RCP, HDPE dual wall, PP, PVC D3034, DI (12" HDPE dual wall) | inverts | short | tie-in at structure | tape (plastic) | inlet-to-main leads are short and tie into a structure |
| Roof drain leader (roof_drain) | Gravity | storm | DWV, PVC D3034, HDPE dual wall, DI (6" DWV) | inverts | short | tie-in at structure | — | DWV Sch 40 is the usual leader pipe |
| Culvert (culvert) | Gravity | storm | RCP, CMP, HDPE dual wall, PP (24" RCP Wall B) | inverts | main | — | — | DOT culverts RCP or CMP |
| Subdrain / underdrain (subdrain) | Gravity | subdrain | perforated HDPE, D2729, HDPE dual wall, PVC D3034, CMP (6" perforated HDPE) | inverts | main | — | — | perforated pipe is the drain |
| Foundation drain (foundation_drain) | Gravity | subdrain | D2729, perforated HDPE, DWV (4" D2729) | inverts | main | — | — | 4 in perforated at footings |
| Grease waste (grease_waste) | Gravity | sanitary | DWV, PVC D3034, DI (6" DWV) | inverts | short | tie-in at interceptor | tape | building to interceptor |
| Water main (water) | Pressure | water | C900, C909, C905, DI, HDPE IPS, D2241 (8" C900 DR 18) | cover: company | main | — | tracer, tape, test + disinfection | AWWA C651 disinfection, C600/C605 test |
| Water service (water_service) | Pressure | water | PE CTS, copper K/L, HDPE IPS, D2241, Sch 40/80 (1" PE CTS SDR 9) | cover: company | short | tap at main | tracer, tape, test + disinfection | 3/4–2 in services, corporation stop and saddle |
| Fire line / fire service (fire_water) | Pressure | fire_water | C900, C909, C905, DI, HDPE IPS (8" C900 DR 18) | cover: company | main | — | tracer, tape, test + disinfection | NFPA 24 hydrostatic test, flushed |
| Hydrant lead (hydrant_lead) | Pressure | water | DI, C900 (6" DI PC 350) | cover: company | short | — (the main's hydrant service) | tracer, tape, test + disinfection | 6 in DI lead is common |
| Force main (sanitary) (force_main) | Pressure | force_main | C900, D2241, HDPE IPS, DI, C905 (6" C900 DR 18) | cover: company | main | — | tracer, tape, pressure test | today's default kept |
| Storm force main (storm_force_main) | Pressure | force_main | C900, D2241, HDPE IPS, DI (6" C900 DR 18) | cover: company | main | — | tracer, tape, pressure test | as a force main, files under Storm |
| Irrigation (irrigation) | Pressure | water | Sch 40/80, D2241, HDPE IPS, PE CTS (2" Sch 40) | cover 1.5 ft | main | — | pressure test | mainline 12–18 in typical |
| Reclaimed water (reclaimed) | Pressure | water | C900, D2241, HDPE IPS, DI (8" C900 DR 18) | cover: company | main | — | tracer, tape, pressure test | purple pipe; not disinfected as potable |
| Chilled / hot water (chilled_water) | Pressure | water | HDPE IPS, steel Sch 40, DI, C900 (6" HDPE DR 11) | cover 3 ft | main | — | pressure test | pre-insulated systems vary; stated default |
| Fuel / oil (fuel_oil) | Pressure | gas | steel Sch 40, HDPE IPS (2" steel Sch 40) | cover 3 ft | main | — | tape, pressure test | stated default, grade D |
| Gas main (gas) | Gas | gas | gas PE IPS SDR 11, HDPE IPS, steel Sch 40 (4" gas PE SDR 11) | cover 3 ft | main | — | tracer, tape, pressure test | 49 CFR 192.327 (24 in least; 36 in common spec), 192.321(e) locating wire |
| Gas service (gas_service) | Gas | gas | gas PE CTS and IPS, steel Sch 40 (1" gas PE CTS) | cover 2 ft | short | tap at main | tracer, tape, pressure test | 49 CFR 192.361 (12–18 in least) |
| Electric primary (electric) | Dry (conduit) | electric | PVC conduit Sch 40/80, HDPE conduit (4" Sch 40) | cover 3 ft | main | — | tape, pull string | utility primary duct 30–42 in; NEC 300.50 |
| Electric secondary (elec_secondary) | Dry (conduit) | electric | same (2" Sch 40) | cover 1.5 ft | main | — | tape, pull string | NEC Table 300.5 col. 3, 18 in |
| Site lighting (site_lighting) | Dry (conduit) | electric | same (1" Sch 40) | cover 1.5 ft | main | — | tape, pull string | NEC Table 300.5 col. 3, 18 in |
| Telecom / fiber (telecom) | Dry (conduit) | telecom | same (4" Sch 40) | cover 2 ft | main | — | tape, pull string | common telecom spec 24 in |
| Traffic signal (traffic_signal) | Dry (conduit) | electric | same (2" Sch 40) | cover 2 ft | main | — | tape, pull string | DOT signal conduit 24 in typical |
| Low voltage / security (low_voltage) | Dry (conduit) | telecom | same (1" Sch 40) | cover 1.5 ft | main | — | tape, pull string | NEC Table 300.5 col. 3 |
| Casing / sleeve (bore) (casing) | Crossings | other | steel casing, HDPE IPS, C900 (16" steel 0.375 wall) | cover 4 ft | main, bored | — | — | road crossing casings, no open trench |
| Concrete encasement (encasement) | Crossings | other | any (8" SDR-35, encasement OD + 12 in) | inverts | main, no trench | — | — | drawn over a stretch already taken off: buys the concrete only |
| Other (other) | Other | other | all (8" SDR-35) | inverts | main | — | — | — |

## Pipe coverage (before → after)

| Family | Sizes | OD basis | Price grade |
|---|---|---|---|
| PVC D3034 SDR-35/26 | 4–48 (unchanged) | sewer OD (D3034) | A–D (unchanged) |
| PVC F679 PS 46/115 | 18–36 (unchanged) | sewer OD | C–F |
| **PVC Sch 40 DWV (D2665)** | 1-1/2–12 (new) | IPS (4" 4.500, 6" 6.625) | C/D (new) |
| **PVC Sch 40 / Sch 80 (D1785)** | 1/2–12 (new) | IPS | C (new) |
| **PVC D2241 SDR 21 / 26** | 1-1/2–12 (new) | IPS, wall OD/SDR | B/C (new) |
| PVC C900 DR 18/14 | 4–24 (unchanged) | cast-iron OD | A–C |
| **PVC C905 DR 18 / 25** | 14–48 (new) | cast-iron OD | C (new) |
| PVCO C909 | 4–24 (unchanged) | cast-iron OD | B/C |
| Ductile iron C151 | 4–24 (unchanged) | DI OD | A–C |
| HDPE IPS DR 11/17 | 4–24 (unchanged) | IPS | C/F |
| **PE CTS SDR 9 (D2737)** | 3/4–2 (new) | CTS | C/D (new) |
| Copper K/L (B88) | 1/2–4 (unchanged) | CTS | D |
| **Gas PE SDR 11 (D2513)** | 1/2–12 (new entry; 4–24 priced before) | IPS | B–D (small sizes new) |
| **Gas PE CTS (D2513)** | 1/2, 1 (new) | CTS | B/C (new) |
| **Steel Sch 40 (A53 / API 5L)** | 1/2–12 (new) | IPS | B–D (new) |
| RCP C76 Wall B/C | 12–96 (unchanged) | ID + 2 wall | A–C |
| HDPE dual wall F2648 | 4–36 (unchanged) | maker's reference | A/B |
| **PP dual wall, storm (F2881) and sanitary (F2764)** | 12–60 (new) | maker's reference | B (new) |
| CMP 18–8 ga | 12–96 (unchanged) | derived | A–C |
| **Vitrified clay C700** | 4–36 (new) | maker's barrel OD | B–D (new) |
| **Perforated HDPE single wall (M252)** | 3–12 (new) | maker's reference | D (new) |
| **PVC D2729 perforated** | 3–6 (new) | D2729 | C/D (new) |
| PVC conduit Sch 40/80 | 1/2–6 (unchanged) | IPS | B/C |
| **HDPE conduit SDR 11 (F2160)** | 1-1/4–6 (new) | IPS | C/D (new) |
| **Steel casing 0.250/0.375/0.500** | 8–48 (new) | IPS to 12, OD = nominal above | C (new) |

Prices and their sources: `intelcost-app-fastapi/app/features/materials/seed/d1260_utility_type_prices.json`.

## Proof

Gates; the shared quantity table (new `utility-types` rows, hand-worked); smoke on a throwaway: the grouped Type list,
a water service's pipe list filtered and its tap line, a duct bank of 4 encased conduits with its concrete, a bored
casing with no trench lines; the founder compare for the price migration (no founder row changes).

## Built (2026-11-13, night run part 1)

- **app:** `lib/takeoff/earthwork/utilities/types.ts` (the table, `baseOf`, `runOptions`, `encasementCyPerLf`); the
  catalog's 21 new entries (`catalog.ts`, S18–S29); `materials.ts` (14 family specs, add-on, connection and encasement
  lines, a run drawn before keeps D-1080's tracer and tape); `lines.ts` (short, bored, encasement-only and add-on
  identities after the site slot; the connection on the run's first pipe line); `calculate.ts` (base for every rule,
  the type's own cover, encasement width and pipe zone less the concrete); `RunPanel.tsx` (grouped Type, Pipe list by
  family, Add-ons, At the main, Production, Install, Encasement with CY/LF); `StructurePanel.tsx` (grouped System);
  `runDefaults.ts` (one table for colours, prefixes, pipes; a new run's vertical, cover and add-ons).
- **api:** `UtilityType` gains the 21 keys; `SYSTEM` and `DIVISION_33` for each (five new Utility Inputs folders);
  migration `d1260c4a9e72` (revises `d1246b7f2a40`): 174 library keys (B20 C102 D52) into Q4 2026, proved up/down/up
  on a separate Postgres with a bench copy, then run on the bench: founder compare "tables changed: none", digest
  `08497dbdfe517baa` before and after.
- **infra:** quantity table `type-lines` rows and four catalog rows (`browser/lib/utility-cases.mjs`), the expected
  Q4 2026 grade counts (`quantity-table.sh`).

### Open

1. The new types' Calculate lines keep their base's work scope and region (a water service's pipe line codes as the
   water main's, 33.01.01, and groups under Water); a scope per type would code them 33.01.02 and so on.
2. A bored casing or encasement is priced by the gravity pipe crew (its base Other); a boring crew and the bore pits
   are not modelled.
3. An encased duct bank's native pipe zone is reduced by the concrete, but the spoils balance's native share is not.
4. D2241 prices sit about 20–25 % over the C900 bid basis by weight; C905, casing, clay 18 in and up, HDPE conduit,
   perforated pipe and the add-ons are grade C or D.
