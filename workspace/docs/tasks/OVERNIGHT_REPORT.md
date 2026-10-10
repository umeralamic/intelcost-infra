# Overnight report, 2026-10-10

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Updated after every block. The 2026-10-09 run's
files are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-09.md`.

**Browser tool:** the Playwright MCP connects and drives the app (checked 00:02 UTC); every
smoke below ran through it.

| # | Block | State | Commits |
|---|---|---|---|
| 1 | Settings speed | **done** | see below |
| 2 | D-324 follow-ups | not started | |
| 3 | P-23 alembic drift | **done** | see below |
| 4 | Auto Count part 1 | not started | |
| 5 | Competitor-name scan | not started | |
| 6 | P-24 | not started | |

## 1. Settings speed (D-325)

- **One frame:** `/settings` is a layout route; header, heading and both tab rows render once;
  every tab is a child route with a placeholder only in the content area (after 150 ms).
- **Prefetch:** entering settings fetches the other pages' code one at a time at idle; a tab's
  on hover or focus. Not at app start.
- **Fresh for 60 s** while settings is open (the settings pages' key prefixes); any save made
  there marks them stale, so it shows at once. *(call)* Scoped to the open frame, because
  several of the keys are also read on the takeoff; leaving settings restores them.
- **Classification tree:** the cause of 1.2 s was 568 KB of uncompressed JSON (1,835 CSI
  nodes) on every read, 110 ms to build and the rest to cross Docker Desktop's port
  forwarding; the first read of a new workspace also seeds the tree. Now built once per
  version per workspace, gzipped once, ETag + `private, no-cache`: an unchanged tree is a
  304. From the browser 1.05–1.5 s → **60–84 ms**; in the api 110 → 30 ms. *(call)* Per
  endpoint rather than app-wide gzip, because the AI tools stream NDJSON.

**Timings** (every tab and section, twice, from a fresh load of General; marked = the tab shows
selected, settled = no spinner):

| | Before | After |
|---|---|---|
| Prod, tab marked | 118–203 ms | **43–84 ms** |
| Prod, first visit settled | 123–1,283 ms | 64–763 ms (one 4.5 s: Wage Calculator's crafts reference data, loaded once per api process after a reload; reopened 238 ms) |
| Prod, second visit | 44–231 ms, api calls repeated | 47–175 ms, no api calls |
| Prod, frame disappears | on the first click | never |
| Dev (cold), tab marked | 2.6–11.9 s | **43–86 ms** |
| Dev (cold), first visit settled | 2.6–14.7 s | 2.1–9.9 s clicked at once; **64–366 ms** once the idle prefetch finished (~80 s after first load on a cold dev server) |
| Dev, second visit | 56–244 ms | 48–239 ms |
| Dev, first page load (cold server) | 38.5 s | 23–26 s |

**Smoke** (prod and dev): every tab clicked twice, the tab marked at once, the frame never
left; a phone number saved on General and a new CSI division showed after switching tabs and
back (the division after a reload too): **passed**.

**Report only: the repos on the Linux filesystem.** Measured inside the app container (same
Node, same CPU), the polled Windows share against a copy on the container's own disk:

| | Windows share (today) | Container disk |
|---|---|---|
| Read all 515 source files | 6,834 ms | 37 ms |
| One stat pass over `src` (what each poll does, every 200 ms) | 2,410 ms | 7 ms |
| Cold Vite compile of all 513 modules | **456 s** (median 3 ms, slowest 6.3 s) | **9.9 s** (median 7 ms, slowest 0.6 s) |

So a cold dev server would be roughly 40× faster to warm up, and the bench would stop paying
for polling: the Docker VM sits at a load average of 15–17 with the bench idle, because the
api, the three workers, beat and the app each poll the share (`WATCHFILES_FORCE_POLLING`,
`DEV_WATCH_POLL`). **What moving involves:** clone the repos inside WSL2 (e.g.
`~/intelcost/…` in an Ubuntu distro) and run Docker Desktop's WSL2 integration from there;
the bind mounts then carry native file events, so `DEV_WATCH_POLL` and
`WATCHFILES_FORCE_POLLING` come off; edit with VS Code's WSL remote. Cost: the workspace
files and the hook (`.claude/`) move too or are reached through `\\wsl$`; Windows tools that
read the repos directly (Explorer, the MCP's upload folder under `E:\Intelcost`) go through
`\\wsl$`, which is slow the other way. Not done; a decision for you.

## 3. P-23 alembic drift

The three indexes are declared on their models exactly as their migrations made them
(`app/features/estimate/models.py`); no migration was needed. `alembic check`: **clean**. P-23
moved to ✅ Live in FEATURES. Gates now report "alembic check clean".

## Gates (blocks 1 and 3)

App lint, typecheck, build: OK. Ruff, mypy: clean. `alembic check`: **clean**. Quantity table:
329 rows, passed.
