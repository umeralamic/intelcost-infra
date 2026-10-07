# Overnight report, 2026-10-07 (second run)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 04:37 UTC. Updated after each step. The
previous run's report is in git (`intelcost-infra/workspace/docs/tasks/OVERNIGHT_REPORT.md` at
commit `6049564`).

| Step | State |
|---|---|
| A1 Founder decisions | done (D-287) |
| A2 Essentials read-only Estimating and Wage Calculator | done |
| A3 Auto Count tag variants, TYP., vector index | done (D-288) |
| B1 to B8 Image-mode speed | B1, B2 and two B8 changes built in the worktree, under check |

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
