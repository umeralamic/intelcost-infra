# For Abdullah: worker memory, two api processes, and gzip for JSON (2026-10-20)

Three things for staging and production, all measured on the bench tonight:
- (a) how much memory the worker needs;
- (b) why the api should run at least two processes;
- (c) gzip for large JSON in the proxy.

Nothing here changes code you run; it is configuration.

## (a) The worker's memory

**What happened on 2026-10-19:**
- The bench's worker stopped at 18:49 UTC with `Cannot allocate memory (os error 12)` in its file watcher.
- That watcher is the bench's dev auto-reload (`watchfiles`), which production does not run.
- The worker itself was idle: its last task ended at 18:17. The Docker VM (15.5 GiB) had run out of memory.
- What filled the VM was the api building 20,000-item reads, the dev app server (1.7 GiB) and a second test stack, not
  the worker.

**Measured tonight, sampled every 2 s:**

| What ran | Worker peak | Api peak (2 processes) | Postgres peak |
|---|---|---|---|
| Idle | 445 MiB | 665 MiB | 390 MiB |
| Opening a 1,000-item project | 447 MiB | 803 MiB | 389 MiB |
| Opening a 5,000-item project | 446 MiB | 907 MiB | 423 MiB |
| Opening a 20,000-item project | 447 MiB | 1,373 MiB | 468 MiB |
| Duplicating the 5,000-item project (worker, 32 s) | 561 MiB | 986 MiB | 471 MiB |
| Duplicating the 20,000-item project (worker, 91 s) | 868 MiB | 984 MiB | 482 MiB |

**What used it:**
- **The worker:** its own two Celery processes (concurrency 2) take about 445 MiB idle. Duplicating a project holds
  the project's rows in memory while it copies them: about +120 MiB at 5,000 items and +420 MiB at 20,000.
- **The api:** a 20,000-item read builds about 60 MB of JSON plus the row objects behind it, so each process grows
  by several hundred MiB while it answers.

**Recommended:**
- **General worker (`worker`, concurrency 2):** a 2 GiB limit. Two 20,000-item duplicates at once come to about
  1.3 GiB; 2 GiB leaves headroom.
- **Page and preview workers:** these are separate (`worker-pages`, `worker-previews`) and were not part of this
  measurement. Size them from their own PDF loads.
- **Api (two processes):** 2 GiB, from the 1,373 MiB peak at 20,000 items.
- **On the 4 GB box,** api, worker, Redis and Postgres together sit at about 3 GiB at the peaks above. If Postgres
  lives on the same box, that is tight: prefer giving the api and the worker their limits, and watch Postgres.

## (b) At least two api processes, on staging and production

**Ask:** run uvicorn with at least two processes, on staging and on production.
- `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers`, or gunicorn with uvicorn workers.
- Keep `exec`, so uvicorn is PID 1 (the realtime note, point 5).

**Why:**
- **The api's route handlers are `async`,** but building a large read is CPU work that never yields. While one
  process builds a project's item list, every other request to that process waits.
- **Measured at 5,000 items:**
  - with one process, the page's 26 small reads, each a few milliseconds of work, all finished between 4.1 and 5.6 s,
    queued behind the two large reads;
  - the same 5,000-item project, on the same simulated network, one process against two:

| | One process | Two processes |
|---|---|---|
| Takeoff panel rows drawn | 13.6 s | 12.3 s |
| Estimating's first row | 17.5 s | **12.8 s** |

**Safe:**
- Every process subscribes to Redis, and every lock lives in Redis, so no sticky sessions are needed (the realtime
  note, point 4).
- Each process loads the wage reference data at start, about 9 s, and its own memory: count about 330 MiB per
  process when idle.
- **What I don't know:** the repos don't hold staging's systemd unit, so I can't see its process count today.
  D-129 and D-258 record `uvicorn main:app`, which is one.

**The bench now has a production-like api for timing:** `docker-compose.prodlike.yml` (no `--reload`, DEBUG off,
two processes, `--proxy-headers`).

## (c) Gzip for large JSON in staging's proxy, streaming AI responses left alone

**Why:** the project's item reads are large and uncompressed today.

| Items | Item read | gzip level 1 | Time to compress |
|---|---|---|---|
| 5,000 | 15.6 MB | 1.5 MB | 0.12 s |
| 20,000 | 62 MB | 6.1 MB | 0.45 s |

On a 50 Mbit/s line, 15.6 MB alone takes 2.5 s.

**nginx (staging):**
- Its default `gzip_types` is `text/html` only, so JSON goes uncompressed unless the site config says otherwise.
- In the api's server block:

```nginx
gzip on;
gzip_comp_level 1;
gzip_min_length 65536;            # only large responses
gzip_types application/json;      # JSON only: not text/event-stream, not application/x-ndjson
gzip_proxied any;
gzip_vary on;
```

**Caddy (production, per the realtime note):**

```caddy
encode {
    gzip 1
    minimum_length 65536
    match {
        header Content-Type application/json*
    }
}
```

**Leave streaming alone:**
- The AI tools stream `application/x-ndjson`, and buffering would hold their answers back (D-325).
- Both snippets match `application/json` only, so the stream is untouched.
- Also keep `proxy_buffering off` (nginx) or Caddy's default streaming for those routes, as they are today.

**The api will also compress** its own large JSON responses from this block on (the open-speed plan, O2). With
both, the proxy sees an already-compressed body and passes it through; with the api's alone, the proxy needs nothing.
The proxy setting still helps every other large JSON route.
