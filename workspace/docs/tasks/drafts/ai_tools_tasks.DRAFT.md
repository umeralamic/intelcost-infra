# F14: AI tools and AI credits (draft spec, questions open)

> **Draft, written overnight 2026-10-01 (task 7 of the plan).** Nothing is built. The
> founder's answers to the questions at the end come before any code.
> - **Sources:** legacy's source on `UmeralamDEV` (its three AI edge functions, the shared
>   credit code, the takeoff page, the AI Credits tab, the reports), its migrations and
>   plans, and PARITY's F14 lines.
> - **Not driven live:** every legacy AI call spends real credits on the live workspace.
> - **PARITY** is corrected where the code disagrees (below).

## The problem

Estimators read names, scales, callouts and schedules off drawings by eye. Legacy lets a
model do the reading inside a box drawn on the sheet, and meters it in AI credits. The new
app reads only the PDF's text layer (D-116); a sheet with unreadable fonts, a scan, or a
schedule table still has to be typed by hand.

**Problem → solution.** Unreadable text and schedules. → Legacy's AI tools:
- name and scale from a region, falling back to the model when the text layer fails;
- Ask AI about a region;
- Extract Schedule into items;
- Auto-Name Sheets from the title block;
- AI credits: a pooled wallet, per-user limits, top-ups, and the AI Usage report.

## Legacy, in brief

### Shared

- **Three live functions:** `region-ask-ai`, `region-extract-schedule` and
  `ocr-sheet-titleblock`. The rest are retired and nothing calls them.
- **Model:** `google/gemini-2.5-flash` through the Lovable gateway. Each function makes one
  buffered call with a PNG crop and a text prompt: no streaming, no system message.
- **Who may call:** anyone who can read the sheet, viewers included. There is no role
  check.
- **Metering:**
  - A check before the call, at a fixed 0.01-credit estimate. If the check itself errors,
    the call goes ahead.
  - After the call, a usage event is recorded and credits are debited by actual tokens,
    with a 0.01 minimum: about **0.03 credits per call** at the seeded rates.
  - Retail is fixed at **$1 = 100 credits**.
- **Messages:**
  - An empty pool shows "Out of AI credits — an admin can top up in Settings → Workspace →
    AI Credits."
  - A personal cap shows the server's own text.
  - "AI credits running low" fires below 10 credits, once per session, for Ask AI and
    Extract Schedule only.
- **The region menu** (a Select-tool box over empty sheet space), in order:
  - Page Name, Sheet # and Scale, each with an "All";
  - Ask AI, Extract Schedule, Auto Count;
  - Copy as Text, Copy as Image, Search as Text, New Snapshot, Crop as New Page.

  AI rows carry a sparkle. Ours has the naming, scale and copy rows (D-116), and no Ask AI,
  Extract Schedule or Auto Count.

### Name and scale from a region

- **Page Name / Sheet # (this sheet):** text layer only. **They never call the model**,
  despite the sparkle and "uses AI only if the text layer is unreadable". Ours is the same,
  without the sparkle.
- **Page Name / Sheet # · All:** text first, then the model per empty field, on a 1400 px
  crop of the box.
  - Rows are marked "OCR" when the model filled them.
  - "use Auto-Name Sheets for these" runs the title-block read on rows still empty.
- **Scale (this sheet):** the whole page's text first. If nothing parses, the model reads
  the box, and the dialog shows an "AI" chip.
- **Scale · All:** text only per sheet. It may still call the model on the active sheet and
  then throw the result away.
- **Arming a tool from the box** (the quick tool strip) quietly asks the model for a name
  when the text is unreadable. Errors, out-of-credits included, are swallowed.

### Ask AI

- A modal titled "Ask AI about this region", with the crop above the question.
- **Suggestion chips:** "What is in this region?", "List every callout and its quantity.",
  "Read this schedule as rows.", "What material and thickness is specified here?"
- Ctrl/Cmd+Enter asks, and "Ask" becomes "Ask again".
- **Sent to the model:** a 1400 px crop, the question (≤ 1000 chars), the PDF text in the
  box (≤ 4000) and the sheet's label.
- **Single turn:** no history, no copy or insert, nothing saved.
- A "questions left today" line is dead code from a retired cap.

### Extract Schedule

- **The read:** the box goes to the model with a JSON schema. It returns the schedule type,
  headings, rows, a quantity only when the schedule prints one, and a confidence that is
  never shown.
- **Type mapping:**
  - door, window, fixture, equipment and other → Count (EA);
  - finish, flooring and ceiling → Area (SF).
- **Review step:**
  - Item names from chosen headings, with a separator.
  - Three quantity modes: use the printed quantity, start at zero, or start at zero with
    the printed figure as a note.
  - Editable names and quantities.
  - "Show existing items and modify".
- **File step:** the classification cascade and a colour.
- **Create:** items with **no geometry**; the estimator counts them with Resume. One undo
  entry per batch.
- **Persistence:**
  - After the first batch, the read is saved with a "Schedule · N" marker on the sheet.
  - The marker reopens the read **at no AI cost**.
  - "Remove marker" keeps the items.
  - Closing before the first batch discards the read.

### Auto-Name Sheets (title-block OCR)

- **How it reads:** the same model, not an OCR engine. It reads a fixed bottom-right
  30% × 22% crop.
- **What it writes:** the server writes the sheet number and the title-cased name itself;
  acronyms stay upper case.
- **Entry points:**
  - the sheet row's "Auto-Name Sheet";
  - the panel's "Auto-Name Sheets";
  - "Auto-Name Sheets (selected)";
  - the naming dialog's link.

  All run one sheet at a time, from the browser. Sheets are not named on upload.
- **Cache:** results are cached by a hash of the crop for 30 days, **across workspaces**.

### AI credits

- **The pool:**
  - seats × 100 credits a month, included;
  - purchased credits never expire and are spent after the included ones;
  - a lifetime 15-credit overdraft that never resets.
- **New workspace:** 100 credits as a starter grant.
- **Refill:** included credits refill only when the billing row changes (Stripe). There is
  no scheduled job.
- **Settings › AI Credits** (owners and admins), three cards:
  - **Balance:** total; included and purchased; the seat allowance.
  - **Per-user limit:** a switch with a default amount, plus a per-member override with
    Reset.
  - **Top up:** packs, seeded Starter 250 / $2.50, Standard 1000 / $10, Pro 5000 / $50,
    with no Stripe price ids. Buying is a one-time Stripe Checkout, credited by the
    webhook.
- **AI Usage report** (`/reports`, the second tab):
  - tiles: used, remaining, balance split;
  - Per estimator, Per project and Per tool tables, each with CSV export;
  - visibility from Settings › Time Tracking.

  **Ours has the tab with an empty state** (D-146); it waits on this feature's events.

## Legacy defects found (facts)

1. **The sparkle promises AI that never runs:** the single-sheet Page Name and Sheet #
   are text only.
2. **Scale · All** can call the model on the active sheet and discard the answer.
3. **Silent failures:** the scale fallback and tool seeding swallow every model error,
   out-of-credits included.
4. **"Auto-Name Sheets (selected)"** ignores errors and keeps calling after the pool is
   empty.
5. **Wrong PDF:**
   - the panel's "Auto-Name Sheets" only works on the project's first PDF;
   - a single auto-name can crop the wrong PDF's page.
6. **The OCR cache:**
   - it is shared across workspaces;
   - a cache hit when applying a name skips the database write.
7. **OCR gateway failures** are not logged, and 402 / 429 are not mapped.
8. **A blank region is billed again** on every dialog open or range change.
9. **Name from page region** blanks an existing sheet name for a row that found only a
   number. Ours keeps the old name (D-116).
10. **Extract Schedule:**
    - a reply that fails to parse is still charged;
    - it is logged as Ask AI, so the report's Per tool mixes them.
11. **A typed quantity is dropped** outside the "use the printed quantity" mode.
12. **The debit result is ignored:** a debit refused after the answer makes the call free;
    the personal cap is only checked before the call, so the last call overshoots it.
13. **The overdraft never resets**, and a workspace without a subscription never refills.
14. **Holes in the credit tables:**
    - admins can update any wallet column, balances included;
    - owners can raise their seat count, which raises the allowance;
    - any signed-in user can call the debit function against any workspace;
    - the gate lets a call through when it errors.
15. **"Admins only" AI usage** still lets a member read their own rows. The Settings text
    says it is enforced at the database.
16. **The AI Credits tab** shows "Loading…" forever without a wallet row. Clearing the
    amount saves 0, while the switch saves 100.
17. **Packs:** the seeded packs contradict the approved plan ($10 to $300), and carry no
    Stripe price ids.
18. **Trial cap:** the 30-credit cap for trial tier 3 is defined and never enforced.
19. **No limits:** no image size cap, rate limit, timeout or retry on the model call.

## PARITY against the code (to fix on adoption)

- **Region menu (line 427):** the order is Page Name, Sheet #, Scale (each with All), Ask
  AI, Extract Schedule, Auto Count, then the copy rows.
- **Ask AI:**
  - Line 739: legacy's chip order is the one above (2nd and 3rd swapped in PARITY).
  - Line 740: the crop is above the question.
- **Extract Schedule:**
  - Line 747: the row table shows only Item name and Qty, not one column per heading.
  - Line 749: there are three quantity modes, not two.
  - Line 752: created rows are hidden, not unchecked with a chip.
  - Line 754: closing discards the read only before the first batch.
- **Credits:**
  - Line 773: the gate uses a fixed 0.01 estimate; `ai_action_credit_cost` is never read.
  - Line 774: the low-balance toast is raised in the takeoff page, for Ask AI and Extract
    Schedule only.
  - Line 180: the "workspace-wide limit" is the default per-user limit; the pool itself is
    seats × 100 and cannot be set.
- **Naming:**
  - Lines 268 and 762-765: ours built text-only naming (D-116 rounds 12-13), so tick what
    is built.
  - Line 764: "Not set" is the region's label, not a row status.
- **No line yet for:**
  - tool-strip seeding;
  - "Auto-Name Sheets (selected)" and the naming dialog's link;
  - the separate pool and cap messages;
  - the OCR cache;
  - the overdraft and the seat-scaled allowance;
  - Modify's toast;
  - the notes mode "Schedule qty: N".

## Design proposal (pending the answers)

- **The api owns it (D-03).**
  - An `ai` feature: one model client behind a provider setting, key in the api only
    (hard rule 5).
  - **Endpoints:**
    - region read (field number, name or scale);
    - title-block read;
    - ask;
    - schedule read;
    - schedule extractions (saved reads and markers).
  - The browser sends the crop it already renders; the api never trusts a quantity it did
    not compute.
- **Credits on the api:**
  - The wallet, ledger and usage events.
  - **Reserve before the call, settle after** (so a refused debit is never free), inside
    one row lock.
  - A scheduled monthly refill (Celery beat), independent of Stripe.
  - Nothing in the wallet is writable from a client.
  - Top-up checkout belongs to F16 (billing); this feature reads its grants.
- **Logging:** one action kind per tool (region read, title block, ask, schedule).
- **The AI Usage report** fills D-146's empty tab from those events, with visibility
  enforced on the api as D-146 does for time.
- **Blocks:**
  - **A.** The model client, the wallet, ledger, events and gate; Settings › AI Credits
    (Balance and Per-user limit); the report tab.
  - **B.** The OCR fallbacks:
    - region naming · All;
    - Scale;
    - Auto-Name Sheets (row, panel, selection), per PDF and in a worker.
  - **C.** Ask AI.
  - **D.** Extract Schedule: review, file, create, saved reads and markers.
  - **E.** Top up (after F16's checkout).

## Questions for the founder

Each gives legacy's behaviour and my recommendation. None is decided.

**Provider and cost**
1. **Model and provider.** Legacy: Gemini 2.5 Flash through the Lovable gateway, which the
   new stack does not have. *Recommend:* a provider setting on the api; Claude Haiku 4.5
   for reads (title block, region, schedule) and a larger model only for Ask AI, priced
   from real rates.
2. **How a call is priced.** Legacy: by actual tokens (about 0.03 credits a call) with a
   0.01 floor; the per-action table is unused. *Recommend:* fixed per-action prices
   (simpler to explain and to report), reviewed against token cost monthly.
3. **Retail and packs.** Legacy: $1 = 100 credits; seeded packs $2.50 / $10 / $50 against
   the plan's $10 to $300. *Recommend:* keep $1 = 100; you pick the pack set.
4. **The overdraft.** Legacy: a lifetime 15 credits, never reset. *Recommend:* drop it;
   reserve before the call instead.
5. **The monthly refill.** Legacy: only when the billing row changes; trial or comped
   workspaces never refill. *Recommend:* a scheduled refill on the period start for every
   workspace.
6. **The trial cap.** Legacy: 30 credits for trial tier 3, defined and never enforced.
   *Recommend:* enforce it.

**Who and what**
7. **Who may spend.** Legacy: anyone who can read the sheet, viewers included.
   *Recommend:* annotate rights.
8. **A refused debit after the answer.** Legacy: the answer is free. *Recommend:* reserve
   the estimate before the call and settle after, so it cannot happen.
9. **A failed read.** Legacy: an unparseable schedule reply is charged. *Recommend:*
   refund any call whose reply cannot be used.
10. **Logging per tool.** Legacy: Extract Schedule logged as Ask AI; every OCR use as
    "Auto-Name Sheets". *Recommend:* one kind per tool.
11. **The cache.** Legacy: title-block and region reads cached 30 days, shared across
    workspaces. *Recommend:* per workspace, region and title-block reads only.
12. **"Admins only" AI usage.** Legacy: members still read their own rows. *Recommend:*
    enforce it on the api, as D-146 does for time.

**Naming and scale**
13. **The sparkle on single Page Name and Sheet #.** Legacy: sparkle, no AI. *Recommend:*
    give the single-sheet read the same model fallback as All, so the sparkle is true.
14. **Auto-name's crop.** Legacy: a fixed bottom-right 30% × 22%. *Recommend:* use the
    saved naming regions when set, else legacy's crop.
15. **A partial read.** Legacy: a number-only row blanks the sheet name. Ours keeps the
    old name (D-116). *Recommend:* keep ours.
16. **Naming on upload.** Legacy: sheets start as "Page N". *Recommend:* offer
    "Auto-name these sheets" once after an upload, never automatically (it spends credits).
17. **Silent failures.** Legacy: the scale fallback and tool seeding swallow out-of-credits.
    *Recommend:* show the out-of-credits message everywhere a call is made.

**Ask AI and Extract Schedule**
18. **Ask AI's conversation.** Legacy: single turn, no history, no copy or insert, no
    streaming. *Recommend:* keep single turn, add Copy and "Add as note", and stream the
    answer.
19. **"Read this schedule as rows."** Legacy: an Ask AI chip that overlaps Extract
    Schedule. *Recommend:* replace it with a link to Extract Schedule.
20. **Confidence.** Legacy: returned, never shown. *Recommend:* warn below 0.6.
21. **Evidence.** Legacy: schedule items have no link to the schedule row they came from
    (planned, never built). *Recommend:* link each item to its saved read and row; the
    marker already exists.
22. **A typed quantity.** Legacy: dropped outside the printed-quantity mode. *Recommend:*
    a typed quantity always wins.
23. **The low-balance warning.** Legacy: below 10, once a session, Ask AI and Extract
    Schedule only. *Recommend:* every AI call.

**Settings**
24. **The per-user limit.** Legacy:
    - the member list is hidden while the limit is off;
    - each value saves on blur;
    - a cleared amount saves 0.

    *Recommend:* keep the list and blur-save; a cleared amount reverts.
25. **The dashboard meter.** Legacy: unmounted. *Recommend:* leave it out; the Reports
    card links to AI Usage.

## Progress

- [x] Draft written overnight 2026-10-01 from legacy's source and plans.
- [ ] The founder's answers.
- [ ] PARITY's F14 lines corrected on adoption.
