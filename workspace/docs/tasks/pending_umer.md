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

**Answered 2026-10-17 (evening run brief), closed:**
- **P1:** don't add umeralam.q@gmail.com to Bench Construction Test. The lock now takes writes from estimator@ and umeralam.q@gmail.com (D-601).
- **P2:** make the archived suite safe and run it (D-611; see the evening run below).
- **P3:** D-593, D-598 and D-599 confirmed, and marked so in DECISIONS.

**Still open:**

| # | What | Where it stands | Your call |
|---|---|---|---|
| P4 | Item 12 | Skipped, none has an agreed spec. The 820 px top bar is a proposal in DAY_REPORT_2026-10-12 ("not built, as asked"); the zoom patch is yours to try (N1); the Folders tab name has no spec. | Agree a spec for any you want built. |

## Evening run 2026-10-17 (morning-report-2026-10-17/EVENING_REPORT_2026-10-17.md)

**Answered 2026-10-17 (answers to the evening report), closed in DECISIONS:**
- **ok:** E1 (trenches open in their start surface's view only, outlines elsewhere), E2 (the key at the top left),
  E4 with E5 (the suite on its own stack, the skip list as listed) and E6 (the throwaway's read, as is).
- **Changed:** E3, the cross-section pane draws the trench at the station (D-613). E7: only the fixtures covering
  what F29 touched are updated and run, and every other failure gets a one-line cause (D-614).

## Answers run 2026-10-17 (morning-report-2026-10-17/ANSWERS_REPORT_2026-10-17.md)

**Done:**
- **Item 1:** E1, E2, E4 and E6 closed in DECISIONS.
- **Item 2:** the pane draws the trench at the station (D-613).
- **Item 3:** pipes in 3D at max(true size, 3 px) (D-612).
- **Item 4:** the folder rule answered and kept (D-608).
- **Item 5:** the F29 fixtures updated and run (D-614).

| # | What | Where it stands | Your call |
|---|---|---|---|
| Q1 | D-613, an oblique section line: the trench drawing stays square to the run and names the angle the line crosses at; the long section stretches the trench along the line. The drawing sits below the long section, one per crossing run. | Taken, built. | ok, or say how and where it should draw. |
| Q2 | D-614: the updated fixtures live in `intelcost-infra/fx-suite-updates/`, as whole files laid over the restored tag by `fx-suite.sh setup` and `refresh`. | Taken. | ok, or name another home. |
| Q3 | Work scopes, Estimating lines and grouping, the Excel export and the guest view have no archived fixture: the tag predates them. | None written. New fixtures are new test code (rule 8). | Write fixtures for them, or leave them to the smoke checks. |
| Q4 | A takeoff address for a project that doesn't exist, or that you can't see, stays on "Opening takeoff" indefinitely. D-37 says it should read "Project not found". Found by d37-links' steps 4–5. | Not fixed. | Fix it (recommended: when the project or its sheets read answers 404, say "Project not found" with a way back, as D-37 says), or leave it. |
| Q5 | The other 84 failing fixtures: drift since the tag, plus a few harness and environment causes. Apart from Q4 and Q6, none looks like a product bug. | Each listed with a one-line cause (`FIXTURE_CAUSES_2026-10-17.md`); not updated (E7). | Nothing, or name fixtures to update. |
| Q6 | At a phone's width (375 px), Settings › Classification is about 10 px too wide and scrolls sideways, and the settings tab strip does not scroll the open tab into view (on grouped pages it never can: the group tab never carries `aria-current`). Found by p19 in the rerun. | Not fixed; the 10 px element is not yet pinned. | Fix both (recommended: mark the group tab current and scroll it in; find the wide row at 375 px), or leave them. |

## Night run 2026-10-18 (morning-report-2026-10-18/NIGHT_REPORT_2026-10-18.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| T1 | D-616 changes U-UT32: where trenches cross or join, the shared ground is dug once, by the deeper one, and the other loses its share of excavation, bedding, zone and backfill, with a note on each. | Taken overnight, built. | ok, or keep counting twice. |
| T2 | D-615, a new run's defaults: the last run's fields, but not its inverts (a typed invert belongs to one run's ends). | Taken overnight. | ok, or carry the inverts too. |
| T3 | D-615: the box closes while you draw or count, and opens again on the result. | Taken overnight. | ok, or keep it open. |
| T4 | D-615, Start + slope continued from its start: the start invert moves back up the slope so the old part keeps its inverts, flagged like a projected invert. | Taken overnight. | ok, or say how. |
| T5 | D-617: the box has no Name field, so a run or structure is numbered by type (SS-1, MH-5); the BENCH- names needed a rename. | Not built. | Add an optional Name (recommended), or leave numbering. |
| T6 | D-617: "Trench from" carries over from the last run silently. After EG-1 (existing grade), eight runs started from existing grade and opened only in the Existing view in 3D. | Not changed. | Mark a carried-over value that differs from the project's settings (recommended), or stop carrying Trench from. |
| T7 | D-618: with Show buried, bore columns now show through the ground too, so they can hide a pipe behind them. | Built. | ok, or bores only through a faded ground. |
| T8 | The BENCH- set can't be redrawn to the evening's figures: this duplicate's soil layers are "Layer 1–3", and the recipe in the scripts misses DEEP-1's box and EG-1's later edits. | Lengths match; volumes differ. | Agree one written recipe for the set (recommended). |
| T9 | D-619 (item 11): with Ortho on, which is its default (D-74), an Area or Linear rectangle's second corner is pulled onto 45° when the diagonal is within the 15° tolerance. A 20 × 30 ft rectangle came out a 25.5 ft square (650 SF, not 600). The fixture now turns Ortho off for it. | Not changed. | Recommend: Ortho leaves a rectangle's corner alone, since a rectangle is already square to the sheet. Or keep it as is. |
| T10 | D-619 (item 11), found by f3-s10: the workspace logo (F3-S10 AC7, "shown where the workspace is named, on every screen") is drawn only in the app header. Since D-311 only the naming screen and Home's error draw that header, so an uploaded logo shows nowhere but Settings' preview. | Not changed; the fixture step is left failing. | Recommend: show the logo in the takeoff bar beside the project menu. Or drop AC7. |
| T11 | D-619 (item 11), found by f3-s3: F3-S3's rule is "no gate tests the caller's role, and `isAdmin` is gone", and `isAdmin` is back in two places. `SettingsMembers.tsx:53` gates who manages shifts on `perms.isWorkspaceAdmin \|\| perms.isPlatformAdmin`, a role gate. `FormatPanel` takes an `isAdmin` prop, but its value is the capability `canManageWorkspace`, so that one is a name only. | Not changed; the fixture step is left failing. | Recommend: shifts behind a capability (or `canManageWorkspace`), and rename the prop `canEditWorkspaceFormat`. |
| T12 | D-619 (item 11), found by f5-s15 and f5-s19: two of the second-window bounds are missed by a little in every run, including two runs on their own. A calibration reaches window B's chip in 1,014–1,086 ms and its quantities in 1,166–1,363 ms, against "within a second". A finished run reaches B's panel as a saved row in 1,110–1,174 ms. The other live paths (f8-s13, f8-s14, f8-s18 AC1, f5-s19's other steps) stay under the bound. | Not changed; the fixtures keep their bounds. | Recommend timing it on a quiet machine before calling it a fault. The bench runs every service, three browsers and the built apps on one machine. |
| T13 | D-619 (item 11), found by f5-sheet-items: Sheets › ⋮ › Default Expand Level › "Page > Takeoff" is remembered, but after a reload it unfolded only the open sheet's items in 2 of 3 runs. The panel seems to apply the level to the sheets whose items have arrived when it first draws (`SheetsPanel.tsx` 281–292). | Not changed; the fixture step is left as it is. | Recommend: apply the level again as each sheet's items arrive. |

**Answered 2026-10-18 (answers to the night report):**
- **Confirmed as taken:** D-612 to D-619, with Q2, T1, T2, T3, T4 and T7.
- **Done:**
  - T5: an optional Name (D-630);
  - T6: "Trench from" never carries over (D-628);
  - T8: one recipe file (D-627);
  - T9: Ortho never moves a rectangle's corner (D-620);
  - T10: the logo on the PDF, both Excel exports and the guest page (D-625);
  - T11: capability, not role (D-621);
  - T12: timed, not a fault (D-626);
  - T13: the expand level after a reload (D-624);
  - Q4: not found (D-622);
  - Q6: Settings at 375 px (D-623);
  - Q3: the Estimating and export fixtures (D-631).
- **New, left with you:**
  - **D-620:** an Arc's through point and end are still pulled by Ortho. Recommend the same exemption as the rectangle.
  - **D-630:** the estimate's Excel has no run names, since its utility lines are one per type, material, size and range
    (D-572). Recommend keeping that.

## Night run 2026-10-19 (morning-report-2026-10-19/NIGHT_REPORT_2026-10-19.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| N1 | **Product fault, found by c05 (C5):** a calculated earthwork line, once selected, gets the amber selection toolbar with Properties, Start, Resume, Copy and Delete all enabled. D-352 says Calculate owns those lines. Delete does nothing (the line stays at 37.04), but Properties opens the measurement dialog and Start or Resume arm drawing onto the line. | Left failing in the fixture (c05 step 6). | Fix: grey them out for a calculated line, as its ⋮ menu already does (recommended). |
| N2 | **Product fault, found by the f5 load-screen rewrites:** a file ticked on the load screen before the page sizes arrive (`GET …/file/page-sizes`) selects no pages. Its box stays unticked, and because the file now counts as touched, it stays that way when the sizes come. Seen twice. Against D-310 4 ("a file still preparing can be ticked"). | The fixtures wait for the sizes before ticking. | Fix: a tick in that gap selects the file's drawing-size pages once the sizes arrive (recommended). |
| N3 | **Intermittent, seen once (f5-big):** after loading page 2 with page 1 open, the canvas showed "This sheet could not be prepared" for over 3 minutes, though the worker had the page ready in 5 s. It did not happen again on a rerun alone. | Not fixed. The likely cause is a missed realtime refresh of the sheet's images. | Look into it now, or when it comes back. |
| N4 | **Item 8:** a 20,000-item project can't be used. It opens in 3–4 minutes, the page then stops answering, and Estimating takes 4 minutes with a 1.85 GB heap. At 5,000 items the panel scrolls at 7 fps and Estimating at 5 fps. | Measured, in `row_virtualisation_PLAN.md` (Baseline). | Schedule the row-virtualisation block. |
| N5 | **C23:** when "Wet Trades" and " wet trades " merge into one folder, the folder takes the second spelling ("wet trades"). D-308 doesn't say which spelling wins. | Reported, not failed. | Keep the first typed spelling (recommended). |
| N6 | **C23:** "<file> Set" is not a suffix the app adds; a blank folder name falls back to the file's own name (D-308). The click check expected "Electrical" to become "Electrical Set". | The fixture names the file "Electrical Set.pdf". | Confirm D-308 as is, or add " Set". |
| N7 | **C31:** the tx115 upload marks 19 crafts "Matched", where the spec's test 6 says 21 mapped. It may be a counting difference. | Reported. | One look by hand. |
| N8 | **C22:** in New project, step 1's Next button was never found by the test in one run (Enter in the name field worked). | Reported. | One click by hand. |
| N9 | **C17:** the elevation warning names the sheet "Page 1" where the Sheets panel and the line details say "G1". | Minor, reported. | Use the sheet's number (recommended). |
| N10 | **C30:** the Stripe fake sends its webhooks to the main api, so no fixture ever pays. Two steps stay with you: an expired trial becoming Professional after paying, and an AI pack's credits landing. | The fixture stops at the fake Checkout and checks what it was asked for. | Click those two by hand on the bench, or give the fx stack its own fake. |
| N11 | **D-635:** an undo that has to snapshot an item (delete, duplicate) takes a few seconds on a busy api, and a Ctrl+Y pressed in that time is dropped, not queued. | **Done (D-649, night run 2026-10-20):** queued on Takeoff and Estimating; fixture `n11-undo-queue` 2/2 (three Ctrl+Z, three steps; a guest sends nothing). | Confirm D-649. |

**Taken overnight, for you to confirm:**
- D-636: the click checks written as fixtures, each on its own throwaway world.
- D-637: the load-screen fixtures rewritten, with their figures kept.
- D-645: a new variable is archived when undone (the app's own delete for one), and brought back by redo. **Confirmed 2026-10-19.**

**Answered and done, 2026-10-19 (afternoon, "Answers to the night report"):**
- **N1:** a calculated line's toolbar shows Details only (D-639); c05 7/7.
- **N2:** a tick before the sizes holds, and Load waits for them (D-640); fixture `n2-tick-before-sizes` 3/3.
- **N3:** found and fixed (D-641). Opening a sheet unmounted the takeoff and dropped the pending refresh of its images,
  and the canvas called a ready sheet with no image "could not be prepared". Fixture `n3-twenty-loads` 3/3.
- **Undo, the rest:** scale (D-642, exact, 6 table rows), folders and layers (D-643), sub-items (D-644), variables
  (D-645).

**Answered from the 2026-10-18 list:** the Arc's through point and end under Ortho (D-632).

## Row virtualisation run 2026-10-19 (morning-report-2026-10-19/ROWS_REPORT_2026-10-19.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| R1 | **Bulk writes (item 6, a later item):** writing items through the api runs at about 10 a second with 12 requests in flight (4,811 in 489 s, D-638). An import of a few thousand items takes minutes. | Not built. The generated projects for the timings were written straight into the bench database by `drives/gen-items.py` (BENCH DUPs only), about 75 a second. | Schedule a bulk item route for imports, separately. |
| R2 | **First open is still api-bound at size.** The panel's rows draw at 3.4 s (1,000 items), 7.6 s (5,000) and 31 s (20,000); Estimating's first row at 4.5 s, 10.1 s and 24 s. The browser has little left to do. The time is the api's item read on one process: about 3.4 s alone at 5,000 and 13 s at 20,000, with the open's other ~25 reads queued behind it, after about 2 s of app start-up. | Targets not met: 3 s at 5,000, 6 s at 20,000, and Estimating's 1 s, 2 s and 4 s. **Plan written (night run 2026-10-19):** [open_speed_PLAN.md](open_speed_PLAN.md). Measured: 3.5 s of the 5,000-item read is Python building and writing 15.6 MB; a lean read takes 0.15 s. The start-up is 0.8 s, not 2 s. | **Answered and partly built (night run 2026-10-20, D-652, D-653):** rows at 2.5 s (1,000), about 5 s (5,000) and 22 s (20,000) on the fair test, from 3.9, 12.3 and 56 s. Left: the lean read (O1, step 3). |
| R3 | **Estimating scrolls at 33–36 fps** on a 3,000 px/s fling (52 fps at 1,000 px/s). Each new block of rows costs a table layout and paint. The Takeoff panel scrolls at 54–59 fps at every size. | Below the 55–60 target on a fling. | Lighter cells, or a grid layout instead of the `<table>` (the plan's risk note). Later. |
| R4 | **The canvas (item 4, report only):** pan at 1.6 fps and zoom at 1.2 fps with 5,000 shapes; 0.5 and 0.3 fps with 20,000. At 1,000: 5.2 and 4.2 fps. Ctrl+A on 20,000 shapes takes 14.7 s, nearly all of it the canvas drawing every selected shape. | Not changed (the brief). **Plan written (night run 2026-10-19):** [canvas_speed_PLAN.md](canvas_speed_PLAN.md). Profiled: the GPU drawing anti-aliased SVG paths into tiles is most of the time (about 145 ms a tile at 5,000 shapes, up to 1.35 s at 20,000); React redrawing every shape comes next. | **Answered (D-650 brief) and partly built (night run 2026-10-20):** step A (D-654) and step B (D-656). Hover now 58 to 60 fps at 5,000 and 20,000 shapes, Ctrl+A on 5,000 from 30 s to about 7 s. Pan, zoom and Ctrl+A at 20,000 are still raster-bound: step C (WebGL) is the fix, not started (16 h on paper). |
| R5 | **f8-s18 step 2 fails on yesterday's build too:** dragging a count mark sends no PATCH, so "an edited shape reaches the other window" times out. It passed at D-619. Step 3 is D-619's known one (the pane became a dialog). | **Resolved (D-648, night run 2026-10-20): not a product fault.** The drag saves; the step waited for a `DELETE` that the row menu's undoable Delete (D-635) sends as `POST …/item/delete`. Fixture fixed; f8-s18 step 2 passes. Every other drag-to-move proved saved and kept: `r5-drags` 10/10. | Confirm D-648. |

**Confirmed:** D-645 (undoing a new variable archives it), in the row-virtualisation brief.

## Night run 2026-10-20 (morning-report-2026-10-20/NIGHT_REPORT_2026-10-20.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| T1 | **The printed password (item 3, D-651).** window-b@ and walkthrough@ (members of Bench Construction Test) are rotated. The new passwords are only in Windows Credentials › Generic Credentials, "IntelCost bench - <email>". MCP sessions sign in through `browser/bench-session-serve.mjs`. | Done. The old password still opens walkthrough-heir@ (no workspace) and the throwaway fixture accounts, as D-592 kept it. | Confirm D-651. |
| T2 | **`browser/walkthrough-setup.mjs` and `bench-tidy.mjs` sign in with passwords that no longer work:** estimator@ since D-592, and walkthrough@ since D-651. | Not changed (outside tonight's queue). | Move them to `drives/bench-session.py` sessions, or retire them. Recommended: retire `walkthrough-setup.mjs`, and move `bench-tidy.mjs` to a session. |
| T3 | **f9-estimating step 4 missed two rate saves once, run three fixtures at a time;** 11/11 run alone. It typed rates while two other fixtures loaded the same fx api. | Seen once. | None unless it recurs. |
| T4 | **The 3D test copy changed during the run, not by this run.** Its digest went from 4c80d2992414934c to 21edb8ca37565ce5: the C-200 earthwork result was saved again at 03:47:45 UTC with its linked items, computed by estimator@ (the founder account this run never signs in as; the guard refused every write naming the copy), and estimator@ visited it at 06:10 UTC. | **No quantity moved.** Tonight's code and the code before the run compute the identical new result; the api as before D-652 computes the old one exactly. The two differ only in the 12th significant digit (largest 4.7e-10 CF, relative 2e-12): since D-652 the api lists an item's shapes in the order they were made, and the Calculate sums in that order. Inputs identical once sorted. | Check whether an estimator@ tab was left open on the bench overnight (5173), or something else signed in as estimator@. Nothing to undo. |
| T5 | **Left unbuilt tonight, too big to finish with checks before 11:30 UTC:** canvas step C (WebGL, 16 h on paper) and open speed's lean reads (O1, step A of the plan, 8 h). | Not started. | Schedule them as their own runs. Recommended: canvas C first; the open's targets need the lean reads. |

**Answered 2026-10-20:** D-648, D-649, D-651 (T1), D-636, D-637, D-630 and D-308 confirmed; T2 built as D-662; T3
nothing unless it recurs; T4 was Umer's Calculate; T5 built (D-657, D-658).

## Answers run 2026-10-20 (morning-report-2026-10-20/ANSWERS_REPORT_2026-10-20.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| A1 | **A read of a protected project.** While proving the compact read equal to the old one, `cmp_compact.py` ran read-only in the api's process on "Hidden Valley Spec Building Rebid" (bd8fc5b0) as well as the DUPs and the 3D test copy. It printed only item counts, byte sizes and timings; it wrote nothing. The api-process drive is outside the browser guard. | Reported. No further reads of any protected project except the 3D test copy. | Decide whether drives get their own guard (recommended: `drives/` refuse the protected uuids as `lib/protected.mjs` does). |
| A2 | **D-658 changed the plan's lean read:** no field is dropped; the full item read is made fast instead (Postgres builds compact JSON), so Properties never saves a partial item. | Built. 5,000 items: 2.85 s (met). 20,000: about 6.8 s (target 6 s, not met). | Confirm, and say whether to build the lean read with a gate on the editors for the last second at 20,000. |
| A3 | **T6: a click at 20,000 shapes selects in 0.43 to 0.86 s** (target 100 ms). The canvas's part is 60 to 70 ms; the rest is the takeoff page and the Takeoff panel answering a new selection. | Not changed. | Schedule a selection-path profile of ProjectTakeoff and the panel. |
| A4 | **D-662 (T2) changed from the answer:** no session account can tidy (window-b is an Estimator, walkthrough a Takeoff seat, the owner estimator@ is never used), so the tidy runs in the api's process as `drives/bench-tidy.py`. | Built; dry run clean. | Confirm D-662. |
| A6 | **Calculate's difference TIN is not the exact overlay of EG and FG.** On the 1k DUP's C-200, Calculate's engine (no features) gives fill 9,958.8 CY where the exact overlay of the same two TINs, and 250,000 samples of them, give 10,002.6 (0.44 % more); cut agrees to 0.03 %. Found while proving GPS Export's surfaces (D-665). | Reported, not changed (hard rule 3: a quantity change needs a spec). | Decide whether Calculate should take the exact overlay (a spec, and every saved result would move). |
| A7 | **GPS Export, steps 1 to 3 of 7 built** (D-664 to D-666): writers and readers, surfaces, linework and points, pure and proved on C-200. Test zips per preset in plan coordinates: `morning-report-2026-10-20/gps-test-files/`. | **Left:** step 4, coordinates (the `sheet_georef` table and migration, routes with the server fit, the panel, units, system and datum, links and sites); step 5, the dialog, the GPS Export button and the "Building pad" tick (G8); step 6, the fourth-monument check and test files with coordinates; step 7, guests (the link switch, the read-only dialog, the download log). Also: utility inverts, trenches, pits, structures and bores are taken as data by step 3 and wired in step 5. In plan coordinates the README says "US survey feet" where it should say plan feet (fixed with step 4's units). | Schedule steps 4 to 7 (about 30 h on paper). The test zips can go to your contractor now as a format check (G7), knowing they are plan coordinates. |
| A5 | **D-661 (N7):** the 19 are right (Tile Setter is not in Commercial's table; Bricklayer Helper's row is Bricklayer Tender's). The spec's test 6 was corrected, not the code. | Done. | Confirm D-661. |

**Answered 2026-10-20 (night run brief):** A1 built as D-667 (the drives' guard); A2 (D-658) and A4 (D-662)
confirmed; A3 profiled and improved (D-671, target not met: N3 below); A5 built as D-669 (20 of 21 Matched); A6 specced
(D-670, N9); A7 built through step 7 (D-668, D-672 to D-675).

## Night run 2026-10-21 (morning-report-2026-10-21/NIGHT_REPORT_2026-10-21.md)

**Answered 2026-10-21 (D-677)**, worked in night run 2 (`morning-report-2026-10-21/NIGHT2_REPORT_2026-10-21.md`).

| # | What | Answered 2026-10-21 |
|---|---|---|
| N1 | Bricklayer Helper on Commercial & Public | **Ok, closed:** kept as built; Bricklayer Tender is the bricklayer's helper on wage determinations. |
| N2 | 09.04 Tile's default crew | **Go:** the tile crew becomes the default; Terrazzo Worker + Laborer only for terrazzo; tile scopes in every system checked (night run 2, Step 4). |
| N3 | Selection at 20,000 shapes | **Go, Umer's (not Abdullah's):** the selection held outside ProjectTakeoff as an external store, the zoom store's pattern (night run 2, Step 7). |
| N4 | ZHO Dania Pointe Page 26 | **Run only if the bench has a landscape sheet with bleed on Y** (night run 2, Step 8); otherwise Umer uploads the ZHO Dania Pointe PDF. |
| N5 | A set with a printed control table | **Umer provides one.** Until then GPS Export is proved on assumed coordinates only, said in every GPS report and README. |
| N6 | A press exactly on a takeoff vertex | **Go:** it counts as a control-point pick (night run 2, Step 3). |
| N7 | A duplicated project's copied Calculate | **A bug against C6:** the copy reads current on its first open (night run 2, Step 5). |
| C-N8 | Allow GPS Export download | **Passed both ways (Umer, 2026-10-21).** The refusal on an expired trial; then in BENCH PRO: Calculate ran, the switch turned on and stayed on after a reload, a guest opened GPS Export (coordinates read-only, no Calculate) and downloaded, and the download shows in the link's settings (D-687). **Closed.** |
| N9 | The exact-overlay spec | **Approved as written** (night run 2, Step 6). |
| N10 | A window focus refetches all items | **Go:** only items changed since the last read (night run 2, Step 9). |
| N11 | Coordinates through a joined site member | **None for now. Closed.** |
| N12 | Test zips with assumed coordinates | **Each README says plainly "Assumed grid coordinates. Format test only. Not for machine use."** (night run 2, Step 1). |

## Night run 2, 2026-10-21 (morning-report-2026-10-21/NIGHT2_REPORT_2026-10-21.md)

All answered by Umer on 2026-10-21 (day session, D-687).

| # | What | Answer |
|---|---|---|
| M1 | **BENCH PRO workspace** with its copy | **Delete both now** (day session, Step 2). Not added to the protected list. |
| M2 | **Selection under 100 ms at 20,000** | **Go:** build on `night-selection-store`: the panel scrolls only when the row is off screen and mounts only the rows near it; the canvas redraws only the shapes whose selection changed (day session, Step 8). |
| M3 | **Estimating's first row** | **Go, in two parts:** late reads never overwrite a cell being typed in or a value saved after the read was asked (Step 5); then ship the hold and the 20,000-line render (Step 6). |
| M4 | A **lapsed subscription** refusing the GPS Export switch | **Its own sentence:** "Your Professional plan has ended. Renew to turn this on." (Step 3). |
| M5 | Per-sheet lists and classification re-reads | **Go:** live events re-read only the per-sheet lists that changed; a reconnect re-reads the classification only if it changed (Step 9). |
| M6 | Bleed-on-Y check | **Not on Dania Pointe** (leave the Bench Construction Test upload untouched): generated test sheets in four page layouts, checked at every zoom step to 30×, and added to the fixtures (Step 4). |
| M7 | A guest's out-of-date view | **Passed (Umer):** the guest saw the earthwork result as current after Calculate. **Closed.** |

C-200's gap to the engineer's figures (−6.22 / −9.49 % after D-683): **checked by Umer and fine. No action. Closed.**

## Day session 2026-10-21 (morning-report-2026-10-21/DAY_REPORT_2026-10-21.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| K1 | **Known item (M6, D-689):** at Fit and the zoom step above it, the sheet image sits up to **0.66 px** from where the markup layer puts the same point | Sub-pixel, display only; no stored value affected. From 3× up every cross is within 0.09 px; lines and counts store alike at every zoom (ratio 1.000). The m6-position fixture allows 1 px below 3× | **Logged, not changed (Umer, 2026-10-21).** Revisit only if it shows on a real sheet |
| Q1 | The GPS Export switch's **tooltip** on a lapsed Professional workspace says nothing until the click (the toast then gives D-688's sentence) | The app reads a lapsed plan as Professional (D-277 18) | Have the capabilities read name the lapsed plan, so the tooltip says it up front? |
| Q2 | **Estimating's first row at 20,000 items** is now mostly the api's items read (31 MB, 2.5–3.4 s alone, 6–7 s beside the other reads) | D-691, D-692 shipped; targets not met | Go for the api read (a smaller read for Estimating, or streamed)? |
| Q3 | **f6-a step 8** (1.8–2.0 s): the commit waits on the bench disk's flush (`COMMIT` 0.43–1.87 s logged; `pg_test_fsync` 0.54 s per 8 kB `fdatasync` on Docker Desktop's ext4 disk); the socket adds ~0 ms; window B's reads and repaint 350–700 ms | Measured only (day session Step 7) | Leave it; bench-only `synchronous_commit = off`; or move the bench's data to a faster disk? |
| Q4 | **Window B's repaint** waits for the 150 ms settle and three list reads after the change event | Measured only | Paint the row from the single-item read first (~150 ms)? |
| Q5 | **Selection at 20,000 shapes** 312 → 144–176 ms (D-693), not under 100 | Left: ~70 ms handler and render, ~70 ms to paint | Go: the highlight as its own overlay, the WebGL redraw limited to what changed? |
| Q6 | **f7-h step 7** (Delete pill after Ctrl+A) and **rv-rows step 5** (a drag held at the list's edge) fail under parallel load, on HEAD too | Found in day session Step 8 | Look into them as their own item? |
| Q7 | **The renderer log** (D-694) is api only: `GET /api/platform/renderers?days=30` | Shipped | A small table on the platform's admin pages too? |

**Answered by Umer (2026-10-22, D-696), worked in the night run of 2026-10-22
(`morning-report-2026-10-22/NIGHT_REPORT_2026-10-22.md`):**

| # | Answer |
|---|---|
| Q1 | **Yes.** The switch's tooltip names the reason before the click (trial ended, Professional ended, Essentials), the toast's sentence (Step 1). |
| Q2 | **Yes, compression first:** check the items read is compressed end to end; turn it on if not; a streamed read only if 20,000 is still over 4 s (Step 2). |
| Q3 | **Bench only:** `synchronous_commit = off` on the bench database, never production or staging; a plan for measuring the same path on Abdullah's staging before testers, not run (Step 3). |
| Q4 | **Yes:** window B paints the changed row from the single-item read first (Step 4). |
| Q5 | **Yes, after Q2 and Q4:** the selection highlight as its own overlay (Step 6). |
| Q6 | **Yes, before the full suite runs for testers** (Step 5). |
| Q7 | **Yes, small:** sessions per renderer path, last 7 and 30 days, on the platform admin pages (Step 8). |

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

- **D-705 follow-up: a workspace switch opens the last project used there.** Today a switch from the
  avatar menu or Open › Switch workspace lands on Home. Instead it would open the project last used in
  the workspace switched to, on its last sheet, as Home already does on sign-in; with none, Home as now.
  - **Code:** the one switch (`features/workspace/hooks/use-switch-workspace.ts`) asks the workspace's
    recent projects (`projectApi.recent`, already cached by the Open menu) and goes through
    `useOpenProject`. Settings' picker keeps staying where it is.
  - **Process:** a D-NN first; the gates; one smoke with two throwaway workspaces each with a project.
- **D-706 follow-up: Estimating rows and other non-takeoff writes into the outbox.** Today a write outside
  the takeoff list made offline (an Estimating row, a cost component, project settings) waits in memory: a
  reload or close is warned, a crash loses it. Each would be kept in the outbox like a takeoff change, so it
  survives a crash and shows with Retry and Discard when refused.
  - **Code:** a write is safe to keep only if sending it twice does no harm: PUTs of whole values, PATCHes,
    creates with a client uuid. Each route family is listed in `outbox.ts` with its rule, and creates without
    a client uuid gain one in the api first. A teammate's newer change wins (D-501, D-707) where the api can
    tell; that check exists today only for takeoff items.
  - **Process:** a D-NN first; the gates; one smoke: an Estimating edit offline, reload offline, back online.
- **D-706 follow-up: the Properties dialog's save as one outbox entry.** Today it sends the item's fields,
  then the quantity, then the dimensions, one after another; offline, only the first is kept until it lands,
  so a reload loses the rest. One entry would hold all three and resend them in order, or the api would take
  them in one call.
  - **Process:** a D-NN first; the gates; one smoke: Properties saved offline, reload offline, back online.
- **D-708 follow-up: C-200's sharp frame after a wheel zoom is over 600 ms at every pixel ratio**, even
  before D-708 (550–1065 ms; A010.3 is 356–603 ms). To look at with the sheet-worker block below
  (step 4 of its plan).
- **Sheet drawing in a worker: plan approved in principle, waiting for my go.** Plan and timings:
  [sheet_worker_tasks.md](sheet_worker_tasks.md).

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

## Night run 2026-10-22 (morning-report-2026-10-22/NIGHT_REPORT_2026-10-22.md)

| # | What | Where it stands | Your call |
|---|---|---|---|
| R1 | **Estimating's first row at 5,000 items** is 3.1–3.4 s after the streamed read (D-698); at 20,000 it is 2.7–2.9 s | At 5,000 the read is quick; the browser's own work after it is most of the time | Go further on 5,000 (the lines worked out for the first rows before all of them), or leave it? |
| R2 | **The streamed read's first look:** "Loading items: 500 of 20,000. Editing opens when every item is in.", read only | Shipped (D-698) | Keep the wording and read only, or let editing open on the first rows? |
| R3 | **Staging's commit measurement** before testers | Plan written, not run (`staging_commit_PLAN.md`) | Ask Abdullah to run it (or let me run it with him)? |
| R4 | **Selection under 100 ms at 20,000:** the overlay did not help (200 → 192–200 ms median); stashed `night-selection-overlay` | A click's cost is mostly a forced layout (48–61 ms in one `getBoundingClientRect`) and the panel's tree (40–60 ms) | Look into the forced layout and the panel's render next, drop the stash, or stop at today's 150–200 ms? |
| R5 | **Step 7's guest check** was not run: window-b may not make share links, and a guest cannot mark lines anyway | Every member path clean; a real change marked | Run it on your click list, or give a bench member that may make links? |
| R6 | **A guest on a link without "presence" never gets live changes** (no socket, by design); they show on reload | Found in Step 4; unchanged | Should a guest always get live updates, presence or not? |
| R7 | **The markup Properties plan's M1–M4** (floating, several selected, font family list, defaults per person) | Block 1 follows the recommendations; Block 4 waits on M3 | Answer M1–M4 (plan §6) |
| R8 | **The markup panel's Reset** puts legacy's defaults on the selected markup; legacy's Reset reset the tool's defaults even with a markup selected | Built as ours (D-704) | Keep ours, or match legacy? |
| R9 | **The fx dev servers misbehaved tonight** (a port not published, blank white pages, page loads past 30 s); the production builds ran the same fixtures green | Re-verified on production builds | Make the production builds the suite's default (as the full run for testers will be)? |
| R10 | **f6-a step 8 under parallel load:** window B 2,164 ms (bound 1 s); 9/9 twice alone | After D-699 and D-700 | Leave the bound as it is (alone it passes), or allow more under load? |
