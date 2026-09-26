# F8: Realtime foundation: socket, auth, Redis fan-out, presence and collaboration

_Spec for the `MANAGER.md` F8 row (backlog P-07). Builds the transport **D-13** chose:
a WebSocket on the api, Redis pub/sub fan-out, events published after commit (**D-20**),
writes staying on REST. Adds the workspace collaboration mode (**D-32**) and the live
in-progress drawing channel (**D-33**). Maps all thirteen legacy channels in
[PARITY.md, "Every place legacy uses Supabase realtime"](../PARITY.md#every-place-legacy-uses-supabase-realtime)
onto the new transport, and wires the events F3 and F4 already named so two windows
update each other._

**Board:** [../../MANAGER.md](../../MANAGER.md) · **Rules of engagement:**
[../../DECISIONS.md](../../DECISIONS.md) (D-10, D-13, D-20, D-32, D-33) · **Parity:**
[../PARITY.md](../PARITY.md) · **Inherited from:**
[auth_parity_tasks.md](../archive/auth_parity_tasks.md) (the one clearing point),
[workspace_roles_tasks.md](../archive/workspace_roles_tasks.md) (F3 events, S8 AC1),
[projects_tasks.md](../archive/projects_tasks.md) (F4 events)

_Written 2026-09-25 from legacy `intelcost/` at `12dd119b`. Status: **questions answered
2026-09-25, D-32 and D-33 logged. Block A (S1 to S4) built, checked and pushed. Blocks
B and C in build.**_

## Progress

| Block | State | Proof |
|---|---|---|
| **A: S1 to S4** | Built and driven, 2026-09-25. **Checked by the founder** (sign out, api outage and reconnect) and pushed. The email-prefix name fallback agreed | `browser/f8-s1` 4/4, `f8-s2.sh` 4/4 (`f8-s2` 3/3 and `f8-s2-outage` 1/1, which carries S1 AC5), `f8-s3.sh` 3/3 on 2-minute tokens, `f8-s4` 4/4. Gates: ruff, ruff format, mypy (78 files), lint, typecheck, build. Full regression: see the report. |

**Found while building Block A:**
- **The bench api could not close a socket cleanly.** Its container ran `sh -c "alembic … &&
  uvicorn …"`, so `sh` was PID 1 and swallowed SIGTERM; Docker killed uvicorn ten seconds
  later and every socket died 1006 instead of hearing 1012. The command now `exec`s
  uvicorn, and a stop takes 1.3 s instead of 10. **Production has the same trap**, so it
  is point 10 of the Caddy note.
- **A failed refresh cleared storage but not the screen.** `clearTokens()` had no
  listeners, so a tab whose refresh failed kept its signed-in screens until its next
  click. `tokens.ts` now notifies, and the session provider signs the tab out on a clear.
  The socket closes from the same notification (F2's forward dependency, discharged).
- **The refresh schedule reads `ready.expires_in_ms`**, not the token's `exp`. The api
  computes it from the token it just verified, so the app never parses a JWT.
- **A blocked refresh signs the tab out at the proactive refresh**, a minute before the
  api's 4401 would arrive, because `client.ts` already clears the session when a refresh
  cannot complete (F2's behaviour, unchanged). The server's 4401-at-expiry is proved on a
  socket that never refreshes. S3 AC2 is worded to match.
- **Two new close codes** the api uses and the app reads: 4408 (20 s of silence) and
  1003 (a binary frame). And one frame: `error`, for a frame that could not be read,
  answered without closing.
- **Reconnecting after a restart takes the api's start time plus one backoff step.**
  The bench api needs about 9 s to start; by then the backoff is at 4 s, so the tab is
  back about 16 s after the close. A stop and a restart both send 1012, so the client
  cannot shorten one without the other, and S2 AC3 fixes the backoff. S1 AC5 is worded
  to match.

---

## Founder answers, 2026-09-25

| # | Question | Answer | Where |
|---|---|---|---|
| Q1 | Is the soft-lock advisory or enforced? | **Neither, as asked: a workspace collaboration mode (D-32).** Owner or admin sets it in Settings > Collaboration, one rule for everyone. **Work together** (default): concurrent edits of one item; shapes are separate rows, so adds never overwrite; a concurrent edit of the same shape is refused by `geometry_version` with "{name} just changed this shape, showing their version" and the shape refreshes. **Warn me**: the same, plus a banner "{name} is also working on this item". **One at a time**: atomic Redis claim (`SET NX`, TTL, heartbeat), others get 409 "{name} is editing this item right now" and view-only until it clears, seconds after the holder's last heartbeat. No "Ask to join". **Confirm shapes are separate rows, and fix any whole-item read, modify, write in F8.** | S9 to S12 |
| Q2 | Where is the claim driven? | As recommended: on today's takeoff page. | S12 |
| Q3 | Channel 1 on today's page? | **Replaced by a new behaviour (D-33): live in-progress drawing.** Others see a colleague's line, area or count growing in the colleague's colour with a name tag. Ephemeral over the socket, throttled, becomes a saved shape on finish. **F8 builds the channel; F5, F6 and F7 render it.** Per-user preferences in a new "Collaboration" section of the user's settings: drawing in progress (on, off), names (always, hover, off), cursors (on, off), others' work (all, only mine, fade others), colour others by (person, item colour). Name format everywhere on the canvas and in lock or conflict messages: "Sara W.", or first name alone if there is no last name. Channel 1's saved-change events stay F5, F6 and F7's. | S13, S14; MANAGER F5, F6, F7 |
| Q4 | A second api and app on the bench? | As recommended: `api-b` on 8010 and `app-b` on 5174, `realtime` profile. | S5 on |
| Q5 | A removed member's open tab? | As recommended: toast, then their next workspace. | S15 |

The four design calls in the first draft stand as approved: `kind` on
`workspace.member.changed`, the new `workspace.invitation.changed`, no
`workspace.activity.appended`, and refetch on focus kept as the at-most-once safety net.

### The row-per-shape audit (Q1)

**Confirmed: every shape is its own row.** `takeoff_geometry` holds one shape per row
(`vertices_json` with its `shape_meta`), and "Add a shape" inserts a new row through
`POST …/item/{item}/geometry`. No path in the api or the app reads, modifies and writes a
whole item's vertices. Legacy's hazard (Resume appending to one run's `vertices_json`)
does not exist here.

**Three paths still decide something about the whole item from a stale view.** Each loses
data when two estimators work one item at once, which Work together now makes the
normal case. All three are fixed in **S9**:

| # | Path | What goes wrong |
|---|---|---|
| 1 | `service.recompute_item`, run by `add_geometry`, `update_geometry` and `delete_geometry` | Sums the item's shapes from the transaction's own view, then writes the total onto the item row. Two adds at once each sum a set missing the other's shape, and the second commit wins: **the stored quantity is short one shape**, while both shapes exist. |
| 2 | `service.update_geometry` | Compares `geometry_version` in Python, then writes. Two edits of one shape in the same instant can both pass the check, and the second silently overwrites the first. **The guard is not atomic.** |
| 3 | `useItemMutations.removeGeometry` (app) | Decides "this is the last shape, so delete the item" from the client's copy of the item. If a colleague added a shape since, **Delete last shape deletes the whole item, colleague's shape included.** |

And one gap: a geometry does not record who last changed it, so the conflict message
cannot name anyone yet.

---

## The problem

D-03 removed Supabase and with it the only realtime channel the product had. D-10 makes
multi-estimator editing a requirement, and D-13 chose its replacement. Every takeoff
write path from F5 on waits for this.

F3 and F4 shipped with their events **named and not emitted**, and each "another tab
sees it" criterion met by a refetch on window focus. F8 makes it live.

### What legacy does

**Thirteen channels**, twelve `postgres_changes` subscriptions and one presence channel.

- `src/hooks/useTakeoffRealtime.ts` (channel 1). Every event runs through a
  version-guarded apply, then a debounced (150 ms) full-project refetch. On every
  re-subscribe after the first it refetches the whole project. Postgres Changes never
  replays.
- `src/hooks/useTakeoffPresence.ts` and `src/lib/takeoff/presence/gate.ts` (channel 2).
  One presence entry per tab while the user is marking an (item, sheet); others are
  blocked from Resume and delete. Reconnect backoff 1, 2, 4, then 8 s with up to 250 ms
  jitter; `presenceLockFailed` after three failed subscribes. **No toast asks anyone to
  reload.**
- **Echo suppression** (`src/lib/takeoff/realtime/writeTokens.ts`): a key per write,
  consumed on the echo, an LRU of 512, never age-expired.
- **Auth priming, and its scars.** Two fixes (011a, 011c) are a rebuild on token refresh
  racing the first subscribe. **Kept here as a rule: a refreshed token re-authorises the
  open socket. It never rebuilds it.**

### What exists today

| Piece | State |
|---|---|
| Transport | None. `app/features/realtime/` and `src/core/realtime/` do not exist. |
| `core/outbox.py` | `after_commit` and `drain` exist; every route drains after commit. **`drain` is sync.** |
| Workers | Commit on `SyncSessionFactory` sessions and **never drain**. |
| Membership check | Inside `current_workspace`, bound to a path parameter through `Depends`. |
| Access token | 30 minutes. The app refreshes **only on a 401**, so an idle tab never refreshes. |
| `clearTokens()` | The one clearing point. No listeners. |
| Query refetch | `refetchOnWindowFocus` false globally, true per F3 and F4 hook. |
| Event sites | Two marked in code (`project.folder.changed`, `project.file.changed`). |
| Dependencies | `uvicorn[standard]` ships `websockets`; `redis` ships `redis.asyncio`. **No new dependency** on either side. |
| CORS | `allow_headers=["*"]`: `X-Write-Token` and `X-Client-Id` need no change. |
| Bench | One api process (`--reload`), no Caddy, Redis 8. |
| Takeoff model | Row per shape. Three stale-view paths (above). |
| Names | `user.full_name` is one string. Nothing makes "Sara W." yet. |

---

## Design

### Where the code lives (D-13)

| Repo | Module | Holds |
|---|---|---|
| api | `app/features/realtime/routes.py` | The socket endpoint. Thin. |
| api | `app/features/realtime/hub.py` | This process's sockets, their topics, the Redis subscriber that feeds them. |
| api | `app/features/realtime/publish.py` | `publish(...)`, registered on the outbox. The only way an event leaves. |
| api | `app/features/realtime/presence.py` | Focus, claims and their TTLs (S11). |
| api | `app/features/realtime/schemas.py` | Every frame, both directions. |
| api | `app/core/names.py` | `short_name(user)`: "Sara W.". The one source (D-33). |
| app | `src/core/realtime/socket.ts` | The only module that opens a WebSocket. |
| app | `src/core/realtime/write-tokens.ts` | This tab's own tokens. |
| app | `src/core/realtime/provider.tsx`, `use-realtime-topic.ts`, `use-realtime-status.ts`, `use-item-presence.ts`, `use-drafts.ts` | The React surface. |
| app | `src/features/workspace/realtime.ts`, `src/features/project/realtime.ts` | Each feature's event → query-key map. `core` never imports a feature's keys. |

### The wire

One endpoint, `wss://api.intelcost.io/api/realtime` (`ws://localhost:8000/api/realtime`
on the bench). One socket per tab. JSON text frames. **The token never goes in the URL.**

**Client to server**

| Frame | Meaning | Block |
|---|---|---|
| `{type: "auth", token, client_id}` | First frame, within 5 s, or close 4401. Re-sent after every refresh. `client_id` is a per-tab uuid, never persisted. | A |
| `{type: "join", topic}` / `{type: "leave", topic}` | Subscribe to or drop a topic. | A |
| `{type: "ping"}` | Every 5 s. Also renews this socket's focus and claim. | A |
| `{type: "item.focus", topic, item_uuid, sheet_uuid}` / `{type: "item.blur", topic}` | "I have this item in hand" (a tool armed on it, vertices being edited). | C |
| `{type: "draft", topic, item_uuid?, sheet_uuid, tool, points, done?}` | The in-progress shape, at most 10 per second. `done` ends it. | D |
| `{type: "cursor", topic, sheet_uuid, x, y}` | Pointer position in normalised sheet coordinates, at most 10 per second. | D |

**Server to client**

| Frame | Meaning | Block |
|---|---|---|
| `{type: "ready", user_uuid, name, colour, expires_in_ms}` | Auth accepted, and after each re-auth. `name` is "Sara W.", `colour` a palette index from the user uuid. | A |
| `{type: "joined", topic}` / `{type: "refused", topic, reason}` | The membership answer, in the api's words. | A |
| `{type: "revoked", topic, reason}` | Membership went away mid-session. | A |
| `{type: "event", v: 1, id, topic, name, payload, write_token, at}` | A committed change. `payload` is uuids and a `kind`, **never row data**. | B |
| `{type: "presence", topic, entries: [...]}` / `{type: "presence.changed", topic, entry, ttl_ms}` | Who has which item in hand, snapshot on join then deltas. `entry` is `{item_uuid, sheet_uuid, user_uuid, client_id, name, colour, exclusive}` or its removal. | C |
| `{type: "focus.granted" \| "focus.refused", item_uuid, holder?}` | In One at a time, the answer to this socket's claim. | C |
| `{type: "draft" \| "cursor", ..., user_uuid, client_id, name, colour}` | A colleague's frame, stamped by the server. Never sent back to its own socket. | D |
| `{type: "pong"}` | Reply to ping. | A |

**Also server to client:** `{type: "error", reason}` for a frame that could not be read.
The socket stays open.

**Close codes:** 4401 not authenticated or token expired · 4403 origin refused (a 403 at
the handshake) · 4008 fell too far behind · 4029 too many sockets for this user · 4408 20
s of silence · 4413 frame too large · 1003 a binary frame · 1012 server restarting · 1000
signed out.

**Topics are workspace-first**, as storage keys are:
- `ws:{workspace_uuid}`: every workspace and project event.
- `ws:{workspace_uuid}:project:{project_uuid}`: presence, drafts, cursors, and later every
  takeoff and estimating event.

**Limits:** inbound frames 64 KB (a draft carries its points) · 10 sockets per user · 256
queued outbound frames per socket, then close 4008 · 20 s of silence closes (four missed
pings) · draft and cursor frames above 10 per second per socket are dropped, not queued.

### Events

A service never publishes. It registers:

```python
realtime.publish(session, workspace.uuid, "project.updated", {"project_uuid": ..., "fields": [...]})
```

which is `outbox.after_commit(...)` underneath (D-20). The `write_token` comes from the
request's `X-Write-Token` header through a context variable. Delivery is at-most-once;
S8's refetches make a lost event survivable.

### Collaboration mode (D-32)

`workspace.collaboration_mode`: `work_together` (default), `warn`, `one_at_a_time`.

| | Work together | Warn me | One at a time |
|---|---|---|---|
| `item.focus` | Recorded, not exclusive | Recorded, not exclusive | **Exclusive claim**, `SET NX PX 15000` |
| Others see | The row's name tag | A banner, "{name} is also working on this item" | The item view-only, "{name} is editing this item right now" |
| Api on someone else's write | Accepts; the same-shape guard decides | Same | **409** "{name} is editing this item right now" |
| Same shape, same instant | 409 "{name} just changed this shape, showing their version"; that shape refreshes | Same | Cannot happen: only the holder writes |

- **Keys:** `rt:ws:{w}:focus:{project}:{item}:{sheet}:{client}` for a non-exclusive
  focus, `rt:ws:{w}:claim:{project}:{item}:{sheet}` for an exclusive claim. Both TTL
  15 s, renewed on every ping (5 s). A claim clears on blur, on socket close, or 15 s
  after the last heartbeat.
- **Release is compare-and-delete** (a short Lua script), so a stale release cannot drop
  a claim someone else now holds.
- **One focus per socket.** Focusing a second item blurs the first.
- **The api checks the claim** on every item write (patch, override, delete) and every
  geometry write (add, update, delete), comparing the holder's `client_id` with the
  request's `X-Client-Id`. No claim means no refusal. **If Redis cannot be read, the
  write is accepted and logged**: a takeoff never stops because a claim cannot be looked
  up.
- **Changing the mode** takes effect on the next focus. Anyone already focused keeps what
  they have until they blur; the same-shape guard covers the overlap.
- Every change broadcasts `presence.changed` with `ttl_ms`; clients drop an entry whose
  deadline passes unrenewed, so a dead process's entries clear on every screen with no
  keyspace notifications and no clock agreement.

### Live drawing (D-33)

- The drawing tab sends `draft` frames while a shape is in progress, throttled to 10 per
  second, and `done: true` when it finishes or is cancelled. The finished shape is saved
  through REST as today; its saved event (F5 to F7) replaces the draft on other screens.
- The server stamps `user_uuid`, `client_id`, `name` and `colour`, forwards through Redis
  to the project topic, and never stores anything. A socket that closes mid-draft sends
  `done` for it on the server's behalf.
- `cursor` frames work the same way.
- The five display preferences live on the user (`user.collaboration_prefs`, patched
  through `PATCH /api/auth/me`) so they follow the person to another machine, and are
  read through `useCollaborationPrefs()`. F5 to F7 honour them when they render.

### Names (D-33)

`short_name(user)`: split `full_name` on whitespace. Two or more parts: first part, a
space, the first letter of the last part, a dot ("Sara W."). One part: that part
("Sara"). **No name at all: the part of the email before the `@`** (a call made here; the
founder's rule covers the other two; agreed 2026-09-25). Used by the socket frames and by every lock or
conflict message.

---

## Realtime events: the thirteen legacy channels

| # | Legacy channel | New topic | Event(s) or frames | Payload | Emitted by | In F8 |
|---|---|---|---|---|---|---|
| 1 | `takeoff-sync-${projectId}` | project | `takeoff.item.changed`, `takeoff.geometry.changed`, `sheet.calibration.changed`, `takeoff.folder.changed` | `{project_uuid, <x>_uuid, sheet_uuid?, kind}` | F5 (calibration), F6 (items, folders), F7 (geometry) | Named. **Plus D-33's `draft` and `cursor` frames, built in S13.** |
| 2 | `takeoff:${projectId}` (presence) | project | `item.focus`, `item.blur`, `presence`, `presence.changed`, `focus.granted`, `focus.refused` | see The wire | **F8** | **Built and driven, per mode (D-32)** (S11, S12) |
| 3 | `takeoff_docks:${projectId}` | project | `takeoff.dock.changed` | `{project_uuid, sheet_uuid, dock_uuid, kind}` | F11 | Named |
| 4 | `takeoff_highlights:${projectId}` | project | `takeoff.highlight.changed` | `{project_uuid, sheet_uuid, highlight_uuid, kind}` | F11 | Named |
| 5 | `takeoff_notes:${projectId}` | project | `takeoff.note.changed` | `{project_uuid, sheet_uuid, note_uuid, kind}` | F11 | Named |
| 6 | `user-roles-…` | workspace | `workspace.permissions.changed`, `workspace.member.changed`; `workspace.plan.changed` for billing | F3's payloads; plan `{workspace_uuid}` | **F8** (F3's two), F16 (plan) | **Wired** (S15) |
| 7 | `trial-state-…` | workspace | `workspace.trial.changed` | `{workspace_uuid}` | F16 | Named |
| 8 | `workspace-custom-roles-…` | workspace | `workspace.permissions.changed`, kind `custom_role` | `{workspace_uuid, kind, role?}` | **F8** | **Wired** (S15) |
| 9 | `workspace-role-overrides-…` | workspace | `workspace.permissions.changed`, kind `override` | `{workspace_uuid, kind, role}` | **F8** | **Wired** (S15) |
| 10 | `workspace-shifts-…` | workspace | `workspace.shifts.changed` (F3 name) | `{workspace_uuid}` | F15 | Named |
| 11 | `estimating-evlinks-…` | project | `estimate.changed`, plus channel 1's item and folder events | `{project_uuid, kind}` | F9 | Named |
| 12 | `subitem-costs-…` | project | `estimate.line_cost.changed` | `{project_uuid, parent_item_uuid}` | F9 | Named |
| 13 | `file-source-…` | project | `drawing.source.changed`, **from the render worker** | `{project_uuid, file_uuid, page?}` | F5 | Named; S6 builds the worker path |

Legacy's instance ids in channel names 6, 7 and 12 existed because two subscribers in one
tree crashed; `useRealtimeTopic` ref-counts joins (F3-S8 AC4, re-driven in S4).

### The F3 and F4 events F8 wires

All on the workspace topic.

| Event | Payload | Api routes that publish it | App keys invalidated |
|---|---|---|---|
| `workspace.permissions.changed` | `{workspace_uuid, kind, role?}` | override `PUT`, `DELETE`; custom role `POST`, `PUT`, `DELETE` | capability, matrix, custom-role, member |
| `workspace.member.changed` | `{workspace_uuid, user_uuid, role, kind}`, kind `joined\|role\|removed` | member role `PATCH`, member `DELETE`, leave, custom role assign, invitation accept | member; capability and `["workspaces"]` when it is me; Q5 when I was removed |
| `workspace.owner.changed` | `{workspace_uuid, owner_user_uuid}` | ownership `POST`, `DELETE`, and an accept that completes a queued transfer | ownership, capability, member, invitation, `["workspaces"]` |
| `workspace.settings.updated` | `{workspace_uuid, fields}` | workspace `PATCH` (including `collaboration_mode`), logo `PUT`, `DELETE` | `["workspaces"]` |
| `workspace.invitation.changed` (new) | `{workspace_uuid}` | invitation `POST`, resend, relink, `DELETE` | invitation |
| `workspace.statuses.changed` | `{workspace_uuid}` | every `project-status` write | `["project-status", ws]`, `["project", ws]` |
| `project.created` | `{workspace_uuid, project_uuid}` | project `POST` | `["project", ws]` |
| `project.updated` | `{workspace_uuid, project_uuid, fields}` | project `PATCH`, assignees `PUT` | `["project", ws]` |
| `project.trashed` / `project.restored` | `{workspace_uuid, project_uuid}` | project `DELETE`, `restore` | `["project", ws]` |
| `project.purged` | `{workspace_uuid, project_uuid}` | project `purge`, **the nightly worker** | `["project", ws]` |
| `project.folder.changed` | `{workspace_uuid, project_uuid, folder_uuid, kind}` | folder create, ensure, `PATCH`, `DELETE` | `["project-folder", ws, project]`, `["project-file", ws, project]` |
| `project.file.changed` | `{workspace_uuid, project_uuid, file_uuid, kind}` | file `complete`, `PATCH`, `DELETE` | `["project-file", ws, project]`, `["project-folder", ws, project]` |

Not emitted: `workspace.activity.appended` (the feed refetches on any workspace event),
`workspace.classification.changed` (F6), `workspace.shifts.changed` (F15).

---

## Subtasks

Each criterion is written to be checked by hand with two browser windows as two
estimators, and is also driven by a fixture.

**The two windows:**
- **Before S5:** window A is a normal window on `http://localhost:5173`, signed in as the
  seeded owner. Window B is a private window on the same URL, signed in as an `estimator`
  in the same workspace.
- **From S5 on:** `docker compose --profile realtime up -d`. Window B moves to
  `http://localhost:5174` (`app-b`, talking to `api-b` on 8010). Every live update
  between the two has crossed Redis.
- **The same user in two tabs** means two tabs of window A.
- **Reading the socket:** DevTools, Network, filter WS, `realtime`, Messages. With
  `localStorage["intelcost.debug"] = "realtime"` the console logs each frame and each
  echo suppressed.

---

# Block A: The socket

_A socket that opens, proves who is on it, and only hears what they may hear. Nothing is
published yet. **A reporting boundary.**_

### F8-S1: The endpoint, first-frame auth, heartbeat and limits

**Work.**
- `api`: `/api/realtime` upgrades. The `Origin` must be in `cors_origins`, or the
  handshake is refused (4403).
- `api`: the first frame must be `auth` within 5 s, checked by the same
  `decode_token(token, "access")` and active-user test `current_user` runs, else 4401
  with the api's sentence.
- `api`: `ready` carries `name` (S1 lands `core/names.py`) and `colour`.
- `api`: ping every 5 s answered by pong; 20 s of silence closes. Frames over 64 KB close
  4413. An eleventh socket for one user closes 4029. Shutdown closes 1012.

**Acceptance criteria.**
1. Sign in as window A. DevTools shows one socket, `auth` out, `ready` back with your
   short name, and a ping and pong every 5 s. The URL carries no token.
2. Two more tabs of A: three sockets.
3. A hand-written socket that sends nothing is closed 4401 after 5 s; one that sends a
   refresh token is closed 4401 with "That token is not valid for this request."
4. A socket from `Origin: https://evil.example` is refused at the handshake.
5. `docker compose restart api`: A's socket closes 1012 and comes back on its own within
   one backoff step of the api answering (about 16 s from the close on the bench). No
   toast, no reload.

### F8-S2: `core/realtime`, one socket per tab, tied to the session

**Work.**
- `app`: `socket.ts` opens the socket only while the session is authenticated.
  `RealtimeProvider` sits inside the session provider.
- `app`: `tokens.ts` gains `onTokensChanged(listener)`. **`clearTokens()` closes the
  socket** through it, so every path that ends a session closes it (F2's forward
  dependency, discharged).
- `app`: reconnect backoff 1, 2, 4, then 8 s plus up to 250 ms jitter.
- `app`: after **three** failed connects in a row, a quiet "Reconnecting…" indicator in
  the top bar, cleared on the next `ready`. No toast, nothing asks for a reload.

**Acceptance criteria.**
1. Signed out, `/login` opens no socket.
2. Sign out: the socket closes 1000 and nothing reconnects.
3. `docker compose stop api` for 30 s: the indicator appears after the third failed try,
   the tries spaced about 1, 2, 4, 8, 8 s. `start api`: it clears. No toast at any point.
4. A failed refresh still signs out cleanly, and the socket closes with it.

### F8-S3: Re-auth on token refresh, never a rebuild

**Work.**
- `app`: `client.ts` exports its single-flight `refreshSession()`. The realtime module
  refreshes 60 s before the expiry the api reports in `ready.expires_in_ms`, so an idle
  tab stays signed in. Any refresh reaches the socket as an `auth` frame **on the open
  socket**.
- `api`: an `auth` frame on an open socket re-verifies, resets the expiry and re-checks
  membership for every topic held, sending `revoked` for any that fail.
- `api`: a socket whose token expires without a re-auth closes 4401; the client refreshes
  once and reconnects.

**Acceptance criteria.**
1. With the bench api on `ACCESS_TOKEN_MINUTES=2`, leave A idle for five minutes: a
   refresh about a minute before each expiry, an `auth` on the **same** socket, `ready`
   back. The socket never closed.
2. A socket that authenticates and then never re-auths is closed 4401, "Your session
   has expired. Sign in again.", when its token lapses. And block `/api/auth/refresh` in
   DevTools: at the proactive refresh the app signs out cleanly, the socket closes 1000,
   and nothing reconnects.
3. The owner removes B's member between B's refreshes: at B's next re-auth, B gets
   `revoked` for the workspace topic.

### F8-S4: Topics, and the membership check on join

**Work.**
- `api`: the query inside `current_workspace` moves into `resolve_workspace(session,
  user, workspace_uuid)`, called by the dependency and the socket alike. A join opens a
  short session for the check and closes it.
- `api`: `ws:{w}` needs membership of `w`. `ws:{w}:project:{p}` needs membership of `w`
  and `p` in `w`. A refusal is a `refused` frame, never a close.
- `app`: `useRealtimeTopic(topic, handler)` ref-counts joins. The provider joins the
  active workspace's topic and moves it with the switcher.

**Acceptance criteria.**
1. A gets `joined` for its workspace. Switching workspace shows `leave` then `join`.
2. A hand-written `join` for someone else's workspace is `refused` with "You do not have
   access to that workspace.", and the socket stays open.
3. A project join naming a real project under the wrong workspace is refused.
4. Two components subscribing to one topic send one `join`; unmounting one sends no
   `leave`.

---

# Block B: Events

### F8-S5: Publish after commit, and the Redis fan-out

**Work.**
- `api`: `outbox.drain` awaits an effect that returns an awaitable; sync callers
  unchanged. `realtime.publish` as designed. Middleware reads `X-Write-Token`.
- `api`: one Redis pub/sub connection per process, subscribed per topic while a local
  socket holds it. A slow socket is closed 4008 and never slows the others.
- `infra`: `api-b` (8010) and `app-b` (5174) on a `realtime` profile; `CORS_ORIGINS`
  gains `:5174`; `api-b` runs no migrations. README "What runs" gains both.
- `drives/f8-publish.py` publishes a test event with no request.

**Acceptance criteria.**
1. A on `:5173`, B on `:5174`, same workspace. `f8-publish.py` sends one event: both
   windows receive it once.
2. A request that fails after registering a publish publishes nothing.
3. `docker compose stop redis` for ten seconds: nothing crashes, and after `start` both
   windows receive the next event.

### F8-S6: Publishing from Celery workers

**Work.**
- `api`: `outbox.commit_and_drain(session)` for sync sessions; the worker publishes with a
  sync Redis client.
- `api`: the nightly purge and the manual purge publish `project.purged`.

**Acceptance criteria.**
1. B has Settings, Trash open. Age a trashed project (`drives/f8-age.py "<name>"`) and run
   the purge with the README's `celery call`: B's row disappears with no reload.
2. A dry run publishes nothing.

### F8-S7: Write tokens and echo suppression

**Work.**
- `app`: `client.ts` sends a fresh `X-Write-Token` on every non-GET request and records
  it in a set of 512, oldest dropped first. Every request also sends `X-Client-Id`.
- `app`: an event carrying one of this tab's tokens is consumed and skipped. Tokens are
  per tab, so the same user's other tab still hears the change.

**Acceptance criteria.**
1. A renames a project: B's dashboard shows it; A's console logs `echo suppressed
   project.updated`, and A refetched the list once.
2. Same user, two tabs: tab 1 renames, tab 2 updates live.
3. An event with a stranger's token reaches every window, the writer's included.

### F8-S8: Reconnect refetches; no replay

**Work.**
- `app`: every `ready` after the first, and every re-`joined` topic, invalidates every
  query under that topic's scope, debounced 150 ms. A project topic re-sends the tab's
  focus if it still has one.
- No replay, no event ids to resume from (D-13). Per-hook `refetchOnWindowFocus` stays.

**Acceptance criteria.**
1. B goes offline. A creates a project, trashes another and renames a folder. B comes
   back: within about two seconds of `ready`, B shows all three.
2. The same with `docker compose restart api-b`.
3. B never receives an event dated from the outage.

---

# Block C: Concurrent editing (D-32)

_Several estimators on one item, with nothing lost, and the workspace's chosen rule
applied the same way for everyone._

### F8-S9: Shapes as rows, made safe

Fixes the three stale-view paths in the audit, and names the person in a conflict.

**Work.**
- `api`: `core/names.py` `short_name` (landed in S1) is used by every message below.
- `api`: every geometry write and item delete first takes **`SELECT … FOR UPDATE` on the
  item row**, so `recompute_item` sums a view that includes every committed shape, and
  writers on one item queue for milliseconds instead of overwriting each other's totals
  (path 1).
- `api`: the version guard becomes part of the write: `UPDATE … WHERE geometry_version =
  :expected`, zero rows meaning refused (path 2).
- `api`: `takeoff_geometry.updated_by_id` (migration), set on add and update. A stale
  write is refused 409 with "{name} just changed this shape, showing their version",
  where {name} is `short_name` of that user.
- `api`: `DELETE …/geometry/{uuid}?drop_empty_item=true` deletes the item too **only if
  this was its last shape, decided under the item lock**. The app's Delete last shape
  calls it and stops deciding from its copy (path 3).
- `app`: on that 409 the shape refetches and the message shows as a toast. Nothing the
  user dragged stays painted.

**Acceptance criteria.**
1. Window A and window B both on sheet A-101 with item "Area 1". Both add a shape to it
   within a second of each other: both shapes are there after refresh in both windows,
   and the item's quantity equals the sum of its shapes.
2. A and B drag a vertex of the **same** shape and release together: one wins; the other
   sees "Sara W. just changed this shape, showing their version" (with the winner's
   name) and the shape snaps to the winner's version.
3. A and B each drag a vertex of **different** shapes of one item at once: both edits
   stand.
4. Item with one shape. B adds a second; A, without refreshing, chooses Delete last shape
   on the first: only A's shape goes. B's shape and the item remain.
5. Fifty simultaneous hand-written adds to one item: fifty rows, and the stored quantity
   equals their sum.

### F8-S10: The collaboration mode setting

**Work.**
- `api`: `workspace.collaboration_mode` (migration, default `work_together`), in
  `WorkspaceUpdate`, gated on `canManageWorkspace`, audited.
- `app`: **Settings > Collaboration**, a new tab: the three modes as a radio group, each
  with one sentence saying what it does. Owner and admin edit; everyone else sees the
  current mode, disabled, with the reason.

**Acceptance criteria.**
1. A new workspace reads Work together.
2. As owner, choose One at a time: saved, and the activity feed shows it.
3. As estimator, the tab shows the mode and cannot change it; a hand-written patch gets
   403 naming the capability.
4. B, with Settings > Collaboration open, sees A's change arrive (after S15).

### F8-S11: Item focus, and the claim, on the server

**Work.**
- `api`: `presence.py` as designed: `item.focus` and `item.blur`, non-exclusive in Work
  together and Warn me, `SET NX PX 15000` in One at a time; renew on ping; release on
  blur, close and compare-and-delete; `presence` on join and `presence.changed` after.
- `api`: in One at a time, every item and geometry write from a `client_id` that is not
  the holder gets 409 "{name} is editing this item right now".

**Acceptance criteria.**
1. One at a time: two sockets focus one item in the same instant, fifty rounds: exactly
   one `focus.granted` each round.
2. A holder killed without a close frame: its claim clears on other sockets within 15 s.
3. A stale release leaves the new holder's claim in place.
4. One at a time: while A holds item X, B's hand-written delete of X gets 409 naming A;
   A's own delete succeeds; A's other tab is refused like anyone else.
5. Work together: A and B both focus X; both get `presence.changed`, neither is refused.

### F8-S12: The three modes on today's takeoff page

**Work.**
- `app`: `useItemPresence(project)` in `core/realtime`. Arming Add a shape or Edit
  vertices on an item focuses it; finishing, Esc, switching sheet or leaving blurs.
  Stable callbacks, so a remote change never makes the page blur and refocus its own item
  (legacy's "Bug-3 blink-off").
- `app`: **Work together:** the item's row shows who else has it in hand ("Sara W.").
  **Warn me:** plus a banner over the canvas, "{name} is also working on this item".
  **One at a time:** a refused focus does not arm the tool and shows "{name} is editing
  this item right now"; while someone else holds the item, its Add a shape, Edit
  vertices, Delete last shape, Delete item, rename and override are disabled with that
  reason. They re-enable when the claim clears.

**Acceptance criteria.** (A and B both on sheet A-101 of one project.)
1. **Work together.** A arms Add a shape on "Count 1". B's row for it shows A's short
   name. B can also add a shape to "Count 1"; both shapes save.
2. **Warn me.** The same, and B, arming "Count 1" as well, sees "{A} is also working on
   this item". A sees B's name the same way.
3. **One at a time.** A arms "Count 1". B's controls for it are disabled with "{A} is
   editing this item right now". A finishes: within a second B's controls re-enable.
4. One at a time, A's tab closed mid-shape: B unlocks at once. A's network cut instead
   (DevTools Offline): B unlocks within 15 s.
5. One at a time, A offline while holding; B claims after it lapses; A comes back: A's
   focus is refused, its tool disarms, and nothing A draws lands on the item.
6. Same user, two tabs, One at a time: tab 2 is refused like anyone else.

---

# Block D: Live drawing (D-33)

### F8-S13: The draft and cursor channel

**Work.**
- `api`: `draft` and `cursor` frames on the project topic, stamped with `user_uuid`,
  `client_id`, `name` and `colour`, fanned out through Redis, never stored, never echoed
  to their own socket. Over 10 per second per socket are dropped. A socket closing
  mid-draft ends its draft on the server's behalf.
- `app`: `useDrafts(project, sheet)` returns every colleague's live draft and cursor on
  that sheet, dropping a draft on `done` or after 5 s without a frame. Today's canvas
  **sends** its in-progress shape and its cursor, throttled. **Rendering is F5, F6 and
  F7's** (D-33).

**Acceptance criteria.**
1. A draws a linear run slowly on A-101. B's DevTools shows `draft` frames arriving, at
   most 10 a second, each stamped with A's short name and colour, and a final `done`.
2. A's own socket receives none of its own draft frames.
3. B on sheet A-102 receives no draft for A-101 from its `useDrafts`.
4. A closes the tab mid-shape: B receives `done` for that draft.
5. Nothing about the draft is in Postgres: the geometry row count moves only when A
   finishes.

### F8-S14: Collaboration display preferences

**Work.**
- `api`: `user.collaboration_prefs` (migration), a validated object with the five
  settings and their defaults (drawing in progress on, names always, cursors on, others'
  work all, colour by person), patched through `PATCH /api/auth/me`.
- `app`: a **Collaboration** section on Settings > Account with the five controls, and
  `useCollaborationPrefs()` for F5 to F7.

**Acceptance criteria.**
1. Change each preference and reload: each is kept.
2. Sign in as the same user in window B: the same preferences.
3. An invalid value in a hand-written patch is refused with the field named.

---

# Block E: Wiring F3 and F4

### F8-S15: The F3 events

**Work.**
- `api`: publish each workspace event from its routes, inside the service call.
- `api`: `workspace.member.changed` with kind `removed` is delivered, **then** the hub
  revokes that user's sockets from the workspace on every process.
- `app`: `features/workspace/realtime.ts`; any workspace event refetches the activity
  feed; Q5's removal handling.

**Acceptance criteria.** (A owner, B estimator.)
1. **F3-S8 AC1, now live.** A changes B's role to `viewer`. B, on the dashboard with no
   focus change, loses New project within a second, with its reason.
2. A edits the `estimator` override: B's matrix and capabilities follow.
3. A creates a custom role and assigns it to B: B follows it.
4. A invites someone: a second admin window's pending list shows it.
5. A renames the workspace and uploads a logo: B's top bar shows both.
6. A transfers ownership to B: both windows' screens change role with no reload.
7. A removes B: B sees "You no longer have access to {workspace}", moves to its next
   workspace, and hears nothing more from the old one.
8. B's Settings, Activity shows each act as it happens.
9. A changes the collaboration mode: B's takeoff page applies it on its next focus.

### F8-S16: The F4 events

**Work.**
- `api`: publish as in the table, replacing the two "Named, not yet emitted" comments.
- `app`: `features/project/realtime.ts`.

**Acceptance criteria.** (Both on the dashboard unless a line says otherwise.)
1. A creates a project: it appears in B's list, and B's counts change.
2. A changes a status inline: B's row moves tab.
3. A edits details, assigns B, sets Plans Dated: B's row and B's Project Home follow.
4. A trashes, restores and permanently deletes: B's list and Trash follow each.
5. B on Project Home of a project A trashes: B sees "Project not found".
6. Both on one Project Home: A's folder create, rename, move, upload and delete all reach
   B's file browser and counts.
7. A's status add, rename, reorder, hide and delete reach B's Statuses, tab strip and rows.
8. None of the above shows twice in A's own window.

---

# Block F: Close-out

### F8-S17: Caddy note, docs and parity

**Work.**
- Send Abdullah the Caddy note below.
- Both repos' `STATUS.md`: realtime, collaboration mode and fresh "last verified".
- PARITY: the realtime table gains a "New event" column; §10's lines closed as below;
  the new "beyond legacy" lines ticked as driven.

**Acceptance criteria.**
1. Abdullah has the note and has said how many uvicorn processes production runs.
2. Every PARITY line in the coverage table reads as it should.

---

## For Abdullah: Caddy and production

1. **Caddy v2 proxies WebSocket upgrades with no extra directive.** The existing
   `reverse_proxy` block for `api.intelcost.io` carries `wss://…/api/realtime` as it is.
   Do not hand-set `Connection` or `Upgrade` headers.
2. **Keep sockets alive across a Caddy reload:** `stream_close_delay 5m` inside
   `reverse_proxy` (Caddy 2.7+), or every reload drops every estimator at once.
3. **No idle timeout below 60 s.** The app pings every 5 s; the api closes after 20 s of
   silence.
4. **Several uvicorn processes are safe, with no sticky sessions.** Every process
   subscribes to Redis and every claim lives in Redis. `--workers 2` suits the 4 GB box;
   say which you choose. Run with `--proxy-headers --forwarded-allow-ips` set to Caddy.
5. **`CORS_ORIGINS` must list `https://app.intelcost.io`**: the handshake checks `Origin`.
6. **Redis is on the request path now**, not only Celery's. No persistence is needed for
   this (claims are 15 s, events and drafts are fire-and-forget). Keyspace notifications
   are not needed. Watch `maxmemory` so a queue backlog cannot starve publishes.
7. **Deploys** close sockets 1012; clients return within seconds and refetch. A deploy
   mid-shape drops that estimator's claim for one reconnect.
8. **Access logs are safe:** the token travels in the first frame, never the URL.
9. **Draft traffic is small but steady:** at most 10 frames a second per drawing
   estimator, each a few KB. Twenty testers drawing at once is well under 1 MB/s.
10. **uvicorn must be PID 1, or be sent the stop signal.** A container command of
    `sh -c "alembic upgrade head && uvicorn …"` leaves `sh` as PID 1, which ignores
    SIGTERM: Docker kills uvicorn after its timeout and every socket dies without a close
    frame, so every estimator waits out a silence instead of reconnecting at once. Use
    `exec uvicorn …` (the bench does, since F8 Block A), or exec form, or `init: true`.

---

## Sequencing

| Block | Subtasks | What it is |
|---|---|---|
| **A: The socket** | S1 to S4 | Endpoint, auth, re-auth, topics, membership. **Reporting boundary.** |
| **B: Events** | S5 to S8 | Publish after commit, fan-out, workers, echo, reconnect. |
| **C: Concurrent editing** | S9 to S12 | Row-per-shape made safe, the mode, focus and claims, on the page. |
| **D: Live drawing** | S13, S14 | The draft and cursor channel, the preferences. |
| **E: Wiring** | S15, S16 | F3 and F4's events, live. |
| **F: Close-out** | S17 | The Caddy note, STATUS, PARITY. |

S9 needs nothing from the socket and may be built alongside Block B. S11 needs Block A and
S5. Blocks D and E each need Block B.

---

## Bench

- `docker compose up -d`; from S5, `docker compose --profile realtime up -d`.
- Fixtures `browser/f8-s{1..16}.mjs` through `regress.sh`, `bench-code` first. Two-window
  criteria use two Playwright contexts. Raw-socket steps run from a page, since the
  fixture image's Node has no WebSocket of its own.
- Drives: `drives/f8-publish.py` (S5), `drives/f8-age.py` (S6).
- The full regression runs every f3, f4 and f8 fixture: F8 touches `client.ts` and
  `tokens.ts`, which every one of them passes through.
- Gates: `ruff check`, `mypy app`; `lint`, `typecheck`, `build`. Screenshots and scratch
  files deleted after each drive.

---

## Definition of done

- S1 to S17 driven against their criteria, in a real browser, two windows on two api
  processes, including the loading, empty, error and unauthorised states.
- The full regression passes.
- Every inherited promise closed: F2's one clearing point closes the socket; F3-S8 AC1 is
  live; every F4 "another tab sees it" criterion is live.
- Carried forward on their owners' rows: channel 1's saved-change events and the canvas
  rendering of drafts, cursors, presence and the five preferences to **F5, F6 and F7**;
  Resume and Extend ported as new rows (D-32) to **F7**; channels 3 to 5 to F11; 7 and
  `workspace.plan.changed` to F16; 10 to F15; 11 and 12 to F9; 13 to F5.
- `ruff`, `mypy`, `lint`, `typecheck`, `build` pass.
- The spec archived, the MANAGER row dropped, F8 in FEATURES ✅ Live, and
  `intelcost-infra/workspace/` refreshed and committed in the same session.

---

## Coverage

| Where | Line or channel | At spec time | Owner |
|---|---|---|---|
| §10 | While one user is marking an item, others are blocked from Resume and delete | missing | **Reworded by D-32** as the One at a time mode: S11, S12; Resume by F7 |
| §10 | Write tokens suppress the echo | missing | S7 |
| §10 | Two estimators see each other's items, geometries, calibrations and folders live | missing | Transport S1 to S8; events F5, F6, F7 |
| §10 new | Collaboration mode, three modes, Work together default | beyond legacy (D-32) | S10 to S12 |
| §10 new | Concurrent adds to one item never overwrite; same-shape conflict named | beyond legacy (D-32) | S9 |
| §10 new | Live in-progress drawing with a name tag | beyond legacy (D-33) | Channel S13; rendering F5, F6, F7 |
| §10 new | Others' cursors | beyond legacy (D-33) | Channel S13; rendering F7 |
| §24 new | Collaboration display preferences | beyond legacy (D-33) | S14; honoured by F5, F6, F7 |
| §10 new | "Sara W." everywhere a collaborator is named | beyond legacy (D-33) | S1 (`short_name`), S9, S12; canvas F5, F6, F7 |
| §14 | Highlights, notes and docks each arrive live | missing | Transport; events F11 |
| §3 | A role or permission change reaches an open tab live | ported (on focus) | S15 (live) |
| Realtime | Channels 1 to 13 | | per the channel map |
| F3, F4 | Every named event | named, not emitted | S15, S16 |
| F8 | `workspace.invitation.changed` | new here | S15 |
