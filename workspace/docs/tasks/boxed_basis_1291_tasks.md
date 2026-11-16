# D-1291 / D-1292: the boxed bid-tab basis and extra excavation on it (night run from 2026-11-16, steps 3 and 4)

Decisions: [DECISIONS.md D-1291](../../DECISIONS.md) (step 3) and D-1292 (step 4). Brief and readings R10, R11, R17,
R34, R40–R45: `intelcost-infra/morning-report-2026-11-19/BRIEF.md`. Report only: no app or api source; harness code in
`intelcost-infra/bidtabs/`.

## Step 3 (D-1291): four passes on one harness commit

- [x] R11's marking: `bidtabs/street-marking.mjs` (every run limited width unless its tab text says outside pavement,
      open ground or a temporary low-water crossing; 186 of the 189 priced pipe items marked, recent 131 of 131).
- [x] R43: boxed walls apart from paved (`contract-runner.js` `paved`; unpaved runs take the run's own Box pick where
      Auto would box them limited width). No app change needed.
- [x] Passes `bidtabs/d1291-{a1,a2,b,b2}.json`: (a1) plan defaults boxed unpaved, (a2) boxed paved, (b) Houston preset
      with Harris County boxed and paved per R45 (the step 1 guard), (b′) (b) with CSS $19.75/TON local as the throwaway
      project's own price (R41).
- [x] R44: k without the 8 picks D-1289 repriced, from each item's material $ by key (`matByKeyPerLF`;
      `boxed-report.mjs` K1b); the paved backfill's $ per kind (a2 − a1, P1).
- [x] Run on infra **da4fdab** (two harness fixes after the one-tab trials, both committed before the passes: the
      material split from each component's formula, since the api stores no component total; one line's components per
      line name). Throwaways fx.equip.20261116163204 and (for b′, run again in a fresh project because the api keeps a
      written price on lines carried over from (b)) fx.equip.20261116194442, both purged. All pipe k to the medians:
      a1 1.049, a2 0.718, b 0.643, b′ 0.821; paved backfill +$4.96 M; boxing +$562 k (box rent $313 k).
- [x] Report: `intelcost-infra/morning-report-2026-11-19/step3/BOXED-PASSES.md`.

## Step 4 (D-1292): extra excavation options (a) and (b) on the boxed basis (report only, nothing built)

- [x] Method of `morning-report-2026-11-18/step1/EXTRA-EXCAVATION.md` (B2 box section, Type B, A2 / A3 / A6 + fee,
      displaced spoil hauled only when the contract exports, capped at its surplus), on passes a1 and a2's own trenches
      (rebuilt by the app's engine, equal to each pass's trace to 1e-12).
- [x] Report: `intelcost-infra/morning-report-2026-11-19/step4/EXTRA-EXCAVATION-BOXED.md`.

## Left for the founder

- Whether "in street" should carry the paved backfill in the plan's defaults (R40, a2 − a1), and which pass becomes the
  harness's basis.
- Whether to build extra excavation at all on this basis (its $ is almost all displaced-spoil haul).
