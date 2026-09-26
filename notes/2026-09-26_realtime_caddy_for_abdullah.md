# Realtime in production: Caddy, uvicorn and Redis

_For Abdullah, from Umer. 2026-09-26, at F8's close._

F8 put a WebSocket on the api: `wss://api.intelcost.io/api/realtime`. Every open tab
holds one. It is how a second estimator's screen updates without a reload, and how the
One at a time lock and live drawing work. Nothing about it needs a new service. It does
change what Caddy, uvicorn and Redis are asked to do.

**One question for you: how many uvicorn processes will production run?** (Point 4.)

## Caddy

1. **No extra directive is needed for the upgrade.** Caddy v2's `reverse_proxy` carries
   WebSocket upgrades as it is. Please do not hand-set `Connection` or `Upgrade`
   headers.
2. **Keep sockets alive across a Caddy reload.** Add `stream_close_delay 5m` inside the
   `reverse_proxy` block for `api.intelcost.io` (Caddy 2.7 or later). Without it, every
   reload drops every estimator at once.
3. **No idle timeout below 60 s** anywhere between the browser and the api. The app
   pings every 5 s; the api closes a socket after 20 s of silence.

## uvicorn

4. **Several uvicorn processes are safe, with no sticky sessions.** Every process
   subscribes to Redis, and every lock lives in Redis. `--workers 2` suits the 4 GB box.
   Run with `--proxy-headers --forwarded-allow-ips` set to Caddy's address.
5. **uvicorn must be PID 1, or be sent the stop signal.** A container command of
   `sh -c "alembic upgrade head && uvicorn …"` leaves `sh` as PID 1, and `sh` ignores
   SIGTERM. Docker then kills uvicorn after its timeout, every socket dies without a
   close frame, and every estimator waits out a silence instead of reconnecting at once.
   Use `exec uvicorn …` (the bench does), the exec form of `CMD`, or `init: true`.
6. **Deploys close sockets with code 1012.** Clients come back within seconds and
   refetch what they show. A deploy while someone is mid-shape drops their lock for one
   reconnect. That is expected.

## Config

7. **`CORS_ORIGINS` must list `https://app.intelcost.io`.** The socket handshake checks
   the `Origin` header against it and refuses anything else.
8. **Access logs are safe.** The token travels in the socket's first message, never in
   the URL.

## Redis

9. **Redis is on the request path now**, not only Celery's. It carries events between api
   processes, the 15 s locks, and one control channel (`rt:_hub`) that tells every
   process to disconnect a member who was just removed. No persistence is needed for
   any of it: locks last 15 s, and events and drawing frames are fire-and-forget.
   Keyspace notifications are not needed. Please set `maxmemory` so a Celery backlog
   cannot starve the publishes.
10. **Live drawing traffic is small but steady.** At most 10 frames a second per
    estimator who is drawing, a few KB each, plus pointer positions at the same rate.
    Twenty testers drawing at once is well under 1 MB/s.

## What did not change

- **D-14 sizing** is as it was: F8 adds no rendering work to the box.
- **The Celery worker** publishes through the same Redis, from the nightly purge today
  (and later from the render worker). No change to how it runs.

The full design is in `docs/archive/realtime_tasks.md` in the workspace mirror
(`intelcost-infra/workspace/`).
