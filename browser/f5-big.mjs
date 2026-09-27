// F5, the Block B check (D-41): Choose pages on a 400 MB+ PDF and a small one, and a
// loaded sheet opening, with the browser never reading the plan set.
//
//   ./browser/f5-big.sh     (makes the files with drives/f5-big.py, then runs this)
//
// The founder's IDM took every browser read of the 429 MB set, ranged or not, whatever
// the headers (D-40 failed). Now the worker reads the set and makes each page's size,
// rotation and a WebP thumbnail; Choose pages shows those as plain image GETs. A loaded
// page is split into its own PDF on the worker, and the canvas opens that in one plain
// GET, legacy's proven shape. IDM cannot run on the bench; what is proved here is that
// no request of the browser's is one IDM takes: none reads the set, none carries a
// Range, none is answered with a filename header.
//
// The files are stored by the drive, not uploaded, so they are "uploaded before D-41":
// Choose pages starts their preparation on first open, and counts their pages at once.

import { APP, expect, run, signInAs } from "./lib/bench.mjs";

const [email, workspaceUuid, projectUuid] = (process.env.F5_BIG ?? "").split(" ");
const BIG = Number(process.env.F5_BIG_BYTES);
if (!email || !projectUuid) throw new Error("F5_BIG is not set: run ./browser/f5-big.sh");

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

async function openChooser(page, name, { signedIn = false } = {}) {
  if (!signedIn) {
    await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
    await signInAs(page, email);
  }
  await page.goto(`${APP}/project/${projectUuid}/takeoff`);
  await page.getByRole("button", { name: "Add sheets" }).first().click({ timeout: 20000 });
  const dialog = page.getByRole("dialog");
  await dialog.locator(`[data-load-file="${name}"]`).getByRole("checkbox").check({ timeout: 20000 });
  const t0 = Date.now();
  await dialog.getByRole("button", { name: /^Choose pages/ }).click();
  return { dialog, section: dialog.locator(`[data-page-file="${name}"]`), t0 };
}

/** Each drawn tile's width over height, and its image's. */
const aspects = (section) =>
  section.locator('[data-thumbnail="shown"]').evaluateAll((tiles) =>
    tiles.map((tile) => {
      const box = tile.getBoundingClientRect();
      const img = tile.querySelector("img");
      // An image not yet fetched (lazy, off screen) has no size: 0.
      const drawn = img.complete && img.naturalWidth > 0;
      const rect = img.getBoundingClientRect();
      return { tile: box.width / box.height, image: drawn ? rect.width / rect.height : 0 };
    }),
  );

await run("f5-big", [
  {
    title: "Choose pages on a 400 MB+ PDF never read by the browser: every tile at once, \"Preparing pages N of M\", thumbnails as plain WebP GETs",
    run: async ({ page, context }) => {
      expect(BIG >= 400 * 1024 * 1024, `the big file is ${BIG} bytes`);
      const seen = watch(page, context);
      const { section, t0 } = await openChooser(page, "Big set.pdf");
      await section.locator("[data-page]").nth(149).waitFor({ timeout: 20000 });
      const laidOut = Date.now() - t0;
      const progress = (await section.locator("[data-pages-progress]").textContent({ timeout: 5000 }).catch(() => "")).trim();
      expect(/^Preparing pages( \d+ of 150)?$/.test(progress), `the progress line reads "${progress}"`);
      await section.locator('[data-thumbnail="shown"] img').first().waitFor({ timeout: 60000 });
      const first = Date.now() - t0;
      // Every thumbnail made: each tile has its image. Tiles load lazily, so only those
      // scrolled to are fetched; the last is scrolled to and must draw.
      await section.locator('[data-thumbnail="shown"] img').nth(149).waitFor({ state: "attached", timeout: 240000 });
      const all = Date.now() - t0;
      await section.locator('[data-page="150"]').scrollIntoViewIfNeeded();
      await section.locator('[data-page="150"] img').waitFor({ timeout: 20000 });
      await page.waitForTimeout(1000);
      nothingIdmTakes(seen);
      const webp = seen.thumbnails.filter((r) => r.status === 200 && r.type === "image/webp");
      expect(webp.length > 0 && webp.length === seen.thumbnails.length, `thumbnail answers: ${JSON.stringify(seen.thumbnails.find((r) => r.status !== 200 || r.type !== "image/webp"))}`);
      const shapes = await aspects(section);
      expect(shapes.every((a) => Math.abs(a.tile - 1224 / 792) < 0.03), `a tile not landscape: ${JSON.stringify(shapes.find((a) => Math.abs(a.tile - 1224 / 792) >= 0.03))}`);
      const drawn = shapes.filter((a) => a.image > 0);
      expect(drawn.length > 0 && drawn.every((a) => Math.abs(a.image - 1224 / 792) < 0.03), `a thumbnail not landscape: ${JSON.stringify(drawn.find((a) => Math.abs(a.image - 1224 / 792) >= 0.03))}`);
      const kb = webp.reduce((n, r) => n + r.length, 0) / 1024;
      return `150 tiles ${laidOut} ms after Choose pages ("${progress}"); first thumbnail ${first} ms, all 150 made by ${all} ms; ${webp.length} WebP GETs for the tiles scrolled to, ${kb.toFixed(0)} KB; the 519 MB set: 0 requests`;
    },
  },
  {
    title: "Choose pages on a small PDF (a few MB): the same",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { section, t0 } = await openChooser(page, "Small set.pdf");
      await section.locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 60000 });
      const took = Date.now() - t0;
      nothingIdmTakes(seen);
      return `2 thumbnails ${took} ms after Choose pages; ${seen.thumbnails.length} WebP GETs; the set: 0 requests`;
    },
  },
  {
    title: "Tiles follow each page's real orientation: a portrait page stored with /Rotate 90 is a landscape tile, before and after its thumbnail",
    run: async ({ page }) => {
      const { section } = await openChooser(page, "Rotated set.pdf");
      // Laid out from the page's size and /Rotate, before any thumbnail exists.
      await section.locator("[data-page]").nth(1).waitFor({ timeout: 20000 });
      await section.locator('[data-thumbnail="shown"] img').nth(1).waitFor({ timeout: 60000 });
      const shapes = await aspects(section);
      expect(shapes.length === 2 && shapes.every((a) => Math.abs(a.tile - 792 / 612) < 0.03 && Math.abs(a.image - 792 / 612) < 0.03), `Rotated set: ${JSON.stringify(shapes)}`);
      return `612 x 792 with /Rotate 90: tiles ${shapes[0].tile.toFixed(2)}, thumbnails ${shapes[0].image.toFixed(2)} (landscape)`;
    },
  },
  {
    title: "A loaded page opens on the canvas from its own one-page PDF's bytes (D-42): one plain GET, not a .pdf URL, not served as a PDF, no Range, no filename header",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { dialog, section } = await openChooser(page, "Big set.pdf");
      await section.locator("[data-page]").nth(149).waitFor({ timeout: 20000 });
      await section.getByRole("button", { name: "Clear" }).click();
      await section.locator('[data-page="1"]').getByRole("checkbox").check();
      await dialog.locator("[data-load-pages]").click();
      await page.getByText("Added 1 page").waitFor({ timeout: 30000 });
      const t0 = Date.now();
      await page.locator('img[data-sheet-image="pdf"]').waitFor({ timeout: 120000 });
      const took = Date.now() - t0;
      nothingIdmTakes(seen);
      expect(seen.sheetPdfs.length === 1, `${seen.sheetPdfs.length} reads of the sheet's PDF`);
      const [pdf] = seen.sheetPdfs;
      expect(
        pdf.status === 200 && pdf.type === "application/vnd.intelcost.sheet" && !pdf.range && !pdf.disposition && !/\.pdf$/i.test(pdf.path),
        `the sheet's PDF: ${JSON.stringify(pdf)}`,
      );
      // pdf.js was handed bytes: nothing of pdf.js's own reached the network.
      const pdfAnything = [...seen.other, ...seen.thumbnails].filter((r) => /pdf/i.test(r.type ?? ""));
      expect(pdfAnything.length === 0, `something answered as a PDF: ${JSON.stringify(pdfAnything[0])}`);
      return `drawn by pdf.js ${took} ms after "Added 1 page" · its bytes: one GET of …/pages/{file}/1, 200 application/vnd.intelcost.sheet, ${(pdf.length / 1024).toFixed(0)} KB, no Range, no Content-Disposition; the set: 0 requests`;
    },
  },
  {
    title: "The sheet's PDF blocked (an extension cancelling it): the worker's fit image stays and the sheet still works",
    run: async ({ page, context }) => {
      await context.route(/\/pages\/[^/]+\/\d+(\.pdf)?\?/, (route) => route.abort("blockedbyclient"));
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
      await signInAs(page, email);
      await page.goto(`${APP}/project/${projectUuid}/takeoff`);
      const image = page.locator('img[alt="Drawing sheet"]');
      await image.waitFor({ timeout: 30000 });
      await page.waitForTimeout(5000);
      const source = await image.getAttribute("data-sheet-image");
      expect(source === "fit", `the sheet shows "${source}"`);
      const loaded = await image.evaluate((img) => img.complete && img.naturalWidth > 0);
      expect(loaded, "the fit image did not draw");
      return "the fit image stays (data-sheet-image=fit), drawn; the canvas is usable";
    },
  },
]);
