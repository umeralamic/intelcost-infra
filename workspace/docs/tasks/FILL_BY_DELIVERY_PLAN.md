# Fill by delivery, site-driven methods and undercuts: plan

Dated 2026-10-30. Built so far: problems 1–3 (D-896), Block 4 (D-899). Decisions are not logged until the questions in section 12 are answered.

**How the figures were taken.** The 3D test copy was read only and copied with `drives/copy-3d-test.py` into a throwaway workspace ("zz Fill
Plan"; the original's row counts and latest update were equal before and after), since D-881 and D-891 put its workspace out of a browser's
reach. Calculate and the estimate ran on that copy; each Place and compact spread was changed on the throwaway's own tier 4 (D-738's
tiers) and priced by the real engine, then the copy was purged.

**Two limits on every price here.** The throwaway has national rates and the default wage set, not Bench Construction Test's: its trucks
total is $751,201.70, not the $943,321.80 in D-806. Compare methods with each other, not with an earlier bid. Prices marked **hand** are this
plan's arithmetic on the engine's unit costs, with no tier change or mob effect. Everything else is the engine's own figure.

---

## 1. Today

**The choice.** Calculate's "How cut reaches fill" is `site_choices.method` (`excavator`, `dozer`, `scraper`), with `push_ft` 100, 200 or 300 and
`method_by_feature`, stored in `earthwork_assumptions.site_choices` (D-806; `lib/takeoff/earthwork/lines.ts:67`).

**The path.** The method changes only the cut line's role: `cut` to A1, `cut_push` to A14, `cut_scraper` to A15 (`ew_line_map`, resolved by
`_activity_for_role`, `equipment/production.py:944`). `fill`, `undercut_native`, `undercut_replace` and `replacement_fill` are always A3. Hence the
dialog's sentence "Fill is placed and compacted whatever the method". The method touches region cut only; undercut and rock roles ignore it.

**What Place and compact (A3) carries**, starter release 5:

| Tier | CCY/day | Spreading (paces first) | Compaction | Water | Crew besides operators |
|---|---|---|---|---|---|
| 1 | 200–329 | D3 | 84 in roller | WT-4000 × 0.25 | Foreman 0.25 |
| 2 | 330–599 | D5 | 84 in roller | WT-4000 × 0.5 | Foreman 0.5 |
| 3 | 600–849 | D6 | 84 in roller | WT-4000 × 0.5 | Foreman 0.5, Laborer 0.5 |
| 4 | 850–1,299 | D6, GPS, D5 | 84 in roller | WT-4000 × 0.5 | Foreman 0.5, Laborer 0.5 |
| 5 | 1,300–1,999 | D6, GPS | 815 compactor | WT-4000 × 0.5 | Foreman 0.5, Laborer 2 |
| 6 | 2,000–2,999 | D6, GPS, 2 × D5 | 815 | WT-4000 × 1 | Foreman 0.5, Grade checker 0.5 |
| 7 | 3,000–5,999 | 2 × D6, 2 × GPS, 0.5 D8, 0.5 D5 | 2 × 815 | WT-8000-ADT × 1 (optional) | Foreman 0.5, Grade checker 0.5 |
| 8 | 6,000+ | 2 × D8, D6, GPS | 2 × 825 | WT-8000-ADT × 2 (optional) | Foreman 1, Grade checker 1 |

The double count is real on both alternatives. A14's note is a push to fill. A15's own note reads "load, haul and **spread** cut on fill".

## 2. Proposed: three fill spreads

Fill gets three activities, or three tier sets on A3 (question 2). Roller and water truck are the same in all three: compaction is the same work.

| Delivery | Spreading | Roller, water | Source for the shape |
|---|---|---|---|
| Trucks | Today's dozers | As today | FM 5-434 ¶11-31: fill placed "with a scraper or a dump truck and spread with a dozer or grader" |
| Dozer push | One levelling dozer, a size below today's first: D3 to tier 3, D5 on tiers 4–6, D6 on 7, D8 on 8; no GPS unless asked | As today | Section 5 |
| Scraper | The same levelling dozer, or a grader, | As today, water truck units doubled for the haul road (question 5) | FM ¶3-68: scrapers spread as they dump, the bowl set to lift height |

**No published ratio of levelling dozers to scrapers, or water trucks to a haul road, was found.** The doubled water truck is this plan's starting
point, shown as such; question 5 asks for the founder's figure.

Sizes for tiers other than tier 4 are proposals; only tier 4 was priced, because this job sits on it (900 CCY/day).

## 3. Mixed sites

Fill is priced by the share each method delivers, never one choice for the site. **Recommended: computed from the cut lines' own methods, with a typed
override.** A share is CCY delivered by that method over the fill: bank cut ÷ the layer's shrink for cut, the rest being import, which always comes
by truck.

On the 3D test copy this matters more than anything else in the plan. Fill is 9,514 CCY. Native soil cut 5,575 BCY ÷ 1.10 shrink delivers 5,068 CCY,
**53 %**; the other **47 %** is import, trucked whatever the cut does. Pricing the whole fill at the push spread would undercount.

## 4. Dozer push: spreading counted once

**What the rate assumes.** The catalog's `EW-PUSH` is the Cat dozer cycle at 100 ft, 200 ft and 300 ft: cut, then drift. Caterpillar's curves assume a
50 ft cut, then drifting "to dump over a high wall" (Performance Handbook 49, p.19-58; FM 5-434 ¶2-38). So it is push-to-pile, with no spreading in
lifts.

**Recommended rule: keep a small levelling dozer on the fill; leave the push rate alone.** Lowering the rate needs a spread-to-bulk ratio, and **none
is published** (none found in CPH 49 or FM 5-434), so that option would need an invented factor. The levelling dozer is a visible machine a person
can change, and it follows the fill's quantity whether or not a person trusts the push.

## 5. Site figures (section A): what Calculate knows

"Exists" means stored in `earthwork_result`. "Computable" means from the prisms, which are recomputed in the browser and not stored. A
region today is a Site Feature or the Remainder, never a connected pocket; pocket-finding is new work, done here for this plan on the prisms.

| Figure | Today | Where |
|---|---|---|
| Haul distance, centroids | Computable. No distance exists anywhere; `push_ft` is typed | Prism corners, `volume/stats.ts:78` |
| Mass-haul balance | Missing | `balance.ts` is volume only |
| Grade cut to fill | Computable; stored proxies `avgEgFt`, `avgFgFt` | Prisms |
| Cut depth, average, deepest | Exists per region | `RegionStats.cut`, `stats.ts:28` |
| Thin and wide or deep and concentrated | Area exists; shape computable | Depth bands `volume/bands.ts:54`; pockets missing |
| Side slopes in the cut | Computable | Prism gradient, as `steepPart` (`export/surfaces.ts:1059`) |
| Rock inside the cut | Volumes exist by region and layer; elevations computable | `cutByLayer`, `geotech/materials.ts:76`; layer surfaces not stored |

**The 3D test copy, C-200**, measured with the real engine (25,919 prisms; distance centroid to centroid, grade on existing ground):

| Pocket | CY | Acres | Avg ft | Deepest ft | EG slope median | Slope, top 10 % | To the fill | Grade |
|---|---|---|---|---|---|---|---|---|
| **Hill** (east) | 8,990 | 1.09 | 5.13 | 14.1 | 15.9 % | 30.5 % | 181 ft | 5.8 % down |
| **Broad cut** (north) | 2,565 | 0.97 | 1.64 | 6.2 | 5.5 % | 7.5 % | 176 ft | 3.6 % down |
| Site total | 11,588 | 2.10 | 3.42 | 14.1 | 7.6 % | 28.6 % | 112 ft | 8.5 % down |

- The fill is one pocket: 9,467 of 9,514 CY, 2.06 acres, 2.85 ft average, 6.5 ft deepest.
- Hill against broad cut is the case in the brief: one small and high at 5.1 ft average, one wide and shallow at 1.6 ft.
- Only 2–4 % of the cut's area is steeper than 33 %.
- Rock: Layer 3 (hard dig, marked unsuitable), 4,107 BCY in the Remainder region against 2,535 BCY of soil. The bores are stored as planned, so these
  are layer surfaces, not logged rock. The founder's 704–706 figure was not re-derived, because layer surfaces are not stored.
- **Centroid distance flatters a site-wide figure.** 112 ft site-wide against 176–181 per pocket: suggest per pocket, never from the whole site.

## 6. Production and method from the site (section B)

**Sources read in full:** Caterpillar Performance Handbook Ed. 49, SEBD0351-49, 2019 ("CPH 49"); FM 5-434 Earthmoving Operations, 15 Jun 2000.

**Dozer grade correction.** Both are charts with no printed table; these values were read off the curves, ±0.02.

| Grade % | -30 | -20 | -10 | 0 | +10 | +20 | +30 |
|---|---|---|---|---|---|---|---|
| CPH 49 p.19-63 | 1.58 | 1.41 | 1.21 | 1.00 | 0.79 | 0.55 | 0.28 |
| FM 5-434 Fig 2-15 p.2-20 | 1.26 | 1.22 | 1.14 | 0.99 | 0.85 | 0.65 | 0.43 |

Calibration: CPH prints 1.30 at -15 % (read 1.32); FM prints 1.15 at -10 % (read 1.14). The two differ materially. **Recommended: CPH 49, the newer, as
a workspace-editable table.**

**Truck and scraper grade.** No generic table exists. Effective grade = rolling resistance + grade, 20 lb/ton = 1 % (CPH 49 p.24-15, p.28-6), read
through each model's rimpull curves. Rolling resistance by surface, CPH 49 p.30-2: stabilized and watered 2.0 %, firm 3.0 %, rutted 1 in 4 %, 2 in 5 %, 4 in
8 %, loose sand or gravel 10 %. Fixed times: scraper load 0.4–0.6 min pushed, 0.9 self; maneuver and spread 0.6–0.7 min (p.24-17). The catalog has one
cycle at a level haul. **Recommended: adjust travel time only, by the catalog's own cycle equation with effective grade, and say so on the line**;
per-model rimpull curves are not in the catalog.

**Push distance.** From section 5, per pocket, linear between the catalog's rates. D8 LCY/hr: 684 at 100 ft, 354 at 200 ft, 239 at 300 ft. At 181 ft: 417,
factor 0.61. Past 300 ft there is no catalog rate, so the push is not suggested.

**Suggested method, per cut pocket and band.**

| Test | Suggestion | Source |
|---|---|---|
| Rock band | Rip when velocity under about 5–7k ft/s, else excavator and break | FM Fig 2-16, 300 hp dozer, chart-read; CPH 49 p.19-86. Velocity is "only one indicator" (p.19-85) |
| Haul ≤ 300 ft | Dozer push | Catalog's range. FM ¶2-23's 50–300 ft is a technique range; **no published economic limit found** |
| 300–3,000 ft | Scraper (to 5,000 ft for large) | FM ¶3-48, p.3-2 |
| Beyond, or the material leaves | Excavator and trucks | **No published lower bound** for trucks; the remainder of the rule |

No source gives a trucks-or-scraper boundary by depth. Depth does not enter the rule; it enters the suggestion's words, and the person decides.

## 7. More than one method inside a cut (section C)

A cut pocket splits by band, each with its own method: soil above, rock below. Rock is priced as rock whatever is above it. That already holds: rock
roles ignore the method, so the change is to carry a method per band in the soil lines.

**Steep sides.** FM ¶2-16/17: start at the top of the hill, on a bench several dozer lengths long, then widen and deepen; winch on extremely
steep slopes. **No published side-hill or bench production factor was found, and no numeric dozer side-slope limit** (CPH's 45° and 25° are
lubrication limits, not stability). So the plan adds no factor: a pocket with more than a set share over a set slope gets a note and asks for
confirmation, and the method stays the person's call (question 11). The grade correction already rewards working downhill.

**Worked example, the hill.** Soil 2,535 BCY pushed 181 ft at 5.8 % down; rock 4,107 BCY under it. These two figures are the Remainder region's, the
nearest stored split: splitting soil and rock by pocket is Block 3 and 6's work, so the hill's own bands will differ.

| Band | Today, trucks | Split | Basis |
|---|---|---|---|
| Soil, 2,535 BCY | $36,276 at $14.31 | ≈ $11,300 at $4.47 | hand: $3.04 ÷ (0.61 × 1.12) |
| Rock, 4,107 BCY | $205,267 at $49.98 | $205,267, unchanged | Rock lines |

The grade factor is CPH's, 1.00 to 1.21 interpolated at 5.8 %.

## 8. Undercuts (section D)

**Today.**

| Role | Line | Activity | Machines |
|---|---|---|---|
| `undercut` | Undercut excavation, BCY | A2 | Excavator, 20–50 t |
| `undercut_haul` | Undercut spoil, haul off, LCY | A7 | Hired tri-axles |
| `undercut_replace`, `replacement_fill` | Replacement fill, CCY | A3 | Dozer, roller, water truck |
| `undercut_native` ("T5 Native undercut, recompacted", a fixture name) | CY | A3 only | Dozer, roller, water; **no digging machine** |
| `over_excavation` | BCY | A1 | Excavator and ADTs |
| `undercut_stabilize` + `_mix` | Parent, mix | none, by hand | None |
| `undercut_agent_1/2` | TON | none | **Agent quantity, no price** |
| `undercut_stockpile`, `undercut_reuse_fill` | | no map row | None |
| `stabilize`, `stabilize_mix` | | none; "usually subcontracted" | None |
| `geosynthetics` | SY | none, by hand | Feature outline, not the undercut's bottom |

- **Tipping fees do not exist;** planned in M5 (`materials_tasks.md`, D-857/858).
- **Proof roll:** no line. **Dewatering:** utilities only.
- **Undercut volume is existing ground only** (`undercut.ts`, D-528): the 3D copy's 4 ft Building Pad, 14,831 SF but mostly in fill, reads 146 BCY.

**Problems found on the way, all real today:**
1. `undercut_native` has no excavator, so a native undercut prices no digging.
2. `over_excavation` on A1 brings ADTs, and `undercut_haul` adds A7: the double payment A2's own note warns of.
3. `undercut_spoil` = Re-use writes no line and is not added to the balance: that soil disappears.
4. `surplus.undercut_spoil` is read only on the over-excavation path; a simple undercut uses `undercut_disposition`.
5. `method_by_feature` is project-wide, but the dialog keeps only the open sheet's features: saving from sheet B drops sheet A's.
6. Site Calculate passes no soil, so undercuts to a layer do not resolve there.

**Excavation method by depth and shape** (this replaces "always an excavator").

| Case | Method |
|---|---|
| Shallow and wide | Dozer push to stockpile, or scraper on large areas; loader into trucks when it leaves; excavator for small or confined |
| Deep or confined | Excavator and trucks |
| Treated in place | No excavation |

**What the tool knows per undercut:** depth, area, plan outline, and the feature's name. It holds no shape class (pad, pavement, footing strip). Width is
computable from the outline (area ÷ longest side). So it **can** tell shallow from deep and wide from narrow, and cannot tell a pad from a pavement
except by name.

**Switch points.** Workspace settings, shown for confirm or change as in section 10. **No published depth or area switch was found.** FM and CPH give
none, so this plan will not state one as sourced. Starting values are the founder's own brief, labelled so: shallow to 2 ft, deep from 3 ft. Between,
and for area, the suggestion is left to the person until question 15 gives a value.

**Dispositions**, one per undercut, today's option as the default:

| | Disposition | Lines | Today's option |
|---|---|---|---|
| a | Treated and put back | Excavate, stockpile, mix, re-place, compact; agent as material | Native, stabilized |
| b | Hauled off site | Excavate and load, trucks, tipping fee as material | Haul off |
| c | Spoiled on site | Load, trucks or ADT to the spoil area, dozer spread, light or no compaction; where and how far | Waste on site |
| d | Reused as fill elsewhere | Joins the balance as cut (fixes problem 3) | Re-use |
| e | **Treat in place** | No excavation: spreader, reclaimer/mixer, grader, roller, water truck; agent as material. **Maps to the existing `stabilize` lines and agents, not to an undercut** | Prep, Stabilize |

**Refilling:** imported, select or treated, placed and compacted (A3 at the truck spread, since refill is delivered), with the material.

**Bottom of the hole.** Proof roll and geotextile where specified: ODOT CMS 204.06 (35-ton roller on A-3, A-4, A-6, A-7-6 soils, one trip) and 204.07
(geotextile at the bottom of cut, 18 in overlap, no equipment directly on the fabric), as example language. Geotextile moves to the undercut's own area.
Dewatering when the bottom is below the water table from the bores.

**Prepare subgrade and a shallow undercut stay apart.** Today they are separate lines on the same outline, so the same top foot can be priced as dug
out and as scarified. **Rule: where an undercut exists on a feature, prep applies at the bottom of the undercut and only there.** Scarify and recompact
is then blocked for the undercut's area (nothing is left to scarify at the original level), and offered as proof roll. Where the area is partial,
prep counts the rest of the feature. Same rule for disposition e: treating in place is the prep.

## 9. The order of questions (section E)

Volumes do not depend on the method. `earthworkLines` is pure over the stored result, so lines can be rebuilt without volumes; `linesFor` already does
this for the panel. The missing piece is a save path: today only `calculate()` writes lines, and `site_choices` is in the version key, so a method
change would mark the result stale until that is split (Block 4).

**Calculate's window.**

```
How cut reaches fill
 (•) Auto: suggest from the site           after the surfaces are read
 ( ) Excavator and trucks
 ( ) Dozer push      Average push [from the site ▾]
 ( ) Scraper
 Fill is priced by how it is delivered: each method's share of the fill.
```

**Results: method rows.**

```
METHODS                                                   Suggested, not applied
Area          Band        Method                Why                    Cut BCY
Hill          Soil        Dozer push ▾          181 ft, 5.8 % downhill   2,535  [Confirm] [Change]
Hill          Rock        Excavator, trucks ▾   Layer 3, hard dig        4,107  [Confirm] [Change]
Broad cut     Soil        Dozer push ▾          176 ft, 3.6 % downhill   2,565  [Confirm] [Change]
 ! Hill: steep sides, 4 % of the area over 33 %. Work from the top in benches.
Fill: 53 % pushed, 47 % imported by truck                       [Edit shares]
```

**Results: undercut rows.**

```
UNDERCUTS                                               Today's choice is the default
Area            Depth  Area SF  BCY  Dig                 Goes                Refill
Building Pad    4 ft   14,831   146  Excavator, trucks ▾ Hauled off site ▾   Structural Fill ▾
Pavement        1.5 ft 20,432 1,135  Dozer push ▾        Hauled off site ▾   Select Fill ▾
 Suggested from depth 1.5 ft and width. [Confirm] [Change]
 Bottom: [ ] Proof roll  [ ] Geotextile       Water table: below the bottom
```

**Rules.** Never applied silently. Confirming or changing re-prices only the affected lines; volumes are not recalculated. A later Calculate keeps a
person's choices unless that area or undercut itself changed, and says so:

```
 ! Hill changed since you chose: 8,990 CY was 8,410. Your Dozer push is kept. [Review]
```

A pocket's identity across Calculates is by overlap with its last footprint (question 13).

## 10. Price comparison

**Engine figures**, on the DUP, unchanged lines left out (rock $309,485, strip, export):

| Case | Cut, 5,575 BCY | Fill, 9,514 CCY | Cut + fill | Full estimate |
|---|---|---|---|---|
| **Trucks, today** | $79,770 | $107,248 | **$187,018** | $751,202 |
| Push 100 ft, today's fill | $16,966 | $107,248 | $124,214 | $688,398 |
| Push 200 ft, today's fill | $13,524 | $107,248 | $120,772 | $684,955 |
| Scraper, today's fill | $17,814 | $107,248 | $125,062 | $689,245 |
| Push 100 ft, fill with levelling D5 | $16,966 | $69,475 | $86,441 | $649,925 |
| Push 100 ft, fill with no dozer | $16,966 | $42,047 | $59,014 | $621,989 |
| Scraper, levelling D5, water × 2 | $17,814 | $80,680 | $98,494 | $662,185 |
| Scraper, grader, water × 2 | $17,814 | $80,726 | $98,540 | $662,232 |

Run again on trucks at the end: the same $751,201.70.

**The fill line alone, by method:** trucks $107,248; push $69,475 (or $42,047 with no dozer); scraper $80,680.

**Those fill figures treat the whole fill as one method. On this job only 53 % is delivered by the cut** (section 3), so **hand**:

| Case | Cut | Fill by share | Cut + fill |
|---|---|---|---|
| Push, 53 % levelling, 47 % truck spread | $16,966 | $87,115 | $104,081 |
| Scraper, 53 % levelling, 47 % truck spread | $17,814 | $93,087 | $110,901 |
| Push corrected to 181 ft, 5.8 % down (0.61 × 1.12 = 0.68) | ≈ $24,900 | $87,115 | ≈ $112,000 |

So the correction asked for moves this job's cut and fill from $124,214 to about **$112,000 on push**, not to the $86,441 the first table suggests.

**One figure to read carefully:** a 200 ft push prices *cheaper* than 100 ft ($13,524 against $16,966). The factor slows production to about 1,560/day,
which drops to A14's tier 1, a D6, from a D8. Tier selection by slowed production is a defect of the method, independent of this plan (question 12).

**Undercuts.** The cut methods do not reach undercuts in the engine, so these are **hand**, at this DUP's unit costs: A2 excavator $20.76/BCY, A14
$3.04/BCY, A15 $3.20/BCY, A7 haul off $8.16/LCY, A6 loader with trucks $11.54/LCY, swell 1.30. Refill is the same in each.

*1.5 ft pavement undercut, Heavy Duty Asphalt Pavement, 20,432 SF: 1,135 BCY, 1,476 LCY.*

| Method | Dig | Leaves site | Total |
|---|---|---|---|
| **Suggested: dozer to stockpile, loader into trucks** | $3,451 | $17,033 | **$20,484** |
| Excavator, trucks | $23,563 | $12,044 | $35,607 |
| Scraper to a spoil area on site | $3,632 | none | $3,632, plus spreading |

*4 ft pad undercut, Building Pad, whole footprint as a what-if: 14,831 SF, 2,197 BCY, 2,856 LCY.* The stored line is 146 BCY, existing ground only.

| Method | Dig | Leaves site | Total |
|---|---|---|---|
| **Suggested: excavator, trucks** | $45,610 | $23,305 | **$68,915** |
| Dozer to stockpile, loader (not suggested: deep) | $6,679 | $32,958 | $39,637 |

Dozer methods price well below an excavator on both, so a suggestion must never be read as the cheapest: the pad's case is about reach and confinement.

**Treat in place, disposition e:** no price. `stabilize` lines have no activity or machines today ("usually subcontracted"), so the engine has nothing
to price and this plan will not invent a rate.

## 11. Blocks

| Block | Content | Days |
|---|---|---|
| 1 | Fill spreads: three spreads by delivery, starter release 6, line map | 2 |
| 2 | Fill shares: from the cut lines, import as trucks, typed override | 2 |
| 3 | Site figures: pockets, centroids, grade, slopes, bands, stored with the result | 3 |
| 4 | Pricing split from volumes: a save path that rebuilds lines only; `site_choices` out of the version key | 2 |
| 5 | Production: grade table, interpolated push, cycle by effective grade | 2 |
| 6 | Suggestions: the rule, settings, per pocket and band; soil and rock bands in lines | 3 |
| 7 | Results UI: Auto, method rows, undercut rows, confirm and change, kept choices, the "changed" note | 3 |
| 8 | Undercuts: methods by depth and shape, five dispositions, refill, the six problems in section 8 | 4 |
| 9 | Prep against undercut, proof roll, geotextile on the undercut, dewatering from bores | 2 |
| 10 | Report, export, metric, gates, smoke, the release fixtures | 2 |

**25 days.** Block 4 first: 7 and 8 stand on it. Tipping fees wait for M5 (D-857/858): disposition b holds the line until then.

## 12. Numbered questions

Each has a recommended answer.

1. **Fill spreads: shape.** Sizes in section 2? **Yes;** only tier 4 was priced.
2. **Three activities or one with three tier sets?** **Three activities** (A3 trucks stays; A16 push fill, A17 scraper fill): the map, the site spread and a company's edits all work per activity already.
3. **Shares.** From the cut lines' methods, with a typed override? **Yes.**
4. **Push spreading.** Levelling dozer on the fill, push rate unchanged? **Yes;** lowering the rate needs an unpublished ratio.
5. **Haul-road water and levelling per scraper.** Double the water truck on scraper fill? **Yes as a starting point,** marked as not published; please give your own figure.
6. **Grade table.** CPH 49 or FM 5-434? **CPH 49,** editable per workspace. Both are chart readings.
7. **Grade on the haul.** Existing ground, or the average of existing and proposed? **Existing,** as here: the machine runs on what is there at the start of the cut. Your call.
8. **Truck and scraper grade.** Effective grade in the catalog's cycle, not per-model rimpull? **Yes.**
9. **Method limits.** Push to 300 ft, scraper 300–3,000 (5,000 large), else trucks? **Yes.** The 300 ft is the catalog's range, not a published limit.
10. **Rock.** Excavator and break by default, ripping offered? **Yes,** no seismic data on most jobs.
11. **Steep sides.** A note and a confirmation, no production factor, since none is published? **Yes.** Which slope and share? The plan shows 33 % and any share until you set one.
12. **Tier by slowed production.** Choose the tier from the unslowed rate, so a longer push cannot cost less? **Yes.**
13. **Pocket identity.** Keep a choice by overlap with the last footprint, at more than half? **Yes.**
14. **Undercut volume.** Keep existing ground only (D-528)? **Yes,** and say it in the row, so a 146 BCY pad is not a surprise.
15. **Undercut switch points.** No published figure exists. Start at your 2 ft and 3 ft? **Yes.** Area: please give a value, or leave it to the person.
16. **Treat in place pricing.** Give `stabilize` an activity with spreader, reclaimer, grader, roller and water truck, or leave it subcontracted? **An activity, draft:** the agent as material stays either way. The catalog must be checked for a reclaimer class first.
17. **Prep under an undercut.** Prep moves to the bottom, scarify blocked on that area, proof roll offered? **Yes.**
18. **Spoiled on site: where and how far.** Typed, or a drawn spoil area? **Typed first;** a drawn area later.
19. **The six problems in section 8.** Fix them in Block 8, each with its own decision? **Yes.** Problem 2 changes prices on existing projects.
20. **Existing projects.** Do these apply on their next Calculate, with the change shown? **Yes,** as D-806's "with the defaults nothing moves" cannot hold once fill follows delivery: Auto is new-project only, and an existing project keeps its method until a person chooses.
21. **Default.** Auto for new projects? **Yes,** as you asked, never applied without a confirm.

## 13. The founder's answers (2026-10-31, D-893)

Where an answer differs from an earlier section, the answer wins.

| Q | Answer |
|---|---|
| 1, 3, 4, 8, 9, 10, 12, 13, 17, 18, 20, 21 | Yes, as recommended |
| 2 | Three activities: A3 trucks, A16 push fill, A17 scraper fill |
| 5 | Yes as a start, marked unpublished. A haul-road water truck applies only on scraper hauls of about 1,000 ft or more. The founder's figure comes later |
| 6 | CPH 49, editable per workspace |
| 7 | **No.** Haul grade runs between the cut's volume centroid and the fill's volume centroid, at mid-depth of each, not on existing ground |
| 11 | Flag when more than 10 % of a pocket is steeper than 33 % (3:1). Both are workspace settings |
| 14 | **No.** See the rule below |
| 15 | 2 ft and 3 ft. Shallow-and-wide also needs at least 20 ft width and 5,000 SF, else excavator. All workspace settings |
| 16 | A draft activity with a reclaimer (check the catalog), plus a "subcontract" option |
| 19 | Problems 1–3 now, 4–6 in Block 8 |

**The Q14 rule (D-895, built).** An undercut's bottom is the lower of the stripped existing grade and the proposed subgrade, minus the undercut depth: in fill areas the geotech's
"below existing grade", in cut areas "below subgrade". A per-undercut override, "below existing" or "below subgrade", matches the geotech report. The 4 ft Building Pad reads about its
full footprint, not 146 BCY. This replaces D-528's rule 1, the "existing ground only" lines of section 8, and the 146 BCY in sections 8, 9 and 10.

**Section 5's grades** were taken on existing ground; under Q7 they will be re-measured between centroids in Block 3.

**Order.** Problems 1–3 now. Then blocks 4, 1, 2 as the first cut. Then 3, 5, 6, 7, 8, 9, 10.

**First cut, re-estimated: 6.5 days.** Block 4 is 2 days, Block 1 is 2.5, Block 2 is 2. Block 1 grows half a day because the scraper's haul-road water truck needs a haul length, typed until
Block 3 measures it. **The whole plan stays about 25 days:** moving problems 1–3 out of Block 8 takes a day off it (now 3), and Q15's width and area settings and Q7's mid-depth centroids add
half a day each to Blocks 6 and 3.
