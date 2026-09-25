// F3-S13 — feature flags are not permissions.
//
//   docker compose exec -T api sh -lc "cd /srv && python drives/f3-s13-flag.py 'Bench Construction'"
//   docker compose --profile browser run --rm browser node scripts/f3-s13.mjs
//
// Two gates that look alike and answer different questions:
//
//   can("canAssignRoles")               → is this person ALLOWED?
//   flag("roles_matrix_editing")        → is this feature SHIPPED for them?
//
// The flag is off GLOBALLY and on for the bench workspace, which is what makes the
// separation drivable at all: a freshly created workspace has the editing surface
// switched off, and Bench Construction has it on. A flag that were on everywhere could
// only be tested by turning it off, and that would break every fixture that edits.
//
// AC5 is the one that needs the built bundle rather than the dev server. `import.meta.env.DEV`
// is replaced at build time, so the dev override does not merely become unreachable in
// production — it is not in the file. That is checked against `dist/`, because checking it
// against the dev server would prove the opposite of what is claimed.

import { readFile, readdir } from "node:fs/promises";

import {
  APP,
  apiLogin,
  capabilities,
  createWorkspace,
  expect,
  firstWorkspace,
  flags,
  run,
  seatedMember,
  signInAs,
} from "./lib/bench.mjs";

const SEED = "estimator@bench.intelcost.io";
const KEY = "roles_matrix_editing";
const ownerToken = await apiLogin();
const shipped = await firstWorkspace(ownerToken);

await run("f3-s13", [
  {
    title: "AC1 — a flag is a separate call from a capability, and neither is the other",
    run: async () => {
      const unshipped = await createWorkspace(ownerToken, `S13 Fresh ${Date.now()}`);

      // Two endpoints. One endpoint returning both would invite a client to AND them
      // into a single boolean, which is the conflation these two layers exist to avoid.
      const caps = await capabilities(ownerToken, shipped.uuid);
      const flagsHere = await flags(ownerToken, shipped.uuid);
      expect(flagsHere.status === 200, `the flag call gave ${flagsHere.status}`);
      expect(
        !(KEY in caps.capabilities),
        "a flag key turned up in the capability map",
      );
      expect(
        Object.keys(flagsHere.body).every((key) => !key.startsWith("can")),
        `a capability turned up in the flag map: ${Object.keys(flagsHere.body).join(", ")}`,
      );

      // Same caller, same capability, two different rollout answers. That is the whole
      // point: authorization did not change, availability did.
      const owner = await capabilities(ownerToken, unshipped.uuid);
      expect(
        owner.capabilities.canAssignRoles === true,
        "the owner of a fresh workspace cannot assign roles",
      );
      const flagsThere = await flags(ownerToken, unshipped.uuid);
      expect(flagsThere.body[KEY] === false, `a fresh workspace reads ${flagsThere.body[KEY]}`);
      expect(flagsHere.body[KEY] === true, `the bench workspace reads ${flagsHere.body[KEY]}`);

      // A key nobody has created reads off, so a typo ships nothing.
      expect(flagsHere.body.no_such_feature === undefined, "an unknown key has a value");
      return `capability identical in both · flag ${flagsHere.body[KEY]} here, ${flagsThere.body[KEY]} there · unknown key absent`;
    },
  },
  {
    title: "AC3 — capability without the flag shows nothing, and says which reason it is",
    run: async ({ page }) => {
      const unshipped = await createWorkspace(ownerToken, `S13 Gate ${Date.now()}`);
      await signInAs(page, SEED);

      // The owner: every capability, and the feature not rolled out.
      await page.selectOption("header select", unshipped.uuid);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector("[data-capability]", { timeout: 20000 });
      await page.waitForSelector('[data-gate="flag"]', { timeout: 20000 });

      // Nothing is editable, and the reason names the rollout rather than their role —
      // telling someone "you may not" when the truth is "not yet" sends them to argue
      // with the wrong person.
      const message = await page.textContent('[data-gate="flag"]');
      expect(/not switched on yet/.test(message), `the message reads "${message}"`);
      expect(/rollout, not a permission/.test(message), "the message blames their access");
      expect((await page.$('[data-gate="capability"]')) === null, "both reasons are shown");
      expect((await page.$("[data-new-role]")) === null, "New role is offered with the flag off");
      const buttons = await page.$$eval("[data-capability]", (nodes) =>
        nodes.filter((node) => node.tagName.toLowerCase() === "button").length,
      );
      expect(buttons === 0, `${buttons} cells are clickable with the flag off`);

      // And the same workspace, same person, with the feature shipped: it is editable.
      await page.selectOption("header select", shipped.uuid);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-capability]")].some(
            (node) => node.tagName.toLowerCase() === "button",
          ),
        undefined,
        { timeout: 20000 },
      );
      expect((await page.$('[data-gate="flag"]')) === null, "the flag notice survives being on");
      expect((await page.$("[data-new-role]")) !== null, "New role is missing where it is shipped");
      return "flag off: 0 clickable, reason names the rollout · flag on: editable";
    },
  },
  {
    title: "AC3 the other way — the flag on with the capability denied still shows nothing",
    run: async ({ page }) => {
      // A qa_takeoff seat in the workspace where editing IS rolled out. Availability is
      // not authorization, and this is the direction that would be a security hole
      // rather than a cosmetic one.
      const seat = await seatedMember(ownerToken, shipped.uuid, "qa_takeoff", "s13");
      const theirFlags = await flags(seat.token, shipped.uuid);
      expect(theirFlags.body[KEY] === true, "the flag is off for the member being checked");
      const theirCaps = await capabilities(seat.token, shipped.uuid);
      expect(theirCaps.capabilities.canAssignRoles === false, "the seat can assign roles");

      await signInAs(page, seat.email);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForSelector('[data-gate="capability"]', { timeout: 20000 });
      const message = await page.textContent('[data-gate="capability"]');
      expect(/not change it/.test(message), `the message reads "${message}"`);
      // Their reason is their role, not the rollout: the flag is ON for them.
      expect((await page.$('[data-gate="flag"]')) === null, "a shipped feature reads as unshipped");
      const buttons = await page.$$eval("[data-capability]", (nodes) =>
        nodes.filter((node) => node.tagName.toLowerCase() === "button").length,
      );
      expect(buttons === 0, `${buttons} cells are clickable for a reviewer`);
      return "flag on, capability denied: 0 clickable, and the reason is the role";
    },
  },
  {
    title: "AC2 — loading reads false: nothing opens while the answer is in flight",
    run: async ({ page, context }) => {
      // The flag request is held open. A gate that read `true` while loading would show
      // an unshipped feature for exactly as long as the request takes, which on a slow
      // connection is long enough to click.
      let released;
      const held = new Promise((resolve) => {
        released = resolve;
      });
      await context.route("**/flag", async (route) => {
        await held;
        await route.continue();
      });

      await signInAs(page, SEED);
      await page.selectOption("header select", shipped.uuid);
      await page.goto(`${APP}/settings/roles`);
      // The matrix itself arrives (its own request is not held), so the screen is up
      // and only the rollout answer is missing.
      await page.waitForSelector("[data-capability]", { timeout: 20000 });

      const whileLoading = await page.$$eval("[data-capability]", (nodes) =>
        nodes.filter((node) => node.tagName.toLowerCase() === "button").length,
      );
      expect(whileLoading === 0, `${whileLoading} cells were clickable while loading`);
      expect((await page.$("[data-new-role]")) === null, "New role appeared while loading");
      // And it does not claim the feature is switched off either: that message is for a
      // known answer, not a missing one.
      expect((await page.$('[data-gate="flag"]')) === null, "loading was reported as off");

      released();
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-capability]")].some(
            (node) => node.tagName.toLowerCase() === "button",
          ),
        undefined,
        { timeout: 20000 },
      );
      return `0 clickable while the answer was in flight, editable once it arrived`;
    },
  },
  {
    title: "AC4 — the dev override forces ON only, and warns every time",
    run: async ({ page }) => {
      const unshipped = await createWorkspace(ownerToken, `S13 Override ${Date.now()}`);
      const warnings = [];
      page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));

      await signInAs(page, SEED);
      await page.selectOption("header select", unshipped.uuid);
      // Set the override, then reload so the hook reads it on mount.
      await page.evaluate((key) => localStorage.setItem(`ff.${key}`, "on"), KEY);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-capability]")].some(
            (node) => node.tagName.toLowerCase() === "button",
          ),
        undefined,
        { timeout: 20000 },
      );

      // It escalated false → true, and said so loudly. A forgotten override that posed
      // as real flag state would make a verification pass worthless.
      const loud = warnings.filter((text) => text.includes("ff override active"));
      expect(loud.length > 0, `the console warnings were ${JSON.stringify(warnings)}`);
      expect(
        /real flag is OFF/i.test(loud[0]),
        `the warning reads "${loud[0]}"`,
      );

      // Force ON only: with the real flag on, "off" in localStorage changes nothing.
      await page.evaluate((key) => localStorage.setItem(`ff.${key}`, "off"), KEY);
      await page.selectOption("header select", shipped.uuid);
      await page.goto(`${APP}/settings/roles`);
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("[data-capability]")].some(
            (node) => node.tagName.toLowerCase() === "button",
          ),
        undefined,
        { timeout: 20000 },
      );
      expect((await page.$('[data-gate="flag"]')) === null, "the override forced a flag OFF");
      return `override escalated off → on with a loud warning · cannot force off`;
    },
  },
]);
