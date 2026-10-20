# Night plan, 2026-10-20 → 21 (19:50 → 11:30 UTC)

The founder's brief: answers to the A list (pending_umer A1 to A7), the selection speed at 20,000 shapes, and GPS
Export steps 4 to 7. Steps in order; what time does not reach is left for the next session. The previous plan
(the night of 2026-10-11 to 12) is archived as `docs/archive/OVERNIGHT_PLAN_2026-10-12.md`. The report is
`morning-report-2026-10-21/NIGHT_REPORT_2026-10-21.md`, updated after every step.

**Every step:** log its decision in DECISIONS.md first; gates (app lint, typecheck, build; api ruff, mypy); the
quantity table; one Playwright MCP smoke on a throwaway account; commit and push on `umer-dev`; refresh the
workspace mirror. Unfinished work goes into a named stash, recorded in the report. Mail guard stays on.

**Protected, never opened, read or written by any tool, browser or api-process script:** "Hidden Valley Spec",
"Hidden Valley Spec Building Rebid" (bd8fc5b0), "Waxing City", Minmar (and the rest of the guard's list). The 3D test
copy stays under the existing guard; proofs with real data use BENCH DUPs only. The fingerprint is recorded at the
start and the end.

**Fixtures (archived, restored for these only):** after Step 4 (crew table, Wage Calculator), Step 6 (Takeoff
selection, panel, Properties) and Step 8 (earthwork, export). A failure the step caused is fixed; any other gets a
one-line cause.

| Step | What | Ships as |
|---|---|---|
| 1 | A1: `drives/` refuse the protected uuids as `lib/protected.mjs` does, before any read or write; proof against a protected uuid (refused, no query sent) and a BENCH DUP (runs) | commit, D-NN |
| 2 | A2: D-658 confirmed as built. A4: `bench-tidy.py` through Step 1's guard, a dry run refusing a protected uuid; D-662 confirmed | DECISIONS, commit |
| 3 | A7 part 1: the test zips' README says "plan feet"; every zip regenerated; round trip, free checker and LandXML schema re-run | commit, files |
| 4 | A5: Commercial & Public crew table: Tile Setter and its helper or finisher, Bricklayer Helper's own row if warranted, rates by the gap fill's ratio method; spec test 6 back to 21; tx115 re-run, Matched count | commit, fixtures |
| 5 | A6: `docs/tasks/calculate_exact_overlay_SPEC.md`, spec only, Calculate's engine untouched | doc commit |
| 6 | A3: selection at 20,000 shapes: profile first (written into the report), then fix the biggest parts; 1k / 5k / 20k before and after; ZHO Dania Pointe Page 26 position case | commit if met or clearly improved, else stash `night-a3-selection`; fixtures |
| 7 | GPS Export step 4: `sheet_georef` table and migration, routes with the server fit, the panel, units, system and datum, links and sites; proof on a BENCH DUP of C-200 with residuals | commit if verified, else stash `night-gps-step4` |
| 8 | GPS Export step 5 (only if 7 is committed): the button, the dialog, the "Building pad" tick; utilities wired; end-to-end export and re-import | commit; fixtures |
| 9 | GPS Export step 6 (only if 8 is committed): the fourth-monument check; test zips with real coordinates in `morning-report-2026-10-21/gps-test-files/` | commit, files |
| 10 | GPS Export step 7 (only if 9 is committed): guests: the link switch, the read-only dialog, the download log; guest and member checks | commit |

After Step 10: no new feature work; re-verify the run's steps in the browser and tighten the report.
