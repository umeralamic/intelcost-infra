// Every dialog fits the window: never taller than it, the title and the action buttons in
// view, the body scrolling between them, and the first field reachable. Driven at a
// short laptop window (1280x650) and a phone (375x667), where New project's name field
// was cut off above the top of the screen with no way to scroll to it.
//
//   docker compose --profile browser run --rm browser node scripts/f4-dialogs.mjs
//
// The takeoff Set-the-scale dialog is not here: it needs a rendered sheet, and it has the
// same structure as the ones that are.
//
// Updated 2026-10-24 (D-314, D-315, D-311, D-309, D-566):
// - New project (steps 1, 5): it opens over the All projects dialog (D-314), so there are two
//   dialog bodies on the page: `fits` scrolls the body of the dialog under test, and New project is
//   the All projects header's button. Step 2's button is "Create" (D-311 6), and a created project
//   lands on its takeoff, `/project/<uuid>/takeoff` (D-311), not a page headed by its name.
// - Edit details (steps 2, 6): Project Home and its pencil are gone (D-315 C5): `/project/<uuid>`
//   opens the takeoff with the "Edit Project" dialog (D-315 1), whose name field and Save are checked.
// - The file dialogs (steps 3, 7): the file browser is gone (D-315 C5); its housekeeping is the load
//   screen's tree (D-315 2), opened as All projects' Files does, `?files=<project>&from=projects`. New
//   folder is the tree's toolbar button; Move… is the Specs folder row's right-click menu. A project
//   starts with no folders (D-309), so Specs is POSTed, and a file is put in it (the tree lists
//   folders only once the project has a file), in a project of its own ("Files job", opened only
//   through Files, which is no visit): a project with files and no sheets opens its first-run load
//   screen when Home lands on it, over the All projects and New project dialogs (reported). Retired: Upload folder's destination dialog
//   ("Where should this folder go?", `DestinationPicker`) was removed by D-315 C5; the tree's
//   Upload goes straight into the folder in focus (D-315 2).
// - The confirm (steps 4, 8): a row's Move to Trash is a context-menu item of the All projects row
//   (D-314), not a button on the row; the list is the All projects dialog, All tab.
// - The link prompt (steps 4, 8): Scope of Work is an inline editor in Edit Project (D-315 1), whose
//   Link button opens the same "Add a link" prompt.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, rowNames, seedFile } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4 dialogs");
const job = await makeProject(token, base, { name: "Dialog job" });
// The file dialogs get a project of their own, opened only through Files (not a visit, D-315 2):
// Home then lands on Dialog job, which has no files for a first-run load screen to offer.
const filesJob = await makeProject(token, base, { name: "Files job" });
// No seed folders since D-309: the folder the Move dialog is opened on is made here.
const specs = (await apiCall(token, "POST", `${base}/${filesJob.uuid}/folder`, { name: "Specs" })).body;
let seeded = false;

const SIZES = [
  { label: "1280x650", width: 1280, height: 650 },
  { label: "phone 375x667", width: 375, height: 667 },
];

/** Whole box inside the window, and the thing actually on top at its centre. */
async function inView(page, locator, what) {
  await locator.waitFor({ timeout: 15000 });
  const box = await locator.boundingBox();
  const vp = page.viewportSize();
  expect(box, `${what}: no box`);
  const inside =
    box.y >= 0 && box.y + box.height <= vp.height + 0.5 && box.x >= 0 && box.x + box.width <= vp.width + 0.5;
  expect(inside, `${what} is outside the ${vp.width}x${vp.height} window: y ${Math.round(box.y)}..${Math.round(box.y + box.height)}`);
  const onTop = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit) || (hit && hit.contains(el));
  });
  expect(onTop, `${what} is covered`);
}

/**
 * The rule, for one open dialog: title and action in view; the first field reachable
 * with them still in view; the body scrolled to its end with them still in view; and the
 * page never wider than the window. The body is the one of `dialog`, the dialog under test:
 * another may be open beneath it (D-314).
 */
async function fits(page, { dialog, title, first, action }) {
  await inView(page, title, "the title");
  await inView(page, action, "the action button");
  if (first) {
    await first.scrollIntoViewIfNeeded();
    await inView(page, first, "the first field");
    await first.focus();
  }
  const body = dialog.locator("[data-dialog-body]");
  let scrolls = false;
  if ((await body.count()) > 0) {
    scrolls = await body.first().evaluate((el) => {
      const more = el.scrollHeight > el.clientHeight + 1;
      el.scrollTop = el.scrollHeight;
      return more;
    });
  }
  await inView(page, title, "the title, body scrolled to the end");
  await inView(page, action, "the action button, body scrolled to the end");
  // The dialog, not the page behind it: at phone width the app's top bar is wider than
  // the screen (a separate finding), and the dialog is fixed to the window regardless.
  const over = await page.evaluate(() =>
    Math.max(
      0,
      ...[...document.querySelectorAll('[role="dialog"]')].map(
        (el) => Math.max(el.getBoundingClientRect().right - window.innerWidth, -el.getBoundingClientRect().left),
      ),
    ),
  );
  expect(over <= 0.5, `the dialog runs ${Math.round(over)}px past the window's side`);
  return scrolls;
}

async function signIn(page) {
  await signInAs(page, (await fixtureOwner()).email, SEEDED.password);
  await enterWorkspace(page, workspace.uuid);
}

/** `/project/<uuid>` is the takeoff with Edit Project open (D-315 C5). */
async function openEdit(page) {
  await page.goto(`${APP}/project/${job.uuid}`);
  const dialog = page.getByRole("dialog", { name: /Edit Project/ });
  await dialog.locator("form[data-edit-project]").waitFor({ timeout: 20000 });
  return dialog;
}

const steps = [];
for (const size of SIZES) {
  const at = async (page) => page.setViewportSize({ width: size.width, height: size.height });

  steps.push({
    title: `${size.label} — New project: Project name and Next in view; step 2's Create in view`,
    run: async ({ page }) => {
      await at(page);
      await openDashboard(page, workspace.uuid);
      await page.getByRole("dialog", { name: "All projects" }).getByRole("button", { name: "New project" }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      const scrolls = await fits(page, {
        dialog,
        title: dialog.getByRole("heading", { name: "New project" }),
        first: page.locator("#new-project-name"),
        action: dialog.getByRole("button", { name: "Next" }),
      });
      await page.locator("#new-project-name").fill(`Fits ${size.width}`);
      await dialog.getByRole("button", { name: "Next" }).click();
      await dialog.getByRole("heading", { name: "Add files" }).waitFor();
      await fits(page, {
        dialog,
        title: dialog.getByRole("heading", { name: "New project" }),
        first: null,
        action: dialog.getByRole("button", { name: "Create", exact: true }),
      });
      await dialog.getByRole("button", { name: "Create", exact: true }).click();
      await page.waitForURL(/\/project\/[0-9a-f-]{36}\/takeoff/, { timeout: 20000 });
      await page.getByText(`Fits ${size.width}`, { exact: true }).first().waitFor({ timeout: 20000 });
      return `step 1 ${scrolls ? "scrolls inside" : "fits whole"} · name, Next, Create all reachable · created, on its takeoff`;
    },
  });

  steps.push({
    title: `${size.label} — Edit Project: name and Save in view`,
    run: async ({ page }) => {
      await at(page);
      await signIn(page);
      const dialog = await openEdit(page);
      const scrolls = await fits(page, {
        dialog,
        title: dialog.getByRole("heading", { name: "Edit Project" }),
        first: page.locator("#edit-project-name"),
        action: dialog.getByRole("button", { name: "Save" }),
      });
      return scrolls ? "scrolls inside" : "fits whole";
    },
  });

  steps.push({
    title: `${size.label} — the file dialogs in the load screen's tree: New folder, Move`,
    run: async ({ page }) => {
      await at(page);
      await signIn(page);
      if (!seeded) {
        await seedFile(page, token, base, filesJob.uuid, specs.uuid, "Division 03.pdf", Buffer.alloc(4096, 3));
        seeded = true;
      }
      await page.goto(`${APP}/?files=${filesJob.uuid}&from=projects`);
      const files = page.locator("[data-load-tree]");
      await files.locator('[data-load-folder="Specs"]').waitFor({ timeout: 20000 });

      await files.getByRole("button", { name: "New folder" }).first().click();
      let dialog = page.getByRole("dialog", { name: "New folder" });
      await fits(page, { dialog, title: dialog.getByRole("heading"), first: dialog.getByLabel("Name"), action: dialog.getByRole("button", { name: "Create" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await dialog.waitFor({ state: "detached" });

      await files.locator('[data-load-folder="Specs"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move…" }).click();
      dialog = page.getByRole("dialog", { name: "Move folder" });
      await fits(page, { dialog, title: dialog.getByRole("heading"), first: null, action: dialog.getByRole("button", { name: "Move here" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      return "both fit";
    },
  });

  steps.push({
    title: `${size.label} — the confirm, the prompt, Lost and Add status`,
    run: async ({ page }) => {
      await at(page);
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await rowNames(page);
      const list = page.getByRole("dialog", { name: "All projects" });

      await list.locator('li[data-project="Dialog job"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move to Trash" }).click();
      let dialog = page.getByRole("dialog", { name: "Move project to Trash?" });
      await fits(page, { dialog, title: dialog.getByRole("heading"), first: null, action: dialog.getByRole("button", { name: "Move to Trash" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await dialog.waitFor({ state: "detached" });

      await page.locator(`[data-status-picker="${job.uuid}"]`).click();
      await page.getByRole("menuitem", { name: "Lost" }).click();
      dialog = page.getByRole("dialog", { name: "Mark as Lost" });
      await fits(page, { dialog, title: dialog.getByRole("heading", { name: "Mark as Lost" }), first: null, action: dialog.getByRole("button", { name: "Save" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.goto(`${APP}/settings/statuses`);
      await page.getByRole("button", { name: "Add closed status" }).click();
      dialog = page.getByRole("dialog", { name: "Add status" });
      await fits(page, { dialog, title: dialog.getByRole("heading", { name: "Add status" }), first: page.locator("#status-label"), action: dialog.getByRole("button", { name: "Save" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      const edit = await openEdit(page);
      await edit.locator('[data-edit-text="scope"] [data-rich-editor]').waitFor({ timeout: 20000 });
      await edit.locator('[data-edit-text="scope"]').getByRole("button", { name: "Link", exact: true }).click();
      dialog = page.getByRole("dialog", { name: "Add a link" });
      await fits(page, { dialog, title: dialog.getByRole("heading"), first: page.locator("#prompt-value"), action: dialog.getByRole("button", { name: "Add link" }) });
      return "Trash confirm, Lost, Add status and the link prompt all fit";
    },
  });
}

await run("f4-dialogs", steps);
