// F5, the Block B check: Choose pages on a 400 MB+ PDF, and a small one, read by ranges
// through the api, with nothing a download manager would take.
//
//   ./browser/f5-big.sh     (makes the files with drives/f5-big.py, then runs this)
//
// The founder's 429 MB set failed "Couldn't open some drawings" and IDM popped up.
// pdf.js had been handed a presigned `.pdf` link, and its first request was a plain GET
// for the whole file, answered `application/pdf` with a filename. Now every byte comes
// through `…/file/{uuid}/bytes`, one 206 at a time.
//
// IDM itself cannot run on the bench, so the browser stands in for it: any request a
// download manager would take (a URL ending `.pdf`, or storage's own host) is recorded
// and aborted, as IDM taking it over aborts the browser's. The steps then prove none was
// made, that no download or window opened, and, with the reads themselves blocked, that
// the message names the likely cause and clicking it fetches nothing.

import { APP, expect, run, signInAs } from "./lib/bench.mjs";

const [email, workspaceUuid, projectUuid] = (process.env.F5_BIG ?? "").split(" ");
const BIG = Number(process.env.F5_BIG_BYTES);
const SMALL = Number(process.env.F5_SMALL_BYTES);
if (!email || !projectUuid) throw new Error("F5_BIG is not set: run ./browser/f5-big.sh");

/** What a download manager would see and take, and every read of the file. */
function watch(page, context) {
  const seen = { captured: [], reads: [], downloads: 0, popups: 0 };
  page.on("download", () => (seen.downloads += 1));
  context.on("page", () => (seen.popups += 1));
  page.on("response", async (response) => {
    if (!response.url().includes("/bytes")) return;
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

async function standInForIdm(context, seen) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (/\.pdf$/i.test(url.pathname) || url.port === "9000") {
      seen.captured.push(route.request().url().slice(0, 120));
      return route.abort("blockedbyclient");
    }
    return route.fallback();
  });
}

async function openChooser(page, name) {
  await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), workspaceUuid);
  // The moment the page step shows, stamped in the page rather than when a poll sees it.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (!window.__pagesShownAt && document.querySelector("[data-page-file]")) window.__pagesShownAt = Date.now();
    }).observe(document, { childList: true, subtree: true });
  });
  await signInAs(page, email);
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
  expect(seen.captured.length === 0, `a download manager would have taken: ${seen.captured.join(", ")}`);
  expect(seen.downloads === 0 && seen.popups === 0, `${seen.downloads} downloads, ${seen.popups} windows`);
  expect(seen.reads.length > 0, "no ranged read was made");
  const bad = seen.reads.filter(
    (r) => r.status !== 206 || !r.range || r.type !== "application/octet-stream" || r.disposition !== null,
  );
  expect(bad.length === 0, `reads that were not a plain 206 part: ${JSON.stringify(bad.slice(0, 2))}`);
  const read = seen.reads.reduce((sum, r) => sum + r.length, 0);
  return { read, line: `${seen.reads.length} reads, all 206 application/octet-stream with no filename, ${(read / 1024 / 1024).toFixed(1)} MB of ${(size / 1024 / 1024).toFixed(0)} MB` };
}

await run("f5-big", [
  {
    title: "Choose pages on a 400 MB+ PDF: thumbnails from ranged reads only, no whole-file request, nothing a download manager would take",
    run: async ({ page, context }) => {
      expect(BIG >= 400 * 1024 * 1024, `the big file is ${BIG} bytes`);
      const seen = watch(page, context);
      await standInForIdm(context, seen);
      const { dialog, t0 } = await openChooser(page, "Big set.pdf");
      const section = dialog.locator('[data-page-file="Big set.pdf"]');
      await section.waitFor({ timeout: 30000 });
      const shownAt = await page.evaluate(() => window.__pagesShownAt);
      const opened = shownAt - t0;
      // Opening (the page count, the page tree) costs the file's ends, not the file:
      // what was read before the pages showed, not the thumbnails that follow at once.
      const atOpen = seen.reads.filter((r) => r.at <= shownAt).reduce((sum, r) => sum + r.length, 0);
      const early = seen.reads.filter((r) => r.at <= shownAt);
      // pdf.js walks every page object once on open (one 64 KiB chunk each, here each
      // beside a 3.6 MB image): about 10 MB for this set, never the set.
      expect(atOpen < 0.03 * BIG, `opening read ${atOpen} bytes in ${early.length} reads, over 3% of the file: ${early.slice(0, 6).map((r) => r.range).join(" ")} …`);
      await section.locator('[data-thumbnail="drawn"]').first().waitFor({ timeout: 30000 });
      const firstThumb = Date.now() - t0;
      const pages = await section.locator("[data-page]").count();
      expect(pages === 150, `${pages} pages offered`);
      const { read, line } = judge(seen, BIG);
      // Thumbnails read their own pages (here each page is 3.6 MB of noise); never the set.
      expect(read < 0.25 * BIG, `read ${read} bytes, a quarter of the file`);
      return `150 pages offered ${opened} ms after Choose pages, from ${(atOpen / 1024 / 1024).toFixed(1)} MB in ${early.length} reads; first thumbnail at ${firstThumb} ms · ${line} (thumbnails read their pages)`;
    },
  },
  {
    title: "Choose pages on a small PDF (a few MB): the same, ranged reads only",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      await standInForIdm(context, seen);
      const { dialog, t0 } = await openChooser(page, "Small set.pdf");
      const section = dialog.locator('[data-page-file="Small set.pdf"]');
      await section.locator('[data-thumbnail="drawn"]').nth(1).waitFor({ timeout: 30000 });
      const took = Date.now() - t0;
      const { line } = judge(seen, SMALL);
      return `2 thumbnails drawn ${took} ms after Choose pages · ${line}`;
    },
  },
  {
    title: "Reads blocked (an extension cancelling them): the message names a download manager or extension, and clicking it fetches and downloads nothing",
    run: async ({ page, context }) => {
      const seen = watch(page, context);
      await standInForIdm(context, seen);
      await context.route("**/bytes", (route) => route.abort("blockedbyclient"));
      await openChooser(page, "Big set.pdf");
      const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Couldn't open Big set.pdf" });
      await toast.waitFor({ timeout: 30000 });
      const text = (await toast.textContent()).replace(/\s+/g, " ");
      expect(/download manager or browser extension/.test(text), `the toast reads "${text}"`);
      expect(/connection/.test(text), `the toast does not mention the connection: "${text}"`);

      const url = page.url();
      const before = seen.captured.length;
      let requests = 0;
      page.on("request", () => (requests += 1));
      await toast.click();
      await page.waitForTimeout(2000);
      expect(page.url() === url, `clicking the toast navigated to ${page.url()}`);
      expect(seen.captured.length === before, `clicking the toast asked for ${seen.captured.slice(before).join(", ")}`);
      expect(seen.downloads === 0 && seen.popups === 0, `clicking the toast: ${seen.downloads} downloads, ${seen.popups} windows`);
      expect(requests === 0, `clicking the toast made ${requests} requests`);
      return `"${text.slice(0, 160)}…" · click: no request, no download, no window, still on the page`;
    },
  },
]);
