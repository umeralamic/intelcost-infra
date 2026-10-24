# My equipment: plan (F34)

**Status:** Accepted by the founder on 2026-10-23, with the recommended answer to all seven questions (D-759). Not
built yet: it will start in an overnight run. Log nothing new before block A beyond D-759; record any change found
while building as a later D-NN.

**Goal.** A workspace keeps a list of the machines it uses. Suggestions show those machines first, with the company's
own values, and can be limited to them. The full library stays one click away, and hiding a machine never changes a
price.

## The behaviour

1. **Settings › Equipment library:**
   - Every machine, national or custom, has "On my list" (the brief's "Show in suggestions"), with bulk on and off
     by category and by type.
   - A header toggle switches between "Show all library equipment" (the default for every workspace) and "Show my
     equipment only".
2. **Pickers:** the Equipment cost component, the Shared equipment dialog, the template editor and the tier
   editor's class list. Each lists the company's machines first, with its own values where set, under "My equipment".
   - In "Show all" mode the rest of the library follows below.
   - In "Show my equipment only" mode the rest sits in a collapsed "Search the full library", which still reaches
     every machine.
3. **Building the list:**
   - Importing a machine list adds every row you confirm or add as a company machine.
   - "Add to my equipment" appears on any component or shared machine whose class isn't on the list.
   - A custom machine joins the list when it is created.
   - The first switch to "Show my equipment only" offers a starting list (Q1).
4. **Hiding never breaks pricing:**
   - A machine off the list keeps pricing wherever it is already used: estimates, assemblies, starter tiers and site
     spreads.
   - In "Show my equipment only" mode, a tier or site machine off the list shows "Not in your equipment list", with
     "Add to my equipment" beside it.
5. **Earthwork activities:**
   - Each activity gets "Show in suggestions".
   - A hidden activity is not offered in line mapping or in pickers, but keeps pricing the lines already mapped to it.

## The answers (Q1 to Q7, the recommended ones, accepted)

1. **Starting list:**
   - The first switch to "Show my equipment only" pre-ticks every machine class already used in this workspace:
     its estimates' components and shared machines, its assemblies, its earthwork tiers, and imported machine lists.
   - The user reviews the list before it saves.
2. **Who can change the list**, including "Add to my equipment" from a component:
   - Anyone with "Manage workspace library", as for company rates (D-731).
   - Others still see and price every machine; the button tells them to ask an admin.
3. **"Show all" mode** still lists the company's machines first, under a "My equipment" heading, then the rest of the
   library.
4. **Starter tier machines off the list** are not added automatically:
   - They show "Not in your equipment list", in "Show my equipment only" mode only, with "Add to my equipment"
     beside it.
5. **Workspace only.** No project override; a project's picker still reaches the full library.
6. **A hidden activity already selected in line mapping** stays selected, labelled "(not in suggestions)". It keeps
   pricing, and isn't offered for other roles.
7. **Bulk "off" on a category with machines in use** is allowed, with "N of these are used in estimates; they keep
   pricing".

## The data change, and why

- **New table `eq_my_equipment`:** workspace_id, equip_key, source (manual, import, custom, starting list), added_by,
  added_at. One row per machine on the list; unique per workspace and key.
- **New workspace setting `eq_suggest_mine_only`:** boolean, default false. It lives on the workspace's equipment
  settings.
- **New field `in_suggestions` on `eq_company_activity`:** boolean, default true. Those rows already belong to the
  workspace.

**Why not a field in `eq_override`:**
- That table is the priced-value layer (D-731). Its rows carry a grade, a national value, a project scope and
  confirm-none.
- It feeds the Company rates export, "Revert all", the U badge and release notices (D-741).
- A visibility flag there would make a machine read "company value" just for being hidden, and would put a
  non-rate row in the export.

**Why a list of machines on it, rather than a flag per hidden machine:**
- "All shown" by default costs nothing: an empty list in "Show all" mode shows everything, with no 628-row write
  per workspace.
- A new national release's machines stay off a curated list. With hidden-flags they would appear by default in
  every company's "my equipment" view.

## Where it plugs in

| Area | Files | What changes |
|---|---|---|
| Data and api | `intelcost-app-fastapi/app/features/equipment/{models,service,routes,schemas}.py` (`bundle`, `save_custom_class`, the `import` route), `app/features/audit/service.py`, a new migration | The table, the setting and the activity field. The bundle carries `my_equipment` and `mine_only`. Routes: bulk add and remove (by keys, a category or a type), the mode, the starting list (Q1). Custom machines join on create; import joins in the same transaction. Audit actions `library.my_equipment_added`, `library.my_equipment_removed` and `library.suggest_mode`. |
| Engine helpers (pure) | `intelcost-app-react/src/lib/estimate/equipment/resolve.ts`, new `lib/estimate/equipment/suggest.ts` | `Library` gains `inMyEquipment(key)` and `mineOnly`. `suggest()` orders and filters candidates. Pricing (`classOf`, `num`, `machineCost`, `libraryResourceCost`) is untouched: the list filters only what is offered, as `retired_in` does today. |
| Settings › Equipment library | `src/features/equipment-library/{LibraryPage,ClassDetail,api}.tsx` | "On my list" column in the size grid and a checkbox in the class detail. Bulk per category and type in the tree. Header toggle. A "My equipment" filter. The starting-list review (Q1). The bulk-off warning (Q7). |
| Import | `src/features/equipment-library/ImportDialog.tsx` | Confirmed and added machine-list rows join the list, in the same write (D-728, D-740). |
| Pickers | `src/features/equipment-library/Picker.tsx` (the cost component, and the template editor through `ComponentDialog`), `src/features/estimate/EquipmentDialog.tsx` (`MachineName`), the tier editor's class list in `src/features/equipment-library/EarthworkProduction.tsx` | "My equipment" first, with the company's own values. The collapsed "Search the full library". "Add to my equipment" (Q2). |
| Earthwork production | `src/features/equipment-library/{EarthworkProduction,SiteSpreads}.tsx`, `app/features/equipment/production.py` (`config`, `site_state`) | "Show in suggestions" per activity. Line mapping and pickers skip hidden activities but keep current mappings (Q6). "Not in your equipment list" notes in tiers and site spreads (Q4). |
| Release banner | `src/features/equipment-library/ReleaseBanner.tsx`, `app/features/equipment/service.py` (`release_state`) | In "Show my equipment only" mode: "N new machines in release R, not in your list: review". |

## Fit with logged decisions

- **D-751 (`national_hidden`):** that flag means "the company removed this starter activity", never taken up again by
  a release. "Not in suggestions" is a different thing: the activity still follows starter releases and still
  prices. They stay two separate fields; D-751 is unchanged.
- **D-741 (release notices):** in "Show my equipment only" mode, a release's new machines don't reach suggestions; the
  banner names them (above).
- **D-728 and D-740 (import):** confirmed and custom rows also join the list, in the same transaction.
- **D-731:** list writes take "Manage workspace library" and are audited, like every library write.
- **D-718, D-744, D-758:** pricing, snapshots, site spreads and typed values are untouched. Nothing outside the
  suggestion lists reads the list.

## Blocks

| Block | Work | Checks | Time |
|---|---|---|---|
| **A. Data and api** | Migration (table, setting, activity field). Models and schemas. Routes for bulk add and remove, the mode and the starting list. Bundle fields. Custom-machine and import joins. Audit actions. | ruff, mypy, `alembic check`. Quantity table unchanged. | 0.5 day |
| **B. Library page** | "On my list" column and checkbox. Bulk per category and type. Header toggle and "My equipment" filter. Starting-list review (Q1). Bulk-off warning (Q7). | eslint, tsc, build. Smoke on a throwaway: tick 3 machines; switch the mode and the review offers the classes in use; bulk-off a type and see the warning; reload and it persists. An estimator without "Manage workspace library" sees no checkboxes. | 0.5 day |
| **C. Pickers** | `suggest.ts` (pure). Picker, `MachineName`, the template editor and the tier editor's class list list "My equipment" first, with the collapsed full library. "Add to my equipment" (Q2). | **Quantity table rows:** (1) a default workspace (empty list, show all) is offered all 628 classes; (2) mine-only offers exactly the list, first, and the full search still reaches 628 plus custom; (3) a class off the list still prices to the cent (EX-CRAWL-30T worked check, $16,471.70, list on and off). Smoke: a throwaway in mine-only mode sees its 3 machines, opens the full library, adds a 4th from a component. | 0.75 day |
| **D. Earthwork activities and the banner** | `in_suggestions` per activity. Line mapping and pickers skip hidden activities but keep current mappings, labelled (Q6). "Not in your equipment list" in tiers and site spreads (Q4). The release-banner line. | **Quantity table row:** a hidden activity's mapped line prices the same. Smoke: hide A2 on a throwaway; its lines still price; A2 is not offered for another role; its own mapping reads "(not in suggestions)". | 0.5 day |
| **E. Close-out** | Report, SINCE_ARCHIVE, FEATURES (F34 to Working, then Live after the founder's check), the mirror. | Full gates and the full quantity table. One end-to-end smoke on a throwaway workspace. | 0.25 day |

**Total:** about 2.5 working days, or one long overnight run. Blocks A to C deliver the machine list; D adds
activities and the banner.

**Rules for the run:** throwaway accounts and workspaces only; the founder's projects are read-only; no invented rates;
a gate or an expected number is never weakened (disputes go under Disputed numbers); no competitor names (rule 9);
`umer-dev` only.
