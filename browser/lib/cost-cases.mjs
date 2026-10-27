// The shared table's cost rows (the founder, 2026-09-29): F9's money through the app's own
// `lib/estimate` (costing, components, the shared-equipment allocator), each against an
// answer worked by hand in the comment beside it. The arithmetic has no api twin yet
// (D-89), so these rows check the browser's engine against the hand answers only.
//
// `line` rows run `computeLineCost`; `components` on them go through `evaluateComponent`
// first, with the host's QTY. `alloc` rows run `allocateResource`. `expect` names the
// result fields to check; money is compared to the cent.

const NO_RATES = {
  wastage_pct_override: null,
  unit_man_hours: null,
  hourly_wage: null,
  equipment_cost: null,
  unit_equipment_cost: null,
  unit_material_cost: null,
  subcontract_cost: null,
};
const rates = (r) => ({ ...NO_RATES, ...r });
const component = (kind, fields) => ({
  id: kind,
  takeoff_item_id: "host",
  kind,
  name: kind,
  position: 0,
  qty_formula: "QTY",
  unit: null,
  pricing_mode: "unit",
  crew: null,
  production_rate: null,
  production_basis: null,
  crew_day_hours: null,
  unit_price: null,
  equip_rate: null,
  equip_basis: null,
  duration_formula: null,
  mob_demob: null,
  sub_calc: null,
  quote_amount: null,
  unit_rate: null,
  ...fields,
});
/** The items `env` rows read: a Slab with one drawn rectangle and its two sub-items. */
export const ENV_SHEET = { uuid: "sheet-1", feet_per_norm: 0.1, width_pt: 1000, height_pt: 1000 };
const dim = { local_key: "d1", name: "Thickness", kind: "vertical", semantic_role: null, value: 6, unit: "IN", raw: "6", position: 0 };
export const ENV_ITEMS = [
  {
    uuid: "slab",
    name: "Slab",
    type: "sf",
    effective_quantity: 200,
    parent_uuid: null,
    formula_qty: null,
    is_reference: false,
    geometries: [{ sheet_uuid: "sheet-1", geom_type: "sf", vertices_json: [[0.1, 0.1], [0.3, 0.1], [0.3, 0.2], [0.1, 0.2]], shape_meta: null, role: "add" }],
    dimensions: [dim],
  },
  { uuid: "rebar", name: "Rebar", type: "sf", effective_quantity: 100, parent_uuid: "slab", formula_qty: 100, is_reference: false, geometries: [], dimensions: [] },
  { uuid: "mesh", name: "Mesh", type: "sf", effective_quantity: 50, parent_uuid: "slab", formula_qty: 50, is_reference: false, geometries: [], dimensions: [] },
];

// Wall: 40 LF at 0.5 MH/LF, $40/h, $3/LF material, $100 subcontract.
const WALL = rates({ unit_man_hours: 0.5, hourly_wage: 40, unit_material_cost: 3, subcontract_cost: 100 });

export const COST_CASES = [
  // --- Rate × quantity -------------------------------------------------------------------
  // 40 × 0.5 = 20 MH; 20 × 40 = $800; 40 × 3 = $120; + $100 = $1,020.
  { id: "rate-x-qty", kind: "line", quantity: 40, unit: "LF", input: WALL, expect: { totalManHours: 20, laborCost: 800, totalMaterialCost: 120, subcontractCost: 100, itemCost: 1020 } },
  // Per-unit equipment extends: 40 × $2.50 = $100.
  { id: "unit-equipment", kind: "line", quantity: 40, unit: "LF", input: rates({ unit_equipment_cost: 2.5 }), expect: { equipmentCost: 100, itemCost: 100 } },
  // A lump is never multiplied: $250 at ×2 stays $250.
  { id: "lump-equipment-x2", kind: "line", quantity: 40, unit: "LF", multiplier: 2, input: rates({ equipment_cost: 250 }), expect: { totalQty: 80, equipmentCost: 250, itemCost: 250 } },

  // --- Wastage ---------------------------------------------------------------------------
  // LF 10 %: 44 LF; 22 MH; $880; 44 × 3 = $132; + $100 = $1,112.
  { id: "wastage-by-unit", kind: "line", quantity: 40, unit: "LF", unitWastage: [["LF", 10]], input: WALL, expect: { qtyWithWastage: 44, laborCost: 880, totalMaterialCost: 132, itemCost: 1112 } },
  // The line's own 5 % beats the unit's 10 %: 42 LF; 42 × 3 = $126.
  { id: "wastage-override", kind: "line", quantity: 40, unit: "LF", unitWastage: [["LF", 10]], input: rates({ wastage_pct_override: 5, unit_material_cost: 3 }), expect: { wastagePct: 5, qtyWithWastage: 42, totalMaterialCost: 126 } },
  // Wastage then the ×2 multiplier: 44 × 2 = 88; 44 MH $1,760; $264; + $100 = $2,124.
  { id: "wastage-then-multiplier", kind: "line", quantity: 40, unit: "LF", unitWastage: [["LF", 10]], multiplier: 2, input: WALL, expect: { totalQty: 88, totalManHours: 44, laborCost: 1760, totalMaterialCost: 264, itemCost: 2124 } },
  // Sheet pivot share 0.25 of a 40 LF item (10 LF on this sheet): material 10 × 3 = $30;
  // lumps prorate: equipment $200 × 0.25 = $50, subcontract $100 × 0.25 = $25; $105.
  { id: "sheet-share-lumps", kind: "line", quantity: 10, unit: "LF", share: 0.25, input: rates({ unit_material_cost: 3, equipment_cost: 200, subcontract_cost: 100 }), expect: { totalMaterialCost: 30, equipmentCost: 50, subcontractCost: 25, itemCost: 105 } },

  // --- Cost components -------------------------------------------------------------------
  // Material, unit mode, QTY × 1.1 = 110 at $2 = $220 over a 100 SF host: $2.20/SF; with
  // the line's 10 % wastage, 110 SF × 2.20 = $242.
  {
    id: "component-material-unit",
    kind: "line",
    quantity: 100,
    unit: "SF",
    input: rates({ wastage_pct_override: 10 }),
    components: [component("material", { qty_formula: "QTY*1.1", unit_price: 2 })],
    expect: { unitMaterialCost: 2.2, totalMaterialCost: 242, itemCost: 242 },
  },
  // Labor crew 2 × $30 + 1 × $45 = $105/h, 3 heads, 20 units/h over 100 SF: 5 crew-h,
  // 15 MH, $525; rate 0.15 MH/SF, blended $35/h; no wastage: $525.
  {
    id: "component-labor-crew",
    kind: "line",
    quantity: 100,
    unit: "SF",
    input: rates({ unit_man_hours: 9, hourly_wage: 99 }),
    components: [component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 30 }, { role: "Foreman", count: 1, hourly_wage: 45 }], production_rate: 20, production_basis: "units_per_hr" })],
    expect: { unitManHours: 0.15, totalManHours: 15, hourlyWage: 35, laborCost: 525, itemCost: 525 },
  },
  // Equipment lump: $400/day × 3 days + $150 mob = $1,350, carried as typed under ×2.
  {
    id: "component-equipment-lump",
    kind: "line",
    quantity: 100,
    unit: "SF",
    multiplier: 2,
    input: rates({}),
    components: [component("equipment", { pricing_mode: "lump", equip_rate: 400, equip_basis: "day", duration_formula: "3", mob_demob: 150 })],
    expect: { equipmentCost: 1350, itemCost: 1350 },
  },
  // A typed rate of a kind no component covers stays: $3/SF material (100 × 3 = $300)
  // beside a $5,000 subcontract quote (lump): $5,300.
  {
    id: "component-quote-keeps-typed",
    kind: "line",
    quantity: 100,
    unit: "SF",
    input: rates({ unit_material_cost: 3 }),
    components: [component("subcontract", { pricing_mode: "lump", sub_calc: "quote", quote_amount: 5000 })],
    expect: { totalMaterialCost: 300, subcontractCost: 5000, itemCost: 5300 },
  },

  // --- A component's formula environment (legacy's costEnvFor) --------------------------
  // Slab: a 20 × 10 ft rectangle (0.1 ft/pt on a 1000 pt page): 200 SF, perimeter 60 LF;
  // d1 = 6 in = 0.5 ft; the variable is 1.5. PERIMETER × d1 + var + PARENT / 100 =
  // 30 + 1.5 + 2 = 33.5 LF at $2, unit mode over 200 SF: $67.
  {
    id: "component-env-full",
    kind: "env",
    host: "slab",
    vars: [["11111111-1111-1111-1111-111111111111", 1.5]],
    components: [component("material", { qty_formula: "PERIMETER*{dim:d1}+{var:11111111-1111-1111-1111-111111111111}+PARENT/100", unit_price: 2 })],
    expect: { totalMaterialCost: 67, itemCost: 67 },
  },
  // A component on a sub-item reads its parent's environment: PARENT is Slab's 200 SF and
  // [mesh] its sibling's 50: 250 at $1 = $250.
  {
    id: "component-env-sub-item",
    kind: "env",
    host: "rebar",
    vars: [],
    components: [component("material", { qty_formula: "PARENT+[mesh]", unit_price: 1 })],
    expect: { totalMaterialCost: 250, itemCost: 250 },
  },

  // --- Seed from… an assembly (D-243): a seeded sub-item costs what the assembly's does --
  // The assembly's sub-item "Rebar" is PARENT * 1.2, so 120 LF under a 100 LF parent. Typed
  // labour 0.1 MH/LF at $50/h: 120 × 0.1 × 50 = $600. A material component QTY × 1.1 at
  // $2: 132 × 2 = $264. An equipment lump, $400/day × 3 days + $150 mob = $1,350. Total
  // $2,214: the assembly's at 120 LF (its Costs preview), and the seeded sub-item's with
  // the components as the api's copy writes them (`drives/quantity-table.py seed`).
  {
    id: "seed-copies-components",
    kind: "seed",
    parentQty: 100,
    formula: "PARENT*1.2",
    unit: "LF",
    input: rates({ unit_man_hours: 0.1, hourly_wage: 50 }),
    template: [
      component("material", { qty_formula: "QTY*1.1", unit_price: 2 }),
      component("equipment", { pricing_mode: "lump", equip_rate: 400, equip_basis: "day", duration_formula: "3", mob_demob: 150 }),
    ],
    expect: { quantity: 120, assembly: 2214, seeded: 2214, copied: 2 },
  },

  // --- A formula error carries the last good total; no quantity carries lumps ----------
  // The formula no longer reads, so the $123 saved before it rides as a lump, never $0.
  {
    id: "component-last-good-total",
    kind: "line",
    quantity: 100,
    unit: "SF",
    input: rates({}),
    components: [component("material", { qty_formula: "QTY*(", unit_price: 2, total: 123 })],
    expect: { totalMaterialCost: 123, itemCost: 123 },
  },
  // A saved labour component whose production rate is cleared (round 3 A1): the $368
  // saved before rides as a lump on the row, its group and TOTAL, never $0.
  {
    id: "labor-no-rate-last-good-total",
    kind: "line",
    quantity: 61.33,
    unit: "LF",
    unitWastage: [["LF", 10]],
    input: rates({}),
    components: [component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 30 }], production_rate: null, total: 368 })],
    expect: { laborCost: 368, itemCost: 368 },
  },
  // A host of 0 SF: the $50 unit-mode material (5 × $10) is carried as a lump, and the
  // unit rate is 0 ("—" on screen, "No quantity").
  {
    id: "component-no-quantity",
    kind: "line",
    quantity: 0,
    unit: "SF",
    input: rates({}),
    components: [component("material", { qty_formula: "5", unit_price: 10 })],
    expect: { unitMaterialCost: 0, totalMaterialCost: 50, itemCost: 50 },
  },

  // --- "Keep as typed rates" when a kind's last component goes (legacy's resolveRemoval) -
  // Material QTY × 1.1 at $2 over 100 SF: $220 → $2.20/SF kept as the typed rate.
  { id: "keep-material-rate", kind: "keep", quantity: 100, keepKind: "material", components: [component("material", { qty_formula: "QTY*1.1", unit_price: 2 })], expect: { unit_material_cost: 2.2 } },
  // The crew above: 15 MH over 100 SF = 0.15 MH/SF at the blended $35/h.
  {
    id: "keep-labor-rates",
    kind: "keep",
    quantity: 100,
    keepKind: "labor",
    components: [component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 30 }, { role: "Foreman", count: 1, hourly_wage: 45 }], production_rate: 20, production_basis: "units_per_hr" })],
    expect: { unit_man_hours: 0.15, hourly_wage: 35 },
  },
  // A lump machine ($1,350) is kept as the lump, never as a unit rate.
  { id: "keep-equipment-lump", kind: "keep", quantity: 100, keepKind: "equipment", components: [component("equipment", { pricing_mode: "lump", equip_rate: 400, equip_basis: "day", duration_formula: "3", mob_demob: 150 })], expect: { equipment_cost: 1350, unit_equipment_cost: null } },

  // --- The workbook keeps a formula only when it gives the app's figure (legacy's) ------
  // Row 2, typed rates: 40 LF + 10 % = 44 × $3 = $132; Total Material's formula (44 × 3)
  // and Item Cost's (0 + 0 + 132 + 0) both hold. Row 3, a $50 lump material component:
  // Total Material is $50 but 44 × $0 = 0, so its formula is dropped for the value; Item
  // Cost's sum (0 + 0 + 50 + 0 = 50) still holds.
  {
    id: "workbook-verified-formulas",
    kind: "workbook",
    rows: [
      { qty: 40, wastage: 0.1, qty_wastage: 44, multiplier: 1, total_qty: 44, unit_material: 3, total_material: 132, item_cost: 132 },
      { qty: 40, wastage: 0.1, qty_wastage: 44, multiplier: 1, total_qty: 44, unit_material: null, total_material: 50, item_cost: 50 },
    ],
    expect: { typedMaterialFormula: true, typedItemCostFormula: true, lumpMaterialFormula: false, lumpItemCostFormula: true, lumpMaterialValue: 50 },
  },

  // --- Shared equipment, spread to the cent ----------------------------------------------
  // $100/day, 1 h each on three hosts: 3 h → 1 day → $100.00 = 10,000 cents; a third is
  // 3,333.33 each; floors 9,999, the last cent to the first of the tie: 33.34, 33.33, 33.33.
  {
    id: "spread-thirds",
    kind: "alloc",
    res: { rate: 100, basis: "day", allocationBasis: "usage_hours" },
    hosts: [{ id: "A", usageHours: 1 }, { id: "B", usageHours: 1 }, { id: "C", usageHours: 1 }],
    expect: { total: 100, allocations: { A: 33.34, B: 33.33, C: 33.33 }, unallocated: 0 },
  },
  // By quantity, 40 LF and 60 LF, $250/wk for 2 weeks + $75 mob = $575: 40 % $230, 60 % $345.
  {
    id: "spread-by-quantity",
    kind: "alloc",
    res: { rate: 250, basis: "wk", rentalOverride: 2, mobDemob: 75, allocationBasis: "quantity" },
    hosts: [{ id: "A", usageHours: null, qty: 40, unit: "LF" }, { id: "B", usageHours: null, qty: 60, unit: "LF" }],
    expect: { total: 575, allocations: { A: 230, B: 345 }, unallocated: 0 },
  },
  // Manual 30 % and 50 % of $1,000 (1 month): $300, $500, $200 unallocated.
  {
    id: "spread-manual-pct",
    kind: "alloc",
    res: { rate: 1000, basis: "mo", rentalOverride: 1, allocationBasis: "manual_pct" },
    hosts: [{ id: "A", usageHours: null, manualPct: 30 }, { id: "B", usageHours: null, manualPct: 50 }],
    expect: { total: 1000, allocations: { A: 300, B: 500 }, unallocated: 200 },
  },
  // No usage anywhere: an hourly machine rents 0 h, so only the $200 mob remains, all of it
  // unallocated.
  {
    id: "spread-no-usage",
    kind: "alloc",
    res: { rate: 50, basis: "hr", mobDemob: 200, allocationBasis: "usage_hours" },
    hosts: [{ id: "A", usageHours: null }, { id: "B", usageHours: null }],
    expect: { total: 200, allocations: { A: 0, B: 0 }, unallocated: 200 },
  },
  // A host's share is additive lump equipment: $100 typed + $33.34 shared, never × 2.
  { id: "shared-share-on-host", kind: "line", quantity: 40, unit: "LF", multiplier: 2, input: rates({ equipment_cost: 100 }), equipmentAllocation: 33.34, expect: { equipmentCost: 133.34, itemCost: 133.34 } },

  // --- The bid summary (F9b, D-128): compounding, tax on material first -------------------
  // Direct $100,000, material $40,000; tax 8 %: 40,000 × 0.08 = $3,200 → $103,200; overhead
  // 10 % = $10,320 → $113,520; profit 10 % = $11,352 → $124,872; bond 1 % = $1,248.72;
  // Bid total $126,120.72.
  {
    id: "bid-compounding",
    kind: "bid",
    totals: { directCost: 100000, materialCost: 40000 },
    rates: { taxPct: 8, overheadPct: 10, profitPct: 10, bondPct: 1, extra: [] },
    expect: { tax: 3200, overhead: 10320, profit: 11352, bond: 1248.72, total: 126120.72 },
  },
  // Every line to the cent as it is made. Direct $12,345.67, material $5,432.10: tax 8.25 %
  // = 448.14825 → $448.15, $12,793.82; overhead 12 % = 1,535.2584 → $1,535.26, $14,329.08;
  // contingency 2.5 % = 358.227 → $358.23, $14,687.31; profit 10 % = 1,468.731 → $1,468.73,
  // $16,156.04; bond 1.5 % = 242.3406 → $242.34; Bid total $16,398.38.
  {
    id: "bid-cents-and-extra",
    kind: "bid",
    totals: { directCost: 12345.67, materialCost: 5432.1 },
    rates: { taxPct: 8.25, overheadPct: 12, profitPct: 10, bondPct: 1.5, extra: [{ name: "Contingency", pct: 2.5 }] },
    expect: { tax: 448.15, overhead: 1535.26, "extra:0": 358.23, profit: 1468.73, bond: 242.34, total: 16398.38 },
  },
  // The export's Bid Summary sheet: tax is ROUND(material × rate) in C4, overhead is taken
  // on the running subtotal (D4), and the Bid total carries the first case's $126,120.72.
  {
    id: "bid-workbook-sheet",
    kind: "bidsheet",
    totals: { directCost: 100000, materialCost: 40000 },
    rates: { taxPct: 8, overheadPct: 10, profitPct: 10, bondPct: 1, extra: [] },
    expect: { taxOnMaterial: true, overheadOnSubtotal: true, total: 126120.72 },
  },

  // --- Unit figures read back from the totals (D-762 A1): a unit × its quantity = its total ---------
  // 100 SF; equipment as a lump (2 days × $500 + $200 mob = $1,200) and material $3/SF: Unit Equipment
  // $1,200 ÷ 100 = $12.00 (today's 0 for a lump), Unit Material $3.00, Item $1,500. No total moves.
  {
    id: "units-lump-equipment",
    kind: "units",
    quantity: 100,
    components: [
      component("equipment", { pricing_mode: "lump", equip_basis: "day", equip_rate: 500, duration_formula: "2", mob_demob: 200 }),
      component("material", { unit_price: 3 }),
    ],
    expect: { unitEquipment: 12, unitMaterial: 3, itemCost: 1500 },
  },
  // Typed labour, 100 SF + 10 % wastage: Total Qty 110, 0.5 MH × 110 = 55 MH × $40 = $2,200; Unit Labor
  // $2,200 ÷ 110 = $20.00 = 0.5 × $40; Unit MH 0.5; wage $40.
  { id: "units-typed-labor", kind: "units", quantity: 100, input: rates({ wastage_pct_override: 10, unit_man_hours: 0.5, hourly_wage: 40 }), expect: { unitLabor: 20, unitManHours: 0.5, hourlyWage: 40, itemCost: 2200 } },
  // A shared machine's share only, $133.34 on 50 LF: Unit Equipment $133.34 ÷ 50 = $2.6668 → $2.67.
  { id: "units-shared-only", kind: "units", quantity: 50, unit: "LF", equipmentAllocation: 133.34, expect: { unitEquipment: 2.6668, itemCost: 133.34 } },
  // A parent (Q2): sub-items 100 SF × $2 and 50 SF × $4 = $400 of material over the parent's own 20 LF:
  // Unit Material $400 ÷ 20 = $20.00 per LF.
  { id: "units-parent", kind: "units", parentQty: 20, parts: [{ quantity: 100, input: rates({ unit_material_cost: 2 }) }, { quantity: 50, input: rates({ unit_material_cost: 4 }) }], expect: { unitMaterial: 20, itemCost: 400 } },
  // --- The reports' Summary mode (D-762 A5): a summary's total is its report's, to the cent ------------
  // 100 SF, 10 % wastage, × 2 (Total Qty 220): a crew of 2 Laborers at $40 (1 MH per 10 SF → 10 MH net,
  // × 2.2 = 22 MH, $880), material $3/SF per unit ($660) plus a $50 lump, a $200 machine lump and a
  // $133.34 shared share. Each summary's total = the line's own: labour $880, material $710, equipment
  // $333.34, the full estimate $1,923.34; the crew's 22 MH split over its one craft.
  {
    id: "summary-ties",
    kind: "summary",
    quantity: 100,
    multiplier: 2,
    input: rates({ wastage_pct_override: 10 }),
    equipmentAllocation: 133.34,
    components: [
      component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 40 }], production_rate: 20, production_basis: "units_per_hr" }),
      component("material", { name: "Board", unit_price: 3 }),
      component("material", { name: "Board", pricing_mode: "lump", qty_formula: "1", unit_price: 50, usage: "Offcuts" }),
      component("equipment", { pricing_mode: "lump", equip_basis: "day", equip_rate: 200, duration_formula: "1" }),
    ],
    expect: { labor: 880, material: 710, equipment: 333.34, all: 1923.34, laborMh: 22, line: 1923.34 },
  },
  // --- Exports store values rounded (D-766 F0): money to cents, quantities and hours to 2 places, per-unit
  // rates to 4, the TOTAL the sum of the stored cells. The HV copy's Building Pad Fill line, as the app
  // computes it: 2,398.900895 CCY, 57.116687976190484 MH, 0.0238095… MH/CCY, $109.989…/hr, $6,282.2073938… labour.
  // A second line of $0.005: each line rounded once, alone (D-797), so it stores $0.01 and TOTAL is the sum of
  // the stored lines, $6,282.22, as the screen's TOTAL reads.
  {
    id: "export-stored-values",
    kind: "stored",
    rows: [
      { qty: 2398.900895, total_mh: 57.116687976190484, unit_mh: 0.02380952380952381, wage: 109.98900000000002, labor_cost: 6282.207393813216, unit_labor: 2.618785714285715 },
      { qty: 0.004999, total_mh: 0, unit_mh: 0.00005, wage: 40, labor_cost: 0.005, unit_labor: 0.00005 },
    ],
    expect: { qty: 2398.9, total_mh: 57.12, unit_mh: 0.0238, wage: 109.99, labor_cost: 6282.21, unit_labor: 2.6188, qty2: 0, unit_mh2: 0.0001, labor_cost2: 0.01, total: 6282.22 },
  },
  // --- Cost components sum across the project (D-766): the same crew, material and equipment once ---------
  // Two lines with the same crew (2 Laborers at $40, 20 SF/hr), material (Board $3/SF) and equipment
  // (Loader, 1 day at $200, a lump per line). Wall A 100 SF: 5 hr → 10 MH, $400; $300; $200 = $900.
  // Wall B 50 SF: 2.5 hr → 5 MH, $200; $150; $200 = $550. Labor one crew row, 15 MH, $600; Material one
  // Board row, 150 SF, $450; Equipment one Loader row, 2 days, $400; Full estimate three sections (no
  // subcontract), $1,450 = the two lines; Quantities one "Wall" row of 150 SF (same name and unit).
  {
    id: "components-once",
    kind: "components",
    lines: [
      { name: "Wall", quantity: 100 },
      { name: "Wall", quantity: 50 },
    ],
    components: [
      component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 40 }], production_rate: 20, production_basis: "units_per_hr" }),
      component("material", { name: "Board", unit: "SF", unit_price: 3 }),
      component("equipment", { name: "Loader", pricing_mode: "lump", equip_basis: "day", equip_rate: 200, duration_formula: "1" }),
    ],
    expect: { laborRows: 1, laborMh: 15, labor: 600, materialRows: 1, material: 450, materialQty: 150, equipmentRows: 1, equipment: 400, equipmentDays: 2, sections: 3, all: 1450, lines: 1450, quantityRows: 1, quantity: 150 },
  },
  // The list in whole cents, each line split within itself (D-797): a line whose crew of three crafts costs
  // $100.00 stores $33.34 (Laborer, its first) + $33.33 + $33.33 = $100.00; two typed lines of $0.005 each round
  // once alone to $0.01, so "Typed rates" is $0.02 and the list $100.02, the three lines as the grid shows them.
  {
    id: "components-cents",
    kind: "cents",
    expect: { crafts: 100, laborer: 33.34, typed: 0.02, total: 100.02, lines: 100.02 },
  },
  // --- Bottom-up rounding (D-797, supersedes D-772's balancing): each line rounds once, the rest adds ------
  // Three lines of $100 / 3 labour and one of $0.006 labour and $0.006 material. Each line's types round once
  // from its own figures: 33.33, 33.33, 33.33, and $0.01 + $0.01 = $0.02. Labour is their sum, $100.00, material
  // $0.01, the whole $100.01; no line takes a cent from another. (The unrounded sum, $100.012, also reads
  // $100.01 here; it need not in general.)
  {
    id: "shown-adds-up",
    kind: "shown",
    rows: [{ laborCost: 100 / 3 }, { laborCost: 100 / 3 }, { laborCost: 100 / 3 }, { laborCost: 0.006, totalMaterialCost: 0.006 }],
    expect: { items: "33.33,33.33,33.33,0.02", labor: 100, material: 0.01, whole: 100.01, roundedOnce: 100.01 },
  },
  // A rate read back from a component-priced amount (D-797): 10,000 BCY at $7,093.66 shows $0.709366, six
  // places, since $0.7094 × 10,000 = $7,094.00; $1,000.00 over 400 SF shows $2.50, two.
  {
    id: "rate-places",
    kind: "places",
    expect: { bcy: 6, sf: 2 },
  },
  // --- A line type mapped to no activity, with a reason (D-800) --------------------------------------
  // At $0 a line reads No rate, except one whose type is "Included in" another activity (the pipe crew's
  // trench excavation in Pipe crew); "Price by hand" stays flagged until priced; a priced line never is.
  // Its notes: "Included in Pipe crew", "Price by hand", none without a reason.
  {
    id: "norate-reason",
    kind: "norate",
    expect: { plain: true, included: false, byHand: true, pricedByHand: false, includedNote: "Included in Pipe crew", byHandNote: "Price by hand", plainNote: null },
  },
  // --- Stitch sheets (D-804), worked by hand on 100 x 100 pt pages at 1 ft per pt ------------------------
  // Matching points: three points shifted 10 ft right fit with no turn and no miss. A chain A–B 0.3 ft, B–C
  // 0.4 ft: C's chain fit is 0.5 ft. The scale flag: a sheet at 1"=60.59' joined to one at 1"=60' over the
  // same ground implies a scale 0.974 % off; the 60.59' sheet, 0.98 % from the printed 60', is the likely one,
  // its factor 60/60.59. Recalibrating by 0.99: a 100 LF line to 99, a 1,000 SF area to 980.1, a count
  // unchanged: two quantities, the largest the area. A printed 50 ft that measures 50.5 ft is +1 % off.
  // Control points: a frame fitted with no turn at E 1000, N 5000 (international feet) puts N 4950,
  // E 1020 at 20 ft right, 50 ft down: (0.2, 0.5) on the 100 ft page.
  {
    id: "stitch-engine",
    kind: "stitch-engine",
    expect: { turn: 0, miss: 0, chainC: 0.5, flagPct: -0.974, likely: "source", factor: 0.99026, count: 2, largest: "Pad", after: 980.1, printedOff: 1, ctrlX: 0.2, ctrlY: 0.5 },
  },
  // --- Earthwork site choices (D-806), worked by hand, factors 1 -------------------------------------------
  // One region, 1,000 BCY cut and 500 CCY fill; the cut 700 BCY of a suitable layer L1 and 300 BCY of a rock layer
  // L2. As before (no choices): soil export 200 BCY, rock export 300, the cut "Cut". Rock re-used as fill and the
  // surplus stockpiled: the surplus is 500 BCY on a "Surplus soil, stockpiled on site" line, no rock export; dozer
  // push makes the cut line "Cut, dozer push" (role cut_push). "All suitable" with L2 unsuitable rather than rock:
  // no unsuitable export, a 500 BCY soil export.
  {
    id: "site-choices",
    kind: "site-choices",
    expect: { before: "cut|soil_export:200|soil_export:300", after: "cut_push|soil_stockpile:500", allSuitable: "cut|soil_export:500" },
  },
  // --- GPS Export for machines (D-805), worked by hand at 1"=60', international feet, flat ground at 100 ft ---------
  // Four points missing 0.3 ft each (0.005 in on paper, good), the fit taking +0.2 % of scale; typed elevations 102,
  // 102, 102, 102.2: the shift is +2.05 ft, the residuals -0.05, -0.05, -0.05, +0.15, inside half a 1 ft interval:
  // ready. Three points: not for machine use. A point missing 1.5 ft (0.025 in) stops naming it; a fit taking
  // 0.6 % of scale stops. The contours 98, 99, 100, 101, 103: the interval is 1 ft.
  {
    id: "machine-check",
    kind: "machine",
    expect: {
      ready: true, shift: 2.05, last: 0.15, three: "3 control points: a machine needs 4 or more", worst: "PC-2", scaleStop: true, interval: 1, onTin: 100,
      // D-808: +2.05 ft is over the 0.5 ft that asks first: asked, not ready, until confirmed; 1.7 ft lower (+0.35) is not asked.
      asks: "Control elevations differ from the model by 2.05 ft. Different vertical datum or wrong elevations?", askedReady: false, confirmed: true, small: null, smallReady: true,
    },
  },
  // --- GPS Export files (D-808) and the scale check on links already made (D-809) -------------------------------
  // A fit with no system typed: "Local, fitted to 4 control points". The LandXML keeps the project's em dash and reads
  // the surface's name back whole (its & and curly quotes too). DXF R12 text: the dash a hyphen, é an e, ± "+/-",
  // ° " deg", × "x", ½ after a digit " 1/2", ² "2", the quotes plain. Two sheets at 1"=60.59' and 1"=60', a match line across the
  // same places: the points imply -0.97 %, the 60.59' sheet likely off; the survey sheet at 1"=60' is not flagged.
  {
    id: "gps-d808",
    kind: "gps-d808",
    expect: { system: true, project: true, readBack: "Proposed grade – Café & “Pad”", dxf: 'C-200 - Cafe +/-2 deg x 3 1/2 m2 "A"', flags: "P3>P4:P3:-0.97" },
  },
  // --- Equipment › Cost components (D-775): one row per equipment across the project ---------------------
  // An excavator class priced on line A in "Place and compact" (1 unit, 8 EH, 1 day, $1,000) and as a shared
  // machine of that class spread over lines A and B (2 units, 3 days each, $300 + $200, 10 + 5 EH): one row,
  // "Excavator 20 t", 3 units (the shared machine's 2 once), 23 EH, 7 days, $1,500, its activity and its
  // spread under it. A typed Loader at a day rate on A ($200) and an hour rate on B ($50): one row, $250.
  {
    id: "equipment-once",
    kind: "equipment-once",
    expect: { top: "Excavator 20 t|Loader", count: 3, eh: 23, days: 7, total: 1500, inner: "Place and compact|Shared excavator (shared spread)", loader: 250 },
  },
  // --- Pricing rules 2 (D-763 B2): wastage is material's, by component; the rest on Qty × multiplier --------
  // The drywall sub-item, 1,600 SF, line wastage 10 %: sheets QTY/32 = 50 + 10 % = 55, rounded up to 1 →
  // 55 × $14 = $770; a crew of 2 at $40, 100 SF/hr: 16 hr × 2 = 32 MH on the NET 1,600 SF → $1,280. Item
  // $2,050. Under rules 1 (the saved lines' arithmetic, unchanged) the labour rides the wastage: 17.6 hr ×
  // 2 × $40 = $1,408, and the sheets 50 × 1.1 × $14 = $770.
  {
    id: "rules2-drywall",
    kind: "rules",
    quantity: 1600,
    input: rates({ wastage_pct_override: 10 }),
    components: [
      component("material", { name: "Drywall 4x8", qty_formula: "QTY/32", unit: "EA", unit_price: 14, round_to: 1 }),
      component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 40 }], production_rate: 100, production_basis: "units_per_hr" }),
    ],
    expect: { r1labor: 1408, r1material: 770, r2labor: 1280, r2mh: 32, r2material: 770, r2item: 2050, rows: 2050 },
  },
  // The same line × 2 (a folder multiplier): 55 sheets × 2 = 110 → $1,540; 64 MH → $2,560; the rows add
  // up to the line's $4,100.
  {
    id: "rules2-drywall-x2",
    kind: "rules",
    quantity: 1600,
    multiplier: 2,
    input: rates({ wastage_pct_override: 10 }),
    components: [
      component("material", { name: "Drywall 4x8", qty_formula: "QTY/32", unit: "EA", unit_price: 14, round_to: 1 }),
      component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 40 }], production_rate: 100, production_basis: "units_per_hr" }),
    ],
    expect: { r2labor: 2560, r2mh: 64, r2material: 1540, r2item: 4100, rows: 4100 },
  },
  // Rounding against the wastage: 1,000 SF / 32 = 31.25 sheets + 10 % = 34.375 → 35 sheets × $14 = $490.
  // A lump allowance (1 LS $500) takes no wastage (Q3): $500, so material $990. Typed Unit Equipment $2/SF
  // extends by the net 1,000 SF: $2,000 (rules 1: 1,100 SF → $2,200).
  {
    id: "rules2-round-lump-typed",
    kind: "rules",
    quantity: 1000,
    input: rates({ wastage_pct_override: 10, unit_equipment_cost: 2 }),
    components: [
      component("material", { name: "Drywall 4x8", qty_formula: "QTY/32", unit: "EA", unit_price: 14, round_to: 1 }),
      component("material", { name: "Allowance", pricing_mode: "lump", qty_formula: "1", unit: "LS", unit_price: 500 }),
    ],
    expect: { r2material: 990, r2equipment: 2000, r1equipment: 2200, rows: 990 },
  },
  // Wastage that differs by component reads "varies" (the founder's change): Board takes the line's 10 %,
  // Screws their own 5 %; Total Qty is then the net Qty × multiplier, 100.
  {
    id: "rules2-varies",
    kind: "rules",
    quantity: 100,
    input: rates({ wastage_pct_override: 10 }),
    components: [
      component("material", { name: "Board", unit_price: 3 }),
      component("material", { name: "Screws", unit_price: 0.5, wastage_pct: 5 }),
    ],
    expect: { varies: "Board: 10% · Screws: 5%", r2totalQty: 100, r2material: 382.5 },
  },
  // A parent's own components (D-764 B3): sub-items $400 of material, the parent's own labour on its own
  // 20 LF (2 Laborers at $40, 10 LF/hr: 2 hr × 2 = 4 MH, $160): the parent reads $560 under rules 2.
  {
    id: "rules2-parent-own",
    kind: "parent",
    parentQty: 20,
    parts: [{ quantity: 100, input: rates({ unit_material_cost: 2 }) }, { quantity: 50, input: rates({ unit_material_cost: 4 }) }],
    own: [component("labor", { crew: [{ role: "Laborer", count: 2, hourly_wage: 40 }], production_rate: 10, production_basis: "units_per_hr" })],
    expect: { children: 400, own: 160, parent: 560 },
  },
  // Nothing to divide by: no figure, never a division by zero.
  { id: "units-no-quantity", kind: "units", quantity: 0, components: [component("material", { pricing_mode: "lump", qty_formula: "1", unit_price: 500 })], expect: { unitMaterial: null, unitLabor: null } },
];
