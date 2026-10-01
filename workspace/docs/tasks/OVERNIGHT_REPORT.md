# Overnight report (2026-09-30 23:33 to 2026-10-01 11:00 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 1a | F12 Block F, estimate lines and CSI nodes | done (D-142) | 23:33 | 00:00 | 27 min |
| 1b | F12 Block G, Auto Trace (improved, per the addition) | done (D-143) | 00:00 | 00:45 | 45 min |
| 2 | Auto Trace and cut/fill on C-200 | done, cut/fill not computable from C-200 (D-144) | 00:45 | 01:05 | 20 min |
| 3 | Close F12 in speed mode | **built, awaiting your click check**; spec not archived; PARITY §16 46 ticked; board, backlog, mirror, backup `E:\Intelcost-backup\2026-10-01_0105-f12-built` | 01:05 | 01:08 | 3 min |
| 4 | Snap PDF | done (D-145), smoke-tested | 01:08 | 01:19 | 11 min |
| 5 | SPEC: F13 Auto Count draft | in progress | 01:19 | | |
| 6 | F15 Reports, Time Tracking, Shifts | | | | |
| 7 | SPEC: F14 AI tools and Community drafts | | | | |
| F | Fallback: side-by-side differences | | | | |

## Notes as they happen

### Task 2: Auto Trace and cut/fill on C-200 (00:45 to 01:05)

**Auto Trace on C-200, ours against legacy's own code on the same page** (D-143 has the
full table). FG figures are ours vs legacy's FG profile; EG figures are ours vs legacy's EG
profile:

| Measure | FG | EG |
|---|---|---|
| Gaps left at label boxes | 4 vs 29 | 5 vs 38 |
| Crossings among lines through label boxes | 12 vs 236 | 0 vs 387 |
| Repeated points | 0 vs 474 | 0 vs 618 |
| Back-tracks | 0 vs 17 | 0 vs 18 |
| Self-crossings | 0 vs 22 | 0 vs 79 |
| Drawn twice | 3 vs 90 | 0 vs 69 |

- **Elevations from labels:** 20 FG and 3 EG lines; legacy always typed them.
- **Time:** 0.9 s to read, plus 1.8 s in a worker. Legacy took 7.1 s and 13.0 s on the main
  thread.

Driven on C-200: "Adopt 21 labelled" adopted the FG contours at their labels. Five
remaining crossing pairs are curb convergences: they are flagged and no longer
auto-adopted.

**Cut and fill on C-200: not computed.**
- C-200 prints no existing-grade elevations. Every one of its 37 contour labels is boxed on
  a solid FG line; the 195 dashed EG lines carry none, and no other text on the sheet does.
- The EG elevations live on **page 3**, the boundary and topo survey, with 47 labelled EG
  contours (697 to 729). It is drawn at a different scale and placement and would not
  register automatically (D-144).
- Calculate needs EG on the same sheet (Q14). A number built on 15 suggested EG lines
  (14 % of the EG length) would mean nothing next to the engineer's, so none is recorded.
- What would produce it:
  - (a) Type the EG elevations on C-200: about 55 long dashed lines plus fragments, with
    10 already suggested by tie-ins. This is legacy's way.
  - (b) The Idea in D-144: register page 3 to C-200 by two clicked control points and carry
    its labels across.
- What was created on C-200 was removed. Afterwards C-200 has no items, no folders and no
  result row, and the project's earthwork assumptions are back to "never asked".

**The engineer's table against our shrink and swell.** These are quantity-table rows
`bal-c200-engineer` and `bal-c200-as-printed`.
- **The engineer's table:**
  - Excavation 14,263 × 1.15 = 16,402.45, which is loose.
  - Embankment 8,727 × 1.10 = 9,599.7, which is the bank needed to make the fill.
  - "Net 6,803 CY export" is 16,402 − 9,599: a **loose figure minus a bank figure**.
- **Ours, with the engineer's factors in our convention:**
  - Our shrink is bank → compacted, so 1 / 1.10 = 0.909. Swell is 1.15.
  - The surplus is 14,263 − 9,599.7 = **4,663.3 BCY**.
  - It exports as **5,362.8 LCY**, which is 4,663.3 × 1.15.
- **Can we reproduce the engineer's adjusted figures?** Both adjusted figures can be
  reproduced as products (cut × swell, fill ÷ our shrink), but neither is a line we write.
  The net differs by design: ours keeps one measure (bank, then × swell for the truck).
  The engineer's 6,803 overstates the haul by 1,440 CY against loose, or 2,140 CY against
  bank.
- **Danger:** an estimator typing the printed "Shrink factor 1.10" into our field gets the
  opposite meaning (1 BCY → 1.10 CCY) and an export of **7,278.8 LCY**. This is a question
  for you (see Questions).
