// C23, the founder's click check "Folders on load" (F5-LF, D-308): load 3 one-page and 3 multi-page
// PDFs at once. One-page files land loose; a blank folder name falls back to the file's own name;
// "Wet Trades" and " wet trades " merge into one folder.
//
//   node fx-run-locked.mjs c23-folders-on-load
//
// The world: one throwaway workspace and project, six PDFs at the project root, every page drawing
// size (2592 × 1728 pt, 36 × 24 in): S0.00, S0.01 and S0.02 one page each; "Electrical Set.pdf"
// 3 pages, "Plumbing.pdf" 2 pages, "Mech.pdf" 2 pages. The check's "<file> Set" is read as the
// spec's own example: the blank name falls back to the file's stem (D-308 6), so the file is named
// "Electrical Set.pdf" and its folder must read "Electrical Set".
//
// Driven in the browser, on the load screen (Add sheets, from the empty takeoff): tick the six
// files in the tree; on Electrical Set clear the folder name; on Plumbing type "Wet Trades"; on Mech
// " wet trades "; the auto-read boxes off (no AI); Load 10 pages. Asserts, from the load screen and
// then the api: the one-page files have no folder row; each set's "Put in a folder" opens ticked
// with its stem as the name; after Load, S0.00..S0.02 are loose (no folder) named by their stems;
// Electrical Set's 3 sheets are in a folder "Electrical Set"; Plumbing's 2 and Mech's 2 are in ONE
// folder "Wet Trades", their sheets named "<file> – p.N"; there are exactly 2 sheet folders.
//
// Left for the founder's eye: the load screen's layout (the one-page grid, the master toggle), and
// the sheets panel's tree as drawn after the Load.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { makePdf, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const D = { width: 2592, height: 1728 };
const { token, workspace, base } = await freshWorkspace("C23 folders on load");
const project = await makeProject(token, base, { name: "C23 Folders on load" });
const drawing = `${base}/${project.uuid}/drawing`;
const FILES = [
  { name: "S0.00.pdf", pages: 1 },
  { name: "S0.01.pdf", pages: 1 },
  { name: "S0.02.pdf", pages: 1 },
  { name: "Electrical Set.pdf", pages: 3 },
  { name: "Plumbing.pdf", pages: 2 },
  { name: "Mech.pdf", pages: 2 },
];
let uploaded;

const dialog = (page) => page.locator("[data-load-dialog]");
const treeFile = (page, name) => page.locator(`[data-load-file="${name}"]`);

await run("c23-folders-on-load", [
  {
    title: "setup: six drawing-size PDFs at the project root: three one-page, Electrical Set (3), Plumbing (2), Mech (2); no sheets yet",
    run: async ({ page }) => {
      uploaded = await uploadAll(
        page, token, base, project.uuid,
        FILES.map((f) => ({ name: f.name, folder: null, buffer: makePdf(Array.from({ length: f.pages }, (_, i) => ({ ...D, label: `${f.name.replace(".pdf", "")} p${i + 1}` }))) })),
        workspace.uuid,
      );
      const sheets = (await apiCall(token, "GET", `${drawing}/sheet`)).body;
      expect(sheets.length === 0, `${sheets.length} sheets before the load`);
      return `${Object.keys(uploaded).length} files uploaded`;
    },
  },
  {
    title: "load screen: the six ticked; one-page files have no folder row; each set's \"Put in a folder\" opens ticked under its stem; Electrical Set blank, Plumbing \"Wet Trades\", Mech \" wet trades \"; Load 10 pages",
    run: async ({ page }) => {
      await signInAs(page, (await fixtureOwner()).email);
      await enterWorkspace(page, workspace.uuid);
      await page.goto(`${APP}/project/${project.uuid}/takeoff`);
      // A project with files and no sheets, arrived at directly: the empty takeoff offers Add sheets.
      const add = page.locator("[data-add-sheets-empty]");
      const already = dialog(page);
      await add.or(already).first().waitFor({ timeout: 20000 });
      if (!(await already.isVisible())) await add.click();
      await dialog(page).waitFor({ timeout: 10000 });
      for (const f of FILES) {
        const row = treeFile(page, f.name);
        await row.waitFor({ timeout: 20000 });
        const box = page.getByRole("checkbox", { name: `Choose ${f.name}`, exact: true }).first();
        await waitFor(async () => (await box.isEnabled()) || null, `${f.name} can be ticked`, 30000);
        if ((await row.getAttribute("data-tick")) !== "all") await box.check();
        await waitFor(async () => (await row.getAttribute("data-tick")) === "all", `${f.name} ticked`, 15000);
      }
      // One-page files: focused, no folder control.
      await treeFile(page, "S0.00.pdf").click();
      await page.locator("[data-load-pane] [data-single-page]").first().waitFor({ timeout: 15000 });
      const singleRows = await page.locator("[data-load-pane] [data-folder-row]").count();
      expect(singleRows === 0, `a one-page file shows ${singleRows} folder rows`);
      const named = {};
      const setName = async (file, value) => {
        await treeFile(page, file).click();
        const toggle = page.getByLabel(`Put ${file} in a folder`, { exact: true });
        await toggle.waitFor({ timeout: 20000 });
        expect(await toggle.isChecked(), `${file}: "Put in a folder" opens unticked`);
        const input = page.getByLabel(`Folder name for ${file}`, { exact: true });
        named[file] = await input.inputValue();
        await input.fill(value);
        expect((await input.inputValue()) === value, `${file}: the name box reads "${await input.inputValue()}"`);
      };
      await setName("Electrical Set.pdf", "");
      await setName("Plumbing.pdf", "Wet Trades");
      await setName("Mech.pdf", " wet trades ");
      expect(named["Electrical Set.pdf"] === "Electrical Set" && named["Plumbing.pdf"] === "Plumbing" && named["Mech.pdf"] === "Mech", `the name boxes opened on ${JSON.stringify(named)}`);
      // No AI on this load: the title-block reads off.
      for (const sel of ["[data-auto-name]", "[data-auto-scale]"]) {
        const box = page.locator(sel);
        if (await box.isChecked()) await box.uncheck();
      }
      const load = page.locator("[data-load-pages]");
      const label = ((await load.textContent()) ?? "").trim();
      expect(label === "Load 10 pages", `the button reads "${label}"`);
      await load.click();
      await dialog(page).waitFor({ state: "detached", timeout: 30000 });
      return `name boxes opened on ${Object.values(named).join(", ")}; "${label}" pressed`;
    },
  },
  {
    title: "after Load: S0.00..S0.02 loose under their stems; Electrical Set's 3 sheets in \"Electrical Set\"; Plumbing's and Mech's 4 merged in one wet-trades folder (case-blind), sheets \"<file> – p.N\"; 2 folders in all",
    run: async () => {
      const sheets = await waitFor(async () => {
        const list = (await apiCall(token, "GET", `${drawing}/sheet`)).body;
        return list.length >= 10 ? list : null;
      }, "10 sheets in the api", 60000);
      const folders = (await apiCall(token, "GET", `${drawing}/folder`)).body;
      const folderName = new Map(folders.map((f) => [f.uuid, f.name]));
      // A sheet names its drawing file; the drawing file names the project file it came from.
      const nameOf = new Map(Object.entries(uploaded).map(([name, f]) => [f.uuid, name]));
      const drawingFiles = (await apiCall(token, "GET", `${drawing}/file`)).body;
      const byFile = new Map(drawingFiles.map((d) => [d.uuid, nameOf.get(d.project_file_uuid) ?? d.file_name]));
      const placed = sheets.map((s) => ({ file: byFile.get(s.file_uuid), page: s.page_number, name: s.sheet_name, folder: s.folder_uuid ? folderName.get(s.folder_uuid) ?? "?" : null }));
      const of = (file) => placed.filter((p) => p.file === file);
      const problems = [];
      for (const f of ["S0.00.pdf", "S0.01.pdf", "S0.02.pdf"]) {
        const [s] = of(f);
        if (!s || s.folder !== null) problems.push(`${f} in folder ${s?.folder}`);
        if (s && s.name !== f.replace(".pdf", "")) problems.push(`${f} named "${s.name}"`);
      }
      const elec = of("Electrical Set.pdf");
      if (elec.length !== 3 || elec.some((s) => s.folder !== "Electrical Set")) problems.push(`Electrical Set in ${elec.map((s) => s.folder).join(", ")}`);
      const wet = [...of("Plumbing.pdf"), ...of("Mech.pdf")];
      const wetFolders = new Set(sheets.filter((s) => ["Plumbing.pdf", "Mech.pdf"].includes(byFile.get(s.file_uuid))).map((s) => s.folder_uuid));
      if (wet.length !== 4 || wetFolders.size !== 1 || wet.some((s) => (s.folder ?? "").trim().toLowerCase() !== "wet trades")) problems.push(`Plumbing and Mech in ${wet.map((s) => s.folder).join(", ")} (${wetFolders.size} folders)`);
      // The spelling typed first names the merged folder (N5, D-663): "Wet Trades" was typed on Plumbing
      // before " wet trades " on Mech, though Mech is the first row in the dialog.
      const wetName = wet[0]?.folder;
      if (wetName !== "Wet Trades") problems.push(`the merged folder is "${wetName}", not the first typed "Wet Trades"`);
      const shared = wet.filter((s) => !/^(Plumbing|Mech) – p\.\d$/.test(s.name ?? ""));
      if (shared.length) problems.push(`shared-folder sheets named ${shared.map((s) => `"${s.name}"`).join(", ")}`);
      if (folders.length !== 2) problems.push(`${folders.length} folders: ${folders.map((f) => `"${f.name}"`).join(", ")}`);
      expect(problems.length === 0, problems.join("; "));
      return `loose: ${of("S0.00.pdf")[0].name}, ${of("S0.01.pdf")[0].name}, ${of("S0.02.pdf")[0].name} · "Electrical Set" ${elec.length} · "${wetName}" ${wet.length} (${wet.map((s) => s.name).join(", ")}) · ${folders.length} folders`;
    },
  },
]);
