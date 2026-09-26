# The bench

A Docker Compose clone of the whole IntelCost system, with ephemeral data and fakes
for every external service. This is where testing is **conducted**, not written.

A system you cannot stand up is a system you cannot test, and bugs live in the seams
between parts, not in the lines. Reading the code misses them; running it confesses
them.

Two files. `docker-compose.yml` is the whole system. `docker-compose.dev.yml` is the
same thing without the api, for when you run the api from your IDE.

`drives/` holds the few passes that are not browser passes, plus the bench setup they
need. `f3-s13-flag.py` rolls the matrix-editing flag out to one workspace by name,
because rolling a feature out is an operator act and F16 owns the admin surface for it;
the flag stays off globally so a fresh workspace has the surface switched off, which is
what makes the capability-versus-flag separation drivable at all. `f3-s13-bundle.sh`
greps the production bundle, from the host, because `dist/` lives in the app image.

The rest are drives for rules the api enforces with no route to reach them — a resolution
stage whose table arrives in a later subtask, say. They run against the real module in
the api container rather than being left unproven or faked through a screen that does not
exist.

    docker compose exec -T api sh -lc "cd /srv && python drives/f3-s2-resolution.py"

`workspace/` is not part of the bench. It is the **versioned mirror** of the four
workspace files and `docs/`, which sit at the workspace root outside every repo and so
have no git history of their own. The root copies are the ones anybody edits; this is
the copy that survives a lost laptop. CLAUDE.md carries the rule that keeps the two
equal: a session that changes a workspace file refreshes this mirror and commits it
before it ends.

## Boot

```bash
docker compose up -d --build
docker compose ps                 # everything healthy?
curl localhost:8000/health        # checks Postgres, Redis and S3, not just itself
```

Migrations run automatically when the api container starts, so a fresh bench is a
working bench.

## Boot without the api

`docker-compose.dev.yml` is the same stack with the api left out, for when you run
uvicorn from PyCharm with a debugger attached.

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

That gives you Postgres, Redis, MinIO, MailHog, the Celery worker and the frontend.
Nothing answers on 8000 until you start the api yourself.

Both files bind the same host ports, so only one can run at a time. Stop the other
first: `docker compose down` before `-f docker-compose.dev.yml up`, and the reverse.

### The PyCharm run configuration

Module `uvicorn`, parameters `app.main:app --reload --port 8000`, working directory
`intelcost-api`. Everything below goes in the run configuration's environment, or in
`intelcost-api/.env`. These are host addresses, not the container names the compose
file uses, and the ports are the published ones: 5433 and 6380, not 5432 and 6379.

```
ENVIRONMENT=local
DEBUG=true
DATABASE_URL=postgresql+asyncpg://intelcost:intelcost@localhost:5433/intelcost
REDIS_URL=redis://localhost:6380/0
JWT_SECRET=bench-only-secret-not-for-anything-real
S3_ENDPOINT_URL=http://localhost:9000
S3_PUBLIC_ENDPOINT_URL=http://localhost:9000
S3_BUCKET=intelcost-local
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
SMTP_HOST=localhost
SMTP_PORT=1025
APP_URL=http://localhost:5173
```

`JWT_SECRET` has to match the worker's, or a token the api signs is one the worker
cannot read.

**Run the migrations yourself.** On the full bench the api container runs `alembic
upgrade head` on start. Here nothing does, so a fresh stack has an empty database
until you run it:

```bash
cd ../intelcost-api && alembic upgrade head
```

The worker still runs as a container, bind-mounting `intelcost-api/app`, so your code
changes reach it. A breakpoint inside a task will not hit, and a change to
`pyproject.toml` needs `docker compose -f docker-compose.dev.yml up -d --build worker`.
To debug a task, stop that container and run Celery from PyCharm too:

```bash
docker compose -f docker-compose.dev.yml stop worker
celery -A app.worker.celery_app.celery_app worker --loglevel=info
```

## Seed it

A bench with no data in it is ten minutes of clicking before you reach the thing you
came to test. One command instead:

```bash
docker compose exec -T api sh -lc "cd /srv && python scripts/seed.py --storage-host host.docker.internal:9000"
```

Since F5-S9 the seed goes the way a person does: the PDF is uploaded into the project's
Plans folder through the multipart path, loaded into takeoff through `/drawing/load`, and
prepared by the worker. `--storage-host` is for running it inside the api container, where
the presigned `localhost:9000` is not MinIO; the part is sent there with the signed Host
kept. `--reset` seeds a fresh timestamped account instead of the seeded one.

Then sign in at http://localhost:5173 with:

| | |
|---|---|
| email | `estimator@bench.intelcost.io` |
| password | `bench-password-1` |
| workspace | Bench Construction |
| project | Riverside Medical Center |
| sheets | 2, page 1 calibrated at 100 ft, page 2 **left unscaled on purpose** |

The seed drives the **real HTTP api**, exactly as the browser does, rather than writing
rows into Postgres. A script that inserts rows can seed a state the api would never
produce, and then the bench lies. Driving the real path also makes the seed its own
smoke test: if signup, upload or render is broken, this fails loudly.

Page 1's scale bar is drawn at a known span and calibrated from it, so `feet_per_norm`
is exactly **200.0000**. A 0.2 x 0.2 normalised square then reads 1,600.00 SF exactly,
which makes a wrong quantity obvious instead of arguable.

Re-running is safe: it signs in rather than failing on the duplicate user, and skips
the upload rather than piling up sheets. `--reset` seeds a fresh timestamped user.

**Keep the seeded account and Bench Construction clean** (the founder, 2026-09-26; the
seeded account's switcher once held 860 fixture workspaces).

- **A fixture never makes a workspace as estimator@bench.intelcost.io.** It makes them as
  its own throwaway account, `fixtureOwner()` in `browser/lib/bench.mjs`
  (`fx.<fixture>.<stamp>@bench.intelcost.io`, one per run), through `ownWorkspace`,
  `freshWorkspace` (`lib/f4.mjs`) or `shippedWorkspace`. A phased fixture's runner names
  the account once (`FX_OWNER`) for every pass. A fixture that edits the roles matrix on
  screen runs through `browser/lib/shipped.sh`, which ships the editing flag to its
  workspace first (`f3-s6`, `f3-s7`, `f3-s13`).
- **`regress.sh` checks and cleans up.** It snapshots the seeded account's workspaces
  first and fails the run if it gained one (`seeded-ws`). At the end it deletes every
  workspace a fixture account or a fixture's seat owns (`fx-cleanup`,
  `drives/bench-workspaces.py purge-fx`: rows by cascade, storage by prefix), then
  `browser/bench-tidy.mjs` removes fixture projects and seats left in Bench Construction
  **by name only** (`<prefix> <13-digit stamp>`, `<tag>-<role>-<stamp>@bench.intelcost.io`),
  never the owner, Riverside, or anything made by hand, and puts Sara W. back to Estimator.
  Run a single fixture through `./regress.sh <name>` and the same happens.
- **The takeoff fixtures measure on a Riverside of their own** (`browser/lib/world.mjs`,
  F5-S9): `riversideWorld()` makes, per run, a workspace of the run's own account with
  "Riverside Medical Center", a two-page PDF uploaded into Plans and loaded through
  `/drawing/load`, both pages prepared, page 1 calibrated as the seed does (200 ft per
  unit), and Sara W. seated as an Estimator. It takes about 25 s. Every F8 fixture, `p19`,
  `f5-s3` and `f5-s9` use it; the F2 and F3 fixtures make their own workspace with
  `ownWorkspace`. No fixture in the regression signs in as the seeded account.
- **`f5-big`** (`browser/f5-big.sh`) opens a 519 MB and a 7 MB PDF through Choose pages.
  `drives/f5-big.py` makes both, plus a portrait page stored with `/Rotate 90`, in a
  throwaway account's project. Every read must carry a `Range` and come back 206
  `application/pdf` with no Content-Disposition, and no request may be for a whole file
  (D-40). Tiles must take the pages' shape. With the reads blocked, the toast must name
  a download manager or extension, and clicking it must fetch nothing. IDM itself can't
  run on the bench.
- **The only exceptions, not in the regression:** `f5-demo.mjs` and `walkthrough-setup.mjs`
  make things for the founder on purpose; `proof-backlog.mjs` reads the seeded Riverside's
  own measurements; `bench-tidy.mjs` is the clean-up of the seeded workspace itself.
- `docker compose exec -T api sh -lc "cd /srv && python drives/bench-workspaces.py report"`
  lists the seeded account's workspaces by kind.

## The frontend

It comes up with everything else. `docker compose up -d` includes it, and
http://localhost:5173 is the app.

Source is bind-mounted, so an edit under `intelcost-app/src` reaches the container and
Vite reloads. `node_modules` is **not** mounted: it lives in the image, so a host
install built for another platform cannot leak in. Changing `package.json` therefore
needs a rebuild:

```bash
docker compose up -d --build app
```

**So does changing any config file outside `src/`**: `tailwind.config.ts`,
`vite.config.ts`, `eslint.config.js`, the `tsconfig*.json` files. They are copied into
the image, not mounted, so an edit to them reaches neither the dev server nor
`npm run build` in the container until the image is rebuilt. It fails silently. A new
Tailwind colour produces no CSS and the class simply does nothing, which is how F4-S3's
status colours first rendered as plain text (2026-09-25). After a config change, rebuild
before driving anything.

Renaming or deleting a file under `src/` can leave the running Vite server resolving
the old path, and the app white-screens. `docker compose restart app` clears it.

**The worker restarts itself on a code change (D-30).** Celery keeps whatever it
imported at start, so for weeks the bench worker ran pre-F3 code and every drawing render
failed quietly in its log (found 2026-09-25, F4-S13). It now runs under `watchfiles`,
which restarts it a few seconds after any `.py` change under `intelcost-app-fastapi/app`,
as `--reload` does for the api. `docker compose logs worker` shows `1 change detected`
and then `ready`. A stack started before this needs one `docker compose up -d worker` to
pick up the new command.

**It is checked automatically.** `GET /health/code` (served only when `ENVIRONMENT` is
`local`) compares the fingerprint of the code on disk with what the api and the worker
started with. Every fixture asks it before its first step, through `run` in
`browser/lib/bench.mjs`, and runs nothing if either is behind, waiting up to 45 s for
a restart already under way. `browser/bench-code.mjs` asks the same question on its own.

**Run a regression with `regress.sh`.** It runs `bench-code` first and stops if it
fails, then every F4 fixture and the F3 ones F4 leans on, or just the ones you name:

```bash
./regress.sh                 # everything but f4-s12, which has three phases
./regress.sh f4-s17 f4-s18   # just these
```

Each fixture's **full** output is kept in `.regress/<name>.log` (git-ignored), and a
failed step prints the whole error with its cause and how long the step ran. This is
deliberate. Once, an f4-s3 failure was reported only through a filtered summary, its
message was lost, and it could not be traced afterwards.

**Two F8 runners change the bench while they run.** `browser/f8-s2.sh` stops the api
for 30 s and then restarts it, with a tab open, to drive the realtime socket's backoff
and its 1012 close. `browser/f8-s3.sh` recreates the api with `ACCESS_TOKEN_MINUTES=2`
to drive re-auth on refresh in minutes rather than an hour, and puts it back on 30 when
it ends, pass or fail. Run nothing else against the bench while either is going. The
realtime fixtures read the socket the way DevTools > Network > WS shows it, through
`browser/lib/realtime.mjs`.

Running it on the host instead still works and is faster to iterate on:

```bash
cd ../intelcost-app && npm run dev     # also http://localhost:5173
```

Only one of the two can hold the port, and the dev server is `strictPort`, so stop the
container first: `docker compose stop app`.

## What runs

| Service | Port | Stands in for | Console |
|---|---|---|---|
| `postgres` | 5433 | The managed database | `psql -h localhost -p 5433 -U intelcost` |
| `redis` | 6380 | The managed broker | `redis-cli -p 6380` |
| `minio` | 9000, 9001 | S3 | http://localhost:9001 (minioadmin / minioadmin) |
| `mailhog` | 1025, 8025 | The mail provider | http://localhost:8025 |
| `api` | 8000 | Itself | http://localhost:8000/docs |
| `worker` | | Itself | `docker compose logs -f worker` |
| `beat` | | The production scheduler | `docker compose logs -f beat` |
| `app` | 5173 | Itself | http://localhost:5173 |
| `api-b` | 8010 | A second api process (F8, `realtime` profile) | http://localhost:8010/docs |
| `app-b` | 5174 | A second window, talking to `api-b` (`realtime` profile) | http://localhost:5174 |

**Two windows, two api processes.** `docker compose --profile realtime up -d` adds
`api-b` and `app-b`. Open http://localhost:5173 in one browser window and
http://localhost:5174 in another: different origins, so each keeps its own sign-in, and
every live update between them has crossed Redis from one api process to the other. The
second estimator for this is `window-b@bench.intelcost.io` ("Sara Williams", password
`bench-password-1`), an estimator in Bench Construction. It is not in the seed: the F8
fixtures seat it through the real invitation path the first time they need it, so on a
fresh bench run one of them (say `./regress.sh f8-s7`) before signing in as it by hand.
`regress.sh` starts the profile itself.

`beat` only enqueues. At 03:00 UTC it queues `purge_trashed_projects` (F4-S27) and the
worker runs it. To run the purge now, without waiting for the night:

```bash
docker compose exec worker celery -A app.worker.celery_app.celery_app call \
  app.worker.tasks.maintenance.purge_trashed_projects                       # for real
docker compose exec worker celery -A app.worker.celery_app.celery_app call \
  app.worker.tasks.maintenance.purge_trashed_projects --kwargs '{"dry_run": true}'
```

Every project it deletes, or would delete, gets a row in `trash_purge_log`.

Postgres is on 5433 and Redis on 6380 so the bench never fights a local install.

## Reset

```bash
docker compose down -v
```

Data is deliberately **not** persisted. A named volume would hide the migration bugs
a customer meets on a fresh install, so getting back to clean is the normal move
rather than a last resort.

## Watching it work

```bash
docker compose logs -f api
docker compose logs -f worker      # rendering, tiling, purge
```

Uploads land in MinIO under `takeoff/{workspace}/{project}/{sheet}/v{n}/`. Open the
console at :9001 to see exactly what the worker wrote.

## The acceptance rule

No row on the board is done because a build went green. It is done when the path runs
here: sign up, create a workspace, upload a drawing set, calibrate a sheet, draw a
measurement, reload, and see the quantity survive.

A stub that returns success is a bug, not proof.

## Known gaps

- **Stripe has no local fake.** Billing is not built anyway.
- **The marketing site is not here.** `intelcost-market-next` has no session, no
  database and no money, so it shares no seam with anything the bench tests. It has a
  production Dockerfile of its own and is added the day a test needs it.
- **The app image is dev only.** Its Dockerfile builds one stage, `dev`, running the
  Vite dev server. Production packaging is F11's work and is deliberately not
  pretended at here.
- **The api container runs on 8000**, while the notes in `../intelcost-api/STATUS.md`
  describe a run on 8001 (uvicorn straight from the venv, against these same backing
  services). Both are valid; the frontend's `VITE_API_URL` decides which one it talks to.
