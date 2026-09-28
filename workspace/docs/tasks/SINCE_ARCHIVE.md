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
| 2026-09-28 | F7-S21 Resume, Start, Add more points (D-72) | "Add a shape" gone from the item menu; Resume (row, count, run), Start, New section, Add more points in its place, with glyphs; a seeded draft on the canvas; the menu component gained an icon slot; `--glyph-accent` token | 7/7: run, count, new section, extend a run, extend an area, One at a time | `f8-s11`, `f8-s12` (the claim, via "Add a shape"), `f7-*` steps that used "Add a shape" |
| 2026-09-28 | F7-S22 Undo and redo (D-71) | Session history (`history.ts`, `useSessionHistory.ts`); Undo and Redo in the toolbar; Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y; mid-run Ctrl+Z in the canvas; `drop_empty_item` on `…/shapes` (a delete-only change may now take the item); "Delete all points on this sheet" no longer confirms; Delete key and point deletes grouped per item | 7/7: undo/redo keys, mid-run and count session, delete undone, sheet scope, colleague's edit asked, text field, merge undone and redone | `f7-a` (shapes transaction), `f7-d` (Delete), `f7-b` (count marks, the old confirm), `f8-s11`/`f8-s12` (One at a time) |
| 2026-09-28 | F7 review follow-ups (D-73) | `GET …/item/{uuid}/snapshot` and `POST …/item/restore` (new); undo restores a deleted item whole under its own uuids; Delete taking an item with sub-items asks; box delete one undo step and one transaction per item; paste "New item" opens the New Measurement dialog prefilled; D-53 to D-72 accepted | MCP: delete asked and undone with the sub-item, box delete undone in one step, paste dialog "Wall copy" | `f7-d`, `f7-h` (box delete), `f7-i` (paste New item), `f6-*` (sub-items) |
| 2026-09-28 | F7-S23 Action group and canvas bar (D-74) | ActionGroup (five variants); Toolbar regrouped in legacy's order with icon-over-label buttons, "More" overflow, Count (N); canvas bar a fixed row at the top with the scale chip (moved from the header); Ortho on by default; status line; hint inside the canvas; Takeoff panel handle; the takeoff page fits the window (app shell dense layout); the box selection's Delete moved from the bar to the group | MCP: layout, bar, variants, lock, status, chip, overflow, box | `f7-c` (Ortho default and bar position), `f7-h` (the bar's Delete), every fixture that reads the toolbar or `[data-canvas-bar]` position |
