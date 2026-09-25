// Every dialog fits the window: never taller than it, the title and the action buttons in
// view, the body scrolling between them, and the first field reachable. Driven at a
// short laptop window (1280x650) and a phone (375x667), where New project's name field
// was cut off above the top of the screen with no way to scroll to it.
//
//   docker compose --profile browser run --rm browser node scripts/f4-dialogs.mjs
//
// The takeoff Set-the-scale dialog is not here: it needs a rendered sheet, and it has the
// same structure as the ones that are.

import { mkdir, rm, writeFile } from "node:fs/promises";

import { APP, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openDashboard, openFiles, rowNames } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4 dialogs");
const job = await makeProject(token, base, { name: "Dialog job" });

const FOLDER = "/tmp/f4-dialogs/Survey";
await rm("/tmp/f4-dialogs", { recursive: true, force: true });
await mkdir(`${FOLDER}/North`, { recursive: true });
await writeFile(`${FOLDER}/North/n1.txt`, "n1");

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
 * page never wider than the window.
 */
async function fits(page, { title, first, action }) {
  await inView(page, title, "the title");
  await inView(page, action, "the action button");
  if (first) {
    await first.scrollIntoViewIfNeeded();
    await inView(page, first, "the first field");
    await first.focus();
  }
  const body = page.locator("[data-dialog-body]");
  let scrolls = false;
  if ((await body.count()) > 0) {
    scrolls = await body.evaluate((el) => {
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

const steps = [];
for (const size of SIZES) {
  const at = async (page) => page.setViewportSize({ width: size.width, height: size.height });

  steps.push({
    title: `${size.label} — New project: Project name and Next in view; step 2's Create in view`,
    run: async ({ page }) => {
      await at(page);
      await openDashboard(page, workspace.uuid);
      await page.getByRole("button", { name: "New project" }).click();
      const dialog = page.getByRole("dialog", { name: "New project" });
      const scrolls = await fits(page, {
        title: dialog.getByRole("heading", { name: "New project" }),
        first: page.locator("#new-project-name"),
        action: dialog.getByRole("button", { name: "Next" }),
      });
      await page.locator("#new-project-name").fill(`Fits ${size.width}`);
      await dialog.getByRole("button", { name: "Next" }).click();
      await dialog.getByRole("heading", { name: "Add files" }).waitFor();
      await fits(page, {
        title: dialog.getByRole("heading", { name: "New project" }),
        first: null,
        action: dialog.getByRole("button", { name: "Create project" }),
      });
      await dialog.getByRole("button", { name: "Create project" }).click();
      await page.getByRole("heading", { name: `Fits ${size.width}` }).waitFor({ timeout: 20000 });
      return `step 1 ${scrolls ? "scrolls inside" : "fits whole"} · name, Next, Create all reachable · created`;
    },
  });

  steps.push({
    title: `${size.label} — Edit details: name and Save in view`,
    run: async ({ page }) => {
      await at(page);
      await openDashboard(page, workspace.uuid);
      await page.goto(`${APP}/project/${job.uuid}`);
      await page.getByRole("button", { name: "Edit details" }).click();
      const dialog = page.getByRole("dialog", { name: "Edit project details" });
      const scrolls = await fits(page, {
        title: dialog.getByRole("heading", { name: "Edit project details" }),
        first: page.locator("#edit-project-name"),
        action: dialog.getByRole("button", { name: "Save" }),
      });
      return scrolls ? "scrolls inside" : "fits whole";
    },
  });

  steps.push({
    title: `${size.label} — the file dialogs: New folder, Move, Upload folder's destination`,
    run: async ({ page }) => {
      await at(page);
      await openFiles(page, workspace.uuid, job.uuid);
      const files = page.locator("[data-file-browser]");

      await files.getByRole("button", { name: "New folder" }).first().click();
      let dialog = page.getByRole("dialog", { name: "New folder" });
      await fits(page, { title: dialog.getByRole("heading"), first: dialog.getByLabel("Name"), action: dialog.getByRole("button", { name: "Create" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await files.locator('[data-tree-folder="Specs"]').click({ button: "right" });
      await page.getByRole("menuitem", { name: "Move…" }).click();
      dialog = page.getByRole("dialog", { name: "Move folder" });
      await fits(page, { title: dialog.getByRole("heading"), first: null, action: dialog.getByRole("button", { name: "Move here" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.locator("[data-upload-folder]").setInputFiles(FOLDER);
      dialog = page.getByRole("dialog", { name: "Where should this folder go?" });
      await fits(page, { title: dialog.getByRole("heading"), first: dialog.getByLabel("Search folders"), action: dialog.getByRole("button", { name: "Confirm upload" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      return "all three fit";
    },
  });

  steps.push({
    title: `${size.label} — the confirm, the prompt, Lost and Add status`,
    run: async ({ page }) => {
      await at(page);
      await openDashboard(page, workspace.uuid, undefined, "/?tab=all");
      await rowNames(page);

      await page.getByRole("button", { name: "Move Dialog job to Trash" }).click();
      let dialog = page.getByRole("dialog", { name: "Move project to Trash?" });
      await fits(page, { title: dialog.getByRole("heading"), first: null, action: dialog.getByRole("button", { name: "Move to Trash" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.locator(`[data-status-picker="${job.uuid}"]`).click();
      await page.getByRole("menuitem", { name: "Lost" }).click();
      dialog = page.getByRole("dialog", { name: "Mark as Lost" });
      await fits(page, { title: dialog.getByRole("heading", { name: "Mark as Lost" }), first: null, action: dialog.getByRole("button", { name: "Save" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.goto(`${APP}/settings/statuses`);
      await page.getByRole("button", { name: "Add closed status" }).click();
      dialog = page.getByRole("dialog", { name: "Add status" });
      await fits(page, { title: dialog.getByRole("heading", { name: "Add status" }), first: page.locator("#status-label"), action: dialog.getByRole("button", { name: "Save" }) });
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await page.goto(`${APP}/project/${job.uuid}`);
      await page.getByRole("button", { name: "Edit Scope of Work" }).first().click();
      await page.locator("[data-rich-editor]").first().waitFor({ timeout: 20000 });
      await page.getByRole("button", { name: "Link", exact: true }).first().click();
      dialog = page.getByRole("dialog", { name: "Add a link" });
      await fits(page, { title: dialog.getByRole("heading"), first: page.locator("#prompt-value"), action: dialog.getByRole("button", { name: "Add link" }) });
      return "Trash confirm, Lost, Add status and the link prompt all fit";
    },
  });
}

await run("f4-dialogs", steps);
await rm("/tmp/f4-dialogs", { recursive: true, force: true });
