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
| `intelcost/` | The legacy all-in-one Vite SPA plus 252 Supabase migrations and 18 edge functions. **Source of truth for behaviour** until each surface is ported. | React 18, Vite 5, Supabase | Live, being retired surface by surface |
| `intelcost-market-next/` | The marketing site. `intelcost.io`. No session, no database, no money. | Next 16, React 19, Tailwind 4 | Built, never deployed |
| `intelcost-app-react/` | The application frontend. `app.intelcost.io`. Everything behind a session. | React 18, Vite 8, Tailwind 3 | Being built |
| `intelcost-app-fastapi/` | The backend. `api.intelcost.io`. Owns the database, the files, the money, the jobs. | FastAPI, Python 3.14, Postgres 18, Celery, S3 | Being built |
| `intelcost-infra/` | The live bench. A Docker Compose clone of the whole system with ephemeral data and fakes for every external service. | Docker Compose | In use |

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

## Git

**`umer-dev` is the only branch we push or pull.** In every repo in the workspace.
`main` is not ours to move.

- **Pull:** `git pull origin umer-dev`. Never pull onto `main`, and never merge
  `origin/main` down into the working branch without asking first.
- **Push:** `git push origin umer-dev`. No other branch, in any repo.
- **Before any commit,** confirm the checked-out branch is `umer-dev`. If it is not,
  switch before committing, not after.
- **Promoting `umer-dev` to `main` is a release.** It is a deliberate, separate act,
  never part of finishing a task.
- **The workspace files are versioned in `intelcost-infra/workspace/`.** The four files
  at the workspace root and `docs/` live outside every repo, so git protects none of
  them. `intelcost-infra/workspace/` is an exact mirror and is the versioned copy; the
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
cd intelcost-app-fastapi && poetry run ruff check . && poetry run mypy app && poetry run pytest -q   # if tests exist
# app
cd intelcost-app-react && npm run lint && npm run typecheck && npm run build
```

Then bring the stack up and drive the changed screen in a real browser, exercising
its loading, empty, error and unauthorized states. Delete every screenshot and
scratch artifact afterwards. Leave nothing stray.

After each subtask, run only the fixtures it touches. Run the full regression once, at
the end of each block, and again at feature close-out.
