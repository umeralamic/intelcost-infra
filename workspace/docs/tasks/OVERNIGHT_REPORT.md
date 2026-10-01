# Overnight report (2026-10-01 20:18 to 2026-10-02 11:30 UTC)

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Test project: "Hidden Valley Spec" in
"F5 Block A demo 15:16", as estimator@bench.intelcost.io.

## Progress

| # | Task | Status | Start | End | Duration |
|---|---|---|---|---|---|
| 0 | Test project classification | done: no earlier value recorded; left as CSI (below) | 20:18 | 20:40 | 22 min |
| 1 | Auto Count answers (docs) | done (D-189): spec adopted, PARITY §17 rewritten (42 lines, 1 retired), F13 In Progress | 20:40 | 21:00 | 20 min |
| 2 | EG from another sheet (F18 Blocks A, B, acceptance on C-200) | in progress: 2a already logged (D-188); 2b logged (D-190) | 21:00 | | |
| 3 | SPEC: site stitching | to do | | | |
| 4 | Build Auto Count (F13) A, B, C, D, F, E | to do | | | |
| 5 | Overlay | to do | | | |
| 6 | Auto Trace cache in IndexedDB | to do | | | |
| 7 | Default dialog width 448 px | to do | | | |
| F | Fallback: side-by-side differences | to do | | | |

## Notes as they happen

### Task 0: the test project's classification (20:18 to 20:40)

**Not found as a recorded value; left as CSI.** Read-only search:
- `project.classification_system` for Hidden Valley Spec is `csi` (updated 2026-09-30
  23:52).
- `audit_log` has no project or classification actions (its 18 action kinds are
  workspace-level), and `takeoff_item_event` (80 rows for the project since 2026-09-30
  08:07) has no classification change.
- No item or folder in the project carries a classification today, and there is no
  database dump in `E:\Intelcost-backup` (those hold the workspace files only).

**What the code proves.** The column is never set by project creation or editing in the
app; only filing an item under a node stamps it (`classification/service.py`,
`file_under`), and only when it is empty. Earthwork's Calculate files under
`project.classification_system or "csi"` (`earthwork/lines.py`), and a project locked to
another system refuses a CSI node (409). So before that Calculate the value was either
**empty (no system chosen yet)** or already **CSI**: no other system can have been
overwritten. Which of the two is not recorded anywhere, so it is left as CSI, as the plan
says. If you want it empty again (so the first classified item picks the system), that is one
update; say so.
