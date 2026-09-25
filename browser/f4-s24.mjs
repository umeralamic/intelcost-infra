// F4-S24: Scope of Work and Project Notes, rich text saved on Save only, sanitised in the
// browser and again by the api (nh3), capped at 50,000 characters.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s24.mjs

import { apiCall, expect, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, makeProject, openFiles } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S24 text");
const job = await makeProject(token, base, { name: "Text job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s24");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body;

const panel = (page, field) => page.locator(`[data-text-panel="${field}"]`);

async function startEditing(page, field, title) {
  await panel(page, field).getByRole("button", { name: `Edit ${title}` }).first().click();
  await panel(page, field).locator("[data-rich-editor] .tiptap").waitFor({ timeout: 15000 });
}

await run("f4-s24", [
  {
    title: "AC1 — a bold, bulleted scope with a link; Save; reload: it renders the same, the link opens a new tab",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      await startEditing(page, "scope_of_work", "Scope of Work");
      const box = panel(page, "scope_of_work");
      await page.keyboard.press("Control+b");
      await page.keyboard.type("Concrete");
      await page.keyboard.press("Control+b");
      await page.keyboard.type(" per spec");
      for (let i = 0; i < 4; i += 1) await page.keyboard.press("Shift+ArrowLeft");
      await box.getByRole("button", { name: "Link" }).click();
      await page.getByLabel("Link URL").fill("example.com/spec");
      await page.getByRole("button", { name: "Add link" }).click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await box.getByRole("button", { name: "Bulleted list" }).click();
      await page.keyboard.type("Footings");
      await page.keyboard.press("Enter");
      await page.keyboard.type("Slab on grade");
      await box.getByRole("button", { name: "Save" }).click();
      await box.locator("[data-rich-read]").waitFor({ timeout: 10000 });

      const stored = (await read()).scope_of_work;
      expect(/<strong>Concrete<\/strong>/.test(stored), `bold missing: ${stored}`);
      expect(/<a href="https:\/\/example\.com\/spec">spec<\/a>/.test(stored), `link missing: ${stored}`);
      expect(/<ul><li><p>Footings<\/p><\/li><li><p>Slab on grade<\/p><\/li><\/ul>/.test(stored), `list missing: ${stored}`);
      await page.reload();
      const rendered = box.locator("[data-rich-read]");
      await rendered.waitFor();
      const link = rendered.locator("a");
      const target = await link.getAttribute("target");
      const rel = await link.getAttribute("rel");
      expect(target === "_blank" && /noopener/.test(rel ?? ""), `link opens with target=${target} rel=${rel}`);
      expect((await rendered.locator("strong").innerText()) === "Concrete", "bold lost after reload");
      expect((await rendered.locator("li").count()) === 2, "list lost after reload");
      return `stored ${stored.length} chars · after reload: bold, 2 bullets, link target=_blank rel="${rel}"`;
    },
  },
  {
    title: "AC2 — Cancel discards the edit",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      const before = (await read()).scope_of_work;
      await startEditing(page, "scope_of_work", "Scope of Work");
      await page.keyboard.type(" and more that is thrown away");
      await panel(page, "scope_of_work").getByRole("button", { name: "Cancel" }).click();
      const shown = await panel(page, "scope_of_work").locator("[data-rich-read]").innerText();
      expect(!/thrown away/.test(shown), "the draft is still shown");
      expect((await read()).scope_of_work === before, "the api changed");
      return "draft gone, stored value unchanged";
    },
  },
  {
    title: "AC3 — paste <img src=x onerror=…> into Project Notes: nothing runs, now or after reload",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid);
      let dialogs = 0;
      page.on("dialog", async (d) => {
        dialogs += 1;
        await d.dismiss();
      });
      await startEditing(page, "project_notes", "Project Notes");
      await page.evaluate(() => {
        const target = document.querySelector('[data-text-panel="project_notes"] .tiptap');
        const data = new DataTransfer();
        data.setData("text/html", '<p>Site note</p><img src=x onerror="window.__xss=1;alert(1)"><script>window.__xss=2</script>');
        data.setData("text/plain", "Site note");
        target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      });
      await panel(page, "project_notes").getByRole("button", { name: "Save" }).click();
      await panel(page, "project_notes").locator("[data-rich-read]").waitFor({ timeout: 10000 });
      const stored = (await read()).project_notes;
      await page.reload();
      await panel(page, "project_notes").locator("[data-rich-read]").waitFor();
      await page.waitForTimeout(500);
      const flag = await page.evaluate(() => window.__xss ?? null);
      expect(flag === null && dialogs === 0, `ran: flag ${flag}, ${dialogs} dialogs`);
      expect(!/<img|onerror|<script/i.test(stored), `stored: ${stored}`);
      expect(/Site note/.test(stored), `the text itself was lost: ${stored}`);
      return `stored "${stored}" · nothing ran`;
    },
  },
  {
    title: "AC4 — a hand-written PATCH with a <script> and an onclick is stored stripped",
    run: async () => {
      const patch = await apiCall(token, "PATCH", `${base}/${job.uuid}`, {
        project_notes: '<p onclick="steal()">Hi<script>alert(1)</script> <a href="javascript:alert(1)">x</a> <a href="https://ok.example">ok</a></p>',
      });
      expect(patch.status === 200, `PATCH ${patch.status}`);
      const stored = (await read()).project_notes;
      expect(!/script|onclick|javascript:/i.test(stored), `stored: ${stored}`);
      expect(/<a href="https:\/\/ok\.example">ok<\/a>/.test(stored), `the good link was lost: ${stored}`);
      return `stored: ${stored}`;
    },
  },
  {
    title: "AC5 — over 50,000 characters is refused with a sentence",
    run: async () => {
      const huge = `<p>${"x".repeat(50_001)}</p>`;
      const patch = await apiCall(token, "PATCH", `${base}/${job.uuid}`, { scope_of_work: huge });
      expect(patch.status === 422, `PATCH ${patch.status}`);
      expect(/^Scope of Work is 50,008 characters, over the 50,000 limit\./.test(patch.body.detail), `detail: ${patch.body.detail}`);
      return `${patch.status}: "${patch.body.detail}"`;
    },
  },
  {
    title: "AC6 — as qa_pricing the panels are read-only, and the api refuses",
    run: async ({ page }) => {
      await openFiles(page, workspace.uuid, job.uuid, qa.email);
      const edits = await page.getByRole("button", { name: /^Edit (Scope of Work|Project Notes)$/ }).count();
      expect(edits === 0, `${edits} edit controls for qa_pricing`);
      await panel(page, "scope_of_work").locator("[data-rich-read]").click();
      expect((await page.locator("[data-rich-editor]").count()) === 0, "a click opened the editor");
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { scope_of_work: "<p>no</p>" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `no edit control · a click does nothing · api ${patch.status}`;
    },
  },
]);
