async (page) => {
  // Bid-tab rebuild, one contract (D-1103, D-1165): the contract's pipe items as one throwaway estimate, every item at
  // its bid quantity, written as Calculate writes utility lines, pool on, so the pool works within the contract only.
  // Each item's unit price: its own lines (the engine's utilityLines for that item alone) at the unit cost each line
  // has in the whole contract's estimate. Run through the Playwright MCP (browser_run_code_unsafe, filename) on a
  // signed-in throwaway account, in a project of its own (one blank sheet, the project's wage set saved); no bid figure
  // lives here: the contract comes in through the context.
  //
  //   page.context().__ct = { workspace, project, sheet, contract: { key, items: [{ type, entry, nominal, depth, qty, median }] } }
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
    async ({ W, P, S, API, contract }) => {
      const s = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const h = { authorization: `Bearer ${s.accessToken}`, "content-type": "application/json" };
      const cat = await import("/src/lib/takeoff/earthwork/utilities/catalog.ts");
      const q = await import("/src/lib/takeoff/earthwork/utilities/quantities.ts");
      const ln = await import("/src/lib/takeoff/earthwork/utilities/lines.ts");
      const mt = await import("/src/lib/takeoff/earthwork/utilities/materials.ts");
      const calc = await import("/src/features/takeoff/earthwork/utilities/calculate.ts");
      await fetch(`${API}/api/workspace/${W}/project/${P}/estimate/equipment-library/override`, { method: "PUT", headers: h, body: JSON.stringify({ entity: "setting", entity_key: "equipment_pool", field: "value", value_num: 1, value_text: null }) });
      const CLAY_B = { layerId: null, name: "Clay", group: "clay", uscs: "CH", osha: "B", unsuitable: false, reuseBackfill: true, alwaysExported: false, shrink: 1.1, depth: null };
      const forLines = [];
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
        const depth = pressure ? Math.round((4 + p.od / 12 + 0.5) * 100) / 100 : it.depth;
        const sec = pressure ? { sideClearanceIn: 6, minWidthIn: 18 } : { sideClearanceIn: 12, minWidthIn: 24 };
        const emb = pressure ? { bedding: { name: "Bank sand", source: "imported" }, zone: { name: "Bank sand", source: "imported" } } : { bedding: { name: "#57 stone", source: "imported" }, zone: { name: "#57 stone", source: "imported" } };
        const L = it.qty;
        const knot = (i) => ({ s: i === 0 ? 0 : L, G: 100, invert: 100 - depth + drop + 0.5, bottoms: [-1e6], water: null, caving: false, caveInFt: null });
        const r = q.runQuantities({ knots: [knot(0), knot(1)], layers: [CLAY_B], noBores: false, pipe: { odIn: p.od, idIn: id, pipes: 1, gapIn: 0 }, section: { ...sec, beddingIn: 6, zoneAboveCrownIn: 12 }, bucket: "auto", box: null, specMaxIn: null, protection: "auto", limitedWidth: false, rule: null, depthRangesFt: [0, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], rangeUnit: "ft", materials: { bedding: "imported", zone: "imported", backfill: "native" }, materialNames: { bedding: emb.bedding.name, zone: emb.zone.name, backfill: "Native" }, segments: [], restoration: null });
        forLines.push({ type: it.type, pipeLabel: `${it.nominal}" ${it.entry}`, pipeKey, pipes: 1, q: r, swell: [1.3], materials: { ...emb, backfill: { name: "Native", source: "native" } }, restoration: null, siteCondition: null, services: [], bends: [], tees: 0 });
      }
      const all = forLines.filter(Boolean);
      const lines = ln.utilityLines(all).map((l) => ({ ...l, materials: mt.lineMaterials(l, () => null, "restraint", {}) }));
      // A zero Calculate result holds the lines (the sheet has no drawing).
      const result = { ok: true, cutCY: 0, fillCY: 0, netCY: 0, units: "CY", prisms: [], boundarySF: 0, coveredSF: 0, warnings: [], strip: null, regions: [] };
      const put = await fetch(`${API}/api/workspace/${W}/project/${P}/earthwork/result/${S}`, { method: "PUT", headers: h, body: JSON.stringify({ version_key: `bidtab:${contract.key}`, result, lines: calc.lineWrites(lines) }) });
      // Each item's own lines: the engine run on that item alone (D-938's own lines).
      const ownLines = forLines.map((f) => (f ? ln.utilityLines([f]).map((l) => ({ type: f.type, name: l.name, role: l.role, qty: l.quantity })) : null));
      return { put: put.status, putText: put.ok ? "" : (await put.text()).slice(0, 300), missing, ownLines };
    },
    { W, P, S, API, contract },
  );
  if (own.put >= 300) return { key: contract.key, error: `PUT ${own.put}: ${own.putText}` };
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
    const at = { no: col("ITEM NO."), name: col("ASSEMBLY"), qty: col("QTY"), lab: col("TOTAL LABOR COST"), total: col("TOTAL ITEM COST") };
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
      rows.push({ type, no: cells[at.no], name: cells[at.name], qty: num(cells[at.qty]), lab: num(cells[at.lab]), total: num(cells[at.total]) });
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
    const u = unit.get(k) ?? { qty: 0, total: 0, lab: 0 };
    unit.set(k, { qty: u.qty + r.qty, total: u.total + r.total, lab: u.lab + r.lab });
  }
  let direct = 0;
  const items = contract.items.map((it, i) => {
    const mine = own.ownLines[i];
    if (!mine) return { ...it, ours: null };
    let total = 0;
    let lab = 0;
    const unmatched = [];
    for (const l of mine) {
      const u = unit.get(`${l.type}|${l.name}`);
      if (!u || !(u.qty > 0)) {
        if (l.qty > 0) unmatched.push(l.name);
        continue;
      }
      total += (l.qty * u.total) / u.qty;
      lab += (l.qty * u.lab) / u.qty;
    }
    direct += total;
    return { ...it, ours: total / it.qty, labPerLF: lab / it.qty, unmatched };
  });
  const res = { key: contract.key, missing: own.missing, bid: est?.bid ?? null, columns: est?.at ?? null, rows: rows.length, direct, items };
  (page.context().__res ??= []).push(res);
  return { key: res.key, rows: res.rows, missing: res.missing, unmatched: items.flatMap((i) => i.unmatched ?? []).slice(0, 5), direct: Math.round(direct) };
  }
}
