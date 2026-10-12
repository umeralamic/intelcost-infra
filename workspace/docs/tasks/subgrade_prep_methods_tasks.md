# F25 — Prepare subgrade methods and soil stabilization (D-405)

_Picked up 2026-10-12 on Umer's request. Decision: D-405._

## Problem

A Site Feature's Option 2, Prepare subgrade, is a single kind of work: scarify, moisture condition
and compact, written as one SF line. An estimator also bids subgrade that is only compacted, and
subgrade stabilized with lime, cement or fly ash. Stabilization is priced on two quantities: the
area mixed, and the tons of agent, which are a % of the soil's dry weight. Today neither can be
taken off.

## Solution

| # | What | Where |
|---|------|-------|
| 1 | Option 2 asks for a **Method** first (radio buttons): Compacted Subgrade; Scarify, Moisture Condition and Compact Subgrade; Soil Stabilization. Depth and Compacted in lifts follow. A new feature opens on Scarify. A feature with no method stored keeps none unless the person picks one | app `features/takeoff/earthwork/SiteFeatureDialog.tsx` |
| 2 | Soil Stabilization adds: **Agent** (D-405 3's list, then "Other…" with a typed name) and **Rate** (% of dry weight, pre-filled per agent); "+ Second agent (blend)" with its own agent and %; **Soil dry unit weight** (blank: the project's, shown as the placeholder). The depth reads "Mixing depth" | same |
| 3 | Stored on the item: `prep_method`, `stabilizer_agents` (JSONB, 1–2 `{agent, pct}`), `stabilizer_dry_pcf`. Validated beside the other Site Feature fields; a method other than `stabilize` stores no agents | api migration, `takeoff/{models,schemas,service,routes}.py`; app `core/api/types.ts`, `features/takeoff/api.ts`, `useSiteFeatures.tsx` |
| 4 | Project **Soil dry unit weight** in Earthwork assumptions (Calculate's dialog, after shrink): default 110 pcf, 40 to 160; metric shows kg/m³ | api `earthwork/{models,schemas,routes}.py` + migration; app `CalculateDialog.tsx`, `earthwork/api.ts` |
| 5 | The engine carries the method, agents and override through `FeatureInput` → `FeatureExtras.prep` (stored in the result). `featureKey` adds them only when a method is set, so existing results stay current | app `lib/takeoff/earthwork/siteFeatures.ts` |
| 6 | Lines: `prep` named after its method (none: "Prepare Subgrade", as now); `stabilize` parent in SY with sub-lines `stabilize_mix` (SY) and `stabilize_agent_1/2` (TON = SF × ft × pcf × % ÷ 2000), each with `parentRole: "stabilize"`. `LineInputs.soilDryPcf` is the project's value | app `lib/takeoff/earthwork/lines.ts`, `features/takeoff/earthwork/linesFor.ts`, `site/SiteView.tsx` (the site prefix on parents only), `VolumePanel.tsx` (colour, child indent) |
| 7 | The api writes `parent_role` lines as sub-items of the parent row (`parent_item_id`), the four new roles under 31.07.02, deleting children before parents; `recompute_children` skips a Calculate's child | api `earthwork/{schemas,lines}.py`, `takeoff/sub_items.py` |
| 8 | Metric display: SY → m², `"` → mm, `pcf` → kg/m³ in Calculate's names; TON → tonnes (`TO_METRIC`) | app `lib/takeoff/displayName.ts`, `lib/measure.ts` |
| 9 | Quantity table: D-405 10's rows (four stabilization cases and a no-method row) on the browser's lines engine, with hand-worked answers | `intelcost-infra/browser/lib/earthwork-cases.mjs` |

## Out of scope

Agents dosed by volume (polymers, enzymes). A project list of custom agents ("Other…" is typed on
the feature). Prices in the dialog: cost is entered in Estimating on the TON sub-item.

## Fixes (D-406)

Sub-item quantities carried in `formula_qty` (the Takeoff panel showed "—"); lifts entered as a
thickness with the count shown; Compacted Subgrade without lifts and with an optional compaction,
as is Scarify; mm in metric; the dialog's description; calculated tonnage alone in tonnes; "+ Add
agent…" saved to the project (`project_fill_material.kind`). Migration `d406c2a8e4b1` converts stored
counts to thickness and backfills the sub-items already written.

## Check

Gates; quantity table; one smoke through the Playwright MCP on a fresh throwaway account. If its
trial expires mid-test, make another; never move trial or billing dates.

1. **Edited feature:** draw a feature with Scarify (24" in 8" lifts → 3 lifts), then Calculate.
   Edit it to Soil Stabilization (Hydrated Lime 6 %, 12" lifts → 2 lifts), save and Calculate.
2. **New feature:** make one with Soil Stabilization and an agent added through "+ Add agent…".
   The added agent is offered to the next feature.
3. **For both:** in the **Takeoff panel** (not only the volume panel or Estimating), Mix and Compact
   shows the parent's SY and the agent shows its TON.
4. **Metric:** price a hand-picked TON item and the agents per TON, then switch Imperial ↔ Metric
   five times. The hand-picked row reads TON every time, the agents read tonnes in metric, and
   every total is identical to the cent.
