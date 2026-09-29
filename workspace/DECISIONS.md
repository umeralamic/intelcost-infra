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
- **Superseded by D-50 (2026-09-27): a deleted item's line is deleted with it.** As
  first decided: **a deleted takeoff item orphans its line, it does not delete it.** The foreign key
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
- **Mapping note, 2026-09-26 (the founder's, at the F8 Block B/C check):** channel 1's
  `takeoff.item.changed` and `takeoff.geometry.changed` are emitted by F8 itself, from
  today's takeoff write paths (F8-S18), rather than waiting for F6 and F7. A window
  hearing one refetches that one item. F5 to F7 keep and extend them; calibration and
  folder events stay F5's and F6's. The rule above is unchanged: a feature that writes
  carries its events.

---

## D-14 — Sheet rendering matches the legacy app: pdf.js in the browser

**Date:** 2026-09-24
**Status:** Accepted; amended by D-41 (pdf.js reads only a sheet's own one-page PDF, never the set)
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

---

## D-32 — Collaboration mode is a workspace setting; Work together is the default

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Architecture, Takeoff, Backend, Frontend
**Amends:** D-13's soft-lock consequence (the lock now applies only in One at a time)

**Context:** Legacy guards one thing: a read, modify, write on a geometry's
`vertices_json` when Resume or Extend appends to an existing run. Two writers on one
(item, sheet) and the second silently drops the first's markers, so legacy blocks the
second estimator from Resume and delete with a presence soft-lock. D-13 carried that lock
over as a Redis key. The F8 spec asked whether it should also be enforced by the api.

The new stack does not have legacy's hazard in the same place: every shape is its own
`takeoff_geometry` row, so two estimators adding shapes to one item insert two rows and
neither can overwrite the other. What can still conflict is two people editing the
**same shape**, and that is already what `geometry_version` exists to refuse. A lock that
stops a whole team working one item protects against a loss the data model no longer
has, and costs every team the concurrency the model now allows.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Legacy's advisory lock, as D-13 had it | Parity | Blocks concurrent work the row-per-shape model makes safe. Advisory, so a hand-written request ignores it |
| B — The same lock, enforced by the api | Closes legacy's race | Still one estimator per item, for every team, always |
| C — A workspace setting with three modes, default Work together | Each team picks. Safe by construction in the default, strict where a team wants it | Three behaviours to build and drive rather than one |

**Decision (the founder's):** Option C. An owner or admin sets the workspace's
collaboration mode in Settings > Collaboration. It is one rule for everyone in the
workspace. Three modes:

- **Work together (default).** Several estimators edit the same item at once. Every
  shape is its own row, so concurrent adds never overwrite. Only a concurrent edit of
  the **same shape** conflicts: `geometry_version` refuses the second write with
  "{name} just changed this shape, showing their version", and that shape refreshes.
  Never a silent loss.
- **Warn me.** Work together, plus a banner, "{name} is also working on this item",
  while someone else has the item in hand.
- **One at a time.** An atomic Redis claim (`SET NX`, a TTL, a heartbeat). Anyone else's
  write to the item gets 409 "{name} is editing this item right now", and the item is
  view-only for them until the claim clears, seconds after the holder's last heartbeat.

There is no "Ask to join" mode.

**Consequences:**
- **The row-per-shape model is now load-bearing.** No write path may read, modify and
  write a whole item's vertices. Anything derived from all of an item's shapes (its
  stored quantity, whether a shape is its last) must be decided on the api under a lock
  on the item row, never from a snapshot or from a client's copy. F8 audits and fixes the
  paths that exist today (F8-S9).
- **The same-shape guard must be atomic.** A version compared in Python and then written
  lets two simultaneous writes both pass. The check is part of the write.
- **A conflict names the person.** The geometry records who last changed it.
- **F7 ports Resume and Extend as new rows**, not as appends to an existing shape's
  vertices, or it reintroduces the hazard this decision retires.
- The `X-Client-Id` header lets the api tell the claim holder's own writes from everyone
  else's, including the same user in another tab.
- PARITY §10's legacy lock line becomes the One at a time mode's line.

---

## D-33 — Live in-progress drawing rides the socket, and is never stored

**Date:** 2026-09-25
**Status:** Accepted
**Area:** Architecture, Takeoff, Frontend
**Amends:** D-13's "no data write travels over the socket" (still true: this is not a write)

**Context:** Legacy shows a colleague's work when it is saved. Between the first click
and the finish, the other estimators see nothing, which is exactly the window in which
two people start measuring the same wall. With Work together as the default (D-32),
seeing each other's work as it happens is what makes concurrency comfortable rather than
merely safe.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Saved shapes only, as legacy | Nothing new | Colleagues collide in the gap between click and finish |
| B — Stream the in-progress shape over the socket, ephemeral | Immediate, no database cost, nothing to clean up | A new frame family on the socket; throttling to design |
| C — Autosave partial shapes as rows | Survives a crash | Every mouse move is a database write, and half-shapes appear in quantities |

**Decision (the founder's):** Option B. While a colleague draws, the others see the
line, area or count growing, in the colleague's colour, with a small name tag beside it.
The stream is ephemeral: over the socket, throttled, never saved and never through the
database. On finish it becomes a normal saved shape through REST. **F8 builds the
channel; F5, F6 and F7 render it on the canvas.**

**Name format, everywhere a collaborator is named on the canvas and in lock or conflict
messages:** first name plus the first letter of the last name and a dot ("Sara W."), or
the first name alone when there is no last name. One function on the api makes it; the
app never re-derives it.

**Per-user display preferences**, in the user's own settings, a "Collaboration" section:
show others' drawing in progress (on, off) · show names (always, on hover, off) · show
others' cursors (on, off) · show others' work (all, only mine, fade others) · colour
others by (person, item colour).

**Consequences:**
- The socket carries three kinds of traffic: events (server to client, after commit),
  presence and claims, and ephemeral drawing and cursors. Only the first is a statement
  about the database.
- Draft and cursor frames fan out through Redis like events, so two windows on two api
  processes see each other, but they are never persisted and never replayed.
- A person's colour is derived from their user uuid, the same on every screen.
- These are new behaviours beyond legacy. PARITY lists them as such.

---

## D-34 — Today's canvas renders colleagues' drafts now, as a lift-out layer F5 keeps

**Date:** 2026-09-26
**Status:** Accepted (decided overnight 2026-09-26; accepted by the founder the same day
after the click check)
**Area:** Takeoff, Frontend

**Context:** D-33 says F8 builds the live drawing channel and F5, F6 and F7 render it.
The founder's Block B/C check listed "live drawing" as a finding: on today's page there
was nothing to see. Built as the spec reads, Block D would again be checkable only in
DevTools' frame list, and the first on-screen look would wait for F5.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Channel only, as the F8 spec reads | Nothing drawn that F5 might redraw | The founder cannot check Block D by clicking; the preferences change nothing visible |
| B — A small `DraftLayer` on today's canvas, built to be lifted into F5's canvas | Block D checkable in two windows; the name tag, colour and three of the five preferences visible now; F5 moves one component rather than writing it | Today's canvas is retired by F5, so the mounting (not the layer) is thrown away |

**Decision:** Option B. `features/takeoff/components/DraftLayer.tsx` draws each
colleague's in-progress shape in their colour (or the item's, per "colour others by"),
with a "Sara W." tag at the pen, honouring "drawing in progress", "names" and "others'
work". Cursors are sent and received but **rendered by F7**, as D-33 says, so the
"cursors" preference has no visible effect until then.

**Consequences:**
- F5's spec takes `DraftLayer` over rather than writing its own.
- The layer reads points in normalised sheet space, the same space every stored vertex
  uses, so it needs no change when pdf.js replaces the PNG.

---

## D-35 — Zoom runs 50% to 4000%, and the sheet is sharp at every level

**Date:** 2026-09-26
**Status:** Accepted (the founder's)
**Area:** Takeoff, Frontend
**Builds on:** D-14 (pdf.js in the browser)

**Context:** Legacy's `zoomLimits.ts` clamps zoom to 25% to 3000%. Today's canvas stops
at 800% and scales a 150 DPI PNG, so it blurs well before that. F5 moves rendering to
pdf.js (D-14), which makes deep zoom a matter of re-rasterising the page, not of
stretching a bitmap.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Legacy's 25% to 3000% | Faithful | 25% is too small to be useful on a sheet; 3000% falls short on dense civil sheets |
| B — 50% to 4000%, sharp throughout | Deeper inspection of small details; no unreadable far-out level | Beyond legacy; the windowed re-raster must hold up at 4000% |

**Decision (the founder's):** Option B. Zoom runs **50% to 4000%**, from one module
every clamp reads (wheel, Fit, the buttons, Find Text jumps). **The sheet renders sharp
at every level up to 4000%:** pdf.js re-rasterises the visible window at the new scale
once the zoom settles; a CSS-scaled bitmap is only ever the interim frame between two
rasters, never the settled picture. Legacy's step rule is kept: +0.25 below 2×, ×1.25
above.

**Consequences:**
- PARITY §24's zoom lines read 50% to 4000%, beyond legacy.
- Above legacy's 2.5× windowing threshold only the visible window is rasterised, so a
  4000% view never allocates a full-page bitmap.
- F5-S10 and S11 prove sharpness at 100%, 400%, 2000% and 4000% on a dpr-2 profile.

---

## D-36 — The founder's answers to the F5 and F6 questions

**Date:** 2026-09-26
**Status:** Accepted (the founder's)
**Area:** Takeoff, Backend, Frontend

**Context:** The F5 and F6 specs were written overnight with nine questions each, and
both features waited on the answers.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Every recommendation as written | The most faithful to legacy and the logged decisions | Keeps legacy's fixed "(2)" suffix, where a third copy reads as a bug |
| B — The recommendations, with duplicates counting up | Each copy has a distinct name | One small step beyond legacy |

**Decision:** Option B: every recommendation accepted, with one change (F6 Q4).

| Spec | # | Answer |
|---|---|---|
| F5 | Q1 | Thumbnails both ways: Choose pages renders in the browser; the sheets panel uses server thumbnails made at preparation. **Amended by D-41:** Choose pages shows server thumbnails too |
| F5 | Q2 | Legacy's rule: "asked once" is the drawing count, so Skip with nothing loaded asks again next time |
| F5 | Q3 | Images are wrapped into a one-page PDF **on the worker**; the original stays the `ProjectFile` |
| F5 | Q4 | The sheet stays in the URL |
| F5 | Q5 | Metric calibration units ported behind a flag, off |
| F5 | Q6 | `drawing.sheet.changed` is added, beyond legacy |
| F5 | Q7 | The "Not in F5" owners as the spec's table proposes |
| F5 | Q8 | The seed is migrated to `/drawing/load`; old bench rows stay unlinked |
| F5 | Q9 | Legacy's skipped-pages-come-back bug is not ported |
| F6 | Q1 | Formulas evaluated in both the browser (preview) and the api (stored), kept equal by one shared table |
| F6 | Q2 | Classification references are foreign keys to `workspace_classification` |
| F6 | Q3 | Variables workspace-wide with a per-project value, as legacy |
| F6 | Q4 | **Duplicates count up: "(2)", "(3)"**, not legacy's fixed "(2)" |
| F6 | Q5 | Item history is F11's |
| F6 | Q6 | `takeoff.layer.changed` and `workspace.variable.changed` are added |
| F6 | Q7 | Layer visibility stays per browser |
| F6 | Q8 | CSI seeds on first use; the other four systems when a workspace first turns them on |
| F6 | Q9 | Rough measurements in F6; Earthwork markups in F12 |

**Consequences:**
- F5 is unblocked. F6 follows F5, whose canvas and sheets panel it sits on.
- The overnight findings are owned: Count adding to the selected item (F7), the zoom
  range (D-35, F5), deducts (F7), layers' show and hide, last-layer protection and
  legacy's three seeded layers (F6), the sheets panel (F5) and classification (F6).

---

## D-37 — A link opens in its own workspace: the app switches, when the person is a member

**Date:** 2026-09-26
**Status:** Accepted (the founder's)
**Area:** Frontend, Backend, Architecture

**Context:** The app keeps one active workspace per browser, chosen in the switcher, and
every workspace-scoped page reads through it. A link to a project, a sheet or anything
inside one carries only the project's uuid. Opened while another workspace is active, it
said "Project not found" to a member who has every right to see it; the founder met this
with the F5 Block A demo.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — The workspace in every URL (`/w/{ws}/project/{p}`) | The link says everything | Every route and link changes; links already shared stop working; the uuid of a workspace in every address |
| B — The api says which workspace a thing is in; the app switches | Links unchanged, old ones keep working; one small endpoint | One extra request, only when the active workspace is the wrong one |
| C — Search every workspace the person is in, from the browser | No api change | One request per workspace; slow with many, and a guess |

**Decision (the founder's):** Option B. `GET /api/resolve/{kind}/{uuid}` answers the
workspace (and project) a `project`, `sheet` or takeoff `item` belongs to, **only to a
member of that workspace**; to anyone else it is the same 404 as a uuid that does not
exist, so it reveals nothing. A workspace-scoped page whose thing is not in the active
workspace asks it, switches the active workspace, and shows the page. "Project not found"
only when the answer is 404: the person truly has no access, or it does not exist.

**Consequences:**
- Every later link-able kind joins the resolver as it is built: estimates (F9), markups
  (F11), assemblies (F10). A new route that takes a uuid names its kind there.
- A switch made this way is the same as the switcher's: the realtime join moves, the
  dashboard and settings follow.
- A trashed project resolves for a member, as today's routes say it is in Trash.

---

## D-38 — Colleagues' drafts draw solid, in the item's colour, by default

**Date:** 2026-09-26
**Status:** Accepted (the founder's)
**Area:** Takeoff, Frontend
**Amends:** D-33 (the Collaboration preferences)

**Context:** D-33 drew a colleague's in-progress line dashed, coloured by the colleague,
and D-34 put it on today's canvas that way. The founder's click check found the dashed
line reads as tentative, and the person's colour tells less than the item being measured.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — As D-33: dashed, the colleague's colour | Nothing to change | A dashed line reads as a guide, not as work; the colour says who but not what |
| B — Solid and the item's colour by default, both choosable | The line looks like the shape it will become; the colour says what is being measured | Two colleagues on one item look alike until the name tag |

**Decision (the founder's):** Option B.
- **A new preference, "Live drawing line": Solid (default) or Dashed.**
- **"Colour others by" defaults to Item colour** (the colour of the item they are
  measuring); the other choice is **Each colleague's own colour**.

**Consequences:**
- The preferences are stored sparse (F8-S14), so a person who never chose keeps the new
  defaults, and one who chose "person" keeps that.
- F5's canvas and F7's tools draw every colleague's draft by these two preferences.
- PARITY's Collaboration line names six preferences, not five.

---

## D-39 — The founder's answers to the F7 questions

**Date:** 2026-09-26
**Status:** Accepted (the founder's)
**Area:** Takeoff, Backend, Frontend

**Context:** F7's spec was drafted beside F5 with nine questions; the founder adopted it
and answered them.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Every draft recommendation | Written | Q4, Q7, Q8 and Q9 left open ends |
| B — The recommendations, with the founder's changes to Q4, Q7, Q8 and Q9 | Settles the edges | P-20 is a new feature row |

**Decision:** Option B.

| # | Answer |
|---|---|
| Q1 | One shape row per count mark |
| Q2 | Deducts as columns (`role`, `owner_geometry_id`) with `ON DELETE CASCADE` on the owner |
| Q3 | Add `shapely` to the api |
| Q4 | Page acts split into **P-20 "Sheet page acts"**, after F7; F7 keeps Crop as New Page |
| Q5 | Inline arcs analytic |
| Q6 | Undo records move, vertex edits, copy, rotate, flip and nudge |
| Q7 | Canvas settings on the user, stored sparse. **Rule for later: rendering and performance settings stay per device** |
| Q8 | Auto-merge merges the merging person's own shapes of that item, from any time, never a colleague's |
| Q9 | Legend, Print and Dimension to F11; unbuilt region-menu rows hidden, not disabled. Dimension is frequently used, so F11 should not slip far |

**Consequences:**
- F7 is on the board after F6; P-20 is in `FEATURES.md` Planned after F7.
- F7 draws colleagues' drafts by D-38's defaults.

---

## D-40 — The browser reads drawings straight from S3, shaped as legacy's reads

**Date:** 2026-09-26
**Status:** Superseded by D-41 (the founder's test: IDM took the ranged reads too)
**Area:** Takeoff, Backend, Frontend, Infra

**Context:** The founder's 429 MB set would not open in Choose pages with IDM on. Two
read paths failed:
- a presigned link answered with `Content-Disposition: inline; filename=…pdf`, which
  pdf.js first asked for whole;
- the api's `…/file/{uuid}/bytes`, 206 `application/octet-stream`.

Legacy, with IDM on, opens the same set. Its request is pdf.js on a Supabase signed URL,
one GET with no `Range`, answered 200 `application/pdf` with no Content-Disposition, the
whole file read (`PdfPageRenderer.ts` `loadPdfFromUrl`). Supabase hides `Accept-Ranges`,
so pdf.js never ranges there.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Exact legacy: one plain GET, whole file | The one shape proven safe with IDM | Downloads the whole set on Choose pages (the 429 MB set once) |
| B — Legacy's headers, ranged: a presigned S3 link answered `application/pdf` with no Content-Disposition, read by 206 ranges | Reads only what pages need; off the api | Not proven with IDM; needs S3 CORS to expose the range headers |
| C — B, falling back to A when the first read fails | Always opens | IDM may pop up on the first read before the fallback |

**Decision:** Option B, built first; if the founder's test shows IDM takes it, switch to A.
No fallback between them. The api's `…/bytes` stays as a manual fallback, for a
deployment whose bucket cannot answer ranged reads to the browser; the app does not use
it.

**Consequences:**
- `GET …/file/{uuid}/read` gives a presigned GET with `ResponseContentType` set
  (`application/pdf` for a PDF) and no `ResponseContentDisposition`. `…/download`, for
  saving a copy, keeps its filename.
- The app reads with only a `Range` header: no token, no header of ours, no credentials.
- **S3 CORS for production (for Abdullah):** on the drawings bucket, allow the app's
  origin, methods `GET` and `HEAD`, request header `Range`, and expose `Content-Range`,
  `Accept-Ranges`, `Content-Length` and `ETag`. The bench's MinIO already does.
- If A is chosen after the test, the read becomes pdf.js on that same link with ranges
  off (`disableRange`); the bucket then needs no exposed headers.

---

## D-41 — The browser never reads a plan set: the worker makes its derivatives

**Date:** 2026-09-26
**Status:** Accepted (the founder's); point 4 amended by D-42 (how the canvas reads a sheet's PDF)
**Area:** Takeoff, Backend, Frontend, Infra
**Supersedes:** D-40
**Amends:** D-14 (what pdf.js reads), D-36 F5 Q1 (Choose pages' thumbnails)

**Context:** With IDM on, the founder's 429 MB set would not open in Choose pages, by any
browser read. IDM took each of them:
- a presigned link with a filename header;
- the api's octet-stream ranges;
- D-40's `application/pdf` ranges with no filename header.

IDM takes range reads whatever the headers. Legacy's one plain GET of the whole file
works with IDM, but costs 429 MB per open.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Legacy's whole-file GET | Proven with IDM | 429 MB per open |
| B — The worker reads the set and makes per-page derivatives; the browser reads only those | The browser never reads a set, so there is nothing for IDM to take; pages show without the set | Choose pages waits on the worker, page by page, for a file never prepared |

**Decision:** Option B.

1. **On upload.** When a PDF's upload completes, the worker makes, per page, its size
   (the crop box), `/Rotate`, the crop box and a WebP thumbnail 512 px across, drawn as
   the page shows (`prepare_file_pages`, `project_file_page`). It reads the set
   server-side, once, into a temporary file.
2. **On Choose pages.** A file with none of this yet, uploaded before D-41, or whose job
   has stalled, is dispatched when Choose pages asks (`GET …/file/{uuid}/pages`). The
   page count comes at once from a ranged read on the server. Results are kept, as rows
   and objects.
3. **What Choose pages shows:** those thumbnails as plain image GETs, each tile in its
   page's shape, rotation applied, with "Preparing pages N of M" while the worker runs.
   pdf.js never opens the set.
4. **The canvas** opens a sheet's own one-page PDF, which the worker splits out on Load
   (Block A). It is one plain GET in legacy's shape: a presigned link answered
   `application/pdf`, with no Content-Disposition, no `Range`, and pdf.js's
   `disableRange` and `disableStream` on.
5. **Removed:** the range reader, `…/file/{uuid}/bytes`, `…/file/{uuid}/read`, and the
   exposed range headers.

**Consequences:**
- A file never prepared shows its thumbnails as the worker makes them. The founder's
  268-page set took 160 s in all on the bench, the first pages within seconds.
- No S3 CORS header needs exposing for reads (D-40's note is void). The bucket still
  needs CORS allowing the app's origin to GET.
- Block C's zoom tiers draw from the sheet's own PDF, read this way.
- A file's thumbnails go when it is deleted; a project's go with its prefix on purge.

---

## D-42 — A sheet's own PDF reaches pdf.js as bytes, served as nothing a download manager knows

**Date:** 2026-09-27
**Status:** Accepted (the founder's)
**Area:** Takeoff, Backend, Frontend
**Amends:** D-41 point 4

**Context:** With IDM on, D-41's thumbnails and tiles passed. But a loaded sheet's own
one-page PDF, read by pdf.js in one plain GET (`application/pdf`, a `.pdf` key, no
Content-Disposition, no Range), made IDM pop up to download it.

Legacy loads the same kind of file:
- the tiler writes `pages/{project_file_id}/{page}.pdf` as `application/pdf`
  (`sheet-tiler/split.ts`);
- the canvas gets a Supabase signed URL for it (`resolveSplitPageUrl`,
  `createSignedUrl`, not `storage.download()`);
- pdf.js gets that URL, `getDocument({ url, withCredentials: false })`
  (`PdfPageRenderer.loadPdfFromUrl`), and makes one GET.

That is the shape D-41 used. The code shows no difference that explains IDM leaving
legacy alone on the founder's machine.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Fetch the bytes, give pdf.js `getDocument({ data })`, same response | The founder's first step | The response still reads as a PDF under a `.pdf` URL, which may be what IDM keys on |
| B — A, and serve the file as `application/vnd.intelcost.sheet` under a key with no extension | Nothing about the request or the answer says PDF; one round of testing instead of two | Sheets split before this need re-keying |

**Decision:** Option B.
- The worker stores each split page at `takeoff/{ws}/{project}/pages/{file}/{page}`
  (no extension) as `application/vnd.intelcost.sheet`.
- The link is presigned with that type and no Content-Disposition.
- The app fetches it in one GET (no Range, no credentials) into bytes, and pdf.js gets
  `getDocument({ data })`, never a URL.
- A sheet split before D-42 (a `.pdf` key) is moved by a copy inside S3
  (`rekey_sheet_source`) the first time its assets are asked for. Until then the canvas
  shows the fit image.

**Consequences:**
- Nothing the browser fetches while measuring is answered as a PDF. Thumbnails and fit
  images are `image/webp`; a sheet is `application/vnd.intelcost.sheet`.
- If IDM still reacts, the remaining difference from legacy is outside the request's
  shape (for example the host, or IDM's own site rules), and the next step is to test
  legacy's exact request against the bench's storage.
- Files' deliberate Download keeps its filename; that is a download.

---

## D-43 — Choose pages' thumbnails run on their own queue and worker

**Date:** 2026-09-27
**Status:** Accepted (the founder's)
**Area:** Backend, Infra

**Context:** A person uploads a set and loads pages at once. On one worker, the Load's
sheets waited behind that set's 268 thumbnails: 52 s and more than 90 s to prepare,
against about 7 s on a quiet bench. The founder: thumbnail generation must never delay a
Load.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — More concurrency on the one worker | One service | Thumbnail jobs can still fill every slot |
| B — Thumbnails (`prepare_file_pages`) on their own `previews` queue and worker, one set at a time, at the lowest CPU priority | A Load never queues behind a thumbnail job | A second worker service to run |

**Decision:** Option B.
- Celery routes `prepare_file_pages` to `previews`; everything else stays on the default
  queue.
- The bench's `worker-previews` runs `nice -n 19 celery … -Q previews --concurrency=1`.
- Two changes found while measuring:
  - the thumbnail job reads the set into memory, as the Load's job does, not through a
    temporary file: on the bench's disk that write took 7 to 10 s and slowed a Load
    running beside it;
  - every worker WebP is encoded with method 2, not 4: 0.25 s against 0.75 s for a
    2048 px fit image, 2% larger.
- The 5-minute sweep also resumes a thumbnail job lost with its worker.

**Consequences:**
- **Measured on the founder's 268-page set** (three pages loaded as soon as Choose pages
  started the thumbnails, with the thumbnail worker busy): the first sheet on screen in
  3.1 to 3.6 s; all three prepared in 6.5 to 6.9 s; drawn by pdf.js in 11.5 to 13 s.
  Before, on one worker: 52 s and more than 90 s.
- **Production needs a second worker process:** `-Q previews --concurrency=1`, niced
  (for Abdullah, D-11).
- The thumbnail worker holds a set in memory while it works, one set at a time.

---

## D-44 — The regression runs in parallel, in two tiers

**Date:** 2026-09-27
**Status:** Accepted (the founder's instruction)
**Area:** Infrastructure

**Context:** Since Block B every takeoff fixture builds its own Riverside (about 25 s),
and `regress.sh` ran all of them one after another, F8's part alone about 25 minutes.
The standing rule ran that full list at the end of every block. Block B's failures were
the fixtures' own, not the product's:
- clicks aimed at a sheet that ran past the window;
- a display name hard-coded for an account no longer used;
- reads made before the page had drawn;
- a fixed grace period after Redis came back;
- one shared window-B account and one shared mailbox that every fixture cleared.

Those are also exactly what breaks when fixtures run side by side.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep one at a time, run the full list less often | Nothing to change | Slow, and fragile fixtures stay fragile |
| B — Fixtures own everything they touch and wait on page state; independent ones run in parallel, the ones that stop a service run alone at the end; a quick tier per block and the full list at close-out | Minutes, not an hour and more; fragility shows up and is fixed at its cause | Parallel load makes timing assertions stricter; a shared helper change affects every fixture |

**Decision:** Option B.
- **Every fixture builds its own world** through the shared helpers (`browser/lib/`):
  - its own owner, seats, and window-B person (`fx.<fixture>-b.<stamp>@`, "Sara
    Williams");
  - its own workspaces;
  - only the mail sent to its own addresses (read, counted and cleared per address).
- **Fixtures wait on real state, never on time:**
  - the switcher showing the workspace and the role in it (`enterWorkspace`);
  - the socket joined to the project topic (`onProjectTopic`);
  - the layout settled (`pageSettled`);
  - sheet points checked to be on screen (`sheetPoint`);
  - display names from the helpers' own names (`A_NAME`, `B_NAME`).
  - The only timed waits are `quietFor`, a window in which something must not happen,
    and gesture pacing.
- **`regress.sh`** runs the parallel group longest first, `REGRESS_JOBS` at a time. Then
  the serial group, one at a time: f8-s2, f8-s3, f8-s5, f8-s8, f8-s12, f5-s2 and f4-s27,
  each of which stops, restarts or recreates a service, or drops the worker's queue.
- **Two tiers.**
  - `./regress.sh quick [names]`: a core smoke set of 16, plus the fixtures a block
    touched. Run at the end of each block.
  - `./regress.sh` (full): every standing fixture, F2 and F3 included. Run at feature
    close-out and overnight.

**Consequences:**
- **Measured (2026-09-27):** the full list, 81 fixtures, went from about 1 h 30 one at a
  time to 57 m 25 s at 3 at a time, all passing. At 4 the host's CPU sat above 90% for 81%
  of the run and two fixtures failed, so 3 is the default. The details are in
  `intelcost-infra/README.md`, "Run a regression".
- One `regress.sh` at a time (a lock), and a healthy bench before each serial fixture:
  two overlapping runs once took each other's data and services.
- A fixture that assumes a shared account, a window size or a mailbox is a bug in the
  fixture.
- The serial group's services are down while it runs, so nothing else may use the bench
  then. That was already the rule for those runners.

---

## D-45 — One preparation job per drawing file, in slices

**Date:** 2026-09-27
**Status:** Accepted (a fault with a cause, found by D-44's first run)
**Area:** Backend

**Context:** The first run after the IDM rounds could not start: the worker did not answer
`/health/code`. Both of its slots were preparing the same file, the founder's "JHS Permit
C 50CD_VOL 4" (280 MB, 242 pages loaded in batches, 52 left). Four faults stacked up:
- **Duplicate jobs.** Every Load dispatches a job for its whole file, and two jobs on one
  file prepare the same pages side by side.
- **One file holds a slot for as long as it takes.** The late pages of this set take 9 to
  14 s each to render under load, so 52 of them outlast the 25-minute soft time limit, and
  nothing else gets that slot meanwhile.
- **A time limit counts as a broken page.** The soft limit is raised inside MuPDF, caught
  as that page's failure, and the job runs on to the hard kill at 30 minutes.
- **Resumed forever.** The sweep then dispatches the file again, from the same page.

A person loading a big set would see a Load that never finishes and a worker that answers
no one else.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — More worker slots, a longer time limit | Nothing to write | Duplicates still double the work, and one big set still fills the slots |
| B — One job per file (a Redis lock), in slices of at most 5 minutes that queue their own continuation; a page the soft limit stops is failed, the job resumes after it | A Load's other files and other people's Loads get a slot between slices; no page is prepared twice; nothing loops | A second dispatch for a file waits for the running slice rather than helping it |

**Decision:** Option B.
- `prepare_drawing_file` takes `prepare:drawing:{file}` in Redis (SET NX, 5-minute TTL,
  renewed after every page) or returns at once: a job already holds that file.
- Between pages it reads the pending list again, so pages a Load adds mid-run are
  included.
- It starts no new page after 5 minutes (`prepare_slice_seconds`). It releases the lock
  and queues its own continuation at the back of the queue.
- If the soft limit stops a page, only that page is marked failed (it alone took most of
  the limit), and a continuation carries on from the next one.
- After releasing the lock it checks once more for pending pages, so a Load that landed in
  that moment is not left to the sweep.

**Consequences:**
- A big set prepares in slices, with other Loads' pages prepared between them.
- The sweep's 10-minute window is longer than the lock's 5 minutes, so a job lost with its
  worker is resumed as before.
- Production (Abdullah, D-11): nothing new to run. The lock uses the Redis the worker
  already has.

---

## D-46 — Draft and cursor frames are limited by rate over time, not per strict second

**Date:** 2026-09-27
**Status:** Accepted (a fault with a cause, found by D-44's parallel runs; amends D-33)
**Area:** Backend

**Context:** f8-s13's under-load step failed only with other fixtures running: B heard
213 of 232 of A's draft frames. The page sent at most 8 a second, never closer than 125 ms
apart. The api counted frames in a sliding one-second window, measured when it processed
each frame. With the api's event loop busy serving other fixtures, a backlog of well-spaced
frames was read in one go, counted as a burst, and every frame over 10 in that window was
dropped. The frames were fine; the clock was the api's, not the sender's.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Raise the limit | One number | A tab could send faster for good; the fault stays, just rarer |
| B — A token bucket: 10 a second sustained, up to 10 at once (`DRAFT_BURST`) | A backlog read at once passes; a tab sending over 10 a second is still cut to 10 | A flood's first 10 frames get through at once |

**Decision:** Option B.
- The same rule for cursor frames.
- The end of a shape is still never dropped.
- The api logs how many frames a shape lost to the rate when it ends.

**Consequences:**
- Drafts are previews, so a short burst after a stall costs nothing.
- A new f8-s13 step floods 40 frames in a second from a hand-written socket. B must hear at
  most the burst plus one second's rate.

---

## D-47 — An unprepared page waits for the worker; it is never read from the set

**Date:** 2026-09-27
**Status:** Accepted (decided overnight; the founder accepted it on 2026-09-27)
**Area:** Takeoff, Frontend
**Amends:** F5-S12 AC2

**Context:** F5-S12's AC2, written before the IDM rounds, says a page not yet prepared
"opens from the whole file by range requests". D-40 tried exactly that, and IDM took the
browser's range reads of the set. D-41 then made the rule that the browser never reads a
plan set: only the worker does.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — As S12 was written: range reads of the set until the page is prepared | The page draws a few seconds sooner on a cold Load | IDM takes it (D-40); breaks D-41 |
| B — D-41's behaviour: "Preparing the sheet" until the worker's split exists, then it draws itself | IDM never sees a plan set; one read path | The first few seconds of a fresh Load show the preparing state |

**Decision:** Option B.
- S12's AC2 reads: before preparation, the page shows "Preparing the sheet" and requests
  nothing of the set.
- When the worker's `drawing.source.changed` arrives, the page draws, fit image first,
  then pdf.js.

**Consequences:**
- The ~4 s target for a loaded sheet's first sharp paint includes the worker's
  preparation of that page (D-43 and D-45 keep it short).

---

## D-48 — Deleting sheets keeps legacy's last-shape rule

**Date:** 2026-09-27
**Status:** Accepted by the founder 2026-09-27, **amended by D-50**: an item deleted here takes its estimate line with it; no last quantity is handed to the estimate
**Area:** Takeoff, Backend
**Serves:** F5-S14 AC3

**Context:** Legacy's panel deleted sheets through its database. A shape on a deleted
sheet went with it, and an item went only when it had no shape left anywhere; its
confirm said so ("N items lose their measurements on these pages. M of them have
measurements nowhere else and will be deleted entirely"). A folder the delete emptied
went too. In our api, `takeoff_item.sheet_id` is the item's home sheet with `ON DELETE
CASCADE`. A plain delete of a sheet would therefore take every item homed on it,
together with its shapes on other sheets, which the confirm would not have named.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Delete the sheet rows and let the cascade decide | One line | Takes shapes on other sheets without saying so; the confirm lies |
| B — The api does legacy's rule in one transaction: shapes on the sheets go; an item with shapes elsewhere stays, re-homed to one of those sheets and recomputed; an item with none left goes, its last quantity handed to the estimate (D-09); emptied folders go, deepest first | The confirm is true; the estimate keeps its numbers | More code in the api |

**Decision:** Option B.
- `POST …/drawing/sheet/delete` with the sheets' uuids.
  - It needs Edit takeoff and Upload documents, the people who put sheets in.
  - It answers with the counts of sheets, items and folders deleted.
- Locks are not asked. Deleting a sheet is a sheet's act, as in legacy, and the confirm
  names every item it takes.
- One `drawing.sheet.changed` goes to every open panel. Each surviving item gets a
  `takeoff.item.changed` on its new home sheet.
- `PUT …/drawing/sheet/order` places a folder's sheets in one write: a drag, or "Move
  selected to". It replaces legacy's one update per sheet.

**Consequences:**
- The app cannot yet put one item's shapes on two sheets; F7's copy to another sheet
  will. Until then the re-homing branch runs only on data brought over from legacy.
- A deleted sheet's derivatives stay in storage: its split PDF, thumbnail and fit image.
  A sweep for orphaned keys is future work, the same as for a deleted drawing file today.

---

## D-49 — A production build on the bench, for timings

**Date:** 2026-09-27
**Status:** Accepted (the founder's instruction of 2026-09-27)
**Area:** Infrastructure, Frontend

**Context:** Block C's cold open was about 1.9 s to the first pdf.js paint against
legacy's ~200 ms. Nearly all of it was pdf.js and its worker loading through the bench's
dev server. The dev server serves every module untransformed and on demand, which no
customer ever gets. The founder asked for the built app to be served on the bench as
production would serve it, with the timing fixtures run against it.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — `vite preview` in the dev image | One command | Not what production runs: no cache headers, no real web server |
| B — The app's Dockerfile gains `build` (`npm run build`) and `prod` (nginx serving `dist`) stages; a `prod` compose profile runs it on :5175 | The bytes and headers a customer gets: hashed assets immutable, `index.html` no-cache, gzip, SPA fallback | A snapshot: it is rebuilt after an app change |

**Decision:** Option B.
- `app-prod` runs on the `prod` profile, on :5175.
- The api allows that origin.
- `FX_APP=http://localhost:5175` points any fixture at it.
- The timing fixtures (`f5-s11`, `f5-s13`'s prerender) report their numbers there.
- The dev server stays the default: it is what the code under change runs on.

**Consequences:**
- nginx's type list does not name `.mjs`. pdf.js's worker is served as JavaScript
  explicitly, or the browser refuses to start it.
- The host, TLS and CDN stay F11's; this is the bundle and its headers only.

---

## D-50 — A deleted item takes its estimate line with it: no quantity without a measurement

**Date:** 2026-09-27
**Status:** Accepted (the founder's instruction of 2026-09-27)
**Area:** Estimating, Takeoff, Backend
**Amends:** D-09 (its "a deleted takeoff item orphans its line" consequence), D-48

**Context:** D-09 kept a deleted item's estimate line. The api wrote the item's last
`effective_quantity` into the line's `manual_quantity` just before the delete, and the
foreign key went null. The line then showed a flagged "orphaned" quantity with no
measurement behind it. D-48's sheet delete did the same for every item it took. The
founder, reviewing D-48, ruled that out: the estimate never shows a quantity that
nothing measured.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep D-09: an orphaned line with the last quantity | A priced line never vanishes | A phantom quantity: it can be wrong, and nothing on the drawings backs it |
| B — The line goes with its item (`ON DELETE CASCADE`); the delete's confirm names the item first | The estimate is exactly what is measured, plus lines typed by hand | A priced line disappears with its measurement; the confirm is the only warning |

**Decision:** Option B.
- `estimate_line_item.takeoff_item_id` is `ON DELETE CASCADE`.
  - Deleting an item deletes its line, by any path: the item delete, the last shape,
    a sheet delete (D-48).
  - Deleting the project deletes both, as before.
- The copy of the last quantity is removed (`preserve_last_known_quantity` and its
  callers).
- An orphaned line can no longer exist, so the `is_orphaned` flag is gone.
  - A line with no item was typed by hand, and its `manual_quantity` is its own.
  - `origin_takeoff_item_uuid` stays as provenance only.
- The migration deletes any orphaned line already stored: its quantity was exactly the
  phantom this rules out. There were none on the bench.
- D-48's rule is otherwise unchanged. An item with shapes on another sheet stays, moved
  there. An item left with no shapes goes, named in the delete dialog first.

**Consequences:**
- Every confirm that deletes an item (the item, its last shape, a sheet) is the only
  warning that a priced line goes too. When the estimate screen exists (P-08), these
  confirms should also say that the item's estimate line goes with it.
- Option C of D-09 (freezing a submitted bid) is unaffected. A frozen snapshot is not
  a live line.

---

## D-51 — A scale is feet per PDF point, and quantities are measured in points

**Date:** 2026-09-27
**Status:** Accepted by the founder 2026-09-27, with the correction it made to the founder's four bench quantities. A permanent fixture keeps it: `f5-d51` (quick tier) measures equal runs across and down a landscape and a portrait sheet
**Area:** Takeoff, Backend, Frontend (hard rule 3: quantities)
**Serves:** F5-S15, S16

**Context:** Vertices are stored normalised to the page box: x across its width, y across
its height. The api's calibration divided the real distance by the distance between the
two points in those normalised units. Every quantity then multiplied a normalised length
by that one number. A normalised unit is a different length across a sheet than down it
unless the sheet is square.

So on a 36 × 24 sheet calibrated along its width, a run down its height read 1.5 times
its true length, and an area was off by the aspect ratio. Only runs parallel to the
calibration line were right. `f5-s10`'s "a 0.2 × 0.2 square reads 1,600 SF" was a
rectangle on the page.

Legacy measured in PDF points, which are the same length in every direction. Its
`feet_per_norm` column holds feet per point despite its name, and its presets
(`scales.ts`) are defined that way. Block E's presets cannot be applied at all without
the same unit.

**Options considered:**

| Option | Pro | Con |
|--------|-----|-----|
| A — Keep feet per normalised unit; presets convert per sheet | No change to stored quantities | Wrong off-axis on every non-square sheet: nearly every drawing |
| B — Legacy's unit: the scale is feet per point; a length or area is measured after scaling x by the page's width in points and y by its height | Right in every direction; presets are exact; F17 imports legacy's column as it is | Every calibration and stored quantity is converted once |

**Decision:** Option B, legacy's.
- **`sheet_calibration.feet_per_norm` holds feet per PDF point**, as legacy's column
  does. The name is kept for F17.
- A two-point calibration stores the real distance over the points' distance in page
  points. That uses the sheet's `width_pt` and `height_pt`, or a unit square when they
  are unknown, as legacy does.
- **A preset or custom scale** (`PUT …/sheet/{uuid}/scale`) writes its feet per point
  directly, with legacy's synthetic reference: 1 point long, horizontal, from the
  origin.
- **Every quantity**, in the api (`takeoff/quantity.py`) and the browser
  (`lib/takeoff/quantity.ts`), scales the vertices to points before measuring. Each
  shape is measured on its own sheet's page size and scale.
- **The migration** converts stored calibrations to feet per point. The bench's items are
  then recomputed by `drives/d51-recompute.py`. Production holds no takeoff data yet;
  legacy's rows are already in points.
- **A scale write publishes `sheet.calibration.changed`**, and open canvases refetch the
  sheet's scale and items (S15 AC3).

**Consequences:**
- Runs parallel to the calibration line read as before. Every other run and area now
  reads its true length or area.
- Fixtures that asserted a quantity from a normalised calibration are re-derived in
  points (`f5-s10`, `proof-backlog`).
- `measured_feet_per_pt` is left for the dimension cross-check (F12), as in legacy.

---

## D-52 — Architectural scales read `1/8" = 1'-0"`

**Date:** 2026-09-27
**Status:** Accepted (the founder's ruling of 2026-09-27, on Block E's question)
**Area:** Takeoff, Frontend
**Serves:** F5-S16 AC1

**Context:** Legacy labels its architectural scales `1/8" = 1'`. F5's spec wrote
`1/8" = 1'-0"`, the form printed in drawing title blocks. Block E shipped legacy's and asked.

**Decision:** The spec's form for the architectural list: `{fraction}" = 1'-0"`, in the
Scale menu, on the chip and in the sheets panel. Engineering (`1" = 20'`) and metric
(`1 : 100`) keep legacy's form, which is how those scales are printed.

**Consequences:**
- `lib/takeoff/scales.ts` builds the architectural labels; `matchScale` and the stored
  feet per point are unchanged.
- A label already stored keeps its words: the chip shows the label a person saved. Only
  bench data holds the older form.
- `f5-s16` picks `1/4" = 1'-0"` by its exact name.

---

## D-53 — The sheets panel lists each sheet's items with that sheet's share, and the toolbar has legacy's Scale button

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend, Backend
**Serves:** the founder's findings (a) and (b) of 2026-09-27, an F5 follow-up

**Context:** The founder found two F5 surfaces short of legacy. (a) Legacy's sheets panel
lists the measurements under each sheet row (`SheetItemList` in `SheetTree`); ours showed
only a count. (b) Legacy's toolbar has a **Scale** button opening the scale dropdown
(`ScaleMenu` in `Toolbar.tsx`'s Scale cluster); ours had a "Scale" tool that started a
calibration at once, and the dropdown only on the canvas chip. Three choices had to be
made to port them.

**Options considered:**

| Option | Pro | Con |
|---|---|---|
| A — Each sheet's row shows the item's whole quantity | No new maths | Wrong for an item measured on several sheets: every sheet claims the total |
| B — Each row shows that sheet's share: its shapes there on that sheet's scale, with the item's height, pitch and multipliers (legacy's `computeSheetQuantitySync`); counted on the api in `GET …/drawing/sheet/items` | Legacy's number; one call serves the panel | The call measures shapes, not only names |

**Decision:** Option B, and with it:
- **Legacy's default, Page:** sheets are closed until their chevron ("Show items on this
  sheet") is clicked. The ⋮ menu's Default Expand Level (None, Page (Default), Page >
  Takeoff), Hide Takeoffs and Hide Search Box are legacy's, kept per browser and
  workspace (`sheetsPanel.prefs.{workspace}`, legacy's key). Selecting an item opens the
  sheets carrying it; a search on an item's name opens its sheets.
- **A count on an unscaled sheet counts its marks** (legacy's Count needs no scale); a run
  or area there reads "—".
- **The item row is a viewer, as legacy's:** swatch, name, this sheet's quantity; a click
  selects the item and opens that sheet. Its kebab menu, inline rename, visibility eye
  and multi-select come with F6-S9's shared item row, which both panels will use.
- **The toolbar's Scale button** sits after Select and before Linear, legacy's ruler over
  the word, title "Scale — {label}", and opens the same menu as the chip (Calibrate
  Scale, Add Custom Scale, the three lists). The "Scale" tool that calibrated on a click
  is gone; Calibrate Scale in the menu does that, and the button reads pressed while it
  runs.

**Consequences:**
- `SheetItemName` carries `color`, `type`, `unit` and `quantity`; `takeoff.service.sheet_scales`
  is public for it. A scale change refreshes the panel's rows live.
- Fixtures `f5-sheet-items` and `f5-scale-button`; `f5-s15`, `f5-s19` and
  `proof-backlog` calibrate through the menu; `f5-s13` and `f5-s14` find a row's label by
  `[data-sheet-label]`.

---

## D-54 — The Takeoff panel lists every item in the project; legacy has no current-sheet filter to port

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28). Q1: legacy kept, no sheet filter.
**Area:** Takeoff, Frontend
**Serves:** the founder's finding (c) of 2026-09-27; built in F6-S9

**Context:** The founder asked that the Takeoff panel show items from all sheets, as
legacy does, "with whatever filter legacy offers for the current sheet". Read at
`12dd119b`, legacy's `QuantityTable` is handed every item (`takeoff.items`) and offers no
sheet filter. For the current sheet it has the Resume tooltip's "Also measured on: …", the
bulk "Delete on this sheet only", and the Sheets panel's per-sheet list.

**Options considered:**

| Option | Pro | Con |
|---|---|---|
| A — Add a "This sheet only" filter | What the words of the finding suggest | Not legacy's; the Sheets panel already lists one sheet's items (D-53) |
| B — Legacy's: every item, "Also measured on: …", "Delete on this sheet only", the layer filter and search | Exactly legacy's | A person wanting one sheet's items reads them in the Sheets panel |

**Decision:** Option B. If the founder wants a sheet filter beyond legacy, it is a small
addition to F6-S9 and a later D-NN.

**Consequences:** F6-S9 gains AC0 (every item, "Also measured on", a row click opens a
sheet carrying the item when the open one carries none).

---

## D-55 — New Measurement asks before drawing, and one tool run is one item

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend, Backend
**Serves:** F6-S1 to S3

**Context:** F6-S1's AC1 reads "Drawing a run opens 'Name this Linear measurement' with
'Linear 3'". Legacy's source (`ProjectTakeoff.tsx` `setPrep`, `NewItemDialog.tsx`) differs
in three ways: the dialog opens when Linear, Area or Count is **picked**, before anything is
drawn; its title and default name use the type's code, "Name this LF measurement" and
"LF 3"; and after the first shape the tool stays armed, every further shape joining that
item (legacy's extend), so a run of count clicks is one item. Today's app made one item
per shape, which is how three count clicks made three items (finding, 2026-09-26).

**Options considered:**

| Option | Pro | Con |
|---|---|---|
| A — As the spec's words: draw, then name | Matches the spec text | Not legacy's; the dialog's height, pitch and dimensions would apply to a shape already drawn |
| B — Legacy's: pick, name, draw; one tool run is one item | Exactly legacy's order and words; fixes count-per-click | Every fixture that picks a tool confirms the dialog |

**Decision:** Option B, and with it, all from legacy's code:
- **Title and default** "Name this {LF|SF|COUNT} measurement", "{TYPE} {n}"; Enter creates.
- **The name suffix** reads " (40.0 LF, 7'-6\"H)": legacy's formatter always writes one
  decimal (the spec wrote "40 LF").
- **The api computes the slope factor** from the mode and entry (legacy's `computeFactor`,
  ported to `takeoff/pitch.py`), refuses a bad one 409 with legacy's hint, and refuses
  height and pitch together. The unit and name are rebuilt on every recompute (a run with
  a height reads SF).
- **A count needs no scale:** its marks are counted on an unscaled sheet. It was stored as
  0 and stale until now.
- **The WBS mode and whether its section is open are on the user** (`takeoff_prefs`,
  sparse, legacy's defaults Custom Folder and closed), where D-39 Q7 puts F7's canvas
  settings too.
- **The Preset Classification picker arrives with S14**; until then Preset shows that no
  system is on, and Create needs Rough measurement, Custom Folder or edit mode, as
  legacy's gate does.

**Consequences:**
- `lib/takeoff.mjs` gains `armMeasure` and `confirmMeasure`; ten fixtures pick tools
  through them.
- A context menu opened on a row that a panel had just scrolled into view closed at once
  (the scroll's event lands a frame later). The menu now ignores a panel's scroll
  delivered before its second frame, as it already did for the page's.

---

## D-56 — Sub-items and variables: one level, read in order, recomputed on the api

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Backend, Frontend
**Serves:** F6-S4 to S6 (D-36 F6 Q1, Q3, Q6)

**Context:** Block B had five choices the spec left open.

**Options considered:**

| Question | Chosen | Not chosen, and why |
|---|---|---|
| How deep sub-items go | **One level** (the spec, S5 AC3): the api refuses a sub-item under a sub-item, 409 | Legacy's nesting ("Sub-items nest and collapse level by level", PARITY §8): the spec, accepted in D-36, ruled it out; noted on the PARITY line |
| How siblings read each other | **In order, each seeing the ones above it freshly computed**, as legacy's `reconcileSubItemsForParent` loop does | All from stored values: a chain `[A] → [B]` would lag a save behind |
| How the two engines are proved equal | **On the bench**: `f6-s4.sh` runs the table through the api's engine in the api container, then the fixture imports the browser's engine from the dev server and compares every row, number to the bit, error word for word | A unit-test runner in each repo: neither has one, and testing here is conducted, not written |
| How a variable change reaches sub-items | **The api recomputes every parent whose sub-items read `{var:<uuid>}`**, workspace-wide for a default, one project for its own value, and publishes `workspace.variable.changed` | Legacy's reconcile-on-read in the browser: D-32 puts derived values on the api |
| Where variables are managed | **From the sub-items editor's Insert menu, "Manage variables…"** (legacy's "Add Variables" lives there too) with the project's own value, the default and Archive | A settings page: not legacy's, and nothing reads variables outside formulas |

**Decision:** As chosen above. Also:
- A sub-item takes the parent's type, colour, sheet, folder, classification and layer,
  as legacy's `createSubItem`; its unit is its own.
- A formula that does not read stores no quantity and its error ("—" and an err chip),
  never a last-known-good number (legacy's RUNG P2b).
- A rough measurement's change recomputes the sub-items that read it (`{ref:<uuid>}`),
  with a guard against two rough measurements reading each other.

**Consequences:** `PUT …/item/{uuid}/sub-items` (the whole list), `…/variable` (list,
create, update) and `…/variable/{uuid}/value`; migration `96bd11c238fa`. A live window
refetches a changed parent's sub-items with it, since most writes name only the parent.

---

## D-57 — Folder and layer multipliers extend a quantity; takeoff shows what was measured

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Estimating, Backend (hard rule 3: quantities)
**Serves:** F6-S7, S8

**Context:** The api folded an item's folder and layer multipliers into its stored
quantity (`apply_modifiers`), from the first item model. Legacy does not: its layer
dialog says "Estimating multiplies this layer's quantities by it — sub-layers compound
with their parent. Takeoff always shows the measured quantity", its folder multipliers
compound along the folder chain (`multipliers.ts`, `folderChainMultiplier`), and its
Takeoff panel shows a Multiplier and a Total Qty column, hidden until a multiplier is
set. The api also compounded nothing: it read only the item's own folder and layer.

**Options considered:**

| Option | Pro | Con |
|---|---|---|
| A — Keep folding the multiplier into the item's quantity | No change | Not legacy's; a folder at ×2 doubles its sub-items' PARENT too, so a sub-item's figure double-counts in Estimating |
| B — Legacy's: the item's quantity is what was measured (with height and pitch); its **multiplier** is the folder chain × the layer chain, and the Takeoff panel shows it and the extended total | Legacy's words and numbers; one extension, in one place | A stored quantity on an item filed under a multiplier changes once |

**Decision:** Option B.
- `effective_quantity` no longer includes folder or layer multipliers.
- An item read carries `multiplier`, the product of its folder chain's and its layer
  chain's multipliers, and the panel shows "×N" and the extended total when it is not 1.
- Estimating (F9) extends each line by it.

**Consequences:** Only bench data held items under a multiplier. The rule is kept in one
place on the api (`service.item_multiplier`), which F9 reads.

## D-58 — Classifications: legacy's five templates, seeded per system on first use

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Classification, Backend, Workspace settings
**Serves:** F6-S10 to S13, S15

**Context:** Legacy seeds all five systems (CSI 1,833 nodes, UniFormat 635, NRM 1 401,
NRM 2 361, CESMM 254) from `supabase/seed/templates/*-default-v1.txt` by a trigger when a
workspace is created, with the template's 54 default subcontractors and their scope
assignments, guarded by `workspace_template_versions` so an edited tree is never
re-seeded. Every system starts enabled. D-36 Q8 said CSI seeds on first use and the
others when a workspace first turns them on. Legacy's two duplicate-code checks disagree
(Settings: "That code already exists in this system.", case-insensitive; the picker:
"Code X already exists", case-sensitive), and a child's code is the sibling count + 1,
which collides after a delete and fails silently.

**Options considered:**

| Option | Pro | Con |
|---|---|---|
| A — Seed every system at workspace creation, as legacy | Legacy's timing | 3,484 rows per new workspace nobody may read; D-36 Q8 said otherwise |
| B — Seed a system the first time anyone reads its tree or it is turned on (D-36 Q8), guarded by a per-system seed record | Every workspace finds its tree already there; nothing written that is never read; the guard is legacy's | The first read of a system writes |

**Decision:** Option B, with legacy's data copied verbatim into the api
(`app/features/classification/templates/`).
- Every system starts enabled, as legacy (`enabled_classifications` empty reads as all
  five; the column's default becomes all five). The last one cannot be turned off:
  409 "Pick at least one classification system". An unknown key is 422.
- A system seeds once, recorded in `workspace_classification_seed`; a recorded system is
  never seeded again, whatever was edited or deleted.
- Seeding CSI also seeds legacy's default subcontractor roster and the template's scope
  assignments; the other systems seed their assignments against that roster.
- One duplicate rule everywhere: "That code already exists in this system.", ignoring
  case, 409, shown on the field. A child's code is the next free `{parent}.{NN}`.
- Gated on `canManageTrades` (F3-S14), for systems, the tree and subcontractors.
- `takeoff_item.classification_ref_id` and `takeoff_folder.classification_ref_id` become
  foreign keys to `workspace_classification.uuid`, ON DELETE SET NULL (D-36 Q2). Deleting
  a code something is filed under (itself or below) is refused 409 "This one is in use",
  naming the count; "Archive instead" is offered.
- Beyond legacy, `workspace.classification.changed` (tree writes, archive, seed) and
  `workspace.settings.updated` (systems, subcontractors) make other tabs follow live.

**Consequences:** F17 maps legacy's refs onto the seeded rows by (system, code). The
project-level subcontractor overrides are Estimating's (F9).

## D-59 — Filing by classification happens on the api, with a searchable picker

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Classification
**Serves:** F6-S14

**Context:** Legacy's picker (`ClassificationPicker.tsx`) has two columns, Division and
Scope, no search, "Show archived", inline create, and a "System:" choice that locks the
project after the first classified save ("Locked for this project"). Filing runs in the
browser (`ensureFolderPath`): a root folder per division named "DIV 03 — Concrete" (CSI)
or "{code} {name}", a nested folder per scope level named with the scope's name, each
carrying the node's id, found again by that id. S14 AC1 asks for a search.

**Decision:**
- The api files: an item created or changed with a `classification_uuid` gets its folder
  path found or made by the node chain, is filed in the leaf, carries the node as its
  classification, and stamps the project's system if it has none. A node from another
  system than the project's is refused 409 "This project is locked to {system}".
- Renaming a node renames the folders made from it, as legacy.
- The picker keeps legacy's two columns and words and adds a search box over code and
  name (the matching of legacy's subcontractor scope tree), per S14 AC1.
- Legacy's "Change classification system" dialog (unlock when at most one item is
  classified) is not built in F6; the lock shows "Locked for this project".

**Consequences:** One place builds folder paths, so two estimators filing under one scope
at once find one folder, not two.

## D-60 — Settings: legacy's "Project Setup" tab holds Classification, Subcontractors and Statuses

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Frontend, Workspace settings
**Serves:** F6-S10 to S15, P-19

**Context:** Two new settings screens, Classification and Subcontractors, as tabs of
their own overflowed the desktop tab row by 201 px, which P-19 forbids at 1440 px.
Legacy's Workspace Settings has an outer "Project Setup" tab whose inner sections are
Classification, Subcontractors and Statuses.

**Decision:** Legacy's grouping. The top row's "Statuses" tab becomes "Project Setup"
(it opens Classification); under the row, on those three screens, an inner row links
Classification, Subcontractors and Statuses. Every route stays as it was, so a link to
`/settings/statuses` still lands there, with Project Setup marked.

**Consequences:** p19 measures the two new screens too. "Project Setup" is five letters
longer than "Statuses", so the row's gap goes from 16 px to 14 px to keep it inside the
desktop column.

## D-61 — F7 Block A: legacy's hit rules, analytic shapes on the api, deducts clipped once

**Date:** 2026-09-27
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Backend, Frontend (hard rules 2 and 3)
**Serves:** F7-S1, S2

**Context:** Legacy's engine (`engine.ts`, `quantityService.ts`) picks with a body
tolerance of 0.008 in normalised page units (so it grows with zoom and differs across
the axes), counts with an ellipse test of at least 14 screen px, positives before
deducts, a hole cycle on repeated clicks, topmost first. Its analytic quantities are an
ellipse's πab and Ramanujan II perimeter, an arc's r·|sweep|; rectangles and inline
arcs are measured on their points or samples. Deducts are clipped against the union of
the item's positives on the sheet, subtracted once (`polygon-clipping`). Its traps: a
curved deduct is clipped as a 64-gon (a 10 ft circle removes 313.65 SF, not 314.16); the
`circle` flag is set in normalised space, wrong on a non-square page; hover figures are
sampled. F7-S1's work lists nine engine modules; its criteria test hit-testing only.

**Decision:**
- **S1 ports hit-testing** (`lib/takeoff/engine/hit.ts`) with legacy's rules and
  constants, and the canvas picks through it (click and right-click), replacing
  per-element clicks. The other modules land with the block whose criteria drive them
  (the tool reducer with Block B, snap S10, deducts S18, transforms S15, S16, history
  S22, keys S27, hover S25), each still data in, data out.
- **Analytic on both sides** (`quantity.py`, `lib/takeoff/quantity.ts`): an ellipse is
  πab and Ramanujan II always (the `circle` shortcut dropped: Ramanujan II is exact when
  a = b, and the flag lies on non-square pages); an arc is r·|sweep| with legacy's
  radius in points (√(w·h) on a non-square page); a rectangle's corners are exact.
- **Deducts** (`role = subtract`, `owner_geometry_id`, D-39 Q2): each is clipped against
  the union of the item's positives on its sheet and subtracted once. A deduct lying
  wholly inside that union subtracts its own analytic area (so a 10 ft circular hole
  removes 314.16 SF); only a deduct crossing an edge is clipped, on 256-point outlines of
  curved shapes (`shapely` on the api, D-39 Q3). The browser's twin clips with
  `polygon-clipping` when Block D brings deduct drawing; until then it shares the
  inside-the-union rule, which the shared table proves.
- `POST …/item/{uuid}/shapes` as the spec designs it, one `takeoff.geometry.changed`
  of kind `batch` per transaction.

**Consequences:** Every figure in the shared table is exact to the cent on both sides;
a crossing curved deduct is exact to within the 256-point outline (under 0.02 %).

## D-62 — F7 Block B: legacy's modes and draw menu, Count joins the selected count item

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend
**Serves:** F7-S4 to S8

**Context:** Legacy's Linear and Area are split buttons ("Linear — Rectangle (change mode
with ▾)", caret "Change Linear mode") whose menus list the modes with their hints and
mark the current one; Segment is a tool of its own; a mid-run right-click offers New
Section, Stop and Discard; Escape is two-stage. The spec's S4 AC6 ("the default Linear
mode setting") and S7 AC5 (a sheet switch ends a count session) need the canvas settings
(S27) and a session model that Block B does not bring.

**Decision:**
- Legacy's modes, words and hints (`lib/takeoff/engine/draw.ts`); a rectangle, ellipse or
  arc is stored with its parameters (D-61) and its outline samples, as legacy stores them.
- Count with a count item selected adds marks to it with no dialog; otherwise Count asks
  first (F6-S1). "Delete this point" and "Delete all points on this sheet" on a mark's
  right-click.
- The draw menu also carries **Close** on an area (S8 AC6 names it), off below three
  points.
- **Deferred:** the default mode setting to the canvas settings (S27), so a session
  starts in Point to Point until then; a sheet switch ending a count session to the
  session history (S22).

**Consequences:** Block B's criteria but those two are driven by `f7-b`.

## D-63 — F7-S10: the canvas bar shows Ortho and Snap; the other three come with their features

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend
**Serves:** F7-S10 (and S11, S20)

**Context:** Legacy's canvas status bar (`DrawModifiersOverlay`) reads "Ortho: Off",
"Snap: On", "Snap PDF: Off", "Auto Merge: On", "Auto Scroll: On", each a toggle with a
title. Snap PDF needs the sheet's printed linework read out of the PDF; Auto Merge is
F7-S20; Auto Scroll is F7-S11. None of those three is built yet.

**Decision:** The bar shows Ortho and Snap with legacy's words, titles and defaults, and
S and O toggle them mid-draw. Snap PDF, Auto Merge and Auto Scroll join the bar when
their features land, rather than as toggles that change nothing (D-39 Q9's rule for
unbuilt region-menu rows: hidden, not disabled). Ortho and Snap are per session until the
canvas settings (S27) carry their defaults.

**Consequences:** S10 AC3 (Snap PDF) and AC5's D key wait for the linework reader.

## D-64 — F7-S18: a deduct stays its own shape, even across an edge or over another hole

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Backend
**Serves:** F7-S18, S19

**Context:** Legacy's `edgeCut.ts` rewrites a section whose outline a deduct overhangs:
the section becomes a plain polygon with the bite taken out (an analytic circle becomes
120 samples), and the deduct row goes. Its `mergeOverlappingDeducts` rewrites two
overlapping holes into one. Both change stored geometry to make the figure right.

**Decision:** Keep every deduct as the shape that was drawn, owned by its section
(D-39 Q2), and make the figure right in the arithmetic instead: the api clips the union
of an item's deducts against the union of its sections on the sheet and subtracts that
once (D-61), so a bite over an edge counts only what it covers and two overlapping holes
count their overlap once. The refusals stay legacy's: "Subtract has no overlap" and
"Deduction covers the whole area", from the api.

**Consequences:** A section keeps its analytic shape and its handles after a cut;
deleting a deduct restores the whole section; figures equal legacy's. The canvas draws a
deduct as a dashed outline over its section rather than a cut-away until the drawing of
holes is reworked (S18 AC6's "no bead chain" holds: no shape is resampled).

## D-65 — F7-S15: a section moves with the deducts it owns, in one change

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend, Backend
**Serves:** F7-S15, S18

**Context:** Legacy's move (`translateRunGroup`) shifts one run. Its deducts are already
cut into the run's outline (`edgeCut.ts`), so they go with it for free. Under D-64 a
deduct is its own shape, owned by its section, and a section moved alone would leave its
holes behind and change the figure.

**Decision:** Dragging a section's move handle writes one shapes change (`POST
/item/{uuid}/shapes`). That change moves the section and every deduct it owns by the same
offset: vertices and every point in `shape_meta` together (invariant 2), and analytic
shapes stay analytic. A deduct moved on its own is judged after the whole change. If it
overlaps no section, the api refuses the change in legacy's words: "The moved subtraction
no longer overlaps any positive region. Original position restored." The page shows that
under legacy's "Move rejected" toast, and the canvas puts the preview back. A drag under
4 px moves nothing, as in legacy, and counts as a click on the sheet under the handle, so
legacy's hole cycle (S12 AC3) still steps into a deduct that sits at its section's middle.

**Consequences:** Moving a section never changes its figure. One version check covers
the section and its deducts, so a colleague's edit to either refuses the whole move.

## D-66 — F7-S14: Select draws legacy's box; panning goes back to legacy's Pan tool

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28). Q2: legacy kept (Select draws the box; Pan is H).
**Area:** Takeoff, Frontend
**Serves:** F7-S14 (and §9's Pan line)

**Context:** Legacy's toolbar has Pan ("Pan (H) — drag to move the sheet") beside Select
("Select (V) — click annotations to select and edit"), and it opens on Select. With
Select, a left press that misses every markup becomes a rubber band after 25 px
(`PdfCanvas.tsx`), and the box selects each run whose bounding box it wholly encloses.
Today's page has no Pan tool, so a Select drag pans instead, and there is no room for
the box.

**Decision:** Follow legacy. A Select drag over the sheet draws the box: legacy's 25 px
threshold, bounding box wholly inside, hidden items left out, locked ones included, and
counts and deducts treated like any other shape. An empty box selects nothing and closes
quietly, because legacy's region menu (Ask AI, Extract Schedule, Copy as Text and the
rest) has no built row yet (D-39 Q9: hidden, not disabled). Pan comes back as legacy's
tool, with legacy's title and the H key; space-drag and the middle button pan with any
tool, as today. The selection holds sections (geometry rows). A section turned, nudged,
copied or deleted carries the deducts it owns (D-65).

Rotation turns about the middle of the selection's bounds in page points, so nothing
stretches on a non-square page and every figure stays the same. Ellipses and rectangles
stay analytic. An arc keeps its analytic form under a flip, and under a quarter turn on
a square page. Under a quarter turn on a non-square page an arc no longer has one radius
in page fractions, so it becomes legacy's 120-point run, as legacy does for every
rotated arc.

**Consequences:** `proof-backlog`'s §9 step pans with the Pan tool. The region menu
arrives with the features its rows open.

## D-67 — F7-S16: legacy's copy and paste, keeping real-world size across and down

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28). **Amended by D-73:** "New item" on a paste opens the New Measurement dialog prefilled, as legacy's.
**Area:** Takeoff, Frontend
**Serves:** F7-S16, S19 AC2

**Context:** Legacy's copy starts from a section's right-click, "Copy…", with its three
scopes ("This section only", "All sections on this sheet (n)", "Choose sections…"), then
"Paste on this sheet" or "Paste on another sheet…". A ghost follows the cursor from the
right-click point, and a click asks "Paste into "{name}" or create a new item?". Two
details do not carry over cleanly. Legacy rescales a paste by the ratio of feet per point
alone, so a paste onto a page of another size or shape comes out the wrong real size.
And "New item" opens legacy's new-item dialog, prefilled with "{name} copy" and the
source's colour.

**Decision:** Follow legacy's flow, words and toasts, with two differences. The paste is
scaled across and down separately, by the ratio of each sheet's feet across (and down)
the page (D-51). That keeps a copy's real-world size on any sheet, which is what legacy's
own dialog promises ("geometry will be rescaled to preserve real-world quantities").
"New item" makes the item directly with legacy's prefilled values ("{name} copy", the
source's colour, folder and layer), which the Properties pane can then change, rather
than opening F6's New Measurement dialog midway through a paste. A section's deducts
always come with it (D-65), re-paired to the copy. An arc that the rescale leaves without
one radius becomes legacy's 120-point run (as D-66). Paste mode ends after one paste, as
in legacy.

**Consequences:** Copying between sheets of different sizes keeps quantities, where
legacy's does not. The New Measurement dialog is not part of a paste.

## D-68 — Development speed mode: the fixture suite archived, a smoke check per block

**Date:** 2026-09-28
**Status:** Accepted (founder decision)
**Area:** Process, Bench
**Supersedes:** D-44's two tiers, and CLAUDE.md's "after each subtask, run the fixtures it touches"

**Context:** The fixture suite had grown to about 190 files and 81 standing fixtures. A
full run took over half an hour at 90% host CPU, and writing and keeping fixtures now costs
more of each block than building it. The founder wants speed until the next deploy to
testers.

**Decision:**
1. The suite is archived at tag `fixtures-archive-2026-09-28`, pushed in
   `intelcost-infra`, `intelcost-app-fastapi` and `intelcost-app-react` (the code it last
   ran against). Restore it in infra with
   `git checkout fixtures-archive-2026-09-28 -- browser drives regress.sh`.
2. Deleted from `intelcost-infra`: every fixture (`browser/f*.mjs`, `*.sh`, `p19`, `p20a`,
   `d37-links`, `d27-uploads`, `proof-backlog`), their drives, `browser/lib/shipped.sh`,
   `browser/lib/formula-cases.mjs`, and `regress.sh` with its quick and full lists.
3. Kept: the Playwright `browser` service, the helpers in `browser/lib/` (sign-in, worlds,
   drawings, api calls, realtime), `bench-code`, `bench-tidy`, `walkthrough-setup`,
   `load-probe`, `drives/bench-workspaces.py`; and **the shared quantity table**
   (`browser/lib/quantity-cases.mjs`), now run on its own by `./quantity-table.sh`: the
   browser's and the api's engines against the same shapes and hand-worked answers, plus
   hard rule 2's purity check on `lib/takeoff`. It runs in seconds and guards bid quantities.
4. After each block: the gates (lint, typecheck, build; ruff, mypy), `./quantity-table.sh`,
   then one throwaway Playwright smoke check on the bench that signs in, opens the changed
   screen and drives the new behaviour. The script is not saved; the report says in one
   line what it drove and whether it passed. A failed smoke check is fixed before moving on.
   No fixture is written, run or maintained.
5. PARITY lines keep their ticks, noted "driven by fixture, archived at tag
   fixtures-archive-2026-09-28".
6. Every report keeps a running list of features changed since the tag
   ([docs/tasks/SINCE_ARCHIVE.md](docs/tasks/SINCE_ARCHIVE.md)). **A full run restored from
   the tag is required before any deploy to testers or any promotion to `main`.**
7. `api-b`, `app-b` and `app-prod` are stopped, not deleted. Bring them back with
   `docker compose --profile realtime up -d api-b app-b` (and `app-prod`'s own profile).

Unchanged: commit and push per block on `umer-dev`, decisions logged, PARITY updated,
short daytime reports, legacy parity first.

**Consequences:** A regression between blocks is caught by the next click check or the
next full run, not by a fixture. Behaviour touched since the tag is unguarded until that
full run, which is why the list in item 6 exists. Two-window checks need `api-b` and
`app-b` started for the smoke check that needs them.

## D-69 — F7-S20: auto-merge computed in the browser, legacy's union, a shape keeps who drew it

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28).
**Area:** Takeoff, Frontend, Backend
**Serves:** F7-S20 (and S22's undo of a merge)

**Context:** Legacy's `mergeOverlappingPositives` (`edgeCut.ts`) unions a new closed run
of an item with every run of the item it overlaps, to a fixpoint; the largest keeps its
identity; the absorbed runs' deducts are handed over, each clipped against the other
contributors. It runs with `polygon-clipping`, in one flat per-sheet array. D-39 Q8 limits
it to the merging person's own shapes, from any time; the api keeps no record of who drew
a shape, only who last changed it. Two smaller facts: legacy reads any three points of a
Linear run as a polygon, so an open run could be swallowed into an outline; and S22's
undo needs each act's forward and inverse transactions.

**Decision:**
- The browser computes the merge (`lib/takeoff/engine/merge.ts`, legacy's rules ported,
  with `polygon-clipping` 0.15.7, legacy's dependency) and sends one `…/shapes`
  transaction: the survivor updated (or the new shape created when it is the largest),
  the absorbed deleted, their deducts handed over (`owner_uuid` on an update, new) and
  re-clipped where a contributor now covers them. The api validates and computes the
  figure, as for every other shape. Knowing the whole transaction in the browser is what
  lets S22 record its inverse.
- A shape records who drew it (`takeoff_geometry.created_by_id`; existing shapes take
  their last editor), and the api tells each caller which shapes are theirs (`mine`).
- Only a closed Linear run (its first point again at its end, or a rectangle or ellipse)
  is merged; an open one never is (a real-bug fix over legacy).
- The merged outline is a plain polygon (`kind: "polygon"`), a Linear one stored closed;
  curve samples are marked `smoothIdx` so they take no handle, as legacy's; a vertex edit
  keeps a closed run closed and forgets `smoothIdx` once a point is added or removed.
- Legacy's "Auto Merge: On" toggle joins the canvas bar (D-63's rule), per session until
  S27's settings.
- **Found on the way and fixed:** Duplicate copied an item's deducts as sections, so a
  duplicated slab gained its holes' area instead of losing it. It now copies each shape's
  role and re-pairs each deduct to its section's copy.

**Consequences:** A merge is exact to legacy's 120-point outline where a curve takes part,
and exact otherwise. A second overlapping section drawn before the first one's save has
come back is added, not merged, since the browser does not yet know the first.

## D-70 — No test suites or scripted tests; one smoke test through the Playwright MCP

**Date:** 2026-09-28
**Status:** Accepted (founder decision)
**Area:** Process, Bench
**Supersedes:** D-68 item 4's `./quantity-table.sh` step and its throwaway Playwright script

**Context:** D-68 cut the fixture suite but kept two scripted checks per block: the shared
quantity table and a throwaway Playwright script. The founder wants those gone too, and
the session's work checked by hand in a real browser.

**Decision:**
1. No test suite or scripted test is run or written: not `pytest`, not
   `./quantity-table.sh`, not a Playwright script, not the archived fixture suite. This is
   CLAUDE.md hard rule 8.
2. After each block: the gates (lint, typecheck, build; ruff, mypy), which are not tests,
   then one smoke test through the Playwright MCP of the feature developed in the session.
   It signs in with a throwaway account (never the seeded account), opens the changed
   screen and drives the new behaviour. The report says in one line what it drove and
   whether it passed. A failure is fixed before moving on.
3. `./quantity-table.sh`, `browser/lib/` and the `browser` service stay in the tree,
   unused, until a later decision removes them.

Unchanged from D-68: the fixture archive tag, the running list in
[docs/tasks/SINCE_ARCHIVE.md](docs/tasks/SINCE_ARCHIVE.md), the full run restored from the
tag before any deploy to testers or promotion to `main`, and commit and push per block.

**Consequences:** Bid quantities are no longer checked against hand-worked answers between
blocks. A quantity regression is caught by the smoke test's eye or by the full run before
a deploy. A session needs the Playwright MCP connected to finish a block.

## D-71 — F7-S22: the session history, as before-and-after rows undone in one transaction

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28). **Amended by D-73:** Delete on an item with sub-items asks first; an undo brings the item back with its sub-items; a box selection's delete is one undo step.
**Area:** Takeoff, Frontend, Backend
**Serves:** F7-S22, S20 AC5

**Context:** Legacy's `sessionHistory.ts` keeps one history for the session, owned by
the sheet of the latest commit (a commit elsewhere discards it; a visit keeps it; another
sheet's Ctrl+Z does nothing), 50 entries, and records creates, Resume and Extend runs, a
count session as one step, cuts, merges and deletes (a snapshot, the item re-created if
it went), not moves or vertex edits. Its entries are snapshots of a flat per-sheet array,
which D-32's row per shape has replaced; and its "undo a new item" deleted with no
version check, so a colleague's edit since could go unasked.

**Decision:**
- The rules live in `lib/takeoff/engine/history.ts`, data in and out. Each entry is one
  act's rows before and after it, with versions, and the item's own fields when the act
  made or took it (`features/takeoff/hooks/useSessionHistory.ts`).
- Undo writes the inverse as **one** `…/shapes` transaction: rows the act made deleted,
  rows it changed put back, rows it deleted re-created under their own uuids (so a
  deduct's section keeps its identity). Redo writes the act again with the versions the
  undo left. A merge, a deduct and a delete are each one step (S20 AC5).
- The item an act made goes with its last shape on undo, **in the same transaction**
  (`drop_empty_item` on `…/shapes`, new, decided under the item's lock), so every row is
  version-checked first. A version moved on means a colleague changed the row: the api's
  refusal names them and the page asks, "Undo will affect this item", "{name} also edited
  this since then — undoing will remove their work too.", in the spec's words.
- An item an act took is made again from its own fields (name, type, unit, colour,
  folder, layer, count and height settings, dimensions). **Its sub-items are not**: they
  went with it, and nothing here keeps them.
- Legacy's Ctrl+Z order: the canvas takes a run's last point; a count session its last
  mark; then the history. Ctrl+Shift+Z and Ctrl+Y redo. In a text field the keys are the
  field's. The toolbar carries legacy's Undo and Redo with their titles.
- "Delete all points on this sheet" no longer confirms, as legacy's single-sheet deletes
  stopped confirming once they could be undone.

**Consequences:** Every act the spec records is one undo step, version-checked. A
colleague's work is never undone unasked. Undoing a delete that took an item with
sub-items brings the item back without them; the Delete key still takes such an item with
no confirm (F7-S17), which is worth a founder look. The box selection's delete is not yet
recorded (its acts span items; each item's part would be its own step).

## D-72 — F7-S21: Resume, Start, New section and Add more points reached from the menus until the action group

**Date:** 2026-09-28
**Status:** Accepted (founder review 2026-09-28). Renumbered from D-70, which a founder decision had taken.
**Area:** Takeoff, Frontend
**Serves:** F7-S21 (and S23, P-21)

**Context:** Legacy reaches these acts in three places. A row's type glyph is Resume: a
Linear or Area item's next run joins it, a count goes on marking (`handleResumeItem`).
The action group's Start does the same, and its Resume, on a selected run, is "Add more
points": click the run's last point to go on from the end, or an edge to insert a point
and go on from there. An area's right-click menu carries "Add more points" and "New
section"; a Linear run's menu carries neither. The action group is F7-S23, and the row's
glyph belongs to the panel's presentation port (P-21); a nested glyph button cannot sit in
today's row, which is itself a button.

**Decision:** Build the acts now and reach them from the right-click menus in legacy's
words and hints: an area's section "Add more points" and "New section" (its own menu); a
Linear run's "Start" and "Resume" ("Start another section of this item", "Continue this
run from one of its ends", the action group's titles); a count's "Resume" ("Keep placing
markers on this item"); a row's "Resume" ("Resume this takeoff — continues measuring
{area|length} on this sheet"). Each Resume entry carries legacy's per-type glyph (menus
gain an icon slot; the accent is a new token, `--glyph-accent`, legacy's #e2564a). "Add
more points" is offered on a run of points, not on a rectangle, ellipse or arc, whose own
handles come with S13; its new points go into the run in one version-guarded write, and a
point inserted on an edge is written only with them, where legacy wrote it at once. S23
and P-21 move the entries to their legacy homes and keep the acts.

**Consequences:** Every act of S21 is reachable today. The menus carry four entries
legacy's do not (Start, Resume, and the row's and count's Resume) until S23 and P-21.

## D-73 — The founder's review of F7-S20 to S22: no silent loss on delete, an undoable box delete, legacy's paste dialog and Hide

**Date:** 2026-09-28
**Status:** Accepted (founder decision, 2026-09-28 review; the mechanism decided in the day)
**Area:** Takeoff, Frontend, Backend
**Amends:** D-67 (paste "New item"), D-71 (undo of an item that went)

**Context:** The founder's answers to the review: the Delete key on an item with sub-items
asks first, and undo must bring the item back **with** its sub-items; a box selection's
delete must be undoable, before S23; the report's questions: Q1 and Q2 keep legacy's, Q3
"New item" on a paste opens the New Measurement dialog prefilled, as legacy's, Q4 build
legacy's view-only Hide in F7. An item's delete cascades to its sub-items, dimensions,
shapes and estimate lines, and formulas read items by uuid, so an item made again under a
new uuid (D-71) would lose all of that.

**Decision:**
1. **A snapshot and a restore on the api.** `GET …/takeoff/item/{uuid}/snapshot` returns
   an opaque token: every row the item's delete would take (the item and its sub-items,
   their dimensions and shapes, and their estimate lines), as the database holds them,
   signed with the api's secret. `POST …/takeoff/item/restore` puts those rows back
   **under their own ids and uuids**, so formulas that read the item and the sub-items'
   parent links hold; a folder or layer deleted since is left empty, a missing sheet or
   an item already back refuses in words, and the quantities are recomputed. A token is
   bound to its workspace and project and is refused anywhere else.
2. The history (D-71) takes a snapshot just before any act that may take an item (a
   delete, an undo of the act that made it) and restores it for the reverse. Items keep
   their uuids through undo and redo; D-71's "made again under a new uuid" goes.
3. **Delete on an item with sub-items asks first**: "Delete {name}?", naming how many
   sub-items go with it and that Ctrl+Z brings them back. Without sub-items it does not
   ask, as legacy's.
4. **A box selection's delete is one undo step** across the items it touched: each item's
   part is its own transaction, in sequence (the spec's cross-item rule), undone together.
5. **Paste as "New item"** opens the New Measurement dialog prefilled with legacy's
   values ("{name} copy", the source's colour, folder and layer); Create makes the item
   and the paste lands in it; Cancel keeps the copy in hand.
6. **Hide, legacy's view-only**: an eye on each item row, the selection's "Hide"
   ("Hidden — quantities are unchanged"), and the canvas's Show All and Hide All by kind,
   all on one per-item hidden set kept in the browser (legacy's `takeoff-hidden-items-v1`).
   Nothing hidden changes a quantity. Built with the context menus (S24).

**Consequences:** No act on the takeoff page loses a sub-item, a dimension or an estimate
line without asking, and every one comes back with Ctrl+Z. A snapshot token carries the
rows' content to the browser and back; it cannot be edited, since the signature would fail.

## D-74 — The legacy comparison procedure, and what the first one corrects

**Date:** 2026-09-28
**Status:** Accepted (founder instruction, 2026-09-28; the corrections decided in the day)
**Area:** Process, Takeoff, Frontend
**Amends:** D-63 (Ortho's default)

**Context:** The founder asked for a standing comparison with live legacy before any new
screen is built, driven from the bench's Playwright container with the credentials in
`intelcost-infra/.env.legacy`. The first comparison, of the whole takeoff screen, is in
the F7 spec ("Legacy comparison, 2026-09-28"). It found that D-63 recorded legacy's Ortho
default as Off, where legacy's settings say `orthoEnabled: true` and live legacy opens
with "Ortho: On"; and that the new page overflows a 1440 × 900 window.

**Decision:**
1. [docs/legacy_comparison.md](docs/legacy_comparison.md) is the procedure; CLAUDE.md's
   session start points at it. Comparison scripts are throwaway and assert nothing: a way
   of looking, not a test (hard rule 8). In legacy, work happens in the project "Bench
   comparison".
2. Ortho defaults to **On**, as legacy's. The canvas bar moves to legacy's place, a row
   across the top of the canvas carrying the scale at its right end, and the page fits
   the window. Built with F7-S23.
3. Every difference the comparison lists goes to the block or feature named beside it.

**Consequences:** A new screen starts from what legacy shows, not only from the spec.

## D-75 — F7-S24: legacy's canvas menus, the region menu, and Hide in the browser

**Date:** 2026-09-28
**Status:** Accepted (decided in the day, within D-73 and D-74)
**Area:** Takeoff, Frontend
**Serves:** F7-S24, D-73 item 6

**Context:** Legacy's canvas right-click opens a menu by what is under it: the region menu
off every markup; the area, Linear or count-mark menu on a shape, each with its own rows,
separators, flyouts and a plain header ("{name} · Area Total: …", "{name} · Point Count:
n EA"). The new page opened one item menu for every shape (Properties … Delete item), and
nothing on an empty sheet. Legacy's Rotate Page writes the sheet's shared view rotation,
the act P-20a's Rotate Pages already built; S24 AC2 says "B's view is unchanged".

**Decision:**
- The canvas opens legacy's menus: the region menu (tool strip, Paste, Show All ▸, Hide
  All ▸, Rotate Page ▸, Zoom to Fit, Calibrate Scale, Bookmark This Page), and the area,
  Linear and count-mark menus with legacy's rows. The menu component gains flyouts, a tool
  strip, a plain header and bare dividers. The Takeoff panel's rows keep the item menu
  until P-21 ports them to legacy's row buttons.
- Rotate Page turns the sheet as legacy's does, through P-20a's rotation: a colleague sees
  the turn; no figure changes.
- **Hide** (D-73): one per-item set in this browser (legacy's `takeoff-hidden-items-v1`),
  from the row's eye ("Hide markup", "Show markup"), the area menu, the selection menu and
  Show All and Hide All by kind. A hidden item is neither drawn nor picked; its quantity
  stays.
- **Order** (Bring to front, Send to back) writes the shape's `z_index`; the canvas draws
  an item's shapes in that order.
- **Break line here** makes two runs of the item meeting at the point, in one change (a new
  row, never a sentinel; D-32).
- Absent until their features ship (D-39 Q9): Show Legend, Print This Page, Mirror Page,
  and the strip's Dimension, Highlight and Note. AC5 (no menu after a right-drag pan)
  waits for the right-drag pan itself, F7-S26.

**Consequences:** A right-click on the sheet looks and acts as legacy's. Properties,
Rename, Duplicate and the rest stay reachable from the item rows and the action group.

## D-76 — Founder click check, group A: the canvas as legacy's (wheel, fit, pans, deducts)

**Date:** 2026-09-28
**Status:** Accepted (the founder's click check, matched to legacy)
**Area:** Takeoff, Frontend
**Serves:** F7 (S23, S24, S26 brought forward), the founder's findings A1 to A9

**Context:** The founder's click check listed nine broken behaviours on the takeoff
screen. Legacy's source, its plan files and a live drive of its takeoff (the "Bench
comparison" project) say what each one does there.

**Decision:**
- **Wheel (A1):** a bare wheel zooms at the cursor, as legacy's `PdfCanvas` (`× e^(−0.0015 ·
  Δ)`, the ticks of one frame summed; Ctrl, a pinch, at 0.0025); Shift+wheel does nothing.
  The Ctrl-only wheel is gone.
- **Zoom to Fit (A2):** legacy's `fitToViewport`: the page's footprint fitted both ways
  inside the gutter, then centred. It lives where legacy shows it: the bottom-right zoom
  cluster (`+`, `−`, Zoom to fit with `Maximize2`, Zoom window with `Search`) and the
  region menu's "Zoom to Fit" with its icon. Legacy's toolbar Fit button is hidden by its
  default toolbar setting, so the toolbar shows no zoom group and no percentage.
- **Zoom window:** the cluster's fourth button; a drag draws a dashed box and the view
  zooms to it, centred on the box.
- **Open fitted (A3):** a sheet opens fitted (the canvas is mounted per sheet). Legacy
  opens at its zoom 1 (fit to width, centred) and keeps the zoom across sheets; the
  founder asked for a fit, and on a landscape sheet the two are the same picture.
- **The Scale menu (A4)** is a fixed-position popover, so the canvas bar's overflow
  clipping no longer hides it.
- **Pans (A5, legacy's `make-middle-button-and-right-button-panning-work-everywhere`):**
  the middle button pans at once; the right button pans once it has travelled 4 px, in
  every tool with a run in hand untouched, and its release opens no menu; a right-click
  that did not travel opens the menu for what is under it, and with a draw tool armed
  that is the draw menu (New Section, Stop, Discard) whether or not a run is in hand.
  Left drags pan only with Pan (H). Space+drag is gone: legacy has none. Live legacy also
  opened its draw menu after a right-drag pan; that contradicts its own plan file and is
  not copied. S24 AC5 is met by this.
- **After a commit (A6):** the tool stays armed, as it already did (legacy's; Stop,
  Discard and the second Escape put it down).
- **Ortho (A7):** legacy has no angle tolerance: `applyOrtho` always rounds to the nearest
  45° (22.5° with Alt), and snap is applied after it so a near point still wins. Ours is
  the same formula, confirmed live (a 10° band drawn horizontal). Nothing changed.
- **Deducts (A8):** drawn as legacy's engine draws them: the hole is cut out of its
  section's fill (one even-odd path), with a 5/4 dashed outline in the item's colour while
  the item is selected and a neutral hairline otherwise. A new interior deduct that
  overlaps the section's deducts is unioned with them into one hole
  (`mergeDeducts`, legacy's `mergeOverlappingDeducts`), in one undo step.
- **Switching workspace (A9):** the header's switcher goes to the dashboard, as legacy's
  (`/app?workspace=`). Before, the project route's guard switched straight back.

**Consequences:** The canvas's zoom, pans and deducts read and act as legacy's. S26's
right-drag pan is done here; its spec row says so.

## D-77 — Founder click check, group B: legacy's item rows, panels and Properties (P-21 brought forward)

**Date:** 2026-09-28
**Status:** Accepted (the founder's click check, matched to legacy)
**Area:** Takeoff, Frontend
**Serves:** P-21, F6 (Properties), F5 (Sheets panel), the founder's findings B10 to B17

**Context:** The founder's click check found the Takeoff and Sheets panels short of legacy's:
no type glyph on a row, no More actions, no search box, no left collapse tab, no resizing,
no Bookmarks panel, and Properties without its Sub-items bar or the count symbol tiles.
Legacy's `ItemRowShared` is one row renderer for both panels; its source, plan files and a
live drive say what each control is and does.

**Decision:**
- **One row for both panels** (`ItemRow.tsx`, legacy's `ItemRowShared`): a 20 px line with
  the chevron (sub-items), the **type glyph** tinted the item's colour (a click **resumes**
  the takeoff, legacy's "Resume this takeoff — continues measuring {area|length|count} on
  this sheet"), the name, the lock mark (an amber disc with the holder's initial), the
  quantity, the unit, and on the right the colour dot (a popover of legacy's 16 presets and
  Custom), the eye ("Hide markup", "Show markup", shown on hover or while hidden) and
  **More actions** (⋮). A selected row is `--row-selected`. Sub-item rows: "↳", the name,
  the "err" chip, the quantity, the unit, a pencil ("Edit sub-item (manage all sub-items)")
  and a trash ("Delete sub-item") on hover. Folder rows: legacy's amber Folder glyph, the
  name, the count badge, the "×N" badge, "Add sub-folder" and ⋮ on hover.
- **Clicks (B10), legacy's:** a single click selects; a **double-click on the row opens
  Properties** (two clicks within 450 ms count); a double-click on the **name** renames in
  the Takeoff panel and opens Properties in the Sheets panel. The inline properties pane is
  gone: legacy has none, Properties is the dialog. Lock and Override quantity move to the
  ⋮ menu; Notes has no place in legacy's Properties and is not shown.
- **More actions (⋮)**, and the row's right-click, in legacy's order with what exists:
  Properties, Override quantity, Duplicate, Move to layer ▸, Create sub-item (or Edit
  sub-items), Lock (ours: no inline pane holds it now), Delete ("Delete on this sheet" in
  the Sheets panel). Link Screenshot and History (F11), Link assembly and Save as
  assembly… (P-09), Add cost component and Costs… (estimating) are absent until their
  features ship.
- **Properties (B12, B13):** a collapsible **Sub-items** bar, closed by default, with
  "Create sub-item" (or "Edit sub-items" and a read-only list of name and quantity) opening
  the sub-items editor over the dialog; for a count, legacy's **Symbol** tile row (the
  four dimension-carrying shapes pinned, then the chosen ones, eight slots) with the
  pencil's "Choose symbols" popover, kept per browser (legacy keeps it on the profile;
  an account-wide store waits for F7-S27's settings).
- **Search (B14):** "Search items…" over item names; folders shown only with a match and
  held open; `No items match "{search}"`; "Clear search".
- **Panels (B15, B16, B17):** legacy's edge tabs on the canvas, "Hide panels" on the left
  (the Sheets column with Bookmarks and Snippets) and "Hide Takeoff panel" on the right,
  16 × 3 units each; the left column resizable by its separator ("Resize sheets panel",
  180 to 520 px, default 280, arrow keys 16 px, kept as `takeoff-left-column-width-v1`);
  the Takeoff panel resizable against the canvas (22 to 55 % of the row, default 28 %,
  kept per browser); Sheets over **Bookmarks | Snippets** in a 60/40 split. Bookmarks
  lists the bookmarked sheets ("A-101 – Name", the star, Open sheet and Remove bookmark;
  its Duplicate, Print, Open in new tab, Sheet properties and Preview window wait for
  their owners); Snippets is the Snapshot tool's, **F11**, and its tab says so.
- The Takeoff panel header follows legacy's: the title, Collapse one level and Expand
  one level, New folder. "Assemblies" stays with P-09.

**Consequences:** P-21 is built here rather than after F7; FEATURES.md and MANAGER.md say so.
The Takeoff panel is the tree, as legacy's; every field of an item is reached through
Properties or the ⋮ menu.

## D-78 — The shared quantity table runs after every group (amends D-70)

**Date:** 2026-09-28
**Status:** Accepted (the founder, click check round 2)
**Area:** Process
**Serves:** CLAUDE.md hard rule 8, D-68, D-70

**Context:** D-70 barred every scripted check, and hard rule 8 named `quantity-table.sh`
among them. The founder wants the table kept: it compares the api's and the browser's
engines against each other and against hand-worked answers in seconds, and is how a
quantity regression shows at once.

**Decision:** The shared quantity table (`intelcost-infra/quantity-table.sh`) is not covered
by the no-scripted-tests rule. It runs after every group or block, after the gates and
before the Playwright MCP smoke test, and its line is reported. Everything else in D-70
stands.

**Consequences:** CLAUDE.md hard rule 8 and "Development speed mode" say so.

## D-79 — Round 2, group A: no scrollbars, box-drag, deselect, Ortho tolerance, the takeoff settings store

**Date:** 2026-09-28
**Status:** Accepted (the founder's round-2 findings, matched to legacy); the Ortho tolerance
is the founder's own addition
**Area:** Takeoff, Frontend
**Serves:** F7 (S26, S27), the founder's round-2 findings A1 to A6

**Context:** Legacy's source, plan files and a live drive of "Bench comparison" answered
each finding: its canvas is `overflow: hidden` with a pan offset and shows no scrollbars;
the wheel holds the point under the cursor; a left press-drag past 5 px with Linear,
Segment or Area armed (any mode but Arc, on the first point only) places a rectangle
(Linear: a closed box run), with a green dashed rubber band; a right-drag pans; a
right-click opens the draw menu New Section, Stop, Discard; a click on empty sheet with
Select lets the item go, Escape does not; Enter commits and keeps the tool, Escape commits
a run with enough points (drops one without) and keeps the tool, a second Escape puts it
down; auto-merge unions only the same item's sections and never touches another item.

**Decision:**
- The canvas draws **no scrollbars** (`scrollbar-none`); the scroll container stays, so
  the pan is still bounded by the page and its gutter where legacy's is not (left, below).
- **Box-drag** in Point to Point, Rectangle and Ellipse modes and for Segment, never Arc,
  with legacy's rubber band (`--glyph-start`, dashed 6/4, filled for an area only).
- The draw menu is legacy's three: **New Section, Stop, Discard** ("Close" removed).
- A click on empty sheet with Select **clears the item selection** as well as the section
  and box; Escape clears a box selection only, as legacy's.
- Enter, Escape and the merge already matched legacy; unchanged.
- **Takeoff settings** are this person's on this device, in legacy's shape and key
  (`takeoff.settings.v1`, `features/takeoff/settings/settings.ts`), separate from the
  workspace's settings on the api. Group D builds legacy's dialog on it.
- **Ortho tolerance** (the founder's): `snapping.orthoToleranceDeg`, default 15, 1 to 45:
  Ortho pulls the pen onto its 45° (or 22.5° with Alt) step only within that many
  degrees; further off the point is free. Snap still wins after it.

**Left different:** legacy's pan is unbounded (the page can be dragged fully away); ours
stops at the page's gutter because the canvas is a scroll container, and moving it to a
transform is a rewrite of the raster windowing (D-42) for no measuring gain. Legacy's zoom
buttons do not hold the view's middle (the page jumps between regimes); ours hold it.

**Consequences:** S26's box-drag and S27's settings store land here.

## D-80 — Round 2, group B: legacy's toolbar, action group states, sheet stepper, takeoff header

**Date:** 2026-09-28
**Status:** Accepted (round 2, matched to legacy); decided overnight, pending founder review
where marked
**Area:** Takeoff, Frontend
**Serves:** F7 (S23, S26), the founder's round-2 findings B7 to B11

**Context:** Legacy's source and a live drive (at 1440 and 2000 px) settled each finding.
Its toolbar row sizes every tool icon from Settings › Toolbar (24 px, 48 px buttons, 11 px
labels at the default "lg"); Linear and Area keep their own glyph and name, with a 16 px
caret beside them. The action group's "Start" is a plain green disc in legacy too, drawn at
24 px like every other icon; ours was 22 px beside 16 px icons, so it read as a
placeholder. At 1440 px legacy folds the group under "More ▾"; ours has fewer tools and
shows it.

**Decision:**
- **Toolbar:** legacy's glyphs (Pan, Select, Undo, Redo, Scale, Linear, Segment, Area,
  Count), `TB_BASE` buttons, `--tool-active`/`--tool-hover`, clusters on the background,
  and the row's size rule from the settings store (D-79); the mode carets with legacy's
  menu (a glyph per mode, its hint, the current marked). Tools hidden in Settings ›
  Toolbar are not shown.
- **Action group:** every icon at the toolbar's size; Delete in the text colour (its
  glyph's lid is the red); no "Close" (legacy never passes it); the mode as legacy's split:
  the current mode's glyph and name, then the caret.
- **Action group states, legacy's order:** multi, subtract, **draw** from the moment the
  naming dialog is confirmed (not the first point) and while an item is in hand, then
  **select** for a selected item whatever the tool, then **armed**, else none.
- **The item's session (decided overnight, pending founder review):** Enter, or an Escape
  that ends a run, ends the item's session with the tool still armed (legacy's), except
  after a new item's first run, whose session legacy re-arms once the item exists; the
  next run opens the naming dialog after the draw ("post" mode) and becomes a new item. An
  Escape with nothing in hand ends a session first, then puts the tool down. A Resume keeps
  the tool armed on the item (it used to put the tool down after one run).
- **Sheet stepper** (`SheetStepper.tsx`), bottom-left: previous and next in the Sheets
  panel's order, legacy's titles.
- **Takeoff header** (`TakeoffHeader.tsx`): the takeoff screen shows legacy's own bar, not
  the app's: Open (legacy's "Open takeoff" list), "{project} · Takeoff", the reconnecting
  note, the workspace switcher when there are several, the theme toggle (legacy's
  `intelcost-theme`, the `dark` class, `core/theme.ts`), and **Dashboard** ("Go to
  Dashboard"). The email-verification banner is not shown there. Settings joins with
  group D. Share, Upgrade and the work timer wait for their features.

**Consequences:** the takeoff page no longer shows the app header or the breadcrumb; the
Dashboard button and the workspace switcher are in its own bar.

## D-81 — Round 2, group C: legacy's row menu, no totals footer, bookmarks by date

**Date:** 2026-09-28
**Status:** Accepted (round 2, matched to legacy)
**Area:** Takeoff, Frontend, API
**Serves:** P-21, the founder's round-2 findings C12 to C15

**Decision:**
- The row's right cluster reads, left to right, the colour dot, the eye, **⋮** (legacy's
  visual order; ⋮ is the last).
- The row menu (⋮ and right-click alike) is legacy's: Properties, Override quantity,
  Duplicate, Move to layer ▸ (a flyout, ✓ on the item's layer), Create sub-item, Delete
  ("Delete on this sheet" in the Sheets panel), each with legacy's lucide glyph. Edit
  vertices, Resume, Lock and "Delete last shape" are the canvas's, not the row's. Link
  Screenshot and History (F11), Link assembly and Save as assembly… (P-09) and Costs…
  (F9) wait for their features.
- The Takeoff panel's totals footer is gone (legacy has none).
- The sheets list returns `bookmarked_at` (the api already stamped it); Bookmarks lists
  newest first.

## D-82 — Round 2, group D: legacy's takeoff Settings dialog, separate from the workspace's

**Date:** 2026-09-28
**Status:** Accepted (round 2, matched to legacy)
**Area:** Takeoff, Frontend
**Serves:** F7-S27, the founder's round-2 finding D16

**Context:** Legacy keeps takeoff preferences per person and per device
(`takeoff.settings.v1`), in a "Settings" dialog from the takeoff header's gear: a rail of
ten sections, a draft that only Save writes, "Reset this section", "Restore all defaults"
and "Close without saving?". Workspace settings are a separate page on the server.

**Decision:**
- `TakeoffSettingsDialog.tsx` rebuilds it section for section in legacy's words, controls,
  defaults and ranges (General, Hover, Mouse, Cursor, Snapping, Takeoffs, Trace, Toolbar,
  Panels, Rendering), on the D-79 store, opened by the header's gear. The workspace's
  settings pages are unchanged and separate.
- **In force now:** Mouse (zoom speed, invert, middle- and right-button pans, auto scroll's
  delay, speed and edge band); Snapping (Snap and Ortho starting states, the Ortho
  tolerance); Takeoffs (default Linear and Area modes, Auto Merge, the duplicate's "(2)" or
  "(copy)"); Toolbar (icon size, hidden tools); Panels (the three panels; the edge tabs
  write them back, as legacy's); General (quantity decimals and panel text on item and
  sub-item rows, the Sheet Naming Format). The canvas bar's Auto Merge and Auto Scroll
  are these settings, as legacy's.
- **Kept for their features, shown as legacy's:** Hover (S25, tonight), Cursor (S26,
  tonight), Trace (F12, marked so), Snap PDF, the legend, Ctrl+F browser find, main tab
  text size, two-line sheet names, panel text for folder, sheet and bookmark rows, and
  Rendering.
- Legacy's Ortho hint says "horizontal / vertical"; it steps by 45°, and ours says so.

## D-83 — Round 2, group E: the whole takeoff page against legacy's

**Date:** 2026-09-28
**Status:** Accepted (round 2, matched to legacy); decided overnight, pending founder review
**Area:** Takeoff, Frontend
**Serves:** the founder's round-2 finding E17

**Context:** Both pages screenshotted at 1440×900 in the same project state, and their
headers, tabs, toolbar, panels, canvas corners and footers listed side by side.

**Decision (fixed):** legacy's workspace tab strip under the header (`TakeoffTabs.tsx`,
"Takeoff" until the next tab's screen exists, sized by Settings › General); the Sheets
header ("Sheets", Collapse one level, Expand one level, "Add pages or folder", Panel
options) on legacy's muted band, and the Takeoff header on the same band; the open
sheet's items shown in the Sheets panel; the Takeoff panel's width taken from the room
right of the Sheets column (28%, legacy's 324 px at 1440); the status bar always there;
row quantities and units at legacy's 9 px, names never narrower than 50 px.

**Left different, with reasons:** the toolbar's Print, Find Text, Dimension, Snapshot, Dock,
Overlay, Highlight, Note, Fullscreen and Split (their features: F11 markup and evidence,
Find Text, print and view features, none built); the tabs Earthwork (F12), Collaborator
(F11), Estimating (F9, added when its screen exists) and Community; "Snap PDF: Off" in the
canvas bar (Snap PDF not built); "Takeoff | Assemblies" (P-09); the header's Share,
Upgrade and work timer; the Sheets panel's folder actions (New subfolder, Move folder to…,
Rename folder, Delete folder) and dotted tree guides (F5's Sheets panel follow-ups, as the
first comparison listed); the sheet row's menu entries owned by later features.

## D-84 — F7-S25 to S27: legacy's hover panel and highlight, reticle, keys

**Date:** 2026-09-28
**Status:** Accepted (matched to legacy); decided overnight, pending founder review where
marked
**Area:** Takeoff, Frontend, API
**Serves:** F7-S25, S26, S27

**Decision:**
- **Hover (S25), legacy's `PdfCanvas`:** with Select or Pan and nothing in hand, the markup
  under a pointer resting within **5 px** for the Hover delay (1 s) is described in a panel
  (`HoverPanel.tsx`): the item's name, "This section" (an area net of its deducts, "This
  deduct" for a hole), the height row on a run with a height, "This sheet (n)" when the
  sheet holds more than one run, then the fields ticked in Settings › Hover in legacy's
  order and words, "Item total (n sheets)", Type, Unit, Folder, Sheet and "Marked by"
  (the api now returns each item's maker's short name, `created_by_name`). Unscaled:
  "Sheet not scaled — measurements on it count as 0." It sits 12 px right of the pointer,
  above it clear of the reticle, below it near the top; moving 5 px hides it at once. An
  area run under the pointer is outlined at once in the highlight colour over a white
  casing, never on the selected item, never mid-draw.
- **Decided overnight:** the panel is hidden the moment another tool is picked or a pan
  begins (legacy leaves a stale panel up there); the "Section #n of m" count is legacy's
  (n counts the sheet's runs with deducts, m the sections), kept as is.
- **Reticle (S26 AC4):** legacy's `paintCursor` on its own Canvas 2D layer over the canvas
  (`Reticle.tsx`), every tool but Pan, the pointer hidden under it; every Cursor setting
  drives it. S26 AC1 to AC3 landed with D-79 and D-82.
- **Keys (S27):** legacy's `shortcuts.ts`: V, H, L, A, N in either case, never while typing
  or with Ctrl, Cmd or Alt; with Linear, Area or Segment armed, S and O toggle Snap and
  Ortho and A arms an arc (Area when no point is placed yet). S (Snapshot) and D (Snap
  PDF) wait for their features; legacy's toolbar title "Dimension (D)" is its own bug (D
  is not bound there).

## D-85 — F7-S28 to S30: colleagues' cursors drawn, drafts as their shapes, the two-window check

**Date:** 2026-09-28
**Status:** Accepted; decided overnight, pending founder review where marked
**Area:** Takeoff, Frontend, API (realtime)
**Serves:** F7-S28, S29, S30; D-33, D-38

**Context:** Legacy draws no colleague's pointer and no live draft (its realtime is
committed rows only); these are the founder's F8 (D-33, D-38) carried to the new canvas.
Pointers were being sent but never drawn.

**Decision:**
- **Cursors (S28):** `CursorLayer.tsx` draws each colleague's pointer in their colour with
  their "Sara W." tag, in sheet space; the five Collaboration preferences apply (show
  cursors, names always / on hover / off, others' work all / fade / only mine, which keeps
  one's own other tabs).
- **Drafts (S29):** a colleague sees the shape it will become: a box being dragged, and a
  rectangle, an ellipse or an arc in its own mode, as their outline; a run as its points.
  A deduct being cut carries `deduct` on the draft frame (api `DraftFrame`, new, default
  false) and draws hatched in its colour.
- **Two windows (S30), decided overnight:** driven with A on the api and B (a second
  member) on api-b, so every update crossed Redis: A's pointer and tag, A's box outline and
  tag, the saved shape, a deduct's hatched draft and its figure dropping on B, and A's
  undo reaching B; a count marked by both at once ended on the same total in both windows.
  The vertex conflict, the six-section paste and the three-item box delete were not driven
  tonight (F8's fixtures drove the conflict before the archive).

## D-86 — F7-S31: Crop as New Page, legacy's placement and name, cropped on the api

**Date:** 2026-09-28
**Status:** Accepted; decided overnight, pending founder review
**Area:** Takeoff, Frontend, API (drawing)
**Serves:** F7-S31

**Context:** Legacy crops in the browser with pdf-lib (`createCroppedPageFile`): a
Select-tool drag of 25 px or more over empty sheet opens its region menu, and "Crop as New
Page" uploads the region as a new project file, makes it a sheet at the end of the source's
folder named "{source name} (Crop)", with no sheet number and **no calibration**, and opens
it. The spec's AC1 and AC2 asked for the crop to carry the source's scale and sit right
after the source. After D-03 the browser never writes a file or a row itself.

**Decision (decided overnight, legacy's behaviour):**
- `POST …/drawing/sheet/{uuid}/crop` with `{box}` in page fractions, capability Upload
  documents. PyMuPDF copies the page alone and sets its crop box to the region, so text and
  linework are kept (Find Text and Snap PDF still work), as legacy's clip kept them.
- The crop is a project file in the project's root, loaded like any other; its sheet moves
  to after the last sheet of the source's folder, named `"{sheet_name or base} (Crop)"`,
  sheet number empty, uncalibrated. AC1 and AC2 are superseded by legacy's placement.
- On the canvas, a Select box that closes on no markup opens the region box menu at the
  pen; a box that encloses markups still selects them (S14). Of legacy's region entries
  (Page Name, Sheet #, Scale, Ask AI, Extract Schedule, Auto Count, Copy as Text / Image,
  Search as Text, New Snapshot), only Crop is built; the rest belong to later features.
- Legacy's toasts, word for word: "Cropped page added" with "Text and vectors are kept, so
  Find Text and Snap PDF still work. Calibrate it before measuring.", or "Could not crop
  the page" with the reason. The new sheet opens.
