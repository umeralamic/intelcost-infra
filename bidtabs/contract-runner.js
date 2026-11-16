async (page) => {
  // Bid-tab rebuild, one contract (D-1103, D-1165): the contract's pipe items as one throwaway estimate, every item at
  // its bid quantity, written as Calculate writes utility lines, pool on, so the pool works within the contract only.
  // Each item's unit price: its own lines (the engine's utilityLines for that item alone) at the unit cost each line
  // has in the whole contract's estimate. Run through the Playwright MCP (browser_run_code_unsafe, filename) on a
  // signed-in throwaway account, in a project of its own (one blank sheet, the project's wage set saved); no bid figure
  // lives here: the contract comes in through the context.
  //
  //   page.context().__ct = { workspace, project, sheet, pool?: 0 | 1 (default 1), contract: { key, items: [{ type, entry, nominal, depth, qty, median, restrainedPct? }] } }
  // Each item is built as a new run of its type (D-1260: the type's add-ons); `restrainedPct` (D-1261) restrains its
  // joints, 100 the whole line. `allowance: false` (D-1267 addendum) takes the item's pipe off its line's fittings
  // allowance (its contract pays fittings separately and its description does not include them); the parity check runs
  // on the engine as it stands, the switch is applied to the lines written.
  //   result pushed to page.context().__res: { key, missing, direct, items: [..., ours, labPerLF, eqPerLF, matPerLF, dispPerLF,
  //   subPerLF, byRole, unmatched] }. Each item's labour, equipment, material, disposal and subcontract are the Estimating
  //   table's own columns of its lines (D-1273: the bid overlay marks each up apart), never a split worked out here.
  // With `list` in place of `contract`, each in turn (one call; keep a call under the MCP's 30 minutes: ~2 min each).
  // D-1287 (Rerun 2, Plan B B2, B3): `waiverPct` sets the project's damage waiver (absent: the company's, 12 % unless set);
  // `rentalTaxPct` (the overlay config's `basis.equipmentRentalTaxPct`, 8.25 for Houston) taxes each line's rentals'
  // taxable part, which the Estimating row carries (`data-eq-taxable`, with `data-eq-waiver` and `data-eq-env`): the tax
  // is the contractor's cost (34 TAC §3.294(e)), so it joins the line's equipment and total; each item also reports its
  // taxable part, tax, waiver and environmental fee per LF so a rerun can say what each added. Absent: no tax.
  // Part 6 rerun (D-1283, the founder's rerun decisions of 2026-11-15; part6/DEPARTURES-AND-PRESETS.md §3): `section`, one
  // mode for the pass: "legacy" (every run as drawn before the section layers: `layers` taken off the run's section on both
  // paths), "a" (each type's own default, `auto`), "b" (the Houston section for water, force main, sanitary and storm
  // through the project's settings, in the page only: never stored on a run, never written to the api). Absent: "legacy".
  // The project's state is Texas in every mode (the throwaway is Harris County; 30 TAC on the Texas sanitary items).
  // D-1291 R43 (the founder, 12:40 UTC): "boxed walls" and "paved" are set apart. `paved` (default true): a marked run
  // is the app's "Limited width / in street" (boxed by Auto and paved, as below); with `paved: false` it stays unpaved
  // (limited_width off, so `runMaterials` keeps the open-site materials) and takes the run's own "Box" pick
  // (`run.protection`, `protection.ts:protectionAt`) wherever Auto on a limited-width run would box it (deeper than
  // 4.5 ft; a shallower run stays on Auto, vertical, as it would limited), so its walls are the paved pass's. A crossing
  // run unpaved takes the Box pick outright. Each item's material $ is split by key (the api's components, by line name;
  // `matByKeyPerLF`), so the report can revert a key's price without another pass.
  // D-1291 (the boxed basis, option (c); R11): `limitedWidth` = "items" marks each item's run limited width as its input
  // says (`it.limitedWidth`, a boolean every item must carry, with `it.limitedWhy`; street-marking.mjs writes both), true
  // marks every run, absent none (as before). A limited-width run is the app's "Limited width / in street": Auto boxes it
  // over 4.5 ft (D-1285 Q7) and the run is paved (`calculate.ts:runMaterials`: the preset's paved final backfill to 12 in
  // below the surface, the cap the restoration's, none here), on both paths and on crossing runs; the box is the
  // project's (`trench.ts:boxFor`), as Calculate picks it. `jurisdiction` (D-1289 Q2: "city_of_houston", "harris_county",
  // "other") is set on the page's settings only, never written. In mode "b" the runner first checks that step 1's app
  // part has landed (Q2's County rule, Q4, Q5: `step1Probe` below) and refuses to price until it has (`requireStep1`,
  // default true in "b"). `cssPrice` = { matKey, unitPrice, basis: "national" | "local" } (pass (b′)) sets the project's
  // own price for that key on the throwaway (a project price, never the library), national × the factor the library
  // price takes there; with no `cssPrice` a price the harness set is taken off again. Each contract reports its CSS
  // tonnage, price and order tier (`css`).
  const ct = page.context().__ct;
  const out = [];
  for (const contract of ct.list ?? [ct.contract]) out.push(await priceOne(contract));
  return out;

  async function priceOne(contract) {
  const { workspace: W, project: P, sheet: S } = ct;
  const API = "http://localhost:8000";
  await page.goto(`http://localhost:5173/project/${P}/takeoff/${S}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(localStorage.getItem("intelcost.session")), null, { timeout: 60000 });
  const own = await page.evaluate(
    async ({ W, P, S, API, contract, pool, parityOnly, mode, waiver, limitedMode, paved, jurisdiction, requireStep1, cssPrice }) => {
      const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const h = { authorization: `Bearer ${s.accessToken}`, "content-type": "application/json" };
      const tr = await import("/src/lib/takeoff/earthwork/utilities/trench.ts");
      const cat = await import("/src/lib/takeoff/earthwork/utilities/catalog.ts");
      const q = await import("/src/lib/takeoff/earthwork/utilities/quantities.ts");
      const ln = await import("/src/lib/takeoff/earthwork/utilities/lines.ts");
      const mt = await import("/src/lib/takeoff/earthwork/utilities/materials.ts");
      const calc = await import("/src/features/takeoff/earthwork/utilities/calculate.ts");
      const ty = await import("/src/lib/takeoff/earthwork/utilities/types.ts");
      const rd = await import("/src/features/takeoff/earthwork/utilities/runDefaults.ts");
      // A run's own options as a new run of its type stores them (D-1260: its add-ons), and D-1261's restrained joints
      // where the item names them (`restrainedPct`, the harness's input; absent off).
      // Part 6 rerun: in "legacy" mode the run's section has no `layers` (a run drawn before), else the new run's own.
      const noLayers = (sec) => {
        if (mode !== "legacy" || !sec) return sec ?? {};
        const { layers: _l, ...rest } = sec;
        return rest;
      };
      const sectionOf = (it) => ({ ...noLayers(rd.defaultRun(it.type).section), ...(it.restrainedPct ? { restrained_pct: it.restrainedPct } : {}) });
      await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/equipment-library/override`, { method: "PUT", headers: h, body: JSON.stringify({ entity: "setting", entity_key: "equipment_pool", field: "value", value_num: pool, value_text: null }) });
      // D-1287: the damage waiver for the pass (Q13: 12 %), as the project's own setting; 0 is "Own insurance".
      if (waiver != null) await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/equipment-library/override`, { method: "PUT", headers: h, body: JSON.stringify({ entity: "setting", entity_key: "damage_waiver_pct", field: "value", value_num: waiver, value_text: waiver === 0 ? "zero-ok" : null }) });
      // The project's utility settings, as Calculate reads them: the depth ranges a line is named and paced by come from
      // here (the app's default 0-6, 6-8 ... 14-16, 16+), never a list of the harness's own (D-1211).
      const ua = await import("/src/features/takeoff/earthwork/utilities/api.ts");
      const util = await (await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/utilities`, { headers: h })).json();
      const settings = ua.settingsOf(util.settings ?? null, util.company_embedment);
      // Part 6 rerun: the state Calculate reads from the project (never saved with the settings), and (b)'s presets.
      settings.projectState = "TX";
      if (mode === "b") settings.sectionPresets = { water: "houston_css", force_main: "houston_css", sanitary: "houston_css", storm: "houston_css" };
      // D-1291: the jurisdiction the Houston preset follows (Q2), in the page only; what the api holds is recorded beside it.
      if (jurisdiction) settings.jurisdiction = jurisdiction;
      const ran = { mode, projectState: settings.projectState, sectionPresets: settings.sectionPresets ?? null, flexible: settings.flexibleEmbedment ?? settings.companyEmbedment?.flexible ?? null, pressure: settings.pressureEmbedment ?? settings.companyEmbedment?.pressure ?? null, backfill: settings.backfill?.name ?? null, jurisdiction: settings.jurisdiction ?? null, jurisdictionStored: util.settings?.jurisdiction ?? null, limitedWidth: limitedMode ?? null, paved: limitedMode ? paved : null, boxes: (settings.boxes ?? []).length };
      // D-1291 (R11): a run's limited-width mark. In "items" mode every item carries its own (street-marking.mjs); one
      // without is refused, never guessed.
      const unmarked = limitedMode === "items" ? contract.items.filter((it) => typeof it.limitedWidth !== "boolean").map((it) => `${it.entry}:${it.nominal} ${it.qty} LF`) : [];
      if (unmarked.length > 0) return { put: 0, putText: "", missing: [], unpriceable: [], ownLines: [], parity: [], ran, unmarked };
      const limitedOf = (it) => (limitedMode === "items" ? it.limitedWidth === true : limitedMode === true);
      // D-1291: step 1's app part (D-1289 Q2, Q4, Q5), read from the app's own section code on paved (limited-width) runs:
      // Q2, Harris County: CSS to the subgrade on a 24 in RCP, not on a 60 in one (54 in and up: select or native);
      // Q4, Houston water under pavement on bank sand, not CSS; Q5, Houston HDPE storm: flowable fill under pavement and
      // CSS outside it. Each check names what it found; the pass (b) waits until all three hold.
      const step1Probe = () => {
        const layeredOf = (type, key, lw) => {
          const pp = cat.resolvePipe(key);
          if (!pp || pp.od == null) return null;
          const stub = { section: rd.defaultRun(type).section, catalog_key: key, pipes: 1, pipe_gap_in: 0, restoration: null, limited_width: lw, utility_type: type };
          return calc.runLayered(stub, type, { od: pp.od, id: pp.id ?? pp.od - 2 * (pp.wall ?? 0) }, settings, calc.runMaterials(stub, settings)).layered;
        };
        const names = (L) => (L ? [...L.normal.bands.map((b) => `${b.key} ${b.material.name}`), `final ${L.normal.final.material.name}`] : ["no layered section"]);
        const final = (L) => L?.normal.final.material.name ?? "";
        const CSS = /cement/i;
        const FLOW = /flowable|clsm/i;
        const r24 = layeredOf("storm", "rcp_c76_wall_b:24", true);
        const r60 = layeredOf("storm", "rcp_c76_wall_b:60", true);
        const w8 = layeredOf("water", "pvc_c900_dr18:8", true);
        const hPaved = layeredOf("storm", "hdpe_f2648_dual_wall:24", true);
        const hOpen = layeredOf("storm", "hdpe_f2648_dual_wall:24", false);
        const checks = [
          { q: "Q2", ok: settings.jurisdiction === "harris_county" && CSS.test(final(r24)) && !CSS.test(final(r60)), found: `jurisdiction ${settings.jurisdiction ?? "none"}; 24 in RCP paved: ${names(r24).join(", ")}; 60 in RCP paved: ${names(r60).join(", ")}` },
          { q: "Q4", ok: Boolean(w8) && !CSS.test(final(w8)), found: `8 in water paved: ${names(w8).join(", ")}` },
          { q: "Q5", ok: names(hPaved).some((n) => FLOW.test(n)) && names(hOpen).some((n) => CSS.test(n)), found: `24 in HDPE storm paved: ${names(hPaved).join(", ")}; unpaved: ${names(hOpen).join(", ")}` },
        ];
        return { ok: checks.every((c) => c.ok), checks };
      };
      if (mode === "b") {
        ran.step1 = step1Probe();
        if (requireStep1 && !ran.step1.ok) return { put: 0, putText: "", missing: [], unpriceable: [], ownLines: [], parity: [], ran, waiting: ran.step1.checks.filter((c) => !c.ok) };
      }
      // D-1291 (b′): the project's own price for the CSS key, set (or taken off) before any line is written, so the lines
      // price at it. A project price is used as it is (no location factor, no order tier: `materials/service.py:
      // resolve_many`, `tiers.py:apply`), so a national figure takes the factor the library price takes here; the tier
      // is reported per contract (`css`) for the report to read. Only a price this harness set is ever taken off, in every
      // pass, so a pass after (b′) on the same throwaway prices at the library again.
      const PRICE_NOTE = "bid-tab harness (D-1291 pass b′), a sensitivity on a throwaway; never the library";
      const PRICES = `${API}/api/workspace/${W}/project/${P}/estimate/material-prices`;
      // A dry parity check writes nothing.
      if (!parityOnly) {
        const key = cssPrice?.matKey ?? "stone:cement_stabilized_sand";
        const listed = await (await fetch(PRICES, { headers: h })).json();
        const had = (Array.isArray(listed) ? listed : []).filter((x) => x.mat_key === key);
        const theirs = had.filter((x) => x.note !== PRICE_NOTE);
        if (theirs.length > 0) return { put: 0, putText: "", missing: [], unpriceable: [], ownLines: [], parity: [], ran, waiting: [{ q: "price", ok: false, found: `the project has its own price on ${key} (${theirs[0].unit_price} / ${theirs[0].sell_unit}), not the harness's: take it off first` }] };
        for (const x of had) await fetch(`${PRICES}/${x.uuid}`, { method: "DELETE", headers: h });
        const lib = await (await fetch(`${PRICES}/resolve?mat_key=${encodeURIComponent(key)}`, { headers: h })).json();
        ran.cssLibrary = { key, unitPrice: lib.unit_price ?? null, sellUnit: lib.sell_unit ?? null, source: lib.source ?? null, factor: lib.factor ?? null, location: lib.location ?? null, grade: lib.grade ?? null };
        if (cssPrice) {
          const factor = cssPrice.basis === "local" ? 1 : (lib.factor ?? 1);
          const unitPrice = Math.round(cssPrice.unitPrice * factor * 10000) / 10000;
          const saved = await fetch(PRICES, { method: "POST", headers: h, body: JSON.stringify({ mat_key: key, name: "Cement-stabilized sand (bid-tab sensitivity)", unit_price: unitPrice, sell_unit: cssPrice.sellUnit ?? lib.sell_unit ?? "TON", note: PRICE_NOTE }) });
          if (!saved.ok) return { put: saved.status, putText: (await saved.text()).slice(0, 300), missing: [], unpriceable: [], ownLines: [], parity: [], ran };
          ran.cssPrice = { key, given: cssPrice.unitPrice, basis: cssPrice.basis ?? "national", factor, unitPrice, sellUnit: cssPrice.sellUnit ?? lib.sell_unit ?? "TON" };
        }
      }
      // Part 6 rerun: a run's trench per LF (CY/LF): excavation, the bedding and pipe zone bought (imported), the backfill
      // (and the part of it bought), and the stack's title.
      // D-1291: and the walls the run took (each piece's method, by LF), its limited-width mark, the backfill bought by name.
      const perLf = (r, L, title, limited = false, pavedRun = false, protection = "auto") => {
        const imp = (zones) => (r.byMaterial ?? []).filter((m) => zones.includes(m.zone) && m.source === "imported").reduce((t, m) => t + m.cf, 0);
        const walls = {};
        for (const pc of r.pieces ?? []) walls[pc.method] = (walls[pc.method] ?? 0) + (pc.s1 - pc.s0);
        const bought = [...new Set((r.byMaterial ?? []).filter((m) => m.zone === "backfill" && m.source === "imported").map((m) => m.name))].join(", ");
        return { excCYLF: r.excavationCF / 27 / L, impEmbCYLF: imp(["bedding", "zone", "foundation"]) / 27 / L, backfillCYLF: r.backfillCF / 27 / L, impBackfillCYLF: imp(["backfill"]) / 27 / L, title, limited, paved: pavedRun, protection, walls: Object.keys(walls).length > 0 ? walls : null, backfillBought: bought || null };
      };
      const CLAY_B = { layerId: null, name: "Clay", group: "clay", uscs: "CH", osha: "B", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1, depth: null };
      // D-1277: a contract of crossings (each item a run with a `crossing`, D-1269's `section.crossing`) is built by the
      // app's own Calculate, which works a crossing's stretch, its casing and its pits; there is no harness copy of it
      // to check, so no parity step. Each item is a run of its own on a blank sheet, the runs far apart (no overlap, no
      // tee); a jack and bore gets its Bore pit and Receiving pit at the run's two ends, linked to it (`spec.run`), with
      // the item's `pits` choice (`bySub`, `backfill`). The contract's lines are Calculate's over all of them; each
      // item's own lines are Calculate's over that item alone, and the two must add up line by line (`interaction`).
      //   item: { type, entry, nominal, depth (gravity), qty (the run's LF), restrainedPct?, crossing: {kind, lf?, casing_in?,
      //           casing_by?, grout?, restrain?, arema?, hdd_casing?}, pits?: { bySub, backfill? } }
      if (contract.items.some((it) => it.crossing)) {
        const n = contract.items.length;
        const maxLf = Math.max(...contract.items.map((it) => it.qty));
        const Fft = Math.max(4 * maxLf, 100 * (n + 1));
        const frame = { widthPt: 1000, heightPt: 1000, feetPerNorm: Fft / 1000 };
        const clayX = { uuid: "x-clay", name: "Clay", soil_group: "clay", uscs: "CH", osha_type: "B", unsuitable: false, reuse_backfill: true, shrink_factor: 1.1, swell_factor: 1.3, interpolate: "depth", position: 0, used_by: ["B-1"] };
        const geoX = { data: { water_buffer_ft: 0, slope_rule: null, layers: [clayX], bores: [] }, model: { bottoms: [], points: [], clamps: [], water: null, notes: [], logged: [true] }, placed: [{ bore: { caving_observed: false, cave_in_depth_ft: null }, at: [0.5, 0.02], ground: 100, from: null }] };
        const missingX = [];
        const parts = contract.items.map((it, i) => {
          const pipeKey = `${it.entry}:${it.nominal}`;
          const p = cat.resolvePipe(pipeKey);
          const pick = cat.catalogPick(pipeKey);
          if (!p || p.od == null || !pick) {
            missingX.push(pipeKey);
            return null;
          }
          const pressure = ["water", "fire_water", "force_main"].includes(it.type);
          const id = p.id ?? p.od - 2 * (p.wall ?? 0);
          const inv = 100 - (it.depth ?? 0) + (p.od - id) / 2 / 12 + 0.5;
          const y = (i + 1) / (n + 1);
          const x0 = 0.05;
          const x1 = x0 + it.qty / Fft;
          const itemUuid = `x-item-${i}`;
          const base = rd.defaultRun(it.type);
          const run = { ...base, section: { ...noLayers(base.section), ...(it.restrainedPct ? { restrained_pct: it.restrainedPct } : {}), crossing: it.crossing }, catalog_key: pipeKey, material: pick.entry.material, pipe_class: pick.entry.pipeClass, nominal_in: pick.size.nominalIn, od_in: p.od, id_in: p.id, start_ground_ft: 100, end_ground_ft: 100, ...(pressure ? {} : { start_invert_ft: inv, end_invert_ft: inv }), limited_width: limitedOf(it) && paved, ...(limitedOf(it) && !paved ? { protection: "box" } : {}), uuid: `x-run-${i}`, item_uuid: itemUuid, sheet_uuid: S };
          const items = [{ uuid: itemUuid, name: `X${i + 1} ${it.nominal}" ${pick.entry.material}`, geometries: [{ sheet_uuid: S, role: "add", vertices_json: [[x0, y], [x1, y]], shape_meta: null }] }];
          const structures = [];
          if (it.crossing.kind === "jack_bore" && it.pits) {
            for (const [type, x] of [["bore_pit", x0], ["receiving_pit", x1]]) {
              const sUuid = `x-${type}-${i}`;
              items.push({ uuid: sUuid, name: `X${i + 1} ${type === "bore_pit" ? "BP" : "RP"}`, geometries: [{ sheet_uuid: S, role: "add", vertices_json: [[x, y]], shape_meta: null }] });
              structures.push({ ...rd.defaultStructure(type, it.type), spec: { bySub: Boolean(it.pits.bySub), backfill: it.pits.backfill === "css" ? "css" : "native", pumpDays: null, run: itemUuid }, uuid: sUuid, item_uuid: sUuid, sheet_uuid: S });
            }
          }
          return { run, items, structures };
        });
        const calcOf = (ps) => calc.calculateUtilities({ runs: ps.map((x) => x.run), items: ps.flatMap((x) => x.items), structures: ps.flatMap((x) => x.structures), sheetUuid: S, settings, geo: geoX, frame, eg: null, fg: null, features: [], projectShrink: 1.1, projectSwell: 1.3 });
        const ownX = [];
        const notes = [];
        parts.forEach((x, i) => {
          if (!x) {
            ownX.push(null);
            notes.push(null);
            return;
          }
          const one = calcOf([x]);
          const type = contract.items[i].type;
          ownX.push((one?.lines ?? []).map((l) => ({ type, name: l.name, regionId: l.regionId, role: l.role, variant: l.variant, qty: l.quantity, unit: l.unit })));
          const r0 = one?.stored?.runs?.[0];
          const sectionNote = (r0?.notes ?? []).find((n) => n.startsWith("Section: ")) ?? null;
          notes.push({ run: r0 ? { notes: r0.notes, flags: r0.flags } : null, skipped: one?.stored?.skipped ?? [], structures: (one?.stored?.structures ?? []).map((s) => ({ name: s.name, type: s.structureType, h: s.pit?.h ?? null, method: s.pit?.method ?? null, flags: s.flags })), trace: r0 ? { ...perLf(r0.q, contract.items[i].qty, sectionNote, limitedOf(contract.items[i]), limitedOf(contract.items[i]) && paved, limitedOf(contract.items[i]) && !paved ? "box" : "auto"), gapCF: r0.q.sectionCheck?.gapCF ?? null } : null });
        });
        const allX = calcOf(parts.filter(Boolean));
        const linesX = allX?.lines ?? [];
        // The contract's lines against the sum of the items' own, line by line: any difference is an interaction
        // between the runs (an overlap, a tee, a shared pit) and is returned.
        // A line is keyed by its region, role and variant, as the api keys it (its name may differ: two pits' pump
        // lines share a variant and the contract's line takes the first one's "6 days"); each own line takes the
        // contract line's name, so the table finds it, and keeps its own as `ownName`.
        const lk = (l) => `${l.regionId}|${l.role}|${l.variant}`;
        const sumOwn = new Map();
        for (const own of ownX) for (const l of own ?? []) sumOwn.set(lk(l), (sumOwn.get(lk(l)) ?? 0) + l.qty);
        const nameAt = new Map(linesX.map((l) => [lk(l), l.name]));
        for (const own of ownX) for (const l of own ?? []) if (nameAt.has(lk(l)) && nameAt.get(lk(l)) !== l.name) Object.assign(l, { ownName: l.name, name: nameAt.get(lk(l)) });
        const interaction = [];
        for (const l of linesX) {
          const k = lk(l);
          if (Math.abs((sumOwn.get(k) ?? 0) - l.quantity) > 1e-6) interaction.push(`${l.name}: ${l.quantity} vs own ${sumOwn.get(k) ?? 0}`);
          sumOwn.delete(k);
        }
        for (const [k, v] of sumOwn) if (Math.abs(v) > 1e-9) interaction.push(`${k}: own ${v}, not in the contract's lines`);
        if (interaction.length > 0 || parityOnly) return { put: 0, putText: "", missing: missingX, unpriceable: [], ownLines: ownX, parity: [], interaction, notes, ran };
        const result = { ok: true, cutCY: 0, fillCY: 0, netCY: 0, units: "CY", prisms: [], boundarySF: 0, coveredSF: 0, warnings: [], strip: null, regions: [] };
        const put = await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/result/${S}`, { method: "PUT", headers: h, body: JSON.stringify({ version_key: `bidtab:${contract.key}`, result, lines: calc.lineWrites(linesX) }) });
        return { put: put.status, putText: put.ok ? "" : (await put.text()).slice(0, 300), missing: missingX, unpriceable: [], ownLines: ownX, parity: [], interaction: [], notes, crossing: true, ran };
      }
      const forLines = [];
      const inverts = [];
      const missing = [];
      // An item the input marks `unpriceable` (D-1271: a pay item with no catalog family, a box culvert) is skipped and
      // listed, never priced as something it is not; any other field an input item carries (`mapping`, `depthNote`,
      // `tabItem`, `medianAll`, ...) is a note the runner does not read.
      const unpriceable = [];
      const trace = [];
      const protOf = [];
      for (const it of contract.items) {
        if (it.unpriceable) {
          unpriceable.push(`${it.entry}:${it.nominal} ${it.qty} LF (${it.unpriceable})`);
          forLines.push(null);
          continue;
        }
        const pipeKey = `${it.entry}:${it.nominal}`;
        const p = cat.resolvePipe(pipeKey);
        if (!p || p.od == null) {
          missing.push(pipeKey);
          forLines.push(null);
          continue;
        }
        const id = p.id ?? p.od - 2 * (p.wall ?? 0);
        const drop = (p.od - id) / 2 / 12;
        const pressure = ["water", "fire_water", "force_main"].includes(it.type);
        // A pressure main at 4 ft of cover; a gravity line at the depth its tab names (its band's middle).
        // Not rounded: the app lays a main at its cover exactly (D-1211's parity check).
        const depth = pressure ? 4 + p.od / 12 + 0.5 : it.depth;
        const sec = pressure ? { sideClearanceIn: 6, minWidthIn: 18 } : { sideClearanceIn: 12, minWidthIn: 24 };
        // The app's own default embedment by its own names, so each prices by its key (D-1167): the run's default
        // (D-1100, D-1101: a pressure main on sand, flexible gravity pipe with #57 stone through the zone) over the
        // project's (the api's: #57 stone bedding, sand zone), which is rigid pipe's (RCP). A name typed here ("Bank
        // sand") found no price and read as $0; stone through an RCP zone over-specified it (D-1168).
        const dflt = mt.embedmentDefault(it.type, pipeKey, {});
        const pick = (choice, name) => (choice ? { name: mt.ZONE_CHOICES[choice].name, source: mt.ZONE_CHOICES[choice].source } : { name, source: "imported" });
        const emb = { bedding: pick(dflt?.bedding, "#57 stone"), zone: pick(dflt?.zone, "Sand") };
        const L = it.qty;
        inverts[forLines.length] = 100 - depth + drop + 0.5;
        const knot = (i) => ({ s: i === 0 ? 0 : L, G: 100, invert: 100 - depth + drop + 0.5, bottoms: [-1e6], water: null, caving: false, caveInFt: null });
        // Part 6 rerun: the app's layered section for the run as a new run of its type stores it (`calculate.ts:runLayered`,
        // the project's settings and state); null in "legacy" mode (no `layers`), and the call is today's byte for byte. With
        // it the engine takes the width and the bottom from the stack, the materials from its bands; the invert stays.
        // D-1291: a limited-width run as Calculate builds it (`calculate.ts`): paved, so the final backfill is the preset's
        // paved material (or the project's paved CSS) to the cap, and the box the project's for the bottom width. An
        // unmarked run is built byte for byte as before.
        const lw = limitedOf(it);
        const pv = lw && paved;
        const stub = { section: sectionOf(it), catalog_key: pipeKey, pipes: 1, pipe_gap_in: 0, restoration: null, limited_width: pv, utility_type: it.type };
        const runMats = calc.runMaterials(stub, settings);
        const { layered } = calc.runLayered(stub, it.type, { od: p.od, id }, settings, runMats);
        const bf = pv ? { name: runMats.backfill.name, source: runMats.backfill.source } : { name: "Native", source: "native" };
        const boxed = lw ? (() => {
          const Pw = layered ? layered.pipeWidthFt : tr.pipeWidthFt(p.od, 1, 0, sec.sideClearanceIn, sec.minWidthIn);
          const box = tr.boxFor(Pw, settings.boxes ?? [], { boxRef: null, boxOutsideFt: null });
          return { box, boxNoFit: (settings.boxes ?? []).length > 0 && box === null, pavedCapIn: runMats.pavedCapIn };
        })() : { box: null };
        const input = (protection, limitedWidth) => ({ knots: [knot(0), knot(1)], layers: [CLAY_B], noBores: false, pipe: { odIn: p.od, idIn: id, pipes: 1, gapIn: 0 }, section: { ...sec, beddingIn: 6, zoneAboveCrownIn: 12 }, bucket: "auto", ...boxed, specMaxIn: null, protection, limitedWidth, rule: null, depthRangesFt: settings.depthRangesFt, rangeUnit: "ft", materials: { bedding: "imported", zone: "imported", backfill: bf.source }, materialNames: { bedding: emb.bedding.name, zone: emb.zone.name, backfill: bf.name }, segments: [], restoration: null, ...(layered ? { layered } : {}) });
        // R43: boxed and unpaved, the run's own Box pick where Auto would box it limited width (its walls only are read).
        const prot = lw && !paved && q.runQuantities(input("auto", true)).pieces.some((pc) => pc.method === "box") ? "box" : "auto";
        protOf[forLines.length] = prot;
        const r = q.runQuantities(input(prot, pv));
        trace[forLines.length] = perLf(r, L, layered ? layered.stack.title : "legacy", lw, pv, prot);
        // The line's name as the app writes it ("8\" PVC C900 DR 18"), so the harness's lines are the app's (D-1211).
        const named = cat.catalogPick(pipeKey);
        const pipeLabel = `${it.nominal}" ${named?.entry.material || "Pipe"}${named?.entry.pipeClass ? ` ${named.entry.pipeClass}` : ""}`.replace(/ Pipe$/, "");
        // As Calculate hands a run on (D-1260, D-1261): its production, install, add-ons and restrained joints.
        const o = ty.runOptions(it.type, sectionOf(it), p.od);
        const runLf = r.pipeLF.reduce((t, b) => t + b.lf, 0);
        forLines.push({
          type: it.type,
          pipeLabel,
          pipeKey,
          pipes: 1,
          q: r,
          swell: [1.3],
          materials: { ...emb, backfill: bf },
          restoration: null,
          siteCondition: null,
          services: [],
          bends: [],
          tees: 0,
          short: o.production === "short",
          install: o.install,
          encasement: o.encasement,
          pipeOptions: { addons: o.addons, buyPipe: o.install !== "none", encasementCy: null, crossing: ty.typeDef(it.type).group === "crossing" },
          connection: o.connection ? { kind: o.connection, sizeIn: Number(it.nominal) } : null,
          restrained: mt.restrainedJoints(pipeKey, o.restrainedPct, runLf, 1),
        });
      }
      // The parity check (D-1211): each item built again as the app builds it, a run with the app's defaults for the
      // pipe picked (`defaultRun`, the catalogue's material and class, inverts typed for a gravity line, a pressure main
      // at the company's cover), the same clay logged at one bore, worked out by Calculate's own `calculateUtilities` on
      // the project's utility settings. The two must give the same lines, names, quantities and materials; any
      // difference is returned and the contract is not priced.
      const clay = { uuid: "parity-clay", name: "Clay", soil_group: "clay", uscs: "CH", osha_type: "B", unsuitable: false, reuse_backfill: true, shrink_factor: 1.1, swell_factor: 1.3, interpolate: "depth", position: 0, used_by: ["B-1"] };
      const geo = { data: { water_buffer_ft: 0, slope_rule: null, layers: [clay], bores: [] }, model: { bottoms: [], points: [], clamps: [], water: null, notes: [], logged: [true] }, placed: [{ bore: { caving_observed: false, cave_in_depth_ft: null }, at: [0.5, 0.5], ground: 100, from: null }] };
      const sig = (lines) =>
        lines
          .map((l) => ({ role: l.role, name: l.name, unit: l.unit, qty: Math.round(l.quantity * 1000) / 1000, mats: (l.materials ?? []).map((m) => `${m.key}=${m.qty} ${m.unit}`).join("; ") }))
          .sort((a, b) => `${a.role}|${a.name}`.localeCompare(`${b.role}|${b.name}`));
      const parity = [];
      const coverFlags = [];
      // Part 6 rerun: every run's own section flags from Calculate (30 TAC below the rule, a stack that could not be read).
      const sectionFlags = [];
      contract.items.forEach((it, i) => {
        const f = forLines[i];
        if (!f) return;
        const pick = cat.catalogPick(f.pipeKey);
        const pressure = ["water", "fire_water", "force_main"].includes(it.type);
        const inv = inverts[i];
        const run = { ...rd.defaultRun(it.type), section: sectionOf(it), catalog_key: f.pipeKey, material: pick.entry.material, pipe_class: pick.entry.pipeClass, nominal_in: pick.size.nominalIn, od_in: cat.resolvePipe(f.pipeKey).od, id_in: cat.resolvePipe(f.pipeKey).id, start_ground_ft: 100, end_ground_ft: 100, ...(pressure ? {} : { start_invert_ft: inv, end_invert_ft: inv }), limited_width: limitedOf(it) && paved, protection: protOf[i] ?? "auto", uuid: `parity-run-${i}`, item_uuid: `parity-item-${i}`, sheet_uuid: S };
        const item = { uuid: `parity-item-${i}`, name: f.pipeLabel, geometries: [{ sheet_uuid: S, role: "add", vertices_json: [[0.25, 0.5], [0.75, 0.5]], shape_meta: null }] };
        const app = calc.calculateUtilities({ runs: [run], items: [item], sheetUuid: S, settings, geo, frame: { widthPt: 1000, heightPt: 1000, feetPerNorm: (2 * it.qty) / 1000 }, eg: null, fg: null, features: [], projectShrink: 1.1, projectSwell: 1.3 });
        const ours = sig(ln.utilityLines([f]).map((l) => ({ ...l, materials: mt.lineMaterials(l, () => null, "restraint", {}) })));
        const theirs = sig(app?.lines ?? []);
        const a = JSON.stringify(ours);
        const b = JSON.stringify(theirs);
        if (a !== b) parity.push({ item: i, pipe: f.pipeKey, type: it.type, depth: it.depth, qty: it.qty, harness: ours, app: theirs, skipped: app?.stored?.skipped ?? null });
        // D-1275: Calculate's cover flags on the item (its crown above the ground, or under its type's minimum cover).
        for (const run of app?.stored?.runs ?? []) for (const fl of run.flags ?? []) if (fl.startsWith("Cover over the crown")) coverFlags.push(`${f.pipeKey} ${it.depth} ft: ${fl}`);
        for (const run of app?.stored?.runs ?? []) for (const fl of run.flags ?? []) if (fl.startsWith("Below 30 TAC") || fl.startsWith("The run's section layers could not be read")) sectionFlags.push(`${f.pipeKey} ${it.depth} ft: ${fl}`);
      });
      if (parity.length > 0 || parityOnly) return { put: 0, putText: "", missing, unpriceable, ownLines: [], parity, coverFlags, ran, trace };
      const all = forLines.filter(Boolean);
      // D-1267 addendum: each pipe line's allowance LF is the sum of its items' own, an item switched off giving none.
      const keyOf = (l) => `${l.regionId}|${l.role}|${l.variant}`;
      const allowed = new Map();
      forLines.forEach((f, i) => {
        if (!f) return;
        for (const l of ln.utilityLines([f])) if (l.role === "utility_pipe") allowed.set(keyOf(l), (allowed.get(keyOf(l)) ?? 0) + (contract.items[i].allowance === false ? 0 : (l.allowanceLf ?? l.quantity)));
      });
      const lines = ln
        .utilityLines(all)
        .map((l) => (l.role === "utility_pipe" && allowed.has(keyOf(l)) ? { ...l, allowanceLf: allowed.get(keyOf(l)) } : l))
        .map((l) => ({ ...l, materials: mt.lineMaterials(l, () => null, "restraint", {}) }));
      // A zero Calculate result holds the lines (the sheet has no drawing).
      const result = { ok: true, cutCY: 0, fillCY: 0, netCY: 0, units: "CY", prisms: [], boundarySF: 0, coveredSF: 0, warnings: [], strip: null, regions: [] };
      const put = await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/result/${S}`, { method: "PUT", headers: h, body: JSON.stringify({ version_key: `bidtab:${contract.key}`, result, lines: calc.lineWrites(lines) }) });
      // Each item's own lines: the engine run on that item alone (D-938's own lines).
      const ownLines = forLines.map((f) => (f ? ln.utilityLines([f]).map((l) => ({ type: f.type, name: l.name, role: l.role, qty: l.quantity })) : null));
      return { put: put.status, putText: put.ok ? "" : (await put.text()).slice(0, 300), missing, unpriceable, ownLines, parity, coverFlags, ran, trace, sectionFlags };
    },
    { W, P, S, API, contract, pool: ct.pool ?? 1, parityOnly: Boolean(ct.parityOnly || contract.parityOnly), mode: ct.section ?? "legacy", waiver: ct.waiverPct ?? null, limitedMode: ct.limitedWidth ?? null, paved: ct.paved ?? true, jurisdiction: ct.jurisdiction ?? null, requireStep1: ct.requireStep1 ?? ct.section === "b", cssPrice: ct.cssPrice ?? null },
  );
  if (own.put >= 300) return { key: contract.key, error: `PUT ${own.put}: ${own.putText}` };
  // D-1291: refused before any line was written: an item with no limited-width mark, or (pass b) step 1's app part not
  // in yet, or a CSS price on the project that is not the harness's. Each says what it found.
  if (own.unmarked?.length > 0) return { key: contract.key, error: `${own.unmarked.length} item(s) without a limited-width mark (run street-marking.mjs): ${own.unmarked.slice(0, 3).join("; ")}` };
  if (own.waiting?.length > 0) return { key: contract.key, error: `waiting: ${own.waiting.map((c) => `${c.q} (${c.found})`).join(" | ")}`, waiting: own.waiting, section: own.ran ?? null };
  if (own.interaction?.length > 0) return { key: contract.key, interaction: own.interaction.slice(0, 5), notes: own.notes };
  // A dry check of a crossing contract (`parityOnly`): its own lines and notes, nothing written.
  if (own.put === 0 && own.notes) return { key: contract.key, dry: true, missing: own.missing, notes: own.notes, ownLines: own.ownLines };
  // Not priced when the harness and the app build an item differently (D-1211), or when only the check was asked for.
  if (own.parity.length > 0 || own.put === 0) {
    (page.context().__parity ??= []).push({ key: contract.key, parity: own.parity });
    // A short answer (the MCP prints it): each differing line's role and the two quantities; the rest in __parity.
    const brief = (d) => d && d.harness.flatMap((h, j) => { const a = d.app[j]; return !a || JSON.stringify(h) !== JSON.stringify(a) ? [`${d.pipe} ${h.role}: ${h.name} ${h.qty} vs ${a ? `${a.name} ${a.qty}` : "none"}`] : []; });
    return { key: contract.key, parityDiffs: own.parity.length, first: brief(own.parity[0]) };
  }
  await page.goto(`http://localhost:5173/project/${P}/takeoff/${S}?tab=estimating`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => document.body.innerText.includes("Bid total"), null, { timeout: 180000 });
  // The lines' prices arrive after the table: wait for the Utilities total to settle.
  let last = "";
  for (let i = 0; i < 60; i++) {
    const now = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((tr) => tr.innerText).find((t) => /^DIV 33/.test(t.trim())) ?? "");
    if (now && now === last) break;
    last = now;
    await page.waitForTimeout(2000);
  }

  // The table draws only the rows on screen: scroll it from the top part of a screen at a time, reading each step, and
  // keep every line row once (by its item number and assembly). A group's heading may be above the screen: the type
  // read last carries into the next step.
  const READ = ({ carried, crossingRead }) => {
    // The utility groups' headings ("Sanitary Sewer(3)", "Storm Drainage(5)", "Water(4)", ...): the first word names the type.
    const TYPES = [
      [/^Storm/, "storm"],
      [/^Sanitary/, "sanitary"],
      [/^Force Main/, "force_main"],
      [/^Fire/, "fire_water"],
      [/^Water/, "water"],
    ];
    const heads = [...document.querySelectorAll("thead tr")].pop();
    const names = heads ? [...heads.querySelectorAll("th")].map((c) => c.innerText.replace(/\s+/g, " ").trim().toUpperCase()) : [];
    const col = (name) => names.indexOf(name);
    const at = { no: col("ITEM NO."), name: col("ASSEMBLY"), qty: col("QTY"), lab: col("TOTAL LABOR COST"), eq: col("TOTAL EQUIPMENT"), mat: col("TOTAL MATERIAL COST"), disp: col("TOTAL DISPOSAL COST"), sub: col("SUBCONTRACT"), total: col("TOTAL ITEM COST") };
    let type = carried;
    const rows = [];
    for (const tr of document.querySelectorAll("tbody tr")) {
      const t = tr.innerText.replace(/\s+/g, " ").trim();
      if (tr.querySelectorAll("td").length <= 1) {
        const hit = TYPES.find(([re]) => re.test(t));
        if (hit) type = hit[1];
        else if (/^DIV /.test(t)) type = null;
        continue;
      }
      const cells = [...tr.querySelectorAll("td")].map((c) => c.innerText.trim());
      // D-1277: a crossing's pit lines (the pit, its shoring, backstop and pump) file outside the utility groups
      // ("Not classified", D-1269): kept as type "?" and found by name when the item's own type finds none.
      if (!tr.querySelector('input[type="checkbox"]') || cells.length < 10) continue;
      if (!type && !crossingRead) continue;
      const num = (v) => (v && /\$|^[\d,.]+$/.test(v) ? Number(v.replace(/[$,]/g, "")) : 0);
      // A line outside the MasterFormat map shows its scope on lines of its own before its name ("Site Utilities —
      // Water · Not classified in CSI MasterFormat / Map scope… / Bore pit (jacking) 12 × 32 ft, …"), and a line by
      // the bore sub ends in a "By others" badge: the name is the cell's last line, the badge taken off.
      const nameCell = cells[at.name] ?? "";
      const scoped = crossingRead && nameCell.includes("…");
      const name = scoped ? nameCell.split(/\r?\n/).pop().replace(/By others$/, "").trim() : nameCell;
      // D-1287: the line's rentals' taxable part, waiver and environmental fee (absent before D-1287: 0).
      const part = (k) => Number(tr.dataset[k] ?? 0) || 0;
      rows.push({ type: type ?? "?", no: cells[at.no], name, qty: num(cells[at.qty]), lab: num(cells[at.lab]), eq: num(cells[at.eq]), mat: num(cells[at.mat]), disp: num(cells[at.disp]), sub: at.sub < 0 ? 0 : num(cells[at.sub]), total: num(cells[at.total]), tx: part("eqTaxable"), wv: part("eqWaiver"), ev: part("eqEnv") });
    }
    const b = document.body.innerText.split("\n");
    return { bid: b[b.indexOf("Bid total") + 1], at, rows, type };
  };
  const scroller = await page.evaluateHandle(() => {
    let el = document.querySelector("tbody");
    while (el && !(el.scrollHeight > el.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    return el ?? document.scrollingElement;
  });
  await scroller.evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const seen = new Map();
  let carried = null;
  let est = null;
  for (let step = 0; step < 400; step++) {
    est = await page.evaluate(READ, { carried, crossingRead: Boolean(own.crossing) });
    carried = est.type;
    for (const r of est.rows) seen.set(`${r.no}|${r.type}|${r.name}`, r);
    const moved = await scroller.evaluate((el) => {
      const before = el.scrollTop;
      el.scrollBy(0, Math.max(200, el.clientHeight * 0.5));
      return el.scrollTop !== before;
    });
    if (!moved) break;
    await page.waitForTimeout(300);
  }
  const rows = [...seen.values()];
  // D-1279 (Q22, the late pass): the storm crew's two excavator options as the api priced them (`band_choice` on its
  // pacing excavator: (a) one machine for the spread, (b) a machine per band) and the one used; none where no band
  // passed the 5 crew-day pre-filter.
  const bandChoice = await page.evaluate(
    async ({ W, P, API }) => {
      const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const r = await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/equipment`, { headers: { authorization: `Bearer ${s.accessToken}` } });
      const j = r.ok ? await r.json() : [];
      const list = Array.isArray(j) ? j : (j.resources ?? []);
      return list.filter((x) => x.eq_snapshot?.band_choice).map((x) => ({ name: x.name, ...x.eq_snapshot.band_choice }));
    },
    { W: ct.workspace, P: ct.project, API },
  );
  // D-1291: the contract's cement-stabilized sand as the api priced it: tons (each component's total ÷ its unit price),
  // $, the unit prices and order tiers it took, and their source (the library, or the harness's project price in b′).
  const { css, matByName } = await page.evaluate(
    async ({ W, P, API, key }) => {
      const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const hh = { authorization: `Bearer ${s.accessToken}` };
      const r = await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/components`, { headers: hh });
      const list = r.ok ? await r.json() : [];
      // R44: each line's material components by the line's name (the api stores no component total: the app works it at
      // read time), each with its quantity formula, unit price, waste and `pct_of`, for the item's material $ by key.
      const items = await (await fetch(`${API}/api/workspace/${W}/project/${P}/takeoff/item`, { headers: hh })).json();
      const nameOf = new Map((Array.isArray(items) ? items : []).map((i) => [i.uuid, i.name]));
      // Lines of one name (a line per depth range or region) carry the same components: one line's set is kept.
      const byName = {};
      const firstOf = {};
      for (const c of Array.isArray(list) ? list : []) {
        if (c.kind !== "material") continue;
        const nm = nameOf.get(c.item_uuid) ?? c.item_uuid;
        if ((firstOf[nm] ??= c.item_uuid) !== c.item_uuid) continue;
        (byName[nm] ??= []).push({ key: c.mat_key ?? "(no key)", f: c.qty_formula ?? "QTY", up: c.unit_price == null ? null : Number(c.unit_price), w: Number(c.wastage_pct ?? 0), pct: c.pct_of ?? null, sf: c.sell_factor == null ? null : Number(c.sell_factor) });
      }
      const mine = (Array.isArray(list) ? list : []).filter((c) => c.kind === "material" && c.mat_key === key && c.unit_price != null && Number(c.unit_price) > 0);
      return { matByName: byName, css: { key, components: mine.length, unitPrices: [...new Set(mine.map((c) => Number(c.unit_price)))], bases: [...new Set(mine.map((c) => c.price_snapshot?.base_unit_price ?? null))], tiers: [...new Set(mine.map((c) => c.price_snapshot?.tier ?? null))], sources: [...new Set(mine.map((c) => c.price_source ?? null))] } };
    },
    { W: ct.workspace, P: ct.project, API, key: ct.cssPrice?.matKey ?? "stone:cement_stabilized_sand" },
  );
  // D-1277: a crossing contract's lines with their components (the pipe, the casing, the spacers, the seals, the bore
  // subcontract, the pits' parts, the crew), as the api holds them, by line name: the report takes the carrier pipe out
  // where the tab's item excludes it, and splits a crossing between a tab's casing and bore items.
  let comps = null;
  if (own.crossing) {
    comps = await page.evaluate(
      async ({ W, P, API }) => {
        const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
        const h = { authorization: `Bearer ${s.accessToken}` };
        const items = await (await fetch(`${API}/api/workspace/${W}/project/${P}/takeoff/item`, { headers: h })).json();
        const list = await (await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/components`, { headers: h })).json();
        const nameOf = new Map((Array.isArray(items) ? items : []).map((i) => [i.uuid, i.name]));
        const pick = (c) => ({ kind: c.kind, name: c.name, sub_calc: c.sub_calc ?? null, mat_key: c.mat_key ?? null, auto_key: c.auto_key ?? null, qty_formula: c.qty_formula, unit: c.unit, pricing_mode: c.pricing_mode, unit_price: c.unit_price == null ? null : Number(c.unit_price), unit_rate: c.unit_rate == null ? null : Number(c.unit_rate), wastage_pct: c.wastage_pct == null ? null : Number(c.wastage_pct), round_to: c.round_to == null ? null : Number(c.round_to), total: c.total == null ? null : Number(c.total) });
        const by = {};
        for (const c of Array.isArray(list) ? list : []) (by[nameOf.get(c.item_uuid) ?? c.item_uuid] ??= []).push(pick(c));
        return { lines: by, items: Array.isArray(items) ? items.length : String(items).slice(0, 200), components: Array.isArray(list) ? list.length : String(list).slice(0, 200) };
      },
      { W: ct.workspace, P: ct.project, API },
    );
  }

  // D-1287: the tax on each line's rentals at the pass's rate joins its equipment and total (the contractor's cost).
  const taxRate = (ct.rentalTaxPct ?? 0) / 100;
  const unit = new Map();
  for (const r of rows) {
    const k = `${r.type}|${r.name}`;
    const u = unit.get(k) ?? { qty: 0, total: 0, lab: 0, eq: 0, mat: 0, disp: 0, sub: 0, tx: 0, tax: 0, wv: 0, ev: 0 };
    const tax = (r.tx ?? 0) * taxRate;
    unit.set(k, { qty: u.qty + r.qty, total: u.total + r.total + tax, lab: u.lab + r.lab, eq: u.eq + r.eq + tax, mat: u.mat + r.mat, disp: u.disp + r.disp, sub: u.sub + r.sub, tx: u.tx + (r.tx ?? 0), tax: u.tax + tax, wv: u.wv + (r.wv ?? 0), ev: u.ev + (r.ev ?? 0) });
  }
  // R44: a component's quantity formula at a quantity (QTY and the app's ceil / floor / round / min / max only).
  const cssKey = ct.cssPrice?.matKey ?? "stone:cement_stabilized_sand";
  const evalQty = (f, QTY) => {
    const text = String(f ?? "QTY");
    if (!/^[\sQTY0-9.+\-*/(),a-z]*$/.test(text) || /[a-z]+/.test(text.replace(/\b(ceil|floor|round|min|max)\b/g, ""))) return null;
    try {
      const v = new Function("QTY", "ceil", "floor", "round", "min", "max", `return (${text});`)(QTY, Math.ceil, Math.floor, Math.round, Math.min, Math.max);
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  };
  let direct = 0;
  const items = contract.items.map((it, i) => {
    const mine = own.ownLines[i];
    if (!mine) return { ...it, ours: null };
    let total = 0;
    let lab = 0;
    let eq = 0;
    let mat = 0;
    let disp = 0;
    let sub = 0;
    let tx = 0;
    let tax = 0;
    let wv = 0;
    let ev = 0;
    const unmatched = [];
    // Each of the item's own lines by its role (pipe, bedding and zone, backfill, trench support, ...), per LF.
    const byRole = {};
    const matByKey = {};
    let cssTons = 0;
    for (const l of mine) {
      const u = unit.get(`${l.type}|${l.name}`) ?? (own.crossing ? unit.get(`?|${l.name}`) : undefined);
      if (!u || !(u.qty > 0)) {
        if (l.qty > 0) unmatched.push(l.name);
        continue;
      }
      total += (l.qty * u.total) / u.qty;
      lab += (l.qty * u.lab) / u.qty;
      eq += (l.qty * u.eq) / u.qty;
      mat += (l.qty * u.mat) / u.qty;
      // R44: the item's share of the line's material components, by key: each formula at the item's own quantity, x the
      // unit price (its location factor and order tier as priced) x (1 + waste); a `pct_of` component (the fittings
      // allowance) its percent of the key it follows. A rounding scope wider than the line (whole lengths per bid) is not
      // applied: the split is for reverting a price, which it scales linearly. The CSS tons the same way.
      const own$ = {};
      for (const c of matByName?.[l.name] ?? []) {
        if (c.pct || c.up == null) continue;
        const qn = evalQty(c.f, l.qty);
        if (qn == null) continue;
        own$[c.key] = (own$[c.key] ?? 0) + qn * c.up * (1 + c.w / 100);
        if (c.key === cssKey) cssTons += (qn * (1 + c.w / 100)) / it.qty;
      }
      for (const c of matByName?.[l.name] ?? []) if (c.pct && c.sf != null) own$[c.key] = (own$[c.key] ?? 0) + (c.sf / 100) * (own$[c.pct] ?? 0);
      for (const [k, v] of Object.entries(own$)) matByKey[k] = (matByKey[k] ?? 0) + v / it.qty;
      disp += (l.qty * u.disp) / u.qty;
      sub += (l.qty * u.sub) / u.qty;
      tx += (l.qty * u.tx) / u.qty;
      tax += (l.qty * u.tax) / u.qty;
      wv += (l.qty * u.wv) / u.qty;
      ev += (l.qty * u.ev) / u.qty;
      const r = (byRole[l.role] ??= { lab: 0, eq: 0, mat: 0, disp: 0, sub: 0, total: 0 });
      for (const k of ["lab", "eq", "mat", "disp", "sub", "total"]) r[k] += (l.qty * u[k]) / u.qty / it.qty;
    }
    direct += total;
    // D-1277: each own line's Estimating columns in full (a crossing's lines are its own, bar the contract's shared
    // ones, which take the item's share by quantity), its components, and Calculate's notes on the run and its pits.
    const lines = own.crossing
      ? mine.map((l) => {
          const u = unit.get(`${l.type}|${l.name}`) ?? unit.get(`?|${l.name}`);
          const k = u && u.qty > 0 ? l.qty / u.qty : 0;
          return { name: l.name, role: l.role, variant: l.variant, unit: l.unit, qty: l.qty, lineQty: u?.qty ?? null, share: k, lab: (u?.lab ?? 0) * k, eq: (u?.eq ?? 0) * k, mat: (u?.mat ?? 0) * k, disp: (u?.disp ?? 0) * k, sub: (u?.sub ?? 0) * k, total: (u?.total ?? 0) * k, components: comps?.lines?.[l.name] ?? null };
        })
      : undefined;
    return { ...it, ours: total / it.qty, labPerLF: lab / it.qty, eqPerLF: eq / it.qty, matPerLF: mat / it.qty, dispPerLF: disp / it.qty, subPerLF: sub / it.qty, eqTaxablePerLF: tx / it.qty, eqTaxPerLF: tax / it.qty, eqWaiverPerLF: wv / it.qty, eqEnvPerLF: ev / it.qty, byRole, unmatched, trench: own.crossing ? (own.notes?.[i]?.trace ?? null) : (own.trace?.[i] ?? null), limitedWidth: it.limitedWidth ?? null, limitedWhy: it.limitedWhy ?? null, matByKeyPerLF: matByKey, cssTonsPerLF: cssTons, ...(lines ? { lines, notes: own.notes?.[i] ?? null } : {}) };
  });
  css.tons = items.reduce((t, it) => t + (it.cssTonsPerLF ?? 0) * it.qty, 0);
  css.total = items.reduce((t, it) => t + (it.matByKeyPerLF?.[cssKey] ?? 0) * it.qty, 0);
  const res = { key: contract.key, rentalTaxPct: ct.rentalTaxPct ?? 0, waiverPct: ct.waiverPct ?? null, section: own.ran ?? null, css, sectionFlags: own.sectionFlags ?? [], missing: own.missing, unpriceable: own.unpriceable, coverFlags: own.coverFlags ?? [], bid: est?.bid ?? null, columns: est?.at ?? null, rows: rows.length, direct, items, bandChoice, ...(comps ? { componentCounts: { items: comps.items, components: comps.components } } : {}) };
  (page.context().__res ??= []).push(res);
  return { key: res.key, rows: res.rows, missing: res.missing, unpriceable: res.unpriceable, unmatched: items.flatMap((i) => i.unmatched ?? []).slice(0, 5), direct: Math.round(direct) };
  }
}
