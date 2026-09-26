// A project to click through F5 Block A by hand: nothing is asserted, nothing is removed.
//
//   docker compose --profile browser run --rm browser node scripts/f5-demo.mjs
//
// Makes the workspace "F5 Block A demo" (owned by the seeded user) with a project
// "Loaded from files": "Plan set.pdf" (3 pages) in Plans, pages 1 and 3 loaded into
// takeoff, page 2 skipped; "Site.png" in Plans, loaded (wrapped into a PDF on the worker).
// Prints where to look. Run it again for a second, separate workspace.

import { apiLogin, createWorkspace } from "./lib/bench.mjs";
import { openBrowser } from "./lib/bench.mjs";
import { makeProject } from "./lib/f4.mjs";
import { letterPages, loadPages, makePdf, makePng, preparedSheets, uploadAll } from "./lib/drawings.mjs";

const token = await apiLogin();
const workspace = await createWorkspace(token, `F5 Block A demo ${new Date().toISOString().slice(11, 16)}`);
const base = `/api/workspace/${workspace.uuid}/project`;
const project = await makeProject(token, base, { name: "Loaded from files" });

const browser = await openBrowser();
const page = await (await browser.newContext()).newPage();
const files = await uploadAll(page, token, base, project.uuid, [
  { name: "Plan set.pdf", buffer: makePdf(letterPages(3, "Plan")), folder: "Plans" },
  { name: "Site.png", buffer: makePng(1200, 800), folder: "Plans" },
], workspace.uuid);
await browser.close();

const loaded = await loadPages(token, base, project.uuid, [
  [files["Plan set.pdf"].uuid, [1, 3]],
  [files["Site.png"].uuid, [1]],
]);
for (const f of loaded.body.files) await preparedSheets(token, base, project.uuid, f.file_uuid);

console.log(`workspace  ${workspace.name}`);
console.log(`project    http://localhost:5173/project/${project.uuid}`);
console.log(`loaded     Plan set.pdf pages 1 and 3 (page 2 skipped), Site.png; all prepared`);
