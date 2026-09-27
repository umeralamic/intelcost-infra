# Overnight plan, 2026-09-26

_The founder's overnight prompt, saved verbatim. After any compaction, re-read
`CLAUDE.md`, this file and `OVERNIGHT_REPORT.md` before continuing._

---

I will be away about 9 hours. Work autonomously and never stop to wait for
me. Work through the tasks in order until all are done.

SETUP
Add the commands you need (docker, docker compose, git, npm, node, python
and poetry inside containers, curl) to allowed permissions in the
workspace .claude/settings.json so prompts never block you. Allow nothing
that deletes outside the repos. Keep the rule 7 hook.
Read CLAUDE.md, MANAGER.md, FEATURES.md, DECISIONS.md (especially D-13,
D-14, D-20, D-27, D-32, D-33), docs/PARITY.md and
docs/tasks/realtime_tasks.md (Blocks A-C and S18 done and pushed). The
bench runs per the infra README (regress.sh, bench-code first, realtime
profile: A on 5173/api, B on 5174/api-b, window-b@bench.intelcost.io is
Sara W.).

TASKS
1. F8 Block D: live in-progress drawing channel (D-33, "Sara W." tag,
   ephemeral, throttled) and the five Collaboration display preferences.
2. F8 Block E: wire the F3 and F4 events precisely (replace the broad
   workspace refetch).
3. F8 Block F: Caddy note for Abdullah, STATUS, PARITY. Full regression,
   close F8 per CLAUDE.md, new dated backup folder.
4. F5 spec only (docs/tasks/takeoff_shell_tasks.md), no code: sheets
   panel; legacy "Perform Takeoff -> Load project files into takeoff (From
   Project Files / Upload drawing) -> Choose pages -> Load N pages", asked
   once per project, then Add Sheets; D-14 rendering (pdf.js in browser,
   split-source, server thumbnails, PARITY section 24 baselines);
   calibration and scale; code splitting; channel 1 events; rendering
   others' live drawing; two-window live check. Questions at the end.
5. Proof backlog: write fixtures that drive PARITY lines marked ported but
   not driven, tick those that pass, record failures as findings. Do not
   change app behaviour.
6. P-19: top bar and Settings tab row overflow on phone width. Fix with a
   browser pass at 375x667 and 1440x900.
7. P-18: route-level code splitting for the existing routes so the main
   bundle shrinks; report sizes before and after; no behaviour change.
8. F6 spec only (item model: dimensions, sub-items, variables, folders,
   layers, classifications, the Collaboration duties in its MANAGER row).
   Questions at the end.
9. Draft docs/flows.md: the 7 cross-system journeys (signup to first
   project, upload to sheet, realtime editing, measurement to price,
   background jobs, invites, trial to paid), a simple diagram each, infra
   steps marked for Abdullah to review.
10. Final full regression, then the morning report.

RULES
- After each task: gates and the fixtures it touches, then commit and push
  to umer-dev with the mirror refreshed. Specs and docs commit too.
- Where you would normally ask me, choose the option most faithful to the
  legacy app and my logged decisions, log it as the next D-NN marked
  "decided overnight, pending founder review", and continue.
- If something fails 3 times, stop that item, write down what you tried,
  move to the next task. Do not loop.
- Never touch main. Never force-push. Never run docker compose down -v or
  delete bench volumes.
- Keep every fixture's full log. Delete screenshots when done.

MORNING REPORT
Write docs/tasks/OVERNIGHT_REPORT.md: a table of tasks with status and
time taken, commits, every overnight decision to review, failures and
findings, click-only checks for me, and the F5 and F6 questions.

---

**Addition, sent mid-session:**

my instructions below in addition to above, dont wait for me to say start after i pasted my last prompt to you. that is also from me

Addition to tonight's plan: save my full overnight prompt verbatim to docs/tasks/OVERNIGHT_PLAN.md now. Keep a progress checklist in docs/tasks/OVERNIGHT_REPORT.md, updated after every task. After any compaction, re-read CLAUDE.md, OVERNIGHT_PLAN.md and OVERNIGHT_REPORT.md before continuing.
