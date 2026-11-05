# Equipment research: fuel (Task A) and hourly rates (Task B)

Researched 2026-11-04. Every figure comes from a page opened in this session, or is marked derived with its arithmetic.

## Sources

- **EP 1110-1-8 (current edition).** Construction Equipment Ownership and Operating Expense Schedule.
  - Pamphlet text: dated 12 Aug 2021. https://www.publications.usace.army.mil/Portals/76/Users/182/86/2486/EP%201110-1-8_RV1-12.pdf
  - Rate schedules: "Pamphlet Year 2022", every page dated 01 December 2022, equipment values (TEV) as of 7/1/2019.
  - Index page: https://www.usace.army.mil/Cost-Engineering/EP1110-1-8/. The live page returns 403 to scripts, so it was read through the web.archive.org snapshot of 2025-03-26. That snapshot lists 2022 as "Current Rates". Its newest past edition is 2018, and no 2024 or 2025 schedule appears.
  - Files are hosted on usace.contentdm.oclc.org (collection p16021coll9), also fetched through web.archive.org. Region 7 West hourly table is id 2656 and its Area Factors are id 2657. Region 8 Northwest hourly table is id 2660. Equipment Hourly Calculation Factors is id 2621.
- **Region used: Region 7 (West)** for every Task A figure and as the primary column in Task B. Region 8 (Northwest, which includes WA) is given beside it for comparison.
- **Region 7 fuel prices (Area Factors):** gasoline $4.97/gal, diesel off-road $4.84/gal, diesel on-road $5.79/gal (DEF included).
- **EP fuel method (pamphlet para 2.21):**
  - Fuel $/hr = hp x $/gal x fuel factor, where the factor is in gal/bhp-hr and equals HPF x lb per bhp-hr / lb per gal.
  - The constants are gasoline 0.55 lb/bhp-hr at 6 lb/gal, and diesel 0.34 lb/bhp-hr at 7 lb/gal.
  - Severe-condition consumption is 30% above average.
  - Gallons per hour are therefore hp x factor. Each category factor was checked against a listed item, as Fuel$ / price / hp. For example, Cat CS44B: $15.00 / $4.84 / 100 hp = 0.031. Cat CB10: $27.26 / $4.84 / 131 = 0.043. RM-500B: $89.85 / $4.84 / 546 = 0.034. T50XX029: $66.01 / $5.79 / 475 = 0.024.
- **WA DES contract 22823** vendor price list: https://apps.des.wa.gov/contracting/22823VendorsEquipmentPrices.xlsx. It has two sheets: "Line Item" and "Additional Equipment For Rent".
- **FEMA 2025 Schedule of Equipment Rates.** This US government schedule is used only to supply hp, or a supplementary hourly rate, where EP has no item. The fema.gov file returned 403, so the copy read is https://adeca.alabama.gov/wp-content/uploads/2025-FEMA-Schedule-of-Equipment-Rates.pdf. FEMA rates include fuel and operating costs and exclude the operator.
- **NY OGS Award 23182** (Heavy Equipment Rental, statewide, 2020-10-08 to 2025-10-07). Ten vendor price lists were checked. Only Stephenson lists a "Distributor Truck Rosco Max III", with daily and weekly N/A. Its monthly figure reads $4,800 in one text layer and $11,700 in the other, so it is **not used**.

## Task A: fuel gal/hr

- **low:** EP gives only average and severe conditions, so there is no low figure.
- **med:** EP average (hp x average factor).
- **high:** the EP severe factor where the category publishes one. A `*` means average x 1.3, per para 2.21c.
- **basis EP:** EP's own hp and factor for the named item. Gallons = that item's Fuel $ / Region 7 price.
- **basis derived:** FEMA 2025 hp x the EP factor of the nearest EP category, with the arithmetic shown in the row. FEMA "to N" hp is a class ceiling, so those rows lean high.
- **page:** the printed page of the EP Region 7 hourly table.

Filled 204 of 288: 152 from an EP item, 52 derived. All 20 used_in_pricing rows are filled; 18 are EP items and 2 are derived (FD-POSTDRIVER and LC-GRIND-8621).

| equip_key | low | med | high | fuel | basis | source item (EP R7 tag + desc, or FEMA code) | R7 page | note |
|---|---|---|---|---|---|---|---|---|
| AUG-8061 | — | 0.58 | 0.75* | gas | EP | D30MR001 Minuteman portable earth auger, 3 in, Gas 8 hp | 215 | EP has no 18 in portable auger; EP item is gas |
| CN-CURB-MACHINE | — | 3.31 | 4.31* | diesel | EP | C45GO013 Gomaco GT-3200 curb/gutter slipform, 92 hp | 140 |  |
| CN-SAW-EARLY | — | 0.73 | 0.95* | gas | EP | C60HV025 Husqvarna FS 309 G 14 in walk-behind saw, Gas 9 hp | 160 | EP has no early-entry saw; nearest 14 in gas saw |
| CN-SAW-WB-14 | — | 0.89 | 1.16* | gas | EP | C60HV026 FS 513 G 18 in saw, Gas 11 hp | 160 |  |
| CN-SCREED-VIB-10 | — | 0.09 | 0.12* | gas | EP | C25AJ026 Allen HD7070 10 ft vibratory screed, Gas 1.5 hp | 120 |  |
| CP-PLATE-REV | — | 0.58 | 0.75* | diesel | EP | C10WC008 Wacker DPU 6555 reversible plate, 13.5 hp | 108 | same model as catalog |
| CP-SD-66-SM | — | 3.10 | 4.03* | diesel | EP | R50CA013 Cat CS44B 66 in smooth drum, 100 hp | 522 | same model as catalog |
| CP-TANDEM-67 | — | 5.63 | 7.32* | diesel | EP | R45CA026 Cat CB10 67 in tandem, 131 hp | 510 | same model as catalog |
| CP-TRENCH-ROLLER | — | 0.88 | 1.15* | diesel | EP | C10MU002 Multiquip RX1575 trench roller 33 in, 20.5 hp | 110 | same model as catalog |
| DT-OP-3AXLE | — | 11.40 | 14.73 | diesel | EP | T50XX029 Truck 6x4 3-axle 52,000 GVW chassis, D-On 475 hp | 665 | dump body (T40) has no engine |
| FD-POSTDRIVER | — | 3.10 | 4.03* | diesel | derived | FEMA 8064: Hydraulic post driver (FEMA: to 100 hp) = 100 hp x 0.031 |  | not in EP; FEMA hp is a ceiling ("to 100"); P30 vibratory hammer factor |
| LC-GRIND-8621 | — | 17.89 | 23.25* | diesel | derived | FEMA 8621: Morbark 1000 tub grinder (FEMA: to 577 hp) = 577 hp x 0.031 |  | not in EP; B20 brush-chipper factor (same as H13 shredders) |
| LC-STUMP-23 | — | 2.15 | 2.74 | diesel | EP | L10VE009 Vermeer SC 802 stumper 28 in wheel, 74 hp | 342 | SC852 not in EP |
| PV-BROOM-SP-8 | — | 0.78 | 1.01* | diesel | EP | B15LS001 Lay-Mor SM300 8 ft broom, D-On 25 hp | 67 |  |
| PV-DIST-2000 | — | 8.37 | 10.88* | diesel | EP | A25XX002 Asphalt distributor 2000 gal truck mtd (incl 32k GVW truck), D-On 270 hp | 26 |  |
| PV-STABILIZER-WR2400 | — | 18.56 | 24.02 | diesel | EP | S40CA004 Cat RM-500B stabilizer/reclaimer 96 in, 546 hp | 574 | WR 2400 not in EP |
| PV-STRIPE-8440 | — | 0.42 | 0.55* | gas | EP | L25JE003 HRL-1 striper 1 gun self-propelled, Gas 5.5 hp | 354 | FEMA 8440 LineLazer 3400 is "to 5" hp |
| PV-SWEEPER-TRUCK | — | 2.29 | 2.98* | diesel | EP | B15EC002 Elgin Pelican P sweeper 10 ft, D-On 74 hp | 66 |  |
| TRK-PU-8808 | — | 3.33 | 4.75 | diesel | EP | T50XX018 Pickup 4x4 1-ton diesel, D-On 475 hp | 655 | EP has no 4x4 1-ton crew diesel; T50XX021 (4x2 1-ton crew dsl) has the same fuel |
| WT-8000-ADT | — | 12.62 | 16.69 | diesel | EP | T60KI003 Water truck 8,000 gal off-hwy w/ Cat 621K tractor, 407 hp | 682 |  |
| ADT-35T | — | 10.44 | 12.62 | diesel | EP | T55CA005 Cat 735 ADT, 435 hp | 673 |  |
| ADT-40T | — | 10.78 | 13.02 | diesel | EP | T55CA006 Cat 740GC ADT, 449 hp | 674 |  |
| ADT-EJ-30T | — | 9.00 | 10.88 | diesel | EP | T55CA004 Cat 730C2 ADT, 375 hp | 673 | ejector body not listed; standard 730 |
| ADT-EJ-42T | — | 10.78 | 13.02 | diesel | EP | T55CA006 Cat 740GC ADT, 449 hp | 674 | ejector body not listed; standard 740 |
| AIR-100 | — | 0.76 | 0.98* | diesel | EP | A15XX021 Air compressor 100 CFM trailer, 21 hp | 7 |  |
| AUG-8060 | — | 0.43 | 0.56* | gas | derived | FEMA 8060: One-man wheel-mount auger 16 in (FEMA: to 6 hp) = 6 hp x 0.072 |  | gas factor used (small auger engines); FEMA gives no fuel |
| AUGER-BORE | — | 1.14 | 1.48* | diesel | EP | D15BI003 "24 Brute" horizontal auger boring 8-24 in, 30 hp | 199 |  |
| AW-AB-RT-135 | — | 1.78 | 2.31* | diesel | EP | P40TE036 Genie ZX-135/70, 74 hp | 458 | same model |
| AW-AB-EL-60 | — | 1.15 | 1.50* | diesel | EP | P40TE020 Genie Z-62/40 4WD, 48 hp | 455 | EP unit is diesel, catalog is hybrid: upper bound |
| AW-BUCKET-55 | — | 7.20 | 9.36* | diesel | EP | P40XX029 Altec HRX55 line truck, D-On 300 hp | 453 |  |
| AW-SC-RT-40 | — | 0.60 | 0.77* | diesel | EP | P40TE034 Genie GS-4069RT, 24.8 hp | 457 | same model |
| AW-SC-RT-40OR | — | 0.60 | 0.77* | diesel | EP | P40TE034 Genie GS-4069RT w/ outriggers, 24.8 hp | 457 |  |
| AW-SC-RT-50 | — | 1.15 | 1.50* | diesel | EP | P40TE035 Genie GS-5390RT, 48 hp | 458 | same model |
| AW-TB-40 | — | 1.15 | 1.50* | diesel | EP | P40TE023 Genie S-40, 48 hp | 456 |  |
| AW-TB-60 | — | 1.15 | 1.50* | diesel | EP | P40TE021 Genie S-60XC, 48 hp | 455 |  |
| AW-TB-80 | — | 1.39 | 1.81* | diesel | EP | P40TE019 Genie S-80XC, 58 hp | 454 |  |
| AW-TB-85 | — | 1.78 | 2.31* | diesel | EP | P40TE024 Genie S-85XC, 74 hp | 456 |  |
| CN-BUGGY | — | 0.76 | 0.98* | gas | EP | C20XX001 Concrete buggy 16 CF, Gas 12 hp | 116 |  |
| CN-BUGGY-TRACK-16 | — | 0.50 | 0.66* | gas | EP | C20XX002 Concrete buggy 11.5 CF crawler, Gas 8 hp | 116 | EP tracked unit is 11.5 CF |
| CN-LASER-SCREED | — | 1.36 | 1.77* | diesel | EP | C25SV010 Somero S-15R laser screed, 44 hp | 127 |  |
| CN-MIXER-12CF | — | 0.82 | 1.06* | gas | EP | C40MU002 Multiquip WM120SHHD 12 CF, Gas 13 hp | 135 |  |
| CN-MIXER-16CF | — | 0.82 | 1.06* | gas | EP | C40XX007 Mortar mixer 16 CF, Gas 13 hp | 139 |  |
| CN-MIXER-5CF | — | 0.35 | 0.45* | gas | EP | C40MU006 Multiquip MC44SH 4 CF, Gas 5.5 hp | 137 | EP unit is 4 CF |
| CN-PUMP-BOOM-38M | — | 14.45 | 18.79* | diesel | EP | C55SC006 Schwing S39 SXD 113 ft boom pump, D-On 425 hp | 150 |  |
| CN-PUMP-LINE | — | 3.40 | 4.42* | diesel | EP | C55SC001 Schwing SP750-18 trailer pump, 100 hp | 149 |  |
| CN-SAW-DEEP-60 | — | 3.18 | 4.14* | diesel | EP | C60HV013 Husqvarna FS 7000 D 42 in saw, D-On 74 hp | 156 | FEMA 8512 (60 in) is also 74 hp |
| CN-SCREED-HAND | — | 0.09 | 0.12* | gas | EP | C25XX030 Power screed 4 ft, Gas 1.5 hp | 122 |  |
| CN-SCREED-ROLLER | — | 0.16 | 0.20* | gas | EP | C25AJ028 Allen RTF roller tube finisher, Gas 2.5 hp | 121 |  |
| CN-SCREED-TRUSS-20 | — | 0.57 | 0.74* | gas | EP | C25XX034 Power screed 22.5 ft, Gas 9 hp | 123 |  |
| CN-SLIPFORM-PAVER | — | 10.80 | 14.04* | diesel | EP | C45GO018 Gomaco GP3 2-track slipform, 300 hp | 141 | EP range GP-2600 230 hp to GP-4000 450 hp |
| CN-TELEBELT | — | 14.45 | 18.79* | diesel | EP | C55SC008 LB33 T4-20 truck conveyor 107 ft boom, D-On 425 hp | 151 |  |
| CN-TROWEL-RIDE-72 | — | 1.39 | 1.80* | gas | EP | C25AJ020 Allen MP215 ride-on 2x36 in, Gas 22 hp | 117 |  |
| CN-TROWEL-RIDE-91 | — | 2.33 | 3.03* | gas | EP | C25AJ022 Allen MSP445 ride-on 2x46 in, Gas 37 hp | 117 |  |
| CN-TROWEL-RIDE-98 | — | 2.33 | 3.03* | gas | EP | C25AJ030 Allen MSP 455 ride-on 2x46 in, Gas 37 hp | 118 |  |
| CN-TROWEL-WB | — | 0.45 | 0.58* | gas | EP | C25WC002 Wacker CT48-8A 48 in, Gas 7.1 hp | 119 |  |
| CN-TRUCKMIX-11 | — | 12.71 | 16.52* | diesel | EP | T40XX037 Transit mixer 11 CY incl 70k GVW truck, D-On 410 hp | 627 |  |
| CN-TRUCKMIX-13 | — | 12.71 | 16.52* | diesel | EP | T40XX037 Transit mixer 11 CY incl 70k GVW truck, D-On 410 hp | 627 | EP largest is 11 CY |
| CN-VIB-FLEX | — | 0.09 | 0.12* | gas | EP | C65AJ025 Allen AHFV22 vibrator 2.2 in head, Gas 1.5 hp | 163 |  |
| CP-COMBO | — | 1.12 | 1.46* | diesel | EP | R50CA033 Cat CC24B combination roller, 36.2 hp | 523 | CC34B (4 t class) 48.8 hp gives 1.51 |
| CP-PAVEROLLER-2T | — | 0.95 | 1.23* | diesel | EP | R30BO005 Bomag BW100SL-5 static tandem 2.6 t, 25 hp | 500 |  |
| CP-PLATE-FWD | — | 0.32 | 0.42* | gas | EP | C10BO003 Bomag BVP 10/36 plate, Gas 4 hp | 106 |  |
| CP-SD-48PAD | — | 1.40 | 1.81* | diesel | EP | R50BO010 Bomag BW124PDH-40 padfoot 4.3 t, 45 hp | 517 |  |
| CP-SD-66-PAD | — | 3.13 | 4.07* | diesel | EP | R50CA004 Cat CP44B padfoot, 101 hp | 520 | same model |
| CP-SD-84-PAD | — | 4.84 | 6.29* | diesel | EP | R50CA016 Cat CP56B padfoot, 156 hp | 522 | same model |
| CP-TANDEM-54 | — | 1.93 | 2.52* | diesel | EP | R45BO005 Bomag BW138AD-5 tandem, 45 hp | 505 |  |
| CP-TANDEM-79 | — | 6.11 | 7.94* | diesel | EP | R45CA027 Cat CB13 tandem, 142 hp | 511 | same model |
| CP-TANDEM-84 | — | 6.11 | 7.94* | diesel | EP | R45CA028 Cat CB15 tandem, 142 hp | 511 | same model |
| CP-TANDEM-SMALL | — | 1.56 | 2.02* | diesel | EP | R45CA016 Cat CB22B tandem 3 t, 36.2 hp | 510 |  |
| CR-AT-60T | — | 11.01 | 14.56 | diesel | EP | C80GV033 Grove GMK3060-2 AT 69 t, D-On 355 hp | 178 |  |
| CR-CARRY-15T | — | 3.60 | 4.68* | diesel | EP | C75BD018 Broderson IC-200-3J 15 t, 100 hp | 168 |  |
| CR-CARRY-20T | — | 3.60 | 4.68* | diesel | EP | C75BD015 Broderson IC-250-3E 18 t, 100 hp | 167 |  |
| CR-CRAWL-125T | — | 5.13 | 6.75 | diesel | EP | C85LB014 Link-Belt 228 HSL 130 t lattice crawler, 270 hp | 187 | lifting-duty factor |
| CR-CRAWL-CLAM-120T | — | 7.41 | 9.69 | diesel | derived | C85KC009 Kobelco CK1100G 110 t crawler, 285 hp = 285 hp x 0.026 | 186 | EP hp with EP clamshell/dragline factor (C85 0.13/0.14) |
| CR-CRAWL-CLAM-70T | — | 7.02 | 9.18 | diesel | derived | C85LB001 Link-Belt 138 HSL 80 t crawler, 270 hp = 270 hp x 0.026 | 187 | EP hp with EP clamshell/dragline factor |
| CR-HYD-40T-OP | — | 11.32 | 14.97 | diesel | EP | C80LB009 Link-Belt HTC-8640 40 t truck crane, D-On 365 hp | 178 |  |
| CR-HYD-50T-OP | — | 13.95 | 18.45 | diesel | EP | C80GV029 Grove TMS750E 50 t, D-On 450 hp | 177 |  |
| CR-HYD-60T-OP | — | 11.32 | 14.97 | diesel | EP | C80LB011 Link-Belt HTC-8660 60 t, D-On 365 hp | 179 |  |
| CR-HYD-75T-OP | — | 6.17 | 7.90 | diesel | EP | C80TD006 Tadano ATF 70G-4 75 t AT, upper 129 + carrier D-On 435 hp | 181 |  |
| CR-HYD-80T-OP | — | 12.46 | 16.48 | diesel | EP | C80GV035 Grove TMS800E 80 t, D-On 402 hp | 180 |  |
| CR-HYD-100T-OP | — | 13.95 | 18.45 | diesel | EP | C80LB002 Link-Belt HTC 86100 100 t, 450 hp | 180 |  |
| CR-HYD-110T-OP | — | 7.60 | 9.79 | diesel | EP | C80TD007 Tadano ATF 100G-6 110 t AT, upper 175 + carrier D-On 435 hp | 182 |  |
| CR-HYD-120T-OP | — | 13.33 | 17.63 | diesel | EP | C80GV034 Grove GMK4100L-1 115 t AT, D-On 430 hp | 179 |  |
| CR-HYD-165T-OP | — | 8.12 | 10.40 | diesel | EP | C80TD004 Tadano ATF-130G-5 160 t AT, upper 173 + carrier D-On 551 hp | 183 |  |
| CR-RT-15T | — | 5.87 | 7.63* | diesel | EP | C75BD020 Broderson RT-400 15 t, 163 hp | 169 |  |
| CR-RT-50T-BARE | — | 7.02 | 9.13* | diesel | EP | C75LB001 Link-Belt RTC 8050 50 t RT, 195 hp | 171 | same model |
| CR-RT-65T-BARE | — | 9.36 | 12.17* | diesel | EP | C75GV031 Grove RT765E2 60 t RT, 260 hp | 170 |  |
| CR-RT-85T-BARE | — | 9.72 | 12.64* | diesel | EP | C75LB002 Link-Belt RTC 8090 90 t RT, 270 hp | 172 |  |
| CR-RT-100T-BARE | — | 12.42 | 16.15* | diesel | EP | C75LB003 Link-Belt RTC 80110 100 t RT, 345 hp | 172 |  |
| CR-TRK-CLAM | — | 7.54 | 9.62 | diesel | EP | C90MX001 Manitex 6430 30 t lattice truck crane, upper 260 + carrier 260 hp | 192 | FEMA 8212 American 5530 is to 240 hp |
| DERRICK-8670 | — | 7.20 | 9.36* | diesel | EP | P40XX025 Commander 4047 digger derrick, D-On 300 hp | 451 | FEMA 8670/8671 give no hp |
| DERRICK-8671 | — | 7.20 | 9.36* | diesel | EP | P40XX025 Commander 4047 digger derrick, D-On 300 hp | 451 |  |
| DM-SB-352 | — | 13.39 | 17.71 | diesel | EP | H25CA003 Cat 352 excavator 115,700 lb, 432 hp | 298 | base machine (straight-boom front not listed) |
| DM-UHD-352 | — | 13.39 | 17.71 | diesel | EP | H25CA003 Cat 352 excavator, 432 hp | 298 | base machine (UHD front not listed) |
| EX-LR-55T | — | 13.39 | 17.71 | diesel | EP | H25CA003 Cat 352 excavator, 432 hp | 298 | base machine (long-reach front not listed) |
| EX-SHOVEL-95T | — | 23.56 | 31.16 | diesel | EP | H35HI006 Hitachi EX1200-7 front shovel 8.5 CY, 760 hp | 334 | EP shovel is larger (~120 t) than Cat 395 FS |
| DT-OP-4AXLE | — | 11.04 | 14.26 | diesel | EP | T50XX034 Dump truck 8x4 4-axle 75k GVW, D-On 460 hp | 666 |  |
| DT-OP-SEMI | — | 12.00 | 15.50 | diesel | EP | T50XX100 Truck tractor 6x4 52k GVW day cab, D-On 500 hp | 668 | end-dump trailer has no engine |
| DZ-CRAWL-D6-LGP | — | 8.77 | 11.35 | diesel | EP | T15CA011 Cat D6T LGP, 258 hp | 592 | same model |
| ERO-HS-8630 | — | 0.76 | 0.99* | diesel | derived | FEMA 8630: Reinco HG-5 hydroseeder (FEMA 20 hp) = 20 hp x 0.038 |  |  |
| ERO-HS-8631 | — | 1.33 | 1.73* | diesel | derived | FEMA 8631: Reinco HG-10 hydroseeder (FEMA 35 hp) = 35 hp x 0.038 |  |  |
| ERO-HS-8632 | — | 5.09 | 6.62* | diesel | EP | L15FG001 Finn T330 3,000 gal hydroseeder, D-On 134 hp | 345 | FEMA 8632 HG-30 is 115 hp |
| ERO-MULCH-8633 | — | 1.27 | 1.65* | diesel | derived | FEMA 8633: Finn B70 straw mulcher (FEMA 33.5 hp) = 33.5 hp x 0.038 |  |  |
| ERO-MULCH-8634 | — | 2.05 | 2.67* | diesel | derived | FEMA 8634: Reinco M65 straw mulcher (FEMA 54 hp) = 54 hp x 0.038 |  |  |
| ERO-MULCH-8635 | — | 4.37 | 5.68* | diesel | EP | L15FG002 Finn B260T straw blower 20 TPH, D-On 115 hp | 345 | FEMA 8635 M90 is 115 hp |
| FD-AUGER-TRK-24 | — | 3.80 | 4.94* | diesel | derived | FEMA 8063: Truck-mounted auger 24 in w/ drop hammer (FEMA: to 100 hp) = 100 hp x 0.038 |  | FEMA hp is a ceiling |
| FD-HAMMER-DIESEL | — | 3.69 | 4.80* | diesel | EP | P25DL006 Delmag D30-32 diesel hammer, 119 hp | 440 | size not stated in catalog; EP D25-32 105 hp to D46-32 196 hp |
| FD-VIBRO-NF-S | — | 2.64 | 3.43* | diesel | EP | P30MK002 MKT V2E vibro 25 t w/ HP85 unit, 85 hp | 449 |  |
| FD-VIBRO-NF-M | — | 5.74 | 7.46* | diesel | EP | P30MK001 MKT V5E vibro 53 t, 185 hp | 449 |  |
| FD-VIBRO-NF-L | — | 21.70 | 28.21* | diesel | EP | P30MK004 MKT V52 vibro 201 t, 700 hp | 450 |  |
| GEN-17 | — | 1.04 | 1.37 | diesel | EP | G10XX005 Generator 20 kW skid, 33.5 hp | 233 | nearest; 13 kW trailer unit is 22.3 hp |
| GEN-5_5 | — | 0.65 | 0.85 | gas | EP | G10WC002 Wacker GP 5600A 5.6 kW, Gas 11 hp | 230 |  |
| GEN-700 | — | 37.05 | 49.00 | diesel | EP | G10XX058 Generator 720 kW skid, 1195 hp | 238 |  |
| GEN-800 | — | 46.35 | 61.30 | diesel | EP | G10XX015 Generator 855 kW skid, 1495 hp | 234 |  |
| GEN-900 | — | 46.35 | 61.30 | diesel | EP | G10XX015 Generator 855 kW skid, 1495 hp | 234 |  |
| GEN-1000 | — | 52.45 | 69.37 | diesel | EP | G10XX016 Generator 1,017 kW skid, 1692 hp | 234 |  |
| GEN-1500 | — | 67.39 | 89.13 | diesel | EP | G10XX059 Generator 1,400 kW skid, 2174 hp | 238 |  |
| HDD-MED | — | 8.55 | 11.11* | diesel | EP | D15VE008 Vermeer D100x120 S3 HDD 100,000 lb, 225 hp | 205 | D40x55 S3 (32,700 lb) 140 hp gives 5.32 |
| LC-8195 | — | 9.28 | 11.84 | diesel | derived | FEMA 8195: Barko 930B wheel mulcher (FEMA: to 320 hp) = 320 hp x 0.029 |  |  |
| LC-8198 | — | 6.20 | 8.20 | diesel | EP | L60JD007 Deere 843K feller buncher, 200 hp | 414 | FEMA 8198 Cat 511 is to 247 hp |
| LC-8654 | — | 2.18 | 2.78 | diesel | derived | FEMA 8654: Air curtain destructor (FEMA 75 hp) = 75 hp x 0.029 |  |  |
| LC-8824 | — | 7.35 | 9.72 | diesel | derived | FEMA 8824: Deere 640L-II skidder (FEMA 237 hp) = 237 hp x 0.031 |  |  |
| LC-8825 | — | 9.30 | 12.30 | diesel | derived | FEMA 8825: Deere 948L-II skidder (FEMA 300 hp) = 300 hp x 0.031 |  |  |
| LC-CHIP-8200 | — | 1.09 | 1.41* | diesel | derived | FEMA 8200: Vermeer BC900XL (FEMA 35 hp) = 35 hp x 0.031 |  |  |
| LC-CHIP-8201 | — | 2.29 | 2.98* | diesel | derived | FEMA 8201: Vermeer BC1000XL (FEMA 74 hp) = 74 hp x 0.031 |  |  |
| LC-CHIP-8202 | — | 4.03 | 5.24* | diesel | derived | FEMA 8202: Vermeer BC1500 (FEMA 130 hp) = 130 hp x 0.031 |  |  |
| LC-CHIP-8203 | — | 5.36 | 6.97* | diesel | derived | FEMA 8203: Vermeer BC1800XL (FEMA 173 hp) = 173 hp x 0.031 |  |  |
| LC-GRIND-8622 | — | 32.55 | 42.32* | diesel | derived | FEMA 8622: Morbark 1300 tub grinder (FEMA: to 1050 hp) = 1050 hp x 0.031 |  |  |
| LC-GRIND-8623 | — | 37.20 | 48.36* | diesel | derived | FEMA 8623: Morbark 1600 tub grinder (FEMA: to 1200 hp) = 1200 hp x 0.031 |  |  |
| LC-GRIND-8627 | — | 19.53 | 25.39* | diesel | derived | FEMA 8627: Vermeer HG6000 horizontal grinder (FEMA 630 hp) = 630 hp x 0.031 |  |  |
| PIPELAYER | — | 5.42 | 7.02 | diesel | EP | P35CA011 Cat PL83 pipelayer, 319 hp | 450 | class not sourced; smallest EP pipelayer |
| PMP-12D | — | 6.02 | 7.83* | diesel | EP | P55GF006 12T 12 in pump 5,000 gpm, 140 hp | 473 |  |
| PMP-CENT-2-6M | — | 0.32 | 0.42* | gas | EP | P60WC001 Wacker PG 2A 2 in, Gas 4 hp | 478 |  |
| PMP-CENT-2-8M | — | 0.53 | 0.68* | gas | EP | P60HO004 Honda TP2B 2 in, Gas 6.5 hp | 477 |  |
| PMP-CENT-3-18M | — | 0.49 | 0.63* | gas | EP | P60WC002 Wacker PG 3A 3 in, Gas 6 hp | 478 |  |
| PMP-CENT-3-HD | — | 0.65 | 0.84* | gas | EP | P60HO003 Honda TP3B 3 in trash, Gas 8 hp | 477 |  |
| PMP-CENT-4-40M | — | 2.02 | 2.63* | diesel | EP | P60GR001 Gorman-Rupp 14C2-F3L 4 in 600 gpm, 47 hp | 479 | FEMA 8476 is gas, to 60 hp |
| PMP-CENT-6-90M | — | 5.91 | 7.69* | gas | EP | P60GR002 Gorman-Rupp 16C2-F4L 6 in 1,825 gpm, Gas 73 hp | 479 | EP and FEMA 8477 are gas; catalog says diesel |
| PMP-SP-4D | — | 0.43 | 0.56* | diesel | EP | P50XX003 4 in diesel trash pump 526 gpm, 10 hp | 466 |  |
| PMP-STORM | — | 232.20 | 301.86* | diesel | derived | FEMA 8469: Stormwater pump 1,740 CFS (FEMA 5,400 hp) = 5400 hp x 0.043 |  |  |
| PMP-TRASH-2 | — | 0.81 | 1.05* | gas | EP | P50WC001 Wacker PT 2A 2 in trash, Gas 10 hp | 467 |  |
| PMP-TRASH-3 | — | 0.65 | 0.84* | gas | EP | P60HO003 Honda TP3B 3 in trash, Gas 8 hp | 477 |  |
| PMP-TRASH-4 | — | 1.30 | 1.68* | gas | EP | P60HO005 Honda TP4V trash, Gas 16 hp | 477 |  |
| PV-BROOM-SP-8153 | — | 2.29 | 2.98* | diesel | EP | B15RS001 RB-50 sweeper 8 ft, D-On 74 hp | 70 | FEMA 8153 Broce RC-350 is to 100 hp |
| PV-BROOM-SP-8155 | — | 1.15 | 1.49* | diesel | EP | B15TB001 Terramite TSS46 broom, 37 hp | 71 | same model |
| PV-BROOM-SP-8CAB | — | 2.29 | 2.98* | diesel | EP | B15RS005 Challenger sweeper 8 ft, D-On 74 hp | 70 |  |
| PV-CHIP-8423 | — | 8.84 | 11.49* | diesel | derived | FEMA 8423: Etnyre Quad 2.8 CY chip spreader (FEMA: to 260 hp) = 260 hp x 0.034 |  |  |
| PV-CHIP-8424 | — | 9.35 | 12.16* | diesel | EP | A10RS009 Rosco CSV 3.5 CY chip spreader, 275 hp | 1 | same model |
| PV-CHIP-8584 | — | 7.14 | 9.28* | diesel | derived | FEMA 8584: Etnyre 13 ft chip spreader (FEMA: to 210 hp) = 210 hp x 0.034 |  |  |
| PV-MILL-PM310 | — | 12.60 | 16.38* | diesel | EP | A40BO003 Bomag BM1000-30 39.4 in planer, 280 hp | 45 | PM310 not in EP; same drum width |
| PV-MTV-8436 | — | 4.08 | 5.30* | diesel | derived | FEMA 8436: Cedarapids CR-MS-4 pickup (FEMA: to 120 hp) = 120 hp x 0.034 |  |  |
| PV-MTV-8437 | — | 4.08 | 5.30* | diesel | derived | FEMA 8437: Cedarapids CR MS-2 pickup (FEMA: to 120 hp) = 120 hp x 0.034 |  |  |
| PV-MTV-8438 | — | 6.80 | 8.84* | diesel | derived | FEMA 8438: Blaw Knox MC330 (FEMA: to 200 hp) = 200 hp x 0.034 |  |  |
| PV-MTV-8439 | — | 9.35 | 12.16* | diesel | derived | FEMA 8439: Roadtec MTV-1000C (FEMA: to 275 hp) = 275 hp x 0.034 |  | EP Roadtec SB-1500 MTV is 300 hp |
| PV-PAVER-COMM | — | 2.52 | 3.27* | diesel | EP | A30CA024 Cat AP300F paver 5.75-11.25 ft, 74 hp | 33 |  |
| PV-PAVER-P195 | — | 1.56 | 2.03* | diesel | EP | A30CA004 Cat AP255EQ paver 1.5-10 ft, 46 hp | 32 |  |
| PV-STRIPE-8441 | — | 0.50 | 0.65* | gas | derived | FEMA 8441: Graco LineLazer V 200DC (FEMA: to 6.5 hp) = 6.5 hp x 0.077 |  |  |
| PV-STRIPE-8442 | — | 1.00 | 1.30* | gas | derived | FEMA 8442: Graco LineLazer V 250DC (FEMA: to 13 hp) = 13 hp x 0.077 |  |  |
| PV-STRIPE-TRUCK | — | 1.46 | 1.90* | gas | derived | FEMA 8445: Graco RoadLazer RoadPak HD (FEMA: to 19 hp) = 19 hp x 0.077 |  | striping-system engine only; carrier truck separate |
| PV-SWEEPER-8158 | — | 8.06 | 10.48* | diesel | EP | B15EC003 Elgin Broom Bear 12 ft 4.5 CY, D-On 260 hp | 66 | FEMA 8158 Broom Bear Max is to 230 hp |
| TH-7K-44 | — | 3.10 | 4.10 | diesel | EP | L40CA036 Cat TL642D 6,500 lb x 42 ft, 100 hp | 399 |  |
| TR-FEMA-8650 | — | 0.62 | 0.82 | diesel | derived | FEMA 8650: Seaman-Parsons T20 trencher (FEMA 20 hp) = 20 hp x 0.031 |  |  |
| TR-FEMA-8651 | — | 1.80 | 2.38 | diesel | derived | FEMA 8651: Seaman-Parsons T500 trencher (FEMA 58 hp) = 58 hp x 0.031 |  |  |
| TR-FEMA-8652 | — | 3.35 | 4.43 | diesel | derived | FEMA 8652: New Holland B115B trencher/ditcher (FEMA 108 hp) = 108 hp x 0.031 |  |  |
| TR-FEMA-8653 | — | 8.80 | 11.64 | diesel | derived | FEMA 8653: New Holland T8.330 trencher/ditcher (FEMA 284 hp) = 284 hp x 0.031 |  |  |
| TR-WB-6x36 | — | 0.94 | 1.23 | gas | EP | T30DW021 Ditch Witch C16X 36 in walk-behind, Gas 16 hp | 608 |  |
| TRK-8735 | — | 5.10 | 6.60 | diesel | derived | FEMA 8735: Mack MD6 attenuator truck (FEMA 300 hp) = 300 hp x 0.017 |  | T50 0.02 (10-30k GVW) factor |
| TRK-8736 | — | 5.61 | 7.26 | diesel | EP | T50XX107 Rollback truck 25 ft bed, D-On 330 hp | 664 |  |
| TRK-8795 | — | 5.95 | 7.70 | diesel | EP | T50XX024 Truck 4x2 26k GVW, D-On 350 hp | 659 | FEMA 8795 is 25k GVW 380 hp |
| TRK-8840 | — | 5.10 | 6.60 | diesel | EP | T50XX035 Truck 4x2 26k GVW w/ Knapheide body, D-On 300 hp | 660 |  |
| TRK-8841 | — | 5.10 | 6.60 | diesel | EP | T50XX104 Fuel truck 2,000 gal 4x2, D-On 300 hp | 663 | FEMA 8841 lists gas |
| TRK-ATV-UTV | — | 0.70 | 0.90 | gas | derived | FEMA 8080: Polaris Ranger SP 570 (FEMA: up to 50 hp) = 50 hp x 0.014 |  | FEMA 8087 (up to 125 hp) gives 1.75 |
| TRK-FLAT-8700 | — | 3.40 | 4.40 | diesel | derived | FEMA 8700: Flatbed 4x2 15k GVW diesel (FEMA 200 hp) = 200 hp x 0.017 |  |  |
| TRK-FLAT-8701 | — | 8.80 | 11.28 | gas | derived | FEMA 8701: Flatbed 4x2 25k GVW gas (FEMA 275 hp) = 275 hp x 0.032 |  |  |
| TRK-FLAT-8701-1 | — | 5.95 | 7.70 | diesel | EP | T50XX024 Truck 4x2 26k GVW, D-On 350 hp | 659 |  |
| TRK-FLAT-8702 | — | 3.69 | 4.77 | diesel | derived | FEMA 8702: Flatbed 4x2 30k GVW diesel (FEMA 217 hp) = 217 hp x 0.017 |  |  |
| TRK-FLAT-8703 | — | 12.00 | 15.50 | diesel | EP | T50XX028 Truck 6x4 45k GVW, D-On 500 hp | 665 | FEMA 8703 is 380 hp |
| TRK-PU-8801 | — | 4.06 | 5.22 | gas | EP | T50XX001 Pickup 4x2 1/2 ton, Gas 290 hp | 648 |  |
| TRK-PU-8802 | — | 5.39 | 6.93 | gas | EP | T50XX003 Pickup 4x2 1 ton, Gas 385 hp | 649 |  |
| TRK-PU-8806 | — | 5.39 | 6.93 | gas | EP | T50XX002 Pickup 4x2 3/4 ton, Gas 385 hp | 648 |  |
| TRK-PU-8807 | — | 5.39 | 6.93 | gas | EP | T50XX011 Pickup 4x4 3/4 ton crew, Gas 385 hp | 653 |  |
| TRK-PU-8803 | — | 6.12 | 7.92 | diesel | derived | FEMA 8803: Pickup 4x2 1-1/4 ton conv diesel (FEMA 360 hp) = 360 hp x 0.017 |  | FEMA lists diesel, catalog says gas; T50 0.02 (over 10k GVW) factor assumed |
| TRK-PU-8804 | — | 5.27 | 6.82 | diesel | derived | FEMA 8804: Pickup 4x2 1-1/2 ton conv diesel (FEMA 310 hp) = 310 hp x 0.017 |  | as 8803 |
| TRK-PU-8805 | — | 6.12 | 7.92 | diesel | derived | FEMA 8805: Pickup 4x2 1-3/4 ton conv diesel (FEMA 360 hp) = 360 hp x 0.017 |  | as 8803 |
| TRK-PU-8809 | — | 11.52 | 14.76 | gas | derived | FEMA 8809: Pickup 4x4 1-1/4 ton crew gas (FEMA 360 hp) = 360 hp x 0.032 |  | T50 0.02 factor assumed |
| TRK-PU-8810 | — | 11.58 | 14.84 | gas | derived | FEMA 8810: Pickup 4x4 1-1/2 ton crew gas (FEMA 362 hp) = 362 hp x 0.032 |  | T50 0.02 factor assumed |
| TRK-PU-8811 | — | 11.58 | 14.84 | gas | derived | FEMA 8811: Pickup 4x4 1-3/4 ton crew gas (FEMA 362 hp) = 362 hp x 0.032 |  | T50 0.02 factor assumed |
| PV-DIST-550 | — | 0.50 | 0.64* | diesel | derived | FEMA 8580: LeeBoy L500 550 gal distributor (FEMA 16 hp) = 16 hp x 0.031 |  |  |
| PV-DIST-1000 | — | 1.18 | 1.53* | diesel | derived | FEMA 8581: 1000G distributor 1,000 gal (FEMA 38 hp) = 38 hp x 0.031 |  | FEMA 8583 4000 gal is PTO-driven (no own engine) |
| SC-651-44 | — | 18.24 | 23.27 | diesel | derived | FEMA 8522: Cat 651 scraper 44 yd (FEMA: to 629 hp) = 629 hp x 0.029 |  | EP S15 lists 621K/631K only |
| PV-CHIP-8425 | — | 0.00 | 0.00* | diesel | EP | A10PV001 Tailgate chip spreader 8 ft (no engine) | 1 | EP lists no engine and $0.00 fuel; truck fuel separate |
| TRK-TRAC-8789 | — | 5.95 | 7.70 | diesel | derived | FEMA 8789: Freightliner M2 106 4x2 tractor 26-33k (FEMA: to 350 hp) = 350 hp x 0.017 |  | T50 0.02 factor; 0.03 (over 30k) gives 8.40 |
| TRK-TRAC-8790 | — | 12.00 | 15.50 | diesel | EP | T50XX100 Truck 6x4 52k GVW day cab, D-On 500 hp | 668 | FEMA 8790 is to 450 hp |
| VAC-COMBO-8714 | — | 2.29 | 2.98* | diesel | derived | FEMA 8714: Combination sewer cleaner 800/400 gal (FEMA 74 hp) = 74 hp x 0.031 |  | FEMA hp is the auxiliary engine |
| VAC-TRAILER | — | 5.36 | 6.97* | diesel | EP | T57XX090 Hurricane 2350 CFM trailer vacuum, 173 hp | 680 |  |
| WELD-230 | — | 1.66 | 2.15* | gas | EP | W35XX021 Welder gas 225 A, Gas 23 hp | 698 |  |
| WELD-250 | — | 1.66 | 2.15* | gas | EP | W35XX022 Welder gas 250 A, Gas 23 hp | 698 |  |
| WELD-300 | — | 0.94 | 1.23* | diesel | EP | W35XX023 Welder diesel 325 A, 24.8 hp | 699 |  |
| WELD-600 | — | 1.86 | 2.42* | diesel | EP | W35XX025 Welder diesel 500 A, 49 hp | 699 | EP largest engine welder is 500 A |
| WIRE-8943 | — | 0.72 | 0.94* | gas | derived | FEMA 8943: Condux UD-50 puller (FEMA engine 8-10 hp) = 10 hp x 0.072 |  | engine-driven small-gas factor (W35 0.10 HPF 80); fuel type not stated |
| WT-2000 | — | 4.42 | 5.72 | diesel | EP | T50XX068 Water truck 2,000 gal 4x2, D-On 260 hp | 662 |  |
| WT-2500 | — | 5.53 | 7.15 | diesel | EP | T50XX067 Water truck 2,500 gal 4x2, D-On 325 hp | 661 |  |
| WT-6000-ADT | — | 12.62 | 16.69 | diesel | EP | T60KI002 Water truck 6,000 gal w/ Cat 621K, 407 hp | 681 |  |
| WT-9000-ADT | — | 12.62 | 16.69 | diesel | EP | T60KI003 Water truck 8,000 gal w/ Cat 621K, 407 hp | 682 | KT-100 10,000 gal (570 hp) gives 17.67 |
| WT-TANKER-4000 | — | 7.20 | 9.30 | diesel | EP | T50XX106 Water truck 4,000 gal 4x2, D-On 300 hp | 668 |  |
**Task A not found (84).** EP 2022 has no item close enough in type and size, and no FEMA hp is available:
AIR-130, AUG-8062 (TLB attachment, no own engine), AW-AB-RT-86, AW-BUCKET-80/100/120, AW-SC-RT-26/33/33BD/43, AW-SPIDER-34/51/60/69/77, AW-TB-66/120/125/135/150/185, AW-TOW-34/50, CN-PUMP-BOOM-46M/63M, CP-PNEU-SMALL, CR-AT-35T, CR-AT-HEAVY, CRAWLER-CARRIER, CR-HYD-210T/240T/275T-OP, CR-KNUCKLE, CR-KNUCKLE-LDR (FEMA 8208 gives no hp), CR-SPIDER, DM-SB-340, DM-UHD-330, DM-UHD-340, EX-LR-40T (EP has no Cat 340), EX-WHEEL-11T, DUMPER-3T/6T, FD-DRILL-KELLY, FD-HAMMER-AIR (air-powered, no engine), FD-HAMMER-HYD, FK-6K/11K/17K/45K, FK-IND-5K (EP has only rough-terrain diesel forklifts), GEN-1150/2000/2500/3000, GR-COMPACT, HTR-DF-400K/FA-175K/IND-400K/MUA-1M (no heaters in EP), LC-STUMP-26, PIPEBURST-50T/100T, PMP-SUB-2G, PV-DIST-4000 (FEMA 8583 is PTO-driven), SITE-DUSTCTRL and SITE-SANDBAGGER (FEMA 8569/8872 give no hp), all 12 TH-* except TH-7K-44, TRK-8734 (trailer TMA, no engine), VAC-COMBO-8714-2/-3, VAC-HYDROVAC (FEMA 8715 hp N/A), WELD-800, WIRE-8944 (FEMA gives no hp).

## Task B: hourly rates

All EP figures are from the 2022 schedule. Each is **excluding operator**, because EP never includes labor. "Excl. fuel" means the total hourly rate minus the Fuel column; FOG stays in. Each figure is in $/hr at average condition.

| Class | Public contract (WA DES 22823) day / week / month | EP Region 7 item (TEV 7/1/2019) | Ownership (Depr + FCCM) | Operating excl. fuel (FOG, tire wear, tire repair, repair) | Fuel $/hr (gal/hr) | **Total excl. fuel** | Total incl. fuel | Region 8 total, excl. fuel | FEMA 2025 $/hr (incl. fuel) |
|---|---|---|---|---|---|---|---|---|---|
| PV-STABILIZER-WR2400 | none listed | S40CA004 Cat RM-500B LR, 546 hp, $644,419, p.574 | 53.44 (49.88 + 3.56) | 86.15 (12.19, 5.22, 0.89, 67.85) | 89.85 (18.56) | **139.59** | 229.44; severe 308.94 | 218.36, 130.92 | 8636 Wirtgen WR2400, 563 hp: 492.02 |
| LC-GRIND-8621 tub grinder | none | not in EP | — | — | derived 17.89 gal (577 hp x 0.031) | not found in EP | — | — | 8621 Morbark 1000, to 577 hp: **165.82** |
| Spreader truck, dry lime/cement (new) | none | not in EP | — | — | — | not found | — | — | only 8458 chemical spreader body, 5 CY, to 4 hp: 6.47 (not this class) |
| Chainsaw, pro gas (new) | **United: 18 in $81 / $224 / $563.82; 20 in $76 / $226 / $662.43** (sheet "Additional Equipment") | C05S7001 Stihl MS241 18 in, Gas 3.1 hp, $595, p.104 | 0.27 | 1.16 (0.19, 0, 0, 0.97) | 1.25 (0.25) | **1.44** | 2.69 | 2.48, 1.32 | 8187 20 in to 3 hp: 3.23; 8191 25 in to 9 hp: 4.81 |
| (chainsaw, larger) | | C05S7002 MS362 25 in, 4.6 hp, p.104 | — | — | 1.85 (0.37) | 1.97 | 3.82 | — | |
| PV-STRIPE-8440 walk-behind single gun | none | L25JE003 HRL-1 1-gun self-propelled, Gas 5.5 hp, $5,759, p.354 | 0.61 (0.58 + 0.03) | 1.37 (0.24, 0, 0, 1.13) | 2.10 (0.42) | **1.99** | 4.09 | 3.81, 1.85 | 8440 LineLazer 3400, to 5 hp: 14.75 |
| CN-CURB-MACHINE | none | C45GO013 Gomaco GT-3200 curb/gutter, 92 hp, $253,185, p.140 | 35.25 (33.76 + 1.49) | 60.42 (2.17, 0, 0, 58.25) | 16.03 (3.31) | **95.68** | 111.71 | 104.98, 89.38 | none |
| PV-DIST-2000 | only 250 and 500 gal tack tanks | A25XX002 2000 gal, truck mtd incl. 32k GVW truck, D-On 270 hp, $195,254, p.26 | 29.69 (28.60 + 1.09) | 45.21 (6.57, 1.08, 0.18, 37.38) | 48.46 (8.37) | **74.90** | 123.36 | 117.36, 70.24 | 8582 2000G (PTO): 32.92 |
| PV-SWEEPER-TRUCK | **Owen: Elgin Broom Bear $1,800 / $4,750 / $14,000; Elgin Crosswind regen-air $1,600 / $4,500 / $13,500**; EnviroClean Schwarze A7 120 in $1,760 / $4,400 / $11,000 | B15EC002 Elgin Pelican P 10 ft 3.5 CY, D-On 74 hp, $208,870, p.66 | 24.30 (23.19 + 1.11) | 29.55 (1.80, 0.60, 0.10, 27.05) | 13.28 (2.29) | **53.86** | 67.14 | 63.64, 50.72 | 8157 Pelican: 100.34; 8158 Broom Bear: 123.69 |
| (sweeper, truck type) | | B15EC003 Elgin Broom Bear 12 ft 4.5 CY, D-On 260 hp | — | — | 46.67 (8.06) | 93.21 | 139.88 | — | |
| SC-631-34 | none | S15CA002 Cat 631K 34 CY, 570 hp, $922,098, p.538 | 51.02 (46.09 + 4.93) | 99.96 (12.40, 24.05, 4.11, 59.40) | 80.01 (16.53) | **150.98** | 230.99 | 220.62, 142.76 | 8521 Cat 631: 341.78 |
| SITE-GPS-BASE | **PapeMachinery: base + rover with rod, bipod, tripod $400 / $1,000 / $3,000**; Modern: Topcon HyperVR base + rover $750 / $1,500 / $4,500; Pape single rover $200 / $500 / $1,500 | not in EP | — | — | none | — | — | — | none |
| TRK-PU-8808 | **United: TRUCK PICKUP 1 TON 4X4 CREW CAB $267 / $706 / $1,872.61** | T50XX021 1-ton crew 4x2 diesel, D-On 475 hp, $49,154, p.657 (EP has no 4x4 1-ton crew diesel) | 5.03 (4.75 + 0.28) | 7.89 (2.24, 0.40, 0.07, 5.18) | 19.25 (3.33) | **12.92** | 32.17 | 30.89, 12.17 | 8808 4x4 1-ton crew dsl 340 hp: 31.54 |

### Notes on Task B

- **Arithmetic check.** In every row, total = ownership + operating excl. fuel + fuel, within $0.01. Total excl. fuel = total − fuel.
- **Region 7 vs Region 8.** Region 7 runs about 4 to 9% above Region 8 on these items.
- **Severe condition.** Where EP publishes a severe row, the total is higher: the stabilizer is $308.94/hr.
- **Stabilizer.** EP has no Wirtgen. The Cat RM-500B (546 hp) is the closest stabilizer/reclaimer. FEMA lists the WR2400 at 563 hp.
- **Spreader truck size.** No source opened here gives a size for a dry lime/cement spreader truck, so none is proposed.
- **Contract rates.** WA DES 22823 rates are rental, not hourly. The month column is as listed ("Per Month"), not a 4-week rate.

## Task B: not found

- Tub grinder in EP and in WA DES. FEMA 8621 has it.
- Dry lime/cement spreader truck in EP, WA DES and FEMA.
- GPS base + rover in EP. WA DES has it.
- Contract rates for the stabilizer, curb machine, 2,000 gal distributor, scraper and striper in WA DES. The NY OGS 23182 lists checked had none usable.
