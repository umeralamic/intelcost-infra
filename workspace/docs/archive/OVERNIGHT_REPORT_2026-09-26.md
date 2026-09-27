# Overnight report, 2026-09-26

_Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Ran 00:04 to 04:15 CDT._

## In one paragraph

**All ten tasks are done and pushed to `umer-dev` in every repo; `main` was not touched.**
F8 is closed and archived. Blocks D and E were built overnight and wait for your click
check. The final standing regression is 47 of 47. The wider F2 and F3 sweep turned up
fixture timing faults, which are fixed; its two remaining failures predate tonight (see
Task 10). F5 and F6 are specced, with
nine questions each, and both sit in Blocked on your answers. P-18 and P-19 are live:

- The dashboard's first load dropped from 665 kB to 455 kB.
- The app fits a phone.

One call needs your review: **D-34**, drawing colleagues' drafts on today's canvas. There
are nine findings; none was fixed overnight, since the rule was no behaviour change
outside the tasks.

## Progress

| # | Task | Status | Started | Finished | Time |
|---|---|---|---|---|---|
| 0 | Setup: permissions in `.claude/settings.json`, rule 7 hook kept, reading | ✅ | 00:04 | 00:15 | 11 min |
| 1 | F8 Block D: live drawing channel, Collaboration preferences | ✅ `f8-s13` 3/3, `f8-s14` 4/4 | 00:15 | 00:32 | 17 min |
| 2 | F8 Block E: F3 and F4 events wired precisely | ✅ `f8-s15` 6/6, `f8-s16` 4/4 | 00:33 | 00:53 | 20 min |
| 3 | F8 Block F: Caddy note, STATUS, PARITY, full regression, close F8, backup | ✅ Regression **46/46**; F8 archived; backup `E:\Intelcost-backup\2026-09-26_0148-f8-closed` | 00:54 | 01:50 | 56 min (most of it the regression) |
| 4 | F5 spec | ✅ 19 subtasks, 6 blocks, 9 questions; Blocked on your answers | 00:58 | 01:52 | ~30 min of work, beside the regression |
| 5 | Proof backlog | ✅ 15 lines driven: **9 ticked, 6 real gaps** recorded and their PARITY status corrected; no app change | 01:53 | 02:02 | 9 min (plus reruns) |
| 6 | P-19: phone width | ✅ `p19` 2/2 at 375×667 and 1440×900 | 02:03 | 02:23 | 20 min |
| 7 | P-18: code splitting | ✅ **main chunk 664.74 → 231.87 kB; dashboard first load 664.74 → 454.72 kB** (gzip 196 → ~141 kB) | 02:24 | 02:39 | 15 min |
| 8 | F6 spec | ✅ 16 subtasks, 5 blocks, 9 questions; Blocked on your answers and on F5 | 01:02 | 02:40 | ~30 min of work, beside the regression |
| 9 | `docs/flows.md` | ✅ Seven journeys, a diagram each, infra steps marked 🔧 for Abdullah | 00:59 | 02:40 | ~25 min of work, beside the regression |
| 10 | Final regression, this report | ✅ Standing list **47/47**; F2 and F3 checked against pre-tonight code, tonight's fixture faults fixed (see below) | 02:40 | 04:12 | 1 h 32 min |

**Task 10, the final regression (02:40 to 04:10):**

- **The standing list, `regress.sh`, 47 fixtures: 0 failed.** That is every F4 fixture,
  f4-dialogs, f3-s1, s3 and s12, `p19`, and every F8 fixture, f8-s13 to s16 among them.
- **Then every F2 and F3 fixture besides**, 24 of them, since P-18 touched every route.
  The first pass had 8 failing. Each was checked against the code as it stood before
  tonight, by checking out the pre-tonight api and app files, running, and restoring.
  - **Caused by tonight, all fixture timing, now passing:**
    - f2-s2, and the shared `invitationSettled` helper: the page read before its lazy
      chunk drew.
    - f3-s8 AC3: the member list draws after the invite form now, and the fixture
      demoted the wrong row.
    - f3-s8 AC2: its premise, "the tab does not find out", now needs the tab's socket
      down, since F8 tells the tab at once.
  - **f2-s7:** a one-off api connect timeout; 4/4 on rerun.
  - **Failing before tonight too:**
    - f2-s1b, f2-s5 and f2-s6 used selectors from before F4's dashboard (D-31). Fixed;
      f2-s1b and f2-s6 pass.
    - f2-s5 AC8 now fails on bench state: see finding 8.
    - f3-s8 AC4 counts capability requests: 2 before tonight, 3 now, 1 wanted. See
      finding 9.
  - **f3-s2 and f3-s4** are phased (they need their SETUP pass) and were not run.
- **Full logs:** `intelcost-infra/.regress/final/`, and per fixture for the reruns.

## Commits (all on `umer-dev`, all pushed)

| Repo | Commit | What |
|---|---|---|
| api | `8d86862` | F8 Block D: draft and cursor frames, collaboration preferences (migration `f3a8d2c61b57`) |
| api | `fdd468a` | F8 Block E: the F3 and F4 events, published after commit; removal revokes on every api process |
| api | `fde6d83` | F8 close-out: STATUS |
| app | `1d29464` | F8 Block D: `useDrafts`, `DraftLayer`, Settings > Account > Collaboration |
| app | `4f42467` | F8 Block E: each event mapped to its own queries |
| app | `21c43ba` | F8 close-out: STATUS |
| app | `ccd9f6e` | P-19 |
| app | `e2da400` | P-18 |
| infra | `4cadcb1` | F8 Block D bench (`f8-s13`, `f8-s14`), D-34 and this plan mirrored |
| infra | `b44d9fb` | F8 Block E bench (`f8-s15`, `f8-s16`) |
| infra | `6c7a048` | F8 close-out: the Caddy note, mirror with F8 archived |
| infra | `2b96c81` | F5 specced |
| infra | `06b4b3f` | Proof backlog fixture |
| infra | `f5f8cfa` | P-19 bench |
| infra | `6d26523` | P-18 bench (three F2 fixtures' waits) |
| infra | `5f34fc6` | F6 specced |
| infra | `d8cc795` | `docs/flows.md` |
| infra | _last_ | Final-regression fixture fixes (f2-s1b, s2, s5, s6, f3-s8, `invitationSettled`), this report, the final mirror |

## Overnight decisions to review

| D-NN | Call | Why | If you disagree |
|---|---|---|---|
| **D-34** | Today's canvas **draws** colleagues' in-progress shapes (`features/takeoff/components/DraftLayer.tsx`) with the "Sara W." tag, honouring drawing in progress, names, others' work and colour by. The F8 spec had F5 draw them | Your B/C check found live drawing had nothing to see; this makes Block D checkable by clicking, and F5 lifts the layer as it is. Cursors are carried but drawn by F7, per D-33 | Remove the `overlay` prop from `ProjectTakeoff.tsx`; the channel and preferences stand on their own |

Smaller calls made inside the work, all written into the archived F8 spec's "Found while
building" notes:
- A finished draft stays on other screens for 1 s so it hands over to its saved shape.
- Counts and calibration send no draft.
- Preferences are stored sparse.
- A removal revokes at once through a Redis instruction.
- A queued ownership transfer publishes both the invitation and the owner events.

For P-18 and P-19:
- The tab row's rule is an inset shadow.
- The tab gap is 16 px with no side padding.
- Login, Dashboard and NotFound stay in the main chunk.

## Failures and findings

Nothing failed three times; no item was abandoned. What went wrong on the way was fixture
faults, each named in its commit:
- Block D: a strict selector.
- Block E: a row that had correctly moved tab.
- Proof backlog: three faults.
- P-18: three F2 waits that read a lazy page too early, and four more found by the final
  sweep.

**Findings, none fixed overnight:**

| # | Finding | Where it is recorded | Suggested owner |
|---|---|---|---|
| 1 | **D-27's 24-hour sweep of abandoned uploads was never built.** The nightly job only aborts a *purged* project's open uploads; abandoned parts in live projects wait for the bucket's lifecycle rule | `docs/flows.md` flow 2 | A small task: `abort_stale_uploads` beside the purge |
| 2 | **The Count tool makes a new item per click, and the names collide:** three quick clicks made three items all named "Count 11". Legacy places marks into one item | PARITY §9 Count → partial | F7, or a small fix sooner |
| 3 | **Zoom stops at 800%**, not 3000%, and steps ×1.25 throughout | PARITY §9 zoom → partial | F5-S11 |
| 4 | **There are no deducts at all**, yet §10's pairing line said ported | PARITY §10 → missing | F7 |
| 5 | **Layers:** no show or hide; the api protects only the *default* layer, so a project's last layer can go; a new project has no layers (legacy seeds three) | PARITY §8 → partial | F6-S8 |
| 6 | **No sheets panel in takeoff; no classification** to file an item under | PARITY §7, §8 → partial | F5-S13, F6-S14 |
| 7 | **Dashboard project rows are cramped at 375 px** (the name truncates to a few letters) | Here | A small follow-up to P-19 |
| 8 | **The bench workspace is full of fixture projects**, so "Riverside Medical Center" is no longer on the dashboard's first page, and f2-s5 AC8 cannot find it. Fixtures that make projects in the seeded workspace do not clean up | Here | A bench chore: fixtures make their projects in fresh workspaces, as the F4 ones do; or a `seed.py --reset` |
| 9 | **The capability map is fetched more than once per page** (f3-s8 AC4): 2 requests before tonight, 3 now, because a lazily loaded page mounts its `usePermissions()` after the shell's and finds the answer stale. Harmless, and the criterion was already failing | PARITY §3 unchanged (its line is about liveness, which passes) | A `staleTime` on the capability query is safe now that F8 keeps it fresh live; a small decision for you |

## Click-only checks for you

Two windows, as for the B/C check: A at http://localhost:5173 (the seeded owner), B at
http://localhost:5174 (`window-b@bench.intelcost.io`, Sara W.). Riverside Medical Center,
Page 1.

**Block D, live drawing (D-34)**
1. In A, choose Linear and click two points slowly, moving the mouse between them. In B,
   a dashed line in A's colour grows as A moves, tagged "Bench E.".
2. Double-click to finish in A. In B, the dashed line becomes the saved run within about
   a second.
3. Start another run in A and close A's tab mid-shape. In B, the dashed line disappears
   at once.
4. In B, open Settings > Account and scroll to **Collaboration**. Set Names to "On hover"
   and go back to the sheet. A's next run shows no tag until B's pointer is over it.
   Then try Off, Fade others and Only mine for Others' work, and Item colour for Colour
   by.
5. Reload B's Settings > Account: every choice is kept. Sign in as Sara in A's browser:
   the same choices.

**Block E, events live**
6. A on the dashboard, B on the dashboard (don't click into B). A creates a project; it
   appears in B. A sets it to Won; it leaves B's open tab and B's Won count goes up.
7. B on that project's Project Home. A renames it; B's heading follows. A adds a folder;
   B's folder tree shows it.
8. As A, change Sara's role to Viewer in Settings > Members. B's New project button
   disables within a second, with "Your role cannot create projects." Change her back.
9. As A, rename the workspace in Settings > General. B's top bar follows.

**P-19 and P-18**
10. In DevTools' device bar at 375 wide: the top bar fits, and nothing scrolls sideways.
    Settings' tab row scrolls with the current tab in view. At full width, all nine tabs
    sit on one line.
11. Network panel, dashboard load: no `ProjectTakeoff-*.js` and no `ProjectHome-*.js`
    until you open a project.

**Things only you or Abdullah can do**
12. **Send Abdullah** `intelcost-infra/notes/2026-09-26_realtime_caddy_for_abdullah.md`,
    and ask him how many uvicorn processes production will run (F8-S17 AC1).
13. **Ask Abdullah to review** the 🔧 steps in `docs/flows.md` (the table at its end).
14. **Answer the F5 and F6 questions** below; both features are Blocked on them.

## F5 questions (`docs/tasks/takeoff_shell_tasks.md`)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Thumbnails: server or browser? | Both: Choose pages renders in the browser (legacy's, and the only option before a sheet exists); the sheets panel uses server thumbnails made at preparation |
| Q2 | Skip on first run with nothing loaded | Keep legacy's rule: the dialog opens again next time |
| Q3 | Images (PNG, JPG, TIFF) | Wrap into a PDF on the worker, keeping the original as the project file |
| Q4 | The selected sheet in the URL | Keep it (beyond legacy; per-sheet tab titles rely on it) |
| Q5 | Metric units in calibration | Port legacy's flag, off |
| Q6 | A new `drawing.sheet.changed` event so colleagues see loaded pages live | Add it |
| Q7 | Owners for what F5 leaves out (Name from region, print, overlays, rotate…) | As the spec's table proposes |
| Q8 | Old bench drawings with no project file | Migrate the seed; leave old bench rows unlinked |
| Q9 | Legacy's bug: skipped pages come back | Do not port it |

## F6 questions (`docs/tasks/item_model_tasks.md`)

| # | Question | Recommendation |
|---|---|---|
| Q1 | Where sub-item formulas are evaluated | Both: the browser for the live preview, the api to store, kept equal by one shared table |
| Q2 | Classification references as loose strings or foreign keys | Foreign keys to a new `workspace_classification` |
| Q3 | Variables' scope | Keep legacy's: workspace-wide, with a per-project value |
| Q4 | Duplicate's suffix, always "(2)" in legacy | Keep legacy's; counting up is a one-line change if you prefer it |
| Q5 | Item history | F11, with the other audit views |
| Q6 | Layers and variables live (legacy did not sync them) | Add `takeoff.layer.changed` and `workspace.variable.changed` |
| Q7 | Layer visibility per browser | Keep per browser |
| Q8 | Seeding the other four classification systems | CSI on first use; the others when first turned on |
| Q9 | Rough measurements in F6, Earthwork markups in F12 | As stated |

## Where things are

- **Specs:** `docs/tasks/takeoff_shell_tasks.md`, `docs/tasks/item_model_tasks.md`; F8's
  is archived at `docs/archive/realtime_tasks.md`.
- **Logs:** every fixture's full output is in `intelcost-infra/.regress/` (git-ignored):
  - `full-f8-close/` for Task 3
  - `final/` for Task 10
  - one file per fixture from each individual run
- **Screenshots:** all deleted.
- **Mirror:** `intelcost-infra/workspace/` is exact as of the last commit.
- **Backup:** `E:\Intelcost-backup\2026-09-26_0148-f8-closed`, the workspace files at
  F8's close.
