# Overnight plan, 2026-10-06 (stop 11:30 UTC)

Rule for every part: finished, gated (app tsc/eslint/build; api ruff/format/mypy), quantity
table, throwaway smoke check, committed and pushed on `umer-dev` before the next starts.
Unfinished work at 11:30 goes to a named stash `overnight-<part>-unfinished`, never a commit.
The report (`docs/tasks/OVERNIGHT_REPORT.md`) is updated after each part.

## Part 1. Wage Calculator Step 5 (crews and classification)
Built, smoke 6/6, committed 02:15 UTC. See the report.

## Part 2. Wage Calculator Step 6, workspace crew settings
1. **Data.** One migration: `workspace_crew_map_override` (system, node_code, table_type,
   crew_code, is_default, sort_order, hidden; one default per node and table, partial
   unique index), `workspace_crew` (table_type, name unique per workspace and table,
   division, `code` "W-" + 10 hex of its uuid), `workspace_crew_member` (crew, craft_code,
   member_count > 0, position), `workspace_crew_hidden` (crew_code, table_type).
2. **Resolution.** Engine `resolve_node(ref, system, code, table, overrides)`: the Step 5
   chain (the node and its parents up to the crosswalk, then the CSI chain), walked twice:
   first for a workspace override anywhere on it, then for IntelCost rows. Result: default,
   suggested, source (workspace / IntelCost) and the node it came from. Feature layer: a
   workspace catalog (IntelCost + custom crews, hidden set, overrides) used by the Step 5
   suggestions, auto-fill and classification change, and by the settings tree.
3. **Hidden crews.** Dropped from Suggested, Other [trade] crews and the default (the
   first visible suggested crew becomes the default); still in Search all crews.
4. **Custom crews.** In every picker (Search all crews, Other [trade] crews by lead craft)
   and in the project's current rates (priced live from the saved set's crafts). Crafts
   must exist in the crew's table.
5. **API** (`/api/workspace/{ws}/wage-calculator/crew-settings/…`): tree children (or a
   search) for a system and table with the effective crews and their source; orphaned
   overrides; set / reset a node override; custom crews CRUD (delete removes it from
   overrides); hide / unhide; a crew catalog for the pickers. Reads any member, writes
   `MANAGE_WORKSPACE`.
6. **App.** Settings › Project Setup › Crews: system and table switch, orphans banner,
   tree with search, node editor (three-section picker plus custom crews, reorder), Custom
   crews tab with IntelCost crews to hide, Hidden crews list. Read-only for non-admins.
7. **Docs.** spec "Workspace crew settings", brief Step 6, one DECISIONS entry, SINCE_ARCHIVE.
8. **Smoke** E1 to E8, then commit both repos.

## Part 3. End-to-end Wage Calculator check (if time remains)
One Playwright pass over the listed flow; fix clear bugs only, one commit each.

## Part 4. F16 billing spec draft (if time remains)
`docs/tasks/F16_SPEC_DRAFT.md`, documents only, ending with "Questions for Umer".

## Part 5. P-02 recalculate on settings change (if time remains)

## Part 6. F19 site stitching (if time remains)
Parts 1 to 5 done by 03:10 UTC. Blocks, from the spec (`site_stitching_tasks.md`) and D-231,
smaller than the spec's A to F so each finishes, gates, smokes and commits on its own:

- **A1. Site engine (pure) and its Python twin.** `lib/takeoff/earthwork/site.ts`:
  `matchLinePairs`, `fitJoin`, `placeMember`, `visibleRegion`, `toSite` / `fromSite`,
  `splitAtJoins`, `clipAreaToMembers`, `rejoinRuns`, `slideOnMatchLine`. Python
  `earthwork/site.py`: `match_line_pairs`, `place_member` (the fit is F18's). The spec's
  quantity rows for these (square halves at two scales, a reversed line, a bent line, split,
  clip with a deduct, rejoin, slide), both engines where the twin covers them. Smoke: the
  quantity table runs them in the bench's Chromium.
- **A2. Data and routes.** Migration: `site`, `site_member` (one site per sheet),
  `sheet_registration.kind` (survey | join) with the two match lines,
  `earthwork_result.superseded_by_site_id`. Routes: sites list/create/rename/delete, join a
  member (the api fits the match lines again with the twin), remove a member (a one-member
  site dissolves), merge. Events `site.changed`. Smoke: the routes driven from a throwaway
  Playwright script (no screen yet).
- **B. Joining in the app** (only if A1 and A2 are done with time to spare): the Match line
  tool on the Earthwork row and "Join to another sheet at match line…" in the sheet's ⋮ menu,
  the join prompt with its checks, the merge offer, the Sheets panel's site row and "in site"
  chips.
- **C1. The stitched view, read-only** (A1, A2 and B done by 03:46): the site row opens a
  Site view over the canvas, each member's fit image placed by its placement, turned and
  clipped to its visible region (CSS transform and clip-path, so the clip turns with it), pan,
  zoom, Fit, Rotate (the anchor's up first). No pdf.js window renders, no snapping: those are
  C2.
- **A3** (done 04:05): the rest of Block A's engine (`siteRuns`, `stitchTrace`) and its rows.
- **E1** (done 04:15): Calculate in the site view as a preview (one cut, fill and balance), not
  saved. E2 (saving, Superseded, lines grouped under the site, Site Features and Strip Areas
  across members) is larger: it changes how earthwork lines are keyed and what Estimating
  shows, so it is not started.
- **E2** (started 04:20, done 04:35): the site result saved (`earthwork_site_result`), the site's lines as
  earthwork items keyed to the site (`takeoff_item.earthwork_site_id`, on the anchor sheet, named
  with the site), the members' own lines flagged `earthwork_superseded` and left out of Estimating
  while the site's lines exist (Q10), members' results marked "Superseded by Site X", Remove result;
  cleared on dissolve or a member leaving. Site Features and Strip Areas across members stay out.
- **E3** (done 04:45): the site result goes stale with a member's drawing.
- **C2** (done 04:58): live pdf.js renders per member in the site view.
- **D2b3** (07:20 to 07:30): Snap, Snap PDF, Ortho, Duplicate.
- **F1** (06:55 to 07:20): the C-200 acceptance row; the square site frame.
- **D2b2** (06:45 to 06:55): the join-point slide (Q9).
- **D2b1** (06:30 to 06:45): select, move, delete as one; undo.
- **E5** (06:20 to 06:30): Q14, the site's lines grouped under its name.
- **E4** (06:00 to 06:20): Site Features and Strip Areas in a site Calculate.
- **D2a** (05:15 to 06:00): contours and the boundary drawn across the join.
- **D1** (started 05:00, done 05:10): draw Linear, Area and Count across the join in the site view, straight
  segments, into a chosen item; each shape split per member (`splitAtJoins`, `clipAreaToMembers`,
  a count to the member it falls in) and saved on the members' own sheets with one `site_shape` id;
  the members' shapes shown in the view, clipped. D2 (select, move and delete as one, the join
  point slide, arcs, Ortho, Snap across members) and F's app side are not attempted.
