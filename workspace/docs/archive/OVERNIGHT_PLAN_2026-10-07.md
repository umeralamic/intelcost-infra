# Overnight plan, 2026-10-07 04:37 UTC to 11:30 UTC

Brief: the founder's second overnight brief: Part A (his decisions, Essentials read-only
Estimating and Wage Calculator, Auto Count tag variants, the TYP. rule and a background vector
index) and Part B (Image-mode speed, B1 to B8). Report: [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md),
updated after each step. The last run's plan and report are in git
(`intelcost-infra/workspace/docs/tasks/`, commit `6049564`).

## Rules held for every step

- Each step is finished, gated (ruff + mypy; lint + typecheck + build; the quantity table, which
  carries Auto Count's regression cases), checked on the bench with throwaway accounts, committed
  and pushed on `umer-dev` before the next starts. At 11:30 UTC a step in progress is stashed as
  `overnight-<step>-unfinished`, not committed. No step starts that cannot plausibly finish.
- The mail guard (D-279) is on; check scripts and throwaway data are deleted afterwards.
- Wording: Essentials and Professional; Essentials is "annotations and comments"; no tax or refund
  wording.
- The founder's projects are read only (Hidden Valley Spec; Waxing City and Hidden Valley Spec
  Building Rebid in Bench Construction Test). The Auto Count sheets are copied out of them into a
  throwaway workspace.
- Unclear points: the option that matches DECISIONS.md and the specs, recorded in the report.

## Auto Count test bed

- Throwaway workspace with copies of E101 (Hidden Valley Spec Building Rebid) and E200 (Waxing
  City); ground truth from the sheets' own tags (68 office "A"; 24 "C" + 2 "C/NL"); E200's 12 hatched
  and 6 empty fixtures as last run. Sensitivity 70%.
- A throwaway harness (not committed) runs the panel's own scan and result step in the bench's
  browser and records time, time to first results, checked right/wrong per tag, unchecked count,
  and every kept candidate's position, score, angle and mirror (the Part B results contract).
- Image baseline of all four tests is taken at the start (about 70 minutes on the bench); Part A
  does not touch Image mode's scan or result path, so it stands as "after Part A". If a Part A
  change does touch it, the baseline is re-taken.

## Order

| Step | What | Repos | Done when |
|---|---|---|---|
| A1 | One DECISIONS entry (D-287): the founder's six decisions; D-277 Q3 amended; Library parked in PARITY_GAPS and MANAGER | workspace | committed in the mirror |
| A2 | Essentials read-only Estimating and Wage Calculator: entry points shown, edit controls hidden, the one-line message, a read endpoint for the saved wage set (factors, notes); server writes still refused | api, app | gates, smoke (Essentials with rates + estimate, without rates, a refused write, Professional unchanged), docs |
| A3 | Auto Count: tag suffix variants as separate items (one item per tag, same folder, panel lists tag counts), the TYP. rule, the mirror rule for text (Vector), a background per-sheet vector index (worker, stored, re-indexed on file change) | app (api if storage needs it) | vector table before/after, no accuracy lost, index build time, D-entry, SINCE_ARCHIVE |
| B1 | Image-mode Timing line (stages, passes run/skipped, sizes, workers, scorer) and per-result angle/mirror | app | identical results |
| B2 | First pass (0°, own orientation) whole page, result step, shown checked at once; other passes add in the background | app | identical final results; time to first results |
| B3 | Skip symmetric passes (a); text rule skips mirror passes (b) | app | identical (a); every change listed (b) |
| B4 | Image workers kept alive for the scan and while the sheet is open; band data sent once | app | identical |
| B5 | WASM SIMD fine scorer, JS fallback | app | every window within 0.001 |
| B6 | OpenCV shortlist prefilter, lazy | app | zero dropped on every test; total time down |
| B7 | WebGPU scorer behind a setting (stretch) | app | |
| B8 | Other safe levers found while profiling | app | identical |

Realistic reach in under seven hours: A1 to A3, then B1 to B4 at least; B5 onward only if each
can finish and pass its identical-results check before 11:30 UTC. What is not reached is listed
in the report with where it stopped.
