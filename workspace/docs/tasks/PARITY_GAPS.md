# Parity gaps: what legacy does that the new app does not (yet)

**Written:** 2026-10-07, overnight Part 9. Documents only.

_Method: every live legacy route (`intelcost/src/App.tsx` minus
`hiddenSurfaces.tsx`) and every component, hook and edge function under `src/components`,
`src/hooks`, `src/lib/takeoff` and `supabase/functions` was listed, then looked for in
`intelcost-app-react` (routes, component names, labels) and `intelcost-app-fastapi`
(`app/features/*`, published events). The open lines in `docs/PARITY.md`, the Working and
Planned rows in `FEATURES.md`/`MANAGER.md`, and the "not built" and "left for later" notes in
`DECISIONS.md` were used as leads and checked against code. Legacy was read at `e99cddcb`
(2026-09-27, the local `UmeralamDEV`; not re-fetched for this draft). Anything not confirmed
in code is marked (unverified)._

**Read this first: the tracking docs are behind the code.** PARITY.md's counts table still
says sections 12 to 22 have almost nothing ported, and many of its open lines are built:
markups, Snapshot and snippets, Dock, Print, Find Text and Ctrl+F, item history, assemblies,
share links and the guest view, the sheet stepper, Duplicate page, the preview window, Auto
Count's page scope and Image mode, the takeoff Settings dialog (General, Hover, Mouse,
Cursor, Snapping, Takeoffs, Trace, Toolbar, Panels, Rendering), light and dark mode, the
stale-chunk guard, Stripe Checkout and the webhook, trial tiers and caps, the locked dialog
(D-107 to D-115, D-131, D-193, D-194, D-277 to D-284). `FEATURES.md` still lists P-09, P-10
and P-14 as Planned and `MANAGER.md` lists F10 and F11 as "not yet specced", although most
of both are built. A re-tick pass on PARITY.md would shrink its 240 open lines to roughly the
rows below. The tables below list only what is still missing or different.

---

## Projects & files

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Project map and address lookup | "Show Map" beside the address fields, and a lookup that fills city, state, zip and county from a street address. Legacy's lookup always returns `lat: null`, so the map has only ever said "Could not locate address." | `src/components/projects/{ShowMapPopover,ProjectAddressFields}.tsx`, `supabase/functions/geocode-address/` | §5 | low | medium | P-17: a geocoding and map-tile provider decision, plus a bench fake (D-28) |
| Old links do not resolve | Legacy URLs that will be in emails, bookmarks and migrated data: `/invite/:token`, `/settings/workspace?ws=`, `/projects/:id/takeoff`, `/projects/:id/sheets/:sheetId/viewer`, `/library?workspace=`. The new app redirects only `/projects/:id`, `/app`, `/files` and `/takeoff`. The rest end on NotFound | `src/App.tsx` | — | medium (at cutover) | small | F17: whether legacy ids map to new uuids |

## Takeoff: sheets panel

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Drawing folder management | Folder rows have New subfolder, Rename folder, and Delete folder. Delete is refused with "Move or remove its contents first" while the folder holds anything, and folders can be moved. The new panel only has "New Folder" from the + menu, at the root. Folder rows only expand and collapse (`SheetsPanel.tsx` `renderFolder`) | `src/components/takeoff/SheetTree.tsx` (around lines 2013 to 2056) | §7 | high | small to medium | — (the `drawing/folder` POST exists; it needs PATCH and DELETE) |
| Thumbnails show the markups | Thumbnails view draws each sheet with its takeoff and markups on top. The new thumbnails are the worker's bare page images | `src/components/takeoff/SheetThumbImage.tsx`, `src/lib/takeoff/thumbnails/thumbMarkup.ts` | §7 | medium | medium | — |
| Read-only sheet viewer | "Open in new tab" opens `/projects/:id/sheets/:sheetId/viewer`, a read-only viewer (641 lines) with fit, zoom, markups on or off, refetch, and a two-pane split. The new "Open in new tab" opens the full, editable takeoff on that sheet | `src/pages/SheetViewer.tsx`, `SheetTree.tsx:2333` | §7 | medium | medium | could reuse Split view's `ReferencePane` (D-107) |
| Tree layout remembered per person and project | Which folders, sheets, items and sub-item blocks are open in the Sheets, Takeoff and Assemblies trees is saved to the account (`user_panel_layouts`), debounced, and follows the person to any machine. The new panel keeps view mode and prefs per browser, but the open and closed state of the tree is lost on reload | `src/hooks/usePanelLayout.ts` | §24 ("Panel layout persists per user") | medium | medium | api table and route |
| Show or hide one sheet's takeoffs from its row (unverified) | A sheet row's menu shows or hides the takeoff marks on that sheet. The new app has the panel-wide "Hide Takeoffs" option. A per-row toggle was not found | `SheetTree.tsx` | §7 | low | small | — |
| Sheet label and row presentation lines | About 15 §7 lines about how rows look (row lines reaching the edge, 6 px trims, aligned unit columns, the count pill, the scrollbar under the search). Many are probably closed by D-163, D-200, D-212 and D-213 (unverified) | `.lovable/plan/*` named on each line | §7 | low | small | the re-tick pass |

## Takeoff: canvas, tools and markups

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Markup Properties panel | A docked Properties panel per markup kind (highlight, note, cloud, callout, arrow) edits the selected markup, or the tool defaults when nothing is selected. Fields: colour, fill, opacity, border, line width, line end, head size, font, size, bold, italic, underline, text colour, text scale, label position, bubble size, auto-fit or fixed size, Scale with zoom, and Reset to defaults. The new app has the carets (next colour) and the chip's colour and delete. Dimension has its own panel, but markups do not (D-109 "left for later") | `src/components/takeoff/props/PropertiesPanel.tsx`, mounted at `src/pages/ProjectTakeoff.tsx:12222` and following | §14 | high (this is most of what an Essentials workspace gets) | medium | — |
| Box-select several markups | Drag a box over markups, then act on all of them from one selection action bar and a right-click menu. The new markup layer holds only one `selectedMarkup` | `.lovable/plan/box-select-markups-selection-action-bar-and-a-selection-righ-2026-09-01.md`, `src/components/takeoff/{DrawActionStrip,SelectionContextMenu}.tsx` | §14 | medium | medium | the Properties panel above (they share the action bar) |
| Markup action bar placement | The action bar for a selected markup sits next to the tools and turns light yellow while a markup is being drawn | `src/components/takeoff/DrawActionStrip.tsx` | §14 | low | small | — |
| Double-click finishes a point-to-point run (unverified) | Enter or a double-click finishes a Linear run or closes an Area, and the mode hint says so. The new hint says the same (`lib/takeoff/engine/draw.ts`), but `SheetCanvas.handleDoubleClick` only finishes freehand runs. Point-to-point may be finished somewhere else: drive it to confirm | `src/components/takeoff/drawModes.tsx` | §23 | medium to high if missing | small | — |
| Save status for shape edits (unverified) | Vertex and shape edits autosave on a debounce, and the toolbar shows idle, saving, saved or failed. A failed save stays retryable. No equivalent indicator was found in the new takeoff | `src/hooks/useAutosave.ts`, `Toolbar.tsx` (`AutosaveStatus`), `ProjectTakeoff.tsx:6037` | §24 | low to medium | small | — |
| Last workspace tab restored | Reopening a project returns to the last tab (Takeoff, Earthwork, Collaborator, Estimating, Community), kept in `localStorage` (`takeoff.toolbar.tab.v1`). The new app reads `?tab=` only, so it always reopens on Takeoff | `src/components/takeoff/Toolbar.tsx:257` | §24 | medium | small | — |
| Circles and ellipses after a deduct; four handles on an ellipse | A circle or ellipse still looks curved after a deduct, and a selected ellipse shows four handles rather than its whole bead chain (unverified in the new app after D-254 and D-275) | `.lovable/plan/keep-circles-and-ellipses-looking-like-curves-after-a-deduct-2026-08-23.md`, `ellipse-circle-show-4-handles-…-2026-08-22.md` | §10 | low | small | — |
| Toast titles by failure reason | Each failed write's toast has its own title for the reason it failed. The new app has a toast system with generic titles | `src/hooks/use-toast.ts` | §24 | low | small | — |

## Assemblies & Library

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Library page | A **Library** button in the dashboard header opens `/library`. It is a paged cost library: description, unit, material price, unit labour hours, make/model/MFR, subcontractor, CSI division, notes, two reference links. Users filter by CSI division, subcontractor and assembly type, search, and select rows (the selection bar only offers Clear). Each item's price can be overridden for this workspace only ("Override for this workspace"), and the list can be exported. Nothing else in legacy reads `library_items`: the library does not feed Estimating or assemblies. The new app has no route, no screen and no api for it | `src/pages/Library.tsx` (797 lines), `src/pages/Dashboard.tsx:334`, tables `library_items`, `workspace_library_overrides` | §13 | high (a header button on the dashboard) | medium | **parked for later by the founder (D-287 6)**; the seed data source (unverified: how many rows legacy holds) |
| Library admin | Platform admins upload a file that replaces or appends to the whole library, with per-row errors and "No rows found in file". They can also export everything ("Fetching all items, this may take a moment.") and tag library items by assembly type | `Library.tsx`, `src/components/library/{AssemblyTagPicker,AssembliesFilterDropdown}.tsx` | §13, §22 | low (staff only) | medium | the Library page |
| Assembly Properties: WBS, height and pitch | The template's Properties dialog has the item dialog's WBS, height and pitch fields. D-112 lists these as not built | `src/components/takeoff/AssembliesPanel.tsx` (around line 1062) | §12 | low | small | — |
| Takeoff layers seeded from the Starter Pack (unverified) | A plan file seeds takeoff layers from the Starter Pack | `.lovable/plan/takeoff-layers-assemblies-starter-pack-2026-08-13.md` | §12 | low | small | check whether it is live in legacy at all |
| Shared equipment on assemblies (unverified) | Assemblies carry shared equipment as well as cost components (UmeralamDEV diff item 22). D-243 brought the cost components; shared equipment was not confirmed | `src/components/takeoff/assemblies/TemplateComponentsSection.tsx` | §12 | low | small | — |

## Estimating

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Text-size nudges | Buttons on the Estimating grid that step its text size up and down. FEATURES F9 lists them as not built | `src/components/estimate/ProjectEstimatingView.tsx` | §11 | low | small | — |
| Sub-scope and Custom folder colours | Separate top and nested group colours for Sub-scope and Custom folder groupings. The new groupings have one colour each. Sub-scope grouping itself was dropped by D-125 | `src/components/estimate/FormatPanel.tsx` | §11 | low | small | — |

## Earthwork

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Volume panel jumps to the Quantity Table row | Clicking Fill, Soil Export or Remaining Site in the volume panel jumps to that line in the Quantity Table. FEATURES F12 lists it as not built | `src/components/takeoff/EarthworkVolumePanel.tsx` | §16 | medium | small | — |
| Auto Trace style filter | "Match lines like…" limits Trace to lines that look like the one picked, or offers everything when none is picked (`TraceStyleFilter`). FEATURES F12 lists it as not built | `src/lib/takeoff/settings/index.ts`, `src/lib/takeoff/earthwork/trace/` | §16 | low to medium | medium | — |
| Default earthwork folder (unverified) | The first earthwork input on a blank project files itself under DIV 31 Earthwork, Earthwork & Grading, mirrored per classification system, and never overwrites a folder the user chose. No "DIV 31" or "Earthwork & Grading" string was found in the new app or api. D-142 files the computed lines on CSI nodes, which may cover it | `src/lib/takeoff/earthwork/defaultFolder.ts` | §16 | low | small | — |
| Choosing earthwork markups when creating or copying an item (unverified) | Create or Duplicate asks which earthwork markups the item gets, with a classification choice on a duplicate | `.lovable/plan/choose-earthwork-markups-when-creating-or-copying-an-item-2026-08-17.md` | §16 | low | small | — |

## Sharing

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Guests see where the team is working | With "allow presence" on, each member's takeoff publishes a beacon (current sheet and cursor) every 3 s. Guests on `/s/:token` see them. The new app stores `allow_presence` but `/presence` returns an empty list (D-108, pending) | `src/hooks/useShareBeacon.ts`, `supabase/functions/guest-project/` | §6 (the line reads "the owner is told when a link is opened", which describes it wrongly) | low to medium | medium | a beacon design on the realtime hub (F8) |

## Reports, time tracking

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Daily rollup and retention compaction | Sessions roll up daily, and the retention setting compacts old ones. The new app stores the setting and reads raw sessions (D-146) | `src/lib/reports/` (unverified exact file) | §19 | low (invisible until volume) | small | a beat task |

## Billing / plans

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| End-to-end check against real Stripe | Legacy took money through live Stripe. The new F16 has Blocks A to G built on the bench's Stripe fake. The F16 end-to-end check and the full fixture run are still to come (MANAGER) | `supabase/functions/{create-checkout-session,create-topup-checkout,stripe-webhook}/` | §21 (stale: most lines are now built) | high at launch | small to medium | Stripe test keys, the deploy |

## Platform admin

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Library admin | See Assemblies & Library | `Library.tsx` | §22 | low | medium | the Library page |
| Granting platform admin | Done in legacy by SQL and a plan file (`platform_admins`, `is_platform_admin`), not from a screen. The new app resolves the flag the same way (D-23). Not a screen gap. A grant screen is listed as an idea in D-233 | `.lovable/plan/give-touseef-…-2026-08-05.md` | §22 | none | — | — |

## Marketing

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Demo requests are not kept | "Book a demo" writes to `demo_requests` through `submit_demo_request`. Marketing's `/api/demo-request` validates, logs and returns success, then forwards only if `LEADS_ENDPOINT` is set. The api has no endpoint for it, so leads are lost today | `src/components/landing2/RequestDemoDialog.tsx`, rpc `submit_demo_request` | §21 | low for testers, high for sales | small | an api route, or a leads destination |
| `/customers` page | The legacy marketing site has a Customers page. It was out of the agreed scope (market-next `STATUS.md` item 6) | `src/pages/Customers.tsx` | — (marketing is out of PARITY's scope) | low | small | content decision |
| Marketing dark mode | Legacy's `ThemeToggle` is on the takeoff page only. The marketing tokens are staged but nothing switches them on (STATUS item 5) | — | — | low | small | — |

## Integrations / AI

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| AI tools against a real model | Region naming, Scale, Auto-Name Sheets, Ask AI and Extract Schedule run on live providers. The new F14 is built and smoke-tested on the bench's fake. MANAGER still says the model test waits for a provider key, but `intelcost-infra/.env.ai` has existed since 2026-10-03 and D-252/D-253 applied model choices, so the test may already be possible (unverified) | `supabase/functions/{region-ask-ai,region-extract-schedule,ocr-sheet-titleblock}/` | §18 | high (a visible tool that fails, or answers from a fake) | small | the provider keys in the api's runtime, `python -m app.features.ai.trial` |

## App-wide

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Installable app (PWA) | Installs from the browser as a standalone app, with icons at 192, 512 and 512-maskable, an orange theme colour and a white background. The new `public/` has only `favicon.svg` and `icons.svg`, with no manifest | `public/manifest.webmanifest` | §24 | low | small | brand icons |
| Build stamp in the console | Prints a build stamp at boot so two browsers can be confirmed on one bundle | `src/main.tsx` (`BUILD_STAMP`) | §24 | low (testers and support) | small | — |

## Data and cutover

| Gap | What legacy does | Where in legacy | PARITY.md section | Visibility | Size | Depends on |
|---|---|---|---|---|---|---|
| Legacy data migration | A tester who used legacy finds none of their projects, sheets, items, estimates or members in the new app. F17 (P-16) is Abdullah's and not yet specced. MANAGER lists its known rules: bcrypt rehash, custom roles' full maps, 1 / shrink, snapshot types, no overlays, no AI credit data | the Supabase schema | — | high for legacy users | large | D-11 (Abdullah), the deploy |

## Mobile / responsive, Community, Notifications, Settings

No gaps found. The phone-width app (P-19) and takeoff layout (D-242) go beyond legacy.
Community (F15, D-234) and its notices are built, and legacy's old attachments are not
migrated by decision (C13). Every legacy Workspace Settings tab has a new page: General,
Members, Roles, Shifts, Time Tracking, Ownership, Classification, Subcontractors, Statuses,
AI Credits and Trash.

---

## Build next: top 15

1. **Sheet folder management** (rename, subfolder, delete with legacy's guard, move): every multi-discipline set uses folders, and today a mistyped folder cannot be fixed. Small, and nothing blocks it.
2. **Markup Properties panel**: an Essentials workspace gets only markups, so their styling is that plan's main surface. Medium, and nothing blocks it.
3. **Confirm or fix double-click to finish a run**: the on-screen hint promises it. If it is missing, every estimator hits it in their first minute. Small: drive it first.
4. **Run the AI tools against a real model**: the tools are on screen, so a tester will click them. Small if the keys are in place.
5. **The Library: parked for later (D-287 6).** A header button in legacy with nothing behind it in the new app; legacy's Library feeds nothing else (see below). The founder parked it: not built now, not dropped.
6. **Legacy URL redirects**: small, and needed before any legacy user, email or migrated link reaches the new app. This unblocks the cutover.
7. **F17 migration spec**: large and owned by Abdullah. It has to start now so that testers who used legacy see their own work. It also settles whether old ids map to new uuids (item 6).
8. **Box-select markups and the selection action bar**: builds on item 2. A reviewer marking up a sheet notices it at once.
9. **Restore the last workspace tab**: small. Testers who work in Estimating or Earthwork will notice it on every reopen.
10. **Volume panel jumps to its Quantity Table row**: small, finishes F12's visible gaps, and the panel is the first thing an earthwork estimator reads.
11. **Thumbnails with markups**: medium. Thumbnails view is how estimators scan a set for what is already measured.
12. **Tree layout remembered per person and project**: medium (api table). Large sets re-expand on every reload today.
13. **Read-only sheet viewer for "Open in new tab"**: medium, and it reuses Split's pane. Today a second tab is a second editing session, which can surprise in One at a time mode.
14. **Keep demo requests**: a small api route (or leads destination) before marketing goes live, so no sales lead is lost.
15. **Auto Trace style filter**: medium. It is the last missing Trace control from legacy, and on busy grading sheets it is the difference between usable and noisy.

After these: guest presence on share links, the save-status indicator, the PWA manifest and
build stamp, Estimating's text-size nudges and group colours, per-reason toast titles, the
daily time rollup, and P-17 once a provider is chosen.

---

## Recommend NOT porting

- **OAuth consent screen** (`/.lovable/oauth/consent`, `OAuthConsent.tsx`): a Lovable platform artifact, not a product feature (D-15).
- **"Clear cached session" control**: dropped (D-17).
- **The hidden surfaces**: `/wages`, `/subcontractors`, `/gc-bids`, `/vendors`, `/projects/:id/{scope,scenarios,schedule}`, `/projects/new`, `/projects/:id/edit` (`src/config/hiddenSurfaces.tsx`), plus `src/retired/` (173 files) and `supabase/functions/_retired/` (29). Legacy itself redirects them to `/app`. The Wage Calculator (F20) is a new design, not a port of `/wages` (D-264).
- **The "Estimate" (Estimate AI) tab and every retired AI feature**: parse subquote, Project Intake, import takeoff, Estimate AI, bulk fix cautions, draft trade scope, subquote clarification. Legacy's Toolbar keeps only the enum value (D-235).
- **Legacy's geocoder** (Firecrawl search with an LLM fallback, `geocode-address`, `geocode_cache`): it never returned coordinates. P-17 should start fresh on a real provider (D-28).
- **The assembly component modes Measured / Fixed / Per item with Nearest / Round up / Round down** (`AssemblyManagerDialog.tsx`): dead code. Its only mount is `open={libOpen}`, and nothing in legacy ever calls `setLibOpen(true)`. PARITY §12's line should be retired.
- **`TakeoffDocViewerPanel`** (a read-only side viewer for project files on the takeoff page): dead code. It is mounted, but `setViewerDoc` is never called with a document.
- **`useProjectDraft`** (a project draft that survives a reload): its only caller is `lib/intake/buildingUseMap.ts`, part of the retired Project Intake. PARITY §24's line should be retired.
- **The Library's "add selected items into an estimate"**: the action does not exist. Legacy's selection bar offers only Clear, and nothing outside `Library.tsx` reads `library_items`. PARITY §13 and §22 should be corrected. More broadly, if the founder does not want a reference price list that feeds nothing, the whole Library page is a candidate to drop. In that case, drop the dashboard button with it, by decision.
- **`UpgradeModal` and `useUpgradeModal`**: they sell legacy's old plans by legacy's retired AI actions ("AI estimates", "AI wage determinations"). F16's Essentials and Professional, Settings › Billing, the trial cap dialog and the locked dialog replace them (D-277, D-280, D-282).
- **Trial button always visible during a trial**: the new app shows it from three days left. This is a deliberate difference (D-280 3) and should stay unless the founder reverses it.
- **The service-worker kill switch** (`public/sw.js`, the Workbox unregister in `main.tsx`): it cleans up a worker legacy once shipped on its own origin. `app.intelcost.io` never served one. Keep it only if the new app ends up on legacy's exact origin (unverified).
- **`window.icDebug`, `CanvasPerfHud` and `ZoomProfiler`**: developer diagnostics with no user value. If the team wants them, they are a dev-only build flag, not parity.
- **The "preview, not published" banner**: a Lovable artifact. It is already absent.
- **Sheet tiler edge functions** (`sheet-tiler`, `-b`, `-c`, `-d`), **the tiler poisoned-sheet report**, and **`load-csi-template`**: replaced by the worker's derivatives (D-14, D-41 to D-47) and by the classification seed (D-58).
- **Supabase mechanisms**: the 252 migrations and 576 RLS policies (D-03), the 13 Supabase realtime channels (replaced by the WebSocket hub, D-13), the `is_super_admin` and `is_platform_admin` RPCs (one platform-admin flag in the permission layer, D-23, D-233), and legacy's `platform_admins` table.
- **Auto Count's canvas governor, memory model and OpenCV coarse arm**: replaced by a fixed page budget measured on the bench (D-189 Q3, Q4; D-194).
- **Finish-to-Subgrade Depth** in Site Features (D-140), and **legacy's sheet-space volume panel**: the new panel floats on screen on purpose (D-178).
- **Backspace deleting a selected markup**: Backspace is undo and Delete is the only delete key (D-183).
- **New project from a folder**: the dashboard has one way in (D-31).
- **Legacy's skipped-pages-come-back bug** when loading pages (D-36, F5 Q9).
- **Data not migrated by decision**: Community attachments (D-234 C13), sheet overlays (D-188 Q13), AI credit balances and history, and the retired tools' AI usage (D-235, D-236).
