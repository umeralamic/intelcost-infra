// F2-S14 — the job title is collected at signup.
//
//   docker compose --profile browser run --rm browser node scripts/f2-s14.mjs
//
// The parity line read "ported" and was not. The api has accepted `job_title` since
// the first migration and `service.register` persists it; nothing sent one. The
// column was written by the seed script and by nothing else, which is exactly the
// shape of gap a checklist tick hides.
//
// Step 3 checks the blank case is NULL rather than "", which is not visible from the
// browser: it is read back out of Postgres and reported as a database check. An empty
// string and no answer look identical on screen and behave differently everywhere
// that asks "did they tell us".

import { APP, apiLogin, clearMail, expect, firstWorkspace, invitationSettled, invite, inviteTokenFromMail, run } from "./lib/bench.mjs";

const PASSWORD = "bench-password-1";

const signUp = async (page, { email, name, title }) => {
  await page.goto(`${APP}/signup`);
  await page.waitForSelector("#email");
  await page.fill("#full_name", name);
  await page.fill("#email", email);
  if (title !== undefined) await page.fill("#job_title", title);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

  // A brand new account has no workspace, and the settings screens need one: they
  // send an account without one back to onboarding. So finish onboarding, which is
  // what a real signup does next anyway.
  await page.waitForSelector("#workspace-name", { timeout: 20000 });
  await page.fill("#workspace-name", `${name} Co`);
  await page.click('button:has-text("Create workspace")');
  await page.waitForFunction(() => !document.querySelector("#workspace-name"), undefined, {
    timeout: 20000,
  });
};

await run("f2-s14", [
  {
    title: "AC1 — the field is there, optional in its own label, and hints what goes in it",
    run: async ({ page }) => {
      await page.goto(`${APP}/signup`);
      await page.waitForSelector("#job_title");

      const label = (await page.textContent('label[for="job_title"]')).trim();
      expect(/optional/i.test(label), `the label reads "${label}" and does not say optional`);
      const placeholder = await page.getAttribute("#job_title", "placeholder");
      expect(placeholder === "e.g. Estimator, PM, GC", `the placeholder reads "${placeholder}"`);
      const max = await page.getAttribute("#job_title", "maxlength");
      expect(max === "100", `maxlength is ${max}`);
      expect(!(await page.$("#job_title[required]")), "the optional field is marked required");
      return `"${label}" · placeholder "${placeholder}" · maxlength ${max}`;
    },
  },
  {
    title: "AC2 — signing up with a title → the account screen shows it",
    run: async ({ page }) => {
      const email = `s14-titled-${Date.now()}@bench.intelcost.io`;
      await signUp(page, { email, name: "S14 Titled", title: "Senior Estimator" });

      await page.goto(`${APP}/settings/account`);
      await page.waitForFunction(() => document.title.startsWith("Account"), undefined, {
        timeout: 20000,
      });
      await page.waitForFunction(
        () => document.body.textContent.includes("Senior Estimator"),
        undefined,
        { timeout: 20000 },
      );
      const body = await page.textContent("body");
      expect(body.includes("S14 Titled"), "the account screen does not name the person");
      return `${email} → "S14 Titled" / "Senior Estimator"`;
    },
  },
  {
    title: "AC3 — leaving it blank succeeds, and the account screen shows no title",
    run: async ({ page }) => {
      const email = `s14-blank-${Date.now()}@bench.intelcost.io`;
      await signUp(page, { email, name: "S14 Blank" });

      await page.goto(`${APP}/settings/account`);
      await page.waitForFunction(
        () => document.body.textContent.includes("S14 Blank"),
        undefined,
        { timeout: 20000 },
      );
      // The section holds the name and nothing else. An empty <p> would pass a
      // "does not contain" check, so the count of lines is what is asserted.
      const lines = await page.$$eval("section:first-of-type p", (nodes) =>
        nodes.map((node) => node.textContent.trim()),
      );
      expect(
        lines.length === 1 && lines[0] === "S14 Blank",
        `the section rendered ${JSON.stringify(lines)}`,
      );
      // The database check is run from the host; see the header.
      console.log(`      blank-title account: ${email}`);
      return `${email} → one line, "S14 Blank", no empty second line`;
    },
  },
  {
    title: "AC4 — the invited variant has the same field",
    run: async ({ page }) => {
      const ownerToken = await apiLogin();
      const workspace = await firstWorkspace(ownerToken);
      const email = `s14-invited-${Date.now()}@bench.intelcost.io`;
      await clearMail();
      await invite(ownerToken, workspace.uuid, email, "estimator");
      const token = await inviteTokenFromMail(email);

      await page.goto(`${APP}/signup?invite=${encodeURIComponent(token)}`);
      await invitationSettled(page);
      expect((await page.$("#job_title")) !== null, "the invited signup has no job title field");

      await page.fill("#full_name", "S14 Invited");
      await page.fill("#job_title", "Project Manager");
      await page.fill("#password", PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });

      await page.goto(`${APP}/settings/account`);
      await page.waitForFunction(
        () => document.body.textContent.includes("Project Manager"),
        undefined,
        { timeout: 20000 },
      );
      return `${email} joined ${workspace.name} as "Project Manager"`;
    },
  },
]);
