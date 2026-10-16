# F29 night run 2026-10-16: migrations for Abdullah

Listed only. Every migration below adds columns or tables; none writes to an existing row's data.

| Revision | Down revision | What | Decision |
|---|---|---|---|
| `d529a4e7c1b3` | `c9a5e7d2f4b6` | `takeoff_item.earthwork_retired` Boolean, server default false, not null | D-529 |

No new packages (app or api).

**Behaviour to know at promotion.** A stored earthwork result that has a Site Feature undercut reads out of date
once (D-528, version prefix `v6u`/`v5u`). Nothing is written to it; the next Calculate replaces it. This is D-470's
mechanism. On the bench it affects the 3D test copy's C-200 only (Hidden Valley Spec Building Rebid's result is
already a v5 result, out of date since D-470).
