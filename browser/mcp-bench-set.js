async (page) => {
  // The BENCH- test set, as one recipe (D-627, the founder's T8): run in a Playwright MCP session after
  // mcp-guard.js and mcp-signin.js, with browser_run_code_unsafe's `filename`, and
  // `page.context().__benchOpen` set to a fresh BENCH DUP of the 3D test copy. It refuses anything else.
  //
  // In order, on that DUP only:
  //   1. deletes the copied SS-1, ST-1, ST-2 and MH-1..MH-4 (the standing rule);
  //   2. pins what the figures depend on, whatever a later copy carries: the earthwork assumptions, the
  //      three soil layers and the four bores' logs and water;
  //   3. draws every structure, then every run, with all its settings, inverts and structure links;
  //   4. sets what the evening run set after drawing: the inverts, the links, MH-2's and CB-2's floors,
  //      DEEP-1's limited width and its box 4.5 ft outside.
  // It returns what it made. Calculate C-200 and C-100 afterwards; the figures to expect are below.
  //
  // "Trench from": every run digs from the project's setting (proposed subgrade) except BENCH-EG-1, the one
  // run chosen on purpose to dig from existing grade (D-628: it never carries over).
  //
  // Expected after Calculate (D-627, built and calculated with this file on BENCH DUP 2026-10-18 15:39; the
  // evening run's figures of 2026-10-17, DEEP-1 with its box, to the same rounding):
  //   run (C-200)        LF      excavation BCY   of it rock BCY   width
  //   BENCH-SAN-1       302.4      1,833.9          1,076.7         36 in bucket
  //   BENCH-STM-1       247.5        643.6             47.3         60 in bucket
  //   BENCH-WTR-1       389.5        965.6            145.6         36 in bucket
  //   BENCH-DEEP-1      145.2        283.3            283.3         4.50 ft box
  //   BENCH-EG-1         75.7         44.6              2.5         42 in bucket
  //   run (C-100)
  //   BENCH-C100-SAN-1  153.0        597.9              0           36 in bucket
  //   pits BCY: MH-1 155.4, MH-2 258.4, MH-3 207.7, CB-1 40.7, CB-2 59.6, SMH-1 77.3, MH-4 465.3;
  //             C100-MH-1 148.4, C100-MH-2 123.6
  const APP_API = "http://localhost:8000";
  const WORKSPACE = "69a35a11-ad9f-4a93-8f97-7f3f89f7d6b9"; // Bench Construction Test, window-b's
  const context = page.context();
  if (!context.__protectedRefusals) throw new Error("Run mcp-guard.js first (D-542).");
  const project = context.__benchOpen;
  if (!project) throw new Error("Set page.context().__benchOpen to a fresh BENCH DUP's uuid first.");

  const call = (method, path, body) =>
    page.evaluate(
      async ({ api, method, path, body }) => {
        const { accessToken } = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
        const r = await fetch(`${api}${path}`, { method, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const json = await r.json().catch(() => null);
        if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(json)}`);
        return json;
      },
      { api: APP_API, method, path, body },
    );
  const base = `/api/workspace/${WORKSPACE}/project/${project}`;
  const named = await call("GET", base);
  if (!/^BENCH DUP .* — delete me$/.test(named?.name ?? "")) throw new Error(`${project} is not a bench duplicate (${named?.name}): nothing done.`);

  // ── 1. The copied founder runs and structures go first ──────────────────────────────────────────
  const COPIED = ["SS-1", "ST-1", "ST-2", "MH-1", "MH-2", "MH-3", "MH-4"];
  const itemsAtStart = await call("GET", `${base}/takeoff/item`);
  const deleted = [];
  for (const item of itemsAtStart.filter((i) => COPIED.includes(i.name))) {
    await call("DELETE", `${base}/takeoff/item/${item.uuid}`);
    deleted.push(item.name);
  }
  if (itemsAtStart.some((i) => i.name.startsWith("BENCH-"))) throw new Error("This DUP already has BENCH- items: use a fresh one.");

  // ── 2. What the figures depend on, pinned ───────────────────────────────────────────────────────
  await call("PUT", `${base}/earthwork/assumptions`, { native_suitable: true, fill_type: "Select Borrow", swell_factor: 1.15, shrink_factor: 1.1, soil_dry_unit_weight_pcf: 110 });
  const LAYERS = [
    { name: "Layer 1", soil_group: "clay", uscs: null, osha_type: "B", unsuitable: false, reuse_backfill: true, reuse_structural: false, expansive: false, swell_factor: 1.3, shrink_factor: 1.1, color: "#b91c1c", interpolate: "elevation" },
    { name: "Layer 2", soil_group: "silt", uscs: null, osha_type: "B", unsuitable: false, reuse_backfill: true, reuse_structural: false, expansive: false, swell_factor: 1.25, shrink_factor: 1.1, color: "#c2410c", interpolate: "elevation" },
    { name: "Layer 3", soil_group: "hard_dig", uscs: null, osha_type: "C", unsuitable: true, reuse_backfill: false, reuse_structural: false, expansive: false, swell_factor: 1.35, shrink_factor: 1, color: "#a16207", interpolate: "elevation" },
  ];
  // Each bore: depths below its ground, in feet, by layer; water while drilling, when met.
  const BORES = {
    "B-1": { log: [["Layer 1", 0, 1], ["Layer 2", 1, 4], ["Layer 3", 4, 20]], water: [{ kind: "while_drilling", hours: null, depth_ft: 6, observed_on: null, source: null }] },
    "B-2": { log: [["Layer 1", 0, 2], ["Layer 2", 2, 4], ["Layer 3", 4, 20]], water: [] },
    "B-3": { log: [["Layer 1", 0, 3], ["Layer 2", 3, 4], ["Layer 3", 4, 20]], water: [] },
    "B-4": { log: [["Layer 1", 0, 3], ["Layer 2", 3, 6], ["Layer 3", 6, 20]], water: [] },
  };
  let geo = await call("GET", `${base}/earthwork/geotech`);
  if (geo.layers.length !== LAYERS.length) throw new Error(`The copy has ${geo.layers.length} soil layers, the recipe 3: check the copy before pinning.`);
  const byPosition = [...geo.layers].sort((a, b) => a.position - b.position);
  for (const [i, layer] of byPosition.entries()) geo = await call("PATCH", `${base}/earthwork/soil-layer/${layer.uuid}`, LAYERS[i]);
  const layerUuid = Object.fromEntries(geo.layers.map((l) => [l.name, l.uuid]));
  for (const bore of geo.bores) {
    const recipe = BORES[bore.code];
    if (!recipe) throw new Error(`Bore ${bore.code} is not in the recipe.`);
    await call("PATCH", `${base}/earthwork/bore/${bore.uuid}`, {
      total_depth_ft: 20,
      layers: recipe.log.map(([name, top, bottom]) => ({ soil_layer_uuid: layerUuid[name], depth_top_ft: top, depth_bottom_ft: bottom, description: "", uscs: null, pi: null, open_bottom: false })),
      water: recipe.water,
    });
  }

  // ── 3. Structures, then runs ───────────────────────────────────────────────────────────────────
  const sheets = await call("GET", `${base}/drawing/sheet`);
  const sheetOf = (number) => {
    const s = (Array.isArray(sheets) ? sheets : sheets.items).find((x) => x.sheet_number === number);
    if (!s) throw new Error(`No sheet ${number}`);
    return s.uuid;
  };
  const C200 = sheetOf("C-200");
  const C100 = sheetOf("C-100");
  // C-200 points as drawn in the evening: the canvas's pixels at its fit, read as page fractions.
  const n = ([x, y]) => [(x - 305) / 785, (y - 233) / 509];
  const SAN = [[0.5, 0.66], [0.58, 0.54], [0.765, 0.54]];
  const STM = [[640, 460], [720, 460], [830, 470]].map(n);
  const WTR = [[700, 330], [900, 330], [900, 430]].map(n);
  const DEEP = [[0.79, 0.58], [0.79, 0.8]];
  const EG = [[575, 470], [625, 440]].map(n);
  const C100_SAN = [[0.4, 0.5], [0.55, 0.5]];

  const pipe = (key) =>
    page.evaluate(async (k) => {
      const m = await import("/src/lib/takeoff/earthwork/utilities/catalog.ts");
      const p = m.resolvePipe(k);
      return p ? { od: p.od, id: p.id } : null;
    }, key);
  const run = async (type, key, material, cls, extra) => {
    const p = await pipe(key);
    return {
      utility_type: type, catalog_key: key, material, pipe_class: cls, nominal_in: Number(key.split(":")[1]), od_in: p?.od ?? null, id_in: p?.id ?? null, od_typed_by: null,
      pipes: 1, pipe_gap_in: 0, vertical: "cover", start_invert_ft: null, end_invert_ft: null, slope_pct: null, cover_ft: 4, start_ground_ft: null, end_ground_ft: null,
      start_structure_uuid: null, end_structure_uuid: null, start_surface: "proposed", section: null, protection: "auto", limited_width: false, bucket_in: null,
      box_ref: null, box_outside_ft: null, spec_max_width_in: null, restoration: null, segments: [], notes: [], ...extra,
    };
  };
  const round48 = (type, utility, extra = {}) => ({ structure_type: type, utility_type: utility, shape: "round", inside_dia_in: 48, inside_l_ft: null, inside_w_ft: null, wall_in: 6, rim_ft: null, floor_ft: null, sump_ft: null, base_slab_in: 6, base_stone_in: 6, overdig_ft: 2, protection: "auto", start_surface: "proposed", ...extra });
  const rect4 = (type, utility, extra = {}) => ({ structure_type: type, utility_type: utility, shape: "rect", inside_dia_in: null, inside_l_ft: 4, inside_w_ft: 4, wall_in: 6, rim_ft: null, floor_ft: null, sump_ft: null, base_slab_in: 6, base_stone_in: 6, overdig_ft: 2, protection: "auto", start_surface: "proposed", ...extra });
  const post = (body) => call("POST", `${base}/takeoff/item`, body);
  const structure = (name, sheet, at, fields, color) => post({ name, type: "count", unit: "EA", sheet_uuid: sheet, color, is_utility: true, structure: fields, geometry: { geom_type: "count", vertices_json: [at], client_uuid: crypto.randomUUID() } });
  const pipeRun = (name, sheet, pts, fields, color) => post({ name, type: "lf", unit: "LF", sheet_uuid: sheet, color, is_utility: true, utility: fields, geometry: { geom_type: "lf", vertices_json: pts, shape_meta: { kind: "polyline" }, client_uuid: crypto.randomUUID() } });

  const s = {};
  for (const [i, at] of SAN.entries()) s[`BENCH-MH-${i + 1}`] = await structure(`BENCH-MH-${i + 1}`, C200, at, round48("sanitary_manhole", "sanitary", i === 1 ? { floor_ft: 692.2 } : {}), "#16a34a");
  s["BENCH-CB-1"] = await structure("BENCH-CB-1", C200, STM[0], rect4("catch_basin", "storm"), "#0ea5e9");
  s["BENCH-CB-2"] = await structure("BENCH-CB-2", C200, STM[1], rect4("catch_basin", "storm", { floor_ft: 697.59 }), "#0ea5e9");
  s["BENCH-SMH-1"] = await structure("BENCH-SMH-1", C200, STM[2], round48("storm_manhole", "storm"), "#0ea5e9");
  s["BENCH-MH-4"] = await structure("BENCH-MH-4", C200, DEEP[1], round48("sanitary_manhole", "sanitary"), "#15803d");
  s["BENCH-C100-MH-1"] = await structure("BENCH-C100-MH-1", C100, C100_SAN[0], round48("sanitary_manhole", "sanitary", { rim_ft: 705.0 }), "#16a34a");
  s["BENCH-C100-MH-2"] = await structure("BENCH-C100-MH-2", C100, C100_SAN[1], round48("sanitary_manhole", "sanitary", { rim_ft: 703.5 }), "#16a34a");
  const id = (name) => s[name].uuid;

  const r = {};
  r["BENCH-SAN-1"] = await pipeRun("BENCH-SAN-1", C200, SAN, await run("sanitary", "pvc_d3034_sdr35:8", "PVC", "SDR-35", { vertical: "inverts", cover_ft: null, start_invert_ft: 691.0, end_invert_ft: 694.2, start_structure_uuid: id("BENCH-MH-1"), end_structure_uuid: id("BENCH-MH-3") }), "#16a34a");
  r["BENCH-STM-1"] = await pipeRun("BENCH-STM-1", C200, STM, await run("storm", "rcp_c76_wall_b:24", "RCP", "Wall B", { vertical: "inverts", cover_ft: null, start_invert_ft: 697.8, end_invert_ft: 697.3, start_structure_uuid: id("BENCH-CB-1"), end_structure_uuid: id("BENCH-SMH-1") }), "#0ea5e9");
  r["BENCH-WTR-1"] = await pipeRun("BENCH-WTR-1", C200, WTR, await run("water", "pvc_c900_dr18:8", "PVC", "C900 DR 18", { cover_ft: 4.5 }), "#2563eb");
  r["BENCH-DEEP-1"] = await pipeRun("BENCH-DEEP-1", C200, DEEP, await run("sanitary", "pvc_d3034_sdr35:12", "PVC", "SDR-35", { vertical: "inverts", cover_ft: null, start_invert_ft: 689.6, end_invert_ft: 687.5, limited_width: true, box_outside_ft: 4.5, end_structure_uuid: id("BENCH-MH-4") }), "#15803d");
  // The one run dug from existing grade, chosen on that run (D-628).
  r["BENCH-EG-1"] = await pipeRun("BENCH-EG-1", C200, EG, await run("storm", "pvc_d3034_sdr35:12", "PVC", "SDR-35", { cover_ft: 3, start_surface: "existing" }), "#0284c7");
  r["BENCH-C100-SAN-1"] = await pipeRun("BENCH-C100-SAN-1", C100, C100_SAN, await run("sanitary", "pvc_d3034_sdr35:8", "PVC", "SDR-35", { vertical: "inverts", cover_ft: null, start_invert_ft: 697.0, end_invert_ft: 696.2, start_structure_uuid: id("BENCH-C100-MH-1"), end_structure_uuid: id("BENCH-C100-MH-2") }), "#16a34a");

  // ── 4. Read back: every run as the api keeps it ──────────────────────────────────────────────────
  const u = await call("GET", `${base}/earthwork/utilities`);
  const keptRun = (name) => u.runs.find((x) => x.item_uuid === r[name].uuid);
  const check = Object.keys(r).map((name) => {
    const k = keptRun(name);
    return `${name}: ${k.vertical}${k.vertical === "inverts" ? ` ${k.start_invert_ft} -> ${k.end_invert_ft}` : ` cover ${k.cover_ft}`}, from ${k.start_surface}${k.limited_width ? ", limited width" : ""}${k.box_outside_ft ? `, box ${k.box_outside_ft} ft outside` : ""}${k.start_structure_uuid ? ", start linked" : ""}${k.end_structure_uuid ? ", end linked" : ""}`;
  });
  return { project: named.name, deleted, layers: geo.layers.map((l) => l.name), bores: geo.bores.map((b) => b.code), structures: Object.keys(s), runs: check };
}
