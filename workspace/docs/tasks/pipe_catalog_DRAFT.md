# Pipe catalog: research draft (Part C of the 2026-10-16 audit brief)

Research only: no code. Every value is copied as printed in the source named on its row; nothing is guessed. A value
that could not be found is blank, listed, and marked "drives trench width" or "wall only" (D-560). Sources were read on
2026-10-16. Each row's **Source** column names its
document (S-number, with the link in Sources) and that document's own date. ASTM and AWWA standards are sold, not free
(plan open point 14), and none was bought (D-550 C3). Manufacturers' sheets are accepted with the source on each row
(D-526).

## D-550: the founder's answers, and what they changed here

- **C1, the ID:** the catalog stores the standard's average ID where the standard prints one, else the source's ID with
  its convention named. The OD drives the trench and the displacement. The plan's examples now use 7.891 in for 8"
  SDR-35 (plan §3.6, §3.11, §3.16).
- **C2, the marks:** both marks added in the first draft stay.
  - "Association citing the standard" counts like "manufacturer citing the standard".
  - "Manufacturer, no standard named" rows show in the app as **"Unverified source"** until checked.
- **C3, the blanks:** filled from manufacturers' sheets and one association's handbook, with no standard bought. The
  new values are:
  - C900 DR 14 at 18, 20 and 24 in (JM Eagle);
  - C909 at 6–12, 16 and 24 in (JM Eagle);
  - PVC sewer 4 in IDs, and the current D3034's 18–48 in rows (JM Eagle);
  - conduit 5 and 6 in, and the Schedule 80 3-1/2 in ID (JM Eagle);
  - copper Type K and Type L walls and IDs, 1/2–4 in (the Copper Development Association's handbook, as posted by
    Cerro);
  - CMP 90 and 96 in gages (Contech).

  Rows where two sources disagree are listed in check 8. What is still blank is in check 9.

## D-558 and D-560: PVC sewer 18 in and up, and the blanks

- **R5, PVC sewer 18 in and up (D-558).**
  - **The default is F679's walls:** Westlake's table (S2), PS 46 and PS 115, 18–36 in.
  - **The current D3034's walls stay as an alternate standard:** JM Eagle's table (S14), SDR 35 and SDR 26. The user
    picks it per run, and the run names the standard it uses.
  - **42 and 48 in are only in the D3034 table** (S2 stops at 36 in), so a run at those sizes uses the alternate.
- **The blanks (D-560).** Each value still blank is marked in its table, in check 9 and in "Where the blanks may be
  filled":
  - **"drives trench width":** an outside diameter, or an RCP wall, which sets the OD (OD = ID + 2 × wall). CMP's OD,
    RCP Wall C at 12–21 in, C909 at 4, 14, 18 and 20 in, and PVC sewer 33 in.
  - **"wall only":** the OD is printed and only the wall, and the ID that follows from it, is missing. C909 Class 165 at
    6–12 and 24 in.
- **Block 2's rule (spec §9.2, Pipe):**
  - **No outside diameter:** the size can't be picked unless the user types an OD. The run then shows "OD typed by
    <user>".
  - **Wall only:** the run takes the closest published wall and is flagged. The closest published wall is the same
    size's wall in the nearest class or standard that prints one. If no class prints that size, it is the same
    class's wall at the nearest size, the thicker when two are equally near.
  - **A size typed with an OD and no wall** (C909 at 4, 14, 18 and 20 in; PVC sewer 33 in) takes its wall by the same
    rule.

## Check these first

**Read from the standard itself:** only PVC sewer 4–15 in (ASTM D3034-00, Tables 1 and X1.1). Every other table comes
from a manufacturer's sheet or an association's table. In order of what most affects quantities:

1. **The plan's own 8" SDR-35 ID (check (a)):** it used ID 7.920 in (OD − 2 × min wall). D3034's Table X1.1 prints the
   *average* ID as 7.891 in (OD − 2 × 1.06 × min wall). The HDPE sheet uses the same 1.06 convention as D3034; the
   Westlake PVC sheets use OD − 2 × min wall.
   **Decided (D-550 C1):** the catalog stores the standard's average ID where it prints one, else the source's ID with
   its convention named. The OD drives the trench and the displacement. The plan's examples now use 7.891 (plan §3.6,
   §3.11, §3.16).
2. **PVC sewer 18–36 in: F679's walls or the current D3034's?** The copy of D3034 read is D 3034 – 00 (2000). Uni-Bell
   says ASTM F679 (PVC sewer 18 in and up) was withdrawn in 2024 and its sizes moved into D3034. JM Eagle's October 2025
   sheet (S14) prints that table: "ASTM D3034 Type PSM (4"–48")", SDR 35 and SDR 26. At 18–27 in its walls are thicker
   than F679's PS 46 and PS 115 walls on Westlake's sheet (S2):

   | Size | F679 PS 46 (S2) | D3034 SDR 35 (S14) | F679 PS 115 (S2) | D3034 SDR 26 (S14) |
   |---|---|---|---|---|
   | 18 | 0.499 | 0.536 | 0.671 | 0.720 |
   | 21 | 0.588 | 0.632 | 0.791 | 0.849 |
   | 24 | 0.661 | 0.711 | 0.889 | 0.956 |
   | 27 | 0.745 | 0.801 | 1.002 | 1.077 |
   | 30 | 0.915 | 0.917 | 1.231 | 1.233 |
   | 36 | 1.095 | 1.098 | 1.474 | 1.475 |

   Both tables are below. **Decided (D-558, R5):** F679's walls by default; the current D3034's are an alternate
   standard the user picks per run.
3. **PVC sewer 30 and 36 in walls, every source read:**

   | Size | Westlake, F679 PS 46 (S2, 2023) | JM Eagle, D3034 SDR 35 (S14, 2025) | JM Eagle, F679 PS 46 (S19, 2010) | Distributor sheet / older T-2 tables |
   |---|---|---|---|---|
   | 30" | 0.915 | 0.917 | 0.853 | 0.853 |
   | 36" | 1.095 | 1.098 | 1.021 | 1.021 |

   Westlake makes 30 and 36 in to cast-iron OD as SDR 35 and SDR 26; the older F679 walls are thinner.
4. **Rows filled from sources other than a manufacturer citing the standard:**
   - **RCP Wall B:** Rinker's sheet, which names "current ASTM specifications" but not C76, and does not label its
     walls as Wall B. They equal the Wall B column of ACPA's table.
   - **RCP Wall C:** the manufacturers' association (ACPA), not a manufacturer. It counts like a manufacturer (C2).
   - **HDPE DR 11 and DR 17:** Performance Pipe's sheet names no standard.
   - **CMP thickness, 90 and 96 in included:** Contech's table says it is "not for specification use", and names no
     standard.
   - **Copper:** the Copper Development Association's handbook (S17), an association citing ASTM B88. It counts like a
     manufacturer (C2).
5. **ACPA's table has errors:**
   - It prints 33" Wall B as 3-1/4 in. Its own weight (451 lb/ft) and Rinker's sheet both give 3-3/4 in; the table below
     uses 3-3/4 and marks it.
   - Its 24" and 27" Wall C weights do not match their printed walls. Its walls (3-3/4 and 4 in) are what ACPA's own
     rule gives (check 9).
   - It has no Wall C below 24 in; a secondary website shows 2-3/4 in for 12 in. Not used.
6. **Ductile iron 4 in, Pressure Class 350:** 0.25 in on McWane's sheet (and ACIPCO's), 0.26 in on secondary websites.
   McWane notes 3–8 in at 0.25 is the lowest thickness made. The catalog's ID is the iron's; a cement-mortar lining
   (AWWA C104) makes the bore smaller and is not in these numbers.
7. **Manufacturer-sheet errors seen:**
   - **Westlake conduit sheet (EL-PS-002), not used:** its "Approx. ID" is OD − one wall, not two, and its walls are
     about 6% above the Schedule 40 minimums.
   - **Wheatland's Schedule 80 3-1/2":** prints a minimum average ID of 3.820 in, more than OD − 2 × wall (3.364).
     That ID is not used; JM Eagle's is (S15).
   - **JM Eagle's June 2026 conduit sheet (S15):** its 6 in OD cell is overprinted, two numbers on top of each other.
     The 6.625 in its June 2018 sheet (S16) is used.
8. **Where two sources disagree:**
   - **PVC sewer 18–36 in walls:** F679 against the current D3034 (checks 2 and 3). F679 is the default; D3034 is
     the alternate (D-558).
   - **C900 16 in DR 14 wall:** 1.243 on Westlake's sheet (S3); 1.242 on JM Eagle's, 2018 and 2026 (S12).
   - **C909 12 in Class 235 wall:** 0.423 on JM Eagle's sheet (S13); 0.45 on Westlake's AquaMax overview (read, not
     used, a single value).
   - **C909 16 in Class 165 ID:** 16.56 on JM Eagle's 2018 sheet, 16.55 on its 2026 sheet (S13); the wall, 0.395, is the
     same.
   - **IDs that differ by convention, not by a misprint:**
     - **C900:** Westlake's are OD − 2 × min wall; JM Eagle's "nominal ID" is smaller (8 in DR 18: 8.044 against 7.98).
     - **PVC sewer:** JM Eagle's nominal ID is OD − 2 × min wall at 4–15 in, and OD − 2 × 1.06 × min wall (D3034's
       average-ID rule) at 18–48 in.
     - **Conduit:** Wheatland prints the minimum average ID; JM Eagle a nominal ID, larger (4 in Schedule 40: 3.961
       against 4.002). JM Eagle's 2018 and 2026 sheets print different nominal IDs for the same walls (5 in Schedule
       40: 5.047 in 2018, 5.021 in 2026).
   - **Agreeing, as cross-checks:** every conduit wall both Wheatland and JM Eagle print; every C900 DR 18 wall on
     Westlake's and JM Eagle's sheets; Mueller's copper ODs and the handbook's; the C909 ODs and ductile iron's (S4);
     Contech's 90 and 96 in gages on S9 and S18.
9. **Still not found** (blank below), each marked (D-560):
   - **C909:** 4, 14, 18 and 20 in in every class (**drives trench width:** no OD; their walls, wall only); Class 165
     at 6–12 and 24 in (**wall only**). JM Eagle does not make them, and Westlake's AquaMax page refused the fetch
     (403).
   - **RCP Wall C 12–21 in** (**drives trench width:** the wall sets the OD). No manufacturer's or association's table
     printing them was found. ACPA's FAQ gives a
     rule, C wall = A wall + 1.75 in with the A wall equal to the diameter in feet; it would give 2-3/4, 3, 3-1/4 and
     3-1/2 in. That is a lead, not a printed value, so the cells stay blank.
   - **CMP OD** (**drives trench width**, every size). No sheet read prints one: Contech's design guide and the DOT
     specifications seen measure to the inside crests.
   - **PVC sewer 33 in** (**drives trench width:** no OD; its walls, wall only). Neither manufacturer read makes it: JM Eagle's current D3034 table (18–48 in) and Westlake's
     F679 sheet both go from 30 to 36 in.

**Marks.**
- The brief's three:
  - "standard" (read from the standard);
  - "manufacturer citing the standard";
  - "not found".
- Two I added rather than stretch those:
  - "manufacturer, no standard named": the sheet gives no standard number;
  - "association citing the standard": ACPA, the concrete pipe manufacturers' association, and the Copper Development
    Association.
- **Decided (D-550 C2):** both added marks stay.
  - "Association citing the standard" counts like "manufacturer citing the standard".
  - "Manufacturer, no standard named" rows show in the app as **"Unverified source"** until checked.
- **Blanks (D-560):** a "not found" value also says "drives trench width" (an OD, or an RCP wall, which sets the OD) or
  "wall only". Block 2's rule for each is in the D-558 and D-560 section above.

## Sources

| # | Document | Mark |
|---|---|---|
| S1 | ASTM D 3034 – 00, Table 1 "Pipe Dimensions" and Table X1.1 "Base Inside Diameters". Copy posted by the Miami County (Indiana) Health Department: https://www.in.gov/localhealth/miamicounty/files/ASTM-D3034-00.pdf | standard |
| S2 | Westlake Pipe & Fittings, "ASTM F679/IB PVC Gravity Sewer Pipe", MU-PS-005-US-EN-0423.1, © 2023: https://www.westlakepipe.com/sites/default/files/MU-PS-005-US-EN-0423.1_F679-IB-PVC-Gravity-Sewer-Pipe.pdf | manufacturer citing the standard (ASTM F679) |
| S3 | Westlake Pipe & Fittings, "AquaSpring C900 IB PVC Pipe", MU-PS-001-US-EN-0924.1, © 2024: https://www.westlakepipe.com/sites/default/files/2024-10/mu-ps-001-us-en-0924.1_c900-ib-pvc-pressure-pipe.pdf | manufacturer citing the standard (AWWA C900-22) |
| S4 | McWane Ductile, "Nominal Thickness for Standard Pressure Classes of Ductile Iron Pipe", Rev. April 2022: https://mcwaneductile.com/upl/downloads/submittal-builder/nominal-thickness-for-standard-pressure-classes-of-ductile-iron-pipe.pdf | manufacturer citing the standard (ANSI/AWWA C150/A21.50) |
| S5 | Rinker Materials (Quikrete), Concrete Pipe Division, "Reinforced Concrete Pipe, O-Ring Joint, 12"–96" Diameter", sheet "Rinker 002", undated: https://www.rinkerpipe.com/wp-content/uploads/002.pdf | manufacturer, no standard named ("current ASTM specifications") |
| S6 | American Concrete Pipe Association, Design Data 22 "Flotation of Circular Concrete Pipe", October 2007, Table 2 (ASTM C76); copy posted by Concrete Pipe & Precast: https://concretepandp.com/wp-content/uploads/2019/05/DD_22-Floatation-of-Circular-Pipe.pdf | association citing the standard |
| S7 | Performance Pipe (Chevron Phillips Chemical), Bulletin PP 152-4710 "Iron Pipe Size (IPS) and Dimension Data, DriscoPlex Pipe", PE4710, February 2015: https://www.cpchem.com/sites/default/files/2020-06/PP%20152%204710%20IPS%20Size%20and%20Dimension%20Sheet.pdf | manufacturer, no standard named |
| S8 | ADS, "ADS N-12 ST IB Pipe (ASTM F2648) Specification", Drainage Handbook §1-3, © November 2022; copy posted by Ferguson Waterworks: https://www.fergusonwaterworks.com/wp-content/uploads/2023/07/N-12®-ST-IB-Pipe-ASTM-F2648.pdf | manufacturer citing the standard (ASTM F2648) |
| S9 | Contech Engineered Solutions, CMP handling brochure, Table 1 "Handling weights for CSP with 2 2/3" x 1/2" corrugation" and Table 2, 3" x 1" or 5" x 1" corrugation ("not for specification use"), file dated January 2012: https://www.conteches.com/media/q0hjrq1g/cmp-safety.pdf | manufacturer, no standard named |
| S10 | Mueller Industries, Streamline catalog, "Made to applicable ASTM standards B88, B306, B819"; copy posted by Orgill: https://images.orgill.com/weblarge/10024/Streamline_004608_Catalog.pdf | manufacturer citing the standard (ASTM B88) |
| S11 | Wheatland Tube / Maverick Pipe (Zekelman), "PVC Conduit – Schedule 40" and "– Schedule 80", UL 651 file E530286, NEMA TC2, posted 2024-10: https://wheatland.com/wp-content/uploads/2024/10/PVC-Conduit-Specifications.pdf | manufacturer citing the standard (UL 651, NEMA TC2) |
| S12 | JM Eagle, "Blue Brute™ C900 Pressure-Rated PVC Pipe, Submittal and Data Sheet", V2.0, updated January 2026: https://www.jmeagle.com/sites/default/files/Blue%20Brute%E2%84%A2%20C900%20-V2.0-%20%2001%2016%2026.pdf | manufacturer citing the standard (ANSI/AWWA C900) |
| S13 | JM Eagle, "Ultra Blue™ PVCO C909, Submittal and Data Sheet", V2.0, updated January 2026: https://www.jmeagle.com/sites/default/files/Ultra%20Blue%E2%84%A2%20PVCO%2016_%20-%20C909%20-%20V2.0%20-%2001%2016%2026.pdf | manufacturer citing the standard (ANSI/AWWA C909) |
| S14 | JM Eagle, "Gravity Sewer, Non-Pressure-Rated PVC Pipe, Submittal and Data Sheet", V1.6, updated October 2025: https://www.jmeagle.com/sites/default/files/Gravity%20Sewer%20-%20V1.6%20-%2010%2024%2025.pdf | manufacturer citing the standard (ASTM D3034 Type PSM, 4–48 in) |
| S15 | JM Eagle, "Electrical Conduit, Schedule Series, Submittal and Data Sheet", V2.3, updated June 2026: https://www.jmeagle.com/sites/default/files/Electrical%20Conduit%20SCH%20Series%20Solid%27ProCore%E2%84%A2%20-%20V2.3%20-%2006%2015%2026.pdf | manufacturer citing the standard (NEMA TC-2; UL listed) |
| S16 | JM Eagle, "Schedule Series Electrical Conduit, Submittal and Data Sheet", printed June 2018, Rev 9: https://www.jmeagle.com/sites/default/files/JM%20Eagle_Electrical%20Conduit_SchduleSeries_onesheet_rev9.pdf | manufacturer citing the standard (NEMA TC-2, ANSI/UL 651) |
| S17 | Copper Development Association, "Copper Tube Handbook", CDA Publication A4015-14/17, © 2016, Table 14.1 (Types K and L to ASTM B 88) and Tables 14.2a (Type K) and 14.2b (Type L), nominal dimensions; copy posted by Cerro Flow Products on BuildSite: https://www.buildsite.com/pdf/cerro_flow_products/Cerro-Flow-Products-Handbook-Installation-Instructions-1595822.pdf | association citing the standard (ASTM B88) |
| S18 | Contech Engineered Solutions, "Equal Stiffness: 3x1 & 5x1 HEL-COR® CSP", © 2017: https://www.conteches.com/media/sfunmhjg/5x1-vs-3x1_cmp-flier.pdf | manufacturer, no standard named (mentions AASHTO approval) |
| S19 | JM Eagle, "Gravity Sewer, Submittal and Data Sheet" (ASTM D3034 4–15 in, ASTM F679 18–48 in), file dated July 2010: https://www.jmeagle.com/sites/default/files/jme_GravitySewer.pdf | manufacturer citing the standard; compared only (check 3) |

**Read but not used:**
- Piping Supply Co.'s F679 submittal: a distributor, and it stops at 30 in.
- Westlake's conduit sheet: the errors in check item 7.
- Ameritex's and Concrete Pipe & Precast's RCP sheets: each lists its own walls, not C76's Wall B and C.
- Westlake's AquaMax C909 overview: a single 12 in value (Class 235, wall 0.45 in), in check 8.
- A bulk copy of the 2004 ASTM volumes on a university server: it looked unlicensed. It came up again in this run's
  searches and was again not opened.
- JM Eagle's June 2018 C900 (Rev 21) and PVCO (Rev 20) sheets: the same walls as S12 and S13 where both print them;
  compared only.
- Atkore (Heritage Plastics) "PVC AWWA C900 Pressure Pipe", HP-SS-6866-2405, © 2024: 4–12 in only, the same walls as S3
  and S12.
- County Materials, "Reinforced Concrete Pipe – Round and Elliptical", 0679_0617, © 2017: wall types by size (12–36 in
  B wall), no thicknesses.
- Rinker sheet 003 (single off-set joint, 2023): the same Wall B walls as S5.
- Contech's "Corrugated Metal Pipe Design Guide" (2022): no OD printed.
- Cerro Flow Products, "Copper Tube for Construction Applications", Technical Data 7-04 (2004): types and size ranges
  only.
- ACPA's FAQ page (concretepipe.org/faqs): the wall rule in check 9, no table.
- AWWA's C905-10 preview with its erratum (on the ANSI store): refused the fetch (403), and it is the standard, not a
  manufacturer's sheet.
- Distributors' and retailers' listings (copper, conduit, C900): cross-checks only, never values.

All values are in inches.

## PVC gravity sewer, SDR 35 and SDR 26 (4–36 in)

**4–15 in: ASTM D3034 (S1).**
- OD is the average OD (Table 1), with its tolerance.
- The walls are minimums (Table 1).
- The average ID is Table X1.1's, which starts at 6 in. The 4 in ID is JM Eagle's nominal ID (S14), OD − 2 × min wall,
  under C1.

| Nominal | OD | OD tolerance | SDR 35 min wall | SDR 35 avg ID | SDR 26 min wall | SDR 26 avg ID | Mark | Source |
|---|---|---|---|---|---|---|---|---|
| 4 | 4.215 | ±0.009 | 0.120 | 3.975 (S14's nominal ID) | 0.162 | 3.891 (S14's nominal ID) | standard; ID: manufacturer citing the standard | S1 (2000); ID: S14 (2025-10) |
| 6 | 6.275 | ±0.011 | 0.180 | 5.893 | 0.241 | 5.764 | standard | S1 (2000) |
| 8 | 8.400 | ±0.012 | 0.240 | 7.891 | 0.323 | 7.715 | standard | S1 (2000) |
| 10 | 10.500 | ±0.015 | 0.300 | 9.864 | 0.404 | 9.644 | standard | S1 (2000) |
| 12 | 12.500 | ±0.018 | 0.360 | 11.737 | 0.481 | 11.480 | standard | S1 (2000) |
| 15 | 15.300 | ±0.023 | 0.437 | 14.374 | 0.588 | 14.053 | standard | S1 (2000) |

**18–36 in: ASTM F679, Westlake (S2). The default at 18 in and up (D-558).**
- F679 classes pipe by stiffness: PS 46 and PS 115. Westlake prints SDR 35 and SDR 26 against PS 46 and PS 115 for its
  30 and 36 in.
- The ID is Westlake's, "calculated using nominal OD and minimum wall".
- PS 75 is also made (18": wall 0.584, ID 17.533 … 36": 1.197, 35.906).
- Westlake makes no 33 in.

| Nominal | OD | PS 46 min wall | PS 46 ID | PS 115 min wall | PS 115 ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 18 | 18.701 | 0.499 | 17.703 | 0.671 | 17.359 | manufacturer citing the standard | S2 (2023) |
| 21 | 22.047 | 0.588 | 20.871 | 0.791 | 20.465 | manufacturer citing the standard | S2 (2023) |
| 24 | 24.803 | 0.661 | 23.481 | 0.889 | 23.025 | manufacturer citing the standard | S2 (2023) |
| 27 | 27.953 | 0.745 | 26.463 | 1.002 | 25.949 | manufacturer citing the standard | S2 (2023) |
| 30 | 32.000 | 0.915 | 30.173 | 1.231 | 29.535 | manufacturer citing the standard (see check 3) | S2 (2023) |
| 33 | not found: drives trench width | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found (check 9) | |
| 36 | 38.300 | 1.095 | 36.110 | 1.474 | 35.354 | manufacturer citing the standard (see check 3) | S2 (2023) |

**18–48 in: the current ASTM D3034 (Type PSM), JM Eagle (S14). The alternate standard, picked per run (D-558); the
only table with 42 and 48 in.**
- F679's sizes as the current D3034 has them (check 2). OD is the average OD; the walls are minimums.
- The ID is JM Eagle's "nominal ID", which at these sizes equals OD − 2 × 1.06 × min wall.
- 30–48 in are cast-iron OD ("CIOD"). There is no 33 in.

| Nominal | OD | SDR 35 min wall | SDR 35 nominal ID | SDR 26 min wall | SDR 26 nominal ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 18 | 18.701 | 0.536 | 17.564 | 0.720 | 17.174 | manufacturer citing the standard | S14 (2025-10) |
| 21 | 22.047 | 0.632 | 20.707 | 0.849 | 20.247 | manufacturer citing the standard | S14 (2025-10) |
| 24 | 24.803 | 0.711 | 23.295 | 0.956 | 22.776 | manufacturer citing the standard | S14 (2025-10) |
| 27 | 27.953 | 0.801 | 26.254 | 1.077 | 25.669 | manufacturer citing the standard | S14 (2025-10) |
| 30 (CIOD) | 32.000 | 0.917 | 30.055 | 1.233 | 29.386 | manufacturer citing the standard | S14 (2025-10) |
| 36 (CIOD) | 38.300 | 1.098 | 35.972 | 1.475 | 35.173 | manufacturer citing the standard | S14 (2025-10) |
| 42 (CIOD) | 44.500 | 1.276 | 41.794 | 1.714 | 40.866 | manufacturer citing the standard | S14 (2025-10) |
| 48 (CIOD) | 50.800 | 1.456 | 47.713 | 1.957 | 46.651 | manufacturer citing the standard | S14 (2025-10) |

## PVC pressure, AWWA C900, DR 18 and DR 14 (4–24 in)

Westlake (S3), AWWA C900-22, cast-iron OD:
- DR 18 is Pressure Class 235 psi; DR 14 is 305 psi.
- The ID is "calculated using nominal outside diameter and minimum wall thickness".

DR 14 at 18, 20 and 24 in are JM Eagle's (S12), whose ID is its "nominal ID" (smaller than OD − 2 × min wall; check 8).
JM Eagle prints no DR 14 at 14 in; Westlake prints none above 16 in.

| Nominal | OD | DR 18 min wall | DR 18 ID | DR 14 min wall | DR 14 ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 4 | 4.800 | 0.267 | 4.266 | 0.343 | 4.114 | manufacturer citing the standard | S3 (2024) |
| 6 | 6.900 | 0.383 | 6.134 | 0.493 | 5.914 | manufacturer citing the standard | S3 (2024) |
| 8 | 9.050 | 0.503 | 8.044 | 0.646 | 7.758 | manufacturer citing the standard | S3 (2024) |
| 10 | 11.100 | 0.617 | 9.866 | 0.793 | 9.514 | manufacturer citing the standard | S3 (2024) |
| 12 | 13.200 | 0.733 | 11.734 | 0.943 | 11.314 | manufacturer citing the standard | S3 (2024) |
| 14 | 15.300 | 0.850 | 13.600 | 1.093 | 13.114 | manufacturer citing the standard | S3 (2024) |
| 16 | 17.400 | 0.967 | 15.466 | 1.243 (S12 prints 1.242) | 14.914 | manufacturer citing the standard (check 8) | S3 (2024); S12 (2026-01) |
| 18 | 19.500 | 1.083 | 17.334 | 1.393 | 16.57 (S12's nominal ID) | manufacturer citing the standard | DR 18: S3 (2024); DR 14: S12 (2026-01) |
| 20 | 21.600 | 1.200 | 19.200 | 1.543 | 18.35 (S12's nominal ID) | manufacturer citing the standard | DR 18: S3 (2024); DR 14: S12 (2026-01) |
| 24 | 25.800 | 1.433 | 22.934 | 1.843 | 21.89 (S12's nominal ID) | manufacturer citing the standard | DR 18: S3 (2024); DR 14: S12 (2026-01) |

Cross-checks: Uni-Bell's mandrel note works an 18" DR 18 example with OD 19.500 and minimum wall 1.083, the same as
Westlake's row. JM Eagle's DR 18 walls (S12) equal Westlake's at every size both print.

## PVCO pressure, AWWA C909 (6–24 in)

JM Eagle (S13), ANSI/AWWA C909, cast-iron OD ("CIOD"):
- **OD:** the same values as ductile iron's at each size (S4). AWWA's store page for C909-22 calls them
  "ductile-iron (DI)-equivalent".
- **Walls:** minimums, by pressure class.
- **ID:** JM Eagle's "nominal ID".
- **Sizes made:** 6, 8, 10, 12, 16 and 24 in at 305 and 235 psi; 16 in only at 165 psi.

| Nominal | OD | Class 165 min wall | Class 165 ID | Class 235 min wall | Class 235 ID | Class 305 min wall | Class 305 ID | Mark | Source |
|---|---|---|---|---|---|---|---|---|---|
| 4 | not found: drives trench width | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found | |
| 6 | 6.90 | not found: wall only | not found: wall only | 0.221 | 6.43 | 0.284 | 6.30 | manufacturer citing the standard | S13 (2026-01) |
| 8 | 9.05 | not found: wall only | not found: wall only | 0.290 | 8.44 | 0.373 | 8.26 | manufacturer citing the standard | S13 (2026-01) |
| 10 | 11.10 | not found: wall only | not found: wall only | 0.356 | 10.35 | 0.457 | 10.13 | manufacturer citing the standard | S13 (2026-01) |
| 12 | 13.20 | not found: wall only | not found: wall only | 0.423 (Westlake overview: 0.45) | 12.31 | 0.544 | 12.05 | manufacturer citing the standard (check 8) | S13 (2026-01) |
| 14 | not found: drives trench width | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found | |
| 16 | 17.40 | 0.395 | 16.55 | 0.557 | 16.19 | 0.717 | 15.85 | manufacturer citing the standard | S13 (2026-01) |
| 18 | not found: drives trench width | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found | |
| 20 | not found: drives trench width | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found: wall only | not found | |
| 24 | 25.80 | not found: wall only | not found: wall only | 0.827 | 24.06 | 1.063 | 23.57 | manufacturer citing the standard | S13 (2026-01) |

## Ductile iron, AWWA C151, pressure classes (4–24 in)

McWane (S4):
- **Wall:** the nominal thickness by pressure class (psi). Per AWWA C150 it includes the 0.08 in service allowance and
  the casting tolerance.
- **Blank:** a blank class is not made in that size.
- **The ID:** the iron's (OD − 2 × wall), not a lined bore, and not printed. Only OD and wall are given.

| Nominal | OD | 150 | 200 | 250 | 300 | 350 | Mark | Source |
|---|---|---|---|---|---|---|---|---|
| 4 | 4.80 | | | | | 0.25 (the lowest made) | manufacturer citing the standard | S4 (2022-04) |
| 6 | 6.90 | | | | | 0.25 (the lowest made) | manufacturer citing the standard | S4 (2022-04) |
| 8 | 9.05 | | | | | 0.25 (the lowest made) | manufacturer citing the standard | S4 (2022-04) |
| 10 | 11.10 | | | | | 0.26 | manufacturer citing the standard | S4 (2022-04) |
| 12 | 13.20 | | | | | 0.28 | manufacturer citing the standard | S4 (2022-04) |
| 14 | 15.30 | | | 0.28 | 0.30 | 0.31 | manufacturer citing the standard | S4 (2022-04) |
| 16 | 17.40 | | | 0.30 | 0.32 | 0.34 | manufacturer citing the standard | S4 (2022-04) |
| 18 | 19.5 | | | 0.31 | 0.34 | 0.36 | manufacturer citing the standard | S4 (2022-04) |
| 20 | 21.60 | | | 0.33 | 0.36 | 0.38 | manufacturer citing the standard | S4 (2022-04) |
| 24 | 25.80 | | 0.33 | 0.37 | 0.40 | 0.43 | manufacturer citing the standard | S4 (2022-04) |

## Reinforced concrete pipe, ASTM C76, Class III, IV and V (12–96 in)

**How C76 sizes RCP.**
- The class (III, IV, V) is the pipe's strength (D-load). The wall (A, B, C) is a separate choice.
- The ID is the nominal size, and the OD is the ID plus two walls. A class does not change the dimensions of a given
  wall, only the steel.
- Which wall a class is made in is the manufacturer's choice; Wall B and Wall C are the usual ones.

**Wall B:** Rinker (S5).
- Its walls equal ACPA's Wall B.
- Rinker prints the *bell* OD. From 84 in its pipe has no bell, and the sheet marks that line as the pipe's OD.

**Wall C:** ACPA (S6). Below 24 in: not found (check 9); the wall sets the OD, so each blank drives the trench width.

| ID (nominal) | Wall B | Rinker bell OD (pipe OD from 84) | Mark (Wall B) | Wall C | Mark (Wall C) | Source |
|---|---|---|---|---|---|---|
| 12 | 2 | 23 | manufacturer, no standard named | not found: drives trench width | not found | B: S5 (undated) |
| 15 | 2-1/4 | 26 | manufacturer, no standard named | not found: drives trench width | not found | B: S5 (undated) |
| 18 | 2-1/2 | 29 | manufacturer, no standard named | not found: drives trench width | not found | B: S5 (undated) |
| 21 | 2-3/4 | 32 | manufacturer, no standard named | not found: drives trench width | not found | B: S5 (undated) |
| 24 | 3 | 35 | manufacturer, no standard named | 3-3/4 | association citing the standard (check 5) | B: S5; C: S6 (2007-10) |
| 27 | 3-1/4 | 38-3/4 | manufacturer, no standard named | 4 | association citing the standard (check 5) | B: S5; C: S6 (2007-10) |
| 30 | 3-1/2 | 42-1/4 | manufacturer, no standard named | 4-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 33 | 3-3/4 (ACPA prints 3-1/4) | 46-3/4 | manufacturer, no standard named | 4-1/2 | association citing the standard | B: S5; C: S6 (2007-10) |
| 36 | 4 | 50-1/4 | manufacturer, no standard named | 4-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 42 | 4-1/2 | 58 | manufacturer, no standard named | 5-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 48 | 5 | 64 | manufacturer, no standard named | 5-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 54 | 5-1/2 | 70 | manufacturer, no standard named | 6-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 60 | 6 | 76 | manufacturer, no standard named | 6-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 66 | 6-1/2 | 82 | manufacturer, no standard named | 7-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 72 | 7 | 88 | manufacturer, no standard named | 7-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 78 | 7-1/2 | 94 | manufacturer, no standard named | 8-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 84 | 8 | 100 (pipe OD) | manufacturer, no standard named | 8-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 90 | 8-1/2 | 107 (pipe OD) | manufacturer, no standard named | 9-1/4 | association citing the standard | B: S5; C: S6 (2007-10) |
| 96 | 9 | 114 (pipe OD) | manufacturer, no standard named | 9-3/4 | association citing the standard | B: S5; C: S6 (2007-10) |

Rinker also makes 39 in (wall 4-1/4, bell OD 54); ACPA's table has no 39 in.

## HDPE pressure, IPS, DR 11 and DR 17 (4–24 in)

Performance Pipe (S7), PE4710:
- DR 11 is 200 psi and DR 17 is 125 psi.
- The sheet's average ID is "calculated using IPS OD and Minimum wall plus 6%", the same convention as D3034's appendix.
- The sheet names no standard. ASTM F714 is the usual one for IPS 4 in and up, but that is not from the sheet.

| Nominal | OD | DR 11 min wall | DR 11 avg ID | DR 17 min wall | DR 17 avg ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 4 | 4.500 | 0.409 | 3.633 | 0.265 | 3.938 | manufacturer, no standard named | S7 (2015-02) |
| 6 | 6.625 | 0.602 | 5.349 | 0.390 | 5.798 | manufacturer, no standard named | S7 (2015-02) |
| 8 | 8.625 | 0.784 | 6.963 | 0.507 | 7.550 | manufacturer, no standard named | S7 (2015-02) |
| 10 | 10.750 | 0.977 | 8.679 | 0.632 | 9.410 | manufacturer, no standard named | S7 (2015-02) |
| 12 | 12.750 | 1.159 | 10.293 | 0.750 | 11.160 | manufacturer, no standard named | S7 (2015-02) |
| 14 | 14.000 | 1.273 | 11.301 | 0.824 | 12.253 | manufacturer, no standard named | S7 (2015-02) |
| 16 | 16.000 | 1.455 | 12.915 | 0.941 | 14.005 | manufacturer, no standard named | S7 (2015-02) |
| 18 | 18.000 | 1.636 | 14.532 | 1.059 | 15.755 | manufacturer, no standard named | S7 (2015-02) |
| 20 | 20.000 | 1.818 | 16.146 | 1.176 | 17.507 | manufacturer, no standard named | S7 (2015-02) |
| 22 | 22.000 | 2.000 | 17.760 | 1.294 | 19.257 | manufacturer, no standard named | S7 (2015-02) |
| 24 | 24.000 | 2.182 | 19.374 | 1.412 | 21.007 | manufacturer, no standard named | S7 (2015-02) |

Gas service (a utility type in the spec) commonly uses the same IPS DR 11 geometry in a gas-rated PE; no gas pipe sheet
was read.

## HDPE corrugated dual wall (4–36 in)

ADS N-12 ST IB (S8), ASTM F2648:
- The ID is the nominal size.
- The OD is printed "for reference purposes only"; for 12 in and up it is ±1 in.
- Each size is "available with or without perforations", which covers subdrain too.
- No 21, 27 or 33 in.

| Nominal = ID | OD (reference) | Mark | Source |
|---|---|---|---|
| 4 | 4.8 | manufacturer citing the standard | S8 (2022-11) |
| 6 | 6.9 | manufacturer citing the standard | S8 (2022-11) |
| 8 | 9.1 | manufacturer citing the standard | S8 (2022-11) |
| 10 | 11.4 | manufacturer citing the standard | S8 (2022-11) |
| 12 | 14.5 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |
| 15 | 18 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |
| 18 | 22 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |
| 24 | 28 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |
| 30 | 36 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |
| 36 | 42 | manufacturer citing the standard (OD ±1) | S8 (2022-11) |

## Corrugated steel pipe (CMP), 2-2/3 x 1/2 in corrugation (12–84 in), and 3 x 1 or 5 x 1 (90–96 in)

Contech (S9), helical lockseam:
- **ID and thickness:** the inside diameter, and the specified thickness by gage.
- **Thickness by gage:** 18 gage 0.052, 16 gage 0.064, 14 gage 0.079, 12 gage 0.109, 10 gage 0.138, 8 gage 0.168.
- **OD:** not printed (check 9). Every OD cell below drives the trench width (D-560).
- **90 and 96 in:** Table 2, 3 x 1 or 5 x 1 corrugation. Contech's 2017 flier (S18) gives cover heights for the same
  five gages at these sizes.

| ID | Gages made (thickness above) | OD | Mark | Source |
|---|---|---|---|---|
| 12 | 18, 16, 14 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 15 | 18, 16, 14 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 18 | 18, 16, 14 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 21 | 18, 16, 14, 12 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 24 | 18, 16, 14, 12 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 30 | 18, 16, 14, 12 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 36 | 18, 16, 14, 12, 10 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 42 | 18, 16, 14, 12, 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 48 | 16, 14, 12, 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 54 | 14, 12, 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 60 | 12, 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 66 | 12, 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 72 | 10, 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 78 | 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 84 | 8 | not found: drives trench width | manufacturer, no standard named | S9 (2012) |
| 90 | 16, 14, 12, 10, 8 (3 x 1 or 5 x 1 corrugation) | not found: drives trench width | manufacturer, no standard named | S9 Table 2 (2012); S18 (2017) agrees |
| 96 | 16, 14, 12, 10, 8 (3 x 1 or 5 x 1 corrugation) | not found: drives trench width | manufacturer, no standard named | S9 Table 2 (2012); S18 (2017) agrees |

## Copper water tube, Type K and Type L (1/2–4 in)

The Copper Development Association's handbook (S17), Tables 14.2a and 14.2b, ASTM B88:
- **Dimensions:** the "nominal dimensions" as printed. Types K and L share the OD; the wall and the ID differ.
- **ODs:** Mueller's catalog (S10) gives the same ODs, 1/2–2 in.
- **The table runs to 12 in;** these rows stop at 4 in, the sizes of a water service.

| Nominal | OD | Type K wall | Type K ID | Type L wall | Type L ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 1/2 | 0.625 | 0.049 | 0.527 | 0.040 | 0.545 | association citing the standard | S17 (2016) |
| 3/4 | 0.875 | 0.065 | 0.745 | 0.045 | 0.785 | association citing the standard | S17 (2016) |
| 1 | 1.125 | 0.065 | 0.995 | 0.050 | 1.025 | association citing the standard | S17 (2016) |
| 1-1/4 | 1.375 | 0.065 | 1.245 | 0.055 | 1.265 | association citing the standard | S17 (2016) |
| 1-1/2 | 1.625 | 0.072 | 1.481 | 0.060 | 1.505 | association citing the standard | S17 (2016) |
| 2 | 2.125 | 0.083 | 1.959 | 0.070 | 1.985 | association citing the standard | S17 (2016) |
| 2-1/2 | 2.625 | 0.095 | 2.435 | 0.080 | 2.465 | association citing the standard | S17 (2016) |
| 3 | 3.125 | 0.109 | 2.907 | 0.090 | 2.945 | association citing the standard | S17 (2016) |
| 3-1/2 | 3.625 | 0.120 | 3.385 | 0.100 | 3.425 | association citing the standard | S17 (2016) |
| 4 | 4.125 | 0.134 | 3.857 | 0.110 | 3.905 | association citing the standard | S17 (2016) |

## Rigid PVC conduit, Schedule 40 and Schedule 80 (1/2–6 in)

Wheatland / Maverick Pipe (S11), UL 651 and NEMA TC2, for 1/2–4 in:
- The OD is the average OD, the wall the minimum wall, and the ID the minimum average ID, all as printed.
- 5 and 6 in are not on the sheet.

JM Eagle (S15), NEMA TC-2, for 5 and 6 in and the Schedule 80 3-1/2 in ID:
- The OD is the average OD, the wall the minimum wall, and the ID JM Eagle's "nominal ID" (check 8).
- Its walls equal Wheatland's at every size both print.

| Trade size | OD | Sch 40 min wall | Sch 40 ID | Sch 80 min wall | Sch 80 ID | Mark | Source |
|---|---|---|---|---|---|---|---|
| 1/2 | 0.840 | 0.109 | 0.578 | 0.147 | 0.502 | manufacturer citing the standard | S11 (2024-10) |
| 3/4 | 1.050 | 0.113 | 0.780 | 0.154 | 0.608 | manufacturer citing the standard | S11 (2024-10) |
| 1 | 1.315 | 0.133 | 1.004 | 0.179 | 0.910 | manufacturer citing the standard | S11 (2024-10) |
| 1-1/4 | 1.660 | 0.140 | 1.335 | 0.191 | 1.227 | manufacturer citing the standard | S11 (2024-10) |
| 1-1/2 | 1.900 | 0.145 | 1.564 | 0.200 | 1.446 | manufacturer citing the standard | S11 (2024-10) |
| 2 | 2.375 | 0.154 | 2.021 | 0.218 | 1.881 | manufacturer citing the standard | S11 (2024-10) |
| 2-1/2 | 2.875 | 0.203 | 2.414 | 0.276 | 2.250 | manufacturer citing the standard | S11 (2024-10) |
| 3 | 3.500 | 0.216 | 3.008 | 0.300 | 2.820 | manufacturer citing the standard | S11 (2024-10) |
| 3-1/2 | 4.000 | 0.226 | 3.486 | 0.318 | 3.332 (S15's nominal ID; S11's 3.820 not used, check 7) | manufacturer citing the standard | S11 (2024-10); Sch 80 ID: S15 (2026-06) |
| 4 | 4.500 | 0.237 | 3.961 | 0.337 | 3.737 | manufacturer citing the standard | S11 (2024-10) |
| 5 | 5.563 | 0.258 | 5.021 (nominal) | 0.375 | 4.776 (nominal) | manufacturer citing the standard | S15 (2026-06) |
| 6 | 6.625 (S16; S15's cell overprinted) | 0.280 | 6.037 (nominal) | 0.432 | 5.718 (nominal) | manufacturer citing the standard | S15 (2026-06); OD: S16 (2018-06) |

## Where the blanks may be filled

| Blank | Kind (D-560) | Where to look |
|---|---|---|
| C909 4, 14, 18 and 20 in | drives trench width (no OD); walls, wall only | Westlake's AquaMax data sheet (its page refused the fetch), another PVCO maker's sheet, or AWWA C909 itself |
| C909 Class 165 at 6–12 and 24 in | wall only | The same |
| RCP Wall C 12–21 in | drives trench width (the wall sets the OD) | A regional RCP manufacturer's Wall B and C table, or ASTM C76; ACPA's FAQ rule is a lead (check 9) |
| CMP OD | drives trench width | A CSP manufacturer's dimension sheet that prints one; the sheets read measure to the inside crests |
| PVC sewer 33 in | drives trench width (no OD); walls, wall only | Not made by the two manufacturers read; the current ASTM D3034 itself |
