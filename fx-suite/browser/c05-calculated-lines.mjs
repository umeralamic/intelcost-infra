// Click check C5 (docs/tasks/pending_umer.md): calculated earthwork lines belong to Calculate
// (D-352). After a Calculate, each calculated line in the Takeoff panel shows the excavator glyph
// as a plain mark, not a Resume button; a click on it opens nothing and arms nothing; a double-click
// on the row opens the line's details (read only); its ⋮ menu has Details and no Delete, no
// Properties, no Override, no Duplicate.
//
//   node fx-run-locked.mjs c05-calculated-lines
//
// The world: one throwaway workspace and project, one page at 1/6 ft per point; a 40 × 25 ft work
// boundary inside a ring of spots, EG 100 and FG 99 everywhere: 1,000 SF × 1 ft = 37.04 CY of cut,
// no fill, so Calculate writes at least the cut line and a Soil Export line.
//
// Left for the founder's eye: the excavator's drawing and tint, that the cursor does not suggest a
// button, how the details box reads.

import { expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { calculate, flatPad, grading, gradingSheets, openSheet, storedLines } from "./lib/grading-world.mjs";

const { token, workspace, base } = await freshWorkspace("C5 Calculated lines");
const project = await makeProject(token, base, { name: "Calculated lines" });
const g = grading(token, base, project);
let sheet;
let lines = [];

/** The row of an item in the Takeoff panel, its folders opened until it shows. */
async function rowOf(page, item) {
  const row = page.locator(`li[data-item-row="${item.uuid}"] > [role=row]`).first();
  for (let i = 0; i < 4 && !(await row.isVisible()); i++) {
    // Folders start closed on a new project: open every closed one in the panel.
    const closed = page.locator('[data-quantity-panel] button[aria-expanded="false"], [aria-label^="Expand"]');
    const n = await closed.count();
    if (n === 0) break;
    for (let k = 0; k < n; k++) await closed.nth(0).click().catch(() => undefined);
  }
  await row.waitFor({ timeout: 15000 }).catch(async (error) => {
    const names = await page.locator("li[data-item-row] [data-item-name]").allTextContents();
    throw new Error(`no row for "${item.name}" in the Takeoff panel; rows: ${names.join(" | ")}; ${error.message.split("\n")[0]}`);
  });
  return row;
}

/** Select a row by a click on its name, and wait until it reads selected. */
async function select(page, item) {
  const row = await rowOf(page, item);
  await row.locator("[data-item-name]").click();
  await page.waitForFunction((uuid) => document.querySelector(`li[data-item-row="${uuid}"] > [role=row]`)?.getAttribute("data-selected") === "1", item.uuid);
}

await run("c05-calculated-lines", [
  {
    title: "setup: a 40 × 25 ft boundary, EG spots at 100 and FG at 99, the assumptions saved",
    run: async ({ page }) => {
      [sheet] = await gradingSheets(page, token, base, workspace, project, ["C-1"]);
      await flatPad(g, sheet);
      await g.assume();
      return `sheet ${sheet.uuid}`;
    },
  },
  {
    title: "Calculate in the Earthwork tab: Cut reads 37 BCY, the api holds the result and its calculated lines",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "earthwork");
      const panel = await calculate(page);
      const cut = (await panel.locator('[data-volume="cut"]').textContent())?.trim();
      expect(cut === "37", `Cut reads "${cut}"`);
      lines = await storedLines(g, sheet, waitFor);
      expect(lines.every((l) => !l.is_stale), `stale lines: ${lines.filter((l) => l.is_stale).map((l) => l.name).join(", ")}`);
      return `Cut ${cut} BCY; lines: ${lines.map((l) => `${l.name} ${Number(l.quantity ?? l.effective_quantity ?? 0).toFixed(2)} ${l.unit}`).join(" · ")}`;
    },
  },
  {
    title: "Takeoff panel: each calculated line shows the excavator as a plain mark (no Resume button); a click on it opens nothing",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "takeoff");
      const seen = [];
      for (const line of lines) {
        const row = await rowOf(page, line);
        const glyph = row.locator("[data-type-icon]");
        expect((await glyph.count()) === 1, `${line.name}: no excavator mark`);
        expect((await glyph.getAttribute("title")) === "Earthwork", `${line.name}: the mark's title "${await glyph.getAttribute("title")}"`);
        expect((await glyph.evaluate((el) => el.tagName)) === "SPAN", `${line.name}: the mark is a ${await glyph.evaluate((el) => el.tagName)}`);
        expect((await row.locator("[data-resume-row]").count()) === 0, `${line.name}: a Resume button on the row`);
        const svg = await glyph.locator("svg").count();
        expect(svg === 1, `${line.name}: the mark draws ${svg} glyphs`);
        seen.push(line.name);
      }
      // A click on the mark: no dialog, no menu, no tool armed, the address unchanged.
      const before = page.url();
      const dialogs = await page.getByRole("dialog").count();
      const row = await rowOf(page, lines[0]);
      await row.locator("[data-type-icon]").click();
      // The page's answer to the click would be a dialog or a menu; wait until a second click
      // window (450 ms) has passed so a single click is all that was given.
      await page.waitForTimeout(600);
      const after = await page.getByRole("dialog").count();
      expect(after === dialogs, `a click on the mark opened ${after - dialogs} dialog(s)`);
      expect((await page.getByRole("menu").count()) === 0, "a click on the mark opened a menu");
      expect(page.url() === before, `the address moved: ${page.url()}`);
      return `${seen.length} calculated rows, each with the excavator as a plain mark: ${seen.join(" · ")}; a click on it opened nothing`;
    },
  },
  {
    title: "a double-click on a calculated row opens its details: its name, read only, no Properties dialog",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "takeoff");
      const line = lines[0];
      const row = await rowOf(page, line);
      await row.locator("[data-item-qty]").dblclick();
      const info = page.getByRole("dialog", { name: line.name });
      await info.waitFor({ timeout: 10000 });
      await info.locator("[data-line-info]").waitFor({ timeout: 5000 });
      const text = ((await info.locator("[data-line-info]").textContent()) ?? "").replace(/\s+/g, " ").trim();
      expect((await info.locator("input:not([type=checkbox]):not([disabled]), textarea").count()) === 0, "the details box has fields to type in");
      expect((await page.getByRole("dialog", { name: /Properties/ }).count()) === 0, "a Properties dialog opened");
      return `"${line.name}" details: ${text.slice(0, 200)}`;
    },
  },
  {
    title: "⋮ on a calculated row: Details, and no Delete, Properties, Override quantity or Duplicate",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "takeoff");
      const out = [];
      for (const line of lines) {
        const row = await rowOf(page, line);
        await row.hover();
        await page.getByRole("button", { name: `More actions for ${line.name}`, exact: true }).first().click();
        const menu = page.getByRole("menu").last();
        await menu.waitFor({ timeout: 5000 });
        const labels = (await menu.getByRole("menuitem").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") || (el.textContent ?? "").trim()))).filter(Boolean);
        for (const banned of ["Delete", "Delete on this sheet", "Properties", "Override quantity", "Duplicate"])
          expect(!labels.some((l) => l === banned || l.startsWith(`${banned} `)), `${line.name}: ⋮ has "${banned}" (${labels.join(", ")})`);
        expect(labels.includes("Details"), `${line.name}: ⋮ has no Details (${labels.join(", ")})`);
        out.push(`${line.name}: ${labels.join(", ")}`);
        await page.keyboard.press("Escape");
        await menu.waitFor({ state: "detached", timeout: 5000 });
      }
      // The api still has every line: nothing was deleted on the way.
      const still = (await g.items()).filter((i) => i.source_type === "earthwork_computed" && i.sheet_uuid === sheet.uuid);
      expect(still.length === lines.length, `lines now ${still.length}, were ${lines.length}`);
      return out.join(" · ");
    },
  },
  {
    title: "a calculated line selected: the toolbar's action group offers no Properties, Start, Resume, Copy or Delete (D-352)",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "takeoff");
      await select(page, lines[0]);
      const group = page.locator("[data-action-group]");
      const has = (await group.count()) > 0;
      const variant = has ? await group.first().getAttribute("data-action-group") : "none";
      const shown = has ? await group.first().locator("button").evaluateAll((els) => els.map((el) => ({ label: (el.textContent ?? "").trim(), on: !el.disabled }))) : [];
      // Shown at all, on or off, counts: only what D-352 allows is shown (D-639), and that is Details.
      const offered = shown.filter((b) => ["Properties", "Start", "Resume", "Deduct", "Copy", "Delete"].includes(b.label)).map((b) => b.label);
      const listed = shown.map((b) => `${b.label}${b.on ? "" : " (off)"}`).join(", ") || "none";
      expect(offered.length === 0, `with "${lines[0].name}" selected the toolbar's ${variant} group shows ${offered.join(", ")} (D-352: a calculated line has no Properties, shapes or Delete); the group: ${listed}`);
      expect(shown.length === 1 && shown[0].label === "Details" && shown[0].on, `the group should hold Details alone; it holds: ${listed}`);
      // Details opens the read-only details, never the Properties dialog.
      await group.first().locator("button").first().click();
      await page.getByRole("dialog", { name: lines[0].name }).locator("[data-line-info]").waitFor({ timeout: 10000 });
      expect((await page.getByRole("dialog", { name: /Properties/ }).count()) === 0, "Details opened a Properties dialog");
      await page.keyboard.press("Escape");
      return `${variant} group: ${listed}; Details opens the read-only details`;
    },
  },
  {
    title: "Delete in the toolbar (and the Delete key) on a selected calculated line leaves it: the api still has it, its quantity unchanged",
    run: async ({ page }) => {
      await openSheet(page, project, sheet, "takeoff");
      await select(page, lines[0]);
      const del = page.locator("[data-action-group] button").filter({ hasText: /^Delete$/ });
      const on = (await del.count()) > 0 && (await del.first().isEnabled());
      if (on) await del.first().click();
      else await page.keyboard.press("Delete");
      // A confirm, if one asks, is answered No: only a delete nobody asked about counts.
      const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog", { name: /Delete/ }));
      const asked = await confirm.first().waitFor({ timeout: 3000 }).then(() => true, () => false);
      const said = asked ? ((await confirm.first().textContent()) ?? "").replace(/\s+/g, " ").trim().slice(0, 160) : "";
      if (asked) await page.keyboard.press("Escape");
      const now = (await g.items()).find((i) => i.uuid === lines[0].uuid);
      const how = on ? "the toolbar's Delete" : "the Delete key";
      expect(now, `${how} deleted "${lines[0].name}"`);
      const q = (i) => Number(i.effective_quantity ?? i.quantity ?? 0);
      expect(Math.abs(q(now) - q(lines[0])) < 1e-6, `${how} changed "${lines[0].name}" from ${q(lines[0])} to ${q(now)}`);
      return `${how}: ${asked ? `asked "${said}", answered No` : "no question"}; the line stays at ${q(now).toFixed(2)} ${now.unit}`;
    },
  },
]);
