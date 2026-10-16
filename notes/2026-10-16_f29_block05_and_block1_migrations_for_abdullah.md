# F29 night run 2026-10-16: migrations for Abdullah

Listed only. Every migration below adds columns or tables (the log row's foreign key to its layer is checked at commit, D-537, so a project purge cascades cleanly); none writes to an existing row's data.

| Revision | Down revision | What | Decision |
|---|---|---|---|
| `d529a4e7c1b3` | `c9a5e7d2f4b6` | `takeoff_item.earthwork_retired` Boolean, server default false, not null | D-529 |
| `d532b7e3f0a9` | `d529a4e7c1b3` | Tables `earthwork_soil_layer`, `earthwork_bore`, `earthwork_bore_layer`, `earthwork_bore_water`; `earthwork_assumptions.water_buffer_ft` (Numeric, default 1.0) and `.slope_rule` (JSONB, null) | D-532 |
| `d537c4a9e2f1` | `d532b7e3f0a9` | `earthwork_bore_layer.soil_layer_id`'s foreign key made DEFERRABLE INITIALLY DEFERRED, so a project purge that cascades to layers and log rows passes | D-537 |

No new packages (app or api).

**Behaviour to know at promotion.** A stored earthwork result that has a Site Feature undercut reads out of date
once (D-528, version prefix `v6u`/`v5u`). Nothing is written to it; the next Calculate replaces it. This is D-470's
mechanism. On the bench it affects the 3D test copy's C-200 only (Hidden Valley Spec Building Rebid's result is
already a v5 result, out of date since D-470).
