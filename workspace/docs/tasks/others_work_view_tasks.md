# F42 — Others' work in the panels and on the plans

**Decision:** D-1233. **Repos:** api, app.

## Problem → solution

Several estimators on one project see everyone's folders, items, sub-items and cost rows in the Takeoff and Sheets
panels, and everyone's shapes on the plans, with no way to look at only their own. → A "Show all" box in the Takeoff
panel (ticked by default) hides colleagues' work in both panels; "Others' work: Only mine / Fade others" in Takeoff
Settings › Collaboration now also hides or fades colleagues' saved markings on the plans.

## Tasks

1. **api: authors.** `ItemRead.created_by_uuid` and `ItemRead.drawn_by_me` (any of the item's shapes made by the
   caller) on every item read (list, detail, the JSON fast path, sub-items); `FolderRead.created_by_uuid`; the cost
   component read's `created_by_uuid`; the markup read's `created_by_uuid`. Workspace filters unchanged.
2. **api: the preference.** `CollaborationPrefs.others_in_panels: bool = True` and the patch field.
3. **app: types and prefs.** The new fields; `DEFAULT_COLLABORATION_PREFS.others_in_panels = true`.
4. **app: the box.** The Takeoff panel's "Show all" in both views writes `others_in_panels` (saved on the account at
   once, the box follows the cached user). The empty-classification-codes option is removed.
5. **app: the filter.** One pure rule (`mineInPanels`) used by the Takeoff panel's tree (folders, classification,
   items, sub-items, cost rows) and the Sheets panel's per-sheet items:
   - item: made by me or `drawn_by_me`;
   - sub-item: made by me; a shown sub-item keeps its parent;
   - folder: made by me, or holding anything shown;
   - cost component: made by me, or by nobody (follows its item).
6. **app: Settings.** Takeoff Settings › Collaboration: "Others' work in the panels: Show / Hide" (your account), and
   Others' work's line says it reaches the plans' markings.
7. **app: the plans.** Only mine hides shapes and markups (annotations, saved dimensions) whose author is someone else;
   Fade others draws them at 40 %. Hidden ones are not picked or hovered. Unknown author: shown.

## Proof

Gates; quantity table; smoke with two throwaway accounts in one workspace: each draws an item, a folder, a sub-item,
a cost row and a markup; the other sees them, unticks Show all (panels empty of them, plans unchanged), sets Only mine
(plans empty of them), Fade others (faded), and both back to the defaults.
