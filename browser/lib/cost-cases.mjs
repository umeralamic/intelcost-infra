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
];
