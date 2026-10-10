# WBS split: custom folders and classification, one view at a time (D-336)

**Problem.** The New Measurement dialog offers "Preset Classification" or "Custom Folder", but
both file the item into one folder tree (D-59 makes real folders per code), so the Takeoff panel
mixes code folders and the person's own folders, and an item can be in only one of them.

**Solution.** Two structures per item, one shown at a time.

## Data (api)
- `takeoff_folder.tree`: `custom` | `classification` (default `custom`).
- `takeoff_item.class_folder_id` → `takeoff_folder` (SET NULL), indexed.
- `project.panel_view_default`: `folders` | `classification` | null.
- `user.takeoff_prefs.panel_view`: `{project uuid: "folders" | "classification"}`.
- Multiplier of an item = chain(folder) × chain(class folder) × chain(layer).

## Rules (api)
- Create: a code files `class_folder_id` (its node folder, or `class_folder_uuid` when given and
  inside that code); `folder_uuid` is the custom folder and must be a `custom` folder.
- Update: a new code moves `class_folder_id` to the code's folder; null clears both. A
  `class_folder_uuid` move must stay inside the item's code. `folder_uuid` must be `custom`.
- Bulk: `class_folder_uuid` beside `folder_uuid`.
- Folders: a `classification` folder is made only inside a code (`under_node`, or a parent in the
  classification tree); node folders are not renamed, moved or deleted by hand; deleting a folder
  inside a code puts its items back at the code.
- Sub-items, duplicates, snapshots and earthwork lines carry `class_folder_id` as they carried
  `folder_id`.
- Realtime: filing that makes code folders also announces `takeoff.folder.changed`.

## App
- Takeoff panel: "Folders | Classification" toggle; the two trees; "Show all" codes;
  Unclassified; drag inside a code only; right-click "Change classification…" (undo).
- Selected folder or code is where new items land (manual, assemblies, Auto Count).
- New Measurement / Properties: Folder and Classification fields, current view's first.
- Takeoff settings: the view (this project) and, for editors, the project default.
- Estimating `lib/estimate/lines.ts`: Classification from the classification chain, Custom
  Folder from the custom chain; the export follows.

## Migration check
On a throwaway copy of a real project: every item's calculated and effective quantity,
multiplier and code before and after the upgrade, and after downgrade, identical.
