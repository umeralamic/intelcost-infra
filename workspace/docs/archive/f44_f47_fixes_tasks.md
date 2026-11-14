# F44–F47 acceptance fixes (night run 2026-11-14 → 15, Part 1)

**Decision:** D-1267 (from D-1265 items 1, 2, 10, 11–16, 22). **Repos:** app, api, infra. **Brief:** the founder,
2026-11-14 night run, Part 1.

## Problem → solution

F44–F47 were built unattended and are held at Working until their fixes pass (D-1265 22). The founder's check found a
duct bank whose estimate line reads wrong, a fittings allowance that prices fittings already counted, restraint on a
line of its own with no labour, every new type coded under its base's seeded node ("Water Main 33.01.01", 33 01 being
operation and maintenance), and an unexplained $2,152 in the restraint rerun. → Each fixed, with quantity-table rows
on the estimate line, a smoke with labour loaded, the bid tabs rerun, and F44, F45, F47 to Live if it all passes.

## Tasks

1. **Duct bank line.** Reproduce the part1 smoke (E-1, 4 × 4 in conduit, 100.00 LF of trench, 30 × 12 in encased) and
   trace pipe count and encasement from the geometry to the estimate line. Fix what is wrong, and say plainly what
   was not. Per-pipe check of every material: tracer (a pipe's own), tape (one a trench), add-ons (a pipe's own),
   bends (each pipe turns), the connection at the main (each pipe meets it), restraint sets (pipes × joints), the
   encasement (one a trench). The line's name says the trench length when it carries more than one pipe.
   Quantity-table rows that evaluate the **estimate line** (each material's sold quantity, as Estimating prices it).
2. **Fittings allowance, run by run.** A run with counted fittings (bends, tees, valves, hydrants) takes no allowance;
   restraint sets, taps and connections never count (the founder's correction, 2026-11-15: a restrained run keeps its
   allowance); the line's allowance is its base % over the LF of runs with nothing counted ("Fittings allowance, 0 % (fittings counted on this line)", or "… 20 % on 95 % of the line (fittings counted
   on the rest)"); the user can raise it. Rows: a hydrant lead with a bend, a restrained main, a shared line of a
   restrained and a plain run, a 20 % restrained run, a plain main (20 % kept), a gravity main (5 % kept).
3. **Restraint (D-1265 11, 12, 13, 16).**
   - The sets on the run's shared pipe line: no `|rj:` variant, no "restrained joints" in the name; D-1261's own line
     undone.
   - Labour on the pipe crew, MH a set by size: 4–6 in 0.2, 8 in 0.25, 10–12 in 0.35, 16 in 0.5, 20–24 in 0.75;
     14 in 0.5 (with 16), 18 in 0.75 (with 20–24), 30–36 in 1.0 (IntelCost's extension, stated). The pipe line's crew
     works sets × MH ÷ crew size hours more (its crew production lowered, its machines' unchanged), with a note.
   - Joint length = the family's catalog laying length: ductile iron 18 ft, C900, C905, C909 and D2241 20 ft.
   - C909 MJ restraint keys `restraint:pvco_c909:<n>` 4–24 in, list × 0.573 (D-1261's basis), grade C (18–24 grade D:
     the book's two pages disagree on C909 above 16 in); C909 bends and tees on the C900 (DI MJ) fitting keys.
4. **The $2,152:** reconcile last night's booked restraint material to sets × library price, to the cent.
5. **Smoke with labour:** wage set Harris County open shop, 2026-11-12 rates, ZIP 77002, Burdened; crew MH and labour $
   for water service, duct bank, encasement only, restrained 8 in C900, hydrant lead.
6. **D-1265 items:**
   - (1) A run with no stored add-ons (drawn before F44) gets no D-1260 add-on on a reprice: verify, row.
   - (2) Each type its own work scope (`site_utilities.<type>`, on its pipe line) and MasterFormat 2018 code (table
     below), the nodes added to a workspace's CSI tree when first needed; new runs and structures (D-1245) and new
     Calculate lines take them. Founder items keep their stored codes; the ones that would change are listed.
   - (10) Schedule 80 on every pressure type at 12 in and under; PP sanitary on the sanitary main and service.
   - (14, 15) Bid-tab rerun: add-ons on, 0386-3118A's four "where necessary" at 20 %, the fittings rule and the
     restraint changes on; before / after by kind and by contract; one line against 2026-11-12.
   - (22) On a pass: F44, F45, F47 to Live, their specs archived; F46 stays In Progress.

## Type → scope → folder → code (MasterFormat 2018)

Folder: the Utilities / Utility Inputs system folder (D-1242, D-1247, unchanged) and the classification folder of the
code. Where MasterFormat has no section of the type's own, it shares its nearest section's node (said in the row).

| Type | Scope | System folder | Code | MasterFormat 2018 title |
|---|---|---|---|---|
| Sanitary sewer main | site_utilities.sanitary | Sanitary | 33 31 13 | Site Sanitary Sewerage Gravity Piping |
| Sanitary service (lateral) | site_utilities.sanitary_service | Sanitary | 33 31 16 | Site Sanitary Sewerage Gravity Service Laterals |
| Grease waste | site_utilities.grease_waste | Sanitary | 22 13 23 | Sanitary Waste Interceptors (the line to the interceptor) |
| Force main (sanitary) | site_utilities.force_main | Sanitary | 33 31 23 | Sanitary Sewerage Force Main Piping |
| Storm sewer main | site_utilities.storm | Storm | 33 42 11 | Stormwater Gravity Piping |
| Storm lead | site_utilities.storm_lead | Storm | 33 42 11 | (shares: no section of its own) |
| Roof drain leader | site_utilities.roof_drain | Storm | 33 42 11 | (shares: 22 14 16 Rainwater Leaders is the building's) |
| Culvert | site_utilities.culvert | Storm | 33 42 13 | Stormwater Culverts |
| Storm force main | site_utilities.storm_force_main | Storm | 33 42 16 | Stormwater Force Main Piping |
| Subdrain / underdrain | site_utilities.subdrain | Storm | 33 41 16 | Subdrainage Piping |
| Foundation drain | site_utilities.foundation_drain | Storm | 33 41 13 | Foundation Drainage |
| Water main | site_utilities.water | Water | 33 14 16 | Site Water Utility Distribution Piping |
| Water service | site_utilities.water_service | Water | 33 14 17 | Site Water Utility Service Laterals |
| Hydrant lead | site_utilities.hydrant_lead | Water | 33 14 19 | Valves and Hydrants for Water Utility Service |
| Reclaimed water | site_utilities.reclaimed | Reclaimed water | 33 14 00 | Water Utility Transmission and Distribution (no reclaimed section; kept off potable 33 14 16) |
| Fire line / fire service | site_utilities.fire_water | Fire | 21 11 00 | Facility Fire-Suppression Water-Service Piping |
| Irrigation | site_utilities.irrigation | Irrigation | 32 84 00 | Planting Irrigation |
| Chilled / hot water | site_utilities.chilled_water | Chilled / hot water | 33 61 13 | Buried Hydronic Energy Distribution |
| Fuel / oil | site_utilities.fuel_oil | Fuel / oil | 33 52 13 | Liquid Hydrocarbon Piping |
| Gas main | site_utilities.gas | Gas | 33 52 16 | Gas Hydrocarbon Piping |
| Gas service | site_utilities.gas_service | Gas | 33 52 16 | (shares: no service section) |
| Electric primary | site_utilities.electric | Dry utilities | 33 71 19 | Electrical Underground Ducts, Ductbanks, and Manholes |
| Electric secondary | site_utilities.elec_secondary | Dry utilities | 26 05 43 | Underground Ducts and Raceways for Electrical Systems |
| Site lighting | site_utilities.site_lighting | Dry utilities | 26 56 00 | Exterior Lighting |
| Traffic signal | site_utilities.traffic_signal | Dry utilities | 34 41 13 | Traffic Signals |
| Telecom / fiber | site_utilities.telecom | Dry utilities | 33 82 00 | Communications Transmission and Distribution |
| Low voltage / security | site_utilities.low_voltage | Dry utilities | 27 05 43 | Underground Ducts and Raceways for Communications Systems |
| Casing / sleeve (bore) | site_utilities.casing | Crossings | 33 05 07 | Trenchless Installation of Utility Piping |
| Concrete encasement | site_utilities.encasement | Crossings | 33 05 05 | Buried Piping Installation (no encasement section) |
| Other | site_utilities.other | Utilities | — | none, as before |

Sources: CSI MasterFormat 2018 Master List of Numbers, Titles, and Explanations (a county-hosted copy of the
2018-05-08 list); cross-checked against a state MasterSpec Division 33 listing and a provincial 2019 spec-revision
note (renumbering 33 31 13 → 33 31 11, 33 11 16 → 33 14 16). 33 01 00 is "Operation and Maintenance of Utilities".

## Proof

Gates; quantity table (new `util-1267-*` rows, the estimate line evaluated); migration up/down/up on a separate
Postgres with a bench copy, then on the bench, founder digest and row compare; smoke with labour; bid-tab rerun.
