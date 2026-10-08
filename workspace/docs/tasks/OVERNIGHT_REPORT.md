# Overnight report, 2026-10-08

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:29 UTC, finished 06:51 UTC. Updated after every step. The
previous run's plan and report are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-07.md`.

## Day session, 2026-10-08 16:16 to 17:15 UTC

Same rules; throwaway workspace "Day AC 1008" (account `fx.day.1791476259@bench.intelcost.io`),
E101, E200 and the synthetic exit sign copied as before; host Chrome, the dev server, 6 workers,
one OpenCV worker per scan, 300 peaks per angle.

**Shipped: outline symmetry (D-305, app `1112f12`).** The stash `morning-item1-outline-symmetry`
applied cleanly onto this morning's code. Symmetry off against on, at 38 % and 70 %: the same
checked sets everywhere and no correct fixture lost; office, "C" and the exit sign skip no pass
and review the same (exit sign 18 / 0); E200 A skips 180° and 270° and reviews the same; E200 A1
skips 180° and 270°, 6 / 0 both ways, and the two hatched "A" panels (74.1 %, 73.2 %; checked
against the sheet: both are type A) are no longer suggested, as you accepted. Lint, typecheck and
the quantity table passed. The stash is dropped (its code is the commit); the night's
`overnight-part2a-outline-symmetry` is still there and now superseded.

**Image timings with what's shipped** (one OpenCV worker per scan, symmetry on; after one warm-up
scan in the page):

| Test | Reference this morning | Symmetry off | **Shipped (symmetry on)** | Review |
|---|---|---|---|---|
| E101 office | 147 s | 17.6 s | **16.4 s** | 68 / 0 |
| E101 "C" | 68 s | 19.9 s | **21.2 s** | 24 / 0 (C/NL 2 missed in Image, as before) |
| E200 A | 536 s | 22.3 s | **13.5 s** | 12 / 0, 4 suggestions at 38 % |
| E200 A1 | 1,584 s | 49.7 s | **27.6 s** | 6 / 0, 2 suggestions (was 4) |

Office and "C" skip no pass, so symmetry does not change them (the 1–1.5 s differences are
run-to-run spread). Every scan reloads opencv.js in its one worker (D-303), which is most of why
office is above this morning's warm 12.7 s.

**Commits:** app `1112f12`; infra: the workspace mirror. **Stashes:** none new.
**Cleaned up:** the workspace, account and mail, the harness and sheet copies.

## Morning run, 2026-10-08 08:13 to 12:00 UTC (the founder's follow-up)

Same rules as the night: founder projects read only, mail guard on, no AI credits, only my own
processes stopped by PID, tests on throwaway copies (workspace "Overnight AC 1008 c", account
`fx.overnight3.1791447309@bench.intelcost.io`, E101 and E200 copied from their stored sheet
sources, plus a synthetic exit-sign sheet). Every Image figure is host Chrome, 6 workers, the
dev server. The results contract is D-301: on all four tests at 38 % and 70 %, the same checked
set, unchecked set and suggestions shown, and no correct fixture missed (sets compared one to one
by box overlap, IoU ≥ 0.5).

| Item | State |
|---|---|
| 1 Outline symmetry | not shipped this morning (two E200 A1 suggestions lost); **shipped in the day session** (D-305, `1112f12`) |
| 2 Results contract | logged (D-301) |
| 3a OpenCV as the matcher | **shipped** (`47ec917`, D-302; 300 peaks per angle in `b9ee597`) |
| 3b Early reject in the fine stage | **shipped** (`ea42fee`, D-302), the second version |
| 3c WebAssembly fine scorer | **shipped** (`288c1a4`, D-302) |
| 4 Threads Auto by device memory | **shipped** (`59ef78e`, D-303) |
| 5 Vector index stored | **shipped** (app `b660c2f`, api `f0db060`, D-304) |

**Image, office plan: 147 s → 12.7 s with four OpenCV workers kept warm** (your target 10–15
s), and all four tests meet the contract: "C" 68 → 11.4 s, E200 A 536 → 17.8 s, E200 A1 1,584 →
45.6 s. **But those four workers took the tab to 1.8 GB on "C"** (measured at 11:25), so the
shipped default is one OpenCV worker ended with each scan: **office 18.9 s, "C" 18.2 s, peak
950 MB**. See "OpenCV memory" and question 4.

### The reference (`8f2ab56`, the code at the start)

| Test | Time | 38 % | 70 % |
|---|---|---|---|
| E101 office | 147 s | 68 / 0, 0 suggestions, 0 more unchecked | same |
| E101 "C" | 68 s | 24 / 0 (C/NL 2 missed, as since D-299), 0 suggestions | same |
| E200 A | 536 s | 12 / 0, 4 suggestions, 3 more unchecked | 12 / 0, 0 suggestions, 7 unchecked |
| E200 A1 | 1,584 s | 6 / 0, 4 suggestions, 1 more unchecked | same |

(The night measured office 148 s, "C" 69 s, E200 A 527 s, E200 A1 1,589 s on the same code.)

### Image times, each change alone and together

Every row below meets the contract on that test, except where marked.

| Test | Reference | 1 symmetry alone | 3a OpenCV alone (first build) | 3b alone (first build) | 3c WebAssembly alone | **All shipped (3a + 3b + 3c)** | Shipped without 3b | Shipped without 3c | Shipped + symmetry |
|---|---|---|---|---|---|---|---|---|---|
| office | 147 s | same (no pass skipped) | 77 s | 155 s | 98 s | **16.4 s** | 15.2 s | 20.3 s | 18.3 s |
| "C" | 68 s | same (no pass skipped) | 23 s | 63 s | 46 s | **13.0 s** | 12.9 s | 11.7 s | 12.0 s |
| E200 A | 536 s | 309 s | 220 s | 571 s | 343 s | **25.8 s** | 28.9 s | 41.5 s | 15.3 s |
| E200 A1 | 1,584 s | not run alone (stopped for time) | stopped after 15 min | not run (slower on A) | not run (time) | **84.8 s** | 92.1 s | 147.5 s | 60.0 s, **misses the contract** |

- **"First build"** of 3a: OpenCV peaks (threshold 0.3, 300 per angle, one worker) feeding
  legacy's padded regions; the shipped one uses the peaks' own origins (a coarse pixel either way),
  0.15 / 600 per angle and one worker per angle. The first build of 3b scanned each window's pixels
  for the precision bound and cost what it saved; the shipped one sums the dilated template's row
  runs on the integral.
- **3a feasibility (office only, as asked):** 147 → 77 s, 1,093 peaks, all 68 found, 0 wrong, the
  same review. OpenCV's correlation took 7.6 s of it.
- **3b, windows removed:** against the shipped scan without it, the bound stops 5,209 windows
  on office, 3,491 on "C", 9,656 on E200 A and 4,639 on E200 A1 before the offset search (the
  windows fully scored fall from 22,713 / 4,829 / 17,380 / 10,830 to 17,504 / 1,340 / 7,755 /
  6,628). Time saved: 3 s on E200 A, 7 s on E200 A1; none on E101 (office 1.2 s slower, inside the
  2 s spread between two identical office runs).
- **3c:** the offset search alone in WebAssembly takes office 147 → 98 s, E200 A 536 → 343 s; in the
  shipped scan it saves 4 s on office, 16 s on E200 A, 63 s on E200 A1 ("C" is faster in
  JavaScript by 1 s). The npm opencv.js is not a SIMD build; a SIMD build of OpenCV itself was not
  attempted (an Emscripten build of OpenCV).
- **No correct fixture is missed** in any shipped configuration: office 68 / 68, "C" 24 / 24 (the
  two C/NL are missed by Image mode since D-299, before and after), E200 A 12 / 12, E200 A1 6 / 6.

**Where the time went at 600 peaks (office, 16 s):** opencv.js load and correlation 2.7 s of wall time (the
four angles' correlation is 10–12 s of worker time in parallel; the first scan of a page also
loads opencv.js into four workers, 3–4 s), the fine scorer 7.9 s, drawing and ink 3.5 s, the rest
(about 2 s) the template's plan and the result steps. **Next to try:** fewer peaks (600 per angle is generous; office has
68 fixtures and 2,400 peaks), correlation on a 2× smaller page for small templates ("C"'s 18 s of
worker time), and keeping the OpenCV workers warm across sheets. E200 A1 (85 s) is dominated by
the fine scorer on 201k windows round 2,324 peaks.

**In the panel** (E101 copy, the "C" sample, Mode Image, a freshly loaded page): 28.1 s, first
results 27.2 s, 24 checked, Create (24), the "Vector is faster here" hint shown. The extra 15 s over
the measured 13 s is opencv.js loading into four workers on a fresh page. Closed without creating.

### 300 peaks per angle (`b9ee597`)

With 25 minutes left, on a rebuilt test bed (workspace "Overnight AC 1008 d"), the shipped setting
(600 peaks per angle) against 300, after a warm-up scan; compared set to set (D-301), against the
600 run, whose sets match the reference's:

| Test | 600 per angle | 300 per angle | Review |
|---|---|---|---|
| office | 15.3 s | **12.7 s** | same (68 / 0) |
| "C" | 11.8 s | **11.4 s** | same (24 / 0) |
| E200 A | 25.8 s | **17.8 s** | same (12 / 0, 4 suggestions at 38 %) |
| E200 A1 | 84.4 s | **45.6 s** | same (6 / 0, 4 suggestions) |

The default was then checked in the page: 300 per angle, office 12.3 s warm, 68 / 0. Lint,
typecheck and the quantity table passed.

### OpenCV memory (`3fa8c71`, D-303)

Measured last (renderer private memory every 0.5 s, the E101 copy, "C" sample; the tab idles at
about 390 MB):

| OpenCV workers | "C" peak | after the scan | "C" time | office time | office peak |
|---|---|---|---|---|---|
| 4, kept between scans (as committed at `b9ee597`) | 1,785–1,838 MB | 1,234 MB | 11.4 s warm, 16.3 s fresh page | 12.7 s warm | not measured |
| 2, ended with the scan | 1,266–1,278 MB | back to ~450 MB | 15.4–17.1 s | 17.3 s | 1,194 MB |
| **1, ended with the scan (shipped)** | **950 MB** | back to ~450 MB | 18.2–18.5 s | 16.3–18.9 s | 972 MB |

Each worker holds its own opencv.js (10.8 MB of code, its wasm heap, the correlation bands). One
worker adds about 560 MB at the peak (before OpenCV, D-299: about 430 MB at 6 workers); the
results do not depend on the worker count (the same raw candidates). Ending the worker costs a
reload of opencv.js each scan (3–4 s), which is why office is back at about 16–19 s.

### Item 1: outline symmetry, not shipped

- **E101 office and "C":** no pass is skipped (wires and tags make the outline asymmetric), so the
  scan is the reference's by construction; checked in every run's pass list.
- **Synthetic exit sign** (a box with a shaft and a filled arrowhead, a wire leaving its top, 18
  copies at 0°, 90°, 180°, 270°, plus 3 plain boxes and 2 double-headed ones): with symmetry on, no
  pass is skipped, the window counts are identical, and all 18 are found with 0 wrong (87 s, 86 s).
- **E200 A:** 536 → 309 s, the same review.
- **E200 A1: misses the contract.** It skips 180° and 270°; the 270° pass was where two hatched "A"
  panels scored 74.1 % and 73.2 % as A1 look-alikes, shown as suggestions in the reference. With
  symmetry they are gone (the same with OpenCV on: 60 s with symmetry, 85 s without, and only the
  run without it keeps the 4 suggestions). The checked sets were the same (6 / 0).
- The code is in the app stash `morning-item1-outline-symmetry` (with a switch,
  `IMAGE_PASSES.outlineSymmetry`); the night's `overnight-part2a-outline-symmetry` is still there.

### Item 4: Threads on Auto by device memory (D-303)

Auto = cores less one, at most 6, capped so 150 MB + 45 MB a worker stays within a third of
`navigator.deviceMemory` (Chrome and Edge report it, in GB, at most 8):

| deviceMemory | Auto picks (on a 12-thread machine) |
|---|---|
| 8 GB | 6 |
| 4 GB | 6 (6 workers ≈ 420 MB, a third is 1,365 MB) |
| 2 GB | 6 |
| 1 GB | 4 |
| 0.5 GB | 1 |

With your numbers the cap only bites at 1 GB and below, so 4 GB and 8 GB machines both get 6. If
you meant 4 GB machines to run fewer, the share would need to be about a tenth. The OpenCV
workers (up to 4, loaded only in Image mode) add memory on top of this; not measured this morning.

### Item 5: the vector index stored with the sheet (D-304)

E200 A, Vector mode, the scan started as soon as the sheet opens (the throwaway E200 copy):

| Visit | Scan time | Index |
|---|---|---|
| Cold: nothing stored anywhere | 9.6 s | built in the worker, 4.7 s, then stored in IndexedDB and through the api |
| First visit from another browser (IndexedDB empty) | 4.9 s | the api's copy, 2.6 s (presigned GET from S3 and decode) |
| Returning visit | 2.6 s | IndexedDB, 12 ms |

All three: 12 / 0. The api route was also probed directly: no copy → `url: null`; a bad version
refused; a sheet under another project → 404. Only an editor stores the index. "Right after
upload" was not added: the first open of a sheet stores it, so only that first open is cold.

### Gates and checks

App lint, typecheck and build passed (opencv.js lands only in the OpenCV worker's chunk, 10.8 MB,
fetched on the first Image scan); each intermediate commit typechecked on its own; api ruff and
mypy passed; the quantity table passed (329 rows).

### Cleaned up

The throwaway workspaces "Overnight AC 1008 c", "d" and "e" (purged with their
storage, including the stored index copies), their accounts `fx.overnight3.1791447309@` and
`fx.overnight4.1791457652@`, `fx.overnight5.1791458597@bench.intelcost.io` and their captured mail; the
memory samplers (stopped by their stop file); the worktree `wt-am` and its
merged branch; the harness, saved runs and copied sheet PDFs. Kept: the app image rebuilt with
opencv.js (needed), and the `alpine:3.22` image the WebAssembly build script uses. Founder projects
were not opened; their latest change is from 2026-10-07 22:28 UTC.

### Commits this morning

| Repo | Commits |
|---|---|
| app | `ea42fee` (3b), `47ec917` (3a), `288c1a4` (3c), `59ef78e` (4), `b660c2f` (5), `b9ee597` (300 peaks), `3fa8c71` (one OpenCV worker) |
| api | `f0db060` (5) |
| infra | the workspace mirror (decisions D-301 to D-304, this report) |

**Stash:** app `morning-item1-outline-symmetry` (item 1, measurements above).

### Questions for you

1. **Item 1:** the two lost suggestions on E200 A1 are wrong-type look-alikes (hatched "A" panels
   at 73–74 %). Under your contract it does not ship; say if suggestions of the wrong type may
   differ, and it can go in as it is (E200 A1 60 s instead of 85 s).
2. **Item 4:** with a third of memory and your per-worker figure, 4 GB keeps 6 workers. Keep it,
   or a smaller share?
3. **Office:** 12.7 s with four warm OpenCV workers (1.8 GB), 16–19 s with the shipped one
   (950 MB). E200 A1 is the slow one now (46 s).
4. **Memory against speed:** keep one OpenCV worker ended per scan (shipped), or keep it warm
   between scans (about 3–4 s faster a scan; four warm held about 800 MB over idle after a scan, so one about
   200 MB, estimated), or
   use four warm workers only where `navigator.deviceMemory` is 8? A smaller correlation page would
   cut both; not tried.

## The night run

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
| 4 Auto Count marketing shot, build, Pass 5 | done |
| 5 Auto Count Part 2, speed | partly: one exact lever shipped (8–11 %); outline symmetry stashed (not identical); b, c, d not attempted |

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
   scorer's components. The Image matching is unchanged: the same number of raw candidates on
   all four tests (office 1,195, "C" 82, E200 A 212, E200 A1 80) and the same right and wrong
   counts. (I did not keep the old code's candidates to compare one by one; the windows scored
   are the same by construction: same bands, edges, halos and regions.)
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

Image (6 workers unless stated; the same raw candidate counts as before on every test):

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

## Step 4. The Auto Count marketing shot, the build, Pass 5

Run by the same background agent after Part 1 was committed.

- **auto-count-tag-variants: captured** (`public/images/features/auto-count/auto-count-tag-variants.webp`,
  the right panel at x 1130–1432 CSS, about 0.39:1). On "Marketing Demo – Office Building"
  (workspace "F5 Block A demo 15:16", the bid set's own E101), the "C" sample boxed, Auto Count at
  the default (Vector, 70 %): "2 items, one per tag: C 24 · C/NL 2", Create (26). Create was not
  clicked; the project still has its 12 items. No drawing text in the crop needed covering; I
  looked at the image. (The panel's own UI text under Mode says "fast, exact, and scale-invariant":
  app text in a screenshot, not site copy.)
- **Production build without `ALLOW_PLACEHOLDERS`: passed** (check-media "all 64 manifest pictures
  present", next build, check-links: 59 pages, 179 assets, 59 sitemap URLs, no broken internal
  links), and `npm run check:links` on its own passed; lint and typecheck exit 0.
- **SCREENSHOT_TODO.md:** no placeholders left.
- **MARKETING_REPORT.md:** a "Pass 5" section (P5-1 each shot and how; P5-2 demo projects and
  members; P5-3 the earthwork sections, FAQs and images by page; P5-4 founder projects not
  modified, with the check: the newest updated_at or computed_at across items, geometry, earthwork
  results and review, registrations, strip areas, projects and sheets of Bench Construction Test
  and the founder's projects in the demo workspace, all earlier than the pass's start, checked
  again after the Auto Count shot). I added a line that the export's `#VALUE!` is fixed in the app.
- **Commits (marketing):** `b7c0fc5` (the shot, TODO, Pass 5), `f073a04` (the export note).

## Step 5. Auto Count, Part 2: speed (D-300)

**The rule held:** a change ships only if its Image results equal Part 1's, compared candidate by
candidate (angle, place within a millionth of the page, score within 0.001) on all four tests.
The reference is the Part 1 code's own run of each test, saved before the change was served.

| Item | State | Result |
|---|---|---|
| a. Symmetry on the outline only | **built, not shipped: stash `overnight-part2a-outline-symmetry`** (app repo, `3e46ace`) | Skips 180° and 270° on both E200 samples (rectangles), nothing on E101 (wires and tags make them asymmetric). E200 A: 580 s → **353 s**, same 12 / 0, same 19 kept candidates, but one checked fixture now comes from the 0° pass at 99.6 % instead of the 180° pass at 100.0 % (a slightly different place) and one suggestion moved 66.7 → 66.6. Not identical, so not shipped; your call. |
| (found on the way) The offset search without an object per offset | **shipped** (`8f2ab56`) | Identical on all four tests (office 1,195 of 1,195, "C" 82 of 82, E200 A 212 of 212, E200 A1 80 of 80). Office 164 → 148 s, "C" 75 → 69 s, E200 A 585 → 527 s, E200 A1 1,779 → 1,589 s. No measurable memory change. |
| b. OpenCV candidate stage | not attempted | On E200, 98 % of the Image time is the fine stage, which a coarse stage does not touch; on office and "C" the shortlist is 35–55 %. Legacy's own arm (`AUTO_COUNT_OPENCV_COARSE = false` on `UmeralamDEV`, unchanged since Sep 27) replaces only the coarse shortlist with `matchTemplate` on a grayscale page and gates on ground-truth identity, explicitly not byte identity, because DFT correlation is floating point; its 150 DPI cap (486 vs 1,057 MB) applies only with that arm on. Under your identical rule it could only prefilter ahead of our shortlist. opencv.js is not in the app or its image. |
| c. WebAssembly fine scorer | not attempted | The hot path is the whole component scorer (offset search, features, precision, gates), not one loop; a port plus a 30-minute identical proof per E200 test did not fit what remained. |
| d. WebGPU scorer | not attempted | Same reason, on top of (c). |

**Where E200's time goes** (a counter probe, not committed, over the first 2.5 minutes of E200 A):
470k windows; 227k pass the ink checks and enter the scorer; 199k of those leave only after the
full rigid-offset recall search, 43k at the recall bound; 60 are kept. An exact speed-up for E200
needs a provable bound that stops those 199k before the offset search; the obvious one (the
window's own ink caps its coverage) would not catch them, since they pass recall. That is the
next thing to look at.

## Decisions logged

- **D-259** marked resolved (bucket CORS), with `docs/flows.md`.
- **D-292** item 2 marked approved by you.
- **D-298** assembly crews: makeup only, priced at the project's rates.
- **D-299** Auto Count review (the run's own valley, one drawn size, lettering, slider at 70,
  suggestions), quick wins, Image memory, the Excel blank cells.
- **D-300** Part 2: what shipped (the offset search), what did not (outline symmetry, stashed) and
  why b, c and d were not attempted.

## Commits

| Repo | Commits |
|---|---|
| app | `e96e077` (1.1), `106d684` (1.2), `5601343` (Step 3, D-299), `8f2ab56` (Part 2, D-300) |
| api | `3417c06` (1.2, D-298) |
| marketing | `28bc931` (shots, pipeline), `99454b5` (earthwork section), `b7c0fc5` (auto-count shot, TODO, Pass 5), `f073a04` (export note) |
| infra | `bbd29c7`, `0c20081` (workspace mirror), `5457295` (quantity table default 70), and the closing mirror commit |

## Stashes

- App repo: `overnight-part2a-outline-symmetry` (`3e46ace`): the outline-symmetry skip
  (`lib/takeoff/autoCount/outlineSymmetry.ts` and its use in `imageScan.ts`), finished but not
  identical (above). Nothing unfinished is stashed.

## Left behind and cleaned up

- **Removed:** the throwaway workspaces "Overnight AC 1008" and "Overnight AC 1008 b" (the second
  made after the close-out for the Threads/memory sweep; both purged with their storage), their
  accounts `fx.overnight.1791423387@` and `fx.overnight2.1791442336@bench.intelcost.io` and their
  captured mail; the "EW Typo Check"
  project (purged); the temporary Essentials subscription row (removed straight after the check);
  the worktree `wt-ac` and branch `ovn-ac`; the harness, its saved candidates and every
  screenshot under `.playwright-mcp`; the memory samplers (stopped by their stop file); the copied
  sheet PDFs in the api container's `/tmp`.
- **Kept on purpose (marketing demo data):** in "F5 Block A demo 15:16", the eight invented
  dashboard projects, "Marketing Demo – Federal Building", "Marketing Demo – Site", the demo
  members Dana Mercer and Luis Ortega (`fx.mktdemo.*`), and the Office Building's assignee.
- **Founder projects:** only read. Their newest change is from 00:53 UTC, before the run began.
- **Not done or not met:** Image memory under 500 MB on "C" (about 800 MB, from 1,215); E200 A
  Vector cold under 5 s without a stored index (6.7 s; 3.1 s warm, 3.7–5.1 s cold for A1); the
  schedule-sample A1 test finds 5 of 6 (the missed panel, bottom left at x 0.253, y 0.462, gets
  only a smaller turned window, 0.0105 × 0.0304 against 0.0142 × 0.041, scoring 43.7: a window-placement
  matter in the matcher for that one instance, which a wire crosses; the plan sample finds all six);
  Part 2 b, c, d.

## Questions for you

1. **Part 2a, outline symmetry:** accept it? It makes the E200 Image tests about 40 % faster with
   the same counts, but not identical results (one checked fixture's score 100.0 → 99.6). It is
   in the stash.
2. **Memory:** is the 500 MB for the tab as Task Manager shows it, or for the scan's own
   addition? Measured after the run's changes, "C" in Image mode in a fresh page (the tab idles
   at 255–365 MB under the dev server), the same 82 candidates each time:

   | Threads | Time | Renderer peak |
   |---|---|---|
   | 6 (Auto on this machine) | 66 s | 689 MB |
   | 4 | 81 s | 604 MB |
   | 3 | 95 s | 598 MB |
   | 2 | 119 s | 485 MB |
   | 1 | 191 s | 455 MB |

   About 45 MB per worker on top of about 150 MB for the scan itself. Under 500 MB for the tab
   means 2 workers here (1.8× the time) or a lighter scorer; which do you want, or is the
   scan's own addition (about 430 MB at 6 workers) the figure you meant?
3. **The checked rule's constants** (valley ≥ 70 % of the largest gap, at ≥ 60 %; size within
   2.6×; at most 5 suggestions) were set from these four tests and the two schedule samples.
   Worth trying on a few more of your sheets.
