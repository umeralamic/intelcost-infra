# Python / FastAPI — code style

Applies to `intelcost-api`. Reads on top of
[house_style.md](house_style.md), which wins on design philosophy.

**Installed toolchain, 2026-09-08:** Python 3.14.4, PostgreSQL 18.6.
Write for 3.14. Do not reach for pre-3.10 patterns.

---

## Layout

```
intelcost-api/
  app/
    main.py               # app factory, router mounting, middleware. Thin.
    config.py             # one Settings object, pydantic-settings. The only os.environ reader.
    database.py           # engine, session factory, get_session dependency
    core/                 # shared, feature-agnostic
      models.py           # ModelMixin (id, uuid, timestamps), Base
      schemas.py          # BaseSchema, paging envelopes
      security.py         # password hashing, JWT encode/decode
      dependencies.py     # current_user, current_workspace, require_role
      errors.py           # the exception types routes translate to HTTP
      storage.py          # the single S3 surface
      pagination.py
    features/
      auth/               # models.py schemas.py service.py routes.py
      workspace/
      project/
      drawing/            # files, folders, sheets, calibration
      takeoff/            # folders, layers, items, geometries, dimensions
    worker/
      celery_app.py       # the Celery app and its config
      tasks/              # one module per job family
  alembic/
    versions/
  tests/                  # only where a pure function earns one. Live testing happens on the bench.
  pyproject.toml
```

## Rules

1. **A feature folder has exactly four files** until a real sub-concern appears:
   `models.py`, `schemas.py`, `service.py`, `routes.py`. Split into a package only
   along a genuine boundary (`schemas/item.py` plus `schemas/geometry.py`), never
   to chase a line count.
2. **Routes are thin.** Validate, resolve dependencies, make one service call,
   return. No queries, no business rules, no `if` chains in a route.
3. **Services are functions**, not one-method classes. They take a `Session` as the
   first argument and return models or plain data, never a `Response`.
4. **Features never import a sibling's internals.** `takeoff/service.py` may import
   `project.service`, never `project.models` internals it did not go through.
5. **Every model carries `ModelMixin`.** It owns `id` (internal bigint), `uuid`,
   `created_at`, `updated_at`. Never re-declare them.
6. **Public surfaces expose `uuid`, never `id`.** Every path parameter, every
   response field, every foreign key that crosses the wire is a uuid.
7. **Schemas inherit.** `<Entity>Base` holds the shared fields. `Create`, `Read`,
   `Update` extend it. A `Detail` extends `Read`. No copied field lists.
8. **Endpoints are singular** unless the plural is meaningful:
   `/api/takeoff/item`, `/api/project`. A collection is a GET on the singular noun.
9. **No `abc`.** Shared structure is a plain base class, abstract by intent.
   No `ABC`, no `@abstractmethod`, no `Protocol`, no `Generic` ceremony.
10. **`config.py` is the only place that reads the environment.** Everything else
    imports `settings`.

## Multi-tenancy is a service concern now

D-03 removed Row-Level Security. Nothing in the database enforces tenancy any more,
so the discipline moves into Python and has to be absolute.

- Every query that touches a tenant table filters on `workspace_id`. No exceptions.
- The workspace comes from `current_workspace`, resolved from the JWT and the
  membership table, never from a request body or a query parameter.
- A service function that takes a `workspace_id` argument takes it **first**, so a
  missing filter is visible at the call site.
- Anything that crosses tenants (platform admin, the migration script) lives in its
  own module and says so in its name.

## Async, sessions, and the worker

- Routes are `async def`. Database work goes through SQLAlchemy 2.0 async sessions.
- One session per request, provided by the `get_session` dependency. Never open a
  session inside a service.
- Celery tasks are sync and open their own session. A task takes uuids and scalars
  as arguments, never an ORM object and never a session.
- A task is idempotent. It can be retried and it can arrive twice.
- **Nothing outside the transaction is dispatched before it commits (D-20).** Celery
  tasks, mail and realtime events are registered with `core/outbox.after_commit(session,
  ...)`, which `TransactionalRoute` drains straight after the commit. `mail.queue` takes
  the session for this reason. A service never calls `.delay()` itself.

## Errors

Services raise from `core/errors.py` (`NotFound`, `Conflict`, `Forbidden`,
`ValidationFailed`). One exception handler translates those to HTTP. A service never
imports `HTTPException` and never knows a status code.

## Files and S3

`core/storage.py` is the only module that constructs an S3 client. Callers ask it for
a key, a presigned upload, or a presigned download. The bucket name and the prefix
scheme live there and nowhere else.

## Prose

No em dashes in comments, docstrings or messages. Periods, commas, colons or
parentheses. Docstrings say what a thing is for, not what the next line does.
