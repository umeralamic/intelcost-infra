// F5, the Block B check (D-41): the load screen's pages of a 400 MB+ PDF and a small one, and a
// loaded sheet opening, with the browser never reading the plan set.
//
//   ./browser/f5-big.sh     (makes the files with drives/f5-big.py, then runs this)
//
// The founder's IDM took every browser read of the 429 MB set, ranged or not, whatever
// the headers (D-40 failed). Now the worker reads the set and makes each page's size,
// rotation and a WebP thumbnail; the load screen shows those as plain image GETs. A loaded
// page is split into its own PDF on the worker, and the canvas opens that in one plain
// GET, legacy's proven shape. IDM cannot run on the bench; what is proved here is that
// no request of the browser's is one IDM takes: none reads the set, none carries a
// Range, none is answered with a filename header.
//
// The files are stored by the drive, not uploaded, so they are "uploaded before D-41":
// the load screen starts their preparation on first open, and counts their pages at once.
// The sets are made by the drive inside the api container (noise pages, 1224 x 792 pt), never
// a client's file.
//
// Updated 2026-10-19 to today's screens (D-619). What changed, and the decision behind it:
// - "Choose pages" is no longer a second step (D-310 1): the file is put in focus in the tree
//   and its pages show on the right. Add sheets starts with nothing ticked (D-310 2), so no file
//   tick is needed before a page's own tick. t0 is the focus click.
// - On a project with sheets, the screen opens from the Sheets panel's + → Add Pages (D-313).
// - "Added 1 page" is gone: Load opens the progress view (D-321, D-322). Its timings run from
//   the api's answer, when the view leaves "sending", as they ran from the toast.
// - Every tile is one fixed 3:2 landscape frame from its first appearance (D-318 2, superseding
//   D-308's page-shaped tiles), so the tile shape checks are dropped: steps 2 and 4 check the
//   thumbnails' own shape (their natural width over height), which still follows each page's
//   real orientation.
// - The fit image may be drawn as a canvas now, `[data-sheet-image="fit"]` either way (step 6).
// - The workspace is entered with the harness's enterWorkspace, as today's fixtures do.

import { APP, apiCall, apiLogin, enterWorkspace, expect, quietFor, run, signInAs } from "./lib/bench.mjs";

const [email, workspaceUuid, projectUuid] = (process.env.F5_BIG ?? "").split(" ");
const BIG = Number(process.env.F5_BIG_BYTES);
if (!email || !projectUuid) throw new Error("F5_BIG is not set: run ./browser/f5-big.sh");
const project = `/api/workspace/${workspaceUuid}/project/${projectUuid}`;
const token = await apiLogin(email, "bench-password-1");

/** Every request the browser makes to storage, sorted by what it is. */
function watch(page, context) {
  const seen = { original: [], thumbnails: [], sheetPdfs: [], other: [], downloads: 0, popups: 0 };
  page.on("download", () => (seen.downloads += 1));
  context.on("page", () => (seen.popups += 1));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.port !== "9000") return;
    const headers = response.headers();
    const entry = {
      path: url.pathname.split("/").slice(-3).join("/"),
      status: response.status(),
      type: headers["content-type"],
      disposition: headers["content-disposition"] ?? null,
      range: response.request().headers().range ?? null,
      length: Number(headers["content-length"] ?? 0),
    };
    if (url.pathname.includes("/project-file/")) seen.original.push(entry);
    else if (url.pathname.includes("/previews/")) seen.thumbnails.push(entry);
    else if (/\/pages\/[^/]+\/\d+(\.pdf)?$/.test(url.pathname)) seen.sheetPdfs.push({ ...entry, path: url.pathname });
    else seen.other.push(entry);
  });
  return seen;
}

/** What IDM takes, none of which the browser may do. */
function nothingIdmTakes(seen) {
  expect(seen.original.length === 0, `the browser read the plan set: ${JSON.stringify(seen.original[0])}`);
  const all = [...seen.thumbnails, ...seen.sheetPdfs, ...seen.other];
  const ranged = all.filter((r) => r.range || r.status === 206);
  expect(ranged.length === 0, `ranged reads: ${JSON.stringify(ranged[0])}`);
  const named = all.filter((r) => r.disposition);
  expect(named.length === 0, `answers with a filename header: ${JSON.stringify(named[0])}`);
  expect(seen.downloads === 0 && seen.popups === 0, `${seen.downloads} downloads, ${seen.popups} windows`);
}

const sheetsNow = async () => (await apiCall(token, "GET", `${project}/drawing/sheet`)).body;

/** The load screen open on takeoff (the empty state's Add sheets, or the Sheets panel's + →
 *  Add Pages), `name` in focus: its pages on the right (D-310 1). */
async function openChooser(page, name) {
  await signInAs(page, email);
  await enterWorkspace(page, workspaceUuid);
  const [first] = await sheetsNow();
  await page.goto(`${APP}/project/${projectUuid}/takeoff${first ? `/${first.uuid}` : ""}`);
  if (first) {
    await page.locator("[data-add-sheets]").click({ timeout: 20000 });
    await page.getByRole("menuitem", { name: "Add Pages" }).click();
  } else {
    await page.locator("[data-add-sheets-empty]").click({ timeout: 20000 });
  }
  const dialog = page.getByRole("dialog").filter({ has: page.locator("[data-load-dialog]") });
  const row = dialog.locator(`[data-load-file="${name}"]`);
  await row.waitFor({ timeout: 20000 });
  const t0 = Date.now();
  await row.getByText(name, { exact: true }).click();
  return { dialog, section: dialog.locator(`[data-page-file="${name}"]`), t0 };
}

/** Load, the AI reads left off; resolves when the api has answered (the progress view leaves
 *  "sending", D-322). */
async function load(page, dialog) {
  for (const tick of ["[data-auto-name]", "[data-auto-scale]"]) {
    if (await dialog.locator(tick).isChecked()) await dialog.locator(tick).uncheck();
  }
  await dialog.locator("[data-load-pages]").click();
  await page.locator("[data-load-progress]").waitFor({ state: "attached", timeout: 15000 });
  await page.locator('[data-load-progress][data-requesting="sending"]').waitFor({ state: "detached", timeout: 30000 });
  const failed = await page.locator('[data-load-progress][data-requesting="failed"]').count();
  expect(failed === 0, "the Load request failed");
}

/** Each shown thumbnail's own width over height, once drawn (lazy ones off screen are left
 *  out); waits up to `timeout` for at least `least` of them. */
async function thumbShapes(section, least = 1, timeout = 20000) {
  const until = Date.now() + timeout;
  for (;;) {
    const shapes = await section.locator('[data-thumbnail="shown"] img').evaluateAll((imgs) =>
      imgs.filter((img) => img.complete && img.naturalWidth > 0).map((img) => img.naturalWidth / img.naturalHeight),
    );
    if (shapes.length >= least || Date.now() > until) return shapes;
    await new Promise((r) => setTimeout(r, 250));
  }
}

await run("f5-big", [
  {
    title: "D-43: a Load while the set's thumbnails are still being made is not held behind them: the page is drawn in about 10 s",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { dialog, section } = await openChooser(page, "Big set.pdf");
      await section.locator('[data-page="150"]').waitFor({ timeout: 20000 });
      await section.getByRole("button", { name: "Clear" }).click();
      await section.locator('[data-page="1"]').getByRole("checkbox").check();
      await load(page, dialog);
      const t0 = Date.now();
      await page.locator('canvas[data-sheet-raster][data-raster-res="1"]').waitFor({ timeout: 60000 });
      const took = Date.now() - t0;
      const files = await apiCall(token, "GET", `${project}/file`);
      const big = files.body.find((f) => f.file_name === "Big set.pdf");
      const pages = await apiCall(token, "GET", `${project}/file/${big.uuid}/pages`);
      expect(pages.body.status === "preparing" && pages.body.prepared < 150, `the thumbnails were done first (${pages.body.status}, ${pages.body.prepared} of 150): nothing was proved`);
      expect(took <= 20000, `the page took ${took} ms to draw with thumbnails being made`);
      nothingIdmTakes(seen);
      return `page 1 drawn ${took} ms after the Load's answer, while thumbnails stood at ${pages.body.prepared} of 150`;
    },
  },
  {
    title: "The pages of a 400 MB+ PDF never read by the browser: every tile at once, \"Preparing pages N of M\", thumbnails as plain WebP GETs",
    run: async ({ page, context }) => {
      expect(BIG >= 400 * 1024 * 1024, `the big file is ${BIG} bytes`);
      const seen = watch(page, context);
      const { section, t0 } = await openChooser(page, "Big set.pdf");
      await section.locator("[data-page]").nth(149).waitFor({ timeout: 20000 });
      const laidOut = Date.now() - t0;
      // Step 1's Load gave the worker a head start: the set may be finished already, and
      // then there is no progress line.
      const progress = (await section.locator("[data-pages-progress]").textContent({ timeout: 3000 }).catch(() => "")).trim();
      const status = await section.getAttribute("data-pages-status");
      expect(/^Preparing pages( \d+ of 150)?$/.test(progress) || (status === "ready" && progress === ""), `the progress line reads "${progress}" (${status})`);
      await section.locator('[data-thumbnail="shown"] img').first().waitFor({ timeout: 60000 });
      const first = Date.now() - t0;
      // Every thumbnail made: each tile has its image. Tiles load lazily, so only those
      // scrolled to are fetched; the last is scrolled to and must draw.
      await section.locator('[data-thumbnail="shown"] img').nth(149).waitFor({ state: "attached", timeout: 240000 });
      const all = Date.now() - t0;
      await section.locator('[data-page="150"]').scrollIntoViewIfNeeded();
      await section.locator('[data-page="150"] img').waitFor({ timeout: 20000 });
      await quietFor(1000); // any late request for the set would be seen
      nothingIdmTakes(seen);
      const webp = seen.thumbnails.filter((r) => r.status === 200 && r.type === "image/webp");
      expect(webp.length > 0 && webp.length === seen.thumbnails.length, `thumbnail answers: ${JSON.stringify(seen.thumbnails.find((r) => r.status !== 200 || r.type !== "image/webp"))}`);
      // The tiles are one fixed 3:2 frame (D-318 2): the thumbnails themselves are landscape.
      const drawn = await thumbShapes(section);
      expect(drawn.length > 0 && drawn.every((a) => Math.abs(a - 1224 / 792) < 0.03), `a thumbnail not landscape: ${JSON.stringify(drawn.find((a) => Math.abs(a - 1224 / 792) >= 0.03) ?? drawn)}`);
      const kb = webp.reduce((n, r) => n + r.length, 0) / 1024;
      return `150 tiles ${laidOut} ms after focus ("${progress}"); first thumbnail ${first} ms, all 150 made by ${all} ms; ${webp.length} WebP GETs for the tiles scrolled to, ${kb.toFixed(0)} KB, ${drawn.length} drawn at ${drawn[0].toFixed(2)}; the ${(BIG / 1024 / 1024).toFixed(0)} MB set: 0 requests`;
    },
  },
  {
    title: "The pages of a small PDF (a few MB): the same",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { section, t0 } = await openChooser(page, "Small set.pdf");
      await section.locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 60000 });
      const took = Date.now() - t0;
      nothingIdmTakes(seen);
      return `2 thumbnails ${took} ms after focus; ${seen.thumbnails.length} WebP GETs; the set: 0 requests`;
    },
  },
  {
    title: "Thumbnails follow each page's real orientation: a portrait page stored with /Rotate 90 has a landscape thumbnail",
    run: async ({ page }) => {
      const { section } = await openChooser(page, "Rotated set.pdf");
      // The tile itself is the fixed 3:2 frame from first appearance (D-318 2).
      await section.locator("[data-page]").nth(1).waitFor({ timeout: 20000 });
      await section.locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 60000 });
      const shapes = await thumbShapes(section, 2);
      expect(shapes.length === 2 && shapes.every((a) => Math.abs(a - 792 / 612) < 0.03), `Rotated set: ${JSON.stringify(shapes)}`);
      return `612 x 792 with /Rotate 90: thumbnails ${shapes[0].toFixed(2)} (landscape)`;
    },
  },
  {
    title: "A loaded page opens on the canvas from its own one-page PDF's bytes (D-42): one plain GET, not a .pdf URL, not served as a PDF, no Range, no filename header",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { dialog, section } = await openChooser(page, "Big set.pdf");
      await section.locator("[data-page]").nth(149).waitFor({ timeout: 20000 });
      await section.getByRole("button", { name: "Clear" }).click();
      // Page 1 went in with the first step.
      await section.locator('[data-page="2"]').getByRole("checkbox").check();
      await load(page, dialog);
      const t0 = Date.now();
      // The progress view closes itself on page 2's sheet once it is ready (D-321).
      const two = (await sheetsNow()).find((s) => s.page_number === 2);
      expect(two, "no sheet for page 2");
      await page.waitForURL(new RegExp(`/takeoff/${two.uuid}$`), { timeout: 120000 });
      const until = Date.now() + 60000;
      while (!seen.sheetPdfs.some((r) => /\/2(\.pdf)?$/.test(r.path)) && Date.now() < until) await page.waitForTimeout(250);
      await page.locator('canvas[data-sheet-raster][data-raster-res="1"]').waitFor({ timeout: 120000 });
      const took = Date.now() - t0;
      nothingIdmTakes(seen);
      // The takeoff page opened on page 1 (loaded in the first step) before this Load
      // landed on page 2: page 2's file is read once.
      const reads = seen.sheetPdfs.filter((r) => /\/2(\.pdf)?$/.test(r.path));
      expect(reads.length === 1, `${reads.length} reads of page 2's PDF`);
      const [pdf] = reads;
      expect(
        pdf.status === 200 && pdf.type === "application/vnd.intelcost.sheet" && !pdf.range && !pdf.disposition && !/\.pdf$/i.test(pdf.path),
        `the sheet's PDF: ${JSON.stringify(pdf)}`,
      );
      // pdf.js was handed bytes: nothing of pdf.js's own reached the network.
      const pdfAnything = [...seen.other, ...seen.thumbnails].filter((r) => /pdf/i.test(r.type ?? ""));
      expect(pdfAnything.length === 0, `something answered as a PDF: ${JSON.stringify(pdfAnything[0])}`);
      return `drawn by pdf.js ${took} ms after the Load's answer · its bytes: one GET of …/pages/{file}/2, 200 application/vnd.intelcost.sheet, ${(pdf.length / 1024).toFixed(0)} KB, no Range, no Content-Disposition; the set: 0 requests`;
    },
  },
  {
    title: "The sheet's PDF blocked (an extension cancelling it): the worker's fit image stays and the sheet still works",
    run: async ({ page, context }) => {
      await context.route(/\/pages\/[^/]+\/\d+(\.pdf)?\?/, (route) => route.abort("blockedbyclient"));
      await signInAs(page, email);
      await enterWorkspace(page, workspaceUuid);
      await page.goto(`${APP}/project/${projectUuid}/takeoff`);
      const image = page.locator('[data-sheet-image="fit"]').first();
      await image.waitFor({ timeout: 30000 });
      await quietFor(5000); // with its PDF blocked, the fit image must not be replaced
      const source = await image.getAttribute("data-sheet-image");
      expect(source === "fit", `the sheet shows "${source}"`);
      // An <img> or, today, a canvas the fit bitmap is drawn into: either way, drawn.
      const drawn = await image.evaluate((el) =>
        el.tagName === "IMG" ? el.complete && el.naturalWidth > 0 : el.width > 0 && getComputedStyle(el).visibility !== "hidden",
      );
      expect(drawn, "the fit image did not draw");
      const rasters = await page.locator("canvas[data-sheet-raster]").count();
      expect(rasters === 0, "a pdf.js raster was drawn with its PDF blocked");
      return "the fit image stays (data-sheet-image=fit), drawn, no raster over it; the canvas is usable";
    },
  },
]);
