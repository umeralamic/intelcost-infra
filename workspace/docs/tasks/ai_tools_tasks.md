# F14: AI tools and AI credits

> **Adopted 2026-10-02 (D-236)** with the founder's fifteen answers, A9 to A25 as recommended.
> - **Scope (D-235):** only the AI tools live legacy shows today: the region menu's Page Name,
>   Sheet # and Scale (each with ALL), Ask AI and Extract Schedule; Auto-Name Sheets; the credit
>   screens. Retired AI features are out.
> - **Research and the metering design:** [ai_credits_research.md](drafts/ai_credits_research.md).
> - **Built from** legacy's source on `UmeralamDEV`, its plans and live legacy (screens only:
>   every legacy AI call spends real credits).

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

## Design (D-236)

**The api owns it (D-03).** An `ai` feature:
- **One model client behind a provider setting** (`AI_PROVIDER`, `AI_MODEL`, `AI_MODEL_ASK`):
  - `gemini` and `openai`, keys in the api only (hard rule 5);
  - `fake` on the bench, deterministic, with real token counts for the crop it is sent.
- **The meter** (pure, `app/features/ai/meter.py`):
  - `credits = (in × price_in + out × price_out) ÷ (retail × (1 − margin))`;
  - a 0.01 minimum, 4 decimals half up;
  - each call stamps the price row and margin it used.
- **The ceiling:** a conservative input count (prompt characters ÷ 3 plus the provider's
  image tokens for the crop's pixel size, + 10 %), plus the tool's output cap.
- **The estimate:** the input count plus the tool's median output over its last 50 calls in
  the workspace (fallback: naming 150, Ask AI 400, schedule 4,500 tokens).
- **Holds** (pure arithmetic in `meter.py`, applied under `SELECT … FOR UPDATE` on the
  wallet row):
  - **The hold** refuses when the ceiling does not fit any of:
    - the wallet (included + purchased − held);
    - the person's monthly limit;
    - the Tier 3 trial cap.
  - **Settle** charges the actual from included credits first, then purchased, and releases
    the rest.
  - **A failed or unusable reply** releases it all, and the call is logged at 0.
  - **A sweep** every 5 minutes releases any hold older than 10 minutes.
- **The wallet:**
  - seats × 100 a month, refilled by Celery beat for every workspace;
  - purchased credits never expire;
  - the three member switches;
  - the per-user limit.

  No client writes a balance or the seat count.
- **The ledger:** one row per refill, grant, purchase and spend.
- **The call log:** one row per call, with:
  - tool, model, tokens in and out;
  - cost at list price and credits;
  - status: ok, failed, unusable or cached;
  - project and sheet.
- **The cache:** per workspace, 30 days, keyed by tool, model and a hash of the crop and
  its parameters.
- **Who may call:** `canRunAi`.
- **Who sees what** (enforced on the api):
  - owners and admins: estimates, the balance chip, the "Used x · y left" line and
    everyone's calls;
  - members: each of the three only when its switch in Settings › AI Credits is on.

## Blocks

- **A.** The metering, holds and settlement: the model client, meter, wallet, ledger, call
  log, cache, refill, trial cap and per-user limit; the credit rows in the quantity table.
- **B.** The estimate and result display:
  - "≈ x credits (at most y)" and "Used x credits · y left";
  - the confirmation above 15 credits;
  - the balance chip in both headers;
  - Settings › AI Credits: Balance, Per-user limit, the three switches, Top up listing the
    packs (checkout is F16's).
- **C.** The per-call history:
  - Settings › AI Credits "Recent AI calls";
  - Reports › AI Usage filled (tiles, Per estimator / project / tool, and per call), CSV.
- **D.** AI economics (platform admin):
  - exposure;
  - implied and realized margin;
  - the tripwire with an email;
  - prices, the margin and packs, each appended, never edited in place;
  - the model in use per tool.
- **E.** Naming and Scale with the AI fallback (single and ALL), Auto-Name Sheets (row,
  panel, selected, the naming dialog's link), and the offer after an upload.
- **F.** Ask AI.
- **G.** Extract Schedule: review, file, create, saved reads and markers, evidence links.
- **The model test:** `python -m app.features.ai.trial` (20 sheets for naming, 3
  schedules). Run once with the provider keys set; the results go into D-236's follow-up.

## Progress

- [x] Draft written 2026-10-01; research 2026-10-02.
- [x] The founder's answers (D-236); spec adopted.
- [x] A (2026-10-02) · [x] B · [ ] C · [ ] D · [ ] E · [ ] F · [ ] G
- [ ] The model test (needs a provider key on the api).
- [ ] PARITY's F14 lines corrected and ticked.
