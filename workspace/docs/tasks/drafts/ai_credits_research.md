# F14: AI credits, legacy as it is and a usage-based design (research, nothing built)

> **Written 2026-10-02** for the founder, who prefers usage-based charging with the credits
> visible to the user. Sources: legacy's source on `UmeralamDEV` (the credit code in
> `supabase/functions/_shared/aiCredits.ts`, the three AI functions, the credit migrations,
> `AiCreditsTab.tsx`, `AiUsageReport.tsx`, `PlatformAiEconomics.tsx`), its plans, and live
> legacy read without spending a credit (Settings › AI Credits, Reports › AI Usage, AI
> economics, and the account's own `ai_usage_events` rows, read only).
> Companion to [../ai_tools_tasks.md](../ai_tools_tasks.md); its questions A1 and
> A4 to A25 stay open and are answered with this.
> **Scope (D-235):** only the AI tools live legacy shows today; every retired AI feature is
> out of F14, its figures included.

## 0. The active AI tools (confirmed on live legacy, 2026-10-02)

Driven on live legacy's screens, menus opened, no credit spent:

| Where | Tool | Legacy's function |
|---|---|---|
| Region menu (Select box over empty sheet) | Page Name, Sheet #, Scale, each with **ALL** (AI fallback when the text layer fails) | `ocr-sheet-titleblock` |
| Region menu | **Ask AI** | `region-ask-ai` |
| Region menu | **Extract Schedule** | `region-extract-schedule` |
| Sheets panel ⋮ | **Auto-Name Sheets** | `ocr-sheet-titleblock` |
| Sheet row menu | **Auto-Name Sheet** | `ocr-sheet-titleblock` |
| Settings › AI Credits; Reports › AI Usage; Developer › AI economics | the credit screens | — |

Nothing AI on the dashboard, New project, Project Home, Estimating, Earthwork or
Collaborator. Auto Count sits in the region menu but is not AI. The project map's address
lookup (unmetered in legacy) belongs to P-17, not F14.

## 1. How legacy measures a call

- **Already usage-based.** Every live AI call (Ask AI, Extract Schedule, Auto-Name / OCR)
  goes to `google/gemini-2.5-flash` through the Lovable gateway, reads the reply's
  `usage.prompt_tokens` and `usage.completion_tokens`, and charges
  `credits = in × price_in / anchor_in + out × price_out / anchor_out`
  (`_shared/aiCredits.ts:15-45`).
- **Prices:** `ai_provider_pricing`, one row per model, append-only: $0.075 / 1M input,
  $0.30 / 1M output (seeded and live, "matches gateway list"). *To verify against the
  provider's current list price; if it has risen, legacy charges below cost.*
- **The anchor** is the serving cost of one credit: `ai_credit_regimes`, live $0.0070
  (30 % margin, set 2026-08-25 through the AI economics page; the launch value was
  $0.0075, 25 %). Retail is fixed at **$1 = 100 credits** ($0.01 a credit). So the
  customer pays about $0.107 / 1M input and $0.429 / 1M output: **1 credit ≈ 93,000
  input tokens or 23,000 output tokens.**
- **Minimum 0.01 credit** a call, applied once after summing; **rounded to 4 decimals**.
- **No estimate.** Before the call a fixed 0.01 is checked against the pool
  (`check_wallet_allowed_detail`), which fails open on any error.
- **After the call** `consume_credits` locks the wallet, spends included credits, then
  purchased, then an overdraft of up to 15, and writes a ledger row. **If the debit is
  refused the answer is still returned: the call is free.** An unreadable schedule reply
  is charged anyway. An OCR cache hit (30 days, shared across workspaces) costs nothing.
- **Recorded per call:** `ai_usage_events` (tool, model, tokens in and out, `cost_usd`,
  status, latency, `metadata.credits`) and a `credit_ledger` row.
- One AI call is not metered at all: the map's address lookup (`geocode-address`), which is P-17's.

## 2. What the user sees

| Where | Legacy |
|---|---|
| Balance | Only in Settings › AI Credits ("96.11 credits remaining", "96.11 included · 0 purchased") and the AI Usage report. Nothing in takeoff or the header. |
| Cost before a call | Nothing. |
| Cost after a call | Nothing. The function returns `credits_used`; the app never shows it. |
| Running meter | None (the dashboard meter is unmounted; Ask AI's "N questions left today" line is dead). |
| Low balance | Toast "AI credits running low / {n} credits left. An admin can top up in Settings → Workspace → AI Credits." below 10, once a session, after Ask AI and Extract Schedule only. |
| Out of credits | "Out of AI credits — an admin can top up in Settings → Workspace → AI Credits."; a personal cap shows "You've used your personal monthly AI credit limit…". Auto-Name shows a toast; Ask AI and Extract Schedule show it in the dialog. |
| History | Reports › AI Usage: tiles (used this period, remaining, balance split), Per estimator / Per project / Per tool tables (Calls, AI Credits), CSV. No per-call list. Extract Schedule is counted as "Ask AI (region)". Legacy's report also lists retired tools; ours lists only our tools (D-235). |

## 3. What admins see

- **Settings › AI Credits** (owners and admins): Balance, with "Monthly allowance: 100
  credits — 1 seat × 100 credits per seat, pooled across your workspace."; Per-user
  limit (off by default, 100 a member a month, per-member overrides with Reset); Top up.
- **AI usage visibility** (Settings › Time Tracking): Admins only, Members see their
  own, Anyone. The database still shows a member their own rows under "Admins only".
- **AI economics** (platform admins): exposure 2,896.11 credits across 29 workspaces
  (all included, none purchased); implied margin 30.0 %; realized margin n/a (nothing
  purchased); the 22 % tripwire; provider pricing; the serving-cost target; packs.
  *The tripwire can barely fire:* cost and credits are computed from the same price row,
  so a provider price rise is invisible until someone records it.

## 4. Top-ups, allowance, overdraft

- **Allowance:** seats × 100 credits a period, pooled; unused included credits do not
  roll over. **Refilled only when a Stripe subscription event changes the period**: a
  trial or comped workspace never refills. New workspace: 100.
- **Packs (live):** $10 / 1,000, $25 / 2,500, $50 / 5,000, $100 / 10,000 credits
  (the seeded $2.50 / $10 / $50 were replaced on the live database). One-time Stripe
  Checkout, credited by the webhook, idempotent; purchased credits never expire and are
  spent after the included ones.
- **Overdraft:** 15 credits for the life of the workspace; nothing resets it.
- **Trial cap:** Tier 3's 30 credits is stored and never enforced.

## 5. Real cost figures (active tools only, live)

From this account's own `ai_usage_events` rows, 2026-08-23 to 2026-09-30, credits as charged:

| Tool | Calls | Credits: min / median / max | Tokens in (median) | Tokens out: median / max | Time |
|---|---:|---|---:|---|---:|
| Auto-Name Sheets and region naming (OCR) | 79 | 0.018 / 0.032 / 0.042 | 2,483 | 124 / 160 | 4 s |
| Ask AI | 3 | 0.031 / 0.052 / 0.052 | 2,968 | 313 / 427 | 6 s |
| Extract Schedule | 7 | 0.082 / 0.21 / 0.23 | 2,803 | 4,241 / 4,731 | 20 s |

- **Legacy's report agrees:** Auto-Name Sheets (OCR) 79 calls, 2.44 credits (0.031 a
  call); "Ask AI (region)" 10 calls, 1.48 credits (0.148 a call), which is Ask AI's 3
  calls and Extract Schedule's 7 together, since legacy logs both as Ask AI.
- **The output decides the price:** every input is one crop of about 2,500 tokens; a
  schedule's output is about 30 times a sheet name's, and its cost 7 to 13 times.
- The largest active call seen is 0.23 credits. A schedule with more rows than these
  would cost more, in proportion to its output.

## 6. Proposed design: usage-based, visible, never overspent

**Meter (A2).** Price each call from the provider's own token counts:
`credits = (in × price_in + out × price_out) ÷ cost_per_credit`, where
`cost_per_credit = retail × (1 − margin)`. Image tokens count as input (the provider
reports them). Store four decimals, show two. Each call stamps the price row and margin it
used. Calls that fail or whose reply cannot be used cost nothing (A8). A cache hit costs
nothing and says so.

**Scope.** The meter, the estimate and the report cover the active tools only (D-235):
region naming (Page Name, Sheet #, Scale and their ALL), Ask AI, Extract Schedule and
Auto-Name Sheets.

**Before (estimate).** The api knows the input before calling: the prompt and the crop's
image tokens (from its pixel size). Output is bounded by the tool's `max_tokens`. So:
- **Estimate** = input + the tool's median output over its last 50 calls (falls back to
  a table: name 150, ask 400, schedule 4,500 tokens).
- **Ceiling** = input + `max_tokens` (the most the call can cost).
- Shown on the button or in the dialog as **"≈ 0.21 credits (at most 0.40)"**. For Auto-Name
  over many sheets, the total for the run: "≈ 2.5 credits for 80 sheets (at most 3.4)".
- Above a threshold (e.g. 1 credit) the user confirms before it runs.

**Hold and settle (no overspend).**
1. Under a row lock on the wallet: refuse if `balance − held < ceiling` (or the person's
   cap remaining < ceiling); otherwise add the ceiling to `held` and write a hold row.
2. Call the model with `max_tokens`, so the actual can never exceed the ceiling.
3. Settle: charge the actual, release the rest of the hold, in one transaction. A
   refused reply releases it all.
4. A hold not settled within 10 minutes (a crashed worker) is released by a sweep.

This replaces the overdraft (A4) and the "answer is free when the debit fails" hole (A7).
A multi-sheet run holds per sheet as it goes and stops cleanly when the next ceiling no
longer fits, saying how many sheets were done.

**After.** Every result says what it cost: "Used 0.21 credits · 95.90 left" under the
answer, in the toast, or per row of a run. Credits held show while a call runs.

**Always visible.**
- A credits chip in the takeoff header and the app header: the balance, amber below 10,
  red at 0; a click opens the last calls.
- **History per call:** Settings › AI Credits gains "Recent AI calls" (when, who, tool,
  sheet, tokens in and out, credits) and the AI Usage report gains a per-call tab; both
  export.
- Per tool, per estimator and per project as legacy, with Extract Schedule as its own tool
  (A9), listing only our tools (D-235).
- Low-balance notice on every AI call (A23), and before a run that would cross it.

**Admins.** Legacy's AI Credits tab (balance, allowance, per-user limit, top up) plus the
per-call list. **Platform:** legacy's AI economics, with the realized margin computed from
the provider's billed cost when the gateway returns it (so a price rise shows), and an
email when the tripwire fires.

## 7. Choices for the founder

1. **Model and provider (A1):** which model or models; a larger one for Ask AI?
2. **Retail and margin:** keep $1 = 100 credits and 30 % margin (legacy live), or other?
3. **Minimum charge and rounding:** keep 0.01 a call and 4 decimals, or no minimum?
4. **Estimate shown:** "≈ x (at most y)", the estimate only, or the ceiling only?
5. **Confirm threshold:** ask before a call estimated above 1 credit? Another number?
6. **Ceilings:** a fixed `max_tokens` per tool (name 300, ask 1,500, schedule 8,000), or
   per workspace?
7. **Overdraft (A4):** drop it for holds (recommended), or keep a small one?
8. **Allowance and refill (A5):** seats × 100 a month, refilled on schedule for every
   workspace including trials?
9. **Packs:** keep live legacy's $10 / $25 / $50 / $100?
10. **Trial cap (A6):** enforce Tier 3's 30 credits?
11. **Failed or unusable replies (A8):** free (recommended)?
12. **Cache (A10):** per workspace, shown as "free (cached)"?
13. **Per-call history visibility:** members see their own calls, admins see all?
14. **Credits chip:** in both headers for everyone, or admins only?
15. **F17, the active tools' history (D-235):** bring legacy's AI usage rows for the active
    tools (Auto-Name, region naming, Ask AI, Extract Schedule) into our report, or start
    empty? Retired tools' history is not migrated either way.

The rest of the AI tools questions (A11 to A25) are unchanged in
[../ai_tools_tasks.md](../ai_tools_tasks.md).
