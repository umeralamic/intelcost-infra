// F2-S1b — a failed workspace creation on the onboarding screen says so.
//
// Onboarding is the only screen a brand new account can be on, and the form is the
// only way off it. Before this, createWorkspace rejected into a bare finally: the
// button re-enabled, nothing was said, and the rejection went unhandled — which
// F2-S13's unhandledrejection guard would later turn into a page reload.
//
// The failure is forced with request interception rather than by stopping the api,
// because the page itself has to keep loading.
//
// Updated 2026-10-24 (D-311, D-314, D-752):
// - D-311 3: a new signup gets a workspace named for them and skips the naming step, which stays
//   for anyone still without one (RequireWorkspace sends them to it). The account with no workspace
//   is now made through the api's register (no workspace) and signed in through the login form,
//   so the naming screen is still the one checked.
// - D-311 1, D-314: the dashboard's "Projects" card is gone; Home with no project is the empty
//   state, "Drop your drawings here to start". Step 4 waits for it, and "created, once" is read
//   from the account's workspace list (exactly one, named Harbor Loft Builders), since the bare
//   takeoff bar no longer names the workspace (D-311 5).

import { APP, apiCall, apiLogin, apiRegister, expect, run } from "./lib/bench.mjs";

const password = "bench-password-1";
const fresh = () => `s1b-${Date.now()}-${Math.floor(Math.random() * 1000)}@bench.intelcost.io`;

/** An account with no workspace, signed in, sitting on the naming screen (D-311 3). */
async function onboard(page) {
  const email = fresh();
  await apiRegister(email, password, "S1b Onboarding");
  await page.goto(`${APP}/login?next=%2F`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForSelector("#workspace-name", { timeout: 15000 });
  return email;
}

await run("f2-s1b", [
  {
    title: "a new account reaches the onboarding screen with no workspace",
    run: async ({ page }) => {
      const email = await onboard(page);
      const heading = await page.textContent("h1");
      return `${email} → "${heading.trim()}"`;
    },
  },
  {
    title: "an unreachable api on create → a spoken error, not a dead button",
    run: async ({ page }) => {
      await onboard(page);
      await page.route("**/api/workspace", (route) =>
        route.request().method() === "POST" ? route.abort("failed") : route.continue(),
      );
      await page.fill("#workspace-name", "Harbor Loft Builders");
      await page.click('button[type="submit"]');
      const alert = await page.waitForSelector('[role="alert"]', { timeout: 15000 });
      const text = (await alert.textContent()).trim();
      expect(text.length > 0, "the alert is empty");
      const stillHere = await page.$("#workspace-name");
      expect(stillHere, "the onboarding form vanished on failure");
      const kept = await page.inputValue("#workspace-name");
      expect(kept === "Harbor Loft Builders", `the typed name was lost (now "${kept}")`);
      const disabled = await page.getAttribute('button[type="submit"]', "disabled");
      expect(disabled === null, "the submit button stayed disabled after the failure");
      return `"${text}" · name kept · submit re-enabled`;
    },
  },
  {
    title: "a 500 from the api → the api's own message, not the network one",
    run: async ({ page }) => {
      await onboard(page);
      await page.route("**/api/workspace", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ detail: "The bench broke this one on purpose." }),
            })
          : route.continue(),
      );
      await page.fill("#workspace-name", "Harbor Loft Builders");
      await page.click('button[type="submit"]');
      const alert = await page.waitForSelector('[role="alert"]', { timeout: 15000 });
      const text = (await alert.textContent()).trim();
      expect(text.includes("on purpose"), `the api's message was swallowed: "${text}"`);
      return `"${text}"`;
    },
  },
  {
    title: "retry after the failure clears → the workspace is created, once",
    run: async ({ page }) => {
      const email = await onboard(page);
      let firstAttempt = true;
      await page.route("**/api/workspace", (route) => {
        if (route.request().method() !== "POST") return route.continue();
        if (firstAttempt) {
          firstAttempt = false;
          return route.abort("failed");
        }
        return route.continue();
      });
      await page.fill("#workspace-name", "Harbor Loft Builders");
      await page.click('button[type="submit"]');
      await page.waitForSelector('[role="alert"]');
      await page.click('button[type="submit"]');
      // Home with no project is the empty state (D-311 1 and 4), not the old dashboard.
      await page.getByText("Drop your drawings here to start").first().waitFor({ timeout: 20000 });
      const gone = await page.$("#workspace-name");
      expect(!gone, "still on the onboarding form");
      const listed = (await apiCall(await apiLogin(email, password), "GET", "/api/workspace")).body;
      const named = listed.filter((w) => w.name === "Harbor Loft Builders");
      expect(listed.length === 1 && named.length === 1, `expected one workspace, Harbor Loft Builders; got ${JSON.stringify(listed.map((w) => w.name))}`);
      return "second press created it, once, and Home's empty state rendered";
    },
  },
  {
    title: "the failure path does not disturb S1's next= hop",
    run: async ({ page }) => {
      await onboard(page);
      await page.goto(`${APP}/?next=%2Fsettings%2Faccount`);
      await page.waitForSelector("#workspace-name");
      await page.fill("#workspace-name", "Harbor Loft Builders");
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/settings\/account/, { timeout: 15000 });
      return `${new URL(page.url()).pathname} · the carried destination still lands`;
    },
  },
]);
