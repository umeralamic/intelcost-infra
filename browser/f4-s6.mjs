// F4-S6: the dashboard's panels in legacy's order. Projects, the branding nudge for a
// workspace with no logo, then Team members, Pending invitations and Invite teammates.
// The tab strip is centred, and there is no Customize tabs button.
//
//   docker compose --profile browser run --rm browser node scripts/f4-s6.mjs

import { apiCall, expect, logoTicket, run, seatedMember } from "./lib/bench.mjs";
import { freshWorkspace, openDashboard } from "./lib/f4.mjs";

const { token, workspace } = await freshWorkspace("F4-S6 panels");
const estimator = await seatedMember(token, workspace.uuid, "estimator", "f4s6");

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

/** The top-level blocks of the page, top to bottom, by what they are. */
const order = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#projects-heading, [data-branding-nudge], [data-team-panels] section")]
      .map((el) => el.getAttribute("aria-label") ?? (el.id === "projects-heading" ? "Projects" : "Branding")),
  );

await run("f4-s6", [
  {
    title: "AC1/AC3 — owner with no logo: Projects, branding, then the three team panels; strip centred, no Customize",
    run: async ({ page }) => {
      await openDashboard(page, workspace.uuid);
      await page.locator("[data-team-panels]").waitFor();
      const blocks = await order(page);
      expect(
        blocks.join("|") === "Projects|Branding|Team members|Pending invitations|Invite teammates",
        `order: ${blocks.join(", ")}`,
      );
      const centred = await page.getByRole("tablist").evaluate((el) => getComputedStyle(el.parentElement).justifyContent);
      expect(centred === "center", `strip justify ${centred}`);
      expect((await page.getByText(/Customize tabs/i).count()) === 0, "a Customize tabs control exists");
      expect((await page.getByText("Reports", { exact: true }).count()) === 0, "a Reports card is drawn (F15's)");
      return blocks.join(" → ");
    },
  },
  {
    title: "AC2 — set a logo in Settings: the nudge is gone on return",
    run: async ({ page }) => {
      const { body: ticket } = await logoTicket(token, workspace.uuid, "image/png", PNG.length);
      await openDashboard(page, workspace.uuid);
      const put = await page.evaluate(
        async ([url, bytes]) =>
          (await fetch(url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: new Uint8Array(bytes) })).status,
        [ticket.upload_url, [...PNG]],
      );
      expect(put === 200, `logo PUT ${put}`);
      const adopted = await apiCall(token, "PUT", `/api/workspace/${workspace.uuid}/logo`, { storage_key: ticket.storage_key });
      expect(adopted.status === 200, `adopt logo ${adopted.status}`);
      await page.reload();
      await page.locator("[data-team-panels]").waitFor();
      expect((await page.locator("[data-branding-nudge]").count()) === 0, "the nudge survived a logo");
      return "nudge gone";
    },
  },
  {
    title: "AC4 — an estimator: no nudge, no invitations panel, and the invite panel says why",
    run: async ({ page }) => {
      await openDashboard(page, estimator.email ? workspace.uuid : workspace.uuid, estimator.email);
      await page.locator("[data-team-panels]").waitFor();
      await page.getByText("Your role cannot invite members.").waitFor({ timeout: 15000 });
      const blocks = await order(page);
      expect(blocks.join("|") === "Projects|Team members|Invite teammates", `order: ${blocks.join(", ")}`);
      return blocks.join(" → ");
    },
  },
]);
