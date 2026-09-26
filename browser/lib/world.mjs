// A run's own Riverside: the takeoff world the F8 fixtures and their neighbours measure
// on, made fresh for each run through the real F5 path, never the seeded account's.
//
//   const world = await riversideWorld();
//   world.owner   { email, password, token }   this run's own account (fixtureOwner)
//   world.token   the owner's token
//   world.workspace, world.r                    as `firstWorkspace` and `riverside` gave
//   world.sara    Sara W. (window-b@), seated as Estimator in this workspace
//
// What it builds (F5-S9, the seed moved to /drawing/load): a workspace, the project
// "Riverside Medical Center", a two-page PDF uploaded into Plans through the multipart
// path, both pages loaded into takeoff and prepared by the worker, and page 1
// calibrated as the old seed was, a 0.5-unit bar declared 100 ft (200 ft per unit). The
// workspace is the run's own account's, so regress.sh's fx clean-up removes it.

import { APP, SEEDED, apiAccept, apiLogin, apiRegister, clearMail, expect, fixtureOwner, invite, inviteTokenFromMail, openBrowser, ownWorkspace } from "./bench.mjs";
import { loadPages, makePdf, preparedSheets, uploadAll } from "./drawings.mjs";
import { makeProject } from "./f4.mjs";
import { WINDOW_B, call } from "./realtime.mjs";

export const PROJECT_NAME = "Riverside Medical Center";
const SHEETS = [1, 2].map((n) => ({ width: 1224, height: 792, label: `Riverside ${n}` }));
const BAR = { p1_x_norm: 0.1, p1_y_norm: 0.9, p2_x_norm: 0.6, p2_y_norm: 0.9, real_distance_ft: 100, unit: "ft" };

let worldPromise;

/** Sara W. seated in `workspaceUuid` as an estimator, through the invitation path. */
async function seatSara(ownerToken, workspaceUuid) {
  await clearMail();
  await invite(ownerToken, workspaceUuid, WINDOW_B.email, "estimator");
  const inviteToken = await inviteTokenFromMail(WINDOW_B.email);
  await apiRegister(WINDOW_B.email, WINDOW_B.password, "Sara Williams"); // 409 once she exists
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
