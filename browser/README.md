# The bench's browser

A containerised Chromium for driving acceptance steps, per **D-16**. It is bench-only:
`intelcost-app-react` gains no Playwright dependency and its image is untouched.

```bash
cd intelcost-infra
docker compose --profile browser build browser
docker compose --profile browser run --rm browser node f2-s3.mjs
```

One script per subtask, named for it. Each prints `PASS` or `FAIL` per step with the
path to its screenshot, and exits non-zero if any step failed.

**Why the resolver rule.** The app bundle is compiled with
`VITE_API_URL=http://localhost:8000`, because that is the address the *browser* has to
resolve. A browser inside a container resolves `localhost` to the container, so
Chromium is launched with `--host-resolver-rules=MAP localhost <host-gateway>` and
sees exactly what a browser on the host sees. Nothing in the app or the api is
changed to accommodate the driver — that is what makes the pass worth anything.

**Screenshots** land in `shots/`, which is git-ignored, and are deleted once the pass
is reported. CLAUDE.md: leave nothing stray.

**These are fixtures, not tests.** Nothing here runs in CI or gates a commit.
