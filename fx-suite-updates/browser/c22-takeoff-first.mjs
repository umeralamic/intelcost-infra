// C22, the founder's click check "Takeoff-first" (TF: D-309, D-310, D-311, D-312): a new project has no
// seed folders; a folder plus loose PDFs keeps the tree; only drawing-size pages are pre-ticked on the
// load screen; Home opens the last sheet; Open's search "zzq" gives "No projects match."; the upload
// tray's Cancel and Retry; files dropped on the empty state, then the dated name renamed.
//
//   node fx-run-locked.mjs c22-takeoff-first
//
// The world: one throwaway workspace with no projects (so Home is the empty state), and PDFs made
// here: drawing-size pages are 2592 × 1728 pt (36 × 24 in), spec pages letter (612 × 792).
//
// What cannot be automated, and the closest path taken instead:
// - A real drag-and-drop from the computer. The empty state's drop is a synthetic `drop` event
//   carrying a DataTransfer of three File objects, dispatched on the drop box: the same handler a
//   real drop of loose files reaches. A real drag of a FOLDER from the OS (the entries walk,
//   `webkitGetAsEntry`) cannot be made from a page; the folder goes in through New project's
//   "Choose folder" input (`webkitdirectory`, a real directory written here, relative paths kept),
//   the input a person's folder picker fills.
// - A failed upload. The storage PUTs are refused by the test's own network route until Retry, and
//   held open for Cancel; the app's own retries and tray are what is checked.
//
// Left for the founder's eye: a real folder dragged from Explorer onto the empty state and onto New
// project's drop zone, the feel of the rename prompt, the tray's look and the speed of each step.

import { mkdir, rm, writeFile } from "node:fs/promises";

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject } from "./lib/f4.mjs";
import { makePdf } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const DRAW = { width: 2592, height: 1728 };
const LETTER = { width: 612, height: 792 };
const pdf = (sizes, tag) => makePdf(sizes.map((s, i) => ({ ...s, label: `${tag} ${i + 1}` })));
const { token, workspace, base } = await freshWorkspace("C22 takeoff first");
const ROOT = "/tmp/c22-takeoff-first";
const BIDSET = `${ROOT}/BidSet`;
const LOOSE = `${ROOT}/loose`;
const projects = {}; // "drop" and "folder": { uuid, name }
let dropSheets = [];

const loadDialog = (page) => page.locator("[data-load-dialog]");
const treeFile = (page, name) => page.locator(`[data-load-file="${name}"]`);
const files = async (projectUuid) => (await apiCall(token, "GET", `${base}/${projectUuid}/file`)).body;
const sheets = async (projectUuid) => (await apiCall(token, "GET", `${base}/${projectUuid}/drawing/sheet`)).body;

async function signedIn(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
}

/** The bar's Open menu, opened. */
async function openMenu(page) {
  // Once the sheet is up: a click while the takeoff is still arriving can be lost to a re-render.
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
  const trigger = page.locator("button[data-open-menu]").first();
  await trigger.waitFor({ timeout: 20000 });
  const menu = page.getByRole("menu", { name: "Open" });
  await waitFor(async () => {
    if (await menu.isVisible()) return true;
    await trigger.click();
    await menu.waitFor({ timeout: 2000 }).catch(() => {});
    return menu.isVisible();
  }, "the Open menu to open", 15000);
  return menu;
}

/** Turn the load screen's title-block reads off, so no load spends AI. */
async function noAutoRead(page) {
  for (const sel of ["[data-auto-name]", "[data-auto-scale]"]) {
    const box = page.locator(sel);
    if ((await box.count()) && (await box.isChecked())) await box.uncheck();
  }
}

await rm(ROOT, { recursive: true, force: true });
await mkdir(`${BIDSET}/Electrical`, { recursive: true });
await mkdir(LOOSE, { recursive: true });
await writeFile(`${BIDSET}/Electrical/E1.pdf`, pdf([DRAW], "E1"));
await writeFile(`${BIDSET}/E0.pdf`, pdf([DRAW], "E0"));
await writeFile(`${LOOSE}/L1.pdf`, pdf([DRAW], "L1"));
await writeFile(`${LOOSE}/L2.pdf`, pdf([LETTER], "L2"));

await run("c22-takeoff-first", [
  {
    title: "empty state: three PDFs dropped (A101 1 drawing page, A102 2 drawing pages, Spec 3 letter pages) make a project under a dated name, offered for rename → \"C22 Drop Start\"; the load screen then ticks only the drawing-size pages (A101, A102; not Spec); Load 3 pages",
    run: async ({ page }) => {
      const before = (await apiCall(token, "GET", base)).body;
      const count = before.items?.length ?? before.length ?? 0;
      expect(count === 0, `the workspace already has ${count} projects`);
      await signedIn(page);
      await page.goto(`${APP}/`);
      const zone = page.locator("[data-home-empty] [data-drop-zone]");
      await zone.waitFor({ timeout: 20000 });
      const dropped = [
        { name: "A101.pdf", b64: pdf([DRAW], "A101").toString("base64") },
        { name: "A102.pdf", b64: pdf([DRAW, DRAW], "A102").toString("base64") },
        { name: "Spec.pdf", b64: pdf([LETTER, LETTER, LETTER], "Spec").toString("base64") },
      ];
      // A synthetic drop of loose files on the box: what a real drop of files reaches.
      await zone.evaluate((el, list) => {
        const data = new DataTransfer();
        for (const f of list) data.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: "application/pdf" }));
        for (const type of ["dragenter", "dragover", "drop"]) el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data }));
      }, dropped);
      await page.waitForURL(/\/project\/[0-9a-f-]+\/takeoff/, { timeout: 20000 });
      const prompt = page.getByRole("dialog", { name: "Name this project" });
      await prompt.waitFor({ timeout: 15000 });
      const field = prompt.getByLabel("Project name");
      const dated = await field.inputValue();
      expect(/^New project – [A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(dated), `the dropped project is named "${dated}"`);
      await field.fill("C22 Drop Start");
      await prompt.getByRole("button", { name: "Save" }).click();
      await prompt.waitFor({ state: "detached", timeout: 10000 });
      const uuid = page.url().match(/\/project\/([0-9a-f-]+)\/takeoff/)[1];
      const read = await waitFor(async () => {
        const p = (await apiCall(token, "GET", `${base}/${uuid}`)).body;
        return p?.name === "C22 Drop Start" ? p : null;
      }, "the rename saved", 10000);
      projects.drop = { uuid, name: read.name };

      // Straight on from the rename, on this same page (each step gets a fresh one): the load
      // screen opens over the new project, the first-run one.
      await loadDialog(page).waitFor({ timeout: 20000 });
      const kind = await loadDialog(page).getAttribute("data-load-dialog");
      expect(kind === "first-run", `the load screen opened as "${kind}"`);
      for (const name of ["A101.pdf", "A102.pdf"]) {
        await waitFor(async () => (await treeFile(page, name).getAttribute("data-tick").catch(() => null)) === "all", `${name} ticked by size`, 60000);
      }
      // Spec's sizes are in once its row says how many pages it has, or once all three files are in.
      await treeFile(page, "Spec.pdf").waitFor({ timeout: 60000 });
      await waitFor(async () => (await files(projects.drop.uuid)).filter((f) => f.uploaded_at).length === 3 || null, "the three files uploaded", 60000);
      const load = page.locator("[data-load-pages]");
      await waitFor(async () => ((await load.textContent()) ?? "").trim() === "Load 3 pages" || null, "Load 3 pages", 30000).catch(async () => {
        throw new Error(`the button reads "${((await load.textContent()) ?? "").trim()}", Spec ${await treeFile(page, "Spec.pdf").getAttribute("data-tick")}`);
      });
      const specTick = await treeFile(page, "Spec.pdf").getAttribute("data-tick");
      expect(specTick === "none", `Spec.pdf (letter pages) reads "${specTick}"`);
      await noAutoRead(page);
      await load.click();
      await loadDialog(page).waitFor({ state: "detached", timeout: 30000 });
      dropSheets = await waitFor(async () => {
        const list = await sheets(projects.drop.uuid);
        return list.length === 3 && list.every((s) => s.render_status === "ready") ? list : null;
      }, "3 sheets ready", 90000);
      return `"${dated}" → "${read.name}" · load screen: A101 all, A102 all, Spec ${specTick}; Load 3 pages → ${dropSheets.length} sheets`;
    },
  },
  {
    title: "New project with a folder (BidSet/Electrical/E1.pdf, BidSet/E0.pdf) and two loose PDFs: no seed folders, the tree kept, the loose files at the root",
    run: async ({ page }) => {
      // An api-made project has no folders at all (D-309).
      const bare = await makeProject(token, base, { name: "C22 Bare" });
      const bareFolders = [...(await folderPaths(token, base, bare.uuid)).keys()];
      expect(bareFolders.length === 0, `a new project has folders: ${bareFolders.join(", ")}`);

      await signedIn(page);
      await page.goto(`${APP}/project/${projects.drop.uuid}/takeoff/${dropSheets[0].uuid}`);
      const menu = await openMenu(page);
      const entry = menu.getByRole("menuitem", { name: "New Project" });
      expect(await entry.isEnabled(), `New Project is disabled: "${await entry.getAttribute("title")}"`);
      await entry.click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      await dialog.waitFor({ timeout: 10000 }).catch(async () => {
        const open = await page.getByRole("dialog").evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? e.textContent ?? "").slice(0, 80)));
        throw new Error(`no "New project" dialog after New Project; dialogs open: ${JSON.stringify(open)}`);
      });
      const nameField = dialog.getByLabel("Project name");
      await nameField.fill("C22 Folder Job");
      // Enter submits the info form: the same as Next.
      await nameField.press("Enter");
      await dialog.getByRole("heading", { name: "Add files" }).waitFor({ timeout: 10000 }).catch(async () => {
        const buttons = await dialog.getByRole("button").evaluateAll((els) => els.map((e) => `${(e.textContent ?? "").trim() || e.getAttribute("aria-label")}${e.disabled ? " (disabled)" : ""}`));
        throw new Error(`no "Add files" step; name "${await nameField.inputValue()}", buttons: ${buttons.join(", ")}`);
      });
      await dialog.locator("[data-choose-folder]").setInputFiles(BIDSET);
      await dialog.locator("[data-choose-files]").setInputFiles([`${LOOSE}/L1.pdf`, `${LOOSE}/L2.pdf`]);
      await dialog.locator("[data-drop-count]").filter({ hasText: "4 files" }).waitFor({ timeout: 10000 });
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      // Already on a takeoff: wait for the new project's.
      await page.waitForURL((url) => /\/project\/[0-9a-f-]+\/takeoff/.test(url.pathname) && !url.pathname.includes(projects.drop.uuid), { timeout: 20000 }).catch(() => {
        throw new Error(`Create stayed on ${page.url()}`);
      });
      const uuid = page.url().match(/\/project\/([0-9a-f-]+)\/takeoff/)[1];
      projects.folder = { uuid, name: "C22 Folder Job" };
      const landed = await waitFor(async () => {
        const list = await files(uuid);
        return list.length === 4 && list.every((f) => f.uploaded_at) ? list : null;
      }, "the four files uploaded", 60000);
      const paths = await folderPaths(token, base, uuid);
      const byUuid = new Map([...paths].map(([path, f]) => [f.uuid, path]));
      const where = landed.map((f) => `${f.folder_uuid ? byUuid.get(f.folder_uuid) + "/" : ""}${f.file_name}`).sort();
      const folders = [...paths.keys()].sort();
      expect(folders.join() === "BidSet,BidSet/Electrical", `folders: ${folders.join(", ")}`);
      expect(where.join() === "BidSet/E0.pdf,BidSet/Electrical/E1.pdf,L1.pdf,L2.pdf", `files: ${where.join(", ")}`);
      // The load screen opened over it, with the same tree.
      await loadDialog(page).waitFor({ timeout: 20000 });
      await page.locator('[data-load-folder="BidSet"]').waitFor({ timeout: 20000 });
      await page.locator('[data-load-folder="Electrical"]').waitFor({ timeout: 20000 });
      // Skip is in the dialog's footer, outside the body's [data-load-dialog].
      await page.getByRole("dialog", { name: "Load project files into takeoff" }).getByRole("button", { name: "Skip", exact: true }).click();
      await loadDialog(page).waitFor({ state: "detached", timeout: 10000 });
      return `C22 Bare: no folders · C22 Folder Job: folders [${folders.join(", ")}], files [${where.join(", ")}]; the load screen's tree the same`;
    },
  },
  {
    title: "Home opens the last sheet: the dropped project's 3rd sheet visited, then / lands on it",
    run: async ({ page }) => {
      await signedIn(page);
      const last = [...dropSheets].sort((a, b) => a.page_number - b.page_number || (a.sheet_name ?? "").localeCompare(b.sheet_name ?? "")).at(-1);
      await page.goto(`${APP}/project/${projects.drop.uuid}/takeoff/${last.uuid}`);
      await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
      // Recorded by the app two seconds after the sheet opens (D-311 2).
      await waitFor(async () => (await apiCall(token, "GET", `${base}/${projects.drop.uuid}/visit`)).body?.sheet_uuid === last.uuid || null, "the visit recorded", 15000);
      await page.goto(`${APP}/`);
      await page.waitForURL((url) => url.pathname.includes(`/takeoff/${last.uuid}`), { timeout: 20000 }).catch(() => {
        throw new Error(`Home went to ${page.url()}, not ${projects.drop.name}'s sheet ${last.uuid}`);
      });
      await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
      return `/ → ${new URL(page.url()).pathname}`;
    },
  },
  {
    title: "Open's search: \"zzq\" gives \"No projects match.\"",
    run: async ({ page }) => {
      await signedIn(page);
      await page.goto(`${APP}/project/${projects.drop.uuid}/takeoff/${dropSheets[0].uuid}`);
      const menu = await openMenu(page);
      const search = page.getByPlaceholder("Search projects");
      await search.waitFor({ timeout: 5000 });
      await search.fill("zzq");
      await menu.locator("[data-menu-search-empty]").filter({ hasText: /^No projects match\.$/ }).waitFor({ timeout: 10000 }).catch(async () => {
        const shown = (await menu.isVisible()) ? ((await menu.textContent()) ?? "").replace(/\s+/g, " ").trim() : "(the menu is closed)";
        throw new Error(`after "zzq" the Open menu shows: ${shown}`);
      });
      const rows = await menu.getByRole("menuitem").count();
      expect(rows === 0, `${rows} rows under "No projects match."`);
      await page.keyboard.press("Escape");
      return `"zzq" → "No projects match.", no rows`;
    },
  },
  {
    title: "upload tray: Cancel stops an upload in flight and leaves no file; a refused upload fails, Retry finishes it",
    run: async ({ page }) => {
      await signedIn(page);
      await page.goto(`${APP}/project/${projects.drop.uuid}/takeoff/${dropSheets[0].uuid}`);
      await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
      // The storage part PUTs (presigned, not the api's): held, refused or passed by `mode`.
      let mode = "hold";
      let release;
      const held = new Promise((r) => (release = r));
      await page.route((url) => url.searchParams.has("partNumber") || url.searchParams.has("X-Amz-Signature"), async (route) => {
        if (route.request().method() !== "PUT") return route.continue();
        if (mode === "hold") await held;
        if (mode === "pass") return route.continue().catch(() => {});
        return route.abort("failed").catch(() => {});
      });
      const upload = async (name) => {
        await page.getByRole("button", { name: "Panel options" }).waitFor({ timeout: 10000 });
        // Add sheets' tree has the Upload; the tray steps aside under the screen, so it is closed.
        await page.getByRole("button", { name: "Add pages or folder" }).click();
        await page.getByRole("menuitem", { name: "Add Pages" }).click();
        await loadDialog(page).waitFor({ timeout: 10000 });
        await page.locator("[data-tree-upload]").setInputFiles({ name, mimeType: "application/pdf", buffer: pdf([DRAW], name) });
        await page.getByRole("dialog", { name: "Add sheets" }).getByRole("button", { name: "Cancel", exact: true }).click();
        await loadDialog(page).waitFor({ state: "detached", timeout: 10000 });
        const tray = page.getByRole("region", { name: "Uploads" }).or(page.locator("section[data-upload-tray]")).first();
        await tray.waitFor({ timeout: 10000 });
        const show = page.getByRole("button", { name: "Show the list" });
        if (await show.isVisible()) await show.click();
        return page.locator(`[data-upload-job="${name}"]`);
      };

      const cancelJob = await upload("Cancel me.pdf");
      await waitFor(async () => (await cancelJob.getAttribute("data-status")) === "uploading" || null, "Cancel me.pdf uploading", 15000);
      await page.getByRole("button", { name: "Cancel Cancel me.pdf" }).click();
      await waitFor(async () => (await cancelJob.getAttribute("data-status")) === "cancelled" || null, "Cancel me.pdf cancelled", 5000);
      mode = "refuse";
      release();
      await waitFor(async () => !(await files(projects.drop.uuid)).some((f) => f.file_name === "Cancel me.pdf") || null, "no file row left for Cancel me.pdf", 15000);

      const retryJob = await upload("Retry me.pdf");
      // Four tries a part, a second, two and four apart: then the row fails.
      await waitFor(async () => (await retryJob.getAttribute("data-status")) === "error" || null, "Retry me.pdf failed", 40000);
      const trayState = await page.locator("section[data-upload-tray]").getAttribute("data-upload-tray");
      mode = "pass";
      await page.getByRole("button", { name: "Retry Retry me.pdf" }).click();
      await waitFor(async () => (await retryJob.getAttribute("data-status")) === "done" || null, "Retry me.pdf done after Retry", 30000);
      const landed = await waitFor(async () => (await files(projects.drop.uuid)).find((f) => f.file_name === "Retry me.pdf" && f.uploaded_at), "Retry me.pdf uploaded in the api", 15000);
      await page.unroute(() => true).catch(() => {});
      return `Cancel me.pdf: cancelled, no file row · Retry me.pdf: failed (tray "${trayState}"), Retry → done, ${landed.byte_size} bytes in the api`;
    },
  },
]);

await rm(ROOT, { recursive: true, force: true });
