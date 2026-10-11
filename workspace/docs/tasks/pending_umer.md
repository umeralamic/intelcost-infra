# Waiting on Umer

_Compiled 2026-10-11 from every doc in the workspace and in `intelcost-app-react`,
`intelcost-app-fastapi` and `intelcost-infra` (all on `umer-dev`). Step 1: a list only, nothing
changed in any source file._

**How to answer:** by number. `D1 ok` · `C3 no: <note>` · `S1 later`. Decisions are D, click checks C, specs S.
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

"Looks closed" means a later decision or report already settled it. One word, `ok`, closes it.

**Answered:** batch 1 (2026-10-11): D10, D12, D15, D25 to D36, C25 and C29 confirmed and closed in their source files; S3 parked. The numbers of the open items are unchanged.

---

## Decisions

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| D1 | DECISIONS.md:1606, 1609, 1611 (D-35) | Three zoom choices made without you. Zoom out stops at a sheet's Fit when Fit is below 10%. Every zoom step is ×1.25. The 0 key goes to Fit. | Accept or reject each of the three. | Riverside page 1. Zoom all the way out, press zoom in and out a few times, then press 0. | Partly. Split view reuses them and was accepted (D-107). D-35's own choices were never accepted. |
| D2 | DECISIONS.md:4064, 4073 (D-103) | Where the zoom menu opens: the top button of the bottom-right cluster, and the clickable percentage at the top right. | Accept the placement. | Riverside page 1: click each percentage. | Partly overtaken by D-122, which moved the cluster's percentage between Zoom in and Zoom out. |
| D3 | DECISIONS.md:4762 (D-119) | Text at reading zooms above Fit is drawn darker, through a contrast curve. | Pass or fail on your own monitor (2560×1440 at 125%). | In a throwaway, upload a dense notes sheet. Compare 29% with 50%, then with `docs/tasks/ours-notes-29.webp`. | No. |
| D4 | DECISIONS.md:6620–6635 (D-181) | Six earthwork editing behaviours kept on purpose where they differ from legacy. An edit that makes contours cross is refused. A boundary keeps at least 3 points. Elevation edits can be undone. A result goes stale when points move. Earthwork is drawn on reload. Breaking at a vertex does not repeat it. | Accept or reject the six. | Duplicate Marketing Demo – Site. On the copy's grading sheet, edit a contour, a spot and the boundary. | No. D-182 and D-183 closed only the two "left for later" points. |
| D5 | DECISIONS.md:8407 (D-237) | When the AI page-name, sheet-number and scale readers spend credits. A single read uses the AI at once when the text fails. "All sheets" asks first above 15 credits. After adding pages, a toast offers Auto-name. | Accept or change. | A throwaway sheet: region menu › Page Name, then the ALL dialog. **These are real AI calls and cost real money.** | Partly overtaken: D-320, D-321 and D-324 moved the reads to the server. |
| D6 | DECISIONS.md:9622 (D-265) | Two Wage Calculator rules. A rate you typed by hand is offered again only while the pricing basis stays the same. The first Direct save copies the workspace bid defaults into the project. | Accept or change. | Check C31, steps 6 and 7. | No. |
| D7 | DECISIONS.md:9848 (D-271) | About 25 site-stitching calls made while building. Examples: which way a join runs, shapes merging on join. | Accept, or name the ones to change. | Check C26. | Only its two questions were answered (D-272, D-273). |
| D8 | DECISIONS.md:10200, 10303, 10382, 10420, 10485, 10541, 10584, 10630 (D-277 to D-285) | The billing build's own calls. Examples: an ownership transfer is never refused for seats, a comp plan has no invoices, the trial-cap details, and who can buy AI packs. | Accept, or name the ones to change. | Check C30. | You amended D-277 points 18, 20 and 24, so those look reviewed. No acceptance for the rest. |
| D9 | DECISIONS.md:10245; F16_SPEC.md:113 (D-277 Q14) | Which Stripe API version the real account uses. | Confirm it, or hand it to Abdullah. | Stripe dashboard › Developers. | No. |
| D11 | DECISIONS.md:11470, 11504, 11598, 11624, 11661, 11676, 11696, 11698, 11753, 11757, 11776, 11797, 11873, 11887, 11888, 12009, 12050 (D-313 to D-326) | Calls made on your behalf in the load screen and app shell. Examples: Upload takes any file type; a tile's 3:2 frame; the wording "Preparing…"; a sheet's name is the title nearest its number; "Change scale on this sheet?" stays; one naming set per page size. | Accept, or name the ones to change. | Checks C22 and C23. | No. (D-316 and D-320 were overtaken by D-321, D-322 and D-327.) |
| D13 | DECISIONS.md:12494, 12515, 12520 (D-343) | Auto Count Image mode calls made on your behalf: whole-region scoring rejected, and a 0.8 one-size threshold. | Accept or change. | Check C2. | Partly. D-346 and D-348 amend it. |
| D14 | DECISIONS.md:12671–12685 (D-349) | What Duplicate project copies. Settings, rates and crews are copied. Comments, share links, AI history and activity are not. A copy is named "X (copy)". | Accept or change the list. | Check C3. | No. |
| D16 | DECISIONS.md:12420 (D-340) | A 47.9 GB storage backup kept at `E:\bench-backups\minio-intelcost-local-2026-10-10.tar`. | Keep it, or delete it. | Nothing to check. | No. |
| D17 | archive/OVERNIGHT_REPORT_2026-10-10.md:52 | Moving the repos onto the Linux disk. Measured: a cold app compile takes 456 s on the Windows share against 9.9 s on the Linux disk, and the worker crashes are linked to it. | Go or no-go. | Nothing to check. | No. |
| D18 | archive/OVERNIGHT_REPORT_2026-10-07.md:271 | On Essentials, a plan limit still says "Your role cannot …". | Change it to plan wording, or keep it. | An Essentials throwaway workspace: try to edit an estimate. | No. |
| D19 | archive/OVERNIGHT_REPORT_2026-10-02.md:424 | Hidden Valley Spec has a live "Anyone with Link" share, made 2026-10-01. | Keep it, or revoke it. I will not touch your project unless you say so. | Nothing to check. | No. |
| D20 | archive/OVERNIGHT_REPORT_2026-10-02.md:33–41 | Hidden Valley Spec's classification system was left as CSI. | Keep it, or set it back to empty. | Nothing to check. | No. |
| D21 | FEATURES.md:87 (P-17) | Project map and address lookup need a provider. | Choose a provider, or keep it deferred. | Nothing to check. | No. |
| D22 | PARITY_GAPS.md:154, 182 (D-287 6) | The Library page is parked. The gaps doc suggests dropping it, and its dashboard button, if no price list is wanted. | Keep parked, or drop it. | Nothing to check. | Parked by D-287. |
| D23 | intelcost-app-fastapi/docs/wage-calculator/README.md:55 | That doc names a published cost book. Does the no-names rule (D-328) cover cost books too? | Yes (I reword it) or no. | Nothing to check. | No. |
| D24 | CLAUDE.md (Git section); workspace root | The `.claude/` folder (the edit hook) is not in the versioned mirror. A stray `SAM.gov.pdf` sits at the workspace root. | Add `.claude/` to the mirror or not; keep or move the PDF. | Nothing to check. | No. |

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
| C18 | MANAGER.md:32; DECISIONS.md:8148 (F18, D-232) | The C-200 acceptance: your own test, by hand. | Do it yourself, or park it. | Its data is Hidden Valley's, so I give no steps and won't open it. | No. Acceptance was not met as of D-192. |
| C19 | MANAGER.md:31 (F13) | Auto Count. | Pass or fail. | E200 day copy, from the region menu. Vector mode: quarter turns and mirror. Image mode: A1 6/0, A 12/0. The slider opens at 70. Create (N), then one Ctrl+Z removes it. | Spec fully ticked; only your check holds it. |
| C20 | MANAGER.md:33 (F15 Community) | The forum. | Pass or fail. | Throwaway account. Post with an image and a video, reply, vote, accept an answer, check the bell, Report, then restore from the staff board. | Spec fully ticked. |
| C21 | MANAGER.md:33 (F15 first slice) | Reports, Shifts, Time Tracking, Clock in. | Pass or fail. | Riverside copy › Reports; Settings › Shifts. | No. |
| C22 | MANAGER.md:39 (TF) | Takeoff-first. | Pass or fail. | Throwaway. A new project has no seed folders. Drop a folder plus loose PDFs: the tree is kept. Only drawing-size pages are pre-ticked. Home opens the last sheet. Search "zzq" gives "No projects match." Upload tray: Cancel, Retry. Drop files on the empty state, then rename the dated name. | Smoke-tested by me. Real folder drag-and-drop is untested. |
| C23 | MANAGER.md:38 (F5-LF) | Folders on load. | Pass or fail. | Throwaway. Load 3 one-page and 3 multi-page PDFs. One-page files land loose. A blank folder name becomes "<file> Set". "Wet Trades" and " wet trades " merge. | Smoke-tested by me only. |
| C24 | MANAGER.md:34 (F14) | AI tools and credits. | Pass or fail. **Costs real money.** | Throwaway sheet. Page Name, Sheet # and Scale, single and ALL. Auto-Name Sheets, Ask AI, Extract Schedule. Settings › AI Credits shows the history. | Spec fully ticked. |
| C26 | MANAGER.md:35 (F19) | Site stitching. | Pass or fail. | Needs C-200 in a copy. Duplicating Hidden Valley reads the original but never opens or writes it. Say if that is allowed; otherwise park this. In the copy, crop C-200 into overlapping halves, join at the match line, Calculate. Cut and fill must equal the single sheet. | No. |
| C27 | ZOOM_GLITCH_STATUS.md:73 | Zoom handover on your own GPU at 125%. | Pass or fail. | Riverside page 1. Wheel-zoom Fit → 2.4× → 5.2× → back to 3.3×. Expect one swap, nothing moving. | No. |
| C28 | PARITY_GAPS.md:54, 149 | Does a double-click finish a Linear or Area run? The hint says it does. | Yes or no. | Riverside copy: draw a Linear run and double-click. | No. |
| C30 | MANAGER.md:37 (F16) | Billing end-to-end, on the bench's Stripe fake. | Pass or fail. | A throwaway workspace. Checkout turns an expired trial into Professional. Billing page and portal. Seats refused when full. Trial caps. Buy an AI pack. A comp Essentials workspace loses editing. | No. Next on the board. |
| C31 | MANAGER.md:36; BUILD_BRIEF.md:120 (F20) | The Wage Calculator: 11 steps. | Pass or fail. | Riverside copy › Wage Calculator. (1) National Average, Calculate, Save. (2) ZIP 6604 gives Bridgeport, CT. (4) Upload `tx115.txt` gives 26 classifications. (6) Direct gives a "Labor burden" line to 2 decimals. (7) Type Laborer $60: offered again on the same basis only. Full list: BUILD_BRIEF.md and the api's `docs/wage-calculator/` report. | No. Automated pass 11/11 only. |

## Specs to review

| # | File:line | What it is | What you need from me | How I check it | Already done elsewhere? |
|---|---|---|---|---|---|
| S1 | revision_sets_spec.md:516–560 (F21) | Revision sets: a new set's sheets paired with the old ones, takeoff carried over, and changes flagged. 18 open questions, each with a default. Plan: about 15 days in 8 blocks; first cut A–D, 8.5 days. | Answer the 18, or say "defaults", and approve the plan. | Read the spec. | No. |
| S2 | drafts/zoom_hybrid_images.DRAFT.md:121–129 | Sharper deep zoom from pre-made images. 4 questions: measure on your machine first? which zoom levels? when to make the images? is about 1 h of worker time and 1.6 GB per 625-sheet set acceptable, or a paid feature? | Answer the 4, or park it. | Read the draft. | No. |
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
- **Storage** (DECISIONS.md:1251, 11471, 12389; flows.md:352):
  - the abort-unfinished-uploads lifecycle rule;
  - the IAM user lacks multipart listing and version and lifecycle reads.
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
- **Stripe** (F16_GO_LIVE.md; F16_SPEC.md:122–128; DECISIONS.md:10711):
  - products, prices, the webhook secret and the portal configuration;
  - the API version blanks.
- **Optional:** a read-only database role for the wage reference data (DECISIONS.md:10864).
- **Legacy data migration and cutover, P-16/F17** (FEATURES.md:86): not yet specced.
- **The 🔧 review table** (flows.md:345–359): SES, production CORS, lifecycle, worker sizing, and the Stripe setup.

## Parked

| # | File:line | What it is | Your answer |
|---|---|---|---|
| S3 | drafts/c200_acceptance_tasks.DRAFT.md:276–313 | C-200 gap: 11 questions, parked on purpose by D-232. | Later (2026-10-11) |
