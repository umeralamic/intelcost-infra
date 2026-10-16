# F29: Bores, soil layers, utilities, structures and over-excavation (Earthwork tab)

_Spec, drafted 2026-10-15 in Block 0. **Approved 2026-10-15 (D-526), not started; nothing here is built.** Block 0.5
(four existing issues) is built first, then Blocks 1 to 5 in order._

- **Plan:** [earthwork_utilities_PLAN.md](earthwork_utilities_PLAN.md). It holds what exists today, the data model, every
  formula with a worked example, the wireframes, the estimating tables, the checks, the blocks, the risks and
  the questions.
- **The founder's answers are written in** (D-526): Q1 to Q15 as recommended, with D-526's notes on Q5, Q6, Q7, Q9
  and Q12, the trench-width rule (§9.2), and utilities-only projects as a requirement (§9.1).
- **Defaults** are in [pending_umer.md](pending_umer.md) as U-UT1 to U-UT52, answered in D-526.

## 1. Problem and solution

**The problem.** A site contractor prices more than mass cut and fill. The bid also carries:
- the trench and pipe for every utility;
- the manholes, inlets and vaults;
- the rock and the wet ground the excavation meets;
- the shoring a deep trench needs;
- the over-excavation the geotech report asks for;
- where all of that soil goes.

Today the Earthwork tab knows two surfaces and nothing under the existing ground: no soil, no water, no
pipe. The estimator works the rest by hand from the geotech report and the utility plan.

**The solution.**
- **Bores and soil layers.** The estimator reads the geotech report into bores placed on the plan and a project
  list of soil layers.
- **Layer model.** From the bores the app builds a layer model under the site and a design groundwater surface.
- **Utilities and structures.** Runs and structures are drawn on the plan with their pipe, inverts and trench
  section.
- **Calculate.** Calculate cuts each trench and pit through the layer model with the project's excavation slope
  rule. It writes as estimate lines: pipe, excavation by material, bedding, backfill, protection, dewatering, rock,
  restoration and spoils.
- **Over-excavation.** It can go down to the bottom of a layer or to an elevation.
- **Site balance.** The balance takes the new spoils.
- **Classification.** Every new line is classified through a work scope, never through a code written in the
  feature's code.

## 2. Words

| Word | Meaning here |
|---|---|
| Bore | One exploration from a geotech report (boring, test pit, hand auger, CPT or other), placed as a point on a sheet, with its log and its water readings. |
| Soil layer | One entry in the project's top-to-bottom list (Topsoil, Fill, Fat clay, Limestone). Each row of a bore's log picks a layer, so one layer is traced across the bores. |
| Layer model | Each layer's bottom as a surface under the site, built from the bores. The last layer in the list has no bottom. |
| Design water level | One groundwater depth per bore, worked from its readings (§5). Together they make the design water surface. |
| Run | One utility line drawn on the plan, from structure to structure or from end to end. |
| Segment | A stretch of a run, from one station to another, with its own section, materials or protection. |
| Structure | A manhole, inlet, vault, lift station or other box placed on the plan, with its own pit. |
| Station | A distance along a run from its start, shown as 0+00 (feet) or 0+000 (metres). |
| Start surface | The surface a trench or pit is dug from: the proposed subgrade (default) or the existing grade. |
| Trench depth | From the start surface down to the trench bottom, which is below the bedding. |
| Invert depth | From the start surface down to the pipe's invert. |
| Protection | How a trench wall is held: vertical (under 5 ft only), sloped, benched, or a trench box or shoring. |
| Work type | A fixed key on each Calculate line that says what kind of work it is, such as `utility_pipe` or `dewatering` (plan §5.2). |
| Work scope | A named package of work that is the same in every classification system, such as "Site Utilities — Sanitary Sewer". Each line gets a work scope and a work type; the scope's mapping gives the line its code in the project's system. The name is "work scope" because "Scope" already names the second level of a classification tree in this app (Q4). |

## 3. Bores (Block 1)

### 3.1 Placing and editing

- **The button.** A **Bores** button sits on the Earthwork row after Stripping. Its icon is drawn in the same
  24-grid stroke style as Contour and Stripping, with the label under it, in the same bordered group.
- **Placing.** The button arms placement. Each click on the sheet places one bore and opens its panel; Enter
  or Esc ends placement.
- **Editing.** A bore is a point on its sheet:
  - the Select tool selects it and opens its panel;
  - a drag moves it;
  - its menu deletes it;
  - every change undoes and redoes like a spot elevation's.
- **On the sheet.** A bore draws as a small circled cross with its ID beside it. A bore with a refusal shows a
  bar under the cross. A selected bore is highlighted as a selected spot is.
- **The panel.** The Bores panel lists every bore in the project with its ID, type and total depth. It opens
  on the selected bore and has a second tab, **Soil layers** (§4).

### 3.2 Fields

| Field | Entry | Rules |
|---|---|---|
| Bore ID | Text, up to 32 characters | Required; the next free "B-n" is offered. Unique within the project (a duplicate is refused, naming the other bore's sheet). |
| Exploration type | Boring, test pit, hand auger, CPT, other | Default boring. |
| Date | Date | Optional. |
| Source report, page | Free text | Optional; shown in the report beside the bore. |
| Notes | Free text | Optional. |
| Ground elevation | Number, in the sheet's elevation unit (D-398) | **Blank by default:** the existing surface at the bore, read live and shown as "712.40 ft, from the existing surface". A typed value replaces it. |
| Report elevation | Number | Optional. When it differs from the elevation in use by more than 0.1 ft, both show, with the gap ("report 711.90 ft, 0.50 ft lower"). |
| Total depth | Number, over 0 | Required. |
| Termination | Planned depth, refusal | Default planned depth. |
| Refusal reason | Cemented, weathered rock, bedrock, caving, obstruction | Only with refusal. |
| Cave-in depth after tools removed | Number, over 0, at most the total depth | Optional. |
| Caving observed | Yes or no | Default no. |
| Perched water | Yes or no | Default no. |
| Water readings | Any number of rows | Each row: type (while drilling, at completion, after N hours with N typed, stabilized, seasonal high estimate, published data); a depth or "not encountered"; a date. Published data also takes a source (for example "ADWR site 330001112004301"). |
| Layers | Rows, top to bottom | Each row: depth from and depth to, or a thickness (any two give the third); description as written; layer (from the project list, or "+ New layer…"); USCS (optional); PI (optional). |

**Ground elevation.**
- A bore placed where the existing surface does not reach needs a typed elevation. The panel says so: "No
  existing surface here: type the ground elevation."
- A report's elevation is often on its own datum, so the elevation in use stays the existing surface's unless
  the user types one.

**Layer rows.**
- **Contiguous.** Rows run from 0 to the total depth with no gaps or overlaps. A gap or overlap is refused with
  the row named. The last row's bottom fills in as the total depth.
- **In order.** Each row's layer must sit below the previous row's layer in the project list. A row out of order
  is refused: "Sand is above Clay in the Soil layers list. Move it in the list, or add a new layer."
- **Lenses.** A lens or interbed (a sand lens in clay) is its own layer in the list ("Sand lens"). A bore that
  does not show it logs it as missing (§6.2).
- **Shared properties.** Beside each row the panel shows the layer's soil group, OSHA type, flags and factors.
  These belong to the layer, not the bore (§4): editing them here edits the layer in every bore, and the row says
  so ("Applies to Fat clay in 6 bores").

**Refusal on rock.** With refusal on weathered rock or bedrock, the rock starts at the total depth. If no row
names a rock layer, the panel asks "Rock below 20.0 ft: [Bedrock ▾]" and adds that layer as an open-bottomed
row.

### 3.3 OSHA suggestion

Each layer's OSHA type is suggested from its soil group. The text beside it is the brief's: "Suggested: C —
change if your geotech report says otherwise." (with the suggested letter).

| Soil group | Suggested type | Why |
|---|---|---|
| Clay | B | The brief: B unless the user picks A. |
| Silt | B | OSHA Appendix A lists silt under Type B. |
| Sand, gravel | C | The brief. |
| Topsoil, pavement/base, fill (engineered), fill (non-engineered) | C | The brief, and OSHA: previously disturbed soil is never A. |
| Cemented / caliche | A | OSHA Appendix A names cemented soils such as caliche and hardpan as Type A. **C** where the bore logs caving. |
| Hard dig | C | No OSHA meaning of its own: unknown, so C. |
| Weathered rock | C | Not shown to be stable rock: unknown, so C. |
| Bedrock | Stable rock | The brief. |
| Unknown | C | The brief. |

**Overridden in a trench, whatever the layer's type.** Two cases (§9.3):
- a layer at or below the design water there counts as C, because OSHA classes submerged soil as C;
- so does a layer where the governing bore logs caving.

### 3.4 Fast entry

- **Copy layers from previous bore.** Copies the rows of the bore placed or edited last: layers, depths and
  descriptions. The user then edits the depths.
- **Paste rows.** Pastes rows copied from a spreadsheet, in four columns: depth from, depth to, description,
  group.
  - The group is matched to a layer by layer name, then by soil group.
  - Unmatched rows are highlighted with "+ New layer" ready.
- **Keyboard, like a table.**
  - Tab moves across the cells and on to the next row.
  - Enter on the last row adds a row.
  - The layer cell takes typed text and offers the matching layers.

### 3.5 Banner

At the top of the Bores panel, always:
> Bore data is your assumption for estimating. Geotech logs show conditions at the bore locations only.

## 4. Soil layers

The project's list, top to bottom, in the Bores panel's **Soil layers** tab. Rows are dragged to reorder.

| Property | Entry | Default |
|---|---|---|
| Name | Text | Required, unique in the project. |
| Soil group | Topsoil, pavement/base, fill (engineered), fill (non-engineered), clay, silt, sand, gravel, cemented/caliche, hard dig, weathered rock, bedrock | Required. |
| USCS | Text | Optional. |
| OSHA type | A, B, C, stable rock | Suggested from the group (§3.3). |
| Flags | Unsuitable (must be exported); reusable as backfill; reusable as structural fill; expansive | From the group (plan §3.2, U-UT21). |
| Swell | Loose ÷ bank, as printed (D-177) | From the group (U-UT21). |
| Shrink | "Fill needs × more cut", as printed (D-177) | From the group (U-UT21). |
| Colour | The measurement palette | The next unused colour. |
| Interpolation | Follows the ground (depth) or by elevation | Follows the ground for every group except weathered rock and bedrock (Q1). |

**Rules for the list.**
- **Deleting.** A layer used by a bore cannot be deleted; the message names the bores.
- **Adding from a bore.** "+ New layer…" inserts the new layer between the previous row's layer and the next
  row's.
- **Report percentages.** A shrinkage given as a percentage can be entered as one. The dialog shows the factor it
  stores ("20 % shrinkage, bank to compacted, stores 1.25").
- **Loose-based figures.** A report figure measured from the loose state, such as Deland's "20 to 30 percent from
  its loose-dumped or hauled state", is a loose-to-compacted factor (swell × shrink). The estimator must split it;
  the dialog says so.

## 5. Design water level

One per bore, by these rules in order:

1. **A seasonal high estimate, if given:** the shallowest one.
2. **Otherwise, the shallowest measured reading less the project buffer.**
   - Measured readings are while drilling, at completion, after N hours and stabilized. Perched readings count
     and are flagged (U-UT19).
   - The buffer is 1.0 ft by default, editable per project, and the level never rises above the ground.
3. **Otherwise, published data,** if the bore has a published reading.
   - It is labelled "published" in the panel and the report.
   - It is never shallower than the bore's own "not encountered" depth.
4. **Otherwise, if every reading is "not encountered":** the water is deeper than the bore's total depth.
   - The bore adds no water point.
   - It only keeps the water surface from rising above its total depth there (§6.5).
   - No buffer is applied: the brief's "never invent shallower water".
5. **A bore with no readings at all** adds nothing.

**No water anywhere.** With no water at any bore, there is no water surface. The panel and the report say "No
groundwater in any bore", and nothing is ever below water.

**How the panel shows it.**
- "Design water level: 4.00 ft (seasonal high estimate)"
- "4.20 ft (5.20 measured − 1.00 buffer)"
- "Below 15.00 ft (not encountered)"
- "81.80 ft (published: ADWR site 330001112004301)"

## 6. The layer model

The formulas and worked examples are in the plan, §3.1 to §3.4.

### 6.1 Surfaces

- **Bottoms.** Every layer except the last has a bottom surface. The last layer goes down without limit.
- **Soils follow the ground.** Their bottoms are interpolated as depths below the existing surface (Q1).
- **Rock goes by elevation.** Weathered rock and bedrock are interpolated by elevation. The setting is per layer.
- **One builder.** A surface is a TIN over its points, built with the same triangulation as the grade surfaces.
  - One point: the surface is level.
  - Two points: it varies along the line between them and is constant across it.
- **Outside the points.** A surface is constant from the nearest point on its hull's edge. It is drawn to the
  work boundary, and it is read wherever a run or structure lies.

### 6.2 What a bore says about a layer

- **Logged above the bore's end:** a point at the layer's bottom.
- **Missing from a log that continues below it:** zero thickness. The point is the bottom of the layer above it
  in that bore (the brief).
- **The bore ended inside the layer at planned depth:** the layer goes at least that deep. The bore adds a point
  only if the surface from the other bores is shallower there (Q2).
- **The bore ended above the layer:** nothing. A bore never makes a layer, rock or water shallower than it shows.
- **Refusal on weathered rock or bedrock:** the rock's top is at the total depth.
- **Refusal for caving or an obstruction:** no rock.

### 6.3 Layers never cross

- **Order.** From the top down, each bottom is kept at or below the one above. The first is kept at or below
  the ground.
- **Reporting.** Every clamp is reported with the layer, the area, the deepest clamp and the nearest bore: "Clay
  kept under Fill over 555.56 SF, up to 2.00 ft, near TP-4".
- **Thresholds.** Clamps under 0.01 ft or 1 SF are not listed.

### 6.4 Without bores

- **No change.** A project without bores calculates exactly as today: the same numbers, lines and version key.
- **Soil assumed.** Trenches and pits on such a project use the project default soil, one layer assumed as Type C.
  The results say "No bores: Type C assumed."

### 6.5 Water surface

- **Built by elevation** from each bore's design water level.
- **Never above** a not-encountered bore's total depth.
- **Kept at or below the existing ground.**
- **No surface without water:** if no bore has water, there is no surface.

### 6.6 3D view and cross-section

- **3D view.**
  - One toggle per layer and one for water.
  - Bores show as columns coloured by layer, with a cap at a refusal and a ring at a cave-in depth.
  - The hover readout adds the layer under the cursor and its depth.
- **Cross-section tool.**
  - Draw a line, or pick a run.
  - A panel then shows, along that line: existing grade, proposed grade, every layer, the water, and every run and
    structure that crosses it.
  - Stations run along the bottom; hovering gives each elevation.
  - It opens in the split pane, as the grading report does.

## 7. Calculate: cut by material, topsoil and stripping

- **Split by layer.** The cut between the existing ground (after stripping) and the proposed subgrade is split
  by layer.
- **Reported separately:** hard dig, weathered rock and bedrock, and unsuitable layers. The parts add up to the
  total cut exactly; the checks hold them to 0.01 CY.
- **Without bores:** as today (§6.4).
- **Topsoil suggestion.**
  - When the list has a Topsoil layer, Calculate's assumptions and the Strip Area dialog suggest a strip depth.
  - The suggestion is the average topsoil thickness of the bores that log topsoil at the surface; bores with
    pavement at the surface are left out.
  - Nothing changes until the user takes it.
- **Stripping wins.**
  - Inside a Strip Area, everything down to the strip depth is strip, whatever the layers. The layer split starts
    below it.
  - Where the topsoil is thicker than the strip, the rest is topsoil in the cut. Where it is thinner, the strip has
    taken some of the next layer.
  - The results say which: "Strip 0.50 ft. B-1 logs 0.67 ft of topsoil: 0.17 ft is in the cut."

## 8. Excavation slope rule

A project setting, in the Bores panel's Slope rule tab on the Earthwork tab (saved at once for the project, read by
every member and, read only, by a share link's guest, with who last changed it and when; D-546). It was first in
Takeoff settings, which are one person's on one device.

**Federal OSHA (the default),** as 29 CFR 1926 Subpart P, Appendix B prints it (Table B-1 and Figure B-1):
- **Slopes:** A ¾:1, B 1:1, C 1½:1, stable rock vertical. Over 20 ft deep, a registered professional engineer
  designs the sloping or benching (Table B-1, note 3).
- **Benching, Type A** ("Simple Bench", "Multiple Bench"): the bottom vertical side at most 4 ft, each further
  bench at most 5 ft high.
- **Benching, Type B** ("Single Bench", "Multiple Bench", "This bench allowed in cohesive soil only."): the bottom
  vertical side and each further bench at most 4 ft.
- **Type C:** no benching.
- **Where the benches sit.** The benches stay inside the maximum slope drawn from the toe of the trench; each
  bench's back corner sits on that line. So a benched wall digs less than the simple slope (plan §3.8, U-UT25).
- **Not offered:** Type A's short-term ½:1 slope (12 ft or less, open 24 hours or less); its unsupported vertical
  lower portion (3½ ft); and the shielded vertical lower portion with a slope above (every type). A box is full
  height.

**From the geotech report.**
- A table of rows. Each row has:
  - soil groups (any of the twelve, or the shortcuts "cohesive" and "granular");
  - a depth limit, "up to" so many feet;
  - water: above, below or either;
  - a slope H:V, or "shoring required".
- A source note gives the report and page.
- **Template.** "Load template" preloads a starting table of the kind geotech reports print. The source line stays
  the user's own report and page; the reports this table was drawn from are not named in the app (D-552):

  | Soil | Water | Up to | Slope |
  |---|---|---|---|
  | Cohesive | Above or below | 8 ft | 0.5:1 |
  | Granular | Above | 4 ft | 0.5:1 |
  | Granular | Above | 8 ft | 1:1 |
  | Granular | Below | Any | Shoring required |

**When a rule is steeper than OSHA.** A row steeper than federal OSHA allows for the layer's OSHA type shows
"Steeper than federal OSHA — confirm with the geotech report and your state's rules." The text shows on the row,
on every run and structure that uses the row, and in the report. It is never allowed silently.

**When no row reaches the depth.** A trench deeper than every row for its soil uses federal OSHA at that station
and says so: "No geotech rule for Clay at 9.0 ft: federal OSHA used."

## 9. Utilities (Block 2)

### 9.1 Drawing and storing

- **Drawing.** A **Utilities** button on the Earthwork row draws a run as Linear does:
  - click for points, then Enter or a double-click to finish;
  - A for an arc, Backspace to take back a point;
  - S, O and D for Snap, Ortho and Snap PDF.
- **Snapping.** Runs snap to structures (their centres) and to the ends and vertices of other runs.
- **Storing.** A run is a takeoff item (LF) marked as a utility run, stored as Site Features are:
  - it is filed in "Utilities › <type>" (§14);
  - it is kept out of Estimating's rows, because Calculate's lines carry its quantities.
- **Runs on a utility sheet.** Runs drawn on a utility sheet with no surfaces are read into the grading sheet
  through a control-point link, the same link that brings linked EG in (F18, Q8).
- **Ground from rims.** Where no surface covers a run, its ground runs straight from structure rim to structure
  rim (or between typed end grades). The stretch is marked "Grade from rims" (U-UT33).
- **Utilities-only projects (a requirement, D-526).** A project with no grading (no EG, no FG, no boundary) still
  Calculates its runs and structures, from rims and typed grades. Mass cut and fill are simply absent.

### 9.2 Run fields

| Field | Entry | Default |
|---|---|---|
| Utility type | Sanitary sewer, storm, water, fire water, force main, gas, electric conduit, telecom conduit, subdrain, other | Required. |
| Pipe | Material and class from the catalog (PVC SDR-35, PVC C900, DIP, RCP Class III, HDPE, CMP, copper, conduit Sch 40 or 80, and others), then the nominal size | Required. OD and ID fill in from the catalog row with its standard cited ("ASTM D3034, 8 in: OD 8.400 in"); both can be edited. A catalog value with no source is blank, and its row is listed in pending_umer. Values are never guessed. |
| Pipes in the trench | Count, and the clear gap between pipes | 1, no gap. |
| Vertical | (a) start and end inverts; (b) start invert and slope %; (c) depth of cover, for pressure pipes, with the crown at a constant cover below the start surface | (a). An invert at a connected structure is that structure's: one value, edited from either panel. |
| Start surface | Proposed subgrade, or existing grade | Proposed subgrade (Q7). Where no proposed surface covers the run, the existing grade, and the run says so ("No proposed surface: trench from existing grade, 0+00 to 0+40."). Where neither covers it, rims and typed grades (§9.1). Shown on the panel and the profile. |
| Section | Side clearance, minimum bottom width, bedding under the pipe, pipe zone above the crown | From Utility settings (12 in, 24 in, 6 in, 12 in), editable per run. |
| Bucket | Auto, a standard bucket (12, 18, 24, 30, 36, 42, 48 or 60 in), or a typed width | Auto: the smallest standard bucket at or above the pipe width. The project's default is in Utility settings. |
| Box | A box from the project's list (name, inside width, outside width, height), or a typed outside width | Wherever a box or shoring is used: the smallest listed box whose inside width fits the pipe width. With no list, a typed width is required, and the run is flagged until it is set. |
| Spec max width | Inches, per run, or per pipe size in Utility settings | None. |
| Materials | Bedding, pipe zone and backfill: each a name, native or imported, an optional density (pcf) for tons, and an optional compaction note | From Utility settings. |
| Restoration | None, asphalt, concrete or sod, and a width | None. When on, the default width is the trench's top width plus 1 ft each side. |
| Protection | Auto, box or shoring, sloped, benched, vertical | Auto: a box where the run is marked "limited width / in street", otherwise sloped. |
| Segments | Station from and to, plus overrides of materials, section or protection | None. |

**The trench-width rule (D-526).** The bottom width at a station is the **largest** of:
- **the pipe width:** the pipes and their gaps plus a side clearance each side, at least the minimum width;
- **the bucket width:** the run's bucket (Auto picks the smallest standard bucket at or above the pipe width);
- **the box's outside width,** wherever a box or shoring is used at that station.

**How the width is used and shown.**
- **Slopes and benches** start from this width.
- **The run panel** says what set it: "Width 36 in — bucket".
- **A spec max width never shrinks the actual width.** Over it, the run shows "Wider than spec max — pay width may
  be limited", with the quantities at the spec width beside the actual ones (§9.4).
- **A box shorter than the trench** is noted; stacked boxes are not modelled.

### 9.3 Protection, station by station

**By depth.**

| Trench depth | Rule |
|---|---|
| Under 5 ft | Vertical, unless the user picked sloped or benched. |
| 5 to 20 ft | Protection required. A box or shoring is forced, and flagged, in the cases below; otherwise the run's choice holds. |
| Over 20 ft | Computed by the same rules and flagged "Over 20 ft — protection must be designed by a registered engineer." |

A box or shoring is forced where:
- the trench bottom is below the design water in granular soil;
- the governing bore logs caving (see Caving below);
- the geotech rule says "shoring required".

Wherever a box or shoring is used, the box's outside width enters the trench-width rule (§9.2).

**Sloped.**
- **The slope.** The slope rule's ratio for the flattest layer the trench passes through at that station.
  Layers at or below the design water count as C.
- **Rock below soil.** With stable rock under soil, the rock is cut vertical and the soil above slopes from the
  top of the rock (Q11).

**Benched.**
- **Where allowed.** Only where every layer passed allows benching: Type A, or Type B in cohesive soil.
- **Elsewhere.**
  - The run says "Benching isn't allowed in this soil."
  - Benched cannot be picked when no station allows it.
  - On a run where some stations allow it, the others are sloped and flagged.

**Caving.**
- The nearest bore to a station governs it.
- Caving observed: a box or shoring wherever protection is required.
- A cave-in depth: a box or shoring wherever the trench bottom is below it.
- Under 5 ft: a flag only (U-UT23).

**No bores.** The default soil is Type C, and the run says so.

### 9.4 What Calculate gives

**Per run.** The run panel and the report show:
- **Excavation:**
  - trench excavation by layer, in bank volume;
  - hard dig, weathered rock and bedrock apart, in CY and as the LF of trench in rock.
- **Bedding, pipe zone and backfill:**
  - in compacted CY, with tons where a density is given;
  - less the pipe where the pipe sits in the zone;
  - native and imported apart.
  - Native material comes only from layers reusable as backfill, never from unsuitable, hard dig or rock layers.
    Native backfill needs bank volume × shrink.
- **Spoils.** Excavation less the native reused, in bank volume. The suitable part goes to the site balance;
  unsuitable, hard dig and rock are always exported.
- **Pipe LF** by material and size, in invert-depth ranges (Q10): 0–6, 6–8, 8–10, 10–12, 12–14, 14–16 and
  16+ ft. The ranges are editable and include their lower bound.
- **Protection LF** by method, in trench-depth ranges.
- **Dewatering LF** where the trench bottom is below the design water surface, drawn blue on the plan.
- **Surface restoration** in SF and SY.
- **Spec width.** Over a spec max width, the same quantities worked at the spec width are shown beside the actual
  ones, in the run panel and the report. The estimate lines carry the actual quantities.

**Estimate lines.** These are written per sheet, added up by utility type, material, size and range (Q9). The
run panel and the report keep each run's own figures.

**No double counting.**
- Where the start surface is the existing grade in a cut area, the part of the trench above the proposed
  subgrade is already in the site cut, so the trench does not count it.
- A trench stops at a structure's pit (§10.3).

**Exact volumes.** Volumes are exact between breakpoints (Q3, hard rule 3). The profile's table of stations every
5 ft is for reading only.

### 9.5 Display

- **On the plan.**
  - Runs are coloured by utility type, from new tokens.
  - Each is labelled with its size and material.
  - Stretches needing dewatering are drawn blue.
- **The profile.** A profile per run opens in the split pane. It shows:
  - the existing and proposed ground;
  - the invert and the crown;
  - the trench bottom;
  - every layer and the water;
  - the structures.

  Bands along the bottom show the protection method and the depth range.

## 10. Structures (Block 3)

### 10.1 Placing

- **The button.** A **Structures** button places one structure per click, as Spot does.
- **Storing.** Each structure is a takeoff item (Count, one mark) marked as a structure. It is filed under its
  utility type and kept out of Estimating's rows.
- **Types.** Each type has a default utility type; custom picks its own.

| Structure type | Default utility type |
|---|---|
| Sanitary manhole, cleanout, lift station or wet well | Sanitary sewer |
| Storm manhole, catch basin, curb inlet, area drain, junction box, headwall | Storm |
| Valve vault, meter vault | Water |
| Electrical handhole or vault | Electric |
| Telecom handhole or vault | Telecom |
| Custom | Picked |

### 10.2 Fields

| Field | Default |
|---|---|
| Shape | Round, with an inside diameter; or rectangular, with an inside L × W. |
| Wall thickness | Typed. |
| Rim | The proposed grade at the point; editable. |
| Floor, or sump | Typed. |
| Inverts in and out | The connected runs' ends, edited here or on the run. |
| Base slab thickness, base stone depth | Typed. |
| Over-dig | 2 ft each side. |
| Protection | The same rules as runs, with the soil at the structure. |
| Pit start surface | As for runs. |

### 10.3 What Calculate gives

- **Pit:**
  - excavation by layer;
  - base stone;
  - backfill, native or imported;
  - spoils.
- **Flags:** dewatering if the floor is below the design water; rock if the pit reaches rock.
- **Manholes:** vertical feet (rim less the lowest invert) and its depth range.
- **Counts** by type, size and depth range.
- **Connected runs.** They follow the structure's inverts.
- **Trench meets pit.**
  - A trench stops at the pit's bottom outline.
  - Its overlap with the pit's sloped sides is deducted: nothing is counted twice (plan §3.11).

## 11. Over-excavation and subgrade treatment (Block 4)

Today's Option 1 undercut (D-140, D-407, D-471) is extended; there is no second tool.

**Depth.** Three ways:
- a fixed depth below subgrade (today);
- down to the bottom of a layer (for example, all non-engineered fill);
- down to an elevation.

**Lateral extent.**
- An extension beyond the outline, default 5 ft.
- An outward slope, H per vertical foot below subgrade, default 0.
- With a slope, the excavation and the replacement both take the vertical-walled box at the full extent reached
  at the bottom (Q12).

**Replacement fill as a stack.** Materials from the bottom up, each with a thickness, the last taking the rest.
For example, Heinsohn's 3.5 ft of reconditioned native under 3.0 ft of select fill.

**What it gives.**
- Over-excavation by layer, in bank volume; unsuitable layers always go to export.
- Replacement fill by material, in compacted CY, with tons where a density is given.
- The over-excavation in the site balance.

**Only existing ground is removed.** The new modes remove existing ground only: from the undercut bottom up to the
lower of the existing ground and the subgrade. Today's fixed mode does the same (Q13); that fix is built first, in
Block 0.5.

**Treatment (Option 2, F25).**
- Kept: compacted, scarify, and stabilization with lime, cement and other agents.
- Added: **geogrid** and **geotextile**, each in SY with an overlap % (default 10 %, U-UT45).
- A treatment-only area is a Site Feature with no subgrade depth (Q14).

**Material notes.**
- Each material can carry a compaction % and standard (ASTM D698 or D1557).
- The note shows in the estimate line's notes and in the grading report.
- It is never used in a quantity.

## 12. Site balance (Block 5)

- **New lines:**
  - utility trench spoils;
  - structure spoils;
  - over-excavation spoils;
  - native backfill reused.
- **Suitable spoils** first reduce the site's import; what is left adds to the export.
- **Unsuitable, hard dig and rock** are always exported, never used as fill.
- **Imported materials** (bedding, pipe zone, imported backfill, select and replacement fill) are listed apart as
  materials, not as soil import.
- **Before and after.** The balance shows both columns, so the estimator sees the effect.

## 13. Estimating (Block 5)

### 13.1 Lines and sync

- **The lines.** Every line Calculate makes, with its name, unit, work scope and work type, is listed in the
  plan, §5.1.
- **Writing.** Lines are written in the same transaction as the result, keyed by sheet (or site), region, work
  type and variant.
- **Never the user's:** name and quantity. **Kept:** the row, its rates, notes and layer.
- **Placing by hand.** A folder, classification or scope placed by hand is never overwritten. "Move items to…"
  now counts as by hand, as a single move already does (built first, Block 0.5).
- **Rows Calculate no longer makes** (Q6, D-526; built first, Block 0.5).
  - A row with a price on it stays at zero, marked "Not in the last Calculate". It comes back with its rates if
    Calculate makes it again.
  - Estimating's sidebar filters to these rows, so they can be cleared in one go: filter, select all, Delete, one
    undo. A retired row can be deleted; Calculate's live rows still cannot.
  - A row with no price is removed, as today.
- **Unit costs** start empty, because the app has no price library to match.
- **Out of date.**
  - The flag is the earthwork results' own.
  - Estimating now shows the same "Needs recalculating" mark as the Takeoff panel (U-UT38; built first, Block
    0.5).

### 13.2 Classification through work scopes (Q4)

- **No codes in the feature's code.** The feature never writes a code. Each new line gets a work scope and a work
  type. Its code is what the project's classification system maps that pair to.
- **The mapping.**
  - **Where it lives.** The mapping is the workspace's, one per system.
  - **What a row says.** A row maps a work scope, an optional work type and an optional kind (a structure type or
    a restoration surface) to a classification node. The most specific row wins.
  - **Adding a system** needs no code change.
- **Default work scopes.** Made on first use. The user can rename them, and renames are kept, because a default
  scope is found by its key, not its name:
  - "Site Utilities — <utility type>" (one per type);
  - "Earthwork — Trench Protection", "Earthwork — Dewatering", "Earthwork — Utility Spoils";
  - "Earthwork — Over-excavation", "Earthwork — Subgrade Treatment", "Earthwork — Rock / Hard Dig";
  - "Site Restoration".
- **Default mappings, CSI only.** They use codes already in the CSI tree we ship, matched by title (plan §5.3). A
  missing code stays unmapped and is listed.
- **Other systems.**
  - Nothing is shipped.
  - Lines show their work scope and "Not classified in <system>" until the user maps the scope once (Settings ›
    Classification › Work scopes, or "Map scope…" on the line).
  - Every project using that scope then picks it up.
- **Hand classification.** A classification set on a line by hand is never overwritten.
- **Today's lines (Q5, D-526).** The 24 lines Calculate already writes move onto work scopes too. Their mappings
  reproduce today's codes in all five systems, so nothing moves.
  - **Duplicates first.** It is built on a duplicate first. Every project total, rate and line count is proved
    unchanged before and after, on duplicates only.
  - **No backfill.** No migration writes to existing lines: a line takes its scope on its next Calculate. Founder
    projects are never touched.

## 14. Folders

- **On first use** a custom folder **Utilities** is created, with a subfolder per utility type used: Sanitary,
  Storm, Water, Fire, Gas, Electric, Telecom, Subdrain, Other. A force main files under Sanitary.
- **What goes in.** Runs, structures and their estimate lines go in their type's subfolder.
- **Found by key, not name.** Folders are found by a key, so the user's renames and moves are kept and never
  reset.
- **A deleted folder** is made again on the next Calculate, as "Earthwork" is today.
- **Other new lines.** Over-excavation, treatment, rock and site-balance lines go in the existing "Earthwork"
  folder (D-409, D-410).
- **Classification tree.** In the classification tree, each new line sits in its own code's folder.

## 15. Guest view (F28)

- **Visible, read only:** bores, soil layers, runs, structures, the profile, the cross-section, the 3D layers and
  the report sections.
- **Greyed** with the standard tip ("Sign up for Professional to use this.", D-508): the Bores, Utilities and
  Structures buttons and every field.
- **Pricing.** The pricing rules apply as today. No money is shown in these panels.
- **Server.** The new routes sit under the project's earthwork path, which a guest may read. Any write is refused
  with 403.

## 16. Grading report

**New sections.**
- **Bores and soil layers:**
  - the "your assumption" note;
  - the bores with their readings and design water;
  - the layers and their properties;
  - the slope rule used, with its source;
  - the clamps.
- **Cut by material:** a table by layer.
- **Utilities:**
  - each run: type, pipe, length, depth-range LF, excavation by layer, bedding, zone, backfill, protection,
    dewatering, rock, restoration and flags;
  - each structure: type, size, vertical feet, range, pit quantities and flags.
- **Over-excavation:** each feature, with its mode, its layers, its replacement stack and its treatment.

**Excel and plan.**
- **Excel** gains the sheets Bores, Layers, Utilities, Structures and Over-excavation.
- **The plan pictures** gain a utilities plan.

## 17. Units

- **Entry follows the sheet's unit (D-398):** elevations, depths, inverts and thicknesses.
- **Display follows the project's system** (D-374, D-379):
  - LF to m; SY and SF to m²;
  - CY, BCY, LCY and CCY to m³, BCM, LCM and CCM;
  - TON to tonnes;
  - pcf to kg/m³.
- **Pipe sizes** keep their nominal inch names and show their OD and ID in mm on a metric project.
- **Vertical feet.** A new unit, **VF**, shows as m (vertical) in metric.
- **Default depth ranges in metric:** 0–2, 2–2.5, 2.5–3, 3–3.5, 3.5–4, 4–5 and 5+ m (U-UT28).
- **Storage.** Everything is stored imperial, as today.

## 18. Messages, in one place

| Where | Text |
|---|---|
| Bores panel banner | Bore data is your assumption for estimating. Geotech logs show conditions at the bore locations only. |
| OSHA suggestion | Suggested: C — change if your geotech report says otherwise. |
| Geotech row steeper than OSHA | Steeper than federal OSHA — confirm with the geotech report and your state's rules. |
| Benching refused | Benching isn't allowed in this soil. |
| Over 20 ft | Over 20 ft — protection must be designed by a registered engineer. |
| Layer out of order | Sand is above Clay in the Soil layers list. Move it in the list, or add a new layer. |
| No bores | No bores: Type C assumed. |
| No water | No groundwater in any bore. |
| No geotech row | No geotech rule for Clay at 9.0 ft: federal OSHA used. |
| Bore off the surface | No existing surface here: type the ground elevation. |
| Clamp | Clay kept under Fill over 555.56 SF, up to 2.00 ft, near TP-4. |
| Unmapped line | Not classified in NRM2 |
| Retired priced row | Not in the last Calculate |
| Grade from rims | Grade from rims: no surface here. |
| No proposed surface | No proposed surface: trench from existing grade, 0+00 to 0+40. |
| What set the width | Width 36 in — bucket |
| Over the spec width | Wider than spec max — pay width may be limited |
| Box not set | Box width not set: pick a box or type its outside width. |

Where a message has an em dash, it is the founder's wording for UI text. Existing earthwork line names use the
same " — " form.

## 19. Out of scope

- **Ground behaviour.** Expansive movement (PVM), collapse, liquefaction, karst, mines and buried obstructions are
  flags and notes only.
- **Report rules not computed.** Design rules tied to the water (no proof roll within 1 ft of water, a slab at
  least 4 ft above water) and influence lines from existing foundations are not computed.
- **Footings.** Footings are not modelled. A footing's over-excavation is entered as a Site Feature strip.
- **Trench-to-trench overlaps.** Overlaps where trenches cross, or where two runs leave one structure, are not
  deducted; they are listed.
- **Compound walls.** A compound wall, with each layer at its own slope, is only built for stable rock under soil
  (Q11).
- **Placing by coordinates.** Bores are not placed from latitude and longitude.
- **Pricing.** No prices are matched: no price library exists.
