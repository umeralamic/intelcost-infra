# IntelCost — Decisions
_**Rules of engagement.** Every architecture, design and technology call we have made,
logged before it was implemented. What is written here is binding: a decision stands
until a later `D-NN` supersedes it in writing. Re-argue a decision in a new entry,
never in code._

**Board:** [MANAGER.md](MANAGER.md) · **Backlog:** [FEATURES.md](FEATURES.md)

**Entry template** — `D-NN — Title`, newest last, every entry carrying:

| Field | Meaning |
|---|---|
| Date | When the call was made |
| Status | Accepted · Superseded by D-NN · Under Review |
| Area | Architecture · Frontend · Backend · Data model · Auth · Infrastructure · Estimating · Takeoff |
| Context | The situation that forced the call, with numbers where they exist |
| Options considered | A table of Option / Pro / Con. At least two, including the one not taken |
| Decision | Which option, stated in one sentence |
| Consequences | What follows, including accepted risks and what stays open |

---

## D-01 — Split the single Vite SPA into separate deployables

**Date:** 2026-09-03
**Status:** Accepted
**Area:** Architecture

**Context:** Every surface shipped in one Vite bundle talking straight to Postgres.
A visitor reading the pricing page downloaded a bundle built to run a PDF canvas
engine. 143 files called `.from(` directly, so there was no place to put a rule.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep one deployable | No migration cost | Three audiences forced onto one release cadence |
| B — Split into marketing, app, api | Each ships on its own cadence; a rule gets a home | Migration cost, three build pipelines |

**Decision:** Option B. Marketing, app and api become separate deployables.

**Consequences:**
- Marketing left first and now lives in `intelcost-market-next`.
- The app and the api follow as their own repos.
- The dependency rule holds: the two frontends never import each other.

---

## D-02 — Marketing moves to Next.js, statically prerendered

**Date:** 2026-09-07
**Status:** Accepted
**Area:** Frontend

**Context:** Public pages want server rendering for search, which an authenticated
SPA shell actively fights. Marketing imported zero Supabase code already.

**Decision:** Next.js 16 App Router, React 19, Tailwind 4, every marketing route
prerendered `Static`. No session, no database, no Stripe in that repo.

**Consequences:**
- `intelcost-market-next` owns `intelcost.io`. The app owns `app.intelcost.io`.
- Lead capture leaves through one route, `/api/demo-request`, and nowhere else.
- Marketing mirrors prices; the app and Stripe stay the authority.

---

## D-03 — Full break from Supabase: own Postgres, own auth

**Date:** 2026-09-08
**Status:** Accepted
**Area:** Backend, Data model, Auth
**Supersedes the recommendation in** `docs/archive/structure_proposal.md` §4, which
argued for a thin backend keeping Supabase Postgres and its RLS as the gate.

**Context:** `structure.md` recommended Reading A, a thin backend that relocates the
18 edge functions and leaves Postgres plus 576 RLS policies as the authorization
layer. The founder call is Reading B instead: FastAPI owns the data.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Thin backend, keep Supabase PG + Auth + RLS | Weeks not months; realtime and optimistic canvas writes keep working untouched | Authorization stays in SQL, untestable as a unit; vendor stays load-bearing |
| B — Own Postgres, own auth, S3, Celery | One module system, real workers, no edge bundler, authz in testable Python, no vendor lock | Months; every write path rewritten; realtime and presence need a new transport |
| C — Own Postgres, Supabase for auth only | Auth screens untouched | Two systems own identity; realtime still unsolved |

**Decision:** Option B. FastAPI owns Postgres through SQLAlchemy and Alembic, issues
its own JWTs, stores files in S3, and runs background work on Celery.

**Consequences:**
- The 252 migrations and 576 RLS policies are not ported. Authorization is
  re-expressed as a service-layer rule set in Python, which can be exercised directly.
- Supabase Storage buckets migrate to S3 prefixes. The eight buckets are listed in
  `docs/deployment/architecture.md`.
- The four byte-identical `sheet-tiler` clones collapse to one Celery task.
- Realtime and presence lose their direct Postgres channel. This is an open item,
  tracked in `MANAGER.md`, not solved by this decision.
- The legacy `intelcost` repo stays the source of truth for behaviour until each
  surface is ported and verified, then it is retired surface by surface.

---

## D-04 — The app frontend stays Vite + React 18

**Date:** 2026-09-08
**Status:** Accepted
**Area:** Frontend

**Context:** The marketing repo runs Next 16 and React 19. The app carries a PDF
canvas engine, pdf.js, OpenCV and 93 takeoff components written against React 18.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Vite + React 18 | Takeoff canvas lifts as a file move, not a rewrite; pdfjs, opencv and delaunator all stay known-good | Two React versions across the workspace |
| B — Next 16 + React 19 | One stack workspace-wide | Canvas and pdf.js port is real work; SSR buys little behind a session |

**Decision:** Option A. The app is a Vite SPA on React 18.

**Consequences:**
- The workspace carries two frontend stacks on purpose. Both code style guides exist:
  `typescript_react.md` for the app, `typescript_nextjs.md` for marketing.
- The shared design base in `docs/code_style/design.md` is the thing that keeps them
  looking like one product. Tokens are expressed twice, in Tailwind 3 and Tailwind 4
  syntax, from one source of truth.
- No SSR for the app. It is behind a session, so the loss is small.

---

## D-05 — Sibling repos, not a monorepo

**Date:** 2026-09-08
**Status:** Accepted
**Area:** Architecture

**Context:** `structure.md` proposed `apps/` plus `packages/` with a shared
`takeoff-core`. Marketing was instead split as its own sibling repo, and it worked.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Sibling repos | Matches what already shipped; each repo deploys alone; Sentinel applies per repo | Shared code is duplicated or vendored, not imported |
| B — Monorepo `apps/` + `packages/` | One `takeoff-core`, no duplication | Requires folding in two existing repos; the Lovable build question is still open |

**Decision:** Option A. `intelcost-app-react` and `intelcost-app-fastapi` sit beside `intelcost`
and `intelcost-market-next`.

**Consequences:**
- `takeoff-core` is not a published package. It lives inside `intelcost-app-react/src/lib/takeoff`
  and stays free of React and network calls, so it can be extracted later without a rewrite.
- Contracts are kept in sync by hand until the drift hurts. The api generates an OpenAPI
  schema; the app generates its client from it.

---

## D-06 — The lock opens from the inside

**Date:** 2026-09-09
**Status:** Accepted
**Area:** Backend, Takeoff

**Context:** `service.update_item` called `_guard_locked(item)` before it read the
payload, so `PATCH {"is_locked": false}` on a locked item was refused 403. The same
guard sits on `set_override`, `delete_item`, `add_geometry`, `update_geometry` and
`delete_geometry`, and there is no separate unlock route. A locked takeoff item could
therefore never be renamed, edited, deleted **or unlocked**, by anyone, ever. The
refusal message, "Unlock it before changing it", named an action the api did not offer.

Found while building F1-T4-S1 and reported as a finding rather than fixed there, since
that task's working assumption was that the api is fixed. F1-T4-S5 cannot be built as
written without this, so the founder call is to lift it under its own decision.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Apply `is_locked` before the guard | One line | `{"is_locked": false, "name": "x"}` unlocks and edits in one request, so the guard stops being a speed bump |
| B — Exempt an `is_locked`-only payload | Unlocking stays a deliberate, separate act; the guard keeps its meaning for every other field | Two round trips to unlock and then edit |
| C — A separate `POST /item/{uuid}/unlock` route | Explicit | A second write path for one boolean the PATCH already carries |

**Decision:** Option B. When an item is locked, `update_item` accepts exactly one
payload, the one whose only field is `is_locked`. Everything else is still refused.

**Consequences:**
- Lifting a lock is one deliberate call. Unlock, then change, in that order.
- The guard on `set_override`, `delete_item` and the three geometry writes is untouched.
  A locked item still refuses all of them, which is the point of the lock.
- The refusal message is now true: the api offers the unlock it names.
- F1-T4-S5 ships as specced, and F1-T4-S2 can offer Delete disabled-with-reason on a
  locked item knowing the user has a way out of that state.
- This is the one api change inside F1-T4. That task stays a consumer everywhere else.

---

## D-07 — An unverified email address gates nothing

**Date:** 2026-09-09
**Status:** Accepted
**Area:** Backend, Frontend, Auth

**Context:** `User.email_verified_at` has existed since F1-T1-S3 and no line of code
has ever written to it. F10-T1-S6 makes it real, which forces the question the column
has been quietly deferring: what does an unverified address stop a person from doing?

The answer is not free either way. A hard gate at signup buys clean addresses and
pays for them in abandoned trials, and the trial is the whole funnel: the marketing
site's every CTA lands on `/signup` carrying a plan. A trial that dead-ends at an
inbox loses the person who was already convinced. No gate at all buys the smoothest
funnel and pays for it in accounts we cannot reach, which becomes the support
problem later.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Hard gate at signup | Cleanest data. No unreachable accounts. | Highest drop-off, at the exact moment intent is highest. A typo'd address ends the trial rather than delaying it. |
| B — Gate invitations and checkout only | Friction lands only where an unverified address actually costs something: mail sent on your behalf, and money. | Two conditional gates to build and to explain, and neither is reachable in the product yet (F6 is not built). |
| C — No gate, banner only | The trial runs end to end on the first visit. Verification is a nudge, not a wall. | Some accounts stay unreachable for as long as the user ignores the banner. |

**Decision:** Option C. An unverified user signs up, creates a workspace, uploads a
drawing set and runs a full takeoff. A banner asks them to confirm and offers a
resend. Nothing is withheld.

Accepting a workspace invitation is the one exception, and it is not a gate: the
invitation token was delivered to the address, so accepting it proves the address.
`email_verified_at` is set outright on accept, with no second email.

**Consequences:**
- F10-T1-S6 ships `POST /email/verify/send` and `POST /email/verify` and no middleware.
  There is no `require_verified` dependency, and adding one later is a decision, not a
  refactor.
- Registration queues the first verification mail. There is no separate call to trigger
  it and no state where a user has an account but was never asked.
- The banner is the only surface where verification is visible, so it has to carry the
  resend and a plain reason. A banner that asks without saying why gets dismissed.
- Option B is not closed, it is deferred. When F6 lands, verifying before checkout is a
  small addition on top of this, and the invitation exception already sets the pattern
  for "the action itself proved the address."
- Accepted risk: a workspace can be created and used by an address that does not exist.
  The account is reachable only through whoever still holds the session. F7 inherits
  this too, since migrated legacy users arrive with no verification state of ours.

---

## D-08 — Deploy on Lightsail, one instance, the compose file we already have

**Date:** 2026-09-10
**Status:** Accepted
**Area:** Infrastructure, Deployment

**Context:** Nothing is deployed. A commitment has been made to put real estimators on
a real URL inside ten days, and the deploy budget inside that is two days. The
workspace already has `intelcost-infra/docker-compose.yml`, which boots Postgres, Redis, MinIO,
MailHog, api and worker, so a working topology exists and only its backing services
need swapping for real ones.

The workload is twenty comped testers. It is not a scaling problem. It is a setup-time
problem with a hard date.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — ECS Fargate + RDS + ElastiCache + ALB | Managed backups, no host to patch, scales | Roughly $90-120/mo, and a day and a half of VPC, IAM task roles, target groups and task definitions. Spends the whole deploy budget on infrastructure the pilot does not need |
| B — EC2 + Docker Compose | The compose file ports nearly as-is; full control | Roughly $45-60/mo. Egress billed per GB, so the monthly number moves with how hard testers browse sheets |
| C — Lightsail + Docker Compose | Same compose port as B. Fixed monthly price with disk and transfer bundled. Snapshots are a toggle, not a policy | Less flexible to resize. Burstable CPU. Bundled transfer does not cover S3 |

**Decision:** Option C. One Lightsail 4 GB instance runs api, worker, Postgres, Redis
and Caddy from the existing compose topology. S3 stays the file store. SES sends mail.
Caddy terminates TLS for `app.intelcost.io` and `api.intelcost.io` with automatic
Let's Encrypt.

**Consequences:**

- Roughly $25-30/mo against $90-120 for the managed path, and more importantly the
  deploy fits the two days it was given.
- **The instance is sized by PyMuPDF, not by user count.** `render_drawing_file` holds
  the whole PDF in memory and produces roughly 58 MB pixmaps for an ARCH E sheet. Peak
  is 300-400 MB per render. Celery concurrency is pinned to 2, not the CPU-count
  default, which protects both memory and the burst-CPU budget.
- **Bundled transfer does not cover sheet images.** The browser fetches renders straight
  from S3 on presigned URLs, so that egress is billed normally. It is controlled with
  cache headers instead: render keys already carry `v{tile_version}` and the task bumps
  the version on every rerun, so the objects are immutable by construction and safe to
  cache indefinitely. This is the lever, not the hosting choice.
- No CDN. Caddy serves the built SPA directly. Revisit alongside F3 tiling, not before.
- x86, not Graviton, until aarch64 wheel coverage for PyMuPDF on Python 3.14 is
  confirmed. The 20% saving is not worth a day of compiling from source on this
  schedule.
- **Backups are ours now.** No managed snapshots means a nightly `pg_dump` to a separate
  bucket plus Lightsail automatic snapshots, both before any tester uploads real bid
  data.
- Accepted risk: one instance is one point of failure, and Postgres shares a box with
  the worker that spikes to 400 MB. Acceptable for a comped pilot with a known
  audience. Not acceptable once someone is paying.
- Upgrade path, in order: Lightsail managed Postgres first, then EC2 with RDS. Neither
  is a rewrite, because the app talks to Postgres and S3 through configuration.

---

## D-09 — An estimate line item is its own row, not a takeoff item wearing a price

**Date:** 2026-09-10
**Status:** Accepted
**Area:** Data model, Estimating

**Context:** F12 has to let an estimator price a takeoff. The legacy Estimating tab
says "Synced live from Takeoff," which describes the behaviour but not the ownership.
The question underneath it is whether a line item **is** a takeoff item with cost
columns added, or a separate record that points at one.

This gets decided once or it gets re-argued every time the estimate and the takeoff
disagree.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Derived view. Rate columns live on `takeoff_item` | Always in sync by construction. No sync rules, less code | An estimator cannot add a line that was never measured: mobilisation, permits, general conditions, allowances. And it puts money on the measurement table, so the two concerns stop being separable |
| B — Own row, nullable reference to a takeoff item, quantity read through live | Manual lines work. `takeoff_item` stays about measurement. The estimate becomes a document with its own life | Sync rules have to be answered explicitly, especially deletion |
| C — Own row, quantity snapshotted at creation | A submitted bid stops moving under the estimator, which is what a bid wants | Contradicts live sync, and every takeoff correction needs a manual re-pull. Wrong default for a tool where measuring and pricing happen in the same sitting |

**Decision:** Option B. `estimate_line_item` is its own table. `takeoff_item_id` is
nullable. When it is set, quantity is **read through** to the takeoff item's
`effective_quantity` at read time, never copied. When it is null, the line is manual
and its quantity is typed.

**Consequences:**

- Rate, waste factor and extended cost live on the line item and never on
  `takeoff_item`. Measurement and money stay separable, which is what makes the
  takeoff core reusable in a worker (hard rule 2).
- Correcting a measurement updates the estimate with no action from the estimator.
  That is the "synced live" behaviour, and it falls out of read-through rather than
  needing a sync job.
- **A deleted takeoff item orphans its line, it does not delete it.** The foreign key
  is `ondelete="SET NULL"` and the line renders flagged, keeping its rate and its last
  known quantity. Silently losing a priced line because someone deleted a shape is a
  worse failure than showing a stale one, and it is invisible until the bid total is
  wrong.
- Manual lines are a first-class case from day one, not a later addition. An estimate
  with no permits line is not an estimate.
- `effective_quantity` is the single field the estimate reads. Override handling,
  formula results and the measured value are already resolved behind it, so the
  estimating layer never re-implements that precedence.
- Option C is not closed. When bid submission and revisions exist, a submitted estimate
  will need to freeze. That is a snapshot on top of this model, not a replacement for
  it.

---

## D-10 — Multi-estimator realtime editing is required

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Architecture, Takeoff

**Context:** The legacy app ships real-time multi-estimator collaboration: several
estimators work the same sheet at the same time over the Supabase realtime channel.
D-03 removes that channel. The previous board listed "drop multiplayer for v1" as an
option. It is not one.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Ship v1 single-user, add realtime later | Faster first screens | Every write path gets rebuilt when realtime lands. A regression against the live product |
| B — Realtime is a requirement, transport decided before takeoff writes are built | Write paths are built once, on the right transport | The transport decision has to come first |

**Decision:** Option B. Realtime multi-estimator editing is required at parity with
the legacy app. The transport is decided in D-13 before any takeoff write path is built.

**Consequences:**
- Every takeoff write is designed for concurrent editors from the start: version
  guards, echo suppression, presence.
- The legacy `lib/takeoff/realtime` behaviour is the reference.
- Nothing ships to testers with less collaboration than the legacy app has.

---

## D-11 — Ownership and branch

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Architecture

**Context:** The port needs someone who knows every feature of the product. The
infrastructure needs someone who knows AWS and databases.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Split features between two people | Parallel work | Two people on one branch collide; the person without product knowledge misses behaviour |
| B — Umer ports every feature; Abdullah owns infrastructure | Product knowledge drives the port; no branch collisions | Feature work is serial |

**Decision:** Option B. Umer ports every feature (api and app) on `umer-dev`.
Abdullah owns infrastructure, AWS, SES, S3, backups, legacy data migration, and the
promotion of `umer-dev` to `main`.

**Consequences:**
- `umer-dev` carries all feature work. Promotion to `main` is Abdullah's release act.
- The legacy `intelcost` repo is the behaviour reference. `docs/code_style/` governs
  how the new code is written. Legacy structure is not copied.

---

## D-12 — Sheet rendering stays as built

**Date:** 2026-09-24
**Status:** Superseded by D-14
**Area:** Takeoff, Backend

**Context:** The new stack renders pages server-side. The legacy app renders with
pdf.js in the browser. Changing now would stall the port.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep server rendering as built | No rework now | Features that need PDF vector data have no source for it yet |
| B — Switch to pdf.js now | Matches legacy | Rework before any feature ships |

**Decision:** Option A. Rendering stays as currently built. Abdullah updates it later.

**Consequences:**
- Revisit before porting Auto Count, Auto Trace, Find Text, Name from region and
  vector snap. All of them read PDF vector data through pdf.js in the legacy app.

---

## D-13 — Realtime transport: WebSocket on the api, Redis pub/sub fan-out

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Architecture, Backend, Frontend, Takeoff

**Context:** D-10 makes multi-estimator editing a requirement rather than a v1 cut.
D-03 removed the Supabase realtime channel that carried it and put nothing in its
place. `docs/PARITY.md` lists the 13 legacy channels that have to be replaced: 12
`postgres_changes` subscriptions plus one presence channel, `takeoff:${projectId}`,
which is not a data feed at all but an ephemeral soft-lock keyed by (itemId, sheetId).
Every takeoff write path waits on this call, because a write path built for one user
gets rebuilt when concurrency arrives.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A. WebSocket on the FastAPI api, Redis pub/sub fan-out | One system owns authorization, so joining a channel runs the same workspace check a REST call runs. Bidirectional, so presence heartbeats ride the same connection as the events that depend on them. Redis is already in the compose file and on the Lightsail box, so no new service and no new bill. Fan-out through Redis means more than one api process can serve clients without anyone missing events. | We own what a managed service would have handed us: reconnect, heartbeat, backpressure and connection limits. Long-lived connections sit on the same instance as the PyMuPDF renders D-08 sized the box for. |
| B. Server-Sent Events | Plain HTTP, so Caddy and every proxy in between need no upgrade handling. The browser's `EventSource` does reconnect and `Last-Event-ID` for free. The same Redis fan-out sits behind it unchanged. | One direction only. Presence claims and heartbeats would go back over REST, so one feature lives in two transports that can disagree about who holds a lock. HTTP/1.1 caps connections per origin, which bites the estimator with four project tabs open. |
| C. Polling | No transport to build and no connection state to hold. The failure mode is a stale screen, not a silent disconnect, which is the easiest kind of bug to see. | Latency is the interval, and the behaviour being ported is immediate. 13 channels become 13 repeating reads per client against the one Postgres instance D-08 bought. A soft-lock needs a short TTL to be worth anything, so presence is exactly where polling costs most. It approximates parity, it does not reach it. |
| D. Managed service (AWS API Gateway WebSocket, Pusher, Ably) | Someone else owns sockets, fan-out, reconnect and scale. Presence and channel authorization often ship in the box. No long-lived connections on our single instance. | Who may join which project has to be expressed a second time, outside Python, so the authorization rule D-03 just moved into the service layer gets split again. A third party sits in the path of bid content. Per-connection pricing buys headroom 20 comped testers do not need. API Gateway in particular wants a Lambda-shaped connection store, which is a different architecture and not a transport swap. All of it reintroduces the vendor coupling D-03 was for removing. |

**Decision:** Option A. The api serves a WebSocket endpoint and fans events out to
every api process over Redis pub/sub.

**Consequences:**

- **Writes stay REST.** The api owns every write, hard rule 6 in `CLAUDE.md`. The
  socket carries events outward and presence in both directions. No data write travels
  over the socket.
- **Events are published after the write commits.** Once the transaction is committed
  the service publishes an event to Redis. Every api process subscribes and forwards
  it to the clients it holds. Celery workers publish the same way, so job results,
  render done and auto count done, reach the browser without the browser asking.
- **Auth is checked on connect and again on refresh.** The JWT is verified when the
  socket opens and re-checked when the token refreshes, which is the legacy "auth
  priming" case surviving the transport swap. A client may only join channels for
  projects in a workspace it belongs to, the same check `current_workspace` runs.
- **Echo suppression rides on a header.** Each write carries a client-generated write
  token in a header. The event carries that token back out, and the client that sent
  it ignores its own echo. This is the legacy `writeTokens.ts` behaviour kept intact.
- **Conflict safety does not move to the socket.** The existing version guards,
  `geometry_version` among them, stay the source of truth. An event tells a client to
  refresh. An event never overwrites local state.
- **Presence and soft-locks live in Redis.** The legacy (itemId, sheetId) soft-lock is
  a Redis key with a short TTL, held by a heartbeat. That is what stops a second writer
  silently dropping the first writer's markers in a read, modify, write on
  `vertices_json`.
- **Reconnect refetches, it does not replay.** On reconnect the client refetches the
  affected queries. There is no event replay in v1, and adding one later is a decision,
  not a patch.
- **Caddy proxies the upgrade.** WebSocket upgrades pass through on
  `api.intelcost.io`. No extra infrastructure, which is what keeps this inside D-08.
- **Code homes are fixed.** `intelcost-app-fastapi/app/features/realtime/` on the api,
  and `intelcost-app-react/src/core/realtime/` in the app, which is the only module
  that opens the socket, the same rule `core/api` already carries for HTTP.
- **Every later feature that writes carries its own events.** A feature that writes
  emits its events and lists them in its spec. The F8 spec maps each of the 13 legacy
  channels in `docs/PARITY.md` to an event on this transport.

---

## D-14 — Sheet rendering matches the legacy app: pdf.js in the browser

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Takeoff, Frontend, Backend
**Supersedes:** D-12

**Context:** The new stack renders each page to a flat PNG on the server, a Celery
task driving PyMuPDF, and the browser displays that image. The legacy app renders
with pdf.js in the browser, and that choice was made on measurement. Stage G tiling
was shelved at 5.5 s to first paint against 452 ms for pdf.js. Split-source cut the
cold open of a large plan set from roughly 190 s to about 4 s. Sheets render at full
device resolution rather than at whatever raster the server picked. Auto Count, Auto
Trace, Find Text, Name from region and vector snap all read PDF vector and text data
through pdf.js. A PNG has none of it. Parity with the legacy app is the requirement,
so the display path has to be the legacy display path.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep server PNG rendering (D-12) | Nothing to port now, the Celery render path is already built, and the browser stays thin so a weak machine does no decode work. | Gives up the measured 452 ms first paint and full device resolution, and leaves Auto Count, Auto Trace, Find Text, Name from region and vector snap with no source of vector or text data. Each of those would need a second path into the PDF anyway, which is the revisit D-12 itself wrote down. |
| B — pdf.js in the browser as legacy does, server does preparation only | Carries the measured numbers with it: 452 ms first paint, a cold open of about 4 s on large sets with split-source, sheets at full device resolution. Vector and text data sit in the browser, where the five blocked features read them. The code exists in the legacy canvas and pdf modules, so this is a port rather than a design. | Rendering moves back into the frontend, so decode and raster cost lands on the estimator's machine. S3 has to serve PDFs to the browser, which means CORS and range requests. The Celery full-page render built so far stops being the display path. |
| C — Hybrid tiles: server tiles for display, pdf.js alongside for data | Keeps the server render path and still unblocks the five features that need vector and text data. | Two rendering systems that have to agree on geometry, and the tiling measurement already came in at 5.5 s first paint, twelve times pdf.js. It pays for both and reaches the baseline of neither. |

**Decision:** Option B. The browser renders every sheet with pdf.js as the legacy app
does, and the server prepares files instead of rendering them.

**Consequences:**

- **The browser renders every sheet with pdf.js.** The canvas and pdf modules are
  lifted from the legacy app and have to meet the `docs/PARITY.md` section 24
  baselines: cold open, fit tier, full device resolution, zoom range and step rule,
  bitmap caching, and two-stage zoom.
- **The server's job becomes preparation, not rendering.** Store the uploaded PDF in
  S3, split large sets into per-sheet sources on a Celery task, which is split-source,
  and produce thumbnails. Thumbnails may stay server-rendered.
- **The browser fetches PDFs from S3 on presigned URLs.** S3 CORS and range requests
  have to allow it, because pdf.js reads byte ranges rather than whole files. Cache
  headers follow D-08.
- **Vector and text data come from pdf.js in the browser.** That is what unblocks Auto
  Count, Auto Trace, Find Text, Name from region and vector snap.
- **L-09 changes.** The Celery full-page render stops being the display path. F5
  carries the switch.
- **D-08 sizing changes.** The box no longer holds 300-400 MB of renders per page
  view. Flag to Abdullah; whether concurrency or instance size moves is his call.
- **Ownership splits on the line D-11 already draws.** Rendering is product behaviour,
  so Umer ports it in F5. Abdullah owns the S3 CORS and range configuration and the
  infrastructure the split-source worker runs on.

---

## D-15 — The OAuth consent screen is a Lovable platform artifact, not a product feature

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Frontend, Backend

**Context:** Section 1 of the parity checklist carries an OAuth consent screen at
`/.lovable/oauth/consent`. It reads an `authorization_id`, calls the beta
`supabase.auth.oauth` namespace (`getAuthorizationDetails`, `approveAuthorization`,
`denyAuthorization`) and redirects to whatever the authorization server hands back. Its
copy says the client "will be able to read your projects and estimates as you, using
the Intelcost MCP tools". Every part of it was supplied by the platform D-03 removed,
and the route belongs to the tooling the legacy app was built on rather than to the
estimating product. No product surface links to it. Porting the behaviour would mean
building an OAuth 2.0 authorization server in FastAPI: client registration,
authorization codes, PKCE, scopes, consent records, token issuance and revocation. That
is larger than the other twelve F2 subtasks combined, and it would serve a third-party
MCP integration that no decision in this file mentions and no customer has asked for.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Port it under F2 | The parity line closes with the rest of section 1, and nothing is left dangling. | F2 stalls behind an authorization server it has no use for. The largest piece of work in the auth surface would exist to serve a route no customer reaches. |
| B — Carry it as its own feature, specced later | Keeps the door open for a third-party MCP integration without blocking F2. | Reserves a feature slot for a platform artifact nobody has asked for, and leaves a blocked line sitting in section 1 indefinitely, which is the state that made F2 unfinishable in the first place. |
| C — Retire it. Not ported. | The line stops pretending to be product behaviour, section 1 becomes closable, and F2 can finish. If the integration is ever wanted it arrives as its own feature with its own decision, which is what it would need anyway. | We give up a working consent flow that exists in the legacy app today. Anyone relying on the MCP integration loses it at cutover. |

**Decision:** Option C. `/.lovable/oauth/consent` is a Lovable platform artifact, not a
product feature. It is not ported.

**Consequences:**

- **F2-S11 is dropped.** The F2 spec builds twelve subtasks plus the F2-S14
  correction, and F2 can now reach done. It was previously unfinishable by its own
  definition of done.
- **The parity line is retired, not missing.** `docs/PARITY.md` section 1 keeps the
  line struck through and marked retired, with this decision as the reason, so nobody
  re-discovers it as a gap. Section 1 holds 20 in-scope behaviours.
- **No OAuth authorization server in the api.** No client registration, no
  authorization codes, no consent records, no scopes and no token issuance for third
  parties. The api issues sessions for our own frontends and nothing else.
- **`app.intelcost.io` has no equivalent route.** `OAuthConsent.tsx` is not ported.
- **Nothing to migrate in F17.** There are no consent records or registered clients to
  carry across, because the authorization server was the platform's, not ours.
- **This is not a rule against OAuth.** It retires one platform artifact. If a
  third-party or MCP integration is wanted later it arrives as its own feature, with
  its own spec and its own `D-NN`, and this entry is not the obstacle.

---

## D-16 — The bench drives a browser from its own service, not from the app image

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Infrastructure

**Context:** CLAUDE.md's Proving work is done rule says a changed screen is driven in a
real browser before anything is called finished, and the F2 spec writes every subtask's
acceptance criteria as browser steps. Until now that pass was manual. The machine
running this work has Chrome but no Node and no Python on `PATH`, so there is nothing
on the host to drive it from, and the thirteen F2 subtasks each carry four to eight
browser steps. A driver has to live somewhere in the bench.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Install Playwright into the running `app` container by hand | No file changes anywhere; one `npm i` and it works today. | Evaporates on the next `--build`, so it is not reproducible and the next session re-does it. Modifies the image's `package.json` at run time, which is exactly the drift the image was built to prevent. |
| B — Add Playwright to the `app` image's `dev` stage | It is genuinely in the app container, which is where the app's own gates run. | Puts a browser and its system libraries into the image that serves the front end, roughly tripling it, and couples the frontend image to test tooling. The Dockerfile grows a `build` and a `runner` stage in F11, and this is the wrong thing to be carrying into that. |
| C — A `browser` service in `intelcost-infra`, behind a compose profile | Bench-only by construction: it lives in the bench repo, which is the one place CLAUDE.md says testing is conducted. The app image is untouched. Reproducible, because the image and the scripts are committed. Off by default, so `docker compose up -d` is unchanged. | One more service in the compose file, and the driver scripts live a repo away from the screens they drive. |

**Decision:** Option C. A `browser` service in `intelcost-infra`, on the
`browser` profile, running the official Playwright image. `intelcost-app-react` gains
no dependency, no Dockerfile change and no `package.json` change.

**Consequences:**
- `docker compose --profile browser run --rm browser <script>` is how an acceptance
  pass is driven. The default `docker compose up -d` does not start it.
- **The container's `localhost` is remapped to the host.** The app bundle is compiled
  with `VITE_API_URL: http://localhost:8000` (it must be: that is what the *browser*
  resolves), so a browser inside a container would resolve both that and the app
  origin to itself. Chromium is launched with `--host-resolver-rules=MAP localhost
  <host-gateway>`, which makes the containerised browser see exactly what a browser on
  the host sees. Nothing about the app or the api changes to accommodate the driver,
  which is the property that makes the pass worth anything.
- Scripts live in `intelcost-infra/browser/`, one per subtask, named for it.
  They are bench fixtures, not a test suite: CLAUDE.md's "conducted, not written" rule
  stands, and nothing here runs in CI or gates a commit.
- Screenshots are written to `intelcost-infra/browser/shots/`, which is
  `.gitignore`d, and deleted after the pass is reported, per CLAUDE.md.

---

## D-17 — The "Clear cached session" control is dropped

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Frontend

**Context:** Parity section 1 carries a line for a "Clear cached session" control on
the sign-in and sign-up screens, specced as F2-S4. It exists in legacy for one reason:
Supabase wrote `sb-<project>-auth-token` entries into localStorage that could be
unparseable, tokenless, or left behind by a different Supabase project, and a visitor
holding one was wedged on a screen with no way out. `bootstrap.ts` sanitised those
entries at module import and the button was the manual version of the same sweep.

D-03 removed Supabase. The new app stores one key, `intelcost.session`, written by one
function and read by one function, and `getTokens()` already treats an unparseable
value as absent. The failure mode the control was built for cannot arise in the same
way, so the control is a button offering to fix a class of problem that left with the
vendor.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Build F2-S4 as specced | Closes the parity line the way the checklist reads, and hardens `getTokens()` against a half-valid object while we are in there. | Ships a control whose stated purpose no longer exists. A user who presses it and is still stuck has been sent down a path with nothing at the end of it, and the copy on the sign-in screen has to point at it. |
| B — Drop the control, keep the invariant | The screen stops advertising a fix for a vendor's failure mode. The single clearing point, which is the part F8 actually depends on, is untouched. | The parity line does not close by being ported, and section 1 carries a second retired line. If a corrupt-token wedge ever appears from some other cause, there is no user-facing escape hatch and we will be adding one under a new decision. |

**Decision:** Option B. The user-facing control is dropped. F2-S4 is not built.

**Consequences:**
- **The parity line is retired, not missing**, the same treatment D-15 gave the OAuth
  consent line, with this decision as the reason.
- **`clearTokens()` in `core/auth/tokens.ts` stays the single clearing point**, called
  by `signOut`, by the `/api/auth/me` rejection path and by both refresh-failure paths
  in `core/api/client.ts`. This was the real content of F2-S4's forward dependency on
  F8: D-13 re-checks auth when the token refreshes, and F8 closes the socket from that
  one function. Nothing about that changes. Only the button is gone.
- **F2-S3's copy names browser extensions and nothing else.** It previously named a
  stale cached session as a usual cause, which was advice pointing at the dropped
  control.
- **The shape-validation half of F2-S4 is not lost, it is unclaimed.** `getTokens()`
  still returns a parsed object without checking that both tokens are non-empty
  strings, so a half-valid value produces `Authorization: Bearer ` on every request.
  That is a real defect and it is **not** covered by this decision. It is recorded in
  `FEATURES.md` rather than carried by a dropped subtask.
- **This is not a rule against recovery controls.** If a wedge appears that the api
  cannot resolve on its own, a control arrives with its own spec and its own `D-NN`.

---

## D-18 — The signup tier is decided once, recorded on the user, and stamped onto the workspace

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Backend, Data model

**Context:** F2-S5 ports legacy's `trial-gate`. Legacy resolved a billing tier at
signup from the visitor's geo, and `finalizeTrial()` then wrote the tier, country, VPN
flag and trial window **against the new workspace**, because a Supabase signup created
the user and the workspace together.

Ours does not. `POST /api/auth/register` creates a `User` and nothing else; the
workspace is created later, from the onboarding screen, by a separate request that may
come minutes later, from a different network, or never. So the row legacy wrote to does
not exist at the moment the decision is made, and the request that creates it is not
the request that observed the IP.

This matters because the two facts have different owners. **The tier is a property of
the signup** — it is derived from the address and the IP seen at that instant, and it
must not be re-derived later, since a visitor who signed up behind a VPN and then
creates their workspace from an office connection would silently be re-tiered. **The
trial is a property of the workspace**, because that is what F16 enforces against.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Resolve again when the workspace is created | The assignment lands where F16 reads it, with no intermediate state. | The decision moves to the wrong request. Re-resolving is exactly the drift the legacy comment warns about: the advertised trial length and the granted one come from two different observations. A VPN at signup is not detected at workspace creation. |
| B — Create a workspace at registration so there is something to stamp | Matches legacy's shape exactly. | Reverses a product decision nobody asked to reverse. Onboarding exists because a new account names its own workspace, and an auto-created one would have to be named something and then renamed. |
| C — Record the resolution on the user at signup, stamp the workspace from it at creation | The decision happens once, in the request that observed it. F16 still reads a workspace-level trial window. The audit trail says what was seen at signup even after the workspace is renamed or transferred. | Two places hold related facts, and a user who creates a second workspace carries their original signup tier to it. |

**Decision:** Option C. `register` resolves the tier and writes `signup_tier`,
`signup_country`, `signup_vpn` and `signup_trial_days` on the `user` row. Creating a
workspace stamps `billing_tier`, `billing_country`, `signup_vpn`, `trial_started_at`
and `trial_ends_at` onto the `workspace` from that resolution.

**Consequences:**
- **The resolver runs in exactly one place**, `app/features/auth/tier.py`, and is
  called by `register` and by `GET /api/auth/trial-length` (F2-S8) and by nothing else.
  Legacy's warning holds: the advertised length and the granted length may never drift.
- **A second workspace inherits the first one's tier.** Accepted, and it is the
  conservative direction: the alternative re-resolves from whatever network the user
  happens to be on, which is the drift above. If per-workspace tiering is ever wanted,
  it arrives with F16 and its own `D-NN`.
- **A user row now carries billing-shaped columns.** They are a record of what was
  observed at signup, not a thing to enforce against. **F16 enforces against the
  workspace.** Nothing should read `user.signup_tier` to decide what a customer may do.
- **A missing `billing_tier_rule` row yields no trial window rather than a guessed
  one**, matching F2-S8's rule: never state a length we might not honour. The
  workspace is stamped with the tier and country and a null trial window.
- **F17 inherits a mapping job**, not a schema change: legacy trial state lands on the
  workspace columns, and migrated users get a null signup resolution, which is correct
  because we never observed their signup.

---

## D-19 — Disposable mailboxes are refused at every tier

**Date:** 2026-09-24
**Status:** Accepted
**Supersedes:** the tier-3-only rule carried from legacy's `trial-gate`, implemented in
F2-S5 and recorded in that subtask
**Area:** Auth, Backend

**Context:** Legacy ran the blocklist check on every signup but **acted on it only when
the resolved tier was 3**. F2-S5 ported that faithfully, which produced a rule that
reads as a surprise: `someone@mailinator.com` signing up from the United States was
accepted, and the same address from Nigeria was refused. The check that decided it was
the same check; only the country differed.

The legacy rationale was that trial-farming is worth stopping where trials are cheap to
farm, and that a burner from a Tier 1 country is more likely to be a real prospect
being cautious. The cost of that reading is that the product's behaviour toward a
disposable mailbox depends on where the visitor appears to be, which is both hard to
explain to a customer and hard to defend: an address at `mailinator.com` is not a
mailbox anyone receives a trial expiry notice at, wherever it was opened.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep the legacy rule | Bit-for-bit parity with what is live today, and a burner from a Tier 1 country stays a possible lead. | The same address is accepted or refused depending on apparent country, which is not a rule that can be stated to a customer. Trial-farming from a Tier 1 IP is not prevented, and a VPN into a Tier 1 country defeats the block entirely, which is backwards: the anonymised case is the suspicious one. |
| B — Block at every tier | One rule, stated once: we do not accept disposable mailboxes. Independent of geo, so it cannot be defeated by appearing to be somewhere else, and it does not need the geo lookup to have succeeded. | Loses a small number of cautious real prospects who sign up with a burner, at every tier rather than only Tier 3. Diverges from what is live in legacy, so F17's cutover changes behaviour for Tier 1 and Tier 2 visitors. |

**Decision:** Option B. The blocklist is consulted on every signup and refused on every
signup, whatever tier resolved.

**Consequences:**
- **The refusal no longer depends on the tier**, so `refuses_signup` in
  `app/features/auth/tier.py` no longer reads one. The resolver still runs, because the
  tier still decides the trial length and is still recorded (D-18).
- **A geo outage can no longer let a burner through.** Under the old rule a failed geo
  lookup fell back to Tier 1, which meant fail-open on geo was also fail-open on the
  blocklist. The two are now independent, which is the stronger arrangement.
- **Fail-open on the blocklist itself is unchanged and still load-bearing.** If the
  domain lookup cannot run, the signup proceeds. A blocklist outage must never be able
  to stop registrations, and D-19 does not touch that.
- **F2-S5's acceptance criteria change.** The case that read "a burner with no country
  header is accepted, because Tier 1 does not block" is now a refusal, and the spec and
  the browser pass are updated to match.
- **F17 inherits a behaviour change, not just a data move.** Tier 1 and Tier 2 visitors
  using disposable mailboxes are accepted on the legacy app today and will be refused
  after cutover. Nobody loses an existing account: the rule applies at signup only.
- **The blocklist's contents now matter more.** With 36 domains it is a thin list, and
  every entry is now load-bearing at every tier. Growing it is an operator job, not a
  migration, and belongs with the F16 admin surfaces.

---

## D-20 — Nothing outside the transaction starts before the transaction commits

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Architecture, Backend

**Context:** The api commits a request's transaction after the handler returns
(`app/core/routing.py`), which is deliberate and correct: it closes the window where a
client's next request beats the commit, and it stops a 201 describing a row that does
not exist. But every side effect the handler fires along the way is dispatched *before*
that commit, and Celery and SMTP are not in the transaction. So a message can reach a
broker, and a worker can start, while the rows it describes are still uncommitted and
may never commit at all.

Three shapes of this were in the code when F2-S7 went looking.

1. **A worker that loses a race it cannot see.** `complete_upload` calls
   `render_drawing_file.delay(...)` inside the handler. The task opens its own session
   and reads the `DrawingFile` row by uuid. If it wins, it finds nothing and logs "no
   such file or no upload" — a render that never happens, on an upload the customer was
   told succeeded. The docstring above that line already claimed the dispatch happened
   after the commit. It did not.
2. **Mail for something that did not happen.** `register` queues the verification mail
   before the commit. A commit that fails sends a confirmation link for an account that
   was rolled back. Small blast radius, wrong in an obvious way.
3. **Mail that is right only by luck.** `request_password_reset` queues the reset link
   inside the transaction too, and the existing comment reasons that it is safe because
   the task carries the raw token rather than reading it back. That reasoning is sound
   for that one task, and it is exactly the kind of per-site reasoning that stops being
   true the first time someone adds a database read to a worker.

F8 makes this sharper rather than softer: a realtime event announcing a change is a
statement that the change happened, and one published before the commit can be read by
a client that then queries the api and finds nothing.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Leave it, reason per site | No new machinery. Two of the three sites are provably safe today. | The safety is a property of each task's body, not of the call site, so it is invisible at the point where the mistake gets made. It already failed once, with a comment claiming the opposite of what the code did. |
| B — Commit before the handler returns | The dispatch is trivially after the commit, wherever it sits. | Throws away what `TransactionalRoute` bought: a route would have to decide its own commit point, and a failure after it would be half-written work with no rollback. |
| C — Queue side effects on the session, dispatch them after the commit | One rule, enforced in one place, that reads the same at every call site. Nothing dispatches for work that rolled back, because a rollback discards the queue with the session. | A dispatch that fails after a successful commit cannot fail the request, so the effect is at-most-once: a broker outage silently drops a mail. |
| D — A transactional outbox table | At-least-once. The effect is committed with the work, and a relay drains it. | A table, a relay process, delivery bookkeeping and retries. Real work for a system with one broker, one worker and no delivery guarantees promised to anyone yet. |

**Decision:** Option C. **Celery tasks, outbound mail and realtime events are dispatched
after the transaction that justifies them commits, never before.** Side effects are
registered on the session with `app/core/outbox.py`, and `TransactionalRoute` drains the
queue immediately after `session.commit()`.

**Consequences:**
- **The rule is the whole api, not the auth feature.** It holds for anything sent
  outside the transaction: `.delay()`, `mail.queue()`, and the realtime publish F8 adds.
  A service that needs a side effect registers it; it does not fire it.
- **A rollback dispatches nothing**, because the queue lives in `session.info` and dies
  with the session. That is the property being bought, and it is what makes F2-S7's
  "no orphan" true of the mail as well as the row.
- **Workers own the same rule.** A task that writes and then dispatches must commit
  first. `SyncSessionFactory` sessions carry the same `session.info`, so the same
  helper works there; no worker dispatches anything today.
- **At-most-once is accepted, and written down here rather than discovered later.** If
  the broker is unreachable at drain time, the request still succeeds and the effect is
  logged and lost. A password reset that is never delivered is recoverable by asking
  again; a render that is never enqueued is the one that hurts, and F5 owns the sweep
  for files stuck in `uploaded` with no job.
- **Option D stays open.** The escape hatch is that every dispatch now goes through one
  function, so an outbox table replaces the inside of `drain` and nothing else.
- **A dispatch is not a return value.** Anything the response needs must be computed in
  the handler, not in the dispatched effect. This is already true, and the ordering
  makes it obvious rather than incidental.

---

## D-21 — The capability model is ported whole, resolution before editing

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Backend, Frontend, Auth, Data model

**Context:** Legacy runs on nine roles and twenty-five capabilities.
`src/lib/permissions/capabilities.ts` is one map read by both the runtime check
(`usePermissions`) and the Roles & Permissions matrix, so the two cannot drift — the
file says so twice, and forbids restating a permission in the matrix. On top sit a
workspace-defined **custom role** (its own label and capability map, carrying a
built-in base role so server-side rules keep working), a per-workspace **override** of
a built-in working role, and a **disabled** role. Two masks then cap everyone: the paid
plan, and the trial once expired.

The new api has four roles (`owner | admin | member | collaborator`) and no
capabilities. Every gate is `role == "owner" or role == "admin"` — nine sites in
`app/features/workspace/routes.py`, plus `can_write`, plus three in the app. That is
exactly what legacy's own rules forbid in writing, and four roles cannot express
"QA reviews but cannot edit", which is the distinction the takeoff review flow is
built around.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Port the model whole, all at once | Parity in one pass; nothing to revisit | Five tables, a five-stage chain and a 24x9 matrix land together, so the first thing anyone can drive is the last thing built |
| B — Capabilities and nine roles now, custom roles and overrides later | Smallest step that gets the runtime answer right | Ships a matrix that cannot be edited, which is a visible gap against what customers use today, and defers the two tables indefinitely |
| C — Keep four roles, derive capabilities from them | Nothing in the api changes shape | Cannot express the QA roles; every member gets re-tiered later |
| D — Port the model whole, sequenced: resolution first, editing second | Full parity, and the resolution every later feature depends on is correct and driven before any editing surface exists. Each half is drivable on its own. | Two passes over the same feature, and the matrix is read-only between them |

**Decision:** Option D. F3 ships the nine roles, the twenty-five capabilities and one
shared map read by both the runtime check and the matrix, then custom roles and
per-workspace overrides — in that order, all inside F3.

**Consequences:**
- **The map is written once per repo and checked equal.** The api enforces; the app
  repeats it for UX only, the arrangement `features/workspace/roles.ts` already uses for
  role names. A bench step compares the two, because "kept in sync by hand" (D-05) is a
  promise that needs a check.
- **Resolution lands first, and lands whole.** The chain is role default, then workspace
  override, then custom role, then the plan mask, then the trial mask, built with all
  five stages from the start. The two stages whose tables come later resolve to "no
  row", so adding the tables fills a hole rather than reshaping the chain.
- **Every existing `owner`/`admin` gate is replaced by a capability check** in the same
  pass, api and app. A role test surviving in a component is a bug after this, not a
  style preference, and the bench pass greps for it.
- **`WorkspaceRole` grows from four values to nine.** `member` maps to `estimator`,
  which is the role that measures and prices; `owner`, `admin` and `collaborator` keep
  their meaning. Existing rows migrate; `viewer`, `takeoff`, `pricing`, `qa_takeoff` and
  `qa_pricing` are new and held by nobody until someone is assigned one.
- **An absent key in a saved map is not a denial.** It is a map written before that
  capability existed, so it falls back to the role default. An explicit `false` still
  wins. This is legacy's `capabilitiesFromMap`, and it is why a capability shipped next
  month is not silently revoked for every workspace that ever saved an override.
- **Forbidden capabilities are forbidden in the database too.** `canTransferOwnership`,
  `canManageBilling` and `canGrantOwnerRole` are stripped from any custom or overridden
  map by the service and by a constraint, as legacy does with a trigger. A rule enforced
  only in the service is a rule one hand-written request gets past.
- **The plan mask reads `pro` until F16 exists.** The stage is in the chain and its
  input is a constant, so F16 supplies a value rather than adding a stage.
- **The count was wrong, and the number is twenty-five.** `PARITY.md` §3 said
  twenty-four; `NO_CAPABILITIES` in the legacy source has 25 keys. The heading was
  counted instead of the file. Corrected in PARITY, in the F3 spec and above.
- **Legacy administers only 22 of its own 25.** Its `CAPABILITY_GROUPS` omits
  `canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates`, so three
  capabilities are enforced and unadministrable there. Ours lists all twenty-five, and
  F3-S5 asserts it: a capability the runtime honours and the matrix cannot reach is a
  permission nobody can change.
- **Accepted risk: the matrix is read-only between the two halves.** Nobody is using it
  yet, and the alternative is building the editing surface against a resolution that has
  never been driven.

---

## D-22 — Every capability map derives a base role, including a read-only one

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Backend, Data model

**Context:** Legacy's `deriveBaseRole(caps)` picks the built-in role a custom role most
closely matches, and that value is written to `user_roles.role`, where every
server-side rule reads it. It returns `admin` when the map administers, then
`estimator`, `takeoff`, `pricing` — and then falls off the end of the function. A
custom role granting neither takeoff nor pricing nor administration (a reviewer, a
commenter, a read-only auditor: three of legacy's own nine roles have exactly that
shape) returns `undefined`, and `undefined` is written as the member's role. The
function's docstring says it "must never over-grant"; it says nothing about granting
nothing, which is what it does.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Port it as written | Bit-for-bit parity, including with whatever legacy data F17 migrates | Ports a defect into a column every authorization rule reads. A null role is not "no permissions", it is "no answer", and the chain's behaviour on it is undefined |
| B — Return `viewer` for a map that grants neither | Total: every map yields a valid role. `viewer` is the conservative floor (read-only, no comments, no uploads), so a mis-derived role under-grants rather than over-grants | Diverges from legacy, so a migrated custom role may land on `viewer` where legacy left it null |
| C — Refuse to save a map with no derivable base role | The bad state never exists | Refuses three of legacy's own nine role shapes, so it is not a fix, it is a narrower product |

**Decision:** Option B. `derive_base_role` is total and returns `viewer` when the map
grants neither administration, takeoff nor pricing.

**Consequences:**
- **The return type is the role, not an optional role**, so the type system carries the
  guarantee rather than a comment. `mypy` refuses the fall-through that produced the bug.
- **The floor is `viewer`, deliberately.** A capability map granting only review or only
  comments still resolves its capabilities from its own map; the base role is the
  server-side fallback, and the fallback under-granting is the safe direction.
- **F17 inherits a mapping rule**, not a defect: a legacy member whose `user_roles.role`
  is null migrates to `viewer`, and that note belongs in F17's spec.
- The fix is recorded in the F3 spec against the subtask that ports the function, so
  nobody reading legacy side by side thinks ours drifted by accident.

---

## D-23 — Platform admin is resolved in the permission layer, as a capability gate

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Backend, Frontend

**Context:** `User.is_platform_admin` has existed as a column since the first migration
and nothing reads it except `require_platform_admin`, which nothing depends on. Legacy
resolves it through an `is_platform_admin` RPC inside `usePermissions`, keeps it
strictly separate from `isWorkspaceAdmin`, and forbids the name `isAdmin` in code
precisely because the two get conflated. A platform admin also **bypasses the plan and
trial masks**, so a customer's billing state cannot lock our own staff out of a
workspace they are supporting.

The question F3 forces is whether the concept exists in the new product at all, since
the screens that would use it (F16's admin panel, the Starter Pack and Library admin
powers in F10) are not built.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Defer it to F16 with the admin screens | Nothing built before it is needed | The permission layer gets built twice: once now without it, once when F16 adds a stage to the mask chain and a second kind of "admin" to every screen that already has one |
| B — Resolve it now in the permission layer; screens come later | The distinction exists from the first line of the capability layer, which is the one place it can be enforced. F16 and F10 hang screens off an answer that is already correct and already driven | Ships a resolved value with one consumer (the route guard) until F16 |

**Decision:** Option B. Platform admin is our internal team, it exists, and it is
resolved in the same permission layer as everything else — as a capability gate, never
as a role.

**Consequences:**
- **`is_platform_admin` is never a `WorkspaceRole` value and never widens one.** It is
  resolved alongside the role and returned beside the capability map. Nothing maps it to
  `admin`, and no screen gates a customer feature on it.
- **A platform admin bypasses the plan and trial masks**, as legacy does, and nothing
  else. The role map still applies: staff supporting a workspace see it as the role they
  hold there.
- **`isWorkspaceAdmin` and `isPlatformAdmin` are two values with no third.** The name
  `isAdmin` appears in neither repo.
- **Internal routes render the ordinary 404**, never a redirect and never a "you do not
  have access" page, so internal tooling is indistinguishable from a wrong URL. The
  guard ships in F3; the screens behind it are F16.
- **F10's Starter Pack and Library admin powers and F16's admin panel use this check.**
  Neither invents its own.
- Accepted: one consumer until F16. That is the cost of not building the mask chain
  twice.

---

## D-24 — An invite link is shown once at creation; a new link is a deliberate act that kills the old one

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Backend, Frontend

**Context:** PARITY §2 lists "copy the invite link" as ported. It is not, and it cannot
be as the api stands: `create_invitation` stores `token_hash` and returns the raw token
exactly once, to the caller that created it. There is nothing to copy afterwards because
there is nothing stored to copy. Three ways out: show it at creation only, store the raw
token so it can be re-read, or re-mint on demand. Storing it defeats hashing — one
database read would hand over every live invitation.

The failure worth naming is the silent one: a "copy link" button that quietly re-mints
hands the admin a working link while the link they mailed the invitee an hour ago stops
working, and neither of them is told.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Copy at creation only | Honest and free. The token is already in hand at that moment | An admin who closes the dialog has no way back to the link, and resend is the only path left |
| B — Store the raw token | "Copy link" works at any time, exactly as the parity line reads | Every live invitation becomes readable from one table. A hashed token that is also stored in the clear is not hashed |
| C — Re-mint on demand, silently | The button always works | The previously mailed link dies without a word to anyone. Two people then hold links and one of them is dead |
| D — Copy at creation, plus an explicit "Get new link" that warns first | Both moments are covered, and the one that invalidates says so before it acts | Two controls to build and to explain |

**Decision:** Option D. The link is shown once, at creation, with a Copy control. A
separate **"Get new link"** action states that the previous link stops working, and
re-mints only after that is confirmed.

**Consequences:**
- **The raw token is never stored.** `token_hash` stays the only persisted form, and
  option B is closed rather than deferred.
- **Re-minting invalidates.** "Get new link" replaces `token_hash`, and the old link
  gets the same refusal an unknown token does. It does not send mail; mailing is what
  **Resend** is for, and the two stay separate actions with separate effects.
- **The parity line changes from ported to partial**, and ticks when F3 ships both
  controls. Invite, resend and revoke were already driven in F2-S2.
- **The warning is a confirmation before the act, not a toast after it**, because
  afterwards there is nothing to undo.
- Accepted: an admin who dismisses the creation dialog and does not want to invalidate
  has only Resend. That is the right answer — Resend mails a fresh link to the invited
  address, which is where it was supposed to go.

---

## D-25 — Three capabilities are shown in the matrix and locked against editing

**Date:** 2026-09-24
**Status:** Accepted
**Area:** Auth, Frontend, Backend

**Context:** D-21 settled that the matrix shows every capability, because legacy's own
matrix reaches only 22 of its 25 — `canManageWorkspace`, `canGrantOwnerRole` and
`canEditEstimates` appear in no group there, so three permissions are enforced and
administrable from nowhere. Showing all twenty-five fixes that. It also creates a
question legacy never had to answer: three of them must not become editable just
because they became visible.

`canGrantOwnerRole` is the sharp one. Ownership is transferred, never handed out
(F3-S9), and a workspace that could grant "may grant owner" to a role of its own
invention would have routed around that rule without touching it. `canManageBilling`
and `canTransferOwnership` are already in `FORBIDDEN_CAPS` for the same reason;
`canGrantOwnerRole` is the third and was already there. `canManageWorkspace` is what
makes a role administrative at all, and `canEditEstimates` is the legacy umbrella whose
meaning is held by the call sites that read it rather than by anything a workspace
knows — retuning either per workspace changes what words mean, not what a role may do.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Hide the three, as legacy does | No new behaviour; the matrix is what customers know | Three permissions the runtime honours and no screen can reach, which is the defect D-21 set out to fix. An admin looking for "why can they change settings" finds nothing |
| B — Show all twenty-five, all editable | One rule, no exceptions to explain | A custom role could grant itself `canGrantOwnerRole` and hand out ownership. The ownership rule would still be written down and no longer true |
| C — Show all twenty-five; three render locked with a reason | The matrix is complete, so every enforced permission is accounted for on screen, and the three that cannot move say why rather than being silently inert | Two kinds of cell, and the difference has to be explained in the UI rather than assumed |

**Decision:** Option C. All twenty-five capabilities appear in the matrix.
`canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates` render **read-only**,
with a short reason, and cannot be granted or removed by a custom role or a
per-workspace override.

**Consequences:**
- **`LOCKED_CAPS` is `canManageWorkspace`, `canGrantOwnerRole` and `canEditEstimates`**,
  and it is enforced in the same place `FORBIDDEN_CAPS` already is: stripped from any
  stored map by the service, and refused at the database. A locked cell that is only
  locked in the browser is a decoration.
- **`FORBIDDEN_CAPS` and `LOCKED_CAPS` overlap and are not the same thing.**
  `canTransferOwnership`, `canManageBilling` and `canGrantOwnerRole` are *forbidden*:
  forced to false in any stored map, so a role that claims them holds nothing.
  `canManageWorkspace` and `canEditEstimates` are *locked*: they keep whatever the
  built-in role grants and a stored map cannot move them either way. Forbidden is
  "never true here"; locked is "not yours to change".
- **A custom role can never grant ownership**, by three independent means: the
  capability is owner-only in `ROLE_TO_CAPS`, it is stripped from every stored map, and
  the cell does not accept a click. A browser step proves the third and a hand-written
  request proves the first two, because hiding is not a gate.
- **The reason is on the cell, not in a footnote.** "Only the owner grants ownership,
  through a transfer" and "this is what makes a role administrative" are short enough
  to sit where the question is asked.
- **The locked set is a list, not a rule**, so it is reviewed when a capability is
  added rather than derived from something that might stop being true.

---

## D-26 — Project writes gate on the capability named for them, not `canEditTakeoff`

**Date:** 2026-09-25
**Status:** Accepted · amended by D-29 (pricing can create projects)
**Area:** Backend, Frontend, Auth

**Context:** Every project, folder and drawing write in the api rides `WriteWorkspace`,
which is `require_capability(canEditTakeoff)`. That was the right mechanical replacement
for the old `role is not collaborator` test in F3-S3, and it is the wrong capability for
most of what it now guards:

- A `pricing` member cannot upload a spec PDF.
- A `takeoff` member can move a project to Trash.
- Three capabilities the matrix administers are read by nothing: `canCreateProjects`,
  `canUploadDocuments` and `canRestoreDeletedItems`. An admin who grants or removes them
  changes nothing.

Legacy's own gates are no better model:

- The dashboard's Trash button is `isOwner`, which is a role test.
- The folder browser checks owner or admin.
- The `soft_delete_project` RPC allows estimator.
- `project_assignees` RLS allows owner and estimator, but not admin.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep `canEditTakeoff` on everything | No change | Three administered capabilities stay inert, and the gate says "measure" where the act is "upload a document" |
| B — Port legacy's gates as written | Parity to the letter | Ports a role test, and an RLS bug that locks admins out of assigning |
| C — One named capability per act | Every capability the matrix shows does what its label says, and the refusal names the right thing | Some roles gain or lose an act against legacy, which has to be written down |
| D — Add a 26th capability, `canDeleteProjects` | Trash gets its own switch | Grows the D-21 model for one control, when an existing capability already means "administers the workspace" |

**Decision:** Option C. Each project act is gated on the capability that names it:

| Act | Capability |
|---|---|
| Create a project; edit its details, location, Plans Dated, scope, notes and attributes; change its status; assign members | `canCreateProjects` |
| Upload files, upload a folder, create a folder | `canUploadDocuments` |
| Rename, move or delete a file or folder | `canCreateProjects` |
| Move a project to Trash | `canManageWorkspace` |
| See Trash, restore, delete permanently | `canRestoreDeletedItems` |
| Manage project statuses and the dashboard tab strip | `canManageWorkspace` |
| Takeoff writes (drawings, sheets, calibration, items) | `canEditTakeoff`, unchanged |
| Read anything in a project | membership |

**Consequences:**
- **Role changes against legacy:**
  - `pricing` can no longer create projects, because its role map never granted
    `canCreateProjects`. It can now upload documents.
  - `collaborator` keeps uploads, which is what the collaborator plan mask exists to
    protect.
  - An `estimator` can no longer move a project to Trash. The legacy RPC allowed it, and
    no legacy screen offered it.
  - An `admin` can now assign members, which legacy's RLS refused.
- `WriteWorkspace` survives for takeoff writes only. The Sheets block on Project Home is a
  takeoff write until F5 replaces it (D-27), so it stays on `canEditTakeoff`.
- The app gates the same controls with `can()`, disabled with the capability phrase, and
  the api refuses a hand-written request. Hiding is never the only gate.

---

## D-27 — One project file model; drawings derive from files; uploads are multipart

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Data model, Backend, Frontend, Takeoff

**Context:** Legacy and the new api keep documents in different shapes, and F4 has to pick
one:

- **Legacy.** Every project document is a `project_files` row inside a `project_folders`
  tree. A takeoff drawing is a separate `drawing_files` row pointing back at the file
  (`project_file_id`), and it is created when takeoff registers it.
- **The new api.** It has a `ProjectFolder` tree that nothing references. It also has a
  `DrawingFile` that is uploaded straight from Project Home and rendered to PNG. That is
  D-12's path, which D-14 retired.

F4 needs somewhere for a spec, a geotech report or a site photo to live.

Separately, the founder call for F4 is any file type and no per-file size limit, with
progress and resume after a dropped connection. A single presigned PUT tops out at 5 GB and
cannot resume.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Put every document in `DrawingFile` | One table | A photo is not a drawing, and every one of them would reach the render path |
| B — `ProjectFile` in folders; `DrawingFile` points at a `ProjectFile` (legacy's shape) | Documents and drawings are different things with a link between them, which is exactly what F5's Add Sheets and the folder-in-use delete guard need | Two tables, and today's direct drawing upload has to be retired by F5 |
| C — Single presigned PUT per file | Already built for drawings and logos | 5 GB ceiling, no resume, and a dropped connection restarts a 2 GB plan set from zero |
| D — S3 multipart, parts presigned by the api, completed by the api | No practical ceiling (10,000 parts), per-part retry, and resume across a reload by re-picking the file | More moving parts: part sizing, listing parts, aborting abandoned uploads |

**Decision:** Options B and D.

- A document uploaded to a project is a `ProjectFile` in a `ProjectFolder`, stored under
  the S3 area `project-file`.
- Every file, at every size, is uploaded by S3 multipart upload. One code path.
- Making a file a takeoff drawing is a separate act in F5, per D-14, and the drawing points
  back at the file.

**Consequences:**
- **One upload path, every size.**
  1. Initiate creates the `ProjectFile` row and the S3 multipart upload, and returns the
     part size.
  2. The browser asks the api for presigned part URLs in batches, PUTs the parts, and
     reports progress by bytes.
  3. The api completes the upload itself from `ListParts`. So the browser never needs the
     `ETag` header exposed by CORS, and never supplies a part list it could get wrong.
- **Part size is computed, not fixed.** It is at least 8 MiB, and large enough that the
  file fits in 10,000 parts. That puts the ceiling at S3's own object limit, 5 TiB.
- **Resume.**
  - A failed part is retried with backoff.
  - Uploads pause while the browser is offline and continue on `online`.
  - After a reload, the browser cannot reopen a file it was not handed again. So the
    dialog lists the project's unfinished uploads and the person re-picks the file. A file
    matching by name and size resumes from the parts S3 already holds.
- **Abandoned uploads are aborted.** A `ProjectFile` still unfinished after 24 hours is
  aborted in S3 and removed by the nightly job. As the backstop, Abdullah adds an
  `AbortIncompleteMultipartUpload` lifecycle rule on the bucket (D-11).
- **No per-file size limit and no type filter.** Total storage per tier (tier 3: 500 MB)
  is F16's, enforced at initiate time once F16 supplies the numbers.
- **F4 never dispatches a render from a file upload.** Today's Sheets block keeps its
  direct `DrawingFile` upload and PNG render unchanged until F5 replaces it. F5 adds Add
  Sheets over `ProjectFile`s and `DrawingFile.project_file_id`. The folder-in-use delete
  guard needs that link, so it is F5's.
- **F17 inherits a mapping:**
  - legacy `project_files` rows become `ProjectFile`s, keeping their folder
  - legacy `project_construction_type` becomes `construction_type`

---

## D-28 — The project map and the geocoder are deferred

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Frontend, Backend

**Context:** PARITY §5 lists a map popover on the project location, and a geocoder that
resolves a US address to city, state, zip and county.

Legacy's geocoder is a Firecrawl web search with an LLM fallback, and it always returns
`lat: null`. So its only caller, "Show Map", can only ever say "Could not locate address."
Porting it faithfully ports a map that has never worked. Doing it properly means choosing a
geocoding provider and a tile provider, which is a vendor decision with its own keys and
costs.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Port legacy as it is | Parity to the letter | Ships a control that never works, plus a scraper and three AI keys |
| B — Build it in F4 on a real provider (US Census geocoder, Google Maps tiles) | The parity line becomes true for the first time | A vendor choice and a bench fake inside a feature that already has 27 subtasks |
| C — Defer: keep the address fields, ship no geocoder and no map in F4 | F4 stays about projects and files, and the provider choice is made on its own | Two §5 lines stay open past F4 |

**Decision:** Option C. F4 ships the address fields in the create dialog, Edit details and
the inline location editor: two lines, city, state, postal code and country. There is no
geocoder and no Show Map.

**Consequences:**
- The map and geocoder become their own backlog item, P-17 in `FEATURES.md` 🗓 Planned,
  and the two §5 lines name it. The provider choice is a decision for that item.
- Nothing in F4 stores coordinates. The item that ships the map adds them.
- Legacy's `geocode_cache` and the `geocode-address` function are not ported.

---

## D-29 — The pricing role can create projects

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Auth, Backend, Frontend
**Amends:** D-26's consequence "`pricing` can no longer create projects", and D-21's role
map for `pricing`

**Context:** D-26 gated project creation on `canCreateProjects`. That capability is
granted by the takeoff bundle, which owner, admin, estimator and takeoff hold. `pricing`
holds only the pricing bundle, as in legacy, so D-26 took project creation away from it.

The founder call, after driving Block A, is that a pricing seat starts projects. In a
subcontractor's office the person who opens the bid package is often the one who prices
it, and waiting on a takeoff seat to create the project is a queue that is not doing
anything.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Leave pricing without it; a workspace grants it by override (F3-S6) | Stays on legacy's map | Every workspace that wants the obvious thing has to find the matrix and do it |
| B — Add `canCreateProjects` to the pricing bundle | One line, in the one map per repo; every role that prices can start the job it prices | Diverges from legacy's pricing map, so F17 must not "restore" it |
| C — Gate creation on `canCreateProjects` OR `canEditPricing` | No role map changes | Two capabilities answering one question, which is exactly what D-21 exists to prevent |

**Decision:** Option B. `canCreateProjects` joins the pricing bundle, in both copies of the
map (`capabilities.py` and `capabilities.ts`), so `pricing` can create projects.

**Consequences:**
- **Only `pricing` changes.** Owner, admin and estimator already hold `canCreateProjects`
  through the takeoff bundle. `qa_pricing` does not take the pricing bundle and is
  unchanged.
- **`canCreateProjects` also gates editing a project's details, its status and its
  assignees (D-26).** So `pricing` now does those too. That is intended: they are the same
  seat's job.
- **Existing workspace overrides still win.** They are sparse, so a workspace that
  explicitly set `canCreateProjects: false` for pricing keeps that. A workspace that never
  touched it now reads true.
- **The roles without project creation are now:** `qa_takeoff`, `qa_pricing`,
  `collaborator` and `viewer`. F4 fixtures that need a seat refused creation use
  `qa_pricing`.
- **F17:** legacy pricing members gain the capability on migration. That is the intended
  outcome, not drift.

---

## D-30 — The bench worker restarts on code change, and a fixture proves it is current

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Infra, Backend

**Context:** The api reloads on every code change (`uvicorn --reload`). The Celery worker
did not. It imports the code once at start and keeps it until someone restarts it. On
the bench it ran pre-F3 code for most of F3 and F4: drawing renders failed on
`logo_url`, and nothing said so until a Block C fixture needed a rendered sheet. A README
line saying "restart the worker" is a rule that depends on memory.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep the README note | Nothing to build | It already failed once, silently, for weeks |
| B — `watchmedo auto-restart` (watchdog) | The usual tool | A new dependency, and a lock refresh, for the bench alone |
| C — The `watchfiles` CLI, which the image already has through `uvicorn[standard]` | No new dependency. The same watcher the api's `--reload` uses | Also present in production, though nothing there runs it |

**Decision:** Option C, in the bench's compose file only. The worker runs under
`watchfiles`, which restarts it when a `.py` file under `app/` changes. Polling is forced,
because a bind mount from a Windows host may deliver no filesystem events (the same trap
`DEV_WATCH_POLL` answers for Vite).

To prove it, each process computes a fingerprint when it starts: a sha256 over the path
and content of every `.py` file under `app/`. `GET /health/code` returns the fingerprint
of the files on disk now, the api's and the worker's (the worker's comes from a Celery
task). The route is registered only when `ENVIRONMENT` is `local`. The bench fixture
`browser/bench-code.mjs` fails when the three do not match.

**Consequences:**
- **Production is unchanged.** Its image and its worker command are untouched, and
  `/health/code` does not exist there. Deployments replace the worker, so this problem
  does not arise.
- **A restart can drop an in-flight task.** Tasks are `acks_late` with
  `reject_on_worker_lost` and idempotent, so it is redelivered.
- **The README's "restart the worker" line is replaced by this.** A model change still
  needs a migration, and the api runs those on start.

---

## D-31 — The dashboard shows projects only; New project is the one way to start one

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Frontend, Backend
**Supersedes:** legacy's dashboard panel order (F4-S6) and "New from folder" (F4-S8)

**Context:** Legacy's dashboard stacked the projects under a branding nudge and three
team columns (Team members, Pending invitations, Invite teammates), and offered a second
way to start a project, "New from folder". F4 Block C ported all of it. Each of those
panels repeats a screen Settings already has: members and invitations live in
Settings > Members, branding in Settings > General. Two create paths that seed
differently (New project seeds Plans, Specs, Reports and Site Photos; New from folder
seeded nothing) is two answers to one question. A folder can already be uploaded into a
project with Upload folder, which keeps its tree (F4-S17).

**Decision (the founder's):**
- The dashboard shows projects only. The Team members, Pending invitations and Invite
  teammates panels and the "Brand your bid proposals" nudge are removed. The subtitle
  reads "Your projects."
- New project is the one way to start a project. "New from folder" and its dialog are
  removed. A folder goes into a project through the file browser's Upload folder.
- **The api behind New from folder goes where nothing else uses it.** The folder
  find-or-create by path (`POST …/folder/ensure`) stays, because Upload folder uses it.
  The create's `seed_folders` switch existed only so New from folder could skip the
  seeds; it is removed, and every project is created with its four seed folders.

**Consequences:**
- PARITY §4's panel-order line and its two New from folder lines close as superseded by
  this decision rather than ported. Their fixtures (`f4-s6`, `f4-s8`) are rewritten to
  prove the absence, and the create's Retry is still proved by `f4-s7`.
- Fixtures that made seedless projects through the api now get the seed folders, and
  count them.
