# USACE EP 1110-1-8, 2022 rates: regions and four items in all 12 regions

Research date: 2026-11-04. The only source used is USACE EP 1110-1-8 and its region files.

## Sources opened

- **Pamphlet text:** EP 1110-1-8, dated 12 August 2021.
  `https://www.publications.usace.army.mil/Portals/76/Users/182/86/2486/EP%201110-1-8_RV1-12.pdf`.
  A direct fetch returned "Access Denied". The copy used is the web.archive.org snapshot
  `https://web.archive.org/web/20250614081907/https://www.publications.usace.army.mil/Portals/76/Users/182/86/2486/EP%201110-1-8_RV1-12.pdf`.
- **Index page:** `https://www.usace.army.mil/Cost-Engineering/EP1110-1-8/`. A direct fetch returns 403.
  The copy used is the snapshot of 2025-03-26 (`https://web.archive.org/web/20250326051435/https://www.usace.army.mil/Cost-Engineering/EP1110-1-8/`).
  It lists 12 regions under "Current Rates".
- **Region files:** usace.contentdm.oclc.org, collection p16021coll9, at
  `https://usace.contentdm.oclc.org/utils/getfile/collection/p16021coll9/id/<id>`.
  - The files were fetched through `https://web.archive.org/web/<timestamp>id_/<that URL>`. The timestamps are listed below.
  - A direct fetch of contentdm also worked on 2026-11-04: id 2656 returned 200 application/pdf. The direct copy of 2656 is byte-identical to the archived copy (same MD5).
  - Every hourly file is headed "Region: N, Pamphlet Year: 2022", and every page footer reads "EP 1110-1-8 · 01 December 2022".
  - The rate rows give a "Value TEV 7/1/2019" column.

| Region | Name (index page) | Hourly O&O file id | Snapshot | Local Area Factors id | Snapshot |
|---|---|---|---|---|---|
| 1 | Northeast | 2632 | 20250202075849 | 2633 | 20250202080634 |
| 2 | Mideast | 2636 | 20250202080419 | 2638 | 20250202080805 |
| 3 | Southeast | 2640 | 20250202080059 | 2641 | 20250202080719 |
| 4 | North Central | 2644 | 20250202075905 | 2647 | 20250202080837 |
| 5 | Midwest | 2648 | 20250202080510 | 2649 | 20250202080724 |
| 6 | Southwest | 2652 | 20250202080435 | 2653 | 20250202080709 |
| 7 | West | 2656 | 20250202075846 | 2657 | 20250202080500 |
| 8 | Northwest | 2660 | 20250202080732 | 2661 | 20250202080729 |
| 9 | Alaska | 2664 | 20250202080640 | 2665 | 20250202080805 |
| 10 | Hawaii | 2668 | 20250202080338 | 2669 | 20250202080050 |
| 11 | Puerto Rico | 2672 | 20250202080451 | 2673 | 20250202080829 |
| 12 | Kwajalein | 2676 | 20250202080359 | 2677 | 20250202080810 |

Other files the index page links:
- 2619: Area Factors for All Regions (snapshot 20250202075844)
- 2621: Equipment Hourly Calculation Factors
- 3002 to 3013: Region 1 to 12 Example Calculations

## How the figures were read

- All 48 rows below were read from the Average row on the printed page. That page is the same in all 12 regions.
- The page has a text layer, and each row was extracted twice, with pdftotext `-layout` and with `-raw`. The two readings agree.
- Each row was also checked against its own arithmetic:
  - Total Ownership = Depreciation + FCCM.
  - Total Operating = Fuel + FOG + Tire Wear + Tire Repair + Repair.
  - Total Hourly = Total Ownership + Total Operating.
- All 48 rows pass, to the cent with rounding.
- As a further check on the fuel column, Fuel $/hr divided by that region's fuel price is the same in every region:
  - S40CA004: 18.56 gal/hr of off-road diesel
  - C45GO013: about 3.31 gal/hr of off-road diesel
  - A25XX002: 8.37 gal/hr of on-road diesel
  - L25JE003: 0.423 gal/hr of gasoline
- The columns are defined as follows:
  - **Ownership** is the printed "Total Ownership".
  - **Fuel** is the printed "Fuel*".
  - **Operating excl. fuel** is "Total Operating" minus "Fuel*". It still includes FOG, tire wear, tire repair and repair.
  - **Total excl. fuel** is Ownership plus Operating excl. fuel.
- The two derived columns are my subtraction, not printed figures. The printed "Total Operating" and "Total Hourly Rate" are given alongside so they can be re-derived.
- All figures are $/hr, average condition, and exclude the operator.

## Item 1: S40CA004, Caterpillar RM-500B LR soil and road stabilizer (reclaimer), 546 HP, D-Off

Printed page 574 in every region.

| Region | Ownership | Operating excl. fuel | Fuel | Total excl. fuel | Printed Total Operating | Printed Total Hourly | Page | File id |
|---|---|---|---|---|---|---|---|---|
| 1 Northeast | 52.83 | 84.68 | 94.86 | 137.51 | 179.54 | 232.37 | 574 | 2632 |
| 2 Mideast | 52.09 | 75.11 | 84.65 | 127.20 | 159.76 | 211.85 | 574 | 2636 |
| 3 Southeast | 52.82 | 67.55 | 82.42 | 120.37 | 149.97 | 202.79 | 574 | 2640 |
| 4 North Central | 52.73 | 75.53 | 83.54 | 128.26 | 159.07 | 211.80 | 574 | 2644 |
| 5 Midwest | 53.04 | 74.17 | 83.17 | 127.21 | 157.34 | 210.38 | 574 | 2648 |
| 6 Southwest | 51.81 | 64.45 | 83.17 | 116.26 | 147.62 | 199.43 | 574 | 2652 |
| 7 West | 53.44 | 86.15 | 89.85 | 139.59 | 176.00 | 229.44 | 574 | 2656 |
| 8 Northwest | 52.29 | 78.63 | 87.44 | 130.92 | 166.07 | 218.36 | 574 | 2660 |
| 9 Alaska | 54.85 | 85.52 | 83.54 | 140.37 | 169.06 | 223.91 | 574 | 2664 |
| 10 Hawaii | 53.80 | 93.23 | 91.89 | 147.03 | 185.12 | 238.92 | 574 | 2668 |
| 11 Puerto Rico | 56.41 | 54.27 | 82.42 | 110.68 | 136.69 | 193.10 | 574 | 2672 |
| 12 Kwajalein | 52.08 | 70.33 | 91.89 | 122.41 | 162.22 | 214.30 | 574 | 2676 |

## Item 2: C45GO013, Gomaco GT-3200 curb and gutter slipform paver, crawler 3-track, 92 HP, D-Off

Printed page 140 in every region.

| Region | Ownership | Operating excl. fuel | Fuel | Total excl. fuel | Printed Total Operating | Printed Total Hourly | Page | File id |
|---|---|---|---|---|---|---|---|---|
| 1 Northeast | 34.62 | 58.65 | 16.92 | 93.27 | 75.57 | 110.19 | 140 | 2632 |
| 2 Mideast | 34.19 | 52.20 | 15.10 | 86.39 | 67.30 | 101.49 | 140 | 2636 |
| 3 Southeast | 34.73 | 46.82 | 14.71 | 81.55 | 61.53 | 96.26 | 140 | 2640 |
| 4 North Central | 34.49 | 52.70 | 14.90 | 87.19 | 67.60 | 102.09 | 140 | 2644 |
| 5 Midwest | 34.78 | 51.78 | 14.84 | 86.56 | 66.62 | 101.40 | 140 | 2648 |
| 6 Southwest | 34.07 | 44.38 | 14.84 | 78.45 | 59.22 | 93.29 | 140 | 2652 |
| 7 West | 35.25 | 60.43 | 16.03 | 95.68 | 76.46 | 111.71 | 140 | 2656 |
| 8 Northwest | 34.50 | 54.88 | 15.60 | 89.38 | 70.48 | 104.98 | 140 | 2660 |
| 9 Alaska | 35.74 | 60.45 | 14.90 | 96.19 | 75.35 | 111.09 | 140 | 2664 |
| 10 Hawaii | 35.82 | 66.22 | 16.39 | 102.04 | 82.61 | 118.43 | 140 | 2668 |
| 11 Puerto Rico | 37.19 | 37.22 | 14.71 | 74.41 | 51.93 | 89.12 | 140 | 2672 |
| 12 Kwajalein | 38.48 | 54.02 | 16.39 | 92.50 | 70.41 | 108.89 | 140 | 2676 |

- Fuel divided by the off-road diesel price gives about 3.31 gal/hr in every region.
- No Severe row is printed for this item.

## Item 3: A25XX002, asphalt distributor 2000 gal, 400 GPM, truck mounted (includes 32,000 GVW truck), 270 HP, D-On

Printed page 26 in every region. In Region 7 the footer page number came through as "26" on its own line.

| Region | Ownership | Operating excl. fuel | Fuel | Total excl. fuel | Printed Total Operating | Printed Total Hourly | Page | File id |
|---|---|---|---|---|---|---|---|---|
| 1 Northeast | 29.10 | 44.26 | 51.14 | 73.36 | 95.40 | 124.50 | 26 | 2632 |
| 2 Mideast | 28.55 | 38.85 | 45.62 | 67.40 | 84.47 | 113.02 | 26 | 2636 |
| 3 Southeast | 29.04 | 34.81 | 44.44 | 63.85 | 79.25 | 108.29 | 26 | 2640 |
| 4 North Central | 28.85 | 39.25 | 45.03 | 68.10 | 84.28 | 113.13 | 26 | 2644 |
| 5 Midwest | 29.04 | 38.43 | 44.78 | 67.47 | 83.21 | 112.25 | 26 | 2648 |
| 6 Southwest | 28.54 | 33.20 | 44.78 | 61.74 | 77.98 | 106.52 | 26 | 2652 |
| 7 West | 29.69 | 45.21 | 48.46 | 74.90 | 93.67 | 123.36 | 26 | 2656 |
| 8 Northwest | 29.07 | 41.17 | 47.12 | 70.24 | 88.29 | 117.36 | 26 | 2660 |
| 9 Alaska | 30.40 | 45.38 | 44.95 | 75.78 | 90.33 | 120.73 | 26 | 2664 |
| 10 Hawaii | 30.95 | 50.54 | 49.55 | 81.49 | 100.09 | 131.04 | 26 | 2668 |
| 11 Puerto Rico | 31.68 | 28.13 | 44.44 | 59.81 | 72.57 | 104.25 | 26 | 2672 |
| 12 Kwajalein | 34.30 | 42.23 | 49.55 | 76.53 | 91.78 | 126.08 | 26 | 2676 |

## Item 4: L25JE003, HRL-1 line striper, intermediate, 1 gun, self-propelled, single color, Gas 5.5 HP

Printed page 354 in every region.

| Region | Ownership | Operating excl. fuel | Fuel | Total excl. fuel | Printed Total Operating | Printed Total Hourly | Page | File id |
|---|---|---|---|---|---|---|---|---|
| 1 Northeast | 0.60 | 1.30 | 1.79 | 1.90 | 3.09 | 3.69 | 354 | 2632 |
| 2 Mideast | 0.57 | 1.13 | 1.75 | 1.70 | 2.88 | 3.45 | 354 | 2636 |
| 3 Southeast | 0.58 | 1.01 | 1.64 | 1.59 | 2.65 | 3.23 | 354 | 2640 |
| 4 North Central | 0.59 | 1.15 | 1.69 | 1.74 | 2.84 | 3.43 | 354 | 2644 |
| 5 Midwest | 0.59 | 1.11 | 1.63 | 1.70 | 2.74 | 3.33 | 354 | 2648 |
| 6 Southwest | 0.58 | 0.97 | 1.66 | 1.55 | 2.63 | 3.21 | 354 | 2652 |
| 7 West | 0.61 | 1.38 | 2.10 | 1.99 | 3.48 | 4.09 | 354 | 2656 |
| 8 Northwest | 0.60 | 1.25 | 1.96 | 1.85 | 3.21 | 3.81 | 354 | 2660 |
| 9 Alaska | 0.65 | 1.43 | 1.97 | 2.08 | 3.40 | 4.05 | 354 | 2664 |
| 10 Hawaii | 0.69 | 1.65 | 2.22 | 2.34 | 3.87 | 4.56 | 354 | 2668 |
| 11 Puerto Rico | 0.67 | 0.84 | 1.64 | 1.51 | 2.48 | 3.15 | 354 | 2672 |
| 12 Kwajalein | 0.82 | 1.46 | 2.22 | 2.28 | 3.68 | 4.50 | 354 | 2676 |

The Region 7 and Region 8 values given by the previous session were re-verified, and all eight match:
- Region 7: 139.59, 95.68, 74.90 and 1.99.
- Region 8: 130.92, 89.38, 70.24 and 1.85.

## Fuel prices per region (Local Area Factors file of each region)

- These are from the per-region "Area Factors" pages, read with `pdftotext -raw`.
- The `-layout` reading of these one-page files shifts values against their labels. Do not use it.
- In the same way, the "Area Factors for All Regions" table (id 2619) prints its region labels out of line with its data rows. Its rows taken in order 1 to 12 match the per-region files.

| Region | Gasoline $/gal | Diesel off-road $/gal | Diesel on-road $/gal | Sales tax | WHPY | File id |
|---|---|---|---|---|---|---|
| 1 Northeast | 4.23 | 5.11 | 6.11 | 5.75% | 1,330 | 2633 |
| 2 Mideast | 4.13 | 4.56 | 5.45 | 5.95% | 1,410 | 2638 |
| 3 Southeast | 3.87 | 4.44 | 5.31 | 7.75% | 1,490 | 2641 |
| 4 North Central | 4.00 | 4.50 | 5.38 | 5.40% | 1,160 | 2647 |
| 5 Midwest | 3.84 | 4.48 | 5.35 | 7.25% | 1,270 | 2649 |
| 6 Southwest | 3.92 | 4.48 | 5.35 | 5.10% | 1,430 | 2653 |
| 7 West | 4.97 | 4.84 | 5.79 | 8.15% | 1,560 | 2657 |
| 8 Northwest | 4.62 | 4.71 | 5.63 | 5.35% | 1,480 | 2661 |
| 9 Alaska | 4.66 | 4.50 | 5.37 | 4.75% | 1,000 | 2665 |
| 10 Hawaii | 5.25 | 4.95 | 5.92 | 4.25% | 1,520 | 2669 |
| 11 Puerto Rico | 3.87 | 4.44 | 5.31 | 11.50% | 1,480 | 2673 |
| 12 Kwajalein | 5.25 | 4.95 | 5.92 | 4.25% | 1,370 | 2677 |

The diesel prices are marked "*DEF Included at DEF Usage Rate Listed" (DEF Usage Rate 5.000%). Marine gasoline is $5.81/gal and marine diesel $5.96/gal in every region.

## Region map: states and territories

- **Source:** EP 1110-1-8 (12 August 2021), Appendix A: References, paragraph A.3 "Geographic Regions", printed pages 63 to 65.
- Paragraph 2 of the pamphlet says the rates "are published for 12 geographic regions (see Figure 1.1). Descriptions of each geographic region are provided in Appendix A".
- Figure 1.1, "Regions for the Construction Equipment Ownership and Operating Expense Schedule" (page iii), is an image with no text layer. I did not transcribe it.

The list as printed, by region:

| Region | Name (index page) | States, territory or area as printed in A.3 |
|---|---|---|
| 1 | Northeast | Connecticut, Maine, Massachusetts, New Hampshire, New Jersey, New York, Pennsylvania, Rhode Island, Vermont |
| 2 | Mideast | Delaware, District of Columbia, Illinois (East of U.S. Highway 51), Kentucky (East of U.S. Highway 51), Indiana, Maryland, Michigan (Lower Peninsula), Ohio, Virginia, West Virginia |
| 3 | Southeast | Alabama, Arkansas, Florida, Georgia, Louisiana, Mississippi, Missouri (Panhandle South of 36°-30'00"), North Carolina, South Carolina, Tennessee |
| 4 | North Central | Iowa (North of U.S. Highway 20), Michigan (Upper Peninsula), Minnesota, Montana, North Dakota, South Dakota, Wisconsin, Wyoming |
| 5 | Midwest | Colorado, Illinois (West of U.S. Highway 51), Iowa (South of U.S. Highway 20), Kansas, Kentucky (West of U.S. Highway 51), Missouri (North of 36°-30'00"), Nebraska |
| 6 | Southwest | New Mexico, Oklahoma, Texas |
| 7 | West | Arizona, California, Nevada, Utah |
| 8 | Northwest | Idaho, Oregon, Washington |
| 9 | Alaska | Alaska |
| 10 | Hawaii | Hawaii |
| 11 | Puerto Rico | Puerto Rico ("territory") |
| 12 | Kwajalein | Kwajalein Island ("area") |

- The degree sign in the Missouri lines appears as a replacement character in the PDF text. It is read here as 36°-30'00".
- The region names are those of the index page headings, for example "Region 7 - West".
- The Local Area Factors files print the names in capitals, for example "7 WEST" and "4 NORTHCENTRAL".

The same list by state (50 states plus DC; each state appears once, or twice when split):

| State | Region |
|---|---|
| Alabama | 3 |
| Alaska | 9 |
| Arizona | 7 |
| Arkansas | 3 |
| California | 7 |
| Colorado | 5 |
| Connecticut | 1 |
| Delaware | 2 |
| District of Columbia | 2 |
| Florida | 3 |
| Georgia | 3 |
| Hawaii | 10 |
| Idaho | 8 |
| Illinois | 2 east of U.S. Highway 51; 5 west of U.S. Highway 51 |
| Indiana | 2 |
| Iowa | 4 north of U.S. Highway 20; 5 south of U.S. Highway 20 |
| Kansas | 5 |
| Kentucky | 2 east of U.S. Highway 51; 5 west of U.S. Highway 51 |
| Louisiana | 3 |
| Maine | 1 |
| Maryland | 2 |
| Massachusetts | 1 |
| Michigan | 2 Lower Peninsula; 4 Upper Peninsula |
| Minnesota | 4 |
| Mississippi | 3 |
| Missouri | 3 panhandle south of 36°-30'00"; 5 north of 36°-30'00" |
| Montana | 4 |
| Nebraska | 5 |
| Nevada | 7 |
| New Hampshire | 1 |
| New Jersey | 1 |
| New Mexico | 6 |
| New York | 1 |
| North Carolina | 3 |
| North Dakota | 4 |
| Ohio | 2 |
| Oklahoma | 6 |
| Oregon | 8 |
| Pennsylvania | 1 |
| Rhode Island | 1 |
| South Carolina | 3 |
| South Dakota | 4 |
| Tennessee | 3 |
| Texas | 6 |
| Utah | 7 |
| Vermont | 1 |
| Virginia | 2 |
| Washington | 8 |
| West Virginia | 2 |
| Wisconsin | 4 |
| Wyoming | 4 |
| Puerto Rico (territory) | 11 |
| Kwajalein Island (area) | 12 |

Other territories (Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands) are **not listed** in A.3.

## What could not be opened, and caveats

- **Pamphlet, direct URL:** returned "Access Denied". The web.archive.org snapshot 20250614081907 was opened instead.
- **Index page, direct URL:** returned 403. The web.archive.org snapshot 20250326051435 was opened instead.
- **Figure 1.1 (region map image) and the per-region map images:** not transcribed. The images on the index page are Regions.jpg and Region1.jpg to Region12.jpg. The A.3 text list above is the pamphlet's own written description.
- **Dates:**
  - The pamphlet text is dated 12 August 2021.
  - The 2022 rate files are footed "01 December 2022" and headed "Pamphlet Year: 2022".
  - Equipment values are at "TEV 7/1/2019".
- Nothing in the four items was missing in any region.
