// C19, the founder's click check "Auto Count" (F13): from the region menu, in Vector mode, the
// quarter turns and the mirror are found; the Sensitivity slider opens at 70; Create (N), then one
// Ctrl+Z removes them.
//
//   node fx-run-locked.mjs c19-auto-count
//
// The world: one throwaway workspace and project and a synthetic vector PDF, never a client drawing:
// one 2000 × 1000 pt page drawn with the quantity table's Auto Count symbol (lib/autocount-cases.mjs,
// scaled ×3 so it reads on screen): a circle with an "L" in it, a stem out to the right and a tick up
// at its end. Six copies: as drawn, turned 90°, 180° and 270°, mirrored, and mirrored then turned
// 90°; and one decoy, the bare circle with a "T" and no stem. Real PDF path operators, so the sheet
// has vector linework and Vector mode is the one that runs.
//
// Asserts: a Select drag that encloses nothing around the as-drawn copy opens the Region menu with
// "Auto Count"; the panel opens in Vector mode, Rotation search 4 (90° steps), Sensitivity 70; the
// scan ends with the six copies checked (four unmirrored at 0°, 90°, 180°, 270° and two mirrored) and
// the decoy not; Create (6) and the New Measurement dialog make one count item of 6 EA ("Counted 6
// symbols"); one Ctrl+Z removes it (the api no longer lists it, the canvas no longer draws its marks).
// No AI: Auto Count is local, and nothing here touches the region menu's AI rows.
//
// Not covered here, by the brief: Image mode's benchmark on the founder's E200 sheets (A1 6/0,
// A 12/0) stays the founder's own. Left for the founder's eye: the cards' crops, the scan's speed,
// and that the marks land on the symbols' centres.

import { APP, apiCall, enterWorkspace, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { loadPages, preparedSheets, uploadAll } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";
import { sheetPoint } from "./lib/takeoff.mjs";

const W = 2000;
const H = 1000;
const S = 3; // the case's symbol, three times the size

const circle = Array.from({ length: 24 }, (_, k) => [6 * Math.cos((k * Math.PI) / 12), 6 * Math.sin((k * Math.PI) / 12)]);
const SYMBOL = [
  { pts: circle, closed: true },
  { pts: [[-2, -3.5], [-2, 3], [3, 3]], closed: false, letter: true },
  { pts: [[6, 0], [16, 0]], closed: false },
  { pts: [[16, 0], [16, -5]], closed: false },
];
const DECOY = [
  { pts: circle, closed: true },
  { pts: [[-3, -3], [3, -3]], closed: false },
  { pts: [[0, -3], [0, 3]], closed: false },
];
/** Mirror first (x → −x), then turn clockwise on the page (y down): the case's own rule. */
const orient = ([x, y], turn, mirrored) => {
  const mx = mirrored ? -x : x;
  if (turn === 90) return [-y, mx];
  if (turn === 180) return [-mx, -y];
  if (turn === 270) return [y, -mx];
  return [mx, y];
};
const place = (strokes, cx, cy, turn = 0, mirrored = false) =>
  strokes.map((s) => ({ closed: s.closed, pts: s.pts.map((p) => orient(p, turn, mirrored && !s.letter)).map(([x, y]) => [cx + x * S, cy + y * S]) }));
const INSTANCES = [
  { name: "as drawn", cx: 200, cy: 200, turn: 0, mirrored: false },
  { name: "turned 90", cx: 500, cy: 200, turn: 90, mirrored: false },
  { name: "turned 180", cx: 800, cy: 200, turn: 180, mirrored: false },
  { name: "turned 270", cx: 1100, cy: 200, turn: 270, mirrored: false },
  { name: "mirrored", cx: 1400, cy: 200, turn: 0, mirrored: true },
  { name: "mirrored 90", cx: 200, cy: 600, turn: 90, mirrored: true },
];
const strokes = [...INSTANCES.flatMap((i) => place(SYMBOL, i.cx, i.cy, i.turn, i.mirrored)), ...place(DECOY, 800, 600)];

/** A one-page PDF of stroked paths (page y down here, PDF y up). */
function vectorPdf() {
  const f = (v) => v.toFixed(3);
  const content =
    "1 w 0 0 0 RG\n" +
    strokes.map((s) => s.pts.map(([x, y], i) => `${f(x)} ${f(H - y)} ${i === 0 ? "m" : "l"}`).join(" ") + (s.closed ? " h S" : " S")).join("\n") +
    "\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const at = Buffer.byteLength(out, "latin1");
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const { token, workspace, base } = await freshWorkspace("C19 auto count");
const project = await makeProject(token, base, { name: "C19 Auto Count" });
const takeoff = `${base}/${project.uuid}/takeoff`;
let sheet;
let made; // the count item Create made

const panel = (page) => page.locator("[data-autocount-panel]");
const countItems = async () => (await apiCall(token, "GET", `${takeoff}/item?sheet_uuid=${sheet.uuid}`)).body.filter((i) => i.type === "count");

async function open(page) {
  await signInAs(page, (await fixtureOwner()).email);
  await enterWorkspace(page, workspace.uuid);
  await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
  await page.locator("[data-canvas-scale]").first().waitFor({ timeout: 20000 });
}

/** A Select drag around the as-drawn copy, padded: it encloses no markup, so the Region menu opens. */
async function regionAroundTemplate(page) {
  const pad = 8;
  const a = await sheetPoint(page, (200 - 9 * S - pad) / W, (200 - 9 * S - pad) / H);
  const b = await sheetPoint(page, (200 + 19 * S + pad) / W, (200 + 9 * S + pad) / H);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  return { w: Math.round(b.x - a.x), h: Math.round(b.y - a.y) };
}

await run("c19-auto-count", [
  {
    title: "setup: a synthetic vector sheet, 2000 × 1000 pt: the symbol as drawn, turned 90/180/270, mirrored, mirrored + 90, and a decoy",
    run: async ({ page }) => {
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "Symbols.pdf", buffer: vectorPdf(), folder: null }], workspace.uuid);
      const loaded = await loadPages(token, base, project.uuid, [[files["Symbols.pdf"].uuid, [1]]]);
      expect(loaded.status === 200, `load: ${loaded.status} ${JSON.stringify(loaded.body)}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      const scaled = await apiCall(token, "PUT", `${base}/${project.uuid}/drawing/sheet/${sheet.uuid}/scale`, { feet_per_pt: 0.1, label: "Custom", unit: "ft" });
      expect(scaled.status === 200, `scale: ${scaled.status}`);
      return `sheet ${sheet.uuid}: ${INSTANCES.length} copies + 1 decoy, ${strokes.length} strokes`;
    },
  },
  {
    title: "region menu: a Select drag around the as-drawn copy opens Region with Auto Count; the panel opens in Vector, Rotation search 4, Sensitivity 70",
    run: async ({ page }) => {
      await open(page);
      const size = await regionAroundTemplate(page);
      const menu = page.getByRole("menu", { name: "Region" });
      await menu.waitFor({ timeout: 10000 }).catch(() => {
        throw new Error(`no Region menu after a ${size.w} × ${size.h} px Select drag`);
      });
      const entry = menu.getByRole("menuitem", { name: "Auto Count" });
      expect(await entry.isEnabled(), "Auto Count is disabled in the Region menu");
      await entry.click();
      await panel(page).waitFor({ timeout: 10000 });
      const mode = await panel(page).getByLabel("Mode").inputValue();
      const rotations = await panel(page).getByLabel("Rotation search").inputValue();
      const sensitivity = await panel(page).getByLabel("Sensitivity").inputValue();
      expect(mode === "vector", `Mode opens on ${mode}`);
      expect(rotations === "4", `Rotation search opens on ${rotations}`);
      expect(sensitivity === "70", `Sensitivity opens at ${sensitivity}`);
      return `box ${size.w} × ${size.h} px · Mode ${mode}, Rotation search ${rotations}, Sensitivity ${sensitivity}`;
    },
  },
  {
    title: "Vector scan: the six copies checked (as drawn, 90°, 180°, 270°, mirrored, mirrored + 90°), the decoy not; Create (6) makes 6 EA; one Ctrl+Z removes them",
    run: async ({ page }) => {
      await open(page);
      await regionAroundTemplate(page);
      await page.getByRole("menu", { name: "Region" }).getByRole("menuitem", { name: "Auto Count" }).click();
      await panel(page).waitFor({ timeout: 10000 });
      const settled = await waitFor(async () => {
        if (await panel(page).locator("[data-autocount-scanning]").count()) return null;
        if (await panel(page).locator("[data-autocount-zero], [data-autocount-noink]").count()) return "none";
        return (await panel(page).locator("[data-autocount-card]").count()) > 0 ? "cards" : null;
      }, "the scan to finish", 90000);
      if (settled === "none") {
        const said = ((await panel(page).locator("[data-autocount-results]").textContent()) ?? "").replace(/\s+/g, " ").trim();
        throw new Error(`the scan found nothing: "${said}"`);
      }
      const cards = await panel(page).locator("[data-autocount-card]").evaluateAll((els) => els.map((e) => ({ title: e.getAttribute("title") ?? "", checked: e.getAttribute("data-checked") === "true" })));
      const checked = cards.filter((c) => c.checked);
      const orientation = (t) => t.split(" · ").find((p) => /^(As drawn|Rotated|Mirrored)/.test(p)) ?? "?";
      const seen = checked.map((c) => orientation(c.title)).sort();
      const plain = seen.filter((o) => !o.startsWith("Mirrored"));
      const mirrored = seen.filter((o) => o.startsWith("Mirrored"));
      const turns = new Set(plain.map((o) => (o === "As drawn" ? "0" : o.replace(/\D/g, ""))));
      expect(checked.length === 6, `${checked.length} checked of ${cards.length} cards: ${cards.map((c) => `${c.checked ? "✓" : "·"} ${c.title}`).join(" | ")}`);
      expect(plain.length === 4 && ["0", "90", "180", "270"].every((t) => turns.has(t)), `the quarter turns are not all found: ${seen.join(", ")}`);
      expect(mirrored.length === 2, `the mirror is not found twice: ${seen.join(", ")}`);
      const createButton = panel(page).locator("[data-autocount-create]");
      const label = ((await createButton.textContent()) ?? "").trim();
      expect(label === "Create (6)", `the button reads "${label}"`);
      await createButton.click();
      const form = page.locator('[data-measurement-dialog="create"]');
      await form.waitFor({ timeout: 10000 });
      await form.getByLabel("Name", { exact: true }).fill("C19 Symbols");
      await form.getByRole("button", { name: "Create" }).click();
      await page.getByText(/Counted 6 symbols/).first().waitFor({ timeout: 15000 });
      made = await waitFor(async () => (await countItems()).find((i) => i.name === "C19 Symbols"), "the count item in the api", 10000);
      expect(made.effective_quantity === 6, `C19 Symbols reads ${made.effective_quantity} EA`);
      // One Ctrl+Z, on this same page: a reload would start a new session history.
      await page.locator("[data-geometry]").first().waitFor({ timeout: 10000 });
      const marksBefore = await page.locator("[data-geometry]").evaluateAll((els) => new Set(els.map((e) => e.getAttribute("data-geometry"))).size);
      await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
      await page.keyboard.press("Control+z");
      await waitFor(async () => !(await countItems()).some((i) => i.uuid === made.uuid), "C19 Symbols gone from the api after one Ctrl+Z", 10000);
      await waitFor(async () => (await page.locator("[data-geometry]").count()) === 0, "the marks gone from the canvas after one Ctrl+Z", 10000);
      return `${cards.length} cards, checked: ${seen.join(", ")} · Create (6) → "C19 Symbols" ${made.effective_quantity} EA, ${marksBefore} marks · one Ctrl+Z → item and marks gone`;
    },
  },
]);
