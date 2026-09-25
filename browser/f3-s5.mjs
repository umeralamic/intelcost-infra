// F3-S5 — the roles and permissions matrix.
//
//   docker compose --profile browser run --rm browser node scripts/f3-s5.mjs
//
// The matrix is only worth having if it cannot disagree with the runtime check, so the
// pass reads every rendered cell out of the DOM and compares it against the api's
// resolved map for that role — 225 cells, from the screen, not from a fixture's idea of
// what should be there.
//
// The second thing it proves is D-25: all twenty-five capabilities are present, and the
// three that cannot be retuned — canManageWorkspace, canGrantOwnerRole, canEditEstimates
// — say so on the row rather than being quietly inert. Legacy omits those three from its
// matrix entirely, which is how they came to be enforced and administrable from nowhere.

import {
  APP,
  apiLogin,
  capabilities,
  expect,
  firstWorkspace,
  matrix,
  run,
  seatedMember,
  signInAs,
} from "./lib/bench.mjs";

const LOCKED = ["canManageWorkspace", "canGrantOwnerRole", "canEditEstimates"];
const FIXED_ROLES = ["owner", "admin", "collaborator", "viewer"];

const ownerToken = await apiLogin();
const workspace = await firstWorkspace(ownerToken);

/** Every cell the screen actually rendered, keyed role/capability. */
async function renderedCells(page) {
  await page.goto(`${APP}/settings/roles`);
  await page.waitForSelector("[data-capability]", { timeout: 20000 });
  // Scoped to the built-in columns: a workspace with custom roles renders their cells
  // too, and they carry `data-custom-role` instead (F3-S7).
  return page.$$eval("[data-capability][data-role]", (nodes) =>
    nodes.map((node) => ({
      capability: node.dataset.capability,
      role: node.dataset.role,
      granted: node.dataset.granted === "yes",
      locked: node.dataset.locked === "yes",
    })),
  );
}

await run("f3-s5", [
  {
    title: "AC1 — every capability appears exactly once, all 25, under a group heading",
    run: async ({ page }) => {
      await signInAs(page, "estimator@bench.intelcost.io");
      const cells = await renderedCells(page);
      const rendered = [...new Set(cells.map((cell) => cell.capability))];
      expect(rendered.length === 25, `the matrix renders ${rendered.length} capabilities`);

      // Exactly once: a capability listed in two groups would render twice as many
      // cells and read as two different permissions with the same name.
      const perCapability = rendered.map(
        (cap) => cells.filter((cell) => cell.capability === cap).length,
      );
      expect(
        perCapability.every((count) => count === 9),
        `cell counts per capability: ${[...new Set(perCapability)].join(", ")}`,
      );

      // The three legacy's own matrix omits. Their absence there is why they were
      // enforced and reachable from no screen.
      for (const cap of LOCKED) {
        expect(rendered.includes(cap), `${cap} is missing from the matrix`);
      }

      const headings = await page.$$eval("th[scope='colgroup']", (nodes) =>
        nodes.map((node) => node.textContent.trim()),
      );
      expect(headings.length === 9, `${headings.length} group headings`);
      return `${rendered.length} capabilities × 9 roles = ${cells.length} cells, ${headings.length} groups`;
    },
  },
  {
    title: "AC6 — every rendered cell agrees with the api's resolved map for that role",
    run: async ({ page }) => {
      await signInAs(page, "estimator@bench.intelcost.io");
      const cells = await renderedCells(page);
      const answer = await matrix(ownerToken, workspace.uuid);

      const disagreements = [];
      for (const cell of cells) {
        const column = answer.columns.find((c) => c.role === cell.role);
        const resolved = column.capabilities[cell.capability] === true;
        if (resolved !== cell.granted) {
          disagreements.push(`${cell.role}.${cell.capability}: screen=${cell.granted} api=${resolved}`);
        }
      }
      expect(
        disagreements.length === 0,
        `${disagreements.length} disagree — ${disagreements.slice(0, 4).join(" · ")}`,
      );

      // And the api's matrix is the same answer `GET /capability` gives a real member,
      // so the screen is not reading a second, parallel computation of the same thing.
      const owner = (await capabilities(ownerToken, workspace.uuid)).capabilities;
      const ownerColumn = answer.columns.find((c) => c.role === "owner").capabilities;
      expect(
        JSON.stringify(owner) === JSON.stringify(ownerColumn),
        "the matrix column and the caller's resolved map differ for owner",
      );
      return `${cells.length} rendered cells compared, 0 disagreements`;
    },
  },
  {
    title: "AC3 — the three locked capabilities say locked, and say why, on every column",
    run: async ({ page }) => {
      await signInAs(page, "estimator@bench.intelcost.io");
      const cells = await renderedCells(page);

      const wronglyLocked = cells.filter(
        (cell) => cell.locked !== LOCKED.includes(cell.capability),
      );
      expect(
        wronglyLocked.length === 0,
        `${wronglyLocked.length} cells are locked when they should not be, or the reverse`,
      );

      // The reason is on the row, where the question is asked. A locked control with
      // no reason reads as broken rather than as deliberate.
      const reasons = await page.$$eval("[data-locked-label]", (nodes) =>
        nodes.map((node) => ({
          capability: node.dataset.lockedLabel,
          reason: node.getAttribute("title") ?? "",
        })),
      );
      expect(reasons.length === 3, `${reasons.length} rows are marked locked`);
      expect(
        reasons.every((row) => row.reason.length > 10),
        `a locked row carries no reason: ${JSON.stringify(reasons)}`,
      );
      const owner = reasons.find((row) => row.capability === "canGrantOwnerRole");
      expect(
        /transfer/i.test(owner.reason),
        `the ownership reason reads "${owner.reason}"`,
      );
      return `3 locked rows × 9 columns · "${owner.reason}"`;
    },
  },
  {
    title: "AC2/AC4 — four roles are fixed everywhere, and owner's column is fully granted",
    run: async ({ page }) => {
      await signInAs(page, "estimator@bench.intelcost.io");
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector("[data-role-header]", { timeout: 20000 });
      const headers = await page.$$eval("[data-role-header]", (nodes) =>
        nodes.map((node) => ({
          role: node.dataset.roleHeader,
          editable: node.dataset.editable === "yes",
          title: node.getAttribute("title") ?? "",
          text: node.textContent.trim(),
        })),
      );
      expect(headers.length === 9, `${headers.length} role columns`);

      const fixed = headers.filter((header) => !header.editable).map((header) => header.role);
      expect(
        JSON.stringify(fixed.sort()) === JSON.stringify([...FIXED_ROLES].sort()),
        `fixed columns are ${fixed.join(", ")}`,
      );
      // Said on the header, not left as a dead column.
      expect(
        headers.filter((h) => !h.editable).every((h) => /Fixed/.test(h.text) && h.title.length > 10),
        "a fixed column carries no reason",
      );

      const cells = await renderedCells(page);
      const ownerCells = cells.filter((cell) => cell.role === "owner");
      const ungranted = ownerCells.filter((cell) => !cell.granted).map((c) => c.capability);
      expect(ungranted.length === 0, `owner is missing ${ungranted.join(", ")}`);
      return `fixed: ${fixed.join(", ")} · owner holds 25 of 25`;
    },
  },
  {
    title: "AC5 — a role that cannot assign roles reads the matrix rather than losing it",
    run: async ({ page }) => {
      const reviewer = await seatedMember(ownerToken, workspace.uuid, "qa_takeoff", "s5");
      await signInAs(page, reviewer.email);
      const cells = await renderedCells(page);
      expect(cells.length === 225, `a reviewer sees ${cells.length} cells`);

      const body = await page.textContent("body");
      expect(
        /not change it/i.test(body),
        "the read-only state does not say why it is read-only",
      );
      // Hiding is not a gate, and neither is a notice: the api answers the same
      // matrix with can_edit false, and F3-S6 is what refuses the write.
      const answer = await matrix(reviewer.token, workspace.uuid);
      expect(answer.can_edit === false, "the api tells a reviewer they may edit");
      const ownerAnswer = await matrix(ownerToken, workspace.uuid);
      expect(ownerAnswer.can_edit === true, "the api tells the owner they may not edit");
      return "reviewer: 225 cells, can_edit false, and told why";
    },
  },
]);
