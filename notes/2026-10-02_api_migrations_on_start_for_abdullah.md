# The api must run its migrations when it starts

_For Abdullah, from the founder's review of 2026-10-02 (F16a, D-233)._

**The ask:** database migrations run automatically every time the api starts, in every
environment, so an api never serves code ahead of its schema.

## What happened on the bench

While Block D was built (2026-10-02, migration `b4c9e2a71d38`, new columns
`workspace.locked` and `workspace.flags`), the bench api answered 500 on every workspace
request for about three minutes: `column workspace.locked does not exist`.

The cause, on a closer look:

- The bench api **does** migrate on start: its compose `command` is
  `alembic upgrade head && exec uvicorn … --reload`.
- But `--reload` restarts uvicorn alone when a file under `app/` changes. The model
  gained the columns, uvicorn reloaded, and the new code ran against the old schema.
  `alembic upgrade head` only runs when the **container** starts.
- A container restart then applied it (or a manual `alembic upgrade head`, which is what
  cleared it).

So the bench gap is narrow (hot reload during development); the deploy gap below is not.

## What needs doing (the deploy gap)

The api image's `production` stage inherits `CMD ["uvicorn", "app.main:app", …]` from
`base` (`intelcost-app-fastapi/Dockerfile`). **Nothing in the production image runs
`alembic upgrade head`.** A deploy with a new migration would serve the new code against
the old schema until someone migrates by hand.

Options, for you to choose:

| Option | Pro | Con |
|---|---|---|
| A — An entrypoint in the image: `alembic upgrade head && exec uvicorn …` (the bench's command, without `--reload`) | One image does it everywhere; the same line the bench already proves | Two api processes starting together both try to migrate (Alembic takes no lock by itself); fine on one Lightsail instance (D-08), needs a lock or option B when there are several |
| B — A one-shot `migrate` service in the deploy compose that the api `depends_on` with `condition: service_completed_successfully` | Migrations run once per deploy, never twice in parallel | One more service to keep in the deploy file |

Either way, the worker (same image, different command) must not start before the
migration has finished, since it imports the same models.

On the bench, a session that adds a migration should run `alembic upgrade head` in the api
container right after writing it (before editing the models), and check `alembic current`.
