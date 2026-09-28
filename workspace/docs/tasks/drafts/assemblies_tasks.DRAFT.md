# F10: Assemblies, the Starter Pack and the workspace library (DRAFT)

> **Draft, written overnight 2026-09-27 for the founder's review.** Nothing here is
> decided until the questions at the end are answered and logged. Written from legacy's
> live assembly system ("G3": `src/lib/takeoff/assemblies/`, `AssembliesPanel.tsx`,
> `AssemblyPicker.tsx`, `SaveAsAssemblyDialog.tsx`, tables `assembly_templates`,
> `assembly_template_children`, `assembly_template_costs`, `assembly_folders`).

## The problem

Estimators measure the same things on every job: a partition wall with its studs,
plates, board and tape; a slab with mesh, forms and cure. Legacy lets them save an item
and its sub-items and rates once, as an **assembly**, and place it on any sheet of any
project in the workspace, pre-priced. The new app has sub-items (F6) and, after F9,
rates; it has no assemblies.

**Problem → solution.** Every repeated scope is rebuilt by hand, sub-item by sub-item. →
Legacy's assemblies: workspace-wide, zero-quantity templates, "COPY, NEVER LINK", saved
from an item, placed on the canvas, linked onto an item or seeded into Manage sub-items,
kept in folders, with a read-only Starter Pack a workspace copies from.

## What legacy does

Three generations exist in legacy's code; only **G3** is live. G1 (`project_assemblies`,
`ASSEMBLY_DEFS`) is retired; G2 (`takeoff_assemblies`, `takeoff_assembly_components`) is
still fetched and never shown. F10 ports G3.

### An assembly

`types.ts:1-17`: "Assemblies — workspace-wide, pre-priced, zero-quantity takeoff
templates. COPY, NEVER LINK." Placing one makes an independent item; editing or deleting
the template never touches placed work.

- **Template:** name, type (lf / sf / count, fixed once made), unit, colour, opacity,
  count symbol and size, height or pitch, role depth (SF), classification, folder, tags,
  notes. No description, no version.
- **Children** (sub-item templates): name, formula text, unit, position. No per-child
  classification or colour.
- **Costs:** one row for the template, one per child, the same columns as Estimating's
  line costs (man-hours, wage, lump and unit equipment, unit material, wastage, notes).
- **Folders:** nested, per workspace.
- Formulas copy verbatim: siblings by name (`[Name]`, no id map, "none should be
  added"), variables by `{var:<uuid>}` (valid across the workspace).

### The panel

The Takeoff side panel toggles **"Takeoff | Assemblies"**. In Assemblies:

- Source: "My Assemblies" | "Starter Pack" (per browser); search "Search assemblies…"
  (name or any child's name); collapse and expand one level at a time; "New folder".
- Empty: "No assemblies yet. In the Takeoff panel, right-click an item and choose **Save
  as assembly…**" / "No starter assemblies yet."
- Grouping: folders first, then unfiled assemblies by their classification's division
  and scope, then "Unclassified".
- Folder menu: "New sub-folder", "Rename", "Delete folder" ("Delete the folder "{name}"
  and its sub-folders? Assemblies inside are kept — they become unfiled and show under
  their classification.").
- Assembly row: its type icon ("Resume" arms it), its name (opens Properties), "0.00"
  and the unit, a "$" chip when priced. Menu: "Use on sheet", "Copy to my assemblies"
  (Starter), "Rename", "Properties…", "Change classification…", "Move to folder…",
  "Add sub-items…" / "Manage sub-items…", "Costs…", "Delete assembly" ("Delete the
  assembly "{name}"? Items already placed from it are unaffected.").
- Sub-item row: "Rename", "Edit…", "Costs…", "Delete sub-item".
- **Assembly properties**: the item Properties dialog at zero quantity; the type is
  read-only; "Leave untouched to keep the current classification."

### Making one

**Save as assembly…** (a parent item's menu): "Copies this item and its N sub-item(s),
its classification and its rates into the workspace Assemblies library at zero quantity.
The item on your sheet is not changed." Name, tags, notes; a folder only when the item
has no classification. "Saved to Assemblies" / "{name} is available in every project in
this workspace." Captures the type, unit, style, classification, height, pitch, role
depth, each sub-item's name, formula and unit, and the rates. Not dimensions, layer,
geometry or rough measurements.

### Using one

- **Use on sheet** arms it: its classification's folders are found or made, the name
  gets " (2)", " (3)" in the project, the draft takes its style; "Assembly armed —
  {name}" / "Mark it on the sheet. Press Esc to cancel." The first shape makes the item,
  then its sub-items and rates are copied.
- **Link assembly** (an item's menu): "Showing {type} assemblies only. Its sub-items and
  rates are copied onto this item; the library assembly is not changed." An item that
  already has sub-items asks first; rows are added, never replaced.
- **Seed from… → Assembly** inside Manage sub-items: the type's assemblies (and "Show
  all types"), appended as new rows with their rates.

### The Starter Pack

A global library the Intelcost team keeps: read by every workspace, written only by
platform admins ("New starter assembly"). Nothing seeds it: its content is typed in by
hand in production. A workspace takes a copy with "Copy to my assemblies"; the copy keeps
no link back, so there is no update and no dedupe.

### Permissions, realtime, audit

`canManageWorkspaceLibrary` ("Manage workspace library") exists and is **checked
nowhere**: any member, a viewer too, can write templates. No realtime, no audit.

## What exists today

Sub-items and their formula engine on both sides (F6, D-56), classification filing on
the api (D-59), duplicate naming "(2)", "(3)" (D-36 Q4). Estimating's rates arrive with
F9. No assembly tables.

## Design

- Tables: `assembly_template` (workspace null = the Starter Pack), `assembly_template_child`,
  `assembly_template_cost`, `assembly_folder`; plus `source_template_id` on a copy (Q5).
- **Every multi-step act is one api transaction**: save as, copy to my assemblies,
  place, link, seed. Legacy's "Assembly partly placed" cannot happen.
- Placement reuses F6's item create (`classification_ref_id` files it, D-59) and F9's
  line costs; the api copies children and rates under the item lock.
- Formulas are checked at save: see Q3.
- Realtime: `workspace.assembly.changed` (beyond legacy), so every open panel follows.

## Subtasks

# Block A: The library
- **F10-S1** Tables, the api, `canManageWorkspaceLibrary` enforced (Q1).
- **F10-S2** The Assemblies panel: source, search, folders, rows, menus, confirms.
- **F10-S3** Assembly properties, Manage sub-items and Costs at zero quantity.

# Block B: Making and using
- **F10-S4** Save as assembly.
- **F10-S5** Use on sheet (armed placement).
- **F10-S6** Link assembly, and Seed from… → Assembly.

# Block C: The Starter Pack
- **F10-S7** Read-only Starter Pack, "Copy to my assemblies", platform-admin authoring.
- **F10-S8** The Starter Pack's content (Q4).

# Block D: Collaboration
- **F10-S9** Two windows: a saved assembly reaches B's panel; a placement in One at a
  time takes the new item's hold.

## Not in F10

| Legacy behaviour | Owner |
|---|---|
| The `/library` price book (`library_items`, overrides, Excel import) | a later feature; no navigation reaches it in legacy |
| G1 and G2 assemblies | not ported |
| Estimating's rates themselves | F9 |

## Questions for the founder

1. **Who may write the library.** Legacy checks nothing. Recommendation:
   **`canManageWorkspaceLibrary`** (owner, admin, estimator by default) for templates,
   folders and costs; placing follows `canEditTakeoff`.
2. **Link assembly and the Starter Pack.** Legacy's picker shows only the workspace's
   assemblies (and "Use on sheet" from the Starter Pack probably places without sub-items
   or rates, a legacy fault to confirm). Recommendation: **both sources everywhere**, as
   legacy's own plan says.
3. **Formula tokens that do not travel.** `{dim:dN}` (dimensions are not saved),
   `{ref:<item>}` (another project's item), `{qty:…}`, and a Starter assembly's
   `{var:<uuid>}` from the author's workspace. Recommendation: **save the parent's named
   dimensions with the template** (so `{dim}` travels) and **refuse at save** a formula
   with `{ref}` or a variable from another workspace, naming the sub-item.
4. **Starter Pack content.** Legacy ships none. Recommendation: author a first pack from
   legacy production's starter rows (the founder to export them) or leave it empty at
   launch; not invented by us.
5. **Provenance.** Recommendation: a copy keeps `source_template_id`, so the panel can
   say "Copied from the Starter Pack" and a second copy can warn.
6. **Renaming a child breaks siblings' `[Name]` references.** Recommendation: renaming a
   template child rewrites the siblings' references in the same save, as F6's sub-item
   rename does, if it does; otherwise warn.
7. **Link overwrites the item's own rates** in legacy without saying so. Recommendation:
   keep the item's rates where it has them, and say which were kept.
8. **A type filter in the panel** (legacy has none; tags are stored but not searchable).
   Recommendation: legacy's (none), plus tags in the search.
9. **Creating a blank assembly.** Legacy has no "New assembly" for a workspace (only Save
   as and Copy). Recommendation: legacy's.
