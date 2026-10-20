# Open speed: a project's first open at 5,000 and 20,000 items (plan)

_Plan only, no code (night run 2026-10-19, R2 in `pending_umer.md`)._

## The problem and the target

**Measured after row virtualisation (D-646, D-647), panel rows drawn on first open:**

| 1,000 items | 5,000 items | 20,000 items |
|---|---|---|
| 3.4 s | 7.6 s | 31.4 s |

The browser has little left to do: the time is the api's.

**Target:** under 3 s at 5,000 items and under 6 s at 20,000, measured as in "A fair test" below.

## Where the time goes (measured tonight)

**How it was measured:**
- **Builds:** the production app (port 5175) against the bench api as it runs today: one uvicorn process with `--reload`.
- **Projects:** BENCH DUPs of the 3D test copy, grown to 5,000 and 20,000 Linear items on A101.
- **Server stages:** timed inside the api container. Read only.
- **Browser:** Chrome's network events, from the moment the takeoff page is requested.

### The open at 5,000 items (warm cache)

| When | What |
|---|---|
| 0.27 s | HTML and the main script loaded (0.65 s with a cold cache: the Google Fonts stylesheet blocks it) |
| 0.35–0.49 s | `me` → `workspace` → resolve project and `capability` → resolve sheet, each waiting for the one before |
| 0.49–0.83 s | the takeoff chunk (1.2 MB) compiled and first rendered; recent projects and AI credits for the header |
| 0.83–0.87 s | about 28 reads start at once |
| 4.1–5.6 s | the 26 small reads all end here, though each needs a few milliseconds: they queue behind two big ones on the single process |
| 4.4 s | `drawing/sheet/items` ends: it loads every shape in the project and works out per-sheet quantities (672 KB) |
| 7.5 s / 7.6 s | the sheet's item read: first byte, then the end (14.8 MB) |
| **8.7 s** | **the panel's rows drawn** |
| 8.6–13.1 s | the project's item read: the same 5,000 items again (15.2 MB), since every test item is on A101 |

- **At 20,000 items:** the sheet's item read ends at 28.2 s, the small reads at 9–15 s, and the rows draw at 33 s.
- **Start-up:** last night's report put the app's own start-up at about 2 s. Tonight it is 0.83 s warm and about 1.25 s cold before the first takeoff read.

### The item read, stage by stage (inside the api, no network)

| Stage | 5,000 items | 20,000 items |
|---|---|---|
| Full ORM rows (about 80 columns), shapes and dimensions eager-loaded | 1.28 s | 5.0–5.3 s |
| Folders, layers, sheets, makers | 0.11 s | 0.4–0.7 s |
| Each item's read model: 87 keys validated, plus per-request lookups | 0.66 s | 2.6–2.7 s |
| Shape read models | 0.19 s | 0.74–0.80 s |
| Detail models built | 0.39 s | 1.67 s |
| JSON written (`dump_json`) | 0.31 s | 1.5–1.7 s |
| **The route, end to end** | **3.5 s** | **14.4 s** |
| Body, uncompressed | 15.6 MB | 62 MB |
| gzip level 1 | 1.5 MB, in 0.12 s | 6.1 MB, in 0.45 s |
| gzip level 6 | 1.2 MB | 4.8 MB, in 1.2 s |
| The same rows by bare SQL, every column, nothing built | 0.34 s | 2.1 s |
| **A lean panel read:** 13 columns, the JSON built by Postgres | **0.09 s, 1.5 MB** | **0.29 s, 6.1 MB** |
| **A lean shapes read:** uuid, item, sheet, vertices, meta, role, version | **0.06 s, 2.9 MB** | **0.24 s, 11.4 MB** |

## Why the item read is slow

1. **Building, not the query.**
   - The database returns the rows in a tenth of the route's time.
   - The rest is Python, all of it on the event loop:
     - ORM rows for every column, eager loads in batches of 500;
     - 87 keys validated per item, with a lookup per distinct folder, layer and sheet that the read already holds;
     - the models built, then the JSON written.
2. **The payload is mostly key names.**
   - Each item carries 87 keys; the item fields are 74 % of the bytes and the shapes 26 % (vertices 14 %).
   - The panel needs about 25 of the 87 keys. The canvas needs about 12, plus the shapes.
   - The rest serves Properties, Estimating and the earthwork fields, after the open.
3. **No compression:**
   - The browser talks to uvicorn directly on the bench.
   - Staging sits behind nginx, whose default compresses only HTML (its site config is in no repo).
   - 15.6 MB takes 2.5 s on a 50 Mbit/s line on its own.
4. **One process.**
   - The handlers are `async`, but their CPU work never yields, so every other request waits behind them.
   - The bench runs one process. The repos only show staging running `uvicorn main:app` (D-129, D-258), also one; its systemd unit is not in git, and "how many uvicorn processes" is still open with Abdullah (`pending_umer.md`).
5. **Two or three big reads on the takeoff tab:**
   - the sheet's items, then the project's (D-646's order);
   - `drawing/sheet/items`, which reads every shape again;
   - every colleague's write refetches both item reads (`useLiveItems.ts`), so a busy project pays the 15 MB again and again.

## The approach

**A. Lean reads for the open (api and app)**
- **The panel's list:** the about 25 fields the Takeoff panel needs, no shapes. The JSON is built by Postgres (`json_agg`) or written in one pass from a column read, not ORM rows.
- **One sheet's shapes:** the fields the canvas draws.
- **The full item detail is read on demand,** when Properties, the sub-items editor or Estimating's explanation needs it, or in the background after the open. It stays the one source for writes and undo.
- **The share guest's bundle** moves to the same lean reads; it uses `item_details` today.

**B. Compression**
- gzip, level 1, on JSON responses over 64 KB in the api.
- Not as app-wide middleware: the AI tools stream NDJSON, which D-325 kept out of gzip. Either a route helper like `cached_json`, or a middleware that passes streaming responses through.
- In staging's and production's proxy, `gzip_types application/json` (a note for Abdullah).

**C. `drawing/sheet/items`**
- Read only the columns it uses, without ORM rows.
- If it is still over 0.3 s at 20,000, keep each item's per-sheet quantity when it is written, and read the sums.

**D. Order**
- The sheet's shapes first (the canvas), the panel's lean list second, then the rest.
- The small reads stay as they are: once no read holds the process for seconds, they answer in milliseconds.

**E. Processes, and a bench that matches staging**
- Two api processes on staging's 4 GB box, as the realtime note recommends: realtime already fans out through Redis.
- Production sized to its box, likely 2 to 4, by memory: each process also loads the wage reference data at start.
- The bench gets a production-like api service for timing: no `--reload`, DEBUG off, the same process count.

**F. Start-up**
- **One request instead of four:** resolve project, resolve sheet and `capability` folded into one.
- **The takeoff chunk preloaded** as soon as the route matches, instead of after the chain.
- **The three fonts self-hosted** in place of the Google Fonts `@import`, which blocks rendering.
- **The header's recent projects and AI credits** read after the takeoff reads.
- **Expected:** 0.3–0.5 s less, more on a real network, where each request in the chain also pays a CORS preflight.

**G. The browser side of a big read**
- Parsing 1.5 MB (5,000) or 6 MB (20,000) of lean JSON costs about 0.05–0.15 s.
- Turn off React Query's structural sharing for the big lists: it walks every item to compare.

**Expected after A to F:**
- **5,000 items:** start 0.6 s + lean reads 0.3 s + parse and draw 0.5 s = **about 1.5–2 s**.
- **20,000 items:** start 0.6 s + lean reads about 1 s + 2 MB compressed transfer about 0.3 s + parse 0.3 s, then the canvas's first draw.
  - Today that draw is many seconds of GPU time for 20,000 SVG paths: the canvas plan (R4) fixes it.
  - So the 6 s target at 20,000 depends on that plan.

## A fair test

- **What the bench does today:**
  - one process, with `--reload` (a file watcher) and DEBUG on;
  - the browser calls uvicorn on localhost, with no proxy, no compression and no network delay.
  - It favours big payloads, which cross localhost almost free, and penalises CPU work, which one process serialises.
- **Proposed:**
  - a production-like api service on the bench, with staging's process count;
  - the browser held to a realistic line with Chrome's network emulation: 50 Mbit/s down, 40 ms round trip;
  - warm and cold cache, three runs each, the median reported;
  - 1,000, 5,000 and 20,000 items, generated BENCH DUPs as tonight.
- **Then one check on staging** with a throwaway project, once Abdullah confirms its process count and compression.

## Risks

- **Two read shapes to keep in step:** a lean list and the full detail. The full detail stays the source for writes and undo, and live updates must refresh both.
- **Gzip costs CPU:** 0.45 s for 62 MB at level 1. Lean reads shrink that, and more processes spread it.
- **More processes use more memory,** each with its own wage data load and Redis connections. Staging's box size decides the count.
- **The guest bundle changes shape:** the guest view needs the same smoke as the member view.
- **20,000 items depends on the canvas plan,** as above.

## Paper hours

| Piece | Hours |
|---|---|
| A: the lean list and shapes reads, the app on them, the full detail on demand, the guest bundle | 8 |
| B: compression for big JSON, streams left alone, the proxy note | 2 |
| C: `drawing/sheet/items` lean | 3 |
| D: order of the reads | 2 |
| E: production-like api service on the bench, the note for Abdullah | 2 |
| F: one resolve request, chunk preload, self-hosted fonts, header reads later | 4 |
| Timing with the fair test at 1,000, 5,000 and 20,000; gates; quantity table; smokes, guest included | 4 |
| **Total** | **about 25 h (3 days)** |

## Questions for you

| # | Question | Recommendation |
|---|---|---|
| O1 | Lean reads for the open, with the full item detail read on demand? | **Yes.** It is most of the gain: 3.5 s becomes about 0.15 s at 5,000. |
| O2 | Compression: gzip on big JSON in the api, and JSON compression in staging's proxy? | **Both.** NDJSON streams stay out (D-325). |
| O3 | Ask Abdullah for two api processes on staging, and give the bench a production-like api for timing? | **Yes.** |
| O4 | Self-host the three fonts instead of loading them from Google? | **Yes.** They are open-licensed, and it removes a blocking cross-origin request. |
| O5 | Judge the 20,000-item target on rows and sheet image drawn, with the shapes' first draw judged under the canvas plan? | **Yes.** |
