# Overnight report, 2026-10-08

Plan: [OVERNIGHT_PLAN.md](OVERNIGHT_PLAN.md). Started 01:29 UTC. Updated after every step. The
previous run's plan and report are archived as `docs/archive/OVERNIGHT_{PLAN,REPORT}_2026-10-07.md`.

| Step | State |
|---|---|
| 0.1 Browser tool on host Chrome | done |
| 0.2 Bucket CORS (D-259) | done (resolved; nothing to remove) |
| 1.1 "billed annually" | done |
| 1.2 Assembly crews at the project's rates | done (D-298) |
| 1.3 D-292 approved | done |
| 1.4 Delete "EW Typo Check" | done |
| 2 Marketing screenshots and the earthwork section | in progress (in parallel) |
| 3 Auto Count Part 1, accuracy | in progress |
| 4 Auto Count marketing shot, build, Pass 5 | not started |
| 5 Auto Count Part 2, speed | not started |

## Step 0. Checks

1. **Browser tool: works, no fix needed.** The Playwright MCP launches Chrome 155 on this Windows
   host (`--isolated` profile) and drives the bench app at `localhost:5173`. Its WebGL renderer
   is the host GPU (Intel UHD Graphics 630 through Direct3D 11), a WebGPU adapter is present
   (intel gen-9), 12 logical cores. Every timing and memory figure in this report is from it.
   Mail guard: on (`MAIL_GUARD=true` in the api).
2. **Sheet bucket CORS (D-259): resolved.**
   - A preflight from `http://localhost:5173` now answers GET, PUT, HEAD, with `content-type`
     allowed and `ETag` exposed (5175, the prod profile, is still refused).
   - In host Chrome as a throwaway account: a new project with E101's PDF uploaded through New
     project (the parts PUT straight to S3, the upload completed, pages ready), then opened in
     takeoff (the fit image and the PDF on presigned GETs, 200, and the sheet drew). E200 was
     uploaded the same way later.
   - D-259 records it as resolved, and `docs/flows.md` marks the S3 CORS step done on the bench
     bucket (the production origin is still to add).
   - **The harness workaround:** last run's harness that fetched bucket files itself (for port
     5175) was never committed, so there was nothing in any repo to remove. The marketing
     capture's `SHOTS_S3_MIRROR` is a different thing and stays: Hidden Valley Spec's sheet
     objects are not in this bucket (checked: `object_size` is empty for its sources and fit
     images), so the mirror stands in for missing objects, not for CORS.

## Step 1. Small app items

1. **"billed annually": done.** The only place the cadence is put into words is the signup
   subtitle ("Starting on Professional, billed annual, 3 seats."); it now says "billed
   annually", and "billed monthly" is unchanged (both checked in the browser). Checked and
   already right or not applicable: Settings › Billing ("Billed: Annually"), the plan picker's
   Monthly / Annual switch, the marketing price page ("billed annually"), the platform pages
   (staff), and the emails and receipts (no template prints the cadence; receipts are
   Stripe's). App commit `e96e077`.
2. **Assembly crews priced at the project's rates: done (D-298).**
   - **Stored:** an assembly's crew keeps its makeup only (crafts, how many, the crew it came
     from); production stays on the component. The api strips wages on every template write.
   - **Applied** (Use on sheet, Link, Seed from…): each craft row lands following the
     project's saved rates, exactly like Add crew in a labor component, and follows later wage
     sets. With no saved set it is $0 until rates are saved (what a direct crew gets; no other
     fallback). A craft from the other wage table takes the project's craft of the same name.
   - **Editor:** "Priced at the project's rates" instead of the wage cells; Add crew and Add
     craft pick from the workspace catalog (Commercial or Residential crafts); a new labor
     component starts empty; labor shows hours and "at the project's rates", no dollar figure.
   - **Existing assemblies affected: 0** on the bench (3 assemblies, none with a cost
     component). The migration (`c7d1e9a3b5f2`) reported "0 components".
   - **Before and after** (throwaway project, national-average commercial rates for 43215; an
     assembly with 2 Electrician + 1 Laborer at 0.5 EA/hr applied to a 12 EA count item; the
     labor component was sent with typed wages $99 and $11 to prove they are dropped):

     | | Electrician | Laborer | Crew rate | Total Labor Cost (Estimating) |
     |---|---|---|---|---|
     | Applied | $86.32 | $61.61 | $234.25 | **$5,622.00** (24 crew-hours) |
     | Electrician saved at +$5 | $91.32 | $61.61 | $244.25 | **$5,862.00** |

   - Gates: ruff, mypy; typecheck, lint, build; quantity table passed (329 rows).
   - Commits: api `3417c06`, app `106d684`.
3. **D-292's allowance: approved.** Marked in D-292 item 2's status line.
4. **"EW Typo Check": deleted.** It was in "Bench Construction" (not a founder workspace),
   created by the throwaway smoke account on 2026-10-08 00:17; deleted and then purged
   (permanently) as that account.
