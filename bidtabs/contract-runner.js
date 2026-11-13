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
  // joints, 100 the whole line.
  //   result pushed to page.context().__res: { key, missing, direct, items: [..., ours, labPerLF, unmatched] }
  // With `list` in place of `contract`, each in turn (one call; keep a call under the MCP's 30 minutes: ~2 min each).
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
    async ({ W, P, S, API, contract, pool, parityOnly }) => {
      const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const h = { authorization: `Bearer ${s.accessToken}`, "content-type": "application/json" };
      const cat = await import("/src/lib/takeoff/earthwork/utilities/catalog.ts");
      const q = await import("/src/lib/takeoff/earthwork/utilities/quantities.ts");
      const ln = await import("/src/lib/takeoff/earthwork/utilities/lines.ts");
      const mt = await import("/src/lib/takeoff/earthwork/utilities/materials.ts");
      const calc = await import("/src/features/takeoff/earthwork/utilities/calculate.ts");
      const ty = await import("/src/lib/takeoff/earthwork/utilities/types.ts");
      const rd = await import("/src/features/takeoff/earthwork/utilities/runDefaults.ts");
      // A run's own options as a new run of its type stores them (D-1260: its add-ons), and D-1261's restrained joints
      // where the item names them (`restrainedPct`, the harness's input; absent off).
      const sectionOf = (it) => ({ ...(rd.defaultRun(it.type).section ?? {}), ...(it.restrainedPct ? { restrained_pct: it.restrainedPct } : {}) });
      await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/equipment-library/override`, { method: "PUT", headers: h, body: JSON.stringify({ entity: "setting", entity_key: "equipment_pool", field: "value", value_num: pool, value_text: null }) });
      // The project's utility settings, as Calculate reads them: the depth ranges a line is named and paced by come from
      // here (the app's default 0-6, 6-8 ... 14-16, 16+), never a list of the harness's own (D-1211).
      const ua = await import("/src/features/takeoff/earthwork/utilities/api.ts");
      const util = await (await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/utilities`, { headers: h })).json();
      const settings = ua.settingsOf(util.settings ?? null, util.company_embedment);
      const CLAY_B = { layerId: null, name: "Clay", group: "clay", uscs: "CH", osha: "B", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1, depth: null };
      const forLines = [];
      const inverts = [];
      const missing = [];
      for (const it of contract.items) {
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
        const r = q.runQuantities({ knots: [knot(0), knot(1)], layers: [CLAY_B], noBores: false, pipe: { odIn: p.od, idIn: id, pipes: 1, gapIn: 0 }, section: { ...sec, beddingIn: 6, zoneAboveCrownIn: 12 }, bucket: "auto", box: null, specMaxIn: null, protection: "auto", limitedWidth: false, rule: null, depthRangesFt: settings.depthRangesFt, rangeUnit: "ft", materials: { bedding: "imported", zone: "imported", backfill: "native" }, materialNames: { bedding: emb.bedding.name, zone: emb.zone.name, backfill: "Native" }, segments: [], restoration: null });
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
          materials: { ...emb, backfill: { name: "Native", source: "native" } },
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
      contract.items.forEach((it, i) => {
        const f = forLines[i];
        if (!f) return;
        const pick = cat.catalogPick(f.pipeKey);
        const pressure = ["water", "fire_water", "force_main"].includes(it.type);
        const inv = inverts[i];
        const run = { ...rd.defaultRun(it.type), section: sectionOf(it), catalog_key: f.pipeKey, material: pick.entry.material, pipe_class: pick.entry.pipeClass, nominal_in: pick.size.nominalIn, od_in: cat.resolvePipe(f.pipeKey).od, id_in: cat.resolvePipe(f.pipeKey).id, start_ground_ft: 100, end_ground_ft: 100, ...(pressure ? {} : { start_invert_ft: inv, end_invert_ft: inv }), uuid: `parity-run-${i}`, item_uuid: `parity-item-${i}`, sheet_uuid: S };
        const item = { uuid: `parity-item-${i}`, name: f.pipeLabel, geometries: [{ sheet_uuid: S, role: "add", vertices_json: [[0.25, 0.5], [0.75, 0.5]], shape_meta: null }] };
        const app = calc.calculateUtilities({ runs: [run], items: [item], sheetUuid: S, settings, geo, frame: { widthPt: 1000, heightPt: 1000, feetPerNorm: (2 * it.qty) / 1000 }, eg: null, fg: null, features: [], projectShrink: 1.1, projectSwell: 1.3 });
        const ours = sig(ln.utilityLines([f]).map((l) => ({ ...l, materials: mt.lineMaterials(l, () => null, "restraint", {}) })));
        const theirs = sig(app?.lines ?? []);
        const a = JSON.stringify(ours);
        const b = JSON.stringify(theirs);
        if (a !== b) parity.push({ item: i, pipe: f.pipeKey, type: it.type, depth: it.depth, qty: it.qty, harness: ours, app: theirs, skipped: app?.stored?.skipped ?? null });
      });
      if (parity.length > 0 || parityOnly) return { put: 0, putText: "", missing, ownLines: [], parity };
      const all = forLines.filter(Boolean);
      const lines = ln.utilityLines(all).map((l) => ({ ...l, materials: mt.lineMaterials(l, () => null, "restraint", {}) }));
      // A zero Calculate result holds the lines (the sheet has no drawing).
      const result = { ok: true, cutCY: 0, fillCY: 0, netCY: 0, units: "CY", prisms: [], boundarySF: 0, coveredSF: 0, warnings: [], strip: null, regions: [] };
      const put = await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/result/${S}`, { method: "PUT", headers: h, body: JSON.stringify({ version_key: `bidtab:${contract.key}`, result, lines: calc.lineWrites(lines) }) });
      // Each item's own lines: the engine run on that item alone (D-938's own lines).
      const ownLines = forLines.map((f) => (f ? ln.utilityLines([f]).map((l) => ({ type: f.type, name: l.name, role: l.role, qty: l.quantity })) : null));
      return { put: put.status, putText: put.ok ? "" : (await put.text()).slice(0, 300), missing, ownLines, parity };
    },
    { W, P, S, API, contract, pool: ct.pool ?? 1, parityOnly: Boolean(ct.parityOnly || contract.parityOnly) },
  );
  if (own.put >= 300) return { key: contract.key, error: `PUT ${own.put}: ${own.putText}` };
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
  const READ = (carried) => {
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
    const at = { no: col("ITEM NO."), name: col("ASSEMBLY"), qty: col("QTY"), lab: col("TOTAL LABOR COST"), eq: col("TOTAL EQUIPMENT"), mat: col("TOTAL MATERIAL COST"), disp: col("TOTAL DISPOSAL COST"), total: col("TOTAL ITEM COST") };
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
      if (!type || !tr.querySelector('input[type="checkbox"]') || cells.length < 10) continue;
      const num = (v) => (v && /\$|^[\d,.]+$/.test(v) ? Number(v.replace(/[$,]/g, "")) : 0);
      rows.push({ type, no: cells[at.no], name: cells[at.name], qty: num(cells[at.qty]), lab: num(cells[at.lab]), eq: num(cells[at.eq]), mat: num(cells[at.mat]), disp: num(cells[at.disp]), total: num(cells[at.total]) });
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
    est = await page.evaluate(READ, carried);
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

  const unit = new Map();
  for (const r of rows) {
    const k = `${r.type}|${r.name}`;
    const u = unit.get(k) ?? { qty: 0, total: 0, lab: 0, eq: 0, mat: 0, disp: 0 };
    unit.set(k, { qty: u.qty + r.qty, total: u.total + r.total, lab: u.lab + r.lab, eq: u.eq + r.eq, mat: u.mat + r.mat, disp: u.disp + r.disp });
  }
  let direct = 0;
  const items = contract.items.map((it, i) => {
    const mine = own.ownLines[i];
    if (!mine) return { ...it, ours: null };
    let total = 0;
    let lab = 0;
    let eq = 0;
    let mat = 0;
    let disp = 0;
    const unmatched = [];
    // Each of the item's own lines by its role (pipe, bedding and zone, backfill, trench support, ...), per LF.
    const byRole = {};
    for (const l of mine) {
      const u = unit.get(`${l.type}|${l.name}`);
      if (!u || !(u.qty > 0)) {
        if (l.qty > 0) unmatched.push(l.name);
        continue;
      }
      total += (l.qty * u.total) / u.qty;
      lab += (l.qty * u.lab) / u.qty;
      eq += (l.qty * u.eq) / u.qty;
      mat += (l.qty * u.mat) / u.qty;
      disp += (l.qty * u.disp) / u.qty;
      const r = (byRole[l.role] ??= { lab: 0, eq: 0, mat: 0, disp: 0, total: 0 });
      for (const k of ["lab", "eq", "mat", "disp", "total"]) r[k] += (l.qty * u[k]) / u.qty / it.qty;
    }
    direct += total;
    return { ...it, ours: total / it.qty, labPerLF: lab / it.qty, eqPerLF: eq / it.qty, matPerLF: mat / it.qty, dispPerLF: disp / it.qty, byRole, unmatched };
  });
  const res = { key: contract.key, missing: own.missing, bid: est?.bid ?? null, columns: est?.at ?? null, rows: rows.length, direct, items };
  (page.context().__res ??= []).push(res);
  return { key: res.key, rows: res.rows, missing: res.missing, unmatched: items.flatMap((i) => i.unmatched ?? []).slice(0, 5), direct: Math.round(direct) };
  }
}
