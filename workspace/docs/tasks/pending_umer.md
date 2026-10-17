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
- **Day-2 answers (2026-10-15, D-513):** CH1–CH6 and CH10 ok; CH7, CH8, CH9 and U1 changed (built in the day-2 run); U2, U4, U5 ok; U3, U6, U8 noted; U7 replaced by H1 and H2; V1–V5 and V7 ok, V8 noted, V6 parked; N1 yours, N2 dropped, N4 later; F17 dropped (no migration); open shop keeps the local index with a new tag.
- **Earthwork utilities plan (2026-10-15, D-526):** Q1–Q15 yes, as recommended, with notes on Q5, Q6, Q7, Q9
  and Q12. U-UT1–U-UT52 answered: U-UT25 updated, U-UT26 replaced, U-UT27 extended, U-UT16 done. S6 is approved,
  not started; Block 0.5 first.
- **Batch 4 (2026-10-11):** D1 accepted and D3 passed, both closed in DECISIONS. D2 changed: the
  zoom menu leaves the top right. It stays open below until built.

---

## Choices from the day run 2026-10-12 (DAY_REPORT_2026-10-12.md)

Each is a default I picked to finish the block; answer by number like the others (CH1 ok, CH3 no: …).

| # | Block | The choice made for now | The other way |
|---|---|---|---|
| CH7 | 7 (D-384) | **No (2026-10-15):** unit wastage is quantity; shown with pricing off. | Built in day-2 Task 2. |
| CH8 | 7 (D-384) | **No (2026-10-15):** number the copies "(shared copy 2)", "(shared copy 3)". | Built in day-2 Task 2. |
| CH9 | 7 (D-384) | **No (2026-10-15):** count distinct people. | Built in day-2 Task 2. |

## Run 2026-10-15 (morning-report-2026-10-15\RUN_REPORT_2026-10-15.md)

Answered on 2026-10-15 and done:
- R1, R2, R5 and R6 were kept as recommended.
- R3 (D-479), R4 (D-478), R8 parts 1–3 (D-483), R10 (D-481) and R11 (D-482) are done.
- **The night run of 2026-10-15** closed S1 (no soft zoom; see N1 below) and S2 (built, D-490). It
  closed S3's interval part (built, D-491) and parked S3's batch entry. R9 was re-run (kcp
  comparison §8).
- N7 is still yours (fps at 5×). Answer the rest by number.

| # | Item | Where it stands | Your call |
|---|---|---|---|
| S4 | for your record | On the copy, a Calculate was made at 22:47:56 UTC from another browser (not my scripts): same result (md5 fab4d151), it cleared the 49 stale flags set at 21:12. A Work Boundary shape was made at 21:13, not on C-200 (the sheet's key did not move). | Nothing, unless that was not you. |

## Night run 2026-10-15 (morning-report-2026-10-15\NIGHT_REPORT_2026-10-15.md)

| # | Item | Where it stands | Your call |
|---|---|---|---|
| N1 | T1 zoom | **Answered 2026-10-15:** you try the patch (`night-T1-stretch-and-fresh-layer.patch`) yourself; not applied. | Yours. |
| N3 | X2b full guest app | One slice is built (D-497): "Show pricing" off by default and enforced on the server, "Sign up" on the guest page, and direct writes with a pass refused. The full app in guest mode is F28, specced in `guest_full_view_tasks.md` (§6 has four questions), at about two days. | Answer §6's four questions (recommended: the defaults given), then go. |
| N4 | X3 big projects | **Answered 2026-10-15:** row virtualisation stays its own block, later. | Later. |
| N5 | Metric | `METRIC_ENABLED` no longer exists. The api setting went with D-396 (already on staging), the app never had its own flag, and the bench Compose dropped it. Metric is on for everyone. | Nothing to do. |
| N6 | Share link on the 3D test copy | Tested with the copy's own link and put back exactly as found (same token, no password). It was not revoked, because it is the project's one link and may be in use. | Say if it should be revoked. |
| N7b | X2 reload limits | A boundary **replace**, and an Auto Merge that rewrites sections, are not kept for replay: sent twice, they would be refused. A reload mid-save keeps the old outline. | Accept for now (recommended). |
| N8 | T6 | The rows from S2 on (S2–S4) reproduce the study to the cent. Our side moved only because curved outlines are now read with their arcs (+18 CY cut, +24 CY fill). The unexplained 0.24 % / 0.36 % stands. S5–M3 were rebuilt rather than recovered, giving 0.25 % / 0.62 %. | Nothing, unless you want the study's own S5–M3 modelling recovered. |
| N9 | Promotion | `intelcost-infra/notes/2026-10-15_promotion_since_staging_merge_for_abdullah.md`: 10 migrations since staging (`f2c9a7d4e1b8` is tonight's), and D-470's out-of-date results. | Forward to Abdullah. |
| N10 | X2b / F28 | The api half is built and committed: Blocks A and B (D-498, D-499). The frontend (C and D) waits on the four questions in `guest_full_view_tasks.md` §6. The test link on the 3D test copy (id 28) was regenerated twice and is now **off**, with pricing off. | Answer the four questions, then turn link 28 back on if you want it. |
| N11 | Bug found | **Fixed in the day run (D-500).** `GET /estimate/line` answered 500 on a project with a classified item that had no line yet. | — |

## Day run 2026-10-15 (morning-report-2026-10-15\day-RUN_REPORT_2026-10-15.md)

| # | Item | Where it stands | Your call |
|---|---|---|---|
| U1 | D6 guest Excel, pricing off | **No (2026-10-15):** drop the money columns. | Built in day-2 Task 2. |
| U7 | D6 scope | **Replaced (2026-10-15)** by H1 (guest Wage Calculator, read only, pricing on) and H2 (guest Forum preview). | Built in day-2 Tasks 3 and 4. |

## Guest view fixes 2026-10-15 (morning-report-2026-10-15\guest-REPORT_2026-10-15.md)

All answered 2026-10-15 (D-513): V1–V5 and V7 ok, V8 noted, V6 parked.

## Day-2 run 2026-10-15 (morning-report-2026-10-15day2-REPORT_2026-10-15.md)

| # | Item | Where it stands | Your call |
|---|---|---|---|
| W1 | Your share link, again | It had changed since the guest fixes (pricing on, saving a copy on). I snapshotted its row, tested with my own password and switches, and restored it exactly (same URL, password, expiry, switches). A guest tab you had open on it ended when its password changed. | Note only. |
| W2 | CH7 in a saved copy | The copy keeps the unit wastage and each line's own wastage, with every rate cleared. The copy's one line had no rates in the original, so the clearing was shown by the code path, not by data. | Note only. |
| W3 | CH8 numbering and Trash | A copy in Trash keeps its name, so the next is "(shared copy 2)" while the first is in Trash (the same rule as Duplicate project's "(copy N)"). | Accept, or reuse a name once its copy is in Trash. |
| W4 | H1 what a guest reads | The project's saved snapshot: crafts with their breakdown, crews, burden, the location factors, and the project info with its ZIP's county names. No source tables, lookups or crew suggestions. | Accept. |
| W5 | H2 names inside posts | Members' full names, short names and emails inside a post's text are scrubbed by the link's rule; a first name alone ("Sara") is not. Authors follow the rule fully. | Accept. |
| W6 | H3 which workspace | The copy goes into the person's active workspace; a person with several gets no picker. | Accept, or add a workspace picker. |
| W7 | H4 details | Removed invites leave the list; a Resend counts toward the 100 a day; an Essentials workspace can still turn the link on (only invites are Professional's). | Accept. |
| W8 | Throwaway accounts | fx.h3.* and fx.h4.* remain as accounts with no workspace (`purge-owner` removes workspaces only). | Note only. |

## Earthwork utilities plan, Block 0 (2026-10-15): answered (D-526)

**The documents:**
- the spec, [earthwork_utilities.md](earthwork_utilities.md);
- the plan, [earthwork_utilities_PLAN.md](earthwork_utilities_PLAN.md).

**Answered 2026-10-15 (D-526): approved, not started.**
- Q1 to Q15 are yes, as recommended, with D-526's notes. U-UT1 to U-UT15 are those answers (plan §9).
- Block 0.5 (four existing issues) is built first when you say go, then Blocks 1 to 5 in order.
- Nothing is cut without asking.

| # | Default | Plan | Answered 2026-10-15 (D-526) |
|---|---|---|---|
| U-UT1 | Soil layers interpolated by depth below the existing ground; weathered rock, bedrock and water by elevation; a setting per layer | Q1, §3.2 | Yes |
| U-UT2 | A bore never makes a layer, rock or water shallower than it shows. A bore that ends inside a layer adds a point only where the other bores' surface is shallower. | Q2, §3.1 | Yes |
| U-UT3 | Trench and pit volumes exact between breakpoints (prismoidal rule), not 5 ft average end areas; a 5 ft table in the profile for reading | Q3, §3.10 | Yes |
| U-UT4 | Work scopes built: a workspace list and a mapping per system (scope + optional work type + optional kind, most specific wins), called "Work scope" in the UI | Q4, §2.1, §5 | Yes |
| U-UT5 | Today's 24 earthwork lines moved onto work scopes, with mappings that repeat today's codes in all five systems | Q5, §5.3 | Yes. Built on a duplicate first, with every project total, rate and line count proved unchanged; no backfill; founder projects never touched |
| U-UT6 | A priced Calculate line whose key is gone stays at 0 ("Not in the last Calculate") and returns with its rates | Q6, §5.4 | Yes, plus an Estimating filter to clear them in one go (Block 0.5) |
| U-UT7 | Trenches start from the proposed subgrade by default, the existing grade per run; no part counted twice with the site cut | Q7, §3.6 | Yes. With no proposed surface, the existing grade, stated on the run |
| U-UT8 | Runs on a utility sheet are read through a control-point link (F18); the ground runs from rim to rim where no surface covers it | Q8, §2.6 | Yes. Utilities-only projects are a requirement (§3.16) |
| U-UT9 | Lines per sheet, added up by utility type, material, size and range | Q9, §5.1 | Yes, with the per-run breakdown kept in the run panel and the report |
| U-UT10 | Pipe ranges by invert depth; protection ranges by trench depth | Q10, §3.10 | Yes |
| U-UT11 | Stable rock under soil cut vertical, with the soil sloped above it; every other mix uses the flattest slope | Q11, §3.6 | Yes |
| U-UT12 | Over-excavation with an outward slope: the vertical-walled box at the full extent at the bottom | Q12, §3.12 | Yes: 32.5 SF/LF on GT-01's footing |
| U-UT13 | Today's fixed undercut counts existing ground only (results with an undercut read out of date once) | Q13, §3.12 | Yes (Block 0.5) |
| U-UT14 | Treatment: geogrid and geotextile added to F25's Option 2; no second tool | Q14, §3.13 | Yes |
| U-UT15 | Fire water pipe 21.02.05; electric conduit 33.08.02; electric handholes 33.08.04; trench excavation 33.11.01; dewatering 31.06 | Q15, §5.3 | Yes |
| U-UT16 | The spec and plan live in `docs/tasks/`, CLAUDE.md's place for specs. They started in `docs/specs/`. | header | Done: moved |
| U-UT17 | A layer's group, OSHA type, flags and factors belong to the project layer; a bore's row holds only its log; a lens is its own layer | spec §3.2 | Yes |
| U-UT18 | A bore's ground is the existing surface unless typed; the report's elevation is shown beside it when 0.1 ft apart; bore IDs are unique per project | spec §3.2 | Yes |
| U-UT19 | Water buffer 1.0 ft per project. Perched readings count and are flagged. Published data is used only without a measured reading. A not-encountered bore bounds the water at its total depth, without a buffer. | §3.5 | Yes |
| U-UT20 | No bores: one assumed layer, Type C, suitable, the project's factors, stated in the results | spec §6.4 | Yes |
| U-UT21 | Soil-group defaults (OSHA, flags, swell, shrink, interpolation) as in the plan's table: typical values for approval | §3.2 | Yes |
| U-UT22 | Placed fill between the existing ground and the proposed subgrade is a layer "Placed fill", Type C | §3.7 | Yes |
| U-UT23 | Caving: the nearest bore governs. Caving observed forces a box wherever protection is required; a cave-in depth forces one wherever the bottom is below it; under 5 ft, a flag only. | §3.7 | Yes |
| U-UT24 | Geotech rows: "cohesive" is clay, silt and USCS C or M; "granular" is sand, gravel and USCS S or G. The smallest depth limit at or above the depth applies. A layer with no row, or deeper than every row, uses federal OSHA, flagged. | §3.7 | Yes |
| U-UT25 | Benching as OSHA Appendix B's official figures draw it. Type A: a bottom vertical side of at most 4 ft, further benches at most 5 ft. Type B: 4 ft and 4 ft, cohesive soil only. Type C: none. The benches sit inside the slope line drawn from the toe. | §3.8 | Updated from the official figures (CFR 2023 edition; LII's text has no figures) |
| U-UT26 | Replaced by the trench-width rule. The bottom width is the largest of the pipe width, the bucket and (where a box is used) the box's outside width. A spec max width is flagged, and the actual width never reduced. | §3.6 | Replaced |
| U-UT27 | Utility settings: 12 in side clearance, 24 in minimum width, 6 in bedding, zone to 12 in above the crown; bedding and zone imported, backfill native; densities blank (no tons until typed); restoration none. They also hold the default bucket (Auto), the project's box list (name, inside, outside, height) and spec max widths per pipe size. | spec §9.2 | Extended |
| U-UT28 | Depth ranges 0–6, 6–8, 8–10, 10–12, 12–14, 14–16, 16+ ft; in metric 0–2, 2–2.5, 2.5–3, 3–3.5, 3.5–4, 4–5, 5+ m; each range includes its lower bound | §3.10 | Yes |
| U-UT29 | Pipe LF along the drawn run, from structure centre to centre; several pipes multiply it | §5.1 | Yes |
| U-UT30 | A pit follows its structure's shape (round or rectangular); over-dig 2 ft; base stone under the whole bottom; layers taken level across a pit at their depth at its centre | §3.11 | Yes |
| U-UT31 | A trench stops at the pit's bottom outline; its overlap with the pit's sloped sides is deducted slice by slice | §3.11 | Yes |
| U-UT32 | Overlaps between trenches (crossings, two runs leaving one structure) are not deducted; they are listed in the notes | spec §19 | Yes |
| U-UT33 | Ground from rims where no surface covers a run; restoration width defaults to the top width plus 1 ft each side | spec §9.1 | Yes |
| U-UT34 | Over-excavation extension 5 ft and outward slope 0 by default | spec §11 | Yes |
| U-UT35 | Replacement fill as a stack from the bottom up, the last row taking the rest. In a fill area the stack covers only the removed ground; the fill above the existing ground stays the site's fill line. | §3.12 | Yes |
| U-UT36 | New lines use today's "… — <group>" names; unit costs start empty (there is no price library); a material with a density gets a TON sub-item | §5.1 | Yes |
| U-UT37 | "Utilities" and its subfolders found by key; a force main under Sanitary; renames and moves kept; a deleted folder made again on the next Calculate | spec §14 | Yes |
| U-UT38 | Estimating shows "Needs recalculating" on stale Calculate lines (D-142 said so; today only the Takeoff panel does) | §5.4 | Yes (Block 0.5) |
| U-UT39 | "Move items to…" marks a Calculate line as placed by hand, as a single move does | §5.4 | Yes (Block 0.5) |
| U-UT40 | The version key gains a part only when the project has bores, layers, a slope rule, utility settings, runs or structures; the prefix stays; the 3D test copy's key and md5 do not move | §2.5 | Yes |
| U-UT41 | Checks: engine numbers as quantity-table rows (the engine is browser-only); api rules as `scripts/check_*.py` (read-only, one line) | §6 | Yes |
| U-UT42 | Bores, runs and structures on a joined site map through the join; on a linked sheet, through the link | §2.6 | Yes |
| U-UT43 | A shrinkage % is read as bank to compacted (factor 1 ÷ (1 − x)); a loose-based figure (GT-02) is split by the estimator | spec §4 | Yes |
| U-UT44 | 3D pipes drawn at true size in their own group, so the exaggeration moves them without stretching them | §8 | Yes |
| U-UT45 | Geosynthetic overlap default 10 % | §3.13 | Yes |
| U-UT46 | One "Structure Dewatering" line (EA) for the structures below the design water | §5.1 | Yes |
| U-UT47 | Compaction notes (% and ASTM D698 or D1557) shown in notes and the report, never in quantities | spec §11 | Yes |
| U-UT48 | The topsoil suggestion leaves out bores with pavement at the surface, and is rounded to 0.05 ft | §3.15 | Yes |
| U-UT49 | The new buttons go after Stripping (Bores, Utilities, Structures); their settings in Takeoff settings › Earthwork, project-level and saved at once; the cross-section and profile open in the split pane | spec §3.1, §8 | Yes |
| U-UT50 | OSHA suggestion: silt B; cemented A unless caving; hard dig and weathered rock C | spec §3.3 | Yes |
| U-UT51 | The balance with layers adds compacted yields (bank ÷ each layer's shrink) and uses the bank-weighted swell for the surplus; it reduces to today's formula when every layer has the project's factors | §3.14 | Yes |
| U-UT52 | Each structure type has a default utility type (custom picks one) | spec §10.1 | Yes |

**Pipe catalog values with no source** are listed here during Block 2. None are listed yet, because the catalog is
not built.

**Codes with no node in our CSI tree:**
- **Unmapped:** other pipe, custom structure.
- **Approximate:** area drain (mapped to Inlets), junction box (to the Structures parent), sloped and benched
  protection (to 31.09.01).

## Night run 2026-10-16 (morning-report-2026-10-16NIGHT_REPORT_2026-10-16.md)

**Answered 2026-10-16 (D-538):** G1–G4, B1, B2, T1 and T3 ok, kept as built (B2: U-UT35 unchanged; special fill
under a pad is the estimator's choice through the feature's undercut and subgrade prep options). B4 was yours: the
copy's bores, layers and Calculates stay, and its C-200 md5 baseline is now `ff91644a…`. B3 and T2 were changed and
are worked in the continued night run (below).

**Continued night run 2026-10-16: answered 2026-10-16 (D-543).** B5 go (built in the audit brief's Part B1), B6 ok, B7
ok, E1 agreed (step 2a gets its own day run after you review the pipe catalog, Part C).

## Audit of the 3D test copy, 2026-10-16 (D-542; morning-report-2026-10-16/AUDIT_2026-10-16.md)

None of my test data was ever on the copy: what the screenshots showed was my duplicates, named "Hidden Valley Rebid —
3D test (copy…)", all purged. Two kinds of my writes did reach it (A1, A2); my seven duplicate requests only read it.

**Answered 2026-10-16 (D-544), closed:** A1 leave them; A2 noted; A3 yours (the Share dialog); A4 yes, built: every
bench copy is renamed "BENCH DUP <yyyy-mm-dd hh:mm> — delete me" the moment it is made, by the duplicate helper and the
guard, and the fingerprint flags a copy that kept the name; A5 no exception: Part B1's check runs on a fresh duplicate,
and you press Calculate on the copy.

| # | What | Where it stands | Your call |
|---|---|---|---|
| A1 | My browsers' activity rows on the copy: window-b's last-sheet marker and two work sessions (2026-10-16 02:16 and 06:19, 4 s and 0 s), and two estimator@ work sessions (2026-10-15 22:30 and 23:31, 1 s and 2 s) from a session of mine that signed the browser in as your account. A sign-in landed on the account's last project, the copy, before moving to a duplicate. | Recorded (A-my-activity-rows-on-the-original.json), not removed: the session's safety check refused deleting activity records. They change no project content. | Leave them (recommended), or delete them yourself. |
| A2 | Your link's last access read 12:29:20 today: my guard's first version read the link's public meta twice (12:28:22, 12:29:20), and the api stamps every guest request, a read too. Token, password and switches unchanged. | The guard now never touches a link it did not make. The old time is not written back (I do not know it exactly). | None expected. |
| A3 | On 2026-10-15 at 23:11 two share-link previews, and at 23:30:36 and 23:30:49 two PATCHes of the copy's link, came from a browser that was not mine (mine was closed 22:43–23:31, and no tool of mine sent them). | Taken as yours. | Say if they were not. |
| A4 | Duplicates keep the copy's name with "(copy)", which is what made them look like the copy. | Not changed. | Say if bench duplicates should be renamed at once, e.g. "BENCH DUPLICATE <time> — delete me". |
| A5 | Part B1 asks for one Calculate on the copy; the new guard refuses every write to it. | Not run. | Your go for Part B also allows that one Calculate, through a one-time exception logged in the report. |

## Part B of the audit brief, 2026-10-16 (D-545 on; morning-report-2026-10-16/PART_B_2026-10-16.md)

**Answered 2026-10-16 (D-550), closed:** B1a yes, a layer no bore logs takes nothing, by depth or by elevation; B2a
yes for settings that change quantities, display preferences stay personal; B5a yes (sites); B5b yes (members, same
note). Built in the answers run (D-551 on).

| # | What | Where it stands | Your call |
|---|---|---|---|
| B1a | A layer no bore logs, set by elevation, takes the ground above the bores' level. On a fresh duplicate of the copy, Layer 1 (no bore logs it) takes 11,464.21 of the 11,583.92 CY: its bottom is the surface through B-1 to B-4's ground levels, the bores stand on the pad, and the cut is on the higher ground around it. Set to follow the ground, it takes nothing, and Layer 2 takes 11,579.57 (no clamp). Your logs are in order: the one clamp ("Layer 1 kept under New layer over 44761.44 SF, up to 3.07 ft, near B-4") comes from this rule, not from a typed depth. | Built as plan §3.1 has it: a layer missing from a log has no thickness at that bore; by elevation, that is the bore's ground level, read across the site. | Keep the rule, or: a layer no bore logs has no thickness anywhere, by elevation too (recommended; then the copy splits as with Layer 1 following the ground). Or set the copy's Layer 1 to "Follows the ground" yourself. |
| B5a | A joined site's 3D VIEW on an out-of-date site result still asks for a Calculate (as before): B5 covered a sheet's 3D. | Not built. | Do the same for a site (its inputs kept with the site result), or leave it. |
| B5b | A member on an out-of-date result still reads "The drawing changed since Calculate" in 3D VIEW; B5 shows the saved Calculate's 3D to a guest only. | As built (D-549): a member's Calculate saves. | Show members the saved 3D with the same note too, or leave it. |
| B2a | Takeoff settings › Contours and spots is a project setting too (D-473: "how contours and spot elevations are drawn on this project"), in the same window that says "These preferences are saved on this device for you only." | Not moved: the brief named the slope rule only (D-546). | Move it out too (to the Earthwork tab, as the slope rule went), or leave it. |

## Pipe catalog draft, 2026-10-16 (Part C; docs/tasks/pipe_catalog_DRAFT.md)

Research only, no code. Only PVC sewer 4–15 in was read from the standard itself (ASTM D3034-00). The rest comes from
manufacturers' sheets, one association table (ACPA) and blanks. The draft's top section lists what to check.

**Answered 2026-10-16 (D-550), closed:** C1, the standard's average ID where printed, and OD drives trench and
displacement; C2, both marks stay, an association counts like a manufacturer, and "manufacturer, no standard named" rows
show "Unverified source" in the app until checked; C3, blanks filled from manufacturers' sheets, disagreements noted, no
standard bought. Done in the answers run (D-555): the plan's examples reworked for 7.891, the marks in the spec and plan,
the blanks filled where a sheet prints them; one new call, R5.

| # | What | Your call |
|---|---|---|
| C1 | Which ID the catalog stores. The plan's check uses 8" SDR-35 ID 7.920 (OD − 2 × min wall); D3034's Table X1.1 prints the average ID as 7.891 (OD − 2 × 1.06 × min wall). | The standard's average ID where it prints one, else the source's ID with its basis named (recommended); or OD − 2 × min wall everywhere. |
| C2 | Two marks beyond the brief's three: "manufacturer, no standard named" (Rinker RCP, Performance Pipe HDPE, Contech CMP) and "association citing the standard" (ACPA, RCP Wall C). | Count them as manufacturer rows, or as not found. |
| C3 | Blanks: C909 walls, C900 DR 14 above 16 in, RCP Wall C below 24 in, CMP OD and 90–96 in, copper walls, conduit 5–6 in, PVC sewer 33 in. | Whether to buy the AWWA C909 and ASTM C76/B88 tables or ask manufacturers, before Block 2 step 2a. |

## Answers run, 2026-10-16 (D-550 on; morning-report-2026-10-16/PART_B_2026-10-16.md, "Answers run")

**Answered 2026-10-16 (D-556 to D-558), closed:** R1, Auto Merge stays personal; R2, Contours and spots stays the
project's, where it is; R3, the founder clears the copy's Source field, and no run touches it; R4, the reference reports
are GT-01 to GT-09 in both repos and the mirror, with the mapping only in `fixtures/geotech/INDEX.md`, outside every repo
(D-557); R5, PVC sewer 18 in and up takes F679's walls by default, the current D3034's kept as an alternate standard
chosen per run (D-558). Done in the R answers run, with two fixes (D-559, D-560) and the Bores panel (D-561).

**Follow-ups 2026-10-16 (D-562 to D-566):** R5 reversed: the current D3034 is the default and F679 the alternate for
older specs, with the same ODs (D-563); C909 takes cast-iron ODs, so its 4, 14, 18 and 20 in blanks are wall only, with
C900's ODs (D-564); PVC sewer 33 in is out of the catalog (D-565); bench sign-ins land on Account settings or a BENCH
DUP, never Home (D-566). A guest's Calculate over a current result is greyed by D-527's rule, not by a regression or a
link setting (D-562).

| # | What | Where it stands | Your call |
|---|---|---|---|
| R1 | Auto Merge changes an area item's total: on, a new section over your own on the item is merged, and the overlap counts once. | Personal (D-553): it acts at draw time, in front of the person, on takeoff items, not on contours or spots. | Make it the project's, or leave it. |
| R2 | Contours and spots is display only (colour, weight, dashes, index contour, labels, spot size) and feeds no quantity. | The project's, as D-473 left it, so the grading report looks the same whoever prints it. It stays in the Settings window under its own banner, and the window's line now says such a section is the project's (D-553). | Make it personal, move it to the Earthwork row, or leave it. |
| R3 | The copy's saved slope rule still has the old source line, naming three of the reference reports (loaded 16:39). | Not changed (D-552): the guard keeps me off the copy. | Clear its Source field (one edit). |
| R4 | Internal records name the reference reports as provenance of hand-worked values: the plan's worked examples and research notes, the quantity rows' comments and ids, and DECISIONS. | Kept (D-552); the app names none. | Scrub them too, or keep them. |
| R5 | PVC sewer 18–36 in: Westlake's sheet gives F679's PS 46 and PS 115 walls; JM Eagle's October 2025 sheet gives the current D3034's (F679 was withdrawn in 2024) SDR 35 and SDR 26 walls, thicker at 18–27 in (18 in: 0.499 against 0.536). | Both tables in the catalog draft, check 2 (D-555). | Which one the catalog's 18–36 in rows use. |

## Night run 2026-10-17 (morning-report-2026-10-17/NIGHT_REPORT_2026-10-17.md)

**Answered 2026-10-17 (day run brief, item 7):**
- **Confirmed as taken:** N1, N2 (the Utilities group stays after the earthwork tools, before More), N3, N4, N5 and
  N7, each closed in DECISIONS.
- **Changed:** N6, by items 3 and 5. The headline follows the after-balance, and spoils and backfill use each
  layer's own factors.
- **Built in the day run:** O1 (expanded to item 8), O2, O3, O5 and O7.
- **Closed:** O4 ok, no lighter panel. O6 keep.

## Day run 2026-10-17 (morning-report-2026-10-17/DAY_REPORT_2026-10-17.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| P1 | Your account, umeralam.q@gmail.com, is not a member of Bench Construction Test, the workspace that holds the 3D test copy. The lock (D-592) lets it write, but membership stops it first (403 `not_a_member`), so today no account can change the copy. | Not changed: adding a member is an access change to your workspace. | Invite it (as Admin) from estimator@, using the rotated password in the Windows credential store, or say so and it is added. |

## Found in the click sessions

**Fixed (D-386, app `d27194c`, re-checked in the browser):** C28's doubled end point on a
double-click; C22's Cancel that did nothing on an upload in flight (now stops in about 0.1 s and the
file is discarded); C12's editor left off-screen after the window narrowed. The C items stay open for
your own click check.

**Decided by you (2026-10-12) and done:**
- **C1:** legacy wording kept.
- **C4:** the Load screen's AI options start unticked (D-390, app `2fcae8f`).
- **C31 tests 5, 19, 21:** tests changed as decided; a national craft's breakdown reads "Published rate:
  no breakdown available" (D-389, api `5840dab`, app `ecbcd96`).
- **C31, WD-only filled crafts:** a bug, fixed (D-389): the MAX with national ran under higher-of only,
  so WD-only carried the WD's wage level onto crafts it does not cover. Now Air Tool Operator reads
  $62.19 under either policy.
- **Tests 7 and 8:** you run them.

**Still open, for you:**
- **Open shop's filled crafts:** answered 2026-10-15 (D-513): keep the local index; the tag reads "Location-adjusted (index N)" (day-2 Task 1).
- **C15 Set values in one request:** built (D-394).
- **Metric, the six spots of D-397 5:** closed (D-399 to D-404); earthwork units stay with the sheet's scale for
  calculation and the project for display (D-398).

**Fixed later in the day (D-388, app `1c205f6`):** the Wage Calculator's dead end when the wage
determination changed on review, and Advanced opening on "Pick a state" for a Texas project (test 16).

Withdrawn: Block 5's "Seats 11 in use" was my misreading. Billing shows the seats ("1") and a separate
small "1 in use" beside them; the page text runs them together.

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
| S6 | earthwork_utilities_PLAN.md (F29) | Bores, soil layers, utilities, structures and over-excavation on the Earthwork tab. Plan: Block 0.5, then 5 blocks, about 167 h. | **Approved 2026-10-15 (D-526); Block 0.5 built 2026-10-16 (D-528 to D-531).** Q1–Q15 and U-UT1–U-UT52 answered. Block 1 is the night run's Task 3. | Read the plan, §7 for the blocks. | Answered. |

## For Abdullah (listed only, not for you to check)

- **Run 2026-10-14:**
  - one migration, `e6b2d8a4c1f9` (earthwork review `contour_style`, JSONB, empty by default);
  - after D-470 reaches staging and main, every saved earthwork result reads "Out of date" until
    its next Calculate; nothing is written or recalculated
    (`intelcost-infra/notes/2026-10-14_earthwork_out_of_date_after_d470_for_abdullah.md`).

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
  - Metric is live for all; no setting needed (D-396: `METRIC_ENABLED` is removed).
- **Migrations since `d374b6c2d9e1`** (2026-10-12, in order, each after the one before; head
  `d385a1c7e9b2`):
  1. `d378c9d2e6f4`: `takeoff_item.formula_unit_system`, `assembly_template.unit_system` (D-378);
  2. `d379e1a4b7c2`: `earthwork_bank_quantity`, and `unit_pinned` on `takeoff_item`,
     `takeoff_cost_component`, `assembly_child`, `assembly_component` (D-379);
  3. `d380a5c7e2f1`: `project_share_link.allow_save_copy`, `.copy_include_pricing`, table
     `project_share_copy` (D-384);
  4. `d381b2c4e6a8`: `project_share_link.show_member_names` (D-385);
  5. `d382c6f1a9b3`: `project_craft_rate.local_index` (D-391);
  6. `d383e7a2b5c4`: `project_share_copy.link_id`, `.copy_project_id`, `.job_uuid`,
     `.completed_at` (backfilled from `created_at`) and a unique index on link and viewer (D-392);
  7. `d384f2a6c8e1`: `takeoff_cost_component.formula_unit_system`, default imperial (D-397);
  8. `d385a1c7e9b2`: `project_equipment_usage.formula_unit_system`, default imperial (D-404).
- **Viewer presence load** (D-385, D-393): every viewer of a shared link polls
  `GET /api/share/{token}/presence` once a second. The answer is kept in Redis for one second per link,
  so a burst of viewers makes one database read, but every request still reaches the api. bcrypt only on
  password entry (D-395): a password link's viewers send a signed pass, checked by signature, not by hash
  (the api hashes with argon2). Size uvicorn and Redis for viewers × 1 request a
  second at the expected peak; the Redis keys are `share:presence:*` (1 s) and `share:watch:*` (60 s).
- **Rate limit on the public share endpoints** (D-393): `/api/share/{token}/meta`, `/bundle` and
  `/presence` are public and unthrottled. A per-IP limit at Caddy or the CDN, generous enough for one
  viewer polling every second (presence) and strict on repeated wrong passwords (the 401s), is not
  built.
- **Invite emails (D-520):** migration `b8f4d6c1e3a5` (`project_share_link.password_sealed`); the api
  image adds `cryptography`; set `SHARE_PASSWORD_KEY` (its own secret) in production, before any link
  password is saved there.
- **Access key (D-521):** migration `c9a5e7d2f4b6` (`project_share_link.access_changed_at`). **Treat
  `SHARE_PASSWORD_KEY` like a database password:** back it up with the other production secrets; use
  a different value for staging and for live; never change it without a re-encrypt step. Changed or
  lost, every saved access key stops being readable: Show and Send invites are refused until
  each link's key is typed or generated again (guests are unaffected, they are checked against the
  hash).
- **Day-2 run 2026-10-15:** one migration, `a7e3c5b9d2f4` (table `project_share_invite`, D-519); the
  worker image sends the new `share_invite` email (rebuild with the api); the wrong-password limit and the
  share endpoints read the client address, so run uvicorn with `--proxy-headers` behind the proxy (V4).
- **Optional:** a read-only database role for the wage reference data (DECISIONS.md:10864).
- **Legacy data migration and cutover, P-16/F17** (FEATURES.md:86): not yet specced.
- **The 🔧 review table** (flows.md:345–359): SES, production CORS, lifecycle, worker sizing, and the Stripe setup.

## Parked

| # | File:line | What it is | Your answer |
|---|---|---|---|
| S3 | drafts/c200_acceptance_tasks.DRAFT.md:276–313 | C-200 gap: 11 questions, parked on purpose by D-232. | Later (2026-10-11) |
| S3b | RUN_REPORT_2026-10-15 R8 | Contour batch entry: draw several, give the first level, the rest follow in drawing order. | Later (2026-10-15, the night brief) |
| D7 | DECISIONS.md:9848 (D-271) | About 25 site-stitching calls made while building. | Later: parked with C26 (2026-10-11) |
| D16 | DECISIONS.md:12424 (D-340) | The 47.9 GB storage backup at `E:\bench-backups\minio-intelcost-local-2026-10-10.tar`. | Later: keep until MinIO is retired (around 2026-10-18), then delete. Tied to the MinIO retirement, already tracked; no separate reminder (2026-10-11) |
| D17 | archive/OVERNIGHT_REPORT_2026-10-10.md:52 | Moving the repos onto the Linux disk. | Later: parked, revisit later (2026-10-11) |
| D21 | FEATURES.md:87 (P-17) | A provider for the project map and address lookup. | Later: keep deferred (2026-10-11) |
| D22 | PARITY_GAPS.md:154, 182 (D-287 6) | The Library page. | Later: keep parked (2026-10-11) |
| C18 | MANAGER.md:32; DECISIONS.md:8148 (F18, D-232) | The C-200 acceptance, your own test by hand. | Later: parked with C-200, D-232 (2026-10-11) |
| C26 | MANAGER.md:35 (F19) | The site-stitching click check. It needs a C-200 copy. | Later: parked with C-200 (2026-10-11) |
| V6 | guest-REPORT_2026-10-15 | Who-is-where markers in the Sheets panel (members and guests). | Later (2026-10-15) |
| X1 | DECISIONS.md (D-523 C, known edge) | A guest whose session ends is sent back to the link's page; a reload in the split second between the refusal and that page change loads the person's own session on the project URL, which reads "No such project". | Later (2026-10-15) |
| S2 | drafts/zoom_hybrid_images.DRAFT.md:121–129 | Sharper deep zoom from pre-made images: 4 questions. | Later (2026-10-11) |
