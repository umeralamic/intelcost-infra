// A grading sheet built through the api, for the click-check fixtures (C5, C6, C17): one page per
// label (1224 × 792 pt landscape) at 1/6 ft per point, so the page is 204 × 132 ft. Each helper
// writes what the earthwork tools would have written: containers named as the app names them, the
// shapes' `shape_meta` carrying kind, surface and elevation in stored feet.

import { APP, apiCall, expect, fixtureOwner, signInAs } from "./bench.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./drawings.mjs";

export const W = 1224;
export const H = 792;
export const FT = 1 / 6;

/** A rectangle wFt × hFt with its top-left at (x0, y0), in page fractions. */
export const rect = (x0, y0, wFt, hFt) => {
  const dx = wFt / FT / W;
  const dy = hFt / FT / H;
  return [[x0, y0], [x0 + dx, y0], [x0 + dx, y0 + dy], [x0, y0 + dy]];
};
/** A distance in feet as a page fraction across (x) or down (y). */
export const fx = (ft) => ft / FT / W;
export const fy = (ft) => ft / FT / H;
export const num = (s) => Number(String(s).replace(/[^0-9.-]/g, ""));

/** Upload one PDF of `labels.length` pages, load them all, scale each at 1/6 ft per point. */
export async function gradingSheets(page, token, base, workspace, project, labels) {
  const pdf = makePdf(labels.map((label) => ({ width: W, height: H, label })));
  const files = await uploadAll(page, token, base, project.uuid, [{ name: "G1.pdf", buffer: pdf, folder: "Plans" }], workspace.uuid);
  const loaded = await loadPages(token, base, project.uuid, [[files["G1.pdf"].uuid, labels.map((_, i) => i + 1)]]);
  expect(loaded.status === 200, `load: ${loaded.status} ${JSON.stringify(loaded.body)}`);
  const sheets = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
  expect(sheets.length === labels.length, `sheets: ${sheets.length} of ${labels.length}`);
  for (const sheet of sheets) {
    const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: FT, label: `1/8" = 1'-0"`, unit: "ft" });
    expect(scaled.status === 200, `scale: ${scaled.status}`);
  }
  return sheets;
}

/** The earthwork writers for one project. */
export function grading(token, base, project) {
  const takeoff = `${base}/${project.uuid}/takeoff`;
  const earthwork = `${base}/${project.uuid}/earthwork`;

  async function item(sheet, body) {
    const made = await apiCall(token, "POST", `${takeoff}/item`, { sheet_uuid: sheet.uuid, ...body });
    expect(made.status === 201, `${body.name}: ${made.status} ${JSON.stringify(made.body)}`);
    return made.body;
  }

  /** Shapes of one container: the first makes the item, the rest are added to it. */
  async function container(sheet, identity, geomType, metas) {
    const geometry = ({ vertices, meta }) => ({ geom_type: geomType, vertices_json: vertices, shape_meta: meta, client_uuid: crypto.randomUUID(), sheet_uuid: sheet.uuid });
    const made = await item(sheet, { ...identity, geometry: geometry(metas[0]) });
    if (metas.length > 1) {
      const rest = await apiCall(token, "POST", `${takeoff}/item/${made.uuid}/shapes`, { create: metas.slice(1).map(geometry) });
      expect(rest.status === 200 || rest.status === 201, `${identity.name} shapes: ${rest.status} ${JSON.stringify(rest.body)}`);
    }
    return made;
  }

  return {
    token,
    takeoff,
    earthwork,
    item,
    /** Spots of one surface, each `[x, y, elevation]`. */
    spots: (sheet, surface, points) =>
      container(
        sheet,
        { name: surface === "EG" ? "Existing Grade Spots" : "Proposed Grade Spots", type: "spot_elevation", unit: "EA", color: surface === "EG" ? "#ef4444" : "#22c55e" },
        "spot_elevation",
        points.map(([x, y, elevation]) => ({ vertices: [[x, y]], meta: { kind: "spot", surface, elevation } })),
      ),
    /** Contours of one surface, each `{ points, elevation }`. */
    contours: (sheet, surface, runs) =>
      container(
        sheet,
        { name: surface === "EG" ? "Existing Ground" : "Proposed Grade", type: "contour", unit: "LF", color: surface === "EG" ? "#ef4444" : "#22c55e" },
        "contour",
        runs.map(({ points, elevation }) => ({ vertices: points, meta: { kind: "polyline", surface, elevation } })),
      ),
    boundary: (sheet, ring) =>
      container(sheet, { name: "Work Boundary", type: "boundary", unit: "SF", color: "#3b82f6" }, "boundary", [{ vertices: ring, meta: { kind: "boundary", closed: true } }]),
    /** The assumptions Calculate asks for, saved so its dialog opens filled. */
    assume: async (body = {}) => {
      const saved = await apiCall(token, "PUT", `${earthwork}/assumptions`, { native_suitable: true, fill_type: "Engineered Fill", swell_factor: 1.25, shrink_factor: 1, soil_dry_unit_weight_pcf: 110, ...body });
      expect(saved.status === 200, `assumptions: ${saved.status} ${JSON.stringify(saved.body)}`);
    },
    /** Every item of the project, with detail. */
    items: async () => {
      const got = await apiCall(token, "GET", `${takeoff}/item/detail`);
      expect(got.status === 200, `items: ${got.status}`);
      return got.body;
    },
    results: async () => {
      const got = await apiCall(token, "GET", `${earthwork}/result`);
      expect(got.status === 200, `results: ${got.status}`);
      return got.body;
    },
  };
}

/** The usual 40 × 25 ft world at (0.1, 0.2): a boundary inside a ring of spots 20 ft out (80 × 65
 *  ft) and one in the middle, EG at `eg` and FG at `fg` on every spot. */
export async function flatPad(g, sheet, { eg = 100, fg = 99, x0 = 0.1, y0 = 0.2 } = {}) {
  const box = rect(x0, y0, 40, 25);
  const boundary = await g.boundary(sheet, box);
  const ring = rect(x0 - fx(20), y0 - fy(20), 80, 65);
  const middle = [x0 + fx(20), y0 + fy(12.5)];
  const eg_ = await g.spots(sheet, "EG", [...ring, middle].map(([x, y]) => [x, y, eg]));
  const fg_ = await g.spots(sheet, "FG", [...ring, middle].map(([x, y]) => [x, y, fg]));
  return { box, ring, middle, boundary, eg: eg_, fg: fg_ };
}

/**
 * The flat pad and more, the inputs an estimator's grading sheet carries (C6, C17):
 * - one EG contour at 100 (10 ft left of the boundary) and one FG contour at 99 (10 ft right of
 *   it), both outside the boundary, so the flat surfaces stay flat;
 * - one EG spot at 130, 40 ft right of the ring, outside the boundary's triangles: the elevation
 *   check flags it (30 ft off its neighbours at 100, over the 3 ft threshold), the volumes do not
 *   see it;
 * - "Pad area", a plain 10 × 10 ft area 5 ft inside the boundary's top-left corner, made a Site
 *   Feature "Building Pad" (subgrade 0.5 ft under FG, undercut 1 ft with Engineered Fill);
 * - a Strip Area over the whole boundary, 0.5 ft (6"), hauled off.
 * Expected (stored feet, 27 CF to the CY): strip 1,000 SF × 0.5 = 18.52 CY; cut from the stripped
 * EG (99.5): 900 SF × 0.5 + 100 SF × 1.0 = 550 CF = 20.37 CY; without the strip 900 × 1 + 100 × 1.5
 * = 1,050 CF = 38.89 CY; undercut 100 SF × 1 ft = 3.70 CY; no fill.
 */
export async function richPad(g, sheet, { x0 = 0.1, y0 = 0.2 } = {}) {
  const pad = await flatPad(g, sheet, { x0, y0 });
  // The outlier: a second EG spots call would make a second container, so it joins the first.
  const out = await apiCall(g.token, "POST", `${g.takeoff}/item/${pad.eg.uuid}/shapes`, {
    create: [{ geom_type: "spot_elevation", vertices_json: [[x0 + fx(100), y0 + fy(12.5)]], shape_meta: { kind: "spot", surface: "EG", elevation: 130 }, client_uuid: crypto.randomUUID(), sheet_uuid: sheet.uuid }],
  });
  expect(out.status === 200 || out.status === 201, `outlier spot: ${out.status} ${JSON.stringify(out.body)}`);
  const egContour = await g.contours(sheet, "EG", [{ elevation: 100, points: [[x0 - fx(10), y0 - fy(15)], [x0 - fx(10), y0 + fy(40)]] }]);
  const fgContour = await g.contours(sheet, "FG", [{ elevation: 99, points: [[x0 + fx(50), y0 - fy(15)], [x0 + fx(50), y0 + fy(40)]] }]);
  const area = await g.item(sheet, { name: "Pad area", type: "sf", unit: "SF", color: "#64748b", geometry: { geom_type: "sf", vertices_json: rect(x0 + fx(5), y0 + fy(5), 10, 10), shape_meta: { closed: true }, client_uuid: crypto.randomUUID() } });
  const feature = await apiCall(g.token, "POST", `${g.takeoff}/item/${area.uuid}/site-feature`, {
    name: "Building Pad",
    color: "#8B5E3C",
    role_depth_ft: 0.5,
    undercut_depth_ft: 1,
    undercut_offset_ft: 0,
    undercut_fill_material: "Engineered Fill",
    undercut_disposition: "haul_off",
  });
  expect(feature.status === 201, `site feature: ${feature.status} ${JSON.stringify(feature.body)}`);
  const strip = await apiCall(g.token, "POST", `${g.earthwork}/strip`, { sheet_uuid: sheet.uuid, name: "Strip Area", depth_ft: 0.5, source: "boundary", disposition: "haul_off" });
  expect(strip.status === 201, `strip area: ${strip.status} ${JSON.stringify(strip.body)}`);
  return { ...pad, egContour, fgContour, area, feature: feature.body, strip: strip.body };
}

/** Duplicate project through the api, as All projects' menu does (D-349): start the job, poll it
 *  to its end; the copy's uuid. */
export async function duplicateProject(token, base, projectUuid, waitFor, timeout = 180000) {
  const started = await apiCall(token, "POST", `${base}/${projectUuid}/duplicate`, {});
  expect(started.status === 200 || started.status === 201 || started.status === 202, `duplicate: ${started.status} ${JSON.stringify(started.body)}`);
  const job = started.body.job;
  let last = null;
  const done = await waitFor(
    async () => {
      const at = await apiCall(token, "GET", `${base}/duplicate/${job}`);
      last = at.body;
      if (at.body?.state === "failed") throw new Error(`the copy failed: ${at.body.error}`);
      return at.body?.state === "done" && at.body.project_uuid ? at.body : null;
    },
    "the duplicate job",
    timeout,
    1000,
  ).catch((error) => {
    throw new Error(`${error.message}; last read ${JSON.stringify(last)}`);
  });
  return done.project_uuid;
}

/** Signed in as this run's owner, on the sheet's tab, the window wide enough for every earthwork
 *  tool (the bar folds its last ones into "More earthwork tools" on a narrow window). */
export async function openSheet(page, project, sheet, tab) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signInAs(page, (await fixtureOwner()).email);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}?tab=${tab}`);
  // Attached, not visible: the Estimating tab keeps the canvas mounted but hidden.
  await page.locator("[data-canvas-scale]").first().waitFor({ state: "attached", timeout: 30000 });
}

/** Calculate in the Earthwork tab, through its assumptions dialog; waits for the volume panel. */
export async function calculate(page) {
  await page.getByRole("button", { name: "Calculate", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Earthwork assumptions" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Calculate", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  const panel = page.getByRole("dialog", { name: "Earthwork Volumes" });
  await panel.locator("[data-volume-totals]").waitFor({ timeout: 60000 });
  return panel;
}

/** Wait until the api holds a result for the sheet and the calculated lines it wrote. */
export async function storedLines(g, sheet, waitFor, at = 30000) {
  let lines = [];
  await waitFor(
    async () => {
      const results = await g.results();
      if (!results.some((r) => r.sheet_uuid === sheet.uuid)) return false;
      lines = (await g.items()).filter((i) => i.source_type === "earthwork_computed" && i.sheet_uuid === sheet.uuid);
      return lines.length > 0;
    },
    "the stored result and its calculated lines",
    at,
    500,
  );
  return lines;
}
