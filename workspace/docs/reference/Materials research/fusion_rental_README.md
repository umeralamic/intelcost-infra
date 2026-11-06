# Butt-fusion machine rental rates (research 2026-10-31)

Files: `fusion_rental_points.csv` (39 rows; same columns as the materials research points.csv).

## Proposed catalog classes (TracStar = self-contained diesel power, no generator line)

| Class | Machine | Pipe range | Day | Week | Month | Weight (lb) |
|---|---|---|---|---|---|---|
| fusion_tracstar_8 | McElroy T28 TracStar | 2" IPS – 8" DIPS | $200 | $1,000 | $3,300 | — |
| fusion_tracstar_12 | McElroy T412 TracStar | 4" IPS – 12" DIPS | $275 | $1,300 | $4,400 | 2,200 |
| fusion_tracstar_18 | McElroy T618 TracStar | 6" IPS – 18" IPS | $375 | $1,800 | $6,200 | 3,000 |
| fusion_tracstar_24 | McElroy T630 TracStar | 8" IPS – 24" OD | $700 | $3,300 | $11,000 | — |
| fusion_tracstar_36 | McElroy T900 TracStar | 12" IPS – 36" OD | $900 | $4,200 | $13,000 | 10,830 |
| fusion_rolling_48 | McElroy #1648 Rolling (+ generator) | 16" IPS – 48" IPS | $1,200 | $5,000 | $18,000 | — |
| over 48" | MegaMc 2065 | 20" – 65" OD | no published rate: Missing price | | | |

Alternatives stored, not default: #28 Rolling $150/$700/$2,400 (needs electricity), #412 Rolling $225/$1,100/$3,800, #618 Rolling $325/$1,600/$5,000, #824 Rolling $600/$2,800/$9,000, #1236 Rolling $750/$3,500/$12,000, #26 Pit Bull manual (to 6") $125/$600/$1,900.

Rates: The Fusion Company (J&J Fusion), Colorado (by area code; no street address on its site), published per-model rental pages, undated, read 2026-10-31. Weights: Industrial Sales (KS/NE) rate schedule effective 2025-06-16, which publishes no prices.

## Corroboration (ranges only, not loaded)

- McElroy press room: $275/day fusion machine on a 12" job (matches T412), fusion operator $480/day.
- IMSCO (LA): mid-range hydraulic machine $350–600/day (618–824 class).
- Coastal Rental Group (TX): machines to 12" $100–500/day; over 12" "often $1,000 or more".

Grade: C (one full published rate card, corroborated by three published ranges in OK, LA, TX). Rental houses only; no Ferguson, no cost-data publishers. White River Conservation District ($50/day, 1–4") excluded: a subsidised district rental.

## Rental terms seen (Industrial Sales schedule)

Daily excludes Sundays and holidays; week = 7 consecutive work days, month = 30. Inserts and pipe stands included. Freight both ways paid by the renter (F.O.B. ship point). Training technician billed per person per day for select units; cleaning and damage charges extra. Not in the rates above.

## Fusion cycle check (McElroy published joints per 10-hour day, "existing method")

4–8" IPS: 24–48 joints. 10–18": 12–24. 20–24": 10–16.

CC's cycle (15.5 min per inch of wall) plus setup of **10 min to 8", 15 min for 10–18", 20 min for 20–24"** lands inside every band for DR11 and DR17 (e.g. 8" DR11 27/day, 12" DR11 18/day, 24" DR11 11/day). A 10/15 split at 12" overshoots McElroy's maximum for thin-wall 10–12" and 20".
