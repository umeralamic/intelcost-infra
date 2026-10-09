# Overnight plan, 2026-10-08 01:29 UTC to 11:30 UTC

Brief: the founder's third overnight brief (Steps 0 to 5). Report: [OVERNIGHT_REPORT.md](OVERNIGHT_REPORT.md),
updated after each step. The last run's plan and report are archived as
`docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-07.md`.

## Rules held for every step

- All repos on `umer-dev`. Each step is finished, gated (ruff + mypy; lint + typecheck + build in
  the bench containers; the quantity table), checked in the browser, committed and pushed before
  the next starts. At 11:30 UTC a step in progress is stashed as `overnight-<step>-unfinished`
  and listed in the report. No half-built commit.
- Mail guard on (`MAIL_GUARD=true` on api, worker, beat; checked at the start).
- Founder projects are read only: Hidden Valley Spec, Waxing City, Hidden Valley Spec Building
  Rebid and every project in "Bench Construction Test". They are opened only to copy data out;
  all tests run on throwaway copies (the D-286 sheets: E101 and E200).
- Only processes this run started are stopped, by PID. No AI credits spent.
- Measurements of time and memory: host Chrome (the Playwright MCP, Chrome 155, Intel UHD 630,
  WebGPU adapter present, 12 logical cores), not the bench container.

## Order

| Step | What | Repos | Done when |
|---|---|---|---|
| 0.1 | Browser tool drives host Chrome | — | done at start |
| 0.2 | Sheet bucket CORS (D-259): browser upload from the app on the bench; D-259 resolved in DECISIONS and flows.md; harness workaround dropped | workspace, infra | upload passes in the browser |
| 1.1 | "billed annually" wording (signup subtitle; every other billing surface checked) | app, marketing | gates, page shows it |
| 1.2 | Assembly crews priced at the project's rates (crew makeup only; editor shows "priced at the project's rates"; existing assemblies counted) | api, app | gates, before/after numbers on a throwaway copy, D-entry |
| 1.3 | D-292 allowance approved | workspace | marked |
| 1.4 | Delete the "EW Typo Check" throwaway project | bench data | gone |
| 3 | Auto Count Part 1, accuracy: slider opens at 70 every run; checked set from the run's own score gap (valley cut), lettering never checkable, sensitivity only widens suggestions; Waxing City vector < 5 s; Image memory < 500 MB on "C"; quick wins (Auto mode, Stop, Threads, Essentials wording) | app | the four tests in both modes at 38 % and 70 % on host Chrome, before and after; D-entry |
| 2 | Marketing screenshots a to f + the new earthwork section | marketing, bench data | each shot captured (or why not), redacted, viewed |
| 4 | auto-count-tag-variants shot; production build without ALLOW_PLACEHOLDERS + link check; SCREENSHOT_TODO; MARKETING_REPORT Pass 5 | marketing | build and links pass |
| 5 | Auto Count Part 2, speed (a symmetry on outline, b OpenCV candidate stage, c WASM scorer, d WebGPU), each with identical results | app | only if time remains |

Step 3 goes before Step 2's shots so the long Image runs (minutes each on host Chrome) can run
while marketing work proceeds in parallel where it does not need the same browser. The order of
commits still follows the brief's steps where they touch the same repo.

## Auto Count test bed

- Throwaway workspace with copies of E101 (Hidden Valley Spec Building Rebid) and E200 (Waxing
  City), the same sheets and samples as D-286: E101 office "A" (68), E101 "C" (24 + C/NL 2), E200
  hatched (12) and E200 empty (6).
- Every test at 70 % (the default) and at 38 % (a leftover low setting), Vector and Image; plus a
  Vector sweep at 20/38/50/70/85/95 %.
- A throwaway harness (never committed) drives the panel's own scan in host Chrome and records
  time, checked right / wrong per tag, suggestions, low, and peak JS heap.
