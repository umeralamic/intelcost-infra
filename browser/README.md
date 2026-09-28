# The bench's browser

A containerised Chromium for driving the app, per **D-16**. It is bench-only:
`intelcost-app-react` gains no Playwright dependency and its image is untouched.

```bash
cd intelcost-infra
docker compose --profile browser build browser
docker compose --profile browser run --rm browser node scripts/<smoke>.mjs
```

Since D-68 this holds no fixtures. It holds the helpers a throwaway smoke check is built
on (`lib/`: sign-in, worlds, drawings, api calls, realtime), the bench's own tools
(`bench-code`, `bench-tidy`, `walkthrough-setup`, `load-probe`), and the shared quantity
table (`quantity-table.mjs`, `lib/quantity-cases.mjs`; run `../quantity-table.sh`). A smoke
check is written here for one block, run once, and deleted. The fixture suite is archived
at tag `fixtures-archive-2026-09-28` (see the bench README).

**Why the resolver rule.** The app bundle is compiled with
`VITE_API_URL=http://localhost:8000`, because that is the address the *browser* has to
resolve. A browser inside a container resolves `localhost` to the container, so
Chromium is launched with `--host-resolver-rules=MAP localhost <host-gateway>` and
sees exactly what a browser on the host sees. Nothing in the app or the api is
changed to accommodate the driver — that is what makes the pass worth anything.

**Screenshots** land in `shots/`, which is git-ignored, and are deleted once the pass
is reported. CLAUDE.md: leave nothing stray.

