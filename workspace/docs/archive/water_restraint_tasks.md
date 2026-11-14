# F45 — Restrained joints on water, fire and force-main runs

**Decision:** D-1261. **Repos:** app, api, infra. **Brief:** the founder, 2026-11-13 (night run, part 2): "'Restrained
joints' per water / fire / force-main line: off by default; on = whole line or a % of its length; priced from the
library at one set per 20 ft joint. Quantity-table row. Then rerun the 16-contract bid-tab table (0218-3074 stays
excluded as plant piping) with restraint on the items whose descriptions include restrained joints."

## Problem → solution

A run's restraint is bought only at its counted bends and tees (D-908, one MJ restraint set each). A line specified
"restrained joint" (every push-on bell of the stretch harnessed) buys nothing for its joints, so 22 of the 45 water
items on the Houston tabs are priced without the harnesses their description includes. → A run whose base is water,
fire water or force main has **Restrained joints**: Off (default), Whole line, or a % of its length. On, it buys one
bell-joint restraint per 20 ft joint, ⌈restrained LF ÷ 20⌉ a pipe, priced from the library by family and size.

## Tasks

1. **Run option** (stored in the run's `section`, no schema change, as D-1260's options): `restrained_pct`, absent or
   null = off, 100 = whole line, 1–99 = that share of the run's length. Read only for a run whose base is water,
   fire_water or force_main (water main, water service, hydrant lead, irrigation, reclaimed, chilled water, fire line,
   force main, storm force main).
2. **Which pipe has joints to restrain:** the push-on bell families. C900, C909 and C905 (PVC with cast-iron OD) on the
   `pvc_c900` restraint; ductile iron on `ductile_iron`; D2241 (PVC with IPS OD) on `pvc_ips`. Fused HDPE, PE CTS,
   copper, solvent-welded Schedule pipe and welded steel have no bell to restrain: the option is shown greyed with the
   reason, and buys nothing.
3. **Quantity:** sets = pipes × ⌈run LF × pct ÷ 100 ÷ 20⌉ per run (the founder's 20 ft joint for every family), summed
   over the runs of the line. The run's LF is its pipe LF (as the pipe line's), per pipe.
4. **The line:** a run with restrained joints makes a pipe line of its own (`|rj:<pct>` in the variant, after D-1260's
   extras), named "…, restrained joints" or "…, restrained joints 40 %", so the harnesses sit on that stretch's line and
   a run drawn before is unchanged. The material: `restraint_joint:<family>:<nominal>`, "Bell joint restraint, <n>"",
   EA, the sets as a count.
5. **Library prices** (migration, Q4 2026, never over a key already priced): `restraint_joint:pvc_c900:4–36`,
   `restraint_joint:ductile_iron:4–24`, `restraint_joint:pvc_ips:4–12`. Seed file
   `d1261_restraint_joint_prices.json` with each source and grade.
6. **Run panel:** "Restrained joints" (Off / Whole line / Part of the line, with its %), under Add-ons, for the three
   bases; the sets per 20 ft joint shown.
7. **Shared quantity table rows** (`restraint` rows, hand-worked): a 200 LF 8 in C900 main restrained 100 % (10 sets),
   the same at 35 % (⌈70 ÷ 20⌉ = 4), a 6 in DI fire line of 95 LF whole (⌈4.75⌉ = 5), an HDPE force main whole (none:
   fused), restraint off (no line), and a sanitary run (never offered).
8. **Bid-tab rerun:** the 16 contracts (0218-3074 left out as plant piping), today's engine, restraint off then on for
   the 22 items whose description names restrained joints (whole line: no description gives a % or a length); before
   and after by kind and by contract.

## Pricing basis

One maker's domestic price book (Feb 2026, revised March 2026), Series 1390 bell-joint restraints: 1390-C for PVC with
DI OD (C900 DR 14 and 18; DI 4–16 per the maker), 1390-S for PVC with IPS OD. List × 0.573: the median ratio of the
library's own A/B MJ restraint kits (C900 6–16, DI 4–16) to the same book's Series 1300-C list for the same size. Grade
C; DI 18–24 grade D (the maker recommends 1390-C on DI to 16 in only). C900 42 and 48 in and IPS under 4 in are priced
on application in the book: left unpriced (Estimating names them).

## Proof

Gates; the shared quantity table (the `restraint` rows); the migration up/down/up on a separate Postgres with a bench
copy, then on the bench with the founder fingerprint and row compare; smoke on a throwaway: a water main, Restrained
joints Whole line, Calculate, the restraint line in Estimating.

## Built (2026-11-14, night run part 2)

- **app:** `lib/takeoff/earthwork/utilities/types.ts` (`restrained_pct`, `RESTRAINED_BASES`, `runOptions().restrainedPct`);
  `materials.ts` (`RESTRAINED_JOINT_FT`, `jointRestraintOf`, `restrainedJoints`, `jointRestraintMaterials`, on the pipe
  line in `lineMaterials`); `lines.ts` (`restrained` on a run, `|rj:<pct>` and the name, `restrainedJoints` on the run's
  first pipe line); `features/.../calculate.ts` (the run's sets from its pipe LF); `RunPanel.tsx` (Restrained joints:
  Off / Whole line / Part of the line and its %, greyed with the reason on pipe with no bell).
- **api:** migration `d1261b3e7a52` (revises `d1260c4a9e72`), seed `d1261_restraint_joint_prices.json`: 27 keys (C24
  D3). Proved up/down/up on a separate Postgres loaded with a bench copy (1057 → 1084 → 1057 → 1084 rows, `alembic
  check` clean, one head), then run on the bench: founder digest `08497dbdfe517baa` before and after, row compare
  "tables changed: none".
- **infra:** quantity table rows `util-1261-*` (7), the Q4 2026 grade counts (C554 D136); `bidtabs/contract-runner.js`
  builds each item as a new run of its type (D-1260's add-ons) with `restrainedPct`, parity 0 diffs on all 16.
- **Bid tabs:** all 16 contracts LF-weighted −8.9 % → −7.2 % (+$183,454 on $9.46 M); water PVC −11.3 % → −3.5 %; the
  21 restrained PVC items −19.2 % → −4.2 %. Table: `docs/reference/Bid tabs Houston 2026-11/restraint-rerun-2026-11-14.txt`.

### Open

1. Material only: no crew time is added for installing the harnesses.
2. Ductile iron is priced at the founder's 20 ft joint; its own laying length in the catalog is 18 ft (+11 % sets).
3. The fittings' MJ restraint (`restraint:<family>:<n>`) has no C909 key (a C909 bend's restraint is unpriced): not
   changed here.
4. A restrained run is its own line, so its crew pace follows its own run length (the 51 LF item on 1680-8215 +$11.5/LF
   labour and equipment); an alternative is the restraint on the shared line with the sets counted per run.
5. 0386-3118A's four items say "restrained joints where necessary": priced whole line as instructed, which puts them
   +51 % over the tab.
