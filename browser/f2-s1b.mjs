// F2-S1b — a failed workspace creation on the onboarding screen says so.
//
// Onboarding is the only screen a brand new account can be on, and the form is the
// only way off it. Before this, createWorkspace rejected into a bare finally: the
// button re-enabled, nothing was said, and the rejection went unhandled — which
// F2-S13's unhandledrejection guard would later turn into a page reload.
//
// The failure is forced with request interception rather than by stopping the api,
// because the page itself has to keep loading.

import { APP, expect, run } from "./lib/bench.mjs";

const password = "bench-password-1";
const fresh = () => `s1b-${Date.now()}-${Math.floor(Math.random() * 1000)}@bench.intelcost.io`;

/** A brand new account, signed in, sitting on the onboarding screen with no workspace. */
async function onboard(page) {
  const email = fresh();
  await page.goto(`${APP}/signup`);
  await page.fill("#full_name", "S1b Onboarding");
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
      await onboard(page);
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
      // The h1, not text=Projects: the onboarding subtitle says "your projects, your
      // drawings and your team", so a loose text match passes before anything happens.
      // The dashboard since F4 (D-31): the workspace is the page's h1, and "Projects" is
      // the card's heading.
      await page.getByRole("heading", { name: "Projects", exact: true }).waitFor({ timeout: 20000 });
      const gone = await page.$("#workspace-name");
      expect(!gone, "still on the onboarding form");
      const body = await page.textContent("body");
      expect(body.includes("Harbor Loft Builders"), "the created workspace is not named");
      return "second press created it and the projects screen rendered";
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
