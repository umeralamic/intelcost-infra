# F32 — Reorder items, sub-items and cost components by drag

**Status:** 🔨 Working, built 2026-10-22 (D-716), awaiting the founder's click check.

## The need

An estimator lays out the takeoff in the order the bid reads: the wall before its finishes, the material before
the labour. Items, sub-items and cost components showed in the order they were made (and the Sheets panel by
name), with no way to move one.

## Choices (Umer, 2026-10-22)

- **Drag only** (no Move up / Move down): a line shows where the row lands, above or below the row under the
  pointer.
- **One shared order:** the Sheets panel and the Takeoff panel show items in the same order, and a move in either
  changes both.

## Rules

| Row | Where it can go | Stored as |
|---|---|---|
| Item | Before or after another item of its own group: its folder (Folders view), its code (Classification view); in the Sheets panel, its folder. Another group's: refused, with the reason. | `takeoff_item.position`, the group renumbered from 0; only changed rows are written (`PATCH /item/{uuid}`) |
| Sub-item | Before or after another of the same parent; it never leaves its parent | `takeoff_item.position` among the parent's sub-items |
| Cost component | Before or after another of the same host (an item without sub-items, or a sub-item) | `takeoff_cost_component.position`, every one of the host's in one call (`POST /estimate/components/order`, new); a list a colleague changed meanwhile is refused |

- A locked item, or one a colleague holds, that would be renumbered stops the move, said why.
- The Sheets panel lists a sheet's items in the project's order (position, then name), no longer by name.
- Moving cost components needs the pricing permission, as adding them does.
- Legacy reorders top-level items only (QuantityTable's before/after drag); sub-items and cost components are new.

## Checked

The gates, ruff and mypy, the quantity table; the browser on a BENCH DUP (D-716).
