# Run progress (2026-11-06/07, run mode)

Updated after each item. Benchmark A's figures are only in `test-data-local/benchmark-a/` (D-1025).

**Checks before the run:** `E:\Intelcost\docs` is inside a git repo: **no**. But `intelcost-infra/workspace/docs/` mirrors
it: the two new reference workbooks (`Mohave_AZ_all_crafts_labor_comparison.xlsx`, `DE MAIN SOURCE FILE r&d arizona.xlsx`)
are git-ignored there and never copied (infra 25f1c3f). Older reference files in the mirror were committed before.

## Done
- PRICING_FIX_PLAN redacted, pushed (D-1025). WAGE_PLAN written, pushed; approved 2026-11-06 (D-1032).
- BLS client and key setup, pushed (api 8b7dcfc, infra 25f1c3f; D-1030, D-1031).
- Pricing item 9, internal workspaces (D-1026): api 07fb129, app be562ea. Smoke: a throwaway workspace marked internal
  showed no trial; unmarked, "Trial, 14 days left" again. No Comp (not needed).
- Pricing item 0, copy keeps site machines and spreads (D-1027): api 0d85a21, infra 4701da6. Benchmark A's fresh copy
  bids the original's figure (local log).
- Pricing item 8, Benchmark A comparison (D-1028): infra 4701da6. Quantity table: 344 rows passed, "Benchmark A: 8
  lines, right".
- Pricing item 5, disposal cost kind (D-1029): api 50cebf1, app daeb65d. Smoke on the Benchmark A copy: tax on tipping
  gone, line costs unchanged; bid −4.7 % (see Needs Umer).
- Mohave check (D-1032), local `test-data-local/wage/mohave-check.md`: of the founder's 70 INPUT lines, 31 match a
  current Mohave WD line (21 Building AZ20260043, 10 Highway AZ20260046 and Heavy AZ20260058, 4 Heavy Dams
  AZ20260006, some in several), 24 match none, 15 are blank.
- C3 report date (D-1033) and Q215 warm-up (D-1034): infra 0ffd00a. Q217: 2 throwaways and their 2 workspaces purged.

## In progress
- Wage core (D-1032, D-1036): built, api gates pass, wages mode 11 rows right; smoke on the Benchmark A copy: the wage
  page shows the Source column (laborer 38.38, operator 52.43, truck 42.83), saved; Benchmark A labor **-35.3 %** (expected
  -30 % to -38 %). Commit waits for the quantity table (the pricing builder shares 3 files).
- Pricing items 1 + 3, dump sites and haul cycle (D-1035): a second builder at work.
- Q212 drag auto-scroll speed-up (D-1034): built (`QuantityPanel.tsx`), waits for the app gates after the builders.

## Next
1. Wage core: verify, Benchmark A labor before/after (expected −30 % to −38 %), commit.
2. Pricing items 1+3 verify and commit; then 2, 7, 6.
3. C items left: f5-big first page, earthwork save speed.
4. Wage rest: W3 + W13, W4, W6, W10, W11, W5; W8 when the filings are in.
5. Release run.

## Needs Umer
- Item 5 on Benchmark A: bid −4.7 %; the plan's range (−0.3 % to −4.6 %) assumed item 1 first. All of it is the tax on
  tipping; nothing to fix.
- Mohave: the founder's lines mix the Building WD (laborer 16.00, excavator 24.97, roller 23.62) with heavy/highway
  operator lines; on-road and off-road trucks sit on the Bulldozer line (35.56 + 18.12); 24 lines match no current
  Mohave WD (for example dozer 31.96 + 13.52, grade checker, pipelayer 28.85 + 7.09: likely older mods or another
  county). Rules unchanged, as asked.
