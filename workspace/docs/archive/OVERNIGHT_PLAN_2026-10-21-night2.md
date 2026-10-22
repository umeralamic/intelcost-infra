# Night plan 2, 2026-10-21 (04:25 → 11:30 UTC)

The founder's brief: answers to N1–N12, the exact overlay (N9), the selection store (N3), the window-focus
refetch (N10) and Estimating's first row at 20,000 items. Steps in order; what time does not reach is left for the
next session. The previous plan (night of 2026-10-20 → 21) is archived as `docs/archive/OVERNIGHT_PLAN_2026-10-21.md`.
The report is `morning-report-2026-10-21/NIGHT2_REPORT_2026-10-21.md`, updated after every step.

**Every step:** its decision logged in DECISIONS.md first; gates (app lint, typecheck, build; api ruff, mypy); the
quantity table; one Playwright MCP smoke on a throwaway account; after a product-code step, the archived fixtures that
cover it (fx stack); commit and push on `umer-dev`; the workspace mirror refreshed. Unfinished work goes into a named
stash, recorded in the report. Mail guard stays on.

**Protected, never opened, read or written by any tool, browser or api-process script:** "Hidden Valley Spec",
"Hidden Valley Spec Building Rebid" (bd8fc5b0), "Waxing City", Minmar (and the rest of the guard's list). The 3D test
copy stays under the existing guard; the drives guard (D-667) on every api-process script; real-data proofs on BENCH
DUPs only. The fingerprint is recorded at the start and the end.

| Step | What | Ships as |
|---|---|---|
| 0 | Answers N1, N4, N5, N11, C-N8, N9 recorded in `pending_umer.md` and DECISIONS | workspace commit |
| 1 | N12: every test zip's README says "Assumed grid coordinates. Format test only. Not for machine use."; zips regenerated; round trip, free checker, LandXML schema | commit, files |
| 2 | C-N8: expired-trial wording on the GPS Export switch; a throwaway Professional workspace (Stripe fake) owned by umeralam.q@gmail.com with a BENCH DUP and a share link, switch off | commit; names at the top of the report |
| 3 | N6: a press exactly on a takeoff vertex is a control-point pick on the Earthwork tab (on, a pixel off, empty) | commit |
| 4 | N2: 09.04 Tile's default crew is the tile crew; terrazzo keeps Terrazzo Worker + Laborer; tile scopes in every system | commit; list of scopes |
| 5 | N7: a duplicated project's copied Calculate reads current on first open; a real change still marks it out of date | commit |
| 6 | N9: Calculate on the exact overlay as `calculate_exact_overlay_SPEC.md`: version keys bumped, C-200 vs 14,263 / 8,727 CY, per-region check, quantity-table rows, GPS gap, 3D test copy's new key and md5 as baseline (read only) | commit only if every spec check passes, else stash `night-exact-overlay` |
| 7 | N3: the selection as an external store, the zoom store's pattern; < 100 ms click at 20,000; 1k / 5k / 20k checks | commit if met or clearly better, else stash `night-selection-store` |
| 8 | N4: the bleed-on-Y position check, only if the bench has such a landscape sheet | report |
| 9 | N10: a window focus fetches only items changed since the last read; 20,000-item DUP proof | commit |
| 10 | Estimating's first row: < 4 s at 20,000, < 2 s at 5,000; profile first; totals identical on a priced 5,000 DUP | commit if verified, else stash `night-estimating-first-row` |

After Step 10: no new feature work; re-verify the run's steps in the browser and tighten the report.
