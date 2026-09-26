# F5 Block A report, 2026-09-26

_What the founder asked for after reviewing the overnight run: log the answers, six fixes
before F5, then F5 Block A, stopping there. Spec: [takeoff_shell_tasks.md](takeoff_shell_tasks.md)._

## In one paragraph

**Everything asked for is done, driven and pushed to `umer-dev`; `main` untouched.** The
answers are logged:

- **D-34** accepted.
- **D-35:** zoom runs 50% to 4000%, sharp at every level.
- **D-36:** the F5 and F6 answers.

F5 is unblocked, and F6 waits for F5. The six fixes are in, and each is proved by a
fixture. F5 Block A is built: the Load endpoint, the worker's preparation with its
sweep, and the chunk guard. Its three new fixtures pass. The end-of-block regression is
**52 of 53**, and the one failure is intermittent (see below). Block B has not been
started.

## The answers, logged

| Where | What |
|---|---|
| `DECISIONS.md` | D-34 status Accepted. **D-35** zoom 50% to 4000%, sharp (pdf.js re-raster, never a scaled bitmap as the settled picture). **D-36** every F5/F6 answer, with F6 Q4 changed to count up |
| F5 spec | Answers table; S10 AC1 sharp at 100/400/2000/**4000%**; S11 zoom 50% to 4000% from one module; design section; findings 3 and 6 |
| F6 spec | Answers table; S8 seeds legacy's three layers, show and hide, the last layer never deleted (the api's 409, default or not); S9 duplicates "(2)", "(3)"; S14 names finding 6 |
| F7 (not yet specced) | MANAGER and FEATURES rows carry findings 2 (Count adds to the selected item) and 4 (deducts) |
| PARITY | §24's zoom lines read 50% to 4000% beyond legacy, plus a new "sharp at every zoom" line (597 behaviours now); §9's zoom and Count lines name their owners |
| Board | F5 In Progress; F6 Blocked on F5 only |

## The six fixes

| # | Fix | Proof |
|---|---|---|
| 1 | **D-27's `abort_stale_uploads`**, beat 03:30 UTC beside the purge: a live project's upload unfinished for 24 h is aborted in S3 and its row dropped; a trashed project's stay the purge's | `d27-uploads.sh` 2/2: old unfinished aborted and gone, the recent one, the finished one and the trashed project's left, a second run changes nothing, beat has the entry |
| 2 | **Finding 9:** the capability query has `staleTime: Infinity` (F8 keeps it fresh) | `f3-s8` 4/4, AC4 now **1 request** for the Roles page load (was 3) |
| 3 | **Bench hygiene:** f4-s1 and f4-s2 make their projects in fresh workspaces; f3-s6, f8-s4, f8-s8 discard theirs; `bench-tidy.mjs` removes fixture projects and seats by name only, and `regress.sh` ends with it | Run once: **226 fixture projects and 286 fixture seats removed**. Kept: Riverside Medical Center and your LLAADD, Lilly, trdt, wweedd, multipart smoke. Sara W. put back to **Estimator** (your click check had left her Viewer). **`f2-s5` 9/9, AC8 passes** |
| 4 | **f3-s2 and f3-s4 with their setup pass**, through new runners, now in the standing list | `f3-s2` drive 6/6 then 5/5, `f3-s4` 4/4 |
| 5 | **Dashboard rows at 375 px:** the name has its own line below `sm` | `p19` 2/2, now also checking names: 91% of the row at 375, none cut. Checked against the old row first: it failed, "a project name gets 25% of its row", Riverside cut |
| 6 | **Findings 2 to 6 in the specs** | See the table above |

The full regression after the fixes: **49 of 50**. The one failure, `f8-s2` AC4 (a click on a
link the dashboard re-rendered), passed 3 of 3 when rerun alone.

## F5 Block A

| Subtask | What | Proof |
|---|---|---|
| **S1** the model | `POST …/drawing/load`: a drawing per project file, its folders mirrored plus a leaf named after it, "Page N" per chosen page, idempotent, never a skipped page; a non-drawing, a page past the end and an unfinished upload refused by name; one bad file refuses the whole Load. Deleting a folder or file whose sheets are in takeoff is refused with the count; the screen says legacy's "Can't delete — folder in use". A folder rename renames its mirror. Migration `a91c4e7d2b30` | `f5-s1` **7/7** |
| **S2** the worker | `prepare_drawing_file`: per page a one-page PDF, a 512 px thumbnail and a fit-tier WebP, then ready and `drawing.source.changed`. An image is wrapped into a PDF, its original kept. `sweep_unprepared_drawings` every 5 minutes. Open takeoff and Project Home tabs refetch on both drawing events | `f5-s2` **4/4**: the Load answered in 146 ms, all pending; the objects checked in MinIO; a tab showing "This sheet has no image" drew the page when the worker came back, with no reload; a lost job re-dispatched by the sweep |
| **S3** the chunks | The takeoff page, canvas and drafts are only in the takeoff chunk; the dashboard fetches none; a missing takeoff chunk reloads once | `f5-s3` **2/2**, `drives/f5-s3-bundle.sh` pass. **pdf.js is not a dependency yet**: its first use is Block B's Choose pages. The drive checks it the moment it is |

Gates: ruff, ruff format, mypy (83 files), lint, typecheck, build. Pillow added to the api
image (WebP), `poetry.lock` relocked in a container; api, worker, beat and api-b rebuilt.

**End-of-block full regression, `regress.sh`, 53 fixtures: 52 passed.** The failure was
`f8-s13` AC1, "A sent 11 a second" against a limit of 10; it passed 4 of 4 rerun alone, each
peaking at 10. Logs: `intelcost-infra/.regress/f5-block-a/`.

## Findings

1. **Draft frames can exceed 10 a second under load** (`f8-s13`, intermittent). `useDrafts`
   spaces sends with a 100 ms timer, and a timer that fires early lets an eleventh frame into a
   one-second window. The api's own limit drops the extra frame, so nothing is lost. A
   one-line fix (space by elapsed time, not by timer) is F8 code; left for you to call.
2. **The api reads a whole file once, on its first Load, to count its pages.** Fine for
   bench sets; for a 500 MB set it is a big download into the api. Block C's range
   reads could count from the PDF's trailer instead.
3. **The fit tier is capped at 144 DPI**, so a letter page's fit image is 1224 px, not 2048
   (legacy's cap). Recorded in the spec.
4. **A lost preparation job waits for the sweep**, up to ten minutes plus a beat tick. Without
   the sweep, Redis would redeliver a killed worker's job only after an hour.
5. **The worker takes about 15 s to come back** after a restart on the bench (`f5-s2` AC2's
   figure is mostly that).

## Commits (all on `umer-dev`, all pushed)

| Repo | Commit | What |
|---|---|---|
| api | `10d9ebe` | D-27 `abort_stale_uploads` |
| app | `2d69a3f` | Capability staleTime; dashboard rows at 375 |
| infra | `89a45c0` | Bench hygiene, `bench-tidy`, D-27 drive, f3-s2/s4 runners; the answers mirrored |
| api | _Block A_ | Drawings from project files, `prepare_drawing_file`, the sweep, the in-use guard |
| app | _Block A_ | Drawing events, `drawingApi.load`, the file browser's in-use refusal |
| infra | _Block A_ | `f5-s1`, `f5-s2` (+ runner, drive), `f5-s3`, the bundle drive; this report; the mirror |

## Click-only checks for you

Nothing in Block A has a new screen of its own (the Load dialog is Block B), so these check the
fixes and what Block A changed on existing screens.

**The fixes**
1. Sign in at http://localhost:5173. The dashboard lists Riverside Medical Center and your
   hand-made projects on the first page, and no fixture clutter.
2. Settings > Members lists the owner, Sara W. as **Estimator**, and only non-fixture members.
3. DevTools' Network, filter `capability`, then open Settings > Roles from the dashboard. You
   should see **one** request for that page.
4. DevTools' device bar at 375 wide: each dashboard row shows the whole project name on its own
   line, with the status, ruler and bin beneath it.

**Block A**

There is no Load dialog yet (Block B), so I left a demo made through the same path: the
workspace **"F5 Block A demo 15:16"**, project **"Loaded from files"**. In it, "Plan set.pdf"
(3 pages) had pages 1 and 3 loaded and page 2 skipped, and "Site.png" was loaded. It stays
until you delete it. `browser/f5-demo.mjs` makes another.

5. Pick the demo workspace in the switcher and open "Loaded from files". The Sheets block
   lists **three** sheets, all Ready: Page 1, Page 1 (the PNG) and Page 3. There is **no Page 2**.
   (The block prints "Page 1  Page 1" because Load names sheets "Page N", as legacy does, and
   this old block adds the page number. The block goes in S9.)
6. Open Page 3. The sheet reads "Plan 3" in large type, drawn from the worker's fit image.
   Open the PNG's sheet: it is the bordered rectangle with a diagonal.
7. Back on Project Home, Files, right-click Plans, choose Delete, then Delete. The toast reads
   **"Can't delete — folder in use"**, with "3 takeoff sheets come from its files", and
   Plans stays. Try deleting "Plan set.pdf" inside it: the same, for 2 sheets.
8. Riverside is unchanged: open its Page 1 in takeoff. The sheet and shapes are as before,
   and live drawing between two windows works as in your F8 check.

**For Abdullah:** Pillow is a new api dependency (the image grows by about 5 MB). Two new beat
entries now run beside the purge: `abort-stale-uploads` at 03:30 UTC and
`sweep-unprepared-drawings` every 5 minutes.

## Next

Block B (S4 to S9): Perform Takeoff's single decision, the "Load project files into takeoff"
dialog with Choose pages (pdf.js arrives here), Upload drawing, Add sheets, and retiring Project
Home's Sheets block. Not started, as asked.
