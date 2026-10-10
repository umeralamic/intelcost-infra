# CLAUDE.md — IntelCost workspace

Browser-native construction takeoff and estimating for general contractors and
specialty subs. The PlanSwift / Bluebeam / STACK class of tool, in the browser.

Upload a drawing set, calibrate each sheet's scale, measure linear (LF), area (SF)
and count (EA) quantities on the sheets, roll them up by sheet and classification,
and compute earthwork cut and fill from a surface TIN.

---

## Repos

| Repo | What it is | Stack | State |
|---|---|---|---|
| `intelcost/` | The legacy all-in-one Vite SPA plus its Supabase migrations and edge functions. **Source of truth for behaviour** until each surface is ported. **Live legacy is the `UmeralamDEV` branch** (`origin/UmeralamDEV`), not `main` or `umer-dev`: the local checkout tracks it and is read-only (fetch and `git pull` only, never push). | React 18, Vite 5, Supabase | Live, being retired surface by surface |
| `intelcost-market-next/` | The marketing site. `intelcost.io`. No session, no database, no money. | Next 16, React 19, Tailwind 4 | Built, never deployed |
| `intelcost-app-react/` | The application frontend. `app.intelcost.io`. Everything behind a session. | React 18, Vite 8, Tailwind 3 | Being built |
| `intelcost-app-fastapi/` | The backend. `api.intelcost.io`. Owns the database, the files, the money, the jobs. | FastAPI, Python 3.14, Postgres 18, Celery, S3 | Being built |
| `intelcost-infra/` | The live bench. A Docker Compose clone of the whole system with ephemeral data and fakes for every external service except storage, which is the real bench bucket (D-259). | Docker Compose | In use |

Testing is **conducted** on the bench in `intelcost-infra/`, **not written**.

## The three workspace files

| File | Role | Use it for |
|---|---|---|
| [DECISIONS.md](DECISIONS.md) | **Rules of engagement** | Calls already made. Binding until a later `D-NN` supersedes it. Log a decision here **before** implementing it |
| [FEATURES.md](FEATURES.md) | **Backlog** | Every feature: ✅ Live, 🔨 Working, 🗓 Planned. Live rows say where a behaviour lives |
| [MANAGER.md](MANAGER.md) | **Project board** | In Progress, Blocked, Planned. This is what says which feature is under development right now |

Task descriptions live in [docs/tasks/](docs/tasks/), one `<name>_tasks.md` per feature
in flight, and move to [docs/archive/](docs/archive/) when it ships.

## Session start

1. Read `MANAGER.md`. The In Progress table is what is being built right now.
2. Read `FEATURES.md` to place the work in the backlog and find where a behaviour lives.
3. Read `DECISIONS.md` before proposing an architecture change. D-03 and D-05 are
   the two that most often get re-argued by accident.
4. Read the linked `docs/tasks/<name>_tasks.md` spec for the task you are on.
5. Read the repo's own `STATUS.md` before touching it.
6. Before building any new screen, compare it with live legacy:
   [docs/legacy_comparison.md](docs/legacy_comparison.md).

## Code style

| Stack | Guide |
|---|---|
| Cross-cutting, every language | [docs/code_style/house_style.md](docs/code_style/house_style.md) |
| Python / FastAPI (`intelcost-app-fastapi`) | [docs/code_style/python_fastapi.md](docs/code_style/python_fastapi.md) |
| TypeScript / React (`intelcost-app-react`) | [docs/code_style/typescript_react.md](docs/code_style/typescript_react.md) |
| TypeScript / Next (`intelcost-market-next`) | [docs/code_style/typescript_nextjs.md](docs/code_style/typescript_nextjs.md) |
| Visual system, shared by both frontends | [docs/code_style/design.md](docs/code_style/design.md) |

## Hard rules

1. **The dependency rule is one direction.** Marketing never imports from the app.
   The app never imports from marketing. Neither imports from `intelcost/`.
2. **`takeoff-core` takes data in and returns data out.** The modules under
   `src/lib/takeoff/{engine,earthwork,autoCount,subItems,units}` carry zero React
   imports and zero network calls. That is what lets the same math run in the canvas
   and in a Celery worker. Breaking it is not a refactor, it is a regression.
3. **Takeoff invariants, carried over from the legacy README.** One sentinel species
   per count item. `vertices_json` and `shape_meta` stay parallel. Quantities are
   analytic, never sampled. Pairing is not quantity. Any change touching these needs
   a spec, not a patch.
4. **No hard-coded colour or spacing in either frontend.** Tokens are the single
   source. A hex in a component is a bug.
5. **Secrets never reach the browser.** `VITE_*` and `NEXT_PUBLIC_*` ship to the
   client. The service key, the S3 credentials and the Stripe secret live in
   `intelcost-app-fastapi` and nowhere else.
6. **The api owns writes.** After D-03 there is no direct database access from a
   browser. A frontend that needs data calls the api.
7. **No in-place `perl -i` or `sed -i` on a source file.** Edit source with the editor
   tool. In-place rewriting works by writing a temp file and renaming it over the
   original; on Windows that rename can fail while the file is held open, and it has
   already destroyed one file here — both the original and the temp copy were lost, and
   the file had to be rebuilt from the last commit by hand. A whole-file rewrite through
   a heredoc is acceptable. A batch edit across many files is worth the extra calls.
   **Enforced:** a PreToolUse hook (`.claude/settings.json`,
   `.claude/hooks/no-inplace-edit.sh`) blocks any Bash or PowerShell command with an
   in-place `sed` or `perl` flag, and says why.
8. **No test suites, no scripted tests (D-70, D-78).** Do not run `pytest`, a Playwright
   script, the archived fixture suite or any other test runner, and do not write new
   ones. The one check of the feature is a **smoke test through the Playwright MCP**: drive
   it in a real browser by hand, report in one line what was driven and whether it
   passed, and fix a failure before moving on. **Not covered by this rule:** the gates
   (lint, typecheck, build; ruff, mypy) and the **shared quantity table**
   (`intelcost-infra/quantity-table.sh`), which both run after every group or block.
9. **No competitor names in the repo (D-328).** No competitor's name, screenshot, UI text or
   feature name anywhere in the repos or the workspace files: code, comments, DECISIONS,
   specs, task files, commit messages, fixtures, file names. A decision states the
   estimator's need ("an estimator needs to count a symbol across the set"), never "product X
   does this". Never reuse a competitor's wording for a label, a message or a feature. Hits
   found before this rule are listed in the 2026-10-10 overnight report for the founder to
   decide on; they are not changed until then.

## Git

**`umer-dev` is the only branch we push or pull.** In every repo in the workspace, with one
exception: legacy (`intelcost/`) is read from `UmeralamDEV` and never pushed.
`main` is not ours to move.

- **Pull:** `git pull origin umer-dev`. Never pull onto `main`, and never merge
  `origin/main` down into the working branch without asking first.
- **Push:** `git push origin umer-dev`. No other branch, in any repo.
- **Before any commit,** confirm the checked-out branch is `umer-dev`. If it is not,
  switch before committing, not after.
- **Promoting `umer-dev` to `main` is a release.** It is a deliberate, separate act,
  never part of finishing a task.
- **The workspace files are versioned in `intelcost-infra/workspace/`.** The four files
  at the workspace root, `docs/` and `.claude/` (the rule 7 hook) live outside every
  repo, so git protects none of them. `intelcost-infra/workspace/` is an exact mirror and is the versioned copy; the
  root stays the working copy. **Every close-out and every commit that changes a
  workspace file also refreshes `intelcost-infra/workspace/` in the same session and
  commits it.** A mirror refreshed later is a mirror nobody can trust.
- `intelcost-market-next` has an `umer-dev` branch and it is even with `main`: both
  point at Abdullah's commit of 2026-09-07, and nothing of ours has landed there yet.
  Commit to `umer-dev` as everywhere else.

## Task workflow

- **New feature:** add it to the `FEATURES.md` 🗓 Planned table. When it is picked up,
  write `docs/tasks/<name>_tasks.md`, add the `FN` row to `MANAGER.md` under In Progress
  with a two or three line problem to solution story, and move the feature to 🔨 Working.
- **Status moves with reality.** A Planned row that gains a spec moves to In Progress.
  A row waiting on something it cannot resolve moves to Blocked, with the blocker named.
- **Done:** move the spec to `docs/archive/`, drop the `MANAGER.md` row, move the feature
  to the `FEATURES.md` ✅ Live table with its flow, files and spec link.
- **Bug:** find the flow in `FEATURES.md`, note the Repo column, trace it to the file.
- **Decision:** log it in `DECISIONS.md` as the next `D-NN` before implementing it.

## Proving work is done

A green build is not proof a screen renders. Before calling anything finished:

```bash
# api
docker compose -f intelcost-infra/docker-compose.yml up -d
cd intelcost-app-fastapi && poetry run ruff check . && poetry run mypy app
# app
cd intelcost-app-react && npm run lint && npm run typecheck && npm run build
```

Then bring the stack up and drive the changed screen in a real browser, exercising
its loading, empty, error and unauthorized states. Delete every screenshot and
scratch artifact afterwards. Leave nothing stray.

**Development speed mode (D-68, D-70, hard rule 8).** The fixture suite is archived at tag
`fixtures-archive-2026-09-28` and deleted from the tree. Do not write, run or maintain
fixtures, test suites or test scripts. After each block, in this order:

1. **The gates:** lint, typecheck and build in the app; ruff and mypy in the api (above).
2. **The shared quantity table:** `./quantity-table.sh` from `intelcost-infra/` (D-78). It
   is not a test suite: it checks the two engines against each other and against the
   hand-worked answers, in seconds. Report its line; a mismatch is fixed before moving on.
3. **One smoke test through the Playwright MCP:** sign in with a throwaway account (never
   the seeded account), open the screen changed in the session and drive the new
   behaviour. Report it in one line: what it drove, and whether it passed. A failure is
   fixed before moving on. Wait on what the page shows, never on a clock.

Then commit and push the block on `umer-dev`, log its decisions, and tick its PARITY lines.
Each report carries the running list of features changed since the tag
([docs/tasks/SINCE_ARCHIVE.md](docs/tasks/SINCE_ARCHIVE.md)). **A full run restored from
the tag is required before any deploy to testers and before any promotion to `main`**
(restore steps in `intelcost-infra/README.md`, "The fixture suite, archived").

`api-b`, `app-b` and `app-prod` are stopped, not deleted; start them for a check that needs
them.
