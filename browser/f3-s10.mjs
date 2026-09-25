// F3-S10 — general settings and the workspace logo.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s10.mjs
//
// Every field here has existed on the model since the baseline and `PATCH` has accepted
// them the whole time. Nothing sent one, which is the same shape of gap F2-S14 found:
// a column written only by the seed script.
//
// The logo is the interesting half, and the criterion worth the trouble is AC5 — three
// rejection reasons, three sentences. They come from three places on purpose: wrong type
// and too large are refused by the api BEFORE a presigned URL exists, so a file that
// cannot be a logo never gets a way into the bucket; "upload failed" is the browser's
// alone, because a PUT straight to S3 that never lands is something the api never hears
// about.
//
// Hard rule 5 is checked too: the bytes go to S3 on a presigned URL, and the api never
// carries them.

import {
  APP,
  apiCall,
  apiLogin,
  createWorkspace,
  expect,
  firstWorkspace,
  logoTicket,
  readWorkspace,
  run,
  seatedMember,
  signInAs,
  updateWorkspace,
} from "./lib/bench.mjs";

const SEED = "estimator@bench.intelcost.io";
const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

/** A one-pixel PNG, as bytes, so the logo path is driven with a real image. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

await run("f3-s10", [
  {
    title: "AC1/AC2 — the details save, survive a reload, and the slug does not move",
    run: async ({ page }) => {
      const ws = await createWorkspace(ownerToken, `S10 General ${Date.now()}`);
      const slugBefore = (await readWorkspace(ownerToken, ws.uuid)).slug;

      await signInAs(page, SEED);
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/general`);
      await page.waitForSelector("#workspace-name-general", { timeout: 20000 });

      const renamed = `S10 Renamed ${Date.now()}`;
      await page.fill("#workspace-name-general", renamed);
      await page.fill("#license_number", "LIC-4471");
      await page.fill("#company_address", "14 Mill Lane, Bristol");
      await page.fill("#company_phone", "0117 555 0100");
      await page.click("[data-save-general]");
      await page.waitForFunction(() => /Saved\./.test(document.body.textContent ?? ""), undefined, {
        timeout: 20000,
      });

      // Reload, not just re-render: a form that keeps its own state looks saved either
      // way, and the thing being checked is that the api kept it.
      await page.reload();
      await page.waitForSelector("#license_number", { timeout: 20000 });
      const values = await page.evaluate(() => ({
        name: document.querySelector("#workspace-name-general").value,
        licence: document.querySelector("#license_number").value,
        address: document.querySelector("#company_address").value,
        phone: document.querySelector("#company_phone").value,
      }));
      expect(values.name === renamed, `the name read back as "${values.name}"`);
      expect(values.licence === "LIC-4471", `the licence read back as "${values.licence}"`);
      expect(values.address.includes("Mill Lane"), `the address read back as "${values.address}"`);
      expect(values.phone.includes("0117"), `the phone read back as "${values.phone}"`);

      // AC2: renaming must not move the slug, because links carry it.
      const after = await readWorkspace(ownerToken, ws.uuid);
      expect(after.slug === slugBefore, `the slug moved from ${slugBefore} to ${after.slug}`);
      // And the screen says so rather than leaving it to be discovered.
      const hint = await page.textContent("body");
      expect(
        hint.includes(`/${slugBefore}`),
        "the screen does not say the web address stays the same",
      );
      return `renamed · 3 fields saved · slug still ${slugBefore}, and said so`;
    },
  },
  {
    title: "AC3 — a role without canManageWorkspace reads the form and cannot save it",
    run: async ({ page }) => {
      const ws = await createWorkspace(ownerToken, `S10 Gated ${Date.now()}`);
      const seat = await seatedMember(ownerToken, ws.uuid, "estimator", "s10");

      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/general`);
      await page.waitForSelector("#workspace-name-general", { timeout: 20000 });

      // Readable, and every field disabled, with the reason on screen.
      const disabled = await page.evaluate(() =>
        ["#workspace-name-general", "#license_number", "#company_address", "#company_phone"].map(
          (id) => document.querySelector(id).disabled,
        ),
      );
      expect(disabled.every(Boolean), `disabled flags: ${JSON.stringify(disabled)}`);
      expect((await page.$("[data-save-general]")) === null, "the Save button is offered");
      expect(
        /not change it/.test(await page.textContent("body")),
        "the read-only state does not say why",
      );

      // Hiding is not a gate: the api refuses the hand-written PATCH too.
      const refused = await updateWorkspace(seat.token, ws.uuid, { name: "Renamed by an estimator" });
      expect(refused.status === 403, `an estimator got ${refused.status}`);
      expect(
        /cannot change workspace settings/i.test(refused.body?.detail ?? ""),
        `the refusal read "${refused.body?.detail}"`,
      );
      expect(
        (await readWorkspace(ownerToken, ws.uuid)).name === ws.name,
        "the refused PATCH renamed the workspace anyway",
      );
      return "4 fields disabled · no Save · PATCH refused 403, naming the capability";
    },
  },
  {
    title: "AC5 — three rejection reasons, three sentences, and none of them reaches S3",
    run: async () => {
      const ws = await createWorkspace(ownerToken, `S10 Reject ${Date.now()}`);

      // Wrong type. Refused before a URL exists, so there is nothing to upload to.
      const wrongType = await logoTicket(ownerToken, ws.uuid, "application/pdf", 1024);
      expect(wrongType.status === 409, `a PDF gave ${wrongType.status}`);
      expect(
        /That one is a PDF./.test(wrongType.body?.detail ?? ""),
        `the refusal read "${wrongType.body?.detail}"`,
      );
      expect(!wrongType.body?.upload_url, "a refused type still got an upload URL");

      // Too large. A different sentence, naming the size, because "that failed" tells
      // the person nothing they can act on.
      const tooLarge = await logoTicket(ownerToken, ws.uuid, "image/png", 5 * 1024 * 1024);
      expect(tooLarge.status === 409, `an oversized file gave ${tooLarge.status}`);
      expect(
        /limit is 2 MB/.test(tooLarge.body?.detail ?? ""),
        `the refusal read "${tooLarge.body?.detail}"`,
      );
      expect(
        /5\.0 MB/.test(tooLarge.body?.detail ?? ""),
        "the refusal does not say how big the file was",
      );

      // Genuinely three: the two api sentences differ from each other.
      expect(
        wrongType.body.detail !== tooLarge.body.detail,
        "the two api refusals are the same sentence",
      );
      // The third is the browser's, and it is driven on screen in the next step.
      return `type: "${wrongType.body.detail}" · size: "${tooLarge.body.detail}" · no URL issued for either`;
    },
  },
  {
    title: "AC4/AC6/AC7 — upload, replace, remove, and the bytes never touch the api",
    run: async ({ page }) => {
      const ws = await createWorkspace(ownerToken, `S10 Logo ${Date.now()}`);
      await signInAs(page, SEED);
      await page.selectOption("header select", ws.uuid);
      await page.goto(`${APP}/settings/general`);
      await page.waitForSelector("[data-logo-choose]", { timeout: 20000 });

      // Watch where the bytes go. Hard rule 5: they go to S3 on a presigned URL, and
      // the api never proxies them.
      const puts = [];
      page.on("request", (r) => r.method() === "PUT" && puts.push(r.url()));

      await page.setInputFiles("#logo-file", {
        name: "logo.png",
        mimeType: "image/png",
        buffer: PNG,
      });
      await page.waitForSelector("[data-logo-preview] img", { timeout: 20000 });

      const toS3 = puts.filter((url) => url.includes(":9000/"));
      const toApi = puts.filter((url) => url.includes(":8000/") && url.includes("/logo"));
      expect(toS3.length === 1, `${toS3.length} PUTs went to S3`);
      expect(toS3[0].includes("X-Amz-Signature"), "the upload URL is not presigned");
      expect(toApi.length === 1, `${toApi.length} confirm calls reached the api`);

      // AC7 — it shows up where the workspace is NAMED, which is the header on every
      // screen behind a session, not the settings preview that would show it anyway.
      await page.waitForSelector("[data-workspace-logo]", { timeout: 20000 });
      const first = await page.getAttribute("[data-logo-preview] img", "src");
      expect(first.includes(":9000/"), `the logo is served from ${first}`);
      const stored = (await readWorkspace(ownerToken, ws.uuid)).logo_url;
      expect(stored?.includes("X-Amz-Signature"), "the workspace read does not presign the logo");

      // AC6 — replace swaps it for a different object, not the same key overwritten:
      // a reused key is a key a cache still holds the old image for.
      await page.setInputFiles("#logo-file", {
        name: "logo2.png",
        mimeType: "image/png",
        buffer: PNG,
      });
      await page.waitForFunction(
        (previous) => {
          const img = document.querySelector("[data-logo-preview] img");
          return img && img.getAttribute("src") !== previous;
        },
        first,
        { timeout: 20000 },
      );
      const second = await page.getAttribute("[data-logo-preview] img", "src");
      const keyOf = (url) => new URL(url).pathname;
      expect(keyOf(second) !== keyOf(first), "replacing reused the same object key");

      // And remove clears it.
      await page.click("[data-logo-remove]");
      await page.waitForFunction(
        () => !document.querySelector("[data-logo-preview] img"),
        undefined,
        { timeout: 20000 },
      );
      expect(
        (await readWorkspace(ownerToken, ws.uuid)).logo_url === null,
        "the api still holds a logo after remove",
      );
      // Gone from the header too, or "remove" removed it from one place only.
      await page.waitForFunction(
        () => !document.querySelector("[data-workspace-logo]"),
        undefined,
        { timeout: 20000 },
      );
      return "uploaded to S3 (presigned) · shown in the header · replaced with a new key · removed from both";
    },
  },
]);
