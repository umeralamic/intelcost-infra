# The bench

A Docker Compose clone of the whole IntelCost system, with ephemeral data and fakes
for every external service. This is where testing is **conducted**, not written.

A system you cannot stand up is a system you cannot test, and bugs live in the seams
between parts, not in the lines. Reading the code misses them; running it confesses
them.

Two files. `docker-compose.yml` is the whole system. `docker-compose.dev.yml` is the
same thing without the api, for when you run the api from your IDE.

`drives/` holds the few passes that are not browser passes: a rule enforced in the api
with no route to reach it yet — a resolution stage whose table arrives in a later
subtask — is driven against the real module in the api container rather than left
unproven or faked through a screen that does not exist.

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
cd ../intelcost-api && python scripts/seed.py
```

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
| `app` | 5173 | Itself | http://localhost:5173 |

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
- **Celery beat is configured but not run**, so `purge_trashed_projects` never fires
  here. Add a beat service when that job matters. Known and deliberate: it was never
  part of the bench's task list, and nothing depends on it yet.
- **The marketing site is not here.** `intelcost-market-next` has no session, no
  database and no money, so it shares no seam with anything the bench tests. It has a
  production Dockerfile of its own and is added the day a test needs it.
- **The app image is dev only.** Its Dockerfile builds one stage, `dev`, running the
  Vite dev server. Production packaging is F11's work and is deliberately not
  pretended at here.
- **The api container runs on 8000**, while the notes in `../intelcost-api/STATUS.md`
  describe a run on 8001 (uvicorn straight from the venv, against these same backing
  services). Both are valid; the frontend's `VITE_API_URL` decides which one it talks to.
