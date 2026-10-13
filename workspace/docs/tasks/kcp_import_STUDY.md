# Import earthwork project (.kcp): a study

_Study only, 2026-10-13. No code. Read with [kcp_input_comparison.md](kcp_input_comparison.md),
which takes one such file apart and runs its inputs through our engine. The file is another
program's project file. Its name stays out of the repos (rule 9). The feature is called
**"Import earthwork project (.kcp)"**._

**The ask.** An estimator has a `.kcp` from another tool (a sub's, a previous bid, their own
history) and wants it as a **new** IntelCost project: its sheets, its existing and proposed
surfaces, its features and its strip, placed exactly, checked by eye, then calculated by us.

**In short.**
- **It is feasible.** The format is plain: a zip of XML in metres, plus the drawing pages as PDFs,
  each with its placement.
- On the one file we have, every input maps except two kinds, both in the decisions list (§10):
  - fixed-level slab platforms;
  - "proposed tied to ground at the limit".
- **About 31 hours over 7 blocks** (§11).
- **The main risks:**
  - client drawings arriving inside a file (§12);
  - their inputs breaking our engine's rules, which happened three times in this one file
    (§5.4).

---

## 1. What the file is

A zip of seven entries on our sample (4.5 MB):

| Entry | What it holds |
|---|---|
| `root.xml` | Header (`FileType`, `Version="7.3.8992.25276"`, `UniqueID`); the **existing ground** (`TerrainDefinition`: `ContourLines`, `BreakLines`, `TerrainPoints`, `ManualOutlines`, a cached `PolygonMesh`); **`SitePlans`**, one per drawing page, each with its file, page number, source hash and **four corners in metres**; shading tables; vertical exaggeration |
| `phases/1.xml` | "Existing": cameras, display options, a cached output mesh |
| `phases/2.xml` | "Proposed 1": a `Reduce` "Remove (6" Thk) Topsoil", 0.1524 m from Ground over a drawn rectangle |
| `phases/3.xml` | "Proposed 2": a `FeatureSurface` "Features" (proposed contours, `DefineBy="Levels"`, outline `LevelType="Ground"`); two `Platform`s (`DefineBy="Level"`, a fixed level); five `Reduce`s (`DepthsFrom="SpecifiedElement"` Features, a depth) |
| `Images/*.pdf` | The drawing pages, one page each, as referenced by `SitePlan FilePath` |

- **Coordinates:** metres in one project frame, y up.
- **Levels:** metres (`Level`, and `Z` per point).
- **The cached meshes and shading:** outputs, not inputs. We read none of them.

## 2. Version check

- **Read first:** `ProjectData@FileType` and `@Version`.
- **Accept:** the major.minor versions we have samples of (7.3 today).
- **Refuse anything else,** in plain words: "This file is from version X of the program; IntelCost
  reads 7.3. Save it from 7.3, or send it to us." Never guess at an unknown schema.
- **Also refuse when** an element we don't know appears under `DesignElements`. List it by kind
  rather than dropping it silently.
- **Keep a corpus** of real files per version as the reference (D-328: the files, never their name,
  in a private bench folder like `E:\bench-fixtures`).

## 3. Sheets from the embedded pages

- **One sheet per `SitePlan`.** Its PDF goes through our normal upload and load path (F5, D-41):
  - the worker splits and renders it;
  - the sheet is named from the PDF's own title block (F14 naming, with no AI by default), else
    from `SitePlan@Name` + page.
- **Source hash** (`SourceFileHash`): if the project already has a file with that hash, offer to
  reuse its sheet. This matters when the estimator also uploaded the bid set themselves.
- **Rotation:** the survey page is 1728 × 2592 pt portrait, placed 658.37 × 438.91 m landscape, so
  it is turned 90°. We take the turn from the placement's aspect against the page's and store it
  as the sheet's `view_rotation` (P-20a). Coordinates never change.
- **Visibility:** `IsVisible` decides which sheet opens first; the others still load.

## 4. Placement, with a proof

- **Corners to calibration.** Each `SitePlan Position` gives the page's four corners in metres, so
  one page point is (corner span ÷ page size) metres. Our sample:

  | Page | Size (pt) | Placed (m) | Per point | Scale |
  |---|---|---|---|---|
  | C-200 | 2448 | 310.896 | 0.127 m | 0.41667 ft, **1" = 30'** |
  | Survey | 2592 | 658.368 | 0.254 m | 0.83333 ft, **1" = 60'** |

  The calibration is written as a scale (feet per point, D-51) and named against our 63 presets.
  When it matches one within 0.1 %, the preset's name is used.
- **Corners to a frame.** Each sheet's page-fraction ↔ metre transform is the inverse of its
  corners (with the turn). Every element maps into the sheet whose placed page contains it. Where
  several do (C-200 and the survey sheet overlap), the visible page is used, else the finer scale.
- **The proof, measured and shown.** A placement is only as good as its match to the drawing, and
  we have two independent checks:
  1. **Line art.** The F18 link's `matchScore` (`register.ts`): the share of the imported contour
     vertices lying within 3 pt of the PDF's own vector lines on that sheet. A trace of the
     sheet's contours scores high; a wrong page or a mirrored placement scores near zero.
     Proposed: refuse under 30 %, warn under 60 %.
  2. **Paper size against scale.** The placed width over the page width gives a standard scale (as
     in the table). An odd figure (e.g. 1" = 31.7') means a scaled print and a warning.
- **What the sample shows.** Mapped onto our own hand-drawn C-200, the slab outlines overlap our
  Building Pad at IoU **0.991** and Heavy Duty Concrete at **0.986**, so the frames agree to about a
  foot ([comparison §1](kcp_input_comparison.md)). An import of this file would land within that.

## 5. Mapping

### 5.1 Element by element

| Their element | Ours | Notes |
|---|---|---|
| `root TerrainDefinition` contours | **EG contours** ("Existing Ground"), one run each; `Level` m → ft | On the sheet the trace sits on (survey, 1" = 60'). C-200 reads it through an **F18 link** with offset 0 (the two placements give the link's fit directly, no clicking) |
| … `TerrainPoints` | **EG spots** | None in the sample |
| … `BreakLines` | **EG contours** at each point's own level | Our contours are single-level, so a sloping breakline is split per segment or refused; none in the sample |
| … `ManualOutlines` (Automatic) | None | Their EG extent (283,208 SF). It drives their surface past the contours; ours stops at the hull (decision 3) |
| `FeatureSurface` contours | **FG contours** ("Proposed Grade") | |
| … outline `LevelType="Ground"` | **Work Boundary** (the limit), plus optional FG spots at existing level along it | The spots model their "ground tie" (decision 2) |
| `Platform DefineBy="Level"` | A **Site Feature** + a closed FG contour at the level, depth ~0 | No fixed-level feature in our model (decision 1). This is how the comparison modelled it, within 0.07 ft |
| `Reduce DepthsFrom=SpecifiedElement(Features)` | **Site Feature**, `role_depth_ft` = Depth (m → ft), one shape per outline | Depth below proposed, as ours. `Slope` and `SideBatterMode` must be 0/Off, else listed as not imported |
| `Reduce DepthsFrom=Ground` in an earlier phase | **Strip Area**, "drawn", its outline, its depth, haul off by default | Clipped to the boundary by our engine. Theirs reaches its EG extent; the review says so |
| Phase order | Feature `created_at` order chosen so the **first in their list wins** an overlap, as in theirs | Our newest-wins rule then gives their attribution exactly (it moved 0.09 CY in the sample) |
| Colours | The item's colour, nearest to our palette | |
| Names | As in the file ("Heavy Duty Asphalt Pavement") | |

### 5.2 Units

Their levels in metres become stored feet (× 3.280839895, D-136 Q5). Depths go from metres to
feet. The project's measurement system follows the file only if the founder decides so
(decision 5).

### 5.3 What doesn't map, said plainly

- Side batters and slopes on a reduce.
- Sloping breaklines.
- Their shading, cameras and cached meshes.

Each appears in the review (§6) as "not imported", with the element's name.

### 5.4 Repairs, each shown

Their engine accepts inputs ours refuses. In this one file there were three:

1. **A self-crossing contour.** A 697 ft loop whose last segment crosses its first. Repair: drop
   the vertex past the crossing.
2. **Near-closed loops.** Seven contours whose last vertex stops 1.7 cm to 10 cm short of their
   first. Repair: close them exactly.
3. **Vertices on the other surface's lines.** Twelve existing/proposed vertices within 1.5 cm of a
   line of the other surface (their tool snaps them). Repair: move them 5 cm clear.

Every repair is listed in the review with its place, distance and a jump. **Nothing is repaired
silently.** Each repair moves less than our 0.05 ft merge tolerance, except the dropped vertex
(< 0.1 m).

## 6. The review overlay

The import ends on the new project's grading sheet in a **review** state, before anything counts:

- **Every imported run drawn in a review style** (the ghost runs of the link editor, D-297),
  coloured by surface, over the sheet. This is the eye check of §4.
- **A review panel:**
  - the placement score per sheet with its scale;
  - counts per kind (contours, spots, features, strips) against the file;
  - the repairs, each a row that frames its place;
  - "not imported", by name;
  - the decisions taken on platforms and the ground tie.
- **Accept** files everything as ordinary items (Earthwork containers, Site Features, Strip Areas,
  with undo as one step) and runs Calculate. **Discard** deletes the new project.
- **A totals note:** the file stores no volumes, so there is nothing to compare automatically. If
  the estimator types the other program's totals, the review shows the gap and links the
  [comparison method](kcp_input_comparison.md#4-the-gap-step-by-step-through-our-engine)
  (inputs vs method).

## 7. Where it runs

- **On the api (Python), in a Celery task.** Parse with `defusedxml`; never `xml.etree` on
  untrusted input (entity expansion, external entities). Check the zip before inflating:
  - entry count ≤ 64;
  - total inflated ≤ 200 MB;
  - ratio ≤ 100:1;
  - no path traversal in names.
- **The PDFs go through the existing upload path** (S3, the page worker).
- **Items are written through the same services the app uses**, so lock, realtime and audit
  behave as for drawing. It is one job with progress, like Duplicate project (D-349).
- **The browser shows the review** and calls Accept or Discard.

## 8. Naming and placement in the app

- **Where it lives:** "Import earthwork project (.kcp)" in **New project**, beside the drop zone,
  and in the All projects dialog.
- **Accepted file:** `.kcp` only.
- **Copy:** generic throughout ("another program's project file"). Never the program's name, its
  wording, or its labels (rule 9, D-328).

## 9. Tests (speed mode)

- **No suite** (D-70, D-78).
- **New quantity-table rows** for the mapping maths:
  - corners → feet per point;
  - the 90° turn;
  - metres → feet for levels and depths;
  - the repairs on a small synthetic file built in the row, never the client file.
- **One smoke through the Playwright MCP** on a private sample (never in a repo): import, review,
  accept, calculate.

## 10. Decisions for the founder

1. **Fixed-level platforms.** Model them as a Site Feature plus a closed FG contour at the level
   (works today; how the comparison did it), or add a "platform at a level" option to Site
   Features (new behaviour, about 6 h more)? **Default: the contour route,** shown as such in the
   review.
2. **Proposed tied to ground at the limit.**
   - **Option (a):** import as FG spots at existing level along the boundary every 3 m. This gives
     their coverage, and moved 34 CY of cut and 55 CY of fill in the sample.
   - **Option (b):** leave it out, and show it in "not imported".

   **Default: (a), listed as a repair-like row the estimator can remove.**
3. **Their existing extent past the contours.** We don't extrapolate (D-422 7). **Default: not
   imported, said in the review.** It was worth 437 CY of cut in the sample (comparison M3).
4. **Topsoil over their EG extent or our boundary?** **Default: our boundary,** with their area and
   the difference stated in the review (1,602 CY in the sample).
5. **Measurement system of the new project:** the workspace's, or metric because the file is in
   metres? **Default: the workspace's;** stored values are feet either way.
6. **One phase or several?** Their "Proposed 1 / 2" phases map to one sheet's inputs. **Default:
   merge,** first phase's strip, last phase's features.

## 11. Effort

| Block | What | Hours |
|---|---|---|
| K-1 | Upload, zip and XML safety, version check, element inventory (api) | 4 |
| K-2 | Sheets from the embedded PDFs through the load path; hash reuse; turn | 4 |
| K-3 | Placement: corners → scale and frame; the line-art score and the scale check | 4 |
| K-4 | Mapping and repairs (surfaces, features, strip, link, order, units) | 8 |
| K-5 | The review overlay and panel; Accept (one undo) / Discard | 6 |
| K-6 | Decisions 1 and 2 as chosen; quantity-table rows | 3 |
| K-7 | Smoke on a private sample; docs | 2 |
| | **Total** | **~31 h** |

## 12. Risks

- **Client drawings inside the file.** The PDFs are someone's drawings. Treat them like any upload
  (the project's storage, the workspace's access). Never keep a copy for debugging, and never
  commit a sample (this study's own rule).
- **One sample.** All of the mapping above rests on one file of one version. Other files will use
  breaklines, terrain points, slopes, batters and more phases. K-1's inventory must refuse loudly
  what it doesn't know, and the corpus (§2) needs more files before release.
- **Their inputs break our rules** (§5.4). Three kinds in one file. Expect more, and keep every
  repair visible and reversible.
- **Coverage expectations.** Their surfaces reach farther than ours by design (§10, decision 3). An
  imported project's totals will differ for that reason alone. The review must say so before
  anyone compares numbers.
- **Large files.** The XML is small (1.8 MB here), the PDFs dominate. The load path already
  handles large sets, so the risk is low.
- **Naming.** Rule 9 applies to code, copy, fixtures and commits. The extension `.kcp` is the only
  identifier we use.
