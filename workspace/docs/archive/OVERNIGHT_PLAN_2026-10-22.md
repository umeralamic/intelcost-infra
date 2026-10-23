# Night plan, 2026-10-22 (02:06 → 11:30 UTC)

The founder's brief: answers to Q1–Q7 of the day session of 2026-10-21, plus the Markup Properties panel. Steps in
order; what time does not reach is left for the next session. The previous plan (night run 2 of 2026-10-21) is
archived as `docs/archive/OVERNIGHT_PLAN_2026-10-21-night2.md`. The report is
`morning-report-2026-10-22/NIGHT_REPORT_2026-10-22.md`, updated after every step.

**Every step:** its decision logged in DECISIONS.md first; gates (app lint, typecheck, build; api ruff, mypy); the
quantity table; a Playwright MCP smoke in the browser on a throwaway account; the archived fixtures covering what it
touched (fx stack); m6-position after any change to the canvas, zoom or selection; commit and push on `umer-dev`; the
workspace mirror refreshed. Unfinished work goes into a named stash, recorded in the report. Mail guard stays on.

**Protected, read only to every tool, browser and api-process script:** "Hidden Valley Spec", "Hidden Valley Spec
Building Rebid" (bd8fc5b0), "Waxing City", Minmar, everything in "Bench Construction Test", and the rest of the
guard's list. Drives guard (D-667) on. Real-data proofs on BENCH DUPs only, purged at the end. Fingerprint at the
start: **21edb8ca37565ce5**.

| Step | What | Ships as |
|---|---|---|
| 0 | Delete `intelcost-infra/fx-suite/browser/shots/`; Q1–Q7 recorded in `pending_umer.md` and DECISIONS | workspace commit |
| 1 | Q1: the GPS Export switch's tooltip names the reason before the click (trial ended, Professional ended, Essentials), the toast's sentence; each case on a throwaway account | commit |
| 2 | Q2: is the items read compressed end to end? If not, turn it on; Estimating's first row at 5,000 and 20,000 before and after; a streamed read only if 20,000 is still over 4 s; no field dropped (D-658); totals identical on a priced 5,000 DUP | commit if verified, else stash `night-items-read` |
| 3 | Q3: `synchronous_commit = off` on the bench database only, noted in the bench docs; f6-a re-run; a plan (not run) for measuring on Abdullah's staging | commit (infra), plan file |
| 4 | Q4: window B paints the changed row from the single-item read first, the wider refresh after; before/after (350–700 → ~150 ms); D-501's newer-change notice; a guest's view | commit |
| 5 | Q6: f7-h step 7 and rv-rows step 5 under load: cause found; fixture or app fixed, with evidence | commit |
| 6 | Q5: selection highlight as its own overlay, < 100 ms at 20,000; behaviour checks on WebGL and SVG; m6-position | commit if met or clearly better, else stash `night-selection-overlay` |
| 7 | Watch: no false "Needs recalculating" after Calculate on DUPs of C-200 and the 3D test copy (reload, sheets, Estimating, second window, guest, duplicate); one real change marked | report; fix only a clear bug |
| 8 | Q7: platform admin table of sessions per renderer path, 7 and 30 days | commit |
| 9 | Markup Properties: `markup_properties_PLAN.md` brought up to date against legacy (UmeralamDEV) and today's app, blocks; first block built and verified as member and guest | commit verified blocks, else stash `night-markup-properties` |

After Step 9, no new feature work: re-verify in the browser and tighten the report.
