// F4-S2 — the UI primitives every F4 screen is built on.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s2.mjs
//
// The app had a confirm, a prompt and a context menu, and nothing else: no general
// dialog, tabs, select, dropdown, date input, progress bar or toast. Each is written
// once here, and driven before any screen leans on it. Until those screens exist they
// are driven on `/dev/ui`, a page the dev server serves and a production build does not
// contain (checked by `drives/f4-s2-bundle.sh`, since `dist/` lives in the app image).
//
// Every assertion reads a value back (`output[data-readout]`), not a pixel, and every
// primitive is driven by keyboard, because a control only a mouse can reach is not done.

import { APP, SEEDED, expect, run, signInAs } from "./lib/bench.mjs";

const GALLERY = `${APP}/dev/ui`;

const readout = (page, name) => page.locator(`output[data-readout="${name}"]`).innerText();

/** Where focus is, as something a message can print. */
const focused = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}:${(el.textContent ?? "").trim().slice(0, 24)}` : "none";
  });

await run("f4-s2", [
  {
    title: "AC1 — tabs, select and menu work by keyboard alone",
    run: async ({ page }) => {
      await page.goto(GALLERY);
      await page.getByRole("tab", { name: /Active/ }).focus();
      await page.keyboard.press("ArrowRight");
      expect((await readout(page, "tab")) === "submitted", "ArrowRight did not move to Submitted");
      await page.keyboard.press("End");
      expect((await readout(page, "tab")) === "all", "End did not reach All");
      await page.keyboard.press("Home");
      expect((await readout(page, "tab")) === "active", "Home did not return to Active");
      const tabStops = await page.locator('[role="tab"][tabindex="0"]').count();
      expect(tabStops === 1, `${tabStops} tabs sit in the Tab order, not 1`);

      await page.locator("#gallery-project-type").focus();
      await page.keyboard.press("ArrowDown");
      expect((await readout(page, "select")) === "residential", "ArrowDown did not pick Residential");
      await page.selectOption("#gallery-project-type", "");
      expect((await readout(page, "select")) === "null", "Unspecified did not read back as null");

      const trigger = page.getByRole("button", { name: "Change status" });
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      await page.getByRole("menu", { name: "Change status" }).waitFor();
      const headings = await page.locator('[role="menu"] [role="presentation"]').allInnerTexts();
      expect(headings.join(",").toLowerCase() === "active,closed", `group headings: ${headings.join(",")}`);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      expect((await readout(page, "menu")) === "submitted", `menu picked ${await readout(page, "menu")}`);
      expect((await focused(page)).includes("Change status"), `focus after select: ${await focused(page)}`);

      // End skips the disabled Lost and lands on Won; Escape closes without choosing.
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      expect((await readout(page, "menu")) === "won", "End did not skip the disabled item");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
      expect((await page.getByRole("menu").count()) === 0, "Escape left the menu open");
      return "tabs: arrows, Home, End, one tab stop · select: arrow and back to null · menu: groups, arrows, End skips disabled, Escape";
    },
  },
  {
    title: "AC1 — the dialog takes focus, keeps Tab inside, and gives focus back on close",
    run: async ({ page }) => {
      await page.goto(GALLERY);
      await page.getByRole("button", { name: "Open dialog" }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      expect((await focused(page)).startsWith("input#gallery-note-field"), `first focus: ${await focused(page)}`);
      for (let i = 0; i < 7; i += 1) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() =>
          Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement)),
        );
        expect(inside, `Tab ${i + 1} left the dialog, to ${await focused(page)}`);
      }
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Escape");
      expect((await page.getByRole("dialog").count()) === 0, "Escape did not close");
      expect((await focused(page)).includes("Open dialog"), `focus after close: ${await focused(page)}`);
      return "autofocus lands in the field · 7 Tabs stay inside · Escape closes · focus returns to the opener";
    },
  },
  {
    title: "AC2 — a date west of UTC reads back as the day picked (Los Angeles, Honolulu)",
    run: async ({ context }) => {
      const results = [];
      for (const timezoneId of ["America/Los_Angeles", "Pacific/Honolulu"]) {
        const browser = context.browser();
        const zoned = await browser.newContext({ timezoneId, locale: "en-US" });
        const page = await zoned.newPage();
        await page.goto(GALLERY);
        await page.fill("#gallery-date", "2026-10-01");
        const value = await readout(page, "date");
        const shown = await readout(page, "date-shown");
        const offset = await page.evaluate(() => new Date().getTimezoneOffset());
        await zoned.close();
        expect(offset > 0, `${timezoneId} is not west of UTC here (offset ${offset})`);
        expect(value === "2026-10-01", `${timezoneId}: value ${value}`);
        expect(shown === "Oct 1, 2026", `${timezoneId}: shown "${shown}"`);
        results.push(`${timezoneId} ${value} "${shown}"`);
      }
      return results.join(" · ");
    },
  },
  {
    title: "AC3 — while saving, Escape and the backdrop do nothing; after, it closes and reopens empty",
    run: async ({ page }) => {
      await page.goto(GALLERY);
      await page.getByRole("button", { name: "Open dialog" }).click();
      await page.fill("#gallery-note-field", "held open");
      await page.getByRole("button", { name: "Save" }).click();
      await page.getByRole("button", { name: "Saving" }).waitFor();

      await page.keyboard.press("Escape");
      await page.mouse.click(5, 5);
      expect((await page.getByRole("dialog").count()) === 1, "the dialog closed while saving");

      await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
      expect((await readout(page, "dialog")) === "held open", "the save did not complete");

      await page.getByRole("button", { name: "Open dialog" }).click();
      expect((await page.inputValue("#gallery-note-field")) === "", "reopened holding the old text");
      await page.mouse.click(5, 5);
      expect((await page.getByRole("dialog").count()) === 0, "the backdrop did not close an idle dialog");
      await page.getByRole("button", { name: "Open dialog" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();
      expect((await page.getByRole("dialog").count()) === 0, "Cancel did not close");
      return "Escape and backdrop ignored mid-save · closes on completion · reopens empty · backdrop and Cancel close it idle";
    },
  },
  {
    title: "AC3b — the progress bar reports its value, and a toast appears",
    run: async ({ page }) => {
      await page.goto(GALLERY);
      await page.getByRole("button", { name: "Add 25" }).click();
      await page.getByRole("button", { name: "Add 25" }).click();
      const now = await page.getByRole("progressbar", { name: "Upload" }).getAttribute("aria-valuenow");
      expect(now === "50", `aria-valuenow ${now}`);
      await page.getByRole("button", { name: "Show toast" }).click();
      await page.getByText("Project created").waitFor({ timeout: 5000 });
      await page.getByText("2 files uploaded.").waitFor();
      return "progressbar at 50 · toast shown with its description";
    },
  },
  {
    // Block C made this dialog two steps (F4-S7): a blank name now holds Next back
    // rather than being refused on submit, and the list shows rows, not card headings.
    title: "AC4 — New project opens the dialog, holds a blank name back, creates, toasts and lands on it",
    run: async ({ page }) => {
      await signInAs(page, SEEDED.email, SEEDED.password);
      await page.getByRole("button", { name: "New project" }).click();
      await page.getByRole("dialog", { name: "New project" }).waitFor();
      expect(await page.getByRole("button", { name: "Next" }).isDisabled(), "Next enabled with no name");

      const name = `F4-S2 dialog ${Date.now()}`;
      await page.fill("#new-project-name", name);
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: "Create project" }).click();
      await page.getByText("Project created").waitFor({ timeout: 10000 });
      await page.waitForURL(/\/project\/[0-9a-f-]{36}$/, { timeout: 10000 });
      await page.getByRole("heading", { name }).waitFor();

      await page.goto(`${APP}/?tab=all`);
      await page.getByRole("link", { name }).waitFor({ timeout: 10000 });
      await page.getByRole("button", { name: "New project" }).click();
      expect((await page.inputValue("#new-project-name")) === "", "the dialog reopened holding the old name");
      await page.keyboard.press("Escape");
      expect((await page.getByRole("dialog").count()) === 0, "Escape did not close New project");
      return "blank held back · created · toast · landed on its Home · listed · reopens empty";
    },
  },
]);
