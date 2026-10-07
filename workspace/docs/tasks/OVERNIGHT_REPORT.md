# Overnight report, 2026-10-07 (second run)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 04:37 UTC. Updated after each step. The
previous run's report is in git (`intelcost-infra/workspace/docs/tasks/OVERNIGHT_REPORT.md` at
commit `6049564`).

| Step | State |
|---|---|
| A1 Founder decisions | in progress |
| A2 Essentials read-only Estimating and Wage Calculator | not started |
| A3 Auto Count tag variants, TYP., vector index | not started |
| B1 to B8 Image-mode speed | not started |

## Test bed

Throwaway workspace (account `fx.autocount.*`) with copies of E101 and E200. Ground truth from the
sheets' own text: 68 office "A" tags; 26 "C" tags (24 "C", 2 "C/NL"); E200 12 hatched, 6 empty.

Vector baseline at the start of the run (bench, 70%):

| Test | Time | Matching | Right / wrong | Missed | Unchecked shown |
|---|---|---|---|---|---|
| E101 office | 9.2 s | 3.5 s | 68 / 0 | 0 | 0 |
| E101 "C" | 2.4 s | 2.2 s | 24 / 0 | 2 (the C/NL, at 67) | 2 |
| E200 A (hatched) | 5.4 s | 2.4 s | 12 / 0 | 0 | 0 |
| E200 A1 (empty) | 2.9 s | 2.6 s | 6 / 0 | 0 | 0 |
