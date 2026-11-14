# Price library corrections (night run 2026-11-14 → 15, Part 2)

**Decision:** D-1268 (the founder's "D-1267", renumbered by D-1265's note). **Repos:** api, app, infra. **Brief:** the
founder, 2026-11-14 night run, Part 2.

## Problem → solution

D2241 SDR 21 is priced above C900 DR 18 at 4–8 in though it is the thinner, cheaper pipe; pull string and tracer wire
are priced high; a short job's tests are priced only by the foot, far under what a crew charges to come out; a new storm
main defaults to 12 in SDR-35; warning tape defaults the wrong way round (on for gravity, missing on some pressure
types). → Reprice by migration with every old value logged, minimum charges as their own top-up lines per estimate,
18 in RCP Class III for a new storm main, tape on for pressure and off for gravity.

## Tasks

1. **Prices by migration** (one revision on `d1267c909a15`, not folded; seed
   `app/features/materials/seed/d1268_price_corrections.json`):
   - `pipe:pvc_d2241_sdr21` and `_sdr26` at 3–12 in: C900 DR 18 at the same nominal × the wall area ratio (IPS OD,
     t = OD ÷ SDR, against cast-iron OD and the DR 18 wall); 3 in from 4 in by weight. Grade C. 1-1/2 and 2 in kept.
   - `addon:pull_string` $0.08/LF (C), `tracer_wire` $95.00/roll (C).
   - New: `addon_min:test_disinfect` $1,500, `addon_min:cctv` $1,200, `addon_min:pressure_test` $750, EA, grade C.
   - Each overwrite carries its old price, grade and source in the seed and in one `release_audit` row; the downgrade
     restores them and removes the audit row and the three new keys.
2. **Minimum charges** (api, `features/materials/minimums.py`): after a sheet's materials are written (`write_lines`)
   and after prices are filled or updated (`fill_missing`, `apply_changes`), the project's by-the-foot amount of each
   tested add-on (test and disinfection per system; CCTV and pressure test one each) against its minimum; a top-up
   line (role `utility_minimum`) where short, none where met. `write_lines` and `set_superseded` leave the role alone.
3. **Storm main default** `rcp_c76_wall_b:18` (app `types.ts`); the storm lead unchanged.
4. **Tape defaults** (app `types.ts`): on for every pressure type (irrigation and chilled water gain it), off for every
   gravity type. A stored run unchanged.
5. **Quantity table:** library rows (pull string, tracer, the three minimums, D2241 < C900 at every shared size with its
   ratio), the minimum top-up worked by hand (short run on, long run off, per estimate across two sheets, per system),
   type-lines rows (a new storm main's 18 in RCP, a water run's tape, a sanitary run without, irrigation with, the
   storm lead's HDPE), the pull string and tracer line costs at the new prices; existing rows moved by the tape change
   updated; the grade counts.
6. **Proof:** migration on a separate Postgres (empty-DB schema = bench; bench copy ×2, down/up, library rows
   identical); bench run with the founder digest before and after; gates; smoke with labour on a throwaway.
7. **Docs:** FEATURES (F44 tape and storm defaults, F38 minimums), SINCE_ARCHIVE row, workspace mirror.
