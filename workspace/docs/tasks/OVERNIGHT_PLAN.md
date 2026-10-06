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
Block list written here before starting, from the F19 spec and D-231.
