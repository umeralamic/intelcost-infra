// F8-S4: topics, and the membership check on join.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s4.mjs
//
// Updated 2026-10-24 (D-752, D-705): harness only; what each step checks is unchanged.
// - AC1: the second workspace is now made by a throwaway owner who seats this run's account as
//   admin (D-752, lib/bench.mjs). The switch is the in-page one, Settings' "Editing workspace"
//   (D-705: the one way to switch; there is no header switcher), not enterWorkspace, which
//   reloads the tab: the init script that starts the tab in the first workspace undid it on the
//   reload, and a reload's new socket never sends the leave AC1 reads.
// - AC4: the fx apps are the built bundle, which serves no `/src/core/realtime/socket.ts`. The
//   app's own realtime client is found among the exports of the module the page already loaded
//   (its entry script; the same instance, not a copy), the dev path kept for a dev server.

import { APP, SEEDED, apiCall, createWorkspace, discardProject, expect, ownWorkspace, quietFor, run, signInAs } from "./lib/bench.mjs";
import { appSockets, rawSocket, readySocket, recordSockets, waitFor } from "./lib/realtime.mjs";

// Two workspaces of this run's own account, never the seeded one: the tab starts in the
// first and the switcher moves it to the second.
const { owner, token, workspace: first } = await ownWorkspace(`F8-S4 first ${Date.now()}`);
const second = await createWorkspace(token, `F8-S4 second ${Date.now()}`);

const project = (
  await apiCall(token, "POST", `/api/workspace/${first.uuid}/project`, { name: `F8-S4 topic ${Date.now()}` })
).body;

const auth = () => ({ type: "auth", token, client_id: crypto.randomUUID() });
const framesOf = async (page, type, topic) =>
  (await appSockets(page)).flatMap((s) => s.sent.concat(s.received)).filter((f) => f.type === type && f.topic === topic);

await run("f8-s4", [
  {
    title: "AC1: the tab joins its workspace, and the switcher moves it: leave, then join",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await page.addInitScript((uuid) => localStorage.setItem("intelcost.workspace", uuid), first.uuid);
      // Signed in onto Settings › General, which carries the "Editing workspace" card.
      await signInAs(page, owner.email, SEEDED.password, "/settings/general");
      await readySocket(page);
      const from = `ws:${first.uuid}`;
      const to = `ws:${second.uuid}`;
      await waitFor(async () => (await framesOf(page, "joined", from)).length, `joined ${from}`);

      // The switch in the page, not a reload: Settings' "Editing workspace" is the one switch
      // (D-705) and keeps the tab (and its socket) where it is. A reload opens a new socket,
      // which never sends a leave.
      await page.getByRole("button", { name: second.name, exact: true }).click();
      await waitFor(async () => (await framesOf(page, "joined", to)).length, `joined ${to}`);
      const [leave] = await framesOf(page, "leave", from);
      const [join] = await framesOf(page, "join", to);
      expect(leave, `no leave for ${from}`);
      expect(leave.at <= join.at, "the join went out before the leave");
      return `joined ${from}; switched: leave ${from}, then join and joined ${to}`;
    },
  },
  {
    title: "AC2: a join for someone else's workspace is refused in the api's words, and the socket stays open",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      const foreign = `ws:${crypto.randomUUID()}`;
      const own = `ws:${first.uuid}`;
      const got = await rawSocket(
        page,
        [auth(), { type: "join", topic: foreign }, { type: "join", topic: own }],
        3000,
      );
      const refused = got.heard.find((f) => f.type === "refused" && f.topic === foreign);
      expect(refused?.reason === "You do not have access to that workspace.", `foreign join: ${JSON.stringify(refused)}`);
      expect(got.heard.some((f) => f.type === "joined" && f.topic === own), "the next join was not answered");
      expect(got.open, `the socket closed ${got.code} "${got.reason}"`);
      return `refused "${refused.reason}"; the socket stayed open and joined ${own}`;
    },
  },
  {
    title: "AC3: a project named under the wrong workspace is refused, as the REST route refuses it",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      const wrong = `ws:${second.uuid}:project:${project.uuid}`;
      const right = `ws:${first.uuid}:project:${project.uuid}`;
      const got = await rawSocket(page, [auth(), { type: "join", topic: wrong }, { type: "join", topic: right }], 3000);
      const rest = await apiCall(token, "GET", `/api/workspace/${second.uuid}/project/${project.uuid}`);
      const refused = got.heard.find((f) => f.type === "refused" && f.topic === wrong);
      expect(refused, `the wrong-workspace join was not refused: ${JSON.stringify(got.heard)}`);
      expect(refused.reason === rest.body?.detail, `socket said "${refused.reason}", REST said "${rest.body?.detail}"`);
      expect(got.heard.some((f) => f.type === "joined" && f.topic === right), "the right workspace was refused");
      return `wrong workspace refused "${refused.reason}" (REST: ${rest.status} "${rest.body?.detail}"); right workspace joined`;
    },
  },
  {
    title: "AC4: two subscribers to one topic send one join; the first to leave sends nothing, the last sends leave",
    run: async ({ page, context }) => {
      await recordSockets(context);
      await signInAs(page, owner.email, SEEDED.password);
      await readySocket(page);
      const topic = `ws:${first.uuid}:project:${project.uuid}`;
      // The socket module the app itself loaded, by the exact URL it loaded: once Vite has
      // hot-updated a module it serves it as `socket.ts?t=…`, and importing the bare path
      // would make a second, unconnected copy.
      // The built bundle has no /src paths: there the client is an export of the entry module the
      // page loaded (importing a loaded module's URL returns that same instance), known by its
      // shape: a `subscribe` and its `topics` map.
      await page.evaluate(async (topic) => {
        const dev = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .find((name) => name.includes("/src/core/realtime/socket.ts"));
        let realtime;
        if (dev) ({ realtime } = await import(dev));
        else {
          for (const script of document.querySelectorAll("script[type=module][src]")) {
            const loaded = await import(script.src);
            realtime = Object.values(loaded).find(
              (value) => value && typeof value === "object" && typeof value.subscribe === "function" && value.topics instanceof Map,
            );
            if (realtime) break;
          }
        }
        if (!realtime) throw new Error("the app's realtime client is not among its loaded modules");
        window.__f8a = realtime.subscribe(topic, () => {});
        window.__f8b = realtime.subscribe(topic, () => {});
      }, topic);
      await waitFor(async () => (await framesOf(page, "joined", topic)).length, `joined ${topic}`);
      const joins = (await framesOf(page, "join", topic)).length;

      await page.evaluate(() => window.__f8a());
      await quietFor(1000); // one of two subscribers gone: no leave may be sent
      const leavesAfterOne = (await framesOf(page, "leave", topic)).length;
      await page.evaluate(() => window.__f8b());
      await waitFor(async () => (await framesOf(page, "leave", topic)).length, `leave ${topic}`, 5000);
      const leaves = (await framesOf(page, "leave", topic)).length;

      expect(joins === 1, `${joins} joins for two subscribers`);
      expect(leavesAfterOne === 0, "the first unsubscribe sent a leave");
      expect(leaves === 1, `${leaves} leaves`);
      return "2 subscribers: 1 join; first unsubscribe: no leave; last: 1 leave";
    },
  },
]);

// The topic's project was made for this run; it does not stay in the seeded workspace.
await discardProject(token, first.uuid, project.uuid);
