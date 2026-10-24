// F4-S24: Scope of Work and Project Notes, rich text saved on Save only, sanitised in the
// browser and again by the api (nh3), capped at 50,000 characters.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s24.mjs
//
// Updated 2026-10-24 (D-315): Project Home's text panels are gone (D-315 C5, `ProjectTextPanel`
// deleted): Scope of Work and Project Notes are inline editors in the Edit Project dialog that
// `/project/<uuid>` opens over the takeoff ("the rich-text editor inline: no Save of its own",
// D-315 1), so each step types into `[data-edit-text="scope"|"notes"]` and saves with the dialog's
// one Save, not a panel's Edit and Save.
// AC1: after Save, a fresh load of `/project/<uuid>` reopens the dialog, and the editor is what
// shows the stored text (there is no separate read view any more): bold, two bullets, and the
// link with target=_blank and rel noopener, as before.
// AC2: Cancel with changes asks "Discard changes?" (D-315 1): Discard; the api is unchanged and the
// reopened editor does not hold the draft.
// AC3: pasted into the Notes editor, saved with the dialog's Save; checked again after a fresh load.
// AC6: read-only is the dialog's refusal (`[data-edit-refusal]`) for qa_pricing: no enabled
// formatting control, the editor itself not editable, and Save disabled; the api still refuses.

import { APP, SEEDED, apiCall, enterWorkspace, expect, fixtureOwner, quietFor, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, workspace, base } = await freshWorkspace("F4-S24 text");
const job = await makeProject(token, base, { name: "Text job" });
const qa = await seatedMember(token, workspace.uuid, "qa_pricing", "f4s24");
const read = async () => (await apiCall(token, "GET", `${base}/${job.uuid}`)).body;

const dialogOf = (page) => page.getByRole("dialog", { name: /Edit Project/ });
const panel = (page, field) => dialogOf(page).locator(`[data-edit-text="${field}"]`);
const editor = (page, field) => panel(page, field).locator("[data-rich-editor] .tiptap");

/** `/project/<uuid>` is the takeoff with Edit Project open (D-315 C5). `email: null` = already in. */
async function openEdit(page, email) {
  if (email !== null) {
    await signInAs(page, email ?? (await fixtureOwner()).email, SEEDED.password);
    await enterWorkspace(page, workspace.uuid);
  }
  await page.goto(`${APP}/project/${job.uuid}`);
  await dialogOf(page).locator("form[data-edit-project]").waitFor({ timeout: 20000 });
  await editor(page, "scope").waitFor({ timeout: 15000 });
  await editor(page, "notes").waitFor({ timeout: 15000 });
  return dialogOf(page);
}

async function startEditing(page, field) {
  await editor(page, field).click();
  await page.keyboard.press("Control+End");
}

async function save(page, dialog) {
  await dialog.locator("[data-edit-save]").click();
  await page.getByText("Project saved").first().waitFor({ timeout: 15000 });
}

await run("f4-s24", [
  {
    title: "AC1 — a bold, bulleted scope with a link; Save; reload: it renders the same, the link opens a new tab",
    run: async ({ page }) => {
      const dialog = await openEdit(page);
      await startEditing(page, "scope");
      const box = panel(page, "scope");
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
      await save(page, dialog);

      const stored = (await read()).scope_of_work;
      expect(/<strong>Concrete<\/strong>/.test(stored), `bold missing: ${stored}`);
      expect(/<a href="https:\/\/example\.com\/spec">spec<\/a>/.test(stored), `link missing: ${stored}`);
      expect(/<ul><li><p>Footings<\/p><\/li><li><p>Slab on grade<\/p><\/li><\/ul>/.test(stored), `list missing: ${stored}`);
      await openEdit(page, null);
      const rendered = editor(page, "scope");
      const link = rendered.locator("a");
      await link.waitFor({ timeout: 10000 });
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
      const dialog = await openEdit(page);
      const before = (await read()).scope_of_work;
      await startEditing(page, "scope");
      await page.keyboard.type(" and more that is thrown away");
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await page.getByRole("dialog", { name: "Discard changes?" }).getByRole("button", { name: "Discard" }).click();
      await dialog.waitFor({ state: "detached", timeout: 10000 });
      expect((await read()).scope_of_work === before, "the api changed");
      await openEdit(page, null);
      const shown = await editor(page, "scope").innerText();
      expect(!/thrown away/.test(shown), "the draft is still shown");
      return "draft gone, stored value unchanged";
    },
  },
  {
    title: "AC3 — paste <img src=x onerror=…> into Project Notes: nothing runs, now or after reload",
    run: async ({ page }) => {
      let dialogs = 0;
      page.on("dialog", async (d) => {
        dialogs += 1;
        await d.dismiss();
      });
      const dialog = await openEdit(page);
      await startEditing(page, "notes");
      await page.evaluate(() => {
        const target = document.querySelector('[data-edit-text="notes"] .tiptap');
        const data = new DataTransfer();
        data.setData("text/html", '<p>Site note</p><img src=x onerror="window.__xss=1;alert(1)"><script>window.__xss=2</script>');
        data.setData("text/plain", "Site note");
        target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
      });
      await save(page, dialog);
      const stored = (await read()).project_notes;
      await openEdit(page, null);
      await editor(page, "notes").getByText("Site note").waitFor({ timeout: 10000 });
      await quietFor(500); // an injected handler would have run by now
      const flag = await page.evaluate(() => window.__xss ?? null);
      expect(flag === null && dialogs === 0, `ran: flag ${flag}, ${dialogs} dialogs`);
      expect(!/<img|onerror|<script/i.test(stored ?? ""), `stored: ${stored}`);
      expect(/Site note/.test(stored ?? ""), `the text itself was lost: ${stored}`);
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
      const dialog = await openEdit(page, qa.email);
      await dialog.locator("[data-edit-refusal]").waitFor({ timeout: 15000 });
      const enabled = await dialog
        .locator('[data-edit-text] [role="toolbar"] button')
        .evaluateAll((buttons) => buttons.filter((b) => !b.disabled && !b.closest("fieldset:disabled")).length);
      expect(enabled === 0, `${enabled} formatting controls enabled for qa_pricing`);
      const editable = await dialog.locator("[data-edit-text] .tiptap").evaluateAll((els) => els.map((el) => el.isContentEditable));
      expect(editable.every((e) => e === false), `editors editable for qa_pricing: ${editable.join()}`);
      expect(await dialog.locator("[data-edit-save]").isDisabled(), "Save enabled for qa_pricing");
      const patch = await apiCall(qa.token, "PATCH", `${base}/${job.uuid}`, { scope_of_work: "<p>no</p>" });
      expect(patch.status === 403, `api ${patch.status}`);
      return `no edit control · the editors are not editable · api ${patch.status}`;
    },
  },
]);
