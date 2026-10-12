// A run's own Riverside: the takeoff world the F8 fixtures and their neighbours measure
// on, made fresh for each run through the real F5 path, never the seeded account's.
//
//   const world = await riversideWorld();
//   world.owner   { email, password, token }   this run's own account (fixtureOwner)
//   world.token   the owner's token
//   world.workspace, world.r                    as `firstWorkspace` and `riverside` gave
//   world.sara    Sara W. (this run's own window-B account), seated as Estimator here
//
// What it builds (F5-S9, the seed moved to /drawing/load): a workspace, the project
// "Riverside Medical Center", a two-page PDF uploaded into Plans through the multipart
// path, both pages loaded into takeoff and prepared by the worker, and page 1
// calibrated as the old seed was, a 0.5-unit bar declared 100 ft (200 ft per unit). The
// workspace is the run's own account's, so regress.sh's fx clean-up removes it.

import { APP, SEEDED, apiAccept, apiLogin, apiRegister, expect, fixtureOwner, invite, inviteTokenFromMail, openBrowser, ownWorkspace } from "./bench.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./drawings.mjs";
import { makeProject } from "./f4.mjs";
import { WINDOW_B, call } from "./realtime.mjs";

export const PROJECT_NAME = "Riverside Medical Center";
const SHEETS = [1, 2].map((n) => ({ width: 1224, height: 792, label: `Riverside ${n}` }));
const BAR = { p1_x_norm: 0.1, p1_y_norm: 0.9, p2_x_norm: 0.6, p2_y_norm: 0.9, real_distance_ft: 100, unit: "ft" };

let worldPromise;

/** Sara W. seated in `workspaceUuid` as an estimator, through the invitation path. */
async function seatSara(ownerToken, workspaceUuid) {
  await invite(ownerToken, workspaceUuid, WINDOW_B.email, "estimator");
  const inviteToken = await inviteTokenFromMail(WINDOW_B.email);
  await apiRegister(WINDOW_B.email, WINDOW_B.password, WINDOW_B.fullName); // 409 once she exists
  const token = await apiLogin(WINDOW_B.email, WINDOW_B.password);
  const accepted = await apiAccept(token, inviteToken);
  expect(accepted.status === 200, `seating Sara W.: ${accepted.status}`);
  return { ...WINDOW_B, token };
}

export function riversideWorld() {
  worldPromise ??= (async () => {
    const { owner, token, workspace, base } = await ownWorkspace(`Riverside ${Date.now()}`);
    const project = await makeProject(token, base, { name: PROJECT_NAME, client_name: "Riverside Health Partners" });

    const browser = await openBrowser();
    try {
      const page = await (await browser.newContext()).newPage();
      const files = await uploadAll(page, token, base, project.uuid, [
        // Landscape, as the old seeded sheet was: at 100% the whole sheet fits the
        // window, so a click at 85% of its height lands on it, not below the fold.
        { name: "Riverside — Structural.pdf", buffer: makePdf(SHEETS), folder: "Plans" },
      ], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Riverside — Structural.pdf"].uuid, [1, 2]]]);
      expect(loaded.status === 200, `loading Riverside: ${loaded.status} ${JSON.stringify(loaded.body)}`);
      await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
    } finally {
      await browser.close();
    }

    const sheets = (await call(token, "GET", `${base}/${project.uuid}/drawing/sheet`)).body.sort(
      (a, b) => a.page_number - b.page_number,
    );
    const calibrated = await call(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheets[0].uuid}/calibration`, BAR);
    expect(calibrated.status === 200, `calibrating page 1: ${calibrated.status}`);

    const sara = await seatSara(token, workspace.uuid);
    const takeoff = `${base}/${project.uuid}/takeoff`;
    const r = {
      workspace: workspace.uuid,
      project: project.uuid,
      sheet: sheets[0].uuid,
      second: sheets[1].uuid,
      takeoff,
      url: (app = APP) => `${app}/project/${project.uuid}/takeoff/${sheets[0].uuid}`,
    };
    return { owner, token, workspace, r, sara, password: SEEDED.password };
  })();
  return worldPromise;
}

/** This run's owner, when a fixture needs only the account and not the world. */
export const worldOwner = fixtureOwner;

/**
 * Riverside priced (day run Block 4): the same takeoff, rates, cost component and wage set on
 * every run, so two throwaways carry equal counts and a click check has an estimate to read.
 * Page 1 is calibrated at 200 ft per unit (BAR), so the shapes below measure the same each time.
 *
 *   Footing   a 0.3-unit run, LF, with the sub-item Rebar = PARENT * 1.05
 *   Slab      a 0.2 × 0.2 area, SF
 *   Doors     four marks, EA, with a material cost component (Hardware, $85 / EA)
 *   rates     labour, wage and material typed on Slab and Rebar; labour on Doors
 *   wages     the Wage Calculator's National Average, commercial, burdened, saved to the project
 */
export async function pricedRiverside(world) {
  const { token, r } = world;
  const project = r.takeoff.replace(/\/takeoff$/, "");
  const estimate = `${project}/estimate`;
  const ok = (res, what, code = [200, 201]) => {
    expect([].concat(code).includes(res.status), `${what}: ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
    return res.body;
  };
  const item = (name, type, unit, geomType, vertices, meta = null) =>
    call(token, "POST", `${r.takeoff}/item`, {
      name,
      type,
      unit,
      sheet_uuid: r.sheet,
      geometry: { geom_type: geomType, vertices_json: vertices, shape_meta: meta, client_uuid: crypto.randomUUID() },
    }).then((res) => ok(res, `item ${name}`));

  const footing = await item("Footing", "lf", "LF", "lf", [[0.2, 0.3], [0.5, 0.3]]);
  const slab = await item("Slab", "sf", "SF", "sf", [[0.2, 0.4], [0.4, 0.4], [0.4, 0.6], [0.2, 0.6]], { closed: true });
  const doors = await item("Doors", "count", "EA", "count", [[0.6, 0.3]]);
  ok(
    await call(token, "POST", `${r.takeoff}/item/${doors.uuid}/shapes`, {
      create: [[0.65, 0.3], [0.7, 0.3], [0.75, 0.3]].map((at) => ({ geom_type: "count", vertices_json: [at], shape_meta: null, sheet_uuid: r.sheet })),
    }),
    "door marks",
  );
  const subs = ok(
    await call(token, "PUT", `${r.takeoff}/item/${footing.uuid}/sub-items`, { sub_items: [{ name: "Rebar", formula_text: "PARENT * 1.05", unit: "LF" }] }),
    "sub-items",
  );
  const rebar = subs[0];
  const rate = (uuid, rates) => call(token, "PATCH", `${estimate}/costs/${uuid}`, rates).then((res) => ok(res, `rates ${uuid}`));
  await rate(slab.uuid, { unit_man_hours: 0.05, hourly_wage: 42.5, unit_material_cost: 6.25 });
  await rate(rebar.uuid, { unit_man_hours: 0.02, hourly_wage: 48, unit_material_cost: 1.8 });
  await rate(doors.uuid, { unit_man_hours: 2, hourly_wage: 45 });
  ok(
    await call(token, "POST", `${estimate}/components`, { item_uuid: doors.uuid, kind: "material", name: "Hardware", pricing_mode: "unit", unit_price: 85 }),
    "cost component",
  );
  ok(
    await call(token, "POST", `${project}/wage-calculator/wage-set`, { project_type: "commercial", pricing_basis: "burdened", basis: "national_average" }),
    "wage set",
  );
  return { footing: footing.uuid, slab: slab.uuid, doors: doors.uuid, rebar: rebar.uuid };
}
