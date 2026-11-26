# BLS nonmetropolitan areas in open-shop wages (D-1378 2, D-1379): spec for the next run

**Status:** spec written 2026-11-26 (night run 2026-11-30, D-1379). No code yet. Built in the next run, not tonight.
Q17 ("the BLS area list in code is not changed") is lifted only by this spec's build (D-1378 2). Q17's other half
stays: the open-shop method (the stored national table and the location factor F) does not change.

## The founder's order (D-1378 2, 3)

- "Yes to BLS nonmetropolitan areas in the product." Which areas, the county mapping (county FIPS to metro, micro or
  nonmetro area), the fallback order **metro → nonmetro → state → national**, the data load, rules version and note,
  and what happens to saved sets.
- **Hold until it ships:** nobody presses Update rates on P08 or any other rural-county project (a county with no
  published metro area). Throwaway copies for figures are allowed; a figure on such a copy says it will move again
  when nonmetro areas ship.

## Why

P08's county (Gallia, Ohio, 39053) is in the Gallipolis micropolitan area. BLS publishes no wages for micropolitan
areas. Today the engine looks up county → Census CBSA → OEWS metro row, finds none, and falls to the raw Ohio
statewide figure (D-1376). BLS does publish Gallia's own area: **Southern Ohio nonmetropolitan area, 3900004**. On it,
P08 prices at **$767,453.49**, against $781,620.02 on Ohio statewide (−$14,166.55; D-1376 what-if, in memory).

## 1. Which areas, and their source

| Item | Decision |
|---|---|
| Areas | Every BLS OEWS area of the current survey: the metropolitan statistical areas **and** the OEWS nonmetropolitan areas, all states, DC and Puerto Rico (BLS's own list; e.g. Southern Ohio nonmetropolitan area 3900004). Only the **nonmetro areas' wage rows** are loaded in this build (section 4); the metro rows stay as loaded (Q16). |
| Definitions source | BLS, "May 2025 metropolitan and nonmetropolitan area definitions", `https://www.bls.gov/oes/area_definitions_m2025.xlsx` (linked from `https://www.bls.gov/oes/current/msa_def.htm`). One row per county (or county equivalent) with its area code and name. |
| Vintage | **May 2025.** BLS's technical notes: the May 2025 estimates use the metropolitan area definitions of OMB Bulletin 23-01 (the same vintage as the Census `list1_2023.xlsx` the bench's `ref_county_cbsa` came from). "Nonmetropolitan area definitions are specific to the OEWS program and are set in consultation with the SWAs." |
| Fetching it | BLS answers 403 to an automated download (checked 2026-11-26). The file is downloaded once by a browser (the MCP browser, or the founder) into `test-data-local/wage/bls/area_definitions_m2025.xlsx`. It stays out of git (D-1259: no .xlsx). The loader reads it from there, as `load_cbsa` reads the Census workbook today. |
| A new vintage | Each May survey can redraw the nonmetro areas. Checked 2026-11-26 on the BLS API: 3900004 and Boston's CBSA code 0014460 have May 2025 data only ("No Data Available" for 2023 and 2024), so May 2025 is a new set of area codes. The loader keeps each vintage's definitions apart (keys below) and pricing reads the vintage of the OEWS survey it prices from. |

**Series ids (checked on the BLS API, nothing sent but series ids).** A nonmetro area uses area type `M`, like a
metro, with its 7-digit code: `OEUM390000400000047206108` (Southern Ohio, Construction Laborers, hourly median) gives
May 2025 **23.96**, the figure D-1376 used. A micropolitan code does not exist: `OEUM002368000000047206108` (Gallipolis)
is "Series does not exist". So `bls_load.oews_ids` and `_OEWS_ID` need no change for nonmetro areas.

### Storage (one migration, empty tables; the loader fills them)

```
refdata.ref_oews_area
  vintage       date        -- the survey month the definitions belong to (2025-05-01)
  area_code     varchar(7)  -- '0026420' (metro: '00' + CBSA), '3900004' (nonmetro: state FIPS + 5)
  area_name     text        -- as BLS writes it: 'Southern Ohio nonmetropolitan area'
  kind          varchar(8)  -- 'metro' | 'nonmetro'   (CHECK)
  PRIMARY KEY (vintage, area_code)

refdata.ref_oews_area_county
  vintage       date
  county_fips   varchar(5)  -- 5 digits; Connecticut by planning region (091xx)
  area_code     varchar(7)
  PRIMARY KEY (vintage, county_fips)      -- a county is in exactly one area per vintage
  FOREIGN KEY (vintage, area_code) REFERENCES refdata.ref_oews_area
```

- `ref_oews` is unchanged: a nonmetro row is `area_type 'M'`, `area_code '3900004'`, as BLS's own series id says.
- `ref_county_cbsa` stays as it is. Rules 11 and earlier keep reading it (section 3), and
  `features/materials/service.py` reads it for its own purpose.
- A definitions load writes a `ref_bls_load` row of kind **`oews_area`** ("BLS OEWS area definitions May 2025",
  rows = counties, `data_as_of` = the vintage).
- Migration before code (hard rule 12): the migration is written, run on the bench (fingerprint, before/after), then
  the loader and the engine code are saved. It revises the pushed head at build time and is folded at close-out (D-851).

## 2. The county mapping

| County kind | Maps to | Notes |
|---|---|---|
| In a metropolitan statistical area | That MSA's OEWS area (`'00' + CBSA`) | Taken from the BLS file, not from `ref_county_cbsa`. The build compares the two for every metro county and lists any county where they differ (expected 0: both are Bulletin 23-01). Where they differ, the BLS file wins under rules 12. |
| In a **micropolitan** area | The **nonmetro area** BLS puts it in | BLS publishes no micropolitan areas; every county outside an MSA, micropolitan or not, sits in one OEWS nonmetro area. Proof from the file and the published list: Southern Ohio 3900004 holds Adams, Athens, Clinton, Fayette, Gallia, Highland, Jackson, Meigs, Pike, Ross, Scioto and Vinton, among them the Gallipolis (Gallia), Athens (Athens) and Chillicothe (Ross) micro areas. The build checks that no county is in a micro "area" of its own in the file. |
| Outside any CBSA | Its nonmetro area | As above. |
| New England | By **county**, like everywhere else | May 2025 is on Bulletin 23-01, which has no NECTAs. BLS's May 2025 definitions page lists Massachusetts, Vermont and the rest by county. The old NECTA codes are not loaded and not read. (Checked: Boston's county-based code 0014460 has May 2025 data; the old NECTA code 0071650 "does not exist".) |
| Connecticut | By **planning region** (09110 to 09190) | The BLS file lists Connecticut's areas by planning region (e.g. "Greater Bridgeport Planning Region"), the same nine codes as `ref_county_cbsa` and as most of `ref_zip_county` (CT rows: 09110–09190 for 468 ZIP rows). The 8 pre-2022 counties (09001–09015) are in `ref_county` and still on 14 `ref_zip_county` rows (and on `ref_zip_wd_county`, which WDs read): see "no area" below. |
| In no area | State, then national | Expected: Connecticut's 8 pre-2022 counties; American Samoa (60) and the Northern Mariana Islands (69), which OEWS does not cover; any county code in `ref_county` that the file lacks (the build lists them by FIPS). Guam (66), Puerto Rico (72) and the US Virgin Islands (78) are covered by OEWS and keep whatever the file gives them. |

**A pre-2022 Connecticut county.** A project whose chosen county is an old CT county (09001–09015) has no area. The
lookup then uses the project ZIP's largest-share planning region from `ref_zip_county` when the ZIP has one, else the
Connecticut statewide figure. The source line says which. (0 saved sets today are in Connecticut.)

**Which counties are "rural" (the hold, D-1378 3):** a county whose OEWS area is a nonmetro area, i.e. not in a
published metro. On the bench today 1,323 of 3,238 `ref_county` rows have no CBSA and 663 are micro. Among the
founder's projects only **P08** is in such a county (its current set 536, rules 6). P01, P05, P10, Real bid A and
Real bid B are in metros whose OEWS rows are loaded; the other labels have no wage set. Bench-wide, 4 saved sets on
2 projects are in a micro or no-CBSA county.

## 3. The fallback order, per occupation

The founder's order "metro → nonmetro → state → national" is read as: **the county's own OEWS area (its metro if it
is in one, else its nonmetro area) → the state → national.** A county is in exactly one area, so a metro county never
falls to a nonmetro area (that would be another place), and a nonmetro county has no metro to try.

Per occupation (SOC), each step tried only when the one before has no figure for that SOC and percentile:

1. **The area's own row** (metro or nonmetro), same survey.
2. **The state's row scaled by the area's ratio** (D-1095, **stays**, and sits here, between the area and the raw
   state): the median over construction occupations (SOC 47-) with a figure in both, of area over state, in the same
   survey; three or more pairs needed, else step 3. It now applies to a nonmetro area as to a metro. The source line
   says so: "no figure for Southern Ohio nonmetro area: Ohio median $X x 0.9NN". This is the path D-1376's what-if
   used (15 occupations published for 3900004, 14 of them SOC 47-, so a ratio exists), so the shipped figure should
   land on the what-if's.
3. **The state's own row.**
4. **National.**

Unchanged: the pipelayer's own SOC (47-2151, D-1090) and the foreman reference (47-1011) go through the same lookup;
company minimums, the blend and the national open-shop table (Q17) are untouched; prevailing and union read the
open-shop figures as their floor, so they follow. The percentile is as today (W14: median; W1: p75 commercial,
median residential).

**Source-line wording (no D-number):** "Local market (Southern Ohio nonmetro area): BLS May 2025 survey, median
$23.96." A metro keeps "Houston metro". The wage review's note reads "Local market rates for Southern Ohio, updated
<date>." (`MARKET_NOTE` already strips " metro"; it strips " nonmetro area" too).

## 4. The data load

- **Definitions:** `bls_load.load_oews_areas(conn, path)` (new, beside `load_cbsa`; reuses `_sheet_rows`) reads
  `area_definitions_m2025.xlsx`, finds the header row by name (state FIPS, county code, area code, area name; the
  build reads the actual header and records the column names it used in its report), and writes `ref_oews_area`
  (kind = 'nonmetro' when the name ends "nonmetropolitan area", else 'metro') and `ref_oews_area_county`.
  `scripts/bls_load.py` gains a subcommand `areas <path>` (an existing script; no new file under `scripts/`).
- **Wage rows:** the nonmetro areas' OEWS rows through the existing `load_oews(conn, areas, mapped_socs(conn))`,
  areas = every `ref_oews_area` row of kind nonmetro (a new `scripts/bls_load.py oews --nonmetro` picks them). By the
  BLS API with the bench key (D-1031): about 140 areas (the count comes from the file; BLS's FAQ gave 134 for
  May 2018; the page lists at least 98 through Pennsylvania) x 34 SOCs x 3 measures, about 14,000 series, about 290
  calls of 50, inside the key's daily limit. Not every occupation is published in every area (Southern Ohio: 15 of
  34); a missing one is simply absent and falls back (section 3).
- **What exists today:** `load_oews` already parses area type `M` with any 7-digit code, so nonmetro codes load
  unchanged. The bench's loads: load 7 on 25 Nov ("BLS API, 55 areas", 1,547 rows); the table now holds 64 areas
  (12 metros, 51 states, national), all May 2025.
- **The platform refresh (`bls_load.refresh`)** reloads every loaded area's OEWS each time. With ~140 more areas that
  is about 400 calls, close to the key's daily limit. Change: `refresh` reloads OEWS only when BLS has a newer survey
  than the one loaded (one national series checked first); ECI is reloaded as now.
- `BlsDataCard.tsx` gets a label for the new kind (`oews_area`: "Wage area definitions"); `platform/bls.py`'s
  summary may split the area count into metro, nonmetro and state (optional).
- Loading the rows moves no saved set: rules 11 and earlier never read a nonmetro row (they look up `'00' + CBSA`,
  and a nonmetro code never has that form). The build proves it (QT row 7).

## 5. Rules version, the note, saved sets

- **Wage rules 12** (`rates.py`: `WAGE_RULES = 12`, `NONMETRO_RULES = 12`, its docstring added to the history).
  If another item takes 12 first, this takes the next free number. The rule: with `rules >= NONMETRO_RULES` the area
  lookup is the BLS definitions (sections 2, 3); below it, today's county → CBSA metro lookup exactly as now. The
  source's last line: "Priced by wage rules 12 (<month> 2026)."
- **A saved set keeps its rules.** Recalculate prices a set by its own rules, so a rules-6 to 11 set does not move
  when the nonmetro rows load or the code ships. Only a new Calculate or **Update rates** moves a set to 12. On a metro
  project rules 12 moves no rate (the dialog says "No craft's rate changes under the current rules"), unless the BLS
  file maps a county differently from the Census list (listed by the build, section 2).
- **The note.** One row `wages_12` in `features/estimate/rule_notes.py` `WAGE_NOTES` (so in `KNOWN`) and one in the
  app's `src/lib/estimate/ruleChanges.ts` `RULE_CHANGES`, its arrival recorded per environment at the api's first
  start with it (D-1353), no migration. Its wording follows item 3b's cause-named notes (D-1375 part b, D-1371 Q4b):
  a rule's name only when a rule moved the figure. Proposed label: **"BLS nonmetro areas"**, read as "Pricing rule
  changed (BLS nonmetro areas, <date>)". Until D-1375 part b is in DECISIONS, treat it as "a rule note" with that
  label. No D-number on screen.
- **Dependency on item 3b.** Today a set moved b → c owes the note of the lowest rules N with b < N <= c. P08's set is
  rules 6, so without 3b its move would be filed under "wages" (rules 7), which moved nothing on P08. With 3b the note
  names what moved it: the nonmetro areas (and escalation). The build checks 3b has landed; if not, it adds the cause
  test for `wages_12` (a move whose area changed by rules 12 is named by it) before the note ships.
- **The note's amount** prices the foreman from the stored rows to the cent (D-1378 1), so the note equals the real
  move.

## 6. Code the build changes (read 2026-11-26, api at the bench's tree)

| File | Function | Change |
|---|---|---|
| `intelcost-app-fastapi/alembic/versions/<new>.py` | | `ref_oews_area`, `ref_oews_area_county` (section 1) |
| `app/wagecalc/bls_load.py` | `load_oews_areas` (new), `refresh` | the definitions loader; OEWS refresh only on a newer survey |
| `scripts/bls_load.py` | `main`, `_area` | `areas <path>`; `oews --nonmetro` |
| `app/wagecalc/market.py` | `MarketData` (new `county_area`, `area_names`), `load_market`, `oews_for`, `metro_ratio` (→ `area_ratio`), `Oews` (new `kind`; `text`, `area`, `plain`) | the lookup of section 3 behind a `nonmetro: bool` argument; the definitions of the vintage of the latest OEWS survey loaded |
| `app/wagecalc/rates.py` | `WAGE_RULES`, `NONMETRO_RULES` (new), `MarketContext` (new field `nonmetro`), `oews_found`, `market_area`, the `MarketContext(...)` in the rate-set builder (~line 1982: `nonmetro=rules >= NONMETRO_RULES`) | rules 12 |
| `app/wagecalc/w14.py` | `market_sentence` | strip " nonmetro area" as it strips " metro" |
| `app/features/estimate/rule_notes.py` | `WAGE_NOTES` | `wages_12` |
| `app/features/platform/bls.py` | `_summary` | optional area split |
| `intelcost-app-react/src/lib/estimate/ruleChanges.ts` | `RuleChangeKey`, `RULE_CHANGES` | `wages_12` |
| `intelcost-app-react/src/features/wage-calculator/text.ts` | `MARKET_NOTE` | strip " nonmetro area" |
| `intelcost-app-react/src/features/platform/BlsDataCard.tsx` | `KIND` | `oews_area` |

`app/wagecalc/market.py` and the engine stay pure (no network, D-1032): only the loader reads files or BLS.

## 7. Proof the next run gives

**QT rows** (a new drive `intelcost-infra/drives/qt-wages-<D>.py` and its line in `quantity-table.sh`; the D-1374
drive's first row checks `WAGE_RULES >= 11`):

1. `WAGE_RULES >= 12`, `NONMETRO_RULES == 12`.
2. Definitions: every county in at most one area; every nonmetro area has a county; 3900004 is exactly the 12 Ohio
   counties above; no area code of a micro CBSA; Connecticut's areas use 09110–09190 only.
3. Gallia, Construction Laborers 47-2061, median: rules 12 → 23.96 from 3900004; rules 11 → the Ohio statewide row.
4. An occupation 3900004 does not publish: rules 12 → Ohio × the area's ratio (the ratio printed), else Ohio, else
   national.
5. A metro county (Harris, 48201) gives the same figure under rules 11 and 12.
6. A pre-2022 Connecticut county gives its ZIP's planning region (or Connecticut), and American Samoa national.
7. A rules-11 set re-priced after the load equals itself to the cent (saved sets keep their rules).
8. P08's settings-matched throwaway copy (below): Update rates → the Full estimate, and the note equals the move to
   the cent.

**The P08 figure.** A throwaway copy of P08 in a throwaway workspace that carries P08's workspace burden profile
(D-1375 part a's fix, D-1376's method): `PUT .../wage-calculator/burden-profile` with the source's insurance,
annual hours, company benefits, the unemployment override and the rest as stored; proof 1, the two profile rows equal
field by field; proof 2, set 536 re-priced under the throwaway's settings gives back 36/36 crafts and 22/22 subtypes to
the cent. Then Update rates on the copy. **Expected ballpark: $767,453.49** (the D-1376 what-if at 26 Nov escalation;
the shipped figure moves by escalation since then, about 0.01 % a day on labour, and by any p75/median difference
if the set's path reads another percentile). A gap of more than a few dollars beyond escalation is explained before
the run reports done.

**Smoke (one, MCP):** a throwaway project at a Gallia ZIP; Calculate; the wage review shows "Southern Ohio" in its
market note and a craft's source line names the nonmetro area; a craft with no area figure shows the scaled line.

**The hold ends** when the build is committed, the QT passes and the P08 figure is reported. Until then: no Update
rates on P08 or any project in a rural county. After it ships, the founder presses Update rates on P08 when ready
(never a builder).

## 8. Founder $ to report after it ships (by label only)

- **P08:** stored $767,289.41 → rules 12 on the settings-matched copy (expected near $767,453.49), the move split into
  area (nonmetro vs the stored national figures), escalation and rules, per craft; and what the note shows.
- **P01, P05, P10, Real bid A, Real bid B:** the rules 11 → 12 move on each current set's own inputs (expected
  $0.00; any non-zero is a county the BLS file maps differently, named by FIPS).
- The other labels have no wage set: nothing to report.

## 9. Open questions for the founder

1. **Missing occupation in a nonmetro area:** the state's figure scaled by the area's ratio (D-1095, as the what-if
   priced P08), or the raw state? The spec says scaled.
2. **Metros:** load only the nonmetro rows (this spec, Q16 for metros stands), or every metro too? Today a metro county
   whose metro is not loaded (only 12 of ~390 are) prices on its state, while a rural county would get its own area.
3. **Refresh:** OEWS reloaded only when BLS publishes a newer survey (proposed), to keep within the key's daily limit?
4. **The definitions file** cannot be fetched by a script (BLS 403). May the MCP browser download it into
   `test-data-local/wage/bls/` at build time, or will you place it there?
5. **Note label:** "BLS nonmetro areas" (proposed) or other words?
