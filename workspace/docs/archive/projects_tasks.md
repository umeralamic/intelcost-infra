# F4 — Projects dashboard, project creation, Project Home, files and folders

_Spec for the `MANAGER.md` F4 row. Closes [PARITY.md §4](../PARITY.md#4-projects-dashboard)
(projects dashboard, 19 lines) and [§5](../PARITY.md#5-project-home) (Project Home, 9
lines), plus the four [§2](../PARITY.md#2-workspace-settings) lines F3 handed on: Statuses
×2 and Trash ×2 (F3-S19, F3-S20)._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) · **Parity:** [../PARITY.md](../PARITY.md) ·
**Inherited from:** [workspace_roles_tasks.md](../archive/workspace_roles_tasks.md) S19, S20

_Written 2026-09-25 from legacy `intelcost/` at `12dd119b`. Status: **questions answered
2026-09-25, D-26, D-27, D-28 and D-29 logged. Block A (S1, S2) built, checked by the
founder and pushed. Block B (S3, S4) checked and pushed. Block C (S5 to S16) checked and
pushed. Block D (S17 to S19) checked and pushed. Block E (S20 to S25) checked and pushed.
D-31 (projects-only dashboard, no New from folder) applied. Block F (S26, S27) checked by
the founder; the two bugs the checks found (dialogs taller than the window, members of one
name) fixed and driven. **Closed 2026-09-25** and archived.**_

## Progress

| Block | State | Proof |
|---|---|---|
| **A: S1, S2** | Built and driven, 2026-09-25 | `browser/f4-s1.mjs` 8/8 and `f4-s2.mjs` 6/6, `drives/f4-s2-bundle.sh` 4/4. Regression: `f3-s3` 3/3 and `f3-s12` 8/8. Gates: ruff, mypy, lint, typecheck and build. Migration `95c121b3680c` driven up, down and up. |
| **B: S3, S4** | Built and driven, 2026-09-25 | `browser/f4-s3.mjs` 11/11 and `f4-s4.mjs` 9/9. Regression: `f4-s1` 9/9, `f4-s2` 6/6, `f3-s1` 5/5, `f3-s3` 3/3, `f3-s12` 8/8, `f4-s2-bundle.sh` 4/4. Gates: ruff, mypy, lint, typecheck, build. Migration `80c841e4b096` driven up, down and up. The dashboard half of S3 and S4 is carried into S5 and S9. |
| **C: S5 to S16** | Built and driven, 2026-09-25 | `browser/f4-s5` 7/7, `s6` 3/3, `s7` 7/7, `s8` 4/4, `s9` 5/5, `s10` 4/4, `s11` 5/5, `s12` 3/3 (three phases, with `drives/f4-s12-age.py`), `s13` 3/3, `s14` 4/4, `s15` 3/3 (with Block A check 5), `s16` 1/1. Migration `99ca0a2606b6` driven up, down and up. The S3/S4 dashboard half is driven in `s5` and `s9`. |
| **D: S17 to S19** | Built and driven, 2026-09-25 | `browser/f4-s17` 12/12 (with S7 AC9's reload and resume, and a second-project step), `f4-s18` 4/4, `f4-s19` 3/3, `bench-code` 1/1 (D-30). Migration `b7d41e2c9a53` driven up, down and up, twice. Regression: `f4-s1` to `f4-s16` all pass (`s12` 3/3 across its phases), `f3-s1` 5/5, `f3-s3` 3/3, `f3-s12` 8/8, `f4-s2-bundle.sh` 4/4. `f4-s1` AC4 renamed its folder to a free name, because names are now unique among siblings. |
| **E: S20 to S25** | Built and driven, 2026-09-25 | `browser/f4-s20` 3/3, `f4-s21` 5/5, `f4-s23` 4/4, `f4-s24` 6/6, `f4-s25` 2/2 (S22 is P-17's and has no fixture). Full regression through `regress.sh`, `bench-code` first: `f4-s1` to `f4-s25` all pass (26 fixtures, 0 failed), `f4-s12` 3/3 across its phases, `f4-s2-bundle.sh` 4/4. Gates: ruff, mypy, lint, typecheck, build. New dependencies: TipTap and DOMPurify (app), `nh3` (api). `f4-s3` run 10 more times with full output kept: 10/10. |
| **D-31** (between E and F) | Built and driven, 2026-09-25 | `browser/f4-s6` 3/3 and `f4-s8` 3/3 rewritten for the projects-only dashboard; `f4-s7` 7/7, `f4-s17` 12/12, `f4-s18` 4/4, `f4-s19` 3/3, `f4-s25` 2/2 after the seed switch went. Gates: ruff, mypy, lint, typecheck, build (main bundle 644 → 637 kB). Its full regression is the one below. |
| **Close-out fixes** | Built and driven, 2026-09-25 | Dialogs fit the window: `browser/f4-dialogs.mjs` 8/8 (New project both steps, Edit details, New folder, Move, Upload folder's destination, the Trash confirm, Lost, Add status and the link prompt, each at 1280x650 and 375x667). Members of one name: `f4-s10` 5/5 with its new step. Touched fixtures `f4-s3`, `s7`, `s9`, `s14`, `s17`, `s18` all pass. Full regression: 29 fixtures, 0 failed. Gates: lint, typecheck, build (main bundle 642 kB). |
| **F: S26, S27** | Built and driven, 2026-09-25 | `browser/f4-s26` 8/8, `browser/f4-s27.sh` 9/9 (setup, age, S26 AC2, dry run, a MinIO outage, the retry, the browser after, beat). Migration `c4e8a1f6b209` driven up, down and up. Full regression through `regress.sh`, `bench-code` first, nothing edited during it: 28 fixtures, 0 failed (`f4-s1` to `f4-s27`, `f3-s1`, `f3-s3`, `f3-s12`); `f4-s12` 3/3 across its phases; `f4-s2-bundle.sh` 4/4. Gates: ruff, ruff format on the files touched, mypy, lint, typecheck, build. |

**Found while building Block A:**
- `_read` in the project routes composed the response by reading every schema field off
  the row. That broke on `workspace_uuid`, which is context and not a column. Every
  project call returned 500 until it was fixed. The fixture caught it on its first run.
- The dialog's "give focus back" captured its opener in an effect, after an `autoFocus`
  field had already taken focus, so focus fell to the page body on close. The opener is
  now read during the first render.
- Renaming `toast.tsx` left the Vite dev server resolving the old path, and the app
  white-screened until the dev server was restarted. This was a dev-server cache, not a
  code fault. The production build was unaffected.

**Found while building Block B:**
- The new status colours rendered as plain text. The bench's app image copies
  `tailwind.config.ts` in rather than mounting it, so the dev server and the container
  build were still on the old config. The image was rebuilt, and the trap is now in
  `intelcost-infra/README.md`.
- A second tab did not refetch in `f4-s3` because the fixture dispatched `visibilitychange`
  on `document` only. TanStack Query v5 listens on `window`. The fixture now signals focus
  the way `f3-s8` does. This was a fixture fault, not an app one.
- The api said "A active status…". The article is now chosen by bucket.
- `f4-s1`'s new pricing step read New project the instant it was drawn, while permissions
  were still loading (loading reads false by design). It now waits for the answer.

**Built in Block C beyond the letter of the subtasks, and why:**
- **The api half of S17 came forward**, as the sequencing says, because S7 uploads into
  it: `ProjectFile` (D-27), multipart start, part URLs, parts held, complete, cancel, and
  `GET …/file`. Folder lookups are now scoped to their project as well as their workspace.
  The file browser UI, and the rest of S17's fixes, stay in Block D.
- **A file at the project root has a null `folder_id`.** Legacy kept a root folder row
  named after the project, and a trigger to keep the two names in step. The spec said
  `folder_id` NOT NULL. The project already is the root, so null says it without the
  extra row.
- **`lost_note` is its own column.** Legacy wrote the Lost dialog's note over the
  project's description, and `f4-s9` proves ours does not.
- **An upload waits out a dropped connection** on its api calls as well as its part PUTs.
  Going offline between parts had failed the whole file.
- **Assigning on Project Home shows the change at once.** Each save sends the whole
  list, so two quick ticks cannot race, and a refusal rolls back with a toast.
- **S6's pending invitations are listed, not actioned.** Resend, new link and revoke stay
  in Settings, Members, where D-24's warning before a new link lives. The panel links
  there.
- **S7 AC7 and AC9 changed** (see S7): the ceiling is proved by the api's part plan plus a
  real multi-part upload, and resume after a reload moved to S17 with the "Unfinished
  uploads" list.

**Built in Block E beyond the letter of the subtasks, and why:**
- **"Project not found" is a page, not a toast and a redirect.** Legacy toasted and sent
  you back to the dashboard. The spec asks for the words and a way back, so an unknown
  or trashed project reads "Project not found. It may have been moved to Trash, or the
  link is wrong." with Back to Projects, and the tab says so. A 404 is not retried.
- **Estimating's reason is on the page.** A disabled button's tooltip never shows,
  because disabled buttons take no pointer events. So "Estimating arrives with the
  estimating tab." sits under the button.
- **One address block, `AddressFields`.** It is used by New project, New from folder,
  Edit details and the Location card. Legacy's Location popover was a second, simpler
  copy with a free-text State; ours offers the US state list, as the dialogs do.
- **The rich-text editor is lazy-loaded.** TipTap is a 394 kB chunk fetched on the
  first Edit; read mode needs only DOMPurify. The main bundle is 644 kB (579 kB after
  Block C): Block D and E's own code, plus DOMPurify. That is P-18's problem, and it is
  on the record there.
- **A link in the editor uses the app's prompt dialog**, not `window.prompt` as legacy's
  does.
- **Over 50,000 characters, the api refuses in words.** Legacy's panel quietly cut the
  text at 50,000 in the browser. Ours counts in red past 45,000, and a Save over the
  limit is refused with "Scope of Work is N characters, over the 50,000 limit. Shorten
  it and save again." Nothing is truncated.
- **The Sheets block's upload button moved** from the page header to the Sheets heading,
  since the header now holds Estimating and Perform Takeoff, as legacy's does. The block
  itself is unchanged (S25).

**Found while building Block E:**
- **The f4-s3 failure from the Block D regression (the duplicate-status step).** I ran it
  10 times with full output kept: 10/10 passed, on top of 7 earlier clean runs. Its
  cause is **not established**, and this note is not calling it flaky. What is known:
  - The failure's own error text was lost to the summary filter that regression used.
    That is why `regress.sh` now keeps every fixture's full output and why `run` prints
    the whole error with its cause.
  - The audit log of that run's workspace shows the whole run at half speed. The step
    took about 10 s longer than half speed accounts for. No duplicate "won" status was
    ever saved.
  - It was not a Playwright timeout, because the filter kept those lines and none was
    printed.
  - Ruled out by probe:
    - a slow browser (CPU throttled 6×, 6 tries)
    - slow api answers (up to 2.25 s on every call, 6 tries)
    - the header's workspace switch
    - `npm run build` reloading open pages (it does not)
    - a frozen api (a call waits for it and does not fail)

  If it happens again, `.regress/f4-s3.log` will hold the answer.
- Saving an api file that imports a package the running image lacks takes the api down
  until the image is rebuilt (`nh3` here). Rebuild first, then import.
- **An older assignee save undid a newer tick** (app, fixed). Ticking Alice then Bob
  quickly: Alice's save finishing cleared the on-screen list back to the api's answer
  while Bob's save was still in flight, so Bob showed unticked until his own came back.
  Only the latest save now clears it. f4-s10 caught it once the picker moved into the
  cards.
- **A right-click menu closed as it opened** (app, fixed). A scroll event arrives a frame
  after the scroll. So a scroll already under way when the menu opened (momentum, a
  smooth scroll, Playwright bringing a row at the viewport's edge into view) closed the
  menu with the page not having moved since. A probe showed it: contextmenu at scrollY 5,
  menu open, scroll event reporting scrollY 5, menu closed. The menu now closes on a page
  scroll only if the page has actually moved since it opened. f4-s17 AC7 met it after the
  cards pushed the file browser down the page.
- **f4-s12's check phase could read an older run's workspace** (fixture, fixed). The
  workspace list is ordered by name alone, and every run's workspace is named "F4-S12
  follow-up", so taking the last one was arbitrary. The drive picks the newest by id;
  the check now picks the newest by `created_at`.
- f4-s15 looked for the api's "No such project." on a trashed project's page. It now
  looks for S20's "Project not found".

**Changed between Block E and Block F, by the founder (D-31):**
- The dashboard shows projects only: no team panels, no branding nudge, subtitle "Your
  projects." New from folder is removed, and with it the create's `seed_folders` switch,
  so every project gets its four seed folders. The folder find-or-create stays for Upload
  folder. `f4-s6` and `f4-s8` are rewritten to prove the new shape (see S6 and S8).
  Fixtures that made projects through the api no longer ask for seedless ones.
- The Sheets block stays only as the bench's path into takeoff until F5 replaces it
  (S25). The F5 row in MANAGER.md and PARITY §7 carry the legacy flow that replaces it.

**Built in Block F beyond the letter of the subtasks, and why:**
- **A project already purged says so.** Restore or delete permanently on a project
  that the nightly job, or another tab, already took answers 404 "This project was
  permanently deleted.", read from the purge log. The row drops out of the list. A
  restore of a live project is refused "This project is not in Trash.", as a purge of one
  is refused "Move the project to Trash before deleting it permanently."
- **An unfinished upload is aborted on purge.** It has parts and no object, so no prefix
  listing finds it. Its key and upload id are written on the log row, and a retry tries
  any abort that failed. `prefixes_failed` counts both what is left to clear and what
  is left to abort.
- **Every project-scoped storage area is cleared**, not only the three the spec named:
  `project-file`, `takeoff`, `intake`, and `scope-doc`, `trade-scope-doc` and `subquote`,
  which nothing writes yet. They are listed in one place (`trash.PROJECT_AREAS`).
- **The retention window is a setting**, `TRASH_RETENTION_DAYS` (default 30), read by
  the job and the Trash tab alike. The tab shows whole days left, rounded up, from the
  api.
- **The Trash tab is drawn only for `canRestoreDeletedItems`**, as legacy drew it. The
  other settings tabs are drawn for everyone and say what a role cannot do; a hand-typed
  `/settings/trash` does the same, in the api's own words.
- **The nightly purge writes an activity line**, by "IntelCost": "permanently deleted the
  project X, 30 days after it went to Trash". A person's permanent delete writes its own.
- **S27 AC2's storage failure is a MinIO outage, not a bucket policy.** The bench uses
  MinIO's root credentials, and MinIO does not apply bucket policies to root, so a
  deny-delete policy would deny nothing. `f4-s27.sh` stops MinIO for the run instead:
  the rows go, the failure is logged and the objects stay; with MinIO back, pass 1 clears
  them. That run takes about three minutes, because each storage call retries before
  giving up.
- **`f4-s27` is a runner, `browser/f4-s27.sh`,** because its steps alternate between the
  browser, the database, the worker and MinIO. `regress.sh` runs it in the full list.

**Found in the founder's Block F checks, fixed before close-out:**
- **Every dialog could run off the screen.** New project was taller than a short window
  and could not scroll to its top, so Project name was cut off. The dialog was centred
  in a flex box, and a centred box taller than its container overflows at the top as well
  as the bottom, where no scroll reaches. Now every dialog is at most the window's
  height: the title and the buttons stay in view and the body scrolls between them. The
  general Dialog does it for New project, Edit details, New folder, Rename, Move, Upload
  folder's destination, Lost and the status editors; ConfirmDialog, PromptDialog and Set
  the scale have the same structure. Six dialogs drew their buttons at the end of the
  body, where they would scroll away; they now render into the fixed footer
  (`DialogFooter`), their submit buttons naming the form with `form=`.
  `browser/f4-dialogs.mjs` proves it at 1280x650 and at 375x667: for each dialog, the
  title, the first field and the action button in view, before and after scrolling the
  body to its end.
- **Four members named "Bench admin" could not be told apart** in Assigned To. Each
  candidate now shows its email under the name, and a chip, or the picker's summary,
  adds the email when two chosen members share a name. `f4-s10` has a step for it.
- Found while proving it: **at phone width the app's top bar is wider than the screen**
  (the workspace selector and the account links reach 597px on a 375px screen), on every
  page, from before F4. Dialogs are unaffected because they are fixed to the window. Not
  fixed here: it is the app shell's layout, and wants its own change.

**Found while building Block F:**
- **A regression run while code is being edited is not a result.** The D-31 regression
  overlapped the first Block F api edits: `f4-s3` and `f4-s4` failed on the Statuses
  settings page while the api restarted dozens of times, once per save (its log shows the
  reloads in that window). Re-run
  on settled code: `f4-s3` 11/11, `f4-s4` 9/9. That run was stopped and the full
  regression was run once, at the end of Block F, with nothing being edited.
- **The settings tab row does not wrap.** With eight tabs it is wider than a phone
  screen, as it already was with seven. Not fixed here: making it scroll clips the
  active tab's underline, which overlaps the row's border by a pixel. It needs its own
  small change.
- **`alembic check` reports two drifts from before F4**: the audit log's `ix_audit_log_feed`
  index and `feature_flag`'s unique key, both declared differently in their models than in
  their migrations. Neither is from this block, and neither was touched.
- **`ruff format --check` was already failing on 10 files** before Block F. The files
  this block wrote or changed are formatted.

**Built in Block D beyond the letter of the subtasks, and why:**
- **The root is the project, not a folder row** (as in Block C). So "the root cannot be
  renamed, moved or deleted" holds by construction. Its menu offers only New folder, and
  a hand-written PATCH or DELETE naming the project as a folder answers 404, "No such
  folder in this project." (S17 AC8).
- **Folders get the cross-project sentence too.** Legacy only had one for files ("Files
  can only move within their own project."). A folder moved into another project's
  folder now reads "Folders can only move within their own project." Both are 422s. A
  folder of another project is looked up across the workspace only, never outside it.
- **Delete retries on the worker. The retry log is S27's.** A file or folder delete
  queues `delete_objects` after the commit. It retries 5 times, 30 s apart; S27's
  `trash_purge_log` does not exist until Block F, so a failure past the last retry is
  logged for now. S27 picks it up.
- **One list call for a project's files.** `GET …/file` returns every file, unfinished
  ones included, and the browser groups them by folder. Nothing needed a per-folder
  endpoint.
- **Upload folder into any folder.** `/folder/ensure` takes an optional `parent_uuid`, so
  a tree dropped onto Plans lands as Plans/{its name}/…, as in legacy. It used to start
  only from the root.
- **Download saves under the file's own name.** The object key holds a sanitised name,
  so the presigned GET carries `Content-Disposition: inline; filename*=…` from the row.
- **Counts are finished files only.** An unfinished upload is not a file yet.
- **"Unfinished uploads" (S7 AC9)** lists every open upload in the project under the
  contents pane. Resume asks for the same file (name and size must match; otherwise
  "That is not the same file. Pick {name}, {size}.") and sends only the parts S3 lacks.
  Discard aborts the upload.
- **The bench worker restarts on a code change (D-30),** with `browser/bench-code.mjs`
  failing when the api or the worker runs code older than the disk's.

**Found while building Block D:**
- **Seed folders were sorting among other folders.** Every folder took `sort_order` 0,
  so "Survey" listed between Plans and Specs. Folders that are not seeds now take 100
  and list alphabetically after the four seeds. Migration `b7d41e2c9a53` moves the
  existing ones.
- **A duplicate folder name was allowed.** Only New from folder checked for one. Now a
  case-insensitive unique index covers siblings (the root folded to 0, since Postgres
  treats nulls as distinct), and the service refuses first in words. The migration
  renames any clashes that already existed to "Name (2)".
- `f4-s17`'s reload step first held part 2 open with a route that never answered.
  Unrouting released it and the upload finished before the reload, so there was nothing
  to resume. It now fails the later parts instead. This was a fixture fault.

**Found while building Block C:**
- `dict()` over a SQLAlchemy result subscripts it, because the result has a `keys()`
  method, so assigning members answered 500. It is now a comprehension, with a comment.
- The bench's worker was still running pre-F3 code (`workspace.logo_url`), because Celery
  does not reload. The drawing render had been failing quietly since F3. Restarting the
  worker fixed it, and `intelcost-infra/README.md` now says so.
- `waitForLoadState("networkidle")` fires once per page load and then answers instantly,
  so the fixtures' waits after the first load were waiting for nothing. They now poll
  until the list, the counts and the badges stop changing (`settle` in
  `browser/lib/f4.mjs`).
- AC1 of S5 said "Active 1". Legacy's Active tab holds every open status, Submitted
  included, so it is 2. The criterion is corrected.

---

## Founder answers, 2026-09-25

These replace the open questions of the first draft. Each one is reflected in the
subtask it governs.

| # | Question | Answer | Where |
|---|---|---|---|
| Q1 | Which New project fields do we keep? | **Keep:** Project name, Plans Dated, Assigned To, the address (two lines, city, state, postal code, country), Project type, Construction Type, Wage Determination, Labor Pricing Basis, **and Trade Scope as a static list** (General Trades, Specialty Trades). **Add:** **Client** (text) and **Bid due** (date). Both go on the form, in Edit details, on the dashboard row, and in the filters and sort. | S1, S5, S7, S11, S14 |
| Q2 | Geocoder and map | **Deferred** (D-28). The address fields stay. There is no geocoder and no Show Map in F4. They are backlog item P-17. | S21; S22 → P-17 |
| Q3 | Today's "Upload drawings → sheets" | **Keep it working**, below the folder browser, until F5 replaces it. | S25 |
| Q4 | Filters | The GC filter becomes **Client**. **Bid due is a real field.** "Estimator" becomes **"Assigned to"**, matching any assignee. The **follow-up badge is ported as in legacy**. | S11, S12 |
| Q5 | Uploads | **Any file type, no file size limit.** Uploads use **S3 multipart**, so there is no 5 GB single-upload ceiling, with progress and **resume after a dropped connection**. Total storage per tier stays in F16 (tier 3: 500 MB). | S7, S17 (D-27) |

**On the attribute fields.** Wage Determination, Labor Pricing Basis, Trade Scope and
Construction Type were added on 2026-08-04 as dashboard filter attributes, by migration
`20260804081526_e3f14818…`. They did not come from the retired AI-estimate system, and no
retired function ever read them. Legacy calls the last one `project_construction_type`,
because its older `construction_type` meant framing system. Ours has no such column, so
it is `construction_type`, and F17 maps it (D-27).

**Decisions logged before any code:**
- **D-26:** project writes gate on the capability named for them.
- **D-27:** one project file model, drawings derive from files, and uploads are multipart.
- **D-28:** the map and the geocoder are deferred.

---

## The problem

§1–§3 got people into a workspace with the right permissions. The first thing they see
there is the projects dashboard, and almost none of it exists.

**The new app has:**
- A dashboard that is a grid of name cards with an inline name-only create form.
- A Project Home that uploads PDFs straight to sheets.

**Legacy has:**
- A dashboard of project rows with configurable status tabs and counts.
- A two-step New project dialog that seeds four folders and uploads into them.
- Inline status changes, with a lost-reason capture.
- Multi-assignees, shown with their role.
- A filter bar, and a follow-up nudge.
- A Project Home with an editable location, rich-text scope and notes, and a full folder
  and file browser.
- A 30-day trash with a nightly purge.

### What exists today

| Piece | State |
|---|---|
| `Project` model | Subset. `bid_status` is a fixed 6-value enum, not a workspace status. There are no attributes, assignees, lat/lng, status timestamps or `lost_reason`. `ProjectUpdate` cannot patch `address_line_2`, `county`, `country` or `classification_system`. |
| Project routes | List, create, get, patch, soft delete, restore. **All writes gate on `canEditTakeoff`.** Restoring a live project "succeeds". There is no trash list, no permanent delete, no audit and no event. |
| `ProjectFolder` | Model and CRUD routes exist, but **nothing references a folder**: no file has a folder. Folder lookups match by workspace only, not by project. A parent is not checked to be in the same project. The only cycle check is "not its own parent". |
| Files | Only `DrawingFile`: presigned PUT, `complete`, then the PNG render after commit (D-20). It has no folder, no download and no rename. `DELETE` leaves the S3 objects behind. |
| Purge | `purge_trashed_projects` exists with 30-day retention and a 03:00 beat entry. **No beat runs, on the bench or anywhere else.** It deletes rows first, then S3 prefixes. A failed prefix delete is logged and never retried. |
| App | `/` grid of cards, and `/project/:uuid` with Upload drawings and a sheet list. There is no Dialog, Tabs, Select, menu, toast or date picker in `components/ui/`: only `confirm-dialog`, `prompt-dialog`, `context-menu` and `states`. |
| Realtime | `app/features/realtime/` and `src/core/realtime/` do not exist (F8). |
| Tests | `intelcost-app-fastapi/tests/` does not exist. Proof is the bench. |

---

## Corrections to PARITY §2, §4 and §5, applied as part of F4

As in F3, some lines claim more than the code does, or describe something legacy does not
do. They are corrected at close-out. What each line said at spec time is recorded here,
because that is why the subtask is shaped as it is.

| Line | Reads | Should read |
|---|---|---|
| §4 List projects **as cards** | ported | **partial.** Legacy is a list of rows showing name, project type, updated date, assignee +N, follow-up, status changer, takeoff and trash. The new app's cards show a name and a client. S5. |
| §4 Create a blank project, **choosing which seed folders it gets (… Unsorted)** | partial | There is no choosing. The four folders are always seeded by the dialog path. "Unsorted" is not a folder: it is the drop zone, and it uploads to the project root. S7. |
| §4 Filter by status tab, … | missing | The filter bar also has **GC, Created from/to and Bid due from/to**. "Estimator" matches `created_by`. See Q4. S11. |
| §4 Edit project details … **without leaving the dashboard** | missing | Legacy's Edit details lives on **Project Home only**, and has no client field. S14. |
| §4 Browse, create, … **upload a whole folder** | partial | Correct. But the folder browser has **no drag and drop**. The drop zone (§4 "drop onto a zone at the top") is in the New project dialog. S17, S7. |
| §5 Edit the project location inline, **with … a map popover** | missing | The inline editor has no map. "Show Map" is in the create and edit dialogs, and it never shows a map, because the geocoder returns no coordinates. S21. |
| §5 Resolve a US street address … **through the geocoder** | missing | Legacy's only caller is Show Map. No form auto-fills city, state, zip or county. S22. |
| §5 Upload drawings and watch them become sheets. `ProjectHome.tsx` | ported | **Legacy Project Home does not do this.** Files go into folders, and takeoff turns them into drawings (F5). The new app's behaviour is D-12's. S25, Q3. |
| §5 A project id that does not resolve shows "Project not found" | ported | Legacy toasts "Project not found" and redirects to `/app`. Ours must do the same or better, and has not been driven. S20. |
| §2 Trash, "Permanently deleted at the next daily purge" | partial | `purge_project_now` deletes the **rows immediately**. Only the storage waits for the nightly run. The sentence belongs to a project past its 30 days. S26. |

---

## Capabilities (D-21)

Every gate is `require_capability` on the api and `can()` in the app. Hiding a control is
never the only gate. **Viewing** is membership (`CurrentWorkspace`) throughout: a `viewer`
sees everything and changes nothing.

| Action | Capability | Who holds it | Legacy gate, for comparison |
|---|---|---|---|
| Create a project (either dialog) | `canCreateProjects` | owner, admin, estimator, takeoff, pricing (D-29) | any member (RPC) |
| Edit details, location, Plans Dated, scope, notes, attributes | `canCreateProjects` | same | any member (RLS) |
| Change status inline, and mark Lost with a reason | `canCreateProjects` | same | any member (`isOwner \|\| true`) |
| Assign or unassign members | `canCreateProjects` | same | owner or estimator (RLS; **admin excluded, a legacy bug**) |
| Upload files, upload a folder, create a folder | `canUploadDocuments` | owner, admin, estimator, takeoff, pricing, collaborator | any member |
| Rename, move or delete a file or folder | `canCreateProjects` | owner, admin, estimator, takeoff, pricing | any member |
| Download a file | membership | everyone | any member |
| Move a project to Trash | `canManageWorkspace` | owner, admin | dashboard: `isOwner` (a role test). Browser: owner or admin. The RPC also allowed estimator, which no screen could reach. |
| See the Trash tab, restore, delete permanently | `canRestoreDeletedItems` | owner, admin | owner or admin |
| Manage statuses and the dashboard tab strip, and the "Manage statuses" link | `canManageWorkspace` | owner, admin | `is_workspace_admin` |

The table is D-26's content, amended by D-29: `pricing` holds `canCreateProjects`, so it
creates and edits projects as well as uploading. The roles without project creation are
`qa_takeoff`, `qa_pricing`, `collaborator` and `viewer`. `collaborator` keeps uploads,
which is what the collaborator plan mask protects.

---

## Realtime events (D-13)

F8 builds the transport, and F4 ships before it. So, as in F3:

- Every event is **named and not emitted**.
- Each criterion that says "another tab sees it" is met by a **refetch on window focus**.
- The names are fixed here so F8 has its input.

When F8 lands, publishing happens after commit through `outbox.after_commit` (D-20), with
the writer's token echoed back.

| Event | Payload | Emitted by | Replaces legacy |
|---|---|---|---|
| `project.created` | `{workspace_uuid, project_uuid}` | S7, S8 | — (legacy reloaded) |
| `project.updated` | `{workspace_uuid, project_uuid, fields}` | S9, S10, S14, S21, S23, S24 | — |
| `project.trashed` / `project.restored` | `{workspace_uuid, project_uuid}` | S15, S26 (F3 name) | — |
| `project.purged` | `{workspace_uuid, project_uuid}` | S26, S27 | — |
| `project.folder.changed` | `{workspace_uuid, project_uuid, folder_uuid, kind}`, where kind is `created\|renamed\|moved\|deleted` | S17, S18 | — |
| `project.file.changed` | `{workspace_uuid, project_uuid, file_uuid, kind}`, where kind is `uploaded\|renamed\|moved\|deleted` | S7, S8, S17 | channel 13 is **not** this. `file-source` is F5 (a render finishing). |
| `workspace.statuses.changed` | `{workspace_uuid}` | S3, S4 (F3 name) | — |

All of them are workspace-scoped. A dashboard listens to its workspace, and a Project Home
filters by `project_uuid`.

---

## Subtasks

Every partial or missing line in §4, §5 and the four inherited §2 lines maps to exactly one
subtask. The [coverage table](#coverage) is the proof.

**What each acceptance criterion assumes:**
- The bench is up.
- You are signed in as the seeded owner, with a second browser signed in as an
  `estimator`, a `qa_pricing`, a `collaborator` and a `viewer` where a criterion names
  them.
- "Refused" means **both**: the control is absent or disabled with a reason, **and** a
  hand-written request from that role gets a 403 naming the capability.

---

# Block A — Foundations

_Nothing in a later block can be driven until these exist._

### F4-S1 — The project record, to parity

No PARITY line of its own. Every §4 and §5 line reads or writes these columns.

**Legacy.** The `projects` table has about 125 columns, most of them retired wizard and
estimate fields. The live surfaces read the following:

| Group | Columns |
|---|---|
| Identity | `name` (≤120 in the UI), `created_by` |
| Status | `status` + `custom_status_key`, `status_updated_at`, `submitted_at`, `awarded_at`, `lost_reason` |
| Follow-up | `follow_up_date`, `follow_up_days` (default 7) |
| Address | `address`, `address_line_2`, `city`, `state`, `zip`, `country`, `county` |
| Content | `plans_dated`, `scope_of_work`, `project_notes` |
| Attributes | `project_type`, `project_construction_type`, `wage_determination`, `labor_pricing_basis`, `trade_scope` |
| Bid | `client_name` and `bid_due_date` exist as columns, and no live legacy screen writes them |
| People | `assigned_to` (a primary mirror of `project_assignees`) |
| Lifecycle | `deleted_at`, `deleted_by` |

Trigger `tg_projects_status_stamp` stamps `status_updated_at` on every status change,
`submitted_at` on the first move to submitted, and `awarded_at` on the first move to won.

**Work.**
- `api`, migration:
  - Replace the 6-value `bid_status` with legacy's pair. `status` is one of the ten
    built-ins, and is what the project **reports as**. `custom_status_key` is set only
    when the project carries a workspace-defined status (S3). Reports, tab counts and
    the follow-up rule read `status` alone, so they stay correct whatever a workspace
    renames. Existing `bid_status` rows map as follows: draft becomes bidding, awarded
    becomes won, and the rest map one-to-one.
  - Add `status_updated_at`, `submitted_at`, `awarded_at`, `lost_reason`,
    `follow_up_date` and `follow_up_days`.
  - Add the five attributes as nullable enums, NULL meaning Unspecified:
    `project_type`, `construction_type`, `wage_determination`, `labor_pricing_basis`
    and `trade_scope`.
  - `client_name` and `bid_due_date` already exist, and become real fields (Q1).
  - New table `project_assignee` (`project_id`, `user_id`, `position`), unique
    `(project_id, user_id)`.
- `api`: the status stamps are set in the service, in the same transaction as the change.
  A trigger we do not own is a rule nobody can read in Python.
- `api`: `ProjectUpdate` covers every column the screens write. That fixes the four that
  cannot be patched today.
- `api`: routes re-gated per D-26. `WriteWorkspace` stays for takeoff writes only.
- `api`: new audit `Action`s, riding the act's transaction as F3-S12 established:
  `project.trashed`, `project.restored`, `project.purged`, and `status.*`, mirroring
  legacy's `status_created|updated|reordered|hidden|shown|deleted` and
  `status_tabs_updated`.
- `app`: `core/api/types.ts` `Project` is widened to match. The existing create control
  and the Sheets block's upload are gated with `can()`. The api calls for later subtasks
  are added by the subtask that first calls them, so no method ships without a caller.

**Acceptance criteria.**
1. After the migration, every existing bench project reads a valid status from the api,
   and none reads Draft.
2. Change a project to Submitted, then read it back from the api: `submitted_at` is set.
   Change it to Bidding and back to Submitted: `submitted_at` has **not** moved.
3. As `qa_pricing`, New project is disabled, with "Your role cannot create projects" beside
   it. A hand-written POST gets 403 with the same phrase.
4. As `collaborator`, a hand-written folder create succeeds (`canUploadDocuments`), and a
   hand-written folder rename is refused (`canCreateProjects`), per D-26.
5. As `estimator`, a hand-written trash gets 403. As `admin`, it succeeds. Only
   `canRestoreDeletedItems` can restore.
6. As `viewer`, the dashboard and Project Home render, and every write control is absent
   or disabled with its reason.
7. Trashing and restoring each write one audit row, visible in Settings → Activity.

### F4-S2 — UI primitives the port needs

No PARITY line. The app's `components/ui/` has no Dialog, Tabs, Select, menu, date input
or toast, and every §4 and §5 surface needs them.

**Work.**
- `app`: `dialog.tsx` (multi-step capable, focus trap, `Esc`, and it cannot close while
  `pending`), `tabs.tsx`, `select.tsx`, `menu.tsx` (dropdown, keyboard), `date-input.tsx`
  (native `<input type=date>` with legacy's `toIsoDate`/`fromIsoDate` local-parts rule),
  `progress.tsx`, and a toast outlet wired to `sonner`, which is already a dependency.
- Tokens only (hard rule 4). No hex in a component.
- **How they are driven before their screens exist.**
  - The dashboard's inline name form becomes a **New project** button that opens the
    dialog, and success toasts "Project created". S7 grows this dialog into the two-step
    one.
  - Every other primitive is driven on a **dev-only gallery at `/dev/ui`**. It is
    registered only when `import.meta.env.DEV`, so the production build does not contain
    it, and the bench pass checks the built bundle for that.

**Acceptance criteria.**
1. Every primitive works by keyboard alone: `Tab`, `Esc`, arrows in the menu and select.
2. Set a date to the 1st of a month in a browser whose clock is west of UTC: it reads back
   as the 1st, not the 31st. This is the off-by-one legacy guards against.
3. A dialog with work in flight ignores `Esc` and backdrop clicks. Otherwise it closes on
   `Esc`, on the backdrop and on Cancel, and reopens empty.
4. New project on the dashboard opens the dialog. Creating toasts "Project created" and
   lands on the new project's Home, as legacy does, and the project is in the list on the
   way back.
5. `/dev/ui` does not exist in the production build: its route and its strings are absent
   from `dist/`.

---

# Block B — Statuses (F3-S20)

_Before the dashboard, because every row, tab and count reads them._

### F4-S3 — Project statuses

> §2 Statuses: "Create, rename, reorder, hide and delete project statuses. Deleting one asks
> which status its projects move to." · **missing** ·
> `src/components/workspace-settings/StatusesTab.tsx`

**Legacy.** There are ten built-ins in two fixed buckets:

- **Active:** Bidding, Revision Required, Waiting on Quotes, Submitted, Change Order.
- **Closed:** Won, Lost, No bid, Cancelled, Archived.

Each has a colour preset: Neutral, Blue, Orange, Yellow, Purple, Amber, Green or Red.
Built-ins can be renamed, recoloured, reordered and hidden, but **never deleted**. A
custom status has a key `c_<slug>` and a **"Reports as"** built-in meaning, so Won and
Lost numbers stay honest.

Deleting a custom status counts the projects that carry it and makes you pick a target. It
defaults to the first other status in the same bucket. It moves those projects, then
deletes the status.

A hidden status leaves the picker and still renders on projects that already carry it.
Reorder is up and down within a bucket. Copy is verbatim from `StatusesTab.tsx:236-240`.

**Work.**
- `api`: table `workspace_project_status` (`key`, `label`, `color` as a token name rather
  than a Tailwind class string, `bucket`, `reports_as`, `is_builtin`, `is_hidden`,
  `sort_order`), unique `(workspace_id, key)`. No rows means the built-ins, as in legacy.
  A built-in's row is written the first time it is edited.
- `api`: routes under `/api/workspace/{ws}/project-status`: list (resolved, built-ins
  merged), upsert, reorder (a whole bucket in one call), and delete with
  `move_to_key`, where the move and the delete share one transaction.
- `app`: a Settings → Statuses page in the F3 settings layout.
- **One deliberate fix:** legacy's "Reports as" list omits Revision Required. Ours offers
  all ten.

**Also built (2026-09-25):**
- A project takes any status by key: `PATCH /project/{uuid}` with `status_key`. This is
  what the S9 picker sends. It sets `status` to what the key reports as, and
  `custom_status_key` for a workspace's own status.
- Assigning a hidden status is refused; a project already on it keeps it.
- Hiding the last visible status in a bucket is refused, because the picker would then
  have nothing to offer.
- Changing a custom status's meaning moves the projects on it with it.
- The routes are: list (with a project count per status), create, `PATCH /{key}`,
  `PUT /order`, and `DELETE /{key}?move_to=`.

**Acceptance criteria.** Criteria that read the dashboard's tabs, row badges and status
changer are **proved in S5 and S9**, where those controls are built; they are carried
there. Here they are proved through the api and the settings screen.
1. Settings → Statuses shows Active and Closed with the ten built-ins in shipped order and
   colours.
2. Rename Bidding to "Out to bid": the list shows it, and a second tab shows it after a
   focus refetch. (The dashboard tab, row badge and changer: S5, S9.)
3. Add a closed status "Lost, price" reporting as Lost, and put a project on it by
   `status_key`: the project reports as `lost` with the custom key, and the status's count
   reads 1. (Counting under the Lost tab: S5.)
4. Move a status up and down: the order holds across a reload, and it never crosses into
   the other bucket.
5. Hide Change Order: it is marked hidden, assigning it to another project is refused, and
   a project already on it keeps it. (Leaving the changer: S9.)
6. A built-in has no Delete control, and a hand-written DELETE on a built-in key is
   refused.
7. Delete a custom status that 2 projects carry. The dialog says "2 projects are currently
   on this status. Pick where they should move.", and defaults to a status in the same
   bucket. After confirming, both projects are on the target, and the status is gone.
8. Adding a status with an existing name is refused with "A status with that name already
   exists".
9. As `estimator`, the page is read-only, and a hand-written create gets 403.
10. Each edit writes one audit row, visible in Settings → Activity as a sentence.
11. Hiding the last visible status in a bucket is refused in words.
12. A custom status's meaning cannot cross its bucket: an Active status reporting as Won
    is refused.

**Realtime:** `workspace.statuses.changed`.

### F4-S4 — The dashboard tab strip

> §2 Statuses: "Configure the dashboard tab strip: add a tab, rename, move up or down,
> remove." · **missing** · `StatusesTab.tsx`, tables `workspace_status_tabs`,
> `user_status_tab_prefs`

**Legacy.** The default tabs are:

- Active = the five open statuses
- Submitted
- Won
- Lost = Lost + No bid
- Archived = Archived + Cancelled
- **All**, which is always shown and always last

A tab has a label, a visible checkbox, and one checkbox per status. Changes save with
"Save tabs" and the toast "Dashboard tabs saved".

`user_status_tab_prefs` is still **read** by legacy's dashboard, but since the Customize
tabs popover was removed (plan 2026-08-29) nothing writes it.

**Work.**
- `api`: table `workspace_status_tab` and routes under `/project-status/tab` (list, and
  replace-all on save).
- **Not ported:** `user_status_tab_prefs`. A table nothing writes is not parity. If
  per-user tabs return, that is a decision.
- `app`: the tab card on the Statuses page.

**Also built (2026-09-25):**
- The strip is saved whole, All included. A strip saved down to All alone stays that way,
  and does not fall back to the defaults.
- A tab with no statuses, or two tabs with one name, are refused in words.
- Deleting a custom status takes it out of every tab that held it.
- **Tab membership rule, for S5:** a project is in a tab when the tab lists its own status
  key or the built-in it reports as.

**Acceptance criteria.** As with S3, the dashboard half of each criterion is **proved in
S5**, where the strip is drawn.
1. Add a tab "Hot" holding Bidding and Revision Required, then Save: "Dashboard tabs saved",
   and it is there after a reload. (The dashboard showing "Hot" with its count: S5.)
2. Rename, move up and move down: the order and names hold after a reload. (The dashboard
   strip following: S5.)
3. Uncheck a tab's visibility: it is saved as hidden and stays in settings. (Leaving the
   dashboard strip: S5.)
4. Remove a tab: it is gone after the save.
5. **All** cannot be removed, hidden or moved off the end. It has no controls, and a
   hand-written save that sends All leaves it last and shown.
6. As `estimator`, the card is read-only, and a hand-written save gets 403.
7. Remove every tab but All and save: All alone survives a reload. The defaults do not
   come back.
8. A tab with no statuses, and two tabs with one name, are refused in words.
9. Deleting a custom status removes it from a tab that held it.

**Realtime:** `workspace.statuses.changed`.

---

# Block C — The dashboard

### F4-S5 — The project list, tabs and counts

> §4: "List the workspace's projects as cards." · **ported → partial** (see
> [Corrections](#corrections-to-parity-2-4-and-5-applied-as-part-of-f4)) ·
> `src/pages/Dashboard.tsx`

**Legacy** (`Dashboard.tsx:371-567`).
- The header reads "Projects", a count badge, "Needs follow-up (N)", Filters, New from
  folder and New project.
- Below it sits a centred tab strip with per-tab counts, and the active tab lives in
  `?tab=`.
- Each row shows the name, then `project type · Updated {date} · {assignee}+N`, then the
  follow-up badge, the status changer, the takeoff ruler, and Trash.
- The list is ordered by `updated_at` desc and excludes trashed projects.
- The empty workspace reads "No projects yet. Click **New project** to start your first
  estimate." A filtered-empty list reads "No projects match the current filters."
- Legacy's Draft rows and "Draft · step N" badge belong to the retired wizard and are
  **not ported**.

**Work.**
- `api`: the list returns what a row needs: status fields, attributes, **client**, **bid
  due**, assignee uuids, `updated_at`, and follow-up inputs. Paging stays. Tab counts come
  from one grouped count query rather than a page of rows, because counts over a page are
  wrong.
- The row subtitle is `Client · Project type · Bid due {date} · Updated {date} ·
  {assignee}+N`, with each empty part left out rather than printed as "—".
- **Sort (Q1).** A select offers Updated (newest first, the default), Bid due (soonest
  first, no date last), Name, and Created. It is kept in `?sort=`, and sorted server-side.
- `app`: rows, the tab strip bound to `?tab=`, and loading, empty, filtered-empty and
  error states.

**Acceptance criteria.**
1. With 3 projects across Bidding, Submitted and Won, the tabs read Active 2, Submitted 1,
   Won 1, All 3, and each tab lists its own. Active is 2 because legacy's Active tab holds
   every open status, Submitted included; the first draft of this criterion said 1.
2. Reload on `?tab=won`: the Won tab is selected.
3. A new workspace shows the "No projects yet…" sentence, and a filter that matches
   nothing shows "No projects match the current filters."
4. Stop the api: the list shows the error state with a retry, not a blank card.
5. Clicking a row opens its Project Home.
6. With 60 projects, the All count reads 60 while the page holds 50.
7. Sort by Bid due: the soonest due is first, and projects with no bid due come last. The
   choice survives a reload.
8. **Carried from S3 and S4 (Block B).**
   - Rename Bidding to "Out to bid" in Settings: the dashboard tab and the row badges say
     "Out to bid".
   - A project on a custom "Lost, price" status counts under the Lost tab.
   - A saved "Hot" tab shows on the strip with its count, in its saved order and name.
   - A tab saved as hidden is not on the strip.
   - A strip saved down to All shows All alone.

### F4-S6 — Dashboard panel order

> §4: "The dashboard panels are arranged in a fixed order, with the tab strip centred and no
> Customize tabs button." · **missing** · plans `reorganize-dashboard-panels-2026-08-29`,
> `remove-customize-tabs-button-…-2026-08-29`

> **Superseded by D-31 (2026-09-25), after Block C shipped it.** The dashboard shows
> projects only. The branding nudge and the three team panels are removed; members and
> invitations live in Settings > Members, branding in Settings > General. The subtitle
> reads "Your projects." The centred strip and no Customize tabs button stand.
> **Acceptance now:** (1) as owner with no logo, the page holds the workspace heading and
> the Projects card, and none of Team members, Pending invitations, Invite teammates or
> "Brand your bid proposals"; the strip is centred, with no Customize tabs. (2) Settings >
> Members lists members and invitations, Settings > General holds the logo. (3) An
> estimator sees the same projects-only page. `f4-s6` proves these. The text below is
> kept as the record of what Block C built.

**Legacy.** The panels, top to bottom:

1. The Projects card.
2. The branding nudge: owner only, no logo. "Brand your bid proposals", "Set up branding".
3. The full-width Reports card: "Time & Activities" and "AI Usage".
4. Three equal columns: Team members, Pending invitations (owner only), Invite teammates.

**Work.**
- `app`: the order above.
- The branding nudge is gated on `canManageWorkspace`, not the owner's id. It links to
  Settings → General.
- Team members, invitations and invite **reuse the F3 components** (`MembersTable`,
  `PendingInvitations`, `InviteForm`) under their existing capabilities.
- **The Reports card is not rendered until F15**, because it links to screens that do
  not exist. The line ticks on the order of the panels that exist.

**Acceptance criteria.**
1. As owner with no logo, the page reads top to bottom: Projects, the branding nudge, then
   the three team columns.
2. Upload a logo in Settings: the nudge is gone on return.
3. The tab strip is centred, and there is no Customize tabs button.
4. As `estimator`, there is no nudge, no invitations column, and the invite panel is
   refused per F3.

### F4-S7 — The New project dialog

> §4: "Create a blank project … and optionally uploading files in the same step." ·
> **partial** · `src/components/projects/BlankProjectDialog.tsx`, rpc `create_blank_project`
> §4: "Files drop onto a zone at the top of the browser, with a steady upload progress bar
> rather than one that jumps." · **missing** · plan
> `add-files-drop-zone-on-top-steadier-upload-bar-2026-09-23`

**Legacy, as it is today.** Two steps in one dialog. The dialog cannot close while
submitting.

**Step 1 — title "New project"**, description "Project info first — files next. You can
skip files and add them later."

| # | Field | Control | Rule | Origin |
|---|---|---|---|---|
| 1 | **Project name** | text, autofocus, placeholder "e.g. 215 Maple St. TI" | required, ≤120. `Enter` advances. Blank falls back to `Untitled Project YYYY-MM-DD` in the helper, which the Next button makes unreachable. | core |
| 2 | **Plans Dated** (optional) | native date | local-parts ISO date | core |
| 3 | **Assigned To** (optional) | multi-select popover, "Name · Role" | the first pick is primary. Only active members are listed. | core |
| 4 | **Project type** | select + Unspecified | Residential, Commercial, Public | initial schema. Fed the retired wizard, and still shown in every dashboard row. |
| 5 | **Wage Determination** | select + Unspecified | Prevailing Wage — Federal (Davis-Bacon), Prevailing Wage — State/Local, Union (CBA), Open Shop / Market Wage | **filter attribute, 2026-08-04** |
| 6 | **Labor Pricing Basis** | select + Unspecified | Burdened (fully loaded), Direct Labor (unburdened) | **filter attribute, 2026-08-04** |
| 7 | **Trade Scope** | select + Unspecified | General Trades, Specialty Trades | **filter attribute, 2026-08-04** |
| 8 | **Construction Type** | select + Unspecified | New Construction, Addition, Renovation, Tenant Improvement, Mixed | **filter attribute, 2026-08-04** |
| 9 | **Address** (optional) | line 1, line 2 (≤200 each), City (≤100), State (a US state select, otherwise free text ≤60), Postal Code (≤12), Country (displays United States) | **Untouched means all NULL**, so an address-less project is never stamped US | core |
| 10 | Show Map | link beside Address | enabled once there is a country, line 1, and a city or zip. Never shows a map. | core |

**What ships (Q1):**
- **Kept:** fields 1 to 9.
- **Added:** **Client** (text, ≤255) and **Bid due** (date, same local-parts rule).
- **Dropped:** Show Map (D-28, P-17).

The order is: Project name, Client, Bid due, Plans Dated, Assigned To, the five
attributes, then Address.

The buttons are Cancel, and **Next**, which stays disabled until a name exists.

**Step 2 — title "Add files"**, description "Drop everything at once at the top, or file
plans, specs, reports and site photos into their categories below."

- **Drop zone.** "Drag and drop files here", with "Everything at once — organize later."
  and a Choose button. Files dropped here go to the **project root**; this is legacy's
  "Unsorted".
- **Four category rows**, each with a Choose button:
  - Plans: "Drawing sets — the sheets you'll take off."
  - Specs: "Specification documents."
  - Reports: "Geotech, environmental, asbestos/ACM."
  - Site Photos: "Existing-conditions photos."
- **File list.** Each file shows a status icon, its name, its category and its size, and
  can be removed until it is done.
- **Progress bar.** Weighted by bytes. The file in flight counts as half its size, so a
  single upload moves. The bar **never goes backwards**, and keeps its last value when
  done.
- **Labels:** "N files ready to upload", "Uploading i of N", "Uploaded N files".
- **Buttons:** Back (disabled once the project exists), Cancel, and "Create & upload N
  files" or "Create project".
- **On failure after create:** "The project was created, but the upload stopped: {msg}.
  Retry uploads the remaining files into the same project." The button becomes **Retry**,
  which skips files already done and **never creates a second project**.
- **On success:** the toast "Project created", "N files uploaded.", then navigate to
  Project Home.

**Seeded folders (kept, founder decision).** Plans, Specs, Reports and Site Photos are
created under the root on every dialog create, whether or not files were picked. They are
ordinary folders: no kind column, and they can be renamed, moved and deleted. They are
special only in sort order. Everything else sorts alphabetically after them.

**Upload per D-20 and D-27 (multipart, every size).**
1. `POST …/file` checks `canUploadDocuments`. It then reserves the `ProjectFile` row, opens
   the S3 multipart upload, and returns the file uuid and the part size.
2. The browser calls `POST …/file/{uuid}/part` for presigned part URLs in batches, and PUTs
   the parts. Progress is counted in bytes acknowledged per part.
3. `POST …/file/{uuid}/complete` completes the upload from S3's own `ListParts`, sets
   `uploaded_at`, and registers `project.file.changed` with `outbox.after_commit`.
4. **No render is dispatched.**

**Resume.**
- A failed part retries with backoff.
- The queue pauses while `navigator.onLine` is false, and continues on `online`.
- After a reload, the dialog and the browser list "Unfinished uploads". Re-picking the
  file, matched by name and size, uploads only the missing parts.
- Neither size nor type is limited. Tier storage totals are F16's.

**Where the PDF hands off to takeoff: F5.** A PDF in Plans is a file, not a drawing. It
becomes sheets when takeoff registers it, per D-14: split-source on a Celery task,
thumbnails server-side, and pdf.js in the browser reading ranged, presigned S3 URLs. F4's
only part in that is the "Perform Takeoff" entry decision (S13) and D-27's
`ProjectFile` that F5 points at.

**Work.**
- `api`: `POST /project` gains `seed_folders: bool` (default true) and `assignee_uuids`.
  The root folder, the four seeds and the assignees are created in the same transaction as
  the project, so there is no polling (legacy polls 20 × 150 ms for a trigger's root
  folder).
- `app`: the dialog, built on S2.

**Acceptance criteria.**
1. Open New project: step 1 shows the fields in the order above, Client and Bid due
   included and Show Map absent. Next stays disabled until the name has a non-space
   character.
2. Create with a name only and no files: you land on Project Home with a root holding
   Plans, Specs, Reports, Site Photos, in that order.
3. Create without touching the address: the project's `country` reads NULL, not US.
4. Drop two PDFs on the zone and pick one into Specs: the list shows each file with its
   category. Create uploads them, the two dropped files land in the root and the third in
   Specs, and the bar climbs without ever stepping back.
5. Kill MinIO mid-upload: the error sentence appears and the button reads Retry. Bring
   MinIO back and click Retry: the remaining files upload into **the same** project. The
   dashboard shows one project, not two.
6. As `qa_pricing`, New project is disabled with the capability phrase. As `pricing`, it
   works (D-29).
7. There is no ceiling. The api plans a 6 GB file as 768 parts of 8 MiB and refuses
   nothing, where a single presigned PUT stops at 5 GB. A 20 MB file goes up through the
   dialog in three parts. (A 6 GB file through a browser fixture is 6 GB of memory; the
   plan is the proof, and the multipart path is the same for every size.)
8. Drop the network mid-upload (DevTools → Offline): the upload pauses and says so. Back
   online, it continues from the parts already sent, and does not restart at 0%.
9. **Moved to S17 (Block D):** reload mid-upload, then find the file under "Unfinished
   uploads" and re-pick it to finish. That list is part of the file browser. The api half,
   which parts S3 already holds, ships here and is what Retry uses.

**Realtime:** `project.created`, and `project.file.changed` per file.

### F4-S8 — New project from a folder

> §4: "Create a project from a folder on the computer, preserving the folder tree on
> upload." · **missing** · `NewProjectFromFolderDialog.tsx`
> §4: "A failed upload inside project creation offers Retry without losing the project." ·
> **missing**

> **Superseded by D-31 (2026-09-25), after Block C shipped it.** "New from folder" and
> its dialog are removed: New project is the one way to start a project, and a folder
> goes into a project through the file browser's Upload folder (S17). The folder
> find-or-create by path stays, because Upload folder uses it. The create's
> `seed_folders` switch existed only for this dialog and is removed, so every project
> gets its four seed folders. Retry on a failed create upload is New project's (S7 AC5).
> **Acceptance now:** (1) the dashboard has New project and no New from folder, and no
> folder picker. (2) A create sent with `seed_folders: false` still gets Plans, Specs,
> Reports and Site Photos. (3) `Maple/` through Upload folder into a project's root lands
> as `Maple/A/a.pdf` and `Maple/b.pdf` beside the seeds. `f4-s8` proves these. The text
> below is kept as the record of what Block C built.

**Legacy.**
- The dashboard's "New from folder" opens a `webkitdirectory` picker. It suggests the
  folder's own name, suffixed " (2)" on a collision, and says so: "A project with that name
  already exists — this one will be created as **X (2)**."
- It has the same step 1 fields.
- The tree is recreated under the root, minus the folder's own name, with
  `seedCategories: false`.
- On failure it offers Retry, which resumes into the same project.
- "Cancel uploads nothing."

**Work.**
- `app`: the dialog, reusing S7's field block and upload queue with folder paths.
- `api`: folder chains are created by path in one call (`POST …/folder/ensure` with
  `path: [..]`, find-or-create, case-insensitive), not one round trip per level.

**Acceptance criteria.**
1. Pick a folder `Maple/` holding `A/a.pdf` and `b.pdf`. The dialog suggests "Maple". The
   project root then holds `A/a.pdf` and `b.pdf`, and **no** seeded folders.
2. Pick it again: the name preview reads "Maple (2)".
3. Fail mid-tree, then Retry: the tree completes with no duplicate folders and no second
   project.
4. Cancel before Create: nothing exists, neither a project nor an object.

**Realtime:** `project.created`, `project.folder.changed`, `project.file.changed`.

### F4-S9 — Change status inline

> §4: "Change a project's status inline from its card, with a link to manage the status
> list." · **missing** · `ProjectStatusChanger.tsx`, `ProjectStatusBadge.tsx`

**Legacy.**
- A button reading the current status with ▾ opens a menu grouped **Active** and
  **Closed**. Hidden statuses are excluded.
- Picking a status toasts "Marked {label}".
- Picking any status that reports as Lost first opens "Mark as {label}", "Capture why so
  future bids learn from it.", with:
  - a Reason: Too high, Too low, Scope gap, Relationship, Incomplete bid, Schedule, GC
    self-performed, Awarded to existing vendor, Unknown
  - optional Notes
- Admins see "Manage statuses" at the foot of the menu, which opens Settings → Statuses.

**Acceptance criteria.**
1. Change a row from Bidding to Submitted: the badge changes, "Marked Submitted" toasts,
   and the tab counts move.
2. Choose Lost: the reason dialog appears. Cancel leaves the status unchanged. Save with
   "Too high" stores the reason.
3. A hidden status is not offered. **(Carried from S3.)** Hide Change Order in Settings:
   it leaves the changer, and a project already on Change Order still shows its badge. A
   renamed Bidding shows as "Out to bid" in the changer.
4. As owner, "Manage statuses" opens Settings → Statuses. As `estimator` it is absent.
5. As `viewer`, the badge is read-only.

**Realtime:** `project.updated` `{fields:["status"]}`.

### F4-S10 — Assignees, with roles

> §4: "Assign a project to a member, seeing each candidate's role beside their name, and
> remove an assignee." · **missing** · `AssignedToPicker.tsx`, table `project_assignees`
> §4: "The assignee dropdown shows each candidate's role next to their name." ·
> **missing** · plan `show-role-next-to-assignee-name-…-2026-08-29`
> §5: "Assign the project to a member from the header." · **missing**

**Legacy.**
- A multi-select popover listing active members sorted by name, each "Name · Role", where
  a custom role shows its own label.
- Chips below the picker, each with a remove ×.
- The first assignee is primary. A dashboard row shows the primary's name plus "+N".
- A removed member reads "Unassigned" rather than a uuid.

**Work.**
- `api`: `PUT /project/{uuid}/assignee` takes an ordered uuid list and replaces it.
  Non-members are refused.
- `app`: the picker, used by S7, S8 and Project Home.

**Acceptance criteria.**
1. On Project Home, assign Alice (Estimator) and Bob (a custom "Senior QA" role): the list
   shows "Alice · Estimator" and "Bob · Senior QA". The dashboard row reads "Alice +1".
2. Remove Alice with ×: the row reads "Bob".
3. Remove Bob from the workspace in Settings: the project reads "Unassigned", with no error
   and no uuid.
4. As `admin`, assigning works. Legacy's RLS refused admins, and that is the bug not
   ported.
5. As `viewer`, the chips show with no ×, and the picker is disabled.

**Realtime:** `project.updated` `{fields:["assignees"]}`.

### F4-S11 — Filters

> §4: "Filter projects by status tab, construction type, project type, estimator, labor
> pricing basis, wage determination and trade scope." · **missing** ·
> `ProjectFiltersBar.tsx`

**Legacy.**
- A Filters toggle opens a grid of selects, each with "All …" and "Unspecified", where
  Unspecified matches NULL:
  - Project type, Wage Determination, Labor Pricing Basis, Trade Scope, Construction Type
  - Estimator: multi-select, "All estimators", **matching `created_by`**
  - GC: sub workspaces only
  - Created from/to
  - Bid due from/to
- "Clear filters" appears once any filter is set.
- Filters combine with the active tab.

**The set (Q1, Q4):**
- Project type, Construction Type, Wage Determination, Labor Pricing Basis and Trade Scope,
  each with "All …" and "Unspecified".
- **Client:** a select of the workspace's distinct client names. This replaces GC and shows
  in every workspace.
- **Assigned to:** multi-select, matching any assignee. This replaces Estimator.
- Created from/to.
- Bid due from/to.
- Clear filters.

**Work.** Filtering is server-side query parameters, because client-side filtering over a
50-row page is wrong past 50 projects. The filters live in the URL, so a filtered view can
be linked.

**Acceptance criteria.**
1. Set Construction Type = Renovation: only those rows remain, and the tab counts reflect
   the filter.
2. Choose "Unspecified": only rows with no value remain.
3. Assigned to = Alice: only projects where Alice is **any** assignee, not only the
   primary, and not the creator.
4. Client = "Harbor Partners": only that client's projects remain.
5. Bid due from/to, and Created from/to, are inclusive of the end day. A project with no
   bid due is excluded once a Bid due bound is set.
6. Clear filters restores the full list, and the button disappears.

### F4-S12 — The follow-up badge

> §4: "A follow-up badge marks projects needing attention." · **missing** ·
> `FollowUpBadge.tsx`, `status.ts:123-136`

**Legacy.** A project needs follow-up when all three hold:
- it reports as Submitted
- `follow_up_date` is null
- at least `follow_up_days` (7) have passed since `submitted_at`, or since
  `status_updated_at` if that is unset

The row shows a yellow "Follow-up" badge with a bell. The header shows "Needs follow-up
(N)", which toggles a filter. Nothing live clears it except a status change (Q4).

**Work.** Computed by the api, not the browser clock, so every client agrees.

**Acceptance criteria.**
1. Mark a project Submitted, then age `submitted_at` by 8 days in psql: the badge and "Needs
   follow-up (1)" appear.
2. The chip filters to that project, and clicking it again clears the filter.
3. At 6 days there is no badge.
4. Move the project to Won: the badge is gone.
5. A custom status reporting as Submitted behaves the same.

### F4-S13 — Perform Takeoff from the row

> §4: "Open a project's takeoff directly from its card ('Perform takeoff'), beside the
> project name." · **partial**
> §4: "The workspace ruler button behaves like Perform Takeoff." · **missing** · plan
> `make-the-workspace-ruler-button-behave-like-perform-takeoff-2026-08-29`,
> `src/lib/takeoff/startTakeoff.ts`

**Legacy.** One shared decision, used by both the row's ruler and Project Home's Perform
Takeoff:

- The project has drawings: open takeoff.
- Otherwise, it has a takeoff-capable file (PDF, PNG, JPG or TIFF): open takeoff in
  first-run mode, where a picker offers them.
- Otherwise: open empty takeoff.

A spinner shows while the decision resolves.

**F5 boundary.** The first-run picker and "Add Sheets" are F5. F4 ships the decision
function and both buttons. Until F5, the second branch lands on the first sheet if one
exists, and otherwise on Project Home's Sheets block with a sentence saying takeoff opens
from files in F5.

**Acceptance criteria.**
1. A project with a ready sheet: the row's ruler opens takeoff on it.
2. A project with neither: the ruler lands on Project Home with the sentence, not on a
   route that 404s. Today `routes.takeoff(p)` with no sheet builds a URL with no route.
3. The ruler and Project Home's button reach the same place for the same project.
4. The spinner shows while the decision resolves, and the button cannot be double-fired.

### F4-S14 — Edit details

> §4: "Edit project details (name, client, address, attributes, plans-dated) without
> leaving the dashboard." · **missing** · `EditProjectDetailsDialog.tsx`
> §5: "Set project attributes: construction type, project type, labor pricing basis, wage
> determination." · **missing** · `ProjectAttributeFields.tsx`

**Legacy.**
- The dialog opens from Project Home's pencil ("Edit details"). Its title is "Edit project
  details".
- It shows name, Plans Dated, the address block and the attribute selects. Ours adds
  **Client** and **Bid due** (Q1), and has no Show Map (D-28).
- Unlike create, **what is shown is what is saved**, so clearing a field clears it.
- An empty name toasts "Project name is required". Saving toasts "Project details
  updated", and a failure toasts "Couldn't save changes".

**Acceptance criteria.**
1. Open Edit details on Project Home: every field carries the current value.
2. Clear City and Save: the city is NULL, and the location card no longer shows it.
3. Blank the name: Save is disabled.
4. Change Construction Type: the dashboard filter finds it under the new value.
5. As `qa_pricing`, the pencil is disabled with the capability phrase.

**Realtime:** `project.updated`.

### F4-S15 — Move to Trash from the dashboard

> §4: "Move a project to Trash from the dashboard, with 'Project moved to Trash'." ·
> **partial** · `Dashboard.tsx:139-150, 736-755`, rpc `soft_delete_project`

**Legacy.**
- A trash icon on the row opens "Move project to Trash?" with: Moves "{name}" to Trash —
  all folders, files, sheets, and takeoff data go with it. Recoverable for 30 days from
  Workspace Settings → Trash, then permanently deleted.
- Confirming toasts "Project moved to Trash", `"{name}" — recoverable for 30 days from
  Workspace Settings → Trash.`
- Legacy's folder browser also requires **typing the name**. The dashboard does not, and
  ours follows the dashboard.

**Work.**
- `api`: soft delete stamps `deleted_at` and `deleted_by`, and audits `project.trashed`.
- `api`: restore refuses a project that is not trashed, which fixes today's "succeeds" on
  a live project.

**Acceptance criteria.**
1. As owner, trash a project: the row leaves the list, the toast shows, and the counts
   drop.
2. Its Project Home URL now shows "Project not found" (S20).
3. As `estimator`, there is no trash icon, and a hand-written DELETE gets 403 naming
   `canManageWorkspace`'s phrase.
4. **(Block A check 5, deferred here.)** As owner, trash a project from its row, then open
   Settings → Activity: the top line reads "moved the project {name} to Trash". The api
   half, which has no control until now, was driven in `f4-s1` AC7.

**Realtime:** `project.trashed`.

### F4-S16 — Old bookmarks

> §4: "`/files` and `/takeoff` redirect to `/app`, so old bookmarks land somewhere useful."
> · **missing** · `src/App.tsx`

The app's dashboard is `/`, per F2's host split. **Work:** `/app`, `/files`, `/takeoff` and
`/projects/:id` redirect to `/`, `/` and `/project/:id` respectively, with `replace`.

**Acceptance criteria.**
1. Each of the four URLs lands on its target.
2. Back does not bounce you to the old URL.

---

# Block D — Files and folders

### F4-S17 — The project file model, upload, download, and the folder browser

> §4: "Browse, create, rename, move and delete project folders and files, upload a whole
> folder, and download a file." · **partial** · `UnifiedFolderBrowser.tsx` (1,396 lines),
> buckets `project-files`, `project-takeoff`

**Legacy.** Mounted only on Project Home.

**The tree.**
- The tree root is the project, labelled with its name. It cannot be renamed, moved or
  deleted here: "Delete the project from the Dashboard".
- The contents pane lists folders, then files, each folder with its count (S19).

**Folders.**
- **New folder** / **New subfolder**, placeholder "Folder name".
- Refusals: "Name is required", "Folder names cannot contain '/'". A duplicate sibling
  name, case-insensitive, is refused by a unique index.

**Rename** (either kind): "Rename folder" / "Rename file". The S3 object is untouched.

**Upload.**
- **Upload files** accepts any type.
- **Upload folder** uses `webkitdirectory`, and recreates the tree with case-insensitive
  find-or-create.
- A destination picker always opens, "Where should these files go?", "Uploading to
  **X**…". Legacy's "New top-level folder (creates a new project)" option is a Files-page
  artifact, and is **not ported**, because the dashboard's two create paths cover it.
- Toasts: "Uploaded N file(s)", "Connection to server lost" / "Upload not completed,
  please retry.", "Upload failed".

**Download.** A presigned GET opened in a new tab. Legacy's lasts 300 s. Ours uses
`presigned_get`, 3600 s.

**Delete a folder.** "Delete folder?", "**{name}** and everything inside it will be
permanently removed. This cannot be undone." Legacy adds a takeoff-in-use sentence and
refusal (`FOLDER_IN_USE_BY_TAKEOFF`). That guard needs D-27's file-to-drawing link, so it
is **F5's**. It is listed here so it is not lost.

**Delete a file.** "**{file_name}** will be permanently removed. This cannot be undone."

**Legacy bug not ported:** deleting a folder leaves its S3 objects orphaned.

**Work.**
- `api`, model `ProjectFile` (D-27): `project_id`, `folder_id` (NOT NULL, CASCADE),
  `file_name`, `storage_key`, `content_type`, `byte_size`, `uploaded_by_id`,
  `uploaded_at`. The key is `build_key("project-file", ws, project, file_uuid,
  safe_name)`.
- `api`, routes under `/project/{p}/file`: initiate (S7's), complete, list by folder, GET
  `…/download` (presigned), PATCH (rename, move), DELETE.
- `api`, folder service fixes:
  - look a folder up by **project and** workspace
  - a parent must be in the same project
  - the root cannot be renamed, moved or deleted
  - sibling-name uniqueness is a case-insensitive index
- `api`: **deleting a file or folder deletes its S3 objects after commit** (D-20). It
  queues a Celery task, and a failure is written to the same retry log as the purge (S27),
  so nothing is orphaned silently.
- `app`: the browser on Project Home, with a tree and a contents pane, using
  `context-menu.tsx` (already built) for right-click.
- **Empty and loading states, verbatim from legacy:** "This folder is empty. Upload files
  or create a subfolder.", "Loading…".

**Acceptance criteria.**
1. On a new project, the tree shows the project, with Plans, Specs, Reports and Site
   Photos under it.
2. Create "Addenda" under Plans. Create it again: refused as a duplicate. Try `a/b`:
   refused with the '/' sentence.
3. Rename Specs to "Specifications", reload: it holds, and its files are intact.
4. Upload a `.docx` and a `.jpg` into Reports: both list with their sizes.
5. Upload a folder with two levels: the tree matches, and uploading it again adds no
   duplicate folders.
6. Download a file: it opens with the original name and correct bytes.
7. Delete a folder holding 3 files: it is gone, and within a minute its 3 objects are gone
   from MinIO (check in the console at `:9001`).
8. The root's menu has no rename, move or delete, and a hand-written PATCH on the root is
   refused.
9. As `collaborator`, upload works, and rename and delete are refused per D-26.
10. As `viewer`, the browser is read-only, and download works.

**Realtime:** `project.folder.changed`, `project.file.changed`.

### F4-S18 — Move rules

> §4: "A folder cannot move into its own descendant, and a file cannot move between
> projects." · **missing** · `UnifiedFolderBrowser.tsx:569-601`

**Legacy.**
- The "Move folder" / "Move file" dialog says "Pick a destination folder in the same
  project." The folder being moved and its descendants are shown disabled.
- If refused, it reads "Cannot move a folder into its own descendant". A cross-project
  target reads "Can't move across projects" / "Files can only move within their own
  project."

**Work.** Enforced in the service by walking the target's ancestors. The dialog is a
convenience; the service is the gate.

**Acceptance criteria.**
1. Move Plans/Addenda into Specs: it moves.
2. In the dialog, Plans and Plans/Addenda are disabled as targets for Plans.
3. A hand-written PATCH setting Plans' parent to Plans/Addenda is refused with the
   descendant sentence.
4. A hand-written PATCH moving a file into another project's folder is refused with the
   cross-project sentence.

### F4-S19 — Folder counts

> §4: "Each folder shows a count of what it holds." · **missing** · `FolderCountBadge.tsx`

**Legacy.** The count is **files only**, including every descendant folder, and a zero is
shown faded. The tooltip reads "N file(s)".

**Work.** The folder list returns `file_count_deep`, computed in one recursive query.

**Acceptance criteria.**
1. Plans with 2 files and Plans/Addenda with 1: Plans reads 3, and Addenda reads 1.
2. An empty folder shows a faded 0.
3. Upload a file into Addenda: both counts move.

---

# Block E — Project Home

### F4-S20 — Header, entry points, not-found

> §5: "Show the project header with name and status, and the Perform Takeoff and Estimating
> entry points beside the name." · **partial** · `src/pages/ProjectHome.tsx`
> §5: "A project id that does not resolve shows 'Project not found' rather than an empty
> shell." · **ported** (not driven)

**Legacy.**
- The header row has "← Back to Projects" and a Dashboard button.
- Below it: the name, the status badge, the "Edit details" pencil, then Estimating and
  **Perform Takeoff** on the right.
- The page title is `{name} — Intelcost`.
- An unknown or trashed project toasts "Project not found" and returns to the dashboard.

**F9 boundary.** Estimating is F9. The button renders **disabled with "Estimating arrives
with the estimating tab"** rather than routing to a screen that does not exist.

**Acceptance criteria.**
1. Project Home shows the name, the badge, Edit details, Estimating (disabled, with its
   reason) and Perform Takeoff (S13).
2. The tab title is the project's name.
3. `/project/<random uuid>` and a trashed project's URL both show "Project not found" with
   a way back, never a spinner that never ends.
4. Loading shows the skeleton, not an empty shell.

### F4-S21 — Location, inline (the map deferred)

> §5: "Edit the project location inline, with address fields and a map popover." ·
> **missing** · `ProjectAddressFields.tsx`, `ShowMapPopover.tsx`

**Legacy.**
- The Location card reads `line1 · line2 · City, ST · zip · country`, or "No address on
  file".
- Clicking it opens an inline popover with Address, Line 2, City, State, Zip, Country, and
  Cancel / Save.
- Show Map (in the dialogs only) never shows a map (D-28).

**Work.**
- One address block, used by the inline editor, the create dialog and Edit details, so the
  three cannot drift.
- **No map (D-28).** At close-out the §5 line is split in two: the inline address fields
  (ticked here), and the map popover (→ P-17).

**Acceptance criteria.**
1. Click "No address on file", enter an address, Save: the card shows it, and a reload
   keeps it.
2. Cancel discards the draft.
3. Clear every field and Save: the card reads "No address on file".
4. Choose United States: State becomes a select of US states. Choose another country:
   State becomes free text.
5. As `qa_pricing`, the card is read-only.

**Realtime:** `project.updated`.

### F4-S22 — The geocoder → **P-17** (D-28)

> §5: "Resolve a US street address to city, state, zip and county through the geocoder." ·
> **missing** · `supabase/functions/geocode-address/`

**Not built in F4.** Legacy's geocoder is a Firecrawl search with an LLM fallback. It never
returns coordinates, and its only caller is Show Map. D-28 defers both to P-17, where the
provider is chosen. This subtask exists so the line keeps an owner. It ticks nothing in F4.

### F4-S23 — Plans Dated

> §5: "Set 'Plans Dated' from the same date picker the dashboard filters use." ·
> **missing** · `PlansDatedField.tsx`

**Acceptance criteria.**
1. On Project Home, set Plans Dated to a date: it saves on change, and a reload keeps it.
2. The same S2 date input is used by the dashboard's Created filter.
3. Clear it: NULL is saved.
4. As `qa_pricing`, it is read-only.

**Realtime:** `project.updated`.

### F4-S24 — Scope of Work and Project Notes

> §5: "Write project notes and a scope of work in a rich-text panel (bold, italic, lists,
> quote, link), saved inline." · **missing** · `ProjectTextPanel.tsx`, `src/lib/richtext/`

**Legacy.**
- Two panels, "Scope of Work" and "Project Notes", both click-to-edit.
- The editor is TipTap StarterKit, limited to: text size (H1, H2, normal), bold, italic,
  quote, link, bullet list and numbered list.
- **It saves on Save only**, never on a keystroke or on blur.
- Read mode renders DOMPurify-sanitised HTML. Pasted HTML is sanitised. Content is capped
  at 50,000 characters.
- Placeholders: "Add scope of work…", "Add project notes…".

**Work.**
- `app`: add `@tiptap/react`, `starter-kit`, `extension-link`, `extension-placeholder` and
  `dompurify`. These are new dependencies, and they are recorded in the app's STATUS.
- `api`: sanitise again on write with `nh3`, using the same allow-list, and enforce the
  cap. A browser-only sanitiser is a decoration.

**Acceptance criteria.**
1. Write a bulleted, bold scope with a link, Save, reload: it renders the same, and the
   link opens in a new tab.
2. Cancel discards the edit.
3. Paste `<img src=x onerror=alert(1)>`: nothing executes, now or after reload.
4. A hand-written PATCH with a `<script>` stores it stripped.
5. Over 50,000 characters is refused with a sentence.
6. As `qa_pricing`, the panels are read-only.

**Realtime:** `project.updated`.

### F4-S25 — Drawings and sheets on Project Home (the F5 hand-off)

> §5: "Upload drawings and watch them become sheets." · **ported** → see
> [Corrections](#corrections-to-parity-2-4-and-5-applied-as-part-of-f4)

**The line describes the new app, not legacy.** Per Q3, answered "keep it":

- The existing Upload drawings, the render, the sheet list and its polling are kept,
  **unchanged**, in a "Sheets" block beneath the folder browser. This keeps every takeoff
  bench path working.
- The line is re-worded to what legacy does: "Files uploaded to the project become
  takeoff sheets from takeoff." It is **reassigned to F5**, which replaces this block
  with Add Sheets over `ProjectFile`s (D-14, D-27).
- F4 ticks nothing here. It only proves the block still works beside the browser.
- **The founder, 2026-09-25:** the block, Upload drawings included, stays only as the
  bench's temporary path into takeoff until F5. F5 replaces it with legacy's flow:
  Perform Takeoff opens "Load project files into takeoff" (From Project Files, Upload
  drawing), the user ticks folders and files, "Choose pages" shows every page as a
  thumbnail, all ticked, and "Load N pages" opens takeoff. Asked once per project; later
  additions go through Add Sheets. F5 also brings route-level code splitting (P-18). The
  F5 row in MANAGER.md and PARITY §7 carry it.

**Acceptance criteria.**
1. Upload a PDF via the Sheets block: it renders to Ready sheets exactly as before F4.
2. Uploading the same PDF into Plans via the browser creates a file and **no** sheet.

---

# Block F — Trash (F3-S19)

### F4-S26 — The Trash tab

> §2 Trash: "List soft-deleted projects, restore one, permanently delete one, and show
> 'Permanently deleted at the next daily purge'." · **partial** · `TrashTab.tsx`, rpcs
> `restore_project`, `purge_project_now`

**Legacy.**
- Lists up to 100 trashed projects, newest first. Each row shows "Deleted {date time}" and
  then either "Permanently deleted in N day(s)" or, past 30 days, "Permanently deleted at
  the next daily purge".
- Empty state: "Trash is empty. Deleted projects appear here for recovery."
- **Restore** toasts "Project restored" or "Restore failed". A project already purged
  says "This project was permanently deleted" and drops from the list.
- **Delete permanently** opens `Permanently delete "{name}"?` with "This erases the project
  and everything in it — sheets, takeoff items, estimate lines, notes and uploaded files.
  It cannot be restored, by you or by support." Confirming toasts "Project permanently
  deleted".
- Legacy deletes the rows immediately and leaves storage to the next nightly run.

**Work.**
- `api`: `GET /project/trash`, `POST /project/{uuid}/restore` (refuses one that is not
  trashed), and `DELETE /project/{uuid}/purge` (refuses one that is not trashed, "Move the
  project to Trash before deleting it permanently").
- Purge deletes the rows, writes a `trash_purge_log` row, and **dispatches the storage
  delete after commit** rather than waiting for the night. A failure stays in the log for
  S27 to retry.
- The purge date is computed by the api from `deleted_at` and the same
  `TRASH_RETENTION_DAYS` the job reads. It is never typed, and never a browser countdown.
- `app`: Settings → Trash, visible only with `canRestoreDeletedItems`.

**Acceptance criteria.**
1. Trash a project: Settings → Trash lists it, "Permanently deleted in 30 days".
2. Age its `deleted_at` 31 days in psql: it reads "Permanently deleted at the next daily
   purge".
3. Restore: it returns to the dashboard with its folders, files, statuses and assignees
   intact.
4. Delete permanently: the dialog names what goes. After confirming, it leaves the list,
   its Project Home is not found, and its MinIO prefix empties within a minute.
5. A hand-written purge of a live project is refused with the "Move the project to Trash…"
   sentence.
6. As `estimator`, there is no Trash tab, and a hand-written list gets 403.
7. The empty state shows on an empty trash.
8. **(Block A check 5, deferred here.)** Restore a project from Settings → Trash, then
   open Settings → Activity: the top line reads "restored the project {name} from Trash".
   A permanent delete adds its own line naming the project.

**Realtime:** `project.restored`, `project.purged`.

### F4-S27 — The nightly purge

> §2 Trash: "A nightly job hard-deletes projects soft-deleted 30+ days ago, retrying storage
> deletions that failed on an earlier run." · **missing** ·
> `supabase/functions/purge-trashed-projects/`, table `trash_purge_log`

**Legacy.**
- **Pass 1** retries up to 200 log rows with `storage_paths_failed > 0`.
- **Pass 2** purges rows past 30 days, then wipes `{ws}/{project}` in each bucket.
- Failures are counted, not thrown. Each run writes a log row with counts. `?dry_run=1` is
  supported.
- Legacy misses the derived `pages/{file_id}/` objects. Ours keeps every project object
  under `…/<ws>/<project>/`, so one prefix per area is complete.

**Work.**
- `api`: table `trash_purge_log` (`project_uuid`, `workspace_id`, `project_name`,
  `soft_deleted_at`, `purged_at`, `file_count`, `prefixes_attempted`, `prefixes_failed`,
  `error`, `dry_run`).
- `api`: rewrite `purge_trashed_projects`. Pass 1 retries failed rows. Pass 2 does the
  following:
  1. Snapshot each expired project into the log.
  2. Delete its rows.
  3. **Commit.**
  4. Delete the prefixes for `project-file`, `takeoff` and `intake`, recording per-prefix
     failure.
- A dry-run flag.
- `infra`: a `beat` service in `intelcost-infra/docker-compose.yml`, running
  `celery … beat`, closing the README's Known gap. Production scheduling is Abdullah's
  (D-11), flagged to him.

**Acceptance criteria.**
1. With one project trashed 31 days ago (aged in psql), one trashed 5 days ago, and one
   live: run the job by hand (`docker compose exec worker celery … call`). Only the first
   is gone, from both Postgres and MinIO, with a log row.
2. Make its storage delete fail (a bucket policy denying delete on that prefix): the rows
   are gone, the log shows the failure, and the objects remain. Lift the policy and run
   again: pass 1 deletes them, and the log row reads 0 failed.
3. A dry run deletes nothing and logs `dry_run = true`.
4. The `beat` service is up, and its log shows the schedule loaded.

---

## Sequencing

| Block | Subtasks | What it is |
|---|---|---|
| **A — Foundations** | S1, S2 | The record, D-26's gates, the UI primitives |
| **B — Statuses** | S3, S4 | Before the dashboard, because every row reads them |
| **C — Dashboard** | S5–S16 | The list, create, rows and their controls |
| **D — Files and folders** | S17–S19 | The file model (D-27), browser, rules, counts |
| **E — Project Home** | S20–S25 | Header, inline location, Plans Dated, text, the Sheets hand-off (S22 is P-17's) |
| **F — Trash** | S26, S27 | The tab and the job |

**Block A is a reporting boundary**, as it was in F3. D-26 re-gates every project route,
and a fault there is cheapest to find before twenty screens sit on it.

S7's upload needs S17's `ProjectFile`. **S17's api half is built before S7**, and its
browser half follows in Block D.

---

## Bench

Per the archived specs:
- `docker compose up -d` in `intelcost-infra`.
- The app is on `localhost:5173`.
- Browser fixtures `browser/f4-s{1..27}.mjs` run with
  `docker compose --profile browser run --rm browser node scripts/f4-sN.mjs`.
- Non-browser drives go in `drives/`: the S12 ageing and the S27 job.
- Gates run in the app dev container: `docker compose exec app npm run lint`,
  `npm run typecheck`, and `npm run build`. In the api:
  `poetry run ruff check . && poetry run mypy app`.

F4 adds one service to the bench, `beat` (S27). Every
screenshot and scratch artifact is deleted after the drive.

---

## Definition of done

- Q1–Q5 were answered and **D-26, D-27 and D-28 logged** before any code (done
  2026-09-25).
- S1–S21, S23, S24, S26 and S27 are driven on the bench against their criteria, in a real browser,
  including loading, empty, error and unauthorised states. S25 is driven to prove nothing
  regressed.
- Every §4, §5 and inherited §2 line F4 ships is ticked. §5 "Upload drawings…" is
  re-worded and moved to F5. The corrections table is applied to `PARITY.md`.
- Every inherited promise has closed:
  - F3-S19: only `canRestoreDeletedItems` sees Trash, the purge date is computed, and the
    job retries.
  - F3-S20: deleting a status asks where its projects move.
- Carried to F5, on F5's `MANAGER.md` row:
  - the folder-in-use-by-takeoff delete guard
  - the first-run file picker behind Perform Takeoff
  - the Sheets block's replacement
- Carried to P-17: the map popover and the geocoder (D-28).
- `ruff`, `mypy`, `lint`, `typecheck` and `build` pass.
- The spec moves to `docs/archive/`, the F4 row leaves `MANAGER.md`, and F4 enters
  `FEATURES.md` ✅ Live with its flow, files and spec link.
- `intelcost-infra/workspace/` is refreshed and committed in the same session.

---

## Coverage

Every §4 and §5 line, and the four inherited §2 lines, with the subtask that owns each.

| § | Line | Status at spec time | Subtask |
|---|---|---|---|
| 4 | List projects (as cards) | ported → partial | S5 |
| 4 | Create blank project, seed folders, upload | partial | S7 |
| 4 | Create from a folder, tree preserved | missing → **retired by D-31** | S8 (now Upload folder, S17) |
| 4 | Failed upload offers Retry | missing | S7 (after D-31) |
| 4 | Filters | missing | S11 |
| 4 | Change status inline, manage link | missing | S9 |
| 4 | Assign, with role, remove | missing | S10 |
| 4 | Perform takeoff from the card | partial | S13 |
| 4 | Move to Trash from the dashboard | partial | S15 |
| 4 | Edit project details | missing | S14 |
| 4 | Follow-up badge | missing | S12 |
| 4 | `/files`, `/takeoff` redirect | missing | S16 |
| 4 | Browse, create, rename, move, delete, upload folder, download | partial | S17 |
| 4 | No move into a descendant, no cross-project move | missing | S18 |
| 4 | Folder counts | missing | S19 |
| 4 | Drop zone on top, steady progress bar | missing | S7 |
| 4 | Panel order, centred strip, no Customize | missing; panel order **retired by D-31** | S6 |
| 4 | Ruler button behaves like Perform Takeoff | missing | S13 |
| 4 | Assignee dropdown shows role | missing | S10 |
| 5 | Header, status, Perform Takeoff, Estimating | partial | S20 |
| 5 | Location inline with map popover | missing | S21 (the map half → **P-17**, D-28; the line is split at close-out) |
| 5 | Geocoder | missing | S22 → **P-17**, D-28. Not built in F4 |
| 5 | Plans Dated | missing | S23 |
| 5 | Notes and scope, rich text | missing | S24 |
| 5 | Project attributes | missing | S14 |
| 5 | Assign from the header | missing | S10 |
| 5 | Upload drawings, become sheets | ported → re-worded, **→ F5** | S25 |
| 5 | Project not found | ported (not driven) | S20 |
| 2 | Statuses: create, rename, reorder, hide, delete | missing | S3 |
| 2 | Statuses: dashboard tab strip | missing | S4 |
| 2 | Trash: the screen | partial | S26 |
| 2 | Trash: the nightly purge | missing | S27 |

19 §4 lines, 9 §5 lines and 4 §2 lines: 32 in total, each owned by exactly one subtask.
