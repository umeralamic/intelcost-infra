# Overnight report, 2026-10-08

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:29 UTC. Updated after every step. The
previous run's plan and report are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-07.md`.

| Step | State |
|---|---|
| 0.1 Browser tool on host Chrome | done |
| 0.2 Bucket CORS (D-259) | done (resolved; nothing to remove) |
| 1.1 "billed annually" | done |
| 1.2 Assembly crews at the project's rates | done (D-298) |
| 1.3 D-292 approved | done |
| 1.4 Delete "EW Typo Check" | done |
| 2 Marketing screenshots and the earthwork section | done |
| 3 Auto Count Part 1, accuracy | done (D-299); memory under 500 MB not met (1,215 → ~800 MB) |
| 4 Auto Count marketing shot, build, Pass 5 | not started |
| 5 Auto Count Part 2, speed | not started |

## Step 0. Checks

1. **Browser tool: works, no fix needed.** The Playwright MCP launches Chrome 155 on this Windows
   host (`--isolated` profile) and drives the bench app at `localhost:5173`. Its WebGL renderer
   is the host GPU (Intel UHD Graphics 630 through Direct3D 11), a WebGPU adapter is present
   (intel gen-9), 12 logical cores. Every timing and memory figure in this report is from it.
   Mail guard: on (`MAIL_GUARD=true` in the api).
2. **Sheet bucket CORS (D-259): resolved.**
   - A preflight from `http://localhost:5173` now answers GET, PUT, HEAD, with `content-type`
     allowed and `ETag` exposed (5175, the prod profile, is still refused).
   - In host Chrome as a throwaway account: a new project with E101's PDF uploaded through New
     project (the parts PUT straight to S3, the upload completed, pages ready), then opened in
     takeoff (the fit image and the PDF on presigned GETs, 200, and the sheet drew). E200 was
     uploaded the same way later.
   - D-259 records it as resolved, and `docs/flows.md` marks the S3 CORS step done on the bench
     bucket (the production origin is still to add).
   - **The harness workaround:** last run's harness that fetched bucket files itself (for port
     5175) was never committed, so there was nothing in any repo to remove. The marketing
     capture's `SHOTS_S3_MIRROR` is a different thing and stays: Hidden Valley Spec's sheet
     objects are not in this bucket (checked: `object_size` is empty for its sources and fit
     images), so the mirror stands in for missing objects, not for CORS.

## Step 1. Small app items

1. **"billed annually": done.** The only place the cadence is put into words is the signup
   subtitle ("Starting on Professional, billed annual, 3 seats."); it now says "billed
   annually", and "billed monthly" is unchanged (both checked in the browser). Checked and
   already right or not applicable: Settings › Billing ("Billed: Annually"), the plan picker's
   Monthly / Annual switch, the marketing price page ("billed annually"), the platform pages
   (staff), and the emails and receipts (no template prints the cadence; receipts are
   Stripe's). App commit `e96e077`.
2. **Assembly crews priced at the project's rates: done (D-298).**
   - **Stored:** an assembly's crew keeps its makeup only (crafts, how many, the crew it came
     from); production stays on the component. The api strips wages on every template write.
   - **Applied** (Use on sheet, Link, Seed from…): each craft row lands following the
     project's saved rates, exactly like Add crew in a labor component, and follows later wage
     sets. With no saved set it is $0 until rates are saved (what a direct crew gets; no other
     fallback). A craft from the other wage table takes the project's craft of the same name.
   - **Editor:** "Priced at the project's rates" instead of the wage cells; Add crew and Add
     craft pick from the workspace catalog (Commercial or Residential crafts); a new labor
     component starts empty; labor shows hours and "at the project's rates", no dollar figure.
   - **Existing assemblies affected: 0** on the bench (3 assemblies, none with a cost
     component). The migration (`c7d1e9a3b5f2`) reported "0 components".
   - **Before and after** (throwaway project, national-average commercial rates for 43215; an
     assembly with 2 Electrician + 1 Laborer at 0.5 EA/hr applied to a 12 EA count item; the
     labor component was sent with typed wages $99 and $11 to prove they are dropped):

     | | Electrician | Laborer | Crew rate | Total Labor Cost (Estimating) |
     |---|---|---|---|---|
     | Applied | $86.32 | $61.61 | $234.25 | **$5,622.00** (24 crew-hours) |
     | Electrician saved at +$5 | $91.32 | $61.61 | $244.25 | **$5,862.00** |

   - Gates: ruff, mypy; typecheck, lint, build; quantity table passed (329 rows).
   - Commits: api `3417c06`, app `106d684`.
3. **D-292's allowance: approved.** Marked in D-292 item 2's status line.
4. **"EW Typo Check": deleted.** It was in "Bench Construction" (not a founder workspace),
   created by the throwaway smoke account on 2026-10-08 00:17; deleted and then purged
   (permanently) as that account.

## Step 2. Marketing screenshots and the earthwork section

Run by a background agent in parallel with Step 3, through the existing pipeline
(`scripts/screenshots/`) with its own headless Chrome, so the host Chrome used for the Auto Count
timings was not shared. I checked its work afterwards (below).

| Shot | State | Notes |
|---|---|---|
| a. excel-export-workbook | captured | The Office Building exported through the app, opened in Excel 16 by COM, D6 (Concrete) selected so the formula bar shows `=D5*Dimensions!C6/27*1.05`; Base Bid, Dimensions and Bid Summary tabs visible; 1440×900 at 1× (a 2880-wide Excel window shrinks the ribbon), manifest size updated. **It found an app bug:** subcontract lines with no labor showed `#VALUE!` in Total Man Hours (an empty number written as empty text). Fixed in Step 3's app commit: empty numbers are written as blank cells. |
| b. wage-calculator-sam-gov-upload | captured | New project "Marketing Demo – Federal Building", Prevailing Wage, Federal (Davis-Bacon); the Wage data step with the SAM.gov card; nothing uploaded. |
| c. earthwork-cut-fill-map | captured | "Marketing Demo – Site": V-100 and C-200 uploaded fresh, the Rebid's earthwork rebuilt through the api routes from SELECTs of the source (contours, spots, boundary, site features, strip area, the V-100 → C-200 link, scales, assumptions); every item's vertices and shape_meta identical by md5. Calculated on the copy only; Isochore on, coverage shading off. Title block, firm contact and road name redacted. |
| d. earthwork-estimate-lines | captured | The Division 31 lines, cropped to the grid (x 224–1440, y 40–560 CSS). |
| e. projects-dashboard | captured | Eight invented projects (Riverside Medical Office Building, Eastgate Retail Center Sitework, County Maintenance Facility, Lakeview Elementary School Addition, Harbor Point Apartments Phase 2, Northside Fire Station No. 4, Westfield Distribution Center, Oakridge Clinic Tenant Fit-Out): Won, Lost, Submitted, Waiting on Quotes, Bidding; bid dates; invented assignees. The founder's projects have no bid date and sort below the fold. Email banner hidden. |
| f. takeoff-split-view | captured | A101 left, A601 as the reference. The reference picker is a menu button (`[data-reference-picker]`) with menu items, not options: why pass 2 failed. Both title blocks covered. |
| auto-count-tag-variants | Step 4 | |

**The earthwork section** (all on the Site copy): a deliberate typo (698 typed as 689) captured as
the blue contour with its hover reason ("Entered 689 — neighbors are 697 and 699") and the
Volumes panel's warning, then put back to 698 and calculated again (0 warnings). "Compare without
topsoil strip" and the coverage shading were captured too. New images in the manifest with final
alt text: `earthwork-elevation-flag`, `earthwork-elevation-warnings`,
`earthwork-compare-without-strip`, `earthwork-coverage-shading`. /features/earthwork-cut-fill gained
three sections (catch elevation typos before they reach your numbers; compare to an engineer's
table that leaves out stripping, without counting topsoil twice; see where the contours stop short
of the boundary) and three FAQs; /solutions/civil-sitework mentions the elevation check. No
accuracy, speed or volume claim, and no Hidden Valley.

**Created** (workspace "F5 Block A demo 15:16"): the eight projects above, "Marketing Demo –
Federal Building", "Marketing Demo – Site", and two demo members, Dana Mercer and Luis Ortega
(throwaway `fx.mktdemo.*` accounts added by invitation; their mail captured by the guard). The
Office Building's assignee is now Dana Mercer.

**My checks:** I viewed the elevation-flag, dashboard and split-view images (redaction and content
right), read the new copy, and queried the founder projects: their latest change to any project,
sheet, item, geometry, strip area or cost component is from 00:53 UTC, before this run began.
The agent's gates passed (lint, typecheck, build with placeholders allowed, link check).

**Commits (marketing):** `28bc931` (the shots and the pipeline), `99454b5` (the earthwork section).

## Step 3. Auto Count, Part 1: accuracy

### The test bed (host Chrome)

- Throwaway workspace "Overnight AC 1008" (account `fx.overnight.1791423387@bench.intelcost.io`):
  project "AC E101 copy" (E101's one-page PDF from Hidden Valley Spec Building Rebid) and "AC
  E200 copy" (Waxing City's only page), both copied out by reading their stored sheet sources;
  the founder projects were not opened in the app.
- A throwaway harness (never committed) runs the app's own scan modules in the page and the
  panel's result step, and scores every candidate against ground truth read from the sheets:
  E101 office: 68 "A" tags in the office plan; E101 "C": 24 "C" + 2 "C/NL" in the shop-bay plan;
  E200: the 2×4 panel rectangles in the plan, 12 hatched ("A") and 6 empty ("A1"), told apart by
  the hatch strokes inside. All four counts came out exactly as expected.
- Samples: office, a tight box round one A8 fixture with its "A"; "C", the circle and its tag;
  E200 A and A1, a tight box round one plan fixture of each. **Two more E200 samples were added**
  after seeing your numbers: the schedule's own small A and A1 symbols. Vector matching is
  scale-invariant, so a schedule sample finds the plan fixtures at 83–89 % and also the sheet's
  lettering, which fits your "655 checked, the 12 only at 92–98 %".
- Memory: private bytes of Chrome's renderer and GPU processes, sampled every second from
  Windows (the workers live in the renderer). The renderer idles at 293 MB on this page.

### Before (the code at the start of the run)

Vector, checked right / wrong, suggestions shown, missed:

| Test | Time | 38 % | 70 % |
|---|---|---|---|
| E101 office | 5.4 s | 68 / 0, 8 suggestions, 0 missed | 68 / 0, 8 suggestions |
| E101 "C" | 2.4 s | 24 C / 0, C/NL 2 missed | 23 C / 0, 1 C and both C/NL missed |
| E200 A (plan sample) | 2.6 s | 12 / **11 wrong**, 5 suggestions | 12 / 0, 3 suggestions |
| E200 A1 (plan sample) | 2.2 s | 6 / 1 wrong | 6 / 0 |
| E200 A (schedule sample) | 3.8 s | 12 / **51 wrong** | 12 / 1 wrong (the schedule symbol), 10 suggestions |
| E200 A1 (schedule sample) | 2.9 s | 5 / **10 wrong**, 1 missed | 5 / **4 wrong**, 1 missed |

Why: the checked set was every match at or above the slider, so a slider left at 38 checks
everything from 38 up. The two C/NL were scored as untagged (×0.35, 16 %): their tag is read
only when the word's centre is inside the match's box, and "C/NL" is wider than "C".

Image (one scan serves both sensitivities; 6 workers; renderer peak memory):

| Test | Time (first results) | 38 % | 70 % | Renderer peak |
|---|---|---|---|---|
| E101 office | 178 s (50 s) | 68 / 0 | 68 / 0 | 906 MB |
| E101 "C" | 83 s (29 s) | 24 / 0, C/NL 2 missed | 24 / 0, C/NL 2 missed | **1,215 MB** |
| E200 A (plan sample) | 691 s (194 s) | 12 / **7 wrong** | 12 / 0, 4 suggestions | 1,192 MB |
| E200 A1 (plan sample) | over 1,500 s (stopped at the 25-minute cap, 542 s to first results) | 6 / **3 wrong** | 6 / **2 wrong** | 1,200 MB |

(The first E200 A1 Image baseline was killed by a fault in my harness, an earlier test's safety
timer stopping the shared worker pool; the row above is the rerun, still on the old code.)

### What changed (D-299)

1. **The slider opens at 70 % on every run and is never remembered** (Q8 superseded). Its stored
   value is read and ignored, and the panel no longer saves it.
2. **The checked set is the run's own** (`lib/takeoff/autoCount/review.ts`, shared by the panel and
   my measurements): the valley is the first gap from the top, among scores ≥ 60 %, that is at least
   70 % of the run's largest gap; everything above it is checked. Only matches of the reference
   match's drawn size (area within 2.6×) can be checked, and the sample's own match is left out of
   the gap and counted only when it is that size (a schedule or legend sample is not counted).
3. **Sensitivity only widens or narrows the suggestions**: unchecked matches at or above it, best
   first, at most 5; it never lowers the checked bar.
4. **Lettering is never checkable**: in Vector, a window whose strokes are mostly glyph-sized is
   pruned before it is scored (unless the sample itself is lettering-like). On E200 that is most
   of the windows (5,207 for the A1 plan sample, 1,733 for E101 "C").
5. **The C/NL fix**: a tag is read from a word whose first letter is in the match's box, not only
   one whose centre is ("C/NL" is wider than "C").
6. **Quick wins**: Auto mode (a box with no vector linework switches to Image and says so; Image on
   a vector sheet shows "This sheet has vector linework: Vector mode is faster and exact here." with
   Use Vector); a Stop button ("Scan stopped after pass N of M"); Threads in the gear's Image
   section (Auto, 2–16); Essentials' region menu shows Auto Count disabled with "This is on the
   Professional plan."
7. **Image memory**: no worker holds a page any more. Both pages stay packed on the main thread
   (8 pixels a byte); each pass's variants go to every worker once (prepared templates cached);
   the shortlist's bands and the fine pass's crops round the shortlist are unpacked and sent one at
   a time per worker, each scored into one reused integral buffer, and hits come back without the
   scorer's components. Every Image result is identical to before: the raw candidates are the
   same on all four tests (office 1,195, "C" 82, E200 A 212, E200 A1 80).
8. **Step 3.5 (an OpenCV "looks the same" check in Vector) was not needed**: Vector reaches 12 / 0
   and 6 / 0 at the default (and at every slider value) with steps 2 to 4, so Vector stays pure
   geometry.
9. Found on the way and fixed: the Excel export wrote an empty number as empty text, so Excel
   showed `#VALUE!` in Total Man Hours on subcontract lines (reported by the marketing capture).

### After

Vector, checked right / wrong, suggestions shown, missed, at every slider value:

| Test | Time (warm) | 20 % | 38 % | 50 % | 70 % | 85 % | 95 % |
|---|---|---|---|---|---|---|---|
| E101 office | 2.8 s | 68 / 0, 5 sugg | 68 / 0 | 68 / 0 | 68 / 0 | 68 / 0 | 68 / 0 |
| E101 "C" | 1.4 s | C 24 + **C/NL 2** / 0 | same | same | same | same | same |
| E200 A (plan) | 3.1 s | 12 / 0, 4 sugg | 12 / 0, 1 sugg | 12 / 0 | 12 / 0 | 12 / 0 | 12 / 0 |
| E200 A1 (plan) | 1.1 s | 6 / 0, 5 sugg | 6 / 0 | 6 / 0 | 6 / 0 | 6 / 0 | 6 / 0 |
| E200 A (schedule sample) | 3.1 s | 12 / 0, 4 sugg | 12 / 0, 3 sugg | 12 / 0, 1 sugg | 12 / 0 | 12 / 0 | 12 / 0 |
| E200 A1 (schedule sample) | 2.6 s | 5 / 0, 1 missed | 5 / 0, 1 missed | 5 / 0, 1 missed | 5 / 0, 1 missed | same | same |

**Targets (at 38 % and 70 %, at most ~5 suggestions):** office 68 / 0 met; "C" 24 + C/NL 2 / 0
met; E200 12 / 0 and 6 / 0 met with the plan samples, and 12 / 0 with the schedule's A. One gap:
from the schedule's A1 sample one of the six plan A1 fixtures is not found (no wrong one).

**Waxing City (E200) Vector cold**, no stored index, fresh page: 5.1 s and 3.7 s for A1 (index
build 3.4 s and 2.0 s in the worker), 12.2 s for A on the very first cold run of the session (the
index worker's first load of pdf.js under the dev server, 9.0 s), 6.7 s on a second cold run
(index 3.7 s). Warm: 1.1 s (A1) and 3.1 s (A). **Under 5 s: met warm and for A1 cold; A cold
misses it by the index build**, which in the panel runs in the background 1.5 s after the sheet
opens, so a person opening Auto Count a few seconds after opening the sheet finds it ready. The
index read is already inline when nothing is stored (the scan waits on the build in flight,
never a second one).

Image (6 workers unless stated; identical raw candidates to before on every test):

| Test | Before: time, peak | After: time (first results), peak | After 38 % | After 70 % |
|---|---|---|---|---|
| E101 office | 178 s, 906 MB | 179 s (50 s), 571 MB | 68 / 0 | 68 / 0 |
| E101 "C" | 83 s, 1,215 MB | 72 s (24 s), 757–823 MB over four fresh runs | 24 / 0, C/NL 2 missed | 24 / 0, C/NL 2 missed |
| E200 A (plan) | 691 s, 1,192 MB | 580 s (173 s), 636 MB | **12 / 0** (was 7 wrong) | 12 / 0 |
| E200 A1 (plan) | 1,500 s+ (cap), 1,200 MB | 1,785 s (419 s), 523 MB | **6 / 0** (was 5 wrong in its review) | 6 / 0 |

- **Memory under 500 MB on "C": not met.** It went from 1,215 MB to about 800 MB. The page data
  no longer lives in the workers (the main thread holds both pages packed, a few tens of MB), and
  the main thread's own JS heap peaks at about 220 MB, 150 MB of which is the dev-server app
  itself. What remains is the six worker isolates: their heaps grow with the scorer's allocation
  and do not shrink back between passes (3 workers: about 690 MB). The next lever is the scorer's
  per-window allocation (a Coverage object per offset), which needs care under the
  identical-results rule; a production build should also be lighter than the dev server, but the
  bucket's CORS refuses the prod profile's origin (5175), so I could not measure it.
- **Threads** (office, Image): Auto (6) 179 s, 8: 161 s, 12: 157 s, 16: 157 s; peaks 571, 661,
  685, 779 MB. On this 12-thread machine there is nothing past 8.
- The E200 A1 Image result came from re-reviewing that run's saved candidates under the final
  rule; every other Image row was scanned with the final code.

### In the panel (host Chrome, the E101 copy)

Box round the "C" sample, region menu, Auto Count: done in **2.2 s**, slider at 70, "2 items, one
per tag: C 24 · C/NL 2", Create (26). Slider to 38: still 26 checked. Mode Image: the Vector hint
showed; Stop after the first pass: "Scan stopped after pass 1 of 4. The remaining orientations
were not searched." The gear's Image section lists Threads Auto, 2–16. Closed and reopened: the
slider was back at 70 and the mode Vector. On Essentials (the throwaway workspace given an active
Essentials row for the check, removed after), Auto Count is disabled with "This is on the
Professional plan." All passed.

**Gates:** typecheck, lint, build; the quantity table passed (329 rows) after its Auto Count
settings row was updated to the new default (70, D-299).
**Commits:** app `5601343`, infra `5457295`.
