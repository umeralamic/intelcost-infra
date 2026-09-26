# F5 Block B report, 2026-09-26

_The founder's instructions after checking Block A: five parts, stopping after F5 Block B
with one report and click-only checks. Spec: [takeoff_shell_tasks.md](takeoff_shell_tasks.md)._

## In one paragraph

**All five parts are done, driven and pushed to `umer-dev`; `main` untouched.**

- **Part 1:** the live-drawing throttle holds under load. f8-s2 AC4's fault has a cause and
  passes ten times in a row. The seeded account went from 860 workspaces to 2. No fixture
  in the regression uses it any more, and the regression fails if it gains a workspace.
- **Part 2:** a link opens in its own workspace (D-37).
- **Part 3:** colleagues' drafts draw solid and in the item's colour by default (D-38).
- **Part 4:** F7 is adopted with its answers (D-39), and P-20 is on the backlog.
- **Part 5, F5 Block B:** the page count reads 230 KB of a 519 MB set, never the file.
  Perform Takeoff makes legacy's one decision. "Load project files into takeoff" has
  pdf.js thumbnails, three at a time. Upload drawing and Add sheets work. Project Home's
  Sheets block is gone, and the seed and every takeoff fixture now come through
  `/drawing/load`.

**The end-of-block regression: all 59 standing fixtures pass, and all 22 F2 and F3
fixtures outside the standing list too, after fixing faults in my own fixture changes.**
The first full pass had 8 standing failures and 1 extra. None was the product:

- **Riverside's shape.** Each run's Riverside came out as a portrait letter page. At 100%
  it runs below the window, so clicks aimed low on the sheet missed it (f8-s13, s14,
  s18, s9 AC1). It is landscape now, as the old seeded sheet was.
- **The old name.** f8-s9, s11 and s12 still expected "Bench E."; window A is now
  "Fixture O.".
- **Order and scope slips.** f8-s10 and s11 used the shared world before making it, and
  f3-s5 shadowed its account's name. f8-s3 read a 2-minute token too early.
- **The seeded-account check.** Its "before" list lived in the api container's `/tmp`,
  which the outage fixtures restart. The list is on the host now.

The rerun showed two waits too short: f8-s10 read the settings radios before they drew,
and f8-s15 read New project before capabilities arrived. Both now wait, and pass. f8-s5's
Redis outage step missed the next event once in the rerun. It passed in the full pass and
on its own rerun, and the api log shows the listener retrying each second as designed.
If it comes back, the fixture's 3 s grace after Redis returns is the first place to look.

`fx-cleanup` deleted 189 workspaces made by fixture accounts across the runs, and
every run ended "estimator@bench.intelcost.io gained no workspace".

## Part 1: fixes before Block B

| Fix | What changed | Proof |
|---|---|---|
| **f8-s13, 8 frames a second** | `useDrafts` sends at most 8 a second. When its timer fires it re-checks the elapsed time, since a timer can fire early. It stamps a send only once the frame is on the socket: serialising a long run takes milliseconds on a slow machine, and that had shrunk the gap on the wire to 120 ms | A new f8-s13 step runs with the CPU slowed six times and the main thread kept busy: peak 7 to 8 a second, never closer than 125 ms, none dropped by the api. 8 runs pass. The old throttle fails it |
| **f8-s2 AC4, with a cause** | The click aimed at an Account link while the shell was redrawing: there are two such links (the header's and the email banner's), and the switcher had 860 workspaces. The fixture now clicks the header's own link once the network has settled | **10 of 10** |
| **Bench clean-up** | 858 fixture-made workspaces deleted from estimator@bench.intelcost.io (rows by cascade, storage by prefix). Kept: Bench Construction and the F5 Block A demo. Nothing was unrecognised, so nothing needed asking | `drives/bench-workspaces.py report`: keep 2, fixture-made 0, not recognised 0 |
| **Fixtures on their own accounts** | Every fixture in the regression uses its own throwaway account (`fixtureOwner`, `fx.<fixture>.<stamp>@`). The takeoff ones measure on a Riverside of their own (`lib/world.mjs`), loaded through F5's path with Sara W. seated. `regress.sh` snapshots the seeded account first and fails if it gains a workspace (`seeded-ws`). At the end it deletes every fixture account's workspaces (`fx-cleanup`), then tidies Bench Construction | Every run since: "estimator@bench.intelcost.io gained no workspace" |

## Part 2: links switch workspace (D-37)

`GET /api/resolve/{kind}/{uuid}` names the workspace and project that a project, sheet or
item belongs to, and it answers only a member of that workspace. Anyone else gets the
same 404 as a uuid that doesn't exist. `InItsWorkspace` wraps Project Home, the sheet
route and the empty takeoff route: when the project is in another of the person's
workspaces, it switches, as the switcher would.

`d37-links` passes 6/6, three times. With the wrapper removed, AC1 and AC2 fail, as you
saw with the demo. Estimates, markups and assemblies join the resolver as they're built.

## Part 3: collaboration settings (D-38, amends D-33)

- Settings > Account > Collaboration gains **"Live drawing line": Solid (default) or
  Dashed**.
- **"Colour others by" now defaults to Item colour**; the other choice reads "Each
  colleague's own colour".
- Preferences stay stored sparse, and `null` puts one back on its default. Sara W.'s
  stored choices had been written by the fixture's reset, so I cleared them, and both
  bench people now read the new defaults.

`f8-s14` passes 4/4. It checks the six preferences, then on the canvas: solid in the
item's colour by default, dashed and each colleague's colour when chosen. The F8 archive
note, PARITY and FEATURES are updated.

## Part 4: F7 adopted (D-39)

- The draft is now `docs/tasks/canvas_tools_tasks.md`, with your answers in its table.
- **Page acts:** Crop as New Page stays in F7 (S31); the other page acts are
  **P-20 "Sheet page acts"**, in FEATURES after F7.
- **Settings:** canvas settings live on the user, stored sparse. The rule for later:
  rendering and performance settings stay per device.
- **Auto-merge** merges only the merging person's own shapes of the item, from any time,
  never a colleague's.
- **F11:** Legend, Print and Dimension go there. Unbuilt region-menu rows are hidden, not
  disabled.
- **Collaboration:** F7's section draws drafts by D-38.
- **Board:** F7 sits in Blocked, after F6. The F11 row notes that Dimension is used a lot,
  so F11 should not slip far.

## Part 5: F5 Block B

| Subtask | Proof |
|---|---|
| **S20** Count pages without the file (your first subtask) | `f5-count`: a 519 MB, 150-page PDF counted from 230 KB in 4 ranged requests, the Load answering in 0.35 to 0.44 s. The first attempt (pypdf's lenient mode) read 38 MB, one request per object, so strict parsing comes first. A PDF with a broken cross-reference still counts |
| **S4** Perform Takeoff, one decision | `f5-s4` 6/6:<br>• a project with files asks "Load project files into takeoff";<br>• Skip leaves "No sheets yet", a refresh doesn't ask, and the next Perform Takeoff asks again;<br>• once a page is loaded it opens that page and never asks;<br>• a project with no files opens empty, with Add sheets;<br>• Project Home's button agrees with the ruler, and a double press navigates once |
| **S5** From Project Files | `f5-s5` 6/6:<br>• ticking Plans reaches a file in Plans/Addenda and part-ticks the root;<br>• a .docx is greyed "unsupported type", and a PDF in takeoff reads "in takeoff — pick more pages";<br>• the footer reads "1 already in takeoff · 1 unsupported", and Open project files is there;<br>• the button goes from Choose pages (0), disabled, to (3);<br>• the empty project has its sentence |
| **S6** Choose pages, then Load N pages | `f5-s6` 6/6:<br>• thumbnails with Select all, Clear, and "5 of 5" down to "0 of 5";<br>• "Load 3 pages" gives "Added 3 pages" and lands on page 1;<br>• loaded pages show "loaded" and are locked;<br>• **150 pages: the first thumbnail 251 ms after the step appears, never more than 3 drawing at once**;<br>• a broken PDF is named in "Couldn't open some drawings" while the good one loads |
| **S7** Upload drawing | `f5-s7` 3/3:<br>• a PDF and a PNG go to the project root, 3 sheets, "Sheets added";<br>• a .dwg reads "Skipped Site plan.dwg · Sheets can be PDF, PNG, JPG or TIFF.";<br>• the PNG is one sheet, 600 x 450 pt, the same 4:3 as the image |
| **S8** Add sheets | `f5-s8` 4/4:<br>• titled "Add sheets", with no Skip;<br>• pages already loaded are locked, and "Load 1 page" adds one;<br>• the empty state's Add sheets opens it too |
| **S9** The Sheets block retired | `f5-s9` 2/2:<br>• Project Home has no Sheets block;<br>• `seed.py --reset` loads Riverside through `/drawing/load`, 2 sheets prepared, page 1 at 200 ft per unit;<br>• **AC3, F8 on the new seed, is the full regression: every F8 fixture now measures on a Riverside loaded that way** |

**Retired with the block:**
- the direct drawing upload and its `complete`;
- the 150 DPI whole-file PNG render;
- `SheetStatusBadge` and `uploadToStorage`;
- `f4-s25`. `f4-s13` became `f5-s4`.

Sheets made by the old path keep their PNG and still open.

## Findings

1. **pdf.js had to be its legacy build.** The modern build calls `Uint8Array.toHex`, which
   the bench's Chromium lacks: every open failed with "toHex is not a function". Legacy's
   renderer uses the legacy build for the same reason.
2. **The dev server reloaded the page on pdf.js's first import**, which threw the dialog
   away. `vite.config.ts` now pre-bundles it. The app image was rebuilt twice for this.
3. **A sheet still preparing now reads "Preparing the sheet"** rather than an error, and
   draws itself when the worker is done. Block C draws it at once with pdf.js.
4. **Add sheets sits on the canvas bar and the empty state** until the sheets panel's "+"
   in Block D.
5. **Each takeoff fixture now builds its own Riverside**, which takes about 25 s, so the
   full regression is slower.
6. **Old bench drawings stay unlinked (Q8).** Your Bench Construction Riverside keeps its
   PNG sheets and measurements; the per-run copies are the new path.

## Commits (all on `umer-dev`, all pushed)

| Repo | Commit | What |
|---|---|---|
| app | `424ce56` | Part 1: live drawing frames at 8 a second, spaced on the wire |
| infra | `9b4036d` | Part 1: fixtures off the seeded account; f8-s13 under load; f8-s2 AC4 |
| infra | `e27de43` | Part 4: F7 adopted; D-37, D-38, D-39 logged; mirror |
| api / app / infra | `af083e1` / `7e2e505` / `070a6b7` | Part 2: D-37 |
| api / app / infra | `5b3b67c` / `1ea0f4c` / `39d57c1` | Part 3: D-38 |
| api / infra | `f67e9cd` / `e8228be` | Part 5, S20: page counts by ranged reads |
| api / app / infra | `a2af2a8` / `3ead577` / the commit carrying this report | Part 5, S4 to S9, the world fixtures, this report |

## Click-only checks for you

Sign in at http://localhost:5173 as estimator@bench.intelcost.io.

**Part 1**
1. The workspace switcher lists two: **Bench Construction Test** and **F5 Block A demo
   15:16**.

**Part 2**

2. With Bench Construction active, paste this into the address bar:
   http://localhost:5173/project/4f81e0c6-ffe7-434a-8fcd-31ea961b3abf.
   - It opens "Loaded from files", and the switcher moves to the demo workspace by itself.
   - Switch back to Bench Construction and open a made-up link such as
     http://localhost:5173/project/00000000-0000-0000-0000-000000000000. It says "Project
     not found", and the switcher stays put.

**Part 3**

3. Settings > Account > Collaboration shows six choices: "Live drawing line" (Solid,
   Dashed), and "Colour others by" with Item colour selected.
4. Two windows, A on 5173 and Sara W. on 5174, both on Riverside's Page 1.
   - A draws a run slowly. B sees it **solid**, in the item's colour.
   - B picks Dashed: the next run is dashed.
   - B picks "Each colleague's own colour": it turns A's colour.

**Part 5**

In the demo workspace (switch to it, or use the link above):

5. **Perform Takeoff, and Load project files.**
   - Open Project Home for any project with a PDF in Plans and nothing loaded; upload one
     through Files if needed.
   - Press Perform Takeoff. "Load project files into takeoff" opens, with its sentence and
     Skip.
   - Tick the PDF, then Choose pages: thumbnails appear, three at a time.
   - Untick one, then Load. It says "Added N pages" and opens the first sheet, which shows
     "Preparing the sheet" for a moment, then the page.
6. **Skip, and ask again.** In another project with a PDF, press Perform Takeoff, then Skip.
   - It shows "No sheets yet".
   - Refresh: no dialog.
   - Perform Takeoff again from Project Home: it asks again, since nothing was loaded.
7. **Add sheets.** On a sheet, press **Add sheets** in the bar.
   - The dialog is titled "Add sheets", with no Skip.
   - A file's loaded pages show "loaded", ticked and locked.
8. **Upload drawing.** In the dialog's Upload drawing tab, drop a PDF and a PNG.
   - Both go to the project root, and it says "Sheets added".
   - Try a .dwg or a .docx: it says "Skipped …", "Sheets can be PDF, PNG, JPG or TIFF."
9. **Project Home** has no Sheets section; Files is the only place a drawing goes in.
10. **Your Bench Construction Riverside** still opens and measures as before; its sheets
    are the old kind.

**For Abdullah**
- pypdf is a new api dependency, beside Pillow.
- pdf.js ships as a lazy 468 kB chunk plus a 1.3 MB worker, loaded only on takeoff.
- The seed runs in the api container with `--storage-host host.docker.internal:9000`.

## After your check: Choose pages on the 429 MB set

**Your finding:** "Couldn't open some drawings" on "JHS Permit C 50CD_VOL 3_2026-07-17.pdf",
with IDM popping up.

**Cause.** [pdfjs.ts](../../intelcost-app-react/src/features/takeoff/pdf/pdfjs.ts) handed
pdf.js a presigned link to MinIO ([storage.py `presigned_get`](../../intelcost-app-fastapi/app/core/storage.py),
from [project/service.py `download_url`](../../intelcost-app-fastapi/app/features/project/service.py)).
- pdf.js's first request for a URL is a plain GET for the whole file, which it aborts once
  it sees ranges work.
- For this set that GET was a `.pdf` URL answered 200 `application/pdf`, 450 MB, with a
  filename: exactly what IDM and similar take over. Taking it over kills the browser's
  request, and the open fails.
- [LoadSheetsDialog.tsx](../../intelcost-app-react/src/features/takeoff/components/load/LoadSheetsDialog.tsx)
  then showed only the file name, with the reason in the console.
- The bench's Chromium, which has no IDM, opened the set in 4 s. Every range read was a
  206, and MinIO's CORS was right. Your requests reached the api.
- The toast has no link and no click action. The IDM pop-up came from IDM taking pdf.js's
  GET, at the same moment the toast appeared.

**Fix.**
- **The browser reads drawings only through the api now, in parts.** The new
  `GET …/file/{uuid}/bytes` needs a `Range` header and always answers 206, as
  `application/octet-stream`, with no filename and no Content-Disposition.
- **pdf.js is never given a URL.** It asks our reader for the ranges it needs through a
  `PDFDataRangeTransport`, so no request is ever for the whole file. Nothing looks like a
  download, and no browser navigation or download is ever started.
- **A failure is named per file, with its likely cause:**
  - "Your browser couldn't fetch it. A download manager or browser extension (IDM or
    similar) may be taking it over, or the connection dropped…";
  - the server's refusal, with its status;
  - "It isn't a readable PDF."
- **The toast stays plain text:** clicking it fetches nothing.
- **Chunks are back to pdf.js's default of 64 KB, from 256 KB.** Opening checks the last
  page by walking every page object once. On a 150-page set whose page objects sit between
  large images, 256 KB chunks read 39 MB just to open, and 64 KB reads 9.4 MB.

**Proof.**
- **Your JHS set:** pages offered in 4.1 s. 49 reads, 4.6 MB with the first thumbnails,
  all 206, and no request to MinIO.
- **`f5-big`** (new, 3/3):
  - a 519 MB, 150-page set's pages offered from 9.4 MB in 151 reads (12.8 s; it walks
    those page objects one by one), all 157 reads 206;
  - a 7 MB set's thumbnails drawn in 3.5 s;
  - with the reads blocked, the toast names a download manager or extension, and
    clicking it makes no request, no download and no window.
- Throughout, the browser stood in for IDM, aborting any `.pdf` URL or storage request;
  none was made.
- **IDM itself can't run on the bench**, so the check with IDM on is yours, below.
- `f5-s5` 6/6, `f5-s6` 6/6 (Broken.pdf now reads "It isn't a readable PDF."), `f5-s8` 4/4.
  The full regression was not run, as asked.

**Re-check, click only.** IDM running and its browser extension on.
1. Sign in at http://localhost:5173 as estimator@bench.intelcost.io, switch to "F5 Block A
   demo 15:16" and open "Umer plans test".
2. Perform Takeoff (or Add sheets), tick "JHS Permit C 50CD_VOL 3_2026-07-17.pdf", then
   press Choose pages.
   - Within a few seconds, its pages show and thumbnails start drawing.
   - IDM does not pop up.
   - Nothing downloads.
3. Untick all but one page and press Load 1 page: "Added 1 page", and the sheet opens.
4. Optional, for the message:
   - With the dialog open and the file ticked, stop the api with
     `docker compose stop api` (from `intelcost-infra/`), then press Choose pages.
   - A toast reads "Couldn't open JHS Permit…", naming a download manager, extension or
     the connection.
   - Clicking it does nothing: no download and no IDM.
   - Then run `docker compose start api`.

## Next

Block C: pdf.js on the canvas (S10 to S12). It draws sharp from 50% to 4000% (D-35),
uses the fit tier and the two-stage re-raster, and adds split-source and one-call signed
URLs. Not started, as asked.
