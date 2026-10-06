# Overnight report, 2026-10-06

Started 02:05 UTC; stop at 11:30 UTC. Updated after each part.

## Part 1. Wage Calculator Step 5, crews and classification: done

**Built.** The approved crew mapping is loaded (14 crafts, 75 crews appended to the seed;
`ref_crew_scope_map.csv`, `ref_classification_crosswalk.csv` copied in; the Dockerfile's
`ref_*.csv` glob takes them; `003_crew_scope_mapping.sql` beside 001 and 002 as docs, no
migration). `RefData` gains `scope_map` and `crosswalk`; `app/wagecalc/scope.py` has
`crews_for_node`, `lead_craft`, `other_crews`. `GET …/wage-calculator/crews?node_uuid=`
answers the default, suggested and "Other [trade] crews" (names, sizes, codes, no rates).
A new labor component on a classified item starts with the default crew tagged Auto; a
classification change (item or sub-item) replaces Auto groups and flags picked ones "Crew
may not match the new scope" (Use suggested crew / Keep). The Add crew picker has the three
sections; an unclassified item shows the search only. D-268.

**Commits.** api `893888a` (plus `8a64edf`, the BUILD_BRIEF line 78 fix, pushed before the
step); app `c4e882a`; infra `d289002` (workspace mirror).

**A.5 values.** National crew cost per manhour: Electrical · Electrician + Helper (C-099,
commercial) $61.14/manhour ($122.28/crew-hour, 2 workers); Structural Steel · 4 Ironworkers
+ Crane Op + Driver (R-097, residential) $33.68/manhour ($202.06/crew-hour, 6 workers).
`crews_for_node`: csi 26.04 commercial → C-030 Electrician + Laborer, suggested C-030,
C-099, C-031; csi 03.01.08 commercial → C-008 Cement Mason + Carpenter + Laborer, suggested
C-008, C-007, C-013, C-011; uniformat D5020 commercial → via 26.04, the same as 26.04;
nrm2 39.03 residential → R-055 Electrician + Laborer, suggested R-055, R-104, R-056.

**Smoke 6/6.** (1) 26.04 commercial: Electrician + Laborer pre-filled with Auto; Suggested
lists Electrician + Helper; Other electrical crews lists 6. (2) Reclassified to 31.04.03:
replaced by Earthwork · Operator + 2 Laborers, Auto. (3) A picked Operator + Laborer stayed
after reclassifying, with the message in the dialog and on the estimate row; Use suggested
crew put Electrician + Laborer back, Auto. (4) Residential 05.01: 4 Ironworkers + Crane Op
+ Driver at the set's residential rates ($33.25, $35.18, $28.09). (5) UniFormat D5020:
Electrician + Laborer via the crosswalk. (6) 01.13: created empty, picker search only.
Reclassification in the smoke went through the item PATCH the Properties dialog uses.

**Decisions made on my own.**
- Parents are found by code (dotted segment, UniFormat `D5020` → `D50`), as the templates build them.
- An Auto group whose new node has no default is removed (not kept).
- The suggested list includes the default (first).
- Lead craft taken literally: R-097's lead is the Crane Operator, so its "other" crews are crane crews.
- "Other [trade]" uses the default crew's division.
- The api fills the default crew on create only when the body has no `crew`; the app sends the rows itself so the dialog shows them before saving.
- Classification changes by duplicate, assembly apply or node delete do not move crews.

**No longer matching.** Nothing found; spec "Crews and classification" and brief Step 5 were written with the code.

## Part 2. Wage Calculator Step 6, workspace crew settings: done

**Built.** Migration `f1c6a8e3d527` with the four tables. The engine resolves a node's crews
on the Step 5 chain, workspace lists first and then IntelCost's (`resolve_node`, with the
node it came from). One workspace view (`CrewBook`: IntelCost and workspace crews, hidden
codes, node lists) feeds Step 5's suggestions, auto-fill and classification change, and
the project's crews read (workspace crews priced live from the saved set's crafts).
Settings routes under `{ws}/wage-calculator/crew-settings/`: catalog, tree level or search
(200 max), orphans, set and reset a node list, custom crew CRUD, hide and unhide. Reads for
any member; writes need `MANAGE_WORKSPACE`. The page is Settings › Project Setup › Crews:
system selector, Residential / Commercial & Public, orphans banner, tree with sources
("IntelCost default", "From 26.04", "From CSI 26.04 (Workspace)", "Workspace" with Reset),
node editor (default radio, reorder, three-section picker with workspace crews and Hide),
Custom crews (with the IntelCost list and Hide from suggestions), Hidden crews (Unhide).
Read-only for non-admins. No rates. D-269.

**Commits.** api `ed9099c`; app `ed80c1e`; infra: the workspace commit after it (D-269, SINCE_ARCHIVE, this report, the 2026-10-03 overnight files archived).

**Smoke 8/8.** E1 26.04 "IntelCost default" Electrician + Laborer, 26.04.01 grey "From
26.04". E2 26.04 set to Electrician + Helper ("Workspace"); 26.04.01 "From 26.04
(Workspace)"; a new labor component on 26.04.01 filled C-099 ($71.93, $50.35), Auto. E3 a
component made before the change kept C-030. E4 custom "Electrical · 3 Electricians + 1
Helper" made, default on 26.06; a new component on 26.06 filled it at the saved rates
(W-8F18763E23: 3 × $71.93, 1 × $50.35). E5 Electrical · Electrician hidden: absent from
Suggested (3) and Other electrical crews (6), found by Search all crews. E6 UniFormat D5020
shows "From CSI 26.04 (Workspace)" and fills Electrician + Helper. E7 Reset 26.04: back to
Electrician + Laborer, 26.04.01 default C-030. E8 a member sees no Edit, New crew or Hide;
PUT override as the member answers 403. Also by API: an override on a node that does not
exist is listed as an orphan and deleted; a residential crew on a commercial list is
refused (422).

**Bench note.** Bench mail now goes through the real SES relay (compose comment), not
MailHog, so invitation tokens cannot be read back; the non-admin was registered and
seated with psql on the throwaway workspace.

**Decisions made on my own (D-269).**
- Resolution is two passes, as the brief reads: a workspace list anywhere on the chain beats IntelCost rows nearer the node.
- A hidden default gives way to the first visible suggested crew; only IntelCost crews can be hidden.
- Workspace crews are not saved into rate sets; they are priced live from the set's crafts.
- Crew codes "W-" plus 10 hex digits of the uuid.
- A node list keeps the IntelCost crews it dropped as `hidden` rows (a record only).
- Crew rows carry `crew_name` so a deleted workspace crew still names them.
- The tree loads one level per request (children by parent code); search returns up to 200.
- The node editor's "Suggested for this scope" is the node's current list; "Other [trade] crews" is worked out in the browser from the catalog.

**Not smoke-tested by UI.** The orphans banner (API checked), editing and deleting a custom crew, Unhide.

**No longer matching.** Nothing known; spec "Workspace crew settings" and brief Step 6 were written with the code.

## Part 3. End-to-end Wage Calculator check: done, no bugs found

One Playwright pass (throwaway account and workspace, script deleted), 11/11:
1. Project with no drawing → Wage Calculator → Commercial, National Average, no ZIP: L-08, S-01, strip "National Average · Open Shop / Market Wage · Burdened (fully loaded) · No location".
2. Padded ZIP "6320": L-02 "We read this as ZIP 06320, New London, CT. Is that right?", Yes, L-04, saved.
3. Save after the location change: P-01 "Project info changed since rates were saved. Recalculate?", Recalculate; strip "Southeastern Connecticut Planning Region, CT".
4. Multi-county ZIP 78932: L-05 "covers Fayette County (55%) and Washington County (45%)", second county picked and saved.
5. ZIP cleared: back to L-08.
6. Public, Prevailing Federal, ZIP 79714, My wage data with tx115.txt: 19 crafts carry R-01 (Laborer $60.53, "Raised to local market rate (WD minimum $9.22)"), saved through B-02.
7. Open shop manual entry: Carpenter $6.00 shows M-01; at $38.00 the review gives $48.85.
8. Advanced settings: General liability 2.5% saved (stored 0.025), "New settings apply the next time rates are calculated."
9. One-page drawing, Commercial, Direct, National Average saved; a labor component on a CSI 26.04 item opened with Electrician + Laborer, Auto.
10. Direct: Labor burden line 48.7158% of direct labor, $23.81 on $48.86 of labor, the crafts' weighted burden (the set's average is 51.8680%).
11. R-04 Laborer $60.00 on review, S-02 confirm, the labor row following the saved rates now $60.

**Commits.** None: nothing to fix. Every failure during the pass was the script's (waiting on a refetch, a locator, the strip naming the county not the ZIP, B-02 rather than P-01 when the basis also changed); each was checked against the app before being put down to the script, once with a probe of the context refetch (it lands about 100 ms after S-01).

**Questions for you.**
- The Labor burden line shows four decimals ("48.7158%"). D-266 says "the effective percentage"; is two decimals (48.72%) what you want on the bid summary?
- Connecticut ZIPs show the 2022 planning region as the county ("Southeastern Connecticut Planning Region"). Fine for the strip, or should it read the old county name (New London County) that WDs before 2022 use (U-02 note in the spec)?

## Part 4. F16 billing spec draft: done (documents only)

**Written.** `docs/tasks/F16_SPEC_DRAFT.md`:
- scope;
- data model (`billing_plan`, `workspace_subscription`, `stripe_event`, optional `billing_invoice`, with the existing tier and AI tables kept);
- Stripe: Checkout with legacy's seat line items, a signed idempotent webhook, the customer portal legacy lacked, a bench fake;
- trials: per-tier length, mid-trial caps with their enforcement points, view-only on expiry, a subscription ending the trial;
- the plan checks replacing every F16 marker, by file and line (there is only one literal `TODO(F16)`, `wage_calculator/service.py:912`; the rest are F16 mentions in docstrings);
- AI credits: allowance, top-up Checkout, ledger;
- platform admin additions;
- existing workspaces (none paid; comp testers);
- a build order in seven blocks (A to G).

It ends with 16 "Questions for Umer". Research came from three read-only agents (legacy on `UmeralamDEV`, the current api and app, the decisions and notes).

**Commits.** infra: the workspace commit with this report (the draft lives in `docs/tasks/`, mirrored).

**Notable findings.**
- **Paid customers.** Nothing knows about paid subscriptions, so an expired trial makes every workspace view-only. The Wage Calculator's `on_trial` has the inverse gap: after expiry it lets PDF and AI through.
- **Legacy defects F16 should not copy:**
  - annual plans refill AI credits yearly;
  - owners can edit their own billing row;
  - the admin lock is checked on the client only;
  - cancelled or past-due subscriptions keep full access.
- **Contradictions for you:**
  - pack prices: D-236 against legacy;
  - Collaborator AI credits;
  - refund wording: the pricing page against the Terms.
