# Waiting on Umer

_Compiled 2026-10-11 from every doc in the workspace and in `intelcost-app-react`,
`intelcost-app-fastapi` and `intelcost-infra` (all on `umer-dev`)._

**How to answer:** by number. `D1 ok` · `C3 no: <note>` · `S1 later`. Decisions are D, click
checks C, specs S.
- **ok:** marked closed in its source file with today's date and "confirmed by Umer", and removed
  from here.
- **no:** your note written next to it, kept open, and the work it would need described (not
  started).
- **later:** moved to Parked at the bottom.

**Where to check, safely.** Use the bench app at http://localhost:5173 and sign in with a
throwaway account (`fx.<name>.<stamp>@bench.intelcost.io`), never the seeded account. Never
open Hidden Valley Spec, its Rebid, Waxing City or Minmar. Use these instead:
- **Riverside Medical Center** (the bench seed: priced items, cost components, wage sets);
- **Marketing Demo – Site** (has an earthwork result, assumptions and a strip area);
- **Test 3** (copies of the Vol1/Vol2 sets);
- **E200 day copy** (an E200 copy in a throwaway account);
- the Auto Count benchmark page, http://localhost:5175/bench/autocount (E101 office, "C", E200 A
  and A1 as fixtures).

**Duplicate before you change anything.** Wherever a step changes data, first make a copy with
All projects ⋯ › Duplicate project and work in the copy. Delete the copy afterwards from Settings
› Trash.

**Answered:**
- **Batch 1 (2026-10-11):** D10, D12, D15, D25 to D36, C25 and C29 closed; S3 parked.
- **Batch 2 (2026-10-11):**
  - closed: D5, D6, D13, D14, D19, D20, D23 and D24;
  - D4, D8 and D11 split into one line per call;
  - parked: D7, D16, D17, D21, D22, C18, C26 and S2.
- **Batch 3 (2026-10-11):**
  - **Closed in DECISIONS:** D4.1 to D4.6, D8.1 to D8.7, D8.9 to D8.43, and D11.1 to D11.18.
    - D8.24: no tax collection, as decided.
    - D11.1: Abdullah's IAM item gains the multipart listing permission.
    - D11.4: checked in the code. Any file can be stored; PDF, PNG, JPG and TIFF are offered as
      sheets, and anything else is refused as a sheet.
  - **Done:**
    - D9: Abdullah confirms the Stripe API version, in the decision, the spec and the go-live
      checklist (step 7).
    - D23: the api's wage calculator docs say "any source or book name" (api `6bfd541`).
    - D18: built as D-356 (api `9091002`, app `aa9baeb`), with your two sentences.
  - **Open:** D8.8, below.
- **Day run 2026-10-12:** D8.8 built as D-382 (api `c78fa5d`, infra `c4bd131`): the five Stripe
  functions on Stripe's official library, its signature check; checkout, a real webhook, a forged one
  and an expired one smoke-tested on the fake (DAY_REPORT_2026-10-12.md, Block 5).
- **Batch 4 (2026-10-11):** D1 accepted and D3 passed, both closed in DECISIONS. D2 changed: the
  zoom menu leaves the top right. It stays open below until built.

---

## Decisions

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| D8.8 | DECISIONS.md (D-382) | Built: Stripe's official library behind our five names, its signature check. | Nothing; for your record. The library pins API version `2026-09-30.endive` (D-382 2). | DAY_REPORT_2026-10-12.md, Block 5. | Yes, D-382. |

## Work described (not started)

- **D8.8: Stripe's official library before go-live.** About half a day, mostly the fake and the
  checks.
  - **Code:** our Stripe client is five small functions in one file. They are: create a customer,
    a checkout session, a portal session, fetch a subscription, and verify a webhook signature.
    - They move onto Stripe's Python library behind the same names, so the 21 places that call
      them do not change.
    - The signature check becomes the library's own.
    - The library is pointed at the bench's Stripe fake by its base-URL setting.
  - **The bench's Stripe fake** may need small changes to answer the library's requests (headers,
    form encoding). That is where most of the half day goes.
  - **Process:** a D-NN first; the gates; the quantity table (its credit rows); and one smoke on
    the fake. The smoke covers Checkout to Professional, a webhook received and verified, and a
    forged webhook refused.
  - **Abdullah:** the production image is rebuilt for the new dependency.

## Click checks

| # | File:line | What it is | What you need from me | How I check it (project and sheet) | Already done elsewhere? |
|---|---|---|---|---|---|
| C1 | OVERNIGHT_REPORT.md:282 | Deleting a sheet clears its stored files. | Pass or fail. | In a throwaway project, upload any PDF and load it. Delete one sheet from its row menu. Within seconds the worker log shows nothing failed. | Smoke-tested by me only. |
| C2 | OVERNIGHT_REPORT.md:285 | Auto Count no longer suggests filled symbols for empty ones. | Pass or fail. | On E200 day copy, box one empty A1 symbol and use Image mode. Expect 6 checked and no 75% hatched suggestions. On E200 A at 38%, expect no empty-outline suggestions. | Smoke-tested by me only. |
| C3 | OVERNIGHT_REPORT.md:288 | Duplicate project. | Pass or fail. | All projects ⋯ › Duplicate project on Test 3. Expect the toast to count up and the copy to open. Change something in the copy and the original stays the same. Delete the copy afterwards. | Smoke-tested by me only. |
| C4 | OVERNIGHT_REPORT.md:291 | On a big set, the first page you tick is ready first. | Pass or fail. | In a throwaway, upload the 117 MB Vol2 set (a copy is in Test 3) and tick one sheet. Expect it Ready in about 45 s, not 4 minutes. | Smoke-tested by me only. |
| C5 | OVERNIGHT_REPORT.md:480 | Calculated earthwork lines belong to Calculate. | Pass or fail. | On a duplicate of Marketing Demo – Site (not C-200, as the report says). Expect: the outputs show an excavator; clicking the icon does nothing; a double-click opens the details; ⋮ has no Delete. | Smoke-tested by me only. |
| C6 | OVERNIGHT_REPORT.md:482 | A copied project's earthwork reads as current. | Pass or fail. | Duplicate Marketing Demo – Site and open the copy's grading sheet. No line says "Needs recalculating". | Smoke-tested by me only. |
| C7 | archive/OVERNIGHT_REPORT_2026-10-11.md:318–327 | Three checks from last night. The Wage Calculator fills at once after an api restart. The Auto Count benchmark gives office 68/0, "C" 24/0, E200 A 12/0, A1 6/0. A dense sheet loads about 2× faster. | Pass or fail. | The benchmark page, and Riverside › Wage Calculator. | No record of your check. |
| C8 | archive/OVERNIGHT_REPORT_2026-10-10.md:234–241 | Four checks from 10-10. Settings tabs mark at once. The benchmark samples look like the ones you meant. A `1:100` metric sheet offers Approve. The Sheets panel stays smooth during a load. | Pass or fail. | Settings; the benchmark page; Test 3 during a load. | No record. |
| C9 | archive/OVERNIGHT_REPORT_2026-10-08.md:606 | The Auto Count rules for which matches start checked. | Try Auto Count on a few of your own symbols and tell me what it misses. | On sheet copies in a throwaway, never the originals. | No. |
| C10 | MANAGER.md:23; wbs_split_tasks.md (P-26) | Two trees: your own folders, and classification. Not smoke-tested, at your word. | Pass or fail. | Duplicate Riverside. Switch Folders / Classification in the Takeoff panel. Use Change classification… then undo. A new item lands in the selected folder or code. Both fields appear in New Measurement. Estimating groups by each tree. | No. |
| C11 | MANAGER.md:24 (P-20a) | Rotate pages. | Pass or fail. | Test 3 copy: Sheets ⋮ › Rotate Pages… › Landscape. Set to 90°. Markups stay on their features with the same quantities. Thumbnails turn. A second window turns live. | No. |
| C12 | MANAGER.md:25 (F6) | The item model. Steps: archive/OVERNIGHT_REPORT_2026-09-28.md:435–553, plus the 10-03 additions. | Pass or fail; then I archive the spec. | Riverside copy. A 7'-6" height × 40 ft gives about 300 SF; pitch 6/12. Sub-items `PARENT × 1.05`. Variables. A folder ×2. Layers. Duplicate gives "(2)". Classification. The sub-items editor at phone width. | No. |
| C13 | MANAGER.md:26 (F7, with P-21) | Canvas tools. Steps: archive 09-28:555–684 and archive 09-29:205–235. | Pass or fail. | Riverside copy. Still never driven by anyone: a vertex conflict, a six-section paste, a three-item box delete, and Crop as New Page seen in a second window (needs a second throwaway account). | No. |
| C14 | MANAGER.md:27 (F9) | The Estimating tab and export. Steps: archive 09-29:156–197. | Pass or fail. | Riverside copy. The grid, groupings, pricing, wastage, cost components, Format, then the Excel export. | No. |
| C15 | MANAGER.md:28 (F9c) | The Estimating sidebar and reports. | Pass or fail. | Riverside copy. Report totals equal TOTAL. Sidebar collapse holds after reload. The Needs attention count matches. Set values on 10 rows changes only those, and one undo restores them. | No. |
| C16 | MANAGER.md:29; bid_summary_tasks.md:77–85 (F9b) | The bid summary. | Pass or fail. | Riverside copy. Direct $100,000, material $40,000, tax 8%, overhead 10%, profit 10%, bond 1% → Bid total **$126,120.72**. The export's Bid Summary sheet recalculates in Excel. | No. |
| C17 | MANAGER.md:30 (F12, plus D-292 to D-297) | Earthwork. | Pass or fail. | Marketing Demo – Site copy. Contours and spots, the boundary, Calculate, Site Features, Strip Areas, the estimate lines, Auto Trace. Also the elevation check, the breakdown, Net in words, "Compare without topsoil strip", uncovered shading. | No. |
| C19 | MANAGER.md:31 (F13) | Auto Count. | Pass or fail. | E200 day copy, from the region menu. Vector mode: quarter turns and mirror. Image mode: A1 6/0, A 12/0. The slider opens at 70. Create (N), then one Ctrl+Z removes it. | Spec fully ticked; only your check holds it. |
| C20 | MANAGER.md:33 (F15 Community) | The forum. | Pass or fail. | Throwaway account. Post with an image and a video, reply, vote, accept an answer, check the bell, Report, then restore from the staff board. | Spec fully ticked. |
| C21 | MANAGER.md:33 (F15 first slice) | Reports, Shifts, Time Tracking, Clock in. | Pass or fail. | Riverside copy › Reports; Settings › Shifts. | No. |
| C22 | MANAGER.md:39 (TF) | Takeoff-first. | Pass or fail. | Throwaway. A new project has no seed folders. Drop a folder plus loose PDFs: the tree is kept. Only drawing-size pages are pre-ticked. Home opens the last sheet. Search "zzq" gives "No projects match." Upload tray: Cancel, Retry. Drop files on the empty state, then rename the dated name. | Smoke-tested by me. Real folder drag-and-drop is untested. |
| C23 | MANAGER.md:38 (F5-LF) | Folders on load. | Pass or fail. | Throwaway. Load 3 one-page and 3 multi-page PDFs. One-page files land loose. A blank folder name becomes "<file> Set". "Wet Trades" and " wet trades " merge. | Smoke-tested by me only. |
| C24 | MANAGER.md:34 (F14) | AI tools and credits. | Pass or fail. **Costs real money.** | Throwaway sheet. Page Name, Sheet # and Scale, single and ALL. Auto-Name Sheets, Ask AI, Extract Schedule. Settings › AI Credits shows the history. | Spec fully ticked. |
| C27 | ZOOM_GLITCH_STATUS.md:73 | Zoom handover on your own GPU at 125%. | Pass or fail. | Riverside page 1. Wheel-zoom Fit → 2.4× → 5.2× → back to 3.3×. Expect one swap, nothing moving. | No. |
| C28 | PARITY_GAPS.md:54, 149 | Does a double-click finish a Linear or Area run? The hint says it does. | Yes or no. | Riverside copy: draw a Linear run and double-click. | No. |
| C30 | MANAGER.md:37 (F16) | Billing end-to-end, on the bench's Stripe fake. | Pass or fail. | A throwaway workspace. Checkout turns an expired trial into Professional. Billing page and portal. Seats refused when full. Trial caps. Buy an AI pack. A comp Essentials workspace loses editing, and its refusals now name the plan (D-356). | No. Next on the board. |
| C31 | MANAGER.md:36; BUILD_BRIEF.md:120 (F20) | The Wage Calculator: 11 steps. | Pass or fail. | Riverside copy › Wage Calculator. (1) National Average, Calculate, Save. (2) ZIP 6604 gives Bridgeport, CT. (4) Upload `tx115.txt` gives 26 classifications. (6) Direct gives a "Labor burden" line to 2 decimals. (7) Type Laborer $60: offered again on the same basis only. Full list: BUILD_BRIEF.md and the api's `docs/wage-calculator/` report. | No. Automated pass 11/11 only. |

## Specs to review

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| S1 | revision_sets_spec.md:516–560 (F21) | Revision sets: a new set's sheets paired with the old ones, takeoff carried over, and changes flagged. 18 open questions, each with a default. Plan: about 15 days in 8 blocks; first cut A–D, 8.5 days. | Answer the 18, or say "defaults", and approve the plan. | Read the spec. | No. |
| S4 | PARITY_GAPS.md:146–193 | Two lists: "build next, top 15", and "recommend not porting". | Confirm or reorder the top 15; sign off the not-porting list. | Read it. | No. |
| S5 | LEGACY_UMERALAMDEV_DIFF.md (items 1–23) | Legacy changes since 2026-09-24 still to schedule. Mostly cost components and estimating. Earthwork is done. | Say which are still owed. | Read it. | Partly: the earthwork items were built in F12. |

## For Abdullah (listed only, not for you to check)

- **Today's report** (OVERNIGHT_REPORT.md:296–302, 486–491, 536–540):
  - the duplicate-project worker task needs S3 read/write on the bucket;
  - ranged reads need `Range` allowed;
  - two migrations (`d352a4c1b7e9`, `d354b2e8c4a1`);
  - a Redis key `prepare:download_rate`;
  - the crop-box backfill on production, a dry run first.
- **Archived reports** (OVERNIGHT_REPORT_2026-10-11.md:351–361, 2026-10-10.md:113–116 and 247–255):
  - the production image serves gzip'd wasm, so the CDN must pass encoding and keep the type;
  - the api warms its reference data at boot;
  - a page-pool worker sized `min(cores÷2, RAM÷700 MB)`, with Redis priority queues;
  - a shared `worker_dir` volume;
  - add `http://localhost:5175` to the bench bucket's CORS (DECISIONS.md:11808).
- **Storage** (DECISIONS.md:1251, 11471, 12394; flows.md:352):
  - the abort-unfinished-uploads lifecycle rule;
  - the IAM user lacks the multipart listing permission (`s3:ListBucketMultipartUploads`): add it,
    so the unfinished-uploads count shows in production instead of "n/a" (D11.1, Umer
    2026-10-11);
  - the IAM user lacks version and lifecycle reads.
- **Workers and beat** (F5_BLOCK_B_REPORT.md:479; F5_BLOCK_A_REPORT.md:121; api STATUS.md:361–400):
  - a `previews` worker, niced;
  - exactly one Celery beat;
  - rebuild the production image (`nh3`) from the `production` target only.
- **Realtime** (`intelcost-infra/notes/2026-09-26_realtime_caddy_for_abdullah.md`):
  - how many uvicorn processes;
  - Caddy `stream_close_delay`;
  - no idle timeout under 60 s;
  - the CORS origin;
  - Redis `maxmemory`.
- **Migrations on start** (`intelcost-infra/notes/2026-10-02_api_migrations_on_start_for_abdullah.md:33–40`): option A or B, and the worker must wait for it.
- **Stripe library** (D-382): rebuild the production image for the new dependency (`stripe>=16.0.0`);
  the library sends API version `2026-09-30.endive`, so note it beside the account's own (D9).
- **Stripe** (F16_GO_LIVE.md; F16_SPEC.md:122–128; DECISIONS.md:10711):
  - products, prices, the webhook secret and the portal configuration;
  - **the account's API version:** confirm and note it in F16_GO_LIVE.md step 7 (D9, Umer
    2026-10-11).
- **Currency and measurement system** (D-373, D-374; OVERNIGHT_REPORT.md, 2026-10-12):
  - two migrations: `d373a1b9c4e5` (currency) and `d374b6c2d9e1` (unit system);
  - `METRIC_ENABLED=false` in production's api environment. It is the default, but set it
    explicitly so Metric stays limited to platform admins until it is released.
- **Optional:** a read-only database role for the wage reference data (DECISIONS.md:10864).
- **Legacy data migration and cutover, P-16/F17** (FEATURES.md:86): not yet specced.
- **The 🔧 review table** (flows.md:345–359): SES, production CORS, lifecycle, worker sizing, and the Stripe setup.

## Parked

| # | File:line | What it is | Your answer |
|---|---|---|---|
| S3 | drafts/c200_acceptance_tasks.DRAFT.md:276–313 | C-200 gap: 11 questions, parked on purpose by D-232. | Later (2026-10-11) |
| D7 | DECISIONS.md:9848 (D-271) | About 25 site-stitching calls made while building. | Later: parked with C26 (2026-10-11) |
| D16 | DECISIONS.md:12424 (D-340) | The 47.9 GB storage backup at `E:\bench-backups\minio-intelcost-local-2026-10-10.tar`. | Later: keep until MinIO is retired (around 2026-10-18), then delete. Tied to the MinIO retirement, already tracked; no separate reminder (2026-10-11) |
| D17 | archive/OVERNIGHT_REPORT_2026-10-10.md:52 | Moving the repos onto the Linux disk. | Later: parked, revisit later (2026-10-11) |
| D21 | FEATURES.md:87 (P-17) | A provider for the project map and address lookup. | Later: keep deferred (2026-10-11) |
| D22 | PARITY_GAPS.md:154, 182 (D-287 6) | The Library page. | Later: keep parked (2026-10-11) |
| C18 | MANAGER.md:32; DECISIONS.md:8148 (F18, D-232) | The C-200 acceptance, your own test by hand. | Later: parked with C-200, D-232 (2026-10-11) |
| C26 | MANAGER.md:35 (F19) | The site-stitching click check. It needs a C-200 copy. | Later: parked with C-200 (2026-10-11) |
| S2 | drafts/zoom_hybrid_images.DRAFT.md:121–129 | Sharper deep zoom from pre-made images: 4 questions. | Later (2026-10-11) |
