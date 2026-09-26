# F6: Item model: measurements, dimensions, sub-items, variables, folders, layers, classifications

_Spec for the `MANAGER.md` F6 row (backlog P-05). Ports what a takeoff item **is**
beyond its shapes: the New Measurement and Properties dialog, the height and pitch
modifiers, named dimensions, sub-items and their formulas, workspace variables, folders
with multipliers, layers, and the classification systems F3 handed on (F3-S14 to S18,
the Subcontractors tab among them). Carries F8's collaboration duties for every new item
and folder write (**D-32, D-33**)._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) (D-06, D-09, D-13, D-20, D-21, D-32) ·
**Parity:** [../PARITY.md](../PARITY.md) §8 (takeoff items), §2 (Classification,
Project Setup, Subcontractors) · **Inherited from:**
[workspace_roles_tasks.md](../archive/workspace_roles_tasks.md) (F3-S14 to S18),
[realtime_tasks.md](../archive/realtime_tasks.md) (channel 1, F8-S9, S18)

_Written 2026-09-26 (overnight) from legacy `intelcost/` at `12dd119b`. **Status: specced,
no code. Questions at the end wait for the founder.** F5 comes first: F6's dialogs sit on
F5's canvas and panel._

---

## The problem

Today's takeoff page can draw an item, rename it, recolour it, file it in a folder,
put it on a layer, lock it and override its quantity. It cannot say what the item
measures beyond its shapes:

- There is no height to turn a wall run into wall area.
- There is no pitch for a roof.
- There are no sub-items to turn one measured area into its slab, mesh and vapour
  barrier.
- There is no classification to file it under.

The api already carries most of the columns (`height_ft`, `pitch_*`, `parent_item_id`,
`formula_text`, `takeoff_item_dimension`, `classification_ref_id`, layer and folder
multipliers). Almost nothing reads or writes them. And F3 left the whole classification
block here on purpose: a tree that nothing files against can only be driven as "it saved".

### What legacy does

**The New Measurement dialog** (`src/components/takeoff/NewItemDialog.tsx`):
- **Title:** "Name this {TYPE} measurement", "Create takeoff item" when a type is
  picked (the Find Text path: "Measurement type", Point Count, Area, Linear), and
  "Properties" when editing.
- **Name:** defaults to "{TYPE} {n}"; an empty name falls back to the default; Enter
  submits.
- **Colour:** a picker with Custom and "Randomize color". Defaults by type: LF red, SF
  blue, count green (`useTakeoff.ts:542`).
- **Markup style:** Opacity (100). For counts: Symbol (circle), and "Symbol size"
  "Relative to zoom", "Fixed size" (2 to 50 px, default 10) or "True size from
  dimensions" (scaled 0.1 to 10).
- **This measurement** (LF and SF):
  - "Convert to area using a height" (LF only): "Multiplies length by a height (7'-6"
    or 25.5) to give SF."
  - "Apply a slope factor": "Multiplies the length/area by a slope factor; unit family
    stays linear/area."
  - Height and pitch exclude each other.
- **Pitch** (`PitchInput.tsx`):
  - "Rise / Run": factor √(rise² + run²) / run.
  - "Degrees": 1/cos, 0 to 90.
  - "Grade (%)": 0 to 10000.
  - The name gains a suffix: " (L LF, 7'-6"H)" or " (L LF @ 6/12)"
    (`descriptionSuffix.ts`), kept apart from the name in `name_base`.
- **Named dimensions:** "+ Width", "+ Depth", "+ Height", "+ Thickness" for LF and SF;
  for counts, by symbol: circle "Dia/Height/Depth", square "Length/Width/Height/Depth",
  marker none ("This symbol is a marker. Use a circle or square to carry dimensions.").
  - They **do not change the item's own quantity**: they exist for sub-item formulas.
  - Keys `d1`, `d2`… are immutable and never reused; a repeated name becomes "Depth (2)".
  - A badge reads "used by N" or "not used". "Duplicate name — formulas will use the key
    instead."
  - A dimension a sub-item reads refuses delete, clear or zero: "Can't delete "X"", "It's
    used by: …", "Remove those references first.", "Open {sub}".
- **Finish-to-Subgrade Depth** (area, earthwork only): in or cm. "Optional. Finish grade
  to top of subgrade — blank or 0 means this area has no section depth."
- **Two exclusive boxes:**
  - "Rough measurement": "A measurement used in formulas and sub-item calculations — not
    included in the estimate itself."
  - "Earthwork markup": "Files this measurement into the Earthwork Markups folder — a
    drawing input for earthwork calculations, never an estimating line."
- **WBS:** "Work Breakdown Structure (WBS)", "Preset Classification" or "Custom Folder",
  mode and open state remembered per person.
  - Custom shows a folder picker with create, rename and delete.
  - Editing shows "Current folder: {label|Unfiled}" with Change.
  - A bypass box shows "Rough Measurements · classification bypassed".
- **Sub-items bar:** edit only.
- **No layer field:** a new item takes the active layer.
- **Buttons:** "Cancel", "Create" or "Save". No error toasts: the button stays disabled
  until height and pitch are positive, the depth is valid, and a classification is picked
  (unless rough, earthwork, editing, or Custom Folder).

**Sub-items** (`src/lib/takeoff/subItems/`, `SubItemDialog.tsx`):
- **What they are:** a sub-item is a `takeoff_items` row with `parent_item_id`, one level
  only. It inherits type, colour, sheet, folder, classification and layer.
- **Its quantity** is `formula_qty`; an error leaves 0 and `formula_error`.
- **The dialog:**
  - Titles "Create sub-items", "Manage sub-items", "Edit sub-item".
  - Columns Description ("e.g. Waste 5%"), Formula ("PARENT * 1.05"), Qty, Unit,
    Classification / Scope.
  - "Will delete on save".
  - Blocks: "Name this sub-item to continue", "Fix the formula to continue", "Pick a
    classification to continue".
  - "Seed from…" Measurement or Assembly. "Changes were not saved".
- **Formulas** (`formula.ts`): a recursive-descent parser, no `eval`.
  - Operators `+ - * /` and parentheses; functions `min max round ceil floor abs sqrt`.
  - Identifiers `PARENT`, `PERIMETER` (areas), `SEGMENT_COUNT`, `POINT_COUNT`,
    `<PRIM>_<UNIT>` (`AREA_SY`, `LINEAR_FT`).
  - References `[Sibling name]`, `{var:<uuid>[@value]}`, `{dim:d1}`, `{ref:<item>}` (a
    rough measurement), and derived `{qty:LINEAR.d1.d2@CY}` forms (`derived.ts`).
  - An error is a value, never a throw: the row shows "—" and a chip.
- **Recompute:** when the parent's quantity, a variable or a dimension changes
  (`reconcileSubItemsForParent`, `recomputeSubItemsAfterDimensionChange`).
- **Deleting a sub-item** removes its estimate lines.

**Variables** (`subItems/variables.ts`, `VariableEditorForm.tsx`):
- `takeoff_variables` is **workspace-scoped**: single or list, default, list values,
  tags, archived. `takeoff_variable_values` holds a project's own single value.
- Written as `{Wall Height}` or `{OC Spacing: 16}`. "Add Variables", "Single quantity" or
  "List".
- Archiving: "Archive "X"? It disappears from the Insert menu. N existing formulas keep
  resolving…"

**Folders** (`takeoff_folders`):
- Nested, colour (#64748b), position, multiplier, classification, layer, and the reference
  and earthwork flags.
- **Delete** takes subfolders and moves items to Unfiled: "Delete folder?" "…Deleting it
  will remove all subfolders and move line items to Unfiled."; empty: "This folder is
  empty. Are you sure you want to delete it?"
- Renaming **Unfiled** creates a real folder and moves the unfiled items in.
- "Folder Properties": Name and Multiplier ("Enter a number greater than 0."), a "×N"
  badge when not 1.
- Earthwork Markups, then Rough Measurements, sort last.

**Layers** (`takeoff_layers`, `LayerSelect.tsx`):
- **Seeded:** "Base Bid" (default), "Alternate", "Deferred Submittals".
- **Sub-layers** with compounding multipliers. "Add layer", "Add sub-layer under "X""
  (with a keep or move choice when the parent holds items), "Edit layer".
- **Delete:** never the last ("A project must keep at least one layer"). Either "Move
  contents and delete layer", or "Delete layer and all its measurements" after typing
  DELETE.
- **Show and hide** is per browser (localStorage): "Hide/Show this layer (and its
  sub-layers) on the sheet", and "The active layer always shows".
- An item with no layer reads as Base Bid. "Move to layer" is on the item menu.

**Classifications:**
- **Systems** csi, uniformat, nrm1, nrm2, cesmm, shown as "CSI MasterFormat",
  "UniFormat", "NRM 1 (Elemental)", "NRM 2 (Work Sections)", "CESMM".
- **Enabled systems:** `workspaces.enabled_classifications`, "Save classification
  systems"; none ticked: "Pick at least one classification system".
- **One system per project:** `projects.classification_system` locks it.
- **The table:** `workspace_classifications` (system, code, name, parent, sort key,
  archived, seed flags).
- **Seeds:** server-installed templates, `supabase/seed/templates/csi-default-v1.txt`
  (1,833 nodes) and the others.
- **Settings row menu:** Add scope, Add sub-scope, Rename, Archive, Delete, Restore;
  "Show archived".
- **Refusals:**
  - A duplicate: "That code already exists in this system."
  - In use: "This one is in use", "N folder(s) or measurement(s) are filed under "X"… so
    it can't be permanently deleted…", "Archive instead".
- **Picking a scope** makes the matching division and trade folders in the project
  (`ensureFolderPath.ts`).
- **Subcontractors** (`SubcontractorsTab.tsx`): named subcontractors, each assigned
  classification scopes, with per-project overrides. Not live in legacy.

**The item tree** (`QuantityTable.tsx`, `ItemRowShared.tsx`):
- **Grouping:** by folder, sub-items nested, filtered to the active layer's subtree. Group
  headers carry a count, not a total.
- **Item menu:** Properties, Link Screenshot, Override quantity, Link assembly,
  Duplicate, Save as assembly…, Move to layer, Create sub-item, Costs…, History, Delete
  (on this sheet, everywhere).
- **Double-click** renames.
- **Duplicate:** "{name} (2)", always (2), or "(copy)" by setting. "Keep current
  classification" or "Assign new…", and "Include sub-items (N)".
- **Multi-select** with shift and ctrl, and a bulk menu.
- **Drag** to re-file or reorder; the Rough and Earthwork boundaries refuse.

**Realtime:** channel 1 (`takeoff-sync`) carries items, geometries, calibrations and
folders; every remote change refetches the project after 150 ms. Layers, dimensions,
variables and classifications are **not** live in legacy.

### What exists today

| Piece | State |
|---|---|
| Item columns | Height, pitch, parent, formula, count symbol and size, opacity, `name_base`, classification ref, reference flag, review status: **present, mostly unused** |
| Dimensions | `takeoff_item_dimension` table, no routes |
| Folders | CRUD, colour; the delete confirm says what moves; no multiplier UI, no Properties dialog |
| Layers | CRUD with sub-layers and never-the-last; no seeded three, no active layer, no show/hide |
| Classifications | `workspace.enabled_classifications` (strings), nothing reads it. **No classification table** |
| Variables, subcontractors | None |
| Realtime | `takeoff.item.changed` and `takeoff.geometry.changed` on today's item routes (F8-S18); item-row lock on writes (F8-S9); collaboration modes (F8-S11, S12) |

---

## Design

### Where the math lives (hard rule 2)

- The formula parser, the environment builder, the modifiers and the derived-quantity
  rules are ported into `src/lib/takeoff/subItems/` and `src/lib/takeoff/dimensions/`:
  data in, data out, no React, no network.
- **The api stores what is authoritative** (D-32: anything derived from an item is
  decided on the api under the item lock). It recomputes a parent's sub-items when the
  parent's quantity, a dimension or a variable changes. That needs the same evaluator in
  Python, `app/features/takeoff/formula.py`, proved equal to the TypeScript one by one
  shared table of formulas and answers that both test suites run. See Q1.

### Data model

- `workspace_classification`: system, code, name, parent, sort key, `archived_at`,
  seed flags; unique `(workspace, system, code)`.
- `takeoff_item.classification_ref_id` and `takeoff_folder.classification_ref_id` become
  foreign keys to it (Q2).
- `project.classification_system` (exists) locks a project to one system.
- `takeoff_variable` (workspace) and `takeoff_variable_value` (project).
- `workspace_subcontractor`, `workspace_subcontractor_scope`,
  `project_subcontractor_scope_override`.
- Layers seeded per project: Base Bid (default), Alternate, Deferred Submittals, by the
  api when a project is created (legacy used a trigger).

### Realtime (D-13, D-32)

| Event | Topic | Payload | Published by |
|---|---|---|---|
| `takeoff.item.changed` | project | as F8, `kind` also `sub_item` for a sub-item written under a parent | every item write, sub-items and dimensions included (a dimension changes the item) |
| `takeoff.folder.changed` | project | `{project_uuid, folder_uuid, kind}` | folder create, rename, move, multiplier, delete |
| `takeoff.layer.changed` (**beyond legacy**) | project | `{project_uuid, layer_uuid, kind}` | layer writes (Q6) |
| `workspace.classification.changed` | workspace | `{workspace_uuid, system}` | tree writes, archive, seed |
| `workspace.variable.changed` (**beyond legacy**) | workspace | `{workspace_uuid, variable_uuid}` | variable writes (Q6) |
| `workspace.settings.updated` | workspace | `fields` | enabled systems, subcontractors |

**Collaboration duties (the MANAGER row):**
- Every item write keeps F8-S9's item-row lock.
- In One at a time, a write from anyone but the holder is refused 409 "{name} is editing
  this item right now", and the screen disables the control with that reason. This
  covers sub-items, dimensions and Properties saves, since they write the parent too.

---

## Subtasks

Two windows as in F8: A the owner on `:5173`, B Sara W. on `:5174`.

# Block A: The measurement and its modifiers

### F6-S1: New Measurement and Properties

**Acceptance criteria.**
1. Drawing a run opens "Name this Linear measurement" with "Linear 3" as the default;
   Enter saves it with that name.
2. Colour, "Randomize color", opacity and, for a count, symbol and size mode save and
   draw.
3. With WBS on Preset Classification and nothing picked, Create is disabled; ticking
   "Rough measurement" enables it and files the item under Rough Measurements.
4. The WBS mode and its open state are remembered for this person across a reload.
5. Properties on an existing item reads "Properties", shows "Current folder: Unfiled"
   and saves with "Save".

### F6-S2: Height and pitch

**Acceptance criteria.**
1. A 40 LF run with height 7'-6" reads 300 SF, and its name gains " (40 LF, 7'-6"H)".
2. Pitch 6/12 on 100 SF reads 111.80 SF; 26.565 degrees and 50% grade give the same
   figure.
3. Height and pitch cannot both be set; a pitch of 95 degrees is refused on the field.
4. The api recomputes and stores the figure; B sees it within a second.

### F6-S3: Named dimensions

**Acceptance criteria.**
1. "+ Depth" twice gives "Depth" and "Depth (2)" with keys `d1` and `d2`; deleting `d1`
   and adding again gives `d3`.
2. A marker count offers none and says why.
3. The item's own quantity never changes with a dimension.
4. A dimension a sub-item reads refuses delete with "It's used by: {sub}" and "Open
   {sub}".

# Block B: Sub-items, formulas, variables

### F6-S4: The formula engine, twice and equal

**Acceptance criteria.**
1. A shared table of at least 200 formulas, with their errors, gives the same answers in
   `src/lib/takeoff` and in the api.
2. No formula can execute code; a malformed one returns an error value.

### F6-S5: Create and manage sub-items

**Acceptance criteria.**
1. "Create sub-items" on a 1,000 SF slab: "Mesh" `PARENT * 1.05` reads 1,050 SF;
   "Perimeter form" `PERIMETER` reads the slab's perimeter.
2. An unnamed row blocks with "Name this sub-item to continue"; `PARENT *` with "Fix the
   formula to continue".
3. A sub-item cannot have sub-items.
4. Editing the parent's shapes recomputes every sub-item on the api, and B's tree shows
   the new figures.
5. A sub-item inherits the parent's colour, folder, classification and layer.

### F6-S6: Variables

**Acceptance criteria.**
1. A workspace variable `{Wall Height}` = 10, used by a sub-item, gives its figure; the
   project's own value 12 changes only that project.
2. Archiving it removes it from Insert; existing formulas still resolve.
3. Editing its value recomputes every sub-item that reads it, in every open window.

# Block C: Folders, layers and the tree

### F6-S7: Folders with multipliers

**Acceptance criteria.**
1. "Folder Properties", multiplier 2: the folder shows "×2" and its items' totals
   double; 0 is refused with "Enter a number greater than 0."
2. Delete: "Delete folder?" names the subfolders going and the items moving to Unfiled.
3. Renaming Unfiled to "Sitework" makes a real folder holding the unfiled items.
4. B's tree follows each change live (`takeoff.folder.changed`).

### F6-S8: Layers

**Acceptance criteria.**
1. A new project has Base Bid, Alternate and Deferred Submittals.
2. New measurements file under the active layer; the active layer always shows.
3. Deleting a layer offers "Move contents and delete layer", or "Delete layer and all its
   measurements" after typing DELETE; the last layer refuses with "A project must keep at
   least one layer".
4. Hiding a layer hides its sub-layers' markups on the sheet, in this browser only.

### F6-S9: The item tree

**Acceptance criteria.**
1. Items group by folder, sub-items nested, filtered to the active layer's subtree.
2. The item menu offers what legacy's does that F6 owns (Properties, Override quantity,
   Duplicate, Move to layer, Create sub-item, Delete on this sheet and everywhere);
   the rest are named for their features.
3. Duplicate pre-fills "{name} (2)", can carry sub-items, and keeps or reassigns the
   classification.
4. Shift and ctrl select several; the bulk menu moves them to a folder or layer and
   deletes them.
5. Drag re-files an item; a drop across the Rough boundary is refused.

# Block D: Classifications (F3-S14 to S18)

### F6-S10: Systems on and off (F3-S14)

F3-S14's criteria: all five listed; the last one cannot be turned off, with "Pick at
least one classification system"; an unknown key refused by the api; gated on
`canManageTrades`.

### F6-S11: The tree (F3-S15)

F3-S15's criteria: three levels, add and rename; deleting a code in use refused with
"This one is in use", naming the count, as a 409.

### F6-S12: Archive (F3-S16)

F3-S16's criteria, with "Archive instead" offered on the in-use refusal.

### F6-S13: Duplicates and the seed (F3-S17)

F3-S17's criteria. CSI's 1,833 nodes are seeded once, on first use, never over an edited
tree.

### F6-S14: Filing by classification

**Acceptance criteria.**
1. The picker searches the project's one system, hides archived codes, and can create a
   code inline.
2. Picking a scope makes the division and trade folders and files the item there.
3. "Change classification" moves the item to the matching folder in one step.

### F6-S15: Subcontractors (F3-S18)

F3-S18's criteria.

# Block E: Collaboration

### F6-S16: Live, and the modes, on every new write

**Acceptance criteria (the MANAGER row's two-window check).**
1. Window A creates, renames and re-folders an item; B's tree follows each change live.
2. In One at a time, A holds an item; B's rename, delete, Properties, sub-item and
   dimension controls are disabled with "{A} is editing this item right now", and a
   hand-written request from B is refused 409.
3. In Work together, A edits a sub-item while B edits the parent's dimension; both save,
   and both windows end on the same figures.

---

## Not in F6

| Legacy behaviour | Owner |
|---|---|
| Costs… and the costs view inside Manage sub-items (`estimating_line_costs`) | F9 |
| Link assembly, Save as assembly, Seed from Assembly | F10 |
| Link Screenshot | F11 |
| Earthwork markup, Finish-to-Subgrade Depth | F12 |
| History | Q5 |
| Find Text's "Create takeoff item" type picker | F11 |

## Sequencing

| Block | Subtasks | What it is |
|---|---|---|
| **A** | S1 to S3 | The dialog, modifiers, dimensions. **Reporting boundary** |
| **B** | S4 to S6 | Formulas, sub-items, variables |
| **C** | S7 to S9 | Folders, layers, the tree |
| **D** | S10 to S15 | Classifications and subcontractors |
| **E** | S16 | Collaboration, driven across all of it |

Block D can be built beside B. S1's Preset Classification needs S14, so S1 ships with
Custom Folder first and Preset joins at S14.

## Definition of done

- S1 to S16 driven in two windows; PARITY §8's F6 lines and §2's Classification, Project
  Setup and Subcontractors lines ticked.
- Both formula engines agree on the shared table.
- The spec archived, the MANAGER row dropped, F6 in FEATURES ✅ Live, the mirror
  refreshed.

---

## Questions for the founder

| # | Question | Recommendation |
|---|---|---|
| Q1 | **Where formulas are evaluated.** Legacy evaluates in the browser and writes the answer. Here the api owns writes and D-32 says derived values are decided on the api under the item lock. | **Both:** the browser evaluates for the live preview; the api re-evaluates and stores. Two engines kept equal by one shared table of formulas and answers. |
| Q2 | **Classification references.** Legacy stores `classification_ref_id` as a loose string; the new columns are strings too. | **Make them foreign keys** to `workspace_classification`, so an in-use check is a query rather than a scan, and archive keeps them valid. F17 maps legacy's refs. |
| Q3 | **Variables' scope.** Legacy's are workspace-wide with a per-project value. | **Keep legacy's.** |
| Q4 | **Duplicate's suffix** is always "(2)" in legacy, even for a third copy. | **Keep legacy's "(2)"**, faithful to the reference. The alternative, counting up ("(2)", "(3)"), is a one-line change if you prefer it: two copies both named "(2)" can read as a bug. |
| Q5 | **Item history** (§8's history line). | **F11**, with the other evidence and audit views. F6 records nothing new beyond the workspace audit that exists. |
| Q6 | **Layers and variables live.** Legacy did not sync either. | **Add `takeoff.layer.changed` and `workspace.variable.changed`.** Work together makes two estimators editing layers and variables at once normal. |
| Q7 | **Layer visibility per browser** (legacy's localStorage). | **Keep per browser.** It is a view, not data. |
| Q8 | **Seeding the other four systems.** Legacy ships templates for all five. | **Seed CSI on first use, as F3-S17 says; the other four seed when a workspace first turns them on.** |
| Q9 | **Rough measurements** are in F6 (they feed sub-item formulas); Earthwork markups are F12's. | **As stated.** |
