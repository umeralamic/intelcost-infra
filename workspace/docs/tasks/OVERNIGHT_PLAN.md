# Night plan, 2026-10-30 (00:10 UTC to 11:30 UTC): release failures, OCR, GPS export clean-up, earthwork fixes

The founder's brief of 2026-10-29 evening, seven steps worked in order. Report:
`intelcost-infra/morning-report-2026-10-30/REPORT_2026-10-30.md`, updated after every step. Time read with
`date -u` before every decision based on it; the final report is written from 11:30 UTC at the latest. The previous
plan is archived as `docs/archive/OVERNIGHT_PLAN_2026-10-24.md`.

**Read only, every tool, browser and api-process script:** Hidden Valley Spec, Hidden Valley Spec Building Rebid
(bd8fc5b0), Waxing City, Minmar, everything in Bench Construction Test, the 3D test copy's shared copy (6467) and its
"(shared copy) (shared copy)" (6565, added to the three guard lists at the start). Real-data proofs on BENCH DUPs and
throwaway accounts only, purged at the end. Fingerprint at the start and the end. Mail guard and drives guard on.

**Every step:** gates (app lint, typecheck, build; api ruff, mypy), `./quantity-table.sh`, one Playwright MCP smoke
check; only the fixtures the step names; commit on `umer-dev` when finished (a named stash otherwise); push at the end.
A decision needed from the founder: a numbered question in the report with the recommended answer, taken.

| # | Step | State |
|---|---|---|
| 0 | Fingerprint at the start; guard lists gain 6565 and 10793 SBR | ☑ |
| 1 | f6-a (3.25 s to a second window) and n3-twenty-loads (6.1 s image): find the slow stage, bisect, fix; each alone ×3 | ☐ |
| 2 | The 12 parallel-only failures: cause each (data/account, starvation, app race); re-run those 12 in parallel; fix isolation; the 3 dev-server failures | ☐ |
| 3 | OCR worker started by `release`, a scan's scale read in the run; regions first, whole sheet last; 50-sheet times before/after; 103-sheet key counts | ☐ |
| 4 | GPS export: weld, slivers, winding, refuse a folded surface (a); PDF-0 linework (b); README coverage and steep area (c) | ☐ |
| 5 | Deleted proposed contour still on hover/snap/selection; other earthwork shapes | ☐ |
| 6 | Cut & Fill swell per material (a); sections PDF (b); copy-of-copy numbering (c) | ☐ |
| 7 | Equipment cost build-up per EH, report only | ☐ |
| F | Fingerprint at the end, purge DUPs and throwaways, push, final report | ☐ |
