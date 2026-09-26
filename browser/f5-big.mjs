// F5, the Block B check: Choose pages on a 400 MB+ PDF, and a small one, read by ranges
// straight from storage the way legacy's reads were shaped (D-40), and tiles shaped like
// the pages.
//
//   ./browser/f5-big.sh     (makes the files with drives/f5-big.py, then runs this)
//
// The founder's 429 MB set failed "Couldn't open some drawings" with IDM on. IDM took a
// presigned link answered with a filename header, then the api's octet-stream reads, and
// leaves legacy's alone: a Supabase signed URL answered `application/pdf` with no
// Content-Disposition. Now pdf.js reads through a presigned link shaped like legacy's,
// one 206 at a time. IDM cannot run on the bench; the founder's test with IDM on decides
// whether ranged reads of that shape are safe (if not: one whole-file GET, D-40).
//
// What is proved here: every read of the file carries a Range and is answered 206
// `application/pdf` with no Content-Disposition; no request for a file is ever the whole
// file; no download or window opens; with the reads blocked, the message names a download
// manager, extension or the connection, and clicking it fetches nothing; and each file's
// tiles take its pages' shape, a /Rotate included.

import { APP, expect, run, signInAs } from "./lib/bench.mjs";

const [email, workspaceUuid, projectUuid] = (process.env.F5_BIG ?? "").split(" ");
const BIG = Number(process.env.F5_BIG_BYTES);
const SMALL = Number(process.env.F5_SMALL_BYTES);
if (!email || !projectUuid) throw new Error("F5_BIG is not set: run ./browser/f5-big.sh");

const isStorage = (url) => new URL(url).port === "9000";

/** Every request for a file's bytes, and anything that would be a download. */
function watch(page, context) {
  const seen = { whole: [], reads: [], downloads: 0, popups: 0 };
  page.on("download", () => (seen.downloads += 1));
  context.on("page", () => (seen.popups += 1));
  page.on("request", (request) => {
    const url = request.url();
    if ((isStorage(url) || url.includes("/bytes") || url.includes("/download")) && !request.headers().range) {
      seen.whole.push(url.slice(0, 120));
    }
  });
  page.on("response", async (response) => {
    if (!isStorage(response.url())) return;
    const headers = response.headers();
    seen.reads.push({
      status: response.status(),
      type: headers["content-type"],
      disposition: headers["content-disposition"] ?? null,
      range: response.request().headers().range ?? null,
      length: Number(headers["content-length"] ?? 0),
      // When the read was asked for, on the same clock as the page's Date.now().
      at: response.request().timing().startTime,
    });
  });
  return seen;
}

async function openChooser(page, name, { signedIn = false } = {}) {
  if (!signedIn) {
    await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
    // The moment the page step shows, stamped in the page rather than when a poll sees it.
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (!window.__pagesShownAt && document.querySelector("[data-page-file]")) window.__pagesShownAt = Date.now();
      }).observe(document, { childList: true, subtree: true });
    });
    await signInAs(page, email);
  }
  await page.goto(`${APP}/project/${projectUuid}/takeoff`);
  await page.getByRole("button", { name: "Add sheets" }).first().click({ timeout: 20000 });
  const dialog = page.getByRole("dialog");
  await dialog.locator(`[data-load-file="${name}"]`).getByRole("checkbox").check({ timeout: 20000 });
  const t0 = Date.now();
  await dialog.getByRole("button", { name: /^Choose pages/ }).click();
  return { dialog, t0 };
}

/** The checks every open must pass, and a line saying what it cost. */
function judge(seen, size) {
  expect(seen.whole.length === 0, `requests for a whole file: ${seen.whole.join(", ")}`);
  expect(seen.downloads === 0 && seen.popups === 0, `${seen.downloads} downloads, ${seen.popups} windows`);
  expect(seen.reads.length > 0, "no ranged read was made");
  const bad = seen.reads.filter(
    (r) => r.status !== 206 || !r.range || r.type !== "application/pdf" || r.disposition !== null,
  );
  expect(bad.length === 0, `reads not shaped like legacy's: ${JSON.stringify(bad.slice(0, 2))}`);
  const read = seen.reads.reduce((sum, r) => sum + r.length, 0);
  return {
    read,
    line: `${seen.reads.length} reads from storage, all 206 application/pdf with a Range and no Content-Disposition, ${(read / 1024 / 1024).toFixed(1)} MB of ${(size / 1024 / 1024).toFixed(0)} MB`,
  };
}

/** The drawn tiles' width over height, for a file's section. */
const tileAspects = (section) =>
  section.locator('[data-thumbnail="drawn"]').evaluateAll((tiles) =>
    tiles.map((tile) => {
      const box = tile.getBoundingClientRect();
      const canvas = tile.querySelector("canvas").getBoundingClientRect();
      return { tile: box.width / box.height, page: canvas.width / canvas.height };
    }),
  );

await run("f5-big", [
  {
    title: "Choose pages on a 400 MB+ PDF: ranged reads only, shaped like legacy's (application/pdf, no filename header), no whole-file request",
    run: async ({ page, context }) => {
      expect(BIG >= 400 * 1024 * 1024, `the big file is ${BIG} bytes`);
      const seen = watch(page, context);
      const { dialog, t0 } = await openChooser(page, "Big set.pdf");
      const section = dialog.locator('[data-page-file="Big set.pdf"]');
      await section.waitFor({ timeout: 30000 });
      const shownAt = await page.evaluate(() => window.__pagesShownAt);
      const opened = shownAt - t0;
      // pdf.js walks every page object once on open (one 64 KiB chunk each, here each
      // beside a 3.6 MB image): about 10 MB for this set, never the set.
      const early = seen.reads.filter((r) => r.at <= shownAt);
      const atOpen = early.reduce((sum, r) => sum + r.length, 0);
      expect(atOpen < 0.03 * BIG, `opening read ${atOpen} bytes in ${early.length} reads, over 3% of the file`);
      await section.locator('[data-thumbnail="drawn"]').first().waitFor({ timeout: 30000 });
      const firstThumb = Date.now() - t0;
      const pages = await section.locator("[data-page]").count();
      expect(pages === 150, `${pages} pages offered`);
      const { read, line } = judge(seen, BIG);
      // Thumbnails read their own pages (here each page is 3.6 MB of noise); never the set.
      expect(read < 0.25 * BIG, `read ${read} bytes, a quarter of the file`);
      return `150 pages offered ${opened} ms after Choose pages, from ${(atOpen / 1024 / 1024).toFixed(1)} MB in ${early.length} reads; first thumbnail at ${firstThumb} ms · ${line}`;
    },
  },
  {
    title: "Choose pages on a small PDF (a few MB): the same, ranged reads only",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      const { dialog, t0 } = await openChooser(page, "Small set.pdf");
      const section = dialog.locator('[data-page-file="Small set.pdf"]');
      await section.locator('[data-thumbnail="drawn"]').nth(1).waitFor({ timeout: 30000 });
      const took = Date.now() - t0;
      const { line } = judge(seen, SMALL);
      return `2 thumbnails drawn ${took} ms after Choose pages · ${line}`;
    },
  },
  {
    title: "Tiles take the pages' shape as legacy's do: a landscape set's tiles are landscape, and a portrait page stored with /Rotate 90 shows landscape",
    run: async ({ page }) => {
      const { dialog } = await openChooser(page, "Small set.pdf");
      const small = dialog.locator('[data-page-file="Small set.pdf"]');
      await small.locator('[data-thumbnail="drawn"]').nth(1).waitFor({ timeout: 30000 });
      const landscape = await tileAspects(small);
      expect(landscape.every((a) => Math.abs(a.tile - 1224 / 792) < 0.03), `Small set's tiles: ${JSON.stringify(landscape)}`);
      expect(landscape.every((a) => Math.abs(a.page - 1224 / 792) < 0.03), `Small set's pages drawn: ${JSON.stringify(landscape)}`);

      const { dialog: again } = await openChooser(page, "Rotated set.pdf", { signedIn: true });
      const rotated = again.locator('[data-page-file="Rotated set.pdf"]');
      await rotated.locator('[data-thumbnail="drawn"]').nth(1).waitFor({ timeout: 30000 });
      const turned = await tileAspects(rotated);
      expect(turned.every((a) => Math.abs(a.tile - 792 / 612) < 0.03), `Rotated set's tiles: ${JSON.stringify(turned)}`);
      expect(turned.every((a) => Math.abs(a.page - 792 / 612) < 0.03), `Rotated set's pages drawn: ${JSON.stringify(turned)}`);
      return `Small set (1224 x 792): tiles ${landscape[0].tile.toFixed(2)} wide per tall · Rotated set (612 x 792, /Rotate 90): tiles ${turned[0].tile.toFixed(2)}, drawn landscape`;
    },
  },
  {
    title: "Reads blocked (an extension cancelling them): the message names a download manager or extension, and clicking it fetches and downloads nothing",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      await context.route((url) => url.port === "9000", (route) => route.abort("blockedbyclient"));
      await openChooser(page, "Big set.pdf");
      const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Couldn't open Big set.pdf" });
      await toast.waitFor({ timeout: 30000 });
      const text = (await toast.textContent()).replace(/\s+/g, " ");
      expect(/download manager or browser extension/.test(text), `the toast reads "${text}"`);
      expect(/connection/.test(text), `the toast does not mention the connection: "${text}"`);

      const url = page.url();
      let requests = 0;
      page.on("request", () => (requests += 1));
      await toast.click();
      await page.waitForTimeout(2000);
      expect(page.url() === url, `clicking the toast navigated to ${page.url()}`);
      expect(seen.whole.length === 0, `a whole-file request: ${seen.whole.join(", ")}`);
      expect(seen.downloads === 0 && seen.popups === 0, `clicking the toast: ${seen.downloads} downloads, ${seen.popups} windows`);
      expect(requests === 0, `clicking the toast made ${requests} requests`);
      return `"${text.slice(0, 160)}…" · click: no request, no download, no window, still on the page`;
    },
  },
]);
