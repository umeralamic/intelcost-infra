// F8-S4: topics, and the membership check on join.
//
//   docker compose --profile browser run --rm browser node scripts/f8-s4.mjs

import { APP, SEEDED, apiCall, apiLogin, createWorkspace, discardProject, expect, run, signInAs } from "./lib/bench.mjs";
import { appSockets, rawSocket, readySocket, recordSockets, waitFor } from "./lib/realtime.mjs";

const SECOND = "F8-S4 second workspace";
const token = await apiLogin();
const listed = (await apiCall(token, "GET", "/api/workspace")).body;
const second = listed.find((w) => w.name === SECOND) ?? (await createWorkspace(token, SECOND));
const first = listed.find((w) => w.uuid !== second.uuid);

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
      await signInAs(page, SEEDED.email, SEEDED.password);
      await readySocket(page);
      const from = `ws:${first.uuid}`;
      const to = `ws:${second.uuid}`;
      await waitFor(async () => (await framesOf(page, "joined", from)).length, `joined ${from}`);

      await page.selectOption("header select", second.uuid);
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
      await signInAs(page, SEEDED.email, SEEDED.password);
      await readySocket(page);
      const topic = `ws:${first.uuid}:project:${project.uuid}`;
      // The socket module the app itself loaded, by the exact URL it loaded: once Vite has
      // hot-updated a module it serves it as `socket.ts?t=…`, and importing the bare path
      // would make a second, unconnected copy.
      await page.evaluate(async (topic) => {
        const url =
          performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .find((name) => name.includes("/src/core/realtime/socket.ts")) ?? "/src/core/realtime/socket.ts";
        const { realtime } = await import(url);
        window.__f8a = realtime.subscribe(topic, () => {});
        window.__f8b = realtime.subscribe(topic, () => {});
      }, topic);
      await waitFor(async () => (await framesOf(page, "joined", topic)).length, `joined ${topic}`);
      const joins = (await framesOf(page, "join", topic)).length;

      await page.evaluate(() => window.__f8a());
      await page.waitForTimeout(1000);
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
