# TF — Takeoff-first: upload to takeoff in one move (D-309, D-310, D-311)

_Picked up 2026-10-08. Built 2026-10-09 in the founder's order: D-309, D-310 (A, B, C), D-311
(A, B, C, E, D). Awaiting the founder's click check._

## Problem

Starting takeoff took a project page, a four-category upload box, a "Load project files"
step, then a "Choose pages" step, every page ticked including the specs. New projects came
with four empty folders. The dashboard was home, so every sign-in landed one click away from
the drawings, and a large upload held the New project dialog open.

## Solution

| Block | What | Where |
|---|---|---|
| D-309 | A new project has no seed folders; Add files is one drop zone (files or a folder, tree kept) | api `project/service.py`, `scripts/seed.py`; app `project/components/{NewProjectDialog,FileDropZone}.tsx`, `project/files/drop.ts` |
| D-310 A | Sizes first: `measure_file_pages` on the main queue (ranged pypdf, 32 MB budget, whole-file fallback); `GET …/file/page-sizes` | api `worker/tasks/prepare.py`, `project/{routes,service,schemas}.py` |
| D-310 B | One load screen: tree with page-based ticks left, pages / one-page grid / sets right; drawing-size ticks on first run (short ≥ 750 pt, long ≥ 1150 pt); Add sheets starts empty; Upload drawing never loads by itself | app `takeoff/components/load/*`, `takeoff/load-selection.ts` |
| D-310 C | New project's one Create opens takeoff (load screen when it brought files) | app `ProjectsCard.tsx`, `NewProjectDialog.tsx` |
| D-311 A | `project_visit` (migration `d311a7c4e9b2`), `PUT …/visit`, `GET …/project/home`, `GET …/project/recent` | api `project/{visit,models,routes,schemas}.py` |
| D-311 B | `/` is Home (naming, else the api's chain, else the empty state); the list moves to `/projects`; `routes.home` and `routes.projects` at every call site; auto-named workspace at signup; the open sheet recorded 2 s after it changes | app `pages/{Home,Dashboard,Signup,…}.tsx`, `config/routes.ts`, `project/hooks/use-record-visit.ts` |
| D-311 C | Project menu, since D-312 the Open menu (recent → last sheet, All projects, New project, Project details & files, Wage Calculator, Switch workspace); avatar menu (Account, Billing & plan, Workspace & team, Community, Developer, Sign out) | app `project/components/ProjectMenu.tsx`, `workspace/components/AccountMenu.tsx`, `TakeoffHeader.tsx`, `app-shell.tsx` |
| D-311 E | One upload queue for the app with its tray: resumable Retry, Cancel discards, a failure never stops the rest, refresh on landing, a warning before leaving; New project no longer waits | app `project/uploads/{store,use-uploads,UploadTray}`, `upload.ts`, `FileBrowser.tsx`, `UploadDrawing.tsx`, `LoadSheetsDialog.tsx` |
| D-311 D | Empty state drop: the project is made and named (folder → its name, contents at root; one file → stem; several → dated name, rename prompt) and the load screen opens at once | app `project/components/EmptyHome.tsx`, `pages/TakeoffStart.tsx` |

## Check (2026-10-09)

All gates pass except the pre-existing alembic drift (P-23); the quantity table passed after
every block. Smoke tests through the Playwright MCP, throwaway accounts:

- **D-309**: a folder (BidSet/Electrical) and two loose PDFs into a new project → no seed
  folders, tree kept, loose files at the root. A real drag-drop of a folder cannot be driven
  from the MCP; the folder input was driven instead.
- **D-310**: first run ticked 4 drawing PDFs, not the two letter-size specs; ticking Specs took
  all 4 pages; one page unticked; Load made exactly those 11 sheets. Add sheets opened with
  nothing ticked. Create opened takeoff on the load screen, preselected.
- **D-311 A/B**: no visit → latest project; visit → that sheet; the sheet deleted → the
  project's first sheet; the project in Trash, or Archived → the empty state; restored → back.
  Signup → "Robin's workspace", no naming step, empty state; `/projects` lists.
- **D-311 C**: menus as listed; Wage Calculator and Billing & plan reached; "Back to takeoff"
  returned to the last sheet.
- **D-311 E**: New project with a 20 MB set opened the load screen in 726 ms, tray "Uploading 1
  of 3"; files appeared as they landed and were ticked by size; Cancel mid-upload left no row.
- **D-311 D**: three loose files dropped → takeoff in 374 ms, "New project – Oct 8, 2026"
  selected for rename → "Drop Test" → load screen; a folder dropped → project "BidSet", its
  files at the root and Electrical kept.

## Follow-ups (2026-10-09, D-311 7 and 8)

- **A1**: three projects; the last visit trashed → the other visited project; archived → the
  same; both visited gone → the latest live project (never visited); restored and visited → it.
- **A2**: a member on Beta's sheet removed by the owner → toast, Home in their own workspace in
  659 ms, no error screen. A member with no other workspace and no socket → their next request
  refused `not_a_member` → Home → "Name your workspace", no error screen.
- **A3** (5 Mbps up over CDP, real S3): a 210 MB 3-page set plus a 30-file folder through New
  project. The load screen opened at once; 24 drawings ticked as they landed, 6 specs not; the
  big file's row "Uploading…" (once the file list was asked for while the queue ran), then
  "Preparing…", then 3/3 ticked. Offline → tray "Paused" within 2 s, back online → it carried on.
  S3 parts refused → "Upload failed · Retry" on the row → Retry resumed at 23 %, not 0. A file
  that failed did not stop the next. Cancel from the row and from the tray: no file row left.
  Reload mid-upload → the browser's leave-page prompt; dismissed, the upload went on. Found and
  fixed: the tray behind the modal (row actions), toasts over the tray, no "Uploading…" row.
- **A4**: ticks by size derived at render (no effect, no refs); held through A3 in StrictMode.
- **A5**: `?company=  <b>Acme</b>\nCo‮  ` → "<b>Acme</b> Co", shown as text in the app; the
  invitation mail's HTML had the name raw, now escaped (`&lt;b&gt;`), with every name in mail.
- **A6**: the fixture rewrite is a Planned block (FX) on MANAGER, ahead of the tester deploy.

## D-312: Open is a menu (2026-10-09)

| What | Where |
|---|---|
| Open menu: search, recent (8, current marked, "No sheets yet"), All projects, New project, Project details & files, Wage Calculator, Switch workspace | app `project/components/OpenMenu.tsx`, `components/ui/{menu,context-menu}.tsx`, `takeoff/components/{TakeoffTabs,TakeoffHeader}.tsx`, `pages/TakeoffStart.tsx` |
| `q` name search and `has_files` on the project list; `has_sheets`, `has_files` on recent; `GET …/{project}/visit` | api `project/{service,schemas,routes,visit}.py` |

The Open dialog's one opener was the Open button (`TakeoffTabs.tsx`, wired in
`TakeoffHeader.tsx`); both now render the menu. `ProjectMenu.tsx` is deleted.

**Check:** on Beta's sheet the centre is a plain span with its tooltip, Open's menu opens with
the search focused, Recent tags the two projects with files and no sheets and marks Beta;
"two" + Enter → Throttle Two on the load screen; "zzq" → "No projects match."; reopened, the
field is empty; Recent → Beta on its last sheet, centre "Beta"; Recent → Throttle Test → load
screen → Load 24 pages → its sheet, centre "Throttle Test"; search "bet" + click → Beta's last
sheet; "alp" → "Searching…" then archived Alpha (no stale rows); "throttle t" + Enter → the
Throttle Test sheet last open; Alpha's no-sheets screen → Open → Beta.
