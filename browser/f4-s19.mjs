// F4-S19: folder counts. Files only, every descendant's included, a zero drawn faded,
// and an upload moves every count on the way up.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s19.mjs

import { apiCall, expect, run } from "./lib/bench.mjs";
import { folderPaths, freshWorkspace, makeProject, openFiles, seedFile } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S19 counts");
const job = await makeProject(token, base, { name: "Count house", seed_folders: true });
const folderUrl = `${base}/${job.uuid}/folder`;

let paths = await folderPaths(token, base, job.uuid);
const plans = paths.get("Plans");
const addenda = (await apiCall(token, "POST", folderUrl, { name: "Addenda", parent_uuid: plans.uuid })).body;

const tree = (page) => page.locator("[data-file-browser] nav");
const badge = (page, name) =>
  tree(page).locator(`[data-tree-folder="${name}"]`).locator("xpath=..").locator("[data-count]");

await run("f4-s19", [
  {
    title: "AC1 — Plans with 2 files and Addenda with 1: Plans reads 3, Addenda 1, the project 3",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await seedFile(page, token, base, job.uuid, plans.uuid, "A-101.pdf", Buffer.alloc(2048, 1));
      await seedFile(page, token, base, job.uuid, plans.uuid, "A-102.pdf", Buffer.alloc(2048, 2));
      await seedFile(page, token, base, job.uuid, addenda.uuid, "ADD-1.pdf", Buffer.alloc(2048, 3));
      // An upload left unfinished is not a file yet, and is not counted.
      await seedFile(page, token, base, job.uuid, addenda.uuid, "half.pdf", Buffer.alloc(9 * 1024 * 1024, 4), { parts: 1 });
      await page.reload();
      await tree(page).locator('[data-tree-folder="Plans"]').click();
      await page.getByRole("button", { name: "Expand Plans" }).click().catch(() => {});
      await tree(page).locator('[data-tree-folder="Addenda"]').waitFor();
      const read = {
        plans: await badge(page, "Plans").innerText(),
        addenda: await badge(page, "Addenda").innerText(),
        root: await tree(page).locator("[data-tree-root]").locator("xpath=..").locator("[data-count]").innerText(),
        tooltip: await badge(page, "Plans").getAttribute("title"),
      };
      expect(read.plans === "3" && read.addenda === "1" && read.root === "3", JSON.stringify(read));
      expect(read.tooltip === "3 files", `tooltip ${read.tooltip}`);
      const api = (await apiCall(token, "GET", folderUrl)).body.find((f) => f.name === "Plans").file_count;
      expect(api === 3, `api file_count ${api}`);
      return `Plans ${read.plans} ("${read.tooltip}") · Addenda ${read.addenda} · project ${read.root} · half-uploaded not counted`;
    },
  },
  {
    title: "AC2 — an empty folder shows a faded 0",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const zero = badge(page, "Specs");
      const text = await zero.innerText();
      const classes = (await zero.getAttribute("class")) ?? "";
      const full = (await badge(page, "Plans").getAttribute("class")) ?? "";
      expect(text === "0", `Specs reads ${text}`);
      expect(classes.includes("text-muted-foreground/60") && !full.includes("/60"), `classes: ${classes}`);
      const shade = await zero.evaluate((el) => getComputedStyle(el).color);
      const fullShade = await badge(page, "Plans").evaluate((el) => getComputedStyle(el).color);
      expect(shade !== fullShade, "the zero is drawn like any other count");
      return `Specs 0, ${shade} against ${fullShade}`;
    },
  },
  {
    title: "AC3 — upload a file into Addenda: Addenda, Plans and the project all move",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await tree(page).locator('[data-tree-folder="Plans"]').click();
      await page.getByRole("button", { name: "Expand Plans" }).click().catch(() => {});
      await tree(page).locator('[data-tree-folder="Addenda"]').click();
      await page.locator("[data-upload-files]").setInputFiles({ name: "ADD-2.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(4096, 5) });
      const picker = page.getByRole("dialog", { name: "Where should these files go?" });
      const target = await picker.locator("[data-picker-target]").innerText();
      expect(/to Addenda\./.test(target), `picker: ${target}`);
      await picker.getByRole("button", { name: "Confirm upload" }).click();
      await page.getByText("Uploaded 1 file").waitFor({ timeout: 30000 });
      await page.waitForFunction(() => {
        const row = document.querySelector('[data-tree-folder="Addenda"]')?.parentElement;
        return row?.querySelector("[data-count]")?.textContent === "2";
      }, null, { timeout: 15000 });
      const read = `${await badge(page, "Addenda").innerText()}/${await badge(page, "Plans").innerText()}`;
      expect(read === "2/4", `Addenda/Plans read ${read}`);
      paths = await folderPaths(token, base, job.uuid);
      return `picker "${target}" · Addenda 2, Plans 4`;
    },
  },
]);
