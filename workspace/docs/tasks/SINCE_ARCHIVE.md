# Changed since the fixture archive

The fixture suite was archived at tag `fixtures-archive-2026-09-28` (D-68). Everything below
changed after that tag, and was proved only by the gates, the shared quantity table and a
throwaway smoke check. **The full run restored from the tag, required before any deploy to
testers or promotion to `main`, must cover every row**, and the fixtures a row names may
need updating before they pass.

Restore steps: `intelcost-infra/README.md`, "The fixture suite, archived".

| Date | Feature | What changed | Smoke check | Archived fixtures likely affected |
|---|---|---|---|---|
| 2026-09-28 | F7-S20 Auto-merge (D-69) | New section of an item unions with the drawer's own overlapping sections; holes handed over and re-clipped; Auto Merge toggle in the canvas bar; `created_by_id` and `mine` on shapes; `owner_uuid` on a shapes update; vertex edits keep a closed run closed; Duplicate now copies deducts as deducts | 6/6: area, Linear, off, colleague, hole re-clipped | `f7-a` (shapes transaction), `f7-e` (vertex edits), `f7-f` (deducts), `f7-i` (copy), `f6-*` (Duplicate) |
