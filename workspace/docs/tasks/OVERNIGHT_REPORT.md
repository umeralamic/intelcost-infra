# Overnight report, 2026-10-07 (second run)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 04:37 UTC. Updated after each step. The
previous run's report is in git (`intelcost-infra/workspace/docs/tasks/OVERNIGHT_REPORT.md` at
commit `6049564`).

| Step | State |
|---|---|
| A1 Founder decisions | done (D-287) |
| A2 Essentials read-only Estimating and Wage Calculator | done |
| A3 Auto Count tag variants, TYP., vector index | done (D-288) |
| B1 Timing line | done |
| B2 First pass at once | done (with a fix: "n added" counts checked matches) |
| B3 Skip passes that cannot add | done (no test sample is symmetric; Image has no mirror pass) |
| B4 Keep image workers alive | done |
| B5 WebAssembly SIMD scorer | not done (see Part B) |
| B6 OpenCV shortlist | not done (see Part B) |
| B7 GPU scorer | not done (stretch) |
| B8 Other safe levers | three done: pixel positions, refinement cache, largest size near the others |

## How the work was run

- The Image baseline for Part B takes over an hour on the bench (E200 alone runs past an hour a
  test), and a source edit reloads the dev server's page and kills a running scan. So the app
  work ran in a separate git worktree (`E:\Intelcost\wt-app`), served by a throwaway dev server
  on port 5175 (container `ovn-wt`); the main dev server on 5173 stayed untouched for the
  baseline. The sheet bucket's CORS lists only 5173, so the harness fetched the bucket's files
  itself when it drove 5175 (harness only).
- App commits were built in the worktree from the step's exact tree, gated there (lint,
  typecheck, build in a throwaway container from the app image), and pushed to `umer-dev` as
  fast-forwards. The main checkout is fast-forwarded once the baseline is done.

## Test bed

Throwaway workspace (account `fx.autocount.*`) with copies of E101 and E200. Ground truth from the
sheets' own text: 68 office "A" tags; 26 "C" tags (24 "C", 2 "C/NL"); E200 12 hatched, 6 empty.

## A1. Founder decisions

D-287 records all six. D-277 Q3 is amended (Essentials views Estimating and the saved wage rates).
PARITY_GAPS and MANAGER (F10) mark the Library page parked for later. Plan catalog prices stay
manual (Abdullah creates them in Stripe; the editor takes the price id).

- Commit: infra `d346d2f`.

## A2. Essentials read-only Estimating and Wage Calculator

**Built.**
- **api:** `GET …/wage-calculator/wage-set/current/detail` returns the current saved set as saved
  (factors, craft parts and notes, crews). A read seat is enough and nothing is recalculated.
  Every write stays refused on Essentials.
- **app, Estimating on Essentials:**
  - It shows the line "View only. Editing estimates is on the Professional plan." under the title.
  - Items, components, rates, markups, the bid summary and totals are shown.
  - The plan mask already turned off the role-gated controls. The ones it did not cover are now
    hidden: Setup's Shared equipment and Manage subcontractors, the wage strip's Set up and Edit.
    The markup pencil becomes an eye that opens the markups read only, with the same line.
- **app, Wage Calculator on Essentials:**
  - It shows the line, the status strip and the Project info panel with values only.
  - The saved set is shown as review shows it: header, factors, D-01, craft rates with their
    breakdowns and notes, crew rates.
  - With no saved set it says "No labor rates have been set for this project yet."
  - There is no Continue, upload, manual entry, Advanced, rate pencil, Save or recalculate prompt.
- **Project Home:** it already showed both entry points on Essentials, and still does.
- **Docs:**
  - Wage Calculator spec: the Essentials view.
  - F16_SPEC: Essentials line amended.
  - SINCE_ARCHIVE row.

**Check** (throwaway workspace, a project with saved rates and an estimate line, a project without
rates; Professional by trial, then Essentials by Checkout through the Stripe fake). All PASS:
- **Professional unchanged:** Setup and the edit controls are shown.
- **Essentials, Estimating:**
  - The message, the line and the totals ($654.00) are shown.
  - There is no Setup, no select boxes and no edit buttons.
  - The markups dialog opens read only with the message.
- **Essentials, Wage Calculator:**
  - The saved rates show read only: 34 crafts, "Labor +11% · Material 0% · Equipment 0%", no pencil
    and no buttons.
  - The project without rates shows the empty line.
- **Project Home:** both entry points are shown.
- **Direct writes:** PATCH costs is refused (403, "Your role cannot create & edit measurements."),
  and POST wage-set is refused (403, "Your role cannot edit estimates.").
- **The new read:** 200, with 34 crafts and 104 crews.

**Commits:** api `fcefe6f`, app `0c4fddd` (gated: lint, typecheck, build), infra `691781a` (docs).

**Note:** the refusal wording on Essentials still names the role ("Your role cannot …"). That is
the api's existing message, unchanged by the brief ("server enforcement unchanged").

## A3. Auto Count: tag variants, the TYP. rule, the vector index

**Built (D-288).**
1. **Suffix variants.**
   - A printed tag is the sample's, a suffix variant (the tag then "/", "-" or "." and a
     qualifier), or another type.
   - A variant is checked like the sample's tag.
   - A variant drawn with shading is accepted on its outline: 75% of the sample's ink covered.
     E101's C/NL measured 0.81 covered and 0.56 shape F1; they score 0.98 now, 0.67 before.
   - Each match carries its tag. The panel lists "2 items, one per tag: C 24 · C/NL 2" above
     Create, and Create makes one item per tag, named by it, in the same folder. The largest group
     takes the dialog's name, which defaults to its tag.
2. **The TYP. rule.** It applies when the tag is printed on one instance, or a "TYP." sits beside a
   tagged one. Untagged instances of the shape are then checked; with another type of that shape
   on the sheet they become suggestions, never in the drawer.
3. **The mirror rule.** Vector already never mirrors a sample's letters; its strokes are still
   searched mirrored (a CAD block can be mirrored with its text kept readable). Image mode has no
   mirror pass.
4. **The background index.**
   - Built in a worker 1.5 s after a sheet is first opened, and stored in IndexedDB under the
     sheet's id and tile version, so a changed file is indexed again.
   - Auto Count reads it. The main thread is used only if the worker cannot run.
   - It is per browser: a sheet just uploaded is indexed when it is first opened.

**Vector, before and after** (bench, 70%, uncontended runs; "before" is this run's start):

| Test | Time before | Time after (index ready) | Checked right / wrong | Unchecked shown |
|---|---|---|---|---|
| E101 office | 9.2 s | 4.1 s (3.0 s on a second run) | 68 / 0, then 68 / 0 | 0, then 0 |
| E101 "C" | 2.4 s | 2.2 s | 24 / 0, 2 missed, then **C 24 + C/NL 2**, 0 wrong | 2, then 0 |
| E200 A (hatched) | 5.4 s | 3.7 s | 12 / 0, then 12 / 0 | 0, then 0 |
| E200 A1 (empty) | 2.9 s | 3.2 s | 6 / 0, then 6 / 0 | 0, then 0 |

- **Index build per sheet (worker):** E101 4.0 s, E200 0.7 s. The E200 index was built during
  its scan, since the harness never opens that sheet.
- **Office target ≤ 7 s with the index ready: met** (4.1 s).

**Image accuracy** (A3 does not touch Image mode's scan or result path):

| Test | Result |
|---|---|
| E101 office | 68 / 0, unchanged |
| E101 "C" | 24 / 0, the two C/NL missed (Image mode has no tags, and they are drawn differently) |
| E200 A and A1 | not measured: a single Image run on E200 went past 80 minutes on the bench and was stopped at the run's 100-minute limit |

**Checks.** All pass:
- **Quantity table:** passed, including the 8 Auto Count rows, run after the change.
- **TYP. rule on made-up candidates:** right in all five cases: printed once (checked); another
  type present (suggestions, visible); tagged everywhere (unchanged); "TYP." beside (checked); no
  text layer (unchanged).
- **In the browser, on the E101 copy:**
  - The region box over the C sample, then Auto Count at 70%, showed "C 24 · C/NL 2" with 26 checked.
  - The dialog's name was "C".
  - Create made items C (24 marks) and C/NL (2 marks), unfiled, with the toast "Counted 26 symbols
    in 2 items — C (24), C/NL (2)".

**Commits:** app `23f529b` (gated: lint, typecheck, build).

## Part B. Image-mode speed

**The results contract.** The Image results of the four tests were saved at the start of the run
(Part A does not touch Image mode's scan or result path).

- **E101:** office and "C" saved. Office 550 s, 68 / 0. "C" 600 s, 24 / 0, the two C/NL missed.
- **E200:** nothing saved. A single E200 Image run passed 80 minutes on the bench and was stopped
  at the run's 100-minute limit, so E200 has no saved results.
- **Check after every step:** both E101 tests compared, every kept candidate (checked or not) at
  the same place within 1 px, with the same score within 0.001 and the same checked state. Every
  step: **identical**, 68 and 70 candidates. The quantity table (Auto Count rows) passed after
  the steps.
- **Steps checked together:** B1, B2, B8a and B8b were checked together (B1 and B2 change no
  matching code; B8a and B8b are exact rewrites). B3 and B8c were checked together, then B4
  alone. B3 skipped no pass on any sample, so its tree runs the same passes as before.

**Built.**

| Step | What | App commit |
|---|---|---|
| B1 | Timing line (collapsed): total, first results, page render, ink, shortlist, fine scoring, result step, passes run and skipped with the reason, sizes, workers, scorer. Each card's tooltip already named its angle and mirroring | `e04afd7` |
| B2 | The sample as drawn (0°) first over the whole page, its matches shown checked at once (as before), then "Still scanning other angles… n added" | `be53fc5`, fix `8cc577e` |
| B8a | The scorer's template pixel positions worked out once per template (same arithmetic) | `2782068` |
| B8b | Each refinement window scored once per call | `7fe07ad` |
| B3 | An angle pass whose turned template equals one already searched pixel for pixel is skipped | `1cc5b85` |
| B8c | With the 2-of-3 sizes rule, the largest size is searched only near the other sizes' matches | `e63c7e9` |
| B4 | One worker pool for the scan (same pool size rule); each band sent once per sheet (transferred) and its integral built once | `ee2d471` |

- **The B2 fix:** the first version of "n added" counted every kept candidate, so in the browser it
  said "25 added" while the checked matches stayed 24. It now counts checked matches.
- **Gates:** every commit's own tree was gated (lint, typecheck, build).

**Bench times** (headless Chromium in a container, no GPU, run alone; read them relative):

| Test | Before: first results / finish | After: first results / finish |
|---|---|---|
| E101 office | 152 s / 550 s | **76 s / 248 s** |
| E101 "C" | 144 s / 600 s | **67 s / 245 s** |
| E200 A | not measured (over 80 min) | see the E200 note below |
| E200 A1 | not measured | see the E200 note below |

- **Where the time goes now** (office, from the Timing line): page render 2.8 s, ink 1.2 s,
  shortlist 30.5 s, fine scoring 204.3 s, result step 0.1 s.
- **Against your target:** the bench ran about 6 times slower than your desktop on this test (528 s
  against 88 s), so 248 s here suggests about 40 s on your desktop, with the first checked results
  after about 12 s. **The 10 to 15 s target is not met.** What stands between is fine scoring under
  the identical-results rule, which forbids dropping the later passes. Your observation that they
  rarely add matches is right on these tests, but "rarely" is not "never".
- **In the host browser** (Chrome on this Windows machine, with other runs going), the "C" sample
  after B2: first checked results at 120 s, done at 449 s. That was before B8c and B4.

**Passes run and skipped, per sample (B3).**

| Sample | Before | After |
|---|---|---|
| E101 office, E101 "C", E200 A, E200 A1 | 4 angle passes (0°, 90°, 180°, 270°), 3 sizes | the same: none symmetric pixel for pixel (each crop carries a letter or nearby ink) |

- **B3b (the text rule):** Image mode has no mirror pass at all (passes are angles only), so it has
  nothing to skip. No result changed under B3b, because nothing ran differently.
- **Vector** keeps searching mirrored strokes with the letters never mirrored (D-288 3).

**Which scorer ran:** JavaScript on every run. No WebAssembly or GPU scorer exists yet.

**Not done:**
- **B5, WebAssembly SIMD:**
  - No toolchain on the bench (no clang, rustc, wat2wasm or emcc), so it would mean hand-written
    WAT assembled with a package fetched for the purpose.
  - The brief turns it on by default only after an identical check on all four tests, which E200's
    run time rules out here.
  - Also, the hot loop gathers page pixels at scattered addresses and sums in order, which SIMD
    lanes do not speed up without reordering the sum.
- **B6, OpenCV shortlist:**
  - Not brought across. It needs `@techstark/opencv-js` (13 MB) added to the app and its image.
  - The zero-dropped proof is required on every test, and E200 cannot be run.
  - Legacy itself ships this path switched off (`AUTO_COUNT_OPENCV_COARSE = false`).
- **B7, GPU:** a stretch, not reached.

**Decisions:** D-289.

## Decisions made on my own

1. **App work in a worktree on a second dev server.** The Image baseline needed the main dev
   server untouched for over an hour, so the app work ran in `E:\Intelcost\wt-app`, served on
   5175. Commits were built from each step's exact tree and gated in a throwaway container, then
   pushed to `umer-dev` as fast-forwards; the main checkout followed. To reach the sheet bucket
   from 5175 (its CORS lists 5173 only), the measuring harness fetched the bucket's files itself.
   The app was not changed for this.
2. **A suffix variant's tag.** A variant is the base tag plus "/", "-" or "." and a qualifier.
   "CL" is another type, not a variant.
3. **The variant bar, 75% of the sample's outline**, from E101's measured C/NL (0.81). It applies
   only when the printed tag is the base tag's variant.
4. **Where a variant's item goes** when "Add to the selected count item" is on: the largest group
   goes into that item, and every other tag becomes a new item in that item's folder. Each item is
   its own undo step ("Ctrl+Z undoes one item at a time").
5. **The TYP. trigger.** The sample's tag on only one instance of the shape (shape ≥ 0.7), or
   "TYP", "TYP." or "TYPICAL" within four symbol sizes of a tagged instance.
6. **The index lives in the browser** (IndexedDB, newest 60 sheets), not on the server: the matcher
   must read the browser's own pdf.js walk (D-189 Q1). "When the sheet is uploaded" is met at its
   first opening, since uploads are processed on the server.
7. **Steps checked together** where one step cannot change matching (B1, B2) or is an exact rewrite
   (B8a and B8b; B3 with B8c). Each step still has its own commit and gate.
8. **Image Threads unchanged.** The brief's B4 says "same pool size rule", and Q24 keeps Threads on
   Auto, so the six-worker cap stays (see the open questions).

## Open questions for you

1. **Image speed against the identical-results rule.** About 40 s on your desktop for the office test
   is what exact changes reached; 10 to 15 s needs one of these:
   - (a) the as-drawn pass only by default, with the other angles on request (most matches come
     from it, you noted);
   - (b) the other angles searched only where the first pass found nothing nearby;
   - (c) more workers (below).
   Each breaks "identical" on some sheet. Which do you accept?
2. **Image workers.** B4 sends each page once, split across the workers, so more workers no longer
   cost memory per worker. May the automatic pool use the cores less one above the current cap of
   six (legacy's Threads went to 16)? It would help most on machines with more than eight cores.
3. **E200 Image.** It is too slow on the bench to check (over 80 minutes a run before tonight's
   changes). Can you run E200 A on your desktop once, with Timing open, so its results are on record?
4. **The refusal wording on Essentials** still says "Your role cannot …" for a plan limit (the api's
   message, unchanged by the brief). Change it to the plan wording?

## F16_SPEC

- Updated for D-287 1 (Essentials views Estimating and the saved wage rates). Nothing else in it
  disagrees with tonight's work.

## How to test Image mode on your desktop

1. Pull `umer-dev` in `intelcost-app-react` (or open the deployed bench), open Hidden Valley Spec
   Building Rebid, sheet E101.
2. Select (the arrow), drag a box tightly round one office fixture (detail A8), choose
   **Auto Count**, then set **Mode: Image** in the panel. Leave the sensitivity at 70 for the same
   numbers as here.
3. Note:
   - when the first checkmarks appear (the as-drawn pass, with "Pass 2 of 4 — results below are
     live");
   - when "Still scanning other angles… n added" ends and the scan finishes.
4. Open **Timing** under the panel's results. It shows the total, first results, each stage, the
   passes (run and skipped, and why), the sizes, the workers and the scorer (JavaScript today).
   Expected: 68 checked, about 40 s total and about 12 s to first results, if the bench's six-to-one
   ratio holds on your machine.
5. Nothing is written to the project until Create; Esc closes the panel and leaves it as it was.

## Left behind

- No stash in any repo.
- Throwaway data (the `fx.*` accounts, their workspaces and the check items), the harness scripts
  and the worktrees are removed at the end; see the cleanup line below.
