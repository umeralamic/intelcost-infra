# What's on umer-dev since the last staging merge: notes for promotion

_For Abdullah. Written 2026-10-15 by the night run, from the repos (read-only). The remote refs are
from the last fetch (2026-10-12); if `staging` moved since, re-check the counts below._

## Where things stand

- **The last merge into `staging`** was on 2026-10-12, for both repos:
  - **api:** PR #5, `935c6aa`, base `1ea351d` ("Metric for everyone… D-396");
  - **app:** PR #2, `89a02da`, base `af0c66e`.
- **Since then on `umer-dev`:**
  - **api:** 17 commits, ending `1ac616a`;
  - **app:** about 85 commits, ending `c55ca87`.
  - **infra** has no staging branch: its new commits are bench scripts, notes and the workspace
    mirror.
- **`main` has never had a merge from `umer-dev`** in any repo; it is still the 2026-09-16 initial
  commit. A promotion to `main` therefore carries everything (see the end).
- **Your staging `scripts/deploy.sh` runs `alembic upgrade head` on every push,** so merging applies
  the migrations below by itself. One thing to check on the box: the script stops unless
  `API_SERVICE` is set, and it ships as `API_SERVICE=""`. It is probably already set there.

## Migrations (api): 10, one straight chain

They run from staging's head `d383e7a2b5c4` to the new head **`f2c9a7d4e1b8`**. None changes a
stored quantity.

| # | Revision | After | What it does |
|---|---|---|---|
| 1 | `d384f2a6c8e1` | `d383e7a2b5c4` | `takeoff_cost_component.formula_unit_system`, default `imperial` |
| 2 | `d385a1c7e9b2` | `d384f2a6c8e1` | `project_equipment_usage.formula_unit_system`, default `imperial` |
| 3 | `d405b3e1f7a2` | `d385a1c7e9b2` | Subgrade prep method and stabilizer columns on `takeoff_item`; `earthwork_assumptions.soil_dry_unit_weight_pcf` (not null, default 110) |
| 4 | `d406c2a8e4b1` | `d405b3e1f7a2` | **Data:** adds `prep_lift_ft` and `prep_compaction`; fills `prep_lift_ft = prep_depth_ft / prep_lifts` where empty; fills `formula_qty` on Calculate's sub-items where empty; `project_fill_material.kind` and its unique index rebuilt |
| 5 | `d407e5b9c3f1` | `d406c2a8e4b1` | Undercut native-soil columns on `takeoff_item` (all nullable) |
| 6 | `d409c4e2a7b6` | `d407e5b9c3f1` | **Data:** `takeoff_folder.is_earthwork_lines`; inserts one "Earthwork" folder per project that has Calculate lines in no folder and moves those lines into it |
| 7 | `d410b8f3c1e5` | `d409c4e2a7b6` | Renames "Earthwork (Grading)" folders to "Earthwork" (should touch 0 rows) |
| 8 | `c7d3e9a1b4f6` | `d410b8f3c1e5` | `earthwork_review.report_views` (JSONB, default `{}`), `truck_lcy` (default 12) |
| 9 | `e6b2d8a4c1f9` | `c7d3e9a1b4f6` | `earthwork_review.contour_style` (JSONB, default `{}`) |
| 10 | `f2c9a7d4e1b8` | `e6b2d8a4c1f9` | `project_share_link.show_pricing` (not null, default false): every existing link stops showing prices to viewers until its owner turns it on (D-497) |

Numbers 3 to 7 are covered in more detail in `2026-10-12_f25_data_migrations_for_abdullah.md`.

## New settings and environment

- **Nothing new on the api or the app.** No new keys in `app/config.py`, no `.env` changes, no
  new `VITE_*`.
- **`METRIC_ENABLED` is gone** (removed in D-396, already on staging). A leftover value in a server
  `.env` does nothing.
- **New app libraries,** browser only: `three` (the 3D view) and `jspdf` (the grading report's PDF).
- **New browser storage:** `localStorage["intelcost.outbox"]`. It is the write outbox (D-493).
  Drawings still in flight when a page reloads are kept there and sent again.

## Results users will see as "out of date"

- **D-470, the engine reads arcs and cut-out shapes as drawn.** It moves the earthwork version key
  (sheet v5 → v6, site v4 → v5).
  - **What users see:** after the deploy, every saved earthwork result opens as "Out of date: …
    press Calculate". The report's PDF asks for a Calculate first (the Excel still downloads).
  - **What happens to the data:** nothing is rewritten and nothing runs by itself. Users press
    Calculate. Only projects with arcs, cut-outs or ellipses get new numbers.
  - **More detail:** `2026-10-14_earthwork_out_of_date_after_d470_for_abdullah.md`, with a read-only
    SQL count to run on staging or production first.
- **No other result or quantity is marked stale** by this batch.

## API behaviour changes worth knowing (tonight, no migration)

- **Creating an item with its first shape is now idempotent** on that shape's `client_uuid`.
  Creating a markup takes an optional `client_uuid` the same way. A repeat returns the existing
  row (D-492).
- **These creates take a Postgres advisory transaction lock** on the client uuid
  (`pg_advisory_xact_lock(hashtextextended(uuid, 0))`), so two at once make one row (D-493).
  Nothing to configure.
- **Item reads now remember each row's uuid for the length of the request** (D-494). Large
  projects list items several times faster.

## Workers, services, storage

- No new Celery tasks or beat entries.
- No new external services.
- No new S3 prefixes.
- Calculate also runs in a browser Web Worker (app only; no server change).

## If this goes to `main` instead (it has never been merged)

Everything since 2026-09-16 goes with it:
- **115 migrations** (`747486d5ae98` → `e6b2d8a4c1f9`). Several of them convert stored values:
  - the scale in feet per PDF point (`d51a7c3e9b24`, with the bench's `drives/d51-recompute.py`);
  - shrink stored as printed;
  - arcs re-measured;
  - the slope factor;
  - the role changes.
- **New settings:** the S3 credentials renamed to `AWS_*` (the old names are still read), mail
  guard, MaxMind, AI keys, Stripe keys and prices, and the wage-calculator seed directory.
- **New worker tasks,** ten modules.

Ask Umer for the full list before that promotion. It needs the full fixture run first (CLAUDE.md:
none before a promotion to `main`).
