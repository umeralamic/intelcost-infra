# GPS Export: surfaces, linework and points for GPS and machine control (plan)

_Plan written in the night run of 2026-10-19. Answered by Umer on 2026-10-20 (D-650). Steps 1 to 3 built on 2026-10-20 (D-664 to D-666: the writers and readers, the surfaces, linework and points); coordinates, the dialog, the coordinate check and guests are next._

The research notes, with every page read, are in `E:\Intelcost\research\gps_formats.md`, outside the repos. They name
the makers; this plan does not (rule 9) and calls them maker A, B and C.

## What it is for

The contractor who won the job has to give the machines and the survey crew the model the bid was built on:
- the surface the dozer cuts to;
- the lines to steer and stake by;
- the points to set out.

All of it has to be in the site's real coordinates. Today that model is rebuilt by hand in someone else's software.

## What exists today (read from the code)

- **Surfaces are built in the browser.** EG and FG are TINs made from the drawn contours and spots. Calculate stores its inputs (`KeptInputs`), not the TIN, and the TINs rebuild exactly from them; the app already does this to check a saved result.
- **Proposed subgrade is not a surface anywhere.** It is worked out point by point, as finished grade minus each Site Feature's one "Proposed Grade to Subgrade Depth" (`role_depth_ft`).
- **Soil layers exist only in the browser,** as depth below EG over convex pieces. Top of rock is the bottom of the layer above rock.
- **Utility runs are 2D.** Their profile (station, ground, invert) is worked out at Calculate and not stored. Structures store rim, floor and sump.
- **Coordinates:**
  - Plan points are page fractions, with y pointing down.
  - The F18 link fits sheet to sheet, rigid or with the scale fitted, from 2–50 point pairs (`register.ts`, and the api's `register.py`).
  - **There is no northing/easting, coordinate system, datum or foot type anywhere.**
- **Files:** there is no LandXML, DXF or survey CSV code. `fflate` (zip) is already a dependency, and every download is made in the browser.
- **Staleness:** the result's version key tells whether the saved Calculate is current (`volumes.stale`).

## a. Formats

**Two cautions:**
- **Strength of the evidence:** about half of these points come from official help pages and the rest from dealer data sheets and surveyors' forums. The notes mark which is which.
- **The real check:** a real machine's office software (question G7).

| What | Open format we write | Loaded directly by | Still needs the maker's office or cloud software |
|---|---|---|---|
| Surfaces | **LandXML 1.2, full TIN** (points and faces), one surface per file | **Machines:** maker A's current machine software (full TINs only, 50 MB cap, 160,000 points); maker C's machine software (all machine types); several smaller makers. **Rovers:** maker A's site rover (converts it on import) and survey rover, and the survey rover packages found | maker A's older machines (their own surface and line files, made by A's rover or office software); maker B's machines over USB (B's project file, made in B's office or cloud software, which accept LandXML and DXF); two machine brands that use B's project file; one equipment maker's grade system (not confirmed) |
| Linework | **DXF R12, continuous 3D polylines** on named layers | every current machine and rover package found | as above |
| Points | **CSV P,N,E,Z,D** | every rover package found | none |

**What writing no native format loses:**
- **One bundled project:** a single file holding surface, lines, alignments and calibration.
- **The maker's own check** of the design before it reaches the machine.
- **Native colours and attributes.**

**Why that is acceptable:**
- The native formats are closed: there is no public specification, so writing them means reverse engineering.
- In practice the dealer, the surveyor or a model provider builds the per-system files anyway. One provider's page says it builds the model once and exports it for each system.

**The brief's requirements, against the research:**

| Requirement | Finding | Strength |
|---|---|---|
| Full TIN | "Any surfaces must be full TIN models"; breaklines-only and parametric surfaces "are not supported" | official |
| One surface per file | A multi-surface file makes the operator pick one; a rover takes the first, alphabetically, where surfaces overlap | official, forums |
| 50 MB | "For LandXML files, the limit is 50 MB"; under about 20 MB works best; at most 160,000 points. Units must be declared. | official |
| DXF R12 | R12 reads most widely, and has 3D polylines and 3D faces. One forum report favours R13/R14, for polyface meshes, which we do not write. | practice |
| 3D polylines | "Continuous 3D polylines", few named layers, 3D inverts; no splines, hatching, xrefs or blocks | dealer |
| CSV order | P,N,E,Z,D in the US; a dealer abroad uses P,E,N,Z,D | mixed |
| Calibration | Every machine runs on a site calibration measured from three or more control points; the files must be in the project's grid N/E | official |

## b. What goes in each export

### Surfaces: one LandXML file each, `C-200_Proposed-Subgrade.xml`

| Surface (in the dialog's order) | How it is built |
|---|---|
| **Proposed subgrade:** "what the machine cuts to" | The FG TIN, with each Site Feature's outline added as constraint edges, and a second ring 0.1 ft inside it. On the outline the surface is FG. Inside the ring it is FG minus the feature's depth: the newest feature wins an overlap, as in Calculate, and its subtract shapes are holes. Outside every feature it is FG. The 0.1 ft ring turns the vertical step at a feature's edge into a steep face, which a TIN can hold (question G2). |
| Proposed finished grade | The FG TIN that Calculate built, rebuilt from the stored inputs |
| Existing grade | The EG TIN, linked sheets' EG included (F18), rebuilt the same way |
| Each soil layer surface, e.g. top of rock | EG's vertices plus the layer pieces' corners, at EG minus the layer's depth. The piece edges are constraints. Clipped to where the bores' model reaches; the README says it is interpolated between bores. |

**Every surface:**
- **Clipped to the work boundary** by default; the boundary's edges are inserted, and triangles outside are dropped.
- **Units declared** (`<Imperial linearUnit="USSurveyFoot">` or `"foot"`, or metric).
- **`<CoordinateSystem>`** with the typed system, an EPSG code if typed, and the vertical datum.
- **Points in LandXML's own order:** northing, easting, elevation. Faces wound counter-clockwise in plan.
- **Not written:** invisible faces, source data or breaklines-only definitions.
- **Name and description** carry the label, the sheet and the Calculate's date.

### Linework: one DXF R12 file, `C-200_Linework.dxf`

**How the DXF is written:**
- **Entities:** 3D polylines only (`POLYLINE` flagged 8 or 9, with `VERTEX` 32), each feature joined into one continuous line; `TEXT` for notes. No `LWPOLYLINE`, blocks, splines or hatches.
- **Arcs** become points at a 0.05 ft chord.
- **Colours** by layer (ACI). X is easting, Y northing, Z elevation.

| Layer | What |
|---|---|
| `BRK-EG`, `BRK-FG` | The drawn contours that build each TIN, which are its breaklines. There is no other breakline in the model today. |
| `FEATURE-EDGE`, `FEATURE-SUBGRADE` | Each Site Feature's outline at FG, and its ring at the subgrade |
| `PAD` | Features marked as building pad (question G8); otherwise on `FEATURE-EDGE` |
| `CONT-EG`, `CONT-FG`, `CONT-SUBGRADE` | Contours from each exported TIN at 1 ft (0.5 m), majors every 5 ft on `-MAJ`, joined into polylines (`contourSegments` exists) |
| `UTIL-<system>-INV` | Each run's invert line in 3D: the profile Calculate works out, an invert at every vertex. `<system>` comes from the run (SAN, STM, WTR…), else `UTIL-INV`. |
| `TRENCH`, `PIT` | Top-of-trench and pit outlines, at the elevation of the surface they dig from |
| `BOUNDARY` | The work boundary, at FG |
| `NOTE` | The plan-coordinates warning, when it applies |
| `SURF-<name>` (CAD only) | Each surface as `3DFACE`s |

### Points: one CSV file, `C-200_Points.csv`

**Format:**
- `P,N,E,Z,D`: comma separated, ASCII, no header row, 3 decimals.
- Numbers run from a start you can set, 1 by default.

**Rows:**
- Each structure's rim: `MH-1 RIM`.
- Each pipe end's invert at a structure: `MH-1 INV SAN-1`.
- Each bore at its ground: `BORE B-1`.
- Each spot elevation: `SPOT EG`, `SPOT FG`.

### README.txt

- Units, horizontal and vertical, and which foot.
- The coordinate system and vertical datum, as typed.
- Each sheet's scale.
- The control points, plan and N/E, with each residual and the fit's rotation and scale.
- Each surface's points, triangles and Calculate date.
- The file list.
- The accuracy note: "Derived from PDF takeoff in IntelCost. Verify against design data before construction. Your site calibration file comes from your surveyor or machine technician."
- The plan-coordinates warning when no coordinates are set.

## c. Coordinates: the registration, step by step

**What is kept, per sheet (a joined site keeps one set for the site):**
- the control points: label, sheet, plan point, N and E;
- the fit and its residuals;
- the units: US survey ft, international ft, or metres for a metric project;
- the coordinate system and vertical datum, as typed, with an optional EPSG code.

The api fits again on save, as F18 does.

1. **Set coordinates…** opens a floating panel over the sheet, like F18's Linked EG panel (`RegistrationPanel.tsx`).
2. **Pick a point, type its N/E.** Click a grid tick, a control monument or a point from the plan's control table; Snap PDF snaps to the drawing's own lines. Type its northing, easting and a label (CP-1). Pick 2 or 3 points, up to 10, spread around the site.
3. **The fit:** F18's least-squares fit (`fitRigid`), from plan feet to N/E.
   - The scale is fitted by default, so it absorbs a slightly wrong drawing scale and the grid's scale factor.
   - Page y is flipped first, because y runs down and north runs up; otherwise F18's mirror check refuses the fit.
   - A mirror after the flip means N and E were typed swapped, so the panel offers "Swap N and E".
4. **The panel shows** each point's residual, the rotation, the fitted scale, and the status line, e.g. "±0.08 ft across 3 points" (RMS, with the worst point named).
   - It warns amber over 0.1 ft and red over 0.5 ft (G4, as decided).
   - It warns when the fitted scale is more than 0.5 % from 1 ("the sheet's scale may be wrong", F18's threshold), or when the points nearly line up.
   - With 2 points it says "Exact with 2 points: add a third to check them".
5. **Units, coordinate system and vertical datum.** Elevations are not transformed: they are already the plan's.
6. **Save.** The dialog's coordinates line updates.

**Sheets at different scales:** each sheet's own calibration turns its picks into plan feet. Points can come from more than one sheet only when those sheets share a frame through a link or a join.

**Joined sites (F19):**
- One set of coordinates per site, in the site's frame; a pick on a member sheet goes through that sheet's join.
- A site exports one set of files.
- A site's kept Calculate inputs do not hold the site's origin today; it must be added.

**Linked sheets (F18):** a sheet with no coordinates of its own takes them through its link's fit (`linkMatrix`), and the status says so ("from C-100, through its link"). EG read through links is already in the grading sheet's frame.

## d. Proving a file is right

1. **Round trip in the app, before every download.** Our own readers read each file back and compare it with its source model:
   - every point's N/E/Z, to 0.001 ft;
   - every face's three points, and the counts;
   - every DXF polyline's vertices;
   - every CSV row.

   A mismatch is a bug: the download stops, with a message.
2. **Free readers on the bench, run by hand like the quantity table (G6):**
   - **ezdxf (MIT)** reads each DXF: `audit()` clean, `$ACADVER` AC1009, only the entity types we write.
   - **xmllint** checks each LandXML file against the 1.2 schema.
   - **A small Python reader** rebuilds the exported TINs and works out the volume between exported EG and exported subgrade inside the boundary.
     - It must equal Calculate's figure without the topsoil strip (D-295), times the fitted scale squared, within 0.1 % once the 0.1 ft edge faces are allowed for.
     - That one figure checks the surfaces and the coordinates together.
3. **A coordinate check.** On a sheet with a printed control table, fit three monuments, then read a fourth back from the export with a free reader and compare it with the printed value.
4. **Test files for each preset,** with and without coordinates:
   - Built from a BENCH DUP of the 3D test copy: C-200's surfaces and features, the bench recipe's runs and structures, the bores and the spots.
   - Saved to the report folder.
   - The last proof is someone loading them into one or two makers' office software (G7).

## e. The dialog

```
┌ GPS Export · C-200 ─────────────────────────────────────────────┐
│ Use for   (•) Machine control  ( ) GPS stakeout  ( ) CAD        │
│ Surfaces                                   Calculated 19 Oct 16:44
│   [x] Proposed subgrade: what the machine cuts to   12,410 pts  │
│   [x] Proposed finished grade                       11,980 pts  │
│   [ ] Existing grade                                 9,120 pts  │
│   [ ] Top of rock                                    2,300 pts  │
│ Linework  [x] Feature edges and breaklines [x] Building pad     │
│           [ ] Contours [x] Utility runs (inverts) [x] Trenches  │
│           [x] Boundary                                          │
│ Points    [ ] Structures  [ ] Bores  [ ] Spot elevations        │
│ Coordinates  ±0.08 ft across 3 points        [Set coordinates…] │
│   Units (•) US survey ft ( ) International ft                   │
│   System [NAD83 / Texas Central (ftUS)]  Vertical [NAVD88]      │
│ Files   C-200_Proposed-Subgrade.xml 0.9 MB, … 4 files  [Change] │
│ Derived from PDF takeoff in IntelCost. Verify against design    │
│ data before construction. Your site calibration file comes from │
│ your surveyor or machine technician.                            │
│                                     [Cancel] [Download .zip]    │
└─────────────────────────────────────────────────────────────────┘
```

**The button:**
- **GPS Export** on the Earthwork row, after Report (`EarthworkToolbar.tsx`; the row's items are built in `ProjectTakeoff.tsx` 7720–7843).
- Tooltip: "Export surfaces, linework and points for GPS and machine control".

**The presets' defaults (anything can be changed):**

| Use for | Surfaces | Linework | Points | Formats |
|---|---|---|---|---|
| Machine control | subgrade, FG | edges and breaklines, pad, utilities, trenches, boundary | none | LandXML TIN each, DXF R12 |
| GPS stakeout | none | edges, pad, utilities, trenches, boundary | all | CSV, DXF R12 |
| CAD | all | all | all | DXF R12, surfaces as 3D faces; the CSV too |

**The states:**
- **Out of date:** Download waits, with "Calculate again first". That button runs Calculate in place.
- **No coordinates:** Download is allowed, and every file is labelled as plan coordinates.
- **A guest (link switch on):** the same dialog. The coordinates block is read-only, showing the owner's figures with
  no Set coordinates. Out of date reads "The owner must Calculate again first". Each download is logged against the link.
- **A guest (switch off):** the button is greyed, with the guest tip.

**What I would change, and why** (all seven accepted as written, 2026-10-20):

| Change | Why |
|---|---|
| The label in files reads `PLAN COORDINATES - NOT FOR MACHINE USE`, with a plain hyphen, and every file name gets `_PLAN-COORDS` | R12 DXF and many controllers read ASCII only, so a long dash can show as garbage. A file name still warns once the file is separated from its README. |
| The CSV gets no header row; the warning goes in its name and the README | Some field software reads a header row as a bad point |
| A metric project offers metres beside the two feet | Elevations are kept in feet and converted with the international foot, as the app already does |
| A surface that cannot be made is shown greyed, with why ("No Site Features: same as finished grade", "No soil layers") | The user sees what is missing instead of guessing |
| Each surface shows its size. The warning comes at 50 MB **or 160,000 points**, with "Split by area" | One machine package's point cap bites before 50 MB. A PDF-built TIN is usually far below both. |
| The coordinates line names where they come from when inherited | A linked sheet or site member uses someone else's points |
| The last "Use for" and the units are remembered per project | One crew, one system |

## Guests and plans

**Decided (Umer, 2026-10-20, G1; D-650):** Professional and trial members, **and** share-link guests when the link
allows it.

**Members:**
- **Professional or trial:** the export, with Set coordinates.
- **Essentials:** the button greyed, with the existing "Professional only" reason (`PROFESSIONAL_ONLY`).

**Guests, through a new share-link switch "Allow GPS Export download":**
- **Off by default.** It can be turned on only while the project's owner has Professional (or trial). The switch
  sits with the link's other settings, beside "Show pricing".
- **With the switch on, the same dialog, read-only on coordinates:**
  - the guest chooses Use for, the surfaces, linework, points and files, and downloads;
  - the coordinates, units, coordinate system and vertical datum are the owner's, shown and not changeable;
  - Set coordinates is hidden.
- **The label and the note apply exactly as to members:**
  - with no coordinates set, every file is labelled `PLAN COORDINATES - NOT FOR MACHINE USE`;
  - the accuracy note is in the dialog and the README.
- **Every guest download is logged against the link:** the time and the files, kept in a new
  `share_link_download` table.
  - Project members see it in the link's settings ("Downloads: 3, last 19 Oct 16:44, C-200_Proposed-Subgrade.xml …").
- **With the switch off,** the guest's button is greyed with the guest tip: "Sign up for Professional to use this."

**How a guest's export is built:**
- The files are made in the guest's browser, from the reads a guest already has: the stored Calculate inputs are
  open to guests, and so is the coordinates GET.
- The download is logged by a guest POST that the guest guard allows for this one route.
  - It is the only write a guest makes, and it holds nothing but the log row.
  - The api refuses it unless the link's switch is on and the owner's plan still allows it.
- **Out of date:** a guest's Calculate is never saved (D-600's rule), so "Calculate again first" is not offered to a
  guest. The dialog says the owner must Calculate again, and Download waits.

## f. Files touched, risks, hours and questions

**Files (expected):**
- **Pure modules,** under `lib/takeoff/earthwork/export/`:
  - `landxml.ts`, `dxf12.ts`, `pointsCsv.ts`: each writer and its reader, for the round trip;
  - `subgrade.ts`, `layerSurface.ts`, `clip.ts`;
  - `georef.ts`: plan feet to N/E, on `register.ts`'s fit;
  - `exportSet.ts`: builds the files from the stored inputs, the result, geotech and utilities.
- **App:**
  - new: `features/takeoff/earthwork/gps/` (`GpsExportDialog.tsx`, `CoordinatesPanel.tsx`, `useGpsExport.ts`);
  - changed: `EarthworkToolbar.tsx`, `ProjectTakeoff.tsx` (the row and the panel), `features/share/view-only.ts` (guest tip), `use-permissions.ts` (plan).
  - The zip is built with `fflate`. The export runs in the earthwork worker so the page stays live.
- **Api:**
  - a `sheet_georef` table and its migration; a joined site's set is kept on its `site` row;
  - routes: GET for members and guests, PUT for writers, re-fitted with `register.py`;
  - a capability `earthwork.gps_export` in the Professional mask;
  - the site origin kept with a site's Calculate inputs;
  - **for guests (G1):**
    - `project_share_link.allow_gps_export` and a `share_link_download` table (link, time, files), with their migration;
    - the switch refused unless the owner's plan allows it;
    - the guest guard lets through one POST, the download log;
    - members read the log in the link's settings (`features/share`).
- **App, for guests:** the switch in the share dialog; the dialog's read-only coordinates; the link's download list.
- **Infra:** `gps-check.sh` (ezdxf, xmllint, the volume comparison), as G6 allows.

**Risks:**
- **Accuracy:** PDF takeoff is approximate (the drawing's scale, line weight and picking), but the files look exact. The accuracy note, the README, the residuals and the plan-coordinates label all say so, and the dialog never hides them.
- **Coordinate mistakes:**
  - **Swapped N and E,** or a wrong sign: the mirror check catches these.
  - **The wrong foot:** 2 parts per million, several feet at state plane values in the millions, and no check can catch it. The README and the dialog name the foot, and the choice is remembered per project.
- **Subgrade edges:** the 0.1 ft face makes long thin triangles.
  - One machine package warns on triangles under 0.01 m² (0.11 sq ft).
  - The band's triangles hold 0.05 sq ft per foot of edge, so edge segments under about 2 ft are merged with their neighbours.
- **Field variety:** only free readers check our files until someone loads them in a maker's software (G7).
- **LandXML's northing-first order** is a classic bug.
  - Our own reader would share the mistake.
  - The fourth-monument check (d.3) and a real load (G7) are what catch it.
- **The utility inverts** come from the profile Calculate works out, which is not stored. The export works it out the same way, and requires a current Calculate.

**Paper hours:**

| Piece | Hours |
|---|---|
| Writers and readers (LandXML, DXF R12, CSV), zip, README | 8 |
| Surfaces: EG and FG from the stored inputs (sites included), subgrade, soil layers, boundary clip, size check and split | 12 |
| Linework and points: breaklines, feature edges and rings, pad, contours joined, 3D inverts, trench and pit outlines, boundary; the CSV | 8 |
| Coordinates: table and migration, routes with the server fit, the panel, units, system and datum, through links and sites | 12 |
| Dialog: presets, surface list with dates, files summary, out-of-date and plan-coordinates states, plan and guest gating | 6 |
| Proof: in-app round trip, bench checker, test files per preset; gates, quantity table, smokes | 6 |
| Guests (G1): the link switch and its plan check, the guest dialog read-only on coordinates, the download log (table, migration, guest POST, members' list), a guest smoke | 6 |
| **Total** | **about 58 h (7 days)** |

**Questions, answered (Umer, 2026-10-20; logged as D-650):**

| # | Question | Answer |
|---|---|---|
| G1 | Who may export? | **Changed:** Professional and trial members, **and** share-link guests when the link's "Allow GPS Export download" is on (off by default; it can be on only while the owner has Professional). Guests get the dialog read-only on coordinates, the same label and accuracy note, and every download is logged against the link for members to see. See "Guests and plans". |
| G2 | The subgrade's edge at a feature? | **The 0.1 ft face.** |
| G3 | Coordinates per sheet; linked sheets inherit; a joined site shares one set? | **Yes.** |
| G4 | Residual warnings? | **Changed:** amber over 0.1 ft, red over 0.5 ft. |
| G5 | CSV P,N,E,Z,D by default, P,E,N,Z,D under Change? | **Yes.** |
| G6 | The bench checker, run by hand like the quantity table? | **Yes.** |
| G7 | A real load of the test files before release? | **Yes:** Umer's contractor client will load them. |
| G8 | A "Building pad" tick on Site Features? | **Yes.** |

The dialog's seven changes are accepted as written. **Built so far:** the three hours-table rows "Writers and readers", "Surfaces" and "Linework and points" (D-664 to D-666).
