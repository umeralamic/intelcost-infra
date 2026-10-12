# Day report, 2026-10-12

Run from 04:21 UTC until 11:30 UTC. Blocks 0–5, then the stretch list. Updated after every block.

## Block 0 — Housekeeping — done (04:40 UTC)

- **Phase E branch:** the `overnight-metric-phase-e` stash became `wip/metric-phase-e` in app, api
  and infra (`git stash branch`, one WIP commit each, rebased onto `umer-dev`), pushed, not merged.
  The stashes are gone (`git stash list` empty in all three). Commits: app `f359081`, api `ece70d5`,
  infra `d5a5643`.
- **Last night's test data purged** from the throwaway workspace (Bench Construction of
  `estimator+1790627038`, workspace 3100), in one transaction:
  - "zz currency smoke" (project 6389, no files, no sheets);
  - the five metric entry items (3153–3157);
  - the five Phase E sub-items under "Slope smoke" (3158–3162);
  - the earthwork site on page 113: EG Spots, FG Spots, Work Boundary, the three Calculate lines
    (3163–3168) and their result row (27);
  - the "Phase E template smoke" assembly (24).
  - **Storage:** every key under the workspace's project areas was listed. 366 objects belong to
    Riverside and 38 to "zz switching"; **0 objects** sit under a project that no longer exists.
- **Abdullah's list** (pending_umer.md, "For Abdullah"): migrations `d373a1b9c4e5` and
  `d374b6c2d9e1`, and `METRIC_ENABLED=false` in production.
